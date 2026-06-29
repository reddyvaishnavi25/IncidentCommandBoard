"use client";

import { useState, useEffect, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import * as Slider from "@radix-ui/react-slider";
import { Play, Pause, History, RotateCcw } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  getCommandCenterDataAction,
  getReplayDataAction,
  getTimelineForReplayAction,
} from "@/lib/actions/crisis-actions";
import { formatRelativeTime } from "@/lib/utils";

// How many ms between each slider tick (1% of timeline). 120ms → ~12s full playback.
const TICK_MS = 120;

export function ReplayClient() {
  const [selectedIncident, setSelectedIncident] = useState<string>("");
  const [sliderValue, setSliderValue] = useState([0]);
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Advance slider while playing
  useEffect(() => {
    if (!playing) {
      if (intervalRef.current) clearInterval(intervalRef.current);
      return;
    }

    intervalRef.current = setInterval(() => {
      setSliderValue((prev) => {
        const next = prev[0] + 1;
        if (next >= 100) {
          setPlaying(false);
          return [100];
        }
        return [next];
      });
    }, TICK_MS);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing]);

  // Stop playback when incident changes
  useEffect(() => {
    setPlaying(false);
    setSliderValue([0]);
  }, [selectedIncident]);

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
    return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  };

  const handlePlayPause = () => {
    // If at the end, restart from beginning
    if (!playing && sliderValue[0] >= 100) {
      setSliderValue([0]);
    }
    setPlaying((p) => !p);
  };

  const handleRestart = () => {
    setPlaying(false);
    setSliderValue([0]);
  };

  // Find the most recent timeline event at or before the current timestamp
  const currentEventId = (() => {
    if (!replayData?.timeline || !replayTimestamp) return null;
    const ts = new Date(replayTimestamp).getTime();
    let latest = null;
    for (const e of replayData.timeline) {
      if (new Date(e.createdAt).getTime() <= ts) latest = e.id;
    }
    return latest;
  })();

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
                onClick={() => setSelectedIncident(inc.id)}
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
                <div className="flex items-center gap-3 font-mono text-sm">
                  <span className="text-zinc-500">{formatTime(timelineRange.start ?? undefined)}</span>
                  <span className="rounded bg-purple-500/20 px-2 py-0.5 text-cyan-300 ring-1 ring-cyan-500/30">
                    {formatTime(replayTimestamp)}
                  </span>
                  <span className="text-zinc-500">{formatTime(timelineRange.end ?? undefined)}</span>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Slider.Root
                className="relative flex h-5 w-full touch-none select-none items-center"
                value={sliderValue}
                onValueChange={(v) => {
                  setPlaying(false);
                  setSliderValue(v);
                }}
                max={100}
                step={1}
              >
                <Slider.Track className="relative h-2 grow rounded-full bg-zinc-800">
                  <Slider.Range className="absolute h-full rounded-full bg-purple-500" />
                </Slider.Track>
                <Slider.Thumb className="block h-5 w-5 rounded-full bg-purple-400 ring-2 ring-purple-500/50 focus:outline-none" />
              </Slider.Root>

              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handlePlayPause}
                >
                  {playing ? (
                    <Pause className="mr-1 h-4 w-4" />
                  ) : (
                    <Play className="mr-1 h-4 w-4" />
                  )}
                  {playing ? "Pause" : sliderValue[0] >= 100 ? "Replay" : "Play"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleRestart}
                  title="Restart from beginning"
                >
                  <RotateCcw className="h-4 w-4" />
                </Button>
                {playing && (
                  <span className="animate-pulse font-mono text-xs text-purple-400">
                    ● LIVE REPLAY
                  </span>
                )}
                {sliderValue[0] >= 100 && !playing && (
                  <span className="font-mono text-xs text-zinc-500">End of timeline</span>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>State at {formatTime(replayTimestamp)}</CardTitle>
              </CardHeader>
              <CardContent>
                {replayData?.incident ? (
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
                ) : (
                  <p className="text-sm text-zinc-500">No incident data at this point</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resources Assigned (Historical)</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {replayData?.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex justify-between rounded bg-zinc-900/80 px-3 py-2 ring-1 ring-zinc-800"
                  >
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
                {replayData?.timeline.map((e) => {
                  const isCurrent = e.id === currentEventId;
                  const isPast = new Date(e.createdAt).getTime() <= new Date(replayTimestamp ?? 0).getTime();
                  return (
                    <div
                      key={e.id}
                      className={`relative flex gap-4 pb-3 transition-opacity duration-300 ${
                        isPast ? "opacity-100" : "opacity-25"
                      }`}
                    >
                      <div
                        className={`absolute -left-4 top-1.5 h-2 w-2 rounded-full ring-2 ring-zinc-950 transition-colors duration-300 ${
                          isCurrent
                            ? "bg-cyan-400 ring-cyan-500/50 shadow-[0_0_6px_2px_rgba(34,211,238,0.4)]"
                            : isPast
                            ? "bg-purple-500"
                            : "bg-zinc-700"
                        }`}
                      />
                      <div>
                        <p
                          className={`text-sm transition-colors duration-300 ${
                            isCurrent ? "font-semibold text-cyan-300" : "text-zinc-200"
                          }`}
                        >
                          {e.title}
                        </p>
                        <p className="text-[10px] text-zinc-600">{formatRelativeTime(e.createdAt)}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
