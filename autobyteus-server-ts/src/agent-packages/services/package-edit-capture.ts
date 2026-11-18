import fs from "node:fs/promises";
import path from "node:path";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type { GitHubRepositorySource } from "../../integrations/github/types.js";
import type {
  AgentPackageDefinitionKind,
  DefinitionFolderReader,
  DefinitionFolderReaders,
  KindDefinitionReadResult,
  RegisteredPackageRoot,
} from "../../agent-package-definitions/domain/agent-package-definition-types.js";
import { AgentFolderReader } from "../../agent-package-definitions/providers/agent-folder-reader.js";
import { AgentTeamFolderReader } from "../../agent-package-definitions/providers/agent-team-folder-reader.js";
import { AgentOrgFolderReader } from "../../agent-package-definitions/providers/agent-org-folder-reader.js";
import { personalSettingKey } from "../../personal-settings/domain/personal-setting-record.js";
import type { PackageEdit, PersonalSettingsService, PersonalSettingValues } from "../../personal-settings/services/personal-settings-service.js";
import { compactUtcTime } from "../../personal-settings/stores/personal-settings-store.js";
import type { GitHubAgentPackageInstaller } from "../installers/github-agent-package-installer.js";

/** Backups kept per package (contract §7.3). */
export const KEPT_BACKUPS = 5;
const KINDS = ["agent", "agent_team", "agent_org"] as const satisfies readonly AgentPackageDefinitionKind[];

export type PackageEditCaptureInput = Readonly<{
  source: GitHubRepositorySource;
  /** The commit the package was installed from; null for a package installed before revision tracking. */
  installedRevision: string | null;
  /** The package folder on disk, as the user may have edited it. */
  installDir: string;
}>;

type Logger = Pick<Console, "info" | "warn">;

/** A folder read like a registered package root, so the IDs follow the app's rules. */
const packageRootAt = (rootPath: string): RegisteredPackageRoot => ({
  rootPath,
  sourceClass: "registered_package",
  kindDirs: {
    agents: path.join(rootPath, "agents"),
    "agent-teams": path.join(rootPath, "agent-teams"),
    "agent-orgs": path.join(rootPath, "agent-orgs"),
  },
});

/** The personal settings of a definition that was read; null when its files could not be read. */
const valuesOf = (read: KindDefinitionReadResult): PersonalSettingValues | null => {
  if (read.result.status !== "valid") return null;
  if (read.kind === "agent") {
    const agent = read.result.definition;
    return {
      toolNames: agent.toolNames, skillNames: agent.skillNames, avatarUrl: agent.avatarUrl ?? null,
      defaultLaunchConfig: agent.defaultLaunchConfig ?? null, semanticMemoryEnabled: agent.semanticMemoryEnabled === true,
    };
  }
  const definition = read.result.definition;
  return { avatarUrl: definition.avatarUrl ?? null, defaultLaunchConfig: definition.defaultLaunchConfig ?? null };
};

const sameValues = (left: PersonalSettingValues, right: PersonalSettingValues): boolean =>
  JSON.stringify([left.toolNames, left.skillNames, left.avatarUrl ?? null, left.defaultLaunchConfig, left.semanticMemoryEnabled ?? false])
  === JSON.stringify([right.toolNames, right.skillNames, right.avatarUrl ?? null, right.defaultLaunchConfig, right.semanticMemoryEnabled ?? false]);

/** Relative paths of every file under `dir`. */
const listFiles = async (dir: string): Promise<string[]> => {
  const entries = await fs.readdir(dir, { recursive: true, withFileTypes: true });
  return entries.filter((entry) => entry.isFile()).map((entry) => path.relative(dir, path.join(entry.parentPath, entry.name))).sort();
};

const sameBytes = async (left: string, right: string): Promise<boolean> => {
  const [a, b] = await Promise.all([fs.readFile(left), fs.readFile(right).catch(() => null)]);
  return b !== null && a.equals(b);
};

/**
 * Before a GitHub update replaces a package folder: downloads the installed revision, backs up
 * every file the user changed, and turns changes of the four personal settings in the package's
 * files into personal settings (design DS-003, contract §7). Throws when the update must stop
 * (download, backup or personal settings write failed); a definition that cannot be read is only
 * backed up, with a warning.
 */
export class PackageEditCapture {
  private readonly readers: DefinitionFolderReaders;

  constructor(private readonly deps: {
    installer: Pick<GitHubAgentPackageInstaller, "downloadRevision">;
    personalSettings: () => Pick<PersonalSettingsService, "captureFromPackageEdits">;
    appDataDir?: () => string;
    readers?: DefinitionFolderReaders;
    now?: () => Date;
    logger?: Logger;
  }) {
    this.readers = deps.readers ?? { agent: new AgentFolderReader(), agent_team: new AgentTeamFolderReader(), agent_org: new AgentOrgFolderReader() };
  }

  async captureAndBackUp(input: PackageEditCaptureInput): Promise<void> {
    if (!input.installedRevision) {
      throw new Error("The installed revision of this package is unknown, so its edits cannot be kept. Remove the package and import it again.");
    }
    const packagesDir = path.join(this.appDataDir(), "agent-packages");
    const stagingParent = path.join(packagesDir, ".staging");
    await fs.mkdir(stagingParent, { recursive: true });
    const tempDir = await fs.mkdtemp(path.join(stagingParent, `capture-${input.source.installKey}-`));
    try {
      const installedRoot = await this.deps.installer.downloadRevision(input.source, input.installedRevision, tempDir);
      const [installed, onDisk] = await Promise.all([this.readTree(installedRoot), this.readTree(input.installDir)]);
      const edits = this.editsOf(installed, onDisk);
      const changedFiles = await this.changedFiles(installedRoot, input.installDir);
      if (changedFiles.length > 0) {
        await this.backUp(path.join(packagesDir, "backups", input.source.installKey), input.installDir, changedFiles);
      }
      if (edits.length > 0) this.deps.personalSettings().captureFromPackageEdits(edits);
    } finally {
      await fs.rm(tempDir, { recursive: true, force: true })
        .catch((error: unknown) => this.logger.warn(`PACKAGE_EDIT_CAPTURE_CLEANUP_FAILED:${tempDir}: ${String(error)}`));
    }
  }

  private get logger(): Logger {
    return this.deps.logger ?? console;
  }

  private appDataDir(): string {
    return this.deps.appDataDir?.() ?? appConfigProvider.config.getAppDataDir();
  }

  /** Every definition of one package tree (folder roots and the definitions nested in them), by personal setting key. */
  private async readTree(rootPath: string): Promise<Map<string, KindDefinitionReadResult>> {
    const root = packageRootAt(rootPath);
    const output = new Map<string, KindDefinitionReadResult>();
    for (const kind of KINDS) {
      const reader = this.readers[kind] as DefinitionFolderReader<AgentPackageDefinitionKind>;
      for (const folderId of await reader.listFolderIds([root])) {
        const read = await reader.readFolder(folderId, { roots: [root], previousRoot: null });
        if (read.status !== "read") continue;
        output.set(personalSettingKey(kind, folderId), read.root);
        for (const [id, nested] of read.nested ?? []) output.set(personalSettingKey(nested.kind, id), nested);
      }
    }
    return output;
  }

  /** The definitions present and readable on both sides whose four settings differ; a warning for each unreadable one. */
  private editsOf(installed: ReadonlyMap<string, KindDefinitionReadResult>, onDisk: ReadonlyMap<string, KindDefinitionReadResult>): PackageEdit[] {
    const edits: PackageEdit[] = [];
    for (const [key, diskRead] of onDisk) {
      const installedRead = installed.get(key);
      if (!installedRead) continue;
      const installedValues = valuesOf(installedRead);
      const diskValues = valuesOf(diskRead);
      if (!installedValues || !diskValues) {
        const unreadable = diskValues ? installedRead : diskRead;
        const where = unreadable.result.status === "invalid" ? `${unreadable.result.definitionPath}: ${unreadable.result.reason}` : key;
        this.logger.warn(`PACKAGE_EDIT_NOT_CAPTURED:${key}: the definition cannot be read (${where}); its changed files are backed up.`);
        continue;
      }
      if (sameValues(installedValues, diskValues)) continue;
      const definitionId = key.slice(key.indexOf(":") + 1);
      edits.push({ kind: diskRead.kind, definitionId, installed: installedValues, onDisk: diskValues });
    }
    return edits;
  }

  /** Files on disk that the installed revision does not have, or has with other bytes. */
  private async changedFiles(installedRoot: string, installDir: string): Promise<string[]> {
    const changed: string[] = [];
    for (const file of await listFiles(installDir)) {
      if (!await sameBytes(path.join(installDir, file), path.join(installedRoot, file))) changed.push(file);
    }
    return changed;
  }

  /** Copies the changed files to a new backup, then keeps only the latest backups. A failed copy removes the partial backup and throws. */
  private async backUp(backupsDir: string, installDir: string, files: readonly string[]): Promise<void> {
    let backupDir: string | null = null;
    try {
      backupDir = await this.newBackupDir(backupsDir);
      for (const file of files) {
        const target = path.join(backupDir, file);
        await fs.mkdir(path.dirname(target), { recursive: true });
        await fs.copyFile(path.join(installDir, file), target);
      }
    } catch (error) {
      if (backupDir) await fs.rm(backupDir, { recursive: true, force: true }).catch(() => undefined);
      throw new Error(`The changed package files could not be backed up, so the update was stopped: ${error instanceof Error ? error.message : String(error)}`);
    }
    this.logger.info(`PACKAGE_EDIT_BACKUP:${backupDir}: ${files.length} changed file(s) backed up.`);
    await this.prune(backupsDir);
  }

  /** `<UTC time>`, or `<UTC time>-<n>` when a backup of the same second exists. */
  private async newBackupDir(backupsDir: string): Promise<string> {
    await fs.mkdir(backupsDir, { recursive: true });
    const time = compactUtcTime(this.deps.now?.() ?? new Date());
    for (let attempt = 1; ; attempt += 1) {
      const candidate = path.join(backupsDir, attempt === 1 ? time : `${time}-${attempt}`);
      try {
        await fs.mkdir(candidate);
        return candidate;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
      }
    }
  }

  /** Removes all but the latest backups (names sort by time). A failure loses nothing and is only logged. */
  private async prune(backupsDir: string): Promise<void> {
    try {
      const names = (await fs.readdir(backupsDir, { withFileTypes: true })).filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort();
      for (const name of names.slice(0, Math.max(0, names.length - KEPT_BACKUPS))) {
        await fs.rm(path.join(backupsDir, name), { recursive: true, force: true });
      }
    } catch (error) {
      this.logger.warn(`PACKAGE_EDIT_BACKUP_PRUNE_FAILED:${backupsDir}: ${String(error)}`);
    }
  }
}
