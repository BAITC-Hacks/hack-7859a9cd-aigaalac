import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "5 сағатқа әкім — Астананың ертеңін таңдаңыз",
  description:
    "100 шартты бірлік. 5 аудан, 14 іс-шара және 5 шешім. Астананы басқарудың қазақша AI-симуляторы.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="kk">
      <body>{children}</body>
    </html>
  );
}
