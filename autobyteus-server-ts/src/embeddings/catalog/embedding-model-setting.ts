import { appConfigProvider } from "../../config/app-config-provider.js";
import { DEFAULT_EMBEDDING_MODEL_ID, EMBEDDING_MODEL_CATALOG, EMBEDDING_MODEL_IDS, getEmbeddingModelDefinition } from "./embedding-model-catalog.js";
import type { EmbeddingModelDefinition } from "./embedding-model-definition.js";

/** The server setting that chooses the active embedding model of this server (blank: the default). */
export const EMBEDDING_MODEL_SETTING_KEY = "AUTOBYTEUS_EMBEDDING_MODEL";

export const EMBEDDING_MODEL_SETTING_DESCRIPTION = [
  `Embedding model for meaning search of Project Tasks. Blank uses the default (${DEFAULT_EMBEDDING_MODEL_ID}).`,
  "The model is downloaded on first use and the search index is rebuilt in the background after a change. Allowed values:",
  ...EMBEDDING_MODEL_CATALOG.map((model) => `${model.id}: ${model.displayName}. ${model.description}`),
].join(" ");

/** Blank, or exactly one catalog id. */
export const normalizeEmbeddingModelSettingForPersistence = (value: string): [true, string] | [false, string] => {
  const normalized = value.trim();
  if (!normalized || EMBEDDING_MODEL_IDS.includes(normalized)) return [true, normalized];
  return [false, `Embedding model must be blank (default) or one of: ${EMBEDDING_MODEL_IDS.join(", ")}.`];
};

const warnedUnknownValues = new Set<string>();

/**
 * The active model, read at use time. Blank gives the default. A value that is not in the catalog (only possible when
 * set outside the settings screen, e.g. in an env file) also gives the default, with one warning naming the value.
 */
export const resolveActiveEmbeddingModel = (
  rawValue: string | undefined = appConfigProvider.config.get(EMBEDDING_MODEL_SETTING_KEY),
): EmbeddingModelDefinition => {
  const value = rawValue?.trim() ?? "";
  const definition = value ? getEmbeddingModelDefinition(value) : null;
  if (value && !definition && !warnedUnknownValues.has(value)) {
    warnedUnknownValues.add(value);
    console.warn("EMBEDDING_MODEL_SETTING_UNKNOWN", { value, using: DEFAULT_EMBEDDING_MODEL_ID, allowed: EMBEDDING_MODEL_IDS });
  }
  return definition ?? getEmbeddingModelDefinition(DEFAULT_EMBEDDING_MODEL_ID)!;
};
