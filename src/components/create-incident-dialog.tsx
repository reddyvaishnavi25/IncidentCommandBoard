"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { createIncidentAction } from "@/lib/actions/crisis-actions";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function CreateIncidentDialog({ canCreate }: { canCreate: boolean }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: createIncidentAction,
    onSuccess: (data) => {
      if (data.success && data.incident) {
        toast.success("Incident created");
        queryClient.invalidateQueries();
        router.push(`/incidents/${data.incident.id}`);
        setOpen(false);
      }
    },
  });

  if (!canCreate) return null;

  if (!open) {
    return (
      <Button onClick={() => setOpen(true)} variant="destructive">
        <Plus className="h-4 w-4" />
        Create Incident
      </Button>
    );
  }

  return (
    <form
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        mutation.mutate({
          title: fd.get("title") as string,
          description: fd.get("description") as string,
          severity: fd.get("severity") as string,
          location: fd.get("location") as string,
          latitude: 30.2672 + (Math.random() - 0.5) * 0.1,
          longitude: -97.7431 + (Math.random() - 0.5) * 0.1,
          casualties: parseInt(fd.get("casualties") as string) || 0,
          injuries: parseInt(fd.get("injuries") as string) || 0,
        });
      }}
    >
      <div className="w-full max-w-lg rounded-lg border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
        <h2 className="mb-4 text-lg font-bold text-zinc-100">Create New Incident</h2>
        <div className="space-y-3">
          <Input name="title" placeholder="Incident title" required defaultValue="Chemical Plant Explosion" />
          <Input name="description" placeholder="Description" defaultValue="Multi-agency hazmat response required. Structural damage reported." />
          <Input name="location" placeholder="Location" required defaultValue="Industrial District, Sector 7" />
          <div className="grid grid-cols-3 gap-2">
            <select name="severity" className="h-10 rounded-md border border-zinc-700 bg-zinc-900 px-3 text-sm text-zinc-100">
              <option value="critical">Critical</option>
              <option value="catastrophic">Catastrophic</option>
              <option value="high">High</option>
              <option value="medium">Medium</option>
            </select>
            <Input name="casualties" type="number" placeholder="Casualties" defaultValue="12" />
            <Input name="injuries" type="number" placeholder="Injuries" defaultValue="28" />
          </div>
        </div>
        <div className="mt-6 flex justify-end gap-2">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
          </Button>
        </div>
      </div>
    </form>
  );
}
