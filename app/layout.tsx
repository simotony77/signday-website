import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://signdayapp.com"),
  title: {
    default: "SignDay — College Soccer Recruiting Companion",
    template: "%s | SignDay",
  },
  description:
    "AI-powered coach emails, school tracker, and your full timeline — all in one place. The recruiting companion for soccer families.",
  openGraph: {
    title: "SignDay — College Soccer Recruiting Companion",
    description:
      "AI-powered coach emails, school tracker, and your full timeline. Built by a soccer parent.",
    url: "https://signdayapp.com",
    siteName: "SignDay",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignDay — College Soccer Recruiting Companion",
    description: "AI-powered coach emails, school tracker, and timeline.",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
