import { Request, Response } from "express";
import mongoose from "mongoose";
import Company from "../models/Company";
import User from "../models/User";
import generateToken from "../utils/generateToken";

export async function login(
  req: Request<Record<string, never>, unknown, unknown>,
  res: Response
): Promise<void> {
  const body = req.body;
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const { email, password } = body as Record<string, unknown>;
  if (
    typeof email !== "string" || !email.trim() ||
    typeof password !== "string" || !password.trim()
  ) {
    res.status(400).json({ message: "Email and password are required." });
    return;
  }

  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) {
    res.status(400).json({ message: "A valid email is required." });
    return;
  }

  try {
    const user = await User.findOne({ email: normalizedEmail }).select("+password");
    if (!user || !(await user.comparePassword(password)) || !user.isActive) {
      res.status(401).json({ message: "Invalid email or password." });
      return;
    }

    const token = generateToken(String(user._id));
    res.status(200).json({
      message: "Logged in successfully.",
      token,
      user: {
        _id: user._id,
        company: user.company,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        role: user.role,
        isActive: user.isActive,
      },
    });
  } catch (error: unknown) {
    res.status(500).json({ message: "Unable to log in. Please try again later." });
  }
}

const requiredFields = [
  "companyName", "companyEmail", "firstName", "lastName", "email", "password",
] as const;

type RegistrationInput = Record<(typeof requiredFields)[number], string>;

function isRegistrationInput(body: unknown): body is RegistrationInput {
  if (typeof body !== "object" || body === null || Array.isArray(body)) {
    return false;
  }

  const fields = body as Record<string, unknown>;
  return requiredFields.every(
    (field) => typeof fields[field] === "string" && fields[field].trim().length > 0
  );
}

export async function register(
  req: Request<Record<string, never>, unknown, unknown>,
  res: Response
): Promise<void> {
  if (!isRegistrationInput(req.body)) {
    res.status(400).json({
      message: `Required non-empty string fields: ${requiredFields.join(", ")}.`,
    });
    return;
  }

  const { companyName, firstName, lastName, password } = req.body;
  const email = req.body.email.trim().toLowerCase();
  const companyEmail = req.body.companyEmail.trim().toLowerCase();
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(email) || !emailPattern.test(companyEmail)) {
    res.status(400).json({ message: "A valid owner email and company email are required." });
    return;
  }

  // bcrypt only uses the first 72 bytes; reject passwords it would truncate.
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    res.status(400).json({ message: "Password must be at least 8 characters and at most 72 bytes." });
    return;
  }

  try {
    if (await User.exists({ email })) {
      res.status(409).json({ message: "A user with this email already exists." });
      return;
    }

    const result = await mongoose.connection.transaction(async (session) => {
      const company = new Company({ name: companyName.trim(), email: companyEmail });
      await company.save({ session });

      const user = new User({
        company: company._id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email,
        password,
        role: "owner",
      });
      await user.save({ session });

      // Token failures also abort the transaction, allowing registration to be retried.
      const token = generateToken(String(user._id));

      return {
        token,
        company: { _id: company._id, name: company.name, email: company.email },
        user: {
          _id: user._id,
          company: user.company,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          role: user.role,
          isActive: user.isActive,
        },
      };
    });

    res.status(201).json({ message: "Company and owner registered successfully.", ...result });
  } catch (error: unknown) {
    if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
      res.status(409).json({ message: "A user with this email already exists." });
      return;
    }

    if (error instanceof mongoose.Error.ValidationError) {
      res.status(400).json({ message: "Invalid registration details." });
      return;
    }

    res.status(500).json({ message: "Unable to register. Please try again later." });
  }
}
