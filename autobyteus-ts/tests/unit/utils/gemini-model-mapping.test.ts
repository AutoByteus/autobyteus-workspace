import { describe, it, expect } from 'vitest';
import { resolveModelForRuntime } from '../../../src/utils/gemini-model-mapping.js';

describe('resolveModelForRuntime', () => {
  it.each(['gemini-3.8-flash-tts', 'gemini-3.8-flash-lite-tts'])(
    'maps current TTS model %s exactly across runtimes', (modelId) => {
      expect(resolveModelForRuntime(modelId, 'tts')).toBe(modelId);
      expect(resolveModelForRuntime(modelId, 'tts', 'api_key')).toBe(modelId);
      expect(resolveModelForRuntime(modelId, 'tts', 'vertex')).toBe(modelId);
    }
  );

  it('maps Gemini text models for the LLM modality', () => {
    expect(resolveModelForRuntime('gemini-3.1-pro-preview', 'llm', 'vertex')).toBe('gemini-3.1-pro-preview');
    expect(resolveModelForRuntime('gemini-3.8-flash', 'llm', 'api_key')).toBe('gemini-3.8-flash');
    expect(resolveModelForRuntime('gemini-3.8-flash', 'llm', 'vertex')).toBe('gemini-3.8-flash');
  });

  it.each([
    'gemini-3.1-flash-lite-image',
    'gemini-3.1-flash-image',
    'gemini-3-pro-image',
    'gemini-2.5-flash-image',
  ])('maps active Gemini image model %s for api_key and vertex runtimes', (modelId) => {
    expect(resolveModelForRuntime(modelId, 'image', 'api_key')).toBe(modelId);
    expect(resolveModelForRuntime(modelId, 'image', 'vertex')).toBe(modelId);
  });

  it('does not retain explicit mappings for shut-down Gemini image preview ids', () => {
    expect(resolveModelForRuntime('gemini-3.1-flash-image-preview', 'image', 'api_key')).toBe(
      'gemini-3.1-flash-image-preview'
    );
    expect(resolveModelForRuntime('gemini-3-pro-image-preview', 'image', 'vertex')).toBe(
      'gemini-3-pro-image-preview'
    );
  });

  it('maps Gemini Omni Flash Preview video model for api_key and vertex runtimes', () => {
    expect(resolveModelForRuntime('gemini-omni-flash-preview', 'video', 'api_key')).toBe(
      'gemini-omni-flash-preview'
    );
    expect(resolveModelForRuntime('gemini-omni-flash-preview', 'video', 'vertex')).toBe(
      'gemini-omni-flash-preview'
    );
  });

  it('returns original when modality or model is unknown', () => {
    expect(resolveModelForRuntime('unknown-model', 'tts', 'vertex')).toBe('unknown-model');
    expect(resolveModelForRuntime('unknown-model', 'unknown', 'vertex')).toBe('unknown-model');
  });
});
