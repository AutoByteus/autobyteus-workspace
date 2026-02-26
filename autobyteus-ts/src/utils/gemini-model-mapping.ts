const MODEL_RUNTIME_MAP: Record<string, Record<string, Record<string, string>>> = {
  tts: {
    'gemini-2.5-flash-preview-tts': {
      vertex: 'gemini-2.5-flash-tts',
      api_key: 'gemini-2.5-flash-preview-tts'
    },
    'gemini-2.5-pro-preview-tts': {
      vertex: 'gemini-2.5-pro-tts',
      api_key: 'gemini-2.5-pro-preview-tts'
    }
  },
  llm: {
    'gemini-3-pro-preview': {
      vertex: 'gemini-3-pro-preview',
      api_key: 'gemini-3-pro-preview'
    },
    'gemini-3-flash-preview': {
      vertex: 'gemini-3-flash-preview',
      api_key: 'gemini-3-flash-preview'
    }
  },
  image: {
    'gemini-3-pro-image-preview': {
      vertex: 'gemini-3-pro-image-preview',
      api_key: 'gemini-3-pro-image-preview'
    },
    'gemini-2.5-flash-image': {
      vertex: 'gemini-2.5-flash-image',
      api_key: 'gemini-2.5-flash-image'
    }
  }
};

export function resolveModelForRuntime(modelValue: string, modality: string, runtime?: string | null): string {
  if (!runtime) {
    return modelValue;
  }

  const modalityMap = MODEL_RUNTIME_MAP[modality] ?? {};
  const runtimeMap = modalityMap[modelValue];
  if (runtimeMap && runtime in runtimeMap) {
    return runtimeMap[runtime];
  }

  return modelValue;
}
