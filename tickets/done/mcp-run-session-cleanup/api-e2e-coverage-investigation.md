# API/E2E Coverage Investigation — mcp-run-session-cleanup

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001; Small / Low)
- Design Review Report / Architecture Review Revision Record: `N/A — not applicable` (direct route)
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (direct route)
- Latest Authoritative Investigation: this file

All paths are relative to the ticket folder in `/Users/normy/autobyteus_org/autobyteus-worktrees/mcp-run-session-cleanup` (branch `codex/mcp-run-session-cleanup`). Fix commit `a8b849af79`. `git diff --name-only a8b849af79 HEAD` outside `tickets/` is empty.

## Current Requirement And Design Basis

- REQ-001: when a run is released (every end path), all its MCP server instances close: stdio children exit and HTTP sessions end. This holds on native, Claude, Codex, AGY and Grok (AC-001…AC-004, AC-008).
- REQ-002: the close never delays or fails `release()`; close errors are logged with the run id and server id (AC-007).
- REQ-003: a run woken right after release gets new working instances (AC-005).
- REQ-004: other runs and the gateway's shared instances are untouched (AC-006).
- REQ-005: tests use the autobyteus-189 real test server (pid file), plus one isolated-app check with a copied user-kind `uv` server.
- QR-001: no stdio child of an ended run is alive 10 s after release.
- Design: hook in `AgentRunResourceManager.release()` (DEC-001), not awaited (DEC-002). Detach-before-close in `McpServerInstanceManager` (DEC-003). Gateway untouched (DEC-004). Native shutdown cleanup kept (DEC-005).

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001 (stop/terminate, idle shutdown of a delegated copy, delete, replacement), SCN-002 (wake), SCN-003 (parallel runs).
- Added:
  - SCN-A1 — the packaged desktop app: the user's real setting. Server code imports `McpServerInstanceManager` by a different module path (`autobyteus-ts/tools/mcp/server-instance-manager.js`) than the tool path uses internally. In-process tests resolve `autobyteus-ts` from source, so only a built or packaged run proves both reach the same singleton and that real child processes end.
  - SCN-A2 — a wake after release in the packaged app: a new process, then a second termination ends it too.
  - SCN-A3 — `uv`-launched servers: `uv` plus a `python` child. Both levels must exit, not just the direct child.
- Contrived: none.

Baseline evidence of the bug in a real app: the 181 parity round (`mcp-sdk-1-32-upgrade`, API-13). On both SDK versions, four VideoAudioServer `uv`/`python` pairs stayed alive after their runs were terminated, until the app stopped.

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Repository Evidence | Not Exercised By It | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `release()` hook, instance-manager detach and close | IMP-01, IMP-05 (unit) | — | — |
| Process / lifecycle | Yes | run end → child process exit | IMP-07 (in-process, AGY scripted, Node fixture) | live runtimes; packaged build; `uv` two-level process trees | runtime suites; isolated desktop instance |
| External integration (runtimes) | Yes | instance keys per runtime (`runId`) | IMP-08 (AGY) | native (own shutdown step plus release), Claude, Codex, Grok | gated matrix cells |
| API / transport | No change | gateway shared scope | IMP-07 pair case | — | — |
| Desktop shell | Indirect | packaged server's module graph | none | singleton identity in a build | isolated instance |
| Others | No | — | — | — | — |

## Project Execution Discovery

- Testing guideline: `TESTING.md` (root). Includes the "Core library MCP integration" row (autobyteus-189).
- Constraints:
  - a clean env for e2e;
  - signed-in CLIs need the real HOME, and `CODEX_HOME` throwaway for the isolated app;
  - one local-model run at a time;
  - never the user's app, data or MCP folders;
  - serialize builds and dev servers in one worktree, so in-process runs come before the full-e2e build and the Electron build.
- Secrets: none; dummy values only. Codex: the account's model usage was limited until 25 Oct as of earlier today. The Codex MCP-client cell (no model turn) is used, with the live turn attempted only if available.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-run-session-cleanup.e2e.test.ts` (new) | 5 end paths, AGY scripted | AC-002, AC-004…AC-006 | Under validation; red on base (IMP-00) | Rerun independently |
| `…/mcp-runtime-tool-matrix.e2e.test.ts` (extended) | per-runtime pid gone after termination | AC-003 | Under validation | Run live cells |
| `autobyteus-server-ts/tests/unit/agent-execution/agent-run-resource-manager.test.ts`, `autobyteus-ts/tests/unit/tools/mcp/server-instance-manager.test.ts` | AC-001, AC-007, AC-005 (core) | — | Still Valid (IMP-01, IMP-05) | Reuse |
| integration suites and the 179 auth e2e | preserved | — | Still Valid (IMP-02, IMP-06, IMP-09) | Reuse; both 179 files also run in the full e2e |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R01 | AC-001, AC-007, AC-005 (core), preserved | unit, integration, typecheck, 179 e2e | Reused | IMP-01, IMP-02, IMP-04, IMP-05, IMP-06, IMP-09 | same code since `a8b849af79` |
| API-01 | AC-002, AC-004, AC-005, AC-006, QR-001 | new cleanup e2e (AGY scripted) | Existing Test | rerun in a clean env | independent confirmation of the red→green behavior |
| API-02 | AC-003 | matrix suite: native (LM Studio), Claude, Grok, Codex MCP client, AGY scripted; Codex live only if the account allows | Existing Test | gates per runtime, `MCP_MATRIX_E2E_EVIDENCE_DIR` | each runtime's pid gone after termination |
| API-03 | AC-008 preserved, regression | full server e2e | Existing Test | `pnpm -C autobyteus-server-ts build`; `pnpm test:e2e` | shared release path changed |
| API-04 | AC-008, SCN-A1…A3 | isolated desktop instance of this worktree; restored user-kind `uv` server (`video-audio-mcp` from `a947f1a^`, read-only `get_media_duration`); runs on two runtimes (native via LM Studio, Claude); process tree counts | Journey (temporary harness) | `isolated-app start --build` (throwaway `CODEX_HOME`); baseline descendant count; two runs call the tool; count; terminate both; count back to the baseline within 10 s; wake one run, call again (new pid), terminate; stop the app; `ps` | the user's real setting; packaged module graph |
| API-05 | REQ-005, safety, dummy values | repo state, user folders, scan | Temporary Probe | ignored-set diff, `git status` of user repos, `ps`, grep | — |

- Test progress log: `Yes`
- Durable coverage: none planned by API/E2E. The ticket's own tests are under validation; the AC-008 harness is a one-off desktop check (source kept in the evidence).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-Only? | Follow-Up |
| --- | --- | --- | --- | --- |
| Team/org root termination releasing member runs | The same `release()` path, through `agent-run-activation-registry` (handoff); the delegated-copy idle shutdown exercises a non-standalone removal | Low | No | Optional later |
| Codex model turn | account usage limit (if still in force) | Low; the Codex MCP-client cell covers instance creation under the run id | No | after the limit resets |

## Ambiguities Or Reroute Triggers

None at planning. The activation-failure path that skips `release()` (handoff observation) creates no run, so the requirements don't cover it (no run is "released"). It stays recorded.

## Investigation Decision

- Proceed: `Yes`. Durable coverage changes by API/E2E: `No`. Reroute: `No`.
