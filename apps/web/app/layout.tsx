import type { Metadata } from "next";
import type { ReactNode } from "react";

import "@fontsource-variable/inter/wght.css";
import "@fontsource/tajawal/400.css";
import "@fontsource/tajawal/500.css";
import "@fontsource/tajawal/700.css";
import "./styles.css";

export const metadata: Metadata = {
  title: "Pioneer Auctions",
};

export default function RootLayout({
  children,
}: Readonly<{ children: ReactNode }>) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
