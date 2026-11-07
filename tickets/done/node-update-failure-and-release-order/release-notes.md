## Fixes

- **No more lasting "Automatic update failed" on a node that is already up to date.** When a node's automatic update failed and the node was later updated another way (with "Update to …" on its card, with `autobyteus-docker update`, or with a new image), Settings → Nodes kept showing the failure. The desktop now checks the node again and removes the failure once the node runs that version or a newer one. A failure for a node that is still on an older version stays, as before.
- **Automatic node updates no longer fail right after a release.** A desktop is now offered a new version only once the server update for its Docker nodes has been published, so nodes that follow the desktop can update straight away instead of reporting that no server package was published.
