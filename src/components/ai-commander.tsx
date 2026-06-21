"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, AlertTriangle, Truck, MapPin, Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { getAIRecommendationsAction } from "@/lib/actions/crisis-actions";

const priorityVariant = {
  critical: "destructive" as const,
  high: "warning" as const,
  medium: "secondary" as const,
};

const categoryIcons: Record<string, typeof Brain> = {
  "Mutual Aid": Users,
  Evacuation: MapPin,
  "Traffic Management": Truck,
  "Fire Response": AlertTriangle,
  Hazmat: AlertTriangle,
  "Command Structure": Brain,
};

export function AICommander({ incidentId }: { incidentId: string }) {
  const { data: recommendations, isLoading } = useQuery({
    queryKey: ["ai-recommendations", incidentId],
    queryFn: () => getAIRecommendationsAction(incidentId),
    enabled: !!incidentId,
  });

  return (
    <Card className="border-purple-500/20 bg-gradient-to-br from-zinc-950 to-purple-950/20">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center gap-2 text-purple-400">
          <Brain className="h-4 w-4" />
          AI Incident Commander
        </CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex items-center gap-2 text-sm text-zinc-500">
            <Brain className="h-4 w-4 animate-pulse" />
            Analyzing operational data...
          </div>
        ) : (
          <div className="space-y-3">
            {recommendations?.map((rec, i) => {
              const Icon = categoryIcons[rec.category] ?? Brain;
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.1 }}
                  className="rounded-md bg-zinc-900/80 p-3 ring-1 ring-zinc-800"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Icon className="h-3.5 w-3.5 text-purple-400" />
                      <span className="text-xs font-medium text-zinc-300">{rec.category}</span>
                    </div>
                    <Badge variant={priorityVariant[rec.priority]}>{rec.priority}</Badge>
                  </div>
                  <p className="text-sm font-medium text-zinc-100">{rec.recommendation}</p>
                  <p className="mt-1 text-xs text-zinc-500">{rec.rationale}</p>
                </motion.div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
