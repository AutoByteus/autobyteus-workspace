# Implementation Handoff — html-preview-isolation (autobyteus-417)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: architecture review selected (Small / High); `Pass`, ARCH-REV-001 on SR-003, no findings. Handoff rule applied now: "implementation is complete and the carried classification is … architectural_risk=High … ready for independent source review" → `/software_engineering_team/code_reviewer`.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/`
- Requirements doc: `requirements-doc.md` (Approved, baseline SR-002; SR-003 wording)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-003, `Ready`)
- Supplemental task artifacts: `evidence/preview-probe/` (reproduction; evidence only)
- Design review report: `design-review-report.md`
- Architecture review revision record: `architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)

## Current Implementation Summary

Previews now run with an opaque origin on both source paths, and the workspace static route sandboxes every file it serves:

- `HtmlPreviewer.vue`: the iframe has `sandbox="allow-scripts"` (was `allow-scripts allow-same-origin`). `buildBlobUrl` makes the Blob from `props.content` only; `baseUrl` and the `<base href="${window.location.origin}/">` prefix are removed.
- `api/rest/workspaces.ts`: new module constant `PREVIEW_DOCUMENT_SANDBOX = "sandbox allow-scripts"`. The static route sets `Content-Security-Policy` to it on the successful file reply only, just before `reply.type(...)`/`reply.send(stream)`. The 400/404/500 JSON replies, `/content` and every other route are unchanged; no global hook.
- Tests updated/added in the two existing spec files; `docs/file_explorer.md` (HTML Preview Resource Contract) and `docs/content_rendering.md` (HTML Preview Source Selection) state the isolation, the header, and what previewed pages can and cannot do.

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Code commit: `cdba18ba35` on `codex/html-preview-isolation` (worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`), parent `ff68bfb5fa`. Ticket documents and evidence in the following commit (see the handoff message).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk; confirmed in `design-review-report.md` § Routing Classification Review
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: the delta is the two production files the design names (`HtmlPreviewer.vue` 7 changed lines, `workspaces.ts` +5 lines), their two spec files and two docs. No new owner, file, API, route or persistence (Small). It changes a security boundary: what previewed content may do and a new response header on a node route (High). None of the design's escalation triggers fired: no preview surface outside `HtmlPreviewer` (only `HtmlPreviewer.vue` and `ApplicationIframeHost.vue` render iframes); the CSP header did not break any non-HTML file the preview loads (CSS, classic JS, PNG all load with it, IMP-08); no change to the Origin rule or the Electron shell was needed.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable` (High route)
- New design impact or escalation trigger: `None`. One basis question, R-3, is reported to the Solution Designer: see Known Risks. It does not block code review.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Workspace preview opaque; node refuses its requests; inline/classic scripts, CSS, images, CDN work | DS-001: `FileViewer` → `HtmlPreviewer.vue` (static URL, `sandbox="allow-scripts"`) → `workspaces.ts` static route (file + `Content-Security-Policy: sandbox allow-scripts`) | IMP-08 (real route code, Electron 42.4.1 and 42.11.16): origin `null`; inline, relative classic, other-site scripts ran; relative CSS applied; relative image `loaded 3x3`; module script `did-not-run`; `fetch` `failed: TypeError`; module/fetch GETs carry `origin=null`; `localStorage`, `parent.document`, `parent.electronAPI` blocked. Node refusal of `Origin: null` (403 gate) not exercised here: AC-003 is API/E2E's |
| BEH-002 | Blob preview opaque; window, preload, storage, node refused | DS-002: `HtmlPreviewer.vue` `buildBlobUrl` (Blob = content only) + same iframe | IMP-08: origin `null`; inline ran; `parent.document`, `parent.electronAPI`, the preload call and `localStorage` → `SecurityError`; no `ipc-received` line in the main process. IMP-02 asserts sandbox `allow-scripts` and Blob text = content |
| BEH-003 | Phone Artifacts preview opaque; credential unreadable | Same component (`MobileArtifacts` → `ArtifactContentViewer` → `FileViewer` → `HtmlPreviewer`) | Covered by the same attribute (IMP-02); phone/browser probe (AC-006) is API/E2E's |
| BEH-004 | Application iframes preserved | `ApplicationIframeHost.vue` untouched | IMP-05: `ApplicationIframeHost.spec.ts` passes unchanged |
| BEH-005 | No popups/forms/modals/top navigation; revoke | Sandbox flags unchanged apart from removing `allow-same-origin`; revoke logic unchanged | IMP-02 revoke test passes. Refresh: see R-3 under Known Risks |
| BEH-006 | Static URL isolated wherever opened | `workspaces.ts` static success reply header | IMP-03 (header on HTML and CSS; absent on 400/404 static errors and `/content`); IMP-08 top-level window: origin `null`, `localStorage` blocked |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`. Not touched: the node's Origin rule/CORS, the Electron shell and preload, `ApplicationIframeHost.vue`, `/content`.

## Key Files Or Areas

- `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue`
- `autobyteus-web/components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts`: workspace path asserts exactly `allow-scripts`; new test "isolates Blob previews and puts only the content in the Blob" asserts sandbox `allow-scripts`, Blob type `text/html` and `await blob.text()` equals the content.
- `autobyteus-server-ts/src/api/rest/workspaces.ts`
- `autobyteus-server-ts/tests/unit/api/rest/workspaces.test.ts`: new `describe("preview document sandbox")` with two tests: HTML and CSS from the static route carry `content-security-policy: sandbox allow-scripts`; the static 404 (missing file), 400 (containment refusal), 404 (missing workspace) and the `/content` 200 reply carry none. The containment case uses a stub that refuses a named path, because `inject` normalises `..` out of the URL before routing.
- `autobyteus-web/docs/file_explorer.md`, `autobyteus-web/docs/content_rendering.md`

## Important Assumptions

- The tests pin the header value as the literal `sandbox allow-scripts` (the constant is module-private). That literal is the route's contract, not an implementation detail.
- The header is set before `reply.send(stream)`; a read-stream error after that point goes to Fastify's error handling with the header possibly still set. Harmless (a sandboxed error body) and not a supported scenario; left as is.

## Known Risks

- **R-3, reported to the Solution Designer (basis question, not fixed here per the architecture review):** from reading the code, AC-004's "preview updates after the file changes" does not hold for workspace previews today, and this ticket does not change that. `FileExplorerTabs.vue:31,177` keys `FileViewer` by `[currentWorkspaceId, activeFile]` only, and on the workspace path `HtmlPreviewer.updateSrc` assigns the same static URL again (`HtmlPreviewer.vue` `updateSrc`). So when the open file's content changes, the iframe neither remounts nor reloads. Blob previews do refresh, because each content change makes a new Blob URL (IMP-02 revoke test). I have not measured this in the running app. Validation should check it as preserved behavior.
- Behaviour change for users (approved, DEC-001): workspace previews lose relative module scripts, `fetch` of workspace files, workspace web fonts and workers; all previews lose browser storage and cookies. Blob previews never resolved relative resources and still do not (the dead `<base>` pointed at the app's origin root).
- Refused `Origin: null` requests from previews will show as `REMOTE_ACCESS_ORIGIN_REFUSED` warnings in the node log (design Key Tradeoffs).
- RSK-001, FU-001, FU-002 as recorded upstream; no new follow-ups.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix (security) with an approved Behavior Change
- Reviewed root-cause classification: `Local Implementation Defect`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: one attribute and one header in the existing owners.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`. The `<base>` prefix and `baseUrl` were removed. Nothing else in `HtmlPreviewer.vue` or `workspaces.ts` is dead: `nextTick`, `computed`, `watch` and the revoke paths are all used.
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (no shared structure)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes`. `HtmlPreviewer.vue` is 82 lines, `workspaces.ts` 110 lines.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (`design-spec.md` § Persisted Data / State Transition Decision)
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm install` (lockfile unchanged), `pnpm -C autobyteus-server-ts prebuild`, `pnpm -C autobyteus-web exec nuxt prepare` were run in the worktree. Install left untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` (build outputs, not committed).
- `origin/personal` has moved past the base since bootstrap (`c5c4bc8e4a chore(release): bump workspace release version to 1.5.12-beta.6`); not merged here; delivery integrates.
- No build input changed (TESTING.md Fresh-start build does not apply).

## Checks Run

Evidence folder: `tickets/in-progress/html-preview-isolation/evidence/`. Environment for all: macOS 26 arm64, node v24.16.0 (logged in each header), worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Reproduction from the design: `evidence/preview-probe` `server.mjs` + `electron main.cjs` (via a /tmp runner) | `ff68bfb5fa` behaviour (the probe mirrors the base previewer) | Electron 42.4.1 | probe pages | BEH-001, BEH-002 (before) | Pass (hole reproduced) | `IMP-01-reproduction-base.txt` | `"frame":"blob/current","check":"parent-electronAPI-call","value":"main process answered"`; `"frame":"static/current","check":"origin","value":"http://127.0.0.1:47921"` |
| IMP-02 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run components/fileExplorer/viewers/__tests__/HtmlPreviewer.spec.ts` | `cdba18ba35` | Nuxt vitest (happy-dom) | `HtmlPreviewer.vue` | AC-001; BEH-001, 002, 005 | Pass | `IMP-02-web-htmlpreviewer-spec.log` | `Tests  4 passed (4)` |
| IMP-03 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/api/rest/workspaces.test.ts --no-watch` | `cdba18ba35` | server vitest | `api/rest/workspaces.ts` (static + `/content`) | AC-005 (server part); BEH-006 | Pass | `IMP-03-server-workspaces-route.log` | `Tests  7 passed (7)` |
| IMP-04 | HEAD tests against the base `HtmlPreviewer.vue` and `workspaces.ts` (`git show ff68bfb5fa:<file> > <file>`, run IMP-02/03, restore) | `cdba18ba35` tests + `ff68bfb5fa` sources | as above | the new assertions | AC-001, AC-005 | Pass (new tests fail on base as intended) | `IMP-04-new-tests-fail-on-base.log` | `expected 'allow-scripts allow-same-origin' to be 'allow-scripts'` (×2); `expected undefined to be 'sandbox allow-scripts'` |
| IMP-05 | `cd autobyteus-web && NUXT_TEST=true pnpm exec vitest run components/fileExplorer components/agents components/workspace/agent components/applications components/mobile` | `cdba18ba35` | Nuxt vitest | viewers, `FileViewer`, `ArtifactContentViewer`, `ApplicationIframeHost`, mobile views | AC-008; BEH-004 | Pass | `IMP-05-web-neighbour-specs.log` | `Test Files  46 passed (46)`, `Tests  295 passed (295)` |
| IMP-06 | `pnpm -C autobyteus-server-ts typecheck`; `pnpm -C autobyteus-web typecheck` | `cdba18ba35` (tree identical when run) | — | both packages | — | Pass | `IMP-06-typechecks.log` | server `production errors: 0; test-file errors: 1182 … (baseline 1182 …)` `PASS`; web `production errors: 0; test-file errors: 96 … (baseline 96 …)` `PASS` |
| IMP-07 | `pnpm -C autobyteus-web guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals` | `cdba18ba35` (tree identical when run) | — | web | — | Pass | `IMP-07-web-guards.log` | `[guard:web-boundary] Passed.`; `[guard:localization-boundary] Passed.`; `Passed with zero unresolved findings.` |
| IMP-08 | Rendered check: esbuild bundle of the real `registerWorkspaceRoutes` (stubbed workspace manager) serving a synthetic workspace with a real relative PNG; Electron app window with the app's webPreferences rendering both preview sources exactly as `HtmlPreviewer` now does, plus the static URL top-level (`IMP-08-rendered-check/README.md`) | `cdba18ba35` | Electron 42.4.1 and 42.11.16 (pinned) | `HtmlPreviewer.vue` iframe/Blob shape; `workspaces.ts` static route | AC-002 (Electron part, without the real app), AC-004 (render part), AC-005, AC-007; BEH-001, 002, 006; R-1, R-4 | Pass | `IMP-08-rendered-check/IMP-08-electron-v42.4.1-output.txt`, `IMP-08-electron-v42.11.16-output.txt`, `IMP-08-app-window-electron-v42.11.16.png` | every frame `"check":"origin","value":"null"`; `"frame":"workspace-preview","check":"img-relative","value":"loaded 3x3"`; `"check":"module-script","value":"did-not-run"`; 0 `ipc-received` lines; 12 of 12 replies `csp=sandbox allow-scripts`; outputs identical on both versions |

- Not run, and why:
  - AC-002/003/004/006 on a real worktree build (isolated desktop instance; browser probe of the phone web app with a stored credential; node gate refusing the WS and GraphQL POST; refresh after a file change): API/E2E's, per design step 5.
  - Full `pnpm -C autobyteus-server-ts test:unit`: the only server change is the static route, covered by IMP-03; no other server code imports it.
  - Electron main-process tests: Electron main and preload are not touched.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: HTML preview in the Files area (workspace path) and Artifacts/references/local files (blob path); no visible chrome change (DEC-004: no UI change).
- Approved UI/UX, interaction, requirement, or design references: requirements REQ-001…004, AC-004; no UI spec (UI change not applicable).
- Existing design system, shared components, and adjacent product surfaces reviewed: `FileViewer`, `FileExplorerTabs`, `ArtifactContentViewer`, `ApplicationIframeHost` (untouched).
- Testing guideline or development / preview instructions and rendered surface used: the iframe/Blob shape rendered in real Electron (IMP-08), with the app window's webPreferences and the real static-route code. I did not start the full app (isolated desktop instance): that is API/E2E's layer, and the component's only rendered change is the sandbox attribute and the Blob bytes.
- States, layouts, viewports, and interactions inspected: workspace preview, blob preview, static URL top-level; scripts, CSS, image, other-site script, module, fetch, storage, parent access, preload call.
- Visual or interaction issues found and corrected: none in the product. A harness escaping bug (content embedded in a `<script>`) was fixed in the harness.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-08. The screenshot shows the workspace preview with styled heading and image, and the blob preview unstyled (no base URL, as documented). Not verified: the real app shell, the phone web app, and refresh on file change (R-3).

## Downstream Coverage Hints / Suggested Scenarios

- AC-002/AC-003 hostile page: reuse `IMP-08-rendered-check/harness/workspace/report.html` as a starting point, adding a WS to `/ws/terminal/…` and a POST to `/graphql` against the real node. The node log should show `REMOTE_ACCESS_ORIGIN_REFUSED`.
- AC-004: the synthetic workspace already has a real relative `pixel.png` (R-1). Check refresh after editing the file on both paths (R-3; expected to fail on the workspace path today).
- AC-005: the top-level static URL reports origin `null` (IMP-08). Also check that non-HTML files (CSS, JS, PNG) still load with the header.
- AC-006: phone/browser web app with a stored phone credential; preview an HTML artifact; `localStorage` must throw.
- AC-007: the approved losses (module, `fetch`) behave as IMP-08 shows; the docs now state them. Release notes are delivery's.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Yes: AC-002, AC-003, AC-004 (including refresh, R-3), AC-006 and AC-007 on a worktree build per TESTING.md, with synthetic pages only (QR-002).
