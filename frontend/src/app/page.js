import BookingPage from "@/features/booking/BookingPage";
import { siteDescription, siteName } from "@/shared/siteConfig";

export const metadata = {
  title: siteName,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
};

export default function Home() {
  return <BookingPage />;
}
