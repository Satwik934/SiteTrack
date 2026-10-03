import mongoose, { Document, Schema, Types } from "mongoose";

export interface IUser extends Document {
  company: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "owner" | "manager" | "worker";
  isActive: boolean;
}

const userSchema = new Schema<IUser>(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    firstName: {
      type: String,
      required: true,
      trim: true,
    },

    lastName: {
      type: String,
      required: true,
      trim: true,
    },

    email: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },

    password: {
      type: String,
      required: true,
      select: false,
    },

    role: {
      type: String,
      enum: ["owner", "manager", "worker"],
      default: "worker",
    },

    isActive: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const User = mongoose.model<IUser>("User", userSchema);

export default User;