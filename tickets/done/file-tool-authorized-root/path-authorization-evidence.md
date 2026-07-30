# Path Authorization Evidence

## Purpose

Retained evidence for the reproduced `read_file` failure and the final trusted-local file-tool decision. This supplement complements, and does not replace, `requirements.md`, `investigation-notes.md`, and `design-spec.md`. It is evidence/context only; approval `N/A`.

## User-Reproduced Input

```text
Agent: product_prototyper_5e5dfa42520d455a80e1a7e86ef41dc3
Tool: read_file
Path: /Users/normy/autobyteus_org/autobyteus-skills/product-prototyping/references/vue-stack.md
Result: FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT
```

Host verification on 2026-07-29:

- `realpath` resolves to the same path.
- It is a regular readable file, mode `0644`, size `5823` bytes.
- It is outside the selected agent workspace because it is a global/server-managed skill root.

## Source Evidence

- `autobyteus-ts/src/tools/file/workspace-path-utils.ts` currently requires a non-empty workspace root and rejects absolute candidates outside it.
- `read-file.ts`, `write-file.ts`, `edit-file.ts`, `replace-in-file.ts`, and `insert-in-file.ts` all call the shared resolver.
- `240d72207` introduced strict workspace/physical containment while the integration test and tool description continued to expect absolute external reads.
- `server-runtime.ts` configures protected application database/root-key/WAL/SHM/journal paths through the denied-real-path list.

## Final Authorization Decision

```text
absolute input  = accepted after normalization; ignore base_dir
relative + base_dir = resolved under absolute base_dir
relative input without base_dir = actionable error requiring absolute path or base_dir
protected real path = denied for every file operation
other absolute local path = accepted for read/write/edit operations
```

This deliberately removes the workspace containment boundary from the five generic file tools. The user explicitly rejected a multi-root registration/approval model as impractical for auto-approved local agents.

The file resolver must not be reused for terminal cwd after this change. `run_bash` and `start_background_process` retain a separate workspace-contained terminal resolver so the file-tool widening cannot silently widen terminal authorization.

The current tool schemas also need to be updated with an explicit `base_dir` contract. This is an LLM-usability requirement, not a separate authorization mechanism: the schema must state that a relative `path` requires absolute `base_dir`, that omitting `base_dir` requires an absolute `path`, and that file paths are independent of workspace/process/shell `cd` state.

## Operation Matrix

| Input | `read_file` | `write_file` / `edit_file` / `replace_in_file` / `insert_in_file` |
| --- | --- | --- |
| Absolute skill reference | Allow | Allow unless protected |
| Absolute external worktree | Allow | Allow |
| Absolute unrelated user-local path | Allow | Allow |
| Relative path without `base_dir` | Deny with actionable absolute-path/base-dir guidance | Deny with actionable absolute-path/base-dir guidance |
| Relative path + absolute `base_dir` | Resolve under base_dir, then allow | Resolve under base_dir, then allow |
| Protected AutoByteus application path | Deny | Deny |

## Security Interpretation

This is a trusted-local file-tool contract, not a sandbox. The user's explicit absolute path is authoritative. The remaining protected-path deny list is an application-self-protection boundary, not a workspace restriction. If the user later wants to remove that deny list too, it must be treated as a separate high-risk requirement because it can expose credentials or corrupt the running application.
