# Implementation

## Scope Classification

- Classification: `Large`
- Reasoning:
  - The slice changes the team-member schema, runtime identity model, sync payload shape, bundled skill discovery, settings naming, GraphQL, config/env naming, and generated web types.
- Workflow Depth:
  - `Large` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/agent-team-local-member-import-analysis/workflow-state.md`
- Investigation notes: `tickets/done/agent-team-local-member-import-analysis/investigation-notes.md`
- Requirements: `tickets/done/agent-team-local-member-import-analysis/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/done/agent-team-local-member-import-analysis/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/agent-team-local-member-import-analysis/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/done/agent-team-local-member-import-analysis/proposed-design.md`

## Document Status

- Current Status: `In Progress`
- Notes:
  - Stage 5 review remained `Go Confirmed`; no design or requirement re-entry was needed during execution.
  - The original implementation slice completed and the Stage 6 validation set passed on `2026-04-02`.
  - Stage 8 Round 2 reopened Stage 6 on a `Local Fix` path after finding that selective sync does not validate missing `team_local` agent folders before export.
  - The re-entry fix is scoped to the sync selection/export boundary plus negative-path validation coverage; no design-basis change was required.
  - The Stage 6 local fix is now implemented: selective sync validates `team_local` members through the fresh agent-definition boundary before export, and targeted sync unit coverage passed on `2026-04-02`.
  - Stage 10 was reopened on `2026-04-02` for another `Local Fix` re-entry because the team-local runtime identity contract still exists in duplicated server and web helpers, which leaves a mild cross-runtime ownership drift risk.
  - The active re-entry scope promoted that team-local identity contract into one shared owner under `autobyteus-ts`, updated both runtimes to consume it, and removed the now-obsolete duplicate helper files from server and web.
  - Stage 6 validation for the helper refactor passed on `2026-04-02`: `autobyteus-ts` helper unit tests (`1` file, `3` tests), targeted server unit/e2e validation (`4` files, `22` tests), and affected web executable tests (`4` files, `27` tests).
  - Stage 8 Round 4 then exposed the real boundary issue: `autobyteus-web` must not depend on the core `autobyteus-ts` library at all, even for a tiny utility.
  - The new local-fix scope is to remove that forbidden frontend dependency, restore a web-owned copy of the helper, and rerun targeted validation plus code review on the corrected boundary shape.
  - The user then correctly rejected the Stage 7 evidence as incomplete because it did not yet prove the `TEAM_LOCAL` authoring and GraphQL persistence path through durable executable tests.
  - The active execution scope now includes Stage 7 validation uplift: add a server GraphQL e2e round-trip for `TEAM_LOCAL` team members and a web authoring-form test that preserves and emits `TEAM_LOCAL` member scope correctly.
  - Oversized changed files were refactored into owned helpers/components before validation so the Stage 8 size gate remains viable.
  - The refreshed requirement-gap slice is now implemented: the backend visible-agent payload is ownership-aware for the generic Agents page, team-owned agents render with one additional `Team: ...` line, shared-only actions are gated for team-owned agents, and shared-only team-authoring pickers continue to filter to standalone shared agents only.
  - Targeted validation for the refreshed slice passed on `2026-04-02`: server executable coverage (`4` files, `18` tests), web executable coverage (`5` files, `19` tests), and `pnpm guard:web-boundary`.
  - Stage 8 Round 6 then found one bounded ownership gap: the backend delete boundary still allowed team-local agent deletion through the generic agent-definition API.
  - The local fix is now implemented: team-local delete requests are rejected at the authoritative agent-definition service boundary, and the focused Stage 7 rerun passed again on `2026-04-02` with the new negative-path GraphQL proof.

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

### Solution Sketch

- Use Cases In Scope:
  - `UC-001` package-root settings rename and summary counts
  - `UC-002` scoped team-definition parsing
  - `UC-003` mixed shared/local/nested team launch
  - `UC-004` sync ownership preservation
  - `UC-005` team-local bundled skill scan
  - `UC-006` collision-free local runtime/history ids
- Spine Inventory In Scope:
  - `DS-001` scoped team-definition load
  - `DS-002` runtime identity and hydration
  - `DS-003` sync preservation
  - `DS-004` package-root settings surface
  - `DS-005` bundled skill scan
- Primary Owners / Main Domain Subjects:
  - `agent-team-definition` for `refScope`
  - `agent-definition` provider for scoped filesystem reads
  - `agent-team-execution` for derived local runtime ids
  - `sync` for local-agent team payloads
  - renamed package-root settings surface for user-facing naming
- Requirement Coverage Guarantee (all requirements mapped to at least one use case): `Yes`
- Design-Risk Use Cases (if any, with risk/objective):
  - `UC-006`: prevent downstream id collisions for local agents with the same raw `ref`
- Target Architecture Shape:
  - `TeamMember` gains `refScope`
  - agent refs require explicit scope
  - local runtime/history ids use `team-local:<teamId>:<agentId>`
  - `AgentDefinitionService/FileAgentDefinitionProvider` resolve local agents by derived id on read
  - `NodeSyncService` exports local agents inside team payloads
  - `Agent Package Root` replaces old naming in server/web/config
- New Owners/Boundary Interfaces To Introduce:
  - shared team-local agent id contract in `autobyteus-ts`
  - `TeamMemberRefScope` GraphQL/domain enum
  - package-root summary fields: `sharedAgentCount`, `teamLocalAgentCount`
- Primary file/task set: see `Implementation Work Table`
- API/Behavior Delta:
  - GraphQL: `agentPackageRoots`, `addAgentPackageRoot`, `removeAgentPackageRoot`
  - GraphQL team member types include `refScope`
  - settings route id becomes `agent-package-roots`
  - env key becomes `AUTOBYTEUS_AGENT_PACKAGE_ROOTS`
- Key Assumptions:
  - local agents remain file-authored in this slice
  - shared-agent global listing stays shared-only
- Known Risks:
  - broad test surface across server + web
  - generated GraphQL types must stay consistent with renamed package-root and team-member schema

### Runtime Call Stack Review Gate Summary (Required)

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Candidate Go` | `1` |
| 2 | `Pass` | `No` | `No` | `N/A` | `N/A` | `N/A` | `Go Confirmed` | `2` |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `2`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement shared contracts before dependents.
- Test-driven: update server/unit/integration/e2e and web/component/store tests alongside implementation.
- Spine-led implementation rule: sequence by scoped contract -> lookup/runtime -> sync -> package-root rename -> web integration.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory cleanup rule: remove touched `definition source` naming and obsolete tests/imports in scope.
- Mandatory ownership/decoupling/SoC rule: keep parsing in team/provider layers, lookup in agent/provider layers, runtime identity in execution layers, and settings naming in package-root settings layers.
- Mandatory boundary-encapsulation rule: callers should not reconstruct local-agent paths themselves.
- Mandatory shared-structure coherence rule: keep `refScope` and derived local runtime ids semantically tight and non-overlapping.
- Mandatory file-placement rule: move misleadingly named package-root files to their renamed module/file paths.
- Mandatory shared-principles implementation rule: if file-level work exposes a design weakness, classify re-entry instead of patching around it.
- Mandatory proactive size-pressure rule: split or refactor if any changed source file trends above Stage 8 guardrails.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-001` | `agent-team-definition` | Add `refScope` to domain/GraphQL/store/tooling and strict provider parsing/writing | none | Canonical contract first |
| 2 | `DS-002` | `agent-definition` + `agent-team-execution` | Add team-local derived ids and scoped runtime lookup | 1 | Runtime depends on the contract |
| 3 | `DS-003` | `sync` | Preserve local agents in sync selection/export/import | 1,2 | Sync depends on scoped semantics |
| 4 | `DS-005` | `skills` | Scan local bundled skills | 1 | Local ownership shape already fixed |
| 5 | `DS-004` | package-root settings surface | Rename service/API/UI/env naming and package-root counts | 1 | independent from runtime but still schema-heavy |
| 6 | cross-spine | tests/codegen/docs | Update tests, generated GraphQL, and docs | 1-5 | Final verification depends on all behavior changes |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| package-root server service | `autobyteus-server-ts/src/definition-sources/services/definition-source-service.ts` | `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | package-root registration | `Move` | imports compile and tests pass |
| package-root GraphQL type | `autobyteus-server-ts/src/api/graphql/types/definition-sources.ts` | `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts` | package-root GraphQL boundary | `Move` | schema builds |
| package-root web manager | `autobyteus-web/components/settings/DefinitionSourcesManager.vue` | `autobyteus-web/components/settings/AgentPackageRootsManager.vue` | settings UI | `Move` | page/tests pass |
| package-root web store | `autobyteus-web/stores/definitionSourcesStore.ts` | `autobyteus-web/stores/agentPackageRootsStore.ts` | settings store | `Move` | store tests pass |
| package-root web GraphQL | `autobyteus-web/graphql/definitionSources.ts` | `autobyteus-web/graphql/agentPackageRoots.ts` | settings GraphQL docs | `Move` | codegen succeeds |

### Implementation Work Table (Primary Tracker)

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-001` | `agent-team-definition` | Add `refScope` across domain/provider/GraphQL/web/team tools | multiple existing files | same paths | `Modify` | none | `Completed` | server + web team-definition tests | `Passed` | team-definition/provider/graphql tests | `Passed` | `Planned` | strict parse/write landed end-to-end |
| `C-002` | `DS-002` | `agent-definition` + `agent-team-execution` | Derived local runtime ids and scoped agent lookup | runtime/provider files | same paths + helper | `Modify`/`Create` | `C-001` | `Completed` | runtime/history unit tests | `Passed` | runtime integration/e2e tests | `Passed` | `Planned` | local runtime ids use owned helper extraction |
| `C-003` | `DS-003` | `sync` | Local-agent-aware selection/export/import | sync services/tests | same paths | `Modify` | `C-001`,`C-002` | `Completed` | sync unit tests | `Passed` | sync e2e tests | `Passed` | `Failed` | re-entry fix implemented: export now rejects missing `team_local` refs and adds negative-path sync coverage |
| `C-004` | `DS-005` | `skills` | Team-local bundled skill scanning | `skill-service.ts` | same path | `Modify` | `C-001` | `Completed` | skill service tests if needed | `Passed` | definition-source/package-root e2e coverage | `Passed` | `Planned` | discovery logic split to keep service within size gate |
| `C-005` | `DS-004` | package-root settings surface | Rename definition-source module/API/UI/env naming and summary counts | server/web package-root files | renamed paths | `Move`/`Modify`/`Remove` | none | `Completed` | config/store/component tests | `Passed` | package-root e2e + settings page tests | `Passed` | `Planned` | canonical package-root naming now active across server and web |
| `C-006` | cross-spine | tests/codegen/docs | Update generated GraphQL, in-repo tests, and durable docs | multiple test/docs files | same paths/new names | `Modify` | `C-001` to `C-005` | `In Progress` | mixed | `Passed` | mixed | `In Progress` | Stage 7 is being strengthened with missing durable executable coverage for TEAM_LOCAL authoring and GraphQL persistence before Stage 8 reruns |
| `C-007` | `DS-002` | `autobyteus-ts` shared contract owner | Consolidate the team-local runtime identity helper into one shared server-side owner while preserving the frontend boundary | duplicated server + web helper files | shared `autobyteus-ts` helper plus corrected dependents | `Create`/`Modify`/`Remove` | `C-002` | `In Progress` | shared helper + affected runtime tests | `Passed` | focused server/runtime validation | `Passed` | `Failed` | server-side shared owner remains valid, but the web dependency choice must be rolled back so the frontend keeps its own helper |
| `C-008` | cross-spine | web boundary ownership | Remove the forbidden `autobyteus-web -> autobyteus-ts` dependency and restore a local web-owned helper copy | `autobyteus-web/package.json`, `autobyteus-web/utils/teamDefinitionMembers.ts`, `autobyteus-web/utils/teamLocalAgentDefinitionId.ts` | same paths | `Modify`/`Create`/`Remove` | `C-007` | `Completed` | web/member-projection validation | `Passed` | affected server/web executable reruns | `Passed` | `Planned` | frontend boundary has been restored; remaining work is stronger Stage 7 coverage for authoring and GraphQL persistence |
| `C-009` | cross-spine | ownership-aware visible agent catalog | Expose team-owned agents in the generic Agents page with ownership metadata and preserve shared-only selection surfaces | agent-definition provider/service/graphql/store plus agents list/detail/edit/card | same paths + `team-local-agent-discovery.ts` | `Modify`/`Create` | `C-001`,`C-002`,`C-008` | `Completed` | store + component tests | `Passed` | agent-definition GraphQL/integration tests | `Passed` | `Planned` | mixed visible list is now ownership-aware while team-authoring continues to consume the shared-only subset |
| `C-010` | cross-spine | ownership-safe generic delete boundary | Reject unsupported team-local delete attempts from the generic agent-definition API until a safe ownership-aware delete workflow exists | `agent-definition-service.ts`, `agent-definitions-graphql.e2e.test.ts` | same paths | `Modify` | `C-009` | `Completed` | N/A | `N/A` | focused GraphQL executable rerun | `Passed` | `Planned` | closes the Stage 8 Round 6 ownership gap without widening the generic Agents surface |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-004`, `REQ-005`, `REQ-006` | `AC-003`, `AC-011` | `DS-001` | `Derived Interface Boundary Mapping` | `UC-002` | `C-001` | Unit + integration | `AV-002`, `AV-003` |
| `REQ-008`, `REQ-009`, `REQ-010` | `AC-005`, `AC-006`, `AC-007` | `DS-002` | `Spine Narratives` | `UC-003`, `UC-006` | `C-002` | Unit + integration | `AV-004`, `AV-005` |
| `REQ-011`, `REQ-012` | `AC-008` | `DS-003` | `Change Inventory C-006` | `UC-004` | `C-003` | Unit + integration | `AV-006` |
| `REQ-013`, `REQ-017` to `REQ-028` | `AC-012` to `AC-019` | `DS-004` | `Change Inventory C-007/C-008` | `UC-001` | `C-005` | Unit + integration | `AV-001`, `AV-007` |
| `REQ-014` | `AC-009` | `DS-005` | `Spine Narratives DS-005` | `UC-005` | `C-004` | Unit + integration | `AV-008` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001`, `AC-019` | `REQ-001`, `REQ-013` | `DS-004` | package-root query reports shared/local/team counts | `AV-001` | `API` | `Planned` |
| `AC-002`, `AC-003`, `AC-011` | `REQ-002` to `REQ-006` | `DS-001` | scoped team-config loads and invalid scope is rejected | `AV-002` | `API` | `Planned` |
| `AC-004`, `AC-005`, `AC-006`, `AC-007` | `REQ-008` to `REQ-010` | `DS-002` | runtime and launch-preset configs resolve local/shared ids correctly | `AV-003`, `AV-004`, `AV-005` | `API` | `Planned` |
| `AC-008` | `REQ-011`, `REQ-012` | `DS-003` | sync preserves team-local ownership | `AV-006` | `API` | `Planned` |
| `AC-012` to `AC-018` | `REQ-017` to `REQ-028` | `DS-004` | package-root naming works end-to-end in server and web | `AV-007` | `API`/`E2E` | `Planned` |
| `AC-009` | `REQ-014` | `DS-005` | local bundled skill is discovered | `AV-008` | `API` | `Planned` |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001` | `C-001` | `No` | Unit/Integration + `AV-002` |
| `C-002` | `C-002` | `No` | Unit/Integration + `AV-004`, `AV-005` |
| `C-006` | `C-003` | `No` | Unit/Integration + `AV-006` |
| `C-007`, `C-008` | `C-005` | `Yes` | Unit/Integration + `AV-001`, `AV-007` |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `definition-sources` server/web file names and imports | `Rename`/`Move` | move files, update imports, update tests, remove old references | generated files and tests must follow |
| `T-DEL-002` | old `definition-sources` settings section id | `Remove` | replace route/query values and page state references | settings tests must update |
| `T-DEL-003` | touched old env key usage | `Remove` | replace config reads/writes and tests | config test updates required |

### Step-By-Step Plan

1. Update the team-member contract and all GraphQL/web/store/tooling surfaces to require `refScope`.
2. Add derived local-agent runtime ids plus scoped filesystem lookup for local agents.
3. Extend sync and skill discovery for local ownership.
4. Rename the package-root server/web/config surfaces and update summaries/counts.
5. Regenerate GraphQL types, run targeted tests, then full Stage 7 validation.
6. Re-entry fix: make selective sync fail fast when a chosen team references a missing `team_local` agent, then rerun Stage 7 and Stage 8.
7. Re-entry fix: promote the team-local agent id contract into one shared `autobyteus-ts` owner, switch server/web/tests to that owner, then rerun Stage 7 and Stage 8.
8. Re-entry fix: remove the forbidden `autobyteus-web -> autobyteus-ts` dependency, restore the local web helper, then rerun Stage 7 and Stage 8.
9. Requirement-gap fix: make the generic Agents page ownership-aware so team-owned agents are visible, editable, and clearly marked without polluting shared-only selection surfaces, then rerun focused Stage 7 validation and Stage 8 review.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/agent-team-local-member-import-analysis/code-review.md`
- Required scorecard shape:
  - overall `/10`
  - overall `/100`
  - all ten categories in canonical priority order with `score + why this score + what is weak + what should improve`
  - clean pass target: no category below `9.0`
  - overall summary is trend-only; it is not the pass/fail rule
- Scope (source + tests): team-definition schema/provider/runtime, sync, skills, package-root settings/server/web, related tests, generated GraphQL, and docs
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat origin/personal...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - split/refactor immediately if any changed source implementation file approaches the limit
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - track large deltas during implementation and split if one source file carries too much mixed concern
- file-placement review approach:
  - verify renamed package-root files land under package-root ownership and local-agent logic stays in existing owning subsystems

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-team-definition/providers/file-agent-team-definition-provider.ts` | `TBD` | `Yes` | `Medium` | `Keep`/`Refactor` if parsing logic grows too much | `Design Impact` |
| `autobyteus-server-ts/src/agent-team-execution/backends/autobyteus/autobyteus-team-run-backend-factory.ts` | `TBD` | `Yes` | `Medium` | `Keep`/`Refactor` | `Design Impact` |
| package-root renamed service | `TBD` | `Yes` | `Low` | `Move` | `Local Fix` |

### Test Strategy

- Unit tests:
  - team-definition parsing and GraphQL enum mapping
  - config key rename
  - sync selection logic
  - local-agent id helper and runtime leaf-member projection
- Integration tests:
  - file providers load/update scoped team configs
  - runtime build uses shared and local agents correctly
  - package-root service/config interacts with the new env key
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/agent-team-local-member-import-analysis/api-e2e-testing.md`
  - expected acceptance criteria count: `19`
  - critical flows to validate:
    - package-root naming and counts
    - scoped team config loading and rejection
    - mixed local/shared runtime launch
    - sync ownership preservation
    - team-local bundled skill discovery
  - expected scenario count: `8`
  - known environment constraints:
    - avoid real external-runtime tests unless already covered by existing fake/test harnesses
- Stage 8 handoff notes for code review:
  - expected scorecard drag areas:
    - runtime helper placement
    - package-root rename completeness
    - sync payload clarity

## Execution Tracking (Update Continuously)

### Kickoff Preconditions Checklist

- Workflow state is current (`tickets/done/agent-team-local-member-import-analysis/workflow-state.md`): `Yes`
- `workflow-state.md` shows `Current Stage = 6` and `Code Edit Permission = Unlocked` before source edits: `Yes`
- Scope classification confirmed (`Small`/`Medium`/`Large`): `Yes`
- Investigation notes are current (`tickets/done/agent-team-local-member-import-analysis/investigation-notes.md`): `Yes`
- Requirements status is `Design-ready` or `Refined`: `Yes`
- Future-state runtime call stack review final gate is `Implementation can start: Yes`: `Yes`
- Future-state runtime call stack review reached `Go Confirmed` with two consecutive clean deep-review rounds (no blockers, no required persisted artifact updates, no newly discovered use cases): `Yes`
- No unresolved blocking findings: `Yes`

### Progress Log

- 2026-04-02: Implementation baseline created after Stage 5 `Go Confirmed`.
- 2026-04-02: Implemented scoped team-local agent refs, derived local runtime ids, sync/local-skill handling, and the package-root rename across server/web/config/GraphQL.
- 2026-04-02: Refactored the backend factory, skill service, and team-definition form into owned helpers/components so all changed authored source files stayed below the Stage 8 hard line-count gate.
- 2026-04-02: Authoritative executable validation passed with `95/95` server tests and `16/16` web tests.

### Downstream Stage Status Pointers

| Stage | Canonical Artifact | Current Status | Last Updated | Notes |
| --- | --- | --- | --- | --- |
| 7 API/E2E + Executable Validation | `tickets/done/agent-team-local-member-import-analysis/api-e2e-testing.md` | `Completed` | `2026-04-02` | scenarios `AV-001` to `AV-008` all passed |
| 8 Code Review | `tickets/done/agent-team-local-member-import-analysis/code-review.md` | `Completed` | `2026-04-02` | Stage 8 passed with no findings |
| 9 Docs Sync | `tickets/done/agent-team-local-member-import-analysis/docs-sync.md` | `Completed` | `2026-04-02` | durable docs updated and no further doc blockers found |
