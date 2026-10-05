import type { IUser } from "../models/User";

export interface AuthenticatedUser {
  _id: string;
  company: string;
  role: IUser["role"];
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}
