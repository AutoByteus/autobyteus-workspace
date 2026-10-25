# API/E2E Revision Record: autobyteus-273

The latest coverage investigation and execution coverage report remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation engineer, `implementation-handoff.md`, round 1 | SR-002, IR-001 | N/A | Blocked / 86% |
| API-REV-002 | User decision on the API-REV-001 blocker, 2026-10-25 | SR-002, IR-001 | Blocked / 86% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: live Claude cache-bucket coverage; API-billed proof blocked by the vault key's credit balance

- Triggering role, report path, and round: implementation engineer, `implementation-handoff.md` (IR-001, HEAD `62bfd7ed51`), round 1.
- Triggering finding or case IDs: N/A (initial validation).
- Related revision IDs: SR-002 (solution), IR-001 (implementation); architecture and code review N/A (direct route).
- Why this baseline was recorded: first completed API/E2E result.
- Coverage decisions or durable test paths changed: added the GraphQL settings e2e case (API-06); added the gated live suite `tests/e2e/runtime/claude-prompt-cache-ttl-live.e2e.test.ts` (CPC-E2E-001..006). It reports a provider refusal as a skip with its reason, or as a failure under `AUTOBYTEUS_LIVE_STRICT=1`.
- Cases added, changed, removed, or rechecked: API-01..05 reused; API-06, API-10..15 run; API-13/API-14 added after the blocker; API-07..09 blocked.
- Commands, environment, fixture, or broader-validation delta: API-11 runs in `cli` mode on the subscription instead of api-key mode, and sets the Run details end date to tomorrow (FU-005).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all; "Round 1 Plan Revisions"), execution report (all), `follow-ups.md` (FU-005), test progress log.
- Prior result and confidence: N/A
- Current result and confidence: Blocked, 86%
- New or remaining failure IDs: none (no product failure found)
- Recommended owner: the user, for the dependency (credits for the test-vault Anthropic key)
- Remaining risks, blocked evidence, or untested scope: AC-001's API-billed two-turn run and the design escalation trigger (API-07), toggle off on API billing (API-08), AC-002 on API billing (API-09).

### API-REV-002 — User decision: API-billed check moves to the user after the next beta

- Triggering role, report path, and round: the user, answering the `Blocked` request in this conversation, 2026-10-25: "I guess we can let it pass because since currently we use beta release, afterwards when we release a new beta we can check whether it works or not. ... We let it pass and we release a new beta." The only funded API billing is the user's own account, which his running app uses.
- Triggering finding or case IDs: API-07 (and API-08, API-09).
- Related revision IDs: SR-002, IR-001.
- Why this revision was recorded: the blocked part became a user-only check, so the result is decided over what can be proven without the user.
- Coverage decisions or durable test paths changed: none. No case was rerun; no code changed.
- Cases added, changed, removed, or rechecked: none rerun. API-07..09 stay `Blocked` cases; the AC-001 row gives the user's check steps.
- Commands, environment, fixture, or broader-validation delta: none.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-07 (vault key: "Credit balance is too low") | Blocked (missing dependency) | User-only check after the next beta release, by the user's decision | Covered without the user: API-01, API-06, API-10, API-11 (variable reaches the real CLI); the bucket effect on API billing: the user's check |

- Canonical artifacts and sections updated: execution report (Round, Routing, Acceptance-Criteria Proof, Scorecard, Broader Validation Decision, Latest Authoritative Result), coverage investigation (Not Tested row), this record, the test progress log.
- Prior result and confidence: Blocked, 86%
- Current result and confidence: Pass, 95% (over the provable scope)
- New or remaining failure IDs: none
- Recommended owner: delivery engineer; the user check goes to the user with the beta release
- Remaining risks, blocked evidence, or untested scope: Claude Code's API-billed reaction to `ENABLE_PROMPT_CACHING_1H` (user check). If it stays 5m, that is the design's escalation trigger, back to the Solution Designer.
