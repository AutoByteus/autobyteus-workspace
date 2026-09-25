import { afterEach, describe, expect, it, vi } from "vitest";
import type { AgentProviderFactoryBuilder } from "../../../src/agent-execution/providers/agent-provider-factory-builder.js";
import { AgentRunManager } from "../../../src/agent-execution/services/agent-run-manager.js";
import { GeneralProcessRunSupervisor } from "../../../src/agent-execution/runtime/general-process-run-supervisor.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentOrgRunManager } from "../../../src/agent-org-execution/services/agent-org-run-manager.js";
import { createTaskExecutionIdentityCapabilities } from "../../../src/agent-team-execution/task-delegation/task-execution-identity-capabilities.js";
import type { ScopedAgentToolMcpSessionAuthority } from "../../../src/agent-tools/mcp/agent-tool-mcp-session-authority.js";
import { AgentDefinitionService } from "../../../src/agent-definition/services/agent-definition-service.js";
import { AgentTeamDefinitionService } from "../../../src/agent-team-definition/services/agent-team-definition-service.js";
import { AgentOrgDefinitionService } from "../../../src/agent-org-definition/services/agent-org-definition-service.js";
import {
  AgentRunService,
  bindProcessAgentRunService,
  getAgentRunService,
  releaseProcessAgentRunService,
} from "../../../src/agent-execution/services/agent-run-service.js";
import { getTeamRunService } from "../../../src/agent-team-execution/services/team-run-service.js";
import { WorkspaceManager } from "../../../src/workspaces/workspace-manager.js";
import { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { MemberExecutionContextBuilder } from "../../../src/agent-team-execution/services/member-team-context-builder.js";

const createAuthority = (): ScopedAgentToolMcpSessionAuthority => ({
  scopeIdentity: "general-process",
  runSessions: Object.freeze({ activateForRun: vi.fn(), deactivateForRun: vi.fn(() => 0) }),
  assertReady: vi.fn(),
  blockNewSessions: vi.fn(),
  close: vi.fn(),
});

const createProviderBuilder = (): AgentProviderFactoryBuilder => ({
  createForExecution: vi.fn(() => ({ autoByteus: {} as never, codex: {} as never, claude: {} as never, antigravity: {} as never })),
});

const createSupervisorInput = () => {
  const agentDefinitionService = new AgentDefinitionService();
  const agentTeamDefinitionService = new AgentTeamDefinitionService({ agentDefinitionService });
  const agentOrgDefinitionService = new AgentOrgDefinitionService(undefined, agentDefinitionService, agentTeamDefinitionService);
  return {
    memoryDir: "/tmp/general-process-run-supervisor",
    contextFilePathEnvironment: {
      appDataDir: "/tmp/general-process-run-supervisor/app-data",
      baseUrl: "http://localhost:8000",
    },
    agentDefinitionService,
    agentTeamDefinitionService,
    agentOrgDefinitionService,
    definitionAdmissionService: {
      scan: vi.fn(async () => []),
      requireAvailable: vi.fn(),
    } as never,
    workspaceManager: WorkspaceManager.getInstance(),
    agentProviderFactoryBuilder: createProviderBuilder(),
    agentToolMcpSessionAuthority: createAuthority(),
    modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn(), listOptions: vi.fn() },
  };
};

describe("GeneralProcessRunSupervisor ownership", () => {
  afterEach(() => vi.restoreAllMocks());

  it("owns one Agent, standalone Team, and AgentOrg process manager family", async () => {
    expect(() => AgentTeamRunManager.getInstance()).toThrow();
    expect(() => AgentOrgRunManager.getInstance()).toThrow();
    const initializeAgent = vi.spyOn(AgentRunManager, "initializeProcessInstance");
    const initializeTeam = vi.spyOn(AgentTeamRunManager, "initializeProcessInstance");
    const initializeOrg = vi.spyOn(AgentOrgRunManager, "initializeProcessInstance");
    const input = createSupervisorInput();
    const supervisor = new GeneralProcessRunSupervisor(input);
    expect(initializeAgent).toHaveBeenCalledOnce();
    expect(initializeTeam).toHaveBeenCalledOnce();
    expect(initializeOrg).toHaveBeenCalledOnce();
    expect(getAgentRunService()).toBe(supervisor.agentRunService);
    expect(getTeamRunService()).toBe(supervisor.teamRunService);

    const owned = supervisor as unknown as {
      agentRunManager: AgentRunManager;
      agentTeamRunManager: AgentTeamRunManager;
      agentOrgRunManager: AgentOrgRunManager;
    };
    expect(AgentTeamRunManager.getInstance()).toBe(owned.agentTeamRunManager);
    expect(AgentOrgRunManager.getInstance()).toBe(owned.agentOrgRunManager);

    const order: string[] = [];
    vi.spyOn(owned.agentOrgRunManager, "closeRootAdmission").mockImplementation(() => { order.push("close-org-admission"); });
    vi.spyOn(owned.agentTeamRunManager, "closeRootAdmission").mockImplementation(() => { order.push("close-team-admission"); });
    vi.spyOn(owned.agentRunManager, "closeActivationAdmission").mockImplementation(() => { order.push("close-agent-admission"); });
    vi.spyOn(owned.agentOrgRunManager, "stopAllAgentOrgRuns").mockImplementation(async () => { order.push("orgs"); });
    vi.spyOn(owned.agentTeamRunManager, "stopAllTeamRuns").mockImplementation(async () => { order.push("teams"); });
    vi.spyOn(owned.agentRunManager, "stopAllAgentRuns").mockImplementation(async () => { order.push("agents"); });
    vi.mocked(input.agentToolMcpSessionAuthority.close).mockImplementation(() => { order.push("authority"); });
    await supervisor.close();
    await supervisor.close();
    expect(order).toEqual([
      "close-org-admission", "close-team-admission", "close-agent-admission",
      "orgs", "teams", "agents", "authority",
    ]);
    expect(() => AgentOrgRunManager.getInstance()).toThrow();
  });

  it("continues the exact Org, Team, Agent shutdown order and aggregates failures", async () => {
    const supervisor = new GeneralProcessRunSupervisor(createSupervisorInput());
    const owned = supervisor as unknown as {
      agentRunManager: AgentRunManager;
      agentTeamRunManager: AgentTeamRunManager;
      agentOrgRunManager: AgentOrgRunManager;
    };
    const order: string[] = [];
    vi.spyOn(owned.agentOrgRunManager, "stopAllAgentOrgRuns").mockImplementation(async () => { order.push("orgs"); throw new Error("org stop"); });
    vi.spyOn(owned.agentTeamRunManager, "stopAllTeamRuns").mockImplementation(async () => { order.push("teams"); throw new Error("team stop"); });
    vi.spyOn(owned.agentRunManager, "stopAllAgentRuns").mockImplementation(async () => { order.push("agents"); });
    await expect(supervisor.close()).rejects.toMatchObject({
      name: "AggregateError",
      errors: [expect.objectContaining({ message: "org stop" }), expect.objectContaining({ message: "team stop" })],
    });
    expect(order).toEqual(["orgs", "teams", "agents"]);
    expect(() => AgentTeamRunManager.getInstance()).toThrow();
    expect(() => AgentOrgRunManager.getInstance()).toThrow();
  });

  it("releases AgentRunManager when exclusive Team manager initialization fails", async () => {
    const input = createSupervisorInput();
    const conflictingTeamManager = AgentTeamRunManager.initializeProcessInstance({
      memoryDir: "/tmp/general-process-run-supervisor-conflict",
      flatTeamExecutionFactory: new FlatTeamExecutionFactory(),
      memberExecutionContextBuilder: new MemberExecutionContextBuilder(input.agentTeamDefinitionService),
      taskExecutionIdentity: createTaskExecutionIdentityCapabilities({ allocateForAgentDefinition: async () => "task-agent-run" }),
      modelSelectionValidator: { validate: vi.fn(), validateMany: vi.fn(), listOptions: vi.fn() },
    });
    try {
      expect(() => new GeneralProcessRunSupervisor(input)).toThrow("already initialized");
    } finally {
      AgentTeamRunManager.releaseProcessInstance(conflictingTeamManager);
    }
    const recovered = new GeneralProcessRunSupervisor(createSupervisorInput());
    await recovered.close();
  });

  it("unwinds both root managers when process AgentRunService binding fails", async () => {
    const conflictingService = {} as AgentRunService;
    bindProcessAgentRunService(conflictingService);
    try {
      expect(() => new GeneralProcessRunSupervisor(createSupervisorInput())).toThrow("already initialized");
      expect(() => AgentTeamRunManager.getInstance()).toThrow();
      expect(() => AgentOrgRunManager.getInstance()).toThrow();
    } finally {
      releaseProcessAgentRunService(conflictingService);
    }
  });

  it("rejects validator-only capabilities before manager mutation", () => {
    const input = createSupervisorInput();
    delete (input.modelSelectionValidator as Partial<typeof input.modelSelectionValidator>).listOptions;
    expect(() => new GeneralProcessRunSupervisor(input)).toThrow("Complete GeneralProcessRunSupervisor input is required.");
    expect(() => AgentOrgRunManager.getInstance()).toThrow();
  });

  it("rejects each required construction input before manager mutation", () => {
    for (const property of [
      "memoryDir", "contextFilePathEnvironment", "agentDefinitionService", "agentTeamDefinitionService",
      "agentOrgDefinitionService", "definitionAdmissionService", "workspaceManager", "agentProviderFactoryBuilder",
      "agentToolMcpSessionAuthority", "modelSelectionValidator",
    ] as const) {
      const invalid = { ...createSupervisorInput() } as Record<string, unknown>;
      delete invalid[property];
      expect(() => new GeneralProcessRunSupervisor(invalid as never)).toThrow("Complete GeneralProcessRunSupervisor input is required.");
    }
  });
});
