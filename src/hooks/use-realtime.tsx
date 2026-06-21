"use client";

import { useEffect, useCallback, useRef, type ReactNode } from "react";
import { useQueryClient } from "@tanstack/react-query";

export function useRealtime() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  const invalidateAll = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ["command-center"] });
    queryClient.invalidateQueries({ queryKey: ["incidents"] });
    queryClient.invalidateQueries({ queryKey: ["incident"] });
    queryClient.invalidateQueries({ queryKey: ["resources"] });
    queryClient.invalidateQueries({ queryKey: ["consistency"] });
    queryClient.invalidateQueries({ queryKey: ["conflicts"] });
    queryClient.invalidateQueries({ queryKey: ["map"] });
  }, [queryClient]);

  useEffect(() => {
    const es = new EventSource("/api/events");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === "heartbeat" || data.type === "connected") return;
        invalidateAll();
      } catch {
        /* ignore parse errors */
      }
    };

    es.onerror = () => {
      es.close();
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [invalidateAll]);

  return { invalidateAll };
}

export function RealtimeProvider({ children }: { children: ReactNode }) {
  useRealtime();
  return children;
}
