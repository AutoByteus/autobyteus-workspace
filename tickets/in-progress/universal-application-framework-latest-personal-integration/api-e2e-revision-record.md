# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer` / `CRR-003` / round 1 | `SR-003`, `ARCH-REV-003`, `IR-003`, `CRR-003` | N/A | **Fail / 73%** |
| `API-REV-002` | `code_reviewer` / `CRR-005` / round 2 | `SR-003`, `ARCH-REV-003`, `IR-004`, `CRR-005` | **Fail / 73%** | **Fail / 75%** |
| `API-REV-003` | `code_reviewer` / `CRR-007` / round 3 | `SR-003`, `ARCH-REV-003`, `IR-005`, `CRR-007` | **Fail / 75%** | **Fail / 93%** |
| `API-REV-004` | `code_reviewer` / `CRR-009` / round 4 | `SR-003`, `ARCH-REV-003`, `IR-006`, `CRR-009` | **Fail / 93%** | **Pass / 98%** |

## Revision Entries

### API-REV-001 — Current-Personal recovery baseline and dual-host startup failure

- Triggering role, report path, and round: `/code_reviewer`; `tickets/in-progress/universal-application-framework-latest-personal-integration/code-review-report.md`; execution round 1.
- Triggering finding/scenario IDs: IR-003 resolution of CR-001–CR-003; new `APIE2E-SOCRATIC-001` / `APIE2E-F001` and `APIE2E-STANDALONE-001` / `APIE2E-F002`.
- Related revisions: `SR-003`, `ARCH-REV-003`, `IR-003`, `CRR-003`.
- Why recorded: first authoritative API/E2E baseline for the integrated latest-Personal candidate after source review Pass.
- Coverage decisions/durable changes: updated 15 current-contract fixture paths; removed obsolete `tests/integration/agent/team-lifecycle-websocket.integration.test.ts`; left one known inherited launch-correlation fixture for the post-fix rerun.
- Scenarios checked: direct SQLite journal read/recovery; affected architecture/lifecycle; current application/Agent Tools/WS/package/prompt/identity fixtures; maintained package build/validate/typecheck; exact Socratic target; real Socratic standalone startup; executable manager stack correlation.
- Environment/command delta: built server before devkit and frontend SDK before maintained packages; used Node 22, loopback ports and isolated SQLite data roots; stopped broader validation after the critical shared startup failure.

#### Prior Failure Resolution

None — this is the initial baseline.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, and `evidence/api-e2e/`.
- Prior result/confidence: `N/A`.
- Current result/confidence: **Fail / 73%**.
- New or remaining failure IDs: `APIE2E-F001`, `APIE2E-F002`.
- Recommended recipient: `/code_reviewer` for focused failure-origin review.
- Remaining risks/untested scope: real Studio; real Brief; both-host Luna/provider/tool/named-handoff/publication/projection; same-data restart and active-run cleanup; exact package/watch parity; browser; one inherited fixture; downstream Electron.

### API-REV-002 — Prior fixes pass; fresh-root Codex workspace blocks standalone

- Triggering role, report path, and round: `/code_reviewer`; `tickets/in-progress/universal-application-framework-latest-personal-integration/code-review-report.md`; execution round 2.
- Triggering finding or scenario IDs: CRR-005 source resolution of `APIE2E-F001` and `APIE2E-F002`; rechecked `APIE2E-SOCRATIC-001` and `APIE2E-STANDALONE-001`; discovered `APIE2E-CODEX-CWD-001` / `APIE2E-F003`.
- Related revisions: `SR-003`, `ARCH-REV-003`, `IR-004`, `CRR-005`.
- Why recorded: both prior failure origins were rechecked first and resolved, but the same real fresh-root standalone journey exposed a new critical pre-listen failure requiring focused origin review.
- Coverage decisions/durable changes: updated `tests/unit/application-backend/socratic-lesson-target-projection.test.ts` only to assert the current Socratic configuration-owner diagnostic for a missing `/tutor`; all exact successful identity assertions remain. The cumulative API-REV-001 test delta and stale-file removal remain preserved.
- Scenarios rechecked: exact configured Socratic target; server/devkit/frontend SDK and both maintained app builds; fresh-root Socratic standalone migrations, process-owner construction and Codex readiness; direct executable-versus-cwd correlation.
- Commands, environment, fixture, or broader-validation delta: rebuilt cleaned prerequisites, used a unique `/private/tmp` data root and port 43141, supplied the existing authenticated absolute Codex executable, and compared spawning it from the missing application runtime cwd against an existing cwd. The later Studio/Brief/browser/parity matrix stopped under fail-fast routing.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-SOCRATIC-001` / `APIE2E-F001` | Local Fix / implementation defect | **Resolved**: focused current projection coverage passes 3/3 and returns the exact configured binding member `agentRunId` | `evidence/api-e2e/api-rev-002-socratic-target-rerun.log` |
| `APIE2E-STANDALONE-001` / `APIE2E-F002` | Local Fix / implementation defect | **Resolved origin**: fresh-root startup passes exclusive process manager initialization and reaches provider readiness; the former duplicate-manager error is absent | `evidence/api-e2e/api-rev-002-socratic-standalone-rerun.log` |

- Canonical artifacts and sections updated: `api-e2e-coverage-investigation.md` API-REV-002 re-entry/result sections; `api-e2e-execution-coverage-report.md`; this revision record; `evidence/api-e2e/api-rev-002-*`.
- Prior result and confidence: **Fail / 73%**.
- Current result and confidence: **Fail / 75%**.
- New or remaining failure IDs: `APIE2E-F003` — the declared application `runtimeDir` is absent when provider readiness first uses it as Codex `cwd`, producing `ENOENT` before listen.
- Recommended recipient: `/code_reviewer` for focused failure-origin review, with preliminary classification **Local Fix / implementation defect** in fresh-root storage/readiness ordering or workspace preparation ownership.
- Remaining risks, blocked evidence, or untested scope: the complete real Studio and Brief flows; listening standalone UI/API; real provider/tool dispatch, named handoff and publication/projection; same-data restart/reentry and active-run cleanup; exact package/watch parity; browser; the inherited `app-owned-launch-request-correlation.test.ts` fixture; downstream Electron.

### API-REV-003 — Fresh-root fix passes; deterministic Socratic initial-input failure

- Triggering role/report/round: `/code_reviewer`; `code-review-report.md` / `CRR-007`; round 3.
- Related revisions: `SR-003`, `ARCH-REV-003`, `IR-005`, `CRR-007`.
- Prior result/confidence: **Fail / 75%**.
- Current result/confidence: **Fail / 93%**.
- Why recorded: IR-005 closed the prior pre-listen blocker and enabled the first near-complete dual-host current-tree run; realistic execution then exposed a new critical fresh Socratic first-message failure.
- Coverage decisions: reconciled the final current launch-correlation fixture; reran all 16 modified current-contract files (77 tests Pass); retained removal of the obsolete leaf-snapshot integration; identified a missing durable fresh package-team member-readiness/first-input boundary test to add with the source correction.
- Scenarios: fresh Socratic standalone; IR-005 affected repository matrix; full/units characterization; Brief standalone/Studio real business, Agent Tools, named handoff and projection; both maintained `dev` loops; Studio `dev:studio` refresh/remount/restart; Socratic Studio setup and real first turn; route separation; exact 73/73 parity; cleanup.
- Environment delta: real authenticated `/Applications/Codex.app/Contents/Resources/codex`, installed headless Chrome, isolated ports 8014/3014/43141–43144 and owned SQLite/data roots. Accepted Studio execution used explicit isolated environment variables.

#### Prior Failure Resolution

| Prior Failure | Resolution | Evidence |
| --- | --- | --- |
| `APIE2E-F001` | remains resolved; live worker/binding returns exact `/tutor` member `agentRunId` | Socratic worker/correlation JSON |
| `APIE2E-F002` | remains resolved across both live host compositions | host logs |
| `APIE2E-F003` | **Resolved**; normal fresh standalone prepares runtime cwd, reaches readiness/listen/200 and stops cleanly | `api-rev-003-socratic-standalone*.log` |

#### New Failure

- Scenario/failure: `APIE2E-SOCRATIC-002` / `APIE2E-F004`.
- Expected: fresh lesson accepts its initial problem and saves the real tutor response.
- Observed: two fresh lessons persist exact team/member bindings but reject the initial input, display `Tutor connection failed`, and retain one student message. Reopening the first lesson and sending a follow-up through the same exact target succeeds and saves a real tutor response.
- Preliminary classification: implementation/source behavior in fresh member readiness/input-admission sequencing; focused code-review origin analysis required.
- Evidence: `api-rev-003-socratic-studio-business.json`, `api-rev-003-socratic-studio-fresh-repro.json/.png`, `api-rev-003-socratic-studio-retry.json/.png`, `api-rev-003-socratic-failure-correlation.json`, `api-rev-003-socratic-failure-source-correlation.log`, worker and engine-status evidence.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record and `evidence/api-e2e/api-rev-003-*`.
- Recommended recipient: `/code_reviewer` for focused failure-origin review.
- Remaining scope after correction: rerun F004 first, add the durable real-boundary regression, then finish the proportional current web/recovery/isolation tail and return the full durable delta for successful test-code review.

### API-REV-004 — Exact-member correction passes complete dual-host execution

- Triggering role/report/round: `/code_reviewer`; `code-review-report.md` / `CRR-009`; round 4.
- Related revisions: `SR-003`, `ARCH-REV-003`, `IR-006`, `CRR-009`.
- Prior result/confidence: **Fail / 93%**.
- Current result/confidence: **Pass / 98%**.
- Why recorded: IR-006 corrected application team input dispatch to preserve the exact binding-owned member run identity. The exact formerly failing Socratic Studio first-message path now passes, permitting completion of the retained real dual-host matrix.
- Coverage decisions: retained all 16 current-contract fixture updates and the obsolete leaf-snapshot integration removal; updated two stale assertions so public `/researcher` input is translated to exact `researcher-run` / `team-run-1::researcher` dispatch identity; added no new API-owned scenario because the implementation-owned real-`RootTeamRun` regression directly protects the reusable correction.
- Repository execution: IR-006 plus architecture **4 files / 27 tests Pass**; server build-config TypeScript Pass; corrected fixtures **2 files / 3 tests Pass**; cumulative durable **16 files / 77 tests Pass**; devkit **20/20 Pass**; maintained package validate/typecheck, web boundary and Nuxt production build Pass.
- Real execution: fresh Socratic Studio first turn with exact `/tutor` identity and real Luna/Codex; Socratic standalone and watcher restart; Socratic remount; Brief standalone and Studio publication, named `/writer` handoff, writer continuation and two-artifact projection; route separation; active Studio shutdown/same-data restart; all four maintained watcher loops; exact **73/73** byte parity; leak-free cleanup.
- Environment delta: Node `22.23.1`, authenticated `/Applications/Codex.app/Contents/Resources/codex`, installed Chrome, isolated ports `8015`/`3015`/`43145`/`43146` and owned `/private/tmp/api-rev004-*` roots. User ports, Desktop process and home data were not used.

#### Prior Failure Resolution

| Prior Failure | Resolution | Evidence |
| --- | --- | --- |
| `APIE2E-F001` | remains resolved; exact `/tutor` binding member run is returned | `api-rev-004-socratic-studio-correlation.json` |
| `APIE2E-F002` | remains resolved across standalone and Studio process ownership | host/cleanup logs |
| `APIE2E-F003` | remains resolved on fresh maintained standalone starts | standalone logs |
| `APIE2E-F004` | **Resolved**; fresh Studio initial problem is immediately accepted and a real tutor response is saved without retry | `api-rev-004-socratic-studio-business.json/.png`, worker/correlation logs |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record and `evidence/api-e2e/api-rev-004-*`.
- New or remaining current API/E2E failure IDs: **None**.
- Residual scope: Electron shell/package validation remains downstream; historical inherited broad server debt remains separate and is not Pass evidence.
- Recommended recipient: `/code_reviewer` for the required proportional successful review of every cumulative durable update/removal before delivery.
