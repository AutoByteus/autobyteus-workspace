# Handoff — work-journal: Architecture Design Complete (SR-010)

- **From:** /solution_designer, 2026-10-18.
- **Result:** `Architecture Design Complete`, task_size **Large**, architectural_risk **High**.
- **Route:** handoff rule 1 → /architecture_reviewer, for independent architecture review.
- **Package:** work-journal (Step 1B of runtime-independent agent memory).
- **Ticket folder:** /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/
- **Workspace:** /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal
  - Branch `codex/work-journal`, base origin/personal @ 55bff1f5e (2026-10-18).
  - Finalization target origin/personal.
  - Ticket files are untracked; no source changes yet.

## Request and goal
**Request.** The user asked for a Work Journal: a readable, runtime-neutral Markdown record of each agent run, generated deterministically from raw traces. It replaces the "work trace" export.

**Goal.** A journal from any runtime reads naturally to any other runtime, or to a person, who can then continue the work with their own tools.

**Placement.** Inside each agent run's memory folder (`work_journal/`), one journal file per raw-trace file.

## Approval basis
- **Requirements:** requirements-doc.md, REQ-W1–W9 and DEC-W1–W10, status Approved.
  - **Approved by:** the Solution Designer within the user's direction. The user delegated the remaining choices (U17), confirmed the rendering location (U19) and placement (U20–U21), and said "requirement is clear? if yes, go on with the task" (U22).
- **Behavior-defining supplement:** work-journal-contract.md, Approved, with decisions D1–D4.
  - Validation corrections (SR-008) and design refinements (SR-010, contract §13) stay within the approved direction. They are reported to the user.
  - Its machine-readable §4 is work-journal-builtin-tools.json.

## What to review
design-spec.md, status Ready. Key decisions:
1. **New subsystem `src/agent-work-journal`.**
   - `WorkJournalService.ensureCurrent({runId, memoryDir, runtimeKind})` is the only boundary; it reconciles files and returns a package with an evidence hash.
   - A pure renderer implements the contract, with one translation file per runtime.
   - A store owns the manifest and atomic writes.
2. **`WorkJournalRunUpdater`** is attached per run through AgentRunResourceManager in both composition roots.
   - It triggers on TURN_COMPLETED, TURN_INTERRUPTED and COMPACTION_STATUS, and merges bursts.
   - It awaits `AgentRunMemoryRecorder.waitForIdle(runId)` before rendering.
   - Errors are logged and never reach the run.
3. **Rendering scope:** the open file is re-rendered at each update. A closed file is written once and reused while `renderer_revision` and the source record count match. Pairing happens within one file.
4. **Skill improvement** switches to the journal package. Its session state reader becomes a tolerant projection, with new field names and no schemaVersion.
5. **Removal:** `src/agent-work-traces` and the replay projection's export-only options are removed.
6. **Migration:** a startup app-data migration deletes the 7 old `work_traces/` folders, with a warning disposition for failures.

**Points that deserve scrutiny:**
- the `renderer_revision` manifest field: a derived-output cache key, not a schema version;
- unverified AutoByteus-native write ordering at turn end (Risks);
- the per-turn re-render cost on large open files (p90 5 MB, max 28 MB; incremental rendering is deferred);
- the persisted-data decisions and the migration checklist;
- the one-raw-file-per-journal-file pairing tradeoff (0.18% of calls split).

## Evidence
- investigation-notes.md: J01–J09 (requirements and contract validation) and J10–J17 (architecture). It also holds the supplement inventory.
- Probes in probes/: tool-inventory.json, inventory-classification.txt, validate-contract.json, runtime-texts.txt.

## Follow-ups (not in this ticket)
- Record in raw traces: the Codex exit code, the Codex file-change kind, and Grok's exit code as a field.
- Incremental open-file rendering, only if validation measures a cost.

## Constraints
- Never modify the user's ~/.grok; use a temporary GROK_HOME. Keep live Grok tests small, because credits are limited.
- Fixtures are hand-built from recorded shapes. Never copy user data (TESTING.md).
- The user's email is for identity only.

## Expected next action
/architecture_reviewer performs the independent architecture review of the design spec, against the approved requirements and contract. Pass, Fail and Blocked follow the team's rules.

## Route recorded
- get_handoff_rules (2026-10-18): rule 1 matched (Large/High). Sent to /architecture_reviewer (run architecture_reviewer_6d1c6030261d447381caaeb2b42999b6): DELIVERED. No other rule matched.

## Revision SR-012 (documentation-only delta after ARCH-REV-001 Pass)
- **What changed.** Only design-spec.md changed:
  - **"Authorities read" corrected:** collaboration_model.md had only been searched for SR-010. It has now been read in full and agrees with CM-8, CM-9, §3 and §4.
  - **Target File Mapping:** one docs row added. collaboration_model.md §3 should list the work journal among a run's memory contents, because DESIGN.md requires run-storage changes to update the model.
- **What did not change.** No behavior, structure, interface or classification change; Large/High unchanged.
- **Route.** Rule 1 → /architecture_reviewer, to confirm the delta. The package is already with /implementation_engineer; the delta is a single docs row for it to include.

## Revision SR-014 (content scope, user-approved 2026-10-19)
- **User change to intended behavior, explicitly approved:** the journal holds what was said to the agent, what the agent said and what it did.
- **Removed:** the lines for system instructions, context compaction (the journal file boundary already marks it), model-request recovery and output-limit continuation.
- **Kept:** `Notice:` lines and "Turn interrupted by the user.".
- **Changed artifacts:**
  - requirements-doc.md: REQ-W2/AC-W2 and DEC-W11;
  - work-journal-contract.md: §8, D5 (supersedes D4), Grok example, §14;
  - design-spec.md: BEH-W2 and the non-tool-record-lines responsibility.
- **Unchanged:** structure, interfaces, persistence decisions and classification (Large/High).
- **Implementation impact:** only the contract §8 rendering rules and their tests.
