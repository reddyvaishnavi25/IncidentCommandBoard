"use server";

import { eq, and, desc, sql, lte, count, isNull } from "drizzle-orm";
import { requireDb } from "@/lib/db";
import {
  consistencyMetrics,
  conflictLogs,
  auditLogs,
  resources,
  resourceAssignments,
  incidents,
  incidentUpdates,
  timelineEvents,
  presence,
  simulations,
  evacuationZones,
  roadClosures,
  users,
  agencies,
} from "@/lib/db/schema";
import { broadcastEvent } from "@/lib/events/broadcaster";
import { generateIncidentNumber } from "@/lib/utils";
import { requireSession } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

async function ensureMetrics() {
  const db = await requireDb();
  const [existing] = await db.select().from(consistencyMetrics).limit(1);
  if (!existing) {
    await db.insert(consistencyMetrics).values({});
  }
}

type MetricField =
  | "transactionsProcessed"
  | "conflictsPrevented"
  | "duplicateAssignmentsPrevented"
  | "lostUpdates"
  | "rejectedTransactions";

/**
 * Atomically increments one or more consistency metrics in a single UPDATE.
 * The consistency score is recomputed in-database from the post-increment
 * totals, so this avoids the previous read-modify-write round-trips (which
 * ran a SELECT + SELECT + UPDATE per field, up to 4 times per assignment).
 */
async function incrementMetrics(increments: Partial<Record<MetricField, number>>) {
  const entries = Object.entries(increments).filter(([, v]) => v) as [MetricField, number][];
  if (entries.length === 0) return;

  const db = await requireDb();
  await ensureMetrics();

  const incProcessed = increments.transactionsProcessed ?? 0;
  const incRejected = increments.rejectedTransactions ?? 0;

  const set: Record<string, unknown> = { updatedAt: new Date() };
  for (const [field, amount] of entries) {
    set[field] = sql`${consistencyMetrics[field]} + ${amount}`;
  }
  // Recompute score from the new totals, clamped to [0, 100].
  set.consistencyScore = sql`GREATEST(0, 100 - (${consistencyMetrics.rejectedTransactions} + ${incRejected})::numeric / GREATEST(${consistencyMetrics.transactionsProcessed} + ${incProcessed}, 1) * 100)`;

  await db.update(consistencyMetrics).set(set);
}

export async function assignResourceAction(
  resourceId: string,
  incidentId: string
): Promise<{ success: boolean; message: string; assignmentId?: string }> {
  const session = await requireSession();
  if (!hasPermission(session.role, "assign_resources")) {
    return { success: false, message: "Insufficient permissions to assign resources." };
  }

  const db = await requireDb();
  const transactionId = crypto.randomUUID();

  try {
    const result = await db.transaction(async (tx) => {
      const [resource] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, resourceId))
        .limit(1);

      if (!resource) {
        await tx.insert(auditLogs).values({
          action: "assign_resource",
          entityType: "resource",
          entityId: resourceId,
          userId: session.id,
          details: JSON.stringify({ incidentId, error: "Resource not found" }),
          transactionId,
          success: false,
        });
        return { success: false, message: "Resource not found.", rejected: true };
      }

      if (resource.status !== "available" || resource.currentIncidentId) {
        const [existingAssignment] = await tx
          .select({ assignedById: resourceAssignments.assignedById })
          .from(resourceAssignments)
          .where(
            and(
              eq(resourceAssignments.resourceId, resourceId),
              sql`${resourceAssignments.releasedAt} IS NULL`
            )
          )
          .limit(1);

        await tx.insert(conflictLogs).values({
          resourceId,
          incidentId,
          attemptedById: session.id,
          winnerId: existingAssignment?.assignedById ?? null,
          conflictType: "duplicate_assignment",
          message: `Resource ${resource.callSign} already assigned. Transaction rejected by Aurora DSQL.`,
        });

        await tx.insert(timelineEvents).values({
          incidentId,
          eventType: "conflict_prevented",
          title: `Duplicate assignment prevented: ${resource.callSign}`,
          description: `${session.name} attempted to assign ${resource.callSign} but it was already committed to another incident.`,
          userId: session.id,
          agencyId: session.agencyId,
          metadata: JSON.stringify({ resourceId, transactionId }),
        });

        await tx.insert(auditLogs).values({
          action: "assign_resource_conflict",
          entityType: "resource",
          entityId: resourceId,
          userId: session.id,
          details: JSON.stringify({
            incidentId,
            resourceCallSign: resource.callSign,
            currentStatus: resource.status,
          }),
          transactionId,
          success: false,
        });

        return {
          success: false,
          message: `Resource already assigned. ${resource.callSign} is ${resource.status.replace("_", " ")}.`,
          rejected: true,
          conflict: true,
        };
      }

      const [updated] = await tx
        .update(resources)
        .set({
          status: "assigned",
          currentIncidentId: incidentId,
          version: resource.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(resources.id, resourceId), eq(resources.version, resource.version)))
        .returning();

      if (!updated) {
        return {
          success: false,
          message: "Concurrent modification detected. Resource already assigned.",
          rejected: true,
          lostUpdate: true,
        };
      }

      const [assignment] = await tx
        .insert(resourceAssignments)
        .values({
          resourceId,
          incidentId,
          assignedById: session.id,
          status: "assigned",
        })
        .returning();

      await tx.insert(timelineEvents).values({
        incidentId,
        eventType: "resource_assigned",
        title: `${resource.callSign} assigned`,
        description: `${session.name} (${session.agencyName}) assigned ${resource.name} to incident.`,
        userId: session.id,
        agencyId: session.agencyId,
        metadata: JSON.stringify({ resourceId, assignmentId: assignment.id }),
      });

      await tx.insert(auditLogs).values({
        action: "assign_resource",
        entityType: "resource",
        entityId: resourceId,
        userId: session.id,
        details: JSON.stringify({ incidentId, assignmentId: assignment.id }),
        transactionId,
        success: true,
      });

      return {
        success: true,
        message: `${resource.callSign} successfully assigned.`,
        assignmentId: assignment.id,
        resource,
      };
    });

    if (result.conflict) {
      await incrementMetrics({
        transactionsProcessed: 1,
        conflictsPrevented: 1,
        duplicateAssignmentsPrevented: 1,
        rejectedTransactions: 1,
      });
    } else if (result.lostUpdate) {
      await incrementMetrics({
        transactionsProcessed: 1,
        lostUpdates: 1,
        rejectedTransactions: 1,
      });
    } else if (result.rejected) {
      await incrementMetrics({ transactionsProcessed: 1, rejectedTransactions: 1 });
    } else {
      await incrementMetrics({ transactionsProcessed: 1 });
    }

    if (result.success) {
      broadcastEvent("resource_assigned", {
        resourceId,
        incidentId,
        assignedBy: session.name,
        callSign: result.resource?.callSign,
      });
      broadcastEvent("consistency_updated", {});
    } else {
      broadcastEvent("assignment_conflict", {
        resourceId,
        incidentId,
        attemptedBy: session.name,
        message: result.message,
      });
      broadcastEvent("consistency_updated", {});
    }

    return result;
  } catch (error) {
    console.error("Assignment transaction failed:", error);
    await incrementMetrics({ rejectedTransactions: 1 });
    return { success: false, message: "Transaction failed. Please retry." };
  }
}

export interface RaceSimulationResult {
  success: boolean;
  message: string;
  attempts: number;
  committed: number;
  rejected: number;
  callSign?: string;
  results?: { success: boolean; message: string }[];
}

/**
 * Fires N concurrent assignment attempts at the SAME resource to demonstrate
 * Aurora DSQL's optimistic concurrency control. Exactly one transaction should
 * commit; the rest are rejected (duplicate assignment / lost update / OC001).
 * Reuses the real assignResourceAction so the demo exercises the production path.
 */
export async function simulateAssignmentRaceAction(
  resourceId: string,
  incidentId: string,
  attempts = 5
): Promise<RaceSimulationResult> {
  const session = await requireSession();
  if (!hasPermission(session.role, "assign_resources")) {
    return {
      success: false,
      message: "Insufficient permissions to simulate assignment race.",
      attempts: 0,
      committed: 0,
      rejected: 0,
    };
  }

  const db = await requireDb();
  const [resource] = await db
    .select({ callSign: resources.callSign, status: resources.status })
    .from(resources)
    .where(eq(resources.id, resourceId))
    .limit(1);

  if (!resource) {
    return { success: false, message: "Resource not found.", attempts: 0, committed: 0, rejected: 0 };
  }
  if (resource.status !== "available") {
    return {
      success: false,
      message: `${resource.callSign} is not available (currently ${resource.status.replace("_", " ")}). Pick an available unit.`,
      attempts: 0,
      committed: 0,
      rejected: 0,
    };
  }

  const n = Math.min(Math.max(attempts, 2), 10);

  // Fire all attempts simultaneously against the same resource.
  const settled = await Promise.all(
    Array.from({ length: n }, () => assignResourceAction(resourceId, incidentId))
  );

  const results = settled.map((r) => ({ success: r.success, message: r.message }));
  const committed = results.filter((r) => r.success).length;
  const rejected = results.length - committed;

  broadcastEvent("consistency_updated", {});

  return {
    success: true,
    message: `${n} dispatchers raced for ${resource.callSign}: ${committed} committed, ${rejected} rejected by Aurora DSQL.`,
    attempts: n,
    committed,
    rejected,
    callSign: resource.callSign,
    results,
  };
}

export async function releaseResourceAction(
  resourceId: string,
  incidentId: string
): Promise<{ success: boolean; message: string }> {
  const session = await requireSession();
  if (!hasPermission(session.role, "manage_resources")) {
    return { success: false, message: "Insufficient permissions to release resources." };
  }

  const db = await requireDb();

  try {
    const result = await db.transaction(async (tx) => {
      const [resource] = await tx
        .select()
        .from(resources)
        .where(eq(resources.id, resourceId))
        .limit(1);

      if (!resource) {
        return { success: false, message: "Resource not found." };
      }

      const [assignment] = await tx
        .select()
        .from(resourceAssignments)
        .where(
          and(
            eq(resourceAssignments.resourceId, resourceId),
            eq(resourceAssignments.incidentId, incidentId),
            isNull(resourceAssignments.releasedAt)
          )
        )
        .limit(1);

      if (!assignment) {
        return { success: false, message: "No active assignment found for this resource." };
      }

      await tx
        .update(resourceAssignments)
        .set({ status: "released", releasedAt: new Date() })
        .where(eq(resourceAssignments.id, assignment.id));

      const [updated] = await tx
        .update(resources)
        .set({
          status: "available",
          currentIncidentId: null,
          version: resource.version + 1,
          updatedAt: new Date(),
        })
        .where(and(eq(resources.id, resourceId), eq(resources.version, resource.version)))
        .returning();

      if (!updated) {
        return { success: false, message: "Concurrent modification detected. Please retry." };
      }

      await tx.insert(timelineEvents).values({
        incidentId,
        eventType: "resource_released",
        title: `${resource.callSign} released`,
        description: `${session.name} (${session.agencyName}) released ${resource.name} back to available.`,
        userId: session.id,
        agencyId: session.agencyId,
      });

      await tx.insert(auditLogs).values({
        action: "release_resource",
        entityType: "resource",
        entityId: resourceId,
        userId: session.id,
        details: JSON.stringify({ incidentId, assignmentId: assignment.id }),
        success: true,
      });

      return { success: true, message: `${resource.callSign} released and available.`, callSign: resource.callSign };
    });

    if (result.success) {
      broadcastEvent("resource_released", { resourceId, incidentId });
      broadcastEvent("consistency_updated", {});
    }

    return result;
  } catch (error) {
    console.error("Release transaction failed:", error);
    return { success: false, message: "Transaction failed. Please retry." };
  }
}

export async function createIncidentAction(data: {
  title: string;
  description?: string;
  severity: string;
  location: string;
  latitude?: number;
  longitude?: number;
  casualties?: number;
  injuries?: number;
}) {
  const session = await requireSession();
  if (!hasPermission(session.role, "create_incident")) {
    return { success: false, message: "Insufficient permissions." };
  }

  const db = await requireDb();
  const incidentNumber = generateIncidentNumber();

  const [incident] = await db
    .insert(incidents)
    .values({
      incidentNumber,
      title: data.title,
      description: data.description,
      severity: data.severity as "low" | "medium" | "high" | "critical" | "catastrophic",
      status: "active",
      location: data.location,
      latitude: data.latitude?.toString(),
      longitude: data.longitude?.toString(),
      casualties: data.casualties ?? 0,
      injuries: data.injuries ?? 0,
      createdById: session.id,
    })
    .returning();

  await db.insert(timelineEvents).values({
    incidentId: incident.id,
    eventType: "incident_created",
    title: `Incident created: ${data.title}`,
    description: data.description ?? "New incident reported.",
    userId: session.id,
    agencyId: session.agencyId,
  });

  await incrementMetrics({ transactionsProcessed: 1 });
  broadcastEvent("incident_created", { incident });
  return { success: true, incident };
}

export async function addIncidentUpdateAction(incidentId: string, content: string) {
  const session = await requireSession();
  if (!hasPermission(session.role, "edit_incident")) {
    return { success: false, message: "Insufficient permissions." };
  }

  const db = await requireDb();
  const [update] = await db
    .insert(incidentUpdates)
    .values({
      incidentId,
      userId: session.id,
      agencyId: session.agencyId,
      content,
    })
    .returning();

  await db.insert(timelineEvents).values({
    incidentId,
    eventType: "agency_update",
    title: `${session.agencyName} update`,
    description: content,
    userId: session.id,
    agencyId: session.agencyId,
  });

  await db
    .update(incidents)
    .set({ updatedAt: new Date() })
    .where(eq(incidents.id, incidentId));

  broadcastEvent("incident_update", { incidentId, update, user: session.name });
  return { success: true, update };
}

export async function updateIncidentAction(
  incidentId: string,
  data: Partial<{
    status: string;
    severity: string;
    casualties: number;
    injuries: number;
    fatalities: number;
    description: string;
  }>
) {
  const session = await requireSession();
  if (!hasPermission(session.role, "edit_incident")) {
    return { success: false, message: "Insufficient permissions." };
  }
  if ((data.status || data.severity) && !hasPermission(session.role, "manage_incident")) {
    return { success: false, message: "Only dispatch and emergency managers can change incident status or severity." };
  }

  const db = await requireDb();
  const [existing] = await db.select().from(incidents).where(eq(incidents.id, incidentId));

  if (!existing) return { success: false, message: "Incident not found." };

  const [updated] = await db
    .update(incidents)
    .set({
      ...data,
      version: existing.version + 1,
      updatedAt: new Date(),
    } as typeof incidents.$inferInsert)
    .where(and(eq(incidents.id, incidentId), eq(incidents.version, existing.version)))
    .returning();

  if (!updated) {
      await incrementMetrics({ lostUpdates: 1 });
      return { success: false, message: "Concurrent edit detected. Refresh and retry." };
  }

  if (data.status && data.status !== existing.status) {
    await db.insert(timelineEvents).values({
      incidentId,
      eventType: "status_change",
      title: `Status: ${existing.status} → ${data.status}`,
      userId: session.id,
      agencyId: session.agencyId,
    });
  }

  if (data.severity && data.severity !== existing.severity) {
    await db.insert(timelineEvents).values({
      incidentId,
      eventType: "severity_change",
      title: `Severity: ${existing.severity} → ${data.severity}`,
      userId: session.id,
      agencyId: session.agencyId,
    });
  }

  broadcastEvent("incident_updated", { incident: updated });
  return { success: true, incident: updated };
}

export async function updateResourceStatusAction(
  resourceId: string,
  status: string
) {
  const session = await requireSession();
  const db = await requireDb();

  const [resource] = await db
    .update(resources)
    .set({ status: status as typeof resources.$inferInsert.status, updatedAt: new Date() })
    .where(eq(resources.id, resourceId))
    .returning();

  broadcastEvent("resource_updated", { resource });
  return { success: true, resource };
}

export async function updatePresenceAction(
  incidentId: string | null,
  pageContext: string,
  isTyping = false
) {
  const session = await requireSession();
  const db = await requireDb();

  const incidentCondition = incidentId
    ? eq(presence.incidentId, incidentId)
    : isNull(presence.incidentId);

  const [existing] = await db
    .select({ id: presence.id })
    .from(presence)
    .where(and(eq(presence.userId, session.id), incidentCondition))
    .limit(1);

  if (existing) {
    await db
      .update(presence)
      .set({ pageContext, isTyping, lastSeenAt: new Date() })
      .where(eq(presence.id, existing.id));
  } else {
    await db.insert(presence).values({
      userId: session.id,
      incidentId,
      pageContext,
      isTyping,
      lastSeenAt: new Date(),
    });
  }

  broadcastEvent("presence_updated", {
    userId: session.id,
    name: session.name,
    role: session.role,
    incidentId,
    pageContext,
    isTyping,
  });
}

export async function getConsistencyMetricsAction() {
  const db = await requireDb();
  await ensureMetrics();
  const [metrics] = await db.select().from(consistencyMetrics).limit(1);
  const [conflictCount] = await db.select({ count: count() }).from(conflictLogs);
  return {
    ...(metrics ?? {
      transactionsProcessed: 0,
      conflictsPrevented: 0,
      duplicateAssignmentsPrevented: 0,
      lostUpdates: 0,
      rejectedTransactions: 0,
      consistencyScore: "100.00",
    }),
    totalConflicts: conflictCount?.count ?? 0,
  };
}

export async function getCommandCenterDataAction() {
  const db = await requireDb();
  const activeIncidents = await db
    .select()
    .from(incidents)
    .where(eq(incidents.status, "active"))
    .orderBy(desc(incidents.severity), desc(incidents.updatedAt))
    .limit(20);

  // Aggregate resource counts in the database instead of loading every row.
  const statusCounts = await db
    .select({ status: resources.status, count: count() })
    .from(resources)
    .groupBy(resources.status);

  const byStatus: Record<string, number> = {};
  let total = 0;
  for (const row of statusCounts) {
    const n = Number(row.count);
    byStatus[row.status] = n;
    total += n;
  }
  const availableCount = byStatus["available"] ?? 0;

  const recentTimeline = await db
    .select()
    .from(timelineEvents)
    .orderBy(desc(timelineEvents.createdAt))
    .limit(50);

  const agencyList = await db.select().from(agencies);
  const metrics = await getConsistencyMetricsAction();

  return {
    activeIncidents,
    resourceStats: {
      total,
      available: availableCount,
      assigned: total - availableCount,
      enRoute: byStatus["en_route"] ?? 0,
      onScene: byStatus["on_scene"] ?? 0,
    },
    recentTimeline,
    agencies: agencyList,
    metrics,
  };
}

export async function getPublicDashboardAction() {
  const db = await requireDb();
  const allIncidents = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.updatedAt))
    .limit(50);

  const events = await db
    .select()
    .from(timelineEvents)
    .where(sql`${timelineEvents.eventType} != 'ai_recommendation'`)
    .orderBy(desc(timelineEvents.createdAt))
    .limit(500);

  return { incidents: allIncidents, events };
}

export async function getIncidentsListAction() {
  const db = await requireDb();
  const rows = await db
    .select()
    .from(incidents)
    .orderBy(desc(incidents.severity), desc(incidents.updatedAt))
    .limit(200);
  return { incidents: rows };
}

export async function getIncidentDetailAction(incidentId: string) {
  const db = await requireDb();
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident) return null;

  const updates = await db
    .select({
      id: incidentUpdates.id,
      content: incidentUpdates.content,
      updateType: incidentUpdates.updateType,
      createdAt: incidentUpdates.createdAt,
      userName: users.name,
      agencyName: agencies.name,
      agencyType: agencies.type,
    })
    .from(incidentUpdates)
    .innerJoin(users, eq(incidentUpdates.userId, users.id))
    .innerJoin(agencies, eq(incidentUpdates.agencyId, agencies.id))
    .where(eq(incidentUpdates.incidentId, incidentId))
    .orderBy(desc(incidentUpdates.createdAt));

  const assignments = await db
    .select({
      id: resourceAssignments.id,
      resourceId: resourceAssignments.resourceId,
      status: resourceAssignments.status,
      assignedAt: resourceAssignments.assignedAt,
      callSign: resources.callSign,
      name: resources.name,
      type: resources.type,
      assignedByName: users.name,
    })
    .from(resourceAssignments)
    .innerJoin(resources, eq(resourceAssignments.resourceId, resources.id))
    .innerJoin(users, eq(resourceAssignments.assignedById, users.id))
    .where(and(eq(resourceAssignments.incidentId, incidentId), isNull(resourceAssignments.releasedAt)))
    .orderBy(desc(resourceAssignments.assignedAt));

  const timeline = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.incidentId, incidentId))
    .orderBy(desc(timelineEvents.createdAt));

  const activePresence = await db
    .select({
      userId: presence.userId,
      isTyping: presence.isTyping,
      lastSeenAt: presence.lastSeenAt,
      userName: users.name,
      userRole: users.role,
    })
    .from(presence)
    .innerJoin(users, eq(presence.userId, users.id))
    .where(eq(presence.incidentId, incidentId));

  return { incident, updates, assignments, timeline, presence: activePresence };
}

export async function getResourcesAction() {
  const db = await requireDb();
  return db
    .select({
      id: resources.id,
      callSign: resources.callSign,
      name: resources.name,
      type: resources.type,
      status: resources.status,
      latitude: resources.latitude,
      longitude: resources.longitude,
      version: resources.version,
      currentIncidentId: resources.currentIncidentId,
      agencyName: agencies.name,
    })
    .from(resources)
    .innerJoin(agencies, eq(resources.agencyId, agencies.id))
    .orderBy(resources.callSign);
}

export async function getMapDataAction() {
  const db = await requireDb();
  const activeIncidents = await db
    .select()
    .from(incidents)
    .where(eq(incidents.status, "active"));

  const allResources = await db.select().from(resources);
  const zones = await db.select().from(evacuationZones);
  const closures = await db.select().from(roadClosures);

  return { incidents: activeIncidents, resources: allResources, zones, closures };
}

export async function getReplayDataAction(incidentId: string, timestamp?: string) {
  const db = await requireDb();
  const cutoff = timestamp ? new Date(timestamp) : new Date();

  const timeline = await db
    .select()
    .from(timelineEvents)
    .where(
      and(
        eq(timelineEvents.incidentId, incidentId),
        lte(timelineEvents.createdAt, cutoff)
      )
    )
    .orderBy(timelineEvents.createdAt);

  const assignments = await db
    .select({
      id: resourceAssignments.id,
      callSign: resources.callSign,
      status: resourceAssignments.status,
      assignedAt: resourceAssignments.assignedAt,
    })
    .from(resourceAssignments)
    .innerJoin(resources, eq(resourceAssignments.resourceId, resources.id))
    .where(
      and(
        eq(resourceAssignments.incidentId, incidentId),
        lte(resourceAssignments.assignedAt, cutoff)
      )
    );

  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));

  return { incident, timeline, assignments, timestamp: cutoff.toISOString() };
}

export async function runHurricaneSimulationAction() {
  const session = await requireSession();
  if (!hasPermission(session.role, "run_simulation")) {
    return { success: false, message: "Only Emergency Managers can run simulations." };
  }

  const db = await requireDb();
  const [simulation] = await db
    .insert(simulations)
    .values({
      name: "Hurricane Response Simulation",
      type: "hurricane",
      status: "running",
    })
    .returning();

  broadcastEvent("simulation_started", { simulationId: simulation.id });

  const incidentTitles = [
    "Flooding - Riverside District",
    "Power Outage - Grid Sector 7",
    "Structural Collapse - Harbor View",
    "Medical Emergency - Shelter Alpha",
    "Gas Leak - Industrial Park",
    "Tree Down - Highway 101",
    "Evacuation Required - Coastal Zone",
    "Search and Rescue - Submerged Vehicle",
  ];

  const severities = ["low", "medium", "high", "critical", "catastrophic"] as const;
  let updatesGenerated = 0;
  const conflictsPrevented = 0;

  const baseLat = 30.2672;
  const baseLng = -97.7431;

  // Insert rows in batches to respect Aurora DSQL's 3,000-rows-per-transaction
  // limit while avoiding thousands of sequential round-trips.
  const BATCH_SIZE = 500;
  async function batchInsert<T>(table: Parameters<typeof db.insert>[0], rows: T[]) {
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      await db.insert(table).values(rows.slice(i, i + BATCH_SIZE) as never);
    }
  }

  const incidentRows = Array.from({ length: 100 }, (_, i) => ({
    incidentNumber: generateIncidentNumber(),
    title: incidentTitles[i % incidentTitles.length] + ` #${i + 1}`,
    description: `Hurricane simulation incident ${i + 1}`,
    status: i < 80 ? "active" : "contained",
    severity: severities[i % severities.length],
    location: `Sim Zone ${Math.floor(i / 10) + 1}, Travis County`,
    latitude: (baseLat + (Math.random() - 0.5) * 0.3).toFixed(7),
    longitude: (baseLng + (Math.random() - 0.5) * 0.3).toFixed(7),
    casualties: Math.floor(Math.random() * 20),
    injuries: Math.floor(Math.random() * 50),
    createdById: session.id,
  }));
  await batchInsert(incidents, incidentRows);
  updatesGenerated += 100 * 3;

  const agencyList = await db.select().from(agencies);
  const types = [
    "ambulance",
    "fire_engine",
    "police_vehicle",
    "rescue_team",
    "hazmat_team",
    "search_rescue",
  ] as const;

  const resourceRows = Array.from({ length: 500 }, (_, i) => {
    const type = types[i % types.length];
    return {
      callSign: `SIM-${type.toUpperCase().slice(0, 3)}-${String(i + 1).padStart(3, "0")}`,
      name: `Sim ${type.replace("_", " ")} ${i + 1}`,
      type,
      status: i % 5 === 0 ? "available" : "assigned",
      agencyId: agencyList[i % agencyList.length].id,
      latitude: (baseLat + (Math.random() - 0.5) * 0.3).toFixed(7),
      longitude: (baseLng + (Math.random() - 0.5) * 0.3).toFixed(7),
    };
  });
  await batchInsert(resources, resourceRows);
  updatesGenerated += 500 * 2;

  const timelineRows = Array.from({ length: 900 }, (_, i) => ({
    eventType: "simulation_event",
    title: `Simulation update ${i + 1}`,
    description: `Automated hurricane response update batch ${Math.floor(i / 100) + 1}`,
    metadata: JSON.stringify({ simulationId: simulation.id, batch: i }),
  }));
  await batchInsert(timelineEvents, timelineRows);
  updatesGenerated += 900;

  await db
    .update(simulations)
    .set({
      incidentsCreated: 100,
      respondersCreated: 500,
      updatesGenerated,
      conflictsPrevented,
      completedAt: new Date(),
      status: "completed",
    })
    .where(eq(simulations.id, simulation.id));

  await incrementMetrics({
    transactionsProcessed: updatesGenerated,
    conflictsPrevented,
  });

  broadcastEvent("simulation_completed", {
    simulationId: simulation.id,
    incidentsCreated: 100,
    respondersCreated: 500,
    updatesGenerated,
  });
  broadcastEvent("consistency_updated", {});

  return {
    success: true,
    simulation: {
      ...simulation,
      incidentsCreated: 100,
      respondersCreated: 500,
      updatesGenerated,
      conflictsPrevented,
      status: "completed",
    },
  };
}

export async function getAIRecommendationsAction(incidentId: string) {
  const db = await requireDb();
  const [incident] = await db.select().from(incidents).where(eq(incidents.id, incidentId));
  if (!incident) return [];

  const allResources = await db.select().from(resources);
  const availableEms = allResources.filter(
    (r) => r.type === "ambulance" && r.status === "available"
  ).length;
  const availableFire = allResources.filter(
    (r) => r.type === "fire_engine" && r.status === "available"
  ).length;
  const closures = await db
    .select()
    .from(roadClosures)
    .where(eq(roadClosures.incidentId, incidentId));

  const recommendations: Array<{
    priority: "critical" | "high" | "medium";
    category: string;
    recommendation: string;
    rationale: string;
  }> = [];

  const casualties = incident.casualties + incident.injuries;

  if (casualties > 10 && availableEms < 4) {
    recommendations.push({
      priority: "critical",
      category: "Mutual Aid",
      recommendation: `Request ${Math.max(4, Math.ceil(casualties / 5))} additional EMS units from neighboring county.`,
      rationale: `${casualties} casualties reported with only ${availableEms} EMS units available county-wide.`,
    });
  }

  if (incident.severity === "catastrophic" || incident.severity === "critical") {
    recommendations.push({
      priority: "critical",
      category: "Evacuation",
      recommendation: "Establish 2-mile evacuation perimeter and activate shelter-in-place protocols for downwind zones.",
      rationale: `Incident severity rated ${incident.severity}. Immediate public safety action required.`,
    });
  }

  if (closures.length > 0) {
    recommendations.push({
      priority: "high",
      category: "Traffic Management",
      recommendation: "Deploy additional police units to alternate routes. Estimated 45-minute delay on primary response corridors.",
      rationale: `${closures.length} road closure(s) affecting response routes.`,
    });
  }

  if (availableFire < 2 && incident.title.toLowerCase().includes("fire")) {
    recommendations.push({
      priority: "high",
      category: "Fire Response",
      recommendation: "Request 3 mutual aid fire engines from adjacent jurisdictions.",
      rationale: "Insufficient fire resources for structural incident profile.",
    });
  }

  if (incident.title.toLowerCase().includes("chemical") || incident.title.toLowerCase().includes("hazmat")) {
    recommendations.push({
      priority: "critical",
      category: "Hazmat",
      recommendation: "Deploy hazmat team with Level A PPE. Establish hot/warm/cold zones immediately.",
      rationale: "Chemical incident detected. EPA notification may be required within 15 minutes.",
    });
  }

  recommendations.push({
    priority: "medium",
    category: "Command Structure",
    recommendation: "Activate Unified Command with Fire as lead agency. Establish staging area 0.5 miles upwind.",
    rationale: "Multi-agency response requires unified incident command for optimal coordination.",
  });

  await db.insert(timelineEvents).values({
    incidentId,
    eventType: "ai_recommendation",
    title: "AI Incident Commander analysis complete",
    description: `${recommendations.length} recommendations generated.`,
    metadata: JSON.stringify(recommendations),
  });

  return recommendations;
}

export async function getConflictLogsAction() {
  const db = await requireDb();
  return db
    .select({
      id: conflictLogs.id,
      message: conflictLogs.message,
      conflictType: conflictLogs.conflictType,
      resolvedAt: conflictLogs.resolvedAt,
      attemptedByName: users.name,
      resourceCallSign: resources.callSign,
    })
    .from(conflictLogs)
    .leftJoin(users, eq(conflictLogs.attemptedById, users.id))
    .leftJoin(resources, eq(conflictLogs.resourceId, resources.id))
    .orderBy(desc(conflictLogs.resolvedAt))
    .limit(20);
}

export async function getTimelineForReplayAction(incidentId: string) {
  const db = await requireDb();
  const events = await db
    .select()
    .from(timelineEvents)
    .where(eq(timelineEvents.incidentId, incidentId))
    .orderBy(timelineEvents.createdAt);

  if (events.length === 0) return { start: null, end: null, events: [] };

  return {
    start: events[0].createdAt.toISOString(),
    end: events[events.length - 1].createdAt.toISOString(),
    events,
  };
}

export async function loginAction(email: string, password: string) {
  const db = await requireDb();
  const bcrypt = await import("bcryptjs");
  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user) return { success: false, message: "Invalid credentials." };

  const valid = await bcrypt.compare(password, user.passwordHash);
  if (!valid) return { success: false, message: "Invalid credentials." };

  const { setSession } = await import("@/lib/auth/session");
  await setSession(user.id);
  return { success: true, role: user.role as UserRole };
}

export async function logoutAction() {
  const { clearSession } = await import("@/lib/auth/session");
  await clearSession();
}

export async function getDemoUsersAction() {
  const db = await requireDb();
  return db
    .select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      agencyName: agencies.name,
    })
    .from(users)
    .innerJoin(agencies, eq(users.agencyId, agencies.id))
    .orderBy(users.role);
}
