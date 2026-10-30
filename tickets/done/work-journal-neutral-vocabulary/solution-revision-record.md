# Solution Revision Record — autobyteus-331

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Mixed (Evidence + Requirements baseline + Design) | Task autobyteus-331; the user's neutrality request of 2026-10-30 (via autobyteus-316) | E-01…E-19 | N/A | Requirements Approved (Solution Designer within the direction, user informed); design `Ready` for the user's approval | BEH-001…009, REQ-001…014, AC-001…014 | Baseline, vocabulary contract, design spec |

| SR-002 | Evidence + approval | The user's reply "Yeah, I like your recommendation. Let's go." (2026-10-30) after the design summary, DEC-006 (header and manifest keep the runtime) and the E-13/FU-001 correction | E-13 (corrected) | Design `Ready` | Design `Approved` by the user | DEC-006, FU-001, design-spec | Design approved; handoff to implementation |
| SR-003 | Evidence (delivery decisions) | The delivery engineer's request after the shadow render (`evidence/IMP-04-shadow-render-report.md`) and API/E2E (`api-e2e-execution-coverage-report.md`) | DEC-007, DEC-008, FU-003 | Design approved, implemented, validated | Unchanged; two measured items decided by the Solution Designer within the direction, user informed | REQ-013, REQ-004 | Gate 2 miss accepted; FU-003 a follow-up |

## Revision Entries

### SR-001 — Baseline: neutral vocabulary, no migration

- Phase and classification: Mixed / Initial Baseline
- Trigger: autobyteus-331, split out of autobyteus-316 on the Solution Designer's suggestion; the user decided on 2026-10-30 that it is worked first and delegated the wording decisions. Source of the behavior: `work-journal-neutral-vocabulary-contract.md` (built in the 316 conversation over several rounds with the user's corrections: per-runtime tables, runtime-only tools converted, complete synthetic traces, no stop reason, no platform change).
- Prior status: N/A. Current: requirements Approved within the direction; design Ready (not yet approved by the user).
- Changes from the contract's first version caused by the current base (`a0a038967c`): `read_media_file` is recorded history (autobyteus-328); the project-task tool names; `submit_launch_choices`; one runtime-independent skill rule; `delivered` outcome; qualified names through a runtime hook.
- Intended behavior changed: N/A (baseline). Approval: Solution Designer within the direction (reference: the message to the user of 2026-10-30); the user approves the design before any build.
- Design/review impact: classification in `design-spec.md`.
- Remaining gaps: U-1…U-4 (measured in validation, REQ-013).
- Next action: the user approves the design; then handoff per the rules.

### SR-002 — Design approved by the user; E-13 corrected; DEC-006

- Phase and classification: Evidence + approval (no change of intended behavior)
- Trigger: the user's questions of 2026-10-30 (does the journal need its runtime; where is a runtime missing; do imports bring the journal) and his reply "Yeah, I like your recommendation. Let's go."
- Evidence changes: E-13 corrected after measuring: the 226 journals without a runtime are local runs (209 standalone agents, 17 team members), 213 without `run_metadata.json`, 224 never rotated; imports copy raw traces and the source node's journals and this node never re-renders them; FU-001 reworded (the raw manifest names the runtime of only 2 of the 226).
- Decision added: DEC-006 (the header's runtime label and the manifest's `runtime_kind` stay as they are).
- Intended behavior changed: No. Requirements approval (SR-001, Solution Designer within the direction) is unchanged and applies.
- Approval: the design is approved by the user (reference above). Not covered by the user's approval: nothing outstanding.
- Routing: `Architecture Design Complete`, `task_size=Medium`, `architectural_risk=Low`; the handoff rule for Small/Medium with Low risk applies (direct implementation); see `handoff-architecture-design-complete.md`.
- Next action: implementation, then API/E2E and delivery per the team route; the shadow-render report (REQ-013) is part of validation.

### SR-003 — Delivery decisions: memory-search gate 2, and older native message outcomes (2026-10-30)

- Phase and classification: Evidence (no change of intended behavior)
- Trigger: the delivery engineer paused delivery on two items (message from `delivery_engineer_cf0744eae4044f98b56bfb0aaa58ee61`). I read `evidence/IMP-04-shadow-render-report.md` and FU-003 before deciding.
- **Decision 1, memory-search gate 2 (DEC-007): accepted as a measured effect of the wording change (option a).** Measured on an isolated copy with the same 31 questions: gate 1 unchanged (31 of 31 found within 3 searches, 30 in the first search); gate 2 top 3 went from 26 to 25 and MRR from 0.625 to 0.616 (Q14 rank 2 to 4, Q27 rank 9 to 10; none moved up); latency p90 improved (992 to 779 ms). The docs rule (`memory_search.md` § Quality Check: gate 2 "must not get worse") is read literally as missed by one question, and it does apply to this change in spirit, because cards and chunks are built from journal text and this change rewrites 82% of that text; so the decision is not "the rule does not apply". It is accepted because (1) the shift is the neutral wording itself changing the words the index sees, which is the intended behavior (REQ-001…003), and no code that chunks, ranks or orders changed; (2) gate 1, the guarantee that matters, is untouched and every question is still found in the first search; (3) the alternative (b), a redesign to keep one question's rank, would trade the approved neutral wording for one rank on a 31-question set; (4) the cost of the shift is one question of 31 and I do not claim it is noise (no repeat run was made). The shadow-render report stays the record; no threshold is added to the requirements.
- **Decision 2, FU-003 (DEC-008): a follow-up Task (option a), not a local fix.** Older native-runtime message results are recorded as plain text (`Delivered message to <name>…`, `Message dispatch for…`) with no `accepted` field; the converter prints `Message to X → ok` for them (5,782 + 61 of 7,213 `ok` message lines), newer runs `→ delivered`. The head is the neutral line either way and `ok` is true (the call ran); REQ-004 and AC-004 pass as approved. Reading recorded free text is new behavior (a rule keyed on the platform's old message wording) that the approved requirements do not contain, so it would be a Requirement Gap with another round through implementation and validation; the ticket works without it, so the scope rule prefers a follow-up. FU-003 stays in `follow-ups.md`; its suggested Task is to treat such recorded wording as recorded history, like the other history names.
- Approval impact: none. Intended behavior is unchanged; the requirements approval (SR-001) and the user's design approval (SR-002) apply.
- Next action: delivery docs sync and finalization; the Solution Designer sends the follow-ups (FU-001…FU-004) when the result leaves the team.
