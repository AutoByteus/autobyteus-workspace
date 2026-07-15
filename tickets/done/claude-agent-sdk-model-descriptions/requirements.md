# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Refined` — approved by the user on 2026-07-13.

## Goal / Problem Statement

When a user opens a runtime-scoped model selector for `Claude Agent SDK`, AutoByteus must show the user-facing description supplied for each live Claude model, not only the alias name. The description must let the user see the concrete model/version and its intended use (for example, `Sonnet 5 · Efficient for routine tasks`) before choosing, while the executable model identifier remains unchanged.

## Investigation Findings

1. The installed `@anthropic-ai/claude-agent-sdk` package (`0.2.71`) defines `supportedModels(): Promise<ModelInfo[]>`, and its `ModelInfo` requires `value`, `displayName`, and `description`.
2. A live probe through Claude Code `2.1.207`, using the same CLI-auth environment policy as AutoByteus, returned:
   - `default` / `Default (recommended)` / `Sonnet 5 · Efficient for routine tasks`
   - `sonnet` / `Sonnet` / `Sonnet 5 · Efficient for routine tasks`
   - `opus` / `Opus` / `Opus 4.8 · Best for everyday, complex tasks · ~2× usage vs Sonnet`
   - `haiku` / `Haiku` / `Haiku 4.5 · Fastest for quick answers`
3. AutoByteus already calls the SDK's `supportedModels()` API, but `claude-sdk-model-normalizer.ts` intentionally normalizes only the identifier, display name, and thinking metadata. It drops `description` before producing the shared `ModelInfo`.
4. The shared `autobyteus-ts` `ModelInfo`, server GraphQL `ModelDetail`, frontend query/store `ModelInfo`, runtime selection projection, and `SearchableGroupedSelect.SelectItem` do not have a description field. The loss therefore persists through every later boundary.
5. A query to the running packaged app at `http://127.0.0.1:29695/graphql` reproduced the bare Claude names, and schema introspection confirmed that `ModelDetail` exposes no description field.
6. The Codex picker looks richer for a different reason: its normalizer concatenates default reasoning effort into `display_name`. It is not proof that the current picker supports a separate description field.
7. Claude descriptions are dynamic and can differ by authentication mode/account entitlement. AutoByteus must surface the SDK-provided value rather than maintain hard-coded model/version copy.

Durable evidence and exact commands are recorded in [`investigation-notes.md`](./investigation-notes.md).

## Supplemental Solution Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Authoritative Relationship |
| --- | --- | --- | --- | --- | --- |
| [`ui-ux-spec.md`](./ui-ux-spec.md) | UI/UX behavior for descriptive model options, search, wrapping, and fallback states | REQ-003, REQ-004, REQ-005, REQ-006, REQ-008 | AC-003, AC-004, AC-005, AC-006, AC-007, AC-009 | `Refined`; approved by the user on 2026-07-13 | Clarifies the observable selector behavior; this requirements doc remains authoritative for scope and acceptance |

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): `Bug Fix / Behavior Change`
- Initial design issue signal (`Yes`/`No`/`Unclear`): `No` — the current catalog, API, store, and shared picker owners remain appropriate.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): `Missing Invariant`
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): `Likely Not Needed`
- Evidence basis: The authoritative SDK descriptor already provides the requested field. The existing Claude normalizer drops it, and each otherwise-correct downstream contract lacks the optional field needed to preserve it. No caller bypasses an owner and no duplicated discovery policy was found.
- Requirement or scope impact: Add one optional, semantically singular description property through the established model-catalog path and teach the shared selector to display/search it. Do not replace display names, combine description into executable identifiers, or create Claude-specific frontend copy.

## Recommendations

- Preserve the SDK's trimmed `description` as separate optional catalog metadata.
- Carry it through the shared `ModelInfo` and GraphQL/frontend model contracts.
- Extend the shared grouped selector with an optional secondary description line and description-aware search so every runtime-scoped selector behaves consistently.
- Keep the closed selected-value label compact (`provider / display name`); the full description is selection guidance in the open list.
- Use a name-only fallback when a runtime supplies no description. Do not fabricate or hard-code a Claude description.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium`

The behavior change is narrow but intentionally crosses the Claude adapter, the shared model DTO, the GraphQL boundary, generated/client types, the runtime-scoped selection projection, and a shared UI component used by desktop, mobile, agent, team, member-override, application-launch, and messaging-launch surfaces.

## In-Scope Use Cases

- `UC-001` A user selects `Claude Agent SDK`, opens a model picker, and compares live Claude models using their names and descriptions.
- `UC-002` A user searches the model picker using text that appears only in a description, such as a concrete version or intended-use phrase.
- `UC-003` A user selects a described Claude model and AutoByteus stores/emits the unchanged SDK model identifier.
- `UC-004` A runtime model has no description and remains selectable with the existing name-only presentation.
- `UC-005` A user encounters the same descriptive Claude options in any existing surface backed by the shared runtime-scoped model-selection path.

## Out of Scope

- Changing Claude model execution, authentication, pricing, entitlement resolution, or model availability.
- Hard-coding Claude model/version descriptions or translating vendor-provided description text.
- Adding the SDK's other currently unused fields such as `resolvedModel`, `supportsFastMode`, or `supportsAutoMode` unless a later requirement needs them.
- Redesigning provider grouping, runtime selection, advanced thinking controls, or closed-control labels.
- A general keyboard-accessibility rewrite of the existing grouped selector; the added descriptive content must not make existing pointer/focus behavior worse.

## Functional Requirements

- `REQ-001` The Claude Agent SDK model normalizer must preserve a non-empty SDK `description` independently from `displayName` and the executable model identifier.
- `REQ-002` The authoritative shared model catalog contract and the server-to-frontend API contract must carry an optional model description without requiring descriptions for runtimes that do not provide one.
- `REQ-003` Every model option built by the shared runtime-scoped selection path must carry its optional model description to the shared grouped selector.
- `REQ-004` An open model selector must render a non-empty description as secondary text associated with the corresponding model name.
- `REQ-005` Model search must match case-insensitively against model identifier, display name, selected label, and description.
- `REQ-006` Description text must wrap within the option row and remain readable alongside the selected checkmark without forcing horizontal overflow or replacing the primary name.
- `REQ-007` Selecting an option must continue to emit and persist only its existing `modelIdentifier`; adding description metadata must not alter runtime invocation values or saved configurations.
- `REQ-008` When description metadata is null, empty, or unavailable, the option must fall back to the current name-only rendering and remain searchable/selectable.
- `REQ-009` Claude descriptions must come from the live SDK discovery response for the active runtime environment and must not be a curated hard-coded table.
- `REQ-010` Existing non-Claude model selectors and media model selectors must remain functional; they may render descriptions when supplied but must not require them.

## Acceptance Criteria

- `AC-001` Given the live SDK rows captured in this investigation, the normalized Claude catalog exposes the same trimmed descriptions for `default`, `sonnet`, `opus`, and `haiku` while keeping their identifiers unchanged.
- `AC-002` The `availableLlmProvidersWithModels(runtimeKind: "claude_agent_sdk")` GraphQL response exposes each available model's nullable description in addition to its current fields.
- `AC-003` Opening the Claude Agent SDK model picker shows both `Default (recommended)` and its live resolved-model/use guidance, and likewise shows descriptions for all other SDK rows that supply them.
- `AC-004` Searching for `Sonnet 5`, `routine tasks`, `complex tasks`, or `quick answers` returns the matching Claude option even when that text is absent from the alias/identifier.
- `AC-005` Long descriptions wrap within the dropdown row; the primary name and selected checkmark remain understandable at the supported desktop and mobile selector widths.
- `AC-006` Selecting `sonnet`, `opus`, `haiku`, or `default` emits exactly that identifier and does not persist the description or resolved concrete model in run configuration.
- `AC-007` Closing and reopening the selector, changing runtime, and using member/model override surfaces continue to work; all surfaces using `useRuntimeScopedModelSelection` receive the same descriptive option metadata.
- `AC-008` A model row with no description renders exactly once as a name-only option and remains selectable; no placeholder description or duplicated name is introduced.
- `AC-009` Existing Codex and AutoByteus option-label behavior remains unchanged, and media selectors that provide no description continue to render as before.
- `AC-010` Existing saved configurations containing only runtime/model identifiers load and execute without migration or compatibility branches.

## Constraints / Dependencies

- Project dependency: `@anthropic-ai/claude-agent-sdk` `^0.2.71`; the locked package is `0.2.71`.
- Installed probe runtime: Claude Code `2.1.207` on 2026-07-13.
- The SDK description is vendor/user-context data and may change between discovery calls, accounts, auth modes, or Claude Code versions.
- The model description is display metadata only and must not become a second model identity.
- The GraphQL client generated file is tracked and must remain synchronized with the server schema/query contract.
- The shared selector accepts non-model consumers; description must therefore be optional and generic.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: Existing agent/team/application/messaging launch configurations store runtime kind, model identifier, and model configuration; they do not store catalog display metadata.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): `Directly Usable — No Migration`
- Existing data to preserve, discard/rebuild, transform, or quarantine: Preserve all current model identifiers and configurations unchanged. Descriptions are re-discovered catalog metadata.
- Unacceptable data loss or corruption: Changing a saved identifier, replacing an alias with a resolved concrete model, or writing ephemeral descriptions into persisted run configuration.
- Relevant availability, maintenance-window, or rollout constraints: None; the API field is additive and nullable.
- Related requirement and acceptance-criteria IDs: REQ-002, REQ-007, REQ-009; AC-002, AC-006, AC-010.

## Assumptions

- SDK description strings are safe plain text and must be rendered through Vue interpolation, not as HTML.
- Showing the description in the open option list is sufficient for informed selection; the closed selected-value label remains compact.
- If the SDK stops returning descriptions, graceful name-only fallback is preferable to stale hard-coded copy.

## Risks / Open Questions

- No blocking requirement questions remain.
- The SDK descriptions may include price/usage information in some auth modes. AutoByteus will display the returned plain text without independently asserting its accuracy.
- The shared selector has pre-existing limited keyboard/listbox semantics. This task will not broaden into a full accessibility redesign, but description association and readable layout remain in scope.

## Requirement-To-Use-Case Coverage

| Requirement IDs | Covered Use Cases |
| --- | --- |
| REQ-001, REQ-002, REQ-003, REQ-004, REQ-009 | UC-001, UC-005 |
| REQ-005 | UC-002 |
| REQ-006 | UC-001, UC-005 |
| REQ-007 | UC-003 |
| REQ-008, REQ-010 | UC-004, UC-005 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001 | Adapter/normalizer contract preserves live SDK metadata |
| AC-002 | API integration exposes optional description |
| AC-003 | Main user-visible Claude picker behavior |
| AC-004 | Description-aware search behavior |
| AC-005 | Responsive/readable option layout |
| AC-006 | Selection identity invariant |
| AC-007 | Shared-surface and state-transition regression coverage |
| AC-008 | Missing-description fallback |
| AC-009 | Non-Claude/non-LLM regression coverage |
| AC-010 | Existing persisted configuration remains directly usable |

## Approval Status

`Approved by the user on 2026-07-13.` This requirements basis and [`ui-ux-spec.md`](./ui-ux-spec.md) are locked design inputs; later material behavior changes require renewed approval.
