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
import { setGitHubRateLimitGateForTests } from "../../../src/integrations/github/github-rate-limit-gate.js";
import { UpdateNotificationChangeMessageSchema } from "../../../src/update-notifications/changes/update-notification-change-messages.js";
import { CHECK_INTERVAL_MS, INITIAL_DELAY_MS, TICK_INTERVAL_MS } from "../../../src/update-notifications/services/update-check-scheduler.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";

// settings-update-notifications at the real server/wire boundary: the Studio HTTP/GraphQL server and its
// `/ws/update-notifications` feed, the real composition and background scheduler (its own timer), both source
// owners, the GitHub transport with its rate-limit gate, the notification store and the renderer's own GraphQL
// documents. Only GitHub HTTP (`api.github.com`, `codeload.github.com`) is controlled, and time is moved with
// Vitest's fake clock (`setTimeout`/`Date`, advancing with real time) so 60 s / 30 min / 6 h pass at once.
// A "restart" closes the server, drops every process singleton (as a new process would) and starts a new server
// on the same data root. The GraphQL schema is built once per test process: type-graphql 2.0.0-rc.3 appends every
// `@Arg` to its params cache again on each `buildSchema()` (`MetadataStorage.initCache`), so a second build in one
// process shifts multi-argument resolvers' arguments (`clearUpdateNotification` received `kind` as `sourceId`).
// A real restart is a new process and builds it once, like this suite.
// Cases (API/E2E ticket IDs): API-02 background pass, API-03 restart, API-04 newer revision + offline,
// API-05 update/handled/Clear, API-06 setting off/on, API-07 rate limit, API-17 unreadable skill registry,
// API-18 removal. Run ungated with a clean environment:
//   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
//     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/update-notifications --no-watch
// UPDATE_NOTIFICATIONS_E2E_EVIDENCE_DIR keeps a JSON receipt of the GitHub requests and feed frames.

vi.mock("../../../src/api/graphql/schema.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/api/graphql/schema.js")>();
  let built: ReturnType<typeof actual.buildGraphqlSchema> | null = null;
  return { ...actual, buildGraphqlSchema: () => (built ??= actual.buildGraphqlSchema()) };
});

type Frame = { type: string };
type Feed = { socket: WebSocket; frames: Frame[] };
type Notification = { kind: string; sourceId: string; name: string; repositoryUrl: string; defaultBranch: string;
  installedRevision: string; latestRevision: string; foundAt: string; read: boolean; state: string;
  handledRevision: string | null; handledAt: string | null };
type GitHubRequest = { url: string; host: string; phase: string; answered: string };

const HOUR = 3_600_000;
const rev = (char: string) => char.repeat(40);
const PACKAGE_REPO = "un-e2e/agents";
const SKILL_REPO = "un-e2e/skills";

// The renderer's actual documents (gql template text with its fragments inlined).
const loadDocuments = async (file: string): Promise<Record<string, string>> => {
  const source = await fs.readFile(new URL(`../../../../autobyteus-web/graphql/${file}`, import.meta.url), "utf8");
  const templates = Object.fromEntries([...source.matchAll(/export const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1]!, m[2]!]));
  return Object.fromEntries(Object.entries(templates).map(([key, body]) =>
    [key, body.replace(/\$\{(\w+)\}/g, (_all, name: string) => templates[name] ?? "")]));
};

describe("Update notifications at the real server boundary (controlled GitHub, real scheduler)", () => {
  let base = "", dataDir = "", app: FastifyInstance | undefined, url!: URL;
  const upstream: Record<string, { revision: string; dir: string }> = {};
  const requests: GitHubRequest[] = [];
  const allRaw: string[] = [];
  const sockets: WebSocket[] = [];
  const evidence: Record<string, unknown> = {};
  let phase = "setup";
  let offline = false;
  let rateLimitResetSeconds: number | null = null;
  let docs: Record<string, string> = {};
  let packageId = "", skillSourceId = "";
  const savedEnv = new Map<string, string | undefined>();

  const graphqlRaw = async (query: string, variables?: Record<string, unknown>) => {
    const response = await fetch(new URL("/graphql", url), { method: "POST",
      headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }) });
    return await response.json() as { data?: any; errors?: Array<{ message: string }> };
  };
  const gql = async (query: string, variables?: Record<string, unknown>): Promise<any> => {
    const body = await graphqlRaw(query, variables);
    if (!body.data || body.errors?.length) throw new Error(JSON.stringify(body.errors ?? body));
    return body.data;
  };
  const notifications = async (): Promise<Notification[]> => (await gql(docs.GET_UPDATE_NOTIFICATIONS!)).updateNotifications;
  const packageRow = async () => (await gql(docs.GET_AGENT_PACKAGES!)).agentPackages.find((row: any) => row.packageId === packageId);
  const skillRow = async () => (await gql(docs.GET_SKILL_SOURCES!)).skillSources.find((row: any) => row.sourceId === skillSourceId);
  const since = (mark: number) => requests.slice(mark);
  const until = async (check: () => Promise<boolean> | boolean, label: string, timeoutMs = 10_000) => {
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
  /** Lets a pass that a timer started run to its end (each GitHub answer is local, so a pass takes milliseconds). */
  const settle = () => new Promise((resolve) => setTimeout(resolve, 750));
  const openFeed = async (): Promise<Feed> => {
    const socket = new WebSocket(`ws://${url.host}/ws/update-notifications`);
    sockets.push(socket);
    const frames: Frame[] = [];
    socket.on("message", (raw: unknown) => { const text = String(raw); allRaw.push(text); frames.push(JSON.parse(text)); });
    await new Promise<void>((resolve, reject) => { socket.once("open", resolve); socket.once("error", reject); });
    await until(() => frames.some((frame) => frame.type === "connected"), "feed connected");
    return { socket, frames };
  };
  const changedFrames = (feed: Feed) => feed.frames.filter((frame) => frame.type === "update_notifications_changed").length;

  const writeUpstream = async (repo: string, revision: string) => {
    const dir = upstream[repo]!.dir;
    await fs.rm(dir, { recursive: true, force: true });
    if (repo === PACKAGE_REPO) {
      await fs.mkdir(path.join(dir, "agents", "un-e2e-agent"), { recursive: true });
      await fs.writeFile(path.join(dir, "agents", "un-e2e-agent", "agent.md"),
        `---\nname: UN E2E Agent\ndescription: Update notifications fixture\n---\n\nRevision ${revision.slice(0, 7)}.\n`);
      await fs.writeFile(path.join(dir, "agents", "un-e2e-agent", "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
    } else {
      await fs.mkdir(dir, { recursive: true });
      await fs.writeFile(path.join(dir, "SKILL.md"), `---\nname: un-e2e-writer\ndescription: Update notifications fixture\n---\nRevision ${revision.slice(0, 7)}.\n`);
    }
    upstream[repo]!.revision = revision;
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
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService]) {
      owner.resetInstance();
    }
    setGitHubRateLimitGateForTests(null);
    delete process.env.ENABLE_UPDATE_CHECKS; // a new process reads the setting from the data root only
    await startServer();
  };

  beforeAll(async () => {
    docs = { ...(await loadDocuments("updateNotifications.ts")), ...(await loadDocuments("agentPackages.ts")), ...(await loadDocuments("skillSources.ts")) };
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "update-notifications-e2e-")));
    dataDir = path.join(base, "server-data");
    await fs.mkdir(path.join(dataDir, "skills"), { recursive: true });
    await fs.writeFile(path.join(dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    for (const key of ["AUTOBYTEUS_AGENT_PACKAGE_ROOTS", "AUTOBYTEUS_SKILLS_PATHS", "AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS", "ENABLE_UPDATE_CHECKS"]) {
      savedEnv.set(key, process.env[key]);
      delete process.env[key];
    }
    upstream[PACKAGE_REPO] = { revision: "", dir: path.join(base, "upstream-agents", "wrapper") };
    upstream[SKILL_REPO] = { revision: "", dir: path.join(base, "upstream-skills", "wrapper") };
    await writeUpstream(PACKAGE_REPO, rev("a"));
    await writeUpstream(SKILL_REPO, rev("a"));

    const realFetch = globalThis.fetch;
    vi.stubGlobal("fetch", async (input: string | URL | Request, init?: RequestInit) => {
      const target = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
      const host = new URL(target).hostname;
      if (host !== "api.github.com" && host !== "codeload.github.com") return realFetch(input as never, init);
      const entry: GitHubRequest = { url: target, host, phase, answered: "" };
      requests.push(entry);
      if (offline) { entry.answered = "offline"; throw new TypeError("fetch failed (controlled offline)"); }
      if (host === "api.github.com" && rateLimitResetSeconds !== null) {
        entry.answered = "403 rate limited";
        return new Response(JSON.stringify({ message: "API rate limit exceeded" }), { status: 403,
          headers: { "x-ratelimit-remaining": "0", "x-ratelimit-reset": String(rateLimitResetSeconds) } });
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
    // The scheduler's timer and the clock are fake from the first server start, so its 60 s first pass is ours to move.
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });
    await startServer();
  }, 120_000);

  afterAll(async () => {
    for (const socket of sockets) socket.terminate();
    if (app) await app.close();
    vi.useRealTimers();
    vi.unstubAllGlobals();
    setGitHubRateLimitGateForTests(null);
    for (const owner of [AgentPackageService, SkillSourceService, SkillService, UpdateNotificationService, UpdateChecksCapabilityService]) {
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

  it("API-02 (AC-001, AC-004, AC-014, AC-017, AC-021): the background pass finds both updates through the real chain, downloads nothing and tells open windows", async () => {
    phase = "import";
    const imported = (await gql(docs.IMPORT_AGENT_PACKAGE!, { input: { sourceKind: "GITHUB_REPOSITORY", source: `https://github.com/${PACKAGE_REPO}` } }))
      .importAgentPackage.find((row: any) => row.sourceKind === "GITHUB_REPOSITORY");
    packageId = imported.packageId;
    expect(imported.updateInfo).toMatchObject({ installedRevision: rev("a"), status: "UP_TO_DATE" });
    const skill = (await gql(docs.IMPORT_GITHUB_SKILL_SOURCE!, { repositoryUrl: `https://github.com/${SKILL_REPO}` }))
      .importGitHubSkillSource.sources.find((row: any) => row.github);
    skillSourceId = skill.sourceId;
    expect(skill.github).toMatchObject({ installedRevision: rev("a"), status: "UP_TO_DATE" });
    const installedAgentFile = path.join(imported.path, "agents", "un-e2e-agent", "agent.md");
    expect(await fs.readFile(installedAgentFile, "utf8")).toContain("Revision aaaaaaa");

    await writeUpstream(PACKAGE_REPO, rev("b"));
    await writeUpstream(SKILL_REPO, rev("b"));
    const feed = await openFeed();

    // First pass, 60 s after start: both sources were checked by their import moments ago, so nothing is due.
    phase = "background-first-pass";
    let mark = requests.length;
    await passTime({ advanceMs: INITIAL_DELAY_MS });
    await settle();
    expect(since(mark)).toEqual([]);
    expect(await notifications()).toEqual([]);

    // Six hours later the next tick checks both, one at a time, packages first.
    phase = "background-due-pass";
    mark = requests.length;
    await passTime({ jumpMs: CHECK_INTERVAL_MS, advanceMs: TICK_INTERVAL_MS });
    await until(async () => (await notifications()).length === 2, "two notifications after the due pass");
    const pass = since(mark);
    expect(pass.map((entry) => entry.url)).toEqual([
      `https://api.github.com/repos/${PACKAGE_REPO}`, `https://api.github.com/repos/${PACKAGE_REPO}/branches/main`,
      `https://api.github.com/repos/${SKILL_REPO}`, `https://api.github.com/repos/${SKILL_REPO}/branches/main`,
    ]);
    expect(pass.every((entry) => entry.host === "api.github.com")).toBe(true); // no archive download, no other host
    const rows = await notifications();
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "AGENT_PACKAGE", sourceId: packageId, repositoryUrl: `https://github.com/${PACKAGE_REPO}`,
        defaultBranch: "main", installedRevision: rev("a"), latestRevision: rev("b"), read: false, state: "WAITING", handledRevision: null }),
      expect.objectContaining({ kind: "SKILL_SOURCE", sourceId: skillSourceId, repositoryUrl: `https://github.com/${SKILL_REPO}`,
        installedRevision: rev("a"), latestRevision: rev("b"), read: false, state: "WAITING" }),
    ]));
    expect(rows.every((row) => row.name.length > 0 && !Number.isNaN(Date.parse(row.foundAt)))).toBe(true);
    // The open window was told without a reload; nothing changed on disk; the rows offer Update.
    await until(() => changedFrames(feed) >= 1, "update_notifications_changed frame");
    expect(await fs.readFile(installedAgentFile, "utf8")).toContain("Revision aaaaaaa");
    expect((await packageRow()).updateInfo).toMatchObject({ status: "UPDATE_AVAILABLE", installedRevision: rev("a"), latestRevision: rev("b"), canUpdate: true });
    expect((await skillRow()).github).toMatchObject({ status: "UPDATE_AVAILABLE", installedRevision: rev("a"), latestRevision: rev("b") });
    evidence.api02 = { notifications: rows, passRequests: pass, changedFrames: changedFrames(feed) };
  }, 60_000);

  it("API-03 (AC-009, AC-010, AC-014): read state survives a restart, and a restart inside 6 hours makes no automatic request", async () => {
    phase = "mark-read";
    const read = (await gql(docs.MARK_UPDATE_NOTIFICATIONS_READ!)).markUpdateNotificationsRead as Notification[];
    expect(read.map((row) => row.read)).toEqual([true, true]);
    // No dismiss or skip exists in the contract (REQ-009).
    const mutations = (await gql(`{ __schema { mutationType { fields { name } } } }`)).__schema.mutationType.fields.map((f: any) => f.name);
    expect(mutations.filter((name: string) => /notification/i.test(name)).sort()).toEqual(["clearUpdateNotification", "markUpdateNotificationsRead"]);

    await restart();
    phase = "restart-first-pass";
    const feed = await openFeed();
    const mark = requests.length;
    await passTime({ advanceMs: INITIAL_DELAY_MS });
    await settle();
    expect(since(mark)).toEqual([]);
    const rows = await notifications();
    expect(rows).toHaveLength(2);
    expect(rows.every((row) => row.read && row.state === "WAITING" && row.latestRevision === rev("b"))).toBe(true);
    expect(feed.frames[0]).toEqual({ type: "connected" });
    evidence.api03 = { afterRestart: rows };
  }, 60_000);

  it("API-04 (AC-008, AC-012): a newer revision replaces the same notification as unread; an offline pass keeps it and the row's Update", async () => {
    // The user opens Agent Packages (its on-open check) after upstream moved again.
    await writeUpstream(PACKAGE_REPO, rev("c"));
    phase = "on-open-check";
    await gql(docs.CHECK_AGENT_PACKAGE_UPDATES!, { packageIds: null });
    await until(async () => (await notifications()).some((row) => row.kind === "AGENT_PACKAGE" && row.latestRevision === rev("c")), "package record replaced");
    let rows = await notifications();
    expect(rows.filter((row) => row.kind === "AGENT_PACKAGE")).toEqual([
      expect.objectContaining({ sourceId: packageId, installedRevision: rev("a"), latestRevision: rev("c"), read: false, state: "WAITING" }),
    ]);
    expect(rows.find((row) => row.kind === "SKILL_SOURCE")).toMatchObject({ latestRevision: rev("b"), read: true });

    // Network off; six hours later the background pass fails quietly for both.
    offline = true;
    phase = "background-offline-pass";
    const mark = requests.length;
    const before = JSON.stringify(rows);
    await passTime({ jumpMs: CHECK_INTERVAL_MS, advanceMs: TICK_INTERVAL_MS });
    await until(async () => (await packageRow()).updateInfo.status === "CHECK_FAILED" && (await skillRow()).github.status === "CHECK_FAILED", "both checks failed");
    await settle();
    offline = false;
    expect(since(mark).map((entry) => entry.answered)).toEqual(["offline", "offline"]);
    rows = await notifications();
    expect(JSON.stringify(rows)).toBe(before); // nothing removed, added or changed
    expect((await packageRow()).updateInfo).toMatchObject({ status: "CHECK_FAILED", latestRevision: rev("c"), canUpdate: true });
    expect((await skillRow()).github).toMatchObject({ status: "CHECK_FAILED", latestRevision: rev("b"), installedRevision: rev("a") });
    evidence.api04 = { afterOffline: rows, offlineRequests: since(mark) };
  }, 60_000);

  it("API-05 (AC-005, AC-009, AC-011, AC-017): Update marks the notification handled, Clear removes only handled ones, and both survive a restart", async () => {
    // A waiting notification cannot be cleared.
    const refused = await graphqlRaw(docs.CLEAR_UPDATE_NOTIFICATION!, { kind: "SKILL_SOURCE", sourceId: skillSourceId });
    expect(refused.errors?.[0]?.message).toBe("Only an updated notification can be cleared.");

    phase = "user-update-package";
    const updated = (await gql(docs.UPDATE_AGENT_PACKAGE!, { packageId })).updateAgentPackage.find((row: any) => row.packageId === packageId);
    expect(updated.updateInfo).toMatchObject({ status: "UP_TO_DATE", installedRevision: rev("c") });
    expect(await fs.readFile(path.join(updated.path, "agents", "un-e2e-agent", "agent.md"), "utf8")).toContain("Revision ccccccc");
    await until(async () => (await notifications()).find((row) => row.kind === "AGENT_PACKAGE")?.state === "HANDLED", "package handled");

    phase = "user-update-skill";
    const skill = (await gql(docs.UPDATE_GITHUB_SKILL_SOURCE!, { sourceId: skillSourceId })).updateGitHubSkillSource.sources
      .find((row: any) => row.sourceId === skillSourceId);
    expect(skill.github).toMatchObject({ status: "UP_TO_DATE", installedRevision: rev("b") });
    await until(async () => (await notifications()).find((row) => row.kind === "SKILL_SOURCE")?.state === "HANDLED", "skill handled");
    let rows = await notifications();
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ kind: "AGENT_PACKAGE", state: "HANDLED", handledRevision: rev("c") }),
      expect.objectContaining({ kind: "SKILL_SOURCE", state: "HANDLED", handledRevision: rev("b") }),
    ]));
    // Archives were downloaded only for the import and the two Update presses.
    expect(requests.filter((entry) => entry.host === "codeload.github.com").map((entry) => entry.phase))
      .toEqual(["import", "import", "user-update-package", "user-update-skill"]);

    const cleared = (await gql(docs.CLEAR_UPDATE_NOTIFICATION!, { kind: "AGENT_PACKAGE", sourceId: packageId })).clearUpdateNotification as Notification[];
    expect(cleared.map((row) => row.kind)).toEqual(["SKILL_SOURCE"]);
    await restart();
    rows = await notifications();
    expect(rows).toEqual([expect.objectContaining({ kind: "SKILL_SOURCE", state: "HANDLED", handledRevision: rev("b") })]);
    evidence.api05 = { afterRestart: rows };
  }, 60_000);

  it("API-06 (AC-015): with Update checks off there is no automatic request, also after a restart; manual checks still notify; on again resumes", async () => {
    expect((await gql(docs.GET_UPDATE_CHECKS_CAPABILITY!)).updateChecksCapability).toMatchObject({ enabled: true, source: "DEFAULT_ENABLED" });
    await gql(docs.SET_UPDATE_CHECKS_ENABLED!, { enabled: false });
    await writeUpstream(PACKAGE_REPO, rev("d"));
    await writeUpstream(SKILL_REPO, rev("c"));

    phase = "background-setting-off";
    let mark = requests.length;
    await passTime({ jumpMs: CHECK_INTERVAL_MS, advanceMs: TICK_INTERVAL_MS });
    await settle();
    expect(since(mark)).toEqual([]);
    await restart();
    expect((await gql(docs.GET_UPDATE_CHECKS_CAPABILITY!)).updateChecksCapability).toMatchObject({ enabled: false, source: "SERVER_SETTING" });
    await passTime({ advanceMs: INITIAL_DELAY_MS });
    await passTime({ advanceMs: TICK_INTERVAL_MS });
    await settle();
    expect(since(mark)).toEqual([]);
    // The existing notification stayed.
    expect((await notifications()).map((row) => row.kind)).toEqual(["SKILL_SOURCE"]);

    // Opening Agent Packages still checks and still creates its notification.
    phase = "on-open-check-setting-off";
    await gql(docs.CHECK_AGENT_PACKAGE_UPDATES!, { packageIds: null });
    await until(async () => (await notifications()).some((row) => row.kind === "AGENT_PACKAGE" && row.state === "WAITING"), "manual check notifies");
    expect(since(mark).map((entry) => entry.phase)).toEqual(["on-open-check-setting-off", "on-open-check-setting-off"]);

    // On again: the next tick checks what is due (the skill source; the package was just checked by hand).
    await gql(docs.SET_UPDATE_CHECKS_ENABLED!, { enabled: true });
    phase = "background-setting-on";
    mark = requests.length;
    await passTime({ advanceMs: TICK_INTERVAL_MS });
    await until(async () => (await notifications()).some((row) => row.kind === "SKILL_SOURCE" && row.state === "WAITING" && row.latestRevision === rev("c")), "skill notified again");
    expect(since(mark).map((entry) => entry.url)).toEqual([`https://api.github.com/repos/${SKILL_REPO}`, `https://api.github.com/repos/${SKILL_REPO}/branches/main`]);
    evidence.api06 = { notifications: await notifications() };
  }, 60_000);

  it("API-07 (AC-013): a rate-limited answer stops the pass; nothing is requested before the reset, also after a restart; checks resume after it", async () => {
    await writeUpstream(PACKAGE_REPO, rev("e"));
    await writeUpstream(SKILL_REPO, rev("d"));
    vi.setSystemTime(Date.now() + CHECK_INTERVAL_MS);
    const resetAt = Date.now() + HOUR;
    rateLimitResetSeconds = Math.floor(resetAt / 1000);

    phase = "background-rate-limited";
    let mark = requests.length;
    await passTime({ advanceMs: TICK_INTERVAL_MS });
    await until(async () => (await packageRow()).updateInfo.status === "CHECK_FAILED", "package check failed on the limit");
    await settle();
    // The first answer was the limit: the pass stopped there and never asked about the skill source.
    expect(since(mark).map((entry) => `${entry.url} → ${entry.answered}`)).toEqual([`https://api.github.com/repos/${PACKAGE_REPO} → 403 rate limited`]);
    expect((await packageRow()).updateInfo.lastError).toMatch(/GitHub rate limit reached; try again after \d\d:\d\d\./);
    const gateFile = JSON.parse(await fs.readFile(path.join(dataDir, "github", "rate-limit.json"), "utf8"));
    expect(Date.parse(gateFile.blockedUntil)).toBe(rateLimitResetSeconds * 1000);

    // GitHub would answer again now, but the node must not ask before the reset: a manual check fails at once.
    rateLimitResetSeconds = null;
    phase = "manual-check-while-limited";
    mark = requests.length;
    const manual = await graphqlRaw(docs.CHECK_GITHUB_SKILL_SOURCES!, { sourceIds: [skillSourceId] });
    expect(JSON.stringify(manual)).toMatch(/GitHub rate limit reached/);
    expect(since(mark)).toEqual([]);

    // A restart before the reset keeps the stop.
    await restart();
    phase = "restart-while-limited";
    await passTime({ advanceMs: INITIAL_DELAY_MS });
    await settle();
    expect(since(mark)).toEqual([]);

    // After the reset nothing is due yet: the limited package check and the refused manual skill check both count
    // as checks (REQ-002; the design's "a failed check counts as a check").
    vi.setSystemTime(resetAt + 60_000);
    phase = "background-after-reset";
    await passTime({ advanceMs: TICK_INTERVAL_MS });
    await settle();
    expect(since(mark)).toEqual([]);
    // Six hours later both are due again and are checked, packages first; both notifications move to the newest revisions.
    await passTime({ jumpMs: CHECK_INTERVAL_MS, advanceMs: TICK_INTERVAL_MS });
    await until(async () => (await notifications()).filter((row) => row.state === "WAITING" && row.read === false
      && row.latestRevision === (row.kind === "AGENT_PACKAGE" ? rev("e") : rev("d"))).length === 2, "both notified after the reset");
    expect(since(mark).map((entry) => entry.url)).toEqual([
      `https://api.github.com/repos/${PACKAGE_REPO}`, `https://api.github.com/repos/${PACKAGE_REPO}/branches/main`,
      `https://api.github.com/repos/${SKILL_REPO}`, `https://api.github.com/repos/${SKILL_REPO}/branches/main`,
    ]);
    evidence.api07 = { gateFile, notifications: await notifications() };
  }, 60_000);

  it("API-17 (CR-001, QR-005): an unreadable skill-source registry at start leaves the server and the package notification working", async () => {
    const registry = path.join(dataDir, "skill-sources", "github", "registry.json");
    const good = await fs.readFile(registry, "utf8");
    await fs.writeFile(registry, "{not json");
    await restart();
    const rows = await notifications();
    expect(rows.map((row) => row.kind)).toEqual(["AGENT_PACKAGE"]);
    expect((await gql(docs.GET_SKILL_SOURCES!)).skillSourceRegistryError).toBeTruthy();
    // Fixed registry: the hidden skill record is listed again with its state kept.
    await fs.writeFile(registry, good);
    await restart();
    expect((await notifications()).find((row) => row.kind === "SKILL_SOURCE")).toMatchObject({ state: "WAITING", latestRevision: rev("d"), read: false });
    evidence.api17 = { whileUnreadable: rows };
  }, 60_000);

  it("API-18 (AC-011): removing a source removes its notification", async () => {
    phase = "remove";
    await gql(docs.REMOVE_AGENT_PACKAGE!, { packageId });
    await gql(docs.REMOVE_GITHUB_SKILL_SOURCE!, { sourceId: skillSourceId });
    await until(async () => (await notifications()).length === 0, "records removed with their sources");
    const stored = JSON.parse(await fs.readFile(path.join(dataDir, "update-notifications", "notifications.json"), "utf8"));
    expect(stored).toEqual([]);
  }, 60_000);
});
