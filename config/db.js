import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool, Client } = pg;
const { PGHOST, PGDATABASE, PGUSER, PGPASSWORD } = process.env;

const connectionString = `postgresql://${PGUSER}:${PGPASSWORD}@${PGHOST}/${PGDATABASE}?sslmode=require&channel_binding=require`;

export const pool = new Pool({
  connectionString: connectionString,
});

export const client = new Client({
  connectionString: connectionString,
});
