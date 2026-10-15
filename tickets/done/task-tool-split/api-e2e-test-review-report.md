# API/E2E Test Review Report

## Review Meta

- Review Round: `1`
- Trigger: api_e2e_engineer, API/E2E Pass (API-REV-001), request for proportional test-code review
- Requirements Doc Reviewed As Context: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/requirements-doc.md` (SR-003)
- Investigation Notes Reviewed As Context: `.../investigation-notes.md`
- Solution Revision Record Reviewed As Context: `.../solution-revision-record.md`
- Design Spec Reviewed As Context: `.../design-spec.md` (SR-003)
- Supplemental Task Artifacts Reviewed As Context: `temp-task-tool-split-proposal.md`
- Architecture Review Revision Record Reviewed As Context: `.../architecture-review-revision-record.md` (ARCH-REV-002)
- Implementation Revision Record Reviewed As Context: `.../implementation-revision-record.md` (IR-001)
- Original Code Review Report: `.../code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/task-tool-split/tickets/in-progress/task-tool-split/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `.../api-e2e-coverage-investigation.md`
- Execution Coverage Report: `.../api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `.../api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
- Final Validation Confidence: 94% (no category below 90%)
- Prior unresolved test-review findings rechecked: None (first test review). CRR-001 OBS-002 (resolver test assertion) is implementation-commit test code and stays a non-blocking note.
- Project testing guideline(s) applied: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo/TESTING.md` (identical in the worktree). Conflicts: none. TESTING.md Rule 9 (base failures need an owner) is applied under Follow-ups.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-003 / AC-003, AC-007; preserved behavior "first-party names stay protected against MCP collisions", P-002)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts` | Updated (one case added) | P-002 / Preserved Behavior Boundary (first-party name protection) | MCP catalog collision policy | Uses the file's existing `FakeToolRegistry`, `buildMcpDefinition`, `buildSession` helpers and the production `ProjectTaskToolsMcpAdapterProvider` |
| `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts` | Updated (+4 lines) | AC-007 (old name gives no session tool), AC-003 (old name rejected as unknown tool, creates nothing) | Project Task production HTTP MCP boundaries | Fits the existing suite; uses its `activate`, `rpc`, `list` helpers |

- No durable test file changed: `No`
- Removed durable tests: none.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | The catalog case name states the guarantee. The e2e additions carry an AC comment and sit next to the matching `unselected` / `tools/list` assertions. The catalog case label cites AC-003, but the basis is really P-002 / preserved protection. This is cosmetic. |
| Assertions prove approved requirements instead of incidental implementation details | Pass | The catalog case asserts the enabled tools, the absent configured MCP sources, the `configured_mcp_tool_collision` diagnostics per name, and the session listing. The `!description.startsWith("Description for")` check relies on the fake helper's text, but it is the direct way to show the first-party definition won. The e2e checks prove `not_exposed`, a JSON-RPC error, and no Task created. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | Existing helpers only |
| Test isolation and determinism for the boundary | Pass | Pure unit case. The e2e additions run inside the suite's existing isolated data root and use deterministic calls. |
| Large files coherent and navigable | Pass | Both additions fit their file's single surface |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests | Pass | The old-name assertions prove absence (clean cut); they are not compatibility tests |
| Coverage agrees with investigation and execution evidence | Pass | `evidence/unit-mcp-catalog-collision.log`, `evidence/server-e2e-project-task-boundaries-final.log` (11/11), ledger rows |
| Test callers exercise an independently established scenario | Pass | Collision: a user configures an MCP server whose tool uses that name (P-002, upstream). Old name: a configuration that still lists it (DEC-004 / REQ-006). |
| Each test enters through the scenario's real trigger without unrealistic setup | Pass | The session is activated through `runSessions.activateForRun` with the production exposure builder, and the call goes over real HTTP MCP `tools/call`. The catalog case uses production adapters over a fake registry, which is the established unit seam in this file. |

## Assessment Of The Intermittent `task-copy-idle-lifetime` Case (Requested)

Decision: not material to this ticket, so no failure-origin review is opened. The API/E2E result stays `Pass`.

- **Change footprint:** no source file in the commit touches idle shutdown, the root lifecycle, the AGY backend or model discovery (`git diff --stat 35eacddb25..0f89e845f0 -- '*/src/*'`: 10 files, all contract, exposure, text or note files). In this test, the change only replaces the manager's configured tool names (`create_task`, `update_task`) and the DONE call (`update_task`). Worker copies also lose the automatic task tool, but no idle or timer logic reads tool names.
- **Rates:** 4/10 failures on the branch versus 2/11 on the base. A two-sided Fisher exact test gives p ≈ 0.36, which is no evidence of a rate difference at these sample sizes. In the alternating pair runs, the base failed and the branch passed.
- **Signatures:**
  - "Antigravity model discovery timed out": appears on both trees, so it is pre-existing.
  - `58980 < 59000`: the quiet copy's shutdown is measured from event timestamps against `SHUTDOWN_WINDOW.min = GRACE_MS − 1000`. It undershot by 20 ms, a timer-and-timestamp tolerance that tool names cannot reach.
  - Worker-idle timeout: seen under high host load (load averages up to 77 in the summaries), with the scripted AGY CLI.
- Under TESTING.md Rule 9 this is a pre-existing intermittent failure that needs an owner, so I recorded it as follow-up FU-T1.

## Findings

None.

## Follow-ups

These pre-existing failures were seen during this ticket's API/E2E run on both branch and base. They do not fail this review.

| Follow-up ID | What is wrong, where | Evidence | Why it is outside this ticket | Suggested Task description |
| --- | --- | --- | --- | --- |
| FU-T1 | `autobyteus-server-ts/tests/e2e/projects/task-copy-idle-lifetime.e2e.test.ts` (gated AGY e2e) is intermittent. Signatures: (a) `delegated:false, "Antigravity model discovery timed out"` from `delegate` (line ~313); (b) the quiet-copy shutdown measured 20 ms under `SHUTDOWN_WINDOW.min` (58980 < 59000); (c) a worker-idle signal timeout. Most visible under host load. | `evidence/alternating-idle-lifetime-summary.txt`, `idle-lifetime-lowload-{base,branch}-summary.txt`, `lowload-*.log`, `base-task-copy-idle-lifetime-run*.log`; base 2/11 fail, branch 4/10 (p≈0.36) | Fails on base 35eacddb25. The change touches no idle, lifecycle or AGY discovery code. | Make `task-copy-idle-lifetime` e2e deterministic: find why scripted-AGY model discovery times out under load (timeout budget or discovery caching in the gated fixture), and compare the shutdown window's lower bound with the event-timestamp vs timer measurement (20 ms undershoot). Per TESTING.md Rule 9. |
| FU-T2 | Web probe `autobyteus-web/tests/e2e/projects-feature-probe.mjs` PT-E2E-005..011 fail at a 390 px layout assertion, then cascade | execution report "Failures And Out-Of-Scope Observations"; base fails the same cases | Pre-existing web UI/probe; this ticket only changed tool names in the probe | Investigate the 390 px layout assertion in projects-feature probe PT-E2E-005..011 and fix the UI or the stale probe expectation |
| FU-T3 | Web probe `project-manager-ux-probe.mjs` PMU-002 and PMU-021 fail only in full runs and pass alone; PMU-021 also fails on the base in a full run | execution report, same table | Pre-existing order or state dependence in the probe | Find the cross-case state leak that makes PMU-002/PMU-021 fail in full project-manager-ux runs and isolate the cases |

- Sent to: `/project_task_manager` (the requirements doc's "Requested by"). The message reference is recorded in `code-review-revision-record.md` CRR-002. Confirmed as Project Tasks (TODO): FU-T1 → `project_task_7e13a4af-67bb-409b-a2ec-9fc594ff816b`; FU-T2 and FU-T3 → `project_task_a1dfb6dc-0bc2-4e16-a6e7-4c288d9d4887`.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/unit/agent-tools/mcp/agent-tool-mcp-catalog.test.ts`, `autobyteus-server-ts/tests/e2e/projects/project-task-boundaries.e2e.test.ts`
- Unresolved finding IDs: None
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - The two durable test changes are uncommitted on top of `0f89e845f0`, and delivery should include them.
  - Carry-over for delivery: OBS-001 (stale `#exactly-four-agent-tools` anchors and "four Project/Task tools" wording) and FU-1 release coordination.
  - Residual risks noted by API/E2E (no blocker):
    - AC-007 is proven at session and unit level only, with no real agent launch.
    - The AutoByteus-native runtime is proven at unit level only.
    - Real-AGY L01/L02 are blocked by quota.
