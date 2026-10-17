# Summary output approach comparison (SR-013 proposal)

Status: **Ready for Approval** (proposed 2026-10-11, Solution Designer). Owner of the choice: the user, based on the comparison report.

## Why

The user, 2026-10-11: "it is really something that has to be … tested … try different approaches … do we use like a compaction summary … enclosed in this or it's better to use write file … just write also directly to a file … update your design to try different approaches … ask an implementation engineer to try different approaches and then to evaluate the results … this ticket is no longer just … one approach … do some kind of comparison based on the result. Then we choose one."

Round 3 showed that the way the summary comes back, and not only its content, depends on the model. Sonnet 5 and DeepSeek dropped the wrapper lines (F-6). Today's design picked one approach without measuring the alternatives.

## Approaches to compare

Every approach keeps the cache prefix intact: the same system prompt, the same tools and the same messages, plus one appended user message.

| ID | Approach | How the summary comes back | Expected strength | Expected risk |
| --- | --- | --- | --- | --- |
| E1 | **Wrapper lines + tolerant parser** (SR-011, baseline) | Text reply in `<compaction_summary>` or only the nine headings | Simple; works on every provider | Depends on the model following text format instructions |
| E2 | **`write_file` to a given path** | The agent calls its existing `write_file` tool with the note; the content is read back and parsed | Tool calls are trained heavily; the note is kept on disk | Needs a path convention and cleanup in the workspace; the model must call exactly once with the right path |
| E3 | **A dedicated handover-note tool, always in the tool list** | The agent calls a tool such as `record_handover_note` with the nine sections as schema fields | Structured output with no text parsing; the tool is in the cached prefix from the first request | The agent might call it during normal work; the tool is visible in every request |
| E4 | **E3 with a forced call** (`tool_choice` / the provider's equivalent) | Forced tool call | Most reliable format | On Anthropic, changing `tool_choice` invalidates the cached messages; this is measured, not assumed |

Per-model prompt wording is not one of the approaches here; it stays with the follow-up Task.

## How it is run

- **Who:**
  - The implementation engineer builds E2–E4 as variants in the evaluation harness (`api-e2e-evidence/ac003/ac003-compare.test.ts`, extended), on the product's real LLM classes and adapters.
  - The losing variants never enter product code. Only the chosen approach is designed, reviewed and implemented afterwards.
- **Models:** Claude Opus 5.5, Claude Sonnet 5, DeepSeek v4 Flash, Gemini 3.8 Flash.
- **Histories:** A (464k tokens) and B (195k tokens), the same as AC-003.
- **Repeats:** 3 summary attempts per approach × model × history, to measure how reliably the format comes back, plus one continuation check per cell.
- **E3 extra check:** a few normal live agent runs with the tool present, to see whether the agent calls it at the wrong time.
- **Estimated provider cost:** about $15–30 in total. Most of it is Opus on history A; the cached reads keep it low.

## What is measured, per approach × model

1. Accepted summaries out of the attempts (format reliability).
2. Cache read share and cost of the summary call.
3. The AC-003 quality checklist, including gap A (an unchecked claim stated as fact), gap B, files listed with full paths, and no system-prompt restatement.
4. The continuation: current state, earlier decisions, no redone work, correct paths.
5. Side effects: unwanted tool calls (E3), stray files (E2), and provider errors.

## Output and decision

- **Report:** the implementation engineer writes `summary-output-approach-comparison-report.md` with a results table per approach × model, the verbatim summaries and the raw data.
- **Recommendation:** the Solution Designer evaluates the report and recommends one approach, or one per model if the data clearly shows that.
- **Choice:** the user chooses.
- **After the choice:**
  - the design is revised for the chosen approach (SR-014) and reviewed, then implemented, code-reviewed and validated;
  - the catalog setting `compactionSummaryMode` can carry a per-model choice if needed.
- **Scope of this ticket and the follow-up:**
  - If E1 wins, SR-011 stands as it is.
  - Per-model prompt tuning and the gap-A quality work stay in the follow-up Task, unless the chosen approach already fixes gap A.
