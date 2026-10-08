# Release Notes — Agents Can Attach Files To Project Tasks

Status: prepared before user verification. This is proposed content only. Whether to publish a new version is the user's decision at finalization.

## Added
- Agents can attach files to a Project Task. `create_or_update_task` takes an optional `context_files` list of absolute file paths, both when creating a Task and when updating one.
- Each file is copied into the Task when the call is made. It shows in the Task's Context Files exactly like a file you upload yourself, with an image preview for screenshots, and it stays there even if the original file is later deleted.
- When the Task is then delegated, the worker receives the attached files as reference files.

## Notes
- Files are only added; agents cannot remove or replace them. You can still remove them in the app.
- The same file types and 25 MiB limit as app uploads apply. Types are decided by file extension, so source and script files such as `.ts`, `.js`, `.yaml`, `.py` and `.sh`, and files without an extension, are rejected.
- If any listed file is invalid, the whole call fails with an error that names the file, and nothing changes (not even a DONE status).
- Tasks with no Project (created by a described delegation) cannot have files.
- No data migration or reset.
