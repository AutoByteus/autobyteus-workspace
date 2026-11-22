import fs from "node:fs";
import fsp from "node:fs/promises";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { randomUUID } from "node:crypto";
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import WebSocket from "ws";
import { afterAll, describe, expect, it } from "vitest";
import { calledResults, toolResult, type Rec } from "../helpers/collaboration-root-harness.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { pairNodes } from "../helpers/pair-nodes.js";
import { findAgyRunCapsule } from "../helpers/agy-run-capsule.js";

// autobyteus-461 acceptance test (design DS-10 "Validation": the contract's stories, run against the server). The contract's
// executable model (`target-collaboration-contract.md` revision 8, `evidence/collaboration-model/`) generates the expected
// state after every step of its three stories; `tests/fixtures/collaboration-contract/contract-states.json` holds them
// (regenerate and check with `export_contract_states.py`). This suite drives every step through the real surfaces of the
// BUILT server (`dist/app.js`): the acting agent's own tool call (the scripted AGY CLI: a user message `CALL_TOOL:{...}` makes
// that agent call the real tool), the user's Stop and Task delete through GraphQL. After every step it compares every file of
// the model's disk with the server's file, the call's result or refusal, and the header each receiver sees.
// Matching: `…` in the model matches anything (a dict holding the key `…` allows other keys); an ISO timestamp matches any ISO
// timestamp (null must stay null); a model ID (run, agent, message, Task, node, definition) binds to the server's ID the first
// time it is compared and must agree afterwards; a file the model removed must not exist.
// - §5.1 (S0 … S27) on node A with a paired peer node B; §5.2 (U0 … U11) and §5.3 (O0 … O9) each on a fresh node.
// A difference is a code defect or a contract defect; the contract's model decides which (design "Validation").
// Prerequisite: `pnpm -C autobyteus-server-ts build` for this worktree.
// Run: env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
//   ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/collaboration-contract-stories.e2e.test.ts --no-watch
// `CONTRACT_STORIES_EVIDENCE_DIR=<dir>` writes each step's comparison there.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;
const evidenceDir = process.env.CONTRACT_STORIES_EVIDENCE_DIR ?? "";
/** The nodes' log level (WARN; INFO or DEBUG to diagnose a step). */
const logLevel = process.env.CONTRACT_STORIES_LOG_LEVEL ?? "WARN";

type Story = { section: string; title: string; nodes: string[]; nodeIds: Record<string, string>; states: State[] };
type State = { id: string; title: string; cases: string[]; call: string; results: Rec[]; refused: { code: string; message: string } | null;
  receiverSees: string[]; disk: Record<string, unknown>; trees: Record<string, TreeNode[]> };
type TreeNode = { run: { kind: string; runId: string }; parent: { kind: string; runId: string } | null; agents: { agentRunId: string; address: string }[] };
const FIXTURE = JSON.parse(fs.readFileSync(path.resolve(__dirname, "../../fixtures/collaboration-contract/contract-states.json"), "utf8")) as { stories: Story[] };
const MODEL = "gemini-3.8-flash-low";
const ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const ELLIPSIS = "…";
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const freePort = () => new Promise<number>((resolve, reject) => {
  const server = net.createServer(); server.once("error", reject);
  server.listen(0, "127.0.0.1", () => { const { port } = server.address() as net.AddressInfo; server.close(() => resolve(port)); });
});

// ---- a node: the built server on its own data root -----------------------------------------------------------------------
class Node {
  child: ChildProcess | null = null;
  nodeId = "";
  url = "";
  output = "";
  readonly sockets: WebSocket[] = [];
  constructor(readonly name: string, readonly dataDir: string, readonly port: number) { this.url = `http://127.0.0.1:${port}`; }
  async start() {
    for (const dir of [this.dataDir, path.join(this.dataDir, "home"), path.join(this.dataDir, "workspace")]) await fsp.mkdir(dir, { recursive: true });
    await seedFileAuthoredAgents(this.dataDir);
    // A long idle grace: a quiet delegated run is not shut down between steps (idle shutdown has its own tests).
    await fsp.writeFile(path.join(this.dataDir, ".env"), [`AUTOBYTEUS_SERVER_HOST=${this.url}`, "APP_ENV=test", `LOG_LEVEL=${logLevel}`,
      "HTTP_ACCESS_LOG_MODE=off", "AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=3600000", ""].join("\n"));
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: path.join(this.dataDir, "home"), TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", APP_ENV: "test", LOG_LEVEL: logLevel, HTTP_ACCESS_LOG_MODE: "off",
      AUTOBYTEUS_SERVER_HOST: this.url, ...builtServerLaunchEnvironment() };
    const serverDir = path.resolve(__dirname, "../../..");
    this.child = spawn(process.execPath, [path.join(serverDir, "dist", "app.js"), "--host", "127.0.0.1", "--port", String(this.port), "--data-dir", this.dataDir],
      { cwd: serverDir, env, stdio: ["ignore", "pipe", "pipe"] });
    this.child.stdout!.on("data", (chunk) => { this.output += String(chunk); });
    this.child.stderr!.on("data", (chunk) => { this.output += String(chunk); });
    const deadline = Date.now() + 120_000;
    while (!(await fetch(`${this.url}/rest/health`).then((r) => r.ok, () => false))) {
      if (this.child.exitCode !== null || Date.now() > deadline) throw new Error(`${this.name} did not start: ${this.output.slice(-2000)}`);
      await sleep(300);
    }
  }
  async gql<T = any>(query: string, variables: Rec = {}): Promise<T> {
    const response = await fetch(`${this.url}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  }
  async stop() {
    // The node's log, without the repeated "Memory file missing" lines, beside the story's evidence.
    if (evidenceDir) await fsp.mkdir(evidenceDir, { recursive: true }).then(() => fsp.writeFile(path.join(evidenceDir, `server-${this.name}.log`),
      this.output.split("\n").filter((line) => !line.startsWith("Memory file missing")).join("\n"))).catch(() => undefined);
    for (const socket of this.sockets.splice(0)) socket.terminate();
    const child = this.child;
    if (!child || child.exitCode !== null || child.signalCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    await Promise.race([exited, sleep(15_000).then(() => { if (child.exitCode === null) child.kill("SIGKILL"); })]);
  }
}

/**
 * Agent definitions that keep the model's IDs exactly, file-authored before the node starts (the authoring path every node
 * loads): a GraphQL-created definition's ID is derived from its name and lower-cased, so the org's `Teacher` would become
 * `teacher`, and its binding would rewrite the address `/Teacher` the stories send to.
 */
const seedFileAuthoredAgents = async (dataDir: string) => {
  const agentFile = async (id: string, name: string) => {
    const dir = path.join(dataDir, "agents", id);
    await fsp.mkdir(dir, { recursive: true });
    await fsp.writeFile(path.join(dir, "agent.md"), ["---", `name: ${name}`, "role: assistant", "---", "", "Follow the request."].join("\n"));
    await fsp.writeFile(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }, null, 2));
  };
  await agentFile("student", "Student");
  await agentFile("tutor", "Tutor");
  await agentFile("Teacher", "Teacher");
};

// ---- the comparison --------------------------------------------------------------------------------------------------------
/** Model IDs (runs, agents, messages, Tasks, nodes, definitions, paths) and the server's values they stand for. */
class Bindings {
  readonly toReal = new Map<string, string>();
  readonly toModel = new Map<string, string>();
  constructor(readonly ids: Set<string>) {}
  bind(model: string, real: string): string | null {
    const known = this.toReal.get(model);
    if (known !== undefined) return known === real ? null : `${model} is bound to ${known}, got ${real}`;
    const other = this.toModel.get(real);
    if (other !== undefined && other !== model) return `${real} is already ${other}, not ${model}`;
    this.toReal.set(model, real); this.toModel.set(real, model); return null;
  }
  /** A model string with every bound ID (longest first) replaced by its real value. */
  map(text: string): string {
    let out = text;
    for (const model of [...this.toReal.keys()].sort((a, b) => b.length - a.length)) out = out.split(model).join(this.toReal.get(model)!);
    return out;
  }
}
const isId = (bindings: Bindings, value: string) => bindings.ids.has(value);
const compare = (bindings: Bindings, model: unknown, real: unknown, at: string, diffs: string[]): void => {
  if (model === ELLIPSIS) return;
  if (typeof model === "string") {
    if (typeof real !== "string") { diffs.push(`${at}: expected a string like ${JSON.stringify(model)}, got ${JSON.stringify(real)}`); return; }
    if (ISO.test(model)) { if (!ISO.test(real)) diffs.push(`${at}: expected a timestamp, got ${JSON.stringify(real)}`); return; }
    if (isId(bindings, model)) { const problem = bindings.bind(model, real); if (problem) diffs.push(`${at}: ${problem}`); return; }
    const mapped = bindings.map(model);
    if (mapped.includes(ELLIPSIS)) {
      const parts = mapped.split(ELLIPSIS);
      let from = 0;
      const ok = parts.every((part, index) => {
        if (index === 0) { if (!real.startsWith(part)) return false; from = part.length; return true; }
        const found = index === parts.length - 1 ? (real.endsWith(part) && real.length - part.length >= from ? real.length - part.length : -1) : real.indexOf(part, from);
        if (found < 0) return false; from = found + part.length; return true;
      });
      if (!ok) diffs.push(`${at}: ${JSON.stringify(real)} does not match ${JSON.stringify(mapped)}`);
      return;
    }
    if (mapped !== real) diffs.push(`${at}: expected ${JSON.stringify(mapped)}, got ${JSON.stringify(real)}`);
    return;
  }
  if (Array.isArray(model)) {
    if (!Array.isArray(real)) { diffs.push(`${at}: expected an array, got ${JSON.stringify(real)?.slice(0, 200)}`); return; }
    if (model.length !== real.length) { diffs.push(`${at}: expected ${model.length} items, got ${real.length}: ${JSON.stringify(real).slice(0, 600)}`); return; }
    model.forEach((item, index) => compare(bindings, item, real[index], `${at}[${index}]`, diffs));
    return;
  }
  if (model && typeof model === "object") {
    if (!real || typeof real !== "object" || Array.isArray(real)) { diffs.push(`${at}: expected an object, got ${JSON.stringify(real)?.slice(0, 200)}`); return; }
    const m = model as Rec, r = real as Rec;
    const open = ELLIPSIS in m;
    for (const key of Object.keys(m)) {
      if (key === ELLIPSIS) continue;
      if (!(key in r)) { diffs.push(`${at}.${key}: missing`); continue; }
      compare(bindings, m[key], r[key], `${at}.${key}`, diffs);
    }
    if (!open) for (const key of Object.keys(r)) if (!(key in m)) diffs.push(`${at}.${key}: not in the contract (${JSON.stringify(r[key])?.slice(0, 120)})`);
    return;
  }
  if (model !== real) diffs.push(`${at}: expected ${JSON.stringify(model)}, got ${JSON.stringify(real)}`);
};
const ROW_KEYS = ["runId", "teamRunId", "orgRunId"];
const rowKey = (row: Rec) => row[ROW_KEYS.find((key) => key in row)!] as string;

/** Every ID-like string of the model: what may bind to a server value. */
const collectIds = (stories: Story[]): Set<string> => {
  const ids = new Set<string>();
  const visit = (value: unknown, key = "") => {
    if (Array.isArray(value)) { value.forEach((item) => visit(item, key)); return; }
    if (value && typeof value === "object") { for (const [k, v] of Object.entries(value as Rec)) visit(v, k); return; }
    if (typeof value !== "string") return;
    if (/^(runId|teamRunId|orgRunId|agentRunId|coordinatorAgentRunId|delegatorAgentRunId|senderAgentRunId|receiverAgentRunId|target_agent_run_id|messageId|taskId|projectId|platformAgentRunId|nodeId|partOfTaskId)$/.test(key)
      && value !== ELLIPSIS && !ISO.test(value)) ids.add(value);
    if (/^(taskKey|agentDefinitionId|teamDefinitionId|orgDefinitionId)$/.test(key)) ids.add(value);
  };
  for (const story of stories) for (const state of story.states) {
    visit(state.disk); visit(state.results); visit(state.trees);
    for (const p of Object.keys(state.disk)) for (const segment of p.split(/[:/ ]/)) if (/_[0-9a-f]{4}$/.test(segment)) ids.add(segment);
  }
  return ids;
};

/** Set to keep running a story after a step differs (to see every difference in one run); the test still fails. */
const continueOnDifference = process.env.CONTRACT_STORIES_CONTINUE === "1";

/**
 * Differences between the contract's examples and the product that are not this ticket's: each names its reason, and
 * the evidence lists every match under `known`, so none is hidden.
 */
const KNOWN_DIFFERENCES: Array<{ pattern: RegExp; reason: string; states?: string[] }> = [
  {
    pattern: /team_run_execution_tree\.json\.schemaVersion: missing$/,
    reason: "The team run file has had no schemaVersion since before autobyteus-461 (base 827f1e68dc reads it tolerantly and writes the current shape without it); the contract's §6 example carries it. The shape is unchanged by this ticket.",
  },
  {
    pattern: /run_metadata\.json\.(preparedAt|preparedExpiresAt|applicationExecutionContext): not in the contract/,
    reason: "Contract §3.2: a delegated run's own file is 'the ordinary file of its kind, plus delegatedFrom'. These ordinary run_metadata fields exist since before autobyteus-461 (base 827f1e68dc writes them on every run); the §3.2 example lists the collaboration fields only.",
  },
  {
    pattern: /ad-hoc-tasks\/[^/]+\/task\.json\.(projectId: missing|title: missing|referenceFiles: not in the contract|status: expected "IN_PROGRESS", got "TODO")/,
    reason: "REQ-005 keeps the Task rules unchanged and the contract text does not define the ad-hoc task.json; the product keeps base 827f1e68dc's shape ({taskId, description, referenceFiles, status TODO, createdAt, updatedAt}). The model (model.py line 358) writes its own approximation.",
  },
  {
    pattern: /run_metadata\.json\.llmConfig: expected an object, got null$/,
    reason: "A launch keeps only the settings its model declares (launch-usability-check.ts canonicalLaunch, before autobyteus-461); the scripted AGY model declares none, so a default launch's llmConfig is stored as null. The model writes an open object.",
  },
  {
    pattern: /agent_org_run_execution_tree\.json\.rootOrg(\.members\[\d+\])+\.(role|description|platformAgentRunId|defaultLaunchConfiguration): not in the contract/,
    reason: "An org file's members carry the ordinary configured-member fields (role, description, platformAgentRunId; a mounted team's defaultLaunchConfiguration) since before autobyteus-461 (base run-execution-tree-shared-record-schemas.ts); the model's org file lists the collaboration fields only (its team file has them as open values).",
  },
  {
    pattern: /^refusal: expected the text "No agent or agent team you can talk with has the address \/dev_team\/[a-z_]+\. .*got \{"accepted":false,"code":"COLLABORATION_TARGET_NOT_FOUND","message":"Collaboration target '\/dev_team\/[a-z_]+' is not a member of your team instance '\/dev_team'\."/,
    reason: "Contract §2.3 / C-4: a miss returns COLLABORATION_TARGET_NOT_FOUND 'with today's guidance'. A miss under a mounted team's prefix keeps base 827f1e68dc's text (message-recipient-resolution.ts:74); the model writes one text for every miss.",
  },
  {
    pattern: /team_run_execution_tree\.json\.rootTeam\.(members\[\d+\]\.launchSource|defaultLaunchSource): not in the contract/,
    reason: "A delegated team run's own file records where each launch came from: design-spec DS-10 (E6 row) and the DelegatedRunStarter ('its resolved launch, address and launchSource') name rootTeam.defaultLaunchSource and the members' launchSource; the contract's §3.2 team example omits them.",
  },
  {
    pattern: /^result\[0\]\.message: expected "Message delivered\.", got "Message delivered\. (\S+) continues with its conversation\."$/,
    reason: "Today's text when a message by run ID continues the run of a reopened Task is the run-ID text followed by 'X continues with its conversation.': base 827f1e68dc root-task-execution-lifecycle.ts:301 appends it to the delivery's message, which by run ID on this node is 'Message delivered.' (contract §2, SR-054); kept in cross-run-message-delivery.ts:105; the update_task description names it. The product keeps it (REQ-009); the model writes the plain run-ID text. A contract-model note, not a product difference. (Round 2 quoted 'Delivered message to X. …', the text F-6 had changed.)",
    states: ["S11"],
  },
  {
    pattern: /team_run_history_index\.json\[software_engineering_team_0218\]\.terminatedAt: expected a string like/,
    reason: "The model lets an agent of a stopped run make a call (S23, S24: solution_designer_65a9 while E is stopped). A real agent acts only on input: the test drives the call by the user's message to it on E's view, which restores E (REQ-003, SR-048), so E's row is active (terminatedAt null).",
    // S25: E is still active from the S24 driving (its idle grace is an hour in this test).
    states: ["S23", "S24", "S25"],
  },
  {
    pattern: /^B:memory\/team_run_history_index\.json\[research_team_(77aa|5c5c)\]\.workspaceRootPath: expected "[^"]*\/story-5\.1-A\/workspace", got "[^"]*\/story-5\.1-B\/temp_workspace"$/,
    reason: "A run a peer starts runs in a folder of its own node (node B's temporary workspace); the delegator's folder is a path on node A. Unchanged by autobyteus-461 (the peer start path). The model gives B's row A's folder. A contract-model note. (research_team_5c5c: S25's team, a saved Task's copy since autobyteus-587 DEC-009.)",
  },
  {
    pattern: /^refusal: expected code [A-Z_]+, got \{"delegated":false,"message":/,
    reason: "A refused delegate_task returns {delegated:false, message} with no code since before autobyteus-461 (task-delegation-result-contract.ts); the agent sees the message, which is compared in full. The model names the code of the rule that refuses.",
  },
];

suite("The collaboration contract's stories, run against the built server (autobyteus-461 acceptance test)", () => {
  const ids = collectIds(FIXTURE.stories);
  const nodes: Node[] = [];
  let root = "";
  afterAll(async () => {
    for (const node of nodes) await node.stop().catch(() => undefined);
    if (root) await fsp.rm(root, { recursive: true, force: true });
  }, 120_000);

  /** One story's run: nodes by model name ("A", "B"), the bindings, and the steps' drivers. */
  const runStory = async (story: Story, steps: Record<string, (ctx: Ctx) => Promise<void>>, setup: (ctx: Ctx) => Promise<void>) => {
    root ||= await fsp.realpath(await fsp.mkdtemp(path.join(os.tmpdir(), "contract-stories-e2e-")));
    const ctx = new Ctx(story, new Bindings(ids));
    for (const name of story.nodes) {
      const node = new Node(`${story.section}-${name}`, path.join(root, `story-${story.section}-${name}`), await freePort());
      await node.start(); nodes.push(node); ctx.nodes[name] = node;
      const status = await (await fetch(`${node.url}/rest/remote-access/status`).catch(() => null))?.json().catch(() => null) as Rec | null;
      node.nodeId = status?.nodeId ?? "";
    }
    await setup(ctx);
    const report: Rec[] = [];
    const failed: string[] = [];
    const failureLogs: Record<string, Record<string, string>> = {};
    for (const state of story.states) {
      const driver = steps[state.id];
      if (!driver) throw new Error(`no driver for ${state.id}`);
      ctx.state = state; ctx.results = []; ctx.refusals = [];
      let all: string[];
      try { await driver(ctx); all = await ctx.settle(state); }
      catch (error) {
        if (!continueOnDifference) throw error;
        all = [`the step failed: ${String((error as Error)?.stack ?? error).slice(0, 800)}`];
        // What the nodes logged around the failure (warnings and errors; LOG_LEVEL=WARN).
        failureLogs[state.id] = Object.fromEntries(Object.entries(ctx.nodes).map(([name, node]) => [name, node.output.slice(-8000)]));
      }
      const known = all.filter((d) => KNOWN_DIFFERENCES.some((k) => k.pattern.test(d) && (!k.states || k.states.includes(state.id))));
      const diffs = all.filter((d) => !known.includes(d));
      report.push({ state: state.id, cases: state.cases, diffs, known });
      if (evidenceDir) {
        await fsp.mkdir(evidenceDir, { recursive: true });
        await fsp.writeFile(path.join(evidenceDir, `contract-stories-${story.section}.json`), `${JSON.stringify({ report, knownDifferences: KNOWN_DIFFERENCES.map((k) => ({ pattern: String(k.pattern), reason: k.reason })), bindings: Object.fromEntries(ctx.bindings.toReal), failureLogs }, null, 1)}\n`);
      }
      if (!continueOnDifference) expect(diffs, `${state.id} (${state.cases.join(", ")}) ${state.title}`).toEqual([]);
      else if (diffs.length) failed.push(`${state.id} (${state.cases.join(", ")}): ${diffs.join(" | ").slice(0, 1500)}`);
    }
    expect(failed, "steps that differ from the contract").toEqual([]);
    for (const node of Object.values(ctx.nodes)) await node.stop();
  };

  class Ctx {
    nodes: Record<string, Node> = {};
    state!: State;
    results: Rec[] = [];
    refusals: Rec[] = [];
    workspace = "";
    startedTasks: Array<[string, string]> = [];
    lastResult: Rec | null = null;
    constructor(readonly story: Story, readonly bindings: Bindings) {}
    real(model: string) { const value = this.bindings.toReal.get(model); if (!value) throw new Error(`${model} is not bound yet`); return value; }
    /** The model run holding an agent, with its node: from the run files of the model's disk (a run's own file lists its agents). */
    runOf(agentModelId: string): { node: string; kind: string; runId: string; address: string } {
      for (const [modelPath, file] of Object.entries(this.state.disk)) {
        const node = modelPath.slice(0, modelPath.indexOf(":"));
        if (modelPath.endsWith("/run_metadata.json")) {
          const f = file as Rec;
          if (f.runId === agentModelId) return { node, kind: "agent", runId: f.runId as string, address: (f.address as string) ?? "/" };
          continue;
        }
        const kind = modelPath.endsWith("/team_run_execution_tree.json") ? "agent_team" : modelPath.endsWith("/agent_org_run_execution_tree.json") ? "agent_org" : null;
        if (!kind) continue;
        const rootPart = (file as Rec)[kind === "agent_team" ? "rootTeam" : "rootOrg"] as Rec;
        const found: Rec[] = [];
        const visit = (v: unknown) => { if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === "object") {
          const r = v as Rec; if (r.agentRunId === agentModelId && typeof r.address === "string") found.push(r); Object.values(r).forEach(visit); } };
        visit(rootPart);
        if (found.length) return { node, kind, runId: (rootPart.teamRunId ?? rootPart.orgRunId) as string, address: found[0]!.address as string };
      }
      throw new Error(`agent ${agentModelId} is in no run file of the model at ${this.state.id}`);
    }
    async conversation(agentModelId: string, run = this.runOf(agentModelId)) {
      const node = this.nodes[run.node]!; const runId = this.real(run.runId); const agent = this.real(agentModelId);
      if (run.kind === "agent") return (await node.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation;
      if (run.kind === "agent_team") return (await node.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: runId, a: agent })).getTeamMemberRunProjection?.conversation;
      return (await node.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
        { id: runId, a: agent, m: run.address })).getAgentOrgMemberRunProjection?.conversation;
    }
    /** The user's message to an agent of a run, on that run's view stream (a stopped run starts on it). */
    async tell(agentModelId: string, content: string) {
      const run = this.runOf(agentModelId);
      const node = this.nodes[run.node]!; const runId = this.real(run.runId); const agent = this.real(agentModelId);
      const route = run.kind === "agent" ? `agent/${runId}` : run.kind === "agent_team" ? `agent-team/${runId}` : `agent-org/${runId}`;
      const socket = new WebSocket(`${node.url.replace(/^http/, "ws")}/ws/${route}`);
      node.sockets.push(socket);
      const frames: Rec[] = [];
      socket.on("message", (raw) => frames.push(JSON.parse(String(raw))));
      await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
      const deadline = Date.now() + 30_000;
      // The stream accepts input once it has said CONNECTED (otherwise SESSION_NOT_READY).
      while (!frames.some((frame) => frame.type === "CONNECTED") && Date.now() < deadline) await sleep(50);
      socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: run.kind === "agent_org"
        ? { root_subject_kind: "agent_org", root_run_id: runId, target_agent_run_id: agent, command_id: randomUUID(), message_id: randomUUID(),
          dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
        : { agent_run_id: agent, message_id: `e2e-${randomUUID()}`, dedupe_key: `agent_run_input:e2e:${randomUUID()}`, content, context_file_paths: [], image_urls: [] } }));
      return { socket, frames };
    }
    /** One tool call by an agent (its scripted CLI calls the real tool); returns the tool's result. */
    /** `record`: false for the setup's own calls (the model's Tasks start in their status), which the model has no result for. */
    async call(agentModelId: string, tool: string, args: Rec, record = true): Promise<Rec> {
      const before = calledResults(await this.conversation(agentModelId)).length;
      const { socket, frames } = await this.tell(agentModelId, callTool(tool, args));
      let results: string[] = [];
      const deadline = Date.now() + 90_000;
      while (Date.now() < deadline) {
        results = calledResults(await this.conversation(agentModelId).catch(() => []));
        if (results.length > before) break;
        await sleep(200);
      }
      socket.close();
      if (results.length <= before) {
        const tail = JSON.stringify(await this.conversation(agentModelId).catch((e) => String(e)) ?? null).slice(-1500);
        // What the run's stream answered the message with (a refusal is an ERROR frame or a rejected ack).
        const answered = frames.filter((f) => f.type === "ERROR" || f.type === "AGENT_COMMAND_ACK" || f.type === "TEAM_STATUS")
          .map((f) => `${String(f.type)} ${JSON.stringify(f.payload).slice(0, 300)}`);
        throw new Error(`${this.state.id}: no result of ${tool} by ${agentModelId}; the stream answered: ${JSON.stringify(answered).slice(0, 600)}; its conversation ends: ${tail.slice(-500)}`);
      }
      const result = toolResult(results[before]!);
      // The model's results: a delivered `send_message_to`, an accepted `delegate_task`, an `update_task`; a refused call is a refusal.
      const refused = result.isError || result.accepted === false || result.delegated === false || Boolean(result.error);
      this.lastResult = result;
      if (!record) return result;
      if (refused) this.refusals.push(result);
      else if (["send_message_to", "delegate_task", "update_task"].includes(tool)) this.results.push({ ...result, __tool: tool });
      return result;
    }
    /**
     * One tool call made the way the agent's own CLI makes it: over the run's scoped MCP endpoint (its capsule's
     * mcp_config.json). For a step whose actor takes no user input: DS-15 fences a run whose Tasks are all closed, so a user
     * message cannot start the agent's turn, while the model's step is the agent's own call. Recorded as `call` records.
     */
    async callDirect(agentModelId: string, tool: string, args: Rec): Promise<Rec> {
      const run = this.runOf(agentModelId);
      const memory = path.join(this.nodes[run.node]!.dataDir, "memory");
      const agent = this.real(agentModelId);
      let capsule: string | null = null;
      const deadline = Date.now() + 30_000;
      while (!(capsule = findAgyRunCapsule(memory, agent)?.path ?? null) && Date.now() < deadline) await sleep(200);
      if (!capsule) throw new Error(`${this.state.id}: no run capsule for ${agentModelId}`);
      const server = (JSON.parse(await fsp.readFile(path.join(capsule, ".agents", "mcp_config.json"), "utf8")) as Rec).mcpServers?.autobyteus_agent_tools as Rec;
      const { Client, StreamableHTTPClientTransport } = await import("@modelcontextprotocol/client");
      const client = new Client({ name: "collaboration-contract-stories", version: "1.0.0" });
      await client.connect(new StreamableHTTPClientTransport(new URL(server.serverUrl as string), { requestInit: { headers: (server.headers ?? {}) as Record<string, string> } }));
      let raw: Rec;
      try { raw = await client.callTool({ name: tool, arguments: args }) as Rec; } finally { await client.close(); }
      const result: Rec = raw.structuredContent && typeof raw.structuredContent === "object" ? { ...(raw.structuredContent as Rec), isError: raw.isError === true }
        : { ...JSON.parse(String((raw.content as Rec[] | undefined)?.[0]?.text ?? "{}")), isError: raw.isError === true };
      const refused = result.isError || result.accepted === false || result.delegated === false || Boolean(result.error);
      this.lastResult = result;
      if (refused) this.refusals.push(result);
      else if (["send_message_to", "delegate_task", "update_task"].includes(tool)) this.results.push({ ...result, __tool: tool });
      return result;
    }
    /** Binds a new run (from a result) and its agents (from its own file, by address). */
    async bindRun(modelRun: string, realRun: string, node = "A") {
      if (typeof realRun !== "string" || !realRun) throw new Error(`${this.state.id}: the call returned no run ID for ${modelRun}: ${JSON.stringify(this.lastResult)?.slice(0, 1500)}`);
      const problem = this.bindings.bind(modelRun, realRun); if (problem) throw new Error(problem);
      const entry = Object.values(this.state.trees).flat().find((e) => e.run.runId === modelRun) ?? this.entryFromDisk(modelRun);
      if (!entry) return;
      if (entry.run.kind === "agent") { for (const a of entry.agents) this.bindings.bind(a.agentRunId, realRun); return; }
      const dataDir = this.nodes[node]!.dataDir;
      const file = entry.run.kind === "agent_team" ? path.join(dataDir, "memory", "agent_teams", realRun, "team_run_execution_tree.json")
        : path.join(dataDir, "memory", "agent_orgs", realRun, "agent_org_run_execution_tree.json");
      const tree = JSON.parse(await fsp.readFile(file, "utf8")) as Rec;
      const members: Rec[] = [];
      const visit = (value: unknown) => { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === "object") {
        const r = value as Rec; if (typeof r.agentRunId === "string" && typeof r.address === "string") members.push(r); Object.values(r).forEach(visit); } };
      visit(entry.run.kind === "agent_team" ? tree.rootTeam : tree.rootOrg);
      for (const a of entry.agents) {
        const real = members.find((m) => m.address === a.address);
        if (!real) throw new Error(`${modelRun}: no member at ${a.address} in ${JSON.stringify(members)}`);
        const p = this.bindings.bind(a.agentRunId, real.agentRunId as string); if (p) throw new Error(p);
      }
    }
    /** A run's kind and agents from its own file on the model's disk (a run the user started is in no tree until it delegates). */
    entryFromDisk(modelRun: string): TreeNode | null {
      for (const [modelPath, file] of Object.entries(this.state.disk)) {
        const f = file as Rec;
        if (modelPath.endsWith("/run_metadata.json") && f.runId === modelRun)
          return { run: { kind: "agent", runId: modelRun }, parent: null, agents: [{ agentRunId: modelRun, address: (f.address as string) ?? "/" }] };
        const kind = modelPath.endsWith("/team_run_execution_tree.json") ? "agent_team" : modelPath.endsWith("/agent_org_run_execution_tree.json") ? "agent_org" : null;
        if (!kind) continue;
        const rootPart = f[kind === "agent_team" ? "rootTeam" : "rootOrg"] as Rec;
        if ((rootPart?.teamRunId ?? rootPart?.orgRunId) !== modelRun) continue;
        const agents: { agentRunId: string; address: string }[] = [];
        const visit = (v: unknown) => { if (Array.isArray(v)) v.forEach(visit); else if (v && typeof v === "object") {
          const r = v as Rec; if (typeof r.agentRunId === "string" && typeof r.address === "string") agents.push({ agentRunId: r.agentRunId, address: r.address }); Object.values(r).forEach(visit); } };
        visit(rootPart);
        return { run: { kind, runId: modelRun }, parent: null, agents };
      }
      return null;
    }
    /** The server path of a model path ("A:memory/…"). */
    serverPath(modelPath: string): { node: Node; file: string; kind: "dir" | "json" | "jsonl" } {
      const [nodeName, rest] = [modelPath.slice(0, modelPath.indexOf(":")), modelPath.slice(modelPath.indexOf(":") + 1)];
      const node = this.nodes[nodeName]!;
      if (rest.endsWith(" (memory)")) return { node, file: path.join(node.dataDir, this.bindings.map(rest.slice(0, -" (memory)".length))), kind: "dir" };
      return { node, file: path.join(node.dataDir, this.bindings.map(rest)), kind: rest.endsWith(".jsonl") ? "jsonl" : "json" };
    }
    async compareDisk(state: State, previous: Record<string, unknown>): Promise<string[]> {
      const diffs: string[] = [];
      for (const [modelPath, expected] of Object.entries(state.disk)) {
        const { file, kind } = this.serverPath(modelPath);
        if (kind === "dir") { if (!fs.existsSync(file)) diffs.push(`${modelPath}: the memory folder is missing (${file})`); continue; }
        if (!fs.existsSync(file)) { diffs.push(`${modelPath}: missing (${file})`); continue; }
        const text = await fsp.readFile(file, "utf8");
        let real: unknown;
        try { real = kind === "jsonl" ? text.split("\n").filter((l) => l.trim()).map((l) => JSON.parse(l)) : JSON.parse(text); }
        catch (error) { diffs.push(`${modelPath}: unreadable (${String(error)})`); continue; }
        if (modelPath.endsWith("_index.json") && Array.isArray(expected) && Array.isArray(real)) {
          // Run lists: one row per run, compared by its run ID (the order is the server's).
          const rows = real as Rec[];
          if (rows.length !== expected.length) diffs.push(`${modelPath}: expected ${expected.length} rows, got ${rows.length}: ${rows.map(rowKey).join(", ")}`);
          for (const row of expected as Rec[]) {
            const key = rowKey(row);
            const realKey = this.bindings.toReal.get(key);
            const match = rows.find((r) => rowKey(r) === realKey);
            if (!match) { diffs.push(`${modelPath}: no row for ${key} (${realKey})`); continue; }
            compare(this.bindings, row, match, `${modelPath}[${key}]`, diffs);
          }
          continue;
        }
        compare(this.bindings, expected, real, modelPath, diffs);
      }
      for (const modelPath of Object.keys(previous)) if (!(modelPath in state.disk)) {
        const { file } = this.serverPath(modelPath);
        if (fs.existsSync(file)) diffs.push(`${modelPath}: the contract removes it, but it exists (${file})`);
      }
      return diffs;
    }
    previousDisk: Record<string, unknown> = {};
    /** Waits for the server to reach the state (a woken receiver finishes its turn), then compares everything. */
    async settle(state: State): Promise<string[]> {
      let diffs: string[] = [];
      const deadline = Date.now() + 30_000;
      for (;;) {
        diffs = [];
        const snapshot = new Bindings(this.bindings.ids);
        for (const [k, v] of this.bindings.toReal) snapshot.bind(k, v);
        const trial = await this.compareWith(snapshot, state);
        if (!trial.length || Date.now() > deadline) {
          diffs = await this.compareWith(this.bindings, state);
          break;
        }
        await sleep(500);
      }
      // The call's result or refusal, and the header each receiver sees.
      // `update_task` returns `{ task: { taskId, …, status } }` (its tool contract, unchanged by autobyteus-461); the model writes
      // `{ taskId, status }`, and lists it only when it is the step's last result (a status change before a delivery is not a result).
      const modelHasTaskResult = state.results.some((r) => "taskId" in r && !("accepted" in r) && !("delegated" in r));
      const real = this.results.flatMap((r) => r.__tool !== "update_task" ? [r]
        : modelHasTaskResult ? [{ taskId: (r.task as Rec | undefined)?.taskId, status: (r.task as Rec | undefined)?.status }] : [])
        .map(({ __tool: _t, ...rest }) => rest);
      if (state.results.length !== real.length) diffs.push(`results: expected ${state.results.length}, got ${real.length}: ${JSON.stringify(real)}`);
      state.results.forEach((expected, index) => {
        const got = real[index]; if (!got) return;
        const { isError: _e, ...rest } = got;
        // The comparison binds and maps the model's IDs itself; a pre-mapped value could be read as another story's model ID.
        compare(this.bindings, expected, rest, `result[${index}]`, diffs);
      });
      if (state.refused) {
        const got = this.refusals.at(-1);
        const text = JSON.stringify(got ?? {});
        if (!got) diffs.push(`refusal: expected ${state.refused.code ?? JSON.stringify(state.refused.message)}, the call was accepted`);
        else {
          // A refusal without a code is a mutation's `{ success, message }` (SR-077): its text alone is compared.
          if (state.refused.code && !text.includes(state.refused.code)) diffs.push(`refusal: expected code ${state.refused.code}, got ${text.slice(0, 400)}`);
          const message = this.bindings.map(state.refused.message);
          const pieces = message.split(ELLIPSIS).filter((p) => p.trim());
          if (!pieces.every((p) => text.includes(JSON.stringify(p).slice(1, -1)) || text.includes(p))) diffs.push(`refusal: expected the text ${JSON.stringify(message)}, got ${text.slice(0, 600)}`);
        }
      }
      for (const header of state.receiverSees) {
        const mapped = this.bindings.map(header);
        const receiver = /sender run id "([^"]+)"/.exec(header);
        const found = await this.receiverSaw(mapped);
        if (!found) diffs.push(`receiver header not found: ${mapped}${receiver ? "" : ""}`);
      }
      this.previousDisk = state.disk;
      return diffs;
    }
    private async compareWith(bindings: Bindings, state: State): Promise<string[]> {
      const saved = (this as any).bindings; (this as any).bindings = bindings;
      try { return await this.compareDisk(state, this.previousDisk); } finally { (this as any).bindings = saved; }
    }
    /** A header text in any agent's conversation the story knows (the receiver's input). */
    async receiverSaw(text: string): Promise<boolean> {
      const deadline = Date.now() + 20_000;
      while (Date.now() < deadline) {
        // Every agent of every run file of the model's state (a run that never delegated is in no tree).
        const agents = new Set<string>();
        for (const [modelPath] of Object.entries(this.state.disk)) {
          if (!/\/(run_metadata|team_run_execution_tree|agent_org_run_execution_tree)\.json$/.test(modelPath)) continue;
          const runId = modelPath.split("/").at(-2)!;
          for (const agent of this.entryFromDisk(runId)?.agents ?? []) agents.add(agent.agentRunId);
        }
        for (const agent of agents) {
          if (!this.bindings.toReal.has(agent)) continue;
          const conversation = JSON.stringify(await this.conversation(agent).catch(() => null) ?? "");
          if (conversation.includes(JSON.stringify(text).slice(1, -1))) return true;
        }
        await sleep(500);
      }
      return false;
    }
  }

  // ---- definitions and Tasks ---------------------------------------------------------------------------------------------
  const agentDef = async (ctx: Ctx, node: string, modelId: string, name: string, toolNames: string[] = [], defaultLaunchConfig: Rec | null = null) => {
    const id = (await ctx.nodes[node]!.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: name, instructions: "Follow the request.", toolNames, ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id as string;
    if (node === "A") { const p = ctx.bindings.bind(modelId, id); if (p) throw new Error(p); }
    return id;
  };
  const teamDef = async (ctx: Ctx, node: string, modelId: string, name: string, members: Array<[string, string]>, coordinator: string,
    handoffs: Array<[string, string, string]> = [], defaultLaunchConfig: Rec | null = null) => {
    const id = (await ctx.nodes[node]!.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name, description: name, instructions: "Work as a team.", coordinatorMemberName: coordinator,
        nodes: members.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })),
        handoffs: handoffs.map(([from, to, rule]) => ({ from, to, rules: [rule] })), ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentTeamDefinition.id as string;
    if (node === "A") { const p = ctx.bindings.bind(modelId, id); if (p) throw new Error(p); }
    return id;
  };
  const PROJECT_TOOLS = ["list_projects", "list_project_tasks", "create_project", "update_project", "create_task", "update_task"];
  const CATALOG_AGENTS: Array<[string, string]> = [["project-task-manager", "Project Task Manager"], ["image-maker", "Image Maker"], ["research-agent", "Research Agent"],
    ["upscaler", "Upscaler"], ["release-agent", "Release Agent"], ["solution-designer", "Solution Designer"], ["architecture-reviewer", "Architecture Reviewer"],
    ["implementation-engineer", "Implementation Engineer"], ["code-reviewer", "Code Reviewer"], ["product-designer", "Product Designer"], ["prototyper", "Prototyper"],
    ["lead", "Lead"], ["analyst", "Analyst"], ["student", "Student"], ["tutor", "Tutor"], ["ceo-agent", "CEO Agent"], ["cto", "CTO"], ["Teacher", "Teacher"],
    ["dev-lead", "Dev Lead"], ["qa", "QA"]];
  /** The model's catalog on node A (stories.py `catalog()`): every agent, team and the org. */
  const catalog = async (ctx: Ctx) => {
    const defs: Record<string, string> = {};
    for (const fileAuthored of ["student", "tutor", "Teacher"]) { defs[fileAuthored] = fileAuthored; ctx.bindings.bind(fileAuthored, fileAuthored); }
    // Every catalog agent has a default launch (stories.py: a delegated agent launches from `agent_default`).
    for (const [modelId, name] of CATALOG_AGENTS.filter(([id]) => !(id in defs))) defs[modelId] = await agentDef(ctx, "A", modelId, name,
      ["project-task-manager", "ceo-agent", "solution-designer"].includes(modelId) ? PROJECT_TOOLS : [], DEFAULT_LAUNCH);
    const member = (id: string) => [id.replace(/-/g, "_"), defs[id]!] as [string, string];
    defs["software-engineering-team"] = await teamDef(ctx, "A", "software-engineering-team", "Software Engineering Team",
      ["solution-designer", "architecture-reviewer", "implementation-engineer", "code-reviewer"].map(member), "solution_designer",
      [["/solution_designer", "/architecture_reviewer", "When the design is ready for review …"], ["/architecture_reviewer", "/implementation_engineer", "When the review passes …"],
        ["/implementation_engineer", "/code_reviewer", "When the implementation is ready for review …"]]);
    defs["product-team"] = await teamDef(ctx, "A", "product-team", "Product Team", ["product-designer", "prototyper"].map(member), "product_designer");
    defs["research-team"] = await teamDef(ctx, "A", "research-team", "Research Team", ["lead", "analyst"].map(member), "lead");
    defs["dev-team"] = await teamDef(ctx, "A", "dev-team", "Dev Team", ["dev-lead", "qa"].map(member), "dev_lead");
    const org = (await ctx.nodes.A!.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: "Company Org", description: "Company Org", instructions: "Organize.", handoffs: [{ from: "/dev_team/dev_lead", to: "/ceo_agent", rules: ["When the release is ready …"] }],
        members: [{ memberName: "ceo_agent", ref: defs["ceo-agent"], refType: "AGENT", refScope: "SHARED" }, { memberName: "cto", ref: defs.cto, refType: "AGENT", refScope: "SHARED" },
          { memberName: "Teacher", ref: defs.Teacher, refType: "AGENT", refScope: "SHARED" }, { memberName: "dev_team", ref: defs["dev-team"], refType: "AGENT_TEAM", refScope: "SHARED" }] } })).createAgentOrgDefinition.id as string;
    const p = ctx.bindings.bind("company-org", org); if (p) throw new Error(p);
    defs["company-org"] = org;
    return defs;
  };
  const DEFAULT_LAUNCH = { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: { temperature: 0 } };
  const config = (ctx: Ctx) => ({ workspaceRootPath: ctx.workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  /** The model's project and its Tasks, created in the model's order (each Task's ID and key bound to the server's). */
  const projectWithTasks = async (ctx: Ctx, modelProject: string, tasks: Array<[string, string, string, string]>) => {
    ctx.workspace = path.join(ctx.nodes.A!.dataDir, "workspace");
    ctx.bindings.bind("/Users/me/projects/x", ctx.workspace);
    const projectId = (await ctx.nodes.A!.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "Demo" } })).createProject.projectId as string;
    ctx.bindings.bind(modelProject, projectId);
    for (const [modelTask, modelKey, title, status] of tasks) {
      const created = (await ctx.nodes.A!.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId taskKey}}`,
        { input: { projectId, title, description: "…" } })).createProjectTask;
      ctx.bindings.bind(modelTask, created.taskId); ctx.bindings.bind(modelKey, created.taskKey);
      if (status !== "TODO") ctx.startedTasks.push([modelKey, status]);
    }
    return projectId;
  };
  /** The model's Tasks start in their status: an agent of the run sets it with its own `update_task` (GraphQL sets no status). */
  const startTasks = async (ctx: Ctx, agentModelId: string) => {
    for (const [modelKey, status] of ctx.startedTasks.splice(0)) {
      const r = await ctx.call(agentModelId, "update_task", { task_id: ctx.real(modelKey), status }, false);
      expect(r.isError, JSON.stringify(r)).toBeFalsy();
    }
  };
  const key = (ctx: Ctx, modelKey: string) => ctx.real(modelKey);

  // ---- §5.1: the Project Task Manager (M) with a peer node ---------------------------------------------------------------
  it("§5.1 S0 … S27: a standalone agent delegates on its node and to a peer node", async () => {
    const story = FIXTURE.stories.find((s) => s.section === "5.1")!;
    const M = "project_task_manager_7c8d", SD = "solution_designer_65a9", E = "software_engineering_team_0218", P_PD = "product_designer_1a2b";
    await runStory(story, {
      S0: async (ctx) => {
        const projectId = await projectWithTasks(ctx, "project_8f21", [["project_task_440e", "demo-1", "Build the export feature", "IN_PROGRESS"],
          ["project_task_2b2b", "demo-2", "Research competitors", "TODO"], ["project_task_6a6a", "demo-6", "Fix the import bug", "TODO"], ["project_task_7c7c", "demo-7", "Market study", "TODO"]]);
        const created = (await ctx.nodes.A!.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
          { input: { agentDefinitionId: ctx.real("project-task-manager"), projectId, ...config(ctx) } })).createAgentRun;
        expect(created.success, created.message).toBe(true);
        await ctx.bindRun(M, created.runId);
        await startTasks(ctx, M);
      },
      S1: async (ctx) => { const r = await ctx.call(M, "delegate_task", { recipient_address: "/software_engineering_team", task_id: key(ctx, "demo-1") }); await ctx.bindRun(E, r.target_team_run_id as string); },
      S2: async (ctx) => {
        const rules = await ctx.call(SD, "get_handoff_rules", {});
        expect(JSON.stringify(rules)).toContain("/architecture_reviewer");
        await ctx.call(SD, "send_message_to", { recipient_address: "/architecture_reviewer", content: "Design ready for review …" });
      },
      S3: async (ctx) => { await ctx.call(SD, "send_message_to", { recipient_address: "/project_task_manager", content: "Design approved by the reviewer …" }); },
      S4: async (ctx) => { await ctx.call(M, "send_message_to", { target_agent_run_id: ctx.real(SD), content: "Go ahead …" }); },
      S5: async (ctx) => { const r = await ctx.call(SD, "delegate_task", { recipient_address: "/product_team", description: "Prototype the export screen …" }); await ctx.bindRun("product_team_e03d", r.target_team_run_id as string); },
      S6: async (ctx) => { const r = await ctx.call(SD, "delegate_task", { recipient_address: "/image_maker", description: "Draw the export icon …" }); await ctx.bindRun("image_maker_33f0", r.target_agent_run_id as string); },
      S7: async (ctx) => {
        await ctx.call(P_PD, "send_message_to", { recipient_address: "/project_task_manager", content: "Prototype ready …" });
        await ctx.call(P_PD, "send_message_to", { target_agent_run_id: ctx.real(SD), content: "See the prototype …" });
        await ctx.call(M, "send_message_to", { target_agent_run_id: ctx.real(P_PD), content: "Looks good …" });
      },
      S8: async (ctx) => {
        const r = (await ctx.nodes.A!.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: ctx.real(E) })).terminateAgentTeamRun;
        expect(r.success, r.message).toBe(true);
      },
      S9: async (ctx) => { await ctx.call(P_PD, "send_message_to", { target_agent_run_id: ctx.real(SD), content: "One more question …" }); },
      S10: async (ctx) => {
        await ctx.call(M, "update_task", { task_id: key(ctx, "demo-1"), status: "DONE" });
        // SR-072 F-23 / SR-073: the assigner's message while the Task is DONE is refused (R-8), with base's Task-side text.
        const refused = await ctx.call(M, "send_message_to", { target_agent_run_id: ctx.real(SD), content: "Are you done?" });
        expect(refused, JSON.stringify(refused)).toMatchObject({ accepted: false });
        expect(String(refused.message)).toContain("The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run id again.");
      },
      S11: async (ctx) => {
        await ctx.call(M, "update_task", { task_id: key(ctx, "demo-1"), status: "IN_PROGRESS" });
        await ctx.call(M, "send_message_to", { target_agent_run_id: ctx.real(SD), content: "One more change …" });
      },
      S12: async (ctx) => { await ctx.call(M, "delegate_task", { target_team_run_id: ctx.real(E), task_id: key(ctx, "demo-6") }); },
      S13: async (ctx) => { const r = await ctx.call(SD, "delegate_task", { recipient_address: "/upscaler", description: "Upscale the import screenshots …" }); await ctx.bindRun("upscaler_e1a1", r.target_agent_run_id as string); },
      S14: async (ctx) => { await ctx.call(M, "update_task", { task_id: key(ctx, "demo-6"), status: "DONE" }); },
      S15: async (ctx) => { const r = await ctx.call(SD, "delegate_task", { recipient_address: "/image_maker", description: "Draw the import icon …" }); await ctx.bindRun("image_maker_88e8", r.target_agent_run_id as string); },
      S16: async (ctx) => {
        expect((await ctx.nodes.A!.gql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`,
          { input: { projectId: ctx.real("project_8f21"), taskId: ctx.real("project_task_440e") } })).deleteProjectTask).toBe(true);
      },
      S17: async (ctx) => {
        // To a peer by description only (REQ-009, SR-054): the work gets a Task with no Project on node A.
        const r = await ctx.call(M, "delegate_task", { recipient_address: "/research_team", node: "node-b", description: "Market study …" });
        const problem = ctx.bindings.bind("adhoc_task_7c7c", r.task_id as string); if (problem) throw new Error(problem);
        await ctx.bindRun("research_team_77aa", r.target_team_run_id as string, "B");
        // The peer row (SR-084): M's tree, built by node A, has node B's research team under M with its node and members.
        // Its statuses are its own (SR-082, SR-083): M's run-status answer carries none of them; the peer run's own, through
        // its handle on node A, lists its agents.
        const tree = (await ctx.nodes.A!.gql(`query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}`, { k: "agent", r: ctx.real(M) })).runTree as { rows: Rec[] };
        const peer = tree.rows.find((row) => row.kind === "peer_team" && row.openTarget?.runId === r.target_team_run_id);
        expect(peer, `M's tree rows: ${JSON.stringify(tree?.rows ?? null).slice(0, 1500)}`).toBeTruthy();
        expect(peer, JSON.stringify(peer)).toMatchObject({ peer: { nodeId: ctx.nodes.B!.nodeId }, openTarget: { nodeId: ctx.nodes.B!.nodeId } });
        expect(tree.rows.find((row) => row.key === peer!.parentKey)?.openTarget?.agentRunId, "the peer row hangs under M").toBe(ctx.real(M));
        const peerAgents = new Set(tree.rows.filter((row) => row.parentKey === peer!.key).map((member) => member.openTarget?.agentRunId as string));
        expect(peerAgents.size, "its members are rows under it").toBeGreaterThan(0);
        const statusSocket = new WebSocket(`${ctx.nodes.A!.url.replace(/^http/, "ws")}/ws/run-status`);
        ctx.nodes.A!.sockets.push(statusSocket);
        const statusFrames: Rec[] = [];
        statusSocket.on("message", (raw) => statusFrames.push(JSON.parse(String(raw))));
        await new Promise<void>((resolve, reject) => { statusSocket.once("open", () => resolve()); statusSocket.once("error", reject); });
        const snapshotOf = async (kind: string, runId: string) => {
          statusSocket.send(JSON.stringify({ type: "SUBSCRIBE", payload: { runs: [{ kind, runId }] } }));
          const deadline = Date.now() + 30_000;
          let run: Rec | undefined;
          while (!(run = statusFrames.filter((f) => f.type === "RUN_STATUS_SNAPSHOT").flatMap((f) => f.payload.runs as Rec[]).find((r) => r.runId === runId)) && Date.now() < deadline) await sleep(50);
          expect(run, `run-status snapshot of ${runId}: ${JSON.stringify(statusFrames).slice(0, 800)}`).toBeTruthy();
          return run!;
        };
        const mOwn = await snapshotOf("agent", ctx.real(M));
        expect(((mOwn.agents ?? []) as Rec[]).filter((agent) => peerAgents.has(agent.agentRunId)), "M's answer carries no peer status").toEqual([]);
        const peerOwn = await snapshotOf("agent_team", r.target_team_run_id as string);
        expect(((peerOwn.agents ?? []) as Rec[]).map((agent) => agent.agentRunId).sort(), "the peer run's own answer lists its agents").toEqual([...peerAgents].sort());
        statusSocket.close();
      },
      // autobyteus-587 RF-14: a message to a run on another node always names the node (here B's name for A, "node-a").
      S18: async (ctx) => { await ctx.call("lead_0c11", "send_message_to", { node: "node-a", target_agent_run_id: ctx.real(M), content: "Findings …" }); },
      S19: async (ctx) => {
        await ctx.call(M, "update_task", { task_id: ctx.real("adhoc_task_7c7c"), status: "DONE" });
        await ctx.call("lead_0c11", "send_message_to", { node: "node-a", target_agent_run_id: ctx.real(M), content: "More findings …" });
      },
      S20: async (ctx) => {
        const r = await ctx.call(M, "delegate_task", { recipient_address: "/research_agent", task_id: key(ctx, "demo-2") });
        await ctx.bindRun("research_agent_9b10", r.target_agent_run_id as string);
        await ctx.call("research_agent_9b10", "send_message_to", { target_agent_run_id: ctx.real(SD), content: "…" });
      },
      S21: async (ctx) => { await ctx.call(M, "send_message_to", { recipient_address: "/project_task_manager", content: "…" }); },
      S22: async (ctx) => { await ctx.call(M, "send_message_to", { recipient_address: "/software_engineering_team", content: "…" }); },
      // S23, S24: E's Tasks are all closed after S16, so DS-15 fences user input to E; the agent's own call is made directly.
      S23: async (ctx) => { await ctx.call(SD, "delegate_task", { recipient_address: "/research_agent", task_id: key(ctx, "demo-2") }); },
      S24: async (ctx) => { await ctx.call(SD, "send_message_to", { recipient_address: "/software_engineering_team/code_reviewer", content: "…" }); },
      // autobyteus-587 DEC-009: a saved Task goes to a new copy on another node; node B's user then stops that team there.
      S25: async (ctx) => {
        const r = await ctx.call(M, "delegate_task", { recipient_address: "/research_team", node: "node-b", task_id: key(ctx, "demo-7") });
        await ctx.bindRun("research_team_5c5c", r.target_team_run_id as string, "B");
        const stopped = (await ctx.nodes.B!.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: r.target_team_run_id })).terminateAgentTeamRun;
        expect(stopped.success, stopped.message).toBe(true);
      },
      // SR-067 (DS-13): the user deletes M while a run it delegated to works: refused, naming it; nothing is written.
      S26: async (ctx) => {
        // The user stops M first (a running run's history is not deleted: "Run is active. Terminate it before deleting history.").
        await ctx.nodes.A!.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: ctx.real(M) });
        const r = (await ctx.nodes.A!.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: ctx.real(M) })).deleteStoredRun;
        expect(r.success, r.message).toBe(false);
        // The refusal is this step's result (a GraphQL mutation, not a tool call): the harness compares its text with the model's.
        ctx.refusals.push(r);
        // Contract T-5: "its reason names them": by the address it was delegated to, or its run ID.
        expect(String(r.message), String(r.message)).toMatch(new RegExp(`${ctx.real("research_agent_9b10")}|/research_agent\\b`));
      },
      // The user stops the research agent and deletes M; the research agent's report to M is refused (no run has M's ID).
      S27: async (ctx) => {
        const stopped = (await ctx.nodes.A!.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: ctx.real("research_agent_9b10") })).terminateAgentRun;
        expect(stopped.success, stopped.message).toBe(true);
        await ctx.nodes.A!.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: ctx.real(M) });
        const deleted = (await ctx.nodes.A!.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: ctx.real(M) })).deleteStoredRun;
        expect(deleted.success, deleted.message).toBe(true);
        await ctx.call("research_agent_9b10", "send_message_to", { target_agent_run_id: ctx.real(M), content: "Findings …" });
      },
    }, async (ctx) => {
      await catalog(ctx);
      // Node B: the research team with a default launch (a peer target needs one), shared with node A; the nodes paired.
      const B = ctx.nodes.B!;
      const agy = { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: null };
      const lead = await agentDef(ctx, "B", "lead@B", "Lead", [], agy);
      const analyst = await agentDef(ctx, "B", "analyst@B", "Analyst", [], agy);
      await teamDef(ctx, "B", "research-team@B", "Research Team", [["lead", lead], ["analyst", analyst]], "lead", [], agy);
      for (const node of [ctx.nodes.A!, B]) await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
      await pairNodes({ inviter: (q, v) => B.gql(q, v), accepter: (q, v) => ctx.nodes.A!.gql(q, v), inviterName: "node-b", accepterName: "node-a" });
      for (const [name, node] of Object.entries(ctx.nodes)) {
        const status = await (await fetch(`${node.url}/rest/remote-access/status`)).json().catch(() => ({})) as Rec;
        node.nodeId = (status.nodeId as string) ?? node.nodeId;
        if (node.nodeId) ctx.bindings.bind(story.nodeIds[name]!, node.nodeId);
      }
    });
  }, 1_200_000);

  // ---- §5.2: the Software Engineering Team on its own (U) ----------------------------------------------------------------
  it("§5.2 U0 … U11: a team the user starts delegates", async () => {
    const story = FIXTURE.stories.find((s) => s.section === "5.2")!;
    const U = "software_engineering_team_73d7", U_SD = "solution_designer_7a33", IM = "image_maker_44a1";
    await runStory(story, {
      U0: async (ctx) => {
        await projectWithTasks(ctx, "project_8f21", [["project_task_3c3c", "demo-3", "Design the onboarding", "IN_PROGRESS"],
          ["project_task_8d8d", "demo-8", "Polish the onboarding", "TODO"]]);
        const members = ["solution-designer", "architecture-reviewer", "implementation-engineer", "code-reviewer"];
        const created = (await ctx.nodes.A!.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
          { input: { teamDefinitionId: ctx.real("software-engineering-team"), teamConfigs: [{ teamAddress: "/", ...config(ctx) }],
            memberConfigs: members.map((m) => ({ memberAddress: `/${m.replace(/-/g, "_")}`, agentDefinitionId: ctx.real(m), ...config(ctx) })) } })).createAgentTeamRun;
        expect(created.success, created.message).toBe(true);
        await ctx.bindRun(U, created.teamRunId);
        await startTasks(ctx, U_SD);
      },
      U1: async (ctx) => {
        expect(JSON.stringify(await ctx.call(U_SD, "get_handoff_rules", {}))).toContain("/architecture_reviewer");
        await ctx.call(U_SD, "send_message_to", { recipient_address: "/architecture_reviewer", message_type: "architecture_review_request", content: "Please review …" });
      },
      U2: async (ctx) => { await ctx.call("architecture_reviewer_cd34", "send_message_to", { target_agent_run_id: ctx.real("implementation_engineer_864a"), content: "Approved, please implement …" }); },
      U3: async (ctx) => { const r = await ctx.call(U_SD, "delegate_task", { recipient_address: "/image_maker", task_id: key(ctx, "demo-3") }); await ctx.bindRun(IM, r.target_agent_run_id as string); },
      U4: async (ctx) => { await ctx.call(IM, "send_message_to", { recipient_address: "/solution_designer", content: "Mockups ready …" }); },
      U5: async (ctx) => { const r = await ctx.call(IM, "delegate_task", { recipient_address: "/upscaler", description: "Upscale the mockups …" }); await ctx.bindRun("upscaler_55b2", r.target_agent_run_id as string); },
      U6: async (ctx) => { await ctx.call(U_SD, "delegate_task", { recipient_address: "/architecture_reviewer", description: "…" }); },
      U7: async (ctx) => { await ctx.call(U_SD, "delegate_task", { recipient_address: "/software_engineering_team", description: "Review our process …" }); },
      U8: async (ctx) => {
        const r = await ctx.call(U_SD, "delegate_task", { recipient_address: "/research_agent", description: "Collect onboarding examples …" });
        await ctx.bindRun("research_agent_8f80", r.target_agent_run_id as string);
        if (typeof r.task_id === "string") ctx.bindings.bind("adhoc_task_91a1", r.task_id);
      },
      // SR-071: R-7, runs of different open Tasks.
      U9: async (ctx) => { await ctx.call("research_agent_8f80", "send_message_to", { target_agent_run_id: ctx.real(IM), content: "…" }); },
      // SR-071: R-12, a team run's ID is answered with its coordinator's.
      U10: async (ctx) => { await ctx.call(IM, "send_message_to", { target_agent_run_id: ctx.real(U), content: "Mockups ready …" }); },
      // U11 (SR-072 F-24, REQ-009): T3 deleted; its run takes a new Task by run ID from the delegator its own delegatedFrom names.
      U11: async (ctx) => {
        expect((await ctx.nodes.A!.gql(`mutation($input:DeleteProjectTaskInput!){deleteProjectTask(input:$input)}`,
          { input: { projectId: ctx.real("project_8f21"), taskId: ctx.real("project_task_3c3c") } })).deleteProjectTask).toBe(true);
        const r = await ctx.call(U_SD, "delegate_task", { target_agent_run_id: ctx.real(IM), task_id: key(ctx, "demo-8") });
        expect(r, JSON.stringify(r)).toMatchObject({ delegated: true, target_kind: "agent", target_agent_run_id: ctx.real(IM) });
      },
    }, async (ctx) => { await catalog(ctx); });
  }, 900_000);

  // ---- §5.3: the org (O) ----------------------------------------------------------------------------------------------------
  it("§5.3 O0 … O9: an org the user starts delegates", async () => {
    const story = FIXTURE.stories.find((s) => s.section === "5.3")!;
    const O = "company_org_9d00", CEO = "ceo_agent_1f2e", DL = "dev_lead_4c3d", COPY = "dev_team_9a9a", COPY_DL = "dev_lead_9a01";
    await runStory(story, {
      O0: async (ctx) => {
        await projectWithTasks(ctx, "project_8f21", [["project_task_4d4d", "demo-4", "Run the study program", "IN_PROGRESS"], ["project_task_5e5e", "demo-5", "Prepare the release notes", "IN_PROGRESS"]]);
        const created = (await ctx.nodes.A!.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
          { input: { agentOrgDefinitionId: ctx.real("company-org"), rootConfiguration: config(ctx), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
        expect(created.success, created.message).toBe(true);
        await ctx.bindRun(O, created.agentOrgRunId);
        const tree = JSON.parse(await fsp.readFile(path.join(ctx.nodes.A!.dataDir, "memory", "agent_orgs", created.agentOrgRunId, "agent_org_run_execution_tree.json"), "utf8")) as Rec;
        const mounted = (tree.rootOrg.members as Rec[]).find((m) => m.address === "/dev_team");
        if (mounted?.teamRunId) ctx.bindings.bind("dev_team_6b70", mounted.teamRunId as string);
        await startTasks(ctx, CEO);
      },
      O1: async (ctx) => { await ctx.call(CEO, "send_message_to", { recipient_address: "/cto", content: "Plan the quarter …" }); },
      O2: async (ctx) => { await ctx.call(CEO, "send_message_to", { recipient_address: "/dev_team", content: "Ship the fix …" }); },
      O3: async (ctx) => { await ctx.call(DL, "send_message_to", { recipient_address: "/dev_team/qa", content: "Please test …" }); },
      O4: async (ctx) => { await ctx.call(DL, "send_message_to", { recipient_address: "/dev_team/designer", content: "…" }); },
      // A copy of the org's own mounted team: a team run of its own carrying the org's handoff `/dev_lead` → `/ceo_agent` (SR-054).
      O5: async (ctx) => { const r = await ctx.call(CEO, "delegate_task", { recipient_address: "/dev_team", task_id: key(ctx, "demo-4") }); await ctx.bindRun(COPY, r.target_team_run_id as string); },
      O6: async (ctx) => {
        const rules = await ctx.call(COPY_DL, "get_handoff_rules", {}, false);
        expect(rules, "the copy's handoff names the org's CEO agent, an external target").toMatchObject({ handoffs: [{ when: "When the release is ready …", recipient_address: "/ceo_agent" }] });
        await ctx.call(COPY_DL, "send_message_to", { recipient_address: "/ceo_agent", content: "The release is ready …" });
      },
      O7: async (ctx) => { await ctx.call(COPY_DL, "send_message_to", { recipient_address: "/Teacher", content: "Need a review …" }); },
      O8: async (ctx) => { const r = await ctx.call(DL, "delegate_task", { recipient_address: "/release_agent", task_id: key(ctx, "demo-5") }); await ctx.bindRun("release_agent_66c3", r.target_agent_run_id as string); },
      // O9 (461 SR-081, CR-461-081): the copy's lead names its teammate under the team's old name; corrected to the copy's own
      // address, never the org's own mounted member. The model gained O9 before the fixture was last regenerated (autobyteus-492).
      O9: async (ctx) => { await ctx.call(COPY_DL, "send_message_to", { recipient_address: "/dev_team/qa", content: "Please test …" }); },
    }, async (ctx) => { await catalog(ctx); });
  }, 900_000);
});
