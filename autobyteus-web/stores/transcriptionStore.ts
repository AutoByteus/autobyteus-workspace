import { defineStore } from 'pinia';
import type { WebSocketMessage } from '~/types/transcription';
import { useRuntimeConfig } from '#app';
import { useAudioStore } from '~/stores/audioStore';
import { useAgentRunStore } from '~/stores/agentRunStore';

interface TranscriptionState {
  transcription: string;
  error: string | null;
  lastTimestamp: number | null;
  sessionId: string | null;
  isConnected: boolean;
  worker: Worker | null;
  sentChunksCount: number;
  receivedChunksCount: number;
  allTranscriptionsReceived: boolean;
  waitForAllResolve: (() => void) | null;
}

export const useTranscriptionStore = defineStore('transcription', {
  state: (): TranscriptionState => ({
    transcription: '',
    error: null,
    lastTimestamp: null,
    sessionId: null,
    isConnected: false,
    worker: null,
    sentChunksCount: 0,
    receivedChunksCount: 0,
    allTranscriptionsReceived: false,
    waitForAllResolve: null
  }),

  actions: {
    initializeWorker() {
      try {
        console.log('Initializing transcription Web Worker.');
        this.worker = new Worker(new URL('~/workers/transcriptionWorker.ts', import.meta.url), {
          type: 'module'
        });

        this.setupWorkerHandlers();
      } catch (err) {
        console.error('Failed to initialize Web Worker:', err);
        this.error = 'Failed to initialize transcription service';
        throw new Error('Failed to initialize transcription service');
      }
    },

    setupWorkerHandlers() {
      if (!this.worker) return;
      console.log('Setting up worker message handlers.');

      this.worker.onmessage = (event) => {
        const { type, payload } = event.data;
        console.log('Worker message received:', type);
        switch (type) {
          case 'CONNECTED':
            console.log('Worker WebSocket connected.');
            this.isConnected = true;
            this.error = null;
            break;
          case 'DISCONNECTED':
            console.log('Worker WebSocket disconnected.', payload);
            this.isConnected = false;
            break;
          case 'MESSAGE':
            console.log('Worker MESSAGE received:', payload);
            this.handleWorkerMessage(payload);
            break;
          case 'ERROR':
            console.error('Worker error:', payload);
            this.error = payload;
            break;
          default:
            console.warn('Unknown message type from worker:', type);
        }
      };

      this.worker.onerror = (err) => {
        console.error('Worker error:', err);
        this.error = 'Transcription service error';
        this.isConnected = false;
      };
    },

    handleWorkerMessage(message: WebSocketMessage) {
      const agentRunStore = useAgentRunStore();
      
      switch (message.type) {
        case 'transcription':
          // Update local transcription
          this.transcription += message.text + ' ';
          this.lastTimestamp = message.timestamp;
          this.receivedChunksCount += 1;
          console.log('Received transcription chunk. Total received:', this.receivedChunksCount);

          // Update user requirement in agent run store
          try {
            const currentRequirement = agentRunStore.currentRequirement;
            agentRunStore.updateUserRequirement(
              currentRequirement ? `${currentRequirement} ${message.text}` : message.text
            );
          } catch (error) {
            console.error('Error updating user requirement:', error);
          }

          this.checkAllTranscriptionsReceived();
          break;
        case 'warning':
          console.warn('Transcription warning:', message.message);
          this.error = message.message;
          break;
        case 'session_init':
          this.sessionId = message.session_id;
          console.log('Session initialized with ID:', this.sessionId);
          break;
        default:
          console.error('Unknown message type:', message.type);
      }
    },

    connectWebSocket(workspaceId: string, stepId: string): Promise<void> {
      console.log('connectWebSocket called with workspaceId:', workspaceId, 'stepId:', stepId);
      return new Promise((resolve, reject) => {
        if (this.isConnected) {
          console.log('Already connected. Resolving promise.');
          resolve();
          return;
        }

        if (!this.worker) {
          try {
            this.initializeWorker();
          } catch (initError) {
            console.error('Failed to initialize worker:', initError);
            reject(initError);
            return;
          }
        }

        if (!this.worker) {
          const errorMsg = 'Transcription service is not available';
          console.error(errorMsg);
          reject(new Error(errorMsg));
          return;
        }

        const config = useRuntimeConfig();
        const transcriptionWsEndpoint = config.public.audio.transcriptionWsEndpoint;
        console.log('Transcription WebSocket endpoint:', transcriptionWsEndpoint);
        
        if (!transcriptionWsEndpoint) {
          const errorMsg = 'Transcription service configuration is missing';
          console.error(errorMsg);
          this.error = errorMsg;
          reject(new Error(errorMsg));
          return;
        }

        const handleConnected = (event: MessageEvent) => {
          const { type } = event.data;
          if (type === 'CONNECTED') {
            console.log('WebSocket connected event received from worker.');
            this.worker?.removeEventListener('message', handleConnected);
            resolve();
          }
        };

        const handleError = (event: MessageEvent) => {
          const { type, payload } = event.data;
          if (type === 'ERROR') {
            console.error('Error event received from worker:', payload);
            this.worker?.removeEventListener('message', handleError);
            reject(new Error(payload));
          }
        };

        this.worker.addEventListener('message', handleConnected);
        this.worker.addEventListener('message', handleError);

        console.log('Sending CONNECT message to worker.');
        this.worker.postMessage({ 
          type: 'CONNECT', 
          payload: { 
            workspaceId, 
            stepId, 
            transcriptionWsEndpoint 
          } 
        });
      });
    },

    disconnectWebSocket() {
      console.log('disconnectWebSocket called.');
      if (this.worker) {
        this.worker.postMessage({ type: 'DISCONNECT' });
        console.log('DISCONNECT message sent to worker.');
      }
      this.isConnected = false;
      console.log('isConnected set to false.');
    },

    async sendAudioChunk(workspaceId: string, stepId: string, audioChunk: ArrayBuffer) {
      console.log('sendAudioChunk called with workspaceId:', workspaceId, 'stepId:', stepId);
      if (!this.worker) {
        const errorMsg = 'Transcription service is not available';
        this.error = errorMsg;
        console.error(errorMsg);
        throw new Error(this.error);
      }

      if (!this.isConnected) {
        const errorMsg = 'WebSocket is not connected';
        this.error = errorMsg;
        console.error(errorMsg);
        throw new Error(this.error);
      }

      try {
        this.worker.postMessage({ 
          type: 'SEND_AUDIO', 
          payload: { wavData: audioChunk } 
        }, [audioChunk]);

        this.sentChunksCount += 1;

      } catch (err) {
        console.error('Error processing audio chunk:', err);
        this.error = 'Failed to process audio data';
        throw new Error(this.error);
      }
    },

    async finalize() {
      console.log('finalize called.');
      try {
        await this.waitForAllTranscriptions();
        console.log('All transcriptions received.');
        this.disconnectWebSocket();
        console.log('WebSocket disconnected.');
      } catch (err) {
        console.error('Error during finalize:', err);
        throw err;
      }
    },

    reset() {
      const agentRunStore = useAgentRunStore();
      this.transcription = '';
      this.error = null;
      this.lastTimestamp = null;
      this.sessionId = null;
      this.isConnected = false;
      this.sentChunksCount = 0;
      this.receivedChunksCount = 0;
      this.allTranscriptionsReceived = false;
      this.waitForAllResolve = null;
      agentRunStore.updateUserRequirement('');
    },

    cleanup() {
      if (this.worker) {
        this.disconnectWebSocket();
        this.worker.terminate();
        this.worker = null;
      }
      this.reset();
    },

    waitForAllTranscriptions(): Promise<void> {
      return new Promise((resolve) => {
        if (this.receivedChunksCount >= this.sentChunksCount) {
          console.log('All transcriptions already received.');
          resolve();
          return;
        }
        this.waitForAllResolve = resolve;
      });
    },

    checkAllTranscriptionsReceived() {
      if (this.receivedChunksCount >= this.sentChunksCount && this.waitForAllResolve) {
        this.waitForAllResolve();
        this.waitForAllResolve = null;
      } else {
      }
    }
  }
});
