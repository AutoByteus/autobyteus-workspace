export const assertLiveAudioFileBytes = (bytes: Buffer, providerId: string): void => {
  if (bytes.length === 0) throw new Error('LIVE_E2E_AUDIO_FILE_EMPTY');

  // The Gemini adapter returns WAV; the OpenAI fixture uses its MP3 default.
  if (providerId !== 'GEMINI') return;
  if (bytes.length <= 44
    || bytes.toString('ascii', 0, 4) !== 'RIFF'
    || bytes.toString('ascii', 8, 12) !== 'WAVE') {
    throw new Error('LIVE_E2E_GEMINI_WAV_INVALID');
  }
};
