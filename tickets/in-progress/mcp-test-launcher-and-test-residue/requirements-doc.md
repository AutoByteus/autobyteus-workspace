# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-test-launcher-and-test-residue`
- Request / ticket: Project Task `autobyteus-199` (part of `autobyteus-195`): "MCP test launcher: don't depend on the code under test for the uv environment; and tidy files and folders that other tests leave behind"
- Requested by (the user, or the delegating agent's address): `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`)
- Requirements owner: Solution Designer
- Date: 2026-10-20
- Approved by and reference: `Solution Designer within the direction (user informed)`; reference: Solution Designer's conversation message of 2026-10-20 stating the decisions below
- Exact approved requirements baseline / solution revision: this document at `SR-001`
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: (1) The MCP test launcher gives `uv` its virtual-environment location only through the product's stdio env delivery, the code under test; if that regresses, `uv` writes a `.venv` into the repository's fixture folder. (2) The preparation-failure skip reason is cut where `uv` wraps its output. (3) Several `autobyteus-ts` tests and five server e2e tests write files and folders into the worktree and leave them there; `.gitignore` rules hide them.
- Affected actors or systems: developers and agents running the core library tests and the server e2e tests; the repository worktree.
- Desired outcome: the uv test server's file locations are fixed by the launch command itself; the skip reason is complete; the core library tests, server unit tests and server e2e tests leave nothing behind in the worktree.
- Observable definition of success: `git status --ignored` lists no new entries after those runs, other than build outputs and the designated test-database folder (DEC-005); the launcher's Python server keeps its venv outside the repository even when the config env is not delivered.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | SCN-001 | `UV_PROJECT_ENVIRONMENT`, `UV_CACHE_DIR`, `PYTHONDONTWRITEBYTECODE` reach `uv run` only via `StdioMcpServerConfig.env` → product → SDK; lost delivery makes `uv` create `<fixture>/.venv` | These variables are set by the launch command, independent of the config env | Product env delivery stays tested by the env/cwd case and the pid-file variable; Python and Node implementations both run; the HTTP fixture path works | Notes: launcher L56-119, probe P-1 |
| BEH-002 | Operational | SCN-002 | Skip reason keeps the `×` line and one more line, cut mid-sentence | Skip reason contains uv's whole error block (message and every cause line), on one line | A preparation failure is a skip with its reason, never a pass; `uv` not on PATH keeps its reason | Notes: probe P-2 |
| BEH-003 | Operational | SCN-003 | `pnpm -C autobyteus-ts test` leaves 36 entries in `autobyteus-ts/`: `mcp-config-*`, `tmp-edit-file-*`, `tmp-read-file-*`, `tmp-write-file-*`, `memory/agents/…` | Each of these tests works in a temporary directory outside the package and removes it in teardown | What each test asserts | Notes: probe P-3 |
| BEH-004 | Operational | SCN-004 | `pnpm test:e2e` writes `autobyteus-server-ts/workspaces.json` (five e2e files use the default app data dir, the package root) | Those tests use a temporary data directory, removed in teardown | What each test asserts | Notes: probe P-4 |
| BEH-005 | Operational | SCN-003 | Server unit tests leave nothing | Unchanged | Yes | Notes: probe P-5 |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Developer / agent running tests | Run suites without dirtying the worktree | No residue; honest skip reasons | Test-only change |
| Validation roles | Prove the change | A repeatable before/after residue check | Build the server before e2e (TESTING.md) |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Launch the Python MCP test server so its file locations do not depend on the product's env delivery | SCN-001 |
| UC-002 | Report a complete reason when the Python fixture cannot be prepared | SCN-002 |
| UC-003 | Run the core library tests without leaving files or folders in the worktree | SCN-003 |
| UC-004 | Run the server e2e tests without leaving files or folders in the worktree | SCN-004 |

### Out Of Scope

- Product source (`src/`) of any package.
- The opt-in `real-user-kind-mcp-server.test.ts`, which deliberately configures its server the way a user does (DEC-004).
- `.gitignore` rules (DEC-006).
- `autobyteus-server-ts/tests/.tmp/` (designated test database and gated probe output; DEC-005).
- Build outputs created by install or build steps (`dist/`, `node_modules/`, generated Prisma client).
- Existing test failures not caused by this change (FU-001); the build-dependent e2e failures seen without a build (TESTING.md requires a build).
- Gated suites (`RUN_*`), web/Electron tests and other packages.

### Non-Goals

- No new shared test-temp-dir helper across packages; no guard that fails a run on residue.

### Preserved Behavior Boundary

- BEH-001 preserved column: the MCP env/cwd delivery assertions and pid-file handling stay as they are; Python cases skip, never pass, on preparation failure.
- Every touched test keeps its assertions; only where it writes changes.
- BEH-005.

### Prerequisites

None.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or follow-up. It is not a required design correction, unless it is a prerequisite.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The Python MCP test server is launched so that its venv, uv cache and bytecode settings are set by the launch command itself; none of them is passed through the stdio config's `env`. Removing the config `env` delivery must not make `uv` write into the repository | BEH-001 | Low | Test environment must not depend on the code under test | Task O-1; DEC-002, DEC-003 |
| REQ-002 | The product's env delivery stays covered: the existing env/cwd and pid-file behavior of the MCP integration tests is unchanged | BEH-001 | Must keep | Preserved behavior | Task O-1 |
| REQ-003 | When `uv` cannot prepare the fixture, the skip reason contains uv's complete error message with all its cause lines, joined on one line | BEH-002 | Low | Cosmetic but misleading today | Task O-2 |
| REQ-004 | The core library tests (`pnpm -C autobyteus-ts test`) create their temporary files and folders outside the worktree (under the OS temp directory) and remove them in teardown; this includes the agent memory written by the runtime test | BEH-003 | Low | Test hygiene | Task O-4; DEC-001 |
| REQ-005 | The server e2e tests that register workspaces use a temporary app data directory outside the worktree, removed in teardown; `pnpm test:e2e` no longer writes `autobyteus-server-ts/workspaces.json` | BEH-004 | Low | Test hygiene | Task 193 O-2; DEC-001 |
| REQ-006 | After a core library, server unit and server e2e run, `git status --ignored` shows no new entry compared with before the runs, except build outputs and `autobyteus-server-ts/tests/.tmp/` | BEH-003, BEH-004, BEH-005 | Low | The Task's "Done when" | Task; DEC-005 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001 / SCN-001 | `uv` on PATH; MCP integration tests run (`env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp`) | Python and Node cases pass as before; the stdio config for the Python impl carries no `UV_PROJECT_ENVIRONMENT`, `UV_CACHE_DIR` or `PYTHONDONTWRITEBYTECODE` in `env`; no `.venv` appears in `tests/fixtures/mcp-test-server/` | — | Run + inspect config |
| AC-002 | REQ-001 | BEH-001 / SCN-001 | Python server launched from the launcher's command with the config `env` not delivered (e.g. a one-off probe that spawns `command`/`args` with an env lacking those variables, or a temporary local mutation that drops `env` in the product transport) | The server starts with its venv in the launcher's temp location; `tests/fixtures/mcp-test-server/` stays unchanged; the env/cwd case fails (proving delivery is still tested) | — | Probe; temporary mutation not committed |
| AC-003 | REQ-002 | BEH-001 / SCN-001 | MCP integration tests | "delivers the configured env and cwd to the server" and pid-file-based cases pass for both implementations | — | Run |
| AC-004 | REQ-003 | BEH-002 / SCN-002 | Preparation forced to fail (e.g. `UV_OFFLINE=1` and an empty `UV_CACHE_DIR`, or a fresh `UV_PROJECT_ENVIRONMENT`) | Python cases skip; the reason printed in the console and describe title contains the full uv message, including the cause text up to its end (for the offline case, the package URL) | `uv` not on PATH still gives `uv unavailable (not on PATH)` | Run with forced failure |
| AC-005 | REQ-004, REQ-005, REQ-006 | BEH-003, BEH-004, BEH-005 / SCN-003, SCN-004 | Worktree with install and server build done; record `git status --ignored --porcelain --untracked-files=all` (minus `node_modules`); run `pnpm -C autobyteus-ts test`, `pnpm -C autobyteus-server-ts test:unit`, `pnpm test:e2e` with a clean env (TESTING.md) | The before/after diff has no new entries except build outputs and `autobyteus-server-ts/tests/.tmp/`; in particular no `mcp-config-*`, `tmp-*-file-*`, `autobyteus-ts/memory/`, `autobyteus-server-ts/workspaces.json` | Pre-existing failures unrelated to this change are reported with their cause or as FU-001 | Before/after diff |
| AC-006 | REQ-004, REQ-005 | BEH-003, BEH-004 | Same runs | Every touched test passes as before (same counts, no new skips) | — | Run |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Developer / agent; TESTING.md "Core library MCP integration" | Prove the MCP client against the real Python test server | The documented vitest command | `uv` on PATH | Prepare fixture → start server per case through the product client → assert → close | Tests pass; venv only in temp | Env delivery regressed: tests fail, repository untouched | Supported Normal Scenario | TESTING.md; launcher header | REQ-001, REQ-002; AC-001…AC-003 |
| SCN-002 | Operational | Developer / agent | Learn why the Python cases skipped | Same command when `uv sync` fails (offline, cache missing) | Preparation fails | Prepare → skip with reason | Complete reason | `uv` missing → its own reason | Supported Explicit Edge Scenario (the launcher contract: "A preparation failure makes the Python cases skip with the reason") | Launcher header L11 | REQ-003; AC-004 |
| SCN-003 | Operational | Developer / agent; TESTING.md layers | Run the core library and server unit suites | `pnpm -C autobyteus-ts test`; `pnpm -C autobyteus-server-ts test:unit` | Clean worktree | Run | No residue | — | Supported Normal Scenario | TESTING.md | REQ-004, REQ-006; AC-005, AC-006 |
| SCN-004 | Operational | Developer / agent; TESTING.md "Server E2E" | Run the server e2e suite | `pnpm test:e2e` | Built server | Run | No residue | — | Supported Normal Scenario | TESTING.md | REQ-005, REQ-006; AC-005, AC-006 |

## UI, Interaction, And Experience Requirements

- Applicable: `No`. N/A — not applicable for all Product design fields.

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-004, REQ-005 / AC-006 | Reliability | No touched test becomes slower by more than noise or gains a skip | Same machine, same runs | Compare counts/durations with the base logs |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No` (test artifacts only; no user data).

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| uv 0.10.x | Honors `UV_PROJECT_ENVIRONMENT`, `UV_CACHE_DIR`; error block format `×` + cause lines + `help:` | Probes P-1, P-2 | Format may change across versions; the reason must not depend on a fixed line count |
| `/usr/bin/env` | Present on macOS/Linux | POSIX | Python impl already unused on Windows |

## Supplemental Artifacts

None.

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The build-dependent e2e cases (not run in probe P-4) write no other residue | Probe P-4 lacked a build | AC-005 run with a build (validation) | Open |

## Decisions

| Decision ID | Question | Why It Matters | Options / Evidence | Reasoning And Recommendation | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- | --- |
| DEC-001 | Fix only the named `mcp-config-*`, `tmp-edit-file-*` and the one e2e writer, or all residue the runs leave? | The Task's "Done when" is a clean `git status --ignored` after the runs | Probes found also `tmp-read-file-*`, `tmp-write-file-*`, `memory/agents/…`, and five e2e writers of `workspaces.json` | The Task's done-criterion can only be met by fixing all of them; each is the same small change in a test file. Include all | Solution Designer | Decided |
| DEC-002 | Which variables move to the launch command? | O-1 names `UV_PROJECT_ENVIRONMENT` | `UV_CACHE_DIR` and `PYTHONDONTWRITEBYTECODE` also decide where files are written (cache; `__pycache__`) | All three: the same reasoning applies to each, and the config `env` then carries only test-intended values | Solution Designer | Decided |
| DEC-003 | `/usr/bin/env NAME=value uv run …` (Task's suggestion) or start the venv's `python` directly? | Both make the location independent of env delivery | Direct python skips `uv run`; the 189 fixtures deliberately start the server with `uv run` like users do | Keep `uv run` behind `/usr/bin/env` as the Task says; it keeps 189's intent and changes the least. Python already skips where `/usr/bin/env` is absent (Windows) | Solution Designer | Decided |
| DEC-004 | Change the opt-in `real-user-kind-mcp-server.test.ts` the same way? | It passes `UV_PROJECT_ENVIRONMENT` via config env too | It configures the server like a user does, in a temp copy; a regression writes only into that copy, which is removed; the fingerprint check guards the user's folder | Leave it; changing it would remove what it is meant to mirror | Solution Designer | Decided |
| DEC-005 | Is `autobyteus-server-ts/tests/.tmp/` residue? | It appears in `git status --ignored` | It is the designated, gitignored test-database location, reset at the start of every server run, and the documented output folder of gated TPS probes | Not residue: keep it and exclude it (and build outputs) from the clean check. Deleting it in teardown would change a shared harness for every server suite and the probes' evidence location, outside this Task's intent | Solution Designer | Decided |
| DEC-006 | Remove `.gitignore` rules that hide residue (`tmp-*/`, `mcp-config-*/`, `/memory/`, `/workspaces.json`)? | Visible regressions | The rules also cover developer runs (server from the package root, examples writing `memory/`) | Leave them; the check uses `--ignored`, so they hide nothing from it | Solution Designer | Decided |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001, AC-002 | SCN-001 | — |
| REQ-002 | UC-001 | BEH-001 | AC-003 | SCN-001 | — |
| REQ-003 | UC-002 | BEH-002 | AC-004 | SCN-002 | — |
| REQ-004 | UC-003 | BEH-003 | AC-005, AC-006 | SCN-003 | — |
| REQ-005 | UC-004 | BEH-004 | AC-005, AC-006 | SCN-004 | — |
| REQ-006 | UC-003, UC-004 | BEH-003, BEH-004, BEH-005 | AC-005 | SCN-003, SCN-004 | — |

## Architecture Phase Input

- Approved scenario IDs: SCN-001…SCN-004.
- Constraints: test-only; preserve MCP env/cwd assertions; skip-never-pass on preparation failure.
- Decisions deferred to design: exact error-block parsing; per-file teardown shape; realpath use.
- Technical facts to verify: `/usr/bin/env` keeps pid identity; file-tool path messages with temp dirs.
- Known risks: RSK-001 (build-dependent e2e cases unprobed).

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `N/A`
- Applicable UI/UX approval and final visual-reference basis are recorded: `N/A`
- Material assumptions and decisions are visible, each decision with reasoning and recommendation: `Yes`
- Content ready for approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- Approval recorded: `Yes` (Solution Designer within the direction; user informed 2026-10-20)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
