import mongoose, { Document, Schema, Types } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  company: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  role: "owner" | "manager" | "worker";
  isActive: boolean;

  comparePassword(candidatePassword: string): Promise<boolean>;
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
      unique: true,
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
// ↓ These attach behavior to the completed schema
userSchema.pre("save", async function () {
    if (!this.isModified("password")) {
      return;
    }
  
    this.password = await bcrypt.hash(this.password, 12);
  });
  
  userSchema.methods.comparePassword = async function (
    candidatePassword: string
  ): Promise<boolean> {
    return bcrypt.compare(candidatePassword, this.password);
  };
  
  // ↓ Create model AFTER hooks/methods are attached
  const User = mongoose.model<IUser>("User", userSchema);
  
  export default User;
