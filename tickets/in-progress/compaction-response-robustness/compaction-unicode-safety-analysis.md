# Compaction Unicode Safety Analysis

## Status

Verified root cause and approved intended behavior, 2026-08-15.

## Scope

This supplement records the live failure in which a valid parent trace could not be sent to the compactor because the derived conversation-history renderer split one Unicode surrogate pair while omitting the middle of a long value. It defines the narrow safety boundary for provider-facing compaction text. It does not change the compactor's response schema, memory categories, persistence contract, trigger formula, or retry policy.

Related behavior and requirements: BEH-011; REQ-016; AC-024–AC-026.

## Observed Runtime Failure

- Parent run: `daily_assistant_2a39c68eb96443ada6f5af9f4f81acef`
- Parent turn: `turn_0001`
- Operation: `compaction_operation_mstvdkn4_1`
- Child run: `memory_compactor_c7436219af804d759223edf4f4feef85`
- Compactor input: 540,727 UTF-16 code units reported by the runtime
- Provider: DeepSeek model identifier `deepseek-v4-flash`
- Provider result: HTTP 400 before inference
- Host result: `runner_error_completion`
- Provider message: `messages[1].content: unexpected end of hex escape at line 1 column 40410`

The 20% setting correctly triggered the operation: the parent prompt was 371,352 tokens, the input budget was 615,744, the proactive threshold was 123,148, and the planned post-compaction target was 110,833. The failure was unrelated to context capacity or compactor response JSON because no model response was produced.

## Exact Causal Chain

1. The parent raw tool-result trace contains valid source text with `icon: '🛡️'` (`🛡️`).
2. `CompactionConversationHistoryRenderer` renders long message and tool values through `ReadableValueRenderer` with `CompactionPolicy.maxItemChars` (default 2,000).
3. `ReadableValueRenderer.omitMiddle` calculates head and tail lengths with JavaScript `String.length` and applies `String.slice` at arbitrary UTF-16 code-unit offsets.
4. The selected head boundary landed between the high and low surrogate of the shield character.
5. The omission marker was inserted after the high surrogate, producing derived text equivalent to `icon: '\uD83D… [677 characters omitted] …`.
6. The OpenAI-compatible request serializer represented the lone surrogate as `\ud83d` in `messages[1].content`.
7. DeepSeek's HTTP request parser rejected the request before model inference.
8. The revised runner path correctly transported the error as `runner_error_completion`, created no JSON-repair child, stopped the target-agent turn, and left the runtime available. Repeating the same pending operation with the same build would deterministically rebuild the malformed prompt.

## Classification

This is a local implementation defect in derived compaction-input presentation, not a model refusal, invalid compaction response, provider context-limit failure, or transient provider outage. The provider rejection is the correct consequence of the malformed request content it received.

The failure also demonstrates that output-format simplification alone would not solve provider-bound text safety. Plain Markdown, a one-field envelope, and the existing six-array envelope all require a well-formed input string.

## Approved Safety Boundary

The user approved making generated conversation history as safe as reasonably possible. The proportionate boundary is:

- Preserve raw traces, archived traces, tool payloads, and canonical memory unchanged.
- Sanitize only the derived text sent to the compactor.
- Preserve valid Unicode, including non-English languages, filenames, source code, symbols, and valid emoji. Do not reduce content to ASCII or add an emoji-classification subsystem.
- Normalize malformed UTF-16 to well-formed Unicode in the rendered copy.
- Remove C0/DEL control characters that have no useful compaction meaning, while preserving normalized newlines and horizontal tabs.
- Make middle and end truncation incapable of splitting a surrogate pair. A head boundary may move left by one UTF-16 unit and a tail boundary may move right by one; omission accounting must reflect the actual retained boundary.
- Apply the same safe end-truncation primitive to compactor-produced fact/episode clamps because those strings can enter a future provider prompt.
- At the completed operation-prompt boundary, require well-formed text before launching the child. A narrow final normalization may replace any pre-existing lone surrogate in old or external text with U+FFFD without mutating its source record.

## Recommended Minimal Design

Add one tightly owned utility under memory presentation, for example `unicode-safe-text.ts`, with operations equivalent to:

- `toProviderSafeText(value)` — normalize line endings, replace lone surrogates with U+FFFD, and remove disallowed controls from a derived copy.
- `sliceEndWithoutSplittingSurrogate(value, end)` — return an end boundary that cannot leave a high surrogate without its low surrogate.
- `sliceStartWithoutSplittingSurrogate(value, start)` — return a start boundary that cannot begin with the low half of a pair.
- `truncateEndProviderSafe(value, limit)` and `omitMiddleProviderSafe(value, limit)` — use the boundary helpers and remain within the configured limit.

`ReadableValueRenderer` remains the owner of redaction, serialization, omission-marker wording, and display limits; it delegates only Unicode boundary/sanitization mechanics. `CompactionResponseParser` reuses safe end truncation rather than retaining a separate unsafe `slice(0, limit)`. `WorkingContextCompactionPromptBuilder` applies the final provider-safe normalization/assertion to the complete derived task prompt.

Do not add a retry, remove all emoji, mutate raw traces, catch and hide arbitrary request errors, or special-case the shield character.

## Direct Coverage

1. A valid emoji placed exactly across the middle head boundary remains complete or is wholly omitted; the result has no unpaired surrogate and stays within the configured limit.
2. The same assertion covers the tail boundary, a supplementary-plane letter/symbol, a variation selector sequence, and valid German/Chinese text.
3. An old/pre-existing lone high or low surrogate in a source value becomes U+FFFD only in the rendered copy; the input value remains byte-for-byte/string-code-unit unchanged.
4. NUL and other disallowed C0/DEL controls are absent from the rendered copy; newline and tab remain readable.
5. The exact captured shield tool result produces a task prompt that is well formed, survives request `JSON.stringify`/strict JSON parsing, and contains no lone surrogate.
6. Compaction response text clamped at an emoji boundary remains well formed and can be projected into a later request.
7. Ordinary ASCII, non-English Unicode, delimiter escaping, credential redaction, omission-marker behavior, and exact no-truncation rendering remain unchanged.
8. A local invariant failure before child launch is typed as input construction/validation, not JSON response failure; no correction child or canonical-memory mutation occurs.

## Persisted-Data Decision

`Directly Usable — No Migration`.

The valid original shield emoji remains in the parent raw trace. The lone surrogate exists only in the generated child prompt trace for the failed operation. After the code fix, retrying from the original selected traces regenerates a safe prompt. Existing episodic, semantic, lineage, working-context, and raw-trace files require no rewrite.

## Evidence

- `evidence/compaction-unicode-request-rejection.png`
- `evidence/compaction-unicode-request-rejection-log.txt`
- `evidence/compaction-unicode-truncation-proof.json`
- Parent raw trace: `/Users/normy/.autobyteus/server-data/memory/agents/daily_assistant_2a39c68eb96443ada6f5af9f4f81acef/raw_traces_active.jsonl`
- Child raw trace: `/Users/normy/.autobyteus/server-data/memory/agents/memory_compactor_c7436219af804d759223edf4f4feef85/raw_traces_active.jsonl`
- Source: `autobyteus-ts/src/memory/presentation/readable-value-renderer.ts`
- Additional affected clamp: `autobyteus-ts/src/memory/compaction/compaction-response-parser.ts`
