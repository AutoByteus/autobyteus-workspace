# API/E2E Testing

## Validation Round Meta

- Current Validation Round: `2`
- Trigger Stage: `6`
- Prior Round Reviewed: `1`
- Latest Authoritative Round: `2`

## Testing Scope

- Ticket: `github-agent-package-import`
- Scope classification: `Medium`
- Workflow state source: `tickets/done/github-agent-package-import/workflow-state.md`
- Requirements source: `tickets/done/github-agent-package-import/requirements.md`
- Call stack source: `tickets/done/github-agent-package-import/future-state-runtime-call-stack.md`
- Design source: `tickets/done/github-agent-package-import/proposed-design.md`
- Interface/system shape in scope:
  - `API`
  - `Browser UI`
  - `Integration`
- Platform/runtime targets:
  - local Vitest GraphQL/API harnesses,
  - local Nuxt/Vue component/page test harnesses,
  - live public GitHub download/import path against `https://github.com/AutoByteus/autobyteus-agents`
- Lifecycle boundaries in scope:
  - `Install`
  - `Recovery`
  - `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`
  - `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts`
  - `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts`
  - `autobyteus-web/pages/__tests__/settings.spec.ts`
- Temporary validation methods or setup to use only if needed:
  - worktree-local `pnpm install --frozen-lockfile` after an initial borrowed `node_modules` symlink attempt proved worktree-specific and unusable for the `vitest` binary path.
- Cleanup expectation for temporary validation:
  - remove failed borrowed symlink setup and keep no temporary runtime artifacts beyond the standard worktree dependency install.

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `1` | Stage 6 exit | `N/A` | `No` | `Pass` | `No` | Initial validation round, later superseded by the Local Fix re-entry rerun. |
| `2` | Stage 6 Local Fix re-entry | `Yes` | `No` | `Pass` | `Yes` | Rechecked the repaired Windows extraction and refresh-failure paths, reran package GraphQL coverage, and reran the live GitHub import using `AutoByteus/autobyteus-agents`. |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| `AC-001` | `REQ-003` | Settings UX uses `Agent Packages` wording | `AV-001` | Passed | `2026-04-09` |
| `AC-002` | `REQ-004` | Settings route/query id is `agent-packages` | `AV-002` | Passed | `2026-04-09` |
| `AC-003` | `REQ-001` | Valid absolute local package path links successfully | `AV-003` | Passed | `2026-04-09` |
| `AC-004` | `REQ-002` | Public GitHub repo imports without requiring manual git usage | `AV-004` | Passed | `2026-04-09` |
| `AC-005` | `REQ-007` | Managed GitHub install lands in app-managed storage | `AV-005` | Passed | `2026-04-09` |
| `AC-006` | `REQ-008` | Imported GitHub package becomes discoverable through existing runtime flows | `AV-006` | Passed | `2026-04-09` |
| `AC-007` | `REQ-009` | Linked local removal unregisters only and leaves files in place | `AV-007` | Passed | `2026-04-09` |
| `AC-008` | `REQ-010` | Managed GitHub removal unregisters and deletes installed files | `AV-008` | Passed | `2026-04-09` |
| `AC-009` | `REQ-013` | Malformed or unsupported input yields a clear validation error | `AV-009` | Passed | `2026-04-09` |
| `AC-010` | `REQ-016` | Duplicate normalized GitHub import is rejected clearly | `AV-010` | Passed | `2026-04-09` |
| `AC-011` | `REQ-018` | Invalid extracted package root is rejected before registration | `AV-011` | Passed | `2026-04-09` |
| `AC-012` | `REQ-022` | Package list shows source kind and summary counts | `AV-012` | Passed | `2026-04-09` |
| `AC-013` | `REQ-023` | Default built-in package is visible and non-removable | `AV-013` | Passed | `2026-04-09` |
| `AC-014` | `REQ-024` | Pre-existing additional roots keep participating in discovery | `AV-014` | Passed | `2026-04-09` |
| `AC-015` | `REQ-025` | Managed install root is `<appDataDir>/agent-packages/github/<owner>__<repo>` | `AV-015` | Passed | `2026-04-09` |

## Spine Coverage Matrix

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `DS-001` | `Primary End-to-End` | `AgentPackageService` | `AV-001`, `AV-002`, `AV-003`, `AV-007`, `AV-008`, `AV-009`, `AV-012`, `AV-013` | Passed | Covers the package-oriented UI/API boundary plus local link/remove behavior |
| `DS-002` | `Primary End-to-End` | `AgentPackageService` with `GitHubAgentPackageInstaller` | `AV-004`, `AV-005`, `AV-009`, `AV-010`, `AV-011`, `AV-015` | Passed | Covers GitHub URL normalization, archive download, install, duplicate rejection, and managed path policy |
| `DS-003` | `Primary End-to-End` | existing discovery providers/services | `AV-006`, `AV-014` | Passed | Covers discovery reuse after root registration and compatibility with existing additional roots |
| `DS-004` | `Bounded Local` | `AgentPackageService` | `AV-003`, `AV-008`, `AV-010`, `AV-012`, `AV-013`, `AV-014` | Passed | Covers deterministic package-list merge, package identity, and remove-mode selection |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `AV-001` | `DS-001` | Requirement | `AC-001` | `REQ-003` | `UC-001` | `Browser-E2E` | local Nuxt/Vitest component/page harness | `None` | Verify the settings surface uses package-oriented wording end to end | Settings UI shows `Agent Packages` copy and package-oriented helper text | `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts`, `autobyteus-web/pages/__tests__/settings.spec.ts` | None | `pnpm test:nuxt --run components/settings/__tests__/AgentPackagesManager.spec.ts pages/__tests__/settings.spec.ts` | Passed |
| `AV-002` | `DS-001` | Requirement | `AC-002` | `REQ-004` | `UC-001` | `Browser-E2E` | local Nuxt/Vitest page harness | `None` | Verify the settings route/query id changed to `agent-packages` | Page test activates the `agent-packages` section and no longer depends on `agent-package-roots` | `autobyteus-web/pages/__tests__/settings.spec.ts` | None | `pnpm test:nuxt --run pages/__tests__/settings.spec.ts` | Passed |
| `AV-003` | `DS-001`, `DS-004` | Requirement | `AC-003` | `REQ-001` | `UC-002` | `API` | local server GraphQL E2E harness | `None` | Verify local path packages still link successfully through the new package boundary | Valid local path import lists as `LOCAL_PATH`, contributes counts, and remains removable by package id | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-004` | `DS-002` | Requirement | `AC-004` | `REQ-002` | `UC-003` | `Integration` | live public GitHub import | `Install` | Prove the real public GitHub import path works without manual git usage | Real repo import succeeds through the package service and no `git clone` workflow is required | `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | `RUN_GITHUB_AGENT_PACKAGE_E2E=1` plus default public repo URL | `RUN_GITHUB_AGENT_PACKAGE_E2E=1 AUTOBYTEUS_GITHUB_AGENT_PACKAGE_TEST_URL=https://github.com/AutoByteus/autobyteus-agents pnpm test --run tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | Passed |
| `AV-005` | `DS-002` | Requirement | `AC-005` | `REQ-007`, `REQ-025` | `UC-004` | `Integration` | live public GitHub import | `Install` | Prove the managed install path uses the dedicated app-data subtree | Imported package root includes `agent-packages/github/autobyteus__autobyteus-agents` and is not copied into default `agents/` or `agent-teams/` | `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | same as `AV-004` | same as `AV-004` | Passed |
| `AV-006` | `DS-003` | Requirement | `AC-006` | `REQ-008` | `UC-005` | `Integration` | live public GitHub import + existing discovery services | `Recovery` | Prove discovery reuses the installed root after registration | Imported agent/team ids from the real repo are visible through existing discovery services after cache refresh | `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | same as `AV-004` | same as `AV-004` | Passed |
| `AV-007` | `DS-001` | Requirement | `AC-007` | `REQ-009` | `UC-007` | `API` | local server GraphQL E2E harness | `None` | Prove local package removal is unregister-only | External directory remains on disk after removal while the root registration disappears | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-008` | `DS-001`, `DS-004` | Requirement | `AC-008` | `REQ-010` | `UC-008` | `API` | local server GraphQL E2E harness | `Recovery` | Prove managed GitHub package removal deletes the managed install directory | Package removal unregisters the entry and removes the managed install path on disk | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`, `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` and live command from `AV-004` | Passed |
| `AV-009` | `DS-001`, `DS-002` | Requirement | `AC-009` | `REQ-013`, `REQ-014` | `UC-010` | `API` | local server GraphQL E2E harness | `None` | Prove malformed local-path or unsupported GitHub input is rejected clearly | Invalid local roots and malformed GitHub URLs fail with clear validation messages | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-010` | `DS-002`, `DS-004` | Requirement | `AC-010` | `REQ-015`, `REQ-016` | `UC-009` | `API` | local server GraphQL E2E harness + live integration | `None` | Prove duplicate normalized GitHub imports are rejected nondestructively | Second import of the same normalized repo returns an `already exists` error | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts`, `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | live command from `AV-004` for real duplicate check | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` and live command from `AV-004` | Passed |
| `AV-011` | `DS-002` | Requirement | `AC-011` | `REQ-018`, `REQ-019` | `UC-010` | `API` | local server GraphQL E2E harness | `Install` | Prove invalid extracted package roots are rejected before registration | Managed import fails if the extracted root lacks `agents/` and `agent-teams/` package shape | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-012` | `DS-001`, `DS-004` | Requirement | `AC-012` | `REQ-021`, `REQ-022` | `UC-006` | `API` | local server GraphQL E2E harness | `None` | Prove package list metadata exposes source kinds and counts | Query returns source kind, removability, and count fields for built-in, local, and GitHub entries | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-013` | `DS-001`, `DS-004` | Requirement | `AC-013` | `REQ-023` | `UC-006` | `API` | local server GraphQL E2E harness | `None` | Prove the built-in package entry is visible and protected | Query returns a default package entry with `isRemovable = false` | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-014` | `DS-003`, `DS-004` | Requirement | `AC-014` | `REQ-024` | `UC-005`, `UC-006` | `API` | local server GraphQL E2E harness | `Recovery` | Prove existing additional roots remain in discovery and precedence behavior still works | Existing configured root content remains discoverable after the package-management rename and merged package view | `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | None | `pnpm test --run tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | Passed |
| `AV-015` | `DS-002` | Requirement | `AC-015` | `REQ-025` | `UC-004`, `UC-008`, `UC-009` | `Integration` | live public GitHub import | `Install` | Prove the exact managed subtree convention is enforced in a real import | Installed root lives under `<appDataDir>/agent-packages/github/<owner>__<repo>` and supports remove/duplicate semantics | `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | same as `AV-004` | same as `AV-004` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-definitions/agent-packages-graphql.e2e.test.ts` | `API Test` | `Yes` | `AV-003`, `AV-007`, `AV-008`, `AV-009`, `AV-010`, `AV-011`, `AV-012`, `AV-013`, `AV-014` | Replaces the root-centric GraphQL E2E contract with package-oriented coverage |
| `autobyteus-server-ts/tests/integration/agent-definition/github-agent-package-import.integration.test.ts` | `Lifecycle Harness` | `Yes` | `AV-004`, `AV-005`, `AV-006`, `AV-008`, `AV-010`, `AV-015` | Live public GitHub import/remove/discovery validation gated by env flag |
| `autobyteus-web/components/settings/__tests__/AgentPackagesManager.spec.ts` | `Browser Test` | `Yes` | `AV-001` | Covers load/import/remove UI behavior and GitHub URL normalization |
| `autobyteus-web/pages/__tests__/settings.spec.ts` | `Browser Test` | `Yes` | `AV-001`, `AV-002` | Confirms `agent-packages` query id activation and settings-page wiring |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| borrowed worktree-local `node_modules` symlinks to the main workspace installs | Initial attempt to avoid a fresh install, but the package-manager shims resolved to another worktree and broke the `vitest` executable path | `AV-003` through `AV-015` | `Yes` | `Completed` |
| worktree-local `pnpm install --frozen-lockfile` | Materialized a self-consistent dependency graph in this worktree so the focused rerun and live integration command could execute with valid package-manager shims | `AV-003` through `AV-015` | `No` | `Retained` |

## Prior Failure Resolution Check

- Round `2` rechecked the Local Fix findings directly:
  - `CR-001` resolved through `tests/unit/agent-packages/github-agent-package-installer.test.ts`, which exercises the Windows `tar.exe` then `tar` fallback branch.
  - `CR-002` resolved through `tests/unit/agent-packages/agent-package-service.test.ts`, which now covers rollback-on-import-refresh-failure and restore-on-remove-refresh-failure behavior.

## Failure Escalation Log

- None

## Feasibility And Risk Record

- Any infeasible scenarios: `No`
- Environment constraints:
  - live GitHub validation depends on public GitHub availability and outbound network access.
- Platform/runtime specifics:
  - Stage 7 live import used `RUN_GITHUB_AGENT_PACKAGE_E2E=1` and `AUTOBYTEUS_GITHUB_AGENT_PACKAGE_TEST_URL=https://github.com/AutoByteus/autobyteus-agents`.
- Compensating automated evidence:
  - package-oriented server GraphQL E2E covers the same flows with deterministic local fixtures and a mocked managed-installer boundary.
- Residual risk notes:
  - `autobyteus-web/generated/graphql.ts` was not regenerated in this worktree, so generated web hooks/types still reflect the old root-oriented contract even though active runtime code and tests use the new package-oriented files.
  - `autobyteus-server-ts` repo-wide `pnpm typecheck` still fails with pre-existing `TS6059` configuration issues unrelated to this ticket’s changed scope.
- Human-assisted execution steps required because of platform or OS constraints: `No`
- User waiver for infeasible acceptance criteria recorded: `No`
- Temporary validation-only scaffolding cleaned up: `Yes`

## Stage 7 Gate Decision

- Latest authoritative round: `2`
- Latest authoritative result: `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- All executable relevant spines status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Temporary validation-only scaffolding cleaned up or intentionally retained with rationale: `Yes`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - The live GitHub validation explicitly used `https://github.com/AutoByteus/autobyteus-agents`, as requested by the user.
  - The authoritative re-entry round also reran focused repo-resident tests for the repaired Windows extraction and refresh-failure rollback branches before returning to Stage 8.
