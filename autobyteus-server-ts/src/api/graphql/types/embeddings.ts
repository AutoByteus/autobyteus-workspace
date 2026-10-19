import { GraphQLError } from "graphql";
import { GraphQLSafeInt } from "graphql-scalars";
import { Arg, Field, Mutation, ObjectType, Query, Resolver, registerEnumType } from "type-graphql";
import {
  EmbeddingModelError, getEmbeddingIndex, type EmbeddingActiveDisplay, type EmbeddingModelEntry, type EmbeddingModelFileState,
} from "../../../embeddings/embedding-index.js";
import { EMBEDDING_MODEL_SETTING_KEY } from "../../../embeddings/catalog/embedding-model-setting.js";
import { getServerSettingsService } from "../../../services/server-settings-service.js";

export enum EmbeddingModelFileStateKind { NOT_DOWNLOADED = "NOT_DOWNLOADED", DOWNLOADING = "DOWNLOADING", DOWNLOADED = "DOWNLOADED", FAILED = "FAILED" }
export enum EmbeddingActiveDisplayState { READY = "READY", PREPARING = "PREPARING", NOT_DOWNLOADED = "NOT_DOWNLOADED", UNAVAILABLE = "UNAVAILABLE" }
export enum EmbeddingPreparingPhase { DOWNLOADING = "DOWNLOADING", LOADING = "LOADING" }
registerEnumType(EmbeddingModelFileStateKind, { name: "EmbeddingModelFileStateKind" });
registerEnumType(EmbeddingActiveDisplayState, { name: "EmbeddingActiveDisplayState" });
registerEnumType(EmbeddingPreparingPhase, { name: "EmbeddingPreparingPhase" });

/** A model's files; `done`/`total` are bytes while downloading; `reason` after a failed download. */
@ObjectType()
export class EmbeddingModelFile {
  @Field(() => EmbeddingModelFileStateKind) state!: EmbeddingModelFileStateKind;
  @Field(() => GraphQLSafeInt, { nullable: true }) done!: number | null;
  @Field(() => GraphQLSafeInt, { nullable: true }) total!: number | null;
  @Field(() => String, { nullable: true }) reason!: string | null;
}

/** What Settings shows for the active model: Preparing only while a download (bytes) or a load runs. */
@ObjectType()
export class EmbeddingActiveModelDisplay {
  @Field(() => EmbeddingActiveDisplayState) state!: EmbeddingActiveDisplayState;
  @Field(() => EmbeddingPreparingPhase, { nullable: true }) phase!: EmbeddingPreparingPhase | null;
  @Field(() => GraphQLSafeInt, { nullable: true }) done!: number | null;
  @Field(() => GraphQLSafeInt, { nullable: true }) total!: number | null;
  @Field(() => String, { nullable: true }) reason!: string | null;
}

@ObjectType()
export class EmbeddingModelInfo {
  @Field(() => String) id!: string;
  @Field(() => String) displayName!: string;
  @Field(() => [String]) languages!: string[];
  @Field(() => GraphQLSafeInt) downloadBytes!: number;
  @Field(() => EmbeddingModelFile) file!: EmbeddingModelFile;
  /** Only on the active model. */
  @Field(() => EmbeddingActiveModelDisplay, { nullable: true }) activeDisplay!: EmbeddingActiveModelDisplay | null;
}

@ObjectType()
export class EmbeddingModelsStatus {
  @Field(() => String) activeModelId!: string;
  @Field(() => String) defaultModelId!: string;
  @Field(() => GraphQLSafeInt) onDiskBytes!: number;
  @Field(() => [EmbeddingModelInfo]) models!: EmbeddingModelInfo[];
}

const toFile = (file: EmbeddingModelFileState): EmbeddingModelFile => ({
  state: { notDownloaded: EmbeddingModelFileStateKind.NOT_DOWNLOADED, downloading: EmbeddingModelFileStateKind.DOWNLOADING,
    downloaded: EmbeddingModelFileStateKind.DOWNLOADED, failed: EmbeddingModelFileStateKind.FAILED }[file.state],
  done: file.state === "downloading" ? file.done : null,
  total: file.state === "downloading" ? file.total : null,
  reason: file.state === "failed" ? file.reason : null,
});
const toDisplay = (display: EmbeddingActiveDisplay): EmbeddingActiveModelDisplay => ({
  state: { ready: EmbeddingActiveDisplayState.READY, preparing: EmbeddingActiveDisplayState.PREPARING,
    notDownloaded: EmbeddingActiveDisplayState.NOT_DOWNLOADED, unavailable: EmbeddingActiveDisplayState.UNAVAILABLE }[display.state],
  phase: display.state === "preparing" ? (display.phase === "downloading" ? EmbeddingPreparingPhase.DOWNLOADING : EmbeddingPreparingPhase.LOADING) : null,
  done: display.state === "preparing" ? display.done : null,
  total: display.state === "preparing" ? display.total : null,
  reason: display.state === "unavailable" ? display.reason : null,
});
const toModel = (model: EmbeddingModelEntry): EmbeddingModelInfo => ({
  id: model.id, displayName: model.displayName, languages: [...model.languages], downloadBytes: model.downloadBytes,
  file: toFile(model.file), activeDisplay: model.activeDisplay ? toDisplay(model.activeDisplay) : null,
});

/** Refusals of the embedding layer become GraphQL errors with their code. */
const withModelErrors = async <T>(operation: () => T | Promise<T>): Promise<T> => {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof EmbeddingModelError) throw new GraphQLError(error.message, { extensions: { code: error.code } });
    throw error;
  }
};

/** Settings → Embedding (model list and management) and the board's Retry. The status starts nothing; actions do. */
@Resolver()
export class EmbeddingModelResolver {
  /** The catalog models with their files and the active model's display state. Read-only. */
  @Query(() => EmbeddingModelsStatus)
  async embeddingModelsStatus(): Promise<EmbeddingModelsStatus> {
    const status = await getEmbeddingIndex().modelsStatus();
    return { ...status, models: status.models.map(toModel) };
  }

  /** Clears an unavailable model and prepares it again at once (Settings and the board). True when it was unavailable. */
  @Mutation(() => Boolean)
  retryEmbeddingModel(): boolean {
    const index = getEmbeddingIndex();
    const retried = index.retryModel();
    index.prepareActiveModel();
    return retried;
  }

  /** Downloads a model ahead of time; for the active model, prepares it (not cancellable). */
  @Mutation(() => Boolean)
  async downloadEmbeddingModel(@Arg("modelId", () => String) modelId: string): Promise<boolean> {
    await withModelErrors(() => getEmbeddingIndex().downloadModel(modelId));
    return true;
  }

  /** Cancels a download ahead; refused for the active model's preparation. */
  @Mutation(() => Boolean)
  async cancelEmbeddingModelDownload(@Arg("modelId", () => String) modelId: string): Promise<boolean> {
    await withModelErrors(() => getEmbeddingIndex().cancelDownload(modelId));
    return true;
  }

  /** Deletes a downloaded non-active model's files; refused for the active model and while it downloads. */
  @Mutation(() => Boolean)
  async removeEmbeddingModel(@Arg("modelId", () => String) modelId: string): Promise<boolean> {
    await withModelErrors(() => getEmbeddingIndex().removeModel(modelId));
    return true;
  }

  /** Makes a catalog model the active one (writes the server setting, validated as usual) and prepares it now. */
  @Mutation(() => Boolean)
  async useEmbeddingModel(@Arg("modelId", () => String) modelId: string): Promise<boolean> {
    const unknown = (message: string) => new GraphQLError(message, { extensions: { code: "EMBEDDING_MODEL_UNKNOWN" } });
    if (!modelId.trim()) throw unknown("A model id is required.");
    const [ok, message] = getServerSettingsService().updateSetting(EMBEDDING_MODEL_SETTING_KEY, modelId);
    if (!ok) throw unknown(message);
    getEmbeddingIndex().prepareActiveModel();
    return true;
  }
}
