import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useExtensionsStore } from '~/stores/extensionsStore';
import type { AgentContext } from '~/types/agent/AgentContext';
import {
  buildMicrophoneAccessError,
  disposeVoiceCaptureResources,
  ensureVoiceAudioContextRunning,
  mergeTranscriptWithDraft,
  selectVoiceAudioInputDevices,
  toVoicePermissionState,
} from '~/utils/voiceInputCapture';

export type VoiceInputRecordingSource = 'composer' | 'settings-test';
export type VoiceInputResultOutcome = 'idle' | 'recording' | 'transcribing' | 'transcript-ready' | 'no-speech' | 'empty-transcript' | 'error';
export type VoiceInputPermissionState = 'unknown' | 'prompt' | 'granted' | 'denied' | 'unsupported';

const CAPTURE_START_TIMEOUT_MS = 2500;

const t = (key: string, params?: Record<string, string | number>): string => localizationRuntime.translate(key, params);

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
  isStarting: boolean;
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
  captureWatchdogTimer: ReturnType<typeof setTimeout> | null;
  hasReceivedCaptureStats: boolean;
  composerTargetContext: AgentContext | null;
  startupAttemptGeneration: number;
}

export const useVoiceInputStore = defineStore('voiceInput', {
  state: (): VoiceInputStoreState => ({
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    isStarting: false,
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
    captureWatchdogTimer: null,
    hasReceivedCaptureStats: false,
    composerTargetContext: null,
    startupAttemptGeneration: 0,
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
      localizationRuntime.resolvedLocale.value;

      if (!this.selectedAudioInputDeviceId) {
        return t('settings.components.settings.VoiceInputExtensionCard.system_default');
      }

      return this.audioInputDevices.find((device) => device.deviceId === this.selectedAudioInputDeviceId)?.label
        || t('settings.voiceInput.store.savedDeviceUnavailable');
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

    clearCaptureWatchdog(): void {
      if (this.captureWatchdogTimer) {
        clearTimeout(this.captureWatchdogTimer);
        this.captureWatchdogTimer = null;
      }
    },

    armCaptureWatchdog(source: VoiceInputRecordingSource): void {
      this.clearCaptureWatchdog();
      this.hasReceivedCaptureStats = false;

      this.captureWatchdogTimer = setTimeout(() => {
        void this.handleCaptureStartupTimeout(source);
      }, CAPTURE_START_TIMEOUT_MS);
    },

    async handleCaptureStartupTimeout(source: VoiceInputRecordingSource): Promise<void> {
      this.captureWatchdogTimer = null;

      if (!this.isRecording || this.recordingSource !== source || this.hasReceivedCaptureStats) {
        return;
      }

      this.error = t('settings.voiceInput.store.noCaptureFrames');
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
        return toVoicePermissionState(status.state);
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
        this.audioInputDevices = selectVoiceAudioInputDevices(devices, t);
      } catch {
        this.audioInputDevices = [];
      }
    },

    async startRecording(source: VoiceInputRecordingSource = 'composer'): Promise<void> {
      if (this.isStarting || this.isRecording || this.isTranscribing) {
        return;
      }

      const attemptGeneration = ++this.startupAttemptGeneration;
      this.isStarting = true;
      this.recordingSource = source;
      this.composerTargetContext = source === 'composer'
        ? useActiveContextStore().activeAgentContext
        : null;
      this.error = null;
      this.liveInputLevel = 0;
      this.hasReceivedCaptureStats = false;

      let pendingStream: MediaStream | null = null;
      let pendingAudioContext: AudioContext | null = null;
      let pendingAudioWorklet: AudioWorkletNode | null = null;
      const isCurrentAttempt = () => (
        this.startupAttemptGeneration === attemptGeneration
        && this.isStarting
        && this.recordingSource === source
      );
      const disposePendingResources = async () => {
        const stream = pendingStream;
        const audioContext = pendingAudioContext;
        const audioWorklet = pendingAudioWorklet;
        pendingStream = null;
        pendingAudioContext = null;
        pendingAudioWorklet = null;
        await disposeVoiceCaptureResources(stream, audioContext, audioWorklet);
      };

      try {
        await this.initialize();
        if (!isCurrentAttempt()) return;

        if (!this.isAvailable) {
          this.error = t('settings.voiceInput.store.notEnabledYet');
          await this.cleanup();
          return;
        }

        const selectedDeviceId = this.selectedAudioInputDeviceId;

        await this.refreshAudioInputDevices();
        if (!isCurrentAttempt()) return;

        if (this.microphonePermissionState === 'denied') {
          throw new Error(t('settings.voiceInput.store.microphonePermissionDenied'));
        }

        if (this.selectedAudioInputUnavailable) {
          throw new Error(t('settings.voiceInput.store.selectedAudioSourceUnavailable'));
        }

        if (this.audioInputDevices.length === 0 && this.microphonePermissionState === 'granted') {
          throw new Error(t('settings.voiceInput.store.noAudioInputDevices'));
        }

        const audioConstraints: MediaTrackConstraints = {
          channelCount: 1,
        };

        if (selectedDeviceId) {
          audioConstraints.deviceId = { exact: selectedDeviceId };
        }

        pendingStream = await navigator.mediaDevices.getUserMedia({
          audio: audioConstraints,
        });
        if (!isCurrentAttempt()) {
          await disposePendingResources();
          return;
        }

        await this.refreshAudioInputDevices();
        if (!isCurrentAttempt()) {
          await disposePendingResources();
          return;
        }

        pendingAudioContext = new AudioContext({ latencyHint: 'interactive' });
        await ensureVoiceAudioContextRunning(pendingAudioContext, t);
        if (!isCurrentAttempt()) {
          await disposePendingResources();
          return;
        }

        await pendingAudioContext.audioWorklet.addModule(new URL('@/workers/voice-input-recorder.worklet.js', import.meta.url));
        if (!isCurrentAttempt()) {
          await disposePendingResources();
          return;
        }

        const mediaSource = pendingAudioContext.createMediaStreamSource(pendingStream);
        pendingAudioWorklet = new AudioWorkletNode(pendingAudioContext, 'voice-input-recorder', {
          processorOptions: {},
        });

        pendingAudioWorklet.port.onmessage = (event) => {
          if (event.data?.type === 'capture-stats') {
            this.hasReceivedCaptureStats = true;
            this.clearCaptureWatchdog();
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

        mediaSource.connect(pendingAudioWorklet);
        pendingAudioWorklet.connect(pendingAudioContext.destination);
        if (!isCurrentAttempt()) {
          await disposePendingResources();
          return;
        }

        this.stream = pendingStream;
        this.audioContext = pendingAudioContext;
        this.audioWorklet = pendingAudioWorklet;
        pendingStream = null;
        pendingAudioContext = null;
        pendingAudioWorklet = null;
        this.isStarting = false;
        this.isRecording = true;
        this.armCaptureWatchdog(source);
        this.setLatestResult({
          source,
          outcome: 'recording',
          transcript: '',
          detectedLanguage: null,
          error: null,
          diagnostics: null,
        });
      } catch (error) {
        await disposePendingResources();
        if (!isCurrentAttempt()) {
          return;
        }
        const selectedDeviceId = this.selectedAudioInputDeviceId;
        this.error = buildMicrophoneAccessError(error, selectedDeviceId, t);
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
      const composerTargetContext = source === 'composer' ? this.composerTargetContext : null;
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
          throw new Error(result.error || t('settings.voiceInput.store.failedToTranscribeAudio'));
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
            useToasts().addToast(t('settings.voiceInput.store.noSpeechDetected'), 'info');
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
            useToasts().addToast(t('settings.voiceInput.store.noTranscriptReturned'), 'info');
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
          const targetContext = composerTargetContext;
          if (targetContext) {
            activeContextStore.updateRequirementForContext(
              targetContext,
              mergeTranscriptWithDraft(targetContext.requirement, result.text),
            );
          }
        }
      } catch (error) {
        this.error = error instanceof Error ? error.message : t('settings.voiceInput.store.voiceTranscriptionFailed');
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
        this.composerTargetContext = null;
        this.liveInputLevel = 0;
      }
    },

    async toggleRecording(source: VoiceInputRecordingSource = 'composer'): Promise<void> {
      if (this.isStarting || this.isTranscribing) {
        return;
      }

      if (this.isRecording) {
        if (this.recordingSource !== source) {
          return;
        }
        await this.stopRecording();
        return;
      }

      await this.startRecording(source);
    },

    async resetSettingsTestState(): Promise<void> {
      await this.cancelOperationForSource('settings-test');
      if (this.isTranscribing) {
        return;
      }
      this.error = null;
      if (this.latestResult?.source === 'settings-test') {
        this.clearLatestResult();
      }
      await this.refreshAudioInputDevices();
    },

    async cancelOperationForSource(source: VoiceInputRecordingSource): Promise<void> {
      if (
        this.recordingSource !== source
        || (!this.isStarting && !this.isRecording)
      ) {
        return;
      }
      await this.cleanup();
    },

    async cleanup(): Promise<void> {
      this.startupAttemptGeneration += 1;
      this.clearCaptureWatchdog();
      const stream = this.stream;
      const audioContext = this.audioContext;
      const audioWorklet = this.audioWorklet;
      this.audioContext = null;
      this.audioWorklet = null;
      this.stream = null;
      this.flushPromiseResolve = null;
      this.isStarting = false;
      this.isRecording = false;
      this.recordingSource = null;
      this.composerTargetContext = null;
      this.liveInputLevel = 0;
      this.hasReceivedCaptureStats = false;
      await disposeVoiceCaptureResources(stream, audioContext, audioWorklet);
    },
  },
});
