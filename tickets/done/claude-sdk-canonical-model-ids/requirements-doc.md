# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (evidence-only wording correction of BEH-006/REQ-010/AC-007; approved intent unchanged)
- Package identifier: `claude-sdk-canonical-model-ids`
- Request / ticket: Show the canonical Claude model ID in the Claude Agent SDK model dropdown
- Requirements owner: Solution Designer
- Date: 2026-09-24
- Approval state and reference: Approved by the user on 2026-09-24 in the solution conversation ("great. this is what user want to see. approved"), after reviewing `dropdown-preview.md`.
- Exact approved requirements baseline: this document at SR-002 + `dropdown-preview.md` (SR-002 version)
- Behavior-defining supplements: `dropdown-preview.md` (approved illustrative UI preview; model IDs/descriptions are illustrative live data, layout/label rules are normative); `investigation-notes.md` (evidence only)

## Problem And Desired Outcome

- Problem: For runtime `Claude Agent SDK`, the model dropdown and selected field show Claude Code picker names (`Default (recommended)`, `Fable`, `Haiku`, `Opus (1M context)`, `Sonnet`). Users cannot tell which exact model will run; aliases change silently (evidence: `default` resolved to `claude-opus-5[1m]` on one CLI and `claude-opus-5-5[1m]` on another), and two rows (`Default (recommended)`, `Opus (1M context)`) look different but run the same model.
- Affected actors: Users configuring agent runs, team runs and team member overrides with the Claude Agent SDK runtime.
- Desired outcome: One row per real model, labeled with the exact (canonical) model ID; the selected field shows `Anthropic / <canonical model ID>`.
- Observable definition of success: The dropdown matches `dropdown-preview.md` §2–§4.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Current Behavior | Desired Behavior | Preserved Behavior | Evidence |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Option label = SDK display name; one row per SDK row (5 rows) | One row per canonical model ID; primary label = canonical ID; secondary text = SDK display name + description; "Recommended" tag on the row the SDK `default` resolves to | `ANTHROPIC` grouping, search, description text | investigation-notes BEH-001 |
| BEH-002 | User | Selected field = `Anthropic / Default (recommended)` | Selected field = `Anthropic / <canonical ID>` | `<Provider> / <label>` format | BEH-002 |
| BEH-003 | System | Stored/sent value = SDK `value` of chosen row | Still an SDK `value` (never a derived canonical ID). For a merged row, the non-`default` SDK value is stored/sent (e.g. `opus[1m]`) | Nothing Claude receives is invented by AutoByteus | BEH-003 |
| BEH-004 | System | Per-turn alias→resolved binding for token accounting | Unchanged | Unchanged | BEH-004 |
| BEH-005 | User | AutoByteus runtime shows identifiers; Codex and others show their own labels | Unchanged | All non-Claude-Agent-SDK runtimes | BEH-005 |
| BEH-006 | User | New config's model is seeded from the definition's saved default launch config (e.g. `default`, shown as `Default (recommended)`); there is no automatic pre-selection (SR-003 evidence correction) | Unchanged seeding; a seeded `default` displays as the Recommended option (`claude-opus-5-5[1m]` today) | Seeding source | Screenshot; `AgentOrgRunConfigPanel.vue` `configStore.begin({...defaultLaunchConfig})` |

## Scope Guardrail

### In-Scope Use Cases

- UC-001: Pick a Claude Agent SDK model in agent run config, team run config (global default) and team member override.
- UC-002: See the currently selected Claude Agent SDK model, for new configs and for reopened/saved configs (including values saved before this change such as `default`).

### Out Of Scope

- Other runtimes' labels (Codex, AutoByteus, any other runtime).
- Token-usage/analytics screens and run-history labels (separate follow-up candidate).
- Pinning a frozen exact model version (explicitly deferred; see dropdown-preview §4b).
- Changing Claude reasoning/thinking config or context-capacity rules.

### Non-Goals

- Hard-coding a Claude model table in AutoByteus; the Claude SDK remains the source of truth.
- Rewriting saved data.

### Preserved Behavior Boundary

BEH-004, BEH-005; AC-004 (saved configs open and run as before without warning).

### Review Authority

- Blocking `Design Impact` or implementation-correction findings must cite an approved REQ/AC/BEH ID.
- Findings introducing new product behavior, policy, migration obligation or compatibility promise are `Requirement Gap`s requiring renewed user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Source |
| --- | --- | --- | --- | --- |
| REQ-001 | Claude Agent SDK options are grouped so that SDK rows reporting the same canonical model ID (`resolvedModel`) appear as one option. | BEH-001 | Must | User approval SR-002 |
| REQ-002 | Each option's primary label is its canonical model ID. | BEH-001 | Must | SR-002 |
| REQ-003 | Each option shows Claude's display name and description as secondary text. For a merged option, the non-`default` row's display name is used (e.g. `Opus (1M context)`), never `Default (recommended)`. | BEH-001 | Must | SR-002 |
| REQ-004 | The option that the SDK's `default` row resolves to carries a visible "Recommended" tag. | BEH-001 | Must | SR-002 |
| REQ-005 | The selected field shows `Anthropic / <canonical model ID>` in agent run config, team run config and team member override. | BEH-002 | Must | SR-002 |
| REQ-006 | The value saved and sent to Claude is always an SDK-reported `value`. For a merged option it is the non-`default` value (e.g. `opus[1m]`); an unmerged option keeps its own value (e.g. `claude-fable-5[1m]`, `sonnet`). | BEH-003 | Must | SR-002 |
| REQ-007 | A saved value equal to any SDK value covered by an option (including `default`) is recognised as that option: it displays as that option's canonical ID, shows no "unavailable" warning, and runs exactly as before (the saved value is sent unchanged unless the user re-selects). | BEH-003 | Must | SR-002 |
| REQ-008 | If the SDK reports no canonical ID for a row, that row stays its own option labeled with its SDK value — never blank, never guessed. | BEH-001 | Must | SR-002 |
| REQ-009 | Search matches canonical ID, display name, description and the "Recommended" tag text. | BEH-001 | Should | SR-002 |
| REQ-010 | New-config model seeding stays as today (from the definition's default launch config); when the seeded value is `default` it displays as the Recommended option. No new automatic pre-selection is introduced. | BEH-006 | Must | SR-002 intent "same as today"; wording corrected SR-003 |

## Acceptance Criteria

| AC ID | Related REQ | Trigger | Expected Outcome | Alternate / Failure Outcome | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001..004 | Runtime Claude Agent SDK; open dropdown with the 2026-09-24 SDK rows | 4 options: `claude-opus-5-5[1m]` [Recommended] / "Opus (1M context) · Opus 5.5 with 1M context …", `claude-fable-5`, `claude-haiku-4-5-20251001`, `claude-sonnet-5`, each with display name + description | — | Unit (server grouping) + component/browser test |
| AC-002 | REQ-005 | Pick any option in each of the three config surfaces | Field shows `Anthropic / <canonical ID>` | — | Component test |
| AC-003 | REQ-006 | Pick the Opus option and launch | Saved/sent model value is `opus[1m]`; picking Fable sends `claude-fable-5[1m]` | — | Unit/integration |
| AC-004 | REQ-007 | Reopen a config saved with `default` (and one with `opus[1m]`) | Shows `Anthropic / claude-opus-5-5[1m]`, no "unavailable" warning; launch sends the saved value unchanged | Saved value covered by no option → existing "unavailable" behavior unchanged | Component test + unit |
| AC-005 | REQ-008 | SDK row without `resolvedModel` | Own option labeled with its SDK value | — | Unit |
| AC-006 | REQ-009 | Search `opus`, `claude-haiku`, `haiku`, `recommended` | Matching option shown | — | Component test |
| AC-007 | REQ-010 | New team config from a definition whose default launch model is `default` | Field shows `Anthropic / claude-opus-5-5[1m]` with the Recommended option checked; stored value stays `default` | Definition without a default model → empty selection as today | Component test |
| AC-008 | BEH-004, BEH-005 | Codex/AutoByteus dropdowns; Claude turn token accounting | Unchanged | — | Existing tests stay green |

## Relevant Scenarios

| Scenario ID | Kind | Goal | Trigger | Expected Outcome | Validity |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Know exactly which Claude model a run uses | Configure agent/team run with Claude Agent SDK | Canonical ID visible in list and selection | Supported Normal Scenario |
| SCN-002 | User | Reopen an existing Claude run config | Saved value `default`/`sonnet`/`opus[1m]` | Recognised, shows canonical ID, runs as before | Supported Normal Scenario |
| SCN-003 | User | Claude CLI upgrade moves an alias | Reopen after upgrade | Label shows the new canonical ID the alias now resolves to | Supported Normal Scenario |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked supplement: `dropdown-preview.md` (approved SR-002)
- Prototype / Product artifacts: `N/A — not applicable` (no Product Design requested)
- UI/UX user-confirmation reference: user approval 2026-09-24
- Normative: primary label = canonical ID; secondary line = display name · description; "Recommended" tag; selected field format; merged rows; fallback label.
- Illustrative: exact model IDs/description strings (live SDK data); exact tag styling follows existing dropdown styles.

## Data Continuity And Acceptable Loss

- Persisted data affected: `No` — no saved value is rewritten.
- Must preserve: existing saved run configs, team definitions and member overrides open and run unchanged (REQ-007).

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Claude Agent SDK `supportedModels()` | `value` = sendable id; `resolvedModel` optional canonical wire id | `sdk.d.ts` 0.3.231; probes | Alias targets drift; Fable `resolvedModel` drops `[1m]` (hence REQ-006 never sends `resolvedModel`) |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | At most one non-`default` SDK row shares a canonical ID with `default` in practice; if several non-`default` rows share one canonical ID, the first SDK-ordered non-`default` row supplies the send value and display name. | Accepted design detail |

## Open Decisions And Questions

| ID | Question | Decision | Status |
| --- | --- | --- | --- |
| DEC-001 | Show-only vs pin canonical ID | Show canonical ID, merge rows with the same canonical ID, keep sending SDK values; pinning deferred | Resolved — user approval 2026-09-24 |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-002 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-003 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-004 | UC-001 | BEH-001 | AC-001 | SCN-001 |
| REQ-005 | UC-002 | BEH-002 | AC-002 | SCN-001 |
| REQ-006 | UC-001 | BEH-003 | AC-003 | SCN-001 |
| REQ-007 | UC-002 | BEH-003 | AC-004 | SCN-002, SCN-003 |
| REQ-008 | UC-001 | BEH-001 | AC-005 | SCN-001 |
| REQ-009 | UC-001 | BEH-001 | AC-006 | SCN-001 |
| REQ-010 | UC-001 | BEH-006 | AC-007 | SCN-001 |

## Architecture Phase Input

- Where grouping lives (server catalog vs web) and how covered SDK values reach the web.
- How the web validates saved values ("Saved value is unavailable") and pre-selects defaults.
- Consumers keyed by model value (context capacity, token usage, run launch) must remain correct.

## Readiness Check

- Content ready for user approval: Yes
- User approval received: Yes (2026-09-24)
- Exact approval basis recorded: Yes
- Approved package ready for architecture design: Yes
