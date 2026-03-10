import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { getRunHistoryService } from "../../../src/run-history/services/run-history-service.js";
import { RunManifestStore } from "../../../src/run-history/store/run-manifest-store.js";
import type { RunManifest } from "../../../src/run-history/domain/models.js";
import { getRuntimeCommandIngressService } from "../../../src/runtime-execution/runtime-command-ingress-service.js";
import { getRuntimeCompositionService } from "../../../src/runtime-execution/runtime-composition-service.js";
import { getRuntimeSessionStore } from "../../../src/runtime-execution/runtime-session-store.js";

describe("Runtime termination routing GraphQL e2e", () => {
  let schema: GraphQLSchema;
  let graphql: typeof graphqlFn;
  const seededRunIds = new Set<string>();

  beforeAll(async () => {
    schema = await buildGraphqlSchema();
    const require = createRequire(import.meta.url);
    const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
    const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
    const graphqlModule = await import(graphqlPath);
    graphql = graphqlModule.graphql as typeof graphqlFn;
  });

  afterEach(async () => {
    vi.restoreAllMocks();

    const runHistoryService = getRunHistoryService();
    const memoryDir = appConfigProvider.config.getMemoryDir();
    getRuntimeSessionStore().clear();

    for (const runId of seededRunIds) {
      await runHistoryService.deleteRunHistory(runId);
      await fs.rm(path.join(memoryDir, "agents", runId), { recursive: true, force: true });
    }
    seededRunIds.clear();
  });

  const execGraphql = async <T>(
    query: string,
    variables?: Record<string, unknown>,
  ): Promise<T> => {
    const result = await graphql({
      schema,
      source: query,
      variableValues: variables,
    });
    if (result.errors?.length) {
      throw result.errors[0];
    }
    return result.data as T;
  };

  const seedRunHistory = async (): Promise<{ runId: string }> => {
    const memoryDir = appConfigProvider.config.getMemoryDir();
    const runHistoryService = getRunHistoryService();
    const manifestStore = new RunManifestStore(memoryDir);
    const unique = `${Date.now()}_${Math.random().toString(16).slice(2)}`;
    const runId = `runtime_termination_route_${unique}`;
    const manifest: RunManifest = {
      agentDefinitionId: `missing_agent_${unique}`,
      workspaceRootPath: path.join(os.tmpdir(), `autobyteus-run-history-${unique}`),
      llmModelIdentifier: "e2e-model",
      llmConfig: null,
      autoExecuteTools: false,
      skillAccessMode: null,
      runtimeKind: "codex_app_server",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: runId,
        threadId: "thread-termination",
        metadata: null,
      },
    };
    await manifestStore.writeManifest(runId, manifest);
    await runHistoryService.upsertRunHistoryRow({
      runId,
      manifest,
      summary: "runtime termination routing summary",
      lastKnownStatus: "ACTIVE",
      lastActivityAt: "2026-03-10T00:00:00.000Z",
    });
    seededRunIds.add(runId);
    return { runId };
  };

  it("terminates a non-native runtime run without calling native termination first", async () => {
    const { runId } = await seedRunHistory();
    const manager = AgentRunManager.getInstance();
    const runtimeCompositionService = getRuntimeCompositionService();
    const runtimeCommandIngressService = getRuntimeCommandIngressService();
    const runHistoryService = getRunHistoryService();

    getRuntimeSessionStore().upsertSession({
      runId,
      runtimeKind: "codex_app_server",
      mode: "agent",
      runtimeReference: {
        runtimeKind: "codex_app_server",
        sessionId: runId,
        threadId: "thread-termination",
        metadata: null,
      },
    });

    const nativeTerminateSpy = vi.spyOn(manager, "terminateAgentRun").mockResolvedValue(false);
    const runtimeTerminateSpy = vi
      .spyOn(runtimeCommandIngressService, "terminateRun")
      .mockResolvedValue({
        accepted: true,
        runtimeKind: "codex_app_server",
      } as any);
    const removeRunSessionSpy = vi.spyOn(runtimeCompositionService, "removeRunSession");
    const onRunTerminatedSpy = vi.spyOn(runHistoryService, "onRunTerminated");

    const terminateMutation = `
      mutation TerminateAgentRun($id: String!) {
        terminateAgentRun(id: $id) {
          success
          message
        }
      }
    `;

    const terminateResult = await execGraphql<{
      terminateAgentRun: {
        success: boolean;
        message: string;
      };
    }>(terminateMutation, { id: runId });

    expect(terminateResult.terminateAgentRun.success).toBe(true);
    expect(terminateResult.terminateAgentRun.message).toContain("terminated");
    expect(nativeTerminateSpy).not.toHaveBeenCalled();
    expect(runtimeTerminateSpy).toHaveBeenCalledWith({
      runId,
      mode: "agent",
    });
    expect(removeRunSessionSpy).toHaveBeenCalledTimes(1);
    expect(removeRunSessionSpy).toHaveBeenCalledWith(runId);
    expect(onRunTerminatedSpy).toHaveBeenCalledTimes(1);
    expect(onRunTerminatedSpy).toHaveBeenCalledWith(runId);
    expect(getRuntimeSessionStore().getSession(runId)).toBeNull();
  });
});
