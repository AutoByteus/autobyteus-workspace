# API/E2E Execution Coverage Report

The run record and the result. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history.

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-002`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: 2. IR-002 after SR-002 (code review CRR-001 C-01; requirements DEC-004). No code change since `1d49973440`. AC-003 is narrowed to the folder step on reload, API-06 becomes FU-003 evidence, and AC-005 is clarified (import, then launch with the real `codex`, no reload or repair).
- Prior round reviewed: round 1 (`API-REV-001`, Fail on API-06 / AC-003 as first written)
- Deviations from the investigation's plan, and why:
  - The Applications module had to be enabled first (Settings → Server Settings → Applications), because `ENABLE_APPLICATIONS` is off by default in a fresh data root. This is a user step, done through the UI.
  - The planned immediate termination of the draft run was not needed: the app-owned run finished both turns in about 35 s. `terminateAgentTeamRun` then answered "Agent team run not found."
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/imported-app-codex-runtime-folder/tickets/in-progress/imported-app-codex-runtime-folder/evidence/`

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `8ab3a2129a` (code `1d49973440`) | macOS 26.5.2, Node v22.23.1 | Server E2E from source (vitest), real studio server; scripted runtime CLIs | `env -i PATH HOME=<resolved temp> TMPDIR`; test-owned data dirs |
| ENV-1-base | ENV-1 with the two changed sources from `1138e8fbef` (round-1 probe only) | same | same | Restored; `git diff` empty |
| ENV-2 | `2ddfc07e51` (code `1d49973440`) | macOS 26.5.2 | Isolated desktop instance of this worktree: `CODEX_HOME=<throwaway> pnpm --silent isolated-app start --build` → `iso-60554-6d7d` (`electron-dist/mac-arm64/AutoByteus.app`, own data root and ports); real `codex-cli 0.164.0`, model `gpt-5.6-luna` | Throwaway `CODEX_HOME`: an empty `config.toml` plus a symlink to `~/.codex/auth.json` (the user's sign-in; their Codex config is not used, and `~/.codex` is not written). The user's AutoByteus (port 29695, `~/.autobyteus`) is not touched. UI driven over CDP on the instance's control port (`cdp.mjs`, attach only) |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-001, AC-002, REQ-001…003 | real server: import → readiness → launch | Reused: IMP-01, IMP-00 | — | Pass | — | — | Code unchanged since `1d49973440` |
| API-02 | AC-003, AC-004 | transition order (import and reload), lifecycle, assembly | Reused: IMP-02 | — | Pass | — | — | AC-003 as narrowed by SR-002: "prepares the reloaded application's runtime folder before readiness" (after the commits, before readiness), plus the import order test |
| API-03 | AC-004 | startup-loaded app runs | Reused: IMP-03 | — | Pass | — | — | — |
| API-04 | AC-004 | server typecheck | Reused: IMP-04 | — | Pass | — | — | — |
| API-05 | AC-004 (guard) | architecture guard failure cause | Reused: IMP-05; `git log -S` / `merge-base` check (round 1) | ENV-1 | Pass (failure out of scope, cause confirmed) | `IMP-05-architecture-boundaries.log` | `3e3a7b08cc fix: Memory page shows a task-agent group's definition name`, in base | FU-001 |
| API-06 | — (FU-003 evidence, not a case of this ticket since SR-002) | reload/repair of an ACTIVE Brief Studio | Round 1 probes and reproduction | ENV-1, ENV-1-base | Not a case of this ticket (round 1: Fail, pre-existing) | `API-06-repro-reload-reentry.e2e.test.ts`, `API-06-repro-reload-reentry-on-fix.log`, `API-06-probe-base-startup-reload.log`, `API-06-probe-fix-startup-reload.log`, `API-06-cause-stack-diagnostic.log`, other `API-06-*` | `after package reload 503 … currently reentering` on base and on the fix | Reentry defect C-01, follow-up FU-003 (requirements DEC-004) |
| API-07 | AC-005, REQ-001 | real desktop app of this worktree, real `codex`, import UI, the application's own launch | (1) Start the isolated instance with a throwaway `CODEX_HOME`; baseline: no packages and no `server-data/applications`. (2) Settings → Application Packages → path `applications/brief-studio/dist/importable-package` → Import Package. (3) No restart: `listApplications`, the runtime folder, launch settings. (4) Settings → Server Settings → Applications → Enabled. (5) Applications → Brief Studio → Open app → Enter application; backend status. (6) In the app: Create brief → Generate draft; watch the Codex sessions; read the app's result. (7) Stop the instance | ENV-2 | Pass | `API-07-journey.log`, `API-07-codex-sessions-summary.txt`, `API-07-instance-start.json.txt`, `API-07-instance-stop.json.txt`, `API-07-instance-log-excerpt.log`, `API-07-01-import-done.png`, `API-07-02-applications-list.png`, `API-07-03-app-opened.png`, `API-07-04-app-entered.png`, `API-07-05-draft-generated.png` | UI "Application package imported." / "Local Path · Applications: 1"; launch settings `HTTP 200`, readiness `{"status": "RUNNABLE", "issues": []}`, runtime `codex_app_server`, `gpt-5.6-luna`; the runtime folder present after the import; backend `state ready, ready true, lastFailure null`; sessions: `agent='Brief Studio Researcher' cli_version=0.164.0 originator=autobyteus-server-ts` and `agent='Brief Studio Writer' …`, both `cwd=<dataRoot>/server-data/applications/<storageKey>/runtime`, `task_complete=True`; app: "Status in_review", "DRAFT OUTPUTS 2 / 1 final", `runtime/brief-studio/research.md` and `final-brief.md`; stop: `"dataRootRemoved": true`, both ports released, `list` empty | Import, then launch, with no restart, no reload and no repair. The real `codex` read the sign-in at import (the throwaway `CODEX_HOME` gained its state files at the import time, 18:06Z) and later ran both agents with the runtime folder as their working directory. Real model use: two short turns, about 318k tokens in total (279k of them cached input; 2.9k output), on the user's Codex sign-in. The server log's one error line is my own GraphQL validation mistake (no ENOENT, no quarantine) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 | Yes | API-01 (IC-01; fails on base, IMP-00) | Proven | — |
| AC-002 | Yes | API-01 (IC-02) | Proven (signed out after import; signed out at import gives the generic quarantine detail, FU-002) | — |
| AC-003 (SR-002) | Yes | API-02 | Proven | — |
| AC-004 | Yes | API-02, API-03, API-04, API-05 | Proven (guard failure out of scope, FU-001) | — |
| AC-005 | No (judgement; user check optional) | API-07 | Proven on a worktree desktop build with the real `codex` | Optional user check: delivery may offer it |

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 100% | AC-001…004 (API-01…05); AC-005 (API-07) | — | — |
| Changed-boundary execution directness | 90% | 100% | Import through the real transition on the real server (API-01) and the packaged server (API-07); the folder exists before readiness and runs | — | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Scripted CLI in API-01; real `codex` 0.164.0 in API-07 (readiness and both agents' turns) | — | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Isolated packaged build, own data root, the user's Codex sign-in through a throwaway `CODEX_HOME` | — | — |
| Failure, edge-case, lifecycle, and recovery evidence | 85% | 90% | Signed-out readiness (IC-02); no restart between import and launch (API-01, API-07) | Signed-out-at-import recovery depends on FU-002/FU-003 (out of scope) | Follow-ups |
| User-surface, browser, and desktop-shell confidence | N/A | 95% | API-07: import UI, Applications page, app entry, the app's own launch, screenshots | — | — |
| Durable regression coverage quality and relevance | 90% | 90% | IC-01/IC-02 E2E and the order unit tests | No durable reload E2E (it would be red until FU-003) | FU-003 can promote `API-06-repro-reload-reentry.e2e.test.ts` |

- Overall post-repository confidence: 86%
- Overall final confidence: 95% (simple average of the seven final scores: 100, 100, 95, 95, 90, 95, 90 → 95.0%)
- Every critical acceptance criterion directly proven: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: FU-003 (reload/repair of an ACTIVE application quarantines it) and FU-002 (generic quarantine detail on a signed-out import), both pre-existing and out of scope by DEC-004

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Project Desktop Validation` (isolated instance of a worktree build)
- Gap closed: the real packaged server, real `codex`, the real import UI and the application's own launch (AC-005)

## Desktop Application Validation

- Approach executed: isolated instance (`isolated-app start --build`), driven over CDP; GraphQL/REST read on the instance's backend
- Cases: API-07 (shell-hosted renderer, embedded server, real CLI spawn and working directory)
- Effect on the already-running desktop application: `None`
- Not directly proven: none in scope

## Compatibility / Legacy Scope Check

- Backward compatibility introduced or tolerated in scope: `No`; compatibility-only behavior observed: `No`; durable coverage for compatibility-only behavior: `No`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed by API/E2E: `No`. The round-1 drafts stay in evidence (`API-06-draft-signed-out-recovery.e2e.test.ts`, `API-06-repro-reload-reentry.e2e.test.ts`) for FU-002/FU-003.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| Runtime CLIs in API-01…03 | scripted `agent-runtimes-fake-cli.mjs` | Deterministic sign-in states | Closed by API-07 (real `codex`) |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Isolated instance `iso-60554-6d7d` and its data root | Yes | `pnpm --silent isolated-app stop iso-60554-6d7d` | `wasRunning: true`, `forced: false`, `dataRootRemoved: true`, ports released; `list` → `[]` |
| Throwaway `CODEX_HOME` (with the Codex sessions) | Yes | `rm -rf` | Removed; a sanitized summary is kept (`API-07-codex-sessions-summary.txt`) |
| Copies of Codex's sqlite files made for inspection | Yes | Deleted | — |
| `autobyteus-web/electron-dist` | Yes (build output) | Left (untracked build output) | — |
| Round-1 temporary diagnostics, probes and base swap | Yes | Removed or restored in round 1 | `git status` clean for source and tests |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check: none. AC-005's optional user check may be offered by delivery.
- Next recipient from `get_handoff_rules`: Delivery
- Notes: follow-ups FU-001 (architecture guard red on base), FU-002 (generic quarantine detail) and FU-003 (reentry quarantines an ACTIVE application) are recorded in `follow-ups.md`.
