# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results go in `api-e2e-execution-coverage-report.md`.

Paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result/tickets/in-progress/agent-tools-mcp-tool-error-result/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-001, Ready; `Small` + `Low`)
- Supplemental Task Artifacts: `evidence/repro-agy-revoked-mcp-tool.e2e.test.ts`, `evidence/SD-01-repro-base.log`, `evidence/SD-02-control-iserror-result.log`
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report / Revision Record: `N/A — not applicable` (direct low-risk route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: implementation complete (IR-001), direct API/E2E route
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

- REQ-001 / AC-003: a configured MCP tool call through the Agent Tools MCP endpoint that fails (throws, or the tool is gone at call time) is answered with a JSON-RPC success carrying an `isError` tool result with the failure message.
- REQ-002 / QR-001: the text carries no token, header value or secret-bearing URL; it is the native runtime's message.
- REQ-003 / AC-001: the revoked-token e2e on scripted AGY: turn completes (no `ERROR`), the tool result has `HTTP 401 Unauthorized: Error POSTing to endpoint: unauthorized`, no token value on the wire.
- AC-002: the same on live Codex and Claude (gates `RUN_CODEX_E2E`, `RUN_CLAUDE_E2E`); a gate that cannot run is recorded as not run.
- AC-004: Agent Tools units, other providers, the native revoked case (when its gate runs) unchanged.
- Design escalation trigger: a live runtime mishandling `isError`, or a credential in the text → `Design Impact`.
- Implementation (code `253854bf8d`, head `1cd540bae5`, ticket files only after): `ConfiguredMcpRegistryToolAdapter.execute` returns `toolFailure(message)` for the unavailable case and for a thrown call. The dispatcher and the native path are untouched.
- Legacy / Compatibility Removal Check: clean (the throw replaced, unused binding removed). Persisted Data: `Not Affected`. Both match the diff. Observation (cosmetic, non-blocking): `export const resolveExecutionAgentId =(session…` is missing a space after `=`; the server has no lint/format script that would fail on it.

## Supported Scenarios And Real Usage

- SCN-001: an agent on AGY/Codex/Claude calls a configured MCP tool whose server has revoked the token; it reads why. Real trigger: the user's message asking the agent to use the tool; the remote server refusing at `initialize`.
- Real-use scenarios added: none beyond SCN-001. The "tool gone at call time" race (DEC-003) is unit-only: the catalog filters unavailable adapters before `execute`, so reaching it end to end needs a configuration change landing between `tools/list` and `tools/call` within one turn, which real use does not produce on purpose.
- Contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 failed configured call → `isError` result | Changed | handoff trace | AGY e2e (rerun clean), Codex/Claude live, unit |
| BEH-002 native path | Preserved | not touched | native revoked + credential cases under `RUN_LMSTUDIO_E2E` |
| BEH-003 no credentials in text | Preserved | e2e `not.toContain(DUMMY)` | every runtime case |
| Protocol errors keep JSON-RPC answers | Preserved | IMP-03 | reused |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | adapter `execute` | IMP-02 unit | — | — |
| API / transport / contract | Yes | MCP `tools/call` result over the Agent Tools MCP endpoint | IMP-01 (scripted AGY), IMP-03 | live clients' handling of `isError` (U-01) | Gated live runtime suites |
| Frontend / browser / desktop | No | — | — | — | — |
| Authentication / session / permissions | Yes (credential-free text) | message content | e2e asserts | — | same e2e on every runtime |
| Process / lifecycle | Yes | the turn continues after the failed call | AGY e2e | live runtimes | live suites |
| External integration | Yes | Codex app-server, Claude Agent SDK as MCP clients | none | U-01 | live suites |
| Persisted data, workers | No | — | — | — | — |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result`, branch `fix/agent-tools-mcp-tool-error-result` @ `1cd540bae5`
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-tools-mcp-tool-error-result/TESTING.md`
- Discrepancy: IMP-01's recorded command has no clean environment; this shell carries the live app's `AUTOBYTEUS_*` roots and provider keys. TESTING.md: E2E folders inherit the shell, run them clean. API-05 reruns the AGY cases clean.
- Secrets: no API keys. Codex and Claude use the user's signed-in CLIs (subscription use, a few short turns, required by REQ-003/AC-002).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global strategy | Gated live suites; clean env (`env -i`); signed-in `codex`/`claude` need the real `HOME` and `USER`/`LOGNAME`; never edit `~/.codex`: give Codex a throwaway `CODEX_HOME` with a `config.toml` and a symlink to `auth.json`; local models one at a time, small model (`qwen/qwen3.6-35b-a3b`), unload what the run loaded |
| `autobyteus-server-ts/tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` header | Gates and command | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/tests/fixtures/agy-failure-cli.mjs`, `RUN_LMSTUDIO_E2E=1`, `RUN_CODEX_E2E=1`, `RUN_CLAUDE_E2E=1`; `MCP_AUTH_E2E_EVIDENCE_DIR=<dir>` writes value-free summaries |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Studio server + two auth MCP servers | worktree root | started by the test | test-owned data dir | test | test teardown |
| Codex CLI | — | throwaway `CODEX_HOME` (empty `config.toml`, `auth.json` symlink) | the user's `~/.codex/config.toml` defines MCP servers; not used | test | remove the temp folder |
| Claude CLI | — | real `HOME`, `USER`, `LOGNAME` | the user's Claude login | test | none |
| LM Studio | — | already running on 127.0.0.1:1234, `qwen/qwen3.6-35b-a3b` listed | shared local compute, one suite at a time | test | unload only a model this run loaded |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| MCP servers with dummy credentials | `tests/e2e/helpers/auth-required-mcp-server.ts` | dummy value `test-dummy` only | test teardown |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/agent-tools/mcp/configured-mcp/configured-mcp-registry-tool-adapter.test.ts` (new) | throw → `isError` message; non-Error → text; gone → "no longer available"; normal and `isError` results unchanged | AC-003 | Still Valid | IMP-02 | Keep |
| `tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts` (updated) | per runtime: credential case; revoked case (status text, no dummy, no marker; external runtimes: no `ERROR`, `TURN_COMPLETED`) | AC-001, AC-002, AC-004, QR-001 | Still Valid. The header's removed sentence asserted the old `Internal error` behavior, now obsolete by REQ-001 | IMP-00, IMP-01 | Keep; run all gates |
| `tests/integration/agent-tools/mcp/agent-tools-mcp-routes.integration.test.ts` | protocol answers, unavailable/unconfigured | AC-004 | Still Valid | IMP-03 | Keep |
| other `tests/unit/agent-tools` | other providers | AC-004 | Still Valid | IMP-02 | Keep |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 (discrimination) | AGY → endpoint → adapter, base vs fix | Reused | IMP-00 | Base adapter fails, fix passes; code unchanged since |
| API-02 | AC-003, AC-004 | adapter units, all Agent Tools units | Reused | IMP-02 | Ran on `253854bf8d`; only ticket files changed since; `Tests  372 passed (372)` |
| API-03 | AC-004 | MCP routes integration | Reused | IMP-03 | same; clean env recorded; `Tests  10 passed (10)` |
| API-04 | AC-004 | server typecheck | Reused | IMP-04 | same; `exit=0` |
| API-05 | AC-001, AC-002, AC-004, QR-001 | real studio server, Agent Tools MCP endpoint, scripted AGY, native LM Studio, live Codex App Server, live Claude Agent SDK | Existing Test (gated) | `env -i PATH="$PATH" HOME="$HOME" USER="$USER" LOGNAME="$LOGNAME" TMPDIR="$TMPDIR" CODEX_HOME=<temp> RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<abs>/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs RUN_LMSTUDIO_E2E=1 LMSTUDIO_TARGET_TEXT_MODEL=qwen3.6-35b-a3b RUN_CODEX_E2E=1 RUN_CLAUDE_E2E=1 MCP_AUTH_E2E_EVIDENCE_DIR=<dir> pnpm -C autobyteus-server-ts exec vitest run tests/e2e/runtime/mcp-http-auth-agent-tool-call.e2e.test.ts --no-watch --reporter=verbose` | All 8 cases in one clean run: AC-002 needs the live clients; AGY rerun clean (IMP-01 inherited the shell); native optional for AC-004 and available |

- Test progress log needed: `Yes` (one long case with live runtimes)

## Durable Coverage To Add / Update / Remove

None (the implementation's coverage is kept as is).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| "Tool gone at call time" end to end | Not producible by real use on purpose (see above); unit-proven | Low | No | None |
| R-01 remote server body text | Out of scope (requirements) | Accepted | No | None |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| None | — | — | — |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `No`
- Reroute Required Before Validation Execution: `No`
- Notes: a live runtime ending the turn in `ERROR` or not delivering the status text → `Design Impact` (design escalation trigger), after finding its cause.
