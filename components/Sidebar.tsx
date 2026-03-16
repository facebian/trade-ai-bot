"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  IconLayoutDashboard,
  IconCurrencyBitcoin,
  IconBuildingBank,
  IconSettings,
  IconActivity,
} from "@tabler/icons-react";

const NAV_ITEMS = [
  {
    href: "/",
    label: "Dashboard",
    icon: IconLayoutDashboard,
  },
  {
    href: "/bybit",
    label: "Bybit",
    icon: IconCurrencyBitcoin,
  },
  {
    href: "/dzengi",
    label: "Dzengi",
    icon: IconBuildingBank,
  },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:flex flex-col w-14 lg:w-56 shrink-0 border-r border-border bg-card min-h-screen sticky top-0 h-screen">
        {/* Logo */}
        <div className="flex items-center gap-2.5 px-3 lg:px-4 h-14  border-border">
          <IconActivity size={18} className="text-trade shrink-0" />
          <span className="hidden lg:block text-sm font-bold tracking-tight">
            TradeAI
          </span>
        </div>

        {/* Nav */}
        <nav className="flex flex-col gap-1 p-2 flex-1">
          {NAV_ITEMS.map(({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
                  active
                    ? "bg-muted text-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground",
                )}
              >
                <Icon size={18} className="shrink-0" />
                <span className="hidden lg:block">{label}</span>
              </Link>
            );
          })}
        </nav>

        {/* Settings at bottom */}
        <div className="p-2 border-t border-border">
          <Link
            href="/settings"
            className={cn(
              "flex items-center gap-3 px-2 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === "/settings"
                ? "bg-muted text-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <IconSettings size={18} className="shrink-0" />
            <span className="hidden lg:block">Settings</span>
          </Link>
        </div>
      </aside>

      {/* Mobile bottom nav */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 flex border-t border-border bg-card">
        {[...NAV_ITEMS, { href: "/settings", label: "Settings", icon: IconSettings }].map(
          ({ href, label, icon: Icon }) => {
            const active =
              href === "/" ? pathname === "/" : pathname.startsWith(href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-1 flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                  active
                    ? "text-foreground"
                    : "text-muted-foreground",
                )}
              >
                <Icon size={18} />
                {label}
              </Link>
            );
          },
        )}
      </nav>
    </>
  );
}
