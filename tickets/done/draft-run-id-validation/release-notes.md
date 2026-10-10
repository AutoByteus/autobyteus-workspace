# Release Notes — draft-run-id-validation

## Fixes
- **Security:** a crafted owner ID in a context-file request, such as `..%2Fagent-runs%2Fother`, could reach another agent's attached files. It could read or delete a draft, write an upload into the wrong folder, or move a file during send. Every context-file request now rejects such IDs and filenames, and a malformed request no longer touches any file.

## Changed
- For integrations: malformed context-file requests now get `400` with a `detail` message:
  - owner IDs with surrounding spaces;
  - owner descriptors with unknown extra fields;
  - traversal IDs on upload, finalize and draft read/delete (before: 200, 204 or 500);
  - traversal `runId` on `/rest/runs/:runId/context-files/...` (before: 404);
  - an invalid filename on that route (before: 500).

  The app's own requests are unaffected.

## Notes
- Attaching, previewing, removing and sending files work as before. No reset or data migration is needed.
