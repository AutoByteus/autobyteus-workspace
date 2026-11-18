import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Frame, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// autobyteus-461 O-8b (held in CRR-033): what a run's own view is told about its background step when the run is stopped
// mid-step, for a delegated copy stopped by its Task's DONE against a run the user started and stopped (base's behavior).
// Through the real Studio HTTP/WebSocket/GraphQL server, the agents' scoped MCP tools and the AGY backend with its background
// monitor; only the external AGY CLI is scripted (`BACKGROUND_STEP:{"seconds":N}` leaves a daemon step open at turn end).
// - BSV-U: a user-started agent run, its own stream open, runs a 900 s step; the user stops it.
// - BSV-D: a delegated copy, its own stream open (rule 2), runs the same step; the Manager closes its Task (DONE), which stops it.
// For each: the background updates its own stream carries after the stop, and `agentBackgroundTaskView` after it. The copy's
// own view must be told no less than the user-started run's (parity), and its step must not stay `running` where the
// user-started run's does not. Evidence: BSV_E2E_EVIDENCE.
// Run: env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs
//   pnpm exec vitest run tests/e2e/projects/background-step-stop-own-view.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "bsv-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const STEP = `BACKGROUND_STEP:${JSON.stringify({ seconds: 900, exitCode: 0 })}`;
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;

suite("A run's own view of its background step after a stop mid-step: delegated copy (Task DONE) against a user-started run (O-8b)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  const evidence: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("bsv-e2e");
    const suffix = randomUUID().slice(0, 6);
    names.worker = `BSV worker ${suffix}`;
    ids.manager = await h.agentDefinition(`BSV manager ${suffix}`, { toolNames: ["update_task"] });
    ids.worker = await h.agentDefinition(names.worker);
  }, 180_000);

  afterAll(async () => {
    const out = process.env["BSV_E2E_EVIDENCE"];
    if (out) fs.writeFileSync(out, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  const ownStream = async (agentRunId: string) => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/agent/${agentRunId}`); sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === "CONNECTED"), `own stream of ${agentRunId}`, 30_000);
    return { socket, frames };
  };
  const background = (frames: Frame[], from = 0) => frames.slice(from).filter((f) => f.type === "BACKGROUND_TASK_UPDATED")
    .map((f) => ({ status: f.payload?.status, taskId: f.payload?.task_id }));
  const taskView = async (agentRunId: string) => (await h.graphql(`query($id:String!){agentBackgroundTaskView(agentRunId:$id){__typename
    ... on AgentBackgroundTaskSnapshot{rows: tasks{taskId status}} ... on AgentBackgroundTaskEventStream{known: tasks{taskId status}}
    ... on AgentBackgroundTaskUnavailable{reason} ... on AgentBackgroundTaskUnsupported{reason}}}`, { id: agentRunId })).agentBackgroundTaskView as Rec;
  const running = (frames: Frame[]) => background(frames).some((entry) => entry.status === "running");
  const settle = () => new Promise((resolve) => setTimeout(resolve, 10_000));

  it("BSV the copy's own view after Task DONE is told no less than a user-started run's after its Stop", async () => {
    // BSV-U: a run the user started; its own stream open before the step starts.
    const user = await h.startRoot("agent", { ...ids, manager: ids.worker });
    const userRun = user.managerRunId;
    const userStream = await ownStream(userRun);
    await user.sendTo(userRun, `Start the export. ${STEP}`);
    await until(async () => running(userStream.frames) || ((await taskView(userRun)).rows ?? (await taskView(userRun)).known ?? []).some((t: Rec) => t.status === "running"),
      "BSV-U: the step runs", 120_000);
    const userFrom = userStream.frames.length;
    await h.terminate("agent", user.rootId);
    await settle();
    const userAfter = { runningFrameSeen: running(userStream.frames), backgroundAfterStop: background(userStream.frames, userFrom),
      typesAfterStop: [...new Set(userStream.frames.slice(userFrom).map((f) => f.type))], taskView: await taskView(userRun) };
    evidence.userStarted = userAfter;
    user.close();

    // BSV-D: a delegated copy; its own stream open at once after `delegate_task` answers (FOLLOW-E), before its step starts.
    const root = await h.startRoot("agent", ids);
    const M = root.managerRunId;
    await root.sendTo(M, "Hello.");
    await until(async () => { try { await h.promptOf(M); return true; } catch { return false; } }, "BSV-D: Manager started", 60_000);
    const delegated = await h.mcpCall(M, "delegate_task", { recipient_address: `/${segment(names.worker)}`, description: `Run the export. ${STEP}` });
    const body = JSON.parse(delegated.text) as Rec;
    expect(body, delegated.text).toMatchObject({ delegated: true, target_kind: "agent" });
    const copy = body.target_agent_run_id as string;
    const taskId = AD_HOC_ID.exec(delegated.text)?.[0] as string;
    expect(taskId, delegated.text).toBeTruthy();
    const copyStream = await ownStream(copy);
    await until(async () => running(copyStream.frames) || ((await taskView(copy)).rows ?? (await taskView(copy)).known ?? []).some((t: Rec) => t.status === "running"),
      "BSV-D: the copy's step runs", 120_000);
    const copyFrom = copyStream.frames.length;
    const done = await h.mcpCall(M, "update_task", { task_id: taskId, status: "DONE" });
    expect(done.isError, done.text).toBe(false);
    await until(async () => !(await h.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: copy })).getAgentRunResumeConfig?.isActive,
      "BSV-D: DONE stops the copy", 60_000);
    await settle();
    const copyAfter = { runningFrameSeen: running(copyStream.frames), backgroundAfterStop: background(copyStream.frames, copyFrom),
      typesAfterStop: [...new Set(copyStream.frames.slice(copyFrom).map((f) => f.type))], taskView: await taskView(copy) };
    evidence.delegatedCopy = copyAfter;
    root.close();

    // Parity with base's user-started run: the copy's own view is told its step ended whenever the user-started run's is, and
    // its task view answers as the user-started run's does.
    const endedFor = (after: typeof userAfter) => after.backgroundAfterStop.some((entry) => entry.status && entry.status !== "running");
    expect({ endedOnStream: endedFor(copyAfter), taskView: copyAfter.taskView.__typename + ":" + (copyAfter.taskView.reason ?? "") },
      `the copy's own view against the user-started run's: ${JSON.stringify(evidence)}`)
      .toEqual({ endedOnStream: endedFor(userAfter), taskView: userAfter.taskView.__typename + ":" + (userAfter.taskView.reason ?? "") });
  }, 600_000);
});
