-- Add sync identity/revision columns required by node sync runtime
ALTER TABLE "agent_definitions" ADD COLUMN "sync_id" TEXT;
ALTER TABLE "agent_definitions" ADD COLUMN "sync_revision" TEXT;

ALTER TABLE "prompts" ADD COLUMN "sync_id" TEXT;
ALTER TABLE "prompts" ADD COLUMN "sync_revision" TEXT;

ALTER TABLE "agent_team_definitions" ADD COLUMN "sync_id" TEXT;
ALTER TABLE "agent_team_definitions" ADD COLUMN "sync_revision" TEXT;

ALTER TABLE "agent_workflow_definitions" ADD COLUMN "sync_id" TEXT;
ALTER TABLE "agent_workflow_definitions" ADD COLUMN "sync_revision" TEXT;

ALTER TABLE "mcp_server_configurations" ADD COLUMN "sync_id" TEXT;
ALTER TABLE "mcp_server_configurations" ADD COLUMN "sync_revision" TEXT;

CREATE UNIQUE INDEX "uq_agent_definitions_sync_id" ON "agent_definitions"("sync_id");
CREATE UNIQUE INDEX "uq_prompts_sync_id" ON "prompts"("sync_id");
CREATE UNIQUE INDEX "uq_agent_team_definitions_sync_id" ON "agent_team_definitions"("sync_id");
CREATE UNIQUE INDEX "uq_agent_workflow_definitions_sync_id" ON "agent_workflow_definitions"("sync_id");
CREATE UNIQUE INDEX "uq_mcp_server_configurations_sync_id" ON "mcp_server_configurations"("sync_id");

-- Tombstone log for delete propagation across nodes
CREATE TABLE "sync_tombstones" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "entity_type" TEXT NOT NULL,
    "sync_id" TEXT NOT NULL,
    "source_node_id" TEXT NOT NULL,
    "source_epoch" INTEGER NOT NULL,
    "sequence" INTEGER NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "uq_sync_tombstones_revision"
ON "sync_tombstones"("entity_type", "sync_id", "source_node_id", "source_epoch", "sequence");

CREATE INDEX "idx_sync_tombstones_entity_sync_id"
ON "sync_tombstones"("entity_type", "sync_id");
