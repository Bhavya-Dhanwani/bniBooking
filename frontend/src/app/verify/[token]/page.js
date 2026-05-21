import VerifyBooking from "./verify-booking";

export const metadata = {
  title: "Verify Booking | BNI Kutch",
};

export default async function VerifyPage({ params }) {
  const { token } = await params;
  return <VerifyBooking token={token} />;
}
