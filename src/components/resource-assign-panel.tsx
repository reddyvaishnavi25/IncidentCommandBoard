"use client";

import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import { Truck, AlertCircle, CheckCircle2, Swords } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  assignResourceAction,
  simulateAssignmentRaceAction,
  type RaceSimulationResult,
} from "@/lib/actions/crisis-actions";
import { statusColor } from "@/lib/utils";
import { toast } from "sonner";

interface ResourceItem {
  id: string;
  callSign: string;
  name: string;
  type: string;
  status: string;
  agencyName: string;
}

export function ResourceAssignPanel({
  resources,
  incidentId,
  canAssign,
}: {
  resources: ResourceItem[];
  incidentId: string;
  canAssign: boolean;
}) {
  const queryClient = useQueryClient();
  const [lastResult, setLastResult] = React.useState<{
    success: boolean;
    message: string;
    callSign?: string;
  } | null>(null);

  const mutation = useMutation({
    mutationFn: ({ resourceId }: { resourceId: string; callSign: string }) =>
      assignResourceAction(resourceId, incidentId),
    onSuccess: (data, variables) => {
      setLastResult({ ...data, callSign: variables.callSign });
      if (data.success) {
        toast.success(data.message);
      } else {
        toast.error(data.message, {
          description: "Aurora DSQL transaction rejected duplicate assignment",
          duration: 8000,
        });
      }
      queryClient.invalidateQueries();
    },
  });

  const [raceResult, setRaceResult] = React.useState<RaceSimulationResult | null>(null);

  const raceMutation = useMutation({
    mutationFn: ({ resourceId }: { resourceId: string; callSign: string }) =>
      simulateAssignmentRaceAction(resourceId, incidentId, 5),
    onSuccess: (data) => {
      setRaceResult(data);
      if (!data.success) {
        toast.error(data.message);
      } else if (data.committed === 1) {
        toast.success(`Race resolved: 1 committed, ${data.rejected} rejected`, {
          description: "Aurora DSQL optimistic concurrency held the line.",
          duration: 8000,
        });
      } else {
        toast.warning(`Race resolved: ${data.committed} committed, ${data.rejected} rejected`);
      }
      queryClient.invalidateQueries();
    },
  });

  const busy = mutation.isPending || raceMutation.isPending;
  const available = resources.filter((r) => r.status === "available");

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold uppercase tracking-wider text-zinc-400">
          Assign Resources
        </h3>
        <Badge variant="secondary">{available.length} available</Badge>
      </div>

      <AnimatePresence mode="wait">
        {lastResult && (
          <motion.div
            key={lastResult.message}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`rounded-lg p-4 ring-1 ${
              lastResult.success
                ? "bg-emerald-500/10 ring-emerald-500/30"
                : "bg-red-500/10 ring-red-500/30"
            }`}
          >
            <div className="flex items-start gap-3">
              {lastResult.success ? (
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
              ) : (
                <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
              )}
              <div>
                <p className={`font-semibold ${lastResult.success ? "text-emerald-400" : "text-red-400"}`}>
                  {lastResult.success ? "Assignment Committed" : "Transaction Rejected"}
                </p>
                <p className="mt-1 text-sm text-zinc-300">{lastResult.message}</p>
                {!lastResult.success && (
                  <p className="mt-2 font-mono text-xs text-red-300/80">
                    Aurora DSQL: SELECT FOR UPDATE → Conflict detected → Rollback
                  </p>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence mode="wait">
        {raceResult && raceResult.success && (
          <motion.div
            key={raceResult.message}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="rounded-lg bg-sky-500/10 p-4 ring-1 ring-sky-500/30"
          >
            <div className="flex items-start gap-3">
              <Swords className="h-5 w-5 shrink-0 text-sky-400" />
              <div className="w-full">
                <p className="font-semibold text-sky-300">
                  Concurrency Race: {raceResult.callSign}
                </p>
                <div className="mt-2 flex gap-2">
                  <Badge className="bg-emerald-500/20 text-emerald-300">
                    {raceResult.committed} committed
                  </Badge>
                  <Badge className="bg-red-500/20 text-red-300">
                    {raceResult.rejected} rejected
                  </Badge>
                  <Badge variant="secondary">{raceResult.attempts} simultaneous</Badge>
                </div>
                <p className="mt-2 font-mono text-xs text-sky-300/80">
                  Aurora DSQL OCC: only one transaction wins the version check; the rest roll back.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="max-h-64 space-y-2 overflow-y-auto">
        {available.length === 0 ? (
          <p className="text-sm text-zinc-500">No available resources</p>
        ) : (
          available.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-md bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800"
            >
              <div className="flex items-center gap-3">
                <Truck className={`h-4 w-4 ${statusColor(r.status)}`} />
                <div>
                  <p className="font-mono text-sm font-medium text-zinc-200">{r.callSign}</p>
                  <p className="text-xs text-zinc-500">
                    {r.name} · {r.agencyName}
                  </p>
                </div>
              </div>
              {canAssign && (
                <div className="flex items-center gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy}
                    onClick={() => mutation.mutate({ resourceId: r.id, callSign: r.callSign })}
                  >
                    Assign
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={busy}
                    title="Fire 5 simultaneous assignments to demo Aurora DSQL concurrency control"
                    onClick={() => raceMutation.mutate({ resourceId: r.id, callSign: r.callSign })}
                  >
                    <Swords className="mr-1 h-3.5 w-3.5" />
                    Race 5x
                  </Button>
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}
