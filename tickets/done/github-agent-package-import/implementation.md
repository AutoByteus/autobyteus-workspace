# Implementation

## Scope Classification

- Classification: `Medium`
- Reasoning:
  - The change replaces the package-management product boundary across server, GraphQL, frontend, and tests.
  - The new GitHub import path adds a managed installer plus metadata persistence, while runtime discovery remains rooted in existing local package-root scanning.
- Workflow Depth:
  - `Medium` -> proposed design doc -> future-state runtime call stack -> future-state runtime call stack review (iterative deep rounds until `Go Confirmed`) -> `implementation.md` baseline -> implementation execution

## Upstream Artifacts (Required)

- Workflow state: `tickets/done/github-agent-package-import/workflow-state.md`
- Investigation notes: `tickets/done/github-agent-package-import/investigation-notes.md`
- Requirements: `tickets/done/github-agent-package-import/requirements.md`
  - Current Status: `Refined`
- Runtime call stacks: `tickets/done/github-agent-package-import/future-state-runtime-call-stack.md`
- Future-state runtime call stack review: `tickets/done/github-agent-package-import/future-state-runtime-call-stack-review.md`
- Proposed design (required for `Medium/Large`): `tickets/done/github-agent-package-import/proposed-design.md`

## Document Status

- Current Status: `Stage 8 Review Pending`
- Notes:
  - Stage 5 stayed clean after the requirements/path re-entry and implementation completed without reopening upstream design stages.
  - A second independent Stage 8 deep review reopened Stage 6 with two bounded local-fix findings (`CR-001`, `CR-002`) and no upstream design or requirements change.
  - The bounded local-fix implementation and Stage 7 rerun are complete, so the ticket is back in Stage 8 for the next authoritative review result.

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
  - `UC-001` through `UC-010`
- Spine Inventory In Scope:
  - `DS-001`, `DS-002`, `DS-003`, `DS-004`
- Primary Spine Span Sufficiency Rationale:
  - The implementation keeps the full package flow visible from settings UI to GraphQL to `AgentPackageService` to stores/installer and finally to cache refresh plus runtime discovery reuse.
- Primary Owners / Main Domain Subjects:
  - `AgentPackageService`
  - `AgentPackageRootSettingsStore`
  - `AgentPackageRegistryStore`
  - `GitHubAgentPackageInstaller`
- Requirement Coverage Guarantee (all requirements mapped to at least one use case):
  - Covered through the traceability and Stage 7 scenario tables below.
- Design-Risk Use Cases:
  - `UC-006`: deterministic package catalog merge across built-in, linked-local, and managed-GitHub entries.
- Target Architecture Shape:
  - Package-oriented API boundary over the existing root-based discovery model, with GitHub import materialized as a managed local install under `<appDataDir>/agent-packages/github/<owner>__<repo>/`.
- New Owners/Boundary Interfaces To Introduce:
  - `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts`
  - `autobyteus-server-ts/src/agent-packages/stores/agent-package-root-settings-store.ts`
  - `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts`
  - `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts`
  - `autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts`
  - `autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts`
- Primary file/task set: see `Implementation Work Table`.
- API/Behavior Delta:
  - Rename `agentPackageRoots` API/UI/state surface to `agentPackages`.
  - Replace add/remove-path mutations with `importAgentPackage(input)` and `removeAgentPackage(packageId)`.
  - Support `LOCAL_PATH` and `GITHUB_REPOSITORY` import kinds.
- Key Assumptions:
  - Public GitHub repository download remains available during Stage 7.
  - Existing provider cache refresh paths remain sufficient after root registration changes.
- Known Risks:
  - GitHub archive extraction shape must normalize correctly to the repository root before validation.
  - Registry/root reconciliation must not drift or removal semantics become ambiguous.

### Runtime Call Stack Review Gate Summary

| Round | Review Result | Findings Requiring Persisted Updates | New Use Cases Discovered | Persisted Updates Completed | Classification (`Design Impact`/`Requirement Gap`/`Unclear`/`N/A`) | Required Re-Entry Path | Round State (`Reset`/`Candidate Go`/`Go Confirmed`) | Clean Streak After Round |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 2 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |
| 3 | Fail | Yes | No | Yes | `Requirement Gap` | `Stage 2 -> Stage 3 -> Stage 4 -> Stage 5` | `Reset` | 0 |
| 4 | Pass | No | No | N/A | `N/A` | `N/A` | `Candidate Go` | 1 |
| 5 | Pass | No | No | N/A | `N/A` | `N/A` | `Go Confirmed` | 2 |

### Go / No-Go Decision

- Decision: `Go`
- Evidence:
  - Final review round: `5`
  - Clean streak at final round: `2`
  - Final review gate line (`Implementation can start`): `Yes`

### Principles

- Bottom-up: implement dependencies before dependents.
- Test-driven: write unit tests and integration tests alongside implementation.
- Spine-led implementation rule: sequence work by spine and owner first; file order is derived from that structure, and any optional module grouping follows the ownership model rather than leading it.
- Mandatory modernization rule: no backward-compatibility shims or legacy branches.
- Mandatory cleanup rule: remove dead code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths in scope before Stage 6 can close.
- Mandatory ownership/decoupling/SoC rule: preserve clear subsystem boundaries, one-way dependency direction, and scope-appropriate file responsibilities; avoid adding tight coupling/cycles or mixed-concern files.
- Mandatory `Authoritative Boundary Rule`: keep `AgentPackageService` as the only public authority for package catalog semantics.
- Mandatory `Spine Span Sufficiency Rule`: preserve the full package-management spine from UI to runtime discovery impact.
- Mandatory shared-structure coherence rule: keep package registry records tight and source-kind specific.
- Mandatory file-placement rule: the package-management concern lives under `agent-packages` server and package-oriented web files.
- Mandatory proactive size-pressure rule: split files before they become oversized.

### Spine-Led Dependency And Sequencing Map

| Order | Spine ID | Owner | Task / File | Depends On | Why This Order |
| --- | --- | --- | --- | --- | --- |
| 1 | `DS-004` | `AgentPackageRootSettingsStore`, `AgentPackageRegistryStore`, shared utils | Package summary, root settings persistence, registry persistence | None | Service and UI depend on these stable low-level pieces |
| 2 | `DS-002` | `GitHubAgentPackageInstaller` | GitHub source normalization and managed install flow | Shared utils | GitHub import depends on path validation and managed install policy |
| 3 | `DS-001`, `DS-004` | `AgentPackageService`, GraphQL resolver | Package list/import/remove orchestration | Stores + installer | This is the authoritative boundary |
| 4 | `DS-001` | Web settings UI/store/GraphQL docs | Rename and wire package-oriented client flow | Server boundary | Client should land on final contract once server is stable |
| 5 | `DS-001`, `DS-002`, `DS-003` | Tests | Unit, GraphQL e2e, and requested GitHub integration validation | Full stack | Verification closes the stage |

### File Placement Plan (Mandatory)

| Item | Current Path | Target Path | Owning Concern / Platform | Action (`Keep`/`Move`/`Split`/`Promote Shared`) | Verification |
| --- | --- | --- | --- | --- | --- |
| Product server boundary | `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | server package management | `Move` + broaden responsibility correctly | unit + e2e |
| GraphQL type/resolver | `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts` | `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | GraphQL package boundary | `Move` | schema + e2e |
| Web settings manager | `autobyteus-web/components/settings/AgentPackageRootsManager.vue` | `autobyteus-web/components/settings/AgentPackagesManager.vue` | settings UI | `Move` | component + page tests |
| Web store | `autobyteus-web/stores/agentPackageRootsStore.ts` | `autobyteus-web/stores/agentPackagesStore.ts` | client-state boundary | `Move` | store-backed component tests |
| Web GraphQL docs | `autobyteus-web/graphql/agentPackageRoots.ts` | `autobyteus-web/graphql/agentPackages.ts` | web GraphQL boundary | `Move` | typecheck + component/store tests |
| Registry persistence | `N/A` | `autobyteus-server-ts/src/agent-packages/stores/agent-package-registry-store.ts` | server package metadata | `Create` | unit + e2e |
| GitHub installer | `N/A` | `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | managed install lifecycle | `Create` | unit + Stage 7 integration |

### Implementation Work Table

| Change ID | Spine ID(s) | Owner | Concern | Current Path | Target Path | Action (`Create`/`Modify`/`Move`/`Split`/`Remove`) | Depends On | Implementation Status (`Planned`/`In Progress`/`Completed`/`Blocked`) | Unit Test File | Unit Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Integration Test File | Integration Test Status (`Planned`/`Passed`/`Failed`/`N/A`) | Stage 8 Review Status (`Planned`/`Passed`/`Failed`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `C-001` | `DS-004` | server package management | summary counting + root persistence + registry persistence | `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts` | `autobyteus-server-ts/src/agent-packages/utils/package-root-summary.ts`, `autobyteus-server-ts/src/agent-packages/stores/*` | `Create` | None | Completed | `autobyteus-server-ts/tests/unit/agent-packages/agent-package-registry-store.test.ts`, `autobyteus-server-ts/tests/unit/agent-packages/package-root-summary.test.ts` | Passed | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed | Passed | foundational extraction completed with registry persistence under `<appDataDir>/agent-packages/registry.json` |
| `C-002` | `DS-002` | server package management | GitHub source normalization + managed install | `N/A` | `autobyteus-server-ts/src/agent-packages/utils/github-repository-source.ts`, `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | `Create` | `C-001` | Completed | `autobyteus-server-ts/tests/unit/agent-packages/github-repository-source.test.ts` | Passed | `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | Passed | Passed | managed installs now land under `<appDataDir>/agent-packages/github/<owner>__<repo>` and Stage 7 uses `https://github.com/AutoByteus/autobyteus-agents` live |
| `C-003` | `DS-001`, `DS-004` | server package management | package catalog service + GraphQL boundary | `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts`, `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts`, `autobyteus-server-ts/src/api/graphql/schema.ts` | `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts`, `autobyteus-server-ts/src/api/graphql/types/agent-packages.ts` | `Move` + `Modify` + `Remove` | `C-001`, `C-002` | Completed | `autobyteus-server-ts/tests/unit/agent-packages/agent-package-service.test.ts` | Passed | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed | Passed | root-centric GraphQL names and server owner were removed cleanly without aliases |
| `C-004` | `DS-001` | web settings | package-oriented store/queries/component/page | `autobyteus-web/components/settings/AgentPackageRootsManager.vue`, `autobyteus-web/stores/agentPackageRootsStore.ts`, `autobyteus-web/graphql/agentPackageRoots.ts`, `autobyteus-web/pages/settings.vue` | `autobyteus-web/components/settings/AgentPackagesManager.vue`, `autobyteus-web/stores/agentPackagesStore.ts`, `autobyteus-web/graphql/agentPackages.ts`, `autobyteus-web/pages/settings.vue` | `Move` + `Modify` + `Remove` | `C-003` | Completed | `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts`, `autobyteus-web/pages/__tests__/settings.spec.ts` | Passed | N/A | N/A | Passed | clean rename shipped with one-field auto-detect import UX and `agent-packages` settings route id |
| `C-005` | `DS-001`, `DS-002`, `DS-003` | verification | contract and runtime validation | current e2e surface | new package-oriented tests | `Modify` + `Create` + `Remove` | `C-001` through `C-004` | Completed | `autobyteus-server-ts/tests/unit/agent-packages/*`, `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts`, `autobyteus-web/pages/__tests__/settings.spec.ts` | Passed | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`, `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | Passed | Passed | Stage 7 live validation used `https://github.com/AutoByteus/autobyteus-agents` and verified install/remove/discovery behavior |

### Requirement, Spine, And Design Traceability

| Requirement | Acceptance Criteria ID(s) | Spine ID(s) | Design Section | Use Case / Call Stack | Planned Task ID(s) | Stage 6 Verification (Unit/Integration) | Stage 7 Scenario ID(s) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `REQ-001`, `REQ-009` | `AC-003`, `AC-007` | `DS-001` | `DS-001`, `DS-004` | `UC-002`, `UC-007` | `C-001`, `C-003`, `C-004`, `C-005` | Unit + E2E | `AV-003`, `AV-007` |
| `REQ-002`, `REQ-007`, `REQ-008`, `REQ-017`, `REQ-018`, `REQ-019`, `REQ-025` | `AC-004`, `AC-005`, `AC-006`, `AC-011`, `AC-015` | `DS-002`, `DS-003` | `DS-002`, `DS-003` | `UC-003`, `UC-004`, `UC-005`, `UC-010` | `C-001`, `C-002`, `C-003`, `C-005` | Unit + Integration | `AV-004`, `AV-005`, `AV-006`, `AV-011`, `AV-015` |
| `REQ-003`, `REQ-004`, `REQ-005` | `AC-001`, `AC-002` | `DS-001` | `DS-001` | `UC-001` | `C-003`, `C-004`, `C-005` | Unit + component/page | `AV-001`, `AV-002` |
| `REQ-006`, `REQ-011`, `REQ-012`, `REQ-021`, `REQ-022`, `REQ-023`, `REQ-024` | `AC-012`, `AC-013`, `AC-014` | `DS-001`, `DS-004` | `DS-001`, `DS-004` | `UC-006`, `UC-008` | `C-001`, `C-003`, `C-004`, `C-005` | Unit + E2E | `AV-012`, `AV-013`, `AV-014` |
| `REQ-015`, `REQ-016` | `AC-010` | `DS-002` | `DS-002`, `DS-004` | `UC-009` | `C-002`, `C-003`, `C-005` | Unit + Integration | `AV-010` |
| `REQ-013`, `REQ-014` | `AC-009` | `DS-001`, `DS-002` | `DS-001`, `DS-002` | `UC-010` | `C-002`, `C-003`, `C-004`, `C-005` | Unit + E2E | `AV-009` |

### Stage 7 Planned Coverage Mapping (Input Only)

| Acceptance Criteria ID | Requirement ID | Spine ID(s) | Expected Outcome | Stage 7 Scenario ID(s) | Test Level (`API`/`E2E`) | Initial Status (`Planned`/`Blocked`) |
| --- | --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-003` | `DS-001` | UI uses `Agent Packages` wording | `AV-001` | E2E | Planned |
| `AC-002` | `REQ-004` | `DS-001` | settings section id is `agent-packages` | `AV-002` | E2E | Planned |
| `AC-003` | `REQ-001` | `DS-001` | local package links successfully | `AV-003` | API | Planned |
| `AC-004` | `REQ-002` | `DS-002` | GitHub URL imports without git | `AV-004` | API | Planned |
| `AC-005` | `REQ-007` | `DS-002` | install path is app-managed, not default folders | `AV-005` | API | Planned |
| `AC-006` | `REQ-008` | `DS-003` | imported package becomes discoverable | `AV-006` | API | Planned |
| `AC-007` | `REQ-009` | `DS-001` | local removal unregisters only | `AV-007` | API | Planned |
| `AC-008` | `REQ-010` | `DS-001` | GitHub removal deletes managed install | `AV-008` | API | Planned |
| `AC-009` | `REQ-013` | `DS-001`, `DS-002` | malformed input is rejected clearly | `AV-009` | API | Planned |
| `AC-010` | `REQ-016` | `DS-002` | duplicate GitHub import is rejected | `AV-010` | API | Planned |
| `AC-011` | `REQ-018` | `DS-002` | invalid extracted package root is rejected | `AV-011` | API | Planned |
| `AC-012` | `REQ-022` | `DS-004` | package list exposes source-kind context and counts | `AV-012` | API | Planned |
| `AC-013` | `REQ-023` | `DS-004` | built-in package is visible and non-removable | `AV-013` | API | Planned |
| `AC-014` | `REQ-024` | `DS-003`, `DS-004` | pre-existing additional roots still participate in discovery | `AV-014` | API | Planned |
| `AC-015` | `REQ-025` | `DS-002` | managed install lives under `<appDataDir>/agent-packages/github/<owner>__<repo>/` | `AV-015` | API | Planned |

### Design Delta Traceability (Required For `Medium/Large`)

| Change ID (from proposed design doc) | Planned Task ID(s) | Includes Remove/Rename Work | Verification |
| --- | --- | --- | --- |
| `C-001`, `C-002`, `C-003`, `C-004`, `C-005`, `C-006`, `C-007`, `C-008` | `C-001`, `C-002`, `C-003` | Yes | Unit + API |
| `C-009`, `C-010`, `C-011`, `C-012` | `C-004`, `C-005` | Yes | component + page + API |

### Decommission / Rename Execution Tasks

| Task ID | Item | Action (`Remove`/`Rename`/`Move`) | Cleanup Steps | Risk Notes |
| --- | --- | --- | --- | --- |
| `T-DEL-001` | `agent-package-roots` server subsystem | `Rename` / `Remove` | move surviving logic into `agent-packages`, delete obsolete file | schema imports must be updated atomically |
| `T-DEL-002` | root-centric GraphQL names | `Remove` | replace with package-oriented query/mutations | no compatibility aliases allowed |
| `T-DEL-003` | `AgentPackageRoots` frontend naming | `Rename` | update component/store/query/page/test references | route id must change with UI text |

### Step-By-Step Plan

1. Create package-root summary and low-level persistence helpers.
2. Implement GitHub URL normalization and managed install lifecycle.
3. Build the package service and GraphQL boundary around package identity.
4. Rename the web surface to `Agent Packages` and wire the new API contract.
5. Replace legacy tests with package-oriented unit/e2e coverage.
6. Execute Stage 7 validation, including live GitHub import of `https://github.com/AutoByteus/autobyteus-agents`.
7. Complete Stage 8, Stage 9, and Stage 10 artifacts.

### Backward-Compat And Decoupling Guardrails (Mandatory)

- Backward-compatibility mechanisms introduced: `None`
- Legacy code retained for old behavior: `No`
- Dead/obsolete code or unused helpers/tests/flags/adapters left in scope: `No`
- Shared data structures remain tight (no kitchen-sink base or overlapping parallel shapes introduced): `Yes`
- Shared design/common-practice rules reapplied during implementation (and any file-level design weakness routed as `Design Impact` when needed): `Yes`
- Spine Span Sufficiency preserved (implementation still follows a global enough primary spine, not only a local touched path): `Yes`
- Authoritative Boundary Rule preserved (no boundary bypass / no mixed-level dependency): `Yes`
- Decoupling impact assessment completed: `Yes`
- New tight coupling or cyclic dependency introduced: `No`
- Changed source implementation files kept within proactive size-pressure guardrails (`>500` avoided; `>220` pressure assessed/acted on): `Yes`

### Code Review Gate Plan (Stage 8)

- Gate artifact path: `tickets/done/github-agent-package-import/code-review.md`
- Required scorecard shape:
  - overall `/10`
  - overall `/100`
  - all ten categories in canonical priority order with `score + why this score + what is weak + what should improve`
  - clean pass target: no category below `9.0`
  - overall summary is trend-only; it is not the pass/fail rule
- Scope (source + tests):
  - package server subsystem, GraphQL boundary, web package surface, new and renamed tests
- line-count measurement command (`effective non-empty`):
  - effective non-empty line count: `rg -n "\\S" <file-path> | wc -l`
  - changed-line delta: `git diff --numstat <base-ref>...HEAD -- <file-path>`
- `>500` effective-line source file hard-limit policy and expected design-impact action:
  - split service/helpers before Stage 8 if any changed implementation file crosses the limit
- per-file diff delta gate (`>220` changed lines) assessment approach:
  - inspect each changed implementation file before Stage 8 and split when delta pressure is high
- Hard-limit handling details in `code-review.md` (required re-entry path and split/refactor plan):
  - required if any implementation file violates the limit
- file-placement review approach (how wrong-folder placements will be detected and corrected):
  - review every changed file against the ownership table and remove cross-boundary leakage
- scorecard evidence-prep notes (which changed files, boundaries, tests, and edge-case paths support each Stage 8 category):
  - use service/store/installer boundaries, GraphQL contract clarity, UI rename completeness, and Stage 7 results

| File | Current Line Count | Adds/Expands Functionality (`Yes`/`No`) | Ownership/SoC Risk (`Low`/`Medium`/`High`) | Required Action (`Keep`/`Split`/`Move`/`Refactor`) | Expected Review Classification if not addressed |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | TBD | Yes | Medium | Keep or Split if it trends large | ownership clarity |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | TBD | Yes | Medium | Keep or Split if lifecycle details sprawl | runtime correctness |
| `autobyteus-web/components/settings/AgentPackagesManager.vue` | TBD | Yes | Low | Keep | naming / SoC |

### Test Strategy

- Unit tests:
  - source normalization
  - package-root summary validation and counting
  - registry persistence behavior
  - package service merge/remove behavior
  - GraphQL resolver contract shape
- Integration tests:
  - package-oriented GraphQL flow for local path and managed GitHub flows
  - live GitHub import integration using `https://github.com/AutoByteus/autobyteus-agents`
- Stage 6 boundary: file and service-level verification, while preserving readable subsystem grouping, only (unit + integration).
- Stage 7 handoff notes for API/E2E and executable validation:
  - canonical artifact path: `tickets/done/github-agent-package-import/api-e2e-testing.md`
  - expected acceptance criteria count: `15`
  - critical flows to validate (API/E2E/executable validation):
    - package-oriented settings route and naming
    - local path link/remove
    - GitHub import, duplicate rejection, invalid-shape rejection, managed install path policy
    - runtime discovery reuse after successful import

## Stage 6 Execution Summary

### Delivered Source Changes

- Server:
  - introduced the `agent-packages` subsystem with a package-oriented service boundary, GitHub installer, registry store, root-settings store, and source-normalization/summary helpers.
  - replaced the root-centric GraphQL surface with `agentPackages`, `importAgentPackage`, and `removeAgentPackage`.
  - removed the legacy `agent-package-roots` server owner and GraphQL type file.
- Frontend:
  - renamed the settings surface to `Agent Packages`,
  - changed the settings query id to `agent-packages`,
  - replaced the root-centric manager/store/query files with package-oriented equivalents,
  - kept one input field and auto-detected `LOCAL_PATH` versus `GITHUB_REPOSITORY`.
- Validation assets:
  - replaced the legacy server GraphQL E2E file with package-oriented coverage,
  - added focused server unit tests for package helpers/service,
  - added the requested live GitHub integration test against `https://github.com/AutoByteus/autobyteus-agents`,
  - updated the web settings component/page tests.

### Stage 6 Verification Executed

- Server focused verification:
  - `pnpm test --run tests/unit/agent-packages/github-repository-source.test.ts tests/unit/agent-packages/package-root-summary.test.ts tests/unit/agent-packages/agent-package-registry-store.test.ts tests/unit/agent-packages/agent-package-service.test.ts tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`
  - Result: `5` files, `11` tests passed.
- Server build-target type check:
  - `pnpm exec tsc -p tsconfig.build.json --noEmit`
  - Result: passed.
- Web preparation:
  - `pnpm exec nuxt prepare`
  - Result: passed.
- Web verification:
  - `pnpm test:nuxt --run components/settings/__tests__/AgentPackagesManager.spec.ts pages/__tests__/settings.spec.ts`
  - Result: `2` files, `15` tests passed.
- Environment limitation discovered during implementation:
  - `pnpm typecheck` in `autobyteus-server-ts` still fails repo-wide with existing `TS6059` rootDir/test-inclusion configuration errors outside this ticket’s changed scope.

### Size / Delta Pressure Record

| Source File | Effective Non-Empty Lines | Changed-Line Delta | Assessment | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` | `263` | `308 added` | High delta but still one authoritative owner and below the `500` line hard limit | Keep |
| `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` | `208` | `239 added` | High delta but lifecycle stays coherent inside one installer owner and below the `500` line hard limit | Keep |
| all other changed source implementation files | `<=287` | `<=177 added` | normal pressure | Keep |

### Cleanup Record

- Removed obsolete root-centric server files:
  - `autobyteus-server-ts/src/agent-package-roots/services/agent-package-root-service.ts`
  - `autobyteus-server-ts/src/api/graphql/types/agent-package-roots.ts`
- Removed obsolete root-centric web files:
  - `autobyteus-web/components/settings/AgentPackageRootsManager.vue`
  - `autobyteus-web/components/settings/__tests__/AgentPackageRootsManager.spec.ts`
  - `autobyteus-web/graphql/agentPackageRoots.ts`
  - `autobyteus-web/stores/agentPackageRootsStore.ts`
- Temporary worktree-local `node_modules` symlinks used only to execute validation in this worktree were removed after test execution.

## Stage 6 Gate Decision

- Stage 6 complete: `Yes`
- Source + required unit/integration verification complete: `Yes`
- Shared design/common-practice rules reapplied during implementation: `Yes`
- No backward-compatibility shims or legacy retention remain in changed scope: `Yes`
- Dead/obsolete code cleanup in changed scope complete: `Yes`
- Ownership-driven dependencies remain valid: `Yes`
- Primary implementation spine remains global enough to expose the business path: `Yes`
- Touched files sit under the correct owning subsystems: `Yes`
- Proactive Stage 8 size/delta-pressure handling recorded: `Yes`
- Ready to enter Stage 7 executable validation: `Yes`

## Independent Deep-Review Re-Entry Addendum

- Re-entry classification: `Local Fix`
- Trigger artifact: `tickets/done/github-agent-package-import/code-review.md` round `2`
- Re-entry reason:
  - `CR-001`: Windows GitHub import currently resolves `tar` as `tar.cmd`, which breaks extraction on Windows.
  - `CR-002`: import/remove commit side effects before cache refresh and can return failure after state is already mutated if refresh throws.
- Required implementation work before re-entering Stage 7:
  - fix Windows archive-extractor command resolution in `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts`
  - harden import/remove mutation semantics in `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts`
  - add focused tests for both failure branches
- Required return path after the bounded fix:
  - `Stage 6 -> Stage 7 -> Stage 8`

## Local Fix Re-Entry Execution Summary

### Repaired Source Behavior

- `CR-001`:
  - `autobyteus-server-ts/src/agent-packages/installers/github-agent-package-installer.ts` now resolves Windows extraction candidates as `tar.exe` first and plain `tar` second, and only falls back when the earlier candidate is missing (`ENOENT`).
- `CR-002`:
  - `autobyteus-server-ts/src/agent-packages/services/agent-package-service.ts` now rolls back root registration, registry records, and managed-install side effects when cache refresh fails during import/remove.
  - removal now restores prior package state before rethrowing the refresh failure,
  - GitHub import now removes the managed install directory on rollback,
  - linked-local import now unregisters its partial state on rollback.

### Re-Entry Validation Added

- New focused tests:
  - `autobyteus-server-ts/tests/unit/agent-packages/github-agent-package-installer.test.ts`
  - expanded `autobyteus-server-ts/tests/unit/agent-packages/agent-package-service.test.ts`
- New assertions added by the re-entry:
  - Windows archive extraction retries from `tar.exe` to `tar` when the first command is unavailable.
  - Managed GitHub import leaves no registered root, registry record, or install directory behind when cache refresh fails.
  - Managed GitHub removal restores the root and registry record when cache refresh fails.

### Re-Entry Verification Executed

- Worktree dependency setup:
  - `pnpm install --frozen-lockfile`
  - Result: passed.
- Server focused verification rerun:
  - `pnpm test --run tests/unit/agent-packages/github-repository-source.test.ts tests/unit/agent-packages/package-root-summary.test.ts tests/unit/agent-packages/agent-package-registry-store.test.ts tests/unit/agent-packages/agent-package-service.test.ts tests/unit/agent-packages/github-agent-package-installer.test.ts tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`
  - Result: `6` files, `15` tests passed.

### Re-Entry Cleanup Record

- The earlier borrowed `node_modules` symlink setup was removed after it proved worktree-specific and broke the `vitest` binary resolution path.
- The authoritative re-entry validation now runs against a worktree-local `pnpm install --frozen-lockfile` instead of shared-worktree symlinks.
