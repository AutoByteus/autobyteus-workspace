# autobyteus-ts Edit File Patch Format Investigation

> **Later authoritative refinement (SR-002):** This report preserves early research and hypotheses. Subsequent live DeepSeek/Gemini/GPT evidence and the user's final scope decision supersede its retention recommendation: canonical `edit_file` uses unique context hunks with numeric decoration discarded, and `replace_in_file` / `insert_in_file` are removed from the active product surface. See `cross-provider-context-patch-benchmark-report.md`, `requirements-doc.md`, and `design-spec.md`.

Date: 2026-07-03
Workspace: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo`
Scope: investigation only; no implementation changes requested.

## Executive Conclusion

The current `autobyteus-ts` `edit_file` **patch content** format is broadly aligned with SWE-bench's benchmark-level artifact: a git/unified diff patch. SWE-bench predictions are evaluated by applying a model-generated `model_patch` with `git apply`/`patch`, and SWE-bench documentation recommends `git diff`-style output.

However, the current `edit_file` **tool contract** is not itself a SWE-bench standard:

- `edit_file` is a single-file tool with arguments `{ path, patch }`.
- XML prompting wraps patch text in `<tool name="edit_file">...<arg name="patch">__START_PATCH__ ... __END_PATCH__</arg>...</tool>` for streaming/parsing safety.
- The patch applier requires numeric unified-diff hunk headers like `@@ -10,7 +10,8 @@`.
- It can read git diff headers, but it applies hunks to the separately supplied `path`; it is not a repository-level `git apply` equivalent.

Recommendation: **keep the current unified-diff `patch` content format**, because it is benchmark-aligned and familiar to models, but do **not** treat the surrounding `edit_file` XML/function wrapper as an industry standard. If the goal is maximum model compliance across leading coding models, add compatibility rather than replacing the existing tool:

1. Add or alias an OpenAI-style `apply_patch` path/tool for Codex/OpenAI-trained models.
2. Consider supporting model-friendly hunk headers such as bare/context `@@` in addition to strict numeric unified-diff headers.
3. Add a repository-level `apply_patch`/`apply_git_patch` capability if direct SWE-bench `model_patch` compatibility is desired.
4. Keep `replace_in_file`/`insert_in_file`, and consider an Anthropic-compatible `str_replace_based_edit_tool` alias if targeting Claude-style models.

## Layered Format Clarification

| Layer | Current `autobyteus-ts` behavior | Industry/SWE-bench relevance | Finding |
| --- | --- | --- | --- |
| Benchmark final answer artifact | Not directly exposed as a repo-level tool; can be approximated through repeated `edit_file` calls. | SWE-bench expects `model_patch` patch strings, usually `git diff`. | Current patch syntax aligns, but the tool does not accept a whole repo patch as one authoritative artifact. |
| Interactive tool call envelope | Function/API mode: `edit_file` with `path` and `patch`. XML mode: `<tool name="edit_file">...<arg name="patch">...</arg>`. | No single SWE-bench standard; scaffolds differ by agent. | Autobyteus-specific; acceptable, but not inherently benchmark-trained. |
| Patch content inside tool | Unified diff / git diff for one file. | Strongly aligned with `git diff` and SWE-bench final patch format. | Good choice. |
| Hunk header requirement | Strict numeric hunk headers required by parser. | Git diffs use numeric headers; some modern agent tools use looser context-only hunks. | Benchmark-aligned, but potentially more brittle for interactive model generation. |
| Application scope | Existing single file only; path resolved separately. | SWE-bench patch can modify multiple files and create/delete/rename files. | Good surgical file tool; not a full SWE-bench patch applier. |

## Local Implementation Findings

### Tool schema and execution owner

- `autobyteus-ts/src/tools/file/edit-file.ts:10-25` describes `edit_file` as a single-file patch tool and tells the model to provide a "git diff or unified diff patch" with numeric hunk headers.
- `autobyteus-ts/src/tools/file/edit-file.ts:39-85` resolves one target path, requires that file to exist, reads its content, applies the patch, and writes the patched content back.
- `autobyteus-ts/src/tools/file/edit-file.ts:58-67` retries patch application with fuzz/whitespace-tolerant strategies.

### Patch parser/applier

- `autobyteus-ts/src/utils/diff-utils.ts:8` requires hunk headers matching `@@ -<oldStart>[,<oldCount>] +<newStart>[,<newCount>] @@`.
- `autobyteus-ts/src/utils/diff-utils.ts:9-23` recognizes and skips common git patch metadata such as `diff --git`, `index`, `new file mode`, `deleted file mode`, rename/copy lines, and binary file metadata.
- `autobyteus-ts/src/utils/diff-utils.ts:70-78` skips `---`/`+++` file headers and git headers.
- `autobyteus-ts/src/utils/diff-utils.ts:90-93` rejects non-numeric/bare hunk headers as malformed.
- `autobyteus-ts/src/utils/diff-utils.ts:111-128` accepts normal unified-diff hunk body lines with ` `, `-`, `+`, and `\ No newline` markers.
- `autobyteus-ts/src/utils/diff-utils.ts:131-173` applies hunks by matching expected old/context lines near the header's old start with configured fuzz and optional whitespace tolerance.

### Prompt/XML presentation

- `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-schema-formatter.ts:6-12` renders an XML tool schema that asks for a git-diff-style unified diff and requires `__START_PATCH__`/`__END_PATCH__` markers for reliable streaming.
- `autobyteus-ts/src/tools/usage/formatters/edit-file-xml-example-formatter.ts:8-23` and `:30-45` show examples with `---`/`+++` file headers and numeric hunk headers.
- `autobyteus-ts/src/agent/streaming/parser/states/xml-edit-file-tool-parsing-state.ts:6-10` identifies `edit_file` segments and defines the sentinel markers.
- `autobyteus-ts/src/agent/streaming/parser/states/xml-edit-file-tool-parsing-state.ts:114-150` enters default parsing if no sentinel is found; sentinels are helpful for XML safety but not the semantic patch format.
- `autobyteus-ts/src/agent/streaming/parser/states/xml-edit-file-tool-parsing-state.ts:185-256` strips sentinel-delimited patch content before emitting the `edit_file` segment content.

### API tool-call streaming presentation

- `autobyteus-ts/docs/api_tool_call_file_streaming_design.md:56-63` specifies that API tool-call mode recognizes `edit_file` and streams only decoded patch content as an `edit_file` segment, not a raw JSON tool segment.
- `autobyteus-ts/docs/api_tool_call_file_streaming_design.md:83-87` defines the two relevant JSON fields: `path` and `patch`.
- `autobyteus-ts/src/agent/streaming/api-tool-call/file-content-streamer.ts:54-57` implements `EditFileContentStreamer` over the `patch` key.
- `autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts:55-61` maps tool name `edit_file` to `SegmentType.EDIT_FILE` and the patch streamer.

### Existing coverage evidence

- `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts:41-45` asserts that the schema advertises a git diff or unified diff patch.
- `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts:48-66` covers direct numeric unified-diff hunks.
- `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts:68-90` covers git diff style headers plus numeric hunk headers.
- `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts:93-109` covers precise failure feedback that points the model to retry or use replacement/insertion tools.
- `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts:112-120` begins whitespace-tolerance coverage.

## External Research Findings

### SWE-bench itself is patch-output-based, not interactive-edit-tool-based

- SWE-bench's evaluation guide says evaluation applies generated patches to repositories and runs tests. It requires JSONL predictions with `instance_id`, `model_name_or_path`, and `model_patch`, and its example `model_patch` is a git diff with `diff --git`, `---`/`+++`, and numeric hunk headers. Source: https://www.swebench.com/SWE-bench/guides/evaluation/
- SWE-bench FAQ says the model output should be a diff or patch applicable to original code and typically recommends the diff generated by `git diff`. Source: https://www.swebench.com/SWE-bench/faq/
- SWE-bench harness writes `pred[KEY_PREDICTION]` to `patch.diff`, then tries `git apply --verbose`, `git apply --verbose --reject`, and `patch --batch --fuzz=5 -p1 -i`. Source: https://github.com/SWE-bench/SWE-bench/blob/main/swebench/harness/run_evaluation.py
- SWE-bench inference utilities include `extract_diff(response)`, extracting content from `<diff>`, `<patch>`, fenced `diff`/`patch`, or falling back to raw response content. Source: https://www.swebench.com/SWE-bench/api/inference/

Implication: If you ask "what does SWE-bench train/push model companies toward?", the answer is strongest for **final git/unified diff patch artifacts**, not for a particular interactive `edit_file` tool schema.

### SWE-bench-family agents use multiple interactive editing interfaces

- SWE-agent documentation frames tools as configurable and lists common categories: bash, file viewers, and code editors such as search/replace or line-range methods. Source: https://github.com/SWE-agent/SWE-agent/blob/main/docs/config/tools.md
- SWE-agent demonstration docs describe the traditional line-based editor as `edit edit_start_line:edit_end_line` followed by replacement text and `end_of_edit`. Source: https://github.com/SWE-agent/SWE-agent/blob/main/docs/config/demonstrations.md
- SWE-agent ACI docs emphasize that custom agent-computer interfaces matter and mention linter-backed edit commands plus special file viewer/search tools. Source: https://github.com/SWE-agent/SWE-agent/blob/main/docs/background/aci.md
- The SWE-agent paper says compact, efficient file editing is important and that their editor consolidates multi-line edits with feedback. It also notes that final task edits are aggregated and saved as a `.patch` file, the canonical PR change representation. Source: https://proceedings.neurips.cc/paper_files/paper/2024/file/5a7c947568c1b1328ccc5230172e1e7c-Paper-Conference.pdf
- The official SWE-bench leaderboard now exposes an Agent selector including mini-SWE-agent; the mini-SWE-agent README says it uses only bash and no tool-calling interface, yet scores strongly on SWE-bench Verified. Source: https://www.swebench.com/ and https://github.com/SWE-agent/mini-swe-agent

Implication: There is no single interactive edit-file format dictated by SWE-bench. High-performing benchmark scaffolds may use bash-only, line editors, str-replace editors, apply-patch tools, or diff formats.

### Leading-provider tool conventions differ

- Anthropic's SWE-bench Sonnet writeup says its scaffold used Bash plus an Edit Tool for viewing/creating/editing files; it reports highest reliability with string replacement where `old_str` must exactly match one unique block and `new_str` replaces it. Source: https://www.anthropic.com/engineering/swe-bench-sonnet
- Anthropic's current text editor tool docs expose `str_replace_based_edit_tool`, with commands such as `view`, `str_replace`, and `insert`; the docs explain that Claude constructs old-text/new-text replacement requests. Source: https://platform.claude.com/docs/en/agents-and-tools/tool-use/text-editor-tool
- OpenAI's current Apply Patch docs expose an `apply_patch` tool that emits structured operations (`create_file`, `update_file`, `delete_file`) with V4A diffs and paths. Source: https://developers.openai.com/api/docs/guides/tools-apply-patch
- OpenAI's Codex prompting guide strongly recommends using the exact OpenAI `apply_patch` implementation for Codex-family models because the model has been trained to excel at that diff format; the same guide shows both server-defined `apply_patch` operations and a freeform `*** Begin Patch` grammar with `*** Add File`, `*** Update File`, `*** Delete File`, and `@@` context hunks. Source: https://developers.openai.com/cookbook/examples/gpt-5/codex_prompting_guide
- Epoch AI's SWE-bench Verified eval page says it provides bash, Anthropic-style `text_editor`, and OpenAI-style `apply_patch` tools because they are associated with two leading code LLM APIs and are often adopted by developers. Source: https://epoch.ai/benchmarks/swe-bench-verified

Implication: For leading commercial coding models, provider-native edit tools are likely more in-distribution than an arbitrary custom XML wrapper. But the patch content family remains diff-like.

### Aider evidence supports unified diffs as model-friendly

- Aider's unified-diff writeup reports that switching GPT-4 Turbo from search/replace blocks to unified diffs improved its laziness benchmark score from 20% to 61% and reduced lazy comments. It argues unified diffs are familiar because they are the default output of `git diff`. Source: https://aider.chat/docs/unified-diffs.html
- Aider's edit-format docs list multiple formats, including whole-file output, search/replace `diff`, and `udiff` based on widely used unified diff, with different models performing better on different formats. Source: https://aider.chat/docs/more/edit-formats.html

Implication: Unified-diff patch content is a defensible default for LLM editing, but model-specific alternatives still matter.

## Comparison: Current Format vs. Industry/Benchmark Practice

### What is strong in the current design

1. **The `patch` content is standard and familiar.** Unified diff/git diff is the exact family that SWE-bench expects as final model output.
2. **The tool is safer than a full overwrite.** A one-file patch with context matching reduces accidental unrelated rewrites.
3. **The implementation includes recovery affordances.** Fuzz and whitespace retry reduce brittleness, and failures suggest exact-replacement or insertion fallbacks.
4. **The path is explicit.** Requiring `path` avoids relying on shell `cd` state, matching Anthropic's reported error-proofing principle of explicit absolute paths.
5. **XML sentinels are an implementation detail, not a semantic format.** They solve streaming/XML parsing hazards when patch content contains `<`, `>`, or `</arg>`-like text.

### What is not industry-standard or could be improved

1. **`edit_file` XML is not SWE-bench standard.** SWE-bench evaluates final patches, not this tool envelope.
2. **It is only single-file.** SWE-bench `model_patch` can contain multi-file diffs, file creation, deletion, renames, and mode changes. Current `edit_file` requires one existing file path and applies all hunks to that file.
3. **It requires numeric hunk headers.** This matches `git diff`, but OpenAI's apply-patch freeform grammar and some model-friendly diff variants allow bare/context `@@` hunks that avoid exact line-count generation.
4. **It is not the OpenAI `apply_patch` format.** Codex/OpenAI docs explicitly recommend their exact `apply_patch` implementation for Codex-family models.
5. **It is not the Anthropic text editor format.** Claude's published tool family is `str_replace_based_edit_tool` with `old_str`/`new_str` and `insert`; autobyteus has similar separate tools but not the same provider-native shape/name.

## Product Recommendation

### Decision

Do **not** replace the current `edit_file.patch` content format. It is already in the right broad family: unified diff / git diff. But if the goal is to maximize performance across benchmark-trained coding models, extend compatibility around it.

### Recommended near-term changes if implementation is requested later

1. **Documentation/prompt tightening**
   - Say: "`edit_file` accepts a single-file unified diff/git diff hunk patch for the supplied `path`; it is not a full repository patch applier."
   - Keep examples with `---`/`+++` and numeric hunks, but add failure guidance and a smaller minimal hunk example.

2. **Parser compatibility extension**
   - Continue accepting numeric git/unified diff hunks.
   - Add support for OpenAI/Aider-style bare or context hunks, e.g. `@@` or `@@ function_name @@`, by locating context lines rather than requiring numeric starts/counts.
   - Keep existing fuzz and whitespace-tolerant matching.

3. **Add an OpenAI-style `apply_patch` tool/alias**
   - If targeting Codex/OpenAI models, expose a first-class `apply_patch` surface close to OpenAI's documented shape.
   - Prefer exact naming and patch grammar to stay in-distribution for models trained on OpenAI/Codex scaffolds.
   - Support create/update/delete operations explicitly.

4. **Add a repo-level git patch tool if SWE-bench direct compatibility matters**
   - A `apply_git_patch`/`apply_repo_patch` tool could accept a whole `git diff` patch and apply it from workspace root using a safe internal parser or `git apply --check` + `git apply` flow.
   - This should be separate from `edit_file`, whose single-file semantics are useful and safer for surgical edits.

5. **Consider Anthropic-compatible aliasing**
   - Existing `replace_in_file` and `insert_in_file` already match the core interaction style of exact block replacement/insertion.
   - A provider-compatible `str_replace_based_edit_tool` facade could map Anthropic-shaped commands to the existing local owners without duplicating edit logic.

6. **Measure with live model diagnostics**
   - The repo already has `edit-file-benchmark-flow` and `edit-file-diagnostics` style integration tests. If changing format support, use those to compare current strict numeric unified diffs, bare/context hunks, OpenAI-style apply_patch, and exact-replacement flows across target providers.

## Design Health Assessment

- Change posture: Investigation / potential larger product requirement.
- Current design issue found: Partial.
- Root cause classification: Interface/API shape issue, not local implementation defect.
- Refactor needed now: No implementation requested. If implementation is requested, prefer additive capability extension over replacing the current owner.
- Evidence: Current `edit_file` content format aligns with SWE-bench final patch format, but the wrapper and single-file/numeric-hunk limitations do not cover leading provider-native edit tools or full SWE-bench `model_patch` semantics.

## Bottom Line

Your implemented **patch content format is close to industry best practice** because it uses unified diff/git diff. The bigger gap is that the current `edit_file` is a **single-file custom tool contract**, while the market has multiple strongly trained contracts:

- SWE-bench final artifact: full `git diff`/patch.
- OpenAI/Codex: `apply_patch` operations / freeform `*** Begin Patch` grammar / V4A diffs.
- Anthropic/Claude: `str_replace_based_edit_tool` exact old/new text and insert commands.
- Aider: model-specific formats, with strong evidence for unified diff in GPT-4 Turbo-like models.

So the safest product direction is: **keep unified diff; add provider-/benchmark-compatible adapters and parser leniency.**
