# API/E2E Execution Report — `link-existing-run-to-task`

## Meta
- Round 1 (API-REV-001). Trigger: CRR-002 Pass (9.3/10). Large / High, Reviewed.
- Commits under test: `ef807beb6d` (IR-001), `4b0986363c` (IR-002); base `origin/personal` `2f211340ee`.
- Inputs: requirements (AC-001..AC-007), design, implementation handoff (R-1..R-3), code review report.
- Ledger: `api-e2e-validation-ledger.md`. Evidence: `evidence/api-e2e/` (desktop: `evidence/api-e2e/desktop/`).

## Result: **Fail** — product defect F-001 (High)

Adopting a team run works at the scripted level, but with any real model the PM's whole collaboration root fail-stops about 2 s after the adopted team's first model call.
- Every task agent of the PM is stopped, the adopted ones included.
- The PM can no longer coordinate.
- A durable test (ADO-4) now reproduces it without a real model.

## What passed
- **Repository suites** on `4b0986363c`:
  - typecheck: exit 0;
  - server unit: 724 files / 5882 tests;
  - web: 632 files / 4471 tests;
  - guards: exit 0;
  - server integration: 75 files pass. The only failures are `agent-status-websocket` ×2, the known defect Task 4577620f; this ticket touches no streaming code.
- **New e2e** `tests/e2e/projects/hand-started-run-adoption.e2e.test.ts`. It uses the real HTTP/WS/GraphQL server, scoped MCP and the real Project/Task services; only the AGY CLI is scripted.
  - **ADO-1** (AC-002, AC-003), agent run:
    - adopted through the PM's own `delegate_task`;
    - the PM's tree links it, and the Task entry is open;
    - it leaves the history, and its conversation continues with the Task;
    - every earlier file is kept, and its own file gains `taskAgent` naming the PM;
    - DONE closes it; reopening plus the PM's message reactivates it.
  - **ADO-2** (AC-001, R-3), team run:
    - adopted;
    - its coordinator messages the mate by address and by run ID, and messages the PM;
    - DONE closes it.
  - **ADO-3** (AC-004), refusals through the real tool, each with its reason and no change to the tree, the Task or the history:
    - another workspace;
    - in the middle of a turn;
    - has its own delegated runs;
    - archived.
  - **ADO-4** (found by the desktop check) — see F-001.
- **Whole server e2e** (gate on, clean env), in two parts because the first run was cut off when the session ended:
  - part 1, 43 files: 27 passed, 16 skipped;
  - part 2, 119 files: 86 passed, 31 skipped;
  - no failures other than F-001 (ADO-4) and one environment artifact (TR-003).

## Desktop check (D-1): what the user sees
Isolated instance of the branch build `1.5.6-beta.1` on an owned data root, credentials imported through `pnpm secrets:import`. Hand-built data:
- a PM agent run on Claude Agent SDK `haiku` (Haiku 5.5);
- an ADO Writer agent run and an ADO Review Team run (lead + mate), both on AutoByteus `deepseek-v4-flash`, in the same workspace;
- a Project with Tasks.

1. Each hand-started run got one turn from the user through the composer, then went idle (`d04`, `d05`).
2. The user asked the PM, in the composer, to give Task 1 to the team run ID and Task 2 to the agent run ID. The PM called `delegate_task` twice: both `delegated: true`.
3. Within 5 s both runs appeared under the PM with their Task lines (`d07`, `r1-sidebar-samples.txt`). The adopted writer shows its earlier conversation plus the Task message, and its prompt was rebuilt as a task agent's (`d08`).
4. **F-001:** at 06:57:50.205 the server logged `Rejected TOKEN_USAGE_UPDATED: agent token summary must not claim a Team root` for the adopted lead. 45 ms later both adopted runs were interrupted (`user_interrupt`) and shut down (`failstop-app-log-excerpt.txt`).
   - The writer had just started its Task and was mid-`send_message_to`, so its result never reached the PM (`adopted-writer-trace-tail.txt`).
   - The UI then showed the writer as Offline with a spinning tool call (`d09`).
5. **F-002 (R-1):** the old rows (ADO Writer › its first run; TEAMS › ADO Review Team) stayed in their groups after 40 s (`r1-sidebar-samples.txt`, `d10`). Correction (round 2): the "full renderer reload" was not one, because the app blocks `location.reload()`. The server history no longer lists them, also with the UI's own query variables.
6. DONE through the PM (`update_task`): on the server the writer is closed (`closed_task_executions`, Task entry `closedAt`). The UI's PM view had stopped updating after the fail-stop (phase `historical`, change cursor 881 against the server's 48), so the row did not leave. Reopen was not exercised: it is blocked by F-001 and gets rechecked after the fix.

## Findings
- **F-001 (High), product: an adopted team's token usage fail-stops the PM's root.**
  - The run summary sent with each `TOKEN_USAGE_UPDATED` takes `root_team_run_id` from the run's latest stored usage record (`token-usage/projections/token-usage-run-aggregate.ts`, `latest?.rootTeamRunId`).
  - A team run that worked before adoption has records under its own Team root.
  - Under the PM's Agent root, `collaboration-agent-presentation-adapter.ts` rejects a summary that names a Team root. `StandaloneAgentRunRoot.onAgentExecutionEvent` then calls `enterFailStop()`, which shuts down every child and closes admission.
  - **Reproduction:** ADO-4 (`ADO4-run3.log`). A hand-started team records usage (AGY `usage_report` replay of a real recording), the PM adopts it, and the adopted lead's next usage event is rejected. The PM's next tool call never completes ("Collaboration root … is already active or reserved").
  - **Control in the same test:** a new task team reporting the same usage passes.
  - The defect is runtime-neutral (seen with AutoByteus/DeepSeek on the desktop and with AGY in the test). It blocks AC-001 and AC-003 for every real model.
- **F-002 (Medium), R-1 as the user sees it.**
  - The adopted runs remain in their own sidebar groups while the server history is correct (round 1's "after a full reload" is withdrawn; see round 2).
  - The renderer keeps the writer as a `source: "local"` row and the team in `teamNodes`.
  - It is not yet separated from F-001's effects; recheck after the fix. The design accepted "the row leaves on the next history read", and this round it did not.
- **F-003 (Low), wording.** The Task message to an adopted run says "Your previous Task is closed; this is the work to do now", but the run never had a Task.
- **FU-1 (follow-up, outside the ticket).** `terminateAgentRun` on an AGY run held mid-turn never returns. It reproduces on the base commit. Repro: `followup-hold-terminate-repro.e2e.test.ts.txt`.

## AC status
| AC | Status |
| --- | --- |
| AC-001 (team) | Fail with a real model (F-001); scripted ADO-2 passes |
| AC-002 (agent) | Adoption, conversation and files pass (ADO-1, D-1); on the desktop the adopted writer was stopped as collateral of F-001 |
| AC-003 (DONE/reopen) | Scripted pass (ADO-1, ADO-2); real app blocked by F-001; sidebar R-1 fails (F-002) |
| AC-004 (refusals) | Pass (ADO-3; a sample of 4 cases) |
| AC-006 (existing suites) | Pass: unit, web, guards and the whole e2e (apart from F-001's new ADO-4 and the environment-only TR-003); integration: known defect only |
| AC-007 | Deferred to delivery |

## AC-006 part 2
119 files: 86 passed, 31 skipped (live gates), 2 failed.
- ADO-4: F-001, expected.
- `terminal-websocket-lifecycle` "opens a real PTY in server home": TR-003, environment only.
  - My clean env's temp `HOME` was under `/var`, a macOS symlink, and the shell reports the resolved path.
  - Rerun with a resolved `HOME`: 4/4 pass (`E2E-terminal-realpath-home.log`).
  - TESTING.md's clean-environment rule now says to resolve the temp `HOME`.

Whole e2e (both parts): 113 passed, 47 skipped, 0 failures other than F-001.

## Durable test and doc changes (uncommitted, for review)
- New `autobyteus-server-ts/tests/e2e/projects/hand-started-run-adoption.e2e.test.ts`: ADO-1..ADO-4. ADO-4 fails until F-001 is fixed.
- `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts`:
  - `startRoot` takes `{ workspaceRootPath }`;
  - new `release(rootId)`, so cleanup doesn't terminate a run that another root has adopted.
- `TESTING.md`: the clean-environment rule now says to give the temp `HOME` its resolved path (TR-003).

## Confidence
| Dimension | Score | Basis |
| --- | --- | --- |
| Failure is real and correctly attributed | 95% | Same error in the real app and in the scripted reproduction; the control passes; the code path is read end to end |
| Scripted coverage of AC-001..AC-004 | 85% | Real server and tools; AGY scripted; the refusals are a sample |
| Real-app coverage | 60% | Adoption and its rendering observed; DONE/reopen in the UI blocked by F-001 |
| Overall confidence in the verdict (Fail) | 95% | |

## Environment and cleanup
- Clean env for every e2e run (`env -i`, temporary `HOME`); vitest runs serialized per worktree.
- Isolated instance `iso-62261-0a7b`: stopped and its record removed; data root (with the test vault) deleted; no database in the evidence; secret values never printed.
- The temporary base worktree `_tmp-base-hold-check` was removed.
- The user's running app and `~/.autobyteus` were not touched; only the `.env` was read, by the importer.


---

# Round 2 (API-REV-002): `f5001b65c6` (IR-003 fixes F-001, F-003)

## Result: **Fail** — F-002 only (Medium, renderer)
F-001 and F-003 are fixed and verified, both in tests and in the real app with real models. AC-001..AC-003 now work end to end on the server and in the PM's tree. One defect remains: each adopted run also stays listed in its own sidebar group for the rest of the app session (F-002). Fixing that is a renderer change, outside the design's Change Scope.

## Reruns by impact
The change touched:
- the token-usage accumulator, shared by every run's usage summary;
- the adopted run's Task message.

| Check | Result |
| --- | --- |
| typecheck | exit 0 |
| server unit | 724 files / 5883 tests pass |
| server integration | 75 pass; only the known `agent-status-websocket` ×2 fail (same signature, Task 4577620f) |
| e2e by impact (48 files: token usage and every `tests/e2e/projects/` suite; gate on, clean env, resolved `HOME`) | 36 passed, 12 skipped, 0 failed; ADO-1..ADO-4 all pass |

Still valid from round 1: web (632 files), guards, and the e2e files outside the impact list. The change doesn't touch them.

## Real app (D-1b)
New branch build, isolated instance, PM on Claude Agent SDK Haiku 5.5, hand-started writer and team on AutoByteus DeepSeek V4 Flash. Each hand-started run first answered the user, so its usage was recorded under its own root: the F-001 trigger.

- **Adoption:** the PM, asked in the composer, adopted both runs (`delegated: true`); both appear under the PM with their Task lines within 5 s.
- **F-001 fixed:** both adopted runs did their Tasks and reported to the PM. No usage rejection, fail-stop or interrupt in the whole session.
- **AC-002 and F-003:** the writer keeps its earlier conversation and gets "New Task assigned to you: ado-desktop-project-2. This is the work to do now."
- **Board:** each Task shows its worker with live status.
- **AC-003:** DONE removes the writer from the PM's tree within 5 s, closes it and stops it. Reopen plus the PM's message brings it back, and it replies within 2 s.
- **AC-001 DONE:** the team leaves the PM's tree and closes.
- **F-002:**
  - Each adopted run also stays in its own group (ADO Writer › its first run; TEAMS › ADO Review Team), through adoption, DONE and the renderer's own history read (`fetchTree()`).
  - The server's history is correct, listing only the PM.
  - The rows come from the renderer's in-memory run contexts (`agentContexts.runs`, `agentTeamContexts.teams`), which a run has once the user opened it in the session. The projection turns them into a `source: "local"` row (`stores/runHistoryReadModel.ts`) and a `teamNodes` entry (`stores/runHistoryNavigationProjection.ts`).
  - Adoption doesn't drop those contexts; an app restart does, after which the adopted run is listed only under the PM.
  - The user sees each adopted run twice for the rest of the session, against AC-001 ("not under TEAMS") and AC-003 ("removed from the sidebar on DONE").
- **Correction to round 1:** `location.reload()` is blocked by the app (a window marker survived it), so round 1's "after a full reload" was not a reload.
- **Not observed (optional):** the PM's Token Meter including the adopted run's pre-adoption usage.

## AC status (round 2)
| AC | Status |
| --- | --- |
| AC-001 (team) | Server, PM tree, board and DONE pass; the own-group row stays (F-002) |
| AC-002 (agent) | Pass (conversation, files, Task, work, live status); the own-group row stays (F-002) |
| AC-003 (DONE/reopen) | Pass in the PM's tree and on the server; the own-group row stays (F-002) |
| AC-004 | Pass (ADO-3) |
| AC-006 | Pass (known integration defect only) |
| AC-007 | Deferred to delivery |

## Confidence (round 2)
| Dimension | Score | Basis |
| --- | --- | --- |
| F-001 and F-003 fixed | 95% | ADO-4 with its control, plus a real-app session with real models and no rejection |
| AC-001..AC-004 behavior apart from the sidebar | 90% | Scripted e2e plus the real app, including DONE and reopen |
| F-002 attribution (renderer run contexts) | 85% | Renderer state inspected and the code path named; the restart clears it; the exact drop point is for the owner |
| Overall confidence in the verdict (Fail on F-002) | 90% | |

## Cleanup (round 2)
- Instance `iso-52604-b1bd`: stopped and its record removed; data root (with the test vault) deleted; no database in the evidence.
- The user's app and `~/.autobyteus` were not touched (only `.env` was read, by the importer).


---

# Round 3 (API-REV-003): `fbc0f805bf` (IR-004: SR-009 fixes F-002)

## Result: **Pass**
F-002 is fixed and verified on the real app. With F-001 and F-003 (round 2), every finding is resolved. AC-001..AC-004 and AC-006 pass; AC-007 is for delivery.

## Reruns by impact
Only `autobyteus-web` changed, plus a server doc file.

| Check | Result |
| --- | --- |
| web Nuxt tests | 632 files / 4480 tests pass |
| guards (web-boundary, localization-boundary, localization-literals) | exit 0 |
| server suites, e2e impact set, ADO-1..ADO-4 | still valid from round 2 on `f5001b65c6` (no server source change) |

## Real app (D-1c)
New branch build, isolated instance, PM on Haiku 5.5 (Claude Agent SDK), hand-started runs on DeepSeek V4 Flash (AutoByteus). Every adopted run was one the user had opened and messaged in the session.

- **Rule 1 (PM open).** The own-group rows of an adopted writer and team left as soon as the delegations landed (within 3 s); each shows only under the PM.
- **DONE.** The writer left the PM's tree within 2 s and did not come back to its own group, even after a history read.
- **Reopen plus the PM's message.** The writer is back under the PM only and replied within 5 s.
- **Rule 2 (PM not open).**
  - The PM was messaged from outside the UI, with no PM context in the renderer. The rows were retired by the next history read (the store's `departedRunIds`); the app reads history every 5 s.
  - All four adopted runs show exactly once, under the PM.
- **Window.** A normal run that merely fell out of the newest-6 window is not hidden.
- **F-001 regression.** All adopted runs reported their Tasks; 0 usage rejections, fail-stops or interrupts.
- **Not observed (optional):** the PM's Token Meter including pre-adoption usage.

## AC status (final)
| AC | Status |
| --- | --- |
| AC-001 (team) | Pass |
| AC-002 (agent) | Pass |
| AC-003 (DONE/reopen) | Pass |
| AC-004 (refusals) | Pass (ADO-3) |
| AC-006 (existing suites) | Pass (known integration defect Task 4577620f only) |
| AC-007 | Deferred to delivery |

## Durable test and doc changes for test-code review (uncommitted)
- `autobyteus-server-ts/tests/e2e/projects/hand-started-run-adoption.e2e.test.ts` (ADO-1..ADO-4).
- `autobyteus-server-ts/tests/e2e/helpers/collaboration-root-harness.ts`: `startRoot({ workspaceRootPath })` and `release(rootId)`.
- `TESTING.md`: the clean-environment rule now says to resolve the temp `HOME`.

## Confidence (round 3)
| Dimension | Score | Basis |
| --- | --- | --- |
| F-002 fixed (rules 1 and 2, the window) | 92% | Each rule shown on the real app with store state confirming which rule acted; the window case checked |
| Whole feature (AC-001..AC-004) on the real app and in tests | 92% | Three rounds; scripted e2e plus real models |
| Overall confidence in the verdict (Pass) | 92% | |

## Follow-ups (outside the ticket)
- FU-1/FU-2: AGY terminate during a held turn never returns (with the Project Task Manager).
- `agent-status-websocket` ×2: known defect Task 4577620f.

## Cleanup (round 3)
- Instance `iso-61612-7efa`: stopped and its record removed; data root (with the test vault) deleted; no database in the evidence.
- The user's app and `~/.autobyteus` were not touched (only `.env` was read, by the importer).


---

# Round 4 (API-REV-004): test-code review fixes (CRR-007)
- **TR-001:** the header lists ADO-4, and the Run line uses the resolved temp `HOME`.
- **TR-002:** ADO-3 no longer sleeps a fixed 2 s. It waits until the busy run's conversation records the `CALL_TOOLS:` message, which the run writes at turn start; the delayed call then keeps the turn running for 25 s.
  - ADO-3 rerun alone: Pass (`round4/ADO3-run2.log`).
  - A first attempt that waited on `root_agent.agent_statuses` timed out, because that list holds task agents, not the root (`round4/ADO3-run.log`).
- **Result:** Pass; round 3's verdict stands.
