# Implementation: Compaction Config Save Button Styling

## Scope Classification

- Classification: `Small`
- Reasoning: The change is confined to one Vue settings card and its existing unit spec. It adjusts local dirty-state/presentation logic without changing APIs or backend settings semantics.
- Workflow Depth: `Small` -> solution sketch -> future-state runtime call stack -> two clean review rounds -> finalize baseline -> implementation execution.

## Upstream Artifacts

- Workflow state: `tickets/in-progress/compaction-config-save-button/workflow-state.md`
- Investigation notes: `tickets/in-progress/compaction-config-save-button/investigation-notes.md`
- Requirements: `tickets/in-progress/compaction-config-save-button/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/compaction-config-save-button/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/compaction-config-save-button/future-state-runtime-call-stack-review.md`
- Proposed design: N/A for Small scope.

## Document Status

- Current Status: `Ready For Implementation`
- Notes: Stage 5 reached `Go Confirmed` after two consecutive clean review rounds; baseline is finalized and execution tracking is initialized.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready`: `Yes`
- Acceptance criteria use stable IDs with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed`: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch (Small Scope Design Basis)

- Use Cases In Scope:
  - `UC-001`: User opens the card with store-synced values; button appears idle/disabled.
  - `UC-002`: User changes a field; button appears ready/blue and enabled.
  - `UC-003`: User saves changed values; payload normalization remains unchanged.
  - `UC-004`: Future regression prevention through component tests.
- Spine Inventory In Scope:
  - `DS-001`: Compaction draft-state-to-save-affordance spine (`Store settings -> CompactionConfigCard normalized draft/current comparison -> save button classes/disabled state`).
  - `DS-002`: Compaction settings save spine (`User click -> CompactionConfigCard.save -> useServerSettingsStore.updateServerSetting`).
  - `DS-003`: Component regression validation spine (`Vitest mount fixture -> form mutation -> assertions on button state/classes and save payload`).
- Primary Owners / Main Domain Subjects:
  - `CompactionConfigCard.vue` owns compaction setting draft state, normalization, dirty-state detection, save-button presentation, and save orchestration for its four settings keys.
  - `useServerSettingsStore` remains the authoritative boundary for persistence; the component does not bypass it.
  - `CompactionConfigCard.spec.ts` owns component-level regression coverage.
- Requirement Coverage Guarantee:
  - R-001/R-002/R-003 map to `DS-001` and `UC-001/UC-002`.
  - R-004 maps to `DS-002` and `UC-003`.
  - R-005 maps to `DS-003` and `UC-004`.
- Design-Risk Use Cases:
  - None beyond regression validation; this is local presentation state.
- Target Architecture Shape:
  - Add normalized current-value helpers/computed values inside `CompactionConfigCard.vue`.
  - Add `isDirty` and optional `canSave` computed values derived from existing refs and normalized store values.
  - Split save button classes into base/idle/ready strings matching peer card pattern.
  - Bind button class to ready style only when `canSave && !isSaving`; idle otherwise.
  - Bind `disabled` to `!canSave || isSaving`.
  - Guard `save()` with `if (!canSave.value || isSaving.value) return` while preserving the existing payload normalization once saving proceeds.
- New Owners/Boundary Interfaces To Introduce: None.
- API/Behavior Delta: UI state only; no API or server setting key change.
- Key Assumptions: Peer save-button style should mirror Media Default Models/Web Search/Featured Catalog conventions.
- Known Risks: If store values mutate while the user is editing, existing watcher behavior can resync drafts. This is pre-existing and outside scope.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification | Required Re-Entry Path | Round State | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence: Stage 5 `future-state-runtime-call-stack-review.md` recorded two clean rounds and `Implementation can start: Yes`.

### Principles

- Bottom-up: establish local normalized state before button affordance and tests.
- Test-driven: add/update component tests around disabled/idle and dirty/ready states.
- Mandatory modernization rule: no compatibility branches or dual save behavior.
- Mandatory cleanup rule: no obsolete local helpers retained in scope.
- Mandatory ownership rule: keep draft-state logic in the component that owns the form; persistence stays behind `useServerSettingsStore`.
- Mandatory file-placement rule: component remains under `autobyteus-web/components/settings`; test remains in adjacent `__tests__` folder.
- Mandatory proactive size-pressure rule: expected source diff is small and below Stage 8 thresholds.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | CompactionConfigCard | Add normalized dirty/can-save computed values and peer style classes | Stage 5 Go Confirmed | Button state derives from normalized values. |
| 2 | DS-002 | CompactionConfigCard | Gate save action by can-save while preserving payload writes | DS-001 | Save guard depends on the same can-save truth. |
| 3 | DS-003 | CompactionConfigCard.spec | Add regression tests for idle/dirty states and keep payload test passing | DS-001, DS-002 | Tests validate the implemented UI contract. |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action | Verification |
| --- | --- | --- | --- | --- | --- |
| Compaction config component | `autobyteus-web/components/settings/CompactionConfigCard.vue` | Same | Frontend settings UI | Keep/Modify | Targeted component tests and visual/browser evidence. |
| Component spec | `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | Same | Frontend component test coverage | Keep/Modify | Targeted Vitest pass. |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action | Depends On | Implementation Status | Unit Test File | Unit Test Status | Integration Test File | Integration Test Status | Stage 8 Review Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001, DS-002 | CompactionConfigCard | Dirty-state save button styling and save guard | `autobyteus-web/components/settings/CompactionConfigCard.vue` | Same | Modify | Stage 5 Go Confirmed | Completed | `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | Passed | N/A | N/A | Planned | Preserve four-setting save payload; button now idle/disabled unless dirty. |
| C-002 | DS-003 | CompactionConfigCard tests | Regression coverage for idle and dirty button states | `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | Same | Modify | C-001 | Completed | Same | Passed | N/A | N/A | Planned | Added idle/disabled and dirty/ready assertions. |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | DS-001 | Solution Sketch | UC-001 | C-001, C-002 | Unit/component | AV-001 |
| R-002 | AC-002 | DS-001 | Solution Sketch | UC-002 | C-001, C-002 | Unit/component | AV-002 |
| R-003 | AC-001, AC-002 | DS-001 | Solution Sketch | UC-001, UC-002 | C-001, C-002 | Unit/component | AV-001, AV-002 |
| R-004 | AC-003 | DS-002 | Solution Sketch | UC-003 | C-001, C-002 | Unit/component | AV-003 |
| R-005 | AC-004, AC-005 | DS-003 | Solution Sketch | UC-004 | C-002 | Unit/component + visual evidence | AV-004, AV-005 |

### Stage 7 Planned Coverage Mapping

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level | Initial Status |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001/R-003 | DS-001 | Initial button disabled and idle styled | AV-001 | E2E/component-executable | Planned |
| AC-002 | R-002/R-003 | DS-001 | Changed field enables ready styled button | AV-002 | E2E/component-executable | Planned |
| AC-003 | R-004 | DS-002 | Save payload unchanged | AV-003 | E2E/component-executable | Planned |
| AC-004 | R-005 | DS-003 | Targeted test command passes | AV-004 | E2E/component-executable | Planned |
| AC-005 | R-001/R-002 | DS-001 | Visual/browser or component-render evidence confirms no permanently-blue idle save button | AV-005 | E2E/manual/browser | Planned |

### Design Delta Traceability

N/A for Small scope; no separate proposed design document.

### Decommission / Rename Execution Tasks

None.

### Step-By-Step Plan

1. After Stage 5 `Go Confirmed`, update `CompactionConfigCard.vue` with normalized current/draft comparison, idle/ready classes, disabled binding, aria/title labels, and save guard.
2. Update `CompactionConfigCard.spec.ts` to assert initial idle/disabled style and dirty enabled/ready style while preserving the save payload test.
3. Run targeted frontend component tests.
4. Run available visual/browser or component-render validation.
5. Record Stage 7 evidence, Stage 8 review, and Stage 9 docs-sync/no-impact decision.

### Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design-principles guidance reapplied during implementation: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails: `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/compaction-config-save-button/code-review.md`
- Scope: changed component source and adjacent component test.
- Line-count measurement command: `rg -n "\\S" autobyteus-web/components/settings/CompactionConfigCard.vue autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts | wc -l` plus per-file counts.
- `>500` hard-limit policy: source implementation file must stay below 500 effective non-empty lines; expected to remain below.
- per-file diff delta gate: inspect `git diff --numstat origin/personal...HEAD -- <file>`; expected below 220 changed lines.
- File-placement review approach: verify changes remain in settings component/test owners.

| File | Current Line Count | Adds/Expands Functionality | Ownership/SoC Risk | Required Action | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/CompactionConfigCard.vue` | 176 effective non-empty lines; 48 additions / 13 deletions | Yes | Low | Keep focused local computed state | Local Fix / Design Impact if mixed boundaries introduced |
| `autobyteus-web/components/settings/__tests__/CompactionConfigCard.spec.ts` | 207 effective non-empty lines; 30 additions / 0 deletions | Test-only | Low | Keep adjacent regression tests | Validation Gap if missing |

### Test Strategy

- Unit tests: targeted `CompactionConfigCard.spec.ts` under Nuxt/Vitest.
- Integration tests: N/A; no API/backend change.
- Stage 7 handoff: component-executable assertions plus browser/component-render visual evidence if feasible.
- Stage 8 handoff: focus on local dirty-state correctness, file placement, no over-splitting, and validation sufficiency.

### Cross-Reference Exception Protocol

No cross-reference exceptions expected.

### Design Feedback Loop

No design smells detected during Stage 3. Any file-level discovery in Stage 6 that changes owners or boundaries must be classified and routed per workflow.

## Execution Tracking

### Kickoff Preconditions Checklist

- Workflow state is current: `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes after T-006 update`
- Scope classification confirmed: `Small`
- Investigation notes are current: `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-05-31: Stage 3 solution sketch created; no source code edits yet.
- 2026-05-31: Stage 5 review reached `Go Confirmed`; implementation baseline finalized and Stage 6 is ready to start.
- 2026-05-31: Implemented dirty-state-gated save button styling in `CompactionConfigCard.vue`.
- 2026-05-31: Added regression tests for initial idle/disabled save button and dirty enabled/ready save button.
- 2026-05-31: Validation passed: `NUXT_TEST=true pnpm --dir autobyteus-web exec vitest run components/settings/__tests__/CompactionConfigCard.spec.ts` (6 tests passed).
- 2026-05-31: Validation passed: `pnpm --dir autobyteus-web guard:web-boundary`.
- 2026-05-31: App-level browser visual attempt on `http://127.0.0.1:3399/settings?section=server-settings&mode=quick` was blocked by unavailable backend `/rest/health` / server settings fetch; component-level executable evidence covers the UI class/disabled contract.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| 2026-05-31 | N/A | Small local frontend style consistency fix | Initial design | Continue to Stage 4/5 review. |
