# Proposed Design

Status: Complete

## Data-Flow Spine

1. `AutobyteusClient` receives a normal conversation payload or image generation input.
2. Current-message media arrays are normalized by media type.
3. `normalizeMediaSource` trims invalid items, passes through `media://...`, estimates source size without downloading full bytes, and compares against type thresholds.
4. Small or unknown-size local/data media keeps existing `mediaSourceToDataUri` behavior.
5. Above-threshold media is streamed to `POST /media/stage`.
6. The staging response `media_uri` replaces the original media source in the request payload.
7. `/send-message`, `/stream-message`, `/generate-image`, and downstream RPA services keep receiving string arrays.

## Ownership

- `AutobyteusClient` owns transport normalization, threshold decisions, and staging requests.
- `media-payload-formatter` remains the existing data URI utility for inline media.
- RPA server owns storing and resolving staged media bytes.
- Web/server context-file layers remain unchanged for this ticket.

## Thresholds

- `image`: 10 MiB
- `audio`: 50 MiB
- `video`: 25 MiB

Environment overrides:
- `AUTOBYTEUS_INLINE_IMAGE_MAX_BYTES`
- `AUTOBYTEUS_INLINE_AUDIO_MAX_BYTES`
- `AUTOBYTEUS_INLINE_VIDEO_MAX_BYTES`

## Off-Spine Concerns

- Abort propagation: staging and final request should use the request `AbortSignal` when available.
- MIME naming: local filenames and remote response headers provide best-effort content type and filename headers for staging.
- Remote URLs with known large `content-length`, missing `content-length`, or failed `HEAD` checks are staged by streaming from the remote URL to the RPA staging endpoint.
- Raw base64 and data URI media can be staged when above threshold, but this does not fix memory already spent by the caller constructing that string.

## Separation Of Concerns

The workspace client does not decide where staged bytes live on disk. It only chooses inline versus stage and sends byte streams to the RPA endpoint.
