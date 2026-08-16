import { randomUUID } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import {
  buildCustomProviderId,
  normalizeProviderName,
  parseCustomLlmProviderConfigFile,
  type CustomLlmProviderConfigFile,
} from 'autobyteus-ts';
import { appConfigProvider } from '../../config/app-config-provider.js';
import { getSecretVaultRuntime } from '../../secret-management/secret-vault-runtime.js';
import { getBuiltInLlmProviderCatalog } from '../../llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js';
import { withFilePathLock } from '../../persistence/file/store-utils.js';
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
  AppDataMigrationItemDetail,
} from '../domain/app-data-migration-types.js';
import {
  customProviderV2MigrationFileSchema,
  type CustomProviderV2MigrationFile,
} from './custom-provider-migration-name-snapshot.js';
import { CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID } from './custom-provider-v1-app-data-migration.js';
import { REMOVE_GLOBAL_SKILL_DISCOVERY_MODE_MIGRATION_ID } from './remove-global-skill-discovery-mode-migration.js';
import { TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID } from './team-run-metadata-member-tree-migration.js';
import { TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID } from './token-usage-provider-name-snapshot-backfill-migration.js';
import { REMOVE_SELF_EVOLUTION_RUN_METADATA_MIGRATION_ID } from './remove-self-evolution-run-metadata-migration.js';
import {
  CustomProviderReadableIdJsonSelectorMigrator,
  type CustomProviderReadableIdMapping,
  type ReadableIdSelectorMigrationDetail,
} from './custom-provider-readable-id-json-selector-migrator.js';
import { CustomProviderReadableIdApplicationSelectorMigrator } from './custom-provider-readable-id-application-selector-migrator.js';

export const CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID =
  '20260803_custom_provider_readable_identity';

export const CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS = [
  CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID,
  REMOVE_GLOBAL_SKILL_DISCOVERY_MODE_MIGRATION_ID,
  TEAM_RUN_METADATA_MEMBER_TREE_MIGRATION_ID,
  TOKEN_USAGE_PROVIDER_NAME_SNAPSHOT_BACKFILL_MIGRATION_ID,
  REMOVE_SELF_EVOLUTION_RUN_METADATA_MIGRATION_ID,
] as const;

type FileIdentity = {
  device: number;
  inode: number;
  size: number;
  modifiedMs: number;
  kind: 'FILE' | 'UNSAFE';
};

type ProviderSnapshot =
  | { kind: 'MISSING' }
  | { kind: 'V2'; bytes: Buffer; identity: FileIdentity; parsed: CustomProviderV2MigrationFile }
  | { kind: 'V3'; parsed: CustomLlmProviderConfigFile }
  | { kind: 'INVALID'; bytes: Buffer | null; identity: FileIdentity };

type SecretRemovalOwner = {
  removeForConsumer(consumer: {
    kind: 'llm';
    providerId: string;
    credentialSlot: 'apiKey';
  }): Promise<void>;
};

const emptyV3Bytes = Buffer.from(`${JSON.stringify({ version: 3, providers: [] }, null, 2)}\n`);

const identityFor = (stat: Awaited<ReturnType<typeof fs.lstat>>): FileIdentity => ({
  device: Number(stat.dev),
  inode: Number(stat.ino),
  size: Number(stat.size),
  modifiedMs: Number(stat.mtimeMs),
  kind: stat.isFile() && !stat.isSymbolicLink() ? 'FILE' : 'UNSAFE',
});

const sameIdentity = (left: FileIdentity, right: FileIdentity): boolean =>
  left.device === right.device
  && left.inode === right.inode
  && left.size === right.size
  && left.modifiedMs === right.modifiedMs
  && left.kind === right.kind;

const detail = (
  itemId: string,
  status: AppDataMigrationItemDetail['status'],
  message: string,
  filePath?: string,
): AppDataMigrationItemDetail => ({ itemId, status, message, filePath });

const toResult = (
  details: AppDataMigrationItemDetail[],
  fatalError: string | null = null,
): AppDataMigrationExecutionResult => {
  const migratedCount = details.filter(({ status }) => status === 'MIGRATED').length;
  const skippedCount = details.filter(({ status }) => status === 'SKIPPED').length;
  const failedCount = details.filter(({ status }) => status === 'FAILED').length;
  return {
    status: fatalError
      ? 'FAILED'
      : failedCount > 0 ? 'SUCCEEDED_WITH_WARNINGS' : 'SUCCEEDED',
    summary: {
      scannedCount: details.length,
      migratedCount,
      skippedCount,
      failedCount,
      details,
    },
    errorMessage: fatalError,
  };
};

const selectorDetails = (
  source: readonly ReadableIdSelectorMigrationDetail[],
): AppDataMigrationItemDetail[] => source.map((entry, index) => ({
  itemId: `${entry.kind.toLowerCase()}-${index + 1}`,
  filePath: entry.filePath,
  status: entry.status,
  message: entry.message,
}));

const sanitizedFatal = (error: unknown): string => {
  if (error instanceof Error && /^CUSTOM_PROVIDER_READABLE_ID_[A-Z_]+$/.test(error.message)) {
    return error.message;
  }
  return 'CUSTOM_PROVIDER_READABLE_ID_UNAVAILABLE';
};

export class CustomProviderReadableIdAppDataMigration implements AppDataMigrationDefinition {
  readonly id = CUSTOM_PROVIDER_READABLE_ID_APP_DATA_MIGRATION_ID;
  readonly displayName = 'Custom provider readable identity reset';
  readonly description = 'Maps active UUID selectors, resets legacy providers, and removes old keys.';
  readonly requiredOnStartup = true;
  readonly prerequisiteMigrationIds = CUSTOM_PROVIDER_READABLE_ID_PREREQUISITE_IDS;

  private readonly providerFilePath: string;
  private readonly jsonSelectors: CustomProviderReadableIdJsonSelectorMigrator;
  private readonly applicationSelectors: CustomProviderReadableIdApplicationSelectorMigrator;

  constructor(
    private readonly appDataDir: string = appConfigProvider.config.getAppDataDir(),
    private readonly getSecretOwner: () => SecretRemovalOwner =
      () => getSecretVaultRuntime().requireService(),
    selectorRoots?: readonly string[],
    private readonly builtInProviderNames: readonly string[] =
      getBuiltInLlmProviderCatalog().listProviders().map(({ name }) => name),
  ) {
    this.providerFilePath = path.join(appDataDir, 'llm', 'custom-llm-providers.json');
    const memoryRoot = path.join(appDataDir, 'memory');
    this.jsonSelectors = new CustomProviderReadableIdJsonSelectorMigrator({
      configRoots: selectorRoots ?? [
        appDataDir,
        ...appConfigProvider.config.getAdditionalAgentPackageRoots(),
        ...appConfigProvider.config.getAdditionalApplicationPackageRoots(),
      ],
      bindingsPath: path.join(appDataDir, 'external-channel', 'bindings.json'),
      agentRunsRoot: path.join(memoryRoot, 'agents'),
      teamRunsRoot: path.join(memoryRoot, 'agent_teams'),
      memoryRoot,
    });
    this.applicationSelectors = new CustomProviderReadableIdApplicationSelectorMigrator(appDataDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    try {
      return await withFilePathLock(this.providerFilePath, () => this.executeLocked());
    } catch (error) {
      const code = sanitizedFatal(error);
      return toResult([detail('readable-provider-reset', 'FAILED', code)], code);
    }
  }

  private async executeLocked(): Promise<AppDataMigrationExecutionResult> {
    const provider = await this.readProviderSnapshot();
    if (provider.kind === 'MISSING') {
      return toResult([detail(
        'readable-provider-reset',
        'SKIPPED',
        'CUSTOM_PROVIDER_READABLE_ID_NOT_REQUIRED',
        this.providerFilePath,
      )]);
    }
    if (provider.kind === 'V3') {
      return toResult([detail(
        'readable-provider-reset',
        'SKIPPED',
        'CUSTOM_PROVIDER_READABLE_ID_ALREADY_CURRENT',
        this.providerFilePath,
      )]);
    }

    const details: AppDataMigrationItemDetail[] = [];
    const cleanupProviderIds = provider.kind === 'V2'
      ? provider.parsed.providers.map(({ id }) => id)
      : [];
    const mappings = provider.kind === 'V2'
      ? this.buildMappings(provider.parsed, details)
      : [];
    if (provider.kind === 'INVALID') {
      details.push(detail(
        'legacy-provider-map',
        'FAILED',
        'CUSTOM_PROVIDER_READABLE_ID_LEGACY_PROVIDER_INVALID',
        this.providerFilePath,
      ));
    }

    try {
      details.push(...selectorDetails(await this.jsonSelectors.migrate(mappings)));
    } catch {
      details.push(detail(
        'json-selector-inventory',
        'FAILED',
        'CUSTOM_PROVIDER_READABLE_ID_SELECTOR_UNAVAILABLE',
      ));
    }
    details.push(...selectorDetails(this.applicationSelectors.migrate(mappings)));

    try {
      await this.publishEmptyV3(provider);
      details.push(detail(
        'readable-provider-reset',
        'MIGRATED',
        'CUSTOM_PROVIDER_READABLE_ID_EMPTY_V3_PUBLISHED',
        this.providerFilePath,
      ));
    } catch {
      const code = 'CUSTOM_PROVIDER_READABLE_ID_PROVIDER_PUBLISH_FAILED';
      details.push(detail('readable-provider-reset', 'FAILED', code, this.providerFilePath));
      return toResult(details, code);
    } finally {
      if (provider.bytes) provider.bytes.fill(0);
    }

    for (const [index, providerId] of cleanupProviderIds.entries()) {
      try {
        await this.getSecretOwner().removeForConsumer({
          kind: 'llm',
          providerId,
          credentialSlot: 'apiKey',
        });
        details.push(detail(
          `legacy-secret-removal-${index + 1}`,
          'MIGRATED',
          'CUSTOM_PROVIDER_READABLE_ID_OLD_SECRET_REMOVED',
        ));
      } catch {
        details.push(detail(
          `legacy-secret-removal-${index + 1}`,
          'FAILED',
          'CUSTOM_PROVIDER_READABLE_ID_OLD_SECRET_REMOVAL_FAILED',
        ));
      }
    }
    return toResult(details);
  }

  private buildMappings(
    provider: CustomProviderV2MigrationFile,
    details: AppDataMigrationItemDetail[],
  ): CustomProviderReadableIdMapping[] {
    try {
      const builtInNames = new Set(this.builtInProviderNames.map(normalizeProviderName));
      const targetIds = new Set<string>();
      const mappings = provider.providers.map((record) => {
        if (builtInNames.has(normalizeProviderName(record.name))) {
          throw new Error('CUSTOM_PROVIDER_READABLE_ID_BUILT_IN_NAME_CONFLICT');
        }
        const futureProviderId = buildCustomProviderId(record.name);
        if (targetIds.has(futureProviderId)) {
          throw new Error('CUSTOM_PROVIDER_READABLE_ID_TARGET_COLLISION');
        }
        targetIds.add(futureProviderId);
        return { oldProviderId: record.id, futureProviderId };
      });
      details.push(detail(
        'legacy-provider-map',
        'MIGRATED',
        `CUSTOM_PROVIDER_READABLE_ID_MAPPING_DERIVED:${mappings.length}`,
      ));
      return mappings;
    } catch {
      details.push(detail(
        'legacy-provider-map',
        'FAILED',
        'CUSTOM_PROVIDER_READABLE_ID_MAPPING_INVALID',
      ));
      return [];
    }
  }

  private async readProviderSnapshot(): Promise<ProviderSnapshot> {
    let stat: Awaited<ReturnType<typeof fs.lstat>>;
    try { stat = await fs.lstat(this.providerFilePath); } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { kind: 'MISSING' };
      throw new Error('CUSTOM_PROVIDER_READABLE_ID_PROVIDER_INVALID');
    }
    const identity = identityFor(stat);
    if (identity.kind === 'UNSAFE') return { kind: 'INVALID', bytes: null, identity };

    let bytes: Buffer;
    try { bytes = await fs.readFile(this.providerFilePath); } catch {
      return { kind: 'INVALID', bytes: null, identity };
    }
    try {
      const raw = JSON.parse(bytes.toString('utf8')) as { version?: unknown };
      if (raw?.version === 2) {
        const parsed = customProviderV2MigrationFileSchema.safeParse(raw);
        return parsed.success
          ? { kind: 'V2', bytes, identity, parsed: parsed.data }
          : { kind: 'INVALID', bytes, identity };
      }
      const parsed = parseCustomLlmProviderConfigFile(raw);
      bytes.fill(0);
      return { kind: 'V3', parsed };
    } catch {
      return { kind: 'INVALID', bytes, identity };
    }
  }

  private async publishEmptyV3(
    provider: Extract<ProviderSnapshot, { kind: 'V2' | 'INVALID' }>,
  ): Promise<void> {
    parseCustomLlmProviderConfigFile(JSON.parse(emptyV3Bytes.toString('utf8')));
    const temporaryPath = path.join(
      path.dirname(this.providerFilePath),
      `.custom-llm-providers.${process.pid}.${randomUUID()}.v3-stage`,
    );
    try {
      const handle = await fs.open(temporaryPath, 'wx', 0o600);
      try {
        await handle.writeFile(emptyV3Bytes);
        await handle.sync();
      } finally {
        await handle.close();
      }
      const currentIdentity = identityFor(await fs.lstat(this.providerFilePath));
      if (!sameIdentity(currentIdentity, provider.identity)) {
        throw new Error('CUSTOM_PROVIDER_READABLE_ID_PROVIDER_CHANGED');
      }
      if (provider.bytes && !(await fs.readFile(this.providerFilePath)).equals(provider.bytes)) {
        throw new Error('CUSTOM_PROVIDER_READABLE_ID_PROVIDER_CHANGED');
      }
      await fs.rename(temporaryPath, this.providerFilePath);
      const directory = await fs.open(path.dirname(this.providerFilePath), 'r');
      try { await directory.sync(); } finally { await directory.close(); }
    } catch (error) {
      await fs.rm(temporaryPath, { force: true }).catch(() => undefined);
      throw error;
    }
  }
}
