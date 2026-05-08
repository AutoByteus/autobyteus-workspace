export const DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY = "DEFAULT_IMAGE_EDIT_MODEL";
export const DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY = "DEFAULT_IMAGE_GENERATION_MODEL";
export const DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY = "DEFAULT_SPEECH_GENERATION_MODEL";

export const DEFAULT_IMAGE_MODEL_IDENTIFIER = "gpt-image-1.5";
export const DEFAULT_SPEECH_MODEL_IDENTIFIER = "gemini-2.5-flash-tts";

export const MEDIA_DEFAULT_MODEL_KINDS = [
  "image_edit",
  "image_generation",
  "speech_generation",
] as const;

export type MediaDefaultModelKind = (typeof MEDIA_DEFAULT_MODEL_KINDS)[number];

export type MediaDefaultModelSetting = {
  kind: MediaDefaultModelKind;
  settingKey: string;
  fallbackModelIdentifier: string;
};

export const MEDIA_DEFAULT_MODEL_SETTINGS: Record<
  MediaDefaultModelKind,
  MediaDefaultModelSetting
> = {
  image_edit: {
    kind: "image_edit",
    settingKey: DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
    fallbackModelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
  },
  image_generation: {
    kind: "image_generation",
    settingKey: DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
    fallbackModelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
  },
  speech_generation: {
    kind: "speech_generation",
    settingKey: DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
    fallbackModelIdentifier: DEFAULT_SPEECH_MODEL_IDENTIFIER,
  },
};

export const MEDIA_DEFAULT_MODEL_SETTING_KEYS = new Set<string>(
  Object.values(MEDIA_DEFAULT_MODEL_SETTINGS).map((setting) => setting.settingKey),
);
