import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import http from "node:http";
import { execFile, spawn, type ChildProcess } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
import { once } from "node:events";
import { randomUUID } from "node:crypto";
import WebSocket from "ws";
import { expect } from "vitest";
import { sendE2eSendMessageCommand } from "./websocket-command-helpers.js";

export type Attachment = { storedFilename: string; displayName: string; locator: string; phase: string };
export type Event = { type: string; payload: Record<string, any> };
export const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aS1sAAAAASUVORK5CYII=", "base64");
export const until = async (check: () => boolean | Promise<boolean>, label: string, timeout = 30_000) => {
  const end = Date.now() + timeout;
  while (Date.now() < end) {
    if (await check()) return;
    await new Promise(resolve => setTimeout(resolve, 50));
  }
  throw new Error(`Timed out: ${label}`);
};

/** Real Studio child and filesystem; only the external inference service is emulated. */
export class ContextFileProcessFixture {
  root = "";
  origin = "";
  providerOrigin = "";
  logs = "";
  requests: any[] = [];
  private child: ChildProcess | null = null;
  private provider: http.Server | null = null;

  async setup(options: { seed?: (root: string) => Promise<void> } = {}) {
    this.root = await fs.mkdtemp(path.join(os.tmpdir(), "context-file-process-e2e-"));
    this.provider = http.createServer(async (req, res) => {
      if (req.url === "/api/v1/models") {
        res.setHeader("content-type", "application/json");
        res.end(JSON.stringify({ models: [{ key: "attachment-fixture", max_context_length: 32768,
          loaded_instances: [{ config: { context_length: 32768 } }] }] })); return;
      }
      let body = "";
      for await (const chunk of req) body += chunk;
      if (req.url !== "/v1/chat/completions") { res.writeHead(404); res.end(); return; }
      this.requests.push(JSON.parse(body));
      res.writeHead(200, { "content-type": "text/event-stream" });
      const base = { id: randomUUID(), object: "chat.completion.chunk", created: 1, model: "attachment-fixture" };
      for (const choice of [
        { index: 0, delta: { role: "assistant", content: "Attachment received." }, finish_reason: null },
        { index: 0, delta: {}, finish_reason: "stop" },
      ]) res.write(`data: ${JSON.stringify({ ...base, choices: [choice] })}\n\n`);
      res.end("data: [DONE]\n\n");
    });
    this.provider.listen(0, "127.0.0.1"); await once(this.provider, "listening");
    this.providerOrigin = `http://127.0.0.1:${(this.provider.address() as { port: number }).port}`;
    await fs.writeFile(path.join(this.root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    await options.seed?.(this.root);
    await this.start();
    await this.gql(`mutation($value:String!){updateServerSetting(key:"LMSTUDIO_HOSTS",value:$value)}`, { value: this.providerOrigin });
    await this.gql(`mutation {reloadProviderModelCatalog(providerId:"LMSTUDIO",runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
  }
  async launch(kind: "agent" | "team") {
    const models = await this.gql(`query {providerModelCatalogSnapshots(runtimeKind:"autobyteus"){llmModels{modelIdentifier}}}`);
    const model = models.providerModelCatalogSnapshots.flatMap((x: any) => x.llmModels)
      .find((x: any) => x.modelIdentifier.startsWith("attachment-fixture:"))?.modelIdentifier;
    expect(model).toBeTruthy();
    const result = await this.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`, {
      input: { name: "Attachment Fixture Worker", role: "assistant", description: "Disposable validation agent",
        instructions: "Respond briefly. Do not use tools.", toolNames: [] },
    });
    const agentDefinitionId = result.createAgentDefinition.id;
    const config = { llmModelIdentifier: model, llmConfig: null, autoExecuteTools: false,
      skillAccessMode: "NONE", runtimeKind: "autobyteus", workspaceRootPath: this.root };
    if (kind === "agent") {
      const result = await this.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId, ...config } });
      expect(result.createAgentRun.success, result.createAgentRun.message).toBe(true);
      return { runId: result.createAgentRun.runId as string, teamRunId: null, directory: path.join(this.root, "memory", "agents", result.createAgentRun.runId) };
    }
    const definition = await this.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`, {
      input: { name: "Attachment Fixture Team", description: "Disposable Team", instructions: "Validate attachment transport.", coordinatorMemberName: "worker",
        nodes: [{ memberName: "worker", ref: agentDefinitionId, refScope: "SHARED" }] },
    });
    const created = await this.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`, {
      input: { teamDefinitionId: definition.createAgentTeamDefinition.id, teamConfigs: [{ teamAddress: "/", ...config }],
        memberConfigs: [{ memberAddress: "/worker", agentDefinitionId, ...config }] },
    });
    expect(created.createAgentTeamRun.success, created.createAgentTeamRun.message).toBe(true);
    const teamRunId = created.createAgentTeamRun.teamRunId as string;
    const resume = await this.gql(`query($teamRunId:String!){getTeamRunResumeConfig(teamRunId:$teamRunId){executionTree}}`, { teamRunId });
    const runId = resume.getTeamRunResumeConfig.executionTree.root_team.members[0].agent_run_id as string;
    return { runId, teamRunId, directory: path.join(this.root, "memory", "agent_teams", teamRunId, runId) };
  }
  async start(options: { interruptAfterTraceCommit?: boolean } = {}) {
    await fs.access(path.resolve("dist/app.js")); // Caller must build current sources first.
    const env = { ...process.env };
    env.DATABASE_URL = `file:${path.join(this.root, "db", "production.db")}`;
    delete env.DATABASE_URL_TEST; delete env.AUTOBYTEUS_MEMORY_DIR; delete env.RUST_LOG; // Host logging override breaks Prisma schema-engine bootstrap.
    env.LMSTUDIO_HOSTS = this.providerOrigin;
    env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = ""; // Never discover unrelated user packages in durable fixtures.
    this.logs = "";
    let entry = "dist/app.js";
    if (options.interruptAfterTraceCommit) {
      entry = path.join(this.root, "interrupt-after-rename.mjs");
      await fs.writeFile(entry, `import {AtomicRunPackageFileCommitWriter as Writer} from ${JSON.stringify(pathToFileURL(path.resolve("dist/run-history/store/atomic-run-package-file-commit-writer.js")).href)};
        import {startServer} from ${JSON.stringify(pathToFileURL(path.resolve("dist/app.js")).href)};
        const write = Writer.prototype.writeSerializedText;
        Writer.prototype.writeSerializedText = async function(input) {
          const result = await write.call(this, input);
          if(input.file === 'context-record' && input.filePath.endsWith('raw_traces_active.jsonl') && result.outcome === 'committed') process.kill(process.pid, 'SIGKILL');
          return result;
        };
        await startServer();`);
    }
    this.child = spawn(process.execPath, [entry, "--data-dir", this.root, "--host", "127.0.0.1", "--port", "0"],
      { cwd: process.cwd(), env, stdio: ["ignore", "pipe", "pipe"] });
    const capture = (data: Buffer) => { this.logs += data.toString(); };
    this.child.stdout!.on("data", capture); this.child.stderr!.on("data", capture);
    await until(() => {
      if (this.child?.exitCode !== null || this.child?.signalCode !== null) throw new Error(`Studio startup exited (${this.child?.signalCode ?? this.child?.exitCode}): ${this.logs}`);
      // The private MCP listener appears first; Studio readiness appears after the second listener.
      if (!this.logs.includes("Server listening on 127.0.0.1:0")) return false;
      const listeners = [...this.logs.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)];
      this.origin = listeners.at(-1)![1]!; return true;
    }, "Studio startup", 60_000);
    expect((await fetch(`${this.origin}/rest/health`)).status).toBe(200);
  }
  async standalone(): Promise<string> {
    const packageRoot = path.join(this.root, "host-fixture-package");
    const app = path.join(packageRoot, "applications", "fixture");
    await fs.mkdir(path.join(app, "ui"), { recursive: true });
    await fs.mkdir(path.join(app, "backend"), { recursive: true });
    await fs.writeFile(path.join(app, "ui", "index.html"), "<!doctype html><html><body>validation host</body></html>");
    await fs.writeFile(path.join(app, "application.json"), JSON.stringify({ manifestVersion: "5", id: "fixture", name: "Fixture",
      ui: { entryHtml: "ui/index.html", frontendSdkContractVersion: "6" }, backend: { bundleManifest: "backend/bundle.json" }, executionResourceSlots: [], agentTools: [] }));
    await fs.writeFile(path.join(app, "backend", "bundle.json"), JSON.stringify({ contractVersion: "1", entryModule: "backend/entry.mjs",
      moduleFormat: "esm", distribution: "self-contained", targetRuntime: { engine: "node", semver: ">=22 <23" },
      sdkCompatibility: { backendDefinitionContractVersion: "7", frontendSdkContractVersion: "6" },
      supportedExposures: { queries: false, commands: false, routes: false, graphql: false, notifications: false, eventHandlers: false, webSockets: false } }));
    await fs.writeFile(path.join(app, "backend", "entry.mjs"), "export default { definitionContractVersion: '7' };\n");
    const entry = path.join(this.root, "standalone-probe.mjs");
    await fs.writeFile(entry, `import {startStandaloneApplicationHost} from ${JSON.stringify(pathToFileURL(path.resolve("dist/index.js")).href)};
      try { const host = await startStandaloneApplicationHost(${JSON.stringify({ packageRoot, localApplicationId: "fixture", appDataDir: this.root, host: "127.0.0.1", port: 0 })});
        const response = await fetch(host.url + '/_autobyteus/health');
        if (response.status !== 200) throw Error('Health failed: ' + response.status);
        console.log('STANDALONE_ADMITTED'); await host.close(); process.exit(0);
      } catch(error) { console.error(String(error)); process.exit(91); }`);
    const env: NodeJS.ProcessEnv = { ...process.env, DATABASE_URL: `file:${path.join(this.root, "db", "production.db")}` };
    delete env.AUTOBYTEUS_MEMORY_DIR; delete env.DATABASE_URL_TEST; delete env.RUST_LOG;
    env.LMSTUDIO_HOSTS = this.providerOrigin;
    env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = ""; // Never discover unrelated user packages in durable fixtures.
    try { const result = await promisify(execFile)(process.execPath, [entry], { env, timeout: 45_000, maxBuffer: 4 * 1024 * 1024 }); return result.stdout + result.stderr; }
    catch (error) { const result = error as Error & { stdout?: string; stderr?: string }; throw new Error(`${result.message}\n${result.stdout}\n${result.stderr}`); }
  }
  async stop() {
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit"); child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
    await exited; clearTimeout(force); this.child = null;
  }
  async cleanup(retainData = false) {
    await this.stop();
    if (this.provider) { const closed = once(this.provider, "close"); this.provider.close(); this.provider.closeAllConnections(); await closed; }
    if (this.root && !retainData) await fs.rm(this.root, { recursive: true, force: true });
  }
  async gql(query: string, variables: Record<string, unknown> = {}): Promise<any> {
    const response = await fetch(`${this.origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const result = await response.json() as any;
    if (result.errors) throw new Error(JSON.stringify(result.errors));
    return result.data;
  }
  async upload(owner: unknown, filename: string, bytes: Buffer, type: string): Promise<Attachment> {
    const form = new FormData(); form.set("owner", JSON.stringify(owner));
    form.set("file", new Blob([new Uint8Array(bytes)], { type }), filename);
    const response = await fetch(`${this.origin}/rest/context-files/upload`, { method: "POST", body: form });
    expect(response.status).toBe(200); return response.json() as Promise<Attachment>;
  }
  async finalize(draftOwner: unknown, finalOwner: unknown, attachments: Attachment[]): Promise<Attachment[]> {
    const response = await fetch(`${this.origin}/rest/context-files/finalize`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ draftOwner, finalOwner, attachments }) });
    expect(response.status, await response.clone().text()).toBe(200);
    return (await response.json() as { attachments: Attachment[] }).attachments;
  }
  async send(socketPath: string, agentRunId: string | null, content: string, attachments: Attachment[]): Promise<Event[]> {
    const ws = new WebSocket(this.origin.replace("http:", "ws:") + socketPath);
    const events: Event[] = [];
    ws.on("message", raw => events.push(JSON.parse(String(raw))));
    try {
      await until(() => events.some(e => e.type === "CONNECTED"), "socket connected");
      sendE2eSendMessageCommand(ws, { ...(agentRunId ? { agent_run_id: agentRunId } : {}), content, context_file_paths: attachments.map(a => a.locator) });
      await until(() => {
        const error = events.find(e => e.type === "ERROR");
        if (error) throw new Error(JSON.stringify(error));
        return events.some(e => e.type === "ASSISTANT_COMPLETE");
      }, "provider response");
      await until(() => events.some(e => e.type === "AGENT_STATUS" && e.payload.status === "idle"), "idle after response");
      return events;
    } finally { const closed = once(ws, "close"); ws.close(); await closed; }
  }
}
