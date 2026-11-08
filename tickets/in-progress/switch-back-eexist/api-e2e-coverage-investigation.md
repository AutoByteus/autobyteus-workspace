# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..004, AC-001..AC-007); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md`; Design Spec: `design-spec.md`
- Supplemental Task Artifacts: `solution-designer-handoff.md`, `follow-ups.md`
- Design Review / Architecture Review / Code Review reports: `N/A — not applicable` (Small / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IMP-01..06); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1; Trigger: the implementation engineer's direct-route handoff, code commit `9833f51bf9`, branch tip `4408d54504` (documents only after the code commit)
- Prior Investigation Reviewed: none

## Current Requirement And Design Basis

`createAgyRunCapsule` made `<memoryDir>/agy-project` with an exclusive `mkdir`; the first Antigravity era leaves it behind, so a second Antigravity era of the same run (a switch back, or the retry of a start that failed after the capsule was made) failed with `EEXIST`, leaving the run with a pending switch it could never complete. The change removes the run's own capsule folder first (`fs.rm` recursive, force), keeping the exclusive writes. Required: AC-001 standalone A→B→A; AC-002 Team member; AC-003 native→Antigravity→native and a fourth hop; AC-004 the stuck state completes at the next message; AC-005 a start that fails after the capsule was made is retried; AC-006 a leftover capsule with a skill link leaves the link target and the workspace intact; AC-007 Restore in its own era unchanged. The implementer asked API/E2E for a live Antigravity switch back and a restart between the save and the message of the third hop; the requirements name Team members, Org members and delegated copies as users of the switch.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (standalone), SCN-002 (Team member), SCN-003 (a failed start, retried). Real-use scenarios added: an Org member (direct, and nested in a mounted Team), a delegated copy, a server restart between the save and the message of the return, a real `agy` switched away from and back.
- Not tested: none recorded as unsupported.

## Changed Behavior Summary

| Behavior | Change | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| A second Antigravity era starts on a fresh capsule | Changed | REQ-001, AC-001..005 | built-server SB-01..03, RS-09, MS-05; live LV-01; unit |
| Link target and workspace untouched | Preserved | REQ-002, AC-006 | unit (6 capsule cases) |
| Restore reads its own era's capsule | Preserved | AC-007 | unit; agy-linked-skills-transport e2e |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Changed Boundary | Repository Evidence | Risk Not Exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Antigravity capsule creation on every Antigravity start | unit tests; standalone and Team built-server cases (RS-09, MS-05) | Org member, delegated copy, restart, failed-start retry, real `agy` | Built server; Live API |
| Process / lifecycle | Yes | restart between save and message; failed start then retry | none for members | the sequence on a real server | Built server |
| External integration | Yes | the real Antigravity CLI | none (scripted only) | its real use of the fresh capsule | Live API |
| Frontend, browser, desktop shell, API shape, persisted data | No | | | | |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist` (branch `codex/switch-back-eexist`)
- Testing guideline: `/Users/normy/autobyteus_org/autobyteus-worktrees/switch-back-eexist/TESTING.md` (Server E2E on a test-owned server and database; gated runtime suites; the "Antigravity CLI (`agy`) sign-in state" and "Clean environment elsewhere" notes for live runs; Rule 9 on failures); `DESIGN.md`; `AGENTS.md`
- Conflicts: none. Secrets: none read (live runs use the CLIs' own sign-in; no vault key needed).

| Component | Directory | Setup | Notes | Readiness | Cleanup |
| --- | --- | --- | --- | --- | --- |
| Built server | `autobyteus-server-ts` | `pnpm build`; `startBuiltTestServer` in each test | owned `runtimeRoot` and database | `/rest/health` | `server.stop()`, `removeOwnedTestRuntime` |
| Real `agy` 1.5.3 and `claude` | host login, real HOME/USER/LOGNAME | none | the installed `agy` kept no separate token file here, so the live run uses the host login (TESTING.md), and adds conversations to the user's `agy` and `claude` histories | the test's first turn | not removable by me |

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `runtime-switch-native-built-server.e2e.test.ts` (RS-01..09) | standalone switches incl. four hops (RS-09) | AC-001, 003 | Still Valid | IMP-02 fails on base, IMP-03 | rerun |
| `runtime-switch-members-built-server.e2e.test.ts` (MS-01..05) | Team member incl. MS-05 return | AC-002 | Still Valid | IMP-01 | rerun |
| `runtime-switch-members-extended-built-server.e2e.test.ts` (EX-01..05) | Org, copy, restarts | preserved | Still Valid | | rerun |
| `tests/unit/.../agy-run-capsule.test.ts`, `agy-agent-run-backend-factory.test.ts` | capsule replace, link, workspace, retry | AC-004..007 | Still Valid | IMP-06 | rerun focused |
| `agy-linked-skills-transport`, `agy-failure-transport`, `delegated-copy-model-change` e2e | skill links in the capsule; failures; copies | AC-006, regression | Still Valid | | rerun |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01, API-02 | AC-001..003 | built server | Existing Test | the three runtime-switch suites on a rebuilt server | independent rerun of IMP-03/04 |
| API-03 (SB-01..03) | AC-001, 002, 004, 005 | built server | Durable | Org member A→B→A with restart then a start that fails after the capsule was made, then retry (the nested worker too); copy A→B→A; Team member A→B→A with restart | member kinds and the failed-start retry on a built server, which the implementer could not stage |
| API-04 (LV-01) | AC-002 | live real `agy` + `claude` | Durable (gated) | Team member Antigravity → Claude → Antigravity; I-7 on both segments | the real CLI uses the fresh capsule |
| X-A, X-B | AC-001 | mutation of `dist/` | Temporary Probe | remove the `fs.rm` from the compiled capsule; run API-03 and API-04 | prove they fail on the base behavior |
| API-05 | AC-006, regression | e2e | Existing Test | linked-skills, failure transport, delegated-copy e2e | neighbours of the capsule |
| UNIT | AC-004..007 | unit | Existing Test | the Antigravity unit folder | independent rerun of IMP-06 |
| IMP-06 | all | full unit, typecheck | Reused | implementation check IMP-06 | code unchanged since its commit |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| SB-01..03 | `autobyteus-server-ts/tests/e2e/runtime/agy-switch-back-built-server.e2e.test.ts` | Org member, copy, restart and failed-start retry on the built server |
| LV-01 | `autobyteus-server-ts/tests/e2e/runtime/agy-switch-back-live.e2e.test.ts` | the real Antigravity CLI returned to |

Durable coverage to update / remove: None.

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only? | Follow-Up |
| --- | --- | --- | --- | --- |
| Live Antigravity ↔ Codex | the Codex account is at its usage limit until 2026-11-10 (the first live attempt failed with "You've hit your usage limit" on the Codex turn); Claude was used as the other runtime | none specific to the change | No | none |
| Live Org member and delegated copy returns | one live member kind is enough for the real-CLI question; the member kinds share one activation path and are built-server covered | low | No | none |
| The user's stuck run on node 8001 | not read, by the requirements' constraint; its state is exactly the state before the message in RS-09 / MS-05 / SB-01 | low | Yes (the user's own data) | delivery tells the user it completes at its next message after the update |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`.
