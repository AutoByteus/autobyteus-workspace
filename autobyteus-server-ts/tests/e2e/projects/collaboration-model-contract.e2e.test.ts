import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { buildE2eClientCommandIds, sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// The collaboration model (collaboration-model-contract REQ-001..REQ-004, AC-001..AC-006): inside your run you message;
// outside your run you delegate first and then message the copy by its run ID; messaging never creates a run.
// Through the real Studio HTTP/WebSocket server, GraphQL, the Agent, Agent Team and Agent Org roots, scoped MCP agent tools
// and the AGY backend. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`):
// `CALL_TOOL:{...}` makes the agent call that actual tool and reply `CALLED:<tool result>`. No inference.
// - CM-E2E-1 Agent root: a catalog Agent is delegated and then messaged by run ID; a message to an outside address is not
//   found (guidance names delegate_task) and creates nothing; a Task-owned copy gets the same answer for its own outside address.
// - CM-E2E-2 Team root: delegating a teammate or the Team's own address is refused with guidance and starts nothing; the
//   teammate is messaged instead; an outside catalog Agent is delegated and messaged by run ID.
// - CM-E2E-3 Org root: an Org direct agent delegates a sibling mounted Team and a sibling Agent (allowed); a member of the
//   mounted Team delegating its teammate or its own mounted Team is refused, a sibling Agent is allowed.
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/collaboration-model-contract.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "cmc-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

type Frame = { type: string; payload: Record<string, any> };
type Kind = "agent" | "team" | "org";
type Rec = Record<string, any>;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
/** Delegated copies of a tree: records with a start time and a run ID (camelCase or snake_case trees). */
const copiesIn = (tree: unknown) => objectsIn(tree).flatMap((record) => {
  const startedAt = record.startedAt ?? record.started_at;
  const agentRunId = record.agentRunId ?? record.agent_run_id;
  const teamRunId = record.teamRunId ?? record.team_run_id;
  if (typeof startedAt !== "string" || !(agentRunId || teamRunId)) return [];
  return [{ agentRunId: teamRunId ? undefined : agentRunId as string, teamRunId: teamRunId as string | undefined,
    address: record.address as string, delegatorAgentRunId: (record.delegatorAgentRunId ?? record.delegator_agent_run_id) as string | undefined }];
});
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};

suite("Collaboration model: message inside, delegate outside (real HTTP/WS/GraphQL/scoped MCP, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const savedEnv = new Map<string, string | undefined>();
  const ids: Record<string, string> = {};
  const names: Record<string, string> = {};

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low", llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string) => (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (collaboration model E2E)`, instructions: "Follow the user's request.", toolNames: [] } })).createAgentDefinition.id as string;
  const teamDefinition = async (name: string, members: Array<[string, string]>, coordinator: string) => (await graphql(
    `mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
    { input: { name, description: "Collaboration model E2E team", instructions: "Follow requests.", coordinatorMemberName: coordinator,
      nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })) } })).createAgentTeamDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  const terminate = async (kind: Kind, rootId: string) => {
    const mutation = kind === "agent" ? `mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`
      : kind === "team" ? `mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`
        : `mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`;
    const result = Object.values(await graphql(mutation, { id: rootId }))[0] as Rec;
    expect(result.success, result.message).toBe(true);
    const index = active.findIndex((root) => root.rootId === rootId);
    if (index >= 0) active.splice(index, 1);
  };

  /** A root of one kind: its members by address, a way to send a scripted tool call to any agent of it, and its live tree. */
  const startRoot = async (kind: Kind) => {
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
    const sendTo = (agentRunId: string, content: string) => {
      if (kind === "org") view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else if (kind === "agent" && agentRunId !== rootId) view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent", root_run_id: rootId, target_agent_run_id: agentRunId, command_id: randomUUID(),
        content, context_file_paths: [], image_urls: [], ...buildE2eClientCommandIds() } }));
      else sendE2eSendMessageCommand(kind === "agent" ? inputChannel!.socket : view.socket, { agent_run_id: agentRunId, content });
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
    /** One scripted tool call by an agent of the root (by run ID and address); returns the tool result it reports. */
    const calls = async (agentRunId: string, address: string, content: string): Promise<Rec> => {
      const before = calledResults(await conversationOf(agentRunId, address)).length;
      sendTo(agentRunId, content);
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(agentRunId, address)); return results.length > before; },
        `${kind} ${address} tool result for ${content.slice(0, 110)}`, 60_000);
      return toolResult(results[before]!);
    };
    const copies = async () => copiesIn(await liveTree());
    const waitForCopy = async (agentRunId: string) => {
      let found: ReturnType<typeof copiesIn>[number] | undefined;
      await until(async () => Boolean(found = (await copies()).find((copy) => copy.agentRunId === agentRunId)), `${kind}: copy ${agentRunId} recorded`, 60_000);
      return found!;
    };
    return { kind, rootId, managerRunId, members, calls, copies, waitForCopy, close: () => { view.socket.close(); inputChannel?.socket.close(); } };
  };
  type Root = Awaited<ReturnType<typeof startRoot>>;

  const expectRefused = (result: Rec, address: string) => {
    expect(JSON.stringify(result), JSON.stringify(result)).toContain("COLLABORATION_SELF_TARGET_REJECTED");
    expect(JSON.stringify(result)).toContain(address);
    expect(JSON.stringify(result)).toContain("send_message_to");
    expect(result).not.toHaveProperty("target_agent_run_id");
  };
  const expectNotFound = (result: Rec) => {
    expect(result, JSON.stringify(result)).toMatchObject({ accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND" });
    expect(String(result.message)).toContain("delegate_task");
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "cmc-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    savedEnv.set("AGY_FAKE_CASE", process.env["AGY_FAKE_CASE"]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    for (const key of ["manager", "mate", "sibling", "outsider", "stranger"]) names[key] = `CMC ${key} ${suffix}`;
    for (const key of ["manager", "mate", "sibling", "outsider", "stranger"]) ids[key] = await agentDefinition(names[key]!);
    ids.team = await teamDefinition(`CMC Team ${suffix}`, [["manager", ids.manager!], ["mate", ids.mate!]], "manager");
    // The mounted Team of the Org: lead + mate (its own members), distinct from the Org's direct agents.
    ids.mounted = await teamDefinition(`CMC Mounted ${suffix}`, [["lead", ids.mate!], ["peer", ids.stranger!]], "lead");
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `CMC Org ${suffix}`, description: "Collaboration model Org", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "sibling", ref: ids.sibling, refType: "AGENT", refScope: "SHARED" },
        { memberName: "mounted", ref: ids.mounted, refType: "AGENT_TEAM", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const root of [...active]) await terminate(root.kind, root.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("CM-E2E-1 Agent root: delegate an outside Agent then message its run ID; an outside address is not found and creates nothing, also for a Task-owned copy", async () => {
    const root = await startRoot("agent");
    const outsiderAddress = `/${segment(names.outsider!)}`;
    const strangerAddress = `/${segment(names.stranger!)}`;
    // AC-005: messaging an address that is not in the run is not found; nothing is created.
    const copiesBefore = (await root.copies()).length;
    expectNotFound(await root.calls(root.managerRunId, "/", callTool("send_message_to", { recipient_address: outsiderAddress, content: "Hello?" })));
    expect((await root.copies()).length).toBe(copiesBefore);
    // Delegation starts the copy; its run ID is then messaged (AC-004, AC-006).
    const delegated = await root.calls(root.managerRunId, "/", callTool("delegate_task", { recipient_address: outsiderAddress, description: "Reply OK." }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    const copyRunId = delegated.target_agent_run_id as string;
    const copy = await root.waitForCopy(copyRunId);
    expect(copy).toMatchObject({ address: outsiderAddress, delegatorAgentRunId: root.managerRunId });
    expect(await root.calls(root.managerRunId, "/", callTool("send_message_to", { target_agent_run_id: copyRunId, content: "Follow up." })))
      .toMatchObject({ accepted: true });
    // The same address still resolves to nothing for messaging once a copy exists: the copy is reached by its run ID only.
    expectNotFound(await root.calls(root.managerRunId, "/", callTool("send_message_to", { recipient_address: outsiderAddress, content: "By address?" })));
    // AC-005, Task-owned sender: the delegated copy is the Task-owned sender (an ad-hoc Task came with the described delegation).
    expect(String(delegated.task_id), JSON.stringify(delegated)).toMatch(/^ad_hoc_task_/);
    const before = (await root.copies()).length;
    expectNotFound(await root.calls(copyRunId, outsiderAddress, callTool("send_message_to", { recipient_address: strangerAddress, content: "Help?" })));
    expect((await root.copies()).length).toBe(before);
    root.close();
    await terminate("agent", root.rootId);
  }, 300_000);

  it("CM-E2E-2 Team root: delegating a teammate or the own Team is refused and starts nothing; an outside Agent is delegated and messaged by run ID", async () => {
    const root = await startRoot("team");
    const outsiderAddress = `/${segment(names.outsider!)}`;
    const before = (await root.copies()).length;
    // AC-001: a teammate is messaged, not delegated.
    expectRefused(await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/mate", description: "Reply OK." })), "/mate");
    // The member itself.
    expectRefused(await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/manager", description: "Reply OK." })), "/manager");
    expect((await root.copies()).length, "the refusals start nothing").toBe(before);
    // The teammate is reached by messaging (AC-006).
    expect(await root.calls(root.managerRunId, "/manager", callTool("send_message_to", { recipient_address: "/mate", content: "Hello mate." })))
      .toMatchObject({ accepted: true });
    // An outside catalog Agent is delegated, then messaged by run ID (AC-004).
    const delegated = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: outsiderAddress, description: "Reply OK." }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    const copy = await root.waitForCopy(delegated.target_agent_run_id as string);
    expect(copy).toMatchObject({ address: outsiderAddress, delegatorAgentRunId: root.managerRunId });
    expect(await root.calls(root.managerRunId, "/manager", callTool("send_message_to", { target_agent_run_id: copy.agentRunId, content: "Follow up." })))
      .toMatchObject({ accepted: true });
    // A message to an outside address that was never delegated is not found.
    expectNotFound(await root.calls(root.managerRunId, "/manager", callTool("send_message_to", { recipient_address: `/${segment(names.stranger!)}`, content: "Hello?" })));
    root.close();
    await terminate("team", root.rootId);
  }, 300_000);

  it("CM-E2E-3 Org root: siblings are delegable; a mounted Team's member cannot delegate its teammate or its own mounted Team", async () => {
    const root = await startRoot("org");
    const lead = root.members["/mounted/lead"]!;
    expect(lead, JSON.stringify(root.members)).toBeTruthy();
    // AC-004 (preserved): an Org direct agent delegates a sibling Agent and a sibling mounted Team.
    const agentCopy = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/sibling", description: "Reply OK." }));
    expect(agentCopy, JSON.stringify(agentCopy)).toMatchObject({ delegated: true, target_kind: "agent" });
    const teamCopy = await root.calls(root.managerRunId, "/manager", callTool("delegate_task", { recipient_address: "/mounted", description: "Reply OK." }));
    expect(teamCopy, JSON.stringify(teamCopy)).toMatchObject({ delegated: true, target_kind: "team" });
    await root.waitForCopy(agentCopy.target_agent_run_id as string);
    const started = (await root.copies()).length;
    // AC-003: inside the mounted Team, the teammate and the own mounted Team are refused; nothing starts.
    expectRefused(await root.calls(lead, "/mounted/lead", callTool("delegate_task", { recipient_address: "/mounted/peer", description: "Reply OK." })), "/mounted/peer");
    expectRefused(await root.calls(lead, "/mounted/lead", callTool("delegate_task", { recipient_address: "/mounted", description: "Reply OK." })), "/mounted");
    expect((await root.copies()).length, "the refusals start nothing").toBe(started);
    // A sibling of the mounted Team is an independent unit: allowed.
    const sibling = await root.calls(lead, "/mounted/lead", callTool("delegate_task", { recipient_address: "/sibling", description: "Reply OK." }));
    expect(sibling, JSON.stringify(sibling)).toMatchObject({ delegated: true, target_kind: "agent" });
    root.close();
    await terminate("org", root.rootId);
  }, 300_000);
});
