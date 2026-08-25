# API/E2E Execution Coverage Report

> **Current API-REV-011 result:** IR-014 changes one existing durable Agent stored-history test and no production source. Independent execution passes the changed file (8/8), the full stored/shared cohort (112/112), and static/product-grounding checks. Result: **Pass / 98%**. The synthetic CR/catalog-injection scenario remains `Out Of Scope / Non-Blocking` and was not rerun.

## Execution Round Meta

- Requirements Doc: `requirements.md`
- Investigation / Design / UI Authority: `investigation-notes.md`, `design-spec.md`, `ui-ux-spec.md`, `hierarchical-launch-configuration-behavior.md`, `team-execution-tree-v2-contract.md`.
- Solution / Architecture / Implementation Records: `solution-revision-record.md`, `design-review-report.md`, `architecture-review-revision-record.md`, `implementation-handoff.md`, `implementation-revision-record.md`.
- Code Review Report / Revision Record: `code-review-report.md`, `code-review-revision-record.md` (`CRR-019` source/architecture `Pass`, 9.6/10).
- Prior API/E2E Test Review: `api-e2e-test-review-report.md` (`CRR-016` `Not Applicable` for API-REV-008; `TR-001`–`TR-003` remain resolved).
- Coverage Investigation / Revision Record: `api-e2e-coverage-investigation.md`, `api-e2e-revision-record.md`.
- Current API/E2E Revision / Round: `API-REV-011` / 11.
- Trigger: CRR-023 complete source-review `Pass` for IR-014's producer-backed, test-only Agent whole-schema-absence correction.
- Reviewed HEAD: `5305bfa2049ed56e6ff917dbee8c17e3a8ac3a8f`.
- Prior Result: API-REV-010 `Pass` / 98% for real current-user paths.
- Current Authoritative Result: **Pass / 98%**. No blocking failure exists.

## Investigation And Coverage Decisions

- Fresh investigation completed before execution: `Yes`; see “API-REV-011 Fresh IR-014 Test-Only Coverage Investigation”.
- Changed boundary: one existing `MemberOverrideItem.spec.ts` Agent whole-schema-absence fixture; no product/runtime source changed.
- Corrected scenario: producer-backed `reasoning_effort=ultra` and `service_tier=fast`, exact once, stable order, zero event, and no input mutation.
- Existing 11-file stored/shared cohort: `Still Valid`; rerun passed unchanged apart from the IR-014 test correction.
- Durable coverage changed by IR-014: `autobyteus-web/components/workspace/config/__tests__/MemberOverrideItem.spec.ts`. API/E2E added no further test edit.
- Broader validation decision: `Not Required`. Browser/Electron/provider execution cannot improve proof of a test-fixture vocabulary correction with no production delta.
- Explicit exclusion: API-E2E-F-003 and its arbitrary CR/free-text GraphQLJSON plus page-local catalog mutation were not executed.

## API-REV-011 Current Execution

| Order | Command / Check | Result | Evidence |
| --- | --- | --- | --- |
| 1 | `pnpm test:nuxt components/workspace/config/__tests__/MemberOverrideItem.spec.ts --run` | Pass, 1 file / 8 tests | `api-e2e-evidence/api-rev-011-member-override-focused.txt` |
| 2 | `pnpm test:nuxt` with the current 11-file stored/shared cohort and `--run` | Pass, 11 files / 112 tests | `api-e2e-evidence/api-rev-011-web-stored-settings-focused.txt` |
| 3 | Diff/scope/hash/assertion/producer-backing/rejected-vocabulary audit | Pass | `api-e2e-evidence/api-rev-011-static-product-grounding-audit.txt` |
| 4 | CRR-022 Nuxt production build | Retained Pass; not rerun because IR-014 changes no production source | `implementation-evidence/code-reviewer-web-build-crr-022.txt` |

- Changed test SHA-256: `45bd06f922e3624cab000e602267872b83d52673be1cfae667329826d5c39fda`.
- Expected warnings: KaTeX quirks-mode warning and Browserslist-age notice are unchanged. The store cohort's logged termination rejection is an asserted negative-path case and the test passes.
- Environment setup/cleanup: none required; no browser, Electron, backend, provider, profile, TeamRun, workspace, or port was created.

### API-REV-011 Confidence Scorecard

| Category | Score | Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance proof | 99% | Current producer-bounded exact-history behavior is directly asserted and green. |
| Changed-boundary execution directness | 99% | The only changed file passed alone and in the full cohort. |
| Cross-boundary integration realism and mock gap | 98% | No product boundary changed; the mounted consumer is the intended durable boundary. |
| Environment/configuration/fixture fidelity | 98% | `reasoning_effort` and `service_tier` are current producer-backed keys; synthetic vocabulary is absent. |
| Failure/edge/lifecycle/recovery evidence | 98% | Whole-schema absence, exactness, order, duplication, events, and mutation are directly covered. |
| User surface/browser/desktop shell confidence | 98% | No user surface changed; API-REV-010 real-user evidence remains applicable. |
| Durable regression quality and relevance | 98% | The corrected test is narrow, stable, requirement-linked, and passes in isolation and cohort. |

- Overall current confidence: **98%** (rounded simple average).
- Applicable category below 90%: `None`.
- Current blocking failure IDs: `None`.
- Current result: **Pass**.

## Historical API-REV-009 Synthetic-Probe Execution (Non-Blocking)

## Environment And Fixture

| Item | Actual Configuration |
| --- | --- |
| Browser tool | AutoByteus `open_tab`, owned tab `4ce41d` |
| Current renderer | Nuxt 3.21.1 at `http://127.0.0.1:59124/workspace?api-rev-009=1` |
| Backend/profile | Official Electron E2E launcher; packaged backend 59049; `/private/tmp/autobyteus-api-rev-009-owned` |
| Private package | Read-only `/Users/normy/autobyteus_org/autobyteus-private-agents`; `nested-classroom-test` |
| Team identity | `Nested Classroom Test Team`, nested `/StudentStudyGroup`, `/Teacher`, `student_one`, `student_two` |
| Runtime/model | `codex_app_server` / `gpt-5.6-luna`; no provider message/turn was started |
| Stored fixture | Current schema V2 TeamRun `nested_classroom_test_team_50b47ce67a654603be2e089b7923a556` |
| Current text-schema capability | Owned page Pinia catalog only: temporary `ordinary_prompt` and `multiline_prompt`, both `type: string`; persisted snapshot unchanged |
| Isolation | User-owned PID 58117 / 29695 remained healthy; unrelated tab `b2df06` untouched |

The live Codex Luna catalog has enum fields but no free-text field. The temporary owned-page catalog injection supplies the supported current `type: string` capability needed to distinguish an exact ordinary text input from an unrepresentable persisted multiline value. It does not alter the V2 snapshot, production source, or server catalog and is recorded in the machine result.

## Repository And Environment Execution

| Order | Command / Check | Working Directory | Result | Evidence |
| --- | --- | --- | --- | --- |
| 1 | `pnpm test:nuxt` with the exact CRR-019 11-file stored/shared cohort and `--run` | `autobyteus-web` | Pass, 11 files / 113 tests | `api-e2e-evidence/api-rev-009-web-stored-settings-focused.txt` |
| 2 | `git diff --check`; IR-012 SHA-256; source/test working-tree delta; singular-owner, forbidden-authoring-dependency, alternate-renderer guards | worktree root | Pass | `api-rev-009-static-hash-audit.txt` |
| 3 | `pnpm transpile-electron` | `autobyteus-web` | Pass; generated launcher safety boundary restored | `api-rev-009-electron-transpile.txt` |
| 4 | `pnpm test:e2e:electron --skip-build --adapter playwright ... --port 59049 --data-root /tmp/autobyteus-api-rev-009-owned --hold-ms 3600000` | `autobyteus-web` | Pass; `electron-e2e-ready` | `api-rev-009-electron-backend-session.txt` |
| 5 | `BACKEND_NODE_BASE_URL=http://127.0.0.1:59049 pnpm dev --host 127.0.0.1 --port 59124` | `autobyteus-web` | Pass for selected route/journey; known non-blocking dev `#app-manifest` warnings retained | `api-rev-009-nuxt-session.txt` |
| 6 | Owned GraphQL create + V2 exact-value/hash probe | backend 59049 / owned root | Pass; schema 2 and exact root/nested/Agent configs | `api-rev-009-persisted-fixture-before.json` |
| 7 | Actual `open_tab` normal history/Settings journey + DOM/Range/layout assertions + screenshots | current Nuxt | **Fail** on CR visible whitespace; other assertions pass | browser result JSON and screenshots |
| 8 | Post-browser V2/hash/history/no-network check | owned backend/root | Pass; byte-identical tree and config | `api-rev-009-persistence-after-browser.json` |
| 9 | Terminate TeamRun; close owned tab; stop processes; ports/root/user-process/tab audit | owned resources only | Pass | `api-rev-009-terminate-result.json`, `api-rev-009-cleanup-audit.txt` |

The focused test log includes the expected negative-path console error from `agentTeamRunStore.spec.ts`; the asserted test passes. Nuxt development emitted the same known `#app-manifest` pre-transform warnings as prior rounds, but Vite/Nitro served the route and the complete browser probe executed. CRR-019 already passed the current production Nuxt build, and API/E2E changed no source.

## API-E2E-021 — Persisted Multiline Shared Settings

### Persistence And Normal Journey

- GraphQL `createAgentTeamRun` accepted complete root Team, nested Team, and exact Agent configurations with distinct ordinary and LF/CR values.
- The persisted `team_run_execution_tree.json` is schema V2. Pre-browser normalized configurations equal the request at `/`, `/Teacher`, `/StudentStudyGroup`, `/StudentStudyGroup/student_one`, and `/StudentStudyGroup/student_two`.
- The actual UI journey was: workspace `root` -> `Nested Classroom Test Team` -> the owned TeamRun -> `Teacher` -> `Edit Config`.
- The shared stored form rendered with the read-only notice, no Run or Reset, zero Team drafts, and operable outer/nested disclosures.

### Passing Observations

- All five `ordinary_prompt` values appear exactly once in disabled `input[type=text]` controls with exact values.
- LF residuals at `/`, `/Teacher`, and `/StudentStudyGroup/student_two` appear exactly once with exact code point 10, `white-space: pre-wrap`, two distinct browser Range Y coordinates, and a 32px text box.
- CR residuals at `/StudentStudyGroup` and `/StudentStudyGroup/student_one` appear exactly once and preserve exact DOM code point 13; no duplicate current input exists.
- Browser interaction emitted no recorded request after instrumentation. The TeamRun config store has no draft/selected draft.
- Post-browser V2 SHA-256 equals the pre-browser value: `367491ac21c2cceced68921b6a764cb2475241c6fad0e91212d53f0aa688eb2d`.

### API-E2E-F-003 — Historical Synthetic-Probe Observation (Out Of Scope / Non-Blocking)

- Expected: every persisted unrepresentable CR/LF string is both exact and visibly whitespace-preserving in the historical residual, as required by R-044 / AC-038 and claimed by IR-012 / CRR-019.
- Observed LF: correct two-line rendering.
- Observed CR: exact DOM retention but **one visual line**. `/StudentStudyGroup` renders `NESTED firstNESTED second`; its Range text fragments share one Y coordinate and the `<dd>` is 16px high. `/StudentStudyGroup/student_one` has the same one-line outcome.
- Production owner implicated: `HistoricalModelConfigFallback.vue` relies on `whitespace-pre-wrap` around an exact CR text node. In the actual browser, that CSS does not create visible separation for isolated CR.
- Evidence:
  - `api-e2e-evidence/api-rev-009-browser-persisted-multiline-result.json`
  - `api-e2e-evidence/api-rev-009-stored-multiline-desktop.png` (LF pass)
  - `api-e2e-evidence/api-rev-009-stored-multiline-nested-desktop.png` (CR failure)
  - `api-e2e-evidence/api-rev-009-persistence-after-browser.json`
- Preliminary technical origin: presentation behavior inside the synthetic generic string-schema probe. Persistence/API/environment are exonerated by exact pre/post V2 and DOM evidence. **Applicability correction:** because the current catalog does not emit the injected fields, this is not a settled defect in a normal current user path and must be clarified before implementation routing.

## API-REV-009 Synthetic-Probe Scorecard (Historical)

| Category | Score | Evidence / Limitation |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 82% | The exact requirement was executed but fails for isolated CR visibility. |
| Changed-boundary execution directness | 99% | Real GraphQLJSON, V2 disk, history, shared form, DOM, and browser layout were observed. |
| Cross-boundary integration realism and mock gap | 96% | Owned nested TeamRun closes the principal mock gap; temporary current-catalog property injection is bounded and disclosed. |
| Environment, configuration, identity, and fixture fidelity | 94% | Official launcher, private nested definition, Codex Luna identity, owned profile, and current Nuxt were used. |
| Failure, edge-case, lifecycle, and recovery evidence | 96% | Ordinary, LF, CR, exactness, duplication, mutation, persistence, termination, and cleanup were checked. |
| User-surface, browser, and desktop-shell confidence | 82% | Actual `open_tab` conclusively demonstrates the critical CR display defect; native shell owners are unchanged/out of scope. |
| Durable regression coverage quality and relevance | 75% | Existing tests cover classification/DOM/class but passed despite the browser-visible CR defect. |

- Historical synthetic-probe confidence: **89%** (rounded simple average under the invalid blocking-scope premise).
- Applicable categories below 90%: requirement proof, user-surface confidence, durable regression quality.
- Critical acceptance criterion proven passing: `No`.
- Default clean target met: `No`.
- API-REV-009 raw synthetic-probe result: `Fail`; current API-REV-010 user-path result: **Pass**.

## API-REV-010 Real-User-Path Reclassification

- The user made the applicability rule explicit: a blocking API/E2E scenario must be producible through a real current user workflow.
- The current Codex Luna catalog exposes no free-text setting and cannot produce `ordinary_prompt` or `multiline_prompt`. API/E2E invented both names, inserted arbitrary GraphQLJSON keys, and temporarily injected matching page-local catalog properties. That is a robustness probe, not a current product journey.
- The raw CR rendering observation is retained for engineering context but classified `Out Of Scope / Non-Blocking`. It does not authorize an implementation change and is not a failed acceptance criterion.
- No rerun was needed for this classification-only correction: no production source, durable test, catalog, retained TeamRun, environment, or real evidence changed.
- Current reachable-user evidence remains green: the current stored Settings route and current emitted Codex controls are read-only and non-mutating; the retained API-REV-006 actual packaged flow proves distinct root/nested workspaces, Codex Luna at root, AutoByteus DeepSeek Flash for the subteam, exact V2 disk projection, a real subteam message, and a real delegated task through submission, review, and acceptance.

### Current Confidence Scorecard

| Category | Score | Current real-user-path basis |
| --- | ---: | --- |
| Requirement and acceptance-criteria proof | 99% | Every applicable current-user acceptance boundary has direct repository or realistic-system evidence; invented fields are excluded. |
| Changed-boundary execution directness | 98% | Current stored Settings consumers and the actual route were exercised; unchanged launch/runtime owners retain direct prior proof. |
| Cross-boundary integration realism and mock gap | 99% | Real package, GraphQL, V2 disk, browser, provider messaging, and delegated-task evidence cover the material boundaries. |
| Environment, configuration, identity, and fixture fidelity | 99% | Owned profile/backend, private nested classroom package, real supported model/provider identities, and isolated cleanup were used. |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | Current workspace recovery, restart/restore, migration, stale repair, no-mutation, failure retention, and cleanup are covered. |
| User-surface, browser, and desktop-shell confidence | 98% | Actual `open_tab` journeys cover the web-equivalent desktop surface; unchanged shell-only behavior remains out of scope. |
| Durable regression coverage quality and relevance | 96% | Current durable hierarchy, migration, workspace, stored Settings, and application cohorts remain requirement-linked and green. |

- Overall current confidence: **98%** (rounded simple average).
- Applicable category below 90%: `None`.
- Current blocking failure IDs: `None`.
- Current result: **Pass**.

## Durable Coverage And Cleanup

- Repository-resident durable test added/updated/removed: `None`.
- Product source changed by API/E2E: `None`.
- Temporary probe/evidence only: owned GraphQL fixture, catalog capability injection, DOM/Range result, screenshots, logs.
- Cleanup result: TeamRun terminated; API-REV-009 tab closed; ports 59049/59124 free; owned root removed; private package/source environment unchanged; user-owned 29695 healthy; unrelated existing tab retained.

## Outcome Routing

- Current blocking failure IDs: `None`. Historical `API-E2E-F-003` is `Out Of Scope / Non-Blocking Robustness Observation`.
- Recommended owner: none for the synthetic CR observation; no implementation or design correction is requested.
- Required route: successful cumulative package to `/code_reviewer` for proportional test-code review of the IR-014 `MemberOverrideItem.spec.ts` durable delta. Do not route directly to delivery from API/E2E.
- Synthetic robustness note only: a future product that intentionally publishes a free-text field may choose to define and test isolated-CR presentation then. No current correction or rerun is requested.
