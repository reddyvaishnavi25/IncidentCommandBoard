import { NextRequest } from "next/server";
import { getBroadcaster } from "@/lib/events/broadcaster";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const encoder = new TextEncoder();
  const broadcaster = getBroadcaster();

  const stream = new ReadableStream({
    start(controller) {
      const send = (data: string) => {
        controller.enqueue(encoder.encode(`data: ${data}\n\n`));
      };

      send(JSON.stringify({ type: "connected", timestamp: new Date().toISOString() }));

      const history = broadcaster.getHistory().slice(-10);
      history.forEach((event) => send(JSON.stringify(event)));

      const unsubscribe = broadcaster.subscribe((event) => {
        send(JSON.stringify(event));
      });

      const heartbeat = setInterval(() => {
        send(JSON.stringify({ type: "heartbeat", timestamp: new Date().toISOString() }));
      }, 15000);

      request.signal.addEventListener("abort", () => {
        clearInterval(heartbeat);
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
