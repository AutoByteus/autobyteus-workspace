import fs from "node:fs/promises";
import fsSync from "node:fs";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeAgentRunBackendFactory } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-backend-factory.js";
import { ClaudeSessionBootstrapper } from "../../../src/agent-execution/backends/claude/backend/claude-session-bootstrapper.js";
import { ClaudeSessionManager } from "../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import { ClaudeModelCatalog } from "../../../src/llm-management/services/claude-model-catalog.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeLive = claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;
const FLOW_TEST_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 240_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CLAUDE_BACKEND_EVENT_TIMEOUT_MS || 120_000);
const EVENT_LOG_DIR = process.env.CLAUDE_BACKEND_EVENT_LOG_DIR?.trim() || null;

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
  intervalMs = 100,
): Promise<void> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (await predicate()) {
      return;
    }
    await delay(intervalMs);
  }
  throw new Error(`Condition not met within ${String(timeoutMs)}ms.`);
};

const resolveInvocationId = (payload: Record<string, unknown>): string | null => {
  const candidates = [payload.invocation_id, payload.tool_invocation_id, payload.id];
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.trim().length > 0) {
      return candidate;
    }
  }
  return null;
};

const waitForEvent = async (
  events: AgentRunEvent[],
  predicate: (event: AgentRunEvent) => boolean,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
): Promise<AgentRunEvent> => {
  let matched: AgentRunEvent | undefined;
  try {
    await waitFor(() => {
      matched = events.find(predicate);
      return Boolean(matched);
    }, timeoutMs);
  } catch (error) {
    const eventSummary = events.map((event) => ({
      eventType: event.eventType,
      statusHint: event.statusHint,
      newStatus: event.payload.new_status ?? null,
      segmentType: event.payload.segment_type ?? null,
      invocationId: resolveInvocationId(event.payload),
      toolName: event.payload.tool_name ?? null,
      path: event.payload.path ?? event.payload.file_path ?? event.payload.filePath ?? null,
      status: event.payload.status ?? null,
    }));
    throw new Error(
      `${String(error)}\nObserved Claude backend events:\n${JSON.stringify(eventSummary, null, 2)}`,
    );
  }
  return matched as AgentRunEvent;
};

const fetchClaudeModelIdentifier = async (): Promise<string> => {
  const models = await new ClaudeModelCatalog().listModels();
  const haiku = models.find((model) => model.model_identifier === "haiku");
  if (!haiku) {
    throw new Error("Claude model catalog did not include the expected 'haiku' model.");
  }
  return haiku.model_identifier;
};

const buildBootstrapper = (workspaceRoot: string) =>
  new ClaudeSessionBootstrapper(
    { resolveWorkingDirectory: async () => workspaceRoot } as any,
    { materializeConfiguredClaudeWorkspaceSkills: async () => [] } as any,
    {
      getAgentDefinitionById: async () => ({
        instructions: "Use Claude Code tools when the user explicitly instructs you to. Reply briefly.",
        description: "Live Claude read-only file-change smoke agent.",
        skillNames: [],
        toolNames: [],
      }),
    } as any,
    { getSkills: () => [] } as any,
  );

const writeBackendEventLog = async (testName: string, events: AgentRunEvent[]): Promise<void> => {
  if (!EVENT_LOG_DIR) {
    return;
  }
  await fs.mkdir(EVENT_LOG_DIR, { recursive: true });
  const safeName = testName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  await fs.writeFile(path.join(EVENT_LOG_DIR, `${safeName}.json`), JSON.stringify(events, null, 2), "utf8");
};

describeLive("Claude live Read tool does not become an artifact", () => {
  let sessionManager: ClaudeSessionManager | null = null;
  const createdRunIds = new Set<string>();
  const createdWorkspaces = new Set<string>();

  afterEach(async () => {
    if (sessionManager) {
      for (const runId of createdRunIds) {
        try {
          await sessionManager.terminateRun(runId);
        } catch {
          // best-effort live cleanup
        }
      }
    }
    await Promise.all(
      Array.from(createdWorkspaces).map((workspace) =>
        fs.rm(workspace, { recursive: true, force: true }).catch(() => undefined),
      ),
    );
    createdRunIds.clear();
    createdWorkspaces.clear();
    sessionManager = null;
  }, FLOW_TEST_TIMEOUT_MS);

  it("emits Claude Read lifecycle without FILE_CHANGE", async () => {
    const modelIdentifier = await fetchClaudeModelIdentifier();
    const workspaceRoot = await fs.mkdtemp(path.join(os.tmpdir(), "claude-read-no-file-change-"));
    createdWorkspaces.add(workspaceRoot);
    const readPath = path.join(workspaceRoot, "read-only-target.txt");
    await fs.writeFile(readPath, `read-only-${randomUUID()}\n`, "utf8");

    sessionManager = new ClaudeSessionManager();
    const runId = `run-claude-read-no-file-change-${randomUUID()}`;
    createdRunIds.add(runId);

    const factory = new ClaudeAgentRunBackendFactory(
      sessionManager,
      buildBootstrapper(workspaceRoot),
      () => runId,
    );
    const backend = await factory.createBackend(
      new AgentRunConfig({
        runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
        agentDefinitionId: "agent-def-claude-live-read-no-file-change",
        llmModelIdentifier: modelIdentifier,
        autoExecuteTools: true,
        workspaceId: "workspace-claude-live-read-no-file-change",
        skillAccessMode: SkillAccessMode.NONE,
      }),
    );

    const events: AgentRunEvent[] = [];
    const unsubscribe = backend.subscribeToEvents((event) => {
      if (event && typeof event === "object") {
        events.push(event as AgentRunEvent);
      }
    });

    try {
      const sendResult = await backend.postUserMessage(
        new AgentInputUserMessage(
          [
            "You must call the Read tool exactly once in this turn.",
            "Do not call Write, Edit, MultiEdit, NotebookEdit, or Bash.",
            `Read this exact file path: ${readPath}`,
            "After reading it, reply READ_DONE.",
          ].join("\n"),
        ),
      );
      expect(sendResult.accepted).toBe(true);

      const readStart = await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED &&
          event.payload.tool_name === "Read",
      );
      const invocationId = resolveInvocationId(readStart.payload);
      expect(invocationId).toBeTruthy();
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
          event.payload.tool_name === "Read" &&
          resolveInvocationId(event.payload) === invocationId,
      );
      await waitForEvent(
        events,
        (event) =>
          event.eventType === AgentRunEventType.AGENT_STATUS &&
          event.payload.new_status === "IDLE",
      );

      expect(fsSync.existsSync(readPath)).toBe(true);
      expect(events.some((event) => event.eventType === AgentRunEventType.FILE_CHANGE)).toBe(false);
      expect(
        events.some(
          (event) =>
            event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED &&
            ["Write", "Edit", "MultiEdit", "NotebookEdit"].includes(String(event.payload.tool_name)),
        ),
      ).toBe(false);
    } finally {
      unsubscribe();
      await writeBackendEventLog("claude-live-read-no-file-change", events);
    }
  }, FLOW_TEST_TIMEOUT_MS);
});
