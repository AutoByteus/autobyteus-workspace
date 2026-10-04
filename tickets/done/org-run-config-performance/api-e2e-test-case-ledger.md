# API/E2E Test-Case Ledger

Round 1, initial API-REV-001 planned; initialized before durable edits/execution. Expected results derive from SR-006 / SR-010, not historical test mechanisms. Not Tested means no completed attempt, not Pass. During long cases append checkpoints; outputs retained under evidence/. 

| Case | Expected | Result | Evidence / checkpoint |
|---|---|---|---|
| API-001 | Current narrow server UUID/readiness/history/shared lifecycle regressions pass | Pass | evidence/api-server-narrow.log; 11 files / 68 tests |
| API-002 | Current 30 Nuxt field/history/freshness/publication/context regressions pass | Pass | evidence/api-web-narrow.log; 30 files / 427 tests |
| API-003 | Current server build/bootstrap and capability GraphQL contract pass | Pass | evidence/api-server-build.log; api-capability-e2e.log 4 tests (in-process schema/provider) |
| API-004 | Real HTTP single-root parity/isolation/null/error/Stop/restart and stored bytes/IDs | Pass | evidence/api-scoped-history-e2e.log; native deterministic domain-contract only, not exact Codex product proof |
| API-005 | Existing real HTTP stopped-Org workspace/config lifecycle | Pass | evidence/api-stopped-workspace-e2e.log; 1 test (native deterministic domain) |
| API-006 | Updated two renderer probe consumers and retained client models/approval | Pass | existing 6 cases + fresh warm 8 cases; initial Nuxt reload failure retained, not suppressed |
| API-007 | Current packaged imported Org/Team exact Codex/GPT-6.1 Sol; config/inheritance/error/retry/admission; recipient-free no-inference launch | Fail | F-API-001 inherited catalog recovery; Team/override paths incomplete |
| API-008 | Comparable baseline/changed 5 warm+5 cold small/~500 stored roots, exact row/phase/work proof | Not Tested | Partial:20 row samples/zero collision reads; cold config clocks incomplete |
| API-009 | Real freshness/checkpoint/task/collaborator/ACK/Stop/restore/focus/reference/enrichment/continuity | Not Tested | Partial:public create/Stop/bytes; actual event chain unstarted after failure |
| API-010 | All owned processes/data/hooks closed; user app untouched | Pass | evidence/api-cleanup.json; actual verification completed after log-copy failure |
| API-011 | Fresh packaged process supported catalog-error Retry restores inherited ready scopes | Fail | evidence/api-packaged-retry-repro.json/png/log; F-API-001 |

## Events
- Investigation and case ledger persisted before any durable edit or execution. No prior completed API/E2E result.

- API-001 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "prebuild"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-prebuild.log. Case result requires reconciliation of all steps.

- API-002 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "exec", "nuxt", "prepare"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-nuxt-prepare.log. Case result requires reconciliation of all steps.

- API-001 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/unit/agent-execution/agent-run-identity-allocator.test.ts", "tests/unit/agent-org-execution/agent-org-execution-tree-location-service.test.ts", "tests/unit/agent-org-execution/agent-org-run-config.test.ts", "tests/unit/agent-org-execution/agent-org-run-service-model-selection.test.ts", "tests/unit/agent-org-execution/agent-org-run-service-history-order.test.ts", "tests/unit/run-history/services/collaboration-root-history-readiness.test.ts", "tests/unit/run-history/services/collaboration-root-history-scoped.test.ts", "tests/unit/runtime-management/runtime-availability-service.test.ts", "tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts", "tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts", "tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-server-narrow.log. Case result requires reconciliation of all steps.

- API-003 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "build:full"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-server-build.log. Case result requires reconciliation of all steps.

- API-002 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:nuxt", "stores/__tests__/runtimeCapabilitiesStore.spec.ts", "stores/__tests__/agentOrgHistoryApollo.spec.ts", "stores/__tests__/runHistoryStore.spec.ts", "stores/__tests__/runHistoryNavigationProjection.spec.ts", "stores/__tests__/agentOrgContextsStore.spec.ts", "stores/__tests__/agentOrgInspection.spec.ts", "stores/__tests__/agentOrgRetainedRecovery.spec.ts", "stores/__tests__/agentOrgRunConfigPublication.spec.ts", "services/agentOrgExecution/__tests__/agentOrgComposerSubmission.spec.ts", "services/agentOrgExecution/__tests__/agentOrgContextFiles.spec.ts", "services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts", "services/agentOrgExecution/__tests__/agentOrgRunConfigAdoption.spec.ts", "composables/__tests__/useRuntimeScopedModelSelection.spec.ts", "components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts", "components/launch-config/__tests__/RuntimeCapabilityReadiness.spec.ts", "components/workspace/config/__tests__/AgentOrgOwnedLaunch.spec.ts", "components/workspace/config/__tests__/AgentOrgSeededLaunch.spec.ts", "components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts", "components/workspace/config/__tests__/AgentOrgRunConfigForm.spec.ts", "components/workspace/config/__tests__/AgentRunConfigForm.spec.ts", "components/workspace/config/__tests__/MemberOverrideItem.spec.ts", "components/workspace/config/__tests__/MemberOverridesDisclosure.spec.ts", "components/workspace/config/__tests__/TeamRunConfigForm.spec.ts", "components/workspace/config/__tests__/TeamScopeConfigEditor.spec.ts", "components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts", "components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts", "components/workspace/history/__tests__/WorkspaceHistoryFamilyPublication.spec.ts", "services/chat/__tests__/chatLaunchService.spec.ts", "stores/__tests__/chatDraftStore.spec.ts", "tests/integration/web-boundary-guard.integration.test.ts", "--run"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-web-narrow.log. Case result requires reconciliation of all steps.

- API-003 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-capability-e2e.log. Case result requires reconciliation of all steps.

- API-004 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-scoped-history-e2e.log. Case result requires reconciliation of all steps.

- API-005 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-stopped-workspace-e2e.log. Case result requires reconciliation of all steps.

2026-10-03T20:40:49.661Z API-E2E-004-A: Pass; Agent Settings loads network-fresh, locks runtime identity, and saves a same-model selection; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model/existing-run-model-config-evidence.json

2026-10-03T20:40:50.218Z API-E2E-004-B: Pass; Flat Team Settings renders root plus direct Agents and saves one exact configured-Agent patch; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model/existing-run-model-config-evidence.json

2026-10-03T20:40:50.290Z API-E2E-004-C: Pass; Narrow browser viewport keeps the existing Team Settings editor usable without page overflow; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model/existing-run-model-config-evidence.json

2026-10-03T20:40:50.755Z API-E2E-004-D: Pass; A supported external activation makes an already-open Agent Save return RUN_ACTIVE and relock; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model/existing-run-model-config-evidence.json

2026-10-03T20:40:51.678Z API-E2E-004-E: Pass; Compatible Agent replacement uses keyboard selection, target defaults and the complete canonical pair; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model/existing-run-model-config-evidence.json

2026-10-03T20:40:52.331Z API-E2E-004-F: Pass; Flat Team replacement preserves divergent and directly edited Agents and verifies one all-scope save with Retry; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model/existing-run-model-config-evidence.json

- API-006 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:e2e:existing-run-model-config", "--output-dir", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model", "--ledger-file", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-existing-model-probe.log. Case result requires reconciliation of all steps.

2026-10-03T20:41:32.568Z B08: Pass; Dedicated mobile Agent/Team setup defaults and helper agree; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval/fresh-run-auto-approval-evidence.json

2026-10-03T20:41:33.219Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval/fresh-run-auto-approval-evidence.json

2026-10-03T20:41:34.046Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval/fresh-run-auto-approval-evidence.json

2026-10-03T20:41:34.759Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:06.089Z B04: Fail; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval/fresh-run-auto-approval-evidence.json

- API-006 command checkpoint: Fail exit 1; ["pnpm", "-C", "autobyteus-web", "test:e2e:fresh-run-auto-approval", "--output-dir", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval", "--ledger-file", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-probe.log. Case result requires reconciliation of all steps.

2026-10-03T20:42:46.508Z B08: Pass; Dedicated mobile Agent/Team setup defaults and helper agree; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:47.159Z B01: Pass; Library Agent fresh true and first-send true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:47.973Z B02: Pass; Narrow Agent opt-out survives model/workspace/permitted runtime edits; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:48.682Z B03: Pass; Library Team root and inherited members submit true; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:50.877Z B04: Pass; Team opt-out ordinary edits and explicit member false; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:52.018Z B05: Pass; Missing workspace blocks; Antigravity stays checked/locked; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:54.409Z B06: Pass; Chat Agent/Team true defaults and deliberate opt-out reach launch boundaries; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

2026-10-03T20:42:55.885Z B07: Pass; Existing draft false copied through RunningAgentsPanel; fresh session resets only fresh defaults; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm/fresh-run-auto-approval-evidence.json

- API-006 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:e2e:fresh-run-auto-approval", "--output-dir", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-warm", "--ledger-file", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-fresh-approval-probe-warm.log. Case result requires reconciliation of all steps.

- API-006 resolved local environment rerun: unchanged fresh-approval CLI, warmed dependency cache, eight cases Pass / cleanup closed; original B04 reload interruption remains retained at evidence/api-fresh-approval. No test/source assertion edits.

- API-007 packaged build/start completed exit 0; evidence/api-packaged-start.json and api-packaged-build.log. Journey unresolved.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup.log. Case result requires reconciliation of all steps.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup-retry.log. Case result requires reconciliation of all steps.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup-after-reload.log. Case result requires reconciliation of all steps.

- API-007 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup.mjs", "--already-imported"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-setup-resume.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-timing.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-small-timing.log. Case result requires reconciliation of all steps.

- API-007 setup resumed successfully through existing owned import + normal Org Library Reload; exact available Codex/GPT-6.1 Sol catalog and all 570 source hashes verified. Temporary mixed-selector/duplicate import/cache-preparation attempts retained; no product error inferred.
- API-008 small-history checkpoint Pass: current packaged 5 warm + 5 cold-renderer exact newly created rows/workspace, no SEND_MESSAGE frames; evidence/api-packaged-small-history.json. Parent comparative case remains unresolved pending stress/work counts.

- API-008 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-populate.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-population.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-timing.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-stress-timing.log. Case result requires reconciliation of all steps.

- API-007 PKG-01-unrelated-pending: Fail; evidence/api-packaged-functional.json.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional.log. Case result requires reconciliation of all steps.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional-runtime-corrected.log. Case result requires reconciliation of all steps.

- API-007 PKG-01-unrelated-pending: Pass; evidence/api-packaged-functional.json.

- API-007 PKG-02-selected-catalog-error-retry: Fail; evidence/api-packaged-functional.json.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional-route-synchronized.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-backend-trace.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-backend-install.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-backend-trace.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-backend-trace.log. Case result requires reconciliation of all steps.

- API-007 PKG-01-unrelated-pending: Pass; evidence/api-packaged-functional.json.

- API-007 PKG-02-selected-catalog-error-retry: Fail; evidence/api-packaged-functional.json.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-functional-catalog-labeled.log. Case result requires reconciliation of all steps.

- API-007 PKG-02 actual supported root Retry: selected catalog restores GPT-6.1 Sol but inherited `/product_team` schema retains outage diagnostic and Run disabled after 15 seconds. Parent Fail pending focused failure-origin evidence.
- API-011 planned: fresh renderer/backend process (normal owned restart, same unchanged package/data), reproduce selected-catalog error → root Retry → exact model; expected all inherited scopes recover without stale error.

- API-011 fresh packaged selected-catalog recovery: Fail; evidence/api-packaged-retry-repro.json + screenshot; no source/state edits or inference.

- API-011 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-retry-repro.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-retry-repro.log. Case result requires reconciliation of all steps.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-packaged-continuity.log. Case result requires reconciliation of all steps.

- API-009 final continuity attempt: 20 known old package byte assertions completed, then temporary query used nonexistent `org_definition_id` and failed schema validation; no destructive writes by probe. Final current-reader/restart case is partial, not Pass. The separate population receipt already proves old bytes through 500 stored roots. Isolated cleanup proceeded, data removed as intended; no artificial product failure is inferred from the query typo.
- API-010 cleanup complete: owned iso-64996-c89a stopped; ports64996/64997/9229 free, owned data root removed, backend hooks restored before restart; two initially absent SDK dist trees removed; all570 original source fixture hashes unchanged. evidence/api-cleanup.json.

- API-008 command checkpoint: Pass exit 0; ["python3", "tickets/in-progress/org-run-config-performance/evidence/api-summarize-performance.py"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api-performance-summary.log. Case result requires reconciliation of all steps.

- Round1 reconciled: API-REV-001 Fail77.14%; F-API-001 main supported failure; partial API008/009 retained. Current rule2 selects /code_reviewer. All owned execution stopped.

## Round2 — CRR003 / IR002 rerun (initialized before execution)
Prior APIREV001 Fail77.14 remains historical. Current case results unresolved until executed; do not reuse old binary or relabel source review as API resolution.
| ID | Expected | Round2 status |
|---|---|---|
| API-011 | First: rebuilt packaged real same-kind affected Org/member scopes recover exact schema via root/own member Retry; unrelated/invalid/edit failures remain blockers | Not Tested |
| API-001 | Current server relevant owner checks after prebuild | Not Tested |
| API-002 | New qualified real-panel recovery narrow-first, then current affected Nuxt regressions | Not Tested |
| API-003 | Current build/capability contract | Not Tested |
| API-004 | Added current HTTP scoped history/bytes/IDs/Stop/restore/restart | Not Tested |
| API-005 | Existing current HTTP stopped workspace | Not Tested |
| API-006 | Relevant documented renderer probes | Not Tested |
| API-007 | Imported real Org and standalone Team exact choices/schema/overrides/reference/admission/recipient-free/no inference | Not Tested |
| API-008 | Complete comparable n5warm+n5cold small/~500root config/capability/catalog/create/workspace/exact-row/work/count/error/provenance | Not Tested |
| API-009 | Actual supported lifecycle/event/freshness/history/focus/bucket/enrichment and bytes/IDs continuity | Not Tested |
| API-010 | Exact owned cleanup and original fixtures preserved | Not Tested |

- API-001 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "prebuild"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-prebuild.log. Case result requires reconciliation of all steps.

- API-002 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "exec", "nuxt", "prepare"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-nuxt-prepare.log. Case result requires reconciliation of all steps.

- API-002 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:nuxt", "components/workspace/config/__tests__/AgentOrgCatalogRecovery.spec.ts", "composables/__tests__/useRuntimeScopedModelSelection.spec.ts", "components/workspace/config/__tests__/MemberOverrideItem.spec.ts", "--run"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-recovery-narrow.log. Case result requires reconciliation of all steps.

- API-011 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-setup.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-setup.log. Case result requires reconciliation of all steps.

- API-011 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-recovery.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-recovery.log. Case result requires reconciliation of all steps.

- API-011 setup correction: ordinary import is external_read_only; attempted public default update correctly rejected before any runtime journey/write. evidence/api2-packaged-recovery.log and preserved -readonly-setup.mjs. No product failure inferred; use unchanged import with normal UI runtime/model selection, matching original entry. No restoration needed.

- API-011 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-recovery.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-recovery-normal.log. Case result requires reconciliation of all steps.

- API-011 recovery attempt: root variant actual14 schemas recovered, no config writes; inherited-member selector incorrectly scoped its has-locator and selected0 rows, followed by route-cleanup race. These probe defects do not identify a product failure. Root raw result retained in api2-packaged-recovery-root-pass-before-member-selector.json, script and failurelog preserved; correct to member own breadcrumb hasText and drain released route before unroute.

- API-011 round2 actual packaged recovery: Pass; evidence/api2-packaged-recovery.json; unchanged normal import; user chooses exact model after selected recovery; no inference.

- API-011 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-recovery.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-recovery-qualified.log. Case result requires reconciliation of all steps.

- API-001 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/unit/agent-execution/agent-run-identity-allocator.test.ts", "tests/unit/agent-org-execution/agent-org-execution-tree-location-service.test.ts", "tests/unit/agent-org-execution/agent-org-run-config.test.ts", "tests/unit/agent-org-execution/agent-org-run-service-model-selection.test.ts", "tests/unit/agent-org-execution/agent-org-run-service-history-order.test.ts", "tests/unit/run-history/services/collaboration-root-history-readiness.test.ts", "tests/unit/run-history/services/collaboration-root-history-scoped.test.ts", "tests/unit/runtime-management/runtime-availability-service.test.ts", "tests/integration/agent-team-execution/agent-team-run-manager.integration.test.ts", "tests/integration/agent-team-execution/task-delegation-tool-lifecycle.integration.test.ts", "tests/integration/agent-team-execution/team-agent-tools-mcp-lifecycle.integration.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-server-narrow.log. Case result requires reconciliation of all steps.

- API-002 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:nuxt", "stores/__tests__/runtimeCapabilitiesStore.spec.ts", "stores/__tests__/agentOrgHistoryApollo.spec.ts", "stores/__tests__/runHistoryStore.spec.ts", "stores/__tests__/runHistoryNavigationProjection.spec.ts", "stores/__tests__/agentOrgContextsStore.spec.ts", "stores/__tests__/agentOrgInspection.spec.ts", "stores/__tests__/agentOrgRetainedRecovery.spec.ts", "stores/__tests__/agentOrgRunConfigPublication.spec.ts", "services/agentOrgExecution/__tests__/agentOrgComposerSubmission.spec.ts", "services/agentOrgExecution/__tests__/agentOrgContextFiles.spec.ts", "services/agentOrgExecution/__tests__/agentOrgStreamingService.spec.ts", "services/agentOrgExecution/__tests__/agentOrgRunConfigAdoption.spec.ts", "composables/__tests__/useRuntimeScopedModelSelection.spec.ts", "components/launch-config/__tests__/RuntimeModelConfigFields.spec.ts", "components/launch-config/__tests__/RuntimeCapabilityReadiness.spec.ts", "components/workspace/config/__tests__/AgentOrgOwnedLaunch.spec.ts", "components/workspace/config/__tests__/AgentOrgSeededLaunch.spec.ts", "components/workspace/config/__tests__/AgentOrgRunConfigPanel.spec.ts", "components/workspace/config/__tests__/AgentOrgRunConfigForm.spec.ts", "components/workspace/config/__tests__/AgentRunConfigForm.spec.ts", "components/workspace/config/__tests__/MemberOverrideItem.spec.ts", "components/workspace/config/__tests__/MemberOverridesDisclosure.spec.ts", "components/workspace/config/__tests__/TeamRunConfigForm.spec.ts", "components/workspace/config/__tests__/TeamScopeConfigEditor.spec.ts", "components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts", "components/workspace/history/__tests__/WorkspaceAgentOrgActivityPublication.spec.ts", "components/workspace/history/__tests__/WorkspaceHistoryFamilyPublication.spec.ts", "services/chat/__tests__/chatLaunchService.spec.ts", "stores/__tests__/chatDraftStore.spec.ts", "tests/integration/web-boundary-guard.integration.test.ts", "components/workspace/config/__tests__/AgentOrgCatalogRecovery.spec.ts", "--run"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-web-broad.log. Case result requires reconciliation of all steps.

- API-003 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/runtime-capability-graphql.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-capability-e2e.log. Case result requires reconciliation of all steps.

- API-004 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/agent-org-runs/scoped-org-history-graphql.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-scoped-history-e2e.log. Case result requires reconciliation of all steps.

- API-005 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/agent-org-runs/stopped-org-workspace-graphql.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-stopped-workspace-e2e.log. Case result requires reconciliation of all steps.

- API-007 PKG-03-org-real-inheritance-and-overrides: Fail; evidence/api2-packaged-normal.json.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal.log. Case result requires reconciliation of all steps.

- API-007 normal Org attempt: correct public sparse high/medium/low payload and10 unique unprovisioned IDs, then observer overbroadly expected10 Team-local references. Actual unchanged import has9 Team-local+1 shared computer-use-operator. Source inventory confirms expected distinction; correct identity assertion, no product defect. Failed probe artifacts retained, owned Org stopped.

- API-007 PKG-03-org-real-inheritance-and-overrides: Pass; evidence/api2-packaged-normal.json.

- API-007 PKG-04-standalone-team-real-schema-overrides: Fail; evidence/api2-packaged-normal.json.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal-qualified.log. Case result requires reconciliation of all steps.

- API-007 Org normal override/reset/schema/owned/shared identity/recipient-free launch/checkpoint Pass; standalone Team attempt inspected count before navigation/library readiness and saw0, captured old workspace DOM. Wait for real card instead of immediate count; raw checkpoint preserved. No product defect; Org stopped.

- API-007 PKG-03-org-real-inheritance-and-overrides: Pass; evidence/api2-packaged-normal.json.

- API-007 PKG-04-standalone-team-real-schema-overrides: Fail; evidence/api2-packaged-normal.json.

- API-007 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal-team-ready.log. Case result requires reconciliation of all steps.

- API-007 standalone Team attempted Run-enabled assertion while actual selected-kind catalog refresh visibly pending. Real disabled/loading guard correct; wait for settled readiness before launch, bounded20s. Raw pending DOM/input retained; no product defect inferred from pending snapshot.

- API-007 PKG-03-org-real-inheritance-and-overrides: Pass; evidence/api2-packaged-normal.json.

- API-007 PKG-04-standalone-team-real-schema-overrides: Pass; evidence/api2-packaged-normal.json.

- API-007 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-normal-settled.log. Case result requires reconciliation of all steps.

- API-009 command checkpoint: Pass exit 0; ["env", "RUN_AGY_FAILURE_E2E=1", "ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs", "AGY_RUNTIME_ERROR_EVIDENCE_DIR=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-agy-transport", "pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/agy-failure-transport.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-agy-failure-transport.log. Case result requires reconciliation of all steps.

- API-009 command checkpoint: Fail exit 1; ["pnpm", "test:native-input-history"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-native-input-history.log. Case result requires reconciliation of all steps.

## Browser checkpoint API-TTRC-B01
Pass — Default: delegated Team rows open, chevron down and aligned with the mounted Team chevron (AC-001, REQ-001/005). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B01).

## Browser checkpoint API-TTRC-B02
Pass — Mouse click collapses (rotation, descendants hidden, connectors) and inspects the coordinator; second click restores (AC-002, AC-004). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B02).

## Browser checkpoint API-TTRC-B03
Pass — Keyboard Enter/Space on the focused row toggles and inspects (REQ-004). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B03).

## Browser checkpoint API-TTRC-B04
Pass — Nested delegated Team collapses independently and keeps its state across outer collapse (REQ-003). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B04).

## Browser checkpoint API-TTRC-B05
Pass — Same-named mounted Team and a second delegation of the same Team keep independent state (AC-003). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B05).

## Browser checkpoint API-TTRC-B07
Pass — Mounted Team, Agent and delegated Agent rows unchanged (AC-005). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B07).

## Browser checkpoint API-TTRC-B06
Pass — Live tree update while collapsed keeps the delegated Team collapsed (REQ-003/005). Evidence: /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure/evidence.json (API-TTRC-B06).

- API-006 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:e2e:agent-org-task-team-disclosure", "--output-dir", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure", "--ledger", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-task-team-disclosure.log. Case result requires reconciliation of all steps.

- API-009 actual no-inference Stop/restore/checkpoint/WS/focus: Fail; api2-packaged-continuity.json.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.log. Case result requires reconciliation of all steps.

- API-009 no-inference continuity checkpoint: real restore exact ID, real WS CONNECTED/snapshot/lifecycle and checkpointclosed + six Team-owned identity/config assertions passed. UI driver incorrectly looked for history sidebar before using visible Open runs/history entry from unselected Chat route; timed out; raw DOM/HTTP/frames retained, root stopped. Correct ordinary visible entry before row lookup.

- API-009 actual no-inference Stop/restore/checkpoint/WS/focus: Fail; api2-packaged-continuity.json.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity-normal-entry.log. Case result requires reconciliation of all steps.

- API-009 history-entry driver correction: prior conditional isVisible checked too early during renderer hydration and skipped entry. Explicit waitFor visible Open runs/history then click; retain raw attempt. No product failure classification made for unperformed navigation.

- API-009 actual no-inference Stop/restore/checkpoint/WS/focus: Fail; api2-packaged-continuity.json.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity-entry-ready.log. Case result requires reconciliation of all steps.

- API-009 driver discovery: fresh renderer correctly starts Temp Workspace history bucket collapsed. Open runs/history only focuses/reopens left history surface, not bucket. Expand visible workspace-row Temp Workspace by ordinary button before row lookup; preserved prior raw failure. This is a missing user step, not missing server row or product error.

- API-009 actual no-inference Stop/restore/checkpoint/WS/focus: Fail; api2-packaged-continuity.json.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity-bucket-expanded.log. Case result requires reconciliation of all steps.

- API-009 actual no-inference Stop/restore/checkpoint/WS/focus: Pass; api2-packaged-continuity.json.

- API-009 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity-disclosures-ready.log. Case result requires reconciliation of all steps.

- API-009 actual no-inference continuity Pass after ordinary workspace bucket AND Org definition disclosure. Real scopedHTTP active→stopped, snapshot/checkpoint, configured Team/coordinator/member focus, lifecyclefalse WS close1000, all10 owned persisted files byte-identical. Prior attempts omitted normal disclosure steps; no product failure inferred. Next owned restart compares against saved BEFORE hashes (not freshly frozen after hashes).

- API-009 after owned process restart: Pass; api2-packaged-continuity-after-restart.json.

- API-009 command checkpoint: Pass exit 0; ["env", "RECEIPT=api2-packaged-restart.json", "AFTER_RESTART=1", "OUTPUT=api2-packaged-continuity-after-restart.json", "node", "tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api2-packaged-continuity-after-restart.log. Case result requires reconciliation of all steps.

## Round2 final reconciliation — API-REV-002
API001Pass11/68; API002Pass31/431 (narrow3/23 subset); API003Passfreshpackaged/capability4; API004PassHTTP1; API005PassHTTP1; API006Passrendererfixture7; API007NotTestedpartial (normalOrg+Team/overrides/identities subcasesPass, negative refs incomplete); API008NotTested (prepared comparator/scripts only); API009FailFAPI002(native2setupFail), actualno-inferencecontinuity/restart andfakeAGY24Pass/1skip retained; API010Passownedcleanup; API011PassFAPI001resolvedreal14affectedscopes2variants.
No owned process remains. Temporary script wrong seed/selector/immediate readiness/missing bucket+definition disclosure are driver errors corrected with raw history retained, not new product findings. Prior APIREV001 Fail77.14 remains history, current Fail80.00/broaderRequired. Focused failure-origin review pending current rule selection; no successful-test/delivery advance.

- APIREV002 current rule2 /code_reviewer selected; complete cumulative references indexed, failure package ready.

- APIREV002 focused failure-origin dispatch confirmed DELIVERED to /code_reviewer, exact run code_reviewer_1cd9559332904949b3253e46b21014ac; receipt evidence/api-failure-handoff-receipt-api-rev002.json. Stage ended; no recipient polling or delivery advance.

## Round 3 planned — initialized before fixture edit/execution
| Case/subcase | Expected | Current result |
|---|---|---|
| API-009 F-API-002 first recheck | exact documented native harness passes unchanged two FIFO/history/hydration cases | Not Tested |
| API-009 fixture-owned teardown | successful and rejected setup release native worker and exact own directories; original error preserved | Not Tested |
| API-009 shared native callers | reconnect/read/Stop/termination regressions remain valid/pass | Not Tested |
| API-007 remaining reference/admission | real fresh/null/error/retry owned refs plus existing exact Org/Team semantics | Not Tested |
| API-008 current comparable primary | n>=5 warm+n>=5 cold renderer per small/~500 baseline/current, complete phase attribution/work counts/old continuity | Not Tested |
| API-009 remaining actual chains | task/collaborator/checkpoint/ACK/conversation/enrichment/freshness proof with labeled model seams | Not Tested |
| API-010 cleanup/continuity | only owned processes/data/hooks removed; reviewed and original fixture hashes unchanged | Not Tested |
Previous round results remain authoritative historical entries; planned is not Pass.

- API-009 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "prebuild"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-prebuild.log. Case result requires reconciliation of all steps.

- API-009 command checkpoint: Pass exit 0; ["pnpm", "test:native-input-history"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-native-input-history.log. Case result requires reconciliation of all steps.

- API-009 F-API-002 first rerun: Pass; exact pnpm test:native-input-history, unchanged web guard and two real native FIFO/raw-history/attachments/dedupe/web hydration cases. api3-native-input-history.log. Existing controlled token-usage readiness warnings retained; no HTTP/provider/packaged inference proof. Factory failure resolved at executable setup boundary; teardown/shared callers next.

- API-009 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/integration/agent-run-collaboration/native-root-fixture-cleanup.integration.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-native-fixture-cleanup.log. Case result requires reconciliation of all steps.

- API-009 fixture-owned teardown: Pass5 cases (real Agent/Team success, native-after-root-dir failure, post-root admission rejection, original setup error identity preserved despite reported cleanup failure after actual removal); api3-native-fixture-cleanup.log. No product factory alias/admission-green mock.

- API-009 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/integration/agent-run-collaboration/native-compaction-root.integration.test.ts", "tests/integration/agent-run-collaboration/native-root-termination.integration.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-native-shared-callers.log. Case result requires reconciliation of all steps.

- API-009 shared native callers: Pass2files/16 tests; api3-native-shared-callers.log. Includes real native collaborator handles, reconnect FIFO/no replay, GraphQL dormant/stored read no activation, root Stop and whole-host success/child finish uncertainty/later host failure. Separate from HTTP/provider/packaged proof.
| auto | API-D01 | 2026-10-03T23:26:21.500Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-D01 | 2026-10-03T23:26:21.853Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-D02 | 2026-10-03T23:26:21.854Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-D02 | 2026-10-03T23:26:22.131Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-01 | 2026-10-03T23:26:22.132Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-01 | 2026-10-03T23:26:22.472Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-02 | 2026-10-03T23:26:22.472Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-02 | 2026-10-03T23:26:22.811Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-03 | 2026-10-03T23:26:22.812Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-03 | 2026-10-03T23:26:23.150Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-04 | 2026-10-03T23:26:23.150Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-04 | 2026-10-03T23:26:23.486Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-05 | 2026-10-03T23:26:23.487Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-05 | 2026-10-03T23:26:23.825Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-06 | 2026-10-03T23:26:23.826Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-06 | 2026-10-03T23:26:24.167Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-07 | 2026-10-03T23:26:24.168Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-A-07 | 2026-10-03T23:26:24.511Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-01 | 2026-10-03T23:26:24.512Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-01 | 2026-10-03T23:26:25.194Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-02 | 2026-10-03T23:26:25.194Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-02 | 2026-10-03T23:26:25.845Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-03 | 2026-10-03T23:26:25.845Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-03 | 2026-10-03T23:26:26.537Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-04 | 2026-10-03T23:26:26.537Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-04 | 2026-10-03T23:26:27.139Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-05 | 2026-10-03T23:26:27.139Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-05 | 2026-10-03T23:26:27.721Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-06 | 2026-10-03T23:26:27.721Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-06 | 2026-10-03T23:26:28.355Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-07 | 2026-10-03T23:26:28.355Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-T-07 | 2026-10-03T23:26:28.999Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-01 | 2026-10-03T23:26:29.000Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-01 | 2026-10-03T23:26:29.720Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-02 | 2026-10-03T23:26:29.720Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-02 | 2026-10-03T23:26:30.442Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-03 | 2026-10-03T23:26:30.443Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-03 | 2026-10-03T23:26:31.095Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-04 | 2026-10-03T23:26:31.096Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-04 | 2026-10-03T23:26:31.818Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-05 | 2026-10-03T23:26:31.819Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-05 | 2026-10-03T23:26:32.528Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-06 | 2026-10-03T23:26:32.528Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-06 | 2026-10-03T23:26:33.246Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-07 | 2026-10-03T23:26:33.246Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-O-07 | 2026-10-03T23:26:33.956Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-C02 | 2026-10-03T23:26:33.957Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-C02 | 2026-10-03T23:26:34.471Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | API-B01 | 2026-10-03T23:26:34.471Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-agy-real-transport-browser.log |
| auto | UI-A01 | 2026-10-03T23:26:45.613Z | Started | Public message→DOM and continuity | agent real stream journey | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:46.048Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:46.261Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:46.478Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:46.695Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:46.912Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:47.129Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:47.518Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:26:47.680Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:47.680Z | Started | Public message→DOM and continuity | team real stream journey | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:48.184Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:48.396Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:48.613Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:48.830Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:49.047Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:49.264Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:49.635Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:26:49.794Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-evidence.json |
| auto | API-B01 | 2026-10-03T23:26:50.187Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-agy-real-transport-browser.log |

- API-009 command checkpoint: Pass exit 0; ["env", "RUN_AGY_FAILURE_E2E=1", "RUN_AGY_ERROR_BROWSER=1", "ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs", "AGY_ERROR_EVIDENCE_DIR=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-agy-transport", "AGY_ERROR_LEDGER=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md", "AGY_ERROR_EXECUTION_LOG=api3-agy-real-transport-browser.log", "pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/agy-failure-transport.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-agy-real-transport-browser.log. Case result requires reconciliation of all steps.

- API-009 AGY current real transport/browser: Pass25/25 (zero skips); api3-agy-real-transport-browser.log and api3-agy-transport raw frames/projections/diagnostics/browser receipts. Scripted CLI only; actual HTTP/WS/ACK/turn-error/next-turn/conversation/Stop/restore and Agent/Team production rendered error cards, not exact Codex substitution.

- API-009 command checkpoint: Pass exit 0; ["env", "RUN_AGY_FAILURE_E2E=1", "ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs", "pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts", "-t", "E06", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-actual-mcp-delegation.log. Case result requires reconciliation of all steps.

- API-009 actual delegate_task MCP→task Agent: Pass E06/1; seven nonselected cases explicitly skipped by filter, api3-actual-mcp-delegation.log. Scripted CLI uses actual scoped capsule MCP credentials and real server allocation/persistence/child activation, not fictional tool event. Exact Codex primary has no sends.

- API-008 command checkpoint: Pass exit 0; ["env", "COMPARATOR=1", "START_RECEIPT=api3-baseline-start.json", "OUT_PREFIX=api3-baseline", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-setup.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-baseline-setup.log. Case result requires reconciliation of all steps.

- API-008 comparator setup: Pass normal570-file import/exactCodex catalog/source hash, pinned approved-base installed only isolated comparator iso-52493-c46a. api3-baseline-setup.json/log; no inference.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-baseline-start.json", "OUT_PREFIX=api3-baseline", "PHASE=small-history", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-timing.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-baseline-small-timing.log. Case result requires reconciliation of all steps.

- API-008 baseline small-history: Pass collection10 (5warm/5cold-renderer), all passive config/codex-ready/selected-ready and exact-created-row clocks complete, zero page errors/no SEND. Raw api3-baseline-small-history.json/png/log; actual comparison not yet complete.

- API-009 new controlled Org publication/reference/foreign-target/reconnect/restore durable case planned before execution; scripted CLI generic actual-MCP CALL_TOOL seam, no fabricated event or exact-provider pass.

- API-009 command checkpoint: Pass exit 0; ["env", "RUN_AGY_FAILURE_E2E=1", "ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs", "AGY_ERROR_EVIDENCE_DIR=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-org-publication", "pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-org-publication-http.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-baseline-start.json", "OUT_PREFIX=api3-baseline", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-populate.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-baseline-population.log. Case result requires reconciliation of all steps.

- API-009 actual Org publication chain: Pass1; api3-org-publication-http.log + api3-org-publication/org-publication-chain.json. Actual public mention→UUID/admission/event/scoped history, real actor scoped MCP send/reference HTTP/cross-root404 and Agent+Team task copies/checkpoint, foreign-target negative ACK, reconnect snapshot, no-migration Stop/restore unchanged tree/conversation. Model actor emulated scripted CLI only.
- API-008 baseline operational fixture: Pass500inactive same10members, sequential public creates/Stops, old20 packagefiles retained; api3-baseline-population.json/log. No setup interval counted as latency.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-baseline-start.json", "OUT_PREFIX=api3-baseline", "PHASE=stored-history-500", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-timing.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-baseline-stress-timing.log. Case result requires reconciliation of all steps.

- API-008 baseline stored-history: Pass10 (5warm/5cold-renderer), complete config/exact row clocks, zero page errors/no SEND; api3-baseline-stored-history-500.json. Primary complete, newly created ten roots Stop before separate instrumented work-count probe.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-baseline-start.json", "OUT_PREFIX=api3-baseline", "TRACE_MODE=install", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-backend-trace.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-baseline-backend-install.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-baseline-start.json", "OUT_PREFIX=api3-baseline", "TRACE_MODE=trace", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-backend-trace.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-baseline-backend-trace.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-packaged-start.json", "OUT_PREFIX=api3-packaged", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-setup.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-setup.log. Case result requires reconciliation of all steps.

- API-008 current setup: Pass normal570-file import/exactCodex schema/source bytes, actual IR002 artifact SHA matches API2 fresh rebuild/source and unchanged current production; own iso-52965-ef9d. api3-current-artifact-continuity.json/api3-packaged-setup.json.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-packaged-start.json", "OUT_PREFIX=api3-packaged", "PHASE=small-history", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-timing.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-small-timing.log. Case result requires reconciliation of all steps.

- API-008 current small-history: Pass10 (5warm/5cold-renderer), complete passive config/codex/selected readiness clocks, exact IDs/row/workspace, zero page errors/no SEND. api3-packaged-small-history.json.

- API-009 command checkpoint: Pass exit 0; ["env", "RUN_AGY_FAILURE_E2E=1", "ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs", "pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts", "-t", "E06", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-final-mcp-regression.log. Case result requires reconciliation of all steps.

- API-009 final scripted CLI legacy DELEGATE seam regression: Pass E06/1, seven nonselected skips, after generic CALL_TOOL change; api3-final-mcp-regression.log.

- 2026-10-03T23:43:01.778Z E-001 Started: owned current-worktree packaged instance; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:06.614Z E-001 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:06.615Z E-002 Started: first discovery with empty renderer catalogs; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:07.802Z E-002 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:07.802Z E-003 Started: completed edit v2; Team Reload only; scoped/shared views; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:08.445Z E-003 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:08.446Z E-004 Started: completed edit v3; Team Reload only; scoped/shared views; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:09.108Z E-004 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:09.109Z E-005 Started: required Agent HTTP read failure; existing error and same-button retry; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:10.044Z E-005 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:10.045Z E-006 Started: API identity/scope and source-preservation checks; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:10.048Z E-006 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:10.049Z E-008 Started: ordinary Team catalog Reload then fresh Team setup on with permitted opt-out; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:10.957Z E-008 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:10.959Z E-009 Started: actual owned app restart then fresh catalog Agent and Team approval true; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:15.884Z E-009 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:15.886Z E-007 Started: owned process/port/data/fixture cleanup; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- 2026-10-03T23:43:17.230Z E-007 Completed: Pass; /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness/evidence.json.

- API-007 command checkpoint: Pass exit 0; ["pnpm", "-C", "autobyteus-web", "test:e2e:team-reload-member-freshness", "--skip-build", "--check-fresh-approval", "--output-dir", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness", "--ledger-file", "/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-team-member-freshness.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-packaged-start.json", "OUT_PREFIX=api3-packaged", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-populate.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-population.log. Case result requires reconciliation of all steps.

- API-007 documented packaged Team-member freshness: Pass9 cases including actual source/Reload/held read/error/same-button retry/scope byte preservation/fresh approvals/owned restart and cleanup; api3-team-member-freshness/evidence.json, sources and real HTTP receipts. Own iso-53196-3ee7 stopped/data removed/ports released.
- API-008 current operational fixture: Pass500inactive same10members, original20 owned packagefiles retained; api3-packaged-population.json, no setup timing counted.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-packaged-start.json", "OUT_PREFIX=api3-packaged", "PHASE=stored-history-500", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-timing.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-stress-timing.log. Case result requires reconciliation of all steps.

- API-008 current stress primary: Pass10 (5warm/5cold-renderer), config/availability/catalog/create/workspace/exact-row complete and no pageerrors/SEND; api3-packaged-stored-history-500.json. All40 comparative primary samples completed before separate actual backend work instrumentation; ten new roots stopped.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-packaged-start.json", "OUT_PREFIX=api3-packaged", "TRACE_MODE=install", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-backend-trace.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-backend-install.log. Case result requires reconciliation of all steps.

- API-008 command checkpoint: Pass exit 0; ["env", "START_RECEIPT=api3-packaged-start.json", "OUT_PREFIX=api3-packaged", "TRACE_MODE=trace", "node", "tickets/in-progress/org-run-config-performance/evidence/api3-packaged-backend-trace.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-backend-trace.log. Case result requires reconciliation of all steps.

- API-007 required-reference error: Pass; api3-org-reference-guards.json.

- API-007 required-reference null: Pass; api3-org-reference-guards.json.

- API-007 required-reference wrong-ownership: Pass; api3-org-reference-guards.json.

- API-007 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api3-org-reference-guards.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-org-reference-guards.log. Case result requires reconciliation of all steps.

- API-008 separate actual backend counts: Pass3 per build, allocations10; baseline collision reads5100/5110/5120 vs current0/0/0. Retained structural admission511/512/513 BOTH builds, hooks restored true; primary40 complete/zero pageerrors and normalized exact inputs/viewport match. api3-performance-summary.json plus raw traces; no inference/live-user speed claim.

- API-010 command checkpoint: Pass exit 0; ["bash", "-c", "pnpm --silent isolated-app stop iso-52965-ef9d > tickets/in-progress/org-run-config-performance/evidence/api3-packaged-stop.json"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-packaged-stop.log. Case result requires reconciliation of all steps.

- API-009 command checkpoint: Pass exit 0; ["bash", "-c", "pnpm --silent isolated-app start --from-worktree --data-root /private/var/folders/7w/9r4_s1_s42z3f7c136bpjf0r0000gn/T/autobyteus-isolated-root-8G8x42 > tickets/in-progress/org-run-config-performance/evidence/api3-transition-start.json"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-transition-start.log. Case result requires reconciliation of all steps.

- API-009 approved-base513-package current normal-reader/restore/WS/checkpoint/bucket/Team/member focus/no-inference immutable1026files: Fail; api3-approved-base-current-reader.json.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api3-approved-base-current-reader.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-approved-base-current-reader.log. Case result requires reconciliation of all steps.
| auto | API-D01 | 2026-10-03T23:56:00.520Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-D01 | 2026-10-03T23:56:00.866Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-D02 | 2026-10-03T23:56:00.867Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-D02 | 2026-10-03T23:56:01.156Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-01 | 2026-10-03T23:56:01.157Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-01 | 2026-10-03T23:56:01.506Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-02 | 2026-10-03T23:56:01.507Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-02 | 2026-10-03T23:56:01.863Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-03 | 2026-10-03T23:56:01.864Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-03 | 2026-10-03T23:56:02.212Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-04 | 2026-10-03T23:56:02.212Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-04 | 2026-10-03T23:56:02.552Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-05 | 2026-10-03T23:56:02.552Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-05 | 2026-10-03T23:56:02.895Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-06 | 2026-10-03T23:56:02.895Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-06 | 2026-10-03T23:56:03.239Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-07 | 2026-10-03T23:56:03.240Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-A-07 | 2026-10-03T23:56:03.586Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-01 | 2026-10-03T23:56:03.587Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-01 | 2026-10-03T23:56:04.289Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-02 | 2026-10-03T23:56:04.290Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-02 | 2026-10-03T23:56:04.947Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-03 | 2026-10-03T23:56:04.948Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-03 | 2026-10-03T23:56:05.642Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-04 | 2026-10-03T23:56:05.643Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-04 | 2026-10-03T23:56:06.320Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-05 | 2026-10-03T23:56:06.320Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-05 | 2026-10-03T23:56:06.984Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-06 | 2026-10-03T23:56:06.985Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-06 | 2026-10-03T23:56:07.676Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-07 | 2026-10-03T23:56:07.676Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-T-07 | 2026-10-03T23:56:08.355Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-01 | 2026-10-03T23:56:08.355Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-01 | 2026-10-03T23:56:09.118Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-02 | 2026-10-03T23:56:09.119Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-02 | 2026-10-03T23:56:10.022Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-03 | 2026-10-03T23:56:10.023Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-03 | 2026-10-03T23:56:10.786Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-04 | 2026-10-03T23:56:10.786Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-04 | 2026-10-03T23:56:11.589Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-05 | 2026-10-03T23:56:11.590Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-05 | 2026-10-03T23:56:12.354Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-06 | 2026-10-03T23:56:12.355Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-06 | 2026-10-03T23:56:13.134Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-07 | 2026-10-03T23:56:13.134Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-O-07 | 2026-10-03T23:56:13.893Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-C02 | 2026-10-03T23:56:13.894Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-C02 | 2026-10-03T23:56:14.414Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | API-B01 | 2026-10-03T23:56:14.414Z | Started | Approved runtime message/continuity | Executing real public transport | N/A | evidence/api-e2e/api3-final-agy-real-transport-browser.log |
| auto | UI-A01 | 2026-10-03T23:56:24.831Z | Started | Public message→DOM and continuity | agent real stream journey | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:25.290Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:25.502Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:25.735Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:25.952Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:26.168Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:26.386Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:26.756Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-A01 | 2026-10-03T23:56:26.915Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:26.915Z | Started | Public message→DOM and continuity | team real stream journey | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:27.423Z | Checkpoint | Public message→DOM and continuity | quota: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:27.636Z | Checkpoint | Public message→DOM and continuity | unfamiliar: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:27.854Z | Checkpoint | Public message→DOM and continuity | structured: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:28.070Z | Checkpoint | Public message→DOM and continuity | missing: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:28.288Z | Checkpoint | Public message→DOM and continuity | empty: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:28.505Z | Checkpoint | Public message→DOM and continuity | malformed: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:28.891Z | Checkpoint | Public message→DOM and continuity | credential: actual public frame matches inert card, completed tool preserved | N/A | evidence/api-e2e/browser-evidence.json |
| auto | UI-T01 | 2026-10-03T23:56:29.031Z | Completed | Public message→DOM and continuity | Seven error shapes and user-driven next turn; exact identity/work retained | Pass | evidence/api-e2e/browser-evidence.json |
| auto | API-B01 | 2026-10-03T23:56:29.433Z | Completed | Approved runtime message/continuity | All assertions passed | Pass | evidence/api-e2e/api3-final-agy-real-transport-browser.log |

- API-009 command checkpoint: Pass exit 0; ["env", "RUN_AGY_FAILURE_E2E=1", "RUN_AGY_ERROR_BROWSER=1", "ANTIGRAVITY_CLI_COMMAND=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs", "AGY_ERROR_EVIDENCE_DIR=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-final-agy-transport", "AGY_ERROR_LEDGER=/Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/api-e2e-test-case-ledger.md", "AGY_ERROR_EXECUTION_LOG=api3-final-agy-real-transport-browser.log", "pnpm", "-C", "autobyteus-server-ts", "exec", "vitest", "run", "tests/e2e/runtime/agy-failure-transport.e2e.test.ts", "--no-watch"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-final-agy-real-transport-browser.log. Case result requires reconciliation of all steps.

- API-009 approved-base513-package current normal-reader/restore/WS/checkpoint/bucket/Team/member focus/no-inference immutable1026files: Fail; api3-approved-base-current-reader.json.

- API-009 command checkpoint: Fail exit 1; ["node", "tickets/in-progress/org-run-config-performance/evidence/api3-approved-base-current-reader.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-approved-base-current-reader.log. Case result requires reconciliation of all steps.

- API-009 approved-base513-package current normal-reader/restore/WS/checkpoint/bucket/Team/member focus/no-inference immutable1026files: Pass; api3-approved-base-current-reader.json.

- API-009 command checkpoint: Pass exit 0; ["node", "tickets/in-progress/org-run-config-performance/evidence/api3-approved-base-current-reader.mjs"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-approved-base-current-reader.log. Case result requires reconciliation of all steps.

- API-009 final current-source AGY transport/browser regression: Pass25/25, no skips; final fixture includes generic scoped MCP seam, raw api3-final-agy-transport/ and api3-final-agy-real-transport-browser.log. ActualHTTP/WS→renderer error path; scripted CLI not exact provider.
- API-007 reference probes reconciled Pass3; required error/null/wrong ownership block Run; fresh ordinary re-entry issues new exact physical reads and recovers without source/model substitution, pageerrors0/noSend.
- API-009 old approved-base packages now Pass: current unmodified reader sees513 originalIDs; genuine restore/checkpoint/snapshot/normal history bucket+root/Team/member focus and Stop; all1026 before/after canonical bytes and570source/copy hashes preserved. Two temporary Chat-entry mistakes retained and corrected through supported sidebar, not product failures; final log exit0/pageerrors0/noSend.

- API-010 command checkpoint: Pass exit 0; ["bash", "-c", "pnpm --silent isolated-app stop iso-53675-ad40 > tickets/in-progress/org-run-config-performance/evidence/api3-transition-stop.json"]; evidence /Users/normy/autobyteus_org/autobyteus-worktrees/org-run-config-performance/tickets/in-progress/org-run-config-performance/evidence/api3-transition-stop.log. Case result requires reconciliation of all steps.

## Round3 final reconciliation — API-REV-003
API001–006 Pass retained current-source evidence (not rerun claims); API007 Pass normal exactOrg/Team plus round3reference3/freshness9; API008 Pass40completephase samples/sixseparateworkcounts; API009 Pass exactfirstnative2/shared16/cleanup5/finalHTTPWSbrowser25/MCPOrgchain1/E06/old513root1026bytes currentreader; API010 Passownedcleanup; API011 Passqualified priorrecovery preservedcurrenthashes. No running/interrupted/unstarted in-scope case. Two temporaryChat/workspace wrongentry attempts retain raw failures and corrected journal log pointers; final normalSidebar journeyPass, no productassertion weakened. Authoritative completedresult Pass95.00% /broaderRequiredcompleted, proportionaldurabletestreviewRequired. All62source/11repair/frozenapproval/APIHTTP/appartifact match; others untouched; no inference/stage/commit/release.

- API-REV-003 final routing checkpoint: fresh rule1 selects only /code_reviewer for Pass95.00%/High proportional durable-test review. Complete822 existing references verified, including all496 current incoming CRR004 refs (sender snapshot had495; current index adds its confirmed bookkeeping). SDKoutputs absent/ownapps stopped, no other targets notified. Dispatch pending confirmation.

- API-REV-003 handoff confirmed DELIVERED only /code_reviewer, target code_reviewer_1cd9559332904949b3253e46b21014ac,822 attached references; cumulative823 includes new confirmation receipt. Proportional durable review pending, no delivery/userverification advance; stage stopped.
