import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://signdayapp.com"),
  title: {
    default: "SignDay — Weekly College Roster Tracker for Recruiting Families",
    template: "%s | SignDay",
  },
  description:
    "We watch every roster on your kid's list and flag when a spot is opening at their position. Soccer, volleyball, baseball, softball, lacrosse. One Sunday email, $19.99/mo.",
  openGraph: {
    title: "SignDay — Weekly College Roster Tracker for Recruiting Families",
    description:
      "We watch every roster on your kid's list and flag when a spot is opening at their position. Built by a recruiting parent.",
    url: "https://signdayapp.com",
    siteName: "SignDay",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "SignDay — Weekly College Roster Tracker",
    description:
      "Roster tracking and position-opening flags for recruiting families. One Sunday email.",
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
