# DeepSeek V4 File-Edit Investigation And Benchmark Report

Date: 2026-08-02
Repository: `autobyteus-workspace-superrepo` / `autobyteus-ts`
Branch: `codex/autobyteus-ts-edit-format-investigation`
Baseline: `origin/personal` at `4b29481d5b6eaea64aebb20abcb5e4d784ea1178`

> **Cross-provider update:** This report remains authoritative for the DeepSeek-only reproduction and 165-run mechanism study. Its earlier additive-compatibility recommendation was subsequently refined by live Gemini Flash and GPT experiments. The current cross-provider decision evidence is in `cross-provider-context-patch-benchmark-report.md`: make bare `@@` context hunks canonical, remove numeric coordinates from matching semantics, and normalize numeric-decorated headers as ignorable model-output noise so Gemini does not lose first-call reliability.
>
> **Later tool-surface update:** Exact replacement/insertion benchmark results remain factual, but the user subsequently approved removing `replace_in_file` and `insert_in_file`. The target file-oriented surface is `read_file`, `edit_file`, `write_file`, and `run_bash`; the exact-tool cohorts are historical comparison evidence only.

## Executive Finding

The supplied failure is a **model/tool-contract mismatch**, not JSON tool-call corruption and not a filesystem failure.

DeepSeek V4 Flash emits a context-only diff hunk beginning with a bare `@@`. That is a recognizable concise patch convention, but it is **not** a valid numeric unified-diff hunk header. AutoByteus currently accepts only headers matching `@@ -oldStart[,oldCount] +newStart[,newCount] @@`, so it rejects the otherwise usable old/context/new lines before trying to locate them.

The live causal ablation reproduced the screenshots:

- With the current numeric hunk guidance, DeepSeek V4 Flash thinking mode had **20/20 first edit applications succeed**, **20/20 exact final files**, and no unintended sentinel edits.
- With the older/generic schema wording, the same model, tasks, tools, and runtime emitted bare `@@` on **12/20** first edits. All 12 failed with `Malformed hunk header: '@@'`; first-application success fell to **8/20**.
- In non-thinking mode, the generic schema produced bare `@@` on **12/12** first edits and first-application success fell to **0/12**. Current numeric guidance produced **12/12** first-application success.
- An investigation-only parser extension that accepts only **uniquely anchored** bare hunks restored **20/20** first-application and final-file success, including all 12 bare-hunk trials, with zero tool failures and zero unintended edits. Ambiguous bare hunks and anchorless insertions were covered by focused rejection tests.

The highest-confidence DeepSeek-only direction at this stage was layered:

1. add safe context-only `@@` handling inside the existing `edit_file` semantic owner, requiring a unique exact contextual match and rejecting ambiguity/no-anchor cases;
2. retain the exact replacement/insertion measurements as evidence while deciding the final tool portfolio separately;
3. do not make whole-file rewrite, shell mutation, manual XML tool calling, or provider `strict` mode the primary fix.

The later cross-provider matrix changed the treatment of numeric headers: they should no longer be the canonical contract or provide positioning semantics. A numeric-decorated header may be normalized to the same context hunk because strict rejection reduced Gemini schema-only first-application success from 12/12 to 9/12.

The initial additive extension was benchmarked, saved as an evidence patch, and reverted. A later clean-cut context implementation used for the cross-provider study remains uncommitted in the dedicated task worktree as evidence only. Its self-contained retained patch is baseline-verified but predates the later exact-tool removal and is not the reviewed final implementation.

## What Syntax Is DeepSeek Producing?

There are two distinct syntax layers.

### Patch payload syntax in the screenshots

This payload:

```diff
@@
-old line
+new line
```

is a **context-only diff hunk**: `@@` delimits the hunk, while the ` `, `-`, and `+` prefixes describe context, removal, and addition. It resembles model-oriented apply-patch formats, but it omits the source/destination ranges required by standard unified diff. AutoByteus's current regular expression at `autobyteus-ts/src/utils/diff-utils.ts:8` and rejection at `:90-93` require numeric ranges, so the screenshots fail deterministically.

It is not malformed JSON. The function-call envelope was parsed successfully, the correct tool was dispatched, `path` and `patch` arrived intact, and only the semantic parser rejected the patch string.

### DeepSeek's native tool-call encoding

DeepSeek V4's technical report describes a tool-call schema using a special `|DSML|` token and XML-based invocation, selected partly to reduce escaping errors. It also says the internal code-agent evaluation framework uses a minimal tool set consisting of bash and a file-edit tool, but it does **not** disclose the edit tool's argument grammar. Source: [DeepSeek-V4 technical report](https://arxiv.org/html/2606.19348v1#S5.SS1.SSS1) and [agent evaluation section](https://arxiv.org/html/2606.19348v1#S5.SS2).

The AutoByteus XML pilot independently observed DSML-like output such as `DSML tool_calls`, while AutoByteus API mode received normal OpenAI-compatible structured tool-call deltas. This means the JSON visible in the screenshots is the appropriate API representation; switching the whole runtime to manual XML is not necessary to obtain DeepSeek's provider-native function calling.

## Current Production Path

1. `DeepSeekLLM` extends `OpenAICompatibleLLM`, targets `https://api.deepseek.com`, and normalizes thinking options (`autobyteus-ts/src/llm/api/deepseek-llm.ts:28-56`).
2. Current model identifiers are independently registered as `deepseek-v4-flash` and `deepseek-v4-pro` (`autobyteus-ts/src/llm/supported-model-definitions.ts:350-372`). Both were called live; neither is represented as an alias for the other.
3. API tool-call mode builds OpenAI-compatible function schemas and uses the API streaming handler (`autobyteus-ts/src/agent/streaming/handlers/streaming-handler-factory.ts:56-69`).
4. The schema formatter passes each tool's name, description, and JSON Schema (`autobyteus-ts/src/tools/usage/formatters/openai-json-schema-formatter.ts:11-24`). Object schemas disallow extra properties, but strict mode is intentionally not enabled (`openai-tool-schema-normalizer.ts:1-8,54-68`).
5. `edit_file.patch` currently tells the model to use numeric headers, including `@@ -10,7 +10,8 @@` (`autobyteus-ts/src/tools/file/edit-file.ts:11-22`). This wording was introduced on 2026-04-08 in commit `83ef68785`.
6. `edit_file` reads one existing file, invokes `applyUnifiedDiff` with bounded line/whitespace retries, and writes only after successful application (`edit-file.ts:34-89`).
7. `applyUnifiedDiff` requires the numeric header regex, extracts expected old/context lines, and searches only near the claimed old start under the configured fuzz (`diff-utils.ts:8,90-172`).
8. Exact alternatives already exist as `replace_in_file` and `insert_in_file`, and full overwrite/shell paths exist as `write_file` and `run_bash`.

The Product Prototyper configuration corresponding to the screenshots exposes `edit_file`, `read_file`, `write_file`, and `run_bash`, but not `replace_in_file` or `insert_in_file`: `/Users/normy/autobyteus_org/autobyteus-agents/agents/product-prototyper/agent-config.json:2-18`. Consequently, the current error's recommended exact-edit recovery tools are unavailable to that agent; its visible fallback is whole-file write or shell.

## Environment And Secret Hygiene

- The user-supplied environment was imported with `pnpm secrets:import` into the worktree-local ignored database `autobyteus-server-ts/db/test.db`.
- The benchmark initializes `repository_prisma` against that exact database URL before initializing the secret vault. Two setup pilots omitted this Prisma initialization and were correctly excluded as harness-configuration failures; no provider request occurred in them.
- No secret value is printed, copied into the ticket, or included in JSONL evidence. The database and adjacent root-key file are ignored and are not task artifacts.
- Provider-reported usage, non-secret tool arguments, fixture contents, results, and errors are retained.

## Benchmark Protocol

### Corpus

Each disposable workspace contained one target and an untouched sentinel. Exact byte equality and sentinel preservation were validated after every run.

| Scenario | Purpose |
| --- | --- |
| `small_exact` | One-line scalar replacement. |
| `multiline_config` | Two separated YAML changes while preserving unrelated sections. |
| `repeated_target` | Change one named block where the literal value occurs multiple times. |
| `late_insertion` | Insert near the end of a file after 36 preceding exported lines, exercising shifted/late line numbers and newline preservation. |

### Mechanisms and ablations

- current `edit_file` schema and parser;
- generic/legacy `edit_file` schema, recreating the pre-2026-04-08 wording;
- investigation-only unique-context bare-`@@` parser compatibility;
- `replace_in_file` exact replacement;
- `write_file` whole-file output;
- `run_bash` shell mutation;
- current portfolio including exact replacement/insertion;
- the reported Product Prototyper-like portfolio without exact replacement/insertion;
- API and one bounded XML/DSML pilot;
- thinking-enabled/high and non-thinking Flash; thinking-enabled/high Pro.

### Scoring

- schema-valid tool call: runtime emitted a parsed tool-start event;
- first edit application: the first editing invocation received a success rather than failure event;
- exact final success: target bytes exactly matched the expected fixture and the sentinel remained unchanged;
- recovery: an earlier tool failure occurred before an exact final success;
- latency, LLM-call count, input/output/reasoning tokens, and estimated catalog cost;
- raw tool arguments and failure categories.

Primary safety/reliability threshold: at least **19/20 first-application and exact-final success** on the Flash thinking matrix, no unintended sentinel mutation, and deterministic focused rejection of ambiguous or anchorless context-only hunks.

### Scale

The retained evidence contains **165 valid live scored runs** across the main matrices and XML pilot. The aggregate comparison below uses the labeled selections in `benchmark-evidence/selected-run-summary.json`. The two invalid secret-vault setup pilots are preserved for audit but excluded; a successful one-run API pilot duplicated a later matrix and is also excluded from the 165 count.

## Key Results

### Causal schema/parser matrix

| Model / mode | Contract | Runs | First application | Exact final | Bare first hunks | Tool failures | Avg duration | Est. avg cost |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: |
| V4 Flash, thinking/high | Current numeric schema/parser | 20 | 20/20 | 20/20 | 0 | 0 | 6.44 s | $0.000300 |
| V4 Flash, thinking/high | Generic schema/current strict parser | 20 | 8/20 | 20/20 | 12 | 12 | 7.48 s | $0.000349 |
| V4 Flash, thinking/high | Generic schema/experimental unique-context parser | 20 | 20/20 | 20/20 | 12 | 0 | 6.05 s | $0.000266 |
| V4 Flash, non-thinking | Current numeric schema/parser | 12 | 12/12 | 12/12 | 0 | 0 | 5.13 s | $0.000237 |
| V4 Flash, non-thinking | Generic schema/current strict parser | 12 | 0/12 | 12/12 | 12 | 12 | 6.83 s | $0.000312 |
| V4 Pro, thinking/high | Current numeric schema/parser | 12 | 11/12 | 12/12 | 0 | 1 | 8.56 s | $0.000839 |
| V4 Pro, thinking/high | Generic schema/current strict parser | 12 | 12/12 tool success | 11/12 exact | 0 | 0 | 7.22 s | $0.000697 |

The Pro legacy mismatch was not a bare-header failure: the model first removed the final newline, later performed the requested edit, and ended with a byte-level newline mismatch even though both tool calls returned success. This is why final-file validation is required in addition to tool success.

### Mechanism comparison

| Model | Mechanism | Runs | Exact final | Tool failures | Avg duration | Notes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| V4 Flash thinking | Strict current `edit_file` | 4 | 4/4 | 0 | 6.10 s | Numeric guidance; all exact. |
| V4 Flash thinking | Exact `replace_in_file` | 4 | 4/4 | 0 | 5.61 s | All exact. |
| V4 Flash thinking | Whole `write_file` | 4 | 4/4 | 0 | 4.87 s | Fast on small fixtures, but rewrites all content. |
| V4 Flash thinking | `run_bash` | 4 | 4/4 | 0 | 10.50 s | Slowest and highest estimated cost in the Flash pilot. |
| V4 Flash thinking | Full portfolio | 4 | 4/4 | 0 | 6.36 s | Chose `replace_in_file` 4/4. |
| V4 Flash thinking | Neutral full portfolio | 12 | 12/12 | 0 | 6.32 s | Chose `replace_in_file` 12/12. |
| V4 Pro thinking | Exact `replace_in_file` | 4 | 4/4 | 0 | 7.03 s | All exact. |
| V4 Pro thinking | Whole `write_file` | 4 | 4/4 | 0 | 7.02 s | All exact on small fixtures. |
| V4 Pro thinking | `run_bash` | 4 | 4/4 | 0 | 8.85 s | All exact, but shell is broader and slower. |

Whole-file write and shell can complete these bounded fixtures, but their 4-run samples do not establish safe behavior for large or concurrently changing files. Exact replacement was both model-preferred when exposed and narrow in mutation scope.

## Experimental Compatibility Result

The retained patch `benchmark/experimental-bare-hunk-compatibility.patch` changes only the patch applier and focused tests:

- accept a header only when `line.trim() === '@@'`;
- derive an expected old sequence from context/removal lines;
- search the remaining file for exact candidate locations;
- apply only when exactly one location matches;
- reject multiple matches with an ambiguity error;
- reject pure insertion with no context/removal anchor;
- preserve existing numeric header behavior and retry modes.

Focused test evidence: `benchmark-evidence/experimental-bare-parser-focused-tests.log` — 9/9 passed, including unique application, ambiguous rejection, and anchorless-insertion rejection.

Live evidence: 20/20 exact final success, 20/20 first-application success, no tool failures, and 20/20 sentinels unchanged. Twelve first calls used the formerly rejected bare syntax.

After evidence capture, both production source and test edits were reverted and `autobyteus-ts` was rebuilt. The worktree currently contains no unreviewed production-source change.

## What Can And Cannot Be Inferred About DeepSeek's Harness

### Supported by primary DeepSeek evidence

- V4 post-training uses DSML/XML-style tool invocation internally and supports tool-call conversations in thinking and non-thinking modes. [DeepSeek tool-calling docs](https://api-docs.deepseek.com/guides/tool_calls/) and [technical report](https://arxiv.org/html/2606.19348v1#S5.SS1.SSS1).
- DeepSeek's internal code-agent evaluation uses a minimal bash plus file-edit tool set. The report does not publish that edit tool's schema. [Technical report agent evaluation](https://arxiv.org/html/2606.19348v1#S5.SS2).
- Current public model identifiers are `deepseek-v4-flash` and `deepseek-v4-pro`; both support tool calls. [DeepSeek models and pricing](https://api-docs.deepseek.com/quick_start/pricing).

### Supported by an officially recommended public integration

DeepSeek's official integration page links Deep Code. Its public CLI uses read-generated snippet IDs plus exact `old_string`/`new_string` replacement, with read-before-edit, stale-file checks, occurrence guards, and ambiguity feedback—not strict unified diff. Source: [DeepSeek Deep Code integration](https://api-docs.deepseek.com/quick_start/agent_integrations/deepcode/) and the linked [Deep Code repository](https://github.com/lessweb/deepcode-cli).

This is evidence that a DeepSeek-oriented public harness deliberately adapts its tool contract to the model. It is **not proof** that DeepSeek's proprietary training harness uses the same snippet schema.

### Inference from this benchmark

Flash's strong tendency to emit bare `@@` under generic edit wording—60% in thinking mode and 100% in non-thinking mode—is consistent with a context-oriented patch prior. It does not identify the proprietary training tool. The safe conclusion is that AutoByteus should tolerate this observed, semantically recoverable output rather than assume numeric unified-diff ranges will always be produced.

## Why Other Candidate Fixes Are Not Primary

- **DeepSeek strict function mode:** it can improve JSON Schema adherence, but `patch` is a string. JSON strictness cannot prove that the string contains numeric hunk headers or semantically correct edits.
- **Manual XML/DSML everywhere:** one pilot succeeded and exposed DSML, but API tool calling already works and produced schema-valid calls in every retained run. The failure is inside `patch`, after transport parsing.
- **Prompt/schema only:** current guidance performs well, but the screenshot and ablation show a brittle boundary; compatibility makes the runtime robust when wording is absent, stale, diluted, or ignored.
- **Whole-file rewrite:** succeeds on small fixtures but increases clobber and token risk as files grow.
- **Shell mutation:** succeeds but is broader, harder to constrain semantically, and was slower/more expensive in the bounded pilots.
- **Replace unified diff entirely:** numeric diff works well on current Flash and Pro, supports contextual surgical edits, and should be preserved.

## Recommended Requirements Direction

This DeepSeek-only recommendation is superseded by the cross-provider report. The refined direction is:

1. Replace the numeric-position patch semantic owner with a provider-neutral unique-context owner.
2. Document bare `@@` as the only canonical model-facing header; do not ask models to calculate line numbers.
3. If a syntactically valid numeric-decorated header arrives, discard its coordinates and use the same unique-context matcher. Numeric values must never locate or disambiguate a hunk.
4. Require at least one old/context line and a unique match; deterministic ambiguity/no-match/no-anchor errors must not write.
5. Reject file headers and outer patch envelopes because `path` is supplied separately.
6. Preserve line-ending behavior, whitespace retry, path authorization, and write-after-full-application semantics.
7. Superseded by the later user decision: remove `replace_in_file` and `insert_in_file`; retain their cohort results only as historical mechanism evidence.

## Limitations

- Live samples are meaningful but not a full SWE-bench evaluation.
- Provider behavior can drift; exact model IDs, date, thinking mode, tool format, and raw evidence are retained.
- The corpus uses small deterministic text fixtures, not concurrent writers or very large files.
- Pro mechanism pilots have four runs per mechanism.
- The XML result is a one-run diagnostic, not a recommendation-quality comparison.
- DeepSeek does not publicly document its proprietary file-edit argument schema; any stronger reconstruction claim would be speculation.

## Evidence Index

### Reproduction and comparison

- `benchmark-evidence/flash-thinking-reported-toolset-5x.jsonl`
- `benchmark-evidence/flash-thinking-reported-legacy-schema-5x.jsonl`
- `benchmark-evidence/flash-nonthinking-current-vs-legacy-3x.jsonl`
- `benchmark-evidence/pro-thinking-current-vs-legacy-3x.jsonl`
- `benchmark-evidence/flash-thinking-neutral-3x.jsonl`
- `benchmark-evidence/flash-thinking-pilot-matrix.jsonl`
- `benchmark-evidence/pro-mechanism-pilot.jsonl`
- `benchmark-evidence/pilot-flash-xml.jsonl`

### Experimental compatibility

- `benchmark/experimental-bare-hunk-compatibility.patch`
- `benchmark-evidence/experimental-bare-parser-focused-tests.log`
- `benchmark-evidence/flash-thinking-legacy-experimental-bare-parser-5x.jsonl`
- `benchmark-evidence/post-experiment-core-rebuild.log`

### Cross-provider refinement

- `cross-provider-context-patch-benchmark-report.md`
- `benchmark/experimental-clean-cut-context-patch.patch`
- `benchmark-evidence/cross-provider-context-summary.json`
- `benchmark-evidence/cross-provider-context-only-main.jsonl`
- `benchmark-evidence/cross-provider-context-only-neutral.jsonl`
- `benchmark-evidence/gemini-context-normalized-neutral.jsonl`

### Harness and aggregates

- `benchmark/deepseek-edit-benchmark.mjs`
- `benchmark/summarize-benchmark.mjs`
- `benchmark-evidence/selected-run-summary.json`
- `benchmark-evidence/current-edit-file-schema.json`

### Excluded setup pilots

- `pilot-flash-thinking.jsonl` and `pilot-flash-thinking-after-overwrite.jsonl`: excluded because the standalone harness had not initialized Prisma against the target database before initializing the vault; no provider call occurred.
- `pilot-flash-thinking-prisma-init.jsonl`: successful API pilot, excluded from the 165 count because the later matrices supersede it.
