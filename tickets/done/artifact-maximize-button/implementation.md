# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning:
  - The change is limited to artifact viewer display-mode UX.
  - Existing patterns already exist in adjacent viewers.
  - The required work is one new display-mode store, one viewer update, and targeted tests.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/artifact-maximize-button/workflow-state.md`
- Investigation notes: `tickets/done/artifact-maximize-button/investigation-notes.md`
- Requirements: `tickets/done/artifact-maximize-button/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/artifact-maximize-button/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/artifact-maximize-button/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `Not required for Small scope`

## Document Status

- Current Status: `Review-Gate-Validated`
- Notes:
  - This document is the Stage 3 design basis for the small-scope ticket.
  - Stage 5 review reached `Go Confirmed` with two clean rounds.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` maximize selected artifact viewer
  - `UC-002` restore maximized artifact viewer
  - `UC-003` preserve existing artifact viewer states
- Spine Inventory In Scope:
  - `DS-001` artifact viewer render and maximize interaction
  - `DS-002` artifact maximize state cleanup on escape/unmount
- Primary Owners / Main Domain Subjects:
  - `ArtifactContentViewer.vue` owns artifact viewer header controls, teleport overlay, and content presentation.
  - `artifactContentDisplayMode.ts` owns artifact maximize state.
- Requirement Coverage Guarantee:
  - `R-001` to `R-005` map to `UC-001` to `UC-003`, with tests covering `AC-001`, `AC-002`, `AC-003`, `AC-005`, and state independence covering `AC-004`.
- Design-Risk Use Cases:
  - None beyond display-state isolation.
- Target Architecture Shape:
  - Dedicated artifact display-mode store mirrors existing viewer-store patterns.
  - Artifact viewer wraps current content in a teleport-enabled maximize shell.
  - Header controls are rendered from one shared header path so normal and maximized views stay behaviorally aligned.
- New Owners/Boundary Interfaces To Introduce:
  - `useArtifactContentDisplayModeStore()`
- Primary file/task set:
  - `autobyteus-web/stores/artifactContentDisplayMode.ts`
  - `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue`
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
- API/Behavior Delta:
  - Artifact viewer gains maximize and restore behavior plus `Escape` exit handling.
- Key Assumptions:
  - Hardcoded maximize button titles are acceptable for this ticket because adjacent viewer components already use them.
- Known Risks:
  - Teleport cleanup must exit maximize mode on unmount to avoid stale state.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | N/A | N/A | Candidate Go | 1 |
| 2 | Pass | No | No | N/A | N/A | N/A | Go Confirmed | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Reuse existing local UX patterns instead of inventing a new artifact-specific interaction.
- Preserve artifact viewer ownership inside `ArtifactContentViewer.vue`.
- Introduce dedicated state rather than leaking maximize state across tabs.
- Keep file sizes and diff size small; no source file in this ticket should approach Stage 8 size-pressure limits.
- Do not add compatibility wrappers or duplicate rendering paths.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Concern | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-002` | Display-mode store | Create isolated artifact maximize state | None | Viewer implementation depends on state ownership first |
| 2 | `DS-001` | Artifact content viewer | Add maximize shell, controls, and cleanup | `C-001` | Main behavior lands here |
| 3 | `DS-001`, `DS-002` | Viewer tests | Prove maximize and restore behavior | `C-001`, `C-002` | Validation last after behavior is wired |

### File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Artifact display-mode state | N/A | `autobyteus-web/stores/artifactContentDisplayMode.ts` | Web viewer display state | Keep as new store | Unit-style component tests indirectly validate state use |
| Artifact viewer | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | Artifact viewer UI | Keep | Component tests |
| Artifact viewer tests | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | same | Artifact viewer validation | Keep | `vitest` |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-002` | Artifact display-mode store | Isolated maximize state | N/A | `autobyteus-web/stores/artifactContentDisplayMode.ts` | Create | None | Completed | `ArtifactContentViewer.spec.ts` | Passed | N/A | N/A | Passed | Dedicated store prevents cross-tab state bleed |
| `C-002` | `DS-001`, `DS-002` | Artifact content viewer | Maximize shell and controls | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | Modify | `C-001` | Completed | `ArtifactContentViewer.spec.ts` | Passed | N/A | N/A | Passed | Teleport shell, maximize button, restore handling, and cleanup added |
| `C-003` | `DS-001`, `DS-002` | Artifact viewer tests | Maximize and restore coverage | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | same | Modify | `C-001`, `C-002` | Completed | `ArtifactContentViewer.spec.ts` | Passed | N/A | N/A | Passed | Coverage added for maximize, restore, control preservation, and state isolation |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001` | Solution Sketch | `UC-001` | `C-002`, `C-003` | Unit | `AV-001` |
| `R-002` | `AC-002` | `DS-001`, `DS-002` | Solution Sketch | `UC-001`, `UC-002` | `C-001`, `C-002`, `C-003` | Unit | `AV-002` |
| `R-003` | `AC-003` | `DS-001` | Solution Sketch | `UC-001`, `UC-002` | `C-002`, `C-003` | Unit | `AV-003` |
| `R-004` | `AC-004` | `DS-002` | Solution Sketch | `UC-002` | `C-001`, `C-003` | Unit | `AV-004` |
| `R-005` | `AC-005`, `AC-006` | `DS-001` | Solution Sketch | `UC-003` | `C-002`, `C-003` | Unit | `AV-005` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | Artifact header exposes maximize control | `AV-001` | E2E-style component validation | Planned |
| `AC-002` | `R-002` | `DS-001`, `DS-002` | Maximize and restore work via button and `Escape` | `AV-002` | E2E-style component validation | Planned |
| `AC-003` | `R-003` | `DS-001` | Preview and edit controls still behave correctly | `AV-003` | E2E-style component validation | Planned |
| `AC-004` | `R-004` | `DS-002` | Artifact maximize state is independent | `AV-004` | Component validation | Planned |
| `AC-005` | `R-005` | `DS-001` | Existing artifact states still render | `AV-005` | Component validation | Planned |

### Step-By-Step Plan

1. Create the dedicated artifact display-mode store.
2. Refactor `ArtifactContentViewer.vue` so it can render the same header and body in normal and maximized layouts.
3. Add cleanup and `Escape` handling for maximize state.
4. Extend artifact viewer tests for maximize and restore behavior.
5. Run targeted validation and complete downstream Stage 7 to Stage 9 artifacts.

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

- Gate artifact path: `tickets/done/artifact-maximize-button/code-review.md`
- Scope (source + tests):
  - one new store
  - one viewer component change
  - one component test update
- line-count measurement command:
  - `rg -n "\\S" <file-path> | wc -l`
- per-file diff delta gate assessment approach:
  - `git diff --numstat origin/personal...HEAD -- <file-path>`

### Test Strategy

- Unit tests:
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
- Integration tests:
  - Not required beyond component-level validation for this scope
- Stage 6 boundary:
  - component behavior plus store interaction
- Stage 7 handoff notes:
  - canonical artifact path: `tickets/done/artifact-maximize-button/api-e2e-testing.md`
  - known environment constraints:
    - full desktop UI validation is not available in this ticket; use component-level executable validation

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/artifact-maximize-button/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/artifact-maximize-button/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-10: Stage 3 small-scope design basis captured in `implementation.md`.
- 2026-04-10: Created `artifactContentDisplayMode.ts` to isolate artifact maximize state from file viewer maximize state.
- 2026-04-10: Updated `ArtifactContentViewer.vue` to add maximize, restore, `Escape`, and unmount cleanup behavior while preserving existing artifact rendering branches.
- 2026-04-10: Extended `ArtifactContentViewer.spec.ts` and validated the surrounding `ArtifactsTab.spec.ts` regression path.
