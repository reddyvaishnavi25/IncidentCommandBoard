"use client";

import { motion } from "framer-motion";
import type { Incident, Resource } from "@/lib/db/schema";

interface MapData {
  incidents: Incident[];
  resources: Resource[];
  zones: Array<{ id: string; name: string; latitude: string; longitude: string; radiusMeters: number }>;
  closures: Array<{ id: string; name: string; startLat: string; startLng: string; endLat: string; endLng: string }>;
}

const COUNTY_BOUNDS = { minLat: 30.0, maxLat: 30.6, minLng: -98.1, maxLng: -97.4 };

function toXY(lat: number, lng: number, width: number, height: number) {
  const x = ((lng - COUNTY_BOUNDS.minLng) / (COUNTY_BOUNDS.maxLng - COUNTY_BOUNDS.minLng)) * width;
  const y = height - ((lat - COUNTY_BOUNDS.minLat) / (COUNTY_BOUNDS.maxLat - COUNTY_BOUNDS.minLat)) * height;
  return { x, y };
}

const severityColors: Record<string, string> = {
  catastrophic: "#ef4444",
  critical: "#f97316",
  high: "#f59e0b",
  medium: "#eab308",
  low: "#22c55e",
};

const resourceColors: Record<string, string> = {
  ambulance: "#10b981",
  fire_engine: "#ef4444",
  police_vehicle: "#3b82f6",
  rescue_team: "#8b5cf6",
  hazmat_team: "#f59e0b",
  search_rescue: "#06b6d4",
};

export function CountyMap({ data, compact = false }: { data: MapData; compact?: boolean }) {
  const w = compact ? 400 : 800;
  const h = compact ? 250 : 500;

  return (
    <div className="relative overflow-hidden rounded-lg bg-zinc-950 ring-1 ring-zinc-800">
      <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{ height: compact ? 250 : 500 }}>
        <defs>
          <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
            <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#27272a" strokeWidth="0.5" />
          </pattern>
          <radialGradient id="mapGlow">
            <stop offset="0%" stopColor="#0891b2" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#09090b" stopOpacity="0" />
          </radialGradient>
        </defs>

        <rect width={w} height={h} fill="#09090b" />
        <rect width={w} height={h} fill="url(#grid)" />
        <ellipse cx={w / 2} cy={h / 2} rx={w * 0.4} ry={h * 0.35} fill="url(#mapGlow)" />

        <text x={16} y={24} fill="#71717a" fontSize="11" fontFamily="monospace">
          TRAVIS COUNTY OPERATIONS MAP
        </text>

        {data.zones.map((zone) => {
          const lat = parseFloat(zone.latitude);
          const lng = parseFloat(zone.longitude);
          const { x, y } = toXY(lat, lng, w, h);
          const r = (zone.radiusMeters / 5000) * 80;
          return (
            <g key={zone.id}>
              <circle cx={x} cy={y} r={r} fill="#ef4444" fillOpacity="0.08" stroke="#ef4444" strokeOpacity="0.3" strokeDasharray="4 4" />
              <text x={x} y={y - r - 4} fill="#ef4444" fontSize="9" textAnchor="middle" opacity="0.7">
                {zone.name}
              </text>
            </g>
          );
        })}

        {data.closures.map((c) => {
          const s = toXY(parseFloat(c.startLat), parseFloat(c.startLng), w, h);
          const e = toXY(parseFloat(c.endLat), parseFloat(c.endLng), w, h);
          return (
            <line key={c.id} x1={s.x} y1={s.y} x2={e.x} y2={e.y} stroke="#f59e0b" strokeWidth="3" strokeDasharray="8 4" opacity="0.8" />
          );
        })}

        {data.resources
          .filter((r) => r.latitude && r.longitude)
          .slice(0, compact ? 30 : 100)
          .map((r, i) => {
            const { x, y } = toXY(parseFloat(r.latitude!), parseFloat(r.longitude!), w, h);
            return (
              <motion.circle
                key={r.id}
                cx={x}
                cy={y}
                r={compact ? 3 : 4}
                fill={resourceColors[r.type] ?? "#71717a"}
                opacity={r.status === "available" ? 0.5 : 1}
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: i * 0.01 }}
              />
            );
          })}

        {data.incidents
          .filter((inc) => inc.latitude && inc.longitude)
          .map((inc, i) => {
            const { x, y } = toXY(parseFloat(inc.latitude!), parseFloat(inc.longitude!), w, h);
            const color = severityColors[inc.severity] ?? "#71717a";
            return (
              <g key={inc.id}>
                <motion.circle
                  cx={x}
                  cy={y}
                  r={compact ? 8 : 12}
                  fill={color}
                  fillOpacity="0.2"
                  stroke={color}
                  strokeWidth="2"
                  initial={{ scale: 0 }}
                  animate={{ scale: [1, 1.2, 1] }}
                  transition={{ repeat: Infinity, duration: 2, delay: i * 0.2 }}
                />
                <circle cx={x} cy={y} r={compact ? 4 : 6} fill={color} />
                {!compact && (
                  <text x={x + 14} y={y + 4} fill="#e4e4e7" fontSize="10">
                    {inc.title.slice(0, 25)}
                  </text>
                )}
              </g>
            );
          })}
      </svg>

      <div className="absolute bottom-2 left-2 flex gap-3 rounded bg-zinc-950/90 px-2 py-1 text-[10px] text-zinc-500">
        {Object.entries(severityColors).slice(0, 3).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full" style={{ background: v }} />
            {k}
          </span>
        ))}
      </div>
    </div>
  );
}
