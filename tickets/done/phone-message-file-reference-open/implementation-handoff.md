# Implementation Handoff

Package `phone-message-file-reference-open`, Project Task `autobyteus-427`. Worktree
`/Users/normy/autobyteus_org/autobyteus-worktrees/phone-message-file-reference-open`, branch
`codex/phone-message-file-reference-open`. Code commit `61c886c0fe`; base `origin/personal` @ `6225a734a3`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: `Architecture Design Complete`, `Small`/`Low`, direct implementation (no architecture review selected)
- Requirements doc: `tickets/in-progress/phone-message-file-reference-open/requirements-doc.md` (SR-001, Approved)
- Investigation notes: `tickets/in-progress/phone-message-file-reference-open/investigation-notes.md`
- Solution revision record: `tickets/in-progress/phone-message-file-reference-open/solution-revision-record.md`
- Design spec (required on every route): `tickets/in-progress/phone-message-file-reference-open/design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `probes/probe427.mobileFileOpen.spec.ts` (reproduction; not committed in the source tree), `follow-ups.md`
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `N/A` (initial)

## Current Implementation Summary

`AgentEventMonitor` now takes the phone navigation in setup (`isMobileRemoteAccessRuntime() ? useMobileNavigation() : null`, next to `revealTool`) and passes it to the lazily created opener as the required `mobileNavigation` option. The opener (`useEventMonitorFilePreview`) no longer imports or calls `useMobileNavigation`; it imports only the new type `MobileFileNavigation` (`Pick<…, 'openFile'>`), exported by `useMobileNavigation.ts`. The rest of the open sequence (path mapping, origin checks, `openFile` push, desktop path) is unchanged.

- Implementation cycle: `Initial`
- Implementation revision record: `tickets/in-progress/phone-message-file-reference-open/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Small`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md, "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: 3 production files, +15/−4 lines; no new owner, route, contract, persistence, security or concurrency change. Path mapping and origin checks untouched; desktop path receives `mobileNavigation: null` and its specs pass unchanged in behavior. Neither escalation trigger fired (no file-route/403 issue was touched; no other setup-only capability on the phone path: `useMobileRunOpening.ts:39` calls `useMobileNavigation()` from its own setup-time composable, not late).
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (below: Legacy, Design Health, diff read against the design's Change Scope and Dependency Rules)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | Phone tap opens the Files screen with the file, as a history entry | `AgentEventMonitor.vue` setup captures `mobileNavigation` (l.84-85) → `handleFilePathAction` → `useEventMonitorFilePreview({ revealTool, mobileNavigation, isOriginCurrent })` (l.105) → `openMobilePath` → `mobileNavigation.openFile` → `router.push(screen=files&workspace&file)` | Implemented. IMP-03: real renderer click → route `{ screen: 'files', workspace: 'B', file: 'draft-v3.txt' }`, Back returns to `/mobile?screen=run`, no `inject()` warning |
| BEH-002 | Path outside the workspace / remote run: nothing opens, status line | Unchanged `openMobilePath` mapping and `unavailable` exit; remote run still short-circuits in `handleFilePathAction` (`remote.filePath`) | Preserved. IMP-03 case 2 (outside path → status `file_available_on_host`, route unchanged); boundary spec in IMP-04 |
| BEH-003 | Desktop open unchanged | Desktop path untouched; `mobileNavigation` is `null` off the phone | Preserved. IMP-04: `useEventMonitorFilePreview.spec.ts`, `WorkspaceToolShell.spec.ts`, `RightSideTabs.workspaceTarget.spec.ts`, `AgentEventMonitor.spec.ts` (new case asserts `mobileNavigation: null` off the phone) |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/components/workspace/agent/AgentEventMonitor.vue`: capture + pass
- `autobyteus-web/composables/useEventMonitorFilePreview.ts`: required `mobileNavigation` option; own call and import removed
- `autobyteus-web/composables/mobile/useMobileNavigation.ts`: `export type MobileFileNavigation`
- Specs: `useEventMonitorFilePreview.spec.ts`, `useEventMonitorFilePreview.mobileBoundary.spec.ts` (module mock of `useMobileNavigation` removed, double passed as the option), `RightSideTabs.workspaceTarget.spec.ts`, `WorkspaceToolShell.spec.ts` (`mobileNavigation: null`), `AgentEventMonitor.spec.ts` (+1 case)
- New regression: `autobyteus-web/components/workspace/agent/__tests__/AgentEventMonitor.mobileFileOpen.spec.ts` (AC-002). Production code under test: `AgentEventMonitor`, `AgentConversationFeed`, `MarkdownRenderer`, the opener, `useMobileNavigation`, vue-router, the workspace store. Doubled: the phone-runtime switch, Apollo IO, localization, the open target (the same doubles as the opener's boundary spec). It goes further than the design asked (the design allowed the feed to emit the action): the click is on the rendered file link.

## Important Assumptions

- ASM-001 (requirements) stands; the fix is path-independent.

## Known Risks

- Low. `openMobilePath` keeps its `!mobileNavigation` guard (`useEventMonitorFilePreview.ts:49`). With the production caller it is not hit on the phone (the monitor passes a navigation whenever `isMobileRemoteAccessRuntime()` is true); it remains as the type narrowing of the nullable option and returns the existing `unavailable` result. Not new code.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Boundary Or Ownership Issue` (narrow)
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the opener now takes no capability from a component context; `useEventMonitorFilePreview.ts` imports `useMobileNavigation.ts` for its type only (design Dependency Rules).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (the option is required; no fallback to an own `useMobileNavigation()` call)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`: the opener's own call and import; the `vi.mock('~/composables/mobile/useMobileNavigation', …)` doubles in both opener specs (the module is no longer imported by the code under test)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes` (`MobileFileNavigation` is a `Pick` of the owner's return type)
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes` (`AgentEventMonitor.vue` 109 lines, `useEventMonitorFilePreview.ts` 148, `useMobileNavigation.ts` 109)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md, "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- `pnpm -C autobyteus-web typecheck` builds `autobyteus-application-sdk-contracts/dist/` and `autobyteus-application-backend-sdk/dist/` as untracked outputs in the worktree; not committed.
- The probe was copied into `autobyteus-web/composables/__tests__/` for IMP-01 and removed afterwards (not committed, per the design).

## Checks Run

Evidence files are in `tickets/in-progress/phone-message-file-reference-open/evidence/`, each with a header (command, commit, environment, date). IMP-03 to IMP-05 ran on the working tree that was then committed unchanged as `61c886c0fe`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | Handed-over probe: `cp probes/probe427.mobileFileOpen.spec.ts autobyteus-web/composables/__tests__/` then `pnpm -C autobyteus-web exec vitest run composables/__tests__/probe427.mobileFileOpen.spec.ts --no-watch` | `f7c31e4b0c` (base code) | macOS, vitest nuxt env | Base opener + real `useMobileNavigation` | BEH-001 (reproduction) | Fail as expected (1 failed, control 1 passed) | `IMP-01-probe-base.log` | `PROBE result = {"status":"failed",…}`; `TypeError: Cannot read properties of undefined (reading 'query')`; `CONTROL result = {"status":"opened","path":"draft-v3.txt"}` |
| IMP-02 | `pnpm -C autobyteus-web exec vitest run components/workspace/agent/__tests__/AgentEventMonitor.mobileFileOpen.spec.ts --no-watch` with the three production files at the base | `61c886c0fe` spec, production files at `f7c31e4b0c` | same | Base production path, new regression spec | AC-002 (fails on base) | Fail as expected (1 failed, 1 passed) | `IMP-02-regression-base.log` | `inject() can only be used inside setup()`; `AssertionError: expected 'run' to be 'files'` |
| IMP-03 | Same command | `61c886c0fe` | same | `AgentEventMonitor`, feed, `MarkdownRenderer`, opener, `useMobileNavigation`, vue-router | BEH-001, BEH-002; AC-002, AC-003 (component level) | Pass | `IMP-03-regression-fixed.log` | `Tests  2 passed (2)` |
| IMP-04 | `pnpm -C autobyteus-web exec vitest run composables/__tests__/useEventMonitorFilePreview.spec.ts composables/__tests__/useEventMonitorFilePreview.mobileBoundary.spec.ts composables/mobile components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts components/layout/__tests__/WorkspaceToolShell.spec.ts components/workspace/agent components/mobile components/conversation/segments --no-watch` | `61c886c0fe` | same | Opener, monitor, layout file-open path, phone navigation and screens, renderer | BEH-002, BEH-003; AC-003, AC-004 (unit level) | Pass | `IMP-04-touched-suites.log` | `Test Files  39 passed (39)`, `Tests  312 passed (312)` |
| IMP-05 | `pnpm -C autobyteus-web typecheck` | `61c886c0fe` | same | Whole web app + tests | — | Pass | `IMP-05-typecheck.log` | `production errors: 0; test-file errors: 96 in 41 files (baseline 96 in 41 files)`, `[typecheck] PASS` |

- Not run, and why:
  - Full `pnpm -C autobyteus-web test:nuxt`: not run; IMP-04 covers every suite that touches the changed files and the phone screens. API/E2E may run it.
  - `mobile-shell-probe` (AC-001, AC-003 in the browser) and `event-monitor-file-preview-probe` (AC-004): left to API/E2E per the design (the phone probe builds two servers and the phone bundle; the new case is API/E2E-owned).

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: phone run screen conversation → tap on a file link → phone Files viewer; Back to the conversation. No visual change: no markup, style or wording changed.
- Approved UI/UX, interaction, requirement, or design references: autobyteus-277 DS-004, DS-008; requirements BEH-001..003
- Existing design system, shared components, and adjacent product surfaces reviewed: `MarkdownRenderer` file-link controls, `MobileRunTargetView`, `useMobileNavigation`
- Testing guideline or development / preview instructions and rendered surface used: TESTING.md "Browser probes" names `mobile-shell-probe` for the phone bundle; not run here (see Checks Run).
- States, layouts, viewports, and interactions inspected: at component level (IMP-03, DOM in the nuxt test environment): the rendered file-link control is clicked; the route becomes the Files screen entry; Back returns; outside-workspace path shows the existing status line.
- Visual or interaction issues found and corrected: none found
- Check IDs with the supporting evidence, and remaining unverified states or limitations: IMP-03. Not verified in a real browser on the phone bundle: the Files viewer actually showing the file's text after the tap (AC-001) and the status line in a browser (AC-003). Those are the API/E2E `mobile-shell-probe` case.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: in `mobile-shell-probe`, on the Delivery Team lead's (or a member's) conversation, the existing message that names a workspace file by absolute path; tap the link → `mobile-file-viewer` shows its text; URL has `screen=files`, the workspace id and the relative path; Back returns to the conversation (composer visible).
- AC-003: a message naming a path outside the run's workspace → no navigation; status line "This file is available only on the host workspace."
- AC-004: `event-monitor-file-preview-probe` stays green (desktop).
- Watch the browser console for `inject() can only be used inside setup()`; it must not appear on the tap.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001 and AC-003 browser cases on the phone bundle against probe-owned isolated nodes (synthetic data only).
- AC-004 desktop probe rerun.
- TESTING.md rule for the stage that let it through (design spec, Guidance For Implementation; owner API/E2E).
