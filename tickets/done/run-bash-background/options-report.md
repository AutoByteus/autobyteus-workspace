# autobyteus-338: Background commands on the native runtime: options and recommendation

Solution Designer, 2026-11-09. Base `origin/personal` @ `374e35a60e`. Evidence: `investigation-notes.md`; prototype `prototype/` (4/4 passed on the real launcher, no fakes). Requirements: `requirements-doc.md` (Ready for Approval).

## What happens today

- Two ways to start background work: shell `&` in `run_bash`, or `start_background_process`. Then `get_process_output` (poll), `get_background_processes` (list), `stop_background_process`.
- **No exit code is ever reported.** The start tool's manager records only "exited" (prototype P1); a shell `&` child has no exit code at all (P3, which also shows one `( … ) &` listed as two processes).
- **An idle agent is never told** its command ended. The native backend reports no background work.
- **Run end leaves commands running, unseen:** Terminate, delete, Task close or idle shutdown drops the run's process list; the commands keep running until the app quits (P4). A delegated native task agent waiting for its build is idle-shut-down after 10 minutes.
- Real use (local traces, 12 GB): start 55 trace files, output 30, stop 21, **list 0**; run_bash 7,803.

## What the other runtimes do

| Runtime | Background start | Told when it ends | Read / stop | Run end |
| --- | --- | --- | --- | --- |
| Claude | `Bash` `run_in_background` | Yes: a notice, and the CLI **starts a new turn** itself | output file (and `TaskOutput`); `TaskStop` | stopped; Stop (interrupt) keeps them |
| Antigravity | `run_command` daemon | Panel only; "a daemon's exit starts no turn" | — | stopped |
| Codex | background terminals | No (read-only panel) | — | provider-owned |
| Grok Build, DeepSeek (ACP) | their shell tool | No background reporting | — | — |
| Native today | `&` or start tool | No | output/stop tools | **keeps running, unseen** |

## Options

| | (A) Keep 4 tools + notice | (B) run_bash only | (C) run_bash + one stop tool (recommended) |
| --- | --- | --- | --- |
| Tools | 5 | 1 | 2 |
| Start | option on run_bash, or the start tool (two ways) | `run_bash(…, run_in_background)` | same as B |
| Told when it ends | notice | notice | notice |
| Read output | tool or file | `tail <output file>` | `tail <output file>` |
| Stop | tool (verified) | `kill -TERM -<group>` in run_bash | tool (verified) |
| Own stop makes a notice? | no | **yes** (platform cannot tell a kill from a crash: usually one extra turn) | no |
| Wrong-process risk | none | plain `kill <pid>` leaves children (e.g. a dev server's node) running; a group id could be reused after the end | none |

All three share the same core: run_bash's background option, exit code + last lines in one batched notice, output file, the panel, and the run-end cleanup.

**Recommendation: (C).** Listing is unused and replaced by the notice and the panel; reading needs no tool. Stopping is the one action the platform must know about: through a tool it stays verified and silent. Claude keeps the same split (Bash + TaskStop). (B) is workable if you prefer one tool; the price is an extra turn after each self-stop and relying on the model to kill the whole process group.

## The other questions

- **Wake an idle agent?** Recommend **yes** (as Claude). Guards: one notice per batch; everything that ended before delivery goes in one message, with a ~2 s settle while idle (prototype: 300 ms split three ends into two notices, 1 s gave one); no notice for the agent's own stops or for run end / app quit; every notice is visible in the conversation and journal. A busy agent hears right after its current turn (the native runtime cannot add input to a running turn).
- **Run end stops its commands?** Recommend **yes** (Terminate, delete, Task close, root stop). Delegated copies are no longer idle-shut-down while a command runs. This changes today's documented behavior that a dev server outlives its agent.
- **448 (tell idle agents after a restart):** this Task builds what it needs, the per-run list of background commands and the notice path. Recommend 448 as **its own Task right after**, because it changes restart resume for every runtime (Claude and Antigravity too).
- **FU-003/FU-006 (start fails / wrong directory under heavy load):** they hit every run_bash call today, foreground too; this Task adds no new start path; a start takes ~120 ms normally. Recommend **one Task after this one**. If you have seen them in real use, not only in test runs, do it first.
- **Retired names in stored definitions:** no migration (as for `read_media_file` in 328): unknown names are skipped and run_bash is always there. The built-in Daily Assistant changes here; the 35 public package files (34 configs + 1 skill reference) and 18 private ones go to the Agent Package Creator after a stable release.

## Build Tasks once you decide (recommended split)

1. **338 build**: background run_bash, notice, stop tool, retirement, run-end cleanup, panel and idle-shutdown reporting, journal, docs.
2. **448**: restart notice for idle runs with background work (all runtimes), on top of 1.
3. **Terminal under load**: FU-003 + FU-006.
4. **Package update** (Agent Package Creator): remove the retired names from 35 public files after the stable release.
