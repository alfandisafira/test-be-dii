import jwt from "jsonwebtoken";
import { pool } from "../config/db.js";

export const getAccessToken = async (req, res) => {
  try {
    const refreshToken = req.cookies.refresh_token;

    if (!refreshToken) return res.sendStatus(401);

    const users = await pool.query(
      `SELECT * FROM core.users WHERE refresh_token = '${refreshToken}'`
    );

    if (users.rowCount < 1) return res.sendStatus(403);

    const user = users.rows[0];

    const profiles = await pool.query(
      `SELECT id, first_name FROM core.user_profiles WHERE user_id = ${user.id}`
    );

    jwt.verify(
      refreshToken,
      process.env.REFRESH_TOKEN_SECRET,
      (err, _decoded) => {
        if (err) return res.sendStatus(403);

        const userId = user.id;
        const email = user.id;
        const profileId = profiles.rows[0].id;
        const profileFirstName = profiles.rows[0].first_name;

        const accessToken = jwt.sign(
          { userId, email, profileId, profileFirstName },
          process.env.ACCESS_TOKEN_SECRET,
          { expiresIn: "30m" }
        );

        res.json({ accessToken });
      }
    );
  } catch (error) {
    console.log("Error in actionRefreshToken function", error);

    return res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
};
