# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/requirements.md`
- Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/investigation-notes.md`
- Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/design-spec.md`
- Design Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/design-review-report.md`
- Implementation Handoff: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/implementation-handoff.md`
- Code Review Report: `/Users/normy/autobyteus_org/autobyteus-worktrees/newest-glm-kimi-models/tickets/done/newest-glm-kimi-models/code-review-report.md`
- Current Investigation Round: 1
- Trigger: Code-review Round 2 pass; API/E2E not yet started.
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: Round 1

## Current Requirement And Design Basis

The approved behavior is a clean catalog/request-shape modernization for GLM and Kimi. GLM active support moves from `glm-5.1` to `glm-5.2`, with `new GlmLLM()` defaulting to `glm-5.2`, GLM 5.2 metadata exposing 1,000,000 context/input and 128,000 output tokens, and flat UI/config `thinking_type` converted by `GlmLLM` into provider-native `thinking.type` without leaking `thinking_type`; disabled thinking must prune stale `reasoning_effort`. Kimi keeps `kimi-k2.6` as a first-class general-purpose built-in, adds `kimi-k2.7-code` as a coding/agentic built-in, removes `kimi-k2-thinking`, and does not add aliases/fallbacks for removed IDs. `KimiLLM` must keep K2.6-specific tool-workflow safe behavior scoped to K2.6, while K2.7 Code must avoid disabled thinking, normalize fixed sampling fields, and coerce unsupported tool choices to provider-accepted `auto`/`none`. The reviewed design identifies Kimi K2.7 Code streamed reasoning/tool-continuation preservation as an API/E2E risk that must be validated.

The implementation handoff's Legacy / Compatibility Removal Check was read and is clean: no backward-compatibility mechanisms were introduced, no legacy old behavior is retained in scope, and remaining active references to removed IDs are limited to negative assertions or documentation notes. Static inspection of the changed implementation matched that section: `supported-model-definitions.ts` contains `glm-5.2`, `kimi-k2.6`, and `kimi-k2.7-code` active rows; no active `glm-5.1` or `kimi-k2-thinking` row/alias was found.

## Changed Behavior Summary

| Behavior / Boundary | Change Type (`Added`/`Changed`/`Removed`/`Preserved`/`Unclear`) | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| GLM active built-in catalog row is `glm-5.2` only | Changed / Removed | FR-001, AC-001, design removal plan | Retain factory/metadata durable assertions; run focused model-list tests. |
| `new GlmLLM()` default model is `glm-5.2` | Changed | FR-002, AC-006 | Retain unit request-capture coverage; live default coverage executes when `GLM_API_KEY` is available; local run uses copied ignored `.env.test`. |
| GLM 5.2 thinking schema and request mapping | Added / Changed | FR-004, FR-005, AC-003-AC-005 | Unit coverage is valid; add live integration scenarios for enabled/disabled thinking so provider acceptance is covered when credentials exist. |
| Kimi active built-ins are `kimi-k2.6` and `kimi-k2.7-code`; `kimi-k2-thinking` removed | Added / Preserved / Removed | FR-006, FR-007, FR-010, AC-002 | Retain catalog/metadata tests; no stale test removal needed. |
| Kimi K2.6 tool-safe behavior remains K2.6-only | Preserved | FR-009, AC-008 | Retain existing unit and live K2.6 integration coverage. |
| Kimi K2.7 Code request normalization avoids disabled thinking and invalid fixed sampling/tool-choice values | Added | FR-009, AC-008, AC-009, code-review CR-001 resolution | Unit request-capture coverage exists; add live K2.7 Code API integration coverage for provider acceptance. |
| Kimi K2.7 Code streamed reasoning through multi-step tool calls | Added / Changed | Design DS-004 residual risk; code-review residual risk | Add/execute live K2.7 Code streamed tool-loop coverage that records reasoning chunks and attempts the continuation turn with the preserved reasoning attached to the assistant tool-call message. |
| Removed IDs must not be supported through compatibility aliases/fallbacks | Removed | FR-011, AC-011, design legacy policy | Retain negative assertions and active-reference search; do not add compatibility-only coverage. |
| Frontend schema-driven thinking toggle supports typed GLM schema | Changed | DS-003, AC-010 | Retain `llmThinkingConfigAdapter` unit coverage; no browser E2E needed because the changed boundary is pure utility/schema behavior. |

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision (`Still Valid`/`Needs Update`/`Stale / Remove`/`Replace`/`Out Of Scope`/`Unclear`) | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/glm-llm.test.ts` | Captures GLM default, config/per-request enabled and disabled thinking mapping, no `thinking_type` leak, stale effort pruning. | FR-002, FR-004, FR-005, AC-004-AC-006, CR-002 | Still Valid | Static inspection shows assertions match current requirements and Round 2 CR-002 fix. | Execute. |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` | Captures K2.6 default/tool safety, K2.7 fixed sampling, no disabled thinking, invalid string/object tool-choice coercion. | FR-007, FR-009, AC-007-AC-009, CR-001 | Still Valid | Assertions match current K2.6 retained support and K2.7 Code provider constraints. | Execute. |
| `autobyteus-ts/tests/unit/llm/metadata/model-metadata-resolver.test.ts` | Curated/live metadata behavior for Kimi retained and K2.7 fallback metadata. | FR-003, FR-008, AC-003 | Still Valid | Kimi and GLM metadata fallback remains required; live-provider metadata mock with stale K2-thinking is used as negative/ignore evidence, not active support. | Execute. |
| `autobyteus-ts/tests/integration/llm/llm-factory-metadata-resolution.test.ts` | Factory model list/metadata/schema assertions and negative removed-ID assertions. | FR-001, FR-003, FR-006, FR-010, FR-011, AC-001-AC-003, AC-011 | Still Valid | Covers active catalog row visibility and no old built-ins. | Execute. |
| `autobyteus-web/utils/__tests__/llmThinkingConfigAdapter.spec.ts` | Schema-driven thinking UI state/toggle behavior, including GLM typed schema defaults and effort removal when disabled. | DS-003, AC-010 | Still Valid | The UI boundary is schema utility logic; tests assert no model-name inference. | Execute. |
| `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts` | Existing live GLM simple, stream, public methods, and tool-call continuation against `glm-5.2`. | FR-002, DS-002 | Needs Update | Model ID updated to `glm-5.2`, but no live enabled/disabled thinking acceptance scenario existed before this API/E2E pass. After copying ignored `.env.test`, live GLM credentials are available locally. | Add focused enabled/disabled thinking live scenarios and execute live integration coverage. |
| `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | Existing live Kimi simple/stream/public/tool continuation for retained `kimi-k2.6`. | FR-007, FR-009, AC-007-AC-008 | Needs Update | K2.6 assertions remain valid, but no live `kimi-k2.7-code` provider-acceptance or streamed reasoning/tool-continuation scenario exists. `KIMI_API_KEY` is set locally. | Add K2.7 Code live scenarios and execute. |
| `autobyteus-ts/tests/integration/agent/streaming/kimi-tool-id-event-stream-boundary.test.ts` | Preserves Kimi-shaped tool IDs through handler/notifier/event stream. | DS-004 adjacent streaming boundary | Still Valid | Tool ID preservation remains relevant but does not prove K2.7 Code reasoning replay. | Execute or leave covered by broader focused commands if time-constrained; no update. |
| `autobyteus-ts/tests/unit/llm/api/openai-compatible-llm.test.ts` | Generic OpenAI-compatible reasoning extraction from sync/stream responses. | DS-004 | Still Valid | Reasoning extraction is required for Kimi K2.7 Code streams, but generic renderer replay behavior remains provider-specific risk. | Execute if included in broader focused command; no update planned now. |
| `autobyteus-ts/tests/unit/llm/prompt-renderers/openai-chat-renderer.test.ts` | Generic OpenAI chat renderer omits internal `reasoning_content`. | DS-004 / provider-specific renderer behavior | Still Valid | Generic omission is intentional for generic OpenAI-compatible providers; Kimi K2.7 Code live validation decides if Kimi needs specialization. | No immediate update before live evidence. |

## Stale Or Obsolete Coverage Decisions

| Path / Scenario | Obsolete Assertion | Why It Is Obsolete | Upstream Evidence | Replacement Coverage | No-Replacement Rationale |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | No relevant stale durable coverage found during investigation. | N/A | N/A | N/A |

## Durable Coverage To Add

| Scenario ID | Behavior / Boundary | Requirement / Acceptance Criteria / Design Evidence | Planned Artifact / Path | Why Durable Coverage Is Needed |
| --- | --- | --- | --- | --- |
| API-GLM-001 | Live GLM 5.2 accepts enabled thinking with `reasoning_effort: max` through adapter mapping. | FR-004, FR-005, AC-004 | `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts` | Unit tests prove request shape; live integration should prove provider acceptance with live `GLM_API_KEY` availability. |
| API-GLM-002 | Live GLM 5.2 accepts disabled thinking with stale effort pruned. | FR-004, FR-005, AC-005 | `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts` | Disabled thinking/effort pruning is a provider-acceptance risk. |
| API-KIMI-001 | Live Kimi K2.7 Code accepts adapter-normalized simple request and returns content/reasoning-compatible response. | FR-009, AC-008, AC-009 | `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | Existing live Kimi coverage only exercises K2.6. |
| API-KIMI-002 | Live Kimi K2.7 Code tool request accepts adapter-normalized fixed sampling/tool-choice and can continue after streamed tool call with preserved reasoning attached to the assistant tool-call message. | DS-004 residual risk, FR-009, AC-008, AC-009, code-review residual risk | `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | This is the key unproven API/E2E risk from design/code review. |

## Durable Coverage To Update

| Scenario ID | Existing Path / Scenario | Required Update | Requirement / Acceptance Criteria / Design Evidence | Notes |
| --- | --- | --- | --- | --- |
| API-GLM-001 / API-GLM-002 | `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts` | Add live thinking enabled/disabled acceptance tests. | AC-004, AC-005 | Existing file already owns live GLM API checks and skips if no key. |
| API-KIMI-001 / API-KIMI-002 | `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` | Add live K2.7 Code simple and tool/reasoning continuation checks. | AC-008, AC-009, DS-004 | Existing file already owns live Kimi API checks. |

## Durable Coverage To Remove

| Existing Path / Scenario | Removal Reason | Requirement / Acceptance Criteria / Design Evidence | Replacement Or No-Replacement Decision |
| --- | --- | --- | --- |
| N/A | No stale durable coverage removal required. | N/A | N/A |

## Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-SEARCH-001 | Active-source grep for `glm-5.1` and `kimi-k2-thinking` excluding archival/build output. | No active compatibility aliases/fallback rows were introduced. | Repository search output is task evidence; negative assertions already remain durable in factory tests/docs. |
| TMP-ENV-001 | Copy ignored `autobyteus-ts/.env.test` from the main checkout after user guidance, SHA-verify without printing values, and check only `GLM_API_KEY`/`KIMI_API_KEY` set/unset status. | Both GLM and Kimi live-provider scenarios can execute in this worktree without exposing secret values. | Environment state and copied ignored secret file are per-run evidence, not repo coverage. |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Required Follow-Up Or Escalation |
| --- | --- | --- | --- |
| Kimi high-speed variant `kimi-k2.7-code-highspeed` | Explicitly out of scope. | None for approved scope. | No follow-up unless user requests it. |
| Browser UI end-to-end for GLM schema controls | Changed frontend boundary is utility/schema logic; no UI component changed. | Low; component behavior relies on utility already covered. | No follow-up unless delivery identifies UI docs/release need. |

## Ambiguities Or Reroute Triggers

| Issue | Classification (`Requirement Gap`/`Design Impact`/`Unclear`/`Local Fix`) | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time. Live Kimi K2.7 Code reasoning/tool-loop may still expose an implementation defect. | N/A | Upstream artifacts are clear; implementation passed code review. | N/A |

## Execution Plan

1. Add narrow durable integration coverage to `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts` for GLM enabled/disabled thinking provider acceptance and to `autobyteus-ts/tests/integration/llm/api/kimi-llm.test.ts` for Kimi K2.7 Code simple and streamed tool-continuation behavior.
2. Execute focused unit/integration coverage already reviewed by code review: GLM/Kimi unit request-shape tests, metadata/factory tests, frontend thinking adapter tests.
3. Copy the ignored main-checkout `autobyteus-ts/.env.test` into the worktree `autobyteus-ts/.env.test` after user guidance, verify matching SHA-256 without printing values, and execute the updated live-provider integration commands for both GLM and Kimi. If provider access/quota/model availability blocks occur, record the classified blocker. If provider rejects the request shape or continuation semantics, classify as Local Fix unless evidence points to missing/ambiguous requirements.
4. Run `pnpm --dir autobyteus-ts build` after durable test edits.
5. Record active-reference grep evidence for removed model IDs.
6. Because repository-resident durable coverage will be updated after code review, route the cumulative package back to `code_reviewer` after writing the execution coverage report.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Durable coverage updates are intentionally limited to existing provider integration test files and directly cover code-review residual risks. The initial missing-credential risk was resolved by copying ignored `.env.test` from the main checkout without printing secrets.

---

## Round 2 Coverage Refresh Addendum

### Investigation Meta Update

- Current Investigation Round: 2
- Trigger: Code review Round 4 passed after a follow-up repository-resident durable unit coverage update in `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` for Kimi thinking `reasoning_content` extraction.
- Prior Investigation Reviewed: Round 1 in this artifact.
- Latest Authoritative Investigation: Round 2 addendum plus unchanged Round 1 baseline.

### Follow-Up Scope And Coverage Impact

Code review Round 4 accepted a narrow deterministic unit-coverage update only. No production source changed after the prior API/E2E pass; the changed durable coverage is:

| Path / Scenario | Current Assertion Or Intent | Related Requirement / Acceptance Criteria / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` / K2.6 non-stream `reasoning_content` extraction | Mocked Kimi K2.6 response with `reasoning_content` maps to `CompleteResponse.reasoning`. | DS-004, Kimi thinking residual risk, code-review Round 4 basis from official Kimi docs | Still Valid | Kimi K2.6 thinking is enabled by default per code-review official-doc check; existing `OpenAICompatibleLLM` extraction path owns response reasoning. | Execute refreshed unit/factory command. |
| `autobyteus-ts/tests/unit/llm/api/kimi-llm.test.ts` / K2.7 Code streamed `reasoning_content` extraction | Mocked streamed Kimi K2.7 Code `reasoning_content` deltas map to `ChunkResponse.reasoning`. | DS-004, API-KIMI-002, code-review Round 4 basis from official Kimi docs | Still Valid | Prior live API/E2E already proved K2.7 Code streamed reasoning/tool continuation; this unit coverage makes extraction deterministic. | Execute refreshed unit/factory command and rerun live Kimi integration to keep the API/E2E evidence current. |

### Durable Coverage To Add / Update / Remove In This API/E2E Refresh

| Category | Decision | Rationale |
| --- | --- | --- |
| Add durable coverage | No API/E2E-owned additions required | The follow-up unit coverage was already added by the implementation/code-review loop and reviewed by Round 4. |
| Update durable coverage | No API/E2E-owned edits required | The accepted tests directly cover the newly questioned Kimi thinking extraction behavior. |
| Remove durable coverage | No | No stale/obsolete coverage found. |
| Refresh execution | Yes | Rerun the refreshed unit/factory command and live GLM/Kimi integration coverage, including tool-call scenarios, so delivery resumes from current evidence. |

### Round 2 Temporary Execution Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-R2-UNIT-001 | Rerun unit/factory command that includes the new Kimi thinking unit coverage. | Follow-up deterministic Kimi reasoning extraction tests pass with existing GLM/Kimi catalog/metadata coverage. | Command log is task evidence; tests are already durable. |
| TMP-R2-LIVE-001 | Rerun live GLM and Kimi integration tests using existing ignored `.env.test` credentials, without printing secret values. | Prior live provider evidence remains current after the follow-up coverage change, including tool-call continuations. | Environment-dependent execution evidence is recorded in logs, not added as extra repo code. |

### Round 2 Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None. | N/A | Round 4 code review accepted the follow-up tests; no production source or requirement/design gap was introduced. | N/A |

### Round 2 Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed By API/E2E In Round 2: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: Because API/E2E is not editing repository-resident durable coverage in this refresh, a passing refresh can route directly to `delivery_engineer` with the cumulative package and updated coverage artifacts.

---

## Round 3 Coverage Refresh Addendum

### Investigation Meta Update

- Current Investigation Round: 3
- Trigger: Code review Round 5 passed for the corrected current-project implementation package and routed the package to API/E2E as the current authoritative implementation-review entry point.
- Prior Investigation Reviewed: Rounds 1 and 2 in this artifact.
- Latest Authoritative Investigation: Round 3 addendum plus unchanged valid baseline decisions from Rounds 1 and 2.

### Current Round 5 Scope And Coverage Impact

Round 5 code review accepts the corrected current-project package for GLM 5.2 and Kimi K2.6/K2.7 Code support. It explicitly treats prior API/E2E artifacts as historical for the corrected implementation-review entry point and requests current API/E2E validation of:

| Behavior / Boundary | Current Coverage State | Validity Decision | Round 3 Action |
| --- | --- | --- | --- |
| Real-provider GLM 5.2 enabled/disabled thinking acceptance | Durable live integration scenarios exist in `autobyteus-ts/tests/integration/llm/api/glm-llm.test.ts`. | Still Valid | Rerun live GLM integration. |
| Kimi K2.7 Code fixed sampling/tool-choice behavior, including object forced-function tool-choice coercion | Deterministic unit coverage exists; live K2.7 Code simple/tool-loop integration scenarios exercise adapter-normalized provider requests. | Still Valid | Rerun Kimi unit/factory command and live Kimi integration. |
| Live Kimi `reasoning_content` behavior for K2.6 | Deterministic unit coverage verifies K2.6 `reasoning_content` extraction. Existing live K2.6 integration covers provider call success and tool-call continuation but does not assert non-empty reasoning. | Use Temporary Executable Probe Only | Add a temporary live K2.6 reasoning probe after build, because the durable extraction behavior is already covered and adding a live assertion may be brittle against provider response variability. |
| Live Kimi K2.7 Code `reasoning_content` and tool-loop continuation | Durable live integration asserts streamed reasoning is non-empty and continuation succeeds with preserved `reasoning_content`. | Still Valid | Rerun live Kimi integration. |
| RPA media schema casing issue | Explicitly out of scope for current ticket per Round 5 code review. | Out Of Scope | Do not validate or edit RPA/media schema files. |

### Durable Coverage To Add / Update / Remove In Round 3

| Category | Decision | Rationale |
| --- | --- | --- |
| Add durable coverage | No API/E2E-owned additions planned | Current integration/unit coverage already exists for the reviewed behavior. K2.6 live reasoning provider observation will be a temporary probe because deterministic extraction coverage is durable and live reasoning emission can be provider/prompt sensitive. |
| Update durable coverage | No API/E2E-owned edits planned | Round 5 already reviewed the corrected durable coverage package. |
| Remove durable coverage | No | No stale/obsolete coverage found. |
| Refresh execution | Yes | Rerun current unit/web/build checks, live GLM/Kimi integration tests, and a temporary K2.6 reasoning probe. |

### Round 3 Temporary Executable Validation Plan

| Scenario ID | Probe / Harness / Runtime Setup | Behavior Proven | Why This Should Not Remain As Durable Coverage |
| --- | --- | --- | --- |
| TMP-R3-KIMI-K26-REASONING | After `autobyteus-ts` build, run a one-off Node script importing built `KimiLLM`/`Message` classes, loading ignored `.env.test` without printing secrets, sending a K2.6 prompt, and recording only whether `CompleteResponse.reasoning` is non-empty plus content length. | Live provider sends K2.6 `reasoning_content` through the adapter into `CompleteResponse.reasoning`. | Deterministic durable unit coverage already covers extraction; live reasoning emission may vary by provider/prompt, so this is current-task evidence rather than a stable repo assertion. |
| TMP-R3-ENV | Confirm ignored `.env.test` is present and key presence is set/unset only. | Live GLM/Kimi integration can execute without exposing values. | Environment state is local evidence only. |

### Round 3 Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Recipient |
| --- | --- | --- | --- |
| None at investigation time. | N/A | Round 5 code review accepted the corrected package; requested API/E2E surfaces are covered by reruns and a temporary probe. | N/A |

### Round 3 Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed By API/E2E In Round 3: `No`
- Reroute Required Before Validation Execution: `No`
- Recommended Recipient If Reroute Required: N/A
- Notes: A passing Round 3 refresh can route to `delivery_engineer` because API/E2E will not make new durable coverage edits after code review Round 5.
