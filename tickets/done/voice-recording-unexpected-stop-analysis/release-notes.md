# Release Notes — Composer Voice Recording Lifetime

Status: prepared before user verification; archived as proposed content only.
User explicitly requested finalization without a new version. Release/channel/
publication/deployment are Not required; this file is not used to publish anything.

## Fixed
- Prevent background Team updates from unexpectedly cancelling voice recording
  when the composer's actual destination remains unchanged.
- Preserve genuine destination-change/teardown cancellation and late-result
  isolation. Manual Stop still adds transcription once to the existing draft;
  sending the message remains explicit.

## Validation / Compatibility
- Validated by focused/adjacent repository tests and seven controlled Chrome
  journeys through actual run and Chat composers/native media/AudioWorklet.
- Synthetic microphone and fixture transcription do not certify real devices,
  official models or packaged desktop behavior.
- No schema migration, persisted-data reset or model/device policy change.
- Publication, if separately approved, must use the repository's documented
  release helper after finalization, with a new version/tag, never retag an
  existing release. A beta-only release does not deliver a fix to stable users.
