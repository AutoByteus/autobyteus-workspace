# Local-File Fetch Capability And Frame-Authorization Evidence

## Artifact Metadata

- Canonical path: `/Users/normy/autobyteus_org/autobyteus-worktrees/local-video-preview-playback/tickets/in-progress/local-video-preview-playback/fetch-capability-probe-evidence.md`
- Purpose: retain the Electron 42.4.1 capability differential and the security-boundary evidence needed to preserve PDF.js XHR and Excel Fetch without exposing local-file bytes to embedded or browser content frames.
- Scope: Electron custom-scheme privileges, HTTP/file renderer origins, `protocol.handle` observability, default-session `webRequest` frame identity, and the least-privilege request gate. It does not define additional user-visible behavior.
- Related behavior: `BEH-003`, `BEH-004`.
- Related requirements / acceptance criteria: `FR-001`, `FR-005`, `FR-006`, `FR-007` / `AC-007`, `AC-008`, `AC-009`.
- Status: `Complete — design evidence for CR-005 correction`.
- Approval applicability: `N/A` — this records runtime and source facts; the intended supported viewer behavior is already approved in `requirements.md`.

## Trigger

API/E2E round 3 ran the real shared-viewer journey after the fixed-authority and raw-legacy migration corrections. Image, audio, thumbnails, text, protocol, security, video, and viewer error/retry behavior passed. PDF.js reported response status `0`, and Excel's `authorizedFetch` reported `Failed to fetch`. Neither request reached `protocol.handle` while the scheme was registered with only `{ standard: true, stream: true }`.

This contradicted `BEH-004`, `FR-001`, `FR-006`, and `AC-008` while matching the reviewed design and implementation exactly. Code review therefore classified `CR-005` as `Design Impact` rather than a source or test defect.

## Retained Runtime Matrix

Runtime for every retained differential below: Electron `42.4.1`, Chromium `148.0.7778.265`, Node `24.16.0`, macOS arm64, sandboxed/context-isolated `BrowserWindow`, default Electron session.

| Privileges | Renderer origin | PDF Fetch | PDF XHR | Excel Fetch | Handler evidence | Conclusion |
| --- | --- | --- | --- | --- | --- | --- |
| `standard`, `stream`, `supportFetchAPI` | HTTP | Failed to fetch | status `0` / XHR error | Failed to fetch | no request | Fetch support alone is insufficient for the cross-protocol viewer requests. |
| `standard`, `stream`, `corsEnabled` | HTTP | Failed to fetch | `200`, exact `1,352` PDF bytes | Failed to fetch | PDF XHR only | CORS support admits PDF.js XHR but not Fetch API consumers. |
| `standard`, `stream`, `supportFetchAPI`, `corsEnabled` | HTTP | `200`, exact PDF bytes | `200`, exact PDF bytes | `200`, exact `16,235` XLSX bytes | all three exact `200` requests | Both additional privileges are necessary for the preserved top-frame consumers. |
| `standard`, `stream` | packaged-representative `file://` | Failed to fetch | status `0` / XHR error | Failed to fetch | no request | The failure is not specific to the development HTTP origin. |
| all four privileges | packaged-representative `file://` | `200`, exact PDF bytes | `200`, exact PDF bytes | `200`, exact XLSX bytes | all three exact `200` requests | The same exact capability set serves the packaged-origin representation. |

Canonical prior evidence:

- `api-e2e-evidence/round-3-fetch-privilege-fetch-only.json` — SHA-256 `d6e24453b97511c54b654779201731a944b44892dfb2f55dd5eb5c991ef2458a`
- `api-e2e-evidence/round-3-fetch-privilege-cors-only.json` — SHA-256 `efe9ed8ea14659e671e8c19fc31e699851e3d1b84e9b780642a925d76e052b13`
- `api-e2e-evidence/round-3-fetch-privilege-both.json` — SHA-256 `15504579613f6d79b53aaad8b611121cae6e190a00dcd2c0b3632ef639386776`
- `api-e2e-evidence/round-3-file-origin-base.json` — SHA-256 `bf151ab579cdb665cb1ceaaff2796fb2095df46bd7ca50b32de2ab0dc6308cd0`
- `api-e2e-evidence/round-3-file-origin-both.json` — SHA-256 `6fc18c9263a3681d76ecb9a7035b5cc88c8fc1cdf31df7f174c5deadd1243b8b`
- Corresponding `.log` files and `round-3-fetch-privilege-differential.cjs` are retained in the same evidence directory.

## Least-Privilege Investigation

### Current trust and session boundaries

- `WorkspaceShellWindow` runs the app shell with `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`; it cancels every `will-navigate` and denies every `window.open` request.
- The app shell uses Electron's default session, which owns the `local-file` handler.
- Browser tool `WebContentsView` instances use the separate `persist:autobyteus-browser` session. The default-session protocol handler is not installed there.
- The renderer already has the trusted top-frame `readLocalTextFile` bridge and File Explorer absolute-path routing. The approved boundary is therefore a trusted workspace-shell main frame, not arbitrary content within the default session.
- `HtmlPreviewer` intentionally executes workspace HTML inside a sandboxed child frame (`allow-scripts allow-same-origin`). That child is a normal product path and must not inherit raw local-file Fetch/XHR capability merely because it shares the shell's default session.

### Why the four privileges cannot be enabled without a request gate

A focused exact-version probe registered all four privileges and loaded top-frame HTTP, foreign-HTTP child-frame, same-origin Blob child-frame, and top-frame `file://` requests.

In the ungated mode:

- top-frame HTTP Fetch and XHR succeeded;
- foreign-HTTP child-frame Fetch succeeded;
- same-origin sandboxed Blob child-frame Fetch succeeded;
- top-frame `file://` Fetch and XHR succeeded;
- every request reached `protocol.handle` and received bytes.

The `Request` delivered to `protocol.handle` contained only `accept` and `user-agent` in this probe. It did **not** retain `Origin`, `Referer`, or `Sec-Fetch-*` identity. A handler-only origin/frame allowlist is therefore not implementable against the actual Electron 42.4.1 handler contract.

Evidence:

- `api-e2e-evidence/solution-design-fetch-origin-probe.cjs` — SHA-256 `f93bf1251427c69720288a296e861b4bd8b5a23f0ff06c31ebd6854572a0a703`
- `api-e2e-evidence/solution-design-fetch-origin-ungated-result.json` — SHA-256 `f9d8d048fe3d660506fd0d6697a19da855732cb62008b93bf9be28dc9ffbdf14`
- `api-e2e-evidence/solution-design-fetch-origin-ungated-probe.log`

### Main-frame gate differential

Electron default-session `webRequest.onBeforeRequest` retains both `webContentsId` and the requesting `WebFrameMain`. The probe's gated mode allowed a request only when both identified the registered shell's exact `webContents.mainFrame` object.

Observed result:

- top-frame HTTP Fetch and XHR still returned `200` and exact bytes;
- top-frame `file://` Fetch and XHR still returned `200` and exact bytes;
- the foreign-HTTP child frame and same-origin Blob child frame both received `TypeError: Failed to fetch`;
- the two canceled child requests did not reach `protocol.handle` and received no response bytes.

Evidence:

- `api-e2e-evidence/solution-design-fetch-origin-gated-result.json` — SHA-256 `4f247087f949ece9b144e5a911c054d44d7919a265043031df4d814507e8bbfe`
- `api-e2e-evidence/solution-design-fetch-origin-gated-probe.log`

This is a pre-handler authorization boundary. It complements, rather than replaces, the canonical URL parser and `validateReadableRegularFile`; an allowed top-frame request still must satisfy method, URL, absolute-path, regular-file, readability, range, and response policy before bytes are returned.

## External / Upstream Evidence

- Electron protocol documentation: `https://www.electronjs.org/docs/latest/api/protocol` — `registerSchemesAsPrivileged` is pre-ready and one-time; standard schemes use generic URI syntax; streaming media requires `stream: true`; `protocol.handle` is post-ready/session-bound.
- Electron `CustomScheme` structure: `https://www.electronjs.org/docs/latest/api/structures/custom-scheme` — `supportFetchAPI` and `corsEnabled` are independent, default-false privileges.
- Electron `WebRequest`: `https://www.electronjs.org/docs/latest/api/web-request` — `onBeforeRequest` exposes optional `webContentsId` and requesting `WebFrameMain`, can cancel before completion, and only the last attached listener is used.
- Electron release PR `#51270`: `https://releases.electronjs.org/pr/51270` — Electron deliberately blocks cross-protocol Fetch/XHR unless the applicable Fetch/CORS privileges are enabled; the behavior was released in the 41.x line inherited by Electron 42.4.1.
- Electron security guidance: `https://www.electronjs.org/docs/latest/tutorial/security` — retain context isolation, sandboxing, `webSecurity`, navigation/window restrictions, custom-protocol control, and narrow privileged exposure.

## Decision And Rejected Alternatives

### Selected design

Register exactly:

```ts
{
  standard: true,
  stream: true,
  supportFetchAPI: true,
  corsEnabled: true,
}
```

Do not enable `secure`, `bypassCSP`, `allowServiceWorkers`, `codeCache`, `allowExtensions`, or disable `webSecurity`.

At post-ready installation, register one default-session `webRequest.onBeforeRequest` filter for `local-file://*/*` before installing `protocol.handle`. Allow only requests whose `webContentsId` belongs to a live `WorkspaceShellWindow` **and** whose `frame` is that shell's exact main frame. Cancel absent/destroyed/unregistered/subframe requests. Only allowed requests reach the existing parser/validator/response owner.

### Alternatives not selected

- **Enable both new privileges without a gate:** rejected; the retained ungated probe proves ordinary HTTP and same-origin Blob child frames receive bytes.
- **Check `Origin`/`Referer`/`Sec-Fetch-*` inside `protocol.handle`:** rejected; those headers are absent at the real handler boundary.
- **Add a PDF/Excel binary IPC or Blob transport:** rejected; it duplicates byte delivery and whole-file transfer while granting the same trusted top renderer path-addressed read authority. The reviewed protocol already owns validation/MIME/bytes and can serve both viewers.
- **Mint renderer-requested per-path tokens:** rejected for this bug fix; a token minted from a path supplied by the same trusted top frame does not reduce that frame's authority, but it complicates persistent canonical locators, migration, range requests, and retry lifecycle.
- **Use `file://`, disable `webSecurity`, or add CSP bypass:** rejected; these broaden authority and conflict with Electron security guidance.
- **Use only one of `supportFetchAPI` or `corsEnabled`:** rejected by the exact-version differential.

## Required Downstream Assertions

1. Lifecycle unit coverage asserts the exact four privileges and absence of every unneeded privilege.
2. Protocol installation coverage asserts the one filtered `webRequest` authorization listener precedes the handler and cancels missing/unregistered/non-main-frame requests, including main-process `net.fetch` with no renderer-frame identity.
3. Registry/authorization coverage proves exact main-frame object identity, including a same-`webContentsId` subframe rejection.
4. `E2E-REG-001` runs first after source review and proves real `PdfViewer`/PDF.js XHR plus `ExcelViewer` Fetch from representative HTTP and packaged `file://` shell origins reach the handler and render/parse expected content.
5. `E2E-SEC-001` proves foreign-HTTP and same-origin Blob/HTML-preview child-frame requests fail before the handler with zero bytes.
6. E2E-PROTO-001 moves its realistic method/range matrix from main-process `net.fetch` to the authorized shell main frame, while direct response-owner unit tests retain deterministic branch coverage and a separate realistic assertion proves identity-less main-process `net.fetch` is canceled. All six retained scenarios then rerun to prove video, range, UI, migration, thumbnails, image, audio, text, and cleanup behavior remains intact.

## Residual Risk

- Electron reports `frame` may be `null` after navigation or destruction. The safe contract is fail closed; realistic PDF/Excel execution must prove their current requests retain the registered main-frame identity.
- The trusted workspace-shell main frame remains able to request a validated absolute path it knows, consistent with the existing File Explorer and text-IPC trust model. This change does not add enumeration, write, Node, shell, arbitrary IPC, browser-partition, child-frame, service-worker, or CSP-bypass authority.
- Electron permits only one listener per `webRequest` event. The local-file protocol owner must be the sole `onBeforeRequest` owner on the default session for this filtered boundary; future code must compose through that owner rather than overwrite it.
