import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { MapClient } from "@/components/pages/map-client";

export const dynamic = "force-dynamic";

export default async function MapPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <MapClient />;
}
