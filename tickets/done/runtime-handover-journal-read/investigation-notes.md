# Investigation Notes

## Investigation Meta

- Package identifier: `runtime-handover-journal-read` (autobyteus-583)
- Request / ticket: Project Task `autobyteus-583`
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-handover-journal-read-583`
- Repository mode: `Git`
- Task worktree / branch: the path above, branch `codex/runtime-handover-journal-read-583`
- Resolved base remote / branch / revision: `origin/personal` @ `90c4958a3593ea3beae754cf95e61bcfa89336cf` (fetched 2026-11-21)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created (`/tmp/wt-583.log`); `pnpm install --frozen-lockfile` and `pnpm prepare:shared` passed (`/tmp/583-install.log`, `/tmp/583-prepare.log`)
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read: requirements gate, 2026-11-21: `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`. Design gate: see `design-spec.md`.
- Investigation status: complete

## Initial Request And Clarifications

- **Original request:** Task 583 (text in `requirements-doc.md`). After a runtime switch, the new agent often fails to read the complete latest journal. When told to, it works much better. Asked for:
  - investigate the transition first;
  - change the notice so the agent is told to read the full latest file, handling the just-rotated case;
  - verify.
- **Clarifications received:** none needed.
- **User-supplied facts and constraints:**
  - private journals are read-only;
  - synthetic fixtures only;
  - no release without his word;
  - follow `DESIGN.md` and `TESTING.md`.
- **Initial ambiguity:** which file is "the latest active work journal" at hand-over. Resolved by PRB-001 (DEC-001).

## Product And Domain Understanding

- **Product area:** agent runtime switch (autobyteus-316 cross-runtime resume; autobyteus-348 members) and the work journal.
- **Affected actors or systems:** the incoming agent and the hand-over notice.
- **Existing purpose:** the notice tells the new agent that earlier work exists and where it is recorded.
- **Terminology:**
  - *Era:* the records of one agent runtime between switches.
  - *Marker:* the `system_task_notification` record with sender `system.runtime_handover`.
  - *Closed file:* a journal file rendered from an archived raw segment.
  - *Open file:* `work_journal_active.md`.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-11-21 | Code | `autobyteus-server-ts/src/runtime-handover-notices/services/runtime-handover-notice-builder.ts` | Current text | "latest" = the last listed file = `work_journal_active.md`, "a good place to start"; the earlier ones are optional | — |
| 2026-11-21 | Code | `.../runtime-handover-notice-service.ts` | How it is built | `ensureCurrent`, then `listJournalFiles`, then the builder; failures keep the notice pending | — |
| 2026-11-21 | Code | `src/agent-memory/services/runtime-switch-recorder.ts`; `autobyteus-ts/src/memory/store/run-memory-file-store.ts` `rotateActiveRawTracesForRuntimeSwitch` | What a switch does to the raw files | The records through the watermark become one segment; the active file becomes `[marker, candidate records…]` | — |
| 2026-11-21 | Code | `src/agent-memory/services/runtime-handover-reader.ts` | When the notice is pending | Only while the marker is first and no `user` record follows, so the open file holds no previous-agent record at notice time | — |
| 2026-11-21 | Code | `src/agent-work-journal/services/work-journal-service.ts` | Journal files vs raw files | One journal file per raw file: segment N → `work_journal_00000N.md`, active → `work_journal_active.md`; `listJournalFiles` already parses each file with `readJournalEntries` | — |
| 2026-11-21 | Code | `src/agent-work-journal/reading/journal-entry-reader.ts` | Entry kinds | `request`, `reply`, `action`, `notice`, `note`; the marker renders as a `Notice:` entry | DEC-002 |
| 2026-11-21 | Code | `src/agent-work-journal/rendering/non-tool-record-lines.ts` | What the candidate's records render as | `system_instruction` and `provider_compaction_boundary` are omitted (runtime machinery) | — |
| 2026-11-21 | Contract | `tickets/done/cross-runtime-resume/run-runtime-switch-contract.md` §3.3, §3.4, §3.6, I-3, I-7, I-11 | Governing contract | §3.6 wording rule: "Facts and pointers only; the agent decides what to read". I-7: no previous-agent record in the new era's file | REQ-002 replaces the wording rule |
| 2026-11-21 | Code | `src/api/graphql/types/work-journal-view.ts:74-95` | Other reader of `WorkJournalFileSummary` | Maps fields explicitly; an added field is not exposed | — |
| 2026-11-21 | Code | `tests/unit/runtime-handover-notices/*.test.ts`; `tests/agent-work-journal/services/work-journal-reading.test.ts:187-210`; `tests/e2e/runtime/runtime-switch-members-built-server.e2e.test.ts` MS-01 | Tests asserting the notice | The builder test asserts the old sentence and forbids `you must|you should`. MS-01 asserts the notice comes first in the echoed input. | Rewrite to approved behavior |
| 2026-11-21 | Doc | `autobyteus-server-ts/docs/modules/run_history.md:223-227` | Living doc of the notice | Describes the derivation and delivery, not the wording | One sentence on what the notice asks |
| 2026-11-21 | Command | `vitest run tests/probes-583` (PRB-001) | Reproduce | See below | — |
| 2026-11-21 | Data | Read-only size count over `~/.autobyteus/server-data/memory/**/raw_traces_manifest.json` (PRB-002); no content read | Realistic sizes | 1,019 run folders, 17 with a `runtime_switch` segment | — |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Contract | Stopped-run runtime change, then the next message (§3.3, §3.6) | Activation: `begin` → candidate prepared → `record` (archive, marker first) → commit. First input: `takePreface` → `ensureCurrent` → `listJournalFiles` → builder → preface before the user's text. | The notice calls `work_journal_active.md` the latest, while it holds one notice line | PRB-001 A | Reproduced |
| BEH-003 | Contract | Two switches before any message | The second `record` archives `[M1, S1]` as segment 2 | Segment 2's journal holds one notice line; the work is in 000001 | PRB-001 B | Reproduced |
| BEH-005 | Contract | Switch before the first message (§3.3 rule 2) | Watermark null, no segment | Only the open file | contract | Read |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `runtime-handover-notice-builder.ts` | Pure text from `{journalFolder, files}` | Must pick the start file and phrase the instruction | Stays pure; needs a per-file "holds work" fact |
| `WorkJournalService.listJournalFiles` | Reads and parses every file; returns name, state, size, lines, days | The fact is available at no extra cost | Add one field to the summary, or compute it in the builder's caller |
| `WorkJournalFileSummary` (`work-journal-models.ts:55`) | Summary type; readers: the notice service, the GraphQL view | An added field is safe for the view | — |
| `readJournalEntries` | Entry kinds | "Work entry" = kind ≠ `notice` | — |

## Structural And Payload Surface Inventory

### Payload Or Content Surfaces

- Files, records, documents, catalogs, fixtures, or generated payloads: the notice text, which is built on demand and not stored, and the journal summary object, which lives in memory.
- Existing readers, writers, or contracts that consume them: the agent (as model input), and the GraphQL Work Journal view, which reads the summary.
- Evidence paths: above.

### Structural Surfaces

- None changed. No API, persistence, lifecycle, security or deployment surface.
- Existing structural surfaces that can support the approved behavior: the journal service's summary and the pure builder.

### Potential Structural Impacts To Investigate

- API or external-contract change: no GraphQL change. The agent-facing text changes; that is the ticket.
- Persistence schema or invariant change: none.
- Security or privacy boundary change: none.
- Concurrency or lifecycle change: none.
- Deployment, migration, ownership-boundary, architectural-pattern, or structural-refactoring change: none.
- Confirmed absent, present, or unknown: confirmed absent.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| PRB-001: copy `probes/handover-transition.probe.test.ts` to `autobyteus-server-ts/tests/probes-583/`, then `pnpm -C autobyteus-server-ts exec vitest run tests/probes-583 --silent=false --reporter=verbose`. It runs the real `RuntimeSwitchRecorder`, `WorkJournalService`, `readPendingRuntimeHandover` and the builder on synthetic records. | A: three turns, one switch | `work_journal_000001.md` 16 lines holds the three turns. `work_journal_active.md` holds 5 lines, of which the only entry is `Notice: Agent runtime changed …`. The notice says: "The latest one, work_journal_active.md, shows what was done most recently, so it is a good place to start." | Reproduced | REQ-001, REQ-003 | `probes/handover-transition.probe.log` |
| PRB-001 | B: second switch before any input | 000001 holds the work; 000002 and active hold one notice line each; the notice points to the active file | Reproduced | REQ-001 (skip notice-only files) | same |
| PRB-001 | C: 1,500 turns | 000001 is 812.9 KB, 6,004 lines; active is 5 lines; same pointer | Reproduced | REQ-002 (read in parts) | same |
| PRB-002: read-only size count (python over manifests; sizes and line counts only) | The founder's 17 switched runs | Journal of the latest `runtime_switch` segment: 2.5–393 KB, 32–3,001 lines, median about 135 KB / 1,244 lines. 2 runs have later compaction segments. | Measured | DEC-004 (complete read is practical) | numbers here; no content copied |

- Temporary diagnostics: none in source. The probe file `autobyteus-server-ts/tests/probes-583/` is untracked and is removed before handoff. Its copy is in `probes/`.
- Reproduction for implementation to start from: PRB-001. With the change, case A must name `work_journal_000001.md` and case B must also name `work_journal_000001.md`.

## Stakeholder And User Evidence

| Source / Actor | Need, Problem, Or Constraint | Evidence Strength | Requirement Implication | Open Question |
| --- | --- | --- | --- | --- |
| Founder (Task 583, 2026-11-21) | The new agent misses context; an explicit full read fixes it | Repeated first-hand observation | REQ-002 | — |
| Founder (2026-10-30, contract §3.6) | The notice names no runtime or model | Decision | REQ-006 | — |

## External Contracts, Standards, And Dependencies

| Contract / Dependency | Version / Authority | Relevant Behavior Or Constraint | Evidence | Unknown / Risk |
| --- | --- | --- | --- | --- |
| Run runtime switch contract | archived, autobyteus-316 | §3.6 delivery unchanged; wording rule replaced | contract | — |
| Agent runtimes' file tools | Claude Read (line-limited pages), Codex shell reads | A complete read of a long file needs several calls | general knowledge; AC-005 | Model compliance |

## Persisted Data And State Facts

- Affected stored or external subject: none. The notice is built on demand.
- Remaining evidence gap: none.

## Product Design Request Context

- Product Design request in the current input: `Not stated`. The text is agent-facing.

## Product Design Findings

- N/A.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `probes/handover-transition.probe.test.ts` | Solution Designer | Reproduction (PRB-001) | Synthetic run folders | REQ-001–003 | Evidence | Not behavior-defining |
| `probes/handover-transition.probe.log` | Solution Designer | PRB-001 output (temp paths replaced by `<tmp>`) | — | REQ-001–003 | Evidence | Not behavior-defining |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| RSK-001 | Risk | Some models may still read only part of a long file | AC-005 | Live check records it; a follow-up if a runtime ignores it | Open (verification) |
| RSK-002 | Risk | A future journal larger than a model's context | Reading in parts still works; the agent sees the size | No cap now (DEC-004) | Accepted |
| UNK-001 | Unknown | Whether Grok's captured instructions render as a work entry in the open file | They would make the open file look like it holds work | Only closed files are considered (I-7), so it does not matter | Closed |

## Architecture Investigation Findings

- **Production path, from activation to notice:**
  - `StandaloneAgentRunLifecycleService.activateSwitched` calls `RuntimeSwitchRecorder.begin`, then `record`, which calls `RunMemoryFileStore.rotateActiveRawTracesForRuntimeSwitch`.
  - The first input reaches `AgentRunPlatformNotices`, then `RuntimeHandoverNoticeService.takePreface`.
  - `takePreface` calls `WorkJournalService.ensureCurrent`, then `listJournalFiles` (with `readJournalEntries` per file), then `buildRuntimeHandoverNoticeText`.
  - The preface goes before the user's text. (`docs/modules/run_history.md:210-227`; the service.)
- **Root cause:** the builder equates "the last file" with "the most recent work". That held before switches existed. A switch always opens a new file with only the marker (§3.3), and the builder was never told which files hold work.
- **Owners:**
  - the journal service owns per-file facts;
  - the builder owns the wording;
  - the notice service only connects them.
- **Constraint:** the builder stays pure; no new file reads.

## Requirement Implications

- PRB-001 changed the target from "the active file" (the Task's words) to "the newest closed file with work" (DEC-001). This is the founder's intent, corrected by the evidence.
- PRB-002 supports a complete read without a cap (DEC-004).

## Notes For Architecture Design

- Realize SCN-001…SCN-004.
- Add a per-file count of work entries to the journal summary; it is computed where entries are already parsed.
- The builder selects the newest closed file with work entries.
- Update the builder tests (stale assertions), the service test fixture, the journal reading test, MS-01 and `run_history.md`.
