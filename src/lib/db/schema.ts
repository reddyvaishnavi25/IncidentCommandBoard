import {
  pgTable,
  uuid,
  varchar,
  text,
  timestamp,
  integer,
  boolean,
  decimal,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";

export const agencies = pgTable("agencies", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: text("type").notNull(),
  callSign: varchar("call_sign", { length: 50 }),
  contactPhone: varchar("contact_phone", { length: 20 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: varchar("email", { length: 255 }).notNull(),
  passwordHash: varchar("password_hash", { length: 255 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  role: text("role").notNull(),
  agencyId: uuid("agency_id").notNull(),
  badgeNumber: varchar("badge_number", { length: 50 }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const incidents = pgTable("incidents", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentNumber: varchar("incident_number", { length: 50 }).notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  status: text("status").default("reported").notNull(),
  severity: text("severity").default("medium").notNull(),
  location: varchar("location", { length: 500 }).notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  casualties: integer("casualties").default(0).notNull(),
  injuries: integer("injuries").default(0).notNull(),
  fatalities: integer("fatalities").default(0).notNull(),
  createdById: uuid("created_by_id"),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const incidentUpdates = pgTable("incident_updates", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id").notNull(),
  userId: uuid("user_id").notNull(),
  agencyId: uuid("agency_id").notNull(),
  content: text("content").notNull(),
  updateType: varchar("update_type", { length: 50 }).default("general").notNull(),
  version: integer("version").default(1).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resources = pgTable("resources", {
  id: uuid("id").primaryKey().defaultRandom(),
  callSign: varchar("call_sign", { length: 50 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  type: text("type").notNull(),
  status: text("status").default("available").notNull(),
  agencyId: uuid("agency_id").notNull(),
  latitude: decimal("latitude", { precision: 10, scale: 7 }),
  longitude: decimal("longitude", { precision: 10, scale: 7 }),
  capacity: integer("capacity").default(1).notNull(),
  version: integer("version").default(1).notNull(),
  currentIncidentId: uuid("current_incident_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const resourceAssignments = pgTable("resource_assignments", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id").notNull(),
  incidentId: uuid("incident_id").notNull(),
  assignedById: uuid("assigned_by_id").notNull(),
  status: text("status").default("assigned").notNull(),
  assignedAt: timestamp("assigned_at", { withTimezone: true }).defaultNow().notNull(),
  releasedAt: timestamp("released_at", { withTimezone: true }),
  notes: text("notes"),
});

export const timelineEvents = pgTable("timeline_events", {
  id: uuid("id").primaryKey().defaultRandom(),
  incidentId: uuid("incident_id"),
  eventType: text("event_type").notNull(),
  title: varchar("title", { length: 500 }).notNull(),
  description: text("description"),
  metadata: text("metadata"),
  userId: uuid("user_id"),
  agencyId: uuid("agency_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const conflictLogs = pgTable("conflict_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  resourceId: uuid("resource_id"),
  incidentId: uuid("incident_id"),
  attemptedById: uuid("attempted_by_id").notNull(),
  winnerId: uuid("winner_id"),
  conflictType: varchar("conflict_type", { length: 100 }).notNull(),
  message: text("message").notNull(),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }).defaultNow().notNull(),
});

export const presence = pgTable("presence", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").notNull(),
  incidentId: uuid("incident_id"),
  pageContext: varchar("page_context", { length: 100 }),
  isTyping: boolean("is_typing").default(false).notNull(),
  lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
});

export const simulations = pgTable("simulations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  type: varchar("type", { length: 100 }).notNull(),
  incidentsCreated: integer("incidents_created").default(0).notNull(),
  respondersCreated: integer("responders_created").default(0).notNull(),
  updatesGenerated: integer("updates_generated").default(0).notNull(),
  conflictsPrevented: integer("conflicts_prevented").default(0).notNull(),
  startedAt: timestamp("started_at", { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp("completed_at", { withTimezone: true }),
  status: varchar("status", { length: 50 }).default("running").notNull(),
});

export const auditLogs = pgTable("audit_logs", {
  id: uuid("id").primaryKey().defaultRandom(),
  action: varchar("action", { length: 100 }).notNull(),
  entityType: varchar("entity_type", { length: 100 }).notNull(),
  entityId: uuid("entity_id"),
  userId: uuid("user_id"),
  details: text("details"),
  transactionId: varchar("transaction_id", { length: 100 }),
  success: boolean("success").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const consistencyMetrics = pgTable("consistency_metrics", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionsProcessed: integer("transactions_processed").default(0).notNull(),
  conflictsPrevented: integer("conflicts_prevented").default(0).notNull(),
  duplicateAssignmentsPrevented: integer("duplicate_assignments_prevented").default(0).notNull(),
  lostUpdates: integer("lost_updates").default(0).notNull(),
  rejectedTransactions: integer("rejected_transactions").default(0).notNull(),
  consistencyScore: decimal("consistency_score", { precision: 5, scale: 2 }).default("100.00").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const evacuationZones = pgTable("evacuation_zones", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  incidentId: uuid("incident_id"),
  latitude: decimal("latitude", { precision: 10, scale: 7 }).notNull(),
  longitude: decimal("longitude", { precision: 10, scale: 7 }).notNull(),
  radiusMeters: integer("radius_meters").default(1000).notNull(),
  status: varchar("status", { length: 50 }).default("active").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const roadClosures = pgTable("road_closures", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: varchar("name", { length: 255 }).notNull(),
  incidentId: uuid("incident_id"),
  startLat: decimal("start_lat", { precision: 10, scale: 7 }).notNull(),
  startLng: decimal("start_lng", { precision: 10, scale: 7 }).notNull(),
  endLat: decimal("end_lat", { precision: 10, scale: 7 }).notNull(),
  endLng: decimal("end_lng", { precision: 10, scale: 7 }).notNull(),
  reason: text("reason"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const agenciesRelations = relations(agencies, ({ many }) => ({
  users: many(users),
  resources: many(resources),
}));

export const usersRelations = relations(users, ({ one }) => ({
  agency: one(agencies, { fields: [users.agencyId], references: [agencies.id] }),
}));

export const incidentsRelations = relations(incidents, ({ one, many }) => ({
  createdBy: one(users, { fields: [incidents.createdById], references: [users.id] }),
  updates: many(incidentUpdates),
  assignments: many(resourceAssignments),
  timelineEvents: many(timelineEvents),
}));

export const resourcesRelations = relations(resources, ({ one, many }) => ({
  agency: one(agencies, { fields: [resources.agencyId], references: [agencies.id] }),
  currentIncident: one(incidents, { fields: [resources.currentIncidentId], references: [incidents.id] }),
  assignments: many(resourceAssignments),
}));

export type Agency = typeof agencies.$inferSelect;
export type User = typeof users.$inferSelect;
export type Incident = typeof incidents.$inferSelect;
export type Resource = typeof resources.$inferSelect;
export type ResourceAssignment = typeof resourceAssignments.$inferSelect;
export type TimelineEvent = typeof timelineEvents.$inferSelect;
export type ConflictLog = typeof conflictLogs.$inferSelect;
export type ConsistencyMetric = typeof consistencyMetrics.$inferSelect;
