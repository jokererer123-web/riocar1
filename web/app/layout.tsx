import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Rio Car Wash · Каракол",
  description: "Автомойка | Стирка ковров | Химчистка | Каракол, Гагарина 27/1",
  applicationName: "Rio Car Wash",
  appleWebApp: { capable: true, title: "RIO", statusBarStyle: "black-translucent" as const },
};

export const viewport = { themeColor: "#07080c" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ky">
      <head>
        <link rel="manifest" href={`${process.env.GITHUB_ACTIONS ? "/riocar1" : ""}/manifest.webmanifest`} />
        <link rel="apple-touch-icon" href={`${process.env.GITHUB_ACTIONS ? "/riocar1" : ""}/icons/icon-192.png`} />
        <meta name="mobile-web-app-capable" content="yes" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
