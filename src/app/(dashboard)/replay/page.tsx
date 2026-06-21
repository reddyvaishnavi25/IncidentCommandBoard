import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { ReplayClient } from "@/components/pages/replay-client";

export const dynamic = "force-dynamic";

export default async function ReplayPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <ReplayClient />;
}
