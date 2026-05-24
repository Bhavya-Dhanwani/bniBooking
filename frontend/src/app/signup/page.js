import AuthPage from "@/features/auth/AuthPage";

export const metadata = {
  title: "Sign Up",
  robots: {
    index: false,
    follow: false,
  },
};

export default function SignupPage() {
  return <AuthPage mode="signup" />;
}
