import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterEach, describe, expect, it } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { AgentRunConfig } from "../../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../../../src/agent-execution/domain/agent-run-event.js";
import { CodexAgentRunContext } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-context.js";
import { CodexAgentRunBackend } from "../../../../../src/agent-execution/backends/codex/backend/codex-agent-run-backend.js";
import { CodexThreadManager } from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-manager.js";
import {
  CodexApprovalPolicy,
  type CodexSandboxMode,
} from "../../../../../src/agent-execution/backends/codex/thread/codex-thread-config.js";
import { CodexAppServerClient } from "../../../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { CodexAppServerClientManager } from "../../../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import { CodexClientThreadRouter } from "../../../../../src/agent-execution/backends/codex/thread/codex-client-thread-router.js";
import { RuntimeKind } from "../../../../../src/runtime-management/runtime-kind-enum.js";
import { CodexModelCatalog } from "../../../../../src/llm-management/services/codex-model-catalog.js";

const codexBinaryReady = spawnSync("codex", ["--version"], {
  stdio: "ignore",
}).status === 0;
const codexRuntimeEnabled = codexBinaryReady && process.env.RUN_CODEX_E2E === "1";
const describeLiveProbe = codexRuntimeEnabled ? describe : describe.skip;

const createWorkspace = async (label: string): Promise<string> =>
  fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));

const createRunContext = (input: {
  runId: string;
  workingDirectory: string;
  model: string | null;
  reasoningEffort?: string | null;
  approvalPolicy?: CodexApprovalPolicy;
  sandbox?: CodexSandboxMode;
}) =>
  new AgentRunContext({
    runId: input.runId,
    config: new AgentRunConfig({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      agentDefinitionId: "agent-def-probe",
      llmModelIdentifier: input.model ?? "",
      autoExecuteTools: input.approvalPolicy === CodexApprovalPolicy.NEVER,
      workspaceId: input.workingDirectory,
      llmConfig: null,
      skillAccessMode: SkillAccessMode.NONE,
    }),
    runtimeContext: new CodexAgentRunContext({
      codexThreadConfig: {
        model: input.model,
        workingDirectory: input.workingDirectory,
        reasoningEffort: input.reasoningEffort ?? "medium",
        serviceTier: null,
        approvalPolicy: input.approvalPolicy ?? CodexApprovalPolicy.NEVER,
        sandbox: input.sandbox ?? "workspace-write",
        baseInstructions: null,
        developerInstructions: null,
        dynamicTools: null,
      },
    }),
  });

const waitFor = async (
  predicate: () => boolean,
  timeoutMs: number,
  label: string,
): Promise<void> => {
  const startedAt = Date.now();
  while (!predicate()) {
    if (Date.now() - startedAt > timeoutMs) {
      throw new Error(`Timed out waiting for ${label} after ${String(timeoutMs)}ms.`);
    }
    await new Promise((resolve) => setTimeout(resolve, 250));
  }
};

const fetchPreferredCodexModelIdentifier = async (
  clientManager: CodexAppServerClientManager,
  cwd: string,
): Promise<string> => {
  const models = await new CodexModelCatalog(clientManager).listModels(cwd);
  const allModelIdentifiers = models
    .map((model) => model.model_identifier)
    .filter((identifier): identifier is string => typeof identifier === "string" && identifier.length > 0);
  if (allModelIdentifiers.length === 0) {
    throw new Error("Codex model catalog returned no models.");
  }

  const preferredOrder = [
    "gpt-5.3-codex",
    "gpt-5.3-codex-spark",
    "gpt-5.4-mini",
    "gpt-5.4",
    "gpt-5.2-codex",
  ];
  for (const preferred of preferredOrder) {
    if (allModelIdentifiers.includes(preferred)) {
      return preferred;
    }
  }
  return allModelIdentifiers[0];
};

const average = (values: number[]): number =>
  values.length === 0 ? 0 : values.reduce((sum, value) => sum + value, 0) / values.length;

describeLiveProbe("Codex long-turn cadence probe", () => {
  let clientManager: CodexAppServerClientManager | null = null;
  let threadManager: CodexThreadManager | null = null;
  let workspaceRoot: string | null = null;
  let runId: string | null = null;

  afterEach(async () => {
    if (threadManager && runId) {
      await threadManager.terminateThread(runId).catch(() => undefined);
    }
    if (clientManager) {
      await clientManager.close().catch(() => undefined);
    }
    if (workspaceRoot) {
      await fs.rm(workspaceRoot, { recursive: true, force: true }).catch(() => undefined);
    }
    clientManager = null;
    threadManager = null;
    workspaceRoot = null;
    runId = null;
  });

  it(
    "runs one oversized Codex task and reports backend event cadence over time",
    async () => {
      workspaceRoot = await createWorkspace("codex-server-long-turn-probe");
      runId = `run-long-turn-${randomUUID()}`;

      await fs.writeFile(
        path.join(workspaceRoot, "README.md"),
        "# Probe Workspace\n\nThis workspace is used for a live Codex long-turn cadence probe.\n",
        "utf8",
      );
      await fs.writeFile(
        path.join(workspaceRoot, ".gitignore"),
        "node_modules\n.nuxt\n.output\n",
        "utf8",
      );

      clientManager = new CodexAppServerClientManager({
        createClient: (cwd) =>
          new CodexAppServerClient({
            command: "codex",
            args: ["app-server"],
            cwd,
            requestTimeoutMs: 90_000,
          }),
      });
      threadManager = new CodexThreadManager(
        clientManager,
        undefined,
        new CodexClientThreadRouter(),
      );

      const modelIdentifier = await fetchPreferredCodexModelIdentifier(clientManager, workspaceRoot);
      const runContext = createRunContext({
        runId,
        workingDirectory: workspaceRoot,
        model: modelIdentifier,
        reasoningEffort: "medium",
        approvalPolicy: CodexApprovalPolicy.NEVER,
      });
      const thread = await threadManager.createThread(runContext);
      await waitFor(() => thread.startup.status === "ready", 20_000, "thread startup");

      const backend = new CodexAgentRunBackend(runContext as never, thread as never, threadManager as never);

      const eventTimes: number[] = [];
      const eventTypes: string[] = [];
      const segmentContentTimes: number[] = [];
      let completed = false;
      let sawError = false;

      backend.subscribeToEvents((event) => {
        const now = Date.now();
        const runtimeEvent = event as AgentRunEvent;
        eventTimes.push(now);
        eventTypes.push(String(runtimeEvent.eventType));
        if (runtimeEvent.eventType === AgentRunEventType.SEGMENT_CONTENT) {
          segmentContentTimes.push(now);
          if (segmentContentTimes.length % 100 === 0) {
            const elapsedMs = now - segmentContentTimes[0];
            console.log("[probe][segment-content-checkpoint]", {
              count: segmentContentTimes.length,
              elapsedMs,
              avgGapMs:
                segmentContentTimes.length > 1
                  ? average(
                      segmentContentTimes
                        .slice(1)
                        .map((time, index) => time - segmentContentTimes[index]!),
                    )
                  : 0,
            });
          }
        }
        if (runtimeEvent.eventType === AgentRunEventType.TURN_COMPLETED) {
          completed = true;
        }
        if (runtimeEvent.eventType === AgentRunEventType.ERROR) {
          sawError = true;
        }
      });

      const prompt = [
        "Build a Nuxt 3 SSR fruit shop directly in this workspace.",
        "Do the real implementation without asking for approval.",
        "Create multiple files: app shell, landing page, product listing page, product detail route, cart store, composables, mock server API endpoints, and a concise README.",
        "Work continuously until the scaffold is complete.",
        "While working, also narrate your implementation steps in assistant text so the run emits a substantial streamed response.",
        "Do not stop at a plan; actually create the scaffold and files.",
      ].join(" ");

      const startTime = Date.now();
      const result = await backend.postUserMessage(new AgentInputUserMessage(prompt));
      expect(result.accepted).toBe(true);

      await waitFor(() => completed || sawError, 8 * 60_000, "long-turn completion");
      const endTime = Date.now();

      const allEventGaps = eventTimes.slice(1).map((time, index) => time - eventTimes[index]!);
      const contentGaps = segmentContentTimes
        .slice(1)
        .map((time, index) => time - segmentContentTimes[index]!);
      const earlyContentGaps = contentGaps.slice(0, Math.min(25, contentGaps.length));
      const lateContentGaps =
        contentGaps.length <= 25 ? contentGaps : contentGaps.slice(contentGaps.length - 25);
      const eventCounts = eventTypes.reduce<Record<string, number>>((acc, eventType) => {
        acc[eventType] = (acc[eventType] ?? 0) + 1;
        return acc;
      }, {});

      console.log("[probe][summary]", {
        runId,
        modelIdentifier,
        durationMs: endTime - startTime,
        totalEventCount: eventTimes.length,
        segmentContentEventCount: segmentContentTimes.length,
        allEventAvgGapMs: average(allEventGaps),
        earlyContentAvgGapMs: average(earlyContentGaps),
        lateContentAvgGapMs: average(lateContentGaps),
        slowdownRatio:
          average(earlyContentGaps) > 0
            ? average(lateContentGaps) / average(earlyContentGaps)
            : null,
        eventCounts,
      });

      expect(completed).toBe(true);
      expect(sawError).toBe(false);
      expect(eventTimes.length).toBeGreaterThan(0);
      expect(segmentContentTimes.length).toBeGreaterThan(0);
    },
    10 * 60_000,
  );
});
