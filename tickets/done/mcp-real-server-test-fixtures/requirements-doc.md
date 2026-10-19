# Requirements Document — Self-contained MCP integration tests on tiny real servers

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-001`
- Package identifier: `mcp-real-server-test-fixtures`
- Request / ticket: Project Task `autobyteus-189` (part of `autobyteus-195`)
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`), on the user's direction of 2026-10-19
- Requirements owner: Solution Designer
- Date: 2026-10-19
- Approved by and reference: `Solution Designer within the direction (user informed)`. Reference: the Solution Designer's message to the user, 2026-10-19 ("autobyteus-189 requirements approved within the Task's direction …").
- Exact approved baseline: this document at SR-001
- Behavior-defining supplements: none

## Problem And Desired Outcome

- Problem: the repository's MCP integration tests against real servers cannot run in any layout. They point at a non-existent `<repo>/autobyteus_mcps` and at servers that moved or never existed, so no repository test exercises a real MCP server process of the user's kind. An unused certificate fixture remains.
- Desired outcome:
  - The integration tests run in any checkout or worktree against a tiny real MCP server owned by the repository, over stdio (started with `uv run`, like the user's servers) and over streamable HTTP.
  - When the tools they need are missing, they skip with a clear message.
  - An opt-in check can run against a real server of the user's kind.
  - TESTING.md says how to run both; the dead fixture is gone.

## Relevant Current And Desired Behavior

| ID | Kind | Current | Desired | Preserved |
| --- | --- | --- | --- | --- |
| BEH-001 | Operational | The three MCP integration tests fail with ENOENT everywhere | They run on repository-owned real servers, or skip with a reason | The unit tests and the 181 matrix suite keep working |
| BEH-002 | Operational | `tests/fixtures/certificates/cert.pem` is unused | Removed | — |
| BEH-003 | Operational | The Node stdio fixture has one tool, used by the unit test and the 181 matrix suite | Same file and tool, plus the new tools | `report_env_and_cwd` and its path |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| ID | Use Case | Scenarios |
| --- | --- | --- |
| UC-001 | A developer or agent runs the MCP integration tests in any checkout or worktree | SCN-001, SCN-002 |
| UC-002 | Someone tries an SDK change against a real server of the user's kind (opt-in) | SCN-003 |

### Out Of Scope

- Product code (none changes).
- The shorter start timeout (autobyteus-194) and the stdio session leak (autobyteus-193); this ticket only tests today's behavior.
- The 181 matrix suite beyond keeping it working.
- Server-side e2e helpers.
- CI test jobs (there are none).
- autobyteus-59, autobyteus-65 and autobyteus-148.

### Non-Goals

The commit is test code only, with no product source and no release; the user confirmed this on 2026-10-19 ("Or just test code. Test code should be fixed.").


No new MCP features in the fixtures beyond what the tests need; no test of the user's real configuration.

### Prerequisites

None (investigation notes, "Prerequisite Check").

### Preserved Behavior Boundary

BEH-003; `pnpm -C autobyteus-ts exec vitest run tests/unit` stays green; `mcp-runtime-tool-matrix.e2e.test.ts` stays green.

### Review Authority

Standard (`ticket-scope.md` applies).

## Requirements

| ID | Requirement | Behaviors | Priority | Rationale |
| --- | --- | --- | --- | --- |
| REQ-001 | The repository owns a tiny real MCP test server with the same tools in two implementations. A Python one uses the official MCP Python SDK, with a pinned `pyproject.toml` and `uv.lock`, started with `uv run`. A Node one uses the official TypeScript SDK. Both serve stdio and streamable HTTP. Tools: a read-only `echo`, an `add` returning structured content, a `fail` returning a tool error, a `slow` taking a given time, and the existing `report_env_and_cwd`. | BEH-001, BEH-003 | Must | Task, user |
| REQ-002 | The stdio, HTTP and registrar integration tests use the Python server when `uv` can prepare it, else the Node server. They never depend on `autobyteus_mcps` or a fixed port. When neither server can be started, the test is skipped and the skip message says what is missing (for example "uv unavailable" or "uv could not prepare the fixture: <reason>"). A failure after the server has started is a real failure. | BEH-001 | Must | Task |
| REQ-003 | The tests cover: listing tools; calling `echo`, `add` (structured content), `fail` (tool error surfaced as an error result, not a crash) and `slow`; env and cwd delivery; a server that exits at start (a clear connect error); a server that hangs at start (does not connect within a short bound, and closing ends its process); closing a connected server ends its process; and the HTTP server's auth header required on every request (autobyteus-179) on a free port. | BEH-001 | Must | Task |
| REQ-004 | The tests never write into the repository or the user's folders. `uv`'s environment goes outside the repository, and temp files are removed. | — | Must | Safety; 181 lesson |
| REQ-005 | An opt-in check, gated by an environment variable, lists the tools of a real `uv` server of the user's kind. The server's folder comes from an environment variable; the documented default target is `autobyteus_mcps/pptx-mcp` with entry point `start-pptx-mcp`. The server runs from a temp copy of its folder, so the user's folder is not written. Without the gate or the folder, the check skips with a message. It lists only, unless a tool name and arguments are explicitly given. | — | Must | Task |
| REQ-006 | `autobyteus-ts/tests/fixtures/certificates/cert.pem` is removed. | BEH-002 | Must | Task |
| REQ-007 | TESTING.md states how to run the MCP integration tests and the opt-in check: one row, details in the test file headers, per TESTING.md's own rules. | — | Must | Task; TESTING.md rules |
| REQ-008 | The Node fixture keeps its path and `report_env_and_cwd`, so the unit test and the 181 matrix suite keep working. | BEH-003 | Must | Preserve |

## Acceptance Criteria

| AC ID | REQ | Scenario | Trigger | Expected | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001, REQ-002, REQ-003 | SCN-001 | `env -i PATH HOME TMPDIR pnpm -C autobyteus-ts exec vitest run tests/integration/tools/mcp` in a fresh worktree, with `uv` available | All cases pass on the Python server (stdio and HTTP) | Run log |
| AC-002 | REQ-002 | SCN-002 | Same with `uv` hidden from `PATH` | All cases pass on the Node server; the log says the Node server was used | Run log |
| AC-003 | REQ-002 | SCN-002 | `uv` present but preparation fails (e.g. an offline cache or a forced bad index) | Python cases skipped with the reason; Node cases still run | Run log |
| AC-004 | REQ-003 | SCN-001 | The exit, hang, close, error, slow and auth cases | Each asserts its outcome. The hang case finishes well under the 20 s test timeout. The close cases prove the pid is gone | Run log + test source |
| AC-005 | REQ-004 | all | `git status` after the runs; the user's `autobyteus_mcps` `git status` before and after the opt-in run | Repository clean; user folder unchanged | Command output |
| AC-006 | REQ-005 | SCN-003 | With the gate and `AUTOBYTEUS_MCPS_DIR=/Users/normy/autobyteus_org/autobyteus_mcps` | `pptx-mcp` tools are listed from a temp copy. Without the gate: skipped with a message | Run log |
| AC-007 | REQ-006 | — | `ls`; `grep cert.pem` | Gone; no reference | Command output |
| AC-008 | REQ-007 | — | TESTING.md diff | One row added, committed on its own as `docs(testing): …` | Diff |
| AC-009 | REQ-008 | — | `vitest run tests/unit` and `mcp-runtime-tool-matrix.e2e.test.ts` (AGY scripted gate) | Green | Run logs |

## Relevant Scenarios And Journeys

| ID | Kind | Actor | Goal | Trigger | Outcome | Validity |
| --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | Operational | Developer or agent | Prove MCP client behavior against a real server | Running the integration tests | Real Python stdio and HTTP servers exercised | Supported Normal |
| SCN-002 | Operational | Same, on a machine without `uv` or offline | Same | Same | The Node server is used, or a clear skip | Supported Explicit Edge (TESTING.md: a skip is reported, never a pass) |
| SCN-003 | Operational | Someone checking an SDK change against the user's kind of server | Opt-in | Gate + folder | Real `uv` server listed from a temp copy | Supported Normal (opt-in) |

## UI, Interaction, And Experience Requirements

Not applicable.

## Quality And Non-Functional Requirements

| ID | REQ | Area | Constraint |
| --- | --- | --- | --- |
| QR-001 | REQ-003 | Operability | The integration folder finishes in under about 60 s once `uv` has cached its dependencies |

## Data Continuity And Acceptable Loss

Not affected (test files only).

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Why both Python and Node servers? | The user's servers are Python on `uv`, so the primary fixture matches that. Node is always present in this repository, so the fallback means the tests almost always exercise a real server rather than skipping | Solution Designer | Decided |
| DEC-002 | Preparation failure: skip or fail? | Skip with the reason (honest, and not counted as a pass), but only for preparation. After preparation succeeds, any start or tool failure fails the test, so real regressions are not hidden | Solution Designer | Decided |
| DEC-003 | Hang-at-start: wait for the 60 s SDK timeout? | No. Assert "not connected within a short bound" and that close ends the process. The product's shorter timeout comes with autobyteus-194, which can tighten this test | Solution Designer | Decided |
| DEC-004 | Opt-in target | Generic: a folder from an environment variable. Documented default `pptx-mcp`, listing only; servers in `autobyteus_mcps` move, as `pdf_mcp` and `video-audio-mcp` did | Solution Designer | Decided |
| DEC-005 | TESTING.md content | One layers-table row (command and opt-in gate), committed on its own; details in the file headers. That's what TESTING.md's own update rules allow | Solution Designer | Decided |
| DEC-006 | Include `tool-registrar.test.ts`? | Yes: same defect, same folder (`ticket-scope.md` "This ticket") | Solution Designer | Decided |

## Traceability

| REQ | UC | AC | SCN |
| --- | --- | --- | --- |
| REQ-001 | UC-001 | AC-001, AC-002 | SCN-001, SCN-002 |
| REQ-002 | UC-001 | AC-001…AC-003 | SCN-001, SCN-002 |
| REQ-003 | UC-001 | AC-004 | SCN-001 |
| REQ-004 | UC-001, UC-002 | AC-005 | all |
| REQ-005 | UC-002 | AC-006 | SCN-003 |
| REQ-006 | — | AC-007 | — |
| REQ-007 | UC-001, UC-002 | AC-008 | — |
| REQ-008 | UC-001 | AC-009 | — |

## Readiness Check

All checks: Yes. All decisions are within the direction. Approval recorded (Solution Designer within the direction, user informed). Ready for design.
