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
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { ClaudeAgentRunContext } from "../../../src/agent-execution/backends/claude/backend/claude-agent-run-context.js";
import {
  buildClaudeSessionConfig,
  resolveClaudePermissionMode,
} from "../../../src/agent-execution/backends/claude/session/claude-session-config.js";
import { ClaudeSessionManager } from "../../../src/agent-execution/backends/claude/session/claude-session-manager.js";
import { ClaudeSessionEventName } from "../../../src/agent-execution/backends/claude/events/claude-session-event-name.js";
import type { ClaudeSessionEvent } from "../../../src/agent-execution/backends/claude/claude-runtime-shared.js";
import { ClaudeModelCatalog } from "../../../src/llm-management/services/claude-model-catalog.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { buildConfiguredAgentToolExposure } from "../../../src/agent-execution/shared/configured-agent-tool-exposure.js";

const claudeBinaryReady = spawnSync("claude", ["--version"], {
  stdio: "ignore",
}).status === 0;
const liveClaudeTestsEnabled = process.env.RUN_CLAUDE_E2E === "1";
const describeClaudeSessionIntegration =
  claudeBinaryReady && liveClaudeTestsEnabled ? describe : describe.skip;

const FLOW_TEST_TIMEOUT_MS = Number(process.env.CLAUDE_FLOW_TEST_TIMEOUT_MS || 180_000);
const APPROVAL_STEP_TIMEOUT_MS = Number(
  process.env.CLAUDE_APPROVAL_STEP_TIMEOUT_MS || 30_000,
);

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const waitFor = async (
  predicate: () => Promise<boolean> | boolean,
  timeoutMs = FLOW_TEST_TIMEOUT_MS,
  intervalMs = 250,
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

const asObject = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;

const createRunContext = (input: {
  runId: string;
  modelIdentifier: string;
  workspaceRoot: string;
  autoExecuteTools: boolean;
}) =>
  new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
      agentDefinitionId: "claude-session-integration-agent",
      llmModelIdentifier: input.modelIdentifier,
      autoExecuteTools: input.autoExecuteTools,
      workspaceId: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: new ClaudeAgentRunContext({
      sessionConfig: buildClaudeSessionConfig({
        model: input.modelIdentifier,
        workingDirectory: input.workspaceRoot,
        permissionMode: resolveClaudePermissionMode(input.autoExecuteTools),
      }),
      configuredToolExposure: buildConfiguredAgentToolExposure([]),
    }),
  });

const collectText = (value: unknown): string => {
  if (typeof value === "string") {
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((row) => collectText(row)).join("\n");
  }
  const payload = asObject(value);
  if (!payload) {
    return "";
  }
  return Object.values(payload)
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

const normalizeWrittenText = (value: string): string => value.replace(/\r?\n$/u, "");

const waitForTurnSettlement = async (events: ClaudeSessionEvent[]): Promise<void> =>
  waitFor(() =>
    events.some(
      (event) =>
        event.method === ClaudeSessionEventName.TURN_COMPLETED ||
        event.method === ClaudeSessionEventName.ERROR,
    ),
  );

const bootstrapClaudeSession = async (
  session: Awaited<ReturnType<ClaudeSessionManager["createRunSession"]>>,
  events: ClaudeSessionEvent[],
): Promise<void> => {
  const bootstrapToken = `bootstrap-${randomUUID()}`;
  await session.sendTurn(
    new AgentInputUserMessage(`Reply with exactly '${bootstrapToken}'. Include nothing else.`),
  );
  await waitForTurnSettlement(events);
  events.length = 0;
};

describeClaudeSessionIntegration("ClaudeSessionManager integration (live Claude SDK)", () => {
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
    createdRunIds.clear();
    sessionManager = null;

    await Promise.all(
      Array.from(createdWorkspaces).map((workspaceRoot) =>
        fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined),
      ),
    );
    createdWorkspaces.clear();
  });

  it(
    "creates a run session, adopts the SDK session id, and serves conversation from the session boundary",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-create");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-session-${randomUUID()}`;
      createdRunIds.add(runId);
      const session = await sessionManager.createRunSession(
        createRunContext({
          runId,
          modelIdentifier,
          workspaceRoot,
          autoExecuteTools: true,
        }),
      );

      const events: ClaudeSessionEvent[] = [];
      const unsubscribe = session.subscribeRuntimeEvents((event) => {
        events.push(event);
      });

      const userToken = `user-${randomUUID()}`;
      const assistantToken = `assistant-${randomUUID()}`;
      await session.sendTurn(
        new AgentInputUserMessage(
          `Reply with exactly '${assistantToken}'. Include nothing else. User token: ${userToken}`,
        ),
      );

      await waitFor(() =>
        events.some(
          (event) =>
            event.method === ClaudeSessionEventName.TURN_COMPLETED ||
            event.method === ClaudeSessionEventName.ERROR,
        ),
      );

      const resolvedSessionId = session.runContext.runtimeContext.sessionId;
      expect(resolvedSessionId).toBeTruthy();
      expect(resolvedSessionId).not.toBe(runId);
      expect(session.runContext.runtimeContext.hasCompletedTurn).toBe(true);

      const messages = await sessionManager.getSessionMessages(resolvedSessionId!);
      const renderedConversation = collectText(messages);
      expect(renderedConversation).toContain(userToken);
      expect(renderedConversation).toContain(assistantToken);

      unsubscribe();
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "restores a run session against the same Claude session id and continues the conversation",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-restore");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-restore-${randomUUID()}`;
      createdRunIds.add(runId);
      const original = await sessionManager.createRunSession(
        createRunContext({
          runId,
          modelIdentifier,
          workspaceRoot,
          autoExecuteTools: true,
        }),
      );

      const firstPromptToken = `first-${randomUUID()}`;
      const firstReplyToken = `reply-${randomUUID()}`;
      const firstEvents: ClaudeSessionEvent[] = [];
      const unsubscribeOriginal = original.subscribeRuntimeEvents((event) => {
        firstEvents.push(event);
      });

      await original.sendTurn(
        new AgentInputUserMessage(
          `Reply with exactly '${firstReplyToken}'. Include nothing else. Prompt token: ${firstPromptToken}`,
        ),
      );
      await waitFor(() =>
        firstEvents.some(
          (event) =>
            event.method === ClaudeSessionEventName.TURN_COMPLETED ||
            event.method === ClaudeSessionEventName.ERROR,
        ),
      );
      unsubscribeOriginal();

      const sessionId = original.runContext.runtimeContext.sessionId;
      expect(sessionId).toBeTruthy();

      const restored = await sessionManager.restoreRunSession(
        createRunContext({
          runId,
          modelIdentifier,
          workspaceRoot,
          autoExecuteTools: true,
        }),
        sessionId!,
      );

      const secondPromptToken = `second-${randomUUID()}`;
      const secondReplyToken = `reply-${randomUUID()}`;
      const secondEvents: ClaudeSessionEvent[] = [];
      const unsubscribeRestored = restored.subscribeRuntimeEvents((event) => {
        secondEvents.push(event);
      });

      await restored.sendTurn(
        new AgentInputUserMessage(
          `Reply with exactly '${secondReplyToken}'. Include nothing else. Prompt token: ${secondPromptToken}`,
        ),
      );
      await waitFor(() =>
        secondEvents.some(
          (event) =>
            event.method === ClaudeSessionEventName.TURN_COMPLETED ||
            event.method === ClaudeSessionEventName.ERROR,
        ),
      );

      expect(restored.runContext.runtimeContext.sessionId).toBe(sessionId);
      expect(restored.runContext.runtimeContext.hasCompletedTurn).toBe(true);

      const messages = await sessionManager.getSessionMessages(sessionId!);
      const renderedConversation = collectText(messages);
      expect(renderedConversation).toContain(firstPromptToken);
      expect(renderedConversation).toContain(firstReplyToken);
      expect(renderedConversation).toContain(secondPromptToken);
      expect(renderedConversation).toContain(secondReplyToken);

      unsubscribeRestored();
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "requests tool approval and completes the tool-backed turn after approval",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-approval");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();
      const attemptTraces: Array<{
        attempt: number;
        eventMethods: string[];
        approvedInvocationId: string | null;
        failureReason?: string;
      }> = [];

      let resolved = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const runId = `run-claude-approval-${attempt}-${randomUUID()}`;
        createdRunIds.add(runId);
        const session = await sessionManager.createRunSession(
          createRunContext({
            runId,
            modelIdentifier,
            workspaceRoot,
            autoExecuteTools: false,
          }),
        );

        const targetFileName = `test-${attempt}.txt`;
        const targetFilePath = path.join(workspaceRoot, targetFileName);
        const targetLines = [`first-${randomUUID()}`, `second-${randomUUID()}`];
        const events: ClaudeSessionEvent[] = [];
        let approvedInvocationId: string | null = null;
        const unsubscribe = session.subscribeRuntimeEvents((event) => {
          events.push(event);
        });

        try {
          const bootstrapToken = `bootstrap-${randomUUID()}`;
          await session.sendTurn(
            new AgentInputUserMessage(
              `Reply with exactly '${bootstrapToken}'. Include nothing else.`,
            ),
          );

          await waitFor(() =>
            events.some(
              (event) =>
                event.method === ClaudeSessionEventName.TURN_COMPLETED ||
                event.method === ClaudeSessionEventName.ERROR,
            ),
          );
          events.length = 0;

          await session.sendTurn(
            new AgentInputUserMessage(
              [
                "You must call the Write tool exactly once in this turn.",
                "Do not use Bash.",
                "Do not use bash.",
                "Do not ask follow-up questions.",
                `Create file at path: ${targetFilePath}`,
                "Write exact content with exactly these two lines and nothing else:",
                targetLines[0]!,
                targetLines[1]!,
                "After the file is created, reply with DONE.",
              ].join("\n"),
            ),
          );

          await waitFor(() =>
            events.some(
              (event) =>
                event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL ||
                event.method === ClaudeSessionEventName.ERROR,
            ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          const approvalEvent = events.find(
            (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
          );
          approvedInvocationId =
            typeof approvalEvent?.params?.invocation_id === "string"
              ? approvalEvent.params.invocation_id
              : null;
          if (!approvedInvocationId) {
            attemptTraces.push({
              attempt,
              eventMethods: events.map((event) => event.method),
              approvedInvocationId: null,
              failureReason: "approval_invocation_missing",
            });
            continue;
          }

          await session.approveTool(
            approvedInvocationId,
            true,
            "approved by integration test",
          );

          await waitFor(
            () =>
              events.some(
                (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_APPROVED,
              ) &&
              events.some(
                (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_COMPLETED,
              ) &&
              events.some((event) => event.method === ClaudeSessionEventName.TURN_COMPLETED),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          if (!fsSync.existsSync(targetFilePath)) {
            attemptTraces.push({
              attempt,
              eventMethods: events.map((event) => event.method),
              approvedInvocationId,
              failureReason: "target_file_missing_after_approved_completion",
            });
            continue;
          }

          expect(normalizeWrittenText(await fs.readFile(targetFilePath, "utf8"))).toBe(
            targetLines.join("\n"),
          );
          resolved = true;
          break;
        } catch (error) {
          attemptTraces.push({
            attempt,
            eventMethods: events.map((event) => event.method),
            approvedInvocationId,
            failureReason: String(error),
          });
        } finally {
          unsubscribe();
        }
      }

      expect(resolved, JSON.stringify(attemptTraces)).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "requests tool approval and denies the tool-backed turn without creating the target file",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-deny");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();
      const attemptTraces: Array<{
        attempt: number;
        eventMethods: string[];
        deniedInvocationId: string | null;
        failureReason?: string;
      }> = [];

      let resolved = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const runId = `run-claude-deny-${attempt}-${randomUUID()}`;
        createdRunIds.add(runId);
        const session = await sessionManager.createRunSession(
          createRunContext({
            runId,
            modelIdentifier,
            workspaceRoot,
            autoExecuteTools: false,
          }),
        );

        const targetFileName = `deny-${attempt}.txt`;
        const targetFilePath = path.join(workspaceRoot, targetFileName);
        const targetLines = [`first-${randomUUID()}`, `second-${randomUUID()}`];
        const events: ClaudeSessionEvent[] = [];
        let deniedInvocationId: string | null = null;
        const unsubscribe = session.subscribeRuntimeEvents((event) => {
          events.push(event);
        });

        try {
          const bootstrapToken = `bootstrap-${randomUUID()}`;
          await session.sendTurn(
            new AgentInputUserMessage(
              `Reply with exactly '${bootstrapToken}'. Include nothing else.`,
            ),
          );

          await waitFor(() =>
            events.some(
              (event) =>
                event.method === ClaudeSessionEventName.TURN_COMPLETED ||
                event.method === ClaudeSessionEventName.ERROR,
            ),
          );
          events.length = 0;

          await session.sendTurn(
            new AgentInputUserMessage(
              [
                "You must call the Write tool exactly once in this turn.",
                "Do not use Bash.",
                "Do not use bash.",
                "Do not ask follow-up questions.",
                `Create file at path: ${targetFilePath}`,
                "Write exact content with exactly these two lines and nothing else:",
                targetLines[0]!,
                targetLines[1]!,
                "After the file is created, reply with DONE.",
              ].join("\n"),
            ),
          );

          await waitFor(
            () =>
              events.some(
                (event) =>
                  event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL ||
                  event.method === ClaudeSessionEventName.ERROR,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          const approvalEvent = events.find(
            (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
          );
          deniedInvocationId =
            typeof approvalEvent?.params?.invocation_id === "string"
              ? approvalEvent.params.invocation_id
              : null;
          if (!deniedInvocationId) {
            attemptTraces.push({
              attempt,
              eventMethods: events.map((event) => event.method),
              deniedInvocationId: null,
              failureReason: "approval_invocation_missing",
            });
            continue;
          }

          await session.approveTool(
            deniedInvocationId,
            false,
            "denied by integration test",
          );

          await waitFor(
            () =>
              events.some(
                (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          await delay(1_000);

          expect(events.some(
            (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
          )).toBe(true);
          expect(fsSync.existsSync(targetFilePath)).toBe(false);
          resolved = true;
          break;
        } catch (error) {
          attemptTraces.push({
            attempt,
            eventMethods: events.map((event) => event.method),
            deniedInvocationId,
            failureReason: String(error),
          });
        } finally {
          unsubscribe();
        }
      }

      expect(resolved, JSON.stringify(attemptTraces)).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "auto-executes a tool-backed turn without emitting approval requests",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-autoexec");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();
      const attemptTraces: Array<{
        attempt: number;
        eventMethods: string[];
        failureReason?: string;
      }> = [];

      let resolved = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const runId = `run-claude-autoexec-${attempt}-${randomUUID()}`;
        createdRunIds.add(runId);
        const session = await sessionManager.createRunSession(
          createRunContext({
            runId,
            modelIdentifier,
            workspaceRoot,
            autoExecuteTools: true,
          }),
        );

        const targetFileName = `autoexec-${attempt}.txt`;
        const targetFilePath = path.join(workspaceRoot, targetFileName);
        const targetLines = [`first-${randomUUID()}`, `second-${randomUUID()}`];
        const events: ClaudeSessionEvent[] = [];
        const unsubscribe = session.subscribeRuntimeEvents((event) => {
          events.push(event);
        });

        try {
          const bootstrapToken = `bootstrap-${randomUUID()}`;
          await session.sendTurn(
            new AgentInputUserMessage(
              `Reply with exactly '${bootstrapToken}'. Include nothing else.`,
            ),
          );

          await waitFor(() =>
            events.some(
              (event) =>
                event.method === ClaudeSessionEventName.TURN_COMPLETED ||
                event.method === ClaudeSessionEventName.ERROR,
            ),
          );
          events.length = 0;

          await session.sendTurn(
            new AgentInputUserMessage(
              [
                "You must call the Write tool exactly once in this turn.",
                "Do not use Bash.",
                "Do not use bash.",
                "Do not ask follow-up questions.",
                `Create file at path: ${targetFilePath}`,
                "Write exact content with exactly these two lines and nothing else:",
                targetLines[0]!,
                targetLines[1]!,
                "After the file is created, reply with DONE.",
              ].join("\n"),
            ),
          );

          await waitFor(
            () =>
              events.some(
                (event) =>
                  event.method === ClaudeSessionEventName.TURN_COMPLETED ||
                  event.method === ClaudeSessionEventName.ERROR,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          if (!fsSync.existsSync(targetFilePath)) {
            attemptTraces.push({
              attempt,
              eventMethods: events.map((event) => event.method),
              failureReason: "target_file_missing_after_turn_completed",
            });
            continue;
          }

          expect(events.some(
            (event) =>
              event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
          )).toBe(false);
          expect(normalizeWrittenText(await fs.readFile(targetFilePath, "utf8"))).toBe(
            targetLines.join("\n"),
          );
          resolved = true;
          break;
        } catch (error) {
          attemptTraces.push({
            attempt,
            eventMethods: events.map((event) => event.method),
            failureReason: String(error),
          });
        } finally {
          unsubscribe();
        }
      }

      expect(resolved, JSON.stringify(attemptTraces)).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "interrupts a tool-backed turn while approval is pending and leaves the target file untouched",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-interrupt");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();
      const attemptTraces: Array<{
        attempt: number;
        eventMethods: string[];
        failureReason?: string;
      }> = [];

      let resolved = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const runId = `run-claude-interrupt-${attempt}-${randomUUID()}`;
        createdRunIds.add(runId);
        const session = await sessionManager.createRunSession(
          createRunContext({
            runId,
            modelIdentifier,
            workspaceRoot,
            autoExecuteTools: false,
          }),
        );

        const targetFilePath = path.join(workspaceRoot, `interrupt-${attempt}.txt`);
        const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
        const events: ClaudeSessionEvent[] = [];
        const unsubscribe = session.subscribeRuntimeEvents((event) => {
          events.push(event);
        });

        try {
          await bootstrapClaudeSession(session, events);

          await session.sendTurn(
            new AgentInputUserMessage(
              buildExactWriteToolPrompt({
                targetFilePath,
                targetLines,
              }),
            ),
          );

          await waitFor(
            () =>
              events.some(
                (event) =>
                  event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          await session.interrupt();

          await waitFor(
            () =>
              events.some(
                (event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED,
              ) &&
              events.some(
                (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          await delay(1_000);

          expect(
            events.some((event) => event.method === ClaudeSessionEventName.TURN_INTERRUPTED),
          ).toBe(true);
          expect(
            events.some(
              (event) => event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_DENIED,
            ),
          ).toBe(true);
          expect(fsSync.existsSync(targetFilePath)).toBe(false);
          resolved = true;
          break;
        } catch (error) {
          attemptTraces.push({
            attempt,
            eventMethods: events.map((event) => event.method),
            failureReason: String(error),
          });
        } finally {
          unsubscribe();
        }
      }

      expect(resolved, JSON.stringify(attemptTraces)).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "terminates a run while approval is pending and removes the run session without creating the target file",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-terminate");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();
      const attemptTraces: Array<{
        attempt: number;
        eventMethods: string[];
        failureReason?: string;
      }> = [];

      let resolved = false;
      for (let attempt = 1; attempt <= 3; attempt += 1) {
        const runId = `run-claude-terminate-${attempt}-${randomUUID()}`;
        createdRunIds.add(runId);
        const session = await sessionManager.createRunSession(
          createRunContext({
            runId,
            modelIdentifier,
            workspaceRoot,
            autoExecuteTools: false,
          }),
        );

        const targetFilePath = path.join(workspaceRoot, `terminate-${attempt}.txt`);
        const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
        const events: ClaudeSessionEvent[] = [];
        const unsubscribe = session.subscribeRuntimeEvents((event) => {
          events.push(event);
        });

        try {
          await bootstrapClaudeSession(session, events);

          await session.sendTurn(
            new AgentInputUserMessage(
              buildExactWriteToolPrompt({
                targetFilePath,
                targetLines,
              }),
            ),
          );

          await waitFor(
            () =>
              events.some(
                (event) =>
                  event.method === ClaudeSessionEventName.ITEM_COMMAND_EXECUTION_REQUEST_APPROVAL,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          await sessionManager.terminateRun(runId);

          await waitFor(
            () =>
              events.some(
                (event) => event.method === ClaudeSessionEventName.SESSION_TERMINATED,
              ),
            APPROVAL_STEP_TIMEOUT_MS,
          );

          await delay(1_000);

          expect(
            events.some((event) => event.method === ClaudeSessionEventName.SESSION_TERMINATED),
          ).toBe(true);
          expect(sessionManager.hasRunSession(runId)).toBe(false);
          expect(fsSync.existsSync(targetFilePath)).toBe(false);
          resolved = true;
          break;
        } catch (error) {
          attemptTraces.push({
            attempt,
            eventMethods: events.map((event) => event.method),
            failureReason: String(error),
          });
        } finally {
          unsubscribe();
        }
      }

      expect(resolved, JSON.stringify(attemptTraces)).toBe(true);
    },
    FLOW_TEST_TIMEOUT_MS,
  );

  it(
    "restores the Claude session after an auto-executed tool turn and continues the same conversation",
    async () => {
      const modelIdentifier = await fetchClaudeModelIdentifier();
      const workspaceRoot = await createWorkspace("claude-session-tool-resume");
      createdWorkspaces.add(workspaceRoot);
      sessionManager = new ClaudeSessionManager();

      const runId = `run-claude-tool-resume-${randomUUID()}`;
      createdRunIds.add(runId);
      const original = await sessionManager.createRunSession(
        createRunContext({
          runId,
          modelIdentifier,
          workspaceRoot,
          autoExecuteTools: true,
        }),
      );

      const targetFilePath = path.join(workspaceRoot, "resume-tool.txt");
      const targetLines: [string, string] = [`first-${randomUUID()}`, `second-${randomUUID()}`];
      const originalEvents: ClaudeSessionEvent[] = [];
      const unsubscribeOriginal = original.subscribeRuntimeEvents((event) => {
        originalEvents.push(event);
      });

      await bootstrapClaudeSession(original, originalEvents);

      await original.sendTurn(
        new AgentInputUserMessage(
          buildExactWriteToolPrompt({
            targetFilePath,
            targetLines,
          }),
        ),
      );

      await waitForTurnSettlement(originalEvents);

      expect(fsSync.existsSync(targetFilePath)).toBe(true);
      expect(normalizeWrittenText(await fs.readFile(targetFilePath, "utf8"))).toBe(
        targetLines.join("\n"),
      );

      const sessionId = original.runContext.runtimeContext.sessionId;
      expect(sessionId).toBeTruthy();
      unsubscribeOriginal();

      const restored = await sessionManager.restoreRunSession(
        createRunContext({
          runId,
          modelIdentifier,
          workspaceRoot,
          autoExecuteTools: true,
        }),
        sessionId!,
      );

      const followupToken = `followup-${randomUUID()}`;
      const followupReply = `reply-${randomUUID()}`;
      const restoredEvents: ClaudeSessionEvent[] = [];
      const unsubscribeRestored = restored.subscribeRuntimeEvents((event) => {
        restoredEvents.push(event);
      });

      await restored.sendTurn(
        new AgentInputUserMessage(
          `Reply with exactly '${followupReply}'. Include nothing else. Token: ${followupToken}`,
        ),
      );
      await waitForTurnSettlement(restoredEvents);

      const messages = await sessionManager.getSessionMessages(sessionId!);
      const renderedConversation = collectText(messages);
      expect(renderedConversation).toContain(path.basename(targetFilePath));
      expect(renderedConversation).toContain(targetLines[0]);
      expect(renderedConversation).toContain(targetLines[1]);
      expect(renderedConversation).toContain(followupToken);
      expect(renderedConversation).toContain(followupReply);
      unsubscribeRestored();
    },
    FLOW_TEST_TIMEOUT_MS,
  );
});
