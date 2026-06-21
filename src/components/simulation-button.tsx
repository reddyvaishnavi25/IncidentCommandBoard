"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { CloudLightning, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { runHurricaneSimulationAction } from "@/lib/actions/crisis-actions";
import { toast } from "sonner";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export function SimulationButton({ role }: { role: UserRole }) {
  const [result, setResult] = useState<{
    incidentsCreated: number;
    respondersCreated: number;
    updatesGenerated: number;
  } | null>(null);
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: runHurricaneSimulationAction,
    onSuccess: (data) => {
      if (data.success && data.simulation) {
        setResult({
          incidentsCreated: data.simulation.incidentsCreated,
          respondersCreated: data.simulation.respondersCreated,
          updatesGenerated: data.simulation.updatesGenerated,
        });
        toast.success("Hurricane simulation complete", {
          description: `${data.simulation.updatesGenerated}+ updates processed`,
        });
        queryClient.invalidateQueries();
      } else {
        toast.error(data.message ?? "Simulation failed");
      }
    },
  });

  if (!hasPermission(role, "run_simulation")) return null;

  return (
    <div className="space-y-3">
      <Button
        variant="accent"
        size="lg"
        className="w-full font-bold tracking-wide"
        onClick={() => mutation.mutate()}
        disabled={mutation.isPending}
      >
        {mutation.isPending ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" />
            SIMULATING...
          </>
        ) : (
          <>
            <CloudLightning className="h-5 w-5" />
            SIMULATE HURRICANE RESPONSE
          </>
        )}
      </Button>

      {result && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="grid grid-cols-3 gap-2 rounded-lg bg-amber-500/5 p-3 ring-1 ring-amber-500/20"
        >
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-amber-400">{result.incidentsCreated}</p>
            <p className="text-[10px] uppercase text-zinc-500">Incidents</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-amber-400">{result.respondersCreated}</p>
            <p className="text-[10px] uppercase text-zinc-500">Responders</p>
          </div>
          <div className="text-center">
            <p className="font-mono text-2xl font-bold text-amber-400">{result.updatesGenerated}+</p>
            <p className="text-[10px] uppercase text-zinc-500">Updates</p>
          </div>
        </motion.div>
      )}
    </div>
  );
}
