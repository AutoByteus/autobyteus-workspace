# Code Review Report

## Review Round Meta

- Review Entry Point: `Implementation Review`
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/requirements-doc.md` (SR-005, approved)
- Investigation Notes Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/solution-revision-record.md`
- Design Spec Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-spec.md` (SR-005). `design-spec.sr004.bak.md` is historical only.
- Supplemental Task Artifacts Reviewed As Context: `probes/` (evidence only). Project `DESIGN.md` and `TESTING.md`.
- Relevant Solution Revision IDs: SR-005 (SR-004 work carried over)
- Design Review Report Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture Review Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/architecture-review-revision-record.md`
- Relevant Architecture Review Revision IDs: ARCH-REV-003
- Implementation Handoff Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/implementation-handoff.md`
- Implementation Revision Record Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/implementation-revision-record.md`
- Relevant Implementation Revision IDs: IR-001
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-001`
- Current Review Round: 1
- Review Scope: `Full Review`
- Review Scope Evidence (round >1): N/A
- Trigger: implementation handoff from `/software_engineering_team/implementation_engineer` (IR-001)
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Coverage Investigation / Execution Coverage / API/E2E Revision Record: N/A (implementation review)
- Delivery Revision Record: N/A
- Failing Scenario IDs / Commands / Evidence: N/A
- Code reviewed: branch `codex/anthropic-prompt-caching`. Commits `56124de85` (baseline test fix) and `80845f45e` (feature), against base `927796780`.

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Selected route: `Implementation Review`
- Independent source review required by the classification: `Yes`
- Classification evidence or correction required: None. The implementation matches the design's classification:
  - shared `BaseLLM`/`LLMExtension`/response-type/`RequestPackage` contracts changed;
  - the ownership boundary moved;
  - the signed-thinking lifecycle changed;
  - the SDK was upgraded;
  - about 70 files changed.

## Review Scope

- Changed implementation and behavior reviewed:
  - Anthropic conversation caching (BEH-001);
  - late SYSTEM notes kept in place (BEH-007);
  - append-only history plus the prefix-binding guard (BEH-005, REQ-012);
  - the provider-native boundary and single render (REQ-013);
  - the Sonnet 5 price (BEH-006);
  - the SDK 0.132.1 upgrade (REQ-011);
  - the preserved compaction one-shot (BEH-004).
- Files / areas reviewed:
  - all 22 changed files under `autobyteus-ts/src`, read in full diff;
  - the new and changed tests in `autobyteus-ts/tests` and `autobyteus-server-ts/tests`;
  - the docs in `autobyteus-ts/docs` and `autobyteus-server-ts/docs/modules/token_usage.md`;
  - manifests and `pnpm-lock.yaml`.
- Independent checks run by the reviewer:
  - `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json`: exit 0.
  - Focused vitest run: 49 files, 431 tests passed. It covered `provider-native-boundary`, `anthropic-conversation-prefix-flow`, `anthropic-llm-prompt-caching`, `llm/provider-native`, `anthropic-signed-tool-continuation`, `llm-request-assembler`, `llm-phase-tool-protocol-recovery`, all of `tests/unit/memory`, `llm/base`, `anthropic-llm` and `supported-model-definitions`.
  - Workspace-wide `rg`, excluding `node_modules`, `dist` and `tickets`, for the removed symbols (`renderedPayload`, `._renderer`, `provider-native-assistant-turn`, `resetAnthropicSignedHistory`, `ANTHROPIC_ASSISTANT_TURN_KEY`, `withoutAnthropicThinkingInMessage`), for `LLMExtension` subclasses, and for `sendMessages`/`streamMessages` callers and overrides.
  - Lockfile resolution and manifest pins.
- Explicit exclusions:
  - Live provider behavior: AC-003/004/011/013 in `"error"` mode and P-005 are for API/E2E.
  - The full integration suites. The handoff records them as base-identical; I did not re-run them.

## Upstream Behavior And Production-Path Basis Confirmation

- Approved requirements basis understood: Yes. SR-005 has REQ-001..013 and AC-001..014. REQ-013/AC-014 are structural and change no user-visible behavior.
- Design-spec behavior map verified against the implementation: Yes. I checked DS-001..DS-005 against the code (rows below).
- Design review report and round confirmed: ARCH-REV-003 (round 3) passed. Its non-blocking notes are applied:
  - ARCH-005: server test caller updated; shifted test overrides fixed;
  - R-1: no registry ↔ policy cycle; a static test checks it.
- Behavior-basis status: `Confirmed`
- Changed or newly discovered behavior, if any: None.
- Remaining material ambiguity, if any: None. P-005 remains the known live-validation item (see Material Premise).

| Behavior ID | Current Status | Current Implementation Path And Lifecycle Evidence | Contradicting Or Newly Discovered Evidence |
| --- | --- | --- | --- |
| BEH-001 | Confirmed | `llm-phase.ts:189-192` sends `{ promptCacheScope: 'conversation', … }`. `anthropic-llm.ts` `buildRequestParams` gives the system a `text` block with `{type:'ephemeral', ttl:'1h'}` plus top-level `cache_control` 1h, only under the conversation scope. Sync and stream share it. That is 2 breakpoints, both 1h, so TTL order is valid. | — |
| BEH-005 | Confirmed | `llm-request-assembler.ts:61-66` runs the guard after `executeIfAuthorized` and before `captureRecoverySnapshot`, on every call including tool continuations. `retained-reasoning-prefix-binding.ts` strips → `controller.replace` (which persists: `memory-manager-working-context-controller.ts:40-43`) → records the digest only after a successful replace. The per-turn reset is deleted. Restore builds a new `MemoryManager`, so the digest starts as null. | — |
| BEH-007 | Confirmed | `splitLeadingSystemMessages` uses `leadingSystemMessages`. A late non-empty SYSTEM message stays in `remaining`, and `AnthropicPromptRenderer.renderNonToolMessage` maps any non-assistant role to `user`. | — |
| BEH-004 | Confirmed | `direct-llm-compression-strategy.ts:57` passes no scope. Its messages are `[SYSTEM prompt, USER content]` only, so the one-shot body keeps a plain-string system and has no markers. | — |
| BEH-002/003 | Confirmed | The normalizer and calculator are unchanged. The new tests price 1h writes and reads. | — |
| BEH-006 | Confirmed | Catalog row is `pricing(2.0, 10.0, {read 0.2, 5m 2.5, 1h 4.0})`. A server price-row test covers it. | — |
| REQ-011 | Confirmed | Both manifests pin `0.132.1`. The lockfile has a single `@anthropic-ai/sdk@0.132.1`, and `claude-agent-sdk@0.3.280` resolves against it. | — |
| REQ-013 | Confirmed | No `src/agent` or `src/memory` file (except `memory/migration`) mentions `anthropic` or imports `llm/api/`. `provider-native-boundary.test.ts` enforces this. The registry imports the policy, and the policy imports only the type files. `_renderer` is read only inside `llm/api/*`. No `renderedPayload` remains in production. | — |

## Supported Product Scenario And Reachability Gate (Mandatory)

| Scenario ID | Related Behavior / Contract IDs | Kind | Actor / Initiator | Coherent Goal Or Governing Event | Supported Entry Surface / Event | Scenario Shape | Forward Production Path / Lifecycle | Expected Outcome / Consequence | Independent Evidence | Scenario Validity | Review Use |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | BEH-001, REQ-001/002/005 | User | User | Complete a task with a native agent on Claude | Desktop: run an agent or team on the AutoByteus runtime | Normal | `LlmPhase` → assembler (guard) → `BaseLLM.streamMessages` → `AnthropicLLM.buildRequestParams` → API | Calls after the first read the cached prefix | requirements SCN-001; probes A/B | Supported Normal Scenario | Use |
| SCN-002 | BEH-005, BEH-007 | User | User / teammates | Several independent turns, including an interruption | New user or teammate message; interrupt | Normal | Same path. The digest is unchanged, so no strip. The note stays in place as user text. | Append-only history; system unchanged | requirements SCN-002; S4 probe | Supported Normal Scenario | Use |
| SCN-005 | REQ-012 | User | User | Change the media default model or reload a tool schema while agents run | Settings → Media Default Models; Tools reload | Normal | `ToolSchemaProvider` reads per call → new `toolSchemas` → digest changes → strip once → persist → record | Request accepted; append-only again | ARCH P-001; probe P2/P3 | Supported Normal Scenario | Use |
| SCN-006 | REQ-012 | User / Operational | User / app | Continue a run after restart or a definition edit | Restore (`agent-factory` builds a new `MemoryManager`) | Normal | Digest null → first request strips once | Request accepted | ARCH P-002 | Supported Normal Scenario | Use |
| SCN-003 | BEH-004 | System | Native memory | Compact a long context | Compaction threshold | Normal | `DirectLlmCompressionStrategy` → `sendMessages` without scope | No markers | compaction source | Supported Normal Scenario | Use |
| SCN-004 | BEH-002/003/006 | User | User | Check cost | Token Meter, Console | Normal | Normalizer → calculator | Meter equals Console | requirements | Supported Normal Scenario | Use |
| CT-001 | REQ-013, AC-014 | Contract | Approved design | Provider meaning lives only in the provider area; single render | Source tree | — | Static boundary test plus reviewer grep | — | design-spec § Dependency Rules | Supported (engineering contract) | Use |

### Candidate Finding And Mechanism Gate

| Candidate ID | Observation Or Mechanism | Scenario / Contract ID | Independent Trigger | Forward Path / Lifecycle / Consequence | Evidence | Disposition | Reason / Proportionate Response |
| --- | --- | --- | --- | --- | --- | --- | --- |
| C-001 | Guard position and persist-then-record order | SCN-005, SCN-006 | Settings change; restore | Guard runs after compaction and before the checkpoint. `replace` persists, then the digest is recorded. A failed request restores the stripped checkpoint. | `llm-request-assembler.ts:61-66`; binding `bind()`; controller `replace` persists; assembler order test; prefix-flow AC-013a | Reject (no defect) | Matches the design and REQ-012. Nothing to change. |
| C-002 | `nativeTurnMetadata` validates before any write | SCN-001 | Tool-bearing Anthropic response | Parse + assert run before `ingestAssistantResponse`; an invalid turn throws before any trace or working-context write | `memory-manager.ts:307-308`; `anthropic-signed-tool-continuation.test.ts` "rejects … before writing" | Reject (no defect) | Fail-closed ordering preserved (it was previously split between assert-before and parse-after). |
| C-003 | Signature migration completeness | CT-001 | Code contract | No production override or old positional call remains; server and test-support consumers are compatible | `rg` over the workspace; `tsc` build exit 0; handoff server typecheck | Reject (no defect) | — |
| C-004 | `cache_control` authority | SCN-001, REQ-005 | Code contract | Dropped from kwargs (`ANTHROPIC_CONTROLLED_KWARG_KEYS`) and config extras (`ANTHROPIC_EXCLUDED_EXTRA_PARAM_KEYS`); only `buildRequestParams` sets it | adapter source; prompt-caching test "does not let kwargs or config extra params override" | Reject (no defect) | — |
| C-005 | Running agent swaps its model while kept thinking is replayed | — | None found | `AgentContext.llmInstance` is assigned only at factory creation (`agent-factory.ts:141`); there is no runtime writer | `rg "\.llmInstance\s*="` | Reject (Not Reachable) | No mechanism required. A definition edit is a restore (SCN-006). |
| C-006 | Policy operations re-parse the turn (`parseTurn` then `assert…`/`without…` parse again) | CT-001 | Code contract | Extra parse on store and on strip paths only | `anthropic-native-history-policy.ts` | Reject | Negligible cost; it keeps each policy method self-validating for an opaque input. Not a maintainability defect. |
| C-007 | `memory-manager.ts` at 498 effective lines (base 497) | CT-001 | `>500` hard limit | +1 line; binding extracted to its own owner | line count | Reject | Under the limit. The binding extraction is the correct response. Recorded as a residual risk. |
| C-008 | The fresh-run test spies on `MemoryManager.replaceWorkingContext`, but the binding writes through `workingContextController.replace`, so `expect(replace).not.toHaveBeenCalled()` cannot detect a binding rewrite | AC-002/AC-004 (test contract: an assertion must be able to fail) | Test review | The assertion is vacuous for the guard. The same behavior is proven elsewhere: first prefix-flow test (signed blocks replayed at the independent turn; byte-identical prefixes) and the handoff's mutation check. | `anthropic-conversation-prefix-flow.test.ts:211-219`; `memory-manager.ts:136-139` | Promote (Low, non-blocking) | CR-001. Assert on an observable instead: the binding's return values on the real requests, unchanged snapshot persistence, or spy on the controller. |
| C-009 | One-shot calls also stop merging late SYSTEM notes into `system` | SCN-003 | Compaction | The summarizer sends only `[SYSTEM, USER]`, so its output is byte-identical | `direct-llm-compression-strategy.ts:47-50` | Reject | No reachable change for one-shot calls. |
| C-010 | Frozen fixture `released-native-snapshot-shapes.json` still names `llm/utils/provider-native-assistant-turn.ts` | — | Historical hash record at base `8caa610…` | Records released source hashes; the test passes | `native-working-context-snapshot-shapes.test.ts` | Reject | Historical record, not dead code. |

## Structural / Design Checks

| Check | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Task design health assessment is present, evidence-backed, and preserved by the implementation | Pass | Boundary/ownership refactor done as designed: `_renderer` bypass removed, provider rules moved, duplicate leading-run helper removed | — |
| Implementation matches approved behavior-defining supplemental artifacts | Pass | No behavior-defining supplements. Probe shapes (1h TTL, block system, strip once) match. | — |
| Data-flow spine inventory clarity and preservation | Pass | DS-001..DS-005 are traceable in code. `LlmPhase` → assembler → `BaseLLM` → adapter is clean. | — |
| Ownership boundary preservation and clarity | Pass | Memory owns the lifecycle and binding. The policy owns meaning. The adapter is the only request builder. | — |
| Off-spine concern clarity | Pass | The digest, binding, registry and policy each serve one named owner | — |
| Existing capability/subsystem reuse check | Pass | Follows the `nativeToolCallContext` precedent. The binding follows the existing collaborator pattern (`LlmRequestRecoveryBoundary`). | — |
| Reusable owned structures check | Pass | One `leadingSystemMessages` used by the adapter, assembler and validator. One `buildRequestParams` for sync and stream. | — |
| Shared-structure/data-model tightness check | Pass | `RequestPackage` swaps `renderedPayload` for `tools`. `ProviderNativeAssistantTurn` is minimal. `LLMInvocationOptions` gains one literal field. | — |
| Repeated coordination ownership check | Pass | Strip policy is in one place (`messageWithoutPrefixBoundReasoning`), used by the binding, builder and validator | — |
| Empty indirection check | Pass | `bindRetainedReasoningToRequestPrefix` is the public memory boundary over an owned collaborator, by design. The registry resolves and delegates, which is real routing. | — |
| Scope-appropriate separation of concerns and file responsibility clarity | Pass | New files are 8–52 effective lines, one concern each | — |
| Ownership-driven dependency check | Pass | agent/memory → `llm/provider-native`; registry → `llm/api` policy; policy → type files only. No cycle. | — |
| Authoritative Boundary Rule check | Pass | The agent no longer reads `llm._renderer`. Memory no longer reaches Anthropic internals. The binding writes via the controller that `MemoryManager` owns. | — |
| File placement check | Pass | `llm/provider-native/` (neutral contract), `llm/api/anthropic-native-*` (provider), `agent/llm-request-prefix-digest.ts`, `memory/retained-reasoning-prefix-binding.ts` | — |
| Flat-vs-over-split layout judgment | Pass | Follows the flat `llm/api` convention. The 3-file contract folder is justified. | — |
| Interface/API boundary clarity | Pass | `prepareRequest(…, requestTools)` → `{…, tools}`; `sendMessages/streamMessages(messages, kwargs?, options?)`; policy members singular | — |
| Naming quality and naming-to-responsibility alignment | Pass | `promptCacheScope`, `prefixBoundReasoning`, `RetainedReasoningPrefixBinding`, `splitLeadingSystemMessages` describe what they own | — |
| No unjustified duplication of code / repeated structures in changed scope | Pass | Duplicate `takeLeadingSystemMessages` and the sync/stream param building were removed | — |
| Patch-on-patch complexity control | Pass | SR-004 carry-over is integrated, not layered. No leftover per-turn path. | — |
| Dead code removed in the touched files and modules | Pass | See the Legacy section | — |
| Relevant test scenarios and assertions are clear and requirement-aligned | Pass (with note) | Prefix-flow tests run the real MemoryManager → assembler → AnthropicLLM path with only the SDK client mocked. They cover AC-002/004/011/013a/013b. One vacuous assertion: CR-001 (non-blocking). | Fix CR-001 opportunistically |
| Test fixtures/helpers are reasonably reusable and test structure remains coherent | Pass | The `Agent` harness in the prefix-flow test is small and reused across cases | — |
| No stale, duplicated, or compatibility-only tests are retained in changed scope | Pass | Shifted `streamMessages` overrides fixed. `_renderer` stubs removed. Baseline-fix commit kept separate (TESTING.md rule 9). | — |
| API/E2E readiness for the next workflow stage | Pass | The live AC-003/004/011/013 and P-005 recipe is specified in the handoff with `"error"` mode | — |

## Source File Size And Structure Audit (If Applicable)

| Source File | Effective Non-Empty Lines | `>500` Hard-Limit Check | `>220` Delta Check | SoC / Ownership Check | Placement Check | Preliminary Classification | Required Action |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `memory/memory-manager.ts` | 498 | Pass (base 497) | Pass (+6/−11) | Pass | Pass | Under pressure | None now. Residual risk: the next addition must extract. |
| `agent/loop/llm-phase.ts` | 362 | Pass | Pass | Pass | Pass | OK | — |
| `llm/api/anthropic-llm.ts` | 336 | Pass | Pass (+56/−29) | Pass | Pass | OK | — |
| `memory/compaction/working-context-compaction-output-validator.ts` | 242 | Pass | Pass | Pass | Pass | OK | — |
| `llm/base.ts` | 177 | Pass | Pass | Pass | Pass | OK | — |
| `llm/prompt-renderers/anthropic-prompt-renderer.ts` | 174 | Pass | Pass | Pass | Pass | OK | — |
| `llm/anthropic-supported-model-definitions.ts` | 158 | Pass | Pass | Pass | Pass | OK | — |
| `agent/llm-request-assembler.ts` | 123 | Pass | Pass | Pass | Pass | OK | — |
| `llm/provider-native/provider-native-history.ts` (new) | 52 | Pass | Pass | Pass | Pass | OK | — |
| `llm/api/anthropic-native-assistant-turn.ts` (moved) | 50 | Pass | Pass | Pass | Pass | OK | — |
| `memory/retained-reasoning-prefix-binding.ts` (new) | 32 | Pass | Pass | Pass | Pass | OK | — |
| `agent/llm-request-prefix-digest.ts` (new) | 20 | Pass | Pass | Pass | Pass | OK | — |
| `llm/provider-native/provider-native-history-policy.ts` (new) | 18 | Pass | Pass | Pass | Pass | OK | — |
| `llm/api/anthropic-native-history-policy.ts` (new) | 16 | Pass | Pass | Pass | Pass | OK | — |
| `llm/provider-native/provider-native-assistant-turn.ts` (new) | 8 | Pass | Pass | Pass | Pass | OK | — |
| Other changed sources (`messages.ts`, `response-types.ts`, `base-extension.ts`, `provider-request-kwargs.ts`, `anthropic-assistant-turn-assembler.ts`, `accepted-compaction-builder.ts`, `direct-llm-compression-strategy.ts`) | ≤124 | Pass | Pass | Pass | Pass | OK | — |

## Legacy / Backward-Compatibility Verdict

| Check | Result | Notes |
| --- | --- | --- |
| No backward-compatibility mechanisms in changed scope | Pass | No re-export shim, alias, optional deprecated `renderedPayload` or dual signature |
| No legacy old-behavior retention in changed scope | Pass | The per-turn reset and the merge-all-SYSTEM split are deleted |
| Dead code removed in the touched files and modules | Pass | `resetAnthropicSignedHistory`, `takeLeadingSystemMessages`, `splitSystemMessages`, `renderPayload`, the assembler renderer parameter, the `LlmPhase` renderer lookup and `OpenAIChatRenderer` import, `ANTHROPIC_ASSISTANT_TURN_KEY`, `withoutAnthropicThinkingInMessage`, `ToolIntentIngestionOptions.nativeAssistantTurn`, `'renderedPayload'` in the internal-kwargs set. `rg` confirms no remaining references. |
| Approved persisted-data transition decision is followed without unnecessary migration work | Pass | `Directly Usable — No Migration`: same key string and value. Serializer round-trip test unchanged. Prefix-flow restore test reads a real persisted snapshot. |
| No version-specific dual reads/writes or request-time old-shape fallback exists | Pass | — |
| Approved transition mechanics match the reviewed design | Pass | No migration (none required) |

## Dead / Obsolete / Legacy Items Requiring Removal (Mandatory If Any Exist)

None.

## Docs-Impact Verdict

- Docs impact: `Yes`. Already updated in this change.
- Why: the call-surface signature, the native-turn ownership, the caching behavior, the removed per-turn reset and the Sonnet 5 price all changed.
- Files updated:
  - `autobyteus-ts/docs/{agent_memory_design,llm_module_design_nodejs,provider_model_catalogs,agent_runtime_loop_and_interrupt}.md`
  - `autobyteus-server-ts/docs/modules/token_usage.md`
- I checked them against the code; they are accurate. Delivery should re-check them only for later deltas.

## Additional Material Premise Validation (When Required)

### Upstream Design-Review Material-Premise Decisions

| Premise ID | Current Status | Changed Evidence / Reason |
| --- | --- | --- |
| P-001 / P-002 / P-003 | Confirmed | Implemented by the guard as reviewed. Unit-covered (AC-013a/b, unchanged prefix, fresh run, failed request after strip). |
| P-004 | Confirmed (residual) | Unchanged |
| P-005 | Confirmed (live validation pending) | Unchanged decision. Extra supporting evidence: Anthropic's preserved-thinking guidance (claude-api skill, `shared/model-migration.md` § Breaking change 3) gives "strip every `thinking`/`redacted_thinking` block from the history (`text` and `tool_use` stay), then retry" as the supported no-beta recovery. It also lists removing a leading run of thinking blocks as valid. The guard's full strip is that documented shape. The mid-tool-round case remains assigned to API/E2E in `"error"` mode, and a 400 there routes as Design Impact. |

No new or reclassified premise.

## Review Scorecard (Mandatory)

- Overall score (`/10`): 9.4
- Overall score (`/100`): 94
- Score calculation note: simple average; the review decision follows the findings and checks, not the average.

| Priority | Category | Score | Why This Score | What Is Weak / Holding It Down | What Should Improve |
| --- | --- | --- | --- | --- | --- |
| `1` | `Data-Flow Spine Inventory and Clarity` | 9.5 | DS-001 reads straight through: `LlmPhase` → assembler (`{messages, tools}`) → `BaseLLM` → adapter. The double render is gone. | Tools still travel through `kwargs.tools` (deferred by design) | Typed tool transport in a later task |
| `2` | `Ownership Clarity and Boundary Encapsulation` | 9.5 | The `_renderer` bypass is removed. Memory handles opaque turns only. The policy owns meaning. The adapter alone sets `cache_control`. | The binding writes through the controller rather than `MemoryManager.replaceWorkingContext` (equivalent, internal to memory) | — |
| `3` | `API / Interface / Query / Command Clarity` | 9.5 | Narrow new signatures. `promptCacheScope` is a single literal. The policy interface has 4 singular members. | `ProviderNativeAssistantTurn` is a loose record type (by design, opaque) | — |
| `4` | `Separation of Concerns and File Placement` | 9.5 | Small single-concern files in the correct folders | `memory-manager.ts` sits at 498/500 | Extract on the next addition |
| `5` | `Shared-Structure / Data-Model Tightness and Reusable Owned Structures` | 9.5 | `RequestPackage` tightened. One leading-run helper. One request builder. | Per-call `nativeToolCallContext` overlaps the whole-turn envelope (pre-existing, deferred) | Separate task if needed |
| `6` | `Naming Quality and Local Readability` | 9.5 | Domain names; concise comments that state the invariants | — | — |
| `7` | `API/E2E Readiness` | 9.0 | Real-path unit flow, a static boundary test, mutation-checked guard tests and a clear live recipe | One vacuous assertion (CR-001); the P-005 premise is unverified live | Fix CR-001; run P-005 in `"error"` mode |
| `8` | `Runtime Correctness And Behavioral Fidelity` | 9.0 | Guard order, persist-then-record, validate-before-write and one-shot parity are all verified | Live acceptance of the full strip in the middle of a tool round and on restore (P-005) is still unproven | API/E2E |
| `9` | `No Backward-Compatibility / No Legacy Retention` | 10.0 | Clean cut: no shims, aliases or deprecated parameters | — | — |
| `10` | `Cleanup Completeness` | 9.5 | All removal-plan items removed; docs updated | — | — |

## Findings

### CR-001 — Fresh-run test spies on a method the guard does not call (Low, non-blocking)

- Candidate: C-008. Contract: AC-002/AC-004 test intent; an assertion must be able to fail.
- Evidence: `anthropic-conversation-prefix-flow.test.ts:213` spies `agent.memory.replaceWorkingContext`. `RetainedReasoningPrefixBinding` writes through `workingContextController.replace` (`memory-manager.ts:136-139`), so `expect(replace).not.toHaveBeenCalled()` (line 219) passes even if the guard rewrites history. The closing two assertions call `bindRetainedReasoningToRequestPrefix` with a synthetic digest and do not check the real requests.
- Consequence: low. The no-rewrite behavior is still proven by the first prefix-flow test (signed blocks replayed unchanged across the independent turn, byte-identical prefixes) and by the handoff's mutation check. The test's name overstates what it proves.
- Proportionate response: assert an observable the guard actually affects. For example: spy on `bindRetainedReasoningToRequestPrefix` and expect every return value to be `false` after the first request; or spy on the snapshot store/controller `replace`. Then drop the synthetic-digest lines or label them. Do this at the next implementation touch. It does not block API/E2E.

## Classification

N/A. Pass. CR-001 is a non-blocking test-quality note.

## Recommended Recipient

`/software_engineering_team/api_e2e_engineer` (next stage). `/software_engineering_team/implementation_engineer` gets an informational notice, which includes the CR-001 note.

## Residual Risks

- **P-005:** full thinking strip mid tool round (live tool change, or restore while a tool_use awaits continuation). Must be run in `"error"` mode. A 400 is Design Impact.
- **P-004:** an earlier image file changed under kept thinking (no supported workflow does this).
- **Restore cost:** one avoidable cache rewrite per restore within 1h (accepted by design).
- **`memory-manager.ts` at 498/500:** the next change there must extract first.
- **Base-identical failures reported by the handoff, outside scope:**
  - the Gemini `buildGenerationConfig` retry-options leak (product issue);
  - the integration-suite rot.

## Latest Authoritative Result

- Review Decision: `Pass`
- Review Entry Point: `Implementation Review`
- Supported Product Scenario Gate: `Pass`
- Material-Premise Gate: `Pass`
- Score Summary: 9.4 / 10. Every category ≥ 9.0.
- Failure Origin: N/A
- Recommended Recipient: `/software_engineering_team/api_e2e_engineer`
- Notes: the implementation matches SR-005 / ARCH-REV-003. CR-001 is non-blocking. Live AC-003/004/011/013 and P-005 in `"error"` mode remain for API/E2E.
