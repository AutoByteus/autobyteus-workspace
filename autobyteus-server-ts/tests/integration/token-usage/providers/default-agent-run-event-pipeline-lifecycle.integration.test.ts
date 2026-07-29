import { randomUUID } from "node:crypto";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { initializePrisma, rootPrismaClient, shutdownPrisma } from "repository_prisma";
import { AgentRunConfig } from "../../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../../src/agent-execution/domain/agent-run-context.js";
import {
  AgentRunEventType,
  type AgentRunEvent,
} from "../../../../src/agent-execution/domain/agent-run-event.js";
import {
  getDefaultAgentRunEventPipeline,
  resetDefaultAgentRunEventPipelineForTests,
  stopDefaultAgentRunEventPipeline,
} from "../../../../src/agent-execution/events/default-agent-run-event-pipeline.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

describe("default token event pipeline real SQLite lifecycle", () => {
  const runId = `token-pipeline-lifecycle-${randomUUID()}`;
  const warning = vi.spyOn(console, "warn").mockImplementation(() => undefined);
  const runContext = new AgentRunContext({
    runId,
    runtimeContext: null,
    config: new AgentRunConfig({
      agentDefinitionId: "agent-token-pipeline-lifecycle",
      llmModelIdentifier: "gpt-test",
      autoExecuteTools: true,
      workspaceId: "workspace-token-pipeline-lifecycle",
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    }),
  });

  beforeAll(async () => {
    await shutdownPrisma();
    await initializePrisma({ datasourceUrl: process.env.DATABASE_URL });
    await resetDefaultAgentRunEventPipelineForTests();
  });

  afterAll(async () => {
    try {
      await resetDefaultAgentRunEventPipelineForTests();
      await rootPrismaClient.tokenUsageLedgerEvent.deleteMany({ where: { runId } });
    } finally {
      await shutdownPrisma();
      warning.mockRestore();
    }
  });

  const rawTokenEvent = (idempotencyKey: string): AgentRunEvent => ({
    eventType: AgentRunEventType.TOKEN_USAGE_UPDATED,
    runId,
    statusHint: null,
    payload: {
      idempotency_key: idempotencyKey,
      usage_scope: "per_turn",
      input_token_semantic: "gross_includes_cache",
      reported_input_tokens: 20,
      reported_output_tokens: 5,
      reported_total_tokens: 25,
      model_provider: "OLLAMA",
      model_identifier: "gpt-test",
      runtime_kind: RuntimeKind.CODEX_APP_SERVER,
      ingestion_kind: "codex_thread_token_usage",
    },
  });

  it("drains accepted persistence, stays stopped for late work, and never reopens through a getter", async () => {
    const pipeline = getDefaultAgentRunEventPipeline();
    await pipeline.process({
      runContext,
      events: [rawTokenEvent("token-pipeline-lifecycle:accepted")],
    });

    const stop = stopDefaultAgentRunEventPipeline();
    await expect(stopDefaultAgentRunEventPipeline()).resolves.toBeUndefined();
    await expect(stop).resolves.toBeUndefined();
    expect(getDefaultAgentRunEventPipeline()).toBe(pipeline);
    await expect(rootPrismaClient.tokenUsageLedgerEvent.count({ where: { runId } })).resolves.toBe(1);

    await pipeline.process({
      runContext,
      events: [rawTokenEvent("token-pipeline-lifecycle:late")],
    });
    await new Promise<void>((resolve) => setImmediate(resolve));

    expect(getDefaultAgentRunEventPipeline()).toBe(pipeline);
    await expect(rootPrismaClient.tokenUsageLedgerEvent.count({ where: { runId } })).resolves.toBe(1);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining("payload is not enriched"));
  });
});
