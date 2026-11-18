# Implementation Handoff — phone-registered-folders-436 (autobyteus-436): the phone opens any file a conversation names, read-only

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Medium / High); ARCH-REV-001 passed SR-005; the Architecture Reviewer sent the implementation request.
- Requirements doc: `tickets/in-progress/phone-registered-folders-436/requirements-doc.md` (SR-004, approved by the user 2026-11-09; REQ-001…006, AC-001…006)
- Investigation notes: `tickets/in-progress/phone-registered-folders-436/investigation-notes.md`
- Solution revision record: `tickets/in-progress/phone-registered-folders-436/solution-revision-record.md` (SR-005)
- Design spec (required on every route): `tickets/in-progress/phone-registered-folders-436/design-spec.md`
- Supplemental task artifacts: the contract `autobyteus-server-ts/docs/design/node_access_model.md` (NAS-39, NAS-40, §5)
- Design review report: `tickets/in-progress/phone-registered-folders-436/design-review-report.md` (ARCH-REV-001, Pass; R-1…R-3)
- Architecture review revision record: `tickets/in-progress/phone-registered-folders-436/architecture-review-revision-record.md`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/phone-registered-folders-436/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-001`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

Branch base: the branch was fast-forwarded to `origin/personal` @ `97ed263074` (autobyteus-440 merged after the reviewed base `34ea6e36bb`) before any change, as the PM asked; 440 touched no phone, memory or node-access file.

The node serves one file by absolute path, read-only, to owner and phone credentials (`GET /rest/node-files/content?path=`); on the phone, a tapped path outside the open run's folder opens through it on the Files screen.

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Medium`
- Architecture risk (`Low`/`High`): `High`
- Design classification section / evidence reference: design-spec.md § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: a new route that returns any file on the node's computer to a phone credential (security contract, user-approved); 15 source files (server 4, web 8, docs 3) plus tests, as the design estimated.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Code Review`
- Lightweight implementation self-review completed for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None` (every file type the workspace viewer shows also shows from a blob URL; nothing writes or lists)

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 / DS-001 (REQ-001, 004, 005; AC-001, 004) | Inside the run's folder as today; anywhere else opens read-only by absolute path; messages for missing and folder | `useEventMonitorFilePreview.openMobilePath` → `useMobileNavigation.openNodeFile` (`screen=files&nodeFile=`) → `MobileFiles.vue` → `MobileFileViewer` with `useMobileNodeFile` (one `authorizedFetch`, `determineFileType`, text as content, other types as an object URL revoked when the file closes, refusal codes → messages) | Implemented. Unit/component tests; phone shell probe MSP-16, MSP-17 |
| BEH-002 / DS-002 (REQ-002, 003, 006; AC-002, 003) | Read-only route, one file, owner and phone only; `sendUserFile` headers | `api/rest/node-files.ts` (GET only) → `node-files/node-file-reader.ts` (absolute, no `..`, no NUL; `realpath`; opened read-only; regular file via `fstat` of the opened file; streamed) ; `node-route-permissions.ts` explicit row | Implemented. Unit tests; `tests/e2e/node-files/node-files.e2e.test.ts` (NAS-39, NAS-40) |
| BEH-003, BEH-004 (AC-006) | Preserved | Desktop branch of `useEventMonitorFilePreview` unchanged; phone workspace files unchanged | Desktop/phone specs and MSP-16 (workspace file) pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Server: `autobyteus-server-ts/src/node-files/node-file-reader.ts` (new), `src/api/rest/node-files.ts` (new), `src/api/rest/index.ts`, `src/api/security/node-route-permissions.ts`.
- Phone: `autobyteus-web/composables/mobile/useMobileNodeFile.ts` (new), `composables/mobile/useMobileNavigation.ts`, `composables/useEventMonitorFilePreview.ts`, `components/mobile/views/MobileFiles.vue`, `components/mobile/views/MobileFileViewer.vue` (optional `errorMessage`), `utils/remoteAccess/authorizedResourceUrl.ts`, `localization/messages/{en,zh-CN}/workspace.ts`.
- Tests: `tests/unit/node-files/node-file-reader.test.ts`, `tests/e2e/node-files/node-files.e2e.test.ts`, `tests/unit/node-access/node-route-permissions.test.ts`; web `useMobileNodeFile.spec.ts`, `useMobileNavigation.spec.ts`, `MobileViews.spec.ts`, `useEventMonitorFilePreview{,.mobileBoundary}.spec.ts`, `AgentEventMonitor.mobileFileOpen.spec.ts`; probe `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` (MSP-16, MSP-17).
- Docs: `GLOSSARY.md` ("Node file"), `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md`, `node_access_model.md` §5 ("Node files … Holds").

## Important Assumptions

1. R-1 applied: every `fs` failure has a defined answer. `ENOENT`/`ENOTDIR` → 404 `NODE_FILE_NOT_FOUND`; a folder → 400 `NODE_FILE_IS_FOLDER`; a relative path, `..`, a NUL byte or no path → 400 `NODE_FILE_PATH_INVALID`; anything else (`EACCES`, `EPERM`, `ELOOP`, a socket or device) → 400 `NODE_FILE_UNREADABLE` (a fourth code, beyond the design's three), which the phone shows as "The file preview could not be opened." Nothing logs the path or the error text; there is no 500 branch.
2. The regular-file check uses `fstat` on the opened file (not `stat` then `open`), so the file that is checked is the file that is streamed.
3. R-2 applied: without the phone navigation (`!mobileNavigation`) nothing opens (`file_available_on_host`, as before). The origin/context check runs before any open; with no run folder at all, the path opens as a node file.
4. A link in a run that another node runs (a remote run, `remoteRunsStore.runOfAgentRun`) keeps today's answer (`file_available_on_host`): its paths belong to that node, and this route reads this node. Not stated in the design; it preserves today's behavior for that case.
5. `MobileFileViewer` gained an optional `errorMessage` prop for the node-file messages; workspace files keep "Couldn’t open this file.".
6. The two new messages are under `workspace.components.mobile.views.MobileFiles.*` (en, zh-CN); "other failures" reuses the existing `file_preview_failed` key, as REQ-004 says.
7. `HtmlPreviewer` is unchanged (`sandbox="allow-scripts"` without `allow-same-origin`), as the review asked; node files reach the viewer as blob URLs.
8. The phone shell probe's MSP-17 (a read-only conversation) changes too: its outside-the-folder link now opens the file read-only (the design named only MSP-16's case).

## Known Risks

- AC-005 (Docker node, `/home/autobyteus/shared`) is not run here: it needs this branch's server in a test-owned container. The route reads the server's own filesystem, so in a container the paths are the container's (REQ-006 by construction).
- RSK-001 (design): a large binary file is fetched whole into a blob on the phone, as workspace media already are.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: existing owners absorbed it (gate, `sendUserFile`, `authorizedFetch`, `determineFileType`, `MobileFileViewer`).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (the phone branch's two `file_available_on_host` returns for a path outside the folder became node-file opens; the key stays for the desktop branch, the no-navigation case and remote runs)
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes` (`nodeFile` and `workspace`+`file` stay separate route queries; the node-file state is the viewer's existing `OpenFileState` shape)
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (largest touched: `MobileFiles.vue` 155, `useEventMonitorFilePreview.ts` 150 effective lines; no `>220` delta)
- Notes: `build-studio-server.ts` untouched.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` (nothing stored)

## Environment Or Dependency Notes

- No new dependencies (`mime-types` already used by the workspace route).

## Checks Run

macOS, Node 22, pnpm 10, this worktree, one heavy run at a time; E2E with a clean environment. Each log starts with
its command, commit and date; the runner is `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-run-checks.sh`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `tsc --noEmit -p tsconfig.build.json` (server) | 271656acc0 | shell | server source | — | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-01-server-typecheck-build.log` | `# Exit status: 0` |
| IMP-02 | server tests typecheck: error count, and errors in this ticket's test files | 271656acc0 | shell | server tests | — | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-02-server-typecheck-tests.log` | `1182` (the count 437 left), no line for `node-files` or `node-route-permissions` |
| IMP-03 | `pnpm -C autobyteus-server-ts test:unit` | 271656acc0 | shell (test isolation) | reader unit tests, permission row, architecture test (NAS-39/40 named) | REQ-002, REQ-003; NAS-39, NAS-40 | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-03-server-unit.log` | `Test Files  965 passed | 5 skipped`; `Tests  8207 passed` |
| IMP-04 | `test:integration:prepare` then `test:integration` | 271656acc0 | shell | REST registration, studio HTTP contract | — | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-04a-integration-prepare.log`, `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-04-server-integration.log` | `Test Files  89 passed | 20 skipped`; `Tests  517 passed` |
| IMP-05 | `vitest run tests/e2e/node-files tests/e2e/node-access tests/e2e/remote-access tests/e2e/workspaces` | 271656acc0 | clean env | the node-file route on the real server behind the gate; the access model; phone routes; workspace files | AC-002, AC-003; NAS-39, NAS-40; preserved 437 | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-05-server-e2e-node-files-access.log` | `Test Files  9 passed (9)`; `Tests  69 passed (69)` |
| IMP-06 | `pnpm -C autobyteus-web typecheck` | 271656acc0 | shell | web | — | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-06-web-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)` |
| IMP-07 | `cross-env NUXT_TEST=true vitest run` (web) | 271656acc0 | shell | the link handler, navigation, `useMobileNodeFile`, Files screen, viewer, prefix | AC-001, AC-004, AC-006 | Pass for this change; 1 pre-existing failure (FU-002) | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-07-web-nuxt-tests.log` | `Tests  1 failed | 5472 passed`; the one failure is `pages/__tests__/mobile-root-shell.spec.ts` ("expected 'AutoByteus node' to be 'desktop-private.local:29695'"), stale since autobyteus-433 `ba3ba5b23e`, in no file this branch changes |
| IMP-08 | web boundary and localization guards | 271656acc0 | shell | new message keys | REQ-004 | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-08-web-guards.log` | `[guard:localization-boundary] Passed.` |
| IMP-09 | phone shell probe `--cases=MSP-16,MSP-17` | 4603511bfb (probe as in 37128101b9) | clean env, headless Chrome, the probe's own nodes | the whole phone journey through the real node route | AC-001, AC-004, AC-006 (part) | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-09-mobile-shell-MSP-16-17.log`, `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-MSP-16-17/` (`mobile-shell-probe.json`, screenshots) | `[mobile-shell] MSP-16 Pass`, `MSP-17 Pass`, `mobile-shell probe: Pass` |
| IMP-10 | size guardrail on changed source files (vs `97ed263074`) | 271656acc0 | shell | changed source files | — | Pass | `tickets/in-progress/phone-registered-folders-436/evidence/implementation/IMP-10-source-size-guardrail.log` | no `OVER-500`, `GREW-WHILE-OVER` or `>220-delta` line; largest 155 |

- Not run, and why: AC-005 (a test-owned Docker node with this branch's server; API/E2E's Docker probe); the rest of the phone shell probe and the desktop probes (AC-006 beyond MSP-16/17); Electron specs (no Electron code changed).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: the phone conversation's file links → Files screen viewer for a node file (text, Markdown, image), the missing and folder messages, Back.
- Approved UI/UX, interaction, requirement, or design references: REQ-001, REQ-004, REQ-005; the existing phone viewer (autobyteus-277 UIS-005, VIS-029).
- Existing design system, shared components, and adjacent product surfaces reviewed: `MobileFileViewer`, `MobileScreenBar`, the workspace file open (same viewer and states).
- Testing guideline or development / preview instructions and rendered surface used: the phone shell probe (`pnpm -C autobyteus-web test:e2e:mobile-shell --cases=MSP-16,MSP-17`): its own nodes and data, the built mobile shell in headless Chrome at a phone viewport.
- States, layouts, viewports, and interactions inspected: a workspace file (unchanged), outside text file, outside Markdown (preview), outside image, missing path, folder; typing into the opened file changes nothing; Back from each; a read-only conversation's link. Screenshots `MSP-16-outside-{text,markdown,image,missing,folder}.png`, `MSP-17-read-only-status.png`.
- Visual or interaction issues found and corrected: none in the product. The probe's own checks were adjusted: the Monaco text viewer keeps a hidden input when read-only, so read-only is checked by typing; MSP-17 closes the full-screen file with the system Back before walking back.
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-09. Not seen on a real Android device; the Docker case (AC-005) not run.

## Downstream Coverage Hints / Suggested Scenarios

- AC-005 on a test-owned Docker node: a file in `/home/autobyteus/shared` opens on the phone; a host path that is not mounted answers "not found".
- A path the node's user cannot read (permissions) → "could not be opened"; a symbolic link out of a run's folder; a large PDF on a real phone.
- A remote run's link on the phone (assumption 4).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-005 (Docker probe or e2e); AC-006's full phone and desktop probe sets (only MSP-16 and MSP-17 ran here).
