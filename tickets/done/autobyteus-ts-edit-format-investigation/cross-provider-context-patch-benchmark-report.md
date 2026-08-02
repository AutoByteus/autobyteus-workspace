# Cross-Provider Context-Patch Benchmark Report

Date: 2026-08-02  
Repository/package: `autobyteus-workspace-superrepo` / `autobyteus-ts`  
Task branch: `codex/autobyteus-ts-edit-format-investigation`  
Baseline: `origin/personal` at `4b29481d5b6eaea64aebb20abcb5e4d784ea1178`

> **Later approved tool-surface refinement:** The benchmark facts below remain authoritative, including the strong exact-replacement result. After reviewing the available tools, the user deliberately contracted the active file-oriented surface to `read_file`, `edit_file`, `write_file`, and `run_bash`. `replace_in_file` and `insert_in_file` are therefore removed in the approved requirements; their successful benchmark results are retained as historical mechanism evidence, not a retention requirement.

## Decision Summary

The investigation supports removing numeric line coordinates from the **semantic contract** of `edit_file`, but it does not support rejecting every numeric-looking hunk string.

The recommended contract is:

1. The documented, model-facing patch form starts each hunk with a bare `@@`.
2. Every hunk is located only by its unchanged/removal text, which must identify exactly one eligible location.
3. The parser rejects no-anchor, no-match, ambiguous, malformed, and no-change hunks without writing the file.
4. If a model nevertheless decorates the header as `@@ -N[,N] +N[,N] @@`, the parser discards those numbers and applies the same unique-context rule. The values never select or disambiguate a location.
5. Git file headers and Codex `*** Begin Patch` / `*** Update File` envelopes are not part of this tool argument because `path` is already a separate argument.
6. Exact replacement/insertion are not merged into patch parsing. Under the later approved catalog contraction, those dedicated tools are removed; narrow changes use context hunks and any shell/write alternative is selected explicitly rather than invoked as a fallback.

This is a clean semantic removal of line-number positioning with a narrow input normalization for model noise—not two competing patch engines.

## Why Absolute Numeric Rejection Is Not Recommended

With only the production tool schema describing bare context hunks and no reinforcing system instruction:

- DeepSeek V4 Flash used bare `@@` on 12/12 first edits.
- GPT-5.6-sol used bare `@@` on 12/12 first edits.
- Gemini 3.5 Flash used bare `@@` on 9/12 first edits, but emitted numeric-decorated headers on all three `late_insertion` trials.

When those three Gemini numeric-decorated outputs were rejected, Gemini recovered and all final files were correct, but first-application success was only **9/12**. When the same numeric-decorated headers were normalized and their coordinates ignored, Gemini achieved **12/12 first-application and 12/12 exact-final success**. All three normalized trials were still located solely through unique context.

Therefore:

- removing numeric coordinates as required model output: supported;
- removing numeric coordinate semantics: supported;
- treating numeric decoration as an immediate error: contradicted by the Gemini result.

## Live Benchmark Method

### Runtime and models

The benchmark used the repository-owned AutoByteus native agent/runtime path and live model registrations imported into an isolated test database:

- `deepseek-v4-flash`
- `gemini-3.5-flash`
- `gpt-5.6-sol`

Provider-specific thinking configuration was mapped by the harness:

- DeepSeek: `thinking_type=enabled`, `reasoning_effort=high`
- Gemini: `thinking_level=high`
- GPT: `reasoning_effort=high`

Temperature was zero. The benchmark used API tool calls, not a hand-authored simulation of model output. Secret values were never copied into output artifacts.

### Scenarios and scoring

Each run used a disposable workspace with one target file and an untouched sentinel file.

| Scenario | Purpose |
| --- | --- |
| `small_exact` | One scalar replacement. |
| `multiline_config` | Two separated YAML edits while preserving unrelated content. |
| `repeated_target` | Select one named block where the edited literal appears more than once. |
| `late_insertion` | Edit near the end of a file after 36 preceding lines. |

The harness recorded the first mutation tool and patch dialect, first-edit application result, exact final bytes, sentinel preservation, failure/recovery events, duration, LLM-call count, and provider token-usage events.

### Contract variants

- **Current numeric**: current baseline production schema/parser.
- **Explicit context**: production context schema plus a system instruction repeating bare-`@@` syntax.
- **Schema-only context**: production context schema with only a neutral instruction to use `edit_file`.
- **Generic schema**: deliberately underspecified `patch` argument, used to observe vendor priors rather than recommend a product contract.
- **Exact replacement**: Gemini uses `replace_in_file` with exact `old_text` / `new_text`.

## Results

### Main comparison

| Model / cohort | Runs | First application | Exact final | First patch formats | Tool failures | Sentinels preserved |
| --- | ---: | ---: | ---: | --- | ---: | ---: |
| DeepSeek V4 Flash, current numeric | 20 | 20/20 | 20/20 | 19 numeric; 1 bash | 0 | 20/20 |
| Gemini 3.5 Flash, current numeric | 20 | 20/20 | 20/20 | 20 numeric | 0 | 20/20 |
| GPT-5.6-sol, current numeric pilot | 4 | 4/4 | 4/4 | 4 file-header diffs | 0 | 4/4 |
| DeepSeek V4 Flash, explicit context | 20 | 20/20 | 20/20 | 20 bare | 0 | 20/20 |
| Gemini 3.5 Flash, explicit context | 20 | 20/20 | 20/20 | 20 bare | 0 | 20/20 |
| GPT-5.6-sol, explicit context | 20 | 20/20 | 20/20 | 20 bare | 0 | 20/20 |
| DeepSeek V4 Flash, schema-only context | 12 | 12/12 | 12/12 | 12 bare | 0 | 12/12 |
| Gemini 3.5 Flash, schema-only + strict numeric rejection | 12 | 9/12 | 12/12 | 9 bare; 3 numeric | 3 | 12/12 |
| Gemini 3.5 Flash, schema-only + numeric normalization | 12 | 12/12 | 12/12 | 9 bare; 3 numeric | 0 | 12/12 |
| GPT-5.6-sol, schema-only context | 12 | 12/12 | 12/12 | 12 bare | 0 | 12/12 |
| Gemini 3.5 Flash, exact replacement | 12 | 12/12 | 12/12 | N/A | 0 | 12/12 |

The explicit context cohort is the balanced cross-provider comparison: **60/60 first-application success, 60/60 exact-final success, and 60/60 sentinel preservation**, with every model emitting the documented bare form.

The current numeric baselines were already strong under explicit numeric instructions, so this experiment does not claim that context patches numerically outperform every current baseline. It shows that the simpler context contract reaches the same observed ceiling while eliminating the reported DeepSeek incompatibility and the need to calculate meaningful line coordinates.

### Underspecified-schema diagnostic

The generic-schema pilot shows why AutoByteus cannot depend on one unstated vendor convention:

| Model | Runs | First application | Exact final | First-output dialect |
| --- | ---: | ---: | ---: | --- |
| DeepSeek V4 Flash | 4 | 4/4 | 4/4 | 4 bare context hunks |
| Gemini 3.5 Flash | 4 | 1/4 | 4/4 after recovery | 3 SEARCH/REPLACE blocks; 1 numeric hunk |
| GPT-5.6-sol | 4 | 0/4 | 4/4 after recovery | 4 complete Codex patch envelopes |

The GPT failures here do not mean GPT cannot use the context contract: GPT followed the production schema with bare hunks on **32/32** first edits across the explicit and schema-only context cohorts. The generic pilot instead demonstrates that the tool schema must state the accepted grammar clearly.

## Relationship To Codex, Gemini CLI, And DeepSeek Harnesses

### Codex

The public Codex `apply_patch` format uses a custom outer envelope (`*** Begin Patch`, `*** Update File: ...`) and inner hunks whose header can be bare `@@` or carry textual context. Its application logic searches for context sequences rather than requiring numeric unified-diff positions. Sources: [official Codex apply-patch instructions](https://github.com/openai/codex/blob/main/codex-rs/core/prompt_with_apply_patch_instructions.md), [parser](https://github.com/openai/codex/blob/main/codex-rs/apply-patch/src/parser.rs), and [application logic](https://github.com/openai/codex/blob/main/codex-rs/apply-patch/src/lib.rs).

AutoByteus should align with the useful **inner context-hunk principle**, not copy Codex's complete envelope. `edit_file` already supplies the target path separately, so duplicating it inside `*** Update File` would create a second source of truth. The proposed unique-match rule is also deliberately stricter than Codex's first-match behavior on repeated context.

### Gemini CLI

The public Gemini CLI harness primarily exposes exact string replacement (`old_string` / `new_string`) plus whole-file write, rather than a numeric unified-diff tool. Its replace operation expects one occurrence by default. Sources: [official file-system tools documentation](https://github.com/google-gemini/gemini-cli/blob/main/docs/tools/file-system.md) and [tools reference](https://github.com/google-gemini/gemini-cli/blob/main/docs/reference/tools.md).

The live AutoByteus result—12/12 first and final for Gemini exact replacement—matches the public Gemini harness shape and proves the mechanism was capable. The later user decision nevertheless removes the dedicated tool to reduce the AutoByteus surface because the improved context patch and explicit Bash cover the required operations. This product simplification does not justify eliminating the multi-line/multi-hunk `edit_file` contract.

### DeepSeek

DeepSeek's public V4 report describes DSML/XML-style tool invocation and an internal agent harness with bash plus a file-edit tool, but it does not disclose the file-edit argument grammar. The benchmark therefore does not claim to have reconstructed a proprietary DeepSeek patch standard. It establishes directly that DeepSeek V4 Flash strongly prefers bare context hunks when the schema is generic and follows the explicit context schema reliably.

## Experimental Parser Safety And Performance

The experiment replaced the numeric-position implementation with one authoritative context matcher. For each hunk it:

1. derives the expected old sequence from unchanged and removal lines;
2. searches the still-unconsumed target region;
3. requires exactly one match;
4. applies all hunks in memory;
5. writes only after every hunk succeeds.

Focused coverage verifies rejection of ambiguous matches, missing context, anchorless pure insertion, unsupported file headers, malformed/no-change hunks, and partial multi-hunk writes. Exact matching is attempted first, followed by the existing whitespace-tolerant retry. Path resolution and protected-path boundaries remain outside and unchanged.

The first million-line microbenchmark exposed a JavaScript call-stack overflow from spreading a very large slice into `Array.push`. Replacing that spread with iterative append removed the failure. Post-fix mean application time over the retained local probe was:

| Target size | Mean application time |
| ---: | ---: |
| 10,000 lines | 0.151 ms |
| 100,000 lines | 1.947 ms |
| 1,000,000 lines | 18.810 ms |

These are local parser measurements, not end-to-end agent latency guarantees.

## Validation State

- `pnpm build`: passed, including runtime dependency verification.
- Affected focused selection: **74/74 passed** (73 parser/edit/schema/streaming/path tests plus the relevant approval-flow `edit_file` case).
- A broader combined selection was 76/78; its two failures were pre-existing assertions in unrelated `write_file`/`read_file` approval-flow cases and reproduce on a detached baseline worktree.
- Full unit suite: 1,794 passed and 5 failed across 333 files. All five failures reproduce unchanged on baseline `4b29481d5` in untouched event-count and legacy parsing-streaming tests.
- The two unrelated approval-flow failures also reproduce on a detached baseline worktree.
- `git diff --check`: passed.

The exact source/test experiment remains uncommitted in the dedicated task worktree as evidence only. Its self-contained pre-SR-002 context-patch diff—including the new semantic owner and direct tests—is retained at `benchmark/experimental-clean-cut-context-patch.patch`. It was verified to apply, build, and pass 74/74 affected checks from baseline `4b29481d5`; it does not implement the later exact-tool catalog removal and is not the reviewed final target.

## Limitations

- The live corpus is deterministic and bounded, not a full SWE-bench evaluation.
- Provider behavior and registered model implementations can drift after the recorded date.
- The GPT numeric baseline is a four-run pilot, while the main context comparison is 20 runs per model.
- The experiment does not accept complete git diffs, Codex outer envelopes, Gemini SEARCH/REPLACE blocks, or optional Codex textual hunk headers. No production-schema benchmark output required those grammars.
- Unique context avoids silent wrong-location edits but can reject a valid intent until the model supplies more context.
- Concurrent external modification between read and write remains governed by the existing file-tool behavior and is not solved in this task.

## Evidence Index

- Aggregate: `benchmark-evidence/cross-provider-context-summary.json`
- Explicit context, 20 runs/model: `benchmark-evidence/cross-provider-context-only-main.jsonl`
- Schema-only context with strict numeric rejection, 12 runs/model: `benchmark-evidence/cross-provider-context-only-neutral.jsonl`
- Gemini schema-only context with numeric normalization: `benchmark-evidence/gemini-context-normalized-neutral.jsonl`
- Gemini exact replacement: `benchmark-evidence/gemini35-replace-pilot.jsonl`
- Generic-schema diagnostic: `benchmark-evidence/cross-provider-generic-schema-pilot.jsonl`
- Current Gemini numeric baseline: `benchmark-evidence/gemini35-current-numeric-main.jsonl` and `gemini35-current-numeric-pilot-v2.jsonl`
- Current GPT numeric pilot: `benchmark-evidence/gpt56sol-current-numeric-pilot.jsonl`
- Current DeepSeek numeric baseline: `benchmark-evidence/flash-thinking-reported-toolset-5x.jsonl`
- Parser microbenchmark: `benchmark-evidence/context-parser-local-microbenchmark.jsonl`
- Harness: `benchmark/deepseek-edit-benchmark.mjs`
- Aggregate generator: `benchmark/summarize-cross-provider-context-benchmark.mjs`
- Experimental source diff: `benchmark/experimental-clean-cut-context-patch.patch`
- Baseline reconstruction/build/test verification: `benchmark-evidence/experimental-clean-cut-artifact-baseline-verification.log`
- Final focused validation log: `benchmark-evidence/final-focused-validation.log`
- Final affected-only validation log: `benchmark-evidence/final-affected-tests.log`
