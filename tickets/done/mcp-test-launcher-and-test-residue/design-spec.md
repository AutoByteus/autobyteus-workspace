# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements baseline / revision, who approved, and approval reference: `requirements-doc.md` at `SR-002`; approved by the Solution Designer within the Task's direction (SR-002 adds REQ-007/AC-007 from the Project Task Manager's Task addition); user informed in the Solution Designer conversation on 2026-10-20
- Behavior-defining supplements and their approval references: None
- Design status: `Ready`
- Canonical investigation-notes path: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-test-launcher-and-test-residue/tickets/in-progress/mcp-test-launcher-and-test-residue/investigation-notes.md`
- Authorities read (design reading gate; file and date): `references/architecture-design.md`, `references/design-principles.md` (re-read after the 2026-10-20 updates, through commit `6352bd7`), `DESIGN.md` (repository root; no closer `DESIGN*.md` applies to `autobyteus-ts/tests` or `autobyteus-server-ts/tests/e2e`), `TESTING.md`; `references/design-examples.md` not used
- Project design-principle conflicts with the general principles, or discrepancies: None

## Current-State Read

- **Launcher (BEH-001, BEH-002).** `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` owns how each test-server implementation starts. `serverCommand('python')` returns `command: <uv>`, `args: run --frozen --project <fixture> python server.py …` and `env: uvEnv` (three location variables). `stdioServerConfig` puts that `env` into `StdioMcpServerConfig.env`, which reaches `uv` only through `StdioManagedMcpServer` → SDK `StdioClientTransport` (the code under test). `startHttpTestServer` spawns the same command directly. `uvError` keeps the `×` line plus one line (probe P-2).
- **Core library residue (BEH-003).** Five test files create `mkdtemp(<cwd>/<prefix>)` folders per case and never remove them; one runtime case lets `AgentFactory` fall back to `<cwd>/memory`. The same files' neighbors already show the target pattern: `stdio-managed-mcp-server.test.ts` (`realpathSync(mkdtempSync(os.tmpdir()/…))`, removed in `afterEach`) and `agent-runtime.test.ts` (`memoryDirs` list removed in `afterEach`).
- **Server e2e residue (BEH-004).** `AppConfig` uses the server package root as data dir unless `setCustomAppDataDir` is called before `initialize()`. Five in-process e2e files register workspaces on the real config, so the registry writes `autobyteus-server-ts/workspaces.json`. `workspace-content-rest.e2e.test.ts` already owns a temp data dir in `beforeAll`/`afterAll`.
- No structural problem: each owner (launcher; each test file's lifecycle hooks) is the right place; the defects are local choices of location.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale and supporting evidence: one test launcher function pair, local setup/teardown edits in 10 test files (5 core library, 5 server e2e), and one fixture fix in a contract e2e test (D-6). All are mechanical and follow patterns already in the same folders or file. No product `src`, no fixture, no config change.
- Architectural risk: `Low`
- Risk rationale and supporting evidence: test-only; no contract, persistence, security, concurrency, deployment or ownership-boundary change. `/usr/bin/env` execs `uv` in place (same pid), so process-lifetime assertions are unaffected (probe P-1 B). The product env-delivery assertions stay in place (REQ-002).
- Escalation trigger if implementation or validation discovers new impact: a needed change in product `src`; an e2e file that cannot set its data dir before `AppConfig.initialize()`; residue from the build-dependent e2e cases (RSK-001) that needs more than the same local teardown pattern; any change to what a test asserts.

## Architecture Investigation Evidence

| Source / Command / Probe | Exact Path / Reference | Observation | Design Decision Supported | Remaining Uncertainty |
| --- | --- | --- | --- | --- |
| Probe P-1 | investigation notes | Without the variable, `uv run --project` creates `<project>/.venv`; with the `/usr/bin/env` prefix it uses the given dir even when the child env lacks it | D-1 | None |
| Probe P-2 | investigation notes | uv error = `×` line + wrapped `╰─▶` cause lines + optional `help:` block | D-2 | Format across uv versions (handled by not counting lines) |
| Probe P-3 | investigation notes | 36 residue entries from 5 core test files | D-3, D-4 | None |
| Probe P-4 | investigation notes | `workspaces.json` with roots from 5 e2e files | D-5 | Build-dependent cases unprobed (RSK-001) |
| Code | `app-config.ts` L453-475; `workspace-content-rest.e2e.test.ts` L25-45 | `setCustomAppDataDir` before `initialize()`; existing pattern | D-5 | None |

## Intended Change

Fix the uv location variables on the launch command, report the whole uv error, and make each leaking test work in an OS temp directory that its own teardown removes.

## Change Scope (Mandatory)

- In scope: UC-001…UC-005. Areas: the MCP test launcher (`autobyteus-ts/tests/integration/tools/mcp/`), the core library file-tool, MCP config-service and agent-runtime tests that leak, and five server e2e files under `autobyteus-server-ts/tests/e2e/` (`file-explorer/`, `workspaces/`). Also the second case of `tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` (D-6).
- Deliberately left alone:
  - `real-user-kind-mcp-server.test.ts`: mirrors a user's config by design (DEC-004).
  - `workspace-content-rest.e2e.test.ts`: already correct.
  - `.gitignore` files (DEC-006).
  - `autobyteus-server-ts/tests/.tmp/` and the Prisma test setup (DEC-005).
  - The fixture `tests/fixtures/mcp-test-server/` (its `server.py` header example remains correct).
  - `TESTING.md`: no layer, command or rule changes.
  - Product `src/`.
- Follow-ups: `FU-001` (server unit `project-task-index-status` failure observed on the base).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior ID | Kind | Approved Requirement / Intent And Acceptance-Criteria IDs | Approved Trigger Or Governing Contract | Relevant Existing Behavior And Evidence Reference | Approved Change Or Preserved Outcome | Target Production Path / Lifecycle And Spine ID(s) |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | REQ-001, REQ-002; AC-001…AC-003 | MCP integration test run | Notes BEH-001, P-1 | Location variables on the command line; config `env` carries only test-intended values | DS-001 |
| BEH-002 | Operational | REQ-003; AC-004 | `uv sync` fails in preparation | Notes BEH-002, P-2 | Whole error block in the reason | DS-002 |
| BEH-003 | Operational | REQ-004, REQ-006; AC-005, AC-006 | `pnpm -C autobyteus-ts test` | Notes BEH-003, P-3 | OS temp dirs removed in teardown | DS-003 |
| BEH-004 | Operational | REQ-005, REQ-006; AC-005, AC-006 | `pnpm test:e2e` | Notes BEH-004, P-4 | Temp app data dir per file, removed in teardown | DS-004 |
| BEH-005 | Operational | REQ-006; AC-005 | `test:unit` | Notes P-5 | Preserved (no change) | — |
| BEH-006 | Contract | REQ-007; AC-006, AC-007 | Team stream contract parser | Notes P-6 | Each rejection payload valid except its named field | DS-005 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (test hygiene)
- Current design issue found: `No`
- Structural triggers: none fire. Plausible ones ruled out:
  - *Repeated coordination / reusable structure*: the "temp dir per test, removed in teardown" lifecycle repeats across files, but each copy is 3-5 lines bound to that file's hooks. The packages have no shared test-temp helper, and the neighbors use the same local form. A shared helper would be a new cross-file surface for trivial code, so it is not extracted (see Reusable Owned Structures Check).
  - *Authoritative boundary*: tests set the data dir through `AppConfig.setCustomAppDataDir`, the config's public boundary, as the existing e2e does. No new bypass. The existing `vi.spyOn(appConfigProvider, "config")` mocks in `workspaces-graphql` stay as they are.
  - *Capability-area reuse*: reuses `os.tmpdir()`, `AgentConfig.memoryDir` and `setCustomAppDataDir`; nothing new.
- Root cause classification: `Local Implementation Defect` (each test chose a location inside the worktree; the launcher routed launch settings through the subject under test)
- Refactor needed now: `No`
- Evidence: Current-State Read; probes P-1…P-5.
- Design response: D-1…D-5 below.
- Refactor rationale: owners and boundaries are already right.
- Intentional deferrals and residual risk: RSK-001 (build-dependent e2e cases unprobed; covered by AC-005 in validation).

## Terminology

- Location variables: `UV_PROJECT_ENVIRONMENT`, `UV_CACHE_DIR`, `PYTHONDONTWRITEBYTECODE` (they decide where `uv`/Python write files).
- Residue: a file or folder a test run creates in the worktree and leaves there.

## Design Decisions

- **D-1 Launch command (REQ-001, REQ-002).** In `serverCommand('python')`, return `command: '/usr/bin/env'` and `args: ['UV_PROJECT_ENVIRONMENT=<dir>', 'UV_CACHE_DIR=<dir>', 'PYTHONDONTWRITEBYTECODE=1', <uvPath>, 'run', '--frozen', '--project', <fixture>, 'python', <server.py>, ...serverArgs]` and `env: {}`. The NAME=value args are built from the same values `preparePython` resolves (respecting caller-set `UV_PROJECT_ENVIRONMENT` / `UV_CACHE_DIR`). `preparePython` keeps passing the same values directly to `uv sync` (its own spawn, not the product). `stdioServerConfig` still merges `opts.env` and the pid-file variable into the config `env`, so product env delivery stays tested. `startHttpTestServer` is unchanged; it gets the new command from `serverCommand`. Update the launcher header to state that the location variables are on the command line, not in the config `env`.
- **D-2 Skip reason (REQ-003).** `uvError` returns the error block, from the first line starting with `×` or `error:` up to (not including) the first following line starting with `help:`, or to the end. Lines are trimmed and joined with a single space. It falls back to the last line when there is no such start line, as today. It never counts lines.
- **D-3 Core library temp folders (REQ-004).** In `tests/unit/tools/mcp/config-service.test.ts`, `tests/unit/tools/file/edit-file.test.ts`, `tests/integration/tools/file/edit-file.test.ts`, `read-file.test.ts` and `write-file.test.ts`, replace `mkdtemp(path.join(process.cwd(), '<prefix>'))` with a file-local function. It creates `realpath(mkdtemp(path.join(os.tmpdir(), '<same prefix>')))` and records the dir in a file-local list, which an `afterEach` removes (`rm -rf`, `force`). The prefixes stay the same so failures stay recognizable. Test bodies do not change otherwise.
- **D-4 Agent memory (REQ-004).** In `tests/integration/agent/runtime/agent-runtime.test.ts`, the "Agent facade delegates start/stop to runtime" case sets `config.memoryDir` to a temp dir registered in the existing `memoryDirs` list (which `afterEach` already removes), as the restore case does with `memoryDir`. Then no case in the file falls back to `<cwd>/memory`. Check the other `factory.createAgent…` calls in the file the same way: a case that writes memory and has no `memoryDir` gets the same treatment.
- **D-5 Server e2e data dir (REQ-005).** In `file-explorer-websocket-lifecycle`, `file-explorer-graphql`, `file-explorer-path-boundary`, `file-operations-graphql` (all `tests/e2e/file-explorer/`) and `tests/e2e/workspaces/workspaces-graphql.e2e.test.ts`, the file's `beforeAll` first creates `mkdtemp(os.tmpdir()/<file-specific prefix>-appdata-)` and calls `appConfigProvider.config.setCustomAppDataDir(dir)` before anything initializes the config. The file's `afterAll` removes the dir after the file's existing cleanup. This is the pattern of `workspace-content-rest.e2e.test.ts`. Write the minimal `.env` only if a file needs it to run quietly or correctly (that file does it because it starts a full server). The `workspaces-graphql` per-case `useIsolatedWorkspaceConfig` mocks stay. Its real-config cases now write into the file's temp data dir.

- **D-6 Contract rejection payloads (REQ-007).** First rebase the branch onto current `origin/personal` (≥ `aac5da3112`, which contains `autobyteus-211`'s change to this file; no conflicts with this branch's files). In the second case of `team-task-event-current-contract.e2e.test.ts`, add `source: { kind: "agent", agent_definition_id: "worker", launch_configuration: launch }` (the first case's agent source) to both `TASK_EXECUTION_STARTED` payloads. Leave `settled_at: null` in the first one and leave out `delegator_agent_run_id` in the second, so each differs from a valid payload in that field only. The `TASK_DELEGATION_EVENT` rejection and the first case stay unchanged. Show specificity with the two uncommitted mutations of AC-007. Do not add error-text matching (DEC-007).

## Section Fill Order

Followed; sections that do not apply say `N/A` with the reason.

## Legacy Removal Policy (Mandatory)

- Obsolete legacy paths and files in this scope: the location variables in the Python config `env` (replaced by D-1); `uvError`'s two-line slice (replaced by D-2).
- Compatibility wrappers, dual paths, or legacy fallbacks this design keeps: `None`

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

- Decision: `Not Affected`. Test artifacts only; no product data is read or written. Developers can delete residue already left in their worktrees by hand; the tests do not need to clean old residue.

## Data-Flow Spine Inventory

| Spine ID | Scope | Related Behavior ID(s) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | BEH-001 | MCP integration test case | Python test server process with venv in temp | Launcher `serverCommand` | Where the launch settings travel |
| DS-002 | Primary End-to-End | BEH-002 | `prepareMcpTestServers` | Skip reason in describe title/console | Launcher `preparePython` | Honest skip |
| DS-003 | Primary End-to-End | BEH-003 | Core test case | Temp dir removed in `afterEach` | Each test file's lifecycle hooks | No residue |
| DS-005 | Primary End-to-End | BEH-006 | Rejection case payload | `toThrow()` | The test case | Assertion proves its named field |
| DS-004 | Primary End-to-End | BEH-004 | e2e file `beforeAll` | Data dir removed in `afterAll` | Each e2e file's lifecycle hooks | No residue |

## Primary Execution Spine(s)

- DS-001: `Test case -> stdioServerConfig/serverCommand -> StdioManagedMcpServer (product) -> SDK StdioClientTransport -> /usr/bin/env (sets location vars) -> uv run -> server.py`
- DS-002: `prepareMcpTestServers -> preparePython -> uv sync (direct spawn) -> uvError(stderr) -> PreparedImpl.reason -> describe.skipIf title`
- DS-003: `beforeEach/case -> local temp-dir function (os.tmpdir) -> tool or service under test -> afterEach rm`
- DS-004: `beforeAll -> setCustomAppDataDir(temp) -> GraphQL/WebSocket/workspaceManager -> WorkspaceRegistryStore writes <temp>/workspaces.json -> afterAll rm`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | The launcher builds a command that sets the location variables itself and then execs `uv`; the product only carries the test's own env values | Launcher, product client, `uv` | `serverCommand` | None |
| DS-002 | A failed `uv sync` becomes a skip whose reason is uv's whole error block | `preparePython`, `uvError` | `preparePython` | None |
| DS-003 | Each test asks its file-local function for a temp dir under the OS temp folder; teardown removes all of them | Test file hooks | Each test file | None |
| DS-004 | Each e2e file points the app config at its own temp data dir before use and removes it at the end | e2e file hooks, `AppConfig` | Each e2e file | None |

## Spine Actors / Main-Line Nodes

Launcher `serverCommand` / `preparePython`; each test file's lifecycle hooks; `AppConfig` (unchanged).

## Ownership Map

- `serverCommand`: owns how an implementation is launched (command, args, env). After D-1 it also owns the location variables on the command line.
- `preparePython`: owns preparation and the skip reason.
- Each test file: owns its temp dirs' lifetime.
- `AppConfig` (product, unchanged): owns the data-dir setting; tests use its public `setCustomAppDataDir`.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A: none involved.

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Notes |
| --- | --- | --- | --- |
| Location variables in the Python `serverCommand` `env` | Set on the command line instead | D-1 in the launcher | `env` becomes `{}` |
| `lines.slice(at, at + 2)` in `uvError` | Cuts the message | D-2 block parsing | — |
| `path.join(process.cwd(), '<prefix>')` temp locations in 5 test files | Leave residue | D-3 file-local temp function | — |

No dead code found in the touched files. Searched 2026-10-20: the launcher's functions are all imported by the MCP tests. `McpTestServerMode` and `PreparedImpl` are not imported elsewhere, but they are the parameter and return types of exported functions, so they stay as part of those signatures. In `agent-runtime.test.ts`, the only agent created without a memory location is at L567 (the restore case sets `memoryDir`/passes `tempDir`).

## Return Or Event Spine(s) (If Applicable)

N/A: no async event path is involved.

## Bounded Local / Internal Spines (If Applicable)

N/A.

## Off-Spine Concerns Around The Spine

N/A: none.

## Ownership Boundaries

The product boundary (`StdioManagedMcpServer`, `AppConfig`, `AgentFactory`) is not changed. Tests use only their public inputs: config `command`/`args`/`env`, `setCustomAppDataDir`, `AgentConfig.memoryDir`.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| `AppConfig.setCustomAppDataDir` | `dataDir`, memory dir | The five e2e files | Writing `AppConfig` private fields, or adding a new `vi.spyOn` config mock only to move the data dir | N/A (sufficient) |

## Dependency Rules

Test files may depend on the product's public test-used boundaries named above and on Node/OS (`os.tmpdir`, `fs`). They must not add test-only hooks to product `src`.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `serverCommand(impl, serverArgs)` | Launch of one test-server implementation | Command, args, env | `impl: 'python' \| 'node'` | Signature unchanged |
| `uvError(text)` | uv stderr | Reason text | string | Signature unchanged |

## Interface Boundary Check

| Interface | Responsibility Is Singular? | Identity Shape Is Explicit? | Ambiguous Selector Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| `serverCommand` | Yes | Yes | Low | None |
| `uvError` | Yes | Yes | Low | None |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Launcher module state | `uvEnv` (the location values) | Yes; the implementer may rename it, e.g. to `uvLocations`, since it is no longer an `env` object | Low | Optional |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Temp dir outside the worktree | `os.tmpdir()` + `fs.mkdtemp`, pattern in `stdio-managed-mcp-server.test.ts` | Reuse | Established | — |
| Agent memory location | `AgentConfig.memoryDir`, `memoryDirs` list in `agent-runtime.test.ts` | Reuse | Established | — |
| Server data dir | `AppConfig.setCustomAppDataDir`, pattern in `workspace-content-rest.e2e.test.ts` | Reuse | Established | — |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/tools/mcp` | Test-server launch | DS-001, DS-002 | Launcher | Extend | — |
| `autobyteus-ts/tests/{unit,integration}` | Test temp dirs | DS-003 | Test files | Reuse | — |
| `autobyteus-server-ts/tests/e2e` | Test data dirs | DS-004 | e2e files | Reuse | — |

## Draft File Responsibility Mapping

See Final File Responsibility Mapping; there is no intermediate restructuring.

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? | Overlapping Representations Removed? | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| "temp dir, removed in teardown" in 5 core test files | Considered: a `tests/` helper module | `autobyteus-ts/tests` | Not shared: 3-5 lines tied to each file's hooks; no shared test-helper folder exists; neighbors use the local form | N/A | N/A | A generic test-utils catch-all |
| "temp app data dir" in 5 e2e files (+1 existing) | Considered: `tests/e2e/helpers/` | `autobyteus-server-ts/tests/e2e` | Not shared: two calls plus a remove; the existing file differs (starts a full server, writes `.env`) | N/A | N/A | A server-start helper |

## Shared Structure / Data Model Tightness Check

N/A: no shared structure.

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` | MCP integration tests | Launcher | D-1, D-2, header text | Existing owner | No |
| `autobyteus-ts/tests/unit/tools/mcp/config-service.test.ts` | Core unit tests | File hooks | D-3 | Existing | No |
| `autobyteus-ts/tests/unit/tools/file/edit-file.test.ts` | Core unit tests | File hooks | D-3 | Existing | No |
| `autobyteus-ts/tests/integration/tools/file/edit-file.test.ts` | Core integration tests | File hooks | D-3 | Existing | No |
| `autobyteus-ts/tests/integration/tools/file/read-file.test.ts` | Core integration tests | File hooks | D-3 | Existing | No |
| `autobyteus-ts/tests/integration/tools/file/write-file.test.ts` | Core integration tests | File hooks | D-3 | Existing | No |
| `autobyteus-ts/tests/integration/agent/runtime/agent-runtime.test.ts` | Core integration tests | File hooks | D-4 | Existing | No |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-websocket-lifecycle.e2e.test.ts` | Server e2e | File hooks | D-5 | Existing | No |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-graphql.e2e.test.ts` | Server e2e | File hooks | D-5 | Existing | No |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-explorer-path-boundary.e2e.test.ts` | Server e2e | File hooks | D-5 | Existing | No |
| `autobyteus-server-ts/tests/e2e/file-explorer/file-operations-graphql.e2e.test.ts` | Server e2e | File hooks | D-5 | Existing | No |
| `autobyteus-server-ts/tests/e2e/workspaces/workspaces-graphql.e2e.test.ts` | Server e2e | File hooks | D-5 | Existing | No |
| `autobyteus-server-ts/tests/e2e/runtime/team-task-event-current-contract.e2e.test.ts` | Server e2e | Rejection case | D-6 | Existing | Reuses the file's `launch` constant |

## Applied Patterns (If Any)

None.

## Target Subsystem / Folder / File Mapping

All `Modify`; no files are added, moved or removed (table above). Flat by nature: each change stays in its existing file.

## Folder Boundary Check

N/A: no folder changes.

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| D-1 command | `{ command: '/usr/bin/env', args: ['UV_PROJECT_ENVIRONMENT=/tmp/…venv-<hash>', 'UV_CACHE_DIR=/tmp/…uv-cache', 'PYTHONDONTWRITEBYTECODE=1', '/opt/homebrew/bin/uv', 'run', '--frozen', '--project', '<fixture>', 'python', '<fixture>/server.py', '--mode', 'normal'], env: {} }` | `{ command: uv, args: [...], env: { UV_PROJECT_ENVIRONMENT: … } }` | The location no longer travels through the code under test |
| D-2 reason | `uv could not prepare the fixture: × Failed to download \`cryptography==50.0.2\` ╰─▶ Network connectivity is disabled, but the requested data wasn't found in the cache for: \`https://files.pythonhosted.org/…whl\`` | `… ╰─▶ Network connectivity is disabled, but the` | Complete reason |
| D-3 temp dir | `const tempDirs: string[] = []; const makeTempDir = async () => { const dir = await fs.realpath(await fs.mkdtemp(path.join(os.tmpdir(), 'tmp-edit-file-'))); tempDirs.push(dir); return dir; }; afterEach(async () => { await Promise.all(tempDirs.splice(0).map((dir) => fs.rm(dir, { recursive: true, force: true }))); });` | `fs.mkdtemp(path.join(process.cwd(), 'tmp-edit-file-'))` | Matches the neighbors' pattern |
| D-5 data dir | `beforeAll: dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'file-explorer-graphql-appdata-')); appConfigProvider.config.setCustomAppDataDir(dataDir); …` / `afterAll: fs.rmSync(dataDir, { recursive: true, force: true })` | Relying on the default data dir (package root) | Same as `workspace-content-rest` |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep the location variables in config `env` as well as on the command line | "Belt and braces" | Rejected | Command line only; config `env` keeps test-intended values (the env/cwd case still proves delivery) |
| Clean old residue from developers' worktrees in test setup | Existing leftovers | Rejected | Not test behavior; manual deletion |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Launcher D-1, D-2; run the MCP integration folder (both implementations), and force a preparation failure once (AC-004).
2. D-3, D-4 in the core test files; run `pnpm -C autobyteus-ts test`.
3. D-5 in the five e2e files; run each file, then the full `pnpm test:e2e` with a server build.
4. D-6: rebase onto current `origin/personal`, then fix the payloads; run the file and the two AC-007 mutations.
5. Residue check (AC-005) around the three suites, starting from a worktree with the residue removed.

## Key Tradeoffs

- `/usr/bin/env` + `uv run` (Task's direction, keeps 189's "start like users do") over launching the venv's `python` directly (would drop `uv run` from the path).
- Local per-file teardown over a shared helper: less surface, matches neighbors.

## Risks

- Rebase while implementation is under way: the branch has the implementation commit `33fc5f4e16`. `personal` changed only two files that the branch does not touch, so the rebase should be clean. The implementation engineer owns it.
- RSK-001: build-dependent e2e cases were not probed for residue; AC-005 in validation covers them. A new writer found there that needs a different fix is an escalation trigger.
- A file-tool test that compares a path string could break if the temp path is not canonical; `realpath` (D-3) prevents it.

## Guidance For Implementation

- Use `env -i PATH="$PATH" HOME=<resolved temp> TMPDIR="$TMPDIR"` for the core and e2e runs (TESTING.md). Build the server (`pnpm -C autobyteus-server-ts build`) before `pnpm test:e2e`.
- For AC-002, prove independence with a throwaway probe or an uncommitted local mutation. Do not add a product hook.
- Keep test assertions unchanged; only locations and teardown change.
- Remove the residue the base runs left in your worktree before measuring AC-005.
