ALTER TABLE "channel_bindings" ADD COLUMN "agent_definition_id" TEXT;
ALTER TABLE "channel_bindings" ADD COLUMN "workspace_root_path" TEXT;
ALTER TABLE "channel_bindings" ADD COLUMN "llm_model_identifier" TEXT;
ALTER TABLE "channel_bindings" ADD COLUMN "runtime_kind" TEXT;
ALTER TABLE "channel_bindings" ADD COLUMN "auto_execute_tools" BOOLEAN;
ALTER TABLE "channel_bindings" ADD COLUMN "skill_access_mode" TEXT;
ALTER TABLE "channel_bindings" ADD COLUMN "llm_config" TEXT;

CREATE INDEX "idx_channel_bindings_agent_definition_id"
ON "channel_bindings"("agent_definition_id");
