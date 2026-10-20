import { describe, expect, it } from "vitest";
import {
  configuredPlacementSource,
  copyExecutionSource,
  projectTaskExecutionSource,
  taskExecutionListsOf,
} from "../../../../src/agent-collaboration/collaborators/collaborator-source-projector.js";
import {
  effectiveMemberLaunchSource,
  type ConfiguredAgentExecutionNode,
  type ConfiguredTeamExecutionNode,
  type TaskExecution,
  type TaskTeamExecutionSource,
} from "../../../../src/run-history/domain/run-execution-tree-shared-records.js";
import { parseTaskExecution } from "../../../../src/run-history/store/run-execution-tree-shared-record-schemas.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

/**
 * D-5 / REQ-012 / AC-011: every Team copy member records its complete launch and whether it follows
 * the Team; restore and every projection read the member's own launch, never the Team's. `launchSource`
 * keeps its presence rule and is provenance only.
 */
const claude = { runtimeKind: RuntimeKind.CLAUDE_AGENT_SDK, llmModelIdentifier: "opus", llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work" };
const codex = { runtimeKind: RuntimeKind.CODEX_APP_SERVER, llmModelIdentifier: "sol-6.1", llmConfig: { effort: "high" }, autoExecuteTools: true, workspaceRootPath: "/work" };
const inherited = { origin: "inherited" as const, fallbacks: [] };
const fromAgent = { origin: "agent_default" as const, fallbacks: [] };
const startedAt = "2026-10-12T00:00:00.000Z";

const copySource: TaskTeamExecutionSource = {
  kind: "agent_team", teamDefinitionId: "se", coordinatorAddress: "/se/lead" as never, handoffs: [],
  defaultLaunchConfiguration: claude, defaultLaunchSource: inherited,
  members: [
    { address: "/se/lead" as never, agentDefinitionId: "lead", launchConfiguration: claude, followsTeam: true },
    { address: "/se/ie" as never, agentDefinitionId: "ie", launchConfiguration: codex, followsTeam: false, launchSource: fromAgent },
  ],
};
const teamCopy = {
  address: "/se", teamRunId: "copy", startedAt, taskExecutions: [], delegatorAgentRunId: "pm",
  members: [
    { address: "/se/lead", agentRunId: "copy-lead", platformAgentRunId: null },
    { address: "/se/ie", agentRunId: "copy-ie", platformAgentRunId: null },
  ],
  source: copySource,
} as unknown as TaskExecution;

describe("member launch of Team copies (server records)", () => {
  it("a member's launch source is its own, else the Team's; null when not recorded", () => {
    expect(effectiveMemberLaunchSource(copySource, copySource.members[1]!)).toBe(fromAgent);
    expect(effectiveMemberLaunchSource(copySource, copySource.members[0]!)).toBe(inherited);
    expect(effectiveMemberLaunchSource({}, {})).toBeNull();
  });

  it("a Team copy restores and reports each member on its own recorded launch", () => {
    const projected = projectTaskExecutionSource("/se" as never, copySource);
    expect(projected.node.children.map((child) => child.llmModelIdentifier)).toEqual(["opus", "sol-6.1"]);
    expect(projected.node.defaultLaunchConfiguration).toBe(claude);
    expect(projected.followerAddresses).toEqual(["/se/lead"]);
    const lists = taskExecutionListsOf({ taskExecutions: [teamCopy] });
    expect(copyExecutionSource(lists, "copy-ie")).toEqual({ agentDefinitionId: "ie", launchConfiguration: codex });
    expect(copyExecutionSource(lists, "copy-lead")).toEqual({ agentDefinitionId: "lead", launchConfiguration: claude });
  });

  it("restore never borrows the Team's launch: a follower's own recorded launch is used even if the Team's differs", () => {
    const source = { ...copySource, defaultLaunchConfiguration: codex };
    const projected = projectTaskExecutionSource("/se" as never, source);
    expect(projected.node.children[0]).toMatchObject({ llmModelIdentifier: "opus" });
    expect(projected.followerAddresses).toEqual(["/se/lead"]);
  });
});

describe("configured placement snapshot (D-1, D-4, D-5, D-6)", () => {
  const slotAgent = (address: string, launchConfiguration: typeof claude): ConfiguredAgentExecutionNode => ({
    address: address as never, agentDefinitionId: address.split("/").at(-1)!, role: "r", description: null,
    agentRunId: `run-${address}`, platformAgentRunId: "slot-session", launchConfiguration,
  });

  it("an agent placement becomes its definition and launch with the configured origin", () => {
    expect(configuredPlacementSource(slotAgent("/writer", codex), [])).toEqual({
      kind: "agent", agentDefinitionId: "writer", launchConfiguration: codex, launchSource: { origin: "configured", fallbacks: [] },
    });
  });

  it("a Team placement records every member's complete launch, followers by the configured rule, and its members' handoffs", () => {
    const team: ConfiguredTeamExecutionNode = {
      address: "/group" as never, teamDefinitionId: "group", role: null, description: null, teamRunId: "group-run",
      coordinatorAddress: "/group/one" as never, defaultLaunchConfiguration: claude, taskExecutions: [],
      members: [
        slotAgent("/group/one", claude),
        // Its own auto-approve and workspace, the Team's model: still a follower (AC-011 a).
        slotAgent("/group/two", { ...claude, autoExecuteTools: false, workspaceRootPath: "/elsewhere" }),
        slotAgent("/group/three", codex),
      ],
    };
    const handoffs = [
      { from: "/group/one", to: "/teacher", rules: ["report"] },
      { from: "/group/one", to: "/group/two", rules: ["pass"] },
      { from: "/teacher", to: "/group/one", rules: ["assign"] },
      { from: "/other", to: "/teacher", rules: ["x"] },
    ] as never;
    const source = configuredPlacementSource(team, handoffs);
    expect(source).toMatchObject({
      kind: "agent_team", teamDefinitionId: "group", coordinatorAddress: "/group/one", defaultLaunchConfiguration: claude,
      defaultLaunchSource: { origin: "configured", fallbacks: [] },
      handoffs: [{ from: "/group/one", to: "/teacher", rules: ["report"] }, { from: "/group/one", to: "/group/two", rules: ["pass"] }],
    });
    if (source.kind !== "agent_team") throw new Error("team expected");
    expect(source.members.map((member) => [member.address, member.followsTeam, member.launchConfiguration.autoExecuteTools])).toEqual([
      ["/group/one", true, true], ["/group/two", true, false], ["/group/three", false, true],
    ]);
    expect(source.members.every((member) => member.launchSource === undefined)).toBe(true);
  });
});

describe("recorded per-member launch (schema)", () => {
  it("reads and writes the member facts exactly", () => {
    expect(parseTaskExecution(JSON.parse(JSON.stringify(teamCopy)), "task")).toEqual(teamCopy);
  });

  it("requires every member's launch and follower fact, and the copy's source", () => {
    const raw = JSON.parse(JSON.stringify(teamCopy));
    const { launchConfiguration: _launch, ...noLaunch } = raw.source.members[0];
    expect(() => parseTaskExecution({ ...raw, source: { ...raw.source, members: [noLaunch, raw.source.members[1]] } }, "c"))
      .toThrow("missing required field(s): launchConfiguration");
    expect(() => parseTaskExecution({ ...raw, source: { ...raw.source, members: [{ ...raw.source.members[0], followsTeam: "yes" }, raw.source.members[1]] } }, "c"))
      .toThrow("followsTeam must be boolean");
    const { source: _source, ...sourceless } = raw;
    expect(() => parseTaskExecution(sourceless, "c")).toThrow("missing required field(s): source");
  });

  it("accepts handoffs that start at a member (also to the coordinating run) and rejects others", () => {
    const raw = JSON.parse(JSON.stringify(teamCopy));
    const withHandoffs = (handoffs: unknown) => ({ ...raw, source: { ...raw.source, handoffs } });
    expect(() => parseTaskExecution(withHandoffs([{ from: "/se/lead", to: "/teacher", rules: ["report"] }]), "c")).not.toThrow();
    expect(() => parseTaskExecution(withHandoffs([{ from: "/teacher", to: "/se/lead", rules: ["assign"] }]), "c")).toThrow("does not start at a member");
  });

  it("rejects a malformed recorded source", () => {
    const bad = (launchSource: unknown) => ({ ...JSON.parse(JSON.stringify(teamCopy)), source: { ...copySource, defaultLaunchSource: launchSource } });
    expect(() => parseTaskExecution(bad({ origin: "somewhere", fallbacks: [] }), "c")).toThrow("c.source.defaultLaunchSource.origin");
    expect(() => parseTaskExecution(bad({ origin: "inherited" }), "c")).toThrow("missing required field(s): fallbacks");
    expect(() => parseTaskExecution(bad({ origin: "inherited", fallbacks: [{ layer: "inherited", runtimeKind: null, llmModelIdentifier: null, reason: "incomplete", detail: "x" }] }), "c"))
      .toThrow("fallbacks[0].layer");
    expect(parseTaskExecution(bad({ origin: "configured", fallbacks: [] }), "c")).toMatchObject({ source: { defaultLaunchSource: { origin: "configured" } } });
  });
});
