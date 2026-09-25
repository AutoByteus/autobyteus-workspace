# Implementation Revision Record — Runtime-specific stopped-run model switching

The current code and `implementation-handoff.md` are authoritative; this record indexes completed implementation rounds.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture Reviewer / `design-review-report.md` / initial implementation | N/A | Initial Baseline | SR-002, SR-003; ARCH-REV-001; CRR/API-REV/DR N/A | Implementation complete for independent source review |
| IR-002 | Code Reviewer / `code-review-report.md` / round 1 | F-001 | Local Fix | SR-002, SR-003; ARCH-REV-001; CRR-001; API-REV/DR N/A | Exact stopped-run Claude identifiers selectable; return for source re-review |
| IR-003 | Architecture Reviewer / `design-review-report.md` / round 3 | DR-001 resolved | Rework after Design Impact | SR-006, SR-008, SR-009; ARCH-REV-002/003; CRR-002 historical; API-REV/DR N/A this round | Backend offered/current split and launch/application exact-current recovery implemented; return for new source review |
| IR-004 | Code Reviewer / `code-review-report.md` / CRR-005 failure-origin review | F-002 / F-API-002 | Local Fix | SR-006/009; ARCH-REV-003; CRR-004/005; API-REV-002; DR N/A | Agent definition→Run seed binding repaired; return for source re-review |

## Revision Entries

### IR-001 — Runtime-specific selection and truthful option contract

- Triggering role, report path, and round: Architecture Reviewer Pass, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`, ARCH-REV-001; initial implementation.
- Triggering finding IDs: N/A — no blocking architecture finding.
- Classification: Initial Baseline; `task_size=Medium`, `architectural_risk=High` confirmed.
- Prior authoritative result: N/A.
- Current authoritative result: Implementation complete; independent Code Review required by High-risk route.
- Related solution revision IDs: SR-002 approved requirements, SR-003 design.
- Related architecture-review revision IDs: ARCH-REV-001 Pass.
- Related code-review, API/E2E, delivery revision IDs: N/A.
- Why recorded: Establishes the first implementation handoff baseline against the reviewed runtime-specific policy.
- Approved behavior / requirement IDs: BEH-001–006; REQ-001–007; AC-001–009.
- Implementation delta: External runtime options/Save use current catalog membership plus target schema without capacity metadata; AutoByteus retains verified positive non-decreasing capacity. Obsolete external capacity readers were deleted. GraphQL option numeric fields, Web queries/types/fixtures were removed in lockstep and generated GraphQL regenerated from the current backend schema. Agent/Team/Org stopped writers and restore/provider-binding paths remain unchanged. Web copy and catalog-mismatch feedback were updated; relevant docs synchronized.
- Changed areas: `autobyteus-server-ts/src/llm-management`, GraphQL option DTO, Claude/Codex selection-only readers, `autobyteus-web` option query/generated types/picker/Settings copy, focused unit tests and docs.
- Local validation: Server TypeScript build-config typecheck passed after shared build and Prisma generation; five focused server suites passed (41 tests), then revised selection/native suites passed (14 tests). Four focused Web suites passed (52 tests) before final localized-label polish, with the affected component suite passing again (12 tests). Nuxt production build, GraphQL codegen, Web/localization guards, literal audit and `git diff --check` passed. Full `nuxi typecheck` did not run because its npx-installed vue-tsc/typescript pair failed with `ERR_PACKAGE_PATH_NOT_EXPORTED`; Nuxt production build passed. Temporary local Web preview remained blank because `/rest/health` proxy had no backend, so no browser visual/interaction pass is claimed.
- Next recipient / routing: `get_handoff_rules` selected `/code_reviewer` for High-risk independent source review.
- Remaining limitations / risks: Real smaller-window provider continuation unverified; separately loaded Web display/schema catalog may lag server options (visible fallback/retry and schema-unavailable block implemented); external GraphQL consumers, if any, remain a review concern. API/E2E owns executable system/provider validation and final coverage classification.

## IR-002 — Preserve exact Claude catalog IDs in stopped-run picker

- Triggering role, report path, and round: Code Reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`, round 1 (CRR-001).
- Triggering finding IDs: F-001.
- Classification: Local Fix; `task_size=Medium`, `architectural_risk=High` reconfirmed.
- Prior authoritative result: CRR-001 Fail — Local Fix; stopped-run Claude alias and explicit sibling collapsed to one picker item.
- Current authoritative result: Both exact server-offered IDs remain separately selectable in stopped-run Settings; implementation returns for independent source re-review.
- Related solution revision IDs: SR-002, SR-003. Architecture review: ARCH-REV-001. Code review: CRR-001. API/E2E and delivery revisions: N/A.
- Why revised: REQ-002 and AC-001/002 require every external runtime-catalog identifier as a replacement, even when Claude's launch presentation treats one identifier as an alias of another.
- Approved behavior / requirement IDs: BEH-001, BEH-005; REQ-002, REQ-007; AC-001/002; SCN-001-A.
- Implementation delta: `RuntimeModelConfigFields.vue` now filters existing-run options by exact server identifiers, removes launch-only `aliasIds` from those picker items, and supplies an exact-ID row for any ID folded or missing in the separately loaded Web display catalog. New component tests click the real grouped picker in both `default → opus[1m]` and reverse directions; unchanged launch test verifies alias folding remains there. `autobyteus-web/docs/settings.md` describes this distinction. No server policy, GraphQL, Save owner, provider/history or in-editor server-option retry machinery changed.
- Local validation and result: Focused Web component suite 14/14; four related Web suites 54/54; Nuxt production build passed. No real browser stopped-run visual or API/E2E pass claimed; local dev bootstrap still requires an available backend.
- Next recipient or routing: `get_handoff_rules` selected `/code_reviewer` under the Medium/High implementation-owned Local Fix rule.
- Remaining limitations or risks: Real smaller-window provider continuation, browser stopped-run inspection, separately fetched Web catalog lag, external GraphQL consumers and `nuxi typecheck` toolchain issue remain as in IR-001. No new behavior or design decision was introduced.

## IR-003 — Backend-owned Claude offers with exact current continuity

- Triggering role/report/round: Architecture Reviewer ARCH-REV-003 Pass on SR-009 recovery, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`; prior ARCH-REV-002 DR-001 was a Design Impact returned to Solution Designer. Approved requirement basis: SR-006 plus original SR-002.
- Triggering finding IDs: DR-001 (resolved in reviewed design); no new architecture blocker. Prior CRR-001 F-001 and CRR-002 Pass concern the old SR-003 implementation, not this code.
- Classification: Rework after Design Impact; `task_size=Medium`, `architectural_risk=High` confirmed. Prior authoritative result: IR-002 implementation/CRR-002 Pass on old raw-catalog-ID behavior, superseded by approved SR-006/SR-009. Current authoritative result: SR-009 production changes complete, local checks passed, independent source review required.
- Related revisions: SR-006/008/009; ARCH-REV-002/003; CRR-002 historical; API-REV and delivery revisions N/A for this implementation round. BEH-001–007, REQ-001–008 and AC-001–011 traced in the current handoff.
- Why revised: backend Claude catalog previously returned a redundant `default` choice and Web folded it, while a backend-only filter would regress exact saved `default` and Agent/Team definition→Run/Application current-value paths. The user approved backend-provided offers and explicit saved-current continuity; ARCH-REV-003 accepted the corrected owner/consumer design.
- Implementation delta: ClaudeModelCatalog now normalizes offered rows using SDK-derived exact relation, retains raw exact-current lookup, and ModelCatalogService exposes one view. RunModelSelectionService/GraphQL now distinguish offered changed targets from exact unchanged current, with full option descriptors; provider snapshots are offered-only. Web removes alias folding/mixed fallback and renders backend offers plus current-only display/schema via batched exact-current query. Agent/Team definition/run/mobile seeds and Application Agent/Team setup/readiness receive server-origin current descriptors; application host validator uses exact-current resolution. Stopped lifecycle, native capacity, history/provider binding and persisted shape remain unchanged. Obsolete Web alias helper/test removed.
- Changed areas: `autobyteus-server-ts/src/llm-management`, `api/graphql/types`, application host validator; `autobyteus-web/graphql/queries`, generated types, picker/launch/application components, stores/composables/localization and focused tests. See `implementation-handoff.md` for authoritative paths and behavior trace.
- Focused local validation: server `build:full` Pass and 9 suites/98 focused unit tests Pass; Web production build Pass, 9 suites/88 affected tests Pass plus Application Agent 6/6 and Team 4/4 reruns; Web boundary/localization guards, localization literal audit and `git diff --check` Pass. Read-only local JSON audit: 460 Agent, 540 Team, 23 Org parseable files; indexed exact Claude `default` in 1 Agent/4 Team/0 Org, none modified. No full Web typecheck pass (`vue-tsc` toolchain export failure; direct `tsc` abort). No direct SR-009 browser visual state or API/E2E/provider-continuation pass claimed.
- Next recipient/routing: call `get_handoff_rules` for Medium/High completed implementation and send the cumulative package to its single exact returned source-review recipient.
- Remaining limitations: live smaller-window provider continuation, integrated GraphQL/browser flows and Codex workspace-CWD exact-current catalog variance remain downstream checks. Electron delivery/user verification is still on hold. Current code and `implementation-handoff.md`, not this revision index, determine whether the design is fully met.

## IR-004 — Repair Agent definition-to-Run seed binding

- Triggering role/report/round: Code Reviewer CRR-005 focused failure-origin review, `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md`; API/E2E API-REV-002 failure evidence in `api-e2e-execution-coverage-report.md`, `api-e2e-revision-record.md`, focused Run panel log and isolated browser probe.
- Triggering IDs and classification: CRR-005 **F-002**, originating in API-REV-002 **F-API-002**; implementation-owned Local Fix. `task_size=Medium`, `architectural_risk=High` reconfirmed. SR-006/SR-009 and ARCH-REV-003 remain authoritative; CRR-004 Pass is superseded for the affected source, and API-REV-002 remains Fail. Delivery revision: N/A this round.
- Prior authoritative result: IR-003 introduced `:seed-model-identifier="agentRunConfigStore.seedModelIdentifier"` in `RunConfigPanel.vue` without declaring `agentRunConfigStore`. The supported Agents card → Run path threw before rendering; isolated Chromium returned HTTP 500 and the focused panel suite failed 18/30. Current authoritative result: binding uses the component's declared `runConfigStore`, and local focused render/build checks pass. Independent source re-review is required before new API/E2E validation.
- Why revised / affected behavior: preserves BEH-007/REQ-008/AC-010–011 definition→Run exact-current path; the local reference error blocked ordinary Agent Run configuration, independent of the model ID. No new product behavior, catalog policy or design decision.
- Actual delta: `autobyteus-web/components/workspace/config/RunConfigPanel.vue` changes the template seed prop to `runConfigStore.seedModelIdentifier`. Adjacent `__tests__/RunConfigPanel.spec.ts` adds the seed field to the mocked store and a real panel-branch regression that mounts a saved Claude exact-`default` Agent definition, asserts the Agent form receives `default`, and asserts the config ID is untouched. No backend/GraphQL/provider lifecycle code changed.
- Focused local validation: exact API/E2E-reported command `pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/RunConfigPanel.spec.ts --run` now passes **31/31**; Nuxt production build passes; `git diff --check` passes. These are implementation-scoped checks, not an API/E2E pass or direct post-fix browser verification.
- Next routing: call `get_handoff_rules` for a Medium/High implementation-owned Local Fix and return the cumulative package to the single exact source-review recipient. API/E2E must rerun current-basis validation after source review.
- Remaining limitations: API-REV-002's browser failure remains unretired until rerun; Application/mobile browser states were blocked/not tested in that round. Existing provider continuation, Codex CWD variance, full Web typecheck issue and Electron user-verification hold remain as recorded in the current handoff.
