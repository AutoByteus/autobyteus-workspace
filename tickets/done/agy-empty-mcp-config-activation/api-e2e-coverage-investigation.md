# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/requirements-doc.md`
- Investigation Notes: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/investigation-notes.md`
- Solution Revision Record: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/solution-revision-record.md` (SR-002)
- Design Spec: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/design-spec.md`
- Supplemental Task Artifacts: None
- Design Review Report: `N/A — not applicable`
- Architecture Review Revision Record: `N/A — not applicable`
- Implementation Handoff: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/implementation-handoff.md`
- Implementation Revision Record: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/implementation-revision-record.md` (IR-001)
- Code Review Report / Revision Record: `N/A — not applicable` (direct route)
- Delivery Revision Record: N/A
- API/E2E Revision Record: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config/tickets/in-progress/agy-empty-mcp-config-activation/api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- API/E2E Test-Case Ledger: Not used (see ledger plan)
- Current Investigation Round: 1
- Trigger: Implementation Complete from implementation_engineer (commit `9cbe6f3e0`)
- Prior Investigation Reviewed: N/A (none)
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: `Small`
- Architectural risk: `Low`
- Input route: `Direct Low-Risk`
- Successful-output route: `Delivery`
- Proportional test-code review decision: `Not Required — direct low-risk route`

## Current Requirement And Design Basis

REQ-001: empty/whitespace-only workspace or global AGY `mcp_config.json` means "no servers", and activation continues. REQ-002: missing file continues, and malformed non-empty JSON and `autobyteus_agent_tools` name collisions still fail. REQ-003: user config files are never modified. The design confines the fix to `checkCollision` in `agy-mcp-config-materializer.ts`, which is the single choke point for both create and restore. AC-005 (the user's real org via the UI) is assigned to delivery/user verification.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 empty/whitespace ⇒ no servers | Changed | REQ-001, design Intended Change | Unit cases (workspace/global/whitespace, create+restore) plus a live AGY backend activation with the real 0-byte global file |
| BEH-002 ENOENT ⇒ continue | Preserved | REQ-002 | Implicit in every unit test (isolated home has no global file) |
| BEH-003 name collision ⇒ fail | Preserved | REQ-002, AC-004 | Existing workspace test plus new global test |
| BEH-004 malformed non-empty ⇒ fail | Preserved | REQ-002, AC-003 | New unit test |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | `checkCollision` parsing rule | `agy-run-capsule.test.ts` (real fs, isolated home) | Whether a real `agy` process then starts successfully with the 0-byte global file after the guard passes | Live AGY backend activation |
| API / transport / contract | No | — | — | — | — |
| Frontend component / state | No | — | — | — | — |
| Browser integration / user journey | No (indirect) | Only the error surface changes; no UI code changed | — | UI path is AC-005 (delivery/user) | None |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | No | — | — | — | — |
| Desktop shell / Electron-specific | No | — | — | — | — |
| Process / lifecycle | Yes (indirect) | AGY run activation (create/restore) | Unit restore case | Real `agy` subprocess start and MCP use | Live AGY backend (`AgyAgentRunBackendFactory`) |
| Persisted-data transition | No | Not Affected | — | — | — |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | Yes (indirect) | `agy` 1.2.11 CLI reading the same 0-byte global config | None in unit suite | Real `agy` behavior with an empty global config | Live AGY (`AGY_LIVE=1`) |

## Project Execution Discovery

- Assigned worktree: `/Users/normy/autobyteus-org/autobyteus-workspace-agy-empty-mcp-config`, branch `codex/agy-empty-mcp-config-activation` @ `9cbe6f3e0`
- Stack: Node/TypeScript server (`autobyteus-server-ts`), vitest 4.0.18, Prisma 5 (SQLite test DB `tests/.tmp`), `agy` 1.2.11 at `~/.local/bin/agy`
- Conflicting or unclear instructions: The live suites write reports to `tickets/in-progress/antigravity-cli-runtime-redesign-20260924/`, which no longer exists. A temporary probe copy redirected the report path.
- Required secrets: `agy` local auth already present on the machine (no values recorded)

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `autobyteus-server-ts/AGENTS.md` | Test instructions | `pnpm -C autobyteus-server-ts exec vitest run <file> --no-watch`. Used `npx vitest run … --no-watch` because `pnpm` is not on PATH (same binary). |
| `autobyteus-server-ts/package.json` | `prebuild` runs `prisma generate` | Ran `npx prisma generate --schema ./prisma/schema.prisma` so the live team suite can import |
| `tests/unit/agent-execution/backends/antigravity/agy-*-live.test.ts` | Live AGY suites gated by `AGY_LIVE=1` | Real `AgyAgentRunBackendFactory` + real agent-tools MCP host + real `agy` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Agent-tools MCP host (in-test) | `autobyteus-server-ts` | Started by test (`host.listen()`) | Ephemeral port | Test proceeds after listen | `host.close()` in `finally` |
| `agy` subprocess | same | Spawned by backend | model `gemini-3.8-flash-low` | `createBackend` resolves | `backend.terminate()`; `pgrep agy` afterwards is empty |

| Data / Fixture / Identity Need | Mechanism | Safety Notes | Cleanup |
| --- | --- | --- | --- |
| 0-byte global `~/.gemini/config/mcp_config.json` | Pre-existing on this machine (AGY-created Aug 8, same as the user's condition) | Read-only. Size and mtime checked before and after (0 bytes, mtime `1786212421` unchanged) | Left as is (REQ-003) |
| Temp workspace/memory dirs | `fs.mkdtemp` in tests | Isolated under `$TMPDIR` | Removed after the run |

## Persisted Data Transition Coverage Basis

- Approved decision: `Not Affected`. No evidence is planned.

## Existing Durable Coverage Inventory

| Path / Scenario | Current Assertion Or Intent | Related Req/AC | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `agy-run-capsule.test.ts` › empty workspace MCP config | Creation succeeds, capsule has agent-tools, user file stays `""` | AC-001, REQ-003 | Still Valid | Passes. Fails on base source | Keep |
| › empty global config (create + restore) | Same on the global path, both entry points | AC-001, REQ-003 | Still Valid | Same | Keep |
| › whitespace-only | Succeeds, file unchanged | AC-002 | Still Valid | Same | Keep |
| › malformed non-empty | Rejects with "Cannot inspect AGY MCP collision" | AC-003 | Still Valid | Passes on fix and base | Keep |
| › global name collision / workspace name collision | `AGY_MCP_NAME_COLLISION`, file unchanged | AC-004 | Still Valid | Passes | Keep |
| Other capsule tests (snapshot, skills, isolation) | Unrelated capsule behavior | Out Of Scope | Still Valid | Pass | Keep |
| `agy-mcp-team-live.test.ts` | Real AGY team/org member activation with descriptor and MCP `send_message_to` | AC-001 / AC-005-equivalent backend path | Still Valid (report path points to an absent dir; environment-gated) | Used via temporary copy | Keep (not modified: report-path issue is pre-existing and out of scope) |
| `agy-stream-event-converter.test.ts` | Fixtures from another ticket | Out Of Scope | Out Of Scope (pre-existing 8 failures, missing fixtures) | Fails identically on base per implementation handoff | None; noted for delivery |

## Stale Or Obsolete Coverage Decisions

None.

## Durable Coverage To Add / Update / Remove

None beyond what the implementation added. Its 5 new cases and home isolation cover AC-001..AC-004 at the correct boundary.

## Repository Coverage Execution Plan And Results

| Order | Command | Working Directory / Configuration | Boundary Or Scenario Proven | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `npx vitest run tests/unit/agent-execution/backends/antigravity/agy-run-capsule.test.ts --no-watch` | `autobyteus-server-ts` | AC-001..AC-004 | Pass (10/10) | console |
| 2 | Same with `agy-mcp-config-materializer.ts` temporarily reverted to `a2694ed45` | same | Tests detect the defect | 3 fail (empty workspace, empty global, whitespace), 7 pass. Source restored, `git diff` clean | console |
| 3 | `npx vitest run tests/unit/agent-execution/backends/antigravity/ --no-watch` (after `prisma generate`) | same | Regression across the AGY backend unit dir | 23 pass, 6 skipped (live), 8 fail only in `agy-stream-event-converter.test.ts` (pre-existing missing fixtures) | console |

## Test-Case Ledger Plan

- Ledger required: `No`. There were 4 short cases, all completed within one uninterrupted session (the longest was about 90 s). Evidence was captured to log/JSON files immediately.

## Post-Repository Confidence Scorecard

| Category | Score | Supports | Remaining Uncertainty | Improvement |
| --- | --- | --- | --- | --- |
| Requirement/AC proof | 90% | AC-001..004 direct unit proof | AC-005-equivalent real activation unproven | Live AGY activation |
| Changed-boundary directness | 95% | Real fs against the real function via the public capsule API | — | — |
| Integration realism / mock gap | 75% | Real fs | `agy` itself and the backend factory are not exercised | Live AGY backend |
| Env/config/fixture fidelity | 90% | Isolated home | Real global 0-byte file not exercised | Live on this machine |
| Failure/edge/lifecycle | 95% | Malformed, collision, whitespace, restore | — | — |
| User-surface/browser/desktop | N/A | No UI code changed. The user-facing path is AC-005 (delivery/user) | — | — |
| Durable regression quality | 95% | Negative check proves detection | — | — |

- Overall post-repository confidence: 90% (simple average of applicable categories)
- Critical ACs directly proven: AC-001..AC-004 yes. The backend-level equivalent of AC-005 is not yet proven.
- Categories below 90%: integration realism (75%)
- 95% target met: No

## Broader Validation Decision

- Decision: `Required`
- Mode: `Live API/Lifecycle`, meaning the real `AgyAgentRunBackendFactory.createBackend` with an agent-tools MCP descriptor (team and org member), a real `agy` 1.2.11 and the machine's real 0-byte `~/.gemini/config/mcp_config.json`
- Gap addressed: whether activation actually succeeds end-to-end after the guard passes (the design-spec escalation trigger), and reproduction of the user's exact error on base
- Expected confidence afterwards: ≥95%
- Browser decision: Not required. The change is backend-local and no UI code changed. The UI would only show a generic error or success, and the backend factory is the same path the UI triggers.

## Live Environment And Fixture Plan

- Setup: `npx prisma generate`. Create a temporary copy of `agy-mcp-team-live.test.ts` with its report path redirected into this ticket folder, plus a probe that the real global file is 0 bytes after the runs.
- Run: `AGY_LIVE=1 npx vitest run <probe> --no-watch` with the fix, then the team case with the source reverted to base.
- Evidence: vitest logs, per-kind JSON reports (deliveries, events), and size/mtime of the global file.
- Cleanup: delete the probe file, restore the source (`git diff` clean), remove temp dirs, confirm no `agy` processes remain.

## Temporary Executable Validation Plan

| Scenario ID | Probe | Behavior Proven | Why Not Durable |
| --- | --- | --- | --- |
| API-E2E-LIVE-01/02 | `zz-tmp-agy-empty-global-mcp-probe.test.ts` (copy of the team-live suite) | Real team/org AGY activation and MCP call with the 0-byte global config | Depends on the developer machine's real global file and agy auth. The durable live suite already exists. |
| API-E2E-LIVE-03 | Same probe against reverted base source | Reproduces the user's exact error | One-time reproduction |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Follow-Up |
| --- | --- | --- | --- |
| AC-005 through the user's real org UI/app | Assigned to delivery/user verification; needs a built app | Low (same backend factory path proven live) | Delivery/user verification |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed to execution: Yes
- Durable coverage added/updated/removed by API/E2E: No (implementation-added coverage validated)
- Post-repository confidence: 90%
- Broader validation: Required (Live AGY backend). Executed; see execution report.
- Reroute required: No
