import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Frame, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { readRootMessages } from "../../helpers/collaboration-participant-messages.js";

// autobyteus-461 SR-072 / SR-074 (CR-461-054, CR-461-056; F-26): the Team tab of run X shows the messages of X's own log
// composed with those of its open subtree, at every depth, by one in-view rule for the read and for live: base's
// `isMessageOfView(message, own(X), tree(X))`. Through the real Studio HTTP/WebSocket/GraphQL server, real roots, the agents'
// scoped MCP tools and the scripted AGY backend:
// - TT-1: M delegates W (a Project Task); W delegates H (sub-work). W's message to H is two hops below M: it shows in M's
//   Team tab live (a `communication` event on M's open view) and after a reload (a new view, then the Team tab's read).
// - TT-2: a message between H (a run below W) and M (W's own delegator) is in W's view neither live nor after a reload;
//   in M's view it shows (M is its own agent there).
// Run: env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs
//   pnpm exec vitest run tests/e2e/projects/team-tab-subtree-messages.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "team-tab-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

suite("The Team tab: one in-view rule over the open subtree, live and read (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  let projectId = "";
  const evidence: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("team-tab-e2e");
    const suffix = randomUUID().slice(0, 6);
    names.manager = `Tab manager ${suffix}`; names.worker = `Tab worker ${suffix}`; names.helper = `Tab helper ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager, { toolNames: ["update_task"] });
    ids.worker = await h.agentDefinition(names.worker);
    ids.helper = await h.agentDefinition(names.helper);
    projectId = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Team tab ${suffix}` } })).createProject.projectId as string;
  }, 180_000);

  afterAll(async () => {
    const dir = process.env["TEAM_TAB_E2E_EVIDENCE"];
    if (dir) fs.writeFileSync(dir, `${JSON.stringify(evidence, null, 2)}\n`);
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** An agent run's view stream (`/ws/agent-collaboration/<run>`), open from now on: what a Team tab shown live receives. */
  const openView = async (runId: string) => {
    const socket = new WebSocket(`ws://${new URL(h.url).host}/ws/agent-collaboration/${runId}`); sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"), `${runId}'s view snapshot`, 30_000);
    return { socket, frames };
  };
  /** The view's live message events carrying `marker` (each view kind's `communication` event, SR-072). */
  const liveMessages = (frames: Frame[], marker: string) => frames.filter((f) => f.type !== "ROOT_EXECUTION_VIEW_SNAPSHOT"
    && JSON.stringify(f.payload).includes("communication") && JSON.stringify(f.payload).includes(marker));
  /** The Team tab's read of run X, as the web loads it when the tab is shown: each participant's messages. */
  const tabRead = async (rootRunId: string, participants: string[]) =>
    (await readRootMessages(h.graphql, { rootKind: "agent", rootRunId, agentRunIds: participants })).map((m) => m.content);
  const call = async (agentRunId: string, tool: string, args: Rec) => {
    const result = await h.mcpCall(agentRunId, tool, args);
    expect(result.isError, result.text).toBe(false);
    return JSON.parse(result.text) as Rec;
  };

  it("TT-1 / TT-2: a two-hop message in the top run's tab live and after a reload; a message between a run below X and X's delegator in neither", async () => {
    const root = await h.startRoot("agent", ids, { projectId });
    const M = root.managerRunId;
    const taskId = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, title: "Team tab work", description: "Team tab work" } })).createProjectTask.taskId as string;
    const toWorker = await call(M, "delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: taskId });
    expect(toWorker, JSON.stringify(toWorker)).toMatchObject({ delegated: true, target_kind: "agent" });
    const W = toWorker.target_agent_run_id as string;
    await root.waitForTaskAgent(W);
    await until(async () => { try { await h.promptOf(W); return true; } catch { return false; } }, "the worker's run started", 60_000);
    const toHelper = await call(W, "delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "Collect the links." });
    expect(toHelper, JSON.stringify(toHelper)).toMatchObject({ delegated: true, target_kind: "agent" });
    const H = toHelper.target_agent_run_id as string;
    await root.waitForTaskAgent(H);
    await until(async () => { try { await h.promptOf(H); return true; } catch { return false; } }, "the helper's run started", 60_000);

    // Both views are open before the messages: M's (the top run) and W's (the run between).
    const mView = await openView(M);
    const wView = await openView(W);

    // TT-1: W → H, two hops below M.
    const twoHop = `TWO-HOP-${randomUUID().slice(0, 6)}`;
    const sent = await call(W, "send_message_to", { target_agent_run_id: H, content: twoHop });
    expect(sent, JSON.stringify(sent)).toMatchObject({ accepted: true });
    await until(() => liveMessages(mView.frames, twoHop).length > 0, "TT-1: the two-hop message live in M's view", 30_000);
    expect(liveMessages(mView.frames, twoHop), "TT-1: numbered once in M's view").toHaveLength(1);
    expect(liveMessages(wView.frames, twoHop).length, "W's own message shows in W's view").toBe(1);
    expect(await tabRead(M, [M, W, H]), "TT-1: in M's Team tab read").toContain(twoHop);
    mView.socket.close();
    const mReloaded = await openView(M);
    expect(await tabRead(M, [M, W, H]), "TT-1: in M's Team tab after a reload").toContain(twoHop);
    expect((await tabRead(M, [M, W, H])).filter((content) => content === twoHop), "TT-1: once").toHaveLength(1);

    // TT-2: H and M (W's own delegator): in W's view neither live nor after a reload; in M's view it shows.
    const outside = `OUTSIDE-W-${randomUUID().slice(0, 6)}`;
    const toH = await call(M, "send_message_to", { target_agent_run_id: H, content: outside });
    expect(toH, JSON.stringify(toH)).toMatchObject({ accepted: true });
    await until(() => liveMessages(mReloaded.frames, outside).length > 0, "TT-2: the message live in M's view", 30_000);
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect(liveMessages(wView.frames, outside), "TT-2: not live in W's view").toEqual([]);
    expect(await tabRead(W, [W, H]), "TT-2: not in W's Team tab read").not.toContain(outside);
    wView.socket.close();
    await openView(W);
    expect(await tabRead(W, [W, H]), "TT-2: not in W's Team tab after a reload").not.toContain(outside);
    expect(await tabRead(M, [M, W, H]), "TT-2: in M's Team tab").toContain(outside);

    evidence.tt = { M, W, H, twoHop, outside, mLive: liveMessages(mView.frames, twoHop).length,
      wLiveOutside: liveMessages(wView.frames, outside).length, mTab: await tabRead(M, [M, W, H]), wTab: await tabRead(W, [W, H]) };
    root.close();
  }, 600_000);
});
