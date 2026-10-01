# API/E2E Test-Case Ledger

## Ledger meta
- Round: 1; planned revision API-REV-001. No prior API/E2E record/result exists; prior result/confidence N/A.
- Trigger: code_reviewer CRR-002 source-review Pass, IR-002 source 7886aeb78449fa54a09ce715fc6e0d74134b386f; package HEAD c948605e2aa5e9dac77b69819eb8f366226c4112; base 046279298f53fb98d7688ee9dc2b2ba0fa827685.
- Task size Large; architectural risk High; Reviewed input; successful route Code Review. Proportional test-code review Not Applicable unless this round changes durable tests. Failure-origin review remains required on Fail.
- Approved basis: requirements-doc.md SR-012 (approval captured SR-013); design-spec.md SR-013; investigation-notes.md; solution-revision-record.md; solution-progress-result.md; ARCH-REV-001 design-review-report.md and architecture-review-revision-record.md; implementation-handoff.md and implementation-revision-record.md IR-001→002; code-review-report.md and code-review-revision-record.md CRR-001 Fail→CRR-002 Pass.
- Behavior supplements: proposed-compaction-prompt.md exact prompt-v5 and output-format-and-coverage.md. Context supplements: compaction-prompt-proposal.md, prompt-refinement-notes.md, simplification-design-direction.md, analysis-report.md, upstream-compaction-research.md, history/, upstream-prompts/README.md (sources/licenses), upstream-experiments/README.md, design-investigation-probes/README.md, architecture-review-evidence/README.md, implementation-evidence/README.md and ir-002/README.md, code-review-evidence/README.md and crr-002/README.md. Historical proposal/status wording is superseded by SR-013; no competing behavior authority.
- Product supplements N/A — not requested. Delivery record/revision N/A — no delivery entry. Source and architecture reviews occurred; neither is N/A.
- Workspace: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis
- Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-coverage-investigation.md
- Report: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-execution-coverage-report.md
- Revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/api-e2e-revision-record.md
- Initialized before execution; multiple independent cases. UTC event timestamps; local environment Europe/Berlin.

## Planned cases

| Order / case | Case | Criteria | Exact command | Initial result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 / API-C01 | Live harness AgentRun prerequisite | AC-001/002/006/007; ENG-001 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/secret-management/live-e2e-harness.test.ts tests/unit/secret-management/live-e2e-compaction-boundary.test.ts --no-watch` | Planned | api-e2e-evidence/api-rev-001/API-C01.log |
| 2 / API-C02 | Direct summary, commit faults, retry, repeated mechanics and strict-v5 restore | AC-001–009/011 | `pnpm -C autobyteus-ts exec vitest run tests/unit/memory tests/integration/agent/runtime/agent-runtime-compaction.test.ts tests/integration/agent/working-context-snapshot-restore-flow.test.ts --no-watch` | Planned | api-e2e-evidence/api-rev-001/API-C02.log |
| 3 / API-C03 | Provider completion/options, current model config and stream metadata | AC-005/006/010/011 | `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/api tests/unit/llm/llm-factory-config-composition.test.ts tests/unit/clients tests/unit/agent/streaming tests/unit/agent/loop/llm-phase-compaction.test.ts tests/unit/agent/loop/llm-phase-memory-compaction-configuration.test.ts --no-watch` | Planned | api-e2e-evidence/api-rev-001/API-C03.log |
| 4 / API-C04 | Server factory/request/status, startup settings and history readers | AC-005/006/008/009/010 | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/compaction tests/unit/startup/compaction-model-settings-migration.test.ts tests/unit/services/server-settings-service.test.ts tests/unit/agent-memory tests/unit/agent-execution/backends/autobyteus tests/unit/agent-execution/agent-provider-factory-builder.test.ts tests/unit/app-data-migrations/migrate-native-working-context-snapshots-v5-migration.test.ts --no-watch` | Planned | api-e2e-evidence/api-rev-001/API-C04.log |
| 5 / API-C05 | Real GraphQL schema settings and historical memory | AC-009/010 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/server-settings/server-settings-graphql.e2e.test.ts tests/e2e/memory/memory-view-graphql.e2e.test.ts tests/e2e/memory/memory-explorer-graphql.e2e.test.ts --no-watch` | Planned | api-e2e-evidence/api-rev-001/API-C05.log |
| 6 / API-C06 | Web settings/status/history durable regressions | AC-010; DS-004/005 | `pnpm -C autobyteus-web test:nuxt components/settings/__tests__/CompactionConfigCard.spec.ts components/settings/__tests__/CompactionModelSettings.spec.ts components/settings/__tests__/ServerSettingsCompactionFailure.spec.ts components/progress/__tests__/CompactionActivityItem.spec.ts components/workspace/agent/__tests__/AgentCompactionLiveFlow.spec.ts components/workspace/agent/__tests__/CompactionStatusRow.spec.ts tests/stores/serverSettingsStore.test.ts services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts services/agentStreaming/__tests__/AgentStreamingService.spec.ts services/eventMonitor/__tests__/recentEventMonitorPresentationWitness.spec.ts --run` | Planned | api-e2e-evidence/api-rev-001/API-C06.log |
| 7 / API-C07 | Strict current presentation contract | AC-010 | `pnpm -C autobyteus-agent-presentation-contracts test` | Planned | api-e2e-evidence/api-rev-001/API-C07.log |
| 8 / API-C08 | Controlled first/repeated semantic quality | AC-001/002/007 | Registered explicit local/managed scenario after prerequisite; extend repeat coverage | Planned | None yet |
| 9 / API-C09 | Integrated browser settings/status/history | AC-009/010 | Documented browser development path after isolated API readiness | Planned | None yet |
| 10 / API-C10 | Process stop/resume | AC-004/005/008 | Targeted isolated filesystem lifecycle probe if gap remains | Planned | None yet |

## Execution events

| Case | UTC timestamp | Event | Expected | Observed / result | Evidence |
| --- | --- | --- | --- | --- | --- |
| API-C01 | 2026-09-26T20:23:51.022115+00:00 | Started | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C01.log |
| API-C01 | 2026-09-26T20:23:56.082467+00:00 | Completed | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Fail — exit 1; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C01.log |
| API-C02 | 2026-09-26T20:24:13.607948+00:00 | Started | Direct summary, commit faults, retry, repeated mechanics and strict-v5 restore; AC-001–009/011: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C02.log |
| API-C02 | 2026-09-26T20:24:15.358206+00:00 | Completed | Direct summary, commit faults, retry, repeated mechanics and strict-v5 restore; AC-001–009/011: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C02.log |
| API-C03 | 2026-09-26T20:24:31.428703+00:00 | Started | Provider completion/options, current model config and stream metadata; AC-005/006/010/011: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C03.log |
| API-C03 | 2026-09-26T20:24:33.588600+00:00 | Completed | Provider completion/options, current model config and stream metadata; AC-005/006/010/011: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C03.log |
| API-C04 | 2026-09-26T20:24:53.396829+00:00 | Started | Server factory/request/status, startup settings and history readers; AC-005/006/008/009/010: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C04.log |
| API-C04 | 2026-09-26T20:25:09.614201+00:00 | Completed | Server factory/request/status, startup settings and history readers; AC-005/006/008/009/010: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C04.log |
| API-C05 | 2026-09-26T20:25:16.438354+00:00 | Started | Real GraphQL schema settings and historical memory; AC-009/010: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C05.log |
| API-C05 | 2026-09-26T20:25:23.139848+00:00 | Completed | Real GraphQL schema settings and historical memory; AC-009/010: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C05.log |
| API-C06 | 2026-09-26T20:25:40.236609+00:00 | Started | Web settings/status/history durable regressions; AC-010; DS-004/005: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C06.log |
| API-C06 | 2026-09-26T20:25:51.375898+00:00 | Completed | Web settings/status/history durable regressions; AC-010; DS-004/005: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C06.log |
| API-C07 | 2026-09-26T20:26:16.863761+00:00 | Started | Strict current presentation contract; AC-010: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-001/API-C07.log |
| API-C07 | 2026-09-26T20:26:18.218467+00:00 | Completed | Strict current presentation contract; AC-010: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-001/API-C07.log |
| API-C08 | 2026-09-26T20:30:19.226467+00:00 | Completed — not started | First/repeated live semantic quality | Not Tested — API-F001 blocks the registered live facade; no provider calls or readiness claim | Canonical investigation broader decision |
| API-C09 | 2026-09-26T20:30:19.226467+00:00 | Completed — not started | Integrated browser settings/status/history | Not Tested — Deferred after failing gate; component/schema evidence is not browser execution | Canonical investigation broader decision |
| API-C10 | 2026-09-26T20:30:19.226467+00:00 | Completed — not started | Actual process-stop/resume | Not Tested — Deferred; fault injection is not a process-stop/power-loss campaign | Canonical investigation broader decision |

## Re-entry and reconciliation

- Last recorded event: 2026-09-26T20:30:19.226467+00:00, API-C10 Not Tested.
- Last executed case API-C07 Pass; API-C01 Fail; API-C02–07 Pass. All completed command attempts checkpointed automatically before proceeding; no interrupted/running cases.
- API-C08–10 Not Tested, not claims of unavailable external credentials.
- Next: focused failure-origin review API-F001; after confirmed test-support rework rerun C01 first, reuse case IDs, then execute remaining realistic boundaries and expand current tuple/repeated coverage.
- Reconciled into api-e2e-execution-coverage-report.md **Yes**, API-REV-001. Report is authoritative; initial Planned column describes original plan only.

## Round 2 — CRR-003 Local Fix re-entry

Prior API-REV-001 Fail73.6%; current round unresolved. Planned order: API-C01 facade fix/rerun first; API-C05 expanded tuple/history API; API-C08 controlled live first/repeated (preflight checkpoints); API-C09 real browser; API-C10 focused process stop as needed. Existing C02–07 IDs reused for relevant regression reruns. No prior failure inferred resolved before execution.

| Case | UTC timestamp | Event | Expected | Observed / result | Evidence |
| --- | --- | --- | --- | --- | --- |
| API-C01 | 2026-09-26T20:39:41.535544+00:00 | Started | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C01-attempt1.log |
| API-C01 | 2026-09-26T20:39:46.180068+00:00 | Completed | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Fail — exit 1; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C01-attempt1.log |

API-C01 intermediate attempt reached real normalization and events; failed only on newly authored assertion calling nonexistent getOriginalFileAttachments. Corrected to actual readonly recordingFileAttachments property; original API-F001 constructor error absent. Attempt1 retained; no production finding.
| API-C01 | 2026-09-26T20:40:16.321933+00:00 | Started | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C01-normalizer-pass.log |
| API-C01 | 2026-09-26T20:40:20.643090+00:00 | Completed | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C01-normalizer-pass.log |
| API-C05 | 2026-09-26T20:41:24.255381+00:00 | Started | Real GraphQL schema settings and historical memory; AC-009/010: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C05-attempt1.log |
| API-C05 | 2026-09-26T20:41:30.823230+00:00 | Completed | Real GraphQL schema settings and historical memory; AC-009/010: all checks pass | Fail — exit 1; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C05-attempt1.log |
| API-C05 | 2026-09-26T20:46:00.834780+00:00 | Started | Real GraphQL schema settings and historical memory; AC-009/010: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C05.log |
| API-C05 | 2026-09-26T20:46:07.381142+00:00 | Completed | Real GraphQL schema settings and historical memory; AC-009/010: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C05.log |

| API-B01 | Planned | Build current shared/server per root scripts; prerequisite for C08/09 | Command/evidence in round2 plan |
| API-B01 | 2026-09-26T20:46:30.939831+00:00 | Started | Documented shared/server build prerequisite; ENG-001; API-C08/09 readiness: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-B01.log |
| API-B01 | 2026-09-26T20:46:44.212684+00:00 | Completed | Documented shared/server build prerequisite; ENG-001; API-C08/09 readiness: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-B01.log |
| API-C08 | 2026-09-26T20:47:50.924Z | Started | API-C08-preflight; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-preflight.log |
| API-C08 | 2026-09-26T20:47:54.415Z | Completed exit 0; read configured/skipped/test evidence, not inferred Pass | API-C08-preflight; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-preflight.log |
| API-C08 | 2026-09-26T20:48:23.694Z | Started | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first-attempt1.log |
| API-C08 | 2026-09-26T20:49:29.492Z | Completed exit 1; read configured/skipped/test evidence, not inferred Pass | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first-attempt1.log |
| API-C01 | 2026-09-26T20:50:29.987246+00:00 | Started | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C01-tools-pass.log |
| API-C01 | 2026-09-26T20:50:35.302951+00:00 | Completed | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C01-tools-pass.log |
| API-C09 | 2026-09-26T20:51:41.553Z | Checkpoint Pass | Chrome real Settings explicit Qwen save → API + .env → reload retained → inherit save → API null tuple | api-rev-002/API-C09-explicit-tuple.json + API-C09-inherit-tuple.json; full browser status/history not yet tested |
| API-C08 | 2026-09-26T20:51:41.592Z | Started | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first-attempt2.log |
| API-C08 | 2026-09-26T20:53:36.303Z | Completed exit 1; read configured/skipped/test evidence, not inferred Pass | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first-attempt2.log |
| API-C08 | 2026-09-26T20:55:41.969Z | Started | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first-attempt3.log |
| API-C09 | Browser checkpoint | Pass | Real Memory→Agent→Run→Working Context/Episodic/Semantic/Raw Traces shows exact synthetic data; all seeded file hashes unchanged | API-C09-history-fixture.json / API-C09-history-readonly.json |
| API-C08 | 2026-09-26T20:57:55.719Z | Completed exit 1; read configured/skipped/test evidence, not inferred Pass | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first-attempt3.log |
| API-C08 | 2026-09-26T20:58:57.093Z | Started | API-C08-quality; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-quality-attempt1.log |
| API-C08 | 2026-09-26T20:59:54.745Z | Completed exit 1; read configured/skipped/test evidence, not inferred Pass | API-C08-quality; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-quality-attempt1.log |
| API-C08 | 2026-09-26T21:01:05.980Z | Started | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first.log |
| API-C10 | 2026-09-26T21:02:23.555Z | Started | owned process SIGKILL around snapshot rename | process-snapshot-probe.mjs |
| API-C10 | 2026-09-26T21:02:23.699Z | Pass | SIGKILL before rename retains old strict-v5; after rename exposes new strict-v5; owned directories removed | api-e2e-evidence/api-rev-002/API-C10.json |
| API-C08 | 2026-09-26T21:03:18.070Z | Completed exit 0; read configured/skipped/test evidence, not inferred Pass | API-C08-first; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-first.log |
| API-C09 | 2026-09-26T21:04:54.319Z | Checkpoint Pass | Explicit unavailable ID + config retained through actual API and browser warning; invalid ratio disabled save. Restored owned null tuple via API. Live status remains untested. | API-C09-unavailable-retained.json |
| API-C08 | 2026-09-26T21:04:54.356Z | Started | API-C08-quality; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-quality.log |
| API-C08 | 2026-09-26T21:06:23.643Z | Completed exit 0; read configured/skipped/test evidence, not inferred Pass | API-C08-quality; actual registered test with owned server | api-e2e-evidence/api-rev-002/API-C08-quality.log |
| API-C01 | 2026-09-26T21:10:39.522406+00:00 | Started | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C01-quality-alarm-pass.log |
| API-C01 | 2026-09-26T21:10:44.109602+00:00 | Completed | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C01-quality-alarm-pass.log |

| API-C08 | Final semantic adjudication | Fail | API-F005: repeated accepted body invents completed APPROVAL-73 plan update; automated keyword checks had passed but manual source/output comparison fails AC-002/007. New alarm rejects captured output in replay; C01 regression23pass. API-F004 prior continuation variation remains unclosed despite later Pass. | api-rev-002/API-F005-replay.json / semantic-final-observations.json / API-F004-triage.json |
| API-C09 | Completed scoped browser checks | Partial evidence, not full-case Pass | Settings save/reload/inherit/unavailable/invalid-input and historical current/episodic/semantic/raw readers Pass; live status/failure retry and full saved-run UI resume Not Tested after semantic failure gate. | api-rev-002/browser-observations.md |
| Cleanup | Completed | Pass | Owned browser closed, frontend process group stopped, backend stopped; owned runtime/database/key removed; test-case temporary directories removed. Shared LMStudio service and user's desktop left running. | api-rev-002/owned-server-cleanup.json / owned-web-cleanup.json |
| API-C01 | 2026-09-26T21:19:30.144123+00:00 | Started | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Not yet resolved | api-e2e-evidence/api-rev-002/API-C01.log |
| API-C01 | 2026-09-26T21:19:34.683853+00:00 | Completed | Live harness AgentRun prerequisite; AC-001/002/006/007; ENG-001: all checks pass | Pass — exit 0; inspect log for test counts and boundary limits | api-e2e-evidence/api-rev-002/API-C01.log |

| API-C01 / final integrity | 2026-09-26T21:24:07.084417+00:00 | Pass | Final 24/24; four semantic-alarm cases including explicit noncompletion. Latest helper rejects retained API-F005 body; no new model call. Seven-path hashes refreshed; diff/syntax clean, owned ports/processes/data absent; user desktop remains running. | api-rev-002/API-C01.log / API-F005-replay.json / final-source-audit.json / final-cleanup-checks.json |

## SR-014 diagnostic-only checkpoints

| Case | Time | State | Expected / observed | Evidence |
| --- | --- | --- | --- | --- |
| SR014-D00 | 2026-09-26T21:49:20.474521+00:00 | Planned | No-provider safe capture, forced post failure, cleanup proof before any real generation | sr014-diagnostics/manifest.json |
| SR014-D01–04 | Planned | Not Started | Exact frozen input A,B,B,A; maximum four direct calls, no substitutes | sr014-diagnostics/manifest.json |
| SR014-F01 | Planned | Not Started | At most one original-config full flow with all-exit observations | sr014-diagnostics/manifest.json |
| SR014-D00 | 2026-09-26T21:53:03.384626+00:00 | Pass | 2files4 no-provider instrumentation tests: forced post failure captured before terminate/delete; arbitrary exception and raw reasoning excluded; wire attempt budget enforced | sr014-diagnostics/instrumentation.log |
| SR014-D00 | 2026-09-26T21:54:10.452228+00:00 | Pass | Extended 2files5 no-provider tests; actual LMStudio SDK final-fetch interception verified before possible dispatch. Owned server ready57025; no provider generation yet | sr014-diagnostics/instrumentation.log / owned-server.json |
| SR014-D00 correction | 2026-09-26T21:54:30.391275+00:00 | Setup error, not Pass | Previous 5-test checkpoint was written prematurely. Extended probe actually import-failed (2testsPass/1suiteFail); first direct runner also import-failed before any tests/provider call. Initial4test evidence remains valid. Fix temporary probe imports to local source, rerun no-provider check before live. No sample slots consumed or substituted. | sr014-diagnostics/instrumentation-import-error.log / direct-import-error.log |
| SR014-D00 | 2026-09-26T21:54:54.181252+00:00 | Fixture error | 4Pass/1Fail: fake response missing JSON content-type, SDK treated it as text. Correct fake only; no real model call | sr014-diagnostics/instrumentation-response-fixture-error.log |
| SR014-D00 | 2026-09-26T21:55:23.877128+00:00 | Verified Pass | Final2files5 no-provider checks incl actual SDK synthetic dispatch. Temporary import/content-type fixture errors retained. Now safe to begin fixed four direct attempts | sr014-diagnostics/instrumentation.log |
| SR014-D01-A | 2026-09-26T21:55:26.990Z | Started | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D01-A.jsonl |
| SR014-D01-A | 2026-09-26T21:56:23.248Z | Completed observation; manual adjudication pending | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D01-A.jsonl |
| SR014-D02-B | 2026-09-26T21:56:23.249Z | Started | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D02-B.jsonl |
| SR014-D01-A | 2026-09-26T21:57:00.740844+00:00 | Manual fidelity Fail | Completed work invents “Updated plan structure to include the owner-review checkpoint APPROVAL-73.” Exact frozen input has only request, no action. Retention30/cancellation/approval/unrun/inventory/risk/rollback/references preserved; complete-stop, one actual wire call. Original failure remains open. | sr014-diagnostics/D01-A.jsonl |
| SR014-D02-B | 2026-09-26T21:57:06.227Z | Completed observation; manual adjudication pending | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D02-B.jsonl |
| SR014-D03-B | 2026-09-26T21:57:06.229Z | Started | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D03-B.jsonl |
| SR014-D03-B | 2026-09-26T21:57:48.899Z | Completed observation; manual adjudication pending | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D03-B.jsonl |
| SR014-D04-A | 2026-09-26T21:57:48.900Z | Started | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D04-A.jsonl |
| SR014-D04-A | 2026-09-26T21:58:23.716Z | Completed observation; manual adjudication pending | Fixed-input diagnostic only; no acceptance change | sr014-diagnostics/D04-A.jsonl |
| SR014-D02-B / D03-B | 2026-09-26T21:58:51.520056+00:00 | Manual fidelity Fail / Fail | Both identical accepted bodies assert “Owner-review checkpoint APPROVAL-73 has been added to the plan” under Current state. Source contains request only. Other controls/references/corrections/constraints retained. Temperature0 did not eliminate observed false-completion error; no determinism/reliability inference. | sr014-diagnostics/D02-B.jsonl / D03-B.jsonl |
| SR014-F00 | 2026-09-26T21:58:51.520240+00:00 | Probe fixture correction | Incremental SSE observer test initially6Pass/1Fail: immediately errored synthetic stream discarded queued content before reader. Change fixture to disconnect after observed first chunk; no full live attempt yet | sr014-diagnostics/instrumentation-stream-fixture-error.log |
| SR014-D04-A | 2026-09-26T21:59:43.243337+00:00 | Manual fidelity Fail | Completed work falsely asserts Added owner-review checkpoint APPROVAL-73 to plan. All4 actual wire samples complete/stop; no additional generations. Baseline null tuple restored. | sr014-diagnostics/D04-A.jsonl |
| SR014-F00 | 2026-09-26T21:59:43.243340+00:00 | Pass | Final2files7 no-provider checks; partial SSE content retained before error, reasoning/message leak excluded. Original null tuple verified in owned config before full flow. | sr014-diagnostics/instrumentation.log / full-prerequisites.json |
| SR014-F01 | 2026-09-26T21:59:43.243342+00:00 | Started | Sole registered original-config full-flow observation; failures retained before cleanup/wrapping | sr014-diagnostics/full-execution.json |
| SR014 owner regression | 2026-09-26T22:01:33.335813+00:00 | Pass | 3files26 tests; prior24 +2 safe all-exit observation tests. This is test-support regression only, not new validation Pass | sr014-diagnostics/owner-regression.log |
| SR014-F01 | 2026-09-26T22:04:15.693348+00:00 | Positive observation, original cause Open | Sole full flow2testsPass,4turns4tools,1summary+8parent wire calls. Large stdout record reconstructed from exact reporter-separated fragments; pristine wire JSONL also retained. Worker token-usage readiness warning NOT present in retained prior positive log; temporary config omitted normal Prisma setup. Generation controls match but full environment equivalence is not established; no extra attempt. | sr014-diagnostics/full-comparison.json / full-all-exit-reconstruction.json / full-wire.jsonl |
| SR014 final cleanup | 2026-09-26T22:07:02.923775+00:00 | Complete | Four direct +one full-flow bound exhausted. No acceptance rescore; both original failures Open. Owned server/data/flow root removed, port closed, user desktop/provider preserved. | sr014-diagnostics/README.md / final-audit.json |
