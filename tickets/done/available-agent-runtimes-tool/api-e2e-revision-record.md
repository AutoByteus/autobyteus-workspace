# API/E2E Revision Record — autobyteus-303

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md` CRR-002 (pass), round 1 | SR-005, ARCH-REV-005, IR-002, CRR-002 | N/A | Fail / 88% |
| API-REV-002 | Code reviewer, `code-review-report.md` CRR-005 (pass), round 2 | SR-006, SR-007, IR-003, IR-004, CRR-003…CRR-005 | Fail / 88% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: server E2E, real-stack page probe, live and Docker checks; three findings

- Triggering role, report path, and round: Code reviewer, `code-review-report.md` (CRR-002 Pass), API/E2E round 1.
- Triggering finding or case IDs: none (baseline).
- Related revision IDs: SR-005, ARCH-REV-003/005, IR-001/IR-002, CRR-001/CRR-002.
- Why recorded: first validation of the reviewed package.
- Coverage decisions or durable test paths changed: added `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts`, `autobyteus-web/tests/e2e/model-routing-settings-probe.mjs`, `autobyteus-web/tests/e2e/fixtures/model-routing-provider-usage.mjs`, package script `test:e2e:model-routing-settings`; extended `autobyteus-server-ts/tests/fixtures/agent-runtimes-fake-cli.mjs`.
- Cases: API-00 (reused), API-01…API-12, plus diagnosis cases API-03b, API-05b, API-08b.
- Commands, environment, fixture, or broader-validation delta: clean-env server E2E; built `dist` for the probe, live node (host CLIs, test vault) and test-owned Docker node; `test:integration:prepare` for the Brief Studio E2E files.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation (all), execution report (all), `follow-ups.md` (FU-002), evidence `evidence/api-e2e/`.
- Prior result and confidence: N/A.
- Current result and confidence: `Fail`, 88%.
- New or remaining failure IDs: F-1 (timeout reported as "could not be read"; `Local Fix`), F-2 (local providers with models not listed until their catalog is loaded; `Design Impact`), F-3 (concurrent reads degrade Codex to unknown; `Design Impact`).
- Recommended owner: failure-origin review by the code reviewer; preliminary F-1 implementation engineer, F-2/F-3 Solution Designer.
- Remaining risks, blocked evidence, or untested scope: user-only checks AC-010 on the user's own windows and nodes, AC-006 used-% meaning; signed-in CLIs in Docker not run; FU-002 (pre-existing stale Agent Runtimes probe).
- Rerun plan after fixes (by impact): F-1 → API-01…05 file, API-03b probe, API-07; F-2 → API-01, API-08b, API-07; F-3 → API-01…05 file, API-05b, API-09. Live cases rerun when the service changes (API-08, API-11 quick).

### API-REV-002 — Round 2: round-1 failures resolved; AC-013 and discovered providers covered

- Triggering role, report path, and round: Code reviewer, `code-review-report.md` (CRR-005 Pass), API/E2E round 2.
- Triggering finding or case IDs: F-1, F-2, F-3 (API-REV-001) → CR-002, CR-003, CR-004; SR-006 (AC-013, discovered providers, one time-out rule), SR-007 (one failure wording, round-down percent, composer moved).
- Related revision IDs: SR-006, SR-007, IR-003, IR-004, CRR-003, CRR-004, CRR-005.
- Why recorded: rerun after rework.
- Coverage decisions or durable test paths changed: server E2E file updated (fake LM Studio/custom endpoint hosts, AAR-04 strict for AC-013, AAR-06 new); web probe MRP-02 extended. Confirmed the implementation engineer's two expectation edits (AAR-01 Antigravity 99/98; MRP-02 DeepSeek text) against SR-006/SR-007.
- Cases added, changed, removed, or rechecked: rechecked API-03b, API-05/05b (now in AAR-04), API-08b first; reran every service-driven case; added API-13 (AAR-06).
- Commands, environment, fixture, or broader-validation delta: same environments; `dist` rebuilt at `7ece4e2069`.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| F-1 timed-out step reported "could not be read" (9/400) | Local Fix | resolved: 400/400 "timed out"; AAR-03 strict passes 3/3 runs | API-03, API-03b |
| F-2 local provider with models absent until its catalog was loaded | Design Impact | resolved: LM Studio listed on a fresh server's first read (live and scripted); not answering → absent | API-08b, API-08, API-13, API-07 |
| F-3 concurrent reads degraded Codex to unknown | Design Impact | resolved: one shared read (same `checkedAt`, one app-server start), Codex read for every caller, 10/10 two-reader rounds, live 8/8 | API-05, API-09 |

- Canonical artifacts and sections updated: investigation (meta, Round 2 Rerun Plan, reroute table), execution report (all, round 2), progress log, evidence `*r2*`.
- Prior result and confidence: Fail, 88%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none in scope; FU-002 out of scope (unchanged).
- Recommended owner: code reviewer for proportional test-code review.
- Remaining risks, blocked evidence, or untested scope: user-only checks (AC-010 own windows, AC-006 meaning, signed-in Docker reads); FU-003, FU-005, RSK-001; observations O-2…O-5.
