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

## API-REV-003 plan / 2026-09-30 — in progress
Prior API-REV-002 Fail82.9 unchanged. Current C08/API-F005 actual Fail and F004 Open, not rerun; no semantic remedy. Source CRR005 structural Pass only.
| Case | Planned real boundary | Initial status |
| --- | --- | --- |
| API-C01 | Shared facade memoryDir/real owner readiness, safe all-exit capture | Not Tested; baseline then owner fix |
| API-C02 | Current core memory/compaction/retry/streaming | Not Tested |
| API-C04 | Frozen migration/current writer preservation, parent credentials/settings/platform/history and context-file access | Not Tested |
| API-C05 | Actual GraphQL tuple persistence + historical readers | Not Tested |
| API-B01 | Standard fresh server/core/contracts build | Not Tested |
| API-C11 | Owned actual server startup/restart HTTP absent/no-import/explicit tuple/versionless history | Not Tested; plan after repository gate |
No new C08 live samples planned. User now permits providers/owned-vault import, but exhausted SR014 bounds not recycled.

- Round3 API-C01-baseline: Fail command exit 1. Evidence api-e2e-evidence/api-rev-003/API-C01-baseline.log/.json. Counts/assertion scope reconciled before next case.

C01 baseline:24Pass/2Fail, both missing memoryDir SR018-OBS-001 as expected. Authorized test-support-only correction passes explicit memoryDir and exercises real current metadata scan with admitted/unadmitted file owner; dispatch contract preserved, no production edits.

- Round3 API-C01: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-C01.log/.json. Counts/assertion scope reconciled before next case.

C01 final:3files27Pass (admitted+unadmitted actual facade, event projection/termination, safe all-exit forced error). SR018-OBS-001 resolved within no-provider prerequisite scope; no claim of live full-facade quality.

- Round3 API-C02: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-C02.log/.json. Counts/assertion scope reconciled before next case.

C02:48files377Pass, scripted/direct filesystem memory/runtime and streaming. Actual-provider semantic hold not changed.

- Round3 API-C04: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-C04.log/.json. Counts/assertion scope reconciled before next case.

C04:12files109Pass. Real writer cuts/whole-location bytes, migration and history filesystem tests; factory credential and platform startup spies remain mock-bounded.

- Round3 API-C05: Fail command exit 1. Evidence api-e2e-evidence/api-rev-003/API-C05.log/.json. Counts/assertion scope reconciled before next case.

- Round3 API-C05-corrected: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-C05-corrected.log/.json. Counts/assertion scope reconciled before next case.

C05 corrected:3files18Pass; absent key stays omitted, no default write; explicit/null/extra-root tuple durable reload exact. First authoring failure retained. Repository gate81.4%; C11 required.

- Round3 API-B01: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-B01.log/.json. Counts/assertion scope reconciled before next case.

B01 standard shared/core/server/Prisma/sanitized builtin build Pass. C11 scope/seed/checkpoints declared in structural-server.mjs; no provider calls.

API-C11 final Fail; API-C11.json and all 3 process logs/cleanup.

API-C11 checkpoint: fresh built startup + HTTP absence/no default persistence + writer/v5 byte preservation. See API-C11.json.

API-C11 checkpoint: normal bootstrap separately repairs all actual writer cuts and projects released v5. See API-C11.json.

API-C11 checkpoint: second real process reloads exact explicit tuple and repaired versionless history; legacy unchanged. See API-C11.json.

API-C11 checkpoint: third real process retains explicit inherit tuple without old preference import. See API-C11.json.

API-C11 final Pass; API-C11.json and all 3 process logs/cleanup.

API-C12 planned separately (new user permission): DeepSeek v4 flash quality only, maximum2 calls, preflight first, no adaptive attempts; manifest deepseek/manifest.json. Not Tested.

API-C12 preflight started 2026-09-30T12:29:10.685Z; at most2 quality calls, manifest frozen.

API-C12 preflight completed exit 0; safe log deepseek/preflight.log. Manual semantic adjudication pending; exit does not decide acceptance.

API-C12 quality started 2026-09-30T12:29:14.385Z; at most2 quality calls, manifest frozen.

API-C12 quality completed exit 0; safe log deepseek/quality.log. Manual semantic adjudication pending; exit does not decide acceptance.

API-C12 final scoped Pass: preflight1Pass/READY, quality1Pass, exact2 calls; manual first/repeated fidelity Pass (pending checkpoint explicitly preserved). Existing API-F005 actual Fail / API-F004 unresolved remain. Manifest exhausted; cleanup runtime/db/key and server confirmed. Evidence deepseek/semantic-adjudication.md, semantic-evidence.json, wire.jsonl, execution.json.

API-C07 refresh planned: existing current presentation contract schema semantics3Node cases; no code edits, preexisting historical2-test result not assumed current.

- Round3 API-C07: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-C07.log/.json. Counts/assertion scope reconciled before next case.

## API-REV-003 final reconciliation
C01 Pass27, C02 Pass377, C04 Pass109, C05 Pass18 corrected, C07 Pass3 =534 fresh durable repository tests. B01Pass; C11 scopedPass; C12 preflight1Pass + quality1Pass/exact2calls/manualpairPass; observer3Pass separate. C08 retains actual semanticFailF005 and unexplainedF004; no new Qwen calls. C03/C06 not rerun, C09full/C10current actualcrash not tested. All owned processes/DB/key/runtime cleaned, no cases running. Latest complete overall **Fail82.9%**, prior APIREV2Fail82.9 unchanged. Authoritative current execution report reconciles all limits and authoring corrections. Rule-selected single recipient/code_reviewer; notDelivery.

- Round3 API-C01-final: Pass command exit 0. Evidence api-e2e-evidence/api-rev-003/API-C01-final.log/.json. Counts/assertion scope reconciled before next case.

API-REV-003 handoff confirmed accepted=true / DELIVERED to sole recipient /code_reviewer, AgentRun code_reviewer_7bd4b2c09af543088c0238d792d0fd98. Receipt: api-e2e-evidence/api-rev-003/handoff-receipt.json. No additional outcome recipient or Delivery notification; API stage stopped.

## SR020 acceptance transition / API-REV-004 in progress
API-F005: **accepted known deviation/non-blocking—not fixed/notPass**. StopQwen calls/investigation/tuning. Historical failures and API003Fail82.9 unchanged.
API-F004: historical unexplained continuation, not endpointdiagnosis/fix; assess currentDeepSeekruntime.
| Case | Plan | Status |
| --- | --- | --- |
| API-C01 | Unchanged facade/all-exit regression prerequisite + temporary bounded SSE observer offline | NotTested thisround |
| API-C08 | One declared DeepSeek full runtime flow; preflightfirst; max13outbound(12parent/1summary) | NotTested |
| API-C09 | Reassess remaining user/status/resume gap under TESTING afterruntime evidence | NotTested; no inference of Pass |
Manifest api-e2e-evidence/api-rev-004/manifest.json. No new overallscore/completedround yet.

API004-C01 prerequisites:3files27Pass; unchanged real facade/readiness and forced all-exit error-beforecleanup proof. No provider calls.

API004 observer attempt13Pass/1Fail: synthetic ReadableStream errored before queued chunk was consumed; corrected fixture to explicitly deliver first chunk before injected error (not production change). Original observer-first.log preserved; added direct all-exit capture ordering/scanner tests before live execution. No provider calls.

API004-C01 final27Pass unchanged durable; temporary observer6Pass (caps, noQwen, partialSSE/error stop, directall-exit capture ordering/scanner). Source-default/prompt unchanged. Import value-free preview approved, explicitownedtarget. One registered DeepSeek runtime flow authorized by manifest; no directqualitypair repeat.

API004-C08 preflight started 2026-09-30T13:03:53.576Z; at most13 full-flow calls, manifest frozen.

API004-C08 preflight completed exit 0; safe log api-rev-004/preflight.log. Manual semantic adjudication pending; exit does not decide acceptance.

API004-C08 flow started 2026-09-30T13:03:57.569Z; at most13 full-flow calls, manifest frozen.

API004-C08 flow completed exit 1; safe log api-rev-004/flow.log. Manual semantic adjudication pending; exit does not decide acceptance.

API004-C08 semantic judgment requested by user: scoped semantic Pass/good and usable. Exact8 anchors, correct completed/pending boundary, one matching summary in next parent, actual fourth write/exact9-field artifact; minor repetition and historical read-only wording noted. Full test remains Fail on preliminary API-F006 global Unicode sentinel assertion; offline unchanged-inspector replay2Pass confirms assistant-only echo changes result with identical tool blocks. Later snapshot/raw assertions not reached. No new calls or Qwen work. Evidence api-rev-004/semantic-review.md/.json. Overall round not yet finalized.

## API-REV-004 final reconciliation
Explicit user request removes arbitrary live emoji/literal replacement-character assertions. C01 final3files28Pass; C02 focused2files14Pass; observer6Pass; pre-fix replay2Pass; post-fix exact original request1Pass. API-F006 locally corrected/offline proven, no additional model generation. Original C08command1Pass/1Fail retained with fourturns/exactartifact/onecompaction/semanticPass; later snapshot/raw assertions never reached. Full campaign9requests (8parent/1summary), zeroQwen. Current round overall **Fail90.7%**, further full user/persistence evidence required. F005acceptednonblocking/notfixed; F004historicalunexplained. All owned runtime/db/key/server/fixtures cleaned. Single Fail-rule recipient/code_reviewer for focusedF006 correction disposition, not waivedQwen recovery or Delivery.

API-REV-004 handoff confirmed accepted=true / DELIVERED to sole /code_reviewer, run code_reviewer_7bd4b2c09af543088c0238d792d0fd98;225 references attached. FocusedF006 correction disposition only; no waivedQwen-remedy/Delivery/secondrecipient. Receipt api-e2e-evidence/api-rev-004/handoff-receipt.json. API stage stops.

## API-REV-005 planned after CRR007
F006narrowassertion resolved, F005acceptednonblocking/Qwenstopped, F004historicalunknown. Source/nineAPIfilesunchanged atentry. No new finalscore/result yet.
| Case | Expected | Initial status |
| --- | --- | --- |
| API-C01 | Corrected facade/framing/Unicode/event/all-exit regressions pass | NotTested |
| API-C09 | Isolated worktree desktop build and real Settings/status/retry/resume journey, supported steps declared before calls | NotTested |
| API-C08 | Assess valid full persisted compaction evidence after setup; separately bounded DeepSeek only if required | NotTested |
Initialgenerationbudget0; no Qwen/provider calls atbuild/inspection. plan.json records surface/cleanup.

API005-C01 completed3files28Pass; no provider/network calls (scenario setup tests mocked and stop before generation). API-C01.log/.exit.

API005-C09 build/start readinessPass: documented worktreebuild, ownediso-64217-1323/64217/64218. Newuserrequestedretry-policyrecovery arrived duringbuild; no browseractions/fulljourney/providerimport/calls. Stoppedownedinstance gracefully; dataRootRemoved/controlPortReleased/serverPortReleased alltrue. Build outputs retained.
API-C13 retry-policy diagnostic: investigation scope declared beforetemporaryprobe; ledger case recorded here afterexecution. Six no-network currentpolicytestsPass:503503success3HTTP;persistent5033HTTP;4011HTTP;invalidsummary1generation;baselinepreserved/distinctuserretrybeforeassembly; currenterror-final/idle eventchainIDLE. Not Pass for newlyrequested3attempt+errorpolicy.
API005interruptedforAPI-RQ-001 RequirementGap/DesignImpact; no completeoverallresult/newconfidence. LastcompletedAPI004Fail90.7 remains. C08newliveflow and C09fulljourney NotTestedundernewpolicy. Route single /solution_designer peruserequest, not executionfailure/code_reviewerreroute or waivedQwenremedy. No cases/processesrunning.

API-RQ-001 requirement/design-impact handoff confirmed accepted=true / DELIVERED to sole /solution_designer, run solution_designer_e86db51ce2a24b15abe56a98c9c8114f,269references attached. API005acceptance incomplete/no rescore; no additional recipient or Delivery. Receipt api-e2e-evidence/api-rev-005/requirement-handoff-receipt.json. Stage stops pending owner revision.

## SR022 numeric-target diagnostic (evidence-only supplement)
Plan/manifest and criticalfacts predeclared, not acceptance/API006. Fixedorder and max1outboundeach: SR022-D01 F-withTarget NotTested; D02 F-withoutTarget NotTested; D03 R-withoutTarget NotTested; D04 R-withTarget NotTested. Max4totalincludingSDK, no retries/newfirstsummary/Qwen. Offlinewireguard prerequisite before live; stopontransport/auth/quota/timeout/cancellation/cap. Completedsemanticfail retained; remainingpredeclaredarms only. No confidence rescore.
SR022 prerequisite:10offlineguard testsPass including actual productionDeepSeekSDK retry interception (only one fake outbound on503), exact frozenhashes/diff/order/caps/transportstop/validcontrols/safeoutput. No actualnetworkgeneration. guard.log/.exit. Proceedonlyafterownvaulttarget/preflight verified.

SR022 importer preview/confirmation succeeded for newowneddb sr022-budget.db:10recognized/configured,0replaced. Sourceenv accessed only by importer; no values output. Standardbuild/sanitizedsmokePass. Guard10Pass; starting only fixedfourarm campaign.

SR022 preflight started 2026-09-30T14:42:07.605Z; at most4 total outbound calls, manifest frozen.

SR022 preflight completed exit 0; safe log sr022-budget-diagnostics/preflight.log. Manual semantic adjudication pending; exit does not decide acceptance.

SR022 diagnostic started 2026-09-30T14:42:12.138Z; at most4 total outbound calls, manifest frozen.

SR022 diagnostic completed exit 1; safe log sr022-budget-diagnostics/diagnostic.log. Manual semantic adjudication pending; exit does not decide acceptance.

SR022 setup-only authoring failure beforeanygeneration:temporarypackageimport outside serveralias scope,0testscollected. PreflightREADY; ownedresources cleaned. Correctedonlytempimport paths; offline VitestcollectionnowPass/onecase. Guardunchanged10Pass. No sampleattempt/budget consumed, samefixedplan remains; originalsetup-attempt-1 logs retained.

SR022 preflight started 2026-09-30T14:44:53.418Z; at most4 total outbound calls, manifest frozen.

SR022 preflight completed exit 0; safe log sr022-budget-diagnostics/preflight.log. Manual semantic adjudication pending; exit does not decide acceptance.

SR022 diagnostic started 2026-09-30T14:44:57.944Z; at most4 total outbound calls, manifest frozen.

SR022 F-withTarget started 2026-09-30T14:45:02.250Z; one outboundmaximum.

SR022 F-withTarget Completed—manual fidelity pending 2026-09-30T14:45:08.376Z; manualfidelitypending; evidence sr022-budget-diagnostics/F-withTarget.json.

SR022 F-withoutTarget started 2026-09-30T14:45:08.378Z; one outboundmaximum.

SR022 F-withoutTarget Completed—manual fidelity pending 2026-09-30T14:45:18.898Z; manualfidelitypending; evidence sr022-budget-diagnostics/F-withoutTarget.json.

SR022 R-withoutTarget started 2026-09-30T14:45:18.902Z; one outboundmaximum.

SR022 R-withoutTarget Completed—manual fidelity pending 2026-09-30T14:45:27.306Z; manualfidelitypending; evidence sr022-budget-diagnostics/R-withoutTarget.json.

SR022 R-withTarget started 2026-09-30T14:45:27.310Z; one outboundmaximum.

SR022 R-withTarget Completed—manual fidelity pending 2026-09-30T14:45:34.678Z; manualfidelitypending; evidence sr022-budget-diagnostics/R-withTarget.json.

SR022 diagnostic completed exit 0; safe log sr022-budget-diagnostics/diagnostic.log. Manual semantic adjudication pending; exit does not decide acceptance.

## SR022 final diagnostic reconciliation (not API acceptance)
| Case | Transport/output contract | Manual fidelity | Body code points | Evidence |
| --- | --- | --- | ---: | --- |
| SR022-D01 F-withTarget | Pass/HTTP200/complete/stop | **Fail** — unsupported raw-verbatim/future-file constraints; current facts preserved |3869|api-e2e-evidence/sr022-budget-diagnostics/F-withTarget.json; semantic-adjudication.md|
| SR022-D02 F-withoutTarget | Pass/HTTP200/complete/stop | Pass — scoped good/usable |3410|api-e2e-evidence/sr022-budget-diagnostics/F-withoutTarget.json|
| SR022-D03 R-withoutTarget | Pass/HTTP200/complete/stop | Pass — correction and planned/completed fidelity |2766|api-e2e-evidence/sr022-budget-diagnostics/R-withoutTarget.json|
| SR022-D04 R-withTarget | Pass/HTTP200/complete/stop | Pass — correction and planned/completed fidelity |2875|api-e2e-evidence/sr022-budget-diagnostics/R-withTarget.json|

All planned arms completed,4outbound total,0additional/retry/substitute generation; no first-summary generation. Raw records preserve capture-time pending labels; this final table/manual artifact adjudicates them without rewriting output. Guard10Pass; final mechanical campaign1Pass is not manual semantic Pass. First setup collection failure/no calls and offline import-path correction retained separately; all owned resources cleaned. comparison.json distinguishes code points/UTF16/reasoning usage. No causal/rate/acceptance conclusion. SR022-Q01 observation to ongoing Designer only. API005 still interrupted/no rescore; no new API006.

SR022 ordinary evidence reply confirmed accepted=true / DELIVERED to sole /solution_designer, existing run solution_designer_e86db51ce2a24b15abe56a98c9c8114f;327 references attached. No formal API result/rescore or Delivery request. Receipt: api-e2e-evidence/sr022-budget-diagnostics/coordination-receipt.json. Diagnostic stage ends; no additional provider calls allocated.

## API005 resumed after CRR008 — planned current cases
C01 prerequisites Not Tested; C13 strategy/SDK Not Tested; C14 native/queue/ingress/races Not Tested; C06 web projections Not Tested; C05/C11 preserved API/history Not Tested; C09 isolated full product Not Tested; C08 separately bounded representative semantics Not Tested/no remote budget allocated. Detailed intended assertions/validity in ir005-resume/plan.md. Prior API005 interruption/history preserved; no new score yet.

API005 resumed API-C01 Started; evidence ir005-resume/API-C01.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/unit/secret-management/live-e2e-harness.test.ts', 'tests/unit/secret-management/live-e2e-compaction-boundary.test.ts', 'tests/unit/secret-management/live-e2e-compaction-observation.test.ts', '--no-watch'].

API005 resumed API-C01 completed exit0; Pass for executed assertions only; ir005-resume/API-C01.log/.json. No overall result inferred.

API005 resumed API-C13 Started; evidence ir005-resume/API-C13.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/unit/memory/direct-llm-compression-strategy.test.ts', 'tests/unit/memory/pending-compaction-executor.test.ts', 'tests/unit/memory/memory-manager-compaction-coordinator.test.ts', 'tests/unit/memory/compaction-content-builder.test.ts', 'tests/unit/llm/api/compaction-single-attempt-transport.test.ts', '--no-watch'].

API005 resumed API-C13 completed exit0; Pass for executed assertions only; ir005-resume/API-C13.log/.json. No overall result inferred.

API005 resumed API-C14 Started; evidence ir005-resume/API-C14.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/unit/agent-execution/agent-run-compaction-recovery.test.ts', 'tests/unit/agent-execution/agent-run-compaction-races.test.ts', 'tests/unit/agent-execution/root-recovery-command.test.ts', 'tests/unit/agent-execution/input/agent-run-input-admission-state.test.ts', '--no-watch'].

API005 resumed API-C14 completed exit0; Pass for executed assertions only; ir005-resume/API-C14.log/.json. No overall result inferred.

API005 resumed API-C14-core Started; evidence ir005-resume/API-C14-core.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/integration/agent/runtime/agent-runtime-compaction.test.ts', 'tests/unit/agent/runtime/agent-runtime.test.ts', 'tests/unit/agent/runtime/agent-worker.test.ts', 'tests/unit/agent/llm-request-assembler.test.ts', 'tests/unit/agent/compaction', 'tests/unit/agent/status', '--no-watch'].

API005 resumed API-C14-core completed exit0; Pass for executed assertions only; ir005-resume/API-C14-core.log/.json. No overall result inferred.

API005 resumed API-C06 Started; evidence ir005-resume/API-C06.log; command ['pnpm', 'run', 'test:nuxt', 'services/agentStreaming/handlers/__tests__/agentInputStateHandler.spec.ts', 'services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts', 'services/agentStreaming/__tests__/AgentStreamingService.spec.ts', 'services/agentStreaming/__tests__/TeamStreamingService.spec.ts', 'services/teamExecution/__tests__/teamExecutionViewState.spec.ts', 'services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts', 'services/agentOrgExecution/__tests__/agentOrgComposerSubmission.spec.ts', 'services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts', 'stores/__tests__/agentRunStore.spec.ts', 'components/conversation/__tests__/UserMessage.spec.ts', 'components/agentInput/__tests__/AgentUserInputTextArea.spec.ts', '--run'].

API005 resumed API-C06 completed exit0; Pass for executed assertions only; ir005-resume/API-C06.log/.json. No overall result inferred.

API005 resumed API-C05 Started; evidence ir005-resume/API-C05.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/e2e/server-settings/server-settings-graphql.e2e.test.ts', 'tests/unit/agent-execution/compaction', 'tests/unit/agent-memory/agent-memory-service.test.ts', 'tests/unit/agent-memory/agent-run-memory-recorder.test.ts', '--no-watch'].

API005 resumed API-C05 completed exit0; Pass for executed assertions only; ir005-resume/API-C05.log/.json. No overall result inferred.

API005 C09 isolated worktree build/start started; remote generation budget0, no browser action before readiness; owned lifecycle only.

API005 C09 worktree build/start Pass: iso-65100-17c1, control65100/server65101; browser health/list successful. Synthetic emulator starting disarmed; no generation yet.

API005 resumed API-C11 Started; evidence ir005-resume/API-C11.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/unit/memory/working-context-snapshot-store.test.ts', 'tests/unit/memory/native-working-context-snapshot-shapes.test.ts', 'tests/unit/memory/native-working-context-snapshot-v5-converter.test.ts', 'tests/unit/memory/memory-manager-working-context-snapshot-persistence.test.ts', 'tests/unit/memory/working-context-snapshot-bootstrapper.test.ts', 'tests/unit/memory/working-context-snapshot-serializer.test.ts', 'tests/unit/agent/bootstrap-steps/working-context-snapshot-restore-step.test.ts', 'tests/integration/agent/working-context-snapshot-restore-flow.test.ts', '--no-watch'].

API005 resumed API-C11 completed exit1; Fail; current assertion/origin triage required; ir005-resume/API-C11.log/.json. No overall result inferred.


API005 C11 coverage decision: Needs Update. Current run134Pass/1Fail: restore-flow expects schema_version on current writer output, contrary to approved SR017/028 current versionless {agent_id,messages}, AC008/012. Test constructs current serializer output, not released-v5 fixture. Replace stale title/key expectation; preserve restore/continuation assertions. No production failure asserted. This adds one durable path to eventual cumulative test review. Original bytes/log retained.

API005 resumed API-C11-corrected Started; evidence ir005-resume/API-C11-corrected.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/integration/agent/working-context-snapshot-restore-flow.test.ts', '--no-watch'].

API005 resumed API-C11-corrected completed exit0; Pass for executed assertions only; ir005-resume/API-C11-corrected.log/.json. No overall result inferred.


API005 C09 / API-F007 coverage investigation before durable edit/reroute:
- Valid supported scenario: user sets positive effective context ceiling in normal Compaction Settings (REQ008, AC010; related settings persistence AC012).
- Observed UI save16000 rejected twice with credential-editor warning; public GraphQL reproduces identical rejection, current setting remains absent. Typed draft is not persisted.
- Preliminary Local Fix, production server settings classification. SENSITIVE_SETTING_NAME contains unanchored TOKEN, matches TOKENS in AUTOBYTEUS_ACTIVE_CONTEXT_TOKENS_OVERRIDE before registered editable metadata. This is not an actual credential and not a model/API outage.
- Existing C05 GraphQL tuple lifecycle is Still Valid but insufficient: it only updates COMPACTION_MODEL_SETTINGS, not the numeric context control. Add Durable Coverage in same API-owned GraphQL test for positive numeric save/list and ordinary secret-name rejection control. Do not weaken production security guards here.
- Emulator disarmed after3 scripted parent seeds/0compactions, no remote calls. Full C09 recovery/attachments/reconnect/cancellation phases Not Tested, stopped at valid settings failure per manifest. No app-state injection or config-file workaround.

API005 resumed API-F007-regression Started; evidence ir005-resume/API-F007-regression.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/e2e/server-settings/server-settings-graphql.e2e.test.ts', '-t', 'numeric compaction context ceiling|credential-like settings', '--no-watch'].

API005 resumed API-F007-regression completed exit1; Fail; current assertion/origin triage required; ir005-resume/API-F007-regression.log/.json. No overall result inferred.

API005 resumed API-C05-final Started; evidence ir005-resume/API-C05-final.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/e2e/server-settings/server-settings-graphql.e2e.test.ts', '--no-watch'].

API005 resumed API-C05-final completed exit1; Fail; current assertion/origin triage required; ir005-resume/API-C05-final.log/.json. No overall result inferred.


API005 final C09: Fail / API-F007 / REQ008 AC010 (related AC012). Two actual UI attempts and one public HTTP reproduction reject positive numeric context ceiling as credential; no persistence. 3 local scripted parent requests,0compactor,0remote. Remaining heldA/B/attachment/retry/post-response/cancel/reconnect/resume phases Not Tested, not silently passed. Stop condition applied.
API005-LF001 / C11: original134Pass/1stale schema assertion Fail retained; approved versionless correction1Pass. New durable path requires review.
API005 cleanup: iso-65100-17c1 stopped normally, own data removed;65100/65101/65300 released, emulator stopped/disarmed. Source unchanged; owner evidence/fixtures retained.
API005 completed overallFail78.6,542distinct selectedPass/1Fail. Code Reviewer focused origin review requested; no Delivery or successful ten-path test review.


API005 routing confirmed: get_handoff_rules selected the sole executable-Fail rule to /code_reviewer; send_message_to accepted=true / DELIVERED to code_reviewer_7bd4b2c09af543088c0238d792d0fd98, full799 references attached. Focused API-F007 origin review only; no other outcome recipient, no Delivery/successful-test review. API stage stops after this confirmed handoff.

# API-REV-006 planned cases (not yet executed)
C05/F007 regression; C05 settings persistence; C09/F007 actual Save/readback/reopen; C09-H held A/attachment/later B; C09-P consumed-A gate; C09 cancellation/stop/reconnect; C10 saved resume. Each requires direct evidence, no previous result promoted. Remote0; see api-rev-006/plan.md.

API006 API-F007-regression Started; evidence api-rev-006/API-F007-regression.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/e2e/server-settings/server-settings-graphql.e2e.test.ts', '-t', 'numeric compaction context ceiling|credential-like settings', '--no-watch'].

API006 API-F007-regression completed exit0; Pass for executed assertions only; api-rev-006/API-F007-regression.log/.json. No overall result inferred.

API006 API-C05 Started; evidence api-rev-006/API-C05.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/e2e/server-settings/server-settings-graphql.e2e.test.ts', 'tests/unit/services/server-settings-service.test.ts', 'tests/integration/services/server-settings-service.integration.test.ts', 'tests/unit/config/app-config.test.ts', 'tests/unit/api/graphql/types/server-settings.test.ts', '--no-watch'].

API006 API-C05 completed exit0; Pass for executed assertions only; api-rev-006/API-C05.log/.json. No overall result inferred.
API006 C05 complete:5files93Pass; prior F007 exact focused2Pass included, not additive. Actual F007 UI closure unresolved. Post-repository confidence82.1%, broader Required (investigation scorecard), before isolated build starts.
API006 emulator offline guard:7 protocol checks Pass,4 accepted synthetic generations in separate guard process, remote0; child stopped. Valid parser/SSE/failure/hold-release/disarm guards, not actual product evidence. Main fixture still not started. C09 supported-trigger sequence refined before generation in plan.
API006 C09/F007 Pass: rebuilt iso-50926-5811 normal UI Save16000→disabled clean button/no error→leave/reopen16000; independent real HTTP readback shows exact public key16000/editable. Prior API005 failure unchanged; source correction actual product closure now evidenced. Clearing through same UI before seed setup. No generation yet. Evidence F007-save/readback/reopen/http-readback/clear.
API006 C09 seed checkpoint:3 UI seed turns/3 parents, no compaction. First threshold-control TRIGGER0 consumed once (parent4) but no compaction: actual budget logs show reserved_output_tokens0, input15744, threshold12595 > observed10197. Earlier assumption8192 parent reserve was false (compactor cap is separate). No failure/gate Pass claimed. Before next input adjust only normal public cap12000 (threshold9395) to reach deterministic local scenario, retain TRIGGER0 evidence; same40 local budget, no remote inference/adaptive semantic campaign.
API006 C09-P checkpoint: public cap12000→TRIGGER1 parent once then3 compactor503s; actual UI response retained, error diagnostic/FAILED turn0005 and enabled composer target with retry guidance (empty send disabled appropriately).5parents/3compactions. No later autonomous attempts before next admission. Not yet complete replay/reconnect proof; inspect attachment and submit A through UI next.
API006 C09-H checkpoint: A plus context.txt admitted through normal Send, post-response gate retried3times503 before parent. UI displays A once, Held—waiting for compaction, attachment intact;5parents/6compactions, no ACK A. Initial A action while Files overlay covered composer was rejected by browser helper (no submission); close normal backdrop then send succeeded. Attachment added by synthetic DOM dragstart/drop from real workspace file node; desktop physical drag hit-testing is not independently proven. Before success, use B with unchanged503 for renewed-failure coverage, then C success, all within40. This tests A/B retention/no auto drain and reconnect before recovery.
API006 renewed failure checkpoint: B admission→3 additional compactor503s, cumulative5parents/9compactions, A still one held bubble with context.txt, B one queued bubble, no parentA/B. No extra cycle while idle. Same-live-process reconnect next; no backend restart or queued durability claim.
API006 C09-H/P scoped Pass: same-process reload restored held A + attachment and queued B with no new calls. C started one held-success request; busy UI showed Compacting plus B/C queued and Stop generation (not arbitrary busy-send). Release→one accepted summary→A/B/C once, parent dispatch IDs16/17/18 after compactor15. Actual wire A includes original text and owned context.txt contents/HX-204. Exactly one raw user ingestion each A/B/C across active/archive. TRIGGER1 consumed once, not replayed. Current snapshot exact2keys and one summary. Groups3/3/3/1,10compactor/8parent, remote0. Temporary evidence decoder initially assumed max_tokens; actual LM Studio uses max_completion_tokens8192, corrected after inspecting wire, initialKeyError retained; not product failure.
API006 cancellation checkpoint: D parent9 naturally exhausted3compactions; E began pre-parent held compactor23. Real Stop generation aborted request, no retry/parent, late release discarded closed response. Snapshot raw byte comparison differs only because normal cancellation appends one system interrupt note; first17messages remain exact, no summary replacement. Do not misclassify legitimate lifecycle note as late commit. F fresh admission will verify cancelled E never dispatches and gate remains recoverable.
API006 cancellation scoped Pass: fresh F caused compactor24 then parent25/F only; no E parent/retry-after-cancel. All17preexisting snapshot messages unchanged across cancel; one cancellation note, aborted23/late response discarded. Repeated compaction carries prior summary; canned output is protocol fixture not semantic fidelity. Next terminate a blocked recovery through normal Terminate run to test waiter shutdown, then saved resume.
API006 termination checkpoint: G post-response3fail; H pre-parent request30 held. Normal Terminate run returned Offline promptly, request30 aborted and late release discarded, no deadlock/no H parent. Reload stopped saved run remained Offline and generation count30 unchanged. Historical inline compaction card still says Compacting for stopped turn0013 while actual header/composer are Offline/send; investigate as user-surface residual (do not count terminal banner correctness Pass). Saved continuation I next; no restart-durable queue claim.

API006 API-C14 Started; evidence api-rev-006/API-C14.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/unit/agent-execution/agent-run-compaction-recovery.test.ts', 'tests/unit/agent-execution/agent-run-compaction-races.test.ts', 'tests/unit/agent-execution/root-recovery-command.test.ts', 'tests/unit/agent-execution/input/agent-run-input-admission-state.test.ts', '--no-watch'].

API006 API-C14 completed exit0; Pass for executed assertions only; api-rev-006/API-C14.log/.json. No overall result inferred.

API006 API-C14-core Started; evidence api-rev-006/API-C14-core.log; command ['pnpm', 'exec', 'vitest', 'run', 'tests/integration/agent/runtime/agent-runtime-compaction.test.ts', 'tests/unit/agent/runtime/agent-runtime.test.ts', 'tests/unit/agent/runtime/agent-worker.test.ts', 'tests/unit/agent/llm-request-assembler.test.ts', 'tests/unit/agent/compaction', 'tests/unit/agent/status', '--no-watch'].

API006 API-C14-core completed exit0; Pass for executed assertions only; api-rev-006/API-C14-core.log/.json. No overall result inferred.

API006 API-C06 Started; evidence api-rev-006/API-C06.log; command ['pnpm', 'run', 'test:nuxt', 'services/agentStreaming/handlers/__tests__/agentInputStateHandler.spec.ts', 'services/agentStreaming/handlers/__tests__/agentStatusHandler.spec.ts', 'services/agentStreaming/__tests__/AgentStreamingService.spec.ts', 'services/agentStreaming/__tests__/TeamStreamingService.spec.ts', 'services/teamExecution/__tests__/teamExecutionViewState.spec.ts', 'services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts', 'services/agentOrgExecution/__tests__/agentOrgComposerSubmission.spec.ts', 'services/agentOrgExecution/__tests__/agentOrgContextHydration.spec.ts', 'stores/__tests__/agentRunStore.spec.ts', 'components/conversation/__tests__/UserMessage.spec.ts', 'components/agentInput/__tests__/AgentUserInputTextArea.spec.ts', '--run'].

API006 API-C06 completed exit0; Pass for executed assertions only; api-rev-006/API-C06.log/.json. No overall result inferred.

API006 C10 saved-resume scoped Pass: saved reopen emitted0generation; authorized I resumed same saved run, parent31 then post-response compactor32. No E/H parent dispatch,14 unique raw user traces, one final summary/exact two snapshot keys. Old turn0013 spinner remains through Offline/reopen/Idle; SR032 declares intended historical treatment pending DEC03201, neither approved failure nor Pass/waiver.
API006 repository reconciliation: C05 5/93, C14 4/23, core8/55, C06 11/175 =28files/346distinctPass; focused2subset excluded. Seven temporaryguardchecks/4localgeneration separate; actual product32local (12parent20compaction), remote0. Fullsuite not run. C08 current real semantic Not Tested; physical native drag/crash/completeTeamOrgUI Not Tested. No new budget.
API006 cleanup Pass: own iso-50926-5811 stopped normally, own data removed,50926/50927/51087 released; disarmed owned fixture stopped. All captures retained. API006 current checkpoint incomplete pending authority, not a completed result. Interim mandatory post-broader90.7 does not replace latest completedAPI005Fail78.6.


API006 clarification handoff confirmed accepted=true / DELIVERED to sole /solution_designer, existing run solution_designer_e86db51ce2a24b15abe56a98c9c8114f;1042 cumulative references attached. Selected requirement/test-validity gap rule, not executable failure or successful test review. API006 remains incomplete / DEC03201 pending; latest completedAPI005Fail78.6 unchanged. Receipt api-e2e-evidence/api-rev-006/handoff-receipt.json. No additional recipient or campaign; stage stops pending owner return.


## SR033 evidence-provenance correction — supersedes reconnect/reopen claims below
Evidence-only review found ui-40 and ui-59 retain authored reload-request labels, not exact JavaScript/navigation/context-reset or GetRunProjection responses. Completed live reconnect and saved-reopen hydration were overstated and are withdrawn as proven product cases; old-card durable replay provenance is **unproved**. Later same-tab DOM, actual termination/abort/no H dispatch and new-I runtime continuation remain observed. Count30 stayed unchanged during the observation interval, but that alone does not prove a real reopen. Prior interim90.7 is withdrawn as a current assessment; no new final score/result. SR033 user-approved **Stopped**/no spinner/history retained is acknowledged, design investigation pending; no normative validation resumed. Full clarification: api-e2e-evidence/api-rev-006/sr033-evidence-clarification/README.md. Original artifacts unchanged; latest completedAPI005Fail78.6 remains.


## API006 IR007-resume planned cases (not yet executed)
| Case | Required oracle | State |
| --- | --- | --- |
| C06-F | Reproduce8 strict fixture failures; repair idle snapshot only;8 original assertions pass | Not Tested |
| C14-T-core | Owner abort/commit precedence and current native recovery regression | Not Tested |
| C14-T-server | Real native pump/AgentRun return ordering, held-A recovery termination/no late commit | Not Tested |
| C06-T | Three command owners, exact scope/stale guards, actual Org stage/commit/adopt, terminal rendering/history | Not Tested |
| C06-S | Current standalone/Team/Org strict stream contracts | Not Tested |
| C09-T-agent | Real recovering standalone Terminate, exact Stopped/no spinner/no dispatch/late commit | Not Tested |
| C09-T-team | Real recovering Team Terminate and all member activity outcome | Not Tested |
| C09-T-org | Real recovering Org Terminate, inspection publication retaining terminal native facts | Not Tested |
| C09-R / C10 | Actual live reconnect and saved selection/cold hydration; response/navigation/no-generation and separate new runtime | Not Tested |
New results append immediately after execution. Earlier unsupported/withdrawn claims stay superseded.

API006 IR007 C06-F-before Started; exact argv in ir007-resume/C06-F-before.json.

API006 IR007 C06-F-before completed exit1; Fail; investigate origin/fixture validity; ir007-resume/C06-F-before.log/.json. No overall Pass.

API006 IR007 C06-F-after Started; exact argv in ir007-resume/C06-F-after.json.

API006 IR007 C06-F-after completed exit0; Pass scoped to executed assertions; ir007-resume/C06-F-after.log/.json. No overall Pass.

API006 IR007 C14-T-core Started; exact argv in ir007-resume/C14-T-core.json.

API006 IR007 C14-T-core completed exit0; Pass scoped to executed assertions; ir007-resume/C14-T-core.log/.json. No overall Pass.

API006 IR007 C14-T-server Started; exact argv in ir007-resume/C14-T-server.json.

API006 IR007 C14-T-server completed exit0; Pass scoped to executed assertions; ir007-resume/C14-T-server.log/.json. No overall Pass.

API006 IR007 C06-T Started; exact argv in ir007-resume/C06-T.json.

API006 IR007 C06-T completed exit0; Pass scoped to executed assertions; ir007-resume/C06-T.log/.json. No overall Pass.

API006 IR007 C06-S Started; exact argv in ir007-resume/C06-S.json.

API006 IR007 C06-S completed exit0; Pass scoped to executed assertions; ir007-resume/C06-S.log/.json. No overall Pass.

IR007-resume offline fixture guard:7 checks Pass,4 accepted local generations in separate child, remote0; child terminated normally. No product requests yet. Review31 source/test hashes match CRR011; 8 retained-activity assertions now pass. Owned isolated-app worktree build in progress; no product acceptance yet.

C09-R current attempt: exact submitted location.reload script retained, but followup timeOrigin/observer marker unchanged; NO renderer reload/reconnect proved. Source workspace-shell-window.ts will-navigate prevents navigation. Supported browser CLI navigate rejects file:// INVALID_URL. These are surface limitations, not new compaction failure. Continue actual saved selection and documented isolated-app restart after termination for genuine cold hydration; same-live reconnect remains incomplete unless a supported surface is established. Current8local requests (2parent6compaction), heldA same runtime, no remote.

IR007-resume C09-T-agent scoped Pass: actual normal second Terminate command succeeded HTTP200 success=true at1790832203039; matching native Stopped received at1790832203008 (31ms before confirmation). Both actual consumers retain separate O1/O2 identity and facts with exact Stopped/neutral static icon. First termination also stopped and discarded late response9; first HTTP observer missed Apollo and is not used as command-confirmation proof. Parent requests1,2,10 only; no A/B/D/E parent dispatch. Second late-release was interrupted/not executed, not claimed.
C09-R scoped Pass for actual transport reconnect: close4001 at1790832169615 followed by normal new socket/CONNECTED and authoritative input snapshot1790832170620, same R2/revision12/heldDID. Counts16→16. This is NOT renderer reload: timeOrigin unchanged by design for transport loss. Failed renderer reload/navigation attempts retained as surface limitations.
C10 in-memory saved selection scoped Pass: actual navigation away/row selection ui31–33 consumed GetRunProjection/resume config; count9→9, known O1Stopped retained. This is not cold native replay. New authorized C then created distinct runtimeR2 and nativeO2 without relabeling oldO1. Cold hydration still pending.
Interruption recovery: ui43 action completed before user question, verified ui44 without repeated Terminate. Product request17 aborted05:23:23.002Z; fixture timer erroneously remained armed on closed response and fired05:25:05.848Z while the conversation was interrupted. Fixture closed fail-safe at17. No product timeout or guard waiver inferred; generation stopped. Continue generation-free cold hydration before deciding any local fixture repair. Evidence network-before-cold-restart and ui43–46; raw/snapshot preserved agent-final-files.


### API006-LF003 — temporary fixture interruption recovery (before edit)
C10 cold hydration now directly executed: documented isolated-app restart preserved owned data and produced new PID38011, tab058FB67A1696E17A8D8FE36226991FF8, timeOrigin1790832630961.6 vs1790831656458.9. Actual workspace/group/saved-row actions ui50–52 consumed HTTP200 GetRunProjection and GetAgentRunResumeConfig. No native compaction cards are replayed from cold storage (0 rows), ordinary saved messages present, generation17→17 and no rejected-generation log. This is expected native non-persistence, not card deletion/skip hydration. Source did not change.
LF003 identified timer cleanup error in temporary fixture: close handler logged request17 abort but left timer active, so a completed product termination later tripped the fixture during user interruption. Old fixture stays closed and evidence immutable. Stop old owned PID45034; create corrected temporary fixture with timer cleared on client abort while retaining held response for explicit discarded-late-response assertion. No product, durable suite, prompt or default changed. Re-run separate guard incl abort/wait/release before product continuation.
Environment recovery keeps SAME original40 product-request ceiling, initial count17 (parent3/compaction14), and absolute deadline2026-10-01T06:11:41.948Z; no budget reset/extension and remote0. New process uses same freed owned port51536 to preserve UI-selected model identity. Distinct output subdirectory fixture-continuation; first requestID18. Stop on any unexplained guard or product failure. This is justified local fixture repair after inspecting source/wire, not waiver of a product timeout. Full Team/Org checks remain unstarted and may be limited by remaining23requests.

C09-T-team actual control scoped Pass: two-member Team with coordinator recovering and second inactive; exact normal Terminate team click ui73, native stopped149 received1790832942251 before actual HTTP200 success2298 (47ms). Both real renderers static Stopped/same op o1sc_1/turn0003/raw3, no spinner ui74. Request26 aborted, late release discarded, before-snapshot5messages preserved exactly as prefix of6 (normal lifecycle note); no summary committed. Requests26/parents5 unchanged; no TEAM-A/B parent. This proves one recovering member within real two-member scope, NOT all-members-concurrently-recovering or seven-member Org UI. Team saved inspection/hydration not yet independently asserted.

C09-T-org scoped Pass: real Org with direct root plus two-member Team (3 configured agents), root recovering on A/B; actual Stop Agent Org retires socket1000 at1790833437571, then commandHTTP200 success=true1790833437634, actual GetAgentOrgRunInspection1790833437646, all3 member projections7652/7653. No terminal WS event received after deliberate retirement (not treated as loss/failure); confirmed-success store reconciliation retains native oldop s66l_1 through real history publication. UI94 modehistory and UI95 both consumers Stopped, turn0003/raw3/sameidentity, gray staticicons/animationnone. Request35 abort plus late response discarded; baseline5messages retained as prefix6normalterminationnote/no summary. No ORG-A/B parent,35requests7parent28compaction. Actual saved-row selection ui96–97 also captured; all-member simultaneous recovery/seven-member product fixture not claimed.

C10 Team/Org cold-reader extension planned before action: all owned runtimes successfully terminated, preserve originaldata, second documentedrestart then select Team/Org saved rows through normal sidebar. Install passive response observer beforeselection; compare freshcontextmarkers, actual rootinspection/memberprojections and counts35unchanged. Expect cold-nativeabsence (not preservation invented); in-memoryStopped proofsabove remain distinct. No new generation planned.

C10 cold Team/Org scoped Pass: second documentedrestart produced PID516/tab0748F33CFBF34DFF5819FCF40B0907F2/timeOrigin1790833550482.1. Exact sidebar group/row/member actions ui102–107; normal Team resumeconfig+both memberprojections and Org inspection+all3 projections200, observedsavedmessagehistory/nativecards0. Originalgeneration35→35, no guard rejection. No livequeued durability/powerloss/nativecold persistence claim.
Final temporary evidence assertions:37Pass, terminal-assertions.json. Initial decoder KeyError because one capture directly contained events rather than observer wrapper; retained initialscript/log, corrected decoder shape only, no artifact/result mutation. Org screenshot inspected: Offline header, both neutralStopped displays/facts visible; presentationoverlay expected, not animationproof (computedDOM is).
All selected local productjourneys ended with confirmedterminated owners. Disarmed fixture at35/40,7parent28compaction, remote0; no further generation requested. Safe cleanup now.

API006 final: repoC06-F/C14-T-core/C14-T-server/C06-T/C06-S Pass scoped; actual C09-T-agent/team/org/C09-R/C10 Pass with above limits. C08 currentsemantic Blocked for new authorizedbudget/isolatedcredentials. OverallBlocked89.3, notPass. OwnedcleanupPass; no matchinghandoff/no recipient. Canonicalreport authoritative.


# API-REV-007 planned (approved continuation)
C01 repository; C02 guard; C08-P isolated import/preflight; C08-F real low-threshold flow; C08-Q real first/repeated; C08-M manual semantic; C99 cleanup. All pending; no inferred Pass. Manifest frozen13calls/12minutes. Original credential authorization found and current approval received; API006 permission premise corrected.

API007-C02 Pass:14 temporary guard checks/1file, guard.log/exit0. Initial root-cwd launcher failure (vitest unavailable) retained guard-wrong-cwd.log; corrected to documented server cwd, no provider calls. Guard work performed before durable suites to validate operational wrapper; no durable edits.

API007-C01 boundary checkpoint Pass10/2files, repo-boundary.log/exit0; no provider traffic. Broader harness next.

API007-C01 completed Pass28/3files (10+18). C02 Pass14/1temporary. Post-repository89.3/BroaderRequired. C08-P importer preview starting; source statonly validregular0600, target absent.

API007-C08-P preview exit0: INITIALIZATION_REQUIRED,10 recognized aliases CREATE,0replace/blocked; includes provider.deepseek.api-key. Source values never printed/read outside importer. No generations or database creation during dry-run. Proceed operator import into exact new target only.

API007-C08-P import confirmed: READY/10configured/0replaced, DeepSeek included. Documented importer only, explicit target and TTY IMPORT; all vault resources test-owned. Fresh source build/bootstrap exit0. Starting normal builtserver/registered preflight then bounded flow and quality; other9 imported aliases never selected.

API007-C08 preflight started 2026-10-01T06:18:32.368Z; global13call/12minute bound, manifest frozen.

API007-C08 preflight completed exit 0; api-rev-007/preflight.log. Manual semantic adjudication pending; exit does not decide acceptance.

API007-C08 flow started 2026-10-01T06:18:36.638Z; global13call/12minute bound, manifest frozen.

API007-C08 flow completed exit 0; api-rev-007/flow.log. Manual semantic adjudication pending; exit does not decide acceptance.

API007-C08 quality started 2026-10-01T06:19:00.675Z; global13call/12minute bound, manifest frozen.

API007-C08 quality completed exit 0; api-rev-007/quality.log. Manual semantic adjudication pending; exit does not decide acceptance.

API007-C08-P Pass:importer/preflightREADY. C08-F Pass:2checks/4actualturns/8parent1summary/5%crossing/exactartifact. C08-Q Pass:1case/2distinctsummaries/actualfirstinrepeatonce. C08-M manualscopedPass/minorwording-density limits. C99Pass: ownedruntime/db/key/workspace/serverremoved/portreleased/sourceStatunchanged.39offlineassertionsPass separate.11calls/42.732live seconds. Cumulative92.9/Incomplete/BroaderRequired, NOTpermissionBlocked oroverallPass. RemaininglocalTeamOrg/recovery/consumed-toolUI/lifecycle/residualcoverage required.
