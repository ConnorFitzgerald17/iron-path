import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Iron Path — Old School progress, properly tracked",
  description: "Quest readiness, item grinds, banked XP, and a trophy case for Old School RuneScape iron accounts."
};

export const viewport: Viewport = {
  colorScheme: "dark",
  themeColor: "#121413"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
