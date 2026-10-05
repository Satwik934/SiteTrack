import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import type { AuthenticatedUser } from "../types/auth";

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  delete req.user;
  const header = req.get("Authorization");
  const match = header?.match(/^Bearer ([^\s,]+)$/i);
  if (!match) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  const secret = process.env.JWT_SECRET;
  if (!secret) {
    res.status(500).json({ message: "Unable to authenticate. Please try again later." });
    return;
  }

  let userId: string;
  try {
    const payload = jwt.verify(match[1], secret, { algorithms: ["HS256"] });
    if (
      typeof payload !== "object" || payload === null ||
      typeof payload.userId !== "string" || !/^[a-f\d]{24}$/i.test(payload.userId)
    ) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }
    userId = payload.userId;
  } catch (error: unknown) {
    res.status(401).json({ message: "Unauthorized." });
    return;
  }

  try {
    const user = await User.findById(userId).select("_id company role isActive");
    if (!user || !user.isActive) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    const authenticatedUser: AuthenticatedUser = {
      _id: String(user._id),
      company: String(user.company),
      role: user.role,
    };
    req.user = authenticatedUser;
  } catch (error: unknown) {
    res.status(500).json({ message: "Unable to authenticate. Please try again later." });
    return;
  }

  next();
}
