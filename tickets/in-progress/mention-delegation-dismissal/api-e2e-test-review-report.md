# API/E2E Test Review Report — mention-delegation-dismissal

## Review Meta

- Review Round: 1
- Trigger: `/api_e2e_engineer` API/E2E Pass (API-REV-001) asked for a proportional test-code review of the durable test changes (uncommitted in the worktree on top of `a2a7b37bc`)
- Requirements Doc Reviewed As Context: `.../requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md`
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md`
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-005)
- Supplemental Task Artifacts Reviewed As Context: N/A — not applicable
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md` (IR-001)
- Original Code Review Report: `.../code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `.../code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- Execution Coverage Report: `.../api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `.../api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: Pass
- Final Validation Confidence: 95.1% (no category below 90%)
- Prior unresolved test-review findings rechecked: None (first test review). Code-review item C-09 (stale `@` live probe) is now resolved by the rewrite.
- Project testing guideline(s) applied: worktree `TESTING.md`, as recorded by the coverage investigation. No conflicts. The new TESTING.md Projects subsection documents the gated suite and the live probe, and it matches the code.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..007 from the approved requirements)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts` | Added | SCN-001/002/003/005/006/007; AC-001..013, AC-015 | Server/wire journey per root kind (agent, team, org): `@` → delegate → ad-hoc Task → strict updates → DONE → fencing → stored → migration pending → scoped delete | Gated like its sibling (`RUN_AGY_FAILURE_E2E=1` + fake AGY CLI). Skips cleanly when ungated (verified: 3 skipped). Only the external CLI is scripted. |
| `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts` | Updated (+2 cases) | AC-009 / REQ-007 (AutoByteus) | The real exposure, filter and native registry materialize `create_or_update_task` for a standalone host and a Team member with no tool selected | Verified: 4/4 pass. Only the member-context shape is a fixture. |
| `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs` | Updated (rewrite of `@` outcomes) | SCN-001..007; AC-001..003, 007..010, 012, 015 | Real browser → Nuxt → built backend → real Claude/Codex runtime journeys for standalone, Team and Org | Obsolete "`@` adds a collaborator" assertions replaced in place. F01 premise moved from "unrunnable" to "ineligible (deleted definition)", matching the no-runnability-check-at-`@` design. S01 (AC-012) now produced by the agent's own `send_message_to` bring-in. Syntax check OK. |
| `TESTING.md` (Projects section) | Updated | Guideline | Documents the gated suite and the probe, with commands and prerequisites | Accurate against the code |

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | E2E: one `rootScenario(kind)` with numbered, AC-tagged steps and three `it`s by root. Probe: `defineCase` IDs with AC/SCN titles. Resolver: `it.each` labelled by host kind. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | Asserted outcomes include: no collaborators in the stored tree; stored note text; a `task_id` in the tool result; a text-only folder (a grep for the reference bytes); the live `task_executions_closed` refs; fenced `TASK_AGENT_RESOURCE_CLOSED`; stored closed refs after Stop; delete scoped to its root. All are observable contract outcomes. |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | Reuses `startStudioE2eRuntimeServer`, `sendE2eSendMessageCommand`, `until` and `flattenE2eConfiguredAgentExecutions`. A local `startRoot` and `managerCalls` handle repetition across roots. |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each run uses its own temp app-data dir with unique definition names, `until` polling with bounded timeouts, and owned cleanup with an evidence receipt. The migration-pending file is removed in `finally`. The live probe's self-DONE variance is handled explicitly: `agentClosedOnItsOwn` asserts that Task status and closure agree, and A02/T03/O03 always assert the user-driven DONE. |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The E2E file (~480 lines) covers one journey per root. The probe (~1,300 lines) stays the single `@`-in-live-run surface, with shared state documented in its header. |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | Old collaborator-after-`@` assertions are gone, and the old guidance is asserted absent from new notes. No unexplained `skip`, TODO or FIXME. L01/L02 are AGY-only by documented design. |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | Matches the coverage investigation and the execution report (gated E2E 3/3; probe Claude 18 Pass + F01 rerun, Codex 19 Pass; resolver cases). |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Every journey maps to an approved SCN/AC. The scripted AGY actor only stands in for the model's decision; the tools, roots, services and disk are real. The migration-pending `projects.json` reproduces the supported pending-migration state named by REQ-012/E-20, as the sibling Projects tests do. |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Entry points are real: WS `SEND_MESSAGE` with `mentions`, the agent's MCP `delegate_task` and `create_or_update_task` calls, GraphQL terminate, restore and delete, and the browser composer and delete UI. AC-012's stored collaborator is produced by the agent's real first `send_message_to` (replacing the earlier private-field cast route at this layer). |

## Findings

None.

Non-blocking notes (no action required):
- In `ad-hoc-task-delegation.e2e.test.ts`, the check `expect(resources.length).toBeGreaterThan(0)` (after the copy-ID containment check) is redundant. Harmless.
- The AutoByteus runtime was not exercised live (no model available under TESTING.md rule 2). AC-009 for AutoByteus rests on the exposure and resolver unit layer, as the execution report records.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-server-ts/tests/e2e/projects/ad-hoc-task-delegation.e2e.test.ts`
  - `autobyteus-server-ts/tests/unit/agent-execution/backends/autobyteus/autobyteus-agent-tool-resolver.test.ts`
  - `autobyteus-web/tests/e2e/cross-scope-agent-mentions-live-probe.mjs`
  - `TESTING.md`
- Unresolved finding IDs: None
- Recommended Recipient: `delivery_engineer`
- Notes: Focused reviewer commands:
  - `vitest run` of the resolver test and the gated E2E: 4 passed, 3 skipped (ungated), as expected.
  - `node --check` on the probe: OK.

  The full API/E2E workflow was not rerun. The test changes are uncommitted in the worktree and must be included at delivery. Classification stays Large / High.
