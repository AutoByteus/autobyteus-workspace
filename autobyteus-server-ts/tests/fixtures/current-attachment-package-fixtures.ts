import fs from "node:fs";
import path from "node:path";

/** Minimal strict communication sidecar for attachment fixtures; task-records files are not part of a current package. */
export function writeAttachmentSidecars(directory: string, family: "team" | "org", id: string): void {
  fs.mkdirSync(directory, { recursive: true });
  const identity = family === "team" ? { rootTeamRunId: id } : { subjectKind: "agent_org", orgRunId: id };
  fs.writeFileSync(path.join(directory, family === "team" ? "team_communication_messages.json" : "agent_org_communication_messages.json"),
    JSON.stringify({ schemaVersion: 1, ...identity, messages: [] }));
}

export function writeAttachmentAgentMetadata(memoryDir: string, runId: string): void {
  const directory = path.join(memoryDir, "agents", runId);
  fs.mkdirSync(directory, { recursive: true });
  fs.writeFileSync(path.join(directory, "run_metadata.json"), JSON.stringify({ runId, agentDefinitionId: "attachment-fixture",
    workspaceRootPath: path.dirname(memoryDir), memoryDir: directory, llmModelIdentifier: "fixture-model",
    llmConfig: null, autoExecuteTools: false, skillAccessMode: "NONE", runtimeKind: "autobyteus", platformAgentRunId: null,
    preparedAt: null, preparedExpiresAt: null, startedAt: "2026-09-01T00:00:00.000Z", applicationExecutionContext: null }));
}
