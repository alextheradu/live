import type { Metadata } from "next";
import { Fira_Sans, Short_Stack } from "next/font/google";
import "./globals.css";

const firaSans = Fira_Sans({
  subsets: ["latin"],
  weight: ["100", "200", "300", "400", "500", "600", "700", "800", "900"],
  style: ["normal", "italic"],
  variable: "--font-fira-sans",
});

const shortStack = Short_Stack({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-short-stack",
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
    <html lang="en" className={`${firaSans.variable} ${shortStack.variable}`}>
      <body>{children}</body>
    </html>
  );
}
