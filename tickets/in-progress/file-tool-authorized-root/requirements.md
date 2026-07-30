# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

`Design-ready` — the user explicitly confirmed that the file tools should support unrestricted user-filesystem reads and writes, without repeated path approvals. User approval is complete; the current architecture gate is pending. The separate AutoByteus-internal deny list remains protected.

## Goal / Problem Statement

Fix the file-tool path regression by removing the workspace-containment restriction from the generic AutoByteus file tools. `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file` must work with absolute paths anywhere on the user's local filesystem, so configured skill references and project git worktrees outside the selected workspace are usable. A relative `path` must be paired with an explicit absolute `base_dir`; when `base_dir` is omitted, the model must provide an absolute `path`. The user should not be forced through per-file or per-root approval prompts; the existing run/tool approval setting remains the only approval gate.

This is intentionally a trusted-local-agent contract. It is not a host-filesystem sandbox. The server's protected application database, root key, and sidecar deny paths remain non-bypassable unless that separate protection is explicitly changed.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | `resolveAbsolutePath` requires every absolute and relative candidate to remain inside `workspaceRootPath`. | An absolute file path is accepted regardless of workspace location; a relative path requires an explicit absolute `base_dir`. | Empty-path validation remains; relative paths are not inferred from workspace or shell state. | REQ-001, REQ-003, REQ-008, AC-001, AC-002, AC-009, AC-010 |
| BEH-002 | A configured skill reference outside the workspace fails with `FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT`. | `read_file` can read any user-local skill/reference path supplied by the configured skill guidance. | Skill discovery and `load_skill` ownership remain unchanged. | REQ-001, REQ-003, AC-002 |
| BEH-003 | All mutation tools share the same workspace containment resolver and reject a project worktree outside that root. | `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file` can mutate any user-local absolute path, including an external worktree. | Existing file operation semantics, diff/text validation, and failure behavior remain. | REQ-002, REQ-003, AC-003, AC-004 |
| BEH-004 | Lexical/physical containment checks reject absolute paths, symlink targets, and traversal outside the workspace. | Workspace containment checks are removed from the generic file-tool path contract. The user-provided absolute path is authoritative for local file operations. | Protected AutoByteus database/root-key/sidecar deny paths continue to win. | REQ-001, REQ-004, AC-005 |
| BEH-005 | Auto-approval suppresses prompts but does not expand the resolver's authorized root, making normal local use impractical. | A single run/tool approval choice controls whether the tool call runs without prompting; file-path authorization is not a second per-path approval workflow. | Product-level approval policy remains separate from path normalization. | REQ-005, AC-006 |
| BEH-006 | `run_bash` may observe external paths while file tools reject them, creating an inconsistent user experience. Its explicit `cwd` path currently reaches the shared workspace-contained resolver. | The five generic file tools share the unrestricted-local path contract, while terminal `cwd` keeps its existing workspace-contained authorization through a terminal-specific resolver. | Shell command behavior and terminal authorization are not widened by the file-tool change. | REQ-002, REQ-005, REQ-007, AC-007, AC-008 |
| BEH-007 | A relative file path can only target the configured workspace; an agent working in an external worktree must spell every path absolutely. | File tools accept an explicit absolute `base_dir` for a relative `path`, so the model can use `src/App.vue` plus a clear worktree directory; without `base_dir`, the path must be absolute. | `base_dir` is per-call only, never persistent shell/file-tool state; absolute `path` remains authoritative. | REQ-003, REQ-008, AC-009, AC-010 |
| BEH-008 | Existing file-tool schemas describe relative paths only in terms of the workspace and do not explain an external relative-path base. | Every generic file-tool schema explicitly explains that relative `path` requires absolute `base_dir`, absolute `path` is used when `base_dir` is omitted, and shell `cd` state is irrelevant. | Tool-specific operation arguments and existing result/error semantics remain unchanged. | REQ-006, REQ-009, AC-011 |

## Investigation Findings

- The supplied Electron trace is a real regression: the requested skill file exists and is readable, but `workspace-path-utils.ts` rejects it before content access because it is outside the selected workspace.
- Commit `240d72207` introduced strict lexical/physical workspace containment while an integration test and tool descriptions still expected absolute external reads.
- The same resolver is used by `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file`; the restriction therefore affects every generic file operation, not only reading.
- Configured skills are already resolved by the server and supplied to the agent as trusted skill resources. No new skill-root propagation is required if absolute file paths are directly accepted.
- The user's normal workflow uses auto-approval and external project worktrees. A granular root-approval design would recreate the approval fatigue the user is reporting.
- The practical contract is therefore an explicitly trusted local filesystem tool contract: absolute paths are accepted for read/write/edit operations; relative paths require an explicit absolute `base_dir`; application-owned secret paths remain protected.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-tool-authorized-root/tickets/in-progress/file-tool-authorized-root/path-authorization-evidence.md` | Retained reproduction, regression, terminal-boundary, and base-directory/schema evidence | REQ-001–REQ-009 | AC-001–AC-011 | Evidence/context; approval `N/A` | Records the observed path, history, terminal boundary, and revised file-tool contract. |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-tool-authorized-root/tickets/in-progress/file-tool-authorized-root/filesystem-access-policy.md` | Intended trusted-local file-tool policy and LLM-facing schema contract | REQ-001–REQ-005, REQ-007–REQ-009 | AC-001–AC-011 | Intended behavior; user approved, architecture approval required | Defines the absolute/base-directory contract, schema wording, and remaining internal/terminal boundaries. |

## Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Root cause classification: `Contract/implementation mismatch` and `Boundary/ownership issue`
- Refactor posture: `Bounded Needed`
- Evidence basis: The resolver implements a workspace sandbox, but the generic file-tool contract and local-agent workflow expect direct absolute-path access. The resolver is shared across all five file tools, so a narrow read-only exception would leave the product inconsistent.
- Requirement or scope impact: The earlier multi-root capability design is superseded. The intended behavior is simpler: remove workspace containment from the generic file-tool resolver, require explicit absolute `base_dir` for relative paths, preserve server-configured protected-path denial, and extract/retain a workspace-contained terminal resolver so the shared implementation change cannot widen terminal `cwd`.

## Recommendations

1. Replace workspace-containment authorization with one trusted-local resolver for all five file tools.
2. Require an explicit absolute `base_dir` for every relative path; when `base_dir` is omitted, require an absolute `path`.
3. Keep the existing deny-real-path list for the AutoByteus database, root key, WAL/SHM/journal, and configured protected descendants.
4. Extract or retain a workspace-contained terminal resolver for `run_bash` and `start_background_process`; do not let the trusted-local file resolver serve terminal `cwd`.
5. Add one optional `base_dir` parameter consistently to all five file tools for relative-path resolution; require it to be absolute and do not persist it between calls.
6. Do not add per-path or per-root approval UI. Auto-approval controls tool-call prompting only.
7. Update the stale integration test and add external absolute read/write/edit coverage for all five tools, base-directory resolution coverage, and terminal containment regression coverage.
8. Make the generated tool schemas self-explanatory: every file tool must document that relative `path` requires absolute `base_dir`, that omitting `base_dir` means `path` must be absolute, and that shell `cd` state is irrelevant.

## Scope Classification (`Small`/`Medium`/`Large`)

`Medium` — the source change is localized to the shared core path resolver and five file tools, but it changes a security boundary and requires package/runtime regression coverage.

## In-Scope Use Cases

- `read_file` reads a configured skill reference outside the selected workspace.
- `write_file` creates or overwrites a file in an external project worktree.
- `edit_file`, `replace_in_file`, and `insert_in_file` modify external absolute paths.
- All five tools support relative paths when paired with an absolute `base_dir`.
- Absolute symlink/traversal paths supplied by the user/agent are no longer rejected solely for leaving the workspace.
- Protected AutoByteus application paths remain denied.

## Out of Scope

- Changing `run_bash` or terminal cwd authorization.
- Allowing the trusted-local file resolver to widen terminal `cwd` implicitly; preserving its current terminal boundary is an in-scope compatibility requirement.
- Changing skill discovery, skill CRUD, skill access modes, or `load_skill`.
- Removing the server's protected database/root-key/sidecar deny list.
- Adding a granular root picker, per-file approval flow, or worktree registration UI.
- Adding persistent `cd` state or requiring `base_dir` for an absolute `path`.
- Changing persisted data or application database schema.

## Functional Requirements

- **REQ-001 — Absolute path support:** For an absolute input, the file-tool resolver shall normalize and use that path without requiring lexical or physical containment under `workspaceRootPath`.
- **REQ-002 — Symmetric file-tool behavior:** `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file` shall call the same unrestricted-local path resolver so read/write/edit behavior does not diverge.
- **REQ-003 — Relative-path behavior:** For a relative input, the resolver shall require and use an explicit absolute `base_dir`. If `base_dir` is absent, the tool shall return an actionable error instructing the model to provide an absolute path or absolute `base_dir`; it shall not silently use `workspaceRootPath`, process cwd, or prior shell `cd` state.
- **REQ-004 — Protected-path denial:** After physical candidate resolution, configured protected application paths shall continue to be denied for every file operation. This deny rule overrides the unrestricted absolute-path behavior.
- **REQ-005 — Approval simplicity:** Path authorization shall not create a second per-path approval workflow. The existing tool/run approval setting, including auto-approval, remains the only user-facing approval gate for these file tools.
- **REQ-006 — Contract and diagnostics:** Tool descriptions, errors, and tests shall state that absolute paths are supported for local file operations and shall not expose secret contents or protected values in errors/logs.
- **REQ-007 — Terminal boundary preservation:** `run_bash` and `start_background_process` shall continue to use a workspace-contained terminal-cwd resolver for explicit `cwd` values. The trusted-local file resolver shall not be imported by terminal cwd after the change unless its containment behavior is preserved by a separate terminal entrypoint.
- **REQ-008 — Conditional base directory:** All five generic file tools shall expose the same optional `base_dir` string. It shall be an absolute directory and is required when `path` is relative; when `base_dir` is omitted, `path` must be absolute. An absolute `path` takes precedence if `base_dir` is also supplied. The value shall apply to one invocation only and shall not mutate agent or shell working-directory state.
- **REQ-009 — LLM-facing schema clarity:** Each of the five generic file-tool schemas shall explicitly state: “If `path` is relative, you must provide an absolute `base_dir`; if `base_dir` is omitted, `path` must be absolute.” The descriptions shall also state that absolute paths are used directly, relative paths are resolved under `base_dir`, relative paths are never resolved from workspace/process/shell `cd` state, and the same wording/semantics apply across all five tools.

## Acceptance Criteria

- **AC-001:** `read_file` succeeds for an existing absolute file outside the workspace and returns the existing content/line-range format.
- **AC-002:** `read_file` succeeds for `/Users/.../autobyteus-skills/.../references/vue-stack.md` when the skill supplies that absolute path.
- **AC-003:** `write_file` succeeds for an absolute file outside the workspace and writes the requested content.
- **AC-004:** `edit_file`, `replace_in_file`, and `insert_in_file` each succeed for an absolute file outside the workspace and preserve their existing operation semantics.
- **AC-005:** Every file operation continues to reject the configured application database, root-key, WAL/SHM/journal, and protected descendants without logging their contents.
- **AC-006:** With auto-approval enabled, no additional path/root prompt is required for an absolute user-local file path; with auto-approval disabled, the existing tool approval mechanism remains the only prompt boundary.
- **AC-007:** Existing file operation behavior for absolute paths and the rest of the source/package regression suite remain green; stale workspace-relative expectations are reconciled with the explicit `base_dir` contract.
- **AC-008:** Explicit terminal `cwd` inside the workspace succeeds, while an external `cwd` remains rejected by the terminal-specific workspace-contained resolver; changing the file-tool resolver does not alter this behavior.
- **AC-009:** A relative `path` with an absolute `base_dir` resolves under that directory for `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file`.
- **AC-010:** A relative `path` without `base_dir` returns an actionable error even when a workspace is configured, instructing the model to provide an absolute path or absolute `base_dir`. An absolute `path` works without `base_dir`; if both are supplied, the absolute `path` takes precedence and `base_dir` is ignored consistently across all five tools.
- **AC-011:** The serialized schema for each of the five tools contains clear descriptions for `path` and optional `base_dir` that communicate the same precedence/fallback/error rules and explicitly state that file paths are not resolved from prior shell `cd` state.

## Constraints / Dependencies

- The packaged Electron runtime may load `autobyteus-ts` from built `dist`; source changes require package rebuild/wiring before user verification.
- `configureFileToolDeniedPaths` and its server callers currently protect application-owned files and must be preserved unless separately approved.
- The file resolver must retain safe normalization/physical resolution needed to identify protected paths, while removing workspace containment checks.
- Terminal cwd must retain a separate workspace-contained resolver/entrypoint.
- `base_dir` must be normalized per call and must not become mutable runtime CWD state.
- No `AgentConfig`, `AgentRuntimeState`, `AgentContext`, `SkillService`, or workspace-registration change is required for this target.

## Persisted Data Outcome

- Required outcome: `Not Affected`.
- No persisted schema or data meaning changes. Protected application files remain denied; no migration is required.

## Assumptions

- AutoByteus is a trusted local desktop/server agent product where users intentionally choose auto-approval for routine work.
- “Anywhere” means any user-local path accepted by the operating system, except protected AutoByteus internal paths that prevent application corruption or secret leakage.
- Absolute paths supplied by configured skills and project worktrees are legitimate supported inputs.

## Risks / Open Questions

- This deliberately weakens the generic file-tool sandbox. The product must present the local-trust posture clearly in documentation/settings.
- `run_bash` may already have broader process-level filesystem reach; terminal alignment is a separate security review.
- If the user explicitly wants agents to read/write AutoByteus's own database or root-key files too, that must be a separate explicit requirement because it can corrupt the running application and expose secrets.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| UC-001 external skill read | REQ-001, REQ-002, REQ-004, REQ-006 |
| UC-002 external worktree write/edit | REQ-001, REQ-002, REQ-004 |
| UC-003 base-directory-relative file operation | REQ-003, REQ-006, REQ-008, REQ-009 |
| UC-004 auto-approval without path prompts | REQ-005, REQ-006 |
| UC-005 protected application-path denial | REQ-004, REQ-006 |
| UC-006 terminal cwd boundary preservation | REQ-007 |
| UC-007 external worktree relative file operation | REQ-003, REQ-008, REQ-009 |
| UC-008 LLM interprets file-tool schema correctly | REQ-006, REQ-009 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-001–AC-002 | External absolute reads, including managed skill references. |
| AC-003–AC-004 | External absolute writes and edits across all mutation tools. |
| AC-005 | Protected application path regression matrix. |
| AC-006 | Approval behavior remains one user-facing gate. |
| AC-007 | Source/package/runtime compatibility and stale-test reconciliation. |
| AC-008 | Terminal cwd containment regression after resolver extraction. |
| AC-009–AC-010 | Optional `base_dir` relative-path behavior and actionable missing-base error. |
| AC-011 | Schema serialization and consistent LLM-facing path-resolution descriptions across all five tools. |

## Approval Status

`User-approved trusted-local file-tool behavior: unrestricted user-local absolute read/write/edit paths, relative paths requiring explicit absolute base_dir, and protected AutoByteus internal paths. Current architecture re-review is pending; terminal cwd containment must remain isolated from the trusted-local file resolver.`
