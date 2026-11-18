import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";
import type { FastifyInstance } from "fastify";
import { create } from "tar";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { SkillSourceService } from "../../../src/skills/services/skill-source-service.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { UpdateNotificationService } from "../../../src/update-notifications/services/update-notification-service.js";
import { UpdateChecksCapabilityService } from "../../../src/update-notifications/services/update-checks-capability-service.js";
import { UpdateAutomationSettingsService } from "../../../src/update-notifications/services/update-automation-settings-service.js";
import { setGitHubRateLimitGateForTests } from "../../../src/integrations/github/github-rate-limit-gate.js";
import { AUTO_UPDATE_SETTING_KEYS, UPDATE_CHECK_INTERVAL_SETTING_KEYS, UPDATE_CHECKS_SETTING_KEY } from "../../../src/update-notifications/domain/settings.js";
import { FIRST_TICK_DELAY_MS, TICK_INTERVAL_MS } from "../../../src/update-notifications/services/update-check-scheduler.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { headReadRepository, headReadResponse } from "../helpers/github-head-read-stub.js";

// Personal settings of package definitions at the real server boundary (autobyteus-95 stage 1): the Studio
// HTTP/GraphQL server with the renderer's own GraphQL documents, the three definition services' effective reads
// and split saves, `PersonalSettingsService` and its file, the GitHub package update pipeline with
// `PackageEditCapture` (the real installer downloads the installed revision), the backups, and the automatic update
// pass. Only GitHub HTTP is controlled: the REST metadata imports use, the head read, and the codeload archives of
// every revision (written when that revision was current). Time moves with Vitest's fake clock (`setTimeout`/`Date`,
// advancing with real time) for the automatic pass. A "restart" closes the server, drops the process singletons and
// starts a new server on the same data root; the GraphQL schema is built once per process (type-graphql re-appends
// `@Arg` metadata on each build, see update-notifications-live.e2e.test.ts).
// Cases (API/E2E IDs of autobyteus-95): API-02 personal edits in the app kept across an update by click (AC-002,
// REQ-005); API-03 edits inside the package files captured and backed up (AC-003); API-04 the same through the
// automatic pass; API-06 the latest 5 backups kept; API-05 the installed revision cannot be downloaded (AC-004, click
// and automatic); API-07 reset (AC-005); API-08 an unreadable personal settings file (AC-007).
// Run ungated with a clean environment:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/personal-settings/package-personal-settings.e2e.test.ts --no-watch
// PERSONAL_SETTINGS_E2E_EVIDENCE_DIR keeps a JSON receipt (GitHub requests, settings files, backups).

vi.mock("../../../src/api/graphql/schema.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/api/graphql/schema.js")>();
  let built: ReturnType<typeof actual.buildGraphqlSchema> | null = null;
  return { ...actual, buildGraphqlSchema: () => (built ??= actual.buildGraphqlSchema()) };
});

type Rec = Record<string, any>;
type GitHubRequest = { url: string; method: string; phase: string; answered: string };

const MINUTE = 60_000;
const DUE_AFTER_DEFAULT = 36 * MINUTE; // 30-minute package interval + its spreading delay (< 5 min)
const REPO = "pps-e2e/agents";
const rev = (n: number) => n.toString(16).padStart(40, "0");
const AVATAR = "/rest/files/images/pps-e2e-personal.png";
const LAUNCH = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.6-luna", llmConfig: null };
const SETTING_KEYS = [UPDATE_CHECKS_SETTING_KEY, ...Object.values(UPDATE_CHECK_INTERVAL_SETTING_KEYS), ...Object.values(AUTO_UPDATE_SETTING_KEYS)];

const loadDocuments = async (...files: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  for (const file of files) {
    const source = await fs.readFile(new URL(`../../../../autobyteus-web/graphql/${file}`, import.meta.url), "utf8");
    const templates = Object.fromEntries([...source.matchAll(/(?:export )?const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1]!, m[2]!]));
    for (const [key, body] of Object.entries(templates)) out[key] = body.replace(/\$\{(\w+)\}/g, (_all, name: string) => templates[name] ?? "");
  }
  return out;
};

/** Every file under `root` with its sha256, relative paths sorted. */
const treeHashes = async (root: string): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  const walk = async (dir: string) => {
    for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(full);
      else out[path.relative(root, full)] = createHash("sha256").update(await fs.readFile(full)).digest("hex");
    }
  };
  await walk(root);
  return Object.fromEntries(Object.entries(out).sort(([a], [b]) => a.localeCompare(b)));
};

describe("Personal settings of package definitions at the real server boundary (fake GitHub, real update pipeline)", () => {
  let base = "", dataDir = "", upstreamDir = "", app: FastifyInstance | undefined, url!: URL;
  let docs: Record<string, string> = {};
  let current = 0; // the upstream revision number
  let packageId = "", installDir = "";
  const unavailable = new Set<string>(); // revisions whose archive answers 404
  const requests: GitHubRequest[] = [];
  const evidence: Record<string, unknown> = {};
  const savedEnv = new Map<string, string | undefined>();
  let phase = "setup";
  const warnings: string[] = [];

  const settingsFile = () => path.join(dataDir, "agent-packages", "personal-settings.json");
  const backupsDir = () => path.join(dataDir, "agent-packages", "backups", "pps-e2e__agents");
  const readSettings = async (): Promise<Rec> => { try { return JSON.parse(await fs.readFile(settingsFile(), "utf8")); } catch { return {}; } };
  const backups = async (): Promise<string[]> => { try { return (await fs.readdir(backupsDir())).sort(); } catch { return []; } };
  const graphqlRaw = async (query: string, variables?: Rec) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    return await response.json() as { data?: any; errors?: Array<{ message: string; extensions?: Rec }> };
  };
  const gql = async (query: string, variables?: Rec): Promise<any> => {
    const body = await graphqlRaw(query, variables);
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const agents = async (): Promise<Rec[]> => (await gql(docs.GetAgentDefinitions!)).agentDefinitions;
  const agent = async (id: string) => (await agents()).find((row) => row.id === id)!;
  const team = async (id: string) => (await gql(docs.GetAgentTeamDefinitions!)).agentTeamDefinitions.find((row: Rec) => row.id === id)!;
  const packageRow = async () => (await gql(docs.GET_AGENT_PACKAGES!)).agentPackages.find((row: Rec) => row.packageId === packageId);
  const notification = async () => (await gql(docs.GET_UPDATE_NOTIFICATIONS!)).updateNotifications.find((row: Rec) => row.kind === "AGENT_PACKAGE");
  const since = (mark: number) => requests.slice(mark).map((entry) => `${entry.method} ${entry.url} → ${entry.answered}`);
  const until = async (check: () => Promise<boolean> | boolean, label: string, timeoutMs = 20_000) => {
    const started = Date.now();
    while (!(await check())) {
      if (Date.now() - started > timeoutMs) throw new Error(`${label}: not met within ${timeoutMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  const nextTick = async (jumpMs?: number) => {
    if (jumpMs) vi.setSystemTime(Date.now() + jumpMs);
    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
  };

  const write = async (file: string, content: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, content); };
  const agentConfig = (toolNames: string[], skillNames: string[]) =>
    `${JSON.stringify({ toolNames, skillNames, avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`;
  /** The package at revision `n`: the author adds one tool per revision to `writer` (tool_r<n>). */
  const writeUpstream = async (n: number) => {
    await fs.rm(upstreamDir, { recursive: true, force: true });
    const authorTools = Array.from({ length: n - 1 }, (_value, i) => `tool_r${i + 2}`);
    for (const id of ["writer", "reviewer"]) {
      const dir = path.join(upstreamDir, "agents", id);
      await write(path.join(dir, "agent.md"), `---\nname: ${id}\ndescription: ${id} agent\n---\n\n${id} instructions, revision ${n}.\n`);
      await write(path.join(dir, "agent-config.json"), id === "writer"
        ? agentConfig(["read_file", "write_file", ...authorTools], ["design"]) : agentConfig(["read_file", "write_file"], []));
    }
    // The writer's own skills (skill names are unique within a package).
    for (const skill of ["design", "review"]) {
      await write(path.join(upstreamDir, "agents", "writer", "skills", skill, "SKILL.md"), `---\nname: ${skill}\ndescription: ${skill} skill\n---\n\n${skill}.\n`);
    }
    await write(path.join(upstreamDir, "agent-teams", "crew", "team.md"), `---\nname: crew\ndescription: crew team\n---\n\nCoordinate, revision ${n}.\n`);
    await write(path.join(upstreamDir, "agent-teams", "crew", "team-config.json"), `${JSON.stringify({
      coordinatorMemberName: "writer", members: [{ memberName: "writer", ref: "writer", refScope: "shared" }, { memberName: "reviewer", ref: "reviewer", refScope: "shared" }],
      handoffs: [], avatarUrl: null, defaultLaunchConfig: null }, null, 2)}\n`);
    await create({ gzip: true, file: path.join(base, `agents-${rev(n)}.tar.gz`), cwd: path.dirname(upstreamDir), portable: true }, ["wrapper"]);
    current = n;
  };
  /** An edit the user made inside the managed install, as before this change. */
  const editInstalledConfig = async (id: string, change: (config: Rec) => Rec) => {
    const file = path.join(installDir, "agents", id, "agent-config.json");
    await fs.writeFile(file, `${JSON.stringify(change(JSON.parse(await fs.readFile(file, "utf8"))), null, 2)}\n`);
  };
  const update = async () => (await gql(docs.UPDATE_AGENT_PACKAGE!, { packageId })).updateAgentPackage.find((row: Rec) => row.packageId === packageId);

  const startServer = async () => {
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
  };
  const restart = async () => {
    await app?.close();
    app = undefined;
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService, UpdateAutomationSettingsService]) owner.resetInstance();
    setGitHubRateLimitGateForTests(null);
    for (const key of SETTING_KEYS) delete process.env[key];
    await startServer();
  };

  beforeAll(async () => {
    docs = await loadDocuments("queries/agentDefinitionQueries.ts", "mutations/agentDefinitionMutations.ts", "queries/agentTeamDefinitionQueries.ts",
      "mutations/agentTeamDefinitionMutations.ts", "agentPackages.ts", "updateNotifications.ts");
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "package-personal-settings-e2e-")));
    dataDir = path.join(base, "server-data");
    upstreamDir = path.join(base, "upstream", "wrapper");
    await fs.mkdir(dataDir, { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS", "AUTOBYTEUS_DESKTOP_EMBEDDED_NODE", ...SETTING_KEYS]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    await writeUpstream(1);
    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const host = new URL(target).hostname;
      if (!["api.github.com", "codeload.github.com", "github.com"].includes(host)) return realFetch(input as never, init);
      const entry: GitHubRequest = { url: target, method: (init?.method ?? "GET").toUpperCase(), phase, answered: "" };
      requests.push(entry);
      if (headReadRepository(target, init) === REPO) { entry.answered = `head ${current}`; return headReadResponse(rev(current)); }
      if (target === `https://api.github.com/repos/${REPO}`) {
        entry.answered = "repository";
        return Response.json({ owner: { login: "pps-e2e" }, name: "agents", private: false, default_branch: "main", html_url: `https://github.com/${REPO}` });
      }
      if (target === `https://api.github.com/repos/${REPO}/branches/main`) { entry.answered = `branch ${current}`; return Response.json({ commit: { sha: rev(current) } }); }
      if (target.startsWith(`https://codeload.github.com/${REPO}/tar.gz/`)) {
        const requested = target.slice(target.lastIndexOf("/") + 1);
        if (unavailable.has(requested)) { entry.answered = `404 ${parseInt(requested, 16)}`; return new Response("Not Found", { status: 404 }); }
        entry.answered = `archive ${parseInt(requested, 16)}`;
        return new Response(await fs.readFile(path.join(base, `agents-${requested}.tar.gz`)));
      }
      throw new Error(`Unexpected GitHub request: ${target}`);
    });
    const warn = console.warn;
    vi.spyOn(console, "warn").mockImplementation((...args: unknown[]) => { warnings.push(args.map(String).join(" ")); warn(...args); });
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });
    await startServer();
    await vi.advanceTimersByTimeAsync(2 * FIRST_TICK_DELAY_MS); // the first tick: nothing imported yet
  }, 120_000);

  afterAll(async () => {
    if (app) await app.close();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
    setGitHubRateLimitGateForTests(null);
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService, UpdateAutomationSettingsService]) owner.resetInstance();
    appConfigProvider.resetForTests();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env.PERSONAL_SETTINGS_E2E_EVIDENCE_DIR;
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "package-personal-settings.json"), `${JSON.stringify({ ...evidence, requests }, null, 2)}\n`);
    }
    if (base) await fs.rm(base, { recursive: true, force: true });
  });

  it("API-02 (AC-002 by click, REQ-003, REQ-005): personal edits made in the app go to personal-settings.json, never the package files, and survive an update", async () => {
    phase = "import";
    const imported = (await gql(docs.IMPORT_AGENT_PACKAGE!, { input: { sourceKind: "GITHUB_REPOSITORY", source: `https://github.com/${REPO}` } }))
      .importAgentPackage.find((row: Rec) => row.sourceKind === "GITHUB_REPOSITORY");
    packageId = imported.packageId;
    installDir = imported.path;
    expect(await agent("writer")).toMatchObject({ toolNames: ["read_file", "write_file"], skillNames: ["design"], personalSettings: [], personalSettingsBase: "PACKAGE" });
    const filesBefore = await treeHashes(installDir);

    // The editors send full values; the server stores differences from the package.
    phase = "personal-edits";
    const saved = (await gql(docs.UpdateAgentDefinition!, { input: { id: "writer", toolNames: ["read_file", "generate_image"], skillNames: ["design", "review"],
      avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH } })).updateAgentDefinition;
    expect(saved).toMatchObject({ toolNames: ["read_file", "generate_image"], skillNames: ["design", "review"], avatarUrl: AVATAR,
      defaultLaunchConfig: { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.6-luna" } });
    expect([...saved.personalSettings].sort()).toEqual(["AVATAR", "DEFAULT_LAUNCH_CONFIG", "SKILLS", "TOOLS"]);
    const crew = await team("crew");
    await gql(docs.UpdateAgentTeamDefinition!, { input: { id: "crew", expectedRevision: crew.revision, avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH } });
    expect(await readSettings()).toEqual({
      "agent:writer": { toolsAdded: ["generate_image"], toolsRemoved: ["write_file"], skillsAdded: ["review"], avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH },
      "agent_team:crew": { avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH },
    });
    expect(await treeHashes(installDir)).toEqual(filesBefore); // no package file written

    // Update to revision 2 by click: the author added tool_r2.
    await writeUpstream(2);
    const settingsBytes = await fs.readFile(settingsFile(), "utf8");
    phase = "update-click";
    const mark = requests.length;
    expect((await update()).updateInfo).toMatchObject({ status: "UP_TO_DATE", installedRevision: rev(2) });
    expect(since(mark).filter((line) => line.includes("codeload"))).toEqual([
      `GET https://codeload.github.com/${REPO}/tar.gz/${rev(1)} → archive 1`, `GET https://codeload.github.com/${REPO}/tar.gz/${rev(2)} → archive 2`,
    ]);
    expect(await fs.readFile(settingsFile(), "utf8")).toBe(settingsBytes); // REQ-005: the update never changed it
    expect(await backups()).toEqual([]); // nothing was edited in the package files
    const writer = await agent("writer");
    expect(writer).toMatchObject({ toolNames: ["read_file", "tool_r2", "generate_image"], skillNames: ["design", "review"], avatarUrl: AVATAR,
      instructions: expect.stringContaining("revision 2") });
    expect(await team("crew")).toMatchObject({ avatarUrl: AVATAR, defaultLaunchConfig: { runtimeKind: "codex_app_server" }, instructions: expect.stringContaining("revision 2") });
    expect(JSON.parse(await fs.readFile(path.join(installDir, "agents", "writer", "agent-config.json"), "utf8")).toolNames).toEqual(["read_file", "write_file", "tool_r2"]);
    evidence.api02 = { settings: await readSettings(), writer };
  }, 120_000);

  it("API-03 (AC-003): edits made inside the package files are captured into personal settings and the changed files are backed up", async () => {
    await editInstalledConfig("reviewer", (config) => ({ ...config, toolNames: ["write_file", "search_web"], avatarUrl: "/rest/files/images/file-edit.png",
      defaultLaunchConfig: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-fake-sonnet", llmConfig: null } }));
    await fs.appendFile(path.join(installDir, "agents", "reviewer", "agent.md"), "\nLOCAL INSTRUCTIONS EDIT\n");
    // writer already has a personal avatar: a file avatar does not overwrite it; its added tool is merged.
    await editInstalledConfig("writer", (config) => ({ ...config, toolNames: [...config.toolNames, "mcp_local"], avatarUrl: "/rest/files/images/stale.png" }));
    await writeUpstream(3);
    phase = "update-click-with-file-edits";
    expect((await update()).updateInfo).toMatchObject({ status: "UP_TO_DATE", installedRevision: rev(3) });

    expect(await readSettings()).toEqual({
      "agent:writer": { toolsAdded: ["generate_image", "mcp_local"], toolsRemoved: ["write_file"], skillsAdded: ["review"], avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH },
      "agent:reviewer": { toolsAdded: ["search_web"], toolsRemoved: ["read_file"], avatarUrl: "/rest/files/images/file-edit.png",
        defaultLaunchConfig: { runtimeKind: "claude_agent_sdk", llmModelIdentifier: "claude-fake-sonnet", llmConfig: null } },
      "agent_team:crew": { avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH },
    });
    const [backup] = await backups();
    expect(backup).toMatch(/^\d{8}T\d{6}Z/);
    const saved = await treeHashes(path.join(backupsDir(), backup!));
    expect(Object.keys(saved)).toEqual(["agents/reviewer/agent-config.json", "agents/reviewer/agent.md", "agents/writer/agent-config.json"]);
    expect(await fs.readFile(path.join(backupsDir(), backup!, "agents", "reviewer", "agent.md"), "utf8")).toContain("LOCAL INSTRUCTIONS EDIT");
    // The package content is revision 3; the effective values carry the captured edits.
    expect(await fs.readFile(path.join(installDir, "agents", "reviewer", "agent.md"), "utf8")).not.toContain("LOCAL INSTRUCTIONS EDIT");
    expect(await agent("reviewer")).toMatchObject({ toolNames: ["write_file", "search_web"], avatarUrl: "/rest/files/images/file-edit.png",
      defaultLaunchConfig: { runtimeKind: "claude_agent_sdk" }, instructions: expect.stringContaining("revision 3") });
    expect((await agent("writer")).toolNames).toEqual(["read_file", "tool_r2", "tool_r3", "generate_image", "mcp_local"]);
    expect((await agent("writer")).avatarUrl).toBe(AVATAR);
    evidence.api03 = { settings: await readSettings(), backup, backupFiles: Object.keys(saved) };
  }, 120_000);

  it("API-04 (AC-002/AC-003 automatic): the automatic update pass captures and backs up the same way", async () => {
    await gql(docs.SET_AUTOMATIC_UPDATES!, { kind: "AGENT_PACKAGE", enabled: true });
    await editInstalledConfig("reviewer", (config) => ({ ...config, toolNames: [...config.toolNames, "list_tabs"] }));
    await writeUpstream(4);
    phase = "automatic-pass";
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await notification())?.outcome === "AUTO_UPDATED", "updated automatically");
    expect(await notification()).toMatchObject({ handledRevision: rev(4), outcome: "AUTO_UPDATED" });
    expect((await readSettings())["agent:reviewer"].toolsAdded).toEqual(["search_web", "list_tabs"]);
    expect(await backups()).toHaveLength(2);
    expect((await agent("reviewer")).toolNames).toEqual(["write_file", "search_web", "list_tabs"]);
    expect((await agent("writer")).toolNames).toEqual(["read_file", "tool_r2", "tool_r3", "tool_r4", "generate_image", "mcp_local"]);
    await gql(docs.SET_AUTOMATIC_UPDATES!, { kind: "AGENT_PACKAGE", enabled: false });
  }, 120_000);

  it("API-06 (DEC-008): repeated updates with edits keep the latest 5 backups", async () => {
    const before = await backups();
    for (const n of [5, 6, 7, 8]) {
      await editInstalledConfig("reviewer", (config) => ({ ...config, toolNames: [...config.toolNames, `mine_${n}`] }));
      await writeUpstream(n);
      phase = `update-click-${n}`;
      vi.setSystemTime(Date.now() + MINUTE); // a later backup time
      expect((await update()).updateInfo).toMatchObject({ installedRevision: rev(n) });
    }
    const after = await backups();
    expect(after).toHaveLength(5);
    expect(after).not.toContain(before[0]); // the oldest was removed
    expect(after).toContain(before[1]);
    expect((await readSettings())["agent:reviewer"].toolsAdded).toEqual(["search_web", "list_tabs", "mine_5", "mine_6", "mine_7", "mine_8"]);
    evidence.api06 = { before, after };
  }, 180_000);

  it("API-05 (AC-004): when the installed revision cannot be downloaded the update stops and nothing changes, by click and automatically", async () => {
    await editInstalledConfig("reviewer", (config) => ({ ...config, toolNames: [...config.toolNames, "not_captured"] }));
    const files = await treeHashes(installDir);
    const settingsBytes = await fs.readFile(settingsFile(), "utf8");
    const backupsBefore = await backups();
    unavailable.add(rev(8));
    await writeUpstream(9);
    phase = "update-click-installed-unavailable";
    const mark = requests.length;
    const refused = await graphqlRaw(docs.UPDATE_AGENT_PACKAGE!, { packageId });
    expect(refused.errors?.[0]?.message).toBeTruthy();
    expect(since(mark).filter((line) => line.includes("codeload"))).toEqual([`GET https://codeload.github.com/${REPO}/tar.gz/${rev(8)} → 404 8`]);
    expect((await packageRow()).updateInfo).toMatchObject({ status: "UPDATE_FAILED", installedRevision: rev(8) });
    expect(await treeHashes(installDir)).toEqual(files);
    expect(await fs.readFile(settingsFile(), "utf8")).toBe(settingsBytes);
    expect(await backups()).toEqual(backupsBefore);

    await gql(docs.SET_AUTOMATIC_UPDATES!, { kind: "AGENT_PACKAGE", enabled: true });
    phase = "automatic-installed-unavailable";
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await notification())?.outcome === "AUTO_FAILED", "automatic update failed");
    expect(await notification()).toMatchObject({ state: "WAITING", latestRevision: rev(9), outcome: "AUTO_FAILED" });
    expect(await treeHashes(installDir)).toEqual(files);
    expect(await fs.readFile(settingsFile(), "utf8")).toBe(settingsBytes);
    expect(await backups()).toEqual(backupsBefore);
    evidence.api05 = { refused: refused.errors?.[0]?.message, notification: await notification() };
    await gql(docs.SET_AUTOMATIC_UPDATES!, { kind: "AGENT_PACKAGE", enabled: false });
  }, 120_000);

  it("API-07 (AC-005): reset removes one personal field and the package's value shows again", async () => {
    const reset = (await gql(docs.ResetAgentPersonalSetting!, { definitionId: "writer", setting: "TOOLS" })).resetAgentPersonalSetting;
    expect(reset.toolNames).toEqual(["read_file", "write_file", "tool_r2", "tool_r3", "tool_r4", "tool_r5", "tool_r6", "tool_r7", "tool_r8"]);
    expect([...reset.personalSettings].sort()).toEqual(["AVATAR", "DEFAULT_LAUNCH_CONFIG", "SKILLS"]);
    const crew = (await gql(docs.ResetAgentTeamPersonalSetting!, { definitionId: "crew", setting: "AVATAR" })).resetAgentTeamPersonalSetting;
    expect(crew).toMatchObject({ avatarUrl: null, personalSettings: ["DEFAULT_LAUNCH_CONFIG"] });
    const settings = await readSettings();
    expect(settings["agent:writer"]).toEqual({ skillsAdded: ["review"], avatarUrl: AVATAR, defaultLaunchConfig: LAUNCH });
    expect(settings["agent_team:crew"]).toEqual({ defaultLaunchConfig: LAUNCH });
  }, 60_000);

  it("API-08 (AC-007): an unreadable personal-settings.json gives the package's values, is kept, and is copied aside before the next save", async () => {
    await fs.writeFile(settingsFile(), "{not json");
    await restart();
    expect(await agent("writer")).toMatchObject({ toolNames: ["read_file", "write_file", "tool_r2", "tool_r3", "tool_r4", "tool_r5", "tool_r6", "tool_r7", "tool_r8"],
      skillNames: ["design"], personalSettings: [] });
    expect(warnings.some((line) => line.startsWith(`PERSONAL_SETTINGS_FILE_UNREADABLE:${settingsFile()}`))).toBe(true);
    expect(await fs.readFile(settingsFile(), "utf8")).toBe("{not json");

    await gql(docs.UpdateAgentDefinition!, { input: { id: "writer", toolNames: ["read_file", "write_file", "tool_r2", "tool_r3", "tool_r4", "tool_r5", "tool_r6", "tool_r7", "tool_r8", "after_restart"] } });
    const kept = (await fs.readdir(path.dirname(settingsFile()))).filter((name) => name.startsWith("personal-settings.json.unreadable-"));
    expect(kept).toHaveLength(1);
    expect(await fs.readFile(path.join(path.dirname(settingsFile()), kept[0]!), "utf8")).toBe("{not json");
    expect(await readSettings()).toEqual({ "agent:writer": { toolsAdded: ["after_restart"] } });
    evidence.api08 = { kept };
  }, 120_000);
});
