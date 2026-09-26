# v1.4.88 — Exact Team attachment ownership

Fixes Team image/file delivery when configured and delegated executions share an address.

- Fix Team image/file finalization when configured and delegated executions share
  a member address. Attachments and messages use the same exact selected execution.
- Preserve draft uploads/retry and retained attachment reads across restart and
  later same-address executions. Standalone/Org and text-only flows remain unchanged.
- Replace Team final owner/URL contract with containing TeamRun plus canonical
  AgentRun ID. Old clients and arbitrary old copied bookmarks are not supported.
- Startup migration preserves blobs and non-locator history while converting proven
  typed references. Ambiguous ownership blocks startup rather than guessing.

Upgrade matching web/Electron renderer and server together with writers stopped.
Rehearse on an installation copy and retain consistent backups before production.
See the server FILE_RENDERING_AND_MEDIA_PIPELINE guide for cutover/recovery.
202 automated tests and real browser/live-Codex scenarios passed upstream; no
installed-corpus migration, Electron-shell or production rollout proof is claimed.

This release supersedes the unpublished v1.4.87 attempt, which was blocked by archived evidence path lengths before desktop builds. No application behavior changed in the correction.
