# Implementation Handoff — work-journal

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/work-journal`, branch `codex/work-journal`, based on `origin/personal` `cba6b85122` (fast-forwarded from `55bff1f5e` before implementation, at the user's request).

Commits, oldest first:
- `d98c213afc` feat(server): Work Journal replaces the work-trace export
- `b19714658c` test(server): baseline fix for two stale skill-improvement tests (TESTING.md Rule 9; not caused by this change)
- `ea867f9708` feat(server): Work Journal content scope D5 (SR-014)
- `8f5bb563b1` fix(server): keep in-hunk `--- `/`+++ ` lines in Work Journal patches (CRR-001 F-001, IR-002)
- `b9d04998a4` docs: rollback compatibility applies only to data-converting migrations (SR-018, ARCH-REV-005, IR-003; the Solution Designer's edits, committed unchanged)
- the ticket-folder commit that carries this handoff and `evidence/` (see the handoff message)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large/High). ARCH-REV-001 Pass on SR-010 (notes N1–N7), ARCH-REV-002 on SR-012 (collaboration_model.md §3 row), ARCH-REV-003 Pass on SR-014 (content scope D5).
- Requirements doc: `tickets/in-progress/work-journal/requirements-doc.md` (SR-014)
- Investigation notes: `tickets/in-progress/work-journal/investigation-notes.md`
- Solution revision record: `tickets/in-progress/work-journal/solution-revision-record.md`
- Design spec: `tickets/in-progress/work-journal/design-spec.md`
- Supplemental task artifacts: `work-journal-contract.md` (format specification), `work-journal-builtin-tools.json` (built-in table oracle, copied verbatim to `autobyteus-server-ts/tests/fixtures/agent-work-journal/`), `probes/`
- Design review report: `tickets/in-progress/work-journal/design-review-report.md`
- Architecture review revision record: `tickets/in-progress/work-journal/architecture-review-revision-record.md`
- Triggering rework report: `code-review-report.md` CRR-001 (Fail — Local Fix F-001), recorded in `code-review-revision-record.md`. ARCH-REV-003 arrived during the initial implementation and is included in IR-001.

## Current Implementation Summary

A new subsystem `autobyteus-server-ts/src/agent-work-journal/` renders each run's raw traces into `<run memory folder>/work_journal/`. It writes one Markdown file per raw-trace file and a manifest. A per-run updater keeps live runs current, and skill improvement consumes the package. The old `src/agent-work-traces` export and its replay-projection options are removed. A startup migration deletes the retired `work_traces/` folders.

- Implementation cycle: `Rework` (IR-003: SR-018 docs, after the IR-002 Local Fix)
- Implementation revision record: `tickets/in-progress/work-journal/implementation-revision-record.md`
- Current implementation revision ID: `IR-003` (baseline `IR-001`; IR-002 Local Fix F-001)
- Related solution revision IDs: `SR-010`, `SR-012`, `SR-014`, `SR-018` (`SR-016` withdrawn)
- Related architecture-review revision IDs: `ARCH-REV-001`, `ARCH-REV-002`, `ARCH-REV-003`, `ARCH-REV-005` (`ARCH-REV-004` withdrawn)
- Related code-review revision IDs: `CRR-001`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `F-001` (CRR-001). NB-1 and NB-2 need no action. N1–N7 were applied in IR-001.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale:
  - The scope matches the design: a new subsystem (about 20 source files), a new per-run attachment in both composition roots, the replaced skill-improvement evidence contract and session reader, a removed subsystem, and one startup migration.
  - The run event path and persisted derived data are touched as designed.
- Selected route: `Code Review`
- Lightweight implementation self-review for the direct route: `Not Applicable` (Large/High)
- New design impact or escalation trigger: `None` blocking. Two observations for the reviewer (not routed as Design Impact; see Known Risks):
  1. N2 threshold: one cold first-update sample breached the 100 ms p90 threshold (269 ms) in 1 of 5 runs. Every per-turn update was within it.
  2. A built-in reading of the escalation trigger "AutoByteus native raw traces are not flushed by TURN_COMPLETED" is left to API/E2E (live run). The unit fixture covers the external-runtime path.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-W1 (REQ-W1, W7; AC-W1, AC-W7) | Built-ins become plain actions per runtime; other tools use `Tool: <name>`; deterministic, no model | `rendering/runtimes/{claude,codex,antigravity,grok,autobyteus}-translation.ts`, `runtime-translation.ts` (registry; unknown runtime → generic), `generic-tool-line.ts`, `journal-actions.ts`, `command-text.ts`, `text-diff.ts`, `result-envelopes.ts` | Built-in names equal the oracle for every RuntimeKind. The AC-W1 groups (command, file search, read, write, edit, web search, web page, unknown tool with envelopes and an image) render identically across runtimes, apart from AutoByteus's recorded `exit 0` (contract §2: a recorded exit code is shown). |
| BEH-W2 (REQ-W2, W3, W4; AC-W2–W4) | Senders, notices, attachments, interruptions; visible shortening with links; rendered + omitted = source; (SR-014 D5) no compaction, system-instruction or recovery lines | `rendering/non-tool-record-lines.ts`, `teammate-message-envelope.ts`, `output-shortener.ts`, `work-journal-file-renderer.ts` | The teammate sender comes from the address, else the run id or name, with `Files:`. Attachments and `Notice:` lines are shown. A 1,200-line output shows `…[1160 lines omitted; full output: [raw#rt_002](…)]`. Every link resolves to a record of the source file. The accounting identity holds, and D5 records are omitted. |
| BEH-W3 (REQ-W5, W6; AC-W5, AC-W6) | Open file re-rendered after each turn; closed file written once; failures logged, run unaffected | `services/work-journal-run-updater.ts`; `services/work-journal-service.ts`; `store/work-journal-store.ts`; `agent-execution/services/agent-run-resource-manager.ts` (attached after the memory recorder, N1); both composition roots | A non-compacting run has one open file. A closed file is byte-identical on regeneration and isn't rewritten. Revision, runtime, record count (N4) or a missing file trigger a re-render. A forced write failure is logged, the raw traces are untouched, and the next call recovers. |
| BEH-W4 (REQ-W6 old runs) | Missing closed files are rendered at first need; no startup scan | `WorkJournalService.ensureCurrent` (reconcile) | An unreadable or absent manifest re-renders everything once. There is no scan at startup. |
| BEH-W5 (REQ-W8; AC-W8) | Skill improvement uses the Work Journal package; "work trace" is gone | `skill-improvement/services/skill-improvement-service.ts` (runtime from the live AgentRun, N5), `domain/improver-session.ts`, `improver-session/*-{store,service,trigger-message-builder}.ts`; templates `built-in-agents/templates/retrospective-skill-improver/**` | The trigger says "Use the listed Work Journal files as the evidence package" and lists the manifest, root and files. The metadata keys are `skill_improvement_work_journal_{manifest,root}_path`. The session reader is tolerant: an old file loads with the journal fields absent, and its old keys disappear on save. The term search (IMP-11) leaves matches only in the migration, its registry entry and one historical doc line. |
| BEH-W6 (REQ-W8, W9; DEC-W10) | Old `work_traces/` folders deleted once; raw traces, history and restore unchanged | `app-data-migrations/migrations/remove-work-trace-exports-migration.ts` + registry entry | Recognized folders (manifest present) at the three released locations are `MIGRATED`. The decoy is kept as `SKIPPED`, a symlink is not followed, and a delete error is a `FAILED` item with `SUCCEEDED_WITH_WARNINGS`. The migration is idempotent, and N7 holds: it never walks into a recognized folder. |
| REQ-W9 (no regression) | Raw-trace recording, rotation, restore and run-history display unchanged | `run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` (export-only options removed) | The run-history, agent-memory, agent-execution and migration suites pass. The full-suite comparison with the base shows no new failure. |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`.
  - The two baseline test fixes are TESTING.md Rule 9 fixes in their own labelled commit.
  - The architecture-guard failure is reported as a follow-up, not changed.

## Key Files Or Areas

- `autobyteus-server-ts/src/agent-work-journal/`:
  - `domain/work-journal-models.ts`
  - `services/work-journal-service.ts`, `services/work-journal-run-updater.ts`
  - `store/work-journal-store.ts`
  - `rendering/**`: renderer, shortener, envelopes, command text, diff, journal actions, generic rule, §8 lines, teammate envelope, and five runtime translations.
- `src/agent-execution/services/agent-run-resource-manager.ts`; `src/agent-execution/runtime/general-process-run-supervisor.ts`; `src/application-platform/execution/application-execution-scope-kernel-builder.ts`
- `src/skill-improvement/**` (service, domain, session store, service and trigger builder); `src/built-in-agents/templates/retrospective-skill-improver/**`
- `src/app-data-migrations/migrations/remove-work-trace-exports-migration.ts`, `app-data-migration-registry.ts`
- `src/run-history/projection/transformers/raw-trace-to-historical-replay-events.ts` (removal only)
- Removed: `src/agent-work-traces/**`, `tests/agent-work-traces/**`, `docs/modules/agent_work_traces.md`
- Docs:
  - added `docs/modules/agent_work_journal.md`;
  - updated `docs/{ARCHITECTURE,PROJECT_OVERVIEW,README}.md`, `docs/modules/{README,agent_memory,skill_improvement}.md`, `docs/design/collaboration_model.md` §3 (ARCH-REV-002) and `autobyteus-web/docs/{settings,agent_execution_architecture,skills}.md`.
- Tests:
  - `tests/agent-work-journal/**`;
  - `tests/unit/app-data-migrations/remove-work-trace-exports-migration.test.ts`;
  - updated skill-improvement, resource-manager and registry-order tests;
  - fixture call sites;
  - web spec title (N6).

## Important Assumptions

These interpretations of the contract or design were made where the text left a choice:

1. **Links on every entry, messages included.** Every entry carries `[↗](../<raw file>#<id>)` on its last line (REQ-W4). Omission markers use `[raw#<id>](../<raw file>#<id>)`. Details taken from the arguments link to the call record, and output links to the result record.
2. **Day changes.** A `[YYYY-MM-DD]` line marks a change of day within a file.
3. **Shortening scope.** Shortening applies to tool material only (output, diff, written content, arguments); messages are shown in full.
4. **Diff and marker forms.** Unified diff lines are written ` x`/`-x`/`+x` (no space after the marker). Written content is cut with `…[n more lines: …]`, and a diff with `…[n more diff lines: …]`.
5. **Unknown record types.** A trace type the contract does not name renders as `Record (<type>): <content>`, never dropped (REQ-W2).
6. **Manifest additions.** The manifest adds `content_sha256` per file (N3: the evidence hash is sha256 over `"<journal_file> <content_sha256>\n"` in order, so closed files are never re-read). The open file's `source_record_count` is the rendered record count (informational).
7. **AGY notes.** `toolAction`, `toolSummary` and `WaitMsBeforeAsync` are stripped from every AGY call, not only built-ins.
8. **System reminders.** `<system-reminder>` blocks: 0 occurrences in the probes, so no rule was added.
9. **Open-file writes.** An open file is written only when its content hash changed. A journal file whose raw file disappeared (the open file after rotation) is removed.
10. **Migration placement.**
    - Its ID is `20261019_remove_work_trace_exports`, with prerequisite `20261017_task_agent_own_run_v1`.
    - It is registered after `20261018_append_only_message_logs_v1`, which arrived with the rebase; that one's "Registered last" comment was reworded to state its actual rule.
    - The collaborators-to-delegated-runs registry-order test now checks adjacency by ID instead of end positions.
11. **Migration reports.** Only symlinks named `work_traces` are reported (as `SKIPPED`); other symlinks are simply not followed. A delete failure always gives `SUCCEEDED_WITH_WARNINGS` (design item 4).
12. **Interruption reason text.** `operation_boundary` with another reason shows the reason as recorded (`Turn interrupted (shutdown_requested).`). A record without a reason reads `Turn interrupted.`
13. **The ripgrep `glob` argument.** Claude/Grok `glob` text is one glob (`*.{ts,vue}` keeps its comma); an array is several. Only AGY's Includes/Extensions/Excludes are split on commas and spaces.
14. **Renderer result counts.** The renderer returns rendered and omitted record counts. They back the AC-W2 test; the service doesn't store them.
15. **Added helper file.** `rendering/journal-actions.ts` is a file not named in the design's file map. It holds the shared Command/Write/Edit/Search-web line builders that all translations use.
16. **Message-envelope parsing.** It recognises both the current and the older teammate envelope, with or without the address.

## Known Risks

- **N2 main-thread cost** (IMP-03; threshold fixed before measuring: ≤100 ms for a 5.2 MB p90 open file, ≤1,000 ms for the 28 MB max):
  - **Per-turn (warm) updates:** p90 64–92 ms and max 321–645 ms across 5 runs, all within threshold.
  - **Cold first update in a process:** p90 71–82 ms in 4 runs, and 269 ms in one run, a breach of the stated threshold. The cause wasn't isolated (JIT warm-up, GC or machine load); it is a once-per-process first update, not a per-turn cost.
  - **Margin:** the p90 margin is small (92 ms against 100 ms) on an Apple-silicon machine and will be smaller on slower hardware.
  - **Judgement:** I did not route this as Design Impact, because the trigger is about delaying later turns and every per-turn sample is within threshold. The reviewer may decide otherwise; Follow-up 4 (incremental append) is the designed remedy.
  - **Cost breakdown** for the max file: about 25 ms listing (the active file is read once to count lines), 68 ms read and normalize, 242 ms render and 18 ms hash.
- **AutoByteus write ordering:** the design asks validation to confirm that native raw traces are flushed by the time TURN_COMPLETED is observed. My unit test covers an AutoByteus run whose raw files are already written (compaction → closed file) and the external-runtime recorder ordering (N1). The native ordering needs a live AutoByteus run (API/E2E).
- **No redaction:** the journal shows what the raw traces recorded. The old skill_improvement.md claimed redaction of credentials and home paths, but the removed code never implemented it (no redaction code in `src/agent-work-traces`). The docs now state the actual behavior. The journal is no less private than the export it replaces.
- **Journal size:** it is about 40% of the open raw file in the synthetic mix (2.0 MB for 5.2 MB). Memory sync carries these derived bytes (design tradeoff).

- **Ticket `probes/` not committed:** `probes/*.json` and `*.txt` hold samples copied from the user's raw traces (record IDs, org/run folder paths, other home-directory paths). I committed the ticket documents and my evidence but left `probes/` untracked. Whether it may enter the repository is the Solution Designer's decision (it is their artifact). The hand-built test fixtures don't use it.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Feature`, with replacement of an existing export
- Reviewed root-cause classification: `Boundary Or Ownership Issue`
- Reviewed refactor decision: `Refactor Needed Now`
- Implementation matched the reviewed assessment: `Yes`. The journal has its own subsystem reading normalized raw records. The export and the replay projection's export-only options are deleted, and the replay projection is otherwise untouched.
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: `git show d98c213afc --stat`; the replay transformer diff removes only `interactionByIdentity`, `traceById` and `includedToolIdentityKeys`.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`. The session reader is the approved tolerant projection (Persisted Data item 3), with no version branch.
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed (Core Principle 7): `Yes`
  - the export subsystem and its tests;
  - the export-only replay options;
  - after D5, the compaction, duration and count helpers in `non-tool-record-lines.ts`.
- Dead code found elsewhere, listed as follow-up: None
- Shared structures remain tight: `Yes`. `RuntimeTranslation` has required members plus three optional per-runtime hooks. The manifest has one meaning per field.
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`
  - The largest new source file is `work-journal-file-renderer.ts` at 245 effective lines.
  - `general-process-run-supervisor.ts` went from 486 to 489 lines, still under 500.
  - Two test files already over 500 lines (agent-run-manager.test.ts at 707, codex-live-memory-persistence.e2e.test.ts at 678) were kept at their base line counts.
- Notes: the `>220` changed-line signal applies to the new subsystem as a whole, which is the designed size; no single file exceeds it.

## Persisted Data Transition Check (When Applicable)

- Approved decisions:
  - (1) `work_journal/`: `Not Affected` (new derived data);
  - (2) old export folders: `Discard or Rebuild` via a startup migration;
  - (3) `improver_session.json`: `Directly Usable — No Migration` with a tolerant reader;
  - (4) `evidenceSummaryHash`: `Not Affected`.
- Design-spec decision reference: "Persisted Data / State Transition Decision" items 1–4 and the data migration guideline checklist.
- Implementation follows the approved decisions: `Yes`
- Direct-use evidence:
  - IMP-05: a hand-built session file in the released shape (`schemaVersion`, `workTraces`, `lastRequest.workTraceSummaryHash`) loads by its known fields, and the save drops the old keys.
  - Unreadable files and files without a target or status load as absent.
- Discard/rebuild result: IMP-04 (migration fixtures (a)–(c), decoy, symlink, delete failure, idempotence, N7).
- Deviation from the reviewed transition decision: `None`

## Environment Or Dependency Notes

- **Setup:** after the rebase, `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prepare:shared` and `prisma generate`. `pnpm -C autobyteus-web exec nuxi prepare` was run for the web spec.
- **Strict tsconfig:** `tsc -p tsconfig.json --noEmit --rootDir .` (tests included) reports about 11,900 errors across the repository at the base, mostly TS4111 under `noPropertyAccessFromIndexSignature`. It isn't the project gate (the gate is `pnpm typecheck` on `tsconfig.build.json`, which passes). My new test files have no non-TS4111 errors there.
- **Base regression baseline** (`vitest run --exclude tests/e2e/**` at `cba6b85122`):
  - 50 failures. One was an artifact of my mid-run edit to the resource manager (diff on the `detached` object); it passes on this branch.
  - The other 49 have these causes:
    - 29 application-backend and 15 file-explorer watcher integration failures: missing build outputs (Brief Studio `dist/importable-package`, worker and watcher runtime entrypoints). `test:integration:prepare` had not been run; see IMP-09.
    - 4 failures in 2 stale skill-improvement test files (1 GraphQL resolver, 3 target notification), fixed in `b19714658c`.
    - 1 architecture guard: base added `agent-memory/services/agent-memory-explorer-service.ts` to the definition-getter occurrences that `tests/architecture/application-framework-boundaries.test.ts:3000` pins. Reported as a follow-up for its owner; not changed here.
  - After the change, the same command (before the baseline-fix and D5 commits) shows 49 failures, all in that base list, and none new.
  - At `ea867f9708`, with `test:integration:prepare` run, `test:unit` (IMP-08) and `test:integration` (IMP-09) pass with no failure. `tests/architecture/` is in neither script; its one base failure stays, as reported.

## Checks Run

Evidence files are in `tickets/in-progress/work-journal/evidence/`. Each log starts with its command, commit, environment and date.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `pnpm typecheck` (autobyteus-server-ts) | 8f5bb563b1 | macOS 26 arm64, node 22.23.1 | all of `src` | — | Pass | IMP-01-typecheck.log | `# Exit status: 0` with no `error TS` lines |
| IMP-02 | `pnpm exec vitest run tests/agent-work-journal --no-watch` | 8f5bb563b1 | same | `src/agent-work-journal/**`, resource-manager attach order, run updater | BEH-W1–W4, AC-W1–W7, N1, N3, N4, F-001 | Pass | IMP-02-work-journal-unit.log | `Tests  76 passed \| 2 skipped (78)` (the 2 skipped are the gated N2 probe); the F-001 case `inside a hunk, \`--- x\` and \`+++ x\` are a removed \`-- x\` and an added \`++ x\`` |
| IMP-03 | `RUN_WORK_JOURNAL_PERF=1 WORK_JOURNAL_PERF_OUT=… pnpm exec vitest run tests/agent-work-journal/perf --no-watch`, run 4 times | ea867f9708 | same | `WorkJournalService.ensureCurrent` on a 5.2 MB and a 28 MB synthetic open file | N2 | Within threshold per turn; 1 cold breach (see Known Risks) | IMP-03-n2-main-thread-cost{,-repeat-2,-3,-4}.{json,log} | `"worstBlockMs"`, `"withinThreshold"`, `warm[].longestBlockMs` |
| IMP-04 | `pnpm exec vitest run tests/unit/app-data-migrations --no-watch` | ea867f9708 | same | removal migration, registry order | BEH-W6, N7 | Pass | IMP-04-app-data-migrations.log | `Tests  403 passed (403)` |
| IMP-05 | `pnpm exec vitest run tests/skill-improvement --no-watch` | ea867f9708 | same | skill-improvement service, session store/service, trigger builder (real journal generation) | BEH-W5, AC-W8, N5 | Pass | IMP-05-skill-improvement.log | `Tests  27 passed (27)` |
| IMP-06 | `pnpm exec vitest run tests/unit/agent-execution --no-watch` | ea867f9708 | same | resource manager, run manager, lifecycle service | BEH-W3, REQ-W9 | Pass | IMP-06-agent-execution.excerpt.log (full log: /tmp/wj-evidence-full/IMP-06-agent-execution.log) | `Tests  1488 passed \| 6 skipped (1494)` |
| IMP-07 | `pnpm exec vitest run tests/unit/run-history tests/integration/run-history tests/unit/agent-memory --no-watch` | ea867f9708 | same | replay transformer, raw-trace source, recorder | REQ-W9 | Pass | IMP-07-run-history-agent-memory.log | `Tests  387 passed (387)` |
| IMP-08 | `pnpm test:unit` | ea867f9708 | same | all server unit tests | REQ-W9 | Pass | IMP-08-test-unit.excerpt.log (full log: /tmp/wj-evidence-full/IMP-08-test-unit.log) | `Tests  5979 passed \| 7 skipped (5986)`, no `FAIL` line |
| IMP-09 | `pnpm test:integration:prepare`, then `pnpm test:integration` | ea867f9708 | same | all server integration tests | REQ-W9 | Pass | IMP-09a-test-integration-prepare.log, IMP-09-test-integration.excerpt.log (full log: /tmp/wj-evidence-full/IMP-09-test-integration.log) | `Integration test prerequisites are present.`; `Tests  415 passed \| 70 skipped (485)`, no `FAIL` line |
| IMP-10 | `NUXT_TEST=true pnpm exec vitest run services/runHydration/__tests__/runProjectionConversation.spec.ts` (autobyteus-web) | ea867f9708 | same | renamed spec (N6) | AC-W8 | Pass | IMP-10-web-run-projection-conversation.log | `Tests  14 passed (14)` |
| IMP-11 | `git grep -n -i -E "work.?trace" -- autobyteus-server-ts/src autobyteus-server-ts/docs autobyteus-web` | ea867f9708 | same | names in code and docs | AC-W8 | Pass | IMP-11-work-trace-term-search.log | `files: …agent_work_journal.md …app-data-migration-registry.ts …remove-work-trace-exports-migration.ts` (the migration, its registry entry and one historical doc line only) |

- IMP-03 to IMP-11 ran at `ea867f9708`. IR-002 changes only `rendering/text-diff.ts` (`readPatch`) and its unit test, which IMP-02 covers; the other results are reused unchanged.
- Not run, and why:
  - server E2E (`tests/e2e/**`) and live runtime runs: left to API/E2E. This covers one live run per runtime, Grok kept to one small run with a temporary `GROK_HOME`, AutoByteus native write ordering, and AC-W6 on a live run.
  - The e2e files whose fixtures I changed (codex-live-memory-persistence, codex-interrupted-compaction) only gained a no-op `workJournalUpdater`; they need live Codex.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable: the change is backend-only. The web package changes are three doc files and one test title (N6); no rendered surface changed.

## Downstream Coverage Hints / Suggested Scenarios

- One live run per runtime (Claude, Codex, AGY, Grok with one small run under a temporary `GROK_HOME`, AutoByteus): after each turn `work_journal_active.md` includes it (AC-W6). Compare a command, a read, an edit and a web search across runtimes with the AC-W1 groups.
- AutoByteus native: confirm the turn's raw records are on disk when TURN_COMPLETED is observed (design escalation trigger 1).
- Compaction on a live run: the closed `work_journal_00000N.md` appears and isn't rewritten afterwards.
- A restored old run without `work_journal/`: the first turn end (or a skill-improvement start) renders all files.
- Skill improvement end to end: the improver's trigger lists journal paths, and the improver can read them.
- Startup migration on a copy of a memory folder that contains `work_traces/` exports (test-owned data only; never `~/.autobyteus`).
- N2 on a slower machine, if the reviewer wants the cold first-update margin checked.

## API / E2E / Executable Coverage Investigation And Execution Still Required

All live-runtime validation listed above, plus the server E2E suite.
