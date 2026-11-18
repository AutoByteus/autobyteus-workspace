# Implementation Revision Record — autobyteus-524 round 2 (`native-follow-ups-524-r2`)

The current code and the Solution Designer's next revision remain authoritative.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer, `handoff-implementation.md`, round 2 | DI-001 | `Design Impact` | SR-001 | FU-006 done (`a5b24ea3b7`); FU-007 stopped at the design's escalation trigger, returned to the Solution Designer |

## Revision Entries

### IR-001 — FU-006 done; FU-007 returned as a Design Impact

- Triggering role, report path, and round: `/solution_designer`, `handoff-implementation.md` (SR-001), round 2
- Triggering finding IDs: DI-001 (below)
- Classification: `Design Impact`
- Prior authoritative result: N/A
- Current authoritative result: FU-006 implemented and proven (AC-001); FU-007 not implemented
- Related solution revision IDs: SR-001
- Related architecture-review, code-review, API/E2E, delivery revision IDs: N/A
- Why this revision is recorded: the design's escalation trigger ("a caller of the feed or notices `close()` other than process shutdown → `Design Impact`") fired during the caller check the handoff asked for.
- Approved behavior or requirement IDs affected: REQ-002, REQ-003 (AC-003); REQ-001 done
- Implementation delta: `autobyteus-server-ts/tests/e2e/runtime/available-agent-runtimes-graphql.e2e.test.ts` sets `DEEPSEEK_HARNESS_COMMAND` to `<fake root>/not-installed/dsh` in the suite's hoisted setup and restores it on dispose (commit `a5b24ea3b7`)
- Local validation and result: AAR suite with `~/.local/bin/dsh` on PATH: before 4 of 6 fail (`deepseek_harness` listed), after 6/6 pass (`evidence/IMP-01-aar-before.log`, `IMP-01-aar-after.log`)
- Next recipient or routing: `/solution_designer` (Design Impact)
- Remaining limitations or risks: FU-007 waits for the design decision

#### DI-001 — The feed's and the skill notices' `close()` are not called only from process shutdown

- Evidence: both closes run inside `closeProcessResources` (`build-studio-server.ts:279-299`), which has three callers. The first is the process-shutdown handover (`:301-303`, `onCleanupOwnershipTransferred`). The second is the Fastify `onClose` hook (`:447-453`). The third is the startup-failure path (`:503-505`). In production `app.close()` is called only from the process-shutdown cleanup (`server-runtime.ts:214`), and the process then exits explicitly (`server-process-shutdown.ts:79`). In tests, though, 118 test files start in-process studio servers (`startStudioE2eRuntimeServer` → `buildStudioServer`; `studio-preclose-order.test.ts`) and close them with `fastify.close()` while the test process keeps running.
- Consequence of the design as written: wiring the shutdown stop into `feed.close()` / `platformNotices.close()` would leave each in-process server's OS watches open. Those are chokidar and `fs.watch`, both `persistent: true`, so they hold the event loop. They would accumulate in long test processes and keep them alive. A failed startup in a process that continues would leak the same way. This contradicts REQ-003 ("every other close … still closes the OS watches").
- Proposed shape (for the Solution Designer to decide): the process-shutdown owner makes the exit decision. The production shutdown cleanup (`server-runtime.ts:214`, before `app.close()`) calls one studio-server operation that gives both watchers their shutdown stop. Then `onClose` → `feed.close()` / `notices.close()` find the watchers already stopped, and `close()` is a no-op after the stop, as the design's interface table says. In-process servers and the startup-failure path keep the full close. The watcher methods and AC-003 stay as designed. Only who calls the stop moves, from the composition closes to the process shutdown.
