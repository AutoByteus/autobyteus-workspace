import { chmod, mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";
import { createClaudeAgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/strategies/claude-agent-runtime-strategy.js";
import { createCodexAgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.js";
import { createGrokAgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/strategies/grok-agent-runtime-strategy.js";
import {
  antigravityManifestUrl, createAntigravityAgentRuntimeStrategy,
} from "../../../../src/runtime-management/agent-runtimes/strategies/antigravity-agent-runtime-strategy.js";
import { createReadDeadline } from "../../../../src/runtime-management/read-deadline.js";
import { createAgentRuntimeStrategies } from "../../../../src/runtime-management/agent-runtimes/strategies/create-agent-runtime-strategies.js";

/**
 * Each runtime strategy against a scripted fake runtime CLI (one script answering `--version`,
 * `auth status --json`, `models`, `update --check --json`), selected through the runtimes'
 * existing command overrides. Vendor HTTP sources are stubbed. No real runtime, account or network.
 */
let directory: string;
let fakeCli: string;

beforeAll(async () => {
  directory = await mkdtemp(path.join(tmpdir(), "agent-runtime-strategies-"));
  fakeCli = path.join(directory, "fake-runtime");
  await writeFile(fakeCli, `#!/usr/bin/env node
const args = process.argv.slice(2).join(' ');
const mode = process.env.FAKE_RUNTIME_MODE || '';
const out = (text) => process.stdout.write(text);
if (args === '--version') {
  if (mode === 'broken') process.exitCode = 3;
  else out(process.env.FAKE_RUNTIME_VERSION_TEXT + '\\n');
} else if (args === 'auth status --json') {
  if (mode === 'json-in') out(JSON.stringify({ loggedIn: true, authMethod: 'claude.ai' }));
  // Real Claude 2.1.302 signed out: the JSON on stdout and exit 1 (CR-001).
  else if (mode === 'json-out') { out(JSON.stringify({ loggedIn: false, authMethod: 'none' })); process.exitCode = 1; }
  else if (mode === 'json-no-field') out(JSON.stringify({ authMethod: 'none' }));
  else if (mode === 'text-in-exit-1') { out('Not logged in.\\n'); process.exitCode = 1; }
  else if (mode === 'text-in') out('Logged in using a subscription.\\n');
  else if (mode === 'text-other') out('Something else.\\n');
  else { process.stderr.write('auth status broke\\n'); process.exitCode = 1; }
} else if (args === 'models') {
  if (mode === 'grok-out') out('You are not authenticated.\\n');
  else if (mode === 'grok-in') out('grok-4.7\\tGrok 4.7\\n');
  else process.exitCode = 2;
} else if (args === '-p /usage --output-format json') {
  if (mode === 'usage-hang') setInterval(() => {}, 1000);
  else if (mode === 'usage-signed-out') { process.stderr.write('Please sign in token=abc\\n'); process.exitCode = 1; }
  else out(require('node:fs').readFileSync(process.env.FAKE_USAGE_FILE, 'utf8'));
} else if (args === 'update --check --json') {
  if (mode === 'grok-check-error') out(JSON.stringify({ latestVersion: null, error: 'offline' }));
  else out(JSON.stringify({ currentVersion: '1.0.62', latestVersion: '1.0.63', updateAvailable: true, error: null }));
} else {
  process.exitCode = 9;
}
`, "utf8");
  await chmod(fakeCli, 0o755);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});
afterAll(async () => { await rm(directory, { recursive: true, force: true }); });

const useFake = (envKey: string, mode: string, versionText = "1.2.3") => {
  vi.stubEnv(envKey, fakeCli);
  vi.stubEnv("FAKE_RUNTIME_MODE", mode);
  vi.stubEnv("FAKE_RUNTIME_VERSION_TEXT", versionText);
};

const stubFetch = (body: string, status = 200) => {
  const fetchMock = vi.fn(async () => new Response(body, { status }));
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
};

describe("the four strategies", () => {
  it("are Codex, Claude, Antigravity and Grok in page order, with routes and official install links", () => {
    const strategies = createAgentRuntimeStrategies({ codexClientManager: { beginAcquire: vi.fn() } as never });
    expect(strategies.map((strategy) => [strategy.runtimeKind, strategy.signInRoute, strategy.installInstructionsUrl, !!strategy.signInArgv]))
      .toEqual([
        [RuntimeKind.CODEX_APP_SERVER, "browser", "https://learn.chatgpt.com/docs/codex/cli", true],
        [RuntimeKind.CLAUDE_AGENT_SDK, "commandLine", "https://code.claude.com/docs/en/setup", false],
        [RuntimeKind.ANTIGRAVITY_CLI, "commandLine", "https://antigravity.google/docs/getting-started?tab=cli", false],
        [RuntimeKind.GROK_BUILD, "browser", "https://docs.x.ai/build/overview", true],
      ]);
    expect(strategies.map((strategy) => strategy.updateArgv("x"))).toEqual([
      ["x", "update"], ["x", "update"], ["x", "update"], ["x", "update"],
    ]);
    expect(strategies[0]!.signInArgv!("codex")).toEqual(["codex", "login"]);
    expect(strategies[3]!.signInArgv!("grok")).toEqual(["grok", "login", "--oauth"]);
  });
});

describe("installed version (fresh --version through the existing resolver)", () => {
  it("reads the version from vendor wording and reports a missing or broken command as not installed", async () => {
    useFake("GROK_BUILD_COMMAND", "", "grok 1.0.62");
    const grok = createGrokAgentRuntimeStrategy();
    expect(grok.resolveExecutable()).toBe(fakeCli);
    await expect(grok.readVersion(fakeCli)).resolves.toBe("1.0.62");

    vi.stubEnv("FAKE_RUNTIME_VERSION_TEXT", "2.1.302 (Claude Code)");
    await expect(grok.readVersion(fakeCli)).resolves.toBe("2.1.302");

    vi.stubEnv("FAKE_RUNTIME_MODE", "broken");
    await expect(grok.readVersion(fakeCli)).resolves.toBeNull();
    await expect(grok.readVersion(path.join(directory, "missing-runtime"))).resolves.toBeNull();
  });

  it("uses the Codex launch command override", () => {
    vi.stubEnv("CODEX_APP_SERVER_COMMAND", fakeCli);
    expect(createCodexAgentRuntimeStrategy({ codexClientManager: {} as never }).resolveExecutable()).toBe(fakeCli);
  });
});

describe("Codex sign-in (account/read, the rule application readiness has always used)", () => {
  const codexWith = (answer: () => Promise<unknown>) => {
    const request = vi.fn(answer);
    const release = vi.fn(async () => undefined);
    const beginAcquire = vi.fn(() => ({ acquire: async () => ({ request }), release }));
    return { strategy: createCodexAgentRuntimeStrategy({ codexClientManager: { beginAcquire } as never }), beginAcquire, request, release };
  };

  it.each([
    [{ account: { type: "chatgpt" }, requiresOpenaiAuth: true }, { state: "signedIn" }],
    [{ account: null, requiresOpenaiAuth: false }, { state: "notRequired" }],
    // Missing or non-boolean requiresOpenaiAuth with no account stays "no sign-in required", as before.
    [{ account: null }, { state: "notRequired" }],
    [{ account: null, requiresOpenaiAuth: "yes" }, { state: "notRequired" }],
    [{ account: null, requiresOpenaiAuth: true }, { state: "signedOut", detail: "no logged-in account." }],
  ])("maps %o", async (answer, expected) => {
    const { strategy, beginAcquire, request, release } = codexWith(async () => answer);
    await expect(strategy.readSignIn("codex", "/home/user")).resolves.toEqual(expected);
    expect(beginAcquire).toHaveBeenCalledExactlyOnceWith("/home/user");
    expect(request).toHaveBeenCalledExactlyOnceWith("account/read", { refreshToken: false });
    expect(release).toHaveBeenCalledOnce();
  });

  it("reports a protocol failure as unknown and still releases the client", async () => {
    const { strategy, release } = codexWith(async () => { throw new Error("app-server exited"); });
    await expect(strategy.readSignIn("codex", "/w")).resolves.toEqual({ state: "unknown", detail: "app-server exited" });
    expect(release).toHaveBeenCalledOnce();
  });

  it("reads the newest version from the tag of the latest-release redirect (no REST quota, REQ-002)", async () => {
    const fetchMock = stubFetch("must not be fetched");
    const fetchLatestReleaseTag = vi.fn(async () => "rust-v0.164.0");
    const strategy = createCodexAgentRuntimeStrategy({ codexClientManager: { beginAcquire: vi.fn() } as never,
      githubClient: { fetchLatestReleaseTag } });
    await expect(strategy.readLatestVersion("codex")).resolves.toBe("0.164.0");
    expect(fetchLatestReleaseTag).toHaveBeenCalledExactlyOnceWith("openai", "codex");
    expect(fetchMock).not.toHaveBeenCalled();
    fetchLatestReleaseTag.mockResolvedValueOnce("nightly");
    await expect(strategy.readLatestVersion("codex")).rejects.toThrow("Codex release has no version.");
    fetchLatestReleaseTag.mockRejectedValueOnce(new Error("GitHub latest release request answered HTTP 503."));
    await expect(strategy.readLatestVersion("codex")).rejects.toThrow("HTTP 503");
  });
});

describe("Claude sign-in (claude auth status --json)", () => {
  it.each([
    ["json-in", { state: "signedIn" }],
    // Signed out exits 1 with the JSON; describeFailure gives the empty stderr after "unavailable: " (today's text).
    ["json-out", { state: "signedOut", detail: "" }],
    ["json-no-field", { state: "signedOut", detail: "" }],
    // The plain-text fallback applies only to a successful exit.
    ["text-in-exit-1", { state: "unknown", detail: "" }],
    // Plain-text "logged in" fallback kept from application readiness.
    ["text-in", { state: "signedIn" }],
    ["text-other", { state: "unknown", detail: "" }],
    ["fail", { state: "unknown", detail: "auth status broke" }],
  ])("%s", async (mode, expected) => {
    useFake("CLAUDE_CODE_EXECUTABLE_PATH", mode, "2.1.302 (Claude Code)");
    const claude = createClaudeAgentRuntimeStrategy();
    await expect(claude.readSignIn(fakeCli, "/w")).resolves.toEqual(expected);
  });

  it("reads the newest version from the user's update channel (latest by default)", async () => {
    const configDir = path.join(directory, "claude-config");
    await mkdir(configDir, { recursive: true });
    vi.stubEnv("CLAUDE_CONFIG_DIR", configDir);
    const claude = createClaudeAgentRuntimeStrategy();

    let fetchMock = stubFetch("2.1.304\n");
    await expect(claude.readLatestVersion("claude")).resolves.toBe("2.1.304");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://downloads.claude.ai/claude-code-releases/latest");

    await writeFile(path.join(configDir, "settings.json"), JSON.stringify({ autoUpdatesChannel: "stable" }), "utf8");
    fetchMock = stubFetch("2.1.300");
    await expect(claude.readLatestVersion("claude")).resolves.toBe("2.1.300");
    expect(fetchMock.mock.calls[0]?.[0]).toBe("https://downloads.claude.ai/claude-code-releases/stable");
  });
});

describe("Grok (grok models, grok update --check --json)", () => {
  it.each([
    ["grok-out", { state: "signedOut", detail: "You are not authenticated." }],
    ["grok-in", { state: "signedIn" }],
    ["grok-fail", { state: "unknown", detail: "grok models exited with 2." }],
  ])("sign-in %s", async (mode, expected) => {
    useFake("GROK_BUILD_COMMAND", mode);
    await expect(createGrokAgentRuntimeStrategy().readSignIn(fakeCli, "/w")).resolves.toEqual(expected);
  });

  it("reads the newest version from Grok's own check, and fails when it reports an error", async () => {
    useFake("GROK_BUILD_COMMAND", "");
    const grok = createGrokAgentRuntimeStrategy();
    await expect(grok.readLatestVersion(fakeCli)).resolves.toBe("1.0.63");
    vi.stubEnv("FAKE_RUNTIME_MODE", "grok-check-error");
    await expect(grok.readLatestVersion(fakeCli)).rejects.toThrow();
  });
});

describe("Antigravity", () => {
  it("maps the OS and CPU to the updater manifest agy reads", () => {
    const base = "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests";
    expect(antigravityManifestUrl("darwin", "arm64")).toBe(`${base}/darwin_arm64.json`);
    expect(antigravityManifestUrl("linux", "x64")).toBe(`${base}/linux_amd64.json`);
    expect(antigravityManifestUrl("win32", "x64")).toBe(`${base}/windows_amd64.json`);
    expect(antigravityManifestUrl("freebsd", "x64")).toBeNull();
    expect(antigravityManifestUrl("darwin", "ia32")).toBeNull();
  });

  it("classifies sign-in from model discovery and reads the manifest version", async () => {
    const agy = path.join(directory, "agy-fake");
    await writeFile(agy, `#!/usr/bin/env node
const arg = process.argv[2];
if (arg === '--help') process.stdout.write('--agent --new-project --add-dir --conversation --input-format --output-format --dangerously-skip-permissions\\n');
else if (arg === 'models') {
  if (process.env.FAKE_RUNTIME_MODE === 'signed-out') { process.stderr.write('Error: Please sign in to view available models.\\n'); process.exitCode = 1; }
  else if (process.env.FAKE_RUNTIME_MODE === 'network') { process.stderr.write('Error: dial tcp: connection refused\\n'); process.exitCode = 1; }
  else process.stdout.write('gemini-test\\tGemini Test\\n');
}
`, "utf8");
    await chmod(agy, 0o755);
    vi.stubEnv("ANTIGRAVITY_CLI_COMMAND", agy);
    vi.resetModules();
    const { createAntigravityAgentRuntimeStrategy } = await import(
      "../../../../src/runtime-management/agent-runtimes/strategies/antigravity-agent-runtime-strategy.js"
    );
    const strategy = createAntigravityAgentRuntimeStrategy();
    expect(strategy.resolveExecutable()).toBe(agy);

    vi.stubEnv("FAKE_RUNTIME_MODE", "signed-in");
    await expect(strategy.readSignIn(agy, "/w")).resolves.toEqual({ state: "signedIn" });
    vi.stubEnv("FAKE_RUNTIME_MODE", "signed-out");
    await expect(strategy.readSignIn(agy, "/w")).resolves.toMatchObject({ state: "signedOut" });
    vi.stubEnv("FAKE_RUNTIME_MODE", "network");
    await expect(strategy.readSignIn(agy, "/w")).resolves.toMatchObject({ state: "unknown" });

    const fetchMock = stubFetch(JSON.stringify({ version: "1.4.3", url: "https://example.invalid/cli.tar.gz" }));
    if (antigravityManifestUrl(process.platform, process.arch)) {
      await expect(strategy.readLatestVersion(agy)).resolves.toBe("1.4.3");
      expect(fetchMock).toHaveBeenCalledOnce();
    }
  });
});

const USAGE_FIXTURES = path.resolve(path.dirname(new URL(import.meta.url).pathname), "../../../fixtures/usage-limits");
const usageFixture = async (name: string) =>
  JSON.parse(await (await import("node:fs/promises")).readFile(path.join(USAGE_FIXTURES, name), "utf8")) as unknown;

describe("usage limits (readUsageLimits, 0 tokens, within the step deadline)", () => {
  it("Codex: account/rateLimits/read on the home-folder app-server, lease released", async () => {
    const answer = await usageFixture("codex-rate-limits-exhausted.json");
    const request = vi.fn(async () => answer);
    const release = vi.fn(async () => undefined);
    const beginAcquire = vi.fn(() => ({ acquire: async () => ({ request }), release }));
    const codex = createCodexAgentRuntimeStrategy({ codexClientManager: { beginAcquire } as never });
    await expect(codex.readUsageLimits("codex", "/home/user", { deadline: createReadDeadline(5_000) })).resolves.toMatchObject({
      state: "read", limits: [{ name: "Weekly", remainingPercent: 0, exhausted: true }],
    });
    expect(beginAcquire).toHaveBeenCalledExactlyOnceWith("/home/user");
    expect(request).toHaveBeenCalledExactlyOnceWith("account/rateLimits/read", {});
    expect(release).toHaveBeenCalledOnce();
  });

  it("Codex: a request that never answers ends at the deadline and releases the lease (AR-002)", async () => {
    const release = vi.fn(async () => undefined);
    const request = vi.fn(() => new Promise(() => undefined));
    const beginAcquire = vi.fn(() => ({ acquire: async () => ({ request }), release }));
    const codex = createCodexAgentRuntimeStrategy({ codexClientManager: { beginAcquire } as never });
    const startedAt = Date.now();
    await expect(codex.readUsageLimits("codex", "/home/user", { deadline: createReadDeadline(150) }))
      .resolves.toEqual({ state: "unknown", reason: "Codex usage limits timed out" });
    await expect(codex.readSignIn("codex", "/home/user", { deadline: createReadDeadline(150) }))
      .resolves.toMatchObject({ state: "unknown" });
    expect(Date.now() - startedAt).toBeLessThan(2_000);
    expect(release).toHaveBeenCalledTimes(2);
  });

  it("Claude: the SDK usage answer through the client; a failure is classified, its text dropped", async () => {
    const answer = await usageFixture("claude-get-usage.json");
    const readUsage = vi.fn(async () => answer);
    const deadline = createReadDeadline(5_000);
    await expect(createClaudeAgentRuntimeStrategy({ claudeSdkClient: { readUsage } }).readUsageLimits("claude", "/w", { deadline }))
      .resolves.toMatchObject({ state: "read", limits: [{ name: "5-hour", remainingPercent: 13 }, { name: "Weekly" }, { name: "Weekly · Fable" }] });
    expect(readUsage).toHaveBeenCalledExactlyOnceWith({ deadline });
    const failing = createClaudeAgentRuntimeStrategy({ claudeSdkClient: { readUsage: async () => { throw new Error("CLAUDE_RUNTIME_API_KEY_UNAVAILABLE sk-ant"); } } });
    await expect(failing.readUsageLimits("claude", "/w", { deadline }))
      .resolves.toEqual({ state: "unknown", reason: "Claude usage limits could not be read" });
  });

  it("Antigravity: agy -p /usage --output-format json; a failed or hanging command ends as unknown", async () => {
    vi.stubEnv("FAKE_USAGE_FILE", path.join(USAGE_FIXTURES, "antigravity-usage.json"));
    vi.stubEnv("FAKE_RUNTIME_MODE", "");
    const agy = createAntigravityAgentRuntimeStrategy();
    await expect(agy.readUsageLimits(fakeCli, "/w", { deadline: createReadDeadline(10_000) })).resolves.toMatchObject({
      state: "read", limits: [{ name: "Gemini Models · weekly" }, { name: "Gemini Models · 5-hour" },
        { name: "Claude and GPT models · weekly", exhausted: true }, { name: "Gemini 4 Argon · weekly" }],
    });
    vi.stubEnv("FAKE_RUNTIME_MODE", "usage-signed-out");
    await expect(agy.readUsageLimits(fakeCli, "/w", { deadline: createReadDeadline(10_000) }))
      .resolves.toEqual({ state: "unknown", reason: "Antigravity usage limits could not be read" });
    vi.stubEnv("FAKE_RUNTIME_MODE", "usage-hang");
    const startedAt = Date.now();
    await expect(agy.readUsageLimits(fakeCli, "/w", { deadline: createReadDeadline(300) }))
      .resolves.toEqual({ state: "unknown", reason: "Antigravity usage limits timed out" });
    expect(Date.now() - startedAt).toBeLessThan(3_000);
  });

  it("a step stopped by its own deadline is 'timed out' even when the wall clock still shows 1 ms left (CR-002)", async () => {
    vi.stubEnv("FAKE_RUNTIME_MODE", "usage-hang");
    const deadline = createReadDeadline(200);
    const realNow = Date.now.bind(Date);
    // Timers run on the monotonic clock; Date.now() can lag the deadline by a millisecond when the kill fires (API-03b).
    const clock = vi.spyOn(Date, "now").mockImplementation(() => Math.min(realNow(), deadline.endsAt - 1));
    try {
      await expect(createAntigravityAgentRuntimeStrategy().readUsageLimits(fakeCli, "/w", { deadline }))
        .resolves.toEqual({ state: "unknown", reason: "Antigravity usage limits timed out" });
    } finally {
      clock.mockRestore();
    }
  });

  it("a sign-in or version command under a passed deadline does not start", async () => {
    useFake("GROK_BUILD_COMMAND", "grok-in");
    const expired = { deadline: createReadDeadline(0) };
    await expect(createGrokAgentRuntimeStrategy().readSignIn(fakeCli, "/w", expired)).resolves.toMatchObject({ state: "unknown" });
    await expect(createGrokAgentRuntimeStrategy().readVersion(fakeCli, expired)).resolves.toBeNull();
  });
});
