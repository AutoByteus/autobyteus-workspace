import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { createTeamRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ActiveCollaborationRootDirectory } from "../../../src/agent-collaboration/execution/services/active-collaboration-root-directory.js";
import { AgentMemoryLayout } from "../../../src/agent-memory/store/agent-memory-layout.js";
import { TeamBackendKind } from "../../../src/agent-team-execution/domain/team-backend-kind.js";
import { TeamRunContext } from "../../../src/agent-team-execution/domain/team-run-context.js";
import { TeamRunEventSourceType } from "../../../src/agent-team-execution/domain/team-run-event.js";
import { TeamRun } from "../../../src/agent-team-execution/domain/team-run.js";
import type { FlatTeamExecutionFactory } from "../../../src/agent-team-execution/local/flat-team-execution-factory.js";
import { FlatTeamExecutionContext } from "../../../src/agent-team-execution/local/flat-team-execution-context.js";
import { TeamChangeNoticeSource } from "../../../src/agent-team-execution/membership/team-change-notice-source.js";
import { TeamDefinitionChangeListener } from "../../../src/agent-team-execution/membership/team-definition-change-listener.js";
import { TeamMembershipPlanner } from "../../../src/agent-team-execution/membership/team-membership-planner.js";
import { AgentTeamRunManager } from "../../../src/agent-team-execution/services/agent-team-run-manager.js";
import { AgentTeamDefinition, TeamMember } from "../../../src/agent-team-definition/domain/agent-team-definition.js";
import type { RunModelSelectionValidator } from "../../../src/llm-management/services/run-model-selection-service.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";
import { testAgentNode, testMemberExecutionContext, testTeamRunConfig } from "../../fixtures/current-team-run-fixtures.js";
import { noDelegations, openTaskRecords } from "../../helpers/no-delegations.js";
import { testViewStreams } from "../../helpers/view-streams.js";
import { NO_PEER_CHANNEL, NO_PEER_RUN_PORTS, NO_REMOTE_FILES } from "../../helpers/explicit-host-collaborators.js";
import { GlobalAgentRunMessageRouter } from "../../../src/agent-communication/services/global-agent-run-message-router.js";
import { buildAgentRunMessageSenderContext } from "../../../src/agent-communication/domain/agent-run-message-sender.js";

/**
 * The ticket's reproduction (design § Guidance For Implementation): a live Team run of a definition that gains a member
 * and a rule. Before this change the run kept its members (the sender's rules omitted the new one and a message to it
 * was refused); now the run follows the definition: the member joins, the sender's live rules list the rule, the change
 * is on disk, the open view is told, and a removed member is refused by run ID with the exact text.
 */
const tempDirs: string[] = [];
afterEach(async () => { await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });

/** Every stored model is offered: these runs' launches are not what this test is about. */
const modelSelectionValidator = Object.freeze({
  validateMany: async (inputs: Parameters<RunModelSelectionValidator["validateMany"]>[0]) => inputs.map(({ selection }) => ({ kind: "valid" as const, selection })),
  validate: async ({ selection }: Parameters<RunModelSelectionValidator["validate"]>[0]) => ({ kind: "valid" as const, selection }),
}) as unknown as RunModelSelectionValidator;

/** A fake flat backend: `live` names the members with a running execution; a leaving member stops when the test says. */
const factory = () => {
  const live = new Set<string>();
  let stopped: ((agentRunId: string) => void) | null = null;
  const followMembership = vi.fn((_ids: readonly string[], onStopped: (agentRunId: string) => void) => { stopped = onStopped; });
  const removeStoppedHandle = vi.fn();
  const state = { active: true };
  const contexts: TeamRunContext[] = [];
  const beginMaterialization = (request: Parameters<FlatTeamExecutionFactory["beginMaterialization"]>[0]) => {
    const runtimeContext = new FlatTeamExecutionContext({ configuredMemberActivationMode: request.activationMode });
    const context = new TeamRunContext({
      physicalScope: request.physicalScope, teamRunId: request.membership.teamNode.teamRunId, teamBackendKind: TeamBackendKind.MIXED,
      membership: request.membership, applicationBinding: request.applicationBinding, runtimeContext,
    });
    contexts.push(context);
    const backend = {
      teamRunId: context.teamRunId, teamBackendKind: TeamBackendKind.MIXED, getTeamRunContext: () => context, getRuntimeContext: () => runtimeContext,
      isActive: () => state.active, isTerminated: () => !state.active, getLeafAgentStatusSnapshots: () => [], hasOpenExecutionWork: () => false,
      followMembership, removeStoppedHandle, liveExecutionIds: () => new Set(live),
    };
    const attempt = Promise.resolve(Object.freeze({ teamRun: new TeamRun(context, backend as never), commitAfterDurability: vi.fn(), abort: vi.fn(async () => undefined) }));
    return { prepare: () => attempt, cancel: vi.fn(), release: vi.fn(async () => ({ accepted: true })) };
  };
  return { factory: { beginMaterialization } as unknown as FlatTeamExecutionFactory, followMembership, removeStoppedHandle, contexts, state, live,
    stop: (agentRunId: string) => { live.delete(agentRunId); stopped!(agentRunId); } };
};

const definition = (members: string[], handoffs: Array<{ from: string; to: string; rules: string[] }>) => new AgentTeamDefinition({
  id: "team-root", name: "Root Team", description: "d", instructions: "x",
  nodes: members.map((name) => new TeamMember({ memberName: name, ref: `agent-${name}`, refScope: "shared" })),
  coordinatorMemberName: "lead",
  handoffs,
});

describe("A live Team run follows its definition (reproduction)", () => {
  it("adds a member and a rule; then removes a member, which is refused by run ID with the exact text", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-follows-definition-"));
    tempDirs.push(memoryDir);
    let current = definition(["lead", "writer"], [{ from: "/lead", to: "/writer", rules: ["Draft."] }]);
    const planner = new TeamMembershipPlanner({
      teamDefinitions: { getDefinitionById: async () => current, listLoadIssues: async () => [] },
      agentDefinitions: { getAgentDefinitionById: async () => null },
      usability: { check: async (input: { inherited: unknown }) => ({ verdicts: [], inherited: { usable: true, launch: input.inherited } }) } as never,
      agentRunIds: { allocateForAgentDefinition: async (id: string) => `${id}-run` },
    });
    const { factory: flat, followMembership, removeStoppedHandle, contexts, live, stop } = factory();
    const activeRootDirectory = new ActiveCollaborationRootDirectory();
    const delegationIndex = noDelegations();
    const runPartsChanged = vi.spyOn(delegationIndex, "runPartsChanged");
    const manager = new AgentTeamRunManager({
      membershipPlanner: planner, changeNotices: new TeamChangeNoticeSource(),
      delegationIndex, viewStreams: testViewStreams(), taskRecords: openTaskRecords(), memoryDir,
      flatTeamExecutionFactory: flat, memberExecutionContextBuilder: { build: vi.fn() } as never,
      activeRootDirectory, modelSelectionValidator, remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_REMOTE_FILES.received,
    });
    const config = testTeamRunConfig({
      rootTeamRunId: "team_1", rootTeamDefinitionId: "team-root", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead_1", runtimeKind: RuntimeKind.AUTOBYTEUS }), testAgentNode("/writer", { agentRunId: "writer_1" })],
      handoffs: [{ from: "/lead", to: "/writer", rules: ["Draft."] }],
    });
    const root = await manager.createTeamRun({ config, teamDefinitionName: "Root Team" });
    const membership = () => contexts[0]!.membership;
    const events: string[] = [];
    root.subscribeToEvents(({ event }) => { if (event.eventSourceType === TeamRunEventSourceType.MEMBERSHIP) events.push("membership"); });
    expect(membership().handoffsOf("lead_1")).toEqual([{ from: "/lead", to: "/writer", rules: ["Draft."] }]);

    // The definition gains a reviewer and a rule to it; one definition-change pass follows every live run.
    current = definition(["lead", "writer", "reviewer"], [
      { from: "/lead", to: "/writer", rules: ["Draft."] }, { from: "/lead", to: "/reviewer", rules: ["Review the draft."] }]);
    const listener = new TeamDefinitionChangeListener({ liveRuns: () => manager.listActiveTeamRuns(), planner });
    await listener.definitionsChanged();

    expect(membership().stateOf("agent-reviewer-run")).toBe("current");
    expect(root.hasAgentExecution("agent-reviewer-run")).toBe(true);
    expect(membership().handoffsOf("lead_1")).toEqual([
      { from: "/lead", to: "/writer", rules: ["Draft."] }, { from: "/lead", to: "/reviewer", rules: ["Review the draft."] }]);
    const teamDir = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: "team_1", ancestorTeamRunIds: [] });
    const onDisk = JSON.parse(await fs.readFile(path.join(teamDir, "team_run_execution_tree.json"), "utf8"));
    expect(onDisk.rootTeam.members.map((member: { address: string }) => member.address)).toEqual(["/lead", "/writer", "/reviewer"]);
    expect(onDisk.handoffs).toHaveLength(2);
    expect(events).toEqual(["membership"]);

    // The writer is removed while it runs: it is written leaving and asked to stop; its run ID is refused with the exact
    // text, entered through the run-ID router (CR-001) as `send_message_to(target_agent_run_id)` does.
    live.add("lead_1"); live.add("writer_1");
    current = definition(["lead", "reviewer"], [{ from: "/lead", to: "/reviewer", rules: ["Review the draft."] }]);
    await listener.definitionsChanged();
    expect(followMembership).toHaveBeenLastCalledWith(["writer_1"], expect.any(Function));
    expect(root.getExecutionTreeSnapshot().rootTeam.formerMembers).toEqual([expect.objectContaining({ agentRunId: "writer_1", leaving: true })]);
    expect(membership().stateOf("writer_1")).toBe("leaving");
    const leadContext = testMemberExecutionContext({ rootTeamRunId: "team_1", memberAddress: "/lead", agentRunId: "lead_1" });
    const router = new GlobalAgentRunMessageRouter({ crossRun: { route: async () => null, admitPeerRun: async () => "not_peer" as const }, nodes: NO_PEER_RUN_PORTS.nodes, outgoing: NO_REMOTE_FILES.outgoing, channel: () => null,
      coordinators: { teamCoordinatorOf: async () => null }, agentRunManager: { getActiveRun: () => null } as never, activeRootDirectory });
    const sender = buildAgentRunMessageSenderContext({ senderRunId: "lead_1", senderName: "lead", runtimeKind: RuntimeKind.AUTOBYTEUS, memberExecutionContext: leadContext });
    const refusal = { accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND",
      message: "writer (/writer) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules." };
    await expect(router.deliver({ sender, targetAgentRunId: "writer_1", content: "hi while leaving" })).resolves.toMatchObject(refusal);
    // Restart-resume placement still places only current members (`hasAgentExecution` keeps its meaning).
    expect(activeRootDirectory.placeOf("writer_1")).toBeNull();

    // It stops: the release write clears its marker, its handle goes, the rows and the view follow; it is then former.
    runPartsChanged.mockClear();
    stop("writer_1");
    await vi.waitFor(() => expect(removeStoppedHandle).toHaveBeenCalledWith("writer_1"));
    expect(root.getExecutionTreeSnapshot().rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
    expect(membership().stateOf("writer_1")).toBeNull();
    expect(runPartsChanged).toHaveBeenCalledWith(createTeamRootExecutionIdentity("team_1"));
    const onDiskAfter = JSON.parse(await fs.readFile(path.join(teamDir, "team_run_execution_tree.json"), "utf8"));
    expect(onDiskAfter.rootTeam.formerMembers[0]).not.toHaveProperty("leaving");
    await expect(router.deliver({ sender, targetAgentRunId: "writer_1", content: "hi when former" })).resolves.toMatchObject(refusal);
    expect(events).toEqual(["membership", "membership", "membership"]);

    // Nothing changed: no write, no event.
    await listener.definitionsChanged();
    expect(events).toEqual(["membership", "membership", "membership"]);
  });

  it("a stopped run whose definition changed is brought up to date before it is restored, then its members are told", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-follows-definition-restore-"));
    tempDirs.push(memoryDir);
    let current = definition(["lead", "writer"], [{ from: "/lead", to: "/writer", rules: ["Draft."] }]);
    const planner = new TeamMembershipPlanner({
      teamDefinitions: { getDefinitionById: async () => current, listLoadIssues: async () => [] },
      agentDefinitions: { getAgentDefinitionById: async () => null },
      usability: { check: async (input: { inherited: unknown }) => ({ verdicts: [], inherited: { usable: true, launch: input.inherited } }) } as never,
      agentRunIds: { allocateForAgentDefinition: async (id: string) => `${id}-run` },
    });
    const managerWith = (flat: FlatTeamExecutionFactory, changeNotices: TeamChangeNoticeSource) => new AgentTeamRunManager({
      membershipPlanner: planner, changeNotices, delegationIndex: noDelegations(), viewStreams: testViewStreams(), taskRecords: openTaskRecords(), memoryDir,
      flatTeamExecutionFactory: flat, memberExecutionContextBuilder: { build: vi.fn() } as never,
      activeRootDirectory: new ActiveCollaborationRootDirectory(), modelSelectionValidator, remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_REMOTE_FILES.received,
    });
    const first = factory();
    const config = testTeamRunConfig({
      rootTeamRunId: "team_2", rootTeamDefinitionId: "team-root", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead_2" }), testAgentNode("/writer", { agentRunId: "writer_2" })],
      handoffs: [{ from: "/lead", to: "/writer", rules: ["Draft."] }],
    });
    await managerWith(first.factory, new TeamChangeNoticeSource()).createTeamRun({ config, teamDefinitionName: "Root Team" });
    first.state.active = false;

    // While it is stopped, the writer is removed and a reviewer added with a rule.
    current = definition(["lead", "reviewer"], [{ from: "/lead", to: "/reviewer", rules: ["Review."] }]);
    const second = factory();
    const notices = new TeamChangeNoticeSource();
    const restored = await managerWith(second.factory, notices).restoreTeamRun("team_2");
    const tree = restored.getExecutionTreeSnapshot();
    expect(tree.rootTeam.members.map((member) => member.agentRunId)).toEqual(["lead_2", "agent-reviewer-run"]);
    expect(tree.rootTeam.formerMembers?.map((member) => member.agentRunId)).toEqual(["writer_2"]);
    expect(second.contexts[0]!.membership.handoffsOf("lead_2")).toEqual([{ from: "/lead", to: "/reviewer", rules: ["Review."] }]);
    // The lead hears of it at its next input.
    const preface = await notices.takePreface({ runId: "lead_2" } as never);
    expect(preface?.text).toBe([
      "Your team changed: its definition was updated.",
      "Joined: reviewer at /reviewer.",
      "Left: writer (/writer); messages to it are no longer delivered.",
      "Your handoff rules changed; call get_handoff_rules to read them.",
    ].join("\n"));
  });

  it("a run that stopped while a member was leaving restores with the marker cleared (nothing executes after a restart)", async () => {
    const memoryDir = await fs.mkdtemp(path.join(os.tmpdir(), "team-run-follows-definition-restart-"));
    tempDirs.push(memoryDir);
    let current = definition(["lead", "writer"], []);
    const planner = new TeamMembershipPlanner({
      teamDefinitions: { getDefinitionById: async () => current, listLoadIssues: async () => [] },
      agentDefinitions: { getAgentDefinitionById: async () => null },
      usability: { check: async (input: { inherited: unknown }) => ({ verdicts: [], inherited: { usable: true, launch: input.inherited } }) } as never,
      agentRunIds: { allocateForAgentDefinition: async (id: string) => `${id}-run` },
    });
    const managerWith = (flat: FlatTeamExecutionFactory) => new AgentTeamRunManager({
      membershipPlanner: planner, changeNotices: new TeamChangeNoticeSource(), delegationIndex: noDelegations(), viewStreams: testViewStreams(),
      taskRecords: openTaskRecords(), memoryDir, flatTeamExecutionFactory: flat, memberExecutionContextBuilder: { build: vi.fn() } as never,
      activeRootDirectory: new ActiveCollaborationRootDirectory(), modelSelectionValidator, remoteChannel: NO_PEER_CHANNEL, receivedFiles: NO_REMOTE_FILES.received,
    });
    const first = factory();
    const firstManager = managerWith(first.factory);
    await firstManager.createTeamRun({ config: testTeamRunConfig({ rootTeamRunId: "team_3", rootTeamDefinitionId: "team-root", coordinatorAddress: "/lead",
      children: [testAgentNode("/lead", { agentRunId: "lead_3" }), testAgentNode("/writer", { agentRunId: "writer_3" })] }), teamDefinitionName: "Root Team" });
    first.live.add("writer_3");
    current = definition(["lead"], []);
    await new TeamDefinitionChangeListener({ liveRuns: () => firstManager.listActiveTeamRuns(), planner }).definitionsChanged();
    const teamDir = new AgentMemoryLayout(memoryDir).getTeamDirPath({ rootTeamRunId: "team_3", ancestorTeamRunIds: [] });
    const stored = JSON.parse(await fs.readFile(path.join(teamDir, "team_run_execution_tree.json"), "utf8"));
    expect(stored.rootTeam.formerMembers).toEqual([expect.objectContaining({ agentRunId: "writer_3", leaving: true })]);
    first.state.active = false;

    const restored = await managerWith(factory().factory).restoreTeamRun("team_3");
    expect(restored.getExecutionTreeSnapshot().rootTeam.formerMembers![0]).not.toHaveProperty("leaving");
    const onDisk = JSON.parse(await fs.readFile(path.join(teamDir, "team_run_execution_tree.json"), "utf8"));
    expect(onDisk.rootTeam.formerMembers[0]).not.toHaveProperty("leaving");
  });
});
