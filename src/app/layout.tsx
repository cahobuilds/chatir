import { Outfit } from "next/font/google";
import type { Metadata } from "next";
import "./globals.css";
import "swiper/swiper-bundle.css";
import "simplebar-react/dist/simplebar.min.css";
import { SidebarProvider } from "@/context/SidebarContext";
import { ThemeProvider } from "@/context/ThemeContext";
import { OrganizationProvider } from "@/context/OrganizationContext";

const outfit = Outfit({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "AI Knowledge Bots | Intelligent Knowledge Management",
  description: "Build and manage AI-powered knowledge bots for your organization. Multi-tenant SaaS platform for intelligent knowledge management.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${outfit.className} dark:bg-gray-900`}>
        <ThemeProvider>
          <OrganizationProvider>
            <SidebarProvider>{children}</SidebarProvider>
          </OrganizationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}

