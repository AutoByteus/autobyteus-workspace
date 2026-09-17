# Implementation Handoff — ORG-STOPPED-CONFIG-20260917-001

## Current result and authority
**IR-004 — Local Fix complete; ready for independent source re-review. task_size=Medium / architectural_risk=High, confirmed.**
Current reviewed SR-007 / DS-REV-003 / ARCH-REV-003 on approved SR-004/SR-005 and unchanged SR-001/SR-002. Trigger CRR-006 F-004 implementation-owned Local Fix within REQ-006 / AC-006 / SCN-004 and DS-007 copy fidelity. CRR-006 accepts the original F-003 fresh-read mechanism at source; F-004 was a pre-existing sparse helper defect exposed by this path. F-004 correction awaits independent source/API validation; not self-declared acceptance.
Actual API-REV-002 F-001/F-002 remain resolved. Overall **Fail84.3% validation confidence, not pass rate**, still applies pending API rerun. DR N/A; no Delivery.


Workspace W: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions
Canonical ticket T: /Users/normy/autobyteus_org/autobyteus-worktrees/stopped-org-member-header-actions/tickets/in-progress/stopped-org-member-header-actions
Branch codex/stopped-org-member-header-actions; HEAD/base36c149b26c429a0ca6689442fe2aea067533a638 plus uncommitted cumulative IR-001/002/003/004. Eventual target origin/requirements/flat-agent-organization-model, NOT personal. No commit/push/merge/release, user-server/data/private-package action or migration/reset/repair performed.

## Cumulative upstream package
All names relative to T; routing supplies absolute paths.
- Approved requirements-doc.md; investigation-notes.md; solution-revision-record.md; design-spec.md; current solution-handoff.md.
- Independent architecture review applies: design-review-report.md and architecture-review-revision-record.md, ARCH-REV-001–003. Product prototype N/A.
- personal-stopped-config-comparison.md; bootstrap-handoff.md; historical recovery-handoff.md; supplied evidence/ screenshots.
- Trigger code-review-report.md / code-review-revision-record.md, CRR-006 F-004; prior CRR-005 F-003; prior CRR-003/004 records remain relevant to preserved IR-002.
- api-e2e-coverage-investigation.md; api-e2e-execution-coverage-report.md; api-e2e-test-case-ledger.md; api-e2e-revision-record.md, API-REV-001/002. Current validation/api-r2/README.md, f003-team-plus-parameter-loss.md, f003-team-transport.json, plus-proof.json, external-provider-text-proof.json; validation/crr005-attribution.json and crr005-owner-probe.spec.ts/.log.
- Prior validation/api-live/f001-plus-inheritance.md, f002-empty-model-diagnostic.md and retained native/uncertainty evidence are preserved with their actual revision status.
- implementation-revision-record.md contains IR-001 baseline and appended IR-002/003/004. Prior handoff snapshots history/ir002/implementation-handoff.md and history/ir003/implementation-handoff.md are historical, not current acceptance. Reviewer diagnostic validation/crr006-seed-fidelity-probe.spec.ts/.log and source audit/web log remain untouched; setup-error log remains invalidated as described by reviewer.

## Complete current implementation
IR-001 remains root-owned exact configured Org member canonical read/Save in the manager transition lane: managed-map exclusion includes fail-stop, typed options/capacity/schema validation, selected leaf patch only, no-op skips write, atomic write plus strict readback defines UPDATED, uncertain/unreadable canonical remains null. Frontend exact identity/generation draft, explicit refresh/no replay, operation exclusion/deferred disposal and staged config-only adoption preserve retained messages/state/Activity/drafts/attachments/status. Restore/Send/provider lifecycle unchanged.

IR-002 remains enclosing-source Org Plus → inactive-capable validated inspection + exact current definitions → pure authorable projection → intent-keyed atomic isolated draft → ordinary Create. Direct/mounted/runtime/model/parameters/tool/workspace values, null/0/false and parent-relative differences survive; no tasks/history/runtime IDs/provider/application bindings cloned. Passive catalog refresh does not erase source selections or overwrite later edits; fresh no-source defaults remain distinct. Shared typed model_required diagnostics are neutral but blocking; real runtime/catalog/unavailable/schema failures keep priority. Current executable checks preserve these paths.

IR-003 replaces BOTH inappropriate retained-view authoring reads:
1. Existing strict network-only refreshTeamResumeConfig now checks requested ID == payload ID == parsed tree root ID BEFORE existing history cache publication.
2. New bounded loadTeamRunLaunchSeed verifies expected definition, obtains only path-matched read-only workspace metadata, deduplicates lookups, then reuses createTeamConfigurationView and buildEditableTeamRunSeed. Configured nodes only; no projections/tasks/communications fetch, ensure/create/restore/start, cache fallback or retained adoption.
3. TeamWorkspaceView header Plus and RunningAgentsPanel existing-source branch capture selection intent, selected subject, source context association, definition and focused Agent. Local pending coalesces clicks. Current mounted/intent/selection/association/focus checks precede synchronous draft install. Failed/late work cannot clear selection or install a stale/default draft; current errors are accessible and the same action retries.
4. Success uses existing setConfig → clear Agent launch config → clear selection/navigation/event. No-source Team template and ordinary Agent branch remain unchanged. Current source canonical/presentation/Activity/composer remain separate from the new authorable draft.

IR-004 changes only the owned sparse transform in composables/useDefinitionLaunchDefaults.ts: for Agent and existing shared Team-scope projection, emit a cloned explicit llmConfig whenever runtime or model differs from its parent, OR parameters differ. This preserves equal concrete parameters and explicit null under the resolver's intentional model/runtime override semantics. No change to the resolver: a deliberate new model/runtime edit with unspecified config still clears inherited config. Equal model/runtime/parameters still yields no redundant override. No backend/reader/cache/UI-default/retained-context mechanism changed.

## Reviewed behavior trace
| IDs | Actual path / outcome |
|---|---|
| BEH-001 / REQ-001 | Configured stopped direct/mounted Org header eligibility and Settings entry retained; active/task restrictions unchanged. |
| BEH-002 / REQ-002,003 / AC-002,005 | Existing frontend form/controller/store → root manager lane/validator/writer/readback unchanged; frontend Settings regressions current, backend evidence historical and explicitly attributed. |
| BEH-003 / REQ-005 / AC-004 / DS-004 | Org source-qualified Plus/reader/projector/draft/ordinary Create unchanged; actual API F-001 resolved and durable regressions rerun. |
| BEH-004 / REQ-004,006 / AC-003,006 / SCN-004 / DS-007 | Settings Save→Back→both Team copy consumers→fresh strict loader→existing pure view/seed→draft→ordinary Create serializer. Current durable real-owner regression starts from hydrated stale null view and saved canonical0, including a compatible per-member replacement with equal parameters; outgoing Create preserves both model and0. Not a manually updated view. |
| BEH-005 / REQ-007 / AC-007 / DS-006 | Shared required-model producer/reason/priority retained; current field/row/Team/Org regression checks, actual API F-002 resolved. |

## Key files (relative to autobyteus-web; IR-003 carried, IR-004 delta below)
- services/runConfigEditing/teamRunLaunchSeed.ts:48 nonempty lines, one bounded canonical-read/metadata/pure-seed owner.
- stores/runHistoryStore.ts:3-line correlation guard;483 nonempty lines.
- components/workspace/team/TeamWorkspaceView.vue:84 nonempty lines, guarded header copy/status.
- components/workspace/running/RunningAgentsPanel.vue:222 nonempty lines, guarded existing-source copy/status; source-free/Agent branches preserved.
- localization/messages/{en,zh-CN}/workspace.ts: minimal loading/error/retry strings.
- services/runConfigEditing/__tests__/teamRunLaunchSeed.spec.ts; components/workspace/team/__tests__/TeamCanonicalPlus.spec.ts; adjacent TeamWorkspaceView.spec.ts updated for real async read.
- docs/agent_teams.md: canonical source-copy contract.

IR-004 incremental application delta is only composables/useDefinitionLaunchDefaults.ts (157nonempty lines;6added/2removed), plus its colocated tests and extended TeamCanonicalPlus.spec.ts. No new production module; both existing difference functions apply the same inheritance rule. Pure existing Team-scope projection control is not new nested-Team runtime support.

Exact cumulative44file hashes/counts: validation/ir004-source-manifest.json. Preservation: validation/ir004-preservation.json; **41/42 IR-003 entries byte-exact**, only TeamCanonicalPlus test extended within that prior manifest; helper+colocated test were outside it. All IR-003 production files and all earlier backend/Org Settings/Org Plus/diagnostics are exact unchanged. Other-owner evidence preserved.

## Design health, clean cut, data transition and classification
Reviewed root cause confirmed: canonical Team Save succeeds while retained frozen presentation config remains old. DS-007 bounded source-authority correction matches production; CRR-006 exposed the reused helper's equal-parameter loss, now corrected locally without altering that design; no retained-adoption refactor needed. Pure helper/factory/draft owners reused, no new generalized framework/global request registry/cache. Both stale direct snapshot seed calls removed; no compatibility branch, default fallback or old-behavior retention in scope. Shared types/schema unchanged. Design Impact: none. Data remains directly usable—no migration/version fallback/repair.

Medium/High unchanged because cumulative root persistence, identity and lifecycle contracts still govern routing despite narrow incremental frontend change. Current source implementation sizes stay below500 nonempty lines; incremental tracked source deltas below220. Independent source review mandatory; direct-route self-review N/A. Local review checked all six production changes against DS-007, clean-cut scope, failure guards, nonmutation and shared controls.

## Current implementation-scoped checks
- **280tests /26files pass**, validation/ir004-current-tests.log. Includes entire prior252 suite, extended actual Save→Back→header AND group→fresh read/factory/seed/draft→ordinary Create serialization cases for same/different member model, helper round-trips and adjacent hierarchy/resolver controls.
- Before production fix, extended real-owner tests reproduced **2fail/13pass** (both entry points lose parameters only with changed member model), ir004-before-fix.log. Fixed focused tests29pass initially, ir004-focused.log; final suite additionally includes shared scope projection control.
- Helper tests cover model/runtime/both differences with equal low, explicit null,0/false; effective resolved draft and ordinary launch records match canonical input. Deep isolation, sparse unchanged inheritance and deliberate omitted-config clearing controls remain. Existing shared Team-scope test is pure projection only, not runtime admission.
- Real-owner test uses actual Settings planner/store/mutation client with controlled compatible replacement metadata and wire response, actual Save and Back UI, actual Plus handlers and ordinary Create path. No live provider/backend allocation claim: new server IDs are simulated at transport. Existing nonempty source history/Activity/drafts/attachments/contexts remain intact.
- Nuxt production build **passes16routes**, ir004-build.log after normal prepare:shared in ir004-build-prerequisites.log. Temporary route removed first. Known generated SDK dist cleaned after build; no user data touched.
- Boundary guards and git diff --check pass, ir004-guards.log. **Strict Vue typecheck NOT completed**, vue-tsc absent, ir004-typecheck.log. Build is not typecheck. Existing server rootDir/test-tree limits carried; no new backend test/typecheck execution.
- IR-001107backend/152web, IR-002214web, IR-003252web and reviewer252web retain historical provenance. All backend sources unchanged. No prior pass relabeled as current broad acceptance.

## Frontend feedback loop
Only a seed transformation changed; layout/controls unchanged. Proportional current self-check used actual header/copy/new form/member override with synthetic canonical root model + replacement member model, both budget0. Expanded actual member override/Advanced, verified selected replacement model and preserved0, edited to2. Inspected desktop1280x1000/narrow760x1000 shared scroll/footer presentation; screenshots show the scoped form (parameter row partly below fixed footer; actual value and edit checked by browser interaction). No page errors. Evidence in validation/ir004-render/ with explicit synthetic fixture/script/results. Owned Nuxt127.0.0.1:50983 and Chrome stopped, temporary route removed; no backend/provider/user profile connected. Expected unused local health proxy rejection appears in server log. This is implementation self-validation, not actual backend Settings/Plus/Create acceptance. Prior IR-003 pending/error/dedup/retry rendering evidence is carried, not relabeled a new full rerun.

## Risks, assumptions and downstream plan
Fresh reads add bounded latency and truthful unavailability; no implicit stale/default copy. Valid nonempty source path lacking current metadata blocks rather than changes workspaces. Empty path stays incomplete. Snapshot-at-click, not cross-tab live synchronization. Existing source topology/model/runtime availability remains ordinary launch validation. No new per-Agent workspace/schema capability or historical reconstruction.

After independent source review, existing API execution must check **F-003 FIRST: actual native Team Stop→Settings Save→Back→header Plus→editable saved values→ordinary Create→new persisted root/member values and fresh IDs, source unchanged**, including F-004 supported compatible member-model/equal-parameter variation and proportional second group-source action. No preupdated view/helper-only/API-command substitute. Then deferred historical-task/live controls. Preserve actual F-001/F-002 resolution, native Settings/uncertainty, qualified Claude direct/mounted continuation and Agent comparator. No all-provider or external model-change certification. API overall remains Fail84.3% confidence until owned rerun.

## Selected route
Fresh get_handoff_rules most-specific implementation-owned Local Fix / High rule selects /software_engineering_team/code_reviewer only. This is existing CRR-006 F-004 rework, not a new assignment. No parallel Designer/API forwarding. Ordinary delivery confirmation is recorded separately; documents do not themselves claim transport success.
