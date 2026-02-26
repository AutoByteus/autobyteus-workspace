import { describe, it, expect, beforeEach, vi } from 'vitest'
import { useAudioStore } from '~/stores/audioStore'
import { useTranscriptionStore } from '~/stores/transcriptionStore'

vi.mock('~/stores/transcriptionStore', () => ({
  useTranscriptionStore: () => ({
    error: null,
    connectWebSocket: vi.fn().mockResolvedValue(undefined),
    sendAudioChunk: vi.fn().mockResolvedValue(undefined),
    finalize: vi.fn().mockResolvedValue(undefined),
  }),
}));

vi.mock('#app', () => ({
  useRuntimeConfig: () => ({
    public: {
      audio: {
        channels: 1,
        targetSampleRate: 44100,
        constraints: {},
        chunkDuration: 1,
        overlapDuration: 0,
        transcriptionWsEndpoint: 'ws://localhost/test',
      },
    },
  }),
}));

describe('audioStore', () => {
  let audioStore: ReturnType<typeof useAudioStore>
  let transcriptionStore: ReturnType<typeof useTranscriptionStore>

  let addModuleMock = vi.fn()

  beforeEach(() => {
    // Reset mocks
    addModuleMock = vi.fn().mockResolvedValue(undefined)
    if (!navigator.mediaDevices) {
      Object.defineProperty(navigator, 'mediaDevices', {
        value: { getUserMedia: vi.fn() },
        configurable: true,
      })
    }
    const mockStream = {
      getTracks: () => [{ stop: vi.fn() }],
      getAudioTracks: () => [],
    } as any;
    vi.spyOn(navigator.mediaDevices, 'getUserMedia').mockResolvedValue(mockStream)

    class MockAudioWorkletNode {
      port = {
        postMessage: vi.fn((message: any) => {
          if (message?.type === 'FLUSH' && this.port.onmessage) {
            setTimeout(() => {
              this.port.onmessage?.({ data: { type: 'flush_done' } })
            }, 0)
          }
        }),
        onmessage: null as null | ((event: any) => void)
      };
      connect = vi.fn();
      constructor() {}
    }

    class MockAudioContext {
      audioWorklet = { addModule: addModuleMock };
      destination = {};
      createMediaStreamSource = vi.fn(() => ({ connect: vi.fn() }));
      close = vi.fn().mockResolvedValue(undefined);
      constructor() {}
    }

    vi.stubGlobal('AudioWorkletNode', MockAudioWorkletNode as any);
    vi.stubGlobal('AudioContext', MockAudioContext as any);

    audioStore = useAudioStore()
    transcriptionStore = useTranscriptionStore()
  })

  describe('initialization', () => {
    it('should start with default values', () => {
      expect(audioStore.isRecording).toBe(false)
      expect(audioStore.combinedError).toBeNull()
    })
  })

  describe('startRecording', () => {
    it('should initialize recording', async () => {
      await audioStore.startRecording('workspace-1', 'step-1')
      
      expect(audioStore.isRecording).toBe(true)
      expect(audioStore.combinedError).toBeNull()
    })

    it('should handle audio worklet load failure', async () => {
      addModuleMock.mockRejectedValueOnce(new Error('Worklet load failed'))

      await expect(
        audioStore.startRecording('workspace-1', 'step-1')
      ).rejects.toThrow('Worklet load failed')
      
      expect(audioStore.isRecording).toBe(false)
    })

    it('should handle microphone permission denial', async () => {
      vi.spyOn(navigator.mediaDevices, 'getUserMedia')
        .mockRejectedValueOnce(new Error('Permission denied'))

      await expect(
        audioStore.startRecording('workspace-1', 'step-1')
      ).rejects.toThrow('Permission denied')
      
      expect(audioStore.isRecording).toBe(false)
      expect(audioStore.combinedError).toBe('Permission denied')
    })
  })

  describe('stopRecording', () => {
    it('should stop recording and cleanup resources', async () => {
      await audioStore.startRecording('workspace-1', 'step-1')
      expect(audioStore.isRecording).toBe(true)

      await audioStore.stopRecording('workspace-1', 'step-1')
      expect(audioStore.isRecording).toBe(false)
    })
  })

  describe('cleanup', () => {
    it('should cleanup resources when recording', async () => {
      await audioStore.startRecording('workspace-1', 'step-1')
      await audioStore.cleanup('workspace-1', 'step-1')
      
      expect(audioStore.isRecording).toBe(false)
    })

    it('should do nothing when not recording', async () => {
      await audioStore.cleanup('workspace-1', 'step-1')
      expect(audioStore.isRecording).toBe(false)
    })
  })
})
