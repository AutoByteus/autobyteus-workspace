import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import type { TeamRunBackendFactory } from "../../../src/agent-team-execution/backends/team-run-backend-factory.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamCreationError, AgentTeamTerminationError } from "../../../src/agent-team-execution/errors.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createConfig = (runtimeKind: RuntimeKind): TeamRunConfig =>
  new TeamRunConfig({
    teamDefinitionId: `team-def-${runtimeKind}`,
    runtimeKind,
    memberConfigs: [
      {
        memberName: "Coordinator",
        memberRouteKey: "coordinator",
        agentDefinitionId: `agent-${runtimeKind}`,
        llmModelIdentifier: `model-${runtimeKind}`,
        autoExecuteTools: true,
        skillAccessMode: SkillAccessMode.NONE,
        runtimeKind,
        workspaceId: `workspace-${runtimeKind}`,
      },
    ],
  });

const createBackend = (input: {
  runId: string;
  runtimeKind: RuntimeKind;
  active?: boolean;
  status?: string | null;
  runtimeContext?: unknown;
}) => {
  const state = {
    active: input.active ?? true,
    status: input.status ?? "IDLE",
  };

  const backend: TeamRunBackend = {
    runId: input.runId,
    runtimeKind: input.runtimeKind,
    getRuntimeContext: () => (input.runtimeContext ?? null) as never,
    isActive: () => state.active,
    getStatus: () => state.status,
    subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
    postMessage: vi.fn().mockResolvedValue({ accepted: true }),
    deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
    approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
    interrupt: vi.fn().mockResolvedValue({ accepted: true }),
    terminate: vi.fn().mockResolvedValue({ accepted: true }),
  };

  return {
    backend,
    state,
  };
};

const createFactory = (backend: TeamRunBackend): TeamRunBackendFactory => ({
  createBackend: vi.fn().mockResolvedValue(backend),
  restoreBackend: vi.fn().mockResolvedValue(backend),
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AgentTeamRunManager integration", () => {
  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("creates and registers a %s team run through the matching backend factory", async (runtimeKind) => {
    const auto = createFactory(createBackend({ runId: "team-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend);
    const codex = createFactory(createBackend({ runId: "team-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend);
    const claude = createFactory(createBackend({ runId: "team-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend);
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: auto as never,
      codexTeamRunBackendFactory: codex as never,
      claudeTeamRunBackendFactory: claude as never,
    });

    const run = await manager.createTeamRun(createConfig(runtimeKind));

    expect(run.runtimeKind).toBe(runtimeKind);
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);
    expect(manager.listActiveRuns()).toContain(run.runId);
    expect(auto.createBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.AUTOBYTEUS ? 1 : 0);
    expect(codex.createBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CODEX_APP_SERVER ? 1 : 0);
    expect(claude.createBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? 1 : 0);
  });

  it.each([
    RuntimeKind.AUTOBYTEUS,
    RuntimeKind.CODEX_APP_SERVER,
    RuntimeKind.CLAUDE_AGENT_SDK,
  ])("restores a %s team run through the matching backend factory", async (runtimeKind) => {
    const context = new TeamRunContext({
      runId: `team-restored-${runtimeKind}`,
      runtimeKind,
      coordinatorMemberName: "Coordinator",
      config: createConfig(runtimeKind),
      runtimeContext:
        runtimeKind === RuntimeKind.AUTOBYTEUS
          ? { teamId: "native-team-id" }
          : { memberContexts: [] },
    });
    const backend = createBackend({
      runId: context.runId,
      runtimeKind,
      runtimeContext: context.runtimeContext,
    }).backend;
    const auto = createFactory(backend);
    const codex = createFactory(backend);
    const claude = createFactory(backend);
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: auto as never,
      codexTeamRunBackendFactory: codex as never,
      claudeTeamRunBackendFactory: claude as never,
    });

    const run = await manager.restoreTeamRun(context);

    expect(run.runId).toBe(context.runId);
    expect(run.context).toBe(context);
    expect(auto.restoreBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.AUTOBYTEUS ? 1 : 0);
    expect(codex.restoreBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CODEX_APP_SERVER ? 1 : 0);
    expect(claude.restoreBackend).toHaveBeenCalledTimes(runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? 1 : 0);
  });

  it("evicts inactive team runs when queried or listed", async () => {
    const created = createBackend({
      runId: "team-inactive",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
    });
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend) as never,
      codexTeamRunBackendFactory: createFactory(created.backend) as never,
      claudeTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend) as never,
    });

    const run = await manager.createTeamRun(createConfig(RuntimeKind.CODEX_APP_SERVER));
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);

    created.state.active = false;
    expect(manager.getTeamRun(run.runId)).toBeNull();
    expect(manager.listActiveRuns()).toEqual([]);
  });

  it("subscribes to active runs and returns null for missing runs", async () => {
    const created = createBackend({
      runId: "team-subscribe",
      runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK,
    });
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend) as never,
      codexTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend) as never,
      claudeTeamRunBackendFactory: createFactory(created.backend) as never,
    });

    const run = await manager.createTeamRun(createConfig(RuntimeKind.CLAUDE_AGENT_SDK));
    const unsubscribe = manager.subscribeToEvents(run.runId, vi.fn());

    expect(typeof unsubscribe).toBe("function");
    expect(created.backend.subscribeToEvents).toHaveBeenCalledTimes(1);
    expect(manager.subscribeToEvents("missing-run", vi.fn())).toBeNull();
  });

  it("terminates and unregisters active team runs, and wraps failures", async () => {
    const created = createBackend({
      runId: "team-terminate-ok",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(created.backend) as never,
      codexTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend) as never,
      claudeTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend) as never,
    });

    const run = await manager.createTeamRun(createConfig(RuntimeKind.AUTOBYTEUS));
    await expect(manager.terminateTeamRun(run.runId)).resolves.toBe(true);
    expect(manager.getActiveRun(run.runId)).toBeNull();

    const failing = createBackend({
      runId: "team-terminate-error",
      runtimeKind: RuntimeKind.AUTOBYTEUS,
    });
    failing.backend.terminate = vi.fn().mockRejectedValue(new Error("boom"));
    const failingManager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(failing.backend) as never,
      codexTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-codex-2", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend) as never,
      claudeTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-claude-2", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend) as never,
    });
    const failingRun = await failingManager.createTeamRun(createConfig(RuntimeKind.AUTOBYTEUS));
    await expect(failingManager.terminateTeamRun(failingRun.runId)).rejects.toThrow(
      AgentTeamTerminationError,
    );
  });

  it("proxies native-team lookup through the autobyteus backend factory", () => {
    const autoFactory = {
      ...createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend),
      getTeam: vi.fn().mockReturnValue({ teamId: "native-team-1" }),
    };
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: autoFactory as never,
      codexTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend) as never,
      claudeTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend) as never,
    });

    expect(manager.getTeam("native-team-1")?.teamId).toBe("native-team-1");
    expect(autoFactory.getTeam).toHaveBeenCalledWith("native-team-1");
  });

  it("rejects unsupported runtime kinds for create and restore", async () => {
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-auto", runtimeKind: RuntimeKind.AUTOBYTEUS }).backend) as never,
      codexTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-codex", runtimeKind: RuntimeKind.CODEX_APP_SERVER }).backend) as never,
      claudeTeamRunBackendFactory: createFactory(createBackend({ runId: "unused-claude", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK }).backend) as never,
    });
    const unsupportedKind = "unsupported_runtime" as RuntimeKind;
    const config = createConfig(unsupportedKind);
    const context = new TeamRunContext({
      runId: "team-unsupported",
      runtimeKind: unsupportedKind,
      coordinatorMemberName: "Coordinator",
      config,
      runtimeContext: null,
    });

    await expect(manager.createTeamRun(config)).rejects.toThrow(AgentTeamCreationError);
    await expect(manager.restoreTeamRun(context)).rejects.toThrow(AgentTeamCreationError);
  });
});
