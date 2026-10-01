# API/E2E Revision Record — Remove External Messaging From The Main Product

The latest coverage investigation (`api-e2e-coverage-investigation.md`) and execution coverage report (`api-e2e-execution-coverage-report.md`) remain authoritative. This record keeps the concise round history.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | `/code_reviewer` `code-review-report.md` CRR-002 (implementation review round 2, Pass) | SR-014, SR-016; ARCH-REV-002; IR-001, IR-002; CRR-001, CRR-002 | N/A | Fail / 93.6% (G-01, Local Fix) |
| API-REV-002 | `/code_reviewer` `code-review-report.md` CRR-004 (implementation review round 4, Pass on `40f769e0d`) | IR-003; CRR-003 (failure-origin: CR-002 = G-01), CRR-004 | Fail / 93.6% | Pass / 95.3% |

## Revision Entries

### API-REV-001 — Initial API/E2E baseline: N-3 obligations proven live; path-level messaging residue found (G-01)

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/code-review-report.md`, CRR-002 (round 2, Pass on `e9bbb28ab`)
- Triggering finding or scenario IDs: design-review N-3 obligations: AC-102, AC-103, AC-114 (+QR-104/QR-105), AC-116, AC-117, AC-118, AC-119, AC-121, and the REQ-120 gate re-run
- Related revision IDs: SR-014, SR-016, ARCH-REV-002, IR-001, IR-002, CRR-001, CRR-002
- Why this baseline was recorded: first completed API/E2E validation result for the package
- Coverage decisions or durable test paths changed: none. No durable test added, updated or removed; the design keeps AC-102/103/119-real-run and the identifier gate as one-time probes.
- Scenarios executed:
  - Repository: R-01 … R-09, each failure rechecked on an owned baseline worktree.
  - Live: L-01 … L-08.
  - Added during execution: G-01.
- Commands, environment, fixture, or broader-validation delta (baseline):
  - All commands ran under a scrubbed environment (`cleanenv.sh`), because the agent shell inherits the user's live data-dir env.
  - Real legacy data was produced by the baseline build (`40b1783f4`) through its own GraphQL and ingress path.
  - Candidate `e9bbb28ab` was rebuilt and started on copies of that data.
  - Browser checks ran at 1440 px (Playwright-core) and 450 px (agent tab).
  - Live MCP was exercised on the native, Codex and Claude runtimes.
  - The workspace was validated with a clean-worktree frozen install and an isolated `release --no-push` dry run.
  - Docker was built as-is (pre-existing failure identical on baseline) and with a temp patch for the pre-existing gap (the image ran gateway-free).

#### Prior Failure Resolution

None (initial baseline).

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections), `api-e2e-test-case-ledger.md` (events #0–#24), `api-e2e-execution-coverage-report.md` (all sections), `api-e2e-evidence/**`
- Prior result and confidence: `N/A`
- Current result and confidence: `Fail`, 93.6% (post-repository 78%)
- New or remaining failure IDs:
  - **G-01**: the tracked messaging residue `autobyteus-server-ts/external-channel/gateway-callback-outbox.json`.
    - It is the only path-level REQ-120/AC-120 hit.
    - The new cleanup migration deletes this tracked file whenever the server starts with the default app-data dir (the server package root).
    - Preliminary classification: `Local Fix` (implementation: `git rm` the file).
- Recommended recipient: failure-origin review per `get_handoff_rules` (normally `/code_reviewer`)
- Remaining risks, blocked evidence, or untested scope:
  - `release:test` GitHub dispatch not run (needs a pushed ref).
  - The pre-existing Docker all-in-one Dockerfile gap (separate ticket candidate).
  - The pre-existing `token-usage-analytics` e2e order dependence (separate ticket candidate).
  - Gateway build/tests are out of scope (REQ-121).

### API-REV-002 — G-01 recheck after IR-003: prior failure resolved, round Pass

- Triggering role, report path, and round: `/code_reviewer`, `/Users/normy/autobyteus_org/autobyteus-worktrees/external-messaging-agent-participant-redesign/tickets/in-progress/external-messaging-agent-participant-redesign/code-review-report.md`, CRR-004 (round 4, Pass on `40f769e0d`)
- Triggering finding or scenario IDs: G-01 (= CR-002). The rerun scope agreed in CRR-004 was R-09 + G-01.
- Related revision IDs: IR-003 (implementation removed the tracked file and amended `e9bbb28ab` → `40f769e0d`), CRR-003 (failure-origin review: implementation defect CR-002 plus a review-gate gap; API/E2E probe valid), CRR-004
- Why this revision was recorded: rerun after rework of the round-1 failure
- Coverage decisions or durable test paths changed: none (no durable test added, updated or removed)
- Scenarios rechecked: R-09 (content + path gates) and G-01 (default-data-dir probe). Case IDs reused.
- Commands, environment, fixture, or broader-validation delta:
  - Verified first that `git diff --name-status e9bbb28ab 40f769e0d` = `D autobyteus-server-ts/external-channel/gateway-callback-outbox.json` only, and that the added-file set is unchanged.
  - Reran `scripts/req120-gate.sh` plus a broader path scan.
  - Started the candidate with no `--data-dir` under the scrubbed env (dist equals the commit; `src`/`prisma` unchanged).
  - Cleaned up against a pre-probe snapshot.
  - The round-1 live evidence (L-01…L-08, R-01…R-08) carries forward, because the delta is a single deleted data file.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| G-01 — tracked `autobyteus-server-ts/external-channel/gateway-callback-outbox.json`: path-level REQ-120 hit, deleted by the new cleanup on default-data-dir starts | `Local Fix` (implementation), confirmed as CR-002 in CRR-003 | **Resolved.** The file was removed (IR-003). Path gate empty. The default-data-dir start records SUCCEEDED "migrated 0; skipped 4" with the binding root `SKIPPED` "Not present.", and `git status` shows no tracked change. | `api-e2e-evidence/logs/R-09-req120-gate-round2.log`, `api-e2e-evidence/G-01/default-data-dir-probe-round2.txt`, `api-e2e-evidence/logs/G-01-round2-default-data-dir-start.log` |

- Canonical artifacts and sections updated:
  - `api-e2e-execution-coverage-report.md`: meta, reconciliation, compatibility, matrix, scorecard, summary, cleanup, classification, latest result.
  - `api-e2e-coverage-investigation.md`: meta, reroute table, decision.
  - `api-e2e-test-case-ledger.md`: events #25–#26 and re-entry.
- Prior result and confidence: `Fail`, 93.6%
- Current result and confidence: `Pass`, 95.3% (no category below 90%; every critical AC directly proven)
- New or remaining failure IDs: none
- Recommended recipient: per `get_handoff_rules` (reviewed-route Pass, normally `/code_reviewer`). Proportional test-code review is `Not Applicable`, since no durable test changed.
- Remaining risks, blocked evidence, or untested scope (non-blocking, unchanged):
  - `release:test` GitHub dispatch needs a pushed ref.
  - The pre-existing Docker all-in-one contract-copy gap.
  - The pre-existing token-usage e2e order dependence.
  - The gateway itself is not validated (REQ-121).

