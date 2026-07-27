import { SecretValue } from "autobyteus-ts";
import { normalizeOpenAICompatibleEndpointBaseUrl } from "autobyteus-ts/llm/openai-compatible-endpoint-discovery.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { z } from "zod";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
} from "../domain/app-data-migration-types.js";
import { customProviderSecretId } from "../../secret-management/domain/secret-id.js";
import type { SecretManagementService } from "../../secret-management/services/secret-management-service.js";
import { getSecretVaultRuntime } from "../../secret-management/secret-vault-runtime.js";
import { normalizeProviderName } from "../../llm-management/llm-providers/domain/models.js";
import {
  type CanonicalCustomProviderFileIdentity,
  CustomProviderV1MigrationFile,
} from "./custom-provider-v1-migration-file.js";

const MIGRATION_ID = "20260727_custom_provider_v1_secret_migration";
const ITEM_ID = "custom-provider-v1";

const v1ProviderSchema = z.object({
  id: z.string().trim().min(1),
  name: z.string().trim().min(1),
  providerType: z.literal(LLMProvider.OPENAI_COMPATIBLE),
  baseUrl: z.string().trim().min(1),
  apiKey: z.string().trim().min(1),
}).strict();

const v1FileSchema = z.object({
  version: z.literal(1),
  providers: z.array(v1ProviderSchema),
}).strict();

type V1File = z.infer<typeof v1FileSchema>;
type MigrationSecretOwner = Pick<
  SecretManagementService,
  | "createMissingBatchForCustomProviderMigration"
  | "compensateUnpublishedCustomProviderBatch"
>;

export type CustomProviderV1MigrationOutcome =
  | "MIGRATED"
  | "RECONFIGURATION_REQUIRED"
  | "RESET_UNAVAILABLE";

const OUTCOME_RESULTS = {
  MIGRATED: {
    status: "SUCCEEDED",
    counts: [1, 1, 0, 0],
    itemStatus: "MIGRATED",
    message: "CUSTOM_PROVIDER_V1_MIGRATED",
    errorMessage: null,
  },
  RECONFIGURATION_REQUIRED: {
    status: "SUCCEEDED_WITH_WARNINGS",
    counts: [1, 0, 1, 0],
    itemStatus: "SKIPPED",
    message: "CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED",
    errorMessage: null,
  },
  RESET_UNAVAILABLE: {
    status: "FAILED",
    counts: [1, 0, 0, 1],
    itemStatus: "FAILED",
    message: "CUSTOM_PROVIDER_V1_RESET_UNAVAILABLE",
    errorMessage: "CUSTOM_PROVIDER_V1_RESET_UNAVAILABLE",
  },
  NOT_REQUIRED: {
    status: "SUCCEEDED",
    counts: [0, 0, 1, 0],
    itemStatus: "SKIPPED",
    message: "CUSTOM_PROVIDER_V1_NOT_REQUIRED",
    errorMessage: null,
  },
} as const;

const resultFor = (
  outcome: CustomProviderV1MigrationOutcome | "NOT_REQUIRED",
): AppDataMigrationExecutionResult => {
  const configured = OUTCOME_RESULTS[outcome];
  const [scannedCount, migratedCount, skippedCount, failedCount] = configured.counts;
  return {
    status: configured.status,
    summary: {
      scannedCount,
      migratedCount,
      skippedCount,
      failedCount,
      details: [{
        itemId: ITEM_ID,
        status: configured.itemStatus,
        message: configured.message,
      }],
    },
    errorMessage: configured.errorMessage,
  };
};

const validateV1File = (value: unknown): V1File => {
  const parsed = v1FileSchema.parse(value);
  const providerIds = new Set<string>();
  const providerNames = new Set<string>();
  const secretIds = new Set<string>();

  for (const provider of parsed.providers) {
    if (!/^provider_[A-Za-z0-9_-]+$/.test(provider.id)) {
      throw new Error("CUSTOM_PROVIDER_V1_INVALID_PROVIDER_ID");
    }
    normalizeOpenAICompatibleEndpointBaseUrl(provider.baseUrl);
    const normalizedName = normalizeProviderName(provider.name);
    const targetId = String(customProviderSecretId(provider.id));
    if (
      providerIds.has(provider.id)
      || providerNames.has(normalizedName)
      || secretIds.has(targetId)
    ) {
      throw new Error("CUSTOM_PROVIDER_V1_DUPLICATE");
    }
    providerIds.add(provider.id);
    providerNames.add(normalizedName);
    secretIds.add(targetId);
  }
  return parsed;
};

export class CustomProviderV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Custom provider credential migration";
  readonly description =
    "Moves the fixed legacy custom-provider credentials into the application vault.";
  readonly requiredOnStartup = true;
  private readonly file: CustomProviderV1MigrationFile;

  constructor(
    appDataDir: string = appConfigProvider.config.getAppDataDir(),
    private readonly getSecretOwner: () => MigrationSecretOwner =
      () => getSecretVaultRuntime().requireService(),
  ) {
    this.file = new CustomProviderV1MigrationFile(appDataDir);
  }

  async execute(): Promise<AppDataMigrationExecutionResult> {
    try {
      return await this.file.withPathLock(() => this.executeLocked());
    } catch {
      return resultFor("RESET_UNAVAILABLE");
    }
  }

  private async executeLocked(): Promise<AppDataMigrationExecutionResult> {
    const snapshot = await this.file.readCanonical();
    if (snapshot.kind === "MISSING") return resultFor("NOT_REQUIRED");
    if (snapshot.kind === "UNSAFE") {
      return this.reset(snapshot.deletionIdentity);
    }

    try {
      let raw: unknown;
      try {
        raw = JSON.parse(snapshot.bytes.toString("utf8"));
      } catch {
        return await this.reset(snapshot.identity);
      }
      if (
        raw
        && typeof raw === "object"
        && !Array.isArray(raw)
        && (raw as { version?: unknown }).version === 2
      ) {
        return resultFor("NOT_REQUIRED");
      }

      let v1: V1File;
      try {
        v1 = validateV1File(raw);
      } catch {
        return await this.reset(snapshot.identity);
      }
      return await this.migrateValidatedV1(v1, snapshot.identity);
    } finally {
      snapshot.bytes.fill(0);
    }
  }

  private async migrateValidatedV1(
    v1: V1File,
    sourceIdentity: CanonicalCustomProviderFileIdentity,
  ): Promise<AppDataMigrationExecutionResult> {
    let stagePath: string | null = null;
    let receipt: Awaited<
      ReturnType<MigrationSecretOwner["createMissingBatchForCustomProviderMigration"]>
    > | null = null;

    try {
      stagePath = await this.file.stageCurrentFile({
        version: 2,
        providers: v1.providers.map(({ apiKey: _apiKey, ...provider }) => provider),
      });
      receipt = await this.getSecretOwner().createMissingBatchForCustomProviderMigration(
        v1.providers.map((provider) => ({
          secretId: customProviderSecretId(provider.id),
          input: SecretValue.fromString(provider.apiKey),
        })),
      );
      await this.file.syncStage(stagePath);
      await this.file.publishStage(stagePath, sourceIdentity);
      stagePath = null;
      return resultFor("MIGRATED");
    } catch {
      if (receipt) {
        await this.getSecretOwner()
          .compensateUnpublishedCustomProviderBatch(receipt)
          .catch(() => undefined);
      }
      await this.file.discardStage(stagePath).catch(() => undefined);
      return this.reset(sourceIdentity);
    } finally {
      receipt?.release();
      for (const provider of v1.providers) provider.apiKey = "";
    }
  }

  private async reset(
    sourceIdentity: CanonicalCustomProviderFileIdentity | null,
  ): Promise<AppDataMigrationExecutionResult> {
    return resultFor(
      await this.file.deleteCanonical(sourceIdentity)
        ? "RECONFIGURATION_REQUIRED"
        : "RESET_UNAVAILABLE",
    );
  }
}

export const CUSTOM_PROVIDER_V1_APP_DATA_MIGRATION_ID = MIGRATION_ID;
