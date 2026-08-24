import { Field, Int, ObjectType, registerEnumType } from 'type-graphql';
import { GraphQLJSON } from 'graphql-scalars';
import type { ModelInfo } from 'autobyteus-ts/llm/models.js';
import { getLlmProviderDisplayName } from 'autobyteus-ts/llm/provider-display-names.js';
import type { LLMProvider } from 'autobyteus-ts/llm/providers.js';
import type { AudioModel } from 'autobyteus-ts/multimedia/audio/audio-model.js';
import type { ImageModel } from 'autobyteus-ts/multimedia/image/image-model.js';
import type { VideoModel } from 'autobyteus-ts/multimedia/video/video-model.js';
import type {
  LlmProviderDescriptor,
  ModelSourceStatus,
} from '../../../llm-management/llm-providers/domain/models.js';
import type { LocalProviderModelCatalogSnapshot } from '../../../llm-management/services/model-catalog-service.js';
import type { ModelMetadataProvenanceValue } from '../../../llm-management/services/model-metadata-provisioning-service.js';

enum ModelMetadataProvenanceGraphql {
  LIVE = 'LIVE',
  CURATED_FALLBACK = 'CURATED_FALLBACK',
  CURATED_ONLY = 'CURATED_ONLY',
}
registerEnumType(ModelMetadataProvenanceGraphql, { name: 'ModelMetadataProvenance' });

@ObjectType()
export class CatalogProviderObject {
  @Field(() => String) id!: string;
  @Field(() => String) name!: string;
  @Field(() => String) providerType!: string;
  @Field(() => Boolean) isCustom!: boolean;
  @Field(() => String, { nullable: true }) baseUrl!: string | null;
  @Field(() => String) catalogMode!: string;
}

@ObjectType()
export class ModelDetail {
  @Field(() => String) modelIdentifier!: string;
  @Field(() => String) name!: string;
  @Field(() => String, { nullable: true }) description?: string | null;
  @Field(() => String) value!: string;
  @Field(() => String) canonicalName!: string;
  @Field(() => String) providerId!: string;
  @Field(() => String) providerName!: string;
  @Field(() => String) providerType!: string;
  @Field(() => String) runtime!: string;
  @Field(() => String, { nullable: true }) hostUrl?: string | null;
  @Field(() => GraphQLJSON, { nullable: true }) configSchema?: Record<string, unknown> | null;
  @Field(() => Int, { nullable: true }) maxContextTokens?: number | null;
  @Field(() => Int, { nullable: true }) activeContextTokens?: number | null;
  @Field(() => Int, { nullable: true }) maxInputTokens?: number | null;
  @Field(() => Int, { nullable: true }) maxOutputTokens?: number | null;
  @Field(() => ModelMetadataProvenanceGraphql, { nullable: true })
  metadataProvenance?: ModelMetadataProvenanceGraphql | null;
}

@ObjectType()
export class ModelSourceStatusObject {
  @Field(() => String) modelKind!: string;
  @Field(() => String) state!: string;
  @Field(() => Int) modelCount!: number;
  @Field(() => Int) successfulUnitCount!: number;
  @Field(() => Int) failedUnitCount!: number;
  @Field(() => String, { nullable: true }) safeMessage!: string | null;
}

@ObjectType()
export class ProviderModelCatalogSnapshotObject {
  @Field(() => String) runtimeKind!: string;
  @Field(() => CatalogProviderObject) ownerProvider!: CatalogProviderObject;
  @Field(() => [ModelSourceStatusObject]) sources!: ModelSourceStatusObject[];
  @Field(() => [ModelDetail]) llmModels!: ModelDetail[];
  @Field(() => [ModelDetail]) audioModels!: ModelDetail[];
  @Field(() => [ModelDetail]) imageModels!: ModelDetail[];
  @Field(() => [ModelDetail]) videoModels!: ModelDetail[];
}

type ModelInfoWithMetadata = ModelInfo & {
  metadata_provenance?: ModelMetadataProvenanceValue | null;
};

const mapLlm = (model: ModelInfoWithMetadata): ModelDetail => ({
  modelIdentifier: model.model_identifier,
  name: model.display_name,
  description: model.description ?? null,
  value: model.value,
  canonicalName: model.canonical_name,
  providerId: model.provider_id,
  providerName: model.provider_name,
  providerType: model.provider_type,
  runtime: model.runtime,
  hostUrl: model.host_url ?? null,
  configSchema: model.config_schema ?? null,
  maxContextTokens: model.max_context_tokens ?? null,
  activeContextTokens: model.active_context_tokens ?? null,
  maxInputTokens: model.max_input_tokens ?? null,
  maxOutputTokens: model.max_output_tokens ?? null,
  metadataProvenance: model.metadata_provenance
    ? ModelMetadataProvenanceGraphql[model.metadata_provenance]
    : null,
});

const mapMedia = (model: AudioModel | ImageModel | VideoModel): ModelDetail => ({
  modelIdentifier: model.modelIdentifier,
  name: model.name,
  description: 'description' in model ? model.description ?? null : null,
  value: model.value,
  canonicalName: model.name,
  providerId: String(model.provider),
  providerName: getLlmProviderDisplayName(String(model.provider) as LLMProvider),
  providerType: String(model.provider),
  runtime: String(model.runtime),
  hostUrl: model.hostUrl ?? null,
  configSchema: model.parameterSchema?.toJsonSchemaDict?.() ?? null,
  maxContextTokens: null,
  activeContextTokens: null,
  maxInputTokens: null,
  maxOutputTokens: null,
  metadataProvenance: null,
});

export const mapProviderDescriptor = (
  provider: LlmProviderDescriptor,
): CatalogProviderObject => ({ ...provider });

const mapStatus = (status: ModelSourceStatus): ModelSourceStatusObject => ({ ...status });
const sortModels = (models: ModelDetail[]): ModelDetail[] => models.sort((left, right) =>
  left.name === right.name
    ? left.modelIdentifier.localeCompare(right.modelIdentifier)
    : left.name.localeCompare(right.name));

export const mapProviderModelCatalogSnapshot = (
  snapshot: LocalProviderModelCatalogSnapshot,
): ProviderModelCatalogSnapshotObject => ({
  runtimeKind: snapshot.runtimeKind,
  ownerProvider: mapProviderDescriptor(snapshot.ownerProvider),
  sources: snapshot.sources.map(mapStatus),
  llmModels: sortModels(snapshot.llmModels.map(mapLlm)),
  audioModels: sortModels(snapshot.audioModels.map(mapMedia)),
  imageModels: sortModels(snapshot.imageModels.map(mapMedia)),
  videoModels: sortModels(snapshot.videoModels.map(mapMedia)),
});
