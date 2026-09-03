import "reflect-metadata";
import os from "node:os";
import path from "node:path";
import { createRequire } from "node:module";
import { mkdtemp, rm, writeFile } from "node:fs/promises";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { graphql as graphqlFn, GraphQLSchema } from "graphql";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { AgentRunBackend } from "../../../src/agent-execution/backends/agent-run-backend.js";
import type { AgentRunBackendFactory } from "../../../src/agent-execution/backends/agent-run-backend-factory.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRunService } from "../../../src/agent-execution/services/agent-run-service.js";
import { AgentRunStatusProjectionService } from "../../../src/agent-execution/services/agent-run-status-projection-service.js";
import { buildGraphqlSchema } from "../../../src/api/graphql/schema.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { AgentRunHistoryCatalogService } from "../../../src/run-history/services/agent-run-history-catalog-service.js";
import { AgentRunHistoryService } from "../../../src/run-history/services/agent-run-history-service.js";
import { WorkspaceRunHistoryService } from "../../../src/run-history/services/workspace-run-history-service.js";
import type { AgentRunMetadata } from "../../../src/run-history/store/agent-run-metadata-types.js";
import { createNoopAgentToolMcpRunSessionDeactivator } from "../../fixtures/agent-tool-mcp-run-session-deactivator-fixtures.js";
import { createAgentRunManagerInfrastructureFixture } from "../../fixtures/agent-run-manager-infrastructure-fixtures.js";
import { configureE2eStudioApplicationApiServices } from "../helpers/studio-application-api-services.js";

const workspaceHistoryHolder = vi.hoisted(() => ({ service: null as any }));

vi.mock("../../../src/run-history/services/workspace-run-history-service.js", async () => {
  const actual = await vi.importActual<
    typeof import("../../../src/run-history/services/workspace-run-history-service.js")
  >("../../../src/run-history/services/workspace-run-history-service.js");
  return {
    ...actual,
    getWorkspaceRunHistoryService: () => {
      if (!workspaceHistoryHolder.service) {
        throw new Error("Standalone Error lifecycle workspace-history fixture is not initialized.");
      }
      return workspaceHistoryHolder.service;
    },
  };
});

const RUN_ID = "standalone-error-run";
const AGENT_DEFINITION_ID = "standalone-error-agent";
const WORKSPACE_ROOT = "/tmp/standalone-error-workspace";

type RuntimeFixture = {
  backend: AgentRunBackend;
  terminate: ReturnType<typeof vi.fn>;
};

const createConfig = (): AgentRunConfig => new AgentRunConfig({
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  agentDefinitionId: AGENT_DEFINITION_ID,
  llmModelIdentifier: "fixture-model",
  autoExecuteTools: true,
  workspaceId: "standalone-error-workspace",
  llmConfig: null,
  skillAccessMode: SkillAccessMode.NONE,
});

const createErrorBackend = (accepted: boolean): RuntimeFixture => {
  const config = createConfig();
  const context = new AgentRunContext({
    runId: RUN_ID,
    config,
    runtimeContext: null,
  });
  let active = true;
  const terminate = vi.fn(async () => {
    if (accepted) active = false;
    return accepted
      ? { accepted: true as const }
      : { accepted: false as const, code: "DENIED", message: "runtime retained" };
  });
  return {
    terminate,
    backend: {
      runId: RUN_ID,
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      getContext: () => context,
      isActive: () => active,
      getPlatformAgentRunId: () => "fixture-thread-error",
      getLifecycleSnapshot: () => ({
        availability: active ? "active" : "offline",
        phase: active ? "error" : "idle",
        currentTurn: { kind: "NONE" },
      }),
      subscribeToSourceEventBatches: () => () => undefined,
      dispatchUserInput: vi.fn(async () => ({ accepted: true as const, turnId: "fixture-turn" })),
      approveToolInvocation: vi.fn(async () => ({ accepted: true as const })),
      interrupt: vi.fn(async () => ({ accepted: true as const })),
      terminate,
    },
  };
};

const createFactory = (backend: AgentRunBackend): AgentRunBackendFactory => ({
  createBackend: vi.fn(async () => backend),
  restoreBackend: vi.fn(async () => backend),
});

const createManager = (backend: AgentRunBackend): AgentRunManager => {
  const sessionDeactivator = createNoopAgentToolMcpRunSessionDeactivator();
  const infrastructure = createAgentRunManagerInfrastructureFixture({
    agentToolMcpRunSessionDeactivator: sessionDeactivator,
  });
  const unusedAuto = createErrorBackend(true).backend;
  const unusedClaude = createErrorBackend(true).backend;
  return AgentRunManager.initializeProcessInstance({
    autoByteusBackendFactory: createFactory(unusedAuto),
    codexBackendFactory: createFactory(backend),
    claudeBackendFactory: createFactory(unusedClaude),
    activationRegistry: infrastructure.activationRegistry,
    memoryRecorder: infrastructure.memoryRecorder,
    providerInputNormalizer: infrastructure.providerInputNormalizer,
    agentToolMcpRunSessionDeactivator: sessionDeactivator,
  });
};

const buildMetadata = (): AgentRunMetadata => ({
  runId: RUN_ID,
  agentDefinitionId: AGENT_DEFINITION_ID,
  workspaceRootPath: WORKSPACE_ROOT,
  memoryDir: `${WORKSPACE_ROOT}/memory/${RUN_ID}`,
  llmModelIdentifier: "fixture-model",
  llmConfig: null,
  autoExecuteTools: true,
  skillAccessMode: SkillAccessMode.NONE,
  runtimeKind: RuntimeKind.CODEX_APP_SERVER,
  platformAgentRunId: null,
  activationState: "PREPARED",
  preparedAt: "2026-09-03T12:00:00.000Z",
  preparedExpiresAt: "2026-09-04T12:00:00.000Z",
  startedAt: null,
  applicationExecutionContext: null,
  archivedAt: null,
});

const loadGraphql = async (): Promise<typeof graphqlFn> => {
  const require = createRequire(import.meta.url);
  const typeGraphqlRoot = path.dirname(require.resolve("type-graphql"));
  const graphqlPath = require.resolve("graphql", { paths: [typeGraphqlRoot] });
  return (await import(graphqlPath)).graphql as typeof graphqlFn;
};

const execute = async <T>(
  graphql: typeof graphqlFn,
  schema: GraphQLSchema,
  source: string,
  variables?: Record<string, unknown>,
): Promise<T> => {
  const result = await graphql({ schema, source, variableValues: variables });
  expect(result.errors).toBeUndefined();
  return result.data as T;
};

type Harness = {
  schema: GraphQLSchema;
  graphql: typeof graphqlFn;
  manager: AgentRunManager;
  closeStudioServices: () => void;
  dataRoot: string;
};

const startHarness = async (terminationAccepted: boolean): Promise<Harness & RuntimeFixture> => {
  const dataRoot = await mkdtemp(path.join(os.tmpdir(), "standalone-error-termination-e2e-"));
  await writeFile(path.join(dataRoot, ".env"), "APP_ENV=test\n", "utf8");
  appConfigProvider.config.setCustomAppDataDir(dataRoot);
  const runtime = createErrorBackend(terminationAccepted);
  const manager = createManager(runtime.backend);
  const candidate = await manager.prepareNewAgentRun({ runId: RUN_ID, config: createConfig() });
  candidate.commitPublication();

  const memoryDir = appConfigProvider.config.getMemoryDir();
  const catalogService = new AgentRunHistoryCatalogService(memoryDir, {
    agentDefinitionService: {
      getAgentDefinitionById: vi.fn(async () => ({ name: "Error Agent" })),
    },
    agentRunManager: manager,
  });
  await catalogService.recordPreparedRun({
    runId: RUN_ID,
    metadata: buildMetadata(),
    summary: "Current error run",
    createdAt: "2026-09-03T12:00:00.000Z",
  });
  await catalogService.recordRunStarted({
    runId: RUN_ID,
    platformAgentRunId: "fixture-thread-error",
    runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    startedAt: "2026-09-03T12:00:01.000Z",
  });

  const statusProjectionService = new AgentRunStatusProjectionService({
    agentRunManager: manager,
  });
  const historyService = new AgentRunHistoryService(memoryDir, {
    catalogService,
    agentRunManager: manager,
    statusProjectionService,
  });
  workspaceHistoryHolder.service = new WorkspaceRunHistoryService({
    agentRunHistoryService: historyService,
    teamRunHistoryService: { listTeamRunHistory: vi.fn(async () => []) } as never,
  });

  const agentRunService = new AgentRunService(memoryDir, {
    agentRunManager: manager,
    historyCatalogService: catalogService,
    workspaceManager: {} as never,
    provisioningService: {} as never,
    lifecycleService: {} as never,
  });
  const studioHandle = configureE2eStudioApplicationApiServices({
    agentDefinitionService: {} as never,
    agentTeamDefinitionService: {} as never,
    agentRunService,
  });
  const schema = await buildGraphqlSchema();
  return {
    ...runtime,
    schema,
    graphql: await loadGraphql(),
    manager,
    closeStudioServices: studioHandle.close,
    dataRoot,
  };
};

const queryHistory = async (harness: Harness) => execute<{
  listWorkspaceRunHistory: Array<{
    workspaceRootPath: string;
    agentDefinitions: Array<{
      runs: Array<{
        runId: string;
        status: string;
        isActive: boolean;
        shouldConnectStream: boolean;
        statusSource: string;
        terminatedAt: string | null;
      }>;
    }>;
  }>;
}>(harness.graphql, harness.schema, `
  query StandaloneErrorHistory {
    listWorkspaceRunHistory(limitPerAgent: 6) {
      workspaceRootPath
      agentDefinitions {
        runs {
          runId
          status
          isActive
          shouldConnectStream
          statusSource
          terminatedAt
        }
      }
    }
  }
`);

const terminate = async (harness: Harness) => execute<{
  terminateAgentRun: { success: boolean; message: string };
}>(harness.graphql, harness.schema, `
  mutation StopStandaloneError($runId: String!) {
    terminateAgentRun(agentRunId: $runId) {
      success
      message
    }
  }
`, { runId: RUN_ID });

const harnesses: Harness[] = [];

afterEach(async () => {
  workspaceHistoryHolder.service = null;
  while (harnesses.length > 0) {
    const harness = harnesses.pop()!;
    harness.closeStudioServices();
    AgentRunManager.releaseProcessInstance(harness.manager);
    await rm(harness.dataRoot, { recursive: true, force: true });
  }
  vi.clearAllMocks();
});

describe("Standalone Error run status and termination GraphQL lifecycle", () => {
  it("lists a manager-owned Error runtime as active, terminates it, and retains inactive history", async () => {
    const harness = await startHarness(true);
    harnesses.push(harness);

    const initial = await queryHistory(harness);
    const initialRun = initial.listWorkspaceRunHistory[0]?.agentDefinitions[0]?.runs[0];
    expect(initialRun).toEqual({
      runId: RUN_ID,
      status: "error",
      isActive: true,
      shouldConnectStream: true,
      statusSource: "ACTIVE_RUNTIME",
      terminatedAt: null,
    });

    await expect(terminate(harness)).resolves.toEqual({
      terminateAgentRun: {
        success: true,
        message: "Agent run terminated successfully.",
      },
    });
    expect(harness.terminate).toHaveBeenCalledTimes(1);
    expect(harness.manager.getActiveRun(RUN_ID)).toBeNull();

    const settled = await queryHistory(harness);
    const settledRun = settled.listWorkspaceRunHistory[0]?.agentDefinitions[0]?.runs[0];
    expect(settledRun).toMatchObject({
      runId: RUN_ID,
      status: "offline",
      isActive: false,
      shouldConnectStream: false,
      statusSource: "TERMINATED_METADATA",
    });
    expect(settledRun?.terminatedAt).toEqual(expect.any(String));

    await expect(terminate(harness)).resolves.toEqual({
      terminateAgentRun: {
        success: false,
        message: "Agent run not found.",
      },
    });
    expect(harness.terminate).toHaveBeenCalledTimes(1);
    expect((await queryHistory(harness)).listWorkspaceRunHistory[0]?.agentDefinitions[0]?.runs[0])
      .toEqual(settledRun);
  });

  it("keeps a rejected Error runtime active and retryable without recording false termination", async () => {
    const harness = await startHarness(false);
    harnesses.push(harness);

    await expect(terminate(harness)).resolves.toEqual({
      terminateAgentRun: {
        success: false,
        message: "Agent run not found.",
      },
    });
    expect(harness.terminate).toHaveBeenCalledTimes(1);
    expect(harness.manager.getActiveRun(RUN_ID)).not.toBeNull();
    expect((await queryHistory(harness)).listWorkspaceRunHistory[0]?.agentDefinitions[0]?.runs[0])
      .toEqual({
        runId: RUN_ID,
        status: "error",
        isActive: true,
        shouldConnectStream: true,
        statusSource: "ACTIVE_RUNTIME",
        terminatedAt: null,
      });
  });
});
