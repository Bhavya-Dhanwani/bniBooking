import AuthPage from "@/features/auth/AuthPage";
import { getSiteDownStatus } from "@/server/services/siteAvailabilityService";
import SiteUnavailable from "@/shared/SiteUnavailable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function LoginPage() {
  if (await getSiteDownStatus()) return <SiteUnavailable />;

  return <AuthPage mode="login" />;
}
