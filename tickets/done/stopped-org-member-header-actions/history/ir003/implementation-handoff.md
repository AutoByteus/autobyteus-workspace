# Implementation Handoff — ORG-STOPPED-CONFIG-20260917-001

## Current result and authority
**IR-003 — Rework complete; ready for independent source review. task_size=Medium / architectural_risk=High, confirmed.**
Current SR-007 / DS-REV-003 / ARCH-REV-003 continues approved SR-004/SR-005 and unchanged SR-001/SR-002. Trigger: CRR-005 F-003 Design Impact, corrected within existing REQ-006 / AC-006 / SCN-004. No new intended behavior or scope. F-003 implementation is ready for source review, not self-declared API resolution. F-001/F-002 are RESOLVED in actual API-REV-002 and preserved. Overall API-REV-002 remains **Fail,84.3% validation confidence (not pass rate)**. DR N/A; not delivery-ready.

Workspace W: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions
Canonical ticket T: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions/tickets/in-progress/stopped-org-member-header-actions
Branch codex/stopped-org-member-header-actions; HEAD/base36c149b26c429a0ca6689442fe2aea067533a638 plus uncommitted cumulative IR-001/002/003. Eventual target origin/requirements/flat-agent-organization-model, NOT personal. No commit/push/merge/release, user-server/data/private-package action or migration/reset/repair performed.

## Cumulative upstream package
All names relative to T; routing supplies absolute paths.
- Approved requirements-doc.md; investigation-notes.md; solution-revision-record.md; design-spec.md; current solution-handoff.md.
- Independent architecture review applies: design-review-report.md and architecture-review-revision-record.md, ARCH-REV-001–003. Product prototype N/A.
- personal-stopped-config-comparison.md; bootstrap-handoff.md; historical recovery-handoff.md; supplied evidence/ screenshots.
- Trigger code-review-report.md / code-review-revision-record.md, CRR-005 F-003; prior CRR-003/004 records remain relevant to preserved IR-002.
- api-e2e-coverage-investigation.md; api-e2e-execution-coverage-report.md; api-e2e-test-case-ledger.md; api-e2e-revision-record.md, API-REV-001/002. Current validation/api-r2/README.md, f003-team-plus-parameter-loss.md, f003-team-transport.json, plus-proof.json, external-provider-text-proof.json; validation/crr005-attribution.json and crr005-owner-probe.spec.ts/.log.
- Prior validation/api-live/f001-plus-inheritance.md, f002-empty-model-diagnostic.md and retained native/uncertainty evidence are preserved with their actual revision status.
- implementation-revision-record.md contains IR-001 baseline and appended IR-002/003. Prior implementation handoff snapshot history/ir002/implementation-handoff.md is historical, not current acceptance.

## Complete current implementation
IR-001 remains root-owned exact configured Org member canonical read/Save in the manager transition lane: managed-map exclusion includes fail-stop, typed options/capacity/schema validation, selected leaf patch only, no-op skips write, atomic write plus strict readback defines UPDATED, uncertain/unreadable canonical remains null. Frontend exact identity/generation draft, explicit refresh/no replay, operation exclusion/deferred disposal and staged config-only adoption preserve retained messages/state/Activity/drafts/attachments/status. Restore/Send/provider lifecycle unchanged.

IR-002 remains enclosing-source Org Plus → inactive-capable validated inspection + exact current definitions → pure authorable projection → intent-keyed atomic isolated draft → ordinary Create. Direct/mounted/runtime/model/parameters/tool/workspace values, null/0/false and parent-relative differences survive; no tasks/history/runtime IDs/provider/application bindings cloned. Passive catalog refresh does not erase source selections or overwrite later edits; fresh no-source defaults remain distinct. Shared typed model_required diagnostics are neutral but blocking; real runtime/catalog/unavailable/schema failures keep priority. Current executable checks preserve these paths.

IR-003 replaces BOTH inappropriate retained-view authoring reads:
1. Existing strict network-only refreshTeamResumeConfig now checks requested ID == payload ID == parsed tree root ID BEFORE existing history cache publication.
2. New bounded loadTeamRunLaunchSeed verifies expected definition, obtains only path-matched read-only workspace metadata, deduplicates lookups, then reuses createTeamConfigurationView and buildEditableTeamRunSeed. Configured nodes only; no projections/tasks/communications fetch, ensure/create/restore/start, cache fallback or retained adoption.
3. TeamWorkspaceView header Plus and RunningAgentsPanel existing-source branch capture selection intent, selected subject, source context association, definition and focused Agent. Local pending coalesces clicks. Current mounted/intent/selection/association/focus checks precede synchronous draft install. Failed/late work cannot clear selection or install a stale/default draft; current errors are accessible and the same action retries.
4. Success uses existing setConfig → clear Agent launch config → clear selection/navigation/event. No-source Team template and ordinary Agent branch remain unchanged. Current source canonical/presentation/Activity/composer remain separate from the new authorable draft.

## Reviewed behavior trace
| IDs | Actual path / outcome |
|---|---|
| BEH-001 / REQ-001 | Configured stopped direct/mounted Org header eligibility and Settings entry retained; active/task restrictions unchanged. |
| BEH-002 / REQ-002,003 / AC-002,005 | Existing frontend form/controller/store → root manager lane/validator/writer/readback unchanged; frontend Settings regressions current, backend evidence historical and explicitly attributed. |
| BEH-003 / REQ-005 / AC-004 / DS-004 | Org source-qualified Plus/reader/projector/draft/ordinary Create unchanged; actual API F-001 resolved and durable regressions rerun. |
| BEH-004 / REQ-004,006 / AC-003,006 / SCN-004 / DS-007 | Settings Save→Back→both Team copy consumers→fresh strict loader→existing pure view/seed→draft→ordinary Create serializer. New durable real-owner regression starts from hydrated stale null view and saved canonical0, not manually updated view. |
| BEH-005 / REQ-007 / AC-007 / DS-006 | Shared required-model producer/reason/priority retained; current field/row/Team/Org regression checks, actual API F-002 resolved. |

## Key incremental files (relative to autobyteus-web)
- services/runConfigEditing/teamRunLaunchSeed.ts:48 nonempty lines, one bounded canonical-read/metadata/pure-seed owner.
- stores/runHistoryStore.ts:3-line correlation guard;483 nonempty lines.
- components/workspace/team/TeamWorkspaceView.vue:84 nonempty lines, guarded header copy/status.
- components/workspace/running/RunningAgentsPanel.vue:222 nonempty lines, guarded existing-source copy/status; source-free/Agent branches preserved.
- localization/messages/{en,zh-CN}/workspace.ts: minimal loading/error/retry strings.
- services/runConfigEditing/__tests__/teamRunLaunchSeed.spec.ts; components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts; adjacent TeamWorkspaceView.spec.ts updated for real async read.
- docs/agent_teams.md: canonical source-copy contract.

Exact cumulative42file hashes/counts: validation/ir003-source-manifest.json. Preservation comparison: validation/ir003-preservation.json; **32/34 IR-002 entries byte-exact**, only two locale entries extended. All backend and Org Settings/Plus/shared diagnostic production sources unchanged. Incoming API/reviewer/Designer work preserved.

## Design health, clean cut, data transition and classification
Reviewed root cause confirmed: canonical Team Save succeeds while retained frozen presentation config remains old. DS-007 bounded source-authority correction matches production; no retained-adoption refactor needed. Pure helper/factory/draft owners reused, no new generalized framework/global request registry/cache. Both stale direct snapshot seed calls removed; no compatibility branch, default fallback or old-behavior retention in scope. Shared types/schema unchanged. Design Impact: none. Data remains directly usable—no migration/version fallback/repair.

Medium/High unchanged because cumulative root persistence, identity and lifecycle contracts still govern routing despite narrow incremental frontend change. Current source implementation sizes stay below500 nonempty lines; incremental tracked source deltas below220. Independent source review mandatory; direct-route self-review N/A. Local review checked all six production changes against DS-007, clean-cut scope, failure guards, nonmutation and shared controls.

## Current implementation-scoped checks
- **252 tests /23 files pass**, validation/ir003-current-tests.log. Includes real hydrated source→actual Settings panel/store Save via Apollo seam→actual Back/header and group actions→real loader/factory/seed/draft→ordinary Create serialization and hydration/publication using simulated server response. Source context/view/Agent state/messages/Activity/composer/attachment identities retained; outgoing saved root/member config exact. Simulated fresh server IDs are test transport data, NOT actual server allocation evidence.
- Both callers pending/dedup/error/retry; late selection/newer intent/unmount/source replacement rejection; no-source template control. Loader active/inactive, current/different member model, explicit null/0/false, metadata match/miss/path mismatch/dedup, strict root/payload/malformed/missing/definition checks. No ensure/workspace creation on copy.
- Prior Org seed, diagnostics, actual Settings form and standalone/shared Team/Agent controls included.
- Nuxt production build **passes,16 routes**, ir003-build.log after normal prepare:shared (ir003-build-prerequisites.log). Temporary fixture route removed before build. Existing chunk/Browserslist warnings remain.
- Web/localization guards and git diff --check pass, ir003-guards.log.
- **Strict Vue typecheck not completed**: vue-tsc absent, ir003-typecheck.log. Build is not typecheck. Existing server rootDir/test-tree qualification remains; no backend typecheck or tests rerun this frontend-only increment.
- IR-001107backend/152frontend and IR-002214frontend are historical evidence, not current re-execution. All corresponding backend hashes exact.
- Intermediate harness failures preserved: ir003-initial.log lacked old test's selection-intent seam; ir003-journey.log deliberately failed Create response produced unhandled UI errors. Corrected harness to simulate successful transport allocation with real frontend Create/hydration/publication, no production behavior workaround. Current final log is authoritative.

## Frontend feedback loop
Owned synthetic Nuxt browser renderer at127.0.0.1:50983 with fresh Chrome, actual Team header/group/monitor and new draft form, synthetic Apollo/catalog/metadata boundaries only. Exercised pending → visible failure with source still present → same-action retry → canonical budget0 editable draft for BOTH entry points. Inspected desktop1280x850 and narrow760x850 error wrapping/header/composer layout, loading/status/alert semantics and shared form. No page errors. Evidence, fixture and script in validation/ir003-render/; README records limits. Browser/server stopped; temporary page removed. No backend/provider/user app connected. This is implementation self-validation, not independent API acceptance.

## Risks, assumptions and downstream plan
Fresh reads add bounded latency and truthful unavailability; no implicit stale/default copy. Valid nonempty source path lacking current metadata blocks rather than changes workspaces. Empty path stays incomplete. Snapshot-at-click, not cross-tab live synchronization. Existing source topology/model/runtime availability remains ordinary launch validation. No new per-Agent workspace/schema capability or historical reconstruction.

After independent source review, existing API execution must check **F-003 FIRST: actual native Team Stop→Settings Save→Back→header Plus→editable saved values→ordinary Create→new persisted root/member values and fresh IDs, source unchanged**, with proportional second group-source action. No preupdated view/helper-only/API-command substitute. Then deferred historical-task/live controls. Preserve actual F-001/F-002 resolution, native Settings/uncertainty, qualified Claude direct/mounted continuation and Agent comparator. No all-provider or external model-change certification. API overall remains Fail84.3% confidence until owned rerun.

## Selected route
Fresh get_handoff_rules primary completion rule: Medium / High implementation ready for independent source review → /software_engineering_team/code_reviewer only. This is reviewed DS-007 continuation, not implementation-only Local Fix or new assignment. No parallel Designer/API forwarding. Ordinary delivery confirmation is recorded separately; documents do not themselves claim transport success.
