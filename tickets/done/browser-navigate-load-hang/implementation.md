# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

## Scope Classification

- Classification: `Small`
- Reasoning:
  - The defect is concentrated in the Electron browser navigation waiter and the browser test doubles that currently mask the missing event cases.
  - The server-side bridge client exposes the hang but is not the primary owner of navigation lifecycle semantics.
- Workflow Depth:
  - `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review (`Go Confirmed`) -> finalize `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/browser-navigate-load-hang/workflow-state.md`
- Investigation notes: `tickets/done/browser-navigate-load-hang/investigation-notes.md`
- Requirements: `tickets/done/browser-navigate-load-hang/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/browser-navigate-load-hang/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/browser-navigate-load-hang/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Complete`
- Notes:
  - Stage 5 review reached `Go Confirmed` with two clean rounds on `v1` artifacts.
  - This artifact now serves as both the approved small-scope implementation baseline and the final Stage 6 execution record.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-001` full document `navigate_to` success returns promptly.
  - `UC-002` same-document/in-page `navigate_to` success returns promptly.
  - `UC-003` failed/cancelled/provisional navigation rejects instead of hanging.
  - `UC-004` Stage 7 produces build-backed user validation handoff.
- Spine Inventory In Scope:
  - `DS-001` primary navigate request spine.
  - `DS-002` return/event spine for navigation completion/failure propagation.
  - `DS-003` bounded local waiter spine inside `BrowserTabNavigation`.
  - `DS-004` bounded local validation/build spine for Stage 7 user handoff.
- Primary Spine Span Sufficiency Rationale:
  - The primary spine must start at the agent tool entrypoint and reach Electron `webContents` plus the bridge response path, not just the local waiter helper, so ownership and failure propagation stay visible.
- Primary Owners / Main Domain Subjects:
  - `BrowserTabNavigation` owns navigation wait semantics.
  - `BrowserTabManager` owns session orchestration and state publication.
  - browser Electron test fakes own local lifecycle simulation for regression coverage.
  - Stage 7 build/test harness ownership remains inside `autobyteus-web`.
- Requirement Coverage Guarantee:
  - `R-001` through `R-004` map to the navigation helper plus browser tests.
  - `R-005` maps to Stage 7 build and handoff artifacts.
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-003`: ensure failure/cancellation paths reject deterministically instead of hanging.
- Target Architecture Shape:
  - `navigate_to` keeps `BrowserTabNavigation` as the one authoritative wait boundary.
  - Document navigation success/failure uses authoritative `loadURL()` settlement together with main-frame ready/failure signals.
  - Same-document navigation success uses explicit in-page navigation handling instead of waiting on `did-finish-load`.
  - `reload()` reuses the same failure-aware readiness helper where appropriate.
  - Electron browser tests model in-page success and provisional failure explicitly.
- New Owners/Boundary Interfaces To Introduce:
  - no new subsystem owner
  - optional private helper(s) inside `browser-tab-navigation.ts` for unified navigation settlement
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - public browser tool contract stays unchanged
  - Electron navigation waiting becomes deterministic for document, in-page, and failure cases
- Key Assumptions:
  - `did-navigate-in-page` is the correct success signal for same-document navigations in this boundary.
  - `did-fail-provisional-load` must be treated as a first-class failure signal.
  - A timeout is not required for the first correctness fix if authoritative Electron signals are handled comprehensively.
- Known Risks:
  - incorrect event ordering could produce double-settlement unless the helper is carefully guarded
  - the fresh worktree lacks dependencies today, so Stage 6/7 validation must bootstrap them before execution

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | `1` |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | `2` |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: stabilize the waiter owner before touching dependent tests and build validation.
- Test-driven: expand Electron browser tests alongside the waiter fix.
- Spine-led implementation rule: sequence work by request spine, then return/failure propagation spine, then test/build validation.
- Mandatory modernization rule: no compatibility wrappers or legacy dual paths.
- Mandatory cleanup rule: remove obsolete wait assumptions in scope instead of layering extra ad hoc fallbacks on top.
- Mandatory ownership/decoupling/SoC rule: keep navigation waiting authoritative in `BrowserTabNavigation`; do not spread lifecycle policy across manager and tests.
- Mandatory `Authoritative Boundary Rule`: `BrowserTabManager` should continue depending on `BrowserTabNavigation` as the authoritative navigation boundary instead of duplicating lifecycle policy.
- Mandatory `Spine Span Sufficiency Rule`: keep the design visible from tool invocation through Electron completion/failure and back to bridge response.
- Mandatory shared-structure coherence rule: one navigation-settlement helper should own the completion/failure rules rather than several partially overlapping waits.
- Mandatory file-placement rule: fix stays in the existing Electron browser subsystem and its tests.
- Mandatory proactive size-pressure rule: touched source files are small enough for focused edits; keep them that way.
- One file at a time is the default; use limited parallelism only for independent validation/setup steps.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001, DS-002, DS-003 | `browser-tab-navigation.ts` | Redesign navigation completion/failure waiting for document, in-page, and provisional-failure cases | N/A | This is the authoritative lifecycle owner and root cause boundary. |
| 2 | DS-001, DS-002 | `browser-tab-manager.ts` | Align manager behavior and reload usage with the updated helper semantics if needed | T-001 | Manager should only reflect the helper's authoritative behavior. |
| 3 | DS-003 | `browser-tab-manager.spec.ts`, related Electron tests | Expand fake `WebContents` lifecycle coverage and add regression tests for in-page and provisional-failure cases | T-001, T-002 | Tests must prove the new lifecycle contract and prevent regressions. |
| 4 | DS-004 | `autobyteus-web` test/build setup + Stage 7 artifact | Bootstrap dependencies, run focused validation, and build Electron app for user verification | T-001, T-002, T-003 | Stage 7 handoff depends on finished code plus executable validation and build output. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| navigation wait owner | `autobyteus-web/electron/browser/browser-tab-navigation.ts` | same | Electron browser navigation lifecycle | Keep | confirm authoritative completion/failure logic stays here |
| session orchestration | `autobyteus-web/electron/browser/browser-tab-manager.ts` | same | Electron browser session manager | Keep | confirm manager does not duplicate navigation wait policy |
| browser lifecycle fake/tests | `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts` | same | Electron browser regression coverage | Keep | confirm fake models in-page and provisional failure events |
| shell-controller/browser regression tests | `autobyteus-web/electron/browser/__tests__/browser-shell-controller.spec.ts` | same | Electron browser shell projection coverage | Keep | extend only if the changed lifecycle contract affects shell behavior |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| T-001 | DS-001, DS-002, DS-003 | `browser-tab-navigation.ts` | authoritative navigation settlement for document, in-page, and provisional-failure paths | `autobyteus-web/electron/browser/browser-tab-navigation.ts` | same | Modify | N/A | Completed | `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts` | Passed | N/A | N/A | Planned | Completed by unifying success/failure settlement around authoritative Electron lifecycle signals plus `loadURL()` rejection handling. |
| T-002 | DS-001, DS-002 | `browser-tab-manager.ts` | manager/reload alignment with updated navigation helper | `autobyteus-web/electron/browser/browser-tab-manager.ts` | same | Modify | T-001 | Completed | `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts`, `autobyteus-web/electron/browser/__tests__/browser-shell-controller.spec.ts` | Passed | N/A | N/A | Planned | No manager source change was required after validating the helper remained the authoritative boundary. |
| T-003 | DS-003 | Electron browser tests | lifecycle fake expansion and regression scenarios | `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts`, `autobyteus-web/electron/browser/__tests__/browser-shell-controller.spec.ts` | same | Modify | T-001, T-002 | Completed | same files | Passed | N/A | N/A | Planned | Added explicit same-document success, `domcontentloaded` success, and provisional-failure regression coverage. |
| T-004 | DS-004 | Stage 7 validation/build | dependency bootstrap, focused Electron validation, and Electron build for user testing | `autobyteus-web/package.json`, Stage 7 artifact only if source stays unchanged | same | Execute | T-001, T-002, T-003 | Completed | `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts`, `autobyteus-web/electron/browser/__tests__/browser-shell-controller.spec.ts` | Passed | `tickets/done/browser-navigate-load-hang/api-e2e-testing.md` | Passed | Planned | Dependency bootstrap, focused Electron browser validation, and the macOS Electron package build all completed successfully; Stage 7 handoff artifacts now point at the packaged app outputs for user testing. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001`, `DS-002` | `Solution Sketch`, `Spine-Led Dependency And Sequencing Map` | `UC-001` | `T-001`, `T-002`, `T-003` | Unit | `AV-001` |
| `R-002` | `AC-002` | `DS-001`, `DS-002`, `DS-003` | `Solution Sketch` | `UC-002` | `T-001`, `T-003` | Unit | `AV-002` |
| `R-003` | `AC-003` | `DS-002`, `DS-003` | `Solution Sketch` | `UC-003` | `T-001`, `T-003` | Unit | `AV-003` |
| `R-004` | `AC-004` | `DS-001`, `DS-002`, `DS-003` | `Solution Sketch`, `Principles` | `UC-001`, `UC-002`, `UC-003` | `T-001`, `T-002`, `T-003` | Unit | `AV-001`, `AV-002`, `AV-003` |
| `R-005` | `AC-005` | `DS-004` | `Implementation Work Table` | `UC-004` | `T-004` | Integration / Process | `AV-004` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001`, `DS-002` | full document navigation returns `navigated` and updates tab URL | `AV-001` | `Integration` | Planned |
| `AC-002` | `R-002` | `DS-001`, `DS-002`, `DS-003` | same-document navigation resolves without indefinite wait | `AV-002` | `Integration` | Planned |
| `AC-003` | `R-003` | `DS-002`, `DS-003` | provisional/cancelled navigation rejects with browser error | `AV-003` | `Integration` | Planned |
| `AC-004` | `R-004` | `DS-001`, `DS-002`, `DS-003` | executable evidence and artifact review align with Electron semantics | `AV-001`, `AV-002`, `AV-003` | `Integration` | Planned |
| `AC-005` | `R-005` | `DS-004` | Electron app is built and user validation steps are documented | `AV-004` | `Process` | Planned |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | stale event-only wait assumptions in `browser-tab-navigation.ts` | Remove/Refactor | replace narrow wait logic with one authoritative settlement flow | avoid introducing duplicated wait paths |

### Step-By-Step Plan

1. Refactor `BrowserTabNavigation` so document success, in-page success, and provisional failure are all first-class settlement outcomes.
2. Align `BrowserTabManager` / `reload()` with the updated helper semantics only where necessary.
3. Expand browser Electron tests to model the missing lifecycle events and prove the regression cases.
4. Bootstrap dependencies in the dedicated worktree, run focused validation, and build the Electron app for Stage 7 user testing.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Spine Span Sufficiency preserved (implementation still follows a global enough primary spine, not only a local touched path): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/browser-navigate-load-hang/code-review.md`
- Scope (source + tests):
  - `autobyteus-web/electron/browser/browser-tab-navigation.ts`
  - `autobyteus-web/electron/browser/browser-tab-manager.ts` if touched
  - `autobyteus-web/electron/browser/__tests__/browser-tab-manager.spec.ts`
  - `autobyteus-web/electron/browser/__tests__/browser-shell-controller.spec.ts` if touched
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - keep changed source files below the hard limit; split helper logic before review if needed
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - record the assessment in Stage 8 if any source file crosses the threshold
- file-placement review approach:
  - confirm the fix remains in the Electron browser subsystem and does not leak lifecycle policy into unrelated boundaries

### Test Strategy

- Unit tests:
  - browser Electron unit tests around `BrowserTabManager` / `BrowserTabNavigation` fake lifecycle behavior
- Integration tests:
  - focused Electron-side test execution under `autobyteus-web/electron/`
- Stage 6 boundary:
  - file and service-level verification only
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/browser-navigate-load-hang/api-e2e-testing.md`
  - expected acceptance criteria count: `5`
  - critical flows to validate:
    - document navigation success
    - same-document navigation success
    - provisional/cancelled navigation failure
    - Electron build + user validation handoff
  - expected scenario count: `4`
  - known environment constraints:
    - dedicated worktree currently lacks dependencies and must be bootstrapped before validation/build

### Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| none currently | N/A | N/A | N/A | Pending |

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/browser-navigate-load-hang/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/browser-navigate-load-hang/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-06: Stage 3 small-scope design basis drafted from investigation and design-ready requirements.
- 2026-04-06: Stage 5 review reached `Go Confirmed`; Stage 6 implementation can begin once code edits are unlocked in workflow state.
- 2026-04-06: Implemented the navigation waiter fix in `browser-tab-navigation.ts`, expanded Electron browser regression coverage, bootstrapped dependencies in the dedicated worktree, and passed the focused Electron browser validation command.
- 2026-04-06: Added the missing full-document `navigateSession(..., wait_until: "load")` regression, reran the focused Electron browser suite successfully (`18` tests passed), and completed the macOS Electron package build for Stage 7 user handoff.
