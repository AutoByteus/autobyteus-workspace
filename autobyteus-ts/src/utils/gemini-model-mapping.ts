const MODEL_RUNTIME_MAP: Record<string, Record<string, Record<string, string>>> = {
  tts: {
    'gemini-3.8-flash-tts': {
      vertex: 'gemini-3.8-flash-tts',
      api_key: 'gemini-3.8-flash-tts'
    },
    'gemini-3.8-flash-lite-tts': {
      vertex: 'gemini-3.8-flash-lite-tts',
      api_key: 'gemini-3.8-flash-lite-tts'
    }
  },
  llm: {
    'gemini-3.1-pro-preview': {
      vertex: 'gemini-3.1-pro-preview',
      api_key: 'gemini-3.1-pro-preview'
    },
    'gemini-3.8-flash': {
      vertex: 'gemini-3.8-flash',
      api_key: 'gemini-3.8-flash'
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
