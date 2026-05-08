# Release Notes — published-artifacts-absolute-paths

## What's New

- `publish_artifacts` now accepts readable absolute file paths available to the runtime server, including files outside the configured agent workspace.
- Published artifact summaries and revisions now expose normalized absolute source paths, including for workspace-relative inputs after resolution.

## Improvements

- Published artifact content remains snapshotted into run memory at publish time, so app reads do not depend on the original source file remaining in place.
- Brief Studio and Socratic Math Teacher now use app-owned semantic artifact resolvers instead of assuming artifact paths are workspace-relative.
- Brief Studio prompts now tell agents to publish the exact absolute path returned by the write step without requiring workspace-only path placement.
- Custom application documentation now describes the runtime-server-readable absolute path contract and the plural-only `publish_artifacts` surface.

## Compatibility / Migration Notes

- The old singular `publish_artifact` tool remains unsupported; custom configs that still list only `publish_artifact` must migrate to `publish_artifacts`.
- Absolute source paths may reveal host path details to application consumers. This is intentional for this ticket and follows runtime/server filesystem authority.
- Very large readable files can still be snapshotted; this ticket does not add a size limit.
