# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001, REQ-002, AC-001..AC-005); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `solution-designer-handoff.md`, `follow-ups.md`
- Design Review / Architecture Review / Code Review reports: `N/A — not applicable` (Small / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IMP-01..03); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1; Trigger: implementation engineer's direct-route handoff, code commit `79b268d2f9`, branch tip `747f2ae65d` (documents only after the code commit)
- Prior Investigation Reviewed: none

## Current Requirement And Design Basis

A registered Agent root (it lingers after a host crash) captured the host's inherited launch once; a stopped-run edit changed the host's saved selection but not the root's, so copies delegated afterwards from the lingering root inherited the OLD launch. The change: the root keeps the launch in one mutable field; `AgentRunService.updateStoppedSelection` calls `refreshInheritedLaunch` on `UPDATED`; the manager also re-reads it in `resolveRootAndEnsureHost`. Required: AC-001 copy carries the saved model (model-only edit, undo alike); AC-002 a runtime change is inherited and the host's marker waits for its next input; AC-003 edit during root load; AC-004 edit allowed offline, refused live; AC-005 no root registered, unchanged.

## Supported Scenarios And Real Usage

- Designer scenario covered: SCN-001. Real trigger: the Settings save (`updateStoppedAgentRunSelection`) of a crashed host, then a delegation by a surviving copy through the root (a copy's chat composer posts through the Agent-collaboration stream and the delegation does not pass the manager's `resolveRootAndEnsureHost`).
- Not tested: none recorded as unsupported.

## Changed Behavior Summary

| Behavior | Change | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Root's inherited launch follows the saved edit | Changed | REQ-001, AC-001/002 | built-server SRE-01/02; unit (IMP-02) |
| Edit allowed offline, refused live | Preserved | REQ-002, AC-004 | SRE-03 (live refusal) |
| Edit during root load, no root | Changed / Preserved | AC-003, AC-005 | unit only (not stageable on a built server) |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Risk Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | root, manager, service | unit tests with real classes and a fake host | real host process crash, real GraphQL edit, real delegation | Built server |
| API / transport | Yes (indirect) | `updateStoppedAgentRunSelection` mutation reaches the refresh | none at API level | wiring from the mutation to the root | Built server |
| Process / lifecycle | Yes | host crash with a surviving root | unit `host.crash()` fixture | a real killed process | Built server |
| Frontend, browser, desktop shell, persisted data, worker, external | No | | | | |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check` (branch `codex/stopped-run-edit-root-check`)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/stopped-run-edit-root-check/TESTING.md` (Server E2E on a test-owned server and database; gated runtime suites; mutation checks on compiled output); `DESIGN.md`; `AGENTS.md`
- Conflicts: none. Secrets: none needed.

| Component | Directory | Setup | Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Built server | `autobyteus-server-ts` | `pnpm build`; `startBuiltTestServer` in the test | owned `runtimeRoot` and database, scripted Antigravity CLI, LM Studio stand-in | `/rest/health` | `server.stop()`, `removeOwnedTestRuntime` |

Data/fixtures: synthetic definitions through GraphQL; the host's process pid comes from `AGY_FAKE_PROCESS_LOG`; nothing touches `~/.autobyteus`.

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/unit/standalone-agent-run-root/standalone-root-inherited-launch.test.ts` | AC-001..005 on real classes | all | Still Valid | IMP-01 (fails on base), IMP-02 | keep |
| `tests/unit/agent-execution/agent-run-restore-service.test.ts` (3 cases) | the service call and outcomes | AC-004 | Still Valid | IMP-02 | keep |
| `tests/e2e/projects/delegated-copy-member-contact-host.e2e.test.ts` | copies and host contact | regression | Still Valid | API-03 | keep |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| IMP-03 | AC-005 | server unit, typecheck, integration | Reused | implementation check IMP-03 | code unchanged since its commit `79b268d2f9` (`git diff 79b268d2f9 747f2ae65d -- . ':!tickets'` is empty) |
| API-02 | AC-001..005 | unit | Existing Test | focused unit suites | independent rerun |
| API-01 (SRE-01..03) | AC-001, AC-002, AC-004 | built server | Durable | host delegates copy one; kill the host process; refuse-live check; edit model; copy one delegates copy two; edit to native; copy three; host's next input | the staging the design left to API/E2E |
| X-A..X-C | AC-001 | mutation of `dist/` | Temporary Probe | break the manager refresh, the root setter, the service call | prove the case can fail |
| API-03 | regression | built server | Existing Test | copy-contact-host e2e | neighbouring root behavior |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-01 | `autobyteus-server-ts/tests/e2e/runtime/stopped-run-edit-root-built-server.e2e.test.ts` | real crash, real GraphQL edit, real delegation through a surviving root; the unit fixture cannot show the wiring |

Durable coverage to update / remove: None.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-Up |
| --- | --- | --- | --- | --- |
| AC-003 (edit while the root loads), AC-005 (no root) on a built server | a root's load window is microseconds and "no root" is the default state of every other edit test | low; unit-covered with real classes | No | none |
| The manager's heal in `resolveRootAndEnsureHost` | any user message to the host goes through it, so it cannot be isolated from the refresh on a built server | low; unit test "the next use of the root heals a missed refresh" | No | none |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes` (one file); reroute: `No`.
