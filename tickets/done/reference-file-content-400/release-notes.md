## What's New
- Tightened delegated task reference-file handling so task work packets, task result submissions, and task result reviews now require absolute local file paths for `reference_files`.

## Improvements
- Task reference records now keep the readable absolute file path in `referenceFiles[].path` while using route-safe opaque `referenceId` values for content URLs.
- Task-delegation runtime/tool guidance now tells agents to pass full filesystem paths, such as paths returned by file-writing tools or `realpath`.
- Long-lived server docs now describe the absolute-only task reference contract and the no-compatibility behavior for historical relative/path-derived records.

## Fixes
- Fixed delegated task reference previews failing with HTTP 400 after relative task references were persisted.
- Fixed absolute task references whose old path-derived `referenceId` could exceed route-parameter limits and return a router-level 404 before content resolution.
- Preserved the existing no-legacy requirement: relative task references, URL/protocol-shaped values, workspace-relative fallback, wildcard route compatibility, and historical migration remain unsupported.
