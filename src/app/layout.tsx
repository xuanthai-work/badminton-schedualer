import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { I18nProvider } from "@/lib/i18n";
import { ConfirmProvider } from "@/components/ConfirmProvider";
import { ToastProvider } from "@/components/ToastProvider";
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
  metadataBase: new URL(
    process.env.NEXT_PUBLIC_APP_URL || "https://bscheduler.xyz"
  ),
  applicationName: "BSche",
  title: "BSche",
  description: "Badminton match scheduling and cost splitting",
  // Makes the home-screen launch open full-screen (no Safari chrome) on iOS.
  appleWebApp: {
    capable: true,
    title: "BSche",
    statusBarStyle: "black-translucent",
  },
  openGraph: {
    title: "BSche - Cầu lông đi mà ^^",
    description: "Lên lịch, điểm danh realtime và chia chi phí cho cả nhóm trong vài phút.",
    siteName: "BSche",
    locale: "vi_VN",
    type: "website",
    images: [
      {
        url: "/og-image.png",
        width: 1200,
        height: 630,
        type: "image/png",
        alt: "BSche - Cầu lông đi mà ^^",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "BSche - Cầu lông đi mà ^^",
    description: "Lên lịch, điểm danh realtime và chia chi phí cho cả nhóm trong vài phút.",
    images: ["/og-image.png"],
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
          <ToastProvider>
            <ConfirmProvider>
              {children}
              <UpdatePrompt />
            </ConfirmProvider>
          </ToastProvider>
        </I18nProvider>
        <SpeedInsights />
      </body>
    </html>
  );
}
