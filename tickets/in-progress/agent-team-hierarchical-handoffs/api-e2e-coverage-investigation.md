# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-spec.md`
- Supplemental Task Artifact: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/agent-team-addressing-handoff-contract.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/code-review-revision-record.md`
- Delivery Revision Record (prior SR-005 checkpoint context only): `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/delivery-revision-record.md`
- Relevant Delivery Revision IDs: prior SR-005 entries only; none proves SR-006.
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-003`
- Current Investigation Round: `3`
- Trigger: `CRR-005` Pass for `IR-003`, commit `bf268b19fc5e96b810b98fcb5af6d3154388f463`, implementing approved `SR-006` / `ARCH-REV-005`.
- Prior Investigation Reviewed: Round 2 / `API-REV-002`, authoritative only for SR-005.
- Latest Authoritative Investigation: this file; initial SR-006 plan was recorded here before any round-3 durable edit or execution, then updated with actual evidence.

## Current Requirement And Design Basis

SR-006 makes the mounted logical address the sole shared collaboration identity. `MemberLogicalAddressContext` must be exactly `{rootTeamRunId, memberAddress}` for persistent, restored, task-Agent, and task-Team callers (R-028–R-029; AC-023). Shared placement must be exactly Agent `{kind:"agent",address}` or Team `{kind:"team",address,ingressAddress}` and absolute/relative expressions must produce deep-equal results without derived or lifecycle fields (R-030; AC-024). Message delivery privately derives execution identity at the root. Task delegation proves same canonical parent first, then maps basename to exactly one direct current-local config and validates Team ingress before activation (R-031; AC-025).

All SR-005 nested/upward/cross-branch messaging, Team-ingress self rejection, direct task Agent/Team activation, rejection-before-mutation, instructions/handoffs, exact-run routing, events, restore, provider envelopes, root ingress, and active-child lifecycle remain required by AC-025. Broader TeamRun/history/event/task `memberPath` and `memberRouteKey` identities are explicitly outside SR-006 and remain valid. SR-006 persisted data is `Not Affected`; the earlier handoff-snapshot `Directly Usable — No Migration` behavior remains a preserved regression.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-012 / caller context | Changed | R-028–R-029; AC-023 | Exact two-field proof across persistent, restored, task-Agent, task-Team, and mixed-memory construction. |
| BEH-012 / placement | Changed | R-028, R-030; AC-024 | Direct derivation and exact minimal Agent/Team equality, including forbidden-field absence. |
| BEH-012 / message mapping | Changed | R-031; AC-025 | Root-private materialization plus preserved nested/upward/cross-branch/exact-run behavior. |
| BEH-012 / task mapping | Changed | R-031; AC-025 | Parent-first direct-local mapping, exact-one selection, Team-ingress validation, and no mutation on rejection. |
| BEH-001–BEH-011 | Preserved | AC-025 | Fresh affected and repository E2E regression execution against SR-006. |
| Persisted collaboration coordinates | Preserved / Not Affected | SR-006 design; IR-003 handoff | No migration or compatibility coverage; execute restore/current-data regression. |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Residual Risk | Broader Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Address derivation, exact context, minimal placement, task/message mapping | Direct unit plus lifecycle integration | Negligible after passing exact and composition checks | Focused + affected lifecycle |
| API / transport / contract | Yes, preserved integration | GraphQL/WebSocket/tool ingress consumes reduced contexts | Runtime-selection integration and deterministic E2E | Live model process bootstrap is capability-gated | In-process API/E2E |
| Frontend / browser / desktop | No | No source or user-surface change | N/A | None | None |
| Authentication / permissions | No | No policy change | Existing gating regression | None | None |
| Process / lifecycle | Yes | Persistent/restored/task child context and mutation ordering | Three maintained integration files; broad suites | None material | Lifecycle/API |
| Persisted-data transition | No for SR-006 | Runtime-derived ephemeral projections | Snapshot/restore/current-data regression | None material | Repository lifecycle |
| Worker / queue / distributed | No | No change | N/A | None | None |
| External integration | No for required proof | Deterministic native/MCP/provider projections | Provider adapter/materializer tests | Bounded external provider-process drift | Capability-gated only |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs`
- Stack: pnpm workspace; Node.js/TypeScript; Fastify/Mercurius GraphQL; Prisma/SQLite; Vitest 4.0.18 fork workers with serial file execution.
- Conflicting/missing instructions: none blocking. Production typecheck uses `tsconfig.build.json`; test execution uses `.env.test` and test-owned Prisma/temp state.
- Required secrets: `N/A` for deterministic evidence. External provider capability skips are reported, never counted as passes.

| Instruction / Configuration Path | Authority / Learned Constraint |
| --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/AGENTS.md` | Use Vitest `run` / `--no-watch`; focused, integration, and full paths supported. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/README.md` | `.env.test`, test-owned `tests/.tmp` SQLite; unavailable capabilities skip explicitly. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/package.json` | Root `pnpm test:e2e` is the deterministic server E2E path. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/package.json` | `build:full`, shared/bootstrap preparation, Vitest commands. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-server-ts/vitest.config.ts` | Node environment, forks, no file parallelism, Prisma global setup. |

| Component | Setup / Execution | Safety / Readiness | Cleanup |
| --- | --- | --- | --- |
| Unit/integration | `pnpm exec vitest run <paths> --no-watch` in server package | `.env.test`; Prisma setup succeeds | Vitest/hooks exit and remove owned state |
| GraphQL/WebSocket/E2E | Root `pnpm test:e2e` | Test-local apps/sockets/stores and readiness helpers | Project hooks close apps/sockets/temp roots |
| Production build | Server typecheck and `pnpm run build:full` | Workspace-locked dependencies | No persistent process |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected` for SR-006; prior handoff snapshots remain `Directly Usable — No Migration`.
- Representative data: current Team definitions, TeamRun metadata, handoff snapshots, events, task records, and restored mixed members.
- Evidence: affected lifecycle/API suites re-executed restore/current-data behavior; exact restored Coordinator and Specialist contexts were added after inspection exposed that observable AC-023 gap.
- Migration completion/recovery: `N/A`.
- Upstream ambiguity/reroute: `None`.

## Existing Durable Coverage Inventory And Final Decisions

| Path / Scenario | Intent | Requirement | Validity Decision | Final Action / Evidence |
| --- | --- | --- | --- | --- |
| `tests/unit/agent-collaboration/collaboration-logical-address.test.ts` | Derive segments/parent/basename/route and canonicalize requests | R-028–R-029; AC-023 | Still Valid | Retained; focused pass. |
| `tests/unit/agent-team-execution/member-team-context-builder.test.ts` and provider context projections | Exact frozen two-field caller context | R-029; AC-023 | Still Valid | Retained; focused/affected pass. |
| `tests/unit/agent-team-execution/team-logical-placement-resolver.test.ts` | Deep-equal minimal placement; duplicate leaves | R-030; AC-024 | Still Valid | Retained; focused/affected pass. |
| Message manager/delivery/tool/provider suites | Private root mapping and preserved message behavior | R-031; AC-025 | Still Valid | Retained; affected/E2E pass. |
| Task mapper/service suites | Parent-first direct-local mapping and pre-mutation rejection | R-031; AC-025 | Still Valid | Retained; focused/affected pass. |
| `tests/unit/agent-tools/task-delegation/task-delegation-autobyteus-context.test.ts` negative fixture | Reject removed `memberPath` inside addressing | R-029; AC-023 | Still Valid | Retained intentionally; static audit identifies it as the sole negative occurrence. |
| `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Persistent/task Agent/task Team lifecycle composition | AC-023, AC-025 | Needs Update — completed | Replaced removed context inputs and added exact `/coordinator`, `/worker`, `/design_team/team_lead` assertions. |
| `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Mixed runtime memory/event context composition | AC-023, AC-025 | Needs Update — completed | Removed derived addressing fields and asserted exact `/Coordinator` context. |
| `tests/integration/api/runtime-selection-top-level.integration.test.ts` | GraphQL/WebSocket create, message, restore | AC-023, AC-025 | Needs Update — completed | Exact initial and restored Coordinator plus restored Specialist two-field assertions. |
| Broader TeamRun/history/event/task `memberPath` fixtures | Execution identity outside collaboration context | SR-006 non-goal | Out Of Scope for removal | Retained and regression-executed. |

## Stale Or Obsolete Coverage Decisions

No durable file or scenario was deleted. The three stale fixture fragments were replaced in place. The only remaining removed-field fixture is deliberate negative rejection coverage.

## Durable Coverage To Add

No file was added. Inspection after the initial update found a missing observable restore assertion, so `ADDR-CTX-RESTORE-001` was added inside the already planned runtime-selection integration file.

## Durable Coverage To Update

| Scenario ID | Path | Completed Update | Evidence |
| --- | --- | --- | --- |
| ADDR-CTX-LIFECYCLE-001 | `tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts` | Canonical address construction and exact persistent/task-Agent/task-Team context assertions | Focused and affected logs |
| ADDR-CTX-MEMORY-001 | `tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts` | Exact two-field created-backend context | Focused and affected logs |
| ADDR-CTX-API-001 / ADDR-CTX-RESTORE-001 | `tests/integration/api/runtime-selection-top-level.integration.test.ts` | Exact initial and restored Coordinator/Specialist contexts | Focused and affected logs |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | Focused 11-file Vitest command recorded verbatim in log | `autobyteus-server-ts`; `.env.test` | AC-023/024, task/message mapping, three maintained integrations | Pass: 11 files / 77 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-focused-final.log` |
| 2 | `pnpm exec vitest run tests/unit/agent-collaboration tests/unit/agent-team-execution tests/unit/agent-tools/team-communication tests/unit/agent-tools/task-delegation tests/unit/agent-execution/backends/autobyteus tests/unit/agent-execution/backends/claude tests/unit/agent-execution/backends/codex tests/unit/agent-execution/events/token-usage-event-enrichment-transformer.test.ts tests/integration/agent-team-execution tests/integration/agent-memory/cross-runtime-memory-persistence.integration.test.ts tests/integration/api/runtime-selection-top-level.integration.test.ts --no-watch` | `autobyteus-server-ts` | Affected collaboration/provider/lifecycle regression | Pass: 94 files / 637 tests | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-affected-broad-final.log` |
| 3 | `pnpm test:e2e` | Worktree root | Full deterministic E2E | Pass: 51 files / 178 tests; 14 files / 49 tests capability-skipped | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-repository-e2e-final.log` |
| 4 | `pnpm exec tsc -p tsconfig.build.json --noEmit --pretty false` | `autobyteus-server-ts` | Production TypeScript | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-production-typecheck-final.log` |
| 5 | `pnpm run build:full` | `autobyteus-server-ts` | Build/assets/sanitized bootstrap smoke | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-build-full-final.log` |
| 6 | `pnpm exec vitest run --no-watch` | `autobyteus-server-ts` | Independent whole-server baseline classification | Non-clean baseline: 24 failed / 518 passed / 32 skipped files; 57 failed / 2818 passed / 110 skipped tests. Zero failing-file intersection with SR-006 commit/current test delta; not acceptance evidence. | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-broader-baseline.log` |
| 7 | `git diff --check` plus Python fixture/diff/failure-intersection audit | Worktree root | No positive stale collaboration fixture; exactly planned three-file test delta; baseline separation | Pass | `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/tickets/in-progress/agent-team-hierarchical-handoffs/api-e2e-evidence/sr006-static-audit-final.log` |

## Post-Repository Confidence Scorecard

| Confidence Category | Score | Support | Remaining Uncertainty | Possible Improvement |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | AC-023–025 and preserved ACs map to passing exact, negative, lifecycle, API, and E2E evidence | Negligible capability-gated provider process drift | Credentialed live model run, not material to contract |
| Changed-boundary execution directness | 98% | Address domain, resolver, context builders, message manager, task mapper/service, and integrations executed | None material | None |
| Cross-boundary integration realism and mock gap | 96% | Prisma, GraphQL/WebSocket, TeamRun restore, task lifecycle, native/MCP projections, full deterministic E2E | External model generation not executed | Optional credentialed provider run |
| Environment, configuration, identity, and fixture fidelity | 96% | Project `.env.test`, Prisma migrations, exact root/member identities, test-owned app/socket/temp data | No external credentials | None for approved boundary |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Removed-field rejection, duplicate leaves, cross-branch/self/ingress rejection, no premature mutation, restore, settlement, cleanup | None material | None |
| User-surface, browser, and desktop-shell confidence | N/A | No frontend/browser/desktop surface changed | None | None |
| Durable regression coverage quality and relevance | 97% | Narrow three-file repair plus direct SR-006 units, affected 637-test sweep, E2E 178-test pass, static authority audit | Proportional code review remains the next gate | Code review |

- Overall post-repository confidence: `97.0%` (simple average of six applicable categories: 582 / 6).
- Every critical acceptance criterion directly proven: `Yes`.
- Any applicable category below 90%: `No`.
- Default 95% target met: `Yes`.
- Material residual risks: bounded real Codex/Claude process/bootstrap drift; whole-server baseline remains non-clean in 24 unrelated files, transparently separated by zero file intersection while the affected 94-file and deterministic E2E suites pass.

## Broader Validation Decision

- Decision: `Required — completed`.
- Selected mode: `Lifecycle / in-process API and repository E2E`.
- Gap addressed: exact reduced contexts had to survive persistent, restored, task-Agent/task-Team, GraphQL/WebSocket, memory/event, and provider composition.
- Evidence gain: affected 94-file/637-test execution, full deterministic 51-file/178-test E2E, production build/bootstrap, and explicit full-baseline classification.
- Browser rationale: no browser/frontend boundary changed; in-process API/WebSocket and lifecycle surfaces directly exercise the backend contract.
- Expected/final confidence: `97.0%`.

## Desktop Application Validation Decision

`N/A`: no renderer, shell, preload, IPC, packaging, or web-equivalent UI behavior changed. No running desktop application was affected.

## Live Environment And Fixture Plan / Result

- Startup: project Vitest helpers and root `pnpm test:e2e`; no manually retained service.
- Environment: `.env.test`, Prisma global setup, test-owned SQLite/temp roots, serial file execution.
- Identities/fixtures: nested and duplicate-leaf teams, persistent/restored/task Agent/task Team member addresses, GraphQL/WebSocket TeamRun, deterministic native/MCP registries.
- Readiness: Prisma setup, app helpers, and WebSocket connection signals passed.
- Cleanup: project hooks closed app/socket/session/TeamRun resources and test temp state; no external service or user data was created.

## Temporary Executable Validation

| Scenario ID | Method | Result | Why Temporary |
| --- | --- | --- | --- |
| STATIC-SR006-001 | Python/`git` audit of addressing shapes, changed test files, restored assertions, and whole-baseline failing-file intersection | Pass | Structural review evidence complements, but does not replace, durable behavior tests. |

## Not Tested / Infeasible / Deferred

| Boundary | Reason | Risk / Follow-Up |
| --- | --- | --- |
| Real Codex/Claude model round-trip | Credential/capability-gated and nondeterministic; deterministic native/MCP adapter behavior passed | Bounded provider-process drift; not a critical contract gap |
| Browser/desktop | No changed surface | None |
| Distributed/multi-node | No distributed change | None |
| 24 unrelated whole-server baseline failures | Zero failing-file intersection with SR-006 production/test delta; direct affected and deterministic E2E checks are clean | Existing repository health debt; not attributed to this ticket |

## Ambiguities Or Reroute Triggers

None. No requirement, design, source, or execution reroute was triggered.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes — completed`.
- Repository-resident durable coverage added / updated / removed: `0 added / 3 updated / 0 removed`.
- Post-repository confidence: `97.0%`.
- Broader validation: `Required — completed`.
- Reroute Required Before Validation Execution: `No`.
- Final result: `Pass`.
- Recommended Recipient: `code_reviewer` for proportional review of the three updated durable test files.
