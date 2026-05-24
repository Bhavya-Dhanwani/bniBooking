import BookingPage from "@/features/booking/BookingPage";
import { getSiteDownStatus } from "@/server/services/siteAvailabilityService";
import SiteUnavailable from "@/shared/SiteUnavailable";
import { siteDescription, siteName } from "@/shared/siteConfig";

export const dynamic = "force-dynamic";

export const metadata = {
  title: siteName,
  description: siteDescription,
  alternates: {
    canonical: "/",
  },
};

export default async function Home() {
  const siteDown = await getSiteDownStatus();
  if (siteDown) return <SiteUnavailable />;

  return <BookingPage />;
}
