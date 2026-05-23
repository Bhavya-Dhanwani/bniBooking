import mongoose from "mongoose";

const memberRegistrySchema = new mongoose.Schema(
  {
    name: {
      type: String,
      trim: true,
      default: "",
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      index: true,
    },
    phone: {
      type: String,
      trim: true,
      default: "",
    },
    active: {
      type: Boolean,
      default: true,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "memberregistries",
  },
);

export default mongoose.models.MemberRegistry || mongoose.model("MemberRegistry", memberRegistrySchema);
