import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import { TeamRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import {
  TeamRunEventSourceType,
  type TeamRunEvent,
} from "../../../src/agent-team-execution/domain/team-run-event.js";

const createBackend = () => ({
  runId: "team-run-1",
  teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
  getRuntimeContext: () => null,
  isActive: () => true,
  getStatusSnapshot: () => ({ status: "idle" }),
  getMemberStatusSnapshots: () => [],
  subscribeToEvents: vi.fn().mockImplementation(() => () => undefined),
  postMessage: vi.fn().mockResolvedValue({ accepted: true }),
  deliverInterAgentMessage: vi.fn().mockResolvedValue({ accepted: true }),
  approveToolInvocation: vi.fn().mockResolvedValue({ accepted: true }),
  interruptMember: vi.fn().mockResolvedValue({ accepted: true }),
  terminate: vi.fn().mockResolvedValue({ accepted: true }),
});

describe("TeamRun", () => {
  it("defaults omitted team messages to the coordinator member from active context", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
        coordinatorMemberName: "Coordinator",
        config: new TeamRunConfig({
          teamDefinitionId: "team-def-1",
          teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
          coordinatorMemberName: "Coordinator",
          memberConfigs: [],
        }),
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await run.postMessage(new AgentInputUserMessage("continue"));

    expect(backend.postMessage).toHaveBeenCalledWith(
      expect.any(AgentInputUserMessage),
      { kind: "route_key", memberRouteKey: "Coordinator" },
    );
  });

  it("falls back to config coordinator member when context coordinator is absent", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
        coordinatorMemberName: null,
        config: new TeamRunConfig({
          teamDefinitionId: "team-def-1",
          teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
          coordinatorMemberName: "Coordinator",
          memberConfigs: [],
        }),
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await run.postMessage(new AgentInputUserMessage("continue"));

    expect(backend.postMessage).toHaveBeenCalledWith(
      expect.any(AgentInputUserMessage),
      { kind: "route_key", memberRouteKey: "Coordinator" },
    );
  });

  it("defaults omitted team messages to a configured coordinator route key", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: null,
        coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
        config: new TeamRunConfig({
          teamDefinitionId: "team-def-1",
          teamBackendKind: TeamBackendKind.MIXED,
          coordinatorMemberRouteKey: "ReviewTeam/Reviewer",
          memberConfigs: [],
        }),
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await run.postMessage(new AgentInputUserMessage("continue"));

    expect(backend.postMessage).toHaveBeenCalledWith(
      expect.any(AgentInputUserMessage),
      { kind: "route_key", memberRouteKey: "ReviewTeam/Reviewer" },
    );
  });

  it("delegates member interrupt by route key and optional run guard", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
        coordinatorMemberName: null,
        config: null,
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await expect(run.interruptMember(" code_reviewer ", "member-run-2")).resolves.toEqual({
      accepted: true,
    });

    expect(backend.interruptMember).toHaveBeenCalledWith("code_reviewer", "member-run-2");
  });

  it("rejects member interrupt without a route key", async () => {
    const backend = createBackend();
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
        coordinatorMemberName: null,
        config: null,
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    await expect(run.interruptMember("   ")).resolves.toMatchObject({
      accepted: false,
      code: "TARGET_MEMBER_REQUIRED",
    });
    expect(backend.interruptMember).not.toHaveBeenCalled();
  });

  it("does not reintroduce delayed aggregate initializing after a backend command completes", async () => {
    let listener: ((event: TeamRunEvent) => void) | null = null;
    const observedEvents: TeamRunEvent[] = [];
    const backend = {
      ...createBackend(),
      getStatusSnapshot: () => ({ status: "idle" as const }),
      subscribeToEvents: vi.fn().mockImplementation((next: (event: TeamRunEvent) => void) => {
        listener = next;
        return () => { listener = null; };
      }),
    };
    const run = new TeamRun({
      context: new TeamRunContext({
        runId: "team-run-1",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberName: null,
        config: null,
        runtimeContext: { memberContexts: [] },
      }),
      backend: backend as never,
    });

    run.subscribeToEvents((event) => observedEvents.push(event));
    await run.postMessage(new AgentInputUserMessage("continue"));

    expect(observedEvents).toEqual([]);
    expect(run.getStatusSnapshot()).toEqual({ status: "idle" });

    listener?.({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-run-1",
      sourcePath: [],
      data: { status: "running" },
    });

    expect(run.getStatusSnapshot()).toEqual({ status: "running", source_path: [] });
  });
});
