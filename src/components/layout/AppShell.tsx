"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  ArrowUpRight,
  Building2,
  ChartNoAxesCombined,
  CircleHelp,
  LayoutDashboard,
  MapPinned,
  Sparkles,
} from "lucide-react";
import ThemeToggle from "@/components/theme/ThemeToggle";
import { USE_MOCK_API } from "@/lib/api/client";
const navigation = [
  { href: "/", label: "Overview", icon: LayoutDashboard },
  { href: "/simulation", label: "City management", icon: MapPinned },
  { href: "/results", label: "Simulation results", icon: ChartNoAxesCombined },
];
export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link href="/" className="brand">
          <span className="brand-mark">
            <Building2 size={23} />
          </span>
          <span>
            AKIM<span className="brand-caption">CITY SIMULATOR</span>
          </span>
        </Link>
        <div className="workspace-label">YOUR WORKSPACE</div>
        <nav aria-label="Main navigation">
          {navigation.map(({ href, label, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              className={`nav-link ${pathname === href ? "active" : ""}`}
              aria-current={pathname === href ? "page" : undefined}
            >
              <Icon size={19} />
              {label}
              {pathname === href && <span className="active-dot" />}
            </Link>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note">
            <Sparkles size={19} />
            <strong>
              A better city starts
              <br />
              with your decisions.
            </strong>
            <p>
              Think locally. Make an impact
              <br />
              across the city.
            </p>
            <Link href="/simulation">
              Take the mayor’s seat <ArrowUpRight size={15} />
            </Link>
          </div>
          <div className="sidebar-footer">
            <CircleHelp size={16} /> Hackathon edition <span>v1.0</span>
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            Workspace <span>/</span>
            <strong>
              {navigation.find((n) => n.href === pathname)?.label ?? "Overview"}
            </strong>
          </div>
          <div className="topbar-right">
            <ThemeToggle />
            <span className="mode-badge">
              <span />
              {USE_MOCK_API ? "Demo mode" : "Live API"}
            </span>
            <div className="avatar" title="Your mayor's workspace">
              AK
            </div>
          </div>
        </header>
        <main id="main-content">{children}</main>
        <footer className="page-footer">
          <span>
            Аким на 5 часов <span className="footer-dot">·</span> AI City
            Management Simulator
          </span>
          <span>
            Made for a better tomorrow <span className="teal">↗</span>
          </span>
        </footer>
      </div>
    </div>
  );
}
