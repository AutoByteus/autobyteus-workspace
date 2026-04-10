# Release Notes

- Artifacts now load `write_file` and `edit_file` content from the server by run and path, including external absolute paths that are outside the local Electron workspace.
- Active and reopened runs now keep a complete file-change list in the Artifacts tab instead of depending only on future live stream updates.
- The Artifacts viewer now handles streaming, pending, failed, and unsupported preview states more reliably, reducing blank views and misleading stale content.
