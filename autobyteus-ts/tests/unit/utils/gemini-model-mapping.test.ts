import { describe, it, expect } from 'vitest';
import { resolveModelForRuntime } from '../../../src/utils/gemini-model-mapping.js';

describe('resolveModelForRuntime', () => {
  it('returns original model when runtime is undefined', () => {
    expect(resolveModelForRuntime('gemini-2.5-flash-preview-tts', 'tts')).toBe('gemini-2.5-flash-preview-tts');
  });

  it('maps tts preview to vertex name', () => {
    expect(resolveModelForRuntime('gemini-2.5-flash-preview-tts', 'tts', 'vertex')).toBe('gemini-2.5-flash-tts');
  });

  it('keeps model name for api_key', () => {
    expect(resolveModelForRuntime('gemini-2.5-flash-preview-tts', 'tts', 'api_key')).toBe('gemini-2.5-flash-preview-tts');
  });

  it('returns original when modality or model is unknown', () => {
    expect(resolveModelForRuntime('unknown-model', 'tts', 'vertex')).toBe('unknown-model');
    expect(resolveModelForRuntime('gemini-2.5-flash-preview-tts', 'unknown', 'vertex')).toBe('gemini-2.5-flash-preview-tts');
  });
});
