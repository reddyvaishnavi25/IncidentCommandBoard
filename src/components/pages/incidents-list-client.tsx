"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateIncidentDialog } from "@/components/create-incident-dialog";
import { getIncidentsListAction } from "@/lib/actions/crisis-actions";
import { hasPermission } from "@/lib/permissions";
import { severityColor, formatRelativeTime } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/types";

const ALL_STATUSES = ["reported", "active", "contained", "resolved"] as const;
type IncidentStatus = (typeof ALL_STATUSES)[number];

const STATUS_BADGE: Record<IncidentStatus, string> = {
  reported: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  active: "bg-red-500/20 text-red-300 border-red-500/30",
  contained: "bg-blue-500/20 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const TAB_ACTIVE: Record<IncidentStatus | "all", string> = {
  all: "border-zinc-300 text-zinc-100",
  reported: "border-yellow-400 text-yellow-300",
  active: "border-red-400 text-red-300",
  contained: "border-blue-400 text-blue-300",
  resolved: "border-emerald-400 text-emerald-300",
};

type StatusFilter = "all" | IncidentStatus;

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "reported", label: "Reported" },
  { value: "active", label: "Active" },
  { value: "contained", label: "Contained" },
  { value: "resolved", label: "Resolved" },
];

export function IncidentsListClient({ user }: { user: SessionUser }) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");

  const { data } = useQuery({
    queryKey: ["incidents-list"],
    queryFn: getIncidentsListAction,
    refetchInterval: 5000,
  });

  const all = data?.incidents ?? [];
  const filtered = statusFilter === "all" ? all : all.filter((i) => i.status === statusFilter);

  const countFor = (s: StatusFilter) =>
    s === "all" ? all.length : all.filter((i) => i.status === s).length;

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Incident Workspace</h1>
          <p className="text-sm text-zinc-400">All incidents</p>
        </div>
        <CreateIncidentDialog canCreate={hasPermission(user.role, "create_incident")} />
      </header>

      <div className="flex gap-2 flex-wrap">
        {TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setStatusFilter(tab.value)}
            className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
              statusFilter === tab.value
                ? `${TAB_ACTIVE[tab.value]} bg-zinc-800 border`
                : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
            }`}
          >
            {tab.label}
            <span className="ml-1.5 text-xs opacity-70">({countFor(tab.value)})</span>
          </button>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {filtered.map((inc) => (
          <Link key={inc.id} href={`/incidents/${inc.id}`}>
            <Card className="transition-all hover:ring-1 hover:ring-cyan-500/30 h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <div className="flex gap-2">
                    <Badge
                      className={
                        STATUS_BADGE[inc.status as IncidentStatus] ??
                        "bg-zinc-700 text-zinc-300"
                      }
                    >
                      {inc.status}
                    </Badge>
                    <Badge className={severityColor(inc.severity)}>{inc.severity}</Badge>
                  </div>
                </div>
                <CardTitle className="normal-case tracking-normal text-base text-zinc-100 mt-2">
                  {inc.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-xs text-zinc-500 font-mono">{inc.incidentNumber}</p>
                <p className="text-sm text-zinc-400 mt-1">{inc.location}</p>
                <div className="mt-3 flex gap-4 text-xs text-zinc-500">
                  <span>{inc.casualties} casualties</span>
                  <span>{inc.injuries} injuries</span>
                  <span>{formatRelativeTime(inc.updatedAt)}</span>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {filtered.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">
              {all.length === 0 ? "No incidents" : "No incidents match this filter"}
            </p>
            {all.length === 0 && (
              <p className="text-sm text-zinc-600">
                Create &quot;Chemical Plant Explosion&quot; to start the demo
              </p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
