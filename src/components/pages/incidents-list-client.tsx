"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CreateIncidentDialog } from "@/components/create-incident-dialog";
import { getCommandCenterDataAction } from "@/lib/actions/crisis-actions";
import { hasPermission } from "@/lib/permissions";
import { severityColor, formatRelativeTime } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/types";

export function IncidentsListClient({ user }: { user: SessionUser }) {
  const { data } = useQuery({
    queryKey: ["incidents"],
    queryFn: getCommandCenterDataAction,
    refetchInterval: 5000,
  });

  const allIncidents = data?.activeIncidents ?? [];

  return (
    <div className="p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-100">Incident Workspace</h1>
          <p className="text-sm text-zinc-400">All active and recent incidents</p>
        </div>
        <CreateIncidentDialog canCreate={hasPermission(user.role, "create_incident")} />
      </header>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {allIncidents.map((inc) => (
          <Link key={inc.id} href={`/incidents/${inc.id}`}>
            <Card className="transition-all hover:ring-1 hover:ring-cyan-500/30 h-full">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <AlertTriangle className="h-5 w-5 text-red-400" />
                  <Badge className={severityColor(inc.severity)}>{inc.severity}</Badge>
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

      {allIncidents.length === 0 && (
        <Card>
          <CardContent className="py-16 text-center">
            <AlertTriangle className="mx-auto h-12 w-12 text-zinc-700" />
            <p className="mt-4 text-zinc-400">No active incidents</p>
            <p className="text-sm text-zinc-600">Create &quot;Chemical Plant Explosion&quot; to start the demo</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
