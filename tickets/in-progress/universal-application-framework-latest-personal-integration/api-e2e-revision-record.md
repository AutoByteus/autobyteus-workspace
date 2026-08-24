# API/E2E Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Related Upstream Revision IDs | Prior Result / Confidence | Current Result / Confidence |
| --- | --- | --- | --- | --- |
| `API-REV-001` | `code_reviewer` / `CRR-003` / round 1 | `SR-003`, `ARCH-REV-003`, `IR-003`, `CRR-003` | N/A | **Fail / 73%** |
| `API-REV-002` | `code_reviewer` / `CRR-005` / round 2 | `SR-003`, `ARCH-REV-003`, `IR-004`, `CRR-005` | **Fail / 73%** | **Fail / 75%** |
| `API-REV-003` | `code_reviewer` / `CRR-007` / round 3 | `SR-003`, `ARCH-REV-003`, `IR-005`, `CRR-007` | **Fail / 75%** | **Fail / 93%** |
| `API-REV-004` | `code_reviewer` / `CRR-009` / round 4 | `SR-003`, `ARCH-REV-003`, `IR-006`, `CRR-009` | **Fail / 93%** | **Pass / 98%** |
| `API-REV-005` | user-requested packaged Electron provider expansion / round 5 | `API-REV-004`, `CRR-010`, `DR-001` | **Pass / 98%** | **Blocked / 88%** |
| `API-REV-006` | user-reported DeepSeek balance restoration / round 6 | `API-REV-005`, `API-REV-004`, `CRR-010`, `DR-001` | **Blocked / 88%** | **Pass / 99%** |
| `API-REV-007` | `code_reviewer` / `CRR-012` / round 7 | `SR-004`, `ARCH-REV-004`, `IR-007`, `CRR-012`, `DR-004` | **Pass / 99%** | **Pass / 98%** |

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

### API-REV-005 — Packaged Classroom run reaches DeepSeek balance block

- Triggering role/report/round: explicit user request; `api-e2e-execution-coverage-report.md`; round 5.
- Triggering scenario: `APIE2E-ELECTRON-CLASSROOM-001` with owner-supplied credentials and agent package.
- Related revisions: `API-REV-004`, successful cumulative durable review `CRR-010`, and delivery packaged-Electron result `DR-001`.
- Why recorded: the user requested a stronger packaged-shell test using real private credentials, a local agent package, exact mixed runtimes/models, tools, files and recipient-name handoff.
- Coverage decision: temporary executable evidence only; private credentials, local authentication, mutable external package and billed providers make this unsuitable as deterministic repository-resident coverage. No durable test changed.
- Environment delta: exact packaged macOS ARM64 AutoByteus artifact; isolated Electron E2E root and loopback ports; nine supported secret assignments imported value-safely; local `/Users/normy/autobyteus_org/autobyteus-agents`; Professor Codex `gpt-5.6-luna`; Student AutoByteus `deepseek-v4-flash`.
- Execution result: packaged startup, credential import, package discovery, exact model configuration, team creation, Professor `run_bash`, assignment-file creation and Professor -> Student `send_message_to` all passed. Student `DeepSeekLLM` initialized but four requests rolled back and produced no answer or reply.
- External correlation: the same source credential and exact model returned HTTP `402`, `invalid_request_error`, `Insufficient Balance` in a value-safe direct probe.
- Cleanup: owned process group stopped gracefully; ports `53376` and `54491` are free; credential-bearing root and raw provider response were removed; the ordinary user app remained PID `37991`, port `29695`, health `200`.

#### Prior Failure Resolution

None. `API-REV-004` had no unresolved current failure. Its approved application-framework Pass remains valid; API-REV-005 is a supplemental provider-permutation expansion.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, and `evidence/api-e2e/api-rev-005-*`.
- Prior result/confidence: **Pass / 98%** for the approved application-framework scope.
- Current result/confidence: **Blocked / 88%** for the added packaged real-provider scenario.
- New blocker ID: `APIE2E-BLOCKER-001` — DeepSeek account insufficient balance.
- Recommended recipient: user; restore DeepSeek balance/access, then rerun the exact scenario unchanged.
- Remaining untested scope: Student model completion, Student `run_bash`, answer-file creation, Student -> Professor `send_message_to`, and Professor's final correctness verdict.


### API-REV-006 — Restored DeepSeek balance completes packaged Classroom team

- Triggering role/report/round: explicit user re-entry after account top-up; `api-e2e-execution-coverage-report.md`; round 6.
- Triggering scenario: rerun of `APIE2E-ELECTRON-CLASSROOM-001` and `APIE2E-BLOCKER-001` with the same credential source, external package and exact mixed runtime/model selection.
- Related revisions: blocked `API-REV-005`, approved framework `API-REV-004`, successful cumulative durable review `CRR-010`, and packaged Electron result `DR-001`.
- Why recorded: the only missing critical evidence in API-REV-005 was real DeepSeek Student completion and the return file-backed handoff after the external HTTP 402 account condition.
- Coverage decision: temporary executable evidence only; no repository-resident durable test was added, updated or removed. The scenario depends on private credentials, installed Codex authentication, a mutable external package and billed providers.
- Environment delta: fresh marked `/private/tmp` root, ports `55888`/`55889`, exact packaged executable and `app.asar` hashes, external agent package commit `c4e271924ed64196edbe80927d4f7eec32a68df3` (clean), and parent test-runner environment overrides stripped before the supported launcher injected its isolated root/port.
- Execution result: exact DeepSeek direct probe HTTP 200; packaged Settings package import; nine value-safe credential assignments; Professor `CODEX` / `gpt-5.6-luna`; Student `AUTOBYTEUS` / `deepseek-v4-flash`; real assignment creation, Professor -> Student message, Student read/write/return message, Professor correctness verdict/feedback, Student acknowledgement, four persisted messages, four files, sixteen tool calls and quiescent checkpoint.
- Cleanup: process group stopped gracefully, both ports free, credential-bearing root and temporary harnesses removed, zero sensitive-value matches in retained evidence, and ordinary AutoByteus PID `37991`/port `29695` remained health `200`.

#### Prior Failure Resolution

| Prior Scenario / Failure Reference | Previous Classification | Current Resolution | Evidence |
| --- | --- | --- | --- |
| `APIE2E-BLOCKER-001` | external provider account; HTTP 402 Insufficient Balance | **Resolved**: exact credential/model returned HTTP 200 with completed `OK` response | `evidence/api-e2e/api-rev-006-deepseek-direct-probe.log` |
| `APIE2E-ELECTRON-CLASSROOM-001` | Blocked after Professor -> Student delivery because Student provider could not respond | **Resolved**: real DeepSeek Student read the assignment, wrote answer 42, replied with the file; Professor read and graded it; follow-up feedback/acknowledgement also completed | `api-rev-006-electron-classroom-correlation.json`; result screenshot and runtime logs |

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record, and `evidence/api-e2e/api-rev-006-*`.
- Prior result/confidence: **Blocked / 88%** for the added packaged real-provider scenario.
- Current result/confidence: **Pass / 99%**.
- New or remaining current failure IDs: **None**.
- Recommended recipient: `/code_reviewer` for proportional test-code review, expected `Not Applicable` because no durable test changed in API-REV-006.
- Remaining risk: future live provider balance/availability or external-package changes are mutable external conditions; all requested critical behavior is directly proven for the recorded artifact/package identities.

### API-REV-007 — Current-Personal refresh passes complete dual-host execution

- Triggering role/report/round: `/code_reviewer`; `code-review-report.md` / `CRR-012`; round 7.
- Triggering surface: `IR-007` semantic refresh against newest Personal, requiring current/stale/external model, native/application error, provider, real maintained host, publication/handoff, recovery/remount, parity and cleanup proof on the refreshed tree.
- Related revisions: `SR-004`, `ARCH-REV-004`, `IR-007`, `CRR-012`, delivery re-entry `DR-004`.
- Why recorded: prior `API-REV-004` and `API-REV-006` results were characterization only for the new semantic merge. This round establishes the first authoritative current-base repository and real dual-host evidence at reviewer HEAD `fdc18bfcb39f6de80df9b7f5d21b1ba2d00c4342`.
- Durable coverage decisions:
  - updated `autobyteus-server-ts/tests/e2e/llm-management/qwen-configuration-lifecycle-graphql.e2e.test.ts` from stale global `glm-5.2` to current `glm-5.3` plus its `1,000,000` context; custom Qwen `qwen:glm-5.2` lifecycle behavior remains unchanged;
  - updated `autobyteus-server-ts/tests/unit/llm-management/services/model-catalog-service.test.ts` from retired `gemini-3.5-flash` to current `gemini-3.7-flash`;
  - canonical rebuild plus the six-file current-model reconciliation passed 28/28; no production file or durable test removal occurred.
- Repository execution: topology/deletion/marker audit Pass; SDK/server/web and maintained app build gates Pass; frontend SDK 12/12; current-model 4 files/26; ERROR boundary 5/37; architecture 15/15; native provider 8/39; affected integration 4/10; current web 5/106; devkit 20/20.
- Real execution: Socratic and Brief both passed standalone and Studio business journeys through real Chrome and authenticated Codex Luna. Socratic solved fresh problems and recovered its transcript. Brief dispatched real `publish_artifacts` and `/writer` `send_message_to`, projected research/final artifacts, survived active `dev:studio` worker refresh, explicitly remounted and recovered after same-data Studio restart. Internal-route/external-gateway separation passed.
- Commands/parity/cleanup: all four maintained `dev`/`dev:studio` edit loops reloaded; exact 73/73 package/authoring hashes were unchanged; owned processes, ports, roots and generated outputs were cleaned; ordinary AutoByteus health remained 200; retained text evidence contained zero compared secret values.
- Broad characterization: full web was 419 passed / 3 failed / 2 skipped files; full server was 527 passed / 69 failed / 32 skipped files. Focused origin/correlation established two stale current-model assertions (fixed here), one non-reproducing token-analytics case, and the remaining historical baseline. `APIE2E-REPO-005` remains separately **Unclear** and is neither current Pass evidence nor an IR-007 finding.

#### Prior Failure Resolution

None. `API-REV-006` had no unresolved current failure. Its packaged external-provider result remains valid for its recorded artifact identity but does not substitute for this refreshed-tree dual-host run.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record and `evidence/api-e2e/api-rev-007-*`.
- Prior result/confidence: **Pass / 99%** for the separate API-REV-006 packaged-provider scenario; approved prior dual-host baseline was **Pass / 98%** in API-REV-004.
- Current result/confidence: **Pass / 98%** for the complete refreshed current-base API/E2E scope.
- New or remaining current failure IDs: **None**.
- Recommended recipient: `/code_reviewer` for proportional test-code review of both updated durable test files before delivery resumes.
- Remaining risk: historical `APIE2E-REPO-005` remains separate/Unclear; mutable live-provider availability remains external; current Electron packaging/shell coordination remains downstream delivery-owned.

### API-REV-008 — Nested-scope/provider merge passes current dual-host execution

- Triggering role/report/round: `/code_reviewer`; `code-review-report.md` / `CRR-014`; round 8.
- Triggering surface: `IR-008` semantic merge for immutable nested TeamRun physical scope, old flat Team Agent memory migration, provider-granular model availability/credential authority and settled Studio model selection.
- Related revisions: `SR-005`–`SR-007`, `ARCH-REV-005`–`ARCH-REV-007`, `IR-008`, `CRR-014`, delivery re-entry `DR-006`.
- Executed identity: reviewer HEAD `5492815bd66d5714abc7c2c19fd478f043b3c3e6`; semantic merge `9a9150bea90a94ff43e67c417e5a424fd9dc76ce`; exact parents `a23849f165879050e2c9b676a2e9652d8a593c93` and `c5b87df4d6db15969ba70adee9dfd8394b1e7385`.
- Why recorded: prior API-REV-007 is parent-checkpoint characterization only. API-REV-008 establishes current exact-input repository, old-data migration, provider and real dual-host proof for IR-008.
- Durable coverage decision: all affected current tests remain valid; **no repository-resident durable test was added, updated or removed** in this round.
- Repository result: topology/retired-owner/prototype audit Pass; coupled server `14 files / 89 tests` Pass; server build Pass; nested actual-process/SQLite history restart `2/2` Pass; memory-sync `1/1` Pass; AutoByteus provider `5/19`; Studio web `5/53`; frontend SDK `12/12`; devkit `20/20`; maintained app type/build/validate Pass.
- Real execution: Socratic and Brief both passed standalone and Studio in installed Chrome through authenticated Codex Luna. Socratic solved `9x - 8 = 28` and `6x + 5 = 29` as `x = 4`; Brief completed real Researcher publication, `/writer` handoff, Writer publication, two projections and `in_review`. Explicit one-iframe remount, standalone and Studio same-data recovery, route separation and physical nested traces passed.
- Provider execution: real Studio GraphQL reload exposed independent safe AutoByteus `LLM`/`AUDIO`/`IMAGE` `ERROR` states and LM Studio `READY` with 15 models; durable two-leaf/provider/credential coverage passed.
- Commands/parity/cleanup: two repeated edits produced three standalone ready cycles and two Studio reloads per app; exact `73/73` pre/post hashes matched; owned ports/roots/output were cleaned; ordinary app `29695` remained listening; zero compared secret values appeared in retained evidence.
- Historical characterization: the production-upgrade selection still has the exact inherited three post-migration general-run failures recorded as `APIE2E-REPO-005`; it remains separate **Unclear**, neither current Pass evidence nor an IR-008 finding.

#### Prior Failure Resolution

None. API-REV-007 had no unresolved current implementation failure. Its Pass remains valid only for its recorded tree.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record and `evidence/api-e2e/api-rev-008-*`.
- Prior result/confidence: **Pass / 98%** (`API-REV-007`).
- Current result/confidence: **Pass / 98%**.
- Broader validation: **Required; executed; Pass**.
- New or remaining current failure IDs: **None**.
- Recommended recipient: `/code_reviewer` for proportional test-code review, expected **Not Applicable** because API-REV-008 changed no durable test.
- Remaining risk: historical `APIE2E-REPO-005` remains separate/Unclear; provider availability is externally mutable; current Electron packaging and the later final-base refresh remain downstream delivery-owned.

### API-REV-009 — Controlled New-workspace integration passes current dual-host execution

- Triggering role/report/round: `/code_reviewer`; `code-review-report.md` / `CRR-016`; round 9.
- Triggering surface: `IR-009` controlled Agent/Team workspace selection, registration-before-launch, delayed discovery persistence and failure/no-fallback behavior on the current semantic merge.
- Related revisions: `SR-008`, `ARCH-REV-008`, `IR-009`, `CRR-016`, delivery re-entry `DR-008`.
- Executed identity: reviewer HEAD `f389358e70054a9e249dd0f06623c1c154c130a5`; implementation artifact `8a7955e9455eadc1be689aa4802384381f2107d8`; semantic merge `53dd98b53490947ed96d4dda9fb45d9c80719740`.
- Why recorded: API-REV-008 was earlier-tree characterization only. API-REV-009 establishes direct current-head controlled-browser, API/history, real-provider, process/recovery and package-integrity evidence.
- Durable coverage decision: all affected tests remain valid; **no repository-resident durable coverage was added, updated or removed** by API-REV-009.
- Repository result: focused controlled-workspace/provider `7 files / 100 tests` Pass; retained server `5 files / 29 tests` Pass; SDK/Nuxt/server/application build and validation Pass. Adjacent web passed `7 files / 102 tests`; two unchanged `runHistoryStore` mock failures remain historical `APIE2E-REPO-005` Unclear/separate.
- Changed-boundary result: Agent and Team explicit New paths survived required edits, each registered once and launched once with exact history correlation. Agent returned the exact Codex Luna response. The real Classroom team used Professor Codex Luna and Student AutoByteus DeepSeek v4 Flash, produced assignment/answer files and exchanged two recipient-name messages. Controlled registration failure retained New mode/path/error with zero launch and no fallback.
- Retained real-system result: Socratic real business turns passed in standalone and Studio; Brief Studio completed real Researcher publication, `/writer` handoff, Writer publication and two-artifact projection. Brief standalone recovered a durable record after supported watch restart. Studio explicit iframe remount and same-data restart recovered both maintained application states. Route separation and exact `73/73` parity passed.
- Environment: installed Chrome, authenticated Codex, isolated ports/data, nine supported vault credentials, and already-configured `/Users/normy/autobyteus_org/autobyteus-agents` (`7` shared agents, `50` team-local agents, `12` teams).
- Cleanup: owned ports free; marked roots/per-app runtime data/generated outputs removed; ordinary `29695` listener preserved; zero of 12 secret-like values matched 38 retained text evidence files.

#### Prior Failure Resolution

None. API-REV-008 had no unresolved current implementation failure; it remains valid only for its recorded tree.

- Canonical artifacts updated: `api-e2e-coverage-investigation.md`, `api-e2e-execution-coverage-report.md`, this revision record and `evidence/api-e2e/api-rev-009-*`.
- Prior result/confidence: **Pass / 98%** (`API-REV-008`).
- Current result/confidence: **Pass / 98%**.
- Broader validation: **Required; executed; Pass**.
- New or remaining current failure IDs: **None**.
- Recommended recipient: `/code_reviewer` for proportional test-code review, expected **Not Applicable** because API-REV-009 changed no durable test.
- Remaining risk: historical `APIE2E-REPO-005` stays separate/Unclear; live provider/account state remains externally mutable; Electron packaging/shell execution remains downstream delivery-owned.
