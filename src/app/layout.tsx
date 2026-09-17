import { Outfit } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import { getSiteUrl } from "@/components/marketing/content";

const outfit = Outfit({
  subsets: ["latin"],
});

const siteUrl = getSiteUrl();

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Chat IR — AI agents for investor relations",
    template: "%s | Chat IR",
  },
  description: "Help investors explore your public company information with AI voice and chat agents built for investor relations teams.",
  openGraph: {
    type: "website",
    siteName: "Chat IR",
    locale: "en_US",
    images: [{ url: "/images/marketing/architecture.jpg" }],
  },
  twitter: {
    card: "summary_large_image",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={outfit.className}>{children}</body>
    </html>
  );
}
