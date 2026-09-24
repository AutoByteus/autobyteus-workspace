# Solution Revision Record

- Package identifier: `claude-sdk-canonical-model-ids`

## SR-001 — Initial requirements baseline (2026-09-24)

- Trigger: User request + two screenshots (Claude Agent SDK model dropdown shows `Default (recommended)`, `Fable`, … instead of exact model ids).
- Prior status: N/A
- Current status: Requirements `Ready for Approval`; DEC-001 (display-only vs pin canonical id) open.
- Affected IDs: BEH-001..005, UC-001..002, REQ-001..006, AC-001..006, SCN-001..002.
- Canonical sections: all of `requirements-doc.md`; `investigation-notes.md` created.
- Approval basis / impact: none yet; awaiting user decision + approval.
- Design / review / routing impact: design not started (N/A).
- Remaining gaps: DEC-001.

## SR-002 — Approved requirements (2026-09-24)

- Trigger: User follow-ups ("these two are the same?", "what is your suggestion", "only frontend change?", preview request) and approval: "great. this is what user want to see. approved".
- Prior status: Ready for Approval (DEC-001 open) → Current: Approved.
- Affected IDs: DEC-001 resolved (show canonical ID, merge rows with the same canonical ID, keep sending SDK values, pinning deferred); REQ-001..010, AC-001..008, BEH-006, SCN-003 added/revised; `dropdown-preview.md` created.
- Approval basis: explicit user approval of `requirements-doc.md` + `dropdown-preview.md`.
- Design impact: architecture design may start.

## SR-003 — Architecture design complete + evidence correction (2026-09-24)

- Trigger: Architecture investigation.
- Evidence correction: new configs are seeded from the definition's `defaultLaunchConfig`; there is no automatic "pre-select Default". BEH-006/REQ-010/AC-007 and preview §2 note reworded to the approved intent "same as today". No new intended behavior; renewed approval not required (user informed in the design summary).
- Design: `design-spec.md` created — presentation-only merge driven by server `selectionPresentation` hints; Claude `canonical_name` = `resolvedModel`; catalog identities, validation, persistence unchanged; shared web picker builder replaces two duplicated builders.
- Classification: `task_size=Medium`, `architectural_risk=Low`.
- Remaining gaps: none blocking.
