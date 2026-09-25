# Implementation Handoff — Runtime-specific stopped-run model switching

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review selected and passed (ARCH-REV-001). `get_handoff_rules` selected the completed Medium/High implementation route to `/code_reviewer`.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/requirements-doc.md` (approved SR-002).
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/investigation-notes.md`.
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/solution-revision-record.md`.
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-spec.md` (SR-003).
- Design supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-design-result.md`.
- Supplemental task artifacts: user screenshot at `/Users/normy/.autobyteus/server-data/memory/agent_teams/software_engineering_team_c4679009eae342829ca9397f5224a9d7/solution_designer_ccc76494f523485bb3ce745671dd8b90/context_files/ctx_2e4254c59c0d__image.png` is current-state evidence only. Product prototype/UI-UX spec: N/A — not applicable. Prior completed ticket is read-only historical context, indexed upstream.
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/design-review-report.md` (Pass).
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/architecture-review-revision-record.md` (ARCH-REV-001).
- Triggering rework report: N/A.

## Current Implementation Summary

- Implementation cycle: Initial.
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-specific-stopped-model-switch/tickets/in-progress/runtime-specific-stopped-model-switch/implementation-revision-record.md`.
- Current implementation revision ID: IR-001.
- Related solution revision IDs: SR-002, SR-003. Architecture review: ARCH-REV-001. Code/API-E2E/delivery revisions: N/A.
- Triggering finding IDs: N/A.
- External stopped-run selections now accept every current runtime-catalog replacement after target-schema validation, without fetching or comparing context capacities. AutoByteus retains verified positive non-decreasing capacity for replacements and exempts same-model settings. The option DTO/GraphQL/Web query/generated type carries identifiers and unavailability reason only. The Web picker exposes server-offered IDs even if its separately fetched label/schema catalog lags, while blocking schema-unavailable Save and offering retry. Agent/Team/Org lifecycle writers and provider restore were deliberately not changed.

## Routing Classification

- Task size: **Medium**; architecture risk: **High**.
- Basis: `design-spec.md` Task Size And Architectural Risk; confirmed by shared eligibility/GraphQL contract, three Settings surfaces, and no persistence/restore schema change.
- Classification: Confirmed, not downgraded. Selected route: **Code Review** under the High-risk condition, confirmed by `get_handoff_rules`.
- Lightweight direct-route self-review: Not Applicable; independent review required.
- New design impact / escalation trigger: None found. No external GraphQL consumer was found in-repo; external consumers remain a residual contract risk.

## Reviewed Behavior Implementation Trace

| Behavior | Approved outcome | Actual production path / result |
| --- | --- | --- |
| BEH-001 | All external runtime-catalog replacements in stopped Agent/Team/Org Settings | `RunModelSelectionService.listOptions/listOptionsMany` returns all external IDs other than saved ID; `run-model-config.ts` → GraphQL query → `RuntimeModelConfigFields.vue` renders IDs with saved fallback. |
| BEH-002 | Fresh catalog/schema Save without external capacity gate | `validate/validateMany` rereads request-local catalog, verifies selected ID and config schema, then existing Agent/Team/Org owners commit. External capacity readers are removed. |
| BEH-003 | AutoByteus verified non-decreasing rule; same-model exception | `NativeModelCapacityService` admits only verified positive native evidence; shared validator compares fresh current/target only for changed AutoByteus models. Same-model schema edits skip capacity. |
| BEH-004 | Resume same run/provider with history and visible failures | Existing lifecycle writers, metadata/tree records and restore adapters were not changed; no Save-time compaction/reset. Downstream real-provider continuation still requires validation. |
| BEH-005 | Runtime-accurate option/status/help copy | `existingRunModelHelp.ts`, Agent/Team/Org form props, picker status, EN/ZH localization; server-offered ID survives Web catalog mismatch with retry/schema-unavailable state. |
| BEH-006 | Per-scope Team/Org validation and atomic Save | Existing linked-scope planners and atomic writers remain; `validateMany` shares only fresh catalog evidence by runtime/workspace and applies each scope's own runtime rule. |

## Key Files Or Areas

- Server authority: `autobyteus-server-ts/src/llm-management/services/{run-model-selection-service,native-model-capacity}.ts`.
- Removed: `runtime-model-capacity-service.ts`, `runtime-model-capacity.ts`, Codex/Claude stopped-selection-only capacity readers and Claude SDK capacity method/test.
- Contract: `autobyteus-server-ts/src/{llm-management/domain/run-model-selection.ts,api/graphql/types/run-model-config.ts}`; `autobyteus-web/{graphql/queries/runModelOptionsQueries.ts,generated/graphql.ts,types/agent/ExistingRunModelConfigDraft.ts}`.
- Web: `RuntimeModelConfigFields.vue`, `AgentRunConfigForm.vue`, `TeamScopeConfigEditor.vue`, `existingRunModelHelp.ts`, EN/ZH workspace messages.
- Focused tests and docs in changed file list; generated GraphQL was regenerated from current backend schema, which also synchronizes preexisting unrelated schema drift (the large generated diff is not handwritten).

## Important Assumptions And Known Risks

- Catalog membership is option authority at load; Save always rechecks the fresh catalog and target schema. A provider may still reject an oversized history on later resume. Do not claim universal external continuation success.
- Web model display/schema catalog is fetched independently from server options. A server-offered but not-yet-displayed model is visible by identifier, but schema-unavailable state blocks Save until retry resolves it; no fabricated schema or capacity veto.
- An out-of-repo GraphQL client using removed numeric fields would need a contract update. No known in-repo consumer uses those fields.

## Task Design Health Assessment Implementation Check

- Posture: Behavior Change; root cause: overly broad shared capacity invariant and loose numeric option DTO.
- Reviewed refactor decision: Refactor Needed Now, bounded. Matched: Yes — one shared policy, native-only evidence, obsolete external readers removed.
- Routed as Design Impact: N/A; no design contradiction found.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: None. Legacy old-behavior retained in scope: No.
- Dead code/readers/tests removed: Yes. Shared option structure tightened: Yes.
- Design guidance reapplied; no boundary bypass or second validator introduced.
- Changed source implementation files stay below 500 effective nonempty lines; no handwritten source delta exceeds 220 lines. Generated `graphql.ts` is a codegen artifact and its larger schema-sync delta is noted above.

## Persisted Data Transition Check

- Approved decision: **Directly Usable — No Migration** (`design-spec.md` Legacy Removal Policy And Persisted-Data Decision).
- Implementation follows decision: Yes. No persistence shape, reader, writer, provider-binding or history change; no migration or version-specific fallback. Only Save eligibility/allowed selected values change.
- Deviation: None.

## Environment Or Dependency Notes

- Offline pnpm install used the existing lockfile/store. Shared packages and Prisma client were generated for local checks; untracked shared `dist/` outputs were removed before handoff.
- GraphQL client codegen used a printed schema from the newly compiled backend (the schema builder's one log line was removed from the SDL file before codegen). No live backend endpoint was needed.

## Local Implementation Checks Run

- Server `tsc -p tsconfig.build.json --noEmit`: Pass after shared build/Prisma generation.
- Focused server Vitest: 5 suites/41 tests pass; subsequent targeted policy/native rerun: 2 suites/14 tests pass.
- Focused Web Vitest: 4 suites/52 tests pass; affected component after final copy polish: 1 suite/12 tests pass.
- Nuxt production build: Pass. GraphQL codegen: Pass. `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`, `git diff --check`: Pass.
- `nuxi typecheck`: toolchain failure before checking source (`vue-tsc` fetched by npx cannot import the paired TypeScript `./lib/tsc` export). This is not claimed as a pass; production build and focused tests passed.
- No downstream API/E2E or real-provider test is claimed.

## Frontend Rendered-Result Check

- Affected surfaces: stopped Agent, Team and Org Settings picker/help/status; reviewed existing shared picker/forms and current-state screenshot. No approved UI prototype; established shared components/styles retained.
- Component render/interactions in focused Vue tests: native eligible filtering, external server-offered model visibility during Web catalog lag, selection emissions, schema-unavailable/retry state, and Agent/Team/Org-related store/form cases passed.
- Browser preview attempt: started project Nuxt dev server and a temporary route mounting the changed shared component. The app bootstrap remained blank because its `/rest/health` proxy had no backend (`ECONNREFUSED`). The temporary route, browser tab and dev server were removed/stopped. **No direct browser visual polish or real stopped-run interaction pass is claimed.** Independent browser/API validation remains required.

## Downstream Coverage Hints / Suggested Scenarios

- Exercise smaller/unknown-capacity offered models for Claude, Codex and Antigravity across stopped Agent/Team/Org; verify AutoByteus equal/larger/smaller/unknown and same-model settings.
- Recheck removed catalog target, unavailable catalog, invalid target schema, active/archive/ownership race, and mixed-runtime linked scopes with no partial write.
- Verify saved model/settings, local history and provider conversation identity on normal resume; probe representative smaller-window external continuations with isolated test runs and record provider rejection visibly without history loss.
- Verify Web display/schema catalog lag: server option remains visible, retry works, and Save is not falsely enabled without a schema.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Owned by API/E2E Engineer after Code Review. Local implementation checks above are not API/E2E sign-off. Real provider/model matrix and rendered stopped-run browser journey remain unverified.
