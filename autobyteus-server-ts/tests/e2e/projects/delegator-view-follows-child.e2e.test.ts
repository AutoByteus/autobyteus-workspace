import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Frame, type Rec, type RootKind } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// autobyteus-461 CR-461-067 (REQ-002, AC-007): a delegator's open view follows a local delegated run across its own Stop and its
// restore. Through the real Studio HTTP/WebSocket/GraphQL server, real roots, the agents' scoped MCP tools and the scripted AGY
// backend, for an Agent, a Team and an Org delegator:
// - FOLLOW-A: an agent child is stopped by its own Stop (rule 2): its row in the delegator's open view shows `offline`; the
//   Manager's message restores it (REQ-003): the row shows the restored run's live status.
// - FOLLOW-S (design SR-064): the agent child's own stream, open across its Stop and never reconnected, carries the restored
//   run's turn after the Manager's message.
// - FOLLOW-E (design SR-064, G-3): a new agent child's own stream opened at once after `delegate_task` answers, while the run
//   is still starting, carries its next turn.
// - FOLLOW-T: a team child, one of whose members failed to start (`error`), the same: the coordinator's row `offline` at the
//   Stop, then the restored coordinator's live status.
// Run: env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs
//   pnpm exec vitest run tests/e2e/projects/delegator-view-follows-child.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "follow-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const RETIRING_MODEL = "follow-retiring-model";
const LIVE = new Set(["running", "idle", "initializing", "processing", "thinking", "executing_tool"]);

suite("A delegator's open view follows a local delegated run across its Stop and restore (CR-461-067; real HTTP/WS/scoped MCP, scripted AGY)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  const evidence: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("follow-e2e");
    const suffix = randomUUID().slice(0, 6);
    names.manager = `Follow manager ${suffix}`; names.worker = `Follow worker ${suffix}`; names.squad = `Follow squad ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager);
    ids.mate = await h.agentDefinition(`Follow mate ${suffix}`);
    ids.worker = await h.agentDefinition(names.worker);
    ids.lead = await h.agentDefinition(`Follow lead ${suffix}`);
    // A member whose start fails: its own default is a model the scripted CLI offers only while AGY_FAKE_EXTRA_MODELS lists
    // it (usable when the team is delegated), retired before the member's first work (as lazy activation's DTL-003).
    ids.broken = await h.agentDefinition(`Follow broken ${suffix}`,
      { defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: RETIRING_MODEL, llmConfig: null } });
    ids.squad = await h.teamDefinition(names.squad, [["lead", ids.lead], ["broken", ids.broken]], "lead");
    ids.team = await h.teamDefinition(`Follow team ${suffix}`, [["manager", ids.manager], ["mate", ids.mate]], "manager");
    ids.org = await h.orgDefinition(`Follow org ${suffix}`, [{ memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" }], []);
  }, 180_000);

  afterAll(async () => {
    const dir = process.env["FOLLOW_E2E_EVIDENCE"];
    if (dir) fs.writeFileSync(dir, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** The delegator's view stream, open from now on (each kind's own view route). */
  const openView = async (kind: RootKind, rootId: string) => {
    const route = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const snapshot = kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT";
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/${route}/${rootId}`); sockets.push(socket);
    const frames: Array<Frame & { at: number }> = [];
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === snapshot), `${kind} view snapshot`, 30_000);
    return { socket, frames };
  };
  /** The statuses the view showed for one agent run (a status frame or a presentation naming it), in arrival order. */
  const statusesOf = (frames: Array<Frame & { at: number }>, agentRunId: string, from = 0) => frames.slice(from).flatMap((frame) => {
    const text = JSON.stringify(frame);
    if (!text.includes(agentRunId) || frame.type.endsWith("SNAPSHOT")) return [];
    const match = /"status":"([a-z_]+)"/.exec(text);
    return match ? [match[1]!] : [];
  });
  const call = async (agentRunId: string, tool: string, args: Rec) => {
    const result = await h.mcpCall(agentRunId, tool, args);
    return { ...result, body: (() => { try { return JSON.parse(result.text) as Rec; } catch { return {} as Rec; } })() };
  };
  const started = (agentRunId: string, label: string) =>
    until(async () => { try { await h.promptOf(agentRunId); return true; } catch { return false; } }, label, 60_000);

  const journey = async (kind: RootKind) => {
    const root = await h.startRoot(kind, ids);
    const M = root.managerRunId;
    // The Manager's first turn starts its runtime (its capsule holds its scoped tool endpoint).
    await root.sendTo(M, "Hello.");
    await started(M, `${kind}: Manager started`);
    const view = await openView(kind, root.rootId);
    const record: Rec = {};
    evidence[kind] = record;

    // FOLLOW-A: an agent child.
    const toWorker = await call(M, "delegate_task", { recipient_address: `/${segment(names.worker)}`, description: "Write the notes." });
    expect(toWorker.body, toWorker.text).toMatchObject({ delegated: true, target_kind: "agent" });
    const worker = toWorker.body.target_agent_run_id as string;
    await started(worker, `${kind}: worker started`);
    await until(() => statusesOf(view.frames, worker).some((s) => LIVE.has(s)), `${kind}: the worker's live status in the view`, 60_000);
    // FOLLOW-S (design SR-064 "an agent run's own stream follows its run, whoever restores it"): the worker's own stream, open
    // from now on and never reconnected, carries the restored run's turn after the Manager's message.
    const own = new WebSocket(`ws://${new URL(h.url).host}/ws/agent/${worker}`); sockets.push(own);
    const ownFrames: Frame[] = [];
    own.on("message", (raw: unknown) => ownFrames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { own.once("open", () => resolve()); own.once("error", reject); });
    await until(() => ownFrames.some((f) => f.type === "CONNECTED"), `${kind}: the worker's own stream`, 30_000);
    let from = view.frames.length;
    const stopped = (await h.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: worker })).terminateAgentRun as Rec;
    expect(stopped.success, stopped.message).toBe(true);
    await until(() => statusesOf(view.frames, worker, from).includes("offline"), `${kind}: the worker's row offline at its Stop`, 30_000);
    from = view.frames.length;
    const ownFrom = ownFrames.length;
    const toStopped = await call(M, "send_message_to", { target_agent_run_id: worker, content: "One more pass, please." });
    expect(toStopped.body, toStopped.text).toMatchObject({ accepted: true });
    await until(() => statusesOf(view.frames, worker, from).some((s) => LIVE.has(s)), `${kind}: the restored worker's live status in the view`, 60_000);
    const TURN = /^(TURN_STARTED|TURN_COMPLETED|SEGMENT_START|SEGMENT_CONTENT|SEGMENT_END|ASSISTANT_COMPLETE)$/;
    await until(() => ownFrames.slice(ownFrom).some((f) => TURN.test(f.type)), `${kind}: the restored worker's turn on its own open stream `
      + `(types after the restore: ${JSON.stringify([...new Set(ownFrames.slice(ownFrom).map((f) => f.type))])})`, 60_000)
      .catch((error: Error) => { throw new Error(`${error.message}; own-stream types after the restore: ${JSON.stringify([...new Set(ownFrames.slice(ownFrom).map((f) => f.type))])}`); });
    record.agentChild = { worker, afterStop: "offline", afterRestore: statusesOf(view.frames, worker, from),
      ownStreamAfterRestore: [...new Set(ownFrames.slice(ownFrom).map((f) => f.type))] };

    // FOLLOW-E (design SR-064, G-3 "at connect"): a new agent child's own stream opened at once after `delegate_task` answers
    // (as a client that selects the new row), while the run is still starting, follows it: the Manager's next message's turn
    // arrives on it.
    const toEarly = await call(M, "delegate_task", { recipient_address: `/${segment(names.worker)}`, description: "Draft the outline." });
    expect(toEarly.body, toEarly.text).toMatchObject({ delegated: true, target_kind: "agent" });
    const early = toEarly.body.target_agent_run_id as string;
    const earlySocket = new WebSocket(`ws://${new URL(h.url).host}/ws/agent/${early}`); sockets.push(earlySocket);
    const earlyFrames: Frame[] = [];
    earlySocket.on("message", (raw: unknown) => earlyFrames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { earlySocket.once("open", () => resolve()); earlySocket.once("error", reject); });
    await started(early, `${kind}: early worker started`);
    await until(() => statusesOf(view.frames, early).includes("idle"), `${kind}: the early worker's first turn ended`, 60_000);
    const earlyFrom = earlyFrames.length;
    const toEarlyAgain = await call(M, "send_message_to", { target_agent_run_id: early, content: "Add one heading." });
    expect(toEarlyAgain.body, toEarlyAgain.text).toMatchObject({ accepted: true });
    const earlyTypes = () => [...new Set(earlyFrames.slice(earlyFrom).map((f) => f.type))];
    await until(() => earlyFrames.slice(earlyFrom).some((f) => TURN.test(f.type)), `${kind}: the early-opened stream carries the next turn`, 60_000)
      .catch((error: Error) => { throw new Error(`${error.message}; types after the message: ${JSON.stringify(earlyTypes())}; all: ${JSON.stringify([...new Set(earlyFrames.map((f) => f.type))])}`); });
    record.earlyStream = { early, typesAfterMessage: earlyTypes() };
    earlySocket.close();

    // FOLLOW-T: a team child with a member whose start failed.
    process.env["AGY_FAKE_EXTRA_MODELS"] = RETIRING_MODEL;
    const toSquad = await call(M, "delegate_task", { recipient_address: `/${segment(names.squad)}`, description: "Review the notes." })
      .finally(() => { delete process.env["AGY_FAKE_EXTRA_MODELS"]; });
    expect(toSquad.body, toSquad.text).toMatchObject({ delegated: true, target_kind: "team" });
    const team = toSquad.body.target_team_run_id as string;
    const lead = toSquad.body.target_team_coordinator_agent_run_id as string;
    await started(lead, `${kind}: squad lead started`);
    const toBroken = await call(lead, "send_message_to", { recipient_address: "/broken", content: "Please check." });
    expect(toBroken.text, "the broken member's start fails").toMatch(/AGENT_RUN_ACTIVATION_FAILED|AGY_MODEL_UNAVAILABLE|could not start|failed/i);
    await until(() => statusesOf(view.frames, lead).some((s) => LIVE.has(s)), `${kind}: the lead's live status in the view`, 60_000);
    from = view.frames.length;
    const teamStopped = (await h.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: team })).terminateAgentTeamRun as Rec;
    expect(teamStopped.success, teamStopped.message).toBe(true);
    await until(() => statusesOf(view.frames, lead, from).includes("offline"), `${kind}: the lead's row offline at the team's Stop`, 30_000);
    from = view.frames.length;
    const toLead = await call(M, "send_message_to", { target_agent_run_id: lead, content: "Back to the review." });
    expect(toLead.body, toLead.text).toMatchObject({ accepted: true });
    await until(() => statusesOf(view.frames, lead, from).some((s) => LIVE.has(s)), `${kind}: the restored lead's live status in the view`, 60_000);
    record.teamChild = { team, lead, brokenStart: toBroken.text.slice(0, 300), afterRestore: statusesOf(view.frames, lead, from) };

    view.socket.close();
    root.close();
    for (const [mutation, id] of [["terminateAgentRun(agentRunId:$id)", worker], ["terminateAgentTeamRun(teamRunId:$id)", team]] as const) {
      await h.graphql(`mutation($id:String!){${mutation}{success}}`, { id }).catch(() => undefined);
    }
  };

  it.each(["agent", "team", "org"] as const)("FOLLOW-A / FOLLOW-T, %s delegator: the child's row offline at its own Stop, then the restored run's live status", async (kind) => {
    await journey(kind);
  }, 300_000);
});
