"use client";

import { ThemeProvider } from "@/context/ThemeContext";

// Auth screens are styled for both themes, so they need the theme provider to
// reapply the visitor's saved preference. They need none of the other providers.
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider>{children}</ThemeProvider>;
}
