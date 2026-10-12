# API/E2E Revision Record — token-meter-accuracy

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 (round 2 Pass) | SR-001–SR-006, ARCH-REV-003, IR-001, IR-002, CRR-001, CRR-002 | N/A | Pass / 95% |
| API-REV-002 | Code reviewer, CRR-005 (round 4 Pass, IR-004) | SR-009–SR-011, ARCH-REV-005/006, IR-004, CRR-005, DR-002 | Pass / 95% | Fail / 90% (F-API-002-01) |

## Revision Entries

### API-REV-001 — Baseline: live per-call usage, readings and DEC-005 proven on real runtimes and the packaged app

- Triggering role, report path, and round: code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-accuracy/tickets/in-progress/token-meter-accuracy/code-review-report.md`, CRR-002.
- Triggering finding or case IDs: none (first API/E2E round). Cases E2E-001..003, R-03..R-07, LIVE-001..005, DESK-001..003 (+ DESK-002b).
- Related revision IDs: SR-005/SR-006, ARCH-REV-003, IR-002, CRR-002.
- Why this baseline was recorded: first complete API/E2E validation of the reviewed package (task size `Large`, architectural risk `High`).
- Coverage decisions or durable test paths changed:
  - Updated: five token-usage E2E fixture files (`reports_model_call`); provider-semantics consolidation now includes a ledger-era Claude row.
  - Replaced: the two stale Claude SDK GraphQL cases, superseded by three per-call/remainder/migration cases.
  - Updated live suites: `token-usage-runtime-graphql.e2e.test.ts` (Studio server, new multi-call case) and `claude-agent-compaction-rotation.e2e.test.ts` (usage assertions).
  - Added: `codex-compaction-token-reading.e2e.test.ts`.
  - Baseline fixes (Rule 9): analytics isolation, Org continuation fixture, live Claude harness.
- Cases added, changed, removed, or rechecked: all planned cases ran to `Pass`. The 3 TeamRun V1 upgrade E2E cases are a base failure, diagnosed and reported (not caused by this change).
- Commands, environment, fixture, or broader-validation delta:
  - Isolated desktop instances: worktree build ×2, installed 1.4.99-beta.8 on an owned data root, then a real upgrade.
  - Real Claude CLI (PATH and SDK-bundled), Codex 0.161.0 and AGY 1.3.2.
  - A temporary `CODEX_HOME` for the Codex compaction limit.
- Commits (test-only): `7f27bbbf5`, `0a5290aa8`, `97e46624c`, `ccb52b171`, `9b4ad5d4d`, `81703b021`, `e7f9da408`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all), `api-e2e-execution-coverage-report.md` (all), `api-e2e-test-case-ledger.md` (events 1–17), `api-e2e-evidence/`.
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95% (post-repository 76%)
- New or remaining failure IDs: none in scope
- Recommended owner: test-code review per handoff rules. Separately for other owners: TeamRun V1 upgrade E2E drift; the stale Codex interrupted-compaction suite; pricing catalog gaps; chat duplicate user message; TESTING.md docs sync (delivery).
- Remaining risks, blocked evidence, or untested scope:
  - The over-window mark has not been rendered from a live genuine overflow (component-tested).
  - Grok and native threshold not tested live (unit-covered).
  - zh-CN not rendered.
  - AC-010 user verification belongs to delivery.

### API-REV-002 — IR-004 on the merged base: native note works; Claude manual `/compact` note never shows

- Triggering role, report path, and round: code reviewer, `code-review-report.md` round 4 (CRR-005), HEAD `fdf44f205`. Base: integration merge `168900db7`.
- Triggering finding or case IDs: IR-004 (D-12 revert, D-13 note, D-9 roll-up fix). Cases R2-GATE, LIVE-006, LIVE-R2, DESK-004a/c/d/e/f, AGY.
- Related revision IDs: SR-009–SR-011, ARCH-REV-005/006, IR-004, CRR-005, DR-002. D-11 (IR-003) was withdrawn and not validated.
- Why recorded: affected-scope validation of IR-004 plus regression on the re-integrated base.
- Coverage decisions or durable test paths changed:
  - Added `tests/e2e/runtime/autobyteus-compaction-token-reading-live.e2e.test.ts` (`88f03cb27`).
  - Fixed the statistics window in `tests/e2e/runtime/token-usage-runtime-graphql.e2e.test.ts` (`be39baf40`).
- Commands, environment, fixture, or broader-validation delta:
  - DeepSeek through the test vault (clean `env -i`) and imported into the isolated instance's own vault.
  - Temporary `CODEX_HOME`, which the isolated app allows (`serverRuntimeEnv.ts`).
  - LM Studio attempted first. Its model was removed by the user mid-run, so nothing was loaded by me.

#### Prior Failure Resolution

None. Round 1 passed.

- Canonical artifacts and sections updated:
  - `api-e2e-coverage-investigation.md` § Round 2
  - `api-e2e-execution-coverage-report.md` § Round 2, Latest Authoritative Result
  - `api-e2e-test-case-ledger.md` events 18+
  - `api-e2e-evidence/round2/`
- Prior result and confidence: Pass, 95%
- Current result and confidence: Fail, 90%
- New or remaining failure IDs: F-API-002-01 (AC-012 for a completed Claude SDK manual `/compact`: the remainder-only turn-end result clears the note 8 ms after "compacted")
- Recommended owner: `Design Impact` → `/software_engineering_team/solution_designer`, via code-review failure-origin review
- Remaining risks, blocked evidence, or untested scope:
  - Live AGY is blocked by the account quota (~22 h).
  - The Claude auto-compaction note path cannot be executed in the isolated app.
  - The 3 TeamRun V1 base-drift E2E cases (reported in round 1).
