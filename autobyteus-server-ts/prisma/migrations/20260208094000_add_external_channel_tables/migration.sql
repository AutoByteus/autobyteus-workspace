-- CreateTable
CREATE TABLE "channel_bindings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "peer_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL DEFAULT '',
    "target_type" TEXT NOT NULL,
    "agent_id" TEXT,
    "team_id" TEXT,
    "target_node_name" TEXT,
    "allow_transport_fallback" BOOLEAN NOT NULL DEFAULT false,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "channel_ingress_idempotency_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "first_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "channel_callback_idempotency_keys" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "key" TEXT NOT NULL,
    "first_seen_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expires_at" DATETIME,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "channel_message_receipts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "peer_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL DEFAULT '',
    "external_message_id" TEXT NOT NULL,
    "agent_id" TEXT,
    "team_id" TEXT,
    "received_at" DATETIME NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "channel_delivery_events" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "provider" TEXT NOT NULL,
    "transport" TEXT NOT NULL,
    "account_id" TEXT NOT NULL,
    "peer_id" TEXT NOT NULL,
    "thread_id" TEXT NOT NULL DEFAULT '',
    "correlation_message_id" TEXT,
    "callback_idempotency_key" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "error_message" TEXT,
    "metadata_json" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "uq_channel_binding_route" ON "channel_bindings"("provider", "transport", "account_id", "peer_id", "thread_id");

-- CreateIndex
CREATE INDEX "idx_channel_bindings_agent_id" ON "channel_bindings"("agent_id");

-- CreateIndex
CREATE INDEX "idx_channel_bindings_team_id" ON "channel_bindings"("team_id");

-- CreateIndex
CREATE UNIQUE INDEX "channel_ingress_idempotency_keys_key_key" ON "channel_ingress_idempotency_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "channel_callback_idempotency_keys_key_key" ON "channel_callback_idempotency_keys"("key");

-- CreateIndex
CREATE UNIQUE INDEX "uq_channel_message_receipt_dedupe" ON "channel_message_receipts"("provider", "transport", "account_id", "peer_id", "thread_id", "external_message_id");

-- CreateIndex
CREATE INDEX "idx_channel_message_receipts_agent_received_at" ON "channel_message_receipts"("agent_id", "received_at");

-- CreateIndex
CREATE INDEX "idx_channel_message_receipts_team_received_at" ON "channel_message_receipts"("team_id", "received_at");

-- CreateIndex
CREATE UNIQUE INDEX "uq_channel_delivery_events_callback_key" ON "channel_delivery_events"("callback_idempotency_key");

-- CreateIndex
CREATE INDEX "idx_channel_delivery_events_route" ON "channel_delivery_events"("provider", "transport", "account_id", "peer_id", "thread_id");

