import type { Metadata } from "next";
import { Inter, Playfair_Display, Share_Tech_Mono } from "next/font/google";
import "./globals.css";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
});

const shareTechMono = Share_Tech_Mono({
  variable: "--font-share-tech-mono",
  weight: "400",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Chiptime",
  description: "Predict race times, compete with friends, earn awards.",
  icons: { icon: "/favicon.svg" },
  openGraph: {
    title: "Chiptime",
    description: "Predict race times, compete with friends, earn awards.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${inter.variable} ${playfair.variable} ${shareTechMono.variable} font-sans antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
