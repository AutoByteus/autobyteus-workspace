# API/E2E Execution Coverage Report

## Execution Round Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/temp-task-tool-split-proposal.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/architecture-review-revision-record.md
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/implementation-revision-record.md
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/code-review-report.md
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/code-review-revision-record.md
- Delivery Revision Record: N/A
- Coverage Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-coverage-investigation.md
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-test-case-ledger.md
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-001
- Current Execution Round: 1
- Trigger: code review CRR-001 pass
- Prior Round Reviewed: N/A
- Latest Authoritative Round: 1

## Routing Classification

- Task size: Medium
- Architectural risk: High
- Input route: Reviewed
- Successful-output route: Code Review
- Proportional test-code review decision: Required (two changed durable test files, below)

## Investigation And Execution Basis

- Coverage investigation artifact: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-coverage-investigation.md
- Investigation completed before durable coverage changes or final execution: No. I ran the code reviewer's list first and wrote the investigation after. The decisions in it were reconciled with what ran; the web UI probes were re-classified as out of scope for acceptance (see investigation).
- Plan followed: see above; deviation is process only.
- Existing coverage decisions revised during execution: added COL-001 and OLD-001 after reading the handoff hint and the HTTP e2e.
- Reroute required: No.

## Test-Case Ledger Reconciliation

- Ledger path: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-test-case-ledger.md
- Initialized before execution: No (written retrospectively from the logs; every result below comes from a saved log)
- Reconciled into this report: Yes
- Cases not started or interrupted: none; one probe command (alt pair2 base run) was killed by a background time limit and is excluded.

| Case ID | Final Result | Evidence |
| --- | --- | --- |
| see ledger | see ledger | evidence/ |

## Compatibility / Legacy Scope Check

- Requirements/design introduce backward compatibility: No
- Compatibility-only behaviour in implementation: No (the previous-release `@` note sentence is a parse-only recognizer required by AC-008 and never composed)
- Persisted-data decision (Not Affected) followed: Yes
- Durable coverage for compatibility-only behaviour: No (the old-name tests assert the name is rejected/ignored, not supported)
- Reroute classification: n/a

## Acceptance-Criteria Proof

- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/evidence/

| AC | Critical | Proven By | Evidence Files | Result |
| --- | --- | --- | --- | --- |
| AC-001 team member without task tools: task_id, no task tool, no closing text | Yes | UNIT-PARITY, UNIT-ALL, E2E-AGY, LIVE-CLAUDE, LIVE-CODEX | server-unit-full.log; server-e2e-projects-agy-scripted.log (ad-hoc-task-delegation); probes/cross-scope-claude.log, cross-scope-codex.log (A01, T01, O01) | Proven |
| AC-002 agent with `update_task` closes returned task_id; copy stops and hides | Yes | E2E-AGY (task-closure-root-visibility, task-reactivation), LIVE-CLAUDE A02/T03/O03, LIVE-CODEX A02/T03/O03 | server-e2e-projects-agy-scripted.log; probes/cross-scope-*.log | Proven |
| AC-003 PTM create/update/close/reopen same results; old name absent | Yes | E2E-HTTP (project-task-boundaries, CLS-API-001), NATIVE-DIRECT, E2E-AGY (context files, assignment) | server-e2e-project-task-boundaries-final.log; native-tool-direct-probe.log | Proven |
| AC-004 closed-copy error names no tool | Yes | UNIT-ALL (reactivation), E2E-AGY (task-reactivation-root-visibility) | server-unit-full.log; server-e2e-projects-agy-scripted.log | Proven |
| AC-005 `@` note has no closing sentence | Yes | PRES-CONTRACTS, LIVE-CLAUDE/CODEX A01 stored note | presentation-contracts-test.log; probes/cross-scope-*.log | Proven |
| AC-006 identical exposure and texts on Codex, Claude, AutoByteus | Yes | UNIT-PARITY, LIVE-CLAUDE, LIVE-CODEX, E2E-AGY | server-unit-full.log; probes | Proven. AutoByteus-native is proven at unit level only (no live AutoByteus-runtime run) |
| AC-007 configuration naming old tool: no tool, no launch error | Yes | UNIT-PARITY, OLD-001 (HTTP e2e) | server-e2e-project-task-boundaries-final.log | Proven at session level; no real agent was launched with the old name |
| AC-008 previous-release notes still parse | Yes | PRES-CONTRACTS (20/20) | presentation-contracts-test.log | Proven |

## Changed Boundary And Evidence Matrix

| Case ID | IDs | Boundary | Surface | Type | Result | Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| UNIT-ALL | all | contract, exposure, texts | server `test:unit` 694 files / 5517 tests | Durable | Pass | server-unit-full.log |
| UNIT-PARITY | AC-001/006/007 | exposure across runtimes | vitest | Durable | Pass (in UNIT-ALL; focused rerun 168 files / 1711 tests) | unit-agent-tools-execution-final.log |
| COL-001 | handoff hint | third-party MCP collision | catalog unit | Durable (new) | Pass | unit-mcp-catalog-collision.log |
| E2E-HTTP / OLD-001 | AC-003/007 | real HTTP MCP, native vs MCP errors, old name | server e2e | Durable (updated) | Pass 11/11 | server-e2e-project-task-boundaries-final.log |
| E2E-UNGATED | preserved | graphql, startup-migration (dist), node-locality (dist) | server e2e | Durable | Pass 4 files / 27 tests | server-e2e-projects-ungated.log |
| E2E-AGY | AC-001..004 | scoped MCP, closure, reopen, assignment, context files | scripted AGY CLI | Durable | 66 pass / 1 fail (idle-lifetime, see Failures) | server-e2e-projects-agy-scripted.log |
| PRES-CONTRACTS | AC-005/008 | note composer and parser | node test | Durable | Pass 20/20 | presentation-contracts-test.log |
| LIVE-CLAUDE | AC-001/002/005/006 | real Claude Agent SDK agents through the probe (browser only drives messages) | live | Live | Pass 19, N/A 2 | probes/cross-scope-claude.log, probes/cross-scope-claude/*.json |
| LIVE-CODEX | same | real Codex app-server agents | live | Live | Pass 19, N/A 2 | probes/cross-scope-codex.log |
| NATIVE-DIRECT | AC-003 | native registry on built dist: registered names, old name absent, create, DONE, missing-argument errors | temp script | Temporary | Pass | native-tool-direct-probe.log, native-tool-probe.mjs |
| LIVE-AGY-L | host-crash (not an AC) | real AGY CLI | live | Live | Blocked: provider quota | probes/cross-scope-agy-L.log |
| WEB-INFO-1..4 | none | Projects UI pages and trees | browser probes | informational, out of scope | see Failures | probes/*.log |
| INTEG | regression | server integration | vitest | Durable | 2 fail = documented baseline exception | server-integration-full.log |
| TYPECHECK | regression | production src | tsc | Durable | Pass | server-typecheck.log |

## Additional Repository Coverage Execution

None beyond the investigation table.

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Change | New / Final Support | Residual |
| --- | --- | --- | --- | --- | --- |
| Requirement and AC proof | 95% | 96% | +1 | every AC has a direct case; two ACs are proven at session, not real-launch, level | AC-007 and AutoByteus-native are not live |
| Changed-boundary directness | 95% | 96% | +1 | HTTP MCP, native registry and real agents all call the new tools | none material |
| Integration realism / mock gap | 90% | 96% | +6 | real Claude and Codex agents, scripted AGY, real HTTP MCP; no mock stands between agent and tool | AutoByteus-native runtime not live |
| Environment / fixture fidelity | 90% | 91% | +1 | clean env, own data roots, base worktree comparison | host load; AGY quota exhausted |
| Failure / edge / lifecycle | 92% | 92% | 0 | closure, reopen, restart (A05), invalid input, old name | real-AGY host crash blocked; idle-lifetime test intermittent |
| User-surface | 90% | 93% | +3 | `@` note stored text seen by real agents; chip shown in UI during probe | no UI change by design |
| Durable regression quality | 94% | 94% | 0 | new COL-001, updated OLD-001, parity test | OBS-002 weak assertion (not blocking) |

- Overall post-repository confidence: 92%
- Overall final confidence: 94% (simple average of 96, 96, 96, 91, 92, 93, 94 = 94.0)
- Confidence change produced by broader validation: +2
- Every critical AC directly proven apart from user-only parts: Yes
- Any final category below 90%: No
- Default 95% target met: **No (94%)**
- Confidence-limiting residual risks: (1) `task-copy-idle-lifetime` failed in 4 of 10 branch runs and 2 of 11 base runs; same "model discovery timed out" signature on both trees for 2 of the 4 branch failures, the other two were a 1 s timing tolerance (58980 < 59000) and a worker-idle timeout; I found no mechanism in the change but cannot prove the rates equal. (2) real-AGY host-crash lifecycle unrun (quota). (3) AC-007 not proven with a real agent launch.

## Broader Validation Decision And Execution

- Decision: Required; mode Live API (real Claude and Codex through the `cross-scope-agent-mentions` probe) plus direct native registry check.
- Deviation: I also ran four UI probe suites because the code reviewer listed them as edited. They are not acceptance evidence for this ticket (web has no source change); see Failures.
- Gap addressed: real agents receive only configured tools and no text names a task tool; real `update_task` closes a delegated Task.
- Startup/commands: `pnpm -C autobyteus-web test:e2e:cross-scope-agent-mentions --runtime claude_agent_sdk|codex_app_server --output-dir <evidence>`; the probe builds its own temp data root, backend and Nuxt, and cleans in finally.
- Environment: sanitized by the probe; models Claude `haiku`, Codex default; no user app or `~/.autobyteus` touched.

| Step | Expected | Actual | Evidence | Result |
| --- | --- | --- | --- | --- |
| A01 `@` mention send, host delegates | stored note without closing text, delegation returns task_id, ad-hoc Task created | as expected on both runtimes | probes/cross-scope-*.log | Pass |
| A02 user says work is finished | host (only `update_task` selected) closes by task_id; copy closes and row leaves | as expected | same | Pass |
| A03/A05 stop, reopen, backend restart | closed copies stay hidden | as expected | same | Pass |
| T01..T03, O01..O03 Team and Org roots | same | as expected | same | Pass |

## Platform / Runtime Targets

- macOS (Darwin 25.5.0), node via pnpm, Chrome headless for the probe driver, Claude Code 2.1.300, Codex CLI, agy 1.3.5 (scripted fixture CLI for gated e2e).

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Persisted-data decision: Not Affected. Existing data: a saved definition naming the old tool is ignored (OLD-001, UNIT-PARITY). Backend restart: LIVE A05 passes on both runtimes. Version-specific runtime branch / fallback observed: No.

## Durable Coverage Changed In The Codebase

| Path | Change | Requirement | Result |
| --- | --- | --- | --- |
| autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts | Added one case | first-party `create_task`/`update_task` win over a same-named third-party MCP tool; diagnostics emitted | Pass |
| autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts | Updated | AC-007 old-name session not exposed; AC-003 old-name `tools/call` errors and creates nothing | Pass |

- Attached for test-code review: Yes. Removed paths: none. These two files are uncommitted edits in the worktree on top of commit 0f89e845f0.

## Other Execution Artifacts

| Path | Type | Retained / Temporary |
| --- | --- | --- |
| evidence/ (logs, probe JSON, summaries; screenshots of UI probes removed for size, failure screenshots L01/L02 kept) | logs and JSON | Retained |
| evidence/native-tool-probe.mjs | script used for NATIVE-DIRECT | Retained, temporary method |

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| native-tool-probe.mjs against built dist and a temp data root | direct proof of tool registration and errors | Pass | temp root removed |
| base worktree at 35eacddb25 (twice) | compare pre-existing failures | used | removed with git worktree remove |

## Dependencies Mocked Or Emulated

| Dependency | Method | Why | Limitation |
| --- | --- | --- | --- |
| AGY CLI in gated e2e | scripted fixture CLI | no provider inference needed; real AGY quota exhausted | proves transport and tool path, not model behaviour |

## Failures And Out-Of-Scope Observations

| Item | Result | Compared with base | Owner / Follow-up |
| --- | --- | --- | --- |
| `task-copy-idle-lifetime` (gated AGY e2e) | intermittent: branch 4 fail / 6 pass; base 2 fail / 9 pass | same "model discovery timed out" error on base; other two branch signatures not seen on base | residual risk; recommend the code reviewer's failure-origin read if they judge the rate material |
| `projects-feature` probe PT-E2E-005..011 | fail at 390 px layout assertion, then cascade | base fails the same (PT-E2E-005..011) | pre-existing web UI; own item for the web owner |
| `project-manager-ux` PMU-002, PMU-021 | fail in full runs only; pass alone | base also fails PMU-021 in a full run; both pass alone on both trees | pre-existing flaky UI cases; web owner |
| `task-closure-tree`, `delegated-team-default-collapse` | Pass | n/a | informational |
| server integration `agent-status-websocket` 2 cases | fail | TESTING.md documented baseline exception | none |
| real-AGY L01/L02 | Blocked: Antigravity "Individual quota reached… Resets in 50h36m3s" | n/a | rerun after reset, optional |

## Cleanup Performed

| Resource | Ownership | Action | Result |
| --- | --- | --- | --- |
| probe backends, Nuxt, Chrome, data roots | probe-owned | probe finally-cleanup | confirmed terminated in probe results |
| base worktrees ../task-tool-split-api-base | mine | `git worktree remove --force` + prune | removed |
| vitest temp roots | mine | left in OS temp | n/a |
| user's AutoByteus app and data | not mine | untouched | n/a |

## Preliminary Classification

Not applicable (result Pass).

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 94%
- Default 95% target met: No — 94%, gap explained above
- Any final category below 90%: No
- Broader validation decision: Required; executed (real Claude and Codex probe plus native direct check)
- Critical acceptance criteria lacking direct proof: None (AC-007 and AutoByteus-native live launch are proven at session/unit level only)
- Behaviour only the user can check: FU-1 coordination — the Project Task Manager package must ship in the same release or that agent has no task tools. Nothing else.
- Next recipient from get_handoff_rules: code_reviewer (test-code review request)
- Notes: two durable test files changed; unrelated pre-existing failures listed above.
