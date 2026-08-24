type Translate = (key: string, params?: Record<string, string | number>) => string;

export async function disposeVoiceCaptureResources(
  stream: MediaStream | null,
  audioContext: AudioContext | null,
  audioWorklet: AudioWorkletNode | null = null,
): Promise<void> {
  if (audioWorklet) audioWorklet.port.onmessage = null;
  if (stream) {
    for (const track of stream.getTracks()) track.stop();
  }
  if (audioContext) await audioContext.close();
}

export function mergeTranscriptWithDraft(currentDraft: string, transcript: string): string {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) return currentDraft;
  if (!currentDraft.trim()) return trimmedTranscript;
  const separator = /\s$/.test(currentDraft) ? '' : ' ';
  return `${currentDraft}${separator}${trimmedTranscript}`;
}

export function selectVoiceAudioInputDevices(devices: MediaDeviceInfo[], t: Translate) {
  const audioInputs = devices.filter((device) => device.kind === 'audioinput');
  const dedicatedInputs = audioInputs.filter(
    (device) => device.deviceId !== 'default' && device.deviceId !== 'communications',
  );
  const visibleInputs = dedicatedInputs.length > 0 ? dedicatedInputs : audioInputs;
  return visibleInputs.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label.trim() || t('settings.voiceInput.store.audioInputFallback', { index: index + 1 }),
  }));
}

export function toVoicePermissionState(state: PermissionState | null) {
  return state === 'granted' || state === 'prompt' || state === 'denied'
    ? state
    : 'unknown';
}

export function buildMicrophoneAccessError(
  error: unknown,
  selectedDeviceId: string | null,
  t: Translate,
): string {
  const name = typeof error === 'object' && error && 'name' in error
    ? String((error as { name?: unknown }).name)
    : '';
  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return t('settings.voiceInput.store.microphonePermissionDenied');
  }
  if (name === 'OverconstrainedError') {
    return t('settings.voiceInput.store.selectedAudioSourceUnavailable');
  }
  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return selectedDeviceId
      ? t('settings.voiceInput.store.selectedAudioSourceUnavailable')
      : t('settings.voiceInput.store.noAudioInputDevices');
  }
  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return t('settings.voiceInput.store.audioSourceCouldNotBeOpened');
  }
  return error instanceof Error ? error.message : t('settings.voiceInput.store.failedToAccessMicrophone');
}

export async function ensureVoiceAudioContextRunning(
  audioContext: AudioContext,
  t: Translate,
): Promise<void> {
  if (String(audioContext.state || 'unknown') === 'running') return;
  if (typeof audioContext.resume === 'function') await audioContext.resume();
  const resolvedState = String(audioContext.state || 'unknown');
  if (resolvedState !== 'running') {
    throw new Error(t('settings.voiceInput.store.audioEngineStayedState', { state: resolvedState }));
  }
}
