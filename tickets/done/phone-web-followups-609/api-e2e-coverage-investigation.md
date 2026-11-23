# API/E2E Coverage Investigation

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (SR-003, Approved)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md`
- Design Spec (required on every route): `design-spec.md` (SR-003; D-A…D-J)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001…FU-006), `handoff-architecture-design-complete.md`, `handoff-design-revised-sr-002.md`
- Design Review Report: `design-review-report.md` (ARCH-REV-002 Pass; untracked in the worktree, the Architecture Reviewer's)
- Architecture Review Revision Record: `architecture-review-revision-record.md` (untracked, as above)
- Implementation Handoff: `implementation-handoff.md` (IR-001; IMP-01…IMP-10; Downstream Coverage Hints)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (round 1 CRR-001 Pass; CRR-002 failure-origin: Design Impact; CRR-003 Full Re-Audit Pass, F-1 resolved)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: `/code_reviewer`, CRR-001 Pass; branch `codex/phone-web-followups-609` at `255a0b0ada` (origin has `c9d184ce80`), base `origin/personal` `f2c0d2a902`; Large / High
- Prior Investigation Reviewed: round 1 of this file (API-REV-001, Fail F-1)
- Trigger (round 2): `/code_reviewer`, CRR-003 Pass on IR-002 (`70f3d8d410` D-D2: one node rule `agent-memory/domain/tool-result-interruption.ts` read by the replay and the work journal; conversation entries carry the replay's `toolStatus`; Team member reconciliation accepts a read-back `interrupted`. `e78a539dfe` SR-005: the unused Codex run view provider, thread history reader and normalizer removed); tree `9a4777b0eb`
- Latest Authoritative Investigation: this file

## Current Requirement And Design Basis

Ten items (REQ-A…REQ-J, AC-A…AC-J):
- **A:** the node no longer computes or sends `contextText`.
- **B:** the contract packages' tracked `dist/` equals their source, checked by `pnpm check:contract-dist` (TESTING.md names it).
- **C:** the Windows server preparation leaves no staging folder; git ignores it.
- **D:** an interrupted call reads "Stopped" with a stop icon on the desktop Activity panel, the phone row and detail, the conversation card and the earlier-trace card.
- **E:** one shared `TOOL_SUMMARY_ARGUMENT_KEYS`; earlier-trace page cards carry every key, so they show the live card's summary; GraphQL `summaryArgs` is JSON.
- **F and G:** the probe cases MSP-44/45/46 follow autobyteus-576, and MSP-55 accepts both link-cut codes.
- **H:** a relative Markdown link in a run's conversation opens that file of the run's own folder (a team member's or a delegated run's own), on the desktop and the phone. Out of the folder or no folder gives "could not be opened"; another node gives "on node X"; a missing file gives the viewer's not-found state.
- **I:** when a streaming runtime's run stops while its tasks are listed, each running task ends "Stopped: the run ended" within 10 s, even with the live update lost; a stopped run's list is not re-read every 2 s.
- **J:** right after a node restart, the first read of a registered folder answers 200; an unknown ID still answers 404; the path rules are unchanged.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-A…SCN-J.
- Real-use scenarios added from investigating the implemented behavior:
  - SCN-H1 for a Team member whose folder differs from its coordinator's, and for a delegated run under a host that works in its own folder. The probe's other runs all share one workspace, so only distinct folders prove "that run's own folder". This is also where the implementation's deviation applies: the folder comes from `target.workspaceRootPath`, else the run's projected workspace metadata.
  - SCN-D/E with a real stored trace: an Antigravity run whose user pressed Stop in the desktop composer mid-call, reopened after more than 100 events, so the conversation reads its cards from the node's earlier-trace page (`ACTIVE_TRACE_LATEST_WINDOW_SIZE = 100`; a first page answers the latest 100 plus 50 earlier).
- Designer scenarios recorded as unsupported/contrived: None.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-A projection without `contextText` | Removed | REQ-A | Server unit/integration/e2e; code search |
| BEH-B contract `dist/` check | Added | REQ-B1/B2 | Run the check on base and branch |
| BEH-C staging folder | Changed | REQ-C | macOS failure-path run; release run's Windows job (IMP-09) |
| BEH-D "Stopped" | Changed | REQ-D | Real stop mid-call on every surface (MSP-102), MSP-96 |
| BEH-E page card summaries, GraphQL JSON | Changed | REQ-E | Real page answer and rendered page cards vs. live (MSP-102); whole server e2e (GraphQL shape) |
| BEH-F/G probe cases | Changed | REQ-F/G | Whole phone probe |
| BEH-H run-relative links | Added | REQ-H1/H2 | MSP-100; Team member and delegated run (MSP-101) |
| BEH-I task end on run stop | Changed | REQ-I | MSP-99, MSP-59 |
| BEH-J restore on first read | Changed | REQ-J | Integration test; MSP-91 with a real node restart now asserting the first read |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | projection (A, E), REST workspace routes (J) | server unit, J integration test | real restart path | Probe (MSP-91) |
| API / transport / contract | Yes | GraphQL `summaryArgs` → JSON; projection loses `contextText`; contract package keys | GraphQL e2e (`recent-run-projection-graphql`) | other consumers of the changed shape | Whole server `test:e2e` and `test:integration` |
| Frontend component / state | Yes | summary keys, status presentation, MarkdownRenderer, file preview, background task store | web unit suite | real data shapes | Browser |
| Browser integration / user journey | Yes | desktop and phone conversation, Activity, Files viewer | MSP-44/45/46/55/59/96/99/100 | Team member / delegated folder; real stop on desktop; page cards | Browser (new MSP-101, MSP-102) |
| Authentication / session / permissions | Yes (preserved) | REST routes' gate unchanged | J integration test (404, refusal) | gate after restart | MSP-91 gate checks |
| Desktop renderer / web-equivalent UI | Yes | conversation cards, Activity panel | unit | — | Browser (desktop window, Nuxt dev) |
| Desktop shell / Electron-specific integration | No (C is packaging) | `prepare-server.mjs` | IMP-03, IMP-09, IMP-10 | Windows success path only on the runner | Reuse IMP-09 |
| Process / lifecycle | Yes | node restart (J), run stop (D, I) | integration, MSP-99 | real restart | MSP-91 |
| Persisted-data transition | No | read-time fields only | — | — | — |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No | — | — | — | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/phone-web-followups-609`
- Project type and runtime stack: pnpm monorepo; Node 22.23.1; Fastify node (`autobyteus-server-ts`), Nuxt web (desktop dev frontend and phone bundle), contract packages; scripted AGY CLI; Chrome via Playwright.
- Project testing guideline path(s): `TESTING.md` (root)
- Conflicting, missing, or unclear project instructions: None.
- Changed build-input paths: `scripts/**` (`scripts/check-contract-dist.mjs`), `package.json`, `autobyteus-web/scripts/prepare-server.mjs`, contract packages (`autobyteus-*-contracts/**`), `autobyteus-web/generated/**` → fresh-start build and build-only release run. Reused: IMP-10 (fresh start) and IMP-09 (release run) ran on `d4af72998f`, which has the same code as `255a0b0ada` (later commits: documents only); FS-1 reruns the fresh start on my final commit, since I change a server test fixture and web probe files (not build inputs, but the web typecheck compiles test files).
- Required environment variables or secrets available: Not needed (no real provider).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Testing guideline | clean env; whole `pnpm test:e2e` for request-gate/harness changes and REST/GraphQL changes; `test:integration:prepare` then `test:integration`; `pnpm check:contract-dist` for contract changes; phone behavior in `test:e2e:mobile-shell`; one heavy run at a time |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` | Phone probe | alpha (desktop window's node) + beta; `--cases=` |
| `autobyteus-server-ts/tests/fixtures/agy-failure-cli.mjs` | Scripted AGY | `linked_skills` default; HOLD_TURN; ECHO_INPUT; new `AGENT_TOOL_STEPS` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server dist | `autobyteus-server-ts` | `pnpm -C autobyteus-server-ts build` | — | bootstrap smoke | — |
| Phone bundle | `autobyteus-web` | `pnpm -C autobyteus-web build:mobile-web` | writes `autobyteus-web/dist/public`, which the probe nodes serve | "The /mobile build holds no demo code." | — |
| Probe stack (alpha, beta, epsilon, own nodes, Nuxt dev, Chrome) | `autobyteus-web` | `test:e2e:mobile-shell` | data under `<TMPDIR>/mobile-shell-probe-*` | `/rest/health` | probe stops them |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Runs, Team runs, delegated runs with their own folders | probe GraphQL on alpha | probe-owned nodes only; never `~/.autobyteus` | probe root under `/tmp/api609/tmp` |
| AGY tool steps with summary keys | new fixture keyword `AGENT_TOOL_STEPS` | scripted, no credentials | — |

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` MSP-100 | run-relative links of a standalone run | AC-H1/H2 | Still Valid | IMP-06 | Rerun; add MSP-101 |
| `autobyteus-web/tests/e2e/mobile-file-open-cases.mjs` MSP-91 | restart mid-download; records `readsAfterRestart` without asserting it; comment says 404 until registered | AC-J | Needs Update | code read | Assert first read 200 and unknown ID 404; fix the comment |
| `mobile-activity-details-cases.mjs` MSP-96 | running → "Stopped" (terminate) | AC-D | Still Valid | IMP-08 | Rerun |
| `mobile-background-tasks-cases.mjs` MSP-59, MSP-99 | task end on stop | AC-I | Still Valid | IMP-04 | Rerun |
| MSP-44/45/46, MSP-55 | F, G | AC-F/G | Still Valid | IMP-05/08 | Rerun |
| `tests/integration/api/rest/workspace-content-after-restart.integration.test.ts` | J | AC-J | Still Valid | IMP-02 | Whole integration |
| `tests/e2e/run-history/recent-run-projection-graphql.e2e.test.ts` | `summaryArgs` JSON | AC-E | Still Valid | IMP-02 | Whole e2e |
| `tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | fixture keywords | — | Needs Update | — | Add the `AGENT_TOOL_STEPS` case |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| CS-1 | AC-A | node source | Journey (code search) | `rg contextText autobyteus-server-ts/src`; web source | AC-A's search |
| CD-1 | AC-B | contract `dist/` check | Existing Test | `pnpm check:contract-dist` on the branch; on a base worktree (`f2c0d2a902` with the script) | AC-B both halves |
| SI-1 | AC-A, AC-E, AC-J; regression | Whole server integration | Existing Test | `test:integration:prepare`; `test:integration` | GraphQL shape and REST routes changed |
| SE-1 | AC-A, AC-E, AC-J; regression | Whole server E2E | Existing Test | `pnpm test:e2e` | as above (TESTING.md) |
| U-1 | all (unit) | web suite, server unit, typechecks, guards | Reused | IMP-07 | code unchanged since `d4af72998f`; rerun the web typecheck and the AGY fixture test after my test changes |
| FX-1 | fixture | AGY fixture routing | Durable (updated) | `vitest run tests/unit/agent-execution/backends/antigravity/agy-failure-cli-routing.test.ts` | the new keyword |
| MSP-101 | AC-H1 | Team member and delegated run links, desktop and phone | Durable | `test:e2e:mobile-shell --cases=MSP-101` | hint 1 |
| MSP-102 | AC-D, AC-E | real AGY stop mid-call on desktop; desktop panel, conversation card, phone row/detail; earlier-trace cards after reload | Durable | `--cases=MSP-102` | hint 2 |
| MSP-91 (updated) | AC-J | real node restart, first read | Durable (updated) | `--cases=MSP-89,MSP-90,MSP-91` (MSP-91 runs after MSP-89 on epsilon) | hint 3 |
| WS-1 | all phone criteria; regression | Whole phone probe | Existing Test | `test:e2e:mobile-shell` | hint 4; MSP-61 per FU-006 |
| CC-1 | AC-C | prepare-server failure path; release run | Reused | IMP-03, IMP-09 | `prepare-server.mjs` unchanged since |
| FS-1 | build inputs | Fresh-start build | Existing Test | fresh clone of my final commit; `pnpm install --frozen-lockfile`; the release job's mac build and verify steps | the web typecheck compiles test files I changed |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`)

### Round 2 delta

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| R2-MSP-102 | AC-D, AC-E | as round 1 | Durable | `--cases=MSP-102,MSP-103` | F-1's acceptance |
| MSP-103 | AC-D (D-D2) | a Team member's call stopped from the phone while the desktop's Team stream is live; the desktop opens the member (the member loader reconciles live and read-back state, the code D-D2 changed); the phone reloaded (read back) | Durable | same run | D-D2 changed the reconciliation; a member path was not covered by a probe |
| R2-SI-1, R2-SE-1 | regression | whole server integration and E2E | Existing Test | as round 1 | node code changed; three Codex files and their tests removed |
| R2-WS-1 | regression | whole phone probe | Existing Test | as round 1 | web hydration changed |
| FS-1 | build inputs | fresh-start build on my final commit | Existing Test | as planned | IMP-16 ran on `e78a539dfe`; my test changes are compiled by the typechecks |
| U-1 | unit | Reused: IMP-12 | Reused | — | no code change after `e78a539dfe` except my test files |

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| MSP-101 | `autobyteus-web/tests/e2e/mobile-heading-links-cases.mjs` | "that run's own folder" for a Team member and a delegated run, on desktop and phone |
| MSP-102 | `autobyteus-web/tests/e2e/desktop-stopped-call-trace-cases.mjs` (new; registered in `mobile-shell-probe.mjs`) | "Stopped" on every surface after a real user Stop, and earlier-trace page cards against live cards on a real stored trace |
| MSP-103 (round 2) | same file | a Team member's stopped call: live on the phone, reconciled on the desktop, read back on the phone |
| FX-1 | `agy-failure-cli.mjs` `AGENT_TOOL_STEPS` and its routing test | the tool steps MSP-102 needs |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| MSP-91 | `mobile-file-open-cases.mjs` | assert the first read after the restart is 200 and an unknown folder ID 404; fix the stale comment | AC-J |

## Durable Coverage To Remove

None

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| C's successful run on Windows locally | Windows-only; proven by the release run's Windows job (IMP-09) | Low | No | None |
| Physical phone | No device | Low | No | None |
| A run on another node ("on node X") through the UI | unit-covered; the message predates this ticket | Low | No | None |

## Ambiguities Or Reroute Triggers

None at investigation time.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (MSP-101, MSP-102, MSP-91, the fixture keyword)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: —
- Notes: Large / High: a Pass goes to the code reviewer for the proportional test-code review of the added cases.
