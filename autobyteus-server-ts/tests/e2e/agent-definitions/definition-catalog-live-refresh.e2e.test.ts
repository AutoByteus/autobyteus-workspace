import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
import { create } from "tar";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { DefinitionCatalogChangeMessageSchema } from "../../../src/definition-catalog/changes/definition-catalog-change-messages.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { sendE2eSendMessageCommand } from "../helpers/websocket-command-helpers.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

// agent-package-auto-refresh at the real server/wire boundary: the Studio HTTP/GraphQL server, the
// `/ws/definition-catalog` feed with remote-access auth, the package monitor on real temp package folders
// imported through the real package API, the definition catalog, admission and the GraphQL catalog surfaces.
// Files are written on disk the way the Agent Package Creator's file tools write them. Only GitHub HTTP is
// controlled (DCF-E2E-005).
// DCF-E2E-001…006 run ungated. DCF-E2E-007/008 drive the real agent tools (`list_available_agents`,
// `delegate_task`) and run launches through scoped MCP with the scripted AGY actor (no model calls):
// `CALL_TOOL:{...}` calls that tool and replies `CALLED:<result>`; `READ_AGENT_PROMPT` replies with the
// agent prompt the server materialized for that run. They are gated like the sibling scripted-AGY suites:
//   env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS \
//   RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs \
//   pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent-definitions/definition-catalog-live-refresh.e2e.test.ts --no-watch
// DEFINITION_CATALOG_E2E_EVIDENCE_DIR keeps a JSON receipt.
const cli = process.env.ANTIGRAVITY_CLI_COMMAND ?? "";
const agyEnabled = process.env.RUN_AGY_FAILURE_E2E === "1"
  && spawnSync(cli, ["--version"], { stdio: "ignore" }).status === 0;
const itAgy = agyEnabled ? it : it.skip;

type Frame = { type: string; subjects?: string[] };
type Feed = { socket: WebSocket; frames: Frame[]; closed: Promise<{ code: number; reason: string }> };
type PackageRow = { packageId: string; path: string; sourceKind: string; autoRefresh: { state: string; message: string | null } | null;
  updateInfo: { status: string; installedRevision: string | null; latestRevision: string | null } };

const AC_BOUND_MS = 5000;
const PACKAGE_FIELDS = "packageId path sourceKind autoRefresh { state message } updateInfo { status installedRevision latestRevision }";
const ISSUE = "catalogIssue { code reason definitionPath packageRoot }";
const GITHUB_URL = "https://github.com/apar-e2e/agents";
const segment = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "");
const callTool = (name: string, args: object) => `CALL_TOOL:${JSON.stringify({ name, arguments: args })}`;
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};
const writeAgent = async (dir: string, name: string, instructions = `${name} instructions.`) => {
  await write(path.join(dir, "agent.md"), `---\nname: ${name}\ndescription: ${name} agent\n---\n\n${instructions}\n`);
  await write(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
};
type Member = { memberName: string; ref: string; refScope: "shared" | "team_local" };
const writeTeam = async (dir: string, name: string, members: Member[], handoffs: Array<{ from: string; to: string; rules: string[] }> = []) => {
  await write(path.join(dir, "team.md"), `---\nname: ${name}\ndescription: ${name} team\n---\n\nCoordinate ${name}.\n`);
  await write(path.join(dir, "team-config.json"), JSON.stringify({
    coordinatorMemberName: members[0]!.memberName, members, handoffs, avatarUrl: null, defaultLaunchConfig: null,
  }));
};

/** Every string of a conversation projection that carries `marker`, from the marker on, in order. */
const markerTexts = (conversation: unknown, marker: string): string[] => (Array.isArray(conversation) ? conversation : []).flatMap((entry) => {
  const strings: string[] = [];
  const visit = (value: unknown) => {
    if (typeof value === "string") { if (value.includes(marker)) strings.push(value); return; }
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (value && typeof value === "object") Object.values(value).forEach(visit);
  };
  visit(entry);
  return strings.length ? [strings[0]!.slice(strings[0]!.indexOf(marker) + marker.length)] : [];
});
/** The text of an MCP tool result reported by the scripted actor (`CALLED:<json>`). */
const toolText = (called: string): { isError: boolean; text: string } => {
  const raw = JSON.parse(called) as Record<string, any>;
  const text = raw.content?.find?.((part: any) => part.type === "text")?.text ?? JSON.stringify(raw.structuredContent ?? raw);
  return { isError: raw.isError === true, text };
};
/** Task execution nodes (Agent or Team copies) of a root tree, with their started members. */
const taskNodes = (tree: unknown) => {
  const found: Array<{ agentRunId?: string; teamRunId?: string; address: string; members: Array<{ address: string; agentRunId?: string }>; raw: any }> = [];
  const visit = (value: unknown) => {
    if (Array.isArray(value)) { value.forEach(visit); return; }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, any>;
    const startedAt = record.startedAt ?? record.started_at;
    const agentRunId = record.agentRunId ?? record.agent_run_id;
    const teamRunId = record.teamRunId ?? record.team_run_id;
    if (typeof startedAt === "string" && (agentRunId || teamRunId)) {
      found.push({ ...(teamRunId ? { teamRunId } : { agentRunId }), address: record.address, raw: record,
        members: (record.members ?? []).map((member: any) => ({ address: member.address, agentRunId: member.agentRunId ?? member.agent_run_id })) });
    }
    Object.values(record).forEach(visit);
  };
  visit(tree);
  return found;
};

describe("Definition catalog live refresh at the real server/wire boundary", () => {
  let base = "", dataDir = "", workspace = "", argvLog = "", app: FastifyInstance | undefined, url!: URL;
  const sockets: WebSocket[] = [];
  const activeRuns: string[] = [];
  const savedEnv = new Map<string, string | undefined>();
  const evidence: Record<string, unknown> = {};
  /** Every raw frame any connection of this suite received, for the strict contract check. */
  const allRaw: string[] = [];
  let monitor!: Feed;
  // Controlled GitHub repository (DCF-E2E-005).
  let githubRevision = "a".repeat(40);
  let githubRequests: string[] = [];
  let upstream = "";

  const graphql = async <T = any>(query: string, variables?: Record<string, unknown>): Promise<T> => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    const body = await response.json() as { data?: T; errors?: unknown[] };
    if (!response.ok || !body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const rest = async (method: string, route: string, payload?: unknown) => {
    const response = await fetch(new URL(route, url), { method,
      headers: payload === undefined ? {} : { "content-type": "application/json" }, body: payload === undefined ? undefined : JSON.stringify(payload) });
    return { status: response.status, body: await response.json().catch(() => null) as any };
  };
  const openFeed = async (query = "", route = "definition-catalog"): Promise<Feed> => {
    const socket = new WebSocket(`ws://${url.host}/ws/${route}${query}`);
    sockets.push(socket);
    const frames: Frame[] = [];
    const closed = new Promise<{ code: number; reason: string }>((resolve) =>
      socket.once("close", (code: number, reason: Buffer) => resolve({ code, reason: String(reason) })));
    socket.on("message", (raw: unknown) => {
      const text = String(raw);
      if (route === "definition-catalog") allRaw.push(text);
      frames.push(JSON.parse(text));
    });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    return { socket, frames, closed };
  };
  const changed = (feed: Feed, from = 0) => feed.frames.slice(from).filter((frame) => frame.type === "definitions_changed");
  const waitFor = async <T>(read: () => Promise<T>, accept: (value: T) => boolean, label: string, timeoutMs = AC_BOUND_MS) => {
    const started = Date.now();
    let last: T | undefined;
    for (;;) {
      last = await read();
      if (accept(last)) return { value: last, elapsedMs: Date.now() - started };
      if (Date.now() - started > timeoutMs) throw new Error(`${label}: not met within ${timeoutMs} ms; last value: ${JSON.stringify(last)?.slice(0, 2000)}`);
      await sleep(50);
    }
  };
  const agents = async () => (await graphql(`{ agentDefinitions { id name instructions ${ISSUE} } }`)).agentDefinitions as Array<Record<string, any>>;
  const agent = async (id: string) => (await graphql(`query($id:String!){ agentDefinition(id:$id){ id name instructions ${ISSUE} } }`, { id })).agentDefinition as Record<string, any> | null;
  const teams = async () => (await graphql(`{ agentTeamDefinitions { id name coordinatorMemberName nodes { memberName ref refScope } ${ISSUE} } }`))
    .agentTeamDefinitions as Array<Record<string, any>>;
  const orgs = async () => (await graphql(`{ agentOrgDefinitions { id name ${ISSUE} } }`)).agentOrgDefinitions as Array<Record<string, any>>;
  const diagnostics = async (subject: "AGENT" | "AGENT_TEAM" | "AGENT_ORG") => (await graphql(
    `query($s:DefinitionSubject!){ definitionDiagnostics(subject:$s){ subject definitionId code reason definitionPath packageRoot usingLastGood dependencyChain } }`,
    { s: subject })).definitionDiagnostics as Array<Record<string, any>>;
  const packages = async () => (await graphql(`{ agentPackages { ${PACKAGE_FIELDS} } }`)).agentPackages as PackageRow[];
  const packageAt = async (root: string) => (await packages()).find((row) => row.path === root) ?? null;
  const importLocal = async (root: string) => {
    const rows = (await graphql(`mutation($input:ImportAgentPackageInput!){ importAgentPackage(input:$input){ ${PACKAGE_FIELDS} } }`,
      { input: { sourceKind: "LOCAL_PATH", source: root } })).importAgentPackage as PackageRow[];
    const row = rows.find((entry) => entry.path === root);
    expect(row, `imported row for ${root}`).toBeTruthy();
    // A real user writes after import; this also lets macOS directory watches start (see the monitor's notes).
    await sleep(1000);
    return row!;
  };
  const newPackage = async (label: string) => {
    const root = path.join(base, `${label}-${randomUUID().slice(0, 6)}`);
    await fs.mkdir(path.join(root, "agents"), { recursive: true });
    await fs.mkdir(path.join(root, "agent-teams"), { recursive: true });
    return root;
  };

  beforeAll(async () => {
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "definition-catalog-e2e-")));
    dataDir = path.join(base, "server-data");
    workspace = path.join(base, "workspace");
    argvLog = path.join(base, "agy-argv.jsonl");
    upstream = path.join(base, "github-upstream", "wrapper");
    await fs.mkdir(workspace, { recursive: true });
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AGY_FAKE_CASE", "AGY_FAKE_ARGV_LOG", "AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS"]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    process.env["AGY_FAKE_CASE"] = "linked_skills";
    process.env["AGY_FAKE_ARGV_LOG"] = argvLog;
    // Only GitHub's public API and archive host are controlled; everything else (this suite's own HTTP) is real.
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      if (target.startsWith("https://api.github.com/") || target.startsWith("https://codeload.github.com/")) {
        githubRequests.push(target);
        if (target === "https://api.github.com/repos/apar-e2e/agents") {
          return Response.json({ owner: { login: "apar-e2e" }, name: "agents", private: false, default_branch: "main", html_url: GITHUB_URL });
        }
        if (target.endsWith("/branches/main")) return Response.json({ commit: { sha: githubRevision } });
        if (target.startsWith("https://codeload.github.com/apar-e2e/agents/tar.gz/")) {
          expect(target).toContain(githubRevision);
          const archive = path.join(base, `github-${githubRevision.slice(0, 6)}.tar.gz`);
          await create({ gzip: true, file: archive, cwd: path.dirname(upstream), portable: true }, ["wrapper"]);
          return new Response(await fs.readFile(archive));
        }
        throw new Error(`Unexpected GitHub request: ${target}`);
      }
      return realFetch(input as never, init);
    });
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
    monitor = await openFeed();
    await until(() => monitor.frames.length >= 1, "monitor connected");
  }, 120_000);

  afterAll(async () => {
    const errors: string[] = [];
    for (const runId of [...activeRuns]) {
      await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })
        .catch((error) => errors.push(String(error)));
    }
    for (const socket of sockets) socket.terminate();
    if (app) await app.close();
    vi.unstubAllGlobals();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    // Strict contract: every frame any connection received matches the server schema.
    const invalidFrames = allRaw.filter((raw) => !DefinitionCatalogChangeMessageSchema.safeParse(JSON.parse(raw)).success);
    if (base) await fs.rm(base, { recursive: true, force: true });
    const dir = process.env["DEFINITION_CATALOG_E2E_EVIDENCE_DIR"];
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "definition-catalog-live-refresh.json"), `${JSON.stringify({ ...evidence,
        frames: { total: allRaw.length, invalid: invalidFrames },
        cleanup: { baseRemoved: await fs.access(base).then(() => false, () => true), serverClosed: !app?.server.listening, errors } }, null, 2)}\n`);
    }
    expect(invalidFrames, "every /ws/definition-catalog frame matches the strict schema").toEqual([]);
    expect(errors, "owned cleanup").toEqual([]);
  }, 120_000);

  it("DCF-E2E-001 (QR-006, REQ-005): `connected` first, no replay, broadcast; remote-access auth like the sibling sockets", async () => {
    // A loopback client connects without a credential, is greeted, and nothing is replayed.
    const first = await openFeed(), second = await openFeed();
    await until(() => first.frames.length >= 1 && second.frames.length >= 1, "both connected");
    await sleep(500);
    expect(first.frames).toEqual([{ type: "connected" }]);
    expect(second.frames).toEqual([{ type: "connected" }]);
    // A later change is broadcast to every client of the node.
    expect(await graphql(`mutation { refreshAgentDefinitionCatalog }`)).toEqual({ refreshAgentDefinitionCatalog: true });
    await until(() => [first, second].every((feed) => changed(feed).length >= 1), "broadcast reached both");

    // An invalid mobile credential is rejected exactly like the sibling sockets (4401, same reason).
    const rejected = await openFeed("?access_token=mra_not_a_paired_device");
    const closed = await rejected.closed;
    expect(rejected.frames).toEqual([]);
    const sibling = await openFeed("?access_token=mra_not_a_paired_device", "projects");
    const siblingClosed = await sibling.closed;
    expect(closed.code).toBe(4401);
    expect(closed).toEqual(siblingClosed);

    // A paired phone (real pairing through the Remote Access REST API) is accepted and receives the feed.
    expect((await rest("PUT", "/rest/remote-access/settings", { phoneAccessEnabled: true })).status).toBe(200);
    const session = await rest("POST", "/rest/remote-access/pairing-sessions",
      { serverBaseUrl: "https://apar-e2e.tailnet.ts.net/mobile", serverName: "AutoByteus E2E" });
    expect(session.status, JSON.stringify(session.body)).toBe(201);
    const exchange = await rest("POST", "/rest/remote-access/pairing-exchanges", {
      pairingCode: session.body.payload.pairingCode, serverBaseUrl: String(session.body.mobileUrl).split("?", 1)[0], deviceName: "APAR phone",
    });
    expect(exchange.status, JSON.stringify(exchange.body)).toBe(201);
    const credential = exchange.body.credential as string;
    expect(credential).toMatch(/^mra_/);
    const phone = await openFeed(`?access_token=${encodeURIComponent(credential)}`);
    await until(() => phone.frames.length >= 1, "paired phone connected");
    expect(phone.frames[0]).toEqual({ type: "connected" });
    expect(await graphql(`mutation { refreshAgentTeamDefinitionCatalog }`)).toEqual({ refreshAgentTeamDefinitionCatalog: true });
    await until(() => changed(phone).length >= 1, "paired phone received the change");

    // A revoked device can no longer connect (4403, like every remote-access socket).
    expect((await rest("DELETE", `/rest/remote-access/devices/${encodeURIComponent(exchange.body.device.deviceId)}`)).status).toBe(200);
    const revoked = await openFeed(`?access_token=${encodeURIComponent(credential)}`);
    const revokedClosed = await revoked.closed;
    expect(revoked.frames).toEqual([]);
    expect(revokedClosed).toEqual({ code: 4403, reason: "REMOTE_ACCESS_DEVICE_REVOKED" });
    expect((await rest("PUT", "/rest/remote-access/settings", { phoneAccessEnabled: false })).status).toBe(200);
    for (const feed of [first, second, phone]) feed.socket.close();
    evidence.dcf001 = { invalid: closed, sibling: siblingClosed, revoked: revokedClosed, pairedFrames: phone.frames };
  }, 60_000);

  it("DCF-E2E-002 (AC-001…005, AC-007, REQ-009, REQ-014): an imported package's files on disk reach GraphQL and the feed without Reload", async () => {
    const root = await newPackage("local-package");
    await writeAgent(path.join(root, "agents", "planner"), "APAR Planner");
    await writeTeam(path.join(root, "agent-teams", "crew"), "APAR Crew", [{ memberName: "lead", ref: "lead", refScope: "team_local" }]);
    await writeAgent(path.join(root, "agent-teams", "crew", "agents", "lead"), "APAR Crew Lead");
    const before = monitor.frames.length;
    const row = await importLocal(root);
    expect(row.autoRefresh).toEqual({ state: "WATCHING", message: null });
    expect(changed(monitor, before).some((frame) => frame.subjects?.includes("agent_package"))).toBe(true);
    expect((await agents()).map((entry) => entry.id)).toContain("planner");
    const record: Record<string, unknown> = {};

    // AC-001: a new agent and a new Team written outside the app are listed within 5 s; the feed tells clients.
    let mark = monitor.frames.length;
    await writeAgent(path.join(root, "agents", "scout"), "APAR Scout");
    await writeTeam(path.join(root, "agent-teams", "squad"), "APAR Squad", [{ memberName: "lead", ref: "scout", refScope: "shared" }]);
    const created = await waitFor(async () => ({ agents: (await agents()).map((entry) => entry.id), teams: (await teams()).map((entry) => entry.id) }),
      (value) => value.agents.includes("scout") && value.teams.includes("squad"), "new agent and Team listed");
    await until(() => changed(monitor, mark).some((frame) => frame.subjects?.includes("agent") && frame.subjects.includes("agent_team")), "feed frame for the new definitions", AC_BOUND_MS);
    record.createdVisibleMs = created.elapsedMs;
    record.createdFrames = changed(monitor, mark);

    // AC-002: an edit reaches every GraphQL reader.
    await writeAgent(path.join(root, "agents", "scout"), "APAR Scout", "Scout with the second playbook.");
    const edited = await waitFor(() => agent("scout"), (value) => value?.instructions?.trim() === "Scout with the second playbook.", "edited instructions");
    record.editVisibleMs = edited.elapsedMs;

    // AC-004: a broken edit keeps the last good version listed with an issue naming the file and reason.
    const configPath = path.join(root, "agents", "planner", "agent-config.json");
    await write(configPath, "{ \"toolNames\": [");
    const broken = await waitFor(() => agent("planner"), (value) => value?.catalogIssue !== null && value?.catalogIssue !== undefined, "planner issue");
    expect(broken.value!.catalogIssue).toMatchObject({ code: "DEFINITION_CONTRACT_INVALID", definitionPath: configPath, packageRoot: root });
    expect(broken.value!.catalogIssue.reason).toMatch(/JSON/i);
    expect(broken.value!.name).toBe("APAR Planner");
    expect((await agents()).find((entry) => entry.id === "planner")?.catalogIssue?.code).toBe("DEFINITION_CONTRACT_INVALID");
    expect(await diagnostics("AGENT")).toContainEqual(expect.objectContaining({
      subject: "AGENT", definitionId: "planner", code: "DEFINITION_CONTRACT_INVALID", definitionPath: configPath, usingLastGood: true }));
    await write(configPath, JSON.stringify({ toolNames: [], skillNames: [] }));
    const fixed = await waitFor(() => agent("planner"), (value) => value?.catalogIssue === null, "planner issue cleared");
    expect((await diagnostics("AGENT")).some((entry) => entry.definitionId === "planner")).toBe(false);
    record.fixClearedMs = fixed.elapsedMs;

    // DSN-003: a broken team-local agent keeps its last good version and its Team stays listed.
    const localPath = path.join(root, "agent-teams", "crew", "agents", "lead", "agent.md");
    await write(localPath, "half-written");
    const nested = await waitFor(() => diagnostics("AGENT"), (list) => list.some((entry) => entry.definitionPath === localPath), "nested issue");
    expect(nested.value.find((entry) => entry.definitionPath === localPath)).toMatchObject({ code: "DEFINITION_CONTRACT_INVALID", usingLastGood: true });
    expect((await teams()).find((entry) => entry.id === "crew")).toBeTruthy();
    expect((await diagnostics("AGENT_TEAM")).some((entry) => entry.definitionId === "crew")).toBe(false);
    await writeAgent(path.join(root, "agent-teams", "crew", "agents", "lead"), "APAR Crew Lead");
    await waitFor(() => diagnostics("AGENT"), (list) => !list.some((entry) => entry.definitionPath === localPath), "nested issue cleared");

    // AC-005: a new invalid Team is unavailable with a diagnostic; other Teams are unaffected.
    const brokenTeam = path.join(root, "agent-teams", "broken-team", "team.md");
    await write(brokenTeam, "no front matter");
    await write(path.join(root, "agent-teams", "broken-team", "team-config.json"), "{}");
    const unavailable = await waitFor(() => diagnostics("AGENT_TEAM"), (list) => list.some((entry) => entry.definitionId === "broken-team"), "invalid Team diagnostic");
    expect(unavailable.value.find((entry) => entry.definitionId === "broken-team")).toMatchObject({
      code: "DEFINITION_CONTRACT_INVALID", definitionPath: brokenTeam, usingLastGood: false });
    expect((await teams()).map((entry) => entry.id)).toEqual(expect.arrayContaining(["squad", "crew"]));
    expect((await teams()).map((entry) => entry.id)).not.toContain("broken-team");

    // AC-007: skill content and non-definition files produce no notification.
    mark = monitor.frames.length;
    const skillDir = path.join(root, "agents", "scout", "skills", "research");
    await write(path.join(skillDir, "SKILL.md"), "---\nname: research\ndescription: d\n---\nBody\n");
    await write(path.join(skillDir, "scripts", "run.sh"), "echo hi\n");
    await write(path.join(root, "agents", "scout", "notes.md"), "notes\n");
    await write(path.join(root, "README.md"), "readme\n");
    await fs.rm(skillDir, { recursive: true });
    await sleep(2000);
    expect(changed(monitor, mark)).toEqual([]);

    // AC-003 + AR-001: deleting the agent removes it, and its dependent Team becomes unavailable (dependent lists told).
    mark = monitor.frames.length;
    await fs.rm(path.join(root, "agents", "scout"), { recursive: true });
    const removed = await waitFor(() => agents(), (list) => !list.some((entry) => entry.id === "scout"), "deleted agent gone");
    await until(() => changed(monitor, mark).some((frame) => frame.subjects?.includes("agent_team")), "dependent Team list told", AC_BOUND_MS);
    const squad = await waitFor(() => diagnostics("AGENT_TEAM"), (list) => list.some((entry) => entry.definitionId === "squad"), "Team without its agent");
    expect(squad.value.find((entry) => entry.definitionId === "squad")?.code).toBe("DEFINITION_REFERENCE_UNRESOLVED");
    expect((await teams()).map((entry) => entry.id)).not.toContain("squad");
    record.deleteVisibleMs = removed.elapsedMs;
    for (const value of [created.elapsedMs, edited.elapsedMs, fixed.elapsedMs, removed.elapsedMs]) expect(value).toBeLessThan(AC_BOUND_MS);
    evidence.dcf002 = record;
  }, 90_000);

  it("DCF-E2E-003 (AC-011, AC-012, REQ-015): a package folder moved away keeps its definitions and reports it; restore resumes; removal releases it", async () => {
    const root = await newPackage("movable-package");
    await writeAgent(path.join(root, "agents", "nomad"), "APAR Nomad");
    const row = await importLocal(root);
    expect(row.autoRefresh?.state).toBe("WATCHING");
    const moved = `${root}-moved`;
    let mark = monitor.frames.length;
    await fs.rename(root, moved);
    const missing = await waitFor(() => packageAt(root), (value) => value?.autoRefresh?.state === "ROOT_MISSING", "ROOT_MISSING");
    expect(missing.value?.autoRefresh?.message).toBeTruthy();
    await until(() => changed(monitor, mark).some((frame) => frame.subjects?.includes("agent_package")), "agent_package frame");
    const kept = await waitFor(() => agent("nomad"), (value) => value?.catalogIssue?.code === "DEFINITION_SOURCE_MISSING", "last good kept with issue");
    expect(kept.value?.name).toBe("APAR Nomad");

    await fs.rename(moved, root);
    const back = await waitFor(() => packageAt(root), (value) => value?.autoRefresh?.state === "WATCHING", "WATCHING again");
    await waitFor(() => agent("nomad"), (value) => value?.catalogIssue === null, "issue cleared");
    await sleep(1000);
    await writeAgent(path.join(root, "agents", "nomad"), "APAR Nomad", "Back home.");
    await waitFor(() => agent("nomad"), (value) => value?.instructions?.trim() === "Back home.", "edits resume");

    // Removing the package releases its watch: its definitions go and later edits there are ignored.
    await graphql(`mutation($id:String!){ removeAgentPackage(packageId:$id){ packageId } }`, { id: row.packageId });
    expect(await packageAt(root)).toBeNull();
    expect(await agent("nomad")).toBeNull();
    mark = monitor.frames.length;
    await writeAgent(path.join(root, "agents", "after-removal"), "APAR After Removal");
    await sleep(2000);
    expect(changed(monitor, mark)).toEqual([]);
    expect(await agent("after-removal")).toBeNull();
    evidence.dcf003 = { missing: missing.value?.autoRefresh, missingMs: missing.elapsedMs, restoredMs: back.elapsedMs };
  }, 60_000);

  it("DCF-E2E-004 (AC-013, REQ-017): every manual Reload notifies another connected client of every catalog subject", async () => {
    const root = await newPackage("reload-package");
    await writeAgent(path.join(root, "agents", "reloader"), "APAR Reloader");
    const row = await importLocal(root);
    const other = await openFeed();
    await until(() => other.frames.length >= 1, "other client connected");
    const all = ["agent", "agent_team", "agent_org", "agent_package"];
    const reloads: Array<[string, string, Record<string, unknown>?]> = [
      ["agents page Reload", `mutation { refreshAgentDefinitionCatalog }`],
      ["teams page Reload", `mutation { refreshAgentTeamDefinitionCatalog }`],
      ["orgs page Reload", `mutation { refreshAgentOrgDefinitionCatalog }`],
      ["package Reload", `mutation($id:String!){ reloadAgentPackage(packageId:$id){ packageId } }`, { id: row.packageId }],
    ];
    const observed: Record<string, unknown> = {};
    for (const [label, mutation, variables] of reloads) {
      const mark = other.frames.length;
      await graphql(mutation, variables);
      await until(() => changed(other, mark).some((frame) => all.every((subject) => frame.subjects?.includes(subject))), `${label} published`, AC_BOUND_MS);
      observed[label] = changed(other, mark);
    }
    other.socket.close();
    await graphql(`mutation($id:String!){ removeAgentPackage(packageId:$id){ packageId } }`, { id: row.packageId });
    evidence.dcf004 = observed;
  }, 60_000);

  it("DCF-E2E-005 (AC-009, REQ-013, DSN-001): a GitHub package updates only on Update, and the result reaches another client", async () => {
    await writeAgent(path.join(upstream, "agents", "gh-alpha"), "APAR GitHub Alpha");
    githubRevision = "a".repeat(40);
    githubRequests = [];
    const imported = (await graphql(`mutation($input:ImportAgentPackageInput!){ importAgentPackage(input:$input){ ${PACKAGE_FIELDS} } }`,
      { input: { sourceKind: "GITHUB_REPOSITORY", source: GITHUB_URL } })).importAgentPackage as PackageRow[];
    const row = imported.find((entry) => entry.sourceKind === "GITHUB_REPOSITORY")!;
    expect(row.updateInfo).toMatchObject({ installedRevision: githubRevision });
    expect(row.autoRefresh?.state).toBe("WATCHING");
    expect((await agents()).map((entry) => entry.id)).toContain("gh-alpha");

    // Upstream moves on. Check reports it but downloads nothing; the catalog is unchanged (no background update).
    await writeAgent(path.join(upstream, "agents", "gh-beta"), "APAR GitHub Beta");
    githubRevision = "b".repeat(40);
    const downloadsBefore = githubRequests.filter((target) => target.includes("/tar.gz/")).length;
    const checked = (await graphql(`mutation($ids:[String!]){ checkAgentPackageUpdates(packageIds:$ids){ ${PACKAGE_FIELDS} } }`,
      { ids: [row.packageId] })).checkAgentPackageUpdates as PackageRow[];
    expect(checked.find((entry) => entry.packageId === row.packageId)?.updateInfo.status).toBe("UPDATE_AVAILABLE");
    expect(githubRequests.filter((target) => target.includes("/tar.gz/")).length).toBe(downloadsBefore);
    await sleep(1500);
    expect((await agents()).map((entry) => entry.id)).not.toContain("gh-beta");

    // The user clicks Update in one window; another window (connected client) is told and its list reloads.
    const other = await openFeed();
    await until(() => other.frames.length >= 1, "other window connected");
    const mark = other.frames.length;
    const updated = (await graphql(`mutation($id:String!){ updateAgentPackage(packageId:$id){ ${PACKAGE_FIELDS} } }`, { id: row.packageId }))
      .updateAgentPackage as PackageRow[];
    expect(updated.find((entry) => entry.packageId === row.packageId)?.updateInfo).toMatchObject({ status: "UP_TO_DATE", installedRevision: githubRevision });
    await until(() => changed(other, mark).some((frame) => frame.subjects?.includes("agent") && frame.subjects.includes("agent_package")), "Update published", AC_BOUND_MS);
    expect((await agents()).map((entry) => entry.id)).toEqual(expect.arrayContaining(["gh-alpha", "gh-beta"]));
    // The managed folder was replaced by rename; the monitor re-armed the new folder.
    const after = await waitFor(() => packageAt(row.path), (value) => value?.autoRefresh?.state === "WATCHING", "managed root re-armed");
    other.socket.close();
    await graphql(`mutation($id:String!){ removeAgentPackage(packageId:$id){ packageId } }`, { id: row.packageId });
    expect((await agents()).map((entry) => entry.id)).not.toContain("gh-alpha");
    evidence.dcf005 = { githubRequests, updateFrames: changed(other, mark), autoRefreshAfterUpdate: after.value?.autoRefresh };
  }, 60_000);

  // Shared by DCF-E2E-006 and DCF-E2E-007: two imported packages that both define the same Team ID.
  const duplicate = { name: "APAR Duplicated Team", id: "apar-dup-team", roots: [] as string[] };

  it("DCF-E2E-006 (DSN-002): a Team present in two packages is unavailable everywhere with DEFINITION_IDENTITY_DUPLICATED", async () => {
    for (const label of ["dup-a", "dup-b"]) {
      const root = await newPackage(label);
      await writeAgent(path.join(root, "agents", `${label}-member`), `APAR ${label} member`);
      await writeTeam(path.join(root, "agent-teams", duplicate.id), duplicate.name, [{ memberName: "lead", ref: `${label}-member`, refScope: "shared" }]);
      await importLocal(root);
      duplicate.roots.push(root);
    }
    expect((await teams()).map((entry) => entry.id)).not.toContain(duplicate.id);
    const diagnostic = (await diagnostics("AGENT_TEAM")).find((entry) => entry.definitionId === duplicate.id);
    expect(diagnostic).toMatchObject({ code: "DEFINITION_IDENTITY_DUPLICATED", usingLastGood: false });
    for (const root of duplicate.roots) expect(diagnostic!.reason).toContain(root);
    evidence.dcf006 = { diagnostic };
  }, 60_000);

  // ---- Real agent tools and runs (scripted AGY actor) ----

  const runConfig = () => ({ workspaceRootPath: workspace, llmModelIdentifier: "gemini-3.8-flash-low",
    llmConfig: null, autoExecuteTools: true, runtimeKind: "antigravity_cli" });
  const createRun = async (agentDefinitionId: string) => {
    const created = (await graphql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`,
      { input: { agentDefinitionId, ...runConfig() } })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    activeRuns.push(created.runId);
    return created.runId as string;
  };
  const terminateRun = async (runId: string) => {
    const result = (await graphql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`, { id: runId })).terminateAgentRun;
    expect(result.success, result.message).toBe(true);
    activeRuns.splice(activeRuns.indexOf(runId), 1);
  };
  const connectAgent = async (runId: string) => {
    const socket = new WebSocket(`ws://${url.host}/ws/agent/${runId}`);
    sockets.push(socket);
    const frames: Array<{ type: string }> = [];
    socket.on("message", (raw: unknown) => frames.push(JSON.parse(String(raw))));
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "CONNECTED"), "agent stream ready");
    return socket;
  };
  const conversation = async (runId: string) => (await graphql(`query($id:String!){getRunProjection(runId:$id){conversation}}`, { id: runId }))
    .getRunProjection?.conversation;
  /** Sends one message to a standalone run and returns the reply text after `marker`. */
  const ask = async (socket: WebSocket, runId: string, content: string, marker: string) => {
    const before = markerTexts(await conversation(runId), marker).length;
    sendE2eSendMessageCommand(socket, { agent_run_id: runId, content });
    let texts: string[] = [];
    await until(async () => { texts = markerTexts(await conversation(runId), marker); return texts.length > before; }, `reply ${marker}`, 60_000);
    return texts[before]!;
  };
  const launches = async () => (await fs.readFile(argvLog, "utf8").catch(() => "")).split("\n").filter(Boolean).length;

  itAgy("DCF-E2E-007 (SCN-012, AC-015, AC-016): the next delegation uses current definitions, through the real tools", async () => {
    const record: Record<string, unknown> = {};
    const suffix = randomUUID().slice(0, 6);
    const managerId = (await graphql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: `APAR Manager ${suffix}`, role: "assistant", description: "Delegates (definition catalog E2E)",
        instructions: "Follow the user's request.", toolNames: ["list_available_agents", "delegate_task", "send_message_to"] } })).createAgentDefinition.id as string;
    const root = await newPackage("creator-package");
    await writeAgent(path.join(root, "agents", "apar-editor"), "APAR Editor", "Edit drafts. MARK_EDITOR_V1");
    await writeAgent(path.join(root, "agents", "apar-doomed"), "APAR Doomed");
    await importLocal(root);
    const managerRunId = await createRun(managerId);
    const managerSocket = await connectAgent(managerRunId);
    const managerCalls = async (content: string) => toolText(await ask(managerSocket, managerRunId, content, "CALLED:"));
    const listNames = async () => (JSON.parse((await managerCalls(callTool("list_available_agents", {}))).text).agents as Array<{ name: string }>)
      .map((entry) => entry.name);
    const tree = async () => (await graphql(`query($id:String!){agentRunCollaboration(runId:$id)}`, { id: managerRunId }))
      .agentRunCollaboration?.root_agent?.execution_tree ?? null;
    const memberConversation = async (address: string, agentRunId: string) => (await graphql(
      `query($h:String!,$a:String!,$r:String!){agentRunCollaborationMemberProjection(hostRunId:$h,memberAddress:$a,agentRunId:$r){conversation}}`,
      { h: managerRunId, a: address, r: agentRunId })).agentRunCollaborationMemberProjection?.conversation;
    /** Delegates `READ_AGENT_PROMPT` to an address and returns the new copy and the prompt its runtime received. */
    const delegateAndReadPrompt = async (address: string) => {
      const known = new Set(taskNodes(await tree()).map((node) => node.agentRunId ?? node.teamRunId));
      const result = await managerCalls(callTool("delegate_task", { recipient_address: address, description: "READ_AGENT_PROMPT" }));
      expect(result.isError, result.text).toBe(false);
      let copy: ReturnType<typeof taskNodes>[number] | undefined;
      let prompt: string | undefined;
      await until(async () => {
        copy = taskNodes(await tree()).find((node) => !known.has(node.agentRunId ?? node.teamRunId) && node.address === address);
        const speaker = copy?.teamRunId ? copy.members.find((member) => member.agentRunId) : copy;
        if (!speaker?.agentRunId) return false;
        prompt = markerTexts(await memberConversation(speaker.address ?? copy!.address, speaker.agentRunId), "AGENT_PROMPT:")[0];
        return prompt !== undefined;
      }, `copy of ${address} read its prompt`, 60_000);
      return { copy: copy!, prompt: JSON.parse(prompt!) as string, result: result.text };
    };
    expect(await listNames()).toEqual(expect.arrayContaining(["APAR Editor", "APAR Doomed"]));
    if (duplicate.roots.length) expect(await listNames()).not.toContain(duplicate.name); // DSN-002 at the tool

    // (a) The Agent Package Creator writes a new agent and a new Team. The next delegation, still inside the settle
    // window (nothing published yet), finds both: the lookup applies the detected change first (AC-016, REQ-018).
    // The short pause stands in for the creator's reply turn; the monitor detects a write in ~5-30 ms here.
    const writtenAt = Date.now();
    const mark = monitor.frames.length;
    await writeAgent(path.join(root, "agents", "apar-fresh-scout"), "APAR Fresh Scout", "Scout new ground. MARK_SCOUT_V1");
    await writeTeam(path.join(root, "agent-teams", "apar-fresh-squad"), "APAR Fresh Squad", [
      { memberName: "lead", ref: "apar-fresh-scout", refScope: "shared" },
      { memberName: "mate", ref: "apar-editor", refScope: "shared" }]);
    await sleep(300);
    expect(changed(monitor, mark), "still inside the 1 s settle window").toEqual([]);
    const listedAfterWrite = await listNames();
    record.listAfterWriteMs = Date.now() - writtenAt;
    record.framesWhenListed = changed(monitor, mark);
    expect(listedAfterWrite).toEqual(expect.arrayContaining(["APAR Fresh Scout", "APAR Fresh Squad"]));
    const scoutCopy = await delegateAndReadPrompt(`/${segment("APAR Fresh Scout")}`);
    expect(scoutCopy.prompt).toContain("MARK_SCOUT_V1");
    const squadV1 = await delegateAndReadPrompt(`/${segment("APAR Fresh Squad")}`);
    expect(squadV1.copy.teamRunId, JSON.stringify(squadV1.copy.raw).slice(0, 1500)).toBeTruthy();
    expect(squadV1.prompt).toContain("MARK_SCOUT_V1");
    record.squadV1Members = squadV1.copy.members.map((member) => member.address);

    // (b) The creator edits the Team (new coordinator, new member set, a handoff) and an agent's instructions;
    // a new copy spawned right away has the current members and its agents the current instructions.
    await writeAgent(path.join(root, "agents", "apar-editor"), "APAR Editor", "Edit drafts. MARK_EDITOR_V2");
    await writeTeam(path.join(root, "agent-teams", "apar-fresh-squad"), "APAR Fresh Squad", [
      { memberName: "chief", ref: "apar-editor", refScope: "shared" },
      { memberName: "scout", ref: "apar-fresh-scout", refScope: "shared" }],
    [{ from: "/chief", to: "/scout", rules: ["Hand over the survey."] }]);
    await sleep(300); // the creator's reply turn
    const squadV2 = await delegateAndReadPrompt(`/${segment("APAR Fresh Squad")}`);
    expect(squadV2.prompt).toContain("MARK_EDITOR_V2");
    expect(squadV2.prompt).not.toContain("MARK_EDITOR_V1");
    const team = (await teams()).find((entry) => entry.id === "apar-fresh-squad")!;
    expect(team.coordinatorMemberName).toBe("chief");
    expect(team.nodes.map((node: any) => node.memberName).sort()).toEqual(["chief", "scout"]);
    record.squadV2Members = squadV2.copy.members.map((member) => member.address);
    if (squadV2.copy.members.length) {
      expect(squadV2.copy.members.map((member) => member.address).join(" ")).toContain("chief");
      expect(squadV2.copy.members.map((member) => member.address).join(" ")).not.toContain("/lead");
    }
    const editorCopy = await delegateAndReadPrompt(`/${segment("APAR Editor")}`);
    expect(editorCopy.prompt).toContain("MARK_EDITOR_V2");
    // Copies spawned before the change keep their original snapshot (REQ-012).
    const v1Lead = squadV1.copy.members.find((member) => member.agentRunId)!;
    const v1Again = markerTexts(await memberConversation(v1Lead.address, v1Lead.agentRunId!), "AGENT_PROMPT:");
    expect(JSON.parse(v1Again[0]!)).toContain("MARK_SCOUT_V1");

    // (c) The creator deletes an agent; the next delegation no longer lists it and gets the not-found result.
    await fs.rm(path.join(root, "agents", "apar-doomed"), { recursive: true });
    await sleep(300); // the creator's reply turn
    expect(await listNames()).not.toContain("APAR Doomed");
    const refused = await managerCalls(callTool("delegate_task", { recipient_address: `/${segment("APAR Doomed")}`, description: "Reply OK." }));
    record.deletedDelegation = refused;
    // The existing refusal for an address that is not available (delegate_task's documented `delegated: false`).
    expect(JSON.parse(refused.text)).toEqual({ delegated: false,
      message: "'/apar_doomed' is not a mounted Agent or Agent Team, a collaborator or an available agent of this run." });
    evidence.dcf007 = record;
  }, 240_000);

  itAgy("DCF-E2E-008 (AC-008, REQ-012, DEC-003): an active run keeps its definition across an edit and a removal; restore after stop reports not found", async () => {
    const root = await newPackage("steady-package");
    await writeAgent(path.join(root, "agents", "apar-steady"), "APAR Steady", "Hold steady. MARK_STEADY_V1");
    await importLocal(root);
    const runId = await createRun("apar-steady");
    const socket = await connectAgent(runId);
    const promptOf = async (id: string, channel: WebSocket) => JSON.parse(await ask(channel, id, "READ_AGENT_PROMPT", "AGENT_PROMPT:")) as string;
    expect(await promptOf(runId, socket)).toContain("MARK_STEADY_V1");
    const launchesBefore = await launches();

    // Edit: the active run keeps working with its original definition (no restart); a new run uses the edit.
    await writeAgent(path.join(root, "agents", "apar-steady"), "APAR Steady", "Hold steady. MARK_STEADY_V2");
    await waitFor(() => agent("apar-steady"), (value) => value?.instructions?.trim() === "Hold steady. MARK_STEADY_V2", "edit visible");
    const stillOriginal = await promptOf(runId, socket);
    expect(stillOriginal).toContain("MARK_STEADY_V1");
    expect(stillOriginal).not.toContain("MARK_STEADY_V2");
    const launchesAfterEdit = await launches();
    expect(launchesAfterEdit, "the active run was not relaunched").toBe(launchesBefore);
    const newRunId = await createRun("apar-steady");
    const newSocket = await connectAgent(newRunId);
    expect(await promptOf(newRunId, newSocket)).toContain("MARK_STEADY_V2");
    await terminateRun(newRunId);

    // Removal: the active run still answers; after it stops, restoring it reports the definition as not found.
    await fs.rm(path.join(root, "agents", "apar-steady"), { recursive: true });
    await waitFor(() => agent("apar-steady"), (value) => value === null, "removal visible");
    // The scripted actor answers a plain message with `OK` (the message itself does not contain the marker).
    expect(await ask(socket, runId, "Are you still there?", "OK")).toBe("");
    await terminateRun(runId);
    const restored = (await graphql(`mutation($id:String!){restoreAgentRun(agentRunId:$id){success message runId}}`, { id: runId })).restoreAgentRun;
    expect(restored.success).toBe(false);
    // The existing per-runtime "definition not found" error (unchanged from base: agy-agent-run-backend-factory).
    expect(restored.message).toMatch(/AGY_AGENT_DEFINITION_MISSING: apar-steady/);
    evidence.dcf008 = { restored, launchesBefore, launchesAfterEdit };
  }, 180_000);
});
