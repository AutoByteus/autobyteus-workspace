import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { useExtensionsStore } from '~/stores/extensionsStore';
import type { VoiceInputRecordingRequest, VoiceInputRecordingSource, VoiceInputPermissionState, VoiceInputStoreState, VoiceInputLatestResult, VoiceInputCapturePayload, VoiceInputCaptureDiagnostics } from '~/types/voiceInput';
import {
  buildMicrophoneAccessError,
  disposeVoiceCaptureResources,
  ensureVoiceAudioContextRunning,
  selectVoiceAudioInputDevices,
  toVoicePermissionState,
} from '~/utils/voiceInputCapture';

const CAPTURE_START_TIMEOUT_MS = 2500;

const t = (key: string, params?: Record<string, string | number>): string => localizationRuntime.translate(key, params);

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
    transcriptTarget: null,
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

    async startRecording(request: VoiceInputRecordingRequest): Promise<void> {
      if (this.isStarting || this.isRecording || this.isTranscribing) {
        return;
      }

      const source = request.source;
      const attemptGeneration = ++this.startupAttemptGeneration;
      this.isStarting = true;
      this.recordingSource = source;
      this.transcriptTarget = request.source === 'settings-test' ? null : request.target;
      if (this.transcriptTarget && !this.transcriptTarget.isCurrent()) { await this.cleanup(); return; }
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
        && (source === 'settings-test' || Boolean(this.transcriptTarget?.isCurrent()))
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
          if (this.startupAttemptGeneration !== attemptGeneration) return;
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
      } finally {
        // An ineligible destination during asynchronous startup owns no live capture.
        if (this.startupAttemptGeneration === attemptGeneration && this.isStarting) await this.cleanup();
      }
    },

    async stopRecording(): Promise<void> {
      if (!this.audioWorklet) {
        return;
      }

      const source = this.recordingSource || 'composer';
      const generation = this.startupAttemptGeneration;
      const target = this.transcriptTarget;
      const isCurrent = () => this.startupAttemptGeneration === generation && (source === 'settings-test' || Boolean(target?.isCurrent()));
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
        const capture = await new Promise<VoiceInputCapturePayload | null>((resolve) => {
          this.flushPromiseResolve = resolve;
          this.audioWorklet!.port.postMessage({ type: 'FLUSH' });
        });
        if (!capture || !isCurrent()) return;
        captureDiagnostics = capture.diagnostics;

        await this.disposeCapture();
        if (!isCurrent()) return;

        const result = await window.electronAPI.transcribeVoiceInput({ audioData: capture.audioData });
        if (!isCurrent()) return;
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
          if (source !== 'settings-test') {
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
          if (source !== 'settings-test') {
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

        if (target && isCurrent()) target.appendTranscript(result.text);
      } catch (error) {
        if (!isCurrent()) return;
        this.error = error instanceof Error ? error.message : t('settings.voiceInput.store.voiceTranscriptionFailed');
        this.setLatestResult({
          source,
          outcome: 'error',
          transcript: '',
          detectedLanguage: null,
          error: this.error,
          diagnostics: captureDiagnostics,
        });
        if (source !== 'settings-test') {
          useToasts().addToast(this.error, 'error');
        }
      } finally {
        this.flushPromiseResolve = null;
        await this.disposeCapture();
        this.isTranscribing = false;
        this.recordingSource = null;
        this.transcriptTarget = null;
        this.liveInputLevel = 0;
      }
    },

    async toggleRecording(request: VoiceInputRecordingRequest): Promise<void> {
      if (this.isStarting || this.isTranscribing) {
        return;
      }

      if (this.isRecording) {
        if (this.recordingSource !== request.source || (request.source !== 'settings-test' && request.target.key !== this.transcriptTarget?.key)) {
          return;
        }
        await this.stopRecording();
        return;
      }

      await this.startRecording(request);
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
        || (!this.isStarting && !this.isRecording && !this.isTranscribing)
      ) {
        return;
      }
      await this.cleanup();
    },

    async cancelOperationForTarget(key: string): Promise<void> {
      if (this.transcriptTarget?.key === key) await this.cleanup();
    },
    async cleanup(): Promise<void> {
      this.startupAttemptGeneration += 1;
      this.transcriptTarget = null;
      if (!this.isTranscribing) this.recordingSource = null;
      const settle = this.flushPromiseResolve;
      this.flushPromiseResolve = null;
      settle?.(null);
      await this.disposeCapture();
    },
    async disposeCapture(): Promise<void> {
      this.clearCaptureWatchdog();
      const stream = this.stream, audioContext = this.audioContext, audioWorklet = this.audioWorklet;
      this.audioContext = null; this.audioWorklet = null; this.stream = null;
      this.isStarting = false; this.isRecording = false;
      this.liveInputLevel = 0; this.hasReceivedCaptureStats = false;
      await disposeVoiceCaptureResources(stream, audioContext, audioWorklet);
    },
  },
});
