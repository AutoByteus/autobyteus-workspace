# API/E2E Coverage Investigation — collaboration-model-contract

## Investigation Meta

- Requirements Doc: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/requirements-doc.md
- Investigation Notes: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/investigation-notes.md
- Solution Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/solution-revision-record.md
- Design Spec: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/design-spec.md
- Supplemental Task Artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/related-task-tool-split-receipt.md, /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/new-task-proposal.md, /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/temp-task-removal-proposal.md, /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/temp-task-tool-split-proposal.md; published model /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/autobyteus-server-ts/docs/design/collaboration_model.md
- Design Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/design-review-report.md
- Architecture Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/architecture-review-revision-record.md (also /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/handoff-architecture-review.md)
- Implementation Handoff: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/implementation-handoff.md
- Implementation Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/implementation-revision-record.md (IR-001, IR-002)
- Code Review Report: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/code-review-report.md (CRR-001 round 1, CRR-002 round 2 Pass 9.3/10)
- Code Review Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/code-review-revision-record.md
- Delivery Revision Record: N/A
- API/E2E Revision Record: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-revision-record.md
- Current API/E2E Revision ID: API-REV-001
- API/E2E Test-Case Ledger: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-test-case-ledger.md
- Current Investigation Round: 1
- Trigger: code review CRR-002 pass
- Latest Authoritative Investigation: this file

## Routing Classification

- Task size: Large
- Architectural risk: High
- Input route: Reviewed (ARCH-REV-002, CRR-002)
- Successful-output route: Code Review
- Proportional test-code review decision: Required

## Current Requirement And Design Basis

One collaboration model: inside a run you message; outside it you delegate, then message the copy by run ID. `delegate_task` to self, a teammate or the own Team (any depth) is refused with `COLLABORATION_SELF_TARGET_REJECTED` (REQ-001, DEC-008); `send_message_to` never creates a run (an outside address is `COLLABORATION_TARGET_NOT_FOUND`, REQ-003); collaborators and Task helper copies no longer exist (REQ-004); stored collaborators become unowned delegated runs by startup migration `20261015_collaborators_to_delegated_runs_v1` (REQ-005, Migration Required); texts state the model (REQ-006); canonical document (REQ-007). Preserved: Org siblings delegable, catalog delegation, run-ID messaging, closure/reopen/reactivation, idle shutdown.

## Process Record (honest)

- The handoff listed five stale e2e files. A full scripted e2e run on the branch and on a base worktree (8878625d94) showed **12 files / 24 tests failing on the branch and not on the base**, plus the live and web suites below. The investigation was written after that run, and the handoff's suggested real-data startup run was replaced by synthesized data on the user's instruction (see Persisted Data).
- Rule applied: a failing existing test is an implementation defect only after its assertion is checked against approved behavior. Every failure below cited a removed behavior (teammate delegation, bring-in, a `collaborators` field, the old refusal text) in its own failure message, so each is `Needs Update`, not a defect.

## Supported Scenarios And Real Usage

- Designer scenarios: SCN-001..SCN-008 (SCN-008 is doc review, not mine).
- Added real-use scenarios: (a) a Task-owned sender (a delegated copy) messaging an outside address (AC-005); (b) a copy member delegating its own teammate / own Team (AC-002); (c) a Team-root coordinator and a mounted-Team member each trying a teammate; (d) a user upgrading: new build starting on app data written by the previous version.
- Unsupported/contrived scenarios: none recorded.

## Changed Behavior Summary

| Behavior / Boundary | Change | Coverage |
| --- | --- | --- |
| BEH-001..003 refusal (Agent, Team, Org, copy) | Changed | CM-E2E-1..3 (scripted, real HTTP/WS/MCP); live Claude LE-T1/LE-O1/LE-A3, live Codex LE-A3; unit/integration upstream |
| BEH-004/008 independent units, run-ID messaging | Preserved | 12 repaired e2e suites; CM-E2E; live |
| BEH-005..007 messaging resolve-only | Changed | CM-E2E-1..3 (incl. Task-owned sender); live LE-A1 Claude and Codex; web probe S01 on Claude |
| BEH-009/010 collaborators removed, stored ones converted | Changed | startup e2e on synthesized released-shape data (compiled server); unit migration tests upstream |
| BEH-011 texts | Changed | llm-contract unit upstream; real Claude and Codex agents act on them in the live runs |
| `broughtIn` Task role | Directly usable, never written | suites that expected a `broughtIn` run now expect delegated runs |

## Changed Surface And Boundary Classification

| Surface | Affected | Evidence | Remaining risk |
| --- | --- | --- | --- |
| Domain / backend | Yes | unit 693 files / 5501 tests; integration (2 documented baseline failures) | none |
| API / transport | Yes | tool error codes through real HTTP MCP, stream/GraphQL fields removed; contracts 16/27/20 | none |
| Frontend | Yes (removal) | web probes (below); web unit upstream (4388) | desktop shell not run |
| Browser integration | Yes | cross-scope probe (Claude 19/19, Codex 18/19), run-settings-live 12/13, DLP/SSR, PMU, closure-tree, collapse | pre-existing failing probes, see Ambiguities |
| Persisted-data transition | Yes | startup e2e on synthesized data through `dist/app.js` | wake of a converted unowned run by run ID is not asserted through the compiled server |
| Process / lifecycle | Yes | Stop/restore/reopen cases in repaired suites and live suites | real Antigravity host-crash cases not run (previous quota block) |
| External integration | Yes | live Claude (haiku) and Codex | Codex Team/Org root cases not run |
| Desktop shell | No | | |

## Project Execution Discovery

- Worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract (codex/collaboration-model-contract, commits 5dd930d8be, 44b5108b12; base origin/personal 8878625d94)
- Testing guideline: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/TESTING.md (same layers and rules as the workspace one); no closer guideline.
- Rules applied: clean env for e2e/live suites (with the real HOME plus `USER`/`LOGNAME` for signed-in CLIs, see Ambiguities); build before dist-dependent suites; never touch the user's app or `~/.autobyteus`; Rule 9 (compare with base; I used a base worktree twice and removed it each time); scripted AGY CLI for gated suites; migrations on synthesized data only (rule added to TESTING.md on the user's direction).
- Secrets: Claude and Codex logins on the host used for the live runs; no secret printed or copied.

## Persisted Data Transition Coverage Basis

- Approved decision: Migration Required for collaborator trees; teammate copies and `broughtIn` Directly Usable.
- **Source data is synthesized, never real user data** (user direction 2026-10-15; TESTING.md): I surveyed the real trees read-only to learn the released structure (agent entries without `launchSource`; team entries without `defaultLaunchSource`/`userTeamLaunchSelection`; members with only `address, agentDefinitionId, agentRunId, platformAgentRunId`) and the test asserts its handwritten entries have exactly those key sets, plus the newest shapes as supersets. Two read-only copies of seven user trees I made earlier in the stage were never migrated and were deleted; no run was started on real data.
- Evidence: startup e2e (compiled server): migration SUCCEEDED, every collaborator is a delegated run with its run ID and delegator, sourceless copies stamped (AC-011), collaborators' memory files byte-identical and no memory folder created or moved, roots open through GraphQL, second start changes nothing. Upstream: 18 unit migration tests.
- Not asserted through the compiled server: waking a converted unowned run by its run ID and the never-started Team's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` (covered upstream by integration tests; an unowned stopped copy is woken by run ID in `native-compaction-root` integration and Task-owned copies in the scripted e2e).
- Open question for the solution designer (not a blocker): `memory/imports/<node>/` holds byte-mirrored trees from another node (3 collaborators in the real data); outside the migration's roots, and the design does not mention them. I did not probe whether a current reader parses them.

## Existing Durable Coverage Inventory

Evidence: same command on the branch before my work and on base 8878625d94 (`env -i … RUN_AGY_FAILURE_E2E=1 ANTIGRAVITY_CLI_COMMAND=<scripted fixture> vitest run tests/e2e`): base 8 files / 27 tests fail; branch 20 files / 51 tests fail; the 12 extra files are below.

| Path | Assertion / intent | Decision | Action done |
| --- | --- | --- | --- |
| tests/e2e/agent-org-runs/controlled-org-publication-http.e2e.test.ts | Org bring-in, `collaborators`, `collaborator_added` | Needs Update | outside `send_message_to` not found; `delegate_task` copy; message by run ID with reference file; `/team` (own mounted Team) refused |
| tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts | `@` delegation; step 6 bring-in; steps 7-9 collaborator | Needs Update | step 6: outside message not found, then delegation, then run-ID message; 6b/8/9 on the delegated copy |
| tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts | copy members contact the host | Still Valid (passes on branch and base) | none |
| tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts (live) | LE-A1 bring-in, LE-A2, LE-A3 collaborator team, LE-T1/LE-O1 bring-ins and race, LE-F1 | Needs Update | rewritten for the model; refusal waits match the call's own arguments |
| tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts (live) | `@` adds a collaborator instance; briefing; Team collaborator | **Stale / Remove** | deleted. Replacement: the `@` → `delegate_task` journey is covered by ad-hoc-task-delegation e2e, cross-scope probe A01/T01/O01/N02/N03 (real Claude and Codex), and LE-A1 live |
| tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts | refusal text for an unavailable address | Needs Update | expected text no longer mentions a collaborator |
| tests/e2e/projects/delegated-copy-model-change.e2e.test.ts | DCM-005 includes a collaborator | Needs Update | collaborator step replaced by outside-address not found |
| tests/e2e/projects/delegated-launch-config-defaults.e2e.test.ts | launch defaults for copies and collaborators | Needs Update | bring-ins become delegations (each copy resolved on its own, same notes); teammate delegation asserts refusal; `@`/retired-root cases assert not found |
| tests/e2e/projects/delegated-team-lazy-member-activation.e2e.test.ts | a copy member delegates its own Team | Needs Update | refusal asserted; a second catalog Team is delegated instead |
| tests/e2e/projects/project-change-feed.e2e.test.ts | Team root delegates a member; start failure | Needs Update | Team = manager only; catalog Agent copy; start-failure case removed (no real trigger) |
| tests/e2e/projects/task-closure-root-visibility.e2e.test.ts | helper bring-in under a Task | Needs Update | sub-delegation instead; two messages touch Task A; Team root manager-only |
| tests/e2e/projects/task-existing-copy-assignment.e2e.test.ts | Team root delegates `/worker` | Needs Update | catalog addresses in Team root; Team has a peer member for the non-assigner case; EXC-006 skipped (no trigger); EXC-006/007 moved to Org |
| tests/e2e/projects/task-reactivation-root-visibility.e2e.test.ts | same + helpers | Needs Update | same pattern |
| tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts | Team root delegates `/worker` | Needs Update | catalog address; timing-sensitive on both trees |
| tests/e2e/runtime/agy-linked-skills-transport.e2e.test.ts | E06 teammate delegation | Needs Update | outside agent; `llmConfig: null` |
| web probes cross-scope-agent-mentions-live, delegated-launch-defaults, delegated-team-default-collapse, project-manager-ux (+ task-locator cases), run-settings-live, settings-saved-model-refresh-cases, task-closure-tree, existing-run-model-config, interrupt-result-presentation | collaborator rows, bring-ins, Team-root teammate delegation, `collaborators` fixture key | Needs Update | edited as listed in the report |

## Durable Coverage To Add

| Case | Behavior | Path |
| --- | --- | --- |
| CM-E2E-1..3 | Agent/Team/Org refusals, outside message not found (incl. Task-owned sender), outside delegation then run-ID message, Org siblings allowed | autobyteus-server-ts/tests/e2e/projects/collaboration-model-contract.e2e.test.ts |
| CM-E2E-4 | startup migration through the compiled server on synthesized released-shape data | autobyteus-server-ts/tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts |

## Durable Coverage To Remove

standalone-agent-collaborator-mention.e2e.test.ts (see inventory: premise removed; replacement named).

## Repository Coverage Execution Plan And Results

See the report's Additional Execution table and the ledger; every command, its working directory and its log are in the ledger.

## Test-Case Ledger Decision

Required and used: /Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/api-e2e-test-case-ledger.md (written during execution from logs; not initialized before the first run).

## Post-Repository Confidence Scorecard

Carried to the execution report. Post-repository overall 86%; final 94%.

## Broader Validation Decision

- Decision: Required, executed. Modes: scripted real-HTTP/WS/MCP e2e per root; compiled-server startup on synthesized data; live Claude and Codex agents; browser probes against a real stack.
- Browser: required only where an existing probe asserted removed behavior or delegated to a Team's own member; I ran only those probes, not the whole web probe set (the projects-feature and unrelated UI suites were not run).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | Only the user? |
| --- | --- | --- | --- |
| Wake of a converted unowned run by run ID through the compiled server | seeding a wakeable run needs full traces and a runtime; covered upstream | low | No |
| Migration on real user data | forbidden by the testing rule | none | No |
| Codex Team/Org root live cases | suite default runs root cases on Claude only | low | No |
| Real Antigravity host-crash cases | provider quota exhausted earlier | low | No |
| Desktop shell, packaged Electron; settings-saved-model-refresh desktop variants SSR-002..004 | no shell change; heavy | low | No |
| `memory/imports` trees | outside the migration's roots; not probed | unknown | solution_designer to decide |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Owner |
| --- | --- | --- | --- |
| 8 server e2e files / 27 tests fail on base and branch alike (`refType` no longer in `TeamMemberInput`, `ownLlm is not a function`, `prepareNewAgentRun is not a function`, "Team V2 cannot contain configured Team", stale projection fixtures, terminal home) | pre-existing stale tests, not this ticket | evidence/server-e2e-agy-scripted-all-base.log, final/server-e2e-agy-scripted-all.log | server test owner (own item; Rule 9: product-sized, not fixed here) |
| web probes existing-run-model-config (12 failures) and interrupt-result-presentation fail identically on base; run-settings-live R03 fails identically on base | pre-existing | evidence/probes/base/*, probes/run-settings-live-full.log | web owner |
| `task-copy-idle-lifetime` timing sensitive (see previous ticket); passed in the final run | pre-existing flake | final run | server test owner |
| Live suites hang with "Not logged in" under `env -i PATH HOME TMPDIR` on macOS | environment lesson | live-claude-run1-not-logged-in-env-fault.log | recorded in TESTING.md |
| Two start-failure cases (EXC-E2E-006, PMU-010) lost their only real trigger | coverage reduction | skipped with rationale; rendering unit-covered | none |

## Investigation Decision

- Proceed: Yes (done). Durable coverage added / updated / removed: Yes.
- Reroute required: No.
