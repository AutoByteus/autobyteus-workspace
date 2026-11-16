import fs from "node:fs";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { startCollaborationHarness, type CollaborationHarness, type Frame, type Rec } from "../helpers/collaboration-root-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// autobyteus-461 SR-070 / DS-15 (G-4), REQ-005 "a closed run takes no input except its assigner's reactivation", through the
// real Studio HTTP/WebSocket/GraphQL server, a real Agent root, scoped MCP tools and the scripted AGY backend:
// - FENCE-1 (agent run) / FENCE-2 (member of a team run): a delegated run whose Task is closed refuses the user's message on its
//   own stream (rule 2) with base's text, "Your Task is DONE or CANCELLED, so you can't start new work."
//   (TASK_AGENT_RESOURCE_CLOSED). The run is not restored, and the delegator's open view gets no status frame for it (C15-03,
//   server half). After the assigner reopens the Task and continues the run, the user's message is delivered.
// - FENCE-3: a run whose Task was deleted is no longer fenced (no Task names it) and takes the user's message.
// Restart resume skipping a closed run needs a server restart: it is not part of this in-process suite.
// Run: env -i PATH HOME TMPDIR RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/tests/fixtures/agy-failure-cli.mjs
//   pnpm exec vitest run tests/e2e/projects/closed-task-input-fence.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "fence-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const CLOSED_TEXT = "Your Task is DONE or CANCELLED, so you can't start new work.";
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");

suite("DS-15: a delegated run whose Task is closed takes no user input (real HTTP/WS/scoped MCP, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};
  const names: Rec = {};
  const sockets: WebSocket[] = [];
  let projectId = "";

  beforeAll(async () => {
    h = await startCollaborationHarness("fence-e2e");
    const suffix = randomUUID().slice(0, 6);
    names.manager = `Fence manager ${suffix}`; names.worker = `Fence worker ${suffix}`; names.squad = `Fence squad ${suffix}`;
    ids.manager = await h.agentDefinition(names.manager, { toolNames: ["update_task"] });
    ids.worker = await h.agentDefinition(names.worker);
    ids.mate = await h.agentDefinition(`Fence mate ${suffix}`);
    ids.squad = await h.teamDefinition(names.squad, [["lead", ids.worker], ["mate", ids.mate]], "lead");
    projectId = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `Fence ${suffix}` } })).createProject.projectId as string;
  }, 180_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  const wsBase = () => `ws://${new URL(h.url).host}`;
  const open = async (route: string, id: string, ready: string) => {
    const socket = new WebSocket(`${wsBase()}/ws/${route}/${id}`); sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === ready), `${route}/${id} ${ready}`, 30_000);
    return { socket, frames };
  };
  const task = async (title: string) => (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
    { input: { projectId, title, description: title } })).createProjectTask.taskId as string;
  const setStatus = async (managerRunId: string, taskId: string, status: string) => {
    const result = await h.mcpCall(managerRunId, "update_task", { task_id: taskId, status });
    expect(result.isError, result.text).toBe(false);
  };
  const isActive = async (kind: "agent" | "team", runId: string) => kind === "agent"
    ? Boolean((await h.graphql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig?.isActive)
    : Boolean((await h.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}`, { id: runId })).getTeamRunResumeConfig?.isActive);
  /** The user's message to an agent run on its own stream; resolves with the run's own command ACK. */
  const toAgentRun = async (stream: Awaited<ReturnType<typeof open>>, agentRunId: string, content: string) => {
    const messageId = `e2e-${randomUUID()}`;
    stream.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: agentRunId, content, context_file_paths: [], image_urls: [],
      message_id: messageId, dedupe_key: `agent_run_input:e2e:${messageId}` } }));
    let ack: Frame | undefined;
    await until(() => Boolean(ack = stream.frames.find((f) => f.type === "AGENT_COMMAND_ACK" && f.payload.message_id === messageId)), "the run's ACK", 60_000);
    return ack!.payload as Rec;
  };
  /** The user's message to a member on its team's own stream; resolves with the refusal's ERROR frame, or null when the member got it. */
  const toTeamMember = async (stream: Awaited<ReturnType<typeof open>>, agentRunId: string, content: string) => {
    const from = stream.frames.length;
    const messageId = `e2e-${randomUUID()}`;
    stream.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { agent_run_id: agentRunId, content, context_file_paths: [], image_urls: [],
      message_id: messageId, dedupe_key: `member_input:e2e:${messageId}` } }));
    let answer: Frame | undefined;
    await until(() => Boolean(answer = stream.frames.slice(from).find((f) => (f.type === "ERROR" && JSON.stringify(f.payload).includes(agentRunId))
      || (f.type === "MEMBER_INPUT_MESSAGE" && f.payload.message_id === messageId))), "the team stream's answer", 90_000);
    return answer!.type === "ERROR" ? answer!.payload as Rec : null;
  };
  const conversation = async (kind: "agent" | "team", agentRunId: string, teamRunId?: string) => JSON.stringify(kind === "agent"
    ? (await h.graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation
    : (await h.graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: teamRunId, a: agentRunId })).getTeamMemberRunProjection?.conversation);
  const statusFramesFor = (frames: Frame[], agentRunIds: string[]) => frames.filter((f) => JSON.stringify(f).includes("AGENT_STATUS")
    && agentRunIds.some((id) => JSON.stringify(f).includes(id)));

  it("FENCE-1 an agent run: refused with base's text while its Task is closed, not restored, no status in the delegator's view; delivered after the assigner continues it", async () => {
    const root = await h.startRoot("agent", ids, { projectId });
    const taskId = await task(`Fence agent task ${randomUUID().slice(0, 4)}`);
    const delegated = await h.mcpCall(root.managerRunId, "delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: taskId });
    expect(delegated.text).toContain('"delegated":true');
    const worker = JSON.parse(delegated.text).target_agent_run_id as string;
    await root.waitForTaskAgent(worker);
    await setStatus(root.managerRunId, taskId, "DONE");
    await until(async () => !(await isActive("agent", worker)), "the closed Task's run stopped", 60_000);

    const view = await open("agent-collaboration", root.rootId, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const own = await open("agent", worker, "CONNECTED");
    const viewFrom = view.frames.length;
    const refused = await toAgentRun(own, worker, "Fence marker FENCE-1-closed.");
    expect(refused, JSON.stringify(refused)).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED", message: CLOSED_TEXT });
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect(await isActive("agent", worker), "the refused message did not restore the run").toBe(false);
    expect(statusFramesFor(view.frames.slice(viewFrom), [worker]), "no status frame for the run in the delegator's view").toEqual([]);
    expect(await conversation("agent", worker)).not.toContain("FENCE-1-closed");

    // The assigner reopens the Task and continues the run; then the user's message is delivered.
    await setStatus(root.managerRunId, taskId, "IN_PROGRESS");
    const continued = await h.mcpCall(root.managerRunId, "send_message_to", { target_agent_run_id: worker, content: "Continue, please." });
    expect(continued.text).toContain('"accepted":true');
    const delivered = await toAgentRun(own, worker, "Fence marker FENCE-1-open.");
    expect(delivered, JSON.stringify(delivered)).toMatchObject({ accepted: true });
    await until(async () => (await conversation("agent", worker)).includes("FENCE-1-open"), "the reopened run got the user's message", 60_000);
    root.close();
  }, 300_000);

  it("FENCE-2 a member of a team run: refused with base's text while its Task is closed, not restored; delivered after the assigner continues it", async () => {
    const root = await h.startRoot("agent", ids, { projectId });
    const taskId = await task(`Fence team task ${randomUUID().slice(0, 4)}`);
    const delegated = await h.mcpCall(root.managerRunId, "delegate_task", { recipient_address: `/${segment(names.squad)}`, task_id: taskId });
    expect(delegated.text).toContain('"delegated":true');
    const parsed = JSON.parse(delegated.text);
    const teamRunId = parsed.target_team_run_id as string, lead = parsed.target_team_coordinator_agent_run_id as string;
    await root.waitForTaskAgent(teamRunId);
    await setStatus(root.managerRunId, taskId, "DONE");
    await until(async () => !(await isActive("team", teamRunId)), "the closed Task's team run stopped", 60_000);

    const view = await open("agent-collaboration", root.rootId, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const own = await open("agent-team", teamRunId, "TEAM_EXECUTION_VIEW_SNAPSHOT");
    const viewFrom = view.frames.length;
    const refused = await toTeamMember(own, lead, "Fence marker FENCE-2-closed.");
    expect(refused, "the member's message is refused").not.toBeNull();
    expect(JSON.stringify(refused)).toContain(CLOSED_TEXT);
    expect(JSON.stringify(refused)).toContain("TASK_AGENT_RESOURCE_CLOSED");
    await new Promise((resolve) => setTimeout(resolve, 3_000));
    expect(await isActive("team", teamRunId), "the refused message did not restore the team run").toBe(false);
    expect(statusFramesFor(view.frames.slice(viewFrom), [lead]), "no status frame for the team in the delegator's view").toEqual([]);

    await setStatus(root.managerRunId, taskId, "IN_PROGRESS");
    const continued = await h.mcpCall(root.managerRunId, "send_message_to", { target_agent_run_id: lead, content: "Continue, please." });
    expect(continued.text).toContain('"accepted":true');
    expect(await toTeamMember(own, lead, "Fence marker FENCE-2-open."), "delivered after the assigner continued it").toBeNull();
    await until(async () => (await conversation("team", lead, teamRunId)).includes("FENCE-2-open"), "the reopened member got the user's message", 60_000);
    root.close();
  }, 300_000);

  it("FENCE-3 a run whose Task was deleted is not fenced: it takes the user's message", async () => {
    const root = await h.startRoot("agent", ids, { projectId });
    const taskId = await task(`Fence deleted task ${randomUUID().slice(0, 4)}`);
    const delegated = await h.mcpCall(root.managerRunId, "delegate_task", { recipient_address: `/${segment(names.worker)}`, task_id: taskId });
    const worker = JSON.parse(delegated.text).target_agent_run_id as string;
    await root.waitForTaskAgent(worker);
    await setStatus(root.managerRunId, taskId, "DONE");
    await until(async () => !(await isActive("agent", worker)), "the closed Task's run stopped", 60_000);
    expect((await h.graphql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`, { input: { projectId, taskId } })).deleteProjectTask).toBe(true);
    const own = await open("agent", worker, "CONNECTED");
    const delivered = await toAgentRun(own, worker, "Fence marker FENCE-3-deleted.");
    expect(delivered, JSON.stringify(delivered)).toMatchObject({ accepted: true });
    await until(async () => (await conversation("agent", worker)).includes("FENCE-3-deleted"), "the run of a deleted Task got the user's message", 60_000);
    root.close();
  }, 300_000);
});
