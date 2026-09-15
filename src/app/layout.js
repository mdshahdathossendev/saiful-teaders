import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import KeepAlive from "@/components/KeepAlive";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata = {
  title: "সাইফুল ট্রেডার্স | Saiful Traders",
  description: "মেসার্স সাইফুল ট্রেডার্স এন্ড স্টোন ক্রাশার — বিক্রয় হিসাব ড্যাশবোর্ড",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <KeepAlive />
        {children}
      </body>
    </html>
  );
}
