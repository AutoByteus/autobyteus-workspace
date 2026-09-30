# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline | N/A | N/A | Approved | REQ-001..004, AC-001..005 | Approved by user 2026-09-30 |
| SR-002 | Requirements | User scope addition: Daily Assistant `read_file` | N/A | Approved (SR-001) | Approved | REQ-005, AC-006, BEH-006, DEC-001 | DEC-001 resolved (a); superseded by SR-003 |
| SR-005 | Design | Implementation `DI-001` — Design Impact | DI-001 | Design Ready (SR-004, ARCH-REV-002 Pass) | Design Ready (revised) | BEH-005 design only; no REQ/AC change | Resubmitted for architecture review round 3 |
| SR-004 | Design | `ARCH-REV-001` round 1 Fail — Design Impact | AR-001, AR-002 | Design Ready (SR-003) | Design Ready (revised) | BEH-005 design only; no REQ/AC change | Resubmitted for round 2 |
| SR-003 | Mixed | User decision: Daily Assistant overwrite on every startup; architecture design completed | N/A | Approved (SR-002) | Approved / Design Ready | REQ-006, AC-007, SCN-005, DEC-002; design-spec.md | Architecture Design Complete |

## Revision Entries

### SR-001 — Remove run-level skill access mode

- Phase and classification: Requirements, Initial Baseline
- Trigger: user analysis request (preload concern) and user direction 2026-09-30 to remove `skillAccessMode` completely; configured skills always shown.
- Prior status: N/A. Current: `requirements-doc.md` Ready for Approval.
- Affected IDs: BEH-001..005, REQ-001..004, AC-001..005, SCN-001..004.
- Intended behavior changed: Yes (removal of unused `NONE` override; supported flows unchanged).
- Approval impact: pending explicit user approval.
- Design: N/A (not yet started).
- Next action: obtain user approval, then architecture investigation and design.

Approval note (appended factual update to SR-001 status): user approved SR-001 on 2026-09-30 — "yesss. the value is simply ignored. any future ones, will not write that value anymore right? its like a natural progressing into the future". This confirms tolerant read (no data migration) for REQ-003/REQ-004.

### SR-002 — Add `read_file` to Daily Assistant

- Phase and classification: Requirements, Refinement (user scope addition)
- Trigger: user 2026-09-30 "update the daily assistant with read file in the agent config as well".
- Prior status: SR-001 Approved. Current: REQ-005 requested; DEC-001 (existing-install reach) open.
- Affected IDs: BEH-006, REQ-005, AC-006, DEC-001; Out-of-Scope line narrowed.
- Evidence: Daily Assistant `syncPolicy: seedIfMissing` (`built-in-agent-registry.ts`), template lacks `read_file`; tool name `read_file` (`autobyteus-ts/src/tools/file/read-file.ts`).
- Intended behavior changed: Yes (Daily Assistant tool set).
- Approval impact: REQ-005 user-requested; DEC-001 requires user choice before design.
- Design: architecture investigation in progress (migration guideline read); design not yet final.
- Next action: user decides DEC-001, then complete design.

SR-002 resolution (factual update): DEC-001 resolved as (a) on 2026-09-30. User confirmed understanding of the seed-if-missing flow ("So basically we actually copied to the app data. Good.") following the (a) recommendation. Requirements basis REQ-001..005 / AC-001..006 approved; architecture design proceeds.

### SR-003 — Daily Assistant overwrite policy; design completed

- Phase and classification: Mixed (Requirements refinement by user + Design)
- Trigger: user asked whether untouched installs receive template improvements (they do not under copy-if-missing; evidence: user's own `agent.md` lacks commit `74b68c748`). User decided 2026-09-30: "let's treat the daily assistant agents always as the same as others, always overrides" and, after clarification that overwrite runs on every startup, "every app's startup is fine ... that's a simple rule".
- Prior status: SR-002 Approved. Current: requirements Approved (REQ-001..006, AC-001..007); `design-spec.md` Ready.
- Affected IDs: BEH-006, REQ-005 (reach), REQ-006, AC-006, AC-007, SCN-005, UC-004, DEC-002 (supersedes DEC-001).
- Intended behavior changed: Yes — reverses copy-if-missing from commit `b7336203a`; user-approved.
- Canonical sections changed: requirements status, behavior table, requirements, ACs, scenarios, scope, decisions, data continuity; investigation notes architecture findings; design-spec created.
- Design/review: design-spec.md produced on this basis; classification recorded there.
- Remaining gaps: none blocking; risks listed in design-spec.
- Next action: handoff per rules.

### SR-004 — Design revision after architecture review round 1

- Phase and classification: Design, `Design Impact`
- Trigger: `/architecture_reviewer` `ARCH-REV-001` round 1 Fail; report `design-review-report.md`, record `architecture-review-revision-record.md`.
- Finding IDs: AR-001 (blocking) — the AF-005 same-ID classifier repair has no effect (frozen schemas reject current-written trees on `schemaVersion` first) and alters a frozen validator; AR-002 (minor) — released shapes must be standalone copies, not intersections with current types.
- Verification: confirmed in source (`team-run-execution-tree-v2-schema.ts:81-89`, `agent-org-run-execution-tree-v1-schema.ts:88-97`).
- Prior status: requirements Approved; design Ready (SR-003, failed review). Current: requirements unchanged/Approved; design Ready (revised).
- Affected IDs: design for BEH-005 only. No requirement, AC, scenario or decision change.
- Intended behavior changed: No. Approval impact: none — SR-003 user approval still applies.
- Sections changed: design-spec (basis, risk rationale, evidence table, guideline checklist item 10, tightness check, final file mapping, examples, sequence step 1, R-1, required tests, off-spine/ownership wording, new out-of-scope observation); investigation notes AF-003, AF-005.
- Classification: unchanged Large / High.
- Out-of-scope observation recorded (not adopted): pre-existing `schemaVersion` exposure of `AgentOrgFlatTeamFamiliesV1` since v1.4.91 — separate-ticket candidate for the user.
- Route: revised Large/High package → `/architecture_reviewer` (round 2).

Review receipt (informational, 2026-09-30): `/architecture_reviewer` `ARCH-REV-002` (round 2) — `Pass` on basis `SR-004`; AR-001 and AR-002 resolved. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`. Reviewer handed the package to `/implementation_engineer`. No solution change; no repeated handoff by Solution Designer.

### SR-005 — Design revision after implementation Design Impact DI-001

- Phase and classification: Design, `Design Impact`
- Trigger: `/implementation_engineer` `DI-001` (`implementation-design-impact-DI-001.md`); implementation paused before step 1, no source changes made.
- Finding: the released V1 team-tree migration uses the current `TeamRunConfig` class as a value (planner constructs it, builder reads from it); the class's clone functions drop unnamed keys, so removing `skillAccessMode` from current code would make the migration's V1 schema reject every predecessor team run. SR-003/SR-004 froze types and the literal only (AF-003 omission).
- Verification: confirmed in source (see investigation notes AF-015).
- Decision: DI-001 option 1 — frozen copy of the aggregate (`legacy/released-team-run-config.ts`: node/launch types, clone functions, constructor checks); planner and builder use it. Option 2 (carry the field around the current class) rejected: keeps a released migration coupled to current validation.
- Prior status: requirements Approved; design Ready (SR-004, `ARCH-REV-002` Pass). Current: requirements unchanged/Approved; design Ready (revised). The `ARCH-REV-002` Pass covered SR-004 only and does not cover this revision.
- Affected IDs: design for BEH-005 only. No requirement, AC, scenario or decision change. Intended behavior changed: No. Approval impact: none.
- Sections changed: design-spec (basis, risk rationale, evidence table, reusable structures, tightness check, final file mapping, folder/file mapping, examples, rejection log, sequence step 1, tradeoffs, R-1, required tests); investigation notes AF-003 (corrected), AF-015 (new).
- Classification: unchanged Large / High.
- Route: revised Large/High package → `/architecture_reviewer` (review of the SR-005 delta before dependent implementation resumes).

Review receipt (informational, 2026-09-30): `/architecture_reviewer` `ARCH-REV-003` (round 3) — `Pass` on basis `SR-005`, no findings. Report: `design-review-report.md`. Reviewer handed the package to `/implementation_engineer`. No solution change; no repeated handoff by Solution Designer.
Non-blocking wording note from the report's residual risks (design text not edited, reviewed basis unchanged): the allowed-import sentence for `legacy/released-team-run-config.ts` names only address/handoff helpers, while a verbatim copy also needs the `TeamBackendKind` and `RuntimeKind` enums. Designer position if asked: those stable enums are permitted imports for the verbatim copy; the prohibition is on importing `agent-team-execution/domain/team-run-config.ts` and `autobyteus-ts` for anything carrying the removed field.
