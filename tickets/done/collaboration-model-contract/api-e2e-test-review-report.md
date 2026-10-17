# API/E2E Test Review Report

## Review Meta

- Review Round: `1`
- Trigger: api_e2e_engineer, API/E2E Pass at 94% (API-REV-001); request for proportional test-code review
- Requirements / Investigation / Solution Revision Record / Design Spec reviewed as context: `.../requirements-doc.md` (SR-003), `.../investigation-notes.md`, `.../solution-revision-record.md`, `.../design-spec.md`
- Supplemental Task Artifacts Reviewed As Context: `autobyteus-server-ts/docs/design/collaboration_model.md`
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md` (IR-001, IR-002)
- Original Code Review Report: `.../code-review-report.md` (CRR-002, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-003`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- Execution Coverage Report: `.../api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `.../api-e2e-revision-record.md` (API-REV-001)
- API/E2E Result: `Pass`
- Final Validation Confidence: 94% (no category below 90%)
- Prior unresolved test-review findings rechecked: None
- Project testing guideline applied: `TESTING.md` (worktree; includes the two new uncommitted rules: synthesized migration data, and the macOS clean-env note for signed-in CLIs). No conflict with this skill.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-007; AC-001..AC-007, AC-010, AC-011)

(`...` = `/Users/normy/autobyteus_org/autobyteus-worktrees/collaboration-model-contract/tickets/in-progress/collaboration-model-contract`)

## Changed Durable Test Scope

All changes are uncommitted on top of `44b5108b12` (24 test files, +536/−1146).

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/collaboration-model-contract.e2e.test.ts` | Added | SCN-001..005; AC-001, AC-003..AC-006 | the model through real HTTP/WS/GraphQL/scoped MCP in Agent, Team and Org roots | Negative control: it fails 3/3 on base `8878625d94` (`evidence/negative-control-cm-e2e-on-base.log`) |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/collaborators-to-delegated-runs-startup.e2e.test.ts` | Added | SCN-007; AC-007, AC-011 | the startup migration through the built server (`dist/app.js`) on synthesized released-shape data | Follows the new TESTING.md rule. Asserts the synthesized key sets match the surveyed released keys. |
| `autobyteus-server-ts/tests/e2e/runtime/agent-initiated-collaborators.e2e.test.ts` | Updated (rewritten, live, gated) | SCN-001..004 on real runtimes | LE-A1..A3, LE-T1, LE-O1, LE-F1 | Bring-in steps replaced by delegate-then-run-ID, plus refusals and not-found checks |
| `.../agent-org-runs/controlled-org-publication-http`, `projects/ad-hoc-task-delegation`, `delegated-copy-model-change`, `delegated-launch-config-defaults`, `delegated-team-lazy-member-activation`, `project-change-feed`, `task-closure-root-visibility`, `task-copy-idle-lifetime`, `task-existing-copy-assignment`, `task-reactivation-root-visibility`, `agent-definitions/agent-package-definitions-live-refresh`, `runtime/agy-linked-skills-transport` | Updated | preserved behavior (BEH-004/005/008, Task closure, launch defaults) on the new model | each keeps its own surface | Assertions on removed behavior were converted rather than dropped (see checks) |
| `autobyteus-server-ts/tests/e2e/runtime/standalone-agent-collaborator-mention.e2e.test.ts` | Removed (518 lines) | — | its premise (`@` adds a collaborator, collaborator Team) no longer exists | The `@` → `delegate_task` journey is covered by `ad-hoc-task-delegation`, the cross-scope probe (Claude/Codex) and live LE-A1 |
| `autobyteus-web/tests/e2e/` probes: cross-scope-agent-mentions-live, delegated-launch-defaults, delegated-team-default-collapse, existing-run-model-config, interrupt-result-presentation, project-manager-ux (+ task-locator cases), run-settings-live, settings-saved-model-refresh-cases, task-closure-tree | Updated | UI on the new model (no collaborator rows; delegated copies) | per probe | Two cases were skipped with rationale (see checks) |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | CM-E2E-1/2/3 headers map to AC IDs. The live suite header lists each LE case and what it now proves. |
| Assertions prove approved requirements | Pass | Refusals assert `COLLABORATION_SELF_TARGET_REJECTED`, the address, the `send_message_to` guidance, no run ID, and an unchanged copy count. Not-found asserts the code, the `delegate_task` guidance, an unchanged tree and an unchanged Task set. The startup test asserts per-family run IDs, delegators, sources, AC-011 stamps, byte-identical memory, no folder created for the never-started Team, roots opening through GraphQL, and an unchanged second start. Removed-behavior assertions were converted rather than weakened: `delegated-launch-config-defaults` now checks launch notes on `delegate_task` results and on recorded copy `source`s, and `ad-hoc-task-delegation` replaces collaborator checks with copy/run-ID checks. The chip-rendering assertion (`conversationShowsNote`) is kept in the cross-scope probe. Minor: see OBS-T1. |
| Fixtures, setup and helpers reuse meaningful repetition | Pass | The startup e2e reuses the unit fixtures `released-collaborator-fixtures.ts` and the current tree fixtures; CM e2e reuses the studio server helpers |
| Isolation and determinism for the boundary | Pass | Per-test data roots and disposable HOME; scripted AGY CLI (no inference) for CM-E2E; the startup test spawns the built server with a clean env and its own DB |
| Large files coherent and navigable | Pass | The live suite (~1,100 lines) stays one surface with case IDs |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | Stale bring-in assertions were removed or converted. The two skips carry a written reason (see OBS-T2). The removed file's journeys are covered elsewhere. |
| Coverage agrees with investigation and execution evidence | Pass | `evidence/final/server-e2e-agy-scripted-all.log`, `evidence/final/live-claude.log`, `evidence/startup-e2e-synthesized.log`, negative control on base |
| Test callers exercise an independently established scenario | Pass | Agents act through real tool calls (scripted CLI or live model), the user through GraphQL/WS, and the upgrade through a real server start |
| Each test enters through the real trigger without unrealistic setup | Pass | The startup test hand-writes released-shape trees into a test data root. This is the established upgrade trigger: a previous version's files on disk. It is required by TESTING.md and checked against surveyed key sets. |

## Findings

None blocking.

Non-blocking observations (no action required for this ticket):

- **OBS-T1 (weak assertion):** `collaborators-to-delegated-runs-startup.e2e.test.ts` checks `expect(JSON.stringify(migration.summary)).toContain("3")`. Any "3" in the summary would pass. The per-tree assertions below it already prove the conversion, so this is cosmetic. On the next touch, assert `migratedCount === 3` (or whatever the summary field is named).
- **OBS-T2 (permanent skips):** `EXC-E2E-006` (`task-existing-copy-assignment.e2e.test.ts:778`, `it.skip`) and `PMU-010` (`project-manager-ux-probe.mjs`, a stub returning `skipped`) have a documented reason that holds:
  - Teammate delegation is now refused.
  - Orgs refuse an unavailable model at run creation.
  - Catalog copies fall back to another model.
  - Rendering and refusal are unit-covered.
  If no real trigger returns, deleting the stubs would be cleaner than keeping a skip that can never run. This is acceptable as recorded.

## Requested Assessment: Imported Memory Sync corpora (API/E2E question 3)

I checked this read-only; it is not a blocker and not a test issue.

- **Facts:**
  - `memory/imports/docker-node-1/agent_teams/` holds 2 Team trees with 3 collaborators in total (`marketing_team_94a61bec…`: 1; `software_engineering_team_b340c293…`: 2). No task execution in either names a collaborator as its delegator.
  - The current Team tree reader ignores unknown fields (`team-run-execution-tree-schema.ts`).
  - The migration's roots exclude `imports/`, as the design specifies ("Imported Memory Sync corpora are not touched (read-only)").
- **Consequence:** the imported Memory explorer still loads both runs, but does not list those 3 collaborator members until `docker-node-1` runs the new release (its own startup migration converts them) and re-syncs. No file is lost; the imported corpus is read-only by contract.
- **Disposition:** a residual risk for the Solution Designer and user to note. A future import from a node with collaborators delegating copies could fail delegator validation for that run in the imported explorer; locally no such data exists. Not routed as a finding; carried in the delivery handoff.

## Follow-ups

None new. The 8 pre-existing stale server e2e files / 27 tests and the unrelated web probe failures are recorded by API/E2E with owners in the execution report (identical on base).

- Sent to: `None`

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: the 2 added server e2e files, 13 updated server e2e files (including the rewritten live suite), 1 removed server e2e file, and 10 updated web probe files (listed above)
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Deliver the uncommitted test changes.
  - Commit the `TESTING.md` rules separately as `docs(testing): …`, per its own rule.
  - Carry the imports residual risk and the API/E2E limits: Codex Team/Org live cases not run; run-ID wake of a converted run and the never-started Team's `TASK_EXECUTION_CONTEXT_UNAVAILABLE` covered only by integration tests, not through the built server.
