# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-spec.md`
- Design-Impact Rework Note: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-impact-rework-logical-conversation-id.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/code-review-report.md`
- Current Investigation Round: 2
- Trigger: Latest code-review pass after revised Anthropic latest-model support plus `logicalConversationId` external-provider-boundary rework.
- Prior Investigation Reviewed: Yes; round 1 coverage investigation and execution report were reviewed as stale context because they predate the `logicalConversationId` provider-boundary sanitizer rework.
- Latest Authoritative Investigation: Round 2

## Current Requirement And Design Basis

The current approved scope combines the prior Anthropic latest-model support with the Round 2 provider-boundary bug fix:

- Keep/fix `claude-opus-4.8`, add static catalog rows for `claude-sonnet-5` and `claude-fable-5`, and continue rejecting `claude-sonnet-4.8` / `claude-sonnet-4-8` aliases.
- Preserve static built-in Anthropic catalog behavior: targeted Anthropic reload returns the current static count and does not dynamically discover Anthropic models.
- Expose trusted Anthropic pricing, including base input/output, cache read, 5-minute cache write, and 1-hour cache write dimensions for Fable 5, Opus 4.8, and Sonnet 5.
- Preserve provider-valid Anthropic request shape for current adaptive-thinking/no-sampling models in both streaming and non-streaming paths.
- Add and use a shared external-provider request kwarg sanitizer that strips AutoByteus-internal runtime kwargs (`logicalConversationId`, `logical_conversation_id`, `conversationId`, `agentId`, `turnId`, `requestId`, `renderedPayload`) before external SDK request construction.
- Keep `logicalConversationId` valid and required for `AutobyteusLLM`; do not remove it from `LlmPhase` or hosted AutoByteus provider routing.
- Apply the sanitizer to Anthropic and OpenAI-compatible request building, and to Mistral because it had the same raw-kwargs spread risk and the implementation remained small.
- Keep live validation constrained to the approved non-Fable `logicalConversationId` Anthropic path; do not run Fable or Anthropic model-matrix paid calls.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no compatibility mechanisms, no retained legacy behavior, dead/obsolete scope removed, no `claude-sonnet-4.8` source row, no stale `isClaudeOpus47` predicate, and `logicalConversationId` remains internal/hosted-provider behavior while external providers filter it.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Static Anthropic catalog exposes `claude-fable-5`, `claude-opus-4.8`, and `claude-sonnet-5` and omits `claude-sonnet-4.8` | Added/Changed/Preserved absence | REQ-001 through REQ-003; AC-001, AC-002; prior API/E2E round | Existing catalog, metadata, and server GraphQL model-list coverage remains valid and should be rerun. |
| Anthropic pricing exposes cache dimensions to token-pricing consumers | Added/Changed | REQ-004; AC-003, AC-009; prior API/E2E round | Existing `supported-model-definitions` and server `TokenPriceConfigProvider` coverage remains valid and should be rerun. |
| Anthropic targeted reload remains static-count/non-discovery | Preserved | REQ-008, AC-007; prior API/E2E round | Existing server targeted reload coverage remains valid and should be rerun. |
| Anthropic request payloads for current models omit invalid manual thinking/sampling fields | Changed | REQ-005, REQ-006; AC-004, AC-005 | Existing mocked Anthropic sync/stream request-payload coverage remains valid and should be rerun. |
| External provider adapters strip internal runtime kwargs before SDK calls | Added/Changed | REQ-011, REQ-012; AC-010; design DS-004; design-impact rework note | Durable coverage must include shared sanitizer tests plus adapter-level Anthropic/OpenAI-compatible/Mistral payload checks. Current reviewed tests are adequate; no new durable coverage needed. |
| `logicalConversationId` remains available to hosted `AutobyteusLLM` | Preserved | Design-impact rework note; design spec DS-004; implementation handoff | Existing `AutobyteusLLM` unit tests verify required/consumed logical conversation ID and should be run as API/E2E evidence. |
| Minimal live Anthropic non-Fable `logicalConversationId` path succeeds or credential-gated skips via provider-access helper | Added | AC-011; design review says one minimal live non-Fable validation is acceptable | Run the focused live test by name; do not run Fable/model-matrix live calls. |
| Mistral raw kwargs spread no longer leaks internal runtime kwargs | Changed | Design review missing-use-case clarification and implementation handoff | Existing deterministic native payload test covers Mistral; no live Mistral validation required. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/provider-request-kwargs.test.ts` | Shared sanitizer drops internal runtime kwargs, nullish values, and adapter-controlled keys while preserving safe provider kwargs | REQ-011, REQ-012; AC-010; DS-004 | Still Valid | Test covers full current internal deny-list and controlled-key handling. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/anthropic-llm.test.ts` | Mocked Anthropic sync/stream payloads cover current model request policy and internal kwarg filtering while preserving `tools`, `metadata`, and valid `thinking` | REQ-005, REQ-006, REQ-011, REQ-012; AC-004, AC-005, AC-010 | Still Valid | Tests include target current Anthropic models, internal runtime kwarg fixtures, sync and streaming assertions. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/openai-compatible-request-builder.test.ts` | Builder maps config, filters internal kwargs through shared sanitizer, and attaches `tools`/`tool_choice` only when valid | REQ-011, REQ-012; DS-004 | Still Valid | Test exercises de-duplicated OpenAI-compatible boundary behavior. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts` | OpenAI-compatible LLM request path uses builder and does not leak `logicalConversationId` while retaining tool fields | REQ-011, REQ-012; DS-004 | Still Valid | Test file includes logicalConversationId + tools/tool_choice runtime path. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/provider-native-request-payloads.test.ts` | Provider-native payload coverage, including Mistral internal-kwarg filtering and tool payload ordering | REQ-011, REQ-012; DS-004; design review Mistral clarification | Still Valid | Mistral scenario passes all internal runtime kwargs plus tools and asserts no leak. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/api/autobyteus-llm.test.ts` | Hosted AutoByteus provider requires and consumes `logicalConversationId` | REQ-011/REQ-012 boundary context; design says do not remove upstream logical ID | Still Valid | Existing tests verify send/stream require logicalConversationId and pass it to hosted client. | Run as added execution evidence; no test edit needed. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/integration/llm/api/anthropic-llm.test.ts` focused `logicalConversationId` scenario | Credential-gated live non-Fable Anthropic stream with `logicalConversationId` should succeed or skip through provider-access helper | AC-011; design-impact rework approved minimal live non-Fable validation | Still Valid | Test uses `claude-opus-4.7`, not Fable/model matrix, and catches the reproduced provider rejection path. | Run by name only in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Static catalog/pricing/cache dimensions and absence of Sonnet 4.8 | REQ-001 through REQ-004; AC-001 through AC-003, AC-009 | Still Valid | Test asserts target Anthropic model rows/provider values and pricing dimensions. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Registry metadata resolution for static Anthropic target rows and live metadata mock path | REQ-007; AC-002, AC-006 | Still Valid | Uses mocked fetch/provider discovery; no paid calls. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts/tests/e2e/token-usage/token-usage-model-list.e2e.test.ts` | Settings-facing GraphQL model list exposes target Anthropic rows and omits Sonnet 4.8 | REQ-001, REQ-002, REQ-003, REQ-008; AC-001, AC-002 | Still Valid | Round 1 API/E2E added deterministic GraphQL coverage; still required for revised scope. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts/tests/unit/llm-management/providers/autobyteus-llm-model-provider.test.ts` | Anthropic provider-scoped reload returns current static count without dynamic discovery | REQ-008; AC-007 | Still Valid | Round 1 API/E2E added exact Anthropic targeted reload coverage. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-server-ts/tests/unit/token-usage/pricing/token-price-config-provider.test.ts` | Server pricing policy consumer sees target Anthropic cache dimensions | REQ-004; AC-009 | Still Valid | Round 1 API/E2E added token-pricing consumer coverage. | Run in final validation. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-web/components/settings/providerApiKey/__tests__/ProviderModelBrowser.spec.ts`, `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-web/tests/stores/llmProviderConfigStore.test.ts`, `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/autobyteus-web/components/settings/__tests__/ProviderAPIKeyManager.spec.ts` | Generic model-browser/store settings UI path remains data-driven | REQ-008; AC-002/AC-007 UI context | Still Valid | Revised provider-boundary work does not alter web code; prior API/E2E ran focused web tests. | Run focused web checks if environment is prepared; no durable update needed. |
| Broad live Anthropic suite / Fable / model-matrix live validation | Provider live checks beyond the focused logicalConversationId scenario | User constraints and design review live-test limits | Out Of Scope | Fable is expensive; model-matrix live calls not approved. | Do not run. |
| Live Mistral validation | Live provider validation for Mistral sanitizer | Design review says no live Mistral validation required | Out Of Scope | Deterministic payload tests are the approved proof path. | Do not run. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| None in round 2 | N/A | No existing revised-scope durable coverage was found stale after review. Round 1 stale reload-failure assertion has already been corrected and reviewed. | Latest code review report; current coverage inventory. | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| None | N/A | Current reviewed durable coverage adequately covers revised-scope boundaries. | N/A | N/A |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| None | N/A | No updates planned. | N/A | If final execution exposes stale or missing coverage, update this investigation before editing tests. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| None | N/A | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| PROBE-002 | `git diff --check` and source guards for `claude-sonnet-4.8` / `claude-sonnet-4-8`, stale `isClaudeOpus47`, and source-level internal kwarg raw-spread risks where practical | No whitespace issues, no unsupported Sonnet alias/source row, no stale predicate, and no obvious raw `logicalConversationId` external-provider source leak after rework | Static guard evidence belongs in execution report; durable behavior is already covered by tests. |
| PROBE-003 | Build and focused web/server setup commands (`prisma generate` if needed, `nuxi prepare` if needed) | Validates executable environment and generated type/client prerequisites | Tooling setup is not durable repository coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Live Fable 5, Sonnet 5, or Opus 4.8 model-matrix validation | User/design constraint forbids additional paid model-matrix/Fable calls; Fable is expensive | Provider drift for new model IDs cannot be detected in this run | Only run later with explicit user approval and cost controls. |
| Live Mistral sanitizer validation | Design review accepted deterministic Mistral payload coverage; no live Mistral validation required | Live Mistral SDK behavior drift would not be detected | Add live Mistral smoke only in a separate approved provider-live task. |
| Broader external-provider audit beyond Anthropic, OpenAI-compatible, and Mistral | Design review explicitly scoped broader audit as residual risk | Other adapters might have latent leaks if they later raw-spread kwargs | Future provider-boundary hardening task should reuse the sanitizer. |
| Fable refusal/fallback/data-retention UX behavior | Out of current product scope; Fable catalog-available only | Users may need richer UX later | Separate product/design task if desired. |
| Time-aware Sonnet 5 promotional pricing | Design chose durable standard pricing instead of time-bound launch pricing | Static pricing may not represent temporary discounts before 2026-08-31 | Separate pricing-mode task if product wants time-aware promotional pricing. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None | N/A | Requirements, design, implementation handoff, and latest code review are consistent. No compatibility wrapper or retained legacy branch observed in revised scope. | N/A |

## Execution Plan

1. Do not edit repository-resident durable coverage unless final execution changes a validity decision.
2. Run deterministic revised-scope `autobyteus-ts` unit/integration coverage for the shared sanitizer, Anthropic/OpenAI-compatible/Mistral request payload boundaries, hosted `AutobyteusLLM` logical ID consumption, static catalog/pricing, and metadata.
3. Run the approved focused live non-Fable Anthropic `logicalConversationId` test by name. Accept pass or credential/access skip via existing provider-access helper; do not run Fable/model-matrix live tests.
4. Run retained server GraphQL/reload/pricing coverage from round 1.
5. Run focused web model-browser/store tests if Nuxt generated types are available or after `nuxi prepare`.
6. Run `pnpm -C autobyteus-ts run build`, `git diff --check`, and source guards.
7. Update the canonical execution coverage report at `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-model-pricing-analysis/tickets/done/anthropic-model-pricing-analysis/api-e2e-execution-coverage-report.md` with round 2 history and results.
8. If no repository-resident durable coverage is added/updated/removed during this API/E2E round, route the cumulative package to `delivery_engineer`. If coverage code changes become necessary, return to `code_reviewer` instead.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Prior API/E2E artifacts are stale context only. Round 2 investigation finds existing reviewed durable coverage adequate for the revised provider-boundary scope; live validation remains limited to the approved non-Fable `logicalConversationId` scenario.
