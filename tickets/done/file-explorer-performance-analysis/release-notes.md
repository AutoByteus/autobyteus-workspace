# Release Notes - File Explorer Performance Fix

- Fixed a large-workspace File Explorer shutdown bottleneck that could delay Terminal startup after switching away from Files.
- Moved native File Explorer watcher shutdown out of the backend parent process, keeping Terminal WebSocket and PTY startup responsive while watcher cleanup finishes separately.
- Improved File Explorer live-stream recovery so reconnects refresh the visible snapshot after stream failure or queue overflow.
- Improved backend search cancellation so aborted File Explorer searches do not keep stale full-tree refresh work on lifecycle cleanup paths.
