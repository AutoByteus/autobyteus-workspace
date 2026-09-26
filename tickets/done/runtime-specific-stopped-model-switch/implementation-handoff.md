# Implementation Handoff — Runtime-specific stopped-run model switching

## Upstream Artifact Package

- Review: ARCH-REV-003 **Pass** on SR-009 design against SR-006-approved requirements; prior ARCH-REV-002 DR-001 resolved. Independent source review is required for Medium/High.
- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/requirements-doc.md` (SR-002/SR-006 approval).
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/investigation-notes.md`; cumulative solution history: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/solution-revision-record.md`.
- Current design: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-spec.md` (SR-009). Recovery handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-design-recovery-result.md`. Earlier design supplements remain historical context: `architecture-design-result.md`, `architecture-design-revision-result.md`.
- Independent review: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md`; `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-review-revision-record.md`.
- Supplemental evidence: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/model-picker-verification-investigation.md`; user screenshots and the completed `claude-sdk-canonical-model-ids` test ledger are evidence, not behavior-defining UI specs. Product prototype/UI-UX spec: N/A — not applicable.
- Triggering rework: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/code-review-report.md` and `code-review-revision-record.md` (CRR-007 F-003 Local Fix); `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/api-e2e-execution-coverage-report.md` and `api-e2e-revision-record.md` (API-REV-003 F-API-003). CRR-006 prior Pass is superseded for this package; F-API-002 was directly closed in API-REV-003, while API-REV-001 older-basis Pass remains historical.

## Current Implementation Summary

- Cycle: **Local Fix, IR-005**. Revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/implementation-revision-record.md`. Trigger: CRR-007 F-003, originating in API-REV-003 F-API-003 on the supported saved Application resource Save → fresh reopen path. Related SR-006/SR-009 and ARCH-REV-003 remain authoritative; CRR-006 Pass is superseded, API-REV-003 remains Fail pending rerun; delivery revision N/A for this round. IR-004/F-API-002 is closed by API-REV-003 direct browser proof.
- Claude raw SDK rows remain intact. ClaudeModelCatalog omits `default` from *offered* rows only when SDK-derived alias evidence proves a distinct listed sibling, while retaining exact raw current lookup. ModelCatalogService owns offered/current views. Provider snapshots, `listLlmModels`, changed stopped Save, and new picker choices use offered rows; unchanged persisted ID uses fresh exact raw row and its schema. No implicit ID rewrite.
- Stopped Agent/Team/Org options now carry full current/replacement descriptors. GraphQL/Web generated shapes agree. Existing-run picker uses only that self-contained response; no alias folding, numeric capacity metadata, client-side catalog intersection, or mixed saved/offered fallback. AutoByteus verified non-decreasing replacement capacity remains; external runtimes have no platform capacity gate.
- A batched exact-current GraphQL descriptor query supports server-origin Agent/Team definition and Run seeds, mobile launch, Team inheritance, and Application Launch Setup. These UIs display current-only IDs and schema without re-offering them. Application readiness uses ModelCatalogService exact-current resolution for saved/effective models and credential identity. Application draft consumers guard exact-current lookups to saved/baseline origin; a newly edited arbitrary ID does not gain current status.
- IR-004 corrects `RunConfigPanel.vue`'s Agent form seed binding to its declared `runConfigStore`. The saved exact `default` seed now reaches the Agent Run form instead of throwing during panel render; a focused panel regression mounts that branch and asserts both the seed prop and unchanged config ID.
- IR-005 removes a pre-existing Vue Proxy cloning crash on saved Application Setup restore. `resolveEffectiveResourceRef` now projects the flat saved bundle/shared resource reference into a new plain value rather than calling `structuredClone` on a reactive Proxy. The same utility clones JSON model config from `toRaw(value)` before `structuredClone`, because the IR-003 server-origin profile projection rereads saved reactive launch config in the slot editor. Saved exact IDs and config remain unchanged.
- Stopped lifecycle, per-scope atomic Save, ownership/archive checks, provider binding, local history, visible resume failure path and persistence format are unchanged. No migration.

## Routing Classification

- `task_size=Medium`, `architectural_risk=High` — **confirmed** against SR-009's classification. Shared catalog/GraphQL/Web current-value semantics and application readiness remain High risk; no new subsystem/storage schema was added.
- Route: independent **Code Review** before API/E2E. Lightweight direct-route self-review: N/A. Design Impact/Requirement Gap: none discovered. ARCH-REV-003's Codex workspace-scoping caution remains a focused downstream check; no divergent local catalog was proven.

## Reviewed Behavior Implementation Trace

| Behavior | Production path / result |
| --- | --- |
| BEH-001/005; REQ-002/007/008; AC-001/009/010 | ClaudeModelCatalog normalizes only proven redundant `default`; ModelCatalogService snapshots and RunModelSelectionService options use offered rows; GraphQL run-option descriptors feed `RuntimeModelConfigFields` exact-ID picker/status. |
| BEH-002/006; REQ-004/006/008; AC-002/004/005/008/011 | RunModelSelectionService fresh Save resolves changed ID from offered rows, unchanged ID from exact raw row, then validates that row's schema. Existing Agent/Team/Org lifecycle owners retain guarded, per-scope atomic commit. |
| BEH-003; REQ-003; AC-003 | NativeModelCapacityService checks verified non-decreasing capacity only for changed AutoByteus selections; unchanged settings skip the capacity comparison. |
| BEH-004; REQ-005; AC-006/007/011 | Existing persisted exact ID/provider/session/history and normal resume boundary are untouched; rejection remains surfaced by the existing provider path. |
| BEH-007 preserved; REQ-008; AC-010/011 | Exact-current GraphQL descriptors support definition→Run/mobile and Application Setup current-only display/schema; `RunConfigPanel.vue` passes the exact Agent seed (IR-004), and `applicationLaunchProfile.ts` safely projects saved reactive Application resource/config values on reopen (IR-005). Application host validator uses exact-current metadata; new choices remain normalized. |

## Key Files Or Areas

- Server catalog/policy: `autobyteus-server-ts/src/llm-management/services/{claude-model-catalog,model-catalog-service,run-model-selection-service}.ts`; internal Claude SDK presentation evidence; `application-platform/launch-configuration/application-launch-host-capability-validator.ts`.
- GraphQL/domain: `api/graphql/types/{llm-provider,llm-provider-model-catalog,run-model-config}.ts`; `llm-management/domain/run-model-selection.ts`.
- Web contract/picker: `graphql/queries/{runtimeCurrentModelDescriptorsQueries,runModelOptionsQueries,llm_provider_queries}.ts`, `generated/graphql.ts`, `composables/useRuntimeCurrentModelDescriptor.ts`, `RuntimeModelConfigFields.vue`, `SearchableGroupedSelect.vue`, `modelSelectionOptions.ts`.
- Launch/application propagation: Agent/Team definitions, `RunConfigPanel.vue`/forms/stores, Team member editors/readiness sync, mobile launch, Application Agent/Team profile editors, parent slot editor and `utils/application/applicationLaunchProfile.ts`. Focused tests are adjacent to these owners, including the 31-case RunConfigPanel suite and actual Application Setup parent→slot-editor restore regression.
- Removed obsolete Web alias matching helper/test. Generated GraphQL contains non-handwritten schema-sync diff; no compatibility wrapper was added.

## Important Assumptions And Known Risks

- The Claude SDK's resolved-model identity, not display-name similarity, proves the redundant `default` relation. If no sibling is proven, `default` remains offered.
- Catalog membership at display can change before Save; Save rechecks fresh membership and schema. Provider continuation with a smaller window may compact or reject normally; universal success is not claimed.
- Exact-current query currently uses ModelCatalogService's default environment when no workspace is supplied. Codex can discover by CWD; no divergent workspace catalog was established. Validate if a saved workspace-scoped Codex current ID is absent from process-CWD discovery; do not conflate this with Claude alias normalization.
- Provider snapshots may lag exact-current query; a missing raw current remains visible by identifier but cannot claim schema/readiness. Current-only descriptors never become offered picker items.
- The IR-005 resource-ref projection assumes the `ApplicationExecutionResourceRef` contract remains the existing flat bundle/shared discriminated union; both variants are explicitly covered. JSON `llmConfig` is cloned from the Vue raw object to preserve detached draft values without cloning a Proxy.
- Electron delivery is still in explicit user-verification hold. Prior packaged build and API/E2E artifacts predate SR-009.

## Design Health / Legacy / Persisted Data

- Reviewed posture/root cause/refactor: behavior correction with catalog ownership and duplicate alias policy; **Refactor Needed Now**, bounded. Implementation matches the SR-009 authoritative boundary; no frontend alias rule, raw SDK bypass, or dual old/new GraphQL option shape.
- Dead alias matcher and obsolete stopped-run catalog intersection removed. Changed source implementation files remain under 500 effective nonempty lines; largest is `ApplicationTeamLaunchProfileEditor.vue` at 470. No changed handwritten source delta exceeded 220 lines. No Design Impact escalation.
- Persisted data: **Directly Usable — No Migration**. Read-only local scan parsed 460 Agent, 540 Team, 23 Org JSON files without parse errors; indexed exact `claude_agent_sdk/default` occurs in 1 Agent and 4 Team records, 0 Org. Those records were not modified. Exact IDs, provider history and writer format remain unchanged.

## Environment Or Dependency Notes

- Backend GraphQL schema was printed from the built server and Web codegen regenerated `generated/graphql.ts`; no live user-data write was used.
- Build-produced `autobyteus-application-*-sdk/dist/` directories are untracked local artifacts, not implementation source and not included in the development commit.

## Local Implementation Checks Run

- Server `pnpm -C autobyteus-server-ts run build:full`: Pass, including sanitized built-module/bootstrap smoke.
- Server focused Vitest: 9 suites / 98 tests pass after mock contract repair. Covers Claude no-sibling/redundant/default exact lookup, fresh stopped Save, ModelCatalogService, GraphQL descriptor, application host validator, Team/Org save/lifecycle.
- Web focused Vitest: 9 suites / 88 tests pass; separate Application Agent 6/6 and Team 4/4 reruns pass. Covers current-only `default`, unchanged exact ID/schema, offered-only picker, application readiness, Team seed/inheritance and store behavior.
- IR-004 focused `pnpm -C autobyteus-web test:nuxt components/workspace/config/__tests__/RunConfigPanel.spec.ts --run`: **31/31 pass** (API-REV-002 observed 18/30 failures before this fix). New regression renders the Agent definition→Run panel with exact Claude `default` and verifies the form receives the untouched seed. Nuxt production build passes again after the local fix.
- IR-005 focused `ApplicationLaunchSetupPanel.spec.ts`: **3/3 pass**, now including actual parent→slot-editor reactive saved Agent restore and saved Team Save→fresh reopen (with non-null model config) rather than stubbing the failing slot editor. The three Application parent/Agent editor/Team editor suites pass **13/13**. Nuxt production build and Web boundary/localization guards pass after IR-005; `git diff --check` passes.
- Nuxt production build, Web boundary/localization guards, localization literal audit and `git diff --check`: Pass.
- Full Web typecheck is **not** claimed: `nuxi typecheck` failed in the npx `vue-tsc`/TypeScript package-export toolchain; direct `tsc --noEmit` previously aborted. Production build and focused tests pass, but they are not full template typechecking.
- API-REV-003 remains **Fail** until independent source re-review and fresh API/E2E browser rerun of Application restore. Its real Chromium proof retired F-API-002; do not reopen that finding without contrary evidence. The IR-005 component checks/build are implementation-scoped only; no post-fix browser or new provider continuation pass is claimed.

## Frontend Rendered-Result Check

- Reviewed the user current-state screenshot, shared picker, Agent/Team/Org Settings and adjacent launch/application component styles and Web README. The changed components retain established Tailwind controls, copy and grouping.
- Component-rendered interaction checks exercise exact IDs, current-only label/schema, loading/unavailable states, Team inheritance and application readiness. The IR-005 regression renders the real Application Setup panel and slot editor with Vue-reactive saved Agent/Team references, verifies the selected saved resources, exact Agent `default`/model config and Team config projection, and covers Team Save→fresh reopen. API-REV-003's Chromium DataCloneError is authoritative pre-fix failure evidence. **Direct browser visual inspection after IR-005 is unverified**; downstream browser/API rerun is required. No screenshot alone is claimed as verification.

## Downstream Coverage Hints

- Probe live Claude SDK catalog `default` + sibling, no sibling/ambiguous case, exact saved `default` same-model settings and explicit switch, missing raw current, stale catalog and invalid schema across stopped Agent/Team/Org.
- Exercise definition→Run (Agent/Team/mobile), member inheritance and Application Agent/Team Launch Setup/readiness with exact default; verify current-only display, unchanged persisted ID, and no newly offered default.
- Prioritize isolated Chromium saved Application Agent/Team Setup Save→fresh reopen to retire F-API-003; verify VALID/RUNNABLE and exact current `default` with no DataCloneError. F-API-002 Agents card→Run was already directly closed in API-REV-003. Continue any blocked mobile browser checks. Do not treat local component passes as API/E2E sign-off.
- Check Codex workspace-CWD catalog difference against exact-current query/snapshot and record any genuine mismatch.
- Verify linked Team/Org atomicity, AutoByteus equal/larger/smaller/unknown capacity, external smaller-window offered choices and truthful provider rejection/history preservation. Use isolated test data; do not mutate the five indexed local exact-default records.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Owned by API/E2E Engineer after independent source-review pass. Local checks above do not sign off integrated GraphQL/browser/provider behavior or user verification.
