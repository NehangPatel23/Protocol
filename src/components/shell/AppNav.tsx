"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Calendar,
  Dumbbell,
  Home,
  Settings,
  TrendingUp,
  type LucideIcon,
} from "lucide-react";

const TABS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: Home },
  { href: "/program", label: "Program", icon: Dumbbell },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/history", label: "History", icon: Calendar },
  { href: "/settings", label: "Settings", icon: Settings },
];

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-border-subtle bg-surface md:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      aria-label="Main"
    >
      <ul className="mx-auto flex h-14 max-w-lg items-stretch justify-around px-1">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <li key={href} className="flex flex-1">
              <Link
                href={href}
                className={`flex min-h-11 flex-1 flex-col items-center justify-center gap-0.5 text-[11px] font-medium transition-colors duration-150 ${
                  active ? "text-accent" : "text-muted"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <Icon
                  className="h-5 w-5"
                  strokeWidth={active ? 2.25 : 1.75}
                  aria-hidden
                />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-56 shrink-0 border-r border-border-subtle bg-surface md:flex md:flex-col">
      <div className="flex items-center gap-3 px-5 pb-2 pt-6">
        <span className="relative inline-flex h-7 w-7 shrink-0 overflow-hidden rounded-md ring-1 ring-accent/50">
          <Image
            src="/icons/icon-p-192.png"
            alt=""
            width={28}
            height={28}
            className="h-full w-full object-cover"
            priority
          />
        </span>
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-accent">
            Protocol
          </p>
          <p className="mt-0.5 text-xs text-secondary">Know today&apos;s work.</p>
        </div>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4" aria-label="Main">
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={`flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium transition-colors duration-150 ${
                active
                  ? "bg-surface-raised text-accent"
                  : "text-secondary hover:bg-surface-raised/60 hover:text-primary"
              }`}
              aria-current={active ? "page" : undefined}
            >
              <Icon
                className="h-5 w-5 shrink-0"
                strokeWidth={active ? 2.25 : 1.75}
              />
              {label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
