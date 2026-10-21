# API/E2E Test Review Report — autobyteus-247 Remote Agent Teams

`…` = `/Users/normy/autobyteus_org/autobyteus-worktrees/remote-agent-teams/tickets/in-progress/remote-agent-teams`

## Review Meta

- Review Round: 1
- Trigger: API/E2E round 2 Pass (API-REV-002, code `351b4dd93f`, dist rebuilt at `8df22369d9`, evidence commit `945c1f2b2c`)
- Requirements Doc Reviewed As Context: `…/requirements-doc.md` (AC-301 … AC-306)
- Investigation Notes Reviewed As Context: `…/validation-cases.md`, as cited by the coverage investigation
- Solution Revision Record Reviewed As Context: `…/solution-revision-record.md` (SR-006)
- Design Spec Reviewed As Context: `…/design-spec.md` (SR-006)
- Supplemental Task Artifacts Reviewed As Context: `…/follow-ups.md` (FU-001 … FU-003)
- Architecture Review Revision Record Reviewed As Context: `…/architecture-review-revision-record.md`
- Implementation Revision Record Reviewed As Context: `…/implementation-revision-record.md` (IR-002)
- Original Code Review Report: `…/code-review-report.md` (CRR-003 Pass)
- Code Review Revision Record: `…/code-review-revision-record.md`
- Current Code Review Revision ID: `CRR-004`
- Coverage Investigation: `…/api-e2e-coverage-investigation.md`
- Execution Coverage Report: `…/api-e2e-execution-coverage-report.md` (Round 2 section)
- API/E2E Revision Record Reviewed As Context: `…/api-e2e-revision-record.md` (API-REV-001, API-REV-002)
- Delivery Revision Record Reviewed As Context: N/A
- API/E2E Result: `Pass`
  - two-server E2E 24/24 twice (runs 4 and 5);
  - F-001 unit tests 13/13;
  - API-25 (same-node suites with the switch on) 44/45, the one failure being 191's FU-003;
  - API-26 (browser on beta) still valid.
- Final Validation Confidence: as reported by API/E2E in the execution report
- Prior unresolved test-review findings rechecked: none (first test review)
- Project testing guideline applied: `TESTING.md` (gated suite, clean environment, test-owned temp data and ports, assertions first). No conflict.
- Supported Product Scenario Basis Confirmed: `Yes` (SCN-301 … SCN-305)

## Changed Durable Test Scope

| Durable Test Path | Change | Related Scenario / Requirement | Coherent Test Responsibility | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | Updated (`d69676f1d4`, `945c1f2b2c`) | AC-301 … AC-306; slice 1 and 245 cases kept | Remote collaboration between two real server processes, now including remote Agent Teams | New RC-21, RC-22, RC-23 and RC-24. RC-04, RC-12, RC-13, RC-20 and the probe bodies are adapted to `targetRoot`. |

The unit tests `collaboration-result-contracts.test.ts` and `task-delegation-runtime-descriptions.test.ts` came with the implementation fix (IR-002) and were reviewed in CRR-003. They are not part of this review.

- No durable test file changed: `No`

## Proportional Test-Code Checks

| Check | Result | Evidence / Notes |
| --- | --- | --- |
| Scenario grouping and names make intent clear | Pass | Each case names its ticket and criteria (`RC-21 247 AC-301`). The header documents beta's Teams: Studio Team (own default plus the Team default), Hollow Team and Codex Team, and why `alt-model` exists. |
| Assertions prove approved requirements instead of incidental details | Pass | RC-21 checks the exact result key set with `node` as a hard assertion (REQ-304). It also checks: the Team link's exact on-disk keys beside an Agent link; the Task record `{kind: team, coordinatorAgentRunId}`; `delegatedFrom` on beta's tree; only the coordinator launched; members' models from own default and Team default, with the temp workspace and auto-approve (REQ-302, REQ-303); and beta's history. RC-22 covers the coordinator and a never-started member both ways (started on its Team-default model), each message once in both Team logs, the exact team-run-ID guidance, not-permitted and live-only refusals with nothing sent, and the CR-001 view check (non-vacuous: `sequenced > 0`). RC-23 covers a saved Task to the running copy and to a new remote Team, nothing sent or started, and after DONE refusals both ways while the Team keeps running (fence, not stop). RC-24 covers the owner's Stop, inactive in history, then restore. RC-20 checks `targetRoot` on every message kind and no `coordinatingRun` in messages. |
| Fixtures, setup, helpers reuse meaningful repetition | Pass | `betaTeamDefinition`, `betaTeamRunDirs`, `betaTeamTree`, `teamTaskResourcesWith`, plus the existing actors and `assertBothLogs` |
| Isolation and determinism appropriate | Pass | `AGY_FAKE_EXTRA_MODELS` makes the Team-default model deterministic; Codex is unavailable by a missing command; cleanup is clean in both receipts. RC-12 records rather than asserts that R1 is live at start, because the Team cases now run earlier; the subsequent single `--conversation` relaunch still proves the shutdown and restore. |
| Large file stays coherent | Pass | One surface; the Team cases are grouped |
| No stale, duplicated or compatibility-only tests | Pass | The interim `REMOTE_TEAMS_NOT_SUPPORTED` case is replaced. The probes use `targetRoot`. The RC-21 `expect.soft` became a hard check after F-001. |
| Coverage agrees with the investigation and evidence | Pass | The run 5 receipt shows RC-21's `delegated` with `node: "beta-node"`, the exact keys, and clean cleanup |
| Callers exercise independently established scenarios | Pass | Every case traces to SCN-301 … SCN-305 |
| Each test enters through its real trigger | Pass | Real `delegate_task` and `send_message_to` tool calls, GraphQL owner actions (definitions, `terminateAgentTeamRun`), and real restarts |

## Findings

None.

Non-blocking notes, at the API/E2E owner's discretion:
- RC-13: the Studio Team's reply after alpha's restart arrives after R2's reply has already restored alpha's Team root and woken the lead (the same delegator), as you noted. So the E2E proves routing through the restored Team link, but not a cold restore of A's root and wake of the delegator caused by a Team link alone. The in-process unit test (`team-remote-delegation.test.ts` AC-304) covers that path. Sending the Studio reply first, before R2's, would make the E2E prove it too.
- RC-04 pins the FU-002 wording ("The Agent Codex Team …"). When FU-002 is done, this assertion changes with it, which is the right coupling.

## Follow-ups

- Follow-ups this review added: None.

## Latest Authoritative Result

- Result: `Pass`
- Changed durable test paths reviewed: `autobyteus-server-ts/tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts`
- Unresolved finding IDs: none
- Recommended Recipient: `/software_engineering_team/delivery_engineer`
- Notes: Classification `Large` / `High`. Source review CRR-003 Pass (F-001 resolved). Residuals for delivery: RSK-201 (every member auto-approves, accepted), RSK-301, and FU-001 … FU-003. C-1 (the `startedTeams` `WeakMap`) is an optional implementation note.
