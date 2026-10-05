import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn, type ChildProcess } from "node:child_process";
import { fileURLToPath, pathToFileURL } from "node:url";
import { afterEach, describe, expect, it } from "vitest";

// Actual current built Studio + standalone startup entrypoints, repository migrations,
// HTTP and Project writer. No startup/Store/migration/provider doubles or model request.
// Prerequisite: pnpm -C autobyteus-server-ts build (TESTING.md process-E2E surface).
// Fixture bytes were emitted by ProjectStore.updateRecords at HEAD 806907fa;
// see ../fixtures/projects-released-array.provenance.json. This is current-array
// direct usability, not a compatibility branch, automatic migration or version format.
const fixture = fileURLToPath(new URL("../../fixtures/projects-released-array.json", import.meta.url));
const projectId = "cf622a33-4f56-4208-9baa-851813ba9570";
const taskId = "f6d550e5-22d0-4aca-a4d3-8413a735546b";
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
  // Do not inherit AUTOBYTEUS_*, provider credentials, database/logging overrides,
  // or package discovery. Only this test-owned root is an operational database.
  const env: NodeJS.ProcessEnv = Object.fromEntries(
    ["HOME", "PATH", "USER", "LANG", "LC_ALL", "TMPDIR", "SHELL", "TERM"]
      .flatMap(key => process.env[key] === undefined ? [] : [[key, process.env[key]]]),
  );
  Object.assign(env, { DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
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
const studio = async () => {
  const running = start(path.resolve("dist/app.js"), ["--data-dir", root, "--host", "127.0.0.1", "--port", "0"]);
  await waitFor(() => { running.assertAlive(); return running.text().includes("Server listening on 127.0.0.1:0"); }, "Studio readiness");
  const origin = [...running.text().matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  expect((await fetch(`${origin}/rest/health`)).status).toBe(200);
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    expect(response.status).toBe(200);
    const result = await response.json() as { errors?: unknown; data: any };
    expect(result.errors).toBeUndefined(); return result.data;
  };
  return { child: running.child, gql };
};
afterEach(async () => {
  for (const child of children.splice(0)) await stop(child);
  logs.splice(0);
  if (root) await fs.rm(root, { recursive: true, force: true }); root = "";
});

describe("released-writer array directly usable at both actual startup boundaries", () => {
  it("does not rewrite on Studio reads/restart or standalone startup; ordinary authoring is the first write", async () => {
    await fs.access(path.resolve("dist/app.js")); await fs.access(path.resolve("dist/index.js"));
    root = await fs.mkdtemp(path.join(os.tmpdir(), "project-startup-no-write-"));
    const directory = path.join(root, "projects"), file = path.join(directory, "projects.json");
    await fs.mkdir(directory);
    const bytes = await fs.readFile(fixture); await fs.writeFile(file, bytes);
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const before = await fs.stat(file);
    const assertUnchanged = async () => {
      expect(await fs.readFile(file)).toEqual(bytes);
      const current = await fs.stat(file);
      expect(current.mtimeMs).toBe(before.mtimeMs); expect(current.ino).toBe(before.ino);
      expect(await fs.readdir(directory)).toEqual(["projects.json"]);
    };
    const first = await studio();
    const read = await first.gql(`query($id:String!){projects{projectId name taskCount} projectTasks(projectId:$id){taskId description status contextFiles{storedFilename}}}`, { id: projectId });
    expect(read.projects).toEqual([{ projectId, name: "Released array witness", taskCount: 1 }]);
    expect(read.projectTasks).toEqual([{ taskId, description: "Saved task from HEAD writer", status: "TODO", contextFiles: [] }]);
    await assertUnchanged(); await stop(first.child);

    const packageRoot = path.join(root, "host-fixture-package"), app = path.join(packageRoot, "applications", "fixture");
    await fs.mkdir(path.join(app, "ui"), { recursive: true }); await fs.mkdir(path.join(app, "backend"));
    await fs.writeFile(path.join(app, "ui/index.html"), "<!doctype html><html><body>startup witness</body></html>");
    await fs.writeFile(path.join(app, "application.json"), JSON.stringify({ manifestVersion: "5", id: "fixture", name: "Fixture", ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "6" }, backend: { bundleManifest: "backend/bundle.json" }, executionResourceSlots: [], agentTools: [] }));
    await fs.writeFile(path.join(app, "backend/bundle.json"), JSON.stringify({ contractVersion: "1", entryModule: "backend/entry.mjs", moduleFormat: "esm", distribution: "self-contained", targetRuntime: { engine: "node", semver: ">=22 <23" }, sdkCompatibility: { backendDefinitionContractVersion: "7", frontendSdkContractVersion: "6" }, supportedExposures: { queries: false, commands: false, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
    await fs.writeFile(path.join(app, "backend/entry.mjs"), "export default {definitionContractVersion:'7'};\n");
    const entry = path.join(root, "standalone.mjs");
    await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${JSON.stringify(pathToFileURL(path.resolve("dist/index.js")).href)};
      const host=await startStandaloneApplicationHost(${JSON.stringify({ packageRoot, localApplicationId: "fixture", appDataDir: root, host: "127.0.0.1", port: 0 })});
      if((await fetch(host.url+'/_autobyteus/health')).status!==200)throw Error('Health failed');
      await host.close();console.log('PROJECT_STARTUP_STANDALONE_ADMITTED');process.exit(0);`);
    const standalone = start(entry);
    await waitFor(() => {
      if (standalone.child.exitCode !== null && standalone.child.exitCode !== 0) throw new Error(standalone.text());
      return standalone.child.exitCode === 0;
    }, "standalone successful exit");
    expect(standalone.text()).toContain("PROJECT_STARTUP_STANDALONE_ADMITTED"); await assertUnchanged();

    const second = await studio(); await assertUnchanged();
    const updated = await second.gql(`mutation($i:UpdateProjectTaskInput!){updateProjectTask(input:$i){taskId description status}}`, { i: { projectId, taskId, description: "Ordinary first metadata write" } });
    expect(updated.updateProjectTask).toEqual({ taskId, description: "Ordinary first metadata write", status: "TODO" });
    const physical = JSON.parse(await fs.readFile(file, "utf8"));
    expect(Array.isArray(physical)).toBe(true); expect(physical).toHaveLength(1);
    expect(physical[0].tasks[0].description).toBe("Ordinary first metadata write");
    expect(physical[0]).not.toHaveProperty("taskLifetimes");
    // This first metadata write has no dispatch, therefore no lifetime collection.
    // Linked lifetime append/atomic Done remain separate service/runtime journeys.
  }, 150_000);
});
