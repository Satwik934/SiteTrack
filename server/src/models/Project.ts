import mongoose, { Document, Schema, Types } from "mongoose";

export interface IProject extends Document {
  company: Types.ObjectId;
  name: string;
  customerName: string;
  customerEmail?: string;
  customerPhone?: string;
  siteAddress: {
    street: string;
    city: string;
    province: string;
    postalCode?: string;
  };
  status: "planning" | "active" | "on-hold" | "completed";
  estimatedBudget: number;
  startDate?: Date;
  expectedEndDate?: Date;
}

const projectSchema = new Schema<IProject>(
  {
    company: {
      type: Schema.Types.ObjectId,
      ref: "Company",
      required: true,
    },

    name: {
      type: String,
      required: true,
      trim: true,
    },

    customerName: {
      type: String,
      required: true,
      trim: true,
    },

    customerEmail: {
      type: String,
      lowercase: true,
      trim: true,
    },

    customerPhone: {
      type: String,
      trim: true,
    },

    siteAddress: {
      street: {
        type: String,
        required: true,
        trim: true,
      },
      city: {
        type: String,
        required: true,
        trim: true,
      },
      province: {
        type: String,
        required: true,
        trim: true,
      },
      postalCode: {
        type: String,
        trim: true,
      },
    },

    status: {
      type: String,
      enum: ["planning", "active", "on-hold", "completed"],
      default: "planning",
    },

    estimatedBudget: {
      type: Number,
      required: true,
      min: 0,
    },

    startDate: {
      type: Date,
    },

    expectedEndDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

const Project = mongoose.model<IProject>("Project", projectSchema);

export default Project;