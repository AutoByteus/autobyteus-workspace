# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, CRR-002 Pass (Large / High)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - AC-001's verification asks for "a built-server E2E with a scripted Claude CLI". The built-server proof uses the REAL Claude CLI instead (LC-01), on a test-owned Claude home with the test vault's key: it proves the same outcome more directly (the real not-found signal, a real fresh session that answers), and needs no new scripted-Claude harness.
  - The new live file needed four test-side corrections while it was written, each found by running it: the vault setting is read with `capturedTestVaultSetting()` (the test setup takes it out of the environment); WebSocket frames are unpacked with `agentStreamFramesOf` (text comes in batches); the chat line is read from the reopened chat's stream snapshot, where the web reads it (no separate notification frame is sent); the CLI recorders are `.cjs` (the runtime root is inside this ES-module package, where an extensionless script loads as a module, which made the server fall back to the unrecorded CLI). The suite now asserts each recorder answers `--version` before the server starts.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/stale-runtime-session-recovery-599/tickets/in-progress/stale-runtime-session-recovery/evidence/`

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: requested (durable test changes below)

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | code `1df7771aac` (HEAD `b220b6ce38`), tests at `03e5d4b4b1`, `f23f0dc834` | macOS 26.5.2 ARM64, load 4–13 (quiet) | Node v22.23.1; server `dist/` built at API-00 | `env -i PATH HOME=<temp> TMPDIR USER` |
| ENV-2 | same | same | built server + real Claude Code 2.1.330 (claude-haiku via the test vault's `provider.anthropic.api-key`, `CLAUDE_AGENT_SDK_AUTH_MODE=api-key`) | `HOME` and `CLAUDE_CONFIG_DIR` test-owned folders of the suite; a recorder in front of the CLI; nothing written to `~/.claude` (checked: the only newer file there is this conversation's own transcript) |
| ENV-3 | same | same | built server + real codex-cli 0.171.0 (gpt-5.6-luna) | throwaway `CODEX_HOME` linking the host `auth.json`; recorder in front of the app-server |
| ENV-4 | same | same | in-process Claude live harness, real Claude Code 2.1.330 (both the PATH CLI and the SDK's bundled CLI) | test-owned `HOME`/`CLAUDE_CONFIG_DIR`, api-key mode with the test vault |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-00 | — | server build | `pnpm -C autobyteus-server-ts build` | ENV-1 | Pass | `API-00-server-build.log` | `exit 0` | — |
| API-01 | AC-001…AC-006, AC-008 | units, real roots, AGY built server, Claude CLI shape, per-composition wiring | Reused: IMP-04, IMP-06, IMP-10…IMP-13 (on the code under test; later commits are tests and docs only); server typecheck with the new tests | ENV-1 | Pass (reused) | handoff IMP-04…IMP-13; `API-01b-server-typecheck.log` | `1000 in 313 files (baseline 1000 in 313 files)`, `PASS` | — |
| API-02 | **AC-007**, AC-001 (live), AC-006, REQ-004, REQ-007 | built server + real Claude (LC-01) | `env -i PATH HOME USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 AUTOBYTEUS_TEST_VAULT=~/.autobyteus-test/vault LOST_SESSION_LIVE_E2E_EVIDENCE_DIR=… pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/lost-session-renewal-live.e2e.test.ts` | ENV-2 | Pass | `API-02-04-live-claude.log`, `API-02-04-live/LC-01-claude.json` | `✓ LC-01`; `lost` ≠ `fresh`; `marker` = "The saved Claude Agent SDK session of this run was no longer available, so a new session continues from the work journal."; `firstInputStart` begins `[System: runtime hand-over]`; `answerRecallsCodeword: true` | the era-1 session file the test's own run created was removed from its own `CLAUDE_CONFIG_DIR`; the fresh agent answered with era 1's codeword, which only the work journal still held; one `RUNTIME_SESSION_LOST` warning names the run, the runtime and the lost ID; a reopened chat's stream shows the line after the earlier conversation |
| API-03 | AC-003 (live) | the same run on a server whose Claude cannot sign in, then signed in again | inside LC-01 | ENV-2 | Pass | `API-02-04-live/LC-01-claude.json` | `refusedFailures`: `CLAUDE_RUNTIME_AUTHENTICATION_FAILED: Not logged in · Please run /login`; no second marker or segment; `answerAgain: "OK"` with no second notice | an auth failure is not a lost session |
| API-04 | RSK-003 | busy restart on the built server (LC-02) | inside the same run of the file | ENV-2 | Pass | `API-02-04-live/LC-02-claude-busy-restart.json` | `recall` = the codeword; `resumedArgv` session process `--resume=<sessionId>`; no `session_renewal` marker or segment | the server stopped while the run's `sleep 45` command ran |
| API-05 | AC-002 (Codex, live) | built server + real Codex (LC-03) | `env -i … RUN_CODEX_E2E=1 … vitest run tests/e2e/runtime/lost-session-renewal-live.e2e.test.ts` | ENV-3 | Pass | `API-05-live-codex.log`, `API-02-04-live/LC-03-codex.json` | `✓ LC-03`; marker "The saved Codex App Server session…"; new thread ID; the last `turn/start` carries `[System: runtime hand-over]` | the rollout was removed from the throwaway `CODEX_HOME` |
| API-06 | RSK-003 (the family's own cases) | `claude-agent-streaming-session-lifecycle.e2e` restore cases after the update | `env -i PATH HOME=<temp> CLAUDE_CONFIG_DIR=<temp>/config USER LOGNAME TMPDIR RUN_CLAUDE_E2E=1 CLAUDE_AGENT_SDK_AUTH_MODE=api-key AUTOBYTEUS_TEST_VAULT=… vitest run …lifecycle.e2e.test.ts -t "restore"`; negative control without `verifyResumable` in the harness | ENV-4 | Pass | `API-06-claude-lifecycle-restore-cases.log`, `API-06nc-lifecycle-restore-negative-control.log` | `Tests  4 passed` (restart restore and usage across a crash reopen and a restore, both CLI candidates); control `× … a restarted server restores …` ×2, `expected [] to have a length of 1` | the restore case was made untrue by this change (it asserted a lazy open); the harness now restores as the factory does |
| API-07 | all | whole server unit suite | `env -i … pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass | `API-07-server-unit-suite.log` | `Test Files  1067 passed`, `Tests  8900 passed`, `exit 0` | — |
| API-08 | all | server integration | `test:integration:prepare`, `test:integration` | ENV-1 | Pass | `API-08-server-integration.log` | `Test Files  90 passed`, `Tests  517 passed`, `exit 0` | — |
| API-09 | all | whole server E2E | root `env -i … pnpm test:e2e`; the two failing files alone twice | ENV-1 | Pass for this change | `API-09-server-e2e-suite.log`, `API-09b-cleanup-failures-alone.log` | `Test Files  2 failed \| 126 passed`; both `ENOTEMPTY: directory not empty, rmdir …` in cleanup; alone `Tests  14 passed (14)` and `Tests  7 passed (7)` twice each | cleanup races with a still-writing test-owned process (agent-runtimes-graphql's fake CLI children; team-run-config's SIGKILLed server); neither case drives a restore or renewal. FU-002. The gated AGY lost-session file is skipped ungated; its proof is IMP-04/IMP-13 on the code under test |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Or Accepted-Risk Part: What You Tried And Why It Could Not Be Proven Here |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-02 (built server, real Claude: new session ID, the REQ-004 line, the answer, the notice first on the input), API-01 (recognition units, factory test, real CLI shape IMP-06) | Proven | — |
| AC-002 | Yes | API-05 (Codex live), API-01 (AGY built-server LS-01/02 IMP-04; Grok and DeepSeek recognition on the probed shapes, units, IMP-07) | Proven | — |
| AC-003 | Yes | API-03 (live auth failure), API-01 (LS-03 AGY conflict; unit negatives) | Proven | — |
| AC-004 | Yes | API-01 (unit and journal-backed retry, one marker / one segment) | Proven | — |
| AC-005 | Yes | API-01 (built-server Team member LS-02; real Team/Org roots and delegated copy in `member-session-renewal.test.ts`) | Proven | — |
| AC-006 | Yes | API-02 (reopened chat shows earlier conversation then the line; later message to the new session without a second notice), API-01 (LS-01/02) | Proven | — |
| AC-007 | Yes | API-02 | Proven | — |
| AC-008 | Yes | API-01 (one test per composition with negative controls, IMP-12; studio built server IMP-13), API-02 (studio live) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 92% | 96% | every criterion directly proven; the founder's case end to end on real Claude | Grok and DeepSeek at unit level on probed shapes | live Grok/DeepSeek renewals |
| Changed-boundary execution directness | 92% | 96% | built server, real CLIs, real restart, real WebSocket | — | — |
| Cross-boundary integration realism and mock gap | 90% | 95% | real Claude and Codex; AGY scripted where no inference is needed | Grok/DeepSeek live; the application host has no run API (real supervisor with the host's wiring, IMP-12) | — |
| Environment, configuration, identity, and fixture fidelity | 94% | 96% | test-owned runtime homes and data; test vault; quiet host this round | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 93% | 95% | auth failure live, AGY conflict, retry by key, busy restart, the renewed session restored | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | server-only; the chat line uses the existing runtime-switch segment presentation (checked in the reopened stream) | — | — |
| Durable regression coverage quality and relevance | 93% | 95% | gated live file for AC-007/AC-002/RSK-003 with its recorder guard; the lifecycle harness restores as production (negative control) | — | — |

- Overall final confidence: 95.5% (simple average of the six applicable categories)
- Every critical acceptance criterion directly proven, apart from parts only the user can check or accepted as unverified risk: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed: built server with real Claude and Codex, a real restart while busy, the Claude live lifecycle family
- Residual risk: Grok and DeepSeek renewals live (optional per the reviewer; shapes pinned from probes)

## Persisted-Data Transition Checks

- `Not Affected` as designed: a renewal writes existing shapes (a `runtime_switch` segment, the `system.runtime_handover` marker, the session ID in metadata); LC-01 reads them back through the reopened chat and the next restore

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/lost-session-renewal-live.e2e.test.ts` (LC-01…LC-03, gated) | Added (`f23f0dc834`) | API-02…API-05 | — |
| `autobyteus-server-ts/tests/e2e/helpers/claude-live-agent-harness.ts` | Updated (`03e5d4b4b1`): a restore calls `verifyResumable()` as the factory does | API-06 | — |
| `autobyteus-server-ts/tests/e2e/runtime/claude-agent-streaming-session-lifecycle.e2e.test.ts` | Updated (`03e5d4b4b1`): the restore case asserts the process opened at the restore serves the turn (made untrue: it asserted a lazy open); optional isolated mode (api-key with the test vault) | API-06 | — |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Antigravity CLI (reused IMP-04/13) | scripted fixture with a lost-conversation file | no inference needed; real shape from PRB-004 | — |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| diagnostics in the new live file while it was written (process lists, recorder probe print) | Yes | removed before the commit (a permanent recorder guard kept) | `grep DIAG` none |
| harness negative control (API-06nc) | Yes | file copied back | restored |
| test-owned Claude/Codex homes, data roots, recorders | Yes (the suite) | the suite's `removeOwnedTestRuntime`; temp homes `rm -rf` | removed |
| scripts in `/tmp` | Yes | `rm` | removed |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, parts only the user can check, or accepted as unverified risk (IDs, with `DEC-*`): `None`
- Evidence decisions requested (criterion, date sent, `DEC-*` once decided): `None`
- Next recipient from `get_handoff_rules`: `/code_reviewer` (proportional test-code review, Large / High)
- Notes: follow-ups FU-001 (Claude Code cleanup period, the Solution Designer's) and FU-002 (two E2E cleanup races). Not run live: Grok, DeepSeek.
