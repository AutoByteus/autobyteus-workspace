# Implementation Handoff — autobyteus-508

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Small / Low, direct implementation route (no independent architecture review); `get_handoff_rules` 2026-11-17: Small/Medium + Low with self-review complete → `/api_e2e_engineer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/requirements-doc.md` (SR-001, Approved by the founder)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/solution-revision-record.md`
- Design spec (required on every route): `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/design-spec.md` (SR-001, Ready, design approval Obtained)
- Supplemental task artifacts: `probes/probe-508-runtime-selection.test.ts` (reproduction; red 3/3 before, green 3/3 after; not committed under `tests/`)
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

`run-file-conversion.ts` now applies a released Settings edit (`userLaunchSelection`) whole through one module-local `withEdit(launch, edit)`: the edit's `runtimeKind` when it names one (else the started runtime stays), `llmModelIdentifier`, `llmConfig ?? null`. Both conversions use it: `convertAgentRunFile` applies it to the run's own top-level fields; `convertTeamRunFile` applies it to the `launchConfiguration` of a member with its own edit, or of a member that follows the team when the team has an edit. Every edited record now records `launchSource: SETTINGS_EDIT_SOURCE` (`{ origin: "settings", fallbacks: [] }`, a frozen literal local to the migration file: sealed migration area, no application import). Unedited members keep their recorded `launchSource`; pending runtime switches, the team default launch, addresses, origins, dispositions and the registry are unchanged. `withSelection` and the inline agent-run mapping are removed; local names `selection`/`teamSelection`/`own` became `edit`/`teamEdit`. Doc comments updated.

Same migration IDs (`20261111_delegated_runs_own_runs_v1` and the `20261114_*` follow-ups, which reuse these functions): no new migration, no registry change.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Code commit: `e0b58997f3` on `codex/member-runtime-lost-508` (base `298bd7a60a`; `origin/personal` @ `a8ac226e65`).

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: one source file changed (+29/−13 lines, 137 non-empty lines), plus fixtures and test cases in the existing 461 test files. No change to dispositions, registry, current schema or readers; the produced shape loads through the current `AgentRunMetadataStore` and `validateTeamRunExecutionTreePayload` (IMP-01). None of the design's escalation triggers fired.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. Checked: both conversion paths use the one rule; `runtimeKind` applied only when the edit names one (`text()` guard, as the released `??` rule); `llmConfig ?? null` kept; the member `isRecord(launch)` guard kept at the call site so `withEdit` stays typed on records; the pending switch is untouched (member `...member` spread; agent move to the top level as before); the `!teamEdit` condition for `defaultLaunchSource` is unchanged; no application import (the only import is `./released-delegation-scan.js`); the frozen source object is shared only for serialization by the atomic writer.
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001, AC-001) | Member's own edit: runtime + model + settings; Settings source | `convertTeamRunFile` → `withEdit(member.launchConfiguration, edit)`, `launchSource: SETTINGS_EDIT_SOURCE` | Pass: test "a member's own edit … (AC-001)" (IMP-01); red before the fix (IMP-05) |
| BEH-001 (REQ-001, REQ-002, AC-002) | Team edit reaches followers whole; member's own edit wins with its runtime; unedited member keeps launch and source | `convertTeamRunFile`: `edit = own ?? (followsTeam ? teamEdit : null)` | Pass: test "(AC-002)"; team default launch unchanged and no `defaultLaunchSource` beside a team edit (preserved) |
| BEH-001 (REQ-001, REQ-002, AC-003) | Delegated agent run edit: top-level runtime + model + settings; Settings source; loads | `convertAgentRunFile` → `withEdit(own, edit)`, `launchSource: SETTINGS_EDIT_SOURCE` | Pass: test "(AC-003)", read through `AgentRunMetadataStore.readMetadataState` = present with `codex_app_server` |
| BEH-001 (REQ-001, AC-004) | Model-only edit keeps the started runtime, plus the Settings source | `withEdit` applies `runtimeKind` only when named | Pass: existing main-scenario expectations updated only for the source (and now assert runtime + settings) |
| BEH-001 (REQ-001, AC-005) | Pending switch kept beside the new runtime, `from` the started binding | unchanged pending-switch handling, now beside the edit's runtime | Pass: test "(AC-005)" for a team member and an agent run; both load through the current readers |
| BEH-001 (REQ-003, AC-006, QR-001) | Same IDs; registry unchanged; follow-ups produce the corrected result | `PreservedItemsFollowUp` reuses the functions | Pass: follow-up test "(autobyteus-508 AC-006)"; registry order test unchanged and passing; second start changes nothing |
| BEH-002 | Founder repairs his own converted data | — | Not touched (out of scope) |
| REQ-004 | Release before 461 reaches stable; release only on the founder's word | — | Delivery/release gate; nothing in implementation |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-server-ts/src/app-data-migrations/migrations/delegated-runs-own-runs-v1/run-file-conversion.ts` — the fix.
- `autobyteus-server-ts/tests/fixtures/app-data-migrations/released-delegation-shape-fixtures.ts` — hand-built released shapes: `writeReleasedRuntimeEdits` (member own edit made real; team-level edit with a follower, an own edit on another runtime and an unedited member; a pending switch in a team and in an agent run; an agent run edit made real), `releasedMemberEditTeam`, `startedOn`, `runtimeEdit`, `pendingSwitch`. Neutral run IDs; nothing derived from the founder's data beyond the shape (runtime/model identifiers).
- `autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/delegated-runs-own-runs-v1-app-data-migration.test.ts` — AC-004 expectations (lines ~124-133); new `describe("a Settings edit that names another agent runtime (autobyteus-508)")` with AC-001, AC-002, AC-003, AC-005 and a second-start check.
- `autobyteus-server-ts/tests/app-data-migrations/delegated-runs-own-runs-v1/delegated-runs-preserved-items-v1.test.ts` — AC-006 follow-up case.

## Important Assumptions

- The released shape of a runtime-switching copy edit (beta.6 `delegated-launch-selection.ts`, `runtime-selection-rule.ts`): the started launch stays in `launchConfiguration`/top-level fields; `userLaunchSelection` carries the chosen runtime; a not-yet-real switch has `platformAgentRunId: null` and `pendingRuntimeSwitch.from` = the started binding; once made real, a new session and no pending switch. Fixtures follow this.

## Known Risks

- REQ-004: the corrected conversion must ship before 461 reaches a stable release; release only on the founder's word (delivery).
- Already-converted installations (only the founder's) are skipped by design and keep their data; he repairs it himself.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Bug Fix
- Reviewed root-cause classification: Local Implementation Defect
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): `No Refactor Needed`
- Implementation matched the reviewed assessment (`Yes`/`No`): `Yes`
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): `N/A`
- Evidence / notes: the edit rule now lives once (`withEdit`) and both paths use it, as the design's "Repeated coordination" response required.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (`withSelection` and the inline agent mapping removed)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Deviations from a design principle decided during implementation: `None`. One placement detail: the design text says "keep `withEdit`'s `isRecord(launch)` guard"; the guard sits at the member call site instead, so `withEdit` is typed `(RawRecord, RawRecord) => RawRecord` as the design's Interface Boundary Mapping specifies and serves the agent run directly. Same behavior.
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (137 non-empty lines; delta +29/−13)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Migration Required` (same-ID correction of the released migration, guideline §7)
- Design-spec decision reference: design-spec.md "Persisted Data / State Transition Decision", "Migration Plan"
- Implementation follows the approved decision without an unapproved migration or version-specific runtime fallback: `Yes` — no new migration, no registry change, no runtime/reader change.
- Direct-use evidence or discard/rebuild result, when applicable: N/A
- Migration implementation and focused checks: value mapping in `run-file-conversion.ts`; IMP-01 (461 folder + registry order), IMP-02 (all app-data migration tests), IMP-05 (red before the fix).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- The worktree needed `pnpm install --frozen-lockfile` (the `applications/*` packages were not linked: 74 spurious production typecheck errors in `applications/brief-studio` before it) and `pnpm -C autobyteus-server-ts prepare:source` (Prisma client). TESTING.md "Install and build first" covers this.
- `prepare:shared` leaves untracked `autobyteus-application-backend-sdk/dist/` and `autobyteus-application-sdk-contracts/dist/` in the worktree (not git-ignored); not committed.

## Checks Run

Evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/member-runtime-lost-508/tickets/in-progress/member-runtime-lost-508/evidence/`. Environment for all: macOS 26.5.2, Node v22.23.1, pnpm 10.28.2.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/app-data-migrations/delegated-runs-own-runs-v1/ tests/unit/app-data-migrations/app-data-migration-registry-order.test.ts --no-watch` | `e0b58997f3` | as above | `run-file-conversion.ts` via the 461 migration and its follow-ups; registry | AC-001…AC-006, QR-001 | Pass | `IMP-01-461-folder-and-registry-order.log` | `Tests  29 passed (29)` |
| IMP-02 | `pnpm -C autobyteus-server-ts exec vitest run tests/app-data-migrations --exclude "**/*.integration.test.ts" --no-watch` | `e0b58997f3` | as above | every app-data migration test (incl. upgrade paths) | QR-001, preserved behavior | Pass | `IMP-02-app-data-migrations-folder.log` | `Tests  602 passed (602)` |
| IMP-03 | `pnpm -C autobyteus-server-ts typecheck` | `e0b58997f3` | as above | server `src` + tests | — | Pass | `IMP-03-server-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 1012 in 316 files (baseline 1012 in 316 files)` |
| IMP-04 | `pnpm -C autobyteus-web typecheck` | `e0b58997f3` | as above | web + cross-package tests | — | Pass | `IMP-04-web-typecheck.log` | `[typecheck] production errors: 0; test-file errors: 87 in 37 files (baseline 87 in 37 files)` |
| IMP-05 | The tests of `e0b58997f3` with `run-file-conversion.ts` from `298bd7a60a` (steps in the log header), then restored | tests `e0b58997f3`, source `298bd7a60a` | as above | the old conversion | AC-001…AC-006 (expected red) | Pass (fails as expected) | `IMP-05-new-tests-red-on-old-conversion.log` | `Tests  6 failed \| 20 passed (26)`: AC-001, AC-002, AC-003, AC-005, AC-006 and the main scenario (AC-004 source) |
| IMP-06 | Designer's probe copied into the 461 test folder, run, removed | `e0b58997f3` | as above | both conversions | REQ-001 (AC-001…AC-003) | Pass | `IMP-06-probe-green.log` | `Tests  3 passed (3)` |

- Not run, and why: server `test:unit` beyond `tests/app-data-migrations` and the registry test (no other code imports the changed file); integration suites; the startup E2E `tests/e2e/app-data-migrations/delegated-runs-own-runs-startup.e2e.test.ts` (imports the changed fixture file but asserts nothing about edits; needs a built `dist/app.js`) — left to API/E2E.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` — backend data-conversion change; the visible effect (stored runtime; Settings source instead of "Inherited from the run") comes from the stored data, no UI change.

## Downstream Coverage Hints / Suggested Scenarios

- Run the startup E2E `delegated-runs-own-runs-startup.e2e.test.ts` (it writes `writeReleasedWorld`, whose edited members now carry the Settings source) on a fresh build of this branch.
- A realistic upgrade check: a ≤ beta.6 app-data folder built from hand-made released shapes (e.g. `writeReleasedWorld` + `writeReleasedRuntimeEdits`), started on this branch's server; restore the converted team/agent runs and confirm each edited run shows its chosen runtime and model and the Settings source (not "Inherited from the run"). Never the founder's data.
- A pending switch (AC-005) converted then given its next input: the switch should become real on the new runtime.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- Executable validation through the surfaces TESTING.md names for app-data migrations (startup E2E above), and the realistic upgrade scenario if the API/E2E engineer judges it proportionate.
