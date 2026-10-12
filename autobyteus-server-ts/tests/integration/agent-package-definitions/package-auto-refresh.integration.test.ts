import fs from "node:fs/promises";
import { existsSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import type { AppConfig } from "../../../src/config/app-config.js";
import type { ApplicationBundleService } from "../../../src/application-bundles/services/application-bundle-service.js";
import { createHostDefinitionServices, type HostDefinitionServices } from "../../../src/compositions/host-definition-services.js";
import { composeAgentPackageDefinitionFeed, type AgentPackageDefinitionFeed } from "../../../src/compositions/agent-package-definition-feed-composition.js";
import { CollaboratorCandidatePolicy } from "../../../src/agent-collaboration/collaborators/collaborator-candidate-policy.js";
import { createCollaboratorDefinitionCatalog } from "../../../src/agent-collaboration/collaborators/collaborator-definition-catalog.js";
import type { CollaboratorRootPort } from "../../../src/agent-collaboration/collaborators/collaborator-root-port.js";
import { FlatTeamDefinitionResolver } from "../../../src/agent-team-definition/services/flat-team-definition-resolver.js";
import { buildTeamLocalAgentDefinitionId } from "../../../src/agent-team-definition/utils/team-local-definition-id.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import type { PackageFolderWatchFactory } from "../../../src/agent-package-definitions/monitor/agent-package-folder-watcher.js";

/**
 * The approved journey on the real server read path: definition files change on disk inside a
 * registered package (as the Agent Package Creator's file tools do), the package folder watcher detects
 * them, and the next `list_available_agents` / delegation / launch admission uses the current
 * definitions. Only the run itself is not started.
 */

type Frame = { type: string; changedLists?: string[] };

let base: string;
let dataDir: string;
let packageRoot: string;
let registered: string[];
let host: HostDefinitionServices | null = null;
let feed: AgentPackageDefinitionFeed | null = null;
let frames: Frame[];

const AC_BOUND_MS = 5000;

const write = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, content, "utf8");
};
const agentMd = (name: string, instructions: string) => `---\nname: ${name}\ndescription: ${name} agent\n---\n\n${instructions}\n`;
const writeAgent = async (dir: string, name: string, instructions = `${name} instructions`) => {
  await write(path.join(dir, "agent.md"), agentMd(name, instructions));
  await write(path.join(dir, "agent-config.json"), JSON.stringify({ toolNames: [], skillNames: [] }));
};
const teamFiles = async (dir: string, name: string, members: Array<{ memberName: string; ref: string; refScope: string }>,
  handoffs: Array<{ from: string; to: string; rules: string[] }> = []) => {
  await write(path.join(dir, "team.md"), `---\nname: ${name}\ndescription: ${name} team\n---\n\nCoordinate ${name}.\n`);
  await write(path.join(dir, "team-config.json"), JSON.stringify({
    coordinatorMemberName: members[0]!.memberName, members, handoffs, avatarUrl: null, defaultLaunchConfig: null,
  }));
};

const waitFor = async <T>(read: () => Promise<T>, accept: (value: T) => boolean, timeoutMs = AC_BOUND_MS): Promise<{ value: T; elapsedMs: number }> => {
  const started = Date.now();
  for (;;) {
    const value = await read();
    if (accept(value)) return { value, elapsedMs: Date.now() - started };
    if (Date.now() - started > timeoutMs) throw new Error(`Condition not met within ${timeoutMs} ms; last value: ${JSON.stringify(value)}`);
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const port: CollaboratorRootPort = {
  rootKind: "agent",
  isApplicationBound: false,
  rootLaunchConfiguration: () => ({}) as never,
  ownDefinition: () => null,
  inRunPlacementsByDefinition: () => new Map(),
  collaborators: () => [],
  addressesInUse: () => new Set(),
};

const services = () => host!;
const policy = () => new CollaboratorCandidatePolicy(createCollaboratorDefinitionCatalog({
  agents: services().agentDefinitionService,
  teams: services().agentTeamDefinitionService,
}));
/** What `list_available_agents` returns: the eligible names, agents and Teams. */
const listAvailable = async () => (await policy().listEligible(port)).map((entry) => `${entry.kind}:${entry.name}`);
const definitionFrames = () => frames.filter((frame) => frame.type === "agent_package_definitions_changed");

const appConfig = (): AppConfig => ({
  getAppDataDir: () => dataDir,
  getAgentsDir: () => path.join(dataDir, "agents"),
  getAgentTeamsDir: () => path.join(dataDir, "agent-teams"),
  getAgentOrgsDir: () => path.join(dataDir, "agent-orgs"),
  getAgentMdPath: (id: string) => path.join(dataDir, "agents", id, "agent.md"),
  getAgentConfigPath: (id: string) => path.join(dataDir, "agents", id, "agent-config.json"),
  getRegisteredAgentPackageRoots: () => [...registered],
  getAdditionalAgentPackageRoots: () => registered.filter((root) => existsSync(root)),
  get: (key: string, fallback?: string) => key === "AUTOBYTEUS_AGENT_PACKAGE_ROOTS" ? registered.join(",") : fallback,
}) as unknown as AppConfig;

const bundleService = {
  listApplicationOwnedAgentSources: async () => [],
  getApplicationOwnedAgentSourceById: async () => null,
  listApplicationOwnedTeamSources: async () => [],
  getApplicationOwnedTeamSourceById: async () => null,
} as unknown as ApplicationBundleService;

const start = async (options: { createWatcher?: PackageFolderWatchFactory } = {}) => {
  host = createHostDefinitionServices({ appConfig: appConfig(), bundleService });
  feed = await composeAgentPackageDefinitionFeed({ reloader: host.agentPackageDefinitions.reloader, createWatcher: options.createWatcher });
  feed.hub.connect({ send: (data) => frames.push(JSON.parse(data) as Frame), close: () => undefined });
  await host.definitionAdmissionService.scan();
  await feed.watcher.whenReady();
  // Directory watches on macOS start slightly after the watcher reports ready.
  await sleep(300);
  frames.length = 0;
};

beforeEach(async () => {
  base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "apar-integration-")));
  dataDir = path.join(base, "server-data");
  packageRoot = path.join(base, "autobyteus-agents");
  registered = [packageRoot];
  frames = [];
  await fs.mkdir(path.join(dataDir, "agents"), { recursive: true });
  await fs.mkdir(path.join(packageRoot, "agents"), { recursive: true });
  await fs.mkdir(path.join(packageRoot, "agent-teams"), { recursive: true });
  await writeAgent(path.join(packageRoot, "agents", "planner"), "Planner");
});

afterEach(async () => {
  await feed?.close();
  host?.close();
  feed = null;
  host = null;
  await fs.rm(base, { recursive: true, force: true });
});

describe("package auto-refresh: the next delegation sees current definitions", { timeout: 30_000 }, () => {
  it("AC-001/AC-015(a): a new agent and a new Team written on disk are listed and delegable within 5 s, without Reload", async () => {
    await start();
    await writeAgent(path.join(packageRoot, "agents", "scout"), "Scout");
    await teamFiles(path.join(packageRoot, "agent-teams", "squad"), "Squad", [{ memberName: "lead", ref: "scout", refScope: "shared" }]);

    const listed = await waitFor(listAvailable, (names) => names.includes("agent:Scout") && names.includes("agent_team:Squad"));
    expect(listed.elapsedMs).toBeLessThan(AC_BOUND_MS);
    expect((await policy().requireAdmissible(port, { kind: "agent", definitionId: "scout" })).definition.name).toBe("Scout");
    expect((await policy().requireAdmissible(port, { kind: "agent_team", definitionId: "squad" })).definition.name).toBe("Squad");
    expect((await services().definitionAdmissionService.requireAvailable("agent_team", "squad")).status).toBe("available");
    expect(definitionFrames().some((frame) => frame.changedLists?.includes("agents") && frame.changedLists.includes("agent_teams"))).toBe(true);
  });

  it("AC-016: a lookup inside the settle window applies the detected change first", async () => {
    await start();
    await writeAgent(path.join(packageRoot, "agents", "fresh"), "Fresh");
    await sleep(200); // detected (milliseconds) but well inside the 1 s settle window
    expect(definitionFrames()).toEqual([]);
    expect(await listAvailable()).toContain("agent:Fresh");
    expect((await policy().requireAdmissible(port, { kind: "agent", definitionId: "fresh" })).definition.instructions).toBe("Fresh instructions\n");
  });

  it("AC-002/AC-015(b)/QR-004: edits reach every reader; other agents never disappear during the refresh", async () => {
    for (let index = 0; index < 10; index += 1) await writeAgent(path.join(packageRoot, "agents", `worker-${index}`), `Worker ${index}`);
    await teamFiles(path.join(packageRoot, "agent-teams", "crew"), "Crew", [{ memberName: "lead", ref: "planner", refScope: "shared" }]);
    await start();

    let minimumSeen = Number.POSITIVE_INFINITY;
    let reading = true;
    const reader = (async () => {
      while (reading) {
        minimumSeen = Math.min(minimumSeen, (await services().agentDefinitionService.getAllAgentDefinitions()).length);
        await sleep(5);
      }
    })();

    await writeAgent(path.join(packageRoot, "agents", "planner"), "Planner", "Plan with the new playbook.");
    await teamFiles(path.join(packageRoot, "agent-teams", "crew"), "Crew", [
      { memberName: "lead", ref: "planner", refScope: "shared" },
      { memberName: "helper", ref: "worker-1", refScope: "shared" },
    ], [{ from: "/lead", to: "/helper", rules: ["Hand over drafts."] }]);

    await waitFor(() => services().agentDefinitionService.getAgentDefinitionById("planner"),
      (definition) => definition?.instructions === "Plan with the new playbook.\n");
    const team = await waitFor(() => services().agentTeamDefinitionService.getDefinitionById("crew"), (definition) => definition?.nodes.length === 2);
    reading = false;
    await reader;

    expect(minimumSeen).toBe(11);
    const topology = await new FlatTeamDefinitionResolver().resolve({
      rootDefinition: team.value!,
      lookup: { getAgentById: (id) => services().agentDefinitionService.getAgentDefinitionById(id) },
    });
    expect(topology).toBeTruthy();
    expect(team.value!.handoffs).toEqual([{ from: "/lead", to: "/helper", rules: ["Hand over drafts."] }]);
    expect((await services().definitionAdmissionService.requireAvailable("agent_team", "crew")).status).toBe("available");
  });

  it("AC-003/AC-015(c): a deleted agent or Team is gone and delegation gets the existing not-found result", async () => {
    await teamFiles(path.join(packageRoot, "agent-teams", "crew"), "Crew", [{ memberName: "lead", ref: "planner", refScope: "shared" }]);
    await start();
    expect(await listAvailable()).toEqual(expect.arrayContaining(["agent:Planner", "agent_team:Crew"]));

    await fs.rm(path.join(packageRoot, "agent-teams", "crew"), { recursive: true });
    await fs.rm(path.join(packageRoot, "agents", "planner"), { recursive: true });
    await waitFor(listAvailable, (names) => !names.includes("agent:Planner") && !names.includes("agent_team:Crew"));
    await expect(policy().requireAdmissible(port, { kind: "agent", definitionId: "planner" }))
      .rejects.toMatchObject({ code: "COLLABORATOR_MENTION_INVALID" });
    await expect(services().definitionAdmissionService.requireAvailable("agent_team", "crew"))
      .rejects.toMatchObject({ code: "DEFINITION_REFERENCE_UNRESOLVED" });
  });

  it("AC-004: a broken edit keeps the last good agent usable with an issue; fixing it clears the issue", async () => {
    await start();
    const configPath = path.join(packageRoot, "agents", "planner", "agent-config.json");
    await write(configPath, "{ \"toolNames\": [");
    await waitFor(() => services().agentDefinitionService.getLoadIssue("planner"), (issue) => issue !== null);
    expect(await services().agentDefinitionService.getLoadIssue("planner")).toMatchObject({
      code: "DEFINITION_CONTRACT_INVALID", definitionPath: configPath, packageRoot,
    });
    expect(await listAvailable()).toContain("agent:Planner");
    expect((await services().agentDefinitionService.getAgentDefinitionById("planner"))?.name).toBe("Planner");

    await write(configPath, JSON.stringify({ toolNames: [] }));
    const cleared = await waitFor(() => services().agentDefinitionService.getLoadIssue("planner"), (issue) => issue === null);
    expect(cleared.elapsedMs).toBeLessThan(AC_BOUND_MS);
  });

  it("AC-005: a new invalid Team is unavailable with a diagnostic and other Teams are unaffected", async () => {
    await teamFiles(path.join(packageRoot, "agent-teams", "crew"), "Crew", [{ memberName: "lead", ref: "planner", refScope: "shared" }]);
    await start();
    await write(path.join(packageRoot, "agent-teams", "broken", "team.md"), "no front matter");
    await write(path.join(packageRoot, "agent-teams", "broken", "team-config.json"), "{}");
    const result = await waitFor(async () => (await services().definitionAdmissionService.scan()).find((row) => row.definitionId === "broken"),
      (row) => row?.status === "unavailable");
    expect(result.value).toMatchObject({ code: "DEFINITION_CONTRACT_INVALID", definitionPath: path.join(packageRoot, "agent-teams", "broken", "team.md") });
    expect((await services().definitionAdmissionService.requireAvailable("agent_team", "crew")).status).toBe("available");
  });

  it("AC-006: a 50-file burst is coalesced into a bounded number of publications", async () => {
    await start();
    const burstStarted = Date.now();
    await Promise.all(Array.from({ length: 25 }, (_, index) => writeAgent(path.join(packageRoot, "agents", `bulk-${index}`), `Bulk ${index}`)));
    const burstEnded = Date.now();
    const all = await waitFor(async () => {
      await sleep(100);
      return definitionFrames().length > 0 ? (await services().agentDefinitionService.getAllAgentDefinitions()).length : 0;
    }, (count) => count === 26);
    await sleep(1500);
    expect(Date.now() - burstEnded - 1500 - all.elapsedMs).toBeLessThan(AC_BOUND_MS);
    expect(definitionFrames().length).toBeGreaterThanOrEqual(1);
    expect(definitionFrames().length).toBeLessThanOrEqual(3);
    expect(burstEnded - burstStarted).toBeLessThan(AC_BOUND_MS);
  });

  it("AC-007: skill edits inside a package produce no reload and no notification", async () => {
    await start();
    const skillDir = path.join(packageRoot, "agents", "planner", "skills", "research");
    await write(path.join(skillDir, "SKILL.md"), "---\nname: research\n---\nBody");
    await write(path.join(skillDir, "scripts", "run.sh"), "echo hi");
    await write(path.join(packageRoot, "agents", "planner", "notes.md"), "notes");
    await fs.rm(skillDir, { recursive: true });
    await sleep(2000);
    expect(definitionFrames()).toEqual([]);
  });

  it("AC-011: an imported root is watched; a removed root is released and its later edits are ignored", async () => {
    await start();
    const second = path.join(base, "private-agents");
    await writeAgent(path.join(second, "agents", "secret"), "Secret");
    registered.push(second);
    await services().agentDefinitionService.reloadAgentPackageDefinitions();
    expect(feed!.watcher.getPackageFolderWatchStatus(second)).toEqual({ state: "WATCHING", message: null });
    expect(await listAvailable()).toContain("agent:Secret");
    await feed!.watcher.whenReady();
    await sleep(300);

    await writeAgent(path.join(second, "agents", "another"), "Another");
    await waitFor(listAvailable, (names) => names.includes("agent:Another"));

    registered.pop();
    await services().agentDefinitionService.reloadAgentPackageDefinitions();
    expect(feed!.watcher.getPackageFolderWatchStatus(second)).toBeNull();
    expect(await listAvailable()).not.toContain("agent:Secret");
    frames.length = 0;
    await writeAgent(path.join(second, "agents", "after-removal"), "After Removal");
    await sleep(1800);
    expect(definitionFrames()).toEqual([]);
    expect(await listAvailable()).not.toContain("agent:After Removal");
  });

  it("AC-012: a root renamed away keeps its definitions and reports FOLDER_MISSING; restoring it resumes watching", async () => {
    await teamFiles(path.join(packageRoot, "agent-teams", "crew"), "Crew", [{ memberName: "lead", ref: "planner", refScope: "shared" }]);
    await start();
    const packages = new AgentPackageService({
      rootSettingsStore: new AgentPackageRootSettingsStore(appConfig() as never, { updateSetting: () => [true, "ok"] }),
      registryStore: new AgentPackageRegistryStore({ getAppDataDir: () => path.join(base, "registry") }),
      skillNames: { assertNoIncomingSkillNameConflicts: () => ({ conflicts: [], notices: [] }) } as never,
    });
    const moved = path.join(base, "moved-away");
    await fs.rename(packageRoot, moved);

    await waitFor(async () => feed!.watcher.getPackageFolderWatchStatus(packageRoot)?.state, (state) => state === "FOLDER_MISSING");
    await waitFor(() => services().agentDefinitionService.getLoadIssue("planner"), (issue) => issue?.code === "DEFINITION_SOURCE_UNAVAILABLE");
    expect(await listAvailable()).toEqual(expect.arrayContaining(["agent:Planner", "agent_team:Crew"]));
    expect((await services().definitionAdmissionService.requireAvailable("agent_team", "crew")).status).toBe("available");
    const row = (await packages.listAgentPackages()).find((entry) => entry.path === packageRoot);
    expect(row?.autoRefresh).toMatchObject({ state: "FOLDER_MISSING" });
    expect(definitionFrames().some((frame) => frame.changedLists?.includes("agent_packages"))).toBe(true);

    await fs.rename(moved, packageRoot);
    await waitFor(async () => feed!.watcher.getPackageFolderWatchStatus(packageRoot)?.state, (state) => state === "WATCHING");
    await waitFor(() => services().agentDefinitionService.getLoadIssue("planner"), (issue) => issue === null);
    await feed!.watcher.whenReady();
    await sleep(300);
    await writeAgent(path.join(packageRoot, "agents", "planner"), "Planner", "Back again.");
    await waitFor(() => services().agentDefinitionService.getAgentDefinitionById("planner"), (definition) => definition?.instructions === "Back again.\n");
  });

  it("AC-012: a watcher that cannot be set up reports UNAVAILABLE and manual Reload still works", async () => {
    await start({
      createWatcher: () => { throw Object.assign(new Error("System limit for number of file watchers reached"), { code: "ENOSPC" }); },
    });
    expect(feed!.watcher.getPackageFolderWatchStatus(packageRoot)).toMatchObject({ state: "UNAVAILABLE", message: expect.stringContaining("ENOSPC") });
    await writeAgent(path.join(packageRoot, "agents", "manual"), "Manual");
    await sleep(1500);
    expect(await listAvailable()).not.toContain("agent:Manual");
    await services().agentDefinitionService.reloadAgentPackageDefinitions();
    expect(await listAvailable()).toContain("agent:Manual");
    // The manual Reload notifies every connected client of every catalog subject.
    expect(definitionFrames().map((frame) => frame.changedLists)).toContainEqual(["agents", "agent_teams", "agent_orgs", "agent_packages"]);
  });

  it("CR-001/REQ-015: an unreadable package folder at startup does not block startup or other packages", async () => {
    const unreadable = path.join(base, "locked-package");
    await writeAgent(path.join(unreadable, "agents", "locked"), "Locked");
    registered.push(unreadable);
    await fs.chmod(path.join(unreadable, "agents"), 0o000);
    try {
      await start();
      expect(await listAvailable()).toContain("agent:Planner");
      expect(feed!.watcher.getPackageFolderWatchStatus(unreadable)).toMatchObject({ state: "UNAVAILABLE", message: expect.stringContaining("EACCES") });
      expect(feed!.watcher.getPackageFolderWatchStatus(packageRoot)?.state).toBe("WATCHING");
      await writeAgent(path.join(packageRoot, "agents", "still-live"), "Still Live");
      await waitFor(listAvailable, (names) => names.includes("agent:Still Live"));
    } finally {
      await fs.chmod(path.join(unreadable, "agents"), 0o755);
    }
  });

  it("AR-001: a Team created before its agent becomes available once the agent appears, and its list is told to reload", async () => {
    await start();
    await teamFiles(path.join(packageRoot, "agent-teams", "early"), "Early", [{ memberName: "lead", ref: "late", refScope: "shared" }]);
    await waitFor(async () => (await services().definitionAdmissionService.scan()).find((row) => row.definitionId === "early"),
      (row) => row?.status === "unavailable" && row.code === "DEFINITION_REFERENCE_UNRESOLVED");
    frames.length = 0;
    await writeAgent(path.join(packageRoot, "agents", "late"), "Late");
    await waitFor(async () => (await services().definitionAdmissionService.scan()).find((row) => row.definitionId === "early")?.status,
      (status) => status === "available");
    await waitFor(async () => definitionFrames(), (list) => list.some((frame) => frame.changedLists?.includes("agent_teams")));
  });

  it("DSN-003: a broken team-local agent keeps its last good version and its Team stays launchable", async () => {
    const teamDir = path.join(packageRoot, "agent-teams", "crew");
    await teamFiles(teamDir, "Crew", [{ memberName: "lead", ref: "lead", refScope: "team_local" }]);
    await writeAgent(path.join(teamDir, "agents", "lead"), "Crew Lead");
    await start();
    const localId = buildTeamLocalAgentDefinitionId("crew", "lead");
    await write(path.join(teamDir, "agents", "lead", "agent.md"), "half-written");
    await waitFor(() => services().agentDefinitionService.getLoadIssue(localId), (issue) => issue !== null);
    expect((await services().agentDefinitionService.getAgentDefinitionById(localId))?.name).toBe("Crew Lead");
    expect((await services().definitionAdmissionService.requireAvailable("agent_team", "crew")).status).toBe("available");
    expect((await services().agentDefinitionService.getVisibleAgentDefinitions()).map((definition) => definition.id)).toContain(localId);
    // SR-008 / CR-004: the nested issue is reported on the owning Team's folder (its card), not only by node subject.
    const expectedIssue = expect.objectContaining({
      kind: "agent", definitionId: localId, name: "Crew Lead", usingLastGood: true,
      issue: expect.objectContaining({ definitionPath: expect.stringContaining(path.join("crew", "agents", "lead")) }),
    });
    expect((await services().agentTeamDefinitionService.listFolderLoadIssues()).get("crew")).toEqual([expectedIssue]);
    expect(await services().agentTeamDefinitionService.getFolderLoadIssues("crew")).toEqual([expectedIssue]);
  });
});
