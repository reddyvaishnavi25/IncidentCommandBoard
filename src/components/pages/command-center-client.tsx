"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  AlertTriangle,
  Activity,
  Users,
  Truck,
  Clock,
} from "lucide-react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ConsistencyMonitor } from "@/components/consistency-monitor";
import { SimulationButton } from "@/components/simulation-button";
import { CountyMap } from "@/components/county-map";
import { CreateIncidentDialog } from "@/components/create-incident-dialog";
import { getCommandCenterDataAction, getMapDataAction } from "@/lib/actions/crisis-actions";
import { getRoleDashboardConfig, hasPermission } from "@/lib/permissions";
import { severityColor, formatRelativeTime } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/types";

export function CommandCenterClient({ user }: { user: SessionUser }) {
  const roleConfig = getRoleDashboardConfig(user.role);

  const { data } = useQuery({
    queryKey: ["command-center"],
    queryFn: getCommandCenterDataAction,
    refetchInterval: 5000,
  });

  const { data: mapData } = useQuery({
    queryKey: ["map"],
    queryFn: getMapDataAction,
    refetchInterval: 10000,
  });

  const chartData =
    data?.recentTimeline.slice(0, 12).reverse().map((e, i) => ({
      time: `${i * 5}m`,
      events: i + 1 + Math.floor(Math.random() * 3),
    })) ?? [];

  return (
    <div className="p-6 space-y-6">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <motion.h1
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="text-2xl font-bold text-zinc-100"
          >
            Global Command Center
          </motion.h1>
          <p className="text-sm text-zinc-400">
            {roleConfig.title} · {roleConfig.subtitle}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {roleConfig.focus.map((f) => (
              <Badge key={f} variant="outline">
                {f}
              </Badge>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <CreateIncidentDialog canCreate={hasPermission(user.role, "create_incident")} />
          <Badge variant="success" className="animate-pulse-glow">
            LIVE
          </Badge>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        {[
          {
            label: "Active Incidents",
            value: data?.activeIncidents.length ?? 0,
            icon: AlertTriangle,
            color: "text-red-400",
          },
          {
            label: "Available Resources",
            value: data?.resourceStats.available ?? 0,
            icon: Truck,
            color: "text-emerald-400",
          },
          {
            label: "Units On Scene",
            value: data?.resourceStats.onScene ?? 0,
            icon: Users,
            color: "text-amber-400",
          },
          {
            label: "En Route",
            value: data?.resourceStats.enRoute ?? 0,
            icon: Activity,
            color: "text-cyan-400",
          },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <Card>
              <CardContent className="flex items-center gap-4 p-4">
                <stat.icon className={`h-8 w-8 ${stat.color}`} />
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">{stat.label}</p>
                  <p className="font-mono text-3xl font-bold text-zinc-100">{stat.value}</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {mapData && (
            <Card>
              <CardHeader>
                <CardTitle>County Operations Map</CardTitle>
              </CardHeader>
              <CardContent>
                <CountyMap data={mapData} compact />
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader>
              <CardTitle>Active Incidents</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {data?.activeIncidents.slice(0, 8).map((inc) => (
                  <Link
                    key={inc.id}
                    href={`/incidents/${inc.id}`}
                    className="flex items-center justify-between rounded-md bg-zinc-900/50 px-4 py-3 transition-colors hover:bg-zinc-800/50 ring-1 ring-zinc-800"
                  >
                    <div>
                      <p className="font-medium text-zinc-200">{inc.title}</p>
                      <p className="text-xs text-zinc-500">
                        {inc.incidentNumber} · {inc.location}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge className={severityColor(inc.severity)}>{inc.severity}</Badge>
                      <span className="text-xs text-zinc-500">
                        {formatRelativeTime(inc.updatedAt)}
                      </span>
                    </div>
                  </Link>
                ))}
                {(data?.activeIncidents.length ?? 0) === 0 && (
                  <p className="py-8 text-center text-sm text-zinc-500">
                    No active incidents. Create one to begin the demo.
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <ConsistencyMonitor />

          <Card>
            <CardHeader>
              <CardTitle>Agency Status</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {data?.agencies.map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between rounded-md bg-zinc-900/50 px-3 py-2 ring-1 ring-zinc-800"
                >
                  <span className="text-sm text-zinc-300">{a.name}</span>
                  <Badge variant="success">Operational</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                Activity Volume
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={120}>
                <AreaChart data={chartData}>
                  <defs>
                    <linearGradient id="activityGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#0891b2" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#0891b2" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="time" tick={{ fill: "#71717a", fontSize: 10 }} axisLine={false} />
                  <YAxis hide />
                  <Tooltip
                    contentStyle={{ background: "#18181b", border: "1px solid #27272a", borderRadius: 8 }}
                  />
                  <Area type="monotone" dataKey="events" stroke="#0891b2" fill="url(#activityGrad)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          <SimulationButton role={user.role} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Emergency Timeline</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative space-y-0 pl-4">
            <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />
            {data?.recentTimeline.slice(0, 15).map((event) => (
              <div key={event.id} className="relative flex gap-4 pb-4">
                <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-cyan-500 ring-2 ring-zinc-950" />
                <div>
                  <p className="text-sm font-medium text-zinc-200">{event.title}</p>
                  {event.description && (
                    <p className="text-xs text-zinc-500">{event.description}</p>
                  )}
                  <p className="text-[10px] text-zinc-600">{formatRelativeTime(event.createdAt)}</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
