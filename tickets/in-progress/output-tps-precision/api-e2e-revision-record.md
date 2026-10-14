# API/E2E Revision Record — output-tps-precision

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | code_reviewer, `code-review-report.md`, CRR-001 round 1 | SR-005 (R3/SR-004), ARCH-REV-002, IR-001, CRR-001 | N/A | Fail / 88.6% |
| API-REV-002 | code_reviewer, `code-review-report.md`, CRR-003 round 3 | SR-006 (D3.2), ARCH-REV-003, IR-002, CRR-002/003 | Fail / 88.6% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: live per-runtime matrix, scripted transport, desktop journeys; Codex tool-time failure

- Triggering role, report path, and round: code_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md`, round 1 (Pass 9.4)
- Triggering finding or case IDs:
  - C-001 residual (RSK-002 Codex long-tool ordering), held for evidence;
  - requested items 1–4: Codex timeline; AC-010 matrix + scripted AGY transport; AGY cadence and thinking sample; desktop Team/delegated and reload/history.
- Related revision IDs: SR-005, ARCH-REV-002, IR-001, CRR-001
- Why recorded: first completed API/E2E validation round.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/token-meter-tps-live.e2e.test.ts` (gated live suite, API-L01–L07). No other durable coverage changed.
- Cases added: API-R01–R07, API-E01, API-E02, API-L01–L07, API-D01, API-D02.
- Commands, environment, fixture or broader-validation delta:
  - clean-env live runs per runtime;
  - temporary wire-stamping wrapper (`evidence/api-e2e/probes/stdout-stamp-wrapper.mjs`);
  - isolated desktop worktree build `iso-63601-1414` with throwaway `CODEX_HOME`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md` (all sections);
  - `api-e2e-execution-coverage-report.md` (all sections);
  - `api-e2e-test-case-ledger.md` (events 1–17).
- Prior result and confidence: N/A
- Current result and confidence: Fail, 88.6%
- New or remaining failure IDs: API-L04. For a Codex call that ends with a tool, `thread/tokenUsage/updated` arrives after the tool's `item/completed`, so its end-to-end reading includes the tool time (22.0 vs 59.5 tok/s; 25.0 vs 75.8 tok/s).
- Recommended owner: Solution Designer (preliminary Design Impact on the DS-003 Codex call-end row), via failure-origin review by code_reviewer.
- Remaining risks, blocked evidence, or untested scope:
  - Org desktop selection and the Codex approval-wait variant are to be added on the rerun.
  - DeepSeek native was not run (no key source file).
  - AGY ran on the host login: the TESTING.md agy recipe is outdated for agy 1.3.5.


### API-REV-002 — Codex rework rerun; approval-wait, native DeepSeek and Org coverage

- Triggering role, report path, and round: code_reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/output-tps-precision/tickets/in-progress/output-tps-precision/code-review-report.md`, CRR-003 (round 3, Pass 9.4)
- Triggering finding or case IDs:
  - API-L04 / CR-F01 (resolved in IR-002);
  - requests: L04 + L03 rerun with wire stamps; an approval-wait sample; Org desktop; DeepSeek if a key is available; C-011 recording.
- Related revision IDs: SR-006, ARCH-REV-003, IR-002, CRR-002, CRR-003
- Why recorded: rerun after rework.
- Coverage decisions or durable test paths changed: `token-meter-tps-live.e2e.test.ts` updated with API-L08 (Codex approval wait), API-L09 (native DeepSeek) and the external built-test-server mode.
- Cases added, changed, removed, or rechecked:
  - rechecked: API-L03, API-L04;
  - added: API-L08, API-L09, API-D03;
  - re-run on DeepSeek: API-D01, API-D02.
- Commands, environment, fixture or broader-validation delta:
  - new isolated build `iso-50466-56b5` (IR-002);
  - credentials imported with `pnpm secrets:import` from the user's `.env` (user direction) into the instance DB and `autobyteus-server-ts/db/test.db`; preflight READY;
  - desktop journeys on DeepSeek because the user has no Codex tokens (user direction).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| API-L04 (Codex tool-ending call included ~2.9 s of tool time: 22.0 / 25.0 tok/s) | Design Impact → resolved by SR-006 / IR-002 | Resolved. The reading now equals boundary → `rawResponse/completed` (110 tok / 1,529 ms = 71.9 tok/s; tool 3,281→6,170 excluded). Approval-wait variant L08 also excludes a 6.1 s wait | `evidence/api-e2e/round2/live/codex/`, `round2/live/codex-approval/` |

- Canonical artifacts and sections updated: the execution report (rewritten for round 2), the investigation (Round 2 Update), the ledger (events 18–33).
- Prior result and confidence: Fail, 88.6%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: code_reviewer (proportional test-code review)
- Remaining risks, blocked evidence, or untested scope:
  - The Codex desktop journey on the IR-002 build was not run (no Codex tokens).
  - C-011 was not observed.
  - Delivery items: C-004, C-010, the TESTING.md agy recipe note, and the key-holding `db/test.db` in the worktree.
