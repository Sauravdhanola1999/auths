import express from "express";
import { Request, Response } from "express";
import cookieParser from "cookie-parser";


const app = express();

app.use(express.json());
app.use(cookieParser());

app.get("/health", (_req: Request, res: Response): void => {
  res.status(200).json({ status: "ok" });
});

export default app;