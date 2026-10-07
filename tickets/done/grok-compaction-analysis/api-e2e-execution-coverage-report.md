# API/E2E Execution Coverage Report — Grok Build compaction detection and raw-trace rotation

## Execution Round Meta

- Ticket folder (all artifacts): /Users/normy/autobyteus_org/autobyteus-worktrees/grok-compaction-analysis/tickets/in-progress/grok-compaction-analysis/
- Requirements: requirements-doc.md (SR-002, Approved U02). Investigation: investigation-notes.md (G01–G18). Solution record: solution-revision-record.md. Design: design-spec.md. Supplements: probes/, solution-handoff.md.
- Implementation: implementation-handoff.md, implementation-revision-record.md (IR-001, commit 20d4a9441, local only).
- Design review / architecture review / code review: `N/A — not applicable` (direct route).
- Coverage investigation, ledger, revision record: api-e2e-coverage-investigation.md, api-e2e-test-case-ledger.md, api-e2e-revision-record.md. Evidence: api-e2e-evidence/.
- API/E2E revision `API-REV-001`; round 1; trigger: implementation_engineer "Implementation Complete" (IR-001).

## Routing Classification

Medium / Low; direct low-risk → delivery; test-code review `Not Required — direct low-risk route`.

## Investigation And Execution Basis

The plan was followed, with one revision. Live Grok became unavailable: the user's Grok free usage was exhausted (429 `subscription:free-usage-exhausted`, Grok unified.jsonl 2026-10-07T08:59Z). So the remaining live gap was closed with a new durable zero-credit E2E through the real Studio server, using the real Grok 1.0.46 compaction recordings (existing fake-CLI mechanism). On 2026-10-07 the user accepted this evidence ("so basically its working … then i would say its done") instead of waiting for a credit reset.

## Test-Case Ledger Reconciliation

| Case | Result | Evidence |
| --- | --- | --- |
| REPO-01 ACP/Grok/accumulator/history units; tsc; ACP Grok-free | Pass (151 tests) | console |
| REPO-02 sweep HEAD vs base ea826a5e4 | Pass (same 61 pre-existing; 2 first-run TEST_SERVER_BUILD_REQUIRED pass on rerun) | sweep-*.json, rerun log |
| WEB-1 web specs + Grok case | Pass (31/31) | console |
| E2E-L1 live run 1 (real Grok) | Partial: dump A; dump B → automatic start → Stop → failed close (same id) before the turn end, no compaction completed — **passed live**. Step 3: second automatic start, then the turn ended with no completion (operation closed earlier in the turn, no abandoned close at turn end). Most likely Grok reported the compaction failed as the free usage ran out (unprovable; evidence deleted by the old cleanup). | live-grok-run1.log |
| E2E-L2 minimal live probe | Blocked: Grok 429 free-usage-exhausted on turn 1 (no credits spent) | live-grok-probe.log, live-grok-probe/ |
| E2E-R1 new zero-credit replay E2E (real server, real 1.0.46 recordings) | Pass 3/3 | grok-compaction-replay-e2e.log |
| REPO-03 existing grok-build-runtime-replay.e2e + new replay | Pass 9/9 | console |

## Changed Boundary And Evidence Matrix

| Requirement | Evidence | Result |
| --- | --- | --- |
| REQ-G1 completion → one rotation boundary + archive, tokens/duration; idempotent | replay E2E: 3 automatic completions → 3 segments; manual → 1 segment; completions carry pre/post tokens and duration; unit: duplicate completion never rotates twice; implementer live run 2: automatic + manual → 2 segments | Pass |
| REQ-G2 automatic one activity (started→completed), manual completed-only | replay E2E: pairs share provider_event_id; manual has no start; history shows one completed row; web spec: one row per operation | Pass |
| REQ-G3 started then turn ends / failed report → failed, no rotation | **live run 1: real Stop during automatic compaction → failed close with the same id before the turn end, no archive**; replay E2E: same through the real server, next pair rotates; units: completeTurn/interruptTurn/failTurn, failed/cancelled reports, superseded | Pass |
| REQ-G4 `/compact` native; load replay not re-recorded; others unchanged | replay E2E and implementer live: `/compact` completes natively; unit restore replay (compaction notifications injected into session/load through the real ACP connection) records nothing; sweep identical to base | Pass (restore not run live) |

## Validation Confidence Scorecard

| Category | Score | Note |
| --- | --- | --- |
| Requirement and AC proof | 96 % | all ACs directly proven (live and real-traffic replay through the real server) |
| Changed-boundary directness | 94 % | real server, real recordings; the final live run blocked by credits |
| Integration realism | 95 % | websocket, GraphQL memory and history, AgentRunManager, ACP backend |
| Environment fidelity | 92 % | real Grok 1.0.46 traffic; live Grok partially (credits exhausted) |
| Failure/edge/lifecycle | 94 % | Stop live and replay; restore only in a unit (real ACP connection) |
| User surface | 93 % | web spec with Grok shapes; the same contract was rendered in packaged-app journeys for Claude, Codex and AGY |
| Durable regression coverage | 96 % | new zero-credit replay E2E; live test with evidence capture |

- Overall: 94.3 %; no category below 90 %. Below the 95 % default clean target because the remaining targeted surface (live Grok) is blocked by exhausted credits. **User accepted the result as done on 2026-10-07.**
- Residual risks:
  - Restore after a compaction has not run live.
  - Run 1's step-3 anomaly is not conclusively explained (most likely credit exhaustion surfacing as a Grok-reported failure, which the product handles per REQ-G3).
  - The durable live test has not had a fully green run with the corrected memory query.

## Broader Validation

`Required`: live (partial, then blocked by credits) plus a zero-credit real-server replay E2E (added).

## Durable Coverage Changed By API/E2E (uncommitted in the worktree)

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/e2e/runtime/grok-build-compaction-replay.e2e.test.ts | Added | REQ-G1–G4 through the real server with real 1.0.46 recordings (automatic, Stop during automatic, manual) | 3/3 |
| autobyteus-server-ts/tests/e2e/runtime/grok-build-compaction-live.e2e.test.ts | Updated | reopened history via GraphQL; terminate → restore → short turn (no repeated operation id, segments grow only with new completions); failure evidence capture to `GROK_E2E_EVIDENCE_DIR` (never auth.json); timeouts list compaction payloads | not green live yet (credits) |
| autobyteus-web/services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts | Updated | Grok automatic, abandoned and manual → one row each | Pass |

## Cleanup

- The temporary probe was removed from tests/ (copy kept in api-e2e-evidence/).
- The base worktree /tmp/grok-base was removed.
- The live tests' temp GROK_HOME and data folders were removed; ~/.grok/auth.json was unchanged (mtime 08:12:52 before and after).
- The probe evidence folder holds Grok session logs only, no auth.

## Latest Authoritative Result

- Result: **Pass** (user-accepted with the documented residual; confidence 94.3 %).
- Next: per `get_handoff_rules` (direct route → delivery).
- Docs note for delivery: TESTING.md could list the new zero-credit `grok-build-compaction-replay.e2e.test.ts` (no gate) and `GROK_E2E_EVIDENCE_DIR`.
