# Solution Revision Record

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline from user report + reproduction | N/A | N/A | Ready for Approval | BEH-001–BEH-006, REQ-001–REQ-008, AC-001–AC-008 | Presented to user; awaiting approval and DEC-001–DEC-004 |
| SR-002 | Evidence | User prompt on over-engineering; feasibility spikes 1–2 | N/A | Ready for Approval | Ready for Approval | DEC-001 detail, Architecture Phase Input | Minimal change validated (26–82 ms switches; Show all 254 ms); earlier extra mechanisms withdrawn |
| SR-003 | Mixed | User approval 2026-10-04 + architecture design | N/A | Ready for Approval | Requirements Approved; Design Ready | REQ-006 wording; DEC-001–DEC-004 resolved; BEH-001–BEH-006 mapped | Design complete; task_size Small, architectural_risk Low |

## Revision Entries

### SR-001 — Bound Org Messages work on member switch

- Phase and classification: Requirements — `Initial Baseline`
- Triggering user feedback: User report on 2026-10-04, with two screenshots, of slow member switching in the long-running org `autobyteus_org_be52ac58c92a412e9f30b2260237c7cf`.
- Triggering finding IDs: N/A
- Prior authoritative requirements/design status: N/A
- Current authoritative requirements/design status: Requirements `Ready for Approval`; design not started.
- IDs affected: BEH-001–BEH-006, UC-001–UC-004, REQ-001–REQ-008, AC-001–AC-008, SCN-001–SCN-005, QR-001–QR-003, DEC-001–DEC-004
- Scenario-basis changes: N/A (baseline)
- Why recorded: First coherent baseline after the reproduction (Org tab 3.2–4.2 s vs Files tab 5–51 ms) and the CPU-profile attribution.
- Canonical sections changed: All sections created (`requirements-doc.md`, `investigation-notes.md`).
- Supplemental artifacts added: `probes/measure.mjs`, `probes/reference-projection-bench.mjs`, `probes/analyze-profile.py`, `probes/explore.mjs`, `evidence/*`
- Product design evidence incorporated: N/A
- Intended behavior changed: N/A (baseline proposal)
- Approval impact: Approval pending; no approval reference yet.
- Behavior-defining supplement versions: None
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: None. This is an approval hold in the requirements conversation.
- Downstream impact: None yet.
- Remaining gaps: DEC-001 (reference presentation), DEC-002 (producer-side separate ticket), DEC-003 (mobile), DEC-004 (thresholds); UNK-001, UNK-002.
- Next action: Get explicit user approval and decisions, then start the architecture design.

### SR-002 — Minimal-change feasibility evidence

- Phase and classification: Evidence — `Refinement`
- Triggering user feedback: On 2026-10-04 the user observed that performance problems often come from over-engineering or from complicated early designs made without understanding the UX.
- Triggering finding IDs: N/A
- Prior status: Requirements `Ready for Approval` (SR-001)
- Current status: Requirements `Ready for Approval`; design not started
- IDs affected: DEC-001 recommendation detail; Architecture Phase Input; no REQ/AC/QR change
- Scenario-basis changes: None
- Why recorded: Two throwaway spikes (reverted; `probes/minimal-spike.patch`) showed three things are enough to meet every proposed target: on-demand reference IDs, references only under the selected message, and a plain first-20 cap with "Show all". Results: switches 26–82 ms (baseline ≤ 4,232 ms) and Show all 3,136 at 254 ms. The memoization, `markRaw`, incremental-update and virtualization ideas floated in conversation are withdrawn.
- Canonical sections changed: investigation-notes Runtime findings and Simplicity Assessment; requirements-doc UI section and Architecture Phase Input
- Supplemental artifacts added: `probes/minimal-spike.patch`, `probes/measure-spike.mjs`, `evidence/spike1-*`, `evidence/spike2-*`
- Intended behavior changed: No
- Approval impact: Approval still pending; none recorded
- Affected design/review basis: N/A
- Post-design classification: N/A
- Applied handoff-rule outcome: None (approval hold)
- Remaining gaps: DEC-001–DEC-004 user decisions
- Next action: User approval, then a concise design spec

### SR-003 — Approval capture and architecture design

- Phase and classification: Mixed — `Refinement` (approval capture + design)
- Triggering user feedback: User message 2026-10-04: "I think on the message list changes, I think you did a good job with UI. Show first the 25 hours, then show all. Yeah, use this approach. It's a good one. Let's work on the first this ticket, the app ticket, because the other agent package belongs to the agent package project."
- Triggering finding IDs: N/A
- Prior status: Requirements `Ready for Approval`; design N/A
- Current status: Requirements `Approved`; design `Ready` (`design-spec.md`)
- IDs affected: DEC-001 (Option A approved), DEC-002 (producer side excluded; belongs to the agent package project), DEC-003 (mobile excluded per approved scope), DEC-004 (targets accepted with the approach), REQ-006 (wording clarified), ASM-001 (confirmed)
- Scenario-basis changes: None
- Why recorded: Explicit approval received; architecture design completed.
- Canonical sections changed: requirements-doc Document Status, REQ-006, UI section, Open Decisions, Assumptions, Readiness; investigation-notes meta and Architecture Investigation Findings; design-spec created
- Supplemental artifacts: unchanged (probes/evidence)
- Intended behavior changed: No beyond the approved Option A. The REQ-006 wording narrows "re-deriving the full history" to "deriving reference identities for, or re-rendering reference rows of, the history". Observable outcome AC-007 is unchanged; this is a technical clarification within the approved intent.
- Approval impact: Approved baseline = requirements-doc as of SR-003. "25 hours" is a speech transcription, interpreted as the approved mockup's 20-file preview (one constant; flagged to the user).
- Behavior-defining supplement versions: None
- Affected design/review basis: First design
- Post-design classification: `task_size = Small`, `architectural_risk = Low`. Four production files in one capability area plus locale keys and three spec updates. No API/persistence/security/concurrency/deployment/ownership change. The server reference-ID contract is preserved.
- Applied handoff-rule outcome: Architecture Design Complete (Small/Low) → `/implementation_engineer`; see `handoff-result.md`. User confirmed message count is not a concern (no scope change).
- Downstream and architecture-review impact: Per handoff rules
- Remaining gaps: UNK-002 (Electron spot check during validation); producer-side ticket owned by the agent package project; mobile follow-up candidate
- Next action: Apply handoff rules
