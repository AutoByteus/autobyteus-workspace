# Architecture Review Revision Record — busy-quit-shutdown-orphan

The latest `design-review-report.md` remains authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1 / initial review of SR-003 | SR-002, SR-003 | N/A | Fail (Design Impact) | AR-001, AR-002, AR-003 |
| ARCH-REV-002 | Round 2 / review of SR-007 after the rebase onto `1a4453e553` | SR-002, SR-006, SR-007 | Fail (Design Impact) | Fail (Design Impact) | AR-001–AR-003 resolved; AR-004 (blocking), AR-005, AR-006 new |
| ARCH-REV-003 | Round 3 / re-review of SR-008 | SR-007, SR-008 | Fail (Design Impact) | Pass | AR-004, AR-005, AR-006 resolved |

## Revision Entries

### ARCH-REV-001 — Initial baseline: D1 and D2 sound; deferred-quit re-entry and coverage outside the server's group must be fixed

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-review-report.md`
- Review round and trigger: Round 1. `/solution_designer` sent SR-003 as `Architecture Design Complete` (Large/High).
- Triggering role, report path, and finding IDs: `/solution_designer`; `architecture-design-handoff.md`; N/A.
- Relevant solution revision IDs: SR-002 (approval), SR-003 (design).
- Prior authoritative decision: N/A.
- Current authoritative decision: Fail (Design Impact).
- Baseline established (code at `5f3aefd24`/`02d6ddf05`):
  - Limiting D1 to the two stop-now entry points is correct, because the Team/Org/copy flows rely on drain-and-cancel. Those entry points also have application callers (AR-001).
  - The D2 bound and the flag-gated group signal are coherent with D3's 15 s.
  - Process groups are right for runtime CLIs.
  - The native AutoByteus shell and background processes are detached. Native `BackgroundProcessManager.stopAll()` has no caller, and AGY daemons survive a SIGTERM to AGY (AR-003).
  - `ElectronApplication.stop()` returns early on re-entry, so the design's deferred-quit example exits early on a second quit (AR-002).

#### Prior Finding Resolution

None (first round).

- New or remaining finding IDs:
  - AR-001 (Low, Design Impact): map and disposition the application callers of `terminateAgentRun`/`stopAllAgentRuns`.
  - AR-002 (Medium, blocking): key the `will-quit` deferral to one memoized stop promise; add a re-entry test.
  - AR-003 (Medium, blocking; Unclear part): complete ASM-002 for native and AGY; disposition the native background processes (which have no stop owner), the forced path for detached groups, and the non-leader forced path (the Claude CLI survives EOF).
- Non-blocking notes:
  - N-1: scope the env flag (remove it from `process.env`; ESRCH; correct the rationale).
  - N-2: verify the updater path.
  - N-3: Terminate has no bound for a non-ending runtime.
  - N-4: second-signal behavior.
- Material classification changes: none. The classification stays Large/High.
- Recommended recipient: `/solution_designer`.
- Remaining risks or uncertainty: whether native and AGY interrupts end their turns, which determines how reachable the forced path is for them.

### ARCH-REV-002 — SR-007: prior findings resolved; the sweep's off-POSIX result must be specified

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-review-report.md`
- Review round and trigger: Round 2. `/software_engineering_team/solution_designer` sent SR-007 as `Architecture Design Complete` (Medium/High) on 2026-10-30.
- Triggering role, report path, and finding IDs: Solution Designer; `architecture-design-handoff.md`; it answers AR-001–AR-003.
- Relevant solution revision IDs: SR-002 and SR-007 (approval); SR-006 and SR-007 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Fail (Design Impact).
- What changed:
  - The basis was re-confirmed at `1cec2d134a` (docs only on `1a4453e553`).
  - `backend-port-conflict-20261024` shipped `ServerProcessShutdown` (unbounded), `NativeCommandProcessScope`, `ApplicationShutdown` and `stopManagedBackend`.
  - D2 now extends `ServerProcessShutdown`. D3 is now only the POSIX `forceStop`.
  - All four spines were redrawn against code.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-001 | Open (Low) | Resolved | SR-004, SR-007 (DEC-005, AC-008, DS-001b) | Ten call sites re-grepped; the application callers enter `AgentRunManager.terminateAgentRun` |
| AR-002 | Open (Medium, blocking) | Resolved (shipped code, obsolete for this design) | SR-006 (E-A27) | `applicationShutdown.ts:9-28`: one memoized stop; `quit()` prevents until prepared |
| AR-003 | Open (Medium, blocking) | Resolved | SR-004, SR-006 (E-A9–E-A11, E-A26) | (a) native foreground is aborted by the interrupt and drained by the scope; (b) native background is stopped by the scope at shutdown, and on Terminate it is FU-003 (outside REQ-003); (c) the forced path: the server sweep plus the D3 tree force; (d) a non-leader `kill` takes the SIGTERM path with the server's own bound and sweep |

- New or remaining finding IDs:
  - **AR-004** (Medium, blocking): define the sweep result where it cannot or does not run. "Not applicable" on win32 must not become exit 1 / IPC `failed`; otherwise every Windows quit ends in `app.exit(1)` and every Windows update install is aborted (P-004).
  - **AR-005** (Low): `server-runtime-app-data-migration-gate.test.ts` runs the real sweep in-process. Add it to the file mapping and mock the sweep (P-005).
  - **AR-006** (Low): drop "raise 2 s to 3 s if needed". The 2 s already holds (`managedBackendStop.ts:28-29`). The desktop `ps` read is asynchronous.
- Non-blocking notes:
  - N-3 (carried);
  - N-5 (an expired bound aborts an update install; extend U-A1 to idle Claude runs);
  - N-6 (a fence that is not accepted leaves the run fenced but active);
  - N-7 (a post-snapshot spawn; the startup-failure exit is not swept);
  - N-8 (three process-table readers).
  - N-1, N-2 and N-4 from ARCH-REV-001 are obsolete with the shipped code.
- Material classification changes: Large/High → Medium/High, agreed.
- Recommended recipient: `/software_engineering_team/solution_designer`.
- Remaining risks or uncertainty: U-A1 (several Claude runs against the 10 s bound), U-A2 (CLI versions) and U-A3 (now only an observation) remain for validation.

### ARCH-REV-003 — SR-008: AR-004 to AR-006 resolved; Pass

- Canonical design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/busy-quit-shutdown-orphan/tickets/in-progress/busy-quit-shutdown-orphan/design-review-report.md`
- Review round and trigger: Round 3. `/software_engineering_team/solution_designer` sent SR-008, the design revision for ARCH-REV-002.
- Triggering role, report path, and finding IDs: Solution Designer; `architecture-design-handoff.md` and design-spec § "SR-008 Changes"; AR-004, AR-005, AR-006.
- Relevant solution revision IDs: SR-007 (approval, unchanged); SR-008 (design).
- Prior authoritative decision: Fail (Design Impact).
- Current authoritative decision: Pass.
- What changed:
  - SR-008 is docs only (head `000da22578`; `git diff 1cec2d134a HEAD` touches only the ticket folder), so the round-2 code basis still applies.
  - The spec, investigation notes (E-A33 to E-A35) and follow-ups (FU-005, FU-007) were checked against the findings.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| AR-004 | Open (Medium, blocking) | Resolved | SR-008; E-A33 | Changes in design-spec: the sweep interface lists `not-applicable` \| `confirmed` \| `unconfirmed`; the Bound example sets exit 1 only on `unconfirmed`; Sweep targets returns `not-applicable` on win32; the server-process-shutdown test file has a win32 case (exit 0, IPC `complete`, no `ps`); the `taskkill` residual says forced path only |
| AR-005 | Open (Low) | Resolved | SR-008; E-A34 | The file mapping adds `server-runtime-app-data-migration-gate.test.ts` (mock the sweep, await the request) and a fake sweep in every `ServerProcessShutdown` test; change sequence step 3 |
| AR-006 | Open (Low) | Resolved | SR-008; E-A35 | Changes in design-spec: the Desktop force row and Guidance D3 keep the 2 s and leave `stopManagedBackend` unchanged; `serverProcessTree.ts` uses async `execFile` with a 2 s timeout |

- New or remaining finding IDs: none.
- Non-blocking notes:
  - N-3, N-5 (FU-007), N-6, N-7 and N-8 are carried and recorded in the spec.
  - N-9 (cosmetic): `new ServerProcessShutdown` appears twice in the Interface Boundary Mapping. Implement one constructor.
- Material classification changes: none (Medium/High).
- Recommended recipient: `/software_engineering_team/implementation_engineer`, with an informational notification to the Solution Designer.
- Remaining risks or uncertainty: U-A1, U-A2 and U-A3 remain for validation.
