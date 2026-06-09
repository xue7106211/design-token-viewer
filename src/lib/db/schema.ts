import { integer, jsonb, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const tokenDocuments = pgTable("token_documents", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  currentJson: jsonb("current_json").notNull().$type<unknown>(),
  revision: integer("revision").notNull().default(1),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull(),
  updatedBy: text("updated_by"),
});

export const changeLogs = pgTable("change_logs", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => tokenDocuments.id, { onDelete: "cascade" }),
  changeType: text("change_type").notNull(),
  tokenId: text("token_id"),
  tokenName: text("token_name"),
  oldValue: jsonb("old_value").$type<unknown>(),
  newValue: jsonb("new_value").$type<unknown>(),
  meta: jsonb("meta").$type<Record<string, unknown>>(),
  actorName: text("actor_name").notNull(),
  actorClientId: text("actor_client_id").notNull(),
  ip: text("ip").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});

export const snapshots = pgTable("snapshots", {
  id: text("id").primaryKey(),
  documentId: text("document_id")
    .notNull()
    .references(() => tokenDocuments.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  description: text("description"),
  json: jsonb("json").notNull().$type<unknown>(),
  createdBy: text("created_by").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull(),
});
