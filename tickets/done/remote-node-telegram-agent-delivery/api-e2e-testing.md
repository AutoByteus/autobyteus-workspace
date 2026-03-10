# API/E2E Testing

Use this document for Stage 7 API/E2E test implementation and execution.
Do not use this file for unit/integration tracking; that belongs in `implementation-progress.md`.
Stage 7 starts after Stage 6 implementation (source + unit/integration) is complete.

## Testing Scope

- Ticket: `remote-node-telegram-agent-delivery`
- Scope classification: `Medium`
- Workflow state source: `tickets/done/remote-node-telegram-agent-delivery/workflow-state.md`
- Requirements source: `tickets/done/remote-node-telegram-agent-delivery/requirements.md`
- Call stack source: `tickets/done/remote-node-telegram-agent-delivery/future-state-runtime-call-stack.md`
- Design source (`Medium/Large`): `tickets/done/remote-node-telegram-agent-delivery/proposed-design.md`
- Scenario ID convention:
  - This ticket already committed to stable `S-*` Stage 7 scenario IDs in `requirements.md`; Stage 7 execution keeps those IDs rather than renaming downstream artifacts mid-flight.

## Coverage Rules

- Every critical requirement must map to at least one scenario.
- Every in-scope acceptance criterion (`AC-*`) must map to at least one executable scenario.
- Every in-scope use case must map to at least one scenario, or explicitly `N/A` with rationale.
- `Design-Risk` scenarios must include explicit technical objective/risk and expected outcome.
- Manual testing is not part of the default workflow.
- Stage 7 cannot close while any acceptance criterion is `Unmapped`, `Not Run`, `Failed`, or `Blocked` unless explicitly marked `Waived` by user decision for infeasible cases.
- During Stage 7 execution, `workflow-state.md` should show `Current Stage = 7` and `Code Edit Permission = Unlocked`.
- Stage 7 includes test-file/harness implementation and test execution.

## Acceptance Criteria Coverage Matrix (Mandatory)

| Acceptance Criteria ID | Requirement ID | Criterion Summary | Scenario ID(s) | Current Status (`Unmapped`/`Not Run`/`Passed`/`Failed`/`Blocked`/`Waived`) | Last Updated |
| --- | --- | --- | --- | --- | --- |
| AC-001 | R-001 | Docker-hosted remote managed messaging must write a reachable internal callback URL instead of the public URL. | S-001 | Passed | 2026-03-10 |
| AC-002 | R-002 | Managed messaging must honor the actual runtime port rather than assuming `8000`. | S-002 | Passed | 2026-03-10 |
| AC-003 | R-003 | Public URL behavior must remain unchanged for outside clients. | S-003 | Passed | 2026-03-10 |
| AC-004 | R-004 | Missing internal runtime URL must fail explicitly during managed gateway startup. | S-004 | Passed | 2026-03-10 |

## Scenario Catalog

| Scenario ID | Source Type (`Requirement`/`Design-Risk`) | Acceptance Criteria ID(s) | Requirement ID(s) | Use Case ID(s) | Level (`API`/`E2E`) | Objective/Risk | Expected Outcome | Command/Harness | Status (`Not Started`/`In Progress`/`Passed`/`Failed`/`Blocked`/`N/A`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| S-001 | Requirement | AC-001 | R-001 | UC-001, UC-003 | E2E | Ensure Docker-style public URL and internal loopback URL are separated in the managed gateway runtime env. | `gateway.env` contains the internal callback URL and no longer points at the public host-mapped URL. | `vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts --no-watch` | Passed |
| S-002 | Requirement | AC-002 | R-002 | UC-002, UC-003 | E2E | Ensure the runtime-only callback URL can use a non-`8000` port. | `gateway.env` contains the dynamically seeded runtime port. | `vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts --no-watch` | Passed |
| S-003 | Requirement | AC-003 | R-003 | UC-001, UC-002 | API | Ensure public URL semantics remain unchanged while the gateway callback switches to the internal URL. | `appConfigProvider.config.getBaseUrl()` remains the public URL while `gateway.env` contains the internal URL. | `vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts --no-watch` | Passed |
| S-004 | Requirement | AC-004 | R-004 | UC-004 | API | Ensure managed gateway start fails explicitly when the runtime-only internal URL is absent. | GraphQL enable/start surfaces a deterministic runtime-url error. | `vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts --no-watch` | Passed |

## Failure Escalation Log

| Date | Scenario ID | Failure Summary | Investigation Required (`Yes`/`No`) | Classification (`Local Fix`/`Design Impact`/`Requirement Gap`/`Unclear`) | Action Path | `investigation-notes.md` Updated | Requirements Updated | Design Updated | Call Stack Regenerated | Review Re-Entry Round | Resolved |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 2026-03-10 | None | No Stage 7 failures recorded yet. | N/A | N/A | N/A | No | No | No | No | N/A | N/A |

Rules:
- Before final classification, run an investigation screen:
  - if issue scope is cross-cutting, root cause is unclear, or confidence is low, set `Investigation Required = Yes` and update `investigation-notes.md` first.
  - if issue is clearly bounded with high confidence, classification can proceed directly.
- For each failing scenario, update acceptance-criteria matrix statuses before and after re-entry.
- `Local Fix` requires artifact update first, then fix, then rerun `Stage 6 -> Stage 7` before rerunning affected scenarios.
- `Design Impact` requires `Investigation Required = Yes` and investigation checkpoint before design artifact updates.
- If a potential fix introduces compatibility wrappers/dual-path behavior/legacy retention, degrades decoupling (tight coupling/cycles), or keeps code in the wrong concern folder, classify as `Design Impact` (not `Local Fix`).
- If requirement-level gaps are found during design-impact investigation, reclassify to `Requirement Gap`.
- No direct source-code patching is allowed before required upstream artifacts are updated.
- `Design Impact` requires full-chain re-entry: `Stage 1 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7` before rerunning affected scenarios.
- `Requirement Gap` requires full-chain re-entry: `Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7` before rerunning affected scenarios.
- `Unclear`/cross-cutting root cause requires full-chain re-entry: `Stage 0 -> Stage 1 -> Stage 2 -> Stage 3 -> Stage 4 -> Stage 5 -> Stage 6 -> Stage 7`.
- Stage 0 in a re-entry path means re-open bootstrap controls in the same ticket/worktree (`workflow-state.md`, lock state, artifact baselines); do not create a new ticket folder.

## Feasibility And Risk Record

- Any infeasible scenarios (`Yes`/`No`): `No`
- If `Yes`, concrete infeasibility reason per scenario: N/A
- Environment constraints (secrets/tokens/access limits/dependencies):
  - Managed gateway E2E coverage uses the fake gateway archive harness and does not require live Telegram credentials.
- Compensating automated evidence:
  - Stage 6 unit tests already verified the runtime-only URL helper and explicit failure behavior at the module boundary.
- Residual risk notes:
  - Stage 7 still needs to prove the GraphQL-managed gateway harness seeds and consumes the runtime-only URL correctly.
- User waiver for infeasible acceptance criteria recorded (`Yes`/`No`): `No`
- If `Yes`, waiver reference (date/user decision): N/A

## Stage 7 Gate Decision

- Stage 7 complete: `Yes`
- All in-scope acceptance criteria mapped to scenarios: `Yes`
- All executable in-scope acceptance criteria status = `Passed`: `Yes`
- Critical executable scenarios passed: `Yes`
- Any infeasible acceptance criteria: `No`
- Explicit user waiver recorded for each infeasible acceptance criterion (if any): `N/A`
- Unresolved escalation items: `No`
- Ready to enter Stage 8 code review: `Yes`
- Notes:
  - Command executed: `vitest run tests/e2e/messaging/managed-messaging-gateway-graphql.e2e.test.ts tests/e2e/messaging/managed-messaging-gateway-update-graphql.e2e.test.ts --no-watch`
  - Result: 2 files passed, 9 tests passed.
