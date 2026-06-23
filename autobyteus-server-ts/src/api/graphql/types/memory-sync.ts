import { Arg, Mutation, Query, Resolver } from "type-graphql";
import { getServerAddressCandidateService } from "../../../server-addressing/server-address-candidate-service.js";
import type { ServerAddressCandidate as DomainServerAddressCandidate } from "../../../server-addressing/server-address-candidate-types.js";
import { getMemorySyncConfigService } from "../../../memory-sync/source/memory-sync-config-service.js";
import { toPublicMemorySyncConfig } from "../../../memory-sync/source/memory-sync-config.js";
import { getMemorySyncService, type MemorySyncRunResult } from "../../../memory-sync/source/memory-sync-service.js";
import { MemoryHubClient } from "../../../memory-sync/source/memory-hub-client.js";
import { getLocalFileMemorySyncStateStore } from "../../../memory-sync/source/local-file-memory-sync-state-store.js";
import { getMemoryHubCredentialService } from "../../../memory-sync/hub/memory-hub-credential-service.js";
import { getMemoryHubConnectionInfoService } from "../../../memory-sync/hub/memory-hub-connection-info-service.js";
import { getMemoryImportCatalogService } from "../../../memory-sync/hub/memory-import-catalog-service.js";
import type { MemoryHubSourceCredentialSummary as DomainCredentialSummary, MemoryImportSummary as DomainImportSummary } from "../../../memory-sync/shared/memory-sync-types.js";
import {
  CreateMemoryHubCredentialInput,
  MemoryHubConnectionInfoGql,
  MemoryHubConnectionTestResultGql,
  MemoryHubCredentialMutationResultGql,
  MemoryHubCredentialSummaryGql,
  MemoryImportSummaryGql,
  MemorySyncRunResultGql,
  MemorySyncSourceStateGql,
  MemorySyncStatusGql,
  ServerAddressCandidateGql,
  TestMemoryHubConnectionInput,
  UpdateMemoryHubConfigInput,
  UpdateMemorySyncSourceConfigInput,
} from "./memory-sync-schema.js";

const mapCredential = (credential: DomainCredentialSummary): MemoryHubCredentialSummaryGql => ({ ...credential });
const mapImport = (summary: DomainImportSummary): MemoryImportSummaryGql => ({ ...summary });
const mapCandidate = (candidate: DomainServerAddressCandidate): ServerAddressCandidateGql => ({ ...candidate });
const mapRunResult = (result: MemorySyncRunResult): MemorySyncRunResultGql => ({ ...result });

const buildStatus = async (oneTimePlaintextToken?: string | null): Promise<MemorySyncStatusGql> => {
  const config = await getMemorySyncConfigService().getConfig();
  const publicConfig = toPublicMemorySyncConfig(config);
  const connectionInfo = await getMemoryHubConnectionInfoService().getConnectionInfo();
  let sourceState: MemorySyncSourceStateGql | null = null;
  if (config.source.sourceNodeId && config.source.hubBaseUrl) {
    const state = await getLocalFileMemorySyncStateStore().readState(config.source.hubBaseUrl, config.source.sourceNodeId);
    sourceState = {
      jobState: state.lastJobState,
      lastSuccessfulSyncAt: state.lastSuccessfulSyncAt,
      lastError: state.lastError,
      trackedFileCount: Object.keys(state.files).length,
    };
  }
  return {
    hub: publicConfig.hub,
    source: publicConfig.source,
    connectionInfo: {
      ...connectionInfo,
      credentials: connectionInfo.credentials.map(mapCredential),
    },
    sourceState,
    imports: (await getMemoryImportCatalogService().listImports()).map(mapImport),
    oneTimePlaintextToken: oneTimePlaintextToken ?? null,
  };
};

@Resolver()
export class MemorySyncResolver {
  @Query(() => MemorySyncStatusGql)
  async getMemorySyncStatus(): Promise<MemorySyncStatusGql> {
    return buildStatus();
  }

  @Query(() => MemoryHubConnectionInfoGql)
  async getMemoryHubConnectionInfo(): Promise<MemoryHubConnectionInfoGql> {
    const info = await getMemoryHubConnectionInfoService().getConnectionInfo();
    return { ...info, credentials: info.credentials.map(mapCredential) };
  }

  @Query(() => [ServerAddressCandidateGql])
  async listMemoryHubUrlCandidates(
    @Arg("currentNodeBaseUrl", () => String, { nullable: true }) currentNodeBaseUrl?: string | null,
    @Arg("manualBaseUrl", () => String, { nullable: true }) manualBaseUrl?: string | null,
  ): Promise<ServerAddressCandidateGql[]> {
    return getServerAddressCandidateService().listCandidates({ currentNodeBaseUrl, manualBaseUrl }).map(mapCandidate);
  }

  @Query(() => [MemoryImportSummaryGql])
  async listMemoryImports(): Promise<MemoryImportSummaryGql[]> {
    return (await getMemoryImportCatalogService().listImports()).map(mapImport);
  }

  @Mutation(() => MemorySyncStatusGql)
  async updateMemoryHubConfig(
    @Arg("input", () => UpdateMemoryHubConfigInput) input: UpdateMemoryHubConfigInput,
  ): Promise<MemorySyncStatusGql> {
    await getMemorySyncConfigService().updateHubConfig(input);
    let token: string | null = null;
    const status = await buildStatus();
    const hasActiveCredential = status.connectionInfo.credentials.some((credential) => credential.status === "active");
    if (status.hub.enabled && !hasActiveCredential) {
      const created = await getMemoryHubCredentialService().createCredential({ label: "Default Memory Sync source token" });
      token = created.plaintextToken;
    }
    return buildStatus(token);
  }

  @Mutation(() => MemorySyncStatusGql)
  async updateMemorySyncSourceConfig(
    @Arg("input", () => UpdateMemorySyncSourceConfigInput) input: UpdateMemorySyncSourceConfigInput,
  ): Promise<MemorySyncStatusGql> {
    await getMemorySyncConfigService().updateSourceConfig(input);
    return buildStatus();
  }

  @Mutation(() => MemoryHubCredentialMutationResultGql)
  async createMemoryHubSourceCredential(
    @Arg("input", () => CreateMemoryHubCredentialInput, { nullable: true }) input?: CreateMemoryHubCredentialInput | null,
  ): Promise<MemoryHubCredentialMutationResultGql> {
    const result = await getMemoryHubCredentialService().createCredential(input ?? {});
    return { credential: mapCredential(result.summary), plaintextToken: result.plaintextToken };
  }

  @Mutation(() => MemoryHubCredentialMutationResultGql)
  async regenerateMemoryHubSourceCredential(
    @Arg("credentialId", () => String) credentialId: string,
  ): Promise<MemoryHubCredentialMutationResultGql> {
    const result = await getMemoryHubCredentialService().regenerateCredential(credentialId);
    return { credential: mapCredential(result.summary), plaintextToken: result.plaintextToken };
  }

  @Mutation(() => MemoryHubCredentialSummaryGql)
  async revokeMemoryHubSourceCredential(
    @Arg("credentialId", () => String) credentialId: string,
  ): Promise<MemoryHubCredentialSummaryGql> {
    return mapCredential(await getMemoryHubCredentialService().revokeCredential(credentialId));
  }

  @Mutation(() => MemoryHubConnectionTestResultGql)
  async testMemoryHubConnection(
    @Arg("input", () => TestMemoryHubConnectionInput) input: TestMemoryHubConnectionInput,
  ): Promise<MemoryHubConnectionTestResultGql> {
    return await new MemoryHubClient().testConnection(input);
  }

  @Mutation(() => MemorySyncRunResultGql)
  async startMemorySync(): Promise<MemorySyncRunResultGql> {
    return mapRunResult(await getMemorySyncService().startManualSync());
  }
}
