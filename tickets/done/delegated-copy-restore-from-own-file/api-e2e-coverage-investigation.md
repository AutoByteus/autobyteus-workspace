# API/E2E Coverage Investigation

Ticket `delegated-copy-restore-from-own-file` (autobyteus-197). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`, branch `codex/delegated-copy-restore-from-own-file`, base `origin/personal` @ `f171032e88`, head received `da1d7f5524` (last source commit `96de77efb3`).

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..REQ-012, AC-001..AC-011)
- Investigation Notes: `investigation-notes.md`
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-008)
- Design Spec (required on every route): `design-spec.md` (SR-008: D-1..D-9, M0..M5)
- Supplemental Task Artifacts: `implementation-design-impact-DI-001.md` (→ D-8), `implementation-design-impact-DI-002.md` (→ D-9)
- Design Review Report: `design-review-report.md` (ARCH-REV-007, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-002)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-002, Pass, 9.45/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record (delivery re-entry only): N/A
- Relevant Delivery Revision IDs: N/A
- API/E2E Revision Record (created after the first completed result): `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-002`
- Current Investigation Round: 2
- Trigger: round 1, code reviewer pass CRR-002. Round 2, CRR-004: the INT-001 merge `26ad4ace20` of `origin/personal` @ `ad784b0a8f` (head `c5da4745e3`). It changes the three task-execution adapters (ingress) and `autobyteus-ts`, a shared foundation, so every case is rerun by impact. The execution report's Round section gives the plan; the coverage decisions are unchanged.
- Prior Investigation Reviewed: round 1
- Latest Authoritative Investigation: this file, round 2 (planned cases unchanged; API-01..API-09 reused from the implementation's integration round IMP-15..IMP-22 on the merge)

All paths are relative to `tickets/in-progress/delegated-copy-restore-from-own-file/` unless absolute.

## Current Requirement And Design Basis

- Every delegated copy (agent or Team) restores its definition and launch from its own file (+ its Settings edit), never from the configured placement (slot) of the coordinating run (REQ-001, D-2).
- A copy of a configured placement starts from the slot as it is at delegation time and records the full snapshot in its own file, with `launchSource.origin = "configured"` and no `taskAgent.origin` (REQ-002, D-1, D-6). Team copies record every member's complete launch and `followsTeam` (REQ-012, D-5), and handoffs `from` ∈ members (D-4).
- Editing a slot in a stopped run changes only the slot and copies started later (REQ-003, DEC-001).
- Views show what the copy runs with (run view incl. runtime session id, Settings delegated rows with "As configured in this run", Team/Org contexts); names unchanged (REQ-004, D-7).
- One startup migration converts existing own files (M0..M5; D-8 bridge; D-9 repair of 10-17) (REQ-005..REQ-009, AC-005..AC-009).
- Implementation and code review proved the logic with unit, integration, migration, startup e2e and browser probe checks (IMP-01..IMP-14). The code reviewer's residual risks name the system-boundary gaps this round must close: AC-001/AC-003 journeys in Team and Org runs (agent and Team copies), the AC-004 run view / rendered "As configured in this run" / names, and AC-011(a) end to end.

## Supported Scenarios And Real Usage

- Designer scenarios covered: SCN-001 (restore/wake a copy), SCN-002 (delegate to a configured place), SCN-003 (edit the slot in a stopped run, restore old copy, delegate again), SCN-004 (view a copy's settings), SCN-005 (upgrade).
- Real-use scenarios added from investigating the implemented behavior:
  - **Team root delegation to a configured member comes from a copy, not from a configured member.** CM-1 (`collaboration_model.md`) refuses `delegate_task` from a configured member of the root Team to any configured placement of that Team. The real trigger in a Team run is therefore a delegated copy (here a catalog Writer copy started by the coordinator) that delegates to `/worker`. Team roots have only agent members (`team-run-execution-tree-schema.ts` `parseRootTeam`), so "a configured Team member" exists only in Org roots (mounted Teams; CM-3).
  - **The slot has its own runtime session.** In real use the configured member itself also works (the coordinator messages it), so slot and copy both have AGY conversations. Restoring the copy must resume the copy's own conversation, not the slot's (the runtime-session-id part of AC-004/BEH-004).
  - **Team-level model selection on a configured-place Team copy** (AC-011(a)) is made the way a user makes it: stop the copy from its Settings row, change the Team copy's model, Save, then the copy's coordinator is messaged and resumes.
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived`: none.

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 catalog copy restore | Preserved | design DS-002 | Existing probe cases (DLP-003/007, DCP-*) rerun on the current build |
| BEH-002 configured-place copy restores from own file | Changed | REQ-001, D-2 | New journey: restore after a slot edit, Team and Org roots, agent and Team copies |
| BEH-003 slot edit affects only later copies | Changed | REQ-003, DEC-001 | Same journey: second delegation after the edit starts on the edited model |
| BEH-004 views show the copy's own settings; names kept | Changed | REQ-004, D-6, D-7 | Settings rows ("As configured in this run"), "+" context, run-view projection, sidebar names, resume conversation id |
| BEH-005 configured snapshot recorded at birth | Changed | REQ-002, D-1, D-4, D-5 | Own-file key set read from the probe's data root after real delegations |
| BEH-006 copy Settings edit | Preserved | — | DCP-001..005 rerun |
| BEH-007 follower set via `followsTeam` | Changed | REQ-012, D-5 | AC-011(a): configured Team member with own auto-approve follows a Team-level selection |
| BEH-008 upgrade migration | Added | REQ-005..009, M0..M5, D-8, D-9 | IMP-09 reused; startup e2e and production upgrade rerun on the current build; DLP-006 rerun |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | record `source` required; adapters; recipient resolvers; own-file writer/reader | IMP-02 server unit (6111), IMP-03 integration | Unit tests assemble the slot edit and restore separately; no running server restores a configured-place copy after a slot edit | Probe journey (real backend) |
| API / transport / contract | Yes | stream DTO `source` required; `configured` origin; member `follows_team` | IMP-04/05/06 contract tests | DTO consumed by the real web over GraphQL/WebSocket only in IMP-14, which has no configured-place copy | Probe journey |
| Frontend component / state | Yes | web selectors by run id; delegated rows; D-7 names | IMP-07 web unit (4549) | "As configured in this run" never rendered (handoff limitation) | Probe journey |
| Browser integration / user journey | Yes | Settings, sidebar, composer | IMP-14 (15 cases) | No configured-place copy in any case | Probe journey (real Chrome) |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | as above | IMP-14 (browser) | Web-equivalent; covered by the browser probe | Browser probe |
| Desktop shell / Electron-specific integration | No | no Electron code changed (handoff) | — | — | None |
| Process / lifecycle | Yes | stop root → reopen → restore copy; stop copy → resume | IMP-14 DCP cases (catalog copies) | Not for configured-place copies | Probe journey |
| Persisted-data transition | Yes | new startup migration, D-9 repair | IMP-09, IMP-11, IMP-12, IMP-14 DLP-006 | Server build at IMP-10 predates `96de77efb3` | Rerun startup e2e and DLP-006 on a fresh build |
| Worker / queue / distributed coordination | No | — | — | — | — |
| External integration | No (scripted AGY/Grok CLIs stand in for runtimes) | — | — | Paid inference not needed: the change is in launch selection, observable in the CLI argv | — |

## Project Execution Discovery

- Assigned task worktree / workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/delegated-copy-restore-from-own-file`
- Project type and runtime stack: pnpm monorepo; Fastify/GraphQL/WebSocket server (`autobyteus-server-ts`, TypeScript, vitest); Nuxt web (`autobyteus-web`); Electron shell; stream-contract packages.
- Project testing guideline path(s): `TESTING.md` (repository root). No closer `TESTING*.md` under the changed packages.
- Conflicting, missing, or unclear project instructions: the Task's "tested on a copy of realistic data" conflicts with TESTING.md; requirements DEC-009 resolves it in favour of TESTING.md (synthesized fixtures only). Followed.
- Required environment variables or secrets available: `N/A` (scripted runtimes; no credentials).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers and commands; build first (`pnpm -C autobyteus-server-ts build`); `env -i` for e2e; synthesized data only for migrations; never touch `~/.autobyteus` or the running app; rerun by impact; browser probes own their stack, fresh `--output-dir` |
| `AGENTS.md` (root) | Repo instructions | Read DESIGN/TESTING/RELEASE |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` header | The probe's prerequisites, cases and options | `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults [--output-dir] [--cases] [--ledger-file]`; scripted AGY via `agy-failure-cli.mjs` (`CALL_TOOL:{…}`), Grok replay fixture, missing Codex; owned temp data root and HOME |
| `autobyteus-web/tests/e2e/settings-saved-model-refresh-cases.mjs` | Pattern for a case module registered into the probe | `register…Cases(helpers)`; selected with `--cases` |
| `autobyteus-server-ts/docs/design/collaboration_model.md` CM-1, CM-3 | Who may delegate to whom | Team: a configured member cannot delegate to the Team's configured placements; Org: units may delegate to each other |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/*.e2e.test.ts` | Startup e2e for migrations | Run with `env -i PATH HOME=<temp> TMPDIR` |

| Component / Dependency | Working Directory | Start / Setup Command | Runtime / Resource Notes | Readiness Check | Stop / Cleanup Method |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | `pnpm -C autobyteus-server-ts build` | must include `96de77efb3` | `Built-in agents bootstrap smoke check passed.` | — |
| Backend (probe-owned) | `autobyteus-server-ts` | spawned by the probe: `node dist/app.js --host 127.0.0.1 --port <free> --data-dir <owned>` | sqlite in the owned root; scripted AGY/Grok | `/rest/health` | probe stops its process group; removes the owned root |
| Nuxt dev (probe-owned) | `autobyteus-web` | spawned by the probe: `pnpm dev --port <free>` | one per worktree at a time | `/chat` 200 | probe stops it |
| Chrome | — | `playwright-core` launch, headless | fresh profile | — | closed by the probe |

| Data / Fixture / Identity Need | Existing Project Mechanism Or Creation Method | Environment / Data-Safety Notes | Cleanup / Retention |
| --- | --- | --- | --- |
| Agent, Team and Org definitions with configured members | Probe `seed()` through GraphQL `create*Definition`; new definitions for DCR in the case module through the same API | owned temp data root | removed with the owned root |
| Runs, copies, slot edits | Driven through the UI (New chat, Org launch page, composer `CALL_TOOL`, Settings) | real backend; scripted runtimes | removed with the owned root |
| Released-shape own files (upgrade) | Existing DLP-006 (writes the released shape while the backend is down) and server migration fixtures (IMP-09) | synthesized, never real data | removed |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required`
- Design-spec and implementation-handoff references: design "Persisted Data / State Transition Decision", "Migration Plan" (M0..M5), D-8, D-9, shape inventory; handoff "Persisted Data Transition Check".
- Representative existing-data setup and required behavior: synthesized fixtures for every released shape (F-A1..F-X3c), the combined 10-17 → 20261019 → current-store test, and DLP-006's upgrade-shaped data root in the browser.
- Evidence planned: IMP-09 reused (no migration source change since `3b6f970cfa`); startup e2e (IMP-11) and production upgrade (IMP-12) rerun on the fresh build; DLP-006 rerun on the fresh build.
- Migration-specific completion/recovery scenarios: second start writes nothing (IMP-09/IMP-11), predecessor pending and D-9 retry (IMP-11 TAU-2), preserved placement missing (IMP-09 F-A4/F-T4), unreadable (F-X1).
- Upstream ambiguity or reroute required: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related Requirement / AC / Design | Validity Decision | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` DLP-001..DLP-010, DCP-001..DCP-005 | Delegated launch defaults and copy model change; catalog copies only | BEH-001, 004, 006, 007; DLP-006 BEH-008 | Still Valid | IMP-14 15/15 on `2253b8044b` with a pre-`96de77efb3` build | Rerun on the current build (web and server changed since) |
| `autobyteus-server-ts/tests/unit/app-data-migrations/delegated-copy-own-file-complete-v1/*`, `released-own-file-ownership.test.ts`, 10-17 and D-8 suites | Migration M0..M5, D-8, D-9 | AC-005..AC-009, AC-011(c) | Still Valid | IMP-09 on `3b6f970cfa`; no migration source change since | Reuse |
| `autobyteus-server-ts/tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts`, `append-only-message-logs-startup.e2e.test.ts`, `team-run-v1-production-upgrade.e2e.test.ts` | Startup and upgrade through the built server | AC-005, AC-007, AC-008, D-9 | Still Valid | IMP-11, IMP-12 on a pre-`96de77efb3` build | Rerun on the fresh build |
| Server unit suites (recipient resolvers, `copy-execution-source.test.ts`, `collaborator-member-launch.test.ts`, run-view projection, delegated launch selection) | D-1..D-7 logic | AC-001..AC-004, AC-011(a,b) | Still Valid | IMP-02 on `96de77efb3` (= current source) | Reuse |
| Server integration suites | In-process integration | BEH-001, 002, 004 | Still Valid | IMP-03 on `7d689455ad`; `96de77efb3` changed `standalone-root-tree-schema.ts`, which they exercise | Rerun |
| Web unit suites (`agentSourceSelectors.spec.ts`, `delegatedLaunchRows.spec.ts`, `delegatedCopyChoices.spec.ts`, contexts) | D-6/D-7, rows, contexts | AC-004 | Still Valid | IMP-07 on `96de77efb3` | Reuse |
| Contract tests and `dist/` | DTO shape | BEH-004, 007 | Still Valid | IMP-04/05/06; contracts unchanged since | Reuse |
| Web guards | Boundary/localization | — | Still Valid | IMP-08 on `7d689455ad`; one web source line changed since | Rerun (cheap) |
| `autobyteus-server-ts/tests/e2e/runtime/mixed-task-delegation.e2e.test.ts` | Live delegation lifecycle (real providers) | — | Out Of Scope | gated live suite; this change is launch selection, which the scripted probe proves without spending credits | None |

## Planned Cases

| Case ID | Criteria (AC / Requirement IDs) | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-009, escalation trigger 3 | server typecheck | Reused | IMP-01 | Ran on `96de77efb3`, the current source; `da1d7f5524` changes only ticket files |
| API-02 | BEH-001..008, AC-001..AC-004 (unit), AC-011(a,b) | server unit | Reused | IMP-02 | Same commit as current source |
| API-03 | AC-004 (web unit), D-7 | web unit | Reused | IMP-07 | Same commit as current source |
| API-04 | BEH-004, 007 | contracts + `dist/` | Reused | IMP-04, IMP-05, IMP-06 | Contracts unchanged since `7d689455ad` (`git diff --name-only 7d689455ad HEAD` shows no contract path) |
| API-05 | AC-005..AC-009, AC-011(c), D-8, D-9 | migration units | Reused | IMP-09 | No migration source or test change since `3b6f970cfa` |
| API-06 | — | web guards | Existing Test | `pnpm -C autobyteus-web guard:web-boundary && … guard:localization-boundary && … audit:localization-literals` | One web source file changed since IMP-08 |
| API-07 | BEH-001, 002, 004 | server integration | Existing Test | `pnpm -C autobyteus-server-ts test:integration:prepare && pnpm -C autobyteus-server-ts test:integration` | `standalone-root-tree-schema.ts` changed since IMP-03 |
| API-08 | — | server build | Existing Test | `pnpm -C autobyteus-server-ts build` | The e2e and the probe need a build of the current source |
| API-09 | AC-005, AC-007, AC-008, D-9, BEH-008 | built server startup (real entrypoint) | Existing Test | `env -i PATH HOME=<temp> TMPDIR pnpm -C autobyteus-server-ts exec vitest run tests/e2e/app-data-migrations/task-agent-own-run-startup.e2e.test.ts tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts tests/e2e/app-data-migrations/team-run-v1-production-upgrade.e2e.test.ts --no-watch` | Rerun IMP-11/IMP-12 on the fresh build |
| API-10 | BEH-001, 004, 006, 007, 008 (DLP-006 upgrade) | real Chrome → Nuxt → built backend | Existing Test | the full probe incl. the new cases: `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <fresh> --ledger-file <ledger>` | Rerun IMP-14 on the current web and server build (regression) |
| API-11 (probe `DCR-001`) | AC-001, AC-002, AC-003, AC-004 (Team root) | real Chrome → Nuxt → built backend; scripted AGY | Durable | in the run of API-10; alone: `--cases DCR-001` | Closes the Team-root restore-after-slot-edit, own-file key set, "As configured in this run", `+` context, run view and name gaps |
| API-12 (probe `DCR-002`) | AC-001, AC-002, AC-003, AC-004 (Org root; agent and Team copies) | same | Durable | in the run of API-10; alone: `--cases DCR-002` | Closes the Org-root and configured-Team-copy gaps |
| API-13 (probe `DCR-003`) | AC-011(a), AC-002 | same; scripted AGY and Grok | Durable | in the run of API-10; alone: `--cases DCR-003` | AC-011(a) end to end (added in round 1 after the trial runs, see DCR-003 steps) |

- Test progress log needed: `Yes` (`api-e2e-test-progress.md`).

### DCR-001 steps (Team root)

1. Definitions (GraphQL): `Slot Team` with `manager` (coordinator) and `worker`, no defaults. New chat for it on AGY `MODEL`; the first message makes the manager delegate the Writer (catalog copy W, ALT).
2. The manager messages `/worker` (the slot runs and gets its own AGY conversation).
3. From W's conversation: `delegate_task` to `/worker` → copy C1. Expect `delegated:true`, C1 starts on `MODEL`.
4. Own file of C1 (`memory/agents/<C1>/run_metadata.json` in the owned data root): the 6 launch keys set (`llmModelIdentifier = MODEL`), `taskAgent.address = /worker`, `taskAgent.launchSource.origin = configured`, no `origin` anywhere. The Team tree DTO's C1 task has `source` with `launch_source.origin = configured` (AC-002).
5. Settings rows: C1 row `data-source = configured`, summary says "As configured in this run" (AC-004). Sidebar: C1 reads `worker` (address basename), W reads as a spaced name (D-7).
6. Stop the Team run from Settings. In the stopped run's Settings, change the `/worker` member's model to ALT; Save; the stored slot is ALT, C1's `source` is still `MODEL` (AC-003 precondition, AC-004).
7. Restore: from the manager, `send_message_to` C1 by run id → C1 resumes with `--model MODEL` and `--conversation` = C1's own session, not the slot's (AC-001, AC-004 runtime session).
8. From W: `delegate_task` to `/worker` again → C2 starts on ALT; its own file records ALT (AC-003).
9. Settings rows: C1 `MODEL`, C2 `ALT`, both "As configured in this run"; the app's Team context of each agent (Pinia `agentTeamContexts`, what its conversation and composer read): C1 `MODEL`, C2 `ALT`, slot `ALT`, all named `worker`; `getTeamMemberRunProjection` for C1 has C1's conversation and not the slot's (run view).
   - Revised during the trial runs: "+" from any agent of a Team run opens a New chat for the whole Team (existing behavior, `TeamCanonicalPlus.spec.ts`), so it is no per-copy context check; the store context is the direct observable.

### DCR-002 steps (Org root)

1. Definitions: `Slot Org` = `manager` (agent), `writer` (agent, default ALT), `pair` (mounted Team, default ALT: lead, engineer on Grok). Org default `MODEL`.
2. The manager messages `/writer` (slot session); delegates `/writer` → CW (configured agent copy, ALT) and `/pair` → CP (configured Team copy, lead on ALT).
3. Own files: CW complete with `configured` launch source, no `origin`. CP's own tree (`memory/agent_teams/<CP>/team_run_execution_tree.json`): every member has `launchConfiguration` and `followsTeam` (lead `true` despite its own auto-approve, engineer `false`), handoffs start at members, `configured` default launch source, no `origin` (AC-002, AC-011(a)).
4. Settings rows: CW and CP read "As configured in this run".
5. Stop the Org. In its Settings, change `/writer` to `MODEL` and the `/pair` Team model to `MODEL`; Save.
6. Restore from the manager by run id: CW resumes on ALT with its own conversation; CP's lead resumes on ALT (AC-001).
7. Delegate `/writer` and `/pair` again: the new copies start from the edited slot (`MODEL`), as their own files and CLI launches show (AC-003).
8. The app's Org context of CW, CW2 and the `/writer` slot (Pinia `agentOrgContexts`): each on its own model, all named as the slot.

### DCR-003 steps (AC-011(a))

Constraints found in the trial runs: Antigravity always runs with auto-approve (`agentRunRuntimeDraftPolicy.ts`; its toggle is locked), so an AGY member cannot have its own auto-approve; the Grok replay fixture offers one model (`grok-4.7`), so a Team-level model change cannot be observed on Grok; members of a mounted Team have no workspace control of their own. Restore decides following only from the recorded `followsTeam` (D-5, `followerAddresses`), and the configured rule compares runtime, model and model settings only (`followsConfiguredTeam`).

1. `Slot Org3` = `manager`, `gpair` (Grok Team default; lead without default, helper on AGY ALT), `pair` (AGY Team default ALT; lead, engineer on Grok). On the Org launch page the `/gpair/lead` approval is toggled to "Ask first" (its own auto-approve; Team model).
2. The slot readback shows the Grok lead with `autoExecuteTools: false` and the Team's runtime and model.
3. Delegate `/gpair`: the copy's own tree records the lead `followsTeam: true` with `autoExecuteTools: false` kept, the AGY helper `followsTeam: false` (AC-011(a) recorded shape).
4. Delegate `/pair`: the copy's own tree records the lead `followsTeam: true`, the Grok engineer `false`.
5. Stop the `/pair` copy from its Settings row, choose `MODEL` for the Team copy, Save: the following lead's row shows `MODEL`, the engineer keeps Grok.
6. Message the copy's lead by run id: it resumes its own conversation on `MODEL` (a Team-level choice reaches a configured-place copy's follower through `followsTeam`).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-11, API-12, API-13 | `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs` (registered by `delegated-launch-defaults-probe.mjs`), package script `test:e2e:delegated-copy-own-file` | The restore-after-slot-edit and configured-copy display journeys cross server, contract and web; this probe is the project's documented surface for them (TESTING.md "Browser probes"), and the existing cases cover only catalog copies |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-10..13 | `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Register the new case module (like SSR); header lists the DCR cases | No change to existing cases |
| API-11..13 | `autobyteus-web/package.json` | Add `test:e2e:delegated-copy-own-file` | Mirrors `test:e2e:delegated-copy-model-change` |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Desktop framework / shell: Electron (`autobyteus-web` electron).
- Testing guideline used: TESTING.md "Choosing the path".
- Web-equivalent behavior: Settings rows, sidebar names, composer, conversation; proven in the browser probe.
- Shell-specific or lifecycle behavior: none changed (no Electron, preload or packaging code in the diff).
- Chosen validation approach and why: browser probe against the real built backend. A packaged desktop upgrade would run the same `dist` server's startup migration, which API-09 runs through the real entrypoint; no shell code is involved.
- How the run avoids disturbing an already-running desktop application: the user's AutoByteus (`/Applications/AutoByteus.app`, data `~/.autobyteus`) is running; the probe uses its own free ports, temp data root, HOME and a fresh headless Chrome. Nothing reads or writes `~/.autobyteus`.

## Live Environment And Fixture Plan

- Startup order and commands: build (API-08) → probe (owns prisma migrate on its own sqlite, backend, Nuxt dev, Chrome).
- Environment choices: scripted AGY CLI logs every launch argv (`--model`, `--conversation`) to `agy-argv.jsonl`; this is the observable for "which settings a copy started/restored with".
- Health / readiness checks: backend `/rest/health`; Nuxt `/chat`; route warm-up.
- Seed data / fixtures: definitions through GraphQL; everything else through the UI.
- Requirement-linked journeys: DCR-001, DCR-002 above.
- Evidence to capture: evidence JSON (per-case details: run ids, own-file excerpts, rows, argv), screenshots of Settings rows, the probe log, the ledger.
- Owned processes and temporary state to clean up: backend, Nuxt, Chrome, temp root (probe cleanup receipt).

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Required Follow-Up Or Escalation |
| --- | --- | --- | --- | --- |
| AC-010: the user's real data converted by the released app after his backup, and his check of the 4 + 2 converted copies | Real data must not be used by tests (TESTING.md, REQ-010/011) | Real data shapes outside the fixture inventory | Yes | Delivery (AC-010) |
| Packaged desktop upgrade from a hand-built released root | No desktop-shell code changed; the server startup migration is the same `dist` proven by API-09 through the real entrypoint and by DLP-006 in the browser | Low | No | None |
| Memory page "Unattributed runs" for mirrored F-X3b copies | Accepted residual (code review CAND-04), outside the Change Scope | None for this ticket | No | Delivery mentions it with AC-010 |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: DCR case module; updated: probe registration and package script)
- Reroute Required Before Validation Execution: `No`
- Recommended Owner If Reroute Required: N/A
- Notes: the case module follows the existing SSR registration pattern so the 1600-line probe does not grow.
