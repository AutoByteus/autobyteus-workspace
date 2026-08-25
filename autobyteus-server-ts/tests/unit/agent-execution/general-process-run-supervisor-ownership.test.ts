import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentToolMcpSessionManager } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { GeneralProcessRunSupervisor } from "../../../src/agent-execution/runtime/general-process-run-supervisor.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
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

const sessionManager = {
  createAgentToolMcpSession: vi.fn(),
  revokeAgentToolMcpSession: vi.fn(() => false),
  revokeAgentToolMcpSessionsForRun: vi.fn(() => 0),
  revokeAgentToolMcpSessionsForOwner: vi.fn(() => 0),
  redactAgentToolMcpDescriptor: vi.fn(),
} as unknown as AgentToolMcpSessionManager;

const createSupervisorInput = () => {
  const agentDefinitionService = new AgentDefinitionService();
  const agentTeamDefinitionService = new AgentTeamDefinitionService({
    agentDefinitionService,
  });
  return {
    appConfig: {
      getMemoryDir: () => "/tmp/general-process-run-supervisor",
    } as AppConfig,
    agentDefinitionService,
    agentTeamDefinitionService,
    agentToolsSessionManager: sessionManager,
  };
};

describe("GeneralProcessRunSupervisor ownership", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("keeps migration/history construction passive and owns exactly one process manager family", async () => {
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

    const owned = supervisor as unknown as {
      agentRunManager: {
        autoByteusBackendFactory: { agentDefinitionService: AgentDefinitionService };
        codexBackendFactory: {
          threadBootstrapper: {
            agentDefinitionService: AgentDefinitionService;
            agentToolMcpSessionService: AgentToolMcpSessionManager;
          };
        };
        claudeBackendFactory: {
          sessionManager: { agentToolMcpSessionService: AgentToolMcpSessionManager };
          sessionBootstrapper: { agentDefinitionService: AgentDefinitionService };
        };
      };
      agentTeamRunManager: AgentTeamRunManager;
      agentRunService: { agentRunManager: AgentRunManager };
      teamRunService: {
        definitions: AgentTeamDefinitionService;
        manager: AgentTeamRunManager;
        agentIdentityAllocator: { agentDefinitionService: AgentDefinitionService };
      };
    };
    expect(owned.agentRunManager.autoByteusBackendFactory.agentDefinitionService)
      .toBe(input.agentDefinitionService);
    expect(owned.agentRunManager.codexBackendFactory.threadBootstrapper.agentDefinitionService)
      .toBe(input.agentDefinitionService);
    expect(owned.agentRunManager.codexBackendFactory.threadBootstrapper.agentToolMcpSessionService)
      .toBe(input.agentToolsSessionManager);
    expect(owned.agentRunManager.claudeBackendFactory.sessionBootstrapper.agentDefinitionService)
      .toBe(input.agentDefinitionService);
    expect(owned.agentRunManager.claudeBackendFactory.sessionManager.agentToolMcpSessionService)
      .toBe(input.agentToolsSessionManager);
    expect(owned.agentRunService.agentRunManager).toBe(owned.agentRunManager);
    expect(owned.teamRunService.definitions).toBe(input.agentTeamDefinitionService);
    expect(owned.teamRunService.manager).toBe(owned.agentTeamRunManager);
    expect(owned.teamRunService.agentIdentityAllocator.agentDefinitionService)
      .toBe(input.agentDefinitionService);

    await supervisor.close();
    await supervisor.close();

    const restartedSupervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    expect(initializeAgentManager).toHaveBeenCalledTimes(2);
    expect(initializeTeamManager).toHaveBeenCalledTimes(2);
    await restartedSupervisor.close();
  });

  it("releases the agent manager when exclusive team-manager initialization fails", async () => {
    const conflictingTeamManager = AgentTeamRunManager.initializeProcessInstance({});
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
      "appConfig",
      "agentDefinitionService",
      "agentTeamDefinitionService",
      "agentToolsSessionManager",
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

    const recoveredSupervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    await expect(recoveredSupervisor.close()).resolves.toBeUndefined();
  });
});
