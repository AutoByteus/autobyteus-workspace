import { AgentInputUserMessage } from "autobyteus-ts/agent/message/agent-input-user-message.js";
import { describe, expect, it, vi } from "vitest";
import { TeamBackendKind } from "../../../../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../../../../src/agent-team-execution/domain/team-run-context.js";
import {
  getSelectorTopLevelName,
  resolveTeamMemberSelector,
  selectorFromMemberPath,
  selectorFromMemberRouteKey,
  type TeamMemberSelector,
} from "../../../../../../src/agent-team-execution/domain/team-run-member-identity.js";
import { MixedConversationTargetRouter } from "../../../../../../src/agent-team-execution/backends/mixed/conversation-target/mixed-conversation-target-router.js";
import {
  MixedAgentMemberContext,
  MixedSubTeamMemberContext,
  MixedTeamRunContext,
  type MixedTeamMemberContext,
} from "../../../../../../src/agent-team-execution/backends/mixed/mixed-team-run-context.js";
import { RuntimeKind } from "../../../../../../src/runtime-management/runtime-kind-enum.js";

const makeAgent = (memberRouteKey: string): MixedAgentMemberContext => new MixedAgentMemberContext({
  memberName: memberRouteKey.split("/").at(-1) ?? memberRouteKey,
  memberPath: memberRouteKey.split("/"),
  memberRouteKey,
  memberRunId: `run:${memberRouteKey}`,
  runtimeKind: RuntimeKind.AUTOBYTEUS,
  platformAgentRunId: null,
});

const makeSubteam = (memberRouteKey: string): MixedSubTeamMemberContext => new MixedSubTeamMemberContext({
  memberName: memberRouteKey.split("/").at(-1) ?? memberRouteKey,
  memberPath: memberRouteKey.split("/"),
  memberRouteKey,
  memberRunId: `run:${memberRouteKey}`,
  teamDefinitionId: `team:${memberRouteKey}`,
  childTeamRunId: null,
});

const makeHandle = () => ({
  postMessage: vi.fn().mockResolvedValue({ accepted: true }),
  postMessageToConversationTarget: vi.fn().mockResolvedValue({ accepted: true }),
});

const makeRouterHarness = () => {
  const members: MixedTeamMemberContext[] = [
    makeAgent("worker"),
    makeSubteam("BuildSquad"),
  ];
  const teamContext = new TeamRunContext({
    runId: "team-1",
    teamBackendKind: TeamBackendKind.MIXED,
    config: null,
    runtimeContext: new MixedTeamRunContext({ coordinatorMemberRouteKey: null, memberContexts: members }),
  });
  const handles = new Map<string, ReturnType<typeof makeHandle>>();
  const getHandle = (context: MixedTeamMemberContext) => {
    const existing = handles.get(context.memberRouteKey);
    if (existing) return existing;
    const handle = makeHandle();
    handles.set(context.memberRouteKey, handle);
    return handle;
  };
  const resolveContext = (selector: TeamMemberSelector) => {
    const resolution = resolveTeamMemberSelector(selector, members);
    if (resolution.ok) return resolution.member;
    const topLevelName = getSelectorTopLevelName(selector);
    if (topLevelName) {
      const topLevelSelector = selector.kind === "path"
        ? selectorFromMemberPath([topLevelName])
        : selectorFromMemberRouteKey(topLevelName);
      const topLevelResolution = resolveTeamMemberSelector(topLevelSelector, members);
      if (topLevelResolution.ok && topLevelResolution.member.memberKind === "agent_team") {
        return topLevelResolution.member;
      }
    }
    return { accepted: false, code: resolution.code, message: resolution.message };
  };
  const taskAgentInstances = { postMessage: vi.fn().mockResolvedValue({ accepted: true }) };
  const taskTeamInstances = { postMessageToConversationTarget: vi.fn().mockResolvedValue({ accepted: true }) };
  const router = new MixedConversationTargetRouter({
    getTeamContext: () => teamContext,
    persistentMembers: {
      resolveContext,
      getOrCreate: (context) => getHandle(context) as any,
    },
    taskAgentInstances: taskAgentInstances as any,
    taskTeamInstances: taskTeamInstances as any,
    notifyStatusChange: vi.fn(),
  });
  return { router, handles, taskAgentInstances, taskTeamInstances };
};

describe("MixedConversationTargetRouter", () => {
  it("delivers terminal structural member chat through the persistent member handle", async () => {
    const { router, handles } = makeRouterHarness();
    const message = new AgentInputUserMessage("hello");

    await router.postMessage(message, { segments: [{ kind: "member", memberRouteKey: "worker" }] });

    expect(handles.get("worker")?.postMessage).toHaveBeenCalledWith(message);
  });

  it("enters structural subteams by stripping the top-level member selector", async () => {
    const { router, handles } = makeRouterHarness();
    const message = new AgentInputUserMessage("hello child");

    await router.postMessage(message, { segments: [{ kind: "member", memberRouteKey: "BuildSquad/review_lead" }] });

    expect(handles.get("BuildSquad")?.postMessageToConversationTarget).toHaveBeenCalledWith(
      message,
      { segments: [{ kind: "member", memberRouteKey: "review_lead" }] },
    );
  });

  it("delivers task-agent chat to the exact task-agent registry entry", async () => {
    const { router, taskAgentInstances, handles } = makeRouterHarness();
    const message = new AgentInputUserMessage("continue task");

    await router.postMessage(message, {
      segments: [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-1" },
      ],
    });

    expect(taskAgentInstances.postMessage).toHaveBeenCalledWith("worker", "task-agent-run-1", message);
    expect(handles.get("worker")?.postMessage).toBeUndefined();
  });

  it("delivers task-team root and child-member chat through the exact task-team run boundary", async () => {
    const { router, taskTeamInstances } = makeRouterHarness();
    const rootMessage = new AgentInputUserMessage("task team root");
    const childMessage = new AgentInputUserMessage("task team child");

    await router.postMessage(rootMessage, {
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-1" },
      ],
    });
    await router.postMessage(childMessage, {
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-1" },
        { kind: "member", memberRouteKey: "review_lead" },
      ],
    });

    expect(taskTeamInstances.postMessageToConversationTarget).toHaveBeenNthCalledWith(
      1,
      "BuildSquad",
      "task-team-run-1",
      { segments: [] },
      rootMessage,
    );
    expect(taskTeamInstances.postMessageToConversationTarget).toHaveBeenNthCalledWith(
      2,
      "BuildSquad",
      "task-team-run-1",
      { segments: [{ kind: "member", memberRouteKey: "review_lead" }] },
      childMessage,
    );
  });

  it("preserves nested runtime segments when entering a task-team child run", async () => {
    const { router, taskTeamInstances } = makeRouterHarness();
    const message = new AgentInputUserMessage("nested runtime");

    await router.postMessage(message, {
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-1" },
        { kind: "member", memberRouteKey: "NestedSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-2" },
        { kind: "member", memberRouteKey: "implementer" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-2" },
      ],
    });

    expect(taskTeamInstances.postMessageToConversationTarget).toHaveBeenCalledWith(
      "BuildSquad",
      "task-team-run-1",
      {
        segments: [
          { kind: "member", memberRouteKey: "NestedSquad" },
          { kind: "task_team", taskTeamRunId: "task-team-run-2" },
          { kind: "member", memberRouteKey: "implementer" },
          { kind: "task_agent", taskAgentRunId: "task-agent-run-2" },
        ],
      },
      message,
    );
  });

  it("keeps concurrent runtime run ids under the same logical member distinct", async () => {
    const { router, taskAgentInstances, taskTeamInstances, handles } = makeRouterHarness();
    const firstAgentMessage = new AgentInputUserMessage("first task agent");
    const secondAgentMessage = new AgentInputUserMessage("second task agent");
    const firstTeamMessage = new AgentInputUserMessage("first task team");
    const secondTeamMessage = new AgentInputUserMessage("second task team");

    await router.postMessage(firstAgentMessage, {
      segments: [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-1" },
      ],
    });
    await router.postMessage(secondAgentMessage, {
      segments: [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: "task-agent-run-2" },
      ],
    });
    await router.postMessage(firstTeamMessage, {
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-1" },
      ],
    });
    await router.postMessage(secondTeamMessage, {
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "task-team-run-2" },
      ],
    });

    expect(taskAgentInstances.postMessage).toHaveBeenNthCalledWith(
      1,
      "worker",
      "task-agent-run-1",
      firstAgentMessage,
    );
    expect(taskAgentInstances.postMessage).toHaveBeenNthCalledWith(
      2,
      "worker",
      "task-agent-run-2",
      secondAgentMessage,
    );
    expect(taskTeamInstances.postMessageToConversationTarget).toHaveBeenNthCalledWith(
      1,
      "BuildSquad",
      "task-team-run-1",
      { segments: [] },
      firstTeamMessage,
    );
    expect(taskTeamInstances.postMessageToConversationTarget).toHaveBeenNthCalledWith(
      2,
      "BuildSquad",
      "task-team-run-2",
      { segments: [] },
      secondTeamMessage,
    );
    expect(handles.get("worker")?.postMessage).toBeUndefined();
    expect(handles.get("BuildSquad")?.postMessage).toBeUndefined();
  });

  it("returns invalid runtime-target failures without falling back to structural members", async () => {
    const { router, taskAgentInstances, taskTeamInstances, handles } = makeRouterHarness();
    taskAgentInstances.postMessage.mockResolvedValueOnce({
      accepted: false,
      code: "TASK_AGENT_RUN_NOT_FOUND",
      message: "Task-agent run 'missing-task-agent' was not found.",
    });
    taskTeamInstances.postMessageToConversationTarget.mockResolvedValueOnce({
      accepted: false,
      code: "TASK_TEAM_RUN_NOT_FOUND",
      message: "Task-team run 'missing-task-team' was not found.",
    });

    const missingAgentResult = await router.postMessage(new AgentInputUserMessage("missing agent"), {
      segments: [
        { kind: "member", memberRouteKey: "worker" },
        { kind: "task_agent", taskAgentRunId: "missing-task-agent" },
      ],
    });
    const missingTeamResult = await router.postMessage(new AgentInputUserMessage("missing team"), {
      segments: [
        { kind: "member", memberRouteKey: "BuildSquad" },
        { kind: "task_team", taskTeamRunId: "missing-task-team" },
      ],
    });

    expect(missingAgentResult).toMatchObject({
      accepted: false,
      code: "TASK_AGENT_RUN_NOT_FOUND",
    });
    expect(missingTeamResult).toMatchObject({
      accepted: false,
      code: "TASK_TEAM_RUN_NOT_FOUND",
    });
    expect(handles.get("worker")?.postMessage).toBeUndefined();
    expect(handles.get("BuildSquad")?.postMessage).toBeUndefined();
  });
});
