import { AudioClientFactory } from "autobyteus-ts/multimedia/audio/audio-client-factory.js";
import type { AudioModel } from "autobyteus-ts/multimedia/audio/audio-model.js";
import { ImageClientFactory } from "autobyteus-ts/multimedia/image/image-client-factory.js";
import type { ImageModel } from "autobyteus-ts/multimedia/image/image-model.js";
import { appConfigProvider } from "../../config/app-config-provider.js";
import {
  MEDIA_DEFAULT_MODEL_SETTINGS,
  type MediaDefaultModelKind,
} from "../../config/media-default-model-settings.js";

export type ResolvedMediaModel = {
  kind: MediaDefaultModelKind;
  settingKey: string;
  modelIdentifier: string;
  catalogModel: ImageModel | AudioModel | null;
};

const normalizeNonEmptyString = (value: unknown): string | null =>
  typeof value === "string" && value.trim().length > 0 ? value.trim() : null;

export class MediaModelResolver {
  resolve(kind: MediaDefaultModelKind): ResolvedMediaModel {
    const setting = MEDIA_DEFAULT_MODEL_SETTINGS[kind];
    const configured = normalizeNonEmptyString(appConfigProvider.config.get(setting.settingKey));
    const modelIdentifier = configured ?? setting.fallbackModelIdentifier;

    return {
      kind,
      settingKey: setting.settingKey,
      modelIdentifier,
      catalogModel: this.findCatalogModel(kind, modelIdentifier),
    };
  }

  private findCatalogModel(
    kind: MediaDefaultModelKind,
    modelIdentifier: string,
  ): ImageModel | AudioModel | null {
    if (kind === "speech_generation") {
      AudioClientFactory.ensureInitialized();
      return AudioClientFactory.listModels().find(
        (candidate) =>
          candidate.modelIdentifier === modelIdentifier || candidate.name === modelIdentifier,
      ) ?? null;
    }

    ImageClientFactory.ensureInitialized();
    return ImageClientFactory.listModels().find(
      (candidate) =>
        candidate.modelIdentifier === modelIdentifier || candidate.name === modelIdentifier,
    ) ?? null;
  }
}

let cachedMediaModelResolver: MediaModelResolver | null = null;

export const getMediaModelResolver = (): MediaModelResolver => {
  if (!cachedMediaModelResolver) {
    cachedMediaModelResolver = new MediaModelResolver();
  }
  return cachedMediaModelResolver;
};
