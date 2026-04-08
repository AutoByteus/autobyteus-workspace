# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning: the fix stays inside the frontend artifact selection/viewer path and targeted tests.
- Workflow Depth:
  - `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> finalize `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/artifact-edit-file-content-view-bug/workflow-state.md`
- Investigation notes: `tickets/in-progress/artifact-edit-file-content-view-bug/investigation-notes.md`
- Requirements: `tickets/in-progress/artifact-edit-file-content-view-bug/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/artifact-edit-file-content-view-bug/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/artifact-edit-file-content-view-bug/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Implementation Complete`
- Notes: Stage 6 execution finished, targeted validation passed, and downstream workflow artifacts are current through Stage 10 handoff hold.

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

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`
- Spine Inventory In Scope: `DS-001`, `DS-002`, `DS-003`
- Primary Spine Span Sufficiency Rationale: the primary edited-file spine stays stretched from streamed run events through touched-entry state, selection state, and workspace-backed viewer fetch, so the design still shows the full user-visible business path rather than only a local watcher tweak.
- Primary Owners / Main Domain Subjects: `segmentHandler`, `ArtifactsTab`, `ArtifactContentViewer`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases: `UC-004` metadata-arrives-late refresh path, `UC-005` same-row retry path
- Target Architecture Shape: artifact selection remains id-based in `ArtifactsTab`, but the viewer refresh contract becomes explicit by reacting to selected-artifact fetchability changes and an explicit retry signal.
- New Owners/Boundary Interfaces To Introduce: `ArtifactContentViewer` receives a lightweight refresh signal from `ArtifactsTab`.
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta: selected `edit_file` rows refetch automatically after success-time enrichment and can be retried by clicking the same row again; `write_file` streaming behavior remains unchanged.
- Key Assumptions: `edit_file` path/workspace metadata will eventually become sufficient for workspace-backed fetch in the normal successful path.
- Known Risks: avoid accidental extra refetches for streaming `write_file` entries or for unrelated artifact-list updates.

### Runtime Call Stack Review Gate Summary (Required)

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

- Bottom-up: implement viewer refresh mechanics before dependent selection/retry behavior tests.
- Test-driven: update targeted viewer/store/selection tests alongside implementation.
- Spine-led implementation rule: sequence work from selected-artifact refresh inputs to viewer fetch behavior, then close with regression tests.
- Mandatory modernization rule: no compatibility wrapper or duplicate viewer component path.
- Mandatory cleanup rule: remove any test expectations that still encode the stale one-shot refresh behavior.
- Mandatory ownership/decoupling/SoC rule: keep selection/retry ownership in `ArtifactsTab`; keep content resolution ownership in `ArtifactContentViewer`.
- Mandatory `Authoritative Boundary Rule`: `ArtifactsTab` may emit refresh intent, but content resolution stays owned by `ArtifactContentViewer`.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | `ArtifactContentViewer` | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | N/A | viewer refresh contract is the direct defect center |
| 2 | DS-003 | `ArtifactsTab` | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | `ArtifactContentViewer.vue` | same-row retry signal depends on the viewer accepting refresh intent |
| 3 | DS-001/DS-003 | test owners | viewer/selection/store tests | 1, 2 | lock behavior with narrow regression coverage after implementation shape is in place |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| viewer refresh logic | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | artifact content resolution | Keep | selected row refetches on metadata enrichment and manual retry |
| selection retry trigger | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | same | artifact selection UX | Keep | same-row click increments refresh signal |
| regression coverage | existing frontend tests | same | frontend artifact/viewer contracts | Keep | targeted Vitest suite passes |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001/DS-002 | `ArtifactContentViewer` | auto-refresh selected artifact when fetchability changes | `autobyteus-web/components/workspace/agent/ArtifactContentViewer.vue` | same | Modify | N/A | Completed | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Passed | N/A | N/A | Planned | preserved `write_file` streaming bypass while making `edit_file` workspace-backed only |
| C-002 | DS-003 | `ArtifactsTab` | reselect same row triggers retry | `autobyteus-web/components/workspace/agent/ArtifactsTab.vue` | same | Modify | C-001 | Completed | `autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Passed | N/A | N/A | Planned | same-row click now bumps a lightweight refresh signal |
| C-003 | DS-001/DS-003 | frontend test surface | align touched-entry/viewer expectations | `autobyteus-web/services/agentStreaming/handlers/__tests__/artifactHandler.spec.ts`, `autobyteus-web/stores/__tests__/agentArtifactsStore.spec.ts` | same | Modify | C-001, C-002 | Completed | same files | N/A | N/A | N/A | Planned | no store/handler test changes were required after the final viewer/tab coverage landed |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | DS-001 | Solution Sketch | UC-001 | C-001, C-002 | Unit | AV-001 |
| R-002 | AC-002 | DS-001 | Solution Sketch | UC-002 | C-001 | Unit | AV-002 |
| R-003 | AC-003 | DS-002 | Solution Sketch | UC-003 | C-001 | Unit | AV-003 |
| R-004 | AC-004 | DS-001/DS-003 | Solution Sketch | UC-004 | C-001 | Unit | AV-004 |
| R-005 | AC-005 | DS-003 | Solution Sketch | UC-005 | C-002 | Unit | AV-005 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | DS-001 | clicked edited-file row renders non-empty content | AV-001 | E2E | Planned |
| AC-002 | R-002 | DS-001 | workspace-backed current file content is shown | AV-002 | E2E | Planned |
| AC-003 | R-003 | DS-002 | write-file streaming preview still works | AV-003 | E2E | Planned |
| AC-004 | R-004 | DS-001/DS-003 | selected viewer auto-refreshes after success-time enrichment | AV-004 | E2E | Planned |
| AC-005 | R-005 | DS-003 | same-row click retries content resolution | AV-005 | E2E | Planned |

### Step-By-Step Plan

1. Update the viewer to refresh when selected-artifact fetchability changes, not only when the artifact object reference changes.
2. Add a lightweight retry signal from `ArtifactsTab` so clicking the same row can refetch.
3. Update targeted frontend tests for the new refresh/retry behavior.
4. Run focused Vitest suites and continue to Stage 7 validation planning.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Spine Span Sufficiency preserved: `Yes`
- Authoritative Boundary Rule preserved: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails: `Yes`

## Execution Tracking (Update Continuously)

### Progress Log

- 2026-04-08: Stage 6 baseline finalized after Stage 5 `Go Confirmed`.
- 2026-04-08: Implemented workspace-only `edit_file` viewer fallback suppression, wired same-row retry signaling from `ArtifactsTab`, and expanded focused frontend regression coverage.
- 2026-04-08: Copied `autobyteus-server-ts/.env` into the worktree, ran `pnpm install --offline --frozen-lockfile`, ran `pnpm exec nuxi prepare`, and passed the targeted Stage 7 validation command.

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | N/A | No | None | Not Needed | Not Needed | 2026-04-08 | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Viewer refresh contract updated and verified |
| C-002 | N/A | No | None | Not Needed | Not Needed | 2026-04-08 | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Same-row retry signaling verified |
| C-003 | N/A | No | None | Not Needed | Not Needed | 2026-04-08 | `N/A` | Additional store/handler test updates were not required in the final patch |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/artifact-edit-file-content-view-bug/api-e2e-testing.md` | Passed | 2026-04-08 | focused component-harness executable validation passed for all in-scope acceptance criteria |
| 8 Code Review | `tickets/in-progress/artifact-edit-file-content-view-bug/code-review.md` | Pass | 2026-04-08 | clean Stage 8 review; no findings |
| 9 Docs Sync | `tickets/in-progress/artifact-edit-file-content-view-bug/docs-sync.md` | No impact | 2026-04-08 | no long-lived docs changes required |

### Completion Gate

- Stage 6 implementation execution complete: `Yes`
- Downstream stage authority stays in:
  - `tickets/in-progress/artifact-edit-file-content-view-bug/api-e2e-testing.md`
  - `tickets/in-progress/artifact-edit-file-content-view-bug/code-review.md`
  - `tickets/in-progress/artifact-edit-file-content-view-bug/docs-sync.md`
