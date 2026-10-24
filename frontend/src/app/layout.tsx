import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Diabetes Report Tracker",
  description: "Mock patient lab report dashboard",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
