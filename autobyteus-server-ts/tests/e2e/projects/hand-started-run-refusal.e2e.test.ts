import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, startCollaborationHarness, stringsOf, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// link-existing-run-to-task, withdrawn (SR-018, RM-001): a Task can't be given to a run the user started. The Project
// Task Manager (a standalone agent run) calls its own `delegate_task {target_agent_run_id | target_team_run_id, task_id}`
// on an idle agent run and an idle team run the user started in the PM's workspace: each is refused with the
// pre-adoption text, and nothing is written. The PM's tree, the Task's run entries, the run's own files and its
// history row are unchanged, and the run keeps working as its own root. Real Studio HTTP/WebSocket/GraphQL server,
// scoped MCP tools and Project/Task services; only the AGY CLI is scripted (`CALL_TOOL:{...}`).
// Run (resolved temp HOME, TESTING.md): env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/hand-started-run-refusal.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "wdr-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
const refusal = (id: string) =>
  `${id} is not one of your task agents. Use a run id that delegate_task returned to you, or delegate to a new task agent with recipient_address.`;

suite("A Task can't be given to a run the user started (adoption withdrawn; real HTTP/WS/GraphQL/scoped MCP, scripted AGY)", () => {
  let h: CollaborationHarness;
  const ids: Rec = {};

  beforeAll(async () => {
    h = await startCollaborationHarness("wdr-e2e");
    const suffix = Math.random().toString(16).slice(2, 8);
    ids.pm = await h.agentDefinition(`WDR Manager ${suffix}`, { toolNames: PROJECT_TOOLS });
    for (const key of ["worker", "lead", "mate"]) ids[key] = await h.agentDefinition(`WDR ${key} ${suffix}`);
    ids.team = await h.teamDefinition(`WDR Team ${suffix}`, [["manager", ids.lead], ["mate", ids.mate]], "manager");
  }, 180_000);

  afterAll(async () => {
    if (h) await h.close();
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      fs.rmSync(home, { recursive: true, force: true });
    }
  }, 180_000);

  /** One user turn, answered: the run is idle and has its own conversation. */
  const answered = async (root: Awaited<ReturnType<CollaborationHarness["startRoot"]>>, content: string) => {
    const before = stringsOf(await root.conversationOf(root.managerRunId, "/")).filter((t) => /^OK/.test(t)).length;
    root.sendTo(root.managerRunId, content);
    await until(async () => stringsOf(await root.conversationOf(root.managerRunId, "/")).filter((t) => /^OK/.test(t)).length > before,
      `${root.kind} run answered "${content}"`, 60_000);
  };
  const historyJson = async () => JSON.stringify(await h.graphql("{listWorkspaceRunHistory{agentDefinitions{runs{runId}} teamDefinitions{runs{teamRunId}}}}"));
  /** The run's own files (agent: run_metadata.json; team: its tree and metadata), as written on disk. */
  const ownFiles = async (kind: "agent" | "team", runId: string): Promise<Record<string, string>> => {
    const dir = path.join(h.dataDir, "memory", kind === "agent" ? "agents" : "agent_teams", runId);
    const names = kind === "agent" ? ["run_metadata.json"] : ["team_run_execution_tree.json", "team_run_metadata.json"];
    const out: Record<string, string> = {};
    for (const name of names) out[name] = await fsp.readFile(path.join(dir, name), "utf8").catch(() => "<missing>");
    return out;
  };

  it("WDR-1 delegate_task on an agent run and a team run the user started is refused with the pre-adoption text, and nothing is written", async () => {
    const pm = await h.startRoot("agent", { manager: ids.pm });
    const worker = await h.startRoot("agent", { manager: ids.worker });
    const team = await h.startRoot("team", { team: ids.team, manager: ids.lead, mate: ids.mate });
    await answered(worker, "Hello, start of my own work.");
    await answered(team, "Hello team, start of our own work.");
    const projectId = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
      { input: { name: `WDR ${Math.random().toString(16).slice(2, 8)}` } })).createProject.projectId as string;
    const taskId = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
      { input: { projectId, title: "Write one line about it.", description: "Write one line about it." } })).createProjectTask.taskId as string;
    const resources = path.join(h.dataDir, "projects", encodeURIComponent(projectId), "tasks", encodeURIComponent(taskId), "agent_run_resources.json");
    const entriesNaming = async (runId: string) => {
      const raw = await fsp.readFile(resources, "utf8").catch(() => "");
      return raw ? ((JSON.parse(raw) as Rec).agentRunResources as Rec[]).filter((entry) => JSON.stringify(entry.agentRun).includes(runId)) : [];
    };

    for (const [kind, runId, args] of [
      ["agent", worker.managerRunId, { target_agent_run_id: worker.managerRunId, task_id: taskId }],
      ["team", team.rootId, { target_team_run_id: team.rootId, task_id: taskId }],
    ] as const) {
      const treeBefore = JSON.stringify(await pm.liveTree());
      const filesBefore = await ownFiles(kind, runId);
      expect(await historyJson(), `${kind}: listed in its own history group before`).toContain(runId);

      const refused = await pm.calls(pm.managerRunId, "/", callTool("delegate_task", args));
      expect(refused, `${kind}: ${JSON.stringify(refused)}`).toMatchObject({ delegated: false, message: refusal(runId) });

      // Nothing is written: the PM's tree, the Task's entries, the run's own files and its history row are unchanged.
      expect(JSON.stringify(await pm.liveTree()), `${kind}: PM tree unchanged`).toBe(treeBefore);
      expect(await entriesNaming(runId), `${kind}: no Task entry`).toEqual([]);
      expect(await ownFiles(kind, runId), `${kind}: own files unchanged`).toEqual(filesBefore);
      for (const content of Object.values(await ownFiles(kind, runId))) expect(content).not.toContain("taskAgent");
      expect(await historyJson(), `${kind}: still listed in its own history group`).toContain(runId);
    }
    // Each run still works as its own root, and received nothing from the PM.
    await answered(worker, "Still mine?");
    await answered(team, "Still ours?");
    for (const root of [worker, team]) {
      expect(stringsOf(await root.conversationOf(root.managerRunId, "/")).join("\n"), `${root.kind}: no Task delivered`).not.toContain("New Task assigned to you");
    }
    for (const root of [pm, worker, team]) root.close();
  }, 400_000);
});
