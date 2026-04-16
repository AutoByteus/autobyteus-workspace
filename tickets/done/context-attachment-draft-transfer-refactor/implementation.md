# Implementation

Use this single artifact for both:
- the stable Stage 6 implementation baseline
- the live Stage 6 execution/progress record
- brief downstream handoff/status pointers for Stages 7, 8, and 9

Write to:
- `tickets/in-progress/context-attachment-draft-transfer-refactor/implementation.md`

Document discipline:
- `Plan Baseline` sections are the intended implementation shape and should change only when replanning or classified re-entry requires it.
- `Execution Tracking` sections are live logs and should be updated continuously during implementation and when downstream stage status changes materially.
- `Implementation Work Table` is the primary file/task tracker. Prefer change IDs elsewhere instead of repeating the same file list unless exact paths are the point of that section.
- Keep applying the shared design principles and common design practices during implementation. Do not treat the reviewed design artifact as mechanically complete if file-level reality reveals a tighter or safer shape.
- Detailed Stage 7, Stage 8, and Stage 9 records belong in their own canonical artifacts. Keep only handoff inputs and short status pointers here.
- If Stage 6 records classified re-entry in `workflow-state.md`, immediately execute the first returned stage by default, without waiting for another user message. Do not stop after only logging the path and describing what should happen next.

## Scope Classification

- Classification: `Small`
- Reasoning: The refactor changes ownership placement inside the existing attachment flow and preserves the current bug fix without expanding product scope or external contracts.
- Workflow Depth:
  - `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> finalize `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/context-attachment-draft-transfer-refactor/workflow-state.md`
- Investigation notes: `tickets/in-progress/context-attachment-draft-transfer-refactor/investigation-notes.md`
- Requirements: `tickets/in-progress/context-attachment-draft-transfer-refactor/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/context-attachment-draft-transfer-refactor/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/in-progress/context-attachment-draft-transfer-refactor/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A`

## Document Status

- Current Status: `Review-Gate-Validated`
- Notes: Stage 6 refactor, Stage 7 validation, and Stage 8 review are complete; Stage 9 recorded a no-impact docs result.

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

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`
- Spine Inventory In Scope:
  - `DS-001` Shared target-aware draft transfer in the attachment composer
  - `DS-002` Send-time finalize fallback for flattened draft locators
  - `DS-003` Backend local-path resolution for draft/final context locators
- Primary Owners / Main Domain Subjects:
  - `useContextAttachmentComposer.ts` owns target-aware attachment insertion policy
  - `contextAttachmentModel.ts` owns locator parsing and draft-owner metadata extraction
  - `contextFileUploadStore.ts` owns upload/finalize transitions
  - `ContextFilePathInputArea.vue` owns UI event capture only
- Requirement Coverage Guarantee: `R-001` through `R-004` map to `UC-001` through `UC-003`
- Design-Risk Use Cases: none beyond the in-scope requirements
- Target Architecture Shape:
  - Paste text locators are routed from the Vue component into the shared attachment composer.
  - The shared composer hydrates locators, detects foreign draft ownership, clones foreign draft attachments into the current target owner, and appends the resulting attachment.
  - The upload store retains the send-time finalize fallback for flattened draft locators.
  - The backend resolver remains unchanged as the last local-path safeguard for draft/final locators.
- New Owners/Boundary Interfaces To Introduce:
  - No new subsystem; extend the existing `useContextAttachmentComposer` boundary with target-aware locator append behavior.
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - No external API delta.
  - Internal delta: the component delegates draft transfer orchestration to the shared composer.
- Key Assumptions:
  - The active composer target is the authoritative owner for pasted draft attachments.
  - Existing attachment model parsing is sufficient to identify foreign draft owners without adding new wire formats.
- Known Risks:
  - If the shared composer extraction is too thin, the code could still fail Stage 8 on ownership placement.
  - If line-count pressure is not reduced enough, the Stage 8 size gate will still fail.

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

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests and integration tests alongside implementation.
- Spine-led implementation rule: sequence work by spine and owner first; file order is derived from that structure, and any optional module grouping follows the ownership model rather than leading it.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory cleanup rule: remove dead code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths in scope before Stage 6 can close.
- Mandatory ownership/decoupling/SoC rule: preserve clear subsystem boundaries, one-way dependency direction, and scope-appropriate file responsibilities; avoid adding tight coupling/cycles or mixed-concern files.
- Mandatory `Authoritative Boundary Rule`: when one boundary is the intended public authority for a domain subject, do not let callers above it depend on both that boundary and one of its internal managers, repositories, helpers, or lower-level concerns at the same time.
- Mandatory shared-principles implementation rule: if file-level implementation detail reveals that the reviewed design is incomplete, weak, or wrong, record the issue and classify `Design Impact` instead of patching around it locally.
- Mandatory proactive size-pressure rule: changed source implementation files must stay under Stage 8 size gates, with the main pressure point being `ContextFilePathInputArea.vue`.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001` | Shared attachment composer | `autobyteus-web/composables/useContextAttachmentComposer.ts` | `contextAttachmentModel.ts`, `contextFileUploadStore.ts` | Shared owner must exist before the component can delegate |
| 2 | `DS-001` | Attachment model / tests | `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts`, related tests | none | Keeps locator parsing and owner extraction stable for the composer change |
| 3 | `DS-001` | UI surface | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | shared composer extraction | Component should become a thin delegator after the shared path exists |
| 4 | `DS-002` | Upload/finalize boundary | `autobyteus-web/stores/contextFileUploadStore.ts` and tests | none | Preserve send-time fallback while refactoring the ownership transfer path |
| 5 | `DS-003` | Backend resolver | `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` and tests | none | Preserve the backend correctness backstop and revalidate it after the refactor |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Cross-owner draft transfer orchestration | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | `autobyteus-web/composables/useContextAttachmentComposer.ts` | Shared attachment composition | `Promote Shared` | Component no longer owns fetch/re-upload orchestration |
| Draft-owner locator parsing | `autobyteus-web/utils/contextFiles/contextAttachmentModel.ts` | same | Shared locator normalization | `Keep` | Shared composer consumes the existing parsing helpers |
| Send-time flattened draft fallback | `autobyteus-web/stores/contextFileUploadStore.ts` | same | Upload/finalize boundary | `Keep` | Focused finalize test still passes |
| Backend draft local-path resolution | `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | same | Server model-input normalization | `Keep` | Backend resolver test still passes |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | Shared attachment composer | Move foreign-draft transfer orchestration into shared attachment infrastructure | `autobyteus-web/composables/useContextAttachmentComposer.ts` | same | `Modify` | `contextAttachmentModel.ts`, `contextFileUploadStore.ts` | Completed | `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` | Passed | `N/A` | `N/A` | Planned | Composer now owns foreign-draft clone orchestration |
| `C-002` | `DS-001` | UI surface | Remove transfer mechanics from the Vue component and keep delegation only | `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue` | same | `Modify` | `C-001` | Completed | `autobyteus-web/components/agentInput/__tests__/ContextFilePathInputArea.spec.ts` | Passed | `N/A` | `N/A` | Planned | Component dropped to `430` non-empty lines |
| `C-003` | `DS-002` | Upload/finalize boundary | Preserve flattened draft-locator finalize fallback | `autobyteus-web/stores/contextFileUploadStore.ts` | same | `Verify/Modify if needed` | none | Completed | `autobyteus-web/stores/__tests__/contextFileUploadStore.spec.ts` | Passed | `N/A` | `N/A` | Planned | Existing finalize fallback remained intact |
| `C-004` | `DS-003` | Backend resolver | Preserve draft/final local-path resolution | `autobyteus-server-ts/src/context-files/services/context-file-local-path-resolver.ts` | same | `Verify/Modify if needed` | none | Completed | `autobyteus-server-ts/tests/unit/context-files/context-file-local-path-resolver.test.ts` | Passed | `N/A` | `N/A` | Planned | Backend resolver test still passes |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-001` | `AC-001` | `DS-001` | `Solution Sketch` | `UC-001` | `C-001`, `C-002` | Unit | `AV-001` |
| `R-002` | `AC-002`, `AC-003` | `DS-002`, `DS-003` | `Solution Sketch` | `UC-002`, `UC-003` | `C-003`, `C-004` | Unit | `AV-002`, `AV-003` |
| `R-003` | `AC-004` | `DS-001` | `File Placement Plan` | `UC-001` | `C-001`, `C-002` | Unit | `AV-001`, `AV-004` |
| `R-004` | `AC-005` | `DS-001` | `File Placement Plan` | `UC-001` | `C-001`, `C-002` | Probe | `AV-004` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-001` | `DS-001` | Cross-owner pasted draft locator is cloned into the active owner path | `AV-001` | `API` | Planned |
| `AC-002` | `R-002` | `DS-001`, `DS-002` | Destination send remains valid after source draft removal | `AV-002` | `API` | Planned |
| `AC-003` | `R-002` | `DS-002` | Flattened draft locators are finalized into final uploaded attachments | `AV-003` | `API` | Planned |
| `AC-004` | `R-003` | `DS-001` | Shared attachment infrastructure owns transfer orchestration and the component delegates | `AV-004` | `API` | Planned |
| `AC-005` | `R-004` | `DS-001` | Changed source implementation files remain within Stage 8 line-count limits | `AV-004` | `API` | Planned |

### Step-By-Step Plan

1. Extract foreign-draft transfer orchestration into `useContextAttachmentComposer.ts`.
2. Reduce `ContextFilePathInputArea.vue` to UI event capture plus delegation.
3. Keep the upload-store finalize fallback and backend resolver intact, updating tests only where the shared boundary changes.
4. Re-run focused tests, record Stage 7 evidence, and re-run Stage 8 review.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design-principles guidance reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/context-attachment-draft-transfer-refactor/code-review.md`
- Required scorecard shape:
  - overall `/10`
  - overall `/100`
  - all ten categories in canonical priority order with `score + why this score + what is weak + what should improve`
  - clean pass target: no category below `9.0`
- Scope (source + tests): web attachment composition, upload/finalize fallback, backend draft resolver, focused tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: any changed source implementation file above `500` must be split/refactored before Stage 8 can pass
- per-file diff delta gate (`>220` changed lines) assessment approach: record per-file diff size for changed source implementation files and justify any large diff
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan): required if any changed source implementation file remains above the hard limit
- file-placement review approach (how wrong-folder placements will be detected and corrected): verify that draft transfer orchestration is no longer owned by the Vue component
- scorecard evidence-prep notes (which changed files, boundaries, tests, and edge-case paths support each Stage 8 category): use focused web/backend tests and line-count probe

### Test Strategy

- Unit tests: focused Vitest suites for the web composer/component, upload store, and backend resolver
- Integration tests: none required for this small-scope refactor
- Stage 6 boundary: file and service-level verification only
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/in-progress/context-attachment-draft-transfer-refactor/api-e2e-testing.md`
  - expected acceptance criteria count: `5`
  - critical flows to validate (API/E2E/executable validation): cross-owner paste clone, send after source removal, flattened draft finalize fallback, source-file line-count gate
  - expected scenario count: `4`
  - known environment constraints: focused repository tests only; no full Electron lifecycle run in this ticket
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/in-progress/context-attachment-draft-transfer-refactor/code-review.md`
  - expected scorecard drag areas: file placement, source-file size pressure
  - predicted design-impact hotspots: shared-boundary extraction could still leave too much policy in the component if done incompletely
  - files likely to exceed size/ownership/SoC thresholds: `autobyteus-web/components/agentInput/ContextFilePathInputArea.vue`

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/in-progress/context-attachment-draft-transfer-refactor/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/in-progress/context-attachment-draft-transfer-refactor/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-16: Draft implementation baseline created as the small-scope design basis.
- 2026-04-16: Extracted foreign-draft transfer orchestration into `useContextAttachmentComposer.ts`.
- 2026-04-16: Reduced `ContextFilePathInputArea.vue` to delegation and restored the template's upload-store binding.
- 2026-04-16: Focused frontend and backend test suites passed in the ticket worktree after local dependency symlink setup.

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/in-progress/context-attachment-draft-transfer-refactor/api-e2e-testing.md` | `Passed` | `2026-04-16` | Focused web/server tests plus line-count probe recorded |
| 8 Code Review | `tickets/in-progress/context-attachment-draft-transfer-refactor/code-review.md` | `Pass` | `2026-04-16` | Ownership placement and source-file size issues were resolved |
| 9 Docs Sync | `tickets/in-progress/context-attachment-draft-transfer-refactor/docs-sync.md` | `No impact` | `2026-04-16` | No durable `docs/` changes required |
