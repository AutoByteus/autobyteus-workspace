# Requirements Document — desktop-node-file-open-471 (autobyteus-471)

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user
- Date: 2026-11-11
- Approved by and reference: `User`, 2026-11-11, in the Solution Designer's conversation, answering DEC-001: "let's remove the character limits from the file. The user can basically open any file … Any large language model will not write such a huge file. So let's remove that limit for now. Yeah, remove the limits." (option C). The other requirements are within his direction ("we should fix the desktop as well"); DEC-002 by the Solution Designer; the user is informed.
- Behavior-defining supplements: `autobyteus-server-ts/docs/design/node_access_model.md` (NAS-39 already covers owner and phone credentials on the node-file route; this ticket adds no route)

## Problem And Desired Outcome

- Problem: since 436 the phone opens any file a conversation names, read-only; the desktop still opens only files inside the run's folder when its window shows a Docker or remote node (BEH-001). On the phone a text file over 120,000 characters is refused (BEH-005). Remote runs show a message that is not true (BEH-004).
- Desired outcome (the user's direction): the desktop opens any file path a conversation names on the run's node, read-only, as the phone does; a big file opens in a useful way; a missing, folder or unreadable path and a remote run's file say plainly why.

## Behavior

| ID | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 | Host-workspace notice | Opens read-only through the node-file route (436) in the Files panel | Inside the run's folder: as today (workspace file) |
| BEH-002 | Embedded window opens local files | Unchanged | All |
| BEH-003 | Phone opens node files | Unchanged | All |
| BEH-004 | "Available only on the host workspace" for a remote run's path | "This file is on <node name>, where this run runs." on desktop and phone (links and path attachments) | — |
| BEH-005 | "Too large" | The whole file is shown, whatever its size (DEC-001 = C) | Other file types unchanged |

## Scope Guardrail

- In scope: UC-001 desktop opens a node file read-only; UC-002 plain reasons (not found, folder, unreadable, remote run) on desktop and phone; UC-003 big text files on the phone (DEC-001).
- Accepted risk (user's decision): a very large text file may make the phone slow to show it.
- Out of scope: opening a remote run's file on its own node from this window; any write; phone key limits (441); the node-file route itself (436, unchanged); desktop big files (no limit today, unchanged).
- Non-goals: none.
- Preserved: inside-folder behavior on both clients, embedded window local files, 436/437 rules (read-only, credentials, route permissions).
- Prerequisites: none.
- Review Authority: every blocking finding cites an approved REQ, AC or preserved behavior; new behavior is a `Requirement Gap` for the user.

## Requirements

| ID | Requirement | Behavior | Decision |
| --- | --- | --- | --- |
| REQ-001 | In a desktop window that shows a Docker or remote node, clicking an absolute file path in a conversation opens the file read-only in the Files panel when it is on the run's node: inside the run's folder as today, elsewhere through the node-file route with the window's owner credential. Text, Markdown, images and PDF display as for workspace files. | BEH-001 | — |
| REQ-002 | A path the node refuses shows a plain reason on the desktop, as on the phone: "This file was not found on the computer.", "This path is a folder, not a file.", otherwise "The file preview could not be opened." | BEH-001 | — |
| REQ-003 | A path in a run that another node runs says "This file is on <node name>, where this run runs." on the desktop and on the phone (links and path attachments). The "available only on the host workspace" text is removed. | BEH-004 | DEC-002 |
| REQ-004 | The phone shows a text file of any size in full; the 120,000-character limit and the "too large" state are removed. | BEH-005 | DEC-001 |

## Acceptance Criteria

| AC | REQ | Expected | Verification |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | Isolated desktop instance with a test-owned Docker node: clicking a path outside the run's folder opens the file read-only in the Files panel (Markdown and an image) | Electron + Docker probe |
| AC-002 | REQ-002 | Missing and folder paths show the two messages; an unreadable file the generic one | Probe or component test |
| AC-003 | REQ-003 | A remote run's path shows "This file is on <node>, where this run runs." on desktop and phone; no "host workspace" text remains (`grep`) | Component tests; phone probe |
| AC-004 | REQ-004 | A 130,000-character Markdown file opens in full on the phone (its last line is shown); no "too large" text remains | Phone shell probe |
| AC-005 | Preserved | Inside-folder links, embedded window local files, phone node files: unchanged; existing probes pass | Existing suites |

## Decisions

| ID | Question | Options | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How does the phone show a text file over 120,000 characters? | (A) Show the first 120,000 characters with "Showing the first 120,000 of 130,475 characters" and a "Show the whole file" button; (B) raise the limit (for example to 1,000,000 characters) and keep "too large" above it; (C) always show the whole file | The 120,000 limit has no recorded reason (investigation). A keeps today's speed for every file, hides nothing (the whole file on one tap) and needs no measurement; B and C depend on how fast a phone renders a big Markdown file, which is not measured. **Recommend A.** | User | Decided by the user: **C**, no limit (2026-11-11) |
| DEC-002 | Wording for a remote run's file | — | Says where the file is; the old text was not true | Solution Designer | Decided |
