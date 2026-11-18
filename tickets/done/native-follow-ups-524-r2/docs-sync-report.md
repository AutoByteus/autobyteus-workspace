# Docs Sync Report — autobyteus-524 round 2: FU-006 and FU-007

## Scope

- Ticket: `native-follow-ups-524-r2` (Project Task `autobyteus-524`, round 2: FU-006 the AAR E2E and `dsh`; FU-007 the slow server stop)
- Trigger: API/E2E `API-REV-001` Pass (final confidence 94.0%), direct low-risk route (`task_size` Small, `architectural_risk` Low; architecture review, code review and test-code review `Not Applicable`).
- Bootstrap base reference: `origin/personal` @ `0570c47fd9`
- Integrated base reference used for docs sync: `origin/personal` @ `4702c502fe` (14 commits: beta.10 release records and version bump, and autobyteus-517's prompt-section tests and `TESTING.md` row), merged as `be94117935` with no conflict, before any delivery edit
- Post-integration verification reference: both typechecks PASS; the changed unit files, the built-server stop probe and the AAR E2E on `be94117935` (`evidence/DEL-01…DEL-05`)

## Why Docs Were Updated

- Summary: at process shutdown the server's cleanup now ends the package-folder and skill-folder watchers without closing their OS watches (the exit releases them), because closing a recursive watch blocked the main thread for 2–13 s while macOS's file-event service was busy, which made a built server's stop take seconds and sometimes exit 1. Every other close still closes the OS watches. The module docs said "shutdown closes the watcher", and `TESTING.md` explained slow stops by the watcher close; both would now mislead.
- Why this should live in long-lived project docs: the exit-only shortcut is justified only on the one path that precedes the process exit. A maintainer who moves it into `close()`, which Fastify's `onClose` and in-process servers also call, would leak watches in every long-lived process (the lesson is `docs/design-cases.md` Case 23, written by the Solution Designer). The module docs are where the next reader looks for what shutdown does.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule affected. The change follows the rule the Solution Designer recorded as `docs/design-cases.md` Case 23 (put the exit decision at the owner that knows the process is exiting, not in a close that other paths also run); that case was committed with the fix |
| `docs/design-cases.md` | The design cases | No change | Case 23 (committed by the Solution Designer in this ticket) matches the final code: the cleanup in `server-runtime.ts` and the handover close call one studio operation; verified against the source diff |
| `TESTING.md` | Project testing guideline | Updated; Needs follow-up | The "File watching on a busy Mac" rule gains two sentences: a built server's process shutdown no longer pays the watcher close, so a slow built-server stop is not explained by that rule, and an in-process server closed by a test still closes the watches. A changed-area row for server shutdown and a durable home for the two stop probes is the API/E2E engineer's to write: `follow-ups.md` FU-003 |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed |
| `autobyteus-server-ts/docs/modules/agent_execution.md` ("Bounded server shutdown") | Describes the shutdown cleanup, its 10 s bound and the process-tree sweep | Updated | Names the cleanup's order (record busy runs, end the watchers for the exit, `app.close()`), why the OS watches are not closed there, and that every other close still closes them. The 10 s bound, the sweep and the 14.25 s worst case are unchanged |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` ("Lifecycle And Composition") | Says "Shutdown closes the watcher, then the hub, then the definition services" | Updated | Adds `stopForProcessExit()` and the rule for the other closes |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` ("Lifecycle And Composition") | Says shutdown closes the notices, watcher first | Updated | Adds `PlatformNoticeSources.stopFileWatchesForProcessExit()` and the skill watcher's `stopForProcessExit()`; the per-folder close when the last run using a folder ends is unchanged |
| `autobyteus-server-ts/docs/modules/agent_packages.md`, `tool_list_updates.md` | Mention the watchers or the notice sources | No change | They describe what the watchers report, not how they shut down |
| `GLOSSARY.md` | Vocabulary | No change | No new term |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Design reference | The shutdown cleanup's order and the exit-only watcher stop, in "Bounded server shutdown" | The cleanup changed; this is where shutdown is described |
| `autobyteus-server-ts/docs/modules/agent_package_definitions.md` | Module doc | `stopForProcessExit()` and when the OS watches are still closed | The doc said shutdown closes the watcher |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` | Module doc | The skill watcher's exit stop and the composition call that reaches it | Same |
| `TESTING.md` | Project testing guideline | Two sentences in "File watching on a busy Mac" | The rule would otherwise blame the watcher close for a slow built-server stop |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Exit-only watcher stop | End event handling at process shutdown and let the exit release the OS watches; the call lives in the process-shutdown owner (`server-runtime.ts` cleanup, and the startup handover close), never in a close that tests, Fastify's `onClose` or the startup-failure path also run | `design-spec.md` SR-002, `implementation-revision-record.md` DI-001/IR-002 | `agent_execution.md`, `agent_package_definitions.md`, `skill_update_notices.md`, `docs/design-cases.md` Case 23 |
| Why a stop was slow | Closing a recursive `fs.watch` blocks Node's main thread for seconds while `fseventsd` is busy (RF-002, RF-003) | `investigation-notes.md` | `TESTING.md` rule |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Process shutdown closing both folder watchers' OS watches on the main thread | `stopForProcessExit()` on both watchers, called through `StudioServer.stopFileWatchesForProcessExit()` by the shutdown cleanup | `agent_execution.md`, `agent_package_definitions.md`, `skill_update_notices.md` |
| `closeStudioProcessResources` inside `build-studio-server.ts` | The same function, unchanged, in `compositions/studio-process-resources.ts` (with the exit operation), for the 500-line rule | n/a (a move; no doc names the file) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used; four files changed (above). `DESIGN.md`, `docs/design-cases.md` and `RELEASE.md` are `No change`, with the reasons in the table.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups of this ticket are in `follow-ups.md`: FU-001 (already fixed on the base by autobyteus-517; no Task needed), FU-002 (Grok probe), FU-003 (the `TESTING.md` row, API/E2E's document). The Solution Designer sends them.
