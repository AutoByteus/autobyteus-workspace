import "reflect-metadata";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { callTool, objectsIn, segment, startCollaborationHarness, type CollaborationHarness, type Rec } from "../helpers/collaboration-root-harness.js";

// delegated-copy-project-workspace (autobyteus-97), live: the design's escalation trigger ("a runtime that ignores the recorded
// folder") read on real external runtimes. A scripted AGY manager (tests/fixtures/agy-failure-cli.mjs, no inference) in folder G
// delegates a saved Task of Project P (linked folder F) to a worker whose definition launches on a real runtime. The worker itself
// runs `pwd > copy-cwd.txt`: the file must be in F and hold F, and nothing lands in G. Provider credits: the worker's one turn only.
// - DCF-L1: Codex (RUN_CODEX_E2E=1; model CODEX_E2E_MODEL, default gpt-6.1-terra at medium).
// - DCF-L2: Claude (RUN_CLAUDE_E2E=1; model CLAUDE_E2E_MODEL, default the catalog's Haiku).
// Run: env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" CODEX_HOME=<throwaway, with a symlink
//   to the login's auth.json> RUN_AGY_FAILURE_E2E=1 RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-project-folder-live.e2e.test.ts --no-watch
// (signed-in CLIs need the real HOME, USER and LOGNAME; the Claude run adds its conversation to the user's Claude history).
// DELEGATED_COPY_FOLDER_E2E_EVIDENCE_DIR=<dir> writes the observed working directories as JSON.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const scripted = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const real = (value: string) => (fs.existsSync(value) ? fs.realpathSync(value) : value);
const recordedFolders = (node: unknown): string[] => [...new Set(objectsIn(node)
  .flatMap((record) => [record.workspaceRootPath, record.workspace_root_path])
  .filter((value): value is string => typeof value === "string").map(real))];
const nodeOf = (tree: unknown, id: string): Rec | undefined => objectsIn(tree).find((record) =>
  typeof (record.startedAt ?? record.started_at) === "string" && [record.agentRunId, record.agent_run_id].includes(id));

const liveRuntimes = [
  { id: "DCF-L1", gate: "RUN_CODEX_E2E", runtimeKind: "codex_app_server", pick: (models: Rec[]) => models.find((m) => m.modelIdentifier === (process.env.CODEX_E2E_MODEL ?? "gpt-6.1-terra")), llmConfig: { reasoning_effort: "medium" } },
  { id: "DCF-L2", gate: "RUN_CLAUDE_E2E", runtimeKind: "claude_agent_sdk", pick: (models: Rec[]) => (process.env.CLAUDE_E2E_MODEL ? models.find((m) => m.modelIdentifier === process.env.CLAUDE_E2E_MODEL) : models.find((m) => /haiku/i.test(m.modelIdentifier))), llmConfig: null },
] as const;
const selected = liveRuntimes.filter((runtime) => process.env[runtime.gate] === "1");
const evidence: Rec = {};
(scripted && selected.length ? describe : describe.skip)("A real external runtime's copy works in its Task's Project folder (live)", () => {
  let h: CollaborationHarness;
  // One harness per file: the server's app data folder is set once per process.
  beforeAll(async () => { h = await startCollaborationHarness("dcf-live"); }, 180_000);
  afterAll(async () => {
    const dir = process.env["DELEGATED_COPY_FOLDER_E2E_EVIDENCE_DIR"];
    if (dir) { await fsp.mkdir(dir, { recursive: true }); await fsp.writeFile(path.join(dir, "delegated-copy-project-folder-live.json"), `${JSON.stringify(evidence, null, 2)}\n`); }
    await h?.close();
  }, 180_000);

  for (const runtime of liveRuntimes) {
    it.skipIf(process.env[runtime.gate] !== "1")(`${runtime.id}: a real ${runtime.runtimeKind} copy writes pwd: the file is in F and holds F, not the manager's G`, async () => {
      const F = path.join(fs.realpathSync(h.dataDir), `project-folder-${runtime.id.toLowerCase()}`);
      const G = fs.realpathSync(h.workspace);
      await fsp.mkdir(F);
      const models = (await h.graphql(`query($r:String){providerModelCatalogSnapshots(runtimeKind:$r){llmModels{modelIdentifier}}}`, { r: runtime.runtimeKind })).providerModelCatalogSnapshots
        .flatMap((snapshot: Rec) => snapshot.llmModels) as Rec[];
      const model = runtime.pick(models);
      expect(model, `a live model of ${runtime.runtimeKind}: ${JSON.stringify(models.map((m) => m.modelIdentifier))}`).toBeTruthy();
      const suffix = randomUUID().slice(0, 6);
      const ids: Rec = { manager: await h.agentDefinition(`DCF Live Manager ${suffix}`) };
      const workerName = `DCF Live Worker ${suffix}`;
      ids.worker = await h.agentDefinition(workerName, { defaultLaunchConfig: { runtimeKind: runtime.runtimeKind, llmModelIdentifier: model!.modelIdentifier, llmConfig: runtime.llmConfig } });
      const projectId = (await h.graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
        { input: { name: `DCF Live ${suffix}`, workspaces: [{ workspaceRootPath: F, description: "link" }] } })).createProject.projectId as string;
      const taskId = (await h.graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
        { input: { projectId, title: "Report the working directory", description: "Run exactly this shell command, without changing directory first: pwd > copy-cwd.txt\nThen reply DONE. Do nothing else." } })).createProjectTask.taskId as string;
      const root = await h.startRoot("agent", ids);
      const delegated = await root.calls(root.rootId, "/", callTool("delegate_task", { recipient_address: `/${segment(workerName)}`, task_id: taskId }));
      expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
      const copyId = delegated.target_agent_run_id as string;
      const written = path.join(F, "copy-cwd.txt");
      await until(() => fs.existsSync(written) && fs.readFileSync(written, "utf8").trim().length > 0, "the copy wrote pwd", 240_000);
      const pwd = fs.realpathSync(fs.readFileSync(written, "utf8").trim());
      expect(pwd).toBe(F);
      expect(fs.existsSync(path.join(G, "copy-cwd.txt"))).toBe(false);
      expect(recordedFolders(nodeOf(await root.liveTree(), copyId))).toEqual([F]);
      evidence[runtime.id] = { runtimeKind: runtime.runtimeKind, model: model!.modelIdentifier, copyId, pwdWrittenByTheCopy: pwd, F, G, inG: fs.existsSync(path.join(G, "copy-cwd.txt")) };
      root.close();
      await h.terminate("agent", root.rootId);
    }, 420_000);
  }
});
