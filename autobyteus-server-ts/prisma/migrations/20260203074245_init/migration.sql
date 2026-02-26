-- CreateTable
CREATE TABLE "agent_definitions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "tool_names" TEXT NOT NULL DEFAULT '[]',
    "input_processor_names" TEXT NOT NULL DEFAULT '[]',
    "llm_response_processor_names" TEXT NOT NULL DEFAULT '[]',
    "system_prompt_processor_names" TEXT NOT NULL DEFAULT '[]',
    "tool_execution_result_processor_names" TEXT NOT NULL DEFAULT '[]',
    "tool_invocation_preprocessor_names" TEXT NOT NULL DEFAULT '[]',
    "lifecycle_processor_names" TEXT NOT NULL DEFAULT '[]',
    "skill_names" TEXT NOT NULL DEFAULT '[]'
);

-- CreateTable
CREATE TABLE "agent_prompt_mappings" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agent_definition_id" INTEGER NOT NULL,
    "prompt_name" TEXT NOT NULL,
    "prompt_category" TEXT NOT NULL,
    CONSTRAINT "agent_prompt_mappings_agent_definition_id_fkey" FOREIGN KEY ("agent_definition_id") REFERENCES "agent_definitions" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "prompts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "category" TEXT NOT NULL,
    "prompt_content" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 1,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "parent_id" INTEGER,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "description" TEXT,
    "suitable_for_models" TEXT
);

-- CreateTable
CREATE TABLE "agent_conversations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agent_id" TEXT NOT NULL,
    "agent_definition_id" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "llm_model" TEXT,
    "use_xml_tool_format" BOOLEAN NOT NULL DEFAULT false
);

-- CreateTable
CREATE TABLE "agent_conversation_messages" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agent_conversation_id" INTEGER NOT NULL,
    "role" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "original_message" TEXT,
    "context_paths" TEXT,
    "timestamp" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "token_count" INTEGER,
    "cost" REAL,
    "reasoning" TEXT,
    "image_urls" TEXT,
    "audio_urls" TEXT,
    "video_urls" TEXT,
    CONSTRAINT "agent_conversation_messages_agent_conversation_id_fkey" FOREIGN KEY ("agent_conversation_id") REFERENCES "agent_conversations" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "agent_team_definitions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "role" TEXT,
    "nodes" TEXT NOT NULL,
    "coordinator_member_name" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "agent_workflow_definitions" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "nodes" TEXT NOT NULL,
    "begin_node_id" TEXT NOT NULL,
    "end_node_id" TEXT NOT NULL
);

-- CreateTable
CREATE TABLE "token_usage_records" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "usage_record_id" TEXT NOT NULL,
    "agent_id" TEXT NOT NULL,
    "role" TEXT NOT NULL,
    "token_count" INTEGER NOT NULL,
    "cost" REAL NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "llm_model" TEXT
);

-- CreateTable
CREATE TABLE "agent_artifacts" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "agent_id" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "workspace_root" TEXT,
    "url" TEXT,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateTable
CREATE TABLE "mcp_server_configurations" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "server_id" TEXT NOT NULL,
    "transport_type" TEXT NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "tool_name_prefix" TEXT,
    "config_details" TEXT NOT NULL,
    "created_at" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" DATETIME NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "agent_definitions_name_key" ON "agent_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_prompt_mappings_agent_definition_id_key" ON "agent_prompt_mappings"("agent_definition_id");

-- CreateIndex
CREATE UNIQUE INDEX "uq_prompt_version" ON "prompts"("name", "category", "version", "suitable_for_models");

-- CreateIndex
CREATE UNIQUE INDEX "agent_conversations_agent_id_key" ON "agent_conversations"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "agent_team_definitions_name_key" ON "agent_team_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "agent_workflow_definitions_name_key" ON "agent_workflow_definitions"("name");

-- CreateIndex
CREATE UNIQUE INDEX "token_usage_records_usage_record_id_key" ON "token_usage_records"("usage_record_id");

-- CreateIndex
CREATE INDEX "agent_artifacts_agent_id_idx" ON "agent_artifacts"("agent_id");

-- CreateIndex
CREATE UNIQUE INDEX "mcp_server_configurations_server_id_key" ON "mcp_server_configurations"("server_id");
