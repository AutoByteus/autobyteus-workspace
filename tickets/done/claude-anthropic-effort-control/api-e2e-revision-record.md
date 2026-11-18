# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Implementation Engineer, implementation-handoff.md, round 1 | SR-002, IR-001 | N/A | Fail / 84% |
| API-REV-002 | Code Reviewer, code-review-report.md CRR-002 (IR-002), round 2 | SR-003..SR-005, ARCH-REV-002, IR-002, CRR-001/CRR-002 | Fail / 84% | Pass / 95% |

## Revision Entries

### API-REV-001 — Baseline: effort, display removal and saved runs; old-run edit refused

- Triggering role, report path, and round: Implementation Engineer, `implementation-handoff.md` (IR-001, `574aa0bd7` / `a2a5d0e47`), round 1, direct Medium / Low route.
- Triggering finding or case IDs: N/A (baseline).
- Related revision IDs: SR-001 (superseded), SR-002, IR-001.
- Why recorded: first API/E2E validation result.
- Coverage decisions or durable test paths changed: `autobyteus-server-ts/tests/e2e/runtime/autobyteus-anthropic-stored-config-resume.e2e.test.ts` gained team-run and AgentOrg-run restore cases (API-02, API-03), mutation-sensitive.
- Cases: API-01 (reused IMP checks), API-02..API-08 new.
- Commands, environment, fixture, or broader-validation delta: in-process server e2e (synthetic + live), real backend + Nuxt dev + headless Chromium on an owned data root, gated live suites `autobyteus-claude-5-5-live` and `autobyteus-anthropic-prompt-caching-live`.

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: coverage investigation, execution coverage report, test progress log, evidence `API-*`.
- Prior result and confidence: N/A
- Current result and confidence: Fail, 84% overall.
- New or remaining failure IDs: API-04, API-06 (old-run edit part): Run settings Save of a stopped agent/team run whose stored config holds `thinking_display` is refused.
- Recommended owner: Solution Designer (`Design Impact`, preliminary), via code reviewer failure-origin review.
- Remaining risks, blocked evidence, or untested scope: AgentOrg stopped-run edit with a stale key not run (same cause by code); compaction live suite not run (TESTING.md).

### API-REV-002 — Old-run edits fixed; Org edit and launch paths validated

- Triggering role, report path, and round: Code Reviewer, `code-review-report.md` CRR-002 (Pass of IR-002, source `47f44c3df`, handoff `7daf47430`), round 2; reviewed route (Medium / High).
- Triggering finding or case IDs: CR-FO-001 (API-04, API-06 from API-REV-001).
- Related revision IDs: SR-003 (superseded), SR-004, SR-005, ARCH-REV-001/002, IR-002, CRR-001, CRR-002.
- Why recorded: rerun after the fix, plus the new AC-012/AC-013 and RISK-6 checks.
- Coverage decisions or durable test paths changed: none by API/E2E this round (my R1 additions unchanged). The implementation added `autobyteus-anthropic-stored-config-edit-launch.e2e.test.ts` and unit tests (reused as IMP-17..IMP-21).
- Cases added, changed, removed, or rechecked:
  - Rerun: API-02, API-03, API-05, API-06 (old-run edit), API-08.
  - API-04 is proven via API-06/API-09 and IMP-17.
  - New: API-09 (Org model and workspace-only edits), API-10 (opening writes nothing; invalid value still refused), API-11 (launch from a stored default config; FU-005), API-12 (RISK-6 on AGY).
  - Still valid: API-01, API-07, API-07b, the definition-surface part of API-06.
- Commands, environment, fixture, or broader-validation delta: the same ENV-3 stack, rebuilt at `7daf47430`, with the scripted AGY fixture; one real Anthropic call (API-11).

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Case IDs Now Proving It |
| --- | --- | --- | --- |
| API-04 (server refuses stale-key save) | Design Impact (CR-FO-001) | the validator leaves undeclared keys out; callers save the canonical config (SR-004/SR-005, IR-002) | IMP-17, API-06, API-09 |
| API-06 old-run edit (agent, team) | Design Impact (CR-FO-001) | same; Save succeeds and the key is dropped from the saved config | API-06 (R2) |

- Canonical artifacts and sections updated: coverage investigation ("Round 2 Plan", meta, ambiguity row), execution coverage report (all sections), test progress log, `follow-ups.md` (FU-005), evidence `API-*-r2-*`, `API-09-*`, `API-11-*`, `API-r2-browser-journeys.txt`.
- Prior result and confidence: Fail, 84%.
- Current result and confidence: Pass, 95%.
- New or remaining failure IDs: none.
- Recommended owner: Code Reviewer (proportional test-code review), then Delivery.
- Remaining risks, blocked evidence, or untested scope: FU-005 (standalone launch keeps an inert undeclared key); Org launch not driven from the UI (IMP-17 covers the server); compaction live suite not run (TESTING.md).
