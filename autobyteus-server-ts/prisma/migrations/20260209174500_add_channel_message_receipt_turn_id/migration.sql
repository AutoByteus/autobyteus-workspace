ALTER TABLE "channel_message_receipts"
ADD COLUMN "turn_id" TEXT;

CREATE INDEX "idx_channel_message_receipts_agent_turn_id"
ON "channel_message_receipts"("agent_id", "turn_id");
