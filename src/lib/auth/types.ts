import type { UserRole } from "@/lib/permissions";

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  agencyId: string;
  agencyName: string;
  agencyType: string;
}
