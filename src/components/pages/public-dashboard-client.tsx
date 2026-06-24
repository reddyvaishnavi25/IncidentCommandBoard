"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Clock,
  CheckCircle2,
  Shield,
  Activity,
  ChevronDown,
  ChevronRight,
  MapPin,
} from "lucide-react";
import { getPublicDashboardAction } from "@/lib/actions/crisis-actions";
import { formatRelativeTime, severityColor } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

type IncidentStatus = "reported" | "active" | "contained" | "resolved";
type StatusFilter = "all" | IncidentStatus;

const STATUS_BADGE: Record<IncidentStatus, string> = {
  reported: "bg-yellow-500/20 text-yellow-300 border-yellow-500/30",
  active:   "bg-red-500/20 text-red-300 border-red-500/30",
  contained:"bg-blue-500/20 text-blue-300 border-blue-500/30",
  resolved: "bg-emerald-500/20 text-emerald-300 border-emerald-500/30",
};

const TAB_ACTIVE: Record<StatusFilter, string> = {
  all:       "bg-zinc-700 text-zinc-100 border-zinc-500",
  reported:  "bg-yellow-500/10 text-yellow-300 border-yellow-500/50",
  active:    "bg-red-500/10 text-red-300 border-red-500/50",
  contained: "bg-blue-500/10 text-blue-300 border-blue-500/50",
  resolved:  "bg-emerald-500/10 text-emerald-300 border-emerald-500/50",
};

const TABS: { value: StatusFilter; label: string }[] = [
  { value: "all",       label: "All" },
  { value: "reported",  label: "Reported" },
  { value: "active",    label: "Active" },
  { value: "contained", label: "Contained" },
  { value: "resolved",  label: "Resolved" },
];

const SHOWN_EVENT_TYPES = new Set([
  "status_change",
  "resource_assigned",
  "resource_released",
  "incident_created",
  "update_added",
  "sla_breach",
]);

const EVENT_DOT: Record<string, string> = {
  status_change:     "bg-cyan-500",
  resource_assigned: "bg-green-500",
  resource_released: "bg-orange-400",
  incident_created:  "bg-zinc-400",
  update_added:      "bg-zinc-500",
  sla_breach:        "bg-red-500",
};

export function PublicDashboardClient() {
  const queryClient = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["public-dashboard"],
    queryFn: getPublicDashboardAction,
    refetchInterval: 5000,
  });

  useEffect(() => {
    const es = new EventSource("/api/events");
    es.onmessage = (e) => {
      try {
        const msg = JSON.parse(e.data);
        if (msg.type !== "heartbeat") {
          queryClient.invalidateQueries({ queryKey: ["public-dashboard"] });
        }
      } catch {}
    };
    return () => es.close();
  }, [queryClient]);

  const allIncidents = data?.incidents ?? [];
  const events = data?.events ?? [];

  const countFor = (s: StatusFilter) =>
    s === "all" ? allIncidents.length : allIncidents.filter((i) => i.status === s).length;

  const filtered =
    statusFilter === "all"
      ? allIncidents
      : allIncidents.filter((i) => i.status === statusFilter);

  function toggle(id: string) {
    setExpandedId((prev) => (prev === id ? null : id));
  }

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100">
      {/* Header */}
      <header className="border-b border-zinc-800 bg-zinc-900/70 backdrop-blur sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-2 w-2 rounded-full bg-red-500 animate-pulse" />
            <span className="font-bold text-lg tracking-tight">Crisis Twin</span>
            <span className="text-zinc-500 text-sm hidden sm:inline">Live Incident Status</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <Activity className="h-3 w-3 text-cyan-500" />
            <span className="hidden sm:inline">Aurora DSQL + Vercel</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-6 space-y-4">
        {/* Status filter tabs */}
        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setExpandedId(null);
              }}
              className={`px-3 py-1.5 text-sm rounded-md border transition-colors ${
                statusFilter === tab.value
                  ? TAB_ACTIVE[tab.value]
                  : "border-zinc-700 text-zinc-400 hover:text-zinc-200 hover:border-zinc-500"
              }`}
            >
              {tab.label}
              <span className="ml-1.5 text-xs opacity-60">({countFor(tab.value)})</span>
            </button>
          ))}
        </div>

        {/* Incident list */}
        {isLoading ? (
          <p className="text-zinc-500 text-sm py-8 text-center">Loading incidents…</p>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-zinc-700" />
            <p className="mt-3 text-zinc-400">
              {allIncidents.length === 0 ? "No incidents at this time" : "No incidents match this filter"}
            </p>
          </div>
        ) : (
          <div className="rounded-lg border border-zinc-800 overflow-hidden divide-y divide-zinc-800">
            {filtered.map((inc) => {
              const isOpen = expandedId === inc.id;
              const incEvents = events
                .filter((e) => e.incidentId === inc.id && SHOWN_EVENT_TYPES.has(e.eventType))
                .slice(0, 20);

              return (
                <div key={inc.id}>
                  {/* Row — click to expand */}
                  <button
                    className="w-full text-left px-5 py-4 hover:bg-zinc-900/60 transition-colors flex items-center gap-4"
                    onClick={() => toggle(inc.id)}
                  >
                    {/* Expand icon */}
                    <span className="text-zinc-600 flex-shrink-0">
                      {isOpen ? (
                        <ChevronDown className="h-4 w-4 text-zinc-400" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </span>

                    {/* Title + location */}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-zinc-100 truncate">{inc.title}</p>
                      <div className="flex items-center gap-1 mt-0.5 text-xs text-zinc-500">
                        <MapPin className="h-3 w-3 flex-shrink-0" />
                        <span className="truncate">{inc.location}</span>
                        <span className="text-zinc-700">·</span>
                        <span className="font-mono flex-shrink-0">{inc.incidentNumber}</span>
                      </div>
                    </div>

                    {/* Badges + time */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        className={
                          STATUS_BADGE[inc.status as IncidentStatus] ??
                          "bg-zinc-700 text-zinc-300"
                        }
                      >
                        {inc.status}
                      </Badge>
                      <Badge className={`${severityColor(inc.severity)} hidden sm:inline-flex`}>
                        {inc.severity}
                      </Badge>
                      <span className="text-xs text-zinc-600 hidden md:inline">
                        {formatRelativeTime(inc.updatedAt)}
                      </span>
                    </div>
                  </button>

                  {/* Expandable timeline */}
                  {isOpen && (
                    <div className="bg-zinc-900/40 px-5 py-4 border-t border-zinc-800">
                      {/* Quick stats */}
                      {(inc.casualties > 0 || inc.injuries > 0 || inc.fatalities > 0) && (
                        <div className="flex gap-4 text-xs mb-4">
                          {inc.casualties > 0 && (
                            <span className="text-orange-400">{inc.casualties} casualties</span>
                          )}
                          {inc.injuries > 0 && (
                            <span className="text-yellow-400">{inc.injuries} injuries</span>
                          )}
                          {inc.fatalities > 0 && (
                            <span className="text-red-400">{inc.fatalities} fatalities</span>
                          )}
                        </div>
                      )}

                      {/* Timeline */}
                      {incEvents.length === 0 ? (
                        <p className="text-xs text-zinc-600">No activity recorded yet.</p>
                      ) : (
                        <ol className="relative border-l border-zinc-700 space-y-4 pl-5">
                          {incEvents.map((ev) => (
                            <li key={ev.id} className="relative">
                              <span
                                className={`absolute -left-[1.35rem] top-1.5 h-2.5 w-2.5 rounded-full border-2 border-zinc-900 ${
                                  EVENT_DOT[ev.eventType] ?? "bg-zinc-600"
                                }`}
                              />
                              <p className="text-sm text-zinc-200">{ev.title}</p>
                              {ev.description && (
                                <p className="text-xs text-zinc-500 mt-0.5">{ev.description}</p>
                              )}
                              <p className="text-xs text-zinc-600 mt-0.5">
                                {formatRelativeTime(ev.createdAt)}
                              </p>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        <p className="text-center text-xs text-zinc-700 pb-4">
          Updates every 5 s · Aurora DSQL · Vercel
        </p>
      </main>
    </div>
  );
}
