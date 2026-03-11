ALTER TABLE "channel_bindings" ADD COLUMN "team_definition_id" TEXT;

CREATE INDEX "idx_channel_bindings_team_definition_id"
ON "channel_bindings"("team_definition_id");
