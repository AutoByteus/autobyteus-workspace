# Solution Revision Record — projects-tree-one-place

| Revision ID | Phase | Trigger | Prior | Current | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | autobyteus-353 bug report on 347 | N/A | Ready for Approval (DEC-001 needs user) | Question asked to the user |
| SR-002 | Mixed | User decision (DEC-001) | Ready for Approval | Approved; design Ready (Medium / Low) | To implementation

### SR-001 — Draft and the user's decision

- Trigger: Task autobyteus-353 from `/project_task_manager`; the user's screenshots.
- Evidence: investigation-notes.md E-001…E-004 (designed behavior of 347; one PM run hosts Tasks of 6 Projects; no run started under a Project yet).
- Status: waiting for the user's answer to DEC-001.

### SR-002 — The user's decision; requirements approved; design

- Trigger: the user's answer in the Solution Designer's conversation, 2026-10-31 (quoted in requirements-doc.md): only runs started under a Project appear; "UI is reflecting the data". He had asked how 347 built the tree; it was explained (no migration, no copies; derived from Task records).
- Prior: Ready for Approval (DEC-001 open; recommended A). Current: requirements Approved (user: DEC-001; Solution Designer within direction: DEC-002…DEC-004); design Ready.
- Design: remove 347's derived listing, scopes, Org rows, `pinned`, Task-event triggers; rows unscoped as in Workspaces. No persisted-data change.
- Classification: task_size Medium, architectural_risk Low → direct implementation (handoff rule).
- Next action: implementation.

### Note — release decision (no solution change)

- The user, 2026-10-31: "i would like to release a beta for this when its finished thanks". Recorded in requirements-doc.md § Release Decision and handoff-implementation.md; delivery releases a beta after finalization.
