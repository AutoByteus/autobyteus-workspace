/**
 * Settings → Agent Runtimes through the real GraphQL API (ticket runtime-lifecycle-review).
 *
 * Purpose: the page's server contract on a test-owned studio server reached over HTTP — the four rows, independent
 * per-runtime checks (one vendor source failing, one slow), Update (success with progress and the kept re-check,
 * exit 0 without a newer version, failure with Try again), Sign in (success, Cancel, time-out with a CLI that
 * ignores SIGTERM), refusals with their codes, Codex with no OpenAI sign-in required (DEC-008), a runtime installed
 * later, no secret in any response, log or data file (AC-011), and every vendor process ending on server close.
 * Ticket remote-node-runtime-sign-in: the node's `agentRuntimeSignInBrowserAvailable` in the web's `AgentRuntimes`
 * document (AR-13). The test server gets `BROWSER` set, as a Docker node's server has it, so the answer is the same
 * on every platform.
 *
 * Prerequisites: none. The four runtime CLIs are `tests/fixtures/agent-runtimes-fake-cli.mjs`, linked as
 * codex/claude/agy/grok in a temp folder and selected through the existing overrides (`CODEX_APP_SERVER_COMMAND`,
 * `CLAUDE_CODE_EXECUTABLE_PATH`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND`). Their signed-out answers are the
 * real CLIs' own. The three vendor web sources are stubbed inside the test process; no network, no account.
 * The 10-minute operation time-out is shortened to 6 s for this file (the real value is asserted).
 *
 * Command (resolved temp HOME, TESTING.md):
 *   env -i PATH="$PATH" HOME="$(cd "$(mktemp -d)" && pwd -P)" TMPDIR="$TMPDIR" \
 *     pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/agent-runtimes-graphql.e2e.test.ts --no-watch
 */
import "reflect-metadata";
import fs from "node:fs";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import type { FastifyInstance } from "fastify";
import { buildStudioServer } from "../../../src/compositions/build-studio-server.js";
import { appConfigProvider } from "../../../src/config/app-config-provider.js";
import { initializeRuntimeLoggerBootstrap } from "../../../src/logging/runtime-logger-bootstrap.js";
import type { LoggingConfig } from "../../../src/config/logging-config.js";
import {
  createGraphqlClient, fakeRuntimeState, installVendorSourceStub, isProcessAlive, CLAUDE_RELEASES_URL, CODEX_RELEASES_URL,
  type AgentRuntimeRow,
} from "../helpers/agent-runtimes-e2e-harness.js";
import { until } from "../helpers/agy-runtime-error-fixture.js";

const SHORT_OPERATION_TIMEOUT_MS = 6_000;
const realTimeout = vi.hoisted(() => ({ value: 0 }));
vi.mock("../../../src/runtime-management/agent-runtimes/runtime-process-operation.js", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../src/runtime-management/agent-runtimes/runtime-process-operation.js")>();
  realTimeout.value = actual.OPERATION_TIMEOUT_MS;
  return { ...actual, OPERATION_TIMEOUT_MS: 6_000 };
});

// The fakes and the overrides exist before any server module loads (the Antigravity command is read at load).
const fake = await vi.hoisted(async () => {
  const { prepareFakeRuntimes } = await import("../helpers/agent-runtimes-e2e-harness.js");
  // Grok starts "not installed": its command points at a file that does not exist yet.
  const prepared = prepareFakeRuntimes({ label: "agent-runtimes-e2e", grokInstalled: false });
  // The server reads its sign-in browser fact once from its environment: give it a browser, as a Docker node has.
  const previousBrowser = process.env.BROWSER;
  process.env.BROWSER = "/usr/local/bin/open-vnc-browser-url.sh";
  return {
    ...prepared,
    dispose: () => {
      if (previousBrowser === undefined) delete process.env.BROWSER; else process.env.BROWSER = previousBrowser;
      prepared.dispose();
    },
  };
});

const CODEX = "codex_app_server";
const CLAUDE = "claude_agent_sdk";
const AGY = "antigravity_cli";
const GROK = "grok_build";
const LOGGING: LoggingConfig = {
  pinoLogLevel: "trace", httpAccessLogMode: "all", includeNoisyHttpAccessRoutes: true, scopedLogLevelOverrides: [],
} as LoggingConfig;

describe("Settings → Agent Runtimes GraphQL e2e (real studio server, scripted runtime CLIs)", () => {
  const states = fakeRuntimeState(fake.stateDir);
  const captured: string[] = [];
  let fastify: FastifyInstance;
  let sources: ReturnType<typeof installVendorSourceStub>;
  let client: ReturnType<typeof createGraphqlClient>;
  let restoreStreams: () => void;
  let closed = false;

  const row = async (kind: string): Promise<AgentRuntimeRow> => (await client.rows())[kind]!;
  const waitRow = async (kind: string, label: string, predicate: (row: AgentRuntimeRow) => boolean, ms = 20_000) => {
    let last: AgentRuntimeRow | undefined;
    await until(async () => predicate(last = await row(kind)), `${kind} ${label} (last: ${JSON.stringify(last)})`, ms);
    return last!;
  };
  const expectCode = async (promise: ReturnType<typeof client.mutate>, code: string) => {
    const result = await promise;
    expect(result.errors?.[0]?.extensions?.code, JSON.stringify(result)).toBe(code);
    return result.errors![0]!.message;
  };

  beforeAll(async () => {
    // Everything the server writes to stdout/stderr is kept for the secret scan, besides its log file.
    const stdoutWrite = process.stdout.write.bind(process.stdout);
    const stderrWrite = process.stderr.write.bind(process.stderr);
    process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => { captured.push(String(chunk)); return (stdoutWrite as any)(chunk, ...rest); }) as typeof process.stdout.write;
    process.stderr.write = ((chunk: unknown, ...rest: unknown[]) => { captured.push(String(chunk)); return (stderrWrite as any)(chunk, ...rest); }) as typeof process.stderr.write;
    restoreStreams = () => { process.stdout.write = stdoutWrite; process.stderr.write = stderrWrite; };

    fs.writeFileSync(path.join(fake.dataDir, ".env"), "AUTOBYTEUS_SERVER_HOST=http://localhost:8000\nAPP_ENV=test\n");
    appConfigProvider.config.setCustomAppDataDir(fake.dataDir);
    if (!appConfigProvider.config.isInitialized()) appConfigProvider.config.initialize();
    initializeRuntimeLoggerBootstrap({ logsDir: path.join(fake.dataDir, "logs"), loggingConfig: LOGGING });
    sources = installVendorSourceStub();
    sources.answers.claude = { status: 503, body: "Service Unavailable" };
    const studio = await buildStudioServer({ appConfig: appConfigProvider.config, loggingConfig: LOGGING });
    await studio.applicationRuntime.lifecycle.prepareBeforeListen();
    await studio.agentToolsMcpHost.listen();
    const address = await studio.fastify.listen({ port: 0, host: "127.0.0.1" });
    await studio.applicationRuntime.lifecycle.recoverAfterListen();
    fastify = studio.fastify;
    client = createGraphqlClient(new URL(address), sources.realFetch);
  }, 120_000);

  afterAll(async () => {
    if (!closed) await fastify?.close();
    sources?.restore();
    restoreStreams?.();
    fake.dispose();
  }, 60_000);

  it("AR-01 lists the four runtimes and checks each on its own: one source failing, one slow, one not installed (AC-001, AC-002, AC-005, AC-006, AC-009, QR-002)", async () => {
    expect(realTimeout.value, "the production operation time-out is 10 minutes (DEC-007)").toBe(10 * 60_000);
    expect(await client.order(), "page order").toEqual([CODEX, CLAUDE, AGY, GROK]);
    const before = await client.rows();
    expect(before[CODEX]!.updates.state, "nothing is checked before the page asks").toBe("NOT_CHECKED");
    expect(before[CODEX]!.checkedAt).toBeNull();

    sources.holdAntigravity();
    const check = await client.mutate("checkAgentRuntimes");
    expect(check).toEqual({ data: { checkAgentRuntimes: true } });
    // The mutation settles once installed versions are read: every installed version is already known.
    const settled = await client.rows();
    expect(settled[CODEX]!.installedVersion).toBe("0.150.0");
    expect(settled[CLAUDE]!.installedVersion).toBe("2.1.200");
    expect(settled[AGY]!.installedVersion).toBe("1.4.3");
    expect(settled[GROK]).toMatchObject({ installed: false, installedVersion: null });

    // Codex and Claude finish while the Antigravity source is still held back.
    const codex = await waitRow(CODEX, "checked", (r) => r.updates.state !== "CHECKING" && r.account.state !== "CHECKING");
    expect(codex).toMatchObject({
      installed: true, installedVersion: "0.150.0", updates: { state: "UPDATE_AVAILABLE", latestVersion: "0.163.0" },
      account: { state: "SIGNED_OUT" }, signInRoute: "BROWSER", installInstructionsUrl: "https://learn.chatgpt.com/docs/codex/cli",
      runningAgentCount: 0, operation: null,
    });
    expect(codex.checkedAt).not.toBeNull();
    const claude = await waitRow(CLAUDE, "checked", (r) => r.updates.state !== "CHECKING" && r.account.state !== "CHECKING");
    // Unreachable source: Check failed, installed version kept. Signed out = real Claude JSON with exit 1 (CR-001).
    expect(claude).toMatchObject({
      installed: true, installedVersion: "2.1.200", updates: { state: "CHECK_FAILED", latestVersion: null },
      account: { state: "SIGNED_OUT" }, signInRoute: "COMMAND_LINE", installInstructionsUrl: "https://code.claude.com/docs/en/setup",
    });
    const agyWhileHeld = await row(AGY);
    expect(agyWhileHeld.updates.state, "the slow source holds only its own row").toBe("CHECKING");
    expect(agyWhileHeld.checkedAt).toBeNull();
    expect(await row(GROK)).toMatchObject({
      installed: false, updates: { state: "NOT_CHECKED", latestVersion: null }, account: { state: "NOT_APPLICABLE" },
      signInRoute: "BROWSER", installInstructionsUrl: "https://docs.x.ai/build/overview", operation: null,
    });

    sources.releaseAntigravity();
    const agy = await waitRow(AGY, "checked", (r) => r.updates.state !== "CHECKING" && r.account.state !== "CHECKING");
    expect(agy).toMatchObject({
      installed: true, installedVersion: "1.4.3", updates: { state: "UP_TO_DATE", latestVersion: "1.4.3" },
      account: { state: "SIGNED_OUT" }, signInRoute: "COMMAND_LINE",
      installInstructionsUrl: "https://antigravity.google/docs/getting-started?tab=cli",
    });
    expect(sources.requests).toEqual(expect.arrayContaining([CODEX_RELEASES_URL, CLAUDE_RELEASES_URL]));
    expect(sources.requests.some((url) => /manifests\/(darwin|linux|windows)_(amd64|arm64)\.json$/.test(url))).toBe(true);
  }, 60_000);

  it("AR-02 Check again re-reads every row; the source that failed recovers (AC-002, SCN-A1)", async () => {
    const firstChecked = (await row(CODEX)).checkedAt!;
    sources.answers.claude = { status: 200, body: "2.1.304\n" };
    expect(await client.mutate("checkAgentRuntimes")).toEqual({ data: { checkAgentRuntimes: true } });
    const claude = await waitRow(CLAUDE, "re-checked", (r) => r.updates.state === "UPDATE_AVAILABLE");
    expect(claude.updates.latestVersion).toBe("2.1.304");
    expect(claude.installedVersion).toBe("2.1.200");
    const codex = await waitRow(CODEX, "re-checked", (r) => r.updates.state !== "CHECKING" && r.checkedAt !== firstChecked);
    expect(Date.parse(codex.checkedAt!)).toBeGreaterThan(Date.parse(firstChecked));
  }, 60_000);

  it("AR-03 Update runs the vendor's updater with progress, then 'Updated from X to Y.' that the automatic re-check keeps (AC-003, AR-006)", async () => {
    expect(await client.mutate("updateAgentRuntime", CODEX)).toEqual({ data: { updateAgentRuntime: true } });
    const running = await row(CODEX);
    expect(running.operation).toMatchObject({ kind: "UPDATE", state: "RUNNING", command: "codex update", fromVersion: "0.150.0", toVersion: null, error: null });
    const withStep = await waitRow(CODEX, "progress line", (r) => !!r.operation?.step);
    expect(["Checking for updates…", "Downloading codex 0.163.0…", "Installing…"]).toContain(withStep.operation!.step);
    const done = await waitRow(CODEX, "updated", (r) => r.operation?.state === "SUCCEEDED");
    expect(done.operation).toMatchObject({ kind: "UPDATE", command: "codex update", fromVersion: "0.150.0", toVersion: "0.163.0", step: null, error: null });
    expect(done.installedVersion).toBe("0.163.0");
    const rechecked = await waitRow(CODEX, "re-checked after update", (r) => r.updates.state === "UP_TO_DATE");
    expect(rechecked.operation?.state, "the automatic re-check keeps the result").toBe("SUCCEEDED");
    expect(isProcessAlive(states.pid("codex", "update")), "updater exited").toBe(false);

    // A user-started check clears the finished result.
    await client.mutate("checkAgentRuntimes");
    const cleared = await waitRow(CODEX, "cleared", (r) => r.updates.state === "UP_TO_DATE");
    expect(cleared.operation).toBeNull();
  }, 60_000);

  it("AR-04 Update that exits 0 without a newer version is a failure with the vendor's text, version unchanged (AC-003)", async () => {
    states.set("claude-update", "upToDate");
    expect(await client.mutate("updateAgentRuntime", CLAUDE)).toEqual({ data: { updateAgentRuntime: true } });
    const failed = await waitRow(CLAUDE, "update finished", (r) => r.operation?.state === "FAILED");
    expect(failed.operation).toMatchObject({ kind: "UPDATE", command: "claude update", fromVersion: "2.1.200", toVersion: null, step: null });
    expect(failed.operation!.error).toContain("Claude is up to date!");
    expect(failed.installedVersion).toBe("2.1.200");
    expect(failed.updates).toEqual({ state: "UPDATE_AVAILABLE", latestVersion: "2.1.304" });
  }, 60_000);

  it("AR-05 Update failure shows the vendor's message without terminal codes; Try again runs it again; busy is refused (AC-003)", async () => {
    expect(await client.mutate("updateAgentRuntime", AGY)).toEqual({ data: { updateAgentRuntime: true } });
    const busy = await expectCode(client.mutate("updateAgentRuntime", AGY), "AGENT_RUNTIME_BUSY");
    expect(busy).toBe("This runtime is already updating or signing in.");
    const failed = await waitRow(AGY, "update failed", (r) => r.operation?.state === "FAILED");
    expect(failed.operation!.error).toContain("Error: update failed: permission denied writing /fake/agy/bin/agy");
    expect(failed.operation!.error).not.toMatch(/\u001b/);
    expect(failed.installedVersion).toBe("1.4.3");

    // Try again: the same mutation starts a new update after a failure.
    expect(await client.mutate("updateAgentRuntime", AGY)).toEqual({ data: { updateAgentRuntime: true } });
    expect((await row(AGY)).operation?.state).toBe("RUNNING");
    await waitRow(AGY, "second update failed", (r) => r.operation?.state === "FAILED");
  }, 60_000);

  it("AR-06 refuses what the page never offers, with codes and safe messages", async () => {
    expect(await expectCode(client.mutate("updateAgentRuntime", GROK), "AGENT_RUNTIME_NOT_INSTALLED")).toBe("This runtime is not installed.");
    expect(await expectCode(client.mutate("startAgentRuntimeSignIn", GROK), "AGENT_RUNTIME_NOT_INSTALLED")).toBe("This runtime is not installed.");
    for (const kind of [CLAUDE, AGY]) {
      expect(await expectCode(client.mutate("startAgentRuntimeSignIn", kind), "AGENT_RUNTIME_SIGN_IN_UNSUPPORTED")).toBe("Sign in from this runtime's command line.");
    }
    for (const kind of ["autobyteus", "no_such_runtime"]) {
      expect(await expectCode(client.mutate("updateAgentRuntime", kind), "AGENT_RUNTIME_UNKNOWN")).toBe(`Unknown agent runtime '${kind}'.`);
    }
  }, 30_000);

  it("AR-07 Sign in starts the runtime's own login, passes nothing of it to the client, and ends Signed in (AC-007, AC-011)", async () => {
    expect(await client.mutate("startAgentRuntimeSignIn", CODEX)).toEqual({ data: { startAgentRuntimeSignIn: true } });
    await until(() => isProcessAlive(states.pid("codex", "login")), "codex login started");
    const running = await row(CODEX);
    expect(running.operation).toEqual({ kind: "SIGN_IN", state: "RUNNING", command: null, step: null, fromVersion: null, toVersion: null, error: null });
    expect(running.account.state).toBe("SIGNED_OUT");
    expect(await expectCode(client.mutate("updateAgentRuntime", CODEX), "AGENT_RUNTIME_BUSY")).toBe("This runtime is already updating or signing in.");

    states.set("codex-login", "complete");
    const signedIn = await waitRow(CODEX, "signed in", (r) => r.account.state === "SIGNED_IN");
    expect(signedIn.operation).toBeNull();
    await until(() => !isProcessAlive(states.pid("codex", "login")), "codex login exited");
  }, 60_000);

  it("AR-08 Cancel stops the login process and returns the row to Sign in (AC-007 cancel, QR-003)", async () => {
    states.set("codex-account", "signedOut");
    states.clearPid("codex", "login");
    await client.mutate("checkAgentRuntimes");
    await waitRow(CODEX, "signed out again", (r) => r.account.state === "SIGNED_OUT");
    expect(await client.mutate("startAgentRuntimeSignIn", CODEX)).toEqual({ data: { startAgentRuntimeSignIn: true } });
    await until(() => isProcessAlive(states.pid("codex", "login")), "codex login started");
    const pid = states.pid("codex", "login");
    expect(await client.mutate("cancelAgentRuntimeSignIn", CODEX)).toEqual({ data: { cancelAgentRuntimeSignIn: true } });
    const cancelled = await waitRow(CODEX, "cancelled", (r) => r.operation === null);
    expect(cancelled.account.state).toBe("SIGNED_OUT");
    await until(() => !isProcessAlive(pid), "codex login stopped", 10_000);
    // Cancel with nothing running is harmless.
    expect(await client.mutate("cancelAgentRuntimeSignIn", CODEX)).toEqual({ data: { cancelAgentRuntimeSignIn: true } });
  }, 60_000);

  it("AR-09 a runtime installed later appears on the next check; a login that never finishes times out, even ignoring SIGTERM (AC-005, AC-007 time-out, QR-003)", async () => {
    process.env.GROK_BUILD_COMMAND = path.join(fake.binDir, "grok");
    await client.mutate("checkAgentRuntimes");
    const grok = await waitRow(GROK, "installed", (r) => r.installed && r.updates.state !== "CHECKING" && r.account.state !== "CHECKING");
    expect(grok).toMatchObject({ installedVersion: "1.0.62", updates: { state: "UP_TO_DATE", latestVersion: "1.0.62" }, account: { state: "SIGNED_OUT" }, signInRoute: "BROWSER" });

    const started = Date.now();
    expect(await client.mutate("startAgentRuntimeSignIn", GROK)).toEqual({ data: { startAgentRuntimeSignIn: true } });
    await until(() => isProcessAlive(states.pid("grok", "login")), "grok login started");
    const pid = states.pid("grok", "login");
    const timedOut = await waitRow(GROK, "did not finish", (r) => r.operation?.state === "DID_NOT_FINISH", 30_000);
    const elapsed = Date.now() - started;
    expect(timedOut.operation).toMatchObject({ kind: "SIGN_IN", command: null, step: null, error: null });
    expect(timedOut.account.state).toBe("SIGNED_OUT");
    expect(isProcessAlive(pid), "SIGKILL after the ignored SIGTERM").toBe(false);
    expect(states.read("grok-login-signals.log")).toContain("SIGTERM ignored");
    expect(elapsed, "time-out, then the 3 s SIGKILL grace").toBeGreaterThanOrEqual(SHORT_OPERATION_TIMEOUT_MS + 3_000 - 500);

    // Try again starts a new login; it can be cancelled.
    expect(await client.mutate("startAgentRuntimeSignIn", GROK)).toEqual({ data: { startAgentRuntimeSignIn: true } });
    expect((await row(GROK)).operation?.state).toBe("RUNNING");
    await client.mutate("cancelAgentRuntimeSignIn", GROK);
    await waitRow(GROK, "cancelled", (r) => r.operation === null, 15_000);
  }, 90_000);

  it("AR-10 Codex with no OpenAI sign-in required shows no account state (DEC-008); a signed-in Grok reads Signed in", async () => {
    states.set("codex-account", "notRequired");
    states.set("grok-account", "signedIn");
    await client.mutate("checkAgentRuntimes");
    expect((await waitRow(CODEX, "not applicable", (r) => r.account.state === "NOT_APPLICABLE")).installed).toBe(true);
    await waitRow(GROK, "signed in", (r) => r.account.state === "SIGNED_IN");
    states.set("codex-account", "signedOut");
  }, 60_000);

  it("AR-11 no sign-in URL, code or account detail appears in any API response, log or data file (AC-011, REQ-008)", async () => {
    // Make the signed-in answers (with account e-mails) pass through the server once more.
    states.set("claude-account", "signedIn");
    states.set("codex-account", "signedIn");
    await client.mutate("checkAgentRuntimes");
    await waitRow(CLAUDE, "claude signed in", (r) => r.account.state === "SIGNED_IN");
    await waitRow(CODEX, "codex signed in", (r) => r.account.state === "SIGNED_IN");

    const secrets = states.emittedSecrets();
    expect(secrets.length, "the fakes printed secrets for the scan to look for").toBeGreaterThanOrEqual(5);
    const markers = [...secrets, "FAKE-SECRET"];
    const dataFiles: string[] = [];
    const walk = (dir: string) => {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) walk(full); else dataFiles.push(full);
      }
    };
    walk(fake.dataDir);
    const logFile = path.join(fake.dataDir, "logs", "server.log");
    expect(fs.existsSync(logFile), "server log file exists").toBe(true);
    expect(fs.statSync(logFile).size, "trace-level server log was written").toBeGreaterThan(0);
    const corpora: Record<string, string> = {
      apiResponses: client.responses.join("\n"),
      stdoutAndStderr: captured.join(""),
      ...Object.fromEntries(dataFiles.map((file) => [path.relative(fake.dataDir, file), fs.readFileSync(file, "latin1")])),
    };
    expect(client.responses.length).toBeGreaterThan(50);
    const hits = Object.entries(corpora).flatMap(([where, text]) => markers.filter((marker) => text.includes(marker)).map((marker) => `${where}: ${marker}`));
    console.info(`[AR-11] scanned ${client.responses.length} API responses, ${captured.length} stdout/stderr writes, ${dataFiles.length} data files; markers ${markers.length}; hits ${hits.length}`);
    expect(hits).toEqual([]);
  }, 60_000);

  it("AR-13 the web's AgentRuntimes document reads the rows and the node's sign-in browser fact, which polls and sign-ins never change (remote-node-runtime-sign-in REQ-002, QR-002)", async () => {
    // The web page's exact document (autobyteus-web/graphql/queries/agentRuntimesQueries.ts).
    const document = `query AgentRuntimes {
      agentRuntimes {
        runtimeKind installed installedVersion
        updates { state latestVersion }
        account { state }
        signInRoute installInstructionsUrl runningAgentCount
        operation { kind state command step fromVersion toVersion error }
        checkedAt
      }
      agentRuntimeSignInBrowserAvailable
    }`;
    const read = async () => {
      const result = await client.post(document);
      expect(result.errors, JSON.stringify(result.errors)).toBeUndefined();
      return result.data as { agentRuntimes: AgentRuntimeRow[]; agentRuntimeSignInBrowserAvailable: unknown };
    };
    const first = await read();
    expect(first.agentRuntimeSignInBrowserAvailable).toBe(true);
    expect(first.agentRuntimes.map((r) => r.runtimeKind)).toEqual([CODEX, CLAUDE, AGY, GROK]);
    // A node-level field: no row carries it.
    expect(first.agentRuntimes.every((r) => !("agentRuntimeSignInBrowserAvailable" in r))).toBe(true);
    // The fact is fixed for the server's lifetime: a running sign-in and later reads give the same answer.
    states.set("codex-account", "signedOut");
    states.clearPid("codex", "login");
    await client.mutate("checkAgentRuntimes");
    await waitRow(CODEX, "signed out", (r) => r.account.state === "SIGNED_OUT");
    expect(await client.mutate("startAgentRuntimeSignIn", CODEX)).toEqual({ data: { startAgentRuntimeSignIn: true } });
    const whileSigningIn = await read();
    expect(whileSigningIn.agentRuntimeSignInBrowserAvailable).toBe(true);
    expect(whileSigningIn.agentRuntimes.find((r) => r.runtimeKind === CODEX)!.operation).toMatchObject({ kind: "SIGN_IN", state: "RUNNING", command: null, step: null, error: null });
    expect(await client.mutate("cancelAgentRuntimeSignIn", CODEX)).toEqual({ data: { cancelAgentRuntimeSignIn: true } });
    await waitRow(CODEX, "cancelled", (r) => r.operation === null, 15_000);
    expect((await read()).agentRuntimeSignInBrowserAvailable).toBe(true);
  }, 60_000);

  it("AR-12 closing the server stops a running vendor process (QR-003, SCN-A4)", async () => {
    states.set("codex-account", "signedOut");
    states.clearPid("codex", "login");
    await client.mutate("checkAgentRuntimes");
    await waitRow(CODEX, "signed out", (r) => r.account.state === "SIGNED_OUT");
    expect(await client.mutate("startAgentRuntimeSignIn", CODEX)).toEqual({ data: { startAgentRuntimeSignIn: true } });
    await until(() => isProcessAlive(states.pid("codex", "login")), "codex login started");
    const pid = states.pid("codex", "login");
    closed = true;
    await fastify.close();
    await until(() => !isProcessAlive(pid), "login stopped by server close", 10_000);
  }, 60_000);
});
