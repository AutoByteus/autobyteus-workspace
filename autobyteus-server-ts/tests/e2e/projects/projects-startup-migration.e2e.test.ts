import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Released Projects data upgraded by the registered STARTUP_ONLY migration `20261005_projects_per_folder_v1`
// through both actual built startup entrypoints (Studio `dist/app.js`, standalone `dist/index.js`),
// the repository migration runner, HTTP/GraphQL and the per-Project store. No startup, store,
// migration or provider doubles, and no model request.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
const MIGRATION_ID = "20261005_projects_per_folder_v1";
const fixture = (name: string) => fileURLToPath(new URL(`../../fixtures/${name}`, import.meta.url));
let root = "";
const children: ChildProcess[] = [];
const logs: string[] = [];

const waitFor = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out ${label}: ${logs.join("\n")}`);
};
const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = new Promise<void>(resolve => child.once("exit", () => resolve()));
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  try { await exited; } finally { clearTimeout(force); }
};
const start = (entry: string, args: string[] = []) => {
  // Only this test-owned root is an operational database; no AUTOBYTEUS_*/provider/package inheritance.
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    ["HOME", "PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
      .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]),
  );
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" });
  const child = spawn(process.execPath, [entry, ...args], { env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child); const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  let error: Error | null = null; child.once("error", e => { error = e; });
  return { child, text: () => logs[index]!, assertAlive: () => {
    if (error) throw error;
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Startup exited: ${logs[index]}`);
  } };
};

type GqlResult = { errors?: Array<{ message: string; extensions?: { code?: string } }>; data: any };
const studio = async () => {
  const running = start(path.resolve("dist/app.js"), ["--data-dir", root, "--host", "127.0.0.1", "--port", "0"]);
  await waitFor(() => { running.assertAlive(); return running.text().includes("Server listening on 127.0.0.1:0"); }, "Studio readiness");
  const origin = [...running.text().matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const raw = async (query: string, variables: Record<string, unknown> = {}): Promise<GqlResult> => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    expect(response.status).toBe(200);
    return await response.json() as GqlResult;
  };
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const result = await raw(query, variables);
    expect(result.errors).toBeUndefined();
    return result.data;
  };
  const migration = async () => (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage logPath}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === MIGRATION_ID);
  return { child: running.child, origin, raw, gql, migration, text: running.text };
};
const standaloneEntry = async (name: string, body: string) => {
  const packageRoot = path.join(root, "host-fixture-package"), app = path.join(packageRoot, "applications", "fixture");
  await fs.mkdir(path.join(app, "ui"), { recursive: true }); await fs.mkdir(path.join(app, "backend"), { recursive: true });
  await fs.writeFile(path.join(app, "ui/index.html"), "<!doctype html><html><body>startup witness</body></html>");
  await fs.writeFile(path.join(app, "application.json"), JSON.stringify({ manifestVersion: "5", id: "fixture", name: "Fixture", ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "6" }, backend: { bundleManifest: "backend/bundle.json" }, executionResourceSlots: [], agentTools: [] }));
  await fs.writeFile(path.join(app, "backend/bundle.json"), JSON.stringify({ contractVersion: "1", entryModule: "backend/entry.mjs", moduleFormat: "esm", distribution: "self-contained", targetRuntime: { engine: "node", semver: ">=22 <23" }, sdkCompatibility: { backendDefinitionContractVersion: "7", frontendSdkContractVersion: "6" }, supportedExposures: { queries: false, commands: false, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
  await fs.writeFile(path.join(app, "backend/entry.mjs"), "export default {definitionContractVersion:'7'};\n");
  const entry = path.join(root, name);
  await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${JSON.stringify(pathToFileURL(path.resolve("dist/index.js")).href)};
    const options=${JSON.stringify({ packageRoot, localApplicationId: "fixture", appDataDir: root, host: "127.0.0.1", port: 0 })};
    ${body}
    process.exit(0);`);
  const running = start(entry);
  await waitFor(() => {
    if (running.child.exitCode !== null && running.child.exitCode !== 0) throw new Error(running.text());
    return running.child.exitCode === 0;
  }, `standalone ${name} successful exit`);
  return running.text();
};

const projectsDir = () => path.join(root, "projects");
const exists = (file: string) => fs.lstat(file).then(() => true, () => false);
/** Relative path → sha256 of every file under a directory (directories listed with a trailing slash). */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (current: string) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name), rel = path.relative(dir, full);
      if (entry.isDirectory()) { out[rel + "/"] = "dir"; await walk(full); }
      else out[rel] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(dir);
  return out;
};
const writeDraft = async (projectSegment: string, projectId: string, content: string) => {
  const draftId = randomUUID(), storedFilename = "ctx_aa11bb22cc33__draft-notes.txt";
  const dir = path.join(projectsDir(), "task_context_drafts", projectSegment, draftId);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, storedFilename), content);
  await fs.writeFile(path.join(dir, "manifest.json"), `${JSON.stringify({ projectId, draftId,
    files: [{ storedFilename, displayName: "draft-notes.txt", mimeType: "text/plain", sizeBytes: Buffer.byteLength(content) }] })}\n`);
  return { draftId, storedFilename };
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) await fs.rm(root, { recursive: true, force: true }); root = "";
});

describe("released Projects data is upgraded once at both actual startup entrypoints (SR-024)", () => {
  it("Studio: moves rows, saved files and drafts, retains the original, skips invalid/residue/duplicate/conflict, then no-ops on restart", async () => {
    await fs.access(path.resolve("dist/app.js"));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-startup-migration-"));
    await fs.mkdir(projectsDir()); await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    // Released rows: valid Project with saved files + DONE Task + invalid Task, unshipped dev residue row,
    // invalid row, duplicate id, a row without `tasks`, and the actual HEAD-writer released row.
    const rows = [
      ...JSON.parse(await fs.readFile(fixture("projects-per-folder-v1/released-with-context-drafts-and-residue.json"), "utf8")),
      ...JSON.parse(await fs.readFile(fixture("projects-released-array.json"), "utf8")),
    ];
    const sourceBytes = Buffer.from(JSON.stringify(rows, null, 2));
    await fs.writeFile(path.join(projectsDir(), "projects.json"), sourceBytes);
    await fs.mkdir(path.join(projectsDir(), "task_context_files/project_ctx/project_task_ctx"), { recursive: true });
    await fs.writeFile(path.join(projectsDir(), "task_context_files/project_ctx/project_task_ctx/ctx_0ad25cc6cad1__requirements.txt"), "requirements");
    const draft = await writeDraft("project_ctx", "project_ctx", "draft bytes before upgrade");
    // A different per-Project file already exists for `project_plain`: it must be preserved, not overwritten.
    const conflict = { projectId: "project_plain", name: "Already here", description: "pre-existing target", createdAt: "2026-09-02T00:00:00.000Z", updatedAt: "2026-09-02T00:00:00.000Z", workspaces: [] };
    await fs.mkdir(path.join(projectsDir(), "project_plain"));
    await fs.writeFile(path.join(projectsDir(), "project_plain/project.json"), JSON.stringify(conflict));
    const conflictBytes = await fs.readFile(path.join(projectsDir(), "project_plain/project.json"));

    const first = await studio();
    const record = await first.migration();
    expect(record).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    // Per-item dispositions are in the runner-owned attempt log (the summary is the short count line).
    const attemptLog = await fs.readFile(record.logPath, "utf8");
    for (const disposition of ["MIGRATED", "SKIPPED_TARGET_CONFLICT_WARNING", "SKIPPED_INVALID_ROW_WARNING",
      "SKIPPED_DUPLICATE_PROJECT_WARNING", "SKIPPED_INVALID_TASK_WARNING", "MISSING_CONTEXT_FILE_WARNING"]) {
      expect(attemptLog).toContain(disposition);
    }
    expect(attemptLog).not.toContain("dev-lifetime"); // unshipped dev residue is skipped silently
    // Retained original is the released file itself; released directories are gone once emptied.
    expect(await exists(path.join(projectsDir(), "projects.json"))).toBe(false);
    expect(await fs.readFile(path.join(projectsDir(), "projects.pre-folders.json"))).toEqual(sourceBytes);
    expect(await exists(path.join(projectsDir(), "task_context_files"))).toBe(false);
    expect(await exists(path.join(projectsDir(), "task_context_drafts"))).toBe(false);
    expect(await fs.readFile(path.join(projectsDir(), "project_plain/project.json"))).toEqual(conflictBytes);
    expect(JSON.parse(await fs.readFile(path.join(projectsDir(), "project_ctx/tasks/project_task_ctx/task.json"), "utf8")))
      .toMatchObject({ taskId: "project_task_ctx", projectId: "project_ctx", status: "IN_PROGRESS" });

    // Gate open: the Projects API serves the migrated data, saved files and the moved draft.
    const listed = await first.gql("{projects{projectId name taskCount}}");
    expect(listed.projects).toEqual(expect.arrayContaining([
      { projectId: "project_ctx", name: "With files", taskCount: 2 },
      { projectId: "project_plain", name: "Already here", taskCount: 0 },
      { projectId: "cf622a33-4f56-4208-9baa-851813ba9570", name: "Released array witness", taskCount: 1 },
    ]));
    expect(listed.projects).toHaveLength(3);
    const historicalFile = path.join(projectsDir(), "project_ctx/project.json");
    const historicalBytes = await fs.readFile(historicalFile, "utf8");
    expect(JSON.parse(historicalBytes).workspaces).toEqual(rows[0].workspaces); // old four-field output remains frozen
    expect((await first.gql('{project(projectId:"project_ctx"){workspaces{workspaceRootPath description availability}}}')).project.workspaces)
      .toEqual([{workspaceRootPath: "/work/site", description: "repo", availability: "UNREGISTERED"}]);
    expect(await fs.readFile(historicalFile, "utf8")).toBe(historicalBytes);
    const tasks = (await first.gql(`query($id:String!){projectTasks(projectId:$id){taskId status contextFiles{storedFilename}}}`, { id: "project_ctx" })).projectTasks;
    expect(tasks.map((t: { taskId: string; status: string }) => [t.taskId, t.status]).sort()).toEqual([["project_task_ctx", "IN_PROGRESS"], ["project_task_done", "DONE"]]);
    const saved = await fetch(`${first.origin}/rest/projects/project_ctx/tasks/project_task_ctx/context-files/ctx_0ad25cc6cad1__requirements.txt`);
    expect(saved.status).toBe(200); expect(await saved.text()).toBe("requirements");
    const draftFile = await fetch(`${first.origin}/rest/projects/project_ctx/task-context-drafts/${draft.draftId}/context-files/${draft.storedFilename}`);
    expect(draftFile.status).toBe(200); expect(await draftFile.text()).toBe("draft bytes before upgrade");
    const created = (await first.gql("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskId contextFiles{storedFilename}}}",
      { i: { projectId: "project_ctx", description: "Saved from a pre-upgrade draft", contextDraft: { draftId: draft.draftId, storedFilenames: [draft.storedFilename] } } })).createProjectTask;
    // Saving a draft gives the Task file its own stored name (normal save behavior); the bytes are the draft's.
    expect(created.contextFiles).toHaveLength(1);
    expect(created.contextFiles[0].storedFilename).toMatch(/^ctx_[0-9a-f]{12}__draft-notes\.txt$/);
    const fromDraft = await fetch(`${first.origin}/rest/projects/project_ctx/tasks/${created.taskId}/context-files/${created.contextFiles[0].storedFilename}`);
    expect(await fromDraft.text()).toBe("draft bytes before upgrade");
    await stop(first.child);

    // Repeat startup: recorded success is not rerun and nothing under projects/ changes.
    const before = await snapshot(projectsDir());
    const second = await studio();
    expect(await second.migration()).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    expect((await second.gql("{projects{projectId}}")).projects).toHaveLength(3);
    expect(await snapshot(projectsDir())).toEqual(before);
  }, 180_000);

  it("Studio: an unreadable source or a failed move keeps only Projects gated; a restart retries and completes without duplication", async () => {
    await fs.access(path.resolve("dist/app.js"));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-startup-migration-"));
    await fs.mkdir(projectsDir()); await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const source = path.join(projectsDir(), "projects.json");
    const assertGatedOnly = async (app: Awaited<ReturnType<typeof studio>>) => {
      // The list shows the clear upgrade error, never an empty list; coded Projects operations carry the code.
      const gated = await app.raw("{projects{projectId}}");
      expect(gated.data).toBeNull();
      expect(gated.errors?.[0]?.message).toBe("Projects data is being upgraded; restart the app to finish. Other features keep working.");
      const write = await app.raw(`mutation{createProject(input:{name:"During upgrade"}){projectId}}`);
      expect(write.errors?.[0]?.extensions?.code).toBe("PROJECTS_MIGRATION_PENDING");
      // No lockout: health, other GraphQL and the migration status keep working.
      expect((await fetch(`${app.origin}/rest/health`)).status).toBe(200);
      expect(Array.isArray((await app.gql("{agentDefinitions{id}}")).agentDefinitions)).toBe(true);
    };

    // 1. Unparsable released file: FAILED, source untouched, only Projects gated.
    await fs.writeFile(source, "[ not json");
    const broken = await studio();
    expect(await broken.migration()).toMatchObject({ status: "FAILED", attempts: 1 });
    await assertGatedOnly(broken);
    expect(await fs.readFile(source, "utf8")).toBe("[ not json");
    await stop(broken.child);

    // 2. A real partial move: the second Project's folder name is blocked by a file, so the first
    //    Project (with its saved files) moves and the run fails before retiring the source.
    const p1 = "project_partial_one", p2 = "project_partial_two", t1 = "project_task_partial_one";
    const rows = [
      { projectId: p1, name: "First", description: "", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", workspaces: [],
        tasks: [{ taskId: t1, description: "Has a file", status: "TODO", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z",
          contextFiles: [{ storedFilename: "ctx_0123456789ab__a.txt", displayName: "a.txt", mimeType: "text/plain", sizeBytes: 5 }] }] },
      { projectId: p2, name: "Second", description: "", createdAt: "2026-10-01T00:00:00.000Z", updatedAt: "2026-10-01T00:00:00.000Z", workspaces: [], tasks: [] },
    ];
    const sourceBytes = Buffer.from(JSON.stringify(rows));
    await fs.writeFile(source, sourceBytes);
    await fs.mkdir(path.join(projectsDir(), "task_context_files", p1, t1), { recursive: true });
    await fs.writeFile(path.join(projectsDir(), "task_context_files", p1, t1, "ctx_0123456789ab__a.txt"), "bytes");
    await fs.writeFile(path.join(projectsDir(), p2), "blocks the target folder");
    const partial = await studio();
    expect(await partial.migration()).toMatchObject({ status: "FAILED", attempts: 2 });
    await assertGatedOnly(partial);
    expect(await fs.readFile(source)).toEqual(sourceBytes);
    expect(await exists(path.join(projectsDir(), p1, "project.json"))).toBe(true);
    expect(await fs.readFile(path.join(projectsDir(), p1, "tasks", t1, "context", "ctx_0123456789ab__a.txt"), "utf8")).toBe("bytes");
    expect(await exists(path.join(projectsDir(), "task_context_files", p1, t1))).toBe(false);
    await stop(partial.child);

    // 3. Fix the blocker and restart: the retry recognizes the completed Project and finishes the rest.
    await fs.rm(path.join(projectsDir(), p2));
    const retried = await studio();
    expect(await retried.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 3 });
    expect(await exists(source)).toBe(false);
    expect(await fs.readFile(path.join(projectsDir(), "projects.pre-folders.json"))).toEqual(sourceBytes);
    expect((await retried.gql("{projects{projectId taskCount}}")).projects.sort((a: { projectId: string }, b: { projectId: string }) => a.projectId.localeCompare(b.projectId)))
      .toEqual([{ projectId: p1, taskCount: 1 }, { projectId: p2, taskCount: 0 }]);
    const file = await fetch(`${retried.origin}/rest/projects/${p1}/tasks/${t1}/context-files/ctx_0123456789ab__a.txt`);
    expect(await file.text()).toBe("bytes");
    expect(await fs.readdir(path.join(projectsDir(), p1, "tasks"))).toEqual([t1]);
    expect(await exists(path.join(projectsDir(), "task_context_files"))).toBe(false);
  }, 180_000);

  it("Standalone host: never locked out by a broken source, migrates once on a valid one, composes per start and releases on close", async () => {
    await fs.access(path.resolve("dist/index.js"));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-startup-migration-"));
    await fs.mkdir(projectsDir()); await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const source = path.join(projectsDir(), "projects.json");
    const healthyStartClose = `for (const round of [1, 2]) {
        const host=await startStandaloneApplicationHost(options);
        if((await fetch(host.url+'/_autobyteus/health')).status!==200)throw Error('Health failed');
        await host.close();console.log('STANDALONE_CLOSED_'+round);
      }`;

    // A broken released file never stops the host from starting (no lockout); the source is untouched.
    await fs.writeFile(source, "{ broken");
    expect(await standaloneEntry("broken.mjs", healthyStartClose)).toContain("STANDALONE_CLOSED_2");
    expect(await fs.readFile(source, "utf8")).toBe("{ broken");

    // The actual released-writer bytes migrate at host startup. Two starts in one process also prove that
    // each start composes the one process Task binding and close releases it (a leak fails the second start).
    const sourceBytes = await fs.readFile(fixture("projects-released-array.json"));
    await fs.writeFile(source, sourceBytes);
    const draft = await writeDraft("cf622a33-4f56-4208-9baa-851813ba9570", "cf622a33-4f56-4208-9baa-851813ba9570", "standalone draft");
    const text = await standaloneEntry("valid.mjs", healthyStartClose);
    expect(text).toContain("STANDALONE_CLOSED_1"); expect(text).toContain("STANDALONE_CLOSED_2");
    const pid = "cf622a33-4f56-4208-9baa-851813ba9570", tid = "f6d550e5-22d0-4aca-a4d3-8413a735546b";
    expect(await exists(source)).toBe(false);
    expect(await fs.readFile(path.join(projectsDir(), "projects.pre-folders.json"))).toEqual(sourceBytes);
    expect(JSON.parse(await fs.readFile(path.join(projectsDir(), pid, "tasks", tid, "task.json"), "utf8")))
      .toEqual({ taskId: tid, projectId: pid, description: "Saved task from HEAD writer", status: "TODO",
        createdAt: "2026-10-02T00:00:00.000Z", updatedAt: "2026-10-02T00:00:00.000Z", contextFiles: [] });
    expect(await fs.readFile(path.join(projectsDir(), pid, "drafts", draft.draftId, draft.storedFilename), "utf8")).toBe("standalone draft");
    expect(await exists(path.join(projectsDir(), "task_context_drafts"))).toBe(false);

    // Studio on the same data sees the recorded result (no rerun) and the ordinary first write lands in task.json.
    const app = await studio();
    // Two FAILED attempts (broken source, two starts), then one SUCCEEDED attempt; later starts do not rerun.
    expect(await app.migration()).toMatchObject({ status: "SUCCEEDED", attempts: 3 });
    const read = await app.gql(`query($id:String!){projects{projectId name taskCount} projectTasks(projectId:$id){taskId description status}}`, { id: pid });
    expect(read.projects).toEqual([{ projectId: pid, name: "Released array witness", taskCount: 1 }]);
    expect(read.projectTasks).toEqual([{ taskId: tid, description: "Saved task from HEAD writer", status: "TODO" }]);
    await app.gql(`mutation($i:UpdateProjectTaskInput!){updateProjectTask(input:$i){taskId}}`, { i: { projectId: pid, taskId: tid, description: "Ordinary first metadata write" } });
    expect(JSON.parse(await fs.readFile(path.join(projectsDir(), pid, "tasks", tid, "task.json"), "utf8")).description).toBe("Ordinary first metadata write");
    expect(await fs.readFile(path.join(projectsDir(), "projects.pre-folders.json"))).toEqual(sourceBytes);
  }, 180_000);
  it.each(["Studio", "Standalone"])("%s: existing per-folder path supersets start/read without rewriting; ordinary Save alone removes extras", async entry => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-current-startup-"));
    await fs.mkdir(projectsDir()); await fs.mkdir(path.join(root, "home"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const {tasks: _tasks, ...historical} = JSON.parse(await fs.readFile(fixture("projects-per-folder-v1/released-with-context-drafts-and-residue.json"), "utf8"))[0];
    const file = path.join(projectsDir(), historical.projectId, "project.json");
    await fs.mkdir(path.dirname(file));
    const original = JSON.stringify(historical, null, 2) + "\n";
    await fs.writeFile(file, original);
    const before = await snapshot(projectsDir());
    if (entry === "Standalone") {
      expect(await standaloneEntry("current.mjs", `const host=await startStandaloneApplicationHost(options);
        if((await fetch(host.url+'/_autobyteus/health')).status!==200)throw Error('Health failed');
        await host.close();console.log('CURRENT_CLOSED');`)).toContain("CURRENT_CLOSED");
      expect(await snapshot(projectsDir())).toEqual(before);
    }
    const first = await studio();
    const query = 'query($id:String!){project(projectId:$id){projectId workspaces{workspaceRootPath description availability}}}';
    const expected = {projectId: historical.projectId, workspaces: [{workspaceRootPath: "/work/site", description: "repo", availability: "UNREGISTERED"}]};
    expect((await first.gql(query, {id: historical.projectId})).project).toEqual(expected);
    expect(await snapshot(projectsDir())).toEqual(before);
    await stop(first.child);
    const second = await studio();
    expect((await second.gql(query, {id: historical.projectId})).project).toEqual(expected);
    expect(await fs.readFile(file, "utf8")).toBe(original);
    await second.gql('mutation($i:UpdateProjectInput!){updateProject(input:$i){projectId}}', {i: {projectId: historical.projectId, name: historical.name, description: "Ordinary save"}});
    expect(JSON.parse(await fs.readFile(file, "utf8")).workspaces).toEqual([{workspaceRootPath: "/work/site", description: "repo"}]);
    expect(await exists(path.join(projectsDir(), "projects.pre-folders.json"))).toBe(false); // no new conversion/sweep
  }, 180_000);

});
