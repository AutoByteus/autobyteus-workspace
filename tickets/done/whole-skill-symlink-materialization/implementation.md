# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The work spans two backend owners, changes runtime filesystem semantics, and relies on upstream Stage 3/4/5 artifacts rather than a small single-owner patch.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/whole-skill-symlink-materialization/workflow-state.md`
- Investigation notes: `tickets/done/whole-skill-symlink-materialization/investigation-notes.md`
- Requirements: `tickets/done/whole-skill-symlink-materialization/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/whole-skill-symlink-materialization/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/whole-skill-symlink-materialization/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/done/whole-skill-symlink-materialization/proposed-design.md`

## Document Status

- Current Status: `Completed`
- Notes:
  - baseline finalized after Stage 5 `Go Confirmed`
  - Stage 6 source edits were unlocked for the implementation pass and are now complete

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
  - `UC-001` Codex skip existing discoverable skill
  - `UC-002` Codex missing skill symlink materialization
  - `UC-003` Claude configured skill symlink materialization
- Spine Inventory In Scope:
  - `DS-001` Codex bootstrap/materialization spine
  - `DS-002` Claude bootstrap/materialization spine
  - `DS-003` materializer acquire/collision spine
  - `DS-004` materializer cleanup spine
- Primary Owners / Main Domain Subjects:
  - `CodexThreadBootstrapper`
  - `CodexWorkspaceSkillMaterializer`
  - `ClaudeSessionBootstrapper`
  - `ClaudeWorkspaceSkillMaterializer`
- Requirement Coverage Guarantee:
  - every requirement maps to at least one use case and one Stage 7 validation scenario
- Design-Risk Use Cases:
  - Claude live symlink proof remains an executable-validation risk because local Claude auth is blocked
- Target Architecture Shape:
  - keep current backend owners
  - replace copied workspace skill bundles with whole-directory symlinks
  - remove Codex suffix naming and marker-file ownership
  - infer cleanup ownership from symlink identity
- New Owners/Boundary Interfaces To Introduce:
  - none
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta:
  - Codex missing-skill fallback becomes a symlink with no hash suffix
  - Codex stops runtime-owned `openai.yaml` generation for fallback discovery
  - Claude materialization becomes a symlink instead of a copy
- Key Assumptions:
  - directory symlink identity checks are sufficient to own cleanup safely
  - Claude’s live direct-directory project-skill behavior is a strong enough signal to proceed with backend-local symlink refactor
- Known Risks:
  - Claude executable validation may still be blocked by auth in Stage 7

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `1` | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Candidate Go` | `1` |
| `2` | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Go Confirmed` | `2` |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement backend-local filesystem owners before broader validation.
- Test-driven: update unit/integration validation alongside each backend change.
- Spine-led implementation rule: work by backend owner and cleanup spine first, then adjust runtime-facing expectations.
- Mandatory modernization rule: no backward-compatibility shims or legacy copy paths.
- Mandatory cleanup rule: remove dead copied-bundle helpers, marker-file writes, and Codex suffix logic in scope.
- Mandatory ownership/decoupling/SoC rule: keep policy in bootstrappers and filesystem behavior in materializers.
- Mandatory `Authoritative Boundary Rule`: callers above the materializers do not own collision or cleanup logic.
- Mandatory file-placement rule: keep all changes in the current backend owners and their tests.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| `1` | `DS-003`, `DS-004` | `CodexWorkspaceSkillMaterializer` | replace copy/suffix/marker/openai-yaml behavior with symlink identity behavior | N/A | highest-risk owner and biggest behavior delta |
| `2` | `DS-003`, `DS-004` | `ClaudeWorkspaceSkillMaterializer` | replace copy/marker behavior with symlink identity behavior | N/A | same local pattern as Codex but simpler naming |
| `3` | `DS-001` | Codex backend tests | update Codex unit/integration expectations for symlink/no-suffix behavior | `1` | validates proven runtime contract |
| `4` | `DS-002` | Claude backend tests | update Claude unit expectations and executable evidence plan | `2` | validates parity change |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Codex symlink materialization | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | same | Codex backend filesystem owner | `Keep` | verify no new boundary bypass |
| Claude symlink materialization | `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | same | Claude backend filesystem owner | `Keep` | verify no new boundary bypass |
| Codex durable validation | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | same | Codex backend test owner | `Keep` | verify symlink/no-suffix/collision coverage |
| Claude durable validation | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | same | Claude backend test owner | `Keep` | verify symlink/cleanup coverage |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001`, `DS-003`, `DS-004` | `CodexWorkspaceSkillMaterializer` | whole-directory symlink materialization, no suffix, no marker, no generated yaml | `autobyteus-server-ts/src/agent-execution/backends/codex/codex-workspace-skill-materializer.ts` | same | `Modify` | N/A | `Completed` | `autobyteus-server-ts/tests/unit/agent-execution/backends/codex/codex-workspace-skill-materializer.test.ts` | `Passed` | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | `Passed` | `Planned` | Implemented symlink identity reuse/collision/cleanup and removed copy/yaml/marker/suffix behavior |
| `C-002` | `DS-002`, `DS-003`, `DS-004` | `ClaudeWorkspaceSkillMaterializer` | whole-directory symlink materialization, no marker, safe cleanup | `autobyteus-server-ts/src/agent-execution/backends/claude/claude-workspace-skill-materializer.ts` | same | `Modify` | N/A | `Completed` | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | `Passed` | `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | `Blocked` | `Planned` | Live Claude CLI validation remains constrained by org access; durable unit validation is green |
| `C-003` | `DS-001` | Codex backend tests | Codex runtime expectations move from copied bundles to symlinks | `autobyteus-server-ts/tests/integration/agent-execution/codex-thread-bootstrapper.integration.test.ts` | same | `Modify` | `C-001` | `Completed` | N/A | `N/A` | same file | `Passed` | `Planned` | Live Codex bootstrapper validation passed with `RUN_CODEX_E2E=1` |
| `C-004` | `DS-002` | Claude backend tests | Claude runtime expectations move from copied bundles to symlinks | `autobyteus-server-ts/tests/unit/agent-execution/backends/claude/claude-workspace-skill-materializer.test.ts` | same | `Modify` | `C-002` | `Completed` | same file | `Passed` | `autobyteus-server-ts/tests/integration/runtime-management/claude/client/claude-sdk-client.integration.test.ts` | `Blocked` | `Planned` | Updated durable validation to symlink behavior; live Claude executable validation remains blocked by auth |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `R-002`, `R-003`, `R-004`, `R-005` | `AC-001`, `AC-002` | `DS-001`, `DS-003` | `Architecture Direction Decision`, `Change Inventory` | `UC-001`, `UC-002` | `C-001`, `C-003` | Unit + Integration | `AV-001`, `AV-002` |
| `R-007`, `R-008`, `R-009`, `R-010`, `R-011` | `AC-003`, `AC-004`, `AC-005` | `DS-003`, `DS-004` | `Bounded Local / Internal Spines` | `UC-002`, `UC-003` | `C-001`, `C-002`, `C-004` | Unit + Integration | `AV-003`, `AV-004` |
| `R-006` | `AC-005` | `DS-002` | `Architecture Direction Decision`, `Change Inventory` | `UC-003` | `C-002`, `C-004` | Unit + Integration | `AV-004` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `R-002`, `R-003`, `R-005` | `DS-001`, `DS-003` | Codex discovery still works with whole-directory symlink fallback and does not need generated yaml | `AV-001` | `E2E` | `Planned` |
| `AC-002` | `R-003`, `R-004`, `R-011` | `DS-001`, `DS-003` | Codex fallback path is a symlink with intuitive naming and no stale copied bundle | `AV-002` | `E2E` | `Planned` |
| `AC-003` | `R-010` | `DS-003` | Shared/sibling relative paths keep working under symlinked workspace skill roots | `AV-003` | `API` | `Planned` |
| `AC-004` | `R-007`, `R-008`, `R-009` | `DS-004` | Cleanup/collision ownership is safe | `AV-004` | `API` | `Planned` |
| `AC-005` | `R-006`, `R-007`, `R-008`, `R-011` | `DS-002`, `DS-003`, `DS-004` | Claude workspace skills are symlink-based and no longer copied | `AV-005` | `E2E` | `Planned` |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-001`, `C-003` | `Yes` | Unit/Integration + `AV-001`, `AV-002`, `AV-003`, `AV-004` |
| `C-002` | `C-002`, `C-004` | `Yes` | Unit/Integration + `AV-004`, `AV-005` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | Codex copy helper / suffix logic / generated yaml path | `Remove` | delete copy/hash/openai-yaml helper logic and update tests | ensure no runtime path still expects copied bundle semantics |
| `T-DEL-002` | Codex + Claude marker-file ownership logic | `Remove` | delete marker file reads/writes and replace with symlink identity checks | ensure cleanup still refuses unsafe paths |

### Step-By-Step Plan

1. Patch the Codex materializer to create intuitive whole-directory symlinks and remove copy/marker/yaml/suffix behavior.
2. Patch the Claude materializer to create whole-directory symlinks and remove copy/marker behavior.
3. Update Codex and Claude unit tests for symlink semantics, cleanup ownership, and stale-update behavior.
4. Update Codex integration expectations that currently assume copied bundles.
5. Run targeted unit tests, then Stage 7 executable validation with best available local evidence.

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

- Gate artifact path: `tickets/done/whole-skill-symlink-materialization/code-review.md`
- Scope (source + tests):
  - Codex and Claude materializers
  - touched runtime tests
- line-count measurement command (`effective non-empty`):
  - `rg -n "\\S" <file-path> | wc -l`
  - `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - neither materializer should exceed the limit; if one trends too large, extract a backend-local helper only if it owns a real concern
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - review materializer diffs explicitly because they are the main risk owners

### Test Strategy

- Unit tests:
  - Codex materializer unit suite
  - Claude materializer unit suite
- Integration tests:
  - Codex bootstrapper integration
  - best available Claude executable evidence, subject to auth constraints
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/whole-skill-symlink-materialization/api-e2e-testing.md`
  - critical flows to validate:
    - Codex same-name skip
    - Codex missing-skill symlink discovery
    - Codex shared/sibling path viability
    - cleanup/collision ownership
    - Claude project-skill symlink viability if env permits

## Execution Tracking (Update Continuously)

### Progress Log

- 2026-04-23: Stage 6 baseline finalized after Stage 5 `Go Confirmed`
- 2026-04-23: Replaced Codex copied fallback bundles with `.codex/skills/<sanitized-name>` whole-directory symlinks and removed hash suffix, marker-file ownership, and generated `agents/openai.yaml`
- 2026-04-23: Replaced Claude workspace skill copies with `.claude/skills/<sanitized-name>` whole-directory symlinks and switched cleanup ownership to symlink identity
- 2026-04-23: Updated Codex and Claude durable validation to assert symlink behavior, shared-relative-path viability, collision rejection, and safe cleanup guards
- 2026-04-23: Executed targeted backend validation: custom-config Vitest unit suites passed for Codex and Claude materializers; live Codex bootstrapper integration passed with `RUN_CODEX_E2E=1`

### Implementation Work Updates

| Change ID | Last Failure Classification | Last Failure Investigation Required | Cross-Reference Smell | Design Follow-Up | Requirement Follow-Up | Last Verified | Verification Command | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `Not Yet` | `Pending` | Codex live investigation proof already captured in Stage 1 |
| `C-002` | `N/A` | `No` | `None` | `Not Needed` | `Not Needed` | `Not Yet` | `Pending` | Claude live proof remains a Stage 7 risk due auth blocker |

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| `7` API/E2E + Executable Validation | `tickets/done/whole-skill-symlink-materialization/api-e2e-testing.md` | `Planned` | 2026-04-23 | executable-validation artifact not started yet |
| `8` Code Review | `tickets/done/whole-skill-symlink-materialization/code-review.md` | `Planned` | 2026-04-23 | review artifact not started yet |
| `9` Docs Sync | `tickets/done/whole-skill-symlink-materialization/docs-sync.md` | `Planned` | 2026-04-23 | docs impact to be assessed after implementation |

### Completion Gate

- Stage 6 implementation execution complete: `No`
- Downstream stage authority stays in:
  - `tickets/done/whole-skill-symlink-materialization/api-e2e-testing.md`
  - `tickets/done/whole-skill-symlink-materialization/code-review.md`
  - `tickets/done/whole-skill-symlink-materialization/docs-sync.md`
