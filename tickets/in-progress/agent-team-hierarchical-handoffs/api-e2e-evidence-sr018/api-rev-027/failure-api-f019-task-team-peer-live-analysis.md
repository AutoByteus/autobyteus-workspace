# API-F-019 — Mandatory Live Task-Team Peer Exchange Did Not Occur

## Result

- API/E2E revision: `API-REV-027`
- Scenario: `API-LIVE-027-TASK-PEER-001`
- Result: `Fail`
- Preliminary classification: `Unclear product/provider behavior; focused code-review failure-origin determination required`
- Current HEAD: `649e244418fd6a4a21626ea4be5f7b0bab859412`

## Approved expectation

The imported nested-classroom live contract requires the delegated `StudentStudyGroup` task Team coordinator (`/StudentStudyGroup/student_one`) to call `send_message_to` with the exact token to `./student_two`, wait for the peer reply, then submit the exact task result for Teacher review. The peer exchange must use the same nonempty task-Team chain. Submission/review without the required peer exchange is not a pass.

## Exact safe execution

A configuration-only preflight created only the owned runtime configuration and proved the absent absolute target `autobyteus-server-ts/db/api-rev-027-live-20260812-1.db`. Both ambient database selector variables were removed. Twenty Prisma migrations and an actual interactive `pnpm secrets:import -- --source /Users/normy/.autobyteus/server-data/.env --database-url file:///.../api-rev-027-live-20260812-1.db` targeted only that disposable database. The checked `startBuiltTestServer` wrapper plus PID `lsof` proved the exact disposable path and no operational path. The private source fixture was copied to an owned staging directory, updated only there, imported through public GraphQL, and its source hashes remained unchanged.

Real Chrome then executed current frontend launches against the built server:

1. AutoByteus `gpt-5.6-luna`.
2. Codex App Server `gpt-5.6-luna`, reasoning `medium`.

The real Team launch succeeds on both. Each creates a fresh rooted TeamRun, exact rooted topology, one delegated task-Team execution, visible task Team row, task details, active -> awaiting_review -> accepted status, exact submission, accepted review, refresh-retained task row/details, terminal transient-row cleanup, and successful termination. This resolves `API-F-018` downstream.

## Expected versus observed

| Runtime | Expected | Observed |
| --- | --- | --- |
| AutoByteus | One task-scoped `TASK_PEER_AUTOBYTEUS` message from student_one to student_two and at least one same-chain peer reply before submission | Zero such communication records. The coordinator submitted `NESTED_CLASSROOM_OK_AUTOBYTEUS`; Teacher accepted it. |
| Codex App Server | One task-scoped `TASK_PEER_CODEX` message from student_one to student_two and at least one same-chain peer reply before submission | Zero such communication records. The coordinator submitted `NESTED_CLASSROOM_OK_CODEX`; Teacher accepted it. |

The durable task record proves a real nonempty task-Team chain and accepted lifecycle; the public communication query proves only persistent Teacher/StudentStudyGroup messages and no task-scoped peer message. Both providers completed the task while omitting an explicit required step. Staged `student_one` instructions explicitly said it must not bypass a peer exchange requested by the delegated task. This was not a missing credential, declared skip, database collision, mock, screenshot-only inference, or browser locator failure.

## Failure-origin uncertainty

- The task-Team has current exact identity and the `send_message_to` catalog/source boundary exists.
- Prior deterministic routing coverage is green, but it does not prove that the live task coordinator actually receives/obeys the peer-tool obligation across providers.
- Two distinct runtimes omit the same required effect. That may indicate a work-packet/instruction/tool-exposure gap, an orchestration semantic gap that permits premature submission, or provider nondeterminism. API/E2E does not guess which.
- No implementation source was edited. No assertion was weakened. Claude, standalone Agent, selected-active-Team config browser inspection, and real mobile reference rows were halted as `Not Tested` after the critical live contract failure.

## Evidence

- `live/browser/autobyteus-browser-row.json`
- `live/browser/autobyteus-browser-row-final3.log`
- `live/browser/codex-browser-row.json`
- `live/browser/codex-browser-row-rerun.log`
- `live/api-f019-source-boundary-audit.log`
- `environment/safe-target-preflight.log`
- `environment/secrets-import-execution.log`
- `environment/safe-server-ready.json`
- `environment/server-pid-lsof.log`
- `environment/final-cleanup-verification.log`

## Safety and cleanup

Owned ports `60227/31227` are closed. The owned runtime, disposable database, vault root key, and staged copy are removed. Private source fixture hashes are unchanged. `/Users/normy/.autobyteus/server-data/db/production.db` was not inspected, targeted, opened, copied, migrated, repaired, rolled back, deleted, or otherwise acted on. Protected `60004/31004` were absent and untouched. Both historical operational-database incident disclosures remain preserved.
