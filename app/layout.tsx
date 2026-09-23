import type { Metadata } from "next";
import "@/app/globals.css";
import { AppShell } from "@/components/layout/AppShell";
import { SimulationProvider } from "@/components/SimulationProvider";
export const metadata: Metadata = { title: "Аким на 5 часов | City Management Simulator", description: "Five decisions. One city. Shape a better future for Astana." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return <html lang="en"><body><SimulationProvider><AppShell>{children}</AppShell></SimulationProvider></body></html>; }
