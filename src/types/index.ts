export type UserRole = "ADMIN" | "OPERATOR" | "STORE_MANAGER" | "SALES_FINANCE";

export type SessionPayload = {
  userId: string;
  email: string;
  name: string;
  role: UserRole;
};

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Administrator",
  OPERATOR: "Intake Operator",
  STORE_MANAGER: "Store / Production Manager",
  SALES_FINANCE: "Sales & Finance Officer",
};
