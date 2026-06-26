# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Code review round 3 pass after CR-001 and later compact Team table/list rework, including `Team total` as the final row and reviewed docs updates.
- Prior Investigation Reviewed: Yes — round 1 investigation and execution report were reviewed. Round 1 covered the post-CR-001 stacked-card implementation; round 2 supersedes it for the latest compact table/list implementation.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The approved behavior to prove in this latest round is:

- The right-side `Token` tab, not the top workspace header, owns token/cost detail.
- Single-agent workspaces keep existing focused-run Token Meter behavior, with no compact header token/cost chip.
- Team workspaces with a focused leaf member use that focused member's agent run as the primary Token Meter subject for current prompt, gross input, output, total estimate, input breakdown, pricing details, and usage report count.
- A team aggregate must not override the focused member primary detail while a leaf member is focused.
- Focus switching between leaf members updates primary gross input/output/total/cost and moves the focused indicator in the subordinate Team comparison.
- Non-leaf/stale team focus must show a focused-run unavailable/empty state rather than falling back to the team aggregate as primary.
- The old `Focused member`, `Member tokens`, and `Member cost` section is removed.
- In team contexts, the secondary section is labeled `Team` and exposes compact per-member rows/list/table data: member name, focused indicator, gross input, output, total tokens, total cost/status, and input/output cost detail. The aggregate appears only as an explicitly labeled subordinate `Team total` final row when present.
- Frontend display renders server/store-owned summary fields and must not recalculate authoritative token totals or prices.
- Simplified Chinese visible terminology keeps `Token` untranslated where required.
- Backend GraphQL run/team/member token summary boundaries remain valid; no backend API change is required for this implementation.
- Durable docs were updated by implementation to remove `TokenUsageHeaderChip.vue` references and document focused Token Meter / subordinate Team comparison behavior; delivery still owns final integrated-state docs sync/no-impact.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanisms were introduced, old aggregate-primary/focused-member behavior is not retained, `TokenUsageHeaderChip.vue` was deleted, and old labels/keys for the removed section were removed from product localization. Code review round 3 independently confirmed those compatibility/removal conclusions and found no unresolved findings.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Team Token tab primary subject resolves to focused leaf member run | Changed | REQ-001/003/004/005, AC-002/003/006/008; design DS-001; implementation handoff `What Changed`; code review round 3 pass | Execute durable component coverage and temporary running UI probe to prove member summary, not team aggregate, drives primary cards. |
| Team focus switching updates primary cards and focused Team row badge | Changed | UC-003, REQ-004, AC-002; handoff suggested scenarios; code review round 3 focus-switch screenshot | Execute durable component test and browser probe switching from one seeded member to another. |
| Team aggregate remains subordinate `Team total` final row only | Changed / Preserved as subordinate | REQ-007C, AC-005B; code review round 3 notes `Team total` integrated as final row | Verify aggregate total appears only as final Team row and primary cards do not show aggregate values. |
| Team comparison changed from stacked member cards to compact responsive table/list | Changed | Code review round 3 trigger and CR-001 resolution; visual validation notes `implementation-focus-team-comparison.png` and `implementation-focus-switch-code-reviewer.png` | Execute durable component tests plus temporary browser probe at relevant panel widths checking required fields/status and no hidden horizontal clipping. |
| Non-leaf/stale focused route shows focused-run unavailable state | Added edge behavior | Design review residual guardrail; implementation handoff `What Changed` and downstream hints | Execute existing component coverage and temporary UI probe with subteam/non-leaf route. |
| Old `Focused member` / `Member tokens` / `Member cost` subsection | Removed | REQ-006, AC-004/005; design removal plan; code review round 3 legacy verdict | Existing component test negative assertions remain valid; browser probe should assert old text absent. |
| Workspace header token/cost chip in agent and team headers | Removed | REQ-008/009, AC-001/007; design DS-003; implementation deleted `TokenUsageHeaderChip.vue`; code review round 3 pass | Existing header component tests remain valid; browser probe should verify headers do not expose token/cost metrics or chip. |
| Server ledger/API token summary boundaries | Preserved | AC-009; investigation notes found GraphQL run/team/member summaries already separated | Existing server E2E remains valid; execute targeted GraphQL E2E as API boundary proof. |
| Simplified Chinese token wording | Changed / Preserved terminology | Implementation handoff final user correction; localization files keep visible `Token` terms | Execute localization audit and temporary zh-CN browser probe. |
| Durable docs references | Changed | Code review round 3 docs-impact verdict and implementation handoff docs note | Not executable coverage; no API/E2E edits. Include delivery handoff note. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts` — focused primary/team comparison scenarios | Asserts detailed Token Meter hierarchy, team leaf focus as primary, aggregate not in primary, focus switch to another member, Team row focused badge, required Team row fields/status, old focused-member wording absent, and non-leaf focus unavailable state instead of aggregate fallback. | REQ-001 through REQ-007C, REQ-010/012; AC-001 through AC-006, AC-008/010; design DS-001/DS-002. | Still Valid | Current test source was inspected in round 2 and matches the latest compact table/list behavior by checking `team-token-row`, required fields/status, and `team-token-total-row` semantics. Code review round 3 passed test quality. | Retain and execute as durable frontend coverage. |
| `autobyteus-web/components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts` — header chip absence | Stubs `TokenUsageHeaderChip` and asserts agent workspace header does not render it. | REQ-008/009/011; AC-001/007. | Still Valid | Header chip removal is an approved clean-cut removal; negative stub catches accidental reintroduction. | Retain and execute. |
| `autobyteus-web/components/workspace/team/__tests__/TeamWorkspaceView.spec.ts` — header chip absence and focused header identity | Stubs `TokenUsageHeaderChip`, asserts team workspace header does not render it, and preserves focused member header identity/status behavior. | REQ-008; AC-007; design DS-003. | Still Valid | Team header token/cost chip is intentionally removed; header must remain focus-oriented. | Retain and execute. |
| `autobyteus-web/stores/__tests__/tokenUsageMeterStore.spec.ts` — live run/team summary store | Verifies live usage events update per-run summaries and team aggregate summaries, including mixed status/cost behavior, cache/reasoning/context fields, and ledger-backed replacement. | REQ-010; AC-009; design DS-004. | Still Valid | Store remains the frontend source-of-truth cache; implementation did not change store semantics but depends on them. | Retain and execute as relevant executable support coverage. |
| `autobyteus-server-ts/tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts` | Verifies GraphQL run summary, team aggregate summary, team-member summary by member run ID, costs/statuses, and statistics. | AC-009; design server ledger/API reuse; investigation notes backend boundary already healthy. | Still Valid | Backend API remains unchanged and authoritative for persisted summaries. | Retain and execute targeted API/E2E. |
| `autobyteus-web/composables/__tests__/useRightSideTabs.spec.ts` — Token visible tab label | Asserts internal `usage` tab remains user-visible `Token`. | REQ-009 and final terminology expectation that Token details remain accessible through right-side Token tab. | Still Valid | This task keeps Token tab as the detail surface. | Retain and execute as lightweight UI navigation coverage. |
| `autobyteus-web/guard:localization-boundary` and `autobyteus-web/audit:localization-literals` scripts | Enforce localization boundaries and no unresolved UI literals. | Simplified Chinese terminology correction; implementation localization updates. | Still Valid | Localization files changed and code review found only an existing Node module warning. | Execute targeted localization guards/audit. |
| `tickets/token-meter-team-member-focus/visual-validation/*` | Implementation-time running-app visual evidence for focused primary, compact Team comparison, final `Team total` row, focus switching, and clean header. | REQ-013, AC-010/011; code review round 3 visual evidence review. | Still Valid as evidence, not durable coverage | Handoff evidence is credible but not a substitute for API/E2E execution-stage validation. | Review as context; collect separate API/E2E round 2 execution evidence. |
| `autobyteus-web/docs/agent_execution_architecture.md`, `autobyteus-web/docs/settings.md` | Durable docs updated by implementation to remove header-chip references and document focused Token Meter / subordinate Team comparison behavior. | Code review round 3 docs-impact verdict. | Out Of Scope for API/E2E coverage | These are docs, not executable coverage. Delivery owns integrated-state docs validation after API/E2E. | No API/E2E edit; include downstream note. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None identified | N/A | Current relevant durable tests already represent approved behavior after the compact table/list implementation; no existing API/E2E test asserts aggregate-primary, old focused-member subsection, stacked cards, or header-chip retention. | Code review round 3 `Dead / Obsolete / Legacy Items` found no obsolete source/test removal needed in changed scope. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | Current reviewed durable component/store/API coverage is adequate for repository-resident regression protection. | AC-008 and AC-009 are already represented by updated component tests plus existing backend/store coverage. | N/A | Additional repository-resident browser E2E would duplicate the component/state coverage without an existing maintained browser-E2E harness for this UI; execution-stage proof will use temporary running-app probes instead. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | N/A | N/A | No repository-resident durable coverage update is planned in this API/E2E round. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-UI-001 | Start backend on `127.0.0.1:8000`, start Nuxt dev on `127.0.0.1:3012`, temporarily inject a local-only Nuxt seed plugin, and drive Chrome with Playwright Core at a default right-panel/narrow viewport. | Team workspace Token tab primary cards use focused member A, not team aggregate; compact Team comparison exposes member name, focused badge, gross input, output, total tokens, cost, status, and input/output split. | The repository currently uses component/Vitest coverage, not a maintained browser E2E harness for seeded workspace UI. The seed plugin is local-only scaffolding and will be removed. |
| TEMP-UI-002 | Same running app/probe, call exposed seed hook to focus member B. | Focus switching updates primary gross input/output/total/cost and moves focused Team-row badge to member B. | Same as above; durable component test already protects this behavior. |
| TEMP-UI-003 | Same running app/probe, call exposed seed hook to focus a non-leaf route. | Primary focused-run detail becomes unavailable/empty and does not show aggregate primary; `Team total` remains subordinate in the Team section. | Same as above; durable component test already protects the edge behavior. |
| TEMP-UI-004 | Same running app/probe, switch to single-agent seeded selection. | Agent workspace header has no token/cost chip and Token tab primary still works for a single agent. | Header/component coverage is durable; browser probe is execution evidence only. |
| TEMP-UI-005 | Same running app/probe, switch locale preference to `zh-CN`. | Visible Token terminology remains untranslated in Simplified Chinese UI where required. | Localization guards plus source review are durable; runtime locale probe is execution evidence only. |
| TEMP-UI-006 | Same running app/probe, collect screenshots/events for compact responsive Team list/table. | `Team total` is the final row; the Team comparison is readable without horizontal clipping at relevant panel widths. | Visual proof is task-specific execution evidence; retaining the local seed harness would be brittle and outside the repo's durable coverage pattern. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Real provider token emission during a live multi-agent team run | The accepted implementation and review used realistic seeded `TokenUsageRunSummary` shapes; running real LLM/team agents would add external-provider cost, credential, and flakiness without changing the UI boundary under validation. | Low. Backend ledger/API E2E plus seeded running UI prove the data contract and focused display behavior. | None for this task. Future provider/runtime changes should keep separate runtime E2E. |
| Large-team performance/batch query behavior | Explicitly deferred by reviewed design; current implementation can fan out one summary fetch per visible leaf member. | Low to medium future optimization risk, not a current correctness blocker. | Delivery notes may keep residual risk; no reroute. |
| Delivery integrated-state docs sync | API/E2E does not own docs sync; implementation docs updates were already reviewed. | Low if delivery runs normal docs pass. | Hand off docs note to `delivery_engineer`. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None currently identified | N/A | Upstream requirements/design/code review are explicit and code review round 3 passed. | N/A |

## Execution Plan

1. Execute the existing valid durable frontend coverage:
   - `pnpm -C autobyteus-web test:nuxt components/workspace/usage/__tests__/TokenUsageMeterPanel.spec.ts components/workspace/agent/__tests__/AgentWorkspaceView.spec.ts components/workspace/team/__tests__/TeamWorkspaceView.spec.ts composables/__tests__/useRightSideTabs.spec.ts stores/__tests__/tokenUsageMeterStore.spec.ts --run`
2. Execute the existing valid API/E2E backend token summary coverage:
   - `pnpm -C autobyteus-server-ts test --run tests/e2e/token-usage/token-usage-ledger-graphql.e2e.test.ts`
3. Execute localization/compilation/boundary checks relevant to changed localization/UI source:
   - `pnpm -C autobyteus-web guard:web-boundary`
   - `pnpm -C autobyteus-web guard:localization-boundary`
   - `pnpm -C autobyteus-web audit:localization-literals`
   - `pnpm -C autobyteus-web build`
4. Run temporary browser validation using backend + Nuxt dev + local-only seed plugin and Playwright Core/Chrome. Capture logs and screenshots under `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/api-e2e-evidence/round-2/`.
5. Remove temporary seed/probe scaffolding after execution; keep only evidence logs/screenshots.
6. Run post-cleanup checks:
   - `pnpm -C autobyteus-web exec nuxt prepare`
   - `git diff --check`
   - verify probe ports are no longer listening and temp files are gone.
7. Update `/Users/normy/autobyteus_org/autobyteus-worktrees/token-meter-team-member-focus/tickets/token-meter-team-member-focus/api-e2e-execution-coverage-report.md` with round 2 results.
8. If no repository-resident durable coverage was added/updated/removed, hand the cumulative package to `delivery_engineer`. If temporary scaffolding accidentally leaves source/test changes, clean them before handoff or route through `code_reviewer` if a durable coverage change remains.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing reviewed durable component/store/API coverage is valid for the latest compact Team table/list implementation. API/E2E will execute that coverage plus temporary running-app UI probes without committing new durable coverage.
