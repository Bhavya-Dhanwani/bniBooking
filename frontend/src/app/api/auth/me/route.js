import { connectDb, isDatabaseConnectionError } from "@/server/db";
import { errorResponse, json } from "@/server/http";
import { getSessionUser, syncBniMemberStatus } from "@/server/services/authService";
import { getDiscountState } from "@/server/services/discountAllowanceService";

export const runtime = "nodejs";

export async function GET(request) {
  try {
    await connectDb();
    const user = await getSessionUser(request);
    if (user) await syncBniMemberStatus(user);
    const discountState = user ? await getDiscountState(user) : { discountEnabled: false, discountAllowance: null };
    return json({ user: user ? user.toJSON() : null, ...discountState });
  } catch (error) {
    if (isDatabaseConnectionError(error)) {
      return json({ user: null, discountEnabled: false, discountAllowance: null });
    }

    return errorResponse(error);
  }
}
