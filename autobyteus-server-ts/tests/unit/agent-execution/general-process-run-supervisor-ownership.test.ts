import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentToolMcpSessionManager } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-service.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { GeneralProcessRunSupervisor } from "../../../src/agent-execution/runtime/general-process-run-supervisor.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";

const sessionManager = {
  createAgentToolMcpSession: vi.fn(),
  revokeAgentToolMcpSession: vi.fn(() => false),
  revokeAgentToolMcpSessionsForRun: vi.fn(() => 0),
  revokeAgentToolMcpSessionsForOwner: vi.fn(() => 0),
  redactAgentToolMcpDescriptor: vi.fn(),
} as unknown as AgentToolMcpSessionManager;

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

    const supervisor = new GeneralProcessRunSupervisor(sessionManager);
    expect(initializeAgentManager).toHaveBeenCalledTimes(1);
    expect(initializeTeamManager).toHaveBeenCalledTimes(1);
    expect(getDefaultTeamManager).not.toHaveBeenCalled();

    await supervisor.close();
    await supervisor.close();

    const restartedSupervisor = new GeneralProcessRunSupervisor(sessionManager);
    expect(initializeAgentManager).toHaveBeenCalledTimes(2);
    expect(initializeTeamManager).toHaveBeenCalledTimes(2);
    await restartedSupervisor.close();
  });

  it("releases the agent manager when exclusive team-manager initialization fails", async () => {
    const conflictingTeamManager = AgentTeamRunManager.initializeProcessInstance({});
    try {
      expect(() => new GeneralProcessRunSupervisor(sessionManager)).toThrow(
        "The process AgentTeamRunManager is already initialized.",
      );
    } finally {
      AgentTeamRunManager.releaseProcessInstance(conflictingTeamManager);
    }

    const recoveredSupervisor = new GeneralProcessRunSupervisor(sessionManager);
    await expect(recoveredSupervisor.close()).resolves.toBeUndefined();
  });
});
