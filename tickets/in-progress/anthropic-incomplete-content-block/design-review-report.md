# Design Review Report — anthropic-incomplete-content-block

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/requirements-doc.md`. Approved: the SR-005 text, the SR-006 REQ-002 clarification, and the SR-007 editorial repairs.
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/design-spec.md` (Ready, SR-008)
- Supplemental Task Artifacts Reviewed:
  - `probes/max-tokens-tool-use-probe.cjs` and `probes/max-tokens-400.out.json` (evidence only)
  - `approval-request.md`
  - `handoff-architecture-design-complete.md`, including the round-2 and SR-008 sections
  - `follow-up-autobyteus-provider-removal.md` (SR-008 context for the follow-up ticket; not part of this ticket's behavior)
- Relevant Solution Revision IDs: `SR-006`, `SR-007`, `SR-008`
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-incomplete-content-block/tickets/in-progress/anthropic-incomplete-content-block/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-003`
- Current Review Round: `3`
- Trigger: Solution Designer revision SR-008. This is a user-directed scope narrowing: the remote AutoByteus provider is out of scope, `autobyteus-llm.ts` gets a compile-only edit, and the provider's removal is follow-up Project Task `project_task_7fed5fe3-3ffc-45bd-8925-9873d0850546`.
- Prior Review Round Reviewed: Round 2 (`ARCH-REV-002`, Pass on SR-007)
- Latest Authoritative Round: `3`
- Current-State Evidence Basis:
  - The round-1 code read is still valid, because the base `d28c56d5d` has no source changes.
  - Round 2 also verified the following:
    - the repaired requirements tables, with consistent column counts and the Out of Scope list, DEC-003/004, REQ-009, SCN-007/008 and Architecture Phase Input aligned to the recorded approval;
    - the investigation-notes header and RSK-003;
    - the `secrets:import` and `isolated-app` scripts in the root `package.json`, and TESTING.md rules 2 and 4 on credentials and isolation.

## Round 3 (SR-008) Delta

- **Scope narrowing is approved.** The user decided on 2026-10-10 that the remote AutoByteus server no longer exists. The requirements-doc Out of Scope list and the SR-008 entry record that decision as the approval reference. REQ-009..REQ-012 no longer apply to `autobyteus-llm.ts`, and no AC covered the proxy. This narrows approved behavior; it adds none.
- **The adapter has no reachable product path.** With no server, no supported scenario reaches `AutobyteusLLM`. Leaving it outside the finish contract (`finish` stays `null`, which the contract already defines as "unreported") therefore has no reachable consequence. `LlmPhase` treats a `null` finish as "anything else: unchanged". The shared D-07 malformed-call guard still covers every adapter, because it lives in the stream handler.
- **The compile-only edit is proportionate.** It only adapts the constructor to the new `CompleteResponse` (removing the stored completion fields). It is not a compatibility path and does not compete with the clean-cut removal in the follow-up. If the removal lands first, the edit is dropped.
- **Step 1 is unaffected.** The proxy sends no output limit and that does not change.
- **Stale proxy text remains in design-spec (non-blocking cleanup).** It does not affect implementation, because the authoritative file-mapping row and Risks entry are correct:
  - the Task Size rationale (line 34) still lists "the AutoByteus proxy" among the adapters;
  - the Health Assessment deferral (line 156) still reads "The AutoByteus proxy cannot report a finish until upstream does (ASM-003)";
  - the Risks list still has the older duplicate bullet "ASM-003: no recovery through the AutoByteus proxy" (line 479), next to the updated "moot" bullet.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged from round 1, and still correct. The change touches a shared finish contract across all adapters, agent-loop control flow, tool admission and working-context content.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed`
- Approved requirements / intended behavior understood: Yes. The behavior is unchanged from round 1.
  - SR-007 corrections:
    - The requirements text now matches the recorded 2026-10-10 approval (AR-005).
    - The AC-005 observable is clarified: both parts appear as consecutive assistant text, live and after a history reload, and the working context holds both. This is consistent with the approved REQ-004 intent.
- Relevant existing behavior and evidence confirmed: Yes (round-1 code read).
- Scope guardrail confirmed: Yes. Other providers are in scope (UC-004, DEC-003). Out of Scope now names the server/web stream protocol and the compaction report contract.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable: N/A (none remaining)
- Remaining material ambiguity: None

| Behavior ID | Kind | Design Alignment | Trigger / Contract And Evidence | Target Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-002 | System | Pass | Pass | Pass (D-04 settlement steps 1–7; D-05 runner contract) | Confirmed | — |
| BEH-003 | System | Pass | Pass | Pass (text-only ingest; AC-005 observable defined) | Confirmed | — |
| BEH-004 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-005 | Contract | Pass | Pass | Pass (DS-006: terminal chunk last; no `message_stop` → throw, no terminal chunk) | Confirmed | — |
| BEH-006 | System | Pass | Pass | Pass (no empty or reasoning-only assistant message; exhaustion error not ingested) | Confirmed | — |
| BEH-007 | System | Pass | Pass | Pass (projection table keeps the compaction `incomplete` guard) | Confirmed | — |
| BEH-008 | Contract | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | System | Pass | Pass | Pass | Confirmed | — |
| BEH-010 | System | Pass | Pass | Pass | Confirmed | Residual RSK-004 only |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Clear | Linked | Internally Complete | Consistent With Core | Status/Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/max-tokens-tool-use-probe.cjs` + `max-tokens-400.out.json` | Pass | Pass | Pass | Pass | Pass (evidence only) | — |
| `approval-request.md` | Pass | Pass | Pass | Pass | Pass | — |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment present | Pass | design-spec "Task Design Health Assessment" | — |
| Root cause explicit and evidence-backed | Pass | Missing Invariant + Duplicated Policy (AF-001..AF-015, probe) | — |
| Refactor decision explicit | Pass | Refactor needed now: Yes | — |
| Reflected in concrete sections | Pass | D-01..D-09, mapping, removal plan | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable | Narrative | Facade vs Owner | Naming | Ownership | Off-Spine Off Main Line | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary turn | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Primary request limit | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded recovery loop | Pass | Pass (continuation input, carried `sourceEvent` not re-applied, exhaustion sequence) | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Malformed tool call | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Finish return spine | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-006 | Anthropic stream end | Pass | Pass (native turn, then the single terminal chunk last) | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Entry Point Clear | Internals Stay Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `BaseLLM.streamMessages` / adapters | Pass | Pass | Pass | Pass | — |
| `MemoryManager.appendOutputLimitRecoveryNote` | Pass | Pass | Pass | Pass | — |
| `ToolPhase.run` | Pass | Pass | Pass | Pass | — |
| `AgentTurn` (call sequence, continuation flag) | Pass | Pass | Pass | Pass | The runner is the only writer of `beginContinuation()` |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Clear | Forbidden Explicit | Direction Coherent | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `agent/*` → `llm/utils/llm-response-finish.ts` only | Pass | Pass | Pass | Pass | — |
| Adapters → `llm/utils`, `BaseLLM` | Pass | Pass | Pass | Pass | — |
| `token-budget.ts` untouched | Pass | Pass | Pass | Pass | — |

## Interface Boundary Verdict

| Interface | Subject Clear | Singular | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Resolver / `BaseLLM.resolveMaxOutputTokens` | Pass | Pass | Pass | Low | Pass |
| `ChunkResponse.finish` / `CompleteResponse.finish` | Pass | Pass | Pass | Low | Pass |
| Derived `completionStatus` / `completionReason` | Pass | Pass | Pass (D-02 table; `completionReason = providerReason`) | Low | Pass |
| `LlmPhaseOutcome.output_limited` | Pass | Pass | Pass | Low | Pass |
| `AgentTurn.nextLlmCallSequence` (per attempt) + `beginContinuation`/`isContinuation` | Pass | Pass | Pass | Low | Pass |
| `ToolInvocation.argumentsParseError` | Pass | Pass | Pass | Low | Pass |
| `finalizeOutputLimited` | Pass | Pass | Pass | Low | Pass |
| `appendOutputLimitRecoveryNote` | Pass | Pass | Pass | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need | Checked | Decision Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Model output limit | Pass | Pass | N/A | Pass | — |
| Same-turn continuation | Pass | Pass | N/A | Pass | — |
| Hidden note persistence | Pass | Pass | Pass | Pass | Follows the operation-boundary precedent |
| Pre-execution tool failure | Pass | Pass | N/A | Pass | — |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem | Allocation Clear | Decision Sound | Serves Right Owners | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm`, `agent/loop`, `agent/streaming/handlers`, `memory` | Pass | Pass | Pass | Pass | Server and web unchanged |

## Reusable Owned Structures Verdict

| Repeated Structure | Evaluated | Shared File Sound | Ownership Clear | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Finish contract | Pass | Pass | Pass | Pass | — |
| Output-limit rule | Pass | Pass | Pass | Pass | — |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field | Redundant Removed | Overlap Controlled | Core vs Variant | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `LlmResponseFinish` | Pass | Pass | Pass | N/A | Pass | — |
| `CompleteResponse` | Pass | Pass | Pass (getters are pure projections defined by a table) | N/A | Pass | — |
| Adapter `protected maxTokens` fields | Pass | Pass (removed in Step 1) | Pass | N/A | Pass | — |

## File Responsibility Mapping Verdict

| File | Singular | Matches Owner | Re-tightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| New and modified files (Final File Responsibility Mapping) | Pass | Pass | Pass | Pass | — |

## Subsystem / Folder / File Placement Verdict

| Path | Placement Clear | Folder Matches | Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `llm/utils`, `llm/api`, `agent/loop`, `memory` | Pass | Pass | Low | Pass | No new folders |

## Removal / Decommission Completeness Verdict

| Item | Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `completion-status.ts` | Pass | Pass | Pass | Pass | — |
| Stored `completionStatus/Reason` | Pass | Pass (D-02 table) | Pass | Pass | — |
| `{}` fallback | Pass | Pass | Pass | Pass | — |
| `toolInvocationBatches.length + 1` | Pass | Pass (D-08) | Pass | Pass | — |
| Event / flag rename | Pass | Pass | Pass | Pass | — |
| Anthropic 8192 streaming default, `sawToolUse`/`completedNativeTurn` | Pass | Pass | Pass | Pass | — |
| Adapter `protected maxTokens` fields | Pass | Pass | Pass (Step 1) | Pass | — |
| Dead accumulators (Gemini, Responses); multiple Gemini `is_complete` chunks | Pass | Pass | Pass | Pass | — |

## Legacy / Backward-Compatibility Verdict

| Area | Compat Retained | Clean-Cut Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Completion status | No (derived projection serves a live contract) | Pass | Pass | — |
| Event alias | No | Pass | Pass | — |

## Persisted-Data Transition Verdict

| Stored Subject | Decision | Evidence Sufficient | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Working-context snapshot / raw traces | Not Affected (additive) | Pass | Pass | N/A | Pass | A round-trip test for `composed_user` provenance is required by the Guidance |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Step 1 (limits, field removal) | Pass | Pass | Pass | Pass |
| Step 2 (refactor) | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic | Needed | Present | Bad Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Finish contract | Yes | Pass | Pass | Pass | — |
| Output-limited settlement | Yes | Pass (text-only, reasoning dropped, no `after_final_response`) | Pass | Pass | — |
| Recovery note | Yes | Pass | Pass | Pass | — |
| Malformed call | Yes | Pass | Pass | Pass | — |

## Material Premise Validation

### P-001 — A cut tool-call response that carries reasoning but no text

- Round 1 found this premise `Reachable`. The witness was `thinking_display=summarized` on Claude models, or a reasoning provider under REQ-010.
- Round 2: D-04 step 2 ingests only non-empty text, with no reasoning. Step 3 drops partial reasoning. The "nothing kept" note variant handles a response that kept nothing. A test on the Anthropic renderer and one OpenAI-style renderer is required. The consequence no longer occurs.

### P-002 — An authorized compaction retry on the first LLM call of a turn

- Round 1 found this premise `Reachable` under one reading of D-08. The witness was the compaction retry action in `AgentUserInputTextArea.vue`.
- Round 2: in D-08, `isTurnContinuation = turn.isContinuation`. Only the runner sets that flag, when it starts a tool or recovery continuation. A `compaction_blocked` retry is therefore still the first call and runs the authorized compaction. A test is required. The consequence no longer occurs.

No new material premises are introduced by SR-007.

## Unresolved Approved-Behavior Or Current-State Gaps

None.

## Review Decision

`Pass`. The behavior basis is confirmed and AR-001..AR-006 are resolved in the canonical artifacts. No in-scope machinery depends on an unsupported premise.

## Findings

None open. Resolution of AR-001..AR-006 is recorded in `architecture-review-revision-record.md`, ARCH-REV-002.

## Classification

N/A (Pass)

## Recommended Recipient

`/software_engineering_team/implementation_engineer`

## Residual Risks

These are non-blocking. Implementation and validation should keep them visible.

- **`other` → `incomplete` tightening (AR-004).**
  - A provider that reports a nonstandard *successful* finish string on a non-streaming compaction call now has its summary rejected. Compaction then falls back to its existing path, where before the status was `unknown` and the summary was accepted.
  - When an OpenAI-compatible provider documents a success alias, map it to `stop` in that adapter's table, not to `other`.
  - The streaming agent loop is unaffected, because `other` leaves it unchanged.
- **`completion_reason` value change (OpenAI Responses).** The value changes from `incomplete` to the specific reason, for example `max_output_tokens`. This was accepted as a string-only change with no server or web consumer logic. The field names and types of the compaction report contract are unchanged.
- **RSK-004, extended.** OpenAI-compatible providers may not accept `max_completion_tokens`. The parameter-name check and a real-provider smoke test through the test-owned vault are in the Guidance.
- **ASM-003 (closed by SR-008).** The remote AutoByteus provider is out of scope and unreachable, and its removal is follow-up Project Task `project_task_7fed5fe3-…`. Clean up the stale proxy references in design-spec lines 34, 156 and 479 when the spec is next revised.
- **Reasoning after reload.** Partial reasoning of an output-limited response is not shown again after a history reload (accepted tradeoff).
- **Recovery cost.** Up to 3 extra full-limit calls per turn, bounded as approved.

## Latest Authoritative Result

- Review Decision: `Pass`
- Material-Premise Gate: `Pass`
- Notes: Round 3 (SR-008) narrows Step 2 by user decision: `autobyteus-llm.ts` gets a compile-only edit. The Pass stands. Implementation proceeds in two delivery steps (DEC-004). Step 1 (output limits, field removal) can ship alone and unblocks the stuck run (AC-009).
