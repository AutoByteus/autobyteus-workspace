import { afterEach, describe, expect, it, vi } from "vitest";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import type { TeamRunBackend } from "../../../src/agent-team-execution/backends/team-run-backend.js";
import type { TeamRunBackendFactory } from "../../../src/agent-team-execution/backends/team-run-backend-factory.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamCreationError, AgentTeamTerminationError } from "../../../src/agent-team-execution/errors.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createConfig = (input: {
  teamBackendKind: TeamBackendKind;
  memberRuntimeKinds: RuntimeKind[];
}): TeamRunConfig =>
  new TeamRunConfig({
    teamDefinitionId: `team-def-${input.teamBackendKind}`,
    teamBackendKind: input.teamBackendKind,
    coordinatorMemberName: "Coordinator",
    memberConfigs: input.memberRuntimeKinds.map((runtimeKind, index) => ({
      memberName: index === 0 ? "Coordinator" : `Member${index}`,
      memberRouteKey: index === 0 ? "coordinator" : `member-${index}`,
      agentDefinitionId: `agent-${input.teamBackendKind}-${index}`,
      llmModelIdentifier: `model-${runtimeKind}`,
      autoExecuteTools: true,
      skillAccessMode: SkillAccessMode.NONE,
      runtimeKind,
      workspaceId: `workspace-${runtimeKind}-${index}`,
    })),
  });

const createBackend = (input: {
  runId: string;
  teamBackendKind: TeamBackendKind;
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
    teamBackendKind: input.teamBackendKind,
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
    [TeamBackendKind.AUTOBYTEUS, [RuntimeKind.AUTOBYTEUS]],
    [TeamBackendKind.CODEX_APP_SERVER, [RuntimeKind.CODEX_APP_SERVER]],
    [TeamBackendKind.CLAUDE_AGENT_SDK, [RuntimeKind.CLAUDE_AGENT_SDK]],
    [TeamBackendKind.MIXED, [RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]],
  ] as const)(
    "creates and registers a %s team run through the matching backend factory",
    async (teamBackendKind, memberRuntimeKinds) => {
      const auto = createFactory(
        createBackend({ runId: "team-auto", teamBackendKind: TeamBackendKind.AUTOBYTEUS }).backend,
      );
      const codex = createFactory(
        createBackend({ runId: "team-codex", teamBackendKind: TeamBackendKind.CODEX_APP_SERVER }).backend,
      );
      const claude = createFactory(
        createBackend({ runId: "team-claude", teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK }).backend,
      );
      const mixed = createFactory(
        createBackend({ runId: "team-mixed", teamBackendKind: TeamBackendKind.MIXED }).backend,
      );
      const manager = new AgentTeamRunManager({
        autoByteusTeamRunBackendFactory: auto as never,
        codexTeamRunBackendFactory: codex as never,
        claudeTeamRunBackendFactory: claude as never,
        mixedTeamRunBackendFactory: mixed as never,
      });

      const run = await manager.createTeamRun(
        createConfig({ teamBackendKind, memberRuntimeKinds: [...memberRuntimeKinds] }),
      );

      expect(run.teamBackendKind).toBe(teamBackendKind);
      expect(run.context?.coordinatorMemberName).toBe("Coordinator");
      expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);
      expect(manager.listActiveRuns()).toContain(run.runId);
      expect(auto.createBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.AUTOBYTEUS ? 1 : 0);
      expect(codex.createBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.CODEX_APP_SERVER ? 1 : 0);
      expect(claude.createBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.CLAUDE_AGENT_SDK ? 1 : 0);
      expect(mixed.createBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.MIXED ? 1 : 0);
    },
  );

  it.each([
    [TeamBackendKind.AUTOBYTEUS, [RuntimeKind.AUTOBYTEUS]],
    [TeamBackendKind.CODEX_APP_SERVER, [RuntimeKind.CODEX_APP_SERVER]],
    [TeamBackendKind.CLAUDE_AGENT_SDK, [RuntimeKind.CLAUDE_AGENT_SDK]],
    [TeamBackendKind.MIXED, [RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK]],
  ] as const)(
    "restores a %s team run through the matching backend factory",
    async (teamBackendKind, memberRuntimeKinds) => {
      const context = new TeamRunContext({
        runId: `team-restored-${teamBackendKind}`,
        teamBackendKind,
        coordinatorMemberName: "Coordinator",
        config: createConfig({ teamBackendKind, memberRuntimeKinds: [...memberRuntimeKinds] }),
        runtimeContext: { memberContexts: [] },
      });
      const backend = createBackend({
        runId: context.runId,
        teamBackendKind,
        runtimeContext: context.runtimeContext,
      }).backend;
      const auto = createFactory(backend);
      const codex = createFactory(backend);
      const claude = createFactory(backend);
      const mixed = createFactory(backend);
      const manager = new AgentTeamRunManager({
        autoByteusTeamRunBackendFactory: auto as never,
        codexTeamRunBackendFactory: codex as never,
        claudeTeamRunBackendFactory: claude as never,
        mixedTeamRunBackendFactory: mixed as never,
      });

      const run = await manager.restoreTeamRun(context);

      expect(run.runId).toBe(context.runId);
      expect(run.context).toBe(context);
      expect(auto.restoreBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.AUTOBYTEUS ? 1 : 0);
      expect(codex.restoreBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.CODEX_APP_SERVER ? 1 : 0);
      expect(claude.restoreBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.CLAUDE_AGENT_SDK ? 1 : 0);
      expect(mixed.restoreBackend).toHaveBeenCalledTimes(teamBackendKind === TeamBackendKind.MIXED ? 1 : 0);
    },
  );

  it("routes mixed run inter-agent delivery through the mixed backend", async () => {
    const mixed = createBackend({
      runId: "team-mixed-delivery",
      teamBackendKind: TeamBackendKind.MIXED,
      runtimeContext: { memberContexts: [] },
    });
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-auto", teamBackendKind: TeamBackendKind.AUTOBYTEUS }).backend,
      ) as never,
      codexTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-codex", teamBackendKind: TeamBackendKind.CODEX_APP_SERVER }).backend,
      ) as never,
      claudeTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-claude", teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK }).backend,
      ) as never,
      mixedTeamRunBackendFactory: createFactory(mixed.backend) as never,
    });

    const run = await manager.createTeamRun(
      createConfig({
        teamBackendKind: TeamBackendKind.MIXED,
        memberRuntimeKinds: [RuntimeKind.CODEX_APP_SERVER, RuntimeKind.CLAUDE_AGENT_SDK],
      }),
    );

    await expect(
      run.deliverInterAgentMessage({
        senderRunId: "coord-run",
        senderMemberName: "Coordinator",
        teamRunId: run.runId,
        recipientMemberName: "Member1",
        content: "Please continue.",
        messageType: "agent_message",
      }),
    ).resolves.toEqual({ accepted: true });
    expect(mixed.backend.deliverInterAgentMessage).toHaveBeenCalledWith({
      senderRunId: "coord-run",
      senderMemberName: "Coordinator",
      teamRunId: run.runId,
      recipientMemberName: "Member1",
      content: "Please continue.",
      messageType: "agent_message",
    });
  });

  it("evicts inactive team runs when queried or listed", async () => {
    const created = createBackend({
      runId: "team-inactive",
      teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    });
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-auto", teamBackendKind: TeamBackendKind.AUTOBYTEUS }).backend,
      ) as never,
      codexTeamRunBackendFactory: createFactory(created.backend) as never,
      claudeTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-claude", teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK }).backend,
      ) as never,
      mixedTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-mixed", teamBackendKind: TeamBackendKind.MIXED }).backend,
      ) as never,
    });

    const run = await manager.createTeamRun(
      createConfig({
        teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
        memberRuntimeKinds: [RuntimeKind.CODEX_APP_SERVER],
      }),
    );
    expect(manager.getActiveRun(run.runId)?.runId).toBe(run.runId);

    created.state.active = false;
    expect(manager.getTeamRun(run.runId)).toBeNull();
    expect(manager.listActiveRuns()).toEqual([]);
  });

  it("throws for unsupported backend kinds during create", async () => {
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-auto", teamBackendKind: TeamBackendKind.AUTOBYTEUS }).backend,
      ) as never,
      codexTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-codex", teamBackendKind: TeamBackendKind.CODEX_APP_SERVER }).backend,
      ) as never,
      claudeTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-claude", teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK }).backend,
      ) as never,
      mixedTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-mixed", teamBackendKind: TeamBackendKind.MIXED }).backend,
      ) as never,
    });

    const unsupportedConfig = new TeamRunConfig({
      teamDefinitionId: "team-unsupported",
      teamBackendKind: "unsupported" as TeamBackendKind,
      coordinatorMemberName: "Coordinator",
      memberConfigs: [
        {
          memberName: "Coordinator",
          memberRouteKey: "coordinator",
          agentDefinitionId: "agent-unsupported",
          llmModelIdentifier: "model-unsupported",
          autoExecuteTools: true,
          skillAccessMode: SkillAccessMode.NONE,
          runtimeKind: RuntimeKind.AUTOBYTEUS,
          workspaceId: "workspace-unsupported",
        },
      ],
    });

    await expect(manager.createTeamRun(unsupportedConfig)).rejects.toBeInstanceOf(AgentTeamCreationError);
  });

  it("throws for unsupported backend kinds during restore", async () => {
    const manager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-auto", teamBackendKind: TeamBackendKind.AUTOBYTEUS }).backend,
      ) as never,
      codexTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-codex", teamBackendKind: TeamBackendKind.CODEX_APP_SERVER }).backend,
      ) as never,
      claudeTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-claude", teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK }).backend,
      ) as never,
      mixedTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-mixed", teamBackendKind: TeamBackendKind.MIXED }).backend,
      ) as never,
    });

    const unsupportedContext = new TeamRunContext({
      runId: "team-restored-unsupported",
      teamBackendKind: "unsupported" as TeamBackendKind,
      coordinatorMemberName: "Coordinator",
      config: createConfig({
        teamBackendKind: TeamBackendKind.AUTOBYTEUS,
        memberRuntimeKinds: [RuntimeKind.AUTOBYTEUS],
      }),
      runtimeContext: null,
    });

    await expect(manager.restoreTeamRun(unsupportedContext)).rejects.toBeInstanceOf(AgentTeamCreationError);
  });

  it("wraps backend termination failures", async () => {
    const failing = createBackend({
      runId: "team-failing-terminate",
      teamBackendKind: TeamBackendKind.AUTOBYTEUS,
    });
    failing.backend.terminate = vi.fn().mockRejectedValue(new Error("boom"));
    const failingManager = new AgentTeamRunManager({
      autoByteusTeamRunBackendFactory: createFactory(failing.backend) as never,
      codexTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-codex-2", teamBackendKind: TeamBackendKind.CODEX_APP_SERVER }).backend,
      ) as never,
      claudeTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-claude-2", teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK }).backend,
      ) as never,
      mixedTeamRunBackendFactory: createFactory(
        createBackend({ runId: "unused-mixed-2", teamBackendKind: TeamBackendKind.MIXED }).backend,
      ) as never,
    });

    const run = await failingManager.createTeamRun(
      createConfig({
        teamBackendKind: TeamBackendKind.AUTOBYTEUS,
        memberRuntimeKinds: [RuntimeKind.AUTOBYTEUS],
      }),
    );

    await expect(failingManager.terminateTeamRun(run.runId)).rejects.toBeInstanceOf(AgentTeamTerminationError);
  });
});
