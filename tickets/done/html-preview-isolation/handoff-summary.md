# Handoff Summary: html-preview-isolation (autobyteus-417)

- Status: verified from the evidence (audited, not redone; DR-001). Archived and finalized on `personal`. **No release**: the Task says "release only on the user's word", and the release guide's default is no release. A beta or stable release is available on request; this ticket's `release-notes.md` is ready for it, including a `## What you need to do` section for a beta.
- Classification: `task_size=Small`, `architectural_risk=High`, reviewed route. Architecture review ARCH-REV-001 Pass. Implementation IR-001. Source review CRR-001 Pass. API/E2E API-REV-001 Pass at 95.4% (target 95%; no category below 90%). Test-code review CRR-002 `Not Applicable`: no repository test code changed after API/E2E.
- Solution revision: SR-004 (evidence-only rewording of BEH-005 / REQ-004 / AC-004; FU-003).

## What Changed

- Source `cdba18ba35`:
  - `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue`: the preview iframe is `sandbox="allow-scripts"` (no `allow-same-origin`), for both the workspace static URL and the Blob preview. The Blob holds the content only; the `<base href="<app origin>/">` is removed.
  - `autobyteus-server-ts/src/api/rest/workspaces.ts`: the workspace static route sends `Content-Security-Policy: sandbox allow-scripts` on every file it serves. Error replies and `/content` are unchanged.
  - Tests: `HtmlPreviewer.spec.ts` (attribute, Blob bytes) and `tests/unit/api/rest/workspaces.test.ts` (header on served files, none on errors or `/content`). They fail on the base (IMP-04).
  - Docs: `autobyteus-web/docs/file_explorer.md`, `content_rendering.md`.
- Delivery: `autobyteus-server-ts/docs/modules/workspaces.md` gets the server-side invariant (`docs-sync-report.md`).
- Effect: every HTML preview runs with an opaque origin (`null`). It cannot reach the app window, the preload API, app storage or the phone credential. The node refuses its WebSocket and API requests (`Origin: null`, autobyteus-403's gate). Approved losses (DEC-001, option A): relative module scripts, fetch/XHR of workspace files, workspace web fonts, Web Workers, browser storage and cookies.

## Integration

- Bootstrap base `ff68bfb5fa`. Delivery first committed the uncommitted ticket documents as a checkpoint (`b3aeb1cced`: SR-004 edits and the code reviewer's CRR-001/002 documents). It then merged the latest `origin/personal` `c35d9dea11` into the ticket branch as `1d8ecc9a79`, with no conflicts. The base brought `c5c4bc8e4a` (web `package.json` version 1.5.12-beta.6) and `c35d9dea11` (autobyteus-419 delivery docs); neither overlaps this ticket's files.
- One relevant check on the merged state (DEL-01, `evidence/delivery/DEL-01-merged-state-checks.log`): `HtmlPreviewer.spec.ts` → `Tests 4 passed (4)`; `tests/unit/api/rest/workspaces.test.ts` → `Tests 7 passed (7)`.

## Verification (audit of the evidence)

- AC-001 (no `allow-same-origin`): IMP-02 `Tests 4 passed (4)`; the real DOM has `"sandbox": "allow-scripts"` on every preview iframe in API-10, API-11, API-13 and API-15.
- AC-002 (desktop: origin `null`; window, preload and storage throw; no IPC): API-10 (Files) has `"origin": "null"`, `"parent-document"`, `"parent-electronAPI"`, `"parent-electronAPI-call"` and `"localStorage"` all `blocked: SecurityError`, and `"own-electronAPI": "undefined"`, while the app window has `"electronAPI": "object"`. API-11 (Artifacts, `blob:file:///…`) shows the same.
- AC-003 (node refuses): API-10 node log `REMOTE_ACCESS_ORIGIN_REFUSED /ws/terminal/hostile-ws… origin null`, three `/graphql origin null`; the GET mutation answered `405`. `"markers": []`, `"hostileDefinitions": []`. API-11 and API-15 show the same. API-12 control from an allowed client opened the WS, created the marker and got `200`, so the detectors work. API-06 server E2E `Tests 7 passed (7)`.
- AC-004 (renders; refresh): API-10 `"inline-script"` and `"classic-script": "ran"`, `"css": "rgb(255, 0, 0)"`, `"img-relative": "loaded 3x3"`, `"other-site-script": "ran"`. API-13 (a): the artifact went to `ART-V2` with a new Blob URL. API-13 (b): the workspace preview showed `WS-V2` and `WS-V3` without user action and `WS-V4` after reopening; the screenshot `API-13b-2-workspace-10s-after-change.png` shows "WS-V2".
- AC-005 (static route sandboxes): API-14 headers `content-security-policy: sandbox allow-scripts` on HTML, JS, CSS and PNG; none on the 404 and `/content`. Opened top-level: `"origin": "null"`, `"localStorage": "blocked: SecurityError"`. IMP-03 `Tests 7 passed (7)`.
- AC-006 (phone): API-15 credential `present` at `http://192.168.2.158:50113`; preview `blob:http://192.168.2.158:50113/…`, `"origin": "null"`, `"parent-localStorage-phone-credential": "blocked: SecurityError"`, `"credentialStillStoredAfterPreview": true`, `"pageErrors": []`.
- AC-007 (approved losses, docs, release notes): API-10 `"module-script": "did-not-run"`, `"fetch-relative-json": "failed: TypeError"`, `"font-relative": "not loaded (WsFont:error)"`, `"worker"` / `localStorage` / `sessionStorage` / `indexedDB` / `cookie` `blocked: SecurityError`. API-16 shows the docs state exactly these. `release-notes.md` states them (delivery).
- AC-008 (application iframes and other viewers unchanged): IMP-05 `Test Files 46 passed (46)`, `Tests 295 passed (295)`.
- No user check needed: every criterion is proven on the real desktop app, the real node and the phone web app. Nothing was marked for the user.

## Note for the Solution Designer (not a delivery blocker)

- API-13 measured that the workspace preview **does** reload when the open file changes. The file watcher calls `invalidateFileContent`; `FileViewer` shows its loading state, which remounts `HtmlPreviewer`. That contradicts the premise of R-3 / SR-004 / FU-003. AC-004 as reworded is met, and exceeded.
- API/E2E recommends withdrawing FU-003 and restoring BEH-005's original wording before the follow-ups leave the team. That is the Solution Designer's decision; delivery did not change `follow-ups.md` or the requirements.

## Residual

- SCN-003 (a local absolute-path HTML file) and the team/collaboration reference viewers were not driven as their own journeys. They use the same `HtmlPreviewer` Blob branch as API-11.
- The phone was tested as Chrome mobile emulation, not on iOS Safari or an Android WebView (the same sandbox standard).
- Real-browser enforcement has no durable repository probe; durable coverage is the unit test and the server E2E.
- The node logs one `REMOTE_ACCESS_ORIGIN_REFUSED … origin null` line for each refused preview request (module, fetch, font) on every load. This was accepted in the design.
- Follow-ups FU-001 (loopback origins, urgent), FU-002 (other file routes serve HTML at the node's origin, urgent) and FU-003 (see the note above) are in `follow-ups.md`.

## Release

- None. The change ships in the next release the user asks for.
