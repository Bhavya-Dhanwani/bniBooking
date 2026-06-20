import { Geist, Geist_Mono } from "next/font/google";
import { absoluteUrl, siteDescription, siteName, siteUrl } from "@/shared/siteConfig";
import AuthProvider from "@/shared/AuthContext";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: siteName,
    template: `%s | ${siteName}`,
  },
  description: siteDescription,
  applicationName: siteName,
  keywords: [
    "BNI Kutch",
    "Laksh Maheshwari",
    "event booking",
    "seat booking",
    "Kutch event",
    "BNI event tickets",
  ],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: absoluteUrl("/"),
    siteName,
    title: siteName,
    description: siteDescription,
    images: [
      {
        url: "/bni-logo.jpg",
        width: 1200,
        height: 630,
        alt: "BNI Kutch Event Booking",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: siteName,
    description: siteDescription,
    images: ["/bni-logo.jpg"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
