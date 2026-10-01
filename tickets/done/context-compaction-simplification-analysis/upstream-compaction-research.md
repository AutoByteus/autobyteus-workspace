# Upstream context-compaction research and experiments

## Result and authority

- **Package:** `context-compaction-simplification-analysis`; **round:** `SR-002`; **date:** 2026-09-26; **owner:** Solution Designer.
- **Result:** Comparative investigation complete; evidence-only refinement of Draft requirements, not Architecture Design Complete and not a finalized delivery receipt.
- **Request:** The user asks whether one output (even plain text instead of JSON) suffices for compaction, and explicitly requests temporary clones and code experiments on Hermes, OpenCode, ZCode, DSH, and Codex.
- **Conclusion:** The inspected model-facing text-summary paths support one structured continuation checkpoint, without mandatory episodic/semantic records. This supports simplifying AutoByteus's output contract, **not** removing compaction safety mechanisms or claiming all upstream implementations are simple.
- **Approval basis:** Research/probes expressly requested. Core conceptual separation was already stated by the user in SR-001. Full changed-behavior baseline, stored-data/API transition, design, implementation and deployment remain unapproved. No new behavior-defining supplement is introduced here.
- **Scope:** All five default-branch snapshots cloned/read; targeted Hermes upstream tests; isolated source-declaration/mock-provider probes for three TypeScript projects. No live model or production-history benchmark. No AutoByteus runtime/source/data modifications.
- **Workspace:** `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis`; branch `codex/context-compaction-simplification-analysis`; retained AutoByteus evidence base `origin/personal` @ `a2694ed453e353550d8b345fa82ef489634dcaf2` from the earlier round, not freshly revalidated. Finalization target if later approved: `origin/personal`; no commit/push/finalization performed here.
- **Related scenarios/behaviors:** `SCN-001/BEH-001` initial budget-triggered compaction; `SCN-003/BEH-003` repeated compaction; existing `SCN-002/BEH-002` Memory Inspector remains unchanged.

## Repository identity and reproducibility

Temporary clone root: `/tmp/autobyteus-compaction-research-20260926.kVSGz5`. Shallow clones used `git clone --depth 1` with `GIT_LFS_SKIP_SMUDGE=1`. All five clones had clean `git status --short` after the experiments. Repositories are pinned below rather than treating moving branches as stable evidence.

“ZCode” was resolved as Z.ai's project and “DSH” as DeepSeek Harness, whose README names the executable `dsh`. Those identities were disclosed during research; no alternate project identity was supplied by the user.

| Project | Repository | Commit | Root license |
| --- | --- | --- | --- |
| hermes | [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) | `9fc7f17906eab1dd81ddfdf8a1edeecac1e79940` | MIT |
| opencode | [anomalyco/opencode](https://github.com/anomalyco/opencode) | `696f41bc8e7586657375d53390925fc54c25d34c` | MIT |
| zcode | [zai-org/ZCode](https://github.com/zai-org/ZCode) | `29628c9acdb81b703bbd4080c207a0e7ce5e276e` | Apache-2.0 |
| dsh | [deepseek-ai/deepseek-harness](https://github.com/deepseek-ai/deepseek-harness) | `477b4f420553e8a52c2fbccc464d7561b239c443` | MIT |
| codex | [openai/codex](https://github.com/openai/codex) | `25270df2615eb4da5b9d4a9a392226933fb096c5` | Apache-2.0 |

Full manifest: [upstream-experiments/repositories.json](upstream-experiments/repositories.json). Local temp clones/venv are disposable research resources, not product dependencies or new workspaces to merge.

## Comparison: actual model output, not JSON storage envelopes

| Project / path | Model-facing result | Previous checkpoint and reconstruction | Required episodic/semantic records? |
| --- | --- | --- | --- |
| Hermes | One natural-language checkpoint with Markdown sections | Explicit previous-summary + new-turns update; removes old summary carriers; reconstructs protected head + one summary carrier + tail. Summary role/merging respects conversation alternation. | No category-output requirement. Separate memory-provider hooks exist and may gate compaction when configured. |
| OpenCode | One Markdown summary, with objective/details/work state/next move/files | Prompt combines latest prior summary with newly selected history. Application stores an assistant summary message plus a tail boundary; core emits a compaction event containing summary text and recent context. | Not in the inspected compaction output contract. |
| ZCode | Text with `<analysis>`/`<summary>` wrappers requested; formatting removes analysis and unwraps summary | Summarizes selected active history; previous checkpoint is already in that history. Rebuilds prefix + new user summary + retained recent entries/reminders. | Not in the inspected compaction output contract. |
| DSH | One Markdown checkpoint via one-shot model stream | Replays selected conversation, appends summary directive; explicitly merges prior checkpoint; replaces selected surface with framed user checkpoint. | Not in the basic compaction plugin's contract. |
| Codex local | One assistant text handoff summary | Builds replacement history with bounded retained user messages plus summary contextual fragment; reinjects initial context as applicable. | Not in the local text-summary contract. |
| Codex remote v2 | One opaque compaction item accepted from the server | Client requires one compaction item and response completion, then builds retained history around it. | Client does not require the taxonomy; server's internal representation/algorithm is not exposed. |

### Hermes — simple output, extensive orchestration

The summarizer makes an auxiliary model request, extracts content text, rejects empty/refusal/length-truncated output, and returns a string. The prompt provides structured headings for continuation and explicitly updates prior state with new turns. These headings include goals, facts, preferences, decisions, artifacts and pending work: useful information categories **within one checkpoint**, not independently maintained episodic/semantic stores. [Summary call and prompt](https://github.com/NousResearch/hermes-agent/blob/9fc7f17906eab1dd81ddfdf8a1edeecac1e79940/agent/context_compressor.py#L3753-L4042).

The execution path also has tool-tail protection, prompt budgeting, redaction, summary rehydration, fallback/cooldown and alternation-safe placement. Failure policy can abort compaction or use a deterministic fallback; do not infer that all failures preserve all old detailed turns. [Compression assembly](https://github.com/NousResearch/hermes-agent/blob/9fc7f17906eab1dd81ddfdf8a1edeecac1e79940/agent/context_compressor.py#L5281-L5410).

**Important counterexample to overclaiming separation:** `_pre_compress_memory_context` can call a memory provider to obtain additional context. If checkpointing is configured as required, missing capability/failure can block compression. This is genuine coordination with a separate memory service. It still does not require the summarizer to emit episodic/semantic JSON. [Memory hook](https://github.com/NousResearch/hermes-agent/blob/9fc7f17906eab1dd81ddfdf8a1edeecac1e79940/agent/conversation_compression.py#L2944-L2983).

### OpenCode — one checkpoint with explicit update semantics

Both relevant layers were inspected, not only an old file: the application layer imports the new core prompt builder. The builder requests Markdown. Its iterative instructions say newer information supersedes conflicting older information and that still-needed prior material must be carried into the replacement. The core captures text deltas, rejects provider failure/empty text and publishes a typed event with summary and recent context. The application invokes a compaction agent with no executable tools, stores an assistant summary, and retains recent context using its boundary metadata. [Core prompt/execution](https://github.com/anomalyco/opencode/blob/696f41bc8e7586657375d53390925fc54c25d34c/packages/core/src/session/compaction.ts#L15-L234); [application orchestration](https://github.com/anomalyco/opencode/blob/696f41bc8e7586657375d53390925fc54c25d34c/packages/opencode/src/session/compaction.ts#L320-L465).

This separates *text emitted by the model* from *structured application bookkeeping*. JSON/typed event storage is not evidence that the LLM must produce categorized JSON.

### ZCode — tagged text rather than JSON

Its prompt asks for text-only output with two wrappers and nine continuation-oriented sections. `formatCompactSummary` strips the analysis wrapper and unwraps the summary, but does not enforce every requested heading. Plain Markdown passes through. A runtime guard rejects empty formatted output and tool calls. The new summary is persisted with a compaction boundary and reinjected as a user message. Auto/reactive selection can preserve recent assistant-started groups; this is not a claim that every manual trigger preserves the same tail. [Prompt/formatting](https://github.com/zai-org/ZCode/blob/29628c9acdb81b703bbd4080c207a0e7ce5e276e/apps/zcode-cli/packages/core/src/compact/prompt.ts); [guard](https://github.com/zai-org/ZCode/blob/29628c9acdb81b703bbd4080c207a0e7ce5e276e/apps/zcode-cli/packages/core/src/runtime/methods/compact-active-helpers.ts#L98-L133); [replacement/persistence](https://github.com/zai-org/ZCode/blob/29628c9acdb81b703bbd4080c207a0e7ce5e276e/apps/zcode-cli/packages/core/src/runtime/methods/compact-active.ts#L484-L586).

The wrapper helper supports an optional transcript pointer and preservation notices; the inspected active-compaction call uses `suppressFollowup` and does not supply that optional transcript pointer. A helper capability is not assumed enabled in the active path.

### DSH — particularly clear separation of responsibilities

The default basic compactor reuses the original system/messages/tool schemas to support prefix-cache reuse and appends one summary instruction. It calls the LLM stream directly rather than launching a full autonomous tool loop. It returns text content plus host-owned model/usage/raw-output metadata. A prior `<compacted-summary>` is explicitly treated as an old checkpoint to update, not a second category store. Tools present in the request schemas do not imply tool execution by this one-shot function. [Summarizer](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/compaction/compaction-basic/src/summarizer.ts).

The surrounding region operation enforces balanced tool boundaries, validates that the selected surface has not changed, rejects a replacement that is not smaller **including its framing**, and records the replacement and its shadowed source range. This is useful safety complexity, independent of output taxonomy. [Region validation and commit](https://github.com/deepseek-ai/deepseek-harness/blob/477b4f420553e8a52c2fbccc464d7561b239c443/packages/compaction/compaction-basic/src/region.ts#L399-L530).

### Codex — distinguish local implementation from remote service

The local prompt requests a concise handoff covering progress, decisions, constraints, remaining work and critical references. The local code takes assistant text and builds replacement history from it plus bounded user-message retention. The compaction summary is a dedicated contextual fragment, not evidence that all systems always prepend an ordinary user string identically. [Prompt](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/prompts/templates/compact/prompt.md); [local commit](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/core/src/compact.rs#L341-L397); [history builder](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/core/src/compact.rs#L649-L740).

Current remote-v2 client code accepts an opaque compaction item and enforces exactly one such item plus a completed response. Public code shows the client contract, not the server's summarization algorithm. Official OpenAI documentation also describes compaction output as opaque encrypted state for continuation. **Therefore “Codex is only a plain-text summarizer” would be false.** [Remote client](https://github.com/openai/codex/blob/25270df2615eb4da5b9d4a9a392226933fb096c5/codex-rs/core/src/compact_remote_v2.rs#L438-L526); [official compaction documentation](https://developers.openai.com/api/docs/guides/compaction).

## Executed experiments and results

### 1. Hermes: upstream tests, actual compactor with mocked model boundary

Used its required `scripts/run_tests.sh`, a disposable Python 3.11.15 venv, `HERMES_TEST_WORKERS=1`, `HERMES_TEST_FILE_RETRIES=0` and `HERMES_PYTHON`. The runner isolates credential environment and HERMES_HOME. No real history or live provider request was supplied.

| Upstream test file | Passed | What it exercises |
| --- | ---: | --- |
| `tests/agent/test_context_compressor_summary_continuity.py` | 9 | Old checkpoint replacement, restart/handoff recognition and prior-tail continuity without duplicate summaries. |
| `tests/agent/test_compressor_truncated_summary_guard.py` | 25 | Nonempty but token-truncated output and rollback/fallback guards; parameterized cases. |
| `tests/agent/test_context_compressor_reasoning_fallback.py` | 4 | Content extraction fallback, bounds, and empty-output failure. |
| `tests/agent/test_pre_compress_memory_context.py` | 4 | Optional memory context in fresh/iterative prompts and redaction. |
| **Total** | **42** | **All selected tests passed; not the entire Hermes suite.** |

The first continuity attempt failed during collection because the minimal venv lacked `ruamel.yaml`. After adding dependencies, all selected tests passed. This was an environment setup failure, not an upstream behavior failure, and the failed log is retained rather than hidden.

Evidence: [continuity](upstream-experiments/hermes-continuity.log), [guards/memory](upstream-experiments/hermes-guards.log), [initial collection failure](upstream-experiments/hermes-continuity-attempt1.log), [environment versions](upstream-experiments/hermes-environment.txt).

### 2. TypeScript: isolated source-declaration / mock-provider probes

**19 probes passed:** 6 ZCode, 3 OpenCode, 10 DSH. The harness selects actual named declarations using the TypeScript AST and compiles their unchanged source text. It is **not** a reimplementation of the summarizers and **not** the projects' full integration tests.

- ZCode: plain Markdown accepted; tagged output normalized; empty output rejected; tool calls rejected; wrapper options preserved; prompt requests text rather than memory JSON.
- OpenCode: fresh Markdown prompt; prior summary appears once alongside new work and explicit update rules; no mandatory memory-category/JSON output. These are prompt-builder probes, not execution of Effect-based application orchestration.
- DSH: real upstream block assembler/error/helper declarations with a synthetic provider stream; plain Markdown accepted in one call; original request prefix/schemas preserved; prior checkpoint passed into another summary request; empty/truncated/image/provider-error cases rejected; reasoning excluded from checkpoint text; missing route rejected; one checkpoint wrapper produced.

Mocks/boundaries: ZCode application error-envelope construction is substituted; DSH model stream is synthetic; an unused assembler message factory throws if unexpectedly reached. Source SHA-256 hashes and exact test names are in the result JSON. The probes do not validate durable app restart, adapters, full selection/commit flows, or semantic correctness of an actual model-generated summary.

Evidence: [script](upstream-experiments/contract-probes.cjs), [output](upstream-experiments/contract-probes.log), [structured results and source hashes](upstream-experiments/contract-probe-results.json).

### 3. Codex: inspection only

Rust/Cargo was unavailable in this environment. Codex source and relevant tests/contracts were read; no Rust suite was built or run. Remote model internals are inaccessible from the open client. No Codex runtime-pass claim is made.

## What this means for AutoByteus

### Evidence-backed recommendation, not an approved design

The simpler conceptual contract is:

```text
previous checkpoint + newly compactable history
    -> one continuation checkpoint

next active context = required system context + checkpoint + retained recent context
```

This does not mean repeatedly shrinking the same summary toward nothing. It means maintaining a bounded rolling checkpoint as new work accumulates, retaining still-relevant old constraints and integrating new state. Repeated lossy summarization still risks drift.

**Prefer a single text/Markdown checkpoint when its consumer is another LLM.** A short section guide can preserve goal, user constraints, decisions, completed/active work, blockers, exact references and next action without requiring a rigid machine-parsed memory taxonomy. Plain text does not mean an unstructured vague paragraph.

**One JSON object would also be defensible if software genuinely needs to consume fields independently.** The question is not whether the LLM can reliably emit JSON. It is whether fields have a real consumer and lifecycle. If we immediately turn the fields back into one prompt string, a required six-array semantic/episodic detour adds parsing/normalization/projection obligations without an established need. Runtime persistence can still be JSON with a `summary` string and host-owned IDs/boundaries/usage; the LLM need not author that metadata.

**Compaction and long-term memory may coordinate, but should have different contracts.** A continuation checkpoint can contain an event, fact or preference without becoming an episodic/semantic memory database. Reusable memory across sessions has additional selection, retrieval, update/conflict, retention and scope requirements. A separate memory service may inspect a pre-compaction transcript when configured, but it need not be the mandatory representation through which prompt compaction works.

### Keep the safety mechanisms; simplify the intermediate representation

Useful lessons to preserve or evaluate in AutoByteus:

1. Protect required system/developer instructions, live user intent, recent context and complete tool protocols.
2. Give previous checkpoint + newer work clear precedence rules; replace the old checkpoint rather than accumulate stale summaries.
3. Reject empty, failed and truncated summaries before committing; verify the replacement actually frees budget including framing.
4. Keep context installation coherent and recoverable, with source-range provenance and source evidence available where policy permits.
5. Prevent the compactor from accidentally continuing the original task or executing historical instructions; history is source material.
6. Budget the summarizer input itself; changing JSON to text does not solve an oversized helper prompt or recursive compactor invocation.
7. Evaluate cheap tool-output pruning separately from lossy whole-context summarization.

These are recommendations and evidence, not a selected production architecture. The earlier AutoByteus analysis remains the source for the six-array -> episodic/semantic -> single-message cycle and its independent Inspector readers.

## Limits and next useful evaluation

No experiment here compares actual LLM-generated JSON versus Markdown for factual retention, cost, latency or long-run success. Passing fixtures prove selected contracts and guards, not superior summarization quality. No broad claim is made that the upstream applications have no memory features, or that their default-branch complexity is small.

A later quality experiment should use representative synthetic/consented task histories, the same model and comparable token budgets, and at least two or three compaction rounds. Check durable constraints, newest user intent, resolved-vs-pending status, file/symbol references, tool-protocol integrity, actual continuation success, token reduction and restart recovery. Use explicit expected facts and forbid silently inventing next work. This research did not need production data or paid API use.

## Canonical context, unresolved product decisions and route

- Requirements: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/requirements-doc.md` — Draft, no full baseline approval.
- Investigation: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/investigation-notes.md`.
- Prior/current AutoByteus assessment: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/analysis-report.md`.
- Revision history: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/solution-revision-record.md` — SR-001 conceptual intent, SR-002 upstream evidence.
- This result: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/upstream-compaction-research.md`.
- Reproducibility supplement: `/Users/normy/autobyteus_org/autobyteus-worktrees/context-compaction-simplification-analysis/tickets/in-progress/context-compaction-simplification-analysis/upstream-experiments`.
- External read-only prior redesign: `/Users/normy/autobyteus_org/autobyteus-worktrees/memory-compaction-file-backed-redesign/tickets/in-progress/memory-compaction-file-backed-redesign/`; it is not edited or superseded by this research.
- Open decisions remain `DEC-002` old data/Inspector/API continuity and `DEC-003` relationship to the earlier three-output file-backed redesign. They do not block returning the requested research and are not approval requests in this result.
- `design-spec.md`, architecture review, implementation/code review, API/E2E delivery and Product Design artifacts: **N/A — not applicable** to this research-only round.
- Task size/architectural risk: N/A — no completed target design to classify.
- Next expected action: return comparative findings to the user. If the user requests a product change next, finalize the relevant behavior/continuity scope and approval before authoritative design; do not reconfirm the already-clear core conceptual distinction.
- Routing: `get_handoff_rules` checked after result persistence on 2026-09-26. Returned conditions cover Architecture Design Complete (review/direct implementation) or a delivery receipt evidence gap. None matches this evidence-only/Draft result; no specialist message sent. Return the requested research directly to the user.
