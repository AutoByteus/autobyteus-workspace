export interface VoiceTranscriptTarget { key: string; isCurrent: () => boolean; appendTranscript: (text: string) => void }
export type VoiceInputRecordingRequest = { source: 'composer' | 'project-task' | 'project-description'; target: VoiceTranscriptTarget } | {source: 'settings-test'};
export type VoiceInputRecordingSource = VoiceInputRecordingRequest['source'];
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

export interface VoiceInputCapturePayload {
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

export interface VoiceInputStoreState {
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
  flushPromiseResolve: ((payload: VoiceInputCapturePayload | null) => void) | null;
  audioInputDevices: VoiceInputAudioInputDevice[];
  microphonePermissionState: VoiceInputPermissionState;
  mediaDeviceListenerRegistered: boolean;
  captureWatchdogTimer: ReturnType<typeof setTimeout> | null;
  hasReceivedCaptureStats: boolean;
  transcriptTarget: VoiceTranscriptTarget | null;
  startupAttemptGeneration: number;
}
