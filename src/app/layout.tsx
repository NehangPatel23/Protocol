import type { Metadata, Viewport } from "next";
import { PrefsProvider } from "@/components/PrefsProvider";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Protocol",
    template: "%s · Protocol",
  },
  description: "Strength training, planned and logged with precision.",
  applicationName: "Protocol",
  appleWebApp: {
    capable: true,
    title: "Protocol",
    statusBarStyle: "black-translucent",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#0B1120",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body className="antialiased">
        <PrefsProvider>{children}</PrefsProvider>
      </body>
    </html>
  );
}
