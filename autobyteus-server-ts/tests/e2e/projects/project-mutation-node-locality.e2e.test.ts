import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import {spawn, execFile, type ChildProcess} from "node:child_process";
import {once} from "node:events";
import {promisify} from "node:util";
import {expect, it} from "vitest";

// Prerequisite: current-worktree server prebuild + build. Never use installed binaries.
// Two real built-process Studio/HTTP/MCP/SQLite nodes, private HOME/data/free ports.
// Normal public workspace registration; session selection is scripted, no model or UI.
class NodeFixture {
  root = ""; origin = ""; mcpUrl = ""; logs = "";
  child: ChildProcess | null = null;
  async setup() {
    this.root = await fs.mkdtemp(path.join(os.tmpdir(), "project-mutation-node-"));
    await fs.mkdir(path.join(this.root, "home"));
    await fs.writeFile(path.join(this.root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    await fs.mkdir(path.join(this.root, "db"));
    // Use the project's current Prisma migration surface, not copied developer state.
    const env = this.environment();
    await promisify(execFile)(process.execPath, [path.resolve("node_modules/prisma/build/index.js"), "migrate", "deploy", "--schema", "prisma/schema.prisma"], {env});
    await this.start();
  }
  environment(): NodeJS.ProcessEnv {
    // Minimal environment: no host secrets/provider configuration/package discovery.
    return {PATH: process.env.PATH, HOME: path.join(this.root, "home"), APP_ENV: "test",
      DATABASE_URL: `file:${path.join(this.root, "db", "test.db")}`,
      AUTOBYTEUS_TEMP_WORKSPACE_DIR: path.join(this.root, "temp_workspace"), AUTOBYTEUS_AGENT_PACKAGE_ROOTS: ""};
  }
  async start() {
    await fs.access(path.resolve("dist/compositions/build-studio-server.js"));
    const child = this.child = spawn(process.execPath, ["tests/fixtures/project-mutation-http-node.mjs", this.root], {
      cwd: process.cwd(), env: this.environment(), stdio: ["ignore", "pipe", "pipe", "ipc"],
    });
    child.stdout!.on("data", data => {this.logs += String(data);});
    child.stderr!.on("data", data => {this.logs += String(data);});
    const info = await new Promise<{origin: string; mcpUrl: string}>((resolve, reject) => {
      const timer = setTimeout(() => finish(new Error(`Startup timeout: ${this.logs}`)), 60_000);
      const exited = (code: number | null) => finish(new Error(`Startup exit ${code}: ${this.logs}`));
      const errored = (error: Error) => finish(error);
      const message = (value: unknown) => finish(null, value as {origin: string; mcpUrl: string});
      function finish(error: Error | null, value?: {origin: string; mcpUrl: string}) {
        clearTimeout(timer); child.off("exit", exited); child.off("error", errored); child.off("message", message);
        if (error) reject(error); else resolve(value!);
      }
      child.once("exit", exited); child.once("error", errored); child.once("message", message);
    });
    this.origin = info.origin; this.mcpUrl = info.mcpUrl;
    expect((await fetch(`${this.origin}/rest/health`)).status).toBe(200);
  }
  async stop() {
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exit = once(child, "exit"); child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 10_000);
    try { await exit; expect(child.exitCode, this.logs).toBe(0); } finally {clearTimeout(force);}
    // Both public and private listeners must be gone before restart/removal.
    for (const url of [this.origin, this.mcpUrl]) {
      if (url) await expect(fetch(url, {signal: AbortSignal.timeout(1500)})).rejects.toThrow();
    }
    this.child = null;
  }
  async cleanup() {
    try {await this.stop();} finally {
      if (this.root) {await fs.rm(this.root, {recursive: true, force: true}); await expect(fs.stat(this.root)).rejects.toMatchObject({code: "ENOENT"});}
    }
  }
  async gql<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
    const response = await fetch(`${this.origin}/graphql`, {method: "POST", headers: {"content-type": "application/json"}, body: JSON.stringify({query, variables})});
    expect(response.status).toBe(200); const body = await response.json(); expect(body.errors, JSON.stringify(body)).toBeUndefined(); return body.data as T;
  }
  async call(name: string, args: unknown) {
    const response = await fetch(this.mcpUrl, {method: "POST", headers: {"content-type": "application/json", accept: "application/json"}, body: JSON.stringify({jsonrpc: "2.0", id: 1, method: "tools/call", params: {name, arguments: args}})});
    expect(response.status).toBe(200); const body = await response.json(); expect(body.error).toBeUndefined();
    expect(JSON.parse(body.result.content[0].text)).toEqual(body.result.structuredContent); return body.result;
  }
}

it("E-008: separate built nodes cannot patch/link remote identities; local saved Project and registry survive restart", async () => {
  const a = new NodeFixture(), b = new NodeFixture();
  try {
    await a.setup(); await b.setup();
    const definitions = await a.gql<{agentDefinitions: Array<{name: string; toolNames: string[]; instructions: string}>}>("{agentDefinitions{name toolNames instructions}}");
    const manager = definitions.agentDefinitions.find(d => d.name === "Project Task Manager");
    expect(manager).toBeDefined();
    expect(manager!.toolNames).toEqual(["list_projects", "list_project_tasks", "create_or_update_project", "create_or_update_task", "list_available_agents", "delegate_task", "send_message_to", "read_file"]);
    expect(manager!.instructions).toContain("create_or_update_project");
    const rootPath = path.join(a.root, "registered-source"); await fs.mkdir(rootPath); await fs.writeFile(path.join(rootPath, "source.txt"), "owned source");
    const {createWorkspace: ws} = await a.gql<{createWorkspace: {workspaceId: string; workspaceRootPath: string}}>(
      "mutation($i:CreateWorkspaceInput!){createWorkspace(input:$i){workspaceId workspaceRootPath}}", {i: {rootPath}});
    const created = await a.call("create_or_update_project", {name: "Node local", description: "Saved goal", workspaces: [{workspace_id: ws.workspaceId, description: "Source"}]});
    expect(created.isError).not.toBe(true); const projectId = created.structuredContent.project.projectId as string;
    const query = "query($id:String!){project(projectId:$id){projectId name description createdAt updatedAt workspaces{workspaceId workspaceRootPath description addedAt availability}}}";
    const saved = await a.gql<{project: Record<string, unknown>}>(query, {id: projectId});
    expect(saved.project).toMatchObject({...created.structuredContent.project, workspaces: [{...ws, description: "Source", availability: "AVAILABLE", addedAt: expect.any(String)}]});
    expect(await b.gql(query, {id: projectId})).toEqual({project: null});
    expect((await b.call("list_projects", {})).structuredContent).toEqual({projects: []});
    const rejectedPatch = await b.call("create_or_update_project", {project_id: projectId, name: "No remote upsert"});
    expect(rejectedPatch).toMatchObject({isError: true, structuredContent: {error: {code: "PROJECT_NOT_FOUND"}}});
    const rejectedLink = await b.call("create_or_update_project", {name: "No remote registration", workspaces: [{workspace_id: ws.workspaceId}]});
    expect(rejectedLink).toMatchObject({isError: true, structuredContent: {error: {code: "WORKSPACE_NOT_REGISTERED"}}});
    expect((await b.call("list_projects", {})).structuredContent.projects).toEqual([]);
    // Names are node-local, not globally reserved.
    const localB = await b.call("create_or_update_project", {name: "Node local"});
    expect(localB.isError).not.toBe(true); expect(localB.structuredContent.project.projectId).not.toBe(projectId);
    expect(await a.gql(query, {id: projectId})).toEqual(saved);
    const recordPath = path.join(a.root, "projects", projectId, "project.json");
    const recordBytes = await fs.readFile(recordPath, "utf8"), registry = await fs.readFile(path.join(a.root, "workspaces.json"), "utf8");
    await a.stop(); await a.start();
    expect(await a.gql(query, {id: projectId})).toEqual(saved);
    expect(await fs.readFile(recordPath, "utf8")).toBe(recordBytes);
    expect(await fs.readFile(path.join(a.root, "workspaces.json"), "utf8")).toBe(registry);
    const patched = await a.call("create_or_update_project", {project_id: projectId, description: "After restart"});
    expect(patched).toMatchObject({structuredContent: {project: {projectId, name: "Node local", description: "After restart", workspaces: [{workspaceId: ws.workspaceId, description: "Source"}]}}});
    expect(await fs.readFile(path.join(rootPath, "source.txt"), "utf8")).toBe("owned source");
    expect(await b.gql(query, {id: projectId})).toEqual({project: null});
    console.info("Built-node HTTP receipt", JSON.stringify({nodeA: a.origin, nodeB: b.origin, projectId, workspaceId: ws.workspaceId,
      savedBeforeRestart: saved.project, remotePatch: rejectedPatch.structuredContent, remoteLink: rejectedLink.structuredContent,
      afterRestart: patched.structuredContent, managerToolNames: manager!.toolNames}));
  } finally {
    // Attempt both cleanups even if either one fails.
    const cleanup = await Promise.allSettled([a.cleanup(), b.cleanup()]);
    for (const result of cleanup) if (result.status === "rejected") throw result.reason;
    console.info("Owned built-node cleanup: both children exited 0; four listeners closed; both private roots removed.");
  }
}, 180_000);
