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
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../../src/agent-execution/domain/agent-run-event.js";
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
import type { CodexAppServerMessage } from "../../../../../src/agent-execution/backends/codex/thread/codex-app-server-message.js";

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

const buildProbePrompt = (): { profile: string; prompt: string } => {
  const profile = process.env.CODEX_PAIRED_PROBE_PROMPT_SIZE?.trim().toLowerCase() ?? "default";
  if (profile === "huge") {
    return {
      profile,
      prompt: [
        "Build a large Nuxt 3 SSR commerce platform directly in this workspace.",
        "Do the real implementation without asking for approval.",
        "Implement a full storefront with landing page, category browse page, collection page, product detail routes, search, filters, sorting, pagination, wishlist, cart, coupon handling, checkout page, order confirmation, customer account area, order history, saved addresses, and profile settings.",
        "Also implement an admin area with product CRUD pages, inventory dashboard, order management page, customer list page, marketing banner management, and analytics summary widgets.",
        "Create realistic mock server API endpoints, typed composables, Pinia stores, seed data, reusable UI components, layout files, route middleware, and a concise README explaining how everything fits together.",
        "Add enough files and structure that the scaffold resembles a serious one-year build-up website rather than a toy demo.",
        "While working, narrate your implementation steps continuously in assistant text so the run emits a substantial streamed response.",
        "Do not stop at a plan; actually create the scaffold and files until the workspace is materially populated.",
      ].join(" "),
    };
  }

  return {
    profile,
    prompt: [
      "Build a Nuxt 3 SSR fruit shop directly in this workspace.",
      "Do the real implementation without asking for approval.",
      "Create multiple files: app shell, landing page, product listing page, product detail route, cart store, composables, mock server API endpoints, and a concise README.",
      "Work continuously until the scaffold is complete.",
      "While working, also narrate your implementation steps in assistant text so the run emits a substantial streamed response.",
      "Do not stop at a plan; actually create the scaffold and files.",
    ].join(" "),
  };
};

const percentile = (values: number[], targetPercentile: number): number => {
  if (values.length === 0) {
    return 0;
  }
  const sorted = values.slice().sort((left, right) => left - right);
  const rank = Math.min(
    sorted.length - 1,
    Math.max(0, Math.ceil((targetPercentile / 100) * sorted.length) - 1),
  );
  return sorted[rank] ?? 0;
};

const toGapSeries = (times: number[]): number[] =>
  times.slice(1).map((time, index) => time - times[index]!);

const buildCumulativeRows = (
  rawTextDeltaTimes: number[],
  backendTextDeltaTimes: number[],
): Array<Record<string, number>> => {
  const pairedCount = Math.min(rawTextDeltaTimes.length, backendTextDeltaTimes.length);
  const rawGaps = toGapSeries(rawTextDeltaTimes);
  const backendGaps = toGapSeries(backendTextDeltaTimes);
  const dispatchDelays = Array.from({ length: pairedCount }, (_, index) =>
    backendTextDeltaTimes[index]! - rawTextDeltaTimes[index]!,
  );

  const rows: Array<Record<string, number>> = [];
  for (let count = 100; count <= pairedCount; count += 100) {
    const rawElapsedMs = rawTextDeltaTimes[count - 1]! - rawTextDeltaTimes[0]!;
    const backendElapsedMs = backendTextDeltaTimes[count - 1]! - backendTextDeltaTimes[0]!;
    const rawGapSlice = rawGaps.slice(0, Math.max(0, count - 1));
    const backendGapSlice = backendGaps.slice(0, Math.max(0, count - 1));
    const delaySlice = dispatchDelays.slice(0, count);
    rows.push({
      count,
      rawElapsedMs,
      rawAvgGapMs: average(rawGapSlice),
      backendElapsedMs,
      backendAvgGapMs: average(backendGapSlice),
      avgDispatchDelayMs: average(delaySlice),
      p90DispatchDelayMs: percentile(delaySlice, 90),
      p99DispatchDelayMs: percentile(delaySlice, 99),
      maxDispatchDelayMs: Math.max(...delaySlice),
    });
  }
  return rows;
};

const resolveProbeTimeoutMs = (): number => {
  const rawMinutes = Number(process.env.CODEX_PAIRED_PROBE_TIMEOUT_MINUTES ?? "8");
  const minutes = Number.isFinite(rawMinutes) && rawMinutes > 0 ? rawMinutes : 8;
  return Math.round(minutes * 60_000);
};

const resolveCheckpointStep = (): number => {
  const rawStep = Number(process.env.CODEX_PAIRED_PROBE_CHECKPOINT_STEP ?? "100");
  if (!Number.isFinite(rawStep) || rawStep < 1) {
    return 100;
  }
  return Math.round(rawStep);
};

describeLiveProbe("Codex raw-vs-backend cadence probe", () => {
  const probeTimeoutMs = resolveProbeTimeoutMs();
  const checkpointStep = resolveCheckpointStep();
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
    "compares native raw text-delta cadence to backend SEGMENT_CONTENT cadence in the same run",
    async () => {
      workspaceRoot = await createWorkspace("codex-raw-vs-backend-probe");
      runId = `run-raw-vs-backend-${randomUUID()}`;

      await fs.writeFile(
        path.join(workspaceRoot, "README.md"),
        "# Probe Workspace\n\nThis workspace is used for a paired Codex raw-vs-backend cadence probe.\n",
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

      const rawMethodCounts: Record<string, number> = {};
      const rawTextDeltaTimes: number[] = [];
      thread.subscribeAppServerMessages((message: CodexAppServerMessage) => {
        const method = message.method.trim();
        rawMethodCounts[method] = (rawMethodCounts[method] ?? 0) + 1;
        if (method === "item/agentMessage/delta") {
          rawTextDeltaTimes.push(Date.now());
          if (rawTextDeltaTimes.length % checkpointStep === 0) {
            const gaps = toGapSeries(rawTextDeltaTimes);
            const elapsedMs = rawTextDeltaTimes[rawTextDeltaTimes.length - 1]! - rawTextDeltaTimes[0]!;
            console.log("[paired-probe][raw-checkpoint]", {
              count: rawTextDeltaTimes.length,
              elapsedMs,
              avgGapMs: average(gaps),
            });
          }
        }
      });

      const backend = new CodexAgentRunBackend(runContext as never, thread as never, threadManager as never);

      const backendEventCounts: Record<string, number> = {};
      const backendTextDeltaTimes: number[] = [];
      let completed = false;
      let sawError = false;

      backend.subscribeToEvents((event) => {
        const now = Date.now();
        const runtimeEvent = event as AgentRunEvent;
        backendEventCounts[String(runtimeEvent.eventType)] =
          (backendEventCounts[String(runtimeEvent.eventType)] ?? 0) + 1;

        if (
          runtimeEvent.eventType === AgentRunEventType.SEGMENT_CONTENT &&
          runtimeEvent.payload.segment_type === "text"
        ) {
          backendTextDeltaTimes.push(now);
          if (backendTextDeltaTimes.length % checkpointStep === 0) {
            const gaps = toGapSeries(backendTextDeltaTimes);
            const elapsedMs =
              backendTextDeltaTimes[backendTextDeltaTimes.length - 1]! - backendTextDeltaTimes[0]!;
            const pairedCount = Math.min(rawTextDeltaTimes.length, backendTextDeltaTimes.length);
            const dispatchDelays = Array.from({ length: pairedCount }, (_, index) =>
              backendTextDeltaTimes[index]! - rawTextDeltaTimes[index]!,
            );
            console.log("[paired-probe][backend-checkpoint]", {
              count: backendTextDeltaTimes.length,
              elapsedMs,
              avgGapMs: average(gaps),
              avgDispatchDelayMs: average(dispatchDelays),
              p99DispatchDelayMs: percentile(dispatchDelays, 99),
              maxDispatchDelayMs: dispatchDelays.length > 0 ? Math.max(...dispatchDelays) : 0,
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

      const { profile: promptProfile, prompt } = buildProbePrompt();

      const startTime = Date.now();
      const result = await backend.postUserMessage(new AgentInputUserMessage(prompt));
      expect(result.accepted).toBe(true);

      await waitFor(() => completed || sawError, probeTimeoutMs, "paired raw/backend completion");
      const endTime = Date.now();

      const pairedCount = Math.min(rawTextDeltaTimes.length, backendTextDeltaTimes.length);
      const dispatchDelays = Array.from({ length: pairedCount }, (_, index) =>
        backendTextDeltaTimes[index]! - rawTextDeltaTimes[index]!,
      );
      const earlyDispatchDelays = dispatchDelays.slice(0, Math.min(25, dispatchDelays.length));
      const lateDispatchDelays =
        dispatchDelays.length <= 25
          ? dispatchDelays
          : dispatchDelays.slice(dispatchDelays.length - 25);
      const rawGaps = toGapSeries(rawTextDeltaTimes);
      const backendGaps = toGapSeries(backendTextDeltaTimes);
      const rows = buildCumulativeRows(rawTextDeltaTimes, backendTextDeltaTimes);

      console.table(rows);
      console.log("[paired-probe][summary]", {
        runId,
        modelIdentifier,
        promptProfile,
        durationMs: endTime - startTime,
        rawTextDeltaCount: rawTextDeltaTimes.length,
        backendTextDeltaCount: backendTextDeltaTimes.length,
        pairedCount,
        rawEarlyAvgGapMs: average(rawGaps.slice(0, Math.min(25, rawGaps.length))),
        rawLateAvgGapMs:
          rawGaps.length <= 25 ? average(rawGaps) : average(rawGaps.slice(rawGaps.length - 25)),
        backendEarlyAvgGapMs: average(backendGaps.slice(0, Math.min(25, backendGaps.length))),
        backendLateAvgGapMs:
          backendGaps.length <= 25
            ? average(backendGaps)
            : average(backendGaps.slice(backendGaps.length - 25)),
        avgDispatchDelayMs: average(dispatchDelays),
        p90DispatchDelayMs: percentile(dispatchDelays, 90),
        p99DispatchDelayMs: percentile(dispatchDelays, 99),
        maxDispatchDelayMs: dispatchDelays.length > 0 ? Math.max(...dispatchDelays) : 0,
        earlyDispatchDelayMs: average(earlyDispatchDelays),
        lateDispatchDelayMs: average(lateDispatchDelays),
        rawGapsOver1s: rawGaps.filter((value) => value > 1000).length,
        rawGapsOver5s: rawGaps.filter((value) => value > 5000).length,
        backendGapsOver1s: backendGaps.filter((value) => value > 1000).length,
        backendGapsOver5s: backendGaps.filter((value) => value > 5000).length,
        rawMethodCounts,
        backendEventCounts,
      });

      expect(completed).toBe(true);
      expect(sawError).toBe(false);
      expect(rawTextDeltaTimes.length).toBeGreaterThan(0);
      expect(backendTextDeltaTimes.length).toBeGreaterThan(0);
    },
    probeTimeoutMs,
  );
});
