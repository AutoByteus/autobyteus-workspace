import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

type MockAgentContext = {
  contextId: string
  requirement: string
  contextFilePaths: Array<{ path: string; type: 'Text' | 'Image' | 'Audio' | 'Video' }>
}

const createContext = (contextId: string, requirement = ''): MockAgentContext => ({
  contextId,
  requirement,
  contextFilePaths: [],
})

const activeContextStoreMock = {
  activeAgentContext: createContext('ctx-1', 'hello'),
  currentRequirement: 'hello',
  updateRequirement: vi.fn(),
  updateRequirementForContext: vi.fn(),
  send: vi.fn(),
}

/** This computer's Voice Input as the embedded node lists it (design AR-001): installed, on and ready. */
const voiceItem = { id: 'voice-input', state: 'installed', enabled: true, ready: true }
const { availabilityQueryMock, transcribeActionMock } = vi.hoisted(() => ({ availabilityQueryMock: vi.fn(), transcribeActionMock: vi.fn() }))

const addToastMock = vi.fn()
const enumerateDevicesMock = vi.fn()
const getUserMediaMock = vi.fn()
const permissionsQueryMock = vi.fn()

vi.mock('~/stores/nodeStore', () => ({
  useNodeStore: () => ({ getEntryById: (id: string) => (id === 'embedded-local' ? { id, baseUrl: 'http://127.0.0.1:29695' } : null) }),
}))
vi.mock('~/services/nodeCollaboration/directNodeApolloClient', () => ({
  directNodeApolloClient: () => ({ query: availabilityQueryMock }),
}))
vi.mock('~/services/extensions/extensionActionClient', async (importOriginal) => ({
  ...(await importOriginal<typeof import('~/services/extensions/extensionActionClient')>()),
  callExtensionAction: (...args: unknown[]) => transcribeActionMock(...args),
}))

vi.mock('~/composables/useToasts', () => ({
  useToasts: () => ({
    addToast: addToastMock,
  }),
}))

import { useVoiceInputStore, VOICE_INPUT_MICROPHONE_STORAGE_KEY } from '../voiceInputStore'
import { ExtensionActionError } from '~/services/extensions/extensionActionClient'

const sink = (context = activeContextStoreMock.activeAgentContext) => ({
  key: context.contextId,
  isCurrent: () => activeContextStoreMock.activeAgentContext === context,
  appendTranscript: (text: string) => {context.requirement = `${context.requirement} ${text}`.trim()},
})

describe('voiceInputStore', () => {
  beforeEach(() => {
    vi.useRealTimers()
    setActivePinia(createPinia())
    activeContextStoreMock.activeAgentContext = createContext('ctx-1', 'hello')
    activeContextStoreMock.currentRequirement = 'hello'
    activeContextStoreMock.updateRequirement.mockReset()
    activeContextStoreMock.updateRequirementForContext.mockReset()
    activeContextStoreMock.send.mockReset()
    activeContextStoreMock.updateRequirement.mockImplementation((text: string) => {
      const context = activeContextStoreMock.activeAgentContext
      if (!context) {
        return
      }
      context.requirement = text
      activeContextStoreMock.currentRequirement = text
    })
    activeContextStoreMock.updateRequirementForContext.mockImplementation(
      (context: MockAgentContext | null, text: string) => {
        if (!context) {
          return
        }
        context.requirement = text
        if (activeContextStoreMock.activeAgentContext === context) {
          activeContextStoreMock.currentRequirement = text
        }
      },
    )
    window.localStorage.clear()
    availabilityQueryMock.mockReset()
    availabilityQueryMock.mockResolvedValue({ data: { extensions: { catalog: 'unreachable', platform: 'darwin-arm64', extensions: [voiceItem] } } })
    transcribeActionMock.mockReset()
    transcribeActionMock.mockResolvedValue({ text: 'world', detectedLanguage: 'en', noSpeech: false })
    addToastMock.mockReset()
    enumerateDevicesMock.mockReset()
    getUserMediaMock.mockReset()
    permissionsQueryMock.mockReset()

    Object.defineProperty(navigator, 'mediaDevices', {
      configurable: true,
      value: {
        enumerateDevices: enumerateDevicesMock.mockResolvedValue([
          { kind: 'audioinput', deviceId: 'mic-1', label: 'USB Microphone' },
        ]),
        getUserMedia: getUserMediaMock.mockResolvedValue({
          getTracks: () => [{ stop: vi.fn() }],
        }),
        addEventListener: vi.fn(),
      },
    })

    Object.defineProperty(navigator, 'permissions', {
      configurable: true,
      value: {
        query: permissionsQueryMock.mockResolvedValue({ state: 'granted' }),
      },
    })
  })

  it('commits starting synchronously, guards duplicate starts, and cancels without a late commit', async () => {
    let resolveInitialization!: () => void
    availabilityQueryMock.mockImplementationOnce(() => new Promise((resolve) => {
      resolveInitialization = () => resolve({ data: { extensions: { catalog: 'verified', platform: 'darwin-arm64', extensions: [voiceItem] } } })
    }))
    const store = useVoiceInputStore()

    const startup = store.startRecording({ source: 'composer', target: sink() })
    expect(store.isStarting).toBe(true)
    expect(store.isRecording).toBe(false)
    expect(store.recordingSource).toBe('composer')

    await store.startRecording({ source: 'composer', target: sink() })
    expect(availabilityQueryMock).toHaveBeenCalledOnce()

    await store.cancelOperationForSource('settings-test')
    expect(store.isStarting).toBe(true)
    await store.cancelOperationForSource('composer')
    expect(store.isStarting).toBe(false)
    expect(store.recordingSource).toBe(null)

    resolveInitialization()
    await startup
    expect(store.isRecording).toBe(false)
    expect(getUserMediaMock).not.toHaveBeenCalled()
    expect(addToastMock).not.toHaveBeenCalled()
  })

  it('disposes resources acquired by a startup invalidated before commit', async () => {
    let resolveMedia!: (stream: MediaStream) => void
    const stopMock = vi.fn()
    getUserMediaMock.mockImplementationOnce(() => new Promise<MediaStream>((resolve) => {
      resolveMedia = resolve
    }))
    const store = useVoiceInputStore()
    const startup = store.startRecording({ source: 'settings-test' })
    await vi.waitFor(() => expect(getUserMediaMock).toHaveBeenCalledOnce())

    await store.cancelOperationForSource('settings-test')
    resolveMedia({ getTracks: () => [{ stop: stopMock }] } as unknown as MediaStream)
    await startup

    expect(stopMock).toHaveBeenCalledOnce()
    expect(store.isStarting).toBe(false)
    expect(store.isRecording).toBe(false)
    expect(addToastMock).not.toHaveBeenCalled()
  })

  it('clears starting state and preserves the permission-denied error path', async () => {
    permissionsQueryMock.mockResolvedValue({ state: 'denied' })
    const store = useVoiceInputStore()

    await store.startRecording({ source: 'composer', target: sink() })

    expect(getUserMediaMock).not.toHaveBeenCalled()
    expect(store.isStarting).toBe(false)
    expect(store.isRecording).toBe(false)
    expect(store.recordingSource).toBe(null)
    expect(store.microphonePermissionState).toBe('denied')
    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('permission is denied')
    expect(addToastMock).toHaveBeenCalledWith(
      expect.stringContaining('permission is denied'),
      'error',
    )
  })

  it('disposes acquired resources and clears starting when AudioWorklet setup fails', async () => {
    const stopMock = vi.fn()
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const addModuleMock = vi.fn().mockRejectedValue(new Error('worklet setup failed'))
    getUserMediaMock.mockResolvedValue({
      getTracks: () => [{ stop: stopMock }],
    })

    vi.stubGlobal('AudioContext', class {
      state = 'running'
      audioWorklet = { addModule: addModuleMock }
      resume = vi.fn().mockResolvedValue(undefined)
      close = closeMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording({ source: 'settings-test' })

    expect(addModuleMock).toHaveBeenCalledOnce()
    expect(stopMock).toHaveBeenCalledOnce()
    expect(closeMock).toHaveBeenCalledOnce()
    expect(store.isStarting).toBe(false)
    expect(store.isRecording).toBe(false)
    expect(store.recordingSource).toBe(null)
    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('worklet setup failed')

    vi.unstubAllGlobals()
  })

  it('cancels only the matching recording source and preserves transcription', async () => {
    const stopMock = vi.fn()
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const store = useVoiceInputStore()
    store.isRecording = true
    store.recordingSource = 'composer'
    store.stream = { getTracks: () => [{ stop: stopMock }] } as any
    store.audioContext = { close: closeMock } as any

    await store.cancelOperationForSource('settings-test')
    expect(store.isRecording).toBe(true)
    expect(stopMock).not.toHaveBeenCalled()

    await store.cancelOperationForSource('composer')
    expect(store.isRecording).toBe(false)
    expect(stopMock).toHaveBeenCalledOnce()
    expect(closeMock).toHaveBeenCalledOnce()

    store.isTranscribing = true
    store.recordingSource = 'settings-test'
    await store.cancelOperationForSource('settings-test')
    expect(store.isTranscribing).toBe(true)
    expect(store.recordingSource).toBe('settings-test')
  })

  it('appends transcript text into the current draft without sending', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1500,
        rms: 0.031,
        peak: 0.42,
        sampleCount: 72000,
      },
    }

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true
    store.recordingSource = 'composer'
    store.transcriptTarget = sink()

    await store.stopRecording()

    expect(transcribeActionMock).toHaveBeenCalledExactlyOnceWith('http://127.0.0.1:29695', 'voice-input', 'transcribe', { wav: expect.any(ArrayBuffer) })
    expect(activeContextStoreMock.activeAgentContext.requirement).toBe('hello world')
    expect(activeContextStoreMock.send).not.toHaveBeenCalled()
    expect(store.latestResult?.outcome).toBe('transcript-ready')
    expect(store.latestResult?.diagnostics?.wavSampleRate).toBe(48000)
  })

  it('surfaces transcription failure without mutating the draft', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 900,
        rms: 0.021,
        peak: 0.18,
        sampleCount: 43200,
      },
    }

    transcribeActionMock.mockRejectedValue(new ExtensionActionError('ACTION_FAILED', 'runtime failed'))

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true
    store.recordingSource = 'composer'
    store.transcriptTarget = sink()

    await store.stopRecording()

    expect(activeContextStoreMock.updateRequirementForContext).not.toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith('runtime failed', 'error')
    expect(store.latestResult?.outcome).toBe('error')
  })

  it('does not mutate the draft when no speech is detected', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 600,
        rms: 0.005,
        peak: 0.03,
        sampleCount: 28800,
      },
    }

    transcribeActionMock.mockResolvedValue({ text: '', detectedLanguage: null, noSpeech: true })

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true
    store.recordingSource = 'composer'
    store.transcriptTarget = sink()

    await store.stopRecording()

    expect(activeContextStoreMock.updateRequirementForContext).not.toHaveBeenCalled()
    expect(addToastMock).toHaveBeenCalledWith('No speech detected.', 'info')
    expect(store.latestResult?.outcome).toBe('no-speech')
  })

  it('distinguishes empty transcript from true no-speech', async () => {
    const store = useVoiceInputStore()
    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1200,
        rms: 0.012,
        peak: 0.11,
        sampleCount: 57600,
      },
    }

    transcribeActionMock.mockResolvedValue({ text: '', detectedLanguage: 'en', noSpeech: false })

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any
    store.stream = {
      getTracks: () => [{ stop: vi.fn() }],
    } as any
    store.audioContext = {
      close: vi.fn().mockResolvedValue(undefined),
    } as any
    store.isRecording = true
    store.recordingSource = 'composer'
    store.transcriptTarget = sink()

    await store.stopRecording()

    expect(store.latestResult?.outcome).toBe('empty-transcript')
    expect(addToastMock).toHaveBeenCalledWith('No transcript returned. Try speaking closer to the microphone.', 'info')
  })

  it('discards a transcript when its composer destination is no longer current', async () => {
    const architectureContext = createContext('ctx-architecture', 'please review')
    const apiE2eContext = createContext('ctx-api-e2e', '')
    activeContextStoreMock.activeAgentContext = architectureContext
    activeContextStoreMock.currentRequirement = architectureContext.requirement

    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()

    vi.stubGlobal('AudioContext', class {
      state = 'running'
      audioWorklet = { addModule: addModuleMock }
      resume = vi.fn().mockResolvedValue(undefined)
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()
    await store.startRecording({ source: 'composer', target: sink() })
    expect(store.transcriptTarget?.key).toBe('ctx-architecture')


    const capturePayload = {
      audioData: new Uint8Array([1, 2, 3]).buffer,
      diagnostics: {
        inputSampleRate: 48000,
        wavSampleRate: 48000,
        durationMs: 1400,
        rms: 0.022,
        peak: 0.27,
        sampleCount: 67200,
      },
    }

    store.audioWorklet = {
      port: {
        postMessage: vi.fn(() => {
          queueMicrotask(() => {
            store.flushPromiseResolve?.(capturePayload)
          })
        }),
      },
    } as any

    activeContextStoreMock.activeAgentContext = apiE2eContext
    activeContextStoreMock.currentRequirement = apiE2eContext.requirement

    await store.stopRecording()

    expect(activeContextStoreMock.updateRequirementForContext).not.toHaveBeenCalled()
    expect(architectureContext.requirement).toBe('please review')
    expect(apiE2eContext.requirement).toBe('')

    vi.unstubAllGlobals()
  })

  it('uses the selected audio input device when starting recording', async () => {
    window.localStorage.setItem(VOICE_INPUT_MICROPHONE_STORAGE_KEY, 'virtual-source')
    enumerateDevicesMock.mockResolvedValue([
      { kind: 'audioinput', deviceId: 'virtual-source', label: 'Virtual Source' },
      { kind: 'audioinput', deviceId: 'usb-mic', label: 'USB Microphone' },
    ])

    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()

    vi.stubGlobal('AudioContext', class {
      state = 'running'
      audioWorklet = { addModule: addModuleMock }
      resume = vi.fn().mockResolvedValue(undefined)
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording({ source: 'settings-test' })

    expect(getUserMediaMock).toHaveBeenCalledWith({
      audio: {
        channelCount: 1,
        deviceId: { exact: 'virtual-source' },
      },
    })
    expect(store.isRecording).toBe(true)
    expect(store.selectedAudioInputLabel).toBe('Virtual Source')

    vi.unstubAllGlobals()
  })

  it('resumes a suspended audio context before marking recording active', async () => {
    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()
    const resumeMock = vi.fn().mockImplementation(function(this: { state: string }) {
      this.state = 'running'
      return Promise.resolve()
    })

    vi.stubGlobal('AudioContext', class {
      state = 'suspended'
      audioWorklet = { addModule: addModuleMock }
      resume = resumeMock
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording({ source: 'settings-test' })

    expect(resumeMock).toHaveBeenCalledOnce()
    expect(store.isRecording).toBe(true)
    expect(store.latestResult?.outcome).toBe('recording')

    vi.unstubAllGlobals()
  })

  it('fails with an actionable error when the audio context never reaches running', async () => {
    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()
    const resumeMock = vi.fn().mockResolvedValue(undefined)

    vi.stubGlobal('AudioContext', class {
      state = 'suspended'
      audioWorklet = { addModule: addModuleMock }
      resume = resumeMock
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording({ source: 'settings-test' })

    expect(resumeMock).toHaveBeenCalledOnce()
    expect(store.isRecording).toBe(false)
    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('audio engine stayed in "suspended" state')
    expect(addToastMock).toHaveBeenCalledWith(
      'Voice Input recorder could not start because the audio engine stayed in "suspended" state.',
      'error',
    )
    expect(closeMock).toHaveBeenCalledOnce()
    expect(addModuleMock).not.toHaveBeenCalled()

    vi.unstubAllGlobals()
  })

  it('fails fast when recording starts but no capture frames ever arrive', async () => {
    vi.useFakeTimers()

    const addModuleMock = vi.fn().mockResolvedValue(undefined)
    const closeMock = vi.fn().mockResolvedValue(undefined)
    const connectMock = vi.fn()

    vi.stubGlobal('AudioContext', class {
      state = 'running'
      audioWorklet = { addModule: addModuleMock }
      resume = vi.fn().mockResolvedValue(undefined)
      createMediaStreamSource() {
        return { connect: connectMock }
      }
      close = closeMock
    } as any)

    vi.stubGlobal('AudioWorkletNode', class {
      port = { onmessage: null }
      connect = connectMock
    } as any)

    const store = useVoiceInputStore()

    await store.startRecording({ source: 'settings-test' })
    expect(store.isRecording).toBe(true)

    await vi.advanceTimersByTimeAsync(2500)

    expect(store.isRecording).toBe(false)
    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('did not receive any microphone frames')
    expect(addToastMock).toHaveBeenCalledWith(
      'Voice Input did not receive any microphone frames. Reset the test and try again, or switch back to System default.',
      'error',
    )
    expect(closeMock).toHaveBeenCalledOnce()

    vi.unstubAllGlobals()
    vi.useRealTimers()
  })

  it('resets the settings-level test state without requiring app restart', async () => {
    const stopMock = vi.fn()
    const closeMock = vi.fn().mockResolvedValue(undefined)

    const store = useVoiceInputStore()
    store.stream = {
      getTracks: () => [{ stop: stopMock }],
    } as any
    store.audioContext = {
      close: closeMock,
    } as any
    store.audioWorklet = {
      port: { onmessage: null },
    } as any
    store.isRecording = true
    store.recordingSource = 'settings-test'
    store.error = 'stuck'
    store.setLatestResult({
      source: 'settings-test',
      outcome: 'error',
      transcript: '',
      detectedLanguage: null,
      error: 'stuck',
      diagnostics: null,
    })

    await store.resetSettingsTestState()

    expect(store.isRecording).toBe(false)
    expect(store.isTranscribing).toBe(false)
    expect(store.error).toBe(null)
    expect(store.latestResult).toBe(null)
    expect(stopMock).toHaveBeenCalledOnce()
    expect(closeMock).toHaveBeenCalledOnce()
  })

  it('fails early when no audio input devices are available', async () => {
    enumerateDevicesMock.mockResolvedValue([])

    const store = useVoiceInputStore()

    await store.startRecording({ source: 'settings-test' })

    expect(store.latestResult?.outcome).toBe('error')
    expect(store.latestResult?.error).toContain('No audio input devices found')
    expect(addToastMock).toHaveBeenCalledWith(
      'No audio input devices found. Connect a microphone or enable a virtual audio source.',
      'error',
    )
  })
  const mockCapture = (store: ReturnType<typeof useVoiceInputStore>, flush = true) => {
    const stop = vi.fn()
    store.stream = {getTracks: () => [{stop}]} as any
    store.audioContext = {close: vi.fn().mockResolvedValue(undefined)} as any
    store.audioWorklet = {port: {postMessage: vi.fn(() => {
      if (flush) queueMicrotask(() => store.flushPromiseResolve?.({
        audioData: new Uint8Array([1,2]).buffer,
        diagnostics: {inputSampleRate: 48000, wavSampleRate: 48000, durationMs: 100, rms: .1, peak: .2, sampleCount: 4800},
      }))
    })}} as any
    store.isRecording = true
    store.recordingSource = 'project-task'
    return stop
  }
  it.each(['project-task', 'project-description'] as const)('delivers %s only to its live target', async (source) => {
    const store = useVoiceInputStore(), append = vi.fn()
    const target = {key: 'owned-description', isCurrent: () => true, appendTranscript: append}
    store.transcriptTarget = target
    mockCapture(store)
    store.recordingSource = source
    transcribeActionMock.mockResolvedValue({ text: 'dictated description', noSpeech: false, detectedLanguage: 'en' })
    await store.cancelOperationForTarget('unrelated-target')
    expect(store.isRecording).toBe(true)
    await store.stopRecording()
    expect(append).toHaveBeenCalledExactlyOnceWith('dictated description')
    expect(store.latestResult).toMatchObject({source, outcome: 'transcript-ready'})
    expect(store.transcriptTarget).toBeNull()
  })
  it('settles a cancelled pending FLUSH, stops media and releases global busy without an IPC request', async () => {
    const store = useVoiceInputStore(), append = vi.fn()
    store.transcriptTarget = {key: 'task-local', isCurrent: () => true, appendTranscript: append}
    const stop = mockCapture(store, false)
    const pending = store.stopRecording()
    await store.cancelOperationForTarget('task-local')
    await pending
    expect(stop).toHaveBeenCalledOnce()
    expect(store.isTranscribing).toBe(false)
    expect(transcribeActionMock).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })
  it('ignores uncancellable late IPC text after Cancel while keeping global busy until settlement', async () => {
    const store = useVoiceInputStore(), append = vi.fn()
    let resolve!: (value: unknown) => void
    transcribeActionMock.mockImplementation(() => new Promise((r) => {resolve = r}))
    store.transcriptTarget = {key: 'task-local', isCurrent: () => true, appendTranscript: append}
    mockCapture(store)
    const pending = store.stopRecording()
    await vi.waitFor(() => expect(transcribeActionMock).toHaveBeenCalledOnce())
    await store.cancelOperationForTarget('task-local')
    expect(store.isTranscribing).toBe(true)
    await store.startRecording({source: 'settings-test'})
    expect(getUserMediaMock).not.toHaveBeenCalled()
    resolve({text: 'must not append', noSpeech: false, detectedLanguage: 'en'})
    await pending
    expect(append).not.toHaveBeenCalled()
    expect(store.isTranscribing).toBe(false)
    expect(store.recordingSource).toBeNull()
    expect(addToastMock).not.toHaveBeenCalled()
  })
  it('disposes capture when its sink becomes ineligible before flush completion (guard contract, not node journey)', async () => {
    const store = useVoiceInputStore(), append = vi.fn()
    let eligible = true
    store.transcriptTarget = {key: 'task-local', isCurrent: () => eligible, appendTranscript: append}
    const stop = mockCapture(store)
    const pending = store.stopRecording()
    eligible = false
    await pending
    expect(stop).toHaveBeenCalledOnce()
    expect(store.isTranscribing).toBe(false)
    expect(transcribeActionMock).not.toHaveBeenCalled()
    expect(append).not.toHaveBeenCalled()
  })

  describe('this computer\'s Voice Input availability (design AR-001)', () => {
    const listOf = (items: unknown[]) => ({ data: { extensions: { catalog: 'verified', platform: 'darwin-arm64', extensions: items } } })

    it('shows the microphone only when the embedded node lists voice-input installed, on and ready', async () => {
      const store = useVoiceInputStore()
      await store.initialize()
      expect(store.isAvailable).toBe(true)
      for (const item of [{ ...voiceItem, enabled: false }, { ...voiceItem, ready: false }, { ...voiceItem, state: 'notInstalled', enabled: null, ready: null }]) {
        availabilityQueryMock.mockResolvedValueOnce(listOf([item]))
        await store.refreshAvailability()
        expect(store.isAvailable).toBe(false)
      }
      availabilityQueryMock.mockResolvedValueOnce(listOf([]))
      await store.refreshAvailability()
      expect(store.voiceInput).toBeNull()
      availabilityQueryMock.mockRejectedValueOnce(new Error('node down'))
      await store.refreshAvailability()
      expect(store.isAvailable).toBe(false)
      expect(availabilityQueryMock).toHaveBeenLastCalledWith(expect.objectContaining({ variables: { refreshCatalog: false } }))
    })

    it('reads again when the window regains focus, and keeps only the latest answer', async () => {
      const store = useVoiceInputStore()
      await store.initialize()
      expect(store.isAvailable).toBe(true)
      availabilityQueryMock.mockResolvedValue(listOf([{ ...voiceItem, enabled: false }]))
      window.dispatchEvent(new Event('focus'))
      await vi.waitFor(() => expect(store.isAvailable).toBe(false))

      let answerFirst!: (value: unknown) => void
      availabilityQueryMock.mockImplementationOnce(() => new Promise((resolve) => { answerFirst = resolve }))
      const first = store.refreshAvailability()
      availabilityQueryMock.mockResolvedValueOnce(listOf([voiceItem]))
      await store.refreshAvailability()
      answerFirst(listOf([{ ...voiceItem, enabled: false }]))
      await first
      expect(store.isAvailable).toBe(true)
    })

    it('hides the microphone at once when a dictation finds Voice Input off, and reads again', async () => {
      const store = useVoiceInputStore()
      await store.initialize()
      transcribeActionMock.mockRejectedValueOnce(new ExtensionActionError('EXTENSION_OFF', 'voice-input is turned off on this node.'))
      availabilityQueryMock.mockResolvedValueOnce(listOf([{ ...voiceItem, enabled: false }]))
      await expect(store.transcribe(new ArrayBuffer(8))).rejects.toThrow('turned off')
      expect(store.isAvailable).toBe(false)
      await vi.waitFor(() => expect(store.voiceInput).toMatchObject({ enabled: false }))
    })

    it('keeps this computer\'s microphone choice in the renderer\'s storage, shared by every window', () => {
      const store = useVoiceInputStore()
      store.setMicrophone('usb-mic')
      expect(window.localStorage.getItem(VOICE_INPUT_MICROPHONE_STORAGE_KEY)).toBe('usb-mic')
      setActivePinia(createPinia())
      expect(useVoiceInputStore().selectedAudioInputDeviceId).toBe('usb-mic')
      useVoiceInputStore().setMicrophone(null)
      expect(window.localStorage.getItem(VOICE_INPUT_MICROPHONE_STORAGE_KEY)).toBeNull()
    })
  })
})
