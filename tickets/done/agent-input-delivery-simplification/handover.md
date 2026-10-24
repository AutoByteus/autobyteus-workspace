# Handover — agent-input-delivery-simplification

- Project Task: `project_task_17bfe0fe-5c2b-47eb-9402-71687e7a52b8` ("Simplify agent input delivery and member activation")
- From: Software Engineering Team (solution_designer), 2026-10-09
- To: the original Software Engineering Team copy that wrote the cleanup brief (user decision 2026-10-09)
- Status at handover: requirements approved, design reviewed (Pass), implementation committed locally. **Not code-reviewed, not validated by API/E2E, not merged, not pushed.**

## Code

- Local branch: `codex/agent-input-delivery-simplification` (kept, not pushed).
- Head commit: `3e78b455ec3b4d141b6c8a5b1dc0ce843df22121`, "refactor(collaboration): one teammate-delivery owner for every root".
  - Parent `742a0df975320b46c1fadda88fae34ae9f326144` (on `origin/personal`).
  - 42 files changed, +1192/−1083.
- The same commit as a patch: `patch/0001-refactor-collaboration-one-teammate-delivery-owner-f.patch`.
- Requirements and design were written against base `origin/personal@048ea6cec`. The implementation commit sits on the newer `742a0df97`.
- The ticket folder was never committed; all its artifacts are in this folder. The worktree has been removed.

## What is done

1. **Investigation (Q1–Q6), in `investigation-notes.md`:**
   - **Q1:** the compaction-recovery difference between posted and reserved input is intended (approved compaction REQ-014/015 and SR029, tested). Not a defect.
   - **Q2:** no timing change needed.
   - **Q3:** `GlobalAgentRunMessageRouter` is live (run-ID messaging, cross-root, Skill Improvement). `InterAgentMessageRouter` is dead.
   - **Q4:** the standalone and Org adapters are copies. Real per-root differences are: history envelope, recipient input builder (persisted IDs), events, codes. The Team checks duplicates inside the history lock.
   - **Q5:** every `ConfiguredAgentExecutionHandle` state maps to a tested scenario.
   - **Q6:** keep the held slot.
   - A defect was found and probed (`probes/task-close-during-delivery.probe.ts`): a Task closing while a teammate message is being saved puts the root into persistence fail-stop, which terminates the whole root.
2. **Requirements (`requirements-doc.md`, Approved SR-003; wording aligned in SR-004 and after review).**
3. **Design (`design-spec.md`, SR-004), D-1..D-8:**
   - one `RootCommunicationEngine` owns teammate delivery, with per-root port objects;
   - one `RootMessageAppend` protocol with checks under the history lock;
   - one coordinator contract, `commitMessageAppend`;
   - the REQ-012 fix;
   - the engine owns the message list;
   - dead code removed;
   - `admit()` validation once;
   - docs.

   Classification: Large / High.
4. **Architecture review:** ARCH-REV-001 Pass, no findings (`design-review-report.md`, `architecture-review-revision-record.md`). Non-blocking notes RR-001..RR-004. RR-002 was handled by the solution designer: BEH-008 wording aligned, and the recipient-stopped case made visible to the user.
5. **Implementation:** commit `3e78b455e` (IR-001, `implementation-revision-record.md`), implementing D-1..D-8 with new tests `root-communication-engine.test.ts` and `root-communication-roots.test.ts`.

## User-approved decisions

- 2026-10-08: the cleanup is needed; one ticket.
- 2026-10-08, after the analysis: "for the weaker part, we don't have to work on it. But you should be based on your investigation." **Dropped:**
  - one `AgentRun` input entry point (merging `postUserMessage`/`reserveUserMessage`);
  - handle-state reduction;
  - save-first history (Q6 → keep the held slot);
  - compaction/timing changes.
- 2026-10-08: the user delegated the remaining choices to the designer ("You only do the one you think that's reasonable … make the code cleaner"; "You help me to choose … then continue"). Designer's choices, told to the user:
  - **Do:** D-1..D-8, including the defect fix (DEC-001 = A).
  - **Skip:** one result shape (REQ-005).
- REQ-012 also covers the recipient AgentRun stopping during the write (→ `AGENT_RUN_NOT_ACCEPTING_INPUT` instead of root teardown). It is the same defect class and was shown to the user after the review.

## Open / risky

- **No `implementation-handoff.md` exists.** `implementation-revision-record.md` refers to it for:
  - "Local Implementation Checks Run" (it says checks pass apart from failures that also fail on the base);
  - "Known Risks";
  - "Key Files".

  That evidence was not persisted. Re-run the checks before trusting the commit.
- **Not done:** independent code review, API/E2E validation, docs sync review, delivery, user verification.
- REQ-012 was reproduced only on the standalone root. Team/Org were established by code reading; the design requires real-coordinator tests per root kind, and the commit adds `root-communication-roots.test.ts` for that. Verify it covers all three.
- Review notes to check in code:
  - RR-001: Team indeterminate-write error text.
  - RR-003: `prepare()` must not change state before a scope throw; the `AGENT_RUN_NOT_ACCEPTING_INPUT` message is pinned.
  - RR-004: the Team port `isOpen` must equal the old Team `accepting` flag, not `isAdmitting()`.
- Out-of-scope candidates (non-blocking):
  - near-duplicate address resolution in `StandaloneRootMessageDelivery` vs `AgentOrgRunMessageDelivery`;
  - `TeamRun` keeps three input methods.

## Files in this folder

- `requirements-doc.md`
- `design-spec.md`
- `investigation-notes.md`
- `solution-revision-record.md`
- `design-review-report.md`
- `architecture-review-revision-record.md`
- `implementation-revision-record.md`
- `handoff-architecture-design-complete.md`
- `followup-cleanup-ticket-brief.md`
- `history/` (SR-001/SR-002 requirement snapshots)
- `probes/` (OBS-003 probe)
- `patch/` (commit `3e78b455e`)
