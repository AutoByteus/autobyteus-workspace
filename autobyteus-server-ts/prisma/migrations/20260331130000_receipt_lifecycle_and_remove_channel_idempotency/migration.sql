DROP TABLE IF EXISTS "channel_ingress_idempotency_keys";
DROP TABLE IF EXISTS "channel_callback_idempotency_keys";

PRAGMA foreign_keys=OFF;

DROP INDEX IF EXISTS "idx_channel_message_receipts_agent_received_at";
DROP INDEX IF EXISTS "idx_channel_message_receipts_agent_turn_id";
DROP INDEX IF EXISTS "idx_channel_message_receipts_team_received_at";

ALTER TABLE "channel_message_receipts" RENAME TO "channel_message_receipts_old";

CREATE TABLE "channel_message_receipts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "peer_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL DEFAULT '',
    "external_message_id" TEXT NOT NULL,
    "ingress_state" TEXT NOT NULL DEFAULT 'PENDING',
    "turn_id" TEXT,
    "agent_id" TEXT,
    "team_id" TEXT,
    "dispatch_lease_token" TEXT,
    "dispatch_lease_expires_at" DATETIME,
    "received_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

INSERT INTO "channel_message_receipts" (
    "id",
    "provider",
    "transport",
    "account_id",
    "peer_id",
    "thread_id",
    "external_message_id",
    "ingress_state",
    "turn_id",
    "agent_id",
    "team_id",
    "dispatch_lease_token",
    "dispatch_lease_expires_at",
    "received_at",
    "created_at",
    "updated_at"
)
SELECT
    "id",
    "provider",
    "transport",
    "account_id",
    "peer_id",
    "thread_id",
    "external_message_id",
    'ROUTED',
    "turn_id",
    "agent_id",
    "team_id",
    NULL,
    NULL,
    "received_at",
    "created_at",
    "updated_at"
FROM "channel_message_receipts_old";

DROP TABLE "channel_message_receipts_old";

CREATE UNIQUE INDEX "uq_channel_message_receipt_dedupe"
ON "channel_message_receipts"(
    "provider",
    "transport",
    "account_id",
    "peer_id",
    "thread_id",
    "external_message_id"
);

CREATE INDEX "idx_channel_message_receipts_state_agent_received_at"
ON "channel_message_receipts"("ingress_state", "agent_id", "received_at");

CREATE INDEX "idx_channel_message_receipts_state_agent_turn_id"
ON "channel_message_receipts"("ingress_state", "agent_id", "turn_id");

CREATE INDEX "idx_channel_message_receipts_state_team_received_at"
ON "channel_message_receipts"("ingress_state", "team_id", "received_at");

PRAGMA foreign_keys=ON;
