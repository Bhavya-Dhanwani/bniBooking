import mongoose from "mongoose";

const adminAccessSchema = new mongoose.Schema(
  {
    displayName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 80,
    },
    passwordHash: {
      type: String,
      select: false,
    },
    tokenDigest: {
      type: String,
      unique: true,
      sparse: true,
    },
    role: {
      type: String,
      enum: ["admin", "viewer"],
      default: "viewer",
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
    collection: "adminaccess",
  },
);

if (process.env.NODE_ENV === "development" && mongoose.models.AdminAccess) {
  mongoose.deleteModel("AdminAccess");
}

export default mongoose.models.AdminAccess || mongoose.model("AdminAccess", adminAccessSchema);
