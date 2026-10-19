# API/E2E Coverage Investigation — mcp-real-server-test-fixtures

## Investigation Meta

- Requirements Doc: `tickets/in-progress/mcp-real-server-test-fixtures/requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `tickets/in-progress/mcp-real-server-test-fixtures/investigation-notes.md`
- Solution Revision Record: `tickets/in-progress/mcp-real-server-test-fixtures/solution-revision-record.md`
- Design Spec: `tickets/in-progress/mcp-real-server-test-fixtures/design-spec.md` (SR-001; Small / Low)
- Supplemental Task Artifacts: none
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `tickets/in-progress/mcp-real-server-test-fixtures/implementation-handoff.md` (IR-001)
- Implementation Revision Record: `tickets/in-progress/mcp-real-server-test-fixtures/implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `tickets/in-progress/mcp-real-server-test-fixtures/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct route)
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-real-server-test-fixtures`, branch `codex/mcp-real-server-test-fixtures`. Validated: test code `baaee3a150`, HEAD `8d7edc2827`. `git diff --name-only baaee3a150 8d7edc2827` lists only `TESTING.md` and the ticket folder.

## Current Requirement And Design Basis

This ticket changes no product code; the deliverable is the tests themselves. "Proving" it means:
- REQ-001 / REQ-002 / AC-001…AC-003: the three MCP integration tests run on repository-owned real servers in any checkout or worktree. That is Python via `uv` when it can be prepared, else Node. Python cases skip with the reason when `uv` is missing or preparation fails, and a skip is never a pass.
- REQ-003 / AC-004: listing; `echo`, `add` (structured), `fail` (tool error, still connected) and `slow`; env/cwd delivery; exit-at-start (connect error); hang-at-start (no connect within a short bound, and close ends the pid); close ends the pid; HTTP auth required on every request on a free port.
- REQ-004 / AC-005: nothing written into the repository or the user's folders. The `uv` environment and cache stay outside the repository, and temp files are removed.
- REQ-005 / AC-006: the opt-in check (gate plus folder) lists a real `uv` server from a temp copy. It skips with a message otherwise, and calls a tool only when told to.
- REQ-006 / AC-007: `cert.pem` gone. REQ-007 / AC-008: one TESTING.md row, in its own commit.
- REQ-008 / AC-009: the Node fixture keeps its path and `report_env_and_cwd`, so the unit test and the 181 matrix suite stay green.
- QR-001: the folder finishes in about 60 s or less once cached.
- Handoff deviations, to be judged:
  1. The opt-in default command is `uv run --frozen python app/main.py`, not `start-pptx-mcp`, because the project is virtual.
  2. The unit test's exact tool list was extended.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (run the tests in any checkout), SCN-002 (no `uv`, or offline), SCN-003 (opt-in).
- Added from investigation:
  - SCN-A1 — a non-worktree checkout (the "main checkout" layout), at a path whose parent has no `autobyteus_mcps`. Used as a test-owned local clone, because the user's main checkout must not be switched.
  - SCN-A2 — a second run on a machine whose cache is warm, with the network off: Python must still be used.
  - SCN-A3 — a first run on a new machine: empty `uv` cache and environment, network on.
  - SCN-A4 — the opt-in check with a call (`REAL_MCP_SERVER_CALL`) against a user-kind server that has a read-only tool. REQ-005's call path is otherwise unexercised.
  - SCN-A5 — the TESTING.md row's exact command, run from the repository root.
- Contrived: none.

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Risk Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | No (product unchanged) | — | — | — | — |
| Test harness / fixtures | Yes | launcher choice, preparation and skip; two fixture implementations; pid and process handling | IMP-01…IMP-03 in the worktree | other layouts; first-run vs offline cache; leftovers outside `git status`; opt-in call path | CLI (vitest) in a clone; process checks |
| External integration (uv, PyPI, user's server folders) | Yes | `uv sync --frozen`, cache, real third-party servers | IMP-04 (pptx-mcp list) | another folder; call path; user folders unchanged | opt-in runs |
| Persisted data | No | — | — | — | — |
| Other surfaces | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root; the ticket adds the "Core library MCP integration" row). No closer guideline.
- Constraints: a clean environment for `autobyteus-ts` integration tests (`env -i PATH HOME=<resolved temp> TMPDIR`); a skip is not a pass; never write into the user's folders; untracked build outputs stay unstaged.
- Secrets: none needed; dummy tokens only.

| Component | Setup | Cleanup |
| --- | --- | --- |
| Worktree runs | as is (`pnpm install` done) | snapshot `git status --short --ignored` before and after |
| Main-checkout-layout clone | `git clone --no-hardlinks <worktree> $TMPDIR/…/autobyteus-workspace` at `codex/mcp-real-server-test-fixtures`; `pnpm install --frozen-lockfile` | `rm -rf` |
| Fresh `uv` environment and cache (first run) | `UV_PROJECT_ENVIRONMENT`, `UV_CACHE_DIR` pointed at fresh temp dirs | removed |
| Opt-in targets | `AUTOBYTEUS_MCPS_DIR=/Users/normy/autobyteus_org/autobyteus_mcps` (pptx-mcp, read through a temp copy); `/Users/normy/autobyteus_org/autobyteus_private_mcps` (yt-dlp-mcp, list only); a test-owned folder with `video-audio-mcp` restored by `git archive a947f1a^` (call path) | user repos' `git status`/HEAD before and after |
| Live matrix cell (optional) | `RUN_CLAUDE_E2E=1` on `mcp-runtime-tool-matrix.e2e.test.ts` | test-owned |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-ts/tests/integration/tools/mcp/{stdio-managed-mcp-server,http-managed-mcp-server,tool-registrar}.test.ts` | rewritten by this ticket | AC-001…AC-004 | Under validation | Run in several layouts |
| `…/mcp-test-server-launcher.ts`, `…/real-user-kind-mcp-server.test.ts` | new | AC-001…AC-003, AC-006 | Under validation | Run |
| `autobyteus-ts/tests/unit/tools/mcp/stdio-managed-mcp-server.test.ts` | exact tool list updated | AC-009 | Still Valid. The handoff deviation is correct: REQ-001 adds tools, and REQ-008 only protects the path and `report_env_and_cwd` | Reuse IMP-05 |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-runtime-tool-matrix.e2e.test.ts` | uses the Node fixture | AC-009 | Still Valid | Reuse IMP-06 (AGY); add one live cell |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-009 | core unit; 181 matrix (AGY scripted) | Reused | IMP-05, IMP-06 | `baaee3a150` holds all test code; later commits add only TESTING.md and ticket files |
| API-R02 | AC-007, AC-008 | `ls`/grep; `git show --stat` | Reused + recheck | handoff rows AC-007, AC-008 | Cheap to recheck |
| API-01 | AC-001, AC-004, AC-005, QR-001; SCN-A5, SCN-A2 | worktree, exact TESTING.md command, warm cache | Existing Test | TESTING.md row command from the repository root; ignored-file snapshot before and after; `ps` for leftovers | Independent confirmation in the worktree |
| API-02 | AC-001, AC-005; SCN-A1, SCN-A3 | main-checkout-layout clone, fresh `uv` environment and cache (network) | Existing Test | same command in the clone, with fresh `UV_PROJECT_ENVIRONMENT`/`UV_CACHE_DIR` | First run on a non-worktree checkout |
| API-03 | AC-001; SCN-A2 | clone, same cache, `UV_OFFLINE=1` | Existing Test | same | Offline from the cache |
| API-04 | AC-002 | clone, `uv` hidden from PATH | Existing Test | PATH with only node/pnpm and system dirs | Independent AC-002 |
| API-05 | AC-003 | clone, preparation forced to fail (empty cache, offline) | Existing Test | `UV_OFFLINE=1`, fresh empty cache and env | Independent AC-003 |
| API-06 | AC-006, AC-005 | opt-in: ungated skip; missing folder; pptx-mcp default (list); yt-dlp-mcp (list, another folder and command) | Existing Test | gate and env per variant; user repos' `git status`/HEAD before and after | Independent AC-006; DEC-004 generality |
| API-07 | REQ-005 call path; SCN-A4 | opt-in with `REAL_MCP_SERVER_CALL` on a test-owned restored `video-audio-mcp` (`get_media_duration` on its sample) | Existing Test | gate, `AUTOBYTEUS_MCPS_DIR=<test-owned>`, `REAL_MCP_SERVER_FOLDER=video-audio-mcp`, `REAL_MCP_SERVER_COMMAND='uv run --frozen python server.py'` | Exercises the otherwise untested call path |
| API-08 | AC-004 (non-vacuity) | product source mutations: stdio env dropped; HTTP request headers dropped | Temporary Probe | edit `autobyteus-ts/src` (two lines), run the folder, `git checkout` | Proves the rewritten tests catch real client regressions |
| API-09 | AC-009 (optional live) | matrix suite, Claude cell | Existing Test | `RUN_CLAUDE_E2E=1 … mcp-runtime-tool-matrix.e2e.test.ts` | The extended fixture's extra tools must not disturb a live agent |
| API-10 | AC-005, REQ-004, dummy values | repository and user folders, evidence scan | Temporary Probe | ignored-file diffs, `git status` of user repos, `ps`, grep | — |

- Test progress log: `Yes`

## Durable Coverage To Add / Update / Remove

None planned by API/E2E; the ticket's own test changes are under validation.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| The user's literal main checkout | Must not be switched to this branch; a local clone gives the same layout | Low | No | — |
| Opt-in on ssh/tts/alexa/browser servers | Need credentials or heavy models, or start side effects (REQ-010-style safety from 181) | Low | No | — |

## Ambiguities Or Reroute Triggers

- REQ-005's wording (`start-pptx-mcp`) vs the implemented default (`uv run --frozen python app/main.py`). This is a factual correction, since the script cannot be installed in a virtual project. I'll confirm the probe independently in API-06. It is a wording follow-up for the requirements doc, not a reroute.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required: `No`
