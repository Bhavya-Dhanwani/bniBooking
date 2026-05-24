import UserDashboard from "@/features/dashboard/UserDashboard";

export const metadata = {
  title: "Dashboard",
  robots: {
    index: false,
    follow: false,
  },
};

export default function DashboardPage() {
  return <UserDashboard />;
}
