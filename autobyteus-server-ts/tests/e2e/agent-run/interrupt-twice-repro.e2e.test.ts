import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// autobyteus-533 reproduction (Solution Designer): a Stop sent twice, and a Stop sent to a run with no turn.
// It FAILS on the base (bd2053ee51): the second Stop and a Stop to an idle run are answered `failed NO_ACTIVE_TURN` /
// `rejected RUN_NOT_FOUND`. REQ-001/REQ-002 make every one of them `accepted` (nothing to stop is not a failure).
// Implementation turns this into the durable e2e (or replaces it) and removes the evidence-only parts.
// Records every INTERRUPT_GENERATION ack with the arrival time of the turn's end and of the idle status, for a
// standalone agent run (/ws/agent/:id) and a Team member (/ws/agent-team/:id), through the real server and the
// scripted AGY CLI (HOLD_TURN keeps a turn running until it is stopped).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs INTERRUPT_REPRO_EVIDENCE=<file.json> \
//   pnpm exec vitest run tests/e2e/agent-run/interrupt-twice-repro.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "interrupt-repro-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
type TFrame = { type: string; payload: Rec; at: number };
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

suite("autobyteus-533: Stop twice, Stop with no turn (scripted AGY)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const sockets: WebSocket[] = [];
  const evidence: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("interrupt-repro");
    const suffix = randomUUID().slice(0, 6);
    ids.manager = await h.agentDefinition(`Stop manager ${suffix}`);
    ids.mate = await h.agentDefinition(`Stop mate ${suffix}`);
    ids.team = await h.teamDefinition(`Stop team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
  }, 180_000);

  afterAll(async () => {
    const file = process.env["INTERRUPT_REPRO_EVIDENCE"];
    if (file) fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  const open = async (route: string, id: string, ready: (frames: TFrame[]) => boolean) => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: TFrame[] = [];
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => ready(frames), `${route} ready`, 60_000);
    return { socket, frames };
  };

  /** One round: hold a turn, then send Stop at each offset (ms after the first); report acks and turn-end timing. */
  const round = async (s: { socket: WebSocket; frames: TFrame[] }, opts: {
    send: (content: string) => void; interruptPayload: () => Rec; isIdle: (f: TFrame) => boolean; isRunning: (f: TFrame) => boolean;
  }, offsets: number[], hold = true) => {
    const from = s.frames.length;
    if (hold) {
      opts.send("HOLD_TURN marker");
      await until(() => s.frames.slice(from).some((f) => JSON.stringify(f).includes("sleep 600 # HOLD_TURN")), "held step", 60_000);
      await until(() => s.frames.slice(from).some(opts.isRunning), "running status", 30_000);
    }
    const start = Date.now();
    const sent: Array<{ id: string; at: number }> = [];
    for (const offset of offsets) {
      const wait = start + offset - Date.now();
      if (wait > 0) await settle(wait);
      const payload = opts.interruptPayload();
      s.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload }));
      sent.push({ id: payload.command_id as string, at: Date.now() - start });
    }
    await until(() => sent.every((c) => s.frames.some((f) => f.type === "AGENT_COMMAND_ACK" && f.payload.command_id === c.id)), "acks", 30_000);
    await settle(500);
    const after = s.frames.slice(from).filter((f) => f.at >= start);
    const firstOf = (pred: (f: TFrame) => boolean) => { const f = after.find(pred); return f ? f.at - start : null; };
    return {
      acks: sent.map((c) => {
        const ack = s.frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload.command_id === c.id)!;
        return { sentAtMs: c.at, ackAtMs: ack.at - start, state: ack.payload.state, code: ack.payload.code ?? null, message: ack.payload.message ?? null };
      }),
      turnEndAtMs: firstOf((f) => /^TURN_(INTERRUPTED|COMPLETED)$/.test(f.type) || /TURN_(INTERRUPTED|COMPLETED)/.test(String(f.payload?.event_type ?? ""))),
      idleStatusAtMs: firstOf(opts.isIdle),
      order: after.filter((f) => f.type !== "SEGMENT_CONTENT").slice(0, 14).map((f) => `${f.at - start}ms ${f.type}${f.type === "AGENT_COMMAND_ACK" ? `:${f.payload.state}` : ""}${/STATUS/.test(f.type) ? `:${JSON.stringify(f.payload.status ?? f.payload.new_status ?? f.payload)}`.slice(0, 80) : ""}`),
    };
  };

  it("standalone agent run", async () => {
    const out: Rec = {};
    evidence.standalone = out;
    const created = (await h.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...h.config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    const s = await open("agent", runId, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const status = (f: TFrame) => f.type === "AGENT_STATUS" ? String(f.payload.status ?? f.payload.new_status) : "";
    const opts = {
      send: (content: string) => { const id = randomUUID(); s.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content, message_id: id, dedupe_key: id } })); },
      interruptPayload: () => ({ command_id: randomUUID() }),
      isIdle: (f: TFrame) => ["idle", "error", "offline"].includes(status(f)),
      isRunning: (f: TFrame) => status(f) === "running",
    };
    out.idleRunNoTurn = await round(s, opts, [0], false);
    for (const gap of [0, 5, 20, 50, 100, 250, 600]) {
      out[`gap${gap}`] = await round(s, opts, [0, gap]);
      await settle(300);
    }
    const states = Object.entries(out).flatMap(([key, r]) => (r as Rec).acks.map((a: Rec) => `${key}:${a.state}:${a.code ?? ""}`));
    expect(states.filter((state) => !state.includes(":accepted:")), "every Stop is accepted (AC-001, AC-002, AC-003)").toEqual([]);
  }, 600_000);

  it("Team member", async () => {
    const out: Rec = {};
    evidence.teamMember = out;
    const root = await h.startRoot("team", ids);
    const member = root.managerRunId;
    const s = await open("agent-team", root.rootId, (frames) => frames.some((f) => f.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const memberStatus = (f: TFrame) => JSON.stringify(f.payload).includes(member) && /STATUS/.test(f.type)
      ? String(f.payload.status ?? f.payload.payload?.status ?? f.payload.new_status ?? "") : "";
    const opts = {
      send: (content: string) => { void root.sendTo(member, content); },
      interruptPayload: () => ({ command_id: randomUUID(), agent_run_id: member }),
      isIdle: (f: TFrame) => ["idle", "error", "offline"].includes(memberStatus(f)),
      isRunning: (f: TFrame) => memberStatus(f) === "running",
    };
    out.statusFrameSample = s.frames.filter((f) => /STATUS/.test(f.type)).slice(0, 3);
    out.idleMemberNoTurn = await round(s, opts, [0], false);
    for (const gap of [0, 20, 100]) {
      out[`gap${gap}`] = await round(s, opts, [0, gap]).catch((error) => ({ error: String(error), types: [...new Set(s.frames.map((f) => f.type))] }));
      await settle(300);
    }
    const states = Object.entries(out).filter(([key]) => key !== "statusFrameSample")
      .flatMap(([key, r]) => ((r as Rec).acks ?? [{ state: "error" }]).map((a: Rec) => `${key}:${a.state}:${a.code ?? ""}`));
    expect(states.filter((state) => !state.includes(":accepted:")), "every Stop to a Team member is accepted (AC-004)").toEqual([]);
  }, 600_000);
});
