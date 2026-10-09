# Implementation Handoff — anthropic-prompt-caching

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Independent architecture review was selected (Large/High) and passed (ARCH-REV-003). The handoff route is decided by `get_handoff_rules` (Large/High → Code Review).
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/requirements-doc.md` (SR-005, approved)
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/solution-revision-record.md` (SR-001..005)
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-spec.md` (SR-005; `design-spec.sr004.bak.md` is historical only)
- Supplemental task artifacts: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/probes/` (evidence only; `prefix-change-probe.mjs` and `strategy-probe.mjs` show the `"error"`-mode live setup)
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/design-review-report.md` (ARCH-REV-003, Pass)
- Architecture review revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/architecture-review-revision-record.md`
- Triggering rework report: N/A (initial implementation)
- Local check logs: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/implementation-evidence/`

## Current Implementation Summary

1. **Caching (REQ-001/005).**
   - On a conversation request (`LLMInvocationOptions.promptCacheScope: 'conversation'`, set only by `LlmPhase`), `AnthropicLLM` sends:
     - the leading SYSTEM run as one `system` text block with `cache_control {ephemeral, ttl:'1h'}`;
     - top-level automatic caching `cache_control {ephemeral, ttl:'1h'}`.
     These are 2 breakpoints, both 1h. Sync and stream share one private `buildRequestParams`.
   - One-shot calls (the compaction summarizer) send no `cache_control`, and `system` stays a plain string, so they are byte-identical to before.
   - `cache_control` from kwargs or config `extraParams` is dropped, so the adapter is the single authority.
2. **Late SYSTEM notes in place (REQ-010).** Only `leadingSystemMessages(...)` becomes the top-level `system`. A later SYSTEM message (the interruption note) stays in position, and the existing renderer sends it as user text.
3. **Append-only history and the prefix-binding guard (REQ-002/003/012).**
   - The per-turn `resetAnthropicSignedHistory()` is deleted.
   - After compaction and before the recovery checkpoint, `LLMRequestAssembler.prepareRequest` computes `computeLlmRequestPrefixDigest({ leadingSystem, tools })` and calls `MemoryManager.bindRetainedReasoningToRequestPrefix(digest)`. The digest is sha256 over plain `JSON.stringify` of the leading system contents and the exact tool schemas.
   - That delegates to `RetainedReasoningPrefixBinding` (in-memory digest):
     - if the digest is unchanged, it does nothing;
     - otherwise it removes all prefix-bound reasoning once through `messageWithoutPrefixBoundReasoning`, persists the context via `controller.replace`, then records the digest.
   - The digest is null at creation and restore, so the first request after a restore strips once. A fresh run has no reasoning, so nothing is rewritten.
   - The guard also runs on tool continuations.
4. **Provider-native boundary (REQ-013).**
   - New `src/llm/provider-native/` with three files:
     - the `ProviderNativeAssistantTurn` type and `PROVIDER_NATIVE_ASSISTANT_TURN_KEY` (same persisted string);
     - the `ProviderNativeHistoryPolicy` interface;
     - `provider-native-history.ts`: a static registry plus `readProviderNativeTurn`, `nativeTurnMetadata`, `messageHasPrefixBoundReasoning` and `messageWithoutPrefixBoundReasoning`. Unknown or missing provider tags fail closed.
   - The Anthropic turn model moved to `src/llm/api/anthropic-native-assistant-turn.ts`; the policy is in `src/llm/api/anthropic-native-history-policy.ts`.
   - Memory, compaction (builder and validator), the binding, `LlmPhase` and the response types use only the neutral contract. The validator uses `leadingSystemMessages`, and its duplicate helper is removed.
5. **Single render (REQ-013).**
   - `renderedPayload` is removed from `RequestPackage`, the assembler (renderer parameter and `renderPayload`), `LlmPhase` (the `_renderer`/`OpenAIChatRenderer` lookup), `BaseLLM.sendMessages/streamMessages/executeBeforeHooks`, `LLMExtension.beforeInvoke` and the internal kwargs deny-list.
   - New signatures: `sendMessages(messages, kwargs?, options?)`, `streamMessages(messages, kwargs?, options?)`, `beforeInvoke(messages, kwargs)`.
6. **Request-prefix owner.** `prepareRequest(input, identity, systemPrompt, requestTools)` returns `RequestPackage.tools`, and `LlmPhase` sends exactly `request.tools` (omitted when empty, as before).
7. **Sonnet 5 price (REQ-007):** $2 / $10, read $0.20, writes $2.50 / $4. Re-verified on the official pricing page on 2026-10-09: "$2/$10 … is now the standard price; the … increase to $3/$15 … will not occur". The stale catalog-doc rationale is updated.
8. **SDK (REQ-011):** `@anthropic-ai/sdk` 0.132.1 in both manifests and the lockfile. There is a single resolution: `@anthropic-ai/claude-agent-sdk@0.3.280` (peer `>=0.93.0`) resolves against 0.132.1.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching/tickets/in-progress/anthropic-prompt-caching/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005` (SR-004 work carried over)
- Related architecture-review revision IDs: `ARCH-REV-003`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A` (non-blocking ARCH-005, R-1 and P-005 notes applied; see below)

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec § Task Size And Architectural Risk
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - Shared contracts changed as designed: the `BaseLLM`/`LLMExtension` signatures, the response-type field, `RequestPackage`, and the new policy interface.
  - An ownership boundary moved, and signed-thinking lifecycle behavior changed under Anthropic's enforced contract.
  - The SDK was upgraded.
  - About 70 files touched.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High route)
- New design impact or escalation trigger: `None`. The escalation triggers were checked:
  - No production `LLMExtension` or other `renderedPayload` consumer exists. No non-test caller passed a non-null second argument. The `AutobyteusLLM` private `renderPayload` is its own adapter's renderer and is unrelated.
  - No new request path edits earlier native history. Only compaction and the guard do; protocol repair and the finalizer append.
  - No new varying prefix input was found.
  - The persisted shape is unchanged.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-001 | 1h markers on conversation requests | `llm/base.ts` (`promptCacheScope`), `agent/loop/llm-phase.ts` (sets scope), `llm/api/anthropic-llm.ts` (`buildRequestParams`, `ANTHROPIC_CONVERSATION_CACHE_CONTROL`, controlled `cache_control`) | Done. Unit: `anthropic-llm-prompt-caching.test.ts`, `anthropic-conversation-prefix-flow.test.ts` |
| BEH-005 | Append-only history; one-time removal on prefix change or restore; rules behind the provider policy | `agent/llm-request-assembler.ts`, `agent/llm-request-prefix-digest.ts`, `memory/memory-manager.ts`, `memory/retained-reasoning-prefix-binding.ts`, `llm/provider-native/*`, `llm/api/anthropic-native-*.ts` | Done. Unit: prefix-flow AC-002/004/013 cases, rewritten `anthropic-signed-tool-continuation.test.ts`, assembler guard order/digest test |
| BEH-007 | Late note rendered in place | `anthropic-llm.ts` `splitLeadingSystemMessages` + `llm/utils/messages.ts` `leadingSystemMessages` | Done. Unit: adapter late-note test and prefix-flow AC-011 (real interruption path) |
| BEH-004 | Compaction summarizer uncached (preserved) | `memory/compaction/direct-llm-compression-strategy.ts` (no scope; new signature) | Done. Unit: `direct-llm-compression-strategy.test.ts` asserts no `promptCacheScope`; adapter one-shot test asserts no `cache_control` |
| BEH-002/003 | Cache usage parsed and priced (preserved) | unchanged normalizer and calculator | Tests added: normalizer 1h write/read → `cache_state: positive`; server Opus 5.5 calculator components 4 + 0.2 + 5 + 8 + output 20 |
| BEH-006 | Sonnet 5 official price | `llm/anthropic-supported-model-definitions.ts` | Done. Catalog test and server price-row test `[2, 10, 0.2, 2.5, 4]` |
| REQ-011 | SDK 0.132.1 | `autobyteus-ts/package.json`, `autobyteus-server-ts/package.json`, `pnpm-lock.yaml` | Done; typecheck passes (see checks) |
| REQ-013 / AC-014 | Provider meaning in `llm/api`; single render | as items 4–6 above | Static check `tests/unit/provider-native-boundary.test.ts` (no `llm/api`/`anthropic` imports and no "anthropic" text in agent/memory except `memory/migration`; contract independent of agent/memory; adapter files never import the registry; no `._renderer`/`renderedPayload` outside `llm/api`). The text check would flag 5 files on base |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- New:
  - `autobyteus-ts/src/llm/provider-native/{provider-native-assistant-turn,provider-native-history-policy,provider-native-history}.ts`
  - `autobyteus-ts/src/llm/api/anthropic-native-history-policy.ts`
  - `autobyteus-ts/src/agent/llm-request-prefix-digest.ts`
  - `autobyteus-ts/src/memory/retained-reasoning-prefix-binding.ts`
- Moved (git mv): `src/llm/utils/provider-native-assistant-turn.ts` → `src/llm/api/anthropic-native-assistant-turn.ts`.
  - `ANTHROPIC_ASSISTANT_TURN_KEY` and `withoutAnthropicThinkingInMessage` are removed; they are replaced by the neutral key and operation.
  - `isAnthropicThinkingBlock` is added.
- Changed:
  - `src/llm/base.ts`, `src/llm/extensions/base-extension.ts`, `src/llm/api/provider-request-kwargs.ts`
  - `src/llm/api/anthropic-llm.ts`, `anthropic-assistant-turn-assembler.ts`, `src/llm/prompt-renderers/anthropic-prompt-renderer.ts`
  - `src/llm/utils/{messages,response-types}.ts`
  - `src/agent/loop/llm-phase.ts`, `src/agent/llm-request-assembler.ts`
  - `src/memory/memory-manager.ts`: the `nativeAssistantTurn` option is replaced by a private validated-metadata parameter, validated before any write as before.
  - `src/memory/compaction/{accepted-compaction-builder,working-context-compaction-output-validator,direct-llm-compression-strategy}.ts`
  - `src/llm/anthropic-supported-model-definitions.ts`
- New tests:
  - `tests/unit/llm/api/anthropic-llm-prompt-caching.test.ts`
  - `tests/unit/llm/api/anthropic-conversation-prefix-flow.test.ts` (real MemoryManager → assembler → AnthropicLLM with a mocked SDK client)
  - `tests/unit/llm/provider-native/provider-native-history.test.ts`
  - `tests/unit/provider-native-boundary.test.ts`
  - additions to the base, normalizer, catalog, assembler, llm-phase, compaction-strategy and server calculator tests
- Docs:
  - `autobyteus-ts/docs/{agent_memory_design,llm_module_design_nodejs,provider_model_catalogs,agent_runtime_loop_and_interrupt}.md`
  - `autobyteus-server-ts/docs/modules/token_usage.md`

## Important Assumptions

- Leading SYSTEM run under conversation scope: it is joined with `'\n'` into one marked text block. The model sees the same system text as the old string join; P1 shows string and block system are equivalent.
- An empty SYSTEM message is still dropped. This preserves the old filtering; empty text blocks are invalid.
- Digest JSON is not key-sorted on purpose. Plain `JSON.stringify` mirrors the SDK's serialization, so a reordered schema that changes the sent bytes also changes the digest.
- `RetainedReasoningPrefixBinding` is a small owned collaborator of `MemoryManager`, following the existing `LlmRequestRecoveryBoundary` and compaction-coordinator pattern, because `memory-manager.ts` was at the size limit. `MemoryManager.bindRetainedReasoningToRequestPrefix` stays the public boundary.
- Ordering: the binding records the digest only after a successful replace. If persisting throws, the next request retries the strip.
- The compaction validator error text changed from "stale Anthropic thinking blocks" to "stale prefix-bound provider reasoning". The code is unchanged; no test asserted the text.

## Known Risks

- **P-005:** a strip in the middle of a tool round after a live tool-definition change is unverified live (probe P3 covered only a turn boundary). API/E2E should exercise it (see below). At worst one request fails, and the next one succeeds, because the strip is already persisted (unit-tested).
- **P-004:** earlier image files are re-read from disk on each request; a changed file under kept thinking would 400. No supported workflow does this.
- **Restore cost:** one avoidable cache rewrite per restore within 1h (the digest is in-memory by decision).
- **RSK-003:** an unknown prefix edit now 400s on enforced accounts. Covered by the guard, the unit tests and the API/E2E `"error"`-mode run.
- **Observation, not escalation:** `WorkingContextFinalizer` merges a trailing user message with a new user message (for example after a crash between input and reply). That edits only content after the last assistant turn, so it does not touch any thinking block's prefix; it only costs that message's cache read.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Behavior Change + Refactor (+ cost Performance)
- Reviewed root-cause classification: Boundary Or Ownership Issue + Missing Invariant + Legacy Or Compatibility Pressure
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the AC-014 static test passes. The text-level check would flag 5 base files, so it guards against regression.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. There are no re-export shims, optional deprecated `renderedPayload` parameters or dual signatures.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`:
  - `resetAnthropicSignedHistory`, `takeLeadingSystemMessages`, `splitSystemMessages`;
  - the assembler `renderPayload` and renderer parameter, and the `LlmPhase` renderer lookup;
  - `ANTHROPIC_ASSISTANT_TURN_KEY`, `withoutAnthropicThinkingInMessage`, `ToolIntentIngestionOptions.nativeAssistantTurn`;
  - `_renderer` fields on test doubles that existed only for the removed lookup.
- Dead code found elsewhere, listed as follow-up: None.
- Shared structures remain tight: `Yes`. `RequestPackage` lost `renderedPayload` and gained `tools`; `LLMInvocationOptions` gained one literal field.
- Canonical shared design guidance reapplied: `Yes`
- Changed source files within size guardrails: `Yes`. Largest: `memory-manager.ts` 498 non-empty lines (base 497); `anthropic-llm.ts` 336 (85 changed lines).
- Notes: ARCH-005 is applied:
  - the server test `compaction-provider-requests.test.ts` call is updated;
  - `test-support/live-e2e/live-e2e-harness.ts` and the server `real-e2e-compaction-quality` extension use `beforeInvoke(messages)` only, so they stay compatible;
  - four `LlmPhase` test doubles that override `streamMessages(messages, renderedPayload, kwargs, options)` (the bivariance trap) are fixed, and a test now asserts the kwargs and options slots.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Directly Usable — No Migration` (snapshots); schema `Not Affected`
- Design-spec decision reference: § Persisted Data / State Transition Decision
- Implementation follows the decision: `Yes`. The key string `provider_native_assistant_turn` and the value shape are unchanged. Only reader ownership moved.
- Direct-use evidence:
  - The unchanged-assertion `working-context-snapshot-serializer.test.ts` round-trips a signed native turn and its stripped form (imports only changed).
  - The prefix-flow test restores a real persisted snapshot holding thinking through `WorkingContextSnapshotBootstrapper`: one strip, then append-only.
- Deviation: `None`

## Environment Or Dependency Notes

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/anthropic-prompt-caching`, branch `codex/anthropic-prompt-caching`.
- `pnpm install --ignore-scripts` was used. The server Prisma client was generated with `pnpm exec prisma generate`.
- Untracked build outputs (`autobyteus-application-backend-sdk/dist/`, `autobyteus-application-sdk-contracts/dist/`) were confirmed untracked (`git ls-files` empty) and deleted per the design sequence. `pnpm -C autobyteus-server-ts test:integration:prepare` (or `prepare:shared`) recreates them. Other untracked build outputs created by `test:integration:prepare` (devkit and Brief Studio `dist/`) are left in place, per TESTING.md, and never staged.
- The baseline comparisons used a temporary detached worktree of base `927796780` at `/tmp/apc-base`, with symlinked `node_modules`. It is removed after use.

## Local Implementation Checks Run

All are implementation-scoped. No API/E2E or live-provider checks were run.

- `pnpm -C autobyteus-ts exec tsc --noEmit -p tsconfig.build.json`: pass.
- `pnpm -C autobyteus-server-ts typecheck` (production, includes the Claude backend on SDK 0.132.1): pass.
- `autobyteus-ts` test-config typecheck (`tsc -p tsconfig.json`): 0 new errors compared with base `927796780`. Base has 293 pre-existing test-type errors, which TESTING.md lists as a follow-up.
- Server test typecheck: the server tsconfig has `rootDir: src` and no test typecheck script (TESTING.md: test files are not type-checked yet). I inspected the changed-surface call sites in server tests and test-support directly; all use the new shapes.
- `pnpm -C autobyteus-ts exec vitest run tests/unit`: 1859 passed, 1 failed. The failure is base-identical and is a product issue (below).
- `pnpm -C autobyteus-ts exec vitest run tests/integration`: 57 failed, 195 passed, 28 skipped. The set of failing tests is identical to base `927796780` (diffed); see below.
- Server: `pnpm -C autobyteus-server-ts prebuild` passed. `pnpm -C autobyteus-server-ts test:unit`: 666 files passed / 4 skipped; 5101 tests passed / 7 skipped (log `implementation-evidence/server-test-unit.summary.log`).
- Server: `test:integration:prepare` passed. `test:integration`: 70 files passed / 1 failed / 18 skipped; 338 tests passed / 2 failed / 68 skipped. The 2 failures are the known exception TESTING.md documents (`agent-status-websocket.integration.test.ts` content-cadence window cases). Log `implementation-evidence/server-test-integration.summary.log`.
- Focused server runs: `tests/unit/token-usage/pricing` and `tests/unit/agent-execution/compaction/compaction-provider-requests.test.ts`: 52/52 pass.
- Mutation checks:
  - disabling the binding's digest check makes 3 prefix-flow tests fail;
  - restoring the old merge-all-SYSTEM split makes the AC-011 flow and adapter late-note tests fail.
  Both files were restored.

Base-identical failures found under TESTING.md Rule 9:

1. **Fixed as a separate baseline-fix commit** (test-side causes):
   - `tests/unit/events/event-types.test.ts`: the count was stale after `6908ccff4` added `AGENT_COMPACTION_BLOCKED` and `AGENT_COMPACTION_RESUMED` (now asserts both, count 30).
   - `tests/unit/multimedia/image/api/{autobyteus,openai}-image-client.test.ts`: assertions predate the `{ signal }` request-options argument added in `905e6a057`.
2. **Reported, not fixed (product issue, outside scope):** `tests/unit/llm/api/compaction-single-attempt-transport.test.ts` › "sets Gemini retries on its isolated client after user extras". The cause is in `GeminiLLM.buildGenerationConfig`: `Object.assign(config, extraParams)` copies the user's `httpOptions.retryOptions.attempts: 7` into each request's config. That overrides the isolated client's `attempts: 1` from `utils/gemini-helper.ts`, so a single-attempt compaction call retries with backoff, and the test times out after 20 s. Introduced around `6908ccff4`. Suggested owner: whoever owns the Gemini adapter / compaction transport.
3. **Reported, not fixed (base-identical integration-suite rot, outside scope):**
   - Most of the 57 are live-provider tests without credentials (kimi, glm, gemini, openai, deepseek, grok) and MCP server tests.
   - `agent/runtime/agent-runtime.test.ts` (10): "InMemoryStore does not support system-instruction capture".
   - `agent/read-media-file-continuation-flow.test.ts`: it looks up the removed `gemini-3.5-flash` catalog row, so it fails before reaching the edited assembler lines, as on base.
   - `llm/utils/messages.test.ts` and the others are likewise base-identical.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: backend/runtime-only change. The Token Meter already renders cache rows, and there is no UI change.

## Downstream Coverage Hints / Suggested Scenarios

- Code Review focus:
  - the guard's position (after compaction, before `captureRecoverySnapshot`), and persist-then-record ordering;
  - the neutral-operation boundary and the R-1 import direction;
  - the `streamMessages`/`sendMessages` signature migration, including shifted overrides;
  - `nativeTurnMetadata` validation before any write;
  - the `cache_control` authority.
- Live validation is in the next section.

## API / E2E / Executable Coverage Investigation And Execution Still Required

Run through the test vault, with the strict check on (`thinking.block_binding.prefix_mismatch_behavior: "error"`, beta `thinking-binding-controls-2026-08-01`). See `probes/strategy-probe.mjs` and `probes/prefix-change-probe.mjs`. The strict check is a validation harness only; never ship it.

- **AC-003:** a native-runtime `claude-opus-5-5` run with ≥ 25 calls and ≥ 2 independent turns: ≥ 90 % run-level hit, and every call after the first has `cache_read_input_tokens > 0`.
- **AC-004:** the first call of a new turn writes only the new input, and the earlier tool-cycle thinking is present in the request.
- **AC-011:** an interruption, then a new turn: no 400, and the top-level system is unchanged.
- **AC-013(a) and P-005:** change a media default model in Settings **while the agent waits between a `tool_use` and its continuation**. Expect no 400.
  - A 400 means `Design Impact` under the design's escalation trigger. Options listed in the review: keep the previous tool definitions until the round ends, or a scoped `drop_block`.
- **AC-013(b):** restart the app and continue a run that holds thinking. Expect no 400.
- **AC-012:** live probe on SDK 0.132.1.
- **AC-007** (user check): the Console shows tokens reused, and the Token Meter matches the Console.
- **REQ-009** (delivery): report the cache hit per path/runtime.
