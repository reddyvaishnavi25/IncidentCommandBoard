import { PublicDashboardClient } from "@/components/pages/public-dashboard-client";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Live Incident Status — Crisis Twin",
  description: "Real-time public view of all active incidents powered by Aurora DSQL",
};

export default function StatusPage() {
  return <PublicDashboardClient />;
}
