# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/kimi-highspeed-model-bug/tickets/done/kimi-highspeed-model-bug/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review handoff for Kimi HighSpeed/global LLM config-composition ticket.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior to prove is the runtime-created LLM configuration rule:

`base framework defaults -> model registry defaultConfig -> explicit user/run llmConfig overrides only -> provider/model invariant enforcement -> request builder/provider SDK`.

Concrete Kimi requirements and acceptance criteria require:

- `kimi-k2.7-code-highspeed` must remain a distinct official Kimi model identifier and must not be removed or aliased to `kimi-k2.7-code`.
- Both Kimi K2.7 Code identifiers must share one Kimi-owned model-family policy for fixed sampling/tool constraints.
- Factory-created `kimi-k2.7-code-highspeed` requests must send provider-valid fixed values: `temperature: 1.0`, `top_p: 0.95`, `n: 1`, `presence_penalty: 0.0`, `frequency_penalty: 0.0`, and valid tool-choice behavior when the relevant fields are present.
- Explicit invalid raw/user K2.7 values must be normalized before the provider request rather than reaching Kimi and producing a 400.
- Raw run/default-launch `llmConfig` must be interpreted as partial user intent. Missing standard fields must not become implicit overrides, standard fields must be first-class `LLMConfig` fields, and unknown provider-specific keys must flow through `extraParams` without standard-key collisions.
- Existing Kimi K2.6 behavior must remain unchanged.
- Live provider validation should be attempted if credentials are available and classified if blocked. `KIMI_API_KEY` is present in the current execution environment; no secret value was printed.

The implementation handoff's `Legacy / Compatibility Removal Check` is clean: no backward-compatibility mechanism was introduced, the old backend `new LLMConfig({ extraParams: llmConfig })` wrapper was removed, no hidden Kimi alias/collapse was added, and shared structures remain tight. Static inspection of the current code matches that section: `AutoByteusAgentRunBackendFactory` now passes raw `llmConfig` to `LLMFactory.createLLM(...)`, Kimi K2.7 identifiers/constants are centralized in `kimi-k2-7-code-policy.ts`, and `KimiLLM` uses the family predicate rather than an exact-only `kimi-k2.7-code` check.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Kimi K2.7 Code family policy includes `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` | Added | REQ-001, REQ-002, REQ-003; design Kimi policy owner; implementation handoff added `kimi-k2-7-code-policy.ts` | Retain/run durable Kimi policy/catalog/request-shape coverage; add temporary factory/backend request-capture probe across boundaries. |
| HighSpeed outgoing request normalization to fixed provider sampling | Changed | AC-001, AC-002, AC-003; code review residual coverage focus | Retain/run durable mocked request-capture tests; temporary backend/factory probe must capture final OpenAI-compatible request params. |
| Raw run `llmConfig` no longer wrapped wholesale as `extraParams` | Removed old behavior / Changed boundary | REQ-004, REQ-005, REQ-006, REQ-007; design removal plan; implementation handoff | Retain/run backend unit and config-composition tests; temporary probe must include raw standard + unknown keys and verify no standard-key extraParam collision reappears. |
| Explicit configurable standard fields are first-class config overrides for non-fixed models | Changed | AC-005; design global config rule | Retain/run factory and override durable coverage. |
| Unknown provider-specific keys pass through extras | Preserved | REQ-006, AC-006 | Retain/run override/factory durable coverage and verify probe preserves unknown extras without standard-key collisions. |
| Kimi K2.6 request behavior | Preserved | REQ-009, AC-007; implementation handoff K2.6 tests | Retain/run existing Kimi unit coverage. |
| Catalog exposes both official K2.7 IDs | Preserved | REQ-010, AC-008; investigation docs/provider evidence | Retain/run supported-model-definitions coverage. |
| Live Kimi HighSpeed provider acceptance | Added validation expectation | AC-009; code review residual risk | Use temporary live provider probe because it is credential/cost/provider-state dependent and should not be made mandatory durable coverage in this round. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Mocked OpenAI-client request-shape coverage for Kimi K2.6 and K2.7 adapter behavior, including HighSpeed no-custom-temperature and explicit invalid fixed-value normalization. | REQ-001, REQ-002, REQ-008, REQ-009; AC-002, AC-003, AC-007 | Still Valid | Static inspection shows assertions for `kimi-k2.7-code-highspeed` request `temperature: 1.0`, fixed sampling values, K2.6 non-regression, and invalid tool-choice coercion. | Run as focused final durable coverage. |
| `autobyteus-ts/tests/unit/llm/llm-factory-config-composition.test.ts` | Factory-created LLMs preserve model defaults when raw config omits fields, apply explicit standard raw fields first-class, and preserve existing `LLMConfig` callers. | REQ-004, REQ-005, REQ-007; AC-004, AC-005 | Still Valid | Static inspection shows absence-semantics and configurable override coverage at the factory composition boundary. | Run as focused final durable coverage. |
| `autobyteus-ts/tests/unit/llm/utils/llm-config-overrides.test.ts` | Raw override applier distinguishes missing vs null, filters standard keys out of extras, applies snake/camel standard aliases, and preserves unknown extras. | REQ-004, REQ-005, REQ-006, REQ-007; AC-004, AC-005, AC-006 | Still Valid | Static inspection shows standard-key/extraParams collision coverage and unknown-key pass-through. | Run as focused final durable coverage. |
| `autobyteus-ts/tests/unit/llm/supported-model-definitions.test.ts` | Built-in catalog exposes policy-backed fixed Kimi K2.7 defaults for both official rows while preserving other catalog/pricing behavior. | REQ-002, REQ-003, REQ-010; AC-008 | Still Valid | Static inspection shows both `kimi-k2.7-code` and `kimi-k2.7-code-highspeed` default config assertions. | Run as focused final durable coverage. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts` | AutoByteus backend passes raw run `llmConfig` to the LLM factory without wrapping it in `LLMConfig({ extraParams })`. | REQ-004, REQ-005, REQ-006, REQ-007; AC-004, AC-005, AC-006 | Still Valid | Static inspection shows the test asserts the raw object identity passed to `createLLM` and not an `LLMConfig` instance. | Run as focused final durable coverage. |
| `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | Credential-gated live Kimi smoke/integration coverage for K2.6 and non-HighSpeed K2.7 behavior. | AC-007, AC-009 partially | Still Valid | Existing live K2.7 coverage remains meaningful, but it is not HighSpeed-specific. HighSpeed live validation is better as a temporary probe for this ticket because it depends on current provider access/cost. | Retain. Do not update durable coverage in this round; run temporary HighSpeed live probe. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-runtime-graphql.e2e.test.ts` | Broad GraphQL/runtime E2E suite for AutoByteus/Codex/Claude runtime execution, with runtime selection and raw `llmConfig` plumbing. | General runtime API health; not Kimi-specific | Still Valid / Out Of Scope For Exact Kimi HighSpeed Proof | The AutoByteus suite is LMStudio-gated and picks available local runtime models; it does not intentionally select Kimi HighSpeed or capture Kimi request params. | Retain; not selected for this Kimi HighSpeed final run. |
| `autobyteus-server-ts/tests/e2e/runtime/autobyteus-team-runtime-graphql.e2e.test.ts` | Broad AutoByteus team runtime E2E with member `llmConfig` records. | General runtime API health; not Kimi-specific | Still Valid / Out Of Scope For Exact Kimi HighSpeed Proof | It uses available AutoByteus runtime models and does not capture Kimi HighSpeed request construction. | Retain; not selected for this Kimi HighSpeed final run. |
| `autobyteus-server-ts/tests/e2e/agent-team-definitions/agent-team-definitions-graphql.e2e.test.ts` and related definition persistence E2E | Persist/round-trip `llmConfig` records in GraphQL definition APIs. | Raw config persistence shape, not provider request construction | Still Valid / Out Of Scope For Exact Kimi HighSpeed Proof | Persistence semantics remain relevant but the changed request-construction boundary is backend/factory/provider. | Retain; no update. |
| `autobyteus-web/components/workspace/config/__tests__/AgentRunConfigForm.spec.ts` and `TeamRunConfigForm.spec.ts` | Frontend model/run config form emits sparse `llmConfig` records. | Supports raw partial config assumptions; UI code not changed by this implementation | Out Of Scope | This ticket changed backend/factory/provider composition, not frontend form behavior. | Retain; no update. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No stale/obsolete durable coverage found in the changed scope. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| N/A | N/A | Existing review-passed durable coverage already covers deterministic request-shape, config-composition, catalog, and backend raw-handoff boundaries. | N/A | No API/E2E-stage durable coverage addition is planned. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| N/A | N/A | No update required. | N/A | API/E2E will run existing review-passed coverage and temporary probes only. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | N/A | No stale durable coverage found. | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TEMP-001A | Temporary server-side Vitest backend/factory config probe. Build `AgentConfig` through `AutoByteusAgentRunBackendFactory` with actual `LLMFactory` registered for `kimi-k2.7-code-highspeed`, raw run `llmConfig` containing invalid fixed values plus unknown provider keys, inspect the produced `llmInstance` model/config, then delete the probe file. | Daily-Assistant-relevant backend -> factory path keeps the HighSpeed model, applies raw standard fields first-class, preserves unknown extras, and filters nested standard-key collisions before provider invocation. | It duplicates focused durable backend/factory unit coverage and uses one-off package-boundary wiring; keeping it would be brittle. |
| TEMP-001B | Temporary `autobyteus-ts` Vitest request-capture probe. Register the built-in HighSpeed row in `LLMFactory`, create the LLM with invalid raw fixed values and unknown extras, mock `openai`, call `sendMessages(...)`, capture final request params, then delete the probe file. | Factory -> KimiLLM -> request-builder path sends fixed K2.7 values and does not leak standard raw-key collisions into final request params. | It duplicates focused durable unit coverage but proves the crossed factory/provider/request-builder path for this ticket. |
| TEMP-002 | Temporary live Kimi HighSpeed provider probe with `KIMI_API_KEY` present. Register the built-in `kimi-k2.7-code-highspeed` row in `LLMFactory`, create it with invalid raw fixed values, send one short request with low `max_tokens`, and classify provider access errors if any. | Provider accepts the factory-created, adapter-normalized HighSpeed request; specifically detects recurrence of the original `invalid temperature` 400. | Live provider checks are credential-, quota-, model-availability-, network-, and cost-dependent; they are appropriate execution evidence for this ticket but should not be unconditional durable coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Browser/UI Daily Assistant manual flow using the local product shell | The bug is in backend/factory/provider request construction; the current task has deterministic backend/factory config, request-capture, and live provider probes available without standing up the full UI. | Low after TEMP-001A/TEMP-001B plus durable backend/factory/provider coverage. | None unless TEMP-001A or TEMP-001B fails or reveals request-shape drift. |
| Repository-wide `pnpm -C autobyteus-server-ts typecheck` | Pre-existing TS6059 rootDir/include mismatch recorded in implementation handoff; server build passed. | Low for this ticket; unrelated typecheck config blocks repository-wide signal. | Delivery or separate maintenance can address the TS6059 configuration issue; not a reroute for this implementation. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| N/A | N/A | No ambiguity or reroute trigger found during investigation. | N/A |

## Execution Plan

1. Run the focused review-passed durable `autobyteus-ts` LLM/config/Kimi coverage:
   - `pnpm -C autobyteus-ts exec vitest run tests/unit/llm/utils/llm-config-overrides.test.ts tests/unit/llm/llm-factory-config-composition.test.ts tests/unit/llm/api/kimi-llm.test.ts tests/unit/llm/supported-model-definitions.test.ts`
2. Run the focused review-passed durable server backend raw-handoff coverage:
   - `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-run-backend-factory.test.ts`
3. Create, run, and remove TEMP-001A server-side backend/factory config probe for Daily-Assistant-relevant raw config handoff.
4. Create, run, and remove TEMP-001B `autobyteus-ts` request-capture probe for factory -> Kimi HighSpeed request construction.
5. Create, run, and remove TEMP-002 live Kimi HighSpeed provider probe, using credential access if available and classifying access/provider failures precisely.
6. Run build and diff hygiene checks that are practical in this stage:
   - `pnpm -C autobyteus-ts build`
   - `pnpm -C autobyteus-server-ts build`
   - `git diff --check`
6. Write the execution coverage report. If no repository-resident durable coverage is added/updated/removed during API/E2E, hand off to `delivery_engineer`; if durable coverage changes become necessary, route back to `code_reviewer`.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Existing durable coverage is current and sufficient for deterministic behavior. API/E2E will add only temporary probes and remove them after execution; therefore no coverage-code re-review is planned unless probe results force durable changes.
