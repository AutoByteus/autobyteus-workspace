import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-config.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../autobyteus-server-ts/src/agent-execution/domain/agent-run-event.js";
import { ClaudeAgentRunBackendFactory } from "../../../autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../../../autobyteus-server-ts/src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../../../autobyteus-server-ts/src/agent-execution/backends/claude/session/claude-session-manager.js";
import { ClaudeModelCatalog } from "../../../autobyteus-server-ts/src/llm-management/services/claude-model-catalog.js";
import { RuntimeKind } from "../../../autobyteus-server-ts/src/runtime-management/runtime-kind-enum.js";

const timeoutMs = Number(process.env.CLAUDE_PROBE_TIMEOUT_MS || 180_000);
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (predicate: () => boolean, label: string) => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (predicate()) return;
    await delay(100);
  }
  throw new Error(`Timed out waiting for ${label}`);
};

const fetchClaudeModelIdentifier = async (): Promise<string> => {
  const models = await new ClaudeModelCatalog().listModels();
  const haiku = models.find((model) => model.model_identifier === "haiku") ?? models[0];
  if (!haiku) throw new Error("No Claude model available");
  return haiku.model_identifier;
};

const buildBootstrapper = (workspaceRoot: string) =>
  new ClaudeSessionBootstrapper(
    { resolveWorkingDirectory: async () => workspaceRoot } as any,
    { materializeConfiguredClaudeWorkspaceSkills: async () => [] } as any,
    {
      getAgentDefinitionById: async () => ({
        instructions: [
          "You are in a diagnostic test.",
          "When asked, you must emit visible text before using a tool, then use the requested tool, then emit visible text after the tool result.",
          "Do not add extra commentary beyond the requested tokens.",
        ].join("\n"),
        description: "Claude text-tool-text ordering probe.",
        skillNames: [],
        toolNames: [],
      }),
    } as any,
    { getSkills: () => [] } as any,
  );

const createFactory = (input: { sessionManager: ClaudeSessionManager; workspaceRoot: string; runId: string }) =>
  new ClaudeAgentRunBackendFactory(
    input.sessionManager,
    buildBootstrapper(input.workspaceRoot),
    () => input.runId,
  );

const simplifyEvent = (event: AgentRunEvent, index: number) => ({
  index,
  eventType: event.eventType,
  id: event.payload.id ?? null,
  turnId: event.payload.turnId ?? event.payload.turn_id ?? null,
  segmentType: event.payload.segment_type ?? null,
  invocationId: event.payload.invocation_id ?? null,
  toolName: event.payload.tool_name ?? null,
  delta: event.payload.delta ?? null,
  text: event.payload.text ?? null,
  statusHint: event.statusHint ?? null,
  newStatus: event.payload.new_status ?? null,
});

describe("live Claude text-tool-text stream identity probe", () => {
  it("records segment ids/order for text before and after a tool", async () => {
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-text-tool-text-probe-"));
    const sessionManager = new ClaudeSessionManager();
    const runId = `run-claude-text-tool-text-probe-${randomUUID()}`;
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const factory = createFactory({ sessionManager, workspaceRoot, runId });
    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        agentDefinitionId: "agent-def-claude-text-tool-text-probe",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-claude-text-tool-text-probe",
        skillAccessMode: SkillAccessMode.NONE,
      }),
    );

    const preToken = `PRE_${randomUUID().replace(/-/g, "_")}`;
    const postToken = `POST_${randomUUID().replace(/-/g, "_")}`;
    const targetFilePath = path.join(workspaceRoot, "probe-output.txt");
    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") events.push(event as AgentRunEvent);
    });

    try {
      const prompt = [
        `First, output exactly this text as assistant text before any tool call: ${preToken}`,
        `Second, call the Write tool exactly once to create this file: ${targetFilePath}`,
        "The file content must be exactly: hello from probe",
        `Third, after the Write tool result, output exactly this text: ${postToken}`,
        "Do not use Bash. Do not ask follow-up questions.",
      ].join("\n");
      const sendResult = await backend.postUserMessage(new AgentInputUserMessage(prompt));
      expect(sendResult).toMatchObject({ accepted: true });
      await waitFor(
        () => events.some((event) => event.eventType === AgentRunEventType.AGENT_STATUS && event.payload.new_status === "IDLE"),
        "Claude run to become IDLE",
      );

      const simplified = events.map(simplifyEvent);
      const outputPath = process.env.CLAUDE_PROBE_OUTPUT_PATH;
      if (outputPath) {
        await fs.mkdir(path.dirname(outputPath), { recursive: true });
        await fs.writeFile(outputPath, JSON.stringify({ runId, workspaceRoot, preToken, postToken, events: simplified }, null, 2));
      }

      console.log("CLAUDE_TEXT_TOOL_TEXT_PROBE", JSON.stringify({ runId, workspaceRoot, preToken, postToken, events: simplified }, null, 2));
    } finally {
      unsubscribe();
      await sessionManager.terminateRun(runId).catch(() => undefined);
      await fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
    }
  }, timeoutMs);
});
