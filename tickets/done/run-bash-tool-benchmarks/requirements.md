# Requirements

- Status: `Design-ready`
- Ticket: `run-bash-tool-benchmarks`
- Last Updated: `2026-04-08`

## Goal / Problem Statement

The agent-facing terminal and file-editing tools need higher operational certainty. `run_bash` should not depend on hidden shell directory state, and file-editing for local LM Studio models should remain reliable even when one edit format is brittle. The system also needs scenario benchmarks that measure real tool use instead of synthetic repetitions.

## In-Scope Use Cases

- `UC-001`: An agent runs multiple location-sensitive shell commands for one nested target directory without losing track of the execution directory.
- `UC-002`: An agent edits a file after reading it and can recover when a patch-style edit fails by switching to a more exact replacement or insertion primitive.
- `UC-003`: File tools use low-ambiguity path semantics so the model does not need to guess path resolution rules across `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file`.
- `UC-004`: Benchmark harnesses report scenario success rates and failure reasons that help explain why a tool path still fails.

## Out of Scope

- XML-mode rollout for the new edit tools in this ticket.
- Security policy changes for outside-workspace execution permissions.
- Provider-specific model routing beyond the current LM Studio investigation setup.

## Requirements

- `R-001`: `run_bash` must resolve each command's working directory explicitly from the tool arguments or workspace root rather than relying on previous `cd` state.
- `R-002`: `run_bash` foreground and background results must return the effective working directory that was actually used.
- `R-003`: `run_bash` benchmark prompts and schema guidance must teach repeated `cwd` reuse for nested targets.
- `R-004`: `edit_file` must remain a diff-style patch tool rather than an overloaded generic editor.
- `R-005`: The file-editing toolset must include exact replacement and anchored insertion tools so the agent can recover from patch failures.
- `R-006`: File tools must use explicit path semantics in API tool-calling mode: absolute paths are allowed, and relative paths resolve from the workspace root rather than shell `cd` state.
- `R-007`: The edit benchmark must score final filesystem correctness, not only first-tool success.
- `R-008`: A diagnostic benchmark must capture failure categories and content-type-specific mismatch patterns.

## Acceptance Criteria

- `AC-001`: The `run_bash` scenario benchmark reaches a materially better success rate than the earlier ambient-`cd` baseline and confirms the target `cwd` on successful runs.
- `AC-002`: The edit scenario benchmark reaches an acceptable aggregate success rate by allowing fallback across `edit_file`, `replace_in_file`, `insert_in_file`, and `write_file`.
- `AC-003`: Tool failures return actionable recovery information such as effective execution directory or categorized edit failure reasons.
- `AC-004`: File tool paths are explicit enough that the agent no longer depends on workspace-relative shell memory for file operations.
- `AC-005`: A focused diagnostic suite identifies the remaining file-editing miss patterns by tool failure category and content type.

## Constraints / Dependencies

- The current evaluation environment uses a local LM Studio model and tool-call mode via `AUTOBYTEUS_STREAM_PARSER=api_tool_call`.
- Realistic benchmark runs are slow and must be executed sequentially in this environment.
- The branch already contained source edits before workflow bootstrap; artifact creation must resume around the existing implementation rather than starting from a clean tree.

## Assumptions

- Allowing either absolute paths or workspace-root-relative paths reduces agent ambiguity more effectively than forcing absolute-only paths for every file-tool call.
- Keeping multiple edit tools available is preferable to trying to force one edit syntax to solve every model weakness.

## Open Questions / Risks

- Markdown and formatting-sensitive insertions still appear weaker than exact replacement cases on the local model.
- TypeScript multi-change edits can still succeed at the tool level while producing a slightly wrong final file.
- XML-mode exposure for the new edit tools is deferred and remains a follow-up item if non-API tool calling needs parity.

## Requirement Coverage Map (Requirement -> Use Case)

- `R-001` -> `UC-001`
- `R-002` -> `UC-001`
- `R-003` -> `UC-001`, `UC-004`
- `R-004` -> `UC-002`
- `R-005` -> `UC-002`
- `R-006` -> `UC-003`
- `R-007` -> `UC-002`, `UC-004`
- `R-008` -> `UC-004`

## Acceptance Criteria Coverage Map (AC -> Stage 7 Scenario)

- `AC-001` -> `AV-001`
- `AC-002` -> `AV-002`
- `AC-003` -> `AV-001`, `AV-003`
- `AC-004` -> `AV-004`
- `AC-005` -> `AV-003`

## Scope Triage

- Confirmed classification: `Medium`
- Rationale: the work spans terminal tooling, file tooling, API tool-call adapters, benchmark harnesses, and reviewable behavioral changes across multiple subsystems.
