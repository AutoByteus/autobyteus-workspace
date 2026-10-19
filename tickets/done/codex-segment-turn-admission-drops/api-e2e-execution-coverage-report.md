# API/E2E Execution Coverage Report

## Round

- Coverage investigation (the plan; it lists the upstream documents): `tickets/in-progress/codex-segment-turn-admission-drops/api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log (when used): `api-e2e-test-progress.md`
- Round and trigger: Round 1; Implementation Complete IR-001 (direct `Small` + `Low` route)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why: (1) The client-close case (API-07) was strengthened after the mutation check M2 showed two flush paths on app-server exit: it now also asserts the summary is written exactly once after the manager released the closed thread. (2) Test-config values in the new file were set to valid enum values (`CodexApprovalPolicy.NEVER`, `"workspace-write"`) so the file type-checks cleanly; API-04..07 were re-recorded after that edit.
- Evidence folder (absolute path; the handoff message gives the commit that holds it): `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-segment-turn-admission-drops/tickets/in-progress/codex-segment-turn-admission-drops/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter (data, identity, locale, viewport) |
| --- | --- | --- | --- | --- |
| ENV-1 | Source `dedaf77fba` (HEAD `53fc6e9c61` adds only `tickets/`), plus the new test and fixture committed with this report | macOS 26.5.2 | node v22.23.1, pnpm 10.28.2, vitest 4; in-process server code from `src` | Server test isolation (`tests/setup/test-environment-isolation.ts`); scripted provider-free Codex app-server child (`tests/fixtures/codex-scripted-notification-cli.mjs`) over stdio; per-test temp cwd; no `CODEX_HOME`, no credentials |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001..AC-006, AC-008, AC-007 (willRetry) | `codex/thread/*` units | Reused IMP-01 | (IMP-01) | Pass | (IMP-01) `IMP-01-unit-codex-thread.log` | (IMP-01) | Ran on `dedaf77fba`; `git diff --name-only dedaf77fba HEAD` lists only `tickets/`, so the exercised code is unchanged. Also re-covered by API-08 (316 tests incl. these) |
| API-02 | AC-007 | server `src` typecheck | Reused IMP-02 | (IMP-02) | Pass | (IMP-02) | (IMP-02) | Same commit, no source change. Re-run as API-10 after adding tests |
| API-03 | AC-004, AC-007 | full server unit suite | Reused IMP-03 | (IMP-03) | Pass | (IMP-03) `IMP-03-test-unit-excerpt.log` | (IMP-03) `Tests  5990 passed \| 7 skipped (5997)` | Same commit, no source change; the new files are under `tests/integration` and `tests/fixtures`, outside `test:unit` |
| API-04 | SCN-001; AC-002, AC-004, AC-006, AC-008; REQ-003 | scripted app-server child → `CodexAppServerClient` → `CodexClientThreadRouter` → `CodexThread` → `CodexAgentRunBackend` → `AgentRun` | `pnpm -C autobyteus-server-ts exec vitest run tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts --no-watch --reporter=verbose` (×3). Steps: user sends 3 messages, each turn starts a `commandExecution`, user Stops each (`AgentRun.interrupt` → `turn/interrupt` → idle → `turn/completed` interrupted); 4th message starts U; Codex then sends `item/completed(commandExecution)` of the 3 stopped turns and U's agent message; `turn/completed(U)`; then a late `item/started` of a stopped turn; 5th message | ENV-1 | Pass | `API-04-07-integration-rejection-logging.log` | `[receipt] SCN-001` with 3 detailed lines `"reasonCode":"CODEX_SEGMENT_TURN_CONFLICT","itemType":"commandExecution","turnId":"scripted-thread-1-turn-1","activeTurnId":"scripted-thread-1-turn-4"` (turn-1/2/3), and one summary `"turnId":"scripted-thread-1-turn-1","count":1`; `✓ … SCN-001` in runs 1–3 | Also asserts: no summary before the late extra item (AC-002); U's text `visible active-turn text` and `TURN_COMPLETED` reach AgentRun; no stopped turn id, `secret-output` or late item id in AgentRun events (AC-004); no `secret-` in any rejection line |
| API-05 | SCN-002; AC-001, AC-003, AC-008, QR-001, AC-004 | same path; router delivery by `threadId` with no active turn | same command. Steps: fresh run, no turn; Codex sends 438 governed events of turn X (`item/started` agentMessage, 436 deltas, `item/completed`) + 3 turn-id-less deltas; user sends a message (`turn/started` U); Codex sends 2 more X deltas and U's message; `turn/completed(U)` | ENV-1 | Pass | `API-04-07-integration-rejection-logging.log` | `[receipt] SCN-002`: detailed `"reasonCode":"CODEX_SEGMENT_TURN_INACTIVE","itemType":"agentMessage","turnId":"codex-turn-not-adopted","activeTurnId":null` and `"itemType":null,"turnId":null`; summaries `"count":437`, `"turnId":null,"count":2`, then `"turnId":"codex-turn-not-adopted","count":2` | 441 rejected events → 2 log entries before the boundary (QR-001); no `lost text` in AgentRun events or rejection lines; U's text delivered |
| API-06 | SCN-A1; AC-005 | `AgentRun.terminate()` → backend → `CodexThreadManager.releasePreparation` | same command. Steps: run A gets 5 deltas of turn A and 3 `item/completed(commandExecution)` of turn B with no active turn, then `terminate()`; run B (same app-server client) with nothing pending, then `terminate()` | ENV-1 | Pass | `API-04-07-integration-rejection-logging.log`; `API-04-07-mutation-checks.log` | `[receipt] AC-005 pending` summaries `"turnId":"codex-turn-a","count":4` and `"turnId":"codex-turn-b","count":2`; `[receipt] AC-005 clean {"detailed":[],"summaries":[]}`; mutation M1 (release flush removed) → `× run termination writes one summary …` | Thread removed from the manager after each terminate |
| API-07 | SCN-A2; REQ-004 | real child-process exit → client close → router → `CodexThread.handleClientClosed` and manager release | same command. Steps: 3 deltas of turn Z with no active turn, then the app-server process exits (`test/exit`) | ENV-1 | Pass | `API-04-07-integration-rejection-logging.log`; `API-04-07-mutation-checks.log` | `[receipt] client close` summaries `[{"…","turnId":"codex-turn-z","count":2}]` (exactly one, asserted after the manager released the thread) | M2 (thread-level close flush removed) still passes because the manager's `handleUnexpectedThreadClosure` → `releasePreparation` also flushes; both paths together write the count once (asserted) |
| API-08 | AC-004, AC-007 regression | all Codex backend unit suites + the new integration file | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/codex tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts --no-watch` | ENV-1 | Pass | `API-08-codex-neighbours.log` | `Test Files  23 passed (23)`, `Tests  316 passed (316)` | Includes the `codex-input-terminal-release` scripted-child tests and the willRetry tests. Ran before the type-only edit of the new file; that edit is covered by the re-recorded API-04..07 |
| API-09 | AC-007 | full server integration suite | `pnpm -C autobyteus-server-ts test:integration` (prerequisite check: `Integration test prerequisites are present.`) | ENV-1 | Pass | `API-09-test-integration-excerpt.log` | `Test Files  78 passed \| 19 skipped (97)`, `Tests  419 passed \| 70 skipped (489)`, `exit 0`; `✓ tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts (4 tests)` | Not run by implementation. Skipped files are live/costly suites behind their `RUN_*` gates (a skip is not a pass; none is needed for this change, see Broader Validation Decision). The integration log line `SEND_MESSAGE command not accepted … [ACTIVATION_FAILED]` is output of a passing test, not a failure |
| API-10 | AC-007 | server typecheck after test addition | `pnpm -C autobyteus-server-ts typecheck` | ENV-1 | Pass | `API-10-typecheck.log` | `typecheck exit 0` | The build typecheck covers `src` only. The new test file was also checked with `tsc -p tsconfig.json --noEmit --rootDir .`: no error in it (the test tree as a whole is not type-clean, 11,683 errors elsewhere, not a project gate) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-05 (real path), API-01 (unit, exact 438 → 1 + `count: 437`) | Proven | — |
| AC-002 | Yes | API-04, API-01 | Proven | — |
| AC-003 | Yes | API-05, API-01 | Proven | — |
| AC-004 | Yes | API-04, API-05 (rejected never reach AgentRun; active turn delivered), API-01 (matrix), API-03, API-08 | Proven | — |
| AC-005 | Yes | API-06 (product termination path; mutation M1 kills it), API-01 | Proven | — |
| AC-006 | Yes | API-04 (`commandExecution`, both turn ids, CONFLICT), API-05 (`itemType: null` for a delta), API-01 | Proven | — |
| AC-007 | Yes | API-01, API-02, API-03, API-08, API-09, API-10 | Proven | — |
| AC-008 | Yes | API-04, API-05, API-01 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 98% | 98% | Every AC proven at unit level (API-01) and, for AC-001..AC-006/AC-008, again through the real Codex client path (API-04..07); AC-007 by API-01..03, 08..10 | None material | — |
| Changed-boundary execution directness | 96% | 96% | API-04..07 run the production `CodexAppServerClient` (child process over stdio), router, `CodexThread`, `CodexThreadManager`, `CodexAgentRunBackend`, `AgentRun`; lines captured at `console.warn`, the channel that writes them to `server.log` | Lines asserted at `console.warn`, not by reading a `server.log` file | Reading a real server log file (adds only the logger sink, unchanged here) |
| Cross-boundary integration realism and mock gap | 92% | 92% | API-04..07 with a scripted app-server child using the documented Codex v2 shapes and the Codex 0.160 interrupt order | The app-server is scripted, not a real Codex binary; late items after Stop are reproduced, not observed live | A live Codex run that happens to deliver a late tool item (non-deterministic, costs credits) |
| Environment, configuration, identity, and fixture fidelity | 95% | 95% | ENV-1 under the project's test isolation; full integration suite green (API-09); no user data or CLI config touched | Fixture fidelity bounded by the documented notification shape | — |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | 96% | Stop path (API-04), no active turn and no turn id (API-05), termination with and without pending counts (API-06), app-server exit with double-flush check (API-07); mutations M1/M3 kill the cases, M2 explained | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | Server-log-only change; no chat or UI change (Non-Goal). That admitted output still reaches AgentRun is covered in category 1 (API-04/05) | — | — |
| Durable regression coverage quality and relevance | 96% | 96% | New integration file (4 cases, stable ×3, mutation-checked) beside the unit per-AC tests | — | — |

- Overall post-repository confidence: 95.5%
- Overall final confidence: 95.5% (no broader validation ran; see decision)
- Calculation method: simple average of the 6 applicable categories (98+96+92+95+96+96)/6
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the Codex app-server is scripted (category 3). A future Codex version that stops sending the item's own `turnId` would change which account a rejection lands in, but not admission; the detailed line would then show `turnId: null`, which makes the change visible.

## Broader Validation Decision (Mandatory)

- Decision: `Not Required`
- Execution mode: `None`
- Confidence gap or residual risk it addresses, and the expected gain: the only remaining gap is scripted vs. real Codex. A live run would re-observe a notification shape already evidenced by the user's rollouts (97 late items carrying their own turn id) and could not force a late item after Stop or a whole unadopted turn deterministically. Expected gain is negligible, and the run costs credits (TESTING.md: run real providers only when the change needs real-provider proof).
- Browser validation needed, and why or why not: No. The change writes server log lines only; no web, renderer, contract or persistence change.
- If `Not Required`: the cases that already exercise the real changed boundary: API-04, API-05, API-06, API-07 (real client process transport, router, thread, manager release, backend, AgentRun), API-09 (full integration suite).
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the unconditional per-event log call is gone; the diff has no dual path)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/integration/agent-execution/codex-segment-turn-rejection-logging.integration.test.ts` | Added | API-04, API-05, API-06, API-07 | — |
| `autobyteus-server-ts/tests/fixtures/codex-scripted-notification-cli.mjs` | Added | API-04..API-07 | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable` (direct low-risk route; paths listed for delivery)
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Codex app-server (`codex app-server`) | Test-owned scripted JSON-RPC child process over stdio, sending Codex v2 notification shapes (`turn/started`, `item/*` with `threadId`/`turnId`/`item.type`, interrupt order idle → `turn/completed` interrupted) | A real model run cannot deterministically produce a late tool item after Stop or a whole unadopted turn; it costs credits; the gate depends only on the notification fields, whose real shape is evidenced by the user's rollouts (`evidence/residual-rollout-correlation.txt`: 97 late items carrying their own turn id) | The scripted stream shows what Codex is documented to send, not what a future Codex version might send |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Mutation edits M1–M3 in `codex-thread-manager.ts` / `codex-thread.ts` | Yes | `git checkout --` after each mutation | `git status --short -- autobyteus-server-ts/src` empty (recorded in `API-04-07-mutation-checks.log`) |
| Scripted app-server children and temp cwds (`codex-rejection-logging-*`) | Yes | Closed / removed in each test's `finally` | Done by the test |
| Full integration log `/tmp/codex-rejection-api09-integration.log`, tsc log `/tmp/codex-rejection-tsc-tests.log` | Yes | Excerpt committed; full logs left in `/tmp` (not committed, size) | — |
| Untracked SDK `dist/` folders | No (left by earlier install) | Left alone, not staged | — |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): `None`
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff message (direct low-risk `Pass` → delivery)
- Notes: Observation, not a finding: on app-server exit both `CodexThread.handleClientClosed` and the manager's release flush pending counts. API-07 proves they write each count once. The `CODEX_SEGMENT_TURN_OMISSION_UNLISTED` branch is still unreachable from the product (implementation's follow-up candidate). Not exercised by any product scenario.
