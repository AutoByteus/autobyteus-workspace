import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// autobyteus-540 measurement (Solution Designer, scratch): how long `/ws/agent/:runId` takes from socket open to the node's
// CONNECTED, and how often a SEND_MESSAGE sent when the socket opens, or at the app's poll offsets (0-50 ms after open,
// `agentRunStore.ensureAgentStreamConnected`), is refused SESSION_NOT_READY. Real Studio server, scripted AGY CLI.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs SEND_REPRO_EVIDENCE=<file.json> \
//   pnpm exec vitest run tests/e2e/agent-run/send-on-unbound-stream-repro.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "send-repro-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("autobyteus-540: the agent stream's not-ready window (scripted AGY)", () => {
  let h: CollaborationHarness;
  const evidence: Rec = {};
  beforeAll(async () => { h = await startCollaborationHarness("send-repro"); }, 180_000);
  afterAll(async () => {
    const file = process.env["SEND_REPRO_EVIDENCE"];
    if (file) fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
    if (h) await h.close();
    if (home) { if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome; fs.rmSync(home, { recursive: true, force: true }); }
  }, 180_000);

  /** One socket: open → CONNECTED time; a SEND_MESSAGE `offsetMs` after open (null: none); its answer. */
  const probe = async (runId: string, offsetMs: number | null, content = "probe") => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/agent/${runId}`);
    const frames: Array<{ type: string; payload: Rec; at: number }> = [];
    let openedAt = 0;
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    const id = randomUUID();
    await new Promise<void>((resolve, reject) => { socket.once("open", () => { openedAt = Date.now(); resolve(); }); socket.once("error", reject); });
    if (offsetMs !== null) {
      if (offsetMs > 0) await settle(offsetMs);
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content, message_id: id, dedupe_key: id, context_file_paths: [], image_urls: [] } }));
    }
    await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 20_000);
    const answered = () => frames.find((f) => (f.type === "ERROR" && f.payload?.code === "SESSION_NOT_READY")
      || (f.type === "AGENT_COMMAND_ACK" && f.payload?.message_id === id));
    if (offsetMs !== null) await until(() => Boolean(answered()), "answer", 20_000);
    const connected = frames.find((f) => f.type === "CONNECTED")!;
    const answer = offsetMs === null ? null : answered()!;
    socket.close();
    await settle(150);
    return { connectedMs: connected.at - openedAt,
      answer: answer === null ? null : answer.type === "ERROR" ? "SESSION_NOT_READY" : `ACK:${answer.payload.state}` };
  };

  const measure = async (label: string, runId: string, rounds: number) => {
    const out: Rec = { connectedMs: [], sendOnOpen: {}, sendAtPollOffset: {} };
    for (let i = 0; i < rounds; i += 1) out.connectedMs.push((await probe(runId, null)).connectedMs);
    for (let i = 0; i < rounds; i += 1) {
      const r = await probe(runId, 0, "NOOP");
      out.sendOnOpen[r.answer!] = (out.sendOnOpen[r.answer!] ?? 0) + 1;
    }
    for (let i = 0; i < rounds; i += 1) {
      const offset = Math.floor(Math.random() * 50);
      const r = await probe(runId, offset, "NOOP");
      out.sendAtPollOffset[r.answer!] = (out.sendAtPollOffset[r.answer!] ?? 0) + 1;
    }
    const sorted = [...out.connectedMs].sort((a: number, b: number) => a - b);
    out.connectedMsSummary = { min: sorted[0], median: sorted[Math.floor(sorted.length / 2)], p90: sorted[Math.floor(sorted.length * 0.9)], max: sorted.at(-1) };
    delete out.connectedMs;
    evidence[label] = out;
  };

  it("measures idle, offline and never-started agent runs", async () => {
    const definitionId = await h.agentDefinition(`Sender ${randomUUID().slice(0, 6)}`);
    const create = async () => {
      const created = (await h.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: definitionId, ...h.config() } })).createAgentRun;
      return created.runId as string;
    };
    const never = await create();
    await measure("neverStartedRun", never, 20);
    const live = await create();
    const s = new WebSocket(`ws://${new URL(h.url).host}/ws/agent/${live}`);
    const frames: Rec[] = [];
    s.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve) => s.once("open", () => resolve()));
    await until(() => frames.some((f) => f.type === "CONNECTED"), "CONNECTED", 20_000);
    const id = randomUUID();
    s.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content: "hello", message_id: id, dedupe_key: id, context_file_paths: [], image_urls: [] } }));
    await until(() => frames.some((f) => f.type === "AGENT_STATUS" && f.payload?.status === "idle"), "idle", 60_000);
    await measure("liveIdleRun", live, 20);
    s.close();
    // A stopped (offline) run: open → CONNECTED reads its stored projection; a send on open restores it.
    const stopped: Rec = { connectedMs: [], sendOnOpenAfterStop: {} };
    const stop = async () => {
      const r = (await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: live })).terminateAgentRun;
      if (!r.success) throw new Error(r.message);
      await until(async () => !(await h.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: live })).getAgentRunResumeConfig?.isActive, "stopped", 60_000);
    };
    await stop();
    for (let i = 0; i < 20; i += 1) stopped.connectedMs.push((await probe(live, null)).connectedMs);
    for (let i = 0; i < 8; i += 1) {
      await stop().catch(() => undefined);
      const r = await probe(live, 0, "NOOP");
      stopped.sendOnOpenAfterStop[r.answer!] = (stopped.sendOnOpenAfterStop[r.answer!] ?? 0) + 1;
      await settle(1500);
    }
    stopped.afterStopAtPollOffset = [];
    for (let i = 0; i < 16; i += 1) {
      await stop().catch(() => undefined);
      const offset = Math.floor(Math.random() * 50);
      const r = await probe(live, offset, "NOOP");
      stopped.afterStopAtPollOffset.push({ offset, connectedMs: r.connectedMs, answer: r.answer });
      await settle(1500);
    }
    stopped.connectedMs.sort((x: number, y: number) => x - y);
    stopped.connectedMsSummary = { min: stopped.connectedMs[0], median: stopped.connectedMs[10], max: stopped.connectedMs.at(-1) };
    delete stopped.connectedMs;
    evidence.stoppedRun = stopped;
  }, 600_000);
});
