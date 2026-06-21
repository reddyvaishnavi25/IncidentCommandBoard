import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ResourcesClient } from "@/components/pages/resources-client";

export const dynamic = "force-dynamic";

export default async function ResourcesPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ResourcesClient />;
}
