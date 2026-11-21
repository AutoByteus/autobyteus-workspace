import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createRootExecutionIdentity } from "../../../src/agent-collaboration/execution/domain/root-execution-identity.js";
import { ProjectsLayout } from "../../../src/projects/stores/projects-layout.js";
import { TaskExecutionResourceStore } from "../../../src/projects/stores/task-execution-resource-store.js";
import { parseTaskExecutionResourceFile, serializeTaskExecutionResourceFile } from "../../../src/projects/stores/task-execution-resource-schema.js";
import { taskRunResources } from "../../helpers/task-run-resources.js";

/**
 * autobyteus-591 DN-3: a peer run's owed delegation-state notice, persisted on its Task entries as `peerNoticeOwed: true`
 * (written only when true, on a peer's run only), read back after a restart, and cleared from every Task on confirmation.
 */

const root = createRootExecutionIdentity({ rootSubjectKind: "agent", rootRunId: "assistant_a1" });
const from = { delegatingRun: root, delegatorAgentRunId: "assistant_a1" };
const PEER_RUN = { agentRunId: "publisher_r1" };
const B = "srv_node_b_000000000000000000000000000";
let dir: string, layout: ProjectsLayout;
const location = (taskId: string) => ({ projectId: "p1", taskId });
const fileOf = (taskId: string) => fs.readFile(layout.taskExecutionResourcesFile("p1", taskId), "utf8").then(JSON.parse);
const service = async () => { const resources = taskRunResources(new TaskExecutionResourceStore(layout)); await resources.load(); return resources; };

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), "peer-notice-owed-"));
  layout = new ProjectsLayout(path.join(dir, "projects"));
  await fs.mkdir(path.dirname(layout.taskExecutionResourcesFile("p1", "t1")), { recursive: true });
  await fs.mkdir(path.dirname(layout.taskExecutionResourcesFile("p1", "t2")), { recursive: true });
});
afterEach(async () => { await fs.rm(dir, { recursive: true, force: true }); });

describe("a peer run's owed notice on its Task entries (DN-3)", () => {
  it("is written on the run's current entry, read back after a restart, and cleared from every Task", async () => {
    const resources = await service();
    await resources.serialize("t1", () => resources.linkAssigned(location("t1"), { role: "assigned", taskId: "t1", delegatedFrom: from, recipientAddress: "/publisher",
      execution: PEER_RUN, nodeId: B } as never));
    await resources.markStarted(PEER_RUN);
    await resources.closeTask(location("t1"), async () => undefined);
    await resources.setPeerNoticeOwed(PEER_RUN, true);
    expect((await fileOf("t1")).agentRunResources[0]).toMatchObject({ nodeId: B, peerNoticeOwed: true });

    // A restart loses nothing: the owed notice is read back (S-3).
    const restarted = await service();
    expect(restarted.owedPeerNotices()).toEqual([{ run: PEER_RUN, nodeId: B }]);
    // The run is given another Task: the new entry keeps its node (DN-8); the mark is set there too, then cleared from both.
    await restarted.serializeDelegatedRunInTask(PEER_RUN, () => "t2", () => restarted.assignExisting(location("t2"), { delegatedFrom: from, execution: PEER_RUN, taskId: "t2" }));
    expect((await fileOf("t2")).agentRunResources[0]).toMatchObject({ nodeId: B });
    expect((await fileOf("t2")).agentRunResources[0].peerNoticeOwed).toBeUndefined();
    await restarted.setPeerNoticeOwed(PEER_RUN, true);
    expect((await fileOf("t2")).agentRunResources[0].peerNoticeOwed).toBe(true);
    await restarted.setPeerNoticeOwed(PEER_RUN, false);
    expect([(await fileOf("t1")).agentRunResources[0].peerNoticeOwed, (await fileOf("t2")).agentRunResources[0].peerNoticeOwed]).toEqual([undefined, undefined]);
    expect(restarted.owedPeerNotices()).toEqual([]);
  });

  it("is never set on a run of this node, and an unchanged mark writes nothing", async () => {
    const resources = await service();
    await resources.serialize("t1", () => resources.linkAssigned(location("t1"), { role: "assigned", taskId: "t1", delegatedFrom: from, recipientAddress: "/worker",
      execution: { agentRunId: "local_r1" } } as never));
    const before = await fs.readFile(layout.taskExecutionResourcesFile("p1", "t1"), "utf8");
    const { mtimeMs } = await fs.stat(layout.taskExecutionResourcesFile("p1", "t1"));
    await resources.setPeerNoticeOwed({ agentRunId: "local_r1" }, true);
    await resources.setPeerNoticeOwed({ agentRunId: "local_r1" }, false);
    expect(await fs.readFile(layout.taskExecutionResourcesFile("p1", "t1"), "utf8")).toBe(before);
    expect((await fs.stat(layout.taskExecutionResourcesFile("p1", "t1"))).mtimeMs).toBe(mtimeMs);
  });

  it("the schema reads and writes it only as `true` on a peer's run; any other value is damage", () => {
    const entry = { role: "assigned", delegatedFrom: { delegatingRun: { kind: "agent", runId: "assistant_a1" }, delegatorAgentRunId: "assistant_a1" },
      recipientAddress: "/publisher", agentRun: { kind: "agent", agentRunId: "publisher_r1" }, nodeId: B, linkedAt: "2026-11-21T10:00:00.000Z",
      start: "started", closedAt: "2026-11-21T11:00:00.000Z" };
    const owed = parseTaskExecutionResourceFile({ taskId: "t1", agentRunResources: [{ ...entry, peerNoticeOwed: true }] }, "t1");
    expect(owed.executionResources[0]!.peerNoticeOwed).toBe(true);
    expect(serializeTaskExecutionResourceFile(owed).agentRunResources[0]).toEqual({ ...entry, peerNoticeOwed: true });
    const none = parseTaskExecutionResourceFile({ taskId: "t1", agentRunResources: [entry] }, "t1");
    expect("peerNoticeOwed" in serializeTaskExecutionResourceFile(none).agentRunResources[0]!).toBe(false);
    const { nodeId: _node, ...local } = entry;
    expect(() => parseTaskExecutionResourceFile({ taskId: "t1", agentRunResources: [{ ...local, peerNoticeOwed: true }] }, "t1")).toThrow("peerNoticeOwed");
    expect(() => parseTaskExecutionResourceFile({ taskId: "t1", agentRunResources: [{ ...entry, peerNoticeOwed: false }] }, "t1")).toThrow("peerNoticeOwed");
  });
});
