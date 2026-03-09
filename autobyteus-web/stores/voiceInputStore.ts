import { defineStore } from 'pinia';
import { useToasts } from '~/composables/useToasts';
import { useActiveContextStore } from '~/stores/activeContextStore';
import { useExtensionsStore } from '~/stores/extensionsStore';

interface VoiceInputStoreState {
  initialized: boolean;
  isElectron: boolean;
  isRecording: boolean;
  isTranscribing: boolean;
  error: string | null;
  audioContext: AudioContext | null;
  audioWorklet: AudioWorkletNode | null;
  stream: MediaStream | null;
  flushPromiseResolve: ((audioData: ArrayBuffer) => void) | null;
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

export const useVoiceInputStore = defineStore('voiceInput', {
  state: (): VoiceInputStoreState => ({
    initialized: false,
    isElectron: typeof window !== 'undefined' && Boolean(window.electronAPI),
    isRecording: false,
    isTranscribing: false,
    error: null,
    audioContext: null,
    audioWorklet: null,
    stream: null,
    flushPromiseResolve: null,
  }),

  getters: {
    isAvailable(): boolean {
      const extensionsStore = useExtensionsStore();
      return extensionsStore.voiceInput?.status === 'installed' && extensionsStore.voiceInput?.enabled === true;
    },
  },

  actions: {
    async initialize(): Promise<void> {
      if (this.initialized) {
        return;
      }

      const extensionsStore = useExtensionsStore();
      await extensionsStore.initialize();
      this.isElectron = typeof window !== 'undefined' && Boolean(window.electronAPI);
      this.initialized = true;
    },

    async startRecording(): Promise<void> {
      await this.initialize();

      if (!this.isAvailable) {
        this.error = 'Voice Input is not enabled yet.';
        return;
      }

      try {
        this.error = null;
        this.stream = await navigator.mediaDevices.getUserMedia({
          audio: {
            channelCount: 1,
            sampleRate: 16000,
          },
        });

        this.audioContext = new AudioContext({
          sampleRate: 16000,
          latencyHint: 'interactive',
        });

        await this.audioContext.audioWorklet.addModule(new URL('@/workers/voice-input-recorder.worklet.js', import.meta.url));

        const source = this.audioContext.createMediaStreamSource(this.stream);
        this.audioWorklet = new AudioWorkletNode(this.audioContext, 'voice-input-recorder', {
          processorOptions: {
            targetSampleRate: 16000,
          },
        });

        this.audioWorklet.port.onmessage = (event) => {
          if (event.data?.type === 'audio-ready' && this.flushPromiseResolve) {
            this.flushPromiseResolve(event.data.wavData);
            this.flushPromiseResolve = null;
          }
        };

        source.connect(this.audioWorklet);
        this.audioWorklet.connect(this.audioContext.destination);

        this.isRecording = true;
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Failed to access microphone';
        useToasts().addToast(this.error, 'error');
        await this.cleanup();
      }
    },

    async stopRecording(): Promise<void> {
      if (!this.audioWorklet) {
        return;
      }

      this.isRecording = false;
      this.isTranscribing = true;

      try {
        const audioData = await new Promise<ArrayBuffer>((resolve) => {
          this.flushPromiseResolve = resolve;
          this.audioWorklet!.port.postMessage({ type: 'FLUSH' });
        });

        await this.cleanup();

        const result = await window.electronAPI.transcribeVoiceInput({ audioData });
        if (!result.ok) {
          throw new Error(result.error || 'Failed to transcribe audio');
        }

        if (result.noSpeech || !result.text.trim()) {
          useToasts().addToast('No speech detected.', 'info');
          return;
        }

        const activeContextStore = useActiveContextStore();
        activeContextStore.updateRequirement(
          mergeTranscriptWithDraft(activeContextStore.currentRequirement, result.text),
        );
      } catch (error) {
        this.error = error instanceof Error ? error.message : 'Voice transcription failed';
        useToasts().addToast(this.error, 'error');
      } finally {
        this.isTranscribing = false;
      }
    },

    async toggleRecording(): Promise<void> {
      if (this.isTranscribing) {
        return;
      }

      if (this.isRecording) {
        await this.stopRecording();
        return;
      }

      await this.startRecording();
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
    },
  },
});
