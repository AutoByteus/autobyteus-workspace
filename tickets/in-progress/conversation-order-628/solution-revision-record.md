# Solution Revision Record

## SR-001 (2026-11-23)

- Trigger: autobyteus-628 from `/project_task_manager`, with the founder's four phone screenshots.
- Prior status: N/A. Current status: requirements Approved; design Ready.
- Affected IDs: BEH-001…003, REQ-001…003, AC-001…005, SCN-001…004, DEC-001…003.
- Finding:
  - A current bug, not an old-format artifact.
  - The stored traces are in order.
  - The web's conversation window sorts rows by timestamps from two clocks (viewer and node). Reproduced with the real web code at a 1 s difference.
  - A preface notice makes even a small difference visible.
- Approval: Solution Designer within the direction (the Task: fix it if it is a bug); user informed. DEC-003 was narrowed before handoff, with compactions kept placed by time as FU-001.
- Design: D-1 (window keeps conversation order; compactions merged by time) and D-2 (the replay puts a preface notice after its message). Classified `Medium` / `Low`.
- Routing: direct implementation.
- Remaining gaps: FU-001.

## SR-002 (2026-11-23)

- Trigger: implementation Design Impact (the design's own escalation trigger). Native stores a preface as `[n ts t, u ts t' ≥ t]` from `MemoryIngestInputProcessor`, each write with its own time, so D-2's time condition matched native only within the same millisecond.
- Kind: design only. No requirement changes; REQ-002 and AC-003 are unchanged.
- Change: D-2's rule now has two cases: (a) the time condition for external runtimes (one writer, `RuntimeMemoryEventAccumulator`), and (b) both traces with `sourceEvent "LLMUserMessageReadyEvent"` for native, whose processor writes a notice only as a preface. Writers stay unchanged.
- Evidence: implementation's citations, verified by the Solution Designer (`memory-ingest-input-processor.ts:12,53-73` read).
- Classification: unchanged, Medium / Low. Routing: back to implementation directly; no review rule applies to a Medium/Low design revision.

## SR-003 (2026-11-23)

- Trigger: implementation's factual correction. The real reload path sorts traces by `ts` (`raw-trace-record-normalizer.ts:121-130`), which the investigation's temporary test skipped.
- Kind: evidence-only clarification. Requirements, design and classification are unchanged; the SR-002 rule stands.
- Sections: investigation notes, "SR-003 correction".
- Design case: docs/design-cases.md Case 21 (a premise checked on a stand-in path).

## SR-004 (2026-11-23)

- Trigger: the user's direction in conversation: the server records every time and the client only shows it, one single source of truth.
- Kind: requirements change (REQ-004 added; REQ-003 revised; AC-006; DEC-004), approved by the user's own words, plus a design addition (D-3) and reclassification.
- Affected: REQ-003, REQ-004, AC-006, DEC-004; FU-001 resolved in this ticket; design D-3 (data contract first, validated), classification `Large` / `High`.
- Approval: the user (requirements-doc.md approval reference).
- Routing: architecture review of SR-004. Implementation continues D-1/D-2 meanwhile, without handing off.

## SR-005 (2026-11-23)

- Trigger: ARCH-REV-001 Fail.
  - AR-001 (Design Impact): D-3 described one stream's shape for all three; AgentRun has direct listener paths; the field was required on untimed messages; the placeholder had no value for an empty conversation.
  - AR-002 (editorial): stale lines contradicted REQ-004.
- Design: D-3 rewritten.
  - The three boundaries are named, each with field, writer, reader and an example frame.
  - One field definition, required only on the timed messages (the table).
  - One AgentRun stamping method covers every delivery.
  - `accepted_at` on pending input entries.
  - An own send has a null time until the node confirms it.
  - `updatedAt` is derived from row times.
  - SCN-001…004 and the first-message case are re-walked per stream.
- Requirements: text aligned with REQ-004 (Out of Scope, Non-Goals, BEH-003, Traceability, baseline). Intended behavior is unchanged.
- Approval: REQ-004 by the user (SR-004); the SR-005 edits are editorial.
- Classification: unchanged, `Large` / `High`. Routing: architecture review.
- Design case: docs/design-cases.md Case 2 (one entry form traced, others left open).

Review note: ARCH-REV-002 passed SR-005 (2026-11-23). The reviewer routed it to `/implementation_engineer`. N-3 (stale FU-001 mentions in design-spec.md) is fixed editorially; N-1 and N-2 are for implementation.

## SR-006 (2026-11-23)

- Trigger: implementation Design Impact. D-3's `occurredAt` on the external notice trace can precede the user trace's `forwardedAt`, which breaks D-2 rule (a) and the reload order (MSP-105 fails after a reopen, 3/3).
- Design: the external user trace's `ts` is its admission time `acceptedAt`, carried on `AgentRunUserMessageForwardedPayload`. Admission precedes the preface's dispatch, so `u.ts < n.ts` by construction.
- Requirements: unchanged. Classification: unchanged, `Large` / `High`. Routing: architecture review (a revised Large/High package); implementation applies it after the pass.
- Follow-ups added: FU-002 (Org member and root-view probe cases failing on base), FU-003 (base server e2e failures), plus a note on the runtime e2e packages.
