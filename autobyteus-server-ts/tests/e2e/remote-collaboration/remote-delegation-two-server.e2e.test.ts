import fs from "node:fs";
import fsp from "node:fs/promises";
import http from "node:http";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { execFile, spawn, spawnSync, type ChildProcessWithoutNullStreams } from "node:child_process";
import { promisify } from "node:util";
import WebSocket from "ws";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { buildE2eClientCommandIds } from "../helpers/websocket-command-helpers.js";
import { signPeerRequest } from "../../../src/remote-collaboration/channel/peer-request-signature.js";
import { builtServerLaunchEnvironment } from "../helpers/built-server-launch-credential.js";
import { pairNodes } from "../helpers/pair-nodes.js";
import { LIST_RUNNING_AGENTS_TOOL_DESCRIPTION } from "../../../src/agent-tools/agent-discovery/list-running-agents-contract.js";
import { SEND_MESSAGE_TO_LLM_DESCRIPTION, SEND_MESSAGE_TO_NODE_DESCRIPTION, targetAgentNotRunningText }
  from "../../../src/agent-collaboration/domain/agent-team-collaboration-llm-contract.js";

/**
 * Remote collaboration (autobyteus-191 slice 1: remote delegation, text only; autobyteus-245: no publishing;
 * autobyteus-247: remote Agent Teams; autobyteus-261: discovery) between two real server processes.
 *
 * Node "alpha" (A, the delegating node) and node "beta" (B, the receiving node) are two built servers
 * (`dist/app.js`) with their own data roots, ports and HOMEs. Each node reaches the other through a capturing HTTP
 * proxy (its registered peer URL), so every request between the nodes is recorded (AC-111) and the test can
 * partition, stop or retarget the link (QR-102, AC-102). Runtimes are the scripted AGY CLI
 * (tests/fixtures/agy-failure-cli.mjs, `linked_skills`): a message containing `CALL_TOOL:{…}` makes that agent call
 * the actual agent tool and reply `CALLED:<result>`; anything else is answered `OK`. No provider inference.
 * Every action enters through a real surface: GraphQL settings (the Nodes tab's API), the composer WebSocket of a
 * run (the owner's message), and the agents' own tool calls. The cases share the two nodes and run in order:
 *
 * - node settings and the gateway: RC-01 AC-101 off by default (inbound refused, no invite can be made); RC-03 switched
 *   on, AC-102 pairing with one invite (autobyteus-437 NAS-19) and pinned identities, bad URLs, gateway admission order
 *   for both request kinds, no publish API (245 AC-207, DEC-206); RC-20 AC-111 audit of every captured request, each
 *   signed for its receiver (437 NAS-20) (these three run on their own:
 *   `-t "RC-(01|03|20) "`);
 * - delegation and messages: RC-02 delegate_task with the switch off; RC-04 245 AC-202 … AC-204, AC-207: every refusal of
 *   beta's target resolution (no default, runtime only, runtime or model unavailable, the Model Router, Agent Org, team-local,
 *   unknown address, shared Team), nothing left on either node, a leftover `published-agents.json` ignored;
 *   RC-05 … RC-07 AC-104/105 both ways from a standalone, Team and Org delegator with the delegator's root view open
 *   (contiguous change sequences; RC-05 also 245 AC-201/AC-205: Publisher runs with its own default, beta's temp
 *   workspace and auto-approve on); RC-08 AC-107 unlinked senders; RC-09 AC-108 files and saved Tasks; RC-10/RC-11
 *   AC-109 Task closure; RC-12 AC-106 idle shutdown on B and restore; RC-13 restart of B, then of A (inbound restores
 *   every root kind); RC-14 history deleted; RC-15 QR-102 partition and stopped peer; RC-16 identity mismatch;
 *   team-run-follows-definition (autobyteus-22): RC-51 beta's peer-started Studio Team copy (copiedFrom team_definition) follows
 *   its Team definition when beta's owner adds a member and a rule and removes them again (AC-005).
 *   247: RC-21 a Team member on alpha delegates beta's shared Team "Studio Team" (AC-301); RC-22 messages with the
 *   coordinator and a never-started member, the team-run-ID guidance, not-permitted senders (AC-303); RC-23 Task closure
 *   of a remote Team (AC-305; since 591 it stops the Team on beta, below); RC-12/RC-13 also idle out and restore the Team and
 *   restart both nodes with it (AC-304), with a busy member (a background task) holding the whole Team past the grace and,
 *   after a second alpha restart, a cold wake of alpha's Team root by the Team link alone; RC-25 the work packet to a just-started
 *   Team fails (dropped by the proxy), leaving an unused Team run on beta that its idle schedule stops (RSK-301, DEC-304);
 *   RC-24 beta's owner stops the Team during its idle grace and the next message restores it (REQ-307);
 *   261 (discovery): RC-26 an agent that selects the discovery tools lists exactly beta's offer (only name, kind, address
 *   and description; the Daily Assistant offered like any shared Agent (455), the Model Router, Orgs, team-local and
 *   application-owned definitions left out), listing writes nothing,
 *   every listed address is accepted by delegate_task, an agent without the tools (or selecting only the former name
 *   list_available_nodes, 290) does not have them (its MCP tool list,
 *   `LIST_TOOLS` in the scripted CLI) and the tool texts are as approved (AC-402/404/406, QR-402); RC-27 the node list
 *   with three more servers (gamma stopped, delta switched off, epsilon not knowing alpha) in registration order, each
 *   reason the same as delegate_task's, and a black-holed beta unavailable within the 20 s bound (AC-401, QR-401);
 *   RC-28 alpha's switch off, an unknown node, a blank node, and the local list without node (AC-404, AC-407);
 *   RC-29 a Team added on beta between two listings appears in the second (AC-405); RC-04 and RC-19 read the new
 *   texts and beta's refusal `target {kind, name}` (AC-406, DEC-407); RC-20 also audits the two discovery routes;
 *   269 (a remote run's title): RC-05 and RC-21 read beta's history title of the peer-started Agent and Team run (the
 *   delegated description, before any owner message), RC-05 and RC-22 that messages don't replace it, RC-30 a long
 *   multi-line description (one line, at most 100 characters);
 *   267 (the Nodes page): RC-26, RC-27 and RC-16 also ask alpha's GraphQL `peerNodeOffer(nodeId)` as the page does: the
 *   same list as list_available_agents without addresses, and each peer's refusal code (stopped, off, not registered,
 *   black-holed within the bound, identity mismatch);
 *   RC-17 the owner changes Publisher's default: new delegations are refused with the reason, the running run keeps
 *   working; RC-18 switch off again; RC-19 peer removal.
 * 308: beta also has a file-authored internal agent (Hidden Helper, `"internal": true`): RC-26's exact offer leaves it out
 *   while beta hides it (the default); RC-38 shows it on beta (no restart), delegates it, and hides it again; the Model Router
 *   stays out and refused while beta shows internal agents (455 REQ-002).
 * 455: RC-42 beta's owner gives its Daily Assistant a runtime and model (a personal setting); alpha's agent lists it and
 *   delegates /daily_assistant on beta: it starts in beta's temp workspace and reports back to alpha's delegator.
 * 492 (the run ID is the address; list_running_agents): RC-47 on alpha alone — the opt-in tool and its texts, the exact list
 *   of running roots a person started (Org, task agents, stopped roots and members left out), filters, two roots messaging each
 *   other by run ID (PRB-002), an Org agent and a task agent as senders, a stopped root and a never-started member refused and not
 *   woken, and run views (G-1, DEC-014): an unrelated message in no view live or after a reload (new snapshot, the Team tab's
 *   stored read), a Task-related one in its view; RC-48 alpha lists beta's running roots with node, picks beta's Project Task
 *   Manager by name and Project, messages it with node and gets its answer (both logs), and beta's stopped root, never-started
 *   member, unknown run ID and team run ID are refused; both new routes refused unsigned, with the owner's credential, with a
 *   wrong secret, unpaired, and meant for another node (QR-003); RC-49 rows 13/14 — a closed Task's run on beta is refused CLOSED to
 *   every sender of alpha with and without node; since 591 beta stops it, so beta's agent and a third node zeta's (paired with
 *   beta only) get the not-running refusal; RC-06/RC-22 a teammate of the delegator reaches the remote run unlinked (DS-006); RC-27/RC-28 the running
 *   list's refusals equal list_available_agents' (and its 20 s bound); RC-20 audits both new routes.
 * 565 (Messages of standalone runs): RC-05 form 5 (a linked remote run) and RC-48 form 6 (two Project Task Managers on two
 *   nodes) live in each run's own view once, with both parties (the other with this node's name for its node), and after a
 *   reload in the stored read with a `remote` counterpart (the chip); each line records `counterpart {address, nodeId}`;
 *   beta's Team view never shows a remote message (form 7). RC-47 form 4 (unrelated local runs) in each own view and own
 *   stored read (a task agent's own too), never in a Team view or an ancestor run's view. RC-50 pages: an own list and a Team
 *   member's list over 50 (50, then the rest, newest first, nothing twice), a live message during Load more, and older lines
 *   of the released shape (unlinked: run ID, no chip; linked: named from the Task entry). Every cross-node message carries
 *   `sender.address` and its accepted answer `receiverAddress` (RC-06, RC-20).
 * 587 (reference files between nodes, RFC-001): RC-56 a delegation to beta with an .mp4, a PDF and a PNG (status, then
 *   signed raw pieces of at most 8 MiB, then the start and the work packet naming the files): beta's task agent reads them
 *   read-only at `<its folder>/received_files/<sender run ID>/<name>`, bytes equal; its reply without node, then with the
 *   wrong node (a third node theta paired with beta), is refused (RF-14), with node it returns a file to alpha (each node's
 *   log names its own paths); a re-sent file is not uploaded again; a new version replaces the old at the same path; two
 *   unrelated runs exchange a file with node. RC-57 the piece route behind the gate (unsigned, wrong secret, a body other
 *   than the signed one, over 8 MiB), a signed piece whose file does not match its SHA-256, a message naming a file not
 *   held, a piece damaged in transit by the proxy, and the receiver's size limit (sender-side and a forged piece). RC-58 the
 *   link breaks mid-upload: the call names the file, nothing delivered, the next send resumes. RC-59 one copy for two runs;
 *   each history delete removes its run's copy; the bytes and a broken upload's partial file go at the next cleanup once a
 *   day untouched. Every cross-node message names its node (RF-14): RC-06/RC-08/RC-22 check the refusals without it.
 * 591 (a closed Task's remote run stops on its node): RC-10 a task agent's sub-work run and RC-11 (AC-001) an agent stop on
 *   beta within 30 s of DONE: no runtime process, beta's `closed-delegations.json` names it, alpha logs
 *   `TASK_PEER_NOTICE_CONFIRMED` (alpha runs at INFO) and owes nothing; beta's run list drops it; on alpha it leaves the
 *   delegator's tree, as a local closed run does; a later message on beta wakes it (REQ-004). RC-54 (AC-007, SR-010): a saved
 *   Task given with the run's ID wakes it ("open" first, then the work); its DONE stops it again and its Task page shows it
 *   offline; a reopen alone changes nothing on beta; another sender's message is refused and `delegate_task` with the same Task
 *   gets the local refusal; the assigner's message continues it ("open" first, listed, woken). RC-23: a saved Task given to the
 *   running remote Team; DONE on one Task while another is open sends nothing (AC-003); CANCELLED on the last with the
 *   coordinator mid-turn stops the whole Team (AC-002); RC-53 continues the Team through its coordinator; RC-55 a Team member's
 *   peer run stays while the Team follows its definition (a member joins, the member leaves; 22 DEC-008) and its Task's close
 *   still stops it. RC-09: a saved Task
 *   with files to an existing remote run is refused (its files are the Task's, not the sender's workspace's).
 *   RC-35: the state from a peer that did not start the run is refused (AC-005). RC-52 (AC-004): closes while beta is down are
 *   owed (marked, logged once) and delivered within 30 s of alpha seeing beta again, after alpha's restart and after beta's
 *   alone; a run whose entry is reopened before beta is back (another Task, or the assigner's message, which answers "… did not
 *   receive this message; send it again") goes as "open"; a Task's reopen alone still stops it; an older beta (404) keeps it
 *   owed. RC-20 audits the new route.
 * Beta's agents (245): the shared Agents Publisher (scripted AGY default), Blank Slate (no default), Half Set (runtime only),
 * Codex Writer (a Codex default; Codex is unavailable on beta) and Fragile (a model AGY does not offer); a shared Team, an
 * Agent Org, and a file-authored Team with the team-local Agent "Local Scout" (a complete default). Nothing is published.
 * Beta's shared Teams (247): Studio Team (lead = Publisher with its own default; checker = Checker with none, so the Team
 * default `alt-model` covers it), Hollow Team (no default anywhere) and Codex Team (a Team default on unavailable Codex).
 * Beta's scripted CLI offers a second model (`AGY_FAKE_EXTRA_MODELS=alt-model`).
 * 261: beta also has a file-authored shared Agent with no description (Plain Helper) and loads the Brief Studio sample
 * application (an application-owned Agent Team); alpha's Scout selects list_peer_nodes and list_available_agents.
 *
 * Prerequisites: a current build (`pnpm -C autobyteus-server-ts build`) and Brief Studio's importable package
 * (`pnpm -C autobyteus-server-ts test:integration:prepare`). About 5 minutes (RC-12 holds the Team with a 90 s background
 * task plus a 60 s idle grace, three 20 s bounds (two partitions and a black-holed node list), and restarts). `REMOTE_E2E_EVIDENCE_DIR` keeps a JSON receipt and both servers' logs.
 * Run (from the repository root, with a clean environment as TESTING.md asks for E2E folders):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" RUN_AGY_FAILURE_E2E=1 \
 *     ANTIGRAVITY_CLI_COMMAND="$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts --no-watch
 */

const serverRoot = path.resolve(import.meta.dirname, "../../..");
const appEntry = path.join(serverRoot, "dist", "app.js");
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const enabled = process.env.RUN_AGY_FAILURE_E2E === "1" && fs.existsSync(appEntry)
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const suite = enabled ? describe : describe.skip;

const GRACE_MS = 60_000;
const MODEL = "gemini-3.8-flash-low";
const LABEL = { alpha: "alpha-node", beta: "beta-node" } as const;
const PATHS = { runs: "/rest/remote/delegated-runs", messages: "/rest/remote/messages", status: "/rest/remote-access/status",
  availability: "/rest/remote/availability", availableAgents: "/rest/remote/available-agents",
  runSummaries: "/rest/remote/run-summaries", agentProjection: "/rest/remote/agent-projection", ownerCommands: "/rest/remote/owner-commands",
  runObservations: "/rest/remote/run-observations", agentStreamSnapshot: "/rest/remote/agent-stream-snapshot",
  // autobyteus-492: a message to a running agent by its run ID only, and the running runs a person started.
  runMessages: "/rest/remote/run-messages", runningAgents: "/rest/remote/running-agents",
  // autobyteus-587: files sent with a message or delegation (status; then raw signed pieces `PUT received-files/<sha256>?…`).
  receivedFilesStatus: "/rest/remote/received-files/status", receivedFiles: "/rest/remote/received-files",
  // autobyteus-591: a delegated run's state (closed, open) from its delegating node.
  runStates: "/rest/remote/delegated-run-states" } as const;
/** The Brief Studio sample application's importable package (`pnpm -C autobyteus-server-ts test:integration:prepare`):
 * beta loads it, so beta has an application-owned Agent Team that discovery must not list (261 AC-402). */
const BRIEF_STUDIO_PACKAGE = path.resolve(import.meta.dirname, "../../../../applications/brief-studio/dist/importable-package");
/** The agent-facing texts of autobyteus-261 (DEC-406), as an agent receives them over Agent Tools MCP. */
const TEXT_261 = {
  listPeerNodes: "List the peer nodes registered on this node, each with its name and status: available (it takes work from this node now) or unavailable. Use the name as node in list_available_agents and delegate_task; for an unavailable node, list_available_agents with that node says why. This read-only tool takes no arguments.",
  listAgents: "List the agents and agent teams you can work with, each with its name, kind (agent or agent_team), address and description (when it has one). With node, list what that peer node offers for delegation instead; use an address from that list as recipient_address in delegate_task with the same node. This tool is read-only.",
  listAgentsNode: "Optional: the name of a peer node registered on this node. Without it, this node's agents and agent teams are listed.",
  delegateNode: "Optional, only with recipient_address and description: the name of a peer node registered on this node. The new task agent then runs on that node, and recipient_address is the address of an agent or agent team on that node.",
  delegateNodeLine: "With node in mode (1), the task agent starts on that peer node, from the agent or agent team at recipient_address there;",
  unknownNode: (node: string) => `No peer node named "${node}" is registered on this node, so nothing was sent. Use a node name the user gave you; if you have list_peer_nodes, it lists them.`,
  notFound: (node: string, address: string) => `Node "${node}" has no Agent or Agent Team at ${address} that can be delegated to. If you have list_available_agents, call it with this node to see what it offers.`,
  blankNode: "node must be the name of a peer node registered on this node; leave it out to list this node's agents and agent teams.",
} as const;
const ISO_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
/** autobyteus-492 REQ-002: the fields a running-runs entry may have (every one but kind, name, the run IDs and state is optional; `node` only on the asking node). */
const RUNNING_AGENT_FIELDS = ["kind", "name", "address", "agent_run_id", "workspace", "state", "started_at", "project"];
const RUNNING_TEAM_FIELDS = ["kind", "name", "address", "team_run_id", "team_coordinator_agent_run_id", "workspace", "state", "started_at", "project"];
const CANARY = { alpha: `sk-canary-alpha-${randomUUID()}`, beta: `sk-canary-beta-${randomUUID()}` };

type Rec = Record<string, any>;
type Frame = { type: string; payload: Rec; at: number };
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));
const until = async (predicate: () => boolean | Promise<boolean>, label: string, ms = 60_000) => {
  const deadline = Date.now() + ms;
  while (Date.now() < deadline) { if (await predicate()) return; await wait(100); }
  throw new Error(`Timed out waiting for ${label}`);
};
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const objectsIn = (value: unknown): Rec[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Rec, ...Object.values(value).flatMap(objectsIn)];
};
const stringsOf = (value: unknown): string[] =>
  objectsIn(value).flatMap((record) => Object.values(record)).filter((entry): entry is string => typeof entry === "string");
const calledResults = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = stringsOf(entry).filter((value) => value.includes("CALLED:"));
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)] : [];
});
const toolResult = (called: string): Rec => {
  const raw = JSON.parse(called) as Rec;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return { ...raw.structuredContent, isError: raw.isError === true };
  const text = raw.content?.find?.((part: Rec) => part.type === "text")?.text;
  try { return { ...JSON.parse(text), isError: raw.isError === true }; } catch { return { text: text ?? called, isError: raw.isError === true }; }
};
/** The scripted CLI's `LIST_TOOLS` replies (`TOOLS:[…]`), one per conversation entry. */
const toolListsIn = (conversation: unknown): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = stringsOf(entry).filter((value) => value.startsWith("TOOLS:"));
  return strings.length ? [strings[0]!.slice("TOOLS:".length)] : [];
});
/** The text an agent reads in a tool result (a refusal's message, or the result's text). */
const textOf = (result: Rec): string => String(result.message ?? result.text ?? JSON.stringify(result));
/**
 * The same-node refusal for a run ID no running agent of the sender's node has (autobyteus-492 REQ-010/REQ-012: a stopped
 * agent is not woken; the agent may find run IDs with list_running_agents, and passes node for another node's agent).
 */
const notRunningRefusal = (runId: string) => `No running agent has the run id '${runId}', so the message was not sent. A stopped agent is not woken. Use an exact run id you were given: a sender run id (from a message or your new task), a run id delegate_task returned to you, or one list_running_agents lists. For an agent on another node, also pass node.`;
/** autobyteus-587 RF-14: a run on another node named without node (or the run is on another node than the one named). */
const nodeRequiredText = (node: string) => `This agent runs on node "${node}"; pass node: "${node}" with its run id.`;
const nodeMismatchText = (node: string, given: string) => `This agent runs on node "${node}", not "${given}"; pass node: "${node}".`;
/** autobyteus-492 row 8: the peer found no running agent with that run ID; A words it with its name for the node. */
const peerNotRunningRefusal = (runId: string, node: string) => `No running agent has the run id '${runId}' on node "${node}", so the message was not sent. A stopped agent is not woken. If you have list_running_agents, call it with node "${node}" to see what runs there.`;
const getFreePort = async (): Promise<number> => new Promise((resolve, reject) => {
  const server = net.createServer();
  server.once("error", reject);
  server.listen(0, "127.0.0.1", () => {
    const address = server.address();
    server.close(() => typeof address === "object" && address ? resolve(address.port) : reject(new Error("no port")));
  });
});
const execFileAsync = promisify(execFile);
/** Working directories of every live scripted AGY process (each agent's capsule; the path contains its run ID). */
const liveAgyCwds = async (): Promise<string[]> => {
  const pids = (await execFileAsync("pgrep", ["-f", "agy-failure-cli"]).catch(() => ({ stdout: "" }))).stdout.trim().split("\n").filter(Boolean);
  if (pids.length === 0) return [];
  const { stdout } = await execFileAsync("lsof", ["-a", "-d", "cwd", "-p", pids.join(","), "-Fn"])
    .catch((error: { stdout?: string }) => ({ stdout: error.stdout ?? "" }));
  return stdout.split("\n").filter((line) => line.startsWith("n")).map((line) => line.slice(1));
};
const processLive = async (runId: string) => (await liveAgyCwds()).some((cwd) => cwd.includes(runId));
const walkFiles = async (dir: string): Promise<string[]> => (await fsp.readdir(dir, { withFileTypes: true }).catch(() => []))
  .reduce<Promise<string[]>>(async (acc, entry) => {
    const full = path.join(dir, entry.name);
    return [...await acc, ...(entry.isDirectory() ? await walkFiles(full) : [full])];
  }, Promise.resolve([]));
const readJson = async (file: string): Promise<Rec> => JSON.parse(await fsp.readFile(file, "utf8")) as Rec;
const sortedKeys = (value: Rec) => Object.keys(value).sort();

/** One server process with its own data root, port and HOME; restartable on the same port and data. */
class NodeServer {
  child: ChildProcessWithoutNullStreams | null = null;
  nodeId = "";
  readonly logs: string[] = [];
  readonly dataDir: string; readonly home: string; readonly workspace: string; readonly argvLog: string; readonly logFile: string;
  constructor(readonly name: string, readonly root: string, readonly port: number, readonly extraEnv: NodeJS.ProcessEnv = {}) {
    this.dataDir = path.join(root, name, "data");
    this.home = path.join(root, name, "home");
    this.workspace = path.join(root, name, "workspace");
    this.argvLog = path.join(root, name, "agy-argv.jsonl");
    this.logFile = path.join(root, name, "server.log");
  }
  get baseUrl() { return `http://127.0.0.1:${this.port}`; }
  get memory() { return path.join(this.dataDir, "memory"); }
  async start(): Promise<void> {
    for (const dir of [this.dataDir, this.home, this.workspace]) await fsp.mkdir(dir, { recursive: true });
    const envFile = path.join(this.dataDir, ".env");
    if (!fs.existsSync(envFile)) {
      await fsp.writeFile(envFile, [`AUTOBYTEUS_SERVER_HOST=${this.baseUrl}`, "APP_ENV=test", "LOG_LEVEL=WARN", "HTTP_ACCESS_LOG_MODE=off",
        `AUTOBYTEUS_TASK_EXECUTION_IDLE_SHUTDOWN_GRACE_MS=${GRACE_MS}`, ""].join("\n"));
    }
    // A clean environment: only what the server and the scripted CLI need (no inherited app roots or keys).
    const env: NodeJS.ProcessEnv = { PATH: process.env.PATH, HOME: this.home, TMPDIR: process.env.TMPDIR ?? os.tmpdir(),
      ANTIGRAVITY_CLI_COMMAND: cli, AGY_FAKE_CASE: "linked_skills", AGY_FAKE_ARGV_LOG: this.argvLog,
      APP_ENV: "test", LOG_LEVEL: "WARN", HTTP_ACCESS_LOG_MODE: "off", AUTOBYTEUS_SERVER_HOST: this.baseUrl, ...this.extraEnv };
    const child = spawn(process.execPath, [appEntry, "--host", "127.0.0.1", "--port", String(this.port), "--data-dir", this.dataDir],
      { cwd: serverRoot, env: { ...env, ...builtServerLaunchEnvironment() }, stdio: ["ignore", "pipe", "pipe"] });
    const log = fs.createWriteStream(this.logFile, { flags: "a" });
    log.write(`--- start ${new Date().toISOString()} pid ${child.pid}\n`);
    const onData = (chunk: Buffer) => {
      log.write(chunk);
      for (const line of chunk.toString("utf8").split(/\r?\n/)) if (line.trim()) this.logs.push(line);
      while (this.logs.length > 400) this.logs.shift();
    };
    child.stdout.on("data", onData); child.stderr.on("data", onData);
    child.once("exit", () => log.end());
    this.child = child;
    const deadline = Date.now() + 90_000;
    for (;;) {
      if (child.exitCode !== null) throw new Error(`${this.name} exited during startup:\n${this.logs.join("\n")}`);
      const ok = await fetch(`${this.baseUrl}/rest/health`).then((response) => response.ok, () => false);
      if (ok) break;
      if (Date.now() > deadline) throw new Error(`${this.name} did not become healthy:\n${this.logs.join("\n")}`);
      await wait(300);
    }
    const status = await (await fetch(`${this.baseUrl}${PATHS.status}`)).json() as Rec;
    if (this.nodeId && status.nodeId !== this.nodeId) throw new Error(`${this.name} changed its identity on restart`);
    this.nodeId = status.nodeId as string;
  }
  async stop(): Promise<void> {
    const child = this.child;
    if (!child || child.exitCode !== null) return;
    const exited = new Promise<void>((resolve) => child.once("exit", () => resolve()));
    child.kill("SIGTERM");
    await Promise.race([exited, wait(15_000).then(() => { if (child.exitCode === null) child.kill("SIGKILL"); })]);
    await exited;
  }
  async gqlRaw(query: string, variables?: Rec): Promise<{ data?: Rec; errors?: Rec[] }> {
    const response = await fetch(`${this.baseUrl}/graphql`, { method: "POST", headers: { "content-type": "application/json" },
      body: JSON.stringify({ query, variables }) });
    return await response.json() as { data?: Rec; errors?: Rec[] };
  }
  async gql(query: string, variables?: Rec): Promise<Rec> {
    const body = await this.gqlRaw(query, variables);
    if (!body.data || body.errors?.length) throw new Error(`${this.name} GraphQL failed: ${JSON.stringify(body.errors ?? body)}`);
    return body.data;
  }
  /** autobyteus-437: the secret this node shares with a paired peer, from its peers.json (`null` when unpaired). */
  async peerSecretOf(nodeId: string): Promise<string | null> {
    const file = path.join(this.dataDir, "remote-collaboration", "peers.json");
    const peers = fs.existsSync(file) ? (JSON.parse(await fsp.readFile(file, "utf8")) as { peers: Rec[] }).peers : [];
    const peer = peers.find((row) => row.nodeId === nodeId);
    return typeof peer?.peerSecret === "string" ? peer.peerSecret : null;
  }
  /**
   * autobyteus-437: the headers of a request to this node as the node `fromNodeId` sends it: signed with the secret the
   * two share, or, when they are not paired, with a secret this node does not hold (an unpaired node's attempt).
   */
  async peerHeadersFrom(fromNodeId: string, method: string, route: string, body: string | null): Promise<Record<string, string>> {
    const secret = await this.peerSecretOf(fromNodeId) ?? randomBytes(32).toString("base64url");
    return signPeerRequest({ secret, method, pathWithQuery: route, fromNodeId, toNodeId: this.nodeId, body });
  }
  /** A request to one of this node's peer routes as the body's `fromNodeId` sends it (signed, autobyteus-437). */
  async post(route: string, body: unknown): Promise<{ status: number; answer: Rec }> {
    const text = JSON.stringify(body);
    const fromNodeId = String((body as Rec | null)?.fromNodeId ?? "srv_unknown_sender_0000000000000000000");
    const headers = { "content-type": "application/json", ...await this.peerHeadersFrom(fromNodeId, "POST", route, text) };
    const response = await fetch(`${this.baseUrl}${route}`, { method: "POST", headers, body: text });
    return { status: response.status, answer: await response.json() as Rec };
  }
  async launches(): Promise<Array<{ argv: string[]; cwd: string }>> {
    return (await fsp.readFile(this.argvLog, "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  }
}

type Captured = { seq: number; at: number; via: "toBeta" | "toAlpha"; method: string; path: string; headers: Rec; body: unknown; status?: number; answer?: unknown; outcome?: string;
  /** 278: a WebSocket upgrade (the run-observation stream); its frames are not decoded. */
  upgrade?: boolean };

/** The link from one node to the other: forwards to the target node and records every request. */
class CapturingProxy {
  mode: "forward" | "blackhole" = "forward";
  /** A request this returns true for fails like a broken connection (its caller sees a network error). */
  drop: ((entry: Captured) => boolean) | null = null;
  /** autobyteus-587 AC-003: rewrites a request's body in transit (a damaged link); the original stays recorded. */
  tamper: ((entry: Captured, raw: Buffer) => Buffer) | null = null;
  /** autobyteus-591: a request this returns a status for is answered with it, as a node without that route would (404). */
  answerWith: ((entry: Captured) => number | null) | null = null;
  targetPort: number;
  private server: http.Server | null = null;
  private readonly held = new Set<http.ServerResponse>();
  private readonly upgraded = new Set<net.Socket>();
  constructor(readonly via: Captured["via"], readonly port: number, targetPort: number, readonly captured: Captured[]) { this.targetPort = targetPort; }
  get url() { return `http://127.0.0.1:${this.port}`; }
  async open(): Promise<void> {
    const server = http.createServer((req, res) => {
      const chunks: Buffer[] = [];
      req.on("data", (chunk: Buffer) => chunks.push(chunk));
      req.on("end", () => {
        // Bytes are forwarded as they came (autobyteus-587: a file piece is raw binary); a piece is recorded by its size and
        // SHA-256 only, every other body as its JSON.
        let raw: Buffer = Buffer.concat(chunks);
        let body: unknown;
        if (String(req.headers["content-type"] ?? "").startsWith("application/octet-stream")) {
          body = { bytes: raw.byteLength, sha256: createHash("sha256").update(raw).digest("hex") };
        } else {
          const text = raw.toString("utf8");
          body = text;
          try { body = text ? JSON.parse(text) : null; } catch { /* keep the raw text */ }
        }
        const entry: Captured = { seq: this.captured.length + 1, at: Date.now(), via: this.via, method: req.method ?? "", path: req.url ?? "", headers: { ...req.headers }, body };
        this.captured.push(entry);
        if (this.mode === "blackhole") { entry.outcome = "held"; this.held.add(res); return; }
        if (this.drop?.(entry)) { entry.outcome = "dropped by the test"; res.socket?.destroy(); return; }
        const answered = this.answerWith?.(entry) ?? null;
        if (answered !== null) { entry.outcome = "answered by the test"; entry.status = answered; entry.answer = "Not Found"; res.writeHead(answered, { "content-type": "text/plain" }); res.end("Not Found"); return; }
        if (this.tamper) { const changed = this.tamper(entry, raw); if (changed !== raw) { raw = changed; entry.outcome = "tampered"; } }
        const upstream = http.request({ host: "127.0.0.1", port: this.targetPort, method: req.method, path: req.url,
          headers: { ...req.headers, host: `127.0.0.1:${this.targetPort}` } }, (answer) => {
          const parts: Buffer[] = [];
          answer.on("data", (chunk: Buffer) => parts.push(chunk));
          answer.on("end", () => {
            const text = Buffer.concat(parts).toString("utf8");
            entry.status = answer.statusCode; entry.outcome = entry.outcome === "tampered" ? "tampered, forwarded" : "forwarded";
            try { entry.answer = JSON.parse(text); } catch { entry.answer = text; }
            res.writeHead(answer.statusCode ?? 502, answer.headers); res.end(text);
          });
        });
        upstream.on("error", (error) => { entry.outcome = `upstream error: ${error.message}`; res.socket?.destroy(); });
        upstream.end(raw);
      });
    });
    // 278: WebSocket upgrades (the run-observation stream between the nodes) are forwarded as raw TCP after the
    // upgrade request, which is recorded like any request (its frames are not decoded).
    server.on("upgrade", (req: http.IncomingMessage, socket: net.Socket, head: Buffer) => {
      const entry: Captured = { seq: this.captured.length + 1, at: Date.now(), via: this.via, method: req.method ?? "", path: req.url ?? "",
        headers: { ...req.headers }, body: null, upgrade: true };
      this.captured.push(entry);
      socket.on("error", () => undefined);
      this.upgraded.add(socket);
      socket.once("close", () => this.upgraded.delete(socket));
      if (this.mode === "blackhole") { entry.outcome = "held"; return; }
      if (this.drop?.(entry)) { entry.outcome = "dropped by the test"; socket.destroy(); return; }
      const upstream = net.connect(this.targetPort, "127.0.0.1", () => {
        const headerLines = Object.entries({ ...req.headers, host: `127.0.0.1:${this.targetPort}` })
          .flatMap(([name, value]) => (Array.isArray(value) ? value : [value]).filter((item) => item !== undefined).map((item) => `${name}: ${item}`));
        upstream.write(`${req.method} ${req.url} HTTP/1.1\r\n${headerLines.join("\r\n")}\r\n\r\n`);
        if (head.length) upstream.write(head);
        entry.outcome = "forwarded";
        upstream.once("data", (chunk: Buffer) => { entry.status = Number(String(chunk).split(" ")[1]) || undefined; entry.answer = String(chunk).slice(0, 400); });
        upstream.pipe(socket); socket.pipe(upstream);
      });
      upstream.on("error", (error) => { entry.outcome = `upstream error: ${error.message}`; socket.destroy(); });
      this.upgraded.add(upstream);
      upstream.once("close", () => { this.upgraded.delete(upstream); socket.destroy(); });
      socket.once("close", () => upstream.destroy());
    });
    await new Promise<void>((resolve, reject) => { server.once("error", reject); server.listen(this.port, "127.0.0.1", () => resolve()); });
    this.server = server;
  }
  /** Releases held requests (their callers already gave up) and stops listening: the address refuses connections. */
  async close(): Promise<void> {
    this.releaseHeld();
    this.dropUpgraded();
    const server = this.server;
    this.server = null;
    if (!server) return;
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  releaseHeld(): void {
    for (const res of this.held) res.socket?.destroy();
    this.held.clear();
  }
  /** 278: ends every forwarded WebSocket (as a broken link would). */
  dropUpgraded(): void { for (const socket of this.upgraded) socket.destroy(); this.upgraded.clear(); }
}

/** The web's check of a root view stream: every sequenced frame continues the snapshot's sequence contiguously. */
const sequenceCheck = (frames: readonly Frame[], snapshotType: string) => {
  const baseOf = (frame: Frame) => objectsIn(frame.payload).map((record) => record.base_change_sequence).find((value) => typeof value === "number") as number | undefined;
  let next = NaN; let sequenced = 0; const gaps: Rec[] = []; const snapshots: number[] = [];
  for (const frame of frames) {
    if (frame.type === snapshotType) { const base = baseOf(frame) ?? 0; snapshots.push(base); next = base + 1; continue; }
    const first = frame.payload?.change_sequence;
    if (typeof first !== "number" || Number.isNaN(next)) continue;
    const through = typeof frame.payload.change_sequence_through === "number" ? frame.payload.change_sequence_through : first;
    if (first !== next) gaps.push({ type: frame.type, expected: next, received: first });
    next = through + 1; sequenced += 1;
  }
  return { snapshots, sequenced, lastSequence: next - 1, gaps, errorFrames: frames.filter((frame) => frame.type === "ERROR").map((frame) => frame.payload) };
};

suite("Remote collaboration slice 1 between two real server processes (scripted AGY runtime, capturing proxies)", () => {
  let root = "";
  let alpha!: NodeServer, beta!: NodeServer, toBeta!: CapturingProxy, toAlpha!: CapturingProxy;
  const captured: Captured[] = [];
  const sockets: WebSocket[] = [];
  const evidence: Rec = { cases: {} };
  /** Agent, Team and Org definition IDs (created once in beforeAll). */
  const defs: Rec = {};
  /** Run IDs of the cases (runs, remote runs, Team/Org run records). */
  const ids: Rec = {};
  const record = (caseId: string, value: Rec) => { evidence.cases[caseId] = { ...(evidence.cases[caseId] ?? {}), ...value }; };
  const remoteRequests = (since = 0) => captured.filter((entry) => entry.seq > since && entry.path.startsWith("/rest/remote/"));
  /** Requests that send work or a message (starts, packets, messages, owner commands); since autobyteus-278 an open
   * root view also reads its remote runs' summaries, which a "nothing was sent" check does not count. */
  const sentRequests = (since = 0) => remoteRequests(since).filter((entry) => entry.path === PATHS.runs || entry.path === PATHS.messages
    || entry.path === PATHS.runMessages || entry.path === PATHS.ownerCommands || entry.path.startsWith(PATHS.receivedFiles));

  const connect = async (node: NodeServer, route: string, id: string, ready: (frames: Frame[]) => boolean) => {
    const socket = new WebSocket(`ws://127.0.0.1:${node.port}/ws/${route}/${id}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    let closed: { code: number; at: number } | null = null;
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    socket.on("close", (code: number) => { closed = { code, at: Date.now() }; });
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => ready(frames), `${node.name} ${route}/${id} ready`, 30_000);
    return { socket, frames, closed: () => closed };
  };

  /** An agent run that the test drives like its user: composer messages in, its conversation out. */
  type Actor = { node: NodeServer; label: string; runId: string; conversation(): Promise<unknown>; send(content: string): Promise<void> };
  const standaloneActor = (node: NodeServer, runId: string, label: string): Actor => ({
    node, label, runId,
    conversation: async () => (await node.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation,
    send: async (content) => {
      const channel = await connect(node, "agent", runId, (frames) => frames.some((frame) => frame.type === "CONNECTED"));
      channel.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    },
  });
  const teamActor = (node: NodeServer, teamRunId: string, runId: string, label: string): Actor => ({
    node, label, runId,
    conversation: async () => (await node.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
      { id: teamRunId, a: runId })).getTeamMemberRunProjection?.conversation,
    send: async (content) => {
      const view = await connect(node, "agent-team", teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
      view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), context_file_paths: [], image_urls: [], agent_run_id: runId, content } }));
    },
  });
  const orgActor = (node: NodeServer, orgRunId: string, address: string, runId: string, label: string): Actor => ({
    node, label, runId,
    conversation: async () => (await node.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
      { id: orgRunId, a: runId, m: address })).getAgentOrgMemberRunProjection?.conversation,
    send: async (content) => {
      const view = await connect(node, "agent-org", orgRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
      view.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { root_subject_kind: "agent_org", root_run_id: orgRunId, target_agent_run_id: runId,
        command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] } }));
    },
  });
  /**
   * The actor calls one actual agent tool; returns the tool result it reports and how long the call took. The run view
   * holds only the most recent events (`RECENT_RUN_PROJECTION_EVENT_LIMIT`), so a long-lived actor's count of results can
   * stay the same as old entries leave the window: the new result is the newest reply entry that was not there before.
   */
  const calls = async (actor: Actor, name: string, args: Rec, ms = 90_000): Promise<Rec & { elapsedMs: number }> => {
    const replies = (conversation: unknown) => (Array.isArray(conversation) ? conversation : [])
      .filter((entry) => stringsOf(entry).some((value) => value.includes("CALLED:"))).map((entry) => JSON.stringify(entry));
    const before = new Set(replies(await actor.conversation()));
    const started = Date.now();
    await actor.send(callTool(name, args));
    let fresh: string[] = [];
    await until(async () => { fresh = replies(await actor.conversation()).filter((entry) => !before.has(entry)); return fresh.length > 0; },
      `${actor.label} result of ${name} ${JSON.stringify(args).slice(0, 160)}`, ms)
      .catch(async (error) => { const now = await actor.conversation();
        throw new Error(`${error}; entries in view: ${Array.isArray(now) ? now.length : 0}; conversation tail: ${JSON.stringify(stringsOf(now).slice(-6)).slice(0, 1500)}`); });
    return { ...toolResult(calledResults([JSON.parse(fresh[0]!)])[0]!), elapsedMs: Date.now() - started };
  };
  /** 269: a run's title in beta's history (`summary`), as beta's run history lists it; `null` when the run is not listed. */
  const betaTitle = async (kind: "agent" | "team", id: string): Promise<string | null> => {
    const groups = (await beta.gql(`query{listWorkspaceRunHistory(limitPerAgent:100){agentDefinitions{runs{runId summary}} teamDefinitions{runs{teamRunId summary}}}}`))
      .listWorkspaceRunHistory as Rec[];
    const runs = groups.flatMap((group) => kind === "agent" ? (group.agentDefinitions as Rec[]).flatMap((definition) => definition.runs as Rec[])
      : (group.teamDefinitions as Rec[]).flatMap((definition) => definition.runs as Rec[]));
    const run = runs.find((entry) => (kind === "agent" ? entry.runId : entry.teamRunId) === id);
    return run ? run.summary as string : null;
  };
  /** The history catalogs' title rule: whitespace collapsed to one line; over 100 characters, the first 97 and "...". */
  const titleOf = (description: string) => {
    const line = description.replace(/\s+/g, " ").trim();
    return line.length <= 100 ? line : `${line.slice(0, 97)}...`;
  };
  /** 269: wait for the peer-started run's title (it is written after the packet is accepted, without delaying the answer). */
  const titledOnBeta = async (kind: "agent" | "team", id: string, expected: string) => {
    let title: string | null = null;
    await until(async () => (title = await betaTitle(kind, id)) === expected, `beta's title of ${id}: ${JSON.stringify(expected)}`, 15_000)
      .catch((error) => { throw new Error(`${error}; last title ${JSON.stringify(title)}`); });
    return title!;
  };
  /** 278: the events of a standalone or Org root view (`ROOT_EXECUTION_EVENT`). */
  /** 278: a remote run's summaries in a root view (standalone and Org: events; Team: `REMOTE_TASK_EXECUTION_SUMMARY`). */
  /** autobyteus-461 SR-082, SR-083: a run's statuses by its run ID on a node's `/ws/run-status` (a peer run's through its handle). */
  const runStatus = async (node: NodeServer, kind: "agent" | "agent_team", runId: string) => {
    const socket = new WebSocket(`ws://127.0.0.1:${node.port}/ws/run-status`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    socket.send(JSON.stringify({ type: "SUBSCRIBE", payload: { runs: [{ kind, runId }] } }));
    await until(() => frames.some((f) => f.type === "RUN_STATUS_SNAPSHOT"), `${node.name} run-status snapshot of ${runId}`, 30_000);
    const agents = () => ((frames.find((f) => f.type === "RUN_STATUS_SNAPSHOT")!.payload as Rec).runs as Rec[]).flatMap((r) => r.agents as Rec[]);
    const statusesOf = (agentRunId: string, from = 0) => frames.slice(from).flatMap((f) => f.type === "RUN_STATUS_CHANGED"
      ? ((f.payload as Rec).agentRunId === agentRunId ? [String((f.payload as Rec).status)] : [])
      : f.type === "RUN_STATUS_SNAPSHOT" ? agents().filter((a) => a.agentRunId === agentRunId).map((a) => String(a.status)) : []);
    const latest = (agentRunId: string) => statusesOf(agentRunId).at(-1) ?? null;
    /** SR-086 G-A2/G-A3: the run's state (`answer`, the unreachable `node`, its own `status`), as the snapshot and each change tell it. */
    const statesOf = (runId: string) => frames.flatMap((f) => f.type === "RUN_STATE_CHANGED" ? ((f.payload as Rec).runId === runId ? [f.payload as Rec] : [])
      : f.type === "RUN_STATUS_SNAPSHOT" ? ((f.payload as Rec).runs as Rec[]).filter((r) => r.runId === runId) : []);
    /** SR-090: Retry on this connection; settles on the run's next state, told again even when unchanged. */
    const retry = async (runId: string) => {
      const before = statesOf(runId).length, started = Date.now();
      socket.send(JSON.stringify({ type: "RETRY_PEERS", payload: { runIds: [runId] } }));
      await until(() => statesOf(runId).length > before, `the Retry's answer for ${runId}`, 40_000);
      return { state: statesOf(runId).at(-1)!, elapsedMs: Date.now() - started };
    };
    return { socket, frames, agents, statusesOf, latest, statesOf, retry };
  };
  /** SR-084: a run's tree as alpha's server builds it (`runTree`): the rows every view, the run list and the phone show. */
  const treeOf = async (node: NodeServer, kind: "agent" | "agent_team" | "agent_org", runId: string) =>
    (await node.gql(`query($k:String!,$r:String!){runTree(kind:$k,runId:$r)}`, { k: kind, r: runId })).runTree as { rows: Rec[] };
  /** A peer run's row (SR-083, SR-084), by the run it opens (a peer Team's row by its team run ID). */
  const peerRowIn = (tree: { rows: Rec[] }, runId: string) => tree.rows
    .find((row) => (row.kind === "peer_agent" || row.kind === "peer_team") && (row.openTarget as Rec | null)?.runId === runId);
  /**
   * The peer row once `ready` holds. Its title, reachability and launch come from its node's latest answer, which alpha
   * keeps while a client holds the run's status (SR-086 G-B2), as the window does for every row it shows.
   */
  const peerRowOf = async (node: NodeServer, kind: "agent" | "agent_team" | "agent_org", rootRunId: string, runId: string,
    ready: (row: Rec) => boolean = (row) => (row.peer as Rec)?.reachable === true) => {
    let tree: { rows: Rec[] } = { rows: [] };
    let row: Rec | undefined;
    await until(async () => Boolean((row = peerRowIn(tree = await treeOf(node, kind, rootRunId), runId)) && ready(row)), `${runId}'s peer row in ${rootRunId}'s tree`, 30_000)
      .catch((error: Error) => { throw Object.assign(error, { message: `${error.message}: ${JSON.stringify(tree.rows)}` }); });
    return { row: row!, tree };
  };
  /**
   * One peer agent opened on alpha's `/ws/peer-run`, as the window opens a peer row (SR-088 G-D1): node B's own agent
   * stream in the `/ws/agent` protocol, relayed. A peer Team's member opens with its team run ID and its own agent run ID.
   */
  const peerRun = async (runKind: "agent" | "agent_team", runId: string, agentRunId: string) => {
    const socket = new WebSocket(`ws://127.0.0.1:${alpha.port}/ws/peer-run/${encodeURIComponent(beta.nodeId)}/${runKind}/${encodeURIComponent(runId)}/${encodeURIComponent(agentRunId)}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => frames.push({ ...JSON.parse(String(raw)), at: Date.now() }));
    await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "AGENT_STREAM_SNAPSHOT"), `${agentRunId}'s snapshot on /ws/peer-run`, 30_000);
    const deltasOf = (frame: Rec): string[] => frame.type === "SEGMENT_CONTENT" ? [String(frame.payload?.delta ?? "")]
      : frame.type === "SEGMENT_CONTENT_BATCH" ? (frame.payload?.items as Rec[] ?? []).map((item) => String(item.delta ?? "")) : [];
    /** What the session shows now: its latest snapshot's stored entries and turn frames, then every frame after it. */
    const shown = () => {
      const at = frames.map((frame) => frame.type).lastIndexOf("AGENT_STREAM_SNAPSHOT");
      const snapshot = frames[at]!.payload;
      const stored = (snapshot.stored.conversation as Rec[]).map((entry) => String(entry.content ?? "")).join("\n");
      return `${stored}\n${[...(snapshot.turn_frames as Rec[]), ...frames.slice(at + 1)].flatMap(deltasOf).join("")}`;
    };
    const count = (marker: string) => shown().split(marker).length - 1;
    /** Whether a frame after `since` (a live frame, not a snapshot) carries `marker`. */
    const liveSince = (since: number, marker: string) => frames.slice(since).some((frame) => frame.type !== "AGENT_STREAM_SNAPSHOT" && JSON.stringify(frame).includes(marker));
    const ack = async (key: "message_id" | "command_id", id: string) => {
      let found: Rec | undefined;
      await until(() => Boolean(found = frames.find((frame) => frame.type === "AGENT_COMMAND_ACK" && frame.payload[key] === id)?.payload), `ack ${id}`, 30_000);
      return found!;
    };
    const send = (content: string) => { const id = randomUUID(); socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { content, message_id: id, dedupe_key: id } })); return ack("message_id", id); };
    const interrupt = () => { const id = randomUUID(); socket.send(JSON.stringify({ type: "INTERRUPT_GENERATION", payload: { command_id: id } })); return ack("command_id", id); };
    return { socket, frames, count, liveSince, send, interrupt, snapshots: () => frames.filter((frame) => frame.type === "AGENT_STREAM_SNAPSHOT").length };
  };
  /** A reply whose text only the agent's output carries (the message names the file, not its text): live output is then this text. */
  const replyWith = async (name: string, text: string) => {
    const file = path.join(root, "beta", `${name}.txt`);
    await fsp.writeFile(file, text);
    return `REPLY_FILE:${file}`;
  };
  /** 278: a root view's command from the window (standalone and Org roots). */
  const rootCommand = (view: { socket: WebSocket }, root: { kind: "agent" | "agent_org"; runId: string }, type: string, target: string, extra: Rec = {}) => {
    const commandId = randomUUID();
    view.socket.send(JSON.stringify({ type, payload: { root_subject_kind: root.kind, root_run_id: root.runId, target_agent_run_id: target, command_id: commandId, ...extra } }));
    return commandId;
  };
  const ownerText = (content: string) => ({ content, context_file_paths: [], image_urls: [], message_id: randomUUID(), dedupe_key: randomUUID() });
  const ackOf = async (view: { frames: Frame[] }, commandId: string) => {
    let ack: Rec | undefined;
    await until(() => (ack = view.frames.find((frame) => frame.type === "AGENT_COMMAND_ACK" && (frame.payload as Rec).command_id === commandId)?.payload as Rec | undefined) !== undefined,
      `ack of ${commandId}`, 30_000);
    return ack!;
  };
  /** 278: beta's own stored conversation of one of its runs (its window's read). */
  const betaConversation = async (runId: string) => JSON.stringify((await beta.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId })).getRunProjection?.conversation ?? []);
  /** 278: a forged request to beta's peer routes as another registered node would send it. */
  const asPeerTo = (node: NodeServer, route: string, body: Rec) => node.post(route, body);
  /** 267: the window's query for one peer's offer (GraphQL on this node's own server), as the Nodes page sends it. */
  const peerNodeOffer = async (node: NodeServer, nodeId: string) => {
    const started = Date.now();
    const offer = (await node.gql(`query($id:String!){peerNodeOffer(nodeId:$id){entries{name kind description} refusalCode}}`, { id: nodeId })).peerNodeOffer as Rec;
    return { offer, elapsedMs: Date.now() - started };
  };
  /** The agent tools the actor's run has over Agent Tools MCP, with their descriptions and schemas (scripted `LIST_TOOLS`). */
  const toolsOf = async (actor: Actor): Promise<Rec[]> => {
    const before = toolListsIn(await actor.conversation()).length;
    await actor.send("LIST_TOOLS");
    let lists: string[] = [];
    await until(async () => (lists = toolListsIn(await actor.conversation())).length > before, `${actor.label} tool list`, 60_000);
    return JSON.parse(lists[before]!) as Rec[];
  };
  /** The string of the actor's conversation that holds `marker` (a message it received). */
  const receives = async (actor: Actor, marker: string, ms = 60_000): Promise<string> => {
    let found: string | undefined;
    await until(async () => Boolean(found = stringsOf(await actor.conversation()).find((value) => value.includes(marker) && !value.includes("CALL_TOOL"))),
      `${actor.label} receives ${marker}`, ms);
    return found!;
  };
  const neverReceives = async (actor: Actor, marker: string, ms = 5_000) => {
    await wait(ms);
    expect(stringsOf(await actor.conversation()).filter((value) => value.includes(marker) && !value.includes("CALL_TOOL")), `${actor.label} must not receive ${marker}`).toEqual([]);
  };
  /** Every message-log line (any `*communication_messages*.jsonl` under the node's memory) with this message ID. */
  const logLines = async (node: NodeServer, messageId: string) => (await walkFiles(node.memory))
    .filter((file) => /communication_messages.*\.jsonl$/.test(file))
    .flatMap((file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => ({ file: path.relative(node.dataDir, file), line: JSON.parse(line) as Rec })))
    .filter((entry) => entry.line.messageId === messageId);
  const messageIdOf = async (node: NodeServer, content: string) => {
    let id: string | undefined;
    await until(async () => Boolean(id = (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file))
      .flatMap((file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec))
      .find((line) => line.content === content)?.messageId), `${node.name} log line for ${content}`, 20_000);
    return id!;
  };
  /** Each message once in the delegating node's log and once in the receiving node's log, under one message ID (CM-9). */
  const assertBothLogs = async (content: string, from: Actor, to: Actor) => {
    const messageId = await messageIdOf(from.node, content);
    const fromLines = await logLines(from.node, messageId);
    let toLines: Awaited<ReturnType<typeof logLines>> = [];
    await until(async () => (toLines = await logLines(to.node, messageId)).length > 0, `${to.node.name} log of ${messageId}`, 20_000);
    expect(fromLines, `${from.node.name} log of ${content}`).toHaveLength(1);
    expect(toLines, `${to.node.name} log of ${content}`).toHaveLength(1);
    const FIELDS = ["content", "createdAt", "messageId", "messageType", "receiverAgentRunId", "referenceFiles", "senderAgentRunId"];
    for (const { line } of [...fromLines, ...toLines]) {
      expect(line).toMatchObject({ messageId, senderAgentRunId: from.runId, receiverAgentRunId: to.runId, content });
      if (from.node === to.node) { expect(sortedKeys(line)).toEqual(FIELDS); continue; }
      // autobyteus-565 REQ-007: a cross-node line records the other agent: its address in its own run and its node.
      expect(sortedKeys(line)).toEqual([...FIELDS, "counterpart"].sort());
    }
    const otherOf = (lines: typeof fromLines, other: Actor) => lines[0]!.line.counterpart as Rec;
    const fromRecord = otherOf(fromLines, to), toRecord = otherOf(toLines, from);
    if (from.node !== to.node) {
      expect(fromRecord, `${from.node.name}'s line names the receiver`).toEqual({ address: expect.stringMatching(/^\//), nodeId: to.node.nodeId });
      expect(toRecord, `${to.node.name}'s line names the sender`).toEqual({ address: expect.stringMatching(/^\//), nodeId: from.node.nodeId });
    }
    return { messageId, files: { [from.node.name]: fromLines[0]!.file, [to.node.name]: toLines[0]!.file },
      ...(from.node !== to.node ? { counterparts: { [from.node.name]: fromRecord, [to.node.name]: toRecord } } : {}) };
  };
  const remoteRunDirs = async () => (await fsp.readdir(path.join(beta.memory, "agents")).catch(() => [] as string[])).sort();
  const betaMetadata = (runId: string) => readJson(path.join(beta.memory, "agents", runId, "run_metadata.json"));
  const taskResourcesWith = async (node: NodeServer, runId: string) => {
    const files = (await walkFiles(node.dataDir)).filter((file) => file.endsWith("agent_run_resources.json"));
    const out: Array<{ file: string; entry: Rec }> = [];
    for (const file of files) {
      for (const entry of objectsIn(await readJson(file))) {
        if (entry.agentRun?.agentRunId === runId) out.push({ file: path.relative(node.dataDir, file), entry });
      }
    }
    return out;
  };
  /** autobyteus-32 REQ-009: the peer's launch of Publisher, recorded on the link (its own default, nothing skipped). */
  const publisherLaunches = () => [{ address: "/publisher", runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, source: { origin: "agent_default", fallbacks: [] } }];
  /**
   * The peer runs a run on alpha delegated to, as their Task entries record them (autobyteus-461 contract §3.1: the Task entry
   * is the one record of a delegation; a peer's entry has `nodeId` and, for a team, its `members`; no launches are stored).
   * Shaped as the links the cases compare: the address it was delegated to, its run, its node, its delegator, when it was linked.
   */
  const linksOf = async (kind: "agent" | "agent_team" | "agent_org", runId: string): Promise<Rec[]> => {
    const out: Rec[] = [];
    for (const file of (await walkFiles(alpha.dataDir)).filter((name) => name.endsWith("agent_run_resources.json"))) {
      for (const entry of objectsIn(await readJson(file))) {
        if (typeof entry.nodeId !== "string" || entry.delegatedFrom?.delegatingRun?.kind !== kind || entry.delegatedFrom?.delegatingRun?.runId !== runId) continue;
        const run = entry.agentRun as Rec;
        out.push(run.kind === "team"
          ? { address: entry.recipientAddress, teamRunId: run.teamRunId, coordinatorAgentRunId: run.coordinatorAgentRunId, nodeId: entry.nodeId,
            members: entry.members, delegatorAgentRunId: entry.delegatedFrom.delegatorAgentRunId, startedAt: entry.linkedAt }
          : { address: entry.recipientAddress, agentRunId: run.agentRunId, nodeId: entry.nodeId, delegatorAgentRunId: entry.delegatedFrom.delegatorAgentRunId, startedAt: entry.linkedAt });
      }
    }
    return out;
  };

  // Definitions and runs.
  const agentDefinition = async (node: NodeServer, name: string, toolNames: string[] = [], defaultLaunchConfig: Rec | null = null) => (await node.gql(
    `mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
    { input: { name, role: "assistant", description: `${name} (remote collaboration E2E)`, instructions: "Follow the user's request.", toolNames,
      ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentDefinition.id as string;
  /** Beta's temp workspace, where remote runs work (245 REQ-205), as the server canonicalizes it. */
  const betaTempWorkspace = () => fs.realpathSync(path.join(beta.dataDir, "temp_workspace"));
  const leftoverPublishedFile = () => path.join(beta.dataDir, "remote-collaboration", "published-agents.json");
  const betaTeamRunDirs = async () => (await fsp.readdir(path.join(beta.memory, "agent_teams")).catch(() => [] as string[])).sort();
  const betaTeamTree = (teamRunId: string) => readJson(path.join(beta.memory, "agent_teams", teamRunId, "team_run_execution_tree.json"));
  /** Task records on a node whose execution is the Team run `teamRunId`. */
  const teamTaskResourcesWith = async (node: NodeServer, teamRunId: string) => {
    const out: Array<{ file: string; entry: Rec }> = [];
    for (const file of (await walkFiles(node.dataDir)).filter((name) => name.endsWith("agent_run_resources.json"))) {
      for (const entry of objectsIn(await readJson(file))) if (entry.agentRun?.teamRunId === teamRunId) out.push({ file: path.relative(node.dataDir, file), entry });
    }
    return out;
  };
  /** Every Task record file on alpha (a refused delegation must not create one). */
  const alphaTaskRecordFiles = async () => (await walkFiles(alpha.dataDir)).filter((file) => file.endsWith("agent_run_resources.json")).sort();
  const runConfig = (node: NodeServer) => ({ workspaceRootPath: node.workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const createStandalone = async (node: NodeServer, definitionId: string, label: string) => {
    const created = (await node.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: definitionId, ...runConfig(node) } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    return standaloneActor(node, created.runId as string, label);
  };
  const delegateRemote = (actor: Actor, description: string, extra: Rec = {}) =>
    calls(actor, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description, ...extra });
  const composeOnBeta = (remoteRunId: string) => standaloneActor(beta, remoteRunId, `beta remote run ${remoteRunId}`);
  // ---- autobyteus-591: a closed Task's remote run stops on its node, and leaves its list ----
  /** Beta's one record of the peer-started runs whose delegating node closed every Task naming them (DN-5). */
  const closedOnBeta = async (): Promise<Rec[]> => {
    try { return JSON.parse(await fsp.readFile(path.join(beta.dataDir, "remote-collaboration", "closed-delegations.json"), "utf8")) as Rec[]; }
    catch { return []; }
  };
  /** Whether beta's run list (the history the desktop and the phone read every 5 s) lists the run (an agent or a team run). */
  const betaListed = async (runId: string) => JSON.stringify((await beta.gql(
    `query{listWorkspaceRunHistory(limitPerAgent:500){agentDefinitions{runs{runId}} teamDefinitions{runs{teamRunId}}}}`)).listWorkspaceRunHistory).includes(`"${runId}"`);
  /** Alpha's notice log records of one code (`console.info`/`warn` print `CODE {` … `}` over lines, or on one line). */
  const noticeRecords = (code: string): string[] => {
    const text = fs.readFileSync(alpha.logFile, "utf8");
    const out: string[] = [];
    for (let at = text.indexOf(`${code} {`); at >= 0; at = text.indexOf(`${code} {`, at + code.length)) {
      const rest = text.slice(at);
      const end = rest.startsWith(`${code} {\n`) ? rest.indexOf("\n}") + 2 : rest.indexOf("\n");
      out.push(end > 0 ? rest.slice(0, end) : rest);
    }
    return out;
  };
  /** The run's owed marks on alpha (DN-3): `peerNoticeOwed` of every Task entry naming it. */
  const owedMarks = async (runId: string) => [...await taskResourcesWith(alpha, runId), ...await teamTaskResourcesWith(alpha, runId)]
    .map(({ entry }) => entry.peerNoticeOwed ?? null);
  /** Within 30 s of `since` (REQ-001): no runtime process of these runs on beta. Returns the time it took. */
  const stoppedOnBeta = async (runIds: string[], since: number, label: string) => {
    await until(async () => !(await Promise.all(runIds.map((runId) => processLive(runId)))).some(Boolean), `${label}: beta stops it`, Math.max(1_000, 30_000 - (Date.now() - since)));
    return Date.now() - since;
  };
  const betaTeamActive = async (teamRunId: string) => Boolean((await beta.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}`, { id: teamRunId })).getTeamRunResumeConfig?.isActive);
  /** Its delegator's message to a closed run, as locally (591 SR-010: the local reopen checks, `assertReopenable`). */
  const closedForDelegator = (status: "DONE" | "CANCELLED") =>
    `This Task is ${status}. The agent that assigned it can set the Task to TODO or IN_PROGRESS and then message this run id again.`;
  /** A saved Project Task on alpha (591's re-delegations take a saved Task; an ad-hoc delegation's Task is not one). */
  const savedTaskOnAlpha = async (title: string) => {
    ids.project591 ??= (await alpha.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "591 project" } })).createProject.projectId as string;
    const taskId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId: ids.project591, title, description: title } })).createProjectTask.taskId as string;
    return { projectId: ids.project591 as string, taskId };
  };
  const taskOnAlpha = async (projectId: string, taskId: string) => ((await alpha.gql(`query($id:String!){projectTasks(projectId:$id){taskId status root{kind ingressAgentRunId teamRunId closed status}}}`,
    { id: projectId })).projectTasks as Rec[]).find((task) => task.taskId === taskId);
  /** autobyteus-32: beta's scripted router plan and its log of answered routing requests (one JSON line per request). */
  const routerPlanFile = () => path.join(root, "beta", "router-plan.json");
  const routerLogFile = () => path.join(root, "beta", "router-log.jsonl");
  const routerLog = async (): Promise<Rec[]> => (await fsp.readFile(routerLogFile(), "utf8").catch(() => "")).trim().split("\n").filter(Boolean).map((line) => JSON.parse(line));
  const setRouterPlan = (plan: Rec) => fsp.writeFile(routerPlanFile(), JSON.stringify(plan));
  const betaRouting = {
    enable: async (on: boolean) => (await beta.gql(`mutation($e:Boolean!){setModelRoutingEnabled(enabled:$e)}`, { e: on })).setModelRoutingEnabled as Rec,
    router: async (runtimeKind: string, model: string) => (await beta.gql(`mutation($r:String!,$m:String!){setModelRouterLaunch(runtimeKind:$r, llmModelIdentifier:$m)}`,
      { r: runtimeKind, m: model })).setModelRouterLaunch as Rec,
    status: async () => (await beta.gql(`{modelRoutingStatus}`)).modelRoutingStatus as Rec,
    records: async () => objectsIn((await beta.gql(`{modelRoutingDecisions(limit:50)}`)).modelRoutingDecisions).filter((record) => typeof record.agentAddress === "string"),
  };

  beforeAll(async () => {
    root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), "remote-collab-two-server-")));
    const [alphaPort, betaPort, toBetaPort, toAlphaPort] = [await getFreePort(), await getFreePort(), await getFreePort(), await getFreePort()];
    // INFO on alpha: a confirmed delegated-run state is logged at info (TASK_PEER_NOTICE_CONFIRMED, autobyteus-591).
    alpha = new NodeServer("alpha", root, alphaPort, { LOG_LEVEL: "INFO" });
    // Codex is unavailable on beta, deterministically (245 AC-203).
    if (!fs.existsSync(path.join(BRIEF_STUDIO_PACKAGE, "applications", "brief-studio", "application.json"))) {
      throw new Error(`Brief Studio's importable package is missing (${BRIEF_STUDIO_PACKAGE}); run pnpm -C autobyteus-server-ts test:integration:prepare`);
    }
    // autobyteus-32: beta's Model Router (a scripted AGY run) answers routing requests as beta's plan file says.
    await fsp.mkdir(path.join(root, "beta"), { recursive: true });
    await fsp.writeFile(routerPlanFile(), JSON.stringify({ mode: "valid", runtime: "antigravity_cli", model: "alt-model" }));
    beta = new NodeServer("beta", root, betaPort, { CODEX_APP_SERVER_COMMAND: path.join(root, "beta", "missing", "codex"), AGY_FAKE_EXTRA_MODELS: "alt-model",
      AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS: BRIEF_STUDIO_PACKAGE, AGY_FAKE_ROUTER_PLAN: routerPlanFile(), AGY_FAKE_ROUTER_LOG: routerLogFile() });
    // 261: a file-authored shared Agent with no description (its listed entry has no description field, REQ-405).
    await fsp.mkdir(path.join(beta.dataDir, "agents", "plain-helper"), { recursive: true });
    await fsp.writeFile(path.join(beta.dataDir, "agents", "plain-helper", "agent.md"), ["---", "name: Plain Helper", "role: assistant", "---", "", "Help."].join("\n"));
    await fsp.writeFile(path.join(beta.dataDir, "agents", "plain-helper", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }, null, 2));
    // 308: a file-authored internal agent (`"internal": true`) with a complete default, so only its visibility can refuse it.
    await fsp.mkdir(path.join(beta.dataDir, "agents", "hidden-helper"), { recursive: true });
    await fsp.writeFile(path.join(beta.dataDir, "agents", "hidden-helper", "agent.md"), ["---", "name: Hidden Helper", "description: Beta's own helper (internal agents E2E)", "role: assistant", "---", "", "Help."].join("\n"));
    await fsp.writeFile(path.join(beta.dataDir, "agents", "hidden-helper", "agent-config.json"), JSON.stringify({ internal: true, toolNames: [], skillNames: [],
      defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: null } }, null, 2));
    // Before beta starts: a file-authored Team with a team-local Agent (a complete default, so only eligibility can refuse
    // it), and a published-agents.json left from slice 1 whose entries would change the results if it were read (245 AC-207).
    const fieldTeam = path.join(beta.dataDir, "agent-teams", "field-team");
    await fsp.mkdir(path.join(fieldTeam, "agents", "local-scout"), { recursive: true });
    await fsp.writeFile(path.join(fieldTeam, "team.md"), ["---", "name: Field Team", "description: Team with a team-local agent", "---", "", "Coordinate field work."].join("\n"));
    await fsp.writeFile(path.join(fieldTeam, "team-config.json"), JSON.stringify({ coordinatorMemberName: "scout",
      members: [{ memberName: "scout", ref: "local-scout", refScope: "team_local" }], handoffs: [], avatarUrl: null }, null, 2));
    await fsp.writeFile(path.join(fieldTeam, "agents", "local-scout", "agent.md"), ["---", "name: Local Scout", "description: A team-local agent", "role: assistant", "---", "", "Scout."].join("\n"));
    await fsp.writeFile(path.join(fieldTeam, "agents", "local-scout", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [],
      defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: null } }, null, 2));
    await fsp.mkdir(path.dirname(leftoverPublishedFile()), { recursive: true });
    const leftover = (agentDefinitionId: string) => ({ agentDefinitionId, runtimeKind: "antigravity_cli", llmModelIdentifier: "leftover-model", llmConfig: null,
      workspaceRootPath: path.join(root, "beta", "leftover-workspace"), autoExecuteTools: false, publishedAt: "2026-10-20T09:00:00.000Z" });
    await fsp.writeFile(leftoverPublishedFile(), `${JSON.stringify({ publishedAgents: [leftover("publisher"), leftover("blank-slate")] }, null, 2)}\n`);
    toBeta = new CapturingProxy("toBeta", toBetaPort, betaPort, captured);
    toAlpha = new CapturingProxy("toAlpha", toAlphaPort, alphaPort, captured);
    await Promise.all([alpha.start(), beta.start(), toBeta.open(), toAlpha.open()]);
    expect(alpha.nodeId).not.toBe(beta.nodeId);
    evidence.nodes = { alpha: { nodeId: alpha.nodeId, port: alpha.port, peerUrlOnBeta: toAlpha.url }, beta: { nodeId: beta.nodeId, port: beta.port, peerUrlOnAlpha: toBeta.url } };
    // Canary provider keys on both nodes (AC-111: they must never appear between the nodes).
    for (const [node, key] of [[alpha, CANARY.alpha], [beta, CANARY.beta]] as const) {
      const saved = await node.gqlRaw(`mutation($k:String!){saveProviderApiKey(providerId:"OPENAI",apiKey:$k){apiKeyConfigured}}`, { k: key });
      evidence.nodes[node.name].canaryKeySaved = saved.data?.saveProviderApiKey?.apiKeyConfigured === true ? true : JSON.stringify(saved.errors);
    }
    defs.delegator = await agentDefinition(alpha, "Delegator", ["create_task", "update_task"]);
    defs.manager = await agentDefinition(alpha, "Remote Manager", ["list_projects", "list_project_tasks", "create_task", "update_task"]);
    defs.worker = await agentDefinition(alpha, "Remote Worker");
    // 261: the discovery tools are opt-in; Scout selects both, the Delegator neither.
    defs.scout = await agentDefinition(alpha, "Scout", ["list_peer_nodes", "list_available_agents"]);
    // 290 REQ-906: a definition that still selects the tool's former name (as a stored agent config may).
    defs.oldNameScout = await agentDefinition(alpha, "Old Name Scout", ["list_available_nodes"]);
    // 492: an agent that selects list_running_agents (send_message_to and its node come with every agent).
    defs.runningScout = await agentDefinition(alpha, "Running Scout", ["list_peer_nodes", "list_running_agents"]);
    defs.team = (await alpha.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: "Remote Squad", description: "Team delegator", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: defs.delegator, refScope: "SHARED" }, { memberName: "mate", ref: defs.delegator, refScope: "SHARED" }] } })).createAgentTeamDefinition.id;
    defs.org = (await alpha.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: "Remote Org", description: "Org delegator", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "lead", ref: defs.delegator, refType: "AGENT", refScope: "SHARED" },
        { memberName: "mate", ref: defs.delegator, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
    // Beta's shared Agents and their defaults (245): nothing is published.
    const agyDefault = (model: string | null) => ({ runtimeKind: "antigravity_cli", llmModelIdentifier: model, llmConfig: null });
    defs.publisher = await agentDefinition(beta, "Publisher", [], agyDefault(MODEL));
    defs.blank = await agentDefinition(beta, "Blank Slate");
    defs.half = await agentDefinition(beta, "Half Set", [], agyDefault(null));
    defs.codex = await agentDefinition(beta, "Codex Writer", [], { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null });
    defs.fragile = await agentDefinition(beta, "Fragile", [], agyDefault("no-such-model"));
    defs.bystander = await agentDefinition(beta, "Bystander");
    // 492: beta's Project Task Manager, started by beta's owner under a Project in RC-48.
    defs.betaPm = await agentDefinition(beta, "Project Task Manager");
    // Beta's shared Teams (247).
    defs.checker = await agentDefinition(beta, "Checker");
    const betaTeamDefinition = async (name: string, nodes: Array<[string, string]>, defaultLaunchConfig: Rec | null) => (await beta.gql(
      `mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name, description: `${name} (remote Teams E2E)`, instructions: "Work as a team.", coordinatorMemberName: nodes[0]![0],
        nodes: nodes.map(([memberName, ref]) => ({ memberName, ref, refScope: "SHARED" })), ...(defaultLaunchConfig ? { defaultLaunchConfig } : {}) } })).createAgentTeamDefinition.id as string;
    defs.studioTeam = await betaTeamDefinition("Studio Team", [["lead", defs.publisher], ["checker", defs.checker]], agyDefault("alt-model"));
    defs.hollowTeam = await betaTeamDefinition("Hollow Team", [["lead", defs.blank]], null);
    defs.codexTeam = await betaTeamDefinition("Codex Team", [["lead", defs.blank]], { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null });
    defs.betaOrg = (await beta.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: "Remote Org B", description: "An Agent Org on beta", instructions: "Organize.", handoffs: [],
        members: [{ memberName: "lead", ref: defs.publisher, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id;
    evidence.betaDefinitions = { ...defs };
  }, 240_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const socket of sockets) socket.terminate();
    await Promise.all([alpha?.stop(), beta?.stop()].filter(Boolean)).catch((error) => errors.push(String(error)));
    await Promise.all([toBeta?.close(), toAlpha?.close()].filter(Boolean)).catch((error) => errors.push(String(error)));
    await wait(1_000);
    const leftover = root ? (await liveAgyCwds()).filter((cwd) => cwd.startsWith(root)) : [];
    if (leftover.length) errors.push(`live AGY processes after both servers stopped: ${leftover.join(", ")}`);
    const dir = process.env["REMOTE_E2E_EVIDENCE_DIR"];
    if (dir && root) {
      await fsp.mkdir(dir, { recursive: true });
      for (const node of [alpha, beta]) await fsp.copyFile(node.logFile, path.join(dir, `remote-two-server-${node.name}-server.log`)).catch(() => undefined);
      evidence.captured = captured;
    }
    // Diagnostics: `REMOTE_E2E_KEEP_DATA_DIR` keeps a copy of both nodes' data roots (test-owned temp data only).
    const keep = process.env["REMOTE_E2E_KEEP_DATA_DIR"];
    if (keep && root) for (const node of [alpha, beta]) await fsp.cp(node.dataDir, path.join(keep, node.name), { recursive: true }).catch((error) => errors.push(String(error)));
    if (root) await fsp.rm(root, { recursive: true, force: true });
    if (dir && root) {
      evidence.cleanup = { rootRemoved: !fs.existsSync(root), serversStopped: [alpha, beta].every((node) => node.child?.exitCode !== null), leftoverAgy: leftover, errors };
      await fsp.writeFile(path.join(dir, "remote-two-server-receipt.json"), `${JSON.stringify(evidence, null, 2)}\n`);
    }
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  // 461: the start request names the delegator's run as `delegatingRun` (contract E10; requirements, External Contracts:
  // both nodes run the same release, so a renamed wire field is a clean cut).
  const inboundStart = (fromNodeId: string, toNodeId: string) => ({ fromNodeId, toNodeId, address: "/publisher",
    delegator: { agentRunId: "agent_probe" }, delegatingRun: { kind: "agent", runId: "agent_probe" },
    task: { text: "x", title: "x", taskKey: null, projectId: null, taskId: null } });
  const inboundMessage = (fromNodeId: string, toNodeId: string, messageId: string) => ({ fromNodeId, toNodeId, kind: "message", messageId,
    targetRoot: { kind: "agent", runId: "agent_probe_target" },
    // autobyteus-565: a cross-node message names its sender's address in its own run (`sender.address`).
    sender: { agentRunId: "agent_probe", address: "/agent_probe" }, target: { agentRunId: "agent_probe_target" }, content: "x", messageType: "agent_message", createdAt: new Date().toISOString(),
    // autobyteus-587: every message names its files (none here).
    files: [] });

  it("RC-01 AC-101/AC-111: off by default; with the switch off, inbound requests of an unpaired node are refused at the gate and no invite can be made", async () => {
    for (const node of [alpha, beta]) {
      expect((await node.gql(`query{remoteCollaborationCapability{enabled settingKey source}}`)).remoteCollaborationCapability)
        .toEqual({ enabled: false, settingKey: "ENABLE_REMOTE_COLLABORATION", source: "DEFAULT_DISABLED" });
      expect(fs.readFileSync(path.join(node.dataDir, ".env"), "utf8")).not.toMatch(/ENABLE_REMOTE_COLLABORATION/);
    }
    const start = await beta.post(PATHS.runs, inboundStart(alpha.nodeId, beta.nodeId));
    const message = await beta.post(PATHS.messages, inboundMessage(alpha.nodeId, beta.nodeId, "collabmsg_off"));
    // autobyteus-437: the nodes are not paired, so beta's gate refuses alpha's signature before the switch is read (NAS-21).
    for (const answer of [start, message]) expect(answer).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
    const addWhileOff = await alpha.gqlRaw(`mutation{createPeerInvite{inviteText}}`);
    expect(addWhileOff.errors?.[0]?.extensions?.code, JSON.stringify(addWhileOff)).toBe("REMOTE_COLLABORATION_OFF");
    expect(captured, "nothing contacted the peer").toEqual([]);
    expect(fs.existsSync(path.join(alpha.dataDir, "remote-collaboration", "peers.json")) ? (await readJson(path.join(alpha.dataDir, "remote-collaboration", "peers.json"))).peers : [], "nothing recorded").toEqual([]);
    record("RC-01", { inbound: { start, message }, addWhileOff: addWhileOff.errors?.[0] });
  }, 120_000);

  it("RC-02 AC-101: on a fresh node with the switch off, delegate_task naming a peer is refused 'turned off' and nothing is sent", async () => {
    const solo = await createStandalone(alpha, defs.delegator, "alpha standalone delegator");
    ids.solo = solo.runId;
    const before = captured.length;
    const off = await delegateRemote(solo, "Never sent.");
    expect(off.delegated, JSON.stringify(off)).toBe(false);
    expect(textOf(off)).toBe("Remote collaboration is turned off on this node, so nothing was sent to another node.");
    expect(captured.length, "nothing sent with the switch off").toBe(before);
    record("RC-02", { delegateOff: textOf(off) });
  }, 120_000);

  it("RC-03 AC-101/102/111, 245 AC-207, 437 NAS-19: switched on, the nodes pair with one invite and each pins the other's identity; bad URLs record nothing; the gateway admits in order; there is no publish API", async () => {
    for (const node of [alpha, beta]) {
      expect((await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled source}}`)).setRemoteCollaborationEnabled).toEqual({ enabled: true, source: "SERVER_SETTING" });
      expect(fs.readFileSync(path.join(node.dataDir, ".env"), "utf8")).toMatch(/^ENABLE_REMOTE_COLLABORATION=true$/m);
    }
    // After turning it on, the caller is still not paired: beta's gate refuses its signature (autobyteus-437 NAS-21).
    const unregisteredCaller = await beta.post(PATHS.messages, inboundMessage(alpha.nodeId, beta.nodeId, "collabmsg_unregistered"));
    expect(unregisteredCaller).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
    // autobyteus-437 NAS-19: one invite (beta's), accepted on alpha, pairs both; each found the other at its own address.
    const paired = await pairNodes({ inviter: (query, variables) => beta.gql(query, variables), accepter: (query, variables) => alpha.gql(query, variables),
      inviterName: LABEL.beta, accepterName: LABEL.alpha });
    expect(paired).toMatchObject({ nodeId: beta.nodeId, name: LABEL.beta, baseUrl: beta.baseUrl, paired: true });
    const secretOnAlpha = await alpha.peerSecretOf(beta.nodeId);
    expect(secretOnAlpha, "both nodes hold the one peer secret").toBeTruthy();
    expect(await beta.peerSecretOf(alpha.nodeId)).toBe(secretOnAlpha);
    ids.peerSecret = secretOnAlpha;
    // Each node then reaches the other through its capturing proxy (the address check pins the node ID).
    const statusBefore = captured.length;
    const changeAddress = `mutation($id:String!,$u:String!){changePeerAddress(nodeId:$id,baseUrl:$u){nodeId name baseUrl addedAt paired}}`;
    const added = (await alpha.gql(changeAddress, { id: beta.nodeId, u: toBeta.url })).changePeerAddress;
    expect(added).toMatchObject({ nodeId: beta.nodeId, name: LABEL.beta, baseUrl: toBeta.url, paired: true });
    const addedOnBeta = (await beta.gql(changeAddress, { id: alpha.nodeId, u: toAlpha.url })).changePeerAddress;
    expect(addedOnBeta).toMatchObject({ nodeId: alpha.nodeId, name: LABEL.alpha, baseUrl: toAlpha.url, paired: true });
    expect(captured.slice(statusBefore).map((entry) => `${entry.via} ${entry.method} ${entry.path}`)).toEqual([`toBeta GET ${PATHS.status}`, `toAlpha GET ${PATHS.status}`]);

    // A URL that answers but is not an AutoByteus node, and a URL nothing listens on.
    // A web page (a router's admin page) and a web server without the route (404) are reached but are not AutoByteus nodes.
    const foreign = http.createServer((req, res) => {
      if (req.headers.host?.endsWith(":404") || req.url?.includes("missing")) { res.writeHead(404, { "content-type": "text/html" }); res.end("<html>Not Found</html>"); return; }
      res.writeHead(200, { "content-type": "text/html" }); res.end("<html>router admin</html>");
    });
    const foreignPort = await getFreePort();
    await new Promise<void>((resolve) => foreign.listen(foreignPort, "127.0.0.1", () => resolve()));
    // autobyteus-437: an address is checked the same way when the owner changes a peer's address.
    const addPeer = (baseUrl: string, _name: string) => alpha.gqlRaw(`mutation($id:String!,$u:String!){changePeerAddress(nodeId:$id,baseUrl:$u){nodeId}}`,
      { id: beta.nodeId, u: baseUrl });
    const notAutobyteus = await addPeer(`http://127.0.0.1:${foreignPort}`, "router");
    const notFound = await addPeer(`http://127.0.0.1:${foreignPort}/missing`, "web");
    await new Promise<void>((resolve) => foreign.close(() => resolve()));
    const dead = await addPeer(`http://127.0.0.1:${await getFreePort()}`, "nowhere");
    for (const [refused, url] of [[notAutobyteus, `http://127.0.0.1:${foreignPort}`], [notFound, `http://127.0.0.1:${foreignPort}/missing`]] as const) {
      expect(refused.errors?.[0]?.message, JSON.stringify(refused)).toBeTruthy();
      expect.soft(refused.errors?.[0], `${url} is reached but is not an AutoByteus node`).toMatchObject({ message: `${url} is not an AutoByteus node.`, extensions: { code: "PEER_NOT_AUTOBYTEUS" } });
    }
    expect(dead.errors?.[0]?.extensions?.code, JSON.stringify(dead)).toBe("PEER_UNREACHABLE");
    expect(dead.errors?.[0]?.message).toMatch(/could not be reached/);

    // Rename (the agents' `node` follows the label) and back.
    expect((await alpha.gql(`mutation($id:String!,$n:String!){renamePeerNode(nodeId:$id,name:$n){name}}`, { id: beta.nodeId, n: "beta-renamed" })).renamePeerNode.name).toBe("beta-renamed");
    expect((await alpha.gql(`mutation($id:String!,$n:String!){renamePeerNode(nodeId:$id,name:$n){name}}`, { id: beta.nodeId, n: LABEL.beta })).renamePeerNode.name).toBe(LABEL.beta);

    for (const [node, peer, url, label] of [[alpha, beta, toBeta.url, LABEL.beta], [beta, alpha, toAlpha.url, LABEL.alpha]] as const) {
      const listed = (await node.gql(`query{peerNodes{nodeId name baseUrl addedAt}}`)).peerNodes as Rec[];
      expect(listed.map(({ nodeId, name, baseUrl }) => ({ nodeId, name, baseUrl }))).toEqual([{ nodeId: peer.nodeId, name: label, baseUrl: url }]);
      const file = await readJson(path.join(node.dataDir, "remote-collaboration", "peers.json"));
      expect(sortedKeys(file)).toEqual(["peers"]);
      expect(file.peers).toHaveLength(1);
      expect(sortedKeys(file.peers[0])).toEqual(["addedAt", "baseUrl", "name", "nodeId", "peerSecret"]);
      expect(file.peers[0]).toMatchObject({ nodeId: peer.nodeId, name: label, baseUrl: url });
    }
    // The single gateway entry of each request kind applies its checks in order (REQ-114): toNodeId, then the caller.
    const wrongTo = "srv_someone_else_000000000000000000000";
    const mismatchStart = await beta.post(PATHS.runs, inboundStart(alpha.nodeId, wrongTo));
    const mismatchMessage = await beta.post(PATHS.messages, inboundMessage(alpha.nodeId, wrongTo, "collabmsg_wrong_to"));
    for (const answer of [mismatchStart, mismatchMessage]) expect(answer).toEqual({ status: 200, answer: { accepted: false, nodeId: beta.nodeId, code: "PEER_IDENTITY_MISMATCH", message: "This request was meant for another node." } });
    // autobyteus-437: a node that is not a peer cannot sign; the gate refuses it before the gateway (NAS-21).
    const unregisteredStart = await beta.post(PATHS.runs, inboundStart("srv_unregistered_00000000000000000000000", beta.nodeId));
    expect(unregisteredStart).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
    const malformedStart = await beta.post(PATHS.runs, { fromNodeId: alpha.nodeId });
    const malformedMessage = await beta.post(PATHS.messages, { ...inboundMessage(alpha.nodeId, beta.nodeId, "collabmsg_bad"), kind: "command" });
    for (const answer of [malformedStart, malformedMessage]) {
      expect(answer.status).toBe(400);
      expect(answer.answer).toMatchObject({ accepted: false, nodeId: beta.nodeId, code: "REMOTE_REQUEST_INVALID" });
    }

    // No publishing (245 REQ-208, DEC-206): the publish API is gone, the old request field is malformed, and the leftover
    // published-agents.json is neither rewritten nor read.
    const publishQuery = await beta.gqlRaw(`query{publishedAgents{address}}`);
    expect(publishQuery.errors?.[0]?.message, JSON.stringify(publishQuery)).toMatch(/Cannot query field "publishedAgents"/);
    const oldField = await beta.post(PATHS.runs, { fromNodeId: alpha.nodeId, toNodeId: beta.nodeId, publishedAddress: "/publisher",
      delegator: { agentRunId: "agent_probe" }, delegatingRun: { kind: "agent", runId: "agent_probe" },
    task: { text: "x", title: "x", taskKey: null, projectId: null, taskId: null } });
    expect(oldField.status, JSON.stringify(oldField)).toBe(400);
    expect(oldField.answer).toMatchObject({ accepted: false, nodeId: beta.nodeId, code: "REMOTE_REQUEST_INVALID" });
    expect((await fsp.readdir(path.join(beta.dataDir, "remote-collaboration"))).sort(), "beta writes only peers.json").toEqual(["peers.json", "published-agents.json"]);
    // The receipt never holds the peer secret (QR-001).
    const withoutSecrets = async (node: NodeServer) => ({ peers: ((await readJson(path.join(node.dataDir, "remote-collaboration", "peers.json"))).peers as Rec[])
      .map(({ peerSecret: _secret, ...peer }) => peer) });
    record("RC-03", { unregisteredCaller, alphaPeers: await withoutSecrets(alpha), betaPeers: await withoutSecrets(beta),
      notAutobyteus: notAutobyteus.errors?.[0], notFound: notFound.errors?.[0], dead: dead.errors?.[0],
      gateway: { mismatchStart, mismatchMessage, unregisteredStart, malformedStart, malformedMessage },
      noPublishing: { publishQuery: publishQuery.errors?.[0]?.message, oldField } });
  }, 120_000);

  it("RC-04 245 AC-202/203/204/207: beta refuses each target it can't start, with the reason, before anything starts; nothing is left on alpha", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const leftoverBytes = await fsp.readFile(leftoverPublishedFile(), "utf8");
    // The team-local fixture is a real Team definition on beta (so its refusal is about eligibility, not a missing file).
    const fieldTeam = (await beta.gql(`query{agentTeamDefinition(id:"field-team"){name nodes{memberName ref refScope}}}`)).agentTeamDefinition;
    expect(fieldTeam).toEqual({ name: "Field Team", nodes: [{ memberName: "scout", ref: "local-scout", refScope: "TEAM_LOCAL" }] });
    const runsBefore = await remoteRunDirs();
    const teamRunsBefore = await betaTeamRunDirs();
    const taskRecordsBefore = await alphaTaskRecordFiles();
    const linksBefore = await linksOf("agent", ids.solo);
    const delegateTo = (address: string) => calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: address, description: `Work for ${address}.` });
    const node = LABEL.beta;
    const notFound = (address: string) => TEXT_261.notFound(node, address);
    const cases: Array<[string, string, string | RegExp]> = [
      // AC-202: no default, and only a runtime (incomplete). Blank Slate is also "published" in the leftover file (AC-207).
      ["/blank_slate", "NO_DEFAULT_RUNTIME", `There is no default runtime configured for the target agent Blank Slate on node "${node}", and Model Routing is off on node "${node}".`],
      ["/half_set", "NO_DEFAULT_RUNTIME", `There is no default runtime configured for the target agent Half Set on node "${node}", and Model Routing is off on node "${node}".`],
      // AC-203: the default's runtime is unavailable on beta; the default's model is not offered there.
      ["/codex_writer", "AGENT_CANNOT_RUN", new RegExp(`^The Agent Codex Writer on node "${node}" cannot run there: .+`)],
      // autobyteus-500 FU-030: a peer's refusal keeps only the peer's reason (its next step names the peer's settings).
      ["/fragile", "AGENT_CANNOT_RUN", `The Agent Fragile on node "${node}" cannot run there: its default model cannot be used: 'no-such-model' is no longer offered by Antigravity CLI, and Model Routing is off on node "${node}".`],
      // AC-204: the Model Router (never a collaborator, 455 REQ-002), an Agent Org, a team-local Agent and an unknown address
      // are not delegable targets.
      ["/model_router", "AGENT_NOT_FOUND", notFound("/model_router")],
      ["/remote_org_b", "AGENT_NOT_FOUND", notFound("/remote_org_b")],
      ["/local_scout", "AGENT_NOT_FOUND", notFound("/local_scout")],
      ["/nobody_here", "AGENT_NOT_FOUND", notFound("/nobody_here")],
      // 247 AC-302: a Team with an agent covered by no default, and a Team default on an unavailable runtime (261 AC-406 wording).
      ["/hollow_team", "NO_DEFAULT_RUNTIME", `There is no default runtime configured for the target agent team Hollow Team on node "${node}", and Model Routing is off on node "${node}".`],
      ["/codex_team", "AGENT_CANNOT_RUN", new RegExp(`^The Agent Team Codex Team on node "${node}" cannot run there: Codex App Server command '.+' is not available, and Model Routing is off on node "${node}"\\.$`)],
    ];
    // 261 DEC-407: beta's refusal names the target's kind and name (`target`, which replaced `targetName`).
    const targets: Record<string, Rec> = { "/blank_slate": { kind: "agent", name: "Blank Slate" }, "/half_set": { kind: "agent", name: "Half Set" },
      "/codex_writer": { kind: "agent", name: "Codex Writer" }, "/fragile": { kind: "agent", name: "Fragile" },
      "/hollow_team": { kind: "agent_team", name: "Hollow Team" }, "/codex_team": { kind: "agent_team", name: "Codex Team" } };
    const results: Rec = {};
    for (const [address, code, text] of cases) {
      const sentBefore = captured.length;
      const result = await delegateTo(address);
      results[address] = { text: textOf(result), answer: remoteRequests(sentBefore).find((entry) => entry.path === PATHS.runs)?.answer };
      expect(result.delegated, `${address}: ${JSON.stringify(result)}`).toBe(false);
      if (typeof text === "string") expect(textOf(result), address).toBe(text); else expect(textOf(result), address).toMatch(text);
      expect((results[address].answer as Rec)?.code, `${address}: beta's code`).toBe(code);
      expect((results[address].answer as Rec)?.target, `${address}: beta's target`).toEqual(targets[address]);
      expect(results[address].answer as Rec, `${address}: no targetName`).not.toHaveProperty("targetName");
      expect(remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.messages), `${address}: no work packet`).toEqual([]);
    }
    expect(await remoteRunDirs(), "nothing started (or prepared) on beta").toEqual(runsBefore);
    expect(await betaTeamRunDirs(), "no Team run created on beta").toEqual(teamRunsBefore);
    expect(await alphaTaskRecordFiles(), "no Task record on alpha").toEqual(taskRecordsBefore);
    expect(await linksOf("agent", ids.solo), "no link on alpha").toEqual(linksBefore);
    expect(await fsp.readFile(leftoverPublishedFile(), "utf8"), "the leftover file is untouched").toBe(leftoverBytes);
    record("RC-04", { results });
  }, 300_000);

  it("RC-05 AC-104/105: a standalone delegator delegates to Publisher on beta and the two runs message each other both ways (view open)", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const view = await connect(alpha, "agent-collaboration", ids.solo, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const delegated = await delegateRemote(solo, "Publish the draft. Marker STANDALONE-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent", node: LABEL.beta });
    const r1 = delegated.target_agent_run_id as string;
    ids.r1 = r1; ids.r1Task = delegated.task_id;
    const remote = composeOnBeta(r1);

    // On beta: an ordinary standalone run of Publisher with its own default runtime and model (not the leftover file's),
    // beta's temp workspace and tools auto-approved (245 AC-201, AC-205, AC-207), and its back-link.
    const metadata = await betaMetadata(r1);
    expect(metadata).toMatchObject({ runId: r1, agentDefinitionId: defs.publisher, workspaceRootPath: betaTempWorkspace(), llmModelIdentifier: MODEL,
      autoExecuteTools: true, runtimeKind: "antigravity_cli" });
    // The peer-started run's back-link names its delegator's run, one hop (contract E10: coordinatingRun → delegatingRun).
    expect(metadata.delegatedFrom).toEqual({ nodeId: alpha.nodeId, delegatingRun: { kind: "agent", runId: ids.solo }, delegatorAgentRunId: ids.solo });
    expect(metadata.taskAgent, "a remote run is not a task agent's own file").toBeUndefined();
    const packet = await receives(remote, "STANDALONE-PACKET");
    expect(packet).toContain(`You have a new task from the agent with sender run id "${ids.solo}" on node "${LABEL.alpha}".`);
    expect((await beta.launches()).some((launch) => launch.cwd.includes(r1) && launch.argv.includes(MODEL))).toBe(true);

    // On alpha: the link in the delegator's tree (exact keys) and the Task record of the remote run.
    const links = await linksOf("agent", ids.solo);
    expect(links).toEqual([{ address: "/publisher", agentRunId: r1, nodeId: beta.nodeId, delegatorAgentRunId: ids.solo, startedAt: expect.any(String) }]);
    // Contract §3.1 / SR-038: a peer's launches are its own facts on its node; alpha's entry keeps none.
    expect(sortedKeys(links[0]!)).toEqual(["address", "agentRunId", "delegatorAgentRunId", "nodeId", "startedAt"]);
    const resources = await taskResourcesWith(alpha, r1);
    expect(resources, JSON.stringify(resources)).toHaveLength(1);
    expect(resources[0]!.entry).toMatchObject({ role: "assigned", delegatedFrom: { delegatingRun: { kind: "agent", runId: ids.solo }, delegatorAgentRunId: ids.solo }, agentRun: { kind: "agent", agentRunId: r1 }, start: "started" });
    expect(fs.existsSync(path.join(alpha.memory, "agents", r1)), "no folder for the remote run on alpha").toBe(false);

    // Reply from beta (its owner asks the remote run to answer), then a follow-up from alpha.
    // 269 AC-601: before any owner message, beta's history titles the run with the delegated description (not the wrapper).
    const titleBeforeOwner = await titledOnBeta("agent", r1, "Publish the draft. Marker STANDALONE-PACKET.");
    const reply = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "REPLY-FROM-BETA-1" });
    expect(reply, JSON.stringify(reply)).toMatchObject({ accepted: true });
    expect(textOf(reply)).toContain(`on node "${LABEL.alpha}"`);
    const received = await receives(solo, "REPLY-FROM-BETA-1");
    expect(received).toContain(`You received a message from the agent with sender run id "${r1}" on node "${LABEL.beta}".`);
    const followUp = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: r1, content: "FOLLOWUP-FROM-ALPHA-1" });
    expect(followUp, JSON.stringify(followUp)).toMatchObject({ accepted: true });
    expect(textOf(followUp)).toBe(`Delivered message to ${r1} on node "${LABEL.beta}".`);
    const atBeta = await receives(remote, "FOLLOWUP-FROM-ALPHA-1");
    expect(atBeta).toContain(`You received a message from the agent with sender run id "${ids.solo}" on node "${LABEL.alpha}".`);

    // 269: the owner's message and the peer's follow-up don't replace the title.
    expect(await betaTitle("agent", r1), "the title after an owner message and a peer message").toBe(titleBeforeOwner);
    const replyLogs = await assertBothLogs("REPLY-FROM-BETA-1", remote, solo);
    const followUpLogs = await assertBothLogs("FOLLOWUP-FROM-ALPHA-1", solo, remote);
    // Contract TC-13: every agent run logs in its own folder (no `collaboration/` subfolder).
    expect(replyLogs.files).toEqual({ beta: `memory/agents/${r1}/communication_messages_active.jsonl`, alpha: `memory/agents/${ids.solo}/communication_messages_active.jsonl` });
    // autobyteus-565 form 5 (a linked remote run): each line records the other agent and its node (REQ-007).
    expect(replyLogs.counterparts).toEqual({ beta: { address: "/delegator", nodeId: alpha.nodeId }, alpha: { address: "/publisher", nodeId: beta.nodeId } });
    // Live in solo's own Messages (REQ-004), once each, naming the remote agent with this node's name for beta (the chip).
    await until(() => ["REPLY-FROM-BETA-1", "FOLLOWUP-FROM-ALPHA-1"].every((marker) => viewMessagesWith(view, marker).length > 0), "both remote messages in solo's own Messages", 20_000);
    await wait(2_000);
    const remoteRows = ["REPLY-FROM-BETA-1", "FOLLOWUP-FROM-ALPHA-1"].map((marker) => viewMessagesWith(view, marker));
    expect(remoteRows.map((rows) => rows.length), "each remote message once").toEqual([1, 1]);
    const remoteParty = { agentRunId: r1, address: "/publisher", nodeName: LABEL.beta };
    const soloParty = { agentRunId: ids.solo, address: "/delegator", nodeName: null };
    expect(remoteRows.map((rows) => (rows[0]!.payload as Rec).event.parties)).toEqual([{ sender: remoteParty, receiver: soloParty }, { sender: soloParty, receiver: remoteParty }]);
    // Stored (after a reload), on both nodes: both rows, the counterpart named with the other node's chip (AC-002, AC-006).
    const soloPage = await teamTab(alpha, "agent", ids.solo, ids.solo);
    const r1Page = await teamTab(beta, "agent", r1, r1);
    for (const [page, label] of [[soloPage, "solo"], [r1Page, "r1"]] as const) {
      expect(page.messages.filter((message) => ["REPLY-FROM-BETA-1", "FOLLOWUP-FROM-ALPHA-1"].includes(String(message.content))).length, label).toBe(2);
    }
    expect(soloPage.counterparts).toContainEqual({ kind: "remote", agentRunId: r1, address: "/publisher", nodeName: LABEL.beta });
    expect(r1Page.counterparts).toContainEqual({ kind: "remote", agentRunId: ids.solo, address: "/delegator", nodeName: LABEL.alpha });
    record("RC-05 565", { counterparts: replyLogs.counterparts, liveParties: remoteRows.map((rows) => (rows[0]!.payload as Rec).event.parties),
      soloCounterparts: soloPage.counterparts, r1Counterparts: r1Page.counterparts });
    const sequences = sequenceCheck(view.frames, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    // Since autobyteus-565 the standalone root's own view carries the remote exchange (above), contiguously.
    expect(sequences.sequenced, "the remote messages were sequenced events of solo's view").toBeGreaterThan(0);
    expect(view.closed(), "the view stream stays open").toBeNull();
    // Every request kind of the contract was exchanged, so RC-20 audits each of them.
    const kinds = new Set(remoteRequests().filter((entry) => entry.status === 200).map((entry) => entry.path === PATHS.runs ? "start"
      : (entry.body as Rec).kind === "work_packet" ? "work_packet" : `message ${entry.via}`));
    expect([...kinds].sort()).toEqual(["message toAlpha", "message toBeta", "start", "work_packet"]);
    record("RC-05", { titleBeforeOwner, delegated, metadata, packet, link: links[0], taskResource: resources[0], reply, received, followUp, atBeta, replyLogs, followUpLogs, sequences });
  }, 240_000);

  it("RC-06 AC-104/105/107, 492 DS-006, 587 RF-14: a Team coordinator delegates; messages both ways with the Team view open; a later local message appears; the other member is told to name the node, then reaches the remote run unlinked while it runs", async () => {
    const created = (await alpha.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: defs.team, teamConfigs: [{ teamAddress: "/", ...runConfig(alpha) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: defs.delegator, ...runConfig(alpha) },
        { memberAddress: "/mate", agentDefinitionId: defs.delegator, ...runConfig(alpha) }] } })).createAgentTeamRun;
    expect(created.success, created.message).toBe(true);
    const teamRunId = created.teamRunId as string;
    const members = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    ids.team = { teamRunId, lead: members["/lead"], mate: members["/mate"] };
    const lead = teamActor(alpha, teamRunId, members["/lead"]!, "alpha team lead");
    const mate = teamActor(alpha, teamRunId, members["/mate"]!, "alpha team mate");
    const view = await connect(alpha, "agent-team", teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));

    const delegated = await delegateRemote(lead, "Team work. Marker TEAM-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta });
    const r2 = delegated.target_agent_run_id as string;
    ids.team.r2 = r2;
    const remote = composeOnBeta(r2);
    expect((await betaMetadata(r2)).delegatedFrom).toEqual({ nodeId: alpha.nodeId, delegatingRun: { kind: "agent_team", runId: teamRunId }, delegatorAgentRunId: lead.runId });
    expect(await receives(remote, "TEAM-PACKET")).toContain(`sender run id "${lead.runId}" on node "${LABEL.alpha}"`);
    expect(await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: lead.runId, content: "REPLY-TO-TEAM-LEAD" })).toMatchObject({ accepted: true });
    expect(await receives(lead, "REPLY-TO-TEAM-LEAD")).toContain(`sender run id "${r2}" on node "${LABEL.beta}"`);
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: r2, content: "FOLLOWUP-FROM-TEAM-LEAD" })).toMatchObject({ accepted: true });
    await receives(remote, "FOLLOWUP-FROM-TEAM-LEAD");
    const replyLogs = await assertBothLogs("REPLY-TO-TEAM-LEAD", remote, lead);
    await assertBothLogs("FOLLOWUP-FROM-TEAM-LEAD", lead, remote);
    expect(replyLogs.files.alpha).toBe(`memory/agent_teams/${teamRunId}/team_communication_messages_active.jsonl`);

    // A local message after the remote exchange still reaches the view.
    expect(await calls(lead, "send_message_to", { target_agent_run_id: mate.runId, content: "LOCAL-AFTER-REMOTE-TEAM" })).toMatchObject({ accepted: true });
    await receives(mate, "LOCAL-AFTER-REMOTE-TEAM");
    await until(() => view.frames.some((frame) => frame.type === "TEAM_COMMUNICATION_MESSAGE" && JSON.stringify(frame.payload).includes("LOCAL-AFTER-REMOTE-TEAM")), "local message on the Team view", 20_000);

    // Same root, not the delegator (autobyteus-492 DS-006, design row 6): the run ID is the address. autobyteus-587 RF-14:
    // a run on another node is always named with node: without it the call is refused with the node to pass, nothing sent;
    // with it the message goes to the remote run unlinked (`run-messages`, no root named) while it runs.
    const sentBefore = captured.length;
    const mateWithoutNode = await calls(mate, "send_message_to", { target_agent_run_id: r2, content: "MATE-TO-REMOTE-NO-NODE" });
    expect(mateWithoutNode, JSON.stringify(mateWithoutNode)).toMatchObject({ accepted: false, code: "NODE_REQUIRED" });
    expect(textOf(mateWithoutNode)).toBe(nodeRequiredText(LABEL.beta));
    expect(sentRequests(sentBefore), "587 RF-14: nothing sent without node").toEqual([]);
    const mateUnlinked = await calls(mate, "send_message_to", { node: LABEL.beta, target_agent_run_id: r2, content: "MATE-TO-REMOTE" });
    expect(mateUnlinked, JSON.stringify(mateUnlinked)).toMatchObject({ accepted: true, target_agent_run_id: r2 });
    expect(textOf(mateUnlinked)).toBe(`Delivered message to ${r2} on node "${LABEL.beta}".`);
    expect(await receives(remote, "MATE-TO-REMOTE")).toContain(`You received a message from the agent with sender run id "${mate.runId}" on node "${LABEL.alpha}".`);
    const mateSent = sentRequests(sentBefore);
    expect(mateSent.map((entry) => `${entry.via} ${entry.path} ${(entry.answer as Rec)?.accepted}`), "one unlinked message, accepted").toEqual([`toBeta ${PATHS.runMessages} true`]);
    expect(mateSent[0]!.body).toMatchObject({ fromNodeId: alpha.nodeId, toNodeId: beta.nodeId, sender: { agentRunId: mate.runId, address: "/mate" }, target: { agentRunId: r2 }, content: "MATE-TO-REMOTE" });
    expect(sortedKeys((mateSent[0]!.body as Rec).sender), "565: the sender's run ID and its address in its own run").toEqual(["address", "agentRunId"]);
    expect(sortedKeys(mateSent[0]!.answer as Rec), "565: the answer names the receiving agent's address").toEqual(["accepted", "nodeId", "receiverAddress"]);
    const mateLogs = await assertBothLogs("MATE-TO-REMOTE", mate, remote);
    expect(mateLogs.files, "each side logs it in its own run's log").toEqual({ alpha: `memory/agent_teams/${teamRunId}/team_communication_messages_active.jsonl`,
      beta: `memory/agents/${r2}/communication_messages_active.jsonl` });

    const teamLinks = await linksOf("agent_team", teamRunId);
    expect(teamLinks).toEqual([{ address: "/publisher", agentRunId: r2, nodeId: beta.nodeId, delegatorAgentRunId: lead.runId, startedAt: expect.any(String) }]);
    const sequences = sequenceCheck(view.frames, "TEAM_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    expect(sequences.sequenced, "the view carried sequenced events during the exchange").toBeGreaterThan(0);
    expect(view.closed(), "the Team view stays open").toBeNull();
    const remoteInView = view.frames.filter((frame) => frame.type === "TEAM_COMMUNICATION_MESSAGE" && JSON.stringify(frame.payload).includes(r2));
    expect(remoteInView, "remote-endpoint messages are not on the Team view").toEqual([]);
    record("RC-06", { teamRunId, delegated, link: teamLinks[0], replyLogs, mateUnlinked: textOf(mateUnlinked), mateRequest: mateSent[0], mateLogs, sequences, frameTypes: view.frames.map((frame) => frame.type) });
  }, 300_000);

  it("RC-07 AC-104/105: an Org member delegates; messages both ways with the Org view open; a later local message appears", async () => {
    const created = (await alpha.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: defs.org, rootConfiguration: runConfig(alpha), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(created.success, created.message).toBe(true);
    const orgRunId = created.agentOrgRunId as string;
    const orgTree = (await alpha.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: orgRunId })).getAgentOrgRunConfig.executionTree;
    const member = (address: string) => (orgTree.rootOrg.members as Rec[]).find((entry) => entry.address === address)!.agentRunId as string;
    ids.org = { orgRunId, lead: member("/lead"), mate: member("/mate") };
    const lead = orgActor(alpha, orgRunId, "/lead", ids.org.lead, "alpha org lead");
    const mate = orgActor(alpha, orgRunId, "/mate", ids.org.mate, "alpha org mate");
    const view = await connect(alpha, "agent-org", orgRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));

    const delegated = await delegateRemote(lead, "Org work. Marker ORG-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta });
    const r5 = delegated.target_agent_run_id as string;
    ids.org.r5 = r5;
    const remote = composeOnBeta(r5);
    expect((await betaMetadata(r5)).delegatedFrom).toEqual({ nodeId: alpha.nodeId, delegatingRun: { kind: "agent_org", runId: orgRunId }, delegatorAgentRunId: lead.runId });
    await receives(remote, "ORG-PACKET");
    expect(await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: lead.runId, content: "REPLY-TO-ORG-LEAD" })).toMatchObject({ accepted: true });
    expect(await receives(lead, "REPLY-TO-ORG-LEAD")).toContain(`sender run id "${r5}" on node "${LABEL.beta}"`);
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: r5, content: "FOLLOWUP-FROM-ORG-LEAD" })).toMatchObject({ accepted: true });
    await receives(remote, "FOLLOWUP-FROM-ORG-LEAD");
    const replyLogs = await assertBothLogs("REPLY-TO-ORG-LEAD", remote, lead);
    await assertBothLogs("FOLLOWUP-FROM-ORG-LEAD", lead, remote);

    expect(await calls(lead, "send_message_to", { target_agent_run_id: mate.runId, content: "LOCAL-AFTER-REMOTE-ORG" })).toMatchObject({ accepted: true });
    await receives(mate, "LOCAL-AFTER-REMOTE-ORG");
    await until(() => view.frames.some((frame) => frame.type !== "ROOT_EXECUTION_VIEW_SNAPSHOT" && JSON.stringify(frame.payload).includes("LOCAL-AFTER-REMOTE-ORG")), "local message on the Org view", 20_000);

    const orgLinks = await linksOf("agent_org", orgRunId);
    expect(orgLinks).toEqual([{ address: "/publisher", agentRunId: r5, nodeId: beta.nodeId, delegatorAgentRunId: lead.runId, startedAt: expect.any(String) }]);
    const sequences = sequenceCheck(view.frames, "ROOT_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    expect(sequences.sequenced, "the view carried sequenced events during the exchange").toBeGreaterThan(0);
    expect(view.closed(), "the Org view stays open").toBeNull();
    record("RC-07", { orgRunId, delegated, link: orgLinks[0], replyLogs, sequences, frameTypes: view.frames.map((frame) => frame.type) });
  }, 300_000);

  it("RC-08 AC-107, 492 REQ-010, 587 RF-14: without node, an unlinked sender on alpha is told the node to pass, one on beta gets the not-running refusal; forged linked messages are refused; the target receives nothing", async () => {
    const other = await createStandalone(alpha, defs.delegator, "alpha other root");
    ids.other = other.runId;
    const sentBefore = captured.length;
    const otherRoot = await calls(other, "send_message_to", { target_agent_run_id: ids.r1, content: "OTHER-ROOT-TO-REMOTE" });
    expect(otherRoot.accepted, JSON.stringify(otherRoot)).toBe(false);
    // Without node, a run on another node that this node's Task records know is refused with the node to pass
    // (autobyteus-587 RF-14, design DS-005: the CrossRun peer-run branch names the node it knows).
    expect(otherRoot.code, JSON.stringify(otherRoot)).toBe("NODE_REQUIRED");
    expect(textOf(otherRoot)).toBe(nodeRequiredText(LABEL.beta));
    expect(sentRequests(sentBefore), "the live-only path never reaches a peer").toEqual([]);

    const bystander = await createStandalone(beta, defs.bystander, "beta bystander");
    ids.bystander = bystander.runId;
    const fromBystander = await calls(bystander, "send_message_to", { target_agent_run_id: ids.solo, content: "BYSTANDER-TO-ALPHA" });
    expect(fromBystander.accepted, JSON.stringify(fromBystander)).toBe(false);
    expect(textOf(fromBystander)).toBe(notRunningRefusal(ids.solo));
    expect(sentRequests(sentBefore)).toEqual([]);

    // Requests a peer could send for runs that are not linked: refused at the receiving root, nothing written.
    // Every message names the root that receives it (247 contract): a standalone run is its own root.
    const forged = (fromNodeId: string, toNodeId: string, sender: string, target: string, messageId: string, targetRoot: Rec = { kind: "agent", runId: target }) => ({
      fromNodeId, toNodeId, kind: "message", messageId, sender: { agentRunId: sender, address: "/forger" }, target: { agentRunId: target }, targetRoot,
      content: `FORGED ${messageId}`, messageType: "agent_message", createdAt: new Date().toISOString(), files: [] });
    const toBystander = await beta.post(PATHS.messages, forged(alpha.nodeId, beta.nodeId, ids.solo, ids.bystander, "collabmsg_forged_bystander"));
    const toR1FromOther = await beta.post(PATHS.messages, forged(alpha.nodeId, beta.nodeId, ids.other, ids.r1, "collabmsg_forged_r1"));
    const toSoloFromBystander = await alpha.post(PATHS.messages, forged(beta.nodeId, alpha.nodeId, ids.bystander, ids.solo, "collabmsg_forged_solo", { kind: "agent", runId: ids.solo }));
    for (const answer of [toBystander, toR1FromOther, toSoloFromBystander]) {
      expect(answer.status).toBe(200);
      expect(answer.answer, JSON.stringify(answer)).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
    }
    await neverReceives(bystander, "FORGED", 1_000);
    await neverReceives(composeOnBeta(ids.r1), "FORGED", 0);
    await neverReceives(standaloneActor(alpha, ids.solo, "solo"), "FORGED", 0);
    for (const id of ["collabmsg_forged_bystander", "collabmsg_forged_r1", "collabmsg_forged_solo"]) {
      expect([...await logLines(alpha, id), ...await logLines(beta, id)], id).toEqual([]);
    }
    expect(fs.existsSync(path.join(beta.memory, "agents", ids.bystander, "collaboration")), "no collaboration package for the bystander").toBe(false);
    record("RC-08", { otherRoot: textOf(otherRoot), fromBystander: textOf(fromBystander), forged: { toBystander, toR1FromOther, toSoloFromBystander } });
  }, 240_000);

  it("RC-09 AC-108, 587 AC-004, 591 REQ-006: a saved Task to a new remote run and a saved Task with files to an existing remote run are refused; a file outside the workspace, a link leading out of it and a folder are refused before anything is sent", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    // autobyteus-587 RF-3: only files inside the sending agent's workspace go to another node (links resolved); a folder never.
    const outside = path.join(root, "alpha", "outside-secret.txt");
    await fsp.writeFile(outside, "not for another node");
    const linkOut = path.join(alpha.workspace, "link-to-outside.txt");
    await fsp.symlink(outside, linkOut).catch(() => undefined);
    const folder = path.join(alpha.workspace, "drafts-folder");
    await fsp.mkdir(folder, { recursive: true });
    const projectId = (await alpha.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "RC-09 project" } })).createProject.projectId as string;
    const taskId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, title: "Saved work.", description: "Saved work." } })).createProjectTask.taskId as string;
    // autobyteus-591 REQ-006: a saved Task can now be given to an existing remote run, but not one with files (transfer is
    // autobyteus-587): a Task whose context holds a file, attached as the Task page does (a draft, an upload, the save).
    const draft = await (await fetch(`${alpha.baseUrl}/rest/projects/${projectId}/task-context-drafts`, { method: "POST", headers: { "content-type": "application/json" }, body: "{}" })).json() as Rec;
    const form = new FormData();
    form.set("file", new Blob(["Saved notes."], { type: "text/plain" }), "saved-notes.txt");
    const uploaded = await (await fetch(`${alpha.baseUrl}/rest/projects/${projectId}/task-context-drafts/${draft.draftId}/context-files`, { method: "POST", body: form })).json() as Rec;
    expect(uploaded.storedFilename, JSON.stringify(uploaded)).toBeTruthy();
    const taskWithFileId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, title: "Saved work with notes.",
      description: "Saved work with notes.", contextDraft: { draftId: draft.draftId, storedFilenames: [uploaded.storedFilename] } } })).createProjectTask.taskId as string;
    const r1EntriesBefore = (await taskResourcesWith(alpha, ids.r1)).length;
    const sentBefore = captured.length;
    const runsBefore = await remoteRunDirs();
    const withOutside = await delegateRemote(solo, "With a file from outside.", { reference_files: [outside] });
    const withLinkOut = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "WITH-LINK-OUT", reference_files: [linkOut] });
    const withFolder = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "WITH-FOLDER", reference_files: [folder] });
    const savedTask = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", task_id: taskId });
    const existingCopy = await calls(solo, "delegate_task", { target_agent_run_id: ids.r1, task_id: taskWithFileId });
    expect(withOutside.delegated, JSON.stringify(withOutside)).toBe(false);
    expect(textOf(withOutside)).toBe(`${outside} is outside your workspace, so nothing was sent. Only files in your workspace (${alpha.workspace}) can go to another node; copy the file there first.`);
    expect(withLinkOut, JSON.stringify(withLinkOut)).toMatchObject({ accepted: false, code: "REFERENCE_FILE_OUTSIDE_WORKSPACE" });
    expect(textOf(withLinkOut)).toContain("is outside your workspace, so nothing was sent.");
    expect(withFolder, JSON.stringify(withFolder)).toMatchObject({ accepted: false, code: "REFERENCE_FILE_NOT_A_FILE" });
    expect(textOf(withFolder)).toBe(`${folder} is a folder, so nothing was sent. Send files, not folders (zip it first).`);
    expect(textOf(savedTask)).toBe("A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead.");
    // 591 DN-8 with 587: a saved Task may go to the existing run on beta, but its files are the Task's, not the sender's workspace's.
    expect(textOf(existingCopy), "the Task's file can't go to the run on beta").toBe("A saved Task with reference files can't be given to an agent on another node, so nothing was given. Give it a Task without files, and send the files with send_message_to and node.");
    for (const result of [savedTask, existingCopy]) expect(result.delegated, JSON.stringify(result)).toBe(false);
    expect(remoteRequests(sentBefore).filter((entry) => entry.path !== PATHS.runSummaries), "nothing sent, not even a file status").toEqual([]);
    expect(await remoteRunDirs(), "nothing started").toEqual(runsBefore);
    await neverReceives(composeOnBeta(ids.r1), "WITH-", 1_000);
    const tasks = (await alpha.gql(`query($id:String!){projectTasks(projectId:$id){taskId status root{kind}}}`, { id: projectId })).projectTasks as Rec[];
    for (const id of [taskId, taskWithFileId]) expect(tasks.find((entry) => entry.taskId === id), "the saved Tasks are unchanged (no assignment)").toMatchObject({ status: "TODO", root: null });
    expect((await taskResourcesWith(alpha, ids.r1)).length, "r1 got no new Task entry").toBe(r1EntriesBefore);
    record("RC-09", { withOutside: textOf(withOutside), withLinkOut: textOf(withLinkOut), withFolder: textOf(withFolder), savedTask: textOf(savedTask), existingCopy: textOf(existingCopy) });
  }, 240_000);

  it("RC-10 AC-109, 591 REQ-001: a task agent on a Project Task delegates remotely; the remote run is a run of that Task; after DONE beta stops it and its messages are not delivered", async () => {
    const manager = await createStandalone(alpha, defs.manager, "alpha manager");
    ids.manager = manager.runId;
    const projectId = (await alpha.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "RC-10 project" } })).createProject.projectId as string;
    const taskId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, title: "Delegate the project work to beta",
      description: callTool("delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Project work. Marker PROJECT-PACKET." }) } })).createProjectTask.taskId as string;
    const assigned = await calls(manager, "delegate_task", { recipient_address: "/remote_worker", task_id: taskId });
    expect(assigned, JSON.stringify(assigned)).toMatchObject({ delegated: true });
    const workerRunId = assigned.target_agent_run_id as string;
    const worker: Actor = { node: alpha, label: "alpha task agent", runId: workerRunId,
      // The worker is a run of its own (autobyteus-461 rule 2): read by its own run ID.
      conversation: async () => (await alpha.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: workerRunId })).getRunProjection?.conversation,
      send: async () => { throw new Error("not used"); } };
    // The worker's Task work makes it delegate to beta. Its delegate_task result returns only after the work packet was
    // accepted (RemoteTaskActivation.acceptSeed), so the remote run is taken from that result: a run that beta has only
    // prepared is not yet an admitted run package, and its views answer "unavailable" until the packet starts it.
    let workerCalls: string[] = [];
    await until(async () => (workerCalls = calledResults(await worker.conversation())).length > 0, "the task agent's delegate_task result", 90_000);
    const workerResult = toolResult(workerCalls[0]!);
    expect(workerResult, JSON.stringify(workerResult)).toMatchObject({ delegated: true, node: LABEL.beta });
    expect(workerResult.task_id, "sub-work of Task work stays that Task's").toBeUndefined();
    const r3 = workerResult.target_agent_run_id as string;
    const remote = composeOnBeta(r3);
    await receives(remote, "PROJECT-PACKET");
    // One hop: the worker's own run delegated r3 (contract P3, E10).
    expect((await betaMetadata(r3)).delegatedFrom).toEqual({ nodeId: alpha.nodeId, delegatingRun: { kind: "agent", runId: workerRunId }, delegatorAgentRunId: workerRunId });

    const resources = await taskResourcesWith(alpha, r3);
    expect(resources, JSON.stringify(resources)).toHaveLength(1);
    expect(resources[0]!.file).toContain(path.join("projects", projectId, "tasks"));
    expect(resources[0]!.entry).toMatchObject({ role: "subWork", delegatedFrom: { delegatingRun: { kind: "agent", runId: workerRunId }, delegatorAgentRunId: workerRunId }, agentRun: { kind: "agent", agentRunId: r3 } });
    // The hosting tree file is gone (contract §6); the Task entry above is the record of the peer delegation.

    expect(await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: workerRunId, content: "BEFORE-DONE-TO-WORKER" })).toMatchObject({ accepted: true });
    await receives(worker, "BEFORE-DONE-TO-WORKER");
    const closedAt = Date.now();
    const done = await calls(manager, "update_task", { task_id: taskId, status: "DONE" });
    expect(done, JSON.stringify(done)).toMatchObject({ task: { projectId, status: "DONE" } });
    expect(JSON.stringify(done), "nothing says the remote run was stopped (AR-007)").not.toMatch(/stopped/i);
    // autobyteus-591 REQ-001: the sub-work run of the closed Task stops on beta (the close does not wait for it).
    const stoppedMs = await stoppedOnBeta([r3], closedAt, "r3 after its Task's DONE");
    await until(async () => (await closedOnBeta()).some((entry) => entry.runId === r3), "beta records r3 closed", 10_000);
    // Its owner on beta messages it: it wakes (REQ-004) and its message to the worker is refused, the Task being closed.
    const afterDone = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: workerRunId, content: "AFTER-DONE-TO-WORKER" });
    expect(afterDone.accepted, JSON.stringify(afterDone)).toBe(false);
    expect(textOf(afterDone)).toMatch(/DONE or CANCELLED|closed/i);
    await neverReceives(worker, "AFTER-DONE-TO-WORKER", 3_000);
    const lastMessage = remoteRequests().filter((entry) => entry.path === PATHS.messages && JSON.stringify(entry.body).includes("AFTER-DONE-TO-WORKER")).at(-1);
    expect((lastMessage?.answer as Rec)?.code, JSON.stringify(lastMessage)).toBe("TASK_AGENT_RESOURCE_CLOSED");
    ids.r3 = r3;
    record("RC-10", { projectId, taskId, workerRunId, r3, workerResult, taskResource: resources[0], link: resources[0]?.entry, afterDone: textOf(afterDone), refusalAnswer: lastMessage?.answer, stoppedMs });
  }, 300_000);

  it("RC-11 AC-109, 591 AC-001/AC-006/REQ-004: after the delegator sets its Task DONE, beta stops the remote run within 30 s, records it and drops it from its list; alpha keeps it, offline, under the delegator and on the Task; messages to it are refused; a later message on beta wakes it", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const delegated = await delegateRemote(solo, "Ad hoc work. Marker ADHOC-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
    const r4 = delegated.target_agent_run_id as string;
    const remote = composeOnBeta(r4);
    await receives(remote, "ADHOC-PACKET");
    expect(await processLive(r4), "r4 runs on beta").toBe(true);
    expect(await betaListed(r4), "beta lists r4").toBe(true);
    const r4Status = await runStatus(alpha, "agent", r4);
    const closedAt = Date.now();
    const done = await calls(solo, "update_task", { task_id: delegated.task_id, status: "DONE" });
    expect(done, JSON.stringify(done)).toMatchObject({ task: { taskId: delegated.task_id, status: "DONE" } });
    expect(JSON.stringify(done), "nothing says the remote run was stopped (AR-007)").not.toMatch(/stopped/i);
    // AC-001: within 30 s beta stops r4 (no runtime process), records it, and alpha confirms and clears its owed mark.
    const stoppedMs = await stoppedOnBeta([r4], closedAt, "r4 after DONE");
    await until(async () => (await closedOnBeta()).some((entry) => entry.runId === r4), "beta records r4 closed", 10_000);
    expect((await closedOnBeta()).find((entry) => entry.runId === r4)).toMatchObject({ kind: "agent", runId: r4, nodeId: alpha.nodeId });
    let confirmed = "";
    await until(() => (confirmed = noticeRecords("TASK_PEER_NOTICE_CONFIRMED").find((block) => block.includes(r4)) ?? "") !== "", "alpha logs the confirmation", 10_000);
    expect(confirmed).toContain("open: false");
    expect(confirmed).toContain(beta.nodeId);
    expect(await owedMarks(r4), "nothing owed on alpha").toEqual([null]);
    expect(noticeRecords("TASK_PEER_NOTICE_OWED").filter((block) => block.includes(r4)), "never owed").toEqual([]);
    const notices = remoteRequests().filter((entry) => entry.path === PATHS.runStates && JSON.stringify(entry.body).includes(r4));
    expect(notices.map((entry) => ({ open: (entry.body as Rec).open, answer: entry.answer })), "one notice, answered after the stop")
      .toEqual([{ open: false, answer: { accepted: true, nodeId: beta.nodeId, open: false } }]);
    // AC-006 (the server's list): beta's list drops r4; alpha keeps it under the delegator, offline, and on the Task.
    await until(async () => !(await betaListed(r4)), "beta's run list drops r4", 10_000);
    await until(() => r4Status.latest(r4) === "offline", "alpha reads r4 offline (REQ-004)", 20_000);
    // AC-001 / REQ-004 (SR-010): on alpha it leaves the delegating run's tree, as a local closed run does (its Task's page
    // shows it offline: RC-54, a Project Task's page).
    const row = peerRowIn(await treeOf(alpha, "agent", ids.solo), r4) ?? null;
    expect(row, "r4 left the delegator's tree").toBeNull();
    // REQ-004: the conversation stays on beta.
    expect(stringsOf(await remote.conversation()).some((value) => value.includes("ADHOC-PACKET")), "r4's conversation is kept on beta").toBe(true);
    // A message to the closed run is refused on alpha and nothing is sent.
    const sentBefore = captured.length;
    const toRemote = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: r4, content: "AFTER-DONE-TO-REMOTE" });
    expect(toRemote, JSON.stringify(toRemote)).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(textOf(toRemote), "its delegator gets the local text").toBe(closedForDelegator("DONE"));
    expect(sentRequests(sentBefore), "nothing sent to a closed remote run").toEqual([]);
    // REQ-004: beta's owner messages the stopped run from beta's window: it wakes; its message to alpha is refused.
    const fromRemote = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "AFTER-DONE-FROM-REMOTE" });
    expect(fromRemote.accepted, JSON.stringify(fromRemote)).toBe(false);
    await neverReceives(solo, "AFTER-DONE-FROM-REMOTE", 3_000);
    await neverReceives(remote, "AFTER-DONE-TO-REMOTE", 0);
    ids.r4 = r4;
    record("RC-11", { r4, taskId: delegated.task_id, stoppedMs, closedRecord: (await closedOnBeta()).find((entry) => entry.runId === r4), confirmed, notices: notices.map((entry) => ({ body: entry.body, answer: entry.answer })),
      peerRow: row, toRemote: textOf(toRemote), fromRemote: textOf(fromRemote) });
  }, 240_000);

  it("RC-54 591 AC-007/AC-006/REQ-006: a saved Task given to the stopped remote run wakes it (open first, listed again); its DONE stops it again and its Task page shows it offline; a reopen alone changes nothing on beta; another sender's message is refused, delegate_task with the same Task gets the local refusal; the assigner's message continues it: open, listed, woken with the message", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const r4 = ids.r4 as string;
    const remote = composeOnBeta(r4);
    const saved = await savedTaskOnAlpha("Follow-up work. Marker FOLLOWUP-PACKET.");
    /** The open notice before the message or work, beta's record cleared, listed again, nothing owed, the entry open. */
    const reopenedOnBeta = async (label: string, sentBefore: number, path: string) => {
      const sent = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.runStates || entry.path === path);
      expect(sent.map((entry) => entry.path), `${label}: the open notice before the delivery`).toEqual([PATHS.runStates, path]);
      expect(sent[0]!.body as Rec).toMatchObject({ run: { kind: "agent", runId: r4 }, open: true });
      expect(sent[0]!.answer).toEqual({ accepted: true, nodeId: beta.nodeId, open: true });
      expect((await closedOnBeta()).some((entry) => entry.runId === r4), `${label}: beta's record no longer names r4`).toBe(false);
      await until(() => betaListed(r4), `${label}: beta lists r4 again`, 10_000);
      expect(await owedMarks(r4), `${label}: nothing owed`).not.toContain(true);
      expect((await taskOnAlpha(saved.projectId, saved.taskId))?.root, `${label}: its entry open on alpha`).toMatchObject({ ingressAgentRunId: r4, closed: false });
      return sent.map((entry) => ({ path: entry.path, body: entry.body, answer: entry.answer }));
    };
    // A saved Task to the stopped, closed run (REQ-006, another Task): it wakes on beta with the work.
    const packetsBefore = stringsOf(await remote.conversation()).filter((value) => value.includes("FOLLOWUP-PACKET")).length;
    const sentBeforeGive = captured.length;
    const given = await calls(solo, "delegate_task", { target_agent_run_id: r4, task_id: saved.taskId });
    expect(given, JSON.stringify(given)).toMatchObject({ delegated: true });
    const first = await reopenedOnBeta("the saved Task", sentBeforeGive, PATHS.messages);
    await until(async () => stringsOf(await remote.conversation()).filter((value) => value.includes("FOLLOWUP-PACKET")).length > packetsBefore, "r4 wakes with the Task's work", 60_000);
    // Its DONE stops it again; its Task page on alpha shows it offline (AC-001, AC-006).
    const closedAt = Date.now();
    expect(await calls(solo, "update_task", { task_id: saved.taskId, status: "DONE" })).toMatchObject({ task: { status: "DONE" } });
    const stoppedMs = await stoppedOnBeta([r4], closedAt, "r4 after the saved Task's DONE");
    await until(async () => (await closedOnBeta()).some((entry) => entry.runId === r4), "beta records r4 closed again", 10_000);
    await until(async () => !(await betaListed(r4)), "off beta's list again", 10_000);
    let taskPage: Rec | undefined;
    await until(async () => (taskPage = await taskOnAlpha(saved.projectId, saved.taskId))?.root?.status === "offline", "the Task page shows r4 offline", 20_000);
    expect(taskPage, "the Task page names r4, closed and offline").toMatchObject({ status: "DONE", root: { ingressAgentRunId: r4, closed: true, status: "offline" } });
    // A reopen alone (the agent's update_task): nothing is sent; beta keeps the run recorded closed and off its list.
    const sentBeforeReopen = captured.length;
    expect(await calls(solo, "update_task", { task_id: saved.taskId, status: "TODO" })).toMatchObject({ task: { status: "TODO" } });
    await wait(3_000);
    expect(remoteRequests(sentBeforeReopen).filter((entry) => entry.path === PATHS.runStates), "a reopen sends nothing").toEqual([]);
    expect((await closedOnBeta()).some((entry) => entry.runId === r4), "still recorded closed on beta").toBe(true);
    expect(await betaListed(r4), "still off beta's list").toBe(false);
    // Another sender's message is refused; delegate_task with the same Task gets the local refusal; nothing is sent.
    const byOther = await calls(standaloneActor(alpha, ids.other, "alpha other root"), "send_message_to", { target_agent_run_id: r4, content: "OTHER-AFTER-REOPEN" });
    expect(byOther.accepted, JSON.stringify(byOther)).toBe(false);
    expect(byOther.code, JSON.stringify(byOther)).toBe("TASK_AGENT_RESOURCE_CLOSED");
    const sameTask = await calls(solo, "delegate_task", { target_agent_run_id: r4, task_id: saved.taskId });
    expect(sameTask.delegated, JSON.stringify(sameTask)).toBe(false);
    expect(textOf(sameTask)).toMatch(/^This task agent already has Task \S+\. To continue it, set Task \S+ to TODO or IN_PROGRESS, then message the task agent's run id/);
    expect(remoteRequests(sentBeforeReopen).filter((entry) => entry.path === PATHS.runStates || entry.path === PATHS.messages), "nothing sent").toEqual([]);
    // The assigner's message continues it, as locally (SR-010): open first, then the message; it wakes with it.
    const sentBeforeContinue = captured.length;
    const continued = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: r4, content: "CONTINUE-591-AGENT" });
    expect(continued, JSON.stringify(continued)).toMatchObject({ accepted: true });
    const again = await reopenedOnBeta("the assigner's message", sentBeforeContinue, PATHS.messages);
    await receives(remote, "CONTINUE-591-AGENT");
    expect(stringsOf(await remote.conversation()).some((value) => value.includes("FOLLOWUP-PACKET")), "with its conversation").toBe(true);
    expect(noticeRecords("TASK_PEER_NOTICE_CONFIRMED").filter((block) => block.includes(r4)).at(-1)).toContain("open: true");
    record("RC-54", { r4, taskId: saved.taskId, first, stoppedMs, taskPage, byOther: textOf(byOther), sameTask: textOf(sameTask), continued, again });
  }, 300_000);

  // ---- autobyteus-492: the run ID is the address; list_running_agents (RC-47 one node, RC-48 two nodes, RC-49 rows 13/14) ----
  /** Warms a run a person started: one owner message, answered by the scripted CLI ("OK"), so its agent runs. */
  const warm = async (actor: Actor) => {
    const okCount = async () => stringsOf(await actor.conversation()).filter((value) => value.trim() === "OK").length;
    const before = await okCount();
    await actor.send("Hello.");
    await until(async () => (await okCount()) > before, `${actor.label} answers its owner`, 60_000);
  };
  const terminateRun = async (node: NodeServer, runId: string) =>
    (await node.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })).terminateAgentRun as Rec;
  /** A message between two unrelated runs of one node: one line in each run's own log, under one message ID (CM-9). */
  const assertLocalLogs = async (content: string, from: Actor, to: Actor) => {
    const messageId = await messageIdOf(from.node, content);
    let lines: Awaited<ReturnType<typeof logLines>> = [];
    await until(async () => (lines = await logLines(from.node, messageId)).length >= 2, `both logs of ${content}`, 20_000);
    expect(lines, `${content}: once in each run's log`).toHaveLength(2);
    for (const { line } of lines) {
      expect(line).toMatchObject({ messageId, senderAgentRunId: from.runId, receiverAgentRunId: to.runId, content });
      // autobyteus-565 REQ-007: a line of an unrelated message records the other agent (its address, no node).
      expect(sortedKeys(line)).toEqual(["content", "counterpart", "createdAt", "messageId", "messageType", "receiverAgentRunId", "referenceFiles", "senderAgentRunId"]);
      expect(line.counterpart, `${content}: the other agent`).toEqual({ address: expect.stringMatching(/^\//), nodeId: null });
    }
    expect(new Set(lines.map((entry) => entry.file)).size, "two different run logs").toBe(2);
    return { messageId, files: lines.map((entry) => entry.file).sort(), counterparts: lines.map((entry) => ({ file: entry.file, counterpart: entry.line.counterpart })) };
  };
  /** The message frames a run view carried after its snapshot (TEAM_COMMUNICATION_MESSAGE, ROOT_EXECUTION_EVENT) that hold `marker`. */
  const viewMessagesWith = (view: { frames: Frame[] }, marker: string) => view.frames
    .filter((frame) => (frame.type === "TEAM_COMMUNICATION_MESSAGE" || frame.type === "ROOT_EXECUTION_EVENT") && JSON.stringify(frame.payload).includes(marker));
  /**
   * The Messages list's stored read of one participant (`collaborationParticipantMessages`), as the window reads it after a
   * reload: one page, newest first (autobyteus-565: at most 50, `before` the last row of the page before, `hasMore`), and the
   * counterparts the root's tree does not name (`past`, `run`, `remote` with this node's name for the peer: the chip).
   */
  type MessagesPage = { messages: Rec[]; counterparts: Rec[]; hasMore: boolean };
  const teamTab = async (node: NodeServer, rootKind: "agent" | "agent_team" | "agent_org", rootRunId: string, agentRunId: string, before: Rec | null = null) =>
    (await node.gql(`query($k:String!,$r:String!,$a:String!,$b:JSON){collaborationParticipantMessages(rootKind:$k,rootRunId:$r,agentRunId:$a,before:$b)}`,
      { k: rootKind, r: rootRunId, a: agentRunId, b: before })).collaborationParticipantMessages as MessagesPage;
  /** Every page of one participant's list, by "Load more" (the cursor is the last row of each page). */
  const allPages = async (node: NodeServer, rootKind: "agent" | "agent_team" | "agent_org", rootRunId: string, agentRunId: string) => {
    const pages: MessagesPage[] = [];
    let before: Rec | null = null;
    for (;;) {
      const page = await teamTab(node, rootKind, rootRunId, agentRunId, before);
      pages.push(page);
      if (!page.hasMore) return pages;
      const last = page.messages.at(-1)!;
      before = { createdAt: last.createdAt, messageId: last.messageId };
    }
  };
  const teamTabHas = async (node: NodeServer, rootKind: "agent" | "agent_team" | "agent_org", rootRunId: string, agentRunId: string, marker: string) =>
    (await teamTab(node, rootKind, rootRunId, agentRunId)).messages.some((message) => String(message.content).includes(marker));
  /** An agent's launches on a node (the scripted CLI's argv log, one line per process start). */
  const launchesOf = async (node: NodeServer, runId: string) => (await node.launches()).filter((launch) => launch.cwd.includes(runId)).length;
  /** A request on a raw socket: the test process attaches the owner credential to every loopback fetch, so an unsigned request needs its own socket. */
  const rawPost = (port: number, route: string, body: string) => new Promise<{ status: number; answer: Rec }>((resolve, reject) => {
    const socket = net.connect(port, "127.0.0.1", () => socket.write([`POST ${route} HTTP/1.1`, `Host: 127.0.0.1:${port}`, "content-type: application/json",
      `content-length: ${Buffer.byteLength(body)}`, "connection: close", "", body].join("\r\n")));
    const chunks: Buffer[] = [];
    socket.on("data", (chunk: Buffer) => chunks.push(chunk));
    socket.on("error", reject);
    socket.on("end", () => {
      const text = Buffer.concat(chunks).toString("utf8");
      const head = text.slice(0, text.indexOf("\r\n\r\n"));
      let payload = text.slice(text.indexOf("\r\n\r\n") + 4);
      if (/transfer-encoding:\s*chunked/i.test(head)) payload = payload.split("\r\n").filter((_, index) => index % 2 === 1).join("");
      let answer: Rec;
      try { answer = JSON.parse(payload) as Rec; } catch { answer = { raw: payload.slice(0, 300) }; }
      resolve({ status: Number(head.split(" ")[1]), answer });
    });
  });
  /** The fields of one running-runs entry, checked exactly (REQ-002): absent values are left out. */
  const expectAgentEntry = (entry: Rec | undefined, expected: Rec) => {
    expect(entry, JSON.stringify(expected)).toBeTruthy();
    expect(entry).toEqual({ kind: "agent", state: expect.stringMatching(/^(running|idle)$/), started_at: expect.stringMatching(ISO_TIME), ...expected });
  };
  const expectTeamEntry = (entry: Rec | undefined, expected: Rec) => {
    expect(entry, JSON.stringify(expected)).toBeTruthy();
    expect(entry).toEqual({ kind: "agent_team", state: expect.stringMatching(/^(running|idle)$/), started_at: expect.stringMatching(ISO_TIME), ...expected });
  };

  it("RC-47 492 AC-001/002/003/005/007/008, REQ-012, DEC-014: on one node an agent lists the running roots a person started; any agent messages any running agent by run ID and is answered; a stopped root and an unstarted member are refused and not woken; unrelated messages stay out of run views live and after a reload, a Task-related one does not", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const other = standaloneActor(alpha, ids.other, "alpha other root");
    const lead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const orgMate = orgActor(alpha, ids.org.orgRunId, "/mate", ids.org.mate, "alpha org mate");
    const scout = await createStandalone(alpha, defs.runningScout, "alpha running scout");
    ids.runningScout = scout.runId;

    // REQ-012 / AC-009: the texts the agent reads over Agent Tools MCP; the tool is opt-in (AC-001: without it, no tool).
    const scoutTools = await toolsOf(scout);
    const tool = (tools: Rec[], name: string) => tools.find((entry) => entry.name === name);
    expect(tool(scoutTools, "list_running_agents")?.description).toBe(LIST_RUNNING_AGENTS_TOOL_DESCRIPTION);
    for (const phrase of ["this list is for messages only: to start work, use delegate_task", "team_coordinator_agent_run_id",
      "you pass the same node to send_message_to", "Stopped runs are not listed, and a message never wakes them"]) {
      expect(tool(scoutTools, "list_running_agents")?.description, phrase).toContain(phrase);
    }
    expect(Object.keys(tool(scoutTools, "list_running_agents")?.inputSchema?.properties ?? {}).sort()).toEqual(["address", "node", "state"]);
    expect(tool(scoutTools, "send_message_to")?.description).toBe(SEND_MESSAGE_TO_LLM_DESCRIPTION);
    expect(tool(scoutTools, "send_message_to")?.inputSchema?.properties?.node?.description).toBe(SEND_MESSAGE_TO_NODE_DESCRIPTION);
    expect(notRunningRefusal("x"), "the suite's not-running text is the wording authority's").toBe(targetAgentNotRunningText("x"));
    expect((await toolsOf(solo)).map((entry) => entry.name), "an agent that does not select it does not have it").not.toContain("list_running_agents");

    // Runs a person started that are not running: a stopped root, and a Team whose second member never started.
    const sleeper = await createStandalone(alpha, defs.worker, "alpha sleeper");
    await warm(sleeper);
    expect(await terminateRun(alpha, sleeper.runId), "the owner stops the sleeper").toMatchObject({ success: true });
    await until(async () => !(await processLive(sleeper.runId)), "the sleeper's process ends", 30_000);
    const squad = (await alpha.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: defs.team, teamConfigs: [{ teamAddress: "/", ...runConfig(alpha) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: defs.delegator, ...runConfig(alpha) },
        { memberAddress: "/mate", agentDefinitionId: defs.delegator, ...runConfig(alpha) }] } })).createAgentTeamRun;
    expect(squad.success, squad.message).toBe(true);
    const squadMembers = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: squad.teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    const squadLead = teamActor(alpha, squad.teamRunId, squadMembers["/lead"]!, "alpha second squad lead");
    await warm(squadLead);
    const unstartedMate = squadMembers["/mate"]!;

    // A Task of the G-1 delegator: a local task agent (delegated, so never listed).
    const g1 = await createStandalone(alpha, defs.delegator, "alpha G-1 delegator");
    const g1Task = await calls(g1, "delegate_task", { recipient_address: "/remote_worker", description: "Reply OK. Marker G1-PACKET." });
    expect(g1Task, JSON.stringify(g1Task)).toMatchObject({ delegated: true, target_kind: "agent" });
    const worker = standaloneActor(alpha, g1Task.target_agent_run_id as string, "alpha G-1 task agent");
    await receives(worker, "G1-PACKET");

    // AC-001/AC-002: exactly the running Agent and Team runs a person started, the caller's own left out; the Org, the task
    // agents (RC-10's, the G-1 one), the stopped sleeper and the Team members are never entries.
    const listed = await calls(scout, "list_running_agents", {});
    expect(listed.isError, JSON.stringify(listed)).toBe(false);
    const entries = listed.agents as Rec[];
    const idOf = (entry: Rec) => String(entry.kind === "agent_team" ? entry.team_run_id : entry.agent_run_id);
    expect(entries.map(idOf).sort(), JSON.stringify(entries)).toEqual([ids.solo, ids.other, ids.manager, g1.runId, ids.team.teamRunId, squad.teamRunId].sort());
    const byId = (id: string) => entries.find((entry) => idOf(entry) === id);
    for (const id of [ids.solo, ids.other, g1.runId]) expectAgentEntry(byId(id), { name: "Delegator", address: "/delegator", agent_run_id: id, workspace: alpha.workspace });
    expectAgentEntry(byId(ids.manager), { name: "Remote Manager", address: "/remote_manager", agent_run_id: ids.manager, workspace: alpha.workspace });
    expectTeamEntry(byId(ids.team.teamRunId), { name: "Remote Squad", address: "/remote_squad", team_run_id: ids.team.teamRunId,
      team_coordinator_agent_run_id: ids.team.lead, workspace: alpha.workspace });
    expectTeamEntry(byId(squad.teamRunId), { name: "Remote Squad", address: "/remote_squad", team_run_id: squad.teamRunId,
      team_coordinator_agent_run_id: squadMembers["/lead"], workspace: alpha.workspace });
    expect(JSON.stringify(entries), "no title or conversation text (REQ-007)").not.toMatch(/Marker|STANDALONE-PACKET|Hello\./);
    // AC-003: the filters.
    const squads = await calls(scout, "list_running_agents", { address: "/remote_squad" });
    expect((squads.agents as Rec[]).map(idOf).sort()).toEqual([ids.team.teamRunId, squad.teamRunId].sort());
    const idle = await calls(scout, "list_running_agents", { state: "idle" });
    expect((idle.agents as Rec[]).every((entry) => entry.state === "idle"), JSON.stringify(idle)).toBe(true);
    expect((idle.agents as Rec[]).map(idOf).sort()).toEqual(entries.filter((entry) => entry.state === "idle").map(idOf).sort());
    // Unknown address: an empty list. The platform tool-result rule (autobyteus-ts `toToolResultJson`, autobyteus-260) leaves
    // out empty fields, so the agent reads `{}`: an absent `agents` means none.
    const nobody = await calls(scout, "list_running_agents", { address: "/nobody" });
    expect(nobody, JSON.stringify(nobody)).toEqual({ isError: false, elapsedMs: expect.any(Number) });

    // AC-005 (PRB-002 on the built server): two roots a person started message each other by run ID; one log line each.
    const toOther = await calls(scout, "send_message_to", { target_agent_run_id: ids.other, content: "AC005-SCOUT-TO-OTHER" });
    expect(toOther, JSON.stringify(toOther)).toMatchObject({ accepted: true, target_agent_run_id: ids.other });
    const atOther = await receives(other, "AC005-SCOUT-TO-OTHER");
    expect(atOther).toContain(`You received a message from the agent with sender run id "${scout.runId}".`);
    const reply = await calls(other, "send_message_to", { target_agent_run_id: scout.runId, content: "AC005-OTHER-TO-SCOUT" });
    expect(reply, JSON.stringify(reply)).toMatchObject({ accepted: true, target_agent_run_id: scout.runId });
    expect(await receives(scout, "AC005-OTHER-TO-SCOUT")).toContain(`You received a message from the agent with sender run id "${ids.other}".`);
    const ac005Logs = { toOther: await assertLocalLogs("AC005-SCOUT-TO-OTHER", scout, other), reply: await assertLocalLogs("AC005-OTHER-TO-SCOUT", other, scout) };

    // Row 3: an Org agent and a task agent (of an open Task) reach running agents outside their runs (AC-008, local).
    expect(await calls(orgMate, "send_message_to", { target_agent_run_id: ids.other, content: "ROW3-ORG-TO-OTHER" })).toMatchObject({ accepted: true });
    await receives(other, "ROW3-ORG-TO-OTHER");
    await assertLocalLogs("ROW3-ORG-TO-OTHER", orgMate, other);

    // Run views with the windows open (492 G-1, DEC-014, as narrowed by autobyteus-565): the Team's view, the G-1 delegator's
    // view (an ancestor of the task agent), and the own Messages of the other root, of solo and of the task agent itself.
    const rootView = (runId: string) => connect(alpha, "agent-collaboration", runId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const teamView = await connect(alpha, "agent-team", ids.team.teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const g1View = await rootView(g1.runId);
    const otherView = await rootView(ids.other);
    const soloView = await rootView(ids.solo);
    const workerView = await rootView(worker.runId);
    // Unrelated: a Team member → another root a person started; the task agent → a root outside its Task.
    expect(await calls(lead, "send_message_to", { target_agent_run_id: ids.other, content: "G1-UNRELATED-LEAD-TO-OTHER" })).toMatchObject({ accepted: true });
    await receives(other, "G1-UNRELATED-LEAD-TO-OTHER");
    const fromTaskAgent = await calls(worker, "send_message_to", { target_agent_run_id: ids.solo, content: "G1-UNRELATED-TASKAGENT-TO-SOLO" });
    expect(fromTaskAgent, JSON.stringify(fromTaskAgent)).toMatchObject({ accepted: true, target_agent_run_id: ids.solo });
    await receives(solo, "G1-UNRELATED-TASKAGENT-TO-SOLO");
    // Related: the task agent → its delegator (its Task).
    expect(await calls(worker, "send_message_to", { target_agent_run_id: g1.runId, content: "G1-RELATED-TASKAGENT-TO-DELEGATOR" })).toMatchObject({ accepted: true });
    await receives(g1, "G1-RELATED-TASKAGENT-TO-DELEGATOR");
    await until(() => viewMessagesWith(g1View, "G1-RELATED-TASKAGENT-TO-DELEGATOR").length > 0, "the related message in the delegator's view", 20_000);
    await wait(2_000);
    await until(() => viewMessagesWith(otherView, "G1-UNRELATED-LEAD-TO-OTHER").length > 0, "the unrelated message in the other root's own Messages", 20_000);
    await wait(2_000);
    // autobyteus-565 REQ-002/REQ-004 (form 4): an unrelated message is in the own Messages of each standalone run whose agent
    // sent or received it (the task agent's own run too), exactly once; never in a Team view (form 7) nor in an ancestor run's
    // view (the G-1 delegator's: messages of the runs below it among themselves are theirs, Non-goals).
    const live = {
      teamViewUnrelated: viewMessagesWith(teamView, "G1-UNRELATED-LEAD-TO-OTHER").length,
      otherViewUnrelated: viewMessagesWith(otherView, "G1-UNRELATED-LEAD-TO-OTHER").length,
      soloViewUnrelated: viewMessagesWith(soloView, "G1-UNRELATED-TASKAGENT-TO-SOLO").length,
      workerViewUnrelated: viewMessagesWith(workerView, "G1-UNRELATED-TASKAGENT-TO-SOLO").length,
      g1ViewUnrelated: viewMessagesWith(g1View, "G1-UNRELATED-TASKAGENT-TO-SOLO").length,
      g1ViewRelated: viewMessagesWith(g1View, "G1-RELATED-TASKAGENT-TO-DELEGATOR").length,
    };
    expect(live, "live: own Messages show unrelated messages once; Team and ancestor views don't").toEqual({ teamViewUnrelated: 0, otherViewUnrelated: 1,
      soloViewUnrelated: 1, workerViewUnrelated: 1, g1ViewUnrelated: 0, g1ViewRelated: 1 });
    // The live event names both parties, so the view names a counterpart it does not know yet (a local run: no node).
    const otherEvent = viewMessagesWith(otherView, "G1-UNRELATED-LEAD-TO-OTHER")[0]!.payload as Rec;
    expect(otherEvent.event.parties, JSON.stringify(otherEvent)).toEqual({ sender: { agentRunId: ids.team.lead, address: "/lead", nodeName: null },
      receiver: { agentRunId: ids.other, address: expect.stringMatching(/^\//), nodeName: null } });
    // After a reload: the views' new snapshots carry no message, and the stored read of each participant follows the same rule.
    const reloaded = [await connect(alpha, "agent-team", ids.team.teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT")),
      await rootView(g1.runId)];
    for (const view of reloaded) expect(JSON.stringify(view.frames), "no unrelated message in a reloaded Team or ancestor view").not.toMatch(/G1-UNRELATED/);
    const stored = {
      leadTab: await teamTabHas(alpha, "agent_team", ids.team.teamRunId, ids.team.lead, "G1-UNRELATED-LEAD-TO-OTHER"),
      otherTab: await teamTabHas(alpha, "agent", ids.other, ids.other, "G1-UNRELATED-LEAD-TO-OTHER"),
      soloTab: await teamTabHas(alpha, "agent", ids.solo, ids.solo, "G1-UNRELATED-TASKAGENT-TO-SOLO"),
      workerTab: await teamTabHas(alpha, "agent", worker.runId, worker.runId, "G1-UNRELATED-TASKAGENT-TO-SOLO"),
      g1TabUnrelated: await teamTabHas(alpha, "agent", g1.runId, worker.runId, "G1-UNRELATED-TASKAGENT-TO-SOLO"),
      g1TabRelated: await teamTabHas(alpha, "agent", g1.runId, g1.runId, "G1-RELATED-TASKAGENT-TO-DELEGATOR"),
    };
    expect(stored, "stored: the same rule as live").toEqual({ leadTab: false, otherTab: true, soloTab: true, workerTab: true, g1TabUnrelated: false, g1TabRelated: true });
    // AC-002 identities (form 4): the other local run's agent by its address, kind `run`, no node.
    const otherPage = await teamTab(alpha, "agent", ids.other, ids.other);
    expect(otherPage.counterparts, JSON.stringify(otherPage.counterparts)).toEqual(expect.arrayContaining([
      { kind: "run", agentRunId: ids.team.lead, address: "/lead" }, { kind: "run", agentRunId: scout.runId, address: expect.stringMatching(/^\//) },
      { kind: "run", agentRunId: ids.org.mate, address: "/mate" }]));
    expect(otherPage.counterparts.every((entry) => entry.kind !== "remote"), "no node chip for a local run").toBe(true);
    const soloPage = await teamTab(alpha, "agent", ids.solo, ids.solo);
    expect(soloPage.counterparts).toEqual(expect.arrayContaining([{ kind: "run", agentRunId: worker.runId, address: expect.stringMatching(/^\//) }]));
    // Each agent's own conversation and both message logs keep the unrelated messages (CM-9).
    const g1Logs = { live, stored, otherCounterparts: otherPage.counterparts, soloCounterparts: soloPage.counterparts,
      leadToOther: await assertLocalLogs("G1-UNRELATED-LEAD-TO-OTHER", lead, other),
      taskAgentToSolo: await assertLocalLogs("G1-UNRELATED-TASKAGENT-TO-SOLO", worker, solo) };

    // AC-007 / row 4: a stopped root and a member that never started are refused "not running" and are not woken.
    const sentBefore = captured.length;
    const sleeperLaunches = await launchesOf(alpha, sleeper.runId);
    const toSleeper = await calls(other, "send_message_to", { target_agent_run_id: sleeper.runId, content: "AC007-TO-STOPPED" });
    const toUnstarted = await calls(other, "send_message_to", { target_agent_run_id: unstartedMate, content: "ROW4-TO-UNSTARTED-MEMBER" });
    for (const [result, id] of [[toSleeper, sleeper.runId], [toUnstarted, unstartedMate]] as const) {
      expect(result.accepted, JSON.stringify(result)).toBe(false);
      expect(textOf(result)).toBe(notRunningRefusal(id));
      expect(result.target_agent_run_id, "a refusal names no receiver").toBeUndefined();
    }
    await wait(3_000);
    expect(await processLive(sleeper.runId), "the stopped root is not woken").toBe(false);
    expect(await launchesOf(alpha, sleeper.runId), "no new process for the stopped root").toBe(sleeperLaunches);
    expect(await launchesOf(alpha, unstartedMate), "the never-started member is not started").toBe(0);
    expect(stringsOf(await sleeper.conversation()).some((value) => value.includes("AC007-TO-STOPPED")), "the stopped root got nothing").toBe(false);
    expect(sentRequests(sentBefore), "nothing left alpha").toEqual([]);
    const listedAfter = await calls(scout, "list_running_agents", {});
    expect((listedAfter.agents as Rec[]).map(idOf), "still not listed").not.toContain(sleeper.runId);

    expect(await terminateRun(alpha, g1.runId)).toMatchObject({ success: true });
    expect((await alpha.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: squad.teamRunId })).terminateAgentTeamRun).toMatchObject({ success: true });
    record("RC-47", { scout: scout.runId, entries, filters: { squads: squads.agents, idle: idle.agents }, ac005: { toOther, atOther, reply: textOf(reply), logs: ac005Logs },
      g1: { live, stored, logs: g1Logs, fromTaskAgent }, notRunning: { toSleeper: textOf(toSleeper), toUnstarted: textOf(toUnstarted) }, toolTexts: {
        listRunningAgents: tool(scoutTools, "list_running_agents")?.description, sendMessageToNode: tool(scoutTools, "send_message_to")?.inputSchema?.properties?.node?.description } });
  }, 600_000);

  it("RC-48 492 AC-004/AC-006/AC-007, rows 8/11, QR-003: an agent on alpha lists beta's running roots with node, finds beta's Project Task Manager by name and Project, messages it with node and gets its answer; beta's stopped root, unstarted member and team run ID are refused; unsigned and wrongly signed requests to both new routes are refused at the gate", async () => {
    const scout = standaloneActor(alpha, ids.runningScout, "alpha running scout");
    const bystander = standaloneActor(beta, ids.bystander, "beta bystander");
    // Beta: a Project Task Manager a person started under a Project, a Team a person started (coordinator running, checker
    // never started), and a root its owner stopped.
    const projectId = (await beta.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "Beta Project" } })).createProject.projectId as string;
    const pmCreated = (await beta.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId: defs.betaPm, ...runConfig(beta), projectId } })).createAgentRun;
    expect(pmCreated.success, pmCreated.message).toBe(true);
    const pm = standaloneActor(beta, pmCreated.runId as string, "beta project task manager");
    await warm(pm);
    const studio = (await beta.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: defs.studioTeam, teamConfigs: [{ teamAddress: "/", ...runConfig(beta) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: defs.publisher, ...runConfig(beta) },
        { memberAddress: "/checker", agentDefinitionId: defs.checker, ...runConfig(beta) }] } })).createAgentTeamRun;
    expect(studio.success, studio.message).toBe(true);
    const studioMembers = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await beta.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: studio.teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    const studioLead = teamActor(beta, studio.teamRunId, studioMembers["/lead"]!, "beta owner's studio lead");
    await warm(studioLead);
    const unstartedChecker = studioMembers["/checker"]!;
    const stoppedB = await createStandalone(beta, defs.bystander, "beta stopped root");
    await warm(stoppedB);
    expect(await terminateRun(beta, stoppedB.runId)).toMatchObject({ success: true });
    await until(async () => !(await processLive(stoppedB.runId)), "beta's stopped root ends", 30_000);

    // AC-004: the list of beta's running roots a person started, each with node; beta's delegated runs (from alpha), the
    // stopped root and the Team's members are never entries.
    const sentBefore = captured.length;
    const listed = await calls(scout, "list_running_agents", { node: LABEL.beta });
    expect(listed.isError, JSON.stringify(listed)).toBe(false);
    const entries = listed.agents as Rec[];
    const idOf = (entry: Rec) => String(entry.kind === "agent_team" ? entry.team_run_id : entry.agent_run_id);
    expect(entries.map(idOf).sort(), JSON.stringify(entries)).toEqual([ids.bystander, pm.runId, studio.teamRunId].sort());
    const byId = (id: string) => entries.find((entry) => idOf(entry) === id);
    expectAgentEntry(byId(pm.runId), { name: "Project Task Manager", address: "/project_task_manager", agent_run_id: pm.runId, workspace: beta.workspace,
      project: "Beta Project", node: LABEL.beta });
    expectAgentEntry(byId(ids.bystander), { name: "Bystander", address: "/bystander", agent_run_id: ids.bystander, workspace: beta.workspace, node: LABEL.beta });
    expectTeamEntry(byId(studio.teamRunId), { name: "Studio Team", address: "/studio_team", team_run_id: studio.teamRunId,
      team_coordinator_agent_run_id: studioMembers["/lead"], workspace: beta.workspace, node: LABEL.beta });
    const wire = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.runningAgents);
    expect(wire.map((entry) => `${entry.via} ${entry.status}`), "one signed request, asked now").toEqual(["toBeta 200"]);
    expect(wire[0]!.body).toEqual({ fromNodeId: alpha.nodeId, toNodeId: beta.nodeId });
    expect((wire[0]!.answer as Rec).agents.every((entry: Rec) => !("node" in entry)), "beta's answer has no node; alpha adds its name").toBe(true);
    expect((await calls(scout, "list_running_agents", { node: LABEL.beta, address: "/project_task_manager" })).agents).toEqual([byId(pm.runId)]);

    // AC-006 / RU-1: the scout picks the PM by name and Project and messages it with node; the PM answers with the node its
    // header names; one log line on each node under one message ID.
    const chosen = entries.find((entry) => entry.name === "Project Task Manager" && entry.project === "Beta Project")!;
    // autobyteus-565 (RU-1, form 6): both PMs' own Messages open, and beta's Team view (form 7: never shows it).
    const scoutView = await connect(alpha, "agent-collaboration", scout.runId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const pmView = await connect(beta, "agent-collaboration", pm.runId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const studioView = await connect(beta, "agent-team", studio.teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const toPm = await calls(scout, "send_message_to", { node: chosen.node, target_agent_run_id: chosen.agent_run_id, content: "RU1-SCOUT-TO-BETA-PM" });
    expect(toPm, JSON.stringify(toPm)).toMatchObject({ accepted: true, target_agent_run_id: pm.runId });
    expect(textOf(toPm)).toBe(`Delivered message to ${pm.runId} on node "${LABEL.beta}".`);
    const atPm = await receives(pm, "RU1-SCOUT-TO-BETA-PM");
    expect(atPm).toContain(`You received a message from the agent with sender run id "${scout.runId}" on node "${LABEL.alpha}".`);
    const answer = await calls(pm, "send_message_to", { node: LABEL.alpha, target_agent_run_id: scout.runId, content: "RU1-BETA-PM-TO-SCOUT" });
    expect(answer, JSON.stringify(answer)).toMatchObject({ accepted: true, target_agent_run_id: scout.runId });
    expect(textOf(answer)).toBe(`Delivered message to ${scout.runId} on node "${LABEL.alpha}".`);
    expect(await receives(scout, "RU1-BETA-PM-TO-SCOUT")).toContain(`You received a message from the agent with sender run id "${pm.runId}" on node "${LABEL.beta}".`);
    const ru1Logs = { toPm: await assertBothLogs("RU1-SCOUT-TO-BETA-PM", scout, pm), answer: await assertBothLogs("RU1-BETA-PM-TO-SCOUT", pm, scout) };
    const ru1Wire = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.runMessages);
    expect(ru1Wire.map((entry) => `${entry.via} ${(entry.answer as Rec)?.accepted}`)).toEqual(["toBeta true", "toAlpha true"]);
    expect(remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.messages), "no linked message: nothing links the two runs").toEqual([]);
    // autobyteus-565 form 6: each line records the other PM and its node; both PMs' own Messages show both rows live, once,
    // naming the other PM with this node's name for the other node (the chip), and again after a reload.
    expect(ru1Logs.toPm.counterparts).toEqual({ alpha: { address: "/project_task_manager", nodeId: beta.nodeId }, beta: { address: "/running_scout", nodeId: alpha.nodeId } });
    expect(ru1Logs.answer.counterparts).toEqual({ beta: { address: "/running_scout", nodeId: alpha.nodeId }, alpha: { address: "/project_task_manager", nodeId: beta.nodeId } });
    const pmParty = { agentRunId: pm.runId, address: "/project_task_manager" }, scoutParty = { agentRunId: scout.runId, address: "/running_scout" };
    const ru1Live: Rec = {};
    for (const [view, label, here, there, thereNode] of [[scoutView, "scout", scoutParty, pmParty, LABEL.beta], [pmView, "pm", pmParty, scoutParty, LABEL.alpha]] as const) {
      await until(() => ["RU1-SCOUT-TO-BETA-PM", "RU1-BETA-PM-TO-SCOUT"].every((marker) => viewMessagesWith(view, marker).length > 0), `both RU-1 messages in the ${label}'s own Messages`, 20_000);
      const rows = ["RU1-SCOUT-TO-BETA-PM", "RU1-BETA-PM-TO-SCOUT"].map((marker) => viewMessagesWith(view, marker));
      expect(rows.map((found) => found.length), `${label}: each once`).toEqual([1, 1]);
      const parties = rows.map((found) => (found[0]!.payload as Rec).event.parties);
      const herePart = { ...here, nodeName: null }, therePart = { ...there, nodeName: thereNode };
      expect(parties, `${label}: the parties, the other with its node`).toEqual(label === "scout"
        ? [{ sender: herePart, receiver: therePart }, { sender: therePart, receiver: herePart }]
        : [{ sender: therePart, receiver: herePart }, { sender: herePart, receiver: therePart }]);
      ru1Live[label] = parties;
    }
    const scoutPage = await teamTab(alpha, "agent", scout.runId, scout.runId);
    const pmPage = await teamTab(beta, "agent", pm.runId, pm.runId);
    for (const [page, label] of [[scoutPage, "scout"], [pmPage, "pm"]] as const) {
      expect(page.messages.filter((message) => String(message.content).startsWith("RU1-")).map((message) => message.content), label)
        .toEqual(["RU1-BETA-PM-TO-SCOUT", "RU1-SCOUT-TO-BETA-PM"]);
    }
    expect(scoutPage.counterparts).toContainEqual({ kind: "remote", ...pmParty, nodeName: LABEL.beta });
    expect(pmPage.counterparts).toContainEqual({ kind: "remote", ...scoutParty, nodeName: LABEL.alpha });
    // A Team on beta is messaged through the coordinator the list gives; it is not in the Team's Messages (form 7).
    const toStudio = await calls(scout, "send_message_to", { node: LABEL.beta, target_agent_run_id: byId(studio.teamRunId)!.team_coordinator_agent_run_id, content: "RU1-SCOUT-TO-STUDIO-LEAD" });
    expect(toStudio, JSON.stringify(toStudio)).toMatchObject({ accepted: true });
    expect(await receives(studioLead, "RU1-SCOUT-TO-STUDIO-LEAD")).toContain(`sender run id "${scout.runId}" on node "${LABEL.alpha}"`);
    await until(() => viewMessagesWith(scoutView, "RU1-SCOUT-TO-STUDIO-LEAD").length > 0, "the scout's own Messages show its message to the Team", 20_000);
    await wait(1_500);
    expect(viewMessagesWith(studioView, "RU1-"), "no remote message in beta's Team view (form 7)").toEqual([]);
    expect(await teamTabHas(beta, "agent_team", studio.teamRunId, studioMembers["/lead"]!, "RU1-SCOUT-TO-STUDIO-LEAD"), "nor in its stored Messages").toBe(false);
    // Any sender of alpha reaches a running agent of beta with node: an Org agent and a Team member.
    expect(await calls(orgActor(alpha, ids.org.orgRunId, "/lead", ids.org.lead, "alpha org lead"), "send_message_to",
      { node: LABEL.beta, target_agent_run_id: ids.bystander, content: "ROW7-ORG-TO-BYSTANDER" })).toMatchObject({ accepted: true });
    expect(await receives(bystander, "ROW7-ORG-TO-BYSTANDER")).toContain(`sender run id "${ids.org.lead}" on node "${LABEL.alpha}"`);

    // Rows 8 and 11, AC-007 on the peer: refused by beta, nothing woken or started.
    const stoppedLaunches = await launchesOf(beta, stoppedB.runId);
    const toStopped = await calls(scout, "send_message_to", { node: LABEL.beta, target_agent_run_id: stoppedB.runId, content: "ROW8-TO-STOPPED" });
    const toChecker = await calls(scout, "send_message_to", { node: LABEL.beta, target_agent_run_id: unstartedChecker, content: "ROW8-TO-UNSTARTED" });
    const toUnknown = await calls(scout, "send_message_to", { node: LABEL.beta, target_agent_run_id: "agent_run_never_was_000", content: "ROW8-TO-NOBODY" });
    for (const [result, id] of [[toStopped, stoppedB.runId], [toChecker, unstartedChecker], [toUnknown, "agent_run_never_was_000"]] as const) {
      expect(result.accepted, JSON.stringify(result)).toBe(false);
      expect(textOf(result)).toBe(peerNotRunningRefusal(id, LABEL.beta));
    }
    const toTeamRun = await calls(scout, "send_message_to", { node: LABEL.beta, target_agent_run_id: studio.teamRunId, content: "ROW11-TO-TEAM-RUN" });
    expect(toTeamRun.accepted, JSON.stringify(toTeamRun)).toBe(false);
    expect(textOf(toTeamRun)).toBe(`${studio.teamRunId} is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: ${studioMembers["/lead"]}. The team runs on node "${LABEL.beta}": send to its coordinator with node "${LABEL.beta}".`);
    const toUnknownNode = await calls(scout, "send_message_to", { node: "nowhere-node", target_agent_run_id: pm.runId, content: "ROW9-UNKNOWN-NODE" });
    expect(textOf(toUnknownNode)).toBe(TEXT_261.unknownNode("nowhere-node"));
    await wait(3_000);
    expect(await processLive(stoppedB.runId), "beta's stopped root is not woken").toBe(false);
    expect(await launchesOf(beta, stoppedB.runId)).toBe(stoppedLaunches);
    expect(await launchesOf(beta, unstartedChecker), "the never-started member is not started").toBe(0);
    const refusalWire = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.runMessages && (entry.answer as Rec)?.accepted === false);
    expect(refusalWire.map((entry) => (entry.answer as Rec).code).sort()).toEqual(["REMOTE_TARGET_NOT_RUNNING", "REMOTE_TARGET_NOT_RUNNING", "REMOTE_TARGET_NOT_RUNNING", "TARGET_IS_TEAM_RUN"]);

    // QR-003: both routes sit behind the signed peer gate and PeerGateway admission.
    const gate: Rec = {};
    for (const route of [PATHS.runMessages, PATHS.runningAgents]) {
      const body = route === PATHS.runningAgents ? { fromNodeId: alpha.nodeId, toNodeId: beta.nodeId }
        : { fromNodeId: alpha.nodeId, toNodeId: beta.nodeId, messageId: `collabmsg_${randomUUID()}`, sender: { agentRunId: scout.runId, address: "/running_scout" },
          target: { agentRunId: pm.runId }, content: "QR003-FORGED", messageType: "agent_message", createdAt: new Date().toISOString(), files: [] };
      const text = JSON.stringify(body);
      const unsigned = await rawPost(beta.port, route, text);
      const ownerBearer = await fetch(`${beta.baseUrl}${route}`, { method: "POST", headers: { "content-type": "application/json" }, body: text })
        .then(async (response) => ({ status: response.status, answer: await response.json() as Rec }));
      const wrongSecret = await fetch(`${beta.baseUrl}${route}`, { method: "POST", body: text, headers: { "content-type": "application/json",
        ...signPeerRequest({ secret: randomBytes(32).toString("base64url"), method: "POST", pathWithQuery: route, fromNodeId: alpha.nodeId, toNodeId: beta.nodeId, body: text }) } })
        .then(async (response) => ({ status: response.status, answer: await response.json() as Rec }));
      const notPaired = await beta.post(route, { ...body, fromNodeId: "srv_unregistered_00000000000000000000000" });
      const wrongTo = await beta.post(route, { ...body, toNodeId: "srv_someone_else_000000000000000000000" });
      expect(unsigned, `${route} unsigned`).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_REQUIRED" } });
      expect(ownerBearer, `${route} with the owner's credential (not a peer)`).toMatchObject({ status: 403, answer: { code: "NODE_ROUTE_NOT_PERMITTED" } });
      expect(wrongSecret, `${route} signed with a secret beta does not hold`).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
      expect(notPaired, `${route} from a node that is not paired`).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
      expect(wrongTo, `${route} meant for another node`).toEqual({ status: 200, answer: { accepted: false, nodeId: beta.nodeId, code: "PEER_IDENTITY_MISMATCH", message: "This request was meant for another node." } });
      gate[route] = { unsigned, ownerBearer, wrongSecret, notPaired, wrongTo };
    }
    const malformed = await beta.post(PATHS.runMessages, { fromNodeId: alpha.nodeId, toNodeId: beta.nodeId, sender: { agentRunId: scout.runId, address: "/running_scout" }, target: { agentRunId: pm.runId },
      content: "x", messageType: "agent_message", createdAt: new Date().toISOString(), files: [] });
    expect(malformed, "a run message without messageId").toMatchObject({ status: 400, answer: { accepted: false, nodeId: beta.nodeId, code: "REMOTE_REQUEST_INVALID" } });
    await neverReceives(pm, "QR003-FORGED", 1_000);

    expect(await terminateRun(beta, pm.runId)).toMatchObject({ success: true });
    expect((await beta.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: studio.teamRunId })).terminateAgentTeamRun).toMatchObject({ success: true });
    record("RC-48", { ru1Live, scoutCounterparts: scoutPage.counterparts, pmCounterparts: pmPage.counterparts, ru1Counterparts: { toPm: ru1Logs.toPm.counterparts, answer: ru1Logs.answer.counterparts },
      entries, wire: wire[0], toPm: textOf(toPm), atPm, answer: textOf(answer), ru1Logs, ru1Wire: ru1Wire.map((entry) => ({ body: entry.body, answer: entry.answer })),
      refusals: { toStopped: textOf(toStopped), toChecker: textOf(toChecker), toUnknown: textOf(toUnknown), toTeamRun: textOf(toTeamRun), toUnknownNode: textOf(toUnknownNode) },
      gate, malformed });
  }, 600_000);

  it("RC-49 492 AC-008 rows 13/14, DEC-011, 591 REQ-001: after alpha's delegator closes its Task, beta stops the run; every other sender of alpha is refused CLOSED with and without node and nothing is sent; an agent of beta and an agent of a third node get the not-running refusal and do not wake it", async () => {
    // A third node that knows beta only (it cannot know alpha's Task).
    const zeta = new NodeServer("zeta", root, await getFreePort());
    let paired = false;
    try {
      await zeta.start();
      await zeta.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
      await pairNodes({ inviter: (query, variables) => zeta.gql(query, variables), accepter: (query, variables) => beta.gql(query, variables),
        inviterName: "zeta-node", accepterName: LABEL.beta });
      paired = true;
      const zetaAgent = await createStandalone(zeta, await agentDefinition(zeta, "Zeta Agent"), "zeta agent");
      await warm(zetaAgent);

      const fenceDelegator = await createStandalone(alpha, defs.delegator, "alpha fence delegator");
      const delegated = await delegateRemote(fenceDelegator, "Fence work. Marker FENCE-PACKET.");
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta });
      const r6 = delegated.target_agent_run_id as string;
      const fenced = composeOnBeta(r6);
      await receives(fenced, "FENCE-PACKET");
      const closedAt = Date.now();
      const done = await calls(fenceDelegator, "update_task", { task_id: delegated.task_id, status: "DONE" });
      expect(done, JSON.stringify(done)).toMatchObject({ task: { taskId: delegated.task_id, status: "DONE" } });
      // autobyteus-591 REQ-001: the closed Task's run stops on beta (before 591 it kept running until its idle grace).
      const stoppedMs = await stoppedOnBeta([r6], closedAt, "r6 after DONE");

      // Row 14: the node that runs it and a third node are not bound by alpha's Task, but the run is stopped now, and a
      // message by run ID never wakes a stopped agent (492 REQ-010): the not-running refusal, and nothing reaches it.
      const fromBeta = await calls(standaloneActor(beta, ids.bystander, "beta bystander"), "send_message_to", { target_agent_run_id: r6, content: "ROW14-BETA-TO-FENCED" });
      expect(fromBeta.accepted, JSON.stringify(fromBeta)).toBe(false);
      expect(textOf(fromBeta)).toBe(notRunningRefusal(r6));
      const fromZeta = await calls(zetaAgent, "send_message_to", { node: LABEL.beta, target_agent_run_id: r6, content: "ROW14-ZETA-TO-FENCED" });
      expect(fromZeta.accepted, JSON.stringify(fromZeta)).toBe(false);
      expect(textOf(fromZeta)).toBe(peerNotRunningRefusal(r6, LABEL.beta));
      expect(await processLive(r6), "not woken").toBe(false);
      await neverReceives(fenced, "ROW14-", 0);

      // Row 13: every sender on alpha, in any root, with and without node: CLOSED from alpha's Task record, before any send.
      const sentBefore = captured.length;
      const senders: Array<[string, Actor, Rec]> = [
        ["delegator with node", fenceDelegator, { node: LABEL.beta }],
        ["other root with node", standaloneActor(alpha, ids.other, "alpha other root"), { node: LABEL.beta }],
        ["other root without node", standaloneActor(alpha, ids.other, "alpha other root"), {}],
        ["running scout with node", standaloneActor(alpha, ids.runningScout, "alpha running scout"), { node: LABEL.beta }],
        ["Team member without node", teamActor(alpha, ids.team.teamRunId, ids.team.mate, "alpha team mate"), {}],
        ["Org agent with node", orgActor(alpha, ids.org.orgRunId, "/mate", ids.org.mate, "alpha org mate"), { node: LABEL.beta }],
      ];
      const closed: Rec = {};
      for (const [label, actor, extra] of senders) {
        const result = await calls(actor, "send_message_to", { ...extra, target_agent_run_id: r6, content: `ROW13-${label.replace(/ /g, "-").toUpperCase()}` });
        expect(result.accepted, `${label}: ${JSON.stringify(result)}`).toBe(false);
        expect(result.code, label).toBe("TASK_AGENT_RESOURCE_CLOSED");
        // 591 SR-010: its delegator gets the local reopen text; every other sender the closed refusal.
        if (actor === fenceDelegator) expect(textOf(result), label).toBe(closedForDelegator("DONE"));
        else expect(textOf(result), label).toMatch(/DONE or CANCELLED|closed/i);
        closed[label] = textOf(result);
      }
      expect(sentRequests(sentBefore), "nothing was sent to the fenced run from alpha").toEqual([]);
      await neverReceives(fenced, "ROW13-", 2_000);
      record("RC-49", { r6, taskId: delegated.task_id, stoppedMs, fromBeta, fromZeta, closed, zeta: { nodeId: zeta.nodeId, agent: zetaAgent.runId } });
    } finally {
      if (paired) await beta.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: zeta.nodeId }).catch(() => undefined);
      await zeta.stop();
      const dir = process.env["REMOTE_E2E_EVIDENCE_DIR"];
      if (dir) await fsp.mkdir(dir, { recursive: true }).then(() => fsp.copyFile(zeta.logFile, path.join(dir, `remote-two-server-${zeta.name}-server.log`))).catch(() => undefined);
    }
    const betaPeers = ((await beta.gql(`{ peerNodes { name } }`)).peerNodes as Rec[]).map((peer) => peer.name);
    expect(betaPeers, "only alpha stays registered on beta").toEqual([LABEL.alpha]);
  }, 600_000);

  it("RC-50 565 AC-004/AC-005/AC-006, REQ-005/REQ-006: an own list and a Team member's list over 50 messages load in pages of 50, newest first, every message once; a live message during Load more is not doubled; older lines of the released shape show a remote agent from its Task entry, an unlinked one by its run ID without a chip", async () => {
    const scout = standaloneActor(alpha, ids.runningScout, "alpha running scout");
    const other = standaloneActor(alpha, ids.other, "alpha other root");
    const lead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const pad = (n: number) => String(n).padStart(2, "0");
    /** One turn of many `send_message_to` calls (the scripted CLI's `CALL_TOOLS`, 30 ms apart so their order is the send order). */
    const sendMany = async (actor: Actor, target: string, contents: string[]) => {
      const count = () => actor.conversation().then((conversation) => stringsOf(conversation).filter((value) => value.startsWith("CALLED_ALL:")).length);
      const before = await count();
      await actor.send(`CALL_TOOLS:${JSON.stringify(contents.map((content, index) => ({ name: "send_message_to", arguments: { target_agent_run_id: target, content }, delayMs: index * 30 })))}`);
      await until(async () => (await count()) > before, `${actor.label} sent ${contents.length} messages`, 120_000);
      const results = stringsOf(await actor.conversation()).filter((value) => value.startsWith("CALLED_ALL:")).at(-1)!;
      const parsed = JSON.parse(results.slice("CALLED_ALL:".length)) as Rec[];
      expect(parsed.map((result) => toolResult(JSON.stringify(result)).accepted), `${actor.label}: every message accepted`).toEqual(contents.map(() => true));
    };
    const order = (a: Rec, b: Rec) => (a.createdAt === b.createdAt ? String(a.messageId).localeCompare(String(b.messageId)) : String(b.createdAt).localeCompare(String(a.createdAt)));
    const logOf = async (node: NodeServer, relative: string) => (await fsp.readFile(path.join(node.dataDir, relative), "utf8")).split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec);
    const checkPages = (pages: MessagesPage[], label: string) => {
      const rows = pages.flatMap((page) => page.messages);
      pages.forEach((page, index) => {
        expect(page.messages.length, `${label}: page ${index + 1} size`).toBe(index < pages.length - 1 ? 50 : page.messages.length);
        expect(page.hasMore, `${label}: page ${index + 1} hasMore`).toBe(index < pages.length - 1);
      });
      expect(new Set(rows.map((row) => row.messageId)).size, `${label}: no message twice`).toBe(rows.length);
      expect(rows.map((row) => row.messageId), `${label}: one order, newest first`).toEqual([...rows].sort(order).map((row) => row.messageId));
      return rows;
    };
    // An own list over 50 (the founder's PM has 2,506): the scout messages the other root 55 times, the other root's own
    // Messages open; every message arrives live once, then pages: 50, then the rest, nothing lost or repeated (AC-004).
    const otherView = await connect(alpha, "agent-collaboration", ids.other, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    await sendMany(scout, ids.other, Array.from({ length: 55 }, (_, i) => `PAGE-${pad(i + 1)}`));
    await until(() => viewMessagesWith(otherView, "PAGE-55").length > 0, "the last of 55 in the other root's own Messages", 30_000);
    expect(Array.from({ length: 55 }, (_, i) => viewMessagesWith(otherView, `"PAGE-${pad(i + 1)}"`).length), "each of the 55 live once").toEqual(Array(55).fill(1));
    const ownPages = await allPages(alpha, "agent", ids.other, ids.other);
    const ownRows = checkPages(ownPages, "own list");
    const otherLog = await logOf(alpha, `memory/agents/${ids.other}/communication_messages_active.jsonl`);
    expect(ownRows.length, "the own list is the run's whole log").toBe(otherLog.length);
    expect(ownRows.map((row) => row.messageId).sort()).toEqual(otherLog.map((line) => line.messageId).sort());
    expect(ownPages.length, "more than one page").toBeGreaterThan(1);
    expect(ownPages[0]!.messages.slice(0, 3).map((row) => row.content), "newest first").toEqual(["PAGE-55", "PAGE-54", "PAGE-53"]);
    // A live message while the next page loads: it is newer than the cursor, so the next page never repeats it.
    const firstPage = await teamTab(alpha, "agent", ids.other, ids.other);
    const cursor = { createdAt: firstPage.messages.at(-1)!.createdAt, messageId: firstPage.messages.at(-1)!.messageId };
    const liveDuring = calls(scout, "send_message_to", { target_agent_run_id: ids.other, content: "PAGE-LIVE-DURING-LOAD-MORE" });
    const [nextPage] = await Promise.all([teamTab(alpha, "agent", ids.other, ids.other, cursor), liveDuring]);
    await until(() => viewMessagesWith(otherView, "PAGE-LIVE-DURING-LOAD-MORE").length > 0, "the live message during Load more", 20_000);
    expect(nextPage.messages.some((row) => row.content === "PAGE-LIVE-DURING-LOAD-MORE"), "not in the older page").toBe(false);
    expect(new Set([...firstPage.messages, ...nextPage.messages].map((row) => row.messageId)).size, "the two pages share no message").toBe(firstPage.messages.length + nextPage.messages.length);
    expect(viewMessagesWith(otherView, "PAGE-LIVE-DURING-LOAD-MORE").length, "live once").toBe(1);
    expect((await teamTab(alpha, "agent", ids.other, ids.other)).messages[0]!.content, "a reload brings it first").toBe("PAGE-LIVE-DURING-LOAD-MORE");

    // REQ-006: a Team member with more than 50 rows keeps its rows (Task-related and same-run only, as before), paged.
    await sendMany(lead, ids.team.mate, Array.from({ length: 55 }, (_, i) => `TEAMPAGE-${pad(i + 1)}`));
    let matePages: MessagesPage[] = [];
    await until(async () => (matePages = await allPages(alpha, "agent_team", ids.team.teamRunId, ids.team.mate)).flatMap((page) => page.messages)
      .some((row) => row.content === "TEAMPAGE-55"), "the mate's Team Messages hold the 55th", 30_000);
    const mateRows = checkPages(matePages, "Team member");
    const mateContents = mateRows.map((row) => String(row.content));
    expect(Array.from({ length: 55 }, (_, i) => mateContents.filter((content) => content === `TEAMPAGE-${pad(i + 1)}`).length), "each Team message once").toEqual(Array(55).fill(1));
    expect(mateContents, "a same-run message from before").toContain("LOCAL-AFTER-REMOTE-TEAM");
    expect(mateContents.filter((content) => content.startsWith("MATE-TO-") || content.startsWith("ROW13-")), "no remote or unrelated message in a Team list (form 7)").toEqual([]);
    expect(matePages.length).toBeGreaterThan(1);

    // AC-006, older lines (the released shape: seven fields, no `counterpart`), in the logs of stopped runs (test-owned data).
    // Unlinked: a cross-node peer's agent that nothing on this node names: its run ID, no node chip.
    const elder = await createStandalone(alpha, defs.worker, "alpha elder run");
    await warm(elder);
    expect(await terminateRun(alpha, elder.runId)).toMatchObject({ success: true });
    await until(async () => !(await processLive(elder.runId)), "the elder run ends", 30_000);
    const oldLine = (messageId: string, sender: string, receiver: string, content: string) => `${JSON.stringify({ messageId, senderAgentRunId: sender,
      receiverAgentRunId: receiver, content, messageType: "agent_message", referenceFiles: [], createdAt: new Date().toISOString() })}\n`;
    const peerRunId = "project_task_manager_0ld0peer0000000000000000000000";
    await fsp.appendFile(path.join(alpha.memory, "agents", elder.runId, "communication_messages_active.jsonl"), oldLine("collabmsg_old_unlinked_565", peerRunId, elder.runId, "OLD-UNLINKED"));
    const elderPage = await teamTab(alpha, "agent", elder.runId, elder.runId);
    expect(elderPage.messages.map((row) => row.content)).toContain("OLD-UNLINKED");
    expect(elderPage.counterparts, JSON.stringify(elderPage.counterparts)).toContainEqual({ kind: "run", agentRunId: peerRunId, address: null });
    // Linked: the run this run delegated to on beta, named with its address and node from the Task entry.
    const linker = await createStandalone(alpha, defs.delegator, "alpha older-line delegator");
    const linked = await delegateRemote(linker, "Older line work. Marker OLD-LINK-PACKET.");
    expect(linked, JSON.stringify(linked)).toMatchObject({ delegated: true, node: LABEL.beta });
    const r8 = linked.target_agent_run_id as string;
    await receives(composeOnBeta(r8), "OLD-LINK-PACKET");
    expect(await terminateRun(alpha, linker.runId)).toMatchObject({ success: true });
    await until(async () => !(await processLive(linker.runId)), "the delegator ends", 30_000);
    await fsp.appendFile(path.join(alpha.memory, "agents", linker.runId, "communication_messages_active.jsonl"), oldLine("collabmsg_old_linked_565", r8, linker.runId, "OLD-LINKED"));
    const linkerPage = await teamTab(alpha, "agent", linker.runId, linker.runId);
    expect(linkerPage.messages.map((row) => row.content)).toContain("OLD-LINKED");
    expect(linkerPage.counterparts, JSON.stringify(linkerPage.counterparts)).toContainEqual({ kind: "remote", agentRunId: r8, address: "/publisher", nodeName: LABEL.beta });
    record("RC-50", { ownPages: ownPages.map((page) => ({ size: page.messages.length, hasMore: page.hasMore })), ownLog: otherLog.length,
      matePages: matePages.map((page) => ({ size: page.messages.length, hasMore: page.hasMore })), elderCounterparts: elderPage.counterparts,
      linkerCounterparts: linkerPage.counterparts, liveDuring: { nextPageSize: nextPage.messages.length } });
  }, 900_000);

  // ---- autobyteus-587: reference files between nodes (RC-56 … RC-59; numbered after autobyteus-591's RC-55, which the base already holds) ----
  const MiB = 1024 * 1024;
  const sha256Of = (bytes: Buffer) => createHash("sha256").update(bytes).digest("hex");
  /** A file in a workspace, made of random bytes after its format's own leading bytes (enough for its viewer to know it). */
  const writeBinary = async (dir: string, name: string, bytes: number, head: Buffer = Buffer.alloc(0)) => {
    const content = Buffer.concat([head, randomBytes(Math.max(0, bytes - head.byteLength))]);
    const file = path.join(dir, name);
    await fsp.writeFile(file, content);
    return { file, name, size: content.byteLength, sha256: sha256Of(content) };
  };
  /** A received file as the receiving node keeps it: its bytes' SHA-256, read-only, a hard link to the node's store entry. */
  const receivedFact = async (node: NodeServer, file: string) => {
    const stat = await fsp.stat(file);
    const content = await fsp.readFile(file);
    const store = path.join(node.dataDir, "received_files", sha256Of(content));
    const storeStat = await fsp.stat(store).catch(() => null);
    return { sha256: sha256Of(content), size: stat.size, readOnly: (stat.mode & 0o222) === 0, links: stat.nlink, sameAsStore: storeStat?.ino === stat.ino };
  };
  const storeEntry = (node: NodeServer, sha256: string) => path.join(node.dataDir, "received_files", sha256);
  /** One piece sent straight to a node's piece route, signed as `fromNodeId` signs it (or with a secret the node does not hold). */
  const putPiece = async (node: NodeServer, input: { fromNodeId: string; sha256: string; offset: number; size: number; bytes: Buffer; signedBytes?: Buffer; secret?: string; toNodeId?: string }) => {
    const toNodeId = input.toNodeId ?? node.nodeId;
    const route = `${PATHS.receivedFiles}/${input.sha256}?fromNodeId=${encodeURIComponent(input.fromNodeId)}&toNodeId=${encodeURIComponent(toNodeId)}&offset=${input.offset}&size=${input.size}`;
    const secret = input.secret ?? await node.peerSecretOf(input.fromNodeId) ?? randomBytes(32).toString("base64url");
    const headers = { "content-type": "application/octet-stream", ...signPeerRequest({ secret, method: "PUT", pathWithQuery: route, fromNodeId: input.fromNodeId, toNodeId: node.nodeId, body: input.signedBytes ?? input.bytes }) };
    const response = await fetch(`${node.baseUrl}${route}`, { method: "PUT", headers, body: new Uint8Array(input.bytes) });
    const text = await response.text();
    let answer: Rec; try { answer = JSON.parse(text) as Rec; } catch { answer = { raw: text.slice(0, 300) }; }
    return { status: response.status, answer };
  };
  const pieceCount = (size: number) => Math.max(1, Math.ceil(size / (8 * MiB)));
  const filesOf = (entries: Captured[]) => entries.map((entry) => entry.method === "PUT" ? `PUT ${new URL(entry.path, "http://x").pathname.split("/").pop()!.slice(0, 8)} @${new URL(entry.path, "http://x").searchParams.get("offset")}`
    : `${entry.method} ${entry.path}${(entry.body as Rec)?.kind ? ` ${(entry.body as Rec).kind}` : ""}`);
  const lineWith = async (node: NodeServer, content: string) => (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file))
    .flatMap((file) => fs.readFileSync(file, "utf8").split("\n").filter(Boolean).map((line) => JSON.parse(line) as Rec)).find((line) => line.content === content);

  it("RC-56 587 AC-001/AC-002/AC-010, RF-7/RF-11: a delegation to beta carries an .mp4, a PDF and a PNG (uploaded first, in signed pieces); the task agent reads them read-only at its own paths; its reply with node returns a file; without node or with the wrong node it is refused; a re-sent file is not uploaded again; a new version replaces the old at the same path", async () => {
    const sender = await createStandalone(alpha, defs.delegator, "alpha files delegator");
    const files = [await writeBinary(alpha.workspace, "demo.mp4", 20 * MiB, Buffer.from("0000001866747970", "hex")),
      await writeBinary(alpha.workspace, "brief.pdf", 120 * 1024, Buffer.from("%PDF-1.4\n")),
      await writeBinary(alpha.workspace, "cover.png", 60 * 1024, Buffer.from("89504e470d0a1a0a", "hex"))];
    // AC-001: the delegation waits for the files and says how many went.
    const sentBefore = captured.length;
    const delegated = await calls(sender, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Cut the teaser. Marker FILES-PACKET.",
      reference_files: files.map((entry) => entry.file) }, 240_000);
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta, files_sent: 3 });
    const r9 = delegated.target_agent_run_id as string;
    const remote = composeOnBeta(r9);
    const packet = await receives(remote, "FILES-PACKET", 120_000);
    const receivedDir = path.join(beta.memory, "agents", r9, "received_files", sender.runId);
    const receivedPaths = files.map((entry) => path.join(receivedDir, entry.name));
    expect(packet, "the work packet lists the three files at B's own paths").toContain("Reference files:");
    for (const received of receivedPaths) expect(packet).toContain(received);
    const facts = await Promise.all(receivedPaths.map((file) => receivedFact(beta, file)));
    expect(facts.map((fact) => fact.sha256), "the same bytes on B").toEqual(files.map((entry) => entry.sha256));
    expect(facts.every((fact) => fact.readOnly && fact.sameAsStore && fact.links === 2), JSON.stringify(facts)).toBe(true);
    // On the wire: one status, then every piece (≤ 8 MiB each), then the start and the work packet naming the files.
    const wire = remoteRequests(sentBefore).filter((entry) => entry.via === "toBeta" && entry.path !== PATHS.runSummaries);
    const order = filesOf(wire);
    expect(order[0], order.join(" | ")).toBe(`POST ${PATHS.receivedFilesStatus}`);
    const pieces = wire.filter((entry) => entry.method === "PUT");
    expect(pieces.length, order.join(" | ")).toBe(files.reduce((sum, entry) => sum + pieceCount(entry.size), 0));
    expect(wire.indexOf(pieces.at(-1)!), "every piece before the run starts").toBeLessThan(wire.findIndex((entry) => entry.path === PATHS.runs));
    expect(pieces.every((entry) => entry.status === 200 && (entry.answer as Rec).accepted === true), JSON.stringify(pieces.map((entry) => entry.answer))).toBe(true);
    const packetRequest = wire.find((entry) => entry.path === PATHS.messages && (entry.body as Rec).kind === "work_packet")!;
    expect((packetRequest.body as Rec).files).toEqual(files.map(({ sha256, size, name }) => ({ sha256, size, name })));

    // AC-010 (RF-14): the copy answers without node, then with the wrong node, then with the right one (a file attached).
    const theta = new NodeServer("theta", root, await getFreePort());
    let thetaPaired = false;
    let replies: Rec = {};
    try {
      await theta.start();
      await theta.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
      await pairNodes({ inviter: (query, variables) => theta.gql(query, variables), accepter: (query, variables) => beta.gql(query, variables), inviterName: "theta-node", accepterName: LABEL.beta });
      thetaPaired = true;
      const teaser = await writeBinary(betaTempWorkspace(), "teaser.mp4", 5 * MiB, Buffer.from("0000001866747970", "hex"));
      const noNode = await calls(remote, "send_message_to", { target_agent_run_id: sender.runId, content: "TEASER-NO-NODE", reference_files: [teaser.file] });
      const wrongNode = await calls(remote, "send_message_to", { node: "theta-node", target_agent_run_id: sender.runId, content: "TEASER-WRONG-NODE", reference_files: [teaser.file] });
      expect(noNode, JSON.stringify(noNode)).toMatchObject({ accepted: false, code: "NODE_REQUIRED" });
      expect(textOf(noNode)).toBe(nodeRequiredText(LABEL.alpha));
      expect(wrongNode, JSON.stringify(wrongNode)).toMatchObject({ accepted: false, code: "NODE_MISMATCH" });
      expect(textOf(wrongNode)).toBe(nodeMismatchText(LABEL.alpha, "theta-node"));
      const replyBefore = captured.length;
      const reply = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: sender.runId, content: "TEASER-ATTACHED", reference_files: [teaser.file] }, 180_000);
      expect(reply, JSON.stringify(reply)).toMatchObject({ accepted: true, target_agent_run_id: sender.runId, files_sent: 1 });
      // AC-002 / UC-003: A's message lists A-local paths; each node's log line names its own paths (RF-9).
      const atAlpha = await receives(sender, "TEASER-ATTACHED", 60_000);
      const alphaPath = path.join(alpha.memory, "agents", sender.runId, "received_files", r9, "teaser.mp4");
      expect(atAlpha).toContain(`You received a message from the agent with sender run id "${r9}" on node "${LABEL.beta}".`);
      expect(atAlpha).toContain("Reference files:");
      expect(atAlpha).toContain(alphaPath);
      const alphaFact = await receivedFact(alpha, alphaPath);
      expect(alphaFact, JSON.stringify(alphaFact)).toMatchObject({ sha256: teaser.sha256, readOnly: true, sameAsStore: true });
      expect((await lineWith(alpha, "TEASER-ATTACHED"))?.referenceFiles, "A's line: A's paths").toEqual([alphaPath]);
      expect((await lineWith(beta, "TEASER-ATTACHED"))?.referenceFiles, "B's line: B's original path").toEqual([teaser.file]);
      expect(remoteRequests(replyBefore).filter((entry) => entry.via === "toAlpha" && entry.method === "PUT").length).toBe(pieceCount(teaser.size));
      replies = { noNode: textOf(noNode), wrongNode: textOf(wrongNode), reply, alphaFact };
    } finally {
      if (thetaPaired) await beta.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: theta.nodeId }).catch(() => undefined);
      await theta.stop();
    }
    await neverReceives(sender, "TEASER-NO-NODE", 0);
    await neverReceives(sender, "TEASER-WRONG-NODE", 0);

    // RF-11: the same video again: only its status, no piece; the same path keeps the same bytes.
    const resendBefore = captured.length;
    const resend = await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: r9, content: "DEMO-AGAIN", reference_files: [files[0]!.file] });
    expect(resend, JSON.stringify(resend)).toMatchObject({ accepted: true, files_sent: 1 });
    await receives(remote, "DEMO-AGAIN");
    const resendWire = remoteRequests(resendBefore).filter((entry) => entry.via === "toBeta" && entry.path !== PATHS.runSummaries);
    expect(filesOf(resendWire), "no piece for a file beta holds").toEqual([`POST ${PATHS.receivedFilesStatus}`, `POST ${PATHS.messages} message`]);
    // RF-7: a new version of the brief replaces the old one at the same path (another name keeps nothing of it).
    const brief2 = await writeBinary(alpha.workspace, "brief.pdf", 150 * 1024, Buffer.from("%PDF-1.4\n"));
    const replaced = await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: r9, content: "BRIEF-V2", reference_files: [brief2.file] });
    expect(replaced, JSON.stringify(replaced)).toMatchObject({ accepted: true, files_sent: 1 });
    await receives(remote, "BRIEF-V2");
    const briefFact = await receivedFact(beta, receivedPaths[1]!);
    expect(briefFact, JSON.stringify(briefFact)).toMatchObject({ sha256: brief2.sha256, size: brief2.size, readOnly: true, sameAsStore: true });
    // AC-002, the PM's case: two runs no Task relates, on two nodes, with node and a file (`run-messages`).
    const scout = standaloneActor(alpha, ids.runningScout, "alpha running scout");
    const note = await writeBinary(alpha.workspace, "notes.pdf", 40 * 1024, Buffer.from("%PDF-1.4\n"));
    const toBystander = await calls(scout, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.bystander, content: "NOTES-FOR-BYSTANDER", reference_files: [note.file] });
    expect(toBystander, JSON.stringify(toBystander)).toMatchObject({ accepted: true, files_sent: 1 });
    const bystanderPath = path.join(beta.memory, "agents", ids.bystander, "received_files", ids.runningScout, "notes.pdf");
    expect(await receives(standaloneActor(beta, ids.bystander, "beta bystander"), "NOTES-FOR-BYSTANDER")).toContain(bystanderPath);
    expect((await receivedFact(beta, bystanderPath)).sha256).toBe(note.sha256);
    ids.files = { sender: sender.runId, r9, demo: files[0], brief: files[1] };
    record("RC-56", { delegated, packet, facts, order, replies, resendWire: filesOf(resendWire), briefFact, bystanderPath });
  }, 900_000);

  it("RC-57 587 AC-003/AC-005, QR: the piece route admits only signed pieces of at most 8 MiB; a damaged piece in transit or a piece whose file does not match its SHA-256 is refused and nothing is delivered; a file over the receiver's limit is refused by the sender before any upload and by the receiver on a forged piece", async () => {
    const sender = standaloneActor(alpha, ids.files.sender, "alpha files delegator");
    const remote = composeOnBeta(ids.files.r9);
    const piece = randomBytes(64 * 1024);
    const pieceSha = sha256Of(piece);
    // The gate (NA-9): unsigned, signed with a secret beta does not hold, or a body other than the one signed.
    const unsigned = await fetch(`${beta.baseUrl}${PATHS.receivedFiles}/${pieceSha}?fromNodeId=${alpha.nodeId}&toNodeId=${beta.nodeId}&offset=0&size=${piece.byteLength}`,
      { method: "PUT", headers: { "content-type": "application/octet-stream", authorization: "Bearer not-a-node-credential" }, body: piece }).then(async (response) => ({ status: response.status, answer: await response.json() as Rec }));
    const wrongSecret = await putPiece(beta, { fromNodeId: alpha.nodeId, sha256: pieceSha, offset: 0, size: piece.byteLength, bytes: piece, secret: randomBytes(32).toString("base64url") });
    const flipped = Buffer.from(piece); flipped[100] = flipped[100]! ^ 0xff;
    const tampered = await putPiece(beta, { fromNodeId: alpha.nodeId, sha256: pieceSha, offset: 0, size: piece.byteLength, bytes: flipped, signedBytes: piece });
    expect(unsigned.status, JSON.stringify(unsigned)).toBe(401);
    expect(wrongSecret, JSON.stringify(wrongSecret)).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
    expect(tampered, JSON.stringify(tampered)).toMatchObject({ status: 401, answer: { code: "NODE_CREDENTIAL_INVALID" } });
    // The piece route's body limit: more than 8 MiB is refused before it is read into the handler.
    const huge = randomBytes(8 * MiB + 1024);
    const tooBig = await putPiece(beta, { fromNodeId: alpha.nodeId, sha256: sha256Of(huge), offset: 0, size: huge.byteLength, bytes: huge });
    expect(tooBig.status, JSON.stringify(tooBig)).toBe(413);
    // Signed bytes that are not the file the SHA-256 names: refused on the last piece; nothing kept.
    const claimed = sha256Of(randomBytes(64 * 1024));
    const mismatch = await putPiece(beta, { fromNodeId: alpha.nodeId, sha256: claimed, offset: 0, size: piece.byteLength, bytes: piece });
    expect(mismatch, JSON.stringify(mismatch)).toMatchObject({ status: 200, answer: { accepted: false, code: "REFERENCE_FILE_CHECK_FAILED" } });
    expect(fs.existsSync(storeEntry(beta, claimed)) || fs.existsSync(`${storeEntry(beta, claimed)}.partial`), "nothing kept").toBe(false);
    // A message naming a file beta does not hold: refused before any root sees it.
    const unheld = await beta.post(PATHS.messages, { fromNodeId: alpha.nodeId, toNodeId: beta.nodeId, kind: "message", messageId: "collabmsg_unheld_587",
      sender: { agentRunId: ids.files.sender, address: "/delegator" }, target: { agentRunId: ids.files.r9 }, targetRoot: { kind: "agent", runId: ids.files.r9 },
      content: "UNHELD-FILE", messageType: "agent_message", createdAt: new Date().toISOString(), files: [{ sha256: claimed, size: 10, name: "ghost.pdf" }] });
    expect(unheld, JSON.stringify(unheld)).toMatchObject({ status: 200, answer: { accepted: false, code: "REFERENCE_FILE_CHECK_FAILED" } });
    await neverReceives(remote, "UNHELD-FILE", 1_000);

    // AC-003 on the real link: a piece damaged in transit. The gate refuses it; the call names the file; nothing delivered.
    const damagedFile = await writeBinary(alpha.workspace, "storyboard.png", 3 * MiB, Buffer.from("89504e470d0a1a0a", "hex"));
    toBeta.tamper = (entry, raw) => { if (entry.method !== "PUT") return raw; const copy = Buffer.from(raw); copy[copy.byteLength - 1] = copy[copy.byteLength - 1]! ^ 0x01; return copy; };
    let damaged: Rec;
    try { damaged = await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.files.r9, content: "DAMAGED-IN-TRANSIT", reference_files: [damagedFile.file] }, 180_000); }
    finally { toBeta.tamper = null; }
    expect(damaged.accepted, JSON.stringify(damaged)).toBe(false);
    expect(["REFERENCE_FILE_TRANSFER_FAILED", "REFERENCE_FILE_CHECK_FAILED"], JSON.stringify(damaged)).toContain(damaged.code);
    expect(textOf(damaged), "the agent is told which file").toContain("storyboard.png");
    expect(textOf(damaged)).toContain("so nothing was delivered");
    expect(fs.existsSync(storeEntry(beta, damagedFile.sha256)), "no complete copy on B").toBe(false);
    await neverReceives(remote, "DAMAGED-IN-TRANSIT", 1_000);

    // AC-005: beta accepts at most 1 MiB per file: the sender refuses before any piece; a forged oversize piece is refused.
    expect((await beta.gql(`mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}`, { k: "AUTOBYTEUS_RECEIVED_FILE_MAX_MB", v: "1" })).updateServerSetting).toBeTruthy();
    let oversize: Rec, forgedOversize: Awaited<ReturnType<typeof putPiece>>;
    const overBefore = captured.length;
    try {
      oversize = await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.files.r9, content: "OVERSIZE", reference_files: [ids.files.demo.file] });
      forgedOversize = await putPiece(beta, { fromNodeId: alpha.nodeId, sha256: pieceSha, offset: 0, size: 2 * MiB, bytes: piece });
    } finally {
      await beta.gql(`mutation($k:String!,$v:String!){updateServerSetting(key:$k,value:$v)}`, { k: "AUTOBYTEUS_RECEIVED_FILE_MAX_MB", v: "2048" });
    }
    expect(oversize, JSON.stringify(oversize)).toMatchObject({ accepted: false, code: "REFERENCE_FILE_TOO_LARGE" });
    expect(textOf(oversize)).toBe(`demo.mp4 is 20 MiB; node "${LABEL.beta}" accepts files up to 1 MiB, so nothing was sent.`);
    expect(filesOf(remoteRequests(overBefore).filter((entry) => entry.via === "toBeta" && entry.path !== PATHS.runSummaries)), "only the status: no piece, no message").toEqual([`POST ${PATHS.receivedFilesStatus}`]);
    expect(forgedOversize, JSON.stringify(forgedOversize)).toMatchObject({ status: 200, answer: { accepted: false, code: "REFERENCE_FILE_TOO_LARGE" } });
    await neverReceives(remote, "OVERSIZE", 0);
    record("RC-57", { unsigned, wrongSecret, tampered, tooBig: tooBig.status, mismatch, unheld, damaged, oversize: textOf(oversize), forgedOversize });
  }, 600_000);

  it("RC-58 587 AC-006, RF-11: the link to beta breaks during an upload: the call names the file and nothing is delivered; beta keeps only the partial upload, and the next send resumes it from where it stopped", async () => {
    const sender = standaloneActor(alpha, ids.files.sender, "alpha files delegator");
    const remote = composeOnBeta(ids.files.r9);
    const big = await writeBinary(alpha.workspace, "render.mp4", 20 * MiB, Buffer.from("0000001866747970", "hex"));
    toBeta.drop = (entry) => entry.method === "PUT" && new URL(entry.path, "http://x").searchParams.get("offset") !== "0";
    let broken: Rec;
    const before = captured.length;
    try { broken = await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.files.r9, content: "RENDER-BROKEN-LINK", reference_files: [big.file] }, 240_000); }
    finally { toBeta.drop = null; }
    expect(broken, JSON.stringify(broken)).toMatchObject({ accepted: false, code: "REFERENCE_FILE_TRANSFER_FAILED" });
    expect(textOf(broken)).toMatch(new RegExp(`^render\\.mp4 could not be sent to node "${LABEL.beta}" \\(.+\\), so nothing was delivered\\. Try again\\.$`));
    expect(remoteRequests(before).filter((entry) => entry.path === PATHS.messages || entry.path === PATHS.runMessages), "no message sent").toEqual([]);
    await neverReceives(remote, "RENDER-BROKEN-LINK", 1_000);
    const partial = await fsp.stat(`${storeEntry(beta, big.sha256)}.partial`);
    expect(partial.size, "the first piece is held").toBe(8 * MiB);
    expect(fs.existsSync(storeEntry(beta, big.sha256))).toBe(false);
    // The agent tries again: the status names the bytes held, the upload resumes there, and the message is delivered.
    const retryBefore = captured.length;
    const retry = await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.files.r9, content: "RENDER-RETRY", reference_files: [big.file] }, 240_000);
    expect(retry, JSON.stringify(retry)).toMatchObject({ accepted: true, files_sent: 1 });
    await receives(remote, "RENDER-RETRY");
    const offsets = remoteRequests(retryBefore).filter((entry) => entry.method === "PUT").map((entry) => Number(new URL(entry.path, "http://x").searchParams.get("offset")));
    expect(offsets, "resumed after the held bytes").toEqual([8 * MiB, 16 * MiB]);
    expect((await receivedFact(beta, path.join(beta.memory, "agents", ids.files.r9, "received_files", ids.files.sender, "render.mp4"))).sha256).toBe(big.sha256);
    record("RC-58", { broken: textOf(broken), partialBytes: partial.size, offsets });
  }, 600_000);

  it("RC-59 587 AC-007, RF-10: the same file sent to two runs is uploaded once and kept once; deleting each run's history removes its own copy only; the stored bytes are freed by the next cleanup once no run has them and they are a day untouched, and a broken upload's pieces likewise", async () => {
    const sender = standaloneActor(alpha, ids.files.sender, "alpha files delegator");
    const shared = await writeBinary(alpha.workspace, "handbook.pdf", 2 * MiB, Buffer.from("%PDF-1.4\n"));
    const runsFor: string[] = [];
    const uploads: number[] = [];
    for (const marker of ["SHARED-ONE", "SHARED-TWO"]) {
      const before = captured.length;
      const delegated = await calls(sender, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: `Read the handbook. Marker ${marker}.`, reference_files: [shared.file] }, 240_000);
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, files_sent: 1 });
      runsFor.push(delegated.target_agent_run_id as string);
      await receives(composeOnBeta(delegated.target_agent_run_id as string), marker);
      uploads.push(remoteRequests(before).filter((entry) => entry.method === "PUT").length);
    }
    expect(uploads, "uploaded once (RF-11)").toEqual([1, 0]);
    const placed = runsFor.map((runId) => path.join(beta.memory, "agents", runId, "received_files", ids.files.sender, "handbook.pdf"));
    expect((await fsp.stat(storeEntry(beta, shared.sha256))).nlink, "one stored copy, two names (and the store's)").toBe(3);
    const deleteRun = async (runId: string) => {
      await beta.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId });
      const deleted = (await beta.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: runId })).deleteStoredRun;
      expect(deleted.success, deleted.message).toBe(true);
    };
    await deleteRun(runsFor[0]!);
    expect(fs.existsSync(placed[0]!), "the first run's copy is gone with its history").toBe(false);
    expect((await receivedFact(beta, placed[1]!)).sha256, "the second run keeps its own").toBe(shared.sha256);
    await deleteRun(runsFor[1]!);
    expect(fs.existsSync(placed[1]!)).toBe(false);
    const afterBoth = await fsp.stat(storeEntry(beta, shared.sha256));
    expect(afterBoth.nlink, "no run has it any more").toBe(1);
    // A file received less than 24 h ago stays until a later cleanup (RF-10, the review's note): it is still here now.
    // A broken upload leaves a partial file too.
    const broken = await writeBinary(alpha.workspace, "abandoned.mp4", 12 * MiB, Buffer.from("0000001866747970", "hex"));
    toBeta.drop = (entry) => entry.method === "PUT" && new URL(entry.path, "http://x").searchParams.get("offset") !== "0";
    try { await calls(sender, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.files.r9, content: "ABANDONED", reference_files: [broken.file] }, 240_000); }
    finally { toBeta.drop = null; }
    const partialPath = `${storeEntry(beta, broken.sha256)}.partial`;
    expect(fs.existsSync(partialPath), "the broken upload left its partial file").toBe(true);
    // A day later (the clock of these test-owned files is set back 25 h), the next history delete runs the cleanup.
    const dayAgo = new Date(Date.now() - 25 * 3600_000);
    await fsp.utimes(storeEntry(beta, shared.sha256), dayAgo, dayAgo);
    await fsp.utimes(partialPath, dayAgo, dayAgo);
    const freshNotUsed = ids.files.demo.sha256 as string;
    const third = await calls(sender, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Short work. Marker SWEEP-TRIGGER." }, 240_000);
    await receives(composeOnBeta(third.target_agent_run_id as string), "SWEEP-TRIGGER");
    await deleteRun(third.target_agent_run_id as string);
    await until(async () => !fs.existsSync(storeEntry(beta, shared.sha256)) && !fs.existsSync(partialPath), "the cleanup after the delete", 20_000);
    expect(fs.existsSync(storeEntry(beta, freshNotUsed)), "bytes a run still has are kept").toBe(true);
    record("RC-59", { runsFor, uploads, afterBothLinks: afterBoth.nlink });
  }, 900_000);

  it("RC-21 247 AC-301: a Team member on alpha delegates beta's shared Studio Team; beta starts a Team run whose members use their own or the Team's default, and only its coordinator starts", async () => {
    const lead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const view = await connect(alpha, "agent-team", ids.team.teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    ids.teamView = view;
    const betaLaunchesBefore = (await beta.launches()).length;
    const delegated = await calls(lead, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", description: "Studio work. Marker STUDIO-PACKET." });
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
    // REQ-304: the local Team-copy shape plus the node (F-001 of API-REV-001).
    expect(delegated.node, "REQ-304: the remote Team result names the node").toBe(LABEL.beta);
    expect(Object.keys(delegated).filter((key) => key !== "isError" && key !== "elapsedMs").sort()).toEqual(
      ["delegated", "node", "target_kind", "target_team_coordinator_agent_run_id", "target_team_run_id", "task_id"]);
    const studioRunId = delegated.target_team_run_id as string;
    const coord = delegated.target_team_coordinator_agent_run_id as string;
    expect(studioRunId && coord, JSON.stringify(delegated)).toBeTruthy();

    // Alpha: the peer Team's Task entry (beside the remote Agent R2's), the one record of the delegation (contract §3.1): its
    // node, the address it was delegated to, its members by run ID at their addresses in their own team.
    const teamLinks = await linksOf("agent_team", ids.team.teamRunId);
    const teamLink = teamLinks.find((link) => link.teamRunId === studioRunId)!;
    expect(teamLink, JSON.stringify(teamLinks)).toMatchObject({ address: "/studio_team", nodeId: beta.nodeId, coordinatorAgentRunId: coord, delegatorAgentRunId: lead.runId });
    const members = Object.fromEntries((teamLink.members as Rec[]).map((member) => [member.address, member.agentRunId as string]));
    expect(Object.keys(members).sort()).toEqual(["/checker", "/lead"]);
    expect(members["/lead"]).toBe(coord);
    expect(teamLinks.map((link) => link.agentRunId ?? link.teamRunId).sort(), "a remote Agent and a remote Team, both the Team's").toEqual([ids.team.r2, studioRunId].sort());
    ids.studio = { teamRunId: studioRunId, coord, checker: members["/checker"] };
    const resources = await teamTaskResourcesWith(alpha, studioRunId);
    expect(resources, JSON.stringify(resources)).toHaveLength(1);
    expect(resources[0]!.entry).toMatchObject({ role: "assigned", delegatedFrom: { delegatingRun: { kind: "agent_team", runId: ids.team.teamRunId }, delegatorAgentRunId: lead.runId },
      agentRun: { kind: "team", teamRunId: studioRunId, coordinatorAgentRunId: coord }, start: "started" });

    // Beta: an ordinary Team run with the back-link on its tree; only the coordinator starts, with the work packet.
    const coordinator = teamActor(beta, studioRunId, coord, "beta studio coordinator");
    const packet = await receives(coordinator, "STUDIO-PACKET");
    // 269 AC-601: beta's history titles the Team run with the delegated description, before any owner message.
    ids.studioTitle = await titledOnBeta("team", studioRunId, "Studio work. Marker STUDIO-PACKET.");
    expect(packet).toContain(`You have a new task from the agent with sender run id "${lead.runId}" on node "${LABEL.alpha}".`);
    const betaTree = await betaTeamTree(studioRunId);
    expect(betaTree.delegatedFrom).toEqual({ nodeId: alpha.nodeId, delegatingRun: { kind: "agent_team", runId: ids.team.teamRunId }, delegatorAgentRunId: lead.runId });
    const launches = (await beta.launches()).slice(betaLaunchesBefore);
    const launchModel = (launch: { argv: string[] }) => launch.argv[launch.argv.indexOf("--model") + 1];
    expect(launches.filter((launch) => launch.cwd.includes(coord)).map(launchModel), "the coordinator started with its own default model").toEqual([MODEL]);
    expect(launches.filter((launch) => launch.cwd.includes(ids.studio.checker)), "the other member did not start").toEqual([]);
    const memberRecords = objectsIn(betaTree).filter((record) => record.agentRunId === coord || record.agentRunId === ids.studio.checker);
    const memberLaunch = (runId: string) => memberRecords.find((record) => record.agentRunId === runId)!;
    // Each member: its own default, else the Team default; beta's temp workspace; auto-approve on (REQ-302, REQ-303).
    expect(memberLaunch(coord)).toMatchObject({ address: "/lead", launchConfiguration: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL,
      autoExecuteTools: true, workspaceRootPath: betaTempWorkspace() } });
    expect(memberLaunch(ids.studio.checker)).toMatchObject({ address: "/checker", platformAgentRunId: null, launchConfiguration: { runtimeKind: "antigravity_cli",
      llmModelIdentifier: "alt-model", autoExecuteTools: true, workspaceRootPath: betaTempWorkspace() } });
    const history = (await beta.gql(`query{listWorkspaceRunHistory(limitPerAgent:20){workspaceRootPath teamDefinitions{teamDefinitionName runs{teamRunId isActive}}}}`)).listWorkspaceRunHistory as Rec[];
    const listed = history.flatMap((group) => (group.teamDefinitions as Rec[]).filter((definition) => definition.teamDefinitionName === "Studio Team")
      .flatMap((definition) => (definition.runs as Rec[]).map((run) => ({ ...run, workspaceRootPath: group.workspaceRootPath }))));
    expect(listed.find((run) => run.teamRunId === studioRunId), "beta's run history lists the Team run").toMatchObject({ isActive: true, workspaceRootPath: betaTempWorkspace() });
    record("RC-21", { delegated, teamLink, taskResource: resources[0], betaTree, memberRecords, launches, listed });
  }, 240_000);

  it("RC-22 247 AC-303: the delegator and any member of the remote Team message each other; a never-started member starts; the team run ID gets the coordinator guidance; another root without node is refused not running; another member of the delegating root reaches the coordinator unlinked (492 DS-006)", async () => {
    const lead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const mate = teamActor(alpha, ids.team.teamRunId, ids.team.mate, "alpha team mate");
    const other = standaloneActor(alpha, ids.other, "alpha other root");
    const coordinator = teamActor(beta, ids.studio.teamRunId, ids.studio.coord, "beta studio coordinator");
    const checker = teamActor(beta, ids.studio.teamRunId, ids.studio.checker, "beta studio checker");
    // Coordinator ↔ delegator.
    expect(await calls(coordinator, "send_message_to", { node: LABEL.alpha, target_agent_run_id: lead.runId, content: "STUDIO-REPLY-1" })).toMatchObject({ accepted: true });
    expect(await receives(lead, "STUDIO-REPLY-1")).toContain(`You received a message from the agent with sender run id "${ids.studio.coord}" on node "${LABEL.beta}".`);
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.coord, content: "STUDIO-FOLLOWUP-1" })).toMatchObject({ accepted: true });
    expect(await receives(coordinator, "STUDIO-FOLLOWUP-1")).toContain(`sender run id "${lead.runId}" on node "${LABEL.alpha}"`);
    // Delegator → the never-started member: it starts (its Team default model) and receives; then it replies.
    const launchesBefore = (await beta.launches()).length;
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.checker, content: "TO-CHECKER-1" })).toMatchObject({ accepted: true });
    expect(await receives(checker, "TO-CHECKER-1")).toContain(`sender run id "${lead.runId}" on node "${LABEL.alpha}"`);
    const checkerLaunches = (await beta.launches()).slice(launchesBefore).filter((launch) => launch.cwd.includes(ids.studio.checker));
    expect(checkerLaunches.map((launch) => launch.argv[launch.argv.indexOf("--model") + 1]), "the member started on its first message").toEqual(["alt-model"]);
    expect(await calls(checker, "send_message_to", { node: LABEL.alpha, target_agent_run_id: lead.runId, content: "FROM-CHECKER-1" })).toMatchObject({ accepted: true });
    expect(await receives(lead, "FROM-CHECKER-1")).toContain(`sender run id "${ids.studio.checker}" on node "${LABEL.beta}"`);
    // Each message once in alpha's Team log and once in beta's Team log, with one message ID.
    const logs: Rec = {};
    for (const [content, from, to] of [["STUDIO-REPLY-1", coordinator, lead], ["STUDIO-FOLLOWUP-1", lead, coordinator], ["TO-CHECKER-1", lead, checker], ["FROM-CHECKER-1", checker, lead]] as const) {
      logs[content] = await assertBothLogs(content, from, to);
    }
    expect(logs["FROM-CHECKER-1"].files).toEqual({ beta: `memory/agent_teams/${ids.studio.teamRunId}/team_communication_messages_active.jsonl`,
      alpha: `memory/agent_teams/${ids.team.teamRunId}/team_communication_messages_active.jsonl` });
    // Refusals: the team run ID (coordinator guidance); another root without node (autobyteus-587 RF-14: this node's Task
    // records know the member runs on beta, so the refusal names the node to pass).
    const sentBefore = captured.length;
    const toTeamRun = await calls(lead, "send_message_to", { target_agent_run_id: ids.studio.teamRunId, content: "TO-TEAM-RUN" });
    expect(toTeamRun.accepted, JSON.stringify(toTeamRun)).toBe(false);
    expect(textOf(toTeamRun)).toBe(`${ids.studio.teamRunId} is a task agent team's run id, and send_message_to talks with agents. To talk with the team, use its coordinator's run id: ${ids.studio.coord}.`);
    const fromOther = await calls(other, "send_message_to", { target_agent_run_id: ids.studio.checker, content: "OTHER-TO-STUDIO" });
    expect(fromOther.accepted, JSON.stringify(fromOther)).toBe(false);
    expect(fromOther.code, JSON.stringify(fromOther)).toBe("NODE_REQUIRED");
    expect(textOf(fromOther)).toBe(nodeRequiredText(LABEL.beta));
    expect(sentRequests(sentBefore), "none of the refused messages was sent").toEqual([]);
    await neverReceives(checker, "OTHER-TO-STUDIO", 1_000);
    // Another member of the delegating root (autobyteus-492 DS-006): without node it is told the node to pass (587 RF-14);
    // with node, delivered to the running coordinator unlinked (`run-messages`), logged once on each node.
    const mateSentBefore = captured.length;
    const mateNoNode = await calls(mate, "send_message_to", { target_agent_run_id: ids.studio.coord, content: "MATE-TO-STUDIO-NO-NODE" });
    expect(mateNoNode, JSON.stringify(mateNoNode)).toMatchObject({ accepted: false, code: "NODE_REQUIRED" });
    expect(textOf(mateNoNode)).toBe(nodeRequiredText(LABEL.beta));
    expect(sentRequests(mateSentBefore), "nothing sent without node").toEqual([]);
    const fromMate = await calls(mate, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.coord, content: "MATE-TO-STUDIO" });
    expect(fromMate, JSON.stringify(fromMate)).toMatchObject({ accepted: true, target_agent_run_id: ids.studio.coord });
    expect(textOf(fromMate)).toBe(`Delivered message to ${ids.studio.coord} on node "${LABEL.beta}".`);
    expect(await receives(coordinator, "MATE-TO-STUDIO")).toContain(`You received a message from the agent with sender run id "${mate.runId}" on node "${LABEL.alpha}".`);
    expect(sentRequests(mateSentBefore).map((entry) => `${entry.via} ${entry.path} ${(entry.answer as Rec)?.accepted}`)).toEqual([`toBeta ${PATHS.runMessages} true`]);
    logs["MATE-TO-STUDIO"] = await assertBothLogs("MATE-TO-STUDIO", mate, coordinator);
    expect(logs["MATE-TO-STUDIO"].files).toEqual({ alpha: `memory/agent_teams/${ids.team.teamRunId}/team_communication_messages_active.jsonl`,
      beta: `memory/agent_teams/${ids.studio.teamRunId}/team_communication_messages_active.jsonl` });
    // The delegating Team's view stayed open and contiguous while remote Team messages flowed (CR-001).
    const view = ids.teamView as { frames: Frame[]; closed(): unknown };
    const sequences = sequenceCheck(view.frames, "TEAM_EXECUTION_VIEW_SNAPSHOT");
    expect(sequences.gaps, JSON.stringify(sequences)).toEqual([]);
    expect(sequences.errorFrames).toEqual([]);
    expect(sequences.sequenced).toBeGreaterThan(0);
    expect(view.closed(), "the Team view stays open").toBeNull();
    // 269: owner messages to the coordinator and the checker, and the peer's messages, don't replace the Team run's title.
    const studioTitleAfter = await betaTitle("team", ids.studio.teamRunId);
    expect(studioTitleAfter, "the Team run's title after messages").toBe(ids.studioTitle);
    record("RC-22", { studioTitleAfter, logs, toTeamRun: textOf(toTeamRun), fromMate: textOf(fromMate), fromOther: textOf(fromOther), checkerLaunches, sequences });
  }, 300_000);

  it("RC-51 team-run-follows-definition AC-005: beta's peer-started Studio Team copy follows its Team definition on beta (copiedFrom team_definition): a member and a rule are added, then removed again", async () => {
    const coordinator = teamActor(beta, ids.studio.teamRunId, ids.studio.coord, "beta studio coordinator");
    const definitionOf = async () => ((await beta.gql(`{ agentTeamDefinitions { id revision coordinatorMemberName nodes { memberName ref refScope } handoffs { from to rules } } }`))
      .agentTeamDefinitions as Rec[]).find((definition) => definition.id === defs.studioTeam)!;
    const save = async (nodes: Rec[], handoffs: Rec[]) => {
      const current = await definitionOf();
      await beta.gql(`mutation($input:UpdateAgentTeamDefinitionInput!){updateAgentTeamDefinition(input:$input){id}}`,
        { input: { id: defs.studioTeam, expectedRevision: current.revision, coordinatorMemberName: "lead", nodes, handoffs } });
    };
    const original = await definitionOf();
    const nodes = (original.nodes as Rec[]).map((node) => ({ memberName: node.memberName, ref: node.ref, refScope: String(node.refScope).toUpperCase() }));
    const treeBefore = await betaTeamTree(ids.studio.teamRunId);
    expect(treeBefore.copiedFrom, "a peer-started copy records team_definition").toBe("team_definition");
    // Beta's owner adds a member and a rule to it (the app's editor on beta).
    await save([...nodes, { memberName: "reviewer", ref: defs.checker, refScope: "SHARED" }], [{ from: "/lead", to: "/reviewer", rules: ["Review the studio work."] }]);
    await until(async () => ((await betaTeamTree(ids.studio.teamRunId)).rootTeam.members as Rec[]).some((member) => member.address === "/reviewer"),
      "beta's copy gained the reviewer", 60_000);
    const added = await betaTeamTree(ids.studio.teamRunId);
    const rules = await calls(coordinator, "get_handoff_rules", {});
    expect(JSON.stringify(rules)).toContain("Review the studio work.");
    expect(JSON.stringify(rules)).toContain("/reviewer");
    // The member is removed again: it is a former member of the copy and refused by address.
    await save(nodes, (original.handoffs as Rec[]) ?? []);
    await until(async () => ((await betaTeamTree(ids.studio.teamRunId)).rootTeam.formerMembers as Rec[] | undefined ?? []).some((member) => member.address === "/reviewer"),
      "the reviewer became a former member of beta's copy", 60_000);
    const removed = await betaTeamTree(ids.studio.teamRunId);
    const refused = await calls(coordinator, "send_message_to", { recipient_address: "/reviewer", content: "Still there?" });
    expect(textOf(refused)).toBe("reviewer (/reviewer) is no longer a member of your team: it was removed from the team definition. Call get_handoff_rules for your current handoff rules.");
    expect(((removed.rootTeam.members as Rec[]).map((member) => member.address)).sort()).toEqual(["/checker", "/lead"]);
    record("RC-51", { copiedFrom: treeBefore.copiedFrom, addedMembers: (added.rootTeam.members as Rec[]).map((member) => member.address),
      rules, removedMembers: (removed.rootTeam.members as Rec[]).map((member) => member.address),
      formerMembers: ((removed.rootTeam.formerMembers ?? []) as Rec[]).map((member) => member.address), refused: textOf(refused) });
  }, 240_000);

  it("RC-23 247 AC-305, 591 AC-003/AC-002/REQ-006: a saved Task is given to the running remote Team and a new remote Team with task_id is refused; DONE on one Task while the Team has another open sends nothing and it keeps running; CANCELLED on the last one with its coordinator mid-turn stops the whole Team on beta within 30 s; messages both ways are then refused", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const delegated = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", description: "Closure work. Marker CLOSURE-PACKET." });
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
    const teamRunId = delegated.target_team_run_id as string;
    const coord = delegated.target_team_coordinator_agent_run_id as string;
    const coordinator = teamActor(beta, teamRunId, coord, "beta closure coordinator");
    await receives(coordinator, "CLOSURE-PACKET");
    const checker = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await beta.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]))["/checker"]!;
    // A saved Project Task: to a new remote Team, refused (unchanged); to the running remote Team, given (591 REQ-006).
    const projectId = (await alpha.gql(`mutation($input:CreateProjectInput!){createProject(input:$input){projectId}}`, { input: { name: "RC-23 project" } })).createProject.projectId as string;
    const savedTaskId = (await alpha.gql(`mutation($input:CreateProjectTaskInput!){createProjectTask(input:$input){taskId}}`, { input: { projectId, title: "Saved Team work.",
      description: "Saved Team work. Marker SAVED-TEAM-PACKET." } })).createProjectTask.taskId as string;
    const teamRunsBefore = await betaTeamRunDirs();
    const savedNew = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", task_id: savedTaskId });
    expect(savedNew.delegated, JSON.stringify(savedNew)).toBe(false);
    expect(textOf(savedNew)).toBe("A saved Task (task_id) can't be given to an agent on another node yet, so nothing was started. Delegate with a description instead.");
    const saved = await calls(solo, "delegate_task", { target_team_run_id: teamRunId, task_id: savedTaskId });
    expect(saved, JSON.stringify(saved)).toMatchObject({ delegated: true });
    await receives(coordinator, "SAVED-TEAM-PACKET");
    expect(await betaTeamRunDirs(), "no Team run started for the saved Task").toEqual(teamRunsBefore);
    // 591 AC-003: DONE on the first Task while the saved Task is open on the same Team: nothing is sent; it keeps running.
    const beforeDone = captured.length;
    const done = await calls(solo, "update_task", { task_id: delegated.task_id, status: "DONE" });
    expect(done, JSON.stringify(done)).toMatchObject({ task: { taskId: delegated.task_id, status: "DONE" } });
    await wait(5_000);
    expect(remoteRequests(beforeDone).filter((entry) => entry.path === PATHS.runStates), "AC-003: no notice").toEqual([]);
    expect(await processLive(coord), "AC-003: the Team keeps running").toBe(true);
    expect((await closedOnBeta()).some((entry) => entry.runId === teamRunId)).toBe(false);
    expect(await betaListed(teamRunId), "still listed on beta").toBe(true);
    // Both members started; the coordinator mid-turn (a long tool step) when the last Task is cancelled.
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: checker, content: "Check the work. Marker CHECKER-UP." })).toMatchObject({ accepted: true });
    await receives(teamActor(beta, teamRunId, checker, "beta closure checker"), "CHECKER-UP");
    const teamStatus = await runStatus(beta, "agent_team", teamRunId);
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: coord, content: "HOLD_TURN while the Task is cancelled. Marker HOLD-AT-CANCEL." })).toMatchObject({ accepted: true });
    await until(() => teamStatus.latest(coord) === "running", "the coordinator is mid-turn on beta", 30_000);
    expect(await processLive(checker), "the checker's process runs").toBe(true);
    // 591 AC-002: CANCELLED on the last open Task: the whole Team stops on beta within 30 s, the working member included.
    const closedAt = Date.now();
    const cancelled = await calls(solo, "update_task", { task_id: savedTaskId, status: "CANCELLED" });
    expect(cancelled, JSON.stringify(cancelled)).toMatchObject({ task: { status: "CANCELLED" } });
    const stoppedMs = await stoppedOnBeta([coord, checker], closedAt, "the Studio Team after CANCELLED");
    await until(async () => !(await betaTeamActive(teamRunId)), "beta's Team run inactive", 10_000);
    await until(async () => (await closedOnBeta()).some((entry) => entry.runId === teamRunId), "beta records the Team closed", 10_000);
    expect((await closedOnBeta()).find((entry) => entry.runId === teamRunId)).toMatchObject({ kind: "agent_team", runId: teamRunId, nodeId: alpha.nodeId });
    let confirmed = "";
    // (Giving the saved Task above was confirmed "open" first; the close's confirmation is "closed".)
    await until(() => (confirmed = noticeRecords("TASK_PEER_NOTICE_CONFIRMED").find((block) => block.includes(teamRunId) && block.includes("open: false")) ?? "") !== "", "alpha logs the Team's closed confirmation", 10_000);
    expect(await owedMarks(teamRunId), "nothing owed").not.toContain(true);
    await until(async () => !(await betaListed(teamRunId)), "beta's run list drops the Team", 10_000);
    // Messages both ways are refused, as for every closed Task.
    const sentBefore = captured.length;
    const toRemote = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: coord, content: "AFTER-DONE-TO-STUDIO" });
    expect(toRemote, JSON.stringify(toRemote)).toMatchObject({ accepted: false, code: "TASK_AGENT_RESOURCE_CLOSED" });
    expect(textOf(toRemote), "its delegator gets the local text").toBe(closedForDelegator("CANCELLED"));
    expect(sentRequests(sentBefore), "nothing was sent to the closed Team").toEqual([]);
    const fromRemote = await calls(coordinator, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "AFTER-DONE-FROM-STUDIO" });
    expect(fromRemote.accepted, JSON.stringify(fromRemote)).toBe(false);
    expect(textOf(fromRemote)).toMatch(/DONE or CANCELLED|closed/i);
    await neverReceives(solo, "AFTER-DONE-FROM-STUDIO", 3_000);
    teamStatus.socket.close();
    ids.closureTeam = { teamRunId, coord, checker, projectId, savedTaskId };
    record("RC-23", { delegated, savedNew: textOf(savedNew), saved, statusesAtCancel: teamStatus.statusesOf(coord), stoppedMs, confirmed,
      closedRecord: (await closedOnBeta()).find((entry) => entry.runId === teamRunId), toRemote: textOf(toRemote), fromRemote: textOf(fromRemote) });
  }, 300_000);

  it("RC-53 591 AC-007 (Team): the assigner reopens the cancelled Task (nothing on beta); delegate_task with the same Task gets the local refusal; its message to the stopped remote Team's coordinator continues it: beta is told open, lists the Team again, and the coordinator wakes with the message", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const { teamRunId, coord, projectId, savedTaskId } = ids.closureTeam as Rec;
    const coordinator = teamActor(beta, teamRunId, coord, "beta closure coordinator");
    const sentBeforeReopen = captured.length;
    expect(await calls(solo, "update_task", { task_id: savedTaskId, status: "TODO" })).toMatchObject({ task: { status: "TODO" } });
    await wait(3_000);
    expect(remoteRequests(sentBeforeReopen).filter((entry) => entry.path === PATHS.runStates), "a reopen sends nothing").toEqual([]);
    expect(await betaListed(teamRunId), "still off beta's list").toBe(false);
    const sameTask = await calls(solo, "delegate_task", { target_team_run_id: teamRunId, task_id: savedTaskId });
    expect(sameTask.delegated, JSON.stringify(sameTask)).toBe(false);
    expect(textOf(sameTask)).toMatch(/^This task agent already has Task \S+\. To continue it, set Task \S+ to TODO or IN_PROGRESS, then message the task agent's run id/);
    const sentBefore = captured.length;
    const continued = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: coord, content: "CONTINUE-591-TEAM" });
    expect(continued, JSON.stringify(continued)).toMatchObject({ accepted: true });
    const sent = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.runStates || entry.path === PATHS.messages);
    expect(sent.map((entry) => entry.path), "the open notice before the message").toEqual([PATHS.runStates, PATHS.messages]);
    expect(sent[0]!.body as Rec).toMatchObject({ run: { kind: "agent_team", runId: teamRunId }, open: true });
    expect((await closedOnBeta()).some((entry) => entry.runId === teamRunId), "beta's record no longer names the Team").toBe(false);
    await until(() => betaListed(teamRunId), "beta lists the Team again", 10_000);
    await receives(coordinator, "CONTINUE-591-TEAM");
    expect(stringsOf(await coordinator.conversation()).some((value) => value.includes("SAVED-TEAM-PACKET")), "with its conversation").toBe(true);
    expect((await taskOnAlpha(projectId, savedTaskId))?.root, "the Task's entry is open on alpha").toMatchObject({ teamRunId, closed: false });
    record("RC-53", { teamRunId, sameTask: textOf(sameTask), continued, sent: sent.map((entry) => ({ path: entry.path, body: entry.body, answer: entry.answer })) });
  }, 240_000);

  it("RC-55 591 with team-run-follows-definition (autobyteus-22 DEC-008): a Team member's peer run stays while the Team follows its definition (a member joins, the delegating member leaves); its Task's close still stops it on beta", async () => {
    // A Team of its own on alpha (the shared one serves later cases), lead and mate, both started.
    const teamDefinitionId = (await alpha.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: "Follow Squad", description: "Team delegator (591 with 22)", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: defs.delegator, refScope: "SHARED" }, { memberName: "mate", ref: defs.delegator, refScope: "SHARED" }] } })).createAgentTeamDefinition.id as string;
    const team = (await alpha.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId, teamConfigs: [{ teamAddress: "/", ...runConfig(alpha) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: defs.delegator, ...runConfig(alpha) },
        { memberAddress: "/mate", agentDefinitionId: defs.delegator, ...runConfig(alpha) }] } })).createAgentTeamRun;
    expect(team.success, team.message).toBe(true);
    const members = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: team.teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    const lead = teamActor(alpha, team.teamRunId, members["/lead"]!, "alpha follow lead");
    const mate = teamActor(alpha, team.teamRunId, members["/mate"]!, "alpha follow mate");
    await warm(lead);
    // The mate delegates to beta: a peer run on the Team's tree.
    const delegated = await delegateRemote(mate, "Mate's remote work. Marker FOLLOW-MATE-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, node: LABEL.beta });
    const rm = delegated.target_agent_run_id as string;
    await receives(composeOnBeta(rm), "FOLLOW-MATE-PACKET");
    const alphaTeamTree = () => readJson(path.join(alpha.memory, "agent_teams", team.teamRunId, "team_run_execution_tree.json"));
    const definitionOf = async () => ((await alpha.gql(`{ agentTeamDefinitions { id revision nodes { memberName ref refScope } } }`))
      .agentTeamDefinitions as Rec[]).find((definition) => definition.id === teamDefinitionId)!;
    const save = async (nodes: Rec[]) => alpha.gql(`mutation($input:UpdateAgentTeamDefinitionInput!){updateAgentTeamDefinition(input:$input){id}}`,
      { input: { id: teamDefinitionId, expectedRevision: (await definitionOf()).revision, coordinatorMemberName: "lead", nodes, handoffs: [] } });
    // A member joins, then the mate leaves (the owner edits the definition): the running Team follows it.
    await save([{ memberName: "lead", ref: defs.delegator, refScope: "SHARED" }, { memberName: "mate", ref: defs.delegator, refScope: "SHARED" },
      { memberName: "helper", ref: defs.delegator, refScope: "SHARED" }]);
    await until(async () => ((await alphaTeamTree()).rootTeam.members as Rec[]).some((member) => member.address === "/helper"), "the helper joined", 60_000);
    await save([{ memberName: "lead", ref: defs.delegator, refScope: "SHARED" }, { memberName: "helper", ref: defs.delegator, refScope: "SHARED" }]);
    await until(async () => ((await alphaTeamTree()).rootTeam.formerMembers as Rec[] | undefined ?? []).some((member) => member.address === "/mate"), "the mate left", 60_000);
    // DEC-008: the departed member's delegated run belongs to its Task: it keeps running on beta, recorded nowhere.
    expect(await processLive(rm), "the peer run keeps running after the mate left").toBe(true);
    expect(await betaListed(rm), "still listed on beta").toBe(true);
    expect((await closedOnBeta()).some((entry) => entry.runId === rm)).toBe(false);
    const treeRow = peerRowIn(await treeOf(alpha, "agent_team", team.teamRunId), rm) ?? null;
    // Its Task's close (by the lead, any agent with update_task) stops it on beta, as for every closed Task (591 REQ-001).
    const closedAt = Date.now();
    const done = await calls(lead, "update_task", { task_id: delegated.task_id, status: "DONE" });
    expect(done, JSON.stringify(done)).toMatchObject({ task: { status: "DONE" } });
    const stoppedMs = await stoppedOnBeta([rm], closedAt, "the departed mate's peer run after DONE");
    await until(async () => (await closedOnBeta()).some((entry) => entry.runId === rm), "beta records it closed", 10_000);
    await until(async () => !(await betaListed(rm)), "off beta's list", 10_000);
    await until(() => noticeRecords("TASK_PEER_NOTICE_CONFIRMED").some((block) => block.includes(rm) && block.includes("open: false")), "alpha confirms", 10_000);
    expect(await owedMarks(rm), "nothing owed").not.toContain(true);
    await alpha.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: team.teamRunId }).catch(() => undefined);
    record("RC-55", { teamRunId: team.teamRunId, rm, treeRowAfterLeave: treeRow, stoppedMs });
  }, 300_000);

  it("RC-25 247 RSK-301/DEC-304: when alpha's work packet to a just-started remote Team fails, beta keeps an unused Team run (no member starts); RC-12 shows its idle schedule stops it", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const teamRunsBefore = await betaTeamRunDirs();
    const launchesBefore = (await beta.launches()).length;
    const sentBefore = captured.length;
    toBeta.drop = (entry) => entry.path === PATHS.messages && (entry.body as Rec | null)?.kind === "work_packet";
    let result: Rec & { elapsedMs: number };
    try { result = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", description: "Lost packet. Marker LOST-PACKET." }); }
    finally { toBeta.drop = null; }
    const created = (await betaTeamRunDirs()).filter((dir) => !teamRunsBefore.includes(dir));
    expect(created, "beta created one Team run before the packet failed").toHaveLength(1);
    const unused = created[0]!;
    const sent = remoteRequests(sentBefore).map((entry) => ({ path: entry.path, kind: (entry.body as Rec | null)?.kind ?? null, outcome: entry.outcome }));
    expect(sent.filter((entry) => entry.outcome === "dropped by the test"), JSON.stringify(sent)).toHaveLength(1);
    expect((await beta.launches()).slice(launchesBefore).filter((launch) => launch.cwd.includes(unused)), "no member of the unused Team started").toEqual([]);
    // Alpha: the delegation is refused with the reason, and its Task record says the start failed. The Team link
    // committed before the packet stays (DEC-304 does not specify alpha's side; recorded as observed).
    expect(result.delegated, JSON.stringify(result)).toBe(false);
    expect(textOf(result)).toBe(`Node "${LABEL.beta}" could not be reached (fetch failed).`);
    const taskRecords = await teamTaskResourcesWith(alpha, unused);
    // Base stored TASK_DISPATCH_FAILED for any dispatch failure (REQ-005: the Task rules are unchanged; CR-461-052).
    expect(taskRecords.map((record) => record.entry), JSON.stringify(taskRecords)).toEqual([expect.objectContaining({ start: "failed",
      startError: { code: "TASK_DISPATCH_FAILED", message: `Node "${LABEL.beta}" could not be reached (fetch failed).` } })]);
    const linked = (await linksOf("agent", ids.solo)).filter((link) => link.teamRunId === unused);
    ids.unusedTeam = unused;
    record("RC-25", { result, text: textOf(result), unused, sent, alphaLinks: linked, alphaTaskRecords: taskRecords });
  }, 120_000);

  it("RC-31 278 AC-801/802/803, DEC-804: a standalone delegator's remote Agent is in its tree with node, title and status; its view is live; the owner messages it, interrupts it and stops it from alpha's window", async () => {
    const delegator = await createStandalone(alpha, defs.delegator, "alpha tree delegator");
    ids.treeDelegator = delegator.runId;
    const delegated = await calls(delegator, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Tree work. Marker TREE-PACKET." });
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent" });
    const r9 = delegated.target_agent_run_id as string;
    await receives(composeOnBeta(r9), "TREE-PACKET");
    // A second remote run of the same delegator that stays quiet: RC-36 finds it shut down after the idle grace.
    const idle = await calls(delegator, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Idle work. Marker IDLE-PACKET." });
    ids.idleRemote = idle.target_agent_run_id;
    await receives(composeOnBeta(ids.idleRemote as string), "IDLE-PACKET");

    // AC-801 (SR-084): the row in the delegator's tree, built by alpha's server (every view, the run list and the phone
    // show these rows): its node, title and launch from beta's answer (SR-038, G-B2), its open target (SR-083).
    const peerStatus = await runStatus(alpha, "agent", r9);
    expect(peerStatus.agents().map((agent) => agent.agentRunId), "r9's statuses by its run ID on alpha (through its handle)").toEqual([r9]);
    const { row, tree } = await peerRowOf(alpha, "agent", delegator.runId, r9, (candidate) => (candidate.peer as Rec)?.reachable === true && candidate.launch !== undefined);
    expect(row, JSON.stringify(row)).toMatchObject({ kind: "peer_agent", address: "/publisher", statusIds: [r9],
      openTarget: { runKind: "agent", runId: r9, agentRunId: r9, nodeId: beta.nodeId },
      peer: { nodeId: beta.nodeId, nodeName: LABEL.beta, title: "Tree work. Marker TREE-PACKET.", reachable: true } });
    // Under the agent that delegated it.
    expect((tree.rows.find((parent) => parent.key === row.parentKey)?.openTarget as Rec | undefined)?.agentRunId, "the row hangs under its delegator").toBe(delegator.runId);
    // autobyteus-32 REQ-009 under SR-038: the peer's launch, read from the peer.
    expect(row.launch, JSON.stringify(row.launch)).toMatchObject({ runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, source: expect.objectContaining({ origin: "agent_default" }) });

    // AC-802 (G-D1): the row opens by its own identity on alpha's /ws/peer-run; beta's owner writes to the run; its answer shows live.
    const opened = await peerRun("agent", r9, r9);
    expect(opened.count("TREE-PACKET"), "the snapshot holds the packet once").toBe(1);
    const beforeLive = opened.frames.length;
    await composeOnBeta(r9).send(`LIVE-FROM-BETA-OWNER ${await replyWith("rc31-live", "RC31-LIVE-ANSWER")}`);
    await until(() => opened.liveSince(beforeLive, "RC31-LIVE-ANSWER"), "the answer to beta's owner live on alpha's /ws/peer-run", 30_000);
    const liveSeen = opened.liveSince(beforeLive, "RC31-LIVE-ANSWER");

    // DS-003: the stored conversation of the remote agent, read through alpha.
    const projected = JSON.stringify((await alpha.gql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(runId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: delegator.runId, a: "/publisher", r: r9 })).agentRunCollaborationMemberProjection?.conversation ?? null);
    expect(projected).toContain("TREE-PACKET");
    expect(projected).toContain("LIVE-FROM-BETA-OWNER");

    // AC-803: the owner's message from alpha's window (the opened row) reaches the run on beta as its input; its answer follows live.
    const logsBefore = await Promise.all([alpha, beta].map(async (node) => (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n")));
    const beforeOwner = opened.frames.length;
    const sent = await opened.send(`status? Marker OWNER-FROM-ALPHA ${await replyWith("rc31-owner", "RC31-OWNER-ANSWER")}`);
    expect(sent, JSON.stringify(sent)).toMatchObject({ command_type: "SEND_MESSAGE", accepted: true });
    await receives(composeOnBeta(r9), "OWNER-FROM-ALPHA");
    await until(async () => (await betaConversation(r9)).includes("RC31-OWNER-ANSWER"), "the answer after the owner's message on beta", 20_000);
    // DS-004a (SR-006): the run's input names the owner's node, as beta knows it; one user message (N-405).
    const ownerEntries = (JSON.parse(await betaConversation(r9)) as Rec[]).filter((entry) => String(entry.content ?? "").includes("OWNER-FROM-ALPHA"));
    expect(ownerEntries, "one user message of the run on beta").toEqual([expect.objectContaining({ kind: "message", role: "user" })]);
    expect(String(ownerEntries[0]!.content).startsWith(`From the owner of node "${LABEL.alpha}":\n\nstatus? Marker OWNER-FROM-ALPHA `),
      `the owner's heading, then the message: ${JSON.stringify(ownerEntries[0]!.content)}`).toBe(true);
    const ownerEntry = ownerEntries[0];
    await until(() => opened.liveSince(beforeOwner, "RC31-OWNER-ANSWER"), "the owner's answer live on alpha's /ws/peer-run", 15_000);
    const reread = JSON.stringify((await alpha.gql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(runId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: delegator.runId, a: "/publisher", r: r9 })).agentRunCollaborationMemberProjection?.conversation ?? null);
    expect(reread.split("OWNER-FROM-ALPHA").length - 1, "N-405: one user message in alpha's view of it").toBe(1);
    const logsAfter = await Promise.all([alpha, beta].map(async (node) => (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file)).map((file) => fs.readFileSync(file, "utf8")).join("\n")));
    expect(logsAfter.map((text, index) => text.split("OWNER-FROM-ALPHA").length - logsBefore[index]!.split("OWNER-FROM-ALPHA").length), "not a message-log line on either node (REQ-803)").toEqual([0, 0]);

    // Interrupt: a held turn, then INTERRUPT_GENERATION on the opened row; Retry (SR-090) on /ws/run-status answers "ok" while beta answers.
    const held = await opened.send("HOLD_TURN Marker HOLD-FROM-ALPHA");
    expect(held.accepted).toBe(true);
    await until(async () => (await betaConversation(r9)).includes("HOLD-FROM-ALPHA"), "the held turn on beta", 20_000);
    const retried = await peerStatus.retry(r9);
    expect(retried.state, JSON.stringify(retried)).toMatchObject({ answer: "ok", node: null });
    await until(() => peerStatus.latest(r9) === "running", "r9 running while the turn is held (by its run ID)", 30_000);
    const whileHeld = peerStatus.latest(r9);
    const interrupted = await opened.interrupt();
    expect(interrupted, JSON.stringify(interrupted)).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    await until(() => peerStatus.latest(r9) !== "running", "not running after the interrupt (by its run ID)", 30_000);
    const afterInterrupt = peerStatus.latest(r9);
    expect(whileHeld, "running while the turn is held").toBe("running");

    // DEC-804 Stop: through alpha by the run's own ID (SR-066, the standard terminate); beta stops the run; it reads offline.
    const stopped = (await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: r9 })).terminateAgentRun;
    expect(stopped, JSON.stringify(stopped)).toMatchObject({ success: true });
    await until(async () => !(await processLive(r9)), "r9's CLI gone", 20_000);
    await until(() => peerStatus.latest(r9) === "offline", "r9 offline after Stop (by its run ID)", 15_000).catch(() => undefined);
    const finalSummary = { status: peerStatus.latest(r9) };
    expect(finalSummary.status, "after Stop the run reads offline by its run ID (the observation ended)").toBe("offline");
    peerStatus.socket.close();
    opened.socket.close();
    ids.treeRun = r9;
    record("RC-31", { r9, row, liveSeen, sent, ownerEntry, retried, whileHeld, afterInterrupt, stopped, finalSummary,
      peerRunFrameTypes: [...new Set(opened.frames.map((frame) => frame.type))] });
  }, 300_000);

  it("RC-32 278 DS-006 (C-2): when beta's own owner stops the remote run in beta's window, alpha's open view ends offline", async () => {
    const delegator = standaloneActor(alpha, ids.treeDelegator as string, "alpha tree delegator");
    const delegated = await calls(delegator, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Stopped there. Marker C2-PACKET." });
    const r10 = delegated.target_agent_run_id as string;
    await receives(composeOnBeta(r10), "C2-PACKET");
    const r10Status = await runStatus(alpha, "agent", r10);
    await peerRowOf(alpha, "agent", delegator.runId, r10);
    await until(() => ["running", "idle", "initializing"].includes(String(r10Status.latest(r10))), "r10 live by its run ID on alpha", 25_000);
    const terminated = (await beta.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: r10 })).terminateAgentRun;
    expect(terminated.success, terminated.message).toBe(true);
    await until(async () => !(await processLive(r10)), "r10's CLI gone", 20_000);
    await until(() => r10Status.latest(r10) === "offline", "alpha reads r10 offline", 15_000).catch(() => undefined);
    const after = r10Status.statusesOf(r10);
    // SR-090: a Retry is answered by beta (reachable), and the stopped run stays offline.
    const refreshed = await r10Status.retry(r10);
    expect(refreshed.state, JSON.stringify(refreshed)).toMatchObject({ answer: "ok", node: null });
    expect((await peerRowOf(alpha, "agent", delegator.runId, r10)).row.peer, "beta answers for the stopped run: its row reachable, its title kept")
      .toMatchObject({ reachable: true, title: "Stopped there. Marker C2-PACKET." });
    expect(after.includes("offline"), "without a refresh, alpha reads the run offline when beta's owner stops it (DS-006; by its run ID)").toBe(true);
    expect(r10Status.latest(r10), "still offline after the Retry").toBe("offline");
    r10Status.socket.close();
    record("RC-32", { r10, terminated, summariesAfterOwnerStop: after, refreshed });
  }, 180_000);

  it("RC-33 278 AC-801/802/803/806: a Team delegator's tree has its remote Agent and its remote Team with members; a member's projection; the owner messages a never-messaged member", async () => {
    // SR-084: the Team delegator's tree has the peer Agent and the peer Team with its members (the rows the window shows).
    const studioStatus = await runStatus(alpha, "agent_team", ids.studio.teamRunId);
    const r2Status = await runStatus(alpha, "agent", ids.team.r2);
    const agentRow = (await peerRowOf(alpha, "agent_team", ids.team.teamRunId, ids.team.r2)).row;
    const { row: teamRow, tree } = await peerRowOf(alpha, "agent_team", ids.team.teamRunId, ids.studio.teamRunId);
    expect(agentRow, JSON.stringify(agentRow)).toMatchObject({ kind: "peer_agent", address: "/publisher", peer: { nodeId: beta.nodeId, nodeName: LABEL.beta } });
    expect(teamRow, JSON.stringify(teamRow)).toMatchObject({ kind: "peer_team", address: "/studio_team", statusIds: [ids.studio.teamRunId],
      openTarget: { runKind: "agent_team", runId: ids.studio.teamRunId, agentRunId: ids.studio.coord, nodeId: beta.nodeId },
      peer: { nodeName: LABEL.beta, reachable: true, title: ids.studioTitle ?? "Studio work. Marker STUDIO-PACKET." } });
    const memberRows = tree.rows.filter((member) => member.parentKey === teamRow.key);
    expect(memberRows.every((member) => member.kind === "peer_member"), JSON.stringify(memberRows)).toBe(true);
    expect(memberRows.map((member) => (member.openTarget as Rec).agentRunId).sort()).toEqual([ids.studio.coord, ids.studio.checker].sort());
    // SR-072 F-36, TC-12: the coordinator by its own-team address (SR-030 for peers).
    expect(memberRows.find((member) => (member.openTarget as Rec).agentRunId === ids.studio.coord)?.address, JSON.stringify(memberRows)).toBe("/lead");
    // Live (G-D1): the coordinator's row opened on alpha's /ws/peer-run; beta's owner writes to it; its answer shows live.
    const coordinator = await peerRun("agent_team", ids.studio.teamRunId, ids.studio.coord);
    const beforeLive = coordinator.frames.length;
    await teamActor(beta, ids.studio.teamRunId, ids.studio.coord, "beta studio coordinator").send(`LIVE-TEAM-COORDINATOR ${await replyWith("rc33-live", "RC33-LIVE-ANSWER")}`);
    await until(() => coordinator.liveSince(beforeLive, "RC33-LIVE-ANSWER"), "a peer Team member's live output on alpha's /ws/peer-run", 30_000);
    const liveSeen = coordinator.liveSince(beforeLive, "RC33-LIVE-ANSWER");
    // A member's stored conversation through alpha.
    const checkerProjection = JSON.stringify((await alpha.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
      { id: ids.team.teamRunId, a: ids.studio.checker })).getTeamMemberRunProjection?.conversation ?? null);
    expect(checkerProjection, "the remote member's conversation, read through alpha").toContain("TO-CHECKER-1");
    // The owner messages the checker (a member) from the window: its row opened by its own identity.
    const checkerRow = await peerRun("agent_team", ids.studio.teamRunId, ids.studio.checker);
    expect(await checkerRow.send("Owner of alpha here. Marker OWNER-TO-CHECKER."), "the member message's ack").toMatchObject({ accepted: true });
    const atChecker = await receives(teamActor(beta, ids.studio.teamRunId, ids.studio.checker, "beta studio checker"), "OWNER-TO-CHECKER");
    // The remote Agent's projection through the Team delegator.
    const agentProjection = JSON.stringify((await alpha.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
      { id: ids.team.teamRunId, a: ids.team.r2 })).getTeamMemberRunProjection?.conversation ?? null);
    expect(agentProjection).toContain("TEAM-PACKET");
    for (const socket of [studioStatus.socket, r2Status.socket, coordinator.socket, checkerRow.socket]) socket.close();
    record("RC-33", { agentRow, teamRow, memberRows, liveSeen, atChecker: atChecker.slice(0, 300) });
  }, 180_000);

  it("RC-34 278 AC-801/803/806: an Org delegator's tree has its remote Agent with title and status; its projection; the owner messages it from the Org view", async () => {
    // SR-084: the Org's tree has the peer Agent under the Org agent that delegated it, with title and status.
    const r5Status = await runStatus(alpha, "agent", ids.org.r5);
    const { row, tree } = await peerRowOf(alpha, "agent_org", ids.org.orgRunId, ids.org.r5);
    expect(row, JSON.stringify(row)).toMatchObject({ kind: "peer_agent", openTarget: { runKind: "agent", runId: ids.org.r5, agentRunId: ids.org.r5, nodeId: beta.nodeId },
      peer: { nodeId: beta.nodeId, nodeName: LABEL.beta, reachable: true, title: expect.stringContaining("ORG-PACKET") } });
    expect((tree.rows.find((parent) => parent.key === row.parentKey)?.openTarget as Rec | undefined)?.agentRunId, "under the Org's lead").toBe(ids.org.lead);
    expect(r5Status.agents().map((agent) => agent.agentRunId), "its statuses by its run ID").toEqual([ids.org.r5]);
    const projection = JSON.stringify((await alpha.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
      { id: ids.org.orgRunId, a: ids.org.r5, m: row.address })).getAgentOrgMemberRunProjection?.conversation ?? null);
    expect(projection).toContain("ORG-PACKET");
    // The owner's message from the Org view (base's command shape, kept: the server finds the run's handle), and its answer
    // live on the row opened by its own identity (G-D1).
    const opened = await peerRun("agent", ids.org.r5, ids.org.r5);
    const view = await connect(alpha, "agent-org", ids.org.orgRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const beforeOwner = opened.frames.length;
    const ack = await ackOf(view, rootCommand(view, { kind: "agent_org", runId: ids.org.orgRunId }, "SEND_MESSAGE", ids.org.r5,
      ownerText(`Owner of alpha here. Marker OWNER-TO-ORG-REMOTE ${await replyWith("rc34-owner", "RC34-OWNER-ANSWER")}`)));
    expect(ack, JSON.stringify(ack)).toMatchObject({ state: "accepted" });
    await receives(composeOnBeta(ids.org.r5), "OWNER-TO-ORG-REMOTE");
    await until(() => opened.liveSince(beforeOwner, "RC34-OWNER-ANSWER"), "the answer live on alpha's /ws/peer-run", 15_000);
    const liveSeen = opened.liveSince(beforeOwner, "RC34-OWNER-ANSWER");
    for (const socket of [r5Status.socket, opened.socket, view.socket]) socket.close();
    record("RC-34", { row, ack, liveSeen });
  }, 180_000);

  it("RC-43 461 AC-016 / REQ-013 / SR-066: with each delegator stopped (standalone agent, Team member, Org agent), its peer children are reached by their own identity: live status in its open view, the owner's message, interrupt, the stored conversation and Stop; the delegator stays stopped", async () => {
    const out: Rec = {};
    const isDelegatorActive = async (kind: "agent" | "team" | "org", runId: string) => kind === "agent"
      ? Boolean((await alpha.gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: runId })).getAgentRunResumeConfig?.isActive)
      : kind === "team" ? Boolean((await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){isActive}}`, { id: runId })).getTeamRunResumeConfig?.isActive)
        : Boolean((await alpha.gql(`query($id:String!){getAgentOrgRootHistory(orgRunId:$id){is_active}}`, { id: runId })).getAgentOrgRootHistory?.is_active);

    // 1. A standalone delegator with a peer Agent and a peer Team; then the user stops it.
    const solo = await createStandalone(alpha, defs.delegator, "AC-016 solo delegator");
    const soloAgent = await delegateRemote(solo, "AC-016 solo work. Marker A16-SOLO.");
    expect(soloAgent, JSON.stringify(soloAgent)).toMatchObject({ delegated: true, target_kind: "agent" });
    const a1 = soloAgent.target_agent_run_id as string;
    await receives(composeOnBeta(a1), "A16-SOLO");
    const soloTeam = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", description: "AC-016 studio work. Marker A16-STUDIO." });
    expect(soloTeam, JSON.stringify(soloTeam)).toMatchObject({ delegated: true, target_kind: "team" });
    const t1 = soloTeam.target_team_run_id as string, t1Coord = soloTeam.target_team_coordinator_agent_run_id as string;
    await receives(teamActor(beta, t1, t1Coord, "beta AC-016 studio lead"), "A16-STUDIO");
    expect((await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: solo.runId })).terminateAgentRun.success).toBe(true);
    await until(async () => !(await isDelegatorActive("agent", solo.runId)), "the solo delegator stopped", 30_000);
    const soloView = await connect(alpha, "agent-collaboration", solo.runId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const soloRoot = { kind: "agent" as const, runId: solo.runId };
    // Live status: the stopped delegator's tree keeps its peer rows, answered by beta; their statuses by their own run IDs.
    const a1Status = await runStatus(alpha, "agent", a1), t1Status = await runStatus(alpha, "agent_team", t1);
    out.soloRows = { a1: (await peerRowOf(alpha, "agent", solo.runId, a1)).row, t1: (await peerRowOf(alpha, "agent", solo.runId, t1)).row };
    expect(out.soloRows.a1.peer, JSON.stringify(out.soloRows)).toMatchObject({ reachable: true, title: expect.stringContaining("A16-SOLO") });
    await until(() => ["idle", "running", "initializing"].includes(String(a1Status.latest(a1))), "a1 live by its run ID", 30_000);
    out.soloStatuses = { a1: a1Status.latest(a1), t1Coord: t1Status.latest(t1Coord) };
    // The owner's message to the peer Agent, from the stopped delegator's view (base's command shape; the server uses the handle).
    const sent = await ackOf(soloView, rootCommand(soloView, soloRoot, "SEND_MESSAGE", a1, ownerText("status? Marker A16-OWNER-SOLO")));
    expect(sent, JSON.stringify(sent)).toMatchObject({ state: "accepted" });
    await receives(composeOnBeta(a1), "A16-OWNER-SOLO");
    // Interrupt: a held turn on beta, then INTERRUPT_GENERATION from the stopped delegator's view.
    expect((await ackOf(soloView, rootCommand(soloView, soloRoot, "SEND_MESSAGE", a1, ownerText("HOLD_TURN Marker A16-HOLD")))).state).toBe("accepted");
    await until(async () => (await betaConversation(a1)).includes("A16-HOLD"), "the held turn on beta", 20_000);
    const interrupted = await ackOf(soloView, rootCommand(soloView, soloRoot, "INTERRUPT_GENERATION", a1));
    expect(interrupted, JSON.stringify(interrupted)).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    // The stored conversation, read through alpha with the delegator stopped.
    const stored = JSON.stringify((await alpha.gql(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(runId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: solo.runId, a: "/publisher", r: a1 })).agentRunCollaborationMemberProjection?.conversation ?? null);
    expect(stored).toContain("A16-OWNER-SOLO");
    // The owner's message to the peer Team's coordinator.
    const toTeam = await ackOf(soloView, rootCommand(soloView, soloRoot, "SEND_MESSAGE", t1Coord, ownerText("status? Marker A16-OWNER-TEAM")));
    expect(toTeam, JSON.stringify(toTeam)).toMatchObject({ state: "accepted" });
    await receives(teamActor(beta, t1, t1Coord, "beta AC-016 studio lead"), "A16-OWNER-TEAM");
    // Stop, by each run's own ID (the standard terminate; SR-066): the runs stop on beta.
    expect((await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: a1 })).terminateAgentRun, "Stop of the peer Agent").toMatchObject({ success: true });
    await until(async () => !(await processLive(a1)), "a1's CLI gone on beta", 20_000);
    expect((await alpha.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: t1 })).terminateAgentTeamRun, "Stop of the peer Team").toMatchObject({ success: true });
    await until(async () => !(await betaTeamActive(t1)), "the peer Team stopped on beta", 20_000);
    expect(await isDelegatorActive("agent", solo.runId), "the solo delegator stayed stopped").toBe(false);
    for (const socket of [a1Status.socket, t1Status.socket, soloView.socket]) socket.close();

    // 2. A Team member delegator with a peer Agent; the team is stopped.
    const teamCreated = (await alpha.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: defs.team, teamConfigs: [{ teamAddress: "/", ...runConfig(alpha) }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: defs.delegator, ...runConfig(alpha) },
        { memberAddress: "/mate", agentDefinitionId: defs.delegator, ...runConfig(alpha) }] } })).createAgentTeamRun;
    expect(teamCreated.success, teamCreated.message).toBe(true);
    const teamRunId = teamCreated.teamRunId as string;
    const teamMembers = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`,
      { id: teamRunId })).getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    const teamDelegated = await delegateRemote(teamActor(alpha, teamRunId, teamMembers["/lead"]!, "AC-016 team lead"), "AC-016 team work. Marker A16-TEAM.");
    const a2 = teamDelegated.target_agent_run_id as string;
    await receives(composeOnBeta(a2), "A16-TEAM");
    expect((await alpha.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: teamRunId })).terminateAgentTeamRun.success).toBe(true);
    await until(async () => !(await isDelegatorActive("team", teamRunId)), "the team delegator stopped", 30_000);
    const teamView = await connect(alpha, "agent-team", teamRunId, (frames) => frames.some((frame) => frame.type === "TEAM_EXECUTION_VIEW_SNAPSHOT"));
    const a2Status = await runStatus(alpha, "agent", a2);
    out.teamRow = (await peerRowOf(alpha, "agent_team", teamRunId, a2)).row;
    teamView.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: { ...buildE2eClientCommandIds(), context_file_paths: [], image_urls: [], agent_run_id: a2,
      content: "Owner of alpha here. Marker A16-OWNER-TEAMVIEW." } }));
    await receives(composeOnBeta(a2), "A16-OWNER-TEAMVIEW");
    const teamStored = JSON.stringify((await alpha.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`,
      { id: teamRunId, a: a2 })).getTeamMemberRunProjection?.conversation ?? null);
    expect(teamStored).toContain("A16-OWNER-TEAMVIEW");
    expect((await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: a2 })).terminateAgentRun).toMatchObject({ success: true });
    await until(async () => !(await processLive(a2)), "a2's CLI gone on beta", 20_000);
    expect(await isDelegatorActive("team", teamRunId), "the team delegator stayed stopped").toBe(false);
    for (const socket of [a2Status.socket, teamView.socket]) socket.close();

    // 3. An Org agent delegator with a peer Agent; the org is stopped.
    const orgCreated = (await alpha.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: defs.org, rootConfiguration: runConfig(alpha), agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun;
    expect(orgCreated.success, orgCreated.message).toBe(true);
    const orgRunId = orgCreated.agentOrgRunId as string;
    const orgTree = (await alpha.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: orgRunId })).getAgentOrgRunConfig.executionTree;
    const orgLead = (orgTree.rootOrg.members as Rec[]).find((entry) => entry.address === "/lead")!.agentRunId as string;
    const orgDelegated = await delegateRemote(orgActor(alpha, orgRunId, "/lead", orgLead, "AC-016 org lead"), "AC-016 org work. Marker A16-ORG.");
    const a3 = orgDelegated.target_agent_run_id as string;
    await receives(composeOnBeta(a3), "A16-ORG");
    expect((await alpha.gql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: orgRunId })).terminateAgentOrgRun.success).toBe(true);
    await until(async () => !(await isDelegatorActive("org", orgRunId)), "the org delegator stopped", 30_000);
    const orgView = await connect(alpha, "agent-org", orgRunId, (frames) => frames.some((frame) => frame.type === "ROOT_EXECUTION_VIEW_SNAPSHOT"));
    const orgRoot = { kind: "agent_org" as const, runId: orgRunId };
    const a3Status = await runStatus(alpha, "agent", a3);
    out.orgRow = (await peerRowOf(alpha, "agent_org", orgRunId, a3)).row;
    const orgSent = await ackOf(orgView, rootCommand(orgView, orgRoot, "SEND_MESSAGE", a3, ownerText("status? Marker A16-OWNER-ORG")));
    expect(orgSent, JSON.stringify(orgSent)).toMatchObject({ state: "accepted" });
    await receives(composeOnBeta(a3), "A16-OWNER-ORG");
    const orgStored = JSON.stringify((await alpha.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
      { id: orgRunId, a: a3, m: "/publisher" })).getAgentOrgMemberRunProjection?.conversation ?? null);
    expect(orgStored).toContain("A16-OWNER-ORG");
    expect((await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: a3 })).terminateAgentRun).toMatchObject({ success: true });
    await until(async () => !(await processLive(a3)), "a3's CLI gone on beta", 20_000);
    expect(await isDelegatorActive("org", orgRunId), "the org delegator stayed stopped").toBe(false);
    for (const socket of [a3Status.socket, orgView.socket]) socket.close();
    record("RC-43", { ...out, a1, t1, a2, a3 });
  }, 420_000);

  it("RC-35 278 security, 461 SR-088, 591 AC-005: a registered peer that did not start the run is refused on every route (the agent stream snapshot and observation too, and the delegated-run state); naming an agent outside the run is refused; summaries omit runs the caller did not start", async () => {
    const r9 = ids.treeRun as string;
    const gamma = new NodeServer("gamma", root, await getFreePort());
    try {
      await gamma.start();
      await gamma.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
      await pairNodes({ inviter: (query, variables) => beta.gql(query, variables), accepter: (query, variables) => gamma.gql(query, variables),
        inviterName: "beta-node", accepterName: "gamma-node" });
      const beltaLocal = await createStandalone(beta, defs.publisher, "beta's own run");
      await beltaLocal.send("Beta's own work. Marker BETA-LOCAL.");
      await receives(beltaLocal, "BETA-LOCAL");
      const envelopeOf = (node: NodeServer) => ({ fromNodeId: node.nodeId, toNodeId: beta.nodeId });
      const root9 = { kind: "agent", runId: r9 };
      // gamma (registered on beta) asks about alpha's run.
      const fromGamma = {
        summaries: await asPeerTo(beta, PATHS.runSummaries, { ...envelopeOf(gamma), runs: [{ kind: "agent", runId: r9 }] }),
        projection: await asPeerTo(beta, PATHS.agentProjection, { ...envelopeOf(gamma), targetRoot: root9, agentRunId: r9 }),
        command: await asPeerTo(beta, PATHS.ownerCommands, { ...envelopeOf(gamma), targetRoot: root9, agentRunId: r9, command: { kind: "interrupt" } }),
        // 461 SR-088: one agent's own stream snapshot.
        streamSnapshot: await asPeerTo(beta, PATHS.agentStreamSnapshot, { ...envelopeOf(gamma), targetRoot: root9, agentRunId: r9 }),
      };
      const observationAnswer = async (from: NodeServer, targetRoot: Rec, agentRunId?: string) => {
        const socket = new WebSocket(`ws://127.0.0.1:${beta.port}${PATHS.runObservations}`,
          { headers: await beta.peerHeadersFrom(from.nodeId, "GET", PATHS.runObservations, null) });
        sockets.push(socket);
        const frames: unknown[] = [];
        let closedCode: number | null = null;
        socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
        socket.on("close", (code: number) => { closedCode = code; });
        await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
        socket.send(JSON.stringify({ ...envelopeOf(from), targetRoot, ...(agentRunId ? { agentRunId } : {}) }));
        await until(() => closedCode !== null || frames.length > 0, "the observation's first answer", 10_000);
        await wait(500);
        return { first: frames[0] ?? null, closedCode, frames: frames.length };
      };
      const observationFromGamma = await observationAnswer(gamma, root9);
      // 461 SR-088: one agent's own numbered frames, on the observation route opened for the agent.
      const agentStreamFromGamma = await observationAnswer(gamma, root9, r9);
      expect(fromGamma.summaries.answer, JSON.stringify(fromGamma.summaries)).toMatchObject({ accepted: true, runs: [] });
      for (const answer of [fromGamma.projection.answer, fromGamma.command.answer, fromGamma.streamSnapshot.answer, observationFromGamma.first as Rec, agentStreamFromGamma.first as Rec]) {
        expect(answer, JSON.stringify(answer)).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
      }
      // alpha asks about beta's own run (not started by alpha), and names an agent outside its own run.
      const betaRoot = { kind: "agent", runId: beltaLocal.runId };
      const fromAlpha = {
        summaries: await asPeerTo(beta, PATHS.runSummaries, { ...envelopeOf(alpha), runs: [{ kind: "agent", runId: r9 }, { kind: "agent", runId: beltaLocal.runId }] }),
        projection: await asPeerTo(beta, PATHS.agentProjection, { ...envelopeOf(alpha), targetRoot: betaRoot, agentRunId: beltaLocal.runId }),
        command: await asPeerTo(beta, PATHS.ownerCommands, { ...envelopeOf(alpha), targetRoot: betaRoot, agentRunId: beltaLocal.runId,
          command: { kind: "post_message", content: "INTRUDER", messageId: randomUUID(), dedupeKey: randomUUID() } }),
        unpairedProjection: await asPeerTo(beta, PATHS.agentProjection, { ...envelopeOf(alpha), targetRoot: root9, agentRunId: beltaLocal.runId }),
        unpairedCommand: await asPeerTo(beta, PATHS.ownerCommands, { ...envelopeOf(alpha), targetRoot: root9, agentRunId: beltaLocal.runId, command: { kind: "interrupt" } }),
        streamSnapshot: await asPeerTo(beta, PATHS.agentStreamSnapshot, { ...envelopeOf(alpha), targetRoot: betaRoot, agentRunId: beltaLocal.runId }),
        unpairedStreamSnapshot: await asPeerTo(beta, PATHS.agentStreamSnapshot, { ...envelopeOf(alpha), targetRoot: root9, agentRunId: beltaLocal.runId }),
      };
      const observationOfBetaRun = await observationAnswer(alpha, betaRoot);
      const agentStreamOfBetaRun = await observationAnswer(alpha, betaRoot, beltaLocal.runId);
      const unpairedAgentStream = await observationAnswer(alpha, root9, beltaLocal.runId);
      expect((fromAlpha.summaries.answer.runs as Rec[]).map((run) => run.runId), "only the run alpha started").toEqual([r9]);
      for (const answer of [fromAlpha.projection.answer, fromAlpha.command.answer, fromAlpha.streamSnapshot.answer, observationOfBetaRun.first as Rec, agentStreamOfBetaRun.first as Rec]) {
        expect(answer, JSON.stringify(answer)).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
      }
      for (const answer of [fromAlpha.unpairedProjection.answer, fromAlpha.unpairedCommand.answer, fromAlpha.unpairedStreamSnapshot.answer, unpairedAgentStream.first as Rec]) {
        expect(answer, JSON.stringify(answer)).toMatchObject({ accepted: false });
      }
      expect(await betaConversation(beltaLocal.runId), "nothing reached beta's own run").not.toContain("INTRUDER");
      // 591 AC-005 (REQ-003): "closed" for alpha's run from gamma, and for beta's own run from alpha: refused; nothing is
      // recorded, stopped or dropped from beta's list.
      const runningBefore = await processLive(beltaLocal.runId);
      expect(runningBefore, "beta's own run is running").toBe(true);
      const listedBefore = { r9: await betaListed(r9), betaLocal: await betaListed(beltaLocal.runId) };
      const runStates = {
        fromGamma: await asPeerTo(beta, PATHS.runStates, { ...envelopeOf(gamma), run: { kind: "agent", runId: r9 }, open: false }),
        ofBetaRun: await asPeerTo(beta, PATHS.runStates, { ...envelopeOf(alpha), run: { kind: "agent", runId: beltaLocal.runId }, open: false }),
      };
      for (const answer of [runStates.fromGamma.answer, runStates.ofBetaRun.answer]) {
        expect(answer, JSON.stringify(answer)).toMatchObject({ accepted: false, code: "REMOTE_TARGET_NOT_PERMITTED" });
      }
      await wait(2_000);
      expect((await closedOnBeta()).filter((entry) => entry.runId === r9 || entry.runId === beltaLocal.runId), "nothing recorded").toEqual([]);
      expect(await processLive(beltaLocal.runId), "beta's own run keeps running").toBe(true);
      expect({ r9: await betaListed(r9), betaLocal: await betaListed(beltaLocal.runId) }, "beta's list unchanged").toEqual(listedBefore);
      record("RC-35", { runStates: { fromGamma: runStates.fromGamma.answer, ofBetaRun: runStates.ofBetaRun.answer }, fromGamma: { summaries: fromGamma.summaries.answer, projection: fromGamma.projection.answer, command: fromGamma.command.answer, observation: observationFromGamma,
        streamSnapshot: fromGamma.streamSnapshot.answer, agentStream: agentStreamFromGamma },
        fromAlphaAgentStreams: { snapshot: fromAlpha.streamSnapshot.answer, unpairedSnapshot: fromAlpha.unpairedStreamSnapshot.answer, observation: agentStreamOfBetaRun, unpaired: unpairedAgentStream },
        fromAlpha: { summaries: fromAlpha.summaries.answer, projection: fromAlpha.projection.answer, command: fromAlpha.command.answer, unpairedProjection: fromAlpha.unpairedProjection.answer,
          unpairedCommand: fromAlpha.unpairedCommand.answer, observation: observationOfBetaRun } });
    } finally {
      await beta.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: gamma.nodeId }).catch(() => undefined);
      await gamma.stop();
    }
  }, 180_000);

  it("RC-12 AC-106, 247 AC-304: the remote run and the remote Team on beta are shut down after the idle grace period, and a follow-up restores each with its conversation", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const lead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const liveAtStart = await processLive(ids.r1);
    // 247: a member with a running background task is not quiet, so the whole remote Team stays (all or nothing).
    const BUSY_SECONDS = 90;
    const busyFrom = Date.now();
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.checker,
      content: `BUSY-CHECKER BACKGROUND_STEP:${JSON.stringify({ seconds: BUSY_SECONDS, exitCode: 0 })}` })).toMatchObject({ accepted: true });
    await receives(teamActor(beta, ids.studio.teamRunId, ids.studio.checker, "beta studio checker"), "BUSY-CHECKER");
    const startedWaiting = Date.now();
    await until(async () => !(await processLive(ids.r1)), "remote run shut down after the idle grace period", GRACE_MS + 120_000);
    const shutDownAfterMs = Date.now() - startedWaiting;
    const launchesBefore = (await beta.launches()).length;
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "AFTER-IDLE-FROM-ALPHA" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-IDLE-FROM-ALPHA");
    const relaunches = (await beta.launches()).slice(launchesBefore).filter((launch) => launch.cwd.includes(ids.r1));
    expect(relaunches, "restored once").toHaveLength(1);
    expect(relaunches[0]!.argv).toContain("--conversation");
    // The remote Team: past one grace period, the busy checker holds every member, the idle coordinator included.
    await new Promise((resolve) => setTimeout(resolve, Math.max(0, busyFrom + GRACE_MS + 15_000 - Date.now())));
    const heldAfterGrace = { coordinator: await processLive(ids.studio.coord), checker: await processLive(ids.studio.checker), atMs: Date.now() - busyFrom };
    expect(heldAfterGrace, "a busy member holds the whole Team past the grace period").toMatchObject({ coordinator: true, checker: true });
    // When the background task ends, every member is quiet: one grace period later the Team stops (its package kept).
    await until(async () => !(await processLive(ids.studio.coord)) && !(await processLive(ids.studio.checker)), "remote Team shut down after the idle grace period", BUSY_SECONDS * 1000 + GRACE_MS + 120_000);
    const teamShutDownAfterMs = Date.now() - busyFrom;
    expect(teamShutDownAfterMs, "not before the background task ended").toBeGreaterThanOrEqual(BUSY_SECONDS * 1000);
    // RC-25's unused Team run (no member ever started): its idle schedule stopped it; it stays in history.
    const teamRuns = async () => ((await beta.gql(`query{listWorkspaceRunHistory(limitPerAgent:20){teamDefinitions{runs{teamRunId isActive}}}}`)).listWorkspaceRunHistory as Rec[])
      .flatMap((group) => (group.teamDefinitions as Rec[]).flatMap((definition) => definition.runs as Rec[]));
    const unusedListed = (await teamRuns()).find((run) => run.teamRunId === ids.unusedTeam);
    expect(unusedListed, "the unused Team run is in history, stopped").toMatchObject({ isActive: false });
    expect((await walkFiles(path.join(beta.memory, "agent_teams", ids.unusedTeam as string))).filter((file) => /communication_messages.*\.jsonl$/.test(file) && fs.statSync(file).size > 0),
      "the unused Team run has no messages").toEqual([]);
    const studioListed = (await teamRuns()).find((run) => run.teamRunId === ids.studio.teamRunId);
    const teamLaunchesBefore = (await beta.launches()).length;
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.coord, content: "AFTER-IDLE-TO-STUDIO" })).toMatchObject({ accepted: true });
    await receives(teamActor(beta, ids.studio.teamRunId, ids.studio.coord, "beta studio coordinator"), "AFTER-IDLE-TO-STUDIO");
    const teamRelaunches = (await beta.launches()).slice(teamLaunchesBefore).filter((launch) => launch.cwd.includes(ids.studio.coord));
    expect(teamRelaunches.filter((launch) => launch.argv.includes("--conversation")), "the coordinator restored with its conversation").toHaveLength(1);
    expect((await beta.launches()).slice(teamLaunchesBefore).filter((launch) => launch.cwd.includes(ids.studio.checker)), "only the addressed member restarts").toEqual([]);
    record("RC-12", { liveAtStart, shutDownAfterMs, relaunch: relaunches[0], heldAfterGrace, teamShutDownAfterMs, studioListedWhenStopped: studioListed, unusedListed, teamRelaunch: teamRelaunches[0] });
  }, 480_000);

  it("RC-36 278 AC-805: after the idle grace a quiet remote run reads offline in alpha's view; a message from alpha's window restores it with its conversation", async () => {
    const idleRun = ids.idleRemote as string;
    await until(async () => !(await processLive(idleRun)), "the quiet remote run shut down", GRACE_MS + 60_000);
    // AC-805: shut down, not gone: its row keeps its title, beta answers for it, and its status by its run ID reads offline.
    const idleStatus = await runStatus(alpha, "agent", idleRun);
    const { row } = await peerRowOf(alpha, "agent", ids.treeDelegator as string, idleRun);
    expect(row.peer, JSON.stringify(row)).toMatchObject({ reachable: true, title: "Idle work. Marker IDLE-PACKET." });
    await until(() => idleStatus.latest(idleRun) === "offline", "the quiet run offline by its run ID", 25_000)
      .catch((error: Error) => { throw Object.assign(error, { message: `${error.message}: ${JSON.stringify(idleStatus.frames)}` }); });
    const offline = { row: row.peer, status: idleStatus.latest(idleRun), state: idleStatus.statesOf(idleRun).at(-1) };
    // A message from alpha's window (the row opened by its own identity, G-D1) restores it with its conversation.
    const opened = await peerRun("agent", idleRun, idleRun);
    expect(opened.count("IDLE-PACKET"), "the stopped run's snapshot is its stored conversation").toBe(1);
    const launchesBefore = (await beta.launches()).length;
    const ack = await opened.send("Wake up. Marker WAKE-FROM-ALPHA.");
    expect(ack.accepted, JSON.stringify(ack)).toBe(true);
    await receives(composeOnBeta(idleRun), "WAKE-FROM-ALPHA");
    const relaunches = (await beta.launches()).slice(launchesBefore).filter((launch) => launch.cwd.includes(idleRun));
    expect(relaunches.filter((launch) => launch.argv.includes("--conversation")), "restored with its conversation").toHaveLength(1);
    idleStatus.socket.close();
    opened.socket.close();
    record("RC-36", { offline, ack, relaunch: relaunches[0] });
  }, 240_000);

  it("RC-13 AC-106/REQ-108: after beta restarts, a follow-up restores the remote run; after alpha restarts, replies restore every root kind and wake the delegators", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const teamLead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const orgLead = orgActor(alpha, ids.org.orgRunId, "/lead", ids.org.lead, "alpha org lead");
    // The peer links as the Task entries record them (contract §3.1).
    const linksNow = async () => ({ solo: await linksOf("agent", ids.solo), team: await linksOf("agent_team", ids.team.teamRunId), org: await linksOf("agent_org", ids.org.orgRunId) });
    const linksBefore = await linksNow();
    const backLinksBefore = await Promise.all([ids.r1, ids.team.r2, ids.org.r5].map(async (id) => (await betaMetadata(id)).delegatedFrom));
    const studioBackLinkBefore = (await betaTeamTree(ids.studio.teamRunId)).delegatedFrom;
    const studioCoordinator = teamActor(beta, ids.studio.teamRunId, ids.studio.coord, "beta studio coordinator");

    // Restart of the receiving node: the delegator's follow-up restores the remote run with its conversation.
    await beta.stop();
    await beta.start();
    const betaLaunches = (await beta.launches()).length;
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "AFTER-BETA-RESTART-SOLO" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-BETA-RESTART-SOLO");
    const betaRelaunches = (await beta.launches()).slice(betaLaunches).filter((launch) => launch.cwd.includes(ids.r1));
    expect(betaRelaunches.filter((launch) => launch.argv.includes("--conversation")), "remote run restored once").toHaveLength(1);
    // 247: the remote Team on the restarted beta is restored by the delegator's follow-up (alpha still running).
    expect(await calls(teamLead, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.coord, content: "AFTER-BETA-RESTART-STUDIO" })).toMatchObject({ accepted: true });
    await receives(studioCoordinator, "AFTER-BETA-RESTART-STUDIO");
    expect((await beta.launches()).slice(betaLaunches).filter((launch) => launch.cwd.includes(ids.studio.coord) && launch.argv.includes("--conversation")), "remote Team coordinator restored").toHaveLength(1);

    // Restart of the delegating node: each remote run replies; the reply restores its coordinating root on alpha.
    await alpha.stop();
    await alpha.start();
    const alphaLaunches = (await alpha.launches()).length;
    const replies: Rec = {};
    for (const [kind, remoteId, delegator, marker] of [["solo", ids.r1, ids.solo, "AFTER-ALPHA-RESTART-TO-SOLO"], ["team", ids.team.r2, ids.team.lead, "AFTER-ALPHA-RESTART-TO-TEAM"],
      ["org", ids.org.r5, ids.org.lead, "AFTER-ALPHA-RESTART-TO-ORG"]] as const) {
      replies[kind] = await calls(composeOnBeta(remoteId), "send_message_to", { node: LABEL.alpha, target_agent_run_id: delegator, content: marker });
    }
    expect(replies.solo, JSON.stringify(replies.solo)).toMatchObject({ accepted: true });
    expect(await receives(solo, "AFTER-ALPHA-RESTART-TO-SOLO")).toContain(`on node "${LABEL.beta}"`);
    const alphaRelaunches = (await alpha.launches()).slice(alphaLaunches);
    expect(alphaRelaunches.filter((launch) => launch.cwd.includes(ids.solo) && launch.argv.includes("--conversation")), "standalone delegator woken").toHaveLength(1);
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "AFTER-ALPHA-RESTART-FROM-SOLO" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-ALPHA-RESTART-FROM-SOLO");
    expect(await linksNow(), "links unchanged on disk after restarts and later saves").toEqual(linksBefore);
    expect(await Promise.all([ids.r1, ids.team.r2, ids.org.r5].map(async (id) => (await betaMetadata(id)).delegatedFrom))).toEqual(backLinksBefore);

    // Team and Org delegators (DS-003 restore by coordinatingRun): observed first, then asserted.
    const delivered = async (node: NodeServer, content: string) => (await walkFiles(node.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file))
      .some((file) => fs.readFileSync(file, "utf8").includes(JSON.stringify(content)));
    const observed: Rec = {};
    for (const [kind, actor, marker] of [["team", teamLead, "AFTER-ALPHA-RESTART-TO-TEAM"], ["org", orgLead, "AFTER-ALPHA-RESTART-TO-ORG"]] as const) {
      observed[kind] = { reply: { accepted: replies[kind].accepted, text: textOf(replies[kind]) }, inAlphaLog: await delivered(alpha, marker),
        delegatorRelaunched: alphaRelaunches.some((launch) => launch.cwd.includes(actor.runId) && launch.argv.includes("--conversation")),
        conversation: await actor.conversation().then(() => "readable", (error: Error) => error.message) };
    }
    record("RC-13", { betaRelaunches, alphaRelaunches, replies: Object.fromEntries(Object.entries(replies).map(([k, v]) => [k, textOf(v as Rec)])), observed, linksAfter: await linksNow() });
    for (const [kind, actor, marker] of [["team", teamLead, "AFTER-ALPHA-RESTART-TO-TEAM"], ["org", orgLead, "AFTER-ALPHA-RESTART-TO-ORG"]] as const) {
      expect(observed[kind], `${kind} delegator after alpha's restart`).toMatchObject({ reply: { accepted: true }, inAlphaLog: true, delegatorRelaunched: true, conversation: "readable" });
      await receives(actor, marker);
    }
    // The owner opens the Team and Org runs (their configuration and views load), also after another root is created
    // (a new root re-scans every package), and the woken delegators follow up to their remote runs.
    await createStandalone(alpha, defs.delegator, "alpha root created after the restart");
    const teamConfig = (await alpha.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){teamRunId executionTree}}`, { id: ids.team.teamRunId })).getTeamRunResumeConfig;
    const orgConfig = (await alpha.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: ids.org.orgRunId })).getAgentOrgRunConfig;
    expect(flattenE2eConfiguredAgentExecutions(teamConfig.executionTree).map((member) => member.agentRunId)).toContain(ids.team.lead);
    expect((orgConfig.executionTree.rootOrg.members as Rec[]).map((member) => member.agentRunId)).toContain(ids.org.lead);
    for (const [actor, remoteId, marker] of [[teamLead, ids.team.r2, "AFTER-ALPHA-RESTART-FROM-TEAM"], [orgLead, ids.org.r5, "AFTER-ALPHA-RESTART-FROM-ORG"]] as const) {
      expect(await calls(actor, "send_message_to", { node: LABEL.beta, target_agent_run_id: remoteId, content: marker })).toMatchObject({ accepted: true });
      await receives(composeOnBeta(remoteId), marker);
      await assertBothLogs(marker, actor, composeOnBeta(remoteId));
    }
    // 247: after alpha's restart, the remote Team's coordinator replies; alpha's Team root takes it and the lead reads it.
    const studioReply = await calls(studioCoordinator, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.team.lead, content: "AFTER-ALPHA-RESTART-FROM-STUDIO" });
    expect(studioReply, JSON.stringify(studioReply)).toMatchObject({ accepted: true });
    expect(await receives(teamLead, "AFTER-ALPHA-RESTART-FROM-STUDIO")).toContain(`sender run id "${ids.studio.coord}" on node "${LABEL.beta}"`);
    expect((await betaTeamTree(ids.studio.teamRunId)).delegatedFrom, "beta's Team back-link unchanged").toEqual(studioBackLinkBefore);
    // 247 AC-304, cold: alpha restarts again and the remote Team's reply is the first thing alpha receives, so the Team
    // link alone restores alpha's Team root and wakes the lead (nothing on alpha is opened before the relaunch is seen).
    await alpha.stop();
    await alpha.start();
    const coldLaunches = (await alpha.launches()).length;
    const coldReply = await calls(studioCoordinator, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.team.lead, content: "COLD-WAKE-FROM-STUDIO" });
    expect(coldReply, JSON.stringify(coldReply)).toMatchObject({ accepted: true });
    const coldWoken = (launch: { argv: string[]; cwd: string }) => launch.cwd.includes(ids.team.lead) && launch.argv.includes("--conversation");
    await until(async () => (await alpha.launches()).slice(coldLaunches).some(coldWoken), "the lead woken by the Team link alone", 30_000);
    expect(await delivered(alpha, "COLD-WAKE-FROM-STUDIO"), "in alpha's Team log").toBe(true);
    expect(await receives(teamLead, "COLD-WAKE-FROM-STUDIO")).toContain(`sender run id "${ids.studio.coord}" on node "${LABEL.beta}"`);
    const coldRelaunches = (await alpha.launches()).slice(coldLaunches);
    expect(coldRelaunches.filter(coldWoken), "the lead woken once").toHaveLength(1);
    record("RC-13", { reopened: { teamRunId: teamConfig.teamRunId, orgMembers: (orgConfig.executionTree.rootOrg.members as Rec[]).length }, studioReply: textOf(studioReply),
      coldWake: { reply: textOf(coldReply), relaunches: coldRelaunches } });
  }, 420_000);

  it("RC-24 247 REQ-307: beta's owner stops the peer-started Team during its idle grace; it shows as inactive in history; the delegator's next message restores it", async () => {
    const lead = teamActor(alpha, ids.team.teamRunId, ids.team.lead, "alpha team lead");
    const stopped = (await beta.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success message}}`, { id: ids.studio.teamRunId })).terminateAgentTeamRun;
    expect(stopped.success, stopped.message).toBe(true);
    await until(async () => !(await processLive(ids.studio.coord)) && !(await processLive(ids.studio.checker)), "Team processes gone after the owner's Stop", 30_000);
    const history = (await beta.gql(`query{listWorkspaceRunHistory(limitPerAgent:20){teamDefinitions{teamDefinitionName runs{teamRunId isActive}}}}`)).listWorkspaceRunHistory as Rec[];
    const listed = history.flatMap((group) => (group.teamDefinitions as Rec[]).flatMap((definition) => definition.runs as Rec[])).find((run) => run.teamRunId === ids.studio.teamRunId);
    expect(listed, "still in history, inactive").toMatchObject({ isActive: false });
    const launchesBefore = (await beta.launches()).length;
    expect(await calls(lead, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.studio.coord, content: "AFTER-OWNER-STOP" })).toMatchObject({ accepted: true });
    await receives(teamActor(beta, ids.studio.teamRunId, ids.studio.coord, "beta studio coordinator"), "AFTER-OWNER-STOP");
    const relaunches = (await beta.launches()).slice(launchesBefore).filter((launch) => launch.cwd.includes(ids.studio.coord));
    expect(relaunches.filter((launch) => launch.argv.includes("--conversation")), "restored with its conversation").toHaveLength(1);
    record("RC-24", { stopped, listed, relaunch: relaunches[0] });
  }, 180_000);

  it("RC-26 261 AC-402/AC-404/AC-406/QR-402: an agent that selects the discovery tools lists exactly what beta offers, each entry only name, kind, address and description; listing writes nothing; every listed address is accepted by delegate_task; an agent without the tools does not have them (290: nor one that selects only the former name list_available_nodes)", async () => {
    const scout = await createStandalone(alpha, defs.scout, "alpha scout");
    ids.scout = scout.runId;
    const delegator = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    // Exposure over Agent Tools MCP (the scripted AGY runtime): the tools, and the texts, each agent actually has.
    const scoutTools = await toolsOf(scout);
    const delegatorTools = await toolsOf(delegator);
    const tool = (tools: Rec[], name: string) => tools.find((entry) => entry.name === name);
    expect(delegatorTools.map((entry) => entry.name), "without the selection, no discovery tool").not.toEqual(expect.arrayContaining(["list_peer_nodes"]));
    expect(delegatorTools.map((entry) => entry.name)).not.toContain("list_available_agents");
    // 290 REQ-906 (the accepted exception): selecting only the former name `list_available_nodes` gives no discovery tool.
    const oldNameScout = await createStandalone(alpha, defs.oldNameScout, "alpha old-name scout");
    const oldNameTools = (await toolsOf(oldNameScout)).map((entry) => entry.name);
    expect(oldNameTools, "the former name selects nothing").not.toEqual(expect.arrayContaining(["list_peer_nodes"]));
    expect(oldNameTools).not.toContain("list_available_nodes");
    expect(oldNameTools, "the agent still has its other tools").toContain("delegate_task");
    expect(tool(scoutTools, "list_peer_nodes")?.description).toBe(TEXT_261.listPeerNodes);
    expect(tool(scoutTools, "list_available_agents")?.description).toBe(TEXT_261.listAgents);
    expect(tool(scoutTools, "list_available_agents")?.inputSchema?.properties?.node?.description).toBe(TEXT_261.listAgentsNode);
    expect(tool(scoutTools, "list_available_agents")?.inputSchema?.required ?? [], "node is optional").not.toContain("node");
    expect(tool(scoutTools, "delegate_task")?.description).toContain(TEXT_261.delegateNodeLine);
    expect(tool(scoutTools, "delegate_task")?.inputSchema?.properties?.node?.description).toBe(TEXT_261.delegateNode);

    // Beta's catalog has what must not be listed: the Model Router, an Org, a team-local Agent and an application-owned Team.
    // The built-in Daily Assistant is offered like any shared Agent (455 REQ-001), with its template description.
    const betaApps = (await beta.gql(`{ listApplications { localApplicationId } }`)).listApplications as Rec[];
    expect(betaApps.map((app) => app.localApplicationId), "Brief Studio is loaded on beta").toContain("brief-studio");
    const betaAgents = (await beta.gql(`{ agentDefinitions { id name } }`)).agentDefinitions as Rec[];
    const betaTeams = (await beta.gql(`{ agentTeamDefinitions { id name } }`)).agentTeamDefinitions as Rec[];
    const betaCatalog = { agents: betaAgents.map((entry) => entry.name), teams: betaTeams.map((entry) => entry.name) };

    const betaWrites = async () => ({ runs: await remoteRunDirs(), teams: await betaTeamRunDirs(),
      logs: await Promise.all((await walkFiles(beta.memory)).filter((file) => /communication_messages.*\.jsonl$/.test(file)).sort()
        .map(async (file) => [file, (await fsp.stat(file)).size])) });
    const writesBefore = await betaWrites();
    const alphaRecordsBefore = await alphaTaskRecordFiles();
    const sentBefore = captured.length;
    const listing = await calls(scout, "list_available_agents", { node: LABEL.beta });
    expect(listing.isError, JSON.stringify(listing)).toBe(false);
    const offer = listing.agents as Rec[];
    const agent = (name: string, description: string | null) => ({ name, kind: "agent", address: `/${name.toLowerCase().replace(/ /g, "_")}`, ...(description ? { description } : {}) });
    const team = (name: string, description: string) => ({ name, kind: "agent_team", address: `/${name.toLowerCase().replace(/ /g, "_")}`, description });
    const daily = (await beta.gql(`query($id:String!){agentDefinition(id:$id){name description}}`, { id: "autobyteus-daily-assistant" })).agentDefinition as Rec;
    expect(daily, "beta has the built-in Daily Assistant").toMatchObject({ name: "Daily Assistant" });
    const expected = [
      ...["Publisher", "Blank Slate", "Half Set", "Codex Writer", "Fragile", "Bystander", "Checker", "Project Task Manager"].map((name) => agent(name, `${name} (remote collaboration E2E)`)),
      agent("Plain Helper", null),
      agent("Daily Assistant", String(daily.description)),
      ...["Studio Team", "Hollow Team", "Codex Team"].map((name) => team(name, `${name} (remote Teams E2E)`)),
      team("Field Team", "Team with a team-local agent"),
    ];
    const byAddress = (entries: Rec[]) => [...entries].sort((a, b) => String(a.address).localeCompare(String(b.address)));
    expect(byAddress(offer), "exactly beta's shared Agents and Agent Teams, with only their name, kind, address and description").toEqual(byAddress(expected));
    expect(offer.find((entry) => entry.name === "Plain Helper"), "no description field without a description").not.toHaveProperty("description");
    const offeredNames = offer.map((entry) => entry.name as string);
    for (const absent of ["Remote Org B", "Local Scout"]) expect(offeredNames, absent).not.toContain(absent);
    expect(offeredNames, "never the Model Router").not.toContain("Model Router");
    expect(offer.map((entry) => entry.address), "never the Model Router").not.toContain("/model_router");
    // Brief Studio's application-owned Team and its agents are in beta's catalog but not offered.
    const appOwned = [...betaCatalog.agents, ...betaCatalog.teams].map(String).filter((name) => name.startsWith("Brief Studio"));
    expect(appOwned, "beta has Brief Studio's application-owned definitions").toEqual(expect.arrayContaining(["Brief Studio Team"]));
    expect(offeredNames.filter((name) => appOwned.includes(name)), "no application-owned definition offered").toEqual([]);
    // On the wire: the envelope only, and an answer with only the contract's fields (REQ-403).
    const wire = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.availableAgents);
    expect(wire, "one request to beta").toHaveLength(1);
    expect(sortedKeys(wire[0]!.body as Rec)).toEqual(["fromNodeId", "toNodeId"]);
    expect(sortedKeys(wire[0]!.answer as Rec)).toEqual(["accepted", "agents", "nodeId"]);
    expect(byAddress((wire[0]!.answer as Rec).agents as Rec[]), "the tool result is beta's answer").toEqual(byAddress(offer));
    // 267 AC-502/REQ-510: the Nodes page's query answers the same list through the same discovery path, without addresses
    // (an absent description is null, GraphQL's form); exactly one of entries / refusalCode is set.
    const pageOffer = await peerNodeOffer(alpha, beta.nodeId);
    expect(pageOffer.offer.refusalCode).toBeNull();
    const asPageEntries = (entries: Rec[]) => byAddress(entries).map((entry) => ({ name: entry.name, kind: entry.kind, description: entry.description ?? null }));
    expect([...(pageOffer.offer.entries as Rec[])].sort((a, b) => String(a.name).localeCompare(String(b.name))),
      "the page's list equals list_available_agents {node}").toEqual(asPageEntries(offer).sort((a, b) => String(a.name).localeCompare(String(b.name))));
    expect((pageOffer.offer.entries as Rec[]).find((entry) => entry.name === "Plain Helper")?.description).toBeNull();
    // QR-402: listing started nothing, wrote no message and no Task record on either node.
    expect(await betaWrites(), "nothing written on beta").toEqual(writesBefore);
    expect(await alphaTaskRecordFiles(), "nothing written on alpha").toEqual(alphaRecordsBefore);

    // Every listed address is one delegate_task with the same node accepts: it starts, or is refused only for its runtime.
    const delegations: Rec = {};
    for (const entry of offer) {
      const result = await calls(scout, "delegate_task", { node: LABEL.beta, recipient_address: entry.address, description: `Discovered work. Marker FOUND${entry.address}.` });
      delegations[entry.address as string] = result.delegated ? { delegated: true, kind: result.target_kind } : { delegated: false, text: textOf(result) };
      if (result.delegated) expect(result.target_kind, String(entry.address)).toBe(entry.kind === "agent_team" ? "team" : "agent");
      else expect(textOf(result), String(entry.address)).toMatch(/^(There is no default runtime configured for the target agent|The Agent (Team )?.+ cannot run there: )/);
    }
    expect(delegations["/publisher"]).toEqual({ delegated: true, kind: "agent" });
    expect(delegations["/studio_team"]).toEqual({ delegated: true, kind: "team" });
    // 455: beta's Daily Assistant is admitted; with no default of its own and Model Routing off it is refused only for that.
    expect(delegations["/daily_assistant"]).toEqual({ delegated: false,
      text: `There is no default runtime configured for the target agent Daily Assistant on node "${LABEL.beta}", and Model Routing is off on node "${LABEL.beta}".` });
    record("RC-26", { scoutTools: scoutTools.map((entry) => entry.name), delegatorTools: delegatorTools.map((entry) => entry.name), offer, wire: { body: wire[0]!.body, answer: wire[0]!.answer },
      betaCatalog, delegations, pageOffer });
  }, 300_000);

  it("RC-38 308 AC-003/AC-005: beta's internal agent is not offered to alpha and delegating it is refused while beta hides it; once beta shows it (no restart) it is offered and accepted; hidden again, refused again", async () => {
    const scout = await createStandalone(alpha, defs.scout, "alpha scout (308)");
    const hidden = { name: "Hidden Helper", kind: "agent", address: "/hidden_helper", description: "Beta's own helper (internal agents E2E)" };
    const SETTING = "AUTOBYTEUS_SHOW_INTERNAL_AGENTS";
    const setShown = (value: string) => beta.gql(`mutation($k:String!,$v:String!){ updateServerSetting(key:$k, value:$v) }`, { k: SETTING, v: value });
    const offerNames = async () => ((await calls(scout, "list_available_agents", { node: LABEL.beta })).agents as Rec[]);
    const pageNames = async () => ((await peerNodeOffer(alpha, beta.nodeId)).offer.entries as Rec[]).map((entry) => entry.name as string);
    const delegate = () => calls(scout, "delegate_task", { node: LABEL.beta, recipient_address: hidden.address, description: "Internal helper work. Marker HIDDEN." });
    // It exists on beta (by ID), but beta's setting is off (the default).
    expect((await beta.gql(`{ agentDefinition(id: "hidden-helper") { id internal } }`)).agentDefinition).toEqual({ id: "hidden-helper", internal: true });
    const hiddenOffer = await offerNames();
    expect(hiddenOffer.map((entry) => entry.name), "not offered while hidden").not.toContain(hidden.name);
    expect(await pageNames(), "nor on alpha's Nodes page").not.toContain(hidden.name);
    const refused = await delegate();
    expect(refused.delegated, JSON.stringify(refused)).not.toBe(true);
    expect(textOf(refused), "today's not-found text: nothing says it is internal").toBe(TEXT_261.notFound(LABEL.beta, hidden.address));

    // Beta's owner shows internal agents: the next listing and delegation follow, without a restart.
    await setShown("true");
    const shownOffer = await offerNames();
    expect(shownOffer.find((entry) => entry.name === hidden.name), JSON.stringify(shownOffer)).toEqual(hidden);
    expect(shownOffer.length).toBe(hiddenOffer.length + 1);
    expect(await pageNames()).toContain(hidden.name);
    const accepted = await delegate();
    expect(accepted, JSON.stringify(accepted)).toMatchObject({ delegated: true, target_kind: "agent" });
    // 455 REQ-002: the Model Router stays out while beta shows internal agents: not offered, and refused.
    expect(shownOffer.map((entry) => entry.name), "no Model Router while shown").not.toContain("Model Router");
    const routerShown = await calls(scout, "delegate_task", { node: LABEL.beta, recipient_address: "/model_router", description: "Route this. Marker ROUTER." });
    expect(routerShown.delegated, JSON.stringify(routerShown)).not.toBe(true);
    expect(textOf(routerShown)).toBe(TEXT_261.notFound(LABEL.beta, "/model_router"));

    // Hidden again: refused again, with the same text.
    await setShown("false");
    expect((await offerNames()).map((entry) => entry.name)).not.toContain(hidden.name);
    expect(textOf(await delegate())).toBe(TEXT_261.notFound(LABEL.beta, hidden.address));
    record("RC-38", { hiddenOffer, shownOffer, refused: textOf(refused), accepted: { delegated: accepted.delegated, target_kind: accepted.target_kind },
      routerWhileShown: textOf(routerShown) });
  }, 300_000);

  it("RC-42 455 AC-004/REQ-004: once beta's owner gives its Daily Assistant a runtime and model, alpha's agent lists and delegates /daily_assistant on beta; it starts in beta's temp workspace and its report reaches alpha's delegator", async () => {
    const DA_ID = "autobyteus-daily-assistant";
    const delegator = await createStandalone(alpha, defs.scout, "alpha scout (455)");
    // Beta's owner sets the Daily Assistant's runtime and model (a personal setting of a built-in, as the Agents page saves it).
    const saved = (await beta.gql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id defaultLaunchConfig{runtimeKind llmModelIdentifier} personalSettings}}`,
      { input: { id: DA_ID, defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL } } })).updateAgentDefinition as Rec;
    expect(saved, JSON.stringify(saved)).toMatchObject({ id: DA_ID, defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL } });
    const daily = (await beta.gql(`query($id:String!){agentDefinition(id:$id){description}}`, { id: DA_ID })).agentDefinition as Rec;
    const listing = await calls(delegator, "list_available_agents", { node: LABEL.beta });
    expect((listing.agents as Rec[]).filter((entry) => entry.address === "/daily_assistant"))
      .toEqual([{ name: "Daily Assistant", kind: "agent", address: "/daily_assistant", description: daily.description }]);
    // The work itself makes the Daily Assistant report to its delegator (the scripted CLI runs the call on receipt).
    const delegated = await calls(delegator, "delegate_task", { node: LABEL.beta, recipient_address: "/daily_assistant",
      description: `Plan my day. ${callTool("send_message_to", { node: LABEL.alpha, target_agent_run_id: delegator.runId, content: "Done. Marker DA-REMOTE-REPORT." })}` });
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "agent", node: LABEL.beta });
    const runId = delegated.target_agent_run_id as string;
    const metadata = await betaMetadata(runId);
    expect(metadata).toMatchObject({ runId, agentDefinitionId: DA_ID, workspaceRootPath: betaTempWorkspace(), llmModelIdentifier: MODEL, runtimeKind: "antigravity_cli" });
    expect(metadata.delegatedFrom).toMatchObject({ nodeId: alpha.nodeId, delegatorAgentRunId: delegator.runId });
    const received = await receives(delegator, "DA-REMOTE-REPORT");
    expect(received).toContain(`You received a message from the agent with sender run id "${runId}" on node "${LABEL.beta}".`);
    record("RC-42", { saved, listing: listing.agents, delegated, metadata, received });
  }, 240_000);

  it("RC-39 autobyteus-32 AC-005: with Model Routing off on beta, an agent and a Team no default covers are refused with beta's state; with the router not usable, with its reason", async () => {
    const delegatorRun = await createStandalone(alpha, defs.delegator, "alpha delegator (32 off)");
    const node = LABEL.beta;
    const runsBefore = await remoteRunDirs();
    const delegateTo = (address: string) => calls(delegatorRun, "delegate_task", { node, recipient_address: address, description: `Routing state for ${address}.` });
    expect(await betaRouting.status(), "off by default").toMatchObject({ enabled: false, active: false, reasonCode: "OFF" });
    const sentBefore = captured.length;
    const offAgent = await delegateTo("/blank_slate");
    const offTeam = await delegateTo("/hollow_team");
    const answers = remoteRequests(sentBefore).filter((entry) => entry.path === PATHS.runs).map((entry) => entry.answer as Rec);
    expect(textOf(offAgent)).toBe(`There is no default runtime configured for the target agent Blank Slate on node "${node}", and Model Routing is off on node "${node}".`);
    expect(textOf(offTeam)).toBe(`There is no default runtime configured for the target agent team Hollow Team on node "${node}", and Model Routing is off on node "${node}".`);
    expect(answers.map((answer) => [answer.code, answer.modelRouting]), "beta's answer carries its state").toEqual([
      ["NO_DEFAULT_RUNTIME", { state: "off" }], ["NO_DEFAULT_RUNTIME", { state: "off" }]]);
    // On, but its router launch is on Claude, which is installed and signed out on beta (its disposable HOME): not usable,
    // with the reason. (A launch on a runtime or model beta does not offer is refused when saved, autobyteus-313 REQ-002.)
    await betaRouting.router("claude_agent_sdk", "haiku");
    const notUsable = await betaRouting.enable(true);
    expect(notUsable, JSON.stringify(notUsable)).toMatchObject({ enabled: true, active: false, reasonCode: "SIGNED_OUT" });
    const reason = String(notUsable.reasonText);
    const notUsableAgent = await delegateTo("/blank_slate");
    expect(textOf(notUsableAgent)).toBe(`There is no default runtime configured for the target agent Blank Slate on node "${node}", and the Model Router on node "${node}" is not usable (${reason.replace(/\.$/, "")}).`);
    expect(await remoteRunDirs(), "nothing started on beta").toEqual(runsBefore);
    await betaRouting.enable(false);
    record("RC-39", { offAgent: textOf(offAgent), offTeam: textOf(offTeam), answers, notUsable, notUsableAgent: textOf(notUsableAgent) });
  }, 300_000);

  it("RC-40 autobyteus-32 AC-005/REQ-009/REQ-012: with Model Routing on, beta's Model Router chooses for the agent and the Team member no default covers; the launches come back to alpha (result notes, the link); beta records the copies from alpha's node", async () => {
    const delegatorRun = await createStandalone(alpha, defs.delegator, "alpha delegator (32 on)");
    const node = LABEL.beta;
    await betaRouting.router("antigravity_cli", MODEL);
    await setRouterPlan({ mode: "valid", runtime: "antigravity_cli", model: "alt-model", taskKind: "writing", reason: "Gemini has limit left on beta.", readRuntimes: true });
    const on = await betaRouting.enable(true);
    expect(on, JSON.stringify(on)).toMatchObject({ enabled: true, active: true });
    const routedBefore = (await routerLog()).length;

    const agent = await calls(delegatorRun, "delegate_task", { node, recipient_address: "/blank_slate", description: "Write the release note. Marker ROUTED-PEER." });
    expect(agent, JSON.stringify(agent)).toMatchObject({ delegated: true, target_kind: "agent", node });
    const notes = (agent.launch_notes ?? []) as string[];
    expect(notes.join("\n"), JSON.stringify(agent)).toContain("Antigravity CLI / alt-model, chosen by the Model Router (writing): Gemini has limit left on beta.");
    const runId = agent.target_agent_run_id as string;
    expect(await betaMetadata(runId)).toMatchObject({ runtimeKind: "antigravity_cli", llmModelIdentifier: "alt-model" });
    await receives(composeOnBeta(runId), "ROUTED-PEER");
    expect((await beta.launches()).some((launch) => launch.cwd.includes(runId) && launch.argv.includes("alt-model")), "started on the router's model").toBe(true);
    // Contract §3.1 / SR-038: alpha keeps no copy of the peer's launches; the result's notes above carry the router's choice.
    const link = (await linksOf("agent", delegatorRun.runId)).find((entry) => entry.agentRunId === runId);
    expect(link, "alpha's Task entry links the routed run").toBeDefined();
    expect(link).not.toHaveProperty("launches");

    const team = await calls(delegatorRun, "delegate_task", { node, recipient_address: "/hollow_team", description: "Draft the team plan. Marker ROUTED-TEAM." });
    expect(team, JSON.stringify(team)).toMatchObject({ delegated: true, target_kind: "team", node });
    expect(((team.launch_notes ?? []) as string[]).join("\n"), JSON.stringify(team)).toContain("chosen by the Model Router (writing)");
    // A peer run's launches are its own facts on its node (contract §3.1: not in alpha's Task entry): read them on beta.
    const teamLink = (await linksOf("agent", delegatorRun.runId)).find((entry) => entry.teamRunId === team.target_team_run_id);
    expect(teamLink, "alpha's Task entry records the peer Team").toBeTruthy();
    const peerTeam = await betaTeamTree(team.target_team_run_id as string);
    expect([peerTeam.rootTeam?.defaultLaunchConfiguration?.runtimeKind, peerTeam.rootTeam?.defaultLaunchConfiguration?.llmModelIdentifier, peerTeam.rootTeam?.defaultLaunchSource?.origin],
      JSON.stringify(peerTeam.rootTeam?.defaultLaunchSource ?? null)).toEqual(["antigravity_cli", "alt-model", "model_router"]);

    // Beta's router was asked once per delegation, and read the runtimes first.
    const asked = (await routerLog()).slice(routedBefore);
    expect(asked.map((entry) => entry.addresses.length), JSON.stringify(asked)).toEqual([1, 1]);
    expect(asked.every((entry) => entry.results[0]?.tool === "list_available_agent_runtimes" && entry.results[0]?.ok), JSON.stringify(asked)).toBe(true);
    // Beta's decision records: from alpha's node, with no delegating run or name on beta (REQ-012).
    let records: Rec[] = [];
    await until(async () => (records = (await betaRouting.records()).filter((record) => record.source === "model_router")).length >= 2, "beta's decision records", 30_000);
    expect(records.map((record) => ({ copyKind: record.copyKind, fromNode: record.fromNode, delegatingRunId: record.delegatingRunId,
      delegatingAgentName: record.delegatingAgentName, runtimeKind: record.runtimeKind, llmModelIdentifier: record.llmModelIdentifier })).sort((a, b) => a.copyKind.localeCompare(b.copyKind)))
      .toEqual([
        { copyKind: "agent", fromNode: LABEL.alpha, delegatingRunId: null, delegatingAgentName: null, runtimeKind: "antigravity_cli", llmModelIdentifier: "alt-model" },
        { copyKind: "agent_team", fromNode: LABEL.alpha, delegatingRunId: null, delegatingAgentName: null, runtimeKind: "antigravity_cli", llmModelIdentifier: "alt-model" }]);
    expect(records.map((record) => record.taskTitle).sort().join(" | ")).toContain("Write the release note.");
    // Alpha records no decision of its own for a copy on beta.
    expect(objectsIn((await alpha.gql(`{modelRoutingDecisions(limit:50)}`)).modelRoutingDecisions).filter((record) => typeof record.agentAddress === "string"), "none on alpha").toEqual([]);
    ids.routedOnBeta = runId;
    record("RC-40", { agent: { notes, runId, link }, team: { notes: team.launch_notes, link: teamLink }, asked, records });
  }, 300_000);

  it("RC-41 autobyteus-32 QR-001/AC-005: a slow router answer within the bound starts the copy (past the former 20 s request bound); a router that does not answer is refused MODEL_ROUTER_FAILED within the 50 s start bound, nothing started", async () => {
    const delegatorRun = await createStandalone(alpha, defs.delegator, "alpha delegator (32 slow)");
    const node = LABEL.beta;
    expect(await betaRouting.status()).toMatchObject({ enabled: true, active: true });
    await setRouterPlan({ mode: "valid", delayMs: 30_000, runtime: "antigravity_cli", model: "alt-model", taskKind: "writing", reason: "Slow but valid." });
    const slow = await calls(delegatorRun, "delegate_task", { node, recipient_address: "/blank_slate", description: "Slow routing. Marker SLOW-PEER." }, 120_000);
    expect(slow, JSON.stringify(slow)).toMatchObject({ delegated: true, target_kind: "agent", node });
    expect(slow.elapsedMs, "past the former 20 s bound, under the 50 s one").toBeGreaterThan(30_000);
    expect(slow.elapsedMs).toBeLessThan(50_000);

    const runsBefore = await remoteRunDirs();
    const logBefore = (await routerLog()).length;
    await setRouterPlan({ mode: "silent", delayMs: 55_000 });
    const sentBefore = captured.length;
    const failed = await calls(delegatorRun, "delegate_task", { node, recipient_address: "/blank_slate", description: "Silent router." }, 120_000);
    const answer = remoteRequests(sentBefore).find((entry) => entry.path === PATHS.runs)?.answer as Rec | undefined;
    expect(failed.delegated, JSON.stringify(failed)).toBe(false);
    expect(textOf(failed)).toBe(`The Model Router on node "${node}" could not choose a runtime for Blank Slate: no valid answer within 40 seconds.`);
    expect(answer?.code, JSON.stringify(answer)).toBe("MODEL_ROUTER_FAILED");
    expect(failed.elapsedMs, "refused within the 50 s start bound").toBeLessThan(50_000);
    expect(failed.elapsedMs).toBeGreaterThan(39_000);
    expect(await remoteRunDirs(), "nothing started on beta").toEqual(runsBefore);
    // The silent turn ends before the next case (no bleed into later routing).
    await until(async () => (await routerLog()).length > logBefore, "the silent router turn ended", 60_000);
    await betaRouting.enable(false);
    await setRouterPlan({ mode: "valid", runtime: "antigravity_cli", model: "alt-model" });
    record("RC-41", { slow: { elapsedMs: slow.elapsedMs, notes: slow.launch_notes }, failed: { text: textOf(failed), elapsedMs: failed.elapsedMs, answer } });
  }, 300_000);

  it("RC-27 261 AC-401/QR-401: list_peer_nodes gives every registered peer in registration order with its status now — beta available; a stopped peer, a peer with the switch off and a peer that does not know alpha unavailable; list_available_agents gives each one's reason (the same as delegate_task); a peer that does not answer is unavailable within the bound", async () => {
    const scout = standaloneActor(alpha, ids.scout, "alpha scout");
    const extra = { gamma: new NodeServer("gamma", root, await getFreePort()), delta: new NodeServer("delta", root, await getFreePort()),
      epsilon: new NodeServer("epsilon", root, await getFreePort()) };
    const names = { gamma: "gamma-node", delta: "delta-node", epsilon: "epsilon-node" } as const;
    const added: string[] = [];
    try {
      await Promise.all(Object.values(extra).map((node) => node.start()));
      for (const node of Object.values(extra)) await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
      // autobyteus-437: alpha pairs with each in turn (the registration order); then gamma stops, delta turns its switch
      // off, and epsilon removes alpha (it no longer knows alpha: unpaired there).
      for (const key of ["gamma", "delta", "epsilon"] as const) {
        await pairNodes({ inviter: (query, variables) => extra[key].gql(query, variables), accepter: (query, variables) => alpha.gql(query, variables),
          inviterName: names[key], accepterName: LABEL.alpha });
        added.push(extra[key].nodeId);
      }
      await extra.epsilon.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: alpha.nodeId });
      await extra.gamma.stop();
      await extra.delta.gql(`mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}`);
      const listed = await calls(scout, "list_peer_nodes", {});
      expect(listed.nodes, JSON.stringify(listed)).toEqual([{ name: LABEL.beta, status: "available" }, { name: names.gamma, status: "unavailable" },
        { name: names.delta, status: "unavailable" }, { name: names.epsilon, status: "unavailable" }]);
      expect(listed.elapsedMs, "answered well within the 20 s bound").toBeLessThan(20_000);
      const reasons: Rec = {};
      // 492 AC-004: list_running_agents with node gives the same reason as list_available_agents (and delegate_task).
      const runningScout = standaloneActor(alpha, ids.runningScout, "alpha running scout");
      for (const name of Object.values(names)) {
        const listing = await calls(scout, "list_available_agents", { node: name });
        const delegation = await calls(scout, "delegate_task", { node: name, recipient_address: "/publisher", description: "Probe." });
        const running = await calls(runningScout, "list_running_agents", { node: name });
        reasons[name] = { listing: textOf(listing), delegation: textOf(delegation), listingIsError: listing.isError, running: textOf(running), runningIsError: running.isError };
        expect(listing.agents, `${name}: no list`).toBeUndefined();
        expect(running.agents, `${name}: no running list`).toBeUndefined();
        expect(running.isError, `${name}: a refusal is a tool error`).toBe(listing.isError);
        expect(delegation.delegated).toBe(false);
        expect(textOf(listing), `${name}: the same reason as a delegation`).toBe(textOf(delegation));
        expect(textOf(running), `${name}: list_running_agents gives the same reason`).toBe(textOf(listing));
      }
      expect((reasons[names.gamma] as Rec).listing).toMatch(new RegExp(`^Node "${names.gamma}" could not be reached \\(`));
      expect((reasons[names.delta] as Rec).listing).toBe(`Remote collaboration is turned off on node "${names.delta}", so it refused the request.`);
      expect((reasons[names.epsilon] as Rec).listing).toContain(names.epsilon);
      // 267 AC-501: the Nodes page's query gives each peer's refusal code (the window words it), one query per peer.
      const pageCodes: Rec = {};
      for (const key of ["gamma", "delta", "epsilon"] as const) pageCodes[names[key]] = await peerNodeOffer(alpha, extra[key].nodeId);
      expect(Object.fromEntries(Object.entries(pageCodes).map(([name, answer]) => [name, (answer as Rec).offer])), JSON.stringify(pageCodes)).toEqual({
        [names.gamma]: { entries: null, refusalCode: "PEER_UNREACHABLE" },
        [names.delta]: { entries: null, refusalCode: "REMOTE_COLLABORATION_OFF" },
        [names.epsilon]: { entries: null, refusalCode: "PEER_NOT_PAIRED" } });
      // A peer that does not answer (beta black-holed): the call still ends within the bound, with beta unavailable.
      let held: Rec & { elapsedMs: number };
      toBeta.mode = "blackhole";
      let heldPage: Rec & { elapsedMs: number };
      let heldRunning: Rec & { elapsedMs: number };
      try {
        held = await calls(scout, "list_peer_nodes", {}, 90_000);
        heldPage = await peerNodeOffer(alpha, beta.nodeId);
        // 492 QR-001: a remote list of a peer that does not answer ends within the 20 s bound, with the unreachable reason.
        heldRunning = await calls(runningScout, "list_running_agents", { node: LABEL.beta }, 90_000);
      } finally { toBeta.mode = "forward"; toBeta.releaseHeld(); }
      expect(textOf(heldRunning), JSON.stringify(heldRunning)).toMatch(new RegExp(`^Node "${LABEL.beta}" could not be reached \\(`));
      expect(heldRunning.elapsedMs, "492 QR-001: within the 20 s peer bound (plus the agent's turn)").toBeLessThan(30_000);
      expect(heldPage.offer, "267: the page's query for a black-holed peer").toEqual({ entries: null, refusalCode: "PEER_UNREACHABLE" });
      expect(heldPage.elapsedMs, "267: within the 20 s bound").toBeLessThan(25_000);
      expect((held.nodes as Rec[])[0], JSON.stringify(held)).toEqual({ name: LABEL.beta, status: "unavailable" });
      expect(held.elapsedMs, "within the 20 s peer bound (plus the agent's turn)").toBeLessThan(30_000);
      const again = await calls(scout, "list_peer_nodes", {});
      expect((again.nodes as Rec[])[0], "beta is available again").toEqual({ name: LABEL.beta, status: "available" });
      record("RC-27", { listed: { nodes: listed.nodes, elapsedMs: listed.elapsedMs }, reasons, heldElapsedMs: held.elapsedMs, held: held.nodes, pageCodes, heldPage,
        heldRunning: { text: textOf(heldRunning), elapsedMs: heldRunning.elapsedMs } });
    } finally {
      for (const nodeId of added) await alpha.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: nodeId }).catch(() => undefined);
      await Promise.all(Object.values(extra).map((node) => node.stop()));
      const dir = process.env["REMOTE_E2E_EVIDENCE_DIR"];
      if (dir) for (const node of Object.values(extra)) await fsp.mkdir(dir, { recursive: true }).then(() => fsp.copyFile(node.logFile, path.join(dir, `remote-two-server-${node.name}-server.log`))).catch(() => undefined);
    }
    const remaining = ((await alpha.gql(`{ peerNodes { name } }`).catch(() => ({ peerNodes: null }))).peerNodes as Rec[] | null);
    if (remaining) expect(remaining.map((peer) => peer.name), "only beta stays registered").toEqual([LABEL.beta]);
  }, 300_000);

  it("RC-28 261 AC-404/AC-407: with alpha's switch off both discovery calls are refused 'turned off' and nothing is sent; an unknown node gets the node-list hint (the same for delegate_task); a blank node gets the recovery text; without node the list is alpha's own", async () => {
    const scout = standaloneActor(alpha, ids.scout, "alpha scout");
    const off = "Remote collaboration is turned off on this node, so nothing was sent to another node.";
    const sentBefore = captured.length;
    await alpha.gql(`mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}`);
    const runningScout = standaloneActor(alpha, ids.runningScout, "alpha running scout");
    let nodesOff: Rec, agentsOff: Rec, runningOff: Rec, sendOff: Rec;
    try {
      nodesOff = await calls(scout, "list_peer_nodes", {});
      agentsOff = await calls(scout, "list_available_agents", { node: LABEL.beta });
      // 492 AC-004/AC-006: the same refusal for the running list and for a message with node.
      runningOff = await calls(runningScout, "list_running_agents", { node: LABEL.beta });
      sendOff = await calls(runningScout, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.bystander, content: "OFF-NEVER-SENT" });
    } finally { await alpha.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`); }
    expect(textOf(nodesOff)).toBe(off);
    expect(textOf(agentsOff)).toBe(off);
    expect(textOf(runningOff)).toBe(off);
    expect(textOf(sendOff)).toBe(off);
    expect(sendOff.accepted, JSON.stringify(sendOff)).toBe(false);
    expect([nodesOff.isError, agentsOff.isError, runningOff.isError], "refusals are tool errors").toEqual([true, true, true]);
    expect(remoteRequests(sentBefore), "nothing left alpha").toEqual([]);
    const unknownList = await calls(scout, "list_available_agents", { node: "nowhere-node" });
    const unknownDelegation = await calls(scout, "delegate_task", { node: "nowhere-node", recipient_address: "/publisher", description: "Probe." });
    expect(textOf(unknownList)).toBe(TEXT_261.unknownNode("nowhere-node"));
    expect(textOf(unknownDelegation)).toBe(TEXT_261.unknownNode("nowhere-node"));
    const unknownRunning = await calls(runningScout, "list_running_agents", { node: "nowhere-node" });
    expect(textOf(unknownRunning), "492: the same node-list hint").toBe(TEXT_261.unknownNode("nowhere-node"));
    const blankRunning = await calls(runningScout, "list_running_agents", { node: "" });
    expect(textOf(blankRunning)).toContain("node must be the name of a peer node registered on this node; leave it out to list what runs on this node.");
    const blank = await calls(scout, "list_available_agents", { node: "" });
    expect(textOf(blank)).toContain(TEXT_261.blankNode);
    const nullNode = await calls(scout, "list_available_agents", { node: null });
    // Without node: alpha's own Agents and Agent Teams, each entry only name, kind, address and a non-empty description.
    const local = await calls(scout, "list_available_agents", {});
    const entries = local.agents as Rec[];
    expect(entries.map((entry) => entry.address)).toEqual(expect.arrayContaining(["/delegator", "/remote_worker", "/remote_squad"]));
    for (const entry of entries) {
      expect(Object.keys(entry).filter((key) => !["name", "kind", "address", "description"].includes(key)), String(entry.address)).toEqual([]);
      expect(entry.description, `${entry.address}: no empty description (DEC-405)`).not.toBe("");
    }
    expect(remoteRequests(sentBefore), "the refusals and the local list sent nothing").toEqual([]);
    record("RC-28", { nodesOff: textOf(nodesOff), agentsOff: textOf(agentsOff), runningOff: textOf(runningOff), sendOff: textOf(sendOff),
      unknownRunning: textOf(unknownRunning), blankRunning: textOf(blankRunning), unknown: textOf(unknownList), blank: textOf(blank),
      nullNode: { isError: nullNode.isError, text: textOf(nullNode) }, local: entries });
  }, 240_000);

  it("RC-29 261 AC-405: a Team that beta's owner adds between two listings appears in the second (nothing is cached)", async () => {
    const scout = standaloneActor(alpha, ids.scout, "alpha scout");
    const first = await calls(scout, "list_available_agents", { node: LABEL.beta });
    expect((first.agents as Rec[]).map((entry) => entry.address)).not.toContain("/late_team");
    await beta.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`, { input: { name: "Late Team",
      description: "Added between two listings", instructions: "Work as a team.", coordinatorMemberName: "lead", nodes: [{ memberName: "lead", ref: defs.publisher, refScope: "SHARED" }] } });
    const second = await calls(scout, "list_available_agents", { node: LABEL.beta });
    expect((second.agents as Rec[]).find((entry) => entry.address === "/late_team")).toEqual({ name: "Late Team", kind: "agent_team", address: "/late_team", description: "Added between two listings" });
    expect((second.agents as Rec[]).length).toBe((first.agents as Rec[]).length + 1);
    record("RC-29", { first: (first.agents as Rec[]).length, second: (second.agents as Rec[]).length });
  }, 180_000);

  it("RC-30 269 AC-601/AC-602: a long description with line breaks titles the peer-started Agent and Team runs as one line of at most 100 characters, by the history's rule", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const paragraph = "Cut the launch trailer for the Night Owl coffee shop and have it checked before Friday.";
    const description = `${paragraph}\n\nKeep it under thirty seconds.\nUse the brand colours and the owl mark.\n${"Notes: ".repeat(20)}Marker LONG-TITLE.`;
    expect(description.length, "a long description").toBeGreaterThan(250);
    const expected = titleOf(description);
    expect(expected).toHaveLength(100);
    const toAgent = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description });
    expect(toAgent, JSON.stringify(toAgent)).toMatchObject({ delegated: true, target_kind: "agent" });
    const toTeam = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", description });
    expect(toTeam, JSON.stringify(toTeam)).toMatchObject({ delegated: true, target_kind: "team" });
    const agentTitle = await titledOnBeta("agent", toAgent.target_agent_run_id as string, expected);
    const teamTitle = await titledOnBeta("team", toTeam.target_team_run_id as string, expected);
    for (const title of [agentTitle, teamTitle]) {
      expect(title, "one line").not.toMatch(/\n/);
      expect(title.startsWith(paragraph), "it starts with the description").toBe(true);
      expect(title.endsWith("..."), "cut at 97 characters").toBe(true);
    }
    record("RC-30", { descriptionLength: description.length, agentTitle, teamTitle });
  }, 180_000);

  it("RC-37 278 AC-804: with beta stopped, the view shows its remote runs unreachable within the bound and the rest works; after beta returns, Retry reads them again", async () => {
    const delegatorId = ids.treeDelegator as string;
    const r9 = ids.treeRun as string;
    await beta.stop();
    let retried: Rec | null = null, whileDown: Rec | null = null, unreachableRow: Rec | null = null;
    let started = 0, unreachableAfterMs = 0, projectionError: unknown = null, ownConversation = false;
    try {
      started = Date.now();
      // The window shows the tree and holds its rows' statuses: the peer run is answered unreachable, naming beta, within the bound.
      const held = await runStatus(alpha, "agent", r9);
      await until(() => held.statesOf(r9).some((state) => state.answer === "unreachable"), "r9 unreachable", 30_000);
      unreachableAfterMs = Date.now() - started;
      expect(held.statesOf(r9).at(-1), JSON.stringify(held.statesOf(r9))).toMatchObject({ answer: "unreachable", node: LABEL.beta, status: null });
      unreachableRow = (await peerRowOf(alpha, "agent", delegatorId, r9, (row) => (row.peer as Rec)?.reachable !== true)).row;
      expect(unreachableRow.peer, JSON.stringify(unreachableRow)).toMatchObject({ nodeName: LABEL.beta });
      expect((unreachableRow.peer as Rec).reachable, "not reachable (false, or no answer yet)").not.toBe(true);
      const projectionStarted = Date.now();
      const read = await alpha.gqlRaw(`query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(runId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
        { h: delegatorId, a: "/publisher", r: r9 });
      projectionError = { errors: read.errors?.map((error) => error.message), data: read.data, elapsedMs: Date.now() - projectionStarted };
      expect(Date.now() - projectionStarted, "the read answers within the bound").toBeLessThan(25_000);
      expect(Boolean(read.errors?.length) || read.data?.agentRunCollaborationMemberProjection === null, JSON.stringify(read)).toBe(true);
      // The rest of the tree works: the delegator's own conversation reads.
      ownConversation = JSON.stringify(await standaloneActor(alpha, delegatorId, "alpha tree delegator").conversation()).includes("TREE-PACKET");
      expect(ownConversation).toBe(true);
      // SR-090: a Retry while beta stays down settles, unreachable; once beta is back, a Retry reads it again.
      whileDown = await held.retry(r9);
      expect(whileDown.state, JSON.stringify(whileDown)).toMatchObject({ answer: "unreachable", node: LABEL.beta });
      await beta.start();
      retried = await held.retry(r9);
      expect(retried.state, JSON.stringify(retried)).toMatchObject({ answer: "ok", node: null });
      retried.row = (await peerRowOf(alpha, "agent", delegatorId, r9)).row.peer;
      expect(retried.row).toMatchObject({ reachable: true, title: "Tree work. Marker TREE-PACKET." });
      held.socket.close();
    } finally {
      if (!beta.child || beta.child.exitCode !== null) await beta.start();
    }
    record("RC-37", { unreachableAfterMs, unreachableRow, projectionError, ownConversation, whileDown, retried });
  }, 240_000);

  it("RC-44 461 AC-008 / SR-067 (DS-13): archive and delete of a delegator are refused while its peer child works, naming it; with the peer node unreachable they go ahead and the result names the run not asked", async () => {
    const guarded = await createStandalone(alpha, defs.delegator, "AC-008 guarded delegator");
    const peer = await delegateRemote(guarded, "AC-008 work. Marker A8-PEER.");
    const p1 = peer.target_agent_run_id as string;
    await receives(composeOnBeta(p1), "A8-PEER");
    // Keep the peer run working (a held turn), then stop the delegator.
    await composeOnBeta(p1).send("HOLD_TURN Marker A8-HOLD");
    await until(async () => (await betaConversation(p1)).includes("A8-HOLD"), "the peer run is working", 20_000);
    expect((await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: guarded.runId })).terminateAgentRun.success).toBe(true);
    const archive = async () => (await alpha.gql(`mutation($id:String!){archiveStoredRun(runId:$id){success message}}`, { id: guarded.runId })).archiveStoredRun as Rec;
    const remove = async () => (await alpha.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: guarded.runId })).deleteStoredRun as Rec;
    const refusedArchive = await archive();
    expect(refusedArchive, JSON.stringify(refusedArchive)).toMatchObject({ success: false });
    // Contract T-5: "its reason names them" (by the address it was delegated to, or its run ID).
    expect(String(refusedArchive.message)).toMatch(new RegExp(`${p1}|/publisher`));
    const refusedDelete = await remove();
    expect(refusedDelete, JSON.stringify(refusedDelete)).toMatchObject({ success: false });
    expect(String(refusedDelete.message)).toMatch(new RegExp(`${p1}|/publisher`));
    // The peer node is unreachable: the guard does not block, and the result names the run that was not asked.
    await beta.stop();
    let deleted: Rec | null = null;
    try {
      deleted = await remove();
      expect(deleted, JSON.stringify(deleted)).toMatchObject({ success: true });
      // SR-067 G-1: "the result names that run" (here by the address it was delegated to).
      expect(String(deleted.message ?? ""), JSON.stringify(deleted)).toMatch(new RegExp(`${p1}|/publisher`));
    } finally {
      if (!beta.child || beta.child.exitCode !== null) await beta.start();
    }
    record("RC-44", { p1, refusedArchive, refusedDelete, deleted });
  }, 240_000);

  it("RC-45 461 CR-461-094 (SR-083): a peer run's status on alpha's /ws/run-status follows again after beta's outage, once beta answers for another run the window shows (no Retry of that run)", async () => {
    const delegator = standaloneActor(alpha, ids.treeDelegator as string, "alpha tree delegator");
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    // Two runs on beta from two delegators: the subscription holds the second; the first delegator's view is the only one opened.
    const shown = (await calls(delegator, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Shown run. Marker OUTAGE-SHOWN." })).target_agent_run_id as string;
    const followed = (await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/publisher", description: "Followed run. Marker OUTAGE-FOLLOWED." })).target_agent_run_id as string;
    await receives(composeOnBeta(followed), "OUTAGE-FOLLOWED");
    await receives(composeOnBeta(shown), "OUTAGE-SHOWN");
    const status = await runStatus(alpha, "agent", followed);
    await until(() => ["idle", "running", "initializing"].includes(String(status.latest(followed))), "the followed run live on alpha", 25_000);
    // The outage: the link ends unasked; the run reads offline on alpha.
    await beta.stop();
    await until(() => status.latest(followed) === "offline", "the followed run offline during the outage", 30_000);
    await beta.start();
    // The window shows another of beta's runs (the first delegator's tree, its row's status held); beta answers for it:
    // the node is back for every run on it (CR-461-094), with no Retry.
    const shownStatus = await runStatus(alpha, "agent", shown);
    const shownRow = (await peerRowOf(alpha, "agent", ids.treeDelegator as string, shown)).row;
    // A turn on beta: its live status reaches alpha's subscription again.
    const since = status.frames.length;
    await composeOnBeta(followed).send("After the outage. Marker OUTAGE-AFTER.");
    await until(() => status.statusesOf(followed, since).some((value) => ["running", "idle", "initializing"].includes(value)), "the followed run live again on alpha after beta's outage", 60_000);
    const after = status.statusesOf(followed, since);
    shownStatus.socket.close();
    status.socket.close();
    record("RC-45", { shown, followed, shownRow: shownRow.peer, after });
  }, 240_000);

  it("RC-46 461 G-D1 (SR-088, SR-089, CR-461-099) and SR-090: with the delegator stopped, a peer Agent and a peer Team's member open by their own identity on alpha's /ws/peer-run: the snapshot, live output once each, a message, an interrupt, the files; Retry on /ws/run-status settles while beta is down and once it is back", async () => {
    const out: Rec = {};
    const settleFor = async (ms: number) => { await wait(ms); };

    // A delegator with a peer Agent and a peer Team on beta; then the user stops it.
    const solo = await createStandalone(alpha, defs.delegator, "G-D1 delegator");
    const a1 = (await delegateRemote(solo, "G-D1 agent work. Marker GD1-AGENT-PACKET.")).target_agent_run_id as string;
    await receives(composeOnBeta(a1), "GD1-AGENT-PACKET");
    const team = await calls(solo, "delegate_task", { node: LABEL.beta, recipient_address: "/studio_team", description: "G-D1 studio work. Marker GD1-TEAM-PACKET." });
    expect(team, JSON.stringify(team)).toMatchObject({ delegated: true, target_kind: "team" });
    const t1 = team.target_team_run_id as string, lead = team.target_team_coordinator_agent_run_id as string;
    await receives(teamActor(beta, t1, lead, "beta G-D1 studio lead"), "GD1-TEAM-PACKET");
    const members = flattenE2eConfiguredAgentExecutions((await beta.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: t1 }))
      .getTeamRunResumeConfig.executionTree);
    const checker = members.find((member) => member.memberAddress === "/checker")!.agentRunId as string;
    expect((await alpha.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: solo.runId })).terminateAgentRun.success).toBe(true);
    await until(async () => !(await alpha.gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: solo.runId })).getAgentRunResumeConfig?.isActive,
      "the delegator stopped", 30_000);

    // The peer Agent: its snapshot is its whole conversation so far, once.
    const agent = await peerRun("agent", a1, a1);
    expect(agent.count("GD1-AGENT-PACKET"), "the packet once in the snapshot").toBe(1);
    // A message from alpha's window: accepted; its answer shows live, once.
    expect(await agent.send(await replyWith("gd1-live-agent", "GD1-LIVE-AGENT-REPLY")), "the message's ack").toMatchObject({ command_type: "SEND_MESSAGE", accepted: true });
    await until(() => agent.count("GD1-LIVE-AGENT-REPLY") > 0, "the peer Agent's answer live on /ws/peer-run", 30_000);
    await settleFor(2_000);
    out.agentLive = agent.count("GD1-LIVE-AGENT-REPLY");
    expect(out.agentLive, "the answer once, live").toBe(1);
    // A later open of the same run: its snapshot has the answer once (stored or turn frames, never both).
    const agentAgain = await peerRun("agent", a1, a1);
    out.agentSnapshotAgain = agentAgain.count("GD1-LIVE-AGENT-REPLY");
    expect(out.agentSnapshotAgain, "the answer once in a later snapshot").toBe(1);
    agentAgain.socket.close();
    // Interrupt: a held turn, then INTERRUPT_GENERATION through /ws/peer-run; the run stops running.
    const a1Status = await runStatus(alpha, "agent", a1);
    expect((await agent.send("HOLD_TURN Marker GD1-HOLD")).accepted).toBe(true);
    await until(() => a1Status.latest(a1) === "running", "the held turn running (by its run ID)", 30_000);
    out.interrupted = await agent.interrupt();
    expect(out.interrupted, JSON.stringify(out.interrupted)).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    await until(() => a1Status.latest(a1) !== "running", "not running after the interrupt", 30_000);
    out.agentTurnEnds = agent.frames.filter((frame) => frame.type === "TURN_INTERRUPTED" || frame.type === "TURN_COMPLETED").map((frame) => frame.type);
    // The files: the run writes one on beta; it is beta's, read there; alpha serves none of a peer's files.
    const image = path.join(betaTempWorkspace(), "gd1-image.png");
    expect((await agent.send(`GENERATE_IMAGE:${image}`)).accepted).toBe(true);
    await until(() => agent.frames.some((frame) => JSON.stringify(frame).includes("gd1-image.png")), "the file's tool call live", 30_000);
    let betaFiles: Rec[] = [];
    await until(async () => (betaFiles = (await beta.gql(`query($id:String!){getRunFileChanges(runId:$id){path status}}`, { id: a1 })).getRunFileChanges ?? [])
      .some((file: Rec) => String(file.path).endsWith("gd1-image.png")), "the file recorded on beta", 30_000);
    const alphaFiles = await alpha.gqlRaw(`query($id:String!){getRunFileChanges(runId:$id){path status}}`, { id: a1 });
    const alphaContent = await fetch(`${alpha.baseUrl}/rest/runs/${encodeURIComponent(a1)}/file-change-content?path=${encodeURIComponent(image)}`);
    out.files = { beta: betaFiles, alpha: { errors: alphaFiles.errors?.map((error) => error.message), data: alphaFiles.data?.getRunFileChanges ?? null }, alphaContentStatus: alphaContent.status };
    expect((alphaFiles.data?.getRunFileChanges ?? []).length, "alpha lists none of the peer run's files").toBe(0);
    expect(alphaContent.status, "alpha serves none of the peer run's file contents").not.toBe(200);
    a1Status.socket.close();

    // The peer Team's member (never started until now): its snapshot, then a message starts it; its answer once, live.
    const member = await peerRun("agent_team", t1, checker);
    out.memberSnapshotsBefore = member.snapshots();
    expect(await member.send(await replyWith("gd1-live-member", "GD1-LIVE-MEMBER-REPLY")), "the member message's ack").toMatchObject({ accepted: true });
    await until(() => member.count("GD1-LIVE-MEMBER-REPLY") > 0, "the member's answer live on /ws/peer-run", 60_000);
    await settleFor(2_000);
    out.memberLive = member.count("GD1-LIVE-MEMBER-REPLY");
    out.memberSnapshotsAfter = member.snapshots();
    expect(out.memberLive, "the member's answer once, live").toBe(1);
    const memberAgain = await peerRun("agent_team", t1, checker);
    out.memberSnapshotAgain = memberAgain.count("GD1-LIVE-MEMBER-REPLY");
    expect(out.memberSnapshotAgain, "the member's answer once in a later snapshot").toBe(1);
    memberAgain.socket.close();
    // An interrupt of the member, through the same stream.
    const memberStatus = await runStatus(alpha, "agent_team", t1);
    expect((await member.send("HOLD_TURN Marker GD1-MEMBER-HOLD")).accepted).toBe(true);
    await until(() => memberStatus.latest(checker) === "running", "the member's held turn running", 30_000);
    out.memberInterrupted = await member.interrupt();
    expect(out.memberInterrupted).toMatchObject({ command_type: "INTERRUPT_GENERATION", state: "accepted" });
    await until(() => memberStatus.latest(checker) !== "running", "the member not running after the interrupt", 30_000);
    memberStatus.socket.close();
    expect(await alpha.gql(`query($id:String!){getAgentRunResumeConfig(runId:$id){isActive}}`, { id: solo.runId }).then((data) => data.getAgentRunResumeConfig?.isActive),
      "the delegator stayed stopped").toBe(false);

    // SR-090 Retry on /ws/run-status: with beta down, a Retry is answered (its state told again, unreachable); back, ok.
    const held = await runStatus(alpha, "agent", a1);
    const statesOf = () => held.frames.filter((frame) => frame.type === "RUN_STATE_CHANGED" && frame.payload.runId === a1).map((frame) => frame.payload);
    const retry = async () => {
      const before = statesOf().length;
      const started = Date.now();
      held.socket.send(JSON.stringify({ type: "RETRY_PEERS", payload: { runIds: [a1] } }));
      await until(() => statesOf().length > before, "the Retry's answer (its state told again)", 40_000);
      return { state: statesOf().at(-1), elapsedMs: Date.now() - started };
    };
    await beta.stop();
    try {
      await until(() => statesOf().some((state) => state.answer === "unreachable"), "unreachable once beta stopped", 40_000);
      out.retryWhileDown = await retry();
      expect(out.retryWhileDown.state, "a Retry while beta stays down settles, unreachable").toMatchObject({ answer: "unreachable", node: LABEL.beta });
      await beta.start();
      out.retryBack = await retry();
      expect(out.retryBack.state, "a Retry once beta is back settles, answered").toMatchObject({ answer: "ok", node: null });
    } finally {
      if (!beta.child || beta.child.exitCode !== null) await beta.start();
    }
    held.socket.close();
    agent.socket.close();
    member.socket.close();
    record("RC-46", { a1, t1, checker, ...out });
  }, 420_000);

  it("RC-52 591 AC-004/REQ-002: a close while beta is down is owed (marked, logged once) and delivered within 30 s of alpha seeing beta again, after alpha restarted (a busy run resumes on beta, then stops); a run whose entry is reopened before beta is back (another Task, or its assigner's message) is told open and not stopped, while a Task's reopen alone still stops it; beta restarted alone, and an older beta (404), keep it owed until it is delivered", async () => {
    // A delegator of its own (the long-lived delegator's view keeps only its latest events, which later cases read).
    const solo = await createStandalone(alpha, defs.delegator, "alpha owed-notice delegator");
    const remoteRun = async (marker: string) => {
      const delegated = await delegateRemote(solo, `Owed work. Marker ${marker}.`);
      expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
      await receives(composeOnBeta(delegated.target_agent_run_id as string), marker);
      return { runId: delegated.target_agent_run_id as string, taskId: delegated.task_id as string };
    };
    const owedLogs = (runId: string) => noticeRecords("TASK_PEER_NOTICE_OWED").filter((block) => block.includes(runId));
    const confirmedOf = (runId: string) => noticeRecords("TASK_PEER_NOTICE_CONFIRMED").filter((block) => block.includes(runId));
    const busy = async (runId: string, marker: string) => {
      const status = await runStatus(beta, "agent", runId);
      expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: runId, content: `HOLD_TURN while beta restarts. Marker ${marker}.` })).toMatchObject({ accepted: true });
      await until(() => status.latest(runId) === "running", `${runId} mid-turn on beta`, 30_000);
      status.socket.close();
    };
    try {
    // Round 1. ra: a quiet run; rb: a busy run (it resumes when beta starts again); rc: gets another open Task (a saved Task
    // given with its run ID) while beta is down, before the close is delivered (REQ-002's second clause).
    const [ra, rb, rc, rf, rg] = [await remoteRun("OWED-A-PACKET"), await remoteRun("OWED-B-PACKET"), await remoteRun("OWED-C-PACKET"),
      await remoteRun("OWED-F-PACKET"), await remoteRun("OWED-G-PACKET")];
    // rg holds a saved Task, so its assigner can continue it by message after a reopen (SR-010).
    const rgSaved = await savedTaskOnAlpha("Owed, then continued. Marker OWED-G-SAVED.");
    expect(await calls(solo, "delegate_task", { target_agent_run_id: rg.runId, task_id: rgSaved.taskId })).toMatchObject({ delegated: true });
    await receives(composeOnBeta(rg.runId), "OWED-G-SAVED");
    await busy(rb.runId, "OWED-B-HOLD");
    await beta.stop();
    for (const taskId of [ra.taskId, rb.taskId, rc.taskId, rf.taskId, rg.taskId, rgSaved.taskId]) expect(await calls(solo, "update_task", { task_id: taskId, status: "DONE" })).toMatchObject({ task: { status: "DONE" } });
    // rf: its Task reopened alone before beta is back: as locally, a Task's reopen changes no entry, so the close is still
    // delivered (REQ-002, SR-010).
    expect(await calls(solo, "update_task", { task_id: rf.taskId, status: "TODO" })).toMatchObject({ task: { status: "TODO" } });
    // rg: reopened and continued by its assigner's message before beta is back: its entry is open again; the message is not
    // delivered (beta unreachable), "open" is owed, and the close is never delivered (REQ-002).
    expect(await calls(solo, "update_task", { task_id: rgSaved.taskId, status: "TODO" })).toMatchObject({ task: { status: "TODO" } });
    const continuedWhileDown = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: rg.runId, content: "CONTINUE-WHILE-DOWN" });
    expect(continuedWhileDown.accepted, JSON.stringify(continuedWhileDown)).toBe(false);
    expect(textOf(continuedWhileDown)).toContain(`${rg.runId} continues with its conversation (its Task is open again) but did not receive this message; send it again.`);
    expect(await owedMarks(rg.runId), "open is owed for rg").toContain(true);
    for (const run of [ra, rb, rc]) await until(async () => (await owedMarks(run.runId)).includes(true) && owedLogs(run.runId).length > 0, `${run.runId} owed on alpha`, 30_000);
    expect(owedLogs(ra.runId)[0], "the reason: beta unreachable").toMatch(/open: false/);
    // The alternate: rc gets another open Task before beta is back: its work is not delivered; the owed notice is now "open".
    const rcSaved = await savedTaskOnAlpha("Owed, then another Task. Marker OWED-C-SAVED.");
    const againWhileDown = await calls(solo, "delegate_task", { target_agent_run_id: rc.runId, task_id: rcSaved.taskId });
    expect(againWhileDown.delegated, JSON.stringify(againWhileDown)).toBe(false);
    expect(textOf(againWhileDown)).toContain("was given to the task agent, but the message with its work was not delivered");
    expect(await owedMarks(rc.runId), "open is owed").toContain(true);
    // One retry later (30 s) the same reason is not logged again.
    await wait(32_000);
    for (const run of [ra, rb, rc]) expect(owedLogs(run.runId).length, `${run.runId}: logged once`).toBe(1);
    // Alpha restarts with the marks on disk (S-3), then beta starts: within 30 s of alpha seeing it, each is delivered.
    await alpha.stop();
    for (const run of [ra, rb, rc]) expect(await owedMarks(run.runId), `${run.runId}'s mark survives alpha's stop`).toContain(true);
    await alpha.start();
    await beta.start();
    const betaBack = Date.now();
    const rbResumed = await processLive(rb.runId);
    for (const run of [ra, rb, rc, rg]) await until(async () => !(await owedMarks(run.runId)).includes(true), `${run.runId} delivered after beta returns`, 45_000);
    const deliveredMs = Date.now() - betaBack;
    expect(deliveredMs, "within 30 s of alpha seeing beta (one retry period, plus beta's start)").toBeLessThanOrEqual(40_000);
    await until(async () => !(await owedMarks(rf.runId)).includes(true), "rf's notice delivered", 45_000);
    const rfOutcome = { recordedClosed: (await closedOnBeta()).some((entry) => entry.runId === rf.runId), listed: await betaListed(rf.runId),
      confirmed: noticeRecords("TASK_PEER_NOTICE_CONFIRMED").filter((block) => block.includes(rf.runId)).at(-1) ?? null };
    expect(rfOutcome, "rf: a Task's reopen alone does not prevent the close").toMatchObject({ recordedClosed: true, listed: false, confirmed: expect.stringContaining("open: false") });
    // rg: never recorded closed; listed; its "open" confirmed; the assigner's next message reaches it.
    expect((await closedOnBeta()).some((entry) => entry.runId === rg.runId), "rg: never recorded closed").toBe(false);
    expect(await betaListed(rg.runId), "rg listed").toBe(true);
    expect(confirmedOf(rg.runId).at(-1)).toContain("open: true");
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: rg.runId, content: "CONTINUE-AFTER-RETURN" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(rg.runId), "CONTINUE-AFTER-RETURN");
    const closedNow = await closedOnBeta();
    expect(closedNow.filter((entry) => [ra.runId, rb.runId].includes(entry.runId)).map((entry) => entry.runId).sort()).toEqual([ra.runId, rb.runId].sort());
    expect(closedNow.some((entry) => entry.runId === rc.runId), "rc: open, never recorded closed").toBe(false);
    expect(confirmedOf(ra.runId).at(-1)).toContain("open: false");
    expect(confirmedOf(rc.runId).at(-1)).toContain("open: true");
    await until(async () => !(await processLive(rb.runId)), "rb, resumed or not, is stopped", 15_000);
    expect(await processLive(ra.runId)).toBe(false);
    expect({ ra: await betaListed(ra.runId), rb: await betaListed(rb.runId), rc: await betaListed(rc.runId) }, "beta's list").toEqual({ ra: false, rb: false, rc: true });
    // Round 2. rd: busy, beta restarted alone (alpha keeps running); re: an older beta, which has no such route (HTTP 404).
    const [rd, re] = [await remoteRun("OWED-D-PACKET"), await remoteRun("OWED-E-PACKET")];
    await busy(rd.runId, "OWED-D-HOLD");
    await beta.stop();
    expect(await calls(solo, "update_task", { task_id: rd.taskId, status: "DONE" })).toMatchObject({ task: { status: "DONE" } });
    await until(async () => (await owedMarks(rd.runId)).includes(true), "rd owed", 30_000);
    await beta.start();
    const betaBackAgain = Date.now();
    const rdResumed = await processLive(rd.runId);
    toBeta.answerWith = (entry) => entry.path === PATHS.runStates && JSON.stringify(entry.body).includes(re.runId) ? 404 : null;
    try {
      expect(await calls(solo, "update_task", { task_id: re.taskId, status: "DONE" })).toMatchObject({ task: { status: "DONE" } });
      await until(async () => !(await owedMarks(rd.runId)).includes(true), "rd delivered after beta's restart", 45_000);
      const rdDeliveredMs = Date.now() - betaBackAgain;
      await until(async () => !(await processLive(rd.runId)), "rd stopped", 15_000);
      expect((await closedOnBeta()).some((entry) => entry.runId === rd.runId)).toBe(true);
      await until(() => owedLogs(re.runId).length > 0, "re owed: the older beta answers 404", 30_000);
      await wait(32_000);
      expect(await owedMarks(re.runId), "re stays owed").toContain(true);
      expect(owedLogs(re.runId).length, "the 404's reason is logged once").toBe(1);
      // Nothing reached the older beta: the run is neither recorded closed nor dropped from its list (it may idle out on its own).
      expect((await closedOnBeta()).some((entry) => entry.runId === re.runId), "not recorded on the older beta").toBe(false);
      expect(await betaListed(re.runId), "still listed on the older beta").toBe(true);
      record("RC-52", { ra: ra.runId, rb: rb.runId, rc: rc.runId, rd: rd.runId, re: re.runId, rf: rf.runId, rfOutcome, rg: rg.runId, continuedWhileDown: textOf(continuedWhileDown), deliveredMs, rdDeliveredMs, rbResumed, rdResumed,
        owedLog: owedLogs(ra.runId)[0], olderBetaLog: owedLogs(re.runId)[0], againWhileDown: textOf(againWhileDown), confirmedRc: confirmedOf(rc.runId).at(-1) });
    } finally {
      toBeta.answerWith = null;
    }
    // Beta updated: the next retry delivers it.
    await until(async () => !(await owedMarks(re.runId)).includes(true), "re delivered once beta has the route", 45_000);
    expect((await closedOnBeta()).some((entry) => entry.runId === re.runId)).toBe(true);
    } finally {
      // Later cases need both nodes up.
      if (!alpha.child || alpha.child.exitCode !== null) await alpha.start();
      if (!beta.child || beta.child.exitCode !== null) await beta.start();
    }
  }, 600_000);

  it("RC-14 AC-106: a follow-up to a remote run whose history was deleted on beta is refused with 'not found'", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const delegated = await delegateRemote(solo, "Short-lived work. Marker DELETED-PACKET.");
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true });
    const doomed = delegated.target_agent_run_id as string;
    await receives(composeOnBeta(doomed), "DELETED-PACKET");
    await beta.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: doomed });
    const deleted = (await beta.gql(`mutation($id:String!){deleteStoredRun(runId:$id){success message}}`, { id: doomed })).deleteStoredRun;
    expect(deleted.success, deleted.message).toBe(true);
    expect(fs.existsSync(path.join(beta.memory, "agents", doomed))).toBe(false);
    const notFound = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: doomed, content: "TO-DELETED-RUN" });
    expect(notFound.accepted, JSON.stringify(notFound)).toBe(false);
    expect(textOf(notFound)).toBe(`That run no longer exists on node "${LABEL.beta}".`);
    record("RC-14", { doomed, deleted, notFound: textOf(notFound) });
  }, 180_000);

  it("RC-15 QR-102: a partitioned or stopped peer is refused within the bound and the tool call never hangs; nothing is left on alpha", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const linksBefore = await linksOf("agent", ids.solo);
    const runsBefore = await remoteRunDirs();
    let partitionedDelegation: Rec & { elapsedMs: number }, partitionedMessage: Rec & { elapsedMs: number };
    toBeta.mode = "blackhole";
    try {
      partitionedDelegation = await delegateRemote(solo, "Partitioned.");
      partitionedMessage = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "PARTITIONED-MESSAGE" });
    } finally { toBeta.mode = "forward"; toBeta.releaseHeld(); }
    expect(textOf(partitionedDelegation)).toBe(`Node "${LABEL.beta}" could not be reached (it did not answer in time).`);
    expect(textOf(partitionedMessage)).toBe(`Node "${LABEL.beta}" could not be reached (it did not answer in time; the message may have been delivered).`);
    // autobyteus-32 QR-001: a start request is bounded at 50 s (the peer's routing fits inside it); a message at 20 s.
    expect(partitionedDelegation.elapsedMs, "a start refused within its 50 s bound").toBeLessThan(55_000);
    expect(partitionedMessage.elapsedMs, "refused within the bound (QR-102 ≤ 30 s)").toBeLessThan(30_000);

    await beta.stop();
    await toBeta.close();
    let stoppedDelegation: Rec & { elapsedMs: number };
    try { stoppedDelegation = await delegateRemote(solo, "Peer stopped."); }
    finally { await toBeta.open(); await beta.start(); }
    expect(textOf(stoppedDelegation)).toMatch(new RegExp(`^Node "${LABEL.beta}" could not be reached \\(`));
    expect(stoppedDelegation.elapsedMs).toBeLessThan(30_000);

    expect(await linksOf("agent", ids.solo), "no link left").toEqual(linksBefore);
    expect(await remoteRunDirs(), "nothing started on beta").toEqual(runsBefore);
    record("RC-15", { partitionedDelegation: { text: textOf(partitionedDelegation), elapsedMs: partitionedDelegation.elapsedMs },
      partitionedMessage: { text: textOf(partitionedMessage), elapsedMs: partitionedMessage.elapsedMs },
      stoppedDelegation: { text: textOf(stoppedDelegation), elapsedMs: stoppedDelegation.elapsedMs } });
  }, 240_000);

  it("RC-16 AC-102: when beta's address reaches a different AutoByteus server, delegation and messages are refused with 'identity mismatch'", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const runsBefore = await remoteRunDirs();
    let mismatch: Rec, mismatchMessage: Rec, pageMismatch: Rec;
    toBeta.targetPort = alpha.port;
    try {
      mismatch = await delegateRemote(solo, "Wrong server.");
      mismatchMessage = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "TO-WRONG-SERVER" });
      pageMismatch = (await peerNodeOffer(alpha, beta.nodeId)).offer;
    } finally { toBeta.targetPort = beta.port; }
    expect(pageMismatch, "267: the page's query").toEqual({ entries: null, refusalCode: "PEER_IDENTITY_MISMATCH" });
    const text = `The server at node "${LABEL.beta}"'s address is not the node that was registered (identity mismatch), so nothing was sent.`;
    expect(textOf(mismatch)).toBe(text);
    expect(textOf(mismatchMessage)).toBe(text);
    expect(await remoteRunDirs()).toEqual(runsBefore);
    record("RC-16", { mismatch: textOf(mismatch), mismatchMessage: textOf(mismatchMessage) });
  }, 180_000);

  it("RC-17 245 RU-1: after the owner changes Publisher's default to a model beta does not offer, new delegations are refused with that reason and a run already started still exchanges both ways", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const updated = (await beta.gql(`mutation($input:UpdateAgentDefinitionInput!){updateAgentDefinition(input:$input){id defaultLaunchConfig{runtimeKind llmModelIdentifier}}}`,
      { input: { id: defs.publisher, defaultLaunchConfig: { runtimeKind: "antigravity_cli", llmModelIdentifier: "retired-model", llmConfig: null } } })).updateAgentDefinition;
    expect(updated.defaultLaunchConfig).toEqual({ runtimeKind: "antigravity_cli", llmModelIdentifier: "retired-model" });
    const runsBefore = await remoteRunDirs();
    const refused = await delegateRemote(solo, "After the default changed.");
    // autobyteus-500 FU-030: a peer's refusal keeps only the peer's reason.
    expect(textOf(refused)).toBe(`The Agent Publisher on node "${LABEL.beta}" cannot run there: its default model cannot be used: 'retired-model' is no longer offered by Antigravity CLI, and Model Routing is off on node "${LABEL.beta}".`);
    expect(await remoteRunDirs()).toEqual(runsBefore);
    expect(await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "AFTER-DEFAULT-CHANGE-FOLLOWUP" })).toMatchObject({ accepted: true });
    await receives(composeOnBeta(ids.r1), "AFTER-DEFAULT-CHANGE-FOLLOWUP");
    expect(await calls(composeOnBeta(ids.r1), "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "AFTER-DEFAULT-CHANGE-REPLY" })).toMatchObject({ accepted: true });
    await receives(solo, "AFTER-DEFAULT-CHANGE-REPLY");
    expect((await betaMetadata(ids.r1)).llmModelIdentifier, "the running run keeps the launch it started with").toBe(MODEL);
    record("RC-17", { refused: textOf(refused) });
  }, 180_000);

  it("RC-18 AC-101/SCN-107: turning the switch off on beta, then on alpha, refuses new requests with 'turned off'", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const remote = composeOnBeta(ids.r1);
    let offOnBeta: Rec, offFromBeta: Rec, offOnAlpha: Rec, inboundWhileAlphaOff: Rec, sentDuringAlphaOff: string[];
    await beta.gql(`mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}`);
    try {
      offOnBeta = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "WHILE-BETA-OFF" });
      offFromBeta = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "FROM-BETA-WHILE-OFF" });
    } finally { await beta.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`); }
    await alpha.gql(`mutation{setRemoteCollaborationEnabled(enabled:false){enabled}}`);
    try {
      const sentBefore = captured.length;
      offOnAlpha = await delegateRemote(solo, "While alpha off.");
      inboundWhileAlphaOff = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "TO-ALPHA-WHILE-OFF" });
      sentDuringAlphaOff = remoteRequests(sentBefore).map((entry) => entry.via);
    } finally { await alpha.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`); }
    expect(textOf(offOnBeta)).toBe(`Remote collaboration is turned off on node "${LABEL.beta}", so it refused the request.`);
    expect(textOf(offFromBeta)).toBe("Remote collaboration is turned off on this node, so nothing was sent to another node.");
    expect(textOf(offOnAlpha)).toBe("Remote collaboration is turned off on this node, so nothing was sent to another node.");
    expect(textOf(inboundWhileAlphaOff)).toBe(`Remote collaboration is turned off on node "${LABEL.alpha}", so it refused the request.`);
    expect(sentDuringAlphaOff, "only beta's refused message was sent while alpha was off").toEqual(["toAlpha"]);
    await neverReceives(solo, "TO-ALPHA-WHILE-OFF", 0);
    await neverReceives(solo, "FROM-BETA-WHILE-OFF", 0);
    await neverReceives(remote, "WHILE-BETA-OFF", 0);
    record("RC-18", { offOnBeta: textOf(offOnBeta), offFromBeta: textOf(offFromBeta), offOnAlpha: textOf(offOnAlpha), inboundWhileAlphaOff: textOf(inboundWhileAlphaOff) });
  }, 240_000);

  it("RC-19 AC-102: after a peer is removed, new requests in either direction are refused and run history stays", async () => {
    const solo = standaloneActor(alpha, ids.solo, "alpha standalone delegator");
    const remote = composeOnBeta(ids.r1);
    for (const node of [alpha, beta]) await node.gql(`mutation{setRemoteCollaborationEnabled(enabled:true){enabled}}`);
    const historyBefore = { alphaLinks: await linksOf("agent", ids.solo),
      betaRuns: await remoteRunDirs() };
    expect((await beta.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: alpha.nodeId })).removePeerNode).toBe(true);
    const toBetaAfterRemoval = await calls(solo, "send_message_to", { node: LABEL.beta, target_agent_run_id: ids.r1, content: "AFTER-REMOVAL-TO-BETA" });
    // autobyteus-437: beta no longer holds the secret, so its gate refuses alpha's signature (unpaired there).
    expect(textOf(toBetaAfterRemoval)).toBe(`This node and node "${LABEL.beta}" are not paired, so nothing was done there. The user can pair them again on the Nodes page.`);
    // autobyteus-587 RF-14: the reply names its node, which beta no longer has: the unknown-node refusal (as delegate_task's).
    const removedBefore = captured.length;
    const fromBetaAfterRemoval = await calls(remote, "send_message_to", { node: LABEL.alpha, target_agent_run_id: ids.solo, content: "AFTER-REMOVAL-TO-ALPHA" });
    expect(textOf(fromBetaAfterRemoval)).toBe(TEXT_261.unknownNode(LABEL.alpha));
    const fromBetaNoNode = await calls(remote, "send_message_to", { target_agent_run_id: ids.solo, content: "AFTER-REMOVAL-NO-NODE" });
    expect(fromBetaNoNode.accepted, JSON.stringify(fromBetaNoNode)).toBe(false);
    expect(sentRequests(removedBefore).filter((entry) => entry.via === "toAlpha"), "nothing reaches alpha").toEqual([]);
    expect((await alpha.gql(`mutation($id:String!){removePeerNode(nodeId:$id)}`, { id: beta.nodeId })).removePeerNode).toBe(true);
    const delegateAfterRemoval = await delegateRemote(solo, "After removal.");
    expect(textOf(delegateAfterRemoval)).toBe(TEXT_261.unknownNode(LABEL.beta));
    // History stays: the links on alpha and the remote runs on beta, still readable through their normal views.
    expect(await linksOf("agent", ids.solo)).toEqual(historyBefore.alphaLinks);
    expect(await remoteRunDirs()).toEqual(historyBefore.betaRuns);
    expect(stringsOf(await remote.conversation()).some((value) => value.includes("STANDALONE-PACKET")), "the remote run's history is readable on beta").toBe(true);
    expect(stringsOf(await solo.conversation()).some((value) => value.includes("REPLY-FROM-BETA-1")), "the delegator's history is readable on alpha").toBe(true);
    record("RC-19", { toBetaAfterRemoval: textOf(toBetaAfterRemoval), fromBetaAfterRemoval: textOf(fromBetaAfterRemoval), fromBetaNoNode, delegateAfterRemoval: textOf(delegateAfterRemoval), historyBefore });
  }, 240_000);

  it("RC-20 AC-111/REQ-113/REQ-114, 437 NAS-20: every captured request between the nodes carries only its peer signature (never the secret, no other credential) and only the contract's fields", () => {
    const allowed = new Set([PATHS.runs, PATHS.messages, PATHS.status, PATHS.availability, PATHS.availableAgents,
      PATHS.runSummaries, PATHS.agentProjection, PATHS.ownerCommands, PATHS.runObservations, PATHS.agentStreamSnapshot,
      PATHS.runMessages, PATHS.runningAgents, PATHS.receivedFilesStatus, PATHS.runStates]);
    // autobyteus-587: a file piece's path carries its SHA-256 and its envelope in the (signed) query.
    const isPiece = (entry: Captured) => entry.method === "PUT" && /^\/rest\/remote\/received-files\/[0-9a-f]{64}\?/.test(entry.path);
    expect(captured.filter((entry) => !allowed.has(entry.path) && !isPiece(entry)).map((entry) => entry.path)).toEqual([]);
    const keysByKind: Record<string, string[]> = {
      [PATHS.runs]: ["address", "delegatingRun", "delegator", "fromNodeId", "task", "toNodeId"],
      // 261: the discovery requests are the envelope only.
      [PATHS.availability]: ["fromNodeId", "toNodeId"],
      [PATHS.availableAgents]: ["fromNodeId", "toNodeId"],
      // 278: the run-tree requests.
      [PATHS.runSummaries]: ["fromNodeId", "runs", "toNodeId"],
      [PATHS.agentProjection]: ["agentRunId", "fromNodeId", "targetRoot", "toNodeId"],
      [PATHS.ownerCommands]: ["agentRunId", "command", "fromNodeId", "targetRoot", "toNodeId"],
      // 461 G-D1 (SR-088): one agent's own snapshot, by its run and agent.
      [PATHS.agentStreamSnapshot]: ["agentRunId", "fromNodeId", "targetRoot", "toNodeId"],
      // 492 QR-002/QR-003: a message by run IDs only (no root named), and the running-runs list (the envelope only).
      [PATHS.runMessages]: ["content", "createdAt", "files", "fromNodeId", "messageId", "messageType", "sender", "target", "toNodeId"],
      [PATHS.runningAgents]: ["fromNodeId", "toNodeId"],
      // 591 DN-2: a delegated run's state, the run and open only.
      [PATHS.runStates]: ["fromNodeId", "open", "run", "toNodeId"],
      // autobyteus-587: work packets and messages name their files (`files`, empty when none).
      work_packet: ["content", "createdAt", "files", "fromNodeId", "kind", "messageType", "sender", "target", "targetRoot", "toNodeId"],
      toBeta: ["content", "createdAt", "files", "fromNodeId", "kind", "messageId", "messageType", "sender", "target", "targetRoot", "toNodeId"],
      toAlpha: ["content", "createdAt", "files", "fromNodeId", "kind", "messageId", "messageType", "sender", "target", "targetRoot", "toNodeId"],
      [PATHS.receivedFilesStatus]: ["files", "fromNodeId", "toNodeId"],
    };
    const counts: Record<string, number> = {};
    // Credential shapes (provider keys, mobile and Memory Hub tokens) start a value or follow a non-identifier character,
    // so a random run or message ID that happens to contain "Sk-" is not one; credential words are matched in any case.
    const keyPattern = /(?<![A-Za-z0-9_])(?:sk-[A-Za-z0-9_-]{8,}|mra_[A-Za-z0-9]|mhub_[A-Za-z0-9])/;
    const wordPattern = /\bbearer\s|api[_-]?key|password|secret|token/i;
    const secretLike = (text: string) => keyPattern.test(text) || wordPattern.test(text);
    for (const entry of captured) {
      const text = JSON.stringify({ headers: entry.headers, body: entry.body });
      expect(text.includes(CANARY.alpha) || text.includes(CANARY.beta), `canary key in request ${entry.seq}`).toBe(false);
      expect(text.includes(String(ids.peerSecret)), `the peer secret in request ${entry.seq}`).toBe(false);
      // `sec-websocket-key` is the WebSocket handshake nonce (278's observation stream), not a credential.
      expect(Object.keys(entry.headers).filter((name) => /auth|cookie|key|token|secret/i.test(name) && name !== "sec-websocket-key"), `credential header in request ${entry.seq}`).toEqual([]);
      if (entry.path === PATHS.status) { expect(entry.method).toBe("GET"); counts.status = (counts.status ?? 0) + 1; continue; }
      // autobyteus-437: every request to a peer route is signed for its receiver (the identity check above is exempt).
      expect(entry.headers["x-autobyteus-peer-signature"], `signature of request ${entry.seq}`).toMatch(/^[0-9a-f]{64}$/);
      expect(entry.headers["x-autobyteus-peer-to"], `receiver of request ${entry.seq}`).toBe(entry.via === "toBeta" ? beta.nodeId : alpha.nodeId);
      // 278: the observation stream's upgrade (its frames are not decoded here; RC-35 reads the route directly).
      if (entry.upgrade) { expect(entry.path).toBe(PATHS.runObservations); expect(entry.method).toBe("GET"); counts.observation = (counts.observation ?? 0) + 1; continue; }
      // 587 RFC-001 § 6: a piece is raw bytes (at most 8 MiB), its envelope and offset in the query, signed like any request.
      if (isPiece(entry)) {
        const url = new URL(entry.path, "http://piece");
        expect([...url.searchParams.keys()].sort(), `query of piece ${entry.seq}`).toEqual(["fromNodeId", "offset", "size", "toNodeId"]);
        expect(url.searchParams.get("toNodeId")).toBe(entry.via === "toBeta" ? beta.nodeId : alpha.nodeId);
        expect(String(entry.headers["content-type"])).toMatch(/^application\/octet-stream/);
        expect((entry.body as Rec).bytes, `size of piece ${entry.seq}`).toBeLessThanOrEqual(8 * 1024 * 1024);
        counts.piece = (counts.piece ?? 0) + 1;
        continue;
      }
      const body = entry.body as Rec;
      expect(secretLike(JSON.stringify(body)), `secret-like text in request ${entry.seq}: ${JSON.stringify(body).slice(0, 300)}`).toBe(false);
      const kind = [PATHS.runs, PATHS.availability, PATHS.availableAgents, PATHS.runSummaries, PATHS.agentProjection, PATHS.ownerCommands,
        PATHS.agentStreamSnapshot, PATHS.runMessages, PATHS.runningAgents, PATHS.receivedFilesStatus, PATHS.runStates].includes(entry.path as never) ? entry.path
        : body.kind === "work_packet" ? "work_packet" : entry.via;
      // 261 REQ-403: an accepted discovery answer carries only the contract's fields.
      const answer = entry.answer as Rec | undefined;
      if (entry.path === PATHS.availability && answer?.accepted === true) expect(sortedKeys(answer), `answer ${entry.seq}`).toEqual(["accepted", "nodeId"]);
      if (entry.path === PATHS.availableAgents && answer?.accepted === true) {
        expect(sortedKeys(answer), `answer ${entry.seq}`).toEqual(["accepted", "agents", "nodeId"]);
        for (const agent of answer.agents as Rec[]) expect(Object.keys(agent).filter((key) => !["name", "kind", "address", "description"].includes(key)), `entry fields in answer ${entry.seq}`).toEqual([]);
      }
      // 492 REQ-002/REQ-007/QR-002: an accepted running-runs answer carries only the entry fields (no node, title or content).
      if (entry.path === PATHS.runningAgents && answer?.accepted === true) {
        expect(sortedKeys(answer), `answer ${entry.seq}`).toEqual(["accepted", "agents", "nodeId"]);
        for (const agent of answer.agents as Rec[]) {
          const fields = agent.kind === "agent_team" ? RUNNING_TEAM_FIELDS : RUNNING_AGENT_FIELDS;
          expect(Object.keys(agent).filter((key) => !fields.includes(key)), `entry fields in answer ${entry.seq}`).toEqual([]);
        }
        counts.runningAgentsEntries = (counts.runningAgentsEntries ?? 0) + (answer.agents as Rec[]).length;
      }
      // 591 DN-2: a delegated run's state: the run reference only, and an accepted answer with the state it holds.
      if (entry.path === PATHS.runStates) {
        expect(sortedKeys(body.run as Rec), `run of request ${entry.seq}`).toEqual(["kind", "runId"]);
        if (answer?.accepted === true) { expect(sortedKeys(answer), `answer ${entry.seq}`).toEqual(["accepted", "nodeId", "open"]); counts.runStatesConfirmed = (counts.runStatesConfirmed ?? 0) + 1; }
      }
      if (entry.path === PATHS.runMessages) expect(sortedKeys(answer ?? {}), `answer ${entry.seq}`).toEqual(
        (answer as Rec)?.accepted === true ? ["accepted", "nodeId", "receiverAddress"] : ["accepted", "code", "message", "nodeId"]);
      // autobyteus-565 REQ-007: every message names its sender's address (`sender`), and an accepted message the
      // receiving agent's (`receiverAddress`); a work packet (not a message) is answered without one.
      if (entry.path === PATHS.runMessages || (entry.path === PATHS.messages && body.kind === "message")) {
        expect(sortedKeys(body.sender as Rec), `sender of request ${entry.seq}`).toEqual(["address", "agentRunId"]);
        expect(String((body.sender as Rec).address), `sender address of request ${entry.seq}`).toMatch(/^\//);
        if ((answer as Rec)?.accepted === true) {
          expect(String((answer as Rec).receiverAddress), `receiverAddress of answer ${entry.seq}`).toMatch(/^\//);
          counts.receiverAddress = (counts.receiverAddress ?? 0) + 1;
        }
      }
      expect(sortedKeys(body), `fields of request ${entry.seq} (${kind})`).toEqual(keysByKind[kind]);
      expect(entry.method).toBe("POST");
      counts[kind] = (counts[kind] ?? 0) + 1;
    }
    expect(counts.status ?? 0, "the identity checks were captured").toBeGreaterThan(0);
    expect(counts[PATHS.runMessages] ?? 0, "492: unlinked messages were captured and audited").toBeGreaterThan(0);
    expect(counts.receiverAddress ?? 0, "565: accepted message answers named the receiver").toBeGreaterThan(0);
    expect(counts.piece ?? 0, "587: file pieces were captured and audited").toBeGreaterThan(0);
    expect(counts[PATHS.receivedFilesStatus] ?? 0, "587: file status requests were captured and audited").toBeGreaterThan(0);
    expect(counts.runningAgentsEntries ?? 0, "492: running-runs answers with entries were captured and audited").toBeGreaterThan(0);
    expect(counts.runStatesConfirmed ?? 0, "591: confirmed delegated-run states were captured and audited").toBeGreaterThan(0);
    expect(evidence.nodes.alpha.canaryKeySaved, "the canary key was saved on alpha").toBe(true);
    expect(evidence.nodes.beta.canaryKeySaved, "the canary key was saved on beta").toBe(true);
    record("RC-20", { total: captured.length, counts, headerNames: [...new Set(captured.flatMap((entry) => Object.keys(entry.headers)))].sort() });
  });
});
