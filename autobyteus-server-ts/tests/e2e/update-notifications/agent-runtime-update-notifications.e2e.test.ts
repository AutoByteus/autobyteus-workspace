/**
 * Agent-runtime update notifications and automatic runtime updates on the desktop's embedded node
 * (update-checks-and-auto-updates SR-005: REQ-020..REQ-022, AC-018..AC-020).
 *
 * Real studio server over HTTP and its `/ws/update-notifications` feed, the real composition, scheduler and update pass,
 * `AgentRuntimeStatusService` with its strategies and vendor processes, the notification service and store, and the
 * renderer's GraphQL documents. The runtime CLIs are the scripted `tests/fixtures/agent-runtimes-fake-cli.mjs` (Codex's
 * app-server keeps each turn running, so a started agent stays live); the vendors' newest-version sources are
 * controlled inside the test process (`installVendorSourceStub`). No model, no account, no network. The node is the
 * desktop's embedded node (`AUTOBYTEUS_DESKTOP_EMBEDDED_NODE=1`, read once, so it is set before any server module
 * loads). Time moves with Vitest's fake clock (`setTimeout`/`Date`, advancing with real time); the clock is only ever
 * advanced to the next tick, never past it, because vendor commands' timeouts run on the same clock.
 * Cases (API/E2E IDs): API-20 background check (AC-018), API-21 the panel's runtime Update (AC-019), API-22 automatic
 * runtime update waiting for running agents (AC-020).
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/update-notifications/agent-runtime-update-notifications.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { FIRST_TICK_DELAY_MS, TICK_INTERVAL_MS } from "../../../src/update-notifications/services/update-check-scheduler.js";
import { startStudioE2eRuntimeServer } from "../helpers/studio-runtime-test-server.js";
import { createGraphqlClient, fakeRuntimeState, installVendorSourceStub, type AgentRuntimeRow } from "../helpers/agent-runtimes-e2e-harness.js";

const fake = await vi.hoisted(async () => {
  process.env.AUTOBYTEUS_DESKTOP_EMBEDDED_NODE = "1";
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  // Grok is not installed: a runtime that is not installed gets no notification.
  return prepareFakeRuntimes({ label: "agent-runtime-update-notifications-e2e", grokInstalled: false });
});

const MINUTE = 60_000;
/** The runtime kind's default interval (60 min); the spreading delay is 0 here (see beforeAll). */
const RUNTIME_DUE_AFTER = 61 * MINUTE;
const CODEX = "codex_app_server";
const CLAUDE = "claude_agent_sdk";
const AGY = "antigravity_cli";
const MODEL = "gpt-5.6-luna";

type Notification = { kind: string; sourceId: string; name: string; repositoryUrl: string | null; defaultBranch: string | null;
  installedRevision: string; latestRevision: string; read: boolean; state: string; handledRevision: string | null;
  outcome: string | null; outcomeReason: string | null; outcomeAt: string | null };

const loadDocuments = (file: string): Record<string, string> => {
  const source = fs.readFileSync(new URL(`../../../../autobyteus-web/graphql/${file}`, import.meta.url), "utf8");
  const templates = Object.fromEntries([...source.matchAll(/export const (\w+) = gql`([\s\S]*?)`/g)].map((m) => [m[1]!, m[2]!]));
  return Object.fromEntries(Object.entries(templates).map(([key, body]) =>
    [key, body.replace(/\$\{(\w+)\}/g, (_all, name: string) => templates[name] ?? "")]));
};

describe("Agent-runtime update notifications and automatic runtime updates (real studio server, embedded node, scripted CLIs)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  const docs = loadDocuments("updateNotifications.ts");
  const workspace = path.join(fake.dataDir, "workspace");
  let fastify: FastifyInstance;
  let url: URL;
  let sources: ReturnType<typeof installVendorSourceStub>;
  let client: ReturnType<typeof createGraphqlClient>;
  let agentDefinitionId = "";
  const evidence: Record<string, unknown> = {};

  const gql = async (query: string, variables?: Record<string, unknown>) => {
    const result = await client.post(query, variables);
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
    return result.data;
  };
  const notifications = async (): Promise<Notification[]> => (await gql(docs.GET_UPDATE_NOTIFICATIONS!)).updateNotifications;
  const runtimeRecord = async (kind: string) => (await notifications()).find((row) => row.kind === "AGENT_RUNTIME" && row.sourceId === kind);
  const runtimeRow = async (kind: string): Promise<AgentRuntimeRow> => (await client.rows())[kind]!;
  const until = async (check: () => Promise<boolean> | boolean, label: string, timeoutMs = 20_000) => {
    const started = Date.now();
    while (!(await check())) {
      if (Date.now() - started > timeoutMs) throw new Error(`${label}: not met within ${timeoutMs} ms`);
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
  };
  const nextTick = async (jumpMs?: number) => {
    if (jumpMs) vi.setSystemTime(Date.now() + jumpMs);
    await vi.advanceTimersByTimeAsync(TICK_INTERVAL_MS);
  };
  const settle = () => new Promise((resolve) => setTimeout(resolve, 1500));
  const appServerRequests = () => (states.read("app-server-requests.log") ?? "").split("\n").filter(Boolean);
  const startCodexAgent = async () => {
    const before = appServerRequests().filter((method) => method === "thread/start").length;
    const created = (await gql(`mutation($input:CreateAgentRunInput!){createAgentRun(input:$input){success message runId}}`, {
      input: { agentDefinitionId, workspaceRootPath: workspace, llmModelIdentifier: MODEL, llmConfig: null, autoExecuteTools: true, runtimeKind: CODEX },
    })).createAgentRun;
    expect(created.success, created.message).toBe(true);
    await until(() => appServerRequests().filter((method) => method === "thread/start").length === before + 1, "the agent's Codex thread started");
    await until(async () => (await runtimeRow(CODEX)).runningAgentCount === 1, "the Codex agent is counted");
    return created.runId as string;
  };

  beforeAll(async () => {
    fs.mkdirSync(workspace, { recursive: true });
    states.set("codex-account", "signedIn");
    states.set("codex-models", MODEL);
    fs.writeFileSync(path.join(fake.dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    sources = installVendorSourceStub(); // Codex 0.163.0 (installed 0.150.0), Claude 2.1.304 (installed 2.1.200), Antigravity 1.4.3 (installed)
    vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"], shouldAdvanceTime: true });
    // The scheduler's first tick (60 s + a random part) and the pass's spreading delays are chosen while the server
    // starts; with the random part 0 the first tick comes at exactly 60 s. Advancing past it would also fire the
    // vendor commands' timeouts (same fake clock) while the pass runs them.
    const random = vi.spyOn(Math, "random").mockReturnValue(0);
    let started!: Awaited<ReturnType<typeof startStudioE2eRuntimeServer>>;
    try {
      started = await startStudioE2eRuntimeServer();
    } finally {
      random.mockRestore();
    }
    fastify = started.fastify;
    url = started.mainUrl;
    client = createGraphqlClient(url, sources.realFetch);
  }, 120_000);

  afterAll(async () => {
    await fastify?.close();
    vi.useRealTimers();
    sources?.restore();
    await new Promise((resolve) => setTimeout(resolve, 500));
    const dir = process.env.UPDATE_NOTIFICATIONS_E2E_EVIDENCE_DIR;
    if (dir) {
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(path.join(dir, "agent-runtime-update-notifications.json"), `${JSON.stringify({ ...evidence, vendorRequests: sources?.requests }, null, 2)}\n`);
    }
    delete process.env.AUTOBYTEUS_DESKTOP_EMBEDDED_NODE;
    fake.dispose();
  }, 120_000);

  it("API-20 (AC-018, AC-005 runtimes, AR-007): the first tick checks the installed runtimes in the background; newer versions are notified, nothing is updated", async () => {
    expect((await gql(docs.GET_UPDATE_AUTOMATION_SETTINGS!)).updateAutomationSettings)
      .toMatchObject({ desktopEmbeddedNode: true, intervals: { agentRuntimes: 60 }, automaticUpdates: { agentRuntimes: false } });
    await vi.advanceTimersByTimeAsync(FIRST_TICK_DELAY_MS);
    await until(async () => (await notifications()).filter((row) => row.kind === "AGENT_RUNTIME").length === 2, "two runtime notifications");
    await settle();
    const rows = (await notifications()).filter((row) => row.kind === "AGENT_RUNTIME");
    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ sourceId: CODEX, installedRevision: "0.150.0", latestRevision: "0.163.0", state: "WAITING", read: false,
        outcome: null, repositoryUrl: null, defaultBranch: null }),
      expect.objectContaining({ sourceId: CLAUDE, installedRevision: "2.1.200", latestRevision: "2.1.304", state: "WAITING", read: false, outcome: null }),
    ]));
    // Antigravity is up to date and Grok is not installed: no notification for either.
    expect(rows.map((row) => row.sourceId).sort()).toEqual([CLAUDE, CODEX]);
    // Codex's newest version came from GitHub's release redirect; nothing was updated; no sign-in was read (the
    // background check never starts Codex's app-server).
    expect(sources.requests).toEqual(expect.arrayContaining(["https://github.com/openai/codex/releases/latest"]));
    expect(states.pid("codex", "update")).toBeNull();
    expect(states.pid("claude", "update")).toBeNull();
    expect(appServerRequests()).toEqual([]);
    evidence.api20 = { rows };
  }, 120_000);

  it("API-21 (AC-019, REQ-021): the panel's runtime Update is refused while that runtime's agents run; a success is handled, a failure keeps the notification", async () => {
    agentDefinitionId = (await gql(`mutation($input:CreateAgentDefinitionInput!){createAgentDefinition(input:$input){id}}`,
      { input: { name: "Runtime update agent", role: "assistant", description: "AC-019/AC-020 running agent", instructions: "Help.", toolNames: [] } })).createAgentDefinition.id;
    const runId = await startCodexAgent();
    const refused = await client.mutate("updateAgentRuntime", CODEX);
    expect(refused.errors?.[0]).toMatchObject({ message: "Update unavailable while 1 agent(s) are running.", extensions: { code: "AGENT_RUNTIME_AGENTS_RUNNING" } });
    expect(states.pid("codex", "update")).toBeNull();
    expect(await runtimeRecord(CODEX)).toMatchObject({ state: "WAITING", outcome: null });

    // A newer Antigravity is found by the next due background check; its Update succeeds and the notification is handled.
    sources.answers.antigravity = { status: 200, body: JSON.stringify({ version: "1.5.0", url: "https://example.invalid/agy.tar.gz", sha256: "0" }) };
    states.set("agy-update", "succeed");
    await nextTick(RUNTIME_DUE_AFTER);
    await until(async () => (await runtimeRecord(AGY))?.latestRevision === "1.5.0", "Antigravity notified");
    expect(await client.mutate("updateAgentRuntime", AGY)).toEqual({ data: { updateAgentRuntime: true } });
    await until(async () => (await runtimeRecord(AGY))?.state === "HANDLED", "Antigravity handled");
    expect(await runtimeRecord(AGY)).toMatchObject({ handledRevision: "1.5.0", outcome: null });

    // Claude's updater exits 0 without a newer version: a failure with the vendor's text; the notification stays.
    expect(await client.mutate("updateAgentRuntime", CLAUDE)).toEqual({ data: { updateAgentRuntime: true } });
    await until(async () => (await runtimeRow(CLAUDE)).operation?.state === "FAILED", "Claude's update failed");
    expect((await runtimeRow(CLAUDE)).operation?.error).toContain("Claude is up to date!");
    expect(await runtimeRecord(CLAUDE)).toMatchObject({ state: "WAITING", installedRevision: "2.1.200", outcome: null });
    evidence.api21 = { codexRunId: runId };
  }, 120_000);

  it("API-22 (AC-020, REQ-022, REQ-009): with runtime updates on, Codex waits while its agent runs, then updates by itself; Claude's failure is recorded once", async () => {
    await gql(docs.SET_AUTOMATIC_UPDATES!, { kind: "AGENT_RUNTIME", enabled: true });
    await nextTick();
    await until(async () => (await runtimeRecord(CODEX))?.outcome === "AUTO_WAITING" && (await runtimeRecord(CLAUDE))?.outcome === "AUTO_FAILED", "outcomes recorded");
    await settle();
    const waiting = (await runtimeRecord(CODEX))!;
    expect(waiting).toMatchObject({ state: "WAITING", read: false, outcomeReason: "Update unavailable while 1 agent(s) are running." });
    expect(states.pid("codex", "update")).toBeNull();
    const claudeFailed = (await runtimeRecord(CLAUDE))!;
    expect(claudeFailed.outcomeReason).toContain("Claude is up to date!");

    // Seen: read. The next ticks keep waiting without making it unread again and do not retry Claude.
    await gql(docs.MARK_UPDATE_NOTIFICATIONS_READ!);
    await nextTick();
    await nextTick();
    await settle();
    expect(await runtimeRecord(CODEX)).toMatchObject({ outcome: "AUTO_WAITING", read: true, outcomeAt: waiting.outcomeAt });
    expect(await runtimeRecord(CLAUDE)).toMatchObject({ outcome: "AUTO_FAILED", read: true, outcomeAt: claudeFailed.outcomeAt });

    // The agent ends: the next tick runs Codex's own update and records it as updated automatically.
    const ended = (await gql(`mutation($id:String!){terminateAgentRun(agentRunId:$id){success message}}`,
      { id: (evidence.api21 as { codexRunId: string }).codexRunId })).terminateAgentRun;
    expect(ended.success, ended.message).toBe(true);
    await until(async () => (await runtimeRow(CODEX)).runningAgentCount === 0, "the ended agent is no longer counted");
    await nextTick();
    await until(async () => (await runtimeRecord(CODEX))?.outcome === "AUTO_UPDATED", "Codex updated automatically", 30_000);
    expect(await runtimeRecord(CODEX)).toMatchObject({ state: "HANDLED", handledRevision: "0.163.0", installedRevision: "0.150.0", read: false });
    expect(states.read("codex-version")).toBe("0.163.0");
    evidence.api22 = { waiting, claudeFailed, updated: await runtimeRecord(CODEX) };
  }, 120_000);
});
