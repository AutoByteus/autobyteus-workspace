# API/E2E Execution Coverage Report — Agent Input Delivery Simplification

## Execution Round Meta

All paths are under `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-input-delivery-simplification/tickets/in-progress/agent-input-delivery-simplification/`. Evidence paths are relative to `api-e2e-evidence/` (retained locally, not committed).

- Requirements Doc: `requirements-doc.md` (SR-003 baseline, re-confirmed SR-005)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-004 + SR-005 V-1..V-4)
- Supplemental Task Artifacts: `probes/task-close-during-delivery.probe.ts`, `followup-cleanup-ticket-brief.md`, `handover.md`, `handoff-sr-005-rebootstrap.md`, `handoff-architecture-design-complete.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-001/002)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-003)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Coverage Investigation: `api-e2e-coverage-investigation.md`
- Test-Case Ledger: `api-e2e-test-case-ledger.md`
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Execution Round: 2 (CRR-003 TR-001 Local Fix, test code only)
- Trigger: round 1 on CRR-002 Pass (IR-003, HEAD `1f2758614`); round 2 on CRR-003 TR-001 (test-correctness fix) and N-1
- Prior Round Reviewed: None

## Routing Classification

- Task size: `Large`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review` (proportional test-code review)
- Proportional test-code review decision: `Required`

## Investigation And Execution Basis

- Investigation written before durable changes and final execution: `Yes`
- Plan followed: `Yes`. Deviations:
  - The `delegate_task` Team result shape on this base is `target_team_run_id`/`target_team_coordinator_agent_run_id`.
  - Two opt-in scripted-CLI options were added after diagnosis: an MCP client timeout above 60 s for the held call, and a tool-outcome log.
- Reroute required: `No`

## Test-Case Ledger Reconciliation

- Ledger initialized before execution and updated per case: `Yes`

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| R-01 tsc | Pass | `r01-tsc.log` |
| R-02 unit | Pass (3229/3230; 1 environmental, outside scope) | `r02-unit.log` |
| R-03 integration | Pass vs baseline (22 = base list, 0 new) | `r03-integration.log` |
| TDR-001 | Pass (Agent, Team, Org) | `tdr-run7/`, `tdr-run7.log` (round 2; round 1 `tdr-run6/`) |
| TDR-002 | Pass (Agent, Team, Org) | same |
| TDR-003 | Pass (Agent, Team, Org) | same |
| TDR-B (base) | Pass: discriminates (base shows the defect) | `tdr-base.log` |
| REG-E2E | Pass (13/14 in batch; `task-copy-idle-lifetime` timing flake passed alone) | `reg-e2e.log`, `idle-lifetime-rerun.log` |
| LIVE-RT | Pass (busy-member mid-turn delivery, Claude and Codex workers). Round-trip suites are pre-existing stale tests, identical on base | `live-rt.log`, `live-rt-base.log` |

## Compatibility / Legacy Scope Check

- Backward compatibility in scope: `No`
- Compatibility/legacy retention observed: `No`. The dead router and the dead reservation method are removed; no aliases.
- Persisted-data decision followed (`Not Affected`): `Yes`
- Compatibility-only durable coverage: `No`

## Changed Boundary And Evidence Matrix

| Case ID | REQ / AC | Boundary | Surface | Evidence Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| R-02 baseline contract | REQ-008/013, AC-007/013 (V-2/V-3) | Per-root bytes, codes, messages, event order vs base record | Unit, real coordinators | Durable | Pass 6/6 | `r02-unit.log` |
| R-02 roots/engine | REQ-012, AC-012 (V-4), CR-001 | Append protocol per root | Unit, real coordinators | Durable | Pass 21/21, 12/12 | `r02-unit.log` |
| TDR-001 | REQ-012, AC-012 | Closure after the durable write; real Task services, cross-root DONE, copy stop | Live API (scripted AGY), write held at the store | Durable | Pass ×3 roots | Delivery: `TaskDelegationError` `TASK_AGENT_RESOURCE_CLOSED`. Agent saw `MCP error -32603`. Record kept, recipient never processes it, no fail-stop |
| TDR-002 | REQ-012, AC-012, CR-001 | Closure while waiting for the lock; slot dropped by the forced release | Live API | Durable | Pass ×3 | Delivery: `TaskDelegationError` `TASK_AGENT_RESOURCE_CLOSED`. Message not written. Precondition proven: B's delivery started about 3.06 s before Task B closed. Blocking message: A lead → mate `accepted: true` with `target_agent_run_id` = A's mate (round 2 fix TR-001; round 1 had matched the Manager's wrapper call), delivered and answered |
| TDR-003 | REQ-012, REQ-008, AC-013 | Root keeps working; restore seeding from saved history | Live API + persisted reader | Durable | Pass ×3 | Later messages accepted. Restored snapshot equals the pre-stop history; messaging continues after restore |
| REG-E2E | AC-002, AC-004, AC-006, AC-007, AC-009, AC-010, AC-014 | Teammate delivery and handoffs per root, existing-copy assignment (AR2-NB-001), run-ID messaging, closure/reactivation, Org publication, compaction recovery | Live API (scripted AGY, fake Grok) | Durable (existing) | Pass | `reg-e2e.log` |
| LIVE-RT | AC-007, AC-014 | Real teammate delivery into a running turn (held slot) | Live API, real Claude/Codex | Durable (existing, gated) | Pass | `live-rt.log` |

## Additional Repository Coverage Execution

Commands run from the worktree root. Gated runs prefix `env -u AUTOBYTEUS_AGENT_PACKAGE_ROOTS -u AUTOBYTEUS_SKILLS_PATHS -u AUTOBYTEUS_APPLICATION_PACKAGE_ROOTS RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=$PWD/autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs`.

| Order | Command | Boundary | Result | Evidence |
| --- | --- | --- | --- | --- |
| E-01 | `pnpm -C autobyteus-server-ts exec vitest run tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts --no-watch` | TDR-001..003 | Pass 3/3 (round 1 `tdr-run6.log`; round 2 after TR-001/N-1 `tdr-run7.log`) | `tdr-run7.log` |
| E-02 | Same file on base `46e94fdea` (worktree `aids-api-e2e-base`) | Discrimination | Fails as expected | `tdr-base.log` |
| E-03 | Serial `--no-file-parallelism` set of 14 files (see ledger event 8) | AC-014 | 13/14; 1 timing flake | `reg-e2e.log` |
| E-04 | `task-copy-idle-lifetime.e2e.test.ts` alone | AC-014 | Pass | `idle-lifetime-rerun.log` |
| E-05 | `RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1 … vitest run tests/e2e/runtime/{claude,codex}-team-inter-agent-roundtrip.e2e.test.ts tests/e2e/runtime/team-busy-member-mid-turn-delivery.e2e.test.ts --no-file-parallelism` | AC-007 real runtimes | Mid-turn Pass (2/2); round trips fail at setup (stale) | `live-rt.log` |
| E-06 | Round trips on base | Baseline | Identical failures | `live-rt-base.log` |

## Validation Confidence Scorecard (Mandatory)

| Category | Post-Repository | Final | New / Final Evidence | Residual Uncertainty |
| --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 85% | 95% | AC-012 proven at the real server boundary in every root, in both windows; AC-007/009/014 regressions pass; V-2/V-3 contract | AC-001/008/011 are code/doc inspection (reviewer/delivery-owned) |
| Changed-boundary execution directness | 80% | 95% | Real MCP sender, root delivery, engine, coordinator lock, Task closure from another root, copy stop, restore | — |
| Cross-boundary integration realism and mock gap | 75% | 95% | Real Claude and Codex teammate delivery into running turns; scripted AGY only for multi-root determinism | — |
| Environment, configuration, identity, and fixture fidelity | 85% | 95% | Real definitions, Projects/Tasks, cross-root closure. The race window is opened at the store write: a delay only, with no behavior change | — |
| Failure, edge-case, lifecycle, and recovery evidence | 80% | 95% | Closure after durability; closure while waiting with the slot dropped; no fail-stop; stop/restore; idle lifetime, reactivation, closure suites | CAND-002 (publish throwing after durability) is not producible through real use; unit counterpart only |
| User-surface, browser, and desktop-shell confidence | 85% | 95% | Root view snapshot messages read live and after restore (what the Team tab renders). No frontend change; event payloads unchanged (V-3) | — |
| Durable regression coverage quality and relevance | 90% | 95% | New gated suite that discriminates on base, plus TESTING.md entry | — |

- Overall post-repository confidence: 83%
- Overall final confidence: **95%** (simple average)
- Every critical acceptance criterion directly proven: `Yes` (the inspection-only ACs AC-001/008/011 are owned by review and docs sync)
- Any final applicable category below 90%: `No`
- Default 95% target met: `Yes`

## Broader Validation Decision And Execution

- Decision: `Required` and executed. Live API and lifecycle through gated scripted-AGY server E2E, plus gated real-runtime suites.
- Setup:
  - The in-process Studio server per suite owns a disposable data dir.
  - The race window is opened by holding exactly one history write: the one whose newest message starts with the case marker, until the Task closure is observed in the Task's `agent_run_resources.json` (`closedAt`).
- Environment:
  - Host load average 25–60 (other worktrees' batches).
  - `AGY_FAKE_TOOL_TIMEOUT_MS=240000` for the held tool call (the MCP client default is 60 s).
  - `AGY_FAKE_TOOL_LOG` captures the agent-visible outcome.

| Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| Base `46e94fdea`, TDR-001 | Defect visible | Agent root: delivery throws a raw `Error: AgentRun input reservation '2' cannot be cancelled.` Team/Org: no outcome within 300 s; roots then unterminable ("run not found") | `tdr-base.log` | Discriminates |
| IR-003, TDR-001/002 | Task-closed outcome; no fail-stop | `TaskDelegationError` `TASK_AGENT_RESOURCE_CLOSED` about 50 ms after release; later writes succeed | `tdr-run6/` timeline | Pass |
| IR-003, restore | History read back | Snapshot after restore equals the pre-stop history | `tdr-run6/` | Pass |

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Decision: `Not Affected`
- Evidence:
  - V-2 (unit, rerun): byte-identical to base-recorded files and IDs.
  - TDR-003: each root's history, written by the new code (whose bytes V-2 proves equal to the base writer's output), restores through the changed restore seeding and reads back exactly.
- Version-specific branch or fallback observed: `No`

## Durable Coverage Changed In The Codebase

| Path | Change | Requirement / Boundary | Result |
| --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/teammate-delivery-task-closure-race.e2e.test.ts` | Added; round 2 updated | REQ-012/AC-012 (TDR-001), CR-001 (TDR-002), REQ-008/AC-013 restore (TDR-003); per root. Round 2: agent-visible outcomes matched exactly (tool `send_message_to`, exact `content`, intended target); TDR-002 asserts its precondition (B's delivery started before Task B closed) | Pass; fails on base |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Updated | Opt-in `AGY_FAKE_TOOL_TIMEOUT_MS` (MCP client timeout) and `AGY_FAKE_TOOL_LOG` (tool-call outcome log); defaults unchanged | Sibling suites pass |
| `TESTING.md` | Updated | Suite entry | Doc |

- Paths attached for proportional test-code review: `Yes`

## Temporary Execution Methods

| Method | Why | Cleanup |
| --- | --- | --- |
| `tmp-tdr-diag.e2e.test.ts` (generated copies with engine/router/gate instrumentation) | Diagnose the apparent hang. Result: no server hang; the engine throws promptly; the agent sees `MCP error -32603` | Deleted |
| Base worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/aids-api-e2e-base` | Discrimination and baseline comparisons | Removed after the round |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limitation |
| --- | --- | --- |
| AGY CLI/model (multi-root suites) | Repository scripted CLI | Real Claude/Codex exercised separately (LIVE-RT) |
| Storage latency | One history write held at the store (no behavior change) | Timing induced; the race itself is a supported real-use event |

## Observations (non-blocking)

1. **The agent cannot see why its message failed (pre-existing, outside this ticket).** A thrown delivery error such as the Task-closed `TaskDelegationError` reaches the sending agent only as `MCP error -32603: Internal error`, with no code or reason. Nothing reaches the operator UI either: no activity entry and no view frame.
   - This is the same outcome as a closure found just before the save today, so REQ-012's "same outcome" holds.
   - Separate-ticket candidate, owner Solution Designer: have the `send_message_to` MCP adapter return Task-closed as a structured not-accepted result. It is the same family as the earlier DTL-003 finding.
2. **Stale round-trip suites (pre-existing, rule 9).** `tests/e2e/runtime/{claude,codex}-team-inter-agent-roundtrip.e2e.test.ts` still send `refType` in Team definition nodes and build nested Teams, which flat Team definitions no longer accept. They fail identically on base, are gated (absent from the V-1 baseline list), and need an owner to re-scope them.
3. **Machine-dependent test (pre-existing).** `tests/unit/agent-execution/backends/antigravity/agy-configured-skill-linker.test.ts` reads the user's live `autobyteus-agents` checkout, where `design-examples.md` no longer exists, so it fails on this machine.
4. **Timing flake.** `task-copy-idle-lifetime.e2e.test.ts` is timing-sensitive under heavy host load: 58.96 s against a 59 s bound in the serial batch; it passed alone.

## Cleanup Performed

| Resource | Action | Result |
| --- | --- | --- |
| Suite servers, AGY/Claude/Codex processes, temp data | Suite `afterAll` | Receipts: `dataRemoved: true`, `serverClosed: true`, 0 leftover processes, `errors: []` |
| Temporary diagnostic test files | Deleted | Done |
| Base comparison worktree | `git worktree remove --force` | Done |

## Latest Authoritative Result

- Result: **`Pass`**
- Final confidence: 95%; target met; no category below 90%
- Broader validation: `Required` and executed
- Critical ACs lacking direct proof: none (AC-001/008/011 are inspection, review- and docs-owned)
- Test-review decision: proportional test-code review `Required` (Large/High)
- Notes for Delivery:
  - docs sync (REQ-011) to verify;
  - the observations above;
  - `pnpm -C autobyteus-server-ts typecheck` fails with TS6059 on base.
