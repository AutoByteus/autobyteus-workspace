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
import {
  PREVIEW_BRIDGE_BASE_URL_ENV,
  PREVIEW_BRIDGE_TOKEN_ENV,
} from "../../../src/agent-tools/preview/preview-tool-contract.js";
import {
  PreviewBridgeLiveTestServer,
  buildOpenPreviewToolPrompt,
} from "./preview-bridge-live-test-server.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeBackendIntegration =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

const FLOW_TEST_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);
const EVENT_WAIT_TIMEOUT_MS = Number(process.env.CLAUDE_BACKEND_EVENT_TIMEOUT_MS || 90_000);
const CLAUDE_BACKEND_EVENT_LOG_DIR = process.env.CLAUDE_BACKEND_EVENT_LOG_DIR?.trim() || null;

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

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const fetchClaudeModelIdentifier = async (): Promise<string> => {
  const models = await new ClaudeModelCatalog().listModels();
  if (models.length === 0) {
    throw new Error("No Claude runtime model was returned by ClaudeModelCatalog.");
  }
  const haiku = models.find((model) => model.model_identifier === "haiku");
  if (!haiku) {
    throw new Error("Claude model catalog did not include the expected 'haiku' model.");
  }
  return haiku.model_identifier;
};

const waitForFile = async (
  filePath: string,
  timeoutMs = EVENT_WAIT_TIMEOUT_MS,
  intervalMs = 250,
): Promise<boolean> => {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    if (fsSync.existsSync(filePath)) {
      return true;
    }
    await delay(intervalMs);
  }
  return false;
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
      reason: event.payload.reason ?? null,
      error: event.payload.error ?? null,
    }));
    throw new Error(
      `${String(error)}\nObserved Claude backend events:\n${JSON.stringify(eventSummary, null, 2)}`,
    );
  }
  return matched as AgentRunEvent;
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

const collectText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((row) => collectText(row)).join("\n");
  }
  if (!value || typeof value !== "object") {
    return "";
  }
  return Object.values(value as Record<string, unknown>)
    .map((row) => collectText(row))
    .join("\n");
};

const buildExactWriteToolPrompt = (input: {
  targetFilePath: string;
  targetLines: readonly [string, string];
}): string =>
  [
    "You must call the Write tool exactly once in this turn.",
    "Do not use Bash.",
    "Do not use bash.",
    "Do not ask follow-up questions.",
    `Create file at path: ${input.targetFilePath}`,
    "Write exact content with exactly these two lines and nothing else:",
    input.targetLines[0],
    input.targetLines[1],
    "After the file is created, reply with DONE.",
  ].join("\n");

const buildBootstrapper = (workspaceRoot: string, instructions = "Reply briefly.") =>
  new ClaudeSessionBootstrapper(
    {
      resolveWorkingDirectory: async () => workspaceRoot,
    } as any,
    {
      materializeConfiguredClaudeWorkspaceSkills: async () => [],
    } as any,
    {
      getAgentDefinitionById: async () => ({
        instructions,
        description: "Fallback Claude backend integration instructions.",
        skillNames: [],
      }),
    } as any,
    {
      getSkills: () => [],
    } as any,
  );

const createFactory = (input: {
  sessionManager: ClaudeSessionManager;
  workspaceRoot: string;
  runId: string;
  instructions?: string;
}) =>
  new ClaudeAgentRunBackendFactory(
    input.sessionManager,
    buildBootstrapper(input.workspaceRoot, input.instructions),
    () => input.runId,
  );

const writeBackendEventLog = async (testName: string, events: AgentRunEvent[]): Promise<void> => {
  if (!CLAUDE_BACKEND_EVENT_LOG_DIR) {
    return;
  }
  await fs.mkdir(CLAUDE_BACKEND_EVENT_LOG_DIR, { recursive: true });
  const safeName = testName.replace(/[^a-z0-9_-]+/gi, "-").toLowerCase();
  await fs.writeFile(
    path.join(CLAUDE_BACKEND_EVENT_LOG_DIR, `${safeName}.json`),
    JSON.stringify(events, null, 2),
    "utf8",
  );
};

describeClaudeBackendIntegration("ClaudeAgentRunBackendFactory integration (live transport)", () => {
  let sessionManager: ClaudeSessionManager | null = null;
  let previewBridgeServer: PreviewBridgeLiveTestServer | null = null;
  const createdRunIds = new Set<string>();
  const createdWorkspaces = new Set<string>();
  const originalPreviewBridgeBaseUrl = process.env[PREVIEW_BRIDGE_BASE_URL_ENV];
  const originalPreviewBridgeToken = process.env[PREVIEW_BRIDGE_TOKEN_ENV];

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
    createdRunIds.clear();
    sessionManager = null;
    if (previewBridgeServer) {
      await previewBridgeServer.stop();
      previewBridgeServer = null;
    }
    if (typeof originalPreviewBridgeBaseUrl === "string") {
      process.env[PREVIEW_BRIDGE_BASE_URL_ENV] = originalPreviewBridgeBaseUrl;
    } else {
      delete process.env[PREVIEW_BRIDGE_BASE_URL_ENV];
    }
    if (typeof originalPreviewBridgeToken === "string") {
      process.env[PREVIEW_BRIDGE_TOKEN_ENV] = originalPreviewBridgeToken;
    } else {
      delete process.env[PREVIEW_BRIDGE_TOKEN_ENV];
    }

    await Promise.all(
      Array.from(createdWorkspaces).map((workspaceRoot) =>
        fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined),
      ),
    );
    createdWorkspaces.clear();
  });

  it(
    "converts status and text events for a normal Claude backend turn",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-normal");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-normal-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
      });

      const backend = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-live-normal",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          workspaceId: "workspace-claude-live-normal",
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
        const replyToken = `reply-${randomUUID()}`;
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            `Reply with exactly '${replyToken}'. Include nothing else.`,
          ),
        );
        expect(sendResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "RUNNING" &&
            event.statusHint === "ACTIVE",
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.SEGMENT_CONTENT &&
            event.payload.segment_type === "text",
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.SEGMENT_END &&
            event.payload.segment_type === "text",
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "IDLE" &&
            event.statusHint === "IDLE",
        );

        expect(backend.getStatus()).toBe("IDLE");
        expect(
          events.some(
            (event) =>
              event.eventType === AgentRunEventType.SEGMENT_CONTENT &&
              typeof event.payload.delta === "string" &&
              String(event.payload.delta).includes(replyToken),
          ),
        ).toBe(true);
        expect(
          events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
        ).toBe(false);
      } finally {
        unsubscribe();
        await writeBackendEventLog("claude-backend-normal-turn", events);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "converts approval, tool execution, and success events for an approved Claude Write tool turn",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-approved-tool");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-approved-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
      });

      const backend = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-live-approved",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: false,
          workspaceId: "workspace-claude-live-approved",
          skillAccessMode: SkillAccessMode.NONE,
        }),
      );

      const targetFilePath = path.join(workspaceRoot, "approved-write.txt");
      const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            buildExactWriteToolPrompt({
              targetFilePath,
              targetLines,
            }),
          ),
        );
        expect(sendResult).toEqual({ accepted: true });

        const approvalEvent = await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
        );
        const invocationId = resolveInvocationId(approvalEvent.payload);
        expect(invocationId).toBeTruthy();

        const approveResult = await backend.approveToolInvocation(
          invocationId!,
          true,
          "approved by backend integration test",
        );
        expect(approveResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_APPROVED &&
            resolveInvocationId(event.payload) === invocationId,
        );
        expect(
          events.some(
            (event) =>
              event.eventType === AgentRunEventType.TOOL_EXECUTION_STARTED &&
              resolveInvocationId(event.payload) === invocationId,
          ),
        ).toBe(true);
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
            resolveInvocationId(event.payload) === invocationId,
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "IDLE",
        );

        expect(await waitForFile(targetFilePath)).toBe(true);
        expect(await fs.readFile(targetFilePath, "utf8")).toBe(targetLines.join("\n"));
      } finally {
        unsubscribe();
        await writeBackendEventLog("claude-backend-approved-tool", events);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "converts deny events for a Claude tool approval rejection",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-denied-tool");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-denied-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
      });

      const backend = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-live-denied",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: false,
          workspaceId: "workspace-claude-live-denied",
          skillAccessMode: SkillAccessMode.NONE,
        }),
      );

      const targetFilePath = path.join(workspaceRoot, "denied-write.txt");
      const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            buildExactWriteToolPrompt({
              targetFilePath,
              targetLines,
            }),
          ),
        );
        expect(sendResult).toEqual({ accepted: true });

        const approvalEvent = await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
        );
        const invocationId = resolveInvocationId(approvalEvent.payload);
        expect(invocationId).toBeTruthy();

        const denyResult = await backend.approveToolInvocation(
          invocationId!,
          false,
          "denied by backend integration test",
        );
        expect(denyResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_DENIED &&
            resolveInvocationId(event.payload) === invocationId,
        );

        await delay(1_000);
        expect(fsSync.existsSync(targetFilePath)).toBe(false);
      } finally {
        unsubscribe();
        await writeBackendEventLog("claude-backend-denied-tool", events);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "auto-executes a Claude Write tool turn without approval events",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-autoexec");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-autoexec-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
      });

      const backend = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-live-autoexec",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          workspaceId: "workspace-claude-live-autoexec",
          skillAccessMode: SkillAccessMode.NONE,
        }),
      );

      const targetFilePath = path.join(workspaceRoot, "autoexec-write.txt");
      const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            buildExactWriteToolPrompt({
              targetFilePath,
              targetLines,
            }),
          ),
        );
        expect(sendResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "IDLE",
        );

        expect(
          events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
        ).toBe(false);
        expect(await waitForFile(targetFilePath)).toBe(true);
        expect(await fs.readFile(targetFilePath, "utf8")).toBe(targetLines.join("\n"));
      } finally {
        unsubscribe();
        await writeBackendEventLog("claude-backend-autoexec-tool", events);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "interrupts a pending Claude tool approval through the backend and emits deny/idle events",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-interrupt");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-interrupt-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
      });

      const backend = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-live-interrupt",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: false,
          workspaceId: "workspace-claude-live-interrupt",
          skillAccessMode: SkillAccessMode.NONE,
        }),
      );

      const targetFilePath = path.join(workspaceRoot, "interrupt-write.txt");
      const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            buildExactWriteToolPrompt({
              targetFilePath,
              targetLines,
            }),
          ),
        );
        expect(sendResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED,
        );

        const interruptResult = await backend.interrupt();
        expect(interruptResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) => event.eventType === AgentRunEventType.TOOL_DENIED,
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "IDLE",
        );

        expect(fsSync.existsSync(targetFilePath)).toBe(false);
      } finally {
        unsubscribe();
        await writeBackendEventLog("claude-backend-interrupt-tool", events);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "restores a Claude backend after a tool-using turn and continues the same conversation",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-restore");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-restore-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
      });

      const original = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-live-restore",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          workspaceId: "workspace-claude-live-restore",
          skillAccessMode: SkillAccessMode.NONE,
        }),
      );

      const targetFilePath = path.join(workspaceRoot, "restore-write.txt");
      const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
      const originalEvents: AgentRunEvent[] = [];
      const unsubscribeOriginal = original.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          originalEvents.push(event as AgentRunEvent);
        }
      });

      try {
        const firstResult = await original.postUserMessage(
          new AgentInputUserMessage(
            buildExactWriteToolPrompt({
              targetFilePath,
              targetLines,
            }),
          ),
        );
        expect(firstResult).toEqual({ accepted: true });

        await waitForEvent(
          originalEvents,
          (event) => event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED,
        );
        expect(await waitForFile(targetFilePath)).toBe(true);
        expect(await fs.readFile(targetFilePath, "utf8")).toBe(targetLines.join("\n"));

        const sessionId = original.getPlatformAgentRunId();
        expect(sessionId).toBeTruthy();
        const storedContext = original.getContext();

        const terminateResult = await original.terminate();
        expect(terminateResult).toEqual({ accepted: true });

        const restored = await factory.restoreBackend(storedContext);
        const restoredEvents: AgentRunEvent[] = [];
        const unsubscribeRestored = restored.subscribeToEvents((event) => {
          if (event && typeof event === "object") {
            restoredEvents.push(event as AgentRunEvent);
          }
        });

        const followupToken = `followup-${randomUUID()}`;
        const followupReply = `reply-${randomUUID()}`;
        const secondResult = await restored.postUserMessage(
          new AgentInputUserMessage(
            `Reply with exactly '${followupReply}'. Include nothing else. Token: ${followupToken}`,
          ),
        );
        expect(secondResult).toEqual({ accepted: true });

        await waitForEvent(
          restoredEvents,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "IDLE",
        );

        const messages = await sessionManager.getSessionMessages(sessionId!);
        const renderedConversation = collectText(messages);
        expect(renderedConversation).toContain(path.basename(targetFilePath));
        expect(renderedConversation).toContain(targetLines[0]);
        expect(renderedConversation).toContain(targetLines[1]);
        expect(renderedConversation).toContain(followupToken);
        expect(renderedConversation).toContain(followupReply);

        unsubscribeRestored();
      } finally {
        unsubscribeOriginal();
        await writeBackendEventLog("claude-backend-restore-after-tool", originalEvents);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "executes open_preview through the live Claude preview MCP path",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-backend-preview-tool");
      createdWorkspaces.add(workspaceRoot);
      previewBridgeServer = new PreviewBridgeLiveTestServer();
      await previewBridgeServer.start();
      Object.assign(process.env, previewBridgeServer.getRuntimeEnv());
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-backend-preview-${randomUUID()}`;
      createdRunIds.add(runId);
      const factory = createFactory({
        sessionManager,
        workspaceRoot,
        runId,
        instructions:
          "If the user explicitly instructs you to call open_preview with a JSON argument object, call open_preview exactly once with those exact arguments and do not call any other tool.",
      });

      const backend = await factory.createBackend(
        new AgentRunConfig({
          runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
          agentDefinitionId: "agent-def-claude-preview-live",
          llmModelIdentifier: modelIdentifier,
          autoExecuteTools: true,
          workspaceId: "workspace-claude-preview-live",
          skillAccessMode: SkillAccessMode.NONE,
        }),
      );

      const previewUrl = `http://127.0.0.1:4173/preview-${randomUUID()}`;
      const previewTitle = `Preview ${randomUUID()}`;
      const events: AgentRunEvent[] = [];
      const unsubscribe = backend.subscribeToEvents((event) => {
        if (event && typeof event === "object") {
          events.push(event as AgentRunEvent);
        }
      });

      try {
        const sendResult = await backend.postUserMessage(
          new AgentInputUserMessage(
            buildOpenPreviewToolPrompt({
              url: previewUrl,
              title: previewTitle,
            }),
          ),
        );
        expect(sendResult).toEqual({ accepted: true });

        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.TOOL_EXECUTION_SUCCEEDED &&
            event.payload.tool_name === "open_preview",
        );
        await waitForEvent(
          events,
          (event) =>
            event.eventType === AgentRunEventType.AGENT_STATUS &&
            event.payload.new_status === "IDLE",
        );

        expect(
          events.some((event) => event.eventType === AgentRunEventType.TOOL_APPROVAL_REQUESTED),
        ).toBe(false);
        expect(previewBridgeServer.requests).toHaveLength(1);
        expect(previewBridgeServer.requests[0]).toMatchObject({
          method: "POST",
          path: "/preview/open",
          body: {
            url: previewUrl,
            title: previewTitle,
            wait_until: "load",
          },
        });
      } finally {
        unsubscribe();
        await writeBackendEventLog("claude-backend-preview-tool", events);
      }
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
