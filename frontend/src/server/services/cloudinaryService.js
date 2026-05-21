import { v2 as cloudinary } from "cloudinary";

let configured = false;

function getCloudinary() {
  if (!configured) {
    const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;

    if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
      throw new Error("Cloudinary credentials are not configured.");
    }

    cloudinary.config({
      cloud_name: CLOUDINARY_CLOUD_NAME,
      api_key: CLOUDINARY_API_KEY,
      api_secret: CLOUDINARY_API_SECRET,
    });
    configured = true;
  }

  return cloudinary;
}

export async function uploadPaymentScreenshot(dataUri, bookingId) {
  const result = await getCloudinary().uploader.upload(dataUri, {
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

  await Promise.allSettled(ids.map((publicId) => getCloudinary().uploader.destroy(publicId)));
}
