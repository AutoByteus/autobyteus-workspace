import { testViewStreams } from "../../helpers/view-streams.js";
import { teamMembershipTestCollaborators } from "../../helpers/team-membership-test-collaborators.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

// autobyteus-461 SR-052: the application host composes the same steps 1–8 as the studio. Here they run for real, in
// the real host start, over fake run services (no runtime starts): a run that is not application-bound delegates
// through the process `delegate_task` service, and its Task's closure stops the new run through the host's run control.
const mocks = vi.hoisted(() => {
  const dirs = { root: "" };
  const appConfig = {
    initialize: vi.fn(),
    getLogsDir: () => path.join(dirs.root, "logs"),
    getMemoryDir: () => path.join(dirs.root, "memory"),
    getTempWorkspaceDir: () => path.join(dirs.root, "temp_workspace"),
    getAppDataDir: () => dirs.root,
    get: () => undefined,
    getBaseUrl: () => "http://localhost:8000",
    getAppRootDir: () => dirs.root,
    getOperationalDatabaseUrl: () => `file:${dirs.root}/operational.db`,
    getOperationalDatabaseLocation: () => ({
      databasePath: `${dirs.root}/operational.db`, rootKeyPath: `${dirs.root}/root.key`, databaseUrl: `file:${dirs.root}/operational.db`,
    }),
  };
  const generalAuthority = { scopeIdentity: "general-process", runSessions: {}, assertReady: vi.fn(), blockNewSessions: vi.fn(), close: vi.fn() };
  const mcpHost = {
    sessionAuthorities: { begin: vi.fn(() => ({ scopeIdentity: "general-process", runSessions: {}, complete: vi.fn(() => generalAuthority), abort: vi.fn() })) },
    listen: vi.fn(async () => undefined),
    close: vi.fn(async () => undefined),
  };
  // The run services the composition is given (step 3): the new run is prepared, takes its work packet, and stops.
  const workPackets: unknown[] = [];
  const childRoot = { acceptWorkPacket: vi.fn(async (packet: { assertAllowed(): void }) => { packet.assertAllowed(); workPackets.push(packet); return { accepted: true }; }) };
  const agentRunService = {
    prepareAgentRun: vi.fn(async () => ({ runId: "child-run" })),
    recordCollaborating: vi.fn(async () => undefined),
    cancelPreparedAgentRun: vi.fn(async () => undefined),
    getAgentRun: vi.fn(() => null),
    stopForTaskClosure: vi.fn(async (_agentRunId: string, stillClosed: () => boolean) => (stillClosed() ? "stopped" : "kept_open")),
  };
  const teamRunService = {
    runAgents: {}, getActiveTeamRun: vi.fn(() => null), restoreTeamRun: vi.fn(), resolveManagedTeamRun: vi.fn(),
    terminateTeamRun: vi.fn(), createTeamRun: vi.fn(), stopForTaskClosure: vi.fn(),
  };
  const generalProcessRunSupervisor = {
    agentRunService,
    teamRunService,
    agentOrgRunService: { getActive: vi.fn(() => null), restore: vi.fn() },
    standaloneRootManager: { runAgents: {}, resolveRoot: vi.fn(async (runId: string) => (runId === "child-run" ? childRoot : null)) },
    teamRunHistoryService: {},
    delegatedWorkGuard: { guard: (_run: unknown, _action: unknown, perform: () => Promise<unknown>) => perform() },
    close: vi.fn(async () => undefined),
  };
  const hostDefinitionServices = {
    agentDefinitionService: {}, agentTeamDefinitionService: {}, agentOrgDefinitionService: {},
    definitionAdmissionService: { scan: vi.fn(async () => []) },
    agentDefinitionChanges: { subscribe: vi.fn(() => () => undefined) },
    close: vi.fn(),
  };
  const app = {
    addHook: vi.fn(), listen: vi.fn(async () => "http://127.0.0.1:43210"), close: vi.fn(async () => undefined),
    server: { address: vi.fn(() => ({ address: "127.0.0.1", family: "IPv4", port: 43210 })) },
  };
  return {
    dirs, appConfig, mcpHost, childRoot, workPackets, agentRunService, generalProcessRunSupervisor, hostDefinitionServices, app,
    runPending: vi.fn(async () => []),
    capabilityReadiness: vi.fn(async () => ({ token_usage_history: true, custom_llm_providers: true, node_identity: true, memory_sync: true })),
  };
});

vi.mock("autobyteus-ts/secrets/provider-api-key-resolver.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("autobyteus-ts/secrets/provider-api-key-resolver.js")>(),
  disableEnvironmentProviderApiKeySource: vi.fn(),
}));
vi.mock("repository_prisma", async (importOriginal) => ({
  ...await importOriginal<typeof import("repository_prisma")>(), initializePrisma: vi.fn(async () => undefined), shutdownPrisma: vi.fn(async () => undefined),
}));
vi.mock("../../../src/config/app-config-provider.js", () => ({ appConfigProvider: { initialize: vi.fn(() => mocks.appConfig) } }));
vi.mock("../../../src/config/logging-config.js", () => ({
  getLoggingConfigFromEnv: vi.fn(() => ({ level: "silent", httpAccessLogMode: "off", includeNoisyHttpAccessRoutes: false })),
}));
vi.mock("../../../src/logging/runtime-logger-bootstrap.js", () => ({ initializeRuntimeLoggerBootstrap: vi.fn(() => ({ logFilePath: "/tmp/standalone.log" })) }));
vi.mock("../../../src/logging/server-app-logger.js", () => ({
  createServerLogger: () => ({ info: vi.fn(), error: vi.fn(), warn: vi.fn(), debug: vi.fn() }), initializeServerAppLogger: vi.fn(),
}));
vi.mock("../../../src/startup/migrations.js", () => ({ runMigrations: vi.fn() }));
vi.mock("../../../src/startup/token-usage-current-schema-readiness.js", () => ({ assertTokenUsageCurrentSchema: vi.fn(async () => undefined) }));
vi.mock("../../../src/token-usage/providers/token-usage-capability.js", async (importOriginal) => ({
  ...await importOriginal<typeof import("../../../src/token-usage/providers/token-usage-capability.js")>(), configureTokenUsageCapability: vi.fn(),
}));
vi.mock("../../../src/secret-management/secret-vault-runtime.js", () => ({
  getSecretVaultRuntime: () => ({ initialize: vi.fn(async () => undefined), close: vi.fn(async () => undefined) }),
}));
vi.mock("../../../src/app-data-migrations/app-data-migration-runner.js", () => ({
  getAppDataMigrationRunner: () => ({ runPending: mocks.runPending, capabilityReadiness: mocks.capabilityReadiness }),
}));
vi.mock("../../../src/run-history/services/root-run-package-readiness-index.js", () => ({ RootRunPackageReadinessIndex: class { rebuild = vi.fn(async () => undefined); } }));
vi.mock("../../../src/agent-execution/events/default-agent-run-event-pipeline.js", () => ({
  resetDefaultAgentRunEventPipeline: vi.fn(async () => undefined), stopDefaultAgentRunEventPipeline: vi.fn(async () => undefined),
}));
vi.mock("../../../src/standalone-application-host/config/standalone-host-config-materializer.js", () => ({ materializeStandaloneHostConfig: vi.fn(async () => undefined) }));
vi.mock("../../../src/application-platform/launch-configuration/application-standalone-package-validator.js", () => ({
  validateStandaloneApplicationPackage: vi.fn(async () => ({ selection: { applicationId: "local-package::brief-studio" }, bundleService: {} })),
}));
vi.mock("../../../src/compositions/host-definition-services.js", () => ({ createHostDefinitionServices: vi.fn(() => mocks.hostDefinitionServices) }));
vi.mock("../../../src/agent-tools/mcp/agent-tools-mcp-host.js", () => ({ createAgentToolsMcpHost: vi.fn(() => mocks.mcpHost) }));
vi.mock("../../../src/compositions/create-process-agent-provider-factory-builder.js", () => ({ createProcessAgentProviderFactoryBuilder: vi.fn(() => ({})) }));
vi.mock("../../../src/services/published-artifacts/published-artifact-publication-service.js", () => ({ getGeneralProcessPublishedArtifactPublisher: vi.fn(() => ({})) }));
vi.mock("../../../src/agent-execution/runtime/general-process-run-supervisor.js", () => ({
  createGeneralProcessRunSupervisor: vi.fn(() => mocks.generalProcessRunSupervisor),
}));
// Steps 1–8 run for real; the spy only keeps what steps 4–8 returned (the host's Task service).
const composeCollaboration = vi.hoisted(() => ({ spy: null as null | ReturnType<typeof vi.fn> }));
vi.mock("../../../src/compositions/collaboration-composition.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../../src/compositions/collaboration-composition.js")>();
  composeCollaboration.spy = vi.fn(original.composeCollaboration);
  return { ...original, composeCollaboration: composeCollaboration.spy };
});
vi.mock("../../../src/workspaces/workspace-manager.js", () => ({ getWorkspaceManager: () => ({}) }));
vi.mock("../../../src/runtime-management/runtime-availability-service.js", () => ({ getRuntimeAvailabilityService: () => ({}) }));
vi.mock("../../../src/llm-management/services/model-catalog-service.js", () => ({
  getModelCatalogService: () => ({
    resolveExactCurrentLlmModel: vi.fn(async () => null),
    runtimeModelSelectionCatalog: vi.fn(async () => ({ offeredModels: [], findExactCurrent: () => null })),
  }),
}));
vi.mock("../../../src/llm-management/services/model-availability-service.js", () => ({ getModelAvailabilityService: () => ({ loadOnDemandModel: async () => "not_on_demand" }) }));
vi.mock("../../../src/llm-management/llm-providers/services/llm-provider-service.js", () => ({ getLlmProviderService: () => ({}) }));
vi.mock("../../../src/runtime-management/codex/client/codex-app-server-client-manager.js", () => ({ getCodexAppServerClientManager: () => ({}) }));
vi.mock("autobyteus-ts/llm/llm-factory.js", () => ({ LLMFactory: { requireCurrentModelIdentifier: vi.fn(async () => undefined) } }));
vi.mock("../../../src/application-platform/runtime/build-application-platform-runtime.js", () => ({
  buildApplicationPlatformRuntime: vi.fn(() => ({ lifecycle: { prepareBeforeListen: vi.fn(async () => undefined), recoverAfterListen: vi.fn(async () => undefined) } })),
}));
vi.mock("../../../src/compositions/build-standalone-application-server.js", () => ({ buildStandaloneApplicationServer: vi.fn(async () => mocks.app) }));
vi.mock("autobyteus-ts/tools/file/workspace-path-utils.js", () => ({ configureFileToolDeniedPaths: vi.fn() }));

import { startStandaloneApplicationHost } from "../../../src/standalone-application-host/start-standalone-application-host.js";
import { createAgentRootExecutionIdentity, createCollaborationMemberExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import type { MemberTaskCapability } from "../../../src/agent-collaboration/execution/task/member-task-capability.js";
import { getTaskDelegationToolService } from "../../../src/agent-tools/task-delegation/task-delegation-tool-service.js";
import type { DelegateTaskToolInput } from "../../../src/agent-tools/task-delegation/task-delegation-tool-input-parsers.js";
import type { Collaboration } from "../../../src/compositions/collaboration-composition.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentOrgRunManager } from "../../../src/agent-org-execution/services/agent-org-run-manager.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { NO_PEER_CHANNEL, NO_REMOTE_FILES } from "../../helpers/explicit-host-collaborators.js";

const input = { packageRoot: "/tmp/standalone-package", localApplicationId: "brief-studio", appDataDir: "/tmp/standalone-data", host: "127.0.0.1", port: 0 };

// The process run managers the real supervisor creates before steps 4–8 (older readers find them, FU-011).
let managers: Readonly<{ agents: AgentRunManager; teams: AgentTeamRunManager; orgs: AgentOrgRunManager }> | null = null;
beforeEach(async () => {
  mocks.dirs.root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "app-host-delegation-")));
  mocks.workPackets.length = 0;
  managers = {
    agents: AgentRunManager.initializeProcessInstance({
      autoByteusBackendFactory: {} as never, codexBackendFactory: {} as never, claudeBackendFactory: {} as never, agyBackendFactory: {} as never,
      grokBackendFactory: {} as never, deepSeekHarnessBackendFactory: {} as never, activationRegistry: { getActiveRun: () => null } as never,
      memoryRecorder: {} as never, providerInputNormalizer: { normalizeForProvider: (dispatch) => dispatch }, agentToolMcpRunSessionDeactivator: {} as never, runPasses: null,
    }),
    teams: AgentTeamRunManager.initializeProcessInstance({ ...teamMembershipTestCollaborators(), remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_REMOTE_FILES.received, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(),
      memoryDir: path.join(mocks.dirs.root, "memory"), flatTeamExecutionFactory: {} as never, memberExecutionContextBuilder: {} as never,
      modelSelectionValidator: { validate: () => undefined } as never }),
    orgs: AgentOrgRunManager.initializeProcessInstance({ delegationIndex: noDelegations(), taskRecords: openTaskRecords(),
      memoryDir: path.join(mocks.dirs.root, "memory"), scopeBuilder: {} as never }),
  };
});
afterEach(async () => {
  vi.clearAllMocks();
  if (managers) { AgentOrgRunManager.releaseProcessInstance(managers.orgs); AgentTeamRunManager.releaseProcessInstance(managers.teams); AgentRunManager.releaseProcessInstance(managers.agents); managers = null; }
  await fs.rm(mocks.dirs.root, { recursive: true, force: true });
});

describe("the standalone application host composes delegation (autobyteus-461 SR-052)", () => {
  it("a run that is not application-bound delegates, and its Task's closure stops the new run", async () => {
    const handle = await startStandaloneApplicationHost(input);
    try {
      const collaboration = await (composeCollaboration.spy!.mock.results[0]!.value as Promise<Collaboration>);
      // A standalone run of the host's general process, not bound to the application.
      const senderRun = createAgentRootExecutionIdentity("sender-run");
      const sender = createCollaborationMemberExecutionIdentity({ root: senderRun, memberAddress: "/assistant", agentRunId: "sender-run" });
      const commands: MemberTaskCapability = {
        root: senderRun,
        delegationSource: async (caller) => ({
          sender: caller, senderRun,
          // The sender root's placement: a catalog agent of this node (an application-bound root finds none, SR-052).
          resolvePlacement: async (address) => ({ kind: "agent", address, source: { agentDefinitionId: "code-reviewer",
            launchConfiguration: { runtimeKind: "autobyteus", llmModelIdentifier: "model-1", llmConfig: null, autoExecuteTools: false,
              workspaceRootPath: mocks.dirs.root } } }) as never,
          peerRunLinked: async () => undefined,
        }),
        ownedTaskOf: () => null,
      };

      const result = await getTaskDelegationToolService().delegateTask({ identity: sender, commands },
        { subject: "new_copy", input: { recipient_address: "/code_reviewer", description: "Review the change" } } as DelegateTaskToolInput);

      expect(result).toMatchObject({ delegated: true, target_kind: "agent", target_agent_run_id: "child-run", task_id: expect.any(String) });
      expect(mocks.agentRunService.prepareAgentRun).toHaveBeenCalledWith(expect.objectContaining({ agentDefinitionId: "code-reviewer",
        delegatedFrom: { delegatingRun: { kind: "agent", runId: "sender-run" }, delegatorAgentRunId: "sender-run" } }));
      expect(mocks.childRoot.acceptWorkPacket).toHaveBeenCalledTimes(1);
      const taskId = (result as { task_id: string }).task_id;
      expect(collaboration.tasks).toBeDefined();

      expect(mocks.agentRunService.stopForTaskClosure).not.toHaveBeenCalled();

      await collaboration.tasks.updateTaskById({ taskId, status: "DONE" });

      await vi.waitFor(() => expect(mocks.agentRunService.stopForTaskClosure).toHaveBeenCalledWith("child-run", expect.any(Function)));
      expect(await mocks.agentRunService.stopForTaskClosure.mock.results[0]!.value).toBe("stopped");
    } finally {
      await handle.close();
    }
  });
});
