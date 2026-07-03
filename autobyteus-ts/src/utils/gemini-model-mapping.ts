const MODEL_RUNTIME_MAP: Record<string, Record<string, Record<string, string>>> = {
  tts: {
    'gemini-3.1-flash-tts-preview': {
      vertex: 'gemini-3.1-flash-tts-preview',
      api_key: 'gemini-3.1-flash-tts-preview'
    },
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
    'gemini-3.1-pro-preview': {
      vertex: 'gemini-3.1-pro-preview',
      api_key: 'gemini-3.1-pro-preview'
    },
    'gemini-3-flash-preview': {
      vertex: 'gemini-3-flash-preview',
      api_key: 'gemini-3-flash-preview'
    },
    'gemini-3.5-flash': {
      vertex: 'gemini-3.5-flash',
      api_key: 'gemini-3.5-flash'
    }
  },
  image: {
    'gemini-3.1-flash-lite-image': {
      vertex: 'gemini-3.1-flash-lite-image',
      api_key: 'gemini-3.1-flash-lite-image'
    },
    'gemini-3.1-flash-image': {
      vertex: 'gemini-3.1-flash-image',
      api_key: 'gemini-3.1-flash-image'
    },
    'gemini-3-pro-image': {
      vertex: 'gemini-3-pro-image',
      api_key: 'gemini-3-pro-image'
    },
    'gemini-2.5-flash-image': {
      vertex: 'gemini-2.5-flash-image',
      api_key: 'gemini-2.5-flash-image'
    }
  },
  video: {
    'gemini-omni-flash-preview': {
      vertex: 'gemini-omni-flash-preview',
      api_key: 'gemini-omni-flash-preview'
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
