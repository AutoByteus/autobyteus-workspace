import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { localizationRuntime } from '~/localization/runtime/localizationRuntime';
import { useNodeStore } from '~/stores/nodeStore';
import { GetExtensions } from '~/graphql/queries/extensionsQueries';
import { directNodeApolloClient } from '~/services/nodeCollaboration/directNodeApolloClient';
import { callExtensionAction, ExtensionActionError } from '~/services/extensions/extensionActionClient';
import { EMBEDDED_ENTRY_ID } from '~/types/node';
import { isMobileRemoteAccessRuntime } from '~/utils/remoteAccess/mobileRuntime';
import type { ExtensionList } from '~/types/extensions';
import type { VoiceInputRecordingRequest, VoiceInputRecordingSource, VoiceInputPermissionState, VoiceInputStoreState, VoiceInputLatestResult, VoiceInputCapturePayload, VoiceInputCaptureDiagnostics } from '~/types/voiceInput';
import {
  buildMicrophoneAccessError,
  disposeVoiceCaptureResources,
  ensureVoiceAudioContextRunning,
  selectVoiceAudioInputDevices,
  toVoicePermissionState,
} from '~/utils/voiceInputCapture';

const CAPTURE_START_TIMEOUT_MS = 2500;
/** This computer's microphone choice: every window of the packaged app shares the renderer's origin, so its storage. */
export const VOICE_INPUT_MICROPHONE_STORAGE_KEY = 'autobyteus.voiceInput.microphone';
const readMicrophoneChoice = (): string | null => (typeof window === 'undefined' ? null : window.localStorage.getItem(VOICE_INPUT_MICROPHONE_STORAGE_KEY));
type VoiceTranscription = { text: string; noSpeech: boolean; detectedLanguage: string | null };

const t = (key: string, params?: Record<string, string | number>): string => localizationRuntime.translate(key, params);

export const useVoiceInputStore = defineStore('voiceInput', {
  state: (): VoiceInputStoreState => ({
    initialized: false,
    voiceInput: null,
    availabilityGeneration: 0,
    microphoneDeviceId: readMicrophoneChoice(),
    focusListenerRegistered: false,
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
    /** The microphone button shows only when this computer's Voice Input is installed, on and ready (REQ-006, REQ-008). */
    isAvailable(state): boolean {
      return state.voiceInput?.state === 'installed' && state.voiceInput.enabled === true && state.voiceInput.ready === true;
    },

    selectedAudioInputDeviceId(state): string | null {
      return state.microphoneDeviceId;
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
        return t('extensions.voice.systemDefaultShort');
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

      this.initialized = true;
      if (!this.focusListenerRegistered && typeof window !== 'undefined') {
        // A change made in another window (or on the node) shows when this window is used again.
        window.addEventListener('focus', () => { void this.refreshAvailability(); });
        this.focusListenerRegistered = true;
      }
      await Promise.all([this.refreshAvailability(), this.refreshAudioInputDevices()]);
      this.registerMediaDeviceListener();
    },

    /**
     * Reads this computer's Voice Input from the embedded node, in every window (design AR-001): at window start, when
     * a voice surface mounts, on focus, after this window changes it, and when a dictation finds it off or gone. Its
     * cached catalog is enough (no catalog fetch).
     */
    async refreshAvailability(): Promise<void> {
      const generation = ++this.availabilityGeneration;
      // The phone has no computer of its own to dictate with (voice on the phone is a later stage).
      const embedded = isMobileRemoteAccessRuntime() ? null : useNodeStore().getEntryById(EMBEDDED_ENTRY_ID);
      const item = !embedded?.baseUrl ? null : await directNodeApolloClient(embedded.baseUrl)
        .query<{ extensions: ExtensionList }>({ query: GetExtensions, variables: { refreshCatalog: false } })
        .then((result) => result.data?.extensions?.extensions.find((extension) => extension.id === 'voice-input') ?? null, () => null);
      if (generation === this.availabilityGeneration) this.voiceInput = item;
    },

    setMicrophone(deviceId: string | null): void {
      this.microphoneDeviceId = deviceId;
      if (deviceId) window.localStorage.setItem(VOICE_INPUT_MICROPHONE_STORAGE_KEY, deviceId);
      else window.localStorage.removeItem(VOICE_INPUT_MICROPHONE_STORAGE_KEY);
    },

    async transcribe(audioData: ArrayBuffer): Promise<VoiceTranscription> {
      const embedded = useNodeStore().getEntryById(EMBEDDED_ENTRY_ID);
      if (!embedded?.baseUrl) throw new Error(t('settings.voiceInput.store.notEnabledYet'));
      try {
        return await callExtensionAction(embedded.baseUrl, 'voice-input', 'transcribe', { wav: audioData }) as VoiceTranscription;
      } catch (error) {
        if (error instanceof ExtensionActionError && (error.code === 'EXTENSION_OFF' || error.code === 'EXTENSION_NOT_INSTALLED')) {
          this.voiceInput = null;
          void this.refreshAvailability();
        }
        throw error;
      }
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

        const result = await this.transcribe(capture.audioData);
        if (!isCurrent()) return;

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
