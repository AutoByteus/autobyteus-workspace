# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code reviewer, `code-review-report.md`, CRR-002 (round 2 `Pass`) | SR-004, ARCH-REV-002, IR-002, CRR-002 | N/A | `Pass` / 95% |
| API-REV-002 | Code reviewer, `api-e2e-test-review-report.md`, CRR-003 (`Fail`, TR-001 Local Fix) | CRR-003 | `Pass` / 95% (MOB-001 case 2 vacuous) | `Pass` / 95% |
| API-REV-003 | User request: cover every case through the real UI | — | `Pass` / 95% | `Pass` / 96% |

## Revision Entries

### API-REV-001 — Baseline API/E2E validation of delegated launch config defaults

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `code-review-report.md`, CRR-002 (round 2, `Pass`).
- Triggering finding or case IDs: None (baseline).
- Related revision IDs: SR-004 (design), ARCH-REV-002 (architecture review), IR-002 (implementation), CRR-002 (code review).
- Why this baseline was recorded: first API/E2E round for the `Large` / `High` package.
- Coverage decisions or durable test paths changed (all added):
  - `autobyteus-server-ts/tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts` (DLC-001..008; gated `RUN_AGY_FAILURE_E2E`)
  - `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` and `test:e2e:delegated-launch-defaults` in `autobyteus-web/package.json` (DLP-001..004)
  - `autobyteus-web/components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` (MOB-001)
- Cases added, changed, removed, or rechecked: added DLC-001..008, DLP-001..004, MOB-001; temporary ISO-001 (isolated desktop instance with real runtimes, at the user's direction); reran existing delegation E2E suites (REG-001) and the repository suites (REPO-001..003, REG-002).
- Commands, environment, fixture, or broader-validation delta: scripted AGY + fake Grok + missing Codex for the durable E2E and probe; the user-named key file imported into the isolated instance's own DB only (instance stopped and its data removed afterwards).

#### Prior Failure Resolution

None.

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` (all sections), `api-e2e-execution-coverage-report.md` (all sections), `api-e2e-test-case-ledger.md` (events 1–17).
- Prior result and confidence: N/A
- Current result and confidence: `Pass`, 95% (post-repository 85%)
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` for proportional test-code review
- Remaining risks, blocked evidence, or untested scope: AC-015 user verification (delivery); UNK-001 (out of scope); mobile shell not rendered (pairing; covered by MOB-001); non-blocking UX observations O-1..O-5 in the execution report.

### API-REV-002 — MOB-001 stale-seed case made non-vacuous (CRR-003 TR-001)

- Triggering role, report path, and round: `/software_engineering_team/code_reviewer`, `api-e2e-test-review-report.md`, CRR-003 (proportional test-code review, `Fail`, Local Fix).
- Triggering finding or case IDs: TR-001; MOB-001 case "a seed that resolves after the user switched to another Team is not applied to it".
- Related revision IDs: CRR-003; API-REV-001.
- Why this revision was recorded: the `startModelCatalog` mock kept a single resolver while two member defaults each awaited a catalog load, so the held seed never resolved and the switch case passed with or without any stale-seed guard. Finding confirmed valid.
- Coverage decisions or durable test paths changed: `autobyteus-web/components/mobile/__tests__/MobileRunSetupMemberSeeding.spec.ts` updated: the gate collects every held resolver and `releaseAll` settles them; a positive control (held → released while the same Team is selected → the reviewer seed is applied) added; the switch case kept.
- Cases added, changed, removed, or rechecked: MOB-001 changed (2 → 3 cases); no other case touched.
- Commands, environment, fixture, or broader-validation delta: spec rerun; mutations M0 (seeding call removed: all 3 fail), M1 (controller selection guard removed: pass), M2 (store draft-ID check removed: pass), M3 (both removed: the switch case fails); sources restored (no diff); related mobile/seeding suites 16 files / 98 tests pass.

#### Prior Failure Resolution

| Prior Case / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| CRR-003 TR-001 (MOB-001 switch case vacuous) | Local Fix (API/E2E) | Resolved: the seed now resolves; the control proves it applies; the switch case fails only when both guards are removed | ledger events 18–19 |

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (round meta, ledger reconciliation, matrix, repository runs, durable coverage, scaffolding, result notes); `api-e2e-coverage-investigation.md` (meta, MOB-001 row); `api-e2e-test-case-ledger.md` (events 18–19).
- Prior result and confidence: `Pass`, 95%
- Current result and confidence: `Pass`, 95%
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` for the targeted proportional test-code review of the mobile spec
- Remaining risks, blocked evidence, or untested scope: unchanged from API-REV-001. Note: the two stale-seed guards are redundant, so the switch case detects only the removal of both.

### API-REV-003 — Browser probe extended so every case runs through the real UI

- Triggering role, report path, and round: the user, in this API/E2E conversation ("do as much test as possible … through the real UI").
- Triggering finding or case IDs: none (coverage extension); gap: AC-006..AC-009, bring-in notes, teammate/helper paths and two fallback reasons were proven only at the server API.
- Related revision IDs: API-REV-001, API-REV-002.
- Why this revision was recorded: to prove every user-visible case where the user sees it.
- Coverage decisions or durable test paths changed: `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` extended: DLP-003 and DLP-004 now start, drive and inspect runs only through the UI (New chat / Org launch, composer, sidebar, member conversations, Settings); DLP-005 (AC-006), DLP-006 (AC-009), DLP-007 (AC-008) added; Squad gains `badsettings` and `incomplete` members; a probe-owned `agy` wrapper answers `agy models` from a file (model retirement); the backend can be restarted on the same data root (pre-change run after an upgrade).
- Cases added, changed, removed, or rechecked: DLP-003, DLP-004 changed; DLP-005..007 added; DLP-001, DLP-002 rechecked.
- Commands, environment, fixture, or broader-validation delta: `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <fresh>`; iteration runs 4–6 fixed test-side selectors (run-view composer, multi-panel `main`); run 7 interrupted by a host restart (orphan probe stopped; temp root already removed); runs 8 and 9 full 7/7.

#### Prior Failure Resolution

None (no open failure; CRR-003 TR-001 resolved in API-REV-002).

- Canonical artifacts and sections updated: `api-e2e-execution-coverage-report.md` (meta, ledger reconciliation, matrix, repository runs, scorecard, durable coverage, dependencies, results); `api-e2e-coverage-investigation.md` (meta, coverage to add); `api-e2e-test-case-ledger.md` (planned cases, events 20–22).
- Prior result and confidence: `Pass`, 95%
- Current result and confidence: `Pass`, 96%
- New or remaining failure IDs: None
- Recommended owner: `/software_engineering_team/code_reviewer` for the targeted proportional test-code review of the extended probe (with the round-2 mobile spec)
- Remaining risks, blocked evidence, or untested scope: AC-015 user verification (delivery); UNK-001 (out of scope); mobile shell not rendered (pairing; MOB-001).
