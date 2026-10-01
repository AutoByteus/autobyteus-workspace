import { describe, expect, it } from 'vitest';
import { assertLiveAudioFileBytes } from '../../../../test-support/live-e2e/live-e2e-audio-assertions.js';

const mp3Bytes = Buffer.from('ID3audio');
const wavBytes = Buffer.alloc(45);
wavBytes.write('RIFF', 0, 'ascii');
wavBytes.write('WAVE', 8, 'ascii');

describe('live E2E audio file assertions', () => {
  it('accepts nonempty OpenAI MP3 output without requiring a WAV header', () => {
    expect(() => assertLiveAudioFileBytes(mp3Bytes, 'OPENAI')).not.toThrow();
  });

  it('rejects empty output for every audio provider', () => {
    expect(() => assertLiveAudioFileBytes(Buffer.alloc(0), 'OPENAI'))
      .toThrow('LIVE_E2E_AUDIO_FILE_EMPTY');
    expect(() => assertLiveAudioFileBytes(Buffer.alloc(0), 'GEMINI'))
      .toThrow('LIVE_E2E_AUDIO_FILE_EMPTY');
  });

  it('accepts a nonempty Gemini WAV and rejects MP3 or a header-only WAV', () => {
    expect(() => assertLiveAudioFileBytes(wavBytes, 'GEMINI')).not.toThrow();
    expect(() => assertLiveAudioFileBytes(Buffer.alloc(45), 'GEMINI'))
      .toThrow('LIVE_E2E_GEMINI_WAV_INVALID');
    expect(() => assertLiveAudioFileBytes(mp3Bytes, 'GEMINI'))
      .toThrow('LIVE_E2E_GEMINI_WAV_INVALID');
    expect(() => assertLiveAudioFileBytes(wavBytes.subarray(0, 44), 'GEMINI'))
      .toThrow('LIVE_E2E_GEMINI_WAV_INVALID');
  });
});
