import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { expect } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "./studio-runtime-test-server.js";
import { buildE2eClientCommandIds, sendE2eSendMessageCommand } from "./websocket-command-helpers.js";
import { until } from "./agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "./team-run-metadata-helpers.js";

/**
 * Drives real Agent, Agent Team and Agent Org roots on a test-owned Studio server with the scripted AGY CLI
 * (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`): `CALL_TOOL:{...}` makes an agent call the real tool and reply
 * `CALLED:<tool result>`. Used by the collaboration-prompt-wording suites. Owns its data dir, server and sockets.
 */
export type Frame = { type: string; payload: Record<string, any> };
export type Rec = Record<string, any>;
export type RootKind = "agent" | "team" | "org";
export type Mention = { kind: "agent" | "agent_team"; definition_id: string };

export const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
export const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
export const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
/** Delegated task agents of a tree: records with a start time and an ID (camelCase or snake_case trees). */
export const taskAgentsIn = (tree: unknown) => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const agentRunId = record.agentRunId ?? record.agent_run_id;
  const teamRunId = record.teamRunId ?? record.team_run_id;
  if (typeof startedAt !== "string" || !(agentRunId || teamRunId)) return [];
  return [{ agentRunId: teamRunId ? undefined : agentRunId as string, teamRunId: teamRunId as string | undefined, address: record.address as string,
    delegatorAgentRunId: (record.delegatorAgentRunId ?? record.delegator_agent_run_id) as string | undefined,
    members: ((record.members ?? []) as Rec[]).map((m) => ({ address: m.address as string, agentRunId: (m.agentRunId ?? m.agent_run_id) as string }))
      .filter((m) => m.agentRunId) }];
});
export const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
export const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};
/** Every string value of a conversation, flattened (messages the agent received are among them). */
export const stringsOf = (conversation: unknown): string[] =>
  objectsIn(conversation).flatMap((record) => Object.values(record)).filter((value): value is string => typeof value === "string");

export type CollaborationHarness = Awaited<ReturnType<typeof startCollaborationHarness>>;

export const startCollaborationHarness = async (label: string) => {
  const dataDir = await fs.mkdtemp(path.join(os.tmpdir(), `${label}-`));
  const workspace = path.join(dataDir, "workspace");
  await fs.mkdir(workspace);
  await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
  const priorCase = process.env["AGY_FAKE_CASE"];
  process.env["AGY_FAKE_CASE"] = "linked_skills";
  appConfigProvider.config.setCustomAppDataDir(dataDir);
  const started = await startStudioE2eRuntimeServer();
  const app: FastifyInstance = started.fastify;
  const url: URL = started.mainUrl;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: RootKind; rootId: string }> = [];

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, extra: Rec = {}) => (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (collaboration prompt E2E)`, instructions: `Instructions of ${name}.`, toolNames: [], ...extra } })).createAgentDefinition.id as string;
  const teamDefinition = async (name: string, members: Array<[string, string]>, coordinator: string, extra: Rec = {}) => (await graphql(
    `mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
    { input: { name, description: "Collaboration prompt E2E team", instructions: `Team instruction of ${name}.`, coordinatorMemberName: coordinator,
      nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })), ...extra } })).createAgentTeamDefinition.id as string;
  const orgDefinition = async (name: string, members: Rec[], handoffs: Rec[]) => (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
    { input: { name, description: "Collaboration prompt E2E org", instructions: `Organization instruction of ${name}.`, handoffs, members } })).createAgentOrgDefinition.id as string;

  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const terminate = async (kind: RootKind, rootId: string) => {
    const mutation = kind === "agent" ? `mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`
      : kind === "team" ? `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`
        : `mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`;
    const result = Object.values(await graphql(mutation, { id: rootId }))[0] as Rec;
    expect(result.success, result.message).toBe(true);
    const index = active.findIndex((root) => root.rootId === rootId);
    if (index >= 0) active.splice(index, 1);
  };

  /** The AGY run capsule of a run (its main agent file is the composed prompt; its MCP config is the run's scoped tool endpoint). */
  const capsuleOf = async (agentRunId: string): Promise<string> => {
    const walk = async (dir: string): Promise<string | null> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name);
        if (!entry.isDirectory()) continue;
        if (entry.name === "agy-project") {
          const manifest = JSON.parse(await fs.readFile(path.join(full, "manifest.json"), "utf8").catch(() => "{}")) as Rec;
          if (manifest.runId === agentRunId) return full;
        } else { const found = await walk(full); if (found) return found; }
      }
      return null;
    };
    const capsule = await walk(path.join(dataDir, "memory"));
    if (!capsule) throw new Error(`No AGY capsule for run ${agentRunId}`);
    return capsule;
  };
  /** The composed prompt a run was started with. */
  const promptOf = async (agentRunId: string): Promise<string> => {
    const agents = path.join(await capsuleOf(agentRunId), ".agents", "agents");
    const [name] = await fs.readdir(agents);
    const text = await fs.readFile(path.join(agents, name!, "agent.md"), "utf8");
    return text.slice(text.indexOf("\n---", 3) + 4).trim();
  };
  /** A tool call as the run's own CLI makes it: over the run's scoped MCP endpoint. Returns the result, or the protocol error it got. */
  const mcpCall = async (agentRunId: string, name: string, args: Rec): Promise<{ isError: boolean; text: string; thrown?: boolean }> => {
    const config = JSON.parse(await fs.readFile(path.join(await capsuleOf(agentRunId), ".agents", "mcp_config.json"), "utf8")) as Rec;
    const server = config.mcpServers?.autobyteus_agent_tools;
    if (!server) throw new Error(`autobyteus_agent_tools is not configured for run ${agentRunId}`);
    const { Client } = await import("@modelcontextprotocol/sdk/client/index.js");
    const { StreamableHTTPClientTransport } = await import("@modelcontextprotocol/sdk/client/streamableHttp.js");
    const client = new Client({ name: "collaboration-prompt-e2e", version: "1.0.0" });
    await client.connect(new StreamableHTTPClientTransport(new URL(server.serverUrl), { requestInit: { headers: server.headers ?? {} } }));
    try {
      const result = await client.callTool({ name, arguments: args }) as Rec;
      return { isError: result.isError === true, text: JSON.stringify(result.structuredContent ?? result.content) };
    } catch (error) {
      return { isError: true, thrown: true, text: String((error as Error).message ?? error) };
    } finally { await client.close(); }
  };

  /** The last raw-trace lines of a run (diagnostics for a timed-out step). */
  const tracesOf = async (agentRunId: string, lines = 6): Promise<string> => {
    const walk = async (dir: string): Promise<string | null> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true }).catch(() => [])) {
        const full = path.join(dir, entry.name);
        if (!entry.isDirectory()) continue;
        if (entry.name === agentRunId) return full;
        const found = await walk(full);
        if (found) return found;
      }
      return null;
    };
    const dir = await walk(path.join(dataDir, "memory"));
    if (!dir) return "(no memory folder)";
    const text = await fs.readFile(path.join(dir, "raw_traces_active.jsonl"), "utf8").catch(() => "");
    return text.trim().split("\n").slice(-lines).map((line) => line.slice(0, 600)).join("\n");
  };

  /** A root of one kind: its members by address, a way to send a scripted tool call to any agent of it, and its live tree. */
  const startRoot = async (kind: RootKind, ids: Rec) => {
    let rootId: string, managerRunId: string;
    const members: Record<string, string> = {};
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
      members["/"] = managerRunId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/mate", agentDefinitionId: ids.mate, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      for (const member of flattenE2eConfiguredAgentExecutions(tree)) members[member.memberAddress] = member.agentRunId;
      managerRunId = members["/manager"]!;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      for (const member of tree.rootOrg.members as any[]) {
        if (member.agentRunId) members[member.address] = member.agentRunId;
        for (const inner of (member.members ?? []) as any[]) if (inner.agentRunId) members[inner.address] = inner.agentRunId;
      }
      managerRunId = members["/manager"]!;
    }
    active.push({ kind, rootId });
    expect(managerRunId).toBeTruthy();
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const inputChannel = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null;
    const view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
    const sendTo = (agentRunId: string, content: string, mentions?: Mention[]) => {
      const extra = mentions ? { mentions } : {};
      if (kind === "org") view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [], ...extra } }));
      else if (kind === "agent" && agentRunId !== rootId) view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent", root_run_id: rootId, target_agent_run_id: agentRunId, command_id: randomUUID(),
        content, context_file_paths: [], image_urls: [], ...buildE2eClientCommandIds(), ...extra } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : view.socket, { agent_run_id: agentRunId, content, ...extra });
    };
    const liveTree = async () => {
      if (kind === "agent") return (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    };
    const conversationOf = async (agentRunId: string, address: string) => {
      if (kind === "agent" && agentRunId === rootId) return (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation;
      if (kind === "agent") return (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
    };
    /** One scripted tool call by an agent of the root; returns the tool result it reports. */
    const calls = async (agentRunId: string, address: string, content: string, mentions?: Mention[]): Promise<Rec> => {
      const before = calledResults(await conversationOf(agentRunId, address)).length;
      sendTo(agentRunId, content, mentions);
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(agentRunId, address)); return results.length > before; },
        `${kind} ${address} tool result for ${content.slice(0, 110)}`, 60_000)
        .catch(async (error) => { throw new Error(`${error}; the agent's conversation ends: ${JSON.stringify(stringsOf(await conversationOf(agentRunId, address)).slice(-8)).slice(0, 2000)}; raw trace tail:\n${await tracesOf(agentRunId)}`); });
      return toolResult(results[before]!);
    };
    const taskAgents = async () => taskAgentsIn(await liveTree());
    const waitForTaskAgent = async (id: string) => {
      let found: ReturnType<typeof taskAgentsIn>[number] | undefined;
      await until(async () => Boolean(found = (await taskAgents()).find((agent) => agent.agentRunId === id || agent.teamRunId === id)), `${kind}: task agent ${id} recorded`, 60_000);
      return found!;
    };
    return { kind, rootId, managerRunId, members, sendTo, calls, conversationOf, taskAgents, waitForTaskAgent, close: () => { view.socket.close(); inputChannel?.socket.close(); } };
  };

  const close = async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const root of [...active]) await terminate(root.kind, root.rootId).catch((error) => errors.push(String(error)));
    await app.close();
    await fs.rm(dataDir, { recursive: true, force: true });
    if (priorCase === undefined) delete process.env["AGY_FAKE_CASE"]; else process.env["AGY_FAKE_CASE"] = priorCase;
    expect(errors, "owned cleanup").toEqual([]);
  };
  return { graphql, config, agentDefinition, teamDefinition, orgDefinition, startRoot, terminate, promptOf, mcpCall, close, dataDir, workspace };
};
