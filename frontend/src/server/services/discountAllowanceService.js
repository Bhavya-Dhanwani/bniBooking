import Booking from "@/server/models/Booking";
import { getSeatById, isSofaCategory } from "@/shared/seatMap";
import { isDiscountEnabled } from "@/server/services/siteSettingsService";

const ACTIVE_BOOKING_STATUSES = ["pending", "confirmed"];

export function noDiscountAllowance() {
  return { category: "none", sofaRemaining: 0, chairRemaining: 0 };
}

export function newMemberDiscountAllowance() {
  return { category: "choice", sofaRemaining: 1, chairRemaining: 2 };
}

export async function getDiscountAllowance(user) {
  return (await getDiscountState(user)).discountAllowance;
}

export async function getDiscountState(user) {
  const discountEnabled = await isDiscountEnabled();
  if (!discountEnabled || !user?.isBniMember) {
    return { discountEnabled, discountAllowance: noDiscountAllowance() };
  }

  const bookings = await Booking.find({
    status: { $in: ACTIVE_BOOKING_STATUSES },
    $or: [{ userId: user._id }, { userId: null, email: user.email }],
  })
    .select("priceBreakup")
    .lean();

  let usedSofaDiscount = false;
  let usedChairDiscounts = 0;

  bookings.forEach((booking) => {
    booking.priceBreakup?.forEach((line) => {
      if (line.priceType !== "Discounted") return;

      const seat = getSeatById(line.id);
      if (seat && isSofaCategory(seat.cat)) {
        usedSofaDiscount = true;
      } else if (seat) {
        usedChairDiscounts += 1;
      }
    });
  });

  if (usedSofaDiscount || usedChairDiscounts >= 2) {
    return { discountEnabled, discountAllowance: noDiscountAllowance() };
  }
  if (usedChairDiscounts === 1) {
    return { discountEnabled, discountAllowance: { category: "chair", sofaRemaining: 0, chairRemaining: 1 } };
  }

  return { discountEnabled, discountAllowance: newMemberDiscountAllowance() };
}
