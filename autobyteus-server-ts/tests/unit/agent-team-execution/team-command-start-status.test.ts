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
