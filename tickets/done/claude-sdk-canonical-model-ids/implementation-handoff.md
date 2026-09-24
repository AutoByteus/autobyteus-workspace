# Implementation Handoff — claude-sdk-canonical-model-ids

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route. `Architecture Design Complete` with `task_size=Medium`, `architectural_risk=Low` routed Solution Designer → Implementation Engineer; the implementation handoff rule for Small/Medium + Low selects `/api_e2e_engineer` (no Code Reviewer).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/requirements-doc.md` (Approved, SR-003)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/design-spec.md`
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/dropdown-preview.md` (approved UI preview); `solution-handoff.md` (same folder)
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: `N/A` (initial implementation)

## Current Implementation Summary

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/claude-sdk-canonical-model-ids/tickets/in-progress/claude-sdk-canonical-model-ids/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-003`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Branch / commit: `codex/claude-sdk-canonical-model-ids` @ `23e72c3fa` (base `origin/personal` @ `9267d11c8`). Ticket artifacts remain uncommitted in the worktree.

Summary: the server sets Claude `canonical_name` to the SDK `resolvedModel` (falling back to the SDK value when absent or ambiguous). It also attaches a nullable `selection_presentation { recommended, aliasOfModelIdentifier }` derived from the full SDK row set. GraphQL exposes this as `ModelDetail.selectionPresentation`. Catalog identities (`model_identifier` / `value`) are unchanged, and `default` stays a catalog row. On the web, one shared builder (`utils/modelSelectionOptions.ts`) replaces the two duplicated option builders. It folds alias rows into the target option's `aliasIds`, applies the Claude label, description and recommended rules, and orders Claude options recommended-first. `SearchableGroupedSelect` matches a value by id or alias, renders and searches a localized "Recommended" badge, and emits nothing when the user re-chooses the option that already represents the value. `RuntimeModelConfigFields` uses the same matcher.

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: `design-spec.md` → "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 5 server source files (2 new) and 10 web source/transport files (2 new), all inside the owners named in the design. No change to catalog identity, validation, launch, capacity, token-usage or persistence code. The GraphQL change is additive and nullable. None of the escalation triggers fired: (a) no new production reader of Claude `canonical_name` was found (re-grepped); (b) all LLM picker option building goes through `buildModelSelectionGroups`, and the only other `getModelSelection*Label` callers are the AutoByteus/media settings surfaces; (c) no catalog identifier or saved value changed.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes` (diff re-read against the design file table, dependency rules and boundary map; see checks below)
- New design impact or escalation trigger: `None`

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 (REQ-001..004, 008, 009) | One option per canonical model; label = canonical ID; secondary = display name · description; Recommended badge; fallback label; searchable | Server: `claude-sdk-model-normalizer.ts` `resolveCanonicalModelId` + `toModelInfo`; `claude-sdk-model-selection-presentation.ts` `deriveClaudeModelSelectionPresentation`; `claude-sdk-client.ts` `listModels`; GraphQL `llm-provider-model-catalog.ts`. Web: `modelSelectionLabel.ts` (Claude label + `getModelSelectionOptionDescription`), `modelSelectionOptions.ts`, `SearchableGroupedSelect.vue` badge and search | Implemented. Live browser: 4 options, Opus recommended first. When the display name equals the fallback label it is left out of the secondary text so the label is not repeated. |
| BEH-002 (REQ-005) | Selected field `Anthropic / <canonical ID>` | `getModelSelectionSelectedLabel` via builder; `SearchableGroupedSelect.selectedItemLabel` uses `selectItemMatches` | Implemented. Same builder and select serve agent run config, team run config and member override. |
| BEH-003 (REQ-006, 007) | Stored/sent value stays an SDK value; saved alias (e.g. `default`) shown as its option with no warning; re-choosing it does not rewrite it | Option `id` = SDK `modelIdentifier`, alias ids in `aliasIds`; `utils/selectItemMatch.ts`; `SearchableGroupedSelect.selectItem` no-emit when already matched; `RuntimeModelConfigFields.selectableModelOptions` alias-aware filter / no raw "Saved / selected model" row | Implemented. Validation, launch and `hasModelIdentifier` untouched (catalog still has `default`). |
| BEH-004 | Per-turn alias→resolved binding unchanged | Not touched | Preserved. |
| BEH-005 | Other runtimes unchanged | Claude rules keyed on `claude_agent_sdk`; only Claude rows emit `selectionPresentation` | Preserved. Codex labels verified in browser. One side effect of consolidating the builders: the messaging-binding picker now carries `description` like the run-config picker already did. |
| BEH-006 (REQ-010) | Seeding unchanged; seeded `default` shows as the Recommended option | No seeding change; display via alias matcher | Implemented. Seeding path untouched. |

## Key Files Or Areas

Server (`autobyteus-server-ts/src/`):
- `llm-management/domain/model-selection-presentation.ts` (new): `ModelSelectionPresentation`, `ModelInfoWithSelectionPresentation`
- `runtime-management/claude/client/claude-sdk-model-selection-presentation.ts` (new): the default-alias fold rule
- `runtime-management/claude/client/claude-sdk-model-normalizer.ts`: `resolveCanonicalModelId`; `canonical_name` from `resolvedModel`
- `runtime-management/claude/client/claude-sdk-client.ts`: `listModels()` attaches `selection_presentation`
- `api/graphql/types/llm-provider-model-catalog.ts`: `ModelSelectionPresentation` object type; `ModelDetail.selectionPresentation`

Web (`autobyteus-web/`):
- `utils/modelSelectionOptions.ts` (new), `utils/selectItemMatch.ts` (new), `utils/modelSelectionLabel.ts`
- `components/agentTeams/SearchableGroupedSelect.vue`, `components/launch-config/RuntimeModelConfigFields.vue`
- `composables/useRuntimeScopedModelSelection.ts`, `composables/messaging-binding-flow/launch-preset-model-selection.ts` (inline builders removed)
- `graphql/queries/llm_provider_queries.ts`, `generated/graphql.ts`, `stores/llmProviderConfigSupport.ts`
- `localization/messages/{en,zh-CN}/agentTeams.ts`: `…SearchableGroupedSelect.recommended`

Tests: server `claude-sdk-model-selection-presentation.test.ts` (new), `claude-sdk-model-normalizer.test.ts`, `claude-sdk-client.test.ts`, `api/graphql/types/llm-provider.test.ts`, integration `claude-model-catalog.integration.test.ts` (canonical expectation updated; live-only). Web `modelSelectionOptions.spec.ts` (new), `selectItemMatch.spec.ts` (new), `modelSelectionLabel.spec.ts`, `SearchableGroupedSelect.spec.ts`, `RuntimeModelConfigFields.spec.ts`, `launch-preset-model-selection.spec.ts`.

## Important Assumptions

- ASM-001 as approved: when several non-`default` rows share the `default` canonical ID, the first in SDK order is the target.
- The web folds only one level: the target must be listed in the same provider group and must not itself be an alias. If the target is missing, the alias row is listed as its own option instead of disappearing.
- `generated/graphql.ts` was edited by hand to match exactly what `graphql-codegen` produces for the new field. A full regeneration against the current server schema rewrites about 1,500 unrelated lines because the committed file has drifted from the schema; that drift was left alone as out of scope.
- The locale key was added to the hand-written `agentTeams.ts` catalogs, where the other `SearchableGroupedSelect` runtime keys already live, not to `*.generated.ts`.

## Known Risks

- Re-choosing the option that already represents the value no longer emits in any `SearchableGroupedSelect` consumer (design-approved). Before this change, the application launch-profile editors cleared `llmConfig` on a same-model re-select. That reset no longer happens, which is the intended REQ-007 behavior.
- The SDK could rename `default`: the list stays correct but loses the badge and the merge (covered by unit test).
- Live Claude data varies by CLI version. This machine currently reports Fable as `claude-fable-5-1[1m]` → `claude-fable-5-1`, which differs from the preview strings; the preview marks those strings as illustrative.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change
- Reviewed root-cause classification: Duplicated Policy Or Coordination + Missing Invariant
- Reviewed refactor decision: `Refactor Needed Now` (small)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the two inline builders were replaced by `buildModelSelectionGroups`, and the Claude `canonical_name` invariant is fixed in `toModelInfo`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (keeping `default` in the catalog is approved current behavior, not a compatibility path)
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code removed in scope: `Yes` (the two inline option-mapping blocks, and the `item.id === value` comparisons in the select and run-config filter)
- Shared structures remain tight: `Yes` (`SelectItem` gains two optional, generic fields; `ModelSelectionPresentation` has two single-meaning fields)
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes` (largest changed file is `claude-sdk-client.ts` at 484 effective lines, +9/−7 here; no file delta > 220)
- Notes: the web never tests `value === 'default'`; it only follows `selectionPresentation`.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes` (no stored shape or value changed; no migration)
- Direct-use evidence: saved `default` continues to validate against the unchanged catalog. Browser check confirmed `default` stays stored after re-choosing its option.
- Migration implementation: N/A
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree install: `pnpm install --frozen-lockfile --ignore-scripts` at the worktree root. Web tests also need `npx nuxi prepare` (for `.nuxt/tsconfig.json`), and server tests need `prisma generate` plus the shared packages built (`pnpm -C autobyteus-server-ts prepare:shared`).
- The rebuilt `autobyteus-application-sdk-contracts/dist` and `autobyteus-application-backend-sdk/dist` are untracked build output in the worktree (not committed). Web/server application tests fail to resolve those packages without them.
- `GEMINI_SETUP_MODE` and other Gemini/Vertex variables set in the shell make `tests/unit/llm-management/gemini-configuration-service.test.ts` fail. This is environmental and unrelated.

## Local Implementation Checks Run

- Server build typecheck `tsc -p tsconfig.build.json --noEmit`: pass. The full `pnpm typecheck` includes `tests/` and reports only the repo's existing TS6059 rootDir errors.
- Server `pnpm build`: pass (includes the built-in agents bootstrap smoke).
- Server vitest `tests/unit/runtime-management/claude`, `tests/unit/api/graphql`, `tests/unit/llm-management/services`, `tests/unit/token-usage`: 198 passed, 3 failed. The 3 failures (`workspace-converter.test.ts` ×2, `studio-application-api-services.test.ts` ×1) fail identically on base code with my changes stashed, so they are pre-existing.
- Web vitest `utils components/agentTeams components/launch-config components/workspace/config components/applications components/settings composables stores`: 234 files, 1514 tests, all pass.
- Web `guard:web-boundary`, `guard:localization-boundary`, `audit:localization-literals`: pass.
- Web typecheck: not completed. `vue-tsc` is not installed in this workspace, and the `npx` copy fails because TypeScript does not export `lib/tsc` there. Plain `tsc` cannot resolve `.vue` imports, so its only hits in changed files are that `.vue` resolution noise.
- Codegen consistency: the server schema was exported via `printSchema(buildGraphqlSchema())` and `graphql-codegen` run against it. The hand-applied generated lines match its output for the new field.

## Frontend Rendered-Result Check (When Applicable)

- Affected surfaces / journeys: agent run config model picker for runtime Claude Agent SDK. Team run config and member override use the same `RuntimeModelConfigFields`/`MemberOverrideItem` → shared builder → `SearchableGroupedSelect`.
- Approved references: `dropdown-preview.md` §2–§4a; REQ-001..010.
- Design system reviewed: existing `SearchableGroupedSelect` row layout; the badge reuses the repo's pill style (`rounded-full bg-blue-50 text-blue-700 text-xs font-semibold`, with a dark variant).
- Rendered surface used: worktree server built and run on `127.0.0.1:8710` with temp data dir `/tmp/ccmi/data`, backed by the real Claude CLI on this machine, plus `nuxt dev` on `127.0.0.1:3710`. The user's running desktop app was not touched. Both temp servers are now stopped.
- States and interactions inspected (Daily Assistant → Run → runtime Claude Agent SDK):
  - Closed/empty state, then open list: `ANTHROPIC` group with exactly 4 rows. `claude-opus-5-5[1m]` [Recommended] / "Opus (1M context) · Opus 5.5 with 1M context · Best for everyday, complex tasks"; `claude-fable-5-1`; `claude-haiku-4-5-20251001`; `claude-sonnet-5`, each with name · description. Matches §2.
  - Search: `opus` → Opus; `claude-haiku` → Haiku; `haiku` → Haiku; `recommended` → Opus. Matches the §2 search table.
  - Select Opus: field `Anthropic / claude-opus-5-5[1m]`, store `llmModelIdentifier = "opus[1m]"`; reopened list shows Opus highlighted with the check mark and a readable badge. Matches §3.
  - Saved `default` (store value set to `default`, as a reopened config would be): field `Anthropic / claude-opus-5-5[1m]`, Opus `aria-selected=true`, no unavailable warning; re-clicking Opus closes the list and leaves the stored value `default`. Matches §4a / AC-004.
  - Select Sonnet: field `Anthropic / claude-sonnet-5`, stored `sonnet`. Matches §3.
  - Regression: Codex App Server picker still shows its display-name labels with no badges.
- Issues found and corrected: none needed after rendering. Before rendering, the secondary text was changed to leave out a display name that is identical to the fallback label.
- Evidence and remaining gaps:
  - Browser screenshots were captured under `/Users/normy/.autobyteus/browser-artifacts/1c762f-*.png`.
  - Team run config (AC-007, seeded from a definition default) and the member-override surface were not exercised in the browser; they are covered by component tests.
  - Dark mode and narrow viewports were not inspected.
  - §4b (CLI upgrade) and §4c (no canonical ID) are unit-tested only.

## Downstream Coverage Hints / Suggested Scenarios

- Team run config (global default) from a team definition whose default launch model is `default` shows `Anthropic / claude-opus-5-5[1m]` with the Recommended option checked, and the stored value stays `default` (AC-007).
- Team member override picker shows the same four options and selected-field format (AC-002).
- Launch a run saved with `default` and one saved with `opus[1m]`; the sent model is the saved value unchanged (AC-003/AC-004). Picking Fable sends the SDK value (`claude-fable-5-1[1m]` on this machine).
- An existing-run Settings model editor with original `default` offers the Opus option (aliased) and no raw "Saved / selected model" row.
- GraphQL `providerModelCatalogSnapshots(runtimeKind:"claude_agent_sdk")` returns `canonicalName` = resolved ID and `selectionPresentation` as designed; non-Claude runtimes return `selectionPresentation: null`.
- Messaging binding and application launch-profile pickers with Claude runtime show the folded list.
- Codex/AutoByteus pickers are unchanged (AC-008).

## API / E2E / Executable Coverage Investigation And Execution Still Required

Everything above is implementation-scoped. API/E2E ownership remains with `api_e2e_engineer`: durable executable coverage for AC-001..AC-008, the live Claude catalog integration test (`RUN_CLAUDE_E2E=1`; its `canonical_name` expectation was updated to the new semantics but not run live), browser validation of the team run config and member-override surfaces, and launch-path verification that the sent model value is the SDK value.
