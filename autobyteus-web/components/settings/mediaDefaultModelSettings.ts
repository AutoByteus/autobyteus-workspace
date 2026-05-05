export const DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY = 'DEFAULT_IMAGE_EDIT_MODEL'
export const DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY = 'DEFAULT_IMAGE_GENERATION_MODEL'
export const DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY = 'DEFAULT_SPEECH_GENERATION_MODEL'

export const DEFAULT_IMAGE_MODEL_IDENTIFIER = 'gpt-image-1.5'
export const DEFAULT_SPEECH_MODEL_IDENTIFIER = 'gemini-2.5-flash-tts'

export type MediaDefaultModelCatalogKind = 'image' | 'audio'

export interface MediaDefaultModelSettingSpec {
  readonly id: string
  readonly key:
    | typeof DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY
    | typeof DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY
    | typeof DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY
  readonly catalogKind: MediaDefaultModelCatalogKind
  readonly fallbackModelIdentifier: string
  readonly labelKey: string
  readonly descriptionKey: string
}

export const MEDIA_DEFAULT_MODEL_SETTINGS = [
  {
    id: 'image-edit',
    key: DEFAULT_IMAGE_EDIT_MODEL_SETTING_KEY,
    catalogKind: 'image',
    fallbackModelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
    labelKey: 'settings.components.settings.MediaDefaultModelsCard.fields.imageEdit.label',
    descriptionKey: 'settings.components.settings.MediaDefaultModelsCard.fields.imageEdit.description',
  },
  {
    id: 'image-generation',
    key: DEFAULT_IMAGE_GENERATION_MODEL_SETTING_KEY,
    catalogKind: 'image',
    fallbackModelIdentifier: DEFAULT_IMAGE_MODEL_IDENTIFIER,
    labelKey: 'settings.components.settings.MediaDefaultModelsCard.fields.imageGeneration.label',
    descriptionKey: 'settings.components.settings.MediaDefaultModelsCard.fields.imageGeneration.description',
  },
  {
    id: 'speech-generation',
    key: DEFAULT_SPEECH_GENERATION_MODEL_SETTING_KEY,
    catalogKind: 'audio',
    fallbackModelIdentifier: DEFAULT_SPEECH_MODEL_IDENTIFIER,
    labelKey: 'settings.components.settings.MediaDefaultModelsCard.fields.speechGeneration.label',
    descriptionKey: 'settings.components.settings.MediaDefaultModelsCard.fields.speechGeneration.description',
  },
] as const satisfies readonly MediaDefaultModelSettingSpec[]

export type MediaDefaultModelSettingKey = (typeof MEDIA_DEFAULT_MODEL_SETTINGS)[number]['key']
