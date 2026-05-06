# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete
- Current Status: Requirement gap resolved; revised design artifacts prepared after implementation pause
- Investigation Goal: Verify media path policy ownership for outputs, input images, and masks; determine the correct scope for removing the workspace/Downloads/temp application-level restriction.
- Scope Classification (`Small`/`Medium`/`Large`): Small-to-Medium
- Scope Classification Rationale: The change still centers on one media path resolver, but the policy now covers both media writes and media reads.
- Scope Summary: Remove application-level workspace/Downloads/temp allowlist restriction for server-owned media local paths: outputs, input images, and masks. Keep the generic shared safe-path helper unchanged for unrelated tools.
- Primary Questions To Resolve:
  - Which file owns media output path resolution? Answer: `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts`.
  - Which file owns local input image/mask resolution? Answer: the same `MediaPathResolver.resolveInputImageReference` path.
  - Does the common generate-then-edit workflow require removing input restrictions too? Answer: yes, the user explicitly clarified this on May 6, 2026.
  - Should `autobyteus-ts/src/utils/file-utils.ts` be changed globally? Answer: no; the requirement is media-specific.
  - Should current implementation work be kept? Answer: yes, keep as a base and revise from output-only to output+input+mask.

## Request Context

The user first asked whether `generate_speech`, `generate_image`, and `edit_image` restrict output paths to workspace/Downloads. After the investigation confirmed this, the user requested removing the restriction for all three tools because temp-workspace runs may need outputs saved to another task-specific path.

A first design was produced for output paths only, passed architecture review, and implementation started. Implementation was then paused after the user said requirements/refactor implications were not clarified. The user subsequently clarified the requirement gap: for image workflows, a generated image output path commonly becomes a later `edit_image` input path, so keeping the same workspace/Downloads/temp restriction for `input_images` and `mask_image` is also incorrect.

The refined requirement is therefore: remove the application-level local path allowlist for media outputs and media local inputs/masks, while preserving normal OS/runtime permissions and local input existence checks.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-media-output-path-restriction`
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-media-output-path-restriction/autobyteus-server-ts/tickets/done/remove-media-output-path-restriction`
- Current Branch: `codex/remove-media-output-path-restriction`
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-media-output-path-restriction`
- Bootstrap Base Branch: `origin/personal`
- Remote Refresh Result: `git fetch origin personal` succeeded on May 6, 2026.
- Task Branch: `codex/remove-media-output-path-restriction`
- Expected Base Branch (if known): `origin/personal`
- Expected Finalization Target (if known): `personal`
- Bootstrap Blockers: None
- Notes For Downstream Agents: Implementation applied output-only local changes before the requirement gap. Do not discard them; revise them to include input/mask path behavior.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-06 | Setup | `git fetch origin personal`; `git worktree add -b codex/remove-media-output-path-restriction /Users/normy/autobyteus_org/autobyteus-worktrees/remove-media-output-path-restriction origin/personal` | Bootstrap dedicated task workspace from fresh tracked base | Worktree created at HEAD `4df1f718` on branch `codex/remove-media-output-path-restriction` tracking `origin/personal` | No |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` | Identify shared service path for three media tools | `generateImage`, `editImage`, and `generateSpeech` all call `MediaPathResolver.resolveOutputFilePath`; image tools also call `resolveInputImageReferences` and `resolveInputImageReference` for masks | Revise implementation to cover both method families |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts` | Identify path policy owner | `resolveOutputFilePath` and `resolveInputImageReference` both currently rely on workspace context; original source used `resolveSafePath` for both local outputs and local inputs | Replace media-local path policy with media-specific normalization |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | Identify tool contract/schema text | Original descriptions mentioned safe local file paths and old output allowlist; current implementation updated output wording only | Update input/mask wording too |
| 2026-05-06 | Code | `autobyteus-ts/src/utils/file-utils.ts` | Inspect allowlist helper | `resolveSafePath` permits only workspace, Downloads, and OS temp; should remain unchanged for unrelated tools | No |
| 2026-05-06 | Code | `autobyteus-ts/src/utils/download-utils.ts` | Check output write mechanics | `downloadFileFromUrl` creates target directories recursively and writes/copies/downloads to the given path | No |
| 2026-05-06 | Code | `autobyteus-server-ts/src/agent-execution/backends/codex/media/build-media-dynamic-tool-registrations.ts`; `autobyteus-server-ts/src/agent-execution/backends/claude/media/build-claude-media-tool-definitions.ts` | Verify runtime integrations | Codex and Claude both execute through manifest/service/resolver, so resolver change covers runtime surfaces | No |
| 2026-05-06 | Test | `autobyteus-server-ts/tests/unit/agent-tools/media/media-tool-path-resolver.test.ts` | Inspect current implementation tests | Current tests accept absolute external outputs but still reject `/etc/passwd` input because of old input allowlist | Revise tests for external existing input acceptance and missing/non-file rejection |
| 2026-05-06 | Test | `autobyteus-server-ts/tests/e2e/media/server-owned-media-tools.e2e.test.ts` | Inspect current implementation e2e path expectations | Current e2e still expects `/etc/passwd` input rejection by allowlist and external output acceptance | Revise to cover external input acceptance and generate-then-edit path flow if practical |
| 2026-05-06 | Artifact | `design-review-report.md` | Understand prior architecture decision | Prior output-only design passed because input reads were explicitly out of scope then | Superseded by refined requirement; return to architecture review |
| 2026-05-06 | Artifact | `implementation-pause-requirement-gap.md` | Understand downstream pause | Implementation paused before code review; focused Vitest passed for output-only change | Use as rework context |
| 2026-05-06 | Command | `git -C /Users/normy/autobyteus_org/autobyteus-worktrees/remove-media-output-path-restriction status --short --branch` | Inspect local state after implementation pause | Modified files: resolver, schema, resolver tests, registration tests, e2e media test; artifacts untracked | Implementation should revise existing changes |
| 2026-05-06 | Command | Focused Vitest recorded in `implementation-pause-requirement-gap.md` | Validation state before pause | 4 files / 17 tests passed after `pnpm install`, but tests reflect output-only design | Re-run after revised implementation |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: media tool invocation (`generate_image`, `edit_image`, or `generate_speech`) from AutoByteus, Codex dynamic tools, or Claude MCP media tools.
- Current execution flow: runtime tool exposure -> media tool manifest parse/execute -> `MediaGenerationService` -> `MediaPathResolver` for output and input paths -> provider client generation/edit/speech -> `downloadFileFromUrl` writes output -> tool returns `{ file_path }`.
- Ownership or boundary observations: `MediaPathResolver` is the correct media path policy owner. The prior design correctly located the change there but incorrectly scoped it to output paths only.
- Current behavior summary from original source: absolute output and local input paths outside workspace/Downloads/temp are rejected. Current paused implementation has removed that restriction for outputs only; input images/masks still retain it.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture evidence summary: A local refactor inside `MediaPathResolver` is now needed so output and input/mask local path normalization share one media-specific policy instead of duplicating branches or continuing to borrow the generic safe-path helper. No broader subsystem refactor is needed.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| User clarification | Generated image output path can become later edit image input path. | Output-only relaxation is incomplete. | Expand requirements/design. |
| `media-generation-service.ts` | `editImage` consumes both output and input/mask path resolution from the same resolver. | One owner can still handle the complete workflow. | Revise resolver. |
| `media-tool-path-resolver.ts` | Input references still call `resolveSafePath` in paused implementation. | Current implementation must be revised. | Remove `resolveSafePath` from media local input handling. |
| `resolveSafePath` | Generic helper remains workspace/Downloads/temp allowlist. | Do not change globally. | Keep unrelated tools untouched. |
| Prior architecture review | Passed output-only design based on old scope. | Review result is stale after requirement change. | Return revised package to architecture reviewer. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `autobyteus-server-ts/src/agent-tools/media/media-generation-service.ts` | Orchestrates media generation/edit/speech operations. | Central service already routes all path decisions through `MediaPathResolver`. | No service structure change expected. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-path-resolver.ts` | Resolves media output paths and input image references. | Must become the owner of unrestricted absolute local media path normalization for outputs and inputs/masks. | Primary implementation file. |
| `autobyteus-server-ts/src/agent-tools/media/media-tool-parameter-schemas.ts` | Builds tool argument schemas/descriptions. | Must update output, input, and mask descriptions. | Schema contract must match new behavior. |
| `autobyteus-ts/src/utils/file-utils.ts` | Shared safe path utility for workspace/Downloads/temp policy. | Not appropriate for media local path policy after clarification. | Leave unchanged for unrelated tools. |
| `autobyteus-ts/src/utils/download-utils.ts` | Downloads/copies generated media to output path. | Creates parent directories and surfaces write errors. | No change. |
| Runtime backend media adapters | Expose media tools to Codex/Claude. | Thin wrappers around manifest/service. | No direct change expected. |
| Media tests | Validate resolver/schema/e2e behavior. | Existing paused tests are output-only. | Revise/add input/mask path coverage. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-06 | Probe | Node script invoking original `MediaPathResolver.resolveOutputFilePath` for relative, Downloads, temp, and external absolute paths | External absolute output path under `/Users/normy/autobyteus_org/autobyteus-private-agents/...` rejected. | Original output root cause confirmed. |
| 2026-05-06 | Test | Focused Vitest recorded by implementation engineer after output-only implementation | 4 files / 17 tests passed. | Baseline is no longer sufficient; update tests for input/mask paths and rerun. |

## External / Public Source Findings

None; this is an internal code behavior change.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: none for path resolver/unit tests.
- Required config, feature flags, env vars, or accounts: none for path resolver/unit tests.
- External repos, samples, or artifacts cloned/downloaded for investigation: none.
- Setup commands that materially affected the investigation: dedicated worktree creation from `origin/personal`; implementation engineer ran `pnpm install` in the task worktree.
- Cleanup notes for temporary investigation-only setup: external media input test files should be created in temp/home test folders and cleaned up by tests.

## Findings From Code / Docs / Data / Logs

- The path restriction is not a provider limitation; it is enforced by server media path resolution before provider use.
- `MediaPathResolver` is still the right owner. The scope now includes both local media write destinations and local media read sources.
- `resolveSafePath` is too broad a shared policy helper for the clarified media workflow and should no longer be used for media local input/output paths.
- Local media input validation should not disappear entirely: after path normalization, files should still be checked for existence and `isFile()`.
- Relative paths should remain workspace-relative to avoid ambiguous traversal semantics; absolute paths are the mechanism for external locations.

## Constraints / Dependencies / Compatibility Facts

- OS and runtime sandbox permissions remain authoritative after application-level allowlist removal.
- URL/data URI media inputs are unaffected.
- Non-media tools and the generic safe-path helper are out of scope.
- Current local implementation should be revised from output-only behavior; no need to revert wholesale.

## Open Unknowns / Risks

- Need architecture reviewer to re-review because prior pass was based on stale output-only scope.
- Need implementation validation to prove the generate-output-then-edit-input path chain.
- Removing local input allowlist for media tools increases local readable path scope for these tools; this is an explicit clarified product requirement.

## Notes For Architect Reviewer

Please treat the prior design review as superseded by the requirement gap. The revised design keeps the same owner (`MediaPathResolver`) but changes the policy: all local media paths for these tools should use media-specific normalization, not `resolveSafePath`. The recommended implementation is a private helper that normalizes absolute paths unrestricted, resolves relative paths inside workspace with traversal rejection, and lets input-specific callers add existence/is-file validation.
