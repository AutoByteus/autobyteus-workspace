# Implementation Plan

## Scope Classification

- Classification: `Medium`
- Reasoning: the change spans shared runtime bootstrap, Codex runtime consumption, Claude runtime consumption, Codex process-lifecycle hardening, workspace skill materialization, and runtime verification artifacts.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> implementation plan -> implementation progress tracking -> API/E2E testing (implement + execute) -> code review gate -> docs sync -> final handoff -> wait for explicit user verification -> move ticket to `done` -> git finalization/release when git repo

## Upstream Artifacts (Required)

- Workflow state: `tickets/in-progress/agent-skill-runtime-support-investigation/workflow-state.md`
- Investigation notes: `tickets/in-progress/agent-skill-runtime-support-investigation/investigation-notes.md`
- Requirements: `tickets/in-progress/agent-skill-runtime-support-investigation/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/in-progress/agent-skill-runtime-support-investigation/future-state-runtime-call-stack.md`
- Runtime review: `tickets/in-progress/agent-skill-runtime-support-investigation/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/in-progress/agent-skill-runtime-support-investigation/proposed-design.md`

## Plan Maturity

- Current Status: `Ready For Implementation`
- Notes: Stage 5 review is `Go Confirmed`; this plan is the last pre-edit execution artifact before the v4 Codex implementation slice.

## Preconditions (Must Be True Before Finalizing This Plan)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Yes`
- Runtime call stack review artifact exists and is current: `Yes`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Runtime review has `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Yes`
- No newly discovered use cases in the final two clean rounds: `Yes`

## Solution Sketch

- Use Cases In Scope: `UC-001`, `UC-002`, `UC-003`, `UC-004`, `UC-005`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective): `None`
- Target Architecture Shape: shared runtime-context resolution -> runtime-specific skill consumption (Codex workspace repo-skill materialization, Claude selected-skill prompt block)
- New Layers/Modules/Boundary Interfaces To Introduce:
  - `single-agent-runtime-context.ts`
  - `configured-runtime-skills.ts`
  - `codex-workspace-skill-materializer.ts`
- Touched Files/Modules:
  - shared runtime bootstrap and skill rendering
  - Codex adapter, workspace skill materializer, session state, runtime service, input mapper, process manager, thread reader
  - Claude adapter, session state, turn preamble
  - runtime unit tests
- API/Behavior Delta:
  - agent-configured `skillNames` become effective for Codex and Claude runs
  - `NONE` suppresses selected skills
  - unresolved selected skills are skipped non-fatally
  - Codex reuses one client per canonical workspace path instead of one global client across unrelated workspaces
  - Codex mirrors only the selected skills into workspace-local `.codex/skills` bundles for the run
- Key Assumptions:
  - `SkillService` remains the source of resolved skill directories/content
  - selected-skill prompt injection remains acceptable for Claude in this ticket
  - mirroring selected skills into a hidden workspace `.codex/skills` area is acceptable if cleanup is limited to the bundles owned by the runtime
- Known Risks:
  - workspace-local skill mirroring needs conflict-safe naming and cleanup ownership
  - source skills may not include `agents/openai.yaml`, so the runtime must synthesize a minimal Codex-facing file
  - large skill content may increase Claude prompt size
  - websocket-independent runtime-native raw-trace persistence is still a broader follow-up outside this implementation slice

## Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |
| 3 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 4 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |
| 5 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 6 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |
| 7 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 8 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

## Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `8`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

## Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: update unit tests alongside implementation, then run mapped API-level scenarios in Stage 7.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory decoupling rule: preserve clear module boundaries and one-way dependency direction; avoid adding tight coupling/cycles.
- Mandatory module/file placement rule: keep each touched file in the folder/boundary that owns its concern; Codex workspace-skill mirroring belongs under the Codex runtime folder.
- Choose the proper structural change for architecture integrity; do not prefer local hacks just because they are smaller.
- One file at a time is the default; use limited parallel work only when dependency edges require it.
- Update progress after each meaningful status change (file state, test state, blocker state, or design follow-up state).

## Dependency And Sequencing Map

| Order | File/Module | Depends On | Why This Order |
| --- | --- | --- | --- |
| 1 | `single-agent-runtime-context.ts`, `configured-runtime-skills.ts` | existing agent-definition + skill services | Shared types/logic must exist before either runtime can consume them. |
| 2 | Codex process-manager files | existing Codex client lifecycle | The `cwd` reuse boundary must stay correct before Codex session/bootstrap callers depend on it. |
| 3 | `codex-workspace-skill-materializer.ts` | shared runtime-context/types, Codex `cwd` handling | Workspace mirroring and cleanup ownership define the new Codex contract. |
| 4 | Codex adapter/service/input files | shared runtime-context/types, process-manager changes, workspace materializer | Codex session state and turn mapping depend on resolved selected skills plus the materializer lifecycle. |
| 5 | Claude adapter/session/preamble files | shared runtime-context/types | Claude prompt construction depends on resolved selected skills. |
| 6 | Unit tests and Stage 7 API/E2E scenario execution | all implementation files | Verification should run after both runtime paths compile and are wired. |

## Module/File Placement Plan

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Instruction-only runtime bootstrap helper | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-metadata.ts` | `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts` | Shared runtime bootstrap | `Move` | import updates + unit tests |
| Shared selected-skill types/rendering | N/A | `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | Shared runtime skill formatting | `Keep` | dedicated unit tests |
| Codex workspace skill materializer | N/A | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts` | Codex repo-skill mirror lifecycle | `Keep` | dedicated materializer tests |
| Codex process manager | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | same path | Codex process lifecycle | `Keep` | process-manager tests |
| Codex input mapping | `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts` | same path | Codex protocol mapping | `Keep` | Codex mapper tests |
| Claude turn preamble | `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` | same path | Claude prompt composition | `Keep` | Claude preamble tests |

## Requirement And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| R-001 | AC-001 | `proposed-design.md#target-state-to-be` | `UC-001` | `IP-001`, `IP-002`, `IP-003` | Unit | `S7-001`, `S7-004` |
| R-002 | AC-002 | `proposed-design.md#change-inventory-delta` (`C-004`, `C-005`, `C-011`) | `UC-002` | `IP-002`, `IP-006` | Unit | `S7-002`, `S7-007` |
| R-003 | AC-003 | `proposed-design.md#change-inventory-delta` (`C-006`, `C-007`) | `UC-003` | `IP-003` | Unit | `S7-003` |
| R-004 | AC-001, AC-002, AC-003, AC-004 | `proposed-design.md#error-handling-and-edge-cases` | `UC-001`, `UC-002`, `UC-003`, `UC-004` | `IP-001`, `IP-002`, `IP-003`, `IP-006` | Unit | `S7-004` |
| R-005 | AC-005 | `proposed-design.md#change-traceability-to-implementation-plan` | `UC-004` | `IP-004`, `IP-007` | Unit | `S7-005`, `S7-006`, `S7-007`, `S7-008` |
| R-006 | AC-006 | `proposed-design.md#change-inventory-delta` (`C-009`, `C-010`) | `UC-005` | `IP-005` | Unit | `S7-009` |

## Acceptance Criteria To Stage 7 Mapping

| Acceptance Criteria ID | Requirement ID | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Shared runtime bootstrap resolves selected skills and access mode. | `S7-001`, `S7-004` | API | Planned |
| AC-002 | R-002 | Codex session bootstrap materializes selected skills into workspace-local `.codex/skills` bundles when enabled. | `S7-002`, `S7-007` | API/E2E | Planned |
| AC-003 | R-003 | Claude turn preamble carries selected skill instructions when enabled. | `S7-003` | API | Planned |
| AC-004 | R-004 | Missing skills are skipped and `NONE` suppresses exposure. | `S7-004` | API | Planned |
| AC-005 | R-005 | Adapter/runtime/shared regression tests cover the new wiring and live provider proof. | `S7-005`, `S7-006`, `S7-007`, `S7-008` | API/E2E | Planned |
| AC-006 | R-006 | Codex client reuse is isolated by canonical `cwd`. | `S7-009` | API | Planned |

## Design Delta Traceability

| Change ID (from proposed design doc) | Change Type | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- | --- |
| C-001 | Rename/Move | `IP-001` | Yes | Unit + `S7-001` |
| C-002 | Add | `IP-001`, `IP-003`, `IP-006` | No | Unit |
| C-003 | Modify | `IP-002` | No | Unit + `S7-001` |
| C-004 | Add | `IP-002` | No | Unit + `S7-002`, `S7-007` |
| C-005 | Modify | `IP-002` | No | Unit + `S7-002`, `S7-007` |
| C-006 | Modify | `IP-003` | No | Unit + `S7-001` |
| C-007 | Modify | `IP-003` | No | Unit + `S7-003` |
| C-008 | Modify | `IP-004`, `IP-007` | No | Unit + Stage 7 matrix |
| C-009 | Modify | `IP-005` | No | Unit + `S7-009` |
| C-010 | Modify | `IP-005` | No | Unit + `S7-009` |
| C-011 | Modify | `IP-006` | Yes | Unit + `S7-002`, `S7-007` |

## Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `single-agent-runtime-metadata.ts` | `Rename` | move file, update adapter imports/tests, remove old name usage | Low |
| `T-DEL-002` | Codex turn-level hint/attachment strategy | `Remove` | delete Codex-specific hint rendering and any direct custom-skill attachment path that bypasses workspace discovery | Medium |

## Step-By-Step Plan

1. `IP-001`: keep shared runtime-context resolution and selected-skill rendering helpers current, including unit coverage for access-mode and missing-skill behavior.
2. `IP-002`: add `codex-workspace-skill-materializer.ts`, materialize selected skills into workspace-local `.codex/skills` bundles, track cleanup ownership, and update Codex session state/runtime tests.
3. `IP-003`: keep Claude adapter/session/preamble wiring aligned to the shared runtime context and preserve selected-skill prompt injection.
4. `IP-004`: refresh targeted unit suites for shared skill resolution and both runtime consumers.
5. `IP-005`: preserve the canonical-`cwd` Codex client reuse/release lifecycle and rerun the Codex process-manager/runtime tests as a regression guard.
6. `IP-006`: remove the invalid Codex turn-level hint/attachment strategy so Codex turns send plain user content after workspace skill materialization, then update Codex input-mapper tests.
7. `IP-007`: execute Stage 7 API/E2E scenarios mapped to acceptance criteria, including live Codex configured-skill proof and the baseline Codex regression proof.
8. Prepare Stage 8 code-review artifact and line-count checks after Stage 7 passes.

## Backward-Compat And Decoupling Guardrails

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`

## Per-File Definition Of Done

| File | Implementation Done Criteria | Unit Test Criteria | Integration Test Criteria | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts` | resolves instructions, selected skills, access mode, and lean metadata | new shared runtime-context tests pass | `N/A` | rename cleanup included |
| `autobyteus-server-ts/src/runtime-execution/configured-runtime-skills.ts` | exports shared skill types, Claude render helpers, and Codex `openai.yaml` synthesis helper(s) | renderer tests pass | `N/A` | no runtime-specific service imports |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts` | mirrors selected skills into workspace `.codex/skills`, preserves or synthesizes `agents/openai.yaml`, and cleans up only owned bundles | dedicated materializer tests pass | `N/A` | conflict-safe naming and ownership required |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-process-manager.ts` | reuses clients by canonical `cwd`, isolates different `cwd`s, and releases on last holder | process-manager tests pass | `N/A` | no one-client-per-session regression |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-user-input-mapper.ts` | emits plain text/image inputs after workspace skill discovery is established | Codex input-mapper tests pass | `N/A` | must preserve existing image mapping |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-runtime-session-bootstrap.ts`, `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-thread-history-reader.ts` | materialize workspace skills, track cleanup handles, and acquire/release `cwd`-scoped clients correctly | Codex runtime-service/process-manager tests pass | `S7-007`, `S7-008` | no persistent Codex config writes outside the workspace |
| `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` | renders selected-skill block only when enabled | Claude preamble tests pass | `S7-006` | preserve existing instruction tags |
| `autobyteus-server-ts/src/runtime-execution/adapters/*.ts` | create/restore forward selected skill context | adapter tests pass | `N/A` | both runtimes covered |

## Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/in-progress/agent-skill-runtime-support-investigation/code-review.md`
- Scope (source + tests): shared runtime bootstrap, Codex runtime files, Claude runtime files, runtime unit tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action: split or refactor before Stage 8 can pass
- per-file diff delta gate (`>220` changed lines) assessment approach: record design-impact assessment for any file exceeding the threshold
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan): re-enter via `Design Impact` if any source file exceeds the limit
- module/file placement review approach (how wrong-folder placements will be detected and corrected): verify each touched file still sits in the runtime-specific or shared runtime folder that owns its concern

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-workspace-skill-materializer.ts` | New | Yes | Medium | Keep | Design Impact |
| `autobyteus-server-ts/src/runtime-execution/codex-app-server/codex-app-server-runtime-service.ts` | Unknown (measure in Stage 8) | Yes | Medium | Keep | Design Impact |
| `autobyteus-server-ts/src/runtime-execution/claude-agent-sdk/claude-runtime-turn-preamble.ts` | Unknown (measure in Stage 8) | Yes | Low | Keep | Local Fix |
| `autobyteus-server-ts/src/runtime-execution/single-agent-runtime-context.ts` | New | Yes | Medium | Keep | Design Impact |

## Test Strategy

- Unit tests:
  - shared runtime-context resolution
  - configured-runtime-skills rendering and Codex `openai.yaml` synthesis
  - Codex workspace skill materialization and cleanup ownership
  - Codex process-manager `cwd` reuse / release
  - Codex adapter/runtime-service/input mapping
  - Claude adapter/preamble
- Integration tests:
  - `N/A` unless shared runtime bootstrap crosses an integration boundary that unit tests cannot cover deterministically
- Stage 6 boundary: file/module/service-level verification only (unit + integration).
- Stage 7 handoff notes for API/E2E testing:
  - expected acceptance criteria count: `6`
  - critical flows to validate (API/E2E): runtime bootstrap, Codex workspace skill materialization, Claude turn prompt, suppression paths, Codex canonical-`cwd` client reuse, live Codex skill execution
  - expected scenario count: `8`
  - known environment constraints: Codex and Claude live-provider tests are available, but Codex requires the repository integration to follow the repo-scoped workspace skill contract
- Stage 8 handoff notes for code review:
  - predicted design-impact hotspots: Codex workspace skill materializer naming/cleanup ownership, Codex runtime service growth
  - predicted module/file placement hotspots: shared helper placement vs runtime-specific helper placement
  - files likely to exceed size/SoC thresholds: Codex runtime service if too much lifecycle logic remains inline

## API/E2E Testing Scenario Catalog (Stage 7 Input)

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Test Level (`API`/`E2E`) | Expected Outcome |
| --- | --- | --- | --- | --- | --- | --- |
| `S7-001` | Requirement | `AC-001` | `R-001` | `UC-001` | API | Adapter create/restore flows receive shared runtime context with selected skills and effective access mode. |
| `S7-002` | Requirement | `AC-002` | `R-002` | `UC-002` | API | Codex session bootstrap materializes selected skills into workspace `.codex/skills` bundles and suppresses that materialization for `NONE`. |
| `S7-003` | Requirement | `AC-003` | `R-003` | `UC-003` | API | Claude turn preamble includes the selected-skill instruction block with root-path guidance when enabled. |
| `S7-004` | Requirement | `AC-001`, `AC-004` | `R-001`, `R-004` | `UC-001`, `UC-004` | API | `NONE` and missing-skill paths suppress selected-skill exposure without throwing. |
| `S7-005` | Requirement | `AC-005` | `R-005` | `UC-004` | API | Regression suite covers shared bootstrap plus both runtime consumers after the Codex contract shift. |
| `S7-006` | Requirement | `AC-005` | `R-005` | `UC-003` | E2E | A Claude live run persists `PRELOADED_ONLY`, records configured skill names, and responds with the configured skill's exact response token. |
| `S7-007` | Requirement | `AC-002`, `AC-005` | `R-002`, `R-005` | `UC-002` | E2E | A Codex live run materializes the configured workspace skill, records configured skill names, and produces the configured skill response token. |
| `S7-008` | Design-Risk | `AC-005` | `R-005` | `UC-002` | E2E | Existing non-skill Codex live projection test still materializes a non-empty assistant conversation after the new Codex workspace skill logic lands. |
| `S7-009` | Requirement | `AC-006` | `R-006` | `UC-005` | API | Codex process management reuses one client for the same canonical `cwd`, isolates different `cwd`s, and releases the last holder cleanly. |

## API/E2E Testing Escalation Policy (Stage 7 Guardrail)

- Classification rules for failing API/E2E scenarios:
  - choose exactly one classification for the current failure event: `Local Fix`, `Design Impact`, `Requirement Gap`, or `Unclear`.
  - do not allow any in-scope acceptance criterion to remain `Unmapped`, `Not Run`, `Failed`, or `Blocked` at Stage 7 close unless explicitly marked `Waived` by user decision for infeasible cases.
  - if issue is cross-cutting, root cause is unclear, or confidence is low, set `Investigation Required = Yes`, pause implementation, and update `investigation-notes.md` before persisting classification/re-entry records.
  - if issue is clearly bounded with high confidence, set `Investigation Required = No` and classify directly.

## Cross-Reference Exception Protocol

| File | Cross-Reference With | Why Unavoidable | Temporary Strategy | Unblock Condition | Design Follow-Up Status | Owner |
| --- | --- | --- | --- | --- | --- | --- |
| None | None | N/A | N/A | N/A | `Not Needed` | Codex |

## Design Feedback Loop

| Smell/Issue | Evidence (Files/Call Stack) | Design Section To Update | Action | Status |
| --- | --- | --- | --- | --- |
| None at planning time | N/A | N/A | N/A | Pending |
| Global Codex client boundary was too coarse | `codex-app-server-process-manager.ts`, `UC-005` | `proposed-design.md#target-state-to-be`, `proposed-design.md#change-inventory-delta` | Add canonical-`cwd` client reuse and release lifecycle | Updated |
| Codex turn-level path attachments do not activate custom skills | Raw app-server probes, `UC-002` | `proposed-design.md#target-state-to-be`, `proposed-design.md#change-inventory-delta` | Shift Codex to workspace-local repo-skill materialization and remove the invalid hint/attachment path | Updated |
