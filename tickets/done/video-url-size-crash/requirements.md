# Large Media Staging Requirements

Status: Design-ready

## User Intent

Avoid Electron/workspace crashes when large media attachments are sent to the RPA LLM server by staging large media bytes through the RPA server and sending lightweight `media://...` references in normal message payloads.

## Acceptance Criteria

- Keep existing message/media contracts: `image_urls`, `audio_urls`, and `video_urls` remain arrays of strings.
- Continue inlining small media as data URIs for backward compatibility.
- Stage media sources above these default thresholds before `/send-message`, `/stream-message`, and image generation inputs:
  - image: 10 MiB
  - audio: 50 MiB
  - video: 25 MiB
- Use the RPA server `POST /media/stage` endpoint and replace staged sources with returned `media://...` URIs.
- Stage remote HTTP(S) media when size cannot be proven below the inline threshold.
- Do not introduce an `rpa-media://...` scheme.
- Pass through existing `media://...` URIs unchanged.
- Preserve empty-content user messages with only media attachments.
- Avoid loading large local files into memory before the staging request.
- Add unit coverage proving above-threshold media is staged and below-threshold media remains data URI normalized.

## Out Of Scope

- Redesigning web context-file upload UI.
- Changing Gemini UI/App file-size support.
- Replacing all existing data URI conversion utilities.
