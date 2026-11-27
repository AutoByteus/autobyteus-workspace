import { describe, expect, it, vi } from "vitest";
import { listRunningAgentsFor, LIST_RUNNING_AGENTS_TOOL_DESCRIPTION } from "../../../../src/agent-tools/agent-discovery/list-running-agents-contract.js";
import type { RunningAgentEntry } from "../../../../src/agent-collaboration/running/running-agent-entry.js";
import type { PeerDiscoveryChannel } from "../../../../src/agent-collaboration/execution/remote/peer-discovery-channel.js";
import { REMOTE_COLLABORATION_OFF_DISCOVERY } from "../../../../src/agent-tools/agent-discovery/agent-discovery-refusal.js";
import { runningAgentsOf } from "../../../../src/remote-collaboration/channel/peer-running-agents-answer.js";
import { PeerNodeDiscovery } from "../../../../src/remote-collaboration/discovery/peer-node-discovery.js";
import { peerRefusalText } from "../../../../src/remote-collaboration/domain/remote-refusals.js";

/**
 * autobyteus-492 DS-001, DS-002 (REQ-001, REQ-005, REQ-006, REQ-012; QR-002): the tool for the senders of `list_available_agents`,
 * this node's listing or a peer's, the same filter rule, and the peer's answer read strictly.
 */
const pm: RunningAgentEntry = { kind: "agent", name: "Project Task Manager", address: "/project_task_manager", agent_run_id: "pm_b", workspace: "/w",
  state: "idle", started_at: "2026-11-14T09:12:03Z", project: "AutoByteus" };
const team: RunningAgentEntry = { kind: "agent_team", name: "Product Team", address: "/product_team", team_run_id: "team_b",
  team_coordinator_agent_run_id: "lead_b", state: "running" };
const context = (canList = true) => ({ identity: { root: { rootSubjectKind: "agent", rootRunId: "pm_a" }, agentRunId: "pm_a", memberAddress: "/pm" },
  collaboration: canList ? { listAvailableAgents: vi.fn() } : {} }) as never;
const discovery = (answer: readonly RunningAgentEntry[] | { accepted: false; code: string; message: string }) =>
  ({ listRunningAgents: vi.fn(async () => answer) }) as unknown as PeerDiscoveryChannel & { listRunningAgents: ReturnType<typeof vi.fn> };

describe("list_running_agents", () => {
  it("REQ-012: the description says what the list is for, how to message each kind, node, and that stopped runs are not listed or woken", () => {
    for (const text of ["for messages only: to start work, use delegate_task", "agent_run_id", "team_coordinator_agent_run_id", "With node",
      "pass the same node to send_message_to", "Stopped runs are not listed, and a message never wakes them", "workspace"]) {
      expect(LIST_RUNNING_AGENTS_TOOL_DESCRIPTION).toContain(text);
    }
  });

  it("without node: this node's listing, the caller's run left out by its own root identity, with the filters", async () => {
    const list = vi.fn(async () => [pm]);
    await expect(listRunningAgentsFor(context(), { state: "idle", address: "/project_task_manager" }, REMOTE_COLLABORATION_OFF_DISCOVERY, { listing: () => ({ list }) }))
      .resolves.toEqual({ agents: [pm] });
    expect(list).toHaveBeenCalledWith({ caller: { rootSubjectKind: "agent", rootRunId: "pm_a" }, filters: { address: "/project_task_manager", state: "idle" } });
  });

  it("with node: the peer's entries (with node), filtered here by the same rule; the peer's refusal is returned as it is", async () => {
    const peer = discovery([{ ...pm, node: "docker" }, { ...team, node: "docker" }]);
    await expect(listRunningAgentsFor(context(), { node: " docker ", state: "running" }, peer)).resolves.toEqual({ agents: [{ ...team, node: "docker" }] });
    expect(peer.listRunningAgents).toHaveBeenCalledWith("docker");
    const refused = { accepted: false as const, code: "PEER_NOT_REGISTERED", message: "No peer node named \"nas\"." };
    await expect(listRunningAgentsFor(context(), { node: "nas" }, discovery(refused))).resolves.toEqual(refused);
    // autobyteus-500 FU-011: the host passes its discovery; with remote collaboration off, the explicit off value.
    await expect(listRunningAgentsFor(context(), { node: "docker" }, REMOTE_COLLABORATION_OFF_DISCOVERY)).resolves.toMatchObject({ accepted: false, code: "REMOTE_COLLABORATION_OFF" });
  });

  it("validates node, address and state; needs a sender that can list available agents", async () => {
    for (const args of [{ node: "" }, { address: "pm" }, { state: "error" }]) {
      await expect(listRunningAgentsFor(context(), args, REMOTE_COLLABORATION_OFF_DISCOVERY, { listing: () => ({ list: vi.fn() }) })).resolves.toMatchObject({ accepted: false, code: "VALIDATION_ERROR" });
    }
    await expect(listRunningAgentsFor(context(false), {}, REMOTE_COLLABORATION_OFF_DISCOVERY)).rejects.toMatchObject({ code: "COLLABORATION_CONTEXT_REQUIRED" });
  });
});

describe("a peer's running agents (QR-002, AC-004)", () => {
  it("are read strictly: exactly each kind's fields; any other field (a title, node, members) or a mistyped one makes the answer malformed", () => {
    expect(runningAgentsOf([pm, team])).toEqual([pm, team]);
    expect(runningAgentsOf([{ ...pm, title: "Plan the release" }])).toBeNull();
    expect(runningAgentsOf([{ ...pm, node: "x" }])).toBeNull();
    expect(runningAgentsOf([{ ...team, members: [] }])).toBeNull();
    expect(runningAgentsOf([{ ...pm, state: "offline" }])).toBeNull();
    expect(runningAgentsOf([{ ...team, team_coordinator_agent_run_id: undefined }])).toBeNull();
    expect(runningAgentsOf([{ ...pm, address: "project_task_manager" }])).toBeNull();
    expect(runningAgentsOf({})).toBeNull();
  });

  it("PeerNodeDiscovery: the peer by name, then its list, each entry with this owner's name for the peer as node; refusals as for available agents", async () => {
    const client = {
      findPeer: vi.fn(async (name: string) => name === "docker" ? { nodeId: "srv_b", name: "docker" } : { accepted: false as const, code: "PEER_NOT_REGISTERED", message: "no" }),
      runningAgents: vi.fn(async () => ({ accepted: true as const, agents: [pm] })),
      checkAvailability: vi.fn(), listAvailableAgents: vi.fn(),
    };
    const peers = new PeerNodeDiscovery({ peers: { list: async () => [] }, client: client as never });
    await expect(peers.listRunningAgents("docker")).resolves.toEqual([{ ...pm, node: "docker" }]);
    expect(client.runningAgents).toHaveBeenCalledWith("srv_b");
    await expect(peers.listRunningAgents("nas")).resolves.toMatchObject({ accepted: false, code: "PEER_NOT_REGISTERED" });
  });

  it("the sending node words a peer's message refusals with its name for the node (entry-form rows 8 and 11)", () => {
    expect(peerRefusalText("docker", "REMOTE_TARGET_NOT_RUNNING", "No running agent has the run id 'pm_x'.")).toBe(
      "No running agent has the run id 'pm_x' on node \"docker\", so the message was not sent. A stopped agent is not woken. If you have list_running_agents, call it with node \"docker\" to see what runs there.");
    expect(peerRefusalText("docker", "TARGET_IS_TEAM_RUN", "team_b is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: lead_b."))
      .toBe("team_b is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: lead_b. The team runs on node \"docker\": send to its coordinator with node \"docker\".");
  });
});
