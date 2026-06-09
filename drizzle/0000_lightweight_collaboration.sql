CREATE TABLE IF NOT EXISTS "token_documents" (
  "id" text PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "current_json" jsonb NOT NULL,
  "revision" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone NOT NULL,
  "updated_by" text
);

CREATE TABLE IF NOT EXISTS "change_logs" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL,
  "change_type" text NOT NULL,
  "token_id" text,
  "token_name" text,
  "old_value" jsonb,
  "new_value" jsonb,
  "meta" jsonb,
  "actor_name" text NOT NULL,
  "actor_client_id" text NOT NULL,
  "ip" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "change_logs_document_id_token_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "token_documents"("id") ON DELETE cascade
);

CREATE TABLE IF NOT EXISTS "snapshots" (
  "id" text PRIMARY KEY NOT NULL,
  "document_id" text NOT NULL,
  "name" text NOT NULL,
  "description" text,
  "json" jsonb NOT NULL,
  "created_by" text NOT NULL,
  "created_at" timestamp with time zone NOT NULL,
  CONSTRAINT "snapshots_document_id_token_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "token_documents"("id") ON DELETE cascade
);
