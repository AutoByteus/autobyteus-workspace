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
// About 40 seconds. Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
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
const NOT_OFFERED = "dcm-no-such-model";
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
  const active: Array<{ kind: "agent" | "team"; rootId: string }> = [];
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
  const agentDefinition = async (key: string, toolNames: string[]) => {
    names[key] = `DCM ${key} ${randomUUID().slice(0, 6)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: names[key], role: "assistant", description: `${key} (delegated copy model change E2E)`, instructions: "Follow the user's request.", toolNames } })).createAgentDefinition.id;
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
    return { runId: /([^/]+)\/agy-project$/.exec(entry.cwd)?.[1] ?? entry.cwd, model: index >= 0 ? entry.argv[index + 1] ?? null : null };
  });
  const launchesOf = async (runId: string, from = 0) => (await agyLaunches()).slice(from).filter((entry) => entry.runId === runId).map((entry) => entry.model);
  const terminate = async (kind: "agent" | "team", rootId: string) => {
    const result = kind === "agent"
      ? (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: rootId })).terminateAgentRun
      : (await graphql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId })).terminateAgentTeamRun;
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
    for (const [key, value] of Object.entries({ AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: argvLog, AGY_FAKE_EXTRA_MODELS: ALT })) {
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
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A live root with its Manager on AGY/MODEL: its tree, the Manager's tool calls and conversations. */
  const startRoot = async (kind: "agent" | "team") => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config() } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: "/", ...config() }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config() },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config() }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;
    }
    active.push({ kind, rootId });
    const input = kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((frame) => frame.type === "CONNECTED")) : null;
    const view: { socket: WebSocket; frames: Frame[] } = await connect(kind === "agent" ? "agent-collaboration" : "agent-team", rootId,
      (frames) => frames.some((frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT")));
    const storedTree = async () => kind === "agent"
      ? (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: rootId })).agentRunCollaboration?.root_agent?.execution_tree ?? null
      : (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
    const managerConversation = async () => kind === "agent"
      ? (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: managerRunId })).getRunProjection?.conversation
      : (await graphql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
        { id: rootId, a: managerRunId })).getTeamMemberRunProjection?.conversation;
    const managerCalls = async (content: string) => {
      const before = calledResults(await managerConversation()).length;
      sendE2eSendMessageCommand(kind === "agent" ? input!.socket : view.socket, { agent_run_id: managerRunId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await managerConversation()); return results.length > before; }, `${kind}: Manager tool result`, 90_000);
      return toolResult(results[before]!);
    };
    /** Reopens a stopped Team run (as from history) and connects its view again. */
    const reopen = async () => {
      const restored = (await graphql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`, { id: rootId })).restoreAgentTeamRun;
      expect(restored.success, restored.message).toBe(true);
      active.push({ kind, rootId });
      const reconnected = await connect("agent-team", rootId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
      view.socket = reconnected.socket;
    };
    return { kind, rootId, managerRunId, rootKind: kind === "agent" ? "AGENT" : "AGENT_TEAM", storedTree, managerCalls, reopen };
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
    expect(recorded.userLaunchSelection ?? recorded.user_launch_selection).toMatchObject(root.kind === "agent"
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
});
