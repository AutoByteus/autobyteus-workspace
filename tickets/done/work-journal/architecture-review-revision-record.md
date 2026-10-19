# Architecture Review Revision Record — work-journal

The latest design-review-report.md is authoritative.

## Revision Index

| Revision ID | Review Round / Trigger | Related Solution Revision IDs | Prior Decision | Current Decision | Affected Finding IDs |
| --- | --- | --- | --- | --- | --- |
| ARCH-REV-001 | Round 1: Architecture Design Complete | SR-010 | N/A | Pass | None blocking. Non-blocking notes N1–N7. |
| ARCH-REV-002 | Round 2: documentation-only delta | SR-011, SR-012 | Pass | Pass | None blocking. N1–N7 remain; the editorial part of N5 is resolved. |
| ARCH-REV-003 | Round 3: user-approved content-scope change | SR-013, SR-014 | Pass | Pass | None new. N1–N7 unchanged. |
| ARCH-REV-004 | Round 4: delivery Design Impact (rollback readability) | SR-015, SR-016 | Pass | Pass | None new. N1–N7 unchanged. |
| ARCH-REV-005 | Round 5: rollback rule corrected by the user; SR-016 withdrawn | SR-017, SR-018 | Pass | Pass | None new. N1–N7 unchanged. |

## Revision Entries

### ARCH-REV-001 — Initial review of the Work Journal architecture (SR-010)

- Canonical design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/design-review-report.md
- Review round and trigger: round 1. /solution_designer handed off Architecture Design Complete (Large/High) with handoff-architecture-review.md.
- Triggering role, report path, and finding IDs: /solution_designer; design-spec.md (SR-010); no findings yet.
- Relevant solution revision IDs: SR-010, on the SR-007–SR-009 basis.
- Prior authoritative decision: N/A
- Current authoritative decision: Pass
- What changed in the review result or what baseline was established:
  - **Baseline:** the behavior basis BEH-W1–W6 is confirmed against current code at 55bff1f5e. Large/High is confirmed as justifying review.
  - **Spines and boundaries:** all spines, boundaries, persisted-data decisions and the migration checklist pass.
  - **Material premises:**
    - P1 (native write ordering): `Not Reachable`; the turn runner writes before it notifies.
    - P2 (recorder flushes on TURN_COMPLETED): `Reachable`. The design's attach order already handles it; note N1.
    - P3 (write after deletion): unsupported; no machinery.

#### Prior Finding Resolution

None.

- New or remaining finding IDs: none blocking. Non-blocking implementation notes:
  - N1: attach-order invariant and its test;
  - N2: measure main-thread blocking;
  - N3: no full evidence hash on the updater path;
  - N4: one source for the closed-file count;
  - N5: one source for `runtimeKind`, plus contract §3.3 wording;
  - N6: web test title for AC-W8;
  - N7: migration root and walk.
- Material classification changes: none (Large/High kept).
- Recommended recipient: /implementation_engineer, with an informational notice to /solution_designer.
- Remaining risks or uncertainty:
  - the per-turn render cost on large open files, validated in step 8;
  - thin Grok evidence.

### ARCH-REV-002 — Documentation-only delta (SR-011, SR-012)

- Canonical design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/design-review-report.md
- Review round and trigger: round 2. /solution_designer sent Architecture Design Complete (revised) for SR-012, with the "Revision SR-012" section of handoff-architecture-review.md.
- Triggering role, report path, and finding IDs: /solution_designer; design-spec.md (SR-012); no findings.
- Relevant solution revision IDs: SR-011 (pass recorded; contract §3.3 edit) and SR-012 (authorities-read correction; collaboration_model.md §3 docs row).
- Prior authoritative decision: Pass (ARCH-REV-001)
- Current authoritative decision: Pass
- What changed in the review result:
  - The delta was verified against the current files:
    - collaboration_model.md §3, lines 77-78, lists a run's memory contents without the journal;
    - DESIGN.md lines 327-332 require run-storage changes to update the model in the same change.
  - The new docs row is justified, and the journal placement is consistent with CM-8 and CM-9.
  - Contract §3.3 now matches §12 item 14.
  - No behavior, structure, interface or classification change. Large/High is kept.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N5 (editorial part: contract §3.3) | Open, non-blocking | Resolved | SR-011 | work-journal-contract.md §3.3 now says the runtime comes from the live run, with the generic rule for a runtime that has no translation yet |
| N1–N4, N6, N7, and the code part of N5 | Open, non-blocking | Unchanged (implementation notes) | — | — |

- New or remaining finding IDs: none new. N1–N7 remain as implementation notes; the editorial part of N5 is resolved.
- Material classification changes: none.
- Recommended recipient: /implementation_engineer (it adds the docs row to scope), with an informational notice to /solution_designer.
- Remaining risks or uncertainty: unchanged from ARCH-REV-001.

### ARCH-REV-003 — Content-scope change: runtime machinery omitted (SR-014)

- Canonical design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/design-review-report.md
- Review round and trigger: round 3. /solution_designer sent Architecture Design Complete (revised) for SR-014, with the "Revision SR-014" section of handoff-architecture-review.md.
- Triggering role, report path, and finding IDs: /solution_designer; requirements-doc.md, work-journal-contract.md and design-spec.md (SR-014); no findings.
- Relevant solution revision IDs: SR-013 (ARCH-REV-002 recorded) and SR-014 (content scope).
- Prior authoritative decision: Pass (ARCH-REV-002)
- Current authoritative decision: Pass
- What changed in the review result:
  - **Approval:** the change to intended behavior has explicit user approval (U23–U28, 2026-10-19; requirements status Approved, SR-014). It is not a reviewer-invented scope change.
  - **Consistency:** verified across:
    - REQ-W2 and AC-W2;
    - DEC-W11;
    - contract §8, D5 (D4 superseded), the §12 item 12 annotation, §14, and the Grok and generic examples;
    - the design-spec rows for BEH-W2 and `non-tool-record-lines.ts`.

    No stale lines for system instructions, compaction or recovery remain.
  - **Compaction stays visible:** each compaction rotates the raw file (Step 1A), so the journal file boundary still shows it (SCN-W5, REQ-W5).
  - **Scope of impact:** rendering only. Structure, interfaces, persistence and the Large/High classification are unchanged. `renderer_revision` stays 1, because no output has been released.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N1–N4, N6, N7, and the code part of N5 | Open, non-blocking | Unchanged (implementation notes) | — | Not affected by SR-014 |

- New or remaining finding IDs: none new.
- Material classification changes: none.
- Recommended recipient: /implementation_engineer (only the §8 rendering rules and their tests change), with an informational notice to /solution_designer.
- Remaining risks or uncertainty: unchanged.

### ARCH-REV-004 — Rollback readability of improver_session.json (SR-016)

- Canonical design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/design-review-report.md
- Review round and trigger: round 4. /solution_designer sent Architecture Design Complete (revised) for SR-016, answering a /delivery_engineer Design Impact (see release-deployment-report.md and the "Revision SR-016" section of handoff-architecture-review.md).
- Triggering role, report path, and finding IDs: /solution_designer, after delivery's Design Impact; design-spec.md Persisted Data item 3 and the improver-session.ts File Mapping row.
- Relevant solution revision IDs: SR-015 (ARCH-REV-003 recorded) and SR-016.
- Prior authoritative decision: Pass (ARCH-REV-003)
- Current authoritative decision: Pass
- What changed in the review result:
  - **Governing contract:** RELEASE.md Rollback (line 151) requires that data written by a newer build stays readable by the build a user rolls back to.
  - **Verified at origin/personal:**
    - the released store rejects any file without `schemaVersion === 1` (store:31-32);
    - the released service either falls back on the other fields (`workTraces`, `lastRequest`, service:169-174) or spreads the loaded state forward (:99-100).
  - **Result:** keeping `schemaVersion: 1` is necessary and sufficient for rollback readability. The current reader ignores the field and nothing branches on it. The persisted-data decision stays `Directly Usable — No Migration`.
  - **Recorded, non-blocking:**
    - a `work_traces/` folder written after a rollback and upgrade becomes inert residue;
    - an out-of-scope guideline clarification is recommended.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| N1–N4, N6, N7, and the code part of N5 | Open, non-blocking | Unchanged (implementation notes) | — | Not affected by SR-016 |

- New or remaining finding IDs: none new.
- Material classification changes: none (Large/High).
- Recommended recipient: /implementation_engineer, for the implementation revision:
  - the writer constant;
  - a test that the written key set includes `schemaVersion: 1`;
  - a test that the released strict check accepts a newly written file.

  Also an informational notice to /solution_designer.
- Remaining risks or uncertainty: the inert `work_traces/` residue after a rollback and upgrade (acceptable).

### ARCH-REV-005 — Rollback rule corrected by the user; SR-016 withdrawn (SR-018)

- Canonical design review report: /Users/normy/autobyteus_org/autobyteus-worktrees/work-journal/tickets/in-progress/work-journal/design-review-report.md
- Review round and trigger: round 5. /solution_designer sent Architecture Design Complete (revised) for SR-018 (see the "Revision SR-018" section of handoff-architecture-review.md).
- Triggering role, report path, and finding IDs: /solution_designer, on the user's decision U29–U31 (DEC-W12); design-spec.md Persisted Data item 3, checklist item 10 and File Mapping; RELEASE.md and data_migration_guideline.md §4 (uncommitted).
- Relevant solution revision IDs: SR-017 (ARCH-REV-004 recorded) and SR-018.
- Prior authoritative decision: Pass (ARCH-REV-004 on SR-016)
- Current authoritative decision: Pass
- What changed in the review result:
  - **Not reopened:** the rollback-rule change is the user's own decision, recorded as DEC-W12.
  - **Doc diffs checked:**
    - RELEASE.md "Rollback" and the new guideline §4 subsection agree with each other and with guideline §3, which allows no version fields in new or changed formats.
    - Both diffs are scoped to rollback after a migration.
  - **Rollback effect verified at origin/personal:**
    - the strict load returns null;
    - the service builds a replacement session, which is null-safe and writes `schemaVersion: 1` again;
    - so the older build starts one fresh improver session, and later loads succeed.
  - **Checklist item 10 verified:** the old export regenerates the deleted derived folders on every call.
  - **Superseded:** the ARCH-REV-004 conclusion to keep `schemaVersion: 1` is withdrawn with SR-016.
  - **Residual items:** the guideline recommendation from ARCH-REV-004 is done in this change, and the `work_traces/` residue after a rollback and re-upgrade remains accepted.

#### Prior Finding Resolution

| Finding ID | Prior Status | Current Status | Related Revision References | Verification Evidence |
| --- | --- | --- | --- | --- |
| ARCH-REV-004 out-of-scope recommendation (guideline rollback wording) | Open, non-blocking | Resolved | SR-018 | data_migration_guideline.md §4 "Rolling back after a migration" (git diff in the ticket worktree) |
| N1–N4, N6, N7, and the code part of N5 | Open, non-blocking | Unchanged (implementation notes) | — | Not affected |

- New or remaining finding IDs: none new.
- Material classification changes: none (Large/High).
- Recommended recipient: /implementation_engineer, with an informational notice to /solution_designer. Implementation impact:
  - remove or don't add the SR-016 `schemaVersion` constant and its tests;
  - include the two doc edits in the change.
- Remaining risks or uncertainty:
  - one fresh improver session per target after a rollback (accepted);
  - the inert `work_traces/` residue after a rollback and re-upgrade (accepted).
