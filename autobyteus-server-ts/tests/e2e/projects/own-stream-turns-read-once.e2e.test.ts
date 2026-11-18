import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { readRunTree } from "../helpers/run-tree-delegated.js";

// autobyteus-461 CRR-052 item 2 (SR-087, SR-089; design 3b): a run's own stream opens with its snapshot (the stored part read
// by exclusion, then the unconfirmed turn's frames) and every turn shows once, whichever part carries it. Through the real
// Studio HTTP/WebSocket/GraphQL server, the agents' scoped MCP tools and the scripted AGY CLI:
// - OST-1: a delegated run opened from its tree row (`runTree`'s `openTarget`): its snapshot holds its packet once; a live
//   answer shows once; a reconnect's snapshot holds it once; after its own Stop, the stopped run's snapshot (the full stored
//   read) holds it once; after a restore, the live snapshot holds it once and a new answer shows once.
// - OST-2: an interrupted turn (a held tool step, then INTERRUPT_GENERATION on the run's own stream) reads the same in a
//   reconnect's snapshot as in the stopped run's full stored read: once, not again from turn frames.
// - OST-3: an error-ended turn (partial work, a completed tool, then the provider's error; the CLI's `runtime_error` case)
//   reads the same live, in a reconnect's snapshot and in the stopped run's full stored read.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs [OWN_STREAM_E2E_EVIDENCE=<file.json>] \
//   pnpm exec vitest run tests/e2e/projects/own-stream-turns-read-once.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "own-stream-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
type Frame = { type: string; payload: Rec };

suite("A run's own stream shows each turn once: delegated, reconnected, stopped, restored, interrupted, error-ended (SR-087/089; scripted AGY)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  const evidence: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("own-stream-e2e");
    const suffix = randomUUID().slice(0, 6);
    names.worker = `Own stream worker ${suffix}`;
    ids.manager = await h.agentDefinition(`Own stream manager ${suffix}`);
    ids.worker = await h.agentDefinition(names.worker);
  }, 180_000);

  afterAll(async () => {
    const file = process.env["OWN_STREAM_E2E_EVIDENCE"];
    if (file) fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** A run's own stream (`/ws/agent/<id>`), open until its snapshot. */
  const openOwn = async (agentRunId: string) => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/agent/${agentRunId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "AGENT_STREAM_SNAPSHOT"), `${agentRunId}'s snapshot`, 60_000);
    const deltasOf = (frame: Rec): string[] => frame.type === "SEGMENT_CONTENT" ? [String(frame.payload?.delta ?? "")]
      : frame.type === "SEGMENT_CONTENT_BATCH" ? ((frame.payload?.items ?? []) as Rec[]).map((item) => String(item.delta ?? "")) : [];
    const latest = () => frames.map((frame) => frame.type).lastIndexOf("AGENT_STREAM_SNAPSHOT");
    /** The text the session shows: its latest snapshot's stored entries and turn frames, then every frame after it. */
    const shownText = () => {
      const at = latest();
      const snapshot = frames[at]!.payload;
      const stored = ((snapshot.stored?.conversation ?? []) as Rec[]).map((entry) => String(entry.content ?? "")).join("\n");
      return `${stored}\n${[...((snapshot.turn_frames ?? []) as Rec[]), ...frames.slice(at + 1)].flatMap(deltasOf).join("")}`;
    };
    /** Everything the session holds as data (its latest snapshot and every frame after it), for markers outside text. */
    const shownData = () => JSON.stringify([frames[latest()]!.payload, ...frames.slice(latest() + 1)]);
    const count = (marker: string) => shownText().split(marker).length - 1;
    const countData = (marker: string) => shownData().split(marker).length - 1;
    const ack = async (key: "message_id" | "command_id", id: string) => {
      let found: Rec | undefined;
      await until(() => Boolean(found = frames.find((frame) => frame.type === "AGENT_COMMAND_ACK" && frame.payload[key] === id)?.payload), `ack ${id}`, 30_000);
      return found!;
    };
    const send = (content: string) => { const id = randomUUID(); socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content, message_id: id, dedupe_key: id } })); return ack("message_id", id); };
    const interrupt = () => { const id = randomUUID(); socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: id } })); return ack("command_id", id); };
    const snapshot = () => frames[latest()]!.payload;
    return { socket, frames, count, countData, send, interrupt, snapshot };
  };
  /** A reply whose text only the agent's output carries (the message names the file, not its text). */
  const replyWith = (name: string, text: string) => {
    const file = path.join(h.workspace, `${name}.txt`);
    fs.writeFileSync(file, text);
    return `REPLY_FILE:${file}`;
  };
  const isActive = async (agentRunId: string) => Boolean((await h.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: agentRunId })).getAgentRunResumeConfig?.isActive);
  const stop = async (agentRunId: string) => {
    const stopped = (await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: agentRunId })).terminateAgentRun as Rec;
    expect(stopped.success, stopped.message).toBe(true);
    await until(async () => !(await isActive(agentRunId)), `${agentRunId} stopped`, 60_000);
  };
  const restore = async (agentRunId: string) => {
    const restored = (await h.graphql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`, { id: agentRunId })).restoreAgentRun as Rec;
    expect(restored.success, restored.message).toBe(true);
  };
  const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
  /** A turn's end on the run's own stream. */
  const turnEnded = (frames: Frame[], from: number) => frames.slice(from).some((frame) => /^TURN_(COMPLETED|INTERRUPTED|FAILED)$/.test(frame.type) || frame.type === "ERROR");

  it("OST-1 / OST-2: a delegated run opened from its tree row, reconnected, stopped, restored and interrupted shows each turn once", async () => {
    const out: Rec = {};
    evidence["OST-1"] = out;
    const root = await h.startRoot("agent", ids);
    const M = root.managerRunId;
    await root.sendTo(M, "Hello.");
    await until(async () => { try { await h.promptOf(M); return true; } catch { return false; } }, "Manager started", 60_000);
    const delegated = JSON.parse((await h.mcpCall(M, "delegate_task", { recipient_address: `/${segment(names.worker)}`,
      description: "Own stream work. Marker OST-PACKET." })).text) as Rec;
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    const child = delegated.target_agent_run_id as string;

    // The row in the Manager's tree, and the target it opens (SR-083, SR-084).
    let row: Rec | undefined;
    await until(async () => Boolean(row = (await readRunTree(h.graphql, "agent", root.rootId)).rows.find((entry) => entry.openTarget?.agentRunId === child)),
      "the delegated run's row in the Manager's tree", 30_000);
    out.row = row;
    expect(row, JSON.stringify(row)).toMatchObject({ kind: "agent", openTarget: { runKind: "agent", runId: child, agentRunId: child } });
    const target = row!.openTarget.agentRunId as string;

    // Opened from its row: the packet once; a live answer once.
    const own = await openOwn(target);
    await until(() => own.count("OST-PACKET") > 0, "the packet in the snapshot (or its live turn)", 30_000);
    expect(own.count("OST-PACKET"), "the packet once").toBe(1);
    expect((await own.send(replyWith("ost-live", "OST-LIVE-ANSWER"))).accepted, "the message's ack").toBe(true);
    await until(() => own.count("OST-LIVE-ANSWER") > 0, "the live answer", 30_000);
    await settle(2_000);
    out.live = own.count("OST-LIVE-ANSWER");
    expect(out.live, "the live answer once").toBe(1);
    // A reconnect: its snapshot holds the answer once (stored or turn frames, never both).
    const again = await openOwn(target);
    out.reconnect = again.count("OST-LIVE-ANSWER");
    expect(out.reconnect, "once in a reconnect's snapshot").toBe(1);
    again.socket.close();

    // OST-2: an interrupted turn: a held tool step, then INTERRUPT_GENERATION on the run's own stream.
    const before = own.frames.length;
    expect((await own.send("HOLD_TURN Marker OST-HOLD")).accepted).toBe(true);
    await until(() => own.frames.slice(before).some((frame) => JSON.stringify(frame).includes("sleep 600 # HOLD_TURN")), "the held tool step live", 30_000);
    out.interrupted = await own.interrupt();
    expect(out.interrupted, JSON.stringify(out.interrupted)).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    await until(() => turnEnded(own.frames, before), "the interrupted turn ended", 30_000).catch(() => undefined);
    out.interruptEnd = own.frames.slice(before).filter((frame) => /^TURN_/.test(frame.type)).map((frame) => frame.type);
    await settle(2_000);
    const afterInterrupt = await openOwn(target);
    out.interruptedLive = { holdData: afterInterrupt.countData("sleep 600 # HOLD_TURN"), holdText: afterInterrupt.count("OST-HOLD"),
      turnFrames: ((afterInterrupt.snapshot().turn_frames ?? []) as Rec[]).length };
    afterInterrupt.socket.close();
    // A turn after the interrupt, so the interrupted one is an earlier turn of the run.
    expect((await own.send(replyWith("ost-after", "OST-AFTER-INTERRUPT"))).accepted).toBe(true);
    await until(() => own.count("OST-AFTER-INTERRUPT") > 0, "the turn after the interrupt", 30_000);
    await settle(2_000);
    const afterNext = await openOwn(target);
    out.interruptedEarlier = { holdData: afterNext.countData("sleep 600 # HOLD_TURN"), holdText: afterNext.count("OST-HOLD"), after: afterNext.count("OST-AFTER-INTERRUPT") };
    afterNext.socket.close();
    own.socket.close();

    // Its own Stop: the stopped run's snapshot is its full stored read, each turn once.
    await stop(child);
    const stopped = await openOwn(target);
    out.stopped = { packet: stopped.count("OST-PACKET"), live: stopped.count("OST-LIVE-ANSWER"), holdData: stopped.countData("sleep 600 # HOLD_TURN"),
      holdText: stopped.count("OST-HOLD"), after: stopped.count("OST-AFTER-INTERRUPT"), turnFrames: ((stopped.snapshot().turn_frames ?? []) as Rec[]).length };
    stopped.socket.close();
    expect(out.stopped.turnFrames, "a stopped run's snapshot has no live part").toBe(0);
    expect(out.stopped, JSON.stringify(out.stopped)).toMatchObject({ packet: 1, live: 1, holdText: 1, after: 1 });
    expect(out.stopped.holdData, "the interrupted tool step is stored").toBeGreaterThan(0);
    // The interrupted turn reads the same live (reconnects after the interrupt and after a later turn) as in the full stored read.
    expect(out.interruptedLive, JSON.stringify(out.interruptedLive)).toMatchObject({ holdData: out.stopped.holdData, holdText: 1 });
    expect(out.interruptedEarlier, JSON.stringify(out.interruptedEarlier)).toMatchObject({ holdData: out.stopped.holdData, holdText: 1, after: 1 });

    // A restore: the live snapshot keeps the earlier conversation once; a new answer shows once.
    await restore(child);
    const restored = await openOwn(target);
    out.restored = { packet: restored.count("OST-PACKET"), live: restored.count("OST-LIVE-ANSWER"), holdData: restored.countData("sleep 600 # HOLD_TURN") };
    expect(out.restored, JSON.stringify(out.restored)).toMatchObject({ packet: 1, live: 1, holdData: out.stopped.holdData });
    expect((await restored.send(replyWith("ost-restored", "OST-RESTORED-ANSWER"))).accepted).toBe(true);
    await until(() => restored.count("OST-RESTORED-ANSWER") > 0, "the restored run's live answer", 60_000);
    await settle(2_000);
    out.restoredLive = restored.count("OST-RESTORED-ANSWER");
    expect(out.restoredLive, "the restored run's answer once").toBe(1);
    restored.socket.close();
    await stop(child);
    await h.terminate("agent", root.rootId);
  }, 420_000);

  it("OST-3: an error-ended turn reads the same live, in a reconnect's snapshot and in the stopped run's full stored read", async () => {
    const out: Rec = {};
    evidence["OST-3"] = out;
    // The scripted CLI's `runtime_error` case, for this run's CLI only (read when its CLI starts).
    const prior = process.env["AGY_FAKE_CASE"];
    process.env["AGY_FAKE_CASE"] = "runtime_error";
    let runId = "";
    try {
      const created = (await h.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.worker, ...h.config() } })).createAgentRun as Rec;
      expect(created.success, created.message).toBe(true);
      runId = created.runId as string;
      const own = await openOwn(runId);
      const from = own.frames.length;
      expect((await own.send("Report runtime case: quota")).accepted).toBe(true);
      await until(() => own.frames.slice(from).some((frame) => JSON.stringify(frame).includes("Individual quota reached")), "the turn's error live", 60_000);
      await settle(2_000);
      out.live = { partial: own.count("PARTIAL_WORK_PRESERVED"), tool: own.countData("COMPLETED_WORK_PRESERVED") > 0,
        errorTypes: [...new Set(own.frames.slice(from).filter((frame) => JSON.stringify(frame).includes("Individual quota reached")).map((frame) => frame.type))] };
      expect(out.live.partial, "the partial work once, live").toBe(1);
      const again = await openOwn(runId);
      out.reconnect = { partial: again.count("PARTIAL_WORK_PRESERVED"), tool: again.countData("COMPLETED_WORK_PRESERVED"), error: again.countData("Individual quota reached"),
        turnFrames: ((again.snapshot().turn_frames ?? []) as Rec[]).length };
      again.socket.close();
      own.socket.close();
    } finally {
      if (prior === undefined) delete process.env["AGY_FAKE_CASE"]; else process.env["AGY_FAKE_CASE"] = prior;
    }
    await stop(runId);
    const stopped = await openOwn(runId);
    out.stopped = { partial: stopped.count("PARTIAL_WORK_PRESERVED"), tool: stopped.countData("COMPLETED_WORK_PRESERVED"), error: stopped.countData("Individual quota reached") };
    stopped.socket.close();
    expect(out.stopped.partial, "the partial work once in the stored read").toBe(1);
    expect(out.reconnect, JSON.stringify({ reconnect: out.reconnect, stopped: out.stopped })).toMatchObject({ partial: 1, tool: out.stopped.tool, error: out.stopped.error });
  }, 300_000);
});
