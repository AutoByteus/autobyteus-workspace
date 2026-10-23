# Solution Revision Record

Package: `update-checks-and-auto-updates` (Project Task autobyteus-210). Canonical artifacts in
`/Users/normy/autobyteus_org/autobyteus-worktrees/update-checks-and-auto-updates/tickets/in-progress/update-checks-and-auto-updates/`.

## Revision Index

| Revision ID | Phase | Trigger / Report / Round | Finding IDs | Prior Status | Current Status | Affected Behavior / Requirement IDs | Result |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Initial coherent baseline (Task autobyteus-210, 2026-10-23) | N/A | N/A | Ready for Approval | BEH-001..007, REQ-001..019, AC-001..017, SCN-001..009, DEC-001..016 | Waiting for the user on DEC-003 |
| SR-002 | Requirements | The user's answers, 2026-10-23 | DEC-003; new category | Ready for Approval | Approved | BEH-008, UC-006, REQ-001/002/005/010/011, REQ-020..023, AC-018..022, SCN-010/011, DEC-003/004/017/018 | Product Design Requested |
| SR-003 | Requirements | Product designer's Requirement Impact (the user's design-review direction), 2026-10-23 | Impact on REQ-007/008/010 | Approved (SR-002) | Approved (SR-003) | REQ-007, REQ-008, REQ-010, AC-008, SCN-006, BEH-004, DEC-002 → DEC-019, Data Continuity | Design continues |

## Revision Entries

### SR-001 — Requirements baseline for check intervals, the app check and automatic updates

- Phase and classification: Requirements, `Initial Baseline`.
- Trigger: Task autobyteus-210 from `/project_task_manager`, including the user's 2026-10-23 comment. Investigation in `investigation-notes.md` measured that unauthenticated conditional requests still count against GitHub's limit, and that the git ref advertisement is quota-free.
- Prior status: N/A. Current status: requirements `Ready for Approval`; design not started.
- IDs: all (baseline).
- Changes 209 requirements: 209 REQ-002's 6-hour cadence becomes REQ-001's interval; 209 REQ-015 becomes opt-in automatic update (REQ-005).
- Intended behavior changed: N/A (baseline).
- Approval impact: one decision needs the user (DEC-003: undo / pin / skip); the rest is decided within the direction.
- Next action: the user's answer on DEC-003 → approval → Product Design request (delegated by the Solution Designer to the Product Team).

### SR-002 — The user's answers: no undo; no automatic app update; agent runtimes as a category

- Phase and classification: Requirements, `Refinement` (the user changed and added intended behavior).
- Trigger: the user in the Solution Designer conversation, 2026-10-23:
  - "We don't do automatic updates … for software, of course, we do not do automatic updates";
  - automatic update is "a toggle for agent packages and the skill sources";
  - "I want to also have another notification … agent runtimes … so user can also enable just automatic updates … a lot of users, they don't know that they need to update those".
- Changes:
  - DEC-003 decided (none);
  - REQ-023 (the app never updates itself);
  - agent runtimes as a fourth category on the desktop's own node: BEH-008, UC-006, REQ-020..022, AC-018..022, SCN-010/011, DEC-017 (desktop's own node, following runtime-lifecycle-review D-3) and DEC-018 (never while agents run);
  - one interval per category (DEC-004 revised; runtimes 60 min);
  - REQ-002 also covers the runtime version sources (the Codex source uses `api.github.com` today, outside the gate).
- Intended behavior changed: `Yes` (approved by the user's own answers; the rest within the direction, user informed).
- Approval: `requirements-doc.md` at SR-002.
- Next action: Product Design request, delegated by the Solution Designer to the Product Team; the user approves the UI.

### SR-003 — Local changes are replaced, after a one-time confirmation

- Phase and classification: Requirements, `Refinement` (the user changed intended behavior).
- Trigger: a Requirement Impact from the Product UI/UX Designer (run `product_ui_ux_designer_d3a466b2a14542698fcb2a9b4ab76b32`), 2026-10-23. It quotes the user: with automatic updates enabled "we should directly overwrite those" local changes, and "give them a confirmation overlay" when the switch is turned on.
- Changes:
  - REQ-007: replace, with confirmation on turning the switch on, no record and no backup;
  - REQ-008: the "local changes" outcome is removed;
  - REQ-010: the explanation text says local changes are replaced;
  - AC-008 and SCN-006 rewritten; BEH-004 desired text; Data Continuity; Architecture Phase Input (no fingerprint);
  - DEC-002 superseded by DEC-019: skill sources follow the same rule, decided by the Solution Designer for consistency.
- Intended behavior changed: `Yes`. Approved by the user's own words; skill-source consistency is within the direction, user informed.
- Approval: `requirements-doc.md` at SR-003.
- Next action: the reply to the Product designer; the design continues to the user's approval.
