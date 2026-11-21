# Docs Sync Report: autobyteus-583 (the runtime hand-over notice names the journal to read)

## Scope

- Ticket: `runtime-handover-journal-read` (Project Task `autobyteus-583`)
- Trigger: API/E2E `API-REV-001` `Pass` (final confidence 95.0%), direct route (`task_size` Small, `architectural_risk` Low; architecture review, source review and test-code review `Not Applicable`).
- Bootstrap base reference: `origin/personal` @ `90c4958a35`
- Integrated base reference used for docs sync: `origin/personal` @ `b4723d0bb7` (24 commits merged into the branch as `b950c44a84`). One more base commit, `7591aa307f` (the autobyteus-589 release ticket's closing record, four files under `tickets/done/release-v1.5.14-beta.5/`), arrived while delivery ran its checks; it is merged with the delivery commits (see `release-deployment-report.md`).
- Post-integration verification reference: `release-deployment-report.md`, "Initial Delivery Integration Refresh" (typecheck of both packages, the server build, the whole server unit suite and the gated switch and journal E2E files, run on `b950c44a84` plus delivery's one doc edit).

## Why Docs Were Updated

- Summary: after a runtime switch, the new agent's first input now names the newest closed journal file with work entries as the previous agent's most recent work, and asks for a complete read of it before the agent replies. It says the open file starts with the hand-over, lists every file oldest first as before, and carries no read instruction when no closed file has work. To choose that file, the journal's per-file summary gained one fact, `workEntryCount`. Delivery read each long-lived doc that describes the notice, the summary or the journal against the final code.
- Why this should live in long-lived project docs: the notice is what the founder judged "a clear drop in quality after every switch"; a maintainer who reads the old description ("the latest one … a good place to start", the open file as the latest work) would put the same defect back, and a reader of the journal module's doc would not know the per-file summary now carries a count that another module depends on.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | No rule added or changed. The new fact has one owner (`listJournalFiles`, which already parsed every file) and the builder only reads it (DESIGN.md's single-owner rules); the choice of file is an explicit rule in one pure function |
| `TESTING.md` | Project testing guideline | No change | The ticket's tests follow it: the builder and the transition test on real rotation, the built-server E2E MS-01 with the scripted-AGY gate, a negative control against the old builder (9 of 30 fail), and the live probe kept as evidence rather than as a suite test because it measures model behavior. Failures met on this Mac were traced to their causes before they were classified (rule 9); none is a gap in the guideline |
| `RELEASE.md` | Project release guide | No change | No release step, check or workflow changed, and no build input changed (no lockfile, `package.json`, `tsconfig`, script, workflow, contract package or generated file in the diff), so the fresh-start build rule does not apply |
| `GLOSSARY.md` | Defines "Hand-over notice" and "Work entry" | Checked; already updated by the implementation | "Work entry" (an entry that is not a notice; `workEntryCount`; a file a switch left with only its hand-over notice has none) is new; "Hand-over notice" says it names the newest closed journal file with work entries and asks for a complete read of it. Both match `runtime-handover-notice-builder.ts` and `work-journal-service.ts` |
| `autobyteus-server-ts/docs/modules/run_history.md` | Describes the notice's text and when it is delivered | Checked; already updated by the implementation | The hand-over bullet names the file choice (`WorkJournalFileSummary.workEntryCount > 0`, closed), the complete read in parts, "the open file starts with the hand-over", the oldest-first list and the no-file case. It matches the builder word for word where it quotes |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | Defines `listJournalFiles`, the summary's owner | Updated | See Docs Updated. The bullet listed "size, line count and days"; it omitted `state` and the new count, and said nothing of who uses the count |
| `autobyteus-server-ts/docs/modules/agent_episodic_catalog.md` | Mentions `work_journal_active.md` in its catalog example | No change | The example lists a catalog entry, not the notice; no statement about the notice or the summary |
| `docs/design-cases.md` | Case 25, the Solution Designer's record of the lesson | Checked; already added by the Solution Designer | Matches the final behavior ("The latest file taken by position, not at the moment it is read"; the fix is the count and the named file) |
| `autobyteus-server-ts/src/runtime-handover-notices/services/runtime-handover-notice-builder.ts` doc comment | Its comment cites an archived contract section | No change | It states the new rule and says it replaces "facts and pointers only" on the founder's direction. The archived work journal contract is a closed ticket's record, which is not rewritten |
| `autobyteus-web/docs/**` | Any user-facing description of the notice | No change | A search for the notice's old wording finds nothing outside the files above; the chat's marker line is unchanged and no rendered surface changed |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | Reference | The `listJournalFiles` bullet now lists each file's state, size, line count, work entry count (entries that are not notices: a request, reply, action or note; a file a runtime switch left with only its hand-over notice has none) and days, and says the runtime hand-over notice uses the count to name the newest closed file with work, pointing to `run_history.md` | The doc named the summary's fields and left out the one that another module now depends on |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| At the moment a switch's first input is built, the open file holds only the hand-over marker | The previous agent's work is in the newest closed file; a newer closed file with only a notice (a switch before any work) is skipped | `investigation-notes.md`, `design-spec.md`, PRB-001 | `docs/design-cases.md` Case 25 (the Solution Designer's), `GLOSSARY.md` "Work entry", `run_history.md` |
| The notice asks for a complete read; it does not guarantee one | Codex and native AutoByteus read the named file to its last line in every run; the Claude Agent SDK agent read the start and the end of a 2,405-line journal and skipped the middle in three of three runs | `api-e2e-execution-coverage-report.md` API-02…API-04 | `follow-ups.md` FU-001 (not a long-lived doc: the outcome is a recorded runtime trait, not a rule) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The notice's "the latest one, `work_journal_active.md`, shows what was done most recently, so it is a good place to start" and "if you want to look further back" | The named newest closed file with work entries, the complete-read instruction, "the open file starts with this hand-over" | `run_history.md`, `GLOSSARY.md`, `design-cases.md` Case 25 |
| The builder's `latest` and `earlier` variables (the last file in the list taken as the latest work) | An explicit choice: the newest closed file with `workEntryCount > 0` | `runtime-handover-notice-builder.ts`, `run_history.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: `agent_work_journal.md` changed in this delivery, and three more docs changed in the implementation and design.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001 (Claude Agent SDK reads part of the named journal), FU-002 (a unit test's fixed settle budget) and FU-003 (E2E files at default limits on a busy Mac) are in `follow-ups.md`, API/E2E's, unsent. Delivery adds none.
