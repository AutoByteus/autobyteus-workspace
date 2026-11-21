# Solution Designer Handoff — autobyteus-583 (runtime-handover-journal-read)

- From: Solution Designer (`solution_designer_703182187282472484b90793eac8be40`), 2026-11-21
- Classification: `Architecture Design Complete`, `task_size = Small`, `architectural_risk = Low`
- Solution revision: SR-001
- Approval: requirements approved by the Solution Designer within the direction; the founder was informed in this conversation on 2026-11-21. No design approval is required.

## Original request

Project Task `autobyteus-583` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), from `/project_task_manager` on the founder's word.

After a runtime switch, the new agent often fails to read the latest work journal completely. When told to, it works much better. The Task:
- investigate the transition;
- change the hand-over notice so the agent is explicitly told to read the full latest journal, handling the just-rotated case;
- verify with unit/E2E tests, and a real switch if practical;
- merge to `origin/personal`, clean up, save the record copy and record follow-ups.

Constraints: follow `DESIGN.md` and `TESTING.md`; private journals are read-only; synthetic fixtures only; no release without the founder's word.

## What the investigation found (reproduced)

- A switch archives the previous agent's records as a closed segment, and the new active file starts with the switch marker.
- When the notice is built, `work_journal_active.md` holds only one `Notice:` line, while the work is in the newest closed file.
- The notice still calls the active file "the latest … a good place to start", and calls the file with the work optional.
- Evidence: PRB-001 at `probes/handover-transition.probe.test.ts` and `.log`.
- Measured on the founder's 17 switched runs (sizes only): previous-era journals of 32–3,001 lines, up to 393 KB.

## What to build (design-spec.md)

1. **Summary field:** `WorkJournalFileSummary.workEntryCount` is the number of entries that are not notices. `WorkJournalService.listJournalFiles` computes it from the entries it already parses.
2. **Builder:**
   - It names the newest **closed** file with `workEntryCount > 0` as the previous agent's most recent work.
   - It tells the agent to read that file completely, from first line to last, in parts if long, before it replies or continues.
   - It says the open file starts with this hand-over.
   - It keeps the full list, oldest first.
   - With no such file there is no instruction.
   - The exact target text is in design-spec.md, "Concrete Examples".
3. **Tests:**
   - rewrite the builder unit tests (the old-sentence and `you must|you should` assertions are stale);
   - add `workEntryCount` to the service test fixture and the journal reading test;
   - add a journal-backed transition test with the real recorder, journal service, pending reader and notice service (probe cases A and B, plus a switch before any work);
   - extend MS-01 in `runtime-switch-members-built-server.e2e.test.ts`.
4. **Docs:**
   - one sentence in `autobyteus-server-ts/docs/modules/run_history.md` (hand-over bullet);
   - a "Work entry" line in `GLOSSARY.md`;
   - `docs/design-cases.md` Case 25 is already written in this worktree by the Solution Designer. Commit it with the change.
5. **Cleanup:** remove the untracked probe folder `autobyteus-server-ts/tests/probes-583/`. Its copy stays in the ticket's `probes/`.

## Verification intent

- AC-001…AC-004: unit tests and the transition test.
- AC-006: built-server E2E MS-01.
- AC-005: a live switch with a real runtime on a synthetic run whose previous journal has more than 2,000 lines (API/E2E, gated). Record whether the agent reads the named file to its last line before replying.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-handover-journal-read-583`
- Branch: `codex/runtime-handover-journal-read-583`
- Base: `origin/personal` @ `90c4958a3593ea3beae754cf95e61bcfa89336cf`
- Finalization target: `origin/personal`
- Dependencies are installed and `pnpm prepare:shared` has been run in the worktree.
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/runtime-handover-journal-read-583/tickets/in-progress/runtime-handover-journal-read/`
- The ticket documents and `docs/design-cases.md` are uncommitted. Implementation commits them with the change.

## Documents

- `requirements-doc.md` (Approved, SR-001)
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-spec.md`
- `probes/handover-transition.probe.test.ts`, `probes/handover-transition.probe.log`

## Open risks

RSK-001: a model may still read only part of the file. AC-005 records it; if it happens, it becomes a follow-up.

## Follow-ups

None found.

## Route

See "Routing record" below; it is filled in after the rules are applied.

## Routing record

- `get_handoff_rules` result: the rule for Small or Medium with Low risk sends to `/implementation_engineer`.
- Sent 2026-11-21 to `/implementation_engineer` (run `implementation_engineer_b837a62ada2a4a38923f9ee7df199366`): DELIVERED, with this file and the five ticket documents attached.
