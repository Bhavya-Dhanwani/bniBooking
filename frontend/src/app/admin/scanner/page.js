import AdminScanner from "./scanner";

export const metadata = {
  title: "Admin QR Scanner",
  robots: {
    index: false,
    follow: false,
  },
};

export default function AdminScannerPage() {
  return <AdminScanner />;
}
