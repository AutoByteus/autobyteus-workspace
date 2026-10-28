import "reflect-metadata";
import { agentRuntimeName } from "@autobyteus/agent-presentation-contracts";
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
import { grokAcpFixturePath } from "../helpers/grok-fake-cli.js";

/**
 * Model Routing for delegated work (autobyteus-32) through the real Studio HTTP/GraphQL/WebSocket server, the agents'
 * scoped Agent Tools MCP, the real launch usability check (the autobyteus-303 report of this node's runtimes), the
 * node's Model Router agent run, the decision log and statistics. Only external CLIs are scripted, no inference:
 * - AGY: tests/fixtures/agy-failure-cli.mjs (`linked_skills`). Delegators call real tools with `CALL_TOOL:{…}`. With
 *   `AGY_FAKE_ROUTER_PLAN` an AGY run that receives "Routing request <id>." answers it as the plan file says (valid,
 *   invalid then valid, silent, crash (the process exits mid-turn), throw (the turn fails with an error); an optional
 *   delay), calling the real `submit_launch_choices` (and, when asked,
 *   `list_available_agent_runtimes`), so the router is a real agent run on a scripted runtime. `AGY_FAKE_USAGE_FILE`
 *   scripts `agy -p /usage` (a used-up limit group) for U4b.
 * - Grok Build: the recorded-fixture fake CLI, a second runtime for the router to choose.
 * - Codex: `CODEX_APP_SERVER_COMMAND` names a missing file (unavailable). Claude: the real `claude` on PATH, run in this
 *   file's disposable HOME, so it is installed and signed out.
 * Cases: MR-01 routing off: exactly today's launches, no request, no record (AC-002); MR-02 routing on: a team copy
 * whose coordinator has a default; the router is asked once, for the others only, and they start on its choice on
 * another runtime; result lines, recorded sources, decisions by Task and statistics (AC-001, AC-009 data, AC-012
 * record); MR-03 an unusable answer is returned to the router and its correction used; a silent router gives the
 * inherited launch with "no valid answer within 40 seconds" within the 50 s bound (AC-004); MR-04 three delegations at
 * once reach the router one per turn in arrival order, and a request that waits past 40 s is never sent ("busy")
 * (AC-006); MR-05 a default on a model blocked by a used-up limit is skipped with "blocked until …" while routing is on
 * and used as today while off (AC-003); MR-06 the router set to a signed-out runtime: status `SIGNED_OUT` and an
 * inactive-router note (CR-002); MR-07 the router's definition, run and workspace are hidden unless internal agents are
 * shown, and "Talk to the router" opens its run (AC-008); MR-08 the router run's agent tools are its template's, without
 * collaboration tools (AC-011); MR-09 (C-05, CR-005) the router's CLI process dies mid-turn, then a turn fails with
 * an error: that request falls back with its reason, and the next routings are the router's again (restored run), also
 * after a router launch round trip.
 * About 5 minutes (MR-03 and MR-04 wait for the 40 s budget). `MODEL_ROUTING_E2E_EVIDENCE_DIR` keeps a JSON receipt.
 * Run (a disposable HOME, as TESTING.md asks for E2E): env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
 *   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/model-routing/model-routing-delegation.e2e.test.ts --no-watch
 */
const { home, priorHome } = await vi.hoisted(async () => {
  if (process.env["RUN_AGY_FAILURE_E2E"] !== "1") return { home: "", priorHome: process.env["HOME"] };
  const nodeFs = await import("node:fs");
  const nodeOs = await import("node:os");
  const nodePath = await import("node:path");
  const priorHome = process.env["HOME"];
  const home = nodeFs.realpathSync(nodeFs.mkdtempSync(nodePath.join(nodeOs.tmpdir(), "mr-e2e-home-")));
  process.env["HOME"] = home;
  return { home, priorHome };
});
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const AGY = "antigravity_cli";
const GROK = "grok_build";
const MODEL = "gemini-3.8-flash-low";
const GROK_MODEL = "grok-4.7";
const BLOCKED = "mr-blocked-model";
const ROUTER_ID = "autobyteus-model-router";
const FAKE_GROK_SCRIPT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/grok-acp/fake-grok-cli.mjs");
type Frame = { type: string; payload: Record<string, any> };
type Rec = Record<string, any>;

const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
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
/** A used-up "Retiring" group: the fixture names every extra model "Retiring test model", so only those are blocked. */
const usageAnswer = (resetAt: string) => JSON.stringify({ status: "SUCCESS", response: "", usage: { total_tokens: 0 }, command: { name: "usage", data: { groups: [
  { name: "Retiring", description: "Models within this group: Retiring test model", buckets: [{ id: "r-weekly", name: "Weekly", window: "weekly", remaining_fraction: 0, reset_time: resetAt }] },
] } } });

suite("Model Routing for delegated work (real HTTP/WS/GraphQL/scoped MCP, launch usability, a real router run on scripted AGY; fake Grok)", () => {
  let dataDir = "", workspace = "", planFile = "", routerLog = "", usageFile = "", argvLog = "", grokLog = "", grokDir = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const runIds: string[] = [];
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
  const setPlan = (plan: Rec) => fs.writeFile(planFile, JSON.stringify(plan));
  const routerRequests = async () => (await fs.readFile(routerLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec);
  const grokSessions = async () => (await fs.readFile(grokLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean)
    .map((line) => line.split(" ")).filter((argv) => argv[0] === "agent" && argv.at(-1) === "stdio")
    // Agent sessions only (an agent run passes --model; the runtime report's own discovery handshake passes none).
    .filter((argv) => argv.includes("--model")).map((argv) => argv[argv.indexOf("--model") + 1]);
  const agyModels = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => {
    const entry = JSON.parse(line) as { argv: string[]; cwd: string };
    const index = entry.argv.indexOf("--model");
    return { cwd: entry.cwd, model: index >= 0 ? entry.argv[index + 1] ?? null : null };
  });
  const agentDefinition = async (key: string, defaultLaunchConfig: Rec | null, toolNames: string[] = []) => {
    names[key] = `MR ${key} ${randomUUID().slice(0, 4)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: names[key], role: key, description: `${key} (model routing E2E)`, instructions: "Follow the user's request.",
        toolNames, ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id;
  };
  const teamDefinition = async (key: string, members: Record<string, string>, coordinator: string) => {
    names[key] = `MR ${key} ${randomUUID().slice(0, 4)}`;
    ids[key] = (await graphql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: names[key], description: `${key} team (model routing E2E)`, instructions: "Follow requests.", coordinatorMemberName: coordinator,
        nodes: Object.entries(members).map(([memberName, ref]) => ({ memberName, ref: ids[ref], refScope: "SHARED" })) } })).createAgentTeamDefinition.id;
  };
  /** A standalone delegator on AGY/MODEL with its input socket; `calls` sends one scripted tool call and returns the result. */
  const delegator = async () => {
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: ids.manager, workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: AGY } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    const runId = created.runId as string;
    runIds.push(runId);
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "delegator stream ready");
    const conversation = async () => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
    const calls = async (content: string, ms = 90_000) => {
      const before = calledResults(await conversation()).length;
      const started = Date.now();
      sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
      let results: string[] = [];
      await until(async () => { results = calledResults(await conversation()); return results.length > before; }, `tool result for ${content.slice(0, 80)}`, ms);
      return { result: toolResult(results[before]!), elapsedMs: Date.now() - started };
    };
    const tree = async () => (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: runId })).agentRunCollaboration;
    return { runId, calls, tree };
  };
  const delegate = (address: string, description: string) => callTool("delegate_task", { recipient_address: address, description });
  const decisions = async (source?: string) => (await graphql(`query($s:String){modelRoutingDecisions(limit:50, source:$s)}`, { s: source ?? null })).modelRoutingDecisions;
  const status = async () => (await graphql(`{modelRoutingStatus}`)).modelRoutingStatus as Rec;
  const setEnabled = (on: boolean) => graphql(`mutation($e:Boolean!){setModelRoutingEnabled(enabled:$e)}`, { e: on });
  const setRouter = (runtimeKind: string, model: string) => graphql(`mutation($r:String!,$m:String!){setModelRouterLaunch(runtimeKind:$r, llmModelIdentifier:$m)}`, { r: runtimeKind, m: model });
  const notesOf = (result: Rec) => (result.launch_notes ?? []) as string[];
  /** A copy's recorded member launches (its `source.members`): what run Settings rows and restore read. */
  const launchSources = (tree: unknown) => objectsIn(tree).filter((record) => record.launchSource && typeof record.address === "string")
    .map((record) => ({ address: record.address as string, runtimeKind: record.launchConfiguration?.runtimeKind, model: record.launchConfiguration?.llmModelIdentifier, source: record.launchSource }));

  beforeAll(async () => {
    dataDir = await fs.mkdtemp(path.join(os.tmpdir(), "mr-e2e-"));
    workspace = path.join(dataDir, "workspace");
    await fs.mkdir(workspace);
    planFile = path.join(dataDir, "router-plan.json");
    routerLog = path.join(dataDir, "router-requests.jsonl");
    usageFile = path.join(dataDir, "agy-usage.json");
    argvLog = path.join(dataDir, "agy-argv.jsonl");
    grokDir = await fs.mkdtemp(path.join(os.tmpdir(), "mr-fake-grok-"));
    grokLog = path.join(grokDir, "grok-argv.log");
    await fs.writeFile(path.join(grokDir, "grok"), `#!/bin/sh\nprintf '%s\\n' "$*" >> "${grokLog}"\nexec "${process.execPath}" "${FAKE_GROK_SCRIPT}" "$@"\n`, { mode: 0o755 });
    await setPlan({ mode: "valid", runtime: GROK, model: GROK_MODEL, taskKind: "implementation", reason: "Grok is signed in with limit left." });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    const env: Record<string, string | undefined> = {
      AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ROUTER_PLAN: planFile, AGY_FAKE_ROUTER_LOG: routerLog, AGY_FAKE_USAGE_FILE: usageFile,
      AGY_FAKE_ARGV_LOG: argvLog, AGY_FAKE_EXTRA_MODELS: BLOCKED, GROK_BUILD_COMMAND: path.join(grokDir, "grok"),
      FAKE_ACP_FIXTURE: grokAcpFixturePath("prompt"), FAKE_ACP_REPORT_MCP_READY: "1", FAKE_GROK_VERSION: undefined, FAKE_ACP_EXIT_AT_END: undefined,
      FAKE_ACP_STOP_BEFORE: undefined, FAKE_ACP_RECORD: undefined, CODEX_APP_SERVER_COMMAND: path.join(grokDir, "missing", "codex"),
      AUTOBYTEUS_MODEL_ROUTING_ENABLED: undefined, AUTOBYTEUS_MODEL_ROUTER_RUNTIME: undefined, AUTOBYTEUS_MODEL_ROUTER_MODEL: undefined,
      AUTOBYTEUS_SHOW_INTERNAL_AGENTS: undefined,
    };
    for (const [key, value] of Object.entries(env)) {
      savedEnv.set(key, process.env[key]);
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    await agentDefinition("manager", null);
    await agentDefinition("designer", { runtimeKind: AGY, llmModelIdentifier: MODEL });
    await agentDefinition("engineer", null);
    await agentDefinition("reviewer", null);
    await agentDefinition("solo", null);
    await agentDefinition("blocked", { runtimeKind: AGY, llmModelIdentifier: BLOCKED });
    await teamDefinition("team", { designer: "designer", engineer: "engineer", reviewer: "reviewer" }, "designer");
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    for (const runId of runIds) await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: runId }).catch(() => undefined);
    if (app) await app.close();
    await new Promise((resolve) => setTimeout(resolve, 1_000));
    const leftover = spawnSync("pgrep", ["-f", dataDir || "mr-e2e-unset"], { encoding: "utf8" }).stdout.trim();
    if (dataDir && leftover) errors.push(`processes still referencing the data dir: ${leftover}`);
    const dir = process.env["MODEL_ROUTING_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "model-routing-delegation.json"), `${JSON.stringify({ ...evidence, routerRequests: await routerRequests(), leftover }, null, 2)}\n`);
    }
    if (dataDir) await fs.rm(dataDir, { recursive: true, force: true });
    if (grokDir) await fs.rm(grokDir, { recursive: true, force: true });
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    if (home) {
      if (priorHome === undefined) delete process.env["HOME"]; else process.env["HOME"] = priorHome;
      await fs.rm(home, { recursive: true, force: true });
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("MR-01 routing off (the default): a team copy runs as today — default, then the delegating run's launch — with no routing request and no record (AC-002)", async () => {
    expect(await status(), "off by default").toMatchObject({ enabled: false, active: false, reasonCode: "OFF" });
    const manager = await delegator();
    const { result } = await manager.calls(delegate(`/${segment(names.team!)}`, "Feature off. Reply OK."));
    expect(result, JSON.stringify(result)).toMatchObject({ delegated: true, target_kind: "team" });
    expect(notesOf(result), "no notes: nothing was skipped").toEqual([]);
    expect(await routerRequests(), "no routing request").toEqual([]);
    expect((await decisions()).groups ?? [], "no decision record while off").toEqual([]);
    expect(await grokSessions(), "nobody started on Grok").toEqual([]);
    evidence["MR-01"] = { result };
  }, 120_000);

  it("MR-02 routing on: the router is asked once, for the members without a usable default; they start on its choice (another runtime); result lines, recorded sources, decisions by Task and statistics (AC-001, AC-009, AC-012)", async () => {
    await setRouter(AGY, MODEL);
    const on = await setEnabled(true);
    expect(on.setModelRoutingEnabled, JSON.stringify(on)).toMatchObject({ enabled: true, active: true });
    const manager = await delegator();
    const { result, elapsedMs } = await manager.calls(delegate(`/${segment(names.team!)}`, "Implement the login form. Reply OK."));
    evidence["MR-02"] = { result, elapsedMs };
    expect(result, JSON.stringify(result)).toMatchObject({ delegated: true, target_kind: "team" });
    const requests = await routerRequests();
    expect(requests, "one routing request").toHaveLength(1);
    expect(requests[0]!.addresses.map((address: string) => address.split("/").at(-1)).sort(), "only the members without a usable default").toEqual(["engineer", "reviewer"]);
    expect(requests[0]!.results.at(-1), "accepted").toMatchObject({ tool: "submit_launch_choices", isError: false });
    const notes = notesOf(result);
    for (const member of ["engineer", "reviewer"]) {
      expect(notes.some((note) => note.includes(`${agentRuntimeName(GROK)} / ${GROK_MODEL}, chosen by the Model Router (implementation): Grok is signed in with limit left.`)
        && note.toLowerCase().includes(member)), `a result line for ${member}: ${JSON.stringify(notes)}`).toBe(true);
    }
    expect(notes.some((note) => note.toLowerCase().includes("designer")), "the designer used its default: no line").toBe(false);
    // Team members start when first messaged: the coordinator (the designer, on its default) messages both routed members,
    // and each starts on the router's choice (a Grok session with its --model).
    const coordinatorRunId = result.target_team_coordinator_agent_run_id as string;
    for (const address of requests[0]!.addresses as string[]) {
      const sent = await manager.calls(callTool("send_message_to", { target_agent_run_id: coordinatorRunId,
        content: callTool("send_message_to", { recipient_address: address, content: "Start on the routed launch. Reply OK." }) }));
      expect(sent.result, JSON.stringify(sent.result)).toMatchObject({ accepted: true });
    }
    await until(async () => (await grokSessions()).length >= 2, "both routed members started on Grok", 90_000);
    expect(await grokSessions(), "each on the model the router chose").toEqual([GROK_MODEL, GROK_MODEL]);
    // Recorded sources (what run Settings rows and restore read).
    const managerTree = await manager.tree();
    const sources = launchSources(managerTree);
    evidence["MR-02-sources"] = sources;
    expect(sources.filter((entry) => entry.source.origin === "model_router").length, JSON.stringify(sources)).toBe(2);
    expect(sources.find((entry) => entry.source.origin === "model_router")?.source).toMatchObject({ taskKind: "implementation", choiceReason: "Grok is signed in with limit left." });
    expect(sources.some((entry) => entry.source.origin === "agent_default"), "the designer's default").toBe(true);
    // Decisions by Task and statistics.
    const page = await decisions();
    evidence["MR-02-decisions"] = page;
    const records = objectsIn(page).filter((record) => typeof record.agentAddress === "string");
    expect(records.map((record) => [String(record.agentAddress).split("/").at(-1), record.source, record.runtimeKind]).sort()).toEqual([
      ["designer", "agent_default", AGY], ["engineer", "model_router", GROK], ["reviewer", "model_router", GROK]]);
    expect(records.find((record) => record.source === "model_router"), "the reason and task kind recorded").toMatchObject({ taskKind: "implementation", choiceReason: "Grok is signed in with limit left." });
    expect(JSON.stringify(page)).toContain("Implement the login form.");
    expect((await decisions("ROUTER")).groups.length).toBe(1);
    const stats = (await graphql(`{modelRoutingStatistics(period:"ALL")}`)).modelRoutingStatistics;
    evidence["MR-02-statistics"] = stats;
    expect(JSON.stringify(stats)).toContain("implementation");
  }, 180_000);

  it("MR-03 an unusable answer goes back to the router and its correction is used; a silent router gives the inherited launch with the router-failure note within the bound (AC-004)", async () => {
    const manager = await delegator();
    await setPlan({ mode: "invalid_then_valid", runtime: AGY, model: MODEL, invalidModel: "mr-no-such-model", taskKind: "review", reason: "Antigravity has Gemini left." });
    const corrected = await manager.calls(delegate(`/${segment(names.solo!)}`, "Review the change. Reply OK."));
    const request = (await routerRequests()).at(-1)!;
    expect(request.results[0], "the unusable answer is refused with what to correct").toMatchObject({ tool: "submit_launch_choices", isError: true });
    expect(request.results[1], "the correction is accepted").toMatchObject({ tool: "submit_launch_choices", isError: false });
    expect(notesOf(corrected.result).join(" ")).toContain(`${agentRuntimeName(AGY)} / ${MODEL}, chosen by the Model Router (review)`);
    evidence["MR-03-corrected"] = { result: corrected.result, request };

    // The router's turn ends without a decision: the request fails at once (design: the failed turn ends it).
    await setPlan({ mode: "silent" });
    const ended = await manager.calls(delegate(`/${segment(names.solo!)}`, "Router turn ends without a decision. Reply OK."), 120_000);
    evidence["MR-03-turn-ended"] = ended;
    expect(notesOf(ended.result).join(" "), JSON.stringify(ended.result)).toContain("Model Router could not choose (the Model Router's turn ended without a decision)");
    expect(ended.elapsedMs, "no wait for the budget").toBeLessThan(30_000);

    // The router stays in its turn without answering: the 40 s budget ends the request.
    await setPlan({ mode: "silent", delayMs: 55_000 });
    const loggedBefore = (await routerRequests()).length;
    const silent = await manager.calls(delegate(`/${segment(names.solo!)}`, "Silent router. Reply OK."), 120_000);
    evidence["MR-03-silent"] = silent;
    // Its turn goes on after the request failed; wait for it to end before the next case.
    await until(async () => (await routerRequests()).length > loggedBefore, "the silent turn ended", 60_000);
    expect(silent.result, JSON.stringify(silent.result)).toMatchObject({ delegated: true });
    expect(notesOf(silent.result).join(" "), "inherited with the router-failure note").toContain("Model Router could not choose (no valid answer within 40 seconds)");
    expect(notesOf(silent.result).join(" ")).toContain(`${agentRuntimeName(AGY)} / ${MODEL} (inherited from the run)`);
    expect(silent.elapsedMs, "the routed delegation answers within the 50 s bound").toBeLessThan(50_000);
    expect(silent.elapsedMs, "it waited for the budget").toBeGreaterThan(38_000);
  }, 240_000);

  it("MR-04 three delegations at once reach the router one per turn in arrival order; a request still waiting at 40 s is never sent and falls back as \"busy\" (AC-006)", async () => {
    const managers = await Promise.all([delegator(), delegator(), delegator()]);
    await setPlan({ mode: "valid", delayMs: 3_000, runtime: GROK, model: GROK_MODEL, taskKind: "implementation", reason: "Grok is free." });
    const before = (await routerRequests()).length;
    const quick = await Promise.all(managers.map((manager, index) => manager.calls(delegate(`/${segment(names.solo!)}`, `Burst ${index}. Reply OK.`))));
    const burst = (await routerRequests()).slice(before);
    evidence["MR-04-quick"] = { burst, results: quick.map((entry) => ({ elapsedMs: entry.elapsedMs, notes: notesOf(entry.result) })) };
    expect(burst, "three requests").toHaveLength(3);
    expect(new Set(burst.map((entry) => entry.requestId)).size).toBe(3);
    for (let index = 1; index < burst.length; index += 1) {
      expect(burst[index]!.receivedAt, "each is sent only after the previous turn ended").toBeGreaterThanOrEqual(burst[index - 1]!.answeredAt);
    }
    for (const entry of quick) expect(notesOf(entry.result).join(" ")).toContain("chosen by the Model Router (implementation)");

    // Slow turns: the first takes 25 s, so the third has waited 40 s before the router is free.
    await setPlan({ mode: "valid", delayMs: 25_000, runtime: GROK, model: GROK_MODEL, taskKind: "implementation", reason: "Grok is free." });
    const slowBefore = (await routerRequests()).length;
    const slow = await Promise.all(managers.map((manager, index) => manager.calls(delegate(`/${segment(names.solo!)}`, `Slow burst ${index}. Reply OK.`), 120_000)));
    const slowNotes = slow.map((entry) => notesOf(entry.result).join(" "));
    await until(async () => (await routerRequests()).length >= slowBefore + 2, "the router's turns ended", 90_000);
    evidence["MR-04-slow"] = { requests: (await routerRequests()).slice(slowBefore), results: slow.map((entry, index) => ({ elapsedMs: entry.elapsedMs, notes: slowNotes[index] })) };
    expect(slowNotes.filter((text) => text.includes("chosen by the Model Router")).length, `one routed: ${JSON.stringify(slowNotes)}`).toBeGreaterThanOrEqual(1);
    expect(slowNotes.some((text) => text.includes("Model Router could not choose (the Model Router was busy)")), `one never sent: ${JSON.stringify(slowNotes)}`).toBe(true);
    for (const entry of slow) expect(entry.elapsedMs, "each within the 50 s bound").toBeLessThan(50_000);
    await until(async () => (await routerRequests()).length >= slowBefore + 2 && (await status()).active === true, "router idle again", 60_000);
    expect((await routerRequests()).slice(slowBefore).length, "the never-sent request did not reach the router").toBeLessThan(3);
  }, 300_000);

  it("MR-05 a default on a model blocked by a used-up limit is skipped with \"blocked until …\" while routing is on, and used as today while off (AC-003)", async () => {
    await fs.writeFile(usageFile, usageAnswer("2026-11-02T10:00:00Z"));
    await setPlan({ mode: "valid", runtime: AGY, model: MODEL, taskKind: "general", reason: "Gemini has limit left." });
    const manager = await delegator();
    const on = await manager.calls(delegate(`/${segment(names.blocked!)}`, "Blocked default, routing on. Reply OK."));
    const onNotes = notesOf(on.result).join(" ");
    evidence["MR-05-on"] = on.result;
    expect(onNotes, JSON.stringify(on.result)).toContain(`its agent default ${agentRuntimeName(AGY)} / ${BLOCKED} could not be used (${BLOCKED} is blocked until 2026-11-02 10:00 UTC (Retiring · weekly))`);
    expect(onNotes).toContain("chosen by the Model Router (general)");
    await setEnabled(false);
    const off = await manager.calls(delegate(`/${segment(names.blocked!)}`, "Blocked default, routing off. Reply OK."));
    evidence["MR-05-off"] = off.result;
    expect(notesOf(off.result), "off: the default is used as today, no skip").toEqual([]);
    await until(async () => (await agyModels()).some((entry) => entry.model === BLOCKED), "the default started on its model", 30_000);
    await fs.rm(usageFile, { force: true });
    await setEnabled(true);
  }, 180_000);

  it("MR-06 the router set to a signed-out runtime: status SIGNED_OUT, and a delegation that needs it notes the inactive router (CR-002)", async () => {
    await setRouter("claude_agent_sdk", "haiku");
    const signedOut = await status();
    evidence["MR-06-status"] = signedOut;
    expect(signedOut, JSON.stringify(signedOut)).toMatchObject({ enabled: true, active: false, reasonCode: "SIGNED_OUT" });
    const manager = await delegator();
    const { result } = await manager.calls(delegate(`/${segment(names.solo!)}`, "Router signed out. Reply OK."));
    expect(notesOf(result).join(" "), JSON.stringify(result)).toContain("Model Routing is on but the Model Router is not usable");
    expect(notesOf(result).join(" ")).toContain("(inherited from the run)");
    await setRouter(AGY, MODEL);
    expect((await status()).active).toBe(true);
  }, 120_000);

  it("MR-07 the router's definition, run and workspace are hidden unless internal agents are shown; \"Talk to the router\" opens its run either way (AC-008)", async () => {
    const routerRunId = (await graphql(`mutation{openModelRouterAgent}`)).openModelRouterAgent as string;
    expect(routerRunId).toBeTruthy();
    const listed = async () => ({
      definition: ((await graphql(`{agentDefinitions{id}}`)).agentDefinitions as Rec[]).some((entry) => entry.id === ROUTER_ID),
      run: JSON.stringify((await graphql(`{listWorkspaceRunHistory{agentDefinitions{agentDefinitionId runs{runId}}}}`)).listWorkspaceRunHistory).includes(routerRunId),
      workspace: JSON.stringify((await graphql(`{workspaces{workspaceId name config}}`)).workspaces).includes("internal-workspaces"),
    });
    const hidden = await listed();
    expect(hidden, "hidden while internal agents are hidden").toEqual({ definition: false, run: false, workspace: false });
    expect(JSON.stringify((await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: routerRunId })).getRunProjection),
      "its run opens by ID with the routing requests").toContain("Routing request");
    await graphql(`mutation{updateServerSetting(key:"AUTOBYTEUS_SHOW_INTERNAL_AGENTS", value:"true")}`);
    const shown = await listed();
    await graphql(`mutation{updateServerSetting(key:"AUTOBYTEUS_SHOW_INTERNAL_AGENTS", value:"false")}`);
    evidence["MR-07"] = { routerRunId, hidden, shown };
    expect(shown, "listed once shown").toEqual({ definition: true, run: true, workspace: true });
  }, 60_000);

  it("MR-08 the router run's agent tools are its template's, without collaboration tools (AC-011)", async () => {
    const routerRunId = (await graphql(`mutation{openModelRouterAgent}`)).openModelRouterAgent as string;
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${routerRunId}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "router stream ready");
    sendE2eSendMessageCommand(socket, { agent_run_id: routerRunId, content: "LIST_TOOLS" });
    let tools: string[] = [];
    await until(async () => {
      const conversation = (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: routerRunId })).getRunProjection?.conversation;
      const text = objectsIn(conversation).flatMap((record) => Object.values(record)).find((value) => typeof value === "string" && value.startsWith("TOOLS:")) as string | undefined;
      if (text) tools = (JSON.parse(text.slice("TOOLS:".length)) as Rec[]).map((tool) => tool.name as string);
      return tools.length > 0;
    }, "the router's tool list", 60_000);
    evidence["MR-08"] = tools;
    expect(tools).toEqual(expect.arrayContaining(["list_available_agent_runtimes", "submit_launch_choices"]));
    for (const collaboration of ["delegate_task", "send_message_to", "get_handoff_rules", "list_available_agents"]) expect(tools, collaboration).not.toContain(collaboration);
  }, 90_000);

  it("MR-09 C-05/CR-005: after the router's CLI dies mid-turn, or its turn fails with an error, the next routings are the router's again", async () => {
    const manager = await delegator();
    const route = async (label: string) => {
      console.log(`MR-09 step ${label}: started ${new Date().toISOString()}`);
      const { result, elapsedMs } = await manager.calls(delegate(`/${segment(names.solo!)}`, `${label}. Reply OK.`), 120_000);
      const entry = { label, elapsedMs, delegated: result.delegated, notes: notesOf(result), status: (await graphql(`{modelRoutingStatus}`)).modelRoutingStatus };
      console.log(`MR-09 step ${JSON.stringify(entry)}`);
      return entry;
    };
    const observed: Rec[] = [];
    await setRouter(AGY, MODEL);
    await setEnabled(true);
    for (const mode of ["crash", "throw"] as const) {
      await setPlan({ mode });
      observed.push(await route(`Router ${mode}`));
      await setPlan({ mode: "valid", runtime: AGY, model: MODEL, taskKind: "general", reason: `Back after ${mode}.` });
      observed.push(await route(`After ${mode}, 1`));
      observed.push(await route(`After ${mode}, 2`));
    }
    // The page's launch change gives the router a new run.
    await setRouter(AGY, "mr-blocked-model");
    await setRouter(AGY, MODEL);
    observed.push(await route("After a new router launch"));
    evidence["MR-09"] = observed;
    console.log(`MR-09 ${JSON.stringify(observed)}`);
    for (const entry of observed) expect(entry.elapsedMs, `${entry.label}: within the 50 s bound`).toBeLessThan(50_000);
    const notesOfStep = (label: string) => observed.find((entry) => entry.label === label)?.notes.join(" ") ?? "";
    // The failing request falls back with its own reason.
    expect(notesOfStep("Router crash")).toContain("the Model Router's turn was interrupted");
    expect(notesOfStep("Router throw")).toContain("the Model Router's turn failed");
    // Every later routing is the router's again, without waiting for the budget (CR-005: the stopped run is restored).
    for (const mode of ["crash", "throw"] as const) {
      for (const label of [`After ${mode}, 1`, `After ${mode}, 2`]) {
        expect(notesOfStep(label), label).toContain(`chosen by the Model Router (general): Back after ${mode}.`);
        expect(observed.find((entry) => entry.label === label)?.elapsedMs, label).toBeLessThan(30_000);
      }
    }
    expect(notesOfStep("After a new router launch")).toContain("chosen by the Model Router (general): Back after throw.");
    for (const entry of observed) expect(entry.status, entry.label).toMatchObject({ enabled: true, active: true });
  }, 400_000);
});
