# Solution Design Rework Note: Media Input Path Requirement Gap

## Status

Requirement gap resolved by solution design on May 6, 2026.

## Trigger

Implementation was paused after the user clarified that removing the restriction only for `output_file_path` is insufficient. The user explained that a normal workflow is:

1. `generate_image` writes to an external absolute output path.
2. A later `edit_image` call uses that generated file path as an input image.

Therefore the old workspace/Downloads/temp restriction is also incorrect for `input_images` and `mask_image` local paths.

## Revised Scope

Remove the workspace/Downloads/temp application-level allowlist for server-owned media local paths:

- `output_file_path` for `generate_speech`, `generate_image`, and `edit_image`.
- local filesystem and `file:` URL entries in `input_images` for `generate_image` and `edit_image`.
- local filesystem and `file:` URL `mask_image` for `edit_image`.

Keep relative paths workspace-relative and reject relative traversal outside the workspace. Users who want external paths should pass absolute paths.

Keep URL/data URI pass-through for media inputs.

Keep existence/is-file validation for local media input paths.

## Design Impact

The prior resolver-level design remains the right boundary, but the resolver policy must be broader:

- Replace output-only normalization with a shared private local media path normalization helper inside `MediaPathResolver`.
- Stop using `resolveSafePath` for media local inputs as well as media outputs.
- Do not change `autobyteus-ts/src/utils/file-utils.ts` globally.
- Update schema wording for `input_images` and `mask_image`, not just `output_file_path`.
- Revise tests that currently expect `/etc/passwd` input to fail only because it is outside the allowlist; tests should instead use a missing/non-file path or a relative traversal case for rejection.

## Existing Implementation State

Current local implementation already handles unrestricted absolute outputs. It should be kept as a base and revised for media inputs/masks. It should not be discarded.

## Next Routing

Because the design changed after a requirement gap, the updated requirements, investigation notes, design spec, prior design-review report, implementation pause note, and this rework note should go back through `architecture_reviewer` before implementation resumes.
