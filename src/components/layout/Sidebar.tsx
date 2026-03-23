"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Coffee, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItemsForRole } from "@/config/nav";
import type { UserRole } from "@/types";

interface SidebarProps {
  role: UserRole;
  open?: boolean;
  onClose?: () => void;
}

export default function Sidebar({ role, open = false, onClose }: SidebarProps) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(role);

  return (
    <>
      {/* Desktop sidebar — always visible on lg+ */}
      <aside className="hidden lg:flex w-60 flex-shrink-0 bg-primary flex-col h-screen sticky top-0">
        <SidebarContent pathname={pathname} navItems={navItems} />
      </aside>

      {/* Mobile drawer — slides in from left */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 w-72 bg-primary flex flex-col h-screen transition-transform duration-300 ease-in-out lg:hidden",
          open ? "translate-x-0" : "-translate-x-full"
        )}
      >
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white/60 hover:text-white transition-colors"
          aria-label="Close menu"
        >
          <X className="w-5 h-5" />
        </button>
        <SidebarContent pathname={pathname} navItems={navItems} />
      </aside>
    </>
  );
}

function SidebarContent({
  pathname,
  navItems,
}: {
  pathname: string;
  navItems: { href: string; label: string; icon: React.ElementType }[];
}) {
  return (
    <>
      {/* Logo */}
      <div className="px-5 py-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
            <Coffee className="w-5 h-5 text-white" />
          </div>
          <div className="min-w-0">
            <p className="text-white font-bold text-sm leading-tight truncate">Victory Coffee</p>
            <p className="text-primary-40 text-xs leading-tight">Factory System</p>
          </div>
        </div>
      </div>

      {/* Nav items */}
      <nav className="flex-1 overflow-y-auto py-4 px-3">
        <ul className="space-y-0.5">
          {navItems.map((item) => {
            const isActive =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href);
            const Icon = item.icon;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all",
                    isActive
                      ? "bg-white text-primary shadow-sm"
                      : "text-primary-20 hover:bg-white/10 hover:text-white"
                  )}
                >
                  <Icon
                    className={cn(
                      "w-4 h-4 flex-shrink-0",
                      isActive ? "text-primary" : "text-primary-40"
                    )}
                  />
                  <span className="truncate">{item.label}</span>
                  {isActive && (
                    <span className="ml-auto w-1.5 h-1.5 rounded-full bg-secondary flex-shrink-0" />
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Bottom version tag */}
      <div className="px-5 py-3 border-t border-white/10">
        <p className="text-primary-60 text-xs">v1.0.0 — Lwengo</p>
      </div>
    </>
  );
}
