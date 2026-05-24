import AuthPage from "@/features/auth/AuthPage";

export const metadata = {
  title: "Login",
  robots: {
    index: false,
    follow: false,
  },
};

export default function LoginPage() {
  return <AuthPage mode="login" />;
}
