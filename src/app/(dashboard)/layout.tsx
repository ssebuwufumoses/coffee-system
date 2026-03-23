import { headers } from "next/headers";
import { redirect } from "next/navigation";
import DashboardShell from "@/components/layout/DashboardShell";
import type { UserRole } from "@/types";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const headersList = await headers();
  const role = headersList.get("x-user-role") as UserRole | null;
  const name = headersList.get("x-user-name") ?? "";
  const userId = headersList.get("x-user-id") ?? "";

  if (!role) redirect("/login");

  return (
    <DashboardShell name={name} role={role} userId={userId}>
      {children}
    </DashboardShell>
  );
}
