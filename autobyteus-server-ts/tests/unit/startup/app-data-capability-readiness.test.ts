import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { buildCustomProviderId } from "autobyteus-ts";
import { LLMFactory } from "autobyteus-ts/llm/llm-factory.js";
import { AudioClientFactory } from "autobyteus-ts/multimedia/audio/audio-client-factory.js";
import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import { VideoClientFactory } from "autobyteus-ts/multimedia/video/video-client-factory.js";
import { AppDataMigrationRegistry } from "../../../src/app-data-migrations/app-data-migration-registry.js";
import { AppDataMigrationRunner } from "../../../src/app-data-migrations/app-data-migration-runner.js";
import type {
  AppDataMigrationRecordRepositoryLike,
  AppDataMigrationRecordSnapshot,
} from "../../../src/app-data-migrations/domain/app-data-migration-types.js";
import { getBuiltInLlmProviderCatalog } from "../../../src/llm-management/llm-providers/builtins/built-in-llm-provider-catalog.js";
import { LlmProviderService } from "../../../src/llm-management/llm-providers/services/llm-provider-service.js";
import { CustomLlmProviderStore } from "../../../src/llm-management/llm-providers/stores/custom-llm-provider-store.js";
import { ModelAvailabilityService } from "../../../src/llm-management/services/model-availability-service.js";
import { ModelCatalogService } from "../../../src/llm-management/services/model-catalog-service.js";
import { applyCapabilityReadiness, markCapabilitiesPending } from "../../../src/startup/app-data-capability-readiness.js";
import { TokenUsageRunStore } from "../../../src/token-usage/providers/token-usage-run-store.js";

/**
 * Capability readiness end to end (autobyteus-280, REQ-006): the registered migrations' declarations, the runner's
 * answer, the one startup owner, and the features each capability holds back. Synthesized data only (TESTING.md).
 */

const TOKEN_USAGE_MIGRATION_ID = "20260819_token_usage_run_records_v1";
const CUSTOM_PROVIDER_MIGRATION_ID = "20260803_custom_provider_readable_identity";
const GATEWAY_NAME = "Internal Gateway";

class RecordedStatuses implements Pick<AppDataMigrationRecordRepositoryLike, "listRecords"> {
  readonly records: AppDataMigrationRecordSnapshot[] = [];
  succeeded(migrationId: string): void {
    this.records.push({
      migrationId, displayName: migrationId, status: "SUCCEEDED", attempts: 1, startedAt: new Date(),
      completedAt: new Date(), summary: "Scanned 0; migrated 0; skipped 0; failed 0.", errorMessage: null, logPath: null,
    });
  }
  async listRecords() { return this.records; }
}

const roots: string[] = [];
const appDataRoot = async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "app-data-capability-readiness-"));
  roots.push(root);
  return root;
};
const writeProviderFile = async (appDataDir: string, value: unknown) => {
  await fs.mkdir(path.join(appDataDir, "llm"), { recursive: true });
  await fs.writeFile(path.join(appDataDir, "llm", "custom-llm-providers.json"), `${JSON.stringify(value, null, 2)}\n`);
};
// The released V2 provider file the readable-identity migration converts; the current parser cannot read it.
const releasedV2ProviderFile = {
  version: 2,
  providers: [{ id: "provider_6f1c2d3e", name: GATEWAY_NAME, providerType: "OPENAI_COMPATIBLE", baseUrl: "https://gateway.example.invalid/v1" }],
};
const currentV3ProviderFile = () => ({
  version: 3,
  providers: [{ id: buildCustomProviderId(GATEWAY_NAME), name: GATEWAY_NAME, providerType: "OPENAI_COMPATIBLE", baseUrl: "https://gateway.example.invalid/v1" }],
});

const applyRunnerAnswer = async (statuses: RecordedStatuses) => {
  const runner = new AppDataMigrationRunner(new AppDataMigrationRegistry(), statuses as unknown as AppDataMigrationRecordRepositoryLike);
  applyCapabilityReadiness(await runner.capabilityReadiness());
};

const providerSettings = (appDataDir: string) => {
  const secretService = { removeForConsumer: vi.fn(), saveForConsumer: vi.fn(), getStatusForConsumer: vi.fn() };
  const service = new LlmProviderService(
    getBuiltInLlmProviderCatalog(),
    new CustomLlmProviderStore(appDataDir),
    { seedCustomProvider: vi.fn(), removeCustomProvider: vi.fn() } as never,
    { probeEndpoint: vi.fn(async () => []) },
    { requireService: () => secretService, getHealth: async () => ({ state: "LOCKED" }) } as never,
    { getSetupStatus: async () => ({ aiStudioStatus: "MISSING", vertexExpressStatus: "MISSING", vertexProjectStatus: "MISSING" }) } as never,
    { get: () => undefined, setDurably: vi.fn() } as never,
  );
  return { service, secretService };
};

const catalogProviderIds = async (appDataDir: string) => {
  vi.spyOn(LLMFactory, "ensureInitialized").mockResolvedValue(undefined as never);
  vi.spyOn(LLMFactory, "listModelsByProvider").mockResolvedValue([]);
  vi.spyOn(LLMFactory, "listSourceModels").mockResolvedValue([]);
  for (const factory of [AudioClientFactory, ImageClientFactory, VideoClientFactory]) {
    vi.spyOn(factory, "ensureInitialized").mockReturnValue(undefined as never);
  }
  const catalog = new ModelCatalogService(getBuiltInLlmProviderCatalog(), new CustomLlmProviderStore(appDataDir));
  return (await catalog.listProviderModelCatalogSnapshots("autobyteus")).map((snapshot) => snapshot.ownerProvider.id);
};

describe("app-data capability readiness", () => {
  beforeEach(() => markCapabilitiesPending());
  afterEach(async () => {
    vi.restoreAllMocks();
    applyCapabilityReadiness({ token_usage_history: true, custom_llm_providers: true });
    await Promise.all(roots.splice(0).map((root) => fs.rm(root, { recursive: true, force: true })));
  });

  it("refuses token-usage history reads and existing-run restore with the unchanged codes while its migration is pending, and serves them once it has succeeded (AC-003)", async () => {
    const statuses = new RecordedStatuses();
    statuses.succeeded(CUSTOM_PROVIDER_MIGRATION_ID);
    const repository = {
      getByRunId: vi.fn(async () => null),
      listAttributionsByRunIds: vi.fn(async () => []),
    };
    const store = new TokenUsageRunStore(repository as never, {} as never, {} as never);

    await applyRunnerAnswer(statuses);
    await expect(store.getAgentRunSummary("run-1")).rejects.toMatchObject({ code: "TOKEN_USAGE_HISTORY_MIGRATION_REQUIRED" });
    await expect(store.assertAgentOrgRecordsReady({ orgRunId: "org-1", agentRunIds: ["run-1"] }))
      .rejects.toMatchObject({ cause: expect.objectContaining({ code: "TOKEN_USAGE_EXISTING_RUN_RESTORE_MIGRATION_REQUIRED" }) });
    expect(repository.getByRunId).not.toHaveBeenCalled();

    statuses.succeeded(TOKEN_USAGE_MIGRATION_ID);
    await applyRunnerAnswer(statuses);
    await expect(store.getAgentRunSummary("run-1")).resolves.toMatchObject({ run_id: "run-1" });
    await expect(store.assertAgentOrgRecordsReady({ orgRunId: "org-1", agentRunIds: ["run-1"] })).resolves.toBeUndefined();
  });

  it("holds back only custom providers while the readable-identity migration is pending, and serves them once it has succeeded (AC-004)", async () => {
    const appDataDir = await appDataRoot();
    await writeProviderFile(appDataDir, releasedV2ProviderFile);
    const statuses = new RecordedStatuses();
    statuses.succeeded(TOKEN_USAGE_MIGRATION_ID);
    await applyRunnerAnswer(statuses);
    const builtInIds = getBuiltInLlmProviderCatalog().listProviders().map((provider) => provider.id).sort();
    const customModel = `openai-compatible:${buildCustomProviderId(GATEWAY_NAME)}:vendor:model`;
    const builtInModel = "gpt-built-in-test-model";
    vi.spyOn(LLMFactory, "listAvailableModels").mockResolvedValue([{ model_identifier: builtInModel }] as never);
    const availability = new ModelAvailabilityService(
      { ensureProviderModelCatalog: vi.fn() } as never,
      new CustomLlmProviderStore(appDataDir),
    );
    const { service: settings, secretService } = providerSettings(appDataDir);

    // Listing: the built-in providers only.
    expect((await catalogProviderIds(appDataDir)).sort()).toEqual(builtInIds);
    expect((await settings.listProviderCredentialSettings()).map(({ provider }) => provider.id).sort()).toEqual(builtInIds);
    // A run with a custom model is refused with the code; a run with a built-in model is not.
    await expect(availability.ensureModelAvailable(customModel, "LLM")).rejects.toMatchObject({ code: "CUSTOM_PROVIDERS_MIGRATION_PENDING" });
    await expect(availability.ensureModelAvailable(builtInModel, "LLM")).resolves.toBeUndefined();
    // Settings create and delete are refused with the code, before any endpoint probe or secret change.
    await expect(settings.createCustomProvider({ name: "Second Gateway", baseUrl: "https://second.example.invalid/v1", apiKey: "test-key" }))
      .rejects.toMatchObject({ code: "CUSTOM_PROVIDERS_MIGRATION_PENDING" });
    await expect(settings.deleteCustomProvider(buildCustomProviderId(GATEWAY_NAME)))
      .rejects.toMatchObject({ code: "CUSTOM_PROVIDERS_MIGRATION_PENDING" });
    expect(secretService.saveForConsumer).not.toHaveBeenCalled();
    expect(secretService.removeForConsumer).not.toHaveBeenCalled();
    // The released file is left for the migration.
    expect(JSON.parse(await fs.readFile(path.join(appDataDir, "llm", "custom-llm-providers.json"), "utf8"))).toEqual(releasedV2ProviderFile);

    // The migration has converted the file and succeeded.
    await writeProviderFile(appDataDir, currentV3ProviderFile());
    statuses.succeeded(CUSTOM_PROVIDER_MIGRATION_ID);
    await applyRunnerAnswer(statuses);
    expect(await catalogProviderIds(appDataDir)).toContain(buildCustomProviderId(GATEWAY_NAME));
    expect((await settings.listProviderCredentialSettings()).map(({ provider }) => provider.id))
      .toContain(buildCustomProviderId(GATEWAY_NAME));
  });
});
