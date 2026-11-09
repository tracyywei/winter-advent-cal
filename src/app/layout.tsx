import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

// One clear font everywhere: bold for headings, italic for personal notes.
const body = Nunito({ variable: "--font-body", subsets: ["latin"], style: ["normal", "italic"] });

export const metadata: Metadata = {
  title: "Advent Calendar from Tracy 🎄",
  description: "A little surprise every day of December.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#2d2f73",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={body.variable}>
      <body>{children}</body>
    </html>
  );
}
