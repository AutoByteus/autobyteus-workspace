import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useExtensionsStore } from '~/stores/extensionsStore';

export type VoiceInputRecordingSource = 'composer' | 'settings-test';
export type VoiceInputResultOutcome = 'idle' | 'recording' | 'transcribing' | 'transcript-ready' | 'no-speech' | 'empty-transcript' | 'error';
export type VoiceInputPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

export interface VoiceInputAudioInputDevice {
  deviceId: string;
  label: string;
}

export interface VoiceInputCaptureDiagnostics {
  inputSampleRate: number;
  wavSampleRate: number;
  durationMs: number;
  rms: number;
  peak: number;
  sampleCount: number;
}

interface VoiceInputCapturePayload {
  audioData: ArrayBuffer;
  diagnostics: VoiceInputCaptureDiagnostics;
}

export interface VoiceInputLatestResult {
  source: VoiceInputRecordingSource;
  outcome: VoiceInputResultOutcome;
  transcript: string;
  detectedLanguage: string | null;
  error: string | null;
  diagnostics: VoiceInputCaptureDiagnostics | null;
  completedAt: string;
}

interface VoiceInputStoreState {
  initialized: boolean;
  isElectron: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  recordingSource: VoiceInputRecordingSource | null;
  liveInputLevel: number;
  error: string | null;
  latestResult: VoiceInputLatestResult | null;
  audioContext: AudioContext | null;
  audioWorklet: AudioWorkletNode | null;
  stream: MediaStream | null;
  flushPromiseResolve: ((payload: VoiceInputCapturePayload) => void) | null;
  audioInputDevices: VoiceInputAudioInputDevice[];
  microphonePermissionState: VoiceInputPermissionState;
  mediaDeviceListenerRegistered: boolean;
}

function mergeTranscriptWithDraft(currentDraft: string, transcript: string): string {
  const trimmedTranscript = transcript.trim();
  if (!trimmedTranscript) {
    return currentDraft;
  }
  if (!currentDraft.trim()) {
    return trimmedTranscript;
  }
  const separator = /\s$/.test(currentDraft) ? '' : ' ';
  return `${currentDraft}${separator}${trimmedTranscript}`;
}

function selectAudioInputDevices(devices: MediaDeviceInfo[]): VoiceInputAudioInputDevice[] {
  const audioInputs = devices.filter((device) => device.kind === 'audioinput');
  const dedicatedInputs = audioInputs.filter((device) => device.deviceId !== 'default' && device.deviceId !== 'communications');
  const visibleInputs = dedicatedInputs.length > 0 ? dedicatedInputs : audioInputs;

  return visibleInputs.map((device, index) => ({
    deviceId: device.deviceId,
    label: device.label.trim() || `Audio input ${index + 1}`,
  }));
}

function toPermissionState(state: PermissionState | null): VoiceInputPermissionState {
  if (state === 'granted' || state === 'prompt' || state === 'denied') {
    return state;
  }
  return 'unknown';
}

function buildMicrophoneAccessError(error: unknown, selectedDeviceId: string | null): string {
  const name = typeof error === 'object' && error && 'name' in error ? String((error as { name?: unknown }).name) : '';

  if (name === 'NotAllowedError' || name === 'SecurityError') {
    return 'Microphone permission is denied. Allow microphone access for AutoByteus and try again.';
  }

  if (name === 'OverconstrainedError') {
    return 'The selected audio source is unavailable. Choose another input device in Voice Input settings.';
  }

  if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
    return selectedDeviceId
      ? 'The selected audio source is unavailable. Choose another input device in Voice Input settings.'
      : 'No audio input devices found. Connect a microphone or enable a virtual audio source.';
  }

  if (name === 'NotReadableError' || name === 'TrackStartError') {
    return 'The selected audio source could not be opened. It may already be in use by another application.';
  }

  return error instanceof Error ? error.message : 'Failed to access microphone';
}

export const useVoiceInputStore = defineStore('voiceInput', {
  state: (): VoiceInputStoreState => ({
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    isRecording: false,
    isTranscribing: false,
    recordingSource: null,
    liveInputLevel: 0,
    error: null,
    latestResult: null,
    audioContext: null,
    audioWorklet: null,
    stream: null,
    flushPromiseResolve: null,
    audioInputDevices: [],
    microphonePermissionState: 'unknown',
    mediaDeviceListenerRegistered: false,
  }),

  getters: {
    isAvailable(): boolean {
      const extensionsStore = useExtensionsStore();
      return extensionsStore.voiceInput?.status === 'installed' && extensionsStore.voiceInput?.enabled === true;
    },

    selectedAudioInputDeviceId(): string | null {
      const extensionsStore = useExtensionsStore();
      return extensionsStore.voiceInput?.settings.audioInputDeviceId ?? null;
    },

    selectedAudioInputUnavailable(): boolean {
      return Boolean(
        this.selectedAudioInputDeviceId
        && this.audioInputDevices.length > 0
        && !this.audioInputDevices.some((device) => device.deviceId === this.selectedAudioInputDeviceId),
      );
    },

    selectedAudioInputLabel(): string {
      if (!this.selectedAudioInputDeviceId) {
        return 'System default';
      }

      return this.audioInputDevices.find((device) => device.deviceId === this.selectedAudioInputDeviceId)?.label
        || 'Saved device unavailable';
    },
  },

  actions: {
    setLatestResult(payload: Omit<VoiceInputLatestResult, 'completedAt'>): void {
      this.latestResult = {
        ...payload,
        completedAt: new Date().toISOString(),
      };
    },

    clearLatestResult(): void {
      this.latestResult = null;
    },

    async initialize(): Promise<void> {
      if (this.initialized) {
        return;
      }

      const extensionsStore = useExtensionsStore();
      await extensionsStore.initialize();
      this.isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
      this.initialized = true;
      await this.refreshAudioInputDevices();
      this.registerMediaDeviceListener();
    },

    async queryMicrophonePermission(): Promise<VoiceInputPermissionState> {
      if (typeof navigator === 'undefined' || !('permissions' in navigator) || !navigator.permissions?.query) {
        return 'unknown';
      }

      try {
        const status = await navigator.permissions.query({ name: 'microphone' as PermissionName });
        return toPermissionState(status.state);
      } catch {
        return 'unknown';
      }
    },

    registerMediaDeviceListener(): void {
      if (this.mediaDeviceListenerRegistered || typeof navigator === 'undefined' || !navigator.mediaDevices?.addEventListener) {
        return;
      }

      navigator.mediaDevices.addEventListener('devicechange', () => {
        void this.refreshAudioInputDevices();
      });
      this.mediaDeviceListenerRegistered = true;
    },

    async refreshAudioInputDevices(): Promise<void> {
      if (typeof navigator === 'undefined' || !navigator.mediaDevices?.enumerateDevices) {
        this.audioInputDevices = [];
        this.microphonePermissionState = 'unsupported';
        return;
      }

      this.microphonePermissionState = await this.queryMicrophonePermission();

      try {
        const devices = await navigator.mediaDevices.enumerateDevices();
        this.audioInputDevices = selectAudioInputDevices(devices);
      } catch {
        this.audioInputDevices = [];
      }
    },

    async startRecording(source: VoiceInputRecordingSource = 'composer'): Promise<void> {
      await this.initialize();

      if (!this.isAvailable) {
        this.error = 'Voice Input is not enabled yet.';
        return;
      }

      const selectedDeviceId = this.selectedAudioInputDeviceId;

      try {
        this.error = null;
        this.recordingSource = source;
        this.liveInputLevel = 0;

        await this.refreshAudioInputDevices();

        if (this.microphonePermissionState === 'denied') {
          throw new Error('Microphone permission is denied. Allow microphone access for AutoByteus and try again.');
        }

        if (this.selectedAudioInputUnavailable) {
          throw new Error('The selected audio source is unavailable. Choose another input device in Voice Input settings.');
        }

        if (this.audioInputDevices.length === 0 && this.microphonePermissionState === 'granted') {
          throw new Error('No audio input devices found. Connect a microphone or enable a virtual audio source.');
        }

        const audioConstraints: MediaTrackConstraints = {
          channelCount: 1,
        };

        if (selectedDeviceId) {
          audioConstraints.deviceId = { exact: selectedDeviceId };
        }

        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });

        await this.refreshAudioInputDevices();

        this.audioContext = new AudioContext({ latencyHint: 'interactive' });

        await this.audioContext.audioWorklet.addModule(new URL('@/workers/voice-input-recorder.worklet.js', import.meta.url));

        const mediaSource = this.audioContext.createMediaStreamSource(this.stream);
        this.audioWorklet = new AudioWorkletNode(this.audioContext, 'voice-input-recorder', {
          processorOptions: {},
        });

        this.audioWorklet.port.onmessage = (event) => {
          if (event.data?.type === 'capture-stats') {
            this.liveInputLevel = typeof event.data.level === 'number'
              ? Math.max(0, Math.min(1, event.data.level))
              : 0;
            return;
          }

          if (event.data?.type === 'audio-ready' && this.flushPromiseResolve) {
            this.flushPromiseResolve({
              audioData: event.data.wavData.buffer.slice(0),
              diagnostics: {
                inputSampleRate: event.data.diagnostics?.inputSampleRate ?? 0,
                wavSampleRate: event.data.diagnostics?.wavSampleRate ?? 0,
                durationMs: event.data.diagnostics?.durationMs ?? 0,
                rms: event.data.diagnostics?.rms ?? 0,
                peak: event.data.diagnostics?.peak ?? 0,
                sampleCount: event.data.diagnostics?.sampleCount ?? 0,
              },
            });
            this.flushPromiseResolve = null;
          }
        };

        mediaSource.connect(this.audioWorklet);
        this.audioWorklet.connect(this.audioContext.destination);

        this.isRecording = true;
        this.setLatestResult({
          source,
          outcome: 'recording',
          transcript: '',
          detectedLanguage: null,
          error: null,
          diagnostics: null,
        });
      } catch (error) {
        this.error = buildMicrophoneAccessError(error, selectedDeviceId);
        if (this.error.includes('permission is denied')) {
          this.microphonePermissionState = 'denied';
        }
        this.setLatestResult({
          source,
          outcome: 'error',
          transcript: '',
          detectedLanguage: null,
          error: this.error,
          diagnostics: null,
        });
        useToasts().addToast(this.error, 'error');
        await this.cleanup();
      }
    },

    async stopRecording(): Promise<void> {
      if (!this.audioWorklet) {
        return;
      }

      const source = this.recordingSource || 'composer';
      this.isRecording = false;
      this.isTranscribing = true;
      this.liveInputLevel = 0;
      this.setLatestResult({
        source,
        outcome: 'transcribing',
        transcript: '',
        detectedLanguage: null,
        error: null,
        diagnostics: this.latestResult?.diagnostics ?? null,
      });

      let captureDiagnostics: VoiceInputCaptureDiagnostics | null = null;

      try {
        const capture = await new Promise<VoiceInputCapturePayload>((resolve) => {
          this.flushPromiseResolve = resolve;
          this.audioWorklet!.port.postMessage({ type: 'FLUSH' });
        });
        captureDiagnostics = capture.diagnostics;

        await this.cleanup();

        const result = await window.electronAPI.transcribeVoiceInput({ audioData: capture.audioData });
        if (!result.ok) {
          throw new Error(result.error || 'Failed to transcribe audio');
        }

        if (result.noSpeech) {
          this.setLatestResult({
            source,
            outcome: 'no-speech',
            transcript: '',
            detectedLanguage: result.detectedLanguage,
            error: null,
            diagnostics: capture.diagnostics,
          });
          if (source === 'composer') {
            useToasts().addToast('No speech detected.', 'info');
          }
          return;
        }

        if (!result.text.trim()) {
          this.setLatestResult({
            source,
            outcome: 'empty-transcript',
            transcript: '',
            detectedLanguage: result.detectedLanguage,
            error: null,
            diagnostics: capture.diagnostics,
          });
          if (source === 'composer') {
            useToasts().addToast('No transcript returned. Try speaking closer to the microphone.', 'info');
          }
          return;
        }

        this.setLatestResult({
          source,
          outcome: 'transcript-ready',
          transcript: result.text,
          detectedLanguage: result.detectedLanguage,
          error: null,
          diagnostics: capture.diagnostics,
        });

        if (source === 'composer') {
          const activeContextStore = useActiveContextStore();
          activeContextStore.updateRequirement(
            mergeTranscriptWithDraft(activeContextStore.currentRequirement, result.text),
          );
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Voice transcription failed';
        this.setLatestResult({
          source,
          outcome: 'error',
          transcript: '',
          detectedLanguage: null,
          error: this.error,
          diagnostics: captureDiagnostics,
        });
        if (source === 'composer') {
          useToasts().addToast(this.error, 'error');
        }
      } finally {
        this.isTranscribing = false;
        this.recordingSource = null;
        this.liveInputLevel = 0;
      }
    },

    async toggleRecording(source: VoiceInputRecordingSource = 'composer'): Promise<void> {
      if (this.isTranscribing) {
        return;
      }

      if (this.isRecording) {
        await this.stopRecording();
        return;
      }

      await this.startRecording(source);
    },

    async cleanup(): Promise<void> {
      if (this.stream) {
        for (const track of this.stream.getTracks()) {
          track.stop();
        }
      }

      if (this.audioContext) {
        await this.audioContext.close();
      }

      this.audioContext = null;
      this.audioWorklet = null;
      this.stream = null;
      this.flushPromiseResolve = null;
      this.isRecording = false;
      this.recordingSource = null;
      this.liveInputLevel = 0;
    },
  },
});
