"use client";

import { useState, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { addIncidentUpdateAction, updatePresenceAction } from "@/lib/actions/crisis-actions";
import { roleColor, roleLabel } from "@/lib/utils";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface PresenceUser {
  userId: string;
  userName: string;
  userRole: string;
  isTyping: boolean;
}

export function LiveCollaboration({
  incidentId,
  presence,
  currentUserId,
}: {
  incidentId: string;
  presence: PresenceUser[];
  currentUserId: string;
}) {
  const [updateText, setUpdateText] = useState("");
  const [typing, setTyping] = useState(false);

  useEffect(() => {
    updatePresenceAction(incidentId, "incident_workspace", typing);
    const interval = setInterval(() => {
      updatePresenceAction(incidentId, "incident_workspace", typing);
    }, 10000);
    return () => clearInterval(interval);
  }, [incidentId, typing]);

  const mutation = useMutation({
    mutationFn: (content: string) => addIncidentUpdateAction(incidentId, content),
    onSuccess: () => setUpdateText(""),
  });

  const others = presence.filter((p) => p.userId !== currentUserId);
  const typingUsers = others.filter((p) => p.isTyping);

  return (
    <div className="space-y-4">
      {others.length > 0 && (
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase tracking-wider text-zinc-500">Active</span>
          <div className="flex -space-x-2">
            {others.map((p) => (
              <div
                key={p.userId}
                title={`${p.userName} (${roleLabel(p.userRole)})`}
                className={cn(
                  "flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold text-white ring-2 ring-zinc-950",
                  roleColor(p.userRole)
                )}
              >
                {p.userName.charAt(0)}
              </div>
            ))}
          </div>
          {typingUsers.length > 0 && (
            <span className="text-xs text-zinc-500 animate-pulse">
              {typingUsers.map((p) => p.userName).join(", ")} typing...
            </span>
          )}
        </div>
      )}

      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (updateText.trim()) mutation.mutate(updateText.trim());
        }}
      >
        <Input
          value={updateText}
          onChange={(e) => {
            setUpdateText(e.target.value);
            setTyping(e.target.value.length > 0);
          }}
          onBlur={() => setTyping(false)}
          placeholder="Post agency update..."
        />
        <Button type="submit" disabled={mutation.isPending || !updateText.trim()}>
          Send
        </Button>
      </form>
    </div>
  );
}
