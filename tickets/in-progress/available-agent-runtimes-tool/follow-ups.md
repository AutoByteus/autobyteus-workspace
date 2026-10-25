# Follow-ups — autobyteus-303

| ID | Found by (role, document) | What is wrong, where | Evidence | Why it is outside this ticket | Urgent (`Yes`/`No`) | Suggested Task description | Sent (to, date) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| FU-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-001 | `RuntimeAvailabilityService` checks whether the Codex and Claude commands exist with `spawnSync` (`which` / `--version`, 3 s time-out), which blocks the server's event loop while it runs | `autobyteus-server-ts/src/runtime-management/runtime-availability-service.ts:1,29,38-41` | Pre-existing in surrounding code; once AR-003 is applied, this ticket reads "installed" through `strategy.readVersion` and no longer depends on it | No | Replace the synchronous command probes in `RuntimeAvailabilityService` with the async `runRuntimeCommand` so runtime availability checks do not block the server | |
