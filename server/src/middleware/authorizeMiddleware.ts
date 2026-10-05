import type { RequestHandler } from "express";
import type { AuthenticatedUser } from "../types/auth";

// Place after authenticate so req.user contains the current database identity.
export function authorize(...allowedRoles: AuthenticatedUser["role"][]): RequestHandler {
  return (req, res, next): void => {
    if (!req.user) {
      res.status(401).json({ message: "Unauthorized." });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ message: "Forbidden." });
      return;
    }

    next();
  };
}
