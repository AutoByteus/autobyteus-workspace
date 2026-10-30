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
import { grokAcpFixturePath } from "../helpers/grok-fake-cli.js";
import { fileURLToPath } from "node:url";

// A delegated copy's model changed by the user (delegated-copy-model-change SR-004..SR-007: REQ-001..REQ-009,
// AC-001..AC-011) through the real Studio HTTP/GraphQL/WebSocket server, scoped MCP agent tools, the task lifecycle,
// the real model catalog and run history, in the Agent Team and standalone Agent roots. Only the AGY CLI is scripted
// (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): `CALL_TOOL:{...}` makes the agent call the actual tool; every
// launch is logged with its argv, so the model a copy resumes on is proven at the runtime (`--model`).
// DCM-001 an agent copy: running → the change is refused (COPY_RUNNING); Stop (the copy alone, the root keeps running);
//   options; Save; its next message resumes it with its conversation on the chosen model.
// DCM-002 a Team copy: Stop as one unit; a Team-level choice reaches its members that follow the Team.
// DCM-003 a stopped Team run: the copies' choices and the run's own settings in one Save; one unavailable model
//   refuses the whole Save and writes nothing; after the run is reopened, the copy's next message runs on its choice.
// DCM-004 the standalone Agent root: Stop, Save, resume on the chosen model.
// DCM-005 the Org root: an agent copy and a Team copy are stopped, changed and resumed; the live
//   view receives `delegated_launch_selections_changed`; the same definition delegated again starts on normal resolution
//   (AC-007).
// DCM-006 a Team copy whose member is mid-turn (a fake Grok replaying `cancel.jsonl`: the turn stays open until the server
//   sends `session/cancel`): Stop interrupts it and stops the copy's nested copy, while the PM and another copy keep
//   running (AC-002, DEC-008); a Team choice reaches the follower lead and a never-started follower, not the member with
//   its own default (AC-003, AC-004); the nested copy resumes on its started model (REQ-006).
// DCM-007 the copy woken by its delegating agent during the edit refuses the Save and records nothing (AC-011); settings
//   that are not an object are refused (AC-006; undeclared settings are left out, SR-004); the Team stream publishes the saved choice; the provider stops offering
//   the chosen model before the resume: the failure is visible, nothing starts, the conversation is kept, and after the
//   user picks another model the copy resumes the same conversation on it (REQ-008).
// DCM-008 one member of a Team copy (the reviewer, after it has run; REQ-001 "any member", the AC-010 scenario): the copy is
//   stopped and only the reviewer gets its own model: it resumes on it in the same conversation, while the coordinator and
//   the never-started member keep their models and the choice is recorded on the reviewer alone; then a Team choice saved
//   together with the reviewer's own choice: the coordinator and the follower take the Team's, the reviewer keeps its own.
// About 25 seconds. Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-copy-model-change.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "dcm-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const AGY = "antigravity_cli";
const MODEL = "gemini-3.8-flash-low";
const ALT = "dcm-alt-model";
const ALT2 = "dcm-alt2-model";
const NOT_OFFERED = "dcm-no-such-model";
const GROK = "grok_build";
const GROK_MODEL = "grok-4.7";
const FAKE_GROK_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/grok-acp/fake-grok-cli.mjs");
type Kind = "agent" | "team" | "org";
type Frame = { type: string; payload: Record<string, any> };
type Rec = Record<string, any>;

const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string =>
    typeof value === "string" && value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return raw.structuredContent;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text;
  try { return JSON.parse(text); } catch { return { text: text ?? called, isError: raw.isError === true }; }
};

suite("A delegated copy's model changed by the user: stop, choose, resume (real HTTP/WS/scoped MCP, task lifecycle, catalog; scripted AGY)", () => {
  let dataDir = "", workspace = "", argvLog = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  let grokDir = "", grokRecord = "";
  const ids: Record<string, string> = {};
  const names: Record<string, string> = {};
  const savedEnv = new Map<string, string | undefined>();

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = (model = MODEL) => ({ workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY });
  const agentDefinition = async (key: string, toolNames: string[], defaultLaunchConfig: Rec | null = null) => {
    names[key] = `DCM ${key} ${randomUUID().slice(0, 6)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: names[key], role: "assistant", description: `${key} (delegated copy model change E2E)`, instructions: "Follow the user's request.", toolNames,
        ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  };
  const teamDefinition = async (key: string, members: Record<string, string>, coordinator = "lead") => {
    names[key] = `DCM ${key} ${randomUUID().slice(0, 6)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names[key], description: `${key} team`, instructions: "Follow requests.", coordinatorMemberName: coordinator,
        nodes: Object.entries(members).map(([memberName, ref]) => ({ memberName, ref: ids[ref], refScope: "SHARED" })) } })).createAgentTeamDefinition.id;
  };
  const connect = async (route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => ready(frames), `${route} stream ready`);
    return { socket, frames };
  };
  /** AGY launches so far: the run each belongs to and its `--model`. */
  const agyLaunches = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => {
    const entry = JSON.parse(line) as { argv: string[]; cwd: string };
    const index = entry.argv.indexOf("--model");
    const conversation = entry.argv.indexOf("--conversation");
    return { runId: /([^/]+)\/agy-project$/.exec(entry.cwd)?.[1] ?? entry.cwd, model: index >= 0 ? entry.argv[index + 1] ?? null : null,
      conversation: conversation >= 0 ? entry.argv[conversation + 1] ?? null : null };
  });
  /** Working directories of live scripted AGY processes (one per running agent: `…/<runId>/agy-project`). */
  const liveAgyCwds = (): string[] => spawnSync("pgrep", ["-f", "agy-failure-cli"], { encoding: "utf8" }).stdout.trim().split("\n")
    .filter(Boolean).map((pid) => (spawnSync("lsof", ["-a", "-d", "cwd", "-p", pid, "-Fn"], { encoding: "utf8" }).stdout
      .split("\n").find((line) => line.startsWith("n")) ?? "").slice(1));
  const agyLive = (runId: string) => liveAgyCwds().some((cwd) => cwd.includes(`/${runId}/`));
  /** Client messages the fake Grok agent received (FAKE_ACP_RECORD), by method. */
  const grokMethods = async () => (await fs.readFile(grokRecord, "utf8").catch(() => "")).trim().split("\n").filter(Boolean)
    .map((line) => { try { return (JSON.parse(line) as Rec).method as string | undefined; } catch { return undefined; } }).filter(Boolean);
  const launchesOf = async (runId: string, from = 0) => (await agyLaunches()).slice(from).filter((entry) => entry.runId === runId).map((entry) => entry.model);
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
  const stop = async (rootKind: string, rootRunId: string, target: Rec) => (await graphql(
    `mutation($input:DelegatedExecutionTargetInput!){stopDelegatedExecution(input:$input){success outcome message notStoppedUnattributed}}`,
    { input: { rootKind, rootRunId, ...target } })).stopDelegatedExecution;
  const update = async (rootKind: string, rootRunId: string, changes: Rec[], configuredPatches?: Rec[]) => (await graphql(
    `mutation($input:UpdateDelegatedLaunchSelectionsInput!){updateDelegatedLaunchSelections(input:$input){success outcome message fieldErrors{path message}}}`,
    { input: { rootKind, rootRunId, changes, ...(configuredPatches ? { configuredPatches } : {}) } })).updateDelegatedLaunchSelections;
  const options = async (rootKind: string, rootRunId: string) => (await graphql(
    `query($k:String!,$r:String!){delegatedLaunchModelOptions(rootKind:$k,rootRunId:$r){scope agentRunId teamRunId currentModelIdentifier replacements{llmModelIdentifier}}}`,
    { k: rootKind, r: rootRunId })).delegatedLaunchModelOptions as Rec[];
  const choice = (model: string) => ({ llmModelIdentifier: model, llmConfig: null });

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "dcm-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    // A member on the fake Grok replays `cancel.jsonl`: its turn stays open until the server sends `session/cancel`.
    grokDir = await fs.mkdtemp(path.join(os.tmpdir(), "dcm-fake-grok-"));
    grokRecord = path.join(grokDir, "acp-client-messages.jsonl");
    await fs.writeFile(path.join(grokDir, "grok"), `#!/bin/sh\nexec "${process.execPath}" "${FAKE_GROK_SCRIPT}" "$@"\n`, { mode: 0o755 });
    for (const [key, value] of Object.entries({ AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: argvLog, AGY_FAKE_EXTRA_MODELS: `${ALT},${ALT2}`,
      GROK_BUILD_COMMAND: path.join(grokDir, "grok"), FAKE_ACP_FIXTURE: grokAcpFixturePath("cancel"), FAKE_ACP_RECORD: grokRecord,
      FAKE_ACP_REPORT_MCP_READY: "1" })) {
      savedEnv.set(key, process.env[key]);
      process.env[key] = value;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    await agentDefinition("manager", []);
    await agentDefinition("worker", []);
    await agentDefinition("writer", []);
    await teamDefinition("duo", { lead: "worker", helper: "writer" });
    await teamDefinition("home", { manager: "manager", worker: "worker" }, "manager");
    await agentDefinition("scribe", []);
    await agentDefinition("grokker", [], { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL });
    await agentDefinition("specialist", [], { runtimeKind: AGY, llmModelIdentifier: ALT2 });
    await agentDefinition("fresh", []);
    await teamDefinition("crew", { lead: "worker", slow: "grokker", own: "specialist", fresh: "fresh" });
    await teamDefinition("trio", { lead: "worker", reviewer: "scribe", tester: "fresh" });
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `DCM Org ${randomUUID().slice(0, 6)}`, description: "Org root", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    await wait(1_000);
    const leftover = spawnSync("pgrep", ["-f", dataDir || "dcm-e2e-unset"], { encoding: "utf8" }).stdout.trim();
    if (dataDir && leftover) errors.push(`processes still referencing the data dir: ${leftover}`);
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    if (grokDir) await fs.rm(grokDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A live root with its Manager on AGY/MODEL: its tree, view frames, the Manager's and copy members' tool calls. */
  const startRoot = async (kind: Kind) => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(), teamOverrides: [], agentOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      managerRunId = (tree.rootOrg.members as Rec[]).find((member) => member.address === "/manager")!.agentRunId;
    }
    active.push({ kind, rootId });
    const input = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((frame) => frame.type === "CONNECTED")) : null;
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const view: { socket: WebSocket; frames: Frame[] } = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
    const storedTree = async () => kind === "agent"
      ? (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null
      : kind === "team"
        ? (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree
        : (await graphql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){org}}`, { id: rootId })).getAgentOrgRootHistory.org;
    /** The conversation of the Manager, or of any agent of the run (a copy member, a collaborator) by run ID and address. */
    const conversationOf = async (agentRunId: string, address: string) => {
      if (agentRunId === managerRunId && kind === "agent") return (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation;
      if (kind === "agent") return (await graphql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: rootId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
      if (kind === "team") return (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
      return (await graphql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
    };
    const managerAddress = kind === "agent" ? "/" : "/manager";
    const managerConversation = () => conversationOf(managerRunId, managerAddress);
    const sendToManager = (content: string) => {
      if (kind === "org") view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId, command_id: randomUUID(),
        message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
      else sendE2eSendMessageCommand(kind === "agent" ? input!.socket : view.socket, { agent_run_id: managerRunId, content });
    };
    const callsFrom = async (agentRunId: string, address: string, send: () => unknown) => {
      const before = calledResults(await conversationOf(agentRunId, address)).length;
      await send();
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(agentRunId, address)); return results.length > before; },
        `${kind}: tool result of ${address}`, 90_000);
      return toolResult(results[before]!);
    };
    const managerCalls = (content: string) => callsFrom(managerRunId, managerAddress, () => sendToManager(content));
    /** The Manager asks one agent of the run (by run ID) to call an agent tool; returns that agent's tool result. */
    const memberCalls = (target: { agentRunId: string; address: string }, content: string) => callsFrom(target.agentRunId, target.address, async () => {
      const sent = await managerCalls(callTool("send_message_to", { target_agent_run_id: target.agentRunId, content }));
      expect(sent, `${kind}: Manager → ${target.address} ${JSON.stringify(sent)}`).toMatchObject({ accepted: true });
    });
    /** Reopens a stopped Team run (as from history) and connects its view again. */
    const reopen = async () => {
      const restored = (await graphql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId })).restoreAgentTeamRun;
      expect(restored.success, restored.message).toBe(true);
      active.push({ kind, rootId });
      const reconnected = await connect("agent-team", rootId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
      view.socket = reconnected.socket;
      view.frames = reconnected.frames;
    };
    const rootKind = kind === "agent" ? "AGENT" : kind === "team" ? "AGENT_TEAM" : "AGENT_ORG";
    return { kind, rootId, managerRunId, rootKind, view, storedTree, conversationOf, managerCalls, memberCalls, reopen };
  };
  type Root = Awaited<ReturnType<typeof startRoot>>;
  /** The Manager messages a copy by run ID (a stopped copy is restored first, REQ-004). */
  const messageCopy = (root: Root, agentRunId: string, content: string) =>
    root.managerCalls(callTool("send_message_to", { target_agent_run_id: agentRunId, content }));

  const agentCopyScenario = async (root: Root) => {
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.writer!)}`, description: "Draft the notes." }));
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const copyRunId = delegated.target_agent_run_id as string;
    await until(async () => (await launchesOf(copyRunId)).length > 0, `${root.kind}: copy started`, 60_000);
    expect(await launchesOf(copyRunId)).toEqual([MODEL]);

    // AC-011: a running copy refuses the change; nothing is written.
    await expect(update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: choice(ALT) }]))
      .resolves.toMatchObject({ success: false, outcome: "COPY_RUNNING" });
    // REQ-009 / AC-002: Stop of the copy alone; the root keeps running and a second Stop finds it stopped.
    await expect(stop(root.rootKind, root.rootId, { agentRunId: copyRunId })).resolves.toMatchObject({ success: true, outcome: "STOPPED", notStoppedUnattributed: 0 });
    await expect(stop(root.rootKind, root.rootId, { agentRunId: copyRunId })).resolves.toMatchObject({ success: true, outcome: "ALREADY_STOPPED" });
    // REQ-003: the copy's options come from its runtime's catalog.
    const offered = (await options(root.rootKind, root.rootId)).find((row) => row.agentRunId === copyRunId)!;
    expect(offered).toMatchObject({ scope: "agent", currentModelIdentifier: MODEL });
    expect(offered.replacements.map((row: Rec) => row.llmModelIdentifier)).toContain(ALT);
    // AC-006: the same validation as stopped-run switching refuses a model its runtime does not offer.
    await expect(update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: choice(NOT_OFFERED) }]))
      .resolves.toMatchObject({ success: false, outcome: "MODEL_UNAVAILABLE" });
    // AC-001: Save records the choice beside the started values.
    await expect(update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: choice(ALT) }]))
      .resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    const recorded = objectsIn(await root.storedTree()).find((record) => (record.agentRunId ?? record.agent_run_id) === copyRunId && (record.startedAt ?? record.started_at))!;
    expect(recorded.userLaunchSelection ?? recorded.user_launch_selection).toMatchObject(root.kind !== "team"
      ? { llmModelIdentifier: ALT, llmConfig: null } : { llm_model_identifier: ALT, llm_config: null });
    // REQ-004 / AC-004: the next message resumes the copy on the chosen model.
    const from = (await agyLaunches()).length;
    await expect(messageCopy(root, copyRunId, "One more paragraph, please.")).resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(copyRunId, from)).length > 0, `${root.kind}: copy resumed`, 60_000);
    expect(await launchesOf(copyRunId, from)).toEqual([ALT]);
    return copyRunId;
  };

  it("DCM-001 / DCM-002 / DCM-003: a live Team run's agent and Team copies, then a stopped run's combined Save", async () => {
    const root = await startRoot("team");
    const copyRunId = await agentCopyScenario(root);

    // DCM-002: a Team copy stops as one unit; a Team-level choice reaches its members that follow the Team.
    const team = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.duo!)}`, description: "Review the notes." }));
    expect(team.delegated, JSON.stringify(team)).toBe(true);
    const lead = team.target_team_coordinator_agent_run_id as string;
    const teamRunId = team.target_team_run_id as string;
    await until(async () => (await launchesOf(lead)).length > 0, "team: copy lead started", 60_000);
    await expect(update(root.rootKind, root.rootId, [{ teamRunId, selection: choice(ALT) }])).resolves.toMatchObject({ outcome: "COPY_RUNNING" });
    await expect(stop(root.rootKind, root.rootId, { teamRunId })).resolves.toMatchObject({ outcome: "STOPPED" });
    await expect(update(root.rootKind, root.rootId, [{ teamRunId, selection: choice(ALT) }])).resolves.toMatchObject({ outcome: "UPDATED" });
    const from = (await agyLaunches()).length;
    await expect(messageCopy(root, lead, "Please continue the review.")).resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(lead, from)).length > 0, "team: copy lead resumed", 60_000);
    expect(await launchesOf(lead, from)).toEqual([ALT]);

    // DCM-003 (AR-004): on the stopped run, one Save of the copy's choice and the run's own setting; all or nothing.
    await terminate("team", root.rootId);
    const workerTree = async () => flattenE2eConfiguredAgentExecutions(await root.storedTree()).find((member) => member.memberAddress === "/worker")!;
    const workerPatch = { scopeKind: "CONFIGURED_AGENT", scopeAddress: "/worker", llmModelIdentifier: ALT, llmConfig: null };
    await expect(update("AGENT_TEAM", root.rootId, [{ agentRunId: copyRunId, selection: choice(NOT_OFFERED) }], [workerPatch]))
      .resolves.toMatchObject({ success: false, outcome: "MODEL_UNAVAILABLE" });
    expect(JSON.stringify(await workerTree())).not.toContain(ALT);
    await expect(update("AGENT_TEAM", root.rootId, [{ agentRunId: copyRunId, selection: choice(MODEL) }], [workerPatch]))
      .resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    expect(JSON.stringify(await workerTree())).toContain(ALT);
    const copyRecord = objectsIn(await root.storedTree()).find((record) => record.agent_run_id === copyRunId && record.started_at)!;
    expect(copyRecord.user_launch_selection).toMatchObject({ llm_model_identifier: MODEL });
    // A stopped run has nothing to stop.
    await expect(stop("AGENT_TEAM", root.rootId, { agentRunId: copyRunId })).resolves.toMatchObject({ success: false, outcome: "ROOT_NOT_ACTIVE" });
    // AC-005 / AC-009: the choice survives the root's stop and reopen; the copy's next message runs on it.
    await root.reopen();
    const reopenedFrom = (await agyLaunches()).length;
    await expect(messageCopy(root, copyRunId, "Back after the reopen.")).resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(copyRunId, reopenedFrom)).length > 0, "team: copy resumed after reopen", 60_000);
    expect(await launchesOf(copyRunId, reopenedFrom)).toEqual([MODEL]);
  }, 300_000);

  it("DCM-004: the standalone Agent root stops a copy, saves its choice and resumes it on that model", async () => {
    const root = await startRoot("agent");
    await agentCopyScenario(root);
  }, 240_000);

  /** A Team copy's members by name (address and run ID) as recorded in the root's tree. */
  const teamCopyMembers = async (root: Root, teamRunId: string) => {
    const record = objectsIn(await root.storedTree()).find((entry) => (entry.teamRunId ?? entry.team_run_id) === teamRunId && Array.isArray(entry.members)
      && (entry.members as Rec[]).some((member) => member.agentRunId ?? member.agent_run_id))!;
    return Object.fromEntries((record.members as Rec[]).map((member) => [String(member.address).split("/").pop(),
      { address: member.address as string, agentRunId: (member.agentRunId ?? member.agent_run_id) as string }]));
  };
  const started = (runId: string, label: string) => until(async () => (await launchesOf(runId)).length > 0, label, 60_000);

  it("DCM-005: the Org root: an agent copy and a Team copy are stopped, changed and resumed; an outside address is not found; the view publishes the choice; a later copy uses normal resolution", async () => {
    const root = await startRoot("org");
    const copyRunId = await agentCopyScenario(root);
    // IR-002: the live Org view is told about the committed choice.
    await until(() => root.view.frames.some((frame) => JSON.stringify(frame).includes("delegated_launch_selections_changed")
      && JSON.stringify(frame).includes(copyRunId) && JSON.stringify(frame).includes(ALT)), "org: choice published to the view", 30_000);
    // AC-007 (REQ-006): the same definition delegated again starts on normal resolution, not on the earlier choice.
    const again = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.writer!)}`, description: "Another draft." }));
    expect(again, JSON.stringify(again)).toMatchObject({ delegated: true, target_kind: "agent" });
    expect(again.target_agent_run_id).not.toBe(copyRunId);
    await started(again.target_agent_run_id, "org: later copy started");
    expect(await launchesOf(again.target_agent_run_id)).toEqual([MODEL]);

    // A Team copy in the Org root: running → refused; Stop; a Team choice; its follower lead resumes on it.
    const team = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.duo!)}`, description: "Review the notes." }));
    expect(team.delegated, JSON.stringify(team)).toBe(true);
    const lead = team.target_team_coordinator_agent_run_id as string;
    const teamRunId = team.target_team_run_id as string;
    await started(lead, "org: Team copy lead started");
    await expect(update(root.rootKind, root.rootId, [{ teamRunId, selection: choice(ALT) }])).resolves.toMatchObject({ outcome: "COPY_RUNNING" });
    await expect(stop(root.rootKind, root.rootId, { teamRunId })).resolves.toMatchObject({ success: true, outcome: "STOPPED" });
    await expect(update(root.rootKind, root.rootId, [{ teamRunId, selection: choice(ALT) }])).resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    let from = (await agyLaunches()).length;
    await expect(messageCopy(root, lead, "Please continue the review.")).resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(lead, from)).length > 0, "org: Team copy lead resumed", 60_000);
    expect(await launchesOf(lead, from)).toEqual([ALT]);

    // collaboration-model-contract: collaborators no longer exist, so there is no collaborator to change; messaging an
    // outside address is not found and records nothing, and a stored collaborator is a delegated run (the copies above).
    const scribeAddress = `/${segment(names.scribe!)}`;
    const treeBefore = JSON.stringify(objectsIn(await root.storedTree()).filter((entry) => entry.address === scribeAddress));
    await expect(root.managerCalls(callTool("send_message_to", { recipient_address: scribeAddress, content: "Take notes." })))
      .resolves.toMatchObject({ accepted: false, code: "COLLABORATION_TARGET_NOT_FOUND" });
    expect(JSON.stringify(objectsIn(await root.storedTree()).filter((entry) => entry.address === scribeAddress))).toBe(treeBefore);
    await terminate("org", root.rootId);
  }, 300_000);

  it("DCM-006: Stop of a Team copy interrupts a member mid-turn and stops its nested copy, while the PM and another copy keep running; a Team choice reaches followers only, and never-started members start on their resolved model", async () => {
    const root = await startRoot("team");
    const other = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.writer!)}`, description: "Keep writing." }));
    expect(other.delegated, JSON.stringify(other)).toBe(true);
    const otherRunId = other.target_agent_run_id as string;
    await started(otherRunId, "team: other copy started");
    const crew = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.crew!)}`, description: "Crew work." }));
    expect(crew.delegated, JSON.stringify(crew)).toBe(true);
    const teamRunId = crew.target_team_run_id as string;
    const members = await teamCopyMembers(root, teamRunId);
    const lead = members.lead!;
    await started(lead.agentRunId, "team: crew lead started");
    // The crew's lead starts a copy of its own (inside the crew, DEC-008).
    const nested = await root.memberCalls(lead, callTool("delegate_task", { recipient_address: `/${segment(names.scribe!)}`, description: "Nested notes." }));
    expect(nested.delegated, JSON.stringify(nested)).toBe(true);
    const nestedRunId = nested.target_agent_run_id as string;
    await started(nestedRunId, "team: nested copy started");
    // The slow member (fake Grok) begins a turn that stays open until it is interrupted.
    await expect(root.memberCalls(lead, callTool("send_message_to", { recipient_address: members.slow!.address, content: "Think it through." })))
      .resolves.toMatchObject({ accepted: true });
    await until(async () => (await grokMethods()).includes("session/prompt"), "team: slow member mid-turn", 60_000);
    await wait(1_000);
    expect(await grokMethods()).not.toContain("session/cancel");
    expect(agyLive(lead.agentRunId) && agyLive(nestedRunId) && agyLive(otherRunId)).toBe(true);

    // AC-002 / REQ-009: Stop the crew from its row.
    await expect(stop(root.rootKind, root.rootId, { teamRunId })).resolves.toMatchObject({ success: true, outcome: "STOPPED", notStoppedUnattributed: 0 });
    await until(async () => (await grokMethods()).includes("session/cancel"), "team: the slow member's turn was interrupted", 30_000);
    await until(() => !agyLive(lead.agentRunId) && !agyLive(nestedRunId), "team: the crew and its nested copy stopped", 30_000);
    expect(agyLive(otherRunId), "the other copy keeps running").toBe(true);
    // The PM keeps running: it answers and reaches the other copy.
    await expect(root.managerCalls(callTool("send_message_to", { target_agent_run_id: otherRunId, content: "Still there?" }))).resolves.toMatchObject({ accepted: true });
    // The copy's Task stays open: it is still listed and resumes on the next message.
    await expect(stop(root.rootKind, root.rootId, { teamRunId })).resolves.toMatchObject({ success: true, outcome: "ALREADY_STOPPED" });

    // AC-003 / AC-004: a Team choice; the follower lead and the never-started follower take it; the never-started member
    // with its own default keeps its own model; the nested copy resumes on its started model (REQ-006).
    await expect(update(root.rootKind, root.rootId, [{ teamRunId, selection: choice(ALT) }])).resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    const from = (await agyLaunches()).length;
    await expect(messageCopy(root, lead.agentRunId, "Please continue.")).resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(lead.agentRunId, from)).length > 0, "team: crew lead resumed", 60_000);
    expect(await launchesOf(lead.agentRunId, from)).toEqual([ALT]);
    for (const [name, model] of [["fresh", ALT], ["own", ALT2]] as const) {
      await expect(root.memberCalls(lead, callTool("send_message_to", { recipient_address: members[name]!.address, content: `Work for ${name}.` })))
        .resolves.toMatchObject({ accepted: true });
      await until(async () => (await launchesOf(members[name]!.agentRunId, from)).length > 0, `team: ${name} started`, 60_000);
      expect(await launchesOf(members[name]!.agentRunId, from), name).toEqual([model]);
    }
    await expect(root.memberCalls(lead, callTool("send_message_to", { target_agent_run_id: nestedRunId, content: "Resume the notes." })))
      .resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(nestedRunId, from)).length > 0, "team: nested copy resumed", 60_000);
    expect(await launchesOf(nestedRunId, from)).toEqual([MODEL]);
    await terminate("team", root.rootId);
  }, 300_000);

  it("DCM-008: one member of a Team copy gets its own model: it resumes on it in the same conversation while its teammates keep theirs; with a Team choice in the same Save, the member's own choice wins", async () => {
    const root = await startRoot("team");
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.trio!)}`, description: "Review the change." }));
    expect(delegated.delegated, JSON.stringify(delegated)).toBe(true);
    const teamRunId = delegated.target_team_run_id as string;
    const members = await teamCopyMembers(root, teamRunId);
    const { lead, reviewer, tester } = members as Record<"lead" | "reviewer" | "tester", { address: string; agentRunId: string }>;
    await started(lead.agentRunId, "team: trio lead started");
    // The reviewer has run once (on the copy's started model).
    await expect(root.memberCalls(lead, callTool("send_message_to", { recipient_address: reviewer.address, content: "First review. Marker REVIEW-ONE." })))
      .resolves.toMatchObject({ accepted: true });
    await started(reviewer.agentRunId, "team: reviewer started");
    expect(await launchesOf(reviewer.agentRunId)).toEqual([MODEL]);

    // Stop the copy; only the reviewer gets its own model.
    await expect(stop(root.rootKind, root.rootId, { teamRunId })).resolves.toMatchObject({ success: true, outcome: "STOPPED" });
    await expect(update(root.rootKind, root.rootId, [{ agentRunId: reviewer.agentRunId, selection: choice(ALT2) }]))
      .resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    const recorded = async () => {
      const record = objectsIn(await root.storedTree()).find((entry) => entry.team_run_id === teamRunId && entry.started_at && Array.isArray(entry.members))!;
      return {
        team: record.user_team_launch_selection?.llm_model_identifier ?? null,
        members: Object.fromEntries((record.members as Rec[]).map((member) => [String(member.address).split("/").pop(),
          member.user_launch_selection?.llm_model_identifier ?? null])),
      };
    };
    expect(await recorded()).toEqual({ team: null, members: { lead: null, reviewer: ALT2, tester: null } });

    // The coordinator resumes on its own model and sends the reviewer work: the reviewer resumes its conversation on the
    // choice; the never-started tester starts on its started model.
    let from = (await agyLaunches()).length;
    await expect(root.memberCalls(lead, callTool("send_message_to", { recipient_address: reviewer.address, content: "Second review. Marker REVIEW-TWO." })))
      .resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(reviewer.agentRunId, from)).length > 0, "team: reviewer resumed", 60_000);
    const reviewerResume = (await agyLaunches()).slice(from).filter((entry) => entry.runId === reviewer.agentRunId);
    expect(reviewerResume.map((entry) => entry.model)).toEqual([ALT2]);
    const reviewerConversation = reviewerResume[0]!.conversation;
    expect(reviewerConversation, "the reviewer resumes its own conversation").toBeTruthy();
    expect(await launchesOf(lead.agentRunId, from)).toEqual([MODEL]);
    await expect(root.memberCalls(lead, callTool("send_message_to", { recipient_address: tester.address, content: "Please test it." })))
      .resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(tester.agentRunId, from)).length > 0, "team: tester started", 60_000);
    expect(await launchesOf(tester.agentRunId, from)).toEqual([MODEL]);
    expect(JSON.stringify(await root.conversationOf(reviewer.agentRunId, reviewer.address))).toContain("Marker REVIEW-ONE");

    // One Save with a Team choice and the reviewer's own: the coordinator and the follower take the Team's, the reviewer
    // keeps its own and its conversation.
    await expect(stop(root.rootKind, root.rootId, { teamRunId })).resolves.toMatchObject({ success: true, outcome: "STOPPED" });
    await expect(update(root.rootKind, root.rootId, [{ teamRunId, selection: choice(ALT) }, { agentRunId: reviewer.agentRunId, selection: choice(ALT2) }]))
      .resolves.toMatchObject({ success: true });
    expect(await recorded()).toEqual({ team: ALT, members: { lead: null, reviewer: ALT2, tester: null } });
    from = (await agyLaunches()).length;
    for (const target of [reviewer, tester]) {
      await expect(root.memberCalls(lead, callTool("send_message_to", { recipient_address: target.address, content: "Once more." })))
        .resolves.toMatchObject({ accepted: true });
      await until(async () => (await launchesOf(target.agentRunId, from)).length > 0, `team: ${target.address} resumed`, 60_000);
    }
    const after = (await agyLaunches()).slice(from);
    expect(after.filter((entry) => entry.runId === lead.agentRunId).map((entry) => entry.model)).toEqual([ALT]);
    expect(after.filter((entry) => entry.runId === reviewer.agentRunId).map((entry) => [entry.model, entry.conversation])).toEqual([[ALT2, reviewerConversation]]);
    expect(after.filter((entry) => entry.runId === tester.agentRunId).map((entry) => entry.model)).toEqual([ALT]);
    await terminate("team", root.rootId);
  }, 300_000);

  it("DCM-007: a copy woken while edited refuses the Save and keeps nothing; invalid settings are refused; the Team stream publishes the choice; a provider refusal at resume is visible and recoverable in the same conversation", async () => {
    const root = await startRoot("team");
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.writer!)}`, description: "Draft the notes." }));
    const copyRunId = delegated.target_agent_run_id as string;
    await started(copyRunId, "team: copy started");
    const copyRecord = async () => objectsIn(await root.storedTree()).find((entry) => entry.agent_run_id === copyRunId && entry.started_at)!;
    await expect(stop(root.rootKind, root.rootId, { agentRunId: copyRunId })).resolves.toMatchObject({ outcome: "STOPPED" });
    // AC-011: the delegating agent wakes the copy while the user edits; the Save is refused and nothing is written.
    let from = (await agyLaunches()).length;
    await expect(messageCopy(root, copyRunId, "Are you there? Marker WAKE.")).resolves.toMatchObject({ accepted: true });
    await until(async () => (await launchesOf(copyRunId, from)).length > 0, "team: copy woken", 60_000);
    const conversation = (await agyLaunches()).slice(from).find((entry) => entry.runId === copyRunId)!.conversation;
    expect(conversation, "the woken copy resumes its conversation").toBeTruthy();
    const refused = await update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: choice(ALT) }]);
    expect(refused).toMatchObject({ success: false, outcome: "COPY_RUNNING" });
    expect(refused.message).toMatch(/running/i);
    expect((await copyRecord()).user_launch_selection ?? null).toBeNull();
    // AC-006: invalid settings are refused and nothing is recorded. (Settings the model does not declare are left out of the
    // saved config instead of refused since claude-anthropic-effort-control SR-004; settings that are not an object stay invalid.)
    await expect(stop(root.rootKind, root.rootId, { agentRunId: copyRunId })).resolves.toMatchObject({ outcome: "STOPPED" });
    const invalid = await update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: { llmModelIdentifier: MODEL, llmConfig: ["temperature", 0.2] } }]);
    expect(invalid).toMatchObject({ success: false, outcome: "VALIDATION_FAILED" });
    expect(invalid.fieldErrors.length).toBeGreaterThan(0);
    expect((await copyRecord()).user_launch_selection ?? null).toBeNull();
    // Save, published on the live Team stream (IR-002).
    await expect(update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: choice(ALT2) }])).resolves.toMatchObject({ success: true, outcome: "UPDATED" });
    await until(() => root.view.frames.some((frame) => frame.type === "DELEGATED_LAUNCH_SELECTIONS_CHANGED"
      && JSON.stringify(frame.payload).includes(copyRunId) && JSON.stringify(frame.payload).includes(ALT2)), "team: choice published", 30_000);
    // REQ-008: the provider stops offering the chosen model before the copy resumes: the failure is visible, nothing starts,
    // and the conversation is kept.
    process.env["AGY_FAKE_EXTRA_MODELS"] = ALT;
    try {
      from = (await agyLaunches()).length;
      const failed = await messageCopy(root, copyRunId, "Next paragraph.");
      expect(failed.accepted ?? false, JSON.stringify(failed)).toBe(false);
      expect(JSON.stringify(failed)).toMatch(/AGY_MODEL_UNAVAILABLE/);
      expect(await launchesOf(copyRunId, from)).toEqual([]);
      expect(JSON.stringify(await root.conversationOf(copyRunId, delegated.target_agent_address ?? ""))).toContain("Marker WAKE");
      // The user chooses another model; the next message resumes the same conversation on it.
      await expect(stop(root.rootKind, root.rootId, { agentRunId: copyRunId })).resolves.toMatchObject({ success: true });
      await expect(update(root.rootKind, root.rootId, [{ agentRunId: copyRunId, selection: choice(MODEL) }])).resolves.toMatchObject({ success: true, outcome: "UPDATED" });
      await expect(messageCopy(root, copyRunId, "Next paragraph, again.")).resolves.toMatchObject({ accepted: true });
      await until(async () => (await launchesOf(copyRunId, from)).length > 0, "team: copy resumed after the refusal", 60_000);
      const resumed = (await agyLaunches()).slice(from).filter((entry) => entry.runId === copyRunId);
      expect(resumed.map((entry) => [entry.model, entry.conversation])).toEqual([[MODEL, conversation]]);
    } finally {
      process.env["AGY_FAKE_EXTRA_MODELS"] = `${ALT},${ALT2}`;
    }
    await terminate("team", root.rootId);
  }, 240_000);
});
