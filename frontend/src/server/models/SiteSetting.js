import mongoose from "mongoose";

const siteSettingSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      required: true,
      unique: true,
    },
    discountEnabled: {
      type: Boolean,
      default: true,
    },
    siteDown: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    collection: "sitesettings",
  },
);

export default mongoose.models.SiteSetting || mongoose.model("SiteSetting", siteSettingSchema);
