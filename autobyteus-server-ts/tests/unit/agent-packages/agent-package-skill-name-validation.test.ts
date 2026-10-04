import type { GitHubRepositoryClient } from "../../../src/integrations/github/github-repository-client.js";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  GitHubAgentPackageInstaller,
  type ManagedGitHubPackageReplacement,
} from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { AgentPackageService } from "../../../src/agent-packages/services/agent-package-service.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { AgentPackageRootSettingsStore } from "../../../src/agent-packages/stores/agent-package-root-settings-store.js";
import type { GitHubRepositoryRevisionMetadata, GitHubRepositorySource } from "../../../src/integrations/github/types.js";
import { SkillNameConflictError } from "../../../src/skills/domain/skill-name-conflict-error.js";
import { SkillService } from "../../../src/skills/services/skill-service.js";
import { writeAgentOrg } from "../../fixtures/agent-org-skill-package.js";

// D-19 / REQ-023: every agent package import path validates skill names before it commits.
const parseAdditionalRoots = (): string[] =>
  (process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS ?? "").split(",").map((entry) => entry.trim()).filter(Boolean)
    .map((entry) => path.resolve(entry));

const writeSkill = async (skillDir: string, name: string, body = "Body"): Promise<string> => {
  await fs.mkdir(skillDir, { recursive: true });
  await fs.writeFile(path.join(skillDir, "SKILL.md"), `---\nname: ${name}\ndescription: ${name}\n---\n\n${body}\n`, "utf-8");
  return skillDir;
};

const writePackage = async (root: string, agentId: string, skillName?: string): Promise<string | null> => {
  await fs.mkdir(path.join(root, "agents", agentId), { recursive: true });
  await fs.writeFile(path.join(root, "agents", agentId, "agent.md"), "agent", "utf-8");
  return skillName ? writeSkill(path.join(root, "agents", agentId, "skills", skillName), skillName) : null;
};

describe("AgentPackageService skill-name validation (REQ-023)", () => {
  let base: string;
  let defaultRoot: string;
  let skillsDir: string;
  let runtimeDefault: string;
  let skillPaths: string[];
  let registryStore: AgentPackageRegistryStore;
  let refreshes: number;
  let skillService: SkillService;
  const inheritedPackageRoots = process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;

  const createService = (installer?: GitHubAgentPackageInstaller, githubClient?: Pick<GitHubRepositoryClient, "fetchRepositoryRevisionMetadata">) => new AgentPackageService({
    rootSettingsStore: new AgentPackageRootSettingsStore(
      { getAppDataDir: () => defaultRoot, getAdditionalAgentPackageRoots: parseAdditionalRoots,
        get: (key: string, defaultValue?: string) => process.env[key] ?? defaultValue },
      { updateSetting: (key: string, value: string) => {
        if (value) process.env[key] = value; else delete process.env[key];
        return [true, "updated"];
      } },
    ),
    registryStore,
    installer, githubClient,
    refreshAgentDefinitions: async () => { refreshes += 1; },
    refreshAgentTeams: async () => undefined,
    skillNames: skillService,
  });

  beforeEach(async () => {
    delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    base = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), "agent-package-skill-names-")));
    defaultRoot = path.join(base, "app-data");
    skillsDir = path.join(defaultRoot, "skills");
    runtimeDefault = path.join(base, "home", ".codex", "skills");
    await Promise.all([fs.mkdir(skillsDir, { recursive: true }), fs.mkdir(runtimeDefault, { recursive: true })]);
    await writePackage(defaultRoot, "default-agent");
    skillPaths = [];
    refreshes = 0;
    registryStore = new AgentPackageRegistryStore({ getAppDataDir: () => path.join(base, "registry") });
    skillService = new SkillService({
      config: {
        getSkillsDir: () => skillsDir,
        getAdditionalSkillsDirs: () => skillPaths,
        getAdditionalAgentPackageRoots: parseAdditionalRoots,
        getAppDataDir: () => defaultRoot,
        getAgentOrgsDir: () => path.join(defaultRoot, "agent-orgs"),
        get: (_key: string, defaultValue = "") => defaultValue,
      },
      isRuntimeDefaultSkillFolder: (directory) => path.resolve(directory) === runtimeDefault,
    });
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
    vi.spyOn(console, "info").mockImplementation(() => undefined);
  });

  afterEach(async () => {
    vi.restoreAllMocks();
    if (inheritedPackageRoots === undefined) delete process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS;
    else process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = inheritedPackageRoots;
    await fs.rm(base, { recursive: true, force: true });
  });

  it("rejects a local import whose skill name exists in tiers 1–3, with nothing changed", async () => {
    const existing = await writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha");
    const localRoot = path.join(base, "local-package");
    const incoming = await writePackage(localRoot, "desk-helper", "desk-alpha");

    const error = await createService().importAgentPackage({ sourceKind: "LOCAL_PATH", source: localRoot })
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(SkillNameConflictError);
    expect((error as SkillNameConflictError).conflicts).toEqual([{ name: "desk-alpha", existingPath: existing, incomingPath: incoming }]);
    expect((error as Error).message).toBe("Duplicate skill names: desk-alpha");
    expect(parseAdditionalRoots()).toEqual([]);
    expect((await registryStore.listPackageRecords()).some((record) => record.rootPath === localRoot)).toBe(false);
    expect(refreshes).toBe(0);
  });

  it("rejects a local import whose only duplicate is an Agent Org skill (SR-018), with nothing changed", async () => {
    const existing = await writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha");
    const localRoot = path.join(base, "org-package");
    await writePackage(localRoot, "plain-agent");
    const orgDir = writeAgentOrg(path.join(localRoot, "agent-orgs"), "desk-org", { teams: ["desk-team"] });
    const incoming = await writeSkill(path.join(orgDir, "agent-teams", "desk-team", "skills", "desk-alpha"), "desk-alpha");

    await expect(createService().importAgentPackage({ sourceKind: "LOCAL_PATH", source: localRoot }))
      .rejects.toMatchObject({ conflicts: [{ name: "desk-alpha", existingPath: existing, incomingPath: incoming }] });
    expect(parseAdditionalRoots()).toEqual([]);
    expect(refreshes).toBe(0);
  });

  it("rejects two copies of one name inside the incoming package", async () => {
    const localRoot = path.join(base, "local-package");
    const first = await writePackage(localRoot, "agent-a", "shared-name");
    const second = await writePackage(localRoot, "agent-b", "shared-name");

    await expect(createService().importAgentPackage({ sourceKind: "LOCAL_PATH", source: localRoot }))
      .rejects.toMatchObject({ conflicts: [{ name: "shared-name", existingPath: first, incomingPath: second }] });
  });

  it("accepts a package whose only duplicate is in a runtime default folder; the package copy wins", async () => {
    skillPaths = [runtimeDefault];
    const stale = await writeSkill(path.join(runtimeDefault, "desk-alpha"), "desk-alpha", "stale");
    const localRoot = path.join(base, "local-package");
    const incoming = await writePackage(localRoot, "desk-helper", "desk-alpha");

    await createService().importAgentPackage({ sourceKind: "LOCAL_PATH", source: localRoot });

    expect(parseAdditionalRoots()).toEqual([localRoot]);
    expect(skillService.getSkill("desk-alpha")?.rootPath).toBe(incoming);
    expect(skillService.listSkillNameIssues()).toEqual([
      { name: "desk-alpha", usedPath: incoming, ignoredPaths: [stale], kind: "shadowed_runtime_default" },
    ]);
  });

  it("deletes a rejected GitHub download and records nothing", async () => {
    const existing = await writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha");
    const managedRoot = path.join(base, "managed");
    class MockInstaller extends GitHubAgentPackageInstaller {
      override getManagedInstallDir(installKey: string): string { return path.join(managedRoot, installKey); }
      override async installPackage(source: GitHubRepositorySource) {
        const installDir = this.getManagedInstallDir(source.installKey);
        await writePackage(installDir, "desk-helper", "desk-alpha");
        return { rootPath: installDir, managedInstallPath: installDir, canonicalSourceUrl: source.canonicalUrl };
      }
    }

    await expect(createService(new MockInstaller()).importAgentPackage({
      sourceKind: "GITHUB_REPOSITORY", source: "https://github.com/AutoByteus/desk-package",
    })).rejects.toMatchObject({ code: "SKILL_NAME_CONFLICT", conflicts: [expect.objectContaining({ existingPath: existing })] });

    await expect(fs.access(path.join(managedRoot, "autobyteus__desk-package"))).rejects.toThrow();
    expect(parseAdditionalRoots()).toEqual([]);
    expect(await registryStore.findGitHubPackageBySource("autobyteus/desk-package")).toBeNull();
  });

  it("rolls back a GitHub update whose new revision adds a duplicate; record and status are unchanged", async () => {
    const existing = await writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha");
    const installDir = path.join(base, "managed", "autobyteus__desk-package");
    await writePackage(installDir, "desk-helper");
    process.env.AUTOBYTEUS_AGENT_PACKAGE_ROOTS = installDir;
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: "autobyteus/desk-package", source: "https://github.com/AutoByteus/desk-package",
      rootPath: installDir, managedInstallPath: installDir,
      sourceMetadata: { github: { defaultBranch: "main", installedRevision: "old-sha", latestRevision: "new-sha",
        latestCheckedAt: "2026-09-29T00:00:00.000Z", updateStatus: "UPDATE_AVAILABLE", lastError: null } },
    });
    const rollback = vi.fn(async () => { await fs.rm(path.join(installDir, "agents", "desk-helper", "skills"), { recursive: true, force: true }); });
    const commit = vi.fn(async () => undefined);
    const githubClient = {
      async fetchRepositoryRevisionMetadata(): Promise<GitHubRepositoryRevisionMetadata> {
        return { owner: "AutoByteus", repo: "desk-package", canonicalUrl: "https://github.com/AutoByteus/desk-package",
          defaultBranch: "main", latestRevision: "new-sha" };
      }
    };
    class MockInstaller extends GitHubAgentPackageInstaller {

      override async stagePackageReplacement(source: GitHubRepositorySource, metadata: GitHubRepositoryRevisionMetadata,
        targetInstallDir: string): Promise<ManagedGitHubPackageReplacement> {
        await writeSkill(path.join(targetInstallDir, "agents", "desk-helper", "skills", "desk-alpha"), "desk-alpha");
        return { rootPath: targetInstallDir, managedInstallPath: targetInstallDir, canonicalSourceUrl: source.canonicalUrl,
          defaultBranch: metadata.defaultBranch, installedRevision: metadata.latestRevision, commit, rollback };
      }
    }

    await expect(createService(new MockInstaller(), githubClient).updateAgentPackage(record.packageId))
      .rejects.toMatchObject({ conflicts: [expect.objectContaining({ name: "desk-alpha", existingPath: existing })] });

    expect(rollback).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect((await registryStore.findPackageById(record.packageId))?.sourceMetadata?.github).toMatchObject({
      installedRevision: "old-sha", updateStatus: "UPDATE_AVAILABLE", lastError: null,
    });
    expect(refreshes).toBe(0);
  });

  it("R-3: a rejected reload keeps the registration; the catalog and banner show the on-disk duplicate", async () => {
    const localRoot = path.join(base, "local-package");
    await writePackage(localRoot, "desk-helper");
    const service = createService();
    const imported = await service.importAgentPackage({ sourceKind: "LOCAL_PATH", source: localRoot });
    const packageId = imported.find((entry) => entry.path === localRoot)!.packageId;
    const refreshesAfterImport = refreshes;
    // Out-of-band change (e.g. a git pull) adds a duplicate of a tier-1 skill.
    const existing = await writeSkill(path.join(skillsDir, "desk-alpha"), "desk-alpha");
    const pulled = await writeSkill(path.join(localRoot, "agents", "desk-helper", "skills", "desk-alpha"), "desk-alpha");

    await expect(service.reloadAgentPackage(packageId)).rejects.toBeInstanceOf(SkillNameConflictError);

    expect(refreshes).toBe(refreshesAfterImport);
    expect((await service.listAgentPackages()).some((entry) => entry.packageId === packageId)).toBe(true);
    expect(parseAdditionalRoots()).toEqual([localRoot]);
    expect(skillService.getSkill("desk-alpha")?.rootPath).toBe(existing);
    expect(skillService.listSkillNameIssues()).toEqual([
      { name: "desk-alpha", usedPath: existing, ignoredPaths: [pulled], kind: "conflict" },
    ]);
  });
});
