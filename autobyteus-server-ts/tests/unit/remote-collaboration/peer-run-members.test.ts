import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PeerRunMembersNotice, peerRunMembersNoticeOf } from "../../../src/agent-collaboration/execution/remote/peer-run-members-notice.js";
import { peerStatuses } from "../../../src/agent-collaboration/execution/remote/peer-run-calls.js";
import type { RemoteDeliveryReceipt, RemoteRunChannel, RemoteRunMembers } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import { AdHocTasksLayout } from "../../../src/projects/stores/ad-hoc-tasks-layout.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import type { TaskExecutionResourceService } from "../../../src/projects/services/task-execution-resource-service.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { PeerClient } from "../../../src/remote-collaboration/channel/peer-client.js";
import { PeerGateway } from "../../../src/remote-collaboration/channel/peer-gateway.js";
import { remoteRunSummariesOf } from "../../../src/remote-collaboration/channel/peer-run-view-answers.js";
import type { PeerNode } from "../../../src/remote-collaboration/domain/peer-node.js";
import { PeerRunMembersReceiver } from "../../../src/remote-collaboration/inbound/peer-run-members-receiver.js";
import { peerCallerOf } from "../../helpers/peer-caller.js";
import { taskRunResources } from "../../helpers/task-run-resources.js";
import { testConnector, testSigner } from "../../helpers/peer-node-keys.js";

/**
 * org-teams-follow-definition FU-003 (REQ-008, AC-007; design DS-007): a Team run a peer started on node B changes its
 * members (a committed change of the Team following its definition, autobyteus-22); node A, whose Task entry records that
 * run, takes the new members from B's signed notice, or, when it missed it, from B's run summary at the next contact.
 * In process through the real peer client, gateway, receiver and Task side; only HTTP is replaced.
 */
const A_ID = "srv_node_a_000000000000000000000000000";
const B_ID = "srv_node_b_000000000000000000000000000";
const T0 = "2026-11-22T09:00:00.000Z";
const A_ON_B: PeerNode = { nodeId: A_ID, name: "desktop", address: "http://a:29695", addedAt: T0, paired: true, machine: null, account: null, relation: "own" as const, sandbox: false };
const B_ON_A: PeerNode = { nodeId: B_ID, name: "docker", address: "http://b:29700", addedAt: T0, paired: true, machine: null, account: null, relation: "own" as const, sandbox: false };
const LEAD = { address: "/lead", agentRunId: "lead_b" };
const WRITER = { address: "/writer", agentRunId: "writer_b" };
const REVIEWER = { address: "/reviewer", agentRunId: "reviewer_b" };
const entry = (extra: Record<string, unknown> = {}) => ({
  role: "assigned", delegatedFrom: { delegatingRun: { kind: "agent", runId: "manager" }, delegatorAgentRunId: "manager" }, recipientAddress: "/studio_team",
  agentRun: { kind: "team", teamRunId: "studio_team_b", coordinatorAgentRunId: "lead_b" }, linkedAt: T0, start: "started", closedAt: null,
  nodeId: B_ID, members: [LEAD, WRITER], ...extra });

let appData: string;
let layout: ProjectsLayout;
let entriesChanged = vi.fn((_taskId: string): void => undefined);
const boot = async (): Promise<TaskExecutionResourceService> => {
  entriesChanged = vi.fn((_taskId: string): void => undefined);
  const service = taskRunResources(new TaskExecutionResourceStore(layout, new AdHocTasksLayout(path.join(appData, "ad-hoc-tasks"))), undefined, { entriesChanged });
  await service.load();
  return service;
};
const writeTask = async (taskId: string, agentRunResources: unknown[]) => {
  const file = layout.taskExecutionResourcesFile("project_P", taskId);
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify({ taskId, agentRunResources }));
};
beforeEach(async () => {
  appData = await fs.mkdtemp(path.join(os.tmpdir(), "peer-run-members-"));
  layout = new ProjectsLayout(path.join(appData, "projects"));
});
afterEach(async () => { vi.restoreAllMocks(); await fs.rm(appData, { recursive: true, force: true }); });

describe("FU-003: the delegating node's record of a peer Team run follows its members", () => {
  it("the Task side: every entry naming that run on that node takes the members; the same again changes nothing; another node's is not linked", async () => {
    await writeTask("T1", [entry({ closedAt: "2026-11-22T09:30:00.000Z" }), entry({ linkedAt: "2026-11-22T10:00:00.000Z" })]);
    await writeTask("T2", [entry()]);
    const service = await boot();
    await expect(service.updatePeerRunMembers({ teamRunId: "studio_team_b" }, B_ID, [LEAD, REVIEWER], "lead_b")).resolves.toBe("updated");
    for (const taskId of ["T1", "T2"]) expect(service.entriesOf(taskId)[0]).toMatchObject({ members: [LEAD, REVIEWER], entryAgentRunId: "lead_b" });
    // The tree hears each Task's change (its rows follow).
    expect(entriesChanged.mock.calls.map(([taskId]) => taskId).sort()).toEqual(["T1", "T2"]);
    await expect(service.updatePeerRunMembers({ teamRunId: "studio_team_b" }, B_ID, [LEAD, REVIEWER], "lead_b")).resolves.toBe("unchanged");
    await expect(service.updatePeerRunMembers({ teamRunId: "studio_team_b" }, "srv_other_node", [LEAD], "lead_b")).resolves.toBe("not_linked");
    // Durable: a restart reads the new members (both entries of T1, the closed one too).
    const raw = JSON.parse(await fs.readFile(layout.taskExecutionResourcesFile("project_P", "T1"), "utf8"));
    expect(raw.agentRunResources.map((stored: { members: unknown }) => stored.members)).toEqual([[LEAD, REVIEWER], [LEAD, REVIEWER]]);
    expect((await boot()).entriesOf("T1")[0]).toMatchObject({ members: [LEAD, REVIEWER] });
  });

  it("in process: B's Team run tells A after its change, through the signed peer request; A takes it only for its own delegation", async () => {
    await writeTask("T1", [entry()]);
    const service = await boot();
    const gateway = new PeerGateway({ ownNodeId: async () => A_ID,       peers: { findByNodeId: async (id) => id === B_ID ? B_ON_A : null },
      delegatedRuns: {} as never, messages: {} as never, availableAgents: {} as never, runningAgents: {} as never, runViews: {} as never, delegatedRunStates: {} as never, receivedFiles: {} as never,
      peerRunMembers: new PeerRunMembersReceiver({ tasks: service }) });
    const routes: string[] = [];
    const clientOnB = new PeerClient({ signer: testSigner(), connector: testConnector(),
      peers: { findByName: async () => A_ON_B, findByNodeId: async (id) => id === A_ID ? A_ON_B : null },
      ownNodeId: async () => B_ID,
      fetch: (async (url: string, init: RequestInit) => {
        const route = url.slice(url.indexOf("/rest/remote/") + "/rest/remote/".length);
        routes.push(route);
        if (route !== "peer-run-members") throw new TypeError("fetch failed");
        const response = await gateway.peerRunMembers(JSON.parse(String(init.body)), peerCallerOf(init.headers));
        return { ok: response.status === 200, status: response.status, json: async () => structuredClone(response.answer) };
      }) as never,
    });
    // B's Team run (peer-started: its tree names A), after it committed its change.
    let members = [LEAD, WRITER, REVIEWER];
    const tree = () => ({ delegatedFrom: { nodeId: A_ID }, rootTeam: { teamRunId: "studio_team_b", coordinatorAddress: "/lead", members } });
    await peerRunMembersNoticeOf(tree, () => clientOnB)!.changed();
    expect(routes).toEqual(["peer-run-members"]);
    expect(service.entriesOf("T1")[0]).toMatchObject({ members: [LEAD, WRITER, REVIEWER] });
    // A run A never delegated is refused (only the caller's own delegation); B logs it once.
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const stranger = () => ({ delegatedFrom: { nodeId: A_ID }, rootTeam: { teamRunId: "other_team_b", coordinatorAddress: "/lead", members } });
    const notice = peerRunMembersNoticeOf(stranger, () => clientOnB)!;
    await notice.changed();
    await notice.changed();
    expect(warn.mock.calls.filter(([code]) => code === "PEER_RUN_MEMBERS_NOT_TOLD")).toEqual([[
      "PEER_RUN_MEMBERS_NOT_TOLD", expect.objectContaining({ teamRunId: "other_team_b", code: "REMOTE_TARGET_NOT_PERMITTED" })]]);
    // A Team run no peer started tells no one.
    expect(peerRunMembersNoticeOf(() => ({ rootTeam: tree().rootTeam }), () => clientOnB)).toBeNull();
    members = [LEAD];
    await peerRunMembersNoticeOf(tree, () => clientOnB)!.changed();
    expect(service.entriesOf("T1")[0]).toMatchObject({ members: [LEAD] });
  });

  it("one notice at a time, members read when sent: a change while one is on its way sends once more, never out of order", async () => {
    const sent: RemoteRunMembers[] = [];
    let answer!: (receipt: RemoteDeliveryReceipt) => void;
    const channel = { deliveredRunMembers: vi.fn((_node: string, _run: unknown, team: RemoteRunMembers) => {
      sent.push(team);
      return new Promise<RemoteDeliveryReceipt>((resolve) => { answer = resolve; });
    }) } as unknown as RemoteRunChannel;
    let members = [LEAD, WRITER];
    const notice = new PeerRunMembersNotice({ teamRunId: "studio_team_b", nodeId: A_ID, members: () => ({ coordinatorAddress: "/lead", members }) }, () => channel);
    const first = notice.changed();
    members = [LEAD, REVIEWER];
    void notice.changed();
    members = [LEAD];
    void notice.changed();
    answer({ accepted: true });
    await vi.waitFor(() => expect(sent).toHaveLength(2));
    answer({ accepted: true });
    await first;
    expect(sent.map((team) => team.members.map((member) => member.agentRunId))).toEqual([["lead_b", "writer_b"], ["lead_b"]]);
  });

  it("reconcile at the next contact: B's summary of a Team run carries its members; a malformed one is left out, not the summary", async () => {
    const team = { coordinatorAddress: "/lead", members: [LEAD, REVIEWER] };
    const run = { kind: "agent_team", runId: "studio_team_b", title: null, statuses: [], launches: [] };
    expect(remoteRunSummariesOf({ runs: [{ ...run, team }] })![0]).toMatchObject({ team });
    expect(remoteRunSummariesOf({ runs: [{ ...run, team: { coordinatorAddress: "/nobody", members: [LEAD] } }] })![0]).not.toHaveProperty("team");
    // An older peer answers without it.
    expect(remoteRunSummariesOf({ runs: [run] })![0]).not.toHaveProperty("team");
    const channel = { runSummaries: vi.fn(async () => ({ accepted: true as const, runs: [{ ...run, kind: "agent_team" as const, team }] })) } as unknown as RemoteRunChannel;
    const [status] = await peerStatuses([{ kind: "agent_team", teamRunId: "studio_team_b", nodeId: B_ID, members: [LEAD, WRITER], coordinatorAddress: "/lead" } as never], () => channel);
    expect(status!.team).toEqual(team);
  });
});
