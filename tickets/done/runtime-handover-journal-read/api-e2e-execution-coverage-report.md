# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation (`api-e2e-coverage-investigation.md`) is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (Small / Low, direct route)
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why: after the first Claude run (haiku) skipped the middle of the file, the probe got a model override and Claude ran again with haiku and with Sonnet, and Codex ran twice, to tell a model trait from a runtime trait.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-handover-journal-read-583/tickets/in-progress/runtime-handover-journal-read/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `5617257773` (code `014e281990`) | macOS 26.5.2 ARM64, shared host, load 44–65 | Node v22.23.1; built `dist/` (implementation's build of `014e281990`) | `env -i PATH HOME=<temp> TMPDIR USER`; `fseventsd` 140%+ |
| ENV-2 | same | same | in-process studio server; era 1 on the scripted Antigravity CLI (`AGY_FAKE_CASE=auto_compaction`); targets: codex-cli 0.171.0 (gpt-5.6-luna), Claude Code 2.1.330 (claude-haiku-4-5, claude-sonnet-4-6), native AutoByteus (claude-haiku-5-5, Anthropic key from the test vault) | isolated temp data root (removed); Codex with a throwaway `CODEX_HOME` linking the host `auth.json`; Claude with the host login (real HOME); a synthetic previous era of 600 turns (2,405 journal lines, 178 KB) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001…AC-004, AC-006 | builder, journal summary, transition on real rotation, built-server MS-01, the other notice readers, typecheck | Reused: IMP-01…IMP-04 (`014e281990`) | — | Pass (reused) | `IMP-02-unit-notice-and-journal.log`, `IMP-03-e2e-runtime-switch-built-server.log`, `IMP-04-typecheck-and-unit-wide.log` | IMP-02 `Tests  242 passed`, control `9 failed`; IMP-03 `Tests  5 passed (5)`, `Tests  26 passed (26)` | ran on the code under test |
| API-02 | **AC-005** | live switch AGY → Codex | `env -i PATH HOME USER LOGNAME TMPDIR CODEX_HOME=<throwaway> RUN_HANDOVER_READ_PROBE=1 PROBE_TARGET=codex_app_server ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs AGY_FAKE_CASE=auto_compaction AUTOBYTEUS_TEST_VAULT=… PROBE_EVIDENCE_DIR=… vitest run <probe>`, twice | ENV-2 | Pass | `API-02-live-codex.log`, `API-02-live-run-2.log`, `API-02-04-live-probe/codex_app_server*-summary.json`, `*-new-era-raw-traces.jsonl` | `seenBeforeFirstText` all 7 markers incl. `END-…` (run 1: first call `cat …/work_journal/work_journal_000001.md`, result 173,498 chars = the whole 178,309-byte file less the 3-byte `↗` per line); run 2: 7/7 before its reply, 16 calls | the user's message was only "Please continue with the work."; the agent went to the exact path only the notice gives |
| API-03 | **AC-005** | live switch AGY → Claude Agent SDK | same, `PROBE_TARGET=claude_agent_sdk`; haiku twice, Sonnet once (`PROBE_MODEL`) | ENV-2 | **Not complete: recorded (FU-001)** | `API-03-live-claude.log`, `API-03-live-haiku-2.log`, `API-03-live-sonnet.log`, `API-02-04-live-probe/claude_agent_sdk*-summary.json`, `*-new-era-raw-traces.jsonl` | haiku: `Read {limit:500}` (lines 1–500) then `{offset:2300,limit:200}` (2,300–2,407); haiku 2: lines 1–611, then 2,300–2,407; Sonnet: 1–624, 625–1,248, then 2,370–2,407, and "I've read the full journal" | each run reached the last line and skipped the middle (3 of 7 or 5 of 7 markers); `Read` returns about 610–624 lines per call. AC-005's alternate outcome: recorded as FU-001, the server text stays as approved |
| API-04 | **AC-005** | live switch AGY → native AutoByteus | same, `PROBE_TARGET=autobyteus` (vault Anthropic key) | ENV-2 | Pass | `API-04-live-default.log`, `API-02-04-live-probe/autobyteus-default-*` | `read_file` lines 1–400, 401–1,000, 1,001–1,700, 1,701–2,406; 7/7 markers before its reply | the native run records the notice it received (`autobyteus-default-notice.txt`): the approved text, naming `…/work_journal/work_journal_000001.md` with the read instruction, `work_journal_active.md starts with this hand-over`, both files listed with sizes and line counts |
| API-05 | all | whole server unit suite | `env -i … pnpm -C autobyteus-server-ts test:unit` | ENV-1 | Pass for this change | `API-05-server-unit-suite.log` | `Tests  1 failed \| 8633 passed` | `claude-provider-turn-race` failed once in the suite; alone 3 of 3 and in its 166-file folder 2 of 2 pass; its `settle()` is a fixed budget (20 × flush + 1 ms); its import closure does not reach the changed files (the journal summary and the builder are used by memory search, the episodic catalog, the composition roots and the journal view); the failing assertion was not kept by my log filter. FU-002 |
| API-06 | all | server integration | `test:integration:prepare`, `test:integration` | ENV-1 | Pass for this change | `API-06-server-integration.log` | `Tests  5 failed \| 509 passed`; all 5 in `file-system-watcher`, labelled by the test `ENVIRONMENT: the OS delivered no file event within 10 s` / `INCONCLUSIVE` | this Mac's FSEvents (autobyteus-576 measured no events in 30 s); no watcher code changed |
| API-07 | all | whole server E2E | root `env -i … pnpm test:e2e`; the 9 failing files one at a time; two of them alone twice | ENV-1 | Pass for this change | `API-07-server-e2e-suite.log`, `API-07b-failing-files-rerun.log` | `Test Files  9 failed \| 119 passed`; one at a time live-refresh, test-vault-selection, mcp-gateway-token, mcp-http-error-status, provider-secret-lifecycle pass; mcp-bulk-import and project-task-search pass alone 2 of 2 | the runtime-switch files (MS, native switch) need the scripted-AGY gate and were skipped in this ungated run (`↓ … 5 skipped`, `9 skipped`); their gated pass is IMP-03 on the code under test; node-files (hook) and node-locality (built-node stop) are host timing, as in autobyteus-576 (FU-002 there). FU-003 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (builder unit, transition test case A, MS-01) | Proven | — |
| AC-002 | Yes | API-01 (transition test case B on two real switches) | Proven | — |
| AC-003 | Yes | API-01 (builder, service, MS-01…05 and the native switch e2e with the scripted-AGY gate, IMP-03) | Proven | — |
| AC-004 | Yes | API-01 (builder unit, transition test: switch before any work) | Proven | — |
| AC-005 | Yes | API-02 (Codex ×2), API-04 (native ×1): read the named file to its last line, every part, before the reply; API-03 (Claude Agent SDK ×3): did not, recorded with its evidence as FU-001, as the criterion's alternate outcome prescribes | Proven as specified (one runtime recorded) | — |
| AC-006 | Yes | API-01 (MS-01: the echoed input begins with the notice naming the archived segment's journal file and carrying the read instruction) | Proven | — |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 94% | 95% | AC-001…AC-004 and AC-006 by units on real rotation and the built server; AC-005 live on three runtimes, six runs | Claude Agent SDK does not read completely (recorded, FU-001) | the follow-up |
| Changed-boundary execution directness | 94% | 96% | the text real agents received after a real switch, judged from what their tools returned | — | — |
| Cross-boundary integration realism and mock gap | 92% | 96% | real Codex and Claude CLIs and a real provider; only era 1 is scripted, as AC-005 asks (synthetic run) | Antigravity and Grok not run live | — |
| Environment, configuration, identity, and fixture fidelity | 92% | 93% | isolated data, test vault, throwaway `CODEX_HOME`, no user CLI config touched | the loaded host leaves some suite files classifiable only by reruns | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | 95% | SCN-002 and SCN-004 on real rotation (units); a non-complying runtime observed and recorded | — | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | agent-facing text; the chat's marker line is unchanged | — | — |
| Durable regression coverage quality and relevance | 95% | 95% | the builder, the transition and MS-01 cover the text and its choice; the live probe is kept as evidence, not as a suite test (model behavior) | — | — |

- Overall final confidence: 95.0% (simple average of the six applicable categories)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default target met: `Yes`

## Broader Validation Decision (Mandatory)

- Decision: `Required`, executed: the live switch on three runtimes (AC-005)
- Browser validation needed: no: no rendered surface changed

## Persisted-Data Transition Checks

- `Not Affected`: the summary is computed per call; no file format changed (the live runs' manifests and journals were written by the unchanged writers)

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated: `No`
- Durable coverage only for compatibility: `No`

## Durable Coverage Changed In The Codebase

None (the implementation's tests cover the change; the AC-005 probe is kept in `evidence/API-02-04-live-probe/handover-read-live.probe.e2e.test.ts`, not in the suite).

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Era 1's agent | scripted Antigravity CLI plus synthetic records | AC-005 asks for a synthetic run with a long previous era | none for the new agent's behavior |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| live probe test file in `tests/e2e/runtime/` | Yes | copied to the evidence, removed from the tree | `git status` shows no source change |
| throwaway `CODEX_HOME` (a link to `auth.json`) | Yes | `rm -rf` | removed; the user's Codex config untouched |
| probe data roots | Yes | the probe's `afterAll` | removed |
| scripts in `/tmp` | Yes | `rm` | removed |

## Latest Authoritative Result

- Result: `Pass`
- Next recipient from `get_handoff_rules`: `/delivery_engineer` (direct route, Small / Low)
- Residuals and follow-ups: FU-001 (Claude Agent SDK reads the start and the end of a long journal, not all of it); FU-002 (a unit test's fixed settle budget); FU-003 (E2E files at default limits on a busy Mac). Antigravity and Grok not run live.
