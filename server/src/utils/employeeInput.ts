import type { IUser } from "../models/User";

export type EmployeeChanges = Partial<Pick<IUser, "firstName" | "lastName" | "role" | "isActive">>;
export interface NewEmployee {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "manager" | "worker";
}
type Result<T> = { value: T; error?: never } | { error: string; value?: never };

function isObject(body: unknown): body is Record<string, unknown> {
  return typeof body === "object" && body !== null && !Array.isArray(body);
}

export function validateNewEmployee(body: unknown): Result<NewEmployee> {
  const fields = ["firstName", "lastName", "email", "password", "role"];
  if (!isObject(body) || Object.keys(body).some(key => !fields.includes(key)) ||
    fields.some(key => typeof body[key] !== "string" || !body[key].trim())) {
    return { error: "Provide only firstName, lastName, email, password, and role as non-empty strings." };
  }
  const { firstName, lastName, email, password, role } = body as Record<string, string>;
  if (role !== "manager" && role !== "worker") return { error: "Role must be manager or worker." };
  const normalizedEmail = email.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail)) return { error: "A valid email is required." };
  if (password.length < 8 || Buffer.byteLength(password, "utf8") > 72) {
    return { error: "Password must be at least 8 characters and at most 72 bytes." };
  }
  return { value: { firstName: firstName.trim(), lastName: lastName.trim(), email: normalizedEmail, password, role } };
}

export function validateEmployeeChanges(body: unknown): Result<EmployeeChanges> {
  const fields = ["firstName", "lastName", "role", "isActive"];
  if (!isObject(body) || !Object.keys(body).length || Object.keys(body).some(key => !fields.includes(key))) {
    return { error: "Provide at least one of firstName, lastName, role, or isActive. Other fields cannot be changed." };
  }
  const changes: EmployeeChanges = {};
  for (const key of ["firstName", "lastName"] as const) {
    if (key in body) {
      if (typeof body[key] !== "string" || !body[key].trim()) return { error: "Names must be non-empty strings." };
      changes[key] = body[key].trim();
    }
  }
  if ("role" in body) {
    if (body.role !== "manager" && body.role !== "worker") return { error: "Role must be manager or worker." };
    changes.role = body.role;
  }
  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") return { error: "isActive must be a boolean." };
    changes.isActive = body.isActive;
  }
  return { value: changes };
}
