# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-spec.md`
- Supplemental Task Artifacts:
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/hierarchical-launch-configuration-behavior.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/team-execution-tree-v2-contract.md`
  - `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/recovery-audit.md`
- Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/solution-revision-record.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/design-review-report.md`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/architecture-review-revision-record.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/implementation-revision-record.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-report.md`
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/code-review-revision-record.md`
- Delivery Revision Record: N/A
- Relevant Delivery Revision IDs: N/A
- Coverage Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-coverage-investigation.md`
- API/E2E Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-004`
- Current Execution Round: 4
- Trigger: CRR-005 repeat implementation-source `Pass` returned IR-003's correction for `CR-005` / `API-E2E-F-001` to the unchanged strengthened API-REV-003 regression boundary.
- Prior Round Reviewed: `API-REV-003` — `Fail` / `89%`; TR-001 passed 7/7 while TR-002's representative binding assertion exposed the source defect. CRR-004 attributed it to released `memberTree` arrays being skipped; IR-003 corrected the traversal; CRR-005 passed the source and confirmed both durable test hashes were unchanged.
- Latest Authoritative Round: This file, round 4. The current result is `Pass` / `99%`: build passed, hierarchy lifecycle passed 7/7, production upgrade passed 4/4 with exact binding preservation, and cleanup/static checks passed.

## Investigation And Execution Basis

- Coverage investigation artifact: `api-e2e-coverage-investigation.md`
- Investigation completed before durable coverage changes or final execution: `Yes`
- Investigation plan followed: `Yes`. API-REV-004 rechecked IR-003/CRR-005 and both durable hashes before execution, then ran the current build and the two preserved strengthened E2E boundaries.
- Existing coverage decisions revised during execution, with evidence: both API-REV-003 durable tests are now `Still Valid`; neither changed in API-REV-004. TR-001 again passed 7/7 with exact complete lifecycle projections. TR-002 passed 4/4 and directly preserved binding, task, handoff, distinct coordinators, nullable/non-null configurations, and complete Agent snapshots.
- Reroute required before or during execution: `No`. The successful cumulative package requires formal proportional test-code review by `/code_reviewer`, not failure-origin review.
- Notes: API-REV-002's real browser/provider evidence remains valid. API-REV-004 repeated no private browser journey because IR-003 changes only predecessor migration binding extraction and the built-server production-upgrade E2E is the direct real boundary.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Approved persisted-data transition followed without unnecessary migration or version-specific runtime fallback: `Yes` — the isolated forward-only startup migration now preserves the representative binding and all other asserted facts without a normal-runtime legacy path.
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: Pending the successful proportional-review handoff recorded at the end of this round.

## Changed Boundary And Evidence Matrix

| Scenario ID | Behavior / Requirement / Acceptance-Criteria IDs | Changed Boundary | Execution Surface / Mode | Evidence Type | Result | Evidence / Artifact |
| --- | --- | --- | --- | --- | --- | --- |
| API-E2E-003 | Full nested create/persist/terminate/restart/resume/restore; R-021–R-027, AC-016–AC-020 | GraphQL -> service/planner -> filesystem V2 -> process lifecycle | Isolated built server E2E | Durable / Live | Pass | `api-e2e-evidence/api-rev-004-hierarchical-graphql-lifecycle-e2e.txt` — 7/7 with complete exact configuration trees |
| API-E2E-004 | Released V1 -> final V2 before admission; R-028–R-037, AC-021–AC-030 | Startup migration, ledger, exact direct-coordinator reconstruction, preservation, restart/retry | Production-upgrade built-server E2E | Durable / Live | Pass | `api-e2e-evidence/api-rev-004-v2-production-upgrade-full.txt` — 4/4; exact non-null binding and all enriched preservation assertions pass |
| API-E2E-005 | Hierarchy authoring, inheritance/reset, complete browser request, workspace recovery, responsiveness; R-001–R-027, R-038–R-041, AC-001–AC-020, AC-031–AC-034 | Integrated Nuxt state/DOM -> GraphQL -> persistence | Independent Chrome journey | Temporary / Browser | Pass | `api-e2e-evidence/hierarchical-browser-probe.txt` plus desktop/narrow/recovery screenshots |
| API-E2E-006 | Current complete payloads for provider-gated mixed runtime scenarios; R-021–R-027, R-032–R-036 | External provider runtime combinations | Repository discovery/compile under explicit capability gates | Durable | Not Tested | `provider-gated-runtime-e2e.txt`: 2 scenarios discovered and skipped because live flags were unset; no false pass claim |
| API-E2E-008 | Missing, blank, or unsupported Team/Agent runtimes reject before workspace/run side effects; R-017/R-022, AC-008/AC-017, CR-001 | GraphQL admission and side-effect boundary | Isolated built server E2E | Durable / Live | Pass | Six negative cases within `hierarchical-graphql-lifecycle-e2e.txt` |
| API-E2E-010 | Current root/full service entries, strict runtime labels, V2 Team defaults and restore | Service/manager/package lifecycle | Server integration suite | Durable | Pass | `updated-integration-coverage.txt` — 3 files/17 tests; full directory 7 files/37 tests |
| API-E2E-012 | Complete private-package import and real nested classroom delegation on Codex/Luna | Packaged Electron shell/backend -> browser UI -> WebSockets -> Codex -> task/message lifecycle -> V2 history | Actual isolated packaged Electron, `open_tab`, real Codex | Live / Browser / Desktop | Pass | `api-e2e-evidence/electron-open-tab-nested-classroom-evidence.md` and linked screenshots/API files |
| API-E2E-013 | Explicit nested-Team AutoByteus/DeepSeek override, empty Agent overrides, actual provider execution, ordinary Team message, formal Team task acceptance, second inherited Agent, exact V2 disk/history | Packaged Electron -> browser config -> GraphQL/V2 filesystem -> Codex root -> AutoByteus/DeepSeek nested Agents -> message/task/token-usage lifecycle | Actual isolated packaged Electron, `open_tab`, imported isolated secrets, real Codex and DeepSeek | Live / Browser / Desktop / Provider | Pass | `api-e2e-evidence/electron-open-tab-deepseek-subteam-evidence.md` and linked raw evidence |

## Additional Repository Coverage Execution

These commands record the later user-requested packaged desktop/private-package extension and the subsequent CRR-003/IR-003 API/E2E rework rounds. Rows 1–8 are the realistic package/provider extension; rows 9–14 are the durable-coverage failure and successful correction reruns.

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence / Output Path |
| --- | --- | --- | --- | --- | --- |
| 1 | `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --adapter playwright --hold-ms 1200000` | `autobyteus-web` | Documented build-and-launch path | Fail before launch: generic `build:electron` selected ALL and Darwin rejected native Linux packaging | `api-e2e-evidence/packaged-electron-launch.txt` |
| 2 | `env -u ELECTRON_RUN_AS_NODE pnpm build:electron:mac` | `autobyteus-web` | Exact current-worktree host package, bundled server/resources/native modules | Pass | `api-e2e-evidence/packaged-electron-mac-build.txt` |
| 3 | `env -u ELECTRON_RUN_AS_NODE pnpm test:e2e:electron --skip-build --adapter playwright --executable <current .app executable> --hold-ms 1200000` | `autobyteus-web`; owned port/root | Official isolated E2E profile, actual shell, owned packaged backend readiness | Pass | `api-e2e-evidence/packaged-electron-live-session.txt`, `packaged-electron-ready-verification.txt` |
| 4 | Owned Nuxt renderer plus AutoByteus `open_tab` | Nuxt port 53612 -> packaged backend 53559; explicit owned WS endpoints; `NUXT_TEST=true` only for app-manifest workaround | UI package import, hierarchical configuration, real message/task lifecycle | Pass | `electron-open-tab-nested-classroom-evidence.md`, browser screenshots, API JSON evidence |
| 5 | `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:<owned production.db>` (dry run, then confirmed import) | API-REV-002 owned root only; no overwrite; no secret values recorded | Real DeepSeek/AutoByteus credential availability in isolated packaged backend | Pass — 9 configured, 0 skipped/replaced | `electron-deepseek-secret-import-dry-run.txt`, `electron-deepseek-secret-import-confirmed.txt` |
| 6 | Official `--skip-build --adapter playwright` launcher | packaged backend 54334; owned root `autobyteus-e2e-Ymjjtk` | Current package isolation and real backend | Pass | `electron-deepseek-live-session.txt` |
| 7 | Owned Nuxt renderer + AutoByteus `open_tab` tab `edcf5a` | Nuxt 54427 -> packaged backend 54334; root Codex/Luna; nested AutoByteus/DeepSeek | Explicit heterogeneous config, both message paths, formal task acceptance, real provider usage | Pass | `electron-open-tab-deepseek-subteam-evidence.md`, PNG/JSON/log evidence |
| 8 | GraphQL, exact V2 filesystem, token-usage DB, UI termination, cleanup audit | API-REV-002 owned data only | Resolved hierarchy, actual model identity/tokens, lifecycle persistence, ownership cleanup | Pass | `electron-deepseek-{final-api-before-termination,terminated-api,terminated-disk-v2,token-usage}.json`, cleanup audits |
| 9 | `pnpm run build:full` | `autobyteus-server-ts` | Current built-server executable after CRR-003 local test edits | Pass | `api-rev-003-server-build-full.txt` |
| 10 | `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts`; isolated real servers/databases/runtime roots | TR-001 exact Team/Agent disk/API/restart/restore plus strict runtime negatives | Pass — 7/7 | `api-rev-003-hierarchical-graphql-lifecycle-e2e-final.txt` |
| 11 | `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | `autobyteus-server-ts`; isolated released-shape production startup profiles | TR-002 direct coordinators, binding/task/handoff/Agent preservation, startup/retry | Fail — 2/4; both representative cohorts lose application binding | `api-rev-003-v2-production-upgrade-full.txt`, `api-rev-003-migration-binding-failure.md` |
| 12 | `pnpm run build:full` | `autobyteus-server-ts` | Current IR-003 built-server output and sanitized built-in bootstrap | Pass | `api-rev-004-server-build-full.txt` |
| 13 | `pnpm exec vitest run tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts --no-watch` | `autobyteus-server-ts`; isolated real servers/databases/runtime roots | Unchanged TR-001 exact Team/Agent lifecycle and strict runtime negatives | Pass — 7/7 | `api-rev-004-hierarchical-graphql-lifecycle-e2e.txt` |
| 14 | `pnpm exec vitest run tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | `autobyteus-server-ts`; isolated released-shape production startup profiles | Unchanged TR-002 exact binding/task/handoff/direct-coordinator/Agent preservation, startup/retry | Pass — 4/4 | `api-rev-004-v2-production-upgrade-full.txt`, `api-rev-004-migration-binding-resolution.md` |

## API-REV-002 Validation Confidence Scorecard (Historical Prior Round)

| Confidence Category | Post-Repository Score | Final Score | Change | New / Final Supporting Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 96% | 99% | +3 | Independent browser criteria plus inherited and explicitly customized nested-Team real runs, both nested Agents, exact V2 and lifecycle | Dynamic post-launch Team mutation remains explicitly out of scope |
| Changed-boundary execution directness | 97% | 99% | +2 | Real form intent, empty Agent overrides, GraphQL/history, exact disk V2, actual tasks/messages/token records | None material for the approved changed boundary |
| Cross-boundary integration realism and mock gap | 94% | 99% | +5 | Actual package/backend, Nuxt HTTP/WS, `open_tab`, Codex root, AutoByteus/DeepSeek nested agents, tasks, messages, filesystem, database | Exhaustive unrelated provider permutations remain capability-gated |
| Environment, configuration, identity, and fixture fidelity | 96% | 99% | +3 | Complete private package, official isolated profile, documented isolated secret import, exact live catalogs/models, owned ports/root | Nuxt renderer used the test flag solely to disable an app-manifest dev-resolution issue |
| Failure, edge-case, lifecycle, and recovery evidence | 97% | 99% | +2 | Prior negatives/recovery plus exact accepted heterogeneous task, two-way Team messages, both nested Agents, termination/history | Generic launcher build mismatch remains a low-risk setup/documentation issue |
| User-surface, browser, and desktop-shell confidence | 88% | 99% | +11 | Independent Chrome plus two actual-package open-tab journeys; explicit nested customization and mixed-provider lifecycle visible in UI | Native IPC/window-only features were unchanged and not directly exercised |
| Durable regression coverage quality and relevance | 96% | 96% | 0 | Current integration/lifecycle/migration/API negatives remain durable and passed; temporary private fixture probe stayed out of public suite | Changed durable tests still require proportional code review |

- Overall post-repository confidence: 95% rounded from 94.9%.
- Overall final confidence: 99% rounded from 98.6%.
- Calculation method: simple average across seven applicable categories, rounded to the nearest whole percent; weak-category and critical-criterion gates applied separately.
- Confidence change produced by broader validation: +4 percentage points overall and +11 in the previously sub-gate user/browser/desktop category.
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: unrelated generic Electron auto-build host mismatch; exhaustive unrelated-provider permutations not run; unchanged native IPC/window-only behavior was not targeted; known historical full-server baseline/standalone-typecheck limits remain upstream residuals rather than failures of this result.

## API-REV-003 Validation Confidence Scorecard (Historical Failed Round)

| Confidence Category | Current Score | Evidence | Current Limitation / Failure |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 50% | TR-001 now directly proves complete Team/Agent lifecycle values; all API-REV-002 browser/provider criteria remain passed | Critical AC-030 fails: representative V1 application binding becomes null in final V2 |
| Changed-boundary execution directness | 95% | Actual built startup, real SQLite/filesystem, persisted final JSON, GraphQL lifecycle | Execution stops at the first preservation mismatch before later enriched TR-002 assertions can all pass |
| Cross-boundary integration realism and mock gap | 95% | Built server, startup registry, prerequisite/V2 migrations, disk and GraphQL, plus prior real package/browser/provider journeys | Current migration failure remains unresolved |
| Environment, configuration, identity, and fixture fidelity | 95% | Isolated released-shape cohort with distinct coordinators, non-empty binding/handoff/task, exact Agent snapshots | Fixture exposed rather than closed the implementation defect |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | Deterministic reproduction in both clean and mixed-warning cohorts; cleanup/retry cases and TR-001 negatives pass | No uncertainty about the observed null binding |
| User-surface, browser, and desktop-shell confidence | 99% | API-E2E-012/013 remain passed, including real `open_tab`, Codex/Luna, AutoByteus/DeepSeek, tasks/messages and exact V2 | Migration binding is not exercised by those new-run journeys |
| Durable regression coverage quality and relevance | 90% | TR-001 strengthened and 7/7; TR-002 now has representative direct-coordinator/binding/task/handoff/Agent assertions and catches the defect | TR-002 cannot pass or complete repeat proportional review until implementation is corrected |

- Overall current validation confidence: `89%` (simple average, rounded from 89.0%).
- Every critical acceptance criterion directly proven: `No` — AC-030 is directly disproven for application binding preservation.
- Any current applicable category below `90%`: `Yes` — requirement/acceptance proof is 50% because a critical criterion fails.
- Default clean target met: `No`.
- Current result: `Fail`.
- Prior successful realistic-browser evidence invalidated: `No`; the failure is migration-specific.
- New failure ID: `API-E2E-F-001`.

## API-REV-004 Validation Confidence Scorecard (Mandatory, Current)

| Confidence Category | Current Score | Evidence | Residual Uncertainty |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 99% | API-E2E-003 passes 7/7 and API-E2E-004 passes 4/4; AC-030's exact binding plus task/handoff/direct-coordinator/complete-Agent preservation now pass; prior UI/provider criteria remain passed | Dynamic post-launch Team mutation remains explicitly out of scope |
| Changed-boundary execution directness | 99% | IR-003 was built, then exercised through actual server startup, registered migrations, filesystem packages, SQLite/index admission, GraphQL, restart, retry, and collision handling | None material for the implementation correction |
| Cross-boundary integration realism and mock gap | 99% | Built server, released V1 input, final V2 disk state, current catalog/history, restart and recovery are real; prior packaged Electron/provider journeys remain real | Exhaustive unrelated provider permutations remain capability-gated |
| Environment, configuration, identity, and fixture fidelity | 99% | Isolated released-shape cohorts use distinct coordinators, nullable/non-null configs, binding, accepted task, handoff, complete snapshots, owned databases and runtime roots | No material fixture gap remains for CR-005 |
| Failure, edge-case, lifecycle, and recovery evidence | 99% | The exact API-REV-003 failure is resolved in both prior failing cohorts; warning, retry, overlap, strict-runtime, restart and restore cases pass | None material |
| User-surface, browser, and desktop-shell confidence | 99% | API-E2E-012/013 remain valid: actual packaged Electron, `open_tab`, Codex/Luna root, AutoByteus/DeepSeek nested Team, real messages/tasks/tokens and termination | Unchanged native IPC/window-only features remain outside the changed boundary |
| Durable regression coverage quality and relevance | 98% | Both strengthened files remain hash-identical, all 11 focused E2E cases pass, and the exact formerly failing assertion now protects the correction | Formal proportional closure of TR-001/TR-002 is the next procedural gate |

- Overall current validation confidence: `99%` (simple average, rounded from 98.9%).
- Every critical acceptance criterion directly proven: `Yes`, including AC-030.
- Any current applicable category below `90%`: `No`.
- Default clean target met: `Yes`.
- Current result: `Pass`.
- Prior failure resolution: `API-E2E-F-001` / CR-005 resolved at the unchanged strengthened boundary.
- Durable-test review status: TR-001/TR-002 await formal proportional review; this does not weaken the observed execution result.

## API-REV-004 Broader Validation Decision

- Decision: `Not Required`.
- Rationale: IR-003 is confined to predecessor startup migration binding extraction. The 4/4 built-server production-upgrade file is the direct real boundary and covers the exact failed cohorts plus warning/retry/collision lifecycle. The 7/7 hierarchy lifecycle file provides a fresh unchanged adjacent check. Repeating API-E2E-012/013 would exercise new-run browser/provider behavior rather than predecessor migration and would not materially increase confidence.
- Required next action: formal proportional test-code review by `/code_reviewer`; do not route to delivery before that result passes.

## API-REV-003 Broader Validation Decision

- Decision: `Not Required` for this local-fix round.
- Rationale: CRR-003 returned deterministic durable assertions and fixture fidelity. The built startup E2E is the direct migration boundary, and it produced a current product failure. Repeating a new-run private browser/provider journey cannot close or reinterpret missing V1 binding preservation.
- Required next action: focused failure-origin review by `/code_reviewer`, followed by implementation correction and return to `/api_e2e_engineer` for the full four-scenario production-upgrade rerun.

## Broader Validation Decision And Execution

- Decision and selected execution mode from the coverage investigation: `Required` — built `Live API`, process `Lifecycle`, independent `Browser`, and explicit user-requested packaged `Electron` with real Codex plus AutoByteus/DeepSeek.
- Material deviation from the planned mode or rationale: None in API-REV-002. The current package was safely reused, and the documented importer supplied the requested provider credentials only to the isolated profile.
- Confidence gap or residual risk actually addressed: the prior real journey proved inherited Codex/Luna but not a different nested-Team provider. API-REV-002 directly proved explicit nested scope intent, root isolation, both nested Agent resolutions, actual DeepSeek execution, Team-address messaging, Team delegation/submission/review, exact disk V2, and safe credential/data cleanup.
- If `Not Required`: N/A
- If `Blocked`: N/A
- Startup order, commands, and readiness results: record ordinary listener; official current-package E2E launch -> backend 54334 / owned root; dry-run and confirm isolated secret import; query AutoByteus catalog; start owned Nuxt 54427 with all WS endpoints bound to 54334; `open_tab` tab `edcf5a`; configure root/nested scopes; launch; message Team, delegate Team task, exercise second nested Agent; inspect UI/API/disk/token records; terminate; close tab; stop owned processes; verify and remove only owned root.
- Environment choices that materially affected the run: E2E profile; exact current-worktree `.app`; complete local private package; existing local Codex identity; source `.env` read only by the documented importer; exact `gpt-5.6-luna` and `deepseek-v4-flash`; isolated Temp Workspace; inherited auto-approve; Nuxt test flag only for app-manifest disablement.
- Seed data, fixtures, identities, authentication, permissions, or session state: no app authentication boundary. Package source remained read-only. Provider keys were encrypted into only the isolated database, never printed, and deleted with the owned root.

| Scenario / Journey Step | Expected Observable Result | Actual Observable Result | DOM / Screenshot / Log / API / Process Evidence | Result |
| --- | --- | --- | --- | --- |
| Independent hierarchy browser | Root/nested UI, reset/inheritance, recovery, responsive layout, complete API request | All passed; 0 page errors and 0 console errors | `hierarchical-browser-probe.txt`; three screenshots | Pass |
| Package/shell startup isolation | Current package starts on non-production port/root without touching 29695 | Port 53559/root owned; ordinary PID 33760 stayed healthy | `packaged-electron-live-session.txt`, ready/cleanup audits | Pass |
| Private package import | Whole exact path is linked through normal Settings surface | UI success; GraphQL 40 shared/25 team-local/9 Teams; source unchanged | package-import PNG/JSON/stat | Pass |
| Codex/Luna hierarchy | Root selection expands to nested Team and all Agents and persists exact V2 | Root/nested defaults and three Agent snapshots all `codex_app_server` / `gpt-5.6-luna` | launch-config PNG, catalog JSON, launched-history JSON | Pass |
| Nested task lifecycle | Teacher delegates to `/StudentStudyGroup`; exact token submitted and accepted | Required task accepted with submission and accept review; exact UI confirmation | task panel/success PNGs, task/final API JSON | Pass |
| Nested ordinary message | Student coordinator can message Teacher by canonical route | `student_one -> Teacher` delivered `NESTED_CLASSROOM_OK` | final API JSON and UI success screenshot | Pass |
| Termination/settlement | Active run stops, history stays V2, dynamic work settles | Run inactive; required task remains accepted; extra model-created subtask interrupted; all dynamic nodes settled | terminated API/persisted files | Pass |
| Cleanup/coexistence | Owned processes/root/tab removed; user app unchanged | Ports 53559/53612 free, root absent, tabs empty, PID 33760 still healthy | `electron-post-cleanup-verification.txt` | Pass |
| Explicit nested-Team provider customization | Root stays Codex/Luna while `/StudentStudyGroup` is AutoByteus/DeepSeek and Agents remain Global default | Live draft had one Team override, empty Agent overrides, no readiness issue; rendered form showed Customized Runtime/Model | `electron-browser-deepseek-subteam-config.png`, API-E2E-013 summary | Pass |
| Exact heterogeneous V2 hierarchy | Root/Teacher Codex/Luna; nested Team and both nested Agents AutoByteus/DeepSeek | GraphQL and exact `schemaVersion: 2` file matched before and after termination | `electron-deepseek-{launched-history,launched-disk-v2,terminated-disk-v2}.json` | Pass |
| Real nested provider execution | Both configured nested Agents and the dynamic task coordinator actually execute DeepSeek Flash | `DeepSeekLLM` instantiated; non-zero token records name runtime/provider/model for Student One, task Student One, and Student Two | `electron-deepseek-provider-log-excerpts.txt`, `electron-deepseek-token-usage.json` | Pass |
| Ordinary Team message | Teacher sends to `/StudentStudyGroup`; nested coordinator returns exact marker | Persisted two-way messages and UI showed `SUBTEAM_DEEPSEEK_MESSAGE_OK` | messages PNG and communication JSON | Pass |
| Formal Team task | Teacher delegates to `/StudentStudyGroup`; exact submission is accepted | Task accepted with one exact submission, one accept review, and settled dynamic execution | task/message PNG, task records, terminated V2 | Pass |
| Second inherited Agent | Teacher addresses `/StudentStudyGroup/student_two`; Agent returns exact marker using inherited scope | UI/persistence returned `SUBTEAM_SECOND_MEMBER_OK`; DeepSeek token record present | messages PNG, communication/token JSON | Pass |
| API-REV-002 termination/cleanup | Mixed run becomes inactive without losing hierarchy/task/messages and only owned credentials/data are removed | All Agents offline; history intact; ports/root/tab absent; source `.env`, package, ordinary app unchanged | terminated API/disk and cleanup audits | Pass |

## Desktop Application Validation

- Validation approach executed and any deviation from the investigation: Built the current macOS arm64 package, launched the actual packaged app under the official isolated E2E profile, then used `open_tab` on the same renderer code against the packaged app's owned backend for observable DOM interaction. This explicit desktop run superseded the original no-shell-needed decision only because the user requested it.
- Browser-tested web-equivalent behavior and evidence: package import, Team selection, inherited and explicitly customized nested runtime/model states, launch readiness, Codex root plus DeepSeek nested execution, Team and Agent messaging, formal Team task panel, canonical hierarchy, termination.
- Shell-specific or lifecycle behavior and evidence: current `.app` and bundled server/native resources built; actual Electron/Playwright adapter reached first window and backend readiness; updater-disabled E2E isolation root/port used; owned process tree stopped.
- Effect on any already-running desktop application: `None` — PID 33760/port 29695 was never reused/stopped and remained healthy.
- Behavior not directly proven and confidence consequence: unchanged native IPC/window-management features were not targeted. No material confidence deduction for this renderer/backend change.

## Platform / Runtime Targets

- Operating system / platform: macOS 26.5.2 (25F84), arm64.
- Runtime and relevant framework versions: Node 22.23.1, pnpm 10.28.2, Electron 42.4.1, Codex CLI 0.149.1.
- Browser / engine and version: Google Chrome 151.0.7922.170 for the independent probe; AutoByteus `open_tab` for the explicit real journey; official Electron Playwright adapter for shell launch.
- Device, viewport, locale, timezone, or accessibility settings: independent browser covered desktop 1440x1100 and narrow 900px; explicit open-tab screenshots were 1916x1476; local timezone Europe/Berlin; disclosure semantic state was asserted.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved persisted-data decision: `Migration Required`
- Representative existing data exercised: released V1 nested package with tasks, handoffs, binding, heterogeneous Agent snapshots, nullable nested coordinator `llmConfig`, valid and invalid cohorts.
- Direct-use, discard/rebuild, or migration result and evidence: registered startup reached final V2 and preserved the exact non-null application binding plus every inspected task, handoff, communication, Team and Agent fact in both representative supported cohorts.
- Migration completion/recovery evidence: prerequisite ordering, +4 ledger progression, direct Team coordinators, root non-null and nested null coordinator config, binding, task, handoff, warning/collision/retry, GraphQL admission, new work, relaunch, and restart behavior all passed 4/4.
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual persisted-data failure/risk: None material. The historical API-REV-003 binding failure is retained as evidence and directly resolved by the unchanged API-REV-004 regression assertion.

## Tests Implemented Or Updated

| Path / Scenario | Change | Requirement / Boundary | Execution Result | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/agent-team-runs/hierarchical-team-run-config-graphql.e2e.test.ts` | Added in API-REV-001; strengthened in API-REV-003; unchanged in API-REV-004 | Full GraphQL/V2/lifecycle, complete exact Team/Agent values, and strict pre-side-effect negatives | Pass — 7/7 | TR-001 corrected; pending formal proportional closure |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts` | Updated in API-REV-001/API-REV-003; unchanged in API-REV-004 | Final V2 migration/admission/restart/retry plus representative direct coordinators, binding/task/handoff/Agent preservation | Pass — 4/4 | Exact previously failing binding assertion now passes; TR-002 pending formal proportional closure |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-team-runtime-graphql.e2e.test.ts` | Updated | Required Team config and exact address | Discovered; provider-gated skip | Current contract compiles |
| `autobyteus-server-ts/tests/e2e/runtime/nested-mixed-team-runtime-graphql.e2e.test.ts` | Updated | Root/nested Team configs | Discovered; provider-gated skip | Current contract compiles |
| `autobyteus-server-ts/tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts` | Updated | V2 Team defaults/current runtimes/restore | Pass | Included in 17 focused / 37 directory tests |
| `autobyteus-server-ts/tests/integration/agent-team-execution/team-run-service.integration.test.ts` | Updated | Current root/full hierarchy entries and V2 | Pass | Removed stale helper usage |
| `autobyteus-server-ts/tests/unit/run-history/services/team-run-history-service.test.ts` | Updated | Current/V2 terminology | Pass | No semantic compatibility assertion retained |

## Tests Removed As Stale Or Obsolete

None. Useful lifecycle scenarios were updated rather than removed.

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed in API-REV-004: `No` — both API-REV-003 files remained byte-for-byte unchanged at the CRR-005 hashes.
- Repository-resident durable coverage added, updated, or removed in API-REV-003: `Yes` — two existing cumulative paths were strengthened; no file added/removed in that round.
- Cumulative paths added or updated across API-REV-001/API-REV-003: the seven paths listed above.
- Paths removed: None.
- Added or updated paths attached for review: `Yes`; the two API-REV-003 paths and API-REV-004 successful resolution evidence must accompany formal proportional review.
- Diff or repository evidence supplied for removed paths: N/A.

## Other Execution Artifacts

| Artifact Path | Type / Purpose | Retained Or Temporary | Notes |
| --- | --- | --- | --- |
| `api-e2e-evidence/hierarchical-browser-probe.txt` | Independent browser semantic result | Retained evidence | 0 page/console errors |
| `api-e2e-evidence/hierarchical-browser-{desktop,narrow,workspace-recovery}.png` | Browser visual support | Retained evidence | Visually inspected |
| `api-e2e-evidence/electron-open-tab-nested-classroom-evidence.md` | Real packaged/private/Codex journey summary | Retained evidence | Links raw evidence |
| `api-e2e-evidence/electron-browser-*.png` | Import/config/success/hierarchy/task UI | Retained evidence | Task panel visibly shows accepted exact token |
| `api-e2e-evidence/electron-nested-classroom-*.json` | History, V2, task, messages, termination | Retained evidence | Captured before root cleanup |
| `api-e2e-evidence/packaged-electron-*.txt` | Build/session/readiness/Nuxt logs | Retained evidence | Includes generic build failure and successful workaround |
| `api-e2e-evidence/electron-*-cleanup-verification.txt` | Ownership/coexistence/cleanup | Retained evidence | Ordinary PID remained unchanged |
| `api-e2e-evidence/electron-open-tab-deepseek-subteam-evidence.md` | API-E2E-013 authoritative real mixed-provider summary | Retained evidence | Links exact config, disk, provider, task/message, termination, and cleanup evidence |
| `api-e2e-evidence/electron-browser-deepseek-*.png` | Explicit subteam config, accepted task/messages, termination UI | Retained evidence | Supporting screenshots; semantic/API/disk evidence is authoritative |
| `api-e2e-evidence/electron-deepseek-*.json` | Catalog, V2 history/disk, task/messages, provider token identity, termination | Retained evidence | Captured before isolated root cleanup; contains no secrets |
| `api-e2e-evidence/api-rev-003-server-build-full.txt` | Current built-server preparation | Retained evidence | Pass |
| `api-e2e-evidence/api-rev-003-hierarchical-graphql-lifecycle-e2e-final.txt` | TR-001 exact hierarchy lifecycle rerun | Retained evidence | Pass — 7/7 |
| `api-e2e-evidence/api-rev-003-v2-production-upgrade-full.txt` | TR-002 representative production-upgrade rerun | Retained failure evidence | Fail — 2/4; application binding lost in two cohorts |
| `api-e2e-evidence/api-rev-003-migration-binding-failure.md` | Focused expected/observed/source-correlation package | Retained failure evidence | API-E2E-F-001 |
| `api-e2e-evidence/api-rev-003-static-and-cleanup-audit.txt` | Diff and owned-resource audit | Retained evidence | Pass |
| `api-e2e-evidence/api-rev-004-server-build-full.txt` | IR-003 built-server preparation | Retained evidence | Pass |
| `api-e2e-evidence/api-rev-004-hierarchical-graphql-lifecycle-e2e.txt` | Fresh unchanged TR-001 lifecycle rerun | Retained evidence | Pass — 7/7 |
| `api-e2e-evidence/api-rev-004-v2-production-upgrade-full.txt` | Exact CR-005 regression rerun | Retained evidence | Pass — 4/4 |
| `api-e2e-evidence/api-rev-004-migration-binding-resolution.md` | Expected/observed resolution summary and hash integrity | Retained evidence | API-E2E-F-001 resolved |
| `api-e2e-evidence/api-rev-004-static-and-cleanup-audit.txt` | Hash, diff and owned-resource audit | Retained evidence | Pass |

## Temporary Execution Methods / Scaffolding

| Path / Method | Why Needed | Result / Evidence | Cleanup Result |
| --- | --- | --- | --- |
| `api-e2e-evidence/hierarchical-browser-probe.mjs` | No general repository full-stack harness exists for this hierarchy screen | Pass | Owned server/Nuxt/Chrome/runtime removed |
| Official Electron launcher + owned Nuxt + `open_tab` | User explicitly requested actual package/private Team/real Codex; private identity/path are unsuitable for public deterministic coverage | Pass | Tab closed; listeners/processes stopped; exact preparation-owned root removed |
| Official launcher + isolated `pnpm secrets:import` + owned Nuxt + `open_tab` | User explicitly requested a real private-Team AutoByteus/DeepSeek subteam, disk tree, Team message, and Team task; local keys/private fixture cannot be public deterministic coverage | Pass | Imported keys/data existed only in owned root; tab/processes/listeners/root removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| None in API-E2E-012 | Actual packaged backend, filesystem, WebSockets, private package, and Codex/Luna were used | N/A | None |
| None in API-E2E-013 | Actual packaged backend, filesystem, WebSockets, private package, Codex/Luna, AutoByteus/DeepSeek, task/message tools, and token records were used | N/A | None |
| Other provider permutations | Explicit repository capability gates remained unset | Exhaustive unrelated providers were not required after real Codex plus real AutoByteus/DeepSeek | Low; their launch-policy input contract still compiled and deterministic hierarchy behavior is provider-independent |
| None in API-REV-003 | Built server, SQLite, filesystem, startup registry, GraphQL, and released-shape fixtures were real | N/A | The observed historical binding loss was not a mock artifact |
| None in API-REV-004 | Current built server, SQLite, filesystem, startup registry, GraphQL, released-shape fixtures, restart and recovery were real | N/A | No mock gap remains for the IR-003 correction |

## Result Summary

| Result | Scenario IDs | Summary / Reason |
| --- | --- | --- |
| Pass | API-E2E-003, 004, 005, 008, 010, 012, 013 | Direct repository/API/migration/lifecycle/browser/Electron/Codex/AutoByteus/DeepSeek scenarios pass; API-E2E-004 now preserves exact binding/task/handoff/direct-coordinator/Agent data 4/4 |
| Resolved historical failure | `API-E2E-F-001` | IR-003 preserves the representative V1 -> V2 application binding in both formerly failing supported startup cohorts without changing the strengthened test |
| Not Tested | API-E2E-006 exhaustive provider permutations | Two repository scenarios intentionally skipped by explicit live-provider gates; exact requested Codex/Luna path passed in API-E2E-012 and the explicit Codex-root/AutoByteus-DeepSeek-subteam path passed in API-E2E-013 |
| Out Of Scope | Dynamic Team/Agent addition; unchanged native IPC | Explicitly outside this ticket/change boundary |

## Cleanup Performed

| Resource / Process / Data | Ownership | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated built-server/Nuxt/Chrome probe | API/E2E-owned | Helper/process cleanup and owned runtime/database removal | Pass |
| `open_tab` session | API/E2E-owned | `close_tab`; `list_tabs` verified empty | Pass |
| Nuxt 53612 | API/E2E-owned | Stopped owned session; listener verified absent | Pass |
| Packaged Electron/backend 53559 | Official launcher/API/E2E-owned | Interrupted held session; process/listener verified absent | Pass |
| Electron E2E root `autobyteus-e2e-yHnpKJ` | Preparation-owned | After evidence and zero-process verification, manually removed exact root because SIGINT did not dispose it | Pass |
| Imported package registry entry/run data | Inside owned E2E root | Removed with owned root | Pass |
| Private package source | User source, read-only | No cleanup action; stat/status verified unchanged | Pass |
| Ordinary AutoByteus PID 33760/port 29695 | User-owned | Never touched; health verified before/during/after | Pass |
| API-E2E-013 `open_tab` `edcf5a` | API/E2E-owned | `close_tab`; `list_tabs` returned no sessions | Pass |
| API-E2E-013 Nuxt 54427 and packaged backend 54334 | API/E2E/official-launcher-owned | Stopped; both listeners absent | Pass |
| API-E2E-013 root `autobyteus-e2e-Ymjjtk` including imported provider keys | Preparation-owned | Removed only after zero listener/process/open-file verification | Pass |
| Source `/Users/normy/.autobyteus/server-data/.env` | User-owned, read-only import source | No mutation; inode/mode/owner/size/mtime verified | Pass |
| API-REV-003 built-server E2E roots/databases/processes | API/E2E-owned | Per-test cleanup plus post-run process/file scan | Pass — no matching artifacts or live processes |
| API-REV-004 built-server E2E roots/databases/processes | API/E2E-owned | Per-test cleanup plus named database/runtime and built-server process scan | Pass — no matching artifacts or live processes |

## Preliminary Classification

- Result is `Pass`. `API-E2E-F-001` / CR-005 is resolved at the exact unchanged regression boundary.
- Expected and observed now match: the representative predecessor Agents' shared `{applicationId, bindingId}` context becomes the same non-null V2 `applicationBinding` in both supported cohorts, while the task, handoff, communication, direct Team coordinators, complete Agent snapshots, and lifecycle behavior also pass.
- TR-001's correction passes 7/7. TR-002's correction passes 4/4. Both await formal proportional closure because the prior review result was failure-origin, not a successful test-code review.
- API-E2E-012/013 remain passed and valid; they complement but do not substitute for the direct predecessor migration evidence.

## Recommended Recipient

`/code_reviewer` for formal proportional test-code review of the two API-REV-003 durable corrections, using the unchanged hashes, fresh 7/7 hierarchy pass, full 4/4 production-upgrade pass, and API-E2E-F-001 resolution evidence. Delivery remains blocked until that review passes.

## Evidence / Notes

The execution report and coverage investigation are authoritative. Raw evidence is under:
`/Users/normy/autobyteus_org/autobyteus-worktrees/hierarchical-team-run-launch-config/tickets/in-progress/hierarchical-team-run-launch-config/api-e2e-evidence`.

## Latest Authoritative Result

- Result: `Pass`
- Current validation confidence: `99%`
- Default `95%` confidence target met: `Yes`
- Any current applicable confidence category below `90%`: `No`.
- Broader validation decision: `Not Required` for API-REV-004; the direct built-server migration and adjacent hierarchy lifecycle boundaries passed. API-REV-002's required browser/Electron/provider validation remains completed and passed.
- Critical acceptance criteria lacking proof or failing: None; AC-030 now directly passes exact application-binding preservation.
- Failure ID: `API-E2E-F-001` is resolved.
- Required next recipient: `/code_reviewer` for formal proportional test-code review of TR-001/TR-002.
- Notes: API-REV-004 changed no durable test. Both strengthened files retained their CRR-005 hashes, hierarchy passed 7/7, production upgrade passed 4/4, static/cleanup audit passed, and delivery remains blocked only on the required proportional review gate.
