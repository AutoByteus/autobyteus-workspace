import { describe, expect, it, vi } from "vitest";
import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { SkillAccessMode } from "autobyteus-ts/agent/context/skill-access-mode.js";
import { AgentRunConfig } from "../../../src/agent-execution/domain/agent-run-config.js";
import { AgentRunContext } from "../../../src/agent-execution/domain/agent-run-context.js";
import { AgentRunEventType, type AgentRunEvent } from "../../../src/agent-execution/domain/agent-run-event.js";
import { ClaudeTeamManager } from "../../../src/agent-team-execution/backends/claude/claude-team-manager.js";
import { ClaudeTeamMemberContext, ClaudeTeamRunContext } from "../../../src/agent-team-execution/backends/claude/claude-team-run-context.js";
import { CodexTeamManager } from "../../../src/agent-team-execution/backends/codex/codex-team-manager.js";
import { CodexTeamMemberContext, CodexTeamRunContext } from "../../../src/agent-team-execution/backends/codex/codex-team-run-context.js";
import { MixedAgentMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-agent-member-handle.js";
import { MixedSubTeamMemberHandle } from "../../../src/agent-team-execution/backends/mixed/members/mixed-sub-team-member-handle.js";
import { MixedAgentMemberContext, MixedSubTeamMemberContext, MixedTeamRunContext } from "../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunConfig, type TeamMemberRunConfig, type TeamSubTeamMemberRunConfig } from "../../../src/agent-team-execution/domain/team-run-config.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType, type TeamRunEvent } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { TeamCommandStatusOverlayStore } from "../../../src/agent-team-execution/services/team-command-status-overlay-store.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

const createDeferred = <T>() => {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((res) => { resolve = res; });
  return { promise, resolve };
};

const createAgentConfig = (runtimeKind: RuntimeKind) => new AgentRunConfig({
  runtimeKind,
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  workspaceId: null,
  llmConfig: null,
  skillAccessMode: SkillAccessMode.NONE,
});

describe("TeamCommandStatusOverlayStore", () => {
  const memberContext = {
    memberName: "Worker",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    memberRunId: "member-run-1",
  };

  const createStore = () => {
    const events: TeamRunEvent[] = [];
    const notifyStatusChange = vi.fn();
    const store = new TeamCommandStatusOverlayStore({
      getTeamRunId: () => "team-run-1",
      publishEvent: (event) => events.push(event),
      publishTeamStatusIfChanged: notifyStatusChange,
    });
    return { store, events, notifyStatusChange };
  };

  it("gates member initializing to offline or idle and stores applied snapshots", () => {
    const { store, events, notifyStatusChange } = createStore();

    expect(store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "initializing",
      currentStatus: () => "running",
    })).toBe(false);
    expect(events).toHaveLength(0);

    expect(store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "initializing",
      currentStatus: () => "offline",
    })).toBe(true);
    expect(events[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      sourcePath: ["Worker"],
      data: { agentEvent: { eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "initializing" } } },
    });
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "offline", can_interrupt: false }),
    })).toMatchObject({ status: "initializing", agent_id: "member-run-1" });
    expect(store.applyMemberStatusOverlays([
      { status: "offline", can_interrupt: false, agent_id: "member-run-1", member_route_key: "Worker" },
    ])).toEqual([
      expect.objectContaining({ status: "initializing", agent_id: "member-run-1" }),
    ]);
    expect(notifyStatusChange).toHaveBeenCalledTimes(1);
  });

  it("replaces member failure and clears only matching replacement member status events", () => {
    const { store } = createStore();
    store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "initializing",
      currentStatus: () => "idle",
    });
    store.publishMemberCommandStatus({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      memberContext,
      status: "error",
      errorMessage: "failed",
      currentStatus: () => "initializing",
    });
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "offline", can_interrupt: false }),
    })).toMatchObject({ status: "error", agent_id: "member-run-1" });

    store.recordReplacementEvents([{
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Other"],
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "Other",
        memberRunId: "other-run",
        memberPath: ["Other"],
        memberRouteKey: "Other",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "other-run",
          payload: { status: "running", can_interrupt: false },
          statusHint: "ACTIVE",
        },
      },
    }]);
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "offline", can_interrupt: false }),
    })).toMatchObject({ status: "error" });

    store.recordReplacementEvents([{
      eventSourceType: TeamRunEventSourceType.AGENT,
      teamRunId: "team-run-1",
      sourcePath: ["Worker"],
      data: {
        runtimeKind: RuntimeKind.CODEX_APP_SERVER,
        memberName: "Worker",
        memberRunId: "member-run-1",
        memberPath: ["Worker"],
        memberRouteKey: "Worker",
        agentEvent: {
          eventType: AgentRunEventType.AGENT_STATUS,
          runId: "member-run-1",
          payload: { status: "running", can_interrupt: false },
          statusHint: "ACTIVE",
        },
      },
    }]);
    expect(store.getMemberStatusSnapshot({
      memberContext,
      fallback: () => ({ status: "offline", can_interrupt: false }),
    })).toEqual({ status: "offline", can_interrupt: false });
  });

  it("keeps root and sub-team source-path overlays isolated and clears all on dispose", () => {
    const { store, events } = createStore();
    expect(store.publishTeamCommandStatus({
      sourcePath: [],
      status: "initializing",
      currentStatus: () => "idle",
    })).toBe(true);
    expect(store.publishTeamCommandStatus({
      sourcePath: ["ReviewTeam"],
      status: "initializing",
      currentStatus: () => "offline",
    })).toBe(true);
    expect(events).toEqual([
      expect.objectContaining({ eventSourceType: TeamRunEventSourceType.TEAM, sourcePath: [], data: { status: "initializing" } }),
      expect.objectContaining({ eventSourceType: TeamRunEventSourceType.TEAM, sourcePath: ["ReviewTeam"], data: { status: "initializing" } }),
    ]);

    store.recordReplacementEvents([{
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "team-run-1",
      sourcePath: [],
      data: { status: "running" },
    }]);
    expect(store.getTeamStatus({ sourcePath: [], fallbackStatus: () => "idle" })).toBe("idle");
    expect(store.getRepresentedTeamStatusSnapshot({
      sourcePath: ["ReviewTeam"],
      representedMember: {
        memberName: "ReviewTeam",
        memberPath: ["ReviewTeam"],
        memberRouteKey: "ReviewTeam",
        memberRunId: "review-team-run",
      },
      fallback: () => ({ status: "offline", can_interrupt: false }),
    })).toMatchObject({ status: "initializing", agent_id: "review-team-run" });

    store.clear();
    expect(store.getTeamStatus({ sourcePath: ["ReviewTeam"], fallbackStatus: () => "idle" })).toBe("idle");
  });
});

const createAgentMemberRunConfig = (runtimeKind: RuntimeKind): TeamMemberRunConfig => ({
  memberKind: "agent",
  memberName: "Worker",
  memberPath: ["Worker"],
  memberRouteKey: "Worker",
  memberRunId: "member-run-1",
  role: null,
  description: null,
  agentDefinitionId: "agent-worker",
  llmModelIdentifier: "gpt-test",
  autoExecuteTools: false,
  skillAccessMode: SkillAccessMode.NONE,
  workspaceId: null,
  workspaceRootPath: null,
  memoryDir: null,
  llmConfig: null,
  runtimeKind,
  applicationExecutionContext: null,
});

const createFakeAgentRun = (runtimeKind: RuntimeKind, sendDeferred = createDeferred<{ accepted: true }>()) => {
  let memberListener: ((event: AgentRunEvent) => void) | null = null;
  let memberStatus = "offline";
  const memberRun = {
    context: new AgentRunContext({ runId: "member-run-1", config: createAgentConfig(runtimeKind), runtimeContext: null }),
    runId: "member-run-1",
    isActive: () => true,
    getPlatformAgentRunId: () => runtimeKind === RuntimeKind.CLAUDE_AGENT_SDK ? "session-1" : "thread-1",
    getStatusSnapshot: () => ({ status: memberStatus, can_interrupt: false }),
    postUserMessage: vi.fn(() => sendDeferred.promise),
    approveToolInvocation: vi.fn(),
    interrupt: vi.fn(),
    terminate: vi.fn(),
    subscribeToEvents: vi.fn((listener: (event: AgentRunEvent) => void) => {
      memberListener = listener;
      return () => { memberListener = null; };
    }),
  };
  return {
    memberRun,
    sendDeferred,
    emitStatus: (status: string) => {
      memberStatus = status;
      memberListener?.({
        eventType: AgentRunEventType.AGENT_STATUS,
        runId: "member-run-1",
        payload: { status, can_interrupt: false },
        statusHint: status === "running" ? "ACTIVE" : null,
      } as AgentRunEvent);
    },
    hasListener: () => memberListener !== null,
  };
};

const createCodexManager = (createAgentRun: ReturnType<typeof vi.fn>) => {
  const memberContext = new CodexTeamMemberContext({
    memberName: "Worker",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    memberRunId: "member-run-1",
    threadId: null,
    agentRunConfig: createAgentConfig(RuntimeKind.CODEX_APP_SERVER),
  });
  const teamConfig = new TeamRunConfig({
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    coordinatorMemberRouteKey: "Worker",
    memberConfigs: [createAgentMemberRunConfig(RuntimeKind.CODEX_APP_SERVER)],
  });
  const context = new TeamRunContext({
    runId: "team-run-1",
    teamBackendKind: TeamBackendKind.CODEX_APP_SERVER,
    coordinatorMemberRouteKey: "Worker",
    config: teamConfig,
    runtimeContext: new CodexTeamRunContext({ coordinatorMemberRouteKey: "Worker", memberContexts: [memberContext] }),
  });
  return new CodexTeamManager(context, {
    agentRunManager: { createAgentRun, restoreAgentRun: vi.fn() } as never,
    memberTeamContextBuilder: { build: vi.fn().mockResolvedValue(null) } as never,
  });
};

const createClaudeManager = (createAgentRun: ReturnType<typeof vi.fn>) => {
  const memberContext = new ClaudeTeamMemberContext({
    memberName: "Worker",
    memberPath: ["Worker"],
    memberRouteKey: "Worker",
    memberRunId: "member-run-1",
    sessionId: null,
    agentRunConfig: createAgentConfig(RuntimeKind.CLAUDE_AGENT_SDK),
  });
  const teamConfig = new TeamRunConfig({
    teamDefinitionId: "team-def-1",
    teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
    coordinatorMemberRouteKey: "Worker",
    memberConfigs: [createAgentMemberRunConfig(RuntimeKind.CLAUDE_AGENT_SDK)],
  });
  const context = new TeamRunContext({
    runId: "team-run-1",
    teamBackendKind: TeamBackendKind.CLAUDE_AGENT_SDK,
    coordinatorMemberRouteKey: "Worker",
    config: teamConfig,
    runtimeContext: new ClaudeTeamRunContext({ coordinatorMemberRouteKey: "Worker", memberContexts: [memberContext] }),
  });
  return new ClaudeTeamManager(context, {
    agentRunManager: { createAgentRun, restoreAgentRun: vi.fn() } as never,
    memberTeamContextBuilder: { build: vi.fn().mockResolvedValue(null) } as never,
  });
};

const assertManagedMemberCommandStart = async (
  manager: CodexTeamManager | ClaudeTeamManager,
  createDeferredRun: ReturnType<typeof createDeferred<any>>,
  runtimeKind: RuntimeKind,
) => {
  const { memberRun, sendDeferred, emitStatus, hasListener } = createFakeAgentRun(runtimeKind);
  const publishedEvents: TeamRunEvent[] = [];
  manager.subscribeToEvents((event) => publishedEvents.push(event));

  const postPromise = manager.postMessage(new AgentInputUserMessage("start"), { kind: "route_key", memberRouteKey: "Worker" });

  expect(publishedEvents[0]).toMatchObject({
    eventSourceType: TeamRunEventSourceType.AGENT,
    sourcePath: ["Worker"],
    data: { agentEvent: { eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "initializing" } } },
  });
  expect(manager.getMemberStatusSnapshots()).toEqual([
    expect.objectContaining({ agent_id: "member-run-1", status: "initializing", member_route_key: "Worker" }),
  ]);
  expect(manager.getStatusSnapshot()).toEqual({ status: "initializing" });

  createDeferredRun.resolve(memberRun);
  await vi.waitFor(() => expect(memberRun.postUserMessage).toHaveBeenCalledTimes(1));
  expect(hasListener()).toBe(true);
  emitStatus("running");
  expect(manager.getStatusSnapshot()).toEqual({ status: "running" });
  sendDeferred.resolve({ accepted: true });
  await expect(postPromise).resolves.toMatchObject({ accepted: true, memberRunId: "member-run-1" });
};

describe("team command-start status overlays", () => {
  it("publishes Codex managed member initializing before delayed member run creation resolves", async () => {
    const createDeferredRun = createDeferred<any>();
    const manager = createCodexManager(vi.fn(() => createDeferredRun.promise));
    const { memberRun, sendDeferred, emitStatus, hasListener } = createFakeAgentRun(RuntimeKind.CODEX_APP_SERVER);
    const publishedEvents: TeamRunEvent[] = [];
    manager.subscribeToEvents((event) => publishedEvents.push(event));

    const postPromise = manager.postMessage(new AgentInputUserMessage("start"), { kind: "route_key", memberRouteKey: "Worker" });

    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      sourcePath: ["Worker"],
      data: { agentEvent: { eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "initializing" } } },
    });
    expect(manager.getMemberStatusSnapshots()).toEqual([
      expect.objectContaining({ agent_id: "member-run-1", status: "initializing", member_route_key: "Worker" }),
    ]);
    expect(manager.getStatusSnapshot()).toEqual({ status: "initializing" });

    createDeferredRun.resolve(memberRun);
    await vi.waitFor(() => expect(memberRun.postUserMessage).toHaveBeenCalledTimes(1));
    expect(hasListener()).toBe(true);
    emitStatus("running");
    expect(manager.getStatusSnapshot()).toEqual({ status: "running" });
    sendDeferred.resolve({ accepted: true });
    await expect(postPromise).resolves.toMatchObject({ accepted: true, memberRunId: "member-run-1" });
  });

  it("publishes Claude managed member initializing before delayed member run creation resolves", async () => {
    const createDeferredRun = createDeferred<any>();
    const manager = createClaudeManager(vi.fn(() => createDeferredRun.promise));
    await assertManagedMemberCommandStart(manager, createDeferredRun, RuntimeKind.CLAUDE_AGENT_SDK);
  });

  it("keeps mixed leaf member initializing while delayed agent run creation is pending", async () => {
    const createDeferredRun = createDeferred<any>();
    const { memberRun, sendDeferred, emitStatus, hasListener } = createFakeAgentRun(RuntimeKind.CODEX_APP_SERVER);
    const memberConfig = createAgentMemberRunConfig(RuntimeKind.CODEX_APP_SERVER);
    const memberContext = new MixedAgentMemberContext({
      memberName: "Worker",
      memberPath: ["Worker"],
      memberRouteKey: "Worker",
      memberRunId: "member-run-1",
      runtimeKind: RuntimeKind.CODEX_APP_SERVER,
      platformAgentRunId: null,
    });
    const teamContext = new TeamRunContext({
      runId: "team-run-1",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "Worker",
      config: new TeamRunConfig({
        teamDefinitionId: "mixed-team-def-1",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberRouteKey: "Worker",
        memberConfigs: [memberConfig],
      }),
      runtimeContext: new MixedTeamRunContext({ coordinatorMemberRouteKey: "Worker", memberContexts: [memberContext] }),
    });
    const publishedEvents: TeamRunEvent[] = [];
    const handle = new MixedAgentMemberHandle({
      teamContext,
      context: memberContext,
      config: memberConfig,
      agentRunManager: { createAgentRun: vi.fn(() => createDeferredRun.promise), restoreAgentRun: vi.fn() } as never,
      memberTeamContextBuilder: { build: vi.fn().mockResolvedValue(null) } as never,
      publish: (event) => publishedEvents.push(event),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });

    const postPromise = handle.postMessage(new AgentInputUserMessage("start"));

    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.AGENT,
      sourcePath: ["Worker"],
      data: { agentEvent: { eventType: AgentRunEventType.AGENT_STATUS, payload: { status: "initializing" } } },
    });
    expect(handle.getStatusSnapshot()).toMatchObject({ agent_id: "member-run-1", status: "initializing" });

    createDeferredRun.resolve(memberRun);
    await vi.waitFor(() => expect(memberRun.postUserMessage).toHaveBeenCalledTimes(1));
    expect(hasListener()).toBe(true);
    emitStatus("running");
    expect(handle.getStatusSnapshot()).toMatchObject({ status: "running" });
    sendDeferred.resolve({ accepted: true });
    await expect(postPromise).resolves.toMatchObject({ accepted: true, memberRunId: "member-run-1" });
  });

  it("keeps mixed subteam initializing while delayed child team creation is pending", async () => {
    const createDeferredRun = createDeferred<any>();
    const childPostDeferred = createDeferred<{ accepted: true }>();
    let childListener: ((event: TeamRunEvent) => void) | null = null;
    let childStatus = "offline";
    const subTeamConfig: TeamSubTeamMemberRunConfig = {
      memberKind: "agent_team",
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "subteam-run-1",
      role: null,
      description: null,
      teamDefinitionId: "child-team-def-1",
      coordinatorMemberRouteKey: null,
      childTeamRunId: null,
      memberConfigs: [],
    };
    const subTeamContext = new MixedSubTeamMemberContext({
      memberName: "ReviewTeam",
      memberPath: ["ReviewTeam"],
      memberRouteKey: "ReviewTeam",
      memberRunId: "subteam-run-1",
      teamDefinitionId: "child-team-def-1",
      childTeamRunId: null,
    });
    const parentContext = new TeamRunContext({
      runId: "parent-team-run-1",
      teamBackendKind: TeamBackendKind.MIXED,
      coordinatorMemberRouteKey: "ReviewTeam",
      config: new TeamRunConfig({
        teamDefinitionId: "parent-team-def-1",
        teamBackendKind: TeamBackendKind.MIXED,
        coordinatorMemberRouteKey: "ReviewTeam",
        memberConfigs: [subTeamConfig],
      }),
      runtimeContext: new MixedTeamRunContext({ coordinatorMemberRouteKey: "ReviewTeam", memberContexts: [subTeamContext] }),
    });
    const childRun = {
      runId: "child-team-run-1",
      isActive: () => true,
      getStatusSnapshot: () => ({ status: childStatus }),
      getRuntimeContext: () => new MixedTeamRunContext({ coordinatorMemberRouteKey: null, memberContexts: [] }),
      subscribeToEvents: vi.fn((listener: (event: TeamRunEvent) => void) => {
        childListener = listener;
        return () => { childListener = null; };
      }),
      postMessage: vi.fn(() => childPostDeferred.promise),
      approveToolInvocation: vi.fn(),
      interruptMember: vi.fn(),
      terminate: vi.fn(),
    };
    const publishedEvents: TeamRunEvent[] = [];
    const handle = new MixedSubTeamMemberHandle({
      parentContext,
      context: subTeamContext,
      config: subTeamConfig,
      subTeamRunFactory: { createOrRestore: vi.fn(() => createDeferredRun.promise) } as never,
      publish: (event) => publishedEvents.push(event),
      notifyStatusChange: vi.fn(),
      deliverInterAgentMessage: vi.fn(),
    });

    const postPromise = handle.postMessage(new AgentInputUserMessage("start"));

    expect(publishedEvents[0]).toMatchObject({
      eventSourceType: TeamRunEventSourceType.TEAM,
      sourcePath: ["ReviewTeam"],
      data: { status: "initializing" },
    });
    expect(handle.getStatusSnapshot()).toMatchObject({ agent_id: "subteam-run-1", status: "initializing" });

    createDeferredRun.resolve(childRun);
    await vi.waitFor(() => expect(childRun.postMessage).toHaveBeenCalledTimes(1));
    expect(childListener).not.toBeNull();
    childStatus = "running";
    childListener?.({
      eventSourceType: TeamRunEventSourceType.TEAM,
      teamRunId: "child-team-run-1",
      sourcePath: [],
      data: { status: "running" },
    } satisfies TeamRunEvent);
    expect(handle.getStatusSnapshot()).toMatchObject({ status: "running" });
    childPostDeferred.resolve({ accepted: true });
    await expect(postPromise).resolves.toMatchObject({ accepted: true, memberRunId: "subteam-run-1" });
  });
});
