import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { IncidentDetailClient } from "@/components/pages/incident-detail-client";

export const dynamic = "force-dynamic";

export default async function IncidentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { id } = await params;
  return <IncidentDetailClient user={session} incidentId={id} />;
}
