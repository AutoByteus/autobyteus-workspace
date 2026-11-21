# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md`, SR-001 (direct route, Medium / Low) | N/A | `Initial Baseline` | SR-001 | FU-009, FU-008, FU-005, FU-006, FU-003, FU-002, FU-007 implemented; FU-004 waits for DEC-004 (no code with answer (a)); ready for direct API/E2E |
| IR-002 | Solution Designer, `handoff-implementation.md` § SR-002 (after CRR-001 CR-001, API-REV-001) | CR-001 | `Design Impact` | SR-002, CRR-001, API-REV-001 | FU-008's bound learns the exit from the `exit` event and decides after the poll phase; ready for direct API/E2E |

## Revision Entries

### IR-001 — The autobyteus-554 follow-ups FU-002, FU-003, FU-005…FU-009

- Triggering role, report path, and round: Solution Designer (`/solution_designer`), `handoff-implementation.md`, SR-001
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implemented in `72f7ebe040` … `8850dc3f99` (one commit per item) and `570aab87d2` (a comment reflow); checks IMP-01…IMP-10 in `implementation-handoff.md` § Checks Run
- Related solution revision IDs: SR-001
- Related architecture-review revision IDs: N/A (direct route)
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline is recorded: the first implementation of the approved package
- Approved behavior or requirement IDs affected: REQ-001, REQ-002, REQ-003, REQ-005, REQ-006, REQ-007, REQ-008 (REQ-004 waits for DEC-004)
- Implementation delta: see `implementation-handoff.md` § Reviewed Behavior Implementation Trace. Two causes differ from the investigation's: FU-005's `afterAll` timed out because closing the in-process server's folder watchers blocks the main thread on a busy `fseventsd` (11–26 s), not because of fake timers; FU-007's DCF-E2E-007 failed because the OS delivered the write 6 s late or not at all, with the product applying a detected change at once (confirmed on Linux). Neither is a product defect; both fixes stay in the tests.
- Changed files or areas: server `agent-memory-layout.ts`, `runtime-management/{probe-time-bound,antigravity-cli-capability,grok/grok-build-capability}.ts`; web `MarkdownRenderer.vue`, `MarkdownPreviewer.vue`, `workspaceResourceUrl.ts`, `runnableWorkspaceKind.ts`, `runHistoryReadModel.ts`, `ChatWorkspaceMenu.vue`, `useMobileLaunchWorkspaces.ts`, `SkillWorkspaceLoader.vue`; tests and the rendered probe; docs `agent_memory.md`, `agent_episodic_catalog.md`; the 554 release note
- Local validation and result: IMP-01…IMP-10, each new behavior with a negative control against the old code
- Next recipient or routing: `/api_e2e_engineer` (direct route, by `get_handoff_rules`)
- Remaining limitations or risks: this host's file events (6 s late to none in 30 s) keep DCF-E2E-002/003/007 from a macOS verdict (labelled `ENVIRONMENT`); AC-005 and AC-007 ask for three passes on this host, which API/E2E owns

### IR-002 — SR-002: a late-firing probe bound sees an exit that happened during a main-thread block

- Triggering role, report path, and round: Solution Designer (`/solution_designer`), `handoff-implementation.md` § SR-002, after the code reviewer's failure-origin review `code-review-report.md` CRR-001 of API/E2E round 1 (`api-e2e-revision-record.md` API-REV-001, evidence `API-05b-grok-catalog-bound-diagnostic.log`)
- Triggering finding IDs: CR-001
- Classification: `Design Impact` (the SR-001 mechanism; revised in SR-002)
- Prior authoritative result: IR-001 (`72f7ebe040` … `570aab87d2`)
- Current authoritative result: implemented in `3b39828501`; checks IMP-11, IMP-12
- Related solution revision IDs: SR-002
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: CRR-001
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why this revision exists: SR-001's bound read `child.exitCode`/`signalCode` in its timer callback; after a main-thread block past the bound, the expired timer runs before the poll phase that delivers the exit, so an exited child read as running, was killed and reported as timed out (API-05b).
- Approved behavior or requirement IDs affected: REQ-008, AC-008 (as revised in SR-002)
- Implementation delta: `probe-time-bound.ts` learns the exit from the child's `exit` event (a flag; the listener is removed on disarm) and defers the timer's decision with `setImmediate`, which runs after the same loop turn's poll phase; then an exited child gets up to 1 s for its `close`, and only a running child (or a `close` that never comes) is a time-out with `RUNTIME_PROBE_TIMED_OUT`. The input type is narrowed to `ProbeChildExit` (`once`/`removeListener` of `exit`): the design names `Pick<ChildProcess, "once">` plus the old fields, but the fields are no longer read (dead) and disarm needs `removeListener`; a `ChildProcess` satisfies it, and so does a test `EventEmitter`. The callers are unchanged.
- Changed files or areas: `autobyteus-server-ts/src/runtime-management/probe-time-bound.ts`, `tests/unit/runtime-management/probe-time-bound.test.ts`
- Local validation and result: IMP-11 (64 tests; the real-order case spawns `process.execPath -e ""`, arms a 200 ms bound and blocks the main thread 1,500 ms with `Atomics.wait`, then gets the real result; both the SR-001 field check and an event-only check without the deferral fail it), IMP-12 (typecheck at baseline; runtime consumers 74 files, 778 tests)
- Next recipient or routing: `/api_e2e_engineer` (direct route)
- Remaining limitations or risks: the real-order test blocks 1,500 ms instead of the design's 600 ms, so Node's start of the child fits inside the block on a loaded host; a child that exits in the same instant the decision runs (after the poll phase) is still a time-out, which is a real time-out at the bound

