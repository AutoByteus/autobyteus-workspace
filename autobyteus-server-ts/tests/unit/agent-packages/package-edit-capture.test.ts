import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AgentDefinition } from "../../../src/agent-definition/domain/models.js";
import type { GitHubAgentPackageInstaller } from "../../../src/agent-packages/installers/github-agent-package-installer.js";
import { GitHubAgentPackageUpdates } from "../../../src/agent-packages/services/github-agent-package-updates.js";
import { KEPT_BACKUPS, PackageEditCapture } from "../../../src/agent-packages/services/package-edit-capture.js";
import { AgentPackageRegistryStore } from "../../../src/agent-packages/stores/agent-package-registry-store.js";
import { normalizeGitHubRepositorySource } from "../../../src/integrations/github/github-repository-source.js";
import type { GitHubRepositorySource } from "../../../src/integrations/github/types.js";
import { PersonalSettingsService, personalSettingsFilePath } from "../../../src/personal-settings/services/personal-settings-service.js";
import { PersonalSettingsStore } from "../../../src/personal-settings/stores/personal-settings-store.js";

/**
 * Design DS-003 and "Capture Failure Rules"; contract §7. A fake installer serves the installed
 * revision from a fixture folder; the folder readers, the backup and the personal settings file are real.
 */
const REPOSITORY_URL = "https://github.com/AutoByteus/autobyteus-agents";
const source: GitHubRepositorySource = normalizeGitHubRepositorySource(REPOSITORY_URL);
const launch = { runtimeKind: "codex_app_server", llmModelIdentifier: "gpt-5.5", llmConfig: null };

let root: string, appData: string, installDir: string, installedRevisionDir: string;
let logger: { info: ReturnType<typeof vi.fn>; warn: ReturnType<typeof vi.fn> };
let personalSettings: PersonalSettingsService;
let downloads: string[];
let failDownload: boolean;
let clock: Date;

const write = async (file: string, text: string) => { await fs.mkdir(path.dirname(file), { recursive: true }); await fs.writeFile(file, text); };
const agentConfig = (toolNames: string[], extra: Record<string, unknown> = {}) =>
  `${JSON.stringify({ toolNames, skillNames: ["design"], avatarUrl: null, defaultLaunchConfig: null, ...extra }, null, 2)}\n`;
const teamConfig = (avatarUrl: string | null) => `${JSON.stringify({ coordinatorMemberName: "lead",
  members: [{ memberName: "lead", ref: "lead", refScope: "team_local" }], handoffs: [], avatarUrl, defaultLaunchConfig: null }, null, 2)}\n`;

/** A package: one shared agent, one Team with its own agent, and a skill file. */
const writePackage = async (dir: string, input: { tools: string[]; teamAvatar?: string | null; agentExtra?: Record<string, unknown> }) => {
  await write(path.join(dir, "agents", "solution-designer", "agent.md"), "---\nname: Solution Designer\ndescription: Designs\nrole: Designer\n---\n\nWork.\n");
  await write(path.join(dir, "agents", "solution-designer", "agent-config.json"), agentConfig(input.tools, input.agentExtra));
  await write(path.join(dir, "agent-teams", "se-team", "team.md"), "---\nname: SE Team\ndescription: Ships\n---\n\nShip.\n");
  await write(path.join(dir, "agent-teams", "se-team", "team-config.json"), teamConfig(input.teamAvatar ?? null));
  await write(path.join(dir, "agent-teams", "se-team", "agents", "lead", "agent.md"), "---\nname: Lead\ndescription: Leads\nrole: Lead\n---\n\nLead.\n");
  await write(path.join(dir, "agent-teams", "se-team", "agents", "lead", "agent-config.json"), agentConfig([]));
  await write(path.join(dir, "skills", "design", "SKILL.md"), "# Design\n");
};

const installer: Pick<GitHubAgentPackageInstaller, "downloadRevision"> = {
  downloadRevision: async (_source, revision, targetDir) => {
    downloads.push(revision);
    if (failDownload) throw new Error("HTTP 404 Not Found");
    const extracted = path.join(targetDir, "extracted", "autobyteus-agents-wrapper");
    await fs.cp(installedRevisionDir, extracted, { recursive: true });
    return extracted;
  },
};
const capture = (overrides: Partial<ConstructorParameters<typeof PackageEditCapture>[0]> = {}) => new PackageEditCapture({
  installer, personalSettings: () => personalSettings, appDataDir: () => appData, now: () => clock, logger: logger as unknown as Console, ...overrides,
});
const backupsDir = () => path.join(appData, "agent-packages", "backups", source.installKey);
const backups = async () => (await fs.readdir(backupsDir()).catch(() => [] as string[])).sort();
const personalJson = async () => JSON.parse(await fs.readFile(personalSettingsFilePath(appData), "utf8")) as Record<string, unknown>;
const personalFileExists = () => fs.access(personalSettingsFilePath(appData)).then(() => true, () => false);
const stagingLeft = async () => fs.readdir(path.join(appData, "agent-packages", ".staging")).catch(() => [] as string[]);

beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), "package-edit-capture-"));
  appData = path.join(root, "data");
  installDir = path.join(appData, "agent-packages", "github", source.installKey);
  installedRevisionDir = path.join(root, "github-installed-revision");
  await writePackage(installedRevisionDir, { tools: ["read_file", "write_file"] });
  await fs.cp(installedRevisionDir, installDir, { recursive: true });
  logger = { info: vi.fn(), warn: vi.fn() };
  personalSettings = new PersonalSettingsService({ store: new PersonalSettingsStore(() => personalSettingsFilePath(appData), logger as unknown as Console) });
  downloads = [];
  failDownload = false;
  clock = new Date("2026-11-07T09:30:00Z");
});
afterEach(async () => { await fs.rm(root, { recursive: true, force: true }); });

describe("PackageEditCapture.captureAndBackUp", () => {
  it("captures edits of the four settings and backs up exactly the changed files (AC-002)", async () => {
    await writePackage(installDir, { tools: ["read_file", "mcp_x"], teamAvatar: "/team.png", agentExtra: { defaultLaunchConfig: launch } });
    await write(path.join(installDir, "agents", "solution-designer", "notes.md"), "my notes\n");

    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });

    expect(downloads).toEqual(["a".repeat(40)]);
    expect(await personalJson()).toEqual({
      "agent:solution-designer": { toolsAdded: ["mcp_x"], toolsRemoved: ["write_file"], defaultLaunchConfig: launch },
      "agent_team:se-team": { avatarUrl: "/team.png" },
    });
    expect(await backups()).toEqual(["20261107T093000Z"]);
    const backup = path.join(backupsDir(), "20261107T093000Z");
    const files = (await fs.readdir(backup, { recursive: true, withFileTypes: true })).filter((entry) => entry.isFile())
      .map((entry) => path.relative(backup, path.join(entry.parentPath, entry.name))).sort();
    expect(files).toEqual([
      path.join("agent-teams", "se-team", "team-config.json"),
      path.join("agents", "solution-designer", "agent-config.json"),
      path.join("agents", "solution-designer", "notes.md"),
    ]);
    expect(await fs.readFile(path.join(backup, "agents", "solution-designer", "agent-config.json"), "utf8"))
      .toBe(await fs.readFile(path.join(installDir, "agents", "solution-designer", "agent-config.json"), "utf8"));
    expect(await stagingLeft()).toEqual([]);
  });

  it("an unchanged package writes nothing: no record, no backup (contract V-C)", async () => {
    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });
    expect(await personalFileExists()).toBe(false);
    expect(await backups()).toEqual([]);
  });

  it("merges into an existing record; the personal avatar wins; a second capture changes nothing (idempotent)", async () => {
    await writePackage(installDir, { tools: ["read_file", "write_file", "mcp_x"], teamAvatar: "/file-edit.png" });
    personalSettings.setEdited("agent_team", "se-team", { avatarUrl: null, defaultLaunchConfig: null }, { avatarUrl: "/personal.png" });
    personalSettings.setEdited("agent", "solution-designer",
      { toolNames: ["read_file", "write_file"], skillNames: ["design"], avatarUrl: null, defaultLaunchConfig: null },
      { toolNames: ["read_file", "write_file", "github_create_issue"] });

    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });
    const first = await personalJson();
    expect(first).toEqual({
      "agent_team:se-team": { avatarUrl: "/personal.png" },
      "agent:solution-designer": { toolsAdded: ["github_create_issue", "mcp_x"] },
    });
    clock = new Date("2026-11-08T09:30:00Z");
    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });
    expect(await personalJson()).toEqual(first);
  });

  it(`keeps the latest ${KEPT_BACKUPS} backups of a package`, async () => {
    await writePackage(installDir, { tools: ["read_file"] });
    for (let day = 1; day <= 7; day += 1) {
      clock = new Date(`2026-11-0${day}T09:30:00Z`);
      await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });
    }
    expect(await backups()).toEqual(["20261103T093000Z", "20261104T093000Z", "20261105T093000Z", "20261106T093000Z", "20261107T093000Z"]);
  });

  it("two backups in the same second do not overwrite each other", async () => {
    await writePackage(installDir, { tools: ["read_file"] });
    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });
    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });
    expect(await backups()).toEqual(["20261107T093000Z", "20261107T093000Z-2"]);
  });

  it("a malformed agent-config.json on disk: not captured, a warning names the file, the file is backed up; the rest is captured (MP-003)", async () => {
    await writePackage(installDir, { tools: ["read_file"], teamAvatar: "/team.png" });
    const broken = path.join(installDir, "agents", "solution-designer", "agent-config.json");
    await fs.writeFile(broken, "{ \"toolNames\": [\"read_file\", }\n");

    await capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir });

    expect(await personalJson()).toEqual({ "agent_team:se-team": { avatarUrl: "/team.png" } });
    expect(logger.warn).toHaveBeenCalledWith(expect.stringMatching(/^PACKAGE_EDIT_NOT_CAPTURED:agent:solution-designer: .*agent-config\.json/));
    expect(await fs.readFile(path.join(backupsDir(), "20261107T093000Z", "agents", "solution-designer", "agent-config.json"), "utf8"))
      .toBe("{ \"toolNames\": [\"read_file\", }\n");
  });

  it("download failure: the error is thrown and nothing is written (AC-004)", async () => {
    await writePackage(installDir, { tools: ["read_file", "mcp_x"] });
    failDownload = true;
    await expect(capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir })).rejects.toThrow("HTTP 404 Not Found");
    expect(await personalFileExists()).toBe(false);
    expect(await backups()).toEqual([]);
    expect(await stagingLeft()).toEqual([]);
  });

  it("an unknown installed revision stops before any download, with the remedy (REQ-006)", async () => {
    await expect(capture().captureAndBackUp({ source, installedRevision: null, installDir }))
      .rejects.toThrow("The installed revision of this package is unknown, so its edits cannot be kept. Remove the package and import it again.");
    expect(downloads).toEqual([]);
  });

  it("backup failure: the error is thrown, no partial backup, no record", async () => {
    await writePackage(installDir, { tools: ["read_file", "mcp_x"] });
    await write(backupsDir(), "a file where the package's backups folder should be");
    await expect(capture().captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir }))
      .rejects.toThrow("The changed package files could not be backed up, so the update was stopped");
    expect(await personalFileExists()).toBe(false);
    expect(await stagingLeft()).toEqual([]);
  });

  it("personal settings write failure: the error is thrown; the backup stays", async () => {
    await writePackage(installDir, { tools: ["read_file", "mcp_x"] });
    const failing = { captureFromPackageEdits: () => { throw new Error("EACCES: personal-settings.json"); } };
    await expect(capture({ personalSettings: () => failing }).captureAndBackUp({ source, installedRevision: "a".repeat(40), installDir }))
      .rejects.toThrow("EACCES: personal-settings.json");
    expect(await backups()).toEqual(["20261107T093000Z"]);
  });
});

describe("GitHubAgentPackageUpdates with capture", () => {
  const setup = async () => {
    const registryStore = new AgentPackageRegistryStore({ getAppDataDir: () => path.join(root, "registry") });
    const record = await registryStore.upsertManagedGitHubPackageRecord({
      normalizedSource: source.normalizedRepository, source: REPOSITORY_URL, rootPath: installDir, managedInstallPath: installDir,
      sourceMetadata: { github: { defaultBranch: "main", installedRevision: "a".repeat(40), latestRevision: "b".repeat(40),
        latestCheckedAt: "2026-11-07T00:00:00.000Z", updateStatus: "UPDATE_AVAILABLE", lastError: null } },
    });
    const staging = { fail: false, calls: 0 };
    const updates = new GitHubAgentPackageUpdates({
      registryStore,
      githubClient: { fetchDefaultBranchHead: async () => ({ defaultBranch: "main", latestRevision: "b".repeat(40) }) } as never,
      installer: {
        ...installer,
        stagePackageReplacement: async (_source: GitHubRepositorySource, metadata: { latestRevision: string; canonicalUrl: string; defaultBranch: string }) => {
          staging.calls += 1;
          if (staging.fail) throw new Error("staging failed");
          return { rootPath: installDir, managedInstallPath: installDir, canonicalSourceUrl: metadata.canonicalUrl, defaultBranch: metadata.defaultBranch,
            installedRevision: metadata.latestRevision, commit: async () => undefined, rollback: async () => undefined };
        },
      } as unknown as GitHubAgentPackageInstaller,
      reloadAgentPackageDefinitions: async () => undefined,
      assertPackageSkillNames: () => undefined,
      packageEditCapture: capture(),
    });
    const status = async () => (await registryStore.findPackageById(record.packageId))?.sourceMetadata?.github;
    return { updates, record, staging, status };
  };

  it("download failure stops the update before staging; the package is marked failed", async () => {
    const { updates, record, staging, status } = await setup();
    failDownload = true;
    await expect(updates.updatePackage(record.packageId)).rejects.toThrow("HTTP 404 Not Found");
    expect(staging.calls).toBe(0);
    expect(await status()).toMatchObject({ updateStatus: "UPDATE_FAILED", installedRevision: "a".repeat(40), lastError: "HTTP 404 Not Found" });
  });

  it("a staging failure after capture keeps the record and backup; effective values are unchanged; the next update succeeds", async () => {
    const { updates, record, staging, status } = await setup();
    await writePackage(installDir, { tools: ["read_file", "mcp_x"] });
    staging.fail = true;
    await expect(updates.updatePackage(record.packageId)).rejects.toThrow("staging failed");
    const captured = await personalJson();
    expect(captured).toEqual({ "agent:solution-designer": { toolsAdded: ["mcp_x"], toolsRemoved: ["write_file"] } });
    expect(await backups()).toHaveLength(1);
    // The edits are still in the files: ([read_file, mcp_x] − write_file) + mcp_x = [read_file, mcp_x].
    const onDisk = new AgentDefinition({ id: "solution-designer", name: "Solution Designer", description: "d", instructions: "i",
      toolNames: ["read_file", "mcp_x"], skillNames: ["design"] });
    expect(personalSettings.apply("agent", onDisk, "registered_package").toolNames).toEqual(["read_file", "mcp_x"]);

    staging.fail = false;
    clock = new Date("2026-11-08T09:30:00Z");
    await updates.updatePackage(record.packageId);
    expect(await personalJson()).toEqual(captured);
    expect(await status()).toMatchObject({ installedRevision: "b".repeat(40) });
  });
});
