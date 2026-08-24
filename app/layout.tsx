import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";

import { NotificationWorkerBootstrap } from "@/src/platform/NotificationWorkerBootstrap";
import { saayaTheme } from "@/src/ui/theme/tokens";

import "./globals.css";

export const metadata: Metadata = {
  title: "Saaya Lite",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [{ url: "/assets/icons/favicon.svg", type: "image/svg+xml" }],
    apple: "/assets/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  colorScheme: "dark",
  themeColor: saayaTheme.colors.background,
};

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <NotificationWorkerBootstrap />
        {children}
      </body>
    </html>
  );
}
