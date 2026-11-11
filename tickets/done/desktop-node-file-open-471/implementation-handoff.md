# Implementation Handoff — desktop-node-file-open-471 (autobyteus-471)

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/desktop-node-file-open-471`, branch `codex/desktop-node-file-open-471`, base `origin/personal` @ `827f1e68dc`. Finalization target `origin/personal`; release only on the user's word.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: direct route (Medium/Low, no independent architecture review), per the Solution Designer's `handoff-implementation.md`.
- Requirements doc: `tickets/in-progress/desktop-node-file-open-471/requirements-doc.md` (SR-002, approved)
- Investigation notes: `tickets/in-progress/desktop-node-file-open-471/investigation-notes.md`
- Solution revision record: `tickets/in-progress/desktop-node-file-open-471/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/desktop-node-file-open-471/design-spec.md` (SR-002, Ready)
- Supplemental task artifacts: `autobyteus-server-ts/docs/design/node_access_model.md` (NAS-39, unchanged)
- Design review report: `N/A — not applicable` (direct route)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

The desktop opens a node file the way the phone does, through one shared loader. A remote run's path names the node it is on, on both clients. The phone shows text files of any size.

- Implementation cycle: `Rework` (IR-002 fixes CR-001…CR-003 of CRR-001; IR-001 was the initial round)
- Implementation revision record: `tickets/in-progress/desktop-node-file-open-471/implementation-revision-record.md`
- Current implementation revision ID: `IR-002`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `API-REV-001`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: CR-001, CR-002, CR-003 (API/E2E F-1, F-2, F-3)
- Note: IMP-01…IMP-05 ran on `7917df2a15`; `c686acfaff` and `2e2b9ed436` change only probe files, so those results still hold.
- IR-002 commit: `b0f3d1c42b` (code under test for IMP-11…IMP-16).
- IR-001 commits: `12ccdcc116` (shared loader), `e04b875f78` (Files panel store routing), `a64f407954` (link handler, remote-run message, phone limit), `7917df2a15` (probes, docs), `c686acfaff` (probe case renumbered, assumption 6), `2e2b9ed436` (MSP-37 assertion fix). Code under test: `2e2b9ed436`. The handoff and evidence are in the docs commit that follows it.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 25 web files (about 10 production, the rest specs, probes, docs), no server change, no new route, contract, persistence or security behavior. The desktop window reads through the existing node-file route (436) with the credential it already carries (437, NAS-39). No escalation trigger fired: no server change was needed, and every viewer shows a node file from an object URL (images, PDF, media, Excel) or content (text).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, REQ-002) | Desktop: a path outside the run's folder opens read-only in the Files panel; refusals give plain reasons | `useEventMonitorFilePreview.openPath` → `locator ??= { kind: 'absolute' }` → `fileExplorerStore.openFilePreview(abs, workspaceId, { accessIntent: read-only })` → `_openFileWithMode` → `loadRouteOf` = `node-file` → `_loadNodeFile` → `loadNodeFile` (`utils/fileExplorer/nodeFileContent.ts`) → text content / object URL / `node-file-preview:<refusal>` → `FileExplorerTabs` words it (`nodeFilePreviewErrorMessageKey`) | Done. Unit: `fileExplorerNodeRouting.spec.ts`, `FileExplorerTabs.spec.ts`, `WorkspaceToolShell.spec.ts`, `useEventMonitorFilePreview.spec.ts`. Browser: MSP-37. IR-002 (CR-003): every node file is read-only whoever opens it: the store gives the `node-file` route a read-only intent (`source: 'node-file'`) when the caller gave none (`fileExplorerNodeRouting.spec.ts`) |
| BEH-004 (REQ-003) | "This file is on {{node}}, where this run runs." on desktop and phone, for links and path attachments; host-workspace text removed | One decision, `remoteRunFileNode(agentRunId)` (`composables/remoteRuns/remoteRunFile.ts`). Links (both clients): `AgentEventMonitor` → `useEventMonitorFilePreview.openPath`, which checks the conversation's run (`originRunId`) first; the run view no longer answers links itself (IR-002, CR-001; `remote.filePath` removed). Desktop path attachments: `UserMessage` asks the run view (`useRunViewFiles().refuseRemoteRunPath()`, provided by `AgentEventMonitor`), which shows the message on its file status line and reads nothing (IR-002, CR-002). Phone attachments: `useMobileAttachmentOpening` → `openMobileFilePath` (same decision). Key `…MarkdownRenderer.file_on_other_node` (en, zh-CN) | Done. Real-caller spec: `AgentEventMonitor.remoteRunFiles.spec.ts` (desktop link, desktop attachment, phone link; a local run's attachment opens as before). Unit: `useEventMonitorFilePreview(.mobileBoundary).spec.ts`, `useMobileAttachmentOpening.spec.ts`. Phone probe: MSP-29 |
| BEH-005 (REQ-004) | Phone shows a text file of any size | `MobileFileViewer.vue`: `MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge` and the "too large" line removed | Done. Unit: `MobileFileViewer.spec.ts` (130,004 characters, last line shown). Phone: MSP-16 (a Markdown file over 130,000 characters, last line on screen) |
| BEH-002 (preserved) | Embedded window opens local files | `loadRouteOf` = `local` only in the embedded window with the trusted capability, as before | Unchanged; `useEventMonitorFilePreview.spec.ts` and `fileExplorerNodeRouting.spec.ts` keep their embedded cases |
| BEH-003 (preserved) | Phone opens node files | `useMobileNodeFile` now calls the shared loader; same refusal messages and object-URL lifetime | `useMobileNodeFile.spec.ts` unchanged in behavior; MSP-16 |
| Inside-folder (preserved) | Workspace file as today | Mapped first by `mapAbsolutePathToWorkspaceRelative`; a relative path stays `workspace-or-external` | Unit cases; MSP-31 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

All under `autobyteus-web/`:

- `utils/fileExplorer/nodeFileContent.ts` (new): `nodeFileContentUrl`, `loadNodeFileFromUrl`, `loadNodeFile`, `NODE_FILE_REFUSAL_MESSAGE_KEYS`, `nodeFilePreviewError`, `nodeFilePreviewErrorMessageKey`.
- `composables/mobile/useMobileNodeFile.ts`: uses the loader.
- `stores/fileExplorerContentActions.ts`: `loadRouteOf`, `_loadNodeFile`, the object-URL set and its release in `closeFile`, `closePathScopedFiles`, `closeAllFiles`, `closeOtherFiles` and on reload.
- `components/fileExplorer/FileExplorerTabs.vue`: words node-file refusals.
- `composables/useEventMonitorFilePreview.ts`, `composables/mobile/mobileFileOpening.ts`, `composables/mobile/useMobileAttachmentOpening.ts`: node-file fallback and the remote-run message.
- IR-002: `composables/remoteRuns/remoteRunFile.ts` (new: `remoteRunFileNode`, `FILE_ON_OTHER_NODE_MESSAGE_KEY`, `RUN_VIEW_FILES_KEY`, `useRunViewFiles`), `components/workspace/agent/AgentEventMonitor.vue` (no own remote branch; passes `originRunId`; provides the run-view file status), `components/conversation/UserMessage.vue` (desktop path attachments ask the run view), `stores/fileExplorerState.ts` (`source: 'node-file'`), `localization/messages/{en,zh-CN}/remoteRuns.ts` (`remote.filePath` removed). New spec `components/workspace/agent/__tests__/AgentEventMonitor.remoteRunFiles.spec.ts`.
- `components/mobile/views/MobileFileViewer.vue`: no limit.
- `localization/messages/{en,zh-CN}/workspace.ts`.
- Specs: `utils/fileExplorer/__tests__/nodeFileContent.spec.ts` (new), `stores/__tests__/fileExplorerNodeRouting.spec.ts`, `components/fileExplorer/__tests__/FileExplorerTabs.spec.ts`, `components/layout/__tests__/WorkspaceToolShell.spec.ts`, `composables/__tests__/useEventMonitorFilePreview{,.mobileBoundary}.spec.ts`, `composables/mobile/__tests__/{useMobileNodeFile,useMobileAttachmentOpening}.spec.ts`, `components/mobile/views/__tests__/MobileFileViewer.spec.ts`.
- Probes: `tests/e2e/mobile-file-open-cases.mjs` (MSP-37 new; MSP-29 message), `tests/e2e/mobile-shell-probe.mjs` (MSP-16 big file), `tests/e2e/event-monitor-file-preview-probe.mjs` (its negative check now looks for the new text).
- Docs: `docs/file_explorer.md`, `docs/content_rendering.md`, `docs/remote_access.md`.

## Important Assumptions

1. Loader shape differs slightly from the design's sketch: `loadNodeFile(restBaseUrl, absolutePath, asText)` returns `{ kind: 'text' | 'blob' | 'refused' }`, with `refusal: 'not-found' | 'folder' | 'failed'` in place of a raw code. Each caller decides text or blob from the file's type, read from its name, as the phone already did. The refusal message keys are a map (`NODE_FILE_REFUSAL_MESSAGE_KEYS`), not a function. The responsibility and the single owner are as designed.
2. The Files panel words a refusal through a coded error string (`node-file-preview:<refusal>`). This is the pattern it already uses for local files (`local-file-preview:`), so the store holds no translated text.
3. An embedded window without the trusted local-file capability now opens an absolute path as a node file from its own node. This is the design's rule: "a node file in every other window". Before, it showed the host-workspace notice.
4. A desktop link with no resolvable workspace id now shows "The file preview could not be opened." instead of the removed host-workspace text. That text is gone by REQ-003, and no other approved message fits.
5. On the phone, a link outside a phone shell (no `mobileNavigation`) now gives the generic failure for the same reason. Real phone views always provide navigation.
6. Probe case renumbered (`c686acfaff`). On `origin/personal` @ `827f1e68dc`, `mobile-shell-probe.mjs` has two cases named `MSP-32` (autobyteus-435's revoked-phone case and autobyteus-9's model sheet). The probe's duplicate-ID check therefore stops every run before any case (`IMP-06a`). This ticket's AC-003/AC-004 verification runs through that probe, and this ticket already edits the file. So I renamed the autobyteus-9 case's ID, its header line and its two screenshot names to `MSP-38`. Nothing else in the case changed. If a reviewer prefers this as a separate Task, the commit reverts cleanly.

## Known Risks

- RSK-001 (accepted by the user): a very large text file may be slow on the phone.
- RSK-002: object URLs. Each one the store makes is tracked and revoked on every close path and on reload; a file closed mid-load creates none. All of this is covered by `fileExplorerNodeRouting.spec.ts`.
- The desktop Files panel reads node files with whatever credential the window's requests carry. In Electron, the main process attaches the owner credential (437). The browser check (MSP-37) emulates that with the probe's owner credential on the context. The real Electron + Docker window is not run here (see "Not run").

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Behavior Change`
- Reviewed root-cause classification: `Missing Invariant` (the desktop never got the 436 rule)
- Reviewed refactor decision: `Refactor Needed Now` (extract the shared loader)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the shared loader is used by `useMobileNodeFile` and `fileExplorerContentActions`; the load route is decided once (`loadRouteOf`), and the link handler only chooses between a workspace-relative and an absolute path.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No` (`file_available_on_host` and its `unavailable(key)` helper, `MOBILE_FILE_VIEW_MAX_CHARS`, `isTooLarge`, the "too large" line, and the fetch/classify code in `useMobileNodeFile` are removed)
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`MobileFileOpenOutcome.unavailable` gains only `nodeName`; the loader's result is a tagged union)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. After IR-002: `fileExplorerContentActions.ts` 419, `UserMessage.vue` 162, `useEventMonitorFilePreview.ts` 134, `AgentEventMonitor.vue` 112 (script and template), `remoteRunFile.ts` 21. Effective non-empty lines: `fileExplorerContentActions.ts` 414, `FileExplorerTabs.vue` 359, `useEventMonitorFilePreview.ts` 132, `useMobileNodeFile.ts` 76, `nodeFileContent.ts` 55, `MobileFileViewer.vue` 52; the largest change is +101/−8 in `fileExplorerContentActions.ts`.
- Notes: none.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: `design-spec.md` § Persisted Data / State Transition Decision
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation and focused checks: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- The fresh worktree needed `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-web exec nuxt prepare`. `pnpm -C autobyteus-web typecheck` builds `@autobyteus/application-sdk-contracts` first. Before that ran, one spec (`stores/__tests__/applicationHostStore.spec.ts`) could not resolve the package; with the package built, the full suite passes.
- Probes need `pnpm -C autobyteus-server-ts build` and `pnpm -C autobyteus-web build:mobile-web` (IMP-04, IMP-05).

## Checks Run

Evidence: `tickets/in-progress/desktop-node-file-open-471/evidence/implementation/`. Runner: each check writes `IMP-xx-<name>.log` with a header (command, commit, environment, date, ID). Environment: macOS 26.5.2, node v22.23.1, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-web typecheck` | `7917df2a15` | shell | the whole web app, Electron main, scripts | all | Pass | `IMP-01-web-typecheck.log` | `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`, `PASS` |
| IMP-02 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` | `7917df2a15` | shell | every web spec, including the nine 471 specs | AC-002, AC-003, AC-004, AC-005 | Pass | `IMP-02-web-nuxt-tests-excerpt.log` (the full 2.3 MB log is not committed) | `Test Files  750 passed (750)`, `Tests  5671 passed \| 2 skipped (5673)` |
| IMP-03 | `pnpm -C autobyteus-web guard:web-boundary && … guard:localization-boundary && … audit:localization-literals` | `7917df2a15` | shell | web boundaries, locales | AC-003 | Pass | `IMP-03-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-04 | `pnpm -C autobyteus-server-ts build` | `7917df2a15` | shell | server build for the probes (no server change) | — | Pass | `IMP-04-server-build.log` | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.` |
| IMP-05 | `pnpm -C autobyteus-web build:mobile-web` | `7917df2a15` | shell | the phone bundle the probe serves | AC-004 | Pass | `IMP-05-mobile-web-build.log` | `Mobile web assets written to …/dist-mobile/public` |
| IMP-06a | same probe command as IMP-06b | `7917df2a15` | clean env | — (stopped before any case) | — | Fail (pre-existing on base) | `IMP-06a-mobile-shell-probe-duplicate-id.log` | `mobile-shell probe: duplicate case IDs MSP-32 (mobile-shell-probe.mjs, mobile-shell-probe.mjs)`. Fixed by assumption 6 |
| IMP-06 | same probe command as IMP-06b | `c686acfaff` | clean env | as IMP-06b | — | Fail (probe assertion; product correct) | `IMP-06-mobile-shell-probe-c686acfaff.log` | MSP-16/28/29/30/31 `Pass`; `MSP-37 Fail: AC-002 a missing path says so`. The alert read `Error!This file was not found on the computer.` (the panel's existing heading); fixed in `2e2b9ed436` |
| IMP-06b | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp> --cases=MSP-16,MSP-28,MSP-29,MSP-30,MSP-31,MSP-37` | `2e2b9ed436` | clean env (`env -i`, temp HOME); test-owned host nodes alpha, epsilon, zeta; headless Chrome | phone viewer and node-file opening (MSP-16), attachments (MSP-28), remote-run message (MSP-29), reopen (MSP-30, MSP-31), desktop Files panel node files in a non-embedded window (MSP-37) | AC-001, AC-002, AC-003, AC-004, AC-005 | Pass | `IMP-06b-mobile-shell-probe.log`, `IMP-06b-mobile-shell-probe-cases.json`, `IMP-06b-MSP-37-{markdown,image,missing,folder}.png`, `IMP-06b-MSP-16-outside-big-end.png`, `IMP-06b-MSP-29-remote-path-notice.png` | `mobile-shell probe: Pass`, `"unknownBrowserErrors": 0`; MSP-37 `nodeFileRequests` 200/200/404/400 with alerts `…This file was not found on the computer.` / `…This path is a folder, not a file.`; MSP-16 `"bigChars": 130061`, `"lastLineVisible": true`, `"tooLarge": false`; MSP-29 `"toast": "This file is on zeta-node, where this run runs."` |
| IMP-07 | `git grep -n -i -E 'host workspace\|file_available_on_host\|MOBILE_FILE_VIEW_MAX_CHARS\|isTooLarge\|mobile-file-preview-large\|too large'` over `autobyteus-web` and its docs | `2e2b9ed436` | git | removed text and key | AC-003, AC-004 | Pass | `IMP-07-removed-text-grep.log` | docs: no match. Code: only negative assertions in the 471 specs and probes, and unrelated text (the upload "File too large.", the highlight-cache comments, the Docker "host workspaces" volumes) |

IR-002 rows (code under test `b0f3d1c42b`; they supersede IMP-01…IMP-06b for the current code):

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-10 | Real-caller and store specs without the fix: `git stash` of the production files, then `vitest run` on `AgentEventMonitor.remoteRunFiles.spec.ts` and `fileExplorerNodeRouting.spec.ts`; stash popped | `b0f3d1c42b` minus its production change | shell | the run view, user message, link opener and store | CR-001, CR-002, CR-003 | Fail without the fix, as expected; pass with it (IMP-12) | (observed; not saved) | without the fix: run view `Tests  3 failed \| 1 passed (4)`, store `Tests  2 failed \| 10 passed (12)` |
| IMP-11 | `pnpm -C autobyteus-web typecheck` | `b0f3d1c42b` | shell | web app, Electron main, scripts | all | Pass | `IMP-11-web-typecheck.log` | `production errors: 0; test-file errors: 93 in 40 files (baseline 93 in 40 files)`, `PASS` |
| IMP-12 | `pnpm -C autobyteus-web exec cross-env NUXT_TEST=true vitest run` | `b0f3d1c42b` | shell | every web spec, incl. the new real-caller spec | AC-001…AC-005 | Pass | `IMP-12-web-nuxt-tests-excerpt.log` (full log not committed) | `Test Files  751 passed (751)`, `Tests  5680 passed (5680)` |
| IMP-13 | web guards and `audit:localization-literals` | `b0f3d1c42b` | shell | boundaries, locales (`remote.filePath` removed) | AC-003 | Pass | `IMP-13-web-guards.log` | `[audit:localization-literals] Passed with zero unresolved findings.` |
| IMP-14 | `pnpm -C autobyteus-server-ts build` | `b0f3d1c42b` | shell | server build for the probe (no server change) | — | Pass | `IMP-14-server-build.log` | `Sanitized built-module/bootstrap smoke passed without DATABASE_URL.` |
| IMP-15 | `pnpm -C autobyteus-web build:mobile-web` | `b0f3d1c42b` | shell | the phone bundle with IR-002 | AC-003, AC-004 | Pass | `IMP-15-mobile-web-build.log` | `Mobile web assets written to …/dist-mobile/public` |
| IMP-16 | `pnpm -C autobyteus-web test:e2e:mobile-shell --output-dir=<tmp> --cases=MSP-16,MSP-28,MSP-29,MSP-30,MSP-31,MSP-37` | `b0f3d1c42b` | clean env (`env -i`, temp HOME); test-owned host nodes; headless Chrome | as IMP-06b, on the IR-002 code | AC-001…AC-005 | Pass | `IMP-16-mobile-shell-probe.log`, `IMP-16-mobile-shell-probe-cases.json` | `mobile-shell probe: Pass`, `"unknownBrowserErrors": 0`, MSP-29 `"toast": "This file is on zeta-node, where this run runs."`, MSP-16 `"lastLineVisible": true` |

- Not run, and why:
  - AC-001 with a real Electron window on a test-owned Docker node: left to API/E2E. It needs an isolated desktop instance, a test-owned node container running this worktree's server, pairing, and a run on the Docker node. MSP-37 runs the same Files panel path (non-embedded window, owner credential on its requests, node-file route) in a browser window on a host node.
  - `test:e2e:event-monitor-file-preview` (the packaged Electron embedded-window regression, AC-005): only its negative text check changed, and its embedded-window path is unchanged and covered by unit specs. Left to API/E2E as the AC-005 regression run.
  - Server suites: no server change.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: desktop Files panel opened from a conversation link (node file, refusal states); the desktop status line for a remote run's path; phone viewer (big text file); phone toast for a remote run's path.
- Approved UI/UX, interaction, requirement, or design references: `requirements-doc.md` REQ-001…REQ-004 (texts), `design-spec.md` DS-001, DS-002.
- Existing design system, shared components, and adjacent product surfaces reviewed: `FileViewer` (shared, unchanged), `FileExplorerTabs` error alert (same block the local-file errors use), `MobileFileViewer` states, the event-monitor status line.
- Testing guideline and rendered surface used: TESTING.md's phone shell probe (`test:e2e:mobile-shell`), with a `nuxt dev` desktop window against a test-owned host node (MSP-31, MSP-37), plus the production phone bundle (MSP-16, MSP-29).
- States, layouts, viewports, and interactions inspected:
  - Desktop window at 1440×1000 (MSP-37 screenshots, inspected): the Markdown node file renders in the Files panel's viewer with its own tab and no edit control; typing changes nothing; the PNG shows in the image viewer.
  - The missing path and the folder show the panel's existing red alert ("Error!" heading and the plain reason).
  - Phone at 390×844: the 130,061-character Markdown file scrolled to its end shows `LAST-LINE-471` with no "too large" state (MSP-16 big-end).
  - The remote run's toast says "This file is on zeta-node, where this run runs." (MSP-29).
- Visual or interaction issues found and corrected: none in the changed surfaces.
  - Not changed, pre-existing, out of scope: in the narrow right-hand Files panel, the tab strip can scroll the active tab out of view after several tabs (seen in `IMP-06b-MSP-37-missing.png`).
  - The MSP-29 screenshot caught the shared toast mid-fade over the run's bar. The toast's position is the existing shared toast's (450).
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-06b. Not rendered here: an Electron window on a Docker node (see Not run), PDF/media node files on the desktop (unit-covered: same object-URL path as the image), and a remote run's message in a desktop window (unit-covered).

## Lightweight Implementation Self-Review (direct route)

- Scope: only the files in the design's mapping, plus their specs, probes and docs. No server code changed.
- Single owners: one loader (`nodeFileContent.ts`), one load-route rule (`loadRouteOf`), and one place that words node-file refusals in each client.
- Lifetimes: every object URL the store makes is in `nodeFileObjectUrls` and is released on close, close-all, close-others, deleted-scope close, reload, and when a later load replaces it. A load that finishes after its file closed creates no URL.
- Read-only: every node file is read-only whoever opens it (IR-002: the store's `node-file` route sets the intent when a caller gives none), and the route is GET-only (436).
- Real callers (IR-002): the run view (`AgentEventMonitor`) and the message attachment chips (`UserMessage`) are now exercised together with the link opener in `AgentEventMonitor.remoteRunFiles.spec.ts`. The specs tested the composable and store in isolation, which is how CR-001…CR-003 escaped IR-001.
- No secrets or file contents are logged by the new code. The store's existing `console.log` of the initial file state carries no content.
- Removed text: `grep -ri "host workspace\|file_available_on_host\|too large"` over `autobyteus-web` (outside unrelated upload/cache comments and the Docker launcher's "host workspaces" text) matches only the new specs' negative assertions.

## Downstream Coverage Hints / Suggested Scenarios

1. AC-001 in Electron: an isolated desktop instance (`pnpm --silent isolated-app start --build`) plus a test-owned node container (TESTING.md § Docker server nodes) running this worktree's server. In a window on the Docker node, a run whose conversation links a Markdown file and a PNG outside its folder (inside the container), plus a missing path and a folder. Expected: both open read-only in the Files panel; the reasons read "This file was not found on the computer." and "This path is a folder, not a file."; no "host workspace" text.
2. AC-002 unreadable file: a file the node's user cannot read gives "The file preview could not be opened." (unit-covered; the server returns `NODE_FILE_UNREADABLE`).
3. AC-003 on the desktop in a real window (IR-002 rechecks: API-01 D3, D5–D9, API-02): a delegated run on another node; a click on its path link and on its path attachment each shows "This file is on <node>, where this run runs." in the status line.
4. Object-URL lifetime: open, close and reload several node images and PDFs; no growth in blob URLs.
5. AC-005: `pnpm -C autobyteus-web test:e2e:event-monitor-file-preview` (embedded window, local files).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001's Electron + test-owned Docker node run (scenario 1), AC-005's packaged Electron regression (scenario 5), and the independent validation and confidence scoring the API/E2E role owns.
