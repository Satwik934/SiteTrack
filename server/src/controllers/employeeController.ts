import type { Request, Response } from "express";
import mongoose from "mongoose";
import User, { type IUser } from "../models/User";
import { validateEmployeeChanges, validateNewEmployee } from "../utils/employeeInput";

const employeeFields = "_id firstName lastName email role isActive createdAt updatedAt";

function safeEmployee(user: IUser) {
  return {
    _id: user._id, firstName: user.firstName, lastName: user.lastName,
    email: user.email, role: user.role, isActive: user.isActive,
    createdAt: user.get("createdAt"), updatedAt: user.get("updatedAt"),
  };
}

function employeeError(error: unknown, res: Response): void {
  if (error instanceof mongoose.mongo.MongoServerError && error.code === 11000) {
    res.status(409).json({ message: "A user with this email already exists." });
  } else if (error instanceof mongoose.Error.ValidationError) {
    res.status(400).json({ message: "Invalid employee details." });
  } else {
    res.status(500).json({ message: "Unable to complete the employee request. Please try again later." });
  }
}

export async function listEmployees(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ message: "Unauthorized." }); return; }
  try {
    const employees = await User.find({ company: req.user.company })
      .select(employeeFields).sort({ firstName: 1, lastName: 1, _id: 1 });
    res.status(200).json({ employees: employees.map(safeEmployee) });
  } catch (error: unknown) { employeeError(error, res); }
}

export async function createEmployee(req: Request<Record<string, never>, unknown, unknown>, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ message: "Unauthorized." }); return; }
  const input = validateNewEmployee(req.body);
  if (input.value === undefined) { res.status(400).json({ message: input.error }); return; }
  if (req.user.role === "manager" && input.value.role !== "worker") {
    res.status(403).json({ message: "Forbidden." }); return;
  }
  try {
    // Global uniqueness matches login; the conflict never reveals another company.
    if (await User.exists({ email: input.value.email })) {
      res.status(409).json({ message: "A user with this email already exists." }); return;
    }
    const employee = new User({ ...input.value, company: req.user.company, isActive: true });
    await employee.save(); // Existing pre-save hook hashes the initial password.
    res.status(201).json({ message: "Employee created successfully.", employee: safeEmployee(employee) });
  } catch (error: unknown) { employeeError(error, res); }
}

export async function updateEmployee(req: Request<{ employeeId: string }, unknown, unknown>, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ message: "Unauthorized." }); return; }
  if (!/^[a-f\d]{24}$/i.test(req.params.employeeId)) {
    res.status(400).json({ message: "Invalid employee ID." }); return;
  }
  const input = validateEmployeeChanges(req.body);
  if (input.value === undefined) { res.status(400).json({ message: input.error }); return; }
  const changes = input.value;
  if (req.user.role === "manager" && changes.role !== undefined) {
    res.status(403).json({ message: "Forbidden." }); return;
  }
  const scope = { _id: req.params.employeeId, company: req.user.company };
  try {
    const employee = await User.findOne(scope).select(employeeFields);
    if (!employee) { res.status(404).json({ message: "Employee unavailable." }); return; }
    if (req.user.role === "manager" && employee.role !== "worker") {
      res.status(403).json({ message: "Forbidden." }); return;
    }
    // Owner role/status are immutable here, including self and other owners.
    // This preserves active owners even under concurrent administrative requests.
    if (employee.role === "owner" && (changes.role !== undefined || changes.isActive !== undefined)) {
      res.status(403).json({ message: "Owner role and account status cannot be changed here." }); return;
    }
    // Include the observed role in the atomic write, so a concurrent promotion
    // cannot let a manager change an account that has become privileged.
    const updated = await User.findOneAndUpdate(
      { ...scope, role: employee.role }, { $set: changes }, { new: true, runValidators: true }
    ).select(employeeFields);
    if (!updated) { res.status(409).json({ message: "Employee changed or is unavailable. Refresh and try again." }); return; }
    res.status(200).json({ message: "Employee updated successfully.", employee: safeEmployee(updated) });
  } catch (error: unknown) { employeeError(error, res); }
}
