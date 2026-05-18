# API, E2E, And Executable Validation Report

## Validation Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-spec.md`
- Architecture Pivot Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-architecture-pivot-notes.md`
- Post-Delivery Rework Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-post-delivery-rework-notes.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-review-report.md`
- Historical Design Rework Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/design-rework-notes.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/implementation-handoff.md`
- Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/tickets/in-progress/individual-agent-initializing-status/review-report.md`
- Current Validation Round: 3
- Trigger: Code review round 8 passed for the post-delivery command-correlated overlay replacement package and the user explicitly requested durable E2E coverage for the start/stop-or-inactive/resend status sequence.
- Prior Round Reviewed: Round 2 API/E2E was reviewed and then the implementation went through post-delivery command-correlated rework plus code review round 8.
- Latest Authoritative Round: 3

## Round History

| Round | Trigger | Prior Unresolved Failures Rechecked | New Failures Found | Result | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Code review round 2 pass for frontend-placeholder implementation | N/A | None in then-current scope | Superseded | No | Round 1 validated local frontend placeholders. Later architecture pivot intentionally replaced this with backend-owned command status overlays. |
| 2 | Code review round 5 pass for backend-owned lifecycle | No unresolved Round 1 failures; Round 1 scope invalidated by pivot | None in ticket-scope validation. Broader typecheck/full frontend store-suite debt recorded. | Pass | No | Added/updated durable backend websocket integration, provisioning, external-channel, status-projection, and stream-handler validation. Routed back to code review because durable validation changed. |
| 3 | Code review round 8 pass plus user request for actual E2E status-sequence coverage | Rechecked Round 2 command-overlay websocket/API coverage and the new post-delivery AC-017/AC-018 risk | None | Pass | Yes | Added a focused deterministic E2E websocket lifecycle test for `start -> inactive/offline -> resend -> initializing -> running`, including restored runtime snapshot already `running` staying internal until command-correlated `TURN_STARTED`. Routed back to code review because durable validation changed. |

## Validation Basis

Round 3 validates the reviewed post-delivery invariant:

- Websocket connect for an inactive standalone run is identity/projection-only and must not restore or activate runtime.
- `SEND_MESSAGE(message_id, dedupe_key)` for an inactive run must publish backend-owned `Initializing` before restore/activation/send work resolves.
- Restored runtime readiness, websocket bind success, `statusHint=ACTIVE`, metadata `lastKnownStatus=ACTIVE`, and active runtime snapshot availability must **not** replace the command overlay.
- The overlay may be replaced only by command-correlated post-handoff evidence such as `TURN_STARTED`, command-correlated `AGENT_STATUS`, terminal/error event, or coordinator-handled activation/post failure.
- The visible sequence for AC-017/AC-018 must be `offline -> initializing -> running`, with no false restored-snapshot `running` before command execution evidence.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable validation added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Validation Surfaces / Modes

- New deterministic E2E Fastify websocket test using the production `/ws/agent/:runId` route registration, `AgentStreamHandler`, `AgentRunCommandCoordinator`, command registry, overlay store, status projection service, broadcaster, and an `AgentRun` runtime subject with a scripted backend.
- Existing real-Fastify websocket integration coverage for identity-only connect, slow restore, running no-downgrade, prepared activation, duplicate/busy ACKs, activation failure, non-SEND active-only behavior, and status normalization.
- Backend unit/regression suites for coordinator, projection, provisioning, stream handler, external-channel facade/launcher, command registry, and run-history service.
- Frontend Pinia/service suites for command identity serialization, `PrepareAgentRun`, ACK/status handling, and no frontend restore-before-send behavior.
- Source/build/typecheck probes with known broad project debt documented.

## Platform / Runtime Targets

- Host/worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status`
- Package manager: `pnpm`
- Backend package: `autobyteus-server-ts`, Vitest 4.0.18, Fastify websocket over local ephemeral ports.
- Frontend package: `autobyteus-web`, Vitest 3.2.4 / Nuxt typecheck.
- Runtime dependency in new E2E: deterministic scripted `AgentRunBackend`; no external LLM process needed for the status-sequencing contract.

## Lifecycle / Upgrade / Restart / Migration Checks

No native installer, desktop upgrade, or deployment restart path is in scope. Round 3 lifecycle coverage focuses on the relevant process-lifecycle analogue: an active standalone run becomes inactive/offline while metadata remains restorable, the client reconnects by identity, and the next command restores a runtime whose snapshot is already `running`.

## Coverage Matrix

| Scenario | Requirements / AC | Validation Surface | Result | Evidence |
| --- | --- | --- | --- | --- |
| VAL-001 identity-only websocket connect for inactive existing standalone run | connect must not restore/activate | `agent-websocket.integration.test.ts`; new E2E | Pass | Connect sends `CONNECTED` + offline `AGENT_STATUS`; restore is not called until `SEND_MESSAGE`. |
| VAL-002 offline/restored standalone send publishes backend `Initializing` before slow restore/send | backend command overlay before restore/activation | `agent-websocket.integration.test.ts`; new E2E | Pass | `AGENT_STATUS initializing` observed before deferred restore resolves. |
| VAL-003 restored runtime snapshot already `running` remains internal until command-correlated evidence | AC-017/AC-018; no restored-snapshot false `running` | `tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` | Pass | After restore resolves and restored backend has `running` snapshot, observed post-send statuses remain exactly `initializing`; `running` is emitted only after command-correlated `TURN_STARTED`. |
| VAL-004 visible sequence after stop/inactive/resend | expected `offline -> initializing -> running` | new E2E | Pass | Test starts active run, verifies first turn statuses, marks runtime inactive, reconnects offline, resends, and verifies `initializing -> running` after `TURN_STARTED`. |
| VAL-005 existing active running standalone send does not downgrade | no `running -> initializing` downgrade | `agent-websocket.integration.test.ts`; coordinator unit test | Pass | ACK status remains running and no initializing status is emitted after send. |
| VAL-006 prepared/new-run first message activates through command coordinator | `PrepareAgentRun` identity, command activation | `agent-websocket.integration.test.ts`; provisioning/frontend tests | Pass | Prepared identity connects offline without activation; `SEND_MESSAGE` calls `activatePreparedRun`; frontend new-run path uses `PrepareAgentRun` then websocket command identity. |
| VAL-007 command identity, duplicate, and busy behavior | `message_id`, `dedupe_key`, idempotency, busy rejection | websocket integration, registry/coordinator tests, frontend service tests | Pass | Duplicate same id ACKs `duplicate_in_progress`; different id rejected with `RUN_COMMAND_IN_PROGRESS`; frontend serializes ids. |
| VAL-008 activation failure/cancel/retry/stale cleanup | prepared lifecycle edge/failure paths | websocket integration; provisioning tests | Pass | Failed activation emits error status + failed ACK; provisioning tests cover retry, cancel, and stale cleanup. |
| VAL-009 external-channel standalone dispatch | external dispatch through coordinator | channel facade/launcher tests | Pass | External-channel facade posts via `AgentRunCommandCoordinator`; launcher prepares/reclaims identities without pre-restoring runtime. |
| VAL-010 run-history projection fields and overlay precedence | `statusSource`, `shouldConnectStream`, status/canInterrupt, command overlay | projection/history tests | Pass | Projection tests cover command overlay, active runtime, prepared identity, error overlay; history rows expose projection fields. |
| VAL-011 websocket status contract and live replacement | canonical live `AGENT_STATUS`/team statuses | `agent-status-websocket.integration.test.ts`; stream-handler tests | Pass | Real websocket status snapshots/lifecycle messages pass for standalone runtimes and team member/aggregate statuses. |
| VAL-012 frontend standalone command handling | no frontend local placeholder/restore fallback | `AgentStreamingService.spec.ts`; `agentRunStore.spec.ts` | Pass | Frontend sends command ids, consumes backend ACK/status, and does not call GraphQL restore before persisted inactive send. |

## Test Scope

In scope:

- Backend-owned standalone lifecycle over websocket and command coordinator.
- Inactive existing run restore timing and command-correlated overlay replacement.
- Exact AC-017/AC-018 restored-running snapshot risk.
- Prepared/new run activation timing.
- Running no-downgrade behavior.
- Command identity, duplicate, busy, failure ACKs.
- External-channel standalone dispatch through coordinator.
- Run-history projection fields and command overlay precedence.
- Frontend command serialization and no frontend restore/create-before-send in the revised path.

Out of scope / not fully exercised:

- Real external LLM/Codex/Claude model response content. The status event contract is deterministic and does not require a live model to prove the overlay replacement invariant.
- Manual browser UI send against a live backend/runtime.
- Native Electron packaging, installer, upgrade, or deployment lifecycle.

## Validation Setup / Environment

Commands run from `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status`.

Passed commands:

- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent/agent-command-correlated-status.e2e.test.ts` — 1 file, 1 test passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/agent/agent-command-correlated-status.e2e.test.ts tests/integration/agent/agent-websocket.integration.test.ts tests/integration/agent/agent-status-websocket.integration.test.ts tests/unit/agent-execution/agent-run-command-registry.test.ts tests/unit/agent-execution/agent-run-status-projection-service.test.ts tests/unit/agent-execution/agent-run-command-coordinator.test.ts tests/unit/run-history/services/agent-run-history-service.test.ts tests/unit/services/agent-streaming/agent-stream-handler.test.ts` — 8 files, 55 tests passed.
- `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run-provisioning-service.test.ts tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts` — 3 files, 19 tests passed.
- `pnpm -C autobyteus-web exec vitest run stores/__tests__/agentRunStore.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts` — 2 files, 25 tests passed.
- `git diff --check`
- `pnpm -C autobyteus-server-ts run prepare:shared`
- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`

Typecheck probes with known broad debt:

- `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit --pretty false` exits 2 on existing broad `TS6059` tests/rootDir project configuration debt. The new E2E file appears only as another instance of that existing rootDir issue because all `tests` are included while `rootDir` is `src`. Log: `/tmp/individual-agent-api-e2e-round3-server-full-tsc.log`.
- `pnpm -C autobyteus-web exec nuxi typecheck --pretty false` exits 1 on broad existing web type debt. Direct changed-file hits are limited to the known `graphql-tag` missing declaration issue in changed GraphQL modules plus unrelated existing service handler test debt. Log: `/tmp/individual-agent-api-e2e-round3-web-typecheck.log`.

## Tests Implemented Or Updated

Repository-resident durable validation added in Round 3:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts`
  - Starts a standalone agent websocket session through the production Fastify websocket route and verifies active first-turn status events.
  - Simulates the run becoming inactive/offline without terminal metadata, reconnects by identity, and sends a second command.
  - Verifies `CONNECTED -> offline`, then `SEND_MESSAGE -> initializing` before restore resolves.
  - Restores a runtime whose status snapshot is already `running`, verifies that snapshot does not appear as a visible `AGENT_STATUS` while the command overlay is active, and then emits command-correlated `TURN_STARTED` to verify the first visible replacement is `running`.
  - Verifies the command overlay is cleared and ACK remains accepted after the command-correlated transition.

Round 2 durable validation remains in place and was rerun where relevant:

- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/integration/agent/agent-websocket.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/integration/agent/agent-status-websocket.integration.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/unit/services/agent-streaming/agent-stream-handler.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/unit/external-channel/runtime/channel-agent-run-facade.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/unit/external-channel/runtime/channel-binding-run-launcher.test.ts`
- `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/unit/agent-execution/agent-run-provisioning-service.test.ts`

## Durable Validation Added To The Codebase

- Repository-resident durable validation added or updated this round: `Yes`
- Paths added or updated:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/individual-agent-initializing-status/autobyteus-server-ts/tests/e2e/agent/agent-command-correlated-status.e2e.test.ts`
- If `Yes`, returned through `code_reviewer` before delivery: `Yes; this report routes back to code review.`
- Post-validation code review artifact: Pending.

## Other Validation Artifacts

- `/tmp/individual-agent-api-e2e-round3-server-full-tsc.log`
- `/tmp/individual-agent-api-e2e-round3-web-typecheck.log`

No throwaway repository artifacts were retained besides the durable E2E test and this report.

## Temporary Validation Methods / Scaffolding

No temporary validation scripts were retained. The new validation is repository-resident Vitest E2E coverage.

## Dependencies Mocked Or Emulated

- The new E2E test uses a scripted `AgentRunBackend` to deterministically control runtime status snapshots and events. This avoids external LLM nondeterminism while exercising the production websocket route, stream handler, command coordinator, overlay store, broadcaster, projection service, and `AgentRun` event subject.
- Existing integration tests use in-memory runtime subjects and service fakes to create slow restore/activation/failure windows.
- Frontend GraphQL and websocket client surfaces are mocked in Pinia/service tests.

## Prior Failure Resolution Check (Mandatory On Round >1)

| Prior Round | Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | Frontend local-placeholder validation scope | Superseded by design/architecture pivot | Round 3 continues validating backend-owned status overlays instead | Backend websocket integration and new E2E passed | No unresolved Round 1 failures; behavior intentionally replaced. |
| 2 | Need post-delivery command-correlated validation for restored-running snapshot | Residual API/E2E risk after code review | Resolved by new E2E AC-017/AC-018 test | `agent-command-correlated-status.e2e.test.ts` passed | This directly addresses the user’s concern that the behavior is E2E-testable. |

## Scenarios Checked

See the coverage matrix. Round 3 newly checks the full start/inactive/resend user-visible lifecycle: first websocket start status, simulated process stop/inactive state, identity-only reconnect, second send, deferred restore, restored runtime snapshot already `running`, no visible restored-snapshot `running`, command-correlated `TURN_STARTED`, visible `running`, accepted ACK.

## Passed

- New focused backend E2E: 1 file, 1 test passed.
- Backend focused regression validation: 11 files, 74 tests passed.
- Frontend focused regression validation: 2 files, 25 tests passed.
- `git diff --check` passed.
- `prepare:shared` passed.
- Server build-source typecheck passed: `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.

## Failed

No ticket-scope API/E2E scenario failed.

Broader non-blocking failures observed:

- Full backend `tsc -p tsconfig.json --noEmit` still fails on existing broad test/rootDir `TS6059` project configuration debt. The new E2E test appears in that log only because every test file outside `src` is affected by the same existing include/rootDir mismatch.
- Web `nuxi typecheck` still fails on existing broad project debt. Direct changed GraphQL module hits are the known `graphql-tag` declaration issue.

## Not Tested / Out Of Scope

- Real external LLM model content generation for this specific AC-017/AC-018 scenario. The invariant is about websocket status sequencing around runtime restore and command-correlated events; it is covered deterministically without live model dependency.
- Manual browser UI send against a live backend.
- Native Electron packaging/install/upgrade/deployment lifecycle.

## Blocked

No blocker for ticket-scope validation. Broad full-suite/typecheck debt remains outside this ticket and is recorded above.

## Cleanup Performed

- All Fastify websocket tests close sockets/apps in cleanup.
- No background dev servers or browsers were left running.
- Temporary logs remain only under `/tmp`.

## Classification

No ticket-scope failure classification required.

- `Local Fix`: N/A
- `Design Impact`: N/A
- `Requirement Gap`: N/A
- `Unclear`: N/A

Because repository-resident durable E2E validation was added during API/E2E, the next required step is code review before delivery.

## Recommended Recipient

`code_reviewer`

## Evidence / Notes

- The user’s concern was valid: this status sequence can and should be E2E-tested. Round 3 adds a durable E2E test for the exact high-risk sequence rather than relying only on unit/coordinator coverage.
- The new E2E test verifies that restored runtime readiness/snapshot state is not a visible overlay replacement trigger, and that `TURN_STARTED` is the first visible `running` replacement.
- No implementation source changes were made in this API/E2E round; only durable E2E validation and this report were added/updated.

## Latest Authoritative Result

- Result values: `Pass` / `Fail` / `Blocked`
- Result: `Pass`
- Notes: Ticket-scope API/E2E and executable validation passed. Durable E2E validation changed, so this package must return to `code_reviewer` before delivery.
