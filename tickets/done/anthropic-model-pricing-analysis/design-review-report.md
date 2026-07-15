# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-spec.md`
- Current Review Round: 2
- Trigger: Design-impact rework after user-reported live Anthropic streaming failure: `logicalConversationId: Extra inputs are not permitted`.
- Prior Review Round Reviewed: 1
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Updated requirements/investigation/design package plus rework note `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-impact-rework-logical-conversation-id.md`; current code evidence from `autobyteus-ts/src/agent/loop/llm-phase.ts`, `autobyteus-ts/src/llm/api/anthropic-llm.ts`, `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts`, and `autobyteus-ts/src/llm/api/mistral-llm.ts`; prior Round 1 report at this same path.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial design review for Anthropic target model support | N/A | No | Pass | No | Approved non-paid scoped model/catalog/request-shape design. |
| 2 | Live Anthropic `logicalConversationId` design-impact rework | Prior round had no unresolved findings | No blocking findings | Pass | Yes | Revised design correctly adds provider-boundary kwarg filtering and minimal live Anthropic validation. |

## Reviewed Design Spec

Reviewed updated design spec at `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-spec.md` and the design-impact note at `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-impact-rework-logical-conversation-id.md`.

The revised scope remains: keep/fix `claude-opus-4.8`, add `claude-sonnet-5`, add `claude-fable-5`, do not add `claude-sonnet-4.8`, do not run Fable/model-matrix live tests, and add only the minimal user-approved non-Fable Anthropic live validation for the reported `logicalConversationId` provider-boundary failure.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Updated design keeps feature + bug-fix posture and adds the runtime provider-boundary bug. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies the new failure as a missing provider-boundary invariant plus duplicated kwarg filtering policy; evidence identifies `LlmPhase` as the legitimate internal kwarg owner and `AnthropicLLM` raw kwarg forwarding as the external provider leak. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design requires a small request-building refactor: extract/reuse a shared provider-request kwarg sanitizer, de-duplicate the OpenAI-compatible deny-list, and apply the sanitizer to Anthropic. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Data-flow spines, ownership map, removal plan, file mapping, and migration sequence all reflect the sanitizer boundary and preserve `logicalConversationId` for `AutobyteusLLM`. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved prior findings | Round 1 recorded `Findings: None`. | Round 2 reviews new design-impact material only. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Static catalog to model browser/runtime selection | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Runtime Anthropic invocation to provider request payload | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Usage/cost return flow | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Invocation kwargs to provider-safe SDK request kwargs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts` LLM catalog | Pass | Pass | Pass | Pass | Static catalog remains the right owner for exact model IDs/pricing. |
| `autobyteus-ts` provider request utilities | Pass | Pass | Pass | Pass | Shared sanitizer is the right owner for internal AutoByteus kwarg filtering across external provider request builders. |
| `autobyteus-ts` Anthropic API adapter | Pass | Pass | Pass | Pass | Anthropic remains owner of provider-specific thinking/sampling/tools semantics; sanitizer must not own model policy. |
| `autobyteus-ts` metadata | Pass | Pass | Pass | Pass | Curated metadata remains separate from catalog identity/pricing. |
| Tests/docs | Pass | Pass | Pass | Pass | Deterministic coverage plus one minimal credential-gated Anthropic validation matches approved scope. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Anthropic model capability classification | Pass | Pass | Pass | Pass | Correctly stays local to `anthropic-llm.ts`. |
| Internal invocation kwarg filtering | Pass | Pass | Pass | Pass | Extracting from OpenAI-compatible private list to `provider-request-kwargs.ts` avoids drift and directly addresses the live bug. |
| Anthropic pricing row creation | Pass | Pass | Pass | Pass | Existing `TokenPricingConfig`/`pricing()` helper remains sufficient. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `TokenPricingConfig` cache fields | Pass | Pass | Pass | N/A | Pass | Cache read/write dimensions stay explicit. |
| Anthropic request policy helper | Pass | Pass | Pass | Pass | Pass | Exact provider model values/prefixes are the right identity shape. |
| Provider-safe kwargs helper | Pass | Pass | Pass | Pass | Pass | Helper owns only provider-boundary filtering and controlled-key skipping; provider adapters keep provider-specific request semantics. |
| Anthropic config schema | Pass | Pass | Pass | Pass | Pass | Design keeps fixed-budget thinking out of current adaptive models. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `isClaudeOpus47` as governing Anthropic capability predicate | Pass | Pass | Pass | Pass | Replaced by current Anthropic model capability policy. |
| Anthropic raw `kwargs` spread into SDK params | Pass | Pass | Pass | Pass | Replaced by shared safe provider-request kwargs helper plus Anthropic-controlled fields. |
| OpenAI-compatible private deny-list as sole owner | Pass | Pass | Pass | Pass | De-duplicated into shared helper and imported back into OpenAI-compatible builder. |
| Candidate `claude-sonnet-4.8` alias | Pass | Pass | Pass | Pass | Exact `claude-sonnet-5` only. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/supported-model-definitions.ts` | Pass | Pass | N/A | Pass | Correct catalog/pricing/schema owner. |
| `autobyteus-ts/src/llm/metadata/curated-model-metadata.ts` | Pass | Pass | N/A | Pass | Correct context/output metadata owner. |
| `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` | Pass | Pass | Pass | Pass | Correct shared boundary helper file; must not absorb provider-specific model policy. |
| `autobyteus-ts/src/llm/api/openai-compatible-request-builder.ts` | Pass | Pass | Pass | Pass | Should import sanitizer and preserve current tools/tool_choice behavior. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Pass | Pass | Pass | Pass | Correct Anthropic request policy owner; must use sanitizer for sync and streaming. |
| `autobyteus-ts/src/llm/api/mistral-llm.ts` | Pass | Pass | N/A | Pass | Current code also spreads raw kwargs. Architecture recommendation: apply the sanitizer in this change if no implementation blocker appears; no live Mistral test is required. |
| `autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Pass | Pass | N/A | Pass | Correct mocked payload coverage location. |
| `autobyteus-ts/tests/unit/llm/api/openai-compatible-request-builder.test.ts` | Pass | Pass | N/A | Pass | Correct regression location for de-duplicated sanitizer behavior. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Pass | Pass | N/A | Pass | Correct catalog/pricing tests. |
| `autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` | Pass | Pass | N/A | Pass | Correct location for minimal credential-gated non-Fable live validation. |
| `autobyteus-ts/docs/provider_model_catalogs.md` | Pass | Pass | N/A | Pass | Correct durable catalog/request-shape docs owner. |
| `autobyteus-ts/docs/llm_module_design_nodejs.md` | Pass | Pass | N/A | Pass | Correct overview docs owner if stale. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `LlmPhase` runtime invocation | Pass | Pass | Pass | Pass | Keeps internal `logicalConversationId`; does not own external SDK payload cleanup. |
| Provider request kwarg sanitizer | Pass | Pass | Pass | Pass | External adapters can import it; upstream callers must not manually strip provider internals. |
| `AnthropicLLM` request construction | Pass | Pass | Pass | Pass | Adapter remains authoritative for Anthropic request shape. |
| `LLMFactory` registry/catalog exposure | Pass | Pass | Pass | Pass | UI/server read registry data; no hardcoded model names. |
| Pricing lookup | Pass | Pass | Pass | Pass | Cost path consumes catalog pricing dimensions. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `LLMFactory` | Pass | Pass | Pass | Pass | Model registry remains authoritative. |
| `LlmPhase` | Pass | Pass | Pass | Pass | Internal runtime identity is preserved for hosted AutoByteus LLM. |
| Provider request kwarg sanitizer | Pass | Pass | Pass | Pass | Centralizes cross-provider internal kwarg filtering without taking over adapter-specific fields. |
| `AnthropicLLM` | Pass | Pass | Pass | Pass | Runtime callers do not need Anthropic-specific workarounds. |
| Pricing lookup | Pass | Pass | Pass | Pass | Pricing fields remain data-driven. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `supportedModelDefinitions` row | Pass | Pass | Pass | Low | Pass |
| `AnthropicLLM` request methods/helper | Pass | Pass | Pass | Medium | Pass |
| `applySafeProviderRequestKwargs` / equivalent | Pass | Pass | Pass | Low | Pass |
| `OpenAICompatibleRequestBuilder.build` | Pass | Pass | Pass | Low | Pass |
| `LLMFactory.getModelPricingInfo` | Pass | Pass | Pass | Low | Pass |
| GraphQL `availableLlmProvidersWithModels` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm/api/provider-request-kwargs.ts` | Pass | Pass | Low | Pass | Good small shared utility placement beside provider request builders/adapters. |
| `autobyteus-ts/src/llm/api/anthropic-llm.ts` | Pass | Pass | Low | Pass | Existing adapter owner. |
| `autobyteus-ts/src/llm/api/mistral-llm.ts` | Pass | Pass | Low | Pass | Same raw-kwarg pattern can use the shared utility without new structure. |
| `autobyteus-ts/tests/unit/llm` and credential-gated integration tests | Pass | Pass | Low | Pass | Test placement follows existing repo pattern. |
| `autobyteus-ts/docs` | Pass | Pass | Low | Pass | Durable provider docs belong here. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Built-in model rows | Pass | Pass | N/A | Pass | Extend static catalog. |
| Cache-aware pricing | Pass | Pass | N/A | Pass | `TokenPricingConfig` already has required fields. |
| Anthropic request-shape policy | Pass | Pass | Pass | Pass | Local policy in `AnthropicLLM` remains correct. |
| Internal kwarg filtering | Pass | Pass | Pass | Pass | Existing OpenAI-compatible rule is extracted/reused. |
| Live validation | Pass | Pass | N/A | Pass | Minimal non-Fable Anthropic validation is acceptable because user approved it for the reported runtime bug. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Unsupported Sonnet 4.8 alias | No | Pass | Pass | Exact `claude-sonnet-5` only. |
| Opus-4.7-only request predicate | Yes, current stale predicate | Pass | Pass | Replaced as governing policy. |
| Anthropic raw internal kwarg forwarding | Yes, current bug | Pass | Pass | Replaced by sanitizer at external provider boundary. |
| OpenAI-compatible duplicate private deny-list | Yes, duplicated policy | Pass | Pass | Extracted to shared helper. |
| Removing `logicalConversationId` from `LlmPhase` | No | Pass | Pass | Correctly rejected; hosted AutoByteus behavior stays intact. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Shared provider-request kwarg sanitizer | Pass | Pass | Pass | Pass |
| Anthropic adapter policy and sanitizer adoption | Pass | Pass | Pass | Pass |
| OpenAI-compatible builder de-duplication | Pass | Pass | Pass | Pass |
| Mistral raw-kwargs hardening | Pass | Pass | Pass | Pass |
| Catalog/pricing/metadata/docs/tests | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Unsupported Sonnet alias | Yes | Pass | Pass | Pass | Good and bad shapes are explicit. |
| Anthropic cache pricing | Yes | Pass | Pass | Pass | Numeric target rows are concrete. |
| Request-shape policy | Yes | Pass | Pass | Pass | Avoids Opus-4.7-only checks. |
| Internal kwarg filtering | Yes | Pass | Pass | Pass | Clearly contrasts safe helper with raw `Object.assign`/spread. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Sonnet 5 launch vs standard pricing | Launch pricing expires after 2026-08-31; static launch price would become stale. | Use durable standard pricing unless launch pricing is deliberately encoded with expiry documentation/tests. | Residual risk, not a blocker. |
| Fable 5 refusal/data-retention UX | Fable has special refusal/data-retention behavior and high cost. | Document caveat; no fallback/default routing in this scope. | Explicitly deferred, not a blocker. |
| Mistral raw kwargs | Current code has the same raw spread pattern as Anthropic, creating latent `logicalConversationId` leak risk. | Architecture answer: apply the shared sanitizer to `MistralLLM` in this change if implementation remains straightforward; if a blocker appears, document a named follow-up and residual risk in the implementation handoff. No live Mistral validation is required. | Clarified by this review. |
| Credential-gated live Anthropic validation | Live access can fail/skip for credentials/account/model access, unrelated to code. | Use existing provider-access skip helper and a non-Fable model; rely on mocked payload tests as durable coverage. | Accepted. |

## Review Decision

`Pass`: the revised design is ready for implementation rework.

Architecture decisions for the review questions:

1. Shared provider-request kwarg sanitizer is the right owner for the duplicated internal-kwarg filtering policy.
2. `MistralLLM` should also use the shared sanitizer in this change if no implementation blocker appears, because it has the same raw-kwargs spread and the same runtime kwarg source. This does not require live Mistral testing.
3. The testing plan is acceptable: deterministic mocked model/payload/pricing/metadata tests plus one minimal credential-gated non-Fable live Anthropic validation for `logicalConversationId`.

## Findings

None.

## Classification

N/A — no blocking design-impact, requirement-gap, or unclear findings were raised in this round.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Anthropic docs/prices remain time-sensitive; implementation should re-check official sources on the implementation date.
- The sanitizer must not become a generic provider-policy dumping ground. Provider-specific fields (`tools`, `tool_choice`, `stream`, `thinking`, model capability policy) remain adapter-owned.
- `logicalConversationId` must remain available to `AutobyteusLLM`; fix only the external provider request boundary.
- The minimal live Anthropic validation is allowed for this user-reported bug, but Fable/model-matrix live calls remain out of scope.
- If `MistralLLM` sanitizer adoption is deferred due to an implementation blocker, the implementation handoff must name that residual risk explicitly.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Proceed to implementation rework with the cumulative artifact package, including the design-impact note and this Round 2 design review report.
