import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import { once } from "node:events";
import { spawn, type ChildProcess } from "node:child_process";
import { DatabaseSync } from "node:sqlite";
import WebSocket from "ws";
import { afterEach, describe, expect, it } from "vitest";
import { APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/append-only-message-logs-v1/append-only-message-logs-v1-app-data-migration.js";
import { TASK_AGENT_OWN_RUN_V1_MIGRATION_ID } from "../../../src/app-data-migrations/migrations/task-agent-own-run-v1/task-agent-own-run-v1-app-data-migration.js";
import {
  validateAgentOrgCommunicationMessages,
  validateStandaloneRootMessages,
  validateTeamCommunicationMessagesPayload,
} from "../../../src/app-data-migrations/legacy/released-run-package-shapes/released-message-logs-before-append-only.js";
import { MESSAGE_LOG_ROTATION_LIMIT_BYTES } from "../../../src/run-history/store/message-log.js";
import { flattenE2eConfiguredAgentExecutions } from "../helpers/team-run-metadata-helpers.js";
import { HUB_MESSAGES, ORG_MESSAGES, T0, TEAM_RUN_MESSAGES, writeReleasedDataRoot } from "../../fixtures/app-data-migrations/released-task-agent-layout-fixtures.js";

// The startup migration `20261018_append_only_message_logs_v1` through the BUILT Studio server (`dist/app.js`, the server the
// desktop app embeds) on a faithful upgrade, with the real migration runner, its SQLite ledger and the production registry order.
// The ledger is made by a first start of this build on an empty folder (every migration records itself); then the rows of the
// migrations an upgrading install has not run are removed, and released-shape test data is written (hand-built, never user data):
// the released layout before `20261017_task_agent_own_run_v1` (`released-task-agent-layout-fixtures.ts`) with a reference file on
// every message, plus an organization log larger than the rotation limit, an empty team run log, a tree-less team folder in the old
// address shape and a team run whose JSON log cannot be read. The released runtime values are pointed at the scripted AGY CLI
// (`tests/fixtures/agy-failure-cli.mjs`, `linked_skills`: `CALL_TOOL:{…}` makes an agent call the real tool; no inference).
// - AOML-1 (AC-004, AC-006, AC-007, AC-008, REQ-009): one start runs own-run and then the conversion; every usable log is append-only,
//   the large one rotated within the limit plus one message, the empty one an empty active file; the old-address and unreadable logs
//   stay JSON, unchanged, with a warning, and the app starts; the hub, team run and organizations serve exactly the released messages
//   in `createdAt` order; every reference file of every message resolves by `messageId` + `referenceId` over REST; a context-file
//   link opens; a second start changes no message-log file.
// - AOML-2 (AC-001..AC-003 at the system boundary, AC-008, AC-009 server part, BEH-001, BEH-007): converted old runs are resumed and
//   messaged through real tool calls (hub → its task agent, team lead → teammate, org director → analyst on the rotated log): each
//   owner log gains exactly one line, sealed files keep their bytes; a team delegated from the hub gets an empty append-only log and
//   then holds the hub's message to it; references of new messages resolve; after a restart every message is still served.
// Prerequisite: `pnpm -C autobyteus-server-ts build` for the current worktree (a stale dist is not proof).
// Run: env -i PATH="$PATH" HOME="$(mktemp -d)" TMPDIR="$TMPDIR" \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts --no-watch
const OURS = APPEND_ONLY_MESSAGE_LOGS_V1_MIGRATION_ID;
const OWN_RUN = TASK_AGENT_OWN_RUN_V1_MIGRATION_ID;
const AGY_CLI = path.resolve("tests/fixtures/agy-failure-cli.mjs");
const MODEL = "gemini-3.8-flash-low";
const BIG_MESSAGE_BYTES = 400 * 1024;
const BIG_MESSAGE_COUNT = 24;

type Json = Record<string, any>;
const children: ChildProcess[] = [];
const roots: string[] = [];
const logs: string[] = [];
afterEach(async () => {
  for (const child of children.splice(0)) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
  for (const root of roots.splice(0)) await fs.rm(root, { recursive: true, force: true });
});
const until = async (check: () => Promise<boolean> | boolean, label: string, timeout = 60_000) => {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) { if (await check()) return; await new Promise((resolve) => setTimeout(resolve, 100)); }
  throw new Error(`Timed out ${label}: ${logs.join("\n").slice(-4000)}`);
};

// ---- the built Studio server ----------------------------------------------------------------------------------------------
const studio = async (root: string) => {
  await fs.access(path.resolve("dist/app.js"));
  const env: NodeJS.ProcessEnv = Object.fromEntries(["PATH", "USER", "LANG", "TMPDIR", "SHELL"].flatMap((key) => process.env[key] === undefined ? [] : [[key, process.env[key]]]));
  Object.assign(env, { HOME: path.join(root, "home"), DATABASE_URL: `file:${path.join(root, "db", "production.db")}`,
    ANTIGRAVITY_CLI_COMMAND: AGY_CLI, AGY_FAKE_CASE: "linked_skills" });
  const child = spawn(process.execPath, [path.resolve("dist/app.js"), "--data-dir", root, "--host", "127.0.0.1", "--port", "0"], { env, stdio: ["ignore", "pipe", "pipe"] });
  children.push(child);
  const index = logs.push("") - 1;
  const capture = (data: Buffer) => { logs[index] += data.toString(); };
  child.stdout!.on("data", capture); child.stderr!.on("data", capture);
  await until(() => {
    if (child.exitCode !== null || child.signalCode !== null) throw new Error(`Studio startup exited: ${logs[index]}`);
    return logs[index]!.includes("Server listening on 127.0.0.1:0");
  }, "Studio readiness", 120_000);
  const origin = [...logs[index]!.matchAll(/Server listening at (http:\/\/127\.0\.0\.1:\d+)/g)].at(-1)![1]!;
  const gql = async (query: string, variables: Record<string, unknown> = {}) => {
    const response = await fetch(`${origin}/graphql`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: any; errors?: Array<{ message: string }> };
    expect(body.errors, JSON.stringify(body.errors)).toBeUndefined();
    return body.data;
  };
  const migration = async (id: string) => (await gql("{getAppDataMigrations{migrationId status attempts summary errorMessage logPath}}"))
    .getAppDataMigrations.find((m: Json) => m.migrationId === id);
  const stop = async () => {
    if (child.exitCode !== null || child.signalCode !== null) return;
    const exited = once(child, "exit");
    child.kill("SIGTERM");
    const force = setTimeout(() => child.kill("SIGKILL"), 8_000);
    try { await exited; } finally { clearTimeout(force); }
  };
  return { gql, migration, stop, origin, output: () => logs[index]!, health: async () => (await fetch(`${origin}/rest/health`)).status };
};
type Studio = Awaited<ReturnType<typeof studio>>;

// ---- released-shape data --------------------------------------------------------------------------------------------------
const json = (value: unknown) => `${JSON.stringify(value, null, 2)}\n`;
const put = async (file: string, value: unknown) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, typeof value === "string" ? value : json(value));
};
/** Released record values pointed at the scripted runtime (shapes unchanged): runtime, model id, a config it accepts. */
const toScriptedRuntime = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(toScriptedRuntime);
  if (!value || typeof value !== "object") return value;
  const out: Json = {};
  for (const [key, inner] of Object.entries(value)) {
    if (key === "runtimeKind" && inner === "codex_app_server") out[key] = "antigravity_cli";
    else if (key === "llmModelIdentifier" && typeof inner === "string") out[key] = MODEL;
    else if (key === "llmConfig" && inner && typeof inner === "object") out[key] = null;
    else out[key] = toScriptedRuntime(inner);
  }
  return out;
};
const filesUnder = async (dir: string): Promise<string[]> => (await fs.readdir(dir, { recursive: true, withFileTypes: true }))
  .filter((entry) => entry.isFile()).map((entry) => path.join(entry.parentPath, entry.name)).sort();
const launch = { runtimeKind: "antigravity_cli", llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, workspaceRootPath: "/work/project" };
const configuredAgent = (address: string, agentRunId: string) => ({
  address, agentDefinitionId: address.slice(1), role: null, description: null, agentRunId, platformAgentRunId: null, launchConfiguration: launch,
});
/** A released team run tree in own-run's input shape, without task agents (the unit fixtures' shape). */
const teamTree = (teamRunId: string) => ({ createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [],
  rootTeam: { address: "/", teamDefinitionId: "writing-team", teamDefinitionName: "Writing Team", teamRunId, coordinatorAddress: "/lead",
    defaultLaunchConfiguration: launch, members: [configuredAgent("/lead", `lead-${teamRunId}`), configuredAgent("/writer", `writer-${teamRunId}`)], taskExecutions: [] } });
/** A released org run tree in own-run's input shape, without task agents. */
const orgTree = (orgRunId: string) => ({ subjectKind: "agent_org", createdAt: T0, archivedAt: null, applicationBinding: null, handoffs: [],
  rootOrg: { address: "/", orgDefinitionId: "company", orgDefinitionName: "Company", orgRunId, defaultLaunchConfiguration: launch,
    members: [configuredAgent("/director", `director-${orgRunId}`), configuredAgent("/analyst", `analyst-${orgRunId}`)], taskExecutions: [] } });
const at = (second: number) => new Date(Date.UTC(2026, 9, 2, 8, 0, second)).toISOString();

type Message = Readonly<{ messageId: string; senderAgentRunId: string; receiverAgentRunId: string; content: string; messageType: string; referenceFiles: string[]; createdAt: string }>;
const referenceText = (messageId: string) => `reference of ${messageId}\n`;

/**
 * An app-data folder of an install on the released layout before own-run: every earlier migration completed, own-run and the
 * conversion never ran. Returns the released messages of each coordinating log (with their reference files).
 */
const faithfulRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "append-only-logs-e2e-")); roots.push(root);
  await fs.mkdir(path.join(root, "home")); await fs.mkdir(path.join(root, "workspace", "refs"), { recursive: true });
  await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
  const fresh = await studio(root);
  const recorded = (await fresh.gql("{getAppDataMigrations{migrationId status}}")).getAppDataMigrations as Json[];
  expect(recorded.at(-1)?.migrationId, "the conversion is registered last").toBe(OURS);
  await fresh.stop();
  const db = new DatabaseSync(path.join(root, "db", "production.db"));
  for (const id of [OWN_RUN, OURS]) db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(id);
  const remaining = db.prepare("SELECT migration_id FROM app_data_migration_records").all() as Json[];
  db.close();
  expect(remaining.length, "every earlier migration stays recorded").toBe(recorded.length - 2);

  const memory = path.join(root, "memory");
  await writeReleasedDataRoot(memory);
  const withReference = (entry: Message): Message => ({ ...entry, referenceFiles: [path.join(root, "workspace", "refs", `${entry.messageId}.md`)] });
  const released = {
    hub: (HUB_MESSAGES as Message[]).map(withReference),
    "team-r": (TEAM_RUN_MESSAGES as Message[]).map(withReference),
    "org-o": (ORG_MESSAGES as Message[]).map(withReference),
    "org-big": Array.from({ length: BIG_MESSAGE_COUNT }, (_, index) => withReference({
      messageId: `big-${String(index).padStart(2, "0")}`, senderAgentRunId: index % 2 ? "analyst-org-big" : "director-org-big",
      receiverAgentRunId: index % 2 ? "director-org-big" : "analyst-org-big", content: `big ${index} ${"x".repeat(BIG_MESSAGE_BYTES)}`,
      messageType: "agent_message", referenceFiles: [], createdAt: at(index) })),
  } satisfies Record<string, Message[]>;
  await put(path.join(memory, "agents", "hub", "collaboration", "communication_messages.json"), { schemaVersion: 1, subjectKind: "agent", hostRunId: "hub", messages: released.hub });
  await put(path.join(memory, "agent_teams", "team-r", "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team-r", messages: released["team-r"] });
  await put(path.join(memory, "agent_orgs", "org-o", "agent_org_communication_messages.json"), { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-o", messages: released["org-o"] });
  // An org run whose log is larger than the rotation limit (the user's largest is ≈22 MB), with its agents' memory folders.
  await put(path.join(memory, "agent_orgs", "org-big", "agent_org_run_execution_tree.json"), orgTree("org-big"));
  await put(path.join(memory, "agent_orgs", "org-big", "agent_org_communication_messages.json"), { schemaVersion: 1, subjectKind: "agent_org", orgRunId: "org-big", messages: released["org-big"] });
  // A team run that never exchanged a message.
  await put(path.join(memory, "agent_teams", "team-empty", "team_run_execution_tree.json"), teamTree("team-empty"));
  await put(path.join(memory, "agent_teams", "team-empty", "team_communication_messages.json"), { schemaVersion: 1, rootTeamRunId: "team-empty", messages: [] });
  for (const entry of Object.values(released).flat()) await put(entry.referenceFiles[0]!, referenceText(entry.messageId));
  for (const file of (await filesUnder(memory)).filter((name) => name.endsWith(".json"))) {
    await fs.writeFile(file, json(toScriptedRuntime(JSON.parse(await fs.readFile(file, "utf8")))));
  }
  // Logs the conversion cannot use: a tree-less team folder in the old address shape (with its predecessor's backup), and a
  // team run whose JSON log cannot be read.
  const oldAddress = json({ teamRunId: "old-address", messages: [{ messageId: "a1", senderAddress: "/lead", receiverAddress: "/writer", content: "hi" }] });
  await put(path.join(memory, "agent_teams", "old-address", "team_communication_messages.json"), oldAddress);
  await put(path.join(memory, "agent_teams", "old-address", "team_communication_messages.json.backup-20260701"), oldAddress);
  await put(path.join(memory, "agent_teams", "team-unreadable", "team_run_execution_tree.json"), json(teamTree("team-unreadable")));
  await put(path.join(memory, "agent_teams", "team-unreadable", "team_communication_messages.json"), "{ not json");
  return { root, memory, released };
};

// ---- reading the result -----------------------------------------------------------------------------------------------------
/** Every message-log file under the memory root: relative path → bytes. */
const messageLogFiles = async (memory: string): Promise<Record<string, string>> => Object.fromEntries(await Promise.all(
  (await filesUnder(memory)).filter((file) => path.basename(file).includes("communication_messages"))
    .map(async (file) => [path.relative(memory, file), await fs.readFile(file, "utf8")] as const)));
const sha = (text: string) => createHash("sha256").update(text).digest("hex");
const byCreatedAt = (messages: readonly Message[]) => [...messages].sort((left, right) => left.createdAt.localeCompare(right.createdAt));
const fields = (entry: Json): Message => ({ messageId: entry.messageId, senderAgentRunId: entry.senderAgentRunId, receiverAgentRunId: entry.receiverAgentRunId,
  content: entry.content, messageType: entry.messageType, referenceFiles: entry.referenceFiles, createdAt: entry.createdAt });
const objectsIn = (value: unknown): Json[] => {
  if (Array.isArray(value)) return value.flatMap(objectsIn);
  if (!value || typeof value !== "object") return [];
  return [value as Json, ...Object.values(value).flatMap(objectsIn)];
};

/** The served history of each family, as the renderer reads it. */
const views = (server: Studio) => ({
  hub: async (id: string): Promise<Message[]> =>
    ((await server.gql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id })).agentRunCollaboration.root_agent.communication_messages.messages as Json[]).map(fields),
  team: async (id: string): Promise<Array<Message & { referenceIds: string[] }>> =>
    ((await server.gql(`query($id:String!){getTeamCommunicationMessages(teamRunId:$id){messageId senderAgentRunId receiverAgentRunId content messageType createdAt referenceFiles{referenceId path}}}`,
      { id })).getTeamCommunicationMessages as Json[]).map((entry) => ({ ...fields({ ...entry, referenceFiles: entry.referenceFiles.map((file: Json) => file.path) }),
      referenceIds: entry.referenceFiles.map((file: Json) => file.referenceId) })),
  org: async (id: string): Promise<Message[]> => {
    const inspection = (await server.gql(`query($id:String!){getAgentOrgRunInspection(orgRunId:$id)}`, { id })).getAgentOrgRunInspection;
    return (inspection.root_org.communication_messages.messages as Json[]).map(fields);
  },
});
/** The renderer's reference id of a hub or organization message (`agentOrgReferenceProjection.ts`). */
const rootReferenceId = (messageId: string, file: string) => createHash("sha256").update(`${messageId}\0${file}`).digest("hex");
const fetchText = async (server: Studio, route: string) => {
  const response = await fetch(`${server.origin}/rest/${route}`);
  return { status: response.status, text: await response.text() };
};

// ---- driving old runs through real tool calls ---------------------------------------------------------------------------
type Frame = { type: string; payload: Json };
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
/** The `CALLED:<tool result>` replies of the scripted agent in a conversation projection, in order. */
const calledResults = (conversation: unknown): Json[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings = objectsIn(entry).flatMap((record) => Object.values(record)).filter((value): value is string => typeof value === "string" && value.includes("CALLED:"));
  if (!strings.length) return [];
  const raw = JSON.parse(strings[0]!.slice(strings[0]!.indexOf("CALLED:") + "CALLED:".length)) as Json;
  if (raw.structuredContent && typeof raw.structuredContent === "object") return [{ ...raw.structuredContent, isError: raw.isError === true }];
  const text = raw.content?.find?.((part: Json) => part.type === "text")?.text;
  try { return [{ ...JSON.parse(text), isError: raw.isError === true }]; } catch { return [{ text, isError: raw.isError === true }]; }
});
const connect = async (server: Studio, route: string, id: string, ready: (frames: Frame[]) => boolean) => {
  const socket = new WebSocket(`${server.origin.replace("http", "ws")}/ws/${route}/${id}`);
  const frames: Frame[] = [];
  socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw)) as Frame));
  await new Promise<void>((resolve, reject) => { socket.once("open", () => resolve()); socket.once("error", reject); });
  await until(() => ready(frames), `${route}/${id} stream ready`);
  return { socket, frames };
};
const clientIds = () => { const messageId = `e2e-${randomUUID()}`; return { message_id: messageId, dedupe_key: `agent_run_input:e2e:${messageId}` }; };
/** Lines of one log (all of its files, sealed by index then active), parsed. */
const logLines = async (dir: string, baseName: string): Promise<Message[]> => {
  const names = (await fs.readdir(dir)).filter((name) => new RegExp(`^${baseName}_(\\d{6}|active)\\.jsonl$`).test(name));
  const ordered = [...names.filter((name) => !name.endsWith("_active.jsonl")).sort(), ...names.filter((name) => name.endsWith("_active.jsonl"))];
  return (await Promise.all(ordered.map(async (name) => (await fs.readFile(path.join(dir, name), "utf8")).split("\n").filter(Boolean)
    .map((line) => JSON.parse(line) as Message)))).flat();
};

describe("append-only message logs: the built server converts a faithful released install at startup", () => {
  it("AOML-1 converts every usable log with nothing lost, keeps the unusable ones with a warning, serves the same history and references, and a second start changes nothing", async () => {
    const { root, memory, released } = await faithfulRoot();
    const before = await messageLogFiles(memory);

    const first = await studio(root);
    expect(await first.health()).toBe(200);
    expect((await first.migration(OWN_RUN)).status, JSON.stringify(await first.migration(OWN_RUN))).toMatch(/^SUCCEEDED/);
    const ours = await first.migration(OURS);
    expect(ours, JSON.stringify(ours)).toMatchObject({ status: "SUCCEEDED_WITH_WARNINGS", attempts: 1 });
    const attempt = await fs.readFile(ours.logPath, "utf8");
    expect(attempt, attempt).toContain("agent_team:old-address");
    expect(attempt).toContain("PRESERVED_UNSUPPORTED");
    expect(attempt).toContain("agent_team:team-unreadable");
    expect(attempt).toContain("PRESERVED_UNREADABLE");
    expect(first.output()).toMatch(/\[20261018_append_only_message_logs_v1\] agent_team run 'old-address': message log kept as JSON \(PRESERVED_UNSUPPORTED\)/);
    expect(first.output()).toMatch(/\[20261018_append_only_message_logs_v1\] agent_team run 'team-unreadable': message log kept as JSON \(PRESERVED_UNREADABLE\)/);

    // AC-006: only the two unusable logs are still JSON, byte for byte; everything else is append-only.
    const after = await messageLogFiles(memory);
    const jsonLeft = Object.keys(after).filter((file) => file.endsWith(".json"));
    expect(jsonLeft.sort()).toEqual(["agent_teams/old-address/team_communication_messages.json", "agent_teams/team-unreadable/team_communication_messages.json"]);
    for (const file of jsonLeft) expect(after[file], file).toBe(before[file]);
    expect(after["agent_teams/old-address/team_communication_messages.json.backup-20260701"]).toBe(before["agent_teams/old-address/team_communication_messages.json.backup-20260701"]);
    // Every line of every append-only file is exactly one message with the seven fields.
    for (const [file, text] of Object.entries(after).filter(([file]) => file.endsWith(".jsonl"))) {
      expect(text === "" || text.endsWith("\n"), `${file} ends with a complete line`).toBe(true);
      for (const line of text.split("\n").filter(Boolean)) {
        expect(Object.keys(JSON.parse(line)).sort(), file).toEqual(["content", "createdAt", "messageId", "messageType", "receiverAgentRunId", "referenceFiles", "senderAgentRunId"]);
      }
    }
    // The large log is rotated: sealed files in index order, each within the limit plus one message, then the active file.
    const bigFiles = Object.keys(after).filter((file) => file.startsWith("agent_orgs/org-big/")).map((file) => path.basename(file)).sort();
    expect(bigFiles).toEqual(["agent_org_communication_messages_000001.jsonl", "agent_org_communication_messages_000002.jsonl", "agent_org_communication_messages_active.jsonl"]);
    const largestLine = Math.max(...Object.entries(after).filter(([file]) => file.startsWith("agent_orgs/org-big/"))
      .flatMap(([, text]) => text.split("\n").filter(Boolean).map((line) => Buffer.byteLength(line) + 1)));
    for (const file of bigFiles) {
      const size = Buffer.byteLength(after[`agent_orgs/org-big/${file}`]!);
      expect(size, file).toBeLessThanOrEqual(MESSAGE_LOG_ROTATION_LIMIT_BYTES + largestLine);
      if (file !== "agent_org_communication_messages_active.jsonl") expect(size, file).toBeGreaterThanOrEqual(MESSAGE_LOG_ROTATION_LIMIT_BYTES);
    }
    // A run that never exchanged a message has an empty append-only log.
    expect(after["agent_teams/team-empty/team_communication_messages_active.jsonl"]).toBe("");

    // AC-004 / REQ-009: the converted runs are admitted and serve exactly the released messages in `createdAt` order.
    const view = views(first);
    expect(await view.hub("hub")).toEqual(byCreatedAt(released.hub));
    const team = await view.team("team-r");
    expect(team.map(({ referenceIds: _ids, ...entry }) => entry)).toEqual(byCreatedAt(released["team-r"]));
    expect(await view.org("org-o")).toEqual(byCreatedAt(released["org-o"]));
    expect(await view.org("org-big")).toEqual(byCreatedAt(released["org-big"]));
    expect(await view.team("team-empty")).toEqual([]);

    // AC-008: every reference of every migrated message resolves by messageId + referenceId, in each family.
    for (const entry of released.hub) {
      expect(await fetchText(first, `agent-collaborations/hub/communication/messages/${entry.messageId}/references/${rootReferenceId(entry.messageId, entry.referenceFiles[0]!)}/content`),
        `hub ${entry.messageId}`).toEqual({ status: 200, text: referenceText(entry.messageId) });
    }
    for (const entry of team) {
      expect(await fetchText(first, `team-runs/team-r/team-communication/messages/${entry.messageId}/references/${entry.referenceIds[0]}/content`),
        `team ${entry.messageId}`).toEqual({ status: 200, text: referenceText(entry.messageId) });
    }
    for (const [orgRunId, entries] of [["org-o", released["org-o"]], ["org-big", released["org-big"]]] as const) {
      for (const entry of entries) {
        expect(await fetchText(first, `agent-org-runs/${orgRunId}/communication/messages/${entry.messageId}/references/${rootReferenceId(entry.messageId, entry.referenceFiles[0]!)}/content`),
          `${orgRunId} ${entry.messageId}`).toEqual({ status: 200, text: referenceText(entry.messageId) });
      }
    }
    // An unknown reference stays "not found", as before.
    expect((await fetchText(first, `agent-org-runs/org-o/communication/messages/m9/references/${"0".repeat(64)}/content`)).status).toBe(404);
    // A context-file link of a migrated task agent (through its hub) still opens.
    expect(await fetchText(first, "agent-collaborations/hub/agent-runs/c1-reviewer/context-files/ctx_notes__notes.txt")).toEqual({ status: 200, text: "context bytes" });
    await first.stop();

    // A second start changes no message-log file.
    const second = await studio(root);
    expect(await second.health()).toBe(200);
    expect((await second.migration(OURS)).attempts).toBe(1);
    expect(await messageLogFiles(memory)).toEqual(after);
    await second.stop();
  }, 300_000);
  it("AOML-2 runs that ran on the release are converted, resumed and messaged: one line per owner log in each family (sealed files untouched), a delegated team gets an empty append-only log, references of old and new messages resolve, and a restart serves every message", async () => {
    // Start 0: this build on an empty folder (every migration records itself) runs a hub with an agent task agent, a team run and an
    // org run with the scripted runtime, so every runtime file is what a run writes. This change touches only the message logs, so
    // apart from them the folder is what the release wrote. Their logs are then rewritten in the released JSON shape (checked with
    // the frozen released validators), the org's grows past twice the rotation limit with older messages, and the conversion's
    // ledger row is removed: an install on the release, upgraded to this build.
    const root = await fs.mkdtemp(path.join(os.tmpdir(), "append-only-logs-e2e-")); roots.push(root);
    const workspace = path.join(root, "workspace");
    await fs.mkdir(path.join(root, "home")); await fs.mkdir(path.join(workspace, "refs"), { recursive: true });
    await fs.writeFile(path.join(root, ".env"), "APP_ENV=test\nAUTOBYTEUS_SERVER_HOST=http://127.0.0.1:8000\n");
    const memory = path.join(root, "memory");
    const reference = async (name: string) => {
      const file = path.join(workspace, "refs", `${name}.md`);
      await put(file, `reference ${name}\n`);
      return file;
    };
    const config = { workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" };

    const start0 = await studio(root);
    const definition = async (name: string) => (await start0.gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name, role: "assistant", description: `${name} (append-only logs E2E)`, instructions: "Follow the request.", toolNames: [] } })).createAgentDefinition.id as string;
    const ids = { host: await definition("AOML Host"), helper: await definition("AOML Helper"), lead: await definition("AOML Lead"), mate: await definition("AOML Mate") };
    const pairId = (await start0.gql(`mutation($input:CreateAgentTeamDefinitionInput!){createAgentTeamDefinition(input:$input){id}}`,
      { input: { name: "AOML Pair", description: "Append-only logs E2E team", instructions: "Follow requests.", coordinatorMemberName: "lead",
        nodes: [{ memberName: "lead", ref: ids.lead, refScope: "SHARED" }, { memberName: "mate", ref: ids.mate, refScope: "SHARED" }] } })).createAgentTeamDefinition.id as string;
    const companyId = (await start0.gql(`mutation($input:CreateAgentOrgDefinitionInput!){createAgentOrgDefinition(input:$input){id}}`,
      { input: { name: "AOML Company", description: "Append-only logs E2E org", instructions: "Follow requests.", handoffs: [], members: [
        { memberName: "director", ref: ids.lead, refType: "AGENT", refScope: "SHARED" },
        { memberName: "analyst", ref: ids.mate, refType: "AGENT", refScope: "SHARED" }] } })).createAgentOrgDefinition.id as string;

    /** A root's driver on one server: send a user message to one of its agents and wait for that agent's next tool result. */
    const driver = async (server: Studio, kind: "agent" | "team" | "org", rootId: string) => {
      const route = kind === "agent" ? "agent" : kind === "team" ? "agent-team" : "agent-org";
      const ready = (frames: Frame[]) => frames.some((frame) => frame.type === (kind === "agent" ? "CONNECTED" : kind === "team" ? "TEAM_EXECUTION_VIEW_SNAPSHOT" : "ROOT_EXECUTION_VIEW_SNAPSHOT"));
      const stream = await connect(server, route, rootId, ready);
      const conversation = async (agentRunId: string, address: string) => {
        if (kind === "agent") return (await server.gql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: agentRunId })).getRunProjection?.conversation;
        if (kind === "team") return (await server.gql(`query($id:String!,$a:String!){getTeamMemberRunProjection(teamRunId:$id,agentRunId:$a){conversation}}`, { id: rootId, a: agentRunId })).getTeamMemberRunProjection?.conversation;
        return (await server.gql(`query($id:String!,$a:String!,$m:String!){getAgentOrgMemberRunProjection(orgRunId:$id,memberAddress:$m,agentRunId:$a){conversation}}`,
          { id: rootId, a: agentRunId, m: address })).getAgentOrgMemberRunProjection?.conversation;
      };
      const call = async (agentRunId: string, address: string, content: string): Promise<Json> => {
        const before = calledResults(await conversation(agentRunId, address)).length;
        stream.socket.send(JSON.stringify({ type: "SEND_MESSAGE", payload: kind === "org"
          ? { root_subject_kind: "agent_org", root_run_id: rootId, target_agent_run_id: agentRunId, command_id: randomUUID(), message_id: randomUUID(), dedupe_key: randomUUID(), content, context_file_paths: [], image_urls: [] }
          : { ...clientIds(), context_file_paths: [], image_urls: [], agent_run_id: agentRunId, content } }));
        let results: Json[] = [];
        await until(async () => (results = calledResults(await conversation(agentRunId, address))).length > before, `${kind} ${address} tool result for ${content.slice(0, 80)}`);
        return results[before]!;
      };
      return { call, close: () => stream.socket.close() };
    };

    const hubId = (await start0.gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, { input: { agentDefinitionId: ids.host, ...config } })).createAgentRun.runId as string;
    const hub0 = await driver(start0, "agent", hubId);
    const helper = await hub0.call(hubId, "/", callTool("delegate_task", { recipient_address: "/aoml_helper", description: "Reply OK." }));
    expect(helper, JSON.stringify(helper)).toMatchObject({ delegated: true, target_kind: "agent" });
    const helperId = helper.target_agent_run_id as string;
    expect(await hub0.call(hubId, "/", callTool("send_message_to", { target_agent_run_id: helperId, content: "Old hub message.", reference_files: [await reference("old-hub")] })))
      .toMatchObject({ accepted: true });
    hub0.close();
    const teamRunId = (await start0.gql(`mutation($input:CreateAgentTeamRunInput!){createAgentTeamRun(input:$input){success message teamRunId}}`,
      { input: { teamDefinitionId: pairId, teamConfigs: [{ teamAddress: "/", ...config }], memberConfigs: [
        { memberAddress: "/lead", agentDefinitionId: ids.lead, ...config }, { memberAddress: "/mate", agentDefinitionId: ids.mate, ...config }] } })).createAgentTeamRun.teamRunId as string;
    const teamMembers = Object.fromEntries(flattenE2eConfiguredAgentExecutions((await start0.gql(`query($id:String!){getTeamRunResumeConfig(teamRunId:$id){executionTree}}`, { id: teamRunId }))
      .getTeamRunResumeConfig.executionTree).map((member) => [member.memberAddress, member.agentRunId]));
    const team0 = await driver(start0, "team", teamRunId);
    expect(await team0.call(teamMembers["/lead"]!, "/lead", callTool("send_message_to", { recipient_address: "/mate", content: "Old team message.", reference_files: [await reference("old-team")] })))
      .toMatchObject({ accepted: true });
    team0.close();
    const orgRunId = (await start0.gql(`mutation($input:CreateAgentOrgRunInput!){createAgentOrgRun(input:$input){success message agentOrgRunId}}`,
      { input: { agentOrgDefinitionId: companyId, rootConfiguration: config, agentOverrides: [], teamOverrides: [] } })).createAgentOrgRun.agentOrgRunId as string;
    const orgMembers = Object.fromEntries(((await start0.gql(`query($id:String!){getAgentOrgRunConfig(orgRunId:$id){executionTree}}`, { id: orgRunId }))
      .getAgentOrgRunConfig.executionTree.rootOrg.members as Json[]).map((member) => [member.address, member.agentRunId as string]));
    const org0 = await driver(start0, "org", orgRunId);
    expect(await org0.call(orgMembers["/director"]!, "/director", callTool("send_message_to", { recipient_address: "/analyst", content: "Old org message.", reference_files: [await reference("old-org")] })))
      .toMatchObject({ accepted: true });
    org0.close();
    await start0.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: hubId });
    await start0.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: teamRunId });
    await start0.gql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}`, { id: orgRunId });
    await start0.stop();

    const dirs = { hub: path.join(memory, "agents", hubId, "collaboration"), helper: path.join(memory, "agents", helperId),
      team: path.join(memory, "agent_teams", teamRunId), org: path.join(memory, "agent_orgs", orgRunId) };
    const [director, analyst] = [orgMembers["/director"]!, orgMembers["/analyst"]!];
    const older = Array.from({ length: BIG_MESSAGE_COUNT }, (_, index): Message => ({ messageId: `older-${String(index).padStart(2, "0")}`,
      senderAgentRunId: index % 2 ? analyst : director, receiverAgentRunId: index % 2 ? director : analyst,
      content: `older ${index} ${"y".repeat(BIG_MESSAGE_BYTES)}`, messageType: "agent_message", referenceFiles: [], createdAt: at(index) }));
    const released = {
      hub: await logLines(dirs.hub, "communication_messages"), helper: await logLines(dirs.helper, "communication_messages"),
      team: await logLines(dirs.team, "team_communication_messages"), org: [...older, ...await logLines(dirs.org, "agent_org_communication_messages")],
    };
    expect(released.hub.map((entry) => entry.content)).toContain("Old hub message.");
    expect(released.helper.map((entry) => entry.content)).toContain("Old hub message.");
    expect(released.team.map((entry) => entry.content)).toContain("Old team message.");
    expect(released.org.map((entry) => entry.content)).toContain("Old org message.");
    const releasedLogs: Array<[string, string, unknown, (value: unknown) => unknown]> = [
      [dirs.hub, "communication_messages", { schemaVersion: 1, subjectKind: "agent", hostRunId: hubId, messages: released.hub }, (value) => validateStandaloneRootMessages(value, hubId)],
      [dirs.helper, "communication_messages", { schemaVersion: 1, subjectKind: "agent", hostRunId: helperId, messages: released.helper }, (value) => validateStandaloneRootMessages(value, helperId)],
      [dirs.team, "team_communication_messages", { schemaVersion: 1, rootTeamRunId: teamRunId, messages: released.team }, (value) => validateTeamCommunicationMessagesPayload(value, teamRunId)],
      [dirs.org, "agent_org_communication_messages", { schemaVersion: 1, subjectKind: "agent_org", orgRunId, messages: released.org }, (value) => validateAgentOrgCommunicationMessages(value, orgRunId)],
    ];
    for (const [dir, baseName, envelope, validate] of releasedLogs) {
      validate(envelope);
      for (const name of (await fs.readdir(dir)).filter((file) => file.startsWith(`${baseName}_`) && file.endsWith(".jsonl"))) await fs.rm(path.join(dir, name));
      await put(path.join(dir, `${baseName}.json`), envelope);
    }
    expect(Object.keys(await messageLogFiles(memory)).filter((file) => file.endsWith(".jsonl")), "only released JSON logs remain").toEqual([]);
    const db = new DatabaseSync(path.join(root, "db", "production.db"));
    db.prepare("DELETE FROM app_data_migration_records WHERE migration_id = ?").run(OURS);
    db.close();

    // Start 1: the conversion runs (every earlier migration has succeeded); the runs open with exactly their released history.
    const first = await studio(root);
    expect(await first.migration(OURS), "every log converted").toMatchObject({ status: "SUCCEEDED", attempts: 1 });
    const converted = await messageLogFiles(memory);
    expect(Object.keys(converted).filter((file) => file.endsWith(".json"))).toEqual([]);
    const orgFiles = Object.keys(converted).filter((file) => file.startsWith(`agent_orgs/${orgRunId}/`)).map((file) => path.basename(file)).sort();
    expect(orgFiles).toEqual(["agent_org_communication_messages_000001.jsonl", "agent_org_communication_messages_000002.jsonl", "agent_org_communication_messages_active.jsonl"]);
    const view = views(first);
    expect(await view.hub(hubId)).toEqual(byCreatedAt(released.hub));
    expect((await view.team(teamRunId)).map(({ referenceIds: _ids, ...entry }) => entry)).toEqual(byCreatedAt(released.team));
    expect(await view.org(orgRunId)).toEqual(byCreatedAt(released.org));
    const oldHub = released.hub.find((entry) => entry.content === "Old hub message.")!;
    expect(await fetchText(first, `agent-collaborations/${hubId}/communication/messages/${oldHub.messageId}/references/${rootReferenceId(oldHub.messageId, oldHub.referenceFiles[0]!)}/content`))
      .toEqual({ status: 200, text: "reference old-hub\n" });
    const oldTeam = (await view.team(teamRunId)).find((entry) => entry.content === "Old team message.")!;
    expect(await fetchText(first, `team-runs/${teamRunId}/team-communication/messages/${oldTeam.messageId}/references/${oldTeam.referenceIds[0]}/content`))
      .toEqual({ status: 200, text: "reference old-team\n" });
    const oldOrg = released.org.find((entry) => entry.content === "Old org message.")!;
    expect(await fetchText(first, `agent-org-runs/${orgRunId}/communication/messages/${oldOrg.messageId}/references/${rootReferenceId(oldOrg.messageId, oldOrg.referenceFiles[0]!)}/content`))
      .toEqual({ status: 200, text: "reference old-org\n" });

    // Hub (standalone family), resumed: its message to the migrated task agent is one new line in the helper's log and the hub's log.
    const restoredHub = (await first.gql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message}}`, { id: hubId })).restoreAgentRun;
    expect(restoredHub, JSON.stringify(restoredHub)).toMatchObject({ success: true });
    const hub1 = await driver(first, "agent", hubId);
    const hubReference = await reference("new-hub");
    expect(await hub1.call(hubId, "/", callTool("send_message_to", { target_agent_run_id: helperId, content: "New hub message.", reference_files: [hubReference] })))
      .toMatchObject({ accepted: true });
    const hubAfter = await logLines(dirs.hub, "communication_messages");
    const helperAfter = await logLines(dirs.helper, "communication_messages");
    expect(hubAfter.slice(0, -1)).toEqual(released.hub);
    expect(helperAfter.slice(0, -1)).toEqual(released.helper);
    const hubNew = hubAfter.at(-1)!;
    expect(helperAfter.at(-1)).toEqual(hubNew);
    expect(hubNew).toMatchObject({ senderAgentRunId: hubId, receiverAgentRunId: helperId, content: "New hub message.", referenceFiles: [hubReference] });
    expect(await fetchText(first, `agent-collaborations/${hubId}/communication/messages/${hubNew.messageId}/references/${rootReferenceId(hubNew.messageId, hubReference)}/content`))
      .toEqual({ status: 200, text: "reference new-hub\n" });

    // BEH-007: a team delegated from the resumed hub gets an empty append-only log; the hub's message to its coordinator is then in both logs.
    const delegated = await hub1.call(hubId, "/", callTool("delegate_task", { recipient_address: "/aoml_pair", description: "Reply OK." }));
    expect(delegated, JSON.stringify(delegated)).toMatchObject({ delegated: true, target_kind: "team" });
    const squadDir = path.join(memory, "agent_teams", delegated.target_team_run_id as string);
    expect((await fs.readdir(squadDir)).filter((name) => name.includes("communication_messages"))).toEqual(["team_communication_messages_active.jsonl"]);
    const squadBefore = await logLines(squadDir, "team_communication_messages");
    const coordinator = delegated.target_team_coordinator_agent_run_id as string;
    expect(await hub1.call(hubId, "/", callTool("send_message_to", { target_agent_run_id: coordinator, content: "Pair, one more thing." }))).toMatchObject({ accepted: true });
    const squadAfter = await logLines(squadDir, "team_communication_messages");
    expect(squadAfter.slice(0, -1)).toEqual(squadBefore);
    const squadNew = squadAfter.at(-1)!;
    expect(squadNew).toMatchObject({ senderAgentRunId: hubId, receiverAgentRunId: coordinator, content: "Pair, one more thing." });
    expect((await logLines(dirs.hub, "communication_messages")).at(-1)).toEqual(squadNew);
    hub1.close();

    // Team run family, resumed: the lead's message to its teammate is one new line in the team's log.
    const restoredTeam = (await first.gql(`mutation($id:String!){restoreAgentTeamRun(teamRunId:$id){success message}}`, { id: teamRunId })).restoreAgentTeamRun;
    expect(restoredTeam, JSON.stringify(restoredTeam)).toMatchObject({ success: true });
    const team1 = await driver(first, "team", teamRunId);
    const teamReference = await reference("new-team");
    expect(await team1.call(teamMembers["/lead"]!, "/lead", callTool("send_message_to", { recipient_address: "/mate", content: "New team message.", reference_files: [teamReference] })))
      .toMatchObject({ accepted: true });
    const teamAfter = await logLines(dirs.team, "team_communication_messages");
    expect(teamAfter.slice(0, -1)).toEqual(released.team);
    const teamNew = teamAfter.at(-1)!;
    expect(teamNew).toMatchObject({ senderAgentRunId: teamMembers["/lead"], receiverAgentRunId: teamMembers["/mate"], content: "New team message.", referenceFiles: [teamReference] });
    const teamNewView = (await view.team(teamRunId)).find((entry) => entry.messageId === teamNew.messageId)!;
    expect(await fetchText(first, `team-runs/${teamRunId}/team-communication/messages/${teamNew.messageId}/references/${teamNewView.referenceIds[0]}/content`))
      .toEqual({ status: 200, text: "reference new-team\n" });
    team1.close();

    // Org family, resumed, on the rotated converted log: one new line at the end of the active file; the sealed files keep their bytes.
    const restoredOrg = (await first.gql(`mutation($id:String!){restoreAgentOrgRun(agentOrgRunId:$id){success message}}`, { id: orgRunId })).restoreAgentOrgRun;
    expect(restoredOrg, JSON.stringify(restoredOrg)).toMatchObject({ success: true });
    const org1 = await driver(first, "org", orgRunId);
    const activeFile = path.join(dirs.org, "agent_org_communication_messages_active.jsonl");
    const activeBefore = await fs.readFile(activeFile, "utf8");
    const orgReference = await reference("new-org");
    expect(await org1.call(director, "/director", callTool("send_message_to", { recipient_address: "/analyst", content: "New org message.", reference_files: [orgReference] })))
      .toMatchObject({ accepted: true });
    const activeAfter = await fs.readFile(activeFile, "utf8");
    expect(activeAfter.startsWith(activeBefore)).toBe(true);
    const appended = activeAfter.slice(activeBefore.length);
    expect(appended.split("\n").filter(Boolean)).toHaveLength(1);
    const orgNew = JSON.parse(appended) as Message;
    expect(orgNew).toMatchObject({ senderAgentRunId: director, receiverAgentRunId: analyst, content: "New org message.", referenceFiles: [orgReference] });
    for (const file of orgFiles.filter((name) => !name.endsWith("_active.jsonl"))) {
      expect(sha(await fs.readFile(path.join(dirs.org, file), "utf8")), `${file} unchanged`).toBe(sha(converted[`agent_orgs/${orgRunId}/${file}`]!));
    }
    expect(await fetchText(first, `agent-org-runs/${orgRunId}/communication/messages/${orgNew.messageId}/references/${rootReferenceId(orgNew.messageId, orgReference)}/content`))
      .toEqual({ status: 200, text: "reference new-org\n" });
    org1.close();

    const served = { hub: await view.hub(hubId), team: (await view.team(teamRunId)).map(({ referenceIds: _ids, ...entry }) => entry), org: await view.org(orgRunId) };
    expect(served.hub).toEqual(byCreatedAt([...released.hub, hubNew, squadNew]));
    expect(served.team).toEqual(byCreatedAt([...released.team, teamNew]));
    expect(served.org).toEqual(byCreatedAt([...released.org, orgNew]));
    await first.gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success}}`, { id: hubId });
    await first.gql(`mutation($id:String!){terminateAgentTeamRun(teamRunId:$id){success}}`, { id: teamRunId });
    await first.gql(`mutation($id:String!){terminateAgentOrgRun(agentOrgRunId:$id){success}}`, { id: orgRunId });
    const beforeRestart = await messageLogFiles(memory);
    await first.stop();

    // Start 2: no migration runs again; every message, old and new, is served; the start writes no message-log file.
    const second = await studio(root);
    expect((await second.migration(OURS)).attempts).toBe(1);
    const again = views(second);
    expect(await again.hub(hubId)).toEqual(served.hub);
    expect((await again.team(teamRunId)).map(({ referenceIds: _ids, ...entry }) => entry)).toEqual(served.team);
    expect(await again.org(orgRunId)).toEqual(served.org);
    expect(await messageLogFiles(memory)).toEqual(beforeRestart);
    await second.stop();
  }, 300_000);
});
