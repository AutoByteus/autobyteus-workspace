import { randomUUID } from "node:crypto";
import fs from "node:fs";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// A user's Stop (INTERRUPT_GENERATION) is harmless to repeat (autobyteus-533 REQ-001, REQ-002, AC-001…AC-004): through
// the real server and the scripted AGY CLI (HOLD_TURN keeps a turn running until it is stopped), on a standalone agent
// run (/ws/agent/:id) and a Team member (/ws/agent-team/:id), every Stop is answered `accepted`:
//   - a Stop to an idle run (no turn);
//   - two Stops sent together (they join; the turn ends once);
//   - a second Stop after the first ended the turn. AGY takes its run offline after a Stop, so for the standalone run
//     the second Stop reaches a run that is no longer active; for the Team member it finds no active turn.
// Gate and command (in autobyteus-server-ts):
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//     ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs \
//     pnpm exec vitest run tests/e2e/agent-run/stop-nothing-to-stop.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "stop-nothing-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
type TFrame = { type: string; payload: Rec };
type StopStream = { socket: WebSocket; frames: TFrame[] };
type StopRoute = { send(content: string): void; interruptPayload(): Rec; isRunning(frame: TFrame): boolean };
const settle = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const isTurnEnd = (frame: TFrame) => /^TURN_(INTERRUPTED|COMPLETED)$/.test(frame.type);

suite("autobyteus-533: a Stop with nothing to stop is accepted (scripted AGY)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const sockets: WebSocket[] = [];

  beforeAll(async () => {
    h = await startCollaborationHarness("stop-nothing-to-stop");
    const suffix = randomUUID().slice(0, 6);
    ids.manager = await h.agentDefinition(`Stop manager ${suffix}`);
    ids.mate = await h.agentDefinition(`Stop mate ${suffix}`);
    ids.team = await h.teamDefinition(`Stop team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  const open = async (route: string, id: string, ready: (frames: TFrame[]) => boolean): Promise<StopStream> => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: TFrame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw)) as TFrame));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => ready(frames), `${route} ready`, 60_000);
    return { socket, frames };
  };

  /** Sends Stop at each offset (ms after the first), after holding a turn when `hold`; returns each ack and the turn ends. */
  const stops = async (s: StopStream, route: StopRoute, offsets: number[], hold: boolean) => {
    const from = s.frames.length;
    if (hold) {
      route.send("HOLD_TURN marker");
      await until(() => s.frames.slice(from).some((f) => JSON.stringify(f).includes("sleep 600 # HOLD_TURN")), "held step", 60_000);
      await until(() => s.frames.slice(from).some(route.isRunning), "running status", 30_000);
    }
    const start = Date.now();
    const sent: string[] = [];
    for (const offset of offsets) {
      const wait = start + offset - Date.now();
      if (wait > 0) await settle(wait);
      const payload = route.interruptPayload();
      s.socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload }));
      sent.push(payload.command_id as string);
    }
    const ackOf = (id: string) => s.frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload.command_id === id);
    await until(() => sent.every(ackOf), "acks", 30_000);
    await settle(300);
    return {
      acks: sent.map((id) => [ackOf(id)!.payload.state, ackOf(id)!.payload.code].filter(Boolean).join(":")),
      turnEnds: s.frames.slice(from).filter(isTurnEnd).length,
    };
  };

  const expectQuietStops = async (s: StopStream, route: StopRoute) => {
    // AC-001: an idle run (no turn).
    expect((await stops(s, route, [0], false)).acks, "idle").toEqual(["accepted"]);
    // AC-002: together (joined), and a second Stop after the first ended the turn (AC-003).
    for (const gap of [0, 50, 250]) {
      const round = await stops(s, route, [0, gap], true);
      expect(round.acks, `gap ${gap} ms`).toEqual(["accepted", "accepted"]);
      expect(round.turnEnds, `gap ${gap} ms: the turn ends once`).toBe(1);
    }
  };

  it("standalone agent run", async () => {
    const created = (await h.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, ...h.config() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const s = await open("agent", created.runId as string, (frames) => frames.some((f) => f.type === "CONNECTED"));
    const status = (f: TFrame) => f.type === "AGENT_STATUS" ? String(f.payload.status ?? f.payload.new_status) : "";
    await expectQuietStops(s, {
      send: (content) => { const id = randomUUID(); s.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content, message_id: id, dedupe_key: id } })); },
      interruptPayload: () => ({ command_id: randomUUID() }),
      isRunning: (f) => status(f) === "running",
    });
  }, 600_000);

  it("Team member", async () => {
    const root = await h.startRoot("team", ids);
    const member = root.managerRunId;
    const s = await open("agent-team", root.rootId, (frames) => frames.some((f) => f.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const memberStatus = (f: TFrame) => JSON.stringify(f.payload).includes(member) && /STATUS/.test(f.type)
      ? String(f.payload.status ?? (f.payload.payload as Rec | undefined)?.status ?? f.payload.new_status ?? "") : "";
    await expectQuietStops(s, {
      send: (content) => { void root.sendTo(member, content); },
      interruptPayload: () => ({ command_id: randomUUID(), agent_run_id: member }),
      isRunning: (f) => memberStatus(f) === "running",
    });
  }, 600_000);
});
