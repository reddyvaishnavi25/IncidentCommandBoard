"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Database,
  ShieldCheck,
  AlertOctagon,
  CheckCircle2,
  XCircle,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getConsistencyMetricsAction, getConflictLogsAction } from "@/lib/actions/crisis-actions";
import { formatRelativeTime } from "@/lib/utils";

export function ConsistencyMonitor() {
  const { data: metrics } = useQuery({
    queryKey: ["consistency"],
    queryFn: getConsistencyMetricsAction,
    refetchInterval: 3000,
  });

  const { data: conflicts } = useQuery({
    queryKey: ["conflicts"],
    queryFn: getConflictLogsAction,
    refetchInterval: 5000,
  });

  const score = parseFloat(metrics?.consistencyScore ?? "100");

  return (
    <Card className="border-cyan-500/20 bg-gradient-to-br from-zinc-950 to-cyan-950/20">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-cyan-400">
            <Database className="h-4 w-4" />
            Aurora DSQL Consistency Monitor
          </CardTitle>
          <Badge variant={score >= 99 ? "success" : "warning"}>
            {score >= 99 ? "100% Consistent" : `${score.toFixed(1)}%`}
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 px-3 py-2 ring-1 ring-emerald-500/20">
          <ShieldCheck className="h-4 w-4 text-emerald-400" />
          <span className="text-xs font-medium text-emerald-400">
            100% Consistent Operational State
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: "Transactions", value: metrics?.transactionsProcessed ?? 0, icon: Activity },
            { label: "Conflicts Prevented", value: metrics?.conflictsPrevented ?? 0, icon: ShieldCheck },
            { label: "Duplicates Blocked", value: metrics?.duplicateAssignmentsPrevented ?? 0, icon: XCircle },
            { label: "Lost Updates", value: metrics?.lostUpdates ?? 0, icon: AlertOctagon },
            { label: "Rejected Txns", value: metrics?.rejectedTransactions ?? 0, icon: XCircle },
            { label: "Consistency Score", value: `${score.toFixed(1)}%`, icon: CheckCircle2 },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-md bg-zinc-900/80 p-3 ring-1 ring-zinc-800"
            >
              <div className="flex items-center gap-1.5 text-zinc-500">
                <stat.icon className="h-3 w-3" />
                <span className="text-[10px] uppercase tracking-wider">{stat.label}</span>
              </div>
              <p className="mt-1 font-mono text-lg font-bold text-zinc-100">{stat.value}</p>
            </motion.div>
          ))}
        </div>

        {conflicts && conflicts.length > 0 && (
          <div className="space-y-2">
            <p className="text-[10px] uppercase tracking-wider text-zinc-500">Recent Conflicts</p>
            <div className="max-h-32 space-y-1 overflow-y-auto">
              {conflicts.slice(0, 5).map((c) => (
                <div
                  key={c.id}
                  className="rounded bg-red-500/5 px-2 py-1.5 text-xs text-red-300 ring-1 ring-red-500/10"
                >
                  <span className="font-mono text-red-400">{c.resourceCallSign}</span>
                  {" · "}
                  {c.attemptedByName} · {formatRelativeTime(c.resolvedAt)}
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
