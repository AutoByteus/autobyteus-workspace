# Stage 7 Executable Validation (API/E2E)

## Validation Round Meta

- Current Validation Round: `12`
- Trigger Stage: `7`
- Prior Round Reviewed: `10`
- Latest Authoritative Round: `12`

## Testing Scope

- Ticket: `telegram-outbound-reply-lag`
- Scope classification: `Small`
- Workflow state source: `tickets/done/telegram-outbound-reply-lag/workflow-state.md`
- Requirements source: `tickets/done/telegram-outbound-reply-lag/requirements.md`
- Call stack source: `tickets/done/telegram-outbound-reply-lag/future-state-runtime-call-stack.md`
- Interface/system shape in scope: `API`, `Worker/Process`, `Integration`
- Platform/runtime targets: local `vitest`, file-backed external-channel persistence, native AutoByteus agent runtime, native AutoByteus team runtime, packaged Electron server build path
- Lifecycle boundaries in scope: `Recovery`, `Streaming`

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked (`Yes`/`No`/`N/A`) | New Failures Found (`Yes`/`No`) | Gate Result (`Pass`/`Fail`/`Blocked`) | Latest Authoritative (`Yes`/`No`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 9 | Stage 6 exit after the packaged-build local fix | Yes | No | Pass | No | The packaged server build became green again and the unsigned local macOS Electron build completed. |
| 10 | Real packaged Electron + Telegram verification | Yes | Yes | Fail | No | Live packaged verification disproved the prior pass: the first bound Telegram reply still lagged one turn behind in the native AutoByteus path. |
| 11 | Stage 6 exit after the dispatch-scoped first-turn capture fix | Yes | No | Pass | No | Focused serial server validation now includes immediate native `TURN_STARTED` timing, the ingress/recovery slice passes again, and the packaged server build remains green. |
| 12 | Stage 6 exit after the split-owner cleanup | Yes | No | Pass | Yes | The same focused serial validation still passes after the recovery-runtime boundary cleanup and internal owner split, and the packaged server build remains green. |

## Acceptance Criteria Coverage Matrix

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Direct dispatch stays enqueue-oriented and does not read active-turn state synchronously | AV-001 | Passed | 2026-04-07 |
| AC-002 | R-002 | Team dispatch stays enqueue-oriented and does not read target-member active-turn state synchronously | AV-001 | Passed | 2026-04-07 |
| AC-003 | R-003 | Accepted receipts may persist with `turnId = null` while exact run identity is already known | AV-001 | Passed | 2026-04-07 |
| AC-004 | R-004 | Missing `turnId` binds later from matching `TURN_STARTED(turnId)` | AV-001 | Passed | 2026-04-07 |
| AC-005 | R-005 | Late binding is deterministic and oldest unmatched accepted receipt wins | AV-001 | Passed | 2026-04-07 |
| AC-006 | R-006 | Native AutoByteus still emits exact `TURN_STARTED` and `TURN_COMPLETED` while clearing the matching active turn | AV-002, AV-003 | Passed | 2026-04-07 |
| AC-007 | R-007 | Post-LLM turn finalization is owned by a named runtime helper/decision | AV-002, AV-003 | Passed | 2026-04-07 |
| AC-008 | R-008 | Reply bridges publish only from exact persisted correlation plus `TURN_COMPLETED(turnId)` | AV-001, AV-004 | Passed | 2026-04-07 |
| AC-009 | R-009 | `AcceptedReceiptRecoveryRuntime` removes the dead dependency surface | AV-001 | Passed | 2026-04-07 |
| AC-010 | R-010 | Focused regression coverage exists for late correlation, deterministic binding, explicit turn finalization, and strict recovery | AV-001, AV-002, AV-003, AV-004 | Passed | 2026-04-07 |
| AC-011 | R-011 | First bound accepted receipt cannot miss its own turn when native `TURN_STARTED` fires before async recovery observation starts | AV-001 | Passed | 2026-04-07 |
| AC-012 | R-012 | Stage 7 includes a native-timing regression that fails if the first bound reply lags until a later inbound message | AV-001 | Passed | 2026-04-07 |

## Spine Coverage Matrix

| Spine ID | Spine Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Governing Owner | Scenario ID(s) | Coverage Status (`Unmapped`/`Planned`/`Passed`/`Failed`/`Blocked`/`N/A`) | Notes |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | External channel ingress + recovery runtime | AV-001, AV-004 | Passed | The ingress/recovery spine now pre-arms dispatch-scoped turn capture before enqueue, persists immediate captured correlation when available, and still publishes only from exact persisted correlation plus `TURN_COMPLETED(turnId)`. |
| DS-002 | Bounded Local | Native AutoByteus turn lifecycle ownership | AV-002, AV-003 | Passed | Native turn ownership and completion remain explicit and unchanged in authority. |
| DS-003 | Return-Event | Strict reply publication bridges | AV-004 | Passed | Direct/team reply publication still ignores turnless completion and depends only on exact persisted turn identity. |

## Scenario Catalog

| Scenario ID | Spine ID(s) | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Validation Mode (`API`/`Browser-E2E`/`Desktop-UI`/`CLI`/`Integration`/`Process`/`Lifecycle`/`Other`) | Platform / Runtime | Lifecycle Boundary (`None`/`Install`/`Startup`/`Update`/`Restart`/`Migration`/`Shutdown`/`Recovery`) | Objective/Risk | Expected Outcome | Durable Validation Asset(s) | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| AV-001 | DS-001 | Requirement | AC-001, AC-002, AC-003, AC-004, AC-005, AC-010, AC-011, AC-012 | R-001, R-002, R-003, R-004, R-005, R-010, R-011, R-012 | Integration | `vitest` REST ingress + recovery runtime with immediate native turn timing | Recovery | Prove that the first bound accepted receipt cannot miss the just-dispatched native turn even when `TURN_STARTED` fires immediately during the dispatch boundary | The accepted receipt either persists the first captured `turnId` immediately or is updated by the same dispatch-scoped capture session later, and the first reply is published without a second inbound message | `channel-ingress.integration.test.ts`, `channel-ingress-service.test.ts`, `channel-agent-run-facade.test.ts`, `channel-team-run-facade.test.ts`, `channel-run-facade.test.ts`, `accepted-receipt-recovery-runtime.test.ts` | `pnpm exec vitest run --no-file-parallelism --maxWorkers=1 tests/unit/external-channel/services/channel-ingress-service.test.ts tests/unit/external-channel/runtime/channel-run-facade.test.ts tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-team-run-facade.test.ts tests/unit/external-channel/runtime/accepted-receipt-recovery-runtime.test.ts tests/integration/api/rest/channel-ingress.integration.test.ts --reporter=verbose` | Passed |
| AV-002 | DS-002 | Requirement | AC-006, AC-007, AC-010 | R-006, R-007, R-010 | Integration | `vitest` native AutoByteus unit/runtime coverage | Streaming | Reconfirm exact native turn lifecycle ownership after the server-only ingress fix | Native runtime still emits exact `TURN_*`, and completion still clears the matching active turn only through the named runtime-owned rule | Existing authoritative native runtime tests from prior validated rounds; no server-side change in this round touched native ownership files | N/A in this round; prior authoritative evidence reused | Passed |
| AV-003 | DS-002 | Design-Risk | AC-006, AC-007, AC-010 | R-006, R-007, R-010 | Integration | `pnpm build` packaged server path | Startup | Reconfirm the server build remains green after the new hook surface and capture coordination changes | The packaged server build path compiles and copies managed messaging assets successfully | `autobyteus-server-ts` build output | `pnpm build` | Passed |
| AV-004 | DS-003 | Design-Risk | AC-008, AC-010 | R-008, R-010 | Integration | `vitest` direct/team reply bridge slice | Recovery | Ensure the unchanged strict reply-publication bridges still behave correctly after the new ingress/capture cut | Direct and team reply bridges still publish only from exact persisted correlation and ignore turnless completion/status signals | `channel-agent-run-reply-bridge.test.ts`, `channel-team-run-reply-bridge.test.ts` | `pnpm exec vitest run --no-file-parallelism --maxWorkers=1 tests/unit/external-channel/runtime/channel-agent-run-reply-bridge.test.ts tests/unit/external-channel/runtime/channel-team-run-reply-bridge.test.ts --reporter=verbose` | Passed |

## Validation Assets Implemented Or Updated

- `autobyteus-server-ts/tests/integration/api/rest/channel-ingress.integration.test.ts`
  - now models immediate native `TURN_STARTED` timing instead of only delayed mock timers
- `autobyteus-server-ts/tests/unit/external-channel/services/channel-ingress-service.test.ts`
- `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-run-facade.test.ts`
- `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`
- `autobyteus-server-ts/tests/unit/external-channel/runtime/channel-team-run-facade.test.ts`
  - lock in the dispatch-scoped pre-enqueue capture path and immediate captured-turn persistence behavior

## Round 12 Validation Summary

- Round 11 fixed the functional race but left a structural Stage 8 failure: one oversized correlation owner and one boundary leak from ingress into an internal type.
- Round 12 preserves the same passing runtime behavior while cleaning up the owner split:
  - ingress/recovery slice: `6` files passed, `35` tests passed
  - strict reply-bridge slice: `2` files passed, `9` tests passed
  - packaged server build path: `pnpm build` passed
- The split-owner cleanup did not change the ticket-critical expected behavior:
  - first bound accepted receipt still captures its own immediate native turn
  - strict reply publication still uses only exact persisted correlation plus `TURN_COMPLETED(turnId)`

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- Environment constraints (secrets/tokens/access limits/dependencies): serial local execution remains intentional on this machine; live Telegram verification remains manual user work after the next Electron rebuild
- Residual risk notes: the immediate-turn server integration is now authoritative for the corrected timing cut, but the user still needs one fresh packaged desktop Telegram verification after rebuilding the Electron artifact with this updated server
- Temporary validation-only scaffolding cleaned up (`Yes`/`No`/`Partially`): `Yes`

## Stage 7 Gate Decision

- Latest authoritative round: `12`
- Latest authoritative result (`Pass`/`Fail`/`Blocked`): `Pass`
- Stage 7 complete: `Yes`
- Durable executable validation that should live in the repository was implemented or updated: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All relevant executable spines mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes: The immediate native-turn timing gap is now represented directly in durable validation assets and passes. Fresh packaged desktop Telegram verification remains a later Stage 10 user-verification hold.
