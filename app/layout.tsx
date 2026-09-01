import type { Metadata } from "next";
import { Lato, Rubik_Spray_Paint } from "next/font/google";
import "./globals.css";

const lato = Lato({
  subsets: ["latin"],
  weight: ["100", "300", "400", "700", "900"],
  style: ["normal", "italic"],
  variable: "--font-lato",
});

const rubikSprayPaint = Rubik_Spray_Paint({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-rubik-spray-paint",
});

export const metadata: Metadata = {
  title: "Live - every hour coded increases the stream by 20m",
  manifest: "/site.webmanifest",
  icons: {
    icon: [
      { url: "/favicon.svg", type: "image/svg+xml" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" },
    ],
    apple: "/apple-touch-icon.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${lato.variable} ${rubikSprayPaint.variable}`}>
      <body>{children}</body>
    </html>
  );
}
