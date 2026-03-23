"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { LogOut, User, ChevronDown, Menu } from "lucide-react";
import { ROLE_LABELS, type UserRole } from "@/types";

interface TopbarProps {
  name: string;
  role: UserRole;
  userId: string;
  onMenuClick: () => void;
}

export default function Topbar({ name, role, userId, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  async function handleLogout() {
    setLoggingOut(true);
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  const initials = name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <header className="h-14 bg-white border-b border-surface-secondary flex items-center justify-between px-4 sm:px-6 flex-shrink-0">
      {/* Left — hamburger on mobile */}
      <button
        onClick={onMenuClick}
        className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-surface-primary transition-colors"
        aria-label="Open menu"
      >
        <Menu className="w-5 h-5" />
      </button>
      <div className="hidden lg:block" />

      {/* Right — user menu */}
      <div className="relative">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2.5 rounded-lg px-3 py-1.5 hover:bg-surface-primary transition-colors"
        >
          <div className="w-7 h-7 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
            <span className="text-white text-xs font-bold">{initials}</span>
          </div>

          <div className="text-left hidden sm:block">
            <p className="text-sm font-medium text-deepest leading-tight">{name}</p>
            <p className="text-xs text-gray-400 leading-tight">{ROLE_LABELS[role]}</p>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
          />
        </button>

        {/* Dropdown */}
        {open && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
            <div className="absolute right-0 top-full mt-1 w-56 bg-white rounded-xl shadow-lg border border-surface-secondary z-20 overflow-hidden">
              <div className="px-4 py-3 border-b border-surface-secondary">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center flex-shrink-0">
                    <span className="text-white text-xs font-bold">{initials}</span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-deepest truncate">{name}</p>
                    <p className="text-xs text-gray-400">{ROLE_LABELS[role]}</p>
                  </div>
                </div>
              </div>

              <div className="py-1">
                <Link
                  href={`/users/${userId}`}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-gray-600 hover:bg-surface-primary transition-colors"
                  onClick={() => setOpen(false)}
                >
                  <User className="w-4 h-4" />
                  My Profile
                </Link>
              </div>

              <div className="py-1 border-t border-surface-secondary">
                <button
                  onClick={handleLogout}
                  disabled={loggingOut}
                  className="w-full flex items-center gap-3 px-4 py-2 text-sm text-warning hover:bg-warning/5 transition-colors disabled:opacity-50"
                >
                  <LogOut className="w-4 h-4" />
                  {loggingOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </header>
  );
}
