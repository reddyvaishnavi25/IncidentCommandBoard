"use client";

import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CountyMap } from "@/components/county-map";
import { getMapDataAction } from "@/lib/actions/crisis-actions";

export function MapClient() {
  const { data, isLoading } = useQuery({
    queryKey: ["map"],
    queryFn: getMapDataAction,
    refetchInterval: 5000,
  });

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">County Operations Map</h1>
        <p className="text-sm text-zinc-400">
          Real-time incidents, responders, evacuation zones, and road closures
        </p>
      </header>

      <div className="flex flex-wrap gap-4">
        <Badge variant="destructive">Incidents: {data?.incidents.length ?? 0}</Badge>
        <Badge variant="success">Responders: {data?.resources.length ?? 0}</Badge>
        <Badge variant="warning">Evac Zones: {data?.zones.length ?? 0}</Badge>
        <Badge variant="outline">Road Closures: {data?.closures.length ?? 0}</Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Travis County — Live Operations</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex h-[500px] items-center justify-center text-zinc-500">
              Loading map data...
            </div>
          ) : data ? (
            <CountyMap data={data} />
          ) : null}
        </CardContent>
      </Card>

      {data && data.zones.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Evacuation Zones</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {data.zones.map((z) => (
              <div key={z.id} className="flex justify-between rounded-md bg-red-500/5 px-4 py-2 ring-1 ring-red-500/20">
                <span className="text-sm text-zinc-200">{z.name}</span>
                <Badge variant="destructive">{z.radiusMeters}m radius</Badge>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
