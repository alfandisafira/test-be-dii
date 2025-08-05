import { pool } from "../config/db.js";
// import jwt from "jsonwebtoken";
import Joi from "joi";

export const getUserRole = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  const { user_id: userIdRole } = req.body;

  const userIdSchema = Joi.object({
    user_id: Joi.number().required(),
  });

  const validationResult = userIdSchema.validate({
    user_id: Number(userIdRole),
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

    const dataUserRoles = await pool.query(
      `SELECT role_code FROM core.user_roles WHERE user_id = ${userIdRole} and is_active = true`
    );
    const userRoles = dataUserRoles.rows.map((row) => row.role_code);

    response.success = true;
    response.message = "Get user roles is successfully";
    response.user_roles = userRoles;

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in getUserRole function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};

export const updateUserRole = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(401);

  const { user_id: userIdRole, role_codes: roleCodes } = req.body;

  const updateUserRolesSchema = Joi.object({
    user_id: Joi.number().required(),
    role_codes: Joi.array().items(
      Joi.string().alphanum().pattern(/^\w+$/).messages({
        "string.pattern.base":
          '"role_code" can only contains alphabet, number, and underscore',
      })
    ),
  });

  const validationResult = updateUserRolesSchema.validate({
    user_id: Number(userIdRole),
    role_codes: roleCodes,
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
      `UPDATE core.user_roles
      SET
        updated_at = now(),
        updated_by = '${username}',
        is_active = false
      WHERE
        user_id = ${userIdRole}`
    );

    const dataRolesExist = await pool.query(
      `SELECT role_code FROM core.user_roles WHERE user_id = ${userIdRole}`
    );
    const roleCodesExist = dataRolesExist.rows.map((row) => row.role_code);

    for (const roleCode of roleCodes) {
      if (roleCodesExist.includes(roleCode)) {
        await pool.query(
          `UPDATE
            core.user_roles
          SET
            updated_at = now(),
            updated_by = '${username}',
            is_active = true
          WHERE
            user_id = ${userIdRole}
            and role_code = $1`,
          [roleCode]
        );
      } else {
        await pool.query(
          `INSERT INTO core.user_roles
            (user_id, role_code, created_by)
          VALUES
            (${userIdRole}, $1, $2)`,
          [roleCode, username]
        );
      }
    }

    await pool.query("COMMIT");

    response.message = "Update user role is successfully";

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    await pool.query("ROLLBACK");

    console.log("Error in updateUserRole function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};
