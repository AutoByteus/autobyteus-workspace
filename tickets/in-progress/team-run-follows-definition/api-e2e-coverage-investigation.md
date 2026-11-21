# API/E2E Coverage Investigation

The plan: what must be proven, how, the decisions about existing tests, and the planned cases. Results are in `api-e2e-execution-coverage-report.md`.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved, SR-005/SR-006: REQ-001..REQ-009, AC-001..AC-010)
- Investigation Notes: `investigation-notes.md` (IF-01..IF-20, AF-01..AF-18)
- Solution Revision Record: `solution-revision-record.md`
- Design Spec: `design-spec.md` (SR-008, Ready)
- Supplemental Task Artifacts: `follow-ups.md` (FU-001..FU-003), `handoff-architecture-design.md`; normative texts in design § Exact Texts
- Design Review Report: `design-review-report.md` (ARCH-REV-002 pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001 pass, no findings)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md` (created with the first result)
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: round 1 CRR-001 pass; round 2 CRR-003 pass of IR-002 (rework of F-1, F-2; design SR-009/SR-010)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file

Ticket folder: `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition/tickets/in-progress/team-run-follows-definition/`. Code: worktree `/home/autobyteus/workspace/.codex/worktrees/team-run-follows-definition`, branch `codex/team-run-follows-definition`, implementation `19b31ad365` + `6b46ec5bdd`, reviewed at `4773d95936`.

## Current Requirement And Design Basis

A Team run (standalone, or a delegated copy made from a Team definition) follows its current Team definition while it exists: a member the definition gains joins Offline and starts on its first message; a member it loses is refused at once (by address and run ID, exact text, `COLLABORATION_TARGET_NOT_FOUND`), finishes its turn if busy (its own approvals/interrupt and sends still work), is stopped when quiet and released; coordinator and handoff rules follow; `get_handoff_rules` and prompts read the current rules; every remaining member gets one net-merged notice at its next input (exact texts); a stopped run follows at restore (also after a restart); an unreadable or invalid definition leaves the run unchanged with a `TEAM_RUN_DEFINITION_NOT_FOLLOWED` warning; the open Team view gets an in-band snapshot (leaving members tagged), and the web adds/keeps/drops members. Swap (DEC-006) and rejoin (DEC-007) as decided. Configured-placement copies and application-bound runs do not follow.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001..SCN-006.
- Real-use additions: SCN-001a the change comes from editing the package's `team-config.json` on disk (folder watcher reload: package update or Agent Package Creator file tools) and from the app editor (`updateAgentTeamDefinition` of a user's own Team); SCN-003a a member removed while its tool call is pending approval (real Codex, auto-execute off) and while a turn is held (user interrupts it); SCN-004a a server restart between the change and the reopen.
- Contrived/unsupported: none recorded.

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | planner, committer, membership, leaving rules | IMP-02/03 unit | — | — |
| API / transport / contract | Yes | team stream snapshot (leaving), GraphQL tree, tools' refusal text | unit; IMP-04 integration with a faked backend | real server: folder watcher → listener → root; real tool calls over MCP | Server E2E (built server) |
| Frontend component / state | Yes | snapshot apply, members panel "Leaving" | IMP-08/09 specs | rendered result | Browser probe |
| Browser integration / user journey | Yes | AC-009 | none | whole journey | Browser probe on a probe-owned backend |
| Authentication / session / permissions | Yes | leaving member's own approvals | unit | real pending approval of a real runtime | Live Codex |
| Process / lifecycle | Yes | retire/stop/release, restore, restart | unit/integration (faked handles) | real handles, real restart | Server E2E, live runtimes |
| Persisted-data transition | Yes | `formerMembers`, `copiedFrom` | IMP-03 schema tests | real files after real changes and restart | Server E2E |
| Worker / queue / distributed coordination | Yes (peer copies) | `copiedFrom` on a peer-started copy | unit | two nodes | two-server suite (see Not Tested) |
| External integration | Yes | real AutoByteus and Codex members | none | handoff work, notices read by a model, approvals | Live runtime E2E |

## Project Execution Discovery

- Worktree: as above. Project: pnpm monorepo (Node 22 server, Nuxt web).
- Testing guideline: `TESTING.md` (root); no closer `TESTING*.md`.
- Instruction discrepancies: `pnpm` only through corepack here (shim `/tmp/sm-bin/pnpm`).
- Changed build-input paths (`git diff --name-only a07767f4d0...HEAD`): checked at execution (contracts package `autobyteus-team-stream-contracts/**`, `typecheck-baseline.json` changed) → fresh-start build case API-FS.
- Secrets: test vault READY with `provider.anthropic.api-key` (native AutoByteus); Codex signed in (host `auth.json` linked into a throwaway `CODEX_HOME`).

| Instruction / Configuration Path | Purpose | Learned |
| --- | --- | --- |
| `TESTING.md` | layers, environments, rules | built-server suites need a current `pnpm -C autobyteus-server-ts build`; scripted AGY CLI; clean env; throwaway `CODEX_HOME`; one heavy run at a time; browser probe rules (allowed origin, owner credential) |
| `tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts` | built-server pattern with restart | `dist/app.js --data-dir --port 0`, `builtServerLaunchEnvironment()` |
| `tests/fixtures/agy-failure-cli.mjs` (`linked_skills`) | scripted agent | `CALL_TOOL`, `CALL_TOOLS` with `delayMs`, `ECHO_INPUT`, `HOLD_TURN` |
| `tests/e2e/agent-definitions/agent-package-definitions-live-refresh.e2e.test.ts` | local package folder watcher | file edits of an imported LOCAL_PATH package reload definitions |
| planner/committer/listener sources | warning texts | `console.warn("TEAM_RUN_DEFINITION_NOT_FOLLOWED: …")` → the built server's output |

| Component | Working Directory | Start | Notes | Readiness | Stop |
| --- | --- | --- | --- | --- | --- |
| Built server | `autobyteus-server-ts` | `node dist/app.js --data-dir <root> --port 0` (suite) | own data root, DB, HOME | "Server listening" + GraphQL | SIGTERM |
| In-process studio server (live suite) | same | `startStudioE2eRuntimeServer()` | own data dir outside `/tmp` | GraphQL | `app.close()` |
| Nuxt dev + probe backend (AC-009) | `autobyteus-web` | ticket probe | free ports, allowed origin, owner credential | page loaded | probe cleanup |

| Data / Fixture | Mechanism | Safety | Cleanup |
| --- | --- | --- | --- |
| Local agent package with a Team | files + `importAgentPackage(LOCAL_PATH)`; edits by writing `team-config.json` | test-owned root | removed |
| User's own Team | `createAgentTeamDefinition` / `updateAgentTeamDefinition` | — | removed |
| Runs | `createAgentTeamRun`, `delegate_task` | — | terminated, removed |

## Persisted Data Transition Coverage Basis

- Decision: `Directly Usable — No Migration` (design § Persisted Data). Evidence planned: TF-02..TF-08 read the stored tree after real changes (`formerMembers` written, `copiedFrom: team_definition` on a delegated copy, a restart reads it back). Existing trees without the fields: IMP-03 schema tests (reused).

## Existing Durable Coverage Inventory

| Path / Test | Intent | Related | Decision | Action |
| --- | --- | --- | --- | --- |
| IR-001 unit tests (planner, committer, listener, notices, membership, index refusal, schema, view session, web specs) | logic and texts | DS-001..DS-007 | Still Valid | Reuse IMP-02/03/05/08/09 (no source change since `6b46ec5bdd`; later commits are ticket docs) |
| `tests/integration/agent-team-execution/team-run-follows-definition.integration.test.ts` | reproduction with a faked backend | AC-001, AC-002, AC-004, AC-010 | Still Valid (not a real-boundary proof) | Reuse IMP-04 |
| `tests/e2e/projects/collaboration-prompt-wording.e2e.test.ts` | prompts' collaboration part equals approved views | live rule read must not change prompts of unchanged teams | Still Valid | Run (regression) |
| `tests/e2e/projects/unclean-shutdown-delegated-team-restore.e2e.test.ts`, `delegated-team-lazy-member-activation.e2e.test.ts` | delegated Team restore, lazy members | preserved behavior | Still Valid | Run (regression) |
| `tests/e2e/remote-collaboration/remote-delegation-two-server.e2e.test.ts` | peer Team copies | AC-005 peer | Still Valid | Run its remote-Team cases (regression of peer-started copies; see Planned) |

## Planned Cases

| Case ID | Criteria | Boundary | Kind | Command / Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-R1 | all (unit) | server units | Reused | IMP-02, IMP-03, IMP-05 | unchanged since |
| API-R2 | AC-009 (component) | web specs | Reused | IMP-08, IMP-09 | unchanged since |
| API-R3 | AC-001/002/004/010 (faked backend) | integration | Reused | IMP-04 | unchanged since |
| TF-01..TF-10 | AC-001..AC-008, AC-010, DEC-006/007 | built server, scripted AGY, package edited on disk, app editor | Durable | new `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | every real server path without inference |
| TF-11, TF-12 (round 2) | AC-003, AC-004, SR-010 | built server | Durable | Stop and server restart while a member is leaving; reopen clears the marker | SR-010 leaving marker lifecycle |
| TFU-04..TFU-06 (round 2) | AC-003, AC-005, SR-010 | rendered app (real Codex for TFU-04) | Temporary Probe | approval from a Leaving row; delegated copy rows; Stop while leaving | SR-010 visibility |
| TFL-* | AC-001, AC-003 (pending approval), AC-006, AC-008, AC-010 on real AutoByteus and Codex | in-process studio server, real runtimes | Durable (gated) | new `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` | Verification Intent: real runtimes |
| API-PROBE | AC-009, AC-008 (default composer target), N-8 | Nuxt dev + probe backend + Chromium | Temporary Probe (ticket-owned) | `probes/team-follows-ui-probe.mjs` | rendered view; a durable `test:e2e:*` probe for this journey is not justified beyond the ticket |
| API-REG | regression | existing E2E suites above | Existing Test | as listed | preserved behavior |
| API-PEER | AC-005 peer-started copy | two built servers | Existing Test + check | remote Team cases of the two-server suite, plus tree check | see Not Tested if infeasible |
| API-TC | durable test code | server typecheck | Check | `pnpm -C autobyteus-server-ts typecheck` | baseline |
| API-FS | build inputs | fresh clone | Check | release job commands | changed build inputs |

- Test progress log needed: Yes.

## Durable Coverage To Add

| Case ID | Path | Why |
| --- | --- | --- |
| TF-01..TF-10 | `autobyteus-server-ts/tests/e2e/agent-team-runs/team-run-follows-definition.e2e.test.ts` | the real trigger (package file edit, app save), real tools, real stream, restart |
| TFL-* | `autobyteus-server-ts/tests/e2e/runtime/team-run-follows-definition-live.e2e.test.ts` | real runtime behavior (handoff work, approvals) |

## Durable Coverage To Update / Remove

None.

## Not Tested / Infeasible / Deferred (planned)

| Behavior | Reason | Risk | User only? | Follow-up |
| --- | --- | --- | --- | --- |
| Configured-placement copy and application-bound Team run not followed (E2E) | creating them needs an Org in-run placement delegation and an application package build; decided by the planner's run-kind check | low; unit-tested (IMP-03 planner cases) | No | attempted in execution if a direct path exists |
| Org-mounted Teams | out of scope (FU-002) | — | No | FU-002 |

## Ambiguities Or Reroute Triggers

None at planning.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Durable coverage added: `Yes`
- Reroute Required Before Validation Execution: `No`
