"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Slider from "@radix-ui/react-slider";
import { Play, Pause, History } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCommandCenterDataAction,
  getReplayDataAction,
  getTimelineForReplayAction,
} from "@/lib/actions/crisis-actions";
import { formatRelativeTime } from "@/lib/utils";

export function ReplayClient() {
  const [selectedIncident, setSelectedIncident] = useState<string>("");
  const [sliderValue, setSliderValue] = useState([100]);
  const [playing, setPlaying] = useState(false);

  const { data: commandData } = useQuery({
    queryKey: ["incidents"],
    queryFn: getCommandCenterDataAction,
  });

  const { data: timelineRange } = useQuery({
    queryKey: ["replay-range", selectedIncident],
    queryFn: () => getTimelineForReplayAction(selectedIncident),
    enabled: !!selectedIncident,
  });

  const replayTimestamp = (() => {
    if (!timelineRange?.start || !timelineRange?.end) return undefined;
    const start = new Date(timelineRange.start).getTime();
    const end = new Date(timelineRange.end).getTime();
    const t = start + ((end - start) * sliderValue[0]) / 100;
    return new Date(t).toISOString();
  })();

  const { data: replayData } = useQuery({
    queryKey: ["replay", selectedIncident, replayTimestamp],
    queryFn: () => getReplayDataAction(selectedIncident, replayTimestamp),
    enabled: !!selectedIncident && !!replayTimestamp,
  });

  const formatTime = (iso?: string) => {
    if (!iso) return "--:--";
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-zinc-100">After Action Replay</h1>
        <p className="text-sm text-zinc-400">
          Reconstruct the exact state of operations at any point in time
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Select Incident
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {commandData?.activeIncidents.map((inc) => (
              <Button
                key={inc.id}
                variant={selectedIncident === inc.id ? "default" : "outline"}
                size="sm"
                onClick={() => {
                  setSelectedIncident(inc.id);
                  setSliderValue([100]);
                }}
              >
                {inc.title.slice(0, 30)}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      {selectedIncident && timelineRange && (
        <>
          <Card className="border-purple-500/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-purple-400">Timeline Scrubber</CardTitle>
                <div className="flex items-center gap-4 font-mono text-sm text-zinc-300">
                  <span>{formatTime(timelineRange.start ?? undefined)}</span>
                  <span className="text-cyan-400">{formatTime(replayTimestamp)}</span>
                  <span>{formatTime(timelineRange.end ?? undefined)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                value={sliderValue}
                onValueChange={setSliderValue}
                max={100}
                step={1}
              >
                <Slider.Track className="relative h-2 grow rounded-full bg-zinc-800">
                  <Slider.Range className="absolute h-full rounded-full bg-purple-500" />
                </Slider.Track>
                <Slider.Thumb className="block h-5 w-5 rounded-full bg-purple-400 ring-2 ring-purple-500/50 focus:outline-none" />
              </Slider.Root>

              <div className="flex justify-between text-xs text-zinc-500">
                {["09:00", "09:05", "09:10", "09:15"].map((t) => (
                  <span key={t}>{t}</span>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setPlaying(!playing)}
              >
                {playing ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                {playing ? "Pause" : "Play"} Replay
              </Button>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>State at {formatTime(replayTimestamp)}</CardTitle>
              </CardHeader>
              <CardContent>
                {replayData?.incident && (
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <Badge>{replayData.incident.status}</Badge>
                      <Badge variant="destructive">{replayData.incident.severity}</Badge>
                    </div>
                    <p className="text-sm text-zinc-300">{replayData.incident.description}</p>
                    <div className="grid grid-cols-3 gap-2 text-center">
                      <div className="rounded bg-zinc-900 p-2">
                        <p className="font-mono text-lg text-red-400">{replayData.incident.casualties}</p>
                        <p className="text-[10px] text-zinc-500">Casualties</p>
                      </div>
                      <div className="rounded bg-zinc-900 p-2">
                        <p className="font-mono text-lg text-amber-400">{replayData.incident.injuries}</p>
                        <p className="text-[10px] text-zinc-500">Injuries</p>
                      </div>
                      <div className="rounded bg-zinc-900 p-2">
                        <p className="font-mono text-lg">{replayData.assignments.length}</p>
                        <p className="text-[10px] text-zinc-500">Units Assigned</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources Assigned (Historical)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {replayData?.assignments.map((a) => (
                  <div key={a.id} className="flex justify-between rounded bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800">
                    <span className="font-mono text-sm text-zinc-200">{a.callSign}</span>
                    <Badge variant="secondary">{a.status}</Badge>
                  </div>
                ))}
                {replayData?.assignments.length === 0 && (
                  <p className="text-sm text-zinc-500">No assignments at this point</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Event Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="relative pl-4 max-h-96 overflow-y-auto">
                <div className="absolute left-[7px] top-2 bottom-2 w-px bg-zinc-800" />
                {replayData?.timeline.map((e) => (
                  <div key={e.id} className="relative flex gap-4 pb-3">
                    <div className="absolute -left-4 top-1.5 h-2 w-2 rounded-full bg-purple-500 ring-2 ring-zinc-950" />
                    <div>
                      <p className="text-sm text-zinc-200">{e.title}</p>
                      <p className="text-[10px] text-zinc-600">{formatRelativeTime(e.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
