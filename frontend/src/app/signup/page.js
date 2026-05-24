import AuthPage from "@/features/auth/AuthPage";
import { getSiteDownStatus } from "@/server/services/siteAvailabilityService";
import SiteUnavailable from "@/shared/SiteUnavailable";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Sign Up",
  robots: {
    index: false,
    follow: false,
  },
};

export default async function SignupPage() {
  if (await getSiteDownStatus()) return <SiteUnavailable />;

  return <AuthPage mode="signup" />;
}
