import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import apiRouter from "./routes/api.js";

dotenv.config();

const app = express();

app.use(cors());
app.use(cookieParser());
app.use(express.json());

app.use("/api", apiRouter);

app.listen(process.env.PORT, () => {
  console.log("Server is running on PORT: " + process.env.PORT);
});
