import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";

// autobyteus-461 C35-04 (a measurement, so it is gated): what activating a run with a large stored conversation costs. Since
// SR-087/SR-089 a run's `AgentStreamSequence` reads the run's stored conversation when the run becomes active (its predating
// set), linear in the conversation's size (the implementer measured about 7.5 ms per MB). This records, for a small and a
// large standalone agent run (several MB of stored conversation, written by real turns of the scripted AGY CLI), each
// sample's:
//   - restoreMs: the restore of the stopped run (`restoreAgentRun`), which activates it;
//   - openMs: opening its own stream (`/ws/agent/<id>`) until its first frame that carries the conversation (the snapshot;
//     a build without one: CONNECTED), and that frame's size;
//   - projectionMs: the run's stored conversation read (`getRunProjection`), as a build without the snapshot loads it;
//   - firstTurnMs: a message to the restored run until its turn completes;
//   The several MB are the user's own messages (each CHUNK_MB), which the run stores as sent.
//   - stoppedOpenMs: opening the stopped run's stream (the full stored read, no live part).
// It uses only the API both this branch and its base have, so the same file measures the base build.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 RUN_LARGE_RUN_ACTIVATION_TIMING=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs [LARGE_RUN_MB=35] [LARGE_RUN_SAMPLES=3] \
//   [LARGE_RUN_ACTIVATION_EVIDENCE=<file.json>] pnpm exec vitest run tests/e2e/run-history/large-run-activation-timing.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1" || process.env["RUN_LARGE_RUN_ACTIVATION_TIMING"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "large-activation-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && process.env.RUN_LARGE_RUN_ACTIVATION_TIMING === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const TARGET_MB = Number(process.env["LARGE_RUN_MB"] ?? "35");
const SAMPLES = Number(process.env["LARGE_RUN_SAMPLES"] ?? "3");
const CHUNK_MB = 4;
type Frame = { type: string; payload: Rec; at: number; bytes: number };

suite("C35-04: activating a run with a large stored conversation (measurement; scripted AGY)", () => {
  let h: CollaborationHarness;
  const evidence: Rec = { targetMb: TARGET_MB, samples: SAMPLES, runs: {} };
  const sockets: WebSocket[] = [];

  beforeAll(async () => { h = await startCollaborationHarness("large-activation"); }, 180_000);
  afterAll(async () => {
    const file = process.env["LARGE_RUN_ACTIVATION_EVIDENCE"];
    if (file) fs.writeFileSync(file, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** The run's own stream, with each frame's arrival time and size. */
  const openStream = async (runId: string) => {
    const started = performance.now();
    const socket = new WebSocket(`ws://${h.url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => { const text = String(raw); frames.push({ ...JSON.parse(text), at: performance.now(), bytes: text.length }); });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    // The frame that carries the conversation: the snapshot where the build has one, else the connection's first answer.
    const opening = () => frames.find((frame) => frame.type === "AGENT_STREAM_SNAPSHOT") ?? null;
    await until(() => Boolean(opening()) || (frames.some((frame) => frame.type === "CONNECTED") && performance.now() - started > 3_000)
      || frames.some((frame) => frame.type === "AGENT_STREAM_SNAPSHOT"), `${runId}'s stream opened`, 120_000);
    const first = opening() ?? frames.find((frame) => frame.type === "CONNECTED")!;
    return { socket, frames, openMs: Math.round(first.at - started), openFrame: first.type, openBytes: first.bytes };
  };
  const turn = async (stream: { socket: WebSocket; frames: Frame[] }, runId: string, content: string) => {
    const before = stream.frames.filter((frame) => frame.type === "TURN_COMPLETED").length;
    const started = performance.now();
    sendE2eSendMessageCommand(stream.socket, { agent_run_id: runId, content });
    await until(() => stream.frames.filter((frame) => frame.type === "TURN_COMPLETED").length > before, `${runId}'s turn completed`, 180_000);
    return Math.round(performance.now() - started);
  };
  const isActive = async (runId: string) => Boolean((await h.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig?.isActive);
  const stop = async (runId: string) => {
    await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId });
    await until(async () => !(await isActive(runId)), `${runId} stopped`, 60_000);
  };
  /** The bytes of the run's own memory folder (its stored conversation and traces). */
  const storedBytes = async (runId: string) => {
    const find = (dir: string): string | null => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (!entry.isDirectory()) continue;
        const full = path.join(dir, entry.name);
        if (entry.name === runId) return full;
        const inner = find(full);
        if (inner) return inner;
      }
      return null;
    };
    const dir = find(path.join(h.dataDir, "memory"));
    const size = (target: string): number => fs.readdirSync(target, { withFileTypes: true })
      .reduce((sum, entry) => sum + (entry.isDirectory() ? size(path.join(target, entry.name)) : fs.statSync(path.join(target, entry.name)).size), 0);
    return dir ? size(dir) : 0;
  };

  it("records restore, stream-open and first-turn times for a small and a several-MB run", async () => {
    const definition = await h.agentDefinition("Large activation agent");
    const create = async () => {
      const created = (await h.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: definition, ...h.config() } })).createAgentRun as Rec;
      expect(created.success, created.message).toBe(true);
      return created.runId as string;
    };
    // A user message of CHUNK_MB of text: the stored conversation holds each message as sent.
    const line = `${"Large stored conversation line for the activation measurement. ".repeat(3)}\n`;
    const chunk = line.repeat(Math.ceil((CHUNK_MB * 1024 * 1024) / line.length));

    for (const [label, replies] of [["small", 1], ["large", Math.ceil(TARGET_MB / CHUNK_MB)]] as const) {
      const runId = await create();
      const seeding = await openStream(runId);
      const seedTurns: number[] = [];
      if (label === "small") seedTurns.push(await turn(seeding, runId, "Hello. Marker SMALL-SEED."));
      else for (let index = 0; index < replies; index += 1) seedTurns.push(await turn(seeding, runId, `Part ${index + 1}.\n${chunk}`));
      seeding.socket.close();
      await stop(runId);
      const record: Rec = { runId, storedMb: Number(((await storedBytes(runId)) / 1024 / 1024).toFixed(2)), seedTurns, samples: [] };
      evidence.runs[label] = record;
      for (let sample = 0; sample < SAMPLES; sample += 1) {
        const stoppedOpen = await openStream(runId);
        stoppedOpen.socket.close();
        const restoreStarted = performance.now();
        const restored = (await h.graphql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`, { id: runId })).restoreAgentRun as Rec;
        const restoreMs = Math.round(performance.now() - restoreStarted);
        expect(restored.success, restored.message).toBe(true);
        const live = await openStream(runId);
        // The stored read the window makes where its build has no snapshot (both builds serve it).
        const projectionStarted = performance.now();
        await h.graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId });
        const projectionMs = Math.round(performance.now() - projectionStarted);
        const firstTurnMs = await turn(live, runId, `Sample ${sample + 1}. Marker ACTIVATION-${sample + 1}.`);
        live.socket.close();
        record.samples.push({ restoreMs, openMs: live.openMs, openFrame: live.openFrame, openMb: Number((live.openBytes / 1024 / 1024).toFixed(2)), projectionMs, firstTurnMs,
          stoppedOpenMs: stoppedOpen.openMs, stoppedOpenFrame: stoppedOpen.openFrame, stoppedOpenMb: Number((stoppedOpen.openBytes / 1024 / 1024).toFixed(2)) });
        await stop(runId);
      }
      const median = (key: string) => [...(record.samples as Rec[]).map((entry) => entry[key] as number)].sort((a, b) => a - b)[Math.floor(SAMPLES / 2)];
      record.median = { restoreMs: median("restoreMs"), openMs: median("openMs"), projectionMs: median("projectionMs"), firstTurnMs: median("firstTurnMs"), stoppedOpenMs: median("stoppedOpenMs") };
      console.log(`[large-activation] ${label}: ${record.storedMb} MB stored; median ${JSON.stringify(record.median)}`);
    }
    expect((evidence.runs.large as Rec).storedMb, "the large run holds several MB").toBeGreaterThan(TARGET_MB / 2);
  }, 1_800_000);
});
