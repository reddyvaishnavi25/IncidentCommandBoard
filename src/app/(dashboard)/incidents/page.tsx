import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { IncidentsListClient } from "@/components/pages/incidents-list-client";

export const dynamic = "force-dynamic";

export default async function IncidentsPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <IncidentsListClient user={session} />;
}
