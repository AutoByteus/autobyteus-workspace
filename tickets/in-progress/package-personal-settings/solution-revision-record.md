# Solution Revision Record

Package: `package-personal-settings` (Project Task autobyteus-95). Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/package-personal-settings/tickets/in-progress/package-personal-settings/`.

## Revision Index

| Revision ID | Phase | Trigger | Prior Status | Current Status | Result |
| --- | --- | --- | --- | --- | --- |
| SR-001 | Requirements | Task autobyteus-95 (2026-10-24) with the user's 2026-10-24 direction | N/A | Ready for Approval | The user is asked to approve the model, DEC-001 and DEC-005 |
| SR-002 (draft) | Requirements | The user's comment, 2026-11-01: "a simple merge" of the tools at update | Ready for Approval | Ready for Approval | DEC-001 recommendation revised to the list merge for stage 1; DEC-005 simplified; asked again |
| SR-003 | Requirements | The user's direction 2026-11-06 (store outside the package files), the validated file contract 2026-11-07, his "continue" 2026-11-09 | Ready for Approval | Approved | Requirements rewritten to the personal settings file; stage 1 / stage 2; ACs |

## Revision Entries

### SR-001 — The proposed model of package content vs personal settings

- Investigation: F-01..F-10. Today nothing keeps the user's tool changes at an update, and there is no backup (F-04..F-06).
- Proposed model: a personal overlay in the app for tool changes, avatar and runtime/model choice; package files for the author's content, written cleanly; a backup of every overwritten modified file at update; staged delivery.
- Needs the user: DEC-001 (overlay vs merge), DEC-005 (one-time carry-over of existing tool changes).
- Next action: the user's answers → approval → acceptance criteria → architecture design (stage 1 first).

### SR-003 — The personal settings file, approved

- Trigger: the user, 2026-11-06: "is a way to store it somewhere … instead of updating the original file", because app edits show as uncommitted changes in package checkouts.
  - The data model was written and then turned into a file contract with only the needed fields (`personal-settings-file-contract.md`, renamed at the user's request).
  - It was validated on real package data (`evidence/validate-personal-settings-file.mjs`: identity, the tolerant reader, a real update's capture and apply; all pass).
  - The user, 2026-11-09: "if it works then I would say continue". Taken as approval of the contract and its recommendations Q1–Q4, which were stated back to him.
- Changes: `requirements-doc.md` rewritten.
  - DEC-001: the file, not the merge; supersedes the SR-002 draft.
  - DEC-004: local packages included.
  - DEC-005: capture at every update.
  - Skills included.
  - Avatar and runtime/model moved into stage 1 (the same file).
  - Stage 2 = clean writes. ACs added.
- Intended behavior changed: `Yes`, approved by the user.
- Next action: architecture design of stage 1.
