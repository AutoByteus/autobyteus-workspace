# Requirements Doc

## Status

`Refined`

## Goal / Problem Statement

Determine why Codex CLI exposes six reasoning levels (`low`, `medium`, `high`, `xhigh`, `max`, `ultra`) for `gpt-5.6-sol` while the AutoByteus Codex App Server configuration UI exposes only four (`low`, `medium`, `high`, `xhigh`). Establish the authoritative source of each option set and the exact point where the two surfaces diverge.

## Investigation Findings

- Installed Codex CLI is `0.144.0` at `/Users/normy/.local/bin/codex`, linked to the standalone package under `/Users/normy/.codex/packages/standalone/current/bin/codex`.
- A direct initialized Codex App Server `model/list` probe returns these `gpt-5.6-sol` efforts in order: `low`, `medium`, `high`, `xhigh`, `max`, `ultra`.
- Codex CLI source at tag `rust-v0.144.0` builds its reasoning menu from the selected `ModelPreset.supported_reasoning_efforts`. The model manager obtains model metadata from the remote `/models` catalog with cache/bundled-catalog fallback. The TUI does not maintain a separate four-value list.
- AutoByteus also calls App Server `model/list`, but `codex-app-server-model-normalizer.ts` filters every advertised value through a static `VALID_REASONING_EFFORTS` set containing only `none`, `low`, `medium`, `high`, and `xhigh`.
- Therefore `max` and `ultra` become `null` while the catalog is mapped. The generated AutoByteus `configSchema` contains only the remaining four values advertised by this model; `none` is not included because `gpt-5.6-sol` does not advertise it.
- A live GraphQL probe against the running AutoByteus 1.4.6 server confirmed exactly those four enum values for `gpt-5.6-sol`.
- The frontend is schema-driven and renders every enum value it receives; it does not remove `max` or `ultra`. The loss occurs in the backend before GraphQL/frontend delivery.
- The same backend normalizer is reused for launch-time `llmConfig.reasoning_effort`. Consequently, a manually supplied `max` or `ultra` is also converted to `null` before AutoByteus sends `turn/start.effort`.
- The fixed allowlist was introduced on 2026-02-28 and has not been updated to match the Codex 0.144.0 catalog/protocol. Existing live catalog coverage asserts that normalized values belong to the old list, so it cannot detect that advertised values were dropped.

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Initial design issue signal: `Yes`
- Root cause classification: `Duplicated Policy Or Coordination`
- Refactor posture: `Likely Needed` (focused boundary correction, not a broad subsystem refactor)
- Evidence basis: Codex treats reasoning effort as an open, non-empty, model-advertised value and exposes the per-model list. AutoByteus duplicates that policy in a closed global allowlist at both catalog and run-normalization boundaries, causing drift.
- Requirement or scope impact: A corrective change should keep App Server model metadata authoritative, preserve every advertised per-model value through the catalog/UI path, and keep launch-time validation aligned with the selected model rather than a stale product-wide list.

## Recommendations

1. Correct the backend normalizer boundary; no production frontend option-list change is indicated.
2. Preserve non-empty reasoning effort values advertised by Codex App Server in their advertised order, including future values that this AutoByteus version did not pre-enumerate.
3. Keep user-selectable values model-scoped through the schema returned from `model/list`. At the runtime adapter boundary, validate only that the submitted value is a non-empty string and let the Codex App Server remain authoritative for model support; do not add a second AutoByteus capability cache or closed enum.
4. Add regression coverage that compares raw App Server reasoning efforts with the normalized catalog instead of only checking that normalized values belong to a fixed list.
5. Add launch-path coverage proving `max` and `ultra` survive into `turn/start.effort` for an advertising model and remain unavailable for a model that does not advertise them.
6. Treat `ultra` as a semantic integration case, not only a label: current Codex metadata describes it as maximum reasoning with automatic task delegation, so team-runtime behavior should be exercised explicitly.

## Scope Classification

`Medium`

## In-Scope Use Cases

1. Trace how installed Codex CLI discovers and renders supported reasoning levels for `gpt-5.6-sol`.
2. Trace how AutoByteus discovers, transports, stores, and renders Codex App Server reasoning levels.
3. Probe the local Codex App Server protocol and compare its runtime response with the application data model and UI.
4. Identify the root cause and a recommended correction boundary.

## Out of Scope

- Implementing or releasing a fix before the user approves refined requirements.
- Changing the installed Codex CLI.
- Broad model-catalog or provider redesign unrelated to the reasoning-level discrepancy.

## Functional Requirements

- `REQ-001`: The investigation shall identify the authoritative runtime source used by Codex CLI for the model's supported reasoning levels.
- `REQ-002`: The investigation shall identify every material AutoByteus boundary from Codex App Server model discovery through UI option rendering.
- `REQ-003`: The investigation shall reproduce or probe the local runtime sufficiently to distinguish upstream runtime behavior from an AutoByteus transport, mapping, schema, or UI limitation.
- `REQ-004`: The investigation shall state the root cause, affected files/components, and recommended correction boundary with evidence.
- `REQ-005`: A corrective implementation shall preserve every non-empty reasoning effort advertised for a Codex model by App Server `model/list`, in the advertised order, through the AutoByteus model config schema.
- `REQ-006`: A corrective implementation shall allow an explicitly selected effort that the selected model advertises to reach Codex `turn/start.effort` unchanged.
- `REQ-007`: AutoByteus shall not invent or expose reasoning efforts that the selected Codex model does not advertise.
- `REQ-008`: Agent, team-global, and member-override configuration surfaces shall remain driven by the same runtime-provided schema rather than separate hardcoded UI lists.

## Acceptance Criteria

- `AC-001`: Exact commands and relevant source paths are recorded for both the Codex and AutoByteus paths.
- `AC-002`: A direct local runtime probe records the model metadata or equivalent contract for `gpt-5.6-sol`.
- `AC-003`: The four-option UI behavior is traced to a concrete data source or transformation rather than inferred from the screenshot alone.
- `AC-004`: The final finding explains whether `max` and `ultra` are omitted by Codex App Server, AutoByteus backend, shared schemas, frontend mapping, or display logic.
- `AC-005`: The recommended next step avoids inventing unsupported levels for models that do not advertise them.
- `AC-006`: For local Codex 0.144.0 and `gpt-5.6-sol`, raw `model/list`, AutoByteus GraphQL `configSchema`, and the rendered selector expose the same six efforts in the same order.
- `AC-007`: Selecting `max` for an advertising model sends `turn/start.effort = "max"`; selecting `ultra` sends `turn/start.effort = "ultra"`.
- `AC-008`: A model such as the probed `gpt-5.6-luna`, which advertises `max` but not `ultra`, exposes `max` and does not expose `ultra`.
- `AC-009`: A future non-empty effort value advertised by App Server is not silently discarded solely because it is absent from an AutoByteus global enum.

## Constraints / Dependencies

- Use the currently installed Codex CLI/App Server and current repository state as primary evidence.
- Treat undocumented/private-looking model labels and rollout details with bounded uncertainty.
- Prefer upstream-advertised per-model capability metadata over static product-wide option lists.

## Assumptions

- “codec” in the request refers to OpenAI Codex.
- The screenshots were produced from the same machine and approximately the current installed CLI/runtime state.

## Risks / Open Questions

- `ultra` activates Codex automatic task-delegation behavior according to the 0.144.0 model metadata/protocol comments; interaction with AutoByteus team orchestration requires explicit validation.
- Runtime metadata can change independently of an AutoByteus release, so a correction that only appends today's two labels would retain the same drift class.
- Direct callers can submit a non-empty custom effort string that is not in the UI schema; the Codex App Server, whose protocol intentionally supports custom effort strings, remains authoritative for accepting, normalizing, or defaulting it.

## Requirement-To-Use-Case Coverage

- `REQ-001` -> Use case 1
- `REQ-002` -> Use case 2
- `REQ-003` -> Use case 3
- `REQ-004` -> Use case 4
- `REQ-005` -> Use cases 2 and 3
- `REQ-006` -> Use cases 2 and 3
- `REQ-007` -> Use cases 2 and 3
- `REQ-008` -> Use case 2

## Acceptance-Criteria-To-Scenario Intent

- `AC-001` -> Static source trace of both product surfaces.
- `AC-002` -> Direct App Server or CLI protocol probe.
- `AC-003` -> End-to-end AutoByteus data-flow trace.
- `AC-004` -> Root-cause localization.
- `AC-005` -> Safe correction recommendation.
- `AC-006` -> End-to-end catalog/schema/UI parity for `gpt-5.6-sol`.
- `AC-007` -> Launch payload propagation for the newly observed values.
- `AC-008` -> Per-model capability preservation rather than a product-wide union.
- `AC-009` -> Forward-compatible advertised-value handling.

## Approval Status

Approved by the user on 2026-07-09 with the explicit direction to implement the fix and use the levels returned by Codex App Server rather than hardcoding them.
