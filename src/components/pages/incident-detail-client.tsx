"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { ArrowLeft, MapPin, Users, AlertTriangle, X, Edit2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ResourceAssignPanel } from "@/components/resource-assign-panel";
import { LiveCollaboration } from "@/components/live-collaboration";
import { AICommander } from "@/components/ai-commander";
import { ConsistencyMonitor } from "@/components/consistency-monitor";
import {
  getIncidentDetailAction,
  getResourcesAction,
  releaseResourceAction,
  updateIncidentAction,
} from "@/lib/actions/crisis-actions";
import { hasPermission } from "@/lib/permissions";
import { severityColor, formatRelativeTime } from "@/lib/utils";
import { toast } from "sonner";
import type { SessionUser } from "@/lib/auth/types";

const ALL_STATUSES = ["reported", "active", "contained", "resolved"] as const;

const STATUS_BADGE: Record<string, string> = {
  reported: "text-yellow-400 bg-yellow-500/10 border border-yellow-500/30",
  active: "text-red-400 bg-red-500/10 border border-red-500/30",
  contained: "text-blue-400 bg-blue-500/10 border border-blue-500/30",
  resolved: "text-emerald-400 bg-emerald-500/10 border border-emerald-500/30",
};

export function IncidentDetailClient({
  user,
  incidentId,
}: {
  user: SessionUser;
  incidentId: string;
}) {
  const queryClient = useQueryClient();
  const [editingStats, setEditingStats] = useState(false);
  const [statsForm, setStatsForm] = useState({ casualties: 0, injuries: 0, fatalities: 0 });

  const { data, isLoading } = useQuery({
    queryKey: ["incident", incidentId],
    queryFn: () => getIncidentDetailAction(incidentId),
    refetchInterval: 3000,
  });

  const { data: resources } = useQuery({
    queryKey: ["resources"],
    queryFn: getResourcesAction,
    refetchInterval: 5000,
  });

  const releaseMutation = useMutation({
    mutationFn: ({ resourceId }: { resourceId: string; callSign: string }) =>
      releaseResourceAction(resourceId, incidentId),
    onSuccess: (result) => {
      if (result.success) {
        toast.success(result.message);
      } else {
        toast.error(result.message);
      }
      queryClient.invalidateQueries();
    },
  });

  const statusMutation = useMutation({
    mutationFn: (newStatus: string) => updateIncidentAction(incidentId, { status: newStatus }),
    onSuccess: (result) => {
      if (result.success) {
        const s = (result as { incident?: { status?: string } }).incident?.status ?? "";
        toast.success(`Status updated${s ? ` → ${s}` : ""}`);
        queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      } else {
        toast.error(result.message);
      }
    },
  });

  const statsMutation = useMutation({
    mutationFn: () =>
      updateIncidentAction(incidentId, {
        casualties: statsForm.casualties,
        injuries: statsForm.injuries,
        fatalities: statsForm.fatalities,
      }),
    onSuccess: (result) => {
      if (result.success) {
        toast.success("Incident stats updated");
        setEditingStats(false);
        queryClient.invalidateQueries({ queryKey: ["incident", incidentId] });
      } else {
        toast.error(result.message);
      }
    },
  });

  const canEdit = hasPermission(user.role, "edit_incident");
  const canManageIncident = hasPermission(user.role, "manage_incident");
  const canRelease = hasPermission(user.role, "manage_resources");

  if (isLoading || !data) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="animate-pulse text-zinc-500">Loading incident...</div>
      </div>
    );
  }

  const { incident, updates, assignments, timeline, presence } = data;

  return (
    <div className="p-6 space-y-6">
      <header>
        <Link href="/incidents" className="mb-4 inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-300">
          <ArrowLeft className="h-4 w-4" /> Back to incidents
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-zinc-100">{incident.title}</h1>
              <Badge className={severityColor(incident.severity)}>{incident.severity}</Badge>
              {canManageIncident ? (
                <select
                  value={incident.status}
                  disabled={statusMutation.isPending}
                  onChange={(e) => statusMutation.mutate(e.target.value)}
                  className={`rounded px-2 py-0.5 text-xs font-medium outline-none disabled:opacity-50 cursor-pointer ${STATUS_BADGE[incident.status] ?? "border border-zinc-700 bg-zinc-900 text-zinc-300"}`}
                >
                  {ALL_STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              ) : (
                <Badge className={STATUS_BADGE[incident.status] ?? ""}>{incident.status}</Badge>
              )}
            </div>
            <p className="mt-1 font-mono text-sm text-zinc-500">{incident.incidentNumber}</p>
            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-400">
              <MapPin className="h-4 w-4" />
              {incident.location}
            </div>
          </div>

          <div className="flex items-start gap-3">
            <div className="flex gap-4 text-center">
              <div className="rounded-lg bg-zinc-900 px-4 py-2 ring-1 ring-zinc-800">
                {editingStats ? (
                  <input
                    type="number"
                    min="0"
                    value={statsForm.casualties}
                    onChange={(e) =>
                      setStatsForm((f) => ({ ...f, casualties: parseInt(e.target.value) || 0 }))
                    }
                    className="w-16 text-center font-mono text-xl font-bold text-red-400 bg-transparent border-b border-red-400/50 outline-none"
                  />
                ) : (
                  <p className="font-mono text-2xl font-bold text-red-400">{incident.casualties}</p>
                )}
                <p className="text-[10px] uppercase text-zinc-500">Casualties</p>
              </div>
              <div className="rounded-lg bg-zinc-900 px-4 py-2 ring-1 ring-zinc-800">
                {editingStats ? (
                  <input
                    type="number"
                    min="0"
                    value={statsForm.injuries}
                    onChange={(e) =>
                      setStatsForm((f) => ({ ...f, injuries: parseInt(e.target.value) || 0 }))
                    }
                    className="w-16 text-center font-mono text-xl font-bold text-amber-400 bg-transparent border-b border-amber-400/50 outline-none"
                  />
                ) : (
                  <p className="font-mono text-2xl font-bold text-amber-400">{incident.injuries}</p>
                )}
                <p className="text-[10px] uppercase text-zinc-500">Injuries</p>
              </div>
              <div className="rounded-lg bg-zinc-900 px-4 py-2 ring-1 ring-zinc-800">
                {editingStats ? (
                  <input
                    type="number"
                    min="0"
                    value={statsForm.fatalities}
                    onChange={(e) =>
                      setStatsForm((f) => ({ ...f, fatalities: parseInt(e.target.value) || 0 }))
                    }
                    className="w-16 text-center font-mono text-xl font-bold text-zinc-400 bg-transparent border-b border-zinc-400/50 outline-none"
                  />
                ) : (
                  <p className="font-mono text-2xl font-bold text-zinc-400">{incident.fatalities}</p>
                )}
                <p className="text-[10px] uppercase text-zinc-500">Fatalities</p>
              </div>
            </div>

            {canEdit && !editingStats && (
              <Button
                size="sm"
                variant="ghost"
                className="h-8 w-8 p-0 text-zinc-600 hover:text-zinc-300 mt-1"
                title="Edit casualty numbers"
                onClick={() => {
                  setStatsForm({
                    casualties: incident.casualties ?? 0,
                    injuries: incident.injuries ?? 0,
                    fatalities: incident.fatalities ?? 0,
                  });
                  setEditingStats(true);
                }}
              >
                <Edit2 className="h-3.5 w-3.5" />
              </Button>
            )}
            {editingStats && (
              <div className="flex flex-col gap-1 mt-1">
                <Button
                  size="sm"
                  className="h-7 text-xs"
                  disabled={statsMutation.isPending}
                  onClick={() => statsMutation.mutate()}
                >
                  Save
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-7 text-xs text-zinc-500"
                  onClick={() => setEditingStats(false)}
                >
                  Cancel
                </Button>
              </div>
            )}
          </div>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Live Activity Feed</CardTitle>
            </CardHeader>
            <CardContent>
              <LiveCollaboration
                incidentId={incidentId}
                presence={presence}
                currentUserId={user.id}
              />
              <div className="mt-4 space-y-3 max-h-80 overflow-y-auto">
                {updates.map((u) => (
                  <div key={u.id} className="rounded-md bg-zinc-900/80 p-3 ring-1 ring-zinc-800">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-xs font-medium text-zinc-300">
                        {u.userName} · {u.agencyName}
                      </span>
                      <span className="text-[10px] text-zinc-600">
                        {formatRelativeTime(u.createdAt)}
                      </span>
                    </div>
                    <p className="text-sm text-zinc-200">{u.content}</p>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" />
                Resources Assigned
              </CardTitle>
            </CardHeader>
            <CardContent>
              {assignments.length === 0 ? (
                <p className="text-sm text-zinc-500">No resources assigned yet</p>
              ) : (
                <div className="space-y-2">
                  {assignments.map((a) => (
                    <div
                      key={a.id}
                      className="flex items-center justify-between rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800"
                    >
                      <div>
                        <p className="font-mono text-sm font-medium text-zinc-200">{a.callSign}</p>
                        <p className="text-xs text-zinc-500">{a.name} · {a.type.replace("_", " ")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <Badge variant="secondary">{a.status}</Badge>
                          <p className="text-[10px] text-zinc-600 mt-1">by {a.assignedByName}</p>
                        </div>
                        {canRelease && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-zinc-500 hover:text-red-400 hover:bg-red-500/10"
                            disabled={releaseMutation.isPending}
                            onClick={() => releaseMutation.mutate({ resourceId: a.resourceId, callSign: a.callSign })}
                            title={`Release ${a.callSign}`}
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-4 space-y-4">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />
                {timeline.map((e) => (
                  <div key={e.id} className="relative flex gap-4">
                    <div className={`absolute -left-4 top-1.5 h-2 w-2 rounded-full ring-2 ring-zinc-950 ${
                      e.eventType === "conflict_prevented"
                        ? "bg-red-500"
                        : e.eventType === "status_change"
                        ? "bg-purple-500"
                        : e.eventType === "resource_released"
                        ? "bg-amber-500"
                        : "bg-cyan-500"
                    }`} />
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{e.title}</p>
                      {e.description && <p className="text-xs text-zinc-500">{e.description}</p>}
                      <p className="text-[10px] text-zinc-600">{formatRelativeTime(e.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card className="border-amber-500/20">
            <CardHeader>
              <CardTitle className="text-amber-400">
                <AlertTriangle className="inline h-4 w-4 mr-1" />
                Resource Assignment
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="mb-4 text-xs text-zinc-500">
                Demo: Two dispatchers assign the same unit simultaneously. Aurora DSQL ensures only one succeeds.
              </p>
              <ResourceAssignPanel
                resources={resources ?? []}
                incidentId={incidentId}
                canAssign={hasPermission(user.role, "assign_resources")}
              />
            </CardContent>
          </Card>

          <AICommander incidentId={incidentId} />
          <ConsistencyMonitor />
        </div>
      </div>
    </div>
  );
}
