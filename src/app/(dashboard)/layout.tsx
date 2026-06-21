import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { RealtimeProvider } from "@/hooks/use-realtime";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session) redirect("/login");

  return (
    <div className="flex h-screen overflow-hidden grid-bg">
      <Sidebar user={session} />
      <main className="flex-1 overflow-y-auto">
        <RealtimeProvider>{children}</RealtimeProvider>
      </main>
    </div>
  );
}
