"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  AlertTriangle,
  Truck,
  Map,
  History,
  LogOut,
  Radio,
  Shield,
} from "lucide-react";
import { cn, roleLabel, roleColor } from "@/lib/utils";
import type { SessionUser } from "@/lib/auth/types";
import { Button } from "@/components/ui/button";
import { logout } from "@/lib/actions/auth-actions";

const navItems = [
  { href: "/command", label: "Command Center", icon: LayoutDashboard },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/resources", label: "Resources", icon: Truck },
  { href: "/map", label: "Operations Map", icon: Map },
  { href: "/replay", label: "After Action Replay", icon: History },
];

export function Sidebar({ user }: { user: SessionUser }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-zinc-800/80 bg-zinc-950/95">
      <div className="border-b border-zinc-800/80 p-4">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-600/20 ring-1 ring-cyan-500/30">
            <Shield className="h-5 w-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-zinc-100">CRISIS TWIN</h1>
            <p className="text-[10px] uppercase tracking-widest text-zinc-500">
              Digital Twin EOC
            </p>
          </div>
        </div>
      </div>

      <div className="border-b border-zinc-800/80 p-4">
        <div className="flex items-center gap-3">
          <div className={cn("h-2 w-2 rounded-full animate-pulse", roleColor(user.role))} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-zinc-200">{user.name}</p>
            <p className="text-xs text-zinc-500">{roleLabel(user.role)} · {user.agencyName}</p>
          </div>
        </div>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-all",
                active
                  ? "bg-cyan-500/10 text-cyan-400 ring-1 ring-cyan-500/20"
                  : "text-zinc-400 hover:bg-zinc-800/50 hover:text-zinc-200"
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-zinc-800/80 p-3">
        <div className="mb-3 flex items-center gap-2 rounded-md bg-emerald-500/5 px-3 py-2 ring-1 ring-emerald-500/20">
          <Radio className="h-3 w-3 text-emerald-400 animate-pulse" />
          <span className="text-xs text-emerald-400">Live · Aurora DSQL</span>
        </div>
        <form action={logout}>
          <Button variant="ghost" size="sm" className="w-full justify-start" type="submit">
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </form>
      </div>
    </aside>
  );
}
