import type { Request, Response } from "express";
import Company from "../models/Company";

export async function getCompany(req: Request, res: Response): Promise<void> {
  if (!req.user) { res.status(401).json({ message: "Unauthorized." }); return; }
  try {
    const company = await Company.findById(req.user.company).select("_id name email phone address");
    if (!company) { res.status(404).json({ message: "Company unavailable." }); return; }
    res.status(200).json({ company: {
      _id: company._id, name: company.name, email: company.email, phone: company.phone,
      address: company.address ? {
        street: company.address.street, city: company.address.city,
        province: company.address.province, postalCode: company.address.postalCode,
      } : undefined,
    } });
  } catch {
    res.status(500).json({ message: "Unable to retrieve company information. Please try again later." });
  }
}
