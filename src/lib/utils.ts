import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatRelativeTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const seconds = Math.floor((Date.now() - d.getTime()) / 1000);
  if (seconds < 60) return `${seconds}s ago`;
  if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
  return d.toLocaleDateString();
}

export function generateIncidentNumber(): string {
  const year = new Date().getFullYear();
  const seq = Math.floor(Math.random() * 9000) + 1000;
  return `INC-${year}-${seq}`;
}

export function severityColor(severity: string): string {
  switch (severity) {
    case "catastrophic":
      return "text-red-400 bg-red-500/10 border-red-500/30";
    case "critical":
      return "text-orange-400 bg-orange-500/10 border-orange-500/30";
    case "high":
      return "text-amber-400 bg-amber-500/10 border-amber-500/30";
    case "medium":
      return "text-yellow-400 bg-yellow-500/10 border-yellow-500/30";
    default:
      return "text-emerald-400 bg-emerald-500/10 border-emerald-500/30";
  }
}

export function statusColor(status: string): string {
  switch (status) {
    case "available":
      return "text-emerald-400";
    case "assigned":
      return "text-blue-400";
    case "en_route":
      return "text-cyan-400";
    case "on_scene":
      return "text-amber-400";
    case "returning":
      return "text-purple-400";
    default:
      return "text-zinc-400";
  }
}

export function roleLabel(role: string): string {
  const labels: Record<string, string> = {
    police: "Police",
    fire: "Fire",
    ems: "EMS",
    dispatch: "Dispatch",
    emergency_manager: "Emergency Manager",
  };
  return labels[role] ?? role;
}

export function roleColor(role: string): string {
  const colors: Record<string, string> = {
    police: "bg-blue-500",
    fire: "bg-red-500",
    ems: "bg-emerald-500",
    dispatch: "bg-amber-500",
    emergency_manager: "bg-purple-500",
  };
  return colors[role] ?? "bg-zinc-500";
}
