import SiteSetting from "@/server/models/SiteSetting";

const PRICING_SETTINGS_KEY = "pricing";

export async function isDiscountEnabled() {
  const settings = await SiteSetting.findOne({ key: PRICING_SETTINGS_KEY }).select("discountEnabled").lean();
  return settings?.discountEnabled ?? true;
}

export async function updateDiscountEnabled(discountEnabled) {
  const settings = await SiteSetting.findOneAndUpdate(
    { key: PRICING_SETTINGS_KEY },
    { $set: { discountEnabled } },
    { new: true, upsert: true, setDefaultsOnInsert: true },
  ).lean();

  return settings.discountEnabled;
}
