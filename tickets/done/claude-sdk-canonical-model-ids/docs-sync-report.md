# Docs Sync Report — claude-sdk-canonical-model-ids

## Scope

- Ticket: `claude-sdk-canonical-model-ids`
- Trigger: API/E2E Validation Passed (direct route), API-REV-001 / IR-001 / SR-003, from `/api_e2e_engineer` on 2026-09-24.
- Classification preserved: `task_size=Medium`, `architectural_risk=Low`, route `Direct` (architecture review, code review and API/E2E test-code review: `Not Applicable`).
- Bootstrap base reference: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df`
- Integrated base reference used for docs sync: `origin/personal` @ `9267d11c8e82f9798b3870362b221edf39d3d7df`. I checked it with `git fetch origin personal` and `git ls-remote origin personal` on 2026-09-24. The ticket branch `codex/claude-sdk-canonical-model-ids` @ `23e72c3fa` already contains it, so the branch was already current.
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh".

## Why Docs Were Updated

- Summary: Claude Agent SDK catalog rows changed meaning. `canonicalName` is now the SDK-resolved model ID, and GraphQL `ModelDetail` gained a nullable `selectionPresentation` hint. The web model pickers now use one shared builder, show a canonical-ID label with a Recommended badge, and fold aliases so a saved `default` matches its option. The existing long-lived docs described the old projection through `useRuntimeScopedModelSelection` and the old `ModelDetail` field list.
- Why this should live in long-lived project docs: future changes to the Claude catalog, token usage or model pickers must know three rules. `canonicalName` is presentation/identity metadata, not the persisted value. `default` stays a catalog row. The web must follow `selectionPresentation` and never special-case `default`.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Owns `ModelDetail` contract and the Claude Agent SDK catalog sections | `Updated` | Field list + new Claude canonical-ID/picker-hint section |
| `autobyteus-web/docs/agent_execution_architecture.md` | Described runtime-scoped model picker projection | `Updated` | Shared builder, Claude labels, alias fold, no-emit re-select |
| `autobyteus-web/docs/settings.md` | Same picker paragraph (existing-run Settings model editor) | `Updated` | Same text as above |
| `autobyteus-server-ts/docs/modules/token_usage.md` | Claude accounting uses canonical/raw identities | `No change` | Per-turn accounting uses its own resolved-model binding (BEH-004 unchanged); does not read catalog `canonical_name` |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Mentions Claude model IDs | `No change` | Native AutoByteus Anthropic catalog, not the Claude Agent SDK runtime |
| `autobyteus-web/docs/agent_teams.md`, `agent_orgs.md` | Team model selection surfaces | `No change` | Describe selection/validation flows that are unchanged; picker rendering is documented in the files above |
| `autobyteus-application-backend-sdk/README.md` | Launch-config builders | `No change` | Model-selection precedence unchanged |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/llm_management.md` | Contract + new section | `ModelDetail` lists nullable `selectionPresentation`. New section "Claude Agent SDK Canonical Model IDs And Picker Hints" covers the `resolvedModel` → `canonicalName` rule with its fallback, the `default` fold rule, and the fact that identity, validation, launch, capacity and token usage are unaffected. | New public field and changed Claude `canonicalName` semantics |
| `autobyteus-web/docs/agent_execution_architecture.md` | Replaced paragraph | All LLM pickers now go through `buildModelSelectionGroups` (`utils/modelSelectionOptions.ts`). The section covers Claude label, secondary text and selected-field format, recommended-first order and badge, alias folding via `aliasIds`, and alias-aware matching (`utils/selectItemMatch.ts`). Re-selecting the current option does not emit. No `default` special-casing. | The old text named the removed inline projection in `useRuntimeScopedModelSelection` |
| `autobyteus-web/docs/settings.md` | Replaced paragraph | Same as above | Same |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Claude `canonicalName` | It comes from the SDK `resolvedModel` and falls back to the SDK value when that is absent or ambiguous. It is never guessed and is never the persisted value. | `design-spec.md`, `requirements-doc.md` | `llm_management.md` |
| `default` fold rule | `default` folds into the first sibling with the same canonical ID, which becomes recommended. With no sibling, `default` itself is recommended. The rule is presentation-only. | `design-spec.md`, `dropdown-preview.md` | `llm_management.md` |
| Single picker-option owner | `buildModelSelectionGroups` is the only builder. The web follows `selectionPresentation` and never tests the string `default`. Saved aliases match their option, and re-choosing that option does not rewrite the saved value. | `design-spec.md`, `implementation-handoff.md` | `agent_execution_architecture.md`, `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Inline option builders in `composables/useRuntimeScopedModelSelection.ts` and `composables/messaging-binding-flow/launch-preset-model-selection.ts` | `utils/modelSelectionOptions.ts` `buildModelSelectionGroups` | `autobyteus-web/docs/agent_execution_architecture.md`, `settings.md` |
| `item.id === value` matching in `SearchableGroupedSelect` / `RuntimeModelConfigFields` | `utils/selectItemMatch.ts` (id or alias) | same |
| Claude `canonical_name = SDK value` | `canonical_name = resolvedModel ?? SDK value` | `autobyteus-server-ts/docs/modules/llm_management.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary + release notes, then hold for explicit user verification.
- Notes: docs edits are uncommitted in the ticket worktree together with the API/E2E test update and ticket artifacts.
