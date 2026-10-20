# Investigation Notes

## Investigation Meta

- Package identifier: `mcp-test-launcher-and-test-residue` (Project Task `autobyteus-199`, part of MCP parent Task `autobyteus-195`)
- Request / ticket: "MCP test launcher: don't depend on the code under test for the uv environment; and tidy files and folders that other tests leave behind" (follow-ups O-1, O-2, O-4 of `autobyteus-189`; O-2 of `autobyteus-193`)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue`
- Repository mode: `Git`
- Task worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue` / `codex/mcp-test-launcher-and-test-residue`
- Resolved base remote / branch / revision: `origin` / `personal` / `dc530fdcb0` (`docs(delivery): record stable v1.5.7 release (autobyteus-213, DR-001)`), fetched 2026-10-20
- Finalization target remote / branch: `origin` / `personal`
- Bootstrap result: worktree created from refreshed `origin/personal`; `pnpm install --frozen-lockfile` and `pnpm -C autobyteus-server-ts prebuild` done in the worktree
- Bootstrap blocker: None
- Current solution revision ID: `SR-002`
- Authorities read (requirements reading gate; file and date): `references/requirements-engineering.md`, `references/ticket-scope.md`, `templates/requirements-doc-template.md`, `templates/investigation-notes-template.md` (2026-10-20); repository `AGENTS.md`, `TESTING.md`; `autobyteus-server-ts/AGENTS.md`
- Investigation status: Complete for requirements and architecture

## Initial Request And Clarifications

- Original request (Project Task Manager, 2026-10-20, for `autobyteus-199`):
  - O-1 (low): the launcher passes `UV_PROJECT_ENVIRONMENT` through the product's stdio env delivery; if that regresses, `uv` writes `.venv` into the fixture folder. Launch via `/usr/bin/env UV_PROJECT_ENVIRONMENT=<dir> …`.
  - O-2 (cosmetic): the preparation-failure skip reason is cut where `uv` wraps its line.
  - O-4 (pre-existing): other `autobyteus-ts` unit tests leave ignored `mcp-config-*` and `tmp-edit-file-*` folders in the package root; use a temp directory outside the package, removed in teardown.
  - O-2 of 193: a server e2e test writes `autobyteus-server-ts/workspaces.json` during `pnpm test:e2e`; use a temporary data directory, removed in teardown.
  - Done when: env no longer depends on product env delivery; skip reason complete; the tests leave no files or folders behind (clean `git status --ignored` after a unit and an e2e run); merged; no release.
- Clarifications received: 2026-10-20, Project Task Manager added FU-003 of `autobyteus-211` to the Task: in `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts`, give each rejection payload of the second case a valid `source` so each `toThrow()` fails only for its own field, shown with a mutation; rebase on current `personal` first (the file was changed by `autobyteus-211`, merge `e9a76b84ab`).
- User-supplied facts and constraints: small, test-only, low priority; no release.
- Initial ambiguity: which runs "a unit and an e2e run" means, and what counts as "left behind" (resolved in DEC-001, DEC-005 of the requirements doc).

## Product And Domain Understanding

- Product area: test code of `autobyteus-ts` (core library) and `autobyteus-server-ts` (server e2e). No product source.
- Affected actors or systems: developers and agents running the test suites; the validation roles.
- Existing operational purpose: test suites prove product behavior; they should not write into the repository tree.
- Relevant terminology: "residue" = a file or folder a test run creates inside the worktree and does not remove.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-20 | Doc | `autobyteus-worktrees/jira-mcp-server-presets/tickets/in-progress/jira-mcp-server-presets/autobyteus-189-delivery-receipt-verification.md`, `autobyteus-193-delivery-receipt-verification.md` | Task evidence | O-1/O-2/O-4 and 193's O-2 as quoted in the Task | — |
| 2026-10-20 | Code | `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` | O-1/O-2 | `serverCommand('python')` returns `command: uv`, args `run --frozen --project …`, and `env: uvEnv` (`UV_PROJECT_ENVIRONMENT`, `UV_CACHE_DIR`, `PYTHONDONTWRITEBYTECODE`). `stdioServerConfig` puts `uvEnv` into `StdioMcpServerConfig.env` (L111-117), so these reach `uv` only through the product's env delivery. `startHttpTestServer` spawns directly with `{...process.env, ...env}` (L143), not through the product. `uvError` (L34-38) joins the `×`/`error:` line and exactly one following line | — |
| 2026-10-20 | Code | `autobyteus-ts/src/tools/mcp/server/stdio-managed-mcp-server.ts` L14-19; MCP SDK 1.30.0 `client/stdio.js` L73-76 | Real dependency path of env delivery | Product passes `config.env` to `StdioClientTransport`; the SDK merges its safe default env (PATH, HOME, …) with it | — |
| 2026-10-20 | Code | `autobyteus-ts/tests/integration/tools/mcp/stdio-managed-mcp-server.test.ts` L64-68 | What still tests env delivery | "delivers the configured env and cwd to the server" passes `MCP_TEST_DUMMY_VALUE` via config env and checks the server sees it; the pid-file variable `MCP_TEST_SERVER_PID_FILE` also goes through config env | Env delivery stays covered after O-1 |
| 2026-10-20 | Code | `autobyteus-ts/tests/integration/tools/mcp/tool-registrar.test.ts` L20-26 | Other launcher caller | Copies `config.command`, `config.args`, `config.env` into registrar `stdio_params`, i.e. also product env delivery | Covered by the same launcher change |
| 2026-10-20 | Code | `autobyteus-ts/tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts` | Opt-in check with the same pattern | Passes `UV_PROJECT_ENVIRONMENT` via config env too, but deliberately starts the server "the way users start theirs" from a temp copy; a regression would write `.venv` into the temp copy (removed in `afterAll`), and the source-folder fingerprint check guards the user's folder | Left as is (DEC-004) |
| 2026-10-20 | Code | `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts` L132, L153, L166 | O-4 | `fs.mkdtempSync(path.join(process.cwd(), 'mcp-config-'))`, never removed | — |
| 2026-10-20 | Code | `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` (16 cases), `tests/integration/tools/file/edit-file.test.ts` L21 and later | O-4 | `fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'))`, never removed | — |
| 2026-10-20 | Code | `autobyteus-ts/tests/integration/tools/file/read-file.test.ts` (9 cases), `write-file.test.ts` (7 cases) | Found by the residue probe | Same pattern with `tmp-read-file-` / `tmp-write-file-`, never removed | In scope (DEC-001) |
| 2026-10-20 | Code | `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` L564-596 ("Agent facade delegates start/stop to runtime"); `src/memory/path-resolver.ts` L9-22; `src/agent/factory/agent-factory.ts` L120-129 | Found by the residue probe | `factory.createAgent(config)` without `memoryDir`; the factory falls back to `resolveMemoryBaseDir()` = `AUTOBYTEUS_MEMORY_DIR` or `<cwd>/memory`, so the agent's raw traces land in `autobyteus-ts/memory/agents/runtimetestagent_tester_<n>/`. Other cases in the same file already use `os.tmpdir()` dirs removed in `afterEach` (L504-521) or set `config.memoryDir` (L746) | In scope (DEC-001) |
| 2026-10-20 | Code | `autobyteus-server-ts/src/config/app-config.ts` L62, L287-288, L453-475; `src/workspaces/workspace-registry-store.ts` L26 | 193 O-2 | App data dir defaults to the server package root when not configured; the workspace registry writes `<dataDir>/workspaces.json`. `setCustomAppDataDir(dir)` points it elsewhere (and sets `AUTOBYTEUS_MEMORY_DIR`); it logs "Config file not found…" when the dir has no `.env` | — |
| 2026-10-20 | Code | `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts` L25-45 | Existing good pattern | `beforeAll`: `mkdtempSync(os.tmpdir()/workspace-rest-appdata-)`, writes a minimal `.env`, `appConfigProvider.config.setCustomAppDataDir(dataRoot)`; `afterAll` removes it | Reuse this pattern |
| 2026-10-20 | Data | leaked `autobyteus-server-ts/workspaces.json` (13 entries) after the e2e run | Which tests wrote it | Roots: `autobyteus-file-explorer-ws-e2e-*` (3), `autobyteus-file-explorer-*` (2), `autobyteus-file-ops-*` (2), `autobyteus-path-boundary-e2e-*` (2), `autobyteus-workspace-*/test_ws_root` (5) → `file-explorer-websocket-lifecycle`, `file-explorer-graphql`, `file-operations-graphql`, `file-explorer-path-boundary`, `workspaces-graphql` e2e files | All five in scope |
| 2026-10-20 | Code | `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` L36-47, L117-160 | Writer #5 | Some cases mock `appConfigProvider.config` with a temp data dir; others use the real config (package root). Its `afterEach` removes registered workspaces under the test root, but 5 entries still leaked | — |
| 2026-10-20 | Code | `autobyteus-server-ts/tests/setup/prisma-test-config.ts`, `prisma-global-setup.ts`; `.gitignore` (`/tests/.tmp/` under "Test artifacts"); `tests/e2e/runtime/token-meter-tps-*.e2e.test.ts` header | Is `tests/.tmp/` residue? | `tests/.tmp/autobyteus-server-test.db` is the server suites' designated test database, reset by `prisma migrate reset` at every run start; gated TPS probes write evidence under `tests/.tmp/` by design | DEC-005 |
| 2026-10-20 | Code | `autobyteus-ts/.gitignore` (`tmp-*/`, `mcp-config-*/`, `/memory/`), `autobyteus-server-ts/.gitignore` (`/workspaces.json`, `/db/`, `/logs/`, `memory`) | Why residue is invisible in plain `git status` | Ignore rules hide the residue; they also cover developer runs (a server started from the package root with the default data dir; examples writing `memory/`) | Unchanged (DEC-006) |
| 2026-10-20 | Doc | `origin/personal:tickets/done/e2e-task-execution-source-fixtures/follow-ups.md` FU-003 | Task addition | Finding and evidence as quoted in the Task addition | — |
| 2026-10-20 | Code | `origin/personal` @ `aac5da3112`: `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` L71-106 | FU-003 | Second case: `TASK_DELEGATION_EVENT` (retired type), then two `TASK_EXECUTION_STARTED` payloads, one with `settled_at: null` and one without `delegator_agent_run_id`; neither has `source`. The first case (L14-69) already carries valid `source` objects (added by `autobyteus-211`) | Use the first case's agent `source` |
| 2026-10-20 | Command | `git diff --name-only dc530fdcb0 origin/personal` (non-ticket) | Rebase impact | Only `memory-collaboration-graphql.e2e.test.ts` and `team-task-event-current-contract.e2e.test.ts` changed; neither is among this branch's 11 files, so the rebase has no conflicts | — |
| 2026-10-20 | Doc | `TESTING.md` | Commands and clean env | Core library: `pnpm -C autobyteus-ts test`; server unit `pnpm -C autobyteus-server-ts test:unit`; server E2E `pnpm test:e2e` (needs `pnpm -C autobyteus-server-ts build` for suites that start `dist/app.js`); clean env `env -i PATH HOME=<temp> TMPDIR` | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | A developer or agent runs the core MCP integration tests (TESTING.md layer "Core library MCP integration") | Launcher prepares the Python fixture with `uv sync` (env set directly) → test builds a `StdioMcpServerConfig` with `command: uv` and the uv location variables in `env` → product `StdioManagedMcpServer` → SDK spawns `uv run` with the merged env | Venv and cache live in `os.tmpdir()` only while product env delivery works; if it regresses, `uv` creates `tests/fixtures/mcp-test-server/.venv` (probe P-1) | Launcher L56-119; probe P-1 | High |
| BEH-002 | Operational | `uv sync --frozen` fails during preparation (e.g. offline without cache) | `preparePython` returns `available: false` with `uv could not prepare the fixture: <uvError(stderr)>`; the Python cases skip with that reason in the describe title and console | Reason is cut: `× Failed to download \`cryptography==50.0.2\` ╰─▶ Network connectivity is disabled, but the` (probe P-2) | Launcher L34-38, L77-80; probe P-2 | High |
| BEH-003 | Operational | `pnpm -C autobyteus-ts test` (core library tests) | config-service unit, edit-file unit+integration, read-file and write-file integration create `mkdtemp(<cwd>/…)` folders and never remove them; the runtime "Agent facade" case writes `<cwd>/memory/agents/<id>/raw_traces_active.jsonl` | 36 new entries in `autobyteus-ts/` per run (probe P-3) | Probe P-3; files above | High |
| BEH-004 | Operational | `pnpm test:e2e` (server e2e) | Five e2e files register workspaces with the default app data dir (server package root) | `autobyteus-server-ts/workspaces.json` written (13 entries) and left behind (probe P-4) | Probe P-4 | High |
| BEH-005 | Operational | `pnpm -C autobyteus-server-ts test:unit` | — | No new entries (probe P-5) | Probe P-5 | High |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `mcp-test-server-launcher.ts` `serverCommand` | One place that decides command, args, env per implementation; used by stdio config and the HTTP launcher | The launch-level variables can be set once here | Put the variables in front of `uv` via `/usr/bin/env NAME=value …`; keep `env` for test-intended values only |
| `/usr/bin/env` | POSIX utility; `exec`s the named program with the added variables | Same pid as `uv` (no extra process layer), so pid/kill tests are unaffected | Python impl is only used when `uv` is found on PATH; on Windows `findOnPath('uv')` finds no `uv` (no `.exe` lookup), so Python already skips there |
| uv error output | `miette`-style block: `× <message>` then indented `╰─▶ <cause>` lines wrapped at ~80 columns, then an optional `help:` block | Reason must contain the whole error block | Join the `×`/`error:` line with following lines until a `help:` line or end |
| `AppConfig.setCustomAppDataDir` | Moves the data dir and memory dir; must run before `initialize()` | e2e tests can own a temp data dir | Use the `workspace-content-rest` pattern |
| vitest server config | `pool: forks`, `fileParallelism: false`; isolation per file | A per-file data dir does not leak to other files | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files: test files and one test launcher; no fixtures change.
- Existing readers/contracts: vitest; MCP SDK stdio transport; uv CLI.
- Evidence paths: as in the Source Log.

### Structural Surfaces

- Runtime modules, APIs, persistence, security, deployment: none touched (test-only).
- Existing surfaces that support the behavior: `os.tmpdir()`, `setCustomAppDataDir`, `AgentConfig.memoryDir`, `/usr/bin/env`.

### Potential Structural Impacts To Investigate

- API or external-contract change: Absent
- Persistence schema or invariant change: Absent
- Security or privacy boundary change: Absent
- Concurrency or lifecycle change: Absent
- Deployment, migration, ownership-boundary change: Absent
- Confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- |
| P-1: temp copy of `tests/fixtures/mcp-test-server`; A: `env -i PATH HOME UV_CACHE_DIR=<warm cache> UV_OFFLINE=1 uv run --frozen --project <copy> python -c 'print(sys.prefix)'`; B: same child env without the variable but launched as `/usr/bin/env UV_PROJECT_ENVIRONMENT=<tmp>/venv … uv run …` | Env delivery lost (A) vs prefix (B) | A: `sys.prefix = <copy>/.venv`, `.venv` created in the project folder. B: `sys.prefix = <tmp>/venv`, project folder unchanged | O-1 confirmed; the prefix makes the location independent of env delivery | Commands in this row; run 2026-10-20 |
| P-2: `UV_OFFLINE=1 UV_CACHE_DIR=<empty> UV_PROJECT_ENVIRONMENT=<tmp> uv sync --frozen --project <fixture>` (uv 0.10.2) | Preparation failure | stderr: `× Failed to download \`cryptography==50.0.2\`` / `╰─▶ Network connectivity is disabled, but the` / `requested data wasn't found in the cache for:` / `` `https://files.pythonhosted.org/…whl` `` / `help: …`. `uvError` keeps only the first two lines | O-2 confirmed; the full block is 4 lines before `help:` | Command in this row |
| P-3: baseline `git status --ignored --porcelain --untracked-files=all` (minus `node_modules`), then `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts test`, then diff | Core library suite residue | 387 files passed / 26 skipped (2356 tests). 36 new entries: `mcp-config-*` ×3, `tmp-edit-file-*` ×17, `tmp-read-file-*` ×8, `tmp-write-file-*` ×6, `memory/agents/runtimetestagent_tester_9605/raw_traces_active.jsonl`. The MCP integration tests themselves left nothing | O-4 confirmed and wider than stated | `/tmp/abyt199/baseline.txt`, `after-ts.txt`, `ts-test-base.log` (scratch) |
| P-4: same diff around `env -i … pnpm test:e2e` (no server build at start) | Server e2e residue | New: `autobyteus-server-ts/workspaces.json` (13 workspace roots, see Source Log); `autobyteus-server-ts/dist/**` (build output produced during the run); `tests/.tmp/` DB files (designated harness DB). 28 failures, mostly `TEST_SERVER_BUILD_REQUIRED` / missing `dist/app.js` because the server was not built first (TESTING.md requires it) | 193 O-2 confirmed: five writers | `/tmp/abyt199/after-e2e.txt`, `e2e-base.log` (scratch) |
| P-6: node script against the worktree's built `@autobyteus/team-stream-contracts` (`parseTeamStreamServerMessage`), the agent `source` of the first case | FU-003 | `settled_at`, no `source`: rejected. `settled_at` + `source`: rejected (zod `unrecognized_keys: settled_at`). `source` only (control): **accepted**. No delegator, no `source`: rejected. No delegator + `source`: rejected (`delegator_agent_run_id` expected string) | The product rejects each field correctly; the test needs `source` for its assertions to depend on the named field | `/tmp/abyt199/probe-fu003.mjs` (scratch) |
| P-5: same diff around `env -i … pnpm -C autobyteus-server-ts test:unit` | Server unit residue | No new entries. 751 files passed; 1 failure: `tests/unit/projects/project-task-index-status.test.ts` "indexes a Project soon after a Task create or edit…" (`expected "sync" to not be called at all … called 1 times`) | Server unit is clean; the failure is unrelated to this ticket (FU-001) | `/tmp/abyt199/server-unit-base.log` (scratch) |

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| User via Project Task Manager (Task `autobyteus-199`) | Test-only hygiene; clean `git status --ignored` after a unit and an e2e run; no release | Direct | REQ-001…REQ-005 | None |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| uv | 0.10.2 (Homebrew) | `UV_PROJECT_ENVIRONMENT` selects the venv; without it `uv run --project` creates `<project>/.venv`; error output wraps cause lines | P-1, P-2 | Wrapping width may differ by version; the fix must not depend on a fixed line count |
| `/usr/bin/env` | POSIX (macOS, Linux) | `env NAME=value cmd args` execs `cmd` with the added variables | P-1 B | Not present on Windows, where the Python impl already skips |
| MCP SDK stdio transport | `@modelcontextprotocol/sdk` 1.30.0 | Merges default safe env with `env` | `client/stdio.js` L73-76 | — |

## Persisted Data And State Facts

- Affected stored subject: none in product terms. The leaked `workspaces.json` is a test artifact in the repository tree; no user data is read or written.
- Remaining evidence gap: None.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. N/A.

## Product Design Findings

N/A — not applicable.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| None | — | Probe outputs under `/tmp/abyt199/` are disposable scratch, not promoted | — | — | — | — |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | The e2e residue probe ran without a server build, so the 28 build-dependent e2e cases did not run and could not show residue | Hidden writers may exist in those cases | The validation run builds first (`pnpm -C autobyteus-server-ts build`) and repeats the residue diff (AC-005) | Open, owned by validation |
| RSK-002 | Risk | Gated suites (`RUN_*`) were not run | They may write elsewhere | Out of scope (Non-Goal) | Accepted |
| UNK-001 | Unknown | Cause of the server unit failure in `project-task-index-status.test.ts` | Validation may hit it | FU-001 | Recorded |

## Architecture Investigation Findings

- The launcher's `serverCommand` is the single owner of "how an implementation is launched" for both stdio (via product) and HTTP (direct spawn). Putting the location variables into the command line there covers both paths and every caller (`stdio-managed`, `tool-registrar`, `http-managed`).
- `stdioServerConfig` merges `env` from `serverCommand` with test-intended `opts.env` and the pid-file variable. After the change, `serverCommand` returns no location variables in `env`; the Python impl's `env` becomes `{}` like the Node impl's.
- `startHttpTestServer` spawns `command`/`args` with `{...process.env, ...env}`; with `/usr/bin/env` as command it behaves the same.
- File-tool tests compare tool messages against `filePath` strings; on macOS `os.tmpdir()` is under `/var/…` → `/private/var/…`. Using `fs.realpath` of the temp dir (as `stdio-managed-mcp-server.test.ts` does) avoids any path-canonicalisation mismatch.
- `agent-runtime.test.ts` already has an owned temp-memory cleanup list (`memoryDirs`, `afterEach`). The "Agent facade" case can set `config.memoryDir` to a dir registered in that list.
- The five server e2e files can each own a data dir in `beforeAll`/`afterAll` like `workspace-content-rest.e2e.test.ts`. `workspaces-graphql.e2e.test.ts` additionally mocks `appConfigProvider.config` per case for some cases (`useIsolatedWorkspaceConfig`), which already uses temp dirs; its real-config cases are the leaking ones.

## Requirement Implications

- O-1, O-2, O-4 and 193 O-2 are confirmed by probes. O-4 is wider than stated (read/write file tests, agent memory folder); the Task's "Done when" (clean `git status --ignored`) brings them in scope.
- Server unit tests already leave nothing; no requirement there beyond keeping it so.

## Notes For Architecture Design

- Verified constraints: test-only; no product `src` change; no change to the MCP env-delivery assertions; Python cases still skip (never pass) on preparation failure.
- Approved scenario IDs to realize: SCN-001…SCN-004.
