import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { GitHubAgentPackageInstaller } from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import { GitHubRepositoryClient } from "../../../src/integrations/github/github-repository-client.js";
import { GitHubRateLimitGate, setGitHubRateLimitGateForTests } from "../../../src/integrations/github/github-rate-limit-gate.js";
import { UpdatePass } from "../../../src/update-notifications/services/update-pass.js";

/**
 * AC-003 / QR-001 (REQ-002): 100 GitHub sources at the 15-minute minimum, over 4 simulated hours
 * of one-minute ticks, through the real package owner, GitHub client, transport and gate; only
 * the network is a counting fake. Automatic checks make no REST API request and at most one
 * request per source per interval; a throttling answer stops the pass and the node waits.
 */
const SOURCES = 100;
const INTERVAL_MINUTES = 15;
const HOURS = 4;
const MINUTE = 60_000;
const SHA = "d705e9a367ff6b43f00c47335890b2866dd5f4c3";
const HEAD_ANSWER = `0050${SHA} HEAD symref-target:refs/heads/main\n0000`;
const START = new Date("2026-10-20T12:00:00.000Z");

describe("automatic checks' GitHub request budget (AC-003, QR-001)", () => {
  let root: string;
  let gate: GitHubRateLimitGate;
  const inheritedRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), "update-check-budget-"));
    gate = new GitHubRateLimitGate(() => path.join(root, "rate-limit.json"));
    setGitHubRateLimitGateForTests(gate);
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(START);
  });
  afterEach(async () => {
    vi.useRealTimers();
    setGitHubRateLimitGateForTests(null);
    if (inheritedRoots === undefined) delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    else process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = inheritedRoots;
    await fs.rm(root, { recursive: true, force: true });
  });

  /** The real package owner over 100 installed GitHub packages, all checked just now. */
  const packagesWith = async (fetchImpl: typeof fetch) => {
    const registryStore = new AgentPackageRegistryStore({ getAppDataDir: () => path.join(root, "registry") });
    const installDirs: string[] = [];
    for (let index = 0; index < SOURCES; index++) {
      const installDir = path.join(root, "managed", `acme__agents-${index}`);
      await fs.mkdir(path.join(installDir, "agents", `agent-${index}`), { recursive: true });
      await fs.writeFile(path.join(installDir, "agents", `agent-${index}`, "agent.md"), "agent");
      installDirs.push(installDir);
      await registryStore.upsertManagedGitHubPackageRecord({
        normalizedSource: `acme/agents-${index}`, source: `https://github.com/acme/agents-${index}`,
        rootPath: installDir, managedInstallPath: installDir,
        sourceMetadata: { github: { defaultBranch: "main", installedRevision: SHA, latestRevision: SHA,
          latestCheckedAt: START.toISOString(), updateStatus: "UP_TO_DATE", lastError: null } },
      });
    }
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDirs.join(",");
    return new AgentPackageService({
      skillNames: { assertNoIncomingSkillNameConflicts: () => ({ conflicts: [], notices: [] }) },
      rootSettingsStore: new AgentPackageRootSettingsStore(
        { getAppDataDir: () => path.join(root, "default"), getRegisteredAgentPackageRoots: () => installDirs,
          get: (key: string, fallback?: string) => process.env[key] ?? fallback },
        { updateSetting: () => [true, "updated"] },
      ),
      registryStore,
      installer: new GitHubAgentPackageInstaller(),
      githubClient: new GitHubRepositoryClient(fetchImpl),
      reloadAgentPackageDefinitions: async () => undefined,
    });
  };

  const passFor = (packages: AgentPackageService, random: () => number) => new UpdatePass({
    packages,
    skillSources: { listGitHubSourceUpdateStates: async () => [], checkGitHubSkillSourceUpdates: vi.fn(), updateGitHubSkillSource: vi.fn() } as never,
    runtimes: null,
    notifications: { listAutomationCandidates: vi.fn(async () => []), recordOutcome: vi.fn(), reconcile: vi.fn(async () => []) },
    settings: { intervalMinutes: () => INTERVAL_MINUTES, isAutomatic: () => true },
    checks: { isEnabled: () => true },
    gate,
    random,
  });

  it("makes no REST request and at most one request per source per interval", { timeout: 120_000 }, async () => {
    const requests: { url: string; at: number }[] = [];
    const fetchImpl = (async (url: string) => {
      requests.push({ url, at: Date.now() });
      return new Response(HEAD_ANSWER, { status: 200 });
    }) as unknown as typeof fetch;
    const pass = passFor(await packagesWith(fetchImpl), () => 0.7);

    for (let minute = 1; minute <= HOURS * 60; minute++) {
      vi.setSystemTime(START.getTime() + minute * MINUTE);
      await pass.run();
    }

    expect(requests.filter((request) => new URL(request.url).hostname === "api.github.com")).toEqual([]);
    const bySource = new Map<string, number[]>();
    for (const request of requests) bySource.set(request.url, [...(bySource.get(request.url) ?? []), request.at]);
    expect(bySource.size).toBe(SOURCES);
    for (const [url, times] of bySource) {
      expect(url).toMatch(/^https:\/\/github\.com\/acme\/agents-\d+\.git\/git-upload-pack$/);
      for (let index = 1; index < times.length; index++) {
        expect(times[index]! - times[index - 1]!).toBeGreaterThanOrEqual(INTERVAL_MINUTES * MINUTE);
      }
      expect(times.length).toBeLessThanOrEqual((HOURS * 60) / INTERVAL_MINUTES);
    }
    // Every source was checked again about every interval (plus its spreading delay and tick): not a vacuous pass.
    expect(Math.min(...[...bySource.values()].map((times) => times.length))).toBeGreaterThanOrEqual(12);
  });

  it("a throttling answer stops the pass, and the node makes no request until GitHub's time", { timeout: 120_000 }, async () => {
    const requests: number[] = [];
    let throttleNext = false;
    const fetchImpl = (async () => {
      requests.push(Date.now());
      if (throttleNext) {
        throttleNext = false;
        return new Response(null, { status: 429, headers: { "retry-after": "600" } });
      }
      return new Response(HEAD_ANSWER, { status: 200 });
    }) as unknown as typeof fetch;
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const pass = passFor(await packagesWith(fetchImpl), () => 0);

    vi.setSystemTime(START.getTime() + INTERVAL_MINUTES * MINUTE);
    throttleNext = true;
    await pass.run();
    expect(requests).toHaveLength(1);

    for (let minute = 1; minute < 10; minute++) {
      vi.setSystemTime(START.getTime() + (INTERVAL_MINUTES + minute) * MINUTE);
      await pass.run();
    }
    expect(requests).toHaveLength(1);

    vi.setSystemTime(START.getTime() + (INTERVAL_MINUTES + 10) * MINUTE + 1);
    await pass.run();
    expect(requests).toHaveLength(SOURCES);
    warn.mockRestore();
  });
});
