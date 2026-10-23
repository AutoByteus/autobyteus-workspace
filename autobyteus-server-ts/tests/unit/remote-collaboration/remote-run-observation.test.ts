import { describe, expect, it, vi } from "vitest";
import type { AgentPresentationMessage } from "@autobyteus/agent-presentation-contracts";
import {
  RemoteRunObservation,
  type RemoteRunRootEvent,
} from "../../../src/agent-collaboration/execution/remote/remote-run-observation.js";
import type { RemoteRunChannel, RemoteRunObserver } from "../../../src/agent-collaboration/execution/remote/remote-run-channel.js";
import type { RemoteTaskExecution } from "../../../src/run-history/domain/run-execution-tree-shared-records.js";

/** autobyteus-278 DS-001 / DS-002 / DS-005, AR-402, AR-403: the one owner of a root's remote children's live facts. */

const DOCKER = "srv_docker_000000000000000000000000000";
const OFFICE = "srv_office_000000000000000000000000000";
const agentLink: RemoteTaskExecution = {
  kind: "agent", address: "/market_researcher" as never, agentRunId: "researcher-run", nodeId: DOCKER,
  delegatorAgentRunId: "manager-run", startedAt: "2026-10-23T08:00:00.000Z",
};
const teamLink: RemoteTaskExecution = {
  kind: "agent_team", address: "/marketing_team" as never, teamRunId: "marketing-run", nodeId: DOCKER,
  coordinatorAddress: "/marketing_team/lead" as never,
  members: [{ address: "/marketing_team/lead" as never, agentRunId: "lead-run" }, { address: "/marketing_team/writer" as never, agentRunId: "writer-run" }],
  delegatorAgentRunId: "manager-run", startedAt: "2026-10-23T08:01:00.000Z",
};
const officeLink: RemoteTaskExecution = { ...agentLink, address: "/analyst" as never, agentRunId: "analyst-run", nodeId: OFFICE };
const status = (value: "running" | "idle"): AgentPresentationMessage => ({ type: "AGENT_STATUS", payload: {
  status: value, trigger: null, tool_name: null, error_message: null, error_details: null, recoverableBlock: null,
} } as AgentPresentationMessage);

const harness = (links: RemoteTaskExecution[] = [agentLink, teamLink, officeLink]) => {
  const observers = new Map<string, RemoteRunObserver>();
  const closed: string[] = [];
  const channel = {
    peerName: vi.fn(async (nodeId: string) => nodeId === DOCKER ? "docker" : "office-mac"),
    runSummaries: vi.fn(async (nodeId: string, runs: readonly { kind: string; runId: string }[]) => nodeId === OFFICE
      ? { accepted: false as const, code: "PEER_UNREACHABLE", message: "office-mac did not answer in time." }
      : { accepted: true as const, runs: runs.filter((run) => run.runId !== "marketing-run").map((run) => ({ ...run, title: `Title of ${run.runId}`,
        statuses: [{ agentRunId: run.runId, status: "running" as const }] })) }),
    observeRun: vi.fn((_nodeId: string, root: { runId: string }, observer: RemoteRunObserver) => {
      observers.set(root.runId, observer);
      return { close: () => closed.push(root.runId) };
    }),
  };
  const events: RemoteRunRootEvent[] = [];
  const observation = new RemoteRunObservation({
    links: () => links, publish: (event) => events.push(event), channel: () => channel as unknown as RemoteRunChannel,
  });
  const flush = async () => { for (let index = 0; index < 5; index += 1) await Promise.resolve(); };
  return { channel, observers, closed, events, observation, flush, links };
};

describe("RemoteRunObservation", () => {
  it("opens one stream per remote link on the first viewer and closes them when the last viewer leaves", async () => {
    const f = harness();
    f.observation.viewerAttached();
    expect(f.channel.observeRun.mock.calls.map(([nodeId, root]) => [nodeId, root])).toEqual([
      [DOCKER, { kind: "agent", runId: "researcher-run" }],
      [DOCKER, { kind: "agent_team", runId: "marketing-run" }],
      [OFFICE, { kind: "agent", runId: "analyst-run" }],
    ]);
    f.observation.viewerAttached();
    expect(f.channel.observeRun).toHaveBeenCalledTimes(3);
    f.observation.viewerDetached();
    expect(f.closed).toEqual([]);
    f.observation.viewerDetached();
    expect(f.closed).toEqual(["researcher-run", "marketing-run", "analyst-run"]);
  });

  it("asks each node once for its runs' summaries per viewer; a node that does not answer makes its runs unreachable", async () => {
    const f = harness();
    f.observation.viewerAttached();
    await f.flush();
    expect(f.channel.runSummaries.mock.calls).toEqual([
      [DOCKER, [{ kind: "agent", runId: "researcher-run" }, { kind: "agent_team", runId: "marketing-run" }]],
      [OFFICE, [{ kind: "agent", runId: "analyst-run" }]],
    ]);
    const summaries = f.events.flatMap((event) => event.kind === "remote_task_execution_summary" ? [event.summary] : []);
    expect(summaries).toEqual([
      { nodeId: DOCKER, runId: "researcher-run", reachable: true, title: "Title of researcher-run", statuses: [{ agentRunId: "researcher-run", status: "running" }] },
      // Omitted by the node: answered, without a title or live agents.
      { nodeId: DOCKER, runId: "marketing-run", reachable: true, title: null, statuses: [] },
      { nodeId: OFFICE, runId: "analyst-run", reachable: false, title: null, statuses: [] },
    ]);
    f.observation.viewerAttached();
    await f.flush();
    expect(f.channel.runSummaries).toHaveBeenCalledTimes(4);
  });

  it("AR-402: maps a frame to the stored link's address by agent run ID and drops an agent the link does not have", async () => {
    const f = harness();
    f.observation.viewerAttached();
    f.observers.get("marketing-run")!.onFrame("writer-run", status("running"));
    f.observers.get("marketing-run")!.onFrame("b-local-copy-run", status("running"));
    f.observers.get("researcher-run")!.onFrame("researcher-run", status("idle"));
    expect(f.events.filter((event) => event.kind === "remote_agent_presentation")).toEqual([
      { kind: "remote_agent_presentation", nodeId: DOCKER, agentRunId: "writer-run", memberAddress: "/marketing_team/writer", message: status("running") },
      { kind: "remote_agent_presentation", nodeId: DOCKER, agentRunId: "researcher-run", memberAddress: "/market_researcher", message: status("idle") },
    ]);
  });

  it("AR-403: an end this root did not ask for runs one summary fetch for that run; Retry observes it again", async () => {
    const f = harness([agentLink]);
    f.observation.viewerAttached();
    await f.flush();
    f.events.length = 0;
    f.observers.get("researcher-run")!.onEnd();
    await f.flush();
    expect(f.channel.runSummaries).toHaveBeenCalledTimes(2);
    expect(f.events).toEqual([{ kind: "remote_task_execution_summary", summary: expect.objectContaining({ runId: "researcher-run", reachable: true }) }]);
    expect(f.channel.observeRun).toHaveBeenCalledTimes(1);
    await f.observation.refresh();
    expect(f.channel.observeRun).toHaveBeenCalledTimes(2);
    expect(f.channel.runSummaries).toHaveBeenCalledTimes(3);
  });

  it("a recorded link is announced with its node's name and observed while the root is viewed; nothing is published after dispose", async () => {
    const links = [agentLink];
    const f = harness(links);
    f.observation.linkCommitted(agentLink);
    await f.flush();
    expect(f.events).toEqual([{ kind: "remote_task_execution_started", execution: { ...agentLink, nodeName: "docker" } }]);
    expect(f.channel.observeRun).not.toHaveBeenCalled();
    f.observation.viewerAttached();
    links.push(teamLink);
    f.observation.linkCommitted(teamLink);
    await f.flush();
    expect(f.channel.observeRun.mock.calls.map(([, root]) => root.runId)).toEqual(["researcher-run", "marketing-run"]);
    f.observation.dispose();
    expect(f.closed).toEqual(["researcher-run", "marketing-run"]);
    f.events.length = 0;
    f.observers.get("marketing-run")!.onFrame("lead-run", status("running"));
    f.observation.linkCommitted(officeLink);
    await f.flush();
    expect(f.events).toEqual([]);
  });
});
