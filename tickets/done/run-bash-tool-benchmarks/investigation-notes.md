# Investigation Notes

## Investigation Status

- Current Status: `Current`
- Scope Triage: `Medium`
- Triage Rationale: terminal cwd handling, file-edit tool behavior, streaming adapters, and benchmark harnesses all changed in one branch.
- Investigation Goal: explain what changed, why the reliability improved, and what failure modes remain.
- Primary Questions To Resolve:
  - How should `run_bash` communicate working-directory state to the model?
  - Which file-edit primitives work better than strict patching on the local LM Studio model?
  - What do the scenario benchmarks say about final outcome quality and residual failure patterns?

## Source Log

| Date | Source Type | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-04-08 | Code | `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | Inspect current cwd contract and result payload | `cwd` is optional, resolves against workspace root when available, and results now include `effectiveCwd` | No |
| 2026-04-08 | Code | `autobyteus-ts/src/tools/file/edit-file.ts` | Confirm patch-tool behavior | `edit_file` is patch-only again and points callers to `replace_in_file` / `insert_in_file` when exact text operations are easier | No |
| 2026-04-08 | Code | `autobyteus-ts/src/tools/file/replace-in-file.ts`, `insert-in-file.ts`, `text-edit-utils.ts` | Verify fallback edit semantics | Exact replacement and anchored insertion fail with categorized errors when the requested block or anchor is missing or ambiguous | No |
| 2026-04-08 | Code | `autobyteus-ts/src/agent/streaming/api-tool-call/file-content-streamer.ts`, `autobyteus-ts/src/agent/streaming/handlers/api-tool-call-streaming-response-handler.ts` | Confirm API tool-call integration for the split edit-tool family | `edit_file` streams patch content; the new tools participate as ordinary API tool calls | No |
| 2026-04-08 | Command | `pnpm exec vitest --run tests/unit/tools/file/edit-file.test.ts ... tests/integration/agent/edit-file-diagnostics.test.ts` | Refresh current focused verification after ticket bootstrap | `9` files passed, `1` skipped, `40` tests passed, `1` skipped | No |
| 2026-04-08 | Command | `CI=1 AUTOBYTEUS_EDIT_FILE_DIAGNOSTICS=1 AUTOBYTEUS_EDIT_FILE_DIAGNOSTICS_TIMEOUT_MS=0 LMSTUDIO_FLOW_TEST_TIMEOUT_MS=0 pnpm exec vitest --run tests/integration/agent/edit-file-diagnostics.test.ts > /tmp/edit-file-diagnostics.log 2>&1` | Capture focused residual failures with useful logs only | `8/10` passed; remaining misses were final-content mismatches in markdown and TypeScript | No |
| 2026-04-08 | Trace | `/tmp/edit-file-diagnostics.log` filtered by `^\\[edit_file diagnostics\\]` | Reduce agent trace noise to actionable benchmark summaries | Failure categories were rare (`patch_context_not_found=1`, `replace_no_exact_match=1`); most remaining misses were successful tool executions with wrong final content | No |
| 2026-04-08 | Prior benchmark evidence | branch-local benchmark notes from earlier execution | Carry forward already observed scenario rates for the ticket | `run_bash` improved from `5/8` (`62.5%`) to `8/8` (`100%`); edit scenario suite improved from `25%` single-tool behavior to `21/24` (`87.5%`) with tool fallback | No |
| 2026-04-08 | Command | `pnpm exec vitest --run tests/integration/agent/agent-single-flow.test.ts tests/integration/agent/agent-single-flow-xml.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts tests/integration/agent/full-tool-roundtrip-flow.test.ts` (run sequentially) | Check whether the path-contract changes broke broader agent flows | `full-tool-roundtrip-flow.test.ts` passed, but the single-agent, XML single-agent, and team single-flow tests all failed because their prompts/assertions still assumed workspace-relative file writes | No |
| 2026-04-08 | Command | `pnpm exec vitest --run tests/integration/tools/usage/formatters/edit-file-xml-formatter.test.ts tests/integration/tools/usage/formatters/write-file-xml-formatter.test.ts tests/integration/tools/usage/formatters/run-bash-xml-formatter.test.ts tests/integration/agent/streaming/full-streaming-flow.test.ts` | Separate XML parser/formatter compatibility from end-to-end agent behavior | XML formatter/parser coverage stayed green, so the XML failure is a tool-contract/end-to-end issue rather than a parser break | No |
| 2026-04-08 | Command | `pnpm exec vitest --run tests/unit/tools/file/read-file.test.ts tests/unit/tools/file/write-file.test.ts tests/unit/tools/file/edit-file.test.ts tests/unit/tools/file/replace-in-file.test.ts tests/unit/tools/file/insert-in-file.test.ts tests/integration/tools/file/read-file.test.ts tests/integration/tools/file/write-file.test.ts tests/integration/tools/file/edit-file.test.ts tests/integration/tools/file/replace-in-file.test.ts tests/integration/tools/file/insert-in-file.test.ts tests/unit/tools/usage/formatters/write-file-xml-formatter.test.ts tests/unit/tools/usage/formatters/edit-file-xml-formatter.test.ts` plus `pnpm exec vitest --run --maxWorkers=1 tests/integration/agent/agent-single-flow.test.ts tests/integration/agent/agent-single-flow-xml.test.ts tests/integration/agent/full-tool-roundtrip-flow.test.ts tests/integration/agent-team/agent-team-single-flow.test.ts` | Validate the final local fix that restored workspace-root-relative file paths while keeping explicit path resolution | Focused file-tool coverage passed (`12` files, `58` tests) and the affected LM Studio path-sensitive flows passed (`4` files, `4` tests) | No |

## Current Behavior / Codebase Findings

### Entrypoints And Boundaries

- Primary entrypoints:
  - `registerRunBashTool()` -> `runBash(...)`
  - `registerEditFileTool()` -> `editFile(...)`
  - `registerReplaceInFileTool()` -> `replaceInFile(...)`
  - `registerInsertInFileTool()` -> `insertInFile(...)`
- Execution boundaries:
  - tool schema / API tool call boundary
  - terminal-session/background-process boundary
  - filesystem mutation boundary
  - benchmark validator boundary
- Owning subsystems / capability areas:
  - `src/tools/terminal/*`
  - `src/tools/file/*`
  - `src/agent/streaming/api-tool-call/*`
  - `tests/integration/agent/*benchmark*`
- Folder / file placement observations:
  - The branch extends existing terminal and file tool folders rather than creating a new editing subsystem.
  - Shared exact-text edit logic now has one owner in `src/tools/file/text-edit-utils.ts`.

### Relevant Files / Symbols

| Path | Symbol / Area | Current Responsibility | Finding / Observation | Ownership / Placement Implication |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/src/tools/terminal/tools/run-bash.ts` | `resolveExecutionCwd`, `runBash` | Run shell commands with explicit cwd resolution | `effectiveCwd` is now part of the success path and background result | `run_bash` remains the authoritative terminal entrypoint |
| `autobyteus-ts/src/tools/file/edit-file.ts` | `editFile` | Apply diff-style patch edits | Patch retries already allow fuzz and whitespace-tolerant context matching | `edit_file` should stay focused on patch edits rather than exact replacement |
| `autobyteus-ts/src/tools/file/replace-in-file.ts` | `replaceInFile` | Exact single-block replacement | Best-performing fallback for JSON, shell, TOML, Python, and package.json scenarios | Exact replacement deserves its own tool name and contract |
| `autobyteus-ts/src/tools/file/insert-in-file.ts` | `insertInFile` | Exact anchored insertion | Helps insertion-specific cases, but newline handling still matters | Insertion should stay separate from replacement |
| `autobyteus-ts/src/tools/file/workspace-path-utils.ts` | `resolveAbsolutePath` | Enforce absolute file paths | API file tools no longer rely on workspace-relative fallback semantics | File path certainty is now uniform across the file-tool family |
| `autobyteus-ts/tests/integration/agent/edit-file-benchmark-flow.test.ts` | scenario benchmark | Measure final filesystem outcomes with tool fallback | Aggregate rate reached `21/24` (`87.5%`) | Final-result scoring is the right benchmark shape |
| `autobyteus-ts/tests/integration/agent/edit-file-diagnostics.test.ts` | focused diagnostics | Capture content-type and failure-category patterns | Remaining misses are mostly formatting / final-content issues, not parser-collapse | Diagnostic harness is useful for follow-up work |

### Runtime / Probe Findings

| Date | Method | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-04-08 | Probe | Focused Vitest suite | File tools and API tool-call adapters are green on the focused suite | Current branch state is internally consistent enough for Stage 7 evidence |
| 2026-04-08 | Benchmark | `run-bash-benchmark-flow.test.ts` prior branch execution | `run_bash` scenario rate improved to `8/8` with `effectiveCwd` and stronger cwd guidance | The terminal-side design hypothesis is validated |
| 2026-04-08 | Benchmark | `edit-file-benchmark-flow.test.ts` prior branch execution | Tool-family fallback reached `21/24` overall | Multiple editing tools are materially better than a single patch tool |
| 2026-04-08 | Diagnostics | `/tmp/edit-file-diagnostics.log` | Markdown and TypeScript remain weaker than JSON/TOML/YAML/Python/shell | Residual risk is formatting precision, not complete edit-path failure |
| 2026-04-08 | Regression flow | `agent-single-flow.test.ts`, `agent-single-flow-xml.test.ts`, `agent-team-single-flow.test.ts` | The temporary absolute-only file-path contract proved too brittle for realistic agent behavior and older regression prompts | The branch needed one final local fix to restore workspace-root-relative file paths while keeping explicit resolution rules |
| 2026-04-08 | Regression flow | focused file-tool suite plus `agent-single-flow.test.ts`, `agent-single-flow-xml.test.ts`, `agent-team-single-flow.test.ts`, `full-tool-roundtrip-flow.test.ts` | Restoring absolute-or-workspace-root-relative file paths removed the friction seen during manual verification and kept the affected flow coverage green | The final archived branch truth is the mixed explicit path rule, not absolute-only |

## Constraints

- Technical constraints:
  - Local LM Studio inference is slow and should be benchmarked sequentially.
  - API tool-call mode is the only in-scope calling mode for the new edit-tool family in this ticket.
- Environment constraints:
  - The branch already contains source edits; workflow artifacts are being resumed around existing implementation work.
- Third-party / API constraints:
  - None blocking in current evidence; this ticket is primarily internal tool behavior and benchmark scaffolding.

## Unknowns / Open Questions

- Resolved: file tools now accept either absolute paths or workspace-root-relative paths, so the runtime no longer forces absolute-only file creation during normal workspace tasks.
- Why it mattered: the absolute-only rule caused unnecessary model mistakes during manual verification even though the runtime already knew the workspace root.
- Outcome: the final local fix restored workspace-root-relative support, and the affected flow reruns all passed.

- Unknown: whether `insert_in_file` should gain built-in newline/indent preservation helpers.
- Why it matters: markdown and Makefile-like content are sensitive to insertion boundaries even when tool calls succeed.
- Planned follow-up: use the diagnostics harness to compare newline-preserving insertion strategies on the same 10-scenario set.

- Unknown: whether `edit_file` should keep strict unified/git patching or add a relaxed patch mode later.
- Why it matters: one observed Python edit still failed first with `patch_context_not_found` before fallback succeeded.
- Planned follow-up: keep the current multi-tool family, then test whether relaxed patching reduces first-tool failure noise without hurting precision.

## Implications

### Requirements Implications

- Final-result scenario success is a better requirement target than first-tool success.
- Error surfaces should be treated as part of the product behavior, not only internal debugging detail.

### Design Implications

- `run_bash` should be a stateless contract over a session-backed implementation, with `effectiveCwd` as the recovery signal.
- File editing works better as a family of focused tools than a single universal edit primitive.

### Implementation / Placement Implications

- New edit tools belong in the existing `src/tools/file/` owner boundary, with shared exact-text helpers co-located there.
- API tool-call adapters should continue to treat `edit_file` as patch-only and keep the new tools additive rather than overloading the old contract.
