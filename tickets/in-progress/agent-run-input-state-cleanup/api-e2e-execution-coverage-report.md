# API/E2E Execution Coverage Report — autobyteus-140 `agent-run-input-state-cleanup`

Paths are relative to the ticket folder unless noted.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1; Implementation Complete IR-001 (direct Small/Low route)
- Prior round reviewed: none
- Deviations from the investigation's plan, and why: the LIVE-01 probe's final "two completed turns" wait timed out because turn 2's model output ran away. All measured checks had completed before that (see LIVE-01).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-run-input-state-cleanup/tickets/in-progress/agent-run-input-state-cleanup/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings |
| --- | --- | --- | --- | --- |
| ENV-1 | `a3c4982721` (HEAD `24b6017a7e` adds only the ticket folder) | macOS 26.5.2 arm64 | Node v22.23.1; worktree source | Server tests isolated by `tests/setup/test-environment-isolation.ts` |
| ENV-2 | `a3c4982721` | macOS 26.5.2 arm64 | Built `autobyteus-server-ts/dist/app.js` (16:23, contains the refactor); clean env; temp data root | Native runtime; LM Studio `qwen/qwen3.6-35b-a3b`; 500 ms window |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| CODE-01 | AC-001, AC-002, AC-003, AC-004 | Code reading (direct route has no independent code review) | `git diff 2763e7c678 c2e8335c42 -- autobyteus-server-ts/src`; base vs HEAD call sites (`grep -n`); test diff +/- lines; `grep -rn start_only autobyteus-server-ts/tests` | ENV-1 | Pass | `evidence/CODE-01-code-reading.txt` | `## Call sites, base` shows `94:`, `291:`, `383:` with `reconcileRecovery(); this.publishInputState();`; `## Call sites, HEAD` shows the same lines with `reconcileAndPublishInputState()`, while `207:`/`360:` (publish-only) and `120:`/`121:` (termination) are unchanged. `(no matches)` for `start_only`; `0` changed `expect(` lines; `## Conclusions` | Behavior equivalence: same read order (entries, then `reconcile()`), same signature keys, same DTO key order |
| REPO-01 | AC-005 | `agent-run.test.ts`, PB-001 socket file (own rerun) | `pnpm -C autobyteus-server-ts exec vitest run tests/unit/agent-execution/agent-run.test.ts --no-watch`; `… tests/integration/agent/agent-status-websocket.integration.test.ts --no-watch` | ENV-1 | Pass | `evidence/REPO-01-own-rerun.log` | `Tests  46 passed (46)`, `Tests  8 passed (8)`, `# exit 0` twice | — |
| REPO-02 | AC-005 | typecheck | Reused IMP-01 | — | Pass | `evidence/IMP-01-server-typecheck.log` | `# exit: 0` | Ran at `a3c4982721`; HEAD adds only the ticket folder |
| REPO-03 | AC-005 (BEH-001) | `tests/unit/agent-execution` | Reused IMP-03 | — | Pass | `evidence/IMP-03-unit-agent-execution-excerpt.txt` | `Tests  1468 passed \| 6 skipped (1474)` | as above |
| REPO-04 | AC-005 (BEH-001) | PB-001 socket ×3; sequenced-socket cadence ×3 | Reused IMP-04, IMP-05 | — | Pass | `evidence/IMP-04-agent-status-websocket-run{1,2,3}.log`, `IMP-05-chat-socket-cadence-run{1,2,3}.log` | `Tests  8 passed (8)` and `Tests  18 passed (18)` in each run | as above |
| REPO-05 | AC-004, AC-005 (BEH-002) | The 6 edited test files | Reused IMP-06 | — | Pass | `evidence/IMP-06-edited-test-files.log` | `Test Files  6 passed (6)`, `Tests  99 passed (99)` | as above |
| REPO-06 | AC-005 | Server `test:unit`, `test:integration` | Reused IMP-07, IMP-08, IMP-09 | — | Pass | `evidence/IMP-07-server-unit-excerpt.txt`, `IMP-09-server-integration-excerpt.txt` | `Tests  5950 passed \| 7 skipped (5957)`; `Tests  415 passed \| 69 skipped (484)` | as above |
| REPO-07 | AC-004 | Type probe and grep | Reused IMP-02, IMP-10 | — | Pass | `evidence/IMP-02-tests-type-probe.txt`, `IMP-10-start-only-grep.txt` | `Errors in the 7 edited files: before 88, after 80`, "Added": none; `## start_only` then `(no matches)` | Remaining errors are FU-001 (autobyteus-65) |
| MUT-01 | AC-005 (coverage quality) | Temporary mutants of `agent-run.ts` | (a) `this.inputRevision += 1;` removed; (b) `reconcile()` moved before `pendingSnapshot()`; each run with `agent-run.test.ts` + `agent-status-websocket.integration.test.ts`, then `git checkout` | ENV-1 | Pass | `evidence/MUT-01-mutants.txt` | Mutant (a): `Tests  5 failed \| 49 passed (54)` (5 PB-001 publish-once/snapshot cases); mutant (b): `Tests  54 passed (54)`; `RESTORED` after each; `## Reading` | (b) is an equivalent mutant: `reconcile()` writes only the recovery's own fields and does not change the pending entries, so the two calls commute and no test can observe their order |
| LIVE-01 | AC-005 / BEH-001 on a real stream (SCN-A1) | Built server → `/ws/agent`, native runtime, LM Studio | `node evidence/LIVE-01-live-stream-probe.mjs --server-dir autobyteus-server-ts --out evidence/LIVE-01 --label refactor` (PB-001 probe; port fix only). Steps: socket A, message 1, message 2 queued 1.5 s into streaming, socket B 1.2 s later | ENV-2 | Pass | `evidence/LIVE-01/summary.json`, `frames-A.jsonl`, `frames-B.jsonl`, `server.log`, `00-HEADER.md` | `summary.json`: A `"inputStateRevisions": [1,2,3,4,5,6,7,8]`, `"inputStateRepeats": 0`, `"contentFrames": 1507`, `"windowGapStats": {"n": 1501, "min": 492, "median": 516, "max": 789, "under350": 0}`; `"queuedMessage": {… "delayMs": 2, "revision": 5, … "frameBefore": {"type": "SEGMENT_CONTENT", … "gapMs": 0}}`; `"reconnect": {… "snapshotRevision": 5, … "bRevisionsAfterSnapshot": [6,7,8], "bGotEveryLaterRevision": true}`; B `"inputStateRepeats": 0` | `"failure": "Error: Timed out: two completed turns on A"`: turn 2's model output ran away (185,352 characters); all measured checks completed before that. The window min of 492 ms (under 500) is client receive jitter; timers do not fire early, and none are under 350 ms. No error lines in `server.log` |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 (one named revision step; pure builder; call order unchanged) | Yes | CODE-01, MUT-01 (a) | Proven | — |
| AC-002 (three pairs consolidated; publish-only sites and termination unchanged) | Yes | CODE-01 | Proven | — |
| AC-003 (comment) | No | CODE-01 | Proven | — |
| AC-004 (no `start_only`; doubles declare the current contract; `ScriptedAgentRunBackend` conforms) | Yes | CODE-01, REPO-05, REPO-07 | Proven | — |
| AC-005 (suites green; no assertion changed; no behavior change) | Yes | REPO-01..REPO-07, MUT-01, LIVE-01, CODE-01 (`0` changed `expect(` lines) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository | Final | Supports (Case IDs) | Residual Uncertainty | Could Improve |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | 97% | CODE-01, REPO-*, MUT-01, LIVE-01 | — | — |
| Changed-boundary execution directness | 95% | 97% | Real `AgentRun` in unit/socket tests; built server in LIVE-01 | — | — |
| Cross-boundary integration realism and mock gap | 88% | 95% | LIVE-01 real runtime batches, queued message, second subscriber | Compaction-recovery blocks not live (unit-covered; ordering proven equivalent) | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 96% | Clean-env built server; doubles now on the current contract | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 92% | 95% | Termination, compaction recovery, pull read and reconnect cases (IMP-03, REPO-01); LIVE-01 reconnect | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI or transport change; frames unchanged (LIVE-01) | — | — |
| Durable regression coverage quality and relevance | 95% | 96% | MUT-01: the revision step is guarded by 5 PB-001 cases | — | — |

- Overall post-repository confidence: 92.8%
- Overall final confidence: 96.0%
- Calculation method: simple average of the 6 applicable categories
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: none material.

## Broader Validation Decision (Mandatory)

- Decision: `Required`, scaled to the risk; executed (LIVE-01).
- Execution mode: `Live API` (one PB-001 real-stream run).
- Gap addressed: a real runtime's batch mix through the refactored `AgentRun`; it confirmed publish-once, the immediate queued revision and the reconnect snapshot.
- Browser: not needed (no UI, transport or client change).

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`. Compatibility-only behavior: `No` (the side-effecting `inputStateEvent()` was replaced in place, with no wrapper). Durable coverage for compatibility: `No`.

## Durable Coverage Changed In The Codebase

- By API/E2E: `No`. The implementation's 6 test-double edits were validated (CODE-01, REPO-05, REPO-07).
- Test-code review: `Not Required — direct low-risk route`.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| Paid providers | Local LM Studio model | Provider-independent refactor | None material |

## Temporary Methods And Cleanup

| Item | Owned | Cleanup | Result |
| --- | --- | --- | --- |
| `evidence/LIVE-01-live-stream-probe.mjs` (copy of the PB-001 probe) | Yes | Kept as evidence | — |
| MUT-01 mutants of `agent-run.ts` | Yes | `git checkout` after each | `RESTORED` twice; `git status` shows no source change |
| Probe server + temp root | Yes | SIGTERM + `rm -rf` by the probe | None left |
| LM Studio `qwen/qwen3.6-35b-a3b` (none loaded at start) | Yes | `lms unload` when IDLE | Unloaded |
| Other person's instance `iso-65187-14ae` | No | Not touched | — |

## Follow-Ups (Outside This Ticket)

- FU-001 (designer): the wider test-double drift belongs to autobyteus-65 (unchanged).

## Latest Authoritative Result

- Result: `Pass`
- Final validation confidence: 96.0%
- Criteria not proven, or parts only the user can check: `None`
- Next recipient from `get_handoff_rules`: Delivery Engineer (direct Small/Low route)
- Notes: no behavior change observed; the refactored revision step is guarded by existing tests.
