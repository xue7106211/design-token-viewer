-- ============================================================================
-- 迁移 0000：协作功能初始表结构 (lightweight_collaboration)
-- 由 drizzle-kit generate 依据 src/lib/db/schema.ts 自动生成
-- 说明：本文件创建令牌协作所需的三张表（文档主表 + 变更日志 + 快照）
-- 注意：若重新运行 drizzle-kit generate，手写注释可能被覆盖
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 令牌文档主表：每行代表一份可协作编辑的设计令牌文档
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "token_documents" (
  "id" text PRIMARY KEY NOT NULL,                       -- 文档唯一 ID（主键，应用层生成的字符串）
  "name" text NOT NULL,                                 -- 文档名称
  "current_json" jsonb NOT NULL,                        -- 当前完整令牌数据（Figma Native JSON，jsonb 便于查询/索引）
  "revision" integer DEFAULT 1 NOT NULL,                -- 修订号，每次保存递增，用于乐观锁/冲突检测
  "updated_at" timestamp with time zone NOT NULL,       -- 最后更新时间（带时区）
  "updated_by" text                                     -- 最后更新者标识（可空）
);

-- ----------------------------------------------------------------------------
-- 变更日志表：记录对某份文档的每一次编辑操作（含前后值对比）
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "change_logs" (
  "id" text PRIMARY KEY NOT NULL,                       -- 日志唯一 ID（主键）
  "document_id" text NOT NULL,                          -- 所属文档 ID（外键，见下方约束）
  "change_type" text NOT NULL,                          -- 变更类型（update_value / set_alias / delete_token 等）
  "token_id" text,                                      -- 关联令牌 ID（分组重命名等操作可为空）
  "token_name" text,                                    -- 关联令牌名称（冗余存储，便于日志展示）
  "old_value" jsonb,                                    -- 变更前的值（可空，如新增操作无旧值）
  "new_value" jsonb,                                    -- 变更后的值（可空，如删除操作无新值）
  "meta" jsonb,                                          -- 附加元数据（任意结构，存上下文信息）
  "actor_name" text NOT NULL,                           -- 操作者署名
  "actor_client_id" text NOT NULL,                      -- 操作者客户端 ID（区分同名不同会话）
  "ip" text NOT NULL,                                   -- 操作者 IP 地址
  "created_at" timestamp with time zone NOT NULL,       -- 日志创建时间（带时区）
  -- 外键：document_id 引用 token_documents.id；删除文档时级联删除其全部日志
  CONSTRAINT "change_logs_document_id_token_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "token_documents"("id") ON DELETE cascade
);

CREATE INDEX IF NOT EXISTS "change_logs_document_created_at_idx"
  ON "change_logs" ("document_id", "created_at");

-- ----------------------------------------------------------------------------
-- 快照表：保存某份文档在特定时刻的完整副本，可用于回滚/恢复
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS "snapshots" (
  "id" text PRIMARY KEY NOT NULL,                       -- 快照唯一 ID（主键）
  "document_id" text NOT NULL,                          -- 所属文档 ID（外键，见下方约束）
  "name" text NOT NULL,                                 -- 快照名称
  "description" text,                                   -- 快照描述（可空）
  "json" jsonb NOT NULL,                                -- 快照时刻的完整令牌数据副本
  "created_by" text NOT NULL,                           -- 快照创建者
  "created_at" timestamp with time zone NOT NULL,       -- 快照创建时间（带时区）
  -- 外键：document_id 引用 token_documents.id；删除文档时级联删除其全部快照
  CONSTRAINT "snapshots_document_id_token_documents_id_fk"
    FOREIGN KEY ("document_id") REFERENCES "token_documents"("id") ON DELETE cascade
);
