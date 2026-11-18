# Docs Sync Report — busy-quit-shutdown-orphan (autobyteus-284)

## Scope

- Ticket: `busy-quit-shutdown-orphan`, Project Task `autobyteus-284` (bounded, awaited shutdown; stop-now Terminate). `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed`.
- Trigger: CRR-004 (proportional test-code review Pass) from the code reviewer, after API-REV-002 Pass.
- Bootstrap base reference: `origin/personal` @ `1a4453e553`.
- Integrated base reference used for docs sync: `origin/personal` @ `9d59ab82ec`, merged into the ticket branch as `927f7e846c`.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh (DEL-01 checks).

## Why Docs Were Updated

- Summary: the change itself already rewrote the three docs it touches (`agent_execution.md`, `antigravity_cli_runtime.md`, `electron_packaging.md`). Delivery checked them against the integrated code, added two facts the code has and the docs lacked (the sweep's 0.5 s kill confirmation and the resulting worst-case exit time), and corrected one doc outside the change that still described the old "Terminate waits for the turn" behavior (`codex_integration.md`).
- Why this should live in long-lived project docs: Terminate and server-shutdown semantics, the shutdown bound and the desktop force step are contracts other work depends on (autobyteus-283/285 restart-and-resume, Docker stop timeouts in FU-004).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Owns Terminate, root-shutdown fence and server shutdown | Updated (by the change; delivery added the kill confirmation and worst case) | Replaced the "Known limit (server shutdown with a busy run)" paragraph with "Stop now" and "Bounded server shutdown"; checked against `server-process-shutdown.ts` (`SERVER_SHUTDOWN_TIMEOUT_MS = 10_000`), `server-process-tree-sweep.ts` (`PROCESS_TREE_GRACE_MS = 1_500`, `KILL_CONFIRMATION_MS = 500`), `utils/process-tree.ts` (`PS_TIMEOUT_MS = 2_000`) |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | AGY's process-table helper moved to `src/utils/process-tree.ts` | Updated (by the change) | Correct; no reference to the removed `agy-background-process-groups` helper remains in any doc |
| `autobyteus-web/docs/electron_packaging.md` | Desktop quit, 20 s wait, POSIX force of the server tree | Updated (by the change) | Matches `baseServerManager.ts` `forceStop` and `serverProcessTree.ts`; 2 s confirmation unchanged; Windows `taskkill /f /t` |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Described normal termination as "quiesces input and waits for the active turn" | Updated (delivery) | Now: termination first interrupts the active turn, then waits for it to end; an open compaction closes with the interrupted turn |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Root-hosted member shutdown | No change | Already says members' active turns are interrupted; this ticket does not change Team/Org fencing |
| `autobyteus-server-ts/docs/modules/application_engine.md` | Application runtime shutdown order | No change | Describes ordering only, no turn-wait claim; an application's terminate is covered by `agent_execution.md` |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | `terminateAgentRun` routing | No change | Describes routing, not turn semantics |
| `autobyteus-server-ts/docker/README.md` and Docker configs | 10 s stop timeouts vs the new worst case | No change (follow-up) | FU-004 (already recorded; number corrected to ≈ 14.25 s) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Behavior (change) + precision (delivery) | Stop-now Terminate/shutdown; bounded shutdown and sweep; delivery added: after SIGKILL the sweep waits up to 0.5 s for the targets to be gone, and the worst-case exit ≈ 14.25 s, normal busy exit ≈ 1 s | The code has the 0.5 s confirmation (CR-C1); the worst case is what Docker/desktop timeouts must cover |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Path (change) | Process-table helper is the shared `src/utils/process-tree.ts` | Helper moved |
| `autobyteus-web/docs/electron_packaging.md` | Behavior (change) | Desktop 20 s wait; POSIX force stops the whole server tree | D3 |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Stale-behavior correction (delivery) | Termination interrupts the active turn before `CodexAgentRunBackend.terminateRun` | The old sentence described the pre-ticket wait |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Stop now | Terminate (user, application, delete/archive) and shutdown fence first: interrupt the turn, cancel unstarted queued input; shutdown never writes `terminatedAt` | design-spec D1, DEC-005, DEC-006 | `agent_execution.md` |
| Bounded shutdown | 10 s bound after the startup barrier; always one sweep; three sweep outcomes, only `unconfirmed` gives exit 1; Windows `not-applicable` | design-spec D2, SR-008 (AR-004) | `agent_execution.md` |
| Worst-case timing | ≈ 14.25 s server exit worst case, inside the desktop's 20 s | code-review CR-C1 | `agent_execution.md` |
| Desktop force of the tree | Snapshot → SIGTERM targets → SIGKILL server → ≤ 1.5 s → SIGKILL survivors; 2 s confirmation unchanged | design-spec D3, SR-008 (AR-006) | `electron_packaging.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Known limit (server shutdown with a busy run)": shutdown waits for the turn, orphans possible | Stop-now fence + bounded shutdown + sweep | `agent_execution.md` |
| `src/agent-execution/backends/antigravity/stream/agy-background-process-groups.ts` (and its unit test) | `src/utils/process-tree.ts` | `antigravity_cli_runtime.md` |
| Desktop POSIX force = SIGKILL of the server process only | `BaseServerManager.forceStop` of the server tree | `electron_packaging.md` |
| "Normal termination waits for the active turn" (Codex compaction note) | Interrupt first, then wait for the turn to end | `codex_integration.md` |

## No-Impact Decision

Not applicable (docs updated).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from evidence, archive, finalization (no release by default).
- Notes: FU-004's text in `follow-ups.md` corrected from 13.75 s to ≈ 14.25 s (CR-C1), so the Solution Designer sends the right value.
