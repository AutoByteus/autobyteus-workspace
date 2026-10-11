# API/E2E Test Review Report — delegated-copy-task-locator

## Review Meta

- Review Round: `1`
- Trigger: API/E2E Pass, `API-REV-001`, from `/software_engineering_team/api_e2e_engineer`; proportional test-code review requested
- Requirements Doc Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/requirements-doc.md` (Approved, SR-002)
- Investigation Notes Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/investigation-notes.md`
- Solution Revision Record Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/solution-revision-record.md` (SR-001..SR-004)
- Design Spec Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/design-spec.md` (SR-004)
- Supplemental Task Artifacts Reviewed As Context: Product `ui-ux-spec.md` (read only)
- Architecture Review Revision Record Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/implementation-revision-record.md` (IR-001)
- Original Code Review Report: `tickets/in-progress/delegated-copy-task-locator/code-review-report.md` (CRR-001, Pass)
- Code Review Revision Record: `tickets/in-progress/delegated-copy-task-locator/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-002`
- Coverage Investigation: `tickets/in-progress/delegated-copy-task-locator/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `tickets/in-progress/delegated-copy-task-locator/api-e2e-execution-coverage-report.md`
- API/E2E Revision Record Reviewed As Context: `tickets/in-progress/delegated-copy-task-locator/api-e2e-revision-record.md` (API-REV-001)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
  - PMU-001..PMU-025: 25/25 (`api-e2e-evidence/pmu-full/evidence.json`, result `Pass`, no failures);
  - task-closure-tree: 10/10;
  - fixture probes after the C-002 fixes;
  - isolated desktop smoke.
- Final Validation Confidence: 95 %
- Prior unresolved test-review findings rechecked: none (first test review). CRR-001's held candidate C-002 is closed by this round (see below).
- Project testing guideline(s) applied: root `TESTING.md`, in its rewritten form from this round (user-directed). No conflict with this skill's test-review rules.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-001..SCN-014; DEC-006 close-race edge).

All paths are relative to `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-task-locator`. The changes
are uncommitted on top of `4de754ba7`.

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs` | Added | PMU-020..025; REQ-001..REQ-012, AC-001..AC-020, QR-001 | Task summaries in the tree and "Show Task in Projects", on the PMU-owned real stack | One module, one surface; it uses the probe's helpers by injection |
| `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs` | Updated | — | Registers PMU-020..025; `newPage` gains a `locale` option | Minimal |
| `autobyteus-web/tests/e2e/fixtures/task-worker-boundaries.mjs` | Added | DS-001 / DS-003 boundaries for fixture pages | Shared helper: `GetTaskWorkerTasks` answers "no Task"; the `/ws/projects` feed sends `connected` only | Registered on the same target (page or context) as each probe's own routes, so it takes precedence and falls back for other operations |
| `autobyteus-web/tests/e2e/{nested-team-hierarchy,nested-team-aggregate-status,background-agent-renderer-contention,team-group-icon,task-agent-peer-sidebar}-probe.mjs` | Updated | C-002; QR-003 one-line baselines | Supply the new boundaries through the helper | 3-line change each |
| `autobyteus-web/tests/e2e/task-agent-peer-sidebar-probe.mjs` | Updated (baseline fix) | TESTING.md Rule 9 | The fixture answers `GetRunFileChanges` with `[]` | It failed on base too; the commit is suggested separately |
| 5 fixture pages `autobyteus-web/tests/e2e/fixtures/*.page.vue` | Updated | C-002 contract conformance | Add `onOpenTeamRun` to each `WorkspaceHistorySectionActions` object | The background-contention fixture expands the team; the others are no-ops, matching their `onSelectTeam` style |
| `autobyteus-server-ts/tests/e2e/projects/project-mutation-node-locality.e2e.test.ts`, `autobyteus-server-ts/tests/e2e/runtime/agy-native-tool-arguments-transport.e2e.test.ts` | Updated (header comment only) | TESTING.md relocation | Purpose and command now live in the test header | No behavior change |

- No durable test file changed: `No`
- Out of scope for this review (documentation, not test code):
  - the `TESTING.md` rewrite (user-directed);
  - 7 doc links repointed.

  As a spot check, every link in the new `TESTING.md` resolves, and no remaining `TESTING.md#…` anchor in the repo
  points at a removed section. Delivery owns the docs sync.

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | One function per case. Each docblock names its ACs and REQs, and the case titles in the registry list what is proven |
| Assertions prove approved requirements instead of incidental implementation details | Pass | DOM / computed-style / GraphQL / board-state assertions on REQ values: 11/16 px, `#808080`, 46/28 px, elbow and chevron at 14 px, picker, the `data-located` card, focus, Cancelled lane, slate-300 ring, en/zh-CN strings, unchanged center and tree selection. Screenshots are supporting evidence only |
| Fixtures, setup, helpers, and data builders reuse meaningful repetition | Pass | The probe's existing helpers are injected. One shared `setupLocator` fixture is created lazily and reused by cases that only read it. PMU-024 builds its own Projects and run because it mutates and deletes. The fixture-boundary helper is shared by five probes |
| Test isolation and determinism are appropriate for the exercised boundary | Pass | Each case opens a fresh browser context. Waits are mostly `until` polls. The fixed sleeps are short settling pauses or the deliberate 3 s negative window while the feed is cut. PMU-020's batch assertion (≤ 6 reads, at least one covering ≥ 4 workers; no per-row or per-Project list reads) is suitably tolerant of real interest timing |
| Large files remain coherent and navigable rather than mixing unrelated scenarios | Pass | The 613-line module covers one surface; the 1,900-line probe gains only a registry spread |
| No stale, duplicated, disabled-without-reason, or compatibility-only tests remain | Pass | None. The implementer's `implementation-evidence/locator-*.mjs` scripts stay as ticket evidence, not durable tests, and PMU-020..025 replace them |
| Added, updated, and removed coverage agrees with the coverage investigation and execution evidence | Pass | It matches the "Durable Coverage To Add / Update" plan, with two disclosed deviations. PMU-023's Team host enters from the Projects page instead of the Skills page; both lack a right panel. Backend-restart reconnect is not separately driven: the execution report records it as covered by the same `connected` path as the socket loss |
| Test callers and fixtures exercise an independently established supported scenario rather than proving one by themselves | Pass | Copies, assignments, follow-ups and closures are created by the real `delegate_task` / `send_message_to` / `create_or_update_task` tools through the scripted AGY actor. Every scenario maps to an approved SCN |
| Each test enters through its scenario's real trigger and follows the real actor's or event's steps, without a setup real use does not produce | Pass | Every locate starts from a real summary click, Enter or Space in the tree, and runs open from the tree as a user does. PMU-024's two network emulations are realistic delivery conditions. Cutting `/ws/projects` is a network loss. Holding the run's collaboration-stream frames, in order, from the closure frame on is latency, used to reach the approved DEC-006 / REQ-007 "closed just before the click" edge. The state is real: the Task is CANCELLED on the server, and the feed reaches the board |

## Findings

None.

Closure of CRR-001's held candidate C-002:
- Every fixture page now implements `onOpenTeamRun`.
- Fixture pages with task rows get the two boundaries they now reach through `task-worker-boundaries.mjs`.
- The affected probes pass, as do the base comparisons, except three that fail identically on base. The API/E2E
  engineer reported those to their owners under Rule 9: the NTAS-BR-002 leave-timing assertion, the BG-BROWSER-004
  depth expectation, and the team-activity fixture that never renders.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed:
  - `autobyteus-web/tests/e2e/project-manager-ux-task-locator-cases.mjs`
  - `autobyteus-web/tests/e2e/project-manager-ux-probe.mjs`
  - `autobyteus-web/tests/e2e/fixtures/task-worker-boundaries.mjs`
  - the five fixture probes
  - the five fixture pages
  - the two server e2e test headers
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes:
  - Classification `Large` / `High` preserved.
  - Suggested commit split, from the API/E2E engineer:
    1. tests;
    2. baseline fix;
    3. `docs(testing):`.
  - Open after delivery:
    - RSK-001: rebase onto the aggregate-status branch, then re-run the row specs, PMU-018..021 and 023, and nested-team-aggregate-status;
    - the three reported base-failing probes.
