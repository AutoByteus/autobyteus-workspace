import fs from "node:fs";
import path from "node:path";

/** Minimal strict sidecars for attachment fixtures; no mocked admission or identity fallback. */
export function writeAttachmentSidecars(directory: string, family: "team" | "org", id: string,
  delegatorAgentRunId: string, tasks: readonly {
    address: string; agentRunId?: string; teamRunId?: string; startedAt: string; settledAt: string | null;
  }[] = []): void {
  fs.mkdirSync(directory, { recursive: true });
  const identity = family === "team" ? { rootTeamRunId: id } : { subjectKind: "agent_org", orgRunId: id };
  const records = tasks.map((task, i) => ({ taskId: `attachment-task-${i}`, delegatorAgentRunId,
    recipientAddress: task.address, taskExecution: task.agentRunId ? { agentRunId: task.agentRunId } : { teamRunId: task.teamRunId },
    description: "Retained attachment test execution", referenceFiles: [], createdAt: task.startedAt,
    status: task.settledAt ? "interrupted" : "active",
    updates: task.settledAt ? [{ interruptionId: `attachment-stop-${i}`, reason: "Fixture stopped", createdAt: task.settledAt }] : [],
  }));
  fs.writeFileSync(path.join(directory, family === "team" ? "task_delegation_records.json" : "agent_org_task_delegation_records.json"),
    JSON.stringify({ schemaVersion: 1, ...identity, records }));
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
