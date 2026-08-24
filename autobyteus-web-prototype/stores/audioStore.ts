import { defineStore } from 'pinia';
import { useTranscriptionStore } from '~/stores/transcriptionStore';
import { useRuntimeConfig } from '#app';
import { v4 as uuidv4 } from 'uuid';

interface AudioChunk {
  id: string;
  wavData: Uint8Array;
  targetSampleRate: number;
  timestamp: number;
  chunkNumber: number;
}

interface AudioStoreState {
  isRecording: boolean;
  isStopping: boolean;
  error: string | null;
  audioContext: AudioContext | null;
  audioWorklet: AudioWorkletNode | null;
  stream: MediaStream | null;
  audioChunks: AudioChunk[];
  showChunks: boolean;
  chunkCounter: number;
  waitingToClose: boolean;
  flushPromiseResolve: (() => void) | null;
}

export const useAudioStore = defineStore('audio', {
  state: (): AudioStoreState => ({
    isRecording: false,
    isStopping: false,
    error: null,
    audioContext: null,
    audioWorklet: null,
    stream: null,
    audioChunks: [],
    showChunks: false,
    chunkCounter: 1,
    waitingToClose: false,
    flushPromiseResolve: null
  }),

  getters: {
    combinedError(): string | null {
      const transcriptionStore = useTranscriptionStore();
      return this.error || transcriptionStore.error;
    }
  },

  actions: {
    getAudioConstraints() {
      const config = useRuntimeConfig();
      return {
        audio: {
          channelCount: config.public.audio.channels,
          sampleRate: config.public.audio.targetSampleRate,
          ...config.public.audio.constraints
        }
      };
    },

    toggleChunksVisibility() {
      this.showChunks = !this.showChunks;
    },

    async downloadChunk(chunkId: string) {
      const chunk = this.audioChunks.find(c => c.id === chunkId);
      if (chunk) {
        const wavBlob = new Blob([chunk.wavData], { type: 'audio/wav' });
        const url = URL.createObjectURL(wavBlob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `chunk_${chunk.chunkNumber}.wav`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    },

    deleteChunk(chunkId: string) {
      this.audioChunks = this.audioChunks.filter(chunk => chunk.id !== chunkId);
    },

    clearAllChunks() {
      this.audioChunks = [];
      this.chunkCounter = 1;
      this.waitingToClose = false;
    },

    async startRecording(workspaceId: string, agentDefinitionId: string): Promise<void> {
      try {
        this.error = null;

        const transcriptionStore = useTranscriptionStore();
        await transcriptionStore.connectWebSocket(workspaceId, agentDefinitionId);

        this.stream = await navigator.mediaDevices.getUserMedia(this.getAudioConstraints());

        const config = useRuntimeConfig();
        const targetSampleRate = config.public.audio.targetSampleRate;
        const chunkDuration = config.public.audio.chunkDuration;
        const overlapDuration = config.public.audio.overlapDuration;  // Retrieve overlapDuration from config

        this.audioContext = new AudioContext({
          sampleRate: targetSampleRate,
          latencyHint: 'interactive'
        });

        await this.audioContext.audioWorklet.addModule(new URL('@/workers/audio-processor.worklet.js', import.meta.url));

        const processorOptions = {
          targetSampleRate: targetSampleRate,
          chunkDuration: chunkDuration,
          overlapDuration: overlapDuration  // Pass overlapDuration here
        };

        const source = this.audioContext.createMediaStreamSource(this.stream);

        this.audioWorklet = new AudioWorkletNode(this.audioContext, 'audio-chunk-processor', {
          processorOptions
        });

        const chunkDurationSec = config.public.audio.chunkDuration;
        const transcriptionStore2 = useTranscriptionStore();

        this.audioWorklet.port.onmessage = async (event) => {
          const { type, wavData, isFinal } = event.data;
          if (type === 'chunk') {
            const chunk: AudioChunk = {
              id: uuidv4(),
              wavData: new Uint8Array(wavData),
              targetSampleRate: event.data.targetSampleRate,
              timestamp: Date.now(),
              chunkNumber: this.chunkCounter++
            };

            this.audioChunks.push(chunk);
            await transcriptionStore2.sendAudioChunk(workspaceId, agentDefinitionId, chunk.wavData.buffer);
          } else if (type === 'flush_done') {
            if (this.flushPromiseResolve) {
              this.flushPromiseResolve();
              this.flushPromiseResolve = null;
            }
          }
        };

        source.connect(this.audioWorklet);
        this.audioWorklet.connect(this.audioContext.destination);

        this.isRecording = true;
        this.waitingToClose = false;

      } catch (err: any) {
        this.error = err.message;
        await this.stopRecording(workspaceId, agentDefinitionId);
        throw err;
      }
    },

    async stopRecording(workspaceId: string, agentDefinitionId: string): Promise<void> {
      try {
        this.isStopping = true;

        // First stop the media stream to prevent new audio input
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        if (this.audioWorklet) {
          this.audioWorklet.port.postMessage({ type: 'FLUSH' });
          console.log('FLUSH message sent.');

          this.waitingToClose = true;

          const flushPromise = new Promise<void>((resolve) => {
            this.flushPromiseResolve = resolve;
          });

          await flushPromise;
          console.log('Worker flush_done.');

          const transcriptionStore = useTranscriptionStore();
          await transcriptionStore.finalize();
        }

        if (this.audioContext) {
          await this.audioContext.close();
          this.audioContext = null;
        }

        this.isRecording = false;
        this.isStopping = false;

      } catch (err: any) {
        this.error = err.message;
        this.isStopping = false;
        throw err;
      }
    },

    async cleanup(workspaceId: string | null = null, agentDefinitionId: string | null = null): Promise<void> {
      if (this.isRecording && workspaceId && agentDefinitionId) {
        await this.stopRecording(workspaceId, agentDefinitionId);
      }
      this.clearAllChunks();
    }
  }
});
