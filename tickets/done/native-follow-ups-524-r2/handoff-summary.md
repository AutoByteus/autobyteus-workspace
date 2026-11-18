# Handoff Summary

## Summary Meta

- Ticket: `native-follow-ups-524-r2` (Project Task `autobyteus-524`, round 2: FU-006 and FU-007 of autobyteus-515; delegated by `/project_task_manager`)
- Date: `2026-11-18`
- Classification: `task_size: Small`, `architectural_risk: Low`; route: direct low-risk (design SR-002 after the Design Impact DI-001; implementation IR-001, IR-002; API/E2E `API-REV-001` Pass, final confidence 94.0%; independent architecture review, code review and test-code review `Not Applicable`).
- Current Status: `Verified from evidence; finalized on personal; no release` (the finalization record is in `release-deployment-report.md`)
- Branch: `codex/native-follow-ups-524-r2`, base `origin/personal` @ `0570c47fd9` at bootstrap; integrated with `origin/personal` @ `4702c502fe` (14 commits: beta.10 release records, autobyteus-517's tests; merge `be94117935`, no conflict) before delivery edits. Product source is final at `2e5b0198e2`; later commits are tests, reports, evidence and docs.

## Delivery Summary

- Delivered scope:
  - FU-006: `available-agent-runtimes-graphql.e2e.test.ts` points `DEEPSEEK_HARNESS_COMMAND` at a missing command in its hoisted setup (restored on dispose), so an installed `dsh` is not listed and the suite passes whatever is installed. Before: 4 of 6 failed on this Mac; after: 6/6.
  - FU-007: at process shutdown the server's cleanup (`server-runtime.ts`: record busy runs, then `studioServer.stopFileWatchesForProcessExit()`, then `app.close()`) ends the package-folder and skill-folder watchers without closing their OS watches; the process exit releases them. The startup handover close does the same before `nativeShutdown.close(...)`. `stopForProcessExit()` on each watcher ends event handling at once (timers, entries, late callbacks) and `close()` after it does nothing more. Every other close (in-process servers in tests, Fastify's `onClose`, the startup-failure path, a package folder removed while running) still closes the OS watches (REQ-003).
  - The design changed once: the first design put the stop inside the watchers' composition closes, and the implementation found those run on paths that are not process exit (over a hundred test files' in-process servers, the startup-failure path), where the OS watches would leak. It returned `Design Impact` DI-001; SR-002 moved the call to the process-shutdown owner (`docs/design-cases.md` Case 23).
  - `closeStudioProcessResources` moved unchanged into `compositions/studio-process-resources.ts` with the exit operation, because `build-studio-server.ts` would have gone over 500 lines (it is now 435).
  - Measured: a built server's SIGTERM stop 47–75 ms, 10/10 exit 0 (before: 0.64–4.0 s in the implementation's probe); the desktop's IPC quit message answered `complete` in 35–56 ms, exit in 51–71 ms, 10/10 exit 0.
- Docs synced (`docs-sync-report.md`): `autobyteus-server-ts/docs/modules/agent_execution.md`, `agent_package_definitions.md`, `skill_update_notices.md`, and the "File watching on a busy Mac" rule in `TESTING.md`. `DESIGN.md`, `docs/design-cases.md` (Case 23, by the Solution Designer) and `RELEASE.md` need no change.
- Durable coverage: the new unit cases (`studio-file-watch-exit.test.ts`; process-exit and ordinary-close cases in both watcher test files), the migration-gate test's fake studio and order assertion (record, stop, close), and the AAR suite's hidden harness. API/E2E added no test code; the stop time is a load-dependent measurement, kept as probes in the evidence.

## Verification Summary

- Verified from evidence by delivery; no user check is needed. AC-001…AC-004 (all critical) are directly proven; the critical evidence files were opened (`release-deployment-report.md`, Verification).
- Final confidence 94.0% against the 95% target (not met by 1.0). The gap is environmental: QR-001's load 100+ did not occur (load was 45–60, with `fseventsd` at 146–168 % CPU, the slow-stop condition), Linux and Windows are unmeasured, and the packaged desktop app was not quit. Delivery judged it sufficient: the mutation (the one exit call removed) made the same probes show stops of 0.35–12.5 s with two of five exiting 1 and IPC quits of 2.4–17.3 s with two of five replying `failed`, so the probes do catch the old behavior under today's conditions; no criterion is unproven and no category is below 90%.
- Key evidence:
  - `evidence/API-01-sigterm-stop-probe.log`: 10 lines `"outcome":"exit 0"`, `stopMs` 47–71; mutation `stopMs` 354–12462 with `TEST_SERVER_EXITED_NONZERO` twice; restored 49–60.
  - `evidence/API-02-ipc-shutdown-probe.log` and `.mjs`: the probe sends `autobyteus.embedded-server.shutdown.v1:request`, the desktop's own wire message (`managedBackendShutdownClient.ts`); 10 lines `"reply":"complete"`, `replyMs` 35–56, `"exitCode":0`.
  - `evidence/IMP-01-aar-before.log` / `IMP-01-aar-after.log`: `Tests 4 failed | 2 passed` before, 6 passed after, with `dsh` installed; `API-04` shows the AAR file 6/6 in the whole E2E run.
  - `evidence/API-04-server-e2e-whole-suite.log`: `Tests 9 failed | 555 passed`, no shutdown failure (autobyteus-515's run of the same suite had 25, several from slow shutdowns); each failing file traced: file-explorer watcher (FSEvents, same on base), `configured-skill-on-demand-loading` (stale heading list, same on base, already fixed on the base by autobyteus-517), `grok-build-runtime-replay` (a probe time-out read as "unsupported": FU-002; base 2 of 4 fail, branch 1 of 4), the other five pass alone (5 s limits under load).
  - `evidence/API-03-server-integration.log`: `Tests 11 failed | 495 passed`; all failures in `package-auto-refresh` and `file-system-watcher`, which wait 5 s for OS file events that took 2.8–12.5 s or never came; the base source swapped in fails 4, 3 and 5 cases, the branch 5, 5, 8 and 3. The change cannot reach them: `stopForProcessExit` is called only at process shutdown, the skill watcher's `close()` keeps its steps, and `closeStudioProcessResources` has an identical body.
  - `evidence/DEL-01…DEL-05`: delivery's checks on the merged state.
- Integrated-state check: the base brought release records, a version bump and prompt-section tests (autobyteus-517), no server source. Both typechecks PASS. The server was rebuilt on the merged state: the built-server stop probe 10/10 exit 0 in 47–75 ms; the AAR suite with `dsh` installed 6/6; the five new process-exit unit cases and all 21 migration-gate cases pass. The four real-filesystem watcher cases in the package watcher's unit file failed again on the merged state at `fseventsd` 153 % CPU with file events 1–5 s late or lost (the family K-1 records as failing on the old source too).

## Residual Risks For The User

- QR-001 (a stop under 1 s at load 100+) is measured at load 45–60 only, with the slow-stop condition (`fseventsd` busy) present.
- The packaged desktop app was not quit. The Electron shell is unchanged and the message it sends is proven.
- Normal closes still close OS watches on the main thread, by design (REQ-003): an in-process server closed by a test, or a package folder removed while the server runs. Under the same file-event backlog these can stall the main thread for seconds; API/E2E saw this stall make the Grok probe time out (FU-002).
- Linux and Windows are unmeasured (ASM-001); the change only removes work, and the explicit process exit releases watches on every platform.
- No reviewer saw the code on this direct route; delivery read the production diff (both watchers, the composition, the cleanup) and the design-case text.

## Follow-ups

- FU-001…FU-003 of this ticket are in `follow-ups.md` (the Solution Designer sends them): FU-001 is already fixed on the base by autobyteus-517 (no Task needed); FU-002 the Grok probe reporting its own time-out as "unsupported, update"; FU-003 the `TESTING.md` row for server shutdown and a durable home for the two stop probes (API/E2E's document). Round 1's follow-ups (`tickets/done/native-follow-ups-524/follow-ups.md`) and autobyteus-515's FU-004…FU-008 are not part of this round.

## Release

- No release: the Task's release is only on the founder's word, and RELEASE.md's default is no release. A release is available. `release-notes.md` holds user-facing notes for the next release.
