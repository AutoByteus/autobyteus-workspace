# Docs Sync Report — autobyteus-524 round 1: FU-003 (native command start and stop limits)

## Scope

- Ticket: `native-follow-ups-524` (Project Task `autobyteus-524`, round 1: FU-003)
- Trigger: API/E2E `API-REV-001` Pass (final confidence 94.0%), direct low-risk route (`task_size` Small, `architectural_risk` Low; architecture review, code review and test-code review `Not Applicable`).
- Bootstrap base reference: `origin/personal` @ `ff13782f36`
- Integrated base reference used for docs sync: `origin/personal` @ `d61bae54a0` (9 commits: phone Settings for every run, autobyteus-522; web files only), merged as `08d33082f3` with no conflict, before any delivery edit
- Post-integration verification reference: both typechecks PASS and the terminal unit tests PASS on `08d33082f3` (`evidence/DEL-01…DEL-03`)

## Why Docs Were Updated

- Summary: the native command scope's time limits are now named in one file (`command-execution/command-deadline.ts`) with new values (start 30 s, observation and retirement 10 s, stop confirmation 30 s; host shutdown 3 s kept), a single `ps` read has no cap of its own, a start that never completes reads "Command did not start within N s: <reason>", and a Stop during a start ends the call as that Stop. A reader of `terminal_tools.md` would otherwise not know any of the limits, why they have those values, or how a call that was cut short behaves.
- Why this should live in long-lived project docs: the limits are the answer to "why does `run_bash` fail to start, and when?", asked by every later change to the scope and by every reader of an agent run's failures; the values are measured and their reasons belong next to them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | It holds no rule on command limits. The change keeps its rules: one owner for the limits (the executor imports the start limit; the scope and observer take defaults from the same file) |
| `TESTING.md` | Project testing guideline | No change; Needs follow-up | The ticket's reports record no command that stopped working, and the watcher-failure cause API-03 hit is already a rule ("File watching on a busy Mac"). A changed-area row for the native command scope and a durable home for the burst probe is the API/E2E engineer's to write: `follow-ups.md` FU-004 |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed |
| `autobyteus-ts/docs/terminal_tools.md` | Describes `run_bash`, the scope's lifetime, host shutdown and the module layout | Updated | New "Command time limits" section under "Owned command lifetime and host shutdown"; `command-deadline.ts` added to the module tree |
| `autobyteus-server-ts/docs/modules/agent_execution.md` ("Bounded server shutdown": 10 s bound, 1.5 s TERM→KILL grace, 0.5 s kill confirmation) | Mentions graces and confirmation near shutdown | No change | That passage is the server's own process-tree sweep (`server-process-tree-sweep.ts`), separate from the native `command-execution` scope; its values did not change. The 10 s server bound still caps the cleanup that closes the scope, and host close keeps its 3 s budget, so the passage stays accurate |
| `autobyteus-ts/docs/terminal_android_direct_shell_backend_design.md` | Names `run_bash` on Android | No change | Describes the interactive backend; no limit in it |
| `GLOSSARY.md` | Vocabulary | No change | The change adds no new term; "start limit" and the others are names in the code and in `terminal_tools.md` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/terminal_tools.md` | Design reference | A "Command time limits" table (start, observation, stop, host shutdown: value and what each bounds), the rules that a `ps` read has no limit of its own, that graces are not limits, that a launch that fails outright fails at once, the failure text, that a Stop during a start ends as the Stop, that the call returns after the cleanup stop is confirmed (with the measured times), and that a run end confirms stops for up to 30 s; module tree gains `command-deadline.ts` | The limits, their reasons and the cut-start behavior are what a maintainer needs when a start fails or a stop is slow |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The limits and their values | Measured on a loaded machine: a healthy start takes up to 18.4 s in a 200-command burst at load ~160, one `ps` read several seconds; so start 30 s (the call's shorter timeout caps it), observation 10 s, stop 30 s; graces are by design | `requirements-doc.md` DEC-001…DEC-003, `investigation-notes.md` RF-004…RF-006 | `terminal_tools.md` |
| One limit per step | A single `ps` or WSL run is bounded only by its step's deadline | `requirements-doc.md` DEC-002, REQ-002 | `terminal_tools.md` |
| A Stop during a start | Ends as the Stop (`tool-abort`), not as a failed start; the call returns after the cleanup stop is confirmed | `implementation-handoff.md` I-1, `api-e2e-execution-coverage-report.md` API-02 | `terminal_tools.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The 1.5 s start deadline (a literal in the scope and in the executor) | `COMMAND_START_LIMIT_MS` (30 s) in `command-deadline.ts` | `terminal_tools.md` "Command time limits" |
| The 500 ms cap on every `ps` run inside a step | The step's own deadline | `terminal_tools.md` "Command time limits" |
| "Command did not start: Command control deadline exceeded" | "Command did not start within N s: <reason>" | `terminal_tools.md` "Command time limits" |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used; `terminal_tools.md` changed.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001…FU-004 of this ticket are in `follow-ups.md`; the Solution Designer sends them. FU-004 is the `TESTING.md` proposal (API/E2E's document).
