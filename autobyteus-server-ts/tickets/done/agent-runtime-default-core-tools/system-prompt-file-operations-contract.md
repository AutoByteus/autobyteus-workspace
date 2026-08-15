# System-Prompt File-Operations Contract

## Status

`Approved by explicit user request; architecture review remains the gate before the follow-up implementation change.`

## Design Judgment

The tool schemas are already supplied to the model and own detailed parameter
semantics such as ranges, patch grammar, path rules, and validation. The fixed
system prompt should therefore be short workflow
guidance, not a second copy of the tool documentation.

Its only required clarifications are:

- Bash is for navigation, search, repository/project commands, processes, and
  verification.
- Exposed file tools are the normal interface for file content.
- Native AutoByteus runs expose `write_file` as part of the four-tool foundation baseline; external runtimes must treat it as available only when their own projection exposes it.
- Read current content before a targeted edit and reread after an edit-context
  failure before retrying.
- Bash remains an available fallback when file tools are unavailable or cannot
  complete the operation after recovery.

## Approved Fixed Prompt Sections

Replace the current fixed sections in
`autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts`
with this concise wording:

```markdown
## Bash Operating Practice

- Use Bash for workspace navigation, targeted search, repository and project commands, processes, network operations, and verification. Prefer deterministic, targeted commands over broad directory listings.
- For file content, follow `File And Directory Practice` and prefer the exposed dedicated file tools. Use Bash for file inspection or modification when those tools are unavailable or cannot complete the operation after recovery.
- Prefer non-interactive, small, composable, project-native commands.

## File And Directory Practice

- Locate files and directories by intent instead of broadly listing them. For content searches, use `rg -n "term" path`; for filename discovery, use `rg --files path | rg "pattern"`; use constrained `find path -maxdepth N ...` only when filesystem traversal or metadata is the goal.
- When exposed, use `read_file` for file reading, `edit_file` for targeted regional changes to an existing file, and `write_file` for new files or deliberate whole-file replacement.
- Before every targeted `edit_file` change, use `read_file` to read the relevant current content of the original file unless it was read recently and has not changed.
- Build the regional `edit_file` patch from that latest content and preserve unrelated content. If the edit context fails or the file changed, use `read_file` again for the affected content, construct a new patch, and retry; do not blindly retry an unchanged patch.
- Preserve unrelated content and existing changes. Verify important file changes with an appropriate read, diff, parser, test, or project-native check.
```

## Contract Boundaries

- Tool schemas remain authoritative for arguments, patch syntax, path resolution,
  validation, and safety behavior.
- This prompt does not make `write_file` mandatory where it is not exposed; the native AutoByteus four-tool baseline is the exposure authority for native runs, not the prompt.
- This prompt does not prohibit Bash fallback when the dedicated file tools do
  not work.
- External runtimes receiving the same prompt must not be assumed to expose
  the native default tools.

## Implementation Alignment

- Fixed prompt owner:
  `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-sections.ts`.
- Prompt composition owner:
  `autobyteus-server-ts/src/agent-execution/prompt/carpenter-prompt-composer.ts`.
- Detailed tool contracts remain authoritative in:
  `autobyteus-ts/src/tools/file/read-file.ts`,
  `autobyteus-ts/src/tools/file/edit-file-contract.ts`, and the registered
  `write_file`/`run_bash` schemas.
- Prompt tests should assert the concise workflow guidance and the absence of
  contradictory Bash/file-tool instructions; they should not duplicate every
  tool-schema detail.
