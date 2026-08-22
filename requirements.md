# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

**Design-ready — scope approved by the user.**

## Goal / Problem Statement

Bring the named provider integrations in `autobyteus-ts` to the current model generation, remove the named legacy model entries rather than retaining compatibility aliases, correct DeepSeek V4 pricing effective 17 August 2026 with its time-of-day rates, and make provider/configuration failures truthful across the Docker-node/team stream path.

The user-visible Docker error is not accepted as a provider message until the runtime path proves it. The current repository evidence already identifies a local event-contract defect that can turn a provider failure into `Rejected ERROR: code is required`; the target behavior must correct that translation while preserving genuine required-field validation errors.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| B-001 | The curated catalog exposes `grok-4.5` through `GrokLLM`; no `grok-4.6` entry is present. | Expose `grok-4.6` as the only curated Grok flagship entry in this change, with its verified metadata, pricing tiers, and supported reasoning options. Remove `grok-4.5` from the catalog and test fixtures. | Other providers and unrelated runtimes remain unchanged. | REQ-001, REQ-002; AC-001, AC-002 |
| B-002 | DeepSeek V4 Flash and Pro use stale flat prices (`0.14/0.28` and `0.435/0.87` USD per million input/output, respectively) and do not represent the provider's 17 August peak/off-peak schedule. | Use the provider-published latest schedule for both current V4 variants: peak windows 01:00–04:00 and 06:00–10:00 UTC; off-peak otherwise; cache-hit, cache-miss, and output rates are selected from the request time-of-day. The resolver never selects an older price based on the event date. | DeepSeek model identifiers, token accounting dimensions, and unaffected provider pricing remain intact. | REQ-003, REQ-004; AC-003, AC-004 |
| B-003 | The checked catalog contains `gemini-3-flash-preview` and `gemini-3.5-flash`; it contains no `gemini-3.6-flash`, despite the user’s screenshot/request wording. | Support `gemini-3.7-flash` as the current Gemini Flash entry and remove all pre-3.7 Gemini Flash entries, including any `gemini-3.6-flash` variant if present in another runtime/package. Keep unrelated Gemini Pro entries unless the user explicitly expands the removal boundary. | Gemini non-Flash model families and media capabilities remain unchanged. | REQ-001, REQ-002; AC-001, AC-002, AC-005 |
| B-004 | The curated Kimi catalog exposes `kimi-k2.6`, `kimi-k2.7-code`, and `kimi-k2.7-code-highspeed`; Kimi request normalization is K2-specific. | Support the current Kimi flagship `kimi-k3` only in this catalog family, remove the K2 entries and their K2-only policy, and send K3-compatible reasoning/request parameters. | Provider key resolution, OpenAI-compatible transport, and unrelated providers remain intact. | REQ-001, REQ-002; AC-001, AC-006 |
| B-005 | The curated GLM catalog exposes `glm-5.2`; its schema allows disabling thinking and its adapter has a BigModel coding endpoint policy. | Support the current `glm-5.3` entry only for the curated GLM flagship family, remove `glm-5.2`, and enforce the provider-documented always-enabled thinking contract (`low`, `high`, `max`). Verify the exact endpoint and price before assigning trusted pricing; do not copy GLM-5.2 pricing by assumption. | The existing GLM provider integration remains OpenAI-compatible and secret-safe. | REQ-001, REQ-002, REQ-005; AC-001, AC-007 |
| B-006 | A missing provider key is read through the secret vault and surfaces as `SECRET_NOT_FOUND`/a generic secret-related error before or during LLM setup. | Missing/blank required provider credentials produce a stable `missing_api_key` category and an actionable message naming the provider configuration, without exposing secret values. | Invalid credentials, locked/corrupt vaults, and provider authentication responses remain distinguishable. | REQ-006, REQ-009; AC-008, AC-009 |
| B-007 | LLM adapters wrap provider failures into generic `Error in API request`/`Error in API streaming` text; the agent phase then truncates and emits that text without preserving a stable provider message. | Preserve the original provider error message on the user-visible path. Do not semantically classify or replace it with a generic balance/quota/authentication message. Only redact secrets and attach safe transport metadata such as provider status/code/request ID. | Retry/abort semantics and successful completions remain unchanged. | REQ-007, REQ-009; AC-010, AC-011, AC-012 |
| B-008 | Agent error notifications emit `source`, while downstream team error admission requires non-empty `code`; the adapter therefore rejects a valid error event with `Rejected ERROR: code is required`. | Repair the transport contract with a non-empty protocol `code` separate from the display `message`. Carry the original provider message unchanged; if the provider supplies no code, use an internal transport fallback only to satisfy the protocol. | A genuine tool/schema error whose actual cause is a missing `code` field remains a validation error. | REQ-008, REQ-009; AC-013, AC-014 |
| B-009 | The web error segment renders the received message under a generic “An Error Occurred” heading, and the malformed team/application message can hide the original cause. | Render the original provider error message, after secret redaction only, in the existing native web error segment and supported application-agent ERROR event. The focused application-agent SDK remains message-only; it does not become a second provider-error metadata protocol. Do not replace a meaningful provider message with a locally invented category/action message. | Existing successful tool cards, error-segment layout, focused application stream variants, and genuine validation meaning remain intact. | REQ-007, REQ-009, REQ-010; AC-011, AC-014, AC-015 |
| B-010 | The catalog already exposes `minimax-m3` / `MiniMax-M3`, and tests already keep M2.7 absent, but its static metadata reports only 204,800 context tokens and its pricing tiers do not reflect the current 1M-context M3 API shape. | Keep MiniMax M3 as the only curated MiniMax text flagship, remove any older MiniMax text rows if discovered, update metadata to the official 1M context, and verify the current M3 endpoint/pricing tiers. | MiniMax audio, video, image, and music model families are outside this text-LLM change. | REQ-001, REQ-002, REQ-011; AC-001, AC-002, AC-016, AC-017 |

## Investigation Findings

- The curated catalog is in `autobyteus-ts/src/llm/supported-model-definitions.ts` and currently contains the legacy/current IDs listed in B-001–B-010.
- Official provider research identifies `grok-4.6`, `gemini-3.7-flash`, `kimi-k3`, `glm-5.3`, and MiniMax `MiniMax-M3` as the current targets. The repository already contains MiniMax M3, but its context metadata is stale. The exact GLM API endpoint/price for the target deployment must be verified during implementation because the repository currently uses a BigModel coding endpoint while the current Z.ai API documentation distinguishes general and coding endpoints.
- The DeepSeek pricing page reports V4 Flash/Pro peak and off-peak rates effective from the Beijing-time 17 August 2026 change. The authoritative accounting path currently supports model and input-size selection but not schedule selection by `observed_at`.
- The Docker screenshot’s exact text is generated locally: `AgentErrorNotification` emits `source`, but `TeamAgentEventAdapter` requires `p.code`, producing `Rejected ERROR: code is required`. The screenshot does not prove that the original provider rejection was insufficient balance; preserve whatever original provider message is available instead of classifying or inventing a balance message.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `provider-error-and-pricing-contract.md` | Evidence-backed provider catalog, pricing schedule, latest-model request policy, provider-message passthrough, and event contract. | REQ-001–REQ-012 | AC-001–AC-018 | Design supplement; aligned to the approved requirements basis. | Keeps volatile provider facts and cross-boundary transport rules reviewable without moving authority out of this requirements doc. |
| `tickets/done/application-agent-streaming/application-agent-communication-contract.md` | Normative application-agent stream and message-only public ERROR boundary: original safe message with no generic replacement. | REQ-007–REQ-010 | AC-011, AC-014–AC-015 | Design supplement; narrowed during SR-013 scope audit. | Keeps the focused application stream explicit without creating a second provider-error metadata protocol or exposing raw provider data. |

## Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` combining feature/model-catalog updates, pricing behavior, bug fixes, and contract repair.
- Initial design issue signal: `Yes`.
- Root cause classification: `Boundary Or Ownership Issue`, `Missing Invariant`, `Shared Structure Looseness`, and `Legacy Or Compatibility Pressure`.
- Refactor posture: `Likely Needed`.
- Evidence basis: provider-specific request policy is distributed across catalog defaults and adapters; pricing has no time schedule dimension; the error event producer and team contract disagree on the required field name; request wrappers replace original provider messages.
- Requirement or scope impact: a catalog-only patch would leave request invalidity, stale pricing selection, missing-key messaging, and the Docker/team error translation unresolved.

## Recommendations

Use clean-cut replacement for the named legacy catalog entries and their provider-specific schemas/adapters. The schema and adapter are part of the normal model-selection production path; update them together to describe and send the current model contract. No separate request-validation feature is added. Preserve provider error messages through one shared error transport contract and one canonical event `code` field rather than adding provider/message checks to the web UI. Only the missing-key case receives a purpose-built configuration message; other provider messages are not semantically rewritten. Represent the latest DeepSeek UTC schedule and select its peak/off-peak branch by request time-of-day. Keep the applied latest schedule in the existing pricing snapshot for auditability, but do not retain or execute historical price tables.

Do not infer or invent an insufficient-balance message. If the provider returns a meaningful balance/quota message, show that original message; otherwise show the original provider/transport error available. Redact secrets only.

## Scope Classification (`Small`/`Medium`/`Large`)

`Large` — five provider catalog/request-policy updates, time-dependent pricing, missing-key handling, original-error passthrough, event-contract repair, web-visible behavior, and Docker/team coverage.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: list/select/execute the current Grok, Gemini Flash, Kimi, GLM, and MiniMax text catalog targets.
- UC-002: calculate DeepSeek V4 Flash/Pro cost using the 17 August 2026 effective UTC schedule.
- UC-003: execute a provider-backed request with no required API key and receive an explicit missing-key action.
- UC-004: execute through a local or Docker node when the provider rejects a request and see the original provider error message preserved through transport.
- UC-005: transport an agent/provider error through the single-agent and team-agent streams without protocol admission failure or message rewriting.
- UC-006: preserve genuine tool/schema validation errors and secret redaction.

### Out of Scope

- Automatic online model discovery or future self-updating catalog behavior.
- Removing every older model from every provider or removing unrelated Gemini Pro/non-Flash model families.
- Automatic account top-up, live balance inspection, retry-policy redesign, or provider billing-account changes.
- Historical pricing tables, date-based price selection, or recalculation of old usage using retired prices.
- Migration, silent remapping, or compatibility fallback for persisted profiles using removed model IDs; those profiles require explicit user reselection.
- General redesign of the chat error UI or Docker networking.
- Semantic provider-message classification or replacing provider messages with application-authored balance/quota/authentication text.

### Preserved Behavior Boundary

Preserve B-001–B-010 outcomes not explicitly changed, existing successful provider/tool execution, provider key secrecy, token-count semantics, error scope/effect semantics, and genuine schema validation. Runtime ownership is also preserved: the AutoByteus current-model catalog guard applies only to `RuntimeKind.AUTOBYTEUS`; Claude Agent SDK and Codex App Server selections continue through their existing runtime-owned factories and are not rejected by the AutoByteus catalog. The clean-cut removals are limited to the named legacy model entries, obsolete model-specific transformations/defaults, generic provider-error wrappers, and legacy model/price aliases. No compatibility aliases or fallback behavior for removed models/prices are retained.

### Review Authority

This requirements basis and the intended-behavior parts of its supplement require explicit user approval. Provider documentation/current API behavior governs model IDs and prices; repository evidence governs current-path and contract facts; architecture review governs structural readiness after approval. Any proposal to migrate old persisted launch profiles or broaden removal to unrelated model families is a requirement gap requiring renewed user approval.

## Functional Requirements

| Requirement ID | Requirement |
| --- | --- |
| REQ-001 | The curated catalog must expose the approved latest target IDs `grok-4.6`, `gemini-3.7-flash`, `kimi-k3`, `glm-5.3`, and MiniMax `MiniMax-M3` (`minimax-m3`); the named legacy IDs must be removed from the active catalog, metadata fallback index, and durable tests. DeepSeek V4 Flash and Pro remain current variants and are not removed by this ticket. |
| REQ-002 | Each replacement model must use its exact current provider model ID and endpoint and a provider-specific schema/default configuration describing the current documented parameters. Update the owning adapter to construct the current provider request shape and remove obsolete model-specific transformations, aliases, and defaults; do not silently translate old model semantics into the new model. |
| REQ-003 | DeepSeek V4 Flash and Pro must use the latest official rates introduced at `2026-08-16T16:00:00Z` (00:00 Beijing on 17 August 2026), with UTC peak windows `[01:00,04:00)` and `[06:00,10:00)`, off-peak otherwise, and separate cache-hit/cache-miss/output prices. The effective date is provenance only, not a historical-policy selector. |
| REQ-004 | The pricing resolver must always use the latest DeepSeek pricing configuration, use the usage event’s time-of-day only to choose the latest peak/off-peak branch, use existing token dimensions and input-size tier selection, and record the applied latest schedule in the pricing snapshot. It must not select retired prices for older events. |
| REQ-005 | GLM-5.3 pricing and endpoint metadata must be verified for the actual selected provider endpoint before being marked trusted; unknown/unverified pricing must remain explicitly unpriced rather than inherit GLM-5.2 values. |
| REQ-006 | A missing or blank required provider API key must fail before a provider request and surface the stable `missing_api_key` category with an actionable provider-specific message. Secret-vault health failures must retain their own category. |
| REQ-007 | Provider failures must preserve the original provider message after redaction through the runtime and every supported user-visible path, including native web and application-agent streams. Safe provider status/code/request ID metadata remains supplemental native transport/diagnostic data; the focused application-agent SDK is intentionally message-only. The application must not semantically reclassify or replace provider messages. Only absent/blank API-key configuration is translated into the explicit `missing_api_key` setup message required by REQ-006. |
| REQ-008 | Native agent error events must use a canonical non-empty protocol `code` field from `autobyteus-ts` through stream parsing, AgentRun mapping, team adaptation, websocket projection, and the native client contract, while keeping `message` as the original safe error text. The focused application-agent projection carries the safe `message` in its existing message-only ERROR variant and is not a second provider-error metadata protocol. A malformed native event must not rewrite a valid provider error into `code is required`. |
| REQ-009 | User-visible provider errors must show the original provider message after redacting credentials or other sensitive material. Native transport and diagnostics may carry safe status/code/request identifiers and redacted details; the application-agent public stream carries only the safe message. Keys, authorization headers, raw exceptions, stacks, and full sensitive payloads must not cross any public boundary. |
| REQ-010 | Durable unit/API/E2E coverage must verify catalog removal/addition, latest-model request fields/endpoints, latest DeepSeek schedule selection, missing-key mapping, provider-message passthrough, canonical error-code transport, Docker-equivalent stream behavior, redaction, and preserved genuine validation errors. |
| REQ-011 | MiniMax M3 metadata and pricing must match the current official API contract: 1M maximum context, the verified ≤512K and >512K pricing tiers, cache-read prices, effective date, and the endpoint/model identifier used by the selected MiniMax API deployment. |
| REQ-012 | Removed legacy model IDs and legacy prices must not be accepted or silently remapped, and obsolete model-specific request-policy branches must be removed. A saved configuration using a removed model must fail with an explicit “select a current supported model” message and require user reselection. |

## Acceptance Criteria

| Acceptance Criteria ID | Scenario intent | Expected outcome |
| --- | --- | --- |
| AC-001 | Catalog list for named providers | The catalog contains `grok-4.6`, `gemini-3.7-flash`, `kimi-k3`, `glm-5.3`, and `minimax-m3`; it does not contain `grok-4.5`, pre-3.7 Gemini Flash entries, Kimi K2 entries, `glm-5.2`, or older MiniMax text entries. |
| AC-002 | Latest model metadata/request routing | Each target has the intended adapter, verified context/output metadata, and current schema/default options. Removed model IDs fail model resolution rather than silently falling back. |
| AC-003 | DeepSeek latest off-peak pricing | A usage event outside both UTC peak windows selects the latest off-peak schedule and exact V4 Flash/Pro cache-hit, cache-miss, and output rates. |
| AC-004 | DeepSeek peak pricing/latest-only behavior | Events at both peak windows select the latest peak rates; events outside them select the latest off-peak rates; an event with an older calendar date still uses the latest configured rates rather than a retired policy; the applied latest schedule is visible in `pricing_snapshot_json`. |
| AC-005 | Gemini 3.7 request | `gemini-3.7-flash` defaults to a supported thinking level (medium) and sends the current thinking shape; the catalog no longer generates the obsolete `minimal` setting. |
| AC-006 | Kimi K3 request | `kimi-k3` sends the current K3 reasoning/always-thinking shape and its adapter contains no K2-only policy branch. |
| AC-007 | GLM 5.3 request | `glm-5.3` schema/defaults produce `thinking.type=enabled` and an allowed reasoning effort; the adapter does not generate a disabled-thinking shape from the current schema. |
| AC-008 | Missing provider key | With no key record or a blank key, no provider request is attempted and the caller receives `missing_api_key` plus a provider-specific setup action, not `SECRET_NOT_FOUND` or secret internals. |
| AC-009 | Other vault failures | Locked, unavailable, corrupt, and access-denied secret states retain distinct safe categories/messages and do not expose secret material. |
| AC-010 | Provider balance/quota response | A fixture containing a meaningful provider balance/quota message reaches the user with that original message intact after safe redaction; no application-authored replacement is used. |
| AC-011 | Provider authentication/rate/request response | Representative provider messages reach the user unchanged after safe redaction; safe status/provider code/request ID may remain available as supplemental native transport/diagnostic metadata, but the application-agent SDK exposes only the message. |
| AC-012 | Provider/transport failure | An unrecognized provider or transport failure preserves the original available error text; no misleading semantic category is substituted. |
| AC-013 | Single-agent error event | An LLM/provider error emits a non-empty protocol `code`, preserves its original `message`, and survives stream parsing and AgentRun mapping without `code is required`. |
| AC-014 | Team/Docker/application-agent error event | The original provider error message reaches the team websocket/client contract and supported application-agent SDK ERROR event, including the Docker-node path, and renders in the relevant UI; `Rejected ERROR: code is required` is absent for valid native/team provider failures. The application-agent event remains message-only. |
| AC-015 | Genuine schema and redaction regressions | A real missing required tool `code` remains a validation error, while API keys/authorization headers are absent from user text and diagnostics. |
| AC-016 | MiniMax catalog | The MiniMax catalog contains `minimax-m3` / `MiniMax-M3`, reports the official 1,000,000-token context, and contains no older MiniMax text model row such as M2.7 or M2.5. |
| AC-017 | MiniMax pricing/request path | MiniMax M3 uses the verified current API endpoint/model identifier and exact official pricing tiers for ≤512K and >512K input; request capture confirms no stale model or endpoint is sent. |
| AC-018 | Removed model configuration | A saved configuration using a removed model or legacy price cannot execute or silently fall back; it receives an explicit current-model reselection message. |

## Constraints / Dependencies

- Provider IDs, request rules, and prices are time-sensitive; implementation must re-verify official documentation at the implementation date and record any changed fact as a requirement gap.
- `autobyteus-ts`, server/backend, team stream contracts, application SDK contracts, and web rendering are separate package boundaries and must be changed as one error behavior. The focused application-agent stream remains closed, provider-neutral, and message-only; its normative contract must be updated from the stale generic fallback to original safe message passthrough, but it does not gain provider metadata fields in this ticket.
- Docker port 8001 may run a different build; integrated validation must identify the tested build/version.
- Existing pricing snapshots are persisted as JSON and usage records carry the observed timestamp; the applied latest schedule may be recorded for auditability, but no historical price selection or repricing feature is required.
- Removed model IDs may remain in saved user configuration as data, but the active runtime must reject them and require current-model reselection; no compatibility migration is performed.
- No API key, authorization header, or full raw provider payload may be committed or emitted.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: usage events and summaries in `autobyteus-server-ts` include `pricing_snapshot_json`, `observed_at`, selected tier, and model identifiers; launch profiles/application manifests store `llmModelIdentifier` strings.
- Required outcome: `Directly Usable — No Migration` for existing usage/pricing snapshots and saved configuration records; removed-model configurations are rejected at runtime and require user reselection.
- Existing data to preserve, discard/rebuild, transform, or quarantine: preserve existing usage/error records as recorded evidence; do not rewrite or reprice old pricing snapshots. Preserve saved configuration records, but reject removed model IDs with an actionable reselection message.
- Unacceptable data loss or corruption: losing existing recorded cost data, changing recorded model identifiers, or silently routing a user’s saved profile to a different model.
- Relevant availability, maintenance-window, or rollout constraints: catalog replacement can deploy without data migration because stale profiles are rejected until the user selects a current model.
- Related requirement and acceptance-criteria IDs: REQ-001, REQ-004, REQ-010, REQ-011, REQ-012; AC-001, AC-003, AC-004, AC-014, AC-016, AC-017, AC-018.

## Assumptions

- “Latest” is interpreted as the latest official target in each named provider/model family at the investigation date, not automatic discovery of every future model.
- `gemini-3.6-flash` is a user/environment naming discrepancy; the checked source has `gemini-3.5-flash`, so all pre-3.7 Gemini Flash entries are treated as legacy.
- `kimi-k3`, `glm-5.3`, and MiniMax `MiniMax-M3` are intended for the existing text/code LLM integration, not multimedia model factories.
- The balance hypothesis may explain the original provider rejection; the original provider message should be preserved rather than classified or rewritten.

## Risks / Open Questions

1. **Approval boundary:** confirm that “latest-only” means the clean-cut provider-family set above, while retaining unrelated Gemini Pro and current DeepSeek V4 variants.
2. **Persisted launch profiles:** resolved as reject/reselect; old IDs are not migrated or silently remapped.
3. **GLM endpoint/pricing:** confirm whether this deployment should use BigModel coding endpoint, Z.ai general endpoint, or another provider credential/price contract; implementation must not mark unverified values trusted.
4. **MiniMax deployment:** confirm whether the selected deployment uses the global OpenAI-compatible endpoint or the `chatcompletion_v2` endpoint, while keeping the official model value `MiniMax-M3`.
5. **Provider error evidence:** collect representative safe fixtures/status codes for provider responses and verify message preservation/redaction; no live account balance is required.

## Requirement-To-Use-Case Coverage

| Use Case | Covered Requirements |
| --- | --- |
| UC-001 | REQ-001, REQ-002, REQ-005, REQ-010, REQ-011 |
| UC-002 | REQ-003, REQ-004, REQ-010 |
| UC-003 | REQ-006, REQ-009, REQ-010 |
| UC-004 | REQ-007, REQ-008, REQ-009, REQ-010 |
| UC-005 | REQ-008, REQ-009, REQ-010, REQ-012 |
| UC-006 | REQ-006, REQ-008, REQ-009, REQ-010, REQ-012 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria ID | Scenario / coverage intent |
| --- | --- |
| AC-001–AC-002 | `autobyteus-ts` catalog and factory unit/integration coverage |
| AC-003–AC-004 | pricing policy unit tests at boundary timestamps and persisted snapshot assertions |
| AC-005–AC-007 | provider adapter request-capture tests plus provider-gated integration tests |
| AC-008–AC-009 | secret resolver and LLM setup unit/API tests |
| AC-010–AC-012 | original provider-message fixture tests, redaction, and transport mapping |
| AC-013–AC-014 | stream/team contract API/E2E coverage, including Docker-equivalent deployment validation |
| AC-015 | tool/schema regression and redaction tests |
| AC-016–AC-017 | MiniMax catalog metadata, pricing, endpoint, and request-capture coverage |
| AC-018 | removed-model configuration validation and reselection coverage |

## Approval Status

**Scope approved by the user for design production.** The approved scope is latest-only replacement of the named provider model entries, latest DeepSeek pricing, the original missing-API-key correction, and preservation of original provider errors through the Docker/team stream. No historical pricing or legacy model/price aliases are included. GLM/MiniMax endpoint and pricing values remain implementation-time verification items; they do not expand the approved scope.
