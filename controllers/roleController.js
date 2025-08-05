import { pool } from "../config/db.js";
// import jwt from "jsonwebtoken";
import Joi from "joi";
import { buildTree } from "../utils/index.js";

export const addRole = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  // const refreshToken = req.cookies.refresh_token;
  // if (!refreshToken) return res.sendStatus(401);

  const { role, role_code, description } = req.body;

  const roleCode = role_code.toUpperCase();

  // const regexCharAllowed = /^\w+$/;

  const roleSchema = Joi.object({
    role: Joi.string().required(),
    role_code: Joi.string().alphanum().pattern(/^\w+$/).required().messages({
      "string.pattern.base":
        '"role_code" can only contains alphabet, number, and underscore',
    }),
    description: Joi.string(),
  });

  const validationResult = roleSchema.validate({
    role,
    role_code: roleCode,
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

    const queryRole =
      "INSERT INTO core.roles (role, role_code, description) values ($1, $2, $3)";
    const valuesRole = [role, roleCode, description];

    const result = await pool.query(queryRole, valuesRole);

    console.log(result);

    if (result.rowCount < 1) {
      responseCode = 500;
      response.success = false;
      response.message = "Database error, please contact administrator";
      response.error = result.rowCount;

      throw new Error(response.message);
    }

    response.message = "Add role is successfully";

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in addRole function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};

export const getRolePrivilege = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  const { role_code: roleCode } = req.body;

  const getRolePrivilegeSchema = Joi.object({
    role_code: Joi.string().alphanum().pattern(/^\w+$/).required().messages({
      "string.pattern.base":
        '"role_code" can only contains alphabet, number, and underscore',
    }),
  });

  const validationResult = getRolePrivilegeSchema.validate({
    role_code: roleCode,
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

    const rolePrivilege = await pool.query(
      `SELECT
        r.role, rp.role_code, m.menu, m.slug, rp.menu_code, m.parent_menu_code
      FROM
        core.role_privileges AS rp
        left join core.roles AS r on r.role_code = rp.role_code
        left join core.menus AS m on m.menu_code = rp.menu_code
      WHERE
        rp.role_code = $1
        and rp.is_active = true
        and m.deleted_at is null`,
      [roleCode]
    );

    const rowsRolePrivilege = rolePrivilege.rows;

    const treeRolePrivilege = buildTree(rowsRolePrivilege);

    response.success = true;
    response.message = "Get role privileges is successfully";
    response.role_privilege = treeRolePrivilege;

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in getRolePrivilege function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};

export const updateRolePrivilege = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  const { role_code: roleCode, menu_codes: menuCodes } = req.body;

  const updateRolePrivilegeSchema = Joi.object({
    role_code: Joi.string().alphanum().pattern(/^\w+$/).required().messages({
      "string.pattern.base":
        '"role_code" can only contains alphabet, number, and underscore',
    }),
    menu_codes: Joi.array().items(
      Joi.string()
        .pattern(/^[a-zA-Z0-9_.]+$/)
        .messages({
          "string.pattern.base":
            '"menu_code" can only contains alphabet, number, underscore, and point',
        })
    ),
  });

  const validationResult = updateRolePrivilegeSchema.validate({
    role_code: roleCode,
    menu_codes: menuCodes,
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

    const username = users.rows[0].username;

    await pool.query("BEGIN");

    await pool.query(
      `UPDATE core.role_privileges
      SET
        updated_at = now(),
        updated_by = '${username}',
        is_active = false
      WHERE
        role_code = $1`,
      [roleCode]
    );

    const dataPrivilegeExist = await pool.query(
      `SELECT menu_code FROM core.role_privileges WHERE role_code = $1`,
      [roleCode]
    );
    const menuCodesExist = dataPrivilegeExist.rows.map((row) => row.menu_code);

    for (const menuCode of menuCodes) {
      if (menuCodesExist.includes(menuCodes)) {
        await pool.query(
          `UPDATE
            core.role_privileges
          SET
            updated_at = now(),
            updated_by = '${username}',
            is_active = true
          WHERE
            role_code = $1
            and menu_code = $2`,
          [roleCode, menuCode]
        );
      } else {
        await pool.query(
          `INSERT INTO core.role_privileges
            (role_code, menu_code, created_by)
          VALUES
            ($1, $2, $3)`,
          [roleCode, menuCode, username]
        );
      }
    }

    await pool.query("COMMIT");

    response.message = "Update role privilege is successfully";

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    await pool.query("ROLLBACK");

    console.log("Error in updateRolePrivilege function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};
