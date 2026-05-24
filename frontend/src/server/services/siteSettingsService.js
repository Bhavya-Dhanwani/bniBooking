import SiteSetting from "@/server/models/SiteSetting";

const PRICING_SETTINGS_KEY = "pricing";

export async function isDiscountEnabled() {
  const settings = await SiteSetting.findOne({ key: PRICING_SETTINGS_KEY }).select("discountEnabled").lean();
  return settings?.discountEnabled ?? true;
}

export async function updateDiscountEnabled(discountEnabled) {
  await SiteSetting.updateOne(
    { key: PRICING_SETTINGS_KEY },
    { $set: { discountEnabled } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return isDiscountEnabled();
}

export async function isSiteDown() {
  const settings = await SiteSetting.findOne({ key: PRICING_SETTINGS_KEY }).select("siteDown").lean();
  return settings?.siteDown ?? false;
}

export async function updateSiteDown(siteDown) {
  await SiteSetting.updateOne(
    { key: PRICING_SETTINGS_KEY },
    { $set: { siteDown } },
    { upsert: true, setDefaultsOnInsert: true },
  );

  return isSiteDown();
}
