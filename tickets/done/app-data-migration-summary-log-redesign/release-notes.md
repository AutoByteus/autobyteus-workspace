## What's New

- Team members can delegate work across nested AutoByteus, Codex, and Claude
  teams using stable logical addresses, with task lifecycle and history retained
  across reopen and restore.
- The Team Tasks view now presents assignments, submissions, reviews, revision
  requests, resubmissions, acceptance, interruption, and owned references as one
  readable conversation instead of exposing routing metadata.
- Activity and Memory Inspector can now show the exact AutoByteus-generated
  system instruction sent to Native, Codex, or Claude runtimes in an accessible,
  collapsed disclosure.

## Improvements

- Stopping a Team run now preserves its history and waits for the full delegated
  scope to terminate; permanent deletion is offered later as a separate,
  confirmed action on the inactive history row.
- Token Usage now keeps one current record per AgentRun, while reopened
  standalone runs and focused Team members hydrate and refresh complete
  cumulative token and API-price summaries without stale overwrite.
- Server migration history now stores a concise aggregate summary while keeping
  full per-item diagnostics in the existing attempt log, reducing database and
  Settings payload size.
- Packaged Electron end-to-end runs now use an explicit isolated data root,
  backend port, browser state, logs, and ownership-safe cleanup without changing
  ordinary production startup or updater behavior.

## Fixes

- Fixed Agent Team live output, file-change projection, exact member focus, and
  recovery behavior across AutoByteus, Codex, and Claude runtimes.
- Fixed current TeamRun startup migrations and restoration so required migration
  failures block startup clearly instead of exposing partially initialized data.
- Fixed token statistics persistence so partial live events cannot suppress the
  complete server-backed summary after refresh or process reopen.
- Fixed oversized app-data migration status records by automatically converting
  released summary data to the new concise format during startup.
