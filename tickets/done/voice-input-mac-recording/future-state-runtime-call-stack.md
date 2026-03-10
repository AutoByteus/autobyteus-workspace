# Future-State Runtime Call Stack

## UC-001: User starts macOS Voice Input test successfully

`[ENTRY][UI] Settings -> Extensions -> Voice Input -> Start Test`
-> `VoiceInputExtensionCard.vue`
-> `voiceInputStore.toggleRecording('settings-test')`
-> `voiceInputStore.startRecording('settings-test')`
-> refresh permission and device state
-> `navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, deviceId? } })`
-> create `AudioContext`
-> verify/resume `AudioContext` until state is `running`
-> load `voice-input-recorder.worklet.js`
-> connect `MediaStreamSource -> AudioWorkletNode -> destination`
-> set `isRecording = true`
-> worklet emits `capture-stats`
-> store updates `liveInputLevel`
-> user sees non-zero input meter while speaking

## UC-002: AudioContext cannot enter running state

`[ENTRY][UI] Settings -> Extensions -> Voice Input -> Start Test`
-> `voiceInputStore.startRecording('settings-test')`
-> `getUserMedia(...)` succeeds
-> create `AudioContext`
-> resume/validation step finds state still not `running`
-> throw explicit recorder-startup error containing the audio-context state
-> store sets latest result to `error`
-> store cleans up stream/context
-> settings test leaves `Recording` state and shows actionable failure

## UC-003: Packaged macOS app requests microphone access correctly

`[ENTRY][BUILD] macOS electron-builder packaging`
-> include `NSMicrophoneUsageDescription` in app metadata
-> include `com.apple.security.device.audio-input` in `build/entitlements.mac.plist`
-> packaged app launches on macOS
-> renderer microphone request reaches system privacy/runtime path with matching app entitlement
-> app can open the selected input device for Voice Input capture

## UC-004: Recording starts but no microphone frames ever arrive

`[ENTRY][UI] Settings -> Extensions -> Voice Input -> Start Test`
-> `voiceInputStore.startRecording('settings-test')`
-> recorder graph is created
-> no `capture-stats` worklet message arrives within watchdog window
-> store exits recording state automatically
-> store surfaces actionable recovery error
-> user can retry immediately or press `Reset Test`

## UC-005: User resets a bad settings-level test state

`[ENTRY][UI] Settings -> Extensions -> Voice Input -> Reset Test`
-> `voiceInputStore.resetSettingsTestState()`
-> close stream/context/worklet
-> clear transient recording/transcribing/error state
-> refresh audio device visibility
-> settings card returns to ready-to-test state
