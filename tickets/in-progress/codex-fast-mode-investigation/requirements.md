# Requirements Doc

## Status

`Design-ready — user approved the narrowed capability-discovery fix on 2026-09-01.`

## Goal / Problem Statement

Replace AutoByteus's deprecated Codex Fast capability discovery with the current structured `serviceTiers` contract. Preserve the existing Fast selector and verified runtime behavior. Do not add effective-tier status to the run header or any other runtime-specific global UI surface.

## Current And Desired Behavior

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| `BEH-001` | Fast already flows correctly from `llmConfig.service_tier: "fast"` to Codex thread start/resume and every turn. | Preserve unchanged. | Shared per-workspace app-server reuse and per-thread/per-turn tier isolation remain unchanged. | `REQ-001`–`REQ-004`, `AC-001`–`AC-005` |
| `BEH-004` | Model normalization enables the Fast selector from deprecated `additionalSpeedTiers`, although Codex 0.151/0.152 supplies structured `serviceTiers` with provider ID `priority` named Fast. | Use canonical structured `serviceTiers` as the sole Fast capability authority. A `priority` entry enables the existing product-facing `fast` option. Remove deprecated-field and snake-case fallback parsing. | The generic configuration form, label `Fast mode`, submitted value `fast`, and Default-as-omitted behavior remain unchanged. | `REQ-005`, `REQ-006`, `AC-006`–`AC-010` |
| `BEH-005` | AutoByteus does not expose Codex's effective-tier acknowledgement in the UI. | Preserve unchanged by explicit user decision. | No header badge, Activity row, tree decoration, new diagnostics surface, or runtime-status transport change. | `REQ-007`, `AC-011` |

## Investigation Findings

- Existing Fast execution is correct; the change is isolated to capability discovery.
- Codex 0.151.0 (the binary used by the running AutoByteus app server) and installed 0.152.0 both return `serviceTiers: [{ id: "priority", name: "Fast", ... }]` for `gpt-5.6-sol`.
- Both versions return effective `priority` for a requested `fast` thread.
- The existing generic configuration form already renders the config-schema parameter and requires no source change.
- The user explicitly rejected model/runtime-specific effective-tier state in the global run header and considers the configuration form sufficient.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/codex-fast-mode-investigation/tickets/in-progress/codex-fast-mode-investigation/fast-mode-probe-report.md` | Runtime/protocol/code evidence | `REQ-001`–`REQ-006` | `AC-001`–`AC-010` | Complete / `N/A` evidence | Establishes current correctness and structured metadata availability. |

## Design Health Assessment

- Change posture: `Cleanup`.
- Initial design issue signal: `No`.
- Root cause classification: `Local Implementation Defect` (deprecated adapter field selection).
- Refactor posture: `Likely Not Needed`.
- Evidence basis: Codex model normalizer, catalog service, unit/live integration coverage, and live 0.151/0.152 `model/list` probes.
- Requirement/scope impact: make a clean-cut field-source replacement inside the existing Codex model adapter; do not change execution, storage, frontend components, or process ownership.

## Recommendations

- Treat `serviceTiers[].id === "priority"` after trim/lowercase normalization as the current provider capability for product Fast.
- Keep product configuration value `fast`; capability discovery and submitted configuration vocabulary remain separate concerns.
- Remove deprecated `additionalSpeedTiers`/`additional_speed_tiers` parsing and tests rather than retain a compatibility fallback.
- Align unit coverage and identify the live catalog parity test for API/E2E coverage investigation.

## Scope Classification

`Small`.

## Scope Guardrail

### In-Scope Use Cases

- `UC-001`: Open a Codex model configuration whose current structured metadata advertises provider tier `priority` and see the existing Fast option.
- `UC-002`: Open a Codex model configuration without structured provider tier `priority` and do not see Fast.
- `UC-003`: Select Fast or Default through the existing configuration form and preserve current submission/runtime behavior.

### Out of Scope

- Effective-tier display or transport.
- Any run-header, Activity, tree, mobile, or other frontend presentation change.
- Parsing provider acknowledgements from thread start/resume.
- Process ownership or Fast runtime execution changes.
- Arbitrary service-tier product support, latency measurement, or performance guarantees.
- Retaining deprecated metadata fallback for older Codex versions.

### Preserved Behavior Boundary

- Preserve `BEH-001` and `BEH-005` exactly.
- Preserve stored `service_tier: "fast"` values, the existing generic config form, reasoning-effort independence, and all non-Codex behavior.

### Review Authority

- Every blocking downstream finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID.
- Any effective-tier UI, runtime-status transport, migration, or broader service-tier behavior is a requirement gap and must return for user approval.
- Adjacent observability work must not be promoted into this scope.

## Functional Requirements

### Verified Baseline Requirements

- `REQ-001`–`REQ-004`: Preserve the completed investigation result and current correct Fast request propagation/isolation.

### Approved Change Requirements

- `REQ-005`: Read Fast capability only from the current canonical `serviceTiers` array returned by Codex `model/list`.
- `REQ-006`: Enable the existing `service_tier` config-schema parameter only when a well-formed structured tier entry has normalized provider ID `priority`; malformed entries and non-priority tiers must not enable Fast.
- `REQ-007`: Make no effective-tier UI, frontend state, websocket/GraphQL transport, thread response parser, or runtime-context change.

## Acceptance Criteria

### Verified Baseline

- `AC-001`–`AC-005`: Existing investigation acceptance criteria remain satisfied and protect current Fast propagation and shared-process isolation.

### Capability Discovery

- `AC-006`: A row with `serviceTiers: [{ id: "priority", name: "Fast" }]` produces the existing optional enum parameter `{ name: "service_tier", label: "Fast mode", enum_values: ["fast"] }`.
- `AC-007`: Matching is case/whitespace normalized on the structured entry ID.
- `AC-008`: Rows containing only non-priority structured tiers, malformed tier entries, or no `serviceTiers` omit the Fast parameter.
- `AC-009`: Deprecated `additionalSpeedTiers` or `additional_speed_tiers`, even when containing `fast`, do not enable Fast without a structured `priority` entry.
- `AC-010`: Reasoning-effort schema derivation and all other model mapping output remain unchanged.
- `AC-011`: No runtime header/status or other effective-tier UI is introduced; existing form selection remains the only user-facing tier surface.

## Constraints / Dependencies

- Verified supported local protocol baseline: Codex app-server 0.151.0 and 0.152.0.
- Current canonical model-list field is camel-case `serviceTiers`; do not add undocumented compatibility aliases.
- Product config remains `fast`, which current Codex accepts. Provider metadata ID `priority` is used only to establish capability.
- The generic frontend form consumes the existing config schema and requires no modification.

## Persisted Data Outcome

- Stored subject: existing agent/team/default/member `llmConfig.service_tier` JSON.
- Required outcome: `Directly Usable — No Migration`.
- Preserve existing `fast` values unchanged.
- No schema, rewrite, backfill, or runtime reader change is required.
- Unacceptable loss: dropping existing Fast selections or changing them to provider metadata value `priority`.

## Assumptions

- Codex versions supported after this change implement the verified structured `serviceTiers` contract.
- Provider ID `priority` remains the current structured capability identifier for Fast.

## Risks / Open Questions

- A Codex version exposing only the deprecated field will no longer show Fast. This is intentional clean-cut modernization, not a fallback requirement.
- No open product decision remains.

## Requirement-To-Use-Case Coverage

- `UC-001`: `REQ-005`, `REQ-006`; `AC-006`, `AC-007`, `AC-010`.
- `UC-002`: `REQ-005`, `REQ-006`; `AC-008`, `AC-009`.
- `UC-003`: `REQ-001`–`REQ-004`, `REQ-007`; `AC-001`–`AC-005`, `AC-010`, `AC-011`.

## Acceptance-Criteria-To-Scenario Intent

- `AC-006`–`AC-010`: model-normalizer unit scenarios and live catalog parity investigation.
- `AC-011`: source/rendered-surface no-change verification.

## Approval Status

Approved by the user on 2026-09-01: keep Fast only in the existing configuration form, make no effective-tier header/UI change, and fix deprecated capability discovery.
