# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/temp-task-tool-split-proposal.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/architecture-review-revision-record.md
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/implementation-revision-record.md
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/code-review-report.md (CRR-001, Pass 9.4/10)
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/code-review-revision-record.md
- Delivery Revision Record: N/A (no delivery re-entry)
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-001
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-test-case-ledger.md
- Current Investigation Round: 1
- Trigger: code review pass, route Medium + High
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

**Process note (honest record).** I ran validation before writing this file, and my first pass followed the code reviewer's "still to run" list (including five whole web probe suites) instead of deriving scope from the changed boundary. This file was written after those runs and records the scope decisions I should have made first. The probe decisions below are the corrected ones.

## Routing Classification

- Task size: Medium
- Architectural risk: High
- Input route: Reviewed (architecture review ARCH-REV-002, code review CRR-001)
- Successful-output route: Code Review (proportional test-code review of the changed durable tests)
- Proportional test-code review decision: Required

## Current Requirement And Design Basis

Proving: `create_or_update_task` is gone; `create_task` and `update_task` exist with the old create / patch rules, results and error codes (REQ-001..003); no task tool is automatic on AutoByteus, Codex or Claude (REQ-004); no agent-facing text names a task tool, and closing guidance lives only in `update_task`'s description (REQ-005); a configuration still listing the old name gets no tool and no launch error (REQ-006); the `@` note parser still accepts earlier releases' notes (AC-008). Persisted data: Not Affected. Backward compatibility: none introduced (the previous-release note sentence is a parse-only recognizer required by AC-008).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-005.
- Real-use scenarios added: (a) a third-party configured MCP tool named `create_task` / `update_task` (handoff hint) — trigger: an agent selects the name while a configured MCP server also publishes it; (b) a real agent configured with the removed name — trigger: agent selects `create_or_update_task` and the MCP session is activated.
- Unsupported/contrived scenarios not tested: none recorded.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 no automatic task tool | Changed | design, handoff | parity unit + real runtimes |
| BEH-002 neutral delegation texts | Changed | design | llm-contract unit + real Claude/Codex probe |
| BEH-003 two tools, same results/errors | Changed | design | HTTP MCP e2e, direct native call, AGY scripted e2e |
| BEH-004 neutral reactivation errors | Changed | design | unit + task-reactivation e2e |
| BEH-005 `@` note, old notes still parse | Changed | design | presentation-contracts tests + real probe A01/T01/O01 |
| Task service behaviour behind both modes | Preserved | requirements | AGY scripted e2e (closure, reopen, context files, assignment) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | tool contract, parsers, manifest, exposure | unit, HTTP e2e | none | none |
| API / transport / contract | Yes | native + Agent Tools MCP tool list and schemas | HTTP MCP e2e, parity unit | real runtimes see the new names | live Claude/Codex |
| Frontend component / state | No | web has only docs and probe scripts changed | n/a | none | none |
| Browser integration | No | no renderer change | n/a | none (browser is only a driver in the real-runtime probe) | none |
| Auth / session | No | | | | |
| Desktop shell | No | | | | |
| Process / lifecycle | Yes (indirect) | copy closure/reopen driven by `update_task` | AGY scripted e2e | host crash on real AGY | blocked: quota |
| Persisted-data transition | No (Not Affected) | | | | |
| External integration | Yes | real Claude and Codex agents calling the tools | none repository-resident | real model compliance | live probe |

## Project Execution Discovery

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split (branch codex/task-tool-split)
- Stack: pnpm monorepo, TypeScript server (vitest), Nuxt web
- Testing guideline: /Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md (the worktree copy is identical in layers/rules); closer guidelines: none (`autobyteus-server-ts/AGENTS.md` points to it)
- Conflicts: TESTING.md says AGY CLI 1.3.5 has no isolated sign-in recipe; gated AGY runs use the scripted fixture CLI (no inference).
- Secrets available: Claude and Codex logins on the host (used by the live probe; haiku/default model); Antigravity login present but its provider quota is exhausted.

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| TESTING.md | layers, gates, rules | clean env for E2E (`env -i`), build before dist-dependent suites, baseline exception for `agent-status-websocket`, Rule 9 on base failures |
| autobyteus-server-ts/AGENTS.md | server commands | `vitest run <file> --no-watch` |
| gated suite headers | gate vars | `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<tests/fixtures/agy-failure-cli.mjs>` |

| Component | Working Directory | Setup | Readiness | Cleanup |
| --- | --- | --- | --- | --- |
| server build | worktree | `pnpm -C autobyteus-server-ts build` | bootstrap smoke passed | keep |
| probe-owned backend/Nuxt/Chrome | probe temp roots | probe-managed | probe logs | probe cleans in finally |
| base worktree for comparison | ../task-tool-split-api-base (35eacddb25) | install, prebuild, build | ran | removed with `git worktree remove` |

| Data / Fixture | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| e2e data roots | test-owned temp dirs, own ports | no `~/.autobyteus`, never the running app | removed by suites |

## Persisted Data Transition Coverage Basis

- Approved decision: Not Affected. An agent definition naming the old tool is the only existing data; AC-007 covers it (see cases).

## Existing Durable Coverage Inventory

| Path / Test | Intent | AC / Design | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| tests/unit/agent-execution/shared/task-tool-runtime-parity.test.ts (new) | same exposure/schemas on all runtimes, old name ignored | AC-001/006/007 | Still Valid | pass | none |
| tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts | resolver, warning on unknown name | AC-007 | Still Valid (OBS-002 weak assertion noted, not blocking) | pass | none |
| tests/unit/agent-tools/project-tasks/* | parser order, error codes, results | REQ-001/002 | Still Valid | pass | none |
| tests/unit/agent-collaboration/.../agent-team-collaboration-llm-contract.test.ts | neutral texts, pinned hashes | AC-001, BEH-002 | Still Valid | pass | none |
| autobyteus-agent-presentation-contracts/tests/collaborator-mention-note.test.mjs | note composition, old notes parse | AC-005/008 | Still Valid | 20/20 | none |
| tests/e2e/projects/project-task-boundaries.e2e.test.ts | real HTTP MCP, native vs MCP errors, schemas | AC-003 | Still Valid | pass | Updated: old name rejected + session not exposed (AC-007) |
| tests/e2e/projects/* gated AGY suites (10 files) | delegation, closure, reopen, assignment, context files | AC-001/002/003/004 | Still Valid (names swapped) | pass, 1 load-sensitive case | none |
| tests/e2e/projects/projects-startup-migration, project-mutation-node-locality | need server dist | preserved | Still Valid | pass after build | none |
| tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts | catalog collision policy | handoff hint (third-party collision) | Needs Update (no case for these names) | pass | Added case |
| autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs | real runtime delegation, `@` note, `update_task` closure | AC-001/002/005/006 | Still Valid | pass Claude and Codex | none |
| autobyteus-web probes: project-manager-ux, task-closure-tree, delegated-team-default-collapse, projects-feature | UI behaviour of the Projects pages and trees | none (web unchanged) | **Out Of Scope** for acceptance; edited only to swap tool names in scripted calls | see report | one run each, results recorded as informational |

## Durable Coverage To Add

| Case ID | Behavior | Evidence | Path | Why |
| --- | --- | --- | --- | --- |
| COL-001 | first-party `create_task`/`update_task` win over a third-party MCP tool with the same name; diagnostics emitted | handoff hint, design "first-party names stay protected" | tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts | no durable case existed for the new names |

## Durable Coverage To Update

| Case ID | Existing Path | Required Update | Evidence | Notes |
| --- | --- | --- | --- | --- |
| OLD-001 | tests/e2e/projects/project-task-boundaries.e2e.test.ts | a session whose selection is only `create_or_update_task` is `not_exposed`; a `tools/call` of the old name on a live session errors and creates nothing | AC-003, AC-007 | real HTTP MCP |

## Durable Coverage To Remove

None.

## Repository Coverage Execution Plan And Results

| Order | Command | Dir / Config | Proves | Result | Evidence |
| --- | --- | --- | --- | --- | --- |
| 1 | `pnpm -C autobyteus-server-ts typecheck` | worktree | types | Pass | evidence/server-typecheck.log |
| 2 | `pnpm -C autobyteus-server-ts test:unit` | worktree | all unit (694 files, 5517 tests) | Pass | evidence/server-unit-full.log |
| 3 | `pnpm -C autobyteus-agent-presentation-contracts test` | worktree | AC-005/008 | Pass 20/20 | evidence/presentation-contracts-test.log |
| 4 | `pnpm -C autobyteus-server-ts build` | worktree | dist for dist-dependent suites | Pass | evidence/server-build.log |
| 5 | `env -i … vitest run tests/e2e/projects` (ungated) | server dir | boundaries, graphql, startup-migration, node-locality | Pass 4 files / 27 tests | evidence/server-e2e-projects-ungated.log |
| 6 | same + `RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=tests/fixtures/agy-failure-cli.mjs` | server dir, real HOME (per TESTING.md) | gated e2e, scripted AGY | 66 pass / 1 fail (idle-lifetime, load) | evidence/server-e2e-projects-agy-scripted.log |
| 7 | `task-copy-idle-lifetime` reruns alone, branch and base (6 branch runs then 4 more at low load; 11 completed base runs) | server dir | load sensitivity / attribution | branch 6 pass / 4 fail of 10; base 9 pass / 2 fail of 11. "Model discovery timed out" appears on both trees; two branch-only signatures (58980<59000 ms tolerance, worker idle timeout) occurred in the first full run and one rerun. Attribution inconclusive, no mechanism found in the change | evidence/*idle-lifetime*, evidence/lowload-*.log, evidence/alt-* |
| 8 | `pnpm -C autobyteus-server-ts test:integration` | server | integration | 2 fail = documented baseline exception | evidence/server-integration-full.log |
| 9 | project-task-boundaries e2e + `tests/unit/agent-tools tests/unit/agent-execution` after my edits | | new durable cases | Pass (11; 168 files / 1711 tests) | evidence/server-e2e-project-task-boundaries-final.log, unit-agent-tools-execution-final.log |

## Test-Case Ledger Decision

- Required: Yes (many independent cases, long probes, interruption risk). Created late; see process note.
- Path: /Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/api-e2e-test-case-ledger.md

## Post-Repository Confidence Scorecard

| Category | Score | Supports | Remaining Uncertainty | Could Improve |
| --- | --- | --- | --- | --- |
| Requirement and AC proof | 95% | every AC has a direct case (report table) | none material | n/a |
| Changed-boundary directness | 95% | real HTTP MCP, native registry, scripted AGY through scoped MCP | real runtimes not yet exercised at this point | live probe |
| Integration realism / mock gap | 90% | parity unit uses real catalog and resolver | real Claude/Codex untested at this point | live probe |
| Environment / fixture fidelity | 90% | clean env, own data roots | host load makes timing cases flaky | repeat at low load |
| Failure / edge / lifecycle | 92% | closure, reopen, restart, invalid input | real AGY host crash not run | blocked by quota |
| User-surface | 90% | text unit tests | no real agent saw the texts yet | live probe |
| Durable regression quality | 94% | new + updated tests | | |

- Overall post-repository confidence: 92% (simple average)
- Every critical AC directly proven: Yes at repository level
- Any category below 90%: No
- 95% target met: No
- Residual risks: real-runtime behaviour, host load flakiness

## Broader Validation Decision

- Decision: Required
- Mode: Live API (real Claude and Codex agents through the `cross-scope-agent-mentions` probe) plus a direct native-registry check
- Gap addressed: real agents receive only configured tools, see no task tool in texts, and close a temp Task with `update_task`
- Why: it is the only evidence from a real runtime of the new names and neutral texts; the browser in that probe is only the message driver
- Expected confidence after: ≥95%
- Browser-specific decision: Not required for acceptance. The four UI probe suites (project-manager-ux, task-closure-tree, delegated-team-default-collapse, projects-feature) are out of scope for this ticket's acceptance; they were run once because their scripts were edited, and are informational only.
- If Blocked: real-AGY host-crash cases L01/L02 are blocked by Antigravity quota ("Individual quota reached… Resets in 50h36m3s"); lifecycle unrelated to the change; scripted-AGY suites cover closure, reopen and idle shutdown.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| Real-AGY host-crash lifecycle (L01/L02) | provider quota exhausted | low (unrelated to change) | No | rerun after quota reset, optional |
| Packaged Electron app | no shell change | none | No | none |
| PTM package behaviour with the new names | FU-1, another Task | PTM has no task tools until FU-1 ships | Yes (release coordination) | FU-1 must ship in same release |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Owner |
| --- | --- | --- | --- |
| `projects-feature` PT-E2E-005..011 fail at 390 px layout (also on base) | out of scope, pre-existing web UI | evidence/probes/projects-feature.log, evidence/probes/base/ | web owner |
| `project-manager-ux` PMU-002/PMU-021 flaky in full runs (also on base) | out of scope, pre-existing | evidence/probes/project-manager-ux*.log, probes/base | web owner |
| `task-copy-idle-lifetime` is timing-sensitive: fails intermittently on branch (4/10) and base (2/11); attribution not proven | pre-existing timing test; residual risk, not a ticket failure | evidence/lowload-*, alt-* logs | server test owner |

## Investigation Decision

- Proceed: Yes
- Durable coverage added/updated: Yes
- Post-repository confidence: 92%
- Broader validation: Required (executed; see report)
- Reroute required: No
