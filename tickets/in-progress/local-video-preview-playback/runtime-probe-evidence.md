# Runtime Probe Evidence — Local Video Preview Playback

## Status And Applicability

- Status: `Complete`
- Purpose: Preserve the decisive runtime evidence for the reported file, Electron custom-scheme failure, privilege contract, playback, and byte-range seeking.
- Scope: Investigation evidence only; this artifact does not define intended behavior.
- Approval applicability: `N/A`
- Core artifacts supported: `requirements.md`, `investigation-notes.md`, and the future `design-spec.md`

## Runtime And Source Identity

- Running packaged app: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-idle-status-lifecycle/autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`
- Electron version: `42.4.1`
- Running source commit: `af78a9307611f58c383ea5b5c9d8dd727deeb918`
- Refreshed task base: `origin/personal` at `dbc83fdb51c1e158b5707c219dd8574dc49fa493`
- Relevant handler is identical between the running source and task base.
- Probes launched separate hidden Electron windows with isolated `/tmp` user-data directories. They did not restart, mutate, or attach DevTools to the user's running app.

## Reported File Verification

File:

`/Users/normy/autobyteus_org/autobyteus-tutorial-videos/multi-nodes-part-2_youtube_smaller.mp4`

Evidence:

- Size: `13,620,424` bytes
- SHA-256: `613f4d1d30ec233044e32eb752619f20a2c211319131cd4030cf3d813b76938c`
- Container: ISO Base Media / MP4
- Video: H.264 High Profile, `avc1`, `1920x1246`, `yuv420p`, 30 fps
- Duration: `330.533333` seconds
- Audio: none
- Atom order: `ftyp`, `moov`, then `mdat` (fast-start layout)
- `ffmpeg -v error -ss 00:00:10 -i <file> -frames:v 1 -f null -` completed without a decode error.

Conclusion: The reported failure is not caused by a corrupt file, absent file, unsupported pixel format, or missing fast-start metadata.

## Current-Behavior Electron Probe

Probe shape mirrored current `electron/main.ts` behavior:

1. Register a `protocol.handle` handler only after ready.
2. Do not call `protocol.registerSchemesAsPrivileged`.
3. Validate/resolve the file and return `net.fetch(fileUrl)`.
4. Load the resulting custom URL in a sandboxed Electron 42.4.1 `<video preload="auto">`.

Observed request:

```text
Range: bytes=0-
```

Observed handler response:

```text
status: 200
content-type: video/mp4
no content-length, content-range, or accept-ranges header
```

Observed media result:

```json
{"event":"error","readyState":0,"networkState":3,"duration":"NaN","currentTime":0,"error":{"code":4,"message":""}}
```

This exactly matches the screenshot's black native controls at `0:00`.

## Scheme Privilege Differential Probe

The same handler and same file were rerun with:

```ts
protocol.registerSchemesAsPrivileged([
  { scheme: 'local-probe', privileges: { stream: true } },
])
```

Observed:

```json
{"event":"loadedmetadata","readyState":1,"duration":330.533333,"currentTime":0,"error":null}
{"event":"canplay","readyState":4,"duration":330.533333,"currentTime":0,"error":null}
```

This proves the missing Electron streaming privilege is the direct cause of the `0:00` load failure.

However, the handler still discarded `Range: bytes=0-` and returned an ordinary `200`. Playback from the start succeeded, but assigning `currentTime = 120` reset the position to `0`. Streaming privilege alone is therefore insufficient for normal seek behavior.

## Byte-Range And Seek Probe

The probe then used a standard streaming scheme plus a validated, MIME-correct, cancel-safe byte stream:

```ts
privileges: { standard: true, stream: true }
```

For `Range: bytes=0-`, the response supplied:

```text
206 Partial Content
Accept-Ranges: bytes
Content-Range: bytes 0-13620423/13620424
Content-Length: 13620424
Content-Type: video/mp4
```

Observed on the reported file:

```json
{"event":"loadedmetadata","duration":330.533333,"currentTime":0,"error":null}
{"event":"play-resolved","duration":330.533333,"currentTime":0.000431,"error":null}
{"event":"seeking","duration":330.533333,"currentTime":120,"error":null}
{"event":"seeked","duration":330.533333,"currentTime":120.000133,"error":null}
{"event":"play-after-seek-success","duration":330.533333,"currentTime":120.531127,"error":null}
```

## Large-File Cancellation/Range Probe

Representative local MP4:

- Path: `/Users/normy/autobyteus_org/autobyteus-tutorial-videos/autobyteus_software_engineering_team_combined_no_audio.mp4`
- Size: `607,568,129` bytes
- Duration: `2063.066667` seconds

After initial metadata loading, the probe sought to 1800 seconds. Chromium cancelled the initial stream after approximately 1 MiB and issued:

```text
Range: bytes=525303808-
```

With `standard: true`, `stream: true`, correct `206` headers, and a byte-oriented stream whose cancel path closes the file handle, Electron emitted `seeked` at 1800 seconds with no media error.

A generic `Readable.toWeb(fs.createReadStream(...))` response failed the same cancellation/seek with `PIPELINE_ERROR_READ`; the implementation must therefore use a byte-oriented, cancellation-safe stream and verify file-handle cleanup.

## Official Contract Evidence

Electron's official protocol documentation states:

- `protocol.registerSchemesAsPrivileged` must run before the app ready event and may be called only once.
- `stream` defaults to false.
- `<video>` and `<audio>` require `stream: true` for protocols that return streaming responses.
- Standard schemes use generic URI semantics; the successful large-seek probe showed `standard: true` is also necessary for the expected range/cancellation behavior of this design.

Primary source: [Electron protocol API](https://www.electronjs.org/docs/latest/api/protocol/)

## Decisive Conclusion

The application defect is in the Electron local-file protocol contract, not in the user's video. The current production path omits required pre-ready scheme registration and drops media range semantics. Correcting both makes the exact file load, play, and seek under Electron 42.4.1.
