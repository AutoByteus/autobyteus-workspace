import type { CustomLlmProviderRecord } from './custom-llm-provider-config.js';
import {
  OpenAICompatibleEndpointDiscovery,
  type OpenAICompatibleEndpointDiscoveredModel,
} from './openai-compatible-endpoint-discovery.js';
import { OpenAICompatibleEndpointModel } from './openai-compatible-endpoint-model.js';

export type OpenAICompatibleEndpointReloadStatusKind =
  | 'READY'
  | 'STALE_ERROR'
  | 'ERROR'
  | 'NEVER_LOADED';

export type OpenAICompatibleEndpointReloadStatus = {
  endpointId: string;
  status: OpenAICompatibleEndpointReloadStatusKind;
  message?: string | null;
  modelCount: number;
  preservedPreviousModels: boolean;
};

export type OpenAICompatibleEndpointReloadReport = {
  models: OpenAICompatibleEndpointModel[];
  statuses: OpenAICompatibleEndpointReloadStatus[];
};

const truncateStatusMessage = (message: string | null | undefined): string | null => {
  if (!message) {
    return null;
  }
  const normalized = message.trim();
  if (!normalized) {
    return null;
  }
  return normalized.length <= 240 ? normalized : `${normalized.slice(0, 239)}…`;
};

const sortModels = <T extends { endpointDisplayName: string; name: string; modelIdentifier: string }>(
  models: T[],
): T[] =>
  models
    .slice()
    .sort((left, right) => {
      if (left.endpointDisplayName !== right.endpointDisplayName) {
        return left.endpointDisplayName.localeCompare(right.endpointDisplayName);
      }
      if (left.name !== right.name) {
        return left.name.localeCompare(right.name);
      }
      return left.modelIdentifier.localeCompare(right.modelIdentifier);
    });

export class OpenAICompatibleEndpointModelProvider {
  constructor(
    private readonly discovery: Pick<typeof OpenAICompatibleEndpointDiscovery, 'probeEndpoint'> =
      OpenAICompatibleEndpointDiscovery,
  ) {}

  async reloadSavedEndpoints(
    endpoints: CustomLlmProviderRecord[],
    previousModelsByEndpoint: ReadonlyMap<string, OpenAICompatibleEndpointModel[]> = new Map(),
  ): Promise<OpenAICompatibleEndpointReloadReport> {
    const aggregatedModels: OpenAICompatibleEndpointModel[] = [];
    const statuses: OpenAICompatibleEndpointReloadStatus[] = [];

    for (const endpoint of endpoints) {
      try {
        const discoveredModels = await this.discovery.probeEndpoint({
          baseUrl: endpoint.baseUrl,
          apiKey: endpoint.apiKey,
        });
        const nextModels = this.createModelsForEndpoint(endpoint, discoveredModels);
        aggregatedModels.push(...nextModels);
        statuses.push({
          endpointId: endpoint.id,
          status: 'READY',
          message: null,
          modelCount: nextModels.length,
          preservedPreviousModels: false,
        });
      } catch (error) {
        const previousModels = previousModelsByEndpoint.get(endpoint.id) ?? [];
        const message = truncateStatusMessage(error instanceof Error ? error.message : String(error));

        if (previousModels.length > 0) {
          aggregatedModels.push(...previousModels);
          statuses.push({
            endpointId: endpoint.id,
            status: 'STALE_ERROR',
            message,
            modelCount: previousModels.length,
            preservedPreviousModels: true,
          });
          continue;
        }

        statuses.push({
          endpointId: endpoint.id,
          status: 'ERROR',
          message,
          modelCount: 0,
          preservedPreviousModels: false,
        });
      }
    }

    return {
      models: sortModels(aggregatedModels),
      statuses: statuses.sort((left, right) => left.endpointId.localeCompare(right.endpointId)),
    };
  }

  private createModelsForEndpoint(
    endpoint: CustomLlmProviderRecord,
    discoveredModels: OpenAICompatibleEndpointDiscoveredModel[],
  ): OpenAICompatibleEndpointModel[] {
    return discoveredModels
      .map(
        (discoveredModel) =>
          new OpenAICompatibleEndpointModel({
            endpoint,
            discoveredModel,
          }),
      )
      .sort((left, right) => left.name.localeCompare(right.name));
  }
}
