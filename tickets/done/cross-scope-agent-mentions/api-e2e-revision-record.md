# API/E2E Revision Record — cross-scope-agent-mentions

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, `code-review-report.md` CRR-003 (Pass), round 1 | SR-004, SR-007, ARCH-REV-002, IR-003, CRR-003 | N/A | Fail / 86% |
| API-REV-002 | Code Reviewer, `code-review-report.md` CRR-005 (Pass), round 2 | SR-008, SR-010, ARCH-REV-004, IR-004, CRR-004, CRR-005 | Fail / 86% | Pass / 95% |
| API-REV-003 | Code Reviewer, `api-e2e-test-review-report.md` CRR-006 (Fail, TR-001 Local Fix) | CRR-006 | Pass / 95% | Pass / 95% |
| API-REV-004 | User request: real desktop testing with the public agent package | API-REV-003 | Pass / 95% | Pass / 96% |

## Revision Entries

### API-REV-001 — Baseline: live validation on five runtimes and three run kinds; Team-run defects and a collaborator-Team handoff gap

- Triggering role, report path, and round: Code Reviewer, `tickets/in-progress/cross-scope-agent-mentions/code-review-report.md` (CRR-003, Pass), API/E2E round 1.
- Triggering finding or case IDs: handoff focus list (UXJ-001–005 on real runtimes incl. AGY/ACP, VIS-007, Team/Org menus and rows, Stop/crash/restore, C-02, helpers, old data).
- Related revision IDs: SR-004 (requirements), SR-007 (design), ARCH-REV-002, IR-001–IR-003, CRR-001–CRR-003.
- Why recorded: first completed API/E2E result.
- Coverage decisions / durable test paths changed:
  - Added `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (live, gated per runtime).
  - Added `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` and the `test:e2e:cross-scope-agent-mentions` script.
  - Updated `autobyteus-server-ts/tests/e2e/agent/standalone-error-termination-lifecycle.e2e.test.ts` (stale lifecycle stub).
  - Updated `autobyteus-server-ts/tests/e2e/runtime/grok-build-runtime-replay.e2e.test.ts` and `tests/fixtures/grok-acp/fake-acp-agent.mjs` (recordings predate always-on Agent Tools MCP; obsolete `mcpServers: []` assertion).
  - Updated `autobyteus-server-ts/tests/skill-improvement/skill-improvement-improver-session-service.test.ts` (helper `launchPurpose`).
- Cases added: RC-01–06, LE-01a–e, A01–A03, T01–T03, O01–O02, L01–L02, P01, N01, HX-01, F-01 repro, C-02 observation.
- Commands / environment: see the execution report; live E2E on an in-process server with temp data; browser probe on an owned backend + Nuxt dev per session; host-crash cases on AGY; base comparisons in `/tmp/csam-base`.

#### Prior Failure Resolution

None.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, `api-e2e-test-case-ledger.md`, this record.
- Prior result and confidence: N/A
- Current result and confidence: `Fail`, 86%
- New or remaining failure IDs: F-01 (High), F-02 (Medium), F-03 (Low), F-04 (Low), U-01 (C-02, Design Impact candidate)
- Recommended owner: implementation engineer for F-01–F-04 (`Local Fix`); solution designer for U-01 (`Design Impact`); routed through code-review failure-origin review.
- Remaining risks / untested scope: application-owned runs not exercised live (server exclusions unit-tested); Grok's last-step rerun limited by provider quota (isolated run passed); host crash only reachable on process-bound runtimes (validated on AGY).

### API-REV-002 — SR-010 collaborators: live on four runtimes and three run kinds; prior failures resolved

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` (CRR-005, round 5, Pass), API/E2E round 2.
- Triggering IDs: DI-001 (from API-REV-001 U-01), CR-003, CR-004 (F-02/F-03/F-04); the reviewer's focus list items 1–8.
- Related revision IDs: SR-008 (requirements, RD-004), SR-010 (design), ARCH-REV-004, IR-004, CRR-004, CRR-005.
- Why recorded: rerun after the redesign.
- Coverage decisions / durable test paths changed:
  - Rewritten for SR-010: `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` (per-runtime journey + DI-001 case; step-timeout override `COLLABORATOR_E2E_STEP_TIMEOUT_MS`).
  - Rewritten for SR-010: `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` (A01–A05, T01, T02, O01, O02, F01 real failure, L01/L02, P01, N01).
  - Unchanged and rerun: the four round-1 updates (error-termination harness, Grok replay + fake ACP agent, improver `launchPurpose`) and `autobyteus-web/package.json`.
- Cases added: LE-02 (DI-001), A04 (old trace), A05 (viewing doesn't restore), F01 (real failure ×3 transports), LAT-01 (latency).
- Environment delta: base worktree recreated for files first run this round; latency measured on owned backends; Grok blocked by provider quota.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| F-01 (Team next send after `@` send) | Local Fix | Resolved (CR-003) | T01 `r2-browser-final/T01-04-*` |
| F-02 (collaborator Team collapsed) | Local Fix | Resolved | T01 `T01-02-*` |
| F-03 (raw address names) | Local Fix | Resolved | T01, O01, A01 screenshots |
| F-04 (Agent-root collaborator view) | Local Fix | Resolved | A01 `A01-06-*` |
| U-01 / C-02 → DI-001 | Design Impact | Resolved by SR-010 | LE-02 on Claude, Codex, AGY, AutoByteus |

- Canonical artifacts updated: coverage investigation (round-2 section), execution coverage report (round 2 authoritative), ledger (round-2 section), this record.
- Prior result and confidence: Fail, 86%
- Current result and confidence: Pass, 95%
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (proportional test-code review)
- Remaining risks: R-1 cosmetic host label (VIS-013 Team tab); R-2 reconnect after server restart restores the root (as Team streams); R-3 live cross-root run-ID messaging kept by REQ-012; R-4 Grok live blocked by quota; R-5 application-owned runs not live.

### API-REV-003 — TR-001: probe reports Not Applicable distinctly

- Triggering role, report path, and round: Code Reviewer, `api-e2e-test-review-report.md` (CRR-006, test review Fail, Local Fix).
- Triggering finding: TR-001 (Low) — a `{ notApplicable }` case was recorded and counted as `Pass`.
- Coverage change: `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` records `Not Applicable` with its reason, prints it, keeps it out of the pass count and the exit code, adds a summary line and `evidence.summary`; removes the redundant `void execFileSync`.
- Re-run: `--cases N01,L01` on Claude → L01 Not Applicable (reason printed), N01 Pass, `Summary: 1 Pass, 0 Fail, 1 Not Applicable`, exit 0 (`api-e2e-evidence/r2-browser-tr001/`).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| TR-001 | Local Fix (API/E2E) | Resolved | probe diff; `r2-browser-tr001/` |

- Canonical artifacts updated: execution coverage report (counts in rows 70/183 and the result summary; TR-001 section), ledger, this record.
- Prior result and confidence: Pass, 95%
- Current result and confidence: Pass, 95% (unchanged; the Claude browser count is now stated as 12 Pass + 2 Not Applicable)
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (quick re-review of the test review)

### API-REV-004 — Real desktop journeys with the public agent package, two-way messaging and full restart

- Trigger: user request to test the feature for real in an isolated desktop instance with the public agent package, covering every add case, two-way communication and restoration.
- Coverage change: no durable test changed. Temporary driver `api-e2e-evidence/r3-desktop/desktop-journeys.mjs` (kept as evidence); evidence in `api-e2e-evidence/r3-desktop/`.
- Executed: D0 import; D1 Daily Assistant `@` Software Engineering Team; D2 solution designer `@` Product Prototyper and `@` Product Team; D3 delivery engineer `@` Marketing Team; BI-1…4 two-way round trips; RESTORE after `isolated-app restart` (same tree, conversations and Offline state; RS-1…4 both directions).
- Observations: OBS-D1 (unprompted report-back depends on the agent); OBS-D3 (one focus change to the collaborator during D3, caused by the user's manual click — not product behaviour).

#### Prior Failure Resolution

None (no prior failure open).

- Canonical artifacts updated: execution coverage report (Desktop Application Validation, lifecycle, result summary, cleanup), ledger (desktop section), this record.
- Prior result and confidence: Pass, 95%
- Current result and confidence: Pass, 96% (user-surface/desktop category raised by real Electron evidence)
- New or remaining failure IDs: none
- Recommended owner: Code Reviewer (quick re-review already pending for API-REV-003; this adds evidence only)
