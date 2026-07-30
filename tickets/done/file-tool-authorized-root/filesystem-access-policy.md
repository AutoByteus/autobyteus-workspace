# Filesystem Access Policy

## Purpose And Status

This supplemental artifact defines the intended trusted-local contract for the generic AutoByteus file tools. It complements, and does not replace, `requirements.md`, `investigation-notes.md`, and `design-spec.md`.

Status: `User-approved intended behavior; architecture approval required`.

## User-Experience Decision

The user explicitly rejected repeated per-path/per-root approval as impractical for normal local agent work. The generic file tools therefore use a single trusted-local policy rather than a multi-root approval workflow:

- absolute paths may be read, written, or edited anywhere the local operating system permits;
- relative paths require an explicit absolute `base_dir`; when `base_dir` is omitted, the model must provide an absolute path;
- the existing run/tool approval setting remains the only user-facing approval gate; and
- AutoByteus-owned database, root-key, WAL/SHM/journal, and configured protected descendants remain denied.

Auto-approval means “do not prompt for each tool call.” It does not create a second path policy and does not need to enumerate skill or worktree roots.

## Operation Matrix

| Path/input | `read_file` | `write_file` / `edit_file` / `replace_in_file` / `insert_in_file` |
| --- | --- | --- |
| Absolute path inside workspace | allow | allow |
| Absolute configured skill/reference path | allow | allow, subject to protected-path denial |
| Absolute project checkout/git worktree | allow | allow |
| Absolute unrelated user-local path | allow | allow |
| Relative path + absolute `base_dir` | resolve under `base_dir`, then allow | resolve under `base_dir`, then allow |
| Relative path without `base_dir` | deny with actionable error requiring absolute `path` or absolute `base_dir` | deny with actionable error requiring absolute `path` or absolute `base_dir` |
| Protected AutoByteus application path | deny | deny |

No workspace lexical-containment or symlink-containment check is used to reject an absolute path. Physical resolution remains only to identify whether the candidate is a protected path.

## Implementation Shape

Use one shared resolver for all five generic file tools. Expose the same optional `base_dir` parameter on each tool; it is conditionally required for relative `path`, applies per-call, and is not persistent CWD state:

```text
absolute input -> normalize absolute path; ignore base_dir
relative input + absolute base_dir -> resolve under base_dir
relative input without base_dir -> actionable error requiring absolute path or absolute base_dir
candidate -> resolve physical candidate for protected-path comparison
candidate inside protected deny root -> FILE_TOOL_PATH_DENIED
otherwise -> file operation
```

Do not add skill-root propagation, worktree registration, per-operation root arrays, or a model-controlled approval list for this target. The user-provided absolute path itself is the authority for local file-tool operations.

## LLM-Facing Schema Contract

The serialized schema for every generic file tool must make the resolution rules explicit. Use the same semantics for `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file`:

- `path` — required string. “Absolute filesystem path, or a relative file path paired with `base_dir`. If `path` is relative, you must provide an absolute `base_dir`. If `base_dir` is omitted, `path` must be absolute. Absolute paths are used directly and take precedence if `base_dir` is also supplied. Relative paths are never resolved from the configured workspace, process cwd, or prior shell `cd` state.”
- `base_dir` — optional string. “Optional absolute directory used only when `path` is relative; it is required for a relative `path`. If `path` is absolute, omit `base_dir` (an absolute path takes precedence if both are supplied). This applies to this tool call only and does not change shell or agent working-directory state. Do not provide a relative `base_dir`.”

The remaining operation-specific parameters retain their current names, types, and meanings. Schema tests must verify that all five tools expose this shared contract, including `base_dir` as optional but conditionally required for relative paths.

## Terminal Boundary

The trusted-local resolver is file-tool-specific. `run_bash` and `start_background_process` continue to use a separate workspace-contained terminal-cwd resolver. The file-tool change must not silently make an external explicit terminal `cwd` valid. Terminal `cwd` behavior and its docs/tests are preserved or explicitly handled by the architecture-approved extraction.

## Security Posture

This is intentionally equivalent to a trusted local file-access mode for these tools. It is not a sandbox. The main remaining safety boundary is the server-configured protection for AutoByteus's own secrets and storage. Removing that deny list would be a separate high-risk requirement because it could expose credentials or corrupt the running application.

Terminal/`run_bash` policy is not changed by this artifact, although its existing process-level reach should be reviewed separately for consistency.

## Approval Applicability

This supplement defines intended behavior. User approval is recorded; architecture approval remains pending.
