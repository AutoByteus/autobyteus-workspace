# Implementation Revision Record

The current code and `implementation-handoff.md` remain authoritative. This record locates each implementation round.

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Solution Designer / `handoff-result.md` / initial direct-route package | N/A | `Initial Baseline` | `SR-001`; `ARCH-REV-*`, `CRR-*`, `API-REV-*`, `DR-*`: N/A | Implemented D-1…D-5 (commit `33fc5f4e16`, `fc281c980a` after the rebase); IMP-01…IMP-06 pass |
| IR-002 | Solution Designer / `handoff-result.md` "SR-002 addition" / Task extension (FU-003 of `autobyteus-211`) | N/A | `Initial Baseline` (scope addition, not rework) | `SR-002`; others N/A | Rebased onto `aac5da3112`; D-6 implemented (commit `9a1f560454`); IMP-07…IMP-09 pass |

## Revision Entries

### IR-001 — Launcher on `/usr/bin/env`, full uv reason, temp dirs for leaking tests

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/handoff-result.md`, initial round
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: D-1…D-5 implemented as designed in commit `33fc5f4e16` (test files only, 12 files), which is `fc281c980a` after the IR-002 rebase with the same content; local checks IMP-01…IMP-06 in `implementation-handoff.md`
- Related solution revision IDs: `SR-001`
- Related architecture-review revision IDs: N/A (not selected)
- Related code-review revision IDs: N/A (not selected)
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this baseline or implementation revision is recorded: initial implementation of the approved package
- Approved behavior or requirement IDs affected: BEH-001…BEH-004 (BEH-005 preserved); REQ-001…REQ-006
- Implementation delta:
  - D-1: `serverCommand('python')` returns `command: '/usr/bin/env'`, args `NAME=value` ×3 + `<uv> run --frozen --project … python server.py …`, `env: {}`. Module state renamed `uvEnv` → `uvLocations`. Header documents it.
  - D-2: `uvError` returns lines from the `×`/`error:` line up to (not including) the next `help:` line, joined by a space; last-line fallback kept.
  - D-3: file-local `makeTempDir()` (`realpath(mkdtemp(os.tmpdir()/<same prefix>))`) + `afterEach` removal in five core test files.
  - D-4: `makeMemoryDir()` extracted from `attachMemory` in `agent-runtime.test.ts`; the "Agent facade" case sets `config.memoryDir = makeMemoryDir()`.
  - D-5: five e2e files create `<os.tmpdir()>/<file prefix>-appdata-*` in `beforeAll`, call `appConfigProvider.config.setCustomAppDataDir`, and remove it in `afterAll`.
- Changed files or areas: `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts`; `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts`; `autobyteus-ts/tests/{unit,integration}/tools/file/edit-file.test.ts`; `autobyteus-ts/tests/integration/tools/file/{read,write}-file.test.ts`; `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts`; `autobyteus-server-ts/tests/e2e/file-explorer/{file-explorer-websocket-lifecycle,file-explorer-graphql,file-explorer-path-boundary,file-operations-graphql}.e2e.test.ts`; `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`
- Local validation and result: see `implementation-handoff.md` Checks Run
- Next recipient or routing: continued with IR-002 before handoff
- Remaining limitations or risks: see `implementation-handoff.md` Known Risks

### IR-002 — Rebase onto `origin/personal` and D-6 contract rejection payloads

- Triggering role, report path, and round: Solution Designer, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/handoff-result.md` "SR-002 addition"; Task extension during the initial round
- Triggering finding IDs: N/A (FU-003 of `autobyteus-211`, added to the Task)
- Classification: `Initial Baseline` (scope addition before the first handoff; not a review finding)
- Prior authoritative result: IR-001 (D-1…D-5, not yet handed off)
- Current authoritative result: branch rebased onto `origin/personal` `aac5da3112` with no conflicts; D-6 in commit `9a1f560454`
- Related solution revision IDs: `SR-002`
- Related architecture-review revision IDs: N/A
- Related code-review revision IDs: N/A
- Related API/E2E revision IDs: N/A
- Related delivery revision IDs: N/A
- Why this revision is recorded: the Task gained REQ-007 / AC-007 / D-6
- Approved behavior or requirement IDs affected: BEH-006; REQ-007; AC-006, AC-007
- Implementation delta: added `source: { kind: "agent", agent_definition_id: "worker", launch_configuration: launch }` to both `TASK_EXECUTION_STARTED` payloads in the case "rejects the retired task-record events and settlement fields". Each payload keeps its named defect, and no error-text matching was added (DEC-007).
- Changed files or areas: `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`
- Local validation and result: IMP-07 (the file passes), IMP-08 (each mutation fails at its own `toThrow()`), IMP-09 (the two rebased e2e files pass with no residue). Under TESTING.md "Rerun by impact", IMP-01…IMP-06 stay valid: the rebase changed no `src` and none of this branch's files.
- Next recipient or routing: direct API/E2E per `get_handoff_rules` (Small + Low)
- Remaining limitations or risks: a full `pnpm test:e2e` was not rerun on the rebased HEAD (see the handoff's Checks Run)
