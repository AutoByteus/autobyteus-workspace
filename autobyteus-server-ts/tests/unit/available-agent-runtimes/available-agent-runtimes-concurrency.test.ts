import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import type { ModelInfo } from "autobyteus-ts/llm/models.js";
import { CodexAppServerClientManager } from "../../../src/runtime-management/codex/client/codex-app-server-client-manager.js";
import type { CodexAppServerClient } from "../../../src/runtime-management/codex/client/codex-app-server-client.js";
import { AgentRuntimeSignInReader } from "../../../src/runtime-management/agent-runtimes/agent-runtime-sign-in-reader.js";
import { AvailableAgentRuntimesService } from "../../../src/available-agent-runtimes/available-agent-runtimes-service.js";
import type { ExternalAgentRuntimeEntry } from "../../../src/available-agent-runtimes/available-agent-runtimes-report.js";
import { createCodexAgentRuntimeStrategy } from "../../../src/runtime-management/agent-runtimes/strategies/codex-agent-runtime-strategy.js";
import { CodexModelCatalog } from "../../../src/llm-management/services/codex-model-catalog.js";
import { RuntimeKind } from "../../../src/runtime-management/runtime-kind-enum.js";

/**
 * SR-006 CR-004: one Codex client hold per read and single-flight reads, against the real
 * `CodexAppServerClientManager` (its refusal while a generation closes, `codex-app-server-client-manager.ts:30`) with a
 * scripted app-server client in place of the process. AC-013.
 */
const FIXTURES = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../fixtures/usage-limits");
const RATE_LIMITS = JSON.parse(fs.readFileSync(path.join(FIXTURES, "codex-rate-limits-exhausted.json"), "utf8")) as unknown;

/** A scripted app-server: answers after `delayMs`, takes `closeMs` to close, counts starts and closes. */
const scriptedClients = (input: { delayMs?: number; closeMs?: number } = {}) => {
  const counts = { started: 0, closed: 0 };
  const createClient = (): CodexAppServerClient => {
    let listener: ((error: Error | null) => void) | null = null;
    const answer = (method: string): unknown => method === "account/read" ? { account: { type: "chatgpt" }, requiresOpenaiAuth: true }
      : method === "account/rateLimits/read" ? RATE_LIMITS
        : method === "model/list" ? { data: [{ id: "gpt-5.6", model: "gpt-5.6", displayName: "GPT-5.6" }], nextCursor: null } : {};
    return {
      start: async () => { counts.started += 1; },
      request: async (method: string) => { await new Promise((done) => setTimeout(done, input.delayMs ?? 5)); return answer(method); },
      notify: () => undefined,
      onClose: (callback: (error: Error | null) => void) => { listener = callback; return () => { listener = null; }; },
      close: async () => {
        await new Promise((done) => setTimeout(done, input.closeMs ?? 20));
        counts.closed += 1;
        listener?.(null);
      },
    } as unknown as CodexAppServerClient;
  };
  return { counts, manager: new CodexAppServerClientManager({ createClient }) };
};

const serviceOver = (manager: CodexAppServerClientManager) => {
  const codex = { ...createCodexAgentRuntimeStrategy({ codexClientManager: manager }), readVersion: async () => "0.164.0" };
  const catalog = new CodexModelCatalog(manager);
  return new AvailableAgentRuntimesService({
    strategies: [codex],
    signInReader: new AgentRuntimeSignInReader([codex]),
    modelCatalog: {
      runtimeModelSelectionCatalog: async (kind, workspace, options = {}) => {
        const offeredModels: ModelInfo[] = kind === RuntimeKind.CODEX_APP_SERVER ? await catalog.listModels(workspace, options) : [];
        return { offeredModels, findExactCurrent: () => null };
      },
      reloadProviderModelCatalog: async () => { throw new Error("not used"); },
    },
    providerCredentials: { listProviderCredentialSettings: async () => [] },
    providerUsageReaders: { readerFor: () => null },
    homeDirectory: "/home/test",
  });
};

const codexOf = (report: { agentRuntimes: readonly unknown[] }) =>
  report.agentRuntimes.find((entry) => (entry as { runtime: string }).runtime === "codex_app_server") as ExternalAgentRuntimeEntry;

describe("available agent runtimes: concurrent reads and the Codex client (CR-004, AC-013)", () => {
  it("one read starts the home-folder app-server once and closes it once, after the answer", async () => {
    const { counts, manager } = scriptedClients();
    const report = await serviceOver(manager).read();
    expect(Array.isArray(codexOf(report).models)).toBe(true);
    expect(Array.isArray(codexOf(report).limits)).toBe(true);
    expect(counts.started).toBe(1);
    await vi.waitFor(() => expect(counts.closed).toBe(1));
  });

  it("concurrent callers share one read: every caller gets Codex models and limits", async () => {
    const { counts, manager } = scriptedClients();
    const service = serviceOver(manager);
    const reports = await Promise.all([service.read(), service.read(), service.read(), service.read()]);
    expect(new Set(reports).size).toBe(1);
    for (const report of reports) {
      expect(codexOf(report).models).toEqual([expect.objectContaining({ id: "gpt-5.6" })]);
      expect(codexOf(report).limits).toEqual([expect.objectContaining({ name: "Weekly" })]);
    }
    expect(counts.started).toBe(1);
  });

  it("back-to-back reads never meet the previous read's closing app-server", async () => {
    const { manager } = scriptedClients({ closeMs: 150 });
    const service = serviceOver(manager);
    for (let round = 0; round < 5; round += 1) {
      const [first, second] = await Promise.all([service.read(), service.read().then(() => service.read())]);
      for (const report of [first, second]) {
        expect(Array.isArray(codexOf(report).models), `round ${round} models`).toBe(true);
        expect(Array.isArray(codexOf(report).limits), `round ${round} limits`).toBe(true);
      }
    }
  });

  it("the answer arrives before a slow release finishes; a read during the release gets that answer", async () => {
    let finishRelease!: () => void;
    const releaseDone = new Promise<void>((done) => { finishRelease = done; });
    const strategy = {
      ...createCodexAgentRuntimeStrategy({ codexClientManager: { beginAcquire: vi.fn() } as never }),
      readVersion: async () => "0.164.0",
      readSignIn: async () => ({ state: "signedIn" as const }),
      readUsageLimits: async () => ({ state: "not_reported" as const }),
      holdClient: vi.fn(() => ({ release: () => releaseDone })),
    };
    const service = new AvailableAgentRuntimesService({
      strategies: [strategy],
      signInReader: new AgentRuntimeSignInReader([strategy]),
      modelCatalog: {
        runtimeModelSelectionCatalog: async () => ({ offeredModels: [{ model_identifier: "m", display_name: "M" } as ModelInfo], findExactCurrent: () => null }),
        reloadProviderModelCatalog: async () => { throw new Error("not used"); },
      },
      providerCredentials: { listProviderCredentialSettings: async () => [] },
      providerUsageReaders: { readerFor: () => null },
    });
    const first = await service.read();
    expect(strategy.holdClient).toHaveBeenCalledExactlyOnceWith(expect.any(String));
    expect(await service.read()).toBe(first);
    finishRelease();
    await vi.waitFor(async () => expect(await service.read()).not.toBe(first));
    expect(strategy.holdClient).toHaveBeenCalledTimes(2);
  });

  it("Codex holdClient is a lease without acquire; a closing generation gives no hold and the read goes on", async () => {
    const release = vi.fn(async () => undefined);
    const acquire = vi.fn();
    const beginAcquire = vi.fn(() => ({ acquire, release }));
    const strategy = createCodexAgentRuntimeStrategy({ codexClientManager: { beginAcquire } as never });
    const hold = strategy.holdClient!("/home/test");
    expect(beginAcquire).toHaveBeenCalledExactlyOnceWith("/home/test");
    expect(acquire).not.toHaveBeenCalled();
    await hold!.release();
    expect(release).toHaveBeenCalledOnce();
    const closing = createCodexAgentRuntimeStrategy({ codexClientManager: {
      beginAcquire: () => { throw new Error("Codex client generation for '/home/test' has unresolved cleanup."); },
    } as never });
    expect(closing.holdClient!("/home/test")).toBeNull();
  });
});
