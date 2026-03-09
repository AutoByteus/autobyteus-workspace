# Future-State Runtime Call Stack

## UC-001: User sees audio input availability in Voice Input settings

`[ENTRY][UI] Settings -> Extensions -> Voice Input`
-> `[COMPONENT] VoiceInputExtensionCard` mounts
-> `[STORE] voiceInputStore.initialize()`
-> `[STORE] voiceInputStore.refreshAudioInputDevices()`
-> `[BROWSER] navigator.permissions.query({ name: 'microphone' })` when supported
-> `[BROWSER] navigator.mediaDevices.enumerateDevices()`
-> `[STORE] voiceInputStore` stores:
  - microphone permission status
  - enumerated `audioinput` devices
  - selected-device-unavailable flag
-> `[UI] VoiceInputExtensionCard` renders the current state

## UC-002: User selects a specific audio source

`[ENTRY][UI] VoiceInputExtensionCard audio source select`
-> `[STORE] extensionsStore.updateVoiceInputSettings({ audioInputDeviceId })`
-> `[IPC] window.electronAPI.updateVoiceInputSettings(...)`
-> `[MAIN][SERVICE] managedExtensionService.updateVoiceInputSettings(...)`
-> extension registry persists `audioInputDeviceId`
-> `[UI] both settings test and composer now read the same saved device choice`

## UC-003: Shared capture path uses the selected source

`[ENTRY][UI] Start Test` or composer microphone click
-> `[STORE] voiceInputStore.startRecording(source)`
-> `[STORE] read extensionsStore.voiceInput.settings.audioInputDeviceId`
-> `[STORE] refreshAudioInputDevices()`
-> if permission denied / no devices / selected device missing:
  -> `[STORE] latestResult = error`
  -> `[UI] explicit guidance shown`
-> else
  -> `[BROWSER] navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, deviceId? } })`
  -> existing recorder/transcribe flow continues unchanged
