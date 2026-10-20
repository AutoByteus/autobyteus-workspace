# API/E2E Coverage Investigation

Ticket `remove-skill-improvement` (autobyteus-205). Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`, branch `codex/remove-skill-improvement`, head received `46c1c6b83d` (code-review documents on `1f0ae5ea9c`; last source commit `a71e93a7f2`). Paths below are relative to `tickets/in-progress/remove-skill-improvement/` unless absolute.

## Investigation Meta

- Requirements Doc: `requirements-doc.md` (Approved; REQ-001..REQ-006, AC-001..AC-005, DEC-001..DEC-005)
- Investigation Notes: `investigation-notes.md` (F-01..F-11, A-01..A-09)
- Solution Revision Record: `solution-revision-record.md` (SR-001..SR-004)
- Design Spec: `design-spec.md` (SR-004; M1..M6)
- Supplemental Task Artifacts: `release-notes.md` (delivery's, AC-005); `follow-ups.md` (FU-001..FU-003)
- Design Review Report: `design-review-report.md` (ARCH-REV-002, Pass)
- Architecture Review Revision Record: `architecture-review-revision-record.md`
- Implementation Handoff: `implementation-handoff.md` (IR-001)
- Implementation Revision Record: `implementation-revision-record.md`
- Code Review Report: `code-review-report.md` (CRR-001, Pass, 9.45/10)
- Code Review Revision Record: `code-review-revision-record.md`
- Delivery Revision Record: N/A
- API/E2E Revision Record: `api-e2e-revision-record.md`
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code review CRR-001 Pass → API/E2E (message from `/software_engineering_team/code_reviewer`)
- Prior Investigation Reviewed: N/A
- Latest Authoritative Investigation: this file, round 1

## Current Requirement And Design Basis

- Skill Improvement and everything only it used are removed from server, web, docs and tests (REQ-001, REQ-002): GraphQL API, Settings toggle card, composer "Improve skills" CTA, built-in Retrospective Skill Improver, two predefined settings, the direct-message grant mechanism (a branch on every `send_message_to` by run id), and the `server_helper` launch purpose.
- `send_message_to` between runs keeps every result code other than the grant-only ones (BEH-003; design escalation trigger 3).
- The three settings keys are retired by `retiredSettingNames`: deleted from `.env` at config initialization and refused when written (BEH-004, D-5).
- The startup migration `20261020_remove_skill_improvement_data` deletes the feature's data once (M1..M6). Unrelated data stays byte-identical, a second start changes nothing, and a failed step never blocks startup (REQ-004, REQ-005, AC-003, AC-004).
- Implementation and code review proved this in server unit, integration and startup e2e (SID-1..3), web unit, guards, the AC-001 sweep and a rendered Settings/new-chat check (IMP-01..IMP-13). The system-boundary gaps named by the code reviewer and the handoff:
  - the upgrade in a real product surface: other runs list, open **and resume**; Memory and Agents pages;
  - `send_message_to` through real tool calls;
  - the composers of an existing standalone run and of a Team member;
  - Settings Advanced (retired keys absent and refused).

## Supported Scenarios And Real Usage

- Designer scenarios covered: UC-001 (removal; rendered surfaces), UC-002 (startup with old data and a fresh folder), UC-003 (one-time removal), DS-001 (`send_message_to`), DS-002 (startup config and built-ins), DS-003 (migration).
- Real-use scenarios added from investigating the implemented behavior:
  - **Upgrade of an install that used the feature.** The runs the user works in carry the feature's per-run session folders (F-3, F-3b, F-4), and `.env` has `ENABLE_SKILL_IMPROVEMENT=true`. In that state the released app showed "Improve skills" in an existing run's composer (the CTA rendered only with the capability enabled; IMP-13 notes). The journey therefore creates real runs through the UI first, then gives the data folder the released feature data around them, restarts the backend as an upgrade, and continues working in those runs.
  - **`send_message_to` by run id reaches the router** (`send-message-to-dispatcher.ts:61`). `recipient_address` sends go through collaboration delivery and never reached the grant branch. The journeys therefore address by run id:
    - standalone to standalone (the live-run path: `DELIVERED`);
    - inside a Team root, member to member (the root path);
    - to a task copy (the root path);
    - an unknown run id (`TARGET_AGENT_RUN_NOT_ACTIVE`);
    - a task Team's run id (`TARGET_IS_TEAM_RUN`).
- Designer scenarios recorded as `Technically Possible but Unsupported/Contrived` (not tested): ad-hoc Project Tasks hosted by a helper run (design, Migration Plan "Out of scope").

## Changed Behavior Summary

| Behavior ID / Boundary | Change Type | Upstream Evidence | Coverage Consequence |
| --- | --- | --- | --- |
| BEH-001 Settings toggle card | Removed | REQ-001 | Rendered Settings Basics (IMP-13) + Advanced in the upgrade journey |
| BEH-002 Composer CTA, helper runs | Removed | REQ-001 | Existing-run and Team-member composers rendered after an upgrade from `ENABLE_SKILL_IMPROVEMENT=true` |
| BEH-003 Grant branch on `send_message_to` | Removed | REQ-002, DS-001 | Real tool calls by run id, every router path; delegated-launch-defaults probe regression |
| BEH-004 Improver bootstrap, settings | Removed; 3 keys retired | REQ-001, D-5 | Built-in smoke (IMP-05), SID-1 (IMP-06); Advanced refuses re-adding a key in the browser |
| BEH-005 Feature data | Deleted once | REQ-004, REQ-005, M1..M6 | Unit (IMP-04), startup e2e (IMP-06), browser upgrade journey with real runs |
| Preserved: Work Journal, memory, run history, Settings, default chat agent, `send_message_to` | Preserved | REQ-003 | Suites (IMP-02, 03, 07, 08), the regression probe, the upgrade journey |

## Changed Surface And Boundary Classification

| Surface / Boundary | Affected? | Actual Changed Boundary | Repository Evidence Available | Material Risk Not Exercised By That Evidence | Candidate Broader Validation Mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | router, run metadata, eligibility, built-ins, settings | IMP-02, IMP-04 (router: 8 non-grant cases unchanged) | Router reached only with in-process doubles | Real tool calls through a running server |
| API / transport / contract | Yes | GraphQL schema lost the feature's fields | IMP-12 (generated types), IMP-07 | — | — |
| Frontend component / state | Yes | Settings panel, workspace surfaces, stores | IMP-08 specs, IMP-13 (Settings Basics, new chat) | Existing-run and Team-member composers never rendered; Advanced never rendered | Browser |
| Browser integration / user journey | Yes | as above | IMP-13 only; 10 probes edited but not run | The edited probes; real journeys after an upgrade | Browser probes |
| Authentication / session / permissions | No | — | — | — | — |
| Desktop renderer / web-equivalent UI | Yes (same renderer) | as above | — | — | Browser |
| Desktop shell / Electron | No | no Electron code changed | — | — | None |
| Process / lifecycle | Yes | startup with old data; resume of existing runs | IMP-06 (open via GraphQL) | Resume (a runtime launch) after the upgrade not exercised | Browser journey with a scripted runtime |
| Persisted-data transition | Yes | migration M1..M6; retired keys | IMP-04, IMP-06 | Feature data around real runs made by the product | Browser journey |
| Worker / queue / distributed | No | — | — | — | — |
| External integration | No | scripted AGY/Grok CLIs stand in | — | — | — |

## Project Execution Discovery

- Assigned task worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/remove-skill-improvement`
- Project type and stack: pnpm monorepo; Fastify/GraphQL/WebSocket server; Nuxt web; Electron shell.
- Project testing guideline: `TESTING.md` (root; changed since my last ticket only in the real-provider test-vault section, not used here). No closer `TESTING*.md`.
- Conflicting or unclear instructions: AC-001 says "Typecheck and lint pass"; no lint command exists and the web has no working typecheck (FU-002). Recorded by the implementation; the reused IMP-10 is the documented substitute.
- Required secrets available: `N/A` (scripted runtimes only).

| Instruction / Configuration Path | Authority / Purpose | Commands, Setup, Or Constraints Learned |
| --- | --- | --- |
| `TESTING.md` | Global testing strategy | Layers; build first; `env -i` for e2e; synthesized data only for migrations; never the user's app or `~/.autobyteus`; probes own their stack, fresh `--output-dir` |
| `AGENTS.md` | Repo rules | DESIGN/TESTING/RELEASE |
| `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` header | Probe harness: scripted AGY (`CALL_TOOL:{…}`, argv log), Grok replay, owned data root, restart support, case modules | `--cases`, `--output-dir`, `--ledger-file` |
| `autobyteus-server-ts/tests/fixtures/app-data-migrations/skill-improvement-data-fixtures.ts` | Synthesized released shapes F-1..F-8b | Imports directly into Node 22 (type stripping); `writeFeatureDataRoot` writes a whole root including the history index, so the browser journey writes the same shapes around the probe's real runs with the module's exported helpers (`put`, `historyRow`, ids) |
| Edited probes' headers | Fixture-page probes (Nuxt + mocked GraphQL); `projects-feature-probe` (owned backend nodes); `cross-scope-agent-mentions-live-probe` (needs a signed-in runtime CLI) | `pnpm -C autobyteus-web test:e2e:<name> --output-dir <fresh>` |

| Component / Dependency | Working Directory | Start / Setup Command | Notes | Readiness | Stop / Cleanup |
| --- | --- | --- | --- | --- | --- |
| Server build | worktree | reused IMP-05 (`dist` built from `fc46a7b5fc`; only two unit-test files changed since) | — | `Built-in agents bootstrap smoke check passed.` | — |
| Probe stacks | `autobyteus-web` | each probe spawns its own Nuxt dev (and backend when real) | one Nuxt dev at a time per worktree | the probe's own checks | each probe's cleanup receipt |

| Data / Fixture / Identity Need | Mechanism | Safety Notes | Cleanup |
| --- | --- | --- | --- |
| Real runs (standalone, Team, task copy) | Through the UI and the scripted AGY CLI | probe-owned data root | removed with the root |
| Released feature data | The fixture module's shapes and helpers, written around the real runs while the backend is down; the 20261020 ledger row deleted, as a pre-upgrade install never ran it (the DLP-006 precedent) | synthesized; never the user's data | removed with the root |

## Persisted Data Transition Coverage Basis

- Approved decision: `Migration Required` (deletion, DEC-001 C) for records, sessions, helper runs and the definition; settings through `retiredSettingNames`.
- References: design "Persisted Data / State Transition Decision", "Migration Plan" (M1..M6), shape inventory; handoff "Persisted Data Transition Check".
- Representative existing-data setup: F-1..F-8b (IMP-04, IMP-06); in the browser, the same shapes around real product-made runs.
- Evidence planned: reused IMP-04 and IMP-06 (transformation, dispositions, second start, injected failure and retry); the browser journey (exact deletion around real runs, other files byte-identical, `.env` exact, second start, then the runs resume).
- Upstream ambiguity: none.

## Existing Durable Coverage Inventory

| Path / Test | Current Assertion Or Intent | Related | Validity | Evidence | Action |
| --- | --- | --- | --- | --- | --- |
| `tests/e2e/app-data-migrations/remove-skill-improvement-data-startup.e2e.test.ts` (SID-1..3) | Built-server startup on fresh and old data; exact deletion; second start; retry | AC-003, AC-004 | Still Valid | IMP-06 | Reuse |
| `tests/unit/app-data-migrations/remove-skill-improvement-data-migration.test.ts` | M1..M6 on F-1..F-8b | AC-004 | Still Valid | IMP-04 | Reuse |
| Router unit test | 8 non-grant cases unchanged | BEH-003 | Still Valid | IMP-04 | Reuse |
| 8 edited fixture-page probes | Product components on mocked GraphQL; the removed query's handlers deleted | BEH-001/002 (no component still sends the query) | Still Valid | not run since the edit | Rerun |
| `projects-feature-probe.mjs` | Projects journeys on owned nodes; capability query edited | REQ-003 | Still Valid | not run since the edit | Rerun |
| `cross-scope-agent-mentions-live-probe.mjs` | Live mentions; built-in id list edited | — | Still Valid | needs a signed-in runtime CLI | Not run (see Not Tested) |
| `delegated-launch-defaults-probe.mjs` (DLP, DCP, DCR) | `send_message_to` and `delegate_task` journeys in Agent, Team and Org roots with the scripted AGY | BEH-003 (regression) | Still Valid | — | Rerun |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-001 | server typecheck | Reused | IMP-01 | `fc46a7b5fc`; server source unchanged since |
| API-02 | AC-002 | server unit | Reused | IMP-02 | `a71e93a7f2` = current source |
| API-03 | AC-002 | server integration | Reused | IMP-03 | `fc46a7b5fc`; only two unit tests changed since |
| API-04 | AC-002..AC-004, BEH-003..005 | focused unit (migration, router, built-ins, config) | Reused | IMP-04 | as API-01 |
| API-05 | BEH-004 | server build and built-in smoke | Reused | IMP-05 | the `dist` the probes use |
| API-06 | AC-003, AC-004 | startup e2e SID-1..3 | Reused | IMP-06 | as API-01 |
| API-07 | AC-002 | edited server e2e | Reused | IMP-07 | as API-01 |
| API-08 | AC-002, BEH-001/002 | web unit | Reused | IMP-08 | web unchanged since `fc46a7b5fc` |
| API-09 | — | web guards | Reused | IMP-09 | same |
| API-10 | AC-001 | web `tsc` on changed lines | Reused | IMP-10 | `a71e93a7f2` |
| API-11 | AC-001 | sweep | Reused | IMP-11 (rerun by the code reviewer with the same result) | same source |
| API-12 | AC-001 | generated GraphQL proof | Reused | IMP-12 | same |
| API-13 | BEH-001/002, REQ-003 | 8 edited fixture-page probes in Chrome | Existing Test | `pnpm -C autobyteus-web test:e2e:<name> --output-dir <fresh>` for agent-org-draft-retention, agent-org-task-team-disclosure, composer-mention-discoverability, fresh-run-auto-approval, standalone-agent-error-stop, task-agent-monitor-visibility, task-agent-peer-sidebar, workspaces-sidebar-dock | Their mocks no longer answer the removed query; a component that still sent it would fail them |
| API-14 | REQ-003 | `projects-feature-probe` | Existing Test | `pnpm -C autobyteus-web test:e2e:projects --output-dir=<fresh> --skip-server-build` | Edited query; Projects preserved |
| API-15 | BEH-003, REQ-003 | delegated-launch-defaults probe (DLP-001..010, DCP-001..005, DCR-001..003) | Existing Test | `pnpm -C autobyteus-web test:e2e:delegated-launch-defaults --output-dir <fresh> --ledger-file <ledger>`; run with the new cases | `send_message_to` and delegation regression across roots |
| API-16 (probe `SIR-001`) | BEH-003, AC-002 | real Chrome → Nuxt → built backend; scripted AGY tool calls | Durable | Standalone A and B started from the UI; from A by run id: B (`DELIVERED`, B runs), an unknown id (`TARGET_AGENT_RUN_NOT_ACTIVE`). A Team run: the coordinator to the other member by run id (accepted, the member runs). A task copy: a delegated Team copy's run id (`TARGET_IS_TEAM_RUN`, names the coordinator); its coordinator by run id (accepted) | The router's paths through real tool calls |
| API-17 (probe `SIR-002`) | AC-003, AC-004, BEH-001, BEH-002, BEH-004, BEH-005 | same; backend restart as an upgrade | Durable | Steps below | The upgrade around product-made runs, then the user surfaces |

- Test progress log needed: `Yes`.

### SIR-002 steps (upgrade journey)

1. From the UI, on the fresh probe stack: a standalone chat (AGY) and a Team run whose coordinator messages the other member. The fresh start's own `20261020` record is `SUCCEEDED` (UC-002, fresh folder).
2. The backend is stopped (the app is quit). Around the real runs, the released feature data is written:
   - with the fixture module's helpers: the F-1 and F-2 roots;
   - three improver helper runs (F-5) and a `server_helper` run (F-5b), with history rows appended to the real index;
   - session folders inside the real standalone run (F-3) and the real Team member (F-3b, F-4 shape);
   - the improver definition (F-6) and the Skill Self-Evolver;
   - `.env` with the three keys interleaved, `ENABLE_SKILL_IMPROVEMENT=true`.

   The `20261020` ledger row is deleted, as on an install that never ran it. Everything is snapshotted.
3. The backend restarts. Checks:
   - the migration is `SUCCEEDED`;
   - every feature path is gone;
   - every other file that existed is byte-identical (except the history index, `.env` and the database);
   - the real history rows are unchanged and the helper rows gone;
   - `.env` is byte-identical to its pre-feature text.
4. Second start: the record stays at `attempts: 1`, and the data folder is unchanged.
5. In the browser:
   - The workspace lists the real runs.
   - The Agents page lists the Skill Self-Evolver and not the Retrospective Skill Improver.
   - The Memory page has no improver entry and no helper run id.
   - Settings: Basics has no Skill Improvement card. Advanced lists none of the three keys. Adding `ENABLE_SKILL_IMPROVEMENT` is refused with the retired-setting message, and `.env` stays unchanged.
6. The existing standalone run's composer and the Team member's composer show no "Improve skills". Each run then resumes: a message gives a new AGY launch on its own conversation, and the reply shows.

## Durable Coverage To Add

| Case ID | Planned Test Path | Why Durable Coverage Is Needed |
| --- | --- | --- |
| API-16, API-17 | `autobyteus-web/tests/e2e/skill-improvement-removal-cases.mjs` (registered by `delegated-launch-defaults-probe.mjs`, like the SSR and DCR modules), package script `test:e2e:skill-improvement-removal` | The upgrade-around-real-runs journey and the router's paths through real tool calls cross server, migration and web; the probe harness is the project's surface for them (TESTING.md "Browser probes") |

## Durable Coverage To Update

| Case ID | Existing Path / Test | Required Update | Notes |
| --- | --- | --- | --- |
| API-15..API-17 | `autobyteus-web/tests/e2e/delegated-launch-defaults-probe.mjs` | Register the module; header line | No existing case changes |
| API-16, API-17 | `autobyteus-web/package.json` | Add the script | — |

## Durable Coverage To Remove

None.

## Desktop Application Validation Plan

- Shell: Electron. No shell code changed; the upgrade runs in the server process (`dist/app.js`), the same artifact the desktop embeds.
- Approach: browser probe against the real built backend (web-equivalent renderer) plus the reused startup e2e through the real entrypoint.
- The user's running AutoByteus and `~/.autobyteus` are never touched: probes use free ports, temp data roots and HOME, and a fresh headless Chrome.

## Live Environment And Fixture Plan

- Order: reuse the current `dist`; run the probes one after another (one Nuxt dev at a time).
- Evidence: per-probe output folders (logs, result JSON, screenshots), copied into `evidence/` with case-ID names.
- Cleanup: each probe's own cleanup receipt; `/tmp/ab205e2e/` scratch outputs.

## Not Tested / Infeasible / Deferred

| Behavior / Boundary | Reason | Risk | Only The User Can Check? | Follow-Up |
| --- | --- | --- | --- | --- |
| `cross-scope-agent-mentions-live-probe` | Needs a signed-in runtime CLI (live); its edit is a built-in id list, a constant the web unit suite also covers | Low | No | None |
| AC-004 on the user's real data after his backup | Real data is never used in tests (TESTING.md) | Real-data shapes beyond the inventory | Yes | Delivery |
| AC-005 release notes | Delivery's | — | No | Delivery |
| Packaged desktop upgrade | No shell code changed; the same server `dist` runs the migration through the real entrypoint (IMP-06) and in the browser journey | Low | No | None |

## Ambiguities Or Reroute Triggers

None.

## Investigation Decision

- Proceed To API/E2E Execution: `Yes`
- Repository-Resident Durable Coverage Will Be Added / Updated / Removed: `Yes` (added: SIR module; updated: probe registration, package script)
- Reroute Required: `No`
