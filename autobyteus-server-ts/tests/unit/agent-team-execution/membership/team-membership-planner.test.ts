import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentTeamDefinition, TeamMember } from "../../../../src/agent-team-definition/domain/agent-team-definition.js";
import { TeamMembershipPlanner } from "../../../../src/agent-team-execution/membership/team-membership-planner.js";
import type { TeamRunExecutionTreeSnapshot } from "../../../../src/agent-team-execution/domain/team-run-execution-tree.js";
import { testAgentNode, testExecutionTree } from "../../../fixtures/current-team-run-fixtures.js";

const definition = (members: string[], handoffs: Array<{ from: string; to: string; rules: string[] }>) => new AgentTeamDefinition({
  id: "team-root", name: "Root Team", description: "d", instructions: "x",
  nodes: members.map((name) => new TeamMember({ memberName: name, ref: `agent-${name}`, refScope: "shared" })),
  coordinatorMemberName: "lead",
  handoffs,
});
const tree = (extra: Partial<TeamRunExecutionTreeSnapshot> = {}): TeamRunExecutionTreeSnapshot => ({
  ...testExecutionTree({ rootTeamRunId: "team_1", rootTeamDefinitionId: "team-root", coordinatorAddress: "/lead",
    children: [testAgentNode("/lead", { agentRunId: "lead_1" })] }),
  ...extra,
});
const ownDefault = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt", llmConfig: null };

const planner = (input: {
  team?: AgentTeamDefinition | null | Error;
  loadIssue?: () => string | null;
  ownLaunch?: unknown;
  check?: (request: any) => unknown;
}) => new TeamMembershipPlanner({
  teamDefinitions: {
    getDefinitionById: async () => { if (input.team instanceof Error) throw input.team; return input.team ?? null; },
    listLoadIssues: async () => { const reason = input.loadIssue?.() ?? null;
      return reason ? [{ definitionId: "team-root", usingLastGood: true, issue: { code: "DEFINITION_CONTRACT_INVALID", reason, definitionPath: "/p", packageRoot: "/" } }] : []; },
  } as never,
  agentDefinitions: { getAgentDefinitionById: async () => (input.ownLaunch ? { defaultLaunchConfig: input.ownLaunch } : null) as never },
  usability: { check: vi.fn(async (request: any) => (input.check ?? ((r: any) => ({ verdicts: [], inherited: { usable: true, launch: r.inherited } })))(request)) } as never,
  agentRunIds: { allocateForAgentDefinition: async (id: string) => `${id}-run` },
});

afterEach(() => vi.restoreAllMocks());

describe("TeamMembershipPlanner.viewFor (DS-003, DEC-005, N-7)", () => {
  it("reads the definition: members, coordinator, own-team rules, and each new member's launch from its agent's default when usable", async () => {
    const own = { ...ownDefault, autoExecuteTools: true, workspaceRootPath: null };
    const view = await planner({
      team: definition(["lead", "writer"], [{ from: "/lead", to: "/writer", rules: ["Draft."] }]), ownLaunch: ownDefault,
      check: () => ({ verdicts: [{ usable: true, launch: own }], inherited: { usable: true, launch: {} } }),
    }).viewFor(tree());
    expect(view?.members.map((member) => [member.address, member.agentDefinitionId])).toEqual([["/lead", "agent-lead"], ["/writer", "agent-writer"]]);
    expect(view?.coordinatorAddress).toBe("/lead");
    expect(view?.handoffs).toEqual([{ from: "/lead", to: "/writer", rules: ["Draft."] }]);
    expect([...view!.newMembers.values()]).toEqual([{ agentRunId: "agent-writer-run", launchConfiguration: own, launchSource: { origin: "agent_default", fallbacks: [] } }]);
  });

  it("falls back to the run's own launch when the agent's default is not usable, recording why", async () => {
    const tree1 = tree();
    const view = await planner({
      team: definition(["lead", "writer"], []), ownLaunch: ownDefault,
      check: (request) => ({ verdicts: [{ usable: false, reason: "runtime_unavailable", detail: "Codex is not installed." }],
        inherited: { usable: true, launch: request.inherited } }),
    }).viewFor(tree1);
    expect([...view!.newMembers.values()][0]).toMatchObject({
      launchConfiguration: tree1.rootTeam.defaultLaunchConfiguration,
      launchSource: { origin: "team_default", fallbacks: [{ layer: "agent_default", runtimeKind: "codex_app_server", reason: "runtime_unavailable" }] },
    });
  });

  it("leaves out a member no launch covers, with a warning naming the run (the next change tries again)", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const view = await planner({ team: definition(["lead", "writer"], []),
      check: () => ({ verdicts: [], inherited: { usable: false, modelNoLongerOffered: true, detail: "The model is no longer offered." } }) }).viewFor(tree());
    expect(view!.newMembers.size).toBe(0);
    expect(warn).toHaveBeenCalledWith("TEAM_MEMBER_NOT_ADDED: Team run 'team_1' cannot add '/writer' yet: The model is no longer offered.");
  });

  it("compiles a delegated copy's rules as a delegated team (N-7)", async () => {
    const compiled = await planner({ team: definition(["lead", "writer"], [{ from: "/lead", to: "/writer", rules: ["Draft."] }]) })
      .viewFor(tree({ delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager" } } as never, copiedFrom: "team_definition" }));
    expect(compiled?.handoffs.some((handoff) => handoff.from === "/lead" && handoff.to === "/writer")).toBe(true);
  });

  it("does not follow an application run or a configured-placement copy; a missing or unreadable definition leaves the run with a warning", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const team = definition(["lead"], []);
    expect(await planner({ team }).viewFor(tree({ copiedFrom: "configured_placement" }))).toBeNull();
    expect(await planner({ team }).viewFor(tree({ applicationBinding: {} as never }))).toBeNull();
    expect(warn).not.toHaveBeenCalled();
    expect(await planner({ team: null }).viewFor(tree())).toBeNull();
    expect(warn).toHaveBeenLastCalledWith("TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run 'team_1' keeps its members: Team definition 'team-root' was not found.");
    expect(await planner({ team: new Error("bad json") }).viewFor(tree())).toBeNull();
    expect(warn).toHaveBeenLastCalledWith("TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run 'team_1' keeps its members: Team definition 'team-root' cannot be used (bad json).");
  });

  it("O-1: a definition the loader could not read is not followed (its last good version neither); warned once per reason, again after it was valid", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    let issue: string | null = "Unexpected token } in team-config.json";
    const p = planner({ team: definition(["lead", "writer"], []), loadIssue: () => issue });
    expect(await p.viewFor(tree())).toBeNull();
    expect(await p.viewFor(tree())).toBeNull();
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith("TEAM_RUN_DEFINITION_NOT_FOLLOWED: Team run 'team_1' keeps its members: Team definition 'team-root' could not be read (Unexpected token } in team-config.json); its last good version is not followed.");
    issue = null;
    expect(await p.viewFor(tree())).not.toBeNull();
    issue = "Unexpected token } in team-config.json";
    expect(await p.viewFor(tree())).toBeNull();
    expect(warn).toHaveBeenCalledTimes(2);
  });

  it("a definition whose coordinator cannot be added is not followed, warned once", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const coordinatorWriter = new AgentTeamDefinition({ ...definition(["lead", "writer"], []), coordinatorMemberName: "writer" } as never);
    const q = planner({ team: coordinatorWriter, check: () => ({ verdicts: [], inherited: { usable: false, modelNoLongerOffered: false, detail: "No model." } }) });
    expect(await q.viewFor(tree())).toBeNull();
    expect(await q.viewFor(tree())).toBeNull();
    expect(warn.mock.calls.filter(([line]) => String(line).includes("its coordinator '/writer' could not be added"))).toHaveLength(1);
  });

  it("followStored clears every leaving marker of the stopped run, even when its definition is not read", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const base = tree();
    const marked = { ...base, rootTeam: { ...base.rootTeam, formerMembers: [{ ...base.rootTeam.members[0]!, agentRunId: "old_1", address: "/old" as never, leaving: true as const }] } };
    const change = await planner({ team: null }).followStored(marked);
    expect(change).toMatchObject({ joined: [], left: [], released: ["old_1"] });
    expect(change!.tree.rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
  });

  it("followStored: a stopped run's change against its current definition", async () => {
    const change = await planner({ team: definition(["lead", "writer"], [{ from: "/lead", to: "/writer", rules: ["Draft."] }]) }).followStored(tree());
    expect(change?.joined).toEqual([{ agentRunId: "agent-writer-run", address: "/writer" }]);
    expect(await planner({ team: definition(["lead"], []) }).followStored(tree())).toBeNull();
  });
});
