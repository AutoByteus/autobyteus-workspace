# Stage 7 Executable Validation (API/E2E)

Use this document for Stage 7 executable validation implementation and execution.
Stage 7 can cover API, browser/UI, native desktop/UI, CLI, process/lifecycle, integration, or other executable scenarios when those are the real boundaries being proven.
Do not use this file for unit/integration tracking; that belongs in `implementation.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

## Validation Round Meta

- Current Validation Round: `1`
- Trigger Stage: `6`
- Prior Round Reviewed: `None`
- Latest Authoritative Round: `1`

## Testing Scope

- Ticket: `artifact-edit-file-content-view-bug`
- Scope classification: `Small`
- Workflow state source: `tickets/in-progress/artifact-edit-file-content-view-bug/workflow-state.md`
- Requirements source: `tickets/in-progress/artifact-edit-file-content-view-bug/requirements.md`
- Call stack source: `tickets/in-progress/artifact-edit-file-content-view-bug/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A`
- Interface/system shape in scope: `Browser UI`
- Platform/runtime targets: `Nuxt component runtime in Vitest happy-dom`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`
  - `autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts`
- Temporary validation methods or setup to use only if needed:
  - copied `autobyteus-server-ts/.env` into the worktree
  - ran `pnpm install --offline --frozen-lockfile` in the ticket worktree
  - ran `pnpm exec nuxi prepare` in `autobyteus-web`
- Cleanup expectation for temporary validation:
  - keep the generated worktree install in place during the active ticket; no source cleanup required

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | Focused Nuxt component validation passed after local worktree env/bootstrap setup. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | clicking a successful `edit_file` artifact shows file content instead of blank | AV-001 | Passed | 2026-04-08 |
| AC-002 | R-002 | resolved edited files show current workspace-backed content | AV-001 | Passed | 2026-04-08 |
| AC-003 | R-003 | `write_file` streaming behavior remains intact | AV-003 | Passed | 2026-04-08 |
| AC-004 | R-004 | selected `edit_file` auto-refreshes when late metadata makes fetch possible | AV-002 | Passed | 2026-04-08 |
| AC-005 | R-005 | same-row click retries content resolution | AV-004 | Passed | 2026-04-08 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `ArtifactContentViewer` | AV-001 | Passed | validates workspace-backed rendering for selected edited files |
| DS-002 | Primary End-to-End | `segmentHandler` | AV-003 | Passed | validates no regression to buffered `write_file` preview handling |
| DS-003 | Bounded Local | `ArtifactContentViewer` / `ArtifactsTab` | AV-002, AV-004 | Passed | validates late-metadata refresh and same-row retry signal |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001, AC-002 | R-001, R-002 | UC-001, UC-002 | Integration | Nuxt component test (`happy-dom`) | None | successful edited-file selection must fetch and render current workspace content | viewer fetches current content from the workspace endpoint and shows it | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | worktree `.env` copy, offline install, `nuxi prepare` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Passed |
| AV-002 | DS-003 | Design-Risk | AC-004 | R-004 | UC-004 | Integration | Nuxt component test (`happy-dom`) | None | selected edited-file row must refetch when in-place metadata later makes workspace fetch possible | unresolved edit view stays blank until resolvable, then refetches and shows file content | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | worktree `.env` copy, offline install, `nuxi prepare` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Passed |
| AV-003 | DS-002 | Requirement | AC-003 | R-003 | UC-003 | Integration | Nuxt component test (`happy-dom`) | None | streamed `write_file` content must remain visible before final availability | buffered write-file content still renders and bypasses workspace fetch while streaming/pending | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | worktree `.env` copy, offline install, `nuxi prepare` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Passed |
| AV-004 | DS-003 | Requirement | AC-005 | R-005 | UC-005 | Integration | Nuxt component test (`happy-dom`) | None | same-row reselection must work as an explicit retry signal | viewer refresh signal increments and a failed fetch can be retried successfully | `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts`, `autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | worktree `.env` copy, offline install, `nuxi prepare` | `pnpm test:nuxt --run components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/agent/__tests__/ArtifactContentViewer.spec.ts` | Browser Test | Yes | AV-001, AV-002, AV-003, AV-004 | added late-metadata and retry coverage; preserved existing write-file regression checks |
| `autobyteus-web/components/workspace/agent/__tests__/ArtifactsTab.spec.ts` | Browser Test | Yes | AV-004 | rewrote the tab test to assert same-row retry signaling |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| copied `autobyteus-server-ts/.env` into the worktree | local Nuxt/Vitest setup expects server env presence in the ticket worktree | AV-001, AV-002, AV-003, AV-004 | No | Kept for ongoing ticket work |
| `pnpm install --offline --frozen-lockfile` in the worktree | replaced stale shared `node_modules` symlinks with a reproducible local install | AV-001, AV-002, AV-003, AV-004 | No | Kept for ongoing ticket work |
| `pnpm exec nuxi prepare` | generated `.nuxt/tsconfig.json` so the spec files can compile in the worktree | AV-001, AV-002, AV-003, AV-004 | No | Kept for ongoing ticket work |

## Prior Failure Resolution Check (Mandatory On Round >1)

Not applicable for round `1`.

## Failure Escalation Log

No Stage 7 failures were recorded in the authoritative round.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): `None after local worktree env/bootstrap setup`
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `Not applicable`
- Compensating automated evidence: `Not needed`
- Residual risk notes: `No live desktop/manual UI run was executed in this round; behavior is proven through focused component-harness validation.`
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `N/A`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `N/A`
- If retained, why it remains useful as durable coverage: `Durable coverage lives in the updated repo-resident specs listed above.`

## Stage 7 Gate Decision

- Latest authoritative round: `1`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
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
- Notes: `Focused validation command passed with 10/10 tests after local worktree setup.`
