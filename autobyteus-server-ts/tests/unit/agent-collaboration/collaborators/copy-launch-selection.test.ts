import { describe, expect, it } from "vitest";
import {
  configuredTeamFollowerAddresses,
  projectCollaboratorAgentNode,
  projectCollaboratorTeamNode,
  projectTaskExecutionSource,
  projectTaskSourceMember,
  resolveCollaboratorCopySource,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import {
  restoreTaskAgentNode,
  restoreTaskTeamNode,
} from "../../../../src/agent-collaboration/execution/task/task-team-node-restoration.js";
import {
  effectiveCopyAgentLaunch,
  memberFollowsTeam,
  type CollaboratorAgentEntry,
  type CollaboratorTeamEntry,
  type TaskTeamExecution,
  type TaskTeamExecutionSource,
  type UserLaunchSelection,
} from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import {
  parseCollaboratorEntry,
  parseTaskExecution,
} from "../../../../src/run-history/store/run-execution-tree-shared-record-schemas.js";
import type { TeamRunAgentNode, TeamRunAgentTeamNode } from "../../../../src/agent-team-execution/domain/team-run-config.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * DS-003 / AR-003 / AR-005 / AC-005: one launch rule for copy and collaborator agents. The user
 * selection replaces only the model and its settings; hosting and restore apply it; extra and
 * teammate copies start on the started values; records without selections read and restore unchanged.
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" };
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" }, autoExecuteTools: false, workspaceRootPath: "/work" };
const selectedAt = "2026-10-13T00:00:00.000Z";
const sonnet: UserLaunchSelection = { llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" }, selectedAt };
const haiku: UserLaunchSelection = { llmModelIdentifier: "haiku", llmConfig: null, selectedAt };

const collaboratorAgent: CollaboratorAgentEntry = {
  kind: "agent", address: "/reviewer" as never, agentDefinitionId: "reviewer", agentRunId: "reviewer-run",
  platformAgentRunId: null, launchConfiguration: codex, addedAt: selectedAt, addedViaAgentRunId: "pm",
  userLaunchSelection: { llmModelIdentifier: "sol-6.1-mini", llmConfig: { effort: "low" }, selectedAt },
};
const collaboratorTeam: CollaboratorTeamEntry = {
  kind: "agent_team", address: "/se" as never, teamDefinitionId: "se", teamRunId: "se-run",
  coordinatorAddress: "/se/lead" as never, handoffs: [], taskExecutions: [],
  defaultLaunchConfiguration: claude,
  userTeamLaunchSelection: sonnet,
  members: [
    { address: "/se/lead" as never, agentDefinitionId: "lead", agentRunId: "lead-run", platformAgentRunId: null },
    { address: "/se/ie" as never, agentDefinitionId: "ie", agentRunId: "ie-run", platformAgentRunId: null, launchConfiguration: codex },
    { address: "/se/qa" as never, agentDefinitionId: "qa", agentRunId: "qa-run", platformAgentRunId: null, userLaunchSelection: haiku },
  ],
  addedAt: selectedAt, addedViaAgentRunId: "pm",
};
const models = (node: TeamRunAgentTeamNode) => node.children.map((child) => child.kind === "agent" ? child.llmModelIdentifier : null);

describe("effectiveCopyAgentLaunch", () => {
  it("is the agent's selection, else the followed team's selection, else the started launch; runtime and approval stay", () => {
    expect(effectiveCopyAgentLaunch({ started: codex })).toEqual({ launch: codex, selected: null });
    expect(effectiveCopyAgentLaunch({ started: claude, followsTeam: false, teamSelection: sonnet })).toEqual({ launch: claude, selected: null });
    expect(effectiveCopyAgentLaunch({ started: claude, followsTeam: true, teamSelection: sonnet }))
      .toEqual({ launch: { ...claude, llmModelIdentifier: "sonnet", llmConfig: { thinking: "low" } }, selected: "team" });
    const own = effectiveCopyAgentLaunch({ started: codex, followsTeam: true, teamSelection: sonnet, agentSelection: haiku });
    expect(own).toEqual({ launch: { ...codex, llmModelIdentifier: "haiku", llmConfig: null }, selected: "agent" });
    expect(own.launch.runtimeKind).toBe(RuntimeKind.CODEX_APP_SERVER);
    expect(own.launch.autoExecuteTools).toBe(false);
  });

  it("does not share the selection's settings object with the launch", () => {
    const { launch } = effectiveCopyAgentLaunch({ started: claude, agentSelection: sonnet });
    expect(launch.llmConfig).toEqual(sonnet.llmConfig);
    expect(launch.llmConfig).not.toBe(sonnet.llmConfig);
  });
});

describe("memberFollowsTeam (AR-003)", () => {
  it("recorded members follow iff they record no own launch", () => {
    expect(memberFollowsTeam({ kind: "recorded", member: {} })).toBe(true);
    expect(memberFollowsTeam({ kind: "recorded", member: { launchConfiguration: claude } })).toBe(false);
  });

  it("configured members follow iff runtime, model and settings equal the team's", () => {
    expect(memberFollowsTeam({ kind: "configured", team: claude, member: { ...claude, autoExecuteTools: false } })).toBe(true);
    expect(memberFollowsTeam({ kind: "configured", team: claude, member: { ...claude, llmConfig: { thinking: "low" } } })).toBe(false);
    expect(memberFollowsTeam({ kind: "configured", team: claude, member: { ...claude, runtimeKind: RuntimeKind.CODEX_APP_SERVER } })).toBe(false);
    expect(memberFollowsTeam({ kind: "configured", team: codex, member: { ...codex, llmConfig: { effort: "high" } } })).toBe(true);
  });

  it("configured Team placements name their followers", () => {
    const node: TeamRunAgentTeamNode = {
      kind: "agent_team", address: "/eng" as never, teamDefinitionId: "eng", teamRunId: "eng-run",
      coordinatorAddress: "/eng/lead" as never, defaultLaunchConfiguration: claude,
      children: [
        { kind: "agent", address: "/eng/lead" as never, agentDefinitionId: "lead", agentRunId: "a", platformAgentRunId: null, role: null, description: null, ...claude },
        { kind: "agent", address: "/eng/ie" as never, agentDefinitionId: "ie", agentRunId: "b", platformAgentRunId: null, role: null, description: null, ...codex },
      ],
    };
    expect(configuredTeamFollowerAddresses(node)).toEqual(["/eng/lead"]);
  });
});

describe("collaborator hosting vs. extra copies (AR-005)", () => {
  it("hosts a collaborator Agent on its selection", () => {
    expect(projectCollaboratorAgentNode(collaboratorAgent)).toMatchObject({
      runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1-mini", llmConfig: { effort: "low" }, autoExecuteTools: false,
    });
  });

  it("hosts a collaborator Team with the team selection on followers and own selections first", () => {
    expect(models(projectCollaboratorTeamNode(collaboratorTeam))).toEqual(["sonnet", "sol-6.1", "haiku"]);
  });

  it("starts extra copies and teammate copies of a collaborator on the started values", () => {
    expect(resolveCollaboratorCopySource([collaboratorAgent], "/reviewer")?.node).toMatchObject({ llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" } });
    const team = resolveCollaboratorCopySource([collaboratorTeam], "/se");
    expect(team?.kind === "agent_team" && models(team.node)).toEqual(["opus", "sol-6.1", "opus"]);
    expect(team?.kind === "agent_team" && team.followerAddresses).toEqual(["/se/lead", "/se/qa"]);
    expect(resolveCollaboratorCopySource([collaboratorTeam], "/se/qa")?.node).toMatchObject({ llmModelIdentifier: "opus" });
  });

  it("starts catalog teammate copies on the snapshot's started values", () => {
    const source: TaskTeamExecutionSource = {
      kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead" as never, handoffs: [],
      defaultLaunchConfiguration: claude,
      members: [{ address: "/se/lead" as never, agentDefinitionId: "lead" }, { address: "/se/ie" as never, agentDefinitionId: "ie", launchConfiguration: codex }],
    };
    expect(projectTaskSourceMember(source, "/se/lead" as never)?.launchConfiguration).toBe(claude);
    const projected = projectTaskExecutionSource("/se" as never, source);
    expect(projected.kind === "agent_team" && projected.followerAddresses).toEqual(["/se/lead"]);
  });
});

describe("restore of a stopped copy (DS-003)", () => {
  const agentSource: TeamRunAgentNode = {
    kind: "agent", address: "/se/ie" as never, agentDefinitionId: "ie", agentRunId: "pending", platformAgentRunId: null, role: null, description: null, ...codex,
  };
  const teamSource: TeamRunAgentTeamNode = {
    kind: "agent_team", address: "/se" as never, teamDefinitionId: "se", teamRunId: "pending", coordinatorAddress: "/se/lead" as never,
    defaultLaunchConfiguration: claude,
    children: [
      { ...agentSource, address: "/se/lead" as never, agentDefinitionId: "lead", ...claude },
      agentSource,
      { ...agentSource, address: "/se/qa" as never, agentDefinitionId: "qa", ...claude },
    ],
  };
  const execution = (extra: Partial<TaskTeamExecution> = {}, qa: object = {}): TaskTeamExecution => ({
    address: "/se" as never, teamRunId: "copy", startedAt: selectedAt, taskExecutions: [], delegatorAgentRunId: "pm",
    members: [
      { address: "/se/lead" as never, agentRunId: "copy-lead", platformAgentRunId: "p-lead" },
      { address: "/se/ie" as never, agentRunId: "copy-ie", platformAgentRunId: null },
      { address: "/se/qa" as never, agentRunId: "copy-qa", platformAgentRunId: null, ...qa },
    ],
    ...extra,
  });

  it("restores an agent copy on its selection", () => {
    expect(restoreTaskAgentNode({ source: agentSource, execution: { userLaunchSelection: haiku } }))
      .toMatchObject({ runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "haiku", llmConfig: null });
    expect(restoreTaskAgentNode({ source: agentSource, execution: {} })).toBe(agentSource);
  });

  it("restores a team copy: followers on the team selection, own selections first, identities from the record", () => {
    const node = restoreTaskTeamNode({
      source: teamSource,
      execution: execution({ userTeamLaunchSelection: sonnet }, { userLaunchSelection: haiku }),
      followerAddresses: ["/se/lead", "/se/qa"] as never,
    });
    expect(models(node)).toEqual(["sonnet", "sol-6.1", "haiku"]);
    expect(node.children[0]).toMatchObject({ agentRunId: "copy-lead", platformAgentRunId: "p-lead", runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK });
  });

  it("AC-005: a record without selections restores exactly on its started values", () => {
    const node = restoreTaskTeamNode({ source: teamSource, execution: execution(), followerAddresses: ["/se/lead", "/se/qa"] as never });
    expect(models(node)).toEqual(["opus", "sol-6.1", "opus"]);
  });
});

describe("tolerant readers", () => {
  const taskAgent = { address: "/ie", agentRunId: "ie-copy", platformAgentRunId: null, delegatorAgentRunId: "pm", startedAt: selectedAt };

  it("read selections exactly when present and add no key when absent (AC-005)", () => {
    expect(Object.keys(parseTaskExecution(taskAgent, "t"))).not.toContain("userLaunchSelection");
    expect(parseTaskExecution({ ...taskAgent, userLaunchSelection: { ...haiku, extra: 1 } }, "t"))
      .toMatchObject({ userLaunchSelection: haiku });
    const team = parseTaskExecution({
      address: "/se", teamRunId: "copy", startedAt: selectedAt, taskExecutions: [],
      userTeamLaunchSelection: sonnet,
      members: [{ address: "/se/lead", agentRunId: "l", platformAgentRunId: null, userLaunchSelection: haiku }, { address: "/se/ie", agentRunId: "i", platformAgentRunId: null }],
    }, "t") as TaskTeamExecution;
    expect(team.userTeamLaunchSelection).toEqual(sonnet);
    expect(team.members[0]).toEqual({ address: "/se/lead", agentRunId: "l", platformAgentRunId: null, userLaunchSelection: haiku });
    expect(Object.keys(team.members[1]!)).toEqual(["address", "agentRunId", "platformAgentRunId"]);
    const entry = parseCollaboratorEntry(JSON.parse(JSON.stringify(collaboratorTeam)), "c") as CollaboratorTeamEntry;
    expect(entry.userTeamLaunchSelection).toEqual(sonnet);
    expect(entry.members[2]!.userLaunchSelection).toEqual(haiku);
    expect(Object.keys(entry.members[0]!)).not.toContain("userLaunchSelection");
    expect((parseCollaboratorEntry(JSON.parse(JSON.stringify(collaboratorAgent)), "c") as CollaboratorAgentEntry).userLaunchSelection)
      .toEqual(collaboratorAgent.userLaunchSelection);
  });

  it("reject a malformed selection", () => {
    expect(() => parseTaskExecution({ ...taskAgent, userLaunchSelection: { llmModelIdentifier: "x", llmConfig: null } }, "t")).toThrow(/selectedAt/);
    expect(() => parseTaskExecution({ ...taskAgent, userLaunchSelection: { llmModelIdentifier: "", llmConfig: null, selectedAt } }, "t")).toThrow(/llmModelIdentifier/);
    expect(() => parseTaskExecution({ ...taskAgent, userLaunchSelection: { llmModelIdentifier: "x", llmConfig: [], selectedAt } }, "t")).toThrow(/llmConfig/);
  });
});
