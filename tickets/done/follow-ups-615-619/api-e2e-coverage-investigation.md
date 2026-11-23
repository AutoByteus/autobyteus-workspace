# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-001)
- Investigation Notes: `investigation-notes.md`
- Design Spec: `design-spec.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Design / Code Review: N/A (direct route)
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001` (on completion)
- Current Investigation Round: 1
- Trigger: implementation handoff IR-001 (Medium / Low, direct route), message from `/implementation_engineer`
- Code validated: branch `codex/follow-ups-615-619`, code `233f813d19` (records `9cc05e4816`; this stage's TESTING.md `99a45cc1a0`), base `origin/personal` `dad158474c`

## Current Requirement And Design Basis

I-1b (product): the Memory page's team-root lists leave out an Org's Team units (REQ-002). I-1a/I-1c: upgrade startup tests start from a faithful ledger (REQ-001). I-2: `restoreByMemberMessage` waits for its own acknowledgement (REQ-003). I-3: SR-016 one root form (REQ-004). I-4: unique design case numbers (REQ-005). AC-006 is delivery's.

## Supported Scenarios And Real Usage

- SCN as designed; SCN-002 (an Org's Team unit with memory) is the GraphQL boundary that changed; the web reads the same fields unchanged, so no rendered check is needed for it.
- Environment hazard recorded by the implementation (FU-003): agent shells carry the founder's `AUTOBYTEUS_*` roots and `DATABASE_URL`; every run of this stage is under `env -i`. Earlier stages: my rendered probes of 554/576/579 ran without `env -i`; a read-only name search of the founder's data and memory folders (`find -iname` for the probes' names) found nothing of theirs.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| the four users of `faithful-upgrade-ledger.ts` | faithful upgrades | AC-001 | Still Valid | IMP-03…07, IMP-10/11 | Rerun once clean on a fresh build |
| `memory-collaboration-graphql` | team lists, Org units | AC-002 | Still Valid | IMP-08/09 | Rerun |
| the users of `restoreByMemberMessage` (6 ungated, 1 live) | restore by a member message | AC-003 | Still Valid | IMP-10/11, IMP-13/13b (whole suites, clean) | Rerun the ungated ones; the live one needs a live CLI |
| SR-016 | one root form | AC-004 | Still Valid | IMP-01/02 | Reuse |
| whole server suite ×2 (clean) | regression, AC-003 | — | Still Valid | IMP-13, IMP-13b (`233f813d19`) | Reuse |
| other startup E2E files on an empty ledger (e.g. `raw-trace-manifest-runtime-names`, the `remove-*` files) | their migration | — | Still Valid as tests (they pass); not faithful upgrades by the new TESTING.md rule | — | Follow-up to convert them (not this ticket's) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-00 | — | fresh server build | — | `rm -rf dist; build` | built-server E2E |
| API-01 | AC-001…AC-005 | reused checks | Reused | IMP-01…IMP-15 | on the code under test |
| API-02 | — (TESTING.md) | the faithful-ledger rule | Durable doc | `99a45cc1a0` | the implementation's hint; a general rule |
| API-03 | AC-001…AC-003 | the files the changes reach | Existing | `env -i … vitest run <files>` | one clean run on the final state |
| API-04 | AC-005 | design cases | grep | `grep "^### Case" docs/design-cases.md` | review |

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| `agy-runtime-stop-recovery-live` (a user of the changed helper) | needs a live Antigravity login | low: the helper's wait is unit-tested with a scripted stream and its other six users pass | No | — |
| AC-006 | delivery's | — | No | delivery |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (TESTING.md)
- Reroute Required Before Validation Execution: `No`
