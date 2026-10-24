import "reflect-metadata";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import type { FastifyInstance } from "fastify";
import WebSocket from "ws";
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
import { UpdateNotificationChangeMessageSchema } from "../../../src/update-notifications/changes/update-notification-change-messages.js";
import { AUTO_UPDATE_SETTING_KEYS, UPDATE_CHECK_INTERVAL_SETTING_KEYS, UPDATE_CHECKS_SETTING_KEY } from "../../../src/update-notifications/domain/settings.js";
import { FIRST_TICK_DELAY_MS, TICK_INTERVAL_MS } from "../../../src/update-notifications/services/update-check-scheduler.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { headReadRepository, headReadResponse } from "../helpers/github-head-read-stub.js";

// Update notifications and automatic updates at the real server/wire boundary (settings-update-notifications, revised
// for update-checks-and-auto-updates SR-005): the Studio HTTP/GraphQL server and its `/ws/update-notifications` feed,
// the real composition, scheduler (its own timer) and update pass, both GitHub source owners and their update
// pipelines, the GitHub transport with its `api`/`web` gate, the notification store and the renderer's own GraphQL
// documents. Only GitHub HTTP is controlled: the REST metadata imports use (`api.github.com`), the quota-free head read
// checks and updates use (`POST github.com/<o>/<r>.git/git-upload-pack`) and the archives (`codeload.github.com`).
// Time moves with Vitest's fake clock (`setTimeout`/`Date`, advancing with real time): the first tick (60 s plus up to
// 60 s), the one-minute tick, and each kind's interval plus this process's spreading delay (at most 5 min).
// A "restart" closes the server, drops every process singleton and the settings read from the data root (as a new
// process would) and starts a new server on the same data root; each start builds the GraphQL schema again (type-graphql
// 2.0.0-rc.4 rebuilds its params cache on every build; rc.3 shifted multi-argument resolvers' arguments from the second).
// This node is not the desktop's embedded node, so it has no agent-runtime kind (AR-005); the runtime kind is
// covered by `agent-runtime-update-notifications.e2e.test.ts`.
// Cases (API/E2E ticket IDs of update-checks-and-auto-updates): API-02 due pass, API-03 restart, API-04 newer revision
// and offline, API-05 manual update and Clear, API-06 Update checks off, API-08 automatic package update, API-09
// automatic skill-source update with local changes, API-10 automatic failure, API-11 intervals, API-07 GitHub's web
// gate, API-12 a 209 gate file, API-17 unreadable skill registry, API-18 removal. Run ungated with a clean environment:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/update-notifications/update-notifications-live.e2e.test.ts --no-watch
// UPDATE_NOTIFICATIONS_E2E_EVIDENCE_DIR keeps a JSON receipt of the GitHub requests and feed frames.

type Frame = { type: string };
type Feed = { socket: WebSocket; frames: Frame[] };
type Notification = { kind: string; sourceId: string; name: string; repositoryUrl: string | null; defaultBranch: string | null;
  installedRevision: string; latestRevision: string; foundAt: string; read: boolean; state: string;
  handledRevision: string | null; handledAt: string | null; outcome: string | null; outcomeReason: string | null; outcomeAt: string | null };
type GitHubRequest = { url: string; method: string; host: string; phase: string; answered: string };

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
/** A 30-minute kind is due at its last check + 30 min + its spreading delay (< 5 min). */
const DUE_AFTER_DEFAULT = 36 * MINUTE;
const rev = (char: string) => char.repeat(40);
const PACKAGE_REPO = "un-e2e/agents";
const SKILL_REPO = "un-e2e/skills";
const SETTING_KEYS = [UPDATE_CHECKS_SETTING_KEY, ...Object.values(UPDATE_CHECK_INTERVAL_SETTING_KEYS), ...Object.values(AUTO_UPDATE_SETTING_KEYS)];
const headReadUrl = (repo: string) => `POST https://github.com/${repo}.git/git-upload-pack`;

// The renderer's actual documents (gql template text with its fragments inlined).
const loadDocuments = async (file: string): Promise<Record<string, string>> => {
  const source = await fs.readFile(new URL(`../../../../autobyteus-web/graphql/${file}`, import.meta.url), "utf8");
  const templates = Object.fromEntries([...source.matchAll(/export const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1]!, m[2]!]));
  return Object.fromEntries(Object.entries(templates).map(([key, body]) =>
    [key, body.replace(/\$\{(\w+)\}/g, (_all, name: string) => templates[name] ?? "")]));
};

describe("Update notifications and automatic updates at the real server boundary (controlled GitHub, real scheduler and pass)", () => {
  let base = "", dataDir = "", app: FastifyInstance | undefined, url!: URL;
  const upstream: Record<string, { revision: string; dir: string; valid: boolean }> = {};
  const requests: GitHubRequest[] = [];
  const allRaw: string[] = [];
  const sockets: WebSocket[] = [];
  const evidence: Record<string, unknown> = {};
  let phase = "setup";
  let offline = false;
  /** When set, the head read answers GitHub's throttling (503 with retry-after, in seconds). */
  let webThrottleSeconds: number | null = null;
  let docs: Record<string, string> = {};
  let packageId = "", skillSourceId = "";
  const savedEnv = new Map<string, string | undefined>();

  const graphqlRaw = async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    return await response.json() as { data?: any; errors?: Array<{ message: string; extensions?: Record<string, unknown> }> };
  };
  const gql = async (query: string, variables?: Record<string, unknown>): Promise<any> => {
    const body = await graphqlRaw(query, variables);
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const notifications = async (): Promise<Notification[]> => (await gql(docs.GET_UPDATE_NOTIFICATIONS!)).updateNotifications;
  const record = async (kind: string) => (await notifications()).find((row) => row.kind === kind);
  const settings = async () => (await gql(docs.GET_UPDATE_AUTOMATION_SETTINGS!)).updateAutomationSettings;
  const setAutomatic = (kind: string, enabled: boolean) => gql(docs.SET_AUTOMATIC_UPDATES!, { kind, enabled });
  const packageRow = async () => (await gql(docs.GET_AGENT_PACKAGES!)).agentPackages.find((row: any) => row.packageId === packageId);
  const skillRow = async () => (await gql(docs.GET_SKILL_SOURCES!)).skillSources.find((row: any) => row.sourceId === skillSourceId);
  const since = (mark: number) => requests.slice(mark);
  const describeRequests = (list: GitHubRequest[]) => list.map((entry) => `${entry.method} ${entry.url}`);
  const until = async (check: () => Promise<boolean> | boolean, label: string, timeoutMs = 15_000) => {
    const started = Date.now();
    while (!(await check())) {
      if (Date.now() - started > timeoutMs) throw new Error(`${label}: not met within ${timeoutMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, 25));
    }
  };
  /** Moves the clock: the wall time by `jumpMs` (nothing fires), then the timers by `advanceMs` (due timers fire). */
  const passTime = async (input: { jumpMs?: number; advanceMs: number }) => {
    if (input.jumpMs) vi.setSystemTime(Date.now() + input.jumpMs);
    await vi.advanceTimersByTimeAsync(input.advanceMs);
  };
  /** The next one-minute tick. */
  const nextTick = (jumpMs?: number) => passTime({ jumpMs, advanceMs: TICK_INTERVAL_MS });
  /** The first tick after a (re)start: 60 s plus up to 60 s. */
  const firstTick = () => passTime({ advanceMs: 2 * FIRST_TICK_DELAY_MS });
  /** Lets a pass that a timer started run to its end (each GitHub answer is local, so a pass takes well under a second). */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 1000));
  const openFeed = async (): Promise<Feed> => {
    const socket = new WebSocket(`ws://${url.host}/ws/update-notifications`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => { const text = String(raw); allRaw.push(text); frames.push(JSON.parse(text)); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "connected"), "feed connected");
    return { socket, frames };
  };
  const framesOf = (feed: Feed, type: string) => feed.frames.filter((frame) => frame.type === type).length;

  const writeUpstream = async (repo: string, revision: string, valid = true) => {
    const dir = upstream[repo]!.dir;
    await fs.rm(dir, { recursive: true, force: true });
    await fs.mkdir(dir, { recursive: true });
    if (repo === PACKAGE_REPO) {
      if (valid) {
        await fs.mkdir(path.join(dir, "agents", "un-e2e-agent"), { recursive: true });
        await fs.writeFile(path.join(dir, "agents", "un-e2e-agent", "agent.md"),
          `---\nname: UN E2E Agent\ndescription: Update notifications fixture\n---\n\nRevision ${revision.slice(0, 7)}.\n`);
        await fs.writeFile(path.join(dir, "agents", "un-e2e-agent", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
      } else {
        await fs.writeFile(path.join(dir, "README.md"), "Not an agent package.\n"); // no agents/, agent-teams/ or applications/
      }
    } else {
      await fs.writeFile(path.join(dir, "SKILL.md"), `---\nname: un-e2e-writer\ndescription: Update notifications fixture\n---\nRevision ${revision.slice(0, 7)}.\n`);
    }
    upstream[repo] = { ...upstream[repo]!, revision, valid };
  };

  const startServer = async () => {
    appConfigProvider.resetForTests();
    appConfigProvider.config.setCustomAppDataDir(dataDir);
    const started = await startStudioE2eRuntimeServer();
    app = started.fastify; url = started.mainUrl;
  };
  /** A new process: the server closes (composition, scheduler, feed), every singleton is dropped, a new server starts. */
  const restart = async () => {
    for (const socket of sockets.splice(0)) socket.terminate();
    await app?.close();
    app = undefined;
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService, UpdateAutomationSettingsService]) {
      owner.resetInstance();
    }
    setGitHubRateLimitGateForTests(null);
    for (const key of SETTING_KEYS) delete process.env[key]; // a new process reads its settings from the data root only
    await startServer();
  };

  beforeAll(async () => {
    docs = { ...(await loadDocuments("updateNotifications.ts")), ...(await loadDocuments("agentPackages.ts")), ...(await loadDocuments("skillSources.ts")) };
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "update-notifications-e2e-")));
    dataDir = path.join(base, "server-data");
    await fs.mkdir(path.join(dataDir, "skills"), { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    // API-12: a gate file written by 209 ({ blockedUntil }) reads as not blocked (Discard or Rebuild).
    await fs.mkdir(path.join(dataDir, "github"), { recursive: true });
    await fs.writeFile(path.join(dataDir, "github", "rate-limit.json"), JSON.stringify({ blockedUntil: new Date(Date.now() + 24 * HOUR).toISOString() }));
    for (const key of ["AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS", "AUTOBYTEUS_DESKTOP_EMBEDDED_NODE", ...SETTING_KEYS]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    upstream[PACKAGE_REPO] = { revision: "", dir: path.join(base, "upstream-agents", "wrapper"), valid: true };
    upstream[SKILL_REPO] = { revision: "", dir: path.join(base, "upstream-skills", "wrapper"), valid: true };
    await writeUpstream(PACKAGE_REPO, rev("a"));
    await writeUpstream(SKILL_REPO, rev("a"));

    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const host = new URL(target).hostname;
      if (!["api.github.com", "codeload.github.com", "github.com"].includes(host)) return realFetch(input as never, init);
      const entry: GitHubRequest = { url: target, method: (init?.method ?? "GET").toUpperCase(), host, phase, answered: "" };
      requests.push(entry);
      if (offline) { entry.answered = "offline"; throw new TypeError("fetch failed (controlled offline)"); }
      const headRead = headReadRepository(target, init);
      if (headRead) {
        const repo = [PACKAGE_REPO, SKILL_REPO].find((name) => name === headRead);
        if (!repo) throw new Error(`Unexpected head read: ${target}`);
        expect(String(init?.body)).toContain("command=ls-refs");
        if (webThrottleSeconds !== null) {
          entry.answered = "503 throttled";
          return new Response("Service Unavailable", { status: 503, headers: { "retry-after": String(webThrottleSeconds) } });
        }
        entry.answered = `head ${upstream[repo]!.revision.slice(0, 7)}`;
        return headReadResponse(upstream[repo]!.revision);
      }
      const repo = [PACKAGE_REPO, SKILL_REPO].find((name) => target.includes(`/${name}`));
      if (!repo) throw new Error(`Unexpected GitHub request: ${target}`);
      const [owner, name] = repo.split("/");
      if (target === `https://api.github.com/repos/${repo}`) {
        entry.answered = "repository";
        return Response.json({ owner: { login: owner }, name, private: false, default_branch: "main", html_url: `https://github.com/${repo}` });
      }
      if (target === `https://api.github.com/repos/${repo}/branches/main`) {
        entry.answered = `branch ${upstream[repo]!.revision.slice(0, 7)}`;
        return Response.json({ commit: { sha: upstream[repo]!.revision } });
      }
      if (target.startsWith(`https://codeload.github.com/${repo}/tar.gz/`)) {
        expect(target).toContain(upstream[repo]!.revision);
        entry.answered = `archive ${upstream[repo]!.revision.slice(0, 7)}`;
        const archive = path.join(base, `${name}-${upstream[repo]!.revision.slice(0, 7)}.tar.gz`);
        await create({ gzip: true, file: archive, cwd: path.dirname(upstream[repo]!.dir), portable: true }, ["wrapper"]);
        return new Response(await fs.readFile(archive));
      }
      throw new Error(`Unexpected GitHub request: ${target}`);
    });
    // The scheduler's timer and the clock are fake from the first server start, so its first tick is ours to move.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });
    await startServer();
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    if (app) await app.close();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setGitHubRateLimitGateForTests(null);
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService, UpdateAutomationSettingsService]) {
      owner.resetInstance();
    }
    appConfigProvider.resetForTests();
    for (const [key, value] of savedEnv) { if (value === undefined) delete process.env[key]; else process.env[key] = value; }
    const dir = process.env.UPDATE_NOTIFICATIONS_E2E_EVIDENCE_DIR;
    if (dir) {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "update-notifications-live.json"), `${JSON.stringify({ ...evidence, requests, frames: allRaw }, null, 2)}\n`);
    }
    if (base) await fs.rm(base, { recursive: true, force: true });
    // Strict feed contract: every frame any connection received matches the server schema.
    expect(allRaw.filter((raw) => !UpdateNotificationChangeMessageSchema.safeParse(JSON.parse(raw)).success)).toEqual([]);
  });

  it("API-02, API-12 (AC-001, AC-005, AC-022 node side, REQ-002): a due source is checked with one quota-free head read; nothing is updated; open windows are told", async () => {
    // Defaults: 30/30/60 minutes, every automatic switch off; not the desktop's embedded node; the 209 gate file blocks nothing.
    expect(await settings()).toMatchObject({ intervals: { agentPackages: 30, skillSources: 30, agentRuntimes: 60 },
      automaticUpdates: { agentPackages: false, skillSources: false, agentRuntimes: false }, githubWaitUntil: null, desktopEmbeddedNode: false });

    phase = "import";
    const imported = (await gql(docs.IMPORT_AGENT_PACKAGE!, { input: { sourceKind: "GITHUB_REPOSITORY", source: `https://github.com/${PACKAGE_REPO}` } }))
      .importAgentPackage.find((row: any) => row.sourceKind === "GITHUB_REPOSITORY");
    packageId = imported.packageId;
    expect(imported.updateInfo).toMatchObject({ installedRevision: rev("a"), status: "UP_TO_DATE" });
    const skill = (await gql(docs.IMPORT_GITHUB_SKILL_SOURCE!, { repositoryUrl: `https://github.com/${SKILL_REPO}` }))
      .importGitHubSkillSource.sources.find((row: any) => row.github);
    skillSourceId = skill.sourceId;
    expect(skill.github).toMatchObject({ installedRevision: rev("a"), status: "UP_TO_DATE" });
    // Imports keep the REST metadata (identity and visibility): two REST requests and the archive per source.
    expect(since(0).filter((entry) => entry.host === "api.github.com")).toHaveLength(4);
    const installedAgentFile = path.join(imported.path, "agents", "un-e2e-agent", "agent.md");

    await writeUpstream(PACKAGE_REPO, rev("b"));
    await writeUpstream(SKILL_REPO, rev("b"));
    const feed = await openFeed();

    // The first tick (60–120 s after start): both sources were checked by their import moments ago, so nothing is due.
    phase = "first-tick";
    let mark = requests.length;
    await firstTick();
    await settle();
    expect(since(mark)).toEqual([]);
    expect(await notifications()).toEqual([]);

    // 36 minutes later (30 + the spreading delay) the next tick checks both, packages first, one head read each.
    phase = "due-pass";
    mark = requests.length;
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await notifications()).length === 2, "two notifications after the due pass");
    const pass = since(mark);
    expect(describeRequests(pass)).toEqual([headReadUrl(PACKAGE_REPO), headReadUrl(SKILL_REPO)]);
    expect(pass.some((entry) => entry.host === "api.github.com" || entry.host === "codeload.github.com")).toBe(false);
    const rows = await notifications();
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "AGENT_PACKAGE", sourceId: packageId, repositoryUrl: `https://github.com/${PACKAGE_REPO}`,
        installedRevision: rev("a"), latestRevision: rev("b"), read: false, state: "WAITING", outcome: null }),
      expect.objectContaining({ kind: "SKILL_SOURCE", sourceId: skillSourceId, installedRevision: rev("a"), latestRevision: rev("b"), read: false, state: "WAITING", outcome: null }),
    ]));
    expect(rows.some((row) => row.kind === "AGENT_RUNTIME")).toBe(false);
    await until(() => framesOf(feed, "update_notifications_changed") >= 1, "update_notifications_changed frame");
    expect(await fs.readFile(installedAgentFile, "utf8")).toContain("Revision aaaaaaa");
    expect((await packageRow()).updateInfo).toMatchObject({ status: "UPDATE_AVAILABLE", latestRevision: rev("b"), canUpdate: true });
    expect((await settings()).githubWaitUntil).toBeNull();
    evidence.api02 = { notifications: rows, passRequests: pass };
  }, 60_000);

  it("API-03 (RUS-001, 209 REQ-010): read state survives a restart, and a restart inside the interval makes no automatic request", async () => {
    phase = "mark-read";
    const read = (await gql(docs.MARK_UPDATE_NOTIFICATIONS_READ!)).markUpdateNotificationsRead as Notification[];
    expect(read.map((row) => row.read)).toEqual([true, true]);
    await restart();
    phase = "restart-first-tick";
    const feed = await openFeed();
    const mark = requests.length;
    await firstTick();
    await settle();
    expect(since(mark)).toEqual([]);
    const rows = await notifications();
    expect(rows.every((row) => row.read && row.state === "WAITING" && row.latestRevision === rev("b"))).toBe(true);
    expect(feed.frames[0]).toEqual({ type: "connected" });
  }, 60_000);

  it("API-04 (209 AC-008, AC-012): a newer revision replaces the same notification as unread; an offline pass keeps it and the row's Update", async () => {
    await writeUpstream(PACKAGE_REPO, rev("c"));
    phase = "on-open-check";
    let mark = requests.length;
    await gql(docs.CHECK_AGENT_PACKAGE_UPDATES!, { packageIds: null });
    expect(describeRequests(since(mark))).toEqual([headReadUrl(PACKAGE_REPO)]);
    await until(async () => (await record("AGENT_PACKAGE"))?.latestRevision === rev("c"), "package record replaced");
    let rows = await notifications();
    expect(rows.filter((row) => row.kind === "AGENT_PACKAGE")).toEqual([
      expect.objectContaining({ installedRevision: rev("a"), latestRevision: rev("c"), read: false, state: "WAITING" }),
    ]);

    offline = true;
    phase = "offline-pass";
    mark = requests.length;
    const before = JSON.stringify(await notifications());
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await packageRow()).updateInfo.status === "CHECK_FAILED" && (await skillRow()).github.status === "CHECK_FAILED", "both checks failed");
    await settle();
    offline = false;
    expect(since(mark).map((entry) => `${entry.method} ${entry.host} ${entry.answered}`)).toEqual(["POST github.com offline", "POST github.com offline"]);
    rows = await notifications();
    expect(JSON.stringify(rows)).toBe(before);
    expect((await packageRow()).updateInfo).toMatchObject({ status: "CHECK_FAILED", latestRevision: rev("c"), canUpdate: true });
  }, 60_000);

  it("API-05 (209 AC-005, AC-009, AC-011): a manual Update marks the notification handled with no outcome; Clear removes only handled ones; both survive a restart", async () => {
    const refused = await graphqlRaw(docs.CLEAR_UPDATE_NOTIFICATION!, { kind: "SKILL_SOURCE", sourceId: skillSourceId });
    expect(refused.errors?.[0]?.message).toBe("Only an updated notification can be cleared.");

    phase = "user-update-package";
    const updated = (await gql(docs.UPDATE_AGENT_PACKAGE!, { packageId })).updateAgentPackage.find((row: any) => row.packageId === packageId);
    expect(updated.updateInfo).toMatchObject({ status: "UP_TO_DATE", installedRevision: rev("c") });
    expect(await fs.readFile(path.join(updated.path, "agents", "un-e2e-agent", "agent.md"), "utf8")).toContain("Revision ccccccc");
    phase = "user-update-skill";
    await gql(docs.UPDATE_GITHUB_SKILL_SOURCE!, { sourceId: skillSourceId });
    await until(async () => (await record("AGENT_PACKAGE"))?.state === "HANDLED" && (await record("SKILL_SOURCE"))?.state === "HANDLED", "both handled");
    expect(await notifications()).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "AGENT_PACKAGE", handledRevision: rev("c"), outcome: null }),
      expect.objectContaining({ kind: "SKILL_SOURCE", handledRevision: rev("b"), outcome: null }),
    ]));
    // Archives only for the imports and the two Update presses.
    expect(requests.filter((entry) => entry.host === "codeload.github.com").map((entry) => entry.phase))
      .toEqual(["import", "import", "user-update-package", "user-update-skill"]);

    const cleared = (await gql(docs.CLEAR_UPDATE_NOTIFICATION!, { kind: "AGENT_PACKAGE", sourceId: packageId })).clearUpdateNotification as Notification[];
    expect(cleared.map((row) => row.kind)).toEqual(["SKILL_SOURCE"]);
    await restart();
    expect(await notifications()).toEqual([expect.objectContaining({ kind: "SKILL_SOURCE", state: "HANDLED", handledRevision: rev("b") })]);
  }, 60_000);

  it("API-06 (AC-017, AC-005, 209 AC-015): Update checks off stops checks and automatic updates even with the switches on, also after a restart; manual checks still notify", async () => {
    await setAutomatic("AGENT_PACKAGE", true);
    await setAutomatic("SKILL_SOURCE", true);
    await gql(docs.SET_UPDATE_CHECKS_ENABLED!, { enabled: false });
    await writeUpstream(PACKAGE_REPO, rev("d"));
    await writeUpstream(SKILL_REPO, rev("c"));

    phase = "checks-off";
    let mark = requests.length;
    await nextTick(DUE_AFTER_DEFAULT);
    await settle();
    expect(since(mark)).toEqual([]);
    await restart();
    expect((await gql(docs.GET_UPDATE_CHECKS_CAPABILITY!)).updateChecksCapability).toMatchObject({ enabled: false, source: "SERVER_SETTING" });
    expect((await settings()).automaticUpdates).toMatchObject({ agentPackages: true, skillSources: true });
    await firstTick();
    await nextTick();
    await settle();
    expect(since(mark)).toEqual([]);

    // Opening Agent Packages still checks and notifies; with checks off the found update is not applied.
    phase = "on-open-check-checks-off";
    await gql(docs.CHECK_AGENT_PACKAGE_UPDATES!, { packageIds: null });
    await until(async () => (await record("AGENT_PACKAGE"))?.state === "WAITING", "manual check notifies");
    await nextTick();
    await settle();
    expect(describeRequests(since(mark))).toEqual([headReadUrl(PACKAGE_REPO)]);
    expect(await record("AGENT_PACKAGE")).toMatchObject({ state: "WAITING", latestRevision: rev("d"), outcome: null });

    // The switches off again and checks on: the next tick only checks and notifies (the default behavior).
    await setAutomatic("AGENT_PACKAGE", false);
    await setAutomatic("SKILL_SOURCE", false);
    await gql(docs.SET_UPDATE_CHECKS_ENABLED!, { enabled: true });
    phase = "checks-on";
    mark = requests.length;
    await nextTick();
    await until(async () => (await record("SKILL_SOURCE"))?.state === "WAITING", "skill notified");
    await settle();
    expect(describeRequests(since(mark))).toEqual([headReadUrl(SKILL_REPO)]); // the package was just checked by hand
    expect(requests.some((entry) => entry.host === "codeload.github.com" && entry.phase.startsWith("checks"))).toBe(false);
  }, 60_000);

  it("API-08 (AC-010, AC-006, REQ-008): switching packages on while an update waits applies it at the next tick through the pipeline, recorded as updated automatically", async () => {
    const feed = await openFeed();
    const settingsFrames = framesOf(feed, "update_settings_changed");
    phase = "automatic-packages";
    const mark = requests.length;
    await setAutomatic("AGENT_PACKAGE", true);
    await until(() => framesOf(feed, "update_settings_changed") > settingsFrames, "update_settings_changed frame");
    await nextTick();
    await until(async () => (await record("AGENT_PACKAGE"))?.outcome === "AUTO_UPDATED", "updated automatically");
    const row = (await record("AGENT_PACKAGE"))!;
    expect(row).toMatchObject({ state: "HANDLED", handledRevision: rev("d"), read: false, outcome: "AUTO_UPDATED", outcomeReason: null });
    // The owner's own update: a head read, then the archive.
    expect(describeRequests(since(mark).filter((entry) => entry.url.includes(PACKAGE_REPO)))).toEqual([
      headReadUrl(PACKAGE_REPO), `GET https://codeload.github.com/${PACKAGE_REPO}/tar.gz/${rev("d")}`,
    ]);
    expect(await fs.readFile(path.join((await packageRow()).path, "agents", "un-e2e-agent", "agent.md"), "utf8")).toContain("Revision ddddddd");
    // Seen in the panel: read; the outcome stays.
    await gql(docs.MARK_UPDATE_NOTIFICATIONS_READ!);
    expect(await record("AGENT_PACKAGE")).toMatchObject({ read: true, outcome: "AUTO_UPDATED" });
    evidence.api08 = { record: row };
  }, 60_000);

  it("API-09 (AC-007, AC-008b, DEC-019): with skill sources on, local edits and added files are replaced by GitHub's revision, without a confirmation", async () => {
    const root = (await skillRow()).path as string;
    await fs.appendFile(path.join(root, "SKILL.md"), "\nLOCAL EDIT\n");
    await fs.writeFile(path.join(root, "LOCAL-ADDED.txt"), "added locally\n");
    phase = "automatic-skills";
    await setAutomatic("SKILL_SOURCE", true);
    await nextTick();
    await until(async () => (await record("SKILL_SOURCE"))?.outcome === "AUTO_UPDATED", "skill updated automatically");
    expect(await record("SKILL_SOURCE")).toMatchObject({ state: "HANDLED", handledRevision: rev("c"), read: false });
    const after = (await skillRow()).path as string;
    const skillText = await fs.readFile(path.join(after, "SKILL.md"), "utf8");
    expect(skillText).toContain("Revision ccccccc");
    expect(skillText).not.toContain("LOCAL EDIT");
    await expect(fs.access(path.join(after, "LOCAL-ADDED.txt"))).rejects.toThrow();
  }, 60_000);

  it("API-10 (AC-009, REQ-009): a failing automatic update leaves the package unchanged, is notified once per revision and retried at most once per interval", async () => {
    await writeUpstream(PACKAGE_REPO, rev("e"), false);
    phase = "automatic-failure";
    let mark = requests.length;
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await record("AGENT_PACKAGE"))?.outcome === "AUTO_FAILED", "automatic update failed");
    const failed = (await record("AGENT_PACKAGE"))!;
    expect(failed).toMatchObject({ state: "WAITING", latestRevision: rev("e"), read: false, outcome: "AUTO_FAILED" });
    expect(failed.outcomeReason).toMatch(/at least one directory/);
    expect(await fs.readFile(path.join((await packageRow()).path, "agents", "un-e2e-agent", "agent.md"), "utf8")).toContain("Revision ddddddd");
    expect(since(mark).filter((entry) => entry.host === "codeload.github.com")).toHaveLength(1);
    await gql(docs.MARK_UPDATE_NOTIFICATIONS_READ!);

    // Next ticks within the interval: no retry, nothing unread again.
    phase = "automatic-failure-no-retry";
    mark = requests.length;
    await nextTick();
    await nextTick(10 * MINUTE);
    await settle();
    expect(since(mark).filter((entry) => entry.url.includes(PACKAGE_REPO))).toEqual([]);
    expect(await record("AGENT_PACKAGE")).toMatchObject({ outcome: "AUTO_FAILED", read: true, outcomeAt: failed.outcomeAt });

    // After the interval: checked again and retried once; the same revision fails again but stays read (one notice per revision).
    phase = "automatic-failure-retry";
    mark = requests.length;
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await record("AGENT_PACKAGE"))?.outcomeAt !== failed.outcomeAt, "retried once");
    await settle();
    expect(since(mark).filter((entry) => entry.host === "codeload.github.com")).toHaveLength(1);
    expect(await record("AGENT_PACKAGE")).toMatchObject({ outcome: "AUTO_FAILED", read: true, latestRevision: rev("e") });
    evidence.api10 = { failed, retried: await record("AGENT_PACKAGE") };
  }, 60_000);

  it("API-11 (AC-002 server side, REQ-001): intervals outside 15 min..24 h are refused; a shorter interval applies to the next pass of its kind only", async () => {
    for (const minutes of [14, 1441]) {
      const refused = await graphqlRaw(docs.SET_UPDATE_CHECK_INTERVAL!, { kind: "AGENT_PACKAGE", minutes });
      expect(refused.errors?.[0]).toMatchObject({ message: "Enter a whole number from 15 minutes to 24 hours.", extensions: { code: "UPDATE_CHECK_INTERVAL_OUT_OF_RANGE" } });
    }
    await setAutomatic("AGENT_PACKAGE", false);
    await setAutomatic("SKILL_SOURCE", false);
    expect((await gql(docs.SET_UPDATE_CHECK_INTERVAL!, { kind: "AGENT_PACKAGE", minutes: 15 })).setUpdateCheckInterval.intervals)
      .toMatchObject({ agentPackages: 15, skillSources: 30 });
    // 19 minutes later (15 + at most 3 of spreading): the package is due, the 30-minute skill source is not.
    phase = "short-interval";
    const mark = requests.length;
    await nextTick(19 * MINUTE);
    await settle();
    expect(describeRequests(since(mark))).toEqual([headReadUrl(PACKAGE_REPO)]);
    await gql(docs.SET_UPDATE_CHECK_INTERVAL!, { kind: "AGENT_PACKAGE", minutes: 30 });
  }, 60_000);

  it("API-07 (AC-004 server side, REQ-004, QR-003): GitHub's throttling of the head read stops the pass and every later request until its time, also after a restart; the card's wait time is reported", async () => {
    await writeUpstream(PACKAGE_REPO, rev("f"));
    await writeUpstream(SKILL_REPO, rev("d"));
    webThrottleSeconds = 3600;
    phase = "throttled-pass";
    let mark = requests.length;
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await packageRow()).updateInfo.status === "CHECK_FAILED", "package check failed on the throttle");
    await settle();
    // The first answer was GitHub's throttle: the pass stopped there and never asked about the skill source.
    expect(since(mark).map((entry) => `${entry.method} ${entry.url} → ${entry.answered}`)).toEqual([`${headReadUrl(PACKAGE_REPO)} → 503 throttled`]);
    expect((await packageRow()).updateInfo.lastError).toMatch(/GitHub rate limit reached; try again after \d\d:\d\d\./);
    const gateFile = JSON.parse(await fs.readFile(path.join(dataDir, "github", "rate-limit.json"), "utf8"));
    expect(gateFile.api).toBeNull();
    const resetAt = Date.parse(gateFile.web);
    expect(resetAt).toBeGreaterThan(Date.now() + 59 * MINUTE);
    expect((await settings()).githubWaitUntil).toBe(gateFile.web);

    // GitHub would answer again now, but the node must not ask before the time: a manual check fails at once.
    webThrottleSeconds = null;
    phase = "manual-check-while-throttled";
    mark = requests.length;
    expect(JSON.stringify(await graphqlRaw(docs.CHECK_GITHUB_SKILL_SOURCES!, { sourceIds: [skillSourceId] }))).toMatch(/GitHub rate limit reached/);
    expect(since(mark)).toEqual([]);

    await restart();
    phase = "restart-while-throttled";
    await firstTick();
    await nextTick(DUE_AFTER_DEFAULT);
    await settle();
    expect(since(mark)).toEqual([]);
    expect((await settings()).githubWaitUntil).toBe(gateFile.web);

    // After the time the next tick checks what is due again.
    vi.setSystemTime(resetAt + MINUTE);
    phase = "after-throttle";
    await nextTick(DUE_AFTER_DEFAULT);
    await until(async () => (await record("SKILL_SOURCE"))?.latestRevision === rev("d"), "skill notified after the wait");
    await settle();
    expect(describeRequests(since(mark))).toEqual([headReadUrl(PACKAGE_REPO), headReadUrl(SKILL_REPO)]);
    expect((await settings()).githubWaitUntil).toBeNull();
    evidence.api07 = { gateFile, notifications: await notifications() };
  }, 60_000);

  it("API-17 (209 CR-001, QR-005): an unreadable skill-source registry at start leaves the server and the package notification working", async () => {
    const registry = path.join(dataDir, "skill-sources", "github", "registry.json");
    const good = await fs.readFile(registry, "utf8");
    await fs.writeFile(registry, "{not json");
    await restart();
    expect((await notifications()).map((row) => row.kind)).toEqual(["AGENT_PACKAGE"]);
    expect((await gql(docs.GET_SKILL_SOURCES!)).skillSourceRegistryError).toBeTruthy();
    await fs.writeFile(registry, good);
    await restart();
    expect(await record("SKILL_SOURCE")).toMatchObject({ state: "WAITING", latestRevision: rev("d") });
  }, 60_000);

  it("API-18 (209 AC-011): removing a source removes its notification", async () => {
    phase = "remove";
    await gql(docs.REMOVE_AGENT_PACKAGE!, { packageId });
    await gql(docs.REMOVE_GITHUB_SKILL_SOURCE!, { sourceId: skillSourceId });
    await until(async () => (await notifications()).length === 0, "records removed with their sources");
    expect(JSON.parse(await fs.readFile(path.join(dataDir, "update-notifications", "notifications.json"), "utf8"))).toEqual([]);
  }, 60_000);
});
