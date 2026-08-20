import "./globals.css";
import type { ReactNode } from "react";

export const metadata = {
  title: "Rio Car Wash · Каракол",
  description: "Автомойка | Стирка ковров | Химчистка | Каракол, Гагарина 27/1",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="ky">
      <head>
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
