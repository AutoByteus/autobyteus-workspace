# Requirements Doc

## Status (`Draft`/`Design-ready`/`Refined`)

Refined

## Goal / Problem Statement

Users can run media tools from a temporary workspace but still need generated media saved to and later reused from task-relevant external folders. The current server-owned media tools reject local media paths unless they are under the run workspace, `~/Downloads`, or the system temp directory. That restriction is not only bad for outputs; it also breaks a common media workflow where a generated image saved to an external absolute path is later supplied to `edit_image` as `input_images` or `mask_image`.

Remove the application-level workspace/Downloads/temp local-path allowlist restriction for the server-owned `generate_speech`, `generate_image`, and `edit_image` media paths:

- `output_file_path` for `generate_speech`, `generate_image`, and `edit_image`.
- `input_images` for `generate_image` and `edit_image` when entries are local filesystem paths or `file:` URLs.
- `mask_image` for `edit_image` when it is a local filesystem path or `file:` URL.

Local absolute media paths should be accepted based on normal OS/server-process readability or writability, not based on workspace/Downloads/temp location.

## Investigation Findings

The reported `generate_speech` failure is caused by `MediaPathResolver.resolveOutputFilePath` delegating to the shared `autobyteus-ts` `resolveSafePath` helper. All three server-owned media generation operations (`generateImage`, `editImage`, and `generateSpeech`) call that resolver before provider generation/write.

A follow-up requirement clarification revealed the same allowlist is also wrong for local image inputs: `MediaPathResolver.resolveInputImageReference` uses `resolveSafePath` for local paths before checking file existence. This blocks a generated external output path from becoming the next `edit_image` input. Therefore the correct owner remains `MediaPathResolver`, but the policy change must cover both local media write destinations and local media read sources for these media tools. The generic shared `resolveSafePath` helper should remain unchanged for unrelated tools.

Implementation had started from the earlier output-only design and was paused after the user identified the input-path requirement gap. The current local implementation should be revised, not discarded.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Behavior Change
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Boundary Or Ownership Issue
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Refined Local Refactor Needed
- Evidence basis: The same media path resolver owns both output path resolution and local input image reference resolution. The old generic safe-path helper imposes a workspace/Downloads/temp policy that conflicts with the media workflow.
- Requirement or scope impact: Expand from output-only path relaxation to local media path relaxation for outputs, input images, and masks. Keep the change within the media path resolver and schema/test surfaces; do not change unrelated tools or the generic `resolveSafePath` helper.

## Recommendations

Revise the implementation to remove `resolveSafePath` from media local path resolution entirely. `MediaPathResolver` should own media-specific local path normalization:

- absolute local paths and `file:` URLs normalize to absolute filesystem paths without workspace/Downloads/temp allowlist checks;
- relative local paths remain workspace-relative and should not traverse outside the workspace;
- input local media paths still must exist and be files;
- output media paths still rely on `downloadFileFromUrl`/OS permissions for directory creation and write success.

## Scope Classification (`Small`/`Medium`/`Large`)

Small-to-Medium

## In-Scope Use Cases

- UC-001: `generate_speech` writes generated audio to an absolute path outside the current workspace, Downloads, and system temp when the server process has write permission.
- UC-002: `generate_image` writes generated image output to an absolute path outside the current workspace, Downloads, and system temp when the server process has write permission.
- UC-003: `edit_image` writes edited image output to an absolute path outside the current workspace, Downloads, and system temp when the server process has write permission.
- UC-004: Existing relative output paths continue to resolve inside the active workspace.
- UC-005: `edit_image` accepts a generated image's prior absolute external output path as an `input_images` entry when the file exists and the server process can read it.
- UC-006: `edit_image` accepts an absolute external local `mask_image` path when the file exists and the server process can read it.
- UC-007: `generate_image` accepts absolute external local reference image paths when files exist and the server process can read them.
- UC-008: Existing URL and data URI input image references continue to pass through unchanged.

## Out of Scope

- Changing provider/model selection or generation parameters.
- Adding UI configuration for path allowlists.
- Changing filesystem permissions, sandboxing of the underlying runtime, or OS-level access controls.
- Changing non-media tools' path policies.
- Changing the generic `autobyteus-ts` `resolveSafePath` helper.
- Adding user confirmation prompts or approval flows for media paths.
- Updating generated `dist` output by hand; source changes should remain authoritative and build output should be produced by the normal build if needed.

## Functional Requirements

- REQ-001: The server-owned `generate_speech`, `generate_image`, and `edit_image` tools must accept absolute `output_file_path` values outside the active workspace, Downloads, and system temp.
- REQ-002: `generate_image` and `edit_image` must accept absolute local filesystem paths and `file:` URLs in `input_images` outside the active workspace, Downloads, and system temp when those files exist.
- REQ-003: `edit_image` must accept an absolute local filesystem path or `file:` URL in `mask_image` outside the active workspace, Downloads, and system temp when the file exists.
- REQ-004: Relative `output_file_path`, `input_images`, and `mask_image` local values must continue to resolve under the active workspace root.
- REQ-005: Relative media paths that would traverse outside the active workspace must remain rejected; callers should use absolute paths for intentional external destinations/sources.
- REQ-006: The three tools must still return the final resolved absolute output path in `{ file_path }`.
- REQ-007: The output write path and local input image/mask paths must still be normalized/resolved before use so path handling is deterministic.
- REQ-008: Local input image and mask paths must still be checked for existence and file-ness before provider use.
- REQ-009: URL and data URI input references must continue to pass through unchanged.
- REQ-010: Tool descriptions and schemas must no longer state or imply that local media paths are limited to safe/workspace/Downloads/system temp locations.

## Acceptance Criteria

- AC-001: A unit or integration test proves `MediaPathResolver.resolveOutputFilePath` accepts an absolute path outside workspace/Downloads/temp and returns its normalized absolute path.
- AC-002: A unit or integration test proves `MediaPathResolver.resolveInputImageReference` accepts an existing absolute local file outside workspace/Downloads/temp and returns its normalized absolute path.
- AC-003: A unit or integration test proves `MediaPathResolver.resolveInputImageReference` accepts a `file:` URL pointing to an existing local file outside workspace/Downloads/temp and returns its normalized absolute path.
- AC-004: Existing tests or new tests prove relative output and input paths still resolve under the supplied workspace root.
- AC-005: Existing tests or new tests prove relative traversal media paths that escape the workspace are rejected.
- AC-006: Existing tests or new tests prove nonexistent local input image/mask paths are still rejected.
- AC-007: Tests for `generate_speech`, `generate_image`, and `edit_image` execution continue to verify that generated media is written to the resolved output path and returned as `{ file_path }`.
- AC-008: The `output_file_path`, `input_images`, and `mask_image` schema descriptions no longer mention the old allowlist restriction or `safe local file paths` for media inputs.
- AC-009: The common chain `generate_image` to an external absolute output path, then `edit_image` using that exact returned path as an input image, is allowed by media path resolution when the file exists.

## Constraints / Dependencies

- The server process and any runtime sandbox must still have OS permission to read/write the chosen local path; this change removes the application-level allowlist but cannot bypass OS permissions.
- The current media tools depend on `autobyteus-ts` for `downloadFileFromUrl`; parent directory creation and write cleanup should remain unchanged.
- The solution must avoid broadening local file access for unrelated tools.
- The solution must keep remote/data input reference behavior unchanged.

## Assumptions

- Users intentionally choose media paths and should be allowed to save and reuse generated artifacts in task-specific folders.
- In the media workflow, external generated output paths are expected to become later media inputs.
- Relative local paths remain workspace-relative because that is the least surprising interpretation; external media paths should be supplied as absolute paths.
- OS/runtime permissions are the correct final authority for local media read/write access.

## Risks / Open Questions

- Risk: Removing application-level local input restrictions for media tools allows the tools to read any local media file path the server process can access. This is accepted as part of the clarified workflow requirement and remains limited to media input fields plus OS/runtime permissions.
- Risk: Accidental writes/reads can happen if a caller supplies the wrong absolute path; mitigated by explicit tool arguments and normal filesystem errors.
- Open implementation question: whether to extract a small private `resolveLocalMediaPath` helper inside `MediaPathResolver` to avoid duplicating absolute/relative normalization across output and input paths. Recommended: yes, as a local private helper only.

## Requirement-To-Use-Case Coverage

| Requirement | Use Cases |
| --- | --- |
| REQ-001 | UC-001, UC-002, UC-003 |
| REQ-002 | UC-005, UC-007 |
| REQ-003 | UC-006 |
| REQ-004 | UC-004, UC-005, UC-006, UC-007 |
| REQ-005 | UC-004, UC-005, UC-006, UC-007 |
| REQ-006 | UC-001, UC-002, UC-003, UC-004 |
| REQ-007 | UC-001, UC-002, UC-003, UC-005, UC-006, UC-007 |
| REQ-008 | UC-005, UC-006, UC-007 |
| REQ-009 | UC-008 |
| REQ-010 | UC-001, UC-002, UC-003, UC-005, UC-006, UC-007 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Confirms the old absolute output allowlist is removed. |
| AC-002 | Confirms the old absolute local input allowlist is removed. |
| AC-003 | Confirms `file:` URL inputs are not still constrained by the old allowlist. |
| AC-004 | Guards existing normal relative path behavior. |
| AC-005 | Guards relative-path workspace containment while still allowing absolute external paths. |
| AC-006 | Keeps meaningful local media input validation. |
| AC-007 | Guards end-to-end media operation behavior through the service. |
| AC-008 | Keeps tool contract/documentation aligned with behavior. |
| AC-009 | Ties validation to the clarified generate-then-edit workflow. |

## Approval Status

Refined after implementation pause and user clarification on May 6, 2026. The user explicitly clarified that local input image and mask restrictions should also be removed because a generated external output path commonly becomes a later `edit_image` input.
