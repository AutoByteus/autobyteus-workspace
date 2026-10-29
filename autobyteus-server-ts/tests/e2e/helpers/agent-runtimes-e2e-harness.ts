import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { CODEX_LATEST_RELEASE_URL, codexLatestReleaseResponse } from "./github-head-read-stub.js";

/**
 * Shared pieces of the Settings → Agent Runtimes server E2E files (ticket runtime-lifecycle-review): the scripted
 * runtime CLIs (`tests/fixtures/agent-runtimes-fake-cli.mjs`), a stub for the three vendor latest-version web
 * sources inside the test process, and the `agentRuntimes` GraphQL document.
 *
 * The fake CLIs are created by each test file in `vi.hoisted` (the Antigravity command is read when its module
 * loads) through `prepareFakeRuntimes`.
 */
export const FAKE_RUNTIME_NAMES = ["codex", "claude", "agy", "grok"] as const;
export type FakeRuntimeName = (typeof FAKE_RUNTIME_NAMES)[number];

const RUNTIME_ENV_KEYS = ["CODEX_APP_SERVER_COMMAND", "CLAUDE_CODE_EXECUTABLE_PATH", "ANTIGRAVITY_CLI_COMMAND",
  "GROK_BUILD_COMMAND", "FAKE_RUNTIME_STATE_DIR", "CLAUDE_CONFIG_DIR"] as const;

/**
 * Creates a temp root with the four fakes (`bin/<name>` links to the fixture), their state folder and a data
 * folder, and points the runtime overrides at them. Call it from `vi.hoisted` (dynamic import), before any server
 * module loads. `grokInstalled: false` points Grok at a missing file, as for a runtime that is not installed.
 */
export const prepareFakeRuntimes = (input: Readonly<{ label: string; grokInstalled: boolean }>) => {
  const root = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), `${input.label}-`)));
  const fixture = path.resolve(process.cwd(), "tests/fixtures/agent-runtimes-fake-cli.mjs");
  const binDir = path.join(root, "bin");
  const stateDir = path.join(root, "state");
  const dataDir = path.join(root, "data");
  for (const dir of [binDir, stateDir, dataDir, path.join(stateDir, "claude-config")]) fs.mkdirSync(dir, { recursive: true });
  for (const name of FAKE_RUNTIME_NAMES) fs.symlinkSync(fixture, path.join(binDir, name));
  const previous = Object.fromEntries(RUNTIME_ENV_KEYS.map((key) => [key, process.env[key]]));
  process.env.CODEX_APP_SERVER_COMMAND = path.join(binDir, "codex");
  process.env.CLAUDE_CODE_EXECUTABLE_PATH = path.join(binDir, "claude");
  process.env.ANTIGRAVITY_CLI_COMMAND = path.join(binDir, "agy");
  process.env.GROK_BUILD_COMMAND = input.grokInstalled ? path.join(binDir, "grok") : path.join(root, "not-installed", "grok");
  process.env.FAKE_RUNTIME_STATE_DIR = stateDir;
  process.env.CLAUDE_CONFIG_DIR = path.join(stateDir, "claude-config");
  return {
    root, binDir, stateDir, dataDir,
    /** Restores the overrides and removes the temp root. */
    dispose: () => {
      for (const [key, value] of Object.entries(previous)) {
        if (value === undefined) delete process.env[key]; else process.env[key] = value;
      }
      fs.rmSync(root, { recursive: true, force: true });
    },
  };
};

export const fakeRuntimeState = (stateDir: string) => ({
  set: (file: string, value: string) => fs.writeFileSync(path.join(stateDir, file), value),
  read: (file: string): string | null => {
    try { return fs.readFileSync(path.join(stateDir, file), "utf8").trim(); } catch { return null; }
  },
  pid: (name: FakeRuntimeName, label: "login" | "update"): number | null => {
    try { return Number(fs.readFileSync(path.join(stateDir, `${name}-${label}.pid`), "utf8").trim()) || null; } catch { return null; }
  },
  clearPid: (name: FakeRuntimeName, label: "login" | "update") => fs.rmSync(path.join(stateDir, `${name}-${label}.pid`), { force: true }),
  /** Every secret-looking value the fakes printed (sign-in URLs, codes, account e-mails). */
  emittedSecrets: (): string[] => {
    try {
      return [...new Set(fs.readFileSync(path.join(stateDir, "emitted-secrets.log"), "utf8").split("\n").filter(Boolean))];
    } catch { return []; }
  },
});

export const isProcessAlive = (pid: number | null): boolean => {
  if (!pid) return false;
  try { process.kill(pid, 0); return true; } catch { return false; }
};

/** Codex's newest version comes from GitHub's latest-release redirect (quota-free, update-checks-and-auto-updates). */
export const CODEX_RELEASES_URL = CODEX_LATEST_RELEASE_URL;
export const CLAUDE_RELEASES_URL = "https://downloads.claude.ai/claude-code-releases/latest";
export const ANTIGRAVITY_MANIFEST_PREFIX = "https://antigravity-cli-auto-updater-974169037036.us-central1.run.app/manifests/";

/** For Codex, `body` is the release tag GitHub redirects to when `status` is 302; another status is answered as it is. */
type SourceAnswer = { status: number; body: string };

/**
 * Replaces `fetch` inside this test process for the three vendor sources only; every other URL (the test's own
 * requests to the server) goes to the real `fetch`. Each answer can be changed between checks, and the
 * Antigravity manifest can be held back to make that row slow.
 */
export const installVendorSourceStub = () => {
  const realFetch = globalThis.fetch;
  const answers: Record<"codex" | "claude" | "antigravity", SourceAnswer> = {
    codex: { status: 302, body: "rust-v0.163.0" },
    claude: { status: 200, body: "2.1.304\n" },
    antigravity: { status: 200, body: JSON.stringify({ version: "1.4.3", url: "https://example.invalid/agy.tar.gz", sha256: "0" }) },
  };
  const requests: string[] = [];
  let releaseAntigravity: (() => void) | null = null;
  let antigravityHeld: Promise<void> | null = null;
  const respond = (answer: SourceAnswer) => new Response(answer.body, { status: answer.status });
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    const url = typeof input === "string" ? input : input instanceof URL ? input.href : input.url;
    if (url === CODEX_RELEASES_URL) {
      requests.push(url);
      return answers.codex.status === 302 ? codexLatestReleaseResponse(answers.codex.body) : respond(answers.codex);
    }
    if (url.startsWith("https://downloads.claude.ai/claude-code-releases/")) { requests.push(url); return respond(answers.claude); }
    if (url.startsWith(ANTIGRAVITY_MANIFEST_PREFIX)) {
      requests.push(url);
      if (antigravityHeld) await antigravityHeld;
      return respond(answers.antigravity);
    }
    return realFetch(input, init);
  }) as typeof fetch;
  return {
    realFetch,
    answers,
    requests,
    holdAntigravity: () => { antigravityHeld = new Promise<void>((resolve) => { releaseAntigravity = resolve; }); },
    releaseAntigravity: () => { releaseAntigravity?.(); antigravityHeld = null; releaseAntigravity = null; },
    restore: () => { globalThis.fetch = realFetch; },
  };
};

export const AGENT_RUNTIMES_QUERY = `query AgentRuntimes {
  agentRuntimes {
    runtimeKind installed installedVersion
    updates { state latestVersion }
    account { state }
    signInRoute installInstructionsUrl runningAgentCount
    operation { kind state command step fromVersion toVersion error }
    checkedAt
  }
}`;

export type AgentRuntimeRow = {
  runtimeKind: string;
  installed: boolean;
  installedVersion: string | null;
  updates: { state: string; latestVersion: string | null };
  account: { state: string };
  signInRoute: string;
  installInstructionsUrl: string;
  runningAgentCount: number;
  operation: null | {
    kind: string; state: string; command: string | null; step: string | null;
    fromVersion: string | null; toVersion: string | null; error: string | null;
  };
  checkedAt: string | null;
};

/** GraphQL over the server's real HTTP endpoint; every raw response body is kept for the secret scan. */
export const createGraphqlClient = (url: URL, realFetch: typeof fetch) => {
  const responses: string[] = [];
  const post = async (query: string, variables?: Record<string, unknown>) => {
    const response = await realFetch(new URL("/graphql", url), {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ query, variables }),
    });
    const text = await response.text();
    responses.push(text);
    return JSON.parse(text) as { data?: any; errors?: Array<{ message: string; extensions?: { code?: string } }> };
  };
  const rows = async (): Promise<Record<string, AgentRuntimeRow>> => {
    const result = await post(AGENT_RUNTIMES_QUERY);
    if (result.errors?.length) throw new Error(JSON.stringify(result.errors));
    return Object.fromEntries((result.data.agentRuntimes as AgentRuntimeRow[]).map((row) => [row.runtimeKind, row]));
  };
  const order = async (): Promise<string[]> => {
    const result = await post(AGENT_RUNTIMES_QUERY);
    return (result.data.agentRuntimes as AgentRuntimeRow[]).map((row) => row.runtimeKind);
  };
  const mutate = (field: "checkAgentRuntimes" | "updateAgentRuntime" | "startAgentRuntimeSignIn" | "cancelAgentRuntimeSignIn", runtimeKind?: string) =>
    post(runtimeKind === undefined
      ? `mutation { ${field} }`
      : `mutation Action($runtimeKind: String!) { ${field}(runtimeKind: $runtimeKind) }`, runtimeKind === undefined ? undefined : { runtimeKind });
  return { post, rows, order, mutate, responses };
};
