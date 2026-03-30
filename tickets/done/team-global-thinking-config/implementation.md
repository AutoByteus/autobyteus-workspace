# Implementation

## Scope Classification

- Classification: `Small`
- Reasoning:
  - Existing UI, launch, and hydration structures already support this feature shape.
  - No backend contract expansion is required.
  - The change is localized to the team-config domain in `autobyteus-web`.
- Workflow Depth:
  - `Small` -> draft `implementation.md` solution sketch -> future-state runtime call stack -> future-state runtime call stack review -> finalize `implementation.md` baseline -> implementation execution.

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/team-global-thinking-config/workflow-state.md`
- Investigation notes: `tickets/done/team-global-thinking-config/investigation-notes.md`
- Requirements: `tickets/done/team-global-thinking-config/requirements.md`
  - Current Status: `Design-ready`
- Runtime call stacks: `tickets/done/team-global-thinking-config/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/team-global-thinking-config/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `N/A (Small scope)`

## Document Status

- Current Status: `Implemented`
- Notes:
  - Small-scope solution sketch remained the design basis for Stage 4/5 and Stage 6 execution.
  - Stage 6 source implementation and focused repo-resident validation are complete.

## Plan Baseline (Freeze Until Replanning)

### Preconditions (Must Be True Before Finalizing The Baseline)

- `requirements.md` is at least `Design-ready` (`Refined` allowed): `Yes`
- Acceptance criteria use stable IDs (`AC-*`) with measurable expected outcomes: `Yes`
- `workflow-state.md` is current and Stage 5 review-gate evidence is recorded: `Pending Stage 5 persistence`
- Runtime call stack review artifact exists and is current: `Pending Stage 4/5 persistence`
- All in-scope use cases reviewed: `Yes`
- No unresolved blocking findings: `Yes`
- Future-state runtime call stack review has `Go Confirmed` with two consecutive clean deep-review rounds: `Pending Stage 5 persistence`
- Missing-use-case discovery sweeps completed for the final two clean rounds: `Pending Stage 5 persistence`
- No newly discovered use cases in the final two clean rounds: `Pending Stage 5 persistence`

### Solution Sketch (Required For `Small`, Optional Otherwise)

- Use Cases In Scope:
  - `UC-101` render team-global model config UI.
  - `UC-102` inherit global team model config into launched members.
  - `UC-103` allow per-member config divergence while preserving inheritance by default.
  - `UC-104` reconstruct reopened team configs back into global defaults plus only meaningful overrides.
  - `UC-105` sanitize stale config when runtime/model changes.
- Spine Inventory In Scope:
  - `DS-001` Team config authoring spine (`TeamRunConfigForm` + `MemberOverrideItem` + `TeamRunConfig` state).
  - `DS-002` Team launch expansion spine (`agentTeamContextsStore`/`agentTeamRunStore` -> GraphQL member configs).
  - `DS-003` Team reopen reconstruction spine (`teamRunContextHydrationService`/`teamRunOpenCoordinator` from metadata).
- Primary Owners / Main Domain Subjects:
  - Team config UI owner: `components/workspace/config/*`
  - Team draft/run state owners: `stores/agentTeamContextsStore.ts`, `stores/agentTeamRunStore.ts`
  - Team restore owner: `services/runHydration/*`, `services/runOpen/*`
  - Shared domain helper owner: a small `autobyteus-web/utils/*` helper for model-config equality / explicit override semantics / restore inference.
- Requirement Coverage Guarantee:
  - `R-101/R-102` -> add global `llmConfig` state + global `ModelConfigSection` rendering.
  - `R-103` -> member override item resolves effective config from explicit override or global default.
  - `R-104` -> launch/draft stores expand global config unless explicit member `llmConfig` property is present.
  - `R-105` -> restore helper infers global defaults from member metadata using majority/frequency selection and only keeps divergent overrides.
  - `R-106` -> runtime/model change paths clear/sanitize incompatible global/member config.
- Design-Risk Use Cases:
  - `UC-104` restore inference, because persisted state is member-level only.
- Target Architecture Shape:
  - Keep one explicit team-global `llmConfig` in `TeamRunConfig`.
  - Distinguish `memberOverride.llmConfig === undefined` (inherit global) from `memberOverride.llmConfig === null` (explicitly clear inherited config).
  - Centralize config comparison + restore inference in a helper to avoid duplicate logic between live hydration and open-from-history flow.
- New Owners/Boundary Interfaces To Introduce:
  - Small helper only; no new subsystem boundary.
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - No backend API shape change.
  - Frontend team config becomes parity with single-agent model-config editing and preserves inheritance across launch + reopen.
- Key Assumptions:
  - Frequency-based restore inference is acceptable.
  - Explicit `null` member `llmConfig` should be treated as a meaningful override when global config is non-null.
- Known Risks:
  - Restore inference is heuristic when member configs are heterogeneous.
  - Explicit-override semantics must not regress existing member override UX.

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

- Bottom-up: helper/state semantics before UI wiring, then launch/hydration consumers, then tests/docs.
- Test-driven: update focused component/store tests alongside the code path they validate.
- Mandatory modernization rule: no compatibility wrapper or duplicated restore logic.
- Mandatory cleanup rule: remove duplicate inline team-config reconstruction logic in restore/open flows.
- Mandatory ownership/decoupling/SoC rule: keep config semantics in the team-config domain; do not push heuristic restore logic into unrelated backend layers.
- Mandatory proactive size-pressure rule: keep touched source files below Stage 8 limits and avoid large ad hoc branching.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | DS-001 | Team config domain helper | `autobyteus-web/utils/teamRunConfigUtils.ts` (or equivalent) | None | Establish explicit override + comparison semantics first. |
| 2 | DS-001 | Team config UI | `TeamRunConfig.ts`, `TeamRunConfigForm.vue`, `MemberOverrideItem.vue` | 1 | UI/state must share the same override semantics. |
| 3 | DS-002 | Team launch state | `agentTeamContextsStore.ts`, `agentTeamRunStore.ts` | 1, 2 | Launch expansion must consume the finalized state shape. |
| 4 | DS-003 | Team reopen/hydration | `teamRunContextHydrationService.ts`, `teamRunOpenCoordinator.ts` | 1, 2 | Restore inference should reuse the same helper and final state shape. |
| 5 | DS-001/002/003 | Validation/docs | focused specs + `docs/agent_teams.md` | 1-4 | Tests/doc updates should reflect the completed behavior. |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Team config helper logic | duplicated inline in UI/hydration | `autobyteus-web/utils/*teamRunConfig*` | Web team-config domain | Promote Shared | Reused by UI + restore/open |
| Team restore reconstruction | duplicated inline in 2 services | existing files using shared helper | Web run hydration/open | Keep + Simplify | No duplicate reconstruction blocks remain |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | DS-001 | Web team-config domain | Shared config equality / explicit override / restore inference helper | `N/A` | `autobyteus-web/utils/teamRunConfigUtils.ts` | Create | None | Completed | `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` | Passed | N/A | N/A | Passed | Centralized override semantics, equality, effective-config resolution, and restore inference |
| C-002 | DS-001 | Team config UI | Add global `llmConfig` state and render team-global model config section | `autobyteus-web/types/agent/TeamRunConfig.ts`, `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | same | Modify | C-001 | Completed | `types/agent/__tests__/TeamRunConfig.spec.ts`, `components/workspace/config/__tests__/TeamRunConfigForm.spec.ts` | Passed | N/A | N/A | Passed | Added team-global `ModelConfigSection` and global config resets on invalid runtime/model transitions |
| C-003 | DS-001 | Team config UI | Member override inherited/global model-config behavior | `autobyteus-web/components/workspace/config/MemberOverrideItem.vue` | same | Modify | C-001, C-002 | Completed | `components/workspace/config/__tests__/MemberOverrideItem.spec.ts` | Passed | N/A | N/A | Passed | Members now inherit global config by default and preserve explicit null/object overrides only when divergent |
| C-004 | DS-002 | Team launch state | Expand global `llmConfig` into draft members and launch payloads | `autobyteus-web/stores/agentTeamContextsStore.ts`, `autobyteus-web/stores/agentTeamRunStore.ts` | same | Modify | C-001, C-002, C-003 | Completed | `stores/__tests__/agentTeamContextsStore.spec.ts`, `stores/__tests__/agentTeamRunStore.spec.ts` | Passed | N/A | N/A | Passed | Temporary contexts and launch payloads now inherit global config unless member override is explicit |
| C-005 | DS-003 | Team restore/open state | Reconstruct global defaults from member metadata with minimal overrides | `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts`, `autobyteus-web/services/runOpen/teamRunOpenCoordinator.ts` | same | Modify | C-001, C-002 | Completed | `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts` (restore inference), targeted service coverage if needed | Passed | N/A | N/A | Passed | Removed duplicated reconstruction blocks and routed both reopen flows through shared helper |
| C-006 | DS-001/002/003 | Docs | Document global team `llmConfig` and inheritance behavior | `autobyteus-web/docs/agent_teams.md` | same | Modify | C-002-C-005 | Completed | N/A | N/A | N/A | N/A | Passed | Durable team-config docs now describe global model config inheritance and explicit null override semantics |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| R-101 | AC-101, AC-105 | DS-001, DS-003 | Solution Sketch | UC-101, UC-104 | C-001, C-002, C-005 | Unit | AV-101, AV-105 |
| R-102 | AC-101 | DS-001 | Solution Sketch | UC-101 | C-002 | Unit | AV-101 |
| R-103 | AC-103, AC-104 | DS-001 | Solution Sketch | UC-103 | C-001, C-003 | Unit | AV-103, AV-104 |
| R-104 | AC-102 | DS-002 | Solution Sketch | UC-102 | C-004 | Unit | AV-102 |
| R-105 | AC-105 | DS-003 | Solution Sketch | UC-104 | C-001, C-005 | Unit | AV-105 |
| R-106 | AC-106 | DS-001 | Solution Sketch | UC-105 | C-001, C-002, C-003 | Unit | AV-106 |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| AC-101 | R-101/R-102 | DS-001 | Team form renders global model-config UI | AV-101 | E2E-ish component/spec | Planned |
| AC-102 | R-104 | DS-002 | Launch payload inherits global `llmConfig` | AV-102 | API-ish store/spec | Planned |
| AC-103 | R-103 | DS-001 | Member override item displays inherited config | AV-103 | E2E-ish component/spec | Planned |
| AC-104 | R-103 | DS-001 | Divergent member keeps explicit override only | AV-104 | E2E-ish component/spec | Planned |
| AC-105 | R-101/R-105 | DS-003 | Rehydrated config reconstructs global defaults/minimal overrides | AV-105 | API-ish helper/spec | Planned |
| AC-106 | R-106 | DS-001 | Invalid config is cleared/sanitized on runtime/model change | AV-106 | E2E-ish component/spec | Planned |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| T-DEL-001 | Duplicated inline team-config reconstruction in restore/open flows | Remove duplication | Route both flows through shared helper | Low |

### Step-By-Step Plan

1. Introduce a shared helper for model-config comparison, explicit override semantics, and team restore inference.
2. Extend `TeamRunConfig` and `TeamRunConfigForm` with team-global `llmConfig` plus global `ModelConfigSection` rendering.
3. Update `MemberOverrideItem` to display inherited global config and preserve explicit null/object overrides only when divergent.
4. Update draft-member and launch-member expansion to inherit the team-global `llmConfig` unless an explicit member override is present.
5. Replace duplicated restore/open reconstruction logic with helper-based inference.
6. Update focused specs and docs; then run targeted validation.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight: `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/team-global-thinking-config/code-review.md`
- Scope (source + tests): team config UI/state/hydration files plus focused specs/docs.
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - do not let `TeamRunConfigForm.vue` or `teamRunContextHydrationService.ts` grow into ad hoc mixed-concern files; extract helper logic first.
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - split shared helper creation from consumer wiring if either file approaches the threshold.
- file-placement review approach:
  - helper logic must remain in existing web team-config/hydration utility ownership, not be pushed into backend or unrelated stores.

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/config/TeamRunConfigForm.vue` | ~380 | Yes | Medium | Keep with helper extraction | Local Fix / Design Impact if mixed concerns grow |
| `autobyteus-web/services/runHydration/teamRunContextHydrationService.ts` | ~230 | Yes | Medium | Keep with shared helper | Local Fix |

### Test Strategy

- Unit tests:
  - helper inference/equality semantics,
  - team form rendering and sanitize behavior,
  - member override inheritance semantics,
  - team launch expansion,
  - temporary team context inheritance.
- Integration tests:
  - N/A for this small frontend-only change; focused store/component specs are sufficient.
- Stage 6 boundary:
  - component + store + helper verification only.
- Stage 7 handoff notes for API/E2E testing:
  - canonical artifact path: `tickets/done/team-global-thinking-config/api-e2e-testing.md`
  - expected acceptance criteria count: `6`
  - critical flows to validate: global config UI, launch inheritance, restore inference, sanitize behavior
  - expected scenario count: `6`
  - known environment constraints: no real browser E2E harness required; rely on targeted vitest suites
- Stage 8 handoff notes for code review:
  - canonical artifact path: `tickets/done/team-global-thinking-config/code-review.md`
  - predicted design-impact hotspots: explicit-null override semantics and restore inference tie-breaking
  - files likely to exceed size/ownership thresholds: `TeamRunConfigForm.vue` only if helper extraction is skipped

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/team-global-thinking-config/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes - Small`
- Investigation notes are current (`tickets/done/team-global-thinking-config/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed`: `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-03-30: Small-scope implementation baseline drafted from investigation and refined requirements.
- 2026-03-30: Added `autobyteus-web/utils/teamRunConfigUtils.ts` to centralize model-config equality, explicit override detection, effective member config resolution, and reopened-team default inference.
- 2026-03-30: Extended team config UI/state with team-global `llmConfig`, global `ModelConfigSection` rendering, member inheritance behavior, and stale-config sanitization on runtime/model changes.
- 2026-03-30: Updated temporary team context creation and create-team-run member expansion so member `llmConfig` inherits the team-global value unless a member override is explicit.
- 2026-03-30: Removed duplicated reopen/hydration reconstruction logic and routed both flows through shared team-run config inference.
- 2026-03-30: Updated focused specs and durable agent-team docs for global model-config inheritance.
- 2026-03-30: Focused validation passed via `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts` (`6` files, `37` tests).
- 2026-03-30: Broader `pnpm -C autobyteus-web test:nuxt -- --run ...` attempt proved the selector was ignored and failed only in unrelated pre-existing/sandbox-blocked suites; focused Stage 6 evidence uses the targeted `vitest run` command above.

### Stage 6 Verification Summary

- Focused repo-resident validation updated:
  - `autobyteus-web/types/agent/__tests__/TeamRunConfig.spec.ts`
  - `autobyteus-web/utils/__tests__/teamRunConfigUtils.spec.ts`
  - `autobyteus-web/components/workspace/config/__tests__/TeamRunConfigForm.spec.ts`
  - `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamContextsStore.spec.ts`
  - `autobyteus-web/stores/__tests__/agentTeamRunStore.spec.ts`
- Stage 6 authoritative command:
  - `pnpm -C autobyteus-web exec vitest run components/workspace/config/__tests__/TeamRunConfigForm.spec.ts components/workspace/config/__tests__/MemberOverrideItem.spec.ts stores/__tests__/agentTeamContextsStore.spec.ts stores/__tests__/agentTeamRunStore.spec.ts types/agent/__tests__/TeamRunConfig.spec.ts utils/__tests__/teamRunConfigUtils.spec.ts`
- Result:
  - `Pass` (`6` test files, `37` tests)
- Supplemental checks:
  - `pnpm -C autobyteus-web exec nuxi typecheck` could not run offline because Nuxt attempted to resolve `vue-tsc` from `https://registry.npmjs.org` in this sandboxed environment.
  - `pnpm -C autobyteus-web exec tsc --noEmit -p tsconfig.json` reports broad existing project-level baseline issues outside this ticket; after a small helper fix, no additional ticket-specific type errors were found in the changed source files beyond the repo's pre-existing generated-enum / `.vue` type-resolution baseline.

### Scope Change Log

| Date | Previous Scope | New Scope | Trigger | Required Action |
| --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A |
