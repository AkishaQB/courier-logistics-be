import { Request, Response, NextFunction } from "express";
import { getDashboard } from "../services/dashboard.service";

export async function getDashboardHandler(
  _req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    const dashboard = await getDashboard();
    res.json({ data: dashboard });
  } catch (err) {
    next(err);
  }
}
