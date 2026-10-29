import "reflect-metadata";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AgentRunManager } from "../../../../src/agent-execution/services/agent-run-manager.js";
import { AgentRuntimesResolver } from "../../../../src/api/graphql/types/agent-runtimes.js";
import { composeAgentRuntimeStatus } from "../../../../src/compositions/agent-runtime-status-composition.js";
import {
  AgentRuntimeStatusService, configureAgentRuntimeStatusService, getAgentRuntimeStatusService,
} from "../../../../src/runtime-management/agent-runtimes/agent-runtime-status-service.js";
import type { AgentRuntimeStrategy } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-strategy.js";
import type { AgentRuntimeKind } from "../../../../src/runtime-management/agent-runtimes/agent-runtime-types.js";
import { RuntimeKind } from "../../../../src/runtime-management/runtime-kind-enum.js";

const strategy = (runtimeKind: AgentRuntimeKind, version: string | null): AgentRuntimeStrategy => ({
  runtimeKind,
  signInRoute: runtimeKind === RuntimeKind.CODEX_APP_SERVER ? "browser" : "commandLine",
  installInstructionsUrl: `https://install.example/${runtimeKind}`,
  resolveExecutable: () => `/usr/local/bin/${runtimeKind}`,
  readVersion: async () => version,
  readLatestVersion: async () => "2.0.0",
  readSignIn: async () => ({ state: "signedIn" }),
  readUsageLimits: async () => ({ state: "not_reported" }),
  updateArgv: (executable) => [executable, "update"],
  ...(runtimeKind === RuntimeKind.CODEX_APP_SERVER ? { signInArgv: (executable: string) => [executable, "login"] } : {}),
});

let handle: { close(): Promise<void> } | null = null;
afterEach(async () => {
  await handle?.close();
  handle = null;
  vi.restoreAllMocks();
});

describe("AgentRuntimesResolver", () => {
  it("maps the rows, never carrying sign-in detail, and turns refusals into coded GraphQL errors", async () => {
    const service = new AgentRuntimeStatusService({
      strategies: [strategy(RuntimeKind.CODEX_APP_SERVER as AgentRuntimeKind, "1.0.0"), strategy(RuntimeKind.GROK_BUILD as AgentRuntimeKind, null)],
      signInReader: { read: async () => ({ state: "signedOut", detail: "SECRET-DETAIL" }) },
      countRunningAgents: () => 0,
      createProcess: () => {
        let end!: () => void;
        const finished = new Promise((resolve) => {
          end = () => resolve({ exitCode: null, output: "", cancelled: true, timedOut: false });
        });
        return { finished, latestLine: () => null, cancel: () => end() } as never;
      },
    });
    handle = configureAgentRuntimeStatusService(service);
    const resolver = new AgentRuntimesResolver();

    await expect(resolver.checkAgentRuntimes()).resolves.toBe(true);
    await new Promise((resolve) => setTimeout(resolve, 0));
    const [codex, grok] = resolver.agentRuntimes();
    expect(codex).toMatchObject({
      runtimeKind: "codex_app_server", installed: true, installedVersion: "1.0.0",
      updates: { state: "UPDATE_AVAILABLE", latestVersion: "2.0.0" },
      account: { state: "SIGNED_OUT" }, signInRoute: "BROWSER", runningAgentCount: 0, operation: null,
    });
    expect(grok).toMatchObject({
      installed: false, installedVersion: null, updates: { state: "NOT_CHECKED" },
      account: { state: "NOT_APPLICABLE" }, signInRoute: "COMMAND_LINE", installInstructionsUrl: "https://install.example/grok_build",
    });
    expect(JSON.stringify(resolver.agentRuntimes())).not.toContain("SECRET-DETAIL");

    await resolver.updateAgentRuntime("codex_app_server");
    expect(resolver.agentRuntimes()[0]!.operation).toEqual({
      kind: "UPDATE", state: "RUNNING", command: "codex_app_server update", step: null,
      fromVersion: "1.0.0", toVersion: null, error: null,
    });
    await expect(resolver.updateAgentRuntime("codex_app_server")).rejects.toMatchObject({ extensions: { code: "AGENT_RUNTIME_BUSY" } });
    await expect(resolver.startAgentRuntimeSignIn("grok_build")).rejects.toMatchObject({ extensions: { code: "AGENT_RUNTIME_SIGN_IN_UNSUPPORTED" } });
    await expect(resolver.updateAgentRuntime("autobyteus")).rejects.toMatchObject({ extensions: { code: "AGENT_RUNTIME_UNKNOWN" } });
    await expect(resolver.cancelAgentRuntimeSignIn("not-a-runtime")).rejects.toMatchObject({ extensions: { code: "AGENT_RUNTIME_UNKNOWN" } });
  });

  it("answers whether the node's runtimes can open a browser on its own desktop, from the status service", async () => {
    const resolver = new AgentRuntimesResolver();
    for (const signInBrowserAvailable of [true, false]) {
      handle = configureAgentRuntimeStatusService(new AgentRuntimeStatusService({
        strategies: [], signInReader: { read: async () => ({ state: "signedIn" }) }, countRunningAgents: () => 0, signInBrowserAvailable,
      }));
      expect(resolver.agentRuntimeSignInBrowserAvailable()).toBe(signInBrowserAvailable);
      await handle.close();
      handle = null;
    }
  });
});

describe("composeAgentRuntimeStatus", () => {
  it("counts process agents and Application agents together, per runtime", () => {
    const runs = new Map([["a", RuntimeKind.CLAUDE_AGENT_SDK], ["b", RuntimeKind.CODEX_APP_SERVER]]);
    vi.spyOn(AgentRunManager, "getInstance").mockReturnValue({
      listActiveRuns: () => [...runs.keys()],
      getActiveRun: (runId: string) => ({ runtimeKind: runs.get(runId) }),
    } as never);
    const countByRuntimeKind = vi.fn((kind: string) => (kind === RuntimeKind.CLAUDE_AGENT_SDK ? 2 : 0));
    handle = composeAgentRuntimeStatus({
      codexClientManager: { beginAcquire: vi.fn() } as never,
      applicationActiveAgentRuns: { countByRuntimeKind },
    });
    const counts = Object.fromEntries(getAgentRuntimeStatusService().list().map((row) => [row.runtimeKind, row.runningAgentCount]));
    expect(counts).toEqual({ codex_app_server: 1, claude_agent_sdk: 3, antigravity_cli: 0, grok_build: 0 });
  });
});
