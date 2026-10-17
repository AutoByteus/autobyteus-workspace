# API/E2E Execution Coverage Report — collaboration-model-contract

## Execution Round Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/related-task-tool-split-receipt.md, /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/new-task-proposal.md, /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/temp-task-removal-proposal.md, /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/temp-task-tool-split-proposal.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/architecture-review-revision-record.md
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/implementation-revision-record.md
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/code-review-report.md
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/code-review-revision-record.md
- Delivery Revision Record: N/A
- Coverage Investigation: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-coverage-investigation.md
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-test-case-ledger.md
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-001
- Current Execution Round: 1
- Trigger: code review CRR-002 pass
- Latest Authoritative Round: 1

## Routing Classification

- Task size: Large; Architectural risk: High; Input route: Reviewed; Successful-output route: Code Review
- Proportional test-code review decision: Required

## Investigation And Execution Basis

- Investigation completed before durable coverage changes or final execution: **No** — the full-tree run that revealed the stale suites came first; the investigation was written after it and before any durable change. The ledger was written from logs during execution.
- Plan followed: yes after that point. Deviations: the handoff's suggested real-data startup run was replaced by synthesized data on the user's instruction; two start-failure cases were skipped (no real trigger).
- Reroute required: No.

## Compatibility / Legacy Scope Check

- Requirements/design introduce backward compatibility: No. Implementation retains compatibility-only behavior: No (old shapes are read only inside the migration's frozen schema).
- Persisted-data decision (Migration Required) followed without a runtime fallback: Yes.
- Durable coverage kept only for compatibility behavior: No (the old-name/old-shape tests assert refusal or conversion, not support).

## Acceptance-Criteria Proof

- Evidence folder: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/evidence/ (index: the ledger)

| AC | Critical | Proven by | Evidence | Result |
| --- | --- | --- | --- | --- |
| AC-001 Team member delegates a teammate: refused, nothing created | Yes | CM-E2E-2; live Claude LE-T1; Team-root repairs in 6 suites | fix-round6-cm-e2e.log, final/live-claude.log, final/server-e2e-agy-scripted-all.log | Proven |
| AC-002 copy member: teammate and own Team refused | Yes | live LE-A3 (Claude and Codex); delegated-team-lazy-member-activation (own Team refused); DLP-003/DLP-005 | final/live-claude.log, live-codex-agent-initiated-collaborators.log, probes/dlp-run2.log | Proven |
| AC-003 Org: mounted-Team member refused teammate and own mounted Team | Yes | CM-E2E-3; controlled-org-publication-http; live Claude LE-O1 | fix-round6-cm-e2e.log, fix-round5.log, final/live-claude.log | Proven |
| AC-004 independent units still delegated; copies root-hosted | Yes | CM-E2E-1/2/3 (Agent, Team, Org sibling, Org sibling Team); all repaired suites; cross-scope probe | same logs; probes/cross-scope-claude.log | Proven |
| AC-005 outside message not found; nothing created; Task-owned sender too | Yes | CM-E2E-1 (Task-owned copy as sender), CM-E2E-2, ad-hoc-task-delegation step 6, DLP-003/005; live LE-A1 (Claude, Codex); web probe S01 (Claude) | fix-round6-cm-e2e.log, final/live-claude.log, live-codex-agent-initiated-collaborators.log, probes/cross-scope-claude-S01.log | Proven (Codex probe shows no tool text: proven through the Codex live suite) |
| AC-006 teammates, run IDs, siblings reached as before | Yes | CM-E2E-2 (teammate message), repaired suites' run-ID messages, live LE-A1/LE-A2 | same | Proven |
| AC-007 stored collaborators open as decided after startup | Yes | startup e2e through `dist/app.js` on synthesized released-shape data; 18 upstream unit migration tests | startup-e2e-synthesized.log, final/unit.log | Proven for conversion, run IDs, memory untouched, roots open, idempotency; wake of a converted unowned run by run ID is not asserted through the compiled server (upstream integration only) |
| AC-008 texts state the model on all runtimes | Yes | upstream llm-contract snapshot tests (final/unit.log); real Claude and Codex agents received the texts and followed them in the live runs | final/unit.log, live logs | Proven at unit level; behavior seen live on Claude and Codex (AutoByteus runtime: unit only) |
| AC-009 canonical doc and links | No | doc review: delivery (docs sync) | n/a | Not tested here |
| AC-010 `@X` steers to `delegate_task`, no collaborator entry | Yes | ad-hoc-task-delegation (note text, no in-run marker for a delegated copy); cross-scope A01/T01/O01/N02/N03 (Claude 19/19, Codex 18/19) | fix-round4.log, probes/cross-scope-*.log | Proven |
| AC-011 sourceless copies at a collaborator's address are stamped | Yes | startup e2e (Agent and Org sourceless copies) | startup-e2e-synthesized.log | Proven |

## Changed Boundary And Evidence Matrix

See the ledger (one row per case with command, result and log).

## Additional Repository Coverage Execution

| Order | Command | Result | Log |
| --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` | Pass | final/typecheck.log |
| 2 | `pnpm -C autobyteus-server-ts test:unit` | Pass 693 files / 5501 tests | final/unit.log |
| 3 | `pnpm -C autobyteus-server-ts test:integration` | 73 files pass; 2 documented baseline failures | final/integration.log |
| 4 | contract package tests | Pass 20 / 16 / 27 | final/autobyteus-*-contracts.log |
| 5 | full e2e tree, scripted AGY | 8 files / 27 tests fail, identical to base | final/server-e2e-agy-scripted-all.log |

Web unit tests were not rerun by me (no web source changed here; implementer and reviewer ran 4388 and 13).

## Validation Confidence Scorecard

| Category | Post-Repository | Final | Support | Residual |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 90% | 96% | every critical AC has direct cases on real boundaries | AC-007 wake step through the compiled server; AC-008 AutoByteus runtime unit-only |
| Changed-boundary execution directness | 92% | 96% | real HTTP/WS/MCP server, compiled startup, real Claude and Codex agents | none material |
| Cross-boundary integration realism and mock gap | 88% | 95% | scripted CLI only stands in for the model; two real runtimes confirm | Codex Team/Org roots not run |
| Environment, configuration, identity, fixture fidelity | 90% | 92% | clean env, own roots, base worktree comparison, source structure asserted against production key sets | synthesized (not real) data by rule; host load flakiness; first live run lost to a missing `USER`/`LOGNAME` |
| Failure, edge, lifecycle, recovery | 85% | 92% | Stop/restore/reopen, restart, invalid input, refusals in every root, second-start idempotency | two start-failure triggers gone; converted-run wake only upstream |
| User-surface, browser, desktop-shell | 85% | 93% | cross-scope (Claude 19/19, Codex 18/19), run-settings 12/13, DLP/SSR, PMU, closure-tree, collapse on a real stack | desktop shell not touched; pre-existing failing probes (below) |
| Durable regression coverage quality | 70% | 93% | 12 stale server suites and 10 probe files repaired, 4 new durable cases with a negative control, one stale suite replaced | two skipped cases; pre-existing stale suites remain |

- Overall post-repository confidence: 86% (simple average of 90, 92, 88, 90, 85, 85, 70 = 85.7)
- Overall final confidence: **94%** (average of 96, 96, 95, 92, 92, 93, 93 = 93.9)
- Confidence change produced by broader validation: +8
- Every critical AC directly proven, apart from user-only parts: Yes (with the two bounded limits in the AC table)
- Any final category below 90%: No. Default 95% target met: **No (94%)**
- Confidence-limiting residual risks: (1) a converted unowned run is woken by run ID only in upstream integration tests; (2) synthesized rather than real data by rule; (3) pre-existing failing suites mask regressions in their areas; (4) two real-use start-failure scenarios have no trigger and are unit-covered.

## Broader Validation Decision And Execution

- Decision: Required; executed: scripted e2e per root; compiled startup on synthesized data; live Claude (6/6) and Codex (A1–A3); browser probes (list in the ledger).
- Deviation: I first ran suites from the handoff list without a plan and found that the stale set was larger than listed; I then repaired by evidence. I did not run the whole web probe set: only probes whose code asserted removed behavior or delegated a Team's own member.
- Startup order, environment: dist/app.js spawned by the test with its own temp data root, HOME and database; probes own their stacks.

## Platform / Runtime Targets

macOS (Darwin 25.5.0); node v22; Chrome headless via playwright-core; Claude Code 2.1.300 (haiku), Codex CLI; scripted agy-failure-cli fixture for AGY.

## Lifecycle / Upgrade / Restart / Persisted-Data Checks

- Approved decision: Migration Required. Representative data: synthesized released-shape trees whose key sets match the production survey (oldest shapes) plus the newest shapes; sourceless copies; collaborator Team never started (no memory folder).
- Result: Pass (startup e2e). Version-specific runtime branch or fallback observed: No.
- Residual: `memory/imports/` mirrored trees (outside the migration's roots, not probed).

## Durable Coverage Changed In The Codebase

Added: autobyteus-server-ts/tests/e2e/projects/collaboration-model-contract.e2e.test.ts; autobyteus-server-ts/tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts.
Updated (server): tests/e2e/agent-definitions/agent-package-definitions-live-refresh, tests/e2e/agent-org-runs/controlled-org-publication-http, tests/e2e/projects/{ad-hoc-task-delegation, delegated-copy-model-change, delegated-launch-config-defaults, delegated-team-lazy-member-activation, project-change-feed, task-closure-root-visibility, task-copy-idle-lifetime, task-existing-copy-assignment, task-reactivation-root-visibility}, tests/e2e/runtime/{agent-initiated-collaborators, agy-linked-skills-transport} (all `.e2e.test.ts` under autobyteus-server-ts).
Updated (web probes, autobyteus-web/tests/e2e): cross-scope-agent-mentions-live-probe, delegated-launch-defaults-probe, delegated-team-default-collapse-probe, existing-run-model-config-probe, interrupt-result-presentation-probe, project-manager-ux-probe, project-manager-ux-task-locator-cases, run-settings-live-probe, settings-saved-model-refresh-cases, task-closure-tree-probe.
Removed: autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts (obsolete assertions: `@` adds a collaborator instance, collaborator briefing, collaborator Team handoff; upstream evidence REQ-004/BEH-009; replacement named in the investigation). Diff: `git diff 8878625d94 -- <path>` (uncommitted deletion in the worktree).
Skipped with rationale: EXC-E2E-006 (task-existing-copy-assignment), PMU-010 (project-manager-ux-probe).
Documentation: TESTING.md gained two rules (migrations tested on small synthesized data; clean-environment note for signed-in CLIs), uncommitted; its own rules call for a separate `docs(testing)` commit.
- Attached for test-code review: Yes. All edits are uncommitted in the worktree on top of 44b5108b12.

## Temporary Execution Methods / Scaffolding

| Method | Why | Result | Cleanup |
| --- | --- | --- | --- |
| base worktrees at 8878625d94 (twice) | baseline comparison | used | removed with git worktree remove |
| read-only survey of the user's real trees; two copies of seven trees (never migrated) | learn the released structure | structure recorded in the test | copies deleted; no run ever started on real data |
| temporary debug print in a base worktree's test-support | find why 28 base tests fail | cause: stale tests | worktree removed |

## Dependencies Mocked Or Emulated

| Dependency | Method | Limit |
| --- | --- | --- |
| AGY CLI in the gated e2e | scripted fixture CLI | proves transport and tools, not model behavior (live Claude/Codex cover that) |

## Failures And Out-Of-Scope Observations

| Item | Compared with base | Owner |
| --- | --- | --- |
| 8 server e2e files / 27 tests (hierarchical-team-run-config-graphql, agent-command-correlated-status, standalone-error-termination-lifecycle, team-run-v1-production-upgrade, memory-sync-multiprocess, nested-team-history-restart, recent-run-projection-graphql, configured-skill-on-demand-loading) | identical failures on base | server test owner, own item |
| web probes existing-run-model-config, interrupt-result-presentation, run-settings-live R03 | identical on base | web owner |
| integration `agent-status-websocket` 2 cases | TESTING.md baseline exception | none |
| `task-copy-idle-lifetime` timing | flaky on both trees; passed in the final run | server test owner |

## Cleanup Performed

Probe stacks, the compiled test servers and temp data roots: removed by their owners (verified no leftover process). Base worktrees: removed. The user's app and data: never touched.

## Preliminary Classification

Not applicable (Pass).

## Latest Authoritative Result

- Result: **Pass**
- Final validation confidence: 94% (default 95% target not met; reasons above)
- Any final applicable category below 90%: No
- Broader validation decision: Required, executed
- Critical acceptance criteria lacking direct proof: None (two bounded limits under AC-007 and AC-008)
- Behavior only the user can check: none from this stage. For delivery: AC-009 doc review; the `memory/imports` question for the solution designer; the two uncommitted `TESTING.md` rules.
- Next recipient from get_handoff_rules: code_reviewer (test-code review)
