import bcrypt from "bcrypt";
import { pool } from "../config/db.js";
import jwt from "jsonwebtoken";
import Joi from "joi";

export const actionRegister = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const { username, password, confirm_password } = req.body;

  const userSchema = Joi.object({
    username: Joi.string().alphanum().min(6).max(14).required(),
    password: Joi.string()
      .alphanum()
      .min(6)
      .max(14)
      .pattern(/(?=.*[a-zA-Z])(?=.*\d)/)
      .required()
      .messages({
        "string.pattern.base":
          '"password" must be contains at least one alphabet and one number, no symbol',
      }),
    confirm_password: Joi.string()
      .valid(Joi.ref("password"))
      .required()
      .messages({
        "any.only": '"password" doesn\'t match.',
      }),
  });

  const validationResult = userSchema.validate({
    username,
    password,
    confirm_password,
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

    const salt = await bcrypt.genSalt();
    const hashPassword = await bcrypt.hash(password, salt);

    const queryUser =
      "INSERT INTO core.users (username, password) values ($1, $2) RETURNING *";
    const valuesUser = [username, hashPassword];

    const result = await pool.query(queryUser, valuesUser);

    if (result.rowCount < 1) {
      responseCode = 500;
      response.success = false;
      response.message = "Database error, please contact administrator";
      response.error = result.rows;

      throw new Error(response.message);
    }

    response.message = "Register is success";

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in actionRegister function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};

export const actionLogin = async (req, res) => {
  let responseCode = null;
  let response = {
    success: true,
    message: "",
    error: null,
  };

  const { username, password } = req.body;

  try {
    const queryUser = "SELECT * FROM core.users WHERE username = $1";
    const user = await pool.query(queryUser, [username]);

    if (user.rowCount < 1) {
      responseCode = 404;
      response.success = false;
      response.message = '"username" isn\'t registered';
      response.error = user.rows;

      throw new Error(response.message);
    }

    const matchPassword = await bcrypt.compare(password, user.rows[0].password);

    if (!matchPassword) {
      responseCode = 401;
      response.success = false;
      response.message = '"password" is inccorect';
      response.error = {
        match_password: matchPassword,
      };

      throw new Error(response.message);
    }

    const userId = user.rows[0].id;

    const accessToken = jwt.sign(
      { userId, username },
      process.env.ACCESS_TOKEN_SECRET,
      { expiresIn: "30m" }
    );

    const refreshToken = jwt.sign(
      { userId, username },
      process.env.REFRESH_TOKEN_SECRET,
      { expiresIn: "24h" }
    );

    const updateRefreshToken = await pool.query(
      `UPDATE core.users SET refresh_token = '${refreshToken}', updated_at = now() WHERE id = ${userId}`
    );

    if (updateRefreshToken.rowCount !== 1) {
      responseCode = 500;
      response.success = false;
      response.message = '"password" is inccorect';
      response.error = user;

      throw new Error(response.message);
    }

    res.cookie("refresh_token", refreshToken, {
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000,
    });

    const roleCodes = await pool.query(
      `SELECT role_code FROM core.user_roles WHERE user_id = ${userId} and is_active = true`
    );
    response.role_codes = roleCodes.rows.map((row) => row.role_code);

    response.access_token = accessToken;

    return res.status(responseCode ?? 200).json(response);
  } catch (error) {
    console.log("Error in actionRegister function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};

export const actionLogout = async (req, res) => {
  let responseCode = null;

  let response = {
    success: true,
    message: "",
    error: null,
  };

  const refreshToken = req.cookies.refresh_token;
  if (!refreshToken) return res.sendStatus(204);

  try {
    const users = await pool.query(
      `SELECT * FROM core.users WHERE refresh_token = '${refreshToken}'`
    );

    if (users.rowCount < 1) return res.sendStatus(403);

    const user = users.rows[0];

    const updateRefreshToken = await pool.query(
      `UPDATE core.users SET refresh_token = null, updated_at = now() WHERE id = ${user.id}`
    );

    if (updateRefreshToken.rowCount !== 1) {
      responseCode = 500;
      response.success = false;
      response.message = "Database error, please contact administrator";
      response.error = result.rows;

      throw new Error(response.message);
    }

    res.clearCookie("refresh_token");

    return res.sendStatus(200);
  } catch (error) {
    console.log("Error in actionLogout function", error);

    if (!response.error) {
      response.error = error;
    }

    response.message = error.message;

    return res.status(responseCode ?? 500).json(response);
  }
};
