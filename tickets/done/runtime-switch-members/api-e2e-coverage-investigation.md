# API/E2E Coverage Investigation

The plan for autobyteus-348 (agent runtime switch of Team members, Org members and delegated copies). Results, confidence and the decision are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (REQ-001..009, AC-001..010, SCN-001..006)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md`; member record contract: `switch-member-record-contract.md`
- Supplemental Task Artifacts: `follow-ups.md`, `task-follow-ups-316.md`, `solution-designer-handoff.md`
- Design Review Report: `design-review-report.md`
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IMP-01..13)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 Pass)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: round 2: code reviewer's request after Source review CRR-004 Pass (review commit `d7e63493e7`), following my round-1 Fail and the rework IR-002/IR-003; `Large` + `High`. Round 1 trigger: CRR-001 Pass, review commit `3261712e06`
- Prior Investigation Reviewed: round 1 (this file before this update) (the autobyteus-316 validation of the standalone Agent is the precedent; `runtime-switch-live.e2e.test.ts`, `runtime-switch-probe.mjs`)
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

A stopped Team member, a stopped Org member (a direct Agent, or an Agent of a mounted Team) and a stopped delegated copy (Agent copy, or a member of a Team copy) can switch agent runtime. The save records a pending switch on that member (Team/Org tree node, or the copy's own file). The first input from anyone activates it: ticket with the watermark, candidate prepared, one `runtime_switch` segment holding only the previous agent's records (I-7), the marker first in the new active file (I-3), one marker (I-5), old segments unchanged (I-8), pending cleared with the binding in one write; a failed attempt is discarded only after a confirmed release; a member with no history starts plainly (REQ-005). A Team or Org root's own runtime stays fixed in the UI; a Team-default edit reaches linked members through the web draft planner's patches. The code reviewer asked for: (a) a live Claude Agent SDK ↔ Codex App Server pair for a Team member, an Org member and a copy with I-7 on both segments; (b) rendered journeys for a Team, an Org (direct and nested) and a copy row; (c) built-server failed start then retry for an Org member and a copy; (d) a restart between save and first message for a copy, and a Team-default edit with linked members woken in different orders; (e) I-7 for a Grok target and a native target inside an Org member. Known and out of scope: FU-C2 (the existing-run probe's 4 checks fail the same at base), FU-C1 (launch-rule mirrors, guarded by a parity test), the hint after reopening a saved pending switch (cosmetic).

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (Team), SCN-002 (Org), SCN-003 (copy), SCN-004 (default propagation to several members), SCN-005 (no history).
- Real-use scenarios added: a failed start of the new runtime, then the user's retry (trigger: the next message); a server restart between the save and the first message (trigger: app restart); a Team copy's members woken in either order by their delegator; the member switched back to its original runtime (Claude → Codex → Claude).
- Not tested (`Technically Possible but Unsupported/Contrived`): SCN-006 (an agent or router starts a switch; not supported yet).

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| Pending switch on Team / Org members and copies | Added | REQ-001/002, AC-001/002/004 | built-server EX-04, EX-01/02/03; browser RSM-01..04 |
| Activation through the shared configured-agent path | Added | REQ-003/004, AC-005 | live LV-01..03; built-server EX-*, MS-* |
| Failed start, retry, abandon | Added | REQ-003, AC-006 | EX-01 (Org member), EX-02 (copy) with failure injection; mutations X-A/X-B |
| No-history member | Added | REQ-005, AC-007 | EX-03 (a member that never ran) |
| Chat of a switched member | Added | REQ-006, AC-008 | RSM-01..04 (live chat and reopened chat) |
| Rendered rows and runtime menu on nested rows and copy rows | Added | REQ-001/002 | RSM-01..04 |
| Selection operations renamed | Changed | REQ-008, AC-009 | not my scope (source check and codegen belong to implementation, IMP-07) |
| Same-runtime edits, restore, runs that never switched | Preserved | REQ-009, AC-010 | MS-*; DCP-001..005 (copy model edits); R0 baseline |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | switch records, shared rule, activation, commit | unit/integration (IMP-03/04), built-server MS-01..04 | failure paths on Org member and copy; live runtimes | Built server; Live API |
| API / transport / contract | Yes | selection mutations, DTO schemas shared by server and web | codegen/contract tests (IMP-07/08) | an Org tree with a pending member parsed by the web's strict DTO | Browser; contracts test |
| Frontend component / state | Yes | member rows, runtime menu, draft planner, delegated draft | web unit tests (IMP-05/06) | nested rows and copy rows never rendered | Browser |
| Browser integration / user journey | Yes | stop, Edit config, switch, Save, message, reopen | none for members | whole journey | Browser |
| Authentication / session / permissions | No | | | | |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | | | | Browser (web surface) |
| Desktop shell | No | no shell code changed | | | |
| Process / lifecycle | Yes | restart between save and first message | MS-03 (Team member) | copy restart | Built server |
| Persisted-data transition | Yes (`Directly Usable — No Migration`) | optional new fields | IMP schema tests | | covered by the same cases (old shapes read) |
| Worker / queue / distributed coordination | No | | | | |
| External integration | Yes | Claude Agent SDK, Codex App Server, Grok, Antigravity | live pair for Claude/Codex only | Grok/Antigravity are scripted CLIs | Live API |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members` (branch `codex/runtime-switch-members`)
- Project type and runtime stack: TypeScript/Node 22 pnpm monorepo; Fastify/GraphQL server (`autobyteus-server-ts`, built `dist/app.js`), Nuxt 3 web, shared contract packages
- Project testing guideline path(s): `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-switch-members/TESTING.md`; closer `AGENTS.md` for `autobyteus-server-ts` and `autobyteus-web`
- Conflicting, missing, or unclear project instructions: the `existing-run-model-config` probe command works but fails 4 checks at the base commit and here (FU-C2); the delegated-copy probes carried an obsolete lock assertion (see D-1)
- Required environment variables or secrets available: `Yes` for the live pair (the signed-in `claude` and `codex` CLIs with the real HOME/USER/LOGNAME, no secret read or printed); the test vault was not needed by these two CLI runtimes

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | test layers and safety | test-owned data roots only; never the user's running app or `~/.autobyteus`; real HOME only for signed-in CLIs; mutation checks on compiled output restored with `cmp` |
| `autobyteus-server-ts/test-support/live-e2e/test-runtime-bootstrap.mjs` | built-server harness | `startBuiltTestServer`, `executeGraphql`, `removeOwnedTestRuntime`; sanitized env plus explicit options |
| `autobyteus-web/tests/e2e/runtime-switch-probe.mjs`, `run-settings-live-probe.mjs`, `delegated-launch-defaults-probe.mjs` | browser probe patterns | owned stack: built backend + Nuxt dev + headless Chrome via playwright-core on free ports |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Built server (vitest) | `autobyteus-server-ts` | `startBuiltTestServer` inside the test | random port, owned `runtimeRoot` | health | `server.stop()` + `removeOwnedTestRuntime` |
| Probe stack | `autobyteus-web` | `pnpm test:e2e:runtime-switch-members` | backend, Nuxt dev, Chrome | `/rest/health`, `/chat` | SIGTERM owned PIDs, remove owned root |
| LM Studio stand-in, scripted Antigravity CLI, fake Grok CLI | in-process / fixtures | `LMSTUDIO_HOSTS`, `ANTIGRAVITY_CLI_COMMAND`, `GROK_BUILD_COMMAND` | deterministic replies | | closed by the test |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent, Team, Org definitions and runs | GraphQL create mutations against the owned server | synthetic names | owned root removed |
| Claude/Codex sign-in | the real CLIs | live runs add sessions to the user's CLI histories and spend credits (synthetic `ls` task) | not removable by me; disclosed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Directly Usable — No Migration` (`design-spec.md`; implementation handoff)
- Representative existing-data setup and required behavior: runs that never switched keep working (MS baseline R0); members with no pending field read normally
- Evidence planned: R0 baseline log, extended suite on fresh data
- Upstream ambiguity or reroute required: none

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts` (MS-01..04) | Team member, Org members, restart | AC-001/002/005/006 | Still Valid | R0 baseline Pass | keep |
| `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-live.e2e.test.ts` (316) | standalone Agent live pair | autobyteus-316 | Out Of Scope | | keep |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` DCP-001..005 | copy model edit through the Settings row | REQ-009, AC-010 | Needs Update | before the update 5/5 failed at `chat-model-locked-runtime` (a stopped copy's runtime menu is open by design now) | update the wait to the model search |
| `autobyteus-web/tests/e2e/existing-run-model-config-probe.mjs` | mocked-GraphQL Settings checks | FU-C2 | Out Of Scope (pre-existing failure) | same 4 checks fail at the base | none; recorded |
| `autobyteus-web/tests/e2e/runtime-switch-probe.mjs` (316) | standalone Agent journey | | Out Of Scope | | keep |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R0 | AC-001/002/005, REQ-009 | built server | Existing Test | `runtime-switch-members-built-server.e2e.test.ts` on the review commit | baseline before additions |
| API-02 / EX-01 | AC-002, 005, 006 | built server | Durable | Org: direct Agent AGY→native with the start failing after the instruction was written, then retry; nested Agent AGY→Grok; I-7, I-3, I-5, byte-identity | reviewer (c), (e) |
| API-02 / EX-02 | AC-004, 005, 006 | built server | Durable | copy AGY→native; restart after save; failed start; retry | reviewer (c), (d) |
| API-02 / EX-03 | AC-004, 005, 007 | built server | Durable | Team copies with a Team-level choice woken in opposite orders; a member that never ran | reviewer (d) |
| API-02 / EX-04 | AC-001, 005, SCN-004 | built server | Durable | Team default + member patches in one save; woken lead-first and worker-first | reviewer (d) |
| API-03 / LV-01..03 | AC-005 | live Claude Agent SDK ↔ Codex App Server | Durable (gated) | Team member, Org members (direct and nested), copy; Claude→Codex→Claude; I-7 on both segments | reviewer (a) |
| API-04 / RSM-01..05 | AC-001, 002, 004, 008 | browser | Durable (new probe) | stop, Edit config, nested runtime menu, Save, message, reopen; Team, Org direct, Org nested, copy, Team root | reviewer (b), (d) |
| API-05 / DCP-001..005 | AC-010 | browser | Existing Test | `pnpm test:e2e:delegated-copy-model-change` | regression on copy rows |
| API-06 | | browser | Existing Test | `pnpm test:e2e:existing-run-model-config` | record FU-C2 unchanged |
| API-07 | AC-002 | contract | Durable | Org tree DTO accepts a member's `pendingRuntimeSwitch` | found by RSM-02/03 |
| X-A, X-B, X-C | AC-005, 006 | mutation of `dist/` | Temporary Probe | break the discard and the watermark; restore with `cmp` | prove the assertions can fail |

- Test progress log needed: `Yes`

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| EX-01..04 | `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-extended-built-server.e2e.test.ts` | failure, restart and default-propagation paths the baseline lacks |
| LV-01..03 | `autobyteus-server-ts/tests/e2e/runtime/runtime-switch-members-live.e2e.test.ts` | live pair; gated by `RUN_RUNTIME_SWITCH_MEMBERS_E2E=1 RUN_CLAUDE_E2E=1 RUN_CODEX_E2E=1` |
| RSM-01..05 | `autobyteus-web/tests/e2e/runtime-switch-members-probe.mjs` (+ script `test:e2e:runtime-switch-members`) | the rows were never rendered |
| API-07 | `autobyteus-collaboration-stream-contracts/tests/org-member-pending-runtime-switch.test.mjs` | red until the Org tree DTO accepts the field |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| DCP-001..005 | `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` (two waits) | wait for the model search instead of `chat-model-locked-runtime` | the lock was removed for copies by this ticket |

## Durable Coverage To Remove

None

## Desktop Application Validation Plan

Not applicable: no shell code changed; the web surface exercises the same renderer.

## Live Environment And Fixture Plan

- Startup order and commands: built server first, then Nuxt dev with `BACKEND_NODE_BASE_URL`, then headless Chrome.
- Environment choices that materially affect the run: models are scripted (LM Studio stand-in for native, scripted Antigravity CLI), except the live pair.
- Health / readiness checks: `/rest/health`, `/chat`.
- Seed data / fixtures: definitions and runs created by GraphQL; members seeded over the backend socket because a member with no history starts plainly (REQ-005).
- Test identities: real CLI sign-ins for the live pair only.
- Journeys: RSM-01..05.
- Evidence to capture: DOM text and screenshots, raw-trace manifests and record-type listings, server files after each step.
- Owned processes and temporary state to clean up: backend, Nuxt, Chrome, owned data roots.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| Grok and Antigravity live | real accounts not provided to this run; scripted CLIs used | the CLIs' real stream may differ | No | none for this change (the switch logic is runtime-neutral and the pair is proven live) |
| The hint after reopening a saved, not yet activated switch | reported cosmetic by the reviewer | cosmetic | No | recorded by the reviewer |
| Team-default runtime edit in the UI | the root runtime is locked in the UI (RSM-05); only the server API reaches it | none | No | covered by EX-04 |

## Ambiguities Or Reroute Triggers

| Issue | Classification | Evidence | Recommended Owner |
| --- | --- | --- | --- |
| Org tree DTO is `.strict()` and lacks `pendingRuntimeSwitch`; the web shows a raw schema error after Save | Local Fix | RSM-02, RSM-03, API-07 | implementation_engineer |
| A saved copy row shows the previous runtime until Settings is reopened | Local Fix | RSM-04 | implementation_engineer |

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes`
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: reroute findings arose during execution and are in the report.
