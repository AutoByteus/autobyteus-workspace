import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type {
  ApplicationBundle,
  ApplicationOwnedDefinitionSource,
  ValidatedApplicationBundle,
} from "../domain/models.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import { ApplicationPackageRegistryStore } from "../../application-packages/stores/application-package-registry-store.js";
import { ApplicationPackageRootSettingsStore } from "../../application-packages/stores/application-package-root-settings-store.js";
import { buildLocalApplicationPackageId } from "../../application-packages/utils/application-package-root-summary.js";
import {
  getApplicationManifestPath,
  parseApplicationManifest,
} from "../utils/application-manifest.js";
import {
  parseApplicationBackendManifest,
} from "../utils/application-backend-manifest.js";
import {
  buildCanonicalApplicationId,
  buildCanonicalApplicationOwnedAgentId,
  buildCanonicalApplicationOwnedTeamId,
} from "../utils/application-bundle-identity.js";
import {
  readApplicationOwnedTeamDefinitionFromSource,
} from "../../agent-team-definition/providers/application-owned-team-source.js";
import { assertApplicationOwnedTeamIntegrity } from "../../agent-team-definition/utils/application-owned-team-integrity-validator.js";
import {
  type AgentConfigRecord,
  defaultAgentConfig,
  normalizeAgentConfigRecord,
} from "../../agent-definition/providers/agent-definition-config.js";
import {
  buildApplicationOwnedAgentSourcePaths,
  readApplicationOwnedAgentDefinitionFromSource,
} from "../../agent-definition/providers/application-owned-agent-source.js";
import { parseAgentMd } from "../../agent-definition/utils/agent-md-parser.js";
import { readJsonFile } from "../../persistence/file/store-utils.js";
import { buildTeamLocalAgentFilePaths } from "../../agent-definition/providers/team-local-agent-discovery.js";

export const BUILT_IN_APPLICATION_PACKAGE_ID = "built-in:applications";

type BundleRootDescriptor = {
  packageId: string;
  packageRootPath: string;
};

type ScannedBundleRecord = {
  packageId: string;
  packageRootPath: string;
  bundle: ValidatedApplicationBundle;
};

const isWritablePath = async (targetPath: string): Promise<boolean> => {
  try {
    await fsPromises.access(targetPath, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
};

const listDefinitionIds = async (directoryPath: string, requiredFileName: string): Promise<string[]> => {
  let entries: fs.Dirent[] = [];
  try {
    entries = await fsPromises.readdir(directoryPath, { withFileTypes: true });
  } catch {
    return [];
  }

  const ids: string[] = [];
  for (const entry of entries) {
    if (!entry.isDirectory() || entry.name.startsWith("_")) {
      continue;
    }

    const definitionFilePath = path.join(directoryPath, entry.name, requiredFileName);
    if (fs.existsSync(definitionFilePath)) {
      ids.push(entry.name);
    }
  }

  return ids.sort((left, right) => left.localeCompare(right));
};

const assertExistingFile = (bundleRootPath: string, relativePath: string, fieldName: string): void => {
  const absolutePath = path.join(bundleRootPath, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isFile()) {
    throw new Error(
      `Application bundle '${bundleRootPath}' is invalid: ${fieldName} file '${relativePath}' does not exist.`,
    );
  }
};

const assertExistingDirectory = (bundleRootPath: string, relativePath: string, fieldName: string): void => {
  const absolutePath = path.join(bundleRootPath, relativePath);
  if (!fs.existsSync(absolutePath) || !fs.statSync(absolutePath).isDirectory()) {
    throw new Error(
      `Application bundle '${bundleRootPath}' is invalid: ${fieldName} directory '${relativePath}' does not exist.`,
    );
  }
};

const assertRuntimeTargetExists = (
  bundleRootPath: string,
  manifestRuntimeTarget: { kind: "AGENT" | "AGENT_TEAM"; localId: string },
  localAgentIds: string[],
  localTeamIds: string[],
): void => {
  if (manifestRuntimeTarget.kind === "AGENT") {
    if (!localAgentIds.includes(manifestRuntimeTarget.localId)) {
      throw new Error(
        `Application bundle '${bundleRootPath}' runtime target agent '${manifestRuntimeTarget.localId}' was not found under agents/.`,
      );
    }
    return;
  }

  if (!localTeamIds.includes(manifestRuntimeTarget.localId)) {
    throw new Error(
      `Application bundle '${bundleRootPath}' runtime target team '${manifestRuntimeTarget.localId}' was not found under agent-teams/.`,
    );
  }
};

const buildApplicationSource = (
  record: ScannedBundleRecord,
  localDefinitionId: string,
  definitionType: "agent" | "team",
): ApplicationOwnedDefinitionSource => ({
  definitionId:
    definitionType === "agent"
      ? buildCanonicalApplicationOwnedAgentId(
          record.packageId,
          record.bundle.localApplicationId,
          localDefinitionId,
        )
      : buildCanonicalApplicationOwnedTeamId(
          record.packageId,
          record.bundle.localApplicationId,
          localDefinitionId,
        ),
  applicationId: buildCanonicalApplicationId(record.packageId, record.bundle.localApplicationId),
  applicationName: record.bundle.name,
  packageId: record.packageId,
  localApplicationId: record.bundle.localApplicationId,
  localDefinitionId,
  applicationRootPath: record.bundle.applicationRootPath,
  packageRootPath: record.packageRootPath,
  writable: record.bundle.writable,
});

export class FileApplicationBundleProvider {
  constructor(
    private readonly config = appConfigProvider.config,
    private readonly rootSettingsStore = new ApplicationPackageRootSettingsStore(),
    private readonly registryStore = new ApplicationPackageRegistryStore(),
  ) {}

  private async listBundleRoots(): Promise<BundleRootDescriptor[]> {
    const seen = new Set<string>();
    const bundleRoots: BundleRootDescriptor[] = [];
    const builtInApplicationRootPath = this.rootSettingsStore.getBuiltInRootPath();

    const addRoot = (packageId: string, packageRootPath: string): void => {
      const resolvedPath = path.resolve(packageRootPath);
      if (seen.has(resolvedPath)) {
        return;
      }
      seen.add(resolvedPath);
      bundleRoots.push({ packageId, packageRootPath: resolvedPath });
    };

    addRoot(BUILT_IN_APPLICATION_PACKAGE_ID, builtInApplicationRootPath);

    const additionalRoots = this.rootSettingsStore.listAdditionalRootPaths();
    const registryRecords = await this.registryStore.listPackageRecords();
    const registryByRootPath = new Map(
      registryRecords.map((record) => [path.resolve(record.rootPath), record]),
    );

    for (const additionalRootPath of additionalRoots) {
      const resolvedRootPath = path.resolve(additionalRootPath);
      if (resolvedRootPath === builtInApplicationRootPath) {
        continue;
      }
      const record = registryByRootPath.get(resolvedRootPath);
      addRoot(record?.packageId ?? buildLocalApplicationPackageId(resolvedRootPath), resolvedRootPath);
    }

    return bundleRoots;
  }

  private async scanBundleRoot(root: BundleRootDescriptor): Promise<ScannedBundleRecord[]> {
    const applicationsDir = path.join(root.packageRootPath, "applications");
    let entries: fs.Dirent[] = [];
    try {
      entries = await fsPromises.readdir(applicationsDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const records: ScannedBundleRecord[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) {
        continue;
      }

      const applicationRootPath = path.join(applicationsDir, entry.name);
      const manifestPath = getApplicationManifestPath(applicationRootPath);
      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      const manifest = parseApplicationManifest(applicationRootPath, manifestPath);
      if (manifest.id !== entry.name) {
        throw new Error(
          `Application bundle folder '${applicationRootPath}' must match manifest id '${manifest.id}'.`,
        );
      }

      assertExistingFile(applicationRootPath, manifest.entryHtmlRelativePath, "ui.entryHtml");
      if (manifest.iconRelativePath) {
        assertExistingFile(applicationRootPath, manifest.iconRelativePath, "icon");
      }
      assertExistingFile(applicationRootPath, manifest.backendBundleManifestRelativePath, "backend.bundleManifest");

      const backend = parseApplicationBackendManifest(
        applicationRootPath,
        path.join(applicationRootPath, manifest.backendBundleManifestRelativePath),
      );
      assertExistingFile(applicationRootPath, backend.entryModuleRelativePath, "backend.entryModule");
      if (backend.migrationsDirRelativePath) {
        assertExistingDirectory(applicationRootPath, backend.migrationsDirRelativePath, "backend.migrationsDir");
      }
      if (backend.assetsDirRelativePath) {
        assertExistingDirectory(applicationRootPath, backend.assetsDirRelativePath, "backend.assetsDir");
      }

      const localAgentIds = await listDefinitionIds(path.join(applicationRootPath, "agents"), "agent.md");
      const localTeamIds = await listDefinitionIds(path.join(applicationRootPath, "agent-teams"), "team.md");
      assertRuntimeTargetExists(
        applicationRootPath,
        manifest.runtimeTarget,
        localAgentIds,
        localTeamIds,
      );

      records.push({
        packageId: root.packageId,
        packageRootPath: root.packageRootPath,
        bundle: {
          localApplicationId: manifest.id,
          applicationRootPath,
          name: manifest.name,
          description: manifest.description,
          iconRelativePath: manifest.iconRelativePath,
          entryHtmlRelativePath: manifest.entryHtmlRelativePath,
          runtimeTarget: manifest.runtimeTarget,
          localAgentIds,
          localTeamIds,
          writable: await isWritablePath(applicationRootPath),
          backend,
        },
      });
    }

    return records;
  }

  private async validateApplicationOwnedTeams(records: ScannedBundleRecord[]): Promise<void> {
    const applicationIdByTeamId = new Map<string, string>();

    for (const record of records) {
      for (const localAgentId of record.bundle.localAgentIds) {
        const source = buildApplicationSource(record, localAgentId, "agent");
        const definition = await readApplicationOwnedAgentDefinitionFromSource(
          buildApplicationOwnedAgentSourcePaths(source),
          source.definitionId,
        );
        if (!definition) {
          throw new Error(
            `Application bundle '${record.bundle.applicationRootPath}' application-owned agent '${localAgentId}' could not be read.`,
          );
        }
      }
      for (const localTeamId of record.bundle.localTeamIds) {
        const source = buildApplicationSource(record, localTeamId, "team");
        applicationIdByTeamId.set(source.definitionId, source.applicationId);
      }
    }

    for (const record of records) {
      const applicationId = buildCanonicalApplicationId(
        record.packageId,
        record.bundle.localApplicationId,
      );

      for (const localTeamId of record.bundle.localTeamIds) {
        const teamDir = path.join(record.bundle.applicationRootPath, "agent-teams", localTeamId);
        const definition = await readApplicationOwnedTeamDefinitionFromSource({
          sourcePaths: {
            teamDir,
            mdPath: path.join(teamDir, "team.md"),
            configPath: path.join(teamDir, "team-config.json"),
            rootPath: record.bundle.applicationRootPath,
            definitionId: buildCanonicalApplicationOwnedTeamId(
              record.packageId,
              record.bundle.localApplicationId,
              localTeamId,
            ),
            applicationId,
            applicationName: record.bundle.name,
            packageId: record.packageId,
            localApplicationId: record.bundle.localApplicationId,
            localTeamId,
          },
          canonicalizeTeamRef: (localNestedTeamId) =>
            buildCanonicalApplicationOwnedTeamId(
              record.packageId,
              record.bundle.localApplicationId,
              localNestedTeamId,
            ),
        });

        if (!definition) {
          continue;
        }

        await assertApplicationOwnedTeamIntegrity({
          owningApplicationId: applicationId,
          teamId: definition.id ?? localTeamId,
          nodes: definition.nodes,
          resolveLocalAgentRef: async (localAgentId) => {
            try {
              const filePaths = buildTeamLocalAgentFilePaths(teamDir, localAgentId);
              const mdContent = await fsPromises.readFile(filePaths.mdPath, "utf-8");
              parseAgentMd(mdContent, filePaths.mdPath);
              normalizeAgentConfigRecord(
                await readJsonFile<AgentConfigRecord>(filePaths.configPath, defaultAgentConfig()),
              );
              return { exists: true };
            } catch (error) {
              if ((error as NodeJS.ErrnoException).code === "ENOENT") {
                return { exists: false };
              }
              throw error;
            }
          },
          resolveNestedTeamRef: (ref) => ({
            exists: applicationIdByTeamId.has(ref),
            ownerApplicationId: applicationIdByTeamId.get(ref) ?? null,
          }),
        });
      }
    }
  }

  async listBundles(): Promise<ApplicationBundle[]> {
    const bundleRoots = await this.listBundleRoots();
    const scannedRecords = (
      await Promise.all(bundleRoots.map((root) => this.scanBundleRoot(root)))
    ).flat();

    await this.validateApplicationOwnedTeams(scannedRecords);

    return scannedRecords.map((record) => {
      const applicationId = buildCanonicalApplicationId(
        record.packageId,
        record.bundle.localApplicationId,
      );
      return {
        id: applicationId,
        localApplicationId: record.bundle.localApplicationId,
        packageId: record.packageId,
        name: record.bundle.name,
        description: record.bundle.description,
        iconAssetPath: null,
        entryHtmlAssetPath: "",
        runtimeTarget: {
          kind: record.bundle.runtimeTarget.kind,
          localId: record.bundle.runtimeTarget.localId,
          definitionId:
            record.bundle.runtimeTarget.kind === "AGENT"
              ? buildCanonicalApplicationOwnedAgentId(
                  record.packageId,
                  record.bundle.localApplicationId,
                  record.bundle.runtimeTarget.localId,
                )
              : buildCanonicalApplicationOwnedTeamId(
                  record.packageId,
                  record.bundle.localApplicationId,
                  record.bundle.runtimeTarget.localId,
                ),
        },
        writable: record.bundle.writable,
        applicationRootPath: record.bundle.applicationRootPath,
        packageRootPath: record.packageRootPath,
        localAgentIds: record.bundle.localAgentIds,
        localTeamIds: record.bundle.localTeamIds,
        entryHtmlRelativePath: record.bundle.entryHtmlRelativePath,
        iconRelativePath: record.bundle.iconRelativePath,
        backend: record.bundle.backend,
      };
    });
  }

  async validatePackageRoot(packageRootPath: string, packageId: string): Promise<void> {
    const records = await this.scanBundleRoot({ packageId, packageRootPath });
    await this.validateApplicationOwnedTeams(records);
  }

  buildApplicationOwnedAgentSources(bundle: ApplicationBundle): ApplicationOwnedDefinitionSource[] {
    return bundle.localAgentIds.map((localAgentId) => ({
      definitionId: buildCanonicalApplicationOwnedAgentId(
        bundle.packageId,
        bundle.localApplicationId,
        localAgentId,
      ),
      applicationId: bundle.id,
      applicationName: bundle.name,
      packageId: bundle.packageId,
      localApplicationId: bundle.localApplicationId,
      localDefinitionId: localAgentId,
      applicationRootPath: bundle.applicationRootPath,
      packageRootPath: bundle.packageRootPath,
      writable: bundle.writable,
    }));
  }

  buildApplicationOwnedTeamSources(bundle: ApplicationBundle): ApplicationOwnedDefinitionSource[] {
    return bundle.localTeamIds.map((localTeamId) => ({
      definitionId: buildCanonicalApplicationOwnedTeamId(
        bundle.packageId,
        bundle.localApplicationId,
        localTeamId,
      ),
      applicationId: bundle.id,
      applicationName: bundle.name,
      packageId: bundle.packageId,
      localApplicationId: bundle.localApplicationId,
      localDefinitionId: localTeamId,
      applicationRootPath: bundle.applicationRootPath,
      packageRootPath: bundle.packageRootPath,
      writable: bundle.writable,
    }));
  }
}
