import fs from "node:fs";
import path from "node:path";
import { writeMessageLogFixtureSync } from "./message-log-fixtures.js";

/** Minimal (empty) message log for attachment fixtures; task-records files are not part of a current package. */
export function writeAttachmentSidecars(directory: string, family: "team" | "org"): void {
  writeMessageLogFixtureSync(directory, family === "team" ? "team_communication_messages" : "agent_org_communication_messages");
}

export function writeAttachmentAgentMetadata(memoryDir: string, runId: string): void {
  const directory = path.join(memoryDir, "agents", runId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "run_metadata.json"), JSON.stringify({ runId, agentDefinitionId: "attachment-fixture",
    workspaceRootPath: path.dirname(memoryDir), memoryDir: directory, llmModelIdentifier: "fixture-model",
    llmConfig: null, autoExecuteTools: false, runtimeKind: "autobyteus", platformAgentRunId: null,
    preparedAt: null, preparedExpiresAt: null, startedAt: "2026-09-01T00:00:00.000Z", applicationExecutionContext: null }));
}
