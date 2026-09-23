import type { Metadata } from "next";
import "maplibre-gl/dist/maplibre-gl.css";
import "@/app/globals.css";
import "@/app/theme.css";
import "@/components/map/map.css";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationProvider } from "@/components/SimulationProvider";
export const metadata: Metadata = {
  title: "Аким на 5 часов | City Management Simulator",
  description: "Five decisions. One city. Shape a better future for Astana.",
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" data-theme="light">
      <body>
        <a className="skip-link" href="#main-content">
          Skip to content
        </a>
        <ThemeProvider forcedTheme="light">
          <SimulationProvider>
            <AppShell>{children}</AppShell>
          </SimulationProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
