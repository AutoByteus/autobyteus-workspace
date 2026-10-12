import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { grokAcpFixturePath } from "../helpers/grok-fake-cli.js";

// Delegated copies and collaborators honor agent and team launch defaults (delegated-launch-config-defaults SR-002:
// REQ-001..REQ-008, AC-001..AC-009, AC-015 shape) through the real Studio HTTP/GraphQL/WebSocket server, scoped MCP
// agent tools, collaborator admission, the real runtime availability and model-catalog probes, run history and root
// restore, in the standalone Agent, Agent Team and Agent Org roots. Only external CLIs are scripted, no inference:
// - AGY: tests/fixtures/agy-failure-cli.mjs (`linked_skills`): `CALL_TOOL:{...}` makes the agent call the actual tool;
//   `AGY_FAKE_EXTRA_MODELS` offers a second model (ALT) and, for AC-006, the retiring root model;
// - Grok Build: the recorded-fixture fake CLI (`prompt.jsonl`), a second real runtime for mixed-runtime copies;
// - Codex: `CODEX_APP_SERVER_COMMAND` names a missing file, so a Codex default is deterministically unavailable.
// Definitions (no team default except where stated): Squad = lead (none), engineer (Grok), reviewer (AGY ALT), offline
// (Codex), unoffered (AGY model not offered), badsettings (AGY model + settings it has none of), incomplete (runtime only),
// Squad team default AGY with a model not offered. Pair = lead (none), engineer (Grok), unoffered; Pair team default ALT.
// Cases (each root): DLC-001 catalog Team copy: recorded per-member launch/source, five notes in `launch_notes`;
// DLC-002 members start on their resolved runtime/model (Grok session; AGY argv `--model`); DLC-003 agent copy and
// agent bring-in (`send_message_to` message carries notes); DLC-004 Team bring-in with notes, then an extra copy at its
// address reuses the recorded per-member values without notes; DLC-005 teammate delegation inside the copy reuses the
// recorded value without notes; a copy member's helper bring-in carries its note once. The extra copy records no snapshot,
// so its per-member values are proven at the runtime (Grok session, AGY `--model`).
// Agent root only: DLC-006 the root's model is retired: a delegation/bring-in that needs the inherited layer fails with
// today's text and adds nothing; an agent with a usable default still starts; a user `@` mention only resolves.
// Agent and Team roots: DLC-007 a definition default edited after a copy started: the copy keeps its recorded values
// through root stop/restore; a new copy uses the new default; DLC-008 the saved tree is given the pre-change shape
// (no sources, no member launches) for a copy and a collaborator Team: restore loads, sources read "not recorded" and
// members run on the Team value.
// About 30 seconds. `DELEGATED_LAUNCH_DEFAULTS_E2E_EVIDENCE_DIR` keeps a JSON receipt.
// Run: env -i PATH="$PATH" HOME="$HOME" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts --no-watch
const { home, priorHome } = await vi.hoisted(async () => {
  // A disposable HOME keeps the scripted actors' files out of the user's home.
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "dlc-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const AGY = "antigravity_cli";
const GROK = "grok_build";
const MODEL = "gemini-3.8-flash-low";
const ALT = "dlc-alt-model";
const RETIRING = "dlc-retiring-model";
const NOT_OFFERED = "dlc-no-such-model";
const TEAM_NOT_OFFERED = "dlc-no-such-team-model";
const GROK_MODEL = "grok-4.7";
const FAKE_GROK_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/grok-acp/fake-grok-cli.mjs");
const TREE_FILES = new Set(["collaboration_tree.json", "team_run_execution_tree.json", "agent_org_run_execution_tree.json"]);
const SQUAD = ["lead", "engineer", "reviewer", "offline", "unoffered", "badsettings", "incomplete"] as const;
type Kind = "agent" | "team" | "org";
type Frame = { type: string; payload: Record<string, any> };
type Rec = Record<string, any>;

const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const snake = (key: string) => key.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`);
/** A field in either DTO casing (the Team stream uses snake_case, the collaboration stream and records camelCase). */
const f = (record: Rec | null | undefined, key: string): any => !record ? undefined : key in record ? record[key] : record[snake(key)];
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
/** Task executions (delegated copies) of a tree: records with a run ID, a start time and a recorded `source`. */
const taskExecutions = (tree: unknown) => objectsIn(tree).filter((record) => f(record, "startedAt") && f(record, "source")
  && (f(record, "teamRunId") || f(record, "agentRunId")));
/** A Team copy by its coordinator run ID. A copy re-projected from a collaborator entry records no `source`. */
const teamCopyOf = (tree: unknown, coordinatorRunId: string) => objectsIn(tree).find((record) => f(record, "teamRunId") && f(record, "startedAt")
  && (record.members as Rec[] | undefined)?.some((member) => f(member, "agentRunId") === coordinatorRunId));
/** Collaborator entries of a tree (one per brought-in definition). */
const collaborators = (tree: unknown) => objectsIn(tree).filter((record) => f(record, "addedViaAgentRunId") && f(record, "addedAt")
  && !f(record, "startedAt"));
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
/** A launch configuration in either casing, reduced to the fields this suite asserts. */
const launchOf = (value: Rec | null | undefined) => value ? { runtimeKind: f(value, "runtimeKind"), model: f(value, "llmModelIdentifier"),
  llmConfig: f(value, "llmConfig") ?? null, workspace: f(value, "workspaceRootPath"), autoExecuteTools: f(value, "autoExecuteTools") } : null;
const sourceOf = (value: Rec | null | undefined) => value ? { origin: value.origin, fallbacks: (value.fallbacks as Rec[]).map((entry) => ({
  layer: entry.layer, runtimeKind: f(entry, "runtimeKind"), model: f(entry, "llmModelIdentifier"), reason: entry.reason, detail: entry.detail })) } : null;
/** The `launch_notes` sentence of the notes renderer (launch-configuration-notes.ts) for one skipped layer. */
const noteText = (input: { name: string; layer: "agent" | "team"; runtime: string | null; model: string | null; detail: string;
  runsOn: string; origin: string; team?: boolean }) => `${input.name}: its ${input.layer} default ${input.runtime ?? "(no runtime)"} / `
  + `${input.model ?? "(no model)"} could not be used (${input.detail.replace(/\.$/, "")}); `
  + `${input.team ? "its members without their own default run on" : "it runs on"} ${input.runsOn} (${input.origin}).`;

suite("Delegated copies and collaborators honor agent and team launch defaults in every root (real HTTP/WS/scoped MCP, availability and catalog probes; scripted AGY, fake Grok)", () => {
  let dataDir = "", workspace = "", argvLog = "", grokLog = "", grokDir = "", missingCodex = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const active: Array<{ kind: Kind; rootId: string }> = [];
  const ids: Record<string, string> = {};
  const names: Record<string, string> = {};
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const config = (model = MODEL) => ({ workspaceRootPath: workspace, llmModelIdentifier: model, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY });
  const agentDefinition = async (key: string, toolNames: string[], defaultLaunchConfig: Rec | null) => {
    names[key] = `DLC ${key} ${randomUUID().slice(0, 6)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: names[key], role: "assistant", description: `${key} (delegated launch defaults E2E)`, instructions: "Follow the user's request.",
        toolNames, ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  };
  const teamDefinition = async (key: string, members: Record<string, string>, defaultLaunchConfig: Rec | null, coordinator = "lead") => {
    names[key] = `DLC ${key} ${randomUUID().slice(0, 6)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names[key], description: `${key} team`, instructions: "Follow requests.", coordinatorMemberName: coordinator,
        ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}),
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
  /** Fake Grok agent sessions (`grok agent … stdio`) so far, with their `--model`. */
  const grokSessions = async () => (await fs.readFile(grokLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean)
    .map((line) => line.split(" ")).filter((argv) => argv[0] === "agent" && argv.at(-1) === "stdio")
    .map((argv) => ({ model: argv.includes("--model") ? argv[argv.indexOf("--model") + 1] : null }));
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
  /** Saved root tree files under the data dir that mention one of `markers`. */
  const savedTreeFiles = async (markers: readonly string[]) => {
    const found: string[] = [];
    const visit = async (dir: string): Promise<void> => {
      for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
        const file = path.join(dir, entry.name);
        if (entry.isDirectory()) { if (entry.name !== "agy-project" && entry.name !== ".agents") await visit(file); continue; }
        if (!entry.isFile() || !TREE_FILES.has(entry.name)) continue;
        const text = await fs.readFile(file, "utf8").catch(() => "");
        if (markers.some((marker) => text.includes(marker))) found.push(file);
      }
    };
    await visit(dataDir);
    return found;
  };

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "dlc-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    grokDir = await fs.mkdtemp(path.join(os.tmpdir(), "dlc-fake-grok-"));
    grokLog = path.join(grokDir, "grok-argv.log");
    missingCodex = path.join(grokDir, "missing", "codex");
    await fs.writeFile(path.join(grokDir, "grok"), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${grokLog}"\nexec "${process.execPath}" "${FAKE_GROK_SCRIPT}" "$@"\n`, { mode: 0o755 });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    const env: Record<string, string | undefined> = {
      AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: argvLog, AGY_FAKE_EXTRA_MODELS: ALT,
      GROK_BUILD_COMMAND: path.join(grokDir, "grok"), FAKE_ACP_FIXTURE: grokAcpFixturePath("prompt"), FAKE_ACP_REPORT_MCP_READY: "1",
      FAKE_GROK_VERSION: undefined, FAKE_ACP_EXIT_AT_END: undefined, FAKE_ACP_STOP_BEFORE: undefined, FAKE_ACP_RECORD: undefined,
      CODEX_APP_SERVER_COMMAND: missingCodex,
    };
    for (const [key, value] of Object.entries(env)) {
      savedEnv.set(key, process.env[key]);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    await agentDefinition("manager", ["create_or_update_task"], null);
    await agentDefinition("worker", [], null);
    await agentDefinition("plain", [], null);
    await agentDefinition("engineer", [], { runtimeKind: GROK, llmModelIdentifier: GROK_MODEL });
    await agentDefinition("reviewer", [], { runtimeKind: AGY, llmModelIdentifier: ALT });
    await agentDefinition("offline", [], { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5" });
    await agentDefinition("unoffered", [], { runtimeKind: AGY, llmModelIdentifier: NOT_OFFERED });
    await agentDefinition("badsettings", [], { runtimeKind: AGY, llmModelIdentifier: MODEL, llmConfig: { temperature: 0.2 } });
    await agentDefinition("incomplete", [], { runtimeKind: AGY });
    await teamDefinition("squad", { lead: "worker", engineer: "engineer", reviewer: "reviewer", offline: "offline", unoffered: "unoffered",
      badsettings: "badsettings", incomplete: "incomplete" }, { runtimeKind: AGY, llmModelIdentifier: TEAM_NOT_OFFERED });
    await teamDefinition("pair", { lead: "worker", engineer: "engineer", unoffered: "unoffered" }, { runtimeKind: AGY, llmModelIdentifier: ALT });
    await teamDefinition("home", { manager: "manager", worker: "worker" }, null, "manager");
    ids.org = (await graphql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: `DLC Org ${randomUUID().slice(0, 6)}`, description: "Org root", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "manager", ref: ids.manager, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const run of [...active]) await terminate(run.kind, run.rootId).catch((error) => errors.push(String(error)));
    if (app) await app.close();
    await wait(1_000);
    const leftover = spawnSync("pgrep", ["-f", dataDir || "dlc-e2e-unset"], { encoding: "utf8" }).stdout.trim();
    if (dataDir && leftover) errors.push(`processes still referencing the data dir: ${leftover}`);
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    if (grokDir) await fs.rm(grokDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    const dir = process.env["DELEGATED_LAUNCH_DEFAULTS_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "delegated-launch-config-defaults.json"), `${JSON.stringify({ ...evidence, cleanup: {
        dataRemoved: await fs.access(dataDir).then(() => false, () => true), grokRemoved: await fs.access(grokDir).then(() => false, () => true),
        homeRemoved: !home || await fs.access(home).then(() => false, () => true), serverClosed: !app?.server.listening,
        remainingRoots: active.length, leftoverProcesses: leftover, errors } }, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  /** A root of one kind with its Manager on AGY/MODEL (or `model`), a live view, and readers of its tree and conversations. */
  const startRoot = async (kind: Kind, model = MODEL) => {
    let rootId: string, managerRunId: string;
    if (kind === "agent") {
      const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
        { input: { agentDefinitionId: ids.manager, ...config(model) } })).createAgentRun;
      expect(created.success, created.message).toBe(true);
      rootId = managerRunId = created.runId;
    } else if (kind === "team") {
      const created = (await graphql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
        { input: { teamDefinitionId: ids.home, teamConfigs: [{ teamAddress: "/", ...config(model) }], memberConfigs: [
          { memberAddress: "/manager", agentDefinitionId: ids.manager, ...config(model) },
          { memberAddress: "/worker", agentDefinitionId: ids.worker, ...config(model) }] } })).createAgentTeamRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.teamRunId;
      const tree = (await graphql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: rootId })).getTeamRunResumeConfig.executionTree;
      managerRunId = flattenE2eConfiguredAgentExecutions(tree).find((member) => member.memberAddress === "/manager")!.agentRunId;
    } else {
      const created = (await graphql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
        { input: { agentOrgDefinitionId: ids.org, rootConfiguration: config(model), teamOverrides: [], agentOverrides: [] } })).createAgentOrgRun;
      expect(created.success, created.message).toBe(true);
      rootId = created.agentOrgRunId;
      const tree = (await graphql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: rootId })).getAgentOrgRunConfig.executionTree;
      managerRunId = (tree.rootOrg.members as any[]).find((member) => member.address === "/manager")!.agentRunId;
    }
    active.push({ kind, rootId });
    const viewRoute = kind === "agent" ? "agent-collaboration" : kind === "team" ? "agent-team" : "agent-org";
    const isSnapshot = (frame: Frame) => frame.type === (kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT");
    const channels: { input: Awaited<ReturnType<typeof connect>> | null; view: Awaited<ReturnType<typeof connect>> } = {
      input: kind === "agent" ? await connect("agent", rootId, (frames) => frames.some((frame) => frame.type === "CONNECTED")) : null,
      view: await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot)),
    };
    const reconnect = async () => {
      if (kind === "org") {
        const restored = (await graphql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: rootId })).restoreAgentOrgRun;
        expect(restored.success, restored.message).toBe(true);
      }
      if (kind === "agent") channels.input = await connect("agent", rootId, (frames) => frames.some((frame) => frame.type === "CONNECTED"));
      channels.view = await connect(viewRoute, rootId, (frames) => frames.some(isSnapshot));
      active.push({ kind, rootId });
    };
    const closeChannels = () => { channels.view.socket.close(); channels.input?.socket.close(); };
    const sendToManager = (content: string, extra: Rec = {}) => {
      if (kind === "org") channels.view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: {
        root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: managerRunId, command_id: randomUUID(),
        message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [], ...extra } }));
      else sendE2eSendMessageCommand(kind === "agent" ? channels.input!.socket : channels.view.socket, { agent_run_id: managerRunId, content, ...extra });
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
    const callsFrom = async (agentRunId: string, address: string, send: () => unknown) => {
      const before = calledResults(await conversationOf(agentRunId, address)).length;
      await send();
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversationOf(agentRunId, address)); return results.length > before; },
        `${kind}: tool result of ${address}`, 90_000);
      return toolResult(results[before]!);
    };
    const managerCalls = (content: string) => callsFrom(managerRunId, managerAddress, () => sendToManager(content));
    /** The Manager asks one agent of the run to call an agent tool; returns that agent's tool result. */
    const agentCalls = (target: { address: string; agentRunId: string }, content: string) => callsFrom(target.agentRunId, target.address, async () => {
      const sent = await managerCalls(callTool("send_message_to", { target_agent_run_id: target.agentRunId, content }));
      expect(sent, `${kind}: Manager → ${target.address} ${JSON.stringify(sent)}`).toMatchObject({ accepted: true });
    });
    const conversationText = async (target: { address: string; agentRunId: string }) => JSON.stringify(await conversationOf(target.agentRunId, target.address));
    const inputFrames = () => channels.input?.frames ?? [];
    return { kind, rootId, managerRunId, inputFrames, liveTree, conversationOf, conversationText, managerCalls, agentCalls, sendToManager, reconnect, closeChannels };
  };
  type Root = Awaited<ReturnType<typeof startRoot>>;

  /** The Manager (or `from`) delegates a catalog Team; returns the result, the recorded copy and its members by name. */
  const delegateTeam = async (root: Root, teamKey: string, from?: { address: string; agentRunId: string }) => {
    const call = callTool("delegate_task", { recipient_address: `/${segment(names[teamKey]!)}`, description: `${teamKey} work.` });
    const result = from ? await root.agentCalls(from, call) : await root.managerCalls(call);
    expect(result.delegated, JSON.stringify(result)).toBe(true);
    expect(result.target_kind).toBe("team");
    let copy: Rec | undefined;
    await until(async () => Boolean(copy = teamCopyOf(await root.liveTree(), result.target_team_coordinator_agent_run_id)), `${root.kind}: copy of ${teamKey}`, 60_000);
    const members = Object.fromEntries((copy!.members as Rec[]).map((member) => [String(member.address).split("/").pop(),
      { address: member.address as string, agentRunId: f(member, "agentRunId") as string }]));
    return { result, copy: copy!, teamRunId: f(copy, "teamRunId") as string, members };
  };
  const memberSources = (source: Rec) => Object.fromEntries((source.members as Rec[]).map((member) => [String(member.address).split("/").pop(),
    { launch: launchOf(f(member, "launchConfiguration")), source: sourceOf(f(member, "launchSource")) }]));
  const inheritedLaunch = () => ({ runtimeKind: AGY, model: MODEL, llmConfig: null, workspace, autoExecuteTools: true });
  const ownLaunch = (runtimeKind: string, model: string) => ({ runtimeKind, model, llmConfig: null, workspace, autoExecuteTools: true });
  const fallback = (reason: string, runtimeKind: string | null, model: string | null, detail: string, layer = "agent_default") =>
    ({ layer, runtimeKind, model, reason, detail });
  const squadFallbacks = () => ({
    offline: fallback("runtime_unavailable", "codex_app_server", "gpt-5.5", `Codex App Server command '${missingCodex}' is not available.`),
    unoffered: fallback("model_unavailable", AGY, NOT_OFFERED, `The model '${NOT_OFFERED}' is not available on ${AGY}.`),
    badsettings: fallback("model_settings_invalid", AGY, MODEL, "Its model settings are invalid: This model has no adjustable settings."),
    incomplete: fallback("incomplete", AGY, null, "It names no model."),
  });
  const agentNote = (name: string, entry: ReturnType<typeof fallback>, runsOn: string, origin: string) =>
    noteText({ name, layer: "agent", runtime: entry.runtimeKind, model: entry.model, detail: entry.detail, runsOn, origin });
  const launchesAfter = async (from: number, runId: string) => (await agyLaunches()).slice(from).filter((entry) => entry.runId === runId);

  const rootScenario = async (kind: Kind) => {
    const record: Rec = {};
    evidence[kind] = record;
    const root = await startRoot(kind);

    // DLC-001 (AC-001, AC-002 member layer, AC-005, AC-015 shape, REQ-002): a catalog Team copy, each agent resolved alone.
    const squad = await delegateTeam(root, "squad");
    const reasons = squadFallbacks();
    const teamFallback = fallback("model_unavailable", AGY, TEAM_NOT_OFFERED, `The model '${TEAM_NOT_OFFERED}' is not available on ${AGY}.`, "team_default");
    const source = f(squad.copy, "source");
    record.squadSource = source;
    expect(launchOf(f(source, "defaultLaunchConfiguration"))).toEqual(inheritedLaunch());
    expect(sourceOf(f(source, "defaultLaunchSource"))).toEqual({ origin: "inherited", fallbacks: [teamFallback] });
    expect(memberSources(source)).toEqual({
      lead: { launch: null, source: null },
      engineer: { launch: ownLaunch(GROK, GROK_MODEL), source: { origin: "agent_default", fallbacks: [] } },
      reviewer: { launch: ownLaunch(AGY, ALT), source: { origin: "agent_default", fallbacks: [] } },
      offline: { launch: null, source: { origin: "inherited", fallbacks: [reasons.offline] } },
      unoffered: { launch: null, source: { origin: "inherited", fallbacks: [reasons.unoffered] } },
      badsettings: { launch: null, source: { origin: "inherited", fallbacks: [reasons.badsettings] } },
      incomplete: { launch: null, source: { origin: "inherited", fallbacks: [reasons.incomplete] } },
    });
    const runsOnRoot = `${AGY} / ${MODEL}`;
    expect(squad.result.launch_notes).toEqual([
      noteText({ name: names.squad!, layer: "team", runtime: AGY, model: TEAM_NOT_OFFERED, detail: teamFallback.detail, runsOn: runsOnRoot,
        origin: "inherited from the run", team: true }),
      ...(["offline", "unoffered", "badsettings", "incomplete"] as const).map((name) => agentNote(name, reasons[name], runsOnRoot, "inherited from the run")),
    ]);
    record.squad = { result: squad.result, source };

    // DLC-002 (AC-001 at the runtime): each member starts on its resolved runtime and model when work reaches it.
    const agyFrom = (await agyLaunches()).length;
    const grokFrom = (await grokSessions()).length;
    const toEngineer = await root.agentCalls(squad.members.lead!, callTool("send_message_to", { recipient_address: squad.members.engineer!.address,
      content: "Please list the directory." }));
    expect(toEngineer, JSON.stringify(toEngineer)).toMatchObject({ accepted: true });
    // Only the fake Grok replay answers with the recorded listing; the scripted AGY actor answers "OK" or "CALLED:".
    await until(async () => (await root.conversationText(squad.members.engineer!)).includes("alpha.txt"), `${kind}: engineer answered on Grok`, 90_000);
    expect((await grokSessions()).slice(grokFrom).map((entry) => entry.model)).toContain(GROK_MODEL);
    for (const [name, model] of [["reviewer", ALT], ["unoffered", MODEL]] as const) {
      const sent = await root.agentCalls(squad.members.lead!, callTool("send_message_to", { recipient_address: squad.members[name]!.address,
        content: `Work for ${name}. Marker ${name.toUpperCase()}-FIRST.` }));
      expect(sent, JSON.stringify(sent)).toMatchObject({ accepted: true });
      await until(async () => (await launchesAfter(agyFrom, squad.members[name]!.agentRunId)).length > 0, `${kind}: ${name} AGY launch`, 60_000);
      expect((await launchesAfter(agyFrom, squad.members[name]!.agentRunId)).map((entry) => entry.model)).toEqual([model]);
    }
    expect(await launchesAfter(agyFrom, squad.members.engineer!.agentRunId), `${kind}: engineer never ran on AGY`).toEqual([]);
    record.mixedRuntime = { grokSessions: (await grokSessions()).slice(grokFrom), agyLaunches: (await agyLaunches()).slice(agyFrom) };

    // DLC-005 (AC-007, AR-002): a teammate delegated inside the copy runs on its recorded value; no repeated note.
    const teammate = await root.agentCalls(squad.members.lead!, callTool("delegate_task", { recipient_address: squad.members.unoffered!.address,
      description: "Teammate work." }));
    expect(teammate, JSON.stringify(teammate)).toMatchObject({ delegated: true, target_kind: "agent" });
    expect(teammate).not.toHaveProperty("launch_notes");
    const teammateGrok = await root.agentCalls(squad.members.lead!, callTool("delegate_task", { recipient_address: squad.members.engineer!.address,
      description: "Teammate work on Grok." }));
    expect(teammateGrok, JSON.stringify(teammateGrok)).toMatchObject({ delegated: true, target_kind: "agent" });
    expect(teammateGrok).not.toHaveProperty("launch_notes");
    let teammateCopies: Rec[] = [];
    await until(async () => (teammateCopies = taskExecutions(await root.liveTree()).filter((entry) =>
      [teammate.target_agent_run_id, teammateGrok.target_agent_run_id].includes(f(entry, "agentRunId")))).length === 2, `${kind}: teammate copies`, 60_000);
    const teammateLaunch = (runId: string) => launchOf(f(f(teammateCopies.find((entry) => f(entry, "agentRunId") === runId), "source"), "launchConfiguration"));
    expect(teammateLaunch(teammate.target_agent_run_id)).toEqual(inheritedLaunch());
    expect(teammateLaunch(teammateGrok.target_agent_run_id)).toEqual(ownLaunch(GROK, GROK_MODEL));
    // DS-004 (b): the copy's lead brings in a helper (an available agent) whose default is unusable: the note once, then none.
    const helperAddress = `/${segment(names.badsettings!)}`;
    const helper = await root.agentCalls(squad.members.lead!, callTool("send_message_to", { recipient_address: helperAddress, content: "Helper work." }));
    expect(helper, JSON.stringify(helper)).toMatchObject({ accepted: true });
    expect(helper.message).toContain(`\nLaunch configuration notes:\n- ${agentNote(names.badsettings!, reasons.badsettings, runsOnRoot, "inherited from the run")}`);
    const helperAgain = await root.agentCalls(squad.members.lead!, callTool("send_message_to", { recipient_address: helperAddress, content: "More helper work." }));
    expect(helperAgain, JSON.stringify(helperAgain)).toMatchObject({ accepted: true });
    expect(helperAgain.message ?? "").not.toContain("Launch configuration notes");
    record.teammates = { teammate, teammateGrok, helper, helperAgain };

    // DLC-003 (AC-003, AC-004, AC-005): an agent copy on its own default; agent bring-ins with and without a usable default.
    const agentCopy = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.engineer!)}`, description: "Grok work." }));
    expect(agentCopy, JSON.stringify(agentCopy)).toMatchObject({ delegated: true, target_kind: "agent" });
    expect(agentCopy).not.toHaveProperty("launch_notes");
    const plainCopy = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.plain!)}`, description: "Plain work." }));
    expect(plainCopy, JSON.stringify(plainCopy)).toMatchObject({ delegated: true, target_kind: "agent" });
    let agentCopies: Rec[] = [];
    await until(async () => (agentCopies = taskExecutions(await root.liveTree()).filter((entry) =>
      [agentCopy.target_agent_run_id, plainCopy.target_agent_run_id].includes(f(entry, "agentRunId")))).length === 2, `${kind}: agent copies`, 60_000);
    const copySource = (runId: string) => f(agentCopies.find((entry) => f(entry, "agentRunId") === runId), "source");
    expect(launchOf(f(copySource(agentCopy.target_agent_run_id), "launchConfiguration"))).toEqual(ownLaunch(GROK, GROK_MODEL));
    expect(sourceOf(f(copySource(agentCopy.target_agent_run_id), "launchSource"))).toEqual({ origin: "agent_default", fallbacks: [] });
    expect(launchOf(f(copySource(plainCopy.target_agent_run_id), "launchConfiguration"))).toEqual(inheritedLaunch());
    expect(sourceOf(f(copySource(plainCopy.target_agent_run_id), "launchSource"))).toEqual({ origin: "inherited", fallbacks: [] });
    const usable = await root.managerCalls(callTool("send_message_to", { recipient_address: `/${segment(names.reviewer!)}`, content: "Review this." }));
    expect(usable, JSON.stringify(usable)).toMatchObject({ accepted: true });
    expect(usable.message ?? "").not.toContain("Launch configuration notes");
    const unusable = await root.managerCalls(callTool("send_message_to", { recipient_address: `/${segment(names.unoffered!)}`, content: "Help here." }));
    expect(unusable, JSON.stringify(unusable)).toMatchObject({ accepted: true });
    expect(unusable.message).toContain(`\nLaunch configuration notes:\n- ${agentNote(names.unoffered!, reasons.unoffered, runsOnRoot, "inherited from the run")}`);
    const entries = collaborators(await root.liveTree());
    const entryAt = (key: string) => entries.find((entry) => entry.address === `/${segment(names[key]!)}`);
    expect(launchOf(f(entryAt("reviewer"), "launchConfiguration"))).toEqual(ownLaunch(AGY, ALT));
    expect(sourceOf(f(entryAt("reviewer"), "launchSource"))).toEqual({ origin: "agent_default", fallbacks: [] });
    expect(launchOf(f(entryAt("unoffered"), "launchConfiguration"))).toEqual(inheritedLaunch());
    expect(sourceOf(f(entryAt("unoffered"), "launchSource"))).toEqual({ origin: "inherited", fallbacks: [reasons.unoffered] });
    record.agents = { agentCopy, plainCopy, usable, unusable };

    // DLC-004 (AC-004, AC-002 team layer, AC-007): a Team brought in, then an extra copy at its address reuses its record.
    const pairAddress = `/${segment(names.pair!)}`;
    const pairIn = await root.managerCalls(callTool("send_message_to", { recipient_address: pairAddress, content: "Pair work." }));
    expect(pairIn, JSON.stringify(pairIn)).toMatchObject({ accepted: true });
    const pairFallback = squadFallbacks().unoffered;
    expect(pairIn.message).toContain(`\nLaunch configuration notes:\n- ${agentNote("unoffered", pairFallback, `${AGY} / ${ALT}`, "its team default")}`);
    const pair = collaborators(await root.liveTree()).find((entry) => entry.address === pairAddress)!;
    expect(launchOf(f(pair, "defaultLaunchConfiguration"))).toEqual(ownLaunch(AGY, ALT));
    expect(sourceOf(f(pair, "defaultLaunchSource"))).toEqual({ origin: "team_default", fallbacks: [] });
    expect(memberSources(pair)).toEqual({
      lead: { launch: null, source: null },
      engineer: { launch: ownLaunch(GROK, GROK_MODEL), source: { origin: "agent_default", fallbacks: [] } },
      unoffered: { launch: null, source: { origin: "team_default", fallbacks: [pairFallback] } },
    });
    const pairLead = (pair.members as Rec[]).find((member) => String(member.address).endsWith("/lead"))!;
    await until(async () => (await agyLaunches()).some((entry) => entry.runId === f(pairLead, "agentRunId")), `${kind}: pair lead started`, 60_000);
    expect((await agyLaunches()).filter((entry) => entry.runId === f(pairLead, "agentRunId")).map((entry) => entry.model)).toEqual([ALT]);
    const extra = await root.managerCalls(callTool("delegate_task", { recipient_address: pairAddress, description: "Extra Pair work." }));
    expect(extra, JSON.stringify(extra)).toMatchObject({ delegated: true, target_kind: "team" });
    expect(extra).not.toHaveProperty("launch_notes");
    let extraCopy: Rec | undefined;
    await until(async () => Boolean(extraCopy = teamCopyOf(await root.liveTree(), extra.target_team_coordinator_agent_run_id)), `${kind}: extra Pair copy`, 60_000);
    // The extra copy records no definition snapshot (it is re-projected from the collaborator entry), so its members'
    // launches are proven where they matter: each starts on the collaborator's recorded per-member value.
    const extraMembers = Object.fromEntries((extraCopy!.members as Rec[]).map((member) => [String(member.address).split("/").pop(),
      { address: member.address as string, agentRunId: f(member, "agentRunId") as string }]));
    const extraAgyFrom = (await agyLaunches()).length;
    const extraGrokFrom = (await grokSessions()).length;
    await until(async () => (await agyLaunches()).some((entry) => entry.runId === extraMembers.lead!.agentRunId), `${kind}: extra copy lead started`, 60_000);
    expect((await agyLaunches()).filter((entry) => entry.runId === extraMembers.lead!.agentRunId).map((entry) => entry.model)).toEqual([ALT]);
    const toExtraEngineer = await root.agentCalls(extraMembers.lead!, callTool("send_message_to", { recipient_address: extraMembers.engineer!.address,
      content: "Please list the directory." }));
    expect(toExtraEngineer, JSON.stringify(toExtraEngineer)).toMatchObject({ accepted: true });
    await until(async () => (await root.conversationText(extraMembers.engineer!)).includes("alpha.txt"), `${kind}: extra copy engineer on Grok`, 90_000);
    expect((await grokSessions()).slice(extraGrokFrom).map((entry) => entry.model)).toContain(GROK_MODEL);
    const toExtraUnoffered = await root.agentCalls(extraMembers.lead!, callTool("send_message_to", { recipient_address: extraMembers.unoffered!.address,
      content: "Unoffered work." }));
    expect(toExtraUnoffered, JSON.stringify(toExtraUnoffered)).toMatchObject({ accepted: true });
    await until(async () => (await launchesAfter(extraAgyFrom, extraMembers.unoffered!.agentRunId)).length > 0, `${kind}: extra copy unoffered started`, 60_000);
    expect((await launchesAfter(extraAgyFrom, extraMembers.unoffered!.agentRunId)).map((entry) => entry.model)).toEqual([ALT]);
    expect(await launchesAfter(extraAgyFrom, extraMembers.engineer!.agentRunId)).toEqual([]);
    record.pair = { pairIn, pair, extra, extraCopy };

    root.closeChannels();
    await terminate(kind, root.rootId);
    return record;
  };

  it("in every root, catalog copies and collaborators run each agent on its own usable default, fall back with notes, and reuse recorded values", async () => {
    const settled = await Promise.allSettled((["agent", "team", "org"] as const).map(rootScenario));
    const failures = settled.flatMap((result, index) => result.status === "rejected" ? [`${["agent", "team", "org"][index]}: ${String(result.reason?.stack ?? result.reason)}`] : []);
    expect(failures).toEqual([]);
  }, 600_000);

  it("Agent root: with the root's model retired, an agent that needs the inherited layer cannot be delegated or brought in (today's text, nothing added); a usable own default still starts; a user `@` mention admits nothing (AC-006)", async () => {
    process.env["AGY_FAKE_EXTRA_MODELS"] = `${ALT},${RETIRING}`;
    const root = await startRoot("agent", RETIRING);
    // The root's AGY session starts on the retiring model, then the provider retires it.
    root.sendToManager("Hello. Marker ROOT-STARTED.");
    await until(async () => /ROOT-STARTED[\s\S]*OK/.test(await root.conversationText({ address: "/", agentRunId: root.managerRunId })), "root answered", 60_000);
    process.env["AGY_FAKE_EXTRA_MODELS"] = ALT;
    const reason = `The model '${RETIRING}' is not available on ${AGY}.`;
    const before = await root.liveTree();
    const delegated = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.worker!)}`, description: "Plain work." }));
    expect(delegated.delegated ?? false, JSON.stringify(delegated)).toBe(false);
    expect(JSON.stringify(delegated)).toContain(`${names.worker} cannot be delegated to: ${reason}`);
    const team = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.squad!)}`, description: "Team work." }));
    expect(team.delegated ?? false, JSON.stringify(team)).toBe(false);
    expect(JSON.stringify(team)).toContain(`${names.squad} cannot be delegated to: ${reason}`);
    const brought = await root.managerCalls(callTool("send_message_to", { recipient_address: `/${segment(names.unoffered!)}`, content: "Help." }));
    expect(brought, JSON.stringify(brought)).toMatchObject({ accepted: false, code: "COLLABORATOR_ADD_FAILED" });
    expect(brought.message).toContain(reason);
    const after = await root.liveTree();
    expect(taskExecutions(after)).toEqual(taskExecutions(before));
    expect(collaborators(after)).toEqual(collaborators(before));
    // REQ-004 fails only an agent with no usable layer: an own usable default is unaffected by the retired root model.
    const own = await root.managerCalls(callTool("delegate_task", { recipient_address: `/${segment(names.reviewer!)}`, description: "Review work." }));
    expect(own, JSON.stringify(own)).toMatchObject({ delegated: true, target_kind: "agent" });
    let ownCopy: Rec | undefined;
    await until(async () => Boolean(ownCopy = taskExecutions(await root.liveTree()).find((entry) => f(entry, "agentRunId") === own.target_agent_run_id)), "own copy", 60_000);
    expect(launchOf(f(f(ownCopy, "source"), "launchConfiguration"))).toEqual(ownLaunch(AGY, ALT));
    // A user `@` mention only resolves the address for the agent (BEH-002 preserved): nothing is admitted on `@`.
    const mentionTree = await root.liveTree();
    root.sendToManager("With a mention. Marker MENTION.", { mentions: [{ kind: "agent", definition_id: ids.incomplete }] });
    await until(async () => /MENTION[\s\S]*OK/.test(await root.conversationText({ address: "/", agentRunId: root.managerRunId })), "mention answered", 60_000);
    expect(JSON.stringify(root.inputFrames())).toContain(`/${segment(names.incomplete!)}`);
    expect(collaborators(await root.liveTree())).toEqual(collaborators(mentionTree));
    evidence.inheritedUnusable = { delegated, team, brought, own };
    root.closeChannels();
    await terminate("agent", root.rootId);
  }, 300_000);

  const lifecycleScenario = async (kind: "agent" | "team") => {
    const record: Rec = {};
    evidence[`${kind}Lifecycle`] = record;
    const root = await startRoot(kind);
    // DLC-007 (AC-008, DEC-008): copy A starts with the engineer on Grok; then the engineer's default is edited.
    const first = await delegateTeam(root, "squad");
    const pairAddress = `/${segment(names.pair!)}`;
    expect(await root.managerCalls(callTool("send_message_to", { recipient_address: pairAddress, content: "Pair work." }))).toMatchObject({ accepted: true });
    return { record, root, first, pairAddress };
  };

  it("Agent and Team roots: an edited definition default leaves started copies on their recorded values through stop/restore; new copies use it; a pre-change saved tree restores on the Team value (AC-008, AC-009)", async () => {
    const prepared = await Promise.all((["agent", "team"] as const).map(lifecycleScenario));
    const edited = await graphql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id defaultLaunchConfig{runtimeKind llmModelIdentifier}}}`,
      { input: { id: ids.engineer, defaultLaunchConfig: { runtimeKind: AGY, llmModelIdentifier: ALT, llmConfig: null } } });
    expect(edited.updateAgentDefinition.defaultLaunchConfig).toEqual({ runtimeKind: AGY, llmModelIdentifier: ALT });
    const settled = await Promise.allSettled(prepared.map(async ({ record, root, first, pairAddress }) => {
      const kind = root.kind;
      expect(memberSources(f(teamCopyOf(await root.liveTree(), first.members.lead!.agentRunId), "source")).engineer!.launch).toEqual(ownLaunch(GROK, GROK_MODEL));
      const second = await delegateTeam(root, "squad");
      expect(memberSources(f(second.copy, "source")).engineer).toEqual({ launch: ownLaunch(AGY, ALT), source: { origin: "agent_default", fallbacks: [] } });
      record.copies = { first: first.teamRunId, second: second.teamRunId };

      // Root stop. DLC-008 (AC-009): copy B and the Pair collaborator get the pre-change shape (no sources, no member launches).
      root.closeChannels();
      await terminate(kind, root.rootId);
      await wait(2_000);
      const pair = collaborators(await root.liveTree()).find((entry) => entry.address === pairAddress)!;
      const targets = [second.teamRunId, f(pair, "teamRunId") as string];
      const files = await savedTreeFiles(targets);
      expect(files.length, `${kind}: saved trees`).toBeGreaterThan(0);
      const stripTeam = (team: Rec | undefined) => {
        if (!team || !("defaultLaunchConfiguration" in team)) return;
        delete team.defaultLaunchSource;
        for (const member of team.members as Rec[]) { delete member.launchConfiguration; delete member.launchSource; }
      };
      let stripped = 0;
      for (const file of files) {
        const saved = JSON.parse(await fs.readFile(file, "utf8"));
        for (const entry of objectsIn(saved)) {
          if (!targets.includes(entry.teamRunId)) continue;
          stripTeam(entry); stripTeam(entry.source); stripped += 1;
        }
        await fs.writeFile(file, JSON.stringify(saved, null, 2));
      }
      expect(stripped, `${kind}: stripped records`).toBeGreaterThan(0);
      await root.reconnect();
      const restored = await root.liveTree();
      const secondSource = f(teamCopyOf(restored, second.members.lead!.agentRunId), "source");
      expect(f(secondSource, "defaultLaunchSource") ?? null).toBeNull();
      expect(memberSources(secondSource).engineer).toEqual({ launch: null, source: null });
      const restoredPair = collaborators(restored).find((entry) => entry.address === pairAddress)!;
      expect(f(restoredPair, "defaultLaunchSource") ?? null).toBeNull();
      expect(memberSources(restoredPair).engineer).toEqual({ launch: null, source: null });

      // Restored copy A (recorded, AC-008): its engineer's first start is on Grok. Pre-change copy B: on the Team value.
      const grokFrom = (await grokSessions()).length;
      const agyFrom = (await agyLaunches()).length;
      const toFirst = await root.agentCalls(first.members.lead!, callTool("send_message_to", { recipient_address: first.members.engineer!.address, content: "List it." }));
      expect(toFirst, JSON.stringify(toFirst)).toMatchObject({ accepted: true });
      await until(async () => (await root.conversationText(first.members.engineer!)).includes("alpha.txt"), `${kind}: restored engineer on Grok`, 90_000);
      expect((await grokSessions()).slice(grokFrom).map((entry) => entry.model)).toContain(GROK_MODEL);
      expect(await launchesAfter(agyFrom, first.members.engineer!.agentRunId)).toEqual([]);
      for (const name of ["engineer", "reviewer"] as const) {
        const sent = await root.agentCalls(second.members.lead!, callTool("send_message_to", { recipient_address: second.members[name]!.address,
          content: `Old-shape work for ${name}.` }));
        expect(sent, JSON.stringify(sent)).toMatchObject({ accepted: true });
        await until(async () => (await launchesAfter(agyFrom, second.members[name]!.agentRunId)).length > 0, `${kind}: copy B ${name} started`, 60_000);
        expect((await launchesAfter(agyFrom, second.members[name]!.agentRunId)).map((entry) => entry.model)).toEqual([MODEL]);
      }
      record.restore = { secondSource, restoredPair, agyLaunches: (await agyLaunches()).slice(agyFrom), grokSessions: (await grokSessions()).slice(grokFrom) };
      root.closeChannels();
      await terminate(kind, root.rootId);
    }));
    const failures = settled.flatMap((result, index) => result.status === "rejected" ? [`${["agent", "team"][index]}: ${String(result.reason?.stack ?? result.reason)}`] : []);
    expect(failures).toEqual([]);
  }, 600_000);
});
