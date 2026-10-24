# Implementation Handoff

Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread/tickets/in-progress/org-settings-save-stale-reread/` (paths below are relative to it unless absolute).
Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread`, branch `fix/org-settings-save-stale-reread`, base `origin/personal` @ `1138e8fbef`. Code commit `29b51ebcef`.

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Architecture Design Complete, `Small` + `Low` → direct implementation (no architecture review), per `solution-designer-handoff.md`
- Requirements doc: `requirements-doc.md` (SR-001, Approved)
- Investigation notes: `investigation-notes.md`
- Solution revision record: `solution-revision-record.md`
- Design spec (required on every route): `design-spec.md` (SR-001, Ready)
- Supplemental task artifacts: `evidence/repro-org-reread-race.spec.ts`, `evidence/SD-01-repro-org-reread-race.log`
- Design review report: `N/A — not applicable` (independent architecture review not selected)
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence, when applicable: N/A (initial)

## Current Implementation Summary

`agentOrgContextsStore.readRunConfig` now separates two kinds of change during the canonical read:

- *Target change* — the Org's context released, the node binding changed, an Org operation pending, or an Org inspection pending → refuses with the unchanged error "Org configuration read is stale; refresh required." (Settings keeps showing "Settings were saved, but could not be refreshed…" with Refresh).
- *View refresh* — the same Org's context or `view` object replaced (the stream's checkpointed reload after a live Save) → reads again with the current context/view, up to `MAX_CONFIG_READ_ATTEMPTS = 3`, then refuses with the same error.

The same rule applies after the stopped-Org metadata preparation; the existing refusal when the Org is no longer stopped (same view) is kept. Signature and result are unchanged; both callers (`existingRunConfigStore.ts:243`, `existingRunConfigResultActions.ts:148`) are untouched. One sentence added to `autobyteus-web/docs/settings.md` ("Save recovery").

- Implementation cycle: `Initial`
- Implementation revision record: `implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size (`Small`/`Medium`/`Large`): `Small`
- Architecture risk (`Low`/`High`): `Low`
- Design classification section / evidence reference: `design-spec.md` "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale for confirmation or change: one function in one web store (+36/−14 across store and docs), one new spec file; no API, server, stream, persistence or contract change; the concurrency change is a bounded re-read inside the existing owner.
- Selected route (`Direct API/E2E`/`Code Review`/`Solution Designer`): `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (see below)
- New design impact or escalation trigger: `None`

### Lightweight self-review

- Retry policy lives only in the owner (`readRunConfig`); no caller retries (design's forbidden shape avoided).
- Each attempt re-resolves the owner through `requireConfigOwner`; on a later attempt it cannot throw unexpectedly, because `targetChanged()` is checked synchronously just before `continue`.
- Preserved refusals (released / binding / operation) produce the same error text and pass on base and on the fix (IMP-00, IMP-01).
- Live Org whose canonical says `isActive: false` while its view is still live: returns canonical without applying, as on base.
- Stopped-Org branch: `prepareConfigWorkspaces`' `isCurrent` callback is the conjunction of the new checks, equivalent to base `current()`; after it, a view refresh takes the next attempt, a target change refuses, an Org no longer stopped refuses (base behavior).
- Bounded: at most 3 `AgentOrgRunConfig` requests per call (IMP-01 "gives up … after 3 reads").

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | REQ-001: view refresh of the same Org mid-read → read completes with current canonical settings | DS-001/DS-003: `ExistingRunConfigEditor` Save → `delegatedLaunchDraftStore.save` → `existingRunConfigStore.reloadCanonical(true)` → `loadAgentOrgCanonical` → `agentOrgContextsStore.readRunConfig` (loop: `consistent()` → `continue` on `viewRefreshed()`) → `readAgentOrgRunConfig` | Implemented; IMP-01 cases 1–2 pass (fail on base, IMP-00) |
| BEH-001 | REQ-002: target change → existing stale error; bound of 3 attempts | `readRunConfig` `targetChanged()` → `throw stale()`; `attempt < MAX_CONFIG_READ_ATTEMPTS` | Implemented; IMP-01 refusal cases + bound case pass |
| BEH-002 | Preserved: Org stream checkpointed reload | `agentOrgStreamingService`, `agentOrgExecutionContext` — not touched | Unchanged; IMP-02 stream specs pass |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- `autobyteus-web/stores/agentOrgContextsStore.ts` — `MAX_CONFIG_READ_ATTEMPTS` constant and `readRunConfig` (402 non-empty lines, was 399; < 500)
- `autobyteus-web/stores/__tests__/agentOrgRunConfigRead.spec.ts` — new; the folded-in reproduction (no `zz-probe` name) plus AC-003 cases
- `autobyteus-web/docs/settings.md` — "Save recovery" sentence

## Important Assumptions

- ASM-001 (requirements): one view reload per Save, so 3 attempts suffice. API/E2E's AC-001 loop confirms it on the real stack.

## Known Risks

- A pending Org **inspection** is now a target change after the read (base checked it only before the read, via `requireConfigOwner`). This follows the design's Terminology ("an Org operation … an inspection pending"). On base the same situation would usually still fail once the inspection published a new context. It is the one refusal case that differs from base (IMP-00 "inspection" fails on base).
- Another stale source on the real stack (design Risks) is visible only in the AC-001 loop.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Bug Fix`
- Reviewed root-cause classification: `Missing Invariant`
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the guard was split into target and view checks exactly as the design's shape guidance.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes` (the old `current()` closure was replaced, no leftover)
- Dead code found elsewhere, added to `follow-ups.md`: None
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails: `Yes` (402 lines; delta well under 220)
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Direct-use evidence or discard/rebuild result: N/A
- Migration implementation and focused checks: N/A
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- Worktree deps installed and `nuxi prepare` done by the Solution Designer; nothing added.
- `autobyteus-web` has no typecheck script; plain `tsc -p .nuxt/tsconfig.json` reports 1161 pre-existing errors in other files (discrepancy noted; IMP-03).

## Checks Run

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result (`Pass`/`Fail`) | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-00 | New spec against the base `readRunConfig` (fix stashed) | spec of `29b51ebcef`, store of `1138e8fbef` | macOS, Node, vitest 3.2.7 | `readRunConfig` (base) | AC-002, AC-003 | Fail as expected (4 of 7) | `evidence/IMP-00-new-spec-on-base-store.log` | `Tests  4 failed \| 3 passed (7)` |
| IMP-01 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentOrgRunConfigRead.spec.ts --run --reporter=verbose` | `29b51ebcef` | macOS, Node, vitest 3.2.7 | `agentOrgContextsStore.readRunConfig` | AC-002, AC-003, REQ-001…003 | Pass | `evidence/IMP-01-unit-org-run-config-read.log` | `Tests  7 passed (7)` |
| IMP-02 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/agentOrg stores/__tests__/existingRunConfig stores/__tests__/delegatedLaunchDraftStore.spec.ts stores/__tests__/nativeOrgCompactionTermination.spec.ts stores/__tests__/retainedOrgActivityTermination.spec.ts services/agentOrgExecution components/layout/__tests__/RightSideTabs.workspaceTarget.spec.ts components/workspace/org/__tests__/AgentOrgWorkspaceConfigBoundary.spec.ts components/workspace/config --run` | `29b51ebcef` | macOS, Node, vitest 3.2.7 | Org contexts store, Org stream/context services, Settings stores and editor components | AC-004 (unit layer), BEH-002 | Pass | `evidence/IMP-02-unit-related-org-settings-suites.log` | `Test Files  33 passed (33)`, `Tests  359 passed (359)` |
| IMP-03 | `pnpm -C autobyteus-web exec tsc --noEmit -p .nuxt/tsconfig.json`, filtered to changed files | `29b51ebcef` | macOS | `agentOrgContextsStore.ts`, `agentOrgRunConfigRead.spec.ts` | — | Pass (0 errors in changed files) | `evidence/IMP-03-tsc-changed-files.log` | only match is the untouched `agentOrgContextsStore.spec.ts(68,64)` |

- Not run, and why: AC-001 browser probe loop (≥ 12 Saves, `delegated-launch-defaults-probe.mjs` DCP-003/DCR-003) and AC-004's DCP-001…005/DCR-001…003 probe cases — API/E2E-owned on a built worktree stack. AC-005 — the user's check. Full `test:nuxt` suite — not needed for a one-function change; IMP-02 covers every spec that drives `readRunConfig` and the Org/Settings paths.

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable` — no rendered change; the store fix only stops a spurious error message. The visible outcome (no "could not be refreshed" message across ≥ 12 Saves) is AC-001's browser probe, owned by API/E2E.

## Downstream Coverage Hints / Suggested Scenarios

- AC-001: running Org, one delegated copy stopped, change its model and Save ≥ 12 times; count "could not be refreshed" messages (expect 0; base 4/12). Optionally watch for the CONNECTED + ROOT_EXECUTION_VIEW_SNAPSHOT after each Save (BEH-002 still happens) and that a Save that hits the race issues a second `AgentOrgRunConfig` request.
- AC-004: DCP-001…DCP-005, DCR-001…DCR-003.
- Optional negative: switch node or Stop the Org while a re-read is in flight → existing message with Refresh.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-001 loop and AC-004 probe cases on a worktree build (TESTING.md Rules 1–5).
- AC-005 is the user's check before finalization (Solution Designer / delivery).
