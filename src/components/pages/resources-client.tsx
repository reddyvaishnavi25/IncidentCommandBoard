"use client";

import { useQuery } from "@tanstack/react-query";
import { Truck, Filter } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConsistencyMonitor } from "@/components/consistency-monitor";
import { getResourcesAction } from "@/lib/actions/crisis-actions";
import { statusColor } from "@/lib/utils";

const statusFilters = ["all", "available", "assigned", "en_route", "on_scene", "returning"];

export function ResourcesClient() {
  const { data: resources, isLoading } = useQuery({
    queryKey: ["resources"],
    queryFn: getResourcesAction,
    refetchInterval: 3000,
  });

  const stats = {
    total: resources?.length ?? 0,
    available: resources?.filter((r) => r.status === "available").length ?? 0,
    assigned: resources?.filter((r) => r.status === "assigned").length ?? 0,
    enRoute: resources?.filter((r) => r.status === "en_route").length ?? 0,
    onScene: resources?.filter((r) => r.status === "on_scene").length ?? 0,
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">Resource Operations Center</h1>
        <p className="text-sm text-zinc-400">
          Manage ambulances, fire engines, police vehicles, and rescue teams
        </p>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-5">
        {[
          { label: "Total", value: stats.total },
          { label: "Available", value: stats.available, color: "text-emerald-400" },
          { label: "Assigned", value: stats.assigned, color: "text-blue-400" },
          { label: "En Route", value: stats.enRoute, color: "text-cyan-400" },
          { label: "On Scene", value: stats.onScene, color: "text-amber-400" },
        ].map((s) => (
          <Card key={s.label}>
            <CardContent className="p-4 text-center">
              <p className={`font-mono text-2xl font-bold ${s.color ?? "text-zinc-100"}`}>{s.value}</p>
              <p className="text-[10px] uppercase text-zinc-500">{s.label}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Truck className="h-4 w-4" />
                  All Resources
                </CardTitle>
                <Filter className="h-4 w-4 text-zinc-500" />
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <p className="text-zinc-500">Loading...</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2">
                  {resources?.map((r) => (
                    <div
                      key={r.id}
                      className="flex items-center justify-between rounded-md bg-zinc-900/80 px-4 py-3 ring-1 ring-zinc-800"
                    >
                      <div className="flex items-center gap-3">
                        <Truck className={`h-4 w-4 ${statusColor(r.status)}`} />
                        <div>
                          <p className="font-mono text-sm font-bold text-zinc-200">{r.callSign}</p>
                          <p className="text-xs text-zinc-500">
                            {r.type.replace(/_/g, " ")} · {r.agencyName}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={r.status === "available" ? "success" : "secondary"}
                        className="capitalize"
                      >
                        {r.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
        <ConsistencyMonitor />
      </div>
    </div>
  );
}
