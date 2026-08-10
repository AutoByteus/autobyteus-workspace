import { parseCustomLlmProviderConfigFile } from "autobyteus-ts";
import { normalizeOpenAICompatibleEndpointBaseUrl } from "autobyteus-ts/llm/openai-compatible-endpoint-discovery.js";
import { LLMProvider } from "autobyteus-ts/llm/providers.js";
import { z } from "zod";
import { appConfigProvider } from "../../config/app-config-provider.js";
import type {
  AppDataMigrationDefinition,
  AppDataMigrationExecutionResult,
} from "../domain/app-data-migration-types.js";
import { normalizeProviderName } from "../../llm-management/llm-providers/domain/models.js";
import {
  type CanonicalCustomProviderFileIdentity,
  CustomProviderV1MigrationFile,
} from "./custom-provider-v1-migration-file.js";
import { customProviderV2MigrationFileSchema } from "./custom-provider-migration-name-snapshot.js";

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
export type CustomProviderV1MigrationOutcome =
  | "STAGED_RECONFIGURATION_REQUIRED"
  | "RECONFIGURATION_REQUIRED"
  | "RESET_UNAVAILABLE";

const OUTCOME_RESULTS = {
  STAGED_RECONFIGURATION_REQUIRED: {
    status: "SUCCEEDED_WITH_WARNINGS",
    counts: [1, 1, 0, 0],
    itemStatus: "MIGRATED",
    message: "CUSTOM_PROVIDER_V1_RECONFIGURATION_REQUIRED",
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

  for (const provider of parsed.providers) {
    if (!/^provider_[A-Za-z0-9_-]+$/.test(provider.id)) {
      throw new Error("CUSTOM_PROVIDER_V1_INVALID_PROVIDER_ID");
    }
    normalizeOpenAICompatibleEndpointBaseUrl(provider.baseUrl);
    const normalizedName = normalizeProviderName(provider.name);
    if (
      providerIds.has(provider.id)
      || providerNames.has(normalizedName)
    ) {
      throw new Error("CUSTOM_PROVIDER_V1_DUPLICATE");
    }
    providerIds.add(provider.id);
    providerNames.add(normalizedName);
  }
  return parsed;
};

export class CustomProviderV1AppDataMigration implements AppDataMigrationDefinition {
  readonly id = MIGRATION_ID;
  readonly displayName = "Custom provider credential migration";
  readonly description =
    "Removes inline legacy custom-provider credentials before readable identity reset.";
  readonly requiredOnStartup = true;
  private readonly file: CustomProviderV1MigrationFile;

  constructor(
    appDataDir: string = appConfigProvider.config.getAppDataDir(),
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
      if (raw && typeof raw === "object" && !Array.isArray(raw)) {
        const version = (raw as { version?: unknown }).version;
        if (version === 2 && customProviderV2MigrationFileSchema.safeParse(raw).success) {
          return resultFor("NOT_REQUIRED");
        }
        if (version === 3 && (() => {
          try {
            parseCustomLlmProviderConfigFile(raw);
            return true;
          } catch {
            return false;
          }
        })()) {
          return resultFor("NOT_REQUIRED");
        }
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

    try {
      stagePath = await this.file.stageCurrentFile({
        version: 2,
        providers: v1.providers.map(({ apiKey: _apiKey, ...provider }) => provider),
      });
      await this.file.syncStage(stagePath);
      await this.file.publishStage(stagePath, sourceIdentity);
      stagePath = null;
      return resultFor("STAGED_RECONFIGURATION_REQUIRED");
    } catch {
      await this.file.discardStage(stagePath).catch(() => undefined);
      return this.reset(sourceIdentity);
    } finally {
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
