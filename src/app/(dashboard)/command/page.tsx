import { getSession } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { CommandCenterClient } from "@/components/pages/command-center-client";

export const dynamic = "force-dynamic";

export default async function CommandPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  return <CommandCenterClient user={session} />;
}
