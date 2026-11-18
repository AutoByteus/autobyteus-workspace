# Implementation Revision Record

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, `design-review-report.md` ARCH-REV-003 (Pass), round 1 of implementation | N/A | `Initial Baseline` | SR-005, ARCH-REV-003, CRR N/A, API-REV N/A, DR N/A | Implemented; local checks pass; ready for code review |
| IR-002 | Code reviewer, `code-review-report.md` CRR-001 (Fail), round 2 | CR-001 | `Local Fix` | SR-005, ARCH-REV-003, CRR-001, API-REV N/A, DR N/A | Fixed; IMP-02/03/08 rerun and pass; back to code review |

## Revision Entries

### IR-001 — run_bash background tasks, notices, run-end stop; four tools retired

- Triggering role, report path, and round: architecture reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/design-review-report.md` (ARCH-REV-003, Pass); first implementation round.
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete against SR-005; implementation-scoped checks pass (see `implementation-handoff.md` Checks Run); Large / High confirmed.
- Related solution revision IDs: SR-005 (SR-001 to SR-004 underlying)
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: first implementation of the approved package.
- Approved behavior or requirement IDs affected: BEH-001 to BEH-014; REQ-001 to REQ-015.
- Implementation delta: every `run_bash` call runs through the command wrapper (foreground form for bash, background form for `run_in_background` and the `sh` fallback); the launcher decodes wrapper frames and cuts the call at its boundary; `BackgroundProcessManager` rewritten as the per-agent owner of background tasks (start, end, report-once, change listener, run-end stop) with a per-call output log; `BackgroundProcessCleanupStep`; four tools removed; server: backend capability, native publication, `AgentRun` facade, `background-task-notices` subsystem, platform notice sources composition for both hosts, journal translation, template, docs and glossary. Implementation refinements over the design text are listed in the handoff's "Deviations from the design text".
- Changed files or areas: `autobyteus-ts/src/tools/terminal/**`, `autobyteus-ts/src/agent/shutdown-steps/**`, `autobyteus-ts/src/index.ts`, `autobyteus-ts/src/tools/register-tools.ts`; `autobyteus-server-ts/src/{agent-execution,background-task-notices,compositions,standalone-application-host,agent-memory,agent-work-journal,built-in-agents}`; docs, `GLOSSARY.md`; tests in both packages.
- Local validation and result: IMP-01 to IMP-10 in the handoff: macOS bash 3.2 (25/25) and Linux bash 5.2 + dash (22/22) wrapper cases pass; autobyteus-ts full suite pass; server typecheck and unit suite pass; latency lower than base. Defects found and fixed during this round: stale shared `ps` snapshot in `establish`, sink switch order in the launcher, wrapper noise in a stopped call's stderr (handoff deviations 6 and 15).
- Next recipient or routing: code reviewer (Large / High route), per `get_handoff_rules`.
- Remaining limitations or risks: WSL not run (no Windows host); live-model E2E (ASM-002) left to API/E2E; FU-003 start robustness under heavy load unchanged (DEC-005).

### IR-002 — the wrapper ends without the exit builtin (CR-001)

- Triggering role, report path, and round: code reviewer, `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/code-review-report.md` (CRR-001), round 2.
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001, code review Fail (CRR-001)
- Current authoritative result: CR-001 fixed at `ddd594d07b`; Large / High unchanged.
- Related solution revision IDs: SR-005
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this implementation revision is recorded: every foreground call ran the user's `~/.bash_logout`, because the wrapper ended with `builtin exit` in a login shell (`bash --noprofile --norc -lc`).
- Approved behavior or requirement IDs affected: run_bash foreground behavior (BEH-001 preserved column), R-0.
- Implementation delta: `__ab_fg_end` ends with `__ab_status "$__ab_rc"` (a function return) instead of `builtin exit "$__ab_rc"`. As the script's last command the return value is the shell's exit code; from the EXIT trap the shell keeps the status that ended it (the user's `exit N`, or the failing status under `set -e`). Required items: (1) normal path without `exit`: done; (2) no extra logout read on the `set -e` / EXIT-trap path: confirmed, reads equal the plain shell (0 for `set -e`, 1 for the user's own `exit`); (3) R-0 case with a temp HOME `.bash_logout` marker: added, covering an ordinary command, an `&` job, `exit 3`, `set -e`, `exit` in a user EXIT trap and `exit` with a job, each compared with the plain login shell (reads and exit code); it fails on `e26460bf57`; (4) IMP-02 and IMP-08 rerun.
- Changed files or areas: `autobyteus-ts/src/tools/terminal/command-execution/command-wrapper.ts`; `autobyteus-ts/tests/integration/tools/terminal/run-bash-wrapper.test.ts`; `evidence/IMP-08-linux-wrapper-harness.mjs` (same comparison on Linux).
- Local validation and result: IMP-02 (macOS bash 3.2) 26/26; IMP-03 211 pass; IMP-08 (Linux bash 5.2 + dash) 23/23, CR-001 rows `[["echo hi",0,0],["(sleep 0.2; exit 3) & echo started",0,0],["exit 3",3,1],["set -e; false; echo no",1,0],["trap 'exit 4' EXIT; true",4,1],["trap 'echo t' EXIT; (sleep 0.2; exit 3) & exit 5",5,1]]`.
- Next recipient or routing: code reviewer (targeted delta review), per `get_handoff_rules`.
- Remaining limitations or risks: unchanged from IR-001 (WSL not run; WSL uses `bash -lc` too and the same script, so the fix applies there).
