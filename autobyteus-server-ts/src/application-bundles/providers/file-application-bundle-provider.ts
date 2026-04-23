import fs from "node:fs";
import fsPromises from "node:fs/promises";
import path from "node:path";
import type {
  ApplicationBundle,
  ApplicationOwnedDefinitionSource,
  ValidatedApplicationBundle,
} from "../domain/models.js";
import type {
  ApplicationCatalogDiagnostic,
  ApplicationCatalogSnapshot,
} from "../domain/application-catalog-snapshot.js";
import type { ApplicationPackageRegistrySnapshot } from "../../application-packages/domain/application-package-registry-snapshot.js";
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

type ScanBundleRecordResult = {
  record: ScannedBundleRecord | null;
  diagnostic: ApplicationCatalogDiagnostic | null;
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

const createDiagnostic = (
  root: BundleRootDescriptor,
  localApplicationId: string,
  applicationRootPath: string,
  message: string,
): ApplicationCatalogDiagnostic => ({
  applicationId: buildCanonicalApplicationId(root.packageId, localApplicationId),
  localApplicationId,
  packageId: root.packageId,
  packageRootPath: root.packageRootPath,
  applicationRootPath,
  message,
  discoveredAt: new Date().toISOString(),
});

const validateManifestResourceSlotDefaults = (record: ScannedBundleRecord): void => {
  const bundleAgentIds = new Set(record.bundle.localAgentIds);
  const bundleTeamIds = new Set(record.bundle.localTeamIds);
  for (const slot of record.bundle.resourceSlots) {
    const defaultResourceRef = slot.defaultResourceRef;
    if (!defaultResourceRef || defaultResourceRef.owner !== "bundle") {
      continue;
    }
    if (
      (defaultResourceRef.kind === "AGENT" && !bundleAgentIds.has(defaultResourceRef.localId))
      || (defaultResourceRef.kind === "AGENT_TEAM" && !bundleTeamIds.has(defaultResourceRef.localId))
    ) {
      throw new Error(
        `Application bundle '${record.bundle.applicationRootPath}' resource slot '${slot.slotKey}' defaultResourceRef.localId '${defaultResourceRef.localId}' does not resolve to a discovered bundle-owned ${defaultResourceRef.kind.toLowerCase()}.`,
      );
    }
  }
};

export class FileApplicationBundleProvider {
  constructor(..._legacyDependencies: unknown[]) {}

  private listBundleRoots(registrySnapshot: ApplicationPackageRegistrySnapshot): BundleRootDescriptor[] {
    return registrySnapshot.packages.map((packageEntry) => ({
      packageId: packageEntry.packageId,
      packageRootPath: path.resolve(packageEntry.packageRootPath),
    }));
  }

  private async scanBundleRecord(
    root: BundleRootDescriptor,
    localApplicationId: string,
  ): Promise<ScanBundleRecordResult> {
    const applicationRootPath = path.join(root.packageRootPath, "applications", localApplicationId);
    const manifestPath = getApplicationManifestPath(applicationRootPath);
    try {
      const manifest = parseApplicationManifest(applicationRootPath, manifestPath);
      if (manifest.id !== localApplicationId) {
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

      const record: ScannedBundleRecord = {
        packageId: root.packageId,
        packageRootPath: root.packageRootPath,
        bundle: {
          localApplicationId: manifest.id,
          applicationRootPath,
          name: manifest.name,
          description: manifest.description,
          iconRelativePath: manifest.iconRelativePath,
          entryHtmlRelativePath: manifest.entryHtmlRelativePath,
          resourceSlots: manifest.resourceSlots,
          localAgentIds,
          localTeamIds,
          writable: await isWritablePath(applicationRootPath),
          backend,
        },
      };
      validateManifestResourceSlotDefaults(record);
      return { record, diagnostic: null };
    } catch (error) {
      return {
        record: null,
        diagnostic: createDiagnostic(
          root,
          localApplicationId,
          applicationRootPath,
          error instanceof Error ? error.message : String(error),
        ),
      };
    }
  }

  private async scanBundleRoot(root: BundleRootDescriptor): Promise<ScanBundleRecordResult[]> {
    const applicationsDir = path.join(root.packageRootPath, "applications");
    let entries: fs.Dirent[] = [];
    try {
      entries = await fsPromises.readdir(applicationsDir, { withFileTypes: true });
    } catch {
      return [];
    }

    const results: ScanBundleRecordResult[] = [];
    for (const entry of entries) {
      if (!entry.isDirectory() || entry.name.startsWith("_")) {
        continue;
      }

      const applicationRootPath = path.join(applicationsDir, entry.name);
      const manifestPath = getApplicationManifestPath(applicationRootPath);
      if (!fs.existsSync(manifestPath)) {
        continue;
      }

      results.push(await this.scanBundleRecord(root, entry.name));
    }

    return results;
  }

  private async validateApplicationOwnedRecord(
    record: ScannedBundleRecord,
    applicationIdByTeamId: Map<string, string>,
  ): Promise<void> {
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

  private async finalizeValidRecords(
    scannedRecords: ScannedBundleRecord[],
  ): Promise<{ validRecords: ScannedBundleRecord[]; diagnostics: ApplicationCatalogDiagnostic[] }> {
    const applicationIdByTeamId = new Map<string, string>();
    for (const record of scannedRecords) {
      for (const localTeamId of record.bundle.localTeamIds) {
        const source = buildApplicationSource(record, localTeamId, "team");
        applicationIdByTeamId.set(source.definitionId, source.applicationId);
      }
    }

    const validRecords: ScannedBundleRecord[] = [];
    const diagnostics: ApplicationCatalogDiagnostic[] = [];
    for (const record of scannedRecords) {
      try {
        await this.validateApplicationOwnedRecord(record, applicationIdByTeamId);
        validRecords.push(record);
      } catch (error) {
        diagnostics.push(
          createDiagnostic(
            { packageId: record.packageId, packageRootPath: record.packageRootPath },
            record.bundle.localApplicationId,
            record.bundle.applicationRootPath,
            error instanceof Error ? error.message : String(error),
          ),
        );
      }
    }

    return { validRecords, diagnostics };
  }

  private mapRecordToBundle(record: ScannedBundleRecord): ApplicationBundle {
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
      bundleResources: [
        ...record.bundle.localAgentIds.map((localId) => ({
          kind: "AGENT" as const,
          localId,
          definitionId: buildCanonicalApplicationOwnedAgentId(
            record.packageId,
            record.bundle.localApplicationId,
            localId,
          ),
        })),
        ...record.bundle.localTeamIds.map((localId) => ({
          kind: "AGENT_TEAM" as const,
          localId,
          definitionId: buildCanonicalApplicationOwnedTeamId(
            record.packageId,
            record.bundle.localApplicationId,
            localId,
          ),
        })),
      ],
      resourceSlots: record.bundle.resourceSlots,
      writable: record.bundle.writable,
      applicationRootPath: record.bundle.applicationRootPath,
      packageRootPath: record.packageRootPath,
      localAgentIds: record.bundle.localAgentIds,
      localTeamIds: record.bundle.localTeamIds,
      entryHtmlRelativePath: record.bundle.entryHtmlRelativePath,
      iconRelativePath: record.bundle.iconRelativePath,
      backend: record.bundle.backend,
    };
  }

  async getCatalogSnapshot(registrySnapshot: ApplicationPackageRegistrySnapshot): Promise<ApplicationCatalogSnapshot> {
    const bundleRoots = this.listBundleRoots(registrySnapshot);
    const scanResults = (
      await Promise.all(bundleRoots.map((root) => this.scanBundleRoot(root)))
    ).flat();
    const scannedRecords = scanResults
      .map((result) => result.record)
      .filter((value): value is ScannedBundleRecord => Boolean(value));
    const scanDiagnostics = scanResults
      .map((result) => result.diagnostic)
      .filter((value): value is ApplicationCatalogDiagnostic => Boolean(value));

    const { validRecords, diagnostics: validationDiagnostics } = await this.finalizeValidRecords(scannedRecords);
    return {
      applications: validRecords.map((record) => this.mapRecordToBundle(record)),
      diagnostics: [...scanDiagnostics, ...validationDiagnostics],
      refreshedAt: new Date().toISOString(),
    };
  }

  async listBundles(registrySnapshot: ApplicationPackageRegistrySnapshot): Promise<ApplicationBundle[]> {
    return (await this.getCatalogSnapshot(registrySnapshot)).applications;
  }

  async validatePackageRoot(packageRootPath: string, packageId: string): Promise<void> {
    const scanResults = await this.scanBundleRoot({ packageId, packageRootPath });
    const scannedRecords = scanResults
      .map((result) => result.record)
      .filter((value): value is ScannedBundleRecord => Boolean(value));
    const diagnostics = scanResults
      .map((result) => result.diagnostic)
      .filter((value): value is ApplicationCatalogDiagnostic => Boolean(value));
    const { diagnostics: validationDiagnostics } = await this.finalizeValidRecords(scannedRecords);
    const firstDiagnostic = [...diagnostics, ...validationDiagnostics][0];
    if (firstDiagnostic) {
      throw new Error(firstDiagnostic.message);
    }
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
