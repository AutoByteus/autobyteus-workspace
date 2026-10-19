# API/E2E Coverage Investigation — Work Journal

The plan. Results, confidence and the broader-validation decision are in api-e2e-execution-coverage-report.md.

## Investigation Meta

- Ticket folder: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/
- Requirements Doc: requirements-doc.md (SR-014, Approved)
- Investigation Notes: investigation-notes.md
- Solution Revision Record: solution-revision-record.md
- Design Spec: design-spec.md
- Supplemental Task Artifacts: work-journal-contract.md, work-journal-builtin-tools.json, probes/ (untracked; user-data samples, not used by tests)
- Design Review Report: design-review-report.md; Architecture Review Revision Record: architecture-review-revision-record.md (ARCH-REV-001/002/003)
- Implementation Handoff: implementation-handoff.md; Implementation Revision Record: implementation-revision-record.md (IR-001, IR-002)
- Code Review Report: code-review-report.md; Code Review Revision Record: code-review-revision-record.md (CRR-001 Fail F-001 → CRR-002 Pass)
- Delivery Revision Record: N/A
- API/E2E Revision Record: api-e2e-revision-record.md (created at the end of this round)
- Current API/E2E Revision ID: `API-REV-001`
- Current Investigation Round: 1
- Trigger: code_reviewer CRR-002 Pass, "ready for API/E2E and executable validation"
- Prior Investigation Reviewed: none
- Latest Authoritative Investigation: this file
- Code under test: branch codex/work-journal @ c13882fa41 (code last changed at 8f5bb563b1; later commits are ticket docs only)

## Current Requirement And Design Basis

- **Rendering (DEC-W9):** one renderer turns each run's raw traces into `<run memory folder>/work_journal/`:
  - `work_journal_NNNNNN.md` per closed raw-trace segment;
  - `work_journal_active.md` for the open file;
  - `work_journal_manifest.json`.
- **Format (REQ-W1, W2, W3, W4):**
  - built-ins become plain actions (Command / Write file / Edit file / Search web); every other tool becomes `Tool: <name>`;
  - senders, notices and attachments are shown;
  - runtime machinery is omitted (D5);
  - shortening is visible;
  - every entry links to its raw record.
- **Lifecycle (REQ-W5, W6):**
  - a per-run updater re-renders the open file after each turn end (TURN_COMPLETED/TURN_INTERRUPTED/COMPACTION_STATUS), after the memory recorder is idle;
  - closed files are written once;
  - old runs get their journal at the first need (turn end or skill-improvement start);
  - failures are logged and never affect the run.
- **Generation (REQ-W7):** deterministic, no model.
- **Consumers and naming (REQ-W8):** skill improvement uses the journal package (trigger lists the paths; session reader tolerant); "work trace" is gone.
- **Migration:** a startup migration deletes old `work_traces/` exports.
- **No regression (REQ-W9).**
- **Design escalation triggers to watch:**
  - (1) AutoByteus native raw traces not flushed by TURN_COMPLETED;
  - (2) turn-end rendering delays later turns;
  - (3) a run-folder reader breaks on `work_journal/`;
  - (4) a raw-trace shape the contract does not cover.

## Supported Scenarios And Real Usage

- **Designer scenarios covered:**
  - SCN-W1 (all five runtimes, live);
  - SCN-W2 and W3 (unit fixtures, reused);
  - SCN-W4 (live edit plus unit);
  - SCN-W5 (live compaction plus scripted rotation);
  - SCN-W6 (restore of a run without `work_journal/`, and a skill-improvement start);
  - SCN-W7 (unknown tool, unit; AutoByteus/MCP tools in live runs).
- **Added real-use scenarios:**
  - RU-1: the user restores an older run (terminate → restore → message) whose folder has raw traces but no journal. Trigger: the GraphQL restore plus a WebSocket message.
  - RU-2: the user starts Skill Improvement from the run detail of a live run. Trigger: GraphQL `startAgentRunSkillImprovement`.
  - RU-3: the app starts on a data root that holds old `work_traces/` exports. Trigger: the built startup entrypoint.
- **Unsupported/contrived scenarios:** a second server process writing the same run folder (design tradeoff CM-8). Not tested.

## Changed Behavior Summary

| Behavior | Change | Coverage consequence |
| --- | --- | --- |
| BEH-W1 plain actions | Added | unit (reused); live per runtime (new) |
| BEH-W2 senders/notices/shortening/links | Added | unit (reused); live link resolution |
| BEH-W3 kept current, closed write-once | Added | unit (reused); live AC-W6 after each turn; live compaction; scripted rotation |
| BEH-W4 old runs at first need | Added | restore journey; skill-improvement start |
| BEH-W5 skill improvement on the journal | Changed | unit/integration (reused); real-server start with a real improver run |
| BEH-W6 old export removal | Added (migration) | unit (reused); built-startup E2E on synthesized data |
| REQ-W9 no regression | Preserved | unit/integration (reused); server E2E suite |

## Changed Surface And Boundary Classification

| Surface | Affected | Changed boundary | Repository evidence | Risk not exercised | Broader mode |
| --- | --- | --- | --- | --- | --- |
| Domain / backend logic | Yes | renderer, translations, service, store | IMP-02 (76 unit tests with hand-built fixtures) | real raw traces from current CLIs (new shapes, trigger 4) | live runtimes |
| API / transport / contract | Yes | skill-improvement GraphQL and trigger message; run updater on the event path | IMP-05, IMP-06 | real server ordering (recorder idle → render) | live and scripted server E2E |
| Frontend | No | doc and test title only (IMP-10) | — | — | none |
| Process / lifecycle | Yes | turn-end updates; restore; startup migration | unit | native AutoByteus flush (trigger 1); restore; built startup | live/scripted E2E; built-dist E2E |
| Persisted-data transition | Yes | new `work_journal/`; old exports removed; improver session reader | IMP-04, IMP-05 | built startup on a data root | built-dist E2E |
| External integration | Yes | real Claude, Codex, AGY, Grok and LM Studio output | none live | all | live suite |
| Browser / auth / desktop shell / workers | No | — | — | — | — |

## Project Execution Discovery

- **Worktree:** /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal (codex/work-journal @ c13882fa41).
- **Testing guideline:** /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/TESTING.md. Rules followed:
  - Rule 9: find the cause of every failure; never "pre-existing" without a cause;
  - clean env for E2E;
  - real HOME for signed-in CLIs;
  - throwaway homes for CLI config (`GROK_HOME`);
  - compaction thresholds;
  - migrations only on small synthesized data;
  - one local-model run at a time;
  - gates;
  - live runs spend the user's credits.
- **Runtimes on this machine:** claude 2.1.302, codex-cli 0.163.0, agy 1.4.2 (TESTING: live AGY runs on the host login with the real HOME and add conversations to the user's agy history), grok 1.0.62 (the user's free credits were exhausted on 2026-10-07; one small run, temporary GROK_HOME), LM Studio with qwen/qwen3.6-35b-a3b.
- **Commands:**
  - server E2E: `pnpm test:e2e`, or one file with `pnpm -C autobyteus-server-ts exec vitest run <path> --no-watch`;
  - built-dist suites: `pnpm -C autobyteus-server-ts build` first.

| Component | Setup | Cleanup |
| --- | --- | --- |
| In-process Studio server (live, scripted) | `startStudioE2eRuntimeServer` with a temp data dir | afterAll closes it and removes the temp dir |
| Built server (`dist/app.js`) for the migration E2E | `pnpm -C autobyteus-server-ts build`; spawn with `--data-dir <temp>` | the test stops the process and removes the temp root |
| Scripted AGY CLI | tests/fixtures/agy-failure-cli.mjs, `AGY_FAKE_CASE=auto_compaction` | none |

| Data / identity | Method | Safety |
| --- | --- | --- |
| Live agent definitions and runs | GraphQL on the test-owned server | temp data dir; never ~/.autobyteus |
| Old `work_traces/` exports | synthesized released shape (manifest + `work_trace_*.md`) at the three locations, plus a decoy and a symlink | test-owned root |
| Grok login | temporary GROK_HOME with an auth.json symlink | ~/.grok untouched |

## Persisted Data Transition Coverage Basis

- **Decisions:** (1) `work_journal/` is new (Not Affected); (2) old exports are Discard (startup migration); (3) `improver_session.json` is Directly Usable with a tolerant reader; (4) `evidenceSummaryHash` is Not Affected.
- **Planned evidence:**
  - (2) built startup on synthesized exports: removal, decoy kept, symlink not followed, raw traces intact, second start unchanged;
  - (3) reused IMP-05;
  - (1) live and scripted runs.

## Existing Durable Coverage Inventory

| Path | Validity | Action |
| --- | --- | --- |
| tests/agent-work-journal/** (76 tests, 2 gated perf) | Still Valid | Reused (IMP-02) |
| tests/unit/app-data-migrations/remove-work-trace-exports-migration.test.ts | Still Valid | Reused (IMP-04) |
| tests/skill-improvement/** | Still Valid | Reused (IMP-05) |
| server unit and integration suites | Still Valid | Reused (IMP-08, IMP-09) |
| tests/e2e/** (server E2E) | Still Valid; not run by implementation | run (API-02) |

## Planned Cases

| Case ID | Criteria | Boundary / Surface | Kind | Planned Command Or Steps | Why |
| --- | --- | --- | --- | --- | --- |
| API-01 | AC-W1–W9 (unit level), N1–N7 | server unit/integration, typecheck, web spec, term search | Reused | IMP-01, IMP-02, IMP-04–IMP-11 | the code they exercise is unchanged since their commits (only ticket docs after 8f5bb563b1; IR-002 changed only `text-diff.ts`, covered by IMP-02 at 8f5bb563b1) |
| API-02 | REQ-W9, AC-W9, trigger 3 | server E2E suite | Existing Test | `pnpm -C autobyteus-server-ts build`, then `pnpm test:e2e` | not run by implementation |
| API-03 | AC-W1, AC-W4, AC-W6, AC-W7, SCN-W1, SCN-W4, trigger 1 and 4 | real Studio server + real runtimes | Durable (gated) | new tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts; one small turn per runtime (ls, read, write, edit): AutoByteus (LM Studio; native flush check at TURN_COMPLETED), Claude, Codex, AGY, Grok (temp GROK_HOME) | live journal of every runtime |
| API-04 | AC-W5, SCN-W5, BEH-W3 | live compaction | Durable (gated) | in the Claude case: `/compact` → `work_journal_000001.md` closed; a further turn leaves it byte-identical | live closed file |
| API-05 | SCN-W6, BEH-W4, AC-W5 (regeneration) | real server + scripted AGY CLI (zero credits) | Durable | new tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts: turns with a checkpoint (rotation) → closed file; terminate; delete `work_journal/`; restore; a message → all files regenerated; the closed file byte-identical | old run, first need |
| API-06 | BEH-W5, AC-W8, SCN-W6 | real server + skill improvement + real improver run | Durable (gated) or probe | startAgentRunSkillImprovement on a live target whose `work_journal/` was removed: the journal is rendered at start; the improver's trigger lists existing journal paths; the improver reads one | end-to-end consumer |
| API-07 | BEH-W6, DEC-W10, persisted item 2 | built startup (`dist/app.js`) + migration runner | Durable | new tests/e2e/app-data-migrations/remove-work-trace-exports-startup.e2e.test.ts on synthesized exports (a)(b)(c), decoy, symlink | migration through real startup |
| API-08 | N2 | perf on a slower machine | Not Tested | — | optional per CRR-002; no slower machine available |

- Test progress log needed: `Yes` (api-e2e-test-progress.md).

## Durable Coverage To Add

| Case ID | Planned Test Path | Why |
| --- | --- | --- |
| API-03/04 | autobyteus-server-ts/tests/e2e/runtime/work-journal-live-runtimes.e2e.test.ts | live proof per runtime (gated; reruns cost credits) |
| API-05 | autobyteus-server-ts/tests/e2e/runtime/work-journal-restore-transport.e2e.test.ts | zero-cost restore and regeneration through the real server |
| API-06 | autobyteus-server-ts/tests/e2e/runtime/work-journal-skill-improvement.e2e.test.ts (gated) | consumer end to end |
| API-07 | autobyteus-server-ts/tests/e2e/app-data-migrations/remove-work-trace-exports-startup.e2e.test.ts | migration through built startup |

## Durable Coverage To Update / Remove

None planned at start. Changed during round 1 (see the amendment below):

| Path | Change | Why |
| --- | --- | --- |
| autobyteus-server-ts/tests/e2e/app-data-migrations/append-only-message-logs-startup.e2e.test.ts | Updated (AOML-1 setup assertion) | it asserted the append-only conversion is the *last* registered migration; this ticket intentionally registers `20261019_remove_work_trace_exports` after it. Now asserts the order own-run → conversion and also removes the records of every newer migration (they never ran on a released install either) |

## Not Tested / Infeasible / Deferred

| Behavior | Reason | Risk | User-only | Follow-up |
| --- | --- | --- | --- | --- |
| N2 cold first update on a slower machine | no slower machine; optional per CRR-002 | low (once per process) | No | Follow-up 4 if needed |

## Ambiguities Or Reroute Triggers

None at start.

## Investigation Decision

Proceed `Yes`; durable coverage added `Yes`; reroute `No`.

## Round 1 Amendments (during execution)

- **Grok: removed from live coverage by user decision.** The one allowed Grok run returned HTTP 429 `subscription:free-usage-exhausted` (free account). The user then decided to keep Grok out of this ticket's live testing; the Grok case was removed from the live suite. Grok rendering stays covered by the reused unit translations on recorded Grok traces (IMP-02).
- **AutoByteus: DeepSeek added as provider (user direction).** The live suite and the skill-improvement E2E accept `RUN_DEEPSEEK_E2E=1` with `DEEPSEEK_API_KEY` (default model `deepseek-v4-flash`), or `RUN_LMSTUDIO_E2E=1` as before. The key is taken from the user's server-data `.env` into the test's environment only, and saved into the test database's encrypted vault by the existing helper `initializeLiveRuntimeSecretVaultFromEnvironment` (TESTING.md: credentials in the vault, never by editing `.env`). It never appears in logs or evidence (checked by search).
- **API-02 found a stale existing test** (AOML-1, above) and one suite-order flake (AE-006, untouched code; passes alone).

## Round 2 (CRR-004, IR-003)

- **Delta since round 1** (b105dc9b1b → f0ff3a8671):
  - docs only from IR-003;
  - the merge b0c81c8f20 of origin/personal, which changes Codex backend code.
- **Plan:** rerun API-03c (Codex live), the only case whose exercised code changed; reuse every other case.
- **Durable coverage:** no change.

