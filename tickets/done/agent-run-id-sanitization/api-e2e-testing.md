# Stage 7 Executable Validation (API/E2E)

Use this document for Stage 7 executable validation implementation and execution.
Stage 7 can cover API, browser/UI, native desktop/UI, CLI, process/lifecycle, integration, or other executable scenarios when those are the real boundaries being proven.
Do not use this file for unit/integration tracking; that belongs in `implementation.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

Validation philosophy:
- first persist the executable validation assets that should live in the repository and govern future changes
- then use broader executable validation when needed to prove behavior in the current environment
- keep temporary validation-only scaffolding only when it is clearly useful beyond the current ticket
- keep one canonical `api-e2e-testing.md` file for the ticket; record later rounds in the same file and treat the latest round as authoritative while preserving earlier rounds as history

## Validation Round Meta

- Current Validation Round: `1`
- Trigger Stage: `6`
- Prior Round Reviewed: `None`
- Latest Authoritative Round: `1`

Round rules:
- Do not create versioned Stage 7 files by default.
- On round `>1`, check prior unresolved failures first before treating the round as complete.
- Update coverage matrices and scenario statuses to the latest truth; keep failure history in the failure log and round tables below.
- Reuse the same `Scenario ID` for the same scenario across reruns. Add a new `Scenario ID` only for newly discovered coverage.

## Testing Scope

- Ticket: `agent-run-id-sanitization`
- Scope classification: `Small`
- Workflow state source: `tickets/done/agent-run-id-sanitization/workflow-state.md`
- Requirements source: `tickets/done/agent-run-id-sanitization/requirements.md`
- Call stack source: `tickets/done/agent-run-id-sanitization/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `N/A` (`Small` scope uses `implementation.md` as the design basis)
- Interface/system shape in scope: `Other`
- Platform/runtime targets: `Local macOS ticket worktree`, `pnpm workspace`, `Vitest`, `Node.js package runtime`
- Lifecycle boundaries in scope (`Install` / `Startup` / `Update` / `Restart` / `Migration` / `Shutdown` / `Recovery` / `None`): `None`

## Coverage Rules

- Every critical requirement must map to at least one scenario.
- Every in-scope acceptance criterion (`AC-*`) must map to at least one executable scenario.
- Every in-scope use case must map to at least one scenario, or explicitly `N/A` with rationale.
- Every relevant spine from the approved design basis must map to at least one scenario, or explicitly `N/A` with rationale.
- `Design-Risk` scenarios must include explicit technical objective/risk and expected outcome.
- Use stable scenario IDs with `AV-` prefix (for example: `AV-001`).
- Unstructured manual-only testing is not part of the default workflow. If OS/platform constraints force a human-assisted execution step, record the exact steps, automated evidence captured, constraints, and residual risk; do not treat ad hoc manual confirmation as sufficient Stage 7 coverage.
- Stage 7 cannot close while any acceptance criterion is `Unmapped`, `Not Run`, `Failed`, or `Blocked` unless explicitly marked `Waived` by user decision for infeasible cases.
- During Stage 7 execution, `workflow-state.md` should show `Current Stage = 7` and `Code Edit Permission = Unlocked`.
- Stage 7 includes test-file/harness implementation and test execution.
- Durable repo-resident validation should be added or updated first when it belongs in the codebase.
- Temporary executable validation is allowed when needed to prove behavior that durable repo-resident tests alone cannot yet prove.

## Validation Asset Strategy

- Durable validation assets to add/update in the repository:
  - `autobyteus-ts/tests/unit/agent/factory/agent-id.test.ts`
  - `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts`
  - `autobyteus-server-ts/tests/unit/run-history/agent-run-id-utils.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-memory/memory-file-store.test.ts`
- Temporary validation methods or setup to use only if needed: `None`
- Cleanup expectation for temporary validation: `N/A`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Stage 6 exit | N/A | No | Pass | Yes | Executed from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-sanitization` on branch `codex/agent-run-id-sanitization`. |

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Investigated id-generation and memory lookup call sites are represented by executable coverage on the affected boundaries. | AV-002, AV-003, AV-004 | Passed | 2026-04-10 |
| AC-002 | REQ-002 | The duplicated name/role shape is proven executable at the formatter boundary and corrected in standalone run-id generation. | AV-001, AV-003 | Passed | 2026-04-10 |
| AC-003 | REQ-003 | Standalone AutoByteus run ids use the shared normalization method. | AV-003 | Passed | 2026-04-10 |
| AC-004 | REQ-004, REQ-005 | New readable ids are folder-safe and do not duplicate identical normalized name/role stems. | AV-001, AV-002, AV-003 | Passed | 2026-04-10 |
| AC-005 | REQ-007 | Missing optional archive files no longer emit misleading warnings. | AV-004 | Passed | 2026-04-10 |
| AC-006 | REQ-003, REQ-004, REQ-005, REQ-007 | Targeted automated coverage exists for normalized ids and optional archive-warning behavior. | AV-001, AV-002, AV-003, AV-004 | Passed | 2026-04-10 |
| AC-007 | REQ-009 | Validation is executed from the dedicated ticket worktree and branch instead of only the personal workspace. | AV-005 | Passed | 2026-04-10 |

## Spine Coverage Matrix (Mandatory)

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | `AgentRunService` + shared readable-id formatter | AV-003 | Passed | Standalone run-id generation path is covered through the server wrapper test that delegates into the shared formatter. |
| DS-002 | Primary End-to-End | shared readable-id formatter | AV-001, AV-002 | Passed | Formatter and runtime factory usage are both exercised. |
| DS-003 | Return-Event | `MemoryFileStore` | AV-004 | Passed | Optional archive read behavior is covered directly. |

## Use Case Coverage Notes

| Use Case ID | Scenario ID(s) | Status (`Passed`/`N/A`) | Notes |
| --- | --- | --- | --- |
| UC-001 | AV-003 | Passed | Standalone AutoByteus run-id generation now uses the shared normalized formatter. |
| UC-002 | AV-001, AV-002 | Passed | Formatter and runtime-created agent ids both produce normalized folder-safe values. |
| UC-003 | N/A | N/A | This ticket intentionally does not migrate or rename persisted historical run ids. The change preserves literal stored-id lookup behavior by leaving restore/read path ownership unchanged. |
| UC-004 | AV-004 | Passed | Missing optional archive files return `[]` without a misleading warning. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Temporary Validation Method / Setup | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-002 | Requirement | AC-002, AC-004, AC-006 | REQ-002, REQ-004, REQ-005 | UC-002 | Integration | `autobyteus-ts` under Vitest | None | Prove the authoritative formatter normalizes spaces and punctuation and deduplicates identical normalized name/role stems. | Shared formatter returns a single normalized stem for identical name/role values and emits a folder-safe id format. | `autobyteus-ts/tests/unit/agent/factory/agent-id.test.ts` | None | `pnpm -C autobyteus-ts exec vitest --run tests/unit/agent/factory/agent-id.test.ts tests/unit/agent/factory/agent-factory.test.ts` | Passed |
| AV-002 | DS-002 | Requirement | AC-001, AC-004, AC-006 | REQ-001, REQ-004, REQ-005 | UC-002 | Integration | `autobyteus-ts` under Vitest | None | Prove runtime-created agent ids still flow through the shared normalized formatter. | `AgentFactory.createAgent(...)` emits normalized readable ids that no longer preserve spaces. | `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts` | None | `pnpm -C autobyteus-ts exec vitest --run tests/unit/agent/factory/agent-id.test.ts tests/unit/agent/factory/agent-factory.test.ts` | Passed |
| AV-003 | DS-001 | Requirement | AC-001, AC-002, AC-003, AC-004, AC-006 | REQ-001, REQ-002, REQ-003, REQ-004, REQ-005 | UC-001 | Integration | `autobyteus-server-ts` under Vitest | None | Prove standalone AutoByteus run-id generation reuses the shared formatter and no longer duplicates identical name/role segments. | Standalone run-id generation produces `xiaohongshu_marketer_1000` for identical `name` and `role`. | `autobyteus-server-ts/tests/unit/run-history/agent-run-id-utils.test.ts` | None | `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/run-history/agent-run-id-utils.test.ts tests/unit/agent-memory/memory-file-store.test.ts` | Passed |
| AV-004 | DS-003 | Requirement | AC-001, AC-005, AC-006 | REQ-001, REQ-007 | UC-004 | Integration | `autobyteus-server-ts` under Vitest | None | Prove optional archive reads do not emit a misleading missing-file warning while preserving missing-file warning behavior for other read paths. | `readRawTracesArchive(...)` returns `[]` without calling `console.warn`. | `autobyteus-server-ts/tests/unit/agent-memory/memory-file-store.test.ts` | None | `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/run-history/agent-run-id-utils.test.ts tests/unit/agent-memory/memory-file-store.test.ts` | Passed |
| AV-005 | N/A | Requirement | AC-007 | REQ-009 | N/A | CLI | local shell in dedicated worktree | None | Prove executable validation is running from the dedicated ticket worktree and branch requested by the user. | Validation evidence originates from `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-id-sanitization` on branch `codex/agent-run-id-sanitization`. | None | None | `pwd`; `git branch --show-current`; both Stage 7 Vitest commands executed from the same worktree | Passed |

## Validation Assets Implemented Or Updated

| Asset Path / Name | Asset Type (`API Test`/`Browser Test`/`Desktop Automation`/`CLI Harness`/`Lifecycle Harness`/`Process Probe`/`Harness`/`Fixture`/`Helper`/`Other`) | Durable In Repo (`Yes`/`No`) | Scenario ID(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/agent/factory/agent-id.test.ts` | Harness | Yes | AV-001 | Covers formatter deduplication and folder-safe normalization. |
| `autobyteus-ts/tests/unit/agent/factory/agent-factory.test.ts` | Harness | Yes | AV-002 | Verifies runtime-created agent ids use normalized readable-id output. |
| `autobyteus-server-ts/tests/unit/run-history/agent-run-id-utils.test.ts` | Harness | Yes | AV-003 | Verifies standalone AutoByteus run-id generation delegates into the shared formatter. |
| `autobyteus-server-ts/tests/unit/agent-memory/memory-file-store.test.ts` | Harness | Yes | AV-004 | Verifies optional archive reads avoid the misleading warning. |

## Temporary Validation Methods / Setup Used

| Method / Setup | Why Needed | Scenario ID(s) | Cleanup Required (`Yes`/`No`) | Cleanup Status |
| --- | --- | --- | --- | --- |
| None | No temporary validation-only setup was needed. | N/A | No | N/A |

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario ID | Previous Classification | Current Resolution (`Resolved`/`Partially Resolved`/`Still Failing`/`Not Applicable After Rework`) | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | Initial validation round. |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| N/A | N/A | No Stage 7 failures were found in round 1. | No | N/A | N/A | No | No | No | No | N/A | Yes |

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: `N/A`
- Environment constraints (secrets/tokens/access limits/dependencies): `None for the targeted local Vitest coverage once workspace dependencies were installed in the ticket worktree.`
- Platform/runtime specifics for lifecycle-sensitive scenarios (OS/device/runtime/version `from` -> `to`/package channel or update feed/signing/access requirements): `Not lifecycle-sensitive; validated on local macOS worktree runtime.`
- Compensating automated evidence: `N/A`
- Residual risk notes: `Forward-only readable-id format changes could affect untested downstream consumers if any string-match old spaced ids for new runs; persisted historical ids remain unchanged by design.`
- Human-assisted execution steps required because of platform or OS constraints (`Yes`/`No`): `No`
- If `Yes`, exact steps and evidence capture: `N/A`
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): `N/A`
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`
- If retained, why it remains useful as durable coverage: `N/A`

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
- Notes:
  - The dedicated ticket worktree and branch requirement was satisfied by executing the validation commands from the recorded worktree path.
  - `UC-003` remains a forward-compatibility/non-migration invariant rather than a new executable Stage 7 scenario because the fix intentionally leaves stored-id lookup behavior unchanged.

Authority rule:
- The latest round recorded above is the active Stage 7 truth for transition and re-entry decisions.
- Earlier rounds remain in the file as history and audit trail.
