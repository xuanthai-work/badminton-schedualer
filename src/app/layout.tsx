import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { I18nProvider } from "@/lib/i18n";
import UpdatePrompt from "@/components/UpdatePrompt";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  applicationName: "BSche",
  title: "BSche",
  description: "Badminton match scheduling and cost splitting",
  // Makes the home-screen launch open full-screen (no Safari chrome) on iOS.
  appleWebApp: {
    capable: true,
    title: "BSche",
    statusBarStyle: "black-translucent",
  },
};

export const viewport: Viewport = {
  themeColor: "#020617",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <I18nProvider>
          {children}
          <UpdatePrompt />
        </I18nProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
