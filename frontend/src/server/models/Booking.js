import mongoose from "mongoose";

const bookingSchema = new mongoose.Schema(
  {
    bookingId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true,
      index: true,
    },
    phone: {
      type: String,
      required: true,
      trim: true,
      index: true,
    },
    gstNumber: {
      type: String,
      trim: true,
      default: "",
    },
    seats: {
      type: [String],
      required: true,
      validate: {
        validator: (value) => Array.isArray(value) && value.length > 0,
        message: "At least one seat is required",
      },
    },
    paymentMethod: {
      type: String,
      enum: ["upi", "imps", "cash"],
      default: "upi",
    },
    baseAmount: {
      type: Number,
      required: true,
    },
    gst: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    priceBreakup: {
      type: [
        {
          id: {
            type: String,
          },
          price: {
            type: Number,
          },
          priceType: {
            type: String,
          },
        },
      ],
      default: [],
    },
    screenshot: {
      type: String,
      default: "",
    },
    screenshotPublicId: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "confirmed", "rejected"],
      default: "pending",
      index: true,
    },
    checkInToken: {
      type: String,
      unique: true,
      sparse: true,
      index: true,
    },
    checkedInAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(_doc, ret) {
        ret.id = ret.bookingId;
        ret.date = ret.createdAt;
        delete ret._id;
        delete ret.__v;
        delete ret.bookingId;
        return ret;
      },
    },
  },
);

if (mongoose.models.Booking) {
  delete mongoose.models.Booking;
}

const Booking = mongoose.model("Booking", bookingSchema);

let contactIndexCleanupPromise = null;

export async function allowRepeatedContactBookings() {
  if (contactIndexCleanupPromise) return contactIndexCleanupPromise;

  contactIndexCleanupPromise = (async () => {
    const indexes = await Booking.collection.indexes();
    const legacyUniqueContactIndexes = indexes.filter((index) => {
      const keys = Object.keys(index.key || {});
      return index.unique && keys.length === 1 && ["email", "phone"].includes(keys[0]);
    });

    await Promise.all(
      legacyUniqueContactIndexes.map((index) => Booking.collection.dropIndex(index.name)),
    );
  })();

  return contactIndexCleanupPromise;
}

export default Booking;
