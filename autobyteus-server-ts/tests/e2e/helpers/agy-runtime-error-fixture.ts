import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { expect } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "./studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "./websocket-command-helpers.js";
import { flattenE2eConfiguredAgentExecutions } from "./team-run-metadata-helpers.js";

export type Scope = "agent" | "team" | "org";
export type Wire = { type: string; payload: Record<string, any> };
export type Run = { scope: Scope; rootId: string; runId: string; address: string; tree?: any };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
export const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 20_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await predicate()) return; await wait(50); }
  throw new Error(`Timed out waiting for ${label}`);
};

/** Test-owned setup through the current public GraphQL/WebSocket APIs; only AGY CLI is emulated. */
export class AgyRuntimeErrorFixture {
  dataDir = "";
  workspace = "";
  url!: URL;
  app?: FastifyInstance;
  definitionId = "";
  teamDefinitionId = "";
  orgDefinitionId = "";
  runs: Run[] = [];
  sockets: WebSocket[] = [];
  private savedEnv = new Map<string, string | undefined>();
  async graphql<T = any>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(new URL("/graphql", this.url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  }
  async start() {
    this.dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "agy-runtime-error-e2e-"));
    this.workspace = path.join(this.dataDir, "workspace");
    await fs.mkdir(this.workspace);
    await fs.writeFile(path.join(this.dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_INPUT_LOG", "AGY_FAKE_ARGV_LOG"]) this.savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_INPUT_LOG"] = path.join(this.dataDir, "input.jsonl");
    process.env["AGY_FAKE_ARGV_LOG"] = path.join(this.dataDir, "launch.jsonl");
    appConfigProvider.config.setCustomAppDataDir(this.dataDir);
    const started = await startStudioE2eRuntimeServer();
    this.app = started.fastify; this.url = started.mainUrl;
    const agent = await this.graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: "agy-runtime-error-" + randomUUID(), role: "assistant", description: "owned runtime error fixture",
        instructions: "Follow the user's ordinary request.", toolNames: [] } });
    this.definitionId = agent.createAgentDefinition.id;
    const team = await this.graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: "agy-error-team-" + randomUUID(), description: "owned error fixture", instructions: "Follow user requests.",
        coordinatorMemberName: "worker", nodes: [{ memberName: "worker", ref: this.definitionId, refScope: "SHARED" }] } });
    this.teamDefinitionId = team.createAgentTeamDefinition.id;
    const org = await this.graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: "agy-error-org-" + randomUUID(), description: "owned error fixture", instructions: "Follow user requests.",
        members: [{ memberName: "direct", ref: this.definitionId, refType: "AGENT", refScope: "SHARED" },
          { memberName: "team", ref: this.teamDefinitionId, refType: "AGENT_TEAM", refScope: "SHARED" }], handoffs: [] } });
    this.orgDefinitionId = org.createAgentOrgDefinition.id;
  }
  async create(scope: Scope, mode = "runtime_error"): Promise<Run> {
    process.env["AGY_FAKE_CASE"] = mode;
    const config = { workspaceRootPath: this.workspace, llmModelIdentifier: "gemini-3.8-flash-low",
      llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" };
    let run: Run;
    if (scope === "agent") {
      const result = (await this.graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: this.definitionId, ...config } })).createAgentRun;
      expect(result.success, result.message).toBe(true);
      run = { scope, rootId: result.runId, runId: result.runId, address: "/" };
    } else if (scope === "team") {
      const result = (await this.graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: this.teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [{ memberAddress: "/worker", agentDefinitionId: this.definitionId, ...config }] } })).createAgentTeamRun;
      expect(result.success, result.message).toBe(true);
      const tree = (await this.graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
        { id: result.teamRunId })).getTeamRunResumeConfig.executionTree;
      const member = flattenE2eConfiguredAgentExecutions(tree)[0]!;
      run = { scope, rootId: result.teamRunId, runId: member.agentRunId, address: member.memberAddress, tree };
    } else {
      const result = (await this.graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: this.orgDefinitionId, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
      expect(result.success, result.message).toBe(true);
      const tree = (await this.graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`,
        { id: result.agentOrgRunId })).getAgentOrgRunConfig.executionTree;
      const member = tree.rootOrg.members.find((m: any) => m.address === "/team").members[0];
      run = { scope, rootId: result.agentOrgRunId, runId: member.agentRunId, address: member.address, tree };
    }
    this.runs.push(run);
    return run;
  }
  async connect(run: Run) {
    if (!this.runs.includes(run)) this.runs.push(run);
    const route = run.scope === "agent" ? "agent" : run.scope === "team" ? "agent-team" : "agent-org";
    const socket = new WebSocket(`ws://${this.url.host}/ws/${route}/${run.rootId}`);
    this.sockets.push(socket);
    const frames: Wire[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((f) => f.type === (run.scope === "agent" ? "CONNECTED" : run.scope === "team"
      ? "TEAM_RUN_LIFECYCLE" : "ROOT_LIFECYCLE")), "stream ready");
    const projected = () => run.scope === "org" ? frames.filter((f) => f.type === "ROOT_EXECUTION_EVENT"
      && f.payload.event?.kind === "agent_presentation").map((f) => ({ ...f.payload.event.message,
        agentRunId: f.payload.event.agent_run_id, memberAddress: f.payload.event.member_address })) : frames;
    const send = (content: string) => {
      if (run.scope === "org") socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: run.rootId, target_agent_run_id: run.runId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content,
        context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(socket, { agent_run_id: run.runId, content });
    };
    return { socket, frames, projected, send };
  }
  async projection(run: Run) {
    if (run.scope === "agent") return (await this.graphql(`query($id:String!){getRunProjection(runId:$id){conversation activities}}`, { id: run.runId })).getRunProjection;
    if (run.scope === "team") return (await this.graphql(`query($id:String!,$agent:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$agent){conversation activities}}`,
      { id: run.rootId, agent: run.runId })).getTeamMemberRunProjection;
    return (await this.graphql(`query($id:String!,$agent:String!,$address:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$address,agentRunId:$agent){conversation activities}}`,
      { id: run.rootId, agent: run.runId, address: run.address })).getAgentOrgMemberRunProjection;
  }
  async audit() {
    const file = process.env["AGY_FAKE_INPUT_LOG"]!;
    try { return (await fs.readFile(file, "utf8")).trim().split("\n").filter(Boolean).map((row) => JSON.parse(row)); }
    catch (error: any) { if (error.code === "ENOENT") return []; throw error; }
  }
  async diagnostic(run: Run) {
    // Hosted Agent memory location comes from the owned tree, not a fabricated standalone folder.
    const find = async (dir: string): Promise<string[]> => {
      const found: string[] = [];
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const child = path.join(dir, entry.name);
        if (entry.isDirectory()) found.push(...await find(child));
        else if (entry.name === "provider-failures.jsonl") found.push(child);
      }
      return found;
    };
    let file = "";
    await until(async () => {
      for (const candidate of await find(path.join(this.dataDir, "memory"))) {
        const text = await fs.readFile(candidate, "utf8");
        if (text.includes(run.runId)) { file = candidate; return true; }
      }
      return false;
    }, "private diagnostic");
    return { text: await fs.readFile(file, "utf8"), mode: (await fs.stat(file)).mode & 0o777 };
  }
  async terminate(run: Run) {
    const result = run.scope === "agent" ? (await this.graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: run.rootId })).terminateAgentRun
      : run.scope === "team" ? (await this.graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: run.rootId })).terminateAgentTeamRun
        : (await this.graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: run.rootId })).terminateAgentOrgRun;
    expect(result.success, result.message).toBe(true);
    this.runs = this.runs.filter((candidate) => candidate !== run);
  }
  async save(name: string, value: unknown) {
    const dir = process.env["AGY_ERROR_EVIDENCE_DIR"];
    if (dir) { await fs.mkdir(dir, { recursive: true }); await fs.writeFile(path.join(dir, name), JSON.stringify(value, null, 2) + "\n"); }
  }
  async close() {
    const errors: string[] = [];
    for (const socket of this.sockets) socket.terminate();
    for (const run of [...this.runs]) await this.terminate(run).catch((error) => errors.push(String(error)));
    if (this.orgDefinitionId) await this.graphql(`mutation($id:String!){deleteAgentOrgDefinition(id:$id)}`, { id: this.orgDefinitionId }).catch((error) => errors.push(String(error)));
    for (const [type, id] of [["AgentTeam", this.teamDefinitionId], ["Agent", this.definitionId]]) {
      if (id) await this.graphql(`mutation($id:String!){delete${type}Definition(id:$id){success}}`, { id }).catch((error) => errors.push(String(error)));
    }
    if (this.app) await this.app.close();
    if (this.dataDir) await fs.rm(this.dataDir, { recursive: true, force: true });
    for (const [key, value] of this.savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dataRemoved = this.dataDir ? await fs.access(this.dataDir).then(() => false, () => true) : true;
    const serverClosed = !this.app || !this.app.server.listening;
    await this.save("cleanup.json", { dataDir: this.dataDir, dataRemoved, serverClosed,
      socketsClosed: this.sockets.every((socket) => socket.readyState === WebSocket.CLOSED), remainingOwnedRoots: this.runs.length,
      cleanupErrors: errors, userNode8001Accessed: false });
    expect(dataRemoved).toBe(true); expect(serverClosed).toBe(true); expect(this.runs).toHaveLength(0);
    expect(errors, "owned fixture cleanup").toEqual([]);
  }
}
