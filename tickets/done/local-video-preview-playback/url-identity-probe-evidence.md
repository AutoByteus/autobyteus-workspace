# URL Identity Probe Evidence — Electron Local Video Rework

## Status And Applicability

- Status: `Complete — handler-observable adornment conclusion corrected after architecture round 2`
- Trigger: API/E2E failure-origin finding `CR-001` / material premise `MP-CR-001` (`Reachable`)
- Purpose: Retain the exact Electron 42.4.1 renderer URL, normalized media URL, handler URL, response, playback, and seek evidence needed to revise the local-file URL/privilege contract.
- Scope: Investigation evidence only. The approved user behavior is unchanged; the target technical decision remains authoritative in `design-spec.md`.
- Approval applicability: `N/A`
- Core artifacts supported: `requirements.md`, `investigation-notes.md`, and `design-spec.md`

## Failure That Reopened Design

The reviewed implementation registered:

```ts
privileges: { standard: true, stream: true }
```

while preserving this renderer URL shape:

```text
local-file:///Users/normy/.../multi-nodes-part-2_youtube_smaller.mp4
```

The original Node-side URL parse reports an empty hostname and pathname `/Users/...`, but the registered standard scheme changes the media element's resolved `src` and the handler request to:

```text
local-file://users/normy/.../multi-nodes-part-2_youtube_smaller.mp4
```

The first POSIX segment becomes a lowercased authority. The reviewed decoder correctly rejected multi-character authorities, so the supported file returned `404` before method, validation, range, MIME, or stream planning. Reinterpreting arbitrary authorities as path segments is not a valid fix: `Users` has already become `users`, which cannot preserve identity on a case-sensitive POSIX filesystem.

Authoritative failure evidence retained by API/E2E:

- `api-e2e-evidence/electron-failure-origin-result.json`
- `api-e2e-evidence/electron-failure-origin-probe.log`
- `api-e2e-evidence/electron-probe-result.json`
- `api-e2e-evidence/electron-probe.log`

## Differential Probe Setup

- Runtime: Electron `42.4.1`, Chromium `148.0.7778.265`, Node `24.16.0`, macOS arm64.
- Renderer surface: hidden sandboxed `BrowserWindow` loaded from an owned loopback HTTP page; no user profile or running app was changed.
- Response implementation: exact transpiled implementation at commit `f60718a63d8551bb31bc26913a3154dc0614bc95` for MIME, range, status/header, and file-byte streaming.
- Files:
  - exact reported 13,620,424-byte MP4;
  - a hardlink to the exact MP4 under a mixed-case path containing a space, `Ü`, `%`, and `#`;
  - the 607,568,129-byte representative large MP4;
  - a 10-byte binary fixture under a mixed-case, Unicode, space, `%`, and `#` path for the response matrix.
- Each privilege mode used a separate Electron process and isolated `userData`.
- Temporary files/user data were removed after the raw results and scripts were promoted to the task evidence directory.

## Probe 1 — Standard + Stream With Old Triple-Slash Shape

Privileges:

```json
{ "standard": true, "stream": true }
```

Exact-file witness:

| Observation Point | Value |
| --- | --- |
| Authored attribute | `local-file:///Users/normy/.../multi-nodes-part-2_youtube_smaller.mp4` |
| Media `src` property before load | `local-file://users/normy/.../multi-nodes-part-2_youtube_smaller.mp4` |
| Handler request | `local-file://users/normy/.../multi-nodes-part-2_youtube_smaller.mp4` |
| Handler hostname/pathname | `users` / `/normy/...` |
| Response | `404`, no bytes |
| Media result | code `4`, duration `NaN` |

The URL-significant mixed-case file produced the same first-segment authority rewrite. Inner encoded segments remained encoded, but the lost first-segment case/placement made the absolute path unrecoverable.

Result: `Fail`.

Raw result: `api-e2e-evidence/solution-design-standard-old-url-result.json`.

## Probe 2 — Stream Only With Old Opaque Shape

Privileges:

```json
{ "stream": true }
```

Observed identity:

- Authored attribute, media `src`, `currentSrc`, and handler URL all remained exactly `local-file:///Users/...`.
- The mixed-case/space/Unicode/percent/hash path also remained byte-for-byte equivalent at every URL observation point.

Observed behavior:

- Exact file: `206 bytes 0-13620423/13620424`; duration `330.533333`; playback advanced; seek to `120` completed and playback continued.
- URL-significant exact-file hardlink: the same success and duration.
- Large file: initial `206 bytes 0-607568128/607568129`; Chromium later requested `bytes=525303808-` and received a correct `206`, but the media pipeline emitted code `2`, `PIPELINE_ERROR_READ`, instead of completing the seek to `1800`.

Result: `Insufficient`. Removing `standard` preserves the old URL identity and works for the reported 13 MB file, but it does not satisfy approved large-file seek behavior under the exact runtime/response implementation.

Raw result: `api-e2e-evidence/solution-design-stream-only-result.json`.

## Probe 3 — Standard + Stream With A Fixed Authority

Candidate URL contract:

```text
local-file://local/<case-preserving encoded absolute path>
```

Examples:

```text
POSIX:   local-file://local/Users/normy/Case%20%C3%9C%25%23/video.mp4
Windows: local-file://local/C:/Users/Name/video.mp4
```

The authority is a constant lowercase protocol marker, not a filesystem segment. The complete absolute path begins in `pathname`.

Observed identity for the exact file:

| Observation Point | Value |
| --- | --- |
| Authored attribute | `local-file://local/Users/normy/.../multi-nodes-part-2_youtube_smaller.mp4` |
| Media `src` property | same |
| `currentSrc` | same |
| Handler request | same |
| Handler hostname/pathname | `local` / `/Users/normy/...` |

The mixed-case/space/Unicode/percent/hash path also remained identical through the renderer and handler, including uppercase `Users` and the percent-encoded path segments.

Observed behavior using the existing range/MIME/stream implementation:

- Exact file: duration `330.533333`; playback advanced; seek to `120` completed; playback continued.
- URL-significant exact-file hardlink: same success.
- Large file: initial `206`; later request `bytes=525303808-`; seek to `1800` completed; playback continued to approximately `1800.45`; no media error.

Result: `Pass`.

Raw result: `api-e2e-evidence/solution-design-fixed-authority-result.json`.

### Probe-Only Adapter Disclosure

To isolate URL identity without editing implementation source during solution redesign, the fixed-authority handler verified `hostname === "local"`, then created a probe-only triple-slash `Request` from the unchanged encoded pathname before calling the exact transpiled response implementation. This adapter exists only in the retained probe. The target implementation must decode the fixed authority/pathname directly and must not retain old-shape compatibility or a runtime translation layer.

## Fixed-Authority Response/Security Matrix

The same fixed authority was exercised through real Electron `net.fetch` with a significant-character 10-byte file:

| Scenario | Result |
| --- | --- |
| Full GET | `200`, exact 10 bytes, correct length/MIME/range/no-store headers |
| `bytes=2-5` | `206`, exact `02030405`, `Content-Range: bytes 2-5/10` |
| `bytes=-3` | `206`, exact `070809`, `Content-Range: bytes 7-9/10` |
| HEAD | `200`, full headers, zero body bytes |
| POST | `405`, `Allow: GET, HEAD`, zero bytes |
| Multi-range | `416`, `Content-Range: bytes */10`, zero bytes |
| Unsatisfiable range | `416`, `Content-Range: bytes */10`, zero bytes |
| Wrong authority `relative` | `404`, zero bytes |
| Missing file | `404`, zero bytes |
| Directory | `404`, zero bytes |

Every valid handler URL retained authority `local`, uppercase `/Users`, and the encoded significant pathname. Raw result: `api-e2e-evidence/solution-design-fixed-authority-matrix-result.json`.

### Matrix Limitation

This matrix tested fixed/wrong authority, methods, ranges, missing paths, and directories through Electron `net.fetch`; it did not test raw authored credentials, ports, query, or fragment. Architecture round 2 correctly rejected the earlier inference that the handler parser could enforce every authored adornment.

## Authored Attribute To Handler Normalization Matrix

A follow-up exact Electron 42.4.1 probe registered `{ standard: true, stream: true }`, assigned each raw locator to a renderer `<img>`, and retained the authored attribute, resolved property/current source, and `protocol.handle` request:

| Authored Locator Shape | Resolved Media Property | Handler Observation | Enforceable Boundary Conclusion |
| --- | --- | --- | --- |
| `local-file://local/Users/Normy/...` | Unchanged | Unchanged; hostname `local` | Canonical current identity. |
| `local-file://local:99/Users/Normy/...` | Port erased | Canonical URL; `port === ''` | Handler cannot distinguish authored port. Raw supported locator ingress can reject before DOM assignment. |
| `local-file://user:pass@local/Users/Normy/...` | Credentials erased | Canonical URL; username/password empty | Handler cannot distinguish authored credentials. Raw supported locator ingress can reject before DOM assignment. |
| `local-file://LOCAL/Users/Normy/...` | Host lowercased | Canonical lowercase authority | Handler contract is against normalized hostname; current builders emit lowercase. |
| `local-file://local/Users/Normy/...?...` | Query retained | `search` retained | Handler can reject query. |
| `local-file://local/Users/Normy/...#...` | Fragment retained | `hash` retained | Handler can reject fragment. |
| `local-file://wrong/Users/Normy/...` | Wrong host retained | hostname `wrong` | Handler can reject wrong authority. |
| Legacy `local-file:///Users/Normy/...` | First segment promoted/lowercased | hostname `users` | Must transition before DOM assignment; handler cannot recover. |
| Legacy `local-file://C:/Media/...` | Drive host lowercased and colon erased | hostname `c` | Must transition from the raw locator before DOM assignment. |

This corrects the technical contract without weakening filesystem authorization. If a manually authored port/credential locator bypasses all product owners, Electron presents the handler with the same canonical URL; it still must pass strict current parsing and `validateReadableRegularFile` before bytes are returned.

Raw evidence:

- `api-e2e-evidence/solution-design-authored-url-normalization-probe.cjs`
- `api-e2e-evidence/solution-design-authored-url-normalization-result.json`
- `api-e2e-evidence/solution-design-authored-url-normalization-probe.log`

## Decisive Technical Conclusion

The target contract must retain `{ standard: true, stream: true }` for correct large-file seek/cancellation behavior and replace the ambiguous triple-slash standard URL with an explicit fixed authority:

```text
local-file://local/<encoded absolute path>
```

The builder must put the complete case-preserving absolute path in `pathname`. The current URL parser, when used on the normalized handler `Request`, must:

1. require scheme `local-file:`;
2. require normalized authority `local`;
3. reject handler-observable query and fragment (and defensively reject credentials/port if a direct non-Electron caller supplies them, without claiming it can detect values Electron erased);
4. decode `pathname` once;
5. on Windows only, require `/C:/...` and remove its URL-leading slash;
6. pass the result unchanged to `validateReadableRegularFile`.

Supported raw context-locator ingress must inspect the authored locator before DOM assignment: canonical inputs stay canonical; valid legacy empty-authority POSIX and drive-authority Windows paths transition through the current builder; raw credentials/port/query/fragment and wrong/opaque authorities are ineligible for preview/open presentation. The Electron handler must not accept old forms, reinterpret arbitrary hostnames as POSIX root segments, or add a fallback transport.

## Retained Raw Evidence

- `api-e2e-evidence/solution-design-url-identity-probe.cjs`
- `api-e2e-evidence/solution-design-fixed-authority-matrix-probe.cjs`
- `api-e2e-evidence/solution-design-standard-old-url-result.json`
- `api-e2e-evidence/solution-design-stream-only-result.json`
- `api-e2e-evidence/solution-design-fixed-authority-result.json`
- `api-e2e-evidence/solution-design-fixed-authority-matrix-result.json`
- `api-e2e-evidence/solution-design-authored-url-normalization-probe.cjs`
- `api-e2e-evidence/solution-design-authored-url-normalization-result.json`
- `api-e2e-evidence/solution-design-authored-url-normalization-probe.log`
- `api-e2e-evidence/solution-design-url-identity-sha256.txt`
