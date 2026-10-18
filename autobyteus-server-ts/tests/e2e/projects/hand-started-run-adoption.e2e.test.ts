import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createHash } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, segment, startCollaborationHarness, stringsOf, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// link-existing-run-to-task (AC-001..AC-004): the Project Task Manager (a standalone agent run) gives a saved Task to a run
// the user started by hand in its own workspace, with its own `delegate_task {target_agent_run_id | target_team_run_id,
// task_id}`, through the real Studio HTTP/WebSocket/GraphQL server, scoped MCP tools, Project/Task services and roots. Only
// the external AGY CLI is scripted (`CALL_TOOL:{...}` makes that agent call the real tool).
// - ADO-1 (AC-002, AC-003): an agent run is adopted: the PM's tree links it, the Task entry is the PM's, it leaves the
//   history list, its conversation continues with the Task, every earlier file is kept; DONE closes it; reopening and the
//   PM's message reactivate it.
// - ADO-2 (AC-001; R-3): a team run is adopted the same way; its members still message each other and the PM; DONE closes it.
// - ADO-3 (AC-004): refusals through the real tool (another workspace, in the middle of a turn, has its own delegated
//   runs, archived) say why and change nothing.
// - ADO-4 (REQ-003; F-001): an adopted team whose own turns recorded token usage reports usage under the PM's root
//   without a Team root, so the PM's root keeps running its task team; a new task team reporting the same usage is the
//   control. Uses the AGY `usage_report` replay of a real recording.
// Run (resolved temp HOME, TESTING.md): env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/hand-started-run-adoption.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "ado-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
type Root = Awaited<ReturnType<CollaborationHarness["startRoot"]>>;

suite("A Task given to a run the user started (adoption, real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let h: CollaborationHarness;
  let pm: Root;
  const ids: Rec = {};
  const names: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("ado-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    names.pm = `ADO Manager ${suffix}`; ids.pm = await h.agentDefinition(names.pm, { toolNames: PROJECT_TOOLS });
    for (const key of ["worker", "lead", "mate", "helper"]) { names[key] = `ADO ${key} ${suffix}`; ids[key] = await h.agentDefinition(names[key]); }
    names.team = `ADO Team ${suffix}`; ids.team = await h.teamDefinition(names.team, [["manager", ids.lead], ["mate", ids.mate]], "manager");
    pm = await h.startRoot("agent", { manager: ids.pm });
  }, 180_000);

  afterAll(async () => {
    pm?.close();
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  const createTask = async (label: string) => {
    const projectId = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `ADO ${label} ${Math.random().toString(16).slice(2, 8)}` } })).createProject.projectId as string;
    const description = `Adoption Task ${label} ${Math.random().toString(16).slice(2, 8)}: write one line about it.`;
    const taskId = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, description } })).createProjectTask.taskId as string;
    return { projectId, taskId, description };
  };
  /** A run the user started: one finished turn, then idle. */
  const handStarted = async (kind: "agent" | "team", ids_: Rec, options: { workspaceRootPath?: string } = {}) => {
    const root = await h.startRoot(kind, ids_, options);
    root.sendTo(root.managerRunId, "Hello, start of my own work.");
    await until(async () => stringsOf(await root.conversationOf(root.managerRunId, kind === "agent" ? "/" : "/manager")).some((t) => /^OK/.test(t)),
      `${kind} run answered`, 60_000);
    return root;
  };
  const historyIds = async () => {
    const data = await h.graphql("{listWorkspaceRunHistory{agentDefinitions{runs{runId}} teamDefinitions{runs{teamRunId}}}}");
    return JSON.stringify(data);
  };
  /** The Task's run entries naming a run (`agent_run_resources.json`). */
  const entriesOf = async (task: { projectId: string; taskId: string }, runId: string): Promise<Rec[]> => {
    const file = path.join(h.dataDir, "projects", encodeURIComponent(task.projectId), "tasks", encodeURIComponent(task.taskId), "agent_run_resources.json");
    const raw = await fsp.readFile(file, "utf8").catch(() => "");
    if (!raw) return [];
    return ((JSON.parse(raw) as Rec).agentRunResources as Rec[]).filter((entry) => JSON.stringify(entry.agentRun).includes(runId));
  };
  const closedOf = async () => (await h.graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: pm.rootId })).agentRunCollaboration?.root_agent?.closed_task_executions ?? [];
  /** Every file of a run's folder by relative path → sha256. */
  const filesOf = async (dir: string): Promise<Record<string, string>> => {
    const out: Record<string, string> = {};
    const walk = async (current: string) => {
      for (const entry of await fsp.readdir(current, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(current, entry.name);
        if (entry.isDirectory()) await walk(full);
        else out[path.relative(dir, full)] = createHash("sha256").update(await fsp.readFile(full)).digest("hex");
      }
    };
    await walk(dir);
    return out;
  };
  const delegate = (args: Rec) => pm.calls(pm.managerRunId, "/", callTool("delegate_task", args));
  const pmCalls = (name: string, args: Rec) => pm.calls(pm.managerRunId, "/", callTool(name, args));
  /** The PM sets the Task's status with its own update_task; the call succeeds and reports the new status. */
  const setStatus = async (taskId: string, status: string) => {
    const result = await pmCalls("update_task", { task_id: taskId, status });
    expect(result.isError, JSON.stringify(result)).toBe(false);
    expect(JSON.stringify(result)).toContain(status);
  };

  it("ADO-1 an agent run the user started is adopted, keeps its files and conversation, closes on DONE and is reactivated after reopening", async () => {
    const worker = await handStarted("agent", { manager: ids.worker });
    const wid = worker.managerRunId;
    const folder = path.join(h.dataDir, "memory", "agents", wid);
    const before = await filesOf(folder);
    expect(await historyIds()).toContain(wid);
    const task = await createTask("agent");
    const { taskId } = task;

    const result = await delegate({ target_agent_run_id: wid, task_id: taskId });
    expect(result, JSON.stringify(result)).toMatchObject({ delegated: true, target_kind: "agent", target_agent_run_id: wid });
    worker.close(); h.release(wid);
    const link = await pm.waitForTaskAgent(wid);
    expect(link.address).toBe(`/${segment(names.worker)}`);
    // The Task entry is the PM's assignment of the run; the run leaves its own history group.
    await until(async () => (await entriesOf(task, wid)).some((e) => e.closedAt === null), "open Task entry for the adopted run", 30_000);
    await until(async () => !(await historyIds()).includes(wid), "adopted run left the history", 30_000);
    // Its conversation continues with the Task as its next work.
    await until(async () => stringsOf(await pm.conversationOf(wid, link.address)).some((t) => t.includes(task.description)), "Task delivered", 60_000);
    const conversation = stringsOf(await pm.conversationOf(wid, link.address));
    expect(conversation.some((t) => t.includes("Hello, start of my own work.")), "earlier conversation kept").toBe(true);
    // Every earlier file is kept (traces only grow); its own record gains the task-agent section naming the PM.
    const after = await filesOf(folder);
    for (const file of Object.keys(before)) expect(after[file], `${file} kept`).toBeTruthy();
    const own = JSON.parse(await fsp.readFile(path.join(folder, "run_metadata.json"), "utf8")) as Rec;
    expect(own.taskAgent?.coordinatingRun?.runId).toBe(pm.rootId);

    // AC-003: DONE closes it; reopening and the PM's message reactivate it.
    await setStatus(taskId, "DONE");
    await until(async () => JSON.stringify(await closedOf()).includes(wid), "adopted run closed on DONE", 60_000);
    await setStatus(taskId, "IN_PROGRESS");
    const reached = await pmCalls("send_message_to", { target_agent_run_id: wid, content: "Continue the Task please." });
    expect(reached, JSON.stringify(reached)).toMatchObject({ accepted: true });
    await until(async () => stringsOf(await pm.conversationOf(wid, link.address)).some((t) => t.includes("Continue the Task please.")), "reactivated", 60_000);
    expect(JSON.stringify(await closedOf())).not.toContain(wid);
  }, 400_000);

  it("ADO-2 a team run the user started is adopted; its members message each other and the PM; DONE closes it", async () => {
    const team = await handStarted("team", { team: ids.team, manager: ids.lead, mate: ids.mate });
    const tid = team.rootId;
    const task = await createTask("team");
    const { taskId } = task;
    const result = await delegate({ target_team_run_id: tid, task_id: taskId });
    expect(result, JSON.stringify(result)).toMatchObject({ delegated: true, target_kind: "team", target_team_run_id: tid });
    team.close(); h.release(tid);
    const link = await pm.waitForTaskAgent(tid);
    expect(link.address).toBe(`/${segment(names.team)}`);
    await until(async () => !(await historyIds()).includes(tid), "adopted team left the history", 30_000);
    await until(async () => (await entriesOf(task, tid)).some((e) => e.closedAt === null), "open Task entry for the adopted team", 30_000);
    const coordinator = link.members.find((m) => m.agentRunId === team.members["/manager"])!;
    const mate = link.members.find((m) => m.agentRunId === team.members["/mate"])!;
    expect(coordinator && mate, JSON.stringify(link.members)).toBeTruthy();
    await until(async () => stringsOf(await pm.conversationOf(coordinator.agentRunId!, coordinator.address)).some((t) => t.includes(task.description)), "Task delivered to the coordinator", 60_000);
    // R-3: members message each other (by address and by run id) and the PM.
    for (const args of [{ recipient_address: mate.address, content: "Mate, by address." }, { target_agent_run_id: mate.agentRunId, content: "Mate, by run id." },
      { target_agent_run_id: pm.managerRunId, content: "PM, from the adopted team." }]) {
      const sent = await pm.calls(coordinator.agentRunId!, coordinator.address, callTool("send_message_to", args));
      expect(sent, `${JSON.stringify(args)} → ${JSON.stringify(sent)}`).toMatchObject({ accepted: true });
    }
    await until(async () => { const t = stringsOf(await pm.conversationOf(mate.agentRunId!, mate.address)).join("\n"); return t.includes("Mate, by address.") && t.includes("Mate, by run id."); },
      "mate received both", 60_000);
    await until(async () => stringsOf(await pm.conversationOf(pm.managerRunId, "/")).some((t) => t.includes("PM, from the adopted team.")), "PM received", 60_000);
    await setStatus(taskId, "DONE");
    await until(async () => JSON.stringify(await closedOf()).includes(tid), "adopted team closed on DONE", 60_000);
  }, 400_000);

  it("ADO-3 refusals through the real tool say why and change nothing", async () => {
    const task = await createTask("refusals");
    const { taskId } = task;
    const other = path.join(h.dataDir, "other-workspace"); await fsp.mkdir(other);
    const elsewhere = await handStarted("agent", { manager: ids.worker }, { workspaceRootPath: other });
    const busy = await handStarted("agent", { manager: ids.worker });
    const parent = await handStarted("agent", { manager: ids.worker });
    const child = await parent.calls(parent.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.helper)}`, description: "A sub-task." }));
    expect(child, JSON.stringify(child)).toMatchObject({ delegated: true });
    const archived = await handStarted("agent", { manager: ids.worker });
    await h.terminate("agent", archived.rootId); archived.close();
    const archivedResult = (await h.graphql(`mutation($id:String!){archiveStoredRun(runId:$id){success message}}`, { id: archived.rootId })).archiveStoredRun;
    expect(archivedResult, JSON.stringify(archivedResult)).toMatchObject({ success: true });
    // In the middle of a turn: one tool call that starts after 25 s keeps the turn running, then the turn ends by
    // itself. (Terminating a turn held open indefinitely by the fixture's HOLD_TURN does not return, also on the
    // base commit: a follow-up outside this ticket.)
    busy.sendTo(busy.managerRunId, `CALL_TOOLS:${JSON.stringify([{ name: "send_message_to", arguments: { target_agent_run_id: "nobody", content: "later" }, delayMs: 25_000 }])}`);
    // The refusal needs the turn to have started: the run records the user message when its turn starts, and the
    // delayed call keeps that turn running for 25 s after it.
    await until(async () => stringsOf(await busy.conversationOf(busy.managerRunId, "/")).some((t) => t.includes("CALL_TOOLS:")),
      "busy run's turn started", 30_000);

    const cases: Array<[string, string, RegExp]> = [
      ["in the middle of a turn", busy.managerRunId, /middle of a turn/],
      ["another workspace", elsewhere.managerRunId, /another workspace/],
      ["has delegated runs of its own", parent.managerRunId, /delegated runs of its own/],
      ["archived", archived.rootId, /archived/],
    ];
    for (const [label, runId, reason] of cases) {
      const treeBefore = JSON.stringify(await pm.liveTree());
      const refused = await delegate({ target_agent_run_id: runId, task_id: taskId });
      expect(JSON.stringify(refused), `${label}: refused with its reason`).toMatch(reason);
      expect(refused.delegated, `${label}: not delegated`).not.toBe(true);
      expect(JSON.stringify(await pm.liveTree()), `${label}: PM tree unchanged`).toBe(treeBefore);
      expect(await entriesOf(task, runId), `${label}: no Task entry`).toEqual([]);
    }
    expect(await historyIds(), "the refused runs stay in the history").toContain(elsewhere.managerRunId);
    await until(async () => stringsOf(await busy.conversationOf(busy.managerRunId, "/")).some((t) => t.includes("CALLED_ALL:")), "busy turn ended", 60_000);
    for (const root of [elsewhere, busy, parent]) { await h.terminate("agent", root.rootId); root.close(); }
  }, 400_000);

  it("ADO-4 an adopted team's members report token usage like any task team's, and the PM's root keeps running", async () => {
    // Real models report token usage after every call. A member of a task team under an Agent root must report it
    // without a Team root (the Agent root rejects the event and fail-stops, ending every task agent). The AGY
    // `usage_report` case replays a real AGY recording with usage; processes read the case when they start.
    const manager = await h.startRoot("agent", { manager: ids.pm });
    const answered = async (runId: string, address: string, after: string) => {
      const conversation = (await manager.conversationOf(runId, address)) as Rec[] ?? [];
      const from = conversation.findIndex((entry) => JSON.stringify(entry).includes(after));
      // `OK DUMP<n>` is the recording's reply: this turn ran in a `usage_report` process and reported usage.
      return from >= 0 && conversation.slice(from + 1).some((entry) => entry.kind === "message" && entry.role === "assistant" && JSON.stringify(entry).includes("OK DUMP"));
    };
    /** The PM's root still runs its task team: the team is in its tree and the PM's message reaches the coordinator. */
    const stillRunning = async (teamRunId: string, label: string) => {
      const link = (await manager.taskAgents()).find((agent) => agent.teamRunId === teamRunId);
      expect(link, `${label}: the team is still the PM's task team`).toBeTruthy();
      const coordinator = link!.members.find((m) => m.address.endsWith("/manager"))!;
      const marker = `Still there? ${label} ${Math.random().toString(16).slice(2, 8)}`;
      const sent = await manager.calls(manager.managerRunId, "/", callTool("send_message_to", { target_agent_run_id: coordinator.agentRunId, content: marker }));
      expect(sent, `${label}: ${JSON.stringify(sent)}`).toMatchObject({ accepted: true });
      await until(async () => stringsOf(await manager.conversationOf(coordinator.agentRunId, coordinator.address)).some((t) => t.includes(marker)), `${label}: message delivered`, 60_000);
    };
    const priorCase = process.env["AGY_FAKE_CASE"];
    try {
      // Control: a new task team (delegated by recipient_address) whose members report usage.
      process.env["AGY_FAKE_CASE"] = "usage_report";
      const fresh = await manager.calls(manager.managerRunId, "/", callTool("delegate_task", { recipient_address: `/${segment(names.team)}`, description: "Control: review one line." }));
      expect(fresh, JSON.stringify(fresh)).toMatchObject({ delegated: true, target_kind: "team" });
      const freshLink = await manager.waitForTaskAgent(fresh.target_team_run_id);
      const freshCoordinator = freshLink.members.find((m) => m.address.endsWith("/manager"))!;
      await until(() => answered(freshCoordinator.agentRunId, freshCoordinator.address, "Control: review one line."), "control team answered with usage", 60_000);
      await stillRunning(fresh.target_team_run_id, "new task team");

      // The same with a team the user started. As with a real model, its own turns already recorded usage under its
      // Team root; after adoption its members restart under the PM's root and report usage again.
      const team = await handStarted("team", { team: ids.team, manager: ids.lead, mate: ids.mate });
      const task = await createTask("usage");
      const adopted = await manager.calls(manager.managerRunId, "/", callTool("delegate_task", { target_team_run_id: team.rootId, task_id: task.taskId }));
      expect(adopted, JSON.stringify(adopted)).toMatchObject({ delegated: true, target_kind: "team" });
      team.close(); h.release(team.rootId);
      const link = await manager.waitForTaskAgent(team.rootId);
      const coordinator = link.members.find((m) => m.agentRunId === team.members["/manager"])!;
      await until(() => answered(coordinator.agentRunId, coordinator.address, task.description), "adopted team answered with usage", 60_000);
      await stillRunning(team.rootId, "adopted team");
    } finally {
      if (priorCase === undefined) delete process.env["AGY_FAKE_CASE"]; else process.env["AGY_FAKE_CASE"] = priorCase;
      manager.close();
    }
  }, 400_000);
});
