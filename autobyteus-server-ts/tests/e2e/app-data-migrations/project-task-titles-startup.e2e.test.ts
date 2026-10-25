import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { once } from "node:events";
import { createHash } from "node:crypto";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { afterEach, describe, expect, it } from "vitest";

// autobyteus-260 REQ-005, AC-004, QR-002: released Project Tasks get their title at startup, through the actual built
// Studio entrypoint (`dist/app.js`), the repository migration runner and ledger, the per-Project store, GraphQL and the
// built native `list_project_tasks` tool. No startup, store, migration or provider doubles; no model.
// The data root is synthesized with the released structure (the key sets of `SD-task-file-shape-inventory`, no user data):
// - Project "main" (keyed, as `project-task-keys-v1` left it): one Task of each of the four released Task shapes, one whose
//   first line is longer than 200 characters with an astral character across the cut, one with a CRLF first line after
//   blank lines, one whose description has no non-empty line, and a `task.json` the released reader already skipped;
// - Project "fresh" (released per-folder, no keys yet): keys-v1 runs first, then the titles migration titles its Task;
// - two Temp tasks (`ad-hoc-tasks/`), which have no title and are untouched.
// Then: each released Task has the title of its first non-empty line (≤ 200 characters, "…" when cut), every other key and
// value is unchanged, GraphQL and the agent tools show the titles, the two unconvertible files are unchanged and startup
// did not stop; a second start changes no byte and does not run the migration again.
// Prerequisite: pnpm -C autobyteus-server-ts build (current dist; a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/project-task-titles-startup.e2e.test.ts --no-watch
const TITLES = "20261025_project_task_titles";
const KEYS = "20261017_project_task_keys_v1";
const writer = path.resolve("tests/fixtures/project-task-tool-writer.mjs");
const run = promisify(execFile);

let root = "";
const children: ChildProcess[] = [];
const logs: string[] = [];

const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-4000)}`);
};
const stop = async (child: ChildProcess) => {
  if (child.exitCode !== null || child.signalCode !== null) return;
  const exited = once(child, "exit");
  child.kill("SIGTERM");
  const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
  try { await exited; } finally { clearTimeout(force); }
};
/** Only this test-owned root: private HOME and database; no inherited AUTOBYTEUS_* or provider values. */
const environment = (): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
    .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  return Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    AUTOBYTEUS_AGENT_PACKAGE_ROOTS: "", LMSTUDIO_HOSTS: "http://127.0.0.1:1" });
};
const studio = async () => {
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"],
    { env: environment(), stdio: ["ignore", "pipe", "pipe"] });
  children.push(child); const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Startup exited: ${logs[index]}`);
    return logs[index]!.includes("Server listening on 127.0.0.1:0");
  }, "Studio readiness");
  const origin = [...logs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data: any; errors?: unknown[] };
    expect(response.status).toBe(200); expect(body.errors).toBeUndefined();
    return body.data;
  };
  const ledger = async (id: string) => (await gql("{getAppDataMigrations{migrationId status attempts summary logPath}}"))
    .getAppDataMigrations.find((m: { migrationId: string }) => m.migrationId === id);
  return { child, origin, gql, ledger, output: () => logs[index]! };
};
/** The built native agent tool, run against the stopped server's data root (as the agent's runtime reads it). */
const tool = async (name: string, args: Record<string, unknown>) => {
  const output = path.join(root, `tool-${name}-${Date.now()}.json`);
  await run(process.execPath, [writer, root, name, JSON.stringify(args), output], { env: environment(), cwd: path.resolve(".") });
  return JSON.parse(await fs.readFile(output, "utf8"));
};
const sha = async (file: string) => createHash("sha256").update(await fs.readFile(file)).digest("hex");
/** Relative path → sha256 of every file under a directory (directories listed with a trailing slash). */
const snapshot = async (dir: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (current: string) => {
    for (const entry of await fs.readdir(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name), rel = path.relative(dir, full);
      if (entry.isDirectory()) { out[rel + "/"] = "dir"; await walk(full); }
      else out[rel] = await sha(full);
    }
  };
  await walk(dir);
  return out;
};
const writeJson = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, `${JSON.stringify(value, null, 2)}\n`);
};

afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) await fs.rm(root, { recursive: true, force: true }); root = "";
});

describe("released Project Tasks get titles at the actual startup (autobyteus-260 project-task-titles)", () => {
  it("TTL-E2E-001 Studio: every released shape is titled from its first line, nothing else changes, unconvertible files stay, a second start is a no-op", async () => {
    await fs.access(path.resolve("dist/app.js"));
    root = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "project-task-titles-startup-")));
    await fs.mkdir(path.join(root, "home")); await fs.mkdir(path.join(root, "db"));
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const projects = path.join(root, "projects");
    const taskFile = (projectId: string, taskId: string) => path.join(projects, projectId, "tasks", taskId, "task.json");
    const at = (minute: number) => `2026-10-20T08:${String(minute).padStart(2, "0")}:00.000Z`;
    const released = (taskId: string, taskKey: string, description: string, minute: number, extra: Record<string, unknown> = {}) =>
      ({ taskId, projectId: "project_main", taskKey, description, status: "TODO", createdAt: at(minute), updatedAt: at(minute), contextFiles: [], ...extra });
    const longLine = `${"Migrate the board to the new store ".repeat(6).slice(0, 198)}😀 and the rest of this long first line`;
    const tasks: Record<string, Record<string, unknown>> = {
      // Shape 1: contextFiles, createdAt, description, projectId, status, taskId, taskKey, updatedAt (with a saved file).
      task_s1: released("task_s1", "autobyteus-1", "Fix the login redirect\nThe session is lost after refresh.", 1, { status: "IN_PROGRESS",
        contextFiles: [{ storedFilename: "ctx_0a1b2c3d4e5f__notes.txt", displayName: "notes.txt", mimeType: "text/plain", sizeBytes: 11 }] }),
      // Shape 2: + dependsOnTaskIds, partOfTaskId.
      task_s2: released("task_s2", "autobyteus-2", "Ship the release notes", 2, { dependsOnTaskIds: ["task_s1"], partOfTaskId: null }),
      // Shape 3: + dependsOnTaskIds.
      task_s3: released("task_s3", "autobyteus-3", "Write the docs\n\nWith a second paragraph.", 3, { status: "DONE", dependsOnTaskIds: [] }),
      // Shape 4: comments, contextFiles, createdAt, dependsOnTaskIds, description, partOfTaskId, … (a part with comments).
      task_s4: released("task_s4", "autobyteus-4", "Review the API\nCheck every route.", 4, { dependsOnTaskIds: ["task_s2"], partOfTaskId: "task_s2",
        comments: [{ id: 1, createdAt: at(10), text: "First comment" }, { id: 2, createdAt: at(11), text: "Second comment" }] }),
      task_long: released("task_long", "autobyteus-5", `${longLine}\nSecond line.`, 5, { dependsOnTaskIds: [], partOfTaskId: null }),
      task_crlf: released("task_crlf", "autobyteus-6", "\r\n   \r\n  Plan the beta  \r\nDetails.", 6),
      task_blank: released("task_blank", "autobyteus-7", " \n\t\n ", 7),
    };
    await writeJson(path.join(projects, "project_main/project.json"), { projectId: "project_main", name: "AutoByteus", description: "",
      createdAt: at(0), updatedAt: at(0), workspaces: [], taskKeys: { prefix: "autobyteus", lastNumber: 7 } });
    for (const [taskId, task] of Object.entries(tasks)) await writeJson(taskFile("project_main", taskId), task);
    await fs.mkdir(path.join(projects, "project_main/tasks/task_s1/context"), { recursive: true });
    await fs.writeFile(path.join(projects, "project_main/tasks/task_s1/context/ctx_0a1b2c3d4e5f__notes.txt"), "saved bytes");
    // A task.json the released reader already skipped (a status no release wrote): not a Task before, preserved unchanged now.
    await writeJson(taskFile("project_main", "task_invalid"), { taskId: "task_invalid", projectId: "project_main", taskKey: "autobyteus-9", description: "Bad status", status: "OPEN", createdAt: at(8), updatedAt: at(8) });
    // A released per-folder Project from before Task keys.
    await writeJson(path.join(projects, "project_fresh/project.json"), { projectId: "project_fresh", name: "Fresh Board", description: "", createdAt: at(20), updatedAt: at(20), workspaces: [] });
    await writeJson(taskFile("project_fresh", "task_fresh"), { taskId: "task_fresh", projectId: "project_fresh", description: "Unkeyed Task\nbody", status: "TODO", createdAt: at(21), updatedAt: at(21), contextFiles: [] });
    // Temp tasks (no Project): untouched.
    for (const id of ["ad_hoc_task_one", "ad_hoc_task_two"]) {
      await writeJson(path.join(root, "ad-hoc-tasks", id, "task.json"), { taskId: id, description: `Check the links (${id}).\nReport.`, status: "TODO", createdAt: at(30), updatedAt: at(30), referenceFiles: [] });
    }
    const unchangedBefore = { invalid: await sha(taskFile("project_main", "task_invalid")), blank: await sha(taskFile("project_main", "task_blank")),
      adHoc: await snapshot(path.join(root, "ad-hoc-tasks")) };

    const first = await studio();
    expect(await first.ledger(KEYS)).toMatchObject({ status: "SUCCEEDED" });
    const titles = await first.ledger(TITLES);
    // The Task with a blank description and the invalid file are reported and left unchanged.
    expect(titles).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1, summary: "Scanned 9; migrated 7; skipped 2; failed 0." });
    // The migration log names the skipped Tasks: the frozen validator refuses a blank description and an unknown status.
    const log = await fs.readFile(titles.logPath, "utf8");
    expect(log).toContain("SKIPPED_INVALID_TASK_WARNING");
    expect(log).toContain("project_main/task_blank");
    expect(log).toContain("project_main/task_invalid");
    const expectedTitles: Record<string, string> = { task_s1: "Fix the login redirect", task_s2: "Ship the release notes", task_s3: "Write the docs",
      task_s4: "Review the API", task_long: `${longLine.slice(0, 198)}…`, task_crlf: "Plan the beta" };
    // The cut never ends on half a surrogate pair: 199 code units would split the emoji, so 198 are kept.
    expect(longLine.charCodeAt(198)).toBeGreaterThanOrEqual(0xd800);
    expect(expectedTitles.task_long!.length).toBe(199);
    // Each file gained only its title.
    for (const [taskId, title] of Object.entries(expectedTitles)) {
      expect(JSON.parse(await fs.readFile(taskFile("project_main", taskId), "utf8")), taskId).toEqual({ ...tasks[taskId], title });
    }
    expect(JSON.parse(await fs.readFile(taskFile("project_fresh", "task_fresh"), "utf8"))).toEqual({ taskId: "task_fresh", projectId: "project_fresh",
      description: "Unkeyed Task\nbody", status: "TODO", createdAt: at(21), updatedAt: at(21), contextFiles: [], taskKey: "fresh-board-1", title: "Unkeyed Task" });
    expect(await sha(taskFile("project_main", "task_invalid"))).toBe(unchangedBefore.invalid);
    expect(await sha(taskFile("project_main", "task_blank"))).toBe(unchangedBefore.blank);
    expect(await snapshot(path.join(root, "ad-hoc-tasks"))).toEqual(unchangedBefore.adHoc);
    expect(await fs.readFile(path.join(projects, "project_main/tasks/task_s1/context/ctx_0a1b2c3d4e5f__notes.txt"), "utf8")).toBe("saved bytes");

    // GraphQL reads the titles; everything else is as saved. The unconvertible Task is the only one not listed.
    const listed = (await first.gql(`query($id:String!){projectTasks(projectId:$id){taskId taskKey title description status dependsOnTaskIds partOfTaskId
      comments{id createdAt text} contextFiles{storedFilename displayName mimeType sizeBytes} createdAt updatedAt}}`, { id: "project_main" })).projectTasks;
    expect(Object.fromEntries(listed.map((t: { taskId: string; title: string }) => [t.taskId, t.title]))).toEqual(expectedTitles);
    for (const task of listed) {
      const saved = tasks[task.taskId]!;
      expect(task, task.taskId).toEqual({ taskId: saved.taskId, taskKey: saved.taskKey, title: expectedTitles[task.taskId], description: saved.description,
        status: saved.status, dependsOnTaskIds: saved.dependsOnTaskIds ?? [], partOfTaskId: saved.partOfTaskId ?? null, comments: saved.comments ?? [],
        contextFiles: saved.contextFiles, createdAt: saved.createdAt, updatedAt: saved.updatedAt });
    }
    expect((await first.gql("{tasksWithoutProject{taskId description}}")).tasksWithoutProject.map((t: { taskId: string }) => t.taskId).sort())
      .toEqual(["ad_hoc_task_one", "ad_hoc_task_two"]);
    // Startup was not stopped: new work goes on, with a title.
    const created = (await first.gql("mutation($i:CreateProjectTaskInput!){createProjectTask(input:$i){taskKey title}}",
      { i: { projectId: "project_main", title: "After the upgrade", description: "New work" } })).createProjectTask;
    expect(created).toEqual({ taskKey: "autobyteus-8", title: "After the upgrade" });
    await stop(first.child);

    // The agents' tools read the migrated Tasks (the built native tools on the same data).
    const list = await tool("list_project_tasks", { project_id: "project_main" });
    expect(list.projectId).toBe("project_main");
    expect(Object.fromEntries(list.tasks.map((t: { taskId: string; title: string }) => [t.taskId, t.title]))).toEqual({
      "autobyteus-1": "Fix the login redirect", "autobyteus-2": "Ship the release notes", "autobyteus-3": "Write the docs", "autobyteus-4": "Review the API",
      "autobyteus-5": expectedTitles.task_long, "autobyteus-6": "Plan the beta", "autobyteus-8": "After the upgrade" });
    expect(list.tasks.find((t: { taskId: string }) => t.taskId === "autobyteus-4")).toEqual({ taskId: "autobyteus-4", title: "Review the API", status: "TODO",
      dependsOn: ["autobyteus-2"], partOf: "autobyteus-2", commentCount: 2 });

    // A second start: the ledger keeps the one attempt and no byte of the Projects data changes.
    const before = await snapshot(projects);
    const second = await studio();
    expect(await second.ledger(TITLES)).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    expect(await snapshot(projects)).toEqual(before);
    await stop(second.child);
  }, 180_000);
});
