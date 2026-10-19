# API/E2E Execution Coverage Report

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md` (lists the upstream documents)
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1; code review CRR-001 `Pass` (9.4/10)
- Prior round reviewed: None
- Deviations from the investigation's plan, and why:
  - The new E2E was strengthened after its first run. Run 1 passed 5/5, but each coordinator log held only 2 ASCII records. The original defect is a cut by characters on non-ASCII text, so each coordinator now also gets two non-ASCII user turns (≥ 6 records with multi-byte characters). USR-4's damaged line moved to the middle of the log. Run 2 is the evidence.
  - API-07 (USR-5, second restart) and API-08 (negative control on the base build) were added to the plan before they ran.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/unclean-shutdown-delegated-run-restore/tickets/in-progress/unclean-shutdown-delegated-run-restore/evidence/` (files `API-*`)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Required` (one new E2E file)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | Product code `a9b5230505` + `b166e0db70` (HEAD `f91c9126db` adds only the test and docs) | macOS 26.5, Node v22.23.1, pnpm 10.28.2 | `autobyteus-server-ts/dist` built from this worktree (`prebuild` + `build`, exit 0); three separate `node dist/app.js` processes | `env -i` clean env with a resolved temp `HOME`. Child servers get only `PATH`, `HOME=<root>/home`, `TMPDIR`, `USER`, `DATABASE_URL=file:<root>/db/production.db`, `ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs`, `AGY_FAKE_CASE=linked_skills`, `AUTOBYTEUS_AGENT_PACKAGE_ROOTS=""`, `LMSTUDIO_HOSTS=http://127.0.0.1:1`. Test-owned temp data root, synthesized data only |
| ENV-2 | `19448e398c` (product code as ENV-1) | same | In-process Studio server of the existing E2E suites | `env -i` clean env, temp `HOME`, scripted AGY CLI |
| ENV-3 | Base `f171032e88` + test file from `f91c9126db` | same | Temporary `git worktree` of the base, `pnpm install --frozen-lockfile --prefer-offline`, `prebuild`, `build` | As ENV-1; the worktree was removed afterwards |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-02 | AC-003, AC-004, AC-007 | `autobyteus-ts` store | Reused: IMP-02 | — | Pass | (implementation handoff) | — | `autobyteus-ts` unchanged since `a9b5230505` |
| IMP-03 | AC-008, RSK-001 | `autobyteus-ts` unit | Reused: IMP-03 | — | Pass | (implementation handoff) | — | Same reasoning |
| IMP-06 | AC-001, AC-002, AC-004, AC-006 (all 3 adapters) | Server units | Reused: IMP-06 | — | Pass | (implementation handoff) | — | Since `b166e0db70` only docs and the new E2E file changed |
| IMP-07 | AC-008 | Server unit suite | Reused: IMP-07 | — | Pass | (implementation handoff) | — | Same reasoning |
| IMP-08 | AC-008 | Server integration suite | Reused: IMP-08 | — | Pass | (implementation handoff) | — | Same reasoning |
| API-01 | AC-005, REQ-001…REQ-004, QR-002 | Built server (new process) → Team stream `SEND_MESSAGE` → task-execution lifecycle → Team adapter → inspector → AGY backend → `ExternalRuntimeMemoryWriter` → `RunMemoryFileStore` | `env -i PATH HOME=<temp> TMPDIR USER RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs USDR_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts --no-watch`, case **USR-1**. Steps: server #1 → Team root → manager delegates a Team (`delegate_task`) → coordinator answers its Task and 2 non-ASCII user turns → `SIGKILL` server and its AGY processes → append 1,241 zero bytes to the coordinator's `raw_traces_active.jsonl` → server #2 → `restoreAgentTeamRun` → user sends `continue (USR-1)` to the coordinator | ENV-1 | Pass | `API-01-unclean-shutdown-e2e-vitest.log`, `API-01-unclean-shutdown-e2e-receipt.json`, `API-01-unclean-shutdown-e2e-server-output-excerpt.log` (full: `…-full.log.gz`) | vitest `Tests  5 passed (5)`. Receipt `cases.USR-1`: `"bytesRemoved": 1241`, `recordsBefore` 6 → `recordsAfter` 8, `newTraceTypes: ["user","assistant"]`. Excerpt line `381:   bytesRemoved: 1241,` under `Removed the damaged end of a memory log.` | Asserted in the test: no `ERROR` frame; the coordinator answered (`OK`); the first 1,843 bytes are byte-identical; no `0x00`; the file ends with `\n`; exactly one warning names the file. The log held multi-byte text before the damage |
| API-02 | AC-005 variants, REQ-001, REQ-003, REQ-004 | same | Same command; cases **USR-2** (append `{"id":"x","trace_type":"tool_res`, no `\n`) and **USR-3** (same + `\n`, so the last byte is `0x0A`) | ENV-1 | Pass | same files | Receipt `cases.USR-2.bytesRemoved: 32`, `cases.USR-3.bytesRemoved: 33`. Excerpt lines `394:   bytesRemoved: 32,` and `407:   bytesRemoved: 33,` | USR-3 is the shape a last-byte check alone would miss; the tail check repaired it before the append |
| API-04 | AC-006, REQ-005 | same, refusal path | Same command; case **USR-4**: 8 zero bytes inside line 3 of 6 (complete records after it), then `continue (USR-4)` | ENV-1 | Pass | `API-01-unclean-shutdown-e2e-receipt.json`, `API-01-unclean-shutdown-e2e-server-output-excerpt.log` | Receipt `cases.USR-4.refusal`: `"code": "TEAM_SEND_MESSAGE_REJECTED"`, `"details": "TASK_EXECUTION_CONTEXT_UNAVAILABLE"`, `"message": "The delegated Team at '/usdr_marketing_2f619d' cannot be restored: the saved conversation of its coordinator '/usdr_marketing_2f619d/lead' cannot be read (line 3 of raw_traces_active.jsonl is damaged). Its files were left unchanged. Start a new delegation for this work, or restore its saved conversation from a backup."`. Excerpt line `417:   reason: 'line 3 of raw_traces_active.jsonl is damaged',` | Asserted: the exact message, nothing delivered, file SHA-256 unchanged, no repair warning for that file |
| API-07 | SCN-003, REQ-004, AC-005 | same, third process | Same command; case **USR-5**: SIGTERM server #2 (logs unchanged by the shutdown) → server #3 → restore root → `continue again (USR-n)` to each repaired coordinator | ENV-1 | Pass | `API-01-unclean-shutdown-e2e-receipt.json`, `API-01-unclean-shutdown-e2e-server-output-excerpt.log` | Receipt `cases.USR-5`: each of USR-1..3 `recordsBefore: 8, recordsAfter: 10`, `"warningsOnThirdServer": 0`. Excerpt: no `bytesRemoved` after line `73: 425: ===== server #3 =====` | Asserted: every byte written after the first repair is kept, the first `continue` is still there, no `0x00`. The root manager's intact log keeps its prefix and is never named in a warning |
| API-03 | REQ-005 (`none` wording), BEH-004 | In-process Studio server, Org root, `delegate_task` to an existing copy | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts -t "EXC-E2E-007" --no-watch` | ENV-2 | Pass | `API-03-exc-e2e-007.log` | `Tests  1 passed \| 8 skipped (9)`; receipt `"message": "The delegated Agent at '/helper' cannot be restored: it has no saved conversation to continue. Start a new delegation for this work."` | The 8 skipped are the other cases of the file (filtered by `-t`), not gates |
| API-05 | Preserved behavior (intact logs restore as before) | In-process Studio server; Team, Agent and Org roots; Stop → reopen → message | `env -i … pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/delegation-forest-restore.e2e.test.ts --no-watch` | ENV-2 | Pass | `API-05-delegation-forest-restore.log` | `Tests  3 passed (3)` (DF-1, DF-2, DF-3) | Restores through the changed inspector and all three adapters with intact logs |
| API-06 | — (test hygiene) | Type check of the new test file | `pnpm -C autobyteus-server-ts exec tsc -p tsconfig.json --noEmit --rootDir .`, filtered to the new file | ENV-1 | Pass | `API-06-test-typecheck.log` | `Errors in the new E2E file other than TS4111: 0` | Tests are in no project type-check gate (12,009 repo-wide errors, mostly TS4111 style). The new file has only TS4111 (29), the same style as every E2E file (140 in `task-existing-copy-assignment`) |
| API-08 | AC-005, AC-006 (does the test catch the bug?) | The new E2E on the base build | Temp `git worktree add --detach <temp> f171032e88`; `pnpm install --frozen-lockfile --prefer-offline`; `prebuild`; `build`; copy the test file; same command as API-01; `git worktree remove --force` | ENV-3 | Pass (expected failures observed) | `API-08-negative-control-base.log` | `Tests  5 failed (5)`. USR-1..3: `"message": "The delegated Team at '/usdr_marketing_9c71b5' is shut down and its saved conversation is unavailable (indeterminate); it cannot be restored."`. USR-4: `Received: "The delegated Team at '/usdr_marketing_9c71b5' is shut down and its saved conversation is unavailable (indeterminate); it cannot be restored."` | Reproduces the user's refusal from the report on synthesized data, and shows the new test fails without the fix |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | IMP-06 (unit); API-01, API-02 (the check classified the damaged-end logs as restorable through the real adapter) | Proven | — |
| AC-002 | Yes | IMP-06 (`none` with a damaged end; `indeterminate` with line); API-04 (mid-file line → `indeterminate`, line 3) | Proven | — |
| AC-003 | Yes | IMP-02; API-01, API-02 (byte-exact prefix kept on multi-byte content; one warning with file and exact `bytesRemoved` 1241/32/33); API-07 (intact logs: no rewrite, no warning) | Proven | — |
| AC-004 | Yes | IMP-02, IMP-06; API-01, API-02 (new turn after the repair, no `0x00`); API-07 (the next process keeps every record) | Proven | — |
| AC-005 | Yes | API-01 (zero-filled end, 1,241 bytes), API-02 (torn, with and without `\n`), API-07; API-08 shows the test fails without the fix | Proven | — |
| AC-006 | Yes | API-04 (Team adapter through the real stream, exact text, file unchanged); IMP-06 (Agent, AgentOrg and standalone adapters); API-03 (`none` wording, Org root) | Proven | — |
| AC-007 | No (Should) | IMP-02 (spied fsync before rename) | Proven (unit; not observable at a system boundary) | — |
| AC-008 | Yes | IMP-03, IMP-05, IMP-07, IMP-08; API-03, API-05 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

Post-repository: after the reused implementation checks and the existing E2E suites (IMP-*, API-03, API-05, API-06). Final: after the lifecycle E2E on built server processes (API-01, API-02, API-04, API-07) and the negative control (API-08).

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 75% | 96% | All ACs; AC-005 and AC-006 directly (API-01/02/04/07) | AC-006 for the Agent/Org/standalone adapters is unit-proven only. That matches its verification intent and uses the same refusal function | E2E refusal for the Org and standalone roots (low gain) |
| Changed-boundary execution directness | 80% | 96% | API-01/02/04/07 enter through the user's message on the Team stream after a real process restart | The crash damage is written by the test, not by a real power loss | — (a real power loss cannot be produced safely) |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real built server, DB, GraphQL, WebSocket, AGY backend, memory writer, store; only the external AGY CLI is scripted | Other runtimes (native, Codex, Claude) not run end to end; they write through the same store (IMP-02 covers the native `add` path) | A native-runtime variant (low gain) |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Clean env, separate processes, SIGKILL crash, damage shaped like IN-DAT-01 (1,241 zero bytes after the last record), multi-byte content | macOS host instead of the user's Linux Docker node. The repair uses platform-neutral Node fs calls (`readSync`, `truncateSync`, `appendFileSync`) | A test-owned Linux container run (low gain) |
| Failure, edge-case, lifecycle, and recovery evidence | 75% | 96% | Three end shapes, mid-file refusal with an unchanged file, a second restart, intact-log restore (API-05), negative control (API-08) | A last record longer than 64 KiB (full-read fallback) is unit-only (IMP-02) | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | — | Not applicable: no frontend change (requirements: UI `No`). The refusal text is proven at the stream frame (API-04); the existing error card renders the frame's `message` unchanged | — |
| Durable regression coverage quality and relevance | 85% | 95% | New gated E2E file; it catches the bug (API-08) | Gated like every scripted-AGY suite (`RUN_AGY_FAILURE_E2E=1`) and needs a current `dist` build | — |

- Overall post-repository confidence: 79% (75, 80, 75, 85, 75, 85)
- Overall final confidence: 95.5% (96, 96, 95, 95, 96, 95)
- Calculation method: simple average of the applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material. See the residual notes in the table and the observation under Latest Authoritative Result.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Lifecycle`. The built server ran in three separate processes on a test-owned data root: SIGKILL crash → damage → restart → the user's message → second restart. The external runtime was the scripted AGY CLI.
- Confidence gap it addresses: after the repository checks, AC-005 (the user's journey) was unproven. The chain restore lifecycle → adapter → inspector → AGY backend → writer → store had never run together in a fresh process with fresh store instances. Gain: direct proof of AC-005/AC-006 and SCN-003, and a negative control.
- Browser validation needed: No. The change is backend-only. The client-visible effect is the text of an existing `ERROR` frame, which API-04 asserts exactly; the frontend is unchanged.

## Persisted-Data Transition Checks

- Approved persisted-data decision: `Directly Usable — No Migration`
- Representative existing data used: logs written by real runs of the same format, then damaged; intact logs of the root manager and of USR-4's untouched records
- Approved transition followed without an unnecessary migration: `Yes`. There was no startup scan: logs were changed only when a run's log was opened for use (one warning per damaged file, none on intact files, none on the third start).
- Cases proving the direct-use outcome: API-01, API-02, API-07, API-05
- Version-specific runtime branch, dual read/write, or compatibility fallback observed: `No`
- Residual untested persisted-data risk: none material

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the legacy-manifest probe reads data older versions wrote; the architecture review confirmed it)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `Yes`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts` (commit `f91c9126db`) | Added | API-01, API-02, API-04, API-07 (USR-1…USR-5) | — |

- Added or updated paths attached for proportional test-code review: `Yes`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (`agy`) | Scripted CLI `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | TESTING.md: runtimes without a model; no provider credit; no isolated signed-in `agy` recipe | Proves the transport and restore path, not paid inference. The memory written is produced by the real server-side AGY backend and writer |
| Power loss | `SIGKILL` of the server and its AGY processes, then writing the damage the filesystem leaves (IN-DAT-01 shape) | A real power loss cannot be produced safely in a test | The damage bytes are synthesized; their shapes match the user's file and the design's examples |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Three server processes per E2E run | Yes | SIGKILL (#1, the crash), SIGTERM (#2, #3) | Receipt `serversExited: [true, true, true]`; log `Server closed cleanly.` for #2 and #3 |
| AGY CLI processes started by those servers | Yes | Killed after the crash; checked in `afterAll` by working folder | Receipt `leftoverAgyProcesses: 0` (worktree and base runs) |
| Temp data roots (`usdr-e2e-*`), in-process suites' data dirs | Yes | Removed by the tests | Receipts `dataRemoved: true` |
| Temp base worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/usdr-api-negative-control-base` | Yes | `git worktree remove --force`, `git worktree prune` | Removed |
| `/tmp/usdr-api/` (raw logs, build logs, helper script) | Yes | Copied what matters into `evidence/`; folder removed after the handoff | Removed |
| Worktree build outputs (`dist/`) | Yes (rebuilt) | Untracked, not committed | Kept (needed by the E2E) |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: `None`. Optional, for delivery: the user's own Docker node after the fixed release is the only place a real power loss happened. TESTING.md forbids testing there, and the same damage shape is proven here on synthesized data.
- Preliminary classification and recommended owner: N/A
- Next recipient from `get_handoff_rules`: see the handoff (reviewed route: proportional test-code review of the new E2E file)
- Notes:
  - Observation, not in scope (FU-002, display readers): before the repair, the server's display readers log `Skipping malformed JSONL line in <file>: SyntaxError: …` 1–4 times per damaged file. The error text includes a snippet of the damaged line: raw `0x00` bytes, or the start of a torn record. A torn real record could put a few characters of conversation content into the server log. The new repair warning itself carries no content. The excerpt shows it at server-output lines 370–378 (each line is prefixed with its number). Recommended to fold into FU-002.
  - FU-IMP-001 (architecture guard on the base) is unaffected and was not rerun.
