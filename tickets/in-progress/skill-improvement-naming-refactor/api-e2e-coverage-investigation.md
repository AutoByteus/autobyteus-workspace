# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/design-review-report.md`
- Design Rework Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/design-rework-notes.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-improvement-naming-refactor/tickets/in-progress/skill-improvement-naming-refactor/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review pass for `skill-improvement-naming-refactor`, plus user direction to add browser validation after code-level tests.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved scope is a clean-cut rename/refactor from active `self-evolution` / `evolver` / `companion` terminology to Skill Improvement / Retrospective Skill Improver / improver. The behavior to prove is not a redesigned workflow; the manual Skill Improvement flow must still gate capability, evaluate target eligibility, regenerate work traces, launch/reuse a visible Retrospective Skill Improver, register a direct-message grant, send a path-only task packet, persist a global run record, persist target-scoped improver session state, wait for completion, and record final outcome/notification.

The reviewed requirements and design explicitly forbid old GraphQL aliases, old setting/path fallback reads, app-data migration for this rename, old built-in id aliases, old source barrels, and compatibility-only coverage. Runtime must read/write only the new names: GraphQL `skillImprovement*`, fields `improvementRunId` / `improverRunId`, setting keys `ENABLE_SKILL_IMPROVEMENT` / `AUTOBYTEUS_RETROSPECTIVE_SKILL_IMPROVER_AGENT_DEFINITION_ID`, built-in id `autobyteus-retrospective-skill-improver`, app-memory path `skill_improvement/improvement_runs`, target path `skill_improvement/improver_session.json`, task metadata `skill_improvement_*`, and grant purpose `skill_improvement_skill_update`. The implementation handoff records no retained compatibility path and notes that `autobyteus-web/generated/graphql.ts` was manually synchronized because web codegen requires a live backend endpoint.

Code review passed with no findings and specifically asked API/E2E to validate live schema/codegen if possible, broad Skill Improvement start paths, persisted `skill_improvement` run/session paths, direct-message grant metadata, second-click improver reuse, and absence of old active API/path names. The user additionally requested browser validation after code-level checks by reading local README/setup docs, starting backend and frontend, importing `/Users/normy/autobyteus_org/autobyteus-agents`, running the included Daily Assistant, enabling Skill Improvement, and using Codex/GPT-5.5 as the runtime/model where supported.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Server source/test ownership moves from `self-evolution` to `skill-improvement` | Changed | FR-SI-001/002, design removal plan, implementation handoff | Retain/run renamed server unit and integration coverage; stale-term scan active surfaces. |
| GraphQL public API names and fields become `skillImprovement*`, `improvementRunId`, `improverRunId` | Changed / Removed old aliases | FR-SI-011/012, AC-SI-003, code-review residual risk | Run schema/resolver coverage and live codegen/schema path if backend can be started. |
| Web stores/documents/components/settings card use Skill Improvement names | Changed | FR-SI-013/014, AC-SI-004/011 | Run focused web component/store/view tests and browser UI validation. |
| Runtime settings and built-in default id use new clean-state identifiers | Changed | FR-SI-008/009/010, AC-SI-006 | Run built-in bootstrap/server settings coverage; browser setup should enable the new setting key through UI/API. |
| Run/session persistence paths use `skill_improvement/improvement_runs` and `skill_improvement/improver_session.json` only | Changed / Removed old path reads | FR-SI-005/006/007, AC-SI-005/007 | Run service/session integration coverage and inspect active source for old fallback path absence. |
| Task metadata and direct-message grant purpose use `skill_improvement_*` and `skill_improvement_skill_update` | Changed | FR-SI-015, AC-SI-009 | Run improver-session and message-router tests; inspect posted task packet assertions. |
| Manual start business behavior remains equivalent | Preserved | FR-SI-018, AC-SI-008, design behavior-preservation boundary | Run service integration and browser start flow. |
| Old GraphQL/API/setting/path/built-in aliases and app-data migration for this rename | Removed / Forbidden | FR-SI-007/010/012, design rejection log, design review latest result | Treat any observed compatibility path as reroute trigger; no compatibility-only durable coverage. |
| Browser-level user flow with imported Daily Assistant and live frontend/backend | Preserved external behavior / Temporary validation | User instruction on 2026-07-09 during API/E2E stage | Add temporary browser validation scenario; no durable browser test change unless failure shows a coverage-code need. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-graphql-resolver.test.ts` | GraphQL schema exposes new `skillImprovement*` queries/mutations, no launch-config `skillImprovement` defaults, strategy catalog placeholders, disabled capability gate before target resolution. | FR-SI-011/012/018, AC-SI-003/007 | Still Valid | Inspected test and source; assertions match clean renamed GraphQL boundary and no old aliases. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-service.integration.test.ts` | Service records minimal provenance, generates real work-trace files before improver request, writes run records, rejects stale targets before launch, handles non-completed/error improver outcomes, refreshes work traces and reuses the same improver run on second click. | FR-SI-005/006/015/018, AC-SI-005/008/009 | Still Valid | Inspected real/manual trigger test; covers work trace manifest/body shape, path-only posted message, `skill_improvement_*` metadata, record persistence, second-click reuse. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-improver-session-service.test.ts` | Persists target-scoped `skill_improvement/improver_session.json`, reuses/restores/replaces improver runs, builds path-only task packet, registers grant-scoped final-message permission, denies outside references. | FR-SI-005/015/018, AC-SI-005/008/009 | Still Valid | Inspected assertions for new session path, no target-key legacy layout, grant purpose `skill_improvement_skill_update`, metadata keys, no raw traces/prior internal ids in prompt. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/manual-trigger-strategy.test.ts` | Manual request uses canonical `improvementRunId`; only manual trigger/single-agent improver strategies are executable. | FR-SI-003/004/018 | Still Valid | Test assertions match preserved MVP strategy behavior and renamed IDs. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-effective-config-resolver.test.ts` | Resolves current manual Skill Improvement settings and source trace from new server settings. | FR-SI-008/018, AC-SI-006 | Still Valid | Test covers new setting owner behavior; no old-key fallback expected. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-record-lifecycle.test.ts` | Uses improver-authored `send_message_to` summary without duplicate generic notification. | FR-SI-015/018 | Still Valid | Direct outcome behavior is preserved under new improver naming. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/skill-improvement-target-notification-service.test.ts` | Fallback notification emits `sender_id: system.skill_improvement`, concise user-facing text, no private paths/record IDs. | FR-SI-014/015/018, AC-SI-011 | Still Valid | Assertions match new sender id and UI-safe wording. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/improver-run-completion-watcher.test.ts` | Renamed watcher rejects terminal/error improver events. | DS-005 / FR-SI-002/018 | Still Valid | Bounded watcher behavior preserved; only naming changed. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/skill-improvement/remove-self-evolution-run-metadata-migration.test.ts` | Historical migration removes obsolete `selfEvolutionEffective` fields from old run metadata. | FR-SI-017 allowlist; out-of-scope historical cleanup | Still Valid | Old terms are historical old-data cleanup, not compatibility for this rename. | Run with full `tests/skill-improvement` if practical; do not update/remove. |
| `autobyteus-server-ts/tests/agent-work-traces/agent-work-trace-projection-service.test.ts` | Work-trace projection remains under `work_traces` and does not write obsolete `skill_improvement/work_traces`; body/manifest shape remains canonical. | Out-of-scope work-trace format preservation; AC-SI-008 | Still Valid | Implementation handoff and prior ticket say no work-trace format changes; test gives regression guard. | Include in focused server checks. |
| `autobyteus-server-ts/tests/unit/built-in-agents/built-in-agent-bootstrapper.test.ts` | Bootstrap syncs `autobyteus-retrospective-skill-improver`, initializes blank new setting, preserves configured new setting. | FR-SI-008/009/010, AC-SI-006/010 | Still Valid | Inspected test snippets; covers new default id and clean-state settings. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/unit/agent-communication/global-agent-run-message-router.test.ts` | Grant-scoped direct deliveries accept one authorized helper send and reject exhausted/invalid deliveries; purpose is `skill_improvement_skill_update`. | FR-SI-015/018, code-review residual risk | Still Valid | Inspected assertions around grant registration and enforcement. | Run in final code-level checks. |
| `autobyteus-server-ts/tests/unit/skill-improvement-skill-package-tree-renderer.test.ts` | Renders concise editable skill package tree and excludes raw/generated/binary/dependency entries. | Path-only improver packet behavior; AC-SI-008/009 | Still Valid | Supports prompt packet shape used by session-service tests. | Run in final code-level checks. |
| `autobyteus-web/components/workspace/skill-improvement/__tests__/SkillImprovementComposerCta.spec.ts` | CTA hidden when disabled/ineligible/helper run; click starts standalone/team-member Skill Improvement with user-safe copy. | FR-SI-013/014/018, AC-SI-004/011 | Still Valid | Inspected tests cover frontend click/start behavior with new store method names. | Run focused web tests; browser validation will exercise real UI as temporary probe. |
| `autobyteus-web/components/settings/__tests__/SkillImprovementFeatureToggleCard.spec.ts` | Settings card resolves typed capability, default-disabled state, toggles backend capability and refreshes settings. | FR-SI-008/013/014, AC-SI-004/006/011 | Still Valid | Test assertions match new setting UI behavior. | Run focused web tests; browser validation will toggle live app. |
| `autobyteus-web/components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts` and `team/__tests__/TeamWorkspaceView.spec.ts` | Workspace views pass selected standalone/team-member target to Skill Improvement CTA and hide helper runs by new Retrospective Skill Improver id. | FR-SI-010/013/018 | Still Valid | Inspected helper-run id assertions. | Run focused web tests. |
| `autobyteus-web/components/workspace/history/__tests__/WorkspaceAgentRunsTreePanel.spec.ts` | Run-history rows do not expose Skill Improvement actions. | Design says current-target composer action only | Still Valid | Test scenario remains aligned with docs/design. | Run focused web test. |
| `autobyteus-web/services/agentStreaming/__tests__/AgentStreamingService.spec.ts` and `TeamStreamingService.spec.ts` | Streams local system notification sender `system.skill_improvement`. | FR-SI-015, AC-SI-011 | Still Valid | Existing assertions cover renamed notification sender at web ingestion boundary. | Run focused web tests. |
| `autobyteus-web/localization/messages/__tests__/workspaceHistorySkillImprovementCleanup.spec.ts` | Confirms removed old CTA history/open-run copy keys do not linger. | FR-SI-014/017, AC-SI-001/011 | Still Valid | Old key references are cleanup intent, not active UI. | Run focused web tests. |
| `autobyteus-web/generated/graphql.ts` | Tracked generated GraphQL artifact includes new Skill Improvement operations and types. | FR-SI-012, AC-SI-004, code-review residual risk | Needs runtime verification only | Implementation manually updated due no backend endpoint; code review accepted with residual risk. | Validate via live backend `pnpm -C autobyteus-web run codegen` if backend can be started; inspect no diff after codegen. |
| `autobyteus-server-ts/tests/e2e/**` existing generic GraphQL/runtime suites | Broader server GraphQL/runtime e2e coverage for unrelated modules. | Not specific to this rename except live server/codegen support | Out Of Scope | No existing durable Skill Improvement E2E file found; changed boundary is already covered by focused GraphQL/integration tests plus temporary live browser run. | Do not modify. |
| Browser/UI durable E2E harness | No repository-resident durable Skill Improvement browser E2E found. | User requested browser validation in this stage | Out Of Scope for durable changes / Temporary probe needed | The repository has web Vitest/component coverage; browser validation will be environment-specific live setup. | Perform temporary browser validation; do not add durable browser code unless a defect demands new coverage. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No relevant existing durable coverage was found that asserts intentionally removed active behavior. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing reviewed durable coverage is sufficient for code-level source/API/service/web boundaries. | N/A | N/A |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No durable test update planned at investigation time. | N/A | If execution exposes a real coverage gap, update this artifact before editing tests. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage removal planned. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-CODEGEN-001 | Start a local backend endpoint and run `pnpm -C autobyteus-web run codegen`; verify generated file remains aligned or record any environment blocker. | Live GraphQL schema/codegen path validates manually synchronized `generated/graphql.ts`. | Requires live backend setup and may depend on local data/env; artifact state is already durable. |
| TMP-LEGACY-SCAN-001 | Static stale-term scan over active server/web surfaces with historical allowlist. | No active old API/path/setting/source names or compatibility leftovers outside historical cleanup docs/tests. | Ad hoc validation script is narrower than a maintained test and already repeated by reviewers. |
| TMP-BROWSER-001 | Read local README/setup docs, start backend and web frontend from this worktree, import `/Users/normy/autobyteus_org/autobyteus-agents`, enable Skill Improvement, create/run the included Daily Assistant with Codex runtime and GPT-5.5 where selectable, and use browser automation to click through settings/run/CTA. | Browser-level real UI path: settings toggle, imported agent availability, Daily Assistant run, Improve skills CTA visibility/start, backend mutation integration. | Environment-specific smoke validation requested for this handoff; not a durable repository browser test unless a stable harness is later designed. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Actual durable skill edit by a live LLM | The requested validation can start Skill Improvement, but completion and actual edit depend on live Codex/GPT-5.5 credentials/model availability and prompt behavior. | Improver may make no change or fail for external-runtime reasons unrelated to the rename. | Record exact browser/runtime outcome. Escalate only if the app path fails before external model execution or if failure is attributable to this implementation. |
| Broad web typecheck | Implementation and code review record pre-existing unrelated project-wide web typecheck issues. | Low for this rename because focused web tests target changed surfaces. | Run focused web coverage; document broad typecheck limitation if re-observed. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| Any active old GraphQL alias, old setting/path fallback, old built-in id alias, migration for this rename, or emitted `self_evolution_*` metadata discovered during execution | Local Fix | Requirements/design explicitly forbid compatibility and old active names. | `implementation_engineer` |
| Browser or live server cannot run because local credentials/model/runtime are unavailable | Blocker or environment limitation, not implementation defect unless app setup itself fails | User requested Codex/GPT-5.5 browser test; external local model/config may not be available. | Record in execution report; only reroute if implementation defect is evidenced. |

## Execution Plan

1. Run code-level checks first: focused server Skill Improvement/agent-work-trace/built-in/message-router Vitest, server TypeScript build check, focused web Vitest for Skill Improvement settings/CTA/workspace/helper/streaming surfaces, and `git diff --check`.
2. Run a narrow active stale-term scan with historical allowlist to confirm no active old names/fallback paths.
3. Read the local README/setup documentation for backend/frontend/import/runtime instructions before browser setup.
4. Start backend from the authoritative worktree using an isolated data directory and start frontend against that backend.
5. Run live web codegen against the started backend if feasible; verify no unintended generated diff.
6. Use browser automation to exercise the requested UI flow with imported `/Users/normy/autobyteus_org/autobyteus-agents`, Daily Assistant, Skill Improvement enabled, and Codex/GPT-5.5 selection where exposed.
7. Write the canonical execution coverage report with command output, browser screenshots/artifacts, cleanup, and any infeasible portions.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No` at investigation time
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current and sufficient for the code-level boundaries. User-requested browser validation and live codegen are temporary executable validation scenarios, not planned repository-resident test changes.
