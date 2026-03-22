# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning:
  - The change stays inside the existing terminal runtime and XML parsing boundaries in `autobyteus-ts`.
  - The fix reuses existing backends and parser ownership instead of introducing a new subsystem.
- Workflow Depth:
  - Small-scope path with implementation baseline, targeted automated validation, code review, docs sync, and handoff.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/run-bash-posix-spawn-failure/workflow-state.md`
- Investigation notes: `tickets/done/run-bash-posix-spawn-failure/investigation-notes.md`
- Requirements: `tickets/done/run-bash-posix-spawn-failure/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/run-bash-posix-spawn-failure/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/run-bash-posix-spawn-failure/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `In Execution`
- Notes:
  - Stage 6 source changes are complete.
  - This artifact also records the Stage 7 scenario inputs, Stage 8 review inputs, and Stage 9 docs-sync baseline.

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
  - `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`
- Spine Inventory In Scope:
  - `DS-001`: foreground terminal session startup and recovery
  - `DS-002`: background process startup and recovery
  - `DS-003`: XML tool-call argument normalization
- Primary Owners / Main Domain Subjects:
  - `autobyteus-ts/src/tools/terminal/*`
  - `autobyteus-ts/src/agent/streaming/adapters/*`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - `R-001`..`R-006` map to `UC-001`..`UC-005`
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-001`: preserve working terminal behavior when `node-pty` fails in native startup
  - `UC-004`: decode XML entities exactly once without corrupting plain text
- Target Architecture Shape:
  - keep `PtySession` as the preferred Unix backend
  - repair `node-pty` helper permissions before PTY startup when possible
  - keep shared startup fallback logic in one terminal helper used by both foreground and background managers
  - normalize XML leaf text at the shared parser boundary
- New Owners/Boundary Interfaces To Introduce:
  - `node-pty-bootstrap.ts` for helper-path discovery and executable-bit repair
  - `session-startup.ts` for shared startup/fallback policy
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta:
  - `run_bash` survives the macOS `spawn-helper` permission bug
  - terminal managers no longer retain stale failed sessions
  - XML `run_bash` command text is decoded before invocation execution
- Key Assumptions:
  - `DirectShellSession` remains the correct non-PTY recovery backend
  - production installs run package lifecycle scripts or otherwise allow best-effort runtime repair
- Known Risks:
  - if the runtime cannot repair the helper and direct shell is also unavailable, startup still fails with the aggregated root cause

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `Round 2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`
- If `No-Go`, required refinement target:
  - `N/A`

### Principles

- Bottom-up: repair PTY bootstrap before manager-level orchestration.
- Test-driven: add targeted regression coverage for runtime recovery and parser normalization.
- Spine-led implementation rule: terminal startup behavior stays owned by terminal runtime code; XML normalization stays owned by adapter parsing.
- Mandatory modernization rule: no backward-compatibility shims or dual-path legacy code.
- Mandatory cleanup rule: remove stale failed-session retention within manager startup flow.
- Mandatory ownership/decoupling/SoC rule: one shared startup helper, one PTY bootstrap helper, no per-tool hacks.
- Mandatory shared-structure coherence rule: keep tool-argument normalization in the existing shared parser flow.
- Mandatory file-placement rule: place terminal-runtime helpers under `src/tools/terminal/`; keep adapter normalization in `src/agent/streaming/adapters/`.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001`, `DS-002` | `tools/terminal` | add shared startup/fallback helper | N/A | both managers depend on the same recovery policy |
| 2 | `DS-001` | `tools/terminal` | repair `node-pty` spawn-helper permissions before PTY startup | 1 | addresses the native root cause without changing the preferred backend |
| 3 | `DS-001`, `DS-002` | `tools/terminal` | wire managers to startup helper and stale-session cleanup | 1, 2 | reuses shared policy after bootstrap repair exists |
| 4 | `DS-003` | `agent/streaming/adapters` | decode XML entities once in shared parsing/build path | N/A | independent parser boundary work |
| 5 | `DS-001`, `DS-002`, `DS-003` | tests | add/adjust unit and integration coverage | 1, 2, 3, 4 | verifies the repaired flow and parser behavior |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| PTY bootstrap repair helper | `N/A` | `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | shared Unix terminal bootstrap | Keep | targeted unit test + `PtySession` integration |
| shared startup recovery helper | `N/A` | `autobyteus-ts/src/tools/terminal/session-startup.ts` | shared terminal manager startup orchestration | Keep | foreground + background terminal tests |
| install-time helper repair script | `N/A` | `autobyteus-ts/scripts/fix-node-pty-permissions.mjs` | package lifecycle / dependency bootstrap | Keep | package `postinstall` hook + runtime validation |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | `tools/terminal` | PTY helper bootstrap repair | `N/A` | `autobyteus-ts/src/tools/terminal/node-pty-bootstrap.ts` | Create | N/A | Completed | `tests/unit/tools/terminal/node-pty-bootstrap.test.ts` | Passed | `tests/integration/tools/terminal/pty-session.test.ts` | Passed | Planned | repairs `spawn-helper` execute bit when missing |
| `C-002` | `DS-001`, `DS-002` | `tools/terminal` | shared startup fallback orchestration | `N/A` | `autobyteus-ts/src/tools/terminal/session-startup.ts` | Create | `C-001` | Completed | `tests/unit/tools/terminal/terminal-session-manager.test.ts`, `tests/unit/tools/terminal/background-process-manager.test.ts` | Passed | `tests/integration/tools/terminal/terminal-tools.test.ts` | Passed | Planned | keeps stale failed session objects out of manager state |
| `C-003` | `DS-001` | `tools/terminal` | prefer PTY but repair/helper-fallback on startup | `autobyteus-ts/src/tools/terminal/pty-session.ts` | same | Modify | `C-001`, `C-002` | Completed | `tests/unit/tools/terminal/pty-session.test.ts` | Passed | `tests/integration/tools/terminal/pty-session.test.ts` | Passed | Planned | runtime repairs helper before `node-pty.spawn(...)` |
| `C-004` | `DS-001`, `DS-002` | `tools/terminal` | manager wiring + fallback policy | `autobyteus-ts/src/tools/terminal/terminal-session-manager.ts`, `autobyteus-ts/src/tools/terminal/background-process-manager.ts`, `autobyteus-ts/src/tools/terminal/session-factory.ts` | same | Modify | `C-002` | Completed | `tests/unit/tools/terminal/session-factory.test.ts`, `tests/unit/tools/terminal/terminal-session-manager.test.ts`, `tests/unit/tools/terminal/background-process-manager.test.ts` | Passed | `tests/integration/tools/terminal/terminal-tools.test.ts`, `tests/integration/tools/terminal/direct-shell-session.test.ts` | Passed | Planned | fallback remains `DirectShellSession` only where applicable |
| `C-005` | `DS-003` | `agent/streaming/adapters` | XML leaf-text decode once | `autobyteus-ts/src/agent/streaming/adapters/tool-call-parsing.ts`, `autobyteus-ts/src/agent/streaming/adapters/tool-syntax-registry.ts` | same | Modify | N/A | Completed | `tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`, `tests/unit/agent/streaming/parser/invocation-adapter.test.ts` | Passed | `N/A` | N/A | Planned | command text reaches `run_bash` decoded exactly once |
| `C-006` | `DS-001` | `package bootstrap` | install-time repair | `autobyteus-ts/package.json` | same | Modify | `C-001` | Completed | `N/A` | N/A | `tests/integration/tools/terminal/terminal-tools.test.ts` | Passed | Planned | `postinstall` repairs `node-pty` helper for future installs |

### Requirement, Acceptance, And Use-Case Traceability

| Requirement ID | Acceptance Criteria ID(s) | Spine ID(s) | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001` | `UC-001` | `C-001`, `C-002`, `C-003`, `C-004` | Unit + Integration | `AV-001` |
| `R-002` | `AC-002` | `DS-001` | `UC-002` | `C-002`, `C-004` | Unit | `AV-002` |
| `R-003` | `AC-003` | `DS-002` | `UC-003` | `C-002`, `C-004` | Unit + Integration | `AV-003` |
| `R-004`, `R-005` | `AC-004`, `AC-005` | `DS-003` | `UC-004` | `C-005` | Unit | `AV-004`, `AV-005` |
| `R-006` | `AC-006` | `DS-001`, `DS-002`, `DS-003` | `UC-005` | `C-001`..`C-006` | Unit + Integration | `AV-006` |

### Acceptance Criteria To Stage 7 Mapping (Mandatory)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | terminal startup recovers to a working backend after PTY failure conditions | `AV-001` | API | Planned |
| `AC-002` | `R-002` | `DS-001` | repeated calls avoid stale `Session not started` cascade | `AV-002` | API | Planned |
| `AC-003` | `R-003` | `DS-002` | background startup succeeds under the same recovery policy | `AV-003` | API | Planned |
| `AC-004` | `R-004` | `DS-003` | XML leaf text decodes `&amp;&amp;` and related entities | `AV-004` | API | Planned |
| `AC-005` | `R-004`, `R-005` | `DS-003` | `run_bash` invocation receives decoded command text | `AV-005` | API | Planned |
| `AC-006` | `R-006` | `DS-001`, `DS-002`, `DS-003` | relevant targeted regressions remain green | `AV-006` | API | Planned |

### Step-By-Step Plan

1. Reproduce the raw `node-pty.spawn('bash', ...)` failure and isolate whether the bug is installation, environment, or native helper startup.
2. Repair the PTY bootstrap path and manager startup recovery without changing platform policy ownership.
3. Add parser normalization for XML entities at the shared adapter boundary.
4. Reset the helper to the broken permission state and rerun targeted tests to prove the recovery path.
5. Review changed source structure, sync long-lived docs, and hand back for user verification.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/run-bash-posix-spawn-failure/code-review.md`
- Scope (source + tests):
  - terminal runtime bootstrap and startup helpers
  - XML parser normalization
  - targeted unit/integration tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - none of the changed source files are expected to approach the threshold; if they did, Stage 8 would fail and re-enter.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - measure each changed source file individually and record `Pass` when under the gate.
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - `Design Impact` re-entry if any changed source file exceeds the size hard limit.
- file-placement review approach (how wrong-folder placements will be detected and corrected):
  - verify terminal bootstrap helpers live under `src/tools/terminal/` and XML normalization stays under `src/agent/streaming/adapters/`.

### Test Strategy

- Unit tests:
  - `tests/unit/tools/terminal/node-pty-bootstrap.test.ts`
  - `tests/unit/tools/terminal/pty-session.test.ts`
  - `tests/unit/tools/terminal/session-factory.test.ts`
  - `tests/unit/tools/terminal/terminal-session-manager.test.ts`
  - `tests/unit/tools/terminal/background-process-manager.test.ts`
  - `tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts`
  - `tests/unit/agent/streaming/parser/invocation-adapter.test.ts`
- Integration tests:
  - `tests/integration/tools/terminal/pty-session.test.ts`
  - `tests/integration/tools/terminal/direct-shell-session.test.ts`
  - `tests/integration/tools/terminal/terminal-tools.test.ts`
- Stage 6 boundary: file/service-level verification only, using targeted unit and integration tests.
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `6`
  - critical flows to validate (API/E2E):
    - repaired PTY bootstrap from broken helper permission state
    - manager recovery behavior and no stale-session cascade
    - XML command normalization
  - expected scenario count: `6`
  - known environment constraints:
    - macOS `node-pty@1.1.0` publishes `spawn-helper` without execute permission
- Stage 8 handoff notes for code review:
  - predicted design-impact hotspots:
    - terminal bootstrap/helper placement
    - fallback ownership staying centralized
  - predicted file-placement hotspots:
    - keep install-time repair in `scripts/`, not in runtime `src/`
  - predicted interface/API/query/command/service-method boundary hotspots:
    - avoid duplicating startup fallback logic across managers
  - files likely to exceed size/ownership/SoC thresholds:
    - none

### API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `DS-001` | Requirement | `AC-001` | `R-001` | `UC-001` | API | repaired terminal startup produces a successful `run_bash` foreground command |
| `AV-002` | `DS-001` | Requirement | `AC-002` | `R-002` | `UC-002` | API | repeated foreground calls do not emit stale-session errors |
| `AV-003` | `DS-002` | Requirement | `AC-003` | `R-003` | `UC-003` | API | background process startup succeeds under recovery path |
| `AV-004` | `DS-003` | Requirement | `AC-004` | `R-004` | `UC-004` | API | XML parser decodes encoded command text once |
| `AV-005` | `DS-003` | Requirement | `AC-005` | `R-004`, `R-005` | `UC-004` | API | invocation adapter emits decoded `run_bash` command arguments |
| `AV-006` | `DS-001`, `DS-002`, `DS-003` | Requirement | `AC-006` | `R-006` | `UC-005` | API | targeted regression suite stays green from the broken helper baseline |

### API/E2E Testing Escalation Policy (Stage 7 Guardrail)

- Classification rules for failing API/E2E scenarios:
  - use `Local Fix` only for bounded code/test issues with stable ownership.
  - use `Design Impact` if terminal bootstrap ownership, fallback distribution, or parser boundary ownership drifts.
  - use `Requirement Gap` if XML normalization or PTY recovery semantics prove underspecified.
  - use `Unclear` if the failing scenario cannot be confidently isolated.

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/<ticket-name>/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/<ticket-name>/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-03-22: confirmed `child_process.spawn('bash', ...)` works while raw `node-pty.spawn('bash', ...)` fails with `posix_spawnp failed`.
- 2026-03-22: verified upstream `node-pty@1.1.0` tarball ships `prebuilds/darwin-arm64/spawn-helper` with mode `0644`, which reproduces the native PTY failure.
- 2026-03-22: implemented install-time and runtime `spawn-helper` executable-bit repair, shared manager startup recovery, and XML entity decoding at the parser boundary.
- 2026-03-22: reset `spawn-helper` to `0644`, reran targeted tests, and observed the suite pass from the broken baseline.
- 2026-03-22: completed targeted TypeScript build validation with `tsc -p tsconfig.build.json --noEmit`.

### Scope Change Log

- No scope changes.

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | N/A | No | None | Not Needed | Not Needed | 2026-03-22 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/tools/terminal/node-pty-bootstrap.test.ts tests/integration/tools/terminal/pty-session.test.ts` | helper repaired correctly from the broken permission state |
| `C-002`, `C-003`, `C-004` | N/A | No | None | Not Needed | Not Needed | 2026-03-22 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/tools/terminal/session-factory.test.ts tests/unit/tools/terminal/terminal-session-manager.test.ts tests/unit/tools/terminal/background-process-manager.test.ts tests/integration/tools/terminal/direct-shell-session.test.ts tests/integration/tools/terminal/terminal-tools.test.ts` | foreground/background managers and PTY bootstrap path validated |
| `C-005` | N/A | No | None | Not Needed | Not Needed | 2026-03-22 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec vitest --run tests/unit/agent/streaming/adapters/tool-call-parsing.test.ts tests/unit/agent/streaming/parser/invocation-adapter.test.ts` | XML entity decoding validated at parser and invocation boundaries |
| `C-006` | N/A | No | None | Not Needed | Not Needed | 2026-03-22 | `pnpm -C /Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-posix-spawn-failure/autobyteus-ts exec tsc -p tsconfig.build.json --noEmit` | package lifecycle hook compiles cleanly |

### API/E2E Testing Scenario Log (Stage 7)

| Date | Scenario ID | Spine ID(s) | Governing Owner | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Status | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path Taken | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Resume Condition Met |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-22 | `AV-001` | `DS-001` | `tools/terminal` | Requirement | `AC-001` | `R-001` | `UC-001` | API | Passed | None | No | N/A | N/A | No | No | No | No | Yes |
| 2026-03-22 | `AV-002` | `DS-001` | `tools/terminal` | Requirement | `AC-002` | `R-002` | `UC-002` | API | Passed | None | No | N/A | N/A | No | No | No | No | Yes |
| 2026-03-22 | `AV-003` | `DS-002` | `tools/terminal` | Requirement | `AC-003` | `R-003` | `UC-003` | API | Passed | None | No | N/A | N/A | No | No | No | No | Yes |
| 2026-03-22 | `AV-004` | `DS-003` | `agent/streaming/adapters` | Requirement | `AC-004` | `R-004` | `UC-004` | API | Passed | None | No | N/A | N/A | No | No | No | No | Yes |
| 2026-03-22 | `AV-005` | `DS-003` | `agent/streaming/adapters` | Requirement | `AC-005` | `R-004`, `R-005` | `UC-004` | API | Passed | None | No | N/A | N/A | No | No | No | No | Yes |
| 2026-03-22 | `AV-006` | `DS-001`, `DS-002`, `DS-003` | shared | Requirement | `AC-006` | `R-006` | `UC-005` | API | Passed | None | No | N/A | N/A | No | No | No | No | Yes |

### Acceptance Criteria Closure Matrix (Stage 7 Gate)

| Acceptance Criteria ID | Scenario ID(s) | Current Status | Notes |
| --- | --- | --- | --- |
| `AC-001` | `AV-001` | Passed | terminal flow succeeds from the broken `spawn-helper` baseline |
| `AC-002` | `AV-002` | Passed | no stale `Session not started` cascade remains |
| `AC-003` | `AV-003` | Passed | background process startup stays aligned with foreground recovery behavior |
| `AC-004` | `AV-004` | Passed | XML parser decodes encoded command text |
| `AC-005` | `AV-005` | Passed | invocation adapter emits decoded `run_bash` arguments |
| `AC-006` | `AV-006` | Passed | targeted regression suite remained green |
