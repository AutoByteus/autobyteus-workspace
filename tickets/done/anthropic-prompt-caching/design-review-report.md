# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/requirements-doc.md` (SR-005; approved by explicit user instruction on 2026-10-09)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-spec.md` (SR-005). The SR-004 basis this review compares against is `design-spec.sr004.bak.md`.
- Supplemental Task Artifacts Reviewed: `probes/*` (evidence only; no new probe in SR-005)
- Relevant Solution Revision IDs: SR-004, SR-005
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: 3
- Trigger: review request from `/software_engineering_team/solution_designer` for SR-005 (a provider-boundary refactor folded into the ticket with user approval; task_size changed to Large)
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Pass on SR-004)
- Latest Authoritative Round: 3
- Current-State Evidence Basis:
  - Worktree `git status`: the SR-004 steps 1–6 work is uncommitted. Modified: assembler, llm-phase, adapter, base, messages, memory-manager, catalog, manifests, lockfile. New: `llm-request-prefix-digest.ts`, `retained-reasoning-prefix-binding.ts`, `anthropic-llm-prompt-caching.test.ts`. Untracked: `dist/` folders of two SDK packages.
  - Grep over all workspace packages, excluding `node_modules`, `dist` and `tickets`, for `renderedPayload`, `_renderer`, `extends LLMExtension`, `beforeInvoke(`, `.sendMessages(` and `.streamMessages(`.
  - Grep for `providerNativeAssistantTurn`, `provider_native_assistant_turn` and `ANTHROPIC_ASSISTANT_TURN_KEY`.
  - Compared `takeLeadingSystemMessages` (validator) with `leadingSystemMessages` (`llm/utils/messages.ts`).
  - Read the `LlmPhase` recovery-snapshot handling around `streamMessages` (`llm-phase.ts:161–200`).
  - Read the strictness of `parseAnthropicAssistantTurn` (`provider !== 'anthropic'` → throw).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: three `autobyteus-ts` subsystems, shared `BaseLLM`/extension/response-type contracts, a moved ownership boundary, about 25 test files, plus the SR-004 scope. Both values are justified.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None.

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes.
  - SR-005 adds REQ-013/AC-014, a structural requirement with no user-visible behavior change.
  - All SR-004 behavior (REQ-001..012, AC-001..013) is unchanged.
  - Approval is recorded as the user's explicit instruction of 2026-10-09.
- Relevant existing behavior and evidence confirmed: Yes.
  - The only producer of `providerNativeAssistantTurn` is `AnthropicLLM` (`anthropic-llm.ts:311`, `:362`).
  - Readers are memory (`memory-manager.ts:5/291/307`), the compaction validator (`:14/:73`), `llm-phase.ts` (type only), `response-types.ts` and the Anthropic renderer.
  - `renderedPayload` flows only `assembler → llm-phase → BaseLLM.executeBeforeHooks → LLMExtension.beforeInvoke`. No production `LLMExtension` subclass exists. The only other subclass is the test-support live-e2e `InvocationCaptureExtension`, and it uses only `messages`.
  - The `(llmInstance as any)._renderer ?? new OpenAIChatRenderer()` bypass is confirmed at `llm-phase.ts:125`.
  - The two leading-system-run definitions are semantically identical.
  - A provider-side render failure lands in the same `try` around `streamMessages`, whose failure path restores the request recovery snapshot. Removing the agent pre-render therefore keeps recovery equivalent.
- Scope guardrail confirmed: Yes. Per-call `nativeToolCallContext` unification and `kwargs.tools` transport are explicitly deferred.
- Approved change, preserved behavior, and outside scope understood: Yes. AC-014 requires every behavior AC to keep passing; parity tests keep unchanged assertions.
- Every prospective blocking `Design Impact` finding is traceable: `Yes`. There are none.
- Remaining material ambiguity: None.

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | Unchanged from SR-004 |
| BEH-005 | System | Pass | Pass | Pass | Confirmed | Guard semantics unchanged; the strip now goes through `messageWithoutPrefixBoundReasoning` → Anthropic policy |
| BEH-007 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | Compaction calls `sendMessages(messages, kwargs, options)` without a scope |
| BEH-002/003, BEH-006 | Contract / System | Pass | Pass | Pass | Confirmed | — |
| REQ-011 | Operational | Pass | Pass | Pass | Confirmed | Done in the worktree |
| REQ-013 (structural) | Structural | Pass | Pass | Pass | Confirmed | See ARCH-005 (non-blocking caller inventory) |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/*` (A, S1–S4, P1–P4, transcript analysis) | Pass | Pass | Pass | Pass | Pass | — |
| `design-spec.sr004.bak.md` | Pass | Pass | Pass | Pass | Pass | Historical reference only; `design-spec.md` is authoritative |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Behavior Change + Refactor | — |
| Root-cause classification is explicit and evidence-backed | Pass | Boundary/Ownership issue, backed by the importer list, the `_renderer` bypass and the unused `renderedPayload`; verified above | — |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Yes (user-approved REQ-013); deferrals named | — |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Ownership map, interfaces, removal plan, sequence and tests all reflect it | — |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? | Narrative Is Clear? | Facade Vs Governing Owner Is Clear? | Main Domain Subject Naming Is Clear? | Ownership Is Clear? | Off-Spine Concerns Stay Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Conversation request → cached call → native turn stored | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Compaction one-shot | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | `prepareRequest` (guard, no render, returns tools) | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Usage → meter | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Native turn store / strip / replay | Pass | Pass | Pass | Pass | Pass | Pass | Pass. Memory owns the lifecycle; the provider policy owns the meaning |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? | Internal Owned Mechanisms Stay Internal? | Caller Bypass Risk Is Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `BaseLLM.send/streamMessages` | Pass | Pass | Pass | Pass | Removes the `_renderer` bypass |
| `llm/provider-native/provider-native-history.ts` | Pass | Pass | Pass | Pass | Memory and compaction reach provider meaning only here |
| `MemoryManager` | Pass | Pass | Pass | Pass | — |
| `AnthropicLLM` (+ policy, turn module) | Pass | Pass | Pass | Pass | — |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? | Forbidden Shortcuts Are Explicit? | Direction Is Coherent With Ownership? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/**`, `memory/**` → `llm/provider-native`, `llm/base`, `llm/utils` | Pass | Pass | Pass | Pass | AC-014 static check enforces it |
| `llm/provider-native` registry → `llm/api/anthropic-native-history-policy` | Pass | Pass | Pass | Pass | Composition, same as `LLMFactory → api/*`. Recommendation R-1: `llm/api/anthropic-*` imports only the provider-native type/interface files (type-only), never `provider-native-history.ts`, to avoid a registry ↔ policy import cycle |
| `llm/api` ↛ `memory`, `agent` | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? | Responsibility Is Singular? | Identity Shape Is Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `ProviderNativeHistoryPolicy` (`parseTurn`, `assertTurnMatchesToolCalls`, `hasPrefixBoundReasoning`, `withoutPrefixBoundReasoning`) | Pass | Pass | Pass (`provider` tag) | Low | Pass |
| `provider-native-history.ts` operations | Pass | Pass | Pass | Low | Pass. An unknown provider throws, which matches today's fail-closed parse |
| `BaseLLM.sendMessages/streamMessages(messages, kwargs?, options?)` | Pass | Pass | Pass | Low | Pass |
| `LLMExtension.beforeInvoke(messages, kwargs)` | Pass | Pass | Pass | Low | Pass |
| `prepareRequest(...) → RequestPackage{…, tools}` | Pass | Pass | Pass | Low | Pass. Returning `tools` makes the digest input and the sent tools one value |
| `promptCacheScope`, `bindRetainedReasoningToRequestPrefix`, `leadingSystemMessages` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? | Reuse / Extension Decision Is Sound? | New Support Piece Is Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Opaque provider-tagged native data | Pass | Pass | N/A | Pass | Follows the `nativeToolCallContext` precedent |
| Neutral native-turn contract | Pass | Pass | Pass | Pass | `llm/provider-native/`; keeps `llm/utils` generic |
| Anthropic meaning | Pass | Pass | N/A | Pass | Next to the adapter |
| Prefix binding | Pass | Pass | N/A | Pass | Worktree file reused |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? | Reuse / Extend / Create-New Decision Is Sound? | Supports The Right Spine Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/src/llm` | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/agent` | Pass | Pass | Pass | Pass | — |
| `autobyteus-ts/src/memory` | Pass | Pass | Pass | Pass | — |
| `autobyteus-server-ts` | Pass | Pass | Pass | Pass | No production change. Test callers exist (ARCH-005) |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? | Shared File Choice Is Sound? | Ownership Of Shared Structure Is Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Leading system run | Pass | Pass | Pass | Pass | Duplicate removed; semantics identical |
| Sync/stream Anthropic param building | Pass | Pass | Pass | Pass | — |
| Native-turn neutral operations | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? | Redundant Attributes Removed? | Overlapping Representation Risk Is Controlled? | Shared Core Vs Specialized Variant / Composition Decision Is Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `ProviderNativeAssistantTurn` | Pass | Pass | Pass | Pass | Pass | The overlap with per-call `nativeToolCallContext.anthropic.toolUseBlock` is pre-existing and explicitly deferred |
| `RequestPackage` | Pass | Pass | Pass | N/A | Pass | — |
| `CompleteResponse/ChunkResponse.providerNativeAssistantTurn` | Pass | Pass | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? | Responsibility Matches The Intended Owner/Boundary? | Responsibilities Were Re-Tightened After Shared-Structure Extraction? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm/provider-native/{provider-native-assistant-turn,provider-native-history-policy,provider-native-history}.ts` | Pass | Pass | Pass | Pass | — |
| `llm/api/anthropic-native-assistant-turn.ts` (moved), `anthropic-native-history-policy.ts` | Pass | Pass | Pass | Pass | — |
| `agent/llm-request-prefix-digest.ts`, `memory/retained-reasoning-prefix-binding.ts` | Pass | Pass | N/A | Pass | — |
| Changed files (base, extension, response types, adapter, renderer, llm-phase, assembler, memory-manager, compaction builder/validator) | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? | Folder Matches Owning Boundary? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm/provider-native/` | Pass | Pass | Low | Pass | 3 small files |
| `llm/api/anthropic-native-*.ts` | Pass | Pass | Low | Pass | Flat provider convention |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? | Replacement Owner / Structure Is Clear? | Removal / Decommission Scope Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-turn reset | Pass | Pass | Pass | Pass | — |
| `llm/utils/provider-native-assistant-turn.ts` | Pass | Pass | Pass | Pass | No re-export shim |
| `renderedPayload` chain, `renderPayload`, assembler renderer dependency, `_renderer` lookup, internal kwarg key | Pass | Pass | Fail | Pass with note | The caller inventory is incomplete; see ARCH-005 (non-blocking) |
| Duplicate leading-run helper, stale price, SDK pin, docs | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Is Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Signatures, module move, per-turn reset | No | Pass | Pass | No shims, aliases or optional deprecated parameter |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Representative Reader / Semantic / Invariant Evidence Is Sufficient? | Direct Use, Rebuild, Or Migration Choice Is Proportionate? | Migration Safety Is Complete If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Native working-context snapshots | Directly Usable — No Migration | Pass | Pass | N/A | Pass | Same key string and value; only reader ownership moves; only `anthropic` turns were ever written. The round-trip fixture test is specified |
| Usage records, catalog | Not Affected / new usage only | Pass | Pass | N/A | Pass | — |

## Change / Refactor Sequence Verdict

| Area | Sequence Is Realistic? | Temporary Seams Are Explicit? | Cleanup / Removal Is Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Carry over SR-004 worktree work → provider-native boundary → single render → prefix owner → tests → docs → live | Pass | Pass | Pass | Pass. The untracked `dist/` folders are to be deleted if not tracked; confirm before deleting |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? | Example Is Present And Clear? | Bad / Avoided Shape Is Explained When Helpful? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Storing a native turn, strip, single render, conversation request, tool change, future provider | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

- P-001/P-002/P-003: unchanged; handled by the REQ-012 guard (`ARCH-REV-002`).
- P-004: residual (unchanged).
- P-005: non-blocking; goes to AC-013(a) live validation (unchanged).
- No new material premise is introduced by SR-005.
- The "unknown provider throws" rule matches today's fail-closed `parseAnthropicAssistantTurn`, and only `anthropic` turns exist in stored data. It adds no new scenario.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

- `Pass`

## Findings

### ARCH-005 — Signature-change caller inventory misses server and test-support consumers (non-blocking)

- Type: `Design Impact` (change-sequence completeness)
- Severity: Low (non-blocking)
- Protected authority: REQ-013 / AC-014 ("all behavior ACs still pass"); AC-009 (existing suites pass)
- Scope status: `Within Approved Scope`
- Changes approved behavior: `No`
- Evidence:
  - design-spec § Risks says "A grep found no server callers", and § Subsystem Allocation says the same. However, `autobyteus-server-ts/tests/unit/agent-execution/compaction/compaction-provider-requests.test.ts:37` calls `llm.sendMessages(messages, null, { logicalConversationId: 'fresh' })`.
  - `test-support/live-e2e/live-e2e-harness.ts:269` subclasses `LLMExtension` (`InvocationCaptureExtension.beforeInvoke(messages)`). It stays compatible, but it is the one non-unit consumer of the hook and should be part of the "adapt extension tests" step.
- Required update:
  - Include server tests and the root `test-support/` in the signature migration and typecheck.
  - Also search for test fakes that **override** the public `sendMessages`/`streamMessages` with the old positional shape, not only for call sites. Method-parameter bivariance can let a shifted `(messages, renderedPayload, kwargs)` override typecheck while it silently receives `kwargs` in the second slot.
- Recommended recipient: `/software_engineering_team/implementation_engineer` (implementation note); `/software_engineering_team/solution_designer` (informational)

## Classification

N/A (Pass). ARCH-005 is an implementation-scope note.

## Recommended Recipient

`/software_engineering_team/implementation_engineer` (primary); `/software_engineering_team/solution_designer` (informational)

## Residual Risks

- **R-1:** avoid a registry ↔ Anthropic-policy import cycle. `llm/api` should import only the type/interface files from `llm/provider-native`.
- **P-005:** a strip in the middle of a tool round after a live tool change. Exercise it in AC-013(a).
- **P-004:** an earlier image file changed under kept thinking.
- **Restore cost:** one avoidable rewrite per restore within 1h.
- **Refactor parity:** the signed-continuation, compaction and snapshot suites must pass with unchanged assertions (design § Risks).
- **Investigation notes:** they have no SR-005 section; the design-spec evidence table carries the SR-005 code investigation. This is documentation only.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: SR-005 cleanly moves provider meaning out of memory/agent, removes the private-renderer bypass and the unused pre-render, and keeps SR-004 behavior. ARCH-004 is resolved; ARCH-005 is new and non-blocking.
