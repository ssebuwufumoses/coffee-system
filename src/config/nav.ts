import {
  LayoutDashboard,
  Users,
  Truck,
  Factory,
  Package,
  ShoppingCart,
  BarChart3,
  Settings,
  Leaf,
} from "lucide-react";
import type { UserRole } from "@/types";
import type { LucideIcon } from "lucide-react";

export type NavItem = {
  label: string;
  href: string;
  icon: LucideIcon;
  roles: UserRole[];
  children?: Omit<NavItem, "children" | "icon">[];
};

export const NAV_ITEMS: NavItem[] = [
  {
    label: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "OPERATOR", "STORE_MANAGER", "SALES_FINANCE"],
  },
  {
    label: "Farmers",
    href: "/farmers",
    icon: Users,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    label: "Intake & Deliveries",
    href: "/intake",
    icon: Truck,
    roles: ["ADMIN", "OPERATOR"],
  },
  {
    label: "Husk Issuances",
    href: "/husks",
    icon: Leaf,
    roles: ["ADMIN", "STORE_MANAGER"],
  },
  {
    label: "Milling & Processing",
    href: "/milling",
    icon: Factory,
    roles: ["ADMIN", "STORE_MANAGER"],
  },
  {
    label: "Inventory",
    href: "/inventory",
    icon: Package,
    roles: ["ADMIN", "STORE_MANAGER"],
  },
  {
    label: "Sales",
    href: "/sales",
    icon: ShoppingCart,
    roles: ["ADMIN", "SALES_FINANCE"],
  },
  {
    label: "Reports",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "STORE_MANAGER", "SALES_FINANCE"],
  },
  {
    label: "Settings",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN"],
  },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  return NAV_ITEMS.filter((item) => item.roles.includes(role));
}
