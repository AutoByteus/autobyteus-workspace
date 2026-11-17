# Code Review Report — phone-run-model-runtime-458 (autobyteus-458, with autobyteus-506's build items)

## Review Round Meta

- Review Entry Point: `API/E2E Failure-Origin Review`
- Requirements Doc Reviewed As Context: `requirements-doc.md` (REQ-008, REQ-011; UXJ-004; VIS-017)
- Design Spec Reviewed As Context: `design-spec.md` (DS-004; "`useRunStopAction`: unchanged")
- Supplemental Task Artifacts: the Product UI/UX spec named by the design (VIS-016, VIS-017)
- Design Review Report / Architecture Review Revision Record: N/A (direct route)
- Implementation Handoff Reviewed As Context: `implementation-handoff.md` (IR-001)
- Code Review Revision Record: `code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: `1`
- Review Scope: `N/A` (failure-origin; no prior source review on the direct route)
- Trigger: API/E2E engineer, API-REV-001 (Fail): F-1. Code under test `ec5b81f912`; API/E2E commits `cdb3ad0025`, `1054deb132`, `41638611b4`
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`
- Failing Scenario: a live Org member's stop from phone Settings (REQ-008, UXJ-004, VIS-017); MSP-65
- Exact Failing Commands / Execution Mode: the Android app journey (×2: the Org's direct agent, an Org Team member) and `test:e2e:mobile-shell --cases=MSP-65` in Chrome
- Failure Evidence Paths: `evidence/api-e2e/android/journey.md`, `android/shots/API-03-7-org-after-stop.png`, `evidence/api-e2e/api-03b-msp65.log`

## Routing Classification Review

- `Medium` / `Low`, direct route. Independent source review: `Failure-origin exception`. Classification unchanged: the cause is local to a shared web composable and the new phone caller.

## Scenario Basis

| Failure | Approved behavior | Trigger | Path | Validity |
| --- | --- | --- | --- | --- |
| F-1 | REQ-008: for a live run, one tap on the stop icon stops it (a Team or Org member stops its Team or Org run) "then the rows open", on the Settings screen (UXJ-004, VIS-017) | The owner opens Settings for a live Org member on the phone and taps the stop icon | `MobileRunSettings.vue:152` → `useRunStopAction` (subject `agent_org`) → `useWorkspaceHistorySubjectActions().execute({ action: 'stop' })` → `orgContexts.stopAndInspect` → `router.replace({ path: '/workspace', … })` → the phone's feature gate maps `/workspace` to `desktopWorkspace` → run list with "Unsupported on phone" | Supported Normal Scenario (named in REQ-008) |

## Origin Findings

### CR-001 — The shared Org stop writes a desktop route on the phone (F-1; Local Fix, implementation)

- Evidence: `autobyteus-web/composables/useWorkspaceHistorySubjectActions.ts:59-67`. The `stop` branch, after the stop, runs `router.replace({ path: '/workspace', query: { ...route.query, mode: 'history' } })` when the current route shows that Org. It ignores `setup.shell`; the phone guard (`setup.shell === 'mobile'`, `:94`) applies only to open, select and inspect. The composable's own contract says the opposite (`:36-37`: "on the phone shell it opens and selects only … the phone writes its own route"). `useRunStopAction` constructs the composable with no setup, so the phone's call is treated as the desktop. Agent and Team stops do not touch the route (they go through `agentRunStore` and `agentTeamRunStore`), which is why only the Org path fails.
- Origin: implementation defect, a regression this ticket exposes. The branch is pre-existing (`61f633abe66`, 2026-09-12) and correct on the desktop. 458 adds the first phone caller of the Org stop (`MobileRunSettings`) without a phone shell.
- Design-artifact note (non-blocking): the design states "`useRunStopAction`: unchanged" and treats the stop action as shell-neutral (DS-004); for `agent_org` it is not. The fix stays within the design's intent (REQ-008), so no design revision is needed.
- Review gap: N/A (direct route; no earlier source review). The specs mock `useWorkspaceHistorySubjectActions`, so the route write escaped them; MSP-65 now covers it.
- Required action:
  - Make the Org stop's route write a desktop-shell behavior, as open and select already are. `useRunStopAction` takes the shell (or the phone's Settings passes `shell: 'mobile'` through it) and forwards it to `useWorkspaceHistorySubjectActions`. The stop branch then writes `/workspace` only on the desktop shell. One rule for every action of the composable, not a second phone-only stop.
  - On the phone, keep the Settings screen. If the phone's Org route must reflect the stop (its `mode` key, which `activeContextStore` reads for `agent_org`), update it through the phone's own navigation (`useMobileNavigation`, which owns the `ORG_KEYS`), keeping `screen` as Settings. Otherwise leave it, and show in MSP-65 that the rows open and the target still resolves.
  - Keep the desktop behavior (the Settings stop and the run-tree stop stay on `/workspace` with `mode: 'history'`).
  - Tests: a `useRunStopAction` or composable spec showing the phone shell writes no `/workspace` route on an Org stop and the desktop shell still does; MSP-65 passing.

## Observations From API/E2E

- Test commits `cdb3ad0025` (MSP-50/51 `ControlOrMeta+C`, a baseline fix on macOS), `1054deb132` (MSP-08 expects Settings in the run's menu) and `41638611b4` (new MSP-65) are reviewed in the post-pass test-code review.
- FU-002 (`menus-open-upward` U03 at 1024×440, the same on base) and FU-003 (intermittent MSP-41 extra read, a desktop projection-commit error) are outside this ticket and recorded.

## Classification And Routing

- CR-001: `Local Fix`, owner implementation engineer. After the fix the route stays direct. API/E2E reruns MSP-65, MSP-59…64, the Org stop in the app (the direct agent and an Org Team member) and the full phone probe, plus the desktop Settings stop of an Org member (preserved). Then the test review covers the three API/E2E commits and the new specs.

## Resolution Check (CRR-002)

- CR-001 is **Resolved** in `6ddf9bb8f5` (IR-002). `useRunStopAction` passes the caller's `shell` to `useWorkspaceHistorySubjectActions`, `MobileRunSettings` passes `shell: 'mobile'`, and the stop branch writes `/workspace` only when `setup.shell !== 'mobile'`. One shell rule now covers every action, and the desktop is unchanged.
- API-REV-002 proved it:
  - In the Android app, a working Org direct agent and an idle Org Team member: one tap stops the Org, the phone stays on `screen=settings`, Stopped, the rows open, then a save.
  - MSP-65 Pass.
  - Desktop: the Org-member Settings stop still goes to `mode=history` with Settings open.

## Latest Authoritative Result

- Review Decision: CR-001 resolved (CRR-002). The proportional test-code review passed (`api-e2e-test-review-report.md`).
- Review Entry Point: `API/E2E Failure-Origin Review` (round 1); resolution confirmed with the post-pass test review
- Failure Origin: implementation (resolved)
- Recommended Recipient: delivery engineer
