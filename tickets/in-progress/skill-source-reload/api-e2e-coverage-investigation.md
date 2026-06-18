# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/skill-source-reload/tickets/in-progress/skill-source-reload/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Updated Round 2 code-review handoff received during API/E2E execution; upstream changes record explicit user approval and Round 2 design/code-review pass only.
- Prior Investigation Reviewed: Round 1 coverage investigation reviewed and remains valid.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The current approved behavior is a user-triggered, global skill catalog reload. The Round 2 upstream update was reviewed on 2026-06-18; it records explicit user approval and a Round 2 design/code-review pass without changing scope, acceptance criteria, design shape, or source code. Therefore the Round 1 coverage inventory and coverage-change decisions remain valid. The backend exposes GraphQL `reloadSkillCatalog`, owned by `SkillService.reloadSkillCatalog()`, which rescans all configured skill sources using existing discovery semantics and returns refreshed `skills` plus refreshed `skillSources`. The frontend Skills page exposes a visible Reload action, owned by `skillStore.reloadSkillCatalog()`, which updates Pinia skill list state and skill-source state from the single mutation response, prevents duplicate submissions, and shows success/error feedback. Reload is scoped to the visible catalog/UI and future runs; it must not claim or implement hot reload of already-materialized skills in active agent sessions. Existing add/remove source refresh behavior, duplicate precedence, malformed-skill skip behavior, and name-keyed disabled state must remain valid.

The implementation handoff's Legacy / Compatibility Removal Check was reviewed. It reports no backward-compatibility mechanisms, no legacy old-behavior retained in scope, and no obsolete code paths needing removal. The inspected code matches that statement: the resolver calls the new service command, the component calls the store action, and no active-run or compatibility fallback path was added.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Backend GraphQL `reloadSkillCatalog` command returns refreshed skills and skill sources. | Added | REQ-SKILL-RELOAD-001..003; AC-SKILL-RELOAD-009; design DS-001/DS-003; implementation handoff. | Keep and run GraphQL E2E coverage. Expand durable coverage to prove changed-on-disk metadata between reload calls and source count changes. |
| Backend service reload rescans existing discovery paths and reapplies disabled flags by skill name. | Added / Preserved | REQ-SKILL-RELOAD-002, 008; AC-SKILL-RELOAD-001..005; design says reuse discovery/disabled state. | Keep service unit coverage. Expand durable coverage for edit/add/remove plus disabled preservation. |
| Frontend store reload mutation replaces skill state and source state from one response. | Added | REQ-SKILL-RELOAD-005; AC-SKILL-RELOAD-008; design DS-002. | Keep store coverage. Add failure-state preservation coverage for AC-SKILL-RELOAD-007. |
| Skills page reload button prevents duplicate submissions and shows loading/success/error feedback. | Added | REQ-SKILL-RELOAD-004, 006; AC-SKILL-RELOAD-006..008. | Keep component coverage. Add loading/disabled-state coverage; success coverage already exists. |
| Detail selection clears when refreshed list no longer contains selected skill. | Preserved | UC-003/004; AC-SKILL-RELOAD-004; existing `pages/skills.vue` behavior. | Existing page spec is still valid; rerun it. |
| Add/remove skill-source flows still refresh visible skill list. | Preserved | REQ-SKILL-RELOAD-007; implementation handoff says flow remains intact. | Existing modal spec is still valid; rerun it. |
| Active runs are not hot-reloaded and UI copy must not imply hot reload. | Preserved / Removed from scope | REQ-SKILL-RELOAD-009; Out of Scope; code review residual risk. | Static copy/source inspection plus final evidence; no active-run E2E needed because behavior is explicitly out of scope. |
| Generated GraphQL artifact includes unrelated schema drift. | Changed generated artifact | Implementation handoff and code review report. | Treat as documented generated drift; run focused frontend tests and localization/type/build checks. No new durable coverage required. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` / reload service scenario | Reload returns added skill and source count from disk. | REQ-SKILL-RELOAD-002, 003, 008; AC-SKILL-RELOAD-001..005, 009. | Needs Update | Existing implementation-added test covers added skill/count but not edited metadata, removal, or disabled preservation called out by acceptance criteria and code-review residual risks. | Update durable test to cover edit/add/remove/count/disabled preservation in one service boundary scenario. |
| `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` / `reloadSkillCatalog` mutation scenario | Mutation returns a skill and source metadata from a temp skill directory. | REQ-SKILL-RELOAD-001..003; AC-SKILL-RELOAD-001..003, 009. | Needs Update | Existing test proves mutation shape but not changed-on-disk metadata between calls or removal after a prior visible state. | Update durable GraphQL E2E scenario to execute two reloads across file edit/add/remove and assert source count. |
| `autobyteus-web/stores/__tests__/skillStore.spec.ts` / reload success scenario | Store mutation replaces `skills` and `skillSources`, clears `reloading`. | REQ-SKILL-RELOAD-005; AC-SKILL-RELOAD-008, 010. | Needs Update | Success path remains valid, but AC-SKILL-RELOAD-007 requires failure preserves previous list/source state. | Add durable failure-path store test. |
| `autobyteus-web/components/skills/SkillsList.spec.ts` / reload success scenario | Button invokes reload action and shows success feedback. | REQ-SKILL-RELOAD-004, 006; AC-SKILL-RELOAD-006, 008, 010. | Needs Update | Success path remains valid. Loading/disabled duplicate-submit behavior is not yet asserted at component level. | Add durable loading-state test for disabled button/loading label. |
| `autobyteus-web/pages/__tests__/skills.spec.ts` / stale selected skill clearing | Page returns to list when selected skill is removed from store list. | UC-003/004; AC-SKILL-RELOAD-004. | Still Valid | Requirement explicitly reuses existing selected-skill clearing behavior. | Rerun unchanged. |
| `autobyteus-web/components/skills/SkillSourcesModal.spec.ts` / remove source refreshes skills | Removing a source refreshes skill list and success message. | REQ-SKILL-RELOAD-007. | Still Valid | Add/remove source behavior must continue to refresh visible list. | Rerun unchanged. |
| `autobyteus-web/localization` guard/audit durable scripts | User-facing reload strings must remain localized. | REQ-SKILL-RELOAD-010. | Still Valid | Code review already ran guards; new UI string coverage depends on these checks. | Rerun unchanged. |
| `git diff --check` | Whitespace sanity for changed source and tests. | Delivery readiness. | Still Valid | Code review ran it; API/E2E should rerun after coverage edits. | Rerun after durable coverage updates. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale or obsolete durable coverage found in the changed scope. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| COV-SKILL-RELOAD-STORE-FAILURE | Frontend reload failure preserves prior skill and source state, clears `reloading`, and records an error. | REQ-SKILL-RELOAD-006/007; AC-SKILL-RELOAD-007. | `autobyteus-web/stores/__tests__/skillStore.spec.ts` | Failure-state preservation is a user-facing acceptance criterion and should remain durable at the store boundary. |
| COV-SKILL-RELOAD-UI-LOADING | Skills page reload button is disabled and shows loading label while reload is in progress. | REQ-SKILL-RELOAD-006; AC-SKILL-RELOAD-006/010. | `autobyteus-web/components/skills/SkillsList.spec.ts` | Duplicate-submit prevention and loading feedback are explicit acceptance criteria. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| COV-SKILL-RELOAD-SERVICE-RESCAN | `autobyteus-server-ts/tests/unit/skills/services/skill-service.test.ts` reload scenario | Cover edited existing `SKILL.md`, externally added skill, externally removed skill, refreshed source count, and disabled preservation. | REQ-SKILL-RELOAD-002/003/008; AC-SKILL-RELOAD-001..005/009. | Boundary-local service proof; no production code change planned. |
| COV-SKILL-RELOAD-GQL-RESCAN | `autobyteus-server-ts/tests/e2e/skills/skills-graphql.e2e.test.ts` reload mutation scenario | Execute initial reload, edit a skill file, add another skill, remove a skill, then reload again and assert mutation response reflects updated metadata and count. | REQ-SKILL-RELOAD-001..003; AC-SKILL-RELOAD-001..003/009. | Durable API/E2E proof of the GraphQL boundary. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No durable coverage removal planned. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-COPY-SCOPE | Static source/localization/docs inspection with `rg` for active-run/hot-reload claims in changed Skills UI/copy/docs. | Reload copy does not claim active-session hot reload. | This is a scope/copy audit, not an automated product invariant requiring repository tests. |
| TEMP-DIFF-AUDIT | `git diff --check` and changed-file inspection. | Coverage edits do not introduce whitespace or unrelated implementation changes. | Existing command evidence is enough; no durable test needed. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Full browser-driven live server UI workflow in a real browser | The repository already has boundary-specific GraphQL E2E and Vue component coverage seams; starting a full Nuxt + backend browser stack would materially exceed the narrow feature proof and mostly duplicate durable GraphQL/component checks. | Low to medium: CSS/layout issues remain possible but button/component behavior is covered. | Record as not run; delivery may perform manual smoke if desired. |
| Malformed skill skip behavior under reload | Existing discovery behavior is preserved and not changed by this feature; no changed failure policy. | Low. | No new test unless future implementation changes discovery error policy. |
| Active-run hot reload | Explicitly out of scope and should not be implemented. | User expectation risk if docs/copy change later. | Delivery docs sync should document or record no-impact; API/E2E performs copy/scope audit only. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No requirement/design ambiguity or implementation compatibility scope issue found during investigation. Round 2 upstream update is approval-status-only and does not change coverage decisions. | N/A |

## Execution Plan

1. Apply the recorded durable coverage updates/additions only in test files: service rescan, GraphQL mutation rescan, store failure preservation, component loading state.
2. Run targeted backend durable coverage: `pnpm -C autobyteus-server-ts exec vitest --run tests/unit/skills/services/skill-service.test.ts tests/e2e/skills/skills-graphql.e2e.test.ts`.
3. Run targeted frontend durable coverage: `pnpm -C autobyteus-web exec vitest --run stores/__tests__/skillStore.spec.ts components/skills/SkillsList.spec.ts components/skills/SkillSourcesModal.spec.ts pages/__tests__/skills.spec.ts`.
4. Run localization guards: `pnpm -C autobyteus-web run guard:localization-boundary` and `pnpm -C autobyteus-web run audit:localization-literals`.
5. Run backend build type check already used by implementation/code review: `pnpm -C autobyteus-server-ts run prepare:shared && pnpm -C autobyteus-server-ts exec tsc -p tsconfig.build.json --noEmit`.
6. Run `git diff --check` and static copy/scope audit for active-run hot-reload claims.
7. Write the canonical execution coverage report with results and route to `code_reviewer` because repository-resident durable coverage will be updated after the prior code review.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is valid but incomplete for several explicit acceptance criteria and code-review residual risks. Planned edits are test-only durable coverage changes; no source implementation change or stale coverage removal is planned. Round 2 upstream artifact changes were reviewed before continuing final execution; they do not alter the coverage plan.
