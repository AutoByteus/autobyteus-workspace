# Architecture Design Handoff — autobyteus-338 `run-bash-background`

- Result: `Architecture Design Complete`, `task_size: Large`, `architectural_risk: High` → independent architecture review
- From: Solution Designer, 2026-11-10
- Solution revision: `SR-005` (SR-004 answered ARCH-REV-001; SR-005 answers ARCH-REV-002)
- Project Task: `autobyteus-338` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` for the user
- Workspace: worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background`, branch `codex/run-bash-background`, base `origin/personal` @ `374e35a60e4d2f6a24eefcc709ba3ab6070da127`; finalization target `origin/personal`. Ticket documents are not committed yet.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/run-bash-background/tickets/in-progress/run-bash-background/`

## Original request and goal

Simplify background commands on the native runtime: `run_bash` can run commands in the background, the agent is told when they finish (exit code, last lines, one batched notice), the agent can keep working in parallel, and the four separate background tools are retired. Read with autobyteus-448 (idle agents not told after a restart), which stays a separate Task.

## Approval basis (all the user's, in the Solution Designer conversation)

- 2026-11-09: DEC-001 option B: "return the pid … they can just use bash to kill it"; all four tools retired, no stop tool.
- 2026-11-09: DEC-004: 448 separate ("for this task maybe we focus on simplifying"); DEC-002 wake idle agent, DEC-003 run end stops commands, DEC-005 FU-003/FU-006 in a later Task: "I'll agree with your recommended decisions".
- 2026-11-10: DEC-006: support both ways in this ticket: `run_in_background` and plain `&` jobs ("why not to support both at the same time … we do it in this ticket"); processes that detach themselves are "not our control" (out of scope).
- Taken from "we do it in this ticket": build under 338 (the Task text said build Tasks would be created after the decision; the user is told this route was taken and can redirect).
- Solution Designer refinement within its DEC-007: output files live while the run is live (OS temp area; memory folders are synced), removed at run end.

## Round 2 (SR-004) — what changed for ARCH-REV-001

See `solution-revision-record.md` SR-004 for the per-finding resolution. New evidence: `prototype/wrapper-skeleton-probe.sh` + `wrapper-skeleton-probe.log` (11 cases pass on bash 3.2.57). New design section: `design-spec.md` "Command Wrapper Contract (SR-004)" (script skeletons for both forms, frame grammar, call boundary, shell-state rules). AR-002: the user approved the narrowing on 2026-11-10 (requirements DEC-012); DEC-013 adds the still-running list to each notice.

## Round 3 (SR-005)

ARCH-REV-002 items: AR-003 IFS reset (probe case 12, all 12 cases pass), AR-007 DS-006 chain rewritten, AR-010 `listRunning()` / `listRunningBackgroundTasks()` backed by `manager.list()`. Non-blocking R-6/R-7 in Risks, R-8 wording fixed, R-9 this file refreshed. Per-item detail: `solution-revision-record.md` SR-005.

## Package

| Document | Path |
| --- | --- |
| Requirements (Approved, SR-005) | `requirements-doc.md` |
| Investigation notes | `investigation-notes.md` |
| Design spec (Ready, SR-005) | `design-spec.md` |
| Solution revision record | `solution-revision-record.md` |
| Options report (user-facing, SR-001) | `options-report.md` |
| Prototype + log | `prototype/background-completion.prototype.test.ts`, `prototype/prototype-run.log` |
| Kill probe + log | `prototype/kill-pid-probe.mjs`, `prototype/kill-pid-probe.log` |
| Wrapper skeleton probe + log (SR-004) | `prototype/wrapper-skeleton-probe.sh`, `prototype/wrapper-skeleton-probe.log` |
| Architecture review (round 1) | `design-review-report.md`, `architecture-review-revision-record.md` |
| Package files naming the tools | `agents-package-files-naming-background-tools.txt` |

## Classification evidence

Large: two packages, many owners (run_bash, manager, wrapper/control frames, shutdown step; server backend contract + all backends, AgentRun, new notice subsystem in both hosts, journal, template, docs). High: model-facing tool contract; every `run_bash` call now ends at a wrapper `FOREGROUND_DONE` frame; shared backend capability; async delivery (timers, waking idle runs, batching); lifecycle change at run end and idle shutdown.

## Points worth the reviewer's attention

1. The single command wrapper for every call (design-spec Off-Spine `CommandWrapper`, Risks R-0/R-A): semantics preservation, `exit`/`exec`, bash 3.2 (macOS) without `wait -n`, WSL.
2. Nonce frames on fd 63, a duplicate of the original stderr made before the user block, for host and WSL (reuse of `AnchorControlDecoder`); stdout end marker on fd 62.
3. Notice delivery owner (`BackgroundTaskNoticeService` as an `AgentRunPlatformNotices` source + `postUserMessage`), the `backgroundTaskNotices` backend capability, and REQ-015 attribution (end reported in the agent's own run_bash result).
4. Run-end stop as an `AgentShutdownOrchestrator` step that never fails the orchestrator.

## Open risks

R-0 wrapper blast radius; R-B late end after a kill → one notice turn (accepted); R-C `kill -9` cannot be forwarded; R-D FU-003 under load (separate Task); R-E output file growth until run end.

## Follow-ups

None recorded (no `follow-ups.md`). Separate Tasks the user agreed to: 448 (restart notice for idle runs with background work), terminal under load (FU-003/FU-006 of autobyteus-333), agent-package update (35 public files) after a stable release.

## Next expected action

Architecture review of the package; findings return to the Solution Designer; a pass goes to implementation per the reviewer's rules.

## Route

Handoff rule matched: "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/software_engineering_team/architecture_reviewer` (round 1, SR-004 and SR-005 re-reviews sent 2026-11-10).
