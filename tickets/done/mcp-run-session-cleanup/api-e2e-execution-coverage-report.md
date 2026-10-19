# API/E2E Execution Coverage Report — mcp-run-session-cleanup

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, implementation handoff IR-001 (direct route)
- Deviations from the plan:
  - The Grok matrix cell could not complete: Grok's plan returned 429 `subscription:free-usage-exhausted` mid-turn. It is reported as not run.
  - Codex was covered through its MCP client only (model usage limited, as planned).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup/tickets/in-progress/mcp-run-session-cleanup/evidence/` (the handoff message gives the commit)

## Routing Classification

- Task size: `Small`; Architectural risk: `Low`; Input route: `Direct Low-Risk`; Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Tested Builds And Environments

| Env ID | Commit Tested | Platform | Build | Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `7fa2819630` (fix `a8b849af79`) | macOS 26 arm64, node v22.23.1 | in-process studio server (server and `autobyteus-ts` from source) | clean env; scripted AGY CLI; real Node MCP test server with a pid file |
| ENV-2 | same | same | in-process; live runtimes | LM Studio qwen (unloaded after); Claude haiku and Grok on host sign-ins (real HOME); Codex MCP client with a throwaway `CODEX_HOME` |
| ENV-3 | same | same | `pnpm -C autobyteus-ts build`, `pnpm -C autobyteus-server-ts build`; `pnpm test:e2e` | clean env |
| ENV-4 | same | same | packaged worktree build, isolated instance `iso-53507-6383` | own ports and data root. Copied user-kind `uv` server: VideoAudioServer from `autobyteus_mcps` `a947f1a^`, the user's own server type; fresh `.venv`; read-only `get_media_duration` |

## Cases

| Case ID | Criteria | Boundary | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-007, AC-005 (core), preserved | unit, integration, typecheck, 179 auth e2e | Reused IMP-01, IMP-02, IMP-04, IMP-05, IMP-06, IMP-09 | — | Pass | (handoff) | `Tests  2049 passed`; `Tests  6086 passed`; `419 passed` | no source change since `a8b849af79`. The red-on-base proof is IMP-00 |
| API-01 | AC-002, AC-004, AC-005, AC-006, QR-001 | cleanup e2e: terminate, delete, wake, two runs plus gateway, idle shutdown of a delegated copy | `RUN_AGY_FAILURE_E2E=1 … mcp-run-session-cleanup.e2e.test.ts` | ENV-1 | Pass | `API-01-cleanup-e2e.log` | `Tests  5 passed (5)`; terminate 816 ms, delete 780, wake 1420, pair 1856, idle 60983 ms | no fixture process left |
| API-02 | AC-003 | matrix: each cell terminates its run and requires the stdio pid gone within 10 s | (a) AGY scripted + Codex MCP client; (b) native, Claude, Grok | ENV-2 | Pass for agy, codex-mcp-client, native, claude. Grok: not run (plan usage exhausted) | `API-02-matrix-termination.log` | each summary `"stdioProcessGoneAfterTermination":true` | Native exercises both its shutdown step and the release close (idempotent). Grok had completed its stdio call before the 429. |
| API-03 | regression, preserved | full server e2e | `pnpm test:e2e` after the builds | ENV-3 | Pass | `API-03-server-e2e-full.log` | `Test Files  89 passed \| 90 skipped (179)`; `Tests  370 passed \| 405 skipped (775)`; `exit 0` | gated suites skip; the gated cleanup and matrix suites ran in API-01/02 |
| API-04 | AC-008, REQ-005, QR-001; SCN-A1…A3 | packaged app; runs on two runtimes call a copied `uv` server; process tree counts | `isolated-app start --build`; `ac008-harness.mjs`; `isolated-app stop` | ENV-4 | Pass | `API-04-isolated-app-process-count.txt` | `baseline … total=6 mcp=0`; `both runs alive … total=11 mcp=4`; `after terminating both runs: total=6 mcp=0`; `"mcpGoneMs": 1078`; wake `"newProcess":true`, then `total=6 mcp=0`; stop `"forced": false` | Both `uv` and its `python` child exit. Before this fix, the 181 parity round saw four pairs stay alive until app stop |
| API-05 | REQ-005 safety, dummy values | repo state, user folder, scan | ignored-set diff; `git status` of `autobyteus_mcps`; grep | local | Pass | `API-05-safety-and-scan.txt` | user repo `identical`; every log `test-dummy=0` | two stray files from other tests and the build were removed (O-2, O-3) |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 closer asked once per run; not on `already_released` | Yes | API-R01 (IMP-05) | Proven |
| AC-002 pid gone after termination (red on base) | Yes | API-01; IMP-00 red | Proven |
| AC-003 per available runtime | Yes | API-02: native, Claude, Codex (MCP client), AGY | Proven for the available runtimes. Grok: not run, because its plan usage was exhausted (429) during this round. Grok reaches MCP tools through the same `autobyteus_agent_tools` path as Claude, Codex and AGY, which are proven. |
| AC-004 delete and idle shutdown of a delegated copy | Yes | API-01 | Proven |
| AC-005 wake gets a new working process | Yes | API-01; API-04 (packaged); core unit | Proven |
| AC-006 another run and the gateway unaffected | Yes | API-01 (pair case) | Proven |
| AC-007 a throwing closer doesn't fail release; warning names run and server | Yes | API-R01 (IMP-05; IMP-01 per-server warning) | Proven |
| AC-008 isolated app: child count back to the baseline after stopping two runs on two runtimes | Yes | API-04 | Proven |
| QR-001 gone within 10 s | Yes | API-01 (under 1 s), API-02 (10 s check), API-04 (1.08 s) | Proven |

## Validation Confidence Scorecard

| Category | Final | Support | Residual |
| --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 95% | all ACs proven for the available runtimes | Grok cell not completed |
| Changed-boundary execution directness | 97% | real child processes counted in-process and in the packaged app | — |
| Cross-boundary integration realism and mock gap | 96% | real servers, four runtimes, packaged module graph | — |
| Environment, configuration, identity, and fixture fidelity | 95% | packaged build; the user's server type from a copy | — |
| Failure, edge-case, lifecycle, and recovery evidence | 95% | wake during and after close; delete; idle shutdown; two runs; red on base | team/org root removal not run separately (same `release()` path) |
| User-surface / desktop-shell | 93% | packaged desktop app, driven through its endpoints | renderer unchanged |
| Durable regression coverage quality and relevance | 95% | new cleanup e2e (red on base); matrix termination check per runtime | — |

- Overall final confidence: 95.1%. No category below 90%. Every critical AC proven, Grok excepted as not run (environment).
- Broader validation decision: `Required`, executed (live runtimes, full e2e, project desktop validation).

## Observations (not failures)

- **O-1:** The Grok plan's included usage is exhausted (429 `subscription:free-usage-exhausted`). Codex's model usage is limited until 25 Oct. Neither runtime could take a full live turn today; both are covered through the shared Agent Tools path (Codex directly via its MCP client).
- **O-2 (pre-existing, outside scope):** a server e2e test writes `autobyteus-server-ts/workspaces.json` (file-explorer temp workspaces) into the package folder during `pnpm test:e2e`.
- **O-3 (pre-existing, outside scope):** the Electron build's server packaging leaves `autobyteus-server-ts/autobyteus-web/resources/server/node_modules`.
- **O-4 (from the handoff):** an activation that fails before an AgentRun exists runs its own `deactivateMcp()` instead of `release()`. No run is published, so no Agent Tools call can open instances under that id. Native prewarm instances close in the native shutdown step (DEC-005).

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| Isolated instance `iso-53507-6383` | `isolated-app stop` | not forced; data root removed; ports released; no process left |
| Scratch `<L>` (server copy and `.venv`, harness, throwaway `CODEX_HOME`, logs) | removed | done |
| LM Studio model | `lms unload` | unloaded |
| Stray `workspaces.json` and `autobyteus-server-ts/autobyteus-web/` | removed | done |
| Packaging outputs (`autobyteus-web/electron-dist`, `build/icons`, `resources`, `dist`) | left as untracked build outputs | — |
| Sessions in the Claude and Grok CLI histories | left (real HOME) | short sessions |

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven / user-only: none. AC-003's Grok cell was not run (plan usage exhausted); the reason is recorded.
- Next recipient: Delivery Engineer
- Durable coverage changed by API/E2E: none (the ticket's own tests validated). The AC-008 harness is temporary; its source is in the evidence.
