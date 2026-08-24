type TranslationKey = string;

export type AppFontSizePresetId = 'default' | 'large' | 'extra-large';

export type ResolvedAppFontMetrics = {
  rootPercent: number;
  editorFontPx: number;
  terminalFontPx: number;
};

type AppFontSizePresetDefinition = {
  id: AppFontSizePresetId;
  labelKey: TranslationKey;
  summaryKey: TranslationKey;
  metrics: ResolvedAppFontMetrics;
};

export type AppFontSizePresetOption = {
  id: AppFontSizePresetId;
  labelKey: TranslationKey;
  summaryKey: TranslationKey;
  rootPercent: number;
};

export const DEFAULT_APP_FONT_SIZE_PRESET_ID: AppFontSizePresetId = 'default';

const PRESET_ORDER: AppFontSizePresetId[] = ['default', 'large', 'extra-large'];

const PRESET_DEFINITIONS: Record<AppFontSizePresetId, AppFontSizePresetDefinition> = {
  default: {
    id: 'default',
    labelKey: 'settings.display.fontSize.options.default.label',
    summaryKey: 'settings.display.fontSize.options.default.summary',
    metrics: {
      rootPercent: 100,
      editorFontPx: 14,
      terminalFontPx: 14,
    },
  },
  large: {
    id: 'large',
    labelKey: 'settings.display.fontSize.options.large.label',
    summaryKey: 'settings.display.fontSize.options.large.summary',
    metrics: {
      rootPercent: 112.5,
      editorFontPx: 16,
      terminalFontPx: 16,
    },
  },
  'extra-large': {
    id: 'extra-large',
    labelKey: 'settings.display.fontSize.options.extraLarge.label',
    summaryKey: 'settings.display.fontSize.options.extraLarge.summary',
    metrics: {
      rootPercent: 125,
      editorFontPx: 18,
      terminalFontPx: 18,
    },
  },
};

export function isAppFontSizePresetId(value: unknown): value is AppFontSizePresetId {
  return typeof value === 'string' && Object.prototype.hasOwnProperty.call(PRESET_DEFINITIONS, value);
}

export function getResolvedAppFontMetrics(presetId: AppFontSizePresetId): ResolvedAppFontMetrics {
  return { ...PRESET_DEFINITIONS[presetId].metrics };
}

export function getAppFontSizePresetOptions(): AppFontSizePresetOption[] {
  return PRESET_ORDER.map((presetId) => {
    const preset = PRESET_DEFINITIONS[presetId];
    return {
      id: preset.id,
      labelKey: preset.labelKey,
      summaryKey: preset.summaryKey,
      rootPercent: preset.metrics.rootPercent,
    };
  });
}
