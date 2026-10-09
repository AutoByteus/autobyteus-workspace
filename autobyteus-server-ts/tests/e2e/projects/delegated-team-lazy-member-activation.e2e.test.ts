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
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";

// Delegated Team copies start only the member that work reaches (delegated-team-member-lazy-activation SR-002:
// REQ-001..REQ-006, AC-001..AC-005, QR-001) through the real Studio HTTP/WebSocket server, scoped MCP agent tools,
// Task services, root lifecycle owners and the real AGY backend, for the standalone Agent, Agent Team and Agent Org
// roots. Only the external AGY CLI is scripted (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}`
// makes the agent call the actual agent tool; anything else is answered `OK`. No provider inference.
// AGY starts one CLI process per AgentRun activation and binds its conversation ID, so the launch log is the exact
// count of provider sessions. In every root a 4-member Team copy (lead coordinator, reviewer, writer, tester):
// - delegation starts only the lead: one launch, the others Offline with no process and a `null` saved binding;
// - the lead's message to the reviewer starts only the reviewer (initializing → idle), and its binding is saved;
// - Org root (configured Team placement): the writer is configured with a model AGY does not offer: the lead's message
//   to it fails, the writer shows error, the lead keeps working (delegation had succeeded). The writer's model is
//   retired after the Org was configured (validation at Org creation refuses an unavailable model);
// - Agent and Team roots (catalog copies; every member uses the delegator's configuration): the lead delegates the same
//   Team from inside the copy (a Team-hosted copy): only its lead starts;
// - idle shutdown, then the Manager's message: only the lead resumes (`--conversation`);
// - Task DONE, reopen and the Manager's message: only the lead resumes;
// - root stop; the saved tree is given the pre-fix shape (the never-started tester bound, no conversation); root
//   restore and the Manager's message resume only the lead; the tester's first work starts a fresh session.
// A coordinator that cannot start fails `delegate_task` with no member session (Org root, configured placement).
// About 3 minutes (idle grace stored at its 60 s minimum). `DELEGATED_TEAM_LAZY_E2E_EVIDENCE_DIR` keeps a JSON receipt.
// Run: RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted AGY actor's files out of the user's home. The optional real-Claude case needs the
  // logged-in `claude` CLI, which reads its login from the real HOME (as the sibling live Task reactivation case does).
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1" || process.env["RUN_CLAUDE_E2E"] === "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "delegated-team-lazy-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
/** Optional real-model case (Claude Agent SDK members); needs a logged-in `claude`. */
const liveClaude = enabled && process.env.RUN_CLAUDE_E2E === "1" && spawnSync("claude", ["--version"], { stdio: "ignore" }).status === 0;

const GRACE_KEY = "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS";
const GRACE_MS = 60_000;
const MODEL = "gemini-3.8-flash-low";
/** Offered by the scripted CLI only while AGY_FAKE_EXTRA_MODELS lists it: the Org is configured with it, then it is retired. */
const RETIRING_MODEL = "dtl-retiring-model";
const MEMBERS = ["lead", "reviewer", "writer", "tester"] as const;
/** The saved root trees of the Agent, Team and Org roots. */
const TREE_FILES = new Set(["collaboration_tree.json", "team_run_execution_tree.json", "agent_org_run_execution_tree.json"]);
type Member = typeof MEMBERS[number];
type Kind = "agent" | "team" | "org";
type Frame = { type: string; payload: Record<string, any>; at: number };
type Signal = { agentRunId: string; status: string; at: number };
type Launch = { runId: string; cwd: string; resumed: boolean; conversation: string | null };

const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const AD_HOC_ID = /ad_hoc_task_[0-9a-f-]{36}/;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const objectsIn = (value: unknown): Record<string, any>[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Record<string, any>, ...Object.values(value).flatMap(objectsIn)];
};
/** Task Team copies in a tree: team run ID and members (address, run ID). */
const teamCopies = (tree: unknown) => objectsIn(tree).flatMap((record) => {
  const teamRunId = record.teamRunId ?? record.team_run_id;
  const startedAt = record.startedAt ?? record.started_at;
  if (typeof teamRunId !== "string" || typeof startedAt !== "string" || !Array.isArray(record.members)) return [];
  return [{ teamRunId, members: (record.members as any[]).map((member) => ({ address: member.address as string,
    agentRunId: (member.agentRunId ?? member.agent_run_id) as string })) }];
});
/** The `CALLED:<result>` replies of the scripted actor, in conversation order. */
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Record<string, any> => {
  const raw = JSON.parse(called) as Record<string, any>;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called, isError: raw.isError === true }; }
};
/** Working directories of every live scripted AGY process (one per running agent; `…/<runId>/agy-project`). */
const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
  .filter(Boolean).map((pid) => (spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout
    .split("\n").find((line) => line.startsWith("n")) ?? "").slice(1));
const processLive = (agentRunId: string) => liveAgyCwds().some((cwd) => cwd.includes(agentRunId));
/** Status changes on a root view: Team `AGENT_STATUS` frames, or Agent/Org `agent_presentation` status messages. */
const signalsIn = (frames: readonly Frame[]): Signal[] => frames.flatMap((frame) => {
  if (frame.type === "AGENT_STATUS") return typeof frame.payload.agent_run_id === "string"
    ? [{ agentRunId: frame.payload.agent_run_id, status: frame.payload.status, at: frame.at }] : [];
  return objectsIn(frame.payload).flatMap((record) => record.message?.type === "AGENT_STATUS" && typeof record.agent_run_id === "string"
    && typeof record.message?.payload?.status === "string"
    ? [{ agentRunId: record.agent_run_id, status: record.message.payload.status, at: frame.at }] : []);
});
/** `agent_statuses` of a root view snapshot (what the sidebar and member header render), by run ID. */
const snapshotStatuses = (frames: readonly Frame[]): Record<string, string> => Object.fromEntries(frames
  .filter((frame) => frame.type.endsWith("_VIEW_SNAPSHOT"))
  .flatMap((frame) => objectsIn(frame.payload).flatMap((record) => Array.isArray(record.agent_statuses) ? record.agent_statuses : []))
  .map((status: any) => [status.agent_run_id, status.status]));

suite("Delegated Team copies start only the members that work reaches, in every root (real HTTP/WS/scoped MCP and AGY backend, scripted AGY actor)", () => {
  let dataDir = "", workspace = "", argvLog = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids = { manager: "", worker: "", squad: "", team: "", org: "" };
  const names = { squad: "" };
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = (model = MODEL) => ({ workspaceRootPath: workspace, llmModelIdentifier: model,
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const agentDefinition = async (name: string, toolNames: string[]) => (await graphql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (delegated Team lazy activation E2E)`, instructions: "Follow the user's request.", toolNames } },
  )).createAgentDefinition.id as string;
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  /** Every AGY launch so far: the run it belongs to and whether it resumed a conversation. */
  const launches = async (): Promise<Launch[]> => (await fs.readFile(argvLog, "utf8").catch(() => "")).trim().split("\n")
    .filter(Boolean).map((line) => {
      const entry = JSON.parse(line) as { argv: string[]; cwd: string };
      const index = entry.argv.indexOf("--conversation");
      return { runId: /([^/]+)\/agy-project$/.exec(entry.cwd)?.[1] ?? entry.cwd, cwd: entry.cwd, resumed: index >= 0,
        conversation: index >= 0 ? entry.argv[index + 1] ?? null : null };
    });
  const launchesFor = async (runIds: readonly string[], from = 0) => (await launches()).slice(from).filter((entry) => runIds.includes(entry.runId));
  /**
   * Saved execution-tree records of a Team copy: every root tree file under the data dir that holds it. Only the root
   * tree files are read (reading every JSON file under a busy data dir can take longer than the idle grace period).
   */
  const savedCopyRecords = async (teamRunId: string) => {
    const found: Array<{ file: string; members: Record<string, string | null> }> = [];
    const visit = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "agy-project" && entry.name !== ".agents") await visit(file); continue; }
        if (!entry.isFile() || !TREE_FILES.has(entry.name)) continue;
        const text = await fs.readFile(file, "utf8").catch(() => "");
        if (!text.includes(teamRunId)) continue;
        let parsed: unknown; try { parsed = JSON.parse(text); } catch { continue; }
        for (const record of objectsIn(parsed)) {
          if ((record.teamRunId ?? record.team_run_id) !== teamRunId || !Array.isArray(record.members)) continue;
          if (!(record.members as any[]).some((member) => "platformAgentRunId" in member)) continue;
          found.push({ file, members: Object.fromEntries((record.members as any[]).map((member) =>
            [String(member.address).split("/").pop(), member.platformAgentRunId ?? null])) });
        }
      }
    };
    await visit(dataDir);
    return found;
  };
  /** The one saved binding per member; every saved record of the copy must agree. */
  const savedBindings = async (teamRunId: string) => {
    const records = await savedCopyRecords(teamRunId);
    expect(records.length, `saved records of ${teamRunId}`).toBeGreaterThan(0);
    for (const record of records) expect(record.members, record.file).toEqual(records[0]!.members);
    return records[0]!.members as Record<Member, string | null>;
  };
  const terminate = async (kind: Kind, rootId: string) => {
    const result = kind === "agent"
      ? (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId })).terminateAgentRun
      : kind === "team"
        ? (await graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId })).terminateAgentTeamRun
        : (await graphql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).terminateAgentOrgRun;
    expect(result.success, result.message).toBe(true);
    const index = active.findIndex((run) => run.rootId === rootId);
    if (index >= 0) active.splice(index, 1);
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "delegated-team-lazy-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    await fs.writeFile(path.join(dataDir, ".env"), `AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n${GRACE_KEY}=${GRACE_MS}\n`);
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG", "AGY_FAKE_EXTRA_MODELS"]) savedEnv.set(key, process.env[key]);
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    const suffix = randomUUID().slice(0, 6);
    names.squad = `DTL Squad ${suffix}`;
    ids.manager = await agentDefinition(`DTL Manager ${suffix}`, ["create_or_update_task"]);
    ids.worker = await agentDefinition(`DTL Worker ${suffix}`, []);
    ids.squad = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names.squad, description: "Task Team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: MEMBERS.map((memberName) => ({ memberName, ref: ids.worker, refScope: "SHARED" })) } },
    )).createAgentTeamDefinition.id;
    ids.team = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: `DTL Team ${suffix}`, description: "Team root", instructions: "Follow requests.", coordinatorMemberName: "manager",
        nodes: [{ memberName: "manager", ref: ids.manager, refScope: "SHARED" }, { memberName: "worker", ref: ids.worker, refScope: "SHARED" }] } },
    )).createAgentTeamDefinition.id;
    // Org: `/squad` is delegated; `/broken` is the same Team whose coordinator is configured with a model AGY does not offer.
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `DTL Org ${suffix}`, description: "Org root", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" },
        { memberName: "squad", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" },
        { memberName: "broken", ref: ids.squad, refType: "AGENT_TEAM", refScope: "SHARED" }] } },
    )).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    const leftover = liveAgyCwds().filter((cwd) => dataDir && cwd.includes(path.basename(dataDir)));
    if (leftover.length) errors.push(`live AGY processes after close: ${leftover.join(", ")}`);
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    const dir = process.env["DELEGATED_TEAM_LAZY_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "delegated-team-lazy-member-activation.json"), `${JSON.stringify({ ...evidence,
        cleanup: { dataRemoved: await fs.access(dataDir).then(() => false, () => true),
          homeRemoved: !home || await fs.access(home).then(() => false, () => true), serverClosed: !app?.server.listening,
          remainingRoots: active.length, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A root of one kind with its Manager, a live view, and readers of its tree and conversations. */
  /** Org placements: by default the retiring-model writer and broken coordinator; a live case replaces them. */
  const defaultOrgOverrides = () => [
    { address: "/squad/writer", configuration: { llmModelIdentifier: RETIRING_MODEL } },
    { address: "/broken/lead", configuration: { llmModelIdentifier: RETIRING_MODEL } }];
  const startRoot = async (kind: Kind, orgOverrides: unknown[] = defaultOrgOverrides()) => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.team, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;
    } else {
      // The retiring model is offered while the Org is configured, then retired before any member starts.
      process.env["AGY_FAKE_EXTRA_MODELS"] = RETIRING_MODEL;
      const created = await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), teamOverrides: [], agentOverrides: orgOverrides } })
        .then((data) => data.createAgentOrgRun).finally(() => { delete process.env["AGY_FAKE_EXTRA_MODELS"]; });
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      managerRunId = (tree.rootOrg.members as any[]).find((member) => member.address === "/manager")!.agentRunId;
    }
    active.push({ kind, rootId });
    expect(managerRunId).toBeTruthy();
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const channels: { input: Awaited<ReturnType<typeof connect>> | null; view: Awaited<ReturnType<typeof connect>> } = {
      input: kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED")) : null,
      view: await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot)),
    };
    /** Every status change seen on this root's views (across reconnects). */
    const seen: Frame[][] = [channels.view.frames];
    const reconnect = async () => {
      if (kind === "org") {
        const restored = (await graphql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).restoreAgentOrgRun;
        expect(restored.success, restored.message).toBe(true);
      }
      if (kind === "agent") channels.input = await connect("agent", rootId, (frames) => frames.some((f) => f.type === "CONNECTED"));
      channels.view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
      seen.push(channels.view.frames);
      active.push({ kind, rootId });
    };
    const closeChannels = () => { channels.view.socket.close(); channels.input?.socket.close(); };
    /** A fresh view's snapshot `agent_statuses` (what a newly opened sidebar renders). */
    const freshStatuses = async () => {
      const view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
      const statuses = snapshotStatuses(view.frames);
      view.socket.close();
      return statuses;
    };
    const sendToManager = (content: string) => {
      if (kind === "org") channels.view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? channels.input!.socket : channels.view.socket, { agent_run_id: managerRunId, content });
    };
    const liveTree = async () => {
      if (kind === "agent") return (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null;
      if (kind === "team") return (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      return (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    };
    const conversationOf = async (agentRunId: string, address: string) => {
      if (kind === "agent" && agentRunId === rootId) return (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`,
        { id: agentRunId })).getRunProjection?.conversation;
      if (kind === "agent") return (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
    };
    const managerAddress = kind === "agent" ? "/" : "/manager";
    /** The scripted agent calls one actual agent tool (content sent by `send`); returns its tool result. */
    const callsFrom = async (agentRunId: string, address: string, send: () => unknown) => {
      const before = calledResults(await conversationOf(agentRunId, address)).length;
      await send();
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(agentRunId, address)); return results.length > before; },
        `${kind}: tool result of ${address}`, 60_000);
      return toolResult(results[before]!);
    };
    const managerCalls = (content: string) => callsFrom(managerRunId, managerAddress, () => sendToManager(content));
    const signals = () => seen.flatMap(signalsIn);
    /** Conversation error cards (`ERROR` agent messages) published for one agent on this root's views. */
    const errorCards = (agentRunId: string) => seen.flat().flatMap((frame) => frame.type === "ERROR" && frame.payload.agent_run_id === agentRunId ? [frame.payload]
      : objectsIn(frame.payload).filter((record) => record.agent_run_id === agentRunId && record.message?.type === "ERROR").map((record) => record.message.payload));
    const signal = async (label: string, match: (entry: Signal) => boolean, ms = 60_000) => {
      let found: Signal | undefined;
      await until(() => Boolean(found = signals().find(match)), `${kind}: ${label}`, ms);
      return found!;
    };
    const answered = (agentRunId: string, address: string, marker: string) => until(async () => {
      const text = JSON.stringify(await conversationOf(agentRunId, address));
      return text.includes(marker) && text.lastIndexOf("OK") > text.indexOf(marker);
    }, `${kind}: ${address} answered ${marker}`, 60_000);
    return { kind, rootId, managerRunId, liveTree, conversationOf, callsFrom, managerCalls, signals, signal, answered, errorCards,
      freshStatuses, reconnect, closeChannels };
  };
  type Root = Awaited<ReturnType<typeof startRoot>>;

  /** The Manager delegates the Team; returns the copy (its members by name) and the delegation result. */
  const delegateCopy = async (root: Root, recipient: string, work: Record<string, string>, known: readonly string[] = []) => {
    const result = await root.managerCalls(callTool("delegate_task", { recipient_address: recipient, ...work }));
    return { result, ...(await copyOf(root, result, known)) };
  };
  const copyOf = async (root: Root, result: Record<string, any>, known: readonly string[]) => {
    const lead = result.target_team_coordinator_agent_run_id as string;
    expect(lead, JSON.stringify(result)).toBeTruthy();
    expect(result.target_kind).toBe("team");
    let copy: ReturnType<typeof teamCopies>[number] | undefined;
    await until(async () => Boolean(copy = teamCopies(await root.liveTree()).find((entry) => !known.includes(entry.teamRunId)
      && entry.members.some((member) => member.agentRunId === lead))), `${root.kind}: copy of ${lead}`, 60_000);
    const members = Object.fromEntries(copy!.members.map((member) => [member.address.split("/").pop(), member])) as
      Record<Member, { address: string; agentRunId: string }>;
    expect(Object.keys(members).sort()).toEqual([...MEMBERS].sort());
    expect(members.lead.agentRunId).toBe(lead);
    return { teamRunId: copy!.teamRunId, members };
  };
  type Copy = Awaited<ReturnType<typeof copyOf>>;
  const runIdsOf = (copy: Copy, names: readonly Member[] = MEMBERS) => names.map((name) => copy.members[name].agentRunId);
  /** The Manager asks one copy member to call an agent tool; returns that member's tool result. */
  const memberCalls = (root: Root, copy: Copy, member: Member, content: string) => root.callsFrom(copy.members[member].agentRunId,
    copy.members[member].address, async () => {
      const sent = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copy.members[member].agentRunId, content }));
      expect(sent, `${root.kind}: Manager → ${member} ${JSON.stringify(sent)}`).toMatchObject({ accepted: true });
    });
  const statusesOf = (statuses: Record<string, string>, copy: Copy) =>
    Object.fromEntries(MEMBERS.map((name) => [name, statuses[copy.members[name].agentRunId] ?? "absent"]));
  /**
   * Asserts a fresh view's statuses of the copy's members. A member this step expects `idle` that went idle and was then
   * shut down by the idle grace period before the view was opened (a slow step on a loaded host) is accepted as `idle`:
   * it was started and went idle, and its shutdown is the designed lifecycle. Every other expectation is exact.
   */
  const expectStatuses = async (root: Root, copy: Copy, expected: Record<Member, string>) => {
    const statuses = statusesOf(await root.freshStatuses(), copy);
    const now = Date.now();
    for (const name of MEMBERS) {
      if (expected[name] !== "idle" || statuses[name] !== "offline") continue;
      const runId = copy.members[name].agentRunId;
      const last = root.signals().filter((e) => e.agentRunId === runId && e.status !== "offline").at(-1);
      if (last?.status === "idle" && now - last.at >= GRACE_MS - 2_000 && !processLive(runId)) {
        statuses[name] = "idle";
        ((evidence.graceShutdownAccepted ??= []) as unknown[]).push({ root: root.kind, teamRunId: copy.teamRunId, member: name, idleMs: now - last.at });
      }
    }
    expect(statuses, `${root.kind} statuses of ${copy.teamRunId}`).toEqual(expected);
  };
  const offline = (copy: Copy, names: readonly Member[]) => names.every((name) => !processLive(copy.members[name].agentRunId));

  const rootScenario = async (kind: Kind) => {
    const record: Record<string, unknown> = {};
    evidence[kind] = record;
    const root = await startRoot(kind);
    const squad = kind === "org" ? "/squad" : `/${segment(names.squad)}`;
    const brokenWriter = kind === "org";
    // REQ-004: a Project Task (task_id) in the Agent root, described work (an ad-hoc Task) in the Team and Org roots.
    let taskId: string;
    let work: Record<string, string>;
    if (kind === "agent") {
      const projectId = (await graphql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`,
        { input: { name: `DTL ${randomUUID().slice(0, 8)}` } })).createProject.projectId as string;
      taskId = (await graphql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`,
        { input: { projectId, description: "Team work. Marker LEAD-FIRST." } })).createProjectTask.taskId as string;
      work = { task_id: taskId };
    } else work = { description: "Team work. Marker LEAD-FIRST." };

    // DTL-001 (AC-001, AC-003, QR-001): delegation starts only the coordinator.
    const before = (await launches()).length;
    const { result, ...copy } = await delegateCopy(root, squad, work);
    if (kind !== "agent") taskId = AD_HOC_ID.exec(JSON.stringify(result))?.[0] as string;
    expect(taskId!, JSON.stringify(result)).toBeTruthy();
    await root.answered(copy.members.lead.agentRunId, copy.members.lead.address, "LEAD-FIRST");
    await root.signal("lead idle", (e) => e.agentRunId === copy.members.lead.agentRunId && e.status === "idle");
    await wait(2_000);
    const atDelegation = await launchesFor(runIdsOf(copy), before);
    expect(atDelegation.map((entry) => [entry.runId, entry.resumed])).toEqual([[copy.members.lead.agentRunId, false]]);
    expect(MEMBERS.map((name) => [name, processLive(copy.members[name].agentRunId)])).toEqual(
      [["lead", true], ["reviewer", false], ["writer", false], ["tester", false]]);
    const firstBindings = await savedBindings(copy.teamRunId);
    expect(firstBindings).toEqual({ lead: expect.any(String), reviewer: null, writer: null, tester: null });
    await expectStatuses(root, copy, { lead: "idle", reviewer: "offline", writer: "offline", tester: "offline" });
    for (const name of ["reviewer", "writer", "tester"] as const) {
      expect(root.signals().filter((e) => e.agentRunId === copy.members[name].agentRunId && e.status !== "offline"), `${kind} ${name} live statuses`).toEqual([]);
    }
    record.delegation = { result, teamRunId: copy.teamRunId, members: copy.members, launches: atDelegation, bindings: firstBindings };

    // DTL-002 (AC-002): the coordinator's message starts only its recipient.
    const handoffFrom = (await launches()).length;
    const handoff = await memberCalls(root, copy, "lead", callTool("send_message_to", { recipient_address: copy.members.reviewer.address,
      content: "Please review. Marker REVIEW-FIRST." }));
    expect(handoff, `${kind} lead → reviewer ${JSON.stringify(handoff)}`).toMatchObject({ accepted: true });
    await root.answered(copy.members.reviewer.agentRunId, copy.members.reviewer.address, "REVIEW-FIRST");
    const reviewerIdle = await root.signal("reviewer idle", (e) => e.agentRunId === copy.members.reviewer.agentRunId && e.status === "idle");
    const reviewerStatuses = root.signals().filter((e) => e.agentRunId === copy.members.reviewer.agentRunId && e.at <= reviewerIdle.at).map((e) => e.status);
    expect(reviewerStatuses[0], `${kind} reviewer first status ${reviewerStatuses}`).toBe("initializing");
    expect(reviewerStatuses.at(-1)).toBe("idle");
    expect((await launchesFor(runIdsOf(copy), handoffFrom)).map((entry) => [entry.runId, entry.resumed]))
      .toEqual([[copy.members.reviewer.agentRunId, false]]);
    const handoffBindings = await savedBindings(copy.teamRunId);
    expect(handoffBindings).toEqual({ lead: firstBindings.lead, reviewer: expect.any(String), writer: null, tester: null });
    await expectStatuses(root, copy, { lead: "idle", reviewer: "idle", writer: "offline", tester: "offline" });
    record.handoff = { result: handoff, reviewerStatuses, bindings: handoffBindings };

    if (brokenWriter) {
      // DTL-003 (AC-004): a member that cannot start fails the sender's delivery and shows error; the rest are unaffected.
      const failedFrom = (await launches()).length;
      const failed = await memberCalls(root, copy, "lead", callTool("send_message_to", { recipient_address: copy.members.writer.address,
        content: "Please write. Marker WRITE-FIRST." }));
      expect(failed, `${kind} lead → writer ${JSON.stringify(failed)}`).toMatchObject({ accepted: false, code: "AGENT_RUN_ACTIVATION_FAILED" });
      expect(failed.message).toMatch(/AGY_MODEL_UNAVAILABLE/);
      await root.signal("writer error", (e) => e.agentRunId === copy.members.writer.agentRunId && e.status === "error");
      // The writer's conversation shows the failure once (SR-004: one error card per failed start).
      await until(() => root.errorCards(copy.members.writer.agentRunId).length > 0, `${kind}: writer error card`, 15_000);
      await wait(1_000);
      const cards = root.errorCards(copy.members.writer.agentRunId);
      expect(cards, JSON.stringify(cards)).toHaveLength(1);
      expect(JSON.stringify(cards[0])).toMatch(/AGY_MODEL_UNAVAILABLE/);
      expect(await launchesFor(runIdsOf(copy), failedFrom)).toEqual([]);
      await expectStatuses(root, copy, { lead: "idle", reviewer: "idle", writer: "error", tester: "offline" });
      expect((await savedBindings(copy.teamRunId)).writer).toBeNull();
      const stillWorks = await memberCalls(root, copy, "lead", callTool("send_message_to", { recipient_address: copy.members.reviewer.address,
        content: "Second review. Marker REVIEW-SECOND." }));
      expect(stillWorks, JSON.stringify(stillWorks)).toMatchObject({ accepted: true });
      await root.answered(copy.members.reviewer.agentRunId, copy.members.reviewer.address, "REVIEW-SECOND");
      record.memberStartFailure = { result: failed, errorCard: cards[0] };
    } else {
      // DTL-004 (AC-003, REQ-004): a copy member delegates the Team (a Team-hosted copy); only its coordinator starts.
      const nestedFrom = (await launches()).length;
      const nestedResult = await memberCalls(root, copy, "lead", callTool("delegate_task", { recipient_address: squad,
        description: "Nested team work. Marker NESTED-FIRST." }));
      const nested = await copyOf(root, nestedResult, [copy.teamRunId]);
      await root.answered(nested.members.lead.agentRunId, nested.members.lead.address, "NESTED-FIRST");
      await wait(2_000);
      expect((await launchesFor(runIdsOf(nested), nestedFrom)).map((entry) => [entry.runId, entry.resumed]))
        .toEqual([[nested.members.lead.agentRunId, false]]);
      expect(await savedBindings(nested.teamRunId)).toEqual({ lead: expect.any(String), reviewer: null, writer: null, tester: null });
      await expectStatuses(root, nested, { lead: "idle", reviewer: "offline", writer: "offline", tester: "offline" });
      record.nestedCopy = { result: nestedResult, teamRunId: nested.teamRunId };
    }

    // DTL-005 (AC-005): idle shutdown of a copy with never-started members; the Manager's message resumes only the lead.
    await until(() => offline(copy, MEMBERS), `${kind}: copy processes gone after the grace period`, GRACE_MS + 45_000);
    await root.signal("lead offline", (e) => e.agentRunId === copy.members.lead.agentRunId && e.status === "offline", 15_000);
    const wakeFrom = (await launches()).length;
    const woken = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copy.members.lead.agentRunId, content: "Wake up. Marker LEAD-WAKE." }));
    expect(woken, JSON.stringify(woken)).toMatchObject({ accepted: true });
    await root.answered(copy.members.lead.agentRunId, copy.members.lead.address, "LEAD-WAKE");
    await wait(2_000);
    const wakeLaunches = await launchesFor(runIdsOf(copy), wakeFrom);
    expect(wakeLaunches.map((entry) => [entry.runId, entry.resumed, entry.conversation]))
      .toEqual([[copy.members.lead.agentRunId, true, firstBindings.lead]]);
    expect(await savedBindings(copy.teamRunId)).toEqual({ ...handoffBindings });
    await expectStatuses(root, copy, { lead: "idle", reviewer: "offline", writer: "offline", tester: "offline" });
    record.idleRestore = { launches: wakeLaunches };

    // DTL-006 (AC-005): Task DONE stops the copy; reopen and the Manager's message resume only the lead.
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId!, status: "DONE" }));
    await until(() => offline(copy, MEMBERS), `${kind}: copy stopped by DONE`, 30_000);
    await root.managerCalls(callTool("create_or_update_task", { task_id: taskId!, status: "TODO" }));
    const reopenFrom = (await launches()).length;
    const reopened = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copy.members.lead.agentRunId, content: "Reopened. Marker LEAD-REOPEN." }));
    expect(reopened, JSON.stringify(reopened)).toMatchObject({ accepted: true });
    await root.answered(copy.members.lead.agentRunId, copy.members.lead.address, "LEAD-REOPEN");
    await wait(2_000);
    const reopenLaunches = await launchesFor(runIdsOf(copy), reopenFrom);
    expect(reopenLaunches.map((entry) => [entry.runId, entry.resumed, entry.conversation]))
      .toEqual([[copy.members.lead.agentRunId, true, firstBindings.lead]]);
    expect(await savedBindings(copy.teamRunId)).toEqual({ ...handoffBindings });
    record.reactivation = { launches: reopenLaunches };

    // DTL-007 (AC-005, persisted data): root stop; the saved tree gets the pre-fix shape (the never-started tester bound,
    // no conversation); root restore and the Manager's message resume only the lead; the tester's first work starts fresh.
    root.closeChannels();
    await terminate(kind, root.rootId);
    await until(() => offline(copy, MEMBERS) && !processLive(root.managerRunId), `${kind}: root stopped`, 30_000);
    const legacyBinding = `legacy-unused-${randomUUID()}`;
    const records = await savedCopyRecords(copy.teamRunId);
    for (const file of new Set(records.map((entry) => entry.file))) {
      const saved = JSON.parse(await fs.readFile(file, "utf8"));
      for (const entry of objectsIn(saved)) {
        if ((entry.teamRunId ?? entry.team_run_id) !== copy.teamRunId || !Array.isArray(entry.members)) continue;
        for (const member of entry.members as any[]) if (member.address === copy.members.tester.address) member.platformAgentRunId = legacyBinding;
      }
      await fs.writeFile(file, JSON.stringify(saved, null, 2));
    }
    expect((await savedBindings(copy.teamRunId)).tester).toBe(legacyBinding);
    await root.reconnect();
    const restartFrom = (await launches()).length;
    const restarted = await root.managerCalls(callTool("send_message_to", { target_agent_run_id: copy.members.lead.agentRunId, content: "After restart. Marker LEAD-RESTART." }));
    expect(restarted, JSON.stringify(restarted)).toMatchObject({ accepted: true });
    await root.answered(copy.members.lead.agentRunId, copy.members.lead.address, "LEAD-RESTART");
    await wait(2_000);
    expect((await launchesFor(runIdsOf(copy), restartFrom)).map((entry) => [entry.runId, entry.resumed, entry.conversation]))
      .toEqual([[copy.members.lead.agentRunId, true, firstBindings.lead]]);
    await expectStatuses(root, copy, { lead: "idle", reviewer: "offline", writer: "offline", tester: "offline" });
    const testerFrom = (await launches()).length;
    const toTester = await memberCalls(root, copy, "lead", callTool("send_message_to", { recipient_address: copy.members.tester.address,
      content: "Please test. Marker TEST-FIRST." }));
    expect(toTester, JSON.stringify(toTester)).toMatchObject({ accepted: true });
    await root.answered(copy.members.tester.agentRunId, copy.members.tester.address, "TEST-FIRST");
    await wait(2_000);
    expect((await launchesFor(runIdsOf(copy), testerFrom)).map((entry) => [entry.runId, entry.resumed]))
      .toEqual([[copy.members.tester.agentRunId, false]]);
    const finalBindings = await savedBindings(copy.teamRunId);
    expect(finalBindings).toEqual({ lead: firstBindings.lead, reviewer: handoffBindings.reviewer, writer: null, tester: expect.any(String) });
    expect(finalBindings.tester).not.toBe(legacyBinding);
    await expectStatuses(root, copy, { lead: "idle", reviewer: "offline", writer: "offline", tester: "idle" });
    record.legacyRestore = { legacyBinding, finalBindings };
    root.closeChannels();
    await terminate(kind, root.rootId);
    return record;
  };

  it("in every root, a delegated copy starts only its coordinator; other members start on first work, through idle shutdown, DONE/reopen and a stopped root with a pre-fix saved tree", async () => {
    const settled = await Promise.allSettled((["agent", "team", "org"] as const).map(rootScenario));
    const failures = settled.flatMap((result, index) => result.status === "rejected" ? [`${["agent", "team", "org"][index]}: ${String(result.reason?.stack ?? result.reason)}`] : []);
    expect(failures).toEqual([]);
  }, 600_000);

  it("Org root: a coordinator that cannot start fails delegate_task and starts no member (AC-004)", async () => {
    const kind = "org" as const;
    const root = await startRoot(kind);
    const from = (await launches()).length;
    const failed = await root.managerCalls(callTool("delegate_task", { recipient_address: "/broken", description: "Work for a broken Team." }));
    expect(failed.delegated ?? false, JSON.stringify(failed)).toBe(false);
    expect(JSON.stringify(failed)).toMatch(/AGY_MODEL_UNAVAILABLE/);
    await wait(2_000);
    const after = (await launches()).slice(from).filter((entry) => entry.runId !== root.managerRunId);
    expect(after, `${kind} launches for the failed copy`).toEqual([]);
    evidence[`${kind}CoordinatorFailure`] = { result: failed };
    root.closeChannels();
    await terminate(kind, root.rootId);
  }, 120_000);

  // DTL-009 (AC-001, QR-001 on the Claude Agent SDK runtime): the scripted Manager delegates a Team whose members run on a
  // real Claude model; only the coordinator gets a Claude session (its saved binding); the others have none and are Offline.
  (liveClaude ? it : it.skip)("Org root, real Claude Agent SDK members: delegation starts only the coordinator's Claude session (QR-001)", async () => {
    const claude = { workspaceRootPath: workspace, llmModelIdentifier: "haiku", llmConfig: null, autoExecuteTools: true, runtimeKind: "claude_agent_sdk" };
    const root = await startRoot("org", MEMBERS.map((member) => ({ address: `/squad/${member}`, configuration: claude })));
    const { result, ...copy } = await delegateCopy(root, "/squad", { description: "Do not use any tools. Reply with only the word READY." });
    const replied = async () => ((await root.conversationOf(copy.members.lead.agentRunId, copy.members.lead.address)) as any[] ?? [])
      .some((entry) => entry.role === "assistant" && /READY/.test(String(entry.content)));
    await until(replied, "live Claude lead replied READY", 180_000);
    await root.signal("live lead idle", (e) => e.agentRunId === copy.members.lead.agentRunId && e.status === "idle", 60_000);
    await wait(2_000);
    const bindings = await savedBindings(copy.teamRunId);
    expect(bindings).toEqual({ lead: expect.any(String), reviewer: null, writer: null, tester: null });
    await expectStatuses(root, copy, { lead: "idle", reviewer: "offline", writer: "offline", tester: "offline" });
    for (const name of ["reviewer", "writer", "tester"] as const) {
      expect(root.signals().filter((e) => e.agentRunId === copy.members[name].agentRunId && e.status !== "offline"), `live ${name}`).toEqual([]);
    }
    // The scripted AGY actor only answers "OK" or "CALLED:…": READY comes from the real model.
    evidence.liveClaude = { result, teamRunId: copy.teamRunId, bindings };
    root.closeChannels();
    await terminate("org", root.rootId);
  }, 420_000);
});
