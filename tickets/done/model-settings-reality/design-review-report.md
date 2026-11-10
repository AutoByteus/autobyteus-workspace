# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality/tickets/in-progress/model-settings-reality/requirements-doc.md` (SR-002, Approved)
- Upstream Investigation Notes: `.../model-settings-reality/investigation-notes.md`
- Upstream Solution Revision Record: `.../model-settings-reality/solution-revision-record.md` (SR-001, SR-002)
- Reviewed Design Spec: `.../model-settings-reality/design-spec.md` (SR-002, status Ready)
- Supplemental Task Artifacts Reviewed: `evidence/probe-results-2026-11-10.md`, `probes/` (listed), `follow-ups.md`, `handoff.md`
- Relevant Solution Revision IDs: SR-001, SR-002, SR-003, SR-004 (code at `817bd9950`; HEAD `a3b87f061` adds API/E2E documents)
- Architecture Review Revision Record: `.../model-settings-reality/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: SR-004 design revision after code review CRR-003 / CR-004 (API-14 failure origin), 2026-11-10 (Large / High unchanged)
- Prior Review Round Reviewed: 2 (ARCH-REV-002, Pass)
- Latest Authoritative Round: 3
- Current-State Evidence Basis: worktree `/home/autobyteus/workspace/.codex/worktrees/model-settings-reality`, branch `codex/model-settings-reality`, HEAD `fd0eb664c` (= `origin/personal` named in the package). Code opened at the cited lines, plus reviewer searches listed under the findings.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three packages, about 30 production files. Shared contracts change: the validation result kind, the GraphQL outcome, the catalog's empty-list rule and the `LLMFactory` raw-config contract. Run creation changes what it writes, and the web store gains concurrent background refresh. The evidence agrees.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. Part A: Claude settings are truthful on both runtimes. Part B: only declared settings reach providers and new runs. Part C: docs sync. Part D: pickers refresh on open and on demand, and refusals are actionable, with a distinct outcome when the model list cannot be read.
- Relevant existing behavior and evidence confirmed: Yes. Opened and confirmed:
  - `anthropic-model-request-policy.ts` L32-40 (`omit` on opus-5/fable-5/fable-5-1)
  - `anthropic-llm.ts` L141-145 (local `adaptive_required` failure), L183, L199 (`omit` branches), L238-241 (effort not sent while Off)
  - `llm-factory.ts` L174-190 (`composeEffectiveConfig`)
  - `llm-config-overrides.ts` L111-191 (unknown keys and both containers go to `extraParams`)
  - `claude-session-config.ts` (reads `thinking_enabled` and `reasoning_effort`)
  - `claude-sdk-model-normalizer.ts` (switch default false; effort default `medium`)
  - `agent-run-provisioning-service.ts` L264 (`input.llmConfig ?? null` stored unchanged)
  - `team-run-service.ts` L128-158 and L170-190 (`createTeamRunFromRootConfig` delegates to `createTeamRun`)
  - `model-catalog-service.ts` L166-185
  - `run-model-selection-service.ts` L57-69 (read error is reported as `model_unavailable`)
  - `available-agent-runtimes-service.ts` L266-267 (empty-list rule)
  - `llmProviderConfig.ts` L190-246 (`ready` short-circuit; `refreshLocalCatalog` flips to idle)
- Scope guardrail confirmed: Yes. UC-001..UC-006 are in scope. The FU-001..FU-003 areas, Claude Code's own caching and new launch-time refusals are out of scope. Preserved: BEH-004, BEH-011, the all-or-nothing Save, validated paths storing canonical selections, and every saved run keeps launching and resuming.
- Approved change, preserved behavior, and outside scope understood: Yes.
- Every prospective blocking `Design Impact` finding is traceable to an approved requirement, acceptance criterion, or preserved-behavior ID: `Yes` (AR-001 → REQ-013/AC-013, Preserved Behavior Boundary).
- Remaining material ambiguity: None in the requirements.
- Statements about existing code, opened at their cited lines: all cited lines match, apart from small line offsets (for example, the availability rule is at L266-267, not L262-263). One claim is unsupported: the Task Design Health Assessment says the creation entry forms and runtimes are "each traced (DS-003 table)", but the design spec has no DS-003 table (AR-002). The derived-consumer list (2) for the catalog/result-kind change is incomplete (AR-001).

| Behavior ID | Kind | Design Alignment | Trigger / Current-State Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | User | Pass | Pass | Pass | Confirmed | — (AR-003 resolved: `adaptive_required`, PRB-A3) |
| BEH-003 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-006 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | User | Pass | Pass | Pass (DS-003 creation trace table, verified) | Confirmed | — |
| BEH-009 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | User | Pass | Pass | Pass | Confirmed | — |
| BEH-011 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-012 | User | Pass | Pass | Pass (complete derived-consumer list; DEC-D1) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear? | Linked To Core Artifacts? | Internally Complete? | Consistent With Core Artifacts? | Status / Approval Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe-results-2026-11-10.md` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| `probes/` | Pass | Pass | Pass | Pass | Pass | — |
| `follow-ups.md` | Pass | Pass | Pass | Pass (FU-001 and the design both use `adaptive_required`) | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior change + bug fix + feature | — |
| Root-cause classification is explicit and evidence-backed | Pass | Missing Invariant + Duplicated Policy. Eight refusal sites confirmed by `rg model_unavailable\|schema_unavailable`; behavior-by-absence confirmed at run-model-selection-service L57-69 | — |
| Refactor needed now / not needed / deferred is explicit | Pass | Bounded: one wording owner, the empty-list rule moved, the result kind split | — |
| Refactor decision is supported by the concrete design sections | Pass | DS-003 creation trace table present | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade vs Owner Clear? | Naming Clear? | One Owner Per Node, In Call Order? | Off-Spine Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass (caller inventory: AR-002) |
| DS-004 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 | Primary | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass. The return spine (refusal → outcome → `applyResultState`) is stated. The consumers are incomplete (AR-001). |
| DS-007 | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass. It reuses the store's existing epoch/requestId/in-flight map. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear? | Internals Stay Internal? | Bypass Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `LLMFactory` (projection, registry) | Pass | Pass | Pass | Pass | No server code calls `applyRawLlmConfigOverrides` (`rg`, 2026-11-10). The only production `createLLM` caller is `createAvailableLlm`, which passes the raw record. |
| `RunModelSelectionService` + refusal owner | Pass | Pass | Pass | Pass | Sites stop wording unavailability themselves. |
| `NewRunLlmConfigProjection` | Pass | Pass | Pass | Pass | Backends export their key sets and do not import the projection. |
| web `llmProviderConfig` store | Pass | Pass | Pass | Pass | Components go through the composables. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear? | Forbidden Explicit? | Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| server → autobyteus-ts | Pass | Pass | Pass | Pass | |
| projection → backend key exports, `LLMFactory` | Pass | Pass | Pass | Pass | No catalog read (QR-003) |
| refusal owner → result types only | Pass | Pass | Pass | Pass | |
| web components → composables → store → Apollo | Pass | Pass | Pass | Pass | |

## Interface Boundary Verdict

| Interface | Subject Clear? | Singular? | Identity Explicit? | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `projectRawLlmConfig(raw, declaredSettingKeys)` | Pass | Pass | Pass | Low | Pass |
| `LLMFactory.canonicalRunLlmConfig(modelIdentifier, raw)` | Pass | Pass | Pass | Low | Pass |
| `projectNewRunLlmConfig({ runtimeKind, llmModelIdentifier, llmConfig })` | Pass | Pass | Pass | Low | Pass |
| `RunModelSelectionValidationResult` + `model_list_unavailable` | Pass | Pass | Pass | Low | Pass (consumers: AR-001) |
| `runModelSelectionRefusal(...)` | Pass | Pass | Pass | Low | Pass |
| store `refreshCatalog(runtime)` / `refreshModelList(runtime)`; draft `reloadModelOptions(address)` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked? | Decision Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Settings projection | Pass | Pass | N/A | Pass | Extends `llm-config-overrides.ts` |
| Creation projection | Pass | Pass | Pass | Pass | One owner for the per-runtime key policy |
| Refresh | Pass | Pass | N/A | Pass | Reuses `inFlightCatalogReads`, `isCurrentCatalogRequest`, `reloadProvider` |
| Unreadable-list rule | Pass | Pass | N/A | Pass | Moved to `ModelCatalogService` |
| Refusal wording | Pass | Pass | Pass | Pass | |

## Subsystem / Capability-Area Allocation Verdict

| Area | Allocation Clear? | Decision Sound? | Supports Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| autobyteus-ts LLM | Pass | Pass | Pass | Pass | |
| server llm-management | Pass | Pass | Pass | Pass | |
| server Claude/Codex/ACP backends | Pass | Pass | Pass | Pass | Codex reads `reasoning_effort` and `service_tier` (normalizer). ACP (Grok Build, DeepSeek Harness) reads `reasoning_effort` (launcher L80-83). The Antigravity backend reads no `llmConfig` key (`rg`). |
| server run creation | Pass | Pass | Pass | Pass | Trace table verified, including `remote-delegation-receiver.ts` L98 → `prepareAgentRun` and `remote-team-run-starter.ts` L76 |
| web | Pass | Pass | Pass | Pass | |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Refusal wording (8 sites) | Pass | Pass | Pass | Pass | |
| Per-runtime setting keys | Pass | Pass | Pass | Pass | Each backend exports its own set |
| Empty-list rule | Pass | Pass | Pass | Pass | |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `RunModelSelectionValidationResult` | Pass | Pass | Pass | N/A | Pass | `model_unavailable` narrows to "not offered now". |
| `AnthropicModelRequestPolicy` modes | Pass | Pass | Pass | N/A | Pass | One `adaptive_required` mode for every always-on row |
| Stored `llmConfig` (new runs) | Pass | Pass | Pass | N/A | Pass | One canonical top-level form (R-3 resolved; IG-1) |

Derived consumers of a changed structure listed with a decision for each (Principle 11): `Pass` (design-spec Change Scope, list items 1–5; every item checked against the code).

Each domain word keeps one meaning, and each concept one name (Principle 15): `Pass`.

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-Tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm-config-overrides.ts` / `llm-factory.ts` | Pass | Pass | N/A | Pass | |
| `new-run-llm-config-projection.ts` (new) | Pass | Pass | N/A | Pass | |
| `run-model-selection-refusal.ts` (new) | Pass | Pass | N/A | Pass | |
| `model-catalog-service.ts`, `available-agent-runtimes-service.ts` | Pass | Pass | N/A | Pass | |
| `launch-usability-check.ts`, `model-routing-settings.ts`, other refusal sites | Pass | Pass | N/A | Pass | DEC-D1: reason kept; owner words `detail` |
| web store/composables/pickers/run-settings | Pass | Pass | N/A | Pass | |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear? | Folder Matches Owner? | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/src/llm-management/services/` (2 new files) | Pass | Pass | Low | Pass | |

## Removal / Decommission Completeness Verdict

| Item | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `omit` off shape + branches | Pass | Pass | Pass | Pass | |
| SDK `thinking` option / schema param / `medium` default | Pass | Pass | Pass | Pass | |
| `supportsAdaptiveThinking`, `supportsClaudeThinking` | Pass | Pass | Pass | Pass | `rg` evidence given |
| Per-site refusal strings; availability empty check; `refreshLocalCatalog` | Pass | Pass | Pass | Pass | Both callers of `refreshLocalCatalog` are named (useRuntimeScopedModelSelection L120, store L414) |
| Stale docs lines | Pass | Pass | Pass | Pass | |

## Legacy / Backward-Compatibility Verdict

| Area | Legacy Retention? | Clean-Cut Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Stored `thinking_enabled` (Fable 5, SDK) | No | Pass | Pass | Projection ignores it. This is a version-agnostic reader, not a compatibility branch. |
| Raw forwarding for schema-less models | No | Pass | Pass | DEC-013. Escalation trigger (a) is recorded. Reviewer search: no server path injects keys into a raw `llmConfig`. |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient? | Proportionate? | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Run/definition/application `llmConfig` | Directly Usable — No Migration | Pass | Pass | N/A | Pass | |
| Run-history `LaunchConfigurationSource.fallbacks[].reason` | Not Affected (DEC-D1) | Pass | Pass | N/A | Pass | Vocabulary unchanged. The web renders fallbacks from `detail` (`useRunMemberFacts.ts` L36, `ModelRoutingDecisions.vue` L243). |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| ts → server → web → docs → realistic check | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed? | Present? | Avoided Shape? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Projection, Fable stored Off, new SDK run, refusal text, refresh | Yes | Pass | Pass | Pass | |

## Material Premise Validation

### P-001 — A list read failure reaches launch-usability-check and is recorded as a fallback reason

- Related approved requirement or established contract: REQ-013 (an unreadable list is reported distinctly); Preserved Behavior Boundary (saved runs keep launching and resuming); run-history launch-source schema.
- Relevant behavior IDs: BEH-012, BEH-011
- Initiating basis kind: `System`
- Independent trigger: a delegated or collaborator launch (or a team member default) whose configured layer names an external runtime whose model list cannot be read, for example a failing Claude CLI. That failure is the "list unreadable" condition the requirements themselves name in AC-013.
- Support evidence: `LaunchUsabilityCheck` validates every configured layer through `validator.validateMany` (launch-usability-check L150-157). Today a read failure returns `model_unavailable` (run-model-selection-service L57-65).
- Forward path: launch → `LaunchUsabilityCheck` → `RunModelSelectionService.validateMany` → catalog throws (target: `ModelListUnavailableError`, or an empty external list) → target result `model_list_unavailable` → L167 `reason: result?.kind === "model_unavailable" ? "model_unavailable" : "model_settings_invalid"` → the verdict's `reason` becomes a `LaunchConfigurationFallback.reason` in the recorded launch source → the web renders it through `useRunMemberFacts` and i18n `runSettings.members.defaultUnusable.*`.
- Lifecycle preconditions and consequence: if the design does not change L167, a list read failure that is recorded today as `model_unavailable` would be recorded as `model_settings_invalid`. The run's stored launch-source note would then say the settings are invalid, which contradicts REQ-013's distinction. `invalidModelMessage` (L61-66) also falls through to `""` for the new kind.
- Reachability: `Reachable`
- Review consequence: AR-001.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| — | — | — | None |

## Review Decision

`Pass`.

## Findings

None open. AR-001, AR-002 and AR-003 are resolved in SR-003; the verification is in `architecture-review-revision-record.md` (ARCH-REV-002).

## Classification

N/A (Pass)

## Recommended Recipient

Implementation Engineer (`/software_engineering_team/implementation_engineer`)

## Round 3 (SR-004) Delta Verdict

- Basis: CR-004 (`code-review-report.md`), API-14 real-stack evidence. Protected: REQ-010/011 and QR-001 (a failed refresh never empties a list that loaded before), REQ-013 (an unreadable list is distinguished from "not offered"), AC-012's failure alternate (stated in SR-004; no new intent).
- Review gap acknowledged: ARCH-REV-002 accepted the SR-003 consumer decision "`listOptions*` → existing catch" without tracing the DS-005 reload consumer. That gap is the failure origin this round fixes.
- Server contract, `RunModelOptions.modelListReadable: Boolean!`: Pass. It is an explicit result for a failed read, replacing behavior by absence (Principle 13), and the text comes from the wording owner (`modelListUnreadableText`). Validate and options share one read-failure classification, so one fact is derived once (Principle 11). Callers checked: `studio-run-model-config-service.ts` L67/L81 (agent and team), `agent-org-run-service.ts` L78 (Org), `delegated-launch-selection-command.ts` L241 (delegated). All spread the options object, so the field reaches every options object type the design names.
- `supportedRuntime` removal: Pass. The `RuntimeKind` enum has six values, all AutoByteus or external (`runtime-kind-enum.ts`). `RunModelSelectionContext.runtimeKind` is typed `RuntimeKind`. Stored runtime kinds are checked against the enum at read time (`agent-run-metadata-store.ts` L150, `run-execution-tree-shared-record-schemas.ts` L92). So the gate's false branch is unreachable.
- Web: Pass.
  - The current reload code replaces options on any answer (`existingRunModelOptionsActions.ts` `reloadModelOptions`, `delegatedLaunchDraftStore.ts` `reloadOptions` L103-117), which is the API-14 defect.
  - The design's per-row merge fits the existing state shape: both stores hold `ExistingRunModelOptionsState` per address or copy key.
  - "No longer offered" already requires a `ready` state (`ExistingRunConfigEditor.vue` `modelUnavailable`, L442-452), so mapping an unreadable row to `unavailable` removes the false label, including on first read. `schemaStateFor` keeps the run's own model editable for an `unavailable` state.
- Scope: Pass. The first-read case is the same signal on the same screen under REQ-013. It needs no extra mechanism and is recorded in SR-004.
- Shared-structure note (non-blocking): `unavailableReason` holds text for both readable answers (context capacity unverified) and unreadable ones. `modelListReadable` is now the only discriminator, so do not branch on `unavailableReason` (IG-4).

## Implementation Guidance (non-blocking)

- IG-1 (R-3, canonical top-level form): when `canonicalRunLlmConfig` lifts declared settings out of `extra_params`/`extraParams`, keep today's precedence. Container entries are read first, then top-level keys override them (`llm-config-overrides.ts` L187-191). A run that has a key in both places keeps the top-level value. Add a unit case for it.
- IG-2 (DEC-D1): the stored `detail` for a list-read failure comes from the wording owner. Keep the runtime diagnostic (agy/grok/dsh `catalogDiagnostic`) in it, as Org launch does today.
- IG-4 (SR-004): the web decides unreadable vs. readable only from `modelListReadable`, never from `unavailableReason` text or empty `replacements`. `reloadModelOptions` / `reloadOptions` resolve `false` only for a current (non-stale) answer with an unreadable row, keeping today's stale-answer rule. Cover with a reload test per store: readable replace, unreadable keep-ready, unreadable first-read → `unavailable` with the owner's message.
- IG-3 (AR-003): moving Fable 5/5.1 to `adaptive_required` makes per-call sampling kwargs fail locally. No production caller passes `temperature`/`top_p`/`top_k` as kwargs (`rg temperature` in autobyteus-ts/src and server src, 2026-11-10). Stored config `temperature` never reaches the Anthropic request (`buildRequestParams` L299-312 builds params from kwargs only), so no stored run gets a new failure.

## Residual Risks

- R-1: RSK-001 (a future CLI honors `thinking: disabled`) and RSK-004 (default On raises token use), as recorded.
- R-2: automatic refresh on each picker open spawns a Claude CLI read (≈2.3 s) when opens are sequential; only concurrent opens are coalesced. Accepted in Key Tradeoffs.
- R-3: resolved (canonical top-level form).
- R-4: resolved (glossary headword "Offered models").

## Latest Authoritative Result

- Review Decision: `Pass` (round 3, SR-004)
- Material-Premise Gate: `Pass`. P-001 is handled by DEC-D1. The API-14 trigger (a failing runtime CLI while a stopped run's settings are open) is a real, supported trigger: SCN-008, observed in a real stack.
- Notes: SR-004 fixes CR-004 at its origin with an explicit options-answer field. Implementation proceeds with IG-1..IG-4, then source review of the delta and the API/E2E rerun (API-14, API-11, API-12, API-15).
