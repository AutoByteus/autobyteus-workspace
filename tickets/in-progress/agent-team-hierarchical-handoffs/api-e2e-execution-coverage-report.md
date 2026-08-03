# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- API/E2E Test Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-test-review-report.md`
- Delivery Revision Record (delivery re-entry only): `N/A`
- Relevant Delivery Revision IDs: `N/A`
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: `2`
- Trigger: `code_reviewer` CRR-003 / TR-F-001 reporting-only Local Fix after all 48 durable test files passed proportional review.
- Prior Round Reviewed: `API-REV-001 — Pass / 97.0%`
- Latest Authoritative Round: `Round 2 — corrected-lineage reissue in this report.`

## Investigation And Execution Basis

- Coverage investigation artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. Round 1 used the complete changed-test set, a broader affected suite, the full deterministic E2E suite, production typecheck/build, and structural audits. Round 2 is a bounded reporting-only correction and does not alter that plan or evidence.
- Existing coverage decisions revised during the current round, with evidence: `No`. The 6-added/42-updated/0-removed durable scope and all API-REV-001 scenario results are unchanged; CRR-003 explicitly passed every proportional test-code check.
- Reroute required before or during execution: `Yes — CRR-003 returned TR-F-001 solely to correct two inaccurate revision identifiers.`
- Notes: Round 2 corrected the API-REV-001 lineage to `SR-005; ARCH-REV-004; IR-002; CRR-002`. No executable artifact changed, so bounded artifact/manifest verification replaced unnecessary test reruns and final confidence remains 97.0%.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Compatibility reroute classification / upstream notification: `N/A`

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Acceptance Criteria | Changed Boundary | Execution Surface / Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| API-DEF-001 | Handoff round trip/order/clear/atomic rejection; AC-001–AC-004, AC-016 | Domain/file/GraphQL | In-process GraphQL+SQLite and provider durable tests | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-e2e-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| API-COMP-001 | Nested rebase/composition/collision; AC-005 | Topology compiler | Durable planner unit | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| API-ADDR-001 | Strict absolute/relative Agent-or-Team placement and Team ingress; AC-006–AC-010, AC-022 | Shared resolver/localizer | Durable direct units | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| E2E-MSG-001 | Nested/cross-boundary delivery, actual participants, exact-once event; AC-006–AC-011 | Mixed Team delivery/runtime | Durable coordinator/manager and GraphQL/WebSocket integration | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/affected-broad-final.log` |
| E2E-MSG-002 | Typed rejection with no delivery/event; AC-010, R-026 | Resolver/delivery side effects | Durable negative units | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| API-HANDOFF-001 | Sender-only ordered/empty/no-context `get_handoff_rules`; AC-012, AC-019 | Native tool + MCP | Actual tool registration/provider projection | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| API-PROMPT-001 | Hierarchical protocol/tool exposure; no roster/rule dump; AC-013, AC-019, AC-022 | Prompts/manifests | AutoByteus/Codex/Claude durable units | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/legacy-test-authority-audit-final.log` |
| E2E-SNAP-001 | Immutable handoffs and definition-independent restore; AC-014, AC-016–AC-018 | Metadata/TeamRun lifecycle | Definition-mutation mapper probe plus create/terminate/restore integration | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/ingress-final.log` |
| API-EXACT-001 | Exact live AgentRun selector/codes in provider envelope; AC-015, AC-019 | Router/projection | Durable provider/router units | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| API-DATA-001 | Missing handoffs -> `[]`; canonical writes; no migration/recompile; AC-016, AC-017 | File/metadata readers | Durable provider/mapper tests | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| E2E-TASK-001 | Direct Agent/Team delegation and result/review/revision/settlement; AC-018, AC-022 | Placement + task lifecycle | Six-scenario durable integration | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| E2E-TASK-002 | Self/non-direct/legacy/malformed rejection before activation; AC-022 | Task mapper/service | Durable negative coverage | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| E2E-DIR-001 | Persistent child bind/restore/dispose cleanup; AC-018/AC-022 support | Active child directory | Durable directory + subteam handle lifecycle | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| API-PROV-001 | Native and MCP/Codex/Claude envelope parity; AC-019 | Adapter boundary | Actual native/MCP projection; live LLM capability-gated | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-e2e-final.log` |
| E2E-INGRESS-001 | No-target TeamRun user post reaches root coordinator; AC-020 | Default Team ingress | Existing TeamRun unit + top-level integration | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/ingress-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/affected-broad-final.log` |

## Additional Repository Coverage Execution

| Order | Command | Working Directory / Configuration | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused 14-file baseline | `autobyteus-server-ts`, project Vitest/Prisma | Coverage validity | Expected baseline fail: 10 failed/4 passed files; 43 failed/33 passed tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/focused-baseline-20260803.log` |
| 2 | `pnpm exec vitest run --no-watch` baseline | Same | Whole-server baseline classification | 51 failed/489 passed/32 skipped files; mixed ticket-stale and unrelated pre-existing/order/environment failures | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/full-baseline-after-focused-20260803.log` |
| 3 | 40 changed non-E2E files | Same | All changed unit/integration | Pass: 40/40 files, 251/251 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` |
| 4 | 8 changed E2E files | Same | Changed public/runtime E2E collection | Pass: 6 tests; 20 live-provider tests declared skipped | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-e2e-final.log` |
| 5 | Affected unit/tool/integration directories | Same | Broader affected regression | Pass: 53/53 files, 229/229 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/affected-broad-final.log` |
| 6 | Runtime-selection integration + TeamRun unit | Same | Root coordinator ingress/create/restore | Pass: 2/2 files, 10/10 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/ingress-final.log` |
| 7 | `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` | Server | Production compilation | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/production-typecheck-final.log` |
| 8 | `pnpm run build:full` | Server | Build/assets/bootstrap | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/build-full-final.log` |
| 9 | `pnpm test:e2e` | Worktree root | Full deterministic E2E regression | Pass: 51 passed/14 skipped files; 178 passed/49 skipped tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/repository-e2e-final.log` |
| 10 | `git diff --check` and `rg` audits | Worktree root | Diff/legacy authority hygiene | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/diff-check-final.log`; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/legacy-test-authority-audit-final.log` |
| 11 | Exact lineage search, canonical artifact consistency/path checks, `git diff --check`, and before/after SHA-256 manifest comparison for all 48 reviewed test files | Worktree root; API-REV-002 reporting-only reissue | TR-F-001 resolution and proof that no executable coverage changed | Pass; both API-REV-001 lineage fields match approved IDs, invalid IDs are absent, referenced paths exist, and the 48-file manifest is unchanged | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/lineage-reissue-final.log` |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | Change | Final Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | 98% | +2 | Every critical AC mapped to passing durable evidence; full E2E passed | AC-021 correctly remains delivery-owned |
| Changed-boundary execution directness | 97% | 98% | +1 | Resolver/compiler/mapper/native/MCP/GraphQL/task/restore seams executed | Live model orchestration is not the changed authority |
| Cross-boundary integration realism and mock gap | 94% | 96% | +2 | GraphQL/WebSocket/SQLite/task lifecycle/full E2E | External Codex/Claude processes capability-gated |
| Environment, configuration, identity, and fixture fidelity | 95% | 96% | +1 | `.env.test`, Prisma, real test app, canonical identities | No external credentials supplied or needed |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | 98% | +1 | Typed rejection, atomicity, no-event, restore, revision/settlement, child cleanup | None material |
| User-surface/browser/desktop-shell confidence | N/A | N/A | N/A | No affected surface | None in scope |
| Durable regression coverage quality and relevance | 95% | 96% | +1 | 48 requirement-linked files; obsolete assertions replaced | Proportional code review is next gate |

- Overall post-repository confidence: `95.7%`
- Overall final confidence: `97.0%`
- Calculation: arithmetic mean of six applicable categories.
- Confidence change produced by broader validation: `+1.3 percentage points`.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: bounded external provider-process/bootstrap drift; deterministic adapter contract is directly proven.
- API-REV-002 confidence delta: `0.0 percentage points`; TR-F-001 was reporting-only, all executable evidence and the reviewed 48-file test manifest are unchanged.

## Broader Validation Decision And Execution

- Decision / mode: `Required — completed via deterministic Live API/Lifecycle using project-owned GraphQL, WebSocket, TeamRun, task, persistence, and full E2E harnesses.`
- Deviation: `None`; external real-provider LLM execution was intentionally not selected.
- Gap addressed: persistence, create/restore, root ingress, task settlement/cleanup, provider projection, whole-E2E regression.
- Startup/readiness: Prisma setup applied migrations; in-process apps/sockets reported readiness; full E2E exited without failures.
- Environment/data: worktree dependencies, `.env.test`, test-owned SQLite/temp roots, unique Agent/Team/task/MCP identities; no user/development data or external authentication.

| Journey | Expected | Actual / Evidence | Result |
| --- | --- | --- | --- |
| Definition create/update/invalid update/clear | Canonical order, typed rejection, unchanged state | Exactly observed; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-e2e-final.log` | Pass |
| TeamRun create/message/terminate/restore | Correct identity and restored behavior | Exactly observed; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/ingress-final.log` | Pass |
| Task Agent/Team lifecycle | Eligible activation; result/review/revision/settlement/cleanup | Six scenarios passed; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` | Pass |
| Full deterministic E2E | No deterministic failure | 178 passed/49 declared skipped; `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/repository-e2e-final.log` | Pass |

## Desktop Application Validation (When Applicable)

Not applicable. No frontend, browser, renderer, preload, IPC, or desktop-shell behavior changed. No running desktop application was affected.

## Platform / Runtime Targets

- OS: `macOS Darwin 25.5.0 arm64`
- Runtime: `Node.js v22.23.1`, `pnpm 10.28.2`, `Vitest 4.0.18`; remaining framework versions are workspace-locked.
- Browser/device/viewport/accessibility: `N/A`
- Timezone: `Europe/Berlin`

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: `Directly Usable — No Migration`
- Exercised data: missing `handoffs`, canonical empty/non-empty arrays, nested runtime identity, stored snapshot differing from mutated live definition.
- Result: missing fields read as `[]`; new writes retain canonical arrays; restore uses stored snapshot without definition lookup. Evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log`.
- Migration completion/recovery: `N/A`
- Version-specific branch/dual read-write/compatibility fallback observed: `No`
- Residual risk: `None material`

## Tests Implemented Or Updated

| Absolute Path | Change | Requirement / Boundary | Execution Result |
| --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` | Updated | Definition/file/GraphQL handoff contract | Pass (6/6) |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/all-runtime-send-message-matrix.e2e.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/claude-team-inter-agent-roundtrip.e2e.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/codex-team-inter-agent-roundtrip.e2e.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Updated | Hierarchical task selection and lifecycle | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Collected; live cases capability-gated; deterministic adapter proof passed |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Updated | TeamRun create/restore/snapshot/current-data behavior | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Updated | TeamRun create/restore/snapshot/current-data behavior | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/integration/agent-team-execution/mixed-team-run-backend.integration.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Updated | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/integration/api/runtime-selection-top-level.integration.test.ts` | Updated | TeamRun create/restore/snapshot/current-data behavior | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/backend/claude-session-bootstrapper.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/session/claude-session-tool-gating.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/claude/team-communication/team-member-claude-session-bootstrap-strategy.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/backend/codex-thread-bootstrapper.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/team-communication/team-member-codex-thread-bootstrap-strategy.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread-manager.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/backends/codex/thread/codex-thread.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-execution/shared/configured-agent-tool-exposure.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-definition/application-owned-team-source.test.ts` | Updated | Definition/file/GraphQL handoff contract | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-delivery-intent-builder.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-delivery.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/inter-agent-message-runtime-builders.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/member-run-instruction-composer.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/member-team-context-builder.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/mixed-agent-member-handle-memory-invariant.test.ts` | Updated | Affected runtime/provider regression | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/mixed-sub-team-member-handle.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-manager.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/mixed-team-member-registry-task-agent-memory.test.ts` | Updated | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/sub-team-active-run-directory.test.ts` | Added | Canonical topology, placement, localization, active-child lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-address-builder.test.ts` | Updated | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-service.test.ts` | Updated | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/task-delegation-target-mapper.test.ts` | Added | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-definition-topology-planner.test.ts` | Updated | Canonical topology, placement, localization, active-child lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-logical-placement-resolver.test.ts` | Added | Canonical topology, placement, localization, active-child lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-manager-member-interrupt.test.ts` | Updated | Hierarchical delivery, Team ingress, participants/events | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-member-delivery-coordinator.test.ts` | Added | Hierarchical delivery, Team ingress, participants/events | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-run-config-localization.test.ts` | Added | Canonical topology, placement, localization, active-child lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-run-metadata-mapper.test.ts` | Updated | TeamRun create/restore/snapshot/current-data behavior | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-team-execution/team-run-service.test.ts` | Updated | TeamRun create/restore/snapshot/current-data behavior | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-autobyteus-context.test.ts` | Updated | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-tools/task-delegation/task-delegation-runtime-descriptions.test.ts` | Updated | Hierarchical task selection and lifecycle | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-tools/team-communication/get-handoff-rules.test.ts` | Added | Provider-visible tools, instructions, native/MCP envelopes | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/tests/unit/agent-tools/team-communication/send-message-to.test.ts` | Updated | Provider-visible tools, instructions, native/MCP envelopes | Pass |

## Tests Removed As Stale Or Obsolete

No test file was removed. Obsolete assertions inside updated files were removed and replaced:

| Scenario family | Obsolete assertion | Upstream basis | Replacement |
| --- | --- | --- | --- |
| Context/instructions/delivery | Flat rosters, synthetic representatives, coordinator-only reachability | R-010, R-016 | Canonical addressing, actual participants, no roster/rule dump |
| Task | `{target:{kind,name}}` and caller target kind | R-023, R-027 | Shared `recipient_name`, task-owned eligibility/identity |
| Provider/runtime | Bare names and message-only/error-prefix result | R-007, R-021, R-026 | Strict paths and text/structured canonical envelopes |
| Persistence | New writes omit empty handoffs or restore consults live definition | R-017–R-020 | Absent read `[]`, canonical writes, stored snapshot restore |

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage changed in API-REV-002: `No`
- Carried API-REV-001 scope: `6 added, 42 updated, 0 removed`; all 48 files passed CRR-003 proportional test-code review.
- Exhaustive paths: table above.
- Added/updated paths attached for proportional review: `Not Applicable for API-REV-002; the unchanged cumulative 48-file set is attached for bounded re-verification.`
- Removed-path evidence: `N/A`

## Other Execution Artifacts

| Artifact | Purpose | Status |
| --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/focused-baseline-20260803.log` | Stale coverage baseline | Retained |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/full-baseline-after-focused-20260803.log` | Whole-server baseline/classification | Retained; not claimed as final pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-unit-integration-final.log` | All changed non-E2E | 251/251 pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/changed-e2e-final.log` | Changed E2E | 6 pass; 20 declared skip |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/affected-broad-final.log` | Broader affected regression | 229/229 pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/repository-e2e-final.log` | Full deterministic E2E | 178 pass; 49 declared skip |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/production-typecheck-final.log` | Production typecheck | Pass, empty output |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/build-full-final.log` | Build/bootstrap smoke | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/legacy-test-authority-audit-final.log` | Legacy input/authority audit | Pass |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/lineage-reissue-final.log` | API-REV-002 lineage/artifact/test-manifest verification | Pass |

## Temporary Execution Methods / Scaffolding

| Method | Why | Evidence | Cleanup |
| --- | --- | --- | --- |
| Static `rg` audits | Detect stale bare selectors/parallel authorities | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/legacy-test-authority-audit-final.log` | No resources |
| Accidental empty-list whole-suite invocations | Shell lacked `mapfile`; empty arguments invoked whole suite | Not used as completed evidence | Exact owned process trees terminated; none remain |
| Test-local apps/sockets/temp roots | Realistic API/lifecycle execution | Final suites passed | Project hooks closed/removed state |

## Dependencies Mocked Or Emulated

| Dependency | Method | Rationale | Limitation |
| --- | --- | --- | --- |
| Codex/Claude external models | Capability gates; actual MCP materializer/provider projection executed | Credentials/nondeterminism do not define AC-019 | Bounded provider bootstrap drift |
| LLM generation in lifecycle tests | Deterministic runtime/member recorders | Framework routing/lifecycle is boundary | No model-quality claim |
| Ollama/LM Studio discovery | Expected unavailable attempts in backend factory unit | Unrelated to ticket | None for covered behavior |

## Result Summary

| Result | Scenario IDs | Summary |
| --- | --- | --- |
| Pass | API-DEF-001 through E2E-INGRESS-001 | All critical behaviors have direct durable evidence; changed, broader affected, build, and full deterministic E2E checks pass. |
| Out Of Scope | AC-021, LLM judgment, browser/desktop, distributed messaging | Delivery-owned or explicitly excluded. |

## Cleanup Performed

| Resource | Ownership / Action | Result |
| --- | --- | --- |
| Apps/sockets/MCP sessions/TeamRuns/temp roots | Test-owned; project hooks/finalizers | Clean |
| SQLite test state | Prisma/Vitest-owned reset/isolation | No user/development data touched |
| Accidental Vitest process trees | API/E2E-owned; exact PIDs terminated | None remain |
| External services/provider sessions | None created | Nothing to clean |

## Preliminary Classification

`Local Fix resolved — Pass`. TR-F-001 was confined to API/E2E revision-lineage reporting; no executable or coverage defect existed.

## Recommended Recipient

`code_reviewer` for bounded verification of TR-F-001 resolution and the corrected API-REV-002 cumulative handoff. The 48 durable test files already passed proportional review.

## Evidence / Notes

- CRR-002 implementation/source review remains authoritative; this stage does not reopen it.
- CRR-003 passed all proportional durable test checks and failed only on TR-F-001. Both incorrect identifiers are now corrected to the approved `SR-005` / `ARCH-REV-004` lineage.
- API-REV-002 changed no executable artifact. The 48-file content manifest and all API-REV-001 execution/confidence evidence are unchanged.
- The whole-server baseline failure is retained and classified, not hidden. All final ticket-affected and deterministic E2E commands pass.
- External-provider skips are not counted as passes; actual deterministic native/MCP adapter parity supplies AC-019 proof.

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: `97.0%`
- Default `95%` target met: `Yes`
- Applicable category below `90%`: `No`
- Broader validation: `Required — completed`
- Critical criteria lacking direct proof: `None`
- Next recipient: `code_reviewer` for bounded TR-F-001 resolution verification
- Durable test files: `API-REV-002 changed none; cumulative scope remains 6 added, 42 updated, 0 removed and already passed proportional review`
