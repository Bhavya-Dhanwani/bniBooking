import { getCloudinary } from "../config/cloudinary.js";

export async function uploadPaymentScreenshot(dataUri, bookingId) {
  const cloudinary = getCloudinary();
  const result = await cloudinary.uploader.upload(dataUri, {
    folder: "bni/payment-screenshots",
    public_id: bookingId,
    resource_type: "image",
    overwrite: true,
  });

  return {
    url: result.secure_url,
    publicId: result.public_id,
  };
}

export async function deletePaymentScreenshots(publicIds) {
  const ids = publicIds.filter(Boolean);
  if (!ids.length) return;

  const cloudinary = getCloudinary();
  await Promise.allSettled(ids.map((publicId) => cloudinary.uploader.destroy(publicId)));
}
