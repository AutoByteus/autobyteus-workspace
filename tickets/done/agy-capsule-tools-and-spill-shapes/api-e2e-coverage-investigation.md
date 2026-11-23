# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..003, AC-001..003); Investigation Notes: `investigation-notes.md`; Solution Revision Record: `solution-revision-record.md` (SR-001, SR-002); Design Spec: `design-spec.md`; Supplemental: `solution-designer-handoff.md`, `follow-ups.md`
- Design / Architecture / Code Review reports: `N/A — not applicable` (Small / Low, direct route)
- Implementation Handoff: `implementation-handoff.md` (IMP-01..07); Implementation Revision Record: `implementation-revision-record.md` (IR-001)
- API/E2E Revision Record: `api-e2e-revision-record.md`; Current API/E2E Revision ID: `API-REV-001`
- Round 1; Trigger: implementation engineer's direct-route handoff, code `0f74222c52`, tip `b55965acf0` (documents only after the code commit); Prior investigation: none

## Current Requirement And Design Basis

The capsule's agent.md `tools:` allowlist stays the CLI's eight registry names (SR-001's alias list failed live with "tool name conflict"; SR-002 replaced it). New: when the CLI's start message carries a `tools` array and a name of the allowlist is missing from it, the factory logs one `AGY_CAPSULE_TOOL_NOT_IN_REGISTRY run=<id> names=<list>` warning; no `tools` field or all names present: nothing; never fails or delays the start. Left to API/E2E: the optional live run through the built server (no warning, the agent can read, write, edit and run a command) and any gated transport check.

## Supported Scenarios And Real Usage

SCN-001 (a new Antigravity start). Real trigger: a run start on the built server with the real agy; the warning case needs a registry that lacks a name, which only a scripted CLI can give.

## Changed Behavior Summary

| Behavior | Change | Coverage |
| --- | --- | --- |
| Allowlist unchanged (REQ-001) | Preserved, comment and doc clarified | policy unit test, LIVE CR-04 (the agent has its tools) |
| Warning on a missing registry name (REQ-002) | Added | factory unit tests, scripted built-server CR-01..03 |

## Changed Surface And Boundary Classification

| Surface | Affected? | Boundary | Evidence available | Risk not exercised | Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | Antigravity backend factory start | unit tests | the warning through a real server's log; the real CLI's start | Built server (scripted), Live API |
| External integration | Yes | the real agy start with the capsule | implementer's probe | through the built server | Live API |
| Other surfaces | No | | | | |

## Project Execution Discovery

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/agy-capsule-tools-and-spill-shapes`; testing guideline `TESTING.md` (server e2e on a test-owned server, scripted AGY, the host `agy` login with the real HOME when no separate token file exists, live runs add conversations to the user's agy history); `DESIGN.md`; `AGENTS.md`. Conflicts: none. Secrets: none.
- Component: built server (`startBuiltTestServer`), whose captured output (`server.output()`) holds the warning.

## Existing Durable Coverage Inventory

| Path / Test | Decision | Action |
| --- | --- | --- |
| `tests/unit/.../agy-native-tool-policy.test.ts`, `agy-agent-run-backend-factory.test.ts` | Still Valid | rerun (Antigravity unit folder) |
| scripted AGY e2e files | Still Valid | five rerun as regression |

## Planned Cases

| Case ID | Criteria | Surface | Kind | Steps |
| --- | --- | --- | --- | --- |
| IMP-04..07 | AC-001..003 | live probe, typecheck, unit | Reused (typecheck and full unit suite); IMP-04's live probe is complemented by CR-04 | code unchanged since `0f74222c52` |
| API-01 | AC-002 | scripted regression | Existing Test | a scripted AGY e2e file: what does the warning do in existing scripted runs? |
| API-02 | AC-002 | built server, scripted CLI | Durable | CR-01 lacks one name; CR-02 all present; CR-03 no field |
| API-03 | AC-003 | built server, real agy | Durable (gated) | CR-04, twice |
| X-A | AC-002 | mutation of `dist/` | Temporary Probe | remove the warning; CR-01 must fail |
| API-04 | regression | five scripted e2e files, unit, typecheck | Existing Test | |

- Test progress log needed: `Yes`

## Durable Coverage To Add

`autobyteus-server-ts/tests/e2e/runtime/agy-capsule-tool-registry.e2e.test.ts` (CR-01..04) and an `AGY_FAKE_INIT_TOOLS` knob in `tests/fixtures/agy-failure-cli.mjs` (default now the eight registry names).

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk |
| --- | --- | --- |
| A real CLI whose registry lacks a name | agy 1.5.15 lists all eight; no other version available | none beyond the scripted case; the check is a membership test |

## Ambiguities Or Reroute Triggers

None

## Investigation Decision

- Proceed: `Yes`; durable coverage added: `Yes`; reroute: `No`.
