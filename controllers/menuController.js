import { pool } from "../config/db.js";
// import jwt from "jsonwebtoken";
import Joi from "joi";
import { buildTree } from "../utils/index.js";

export const addMenu = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  const { menu, slug, menu_code, parent_menu_code, description } = req.body;

  const slugClean = slug.toLowerCase().replace(/\s/g, "_");
  const menuCodeClean = menu_code.toUpperCase().replace(/\s/g, "_");
  const parentMenuCode =
    parent_menu_code !== "" ? parent_menu_code.toUpperCase() : null;

  const regexCharAllowed = /^[a-zA-Z0-9_.]+$/;

  const menuSchema = Joi.object({
    menu: Joi.string().required(),
    slug: Joi.string()
      .required()
      .pattern(regexCharAllowed)
      .required()
      .messages({
        "string.pattern.base":
          '"slug" can only contains alphabet, number, underscore, and point',
      }),
    menu_code: Joi.string().pattern(regexCharAllowed).required().messages({
      "string.pattern.base":
        '"menu_code" can only contains alphabet, number, underscore, and point',
    }),
    parent_menu_code: Joi.string()
      .pattern(regexCharAllowed)
      .optional()
      .allow("")
      .messages({
        "string.pattern.base":
          '"parent_menu_code" can only contains alphabet, number, underscore, and point',
      }),
    description: Joi.string(),
  });

  const validationResult = menuSchema.validate({
    menu,
    menu_code: menuCodeClean,
    parent_menu_code: parentMenuCode,
    slug: slugClean,
    description,
  });

  try {
    if (validationResult.error) {
      responseCode = 400;
      response.success = false;
      response.message =
        "Validation error: " + validationResult.error.details[0].message;
      response.error = validationResult.error.details;

      throw new Error(response.message);
    }

    const queryMenu =
      "INSERT INTO core.menus (menu, slug, menu_code, parent_menu_code, description) values ($1, $2, $3, $4, $5)";
    const valuesMenu = [
      menu,
      slugClean,
      menuCodeClean,
      parentMenuCode,
      description,
    ];

    const result = await pool.query(queryMenu, valuesMenu);

    if (result.rowCount < 1) {
      responseCode = 500;
      response.success = false;
      response.message = "Database error, please contact administrator";
      response.error = result.rows;

      throw new Error(response.message);
    }

    response.message = "Add menu is successfully";

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in addMenu function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};

export const getMenu = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  const { menu_code } = req.body;

  const menuCodeClean = menu_code.toUpperCase().replace(/\s/g, "_");

  const getMenuSchema = Joi.object({
    menu_code: Joi.string()
      .pattern(/^[a-zA-Z0-9_.]+$/)
      .required()
      .messages({
        "string.pattern.base":
          '"menu_code" can only contains alphabet, number, underscore, and point',
      }),
  });

  const validationResult = getMenuSchema.validate({
    menu_code: menuCodeClean,
  });

  try {
    if (validationResult.error) {
      responseCode = 400;
      response.success = false;
      response.message =
        "Validation error: " + validationResult.error.details[0].message;
      response.error = validationResult.error.details;

      throw new Error(response.message);
    }

    const users = await pool.query(
      `SELECT * FROM core.users WHERE refresh_token = '${refreshToken}'`
    );

    if (users.rowCount < 1) return res.sendStatus(403);

    const menus = await pool.query(
      `SELECT
        m.menu, m.slug, m.menu_code, m.parent_menu_code
      FROM
        core.menus AS m
      WHERE
        m.menu_code = $1
        and m.deleted_at is null`,
      [menuCodeClean]
    );

    const rowsMenu = menus.rows;

    const treeMenu = buildTree(rowsMenu);

    response.success = true;
    response.message = "Get menu is successfully";
    response.role_privilege = treeMenu;

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in getMenu function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};
