# Design Spec

## Current-State Read

The relevant production paths are:

`Agent tool call -> generic file tool -> trusted-local file resolver -> filesystem`

`Terminal tool call -> resolveExecutionCwd -> workspace-contained terminal resolver -> shell process`

`workspace-path-utils.ts` currently treats `workspaceRootPath` as a mandatory containment root for both absolute and relative inputs. It then resolves the candidate physically and applies the configured denied-real-path list. Because configured skills and external project worktrees normally live outside the selected workspace, all five generic file tools reject legitimate absolute paths with `FILE_TOOL_PATH_OUTSIDE_AUTHORIZED_ROOT`. `execution-cwd.ts` also calls this resolver for explicit terminal `cwd`, so the file resolver cannot be repurposed without first separating terminal containment.

The resolver is shared by:

- `read_file`
- `write_file`
- `edit_file`
- `replace_in_file`
- `insert_in_file`

The server already configures protected application database/root-key/WAL/SHM/journal paths through `configureFileToolDeniedPaths`. That deny boundary is independent of workspace containment and remains valuable.

## Intended Change

Replace workspace-containment authorization for the five file tools with one trusted-local file-tool path resolver, while retaining a separate terminal resolver:

1. Absolute `path`: normalize and use the supplied absolute path without requiring workspace containment; ignore `base_dir` when `path` is absolute.
2. Relative `path` with absolute `base_dir`: resolve under `base_dir`.
3. Relative `path` without `base_dir`: return an actionable error requiring an absolute `path` or absolute `base_dir`; never infer a base from `workspaceRootPath`, process cwd, or shell state.
4. Protected path check: resolve the candidate physically as needed, then reject configured AutoByteus protected paths with the existing `FILE_TOOL_PATH_DENIED` behavior.
5. Operation: let the existing read/write/edit/replace/insert implementation proceed unchanged.
6. Terminal `cwd`: use a separate workspace-contained resolver so the trusted-local file behavior cannot widen `run_bash` or `start_background_process`.

All five generic file tools call the same resolver and expose the same optional `base_dir`; the parameter is conditionally required when `path` is relative. No skill-root propagation, worktree registration, root-capability array, approval UI, or `AgentConfig`/`AgentRuntimeState` change is needed for this target.

This is intentionally a trusted-local contract. It does not claim to be a host filesystem sandbox. `run_bash`/terminal cwd retain their existing workspace-contained explicit-`cwd` policy through a separate resolver.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Requirement / Acceptance IDs | Existing Path | Approved Change | Spine |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | REQ-001, REQ-003, REQ-008; AC-001–AC-002, AC-009–AC-010 | Absolute/relative candidate -> workspace containment -> outside-root error | Absolute candidate proceeds without workspace containment; relative candidate requires absolute `base_dir` | DS-001, DS-003 |
| BEH-002 | User | REQ-001, REQ-003; AC-002 | Skill guidance supplies an absolute path outside workspace | Skill reference reads succeed | DS-001 |
| BEH-003 | User | REQ-002; AC-003–AC-004 | Mutation tools share the same outside-root rejection | External worktree writes/edits succeed | DS-001, DS-003 |
| BEH-004 | Security | REQ-004; AC-005 | Physical candidate is checked against protected application paths | Protected deny list remains authoritative without workspace containment | DS-003 |
| BEH-005 | UX | REQ-005; AC-006 | Approval may be automatic, but path resolver still blocks external paths | No second per-path/root approval workflow is introduced | DS-002 |
| BEH-006 | Consistency / scope | REQ-002, REQ-006, REQ-007; AC-007–AC-008 | Five tools and terminal share resolver; repurposing would widen terminal `cwd` | File tools use trusted-local resolver; terminal uses contained resolver | DS-001, DS-003 |
| BEH-007 | Usability | REQ-003, REQ-008; AC-009–AC-010 | Relative external-worktree paths require absolute spelling | Per-call absolute `base_dir` resolves relative file paths; a relative path without it fails | DS-001, DS-003 |
| BEH-008 | Schema contract | REQ-006, REQ-009; AC-011 | Tool schemas describe only workspace-relative behavior and omit `base_dir` guidance | Schemas state that relative `path` requires absolute `base_dir`, while omitted `base_dir` requires absolute `path` | DS-001, DS-003 |

## Relevant Supplemental Task Artifacts

| Artifact Path | Purpose | Related Requirements / Acceptance IDs | Relationship | Status |
| --- | --- | --- | --- | --- |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-tool-authorized-root/tickets/done/file-tool-authorized-root/path-authorization-evidence.md` | Reproduction, history, revised security rationale, terminal boundary, and base-directory/schema evidence | REQ-001–REQ-009; AC-001–AC-011 | Retained evidence for the source and schema change | Evidence/context; approval `N/A` |
| `/Users/normy/autobyteus_org/autobyteus-worktrees/file-tool-authorized-root/tickets/done/file-tool-authorized-root/filesystem-access-policy.md` | Trusted-local absolute/base-directory policy, schema contract, and terminal boundary | REQ-001–REQ-005, REQ-007–REQ-009; AC-001–AC-011 | Defines intended user-visible behavior, schema wording, and resolver separation | Intended behavior; user approved, architecture approval required |

## Task Design Health Assessment (Mandatory)

- Change posture: `Bug Fix`
- Current design issue: `Yes`
- Root cause: `Contract/implementation mismatch` and `Boundary/ownership issue`
- Refactor needed: `Bounded`
- Evidence: strict workspace containment was added to a shared resolver, but the generic file-tool contract and local workflow require absolute paths outside the workspace. The same restriction affects read and mutation tools.
- Design response: remove workspace containment from the generic file-tool resolver, require an explicit per-call absolute `base_dir` for relative inputs, preserve protected application-path denial, and extract/retain a workspace-contained terminal resolver.
- Why not a multi-root policy: it would reproduce the same operational burden through root registration/approval and is unnecessary for the user's trusted local auto-approved workflow.
- Residual risk: these tools gain broad local filesystem access. That risk is intentional and must be documented. Terminal command policy remains a separate review.

## Terminology

- **Absolute file input:** A path beginning at the operating-system filesystem root; it is accepted directly after normalization.
- **Base-directory-relative input:** A non-absolute path resolved under the supplied absolute `base_dir`; without `base_dir`, the tool returns an actionable error.
- **Per-call `base_dir`:** An optional absolute directory used only to resolve a relative file `path`; it is not persistent CWD state.
- **Protected path:** A server-configured AutoByteus database, root-key, WAL/SHM/journal path, or protected descendant denied regardless of absolute-path mode.
- **Trusted-local file-tool mode:** The intended behavior of these generic file tools: local absolute reads and mutations without per-path prompts.

## LLM-Facing Tool Schema Contract

The five generic file tools must expose the same path-resolution language in their serialized parameter schemas. The descriptions are part of the behavior contract because the LLM chooses whether to send an absolute path, a relative path, or `base_dir` from this schema.

Canonical `path` description:

> Absolute filesystem path, or a relative file path paired with `base_dir`. If `path` is relative, you must provide an absolute `base_dir`. If `base_dir` is omitted, `path` must be absolute. Absolute paths are used directly and take precedence if `base_dir` is also supplied. Relative paths are never resolved from the configured workspace, process cwd, or prior shell `cd` state.

Canonical `base_dir` description:

> Optional absolute directory used only when `path` is relative; it is required for a relative `path`. If `path` is absolute, omit `base_dir` (an absolute path takes precedence if both are supplied). This applies to this tool call only and does not change shell or agent working-directory state. Do not provide a relative `base_dir`.

Every schema keeps the operation-specific arguments (`content`, `patch`, `old_text`, `new_text`, anchors, and line-range options) unchanged. Only `base_dir` is added, with type `string` and `required: false`, and the `path` description is replaced by the canonical wording above. The same parameter name, type, optionality, and semantics are used by `read_file`, `write_file`, `edit_file`, `replace_in_file`, and `insert_in_file`.

The implementation must add schema-serialization tests that inspect both `path` and `base_dir` descriptions for every tool, rather than relying only on resolver tests.

## Legacy Removal Policy

- Remove workspace containment as an authorization rule for absolute inputs.
- Remove the contradictory “absolute paths are accepted”/implementation mismatch by making the implementation match the contract.
- Remove any proposed read-only-skill-root exception, generic capability-root list, or external-worktree approval fallback from this ticket.
- Do not remove the protected application-path deny list.
- Do not create a second file resolver branch based on the five caller/tool types; all five file tools use one path contract. The terminal resolver is intentionally a separate boundary because its authorization contract differs.

## Persisted Data / State Transition Decision

- Persisted data: `Not Affected`.
- No schema, migration, or stored-record change is required.
- Protected application files remain deny-only; the change affects in-memory path resolution.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behaviors | Start | End | Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary end-to-end | BEH-001–BEH-003, BEH-006–BEH-008 | Model/tool input | File read or mutation | Generic file-tool resolver + operation | Shows schema-guided skill/worktree absolute paths and `base_dir` relative paths reaching the filesystem. |
| DS-002 | Return/approval | BEH-005–BEH-006 | Tool invocation | Tool result/error/activity | Existing tool/runtime event path | Confirms no new approval or UI event is needed. |
| DS-003 | Bounded local | BEH-001, BEH-003, BEH-004, BEH-006–BEH-008 | Candidate path + operation | Normalized physical path or stable error | Separate file and terminal path boundaries | Removes workspace containment only for file tools, preserves terminal containment/protected checks, and keeps schema semantics aligned with the resolver. |

## Primary Execution Spine

`Tool invocation -> read/write/edit/replace/insert tool -> resolveFileToolPath(path, base_dir?) -> protected-path check -> filesystem operation -> normal tool result`

Terminal: `Terminal tool -> resolveExecutionCwd -> workspace-contained terminal resolver -> shell process`

## Spine Narratives

| Spine ID | Narrative | Main Nodes | Governing Owner | Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A model or skill supplies an absolute path, or a relative path paired with an absolute `base_dir`. The selected file tool passes it through the shared resolver. Since absolute paths are trusted in this local mode, a skill file or external worktree file reaches the existing operation implementation. | Five generic file tools, `resolveFileToolPath`, filesystem | Core file-tool boundary | Skill prompt formatting, project/worktree location |
| DS-002 | The file tool returns its existing content/result/error through the existing runtime event stream. Approval policy may auto-approve the call, but no path-specific approval event is added. | Tool execution, runtime event/activity | Existing runtime | Prompt/approval settings |
| DS-003 | The file resolver validates input presence, requires an absolute `base_dir` for relative paths, normalizes absolute paths, resolves physical candidates only as needed for protected-path comparison, and rejects protected paths. A separate terminal resolver retains workspace containment for explicit `cwd`. | `workspace-path-utils.ts`, `execution-cwd.ts`, filesystem path primitives | File/terminal path boundaries | Platform path semantics and non-existent descendants |

## Ownership Map

- `workspace-path-utils.ts` owns trusted-local file path normalization and protected-path enforcement.
- `execution-cwd.ts` or an extracted terminal path helper owns workspace-contained terminal `cwd` resolution.
- Each generic file tool owns its existing content or mutation semantics after resolution.
- `configureFileToolDeniedPaths` remains the source of protected application-path authority.
- `SkillService` owns skill discovery, but file tools do not need to call it or receive skill roots.
- Approval settings own whether tool calls prompt; they do not participate in path resolution.
- `run_bash`/terminal cwd behavior remains unchanged; only its resolver ownership is separated to prevent accidental widening.

## Interface Boundary Mapping

| Interface | Responsibility | Input Shape | Decision |
| --- | --- | --- | --- |
| `resolveFileToolPath(context, inputPath, baseDir?)` | Normalize absolute/relative input and enforce protected-path denial | `AgentId + workspaceRootPath + path + optional absolute baseDir` | Absolute path wins; baseDir applies only to relative input. |
| `resolveTerminalCwd(context, cwd)` | Resolve explicit terminal cwd under workspace containment | `AgentId + workspaceRootPath + cwd` | Must not inherit trusted-local file semantics. |
| `read_file` | Read authorized content/line range | Context + path/base_dir/options | Call trusted-local file resolver. |
| `write_file` | Create/overwrite content | Context + path/base_dir/content | Call trusted-local file resolver. |
| `edit_file` | Apply unified diff | Context + path/base_dir/diff | Call trusted-local file resolver. |
| `replace_in_file` | Exact replacement | Context + path/base_dir/text | Call trusted-local file resolver. |
| `insert_in_file` | Exact insertion | Context + path/base_dir/text | Call trusted-local file resolver. |
| `configureFileToolDeniedPaths` | Protect AutoByteus internal paths | Server real paths | Remains unchanged. |

Schema boundary: each file tool exposes `path: string` (required) and `base_dir: string` (optional) with the canonical descriptions above. The schema must state that `base_dir` is required when `path` is relative and that omitting `base_dir` requires an absolute `path`. Operation-specific parameters remain as currently defined. Schema text must not imply that a relative path uses workspace, process CWD, or prior terminal state.

## Interface Boundary Check

- Responsibility is singular: one resolver handles file-tool path policy, a separate resolver handles terminal cwd, and each tool handles its operation.
- Identity is explicit: the model supplies a path, but only protected-path configuration can deny it; no hidden root list is accepted.
- Ambiguous selector risk is low: absolute versus relative is a standard OS path distinction.
- Approval is not mixed into the resolver: auto-approval affects invocation flow only.

## Existing Capability / Subsystem Reuse Check

| Need | Existing Area | Decision | Why |
| --- | --- | --- | --- |
| File path normalization | `workspace-path-utils.ts` | Extend | Existing resolver remains the file boundary after terminal policy extraction. |
| Terminal cwd authorization | `execution-cwd.ts` / terminal path helper | Extend/extract | Preserve workspace containment independently of file-tool trusted-local behavior. |
| Protected application paths | Server deny-path configuration | Reuse | Existing security invariant remains applicable. |
| File operations | Five existing tools | Reuse | Only resolver call/contract changes. |
| Skill references | `SkillService` and prompt formatter | Reuse unchanged | Absolute paths now work without new propagation. |

## Draft / Final File Responsibility Mapping

| File | Responsibility | Change |
| --- | --- | --- |
| `autobyteus-ts/src/tools/file/workspace-path-utils.ts` | Shared file-tool path resolution | Remove workspace lexical/physical containment for file tools; require absolute `base_dir` for relative paths; retain protected-path checks. |
| `autobyteus-ts/src/tools/file/read-file.ts` | Read operation | Add optional `base_dir`; use trusted-local resolver. |
| `autobyteus-ts/src/tools/file/write-file.ts` | Write operation | Add optional `base_dir`; use trusted-local resolver. |
| `autobyteus-ts/src/tools/file/edit-file.ts` | Unified-diff edit | Add optional `base_dir`; use trusted-local resolver. |
| `autobyteus-ts/src/tools/file/replace-in-file.ts` | Exact replacement | Add optional `base_dir`; use trusted-local resolver. |
| `autobyteus-ts/src/tools/file/insert-in-file.ts` | Exact insertion | Add optional `base_dir`; use trusted-local resolver. |
| `autobyteus-ts/src/tools/terminal/execution-cwd.ts` | Terminal cwd boundary | Retain/extract workspace-contained resolver independent of trusted-local file behavior. |
| `autobyteus-ts/src/tools/file/*` schemas | LLM-facing path contract | Add consistent `base_dir` parameter and canonical `path`/`base_dir` descriptions to all five tool schemas. |
| `autobyteus-ts/tests/unit/tools/file/workspace-path-utils.test.ts` | Resolver contract | Replace outside-workspace rejection assertions with absolute-path success and protected-path denial. |
| `autobyteus-ts/tests/integration/tools/file/read-file.test.ts` | Read contract | Keep/repair external absolute-read success expectation. |
| `autobyteus-ts/tests/integration/tools/file/*` | Mutation contract | Add external absolute write/edit/replace/insert coverage. |
| `autobyteus-ts/tests/unit/tools/file/*` schema coverage | LLM-facing contract | Assert all five serialized schemas expose consistent `path`/`base_dir` descriptions and optionality. |
| `autobyteus-ts/tests/unit/tools/terminal/run-bash.test.ts` and terminal tests | Terminal boundary | Preserve workspace-contained explicit cwd after resolver extraction. |

No server, UI, `AgentConfig`, `AgentRuntimeState`, `AgentContext`, skill-service, or persisted-data change is expected. Core terminal path code and tests are touched only to preserve the existing terminal boundary.

## Shared Structure / Data Model Tightness Check

- Keep one file resolver context: `agentId`, optional `workspaceRootPath`, input path, and optional per-call absolute `base_dir`.
- Do not add `allowedRoots`, `readRoots`, `writeRoots`, `executeRoots`, or per-tool capability arrays for this change.
- Keep terminal cwd context separate from trusted-local file resolution.
- Keep protected real paths in the existing process-level denied-path configuration rather than duplicating them into tool arguments.

## Applied Patterns

- Existing path normalization and physical-resolution pattern, retained for the explicit base-directory contract and protected-path comparison.
- Existing physical resolution pattern, retained only for protected-path comparison.
- Existing `FILE_TOOL_PATH_DENIED` and missing-workspace error contracts.

## Concrete Examples

| Case | Expected flow |
| --- | --- |
| Skill reference | `read_file(/Users/.../autobyteus-skills/.../vue-stack.md)` -> normalize -> protected check -> read succeeds. |
| External worktree | `edit_file(/Users/.../worktree/src/App.vue, diff)` -> normalize -> protected check -> edit succeeds. |
| Relative project file without base | `write_file(src/App.vue)` -> actionable error requiring an absolute path or absolute `base_dir`. |
| Relative external worktree file | `write_file(src/App.vue, base_dir=/Users/.../worktree)` -> resolve under base_dir -> write succeeds. |
| Relative file without base | `read_file(src/App.vue)` without `base_dir` -> actionable error requiring an absolute path or absolute `base_dir`, even if a workspace exists. |
| Protected internal file | `write_file(/.../database.sqlite)` -> physical protected-path check -> `FILE_TOOL_PATH_DENIED`. |
| External terminal cwd | `run_bash(cwd=/Users/.../worktree)` -> terminal-specific workspace containment -> existing rejection; file resolver change does not widen it. |

## Backward-Compatibility Rejection Log

| Candidate | Decision | Replacement |
| --- | --- | --- |
| Read-only configured-skill root exception | Rejected | All absolute file-tool paths use the same trusted-local contract. |
| Explicit worktree/root registration | Rejected for this ticket | Absolute external paths work directly. |
| Generic read/write/execute capability policy | Rejected for this ticket | One shared file-tool resolver; terminal remains separately contained. |
| Restore only `read_file` | Rejected | All five file tools must be symmetric. |
| Remove protected application-path deny list | Rejected | Preserve existing deny configuration. |

## Change / Refactor Sequence

1. Extract or retain a workspace-contained terminal resolver used by `resolveExecutionCwd`, `run_bash`, and `start_background_process`.
2. Update the file resolver to distinguish absolute from relative input, require absolute `base_dir` for relative input, and remove workspace containment only for file tools.
3. Retain protected-path physical checks and stable errors.
4. Add the same optional `base_dir` schema/argument to all five file tools, enforce it for relative inputs, and verify they use the revised resolver.
5. Update the five tool schemas with canonical path/base descriptions, then add schema-serialization assertions.
6. Update unit/integration tests for external absolute reads, every mutation tool, base-directory resolution, missing-base errors, and terminal containment.
7. Update tool descriptions/comments that imply absolute file paths are rejected; keep terminal `cwd` documentation aligned with its contained behavior.
7. Build `autobyteus-ts`, run focused core tests, then perform downstream package/runtime validation.

## Key Tradeoffs

- Usability improves substantially for skills, worktrees, and local project tooling.
- The generic file tools become trusted-local operations and no longer provide a workspace sandbox.
- Keeping the protected-path deny list prevents the agent from accidentally reading or corrupting AutoByteus's own secrets/storage.
- A later product decision can add a true sandbox profile, but it must not silently reappear as a contradiction in the trusted-local file-tool contract.

## Risks

- A malicious prompt or skill can request arbitrary local file reads/writes; this is an intentional consequence of the approved trusted-local mode.
- Terminal commands may already have comparable process-level access, but explicit terminal `cwd` must not be widened by this resolver change.
- The packaged app must be rebuilt; changing source alone will not alter the currently installed Electron artifact.
