type EventCallback = (event: CrisisEvent) => void;

export interface CrisisEvent {
  type: string;
  payload: Record<string, unknown>;
  timestamp: string;
}

declare global {
  // eslint-disable-next-line no-var
  var crisisTwinBroadcaster: EventBroadcaster | undefined;
}

class EventBroadcaster {
  private subscribers = new Set<EventCallback>();
  private eventHistory: CrisisEvent[] = [];
  private maxHistory = 500;

  subscribe(callback: EventCallback): () => void {
    this.subscribers.add(callback);
    return () => this.subscribers.delete(callback);
  }

  broadcast(type: string, payload: Record<string, unknown>) {
    const event: CrisisEvent = {
      type,
      payload,
      timestamp: new Date().toISOString(),
    };
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }
    this.subscribers.forEach((cb) => cb(event));
  }

  getHistory(): CrisisEvent[] {
    return [...this.eventHistory];
  }
}

export function getBroadcaster(): EventBroadcaster {
  if (!globalThis.crisisTwinBroadcaster) {
    globalThis.crisisTwinBroadcaster = new EventBroadcaster();
  }
  return globalThis.crisisTwinBroadcaster;
}

export function broadcastEvent(type: string, payload: Record<string, unknown>) {
  getBroadcaster().broadcast(type, payload);
}
