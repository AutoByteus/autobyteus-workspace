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

  it('maps Gemini 3.1 Flash TTS preview for api_key and vertex runtimes', () => {
    expect(resolveModelForRuntime('gemini-3.1-flash-tts-preview', 'tts', 'api_key')).toBe(
      'gemini-3.1-flash-tts-preview'
    );
    expect(resolveModelForRuntime('gemini-3.1-flash-tts-preview', 'tts', 'vertex')).toBe(
      'gemini-3.1-flash-tts-preview'
    );
  });

  it('maps Gemini 2.5 Pro preview TTS for api_key and vertex runtimes', () => {
    expect(resolveModelForRuntime('gemini-2.5-pro-preview-tts', 'tts', 'api_key')).toBe(
      'gemini-2.5-pro-preview-tts'
    );
    expect(resolveModelForRuntime('gemini-2.5-pro-preview-tts', 'tts', 'vertex')).toBe('gemini-2.5-pro-tts');
  });

  it('maps Gemini text models for the LLM modality', () => {
    expect(resolveModelForRuntime('gemini-3.1-pro-preview', 'llm', 'vertex')).toBe('gemini-3.1-pro-preview');
    expect(resolveModelForRuntime('gemini-3-flash-preview', 'llm', 'api_key')).toBe('gemini-3-flash-preview');
  });

  it('returns original when modality or model is unknown', () => {
    expect(resolveModelForRuntime('unknown-model', 'tts', 'vertex')).toBe('unknown-model');
    expect(resolveModelForRuntime('gemini-2.5-flash-preview-tts', 'unknown', 'vertex')).toBe('gemini-2.5-flash-preview-tts');
  });
});
