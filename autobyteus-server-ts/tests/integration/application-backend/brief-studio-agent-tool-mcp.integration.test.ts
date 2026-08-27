import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";
import fastify from "fastify";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";
import { buildRuntimeAgentToolExposure } from "../../../src/agent-execution/shared/runtime-agent-tool-exposure.js";
import { AgentToolMcpCatalog } from "../../../src/agent-tools/mcp/agent-tool-mcp-catalog.js";
import { AgentToolMcpSessionRegistry } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-registry.js";
import { AgentToolMcpSessionService } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentToolMcpToolExecutor } from "../../../src/agent-tools/mcp/agent-tool-mcp-tool-executor.js";
import { AgentToolsMcpMethodDispatcher } from "../../../src/agent-tools/mcp/agent-tools-mcp-method-dispatcher.js";
import { registerAgentToolsMcpRoutes } from "../../../src/agent-tools/mcp/agent-tools-mcp-routes.js";
import {
  BUILT_IN_APPLICATION_PACKAGE_ID,
  FileApplicationBundleProvider,
} from "../../../src/application-bundles/providers/file-application-bundle-provider.js";
import { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { ApplicationAgentToolCatalog } from "../../../src/application-agent-tools/services/application-agent-tool-catalog.js";
import { beginApplicationAgentToolCapabilityAssembly } from "../../../src/application-agent-tools/services/application-agent-tool-capability.js";
import { ApplicationAgentToolCallLifecycle } from "../../../src/application-agent-tools/services/application-agent-tool-call-lifecycle.js";
import { ApplicationAgentToolGateway } from "../../../src/application-agent-tools/services/application-agent-tool-gateway.js";
import { ApplicationAgentToolPayloadValidator } from "../../../src/application-agent-tools/services/application-agent-tool-payload-validator.js";
import { ApplicationAgentToolWorkerInvoker } from "../../../src/application-agent-tools/services/application-agent-tool-worker-invoker.js";
import { ApplicationAvailabilityService } from "../../../src/application-orchestration/services/application-availability-service.js";
import { ApplicationOrchestrationStartupGate } from "../../../src/application-orchestration/services/application-orchestration-startup-gate.js";
import { ApplicationRunOwnershipService } from "../../../src/application-orchestration/services/application-run-ownership-service.js";
import { ApplicationRunBindingStore } from "../../../src/application-orchestration/stores/application-run-binding-store.js";
import { ApplicationRunLookupStore } from "../../../src/application-orchestration/stores/application-run-lookup-store.js";
import { ApplicationAvailabilityStateRegistry } from "../../../src/application-platform/runtime/application-availability-state-registry.js";
import { ApplicationStorageLifecycleService } from "../../../src/application-storage/services/application-storage-lifecycle-service.js";
import { ApplicationPlatformStateStore } from "../../../src/application-storage/stores/application-platform-state-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testMemberTeamContext } from "../../fixtures/current-team-run-fixtures.js";
import { createApplicationEngineTestRuntime } from "./application-engine-test-runtime.js";

const TOOL_NAME = "get_brief_context";
const IMPORTABLE_PACKAGE_ROOT = path.resolve(
  process.cwd(),
  "..",
  "applications/brief-studio/dist/importable-package",
);

type IssuedSession = ReturnType<AgentToolMcpSessionService["createAgentToolMcpSession"]>;

const postMcp = (
  app: ReturnType<typeof fastify>,
  session: IssuedSession,
  payload: unknown,
) => app.inject({
  method: "POST",
  url: `/mcp/agent-tools/${session.sessionId}`,
  headers: {
    authorization: session.descriptor.headers.Authorization,
    "content-type": "application/json",
    accept: "application/json",
  },
  payload: JSON.stringify(payload),
});

const packageRegistrySnapshot = (builtInRoot: string) => ({
  packages: [
    {
      packageId: BUILT_IN_APPLICATION_PACKAGE_ID,
      displayName: "Platform Applications",
      packageRootPath: builtInRoot,
      sourceKind: "BUILT_IN" as const,
      source: builtInRoot,
      applicationCount: 0,
      isPlatformOwned: true,
      isRemovable: false,
      managedInstallPath: builtInRoot,
      bundledSourceRootPath: builtInRoot,
    },
    {
      packageId: `application-local:${encodeURIComponent(IMPORTABLE_PACKAGE_ROOT)}`,
      displayName: "brief-studio",
      packageRootPath: IMPORTABLE_PACKAGE_ROOT,
      sourceKind: "LOCAL_PATH" as const,
      source: IMPORTABLE_PACKAGE_ROOT,
      applicationCount: 0,
      isPlatformOwned: false,
      isRemovable: true,
      managedInstallPath: null,
      bundledSourceRootPath: null,
    },
  ],
  diagnostics: [],
  refreshedAt: "2026-08-27T12:00:00.000Z",
});

const seedBriefRecords = (
  databasePath: string,
  rows: readonly Readonly<{
    briefId: string;
    bindingId: string;
    title: string;
    status: "drafting" | "in_review";
    teamRunId: string;
    timestamp: string;
  }>[],
): void => {
  const database = new DatabaseSync(databasePath);
  try {
    const insertBrief = database.prepare(
      `INSERT INTO briefs (
         brief_id, title, status, latest_binding_id, latest_run_id,
         latest_binding_status, last_error_message, created_at, updated_at,
         approved_at, rejected_at
       ) VALUES (?, ?, ?, ?, ?, 'ATTACHED', NULL, ?, ?, NULL, NULL)`,
    );
    const insertBinding = database.prepare(
      `INSERT INTO brief_bindings (
         binding_id, brief_id, launch_request_id, run_id,
         created_at, updated_at, artifact_catchup_completed_at
       ) VALUES (?, ?, ?, ?, ?, ?, NULL)`,
    );
    for (const row of rows) {
      insertBrief.run(
        row.briefId,
        row.title,
        row.status,
        row.bindingId,
        row.teamRunId,
        row.timestamp,
        row.timestamp,
      );
      insertBinding.run(
        row.bindingId,
        row.briefId,
        `launch-${row.briefId}`,
        row.teamRunId,
        row.timestamp,
        row.timestamp,
      );
    }
  } finally {
    database.close();
  }
};

describe("Brief Studio production application Agent Tool through MCP", () => {
  let tempRoot: string;
  let app: ReturnType<typeof fastify> | null;
  let engineRuntime: ReturnType<typeof createApplicationEngineTestRuntime> | null;
  let capability: ReturnType<typeof beginApplicationAgentToolCapabilityAssembly>["capability"] | null;

  beforeEach(async () => {
    tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "brief-studio-agent-tool-mcp-"));
    app = null;
    engineRuntime = null;
    capability = null;
  });

  afterEach(async () => {
    capability?.close();
    if (engineRuntime) {
      await engineRuntime.engineLauncher.stopAll();
      engineRuntime.backendGateway.dispose();
      engineRuntime.backendWebSocketSessionService.dispose();
      engineRuntime.notificationHub.closeAll();
    }
    await app?.close();
    await fs.rm(tempRoot, { recursive: true, force: true });
  });

  it("lists and executes the shipped Brief Studio handler over authenticated MCP with exact Team binding isolation", async () => {
    await expect(fs.stat(IMPORTABLE_PACKAGE_ROOT)).resolves.toBeDefined();
    const builtInRoot = path.join(tempRoot, "built-in");
    const appDataRoot = path.join(tempRoot, "app-data");
    await fs.mkdir(builtInRoot, { recursive: true });
    const provider = new FileApplicationBundleProvider(
      { getAppRootDir: () => builtInRoot } as never,
      {
        getBuiltInRootPath: () => builtInRoot,
        listAdditionalRootPaths: () => [IMPORTABLE_PACKAGE_ROOT],
      } as never,
      { listPackageRecords: async () => [] } as never,
    );
    const registrySnapshot = packageRegistrySnapshot(builtInRoot);
    const bundleService = new ApplicationBundleService({
      provider,
      packageRegistryService: {
        getRegistrySnapshot: async () => registrySnapshot,
      } as never,
    });
    const snapshot = await bundleService.getCatalogSnapshot();
    expect(snapshot.diagnostics).toEqual([]);
    expect(snapshot.applications).toHaveLength(1);
    const applicationId = snapshot.applications[0]!.id;
    expect(snapshot.applications[0]!.agentTools).toEqual([expect.objectContaining({
      name: TOOL_NAME,
      description: "Read the current Brief Studio brief for this application binding.",
    })]);

    const storageLifecycle = new ApplicationStorageLifecycleService({
      appConfig: { getAppDataDir: () => appDataRoot },
      applicationBundleService: bundleService,
    });
    const storage = await storageLifecycle.ensureStoragePrepared(applicationId);
    seedBriefRecords(storage.appDatabasePath, [
      {
        briefId: "brief-alpha",
        bindingId: "binding-alpha",
        title: "Production MCP proof",
        status: "in_review",
        teamRunId: "team-alpha",
        timestamp: "2026-08-27T12:00:01.000Z",
      },
      {
        briefId: "brief-beta",
        bindingId: "binding-beta",
        title: "Independent application binding",
        status: "drafting",
        teamRunId: "team-beta",
        timestamp: "2026-08-27T12:00:02.000Z",
      },
    ]);

    const platformStateStore = new ApplicationPlatformStateStore({
      appConfig: { getAppDataDir: () => appDataRoot },
      storageLifecycleService: storageLifecycle,
    });
    const bindingStore = new ApplicationRunBindingStore({ platformStateStore });
    const bindingRows = [
      {
        bindingId: "binding-alpha",
        teamRunId: "team-alpha",
        memberAddress: "/researcher" as const,
        agentRunId: "run-alpha",
      },
      {
        bindingId: "binding-beta",
        teamRunId: "team-beta",
        memberAddress: "/writer" as const,
        agentRunId: "run-beta",
      },
    ];
    for (const row of bindingRows) {
      await bindingStore.persistBinding({
        applicationId,
        bindingId: row.bindingId,
        launchRequestId: `launch-${row.bindingId}`,
        status: "ATTACHED",
        executionResourceRef: {
          source: "bundle",
          kind: "AGENT_TEAM",
          localId: "brief-studio-team",
        },
        runtime: {
          subject: "TEAM_RUN",
          teamRunId: row.teamRunId,
          definitionId: "brief-studio-team-definition",
          members: [{
            memberAddress: row.memberAddress,
            displayName: row.memberAddress.slice(1),
            agentRunId: row.agentRunId,
          }],
        },
        createdAt: "2026-08-27T12:00:00.000Z",
        updatedAt: "2026-08-27T12:00:00.000Z",
        terminatedAt: null,
        lastErrorMessage: null,
      });
    }

    const startupGate = new ApplicationOrchestrationStartupGate();
    await startupGate.runStartupRecovery(async () => undefined);
    const requireLiveTeamMember = vi.fn(async () => undefined);
    const ownership = new ApplicationRunOwnershipService({
      startupGate,
      lookupStore: new ApplicationRunLookupStore(),
      bindingStore,
      teamExecution: { requireLiveTeamMember },
    });
    const availability = new ApplicationAvailabilityService({
      applicationBundleService: bundleService,
      stateRegistry: new ApplicationAvailabilityStateRegistry(),
    });
    availability.synchronizeWithCatalogSnapshot(snapshot);
    engineRuntime = createApplicationEngineTestRuntime({
      applicationBundleService: bundleService,
      storageLifecycleService: storageLifecycle,
      availabilityService: availability,
      orchestrationHostService: {
        listRunBindings: vi.fn(async () => []),
      } as never,
    });

    const applicationCatalog = new ApplicationAgentToolCatalog();
    applicationCatalog.initializeFromBundleSnapshot(snapshot);
    const callLifecycle = new ApplicationAgentToolCallLifecycle();
    callLifecycle.open(applicationId);
    const assembly = beginApplicationAgentToolCapabilityAssembly(applicationCatalog);
    capability = assembly.complete(new ApplicationAgentToolGateway({
      availability,
      catalog: applicationCatalog,
      ownership,
      payloadValidator: new ApplicationAgentToolPayloadValidator(),
      lifecycle: callLifecycle,
      workerInvoker: new ApplicationAgentToolWorkerInvoker({
        controller: engineRuntime.engineController,
        launcher: engineRuntime.engineLauncher,
      }),
    }));

    const sessionRegistry = new AgentToolMcpSessionRegistry();
    const mcpCatalog = new AgentToolMcpCatalog({ adapters: [] });
    app = fastify();
    await registerAgentToolsMcpRoutes(app, {
      registry: sessionRegistry,
      dispatcher: new AgentToolsMcpMethodDispatcher({
        catalog: mcpCatalog,
        toolExecutor: new AgentToolMcpToolExecutor({ catalog: mcpCatalog }),
      }),
    });
    await app.ready();
    const sessionService = new AgentToolMcpSessionService({
      registry: sessionRegistry,
      catalog: mcpCatalog,
      getInternalBaseUrl: () => "http://127.0.0.1:1",
      executionCapabilities: {
        publishedArtifactPublisher: { publishManyForRun: vi.fn(async () => []) },
        applicationAgentTools: capability,
      },
    });
    const issueForTeamMember = (
      row: (typeof bindingRows)[number],
      runtimeKind: RuntimeKind,
    ): IssuedSession => {
      const memberTeamContext = testMemberTeamContext({
        rootTeamRunId: row.teamRunId,
        memberAddress: row.memberAddress,
        agentRunId: row.agentRunId,
      });
      return sessionService.createAgentToolMcpSession({
        owner: {
          runId: row.agentRunId,
          teamIdentity: memberTeamContext.identity,
        },
        sender: buildAgentRunMessageSenderContext({
          senderRunId: row.agentRunId,
          runtimeKind,
          memberTeamContext,
        }),
        runtimeKind,
        runtimeExposure: buildRuntimeAgentToolExposure([TOOL_NAME], memberTeamContext),
        executionContext: {
          applicationExecutionContext: {
            applicationId,
            bindingId: row.bindingId,
            producer: {
              agentRunId: row.agentRunId,
              displayName: row.memberAddress.slice(1),
            },
          },
        },
      });
    };
    const alphaSession = issueForTeamMember(
      bindingRows[0]!,
      RuntimeKind.CLAUDE_AGENT_SDK,
    );
    const betaSession = issueForTeamMember(
      bindingRows[1]!,
      RuntimeKind.CODEX_APP_SERVER,
    );
    const generalSession = sessionService.createAgentToolMcpSession({
      owner: { runId: "general-run" },
      sender: buildAgentRunMessageSenderContext({
        senderRunId: "general-run",
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      }),
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      runtimeExposure: buildRuntimeAgentToolExposure([TOOL_NAME]),
      executionContext: {},
    });

    const listed = await postMcp(app, alphaSession, {
      jsonrpc: "2.0",
      id: "list-alpha",
      method: "tools/list",
      params: {},
    });
    expect(listed.json()).toMatchObject({
      result: {
        tools: [{
          name: TOOL_NAME,
          description: "Read the current Brief Studio brief for this application binding.",
        }],
      },
    });
    const generalList = await postMcp(app, generalSession, {
      jsonrpc: "2.0",
      id: "list-general",
      method: "tools/list",
      params: {},
    });
    expect(generalList.json()).toMatchObject({ result: { tools: [] } });

    const alphaResult = await postMcp(app, alphaSession, {
      jsonrpc: "2.0",
      id: "call-alpha",
      method: "tools/call",
      params: { name: TOOL_NAME, arguments: {} },
    });
    expect(alphaResult.json()).toMatchObject({
      result: {
        content: [{
          type: "text",
          text: "Current brief: Production MCP proof (in_review).",
        }],
        structuredContent: {
          briefId: "brief-alpha",
          title: "Production MCP proof",
          status: "in_review",
          latestBindingStatus: "ATTACHED",
          updatedAt: "2026-08-27T12:00:01.000Z",
        },
      },
    });
    const betaResult = await postMcp(app, betaSession, {
      jsonrpc: "2.0",
      id: "call-beta",
      method: "tools/call",
      params: { name: TOOL_NAME, arguments: {} },
    });
    expect(betaResult.json()).toMatchObject({
      result: {
        content: [{
          type: "text",
          text: "Current brief: Independent application binding (drafting).",
        }],
        structuredContent: {
          briefId: "brief-beta",
          title: "Independent application binding",
          status: "drafting",
          latestBindingStatus: "ATTACHED",
          updatedAt: "2026-08-27T12:00:02.000Z",
        },
      },
    });
    expect(requireLiveTeamMember).toHaveBeenNthCalledWith(1, {
      rootTeamRunId: "team-alpha",
      memberAddress: "/researcher",
      agentRunId: "run-alpha",
    });
    expect(requireLiveTeamMember).toHaveBeenNthCalledWith(2, {
      rootTeamRunId: "team-beta",
      memberAddress: "/writer",
      agentRunId: "run-beta",
    });
    expect(engineRuntime.engineController.getStatus(applicationId)).toMatchObject({
      state: "ready",
      ready: true,
    });

    expect(sessionService.revokeAgentToolMcpSession(alphaSession.sessionId)).toBe(true);
    const revoked = await postMcp(app, alphaSession, {
      jsonrpc: "2.0",
      id: "call-revoked",
      method: "tools/call",
      params: { name: TOOL_NAME, arguments: {} },
    });
    expect(revoked.statusCode).toBe(404);
    expect(revoked.json()).toMatchObject({ error: "session_unavailable" });
  });
});
