# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger | Finding IDs | Prior Status | Current Status | Affected IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-006 | Requirements + Design | ARCH-REV-001 Fail (AR-001, AR-002, N-1..N-3); base refresh | AR-001, AR-002 | Approved (SR-005); design Ready | Approved; design Ready | REQ-004, AC-006, AC-007, DEC-005, DEC-009 (new) | REQ-004/AC-006 agree with REQ-003; three `no_session` builders; Data Contract section; base `1f761bc8db` |
| SR-005 | Requirements + Design | The user's go for the hand-over rule (2026-11-19) | N/A | Draft (SR-004) | Requirements Approved; design Ready | BEH-001..006; UC-001..003; REQ-001..008; AC-001..011; DEC-001 superseded, DEC-005..008 | Requirements rewritten around the user's rule; design-spec.md written; Medium / High |
| SR-004 | Evidence | The user asked for another round on the newest base (2026-11-19) | N/A | Draft (SR-003) | Draft; waiting for the user's go/no-go | none | Still reproduces on `8430d9ef12`; G-5 now names the problem and points to an empty native menu |
| SR-003 | Evidence | The user asked to re-check on the newer base (2026-11-07) | N/A | Draft (SR-002) | Draft; waiting for the user's go/no-go | DEC-004 (moot) | Still reproduces for same-runtime model changes on `677f61de0b`; other runtimes are now an escape on every surface |
| SR-002 | Requirements (proposal) | The user's hand-over idea (2026-11-02) | N/A | Approved (SR-001) | Draft; DEC-004 Needs user | DEC-001, DEC-003, DEC-004; REQ-001..006 to be rewritten | Feasible by reading; waiting for the user's answer |
| SR-001 | Requirements (+ evidence) | autobyteus-53; the user asked to rebase on the latest origin/personal and redo the investigation (2026-11-01) | OBS-001 (source) | N/A | Approved (within the direction) | BEH-001..005; REQ-001..006; AC-001..007 | Still reproduces on `ec3f721622`; requirements set |

## Revision Entries

### SR-001 — The bug still exists; requirements baseline

- Phase and classification: Requirements, `Initial Baseline`
- Triggering: Task autobyteus-53; the user's 2026-11-01 request "make this branch on top of the Origin Personal Branch and redo investigation … maybe this is not needed anymore"
- Evidence:
  - the probe reproduces the empty menu and the refusal on `ec3f721622`;
  - autobyteus-316 mitigates only standalone runs, by switching runtime.
- Approval: Solution Designer within the direction (user informed 2026-11-01)
- Decisions: DEC-001 (any offered verified native model when the current capacity is unknown), DEC-002
- Open: UNK-001 (resume on a smaller model), measured in design
- Next action: architecture design

### SR-002 — The user's hand-over proposal

- Phase and classification: Requirements, `Requirement Gap` (user change to intended behavior)
- Triggering: the user, 2026-11-02: "Why don't we just use the same approach that we switch runtime for switch model as well … if you're lower context, then … use the work general approach. If you're like equal or bigger context … we don't do it."
- Intended behavior changed: Yes. A smaller native model, today refused, would become allowed through a hand-over.
- Approval impact: SR-001's approval no longer applies to the changed rule; requirements are back to `Draft`.
- Next action: the user's answer on DEC-004, then rewrite the requirements and design.

### SR-003 — Re-check on the newer base

- Phase and classification: Evidence-only clarification
- Triggering: the user, 2026-11-07: "analyze whether this ticket is still needed or not … we support switching the runtime for team, for agent team and organization as well, for … dedicated copies as well"
- Findings:
  - autobyteus-348 extended the runtime switch to every surface;
  - the native same-runtime trap still reproduces (probe rerun on `677f61de0b`);
  - DEC-004 is moot.
- Intended behavior changed: No (SR-002 is still the pending proposal)
- Next action: the user's go/no-go; on "go", rewrite the requirements around the SR-002 hand-over rule for all surfaces

### SR-004 — Re-check on the newest base

- Phase and classification: Evidence-only clarification
- Triggering: the user, 2026-11-19: "please make your work based on the latest one and do another round of analysis"
- Findings:
  - the probe still reproduces on `8430d9ef12`;
  - the native rule and `selectionContextFor` are unchanged;
  - autobyteus-500 G-5 adds a start refusal and a Settings note that send the user to a menu that is still empty on AutoByteus.
- Intended behavior changed: No (SR-002 is still the pending proposal)
- Next action: the user's go/no-go on the SR-002 hand-over rule

### SR-005 — The user's rule: requirements and design

- Phase and classification: Requirements (`Requirement Gap` resolved by the user's direction) and Design (initial)
- Triggering: the user, 2026-11-19: "if user choose a model with unknown context or with a lower context … we can start a new session … like changes the runtime … ask the agent to read the Journal … of the previous … continuation"; equal or bigger → no hand-over (2026-11-02)
- Requirements: rewritten (`requirements-doc.md`), Status Approved
  - approval: the user's direction for the rule (DEC-003); the Solution Designer for the details within it (DEC-005 reference model, DEC-006 runs that cannot switch, DEC-007 scopes without a session, DEC-008 marker text); user informed 2026-11-19
  - DEC-001 is superseded
- Evidence: investigation notes SR-005, A-01..A-17 (the activation, archive and notice are runtime-agnostic; a native fresh session doesn't load the old context)
- Design: `design-spec.md`
  - validation returns an explicit continuation (`same_session` / `hand_over`) decided from the reference model's and the target's capacities and the record's hand-over capability;
  - the switch rule applies it;
  - the pending field, activation, archive and notice are reused;
  - no migration
- Classification: task_size `Medium`, architectural_risk `High` (shared switch rule and validation contract across all surfaces; a new persisted pending state)
- Next action: route by the handoff rules

### SR-006 — Architecture review round 1 resolved

- Phase and classification: Requirements (`Requirement Gap`: a self-contradiction resolved within the user's rule) and `Design Impact`
- Triggering: `/architecture_reviewer` ARCH-REV-001 (2026-11-23), `design-review-report.md`
- AR-001:
  - REQ-004 and AC-006 now follow REQ-003 for a third model while a model hand-over is pending: equal or bigger → resume the session; smaller or unknown → stays pending (DEC-009);
  - intended behavior is unchanged under the user's rule (DEC-003), so it was approved within the direction without renewed user approval.
- AR-002: the three launch validators get `no_session`; the false statement about model routing is corrected.
- N-1: base refreshed and citations updated (599's session renewal, the shared fresh-session step, glossary lines).
- N-2: AC-007 is reworded.
- N-3: all three DEC-005 consequences are listed.
- Skill update (2026-11-23, Principle 17): a Data Contract section with walks, examples and a read-only scan of stored data.
- Classification unchanged: `Medium` / `High`.
- Next action: back to `/architecture_reviewer`.

- Review result (informational): ARCH-REV-002 **Pass** on SR-006 (2026-11-23); the reviewer handed off to `/implementation_engineer`. Recorded without repeating the handoff. Two notes were applied as editorial clarifications with no change in intended behavior: the requirements baseline line now reads SR-006, and N-4 (the DEC-008 text only when the models differ) is added to the design's file mapping.
