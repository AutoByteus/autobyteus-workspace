# Design Spec — Self-contained MCP integration tests on tiny real servers

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` SR-001, approved by the Solution Designer within the direction of Task `autobyteus-189` (user informed 2026-10-19)
- Design status: `Ready`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures/tickets/in-progress/mcp-real-server-test-fixtures/investigation-notes.md`
- Authorities read (2026-10-19): `references/architecture-design.md`, `references/design-principles.md`, `references/ticket-scope.md`, `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures/DESIGN.md`, `TESTING.md`
- Conflicts or discrepancies: the Task says "Document in TESTING.md how to run them", but TESTING.md restricts itself to global facts. Resolved by DEC-005: one layers row, with details in the file headers.

## Current-State Read

Three integration tests in `autobyteus-ts/tests/integration/tools/mcp/` depend on `autobyteus_mcps` toys through a wrong relative path and a fixed port, so they cannot run (BEH-001). A Node SDK stdio fixture (`tests/fixtures/mcp-stdio-fixture-server.mjs`) exists and is shared by a unit test and the 181 matrix suite. The product code under test, `StdioManagedMcpServer`, `HttpManagedMcpServer` and `McpToolRegistrar`, is unchanged.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Small`
- Size rationale:
  - test code and fixtures only, in one package (`autobyteus-ts/tests`): 3 test files rewritten, 1 Node fixture extended, 1 Python fixture added (server file, `pyproject.toml`, `uv.lock`);
  - 1 small shared test helper (server launcher and skip logic);
  - 1 opt-in test file, 1 fixture removed, 1 TESTING.md row.
- Architectural risk: `Low`
- Risk rationale: no product source, contract, persistence or deployment change. The only shared surface is the Node fixture, kept backward-identical (REQ-008).
- Escalation trigger: if a test reveals a product defect in the MCP client (a real failure after the server started), route it as a failure. If it belongs to other functionality (e.g. a session leak beyond autobyteus-193's scope), it is a follow-up or a prerequisite per `ticket-scope.md`.

## Architecture Investigation Evidence

See the investigation notes Source Log: the test path bug, the toy repo state, `pptx-mcp`, `cert.pem`, the fixture consumers, and the TESTING.md rules.

## Intended Change

Add a repository-owned tiny MCP test server (Python primary, Node fallback; stdio and HTTP; five tools; exit and hang modes). Rewrite the three integration tests on it, with clean skip rules. Add an opt-in real-server check. Remove `cert.pem`. Add one TESTING.md row.

## Change Scope (Mandatory)

- In scope: UC-001, UC-002.
  - `autobyteus-ts/tests/integration/tools/mcp/`
  - `autobyteus-ts/tests/fixtures/` (new `mcp-test-server/`, the extended `mcp-stdio-fixture-server.mjs`, removed `certificates/`)
  - a small helper under `autobyteus-ts/tests/integration/tools/mcp/`
  - one `TESTING.md` row
- Deliberately left alone:
  - product source;
  - `autobyteus-server-ts` tests, including the 181 matrix suite and the 179 e2e helper `auth-required-mcp-server.ts` (a server-side Node helper with its own purpose);
  - unit tests other than keeping them green.
- Follow-ups: none found. Possible later: the 179 server e2e helper and this ticket's Node fixture could share code. Not worth coupling packages now.

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | REQ / AC | Trigger | Outcome | Spine |
| --- | --- | --- | --- | --- |
| BEH-001 | REQ-001…005; AC-001…006 | Running the integration tests | Real servers exercised, or a clear skip | DS-001 |
| BEH-002 | REQ-006; AC-007 | — | Fixture removed | — |
| BEH-003 | REQ-008; AC-009 | Unit test, matrix suite | Unchanged | DS-001 |

## Relevant Supplemental Task Artifacts

None.

## Task Design Health Assessment (Mandatory)

- Change posture: `Cleanup` (test hygiene)
- Current design issue found: `Yes` (test-local)
- Structural triggers:
  - Repeated coordination fires: three files duplicate `resolveUvCommand` and the path logic. Response: one shared launcher helper.
  - Legacy cleanup fires: the dead toy paths and the fixed port. Response: removed.
- Root cause classification: `Duplicated Policy Or Coordination` plus `Legacy Or Compatibility Pressure` (in tests)
- Refactor needed now: `Yes`, bounded to the test folder
- Design response: a single helper owns "which server, how to start it, why skipped"; the tests own assertions only.

## Legacy Removal Policy (Mandatory)

- Removed: the `autobyteus_mcps`-relative paths, the hard-coded `uv` candidate list (use `PATH` lookup), fixed port 8764, the `pdf_mcp` and `streamable_http_mcp_toy` dependencies, and `cert.pem`.
- Compatibility wrappers kept: `None`.

## Persisted Data / State Transition Decision (Mandatory)

`Not Affected`: tests only.

## Data-Flow Spine Inventory

| Spine | Scope | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | A test case | Assertion on a real MCP server's response | Test + launcher helper | The real client against a real process |
| DS-002 | Bounded local | The launcher in `beforeAll` | A chosen implementation (Python / Node) or a skip reason | Launcher helper | Skip policy in one place |

## Primary Execution Spine(s)

- DS-001: `vitest case → test-server launcher (choose impl, prepare, config) → StdioManagedMcpServer | HttpManagedMcpServer | McpToolRegistrar (product, unchanged) → SDK client → tiny test server process (Python via uv, or Node) → tool result → assertion`

## Spine Narratives (Mandatory)

| Spine | Narrative |
| --- | --- |
| DS-001 | Each test asks the launcher for a stdio config, or for a running HTTP server URL plus its dummy token. It drives the product classes and asserts on real responses and on process exit (pid file). |
| DS-002 | The launcher checks `uv` on `PATH`. If found, it runs `uv sync --frozen` once into an environment outside the repository; on success the implementation is "python". Otherwise it is "node", with the reason recorded. If neither is usable (theoretical, since Node is always present), the reason is a skip. |

## Spine Actors / Main-Line Nodes

Test files; the launcher helper; the product MCP classes; the fixture servers.

## Ownership Map

- **Launcher helper** owns implementation choice, preparation, the venv location, free ports, process cleanup and skip reasons.
- **Fixtures** own tool behavior and the exit/hang/pid-file modes.
- **Tests** own assertions.

## Thin Entry Facades / Public Wrappers

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why | Replaced By | Scope |
| --- | --- | --- | --- |
| `autobyteus-ts/tests/fixtures/certificates/cert.pem` (and the folder) | Dead: no reference (grep) | — | In This Change |
| `resolveUvCommand` copies and the `mcpsRoot`/`pdfMcpDir`/`httpToyDir` constants in the 3 integration tests | Wrong path; duplicated | Launcher helper | In This Change |
| Fixed `SERVER_PORT = 8764` | Collisions | Port 0 / free port | In This Change |

## Return Or Event Spine(s)

N/A.

## Bounded Local / Internal Spines

DS-002 (above).

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| pid file | The close and hang cases | The fixture writes its pid to `MCP_TEST_SERVER_PID_FILE` when set; the test checks `process.kill(pid, 0)` throws after close |

## Ownership Boundaries

Fixtures never import product code. Tests use the product's public classes only (`autobyteus-ts/src/tools/mcp/...`).

## Boundary Encapsulation Map

| Boundary | Encapsulates | Forbidden |
| --- | --- | --- |
| Launcher helper | Implementation choice, `uv` preparation, skip reason | Tests calling `uv` or spawning fixtures directly |

## Dependency Rules

- The Python fixture depends only on the pinned `mcp` package (in its own `uv.lock`), plus the standard library.
- The Node fixture depends on the workspace `@modelcontextprotocol/sdk` and `zod`, as today.

## Interface Boundary Mapping

| Interface | Responsibility | Shape |
| --- | --- | --- |
| `prepareMcpTestServer()` (helper; name indicative) | Choose and prepare the implementation once | `{ impl: 'python' \| 'node', skipReason?: string }` |
| `stdioServerConfig(opts)` | A `StdioMcpServerConfig` for the chosen implementation | opts: `{ mode?: 'normal' \| 'exit-at-start' \| 'hang-at-start', env?, cwd?, pidFile? }` |
| `startHttpTestServer(opts)` | Start the HTTP fixture on a free port with a dummy token | `{ url, token, close() }` |
| Fixture CLI | Both languages | `--transport stdio\|http`, `--port N`, `--require-token <dummy>`, `--mode normal\|exit-at-start\|hang-at-start`; env `MCP_TEST_SERVER_PID_FILE` |
| Tools (both implementations) | Identical names and results | `echo(text)` → text; `add(a,b)` → structured content `{sum}` + text; `fail(message)` → tool error (`isError: true`); `slow(ms)` → text after a delay; `report_env_and_cwd(name)` → as today |

## Interface Boundary Check

Singular and explicit. The tool names are identical across implementations, so the tests are implementation-agnostic.

## Main Domain Subject Naming Check

`mcp-test-server` (folder), "launcher" helper: natural.

## Existing Capability / Subsystem Reuse Check

| Need | Decision |
| --- | --- |
| Node server | Extend `tests/fixtures/mcp-stdio-fixture-server.mjs` (keep path and tool; add tools, HTTP transport and modes) |
| HTTP auth check | Reuse the 179 pattern (token check per request) inside the fixtures |
| Clean env | TESTING.md's `env -i` pattern for `autobyteus-ts` integration tests |

## Subsystem / Capability-Area Allocation

`autobyteus-ts` test suite only.

## Draft File Responsibility Mapping

See the final mapping.

## Reusable Owned Structures Check

The launcher helper is the one shared structure (removes 3 duplicated resolvers).

## Shared Structure / Data Model Tightness Check

The tool contract is identical in both implementations; no optional divergent fields.

## Final File Responsibility Mapping

| File | Change |
| --- | --- |
| `autobyteus-ts/tests/fixtures/mcp-test-server/server.py` | New. Python MCP server, official SDK; tools and modes as above; stdio or streamable HTTP; token check on every HTTP request; pid file |
| `autobyteus-ts/tests/fixtures/mcp-test-server/pyproject.toml`, `uv.lock` | New; pinned `mcp` (current 2.x) and Python `>=3.10` |
| `autobyteus-ts/tests/fixtures/mcp-stdio-fixture-server.mjs` | Extended with the same tools, the HTTP transport, the modes and the pid file. Path and `report_env_and_cwd` unchanged. Header updated |
| `autobyteus-ts/tests/integration/tools/mcp/mcp-test-server-launcher.ts` | New helper (DS-002). `uv` from `PATH`; `UV_PROJECT_ENVIRONMENT=<os.tmpdir()>/autobyteus-mcp-test-server-venv-<lock hash>`; `uv sync --frozen` once; free port; cleanup |
| `autobyteus-ts/tests/integration/tools/mcp/stdio-managed-mcp-server.test.ts` | Rewritten: list; `echo`/`add`/`fail`/`slow`; env and cwd; exit-at-start; hang-at-start (not connected within ~3 s; close ends the pid); close ends the pid. Runs per available implementation (Python if prepared, and Node always), named in the test title |
| `autobyteus-ts/tests/integration/tools/mcp/http-managed-mcp-server.test.ts` | Rewritten: free port; with the token, list and call work; without or with a wrong token, an auth error; header on every request (server-side counter) |
| `autobyteus-ts/tests/integration/tools/mcp/tool-registrar.test.ts` | Rewritten on the test server: register, execute via the registry, preview without registering |
| `autobyteus-ts/tests/integration/tools/mcp/real-user-kind-mcp-server.test.ts` | New opt-in check. Gate `RUN_REAL_MCP_SERVER_E2E=1`; `AUTOBYTEUS_MCPS_DIR` (required); `REAL_MCP_SERVER_FOLDER` (default `pptx-mcp`); `REAL_MCP_SERVER_COMMAND` (default `uv run --frozen start-pptx-mcp`). Copies the folder to temp (without `.venv`), uses a temp `UV_PROJECT_ENVIRONMENT` and lists tools. An optional `REAL_MCP_SERVER_CALL='{"tool":…,"arguments":…}'` makes it call one tool. Skips with a message when the gate or the folder is missing |
| `autobyteus-ts/tests/fixtures/certificates/` | Delete |
| `TESTING.md` | One row in "Test layers", e.g. "Core library MCP integration (real test MCP servers; opt-in real-server check) — `env -i PATH="$PATH" HOME=<temp> TMPDIR="$TMPDIR" pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp`; opt-in gate in the file header". Committed on its own as `docs(testing): …` |

## Applied Patterns

None beyond a test helper.

## Target Subsystem / Folder / File Mapping

As the final mapping; a new fixture folder `tests/fixtures/mcp-test-server/`.

## Folder Boundary Check

The fixtures in `tests/fixtures`, the tests and their helper in `tests/integration/tools/mcp`: clear.

## Concrete Examples / Shape Guidance

| Topic | Good | Avoided |
| --- | --- | --- |
| Skip | `describe.skipIf(!prepared)("… (python via uv)")`, with the reason logged: "skipped: uv could not prepare the fixture: <stderr first line>" | A silent pass, or ENOENT |
| venv | `UV_PROJECT_ENVIRONMENT=$TMPDIR/autobyteus-mcp-test-server-venv-<hash>` | `.venv` inside the repository or the user's folders |
| Hang | Assert `connect()` has not resolved after ~3 s, then `close()`; the pid is gone | Waiting 60 s |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Decision |
| --- | --- |
| Keep the `autobyteus_mcps` toy tests "for the main checkout" | Rejected; replaced by the opt-in check with an explicit folder variable |

## Change / Refactor Sequence

1. Python fixture (lock with `uv lock`) and Node fixture extension.
2. Launcher helper.
3. Rewrite the three tests; run with `uv`, without `uv`, and with preparation forced to fail.
4. Opt-in check; run it against `/Users/normy/autobyteus_org/autobyteus_mcps` (copy) and check the user's `git status` is unchanged.
5. Delete `cert.pem`.
6. TESTING.md row (own commit).
7. Run `tests/unit` and the 181 matrix suite (AGY scripted gate).

## Key Tradeoffs

Two implementations cost a little duplication, but they make the always-on tests real on every machine while still matching the user's `uv`/Python kind.

## Risks

R-001…R-004 in the investigation notes.

## Guidance For Implementation

- Dummy tokens only. Never read the user's `mcps.json`.
- The opt-in run must leave `/Users/normy/autobyteus_org/autobyteus_mcps` unchanged (`git status` before and after).
- Keep each fixture under about 150 lines, with a purpose/how-to-run header.
