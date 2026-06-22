import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { requireDb, users, agencies } from "@/lib/db";
import type { UserRole } from "@/lib/permissions";
import type { SessionUser } from "@/lib/auth/types";

export const SESSION_COOKIE = "crisis_twin_session";

export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value;
  if (!sessionId) return null;

  try {
    const db = await requireDb();
    const [user] = await db
      .select({
        id: users.id,
        email: users.email,
        name: users.name,
        role: users.role,
        agencyId: users.agencyId,
        agencyName: agencies.name,
        agencyType: agencies.type,
      })
      .from(users)
      .innerJoin(agencies, eq(users.agencyId, agencies.id))
      .where(eq(users.id, sessionId))
      .limit(1);

    if (!user) return null;
    return { ...user, role: user.role as UserRole };
  } catch {
    return null;
  }
}

export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new Error("Unauthorized");
  }
  return session;
}

export async function setSession(userId: string) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, userId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
    path: "/",
  });
}

export async function clearSession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE);
}
