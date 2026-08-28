import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentProviderFactoryBuilder } from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { GeneralProcessRunSupervisor } from "../../../src/agent-execution/runtime/general-process-run-supervisor.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import type { AppConfig } from "../../../src/config/app-config.js";
import {
  AgentRunService,
  bindProcessAgentRunService,
  getAgentRunService,
  releaseProcessAgentRunService,
} from "../../../src/agent-execution/services/agent-run-service.js";
import { getTeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { MixedTeamRunBackendFactory } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-backend-factory.js";
import type { MixedTeamManager } from "../../../src/agent-team-execution/backends/mixed/mixed-team-manager.js";

const createAuthority = (): ScopedAgentToolMcpSessionAuthority => ({
  scopeIdentity: "general-process",
  runSessions: Object.freeze({
    activateForRun: vi.fn(),
    deactivateForRun: vi.fn(() => 0),
  }),
  assertReady: vi.fn(),
  blockNewSessions: vi.fn(),
  close: vi.fn(),
});

const createProviderBuilder = (): AgentProviderFactoryBuilder => ({
  createForExecution: vi.fn(() => ({
    autoByteus: {} as never,
    codex: {} as never,
    claude: {} as never,
  })),
});

const teamManagerStub = Object.freeze({
  isActive: () => true,
  getLeafAgentStatusSnapshots: () => [],
  hasOpenExecutionWork: () => false,
}) as unknown as MixedTeamManager;
const createBackendFactory = () => new MixedTeamRunBackendFactory({
  createTeamManager: () => teamManagerStub,
});

const createSupervisorInput = () => {
  const agentDefinitionService = new AgentDefinitionService();
  const agentTeamDefinitionService = new AgentTeamDefinitionService({
    agentDefinitionService,
  });
  return {
    memoryDir: "/tmp/general-process-run-supervisor",
    contextFilePathEnvironment: {
      appDataDir: "/tmp/general-process-run-supervisor/app-data",
      baseUrl: "http://localhost:8000",
    },
    agentDefinitionService,
    agentTeamDefinitionService,
    workspaceManager: WorkspaceManager.getInstance(),
    agentProviderFactoryBuilder: createProviderBuilder(),
    agentToolMcpSessionAuthority: createAuthority(),
    modelConfigValidator: { validate: vi.fn() },
  };
};

describe("GeneralProcessRunSupervisor ownership", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps migration/history construction passive and owns exactly one process manager family", async () => {
    expect(() => AgentTeamRunManager.getInstance()).toThrow(
      "The process AgentTeamRunManager is not initialized.",
    );
    const getDefaultTeamManager = vi.spyOn(AgentTeamRunManager, "getInstance");
    const initializeAgentManager = vi.spyOn(AgentRunManager, "initializeProcessInstance");
    const initializeTeamManager = vi.spyOn(AgentTeamRunManager, "initializeProcessInstance");

    const migrationRegistry = new AppDataMigrationRegistry();
    expect(migrationRegistry.listDefinitions().length).toBeGreaterThan(0);
    expect(getDefaultTeamManager).not.toHaveBeenCalled();

    const input = createSupervisorInput();
    const supervisor = new GeneralProcessRunSupervisor(input);
    expect(initializeAgentManager).toHaveBeenCalledTimes(1);
    expect(initializeTeamManager).toHaveBeenCalledTimes(1);
    expect(getDefaultTeamManager).not.toHaveBeenCalled();
    expect(getAgentRunService()).toBe(supervisor.agentRunService);
    expect(getTeamRunService()).toBe(supervisor.teamRunService);
    expect(input.agentProviderFactoryBuilder.createForExecution).toHaveBeenCalledWith({
      agentDefinitionService: input.agentDefinitionService,
      agentToolMcpRunSessions: input.agentToolMcpSessionAuthority.runSessions,
    });

    const owned = supervisor as unknown as {
      agentRunManager: AgentRunManager;
      agentTeamRunManager: AgentTeamRunManager;
      agentRunService: { agentRunManager: AgentRunManager };
      teamRunService: {
        definitions: AgentTeamDefinitionService;
        manager: AgentTeamRunManager;
        agentIdentityAllocator: { agentDefinitionService: AgentDefinitionService };
      };
    };
    expect(owned.agentRunService.agentRunManager).toBe(owned.agentRunManager);
    expect(owned.teamRunService.definitions).toBe(input.agentTeamDefinitionService);
    expect(owned.teamRunService.manager).toBe(owned.agentTeamRunManager);
    expect(owned.teamRunService.agentIdentityAllocator.agentDefinitionService)
      .toBe(input.agentDefinitionService);
    expect(AgentTeamRunManager.getInstance()).toBe(owned.agentTeamRunManager);
    expect(getDefaultTeamManager).toHaveBeenCalledTimes(1);

    const factoryOptions = (owned.agentTeamRunManager as unknown as {
      factory: { options: {
        createTeamManager(input: unknown): object;
      } };
    }).factory.options;
    const callbacks = {
      taskRootResolver: { resolveActiveRoot: vi.fn() },
      publish: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
      acceptPlatformBinding: vi.fn(),
    };
    const constructionInput = {
      context: {} as never,
      subTeamRunFactory: {} as never,
      callbacks,
    };
    const mixedManager = factoryOptions.createTeamManager(constructionInput) as {
      configured: { options: Record<string, unknown> };
      taskAgents: { options: Record<string, unknown> };
    };
    const configured = mixedManager.configured.options;
    const taskAgents = mixedManager.taskAgents.options;
    for (const options of [configured, taskAgents]) {
      expect(options.agentRunManager).toBe(owned.agentRunManager);
      expect(options.workspaceManager).toBe(input.workspaceManager);
      expect(options.taskRootResolver).toBe(callbacks.taskRootResolver);
      expect(options.publish).toBe(callbacks.publish);
      expect(options.deliverInterAgentMessage)
        .toBe(callbacks.deliverInterAgentMessage);
      expect(options.acceptPlatformBinding).toBe(callbacks.acceptPlatformBinding);
      expect(options.memoryLocationService).toBeTruthy();
      expect(options.activityInspector).toBeTruthy();
      expect(options.memberTeamContextBuilder).toBeTruthy();
    }
    expect(configured.subTeamRunFactory)
      .toBe(constructionInput.subTeamRunFactory);
    expect(taskAgents.memoryLocationService)
      .toBe(configured.memoryLocationService);
    expect(taskAgents.activityInspector).toBe(configured.activityInspector);
    expect(taskAgents.memberTeamContextBuilder)
      .toBe(configured.memberTeamContextBuilder);

    const order: string[] = [];
    vi.spyOn(owned.agentTeamRunManager, "stopAllTeamRuns").mockImplementation(async () => {
      order.push("teams");
    });
    vi.spyOn(owned.agentRunManager, "stopAllAgentRuns").mockImplementation(async () => {
      order.push("agents");
    });
    vi.mocked(input.agentToolMcpSessionAuthority.close).mockImplementation(() => {
      order.push("authority");
    });
    await supervisor.close();
    await supervisor.close();
    expect(order).toEqual(["teams", "agents", "authority"]);

    const restartedSupervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    expect(initializeAgentManager).toHaveBeenCalledTimes(2);
    expect(initializeTeamManager).toHaveBeenCalledTimes(2);
    await restartedSupervisor.close();
  });

  it("releases the agent manager when exclusive team-manager initialization fails", async () => {
    const conflictingTeamManager = AgentTeamRunManager.initializeProcessInstance({
      memoryDir: "/tmp/general-process-run-supervisor-conflict",
      mixedTeamRunBackendFactory: createBackendFactory(),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({
        allocateForAgentDefinition: async () => "task-agent-run",
      }),
      modelConfigValidator: { validate: vi.fn() },
    });
    try {
      expect(() => new GeneralProcessRunSupervisor(createSupervisorInput())).toThrow(
        "The process AgentTeamRunManager is already initialized.",
      );
    } finally {
      AgentTeamRunManager.releaseProcessInstance(conflictingTeamManager);
    }

    const recoveredSupervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    await expect(recoveredSupervisor.close()).resolves.toBeUndefined();
  });

  it("fails on an early process run service and releases constructed managers", async () => {
    const conflictingService = {} as AgentRunService;
    bindProcessAgentRunService(conflictingService);
    try {
      expect(() => new GeneralProcessRunSupervisor(createSupervisorInput())).toThrow(
        "The process AgentRunService is already initialized.",
      );
    } finally {
      releaseProcessAgentRunService(conflictingService);
    }

    const recoveredSupervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    await expect(recoveredSupervisor.close()).resolves.toBeUndefined();
  });

  it("rejects every omitted, null, or undefined required input before manager mutation", async () => {
    for (const property of [
      "memoryDir",
      "contextFilePathEnvironment",
      "agentDefinitionService",
      "agentTeamDefinitionService",
      "workspaceManager",
      "agentProviderFactoryBuilder",
      "agentToolMcpSessionAuthority",
      "modelConfigValidator",
    ] as const) {
      for (const value of ["omitted", null, undefined] as const) {
        const invalid = { ...createSupervisorInput() } as Record<string, unknown>;
        if (value === "omitted") delete invalid[property];
        else invalid[property] = value;
        expect(() => new GeneralProcessRunSupervisor(invalid as never)).toThrow(
          "Complete GeneralProcessRunSupervisor input is required.",
        );
      }
    }

    for (const property of ["appDataDir", "baseUrl"] as const) {
      for (const value of ["omitted", null, undefined] as const) {
        const invalid = { ...createSupervisorInput() } as Record<string, unknown>;
        const environment = {
          ...(invalid.contextFilePathEnvironment as Record<string, unknown>),
        };
        if (value === "omitted") delete environment[property];
        else environment[property] = value;
        invalid.contextFilePathEnvironment = environment;
        expect(() => new GeneralProcessRunSupervisor(invalid as never)).toThrow(
          "Complete GeneralProcessRunSupervisor input is required.",
        );
      }
    }

    const recoveredSupervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    await expect(recoveredSupervisor.close()).resolves.toBeUndefined();
  });
});
