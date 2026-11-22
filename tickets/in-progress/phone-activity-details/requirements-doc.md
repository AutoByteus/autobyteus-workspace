# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-002`
- Package: `phone-activity-details`; Task autobyteus-590 (absorbs autobyteus-586); requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`); date 2026-11-22
- Approved by: SR-001 by the Solution Designer within the direction (user informed, 2026-11-22); SR-002's refinements (DEC-006…DEC-008) by the **user**, 2026-11-22, in the Solution Designer's conversation, after the proposed row and detail mock-ups: "Yeah I trusted your decision because I think you have very very good understanding of user experience and yeah and our applications as well".

## Problem And Desired Outcome

- Problem: the phone Activity screen repeats each tool's name on two lines with a raw status, and no row can be opened for its details, while the desktop shows a summary-worthy name, a status label and expandable arguments, logs, result and error (root cause: `investigation-notes.md`). Separately (586), the web typecheck runs out of memory while a demo build output exists.
- Outcome: each phone Activity row says what the activity did; any row opens a detail screen with everything the desktop shows; background tasks and errors read completely; the web typecheck passes with a demo build present.

## Behavior

| BEH | Current | Desired | Preserved |
| --- | --- | --- | --- |
| BEH-001 tool row | name / name (or `path`/`command` when present at creation); raw status | name / the shared summary of what it did (command, file, or text), or the name alone when there is nothing to summarize; the desktop's status label | Order, newest at the bottom as today; live updates |
| BEH-002 tool details | none (2-line error, 6-line logs) | tap → detail screen: name, status, full summary, Arguments, Logs, Result, Error; live while open; Back to the list at the same place | — |
| BEH-003 compaction | message · provider · turn | tap → the desktop's detail rows (incl. its error) | Row content |
| BEH-004 system instruction | desktop component reused | unchanged | — |
| BEH-005 background tasks | command 2 lines, end summary 3 lines | tap a task → its full command and full end summary, as the desktop's expand | Counts, order, statuses |
| BEH-006 errors | 2-line excerpt in the row | row: status "Failed" and a short excerpt; details: the full error | — |
| BEH-007 (586) typecheck | OOM with `dist-mobile-demo/` present | passes; no build output inside `autobyteus-web/` enters the type project | Excludes that exist |

## Scope Guardrail

- In scope: UC-001 phone Activity rows (tool, compaction, system instruction, background tasks); UC-002 their detail views; UC-003 one shared summary and details model for desktop and phone; UC-004 (586) the Nuxt type project's excludes and `TESTING.md`'s sentence.
- Out of scope: the desktop Activity's look and behavior (it reads the shared builders, unchanged in what it shows); the conversation's tool cards; the node's own `contextText` in stored-run projections (FU-001); tool approval from the phone (as today).
- Preserved: live updates, activity order, the desktop panel's content.
- Prerequisites: None.

## Requirements

| REQ | Requirement | Source |
| --- | --- | --- |
| REQ-001 | A phone tool row shows the tool name and, below it, the shared summary of the call (the same summary the desktop conversation's tool card shows: its command, its file, its text argument, or for the platform's agent tools whom it addresses or which Task: "→ /architecture_reviewer", "autobyteus-590"), computed from the activity's current arguments, at most two lines; a command's one-line summary leaves out a leading `cd <folder> &&` (the full command stays in its tooltip and the detail screen); never the tool name a second time; nothing when there is nothing to summarize | Founder report; user, SR-002 (DEC-006, DEC-007) |
| REQ-002 | The row's status never relies on color alone: a success shows a small check icon only (its label "Success" for screen readers); every other status shows an icon and its word (Failed, Running, Review, Denied, Approved, Parsed); the words and tones are the desktop's; the detail screen spells the status out | Parity; accessibility (WCAG 1.4.1); user, SR-002 (DEC-008) |
| REQ-003 | Tapping a tool row opens a detail screen with the tool name, status, the full summary (full path or command), Arguments, Logs, Result and Error, each shown when present, readable on a narrow screen (wrapping, monospace for data), updating live while open; the system Back returns to the list at the same scroll position | Founder report; Task direction 2 |
| REQ-004 | Tapping a compaction row opens its details: the desktop's detail rows, including its error | Task direction 3 |
| REQ-005 | Tapping a background task shows its full command and full end summary (the desktop's expanded view) | Task direction 3 |
| REQ-006 | A failed tool or compaction shows "Failed" and a short excerpt in the row; its details show the full error | Task direction 3 |
| REQ-007 | One owner for each derived fact: the tool summary (`getToolDisplaySummary`), the tool status label, the tool details sections, the compaction detail rows — used by both the desktop components and the phone; the duplicated `contextText` rule leaves the web | DESIGN.md (one builder) |
| REQ-008 | (586) `../dist-mobile-demo/**` is excluded from the Nuxt type project; every other build output that can exist inside `autobyteus-web/` is confirmed excluded; `TESTING.md`'s workaround sentence is removed; `pnpm -C autobyteus-web typecheck` passes with `dist-mobile-demo/` present | PM comment (586) |
| REQ-009 | Tests: web unit tests (row summary incl. late arguments and a tool with nothing to summarize; status labels; details sections; compaction rows; background task expand); a phone case in `test:e2e:mobile-shell` on the production phone bundle (rows show summaries, a tool row opens its details with arguments/logs/result, a failed tool shows its error, a compaction and a background task open their details, Back returns to the list) | TESTING.md |

## Acceptance Criteria

| AC | REQ | Outcome | Verification (evidence and how) |
| --- | --- | --- | --- |
| AC-001 | REQ-001 | `run_command`/`Bash` show their command, without a leading `cd <folder> &&` on the row; `edit_file`/`read_file`/`write_file` show their file (also with `file_path`, also when the arguments arrive after the row appears); `send_message_to` and `delegate_task` show "→ <recipient>"; `get_project_task`/`update_task` show their Task key; `create_task` shows its title; a tool with nothing to summarize shows its name once; no row shows the name twice; the conversation's tool cards show the same summaries | Web unit (incl. the conversation tool card specs); phone probe |
| AC-002 | REQ-002 | A successful row shows only the check icon (accessible name "Success"); a failed, running, review, denied row shows its icon and word; the detail screen shows the status word | Web unit; phone probe |
| AC-003 | REQ-003 | A tool row opens its detail screen with Arguments, Logs, Result, Error as present; a running tool's logs grow while it is open; Back returns to the list at the same place | Phone probe (production bundle, 390×844) + unit |
| AC-004 | REQ-004, REQ-006 | A compaction row opens its rows; a failed tool and a failed compaction show the full error | Unit + phone probe |
| AC-005 | REQ-005 | A background task with a long command and summary shows both in full on tap | Phone probe (scripted AGY background task) + unit |
| AC-006 | REQ-007 | The desktop Activity shows the same content as before (its specs pass unchanged in outcome) and reads the shared builders; no `contextText` remains in the web app | Unit + code search |
| AC-007 | REQ-008 | With `dist-mobile-demo/` present (after `build:mobile-web --demo`), `pnpm -C autobyteus-web typecheck` passes at baseline; the TESTING.md sentence is gone | Local run |

## Decisions

| ID | Question | Reasoning And Recommendation | Owner | Status |
| --- | --- | --- | --- | --- |
| DEC-001 | Inline expand or a detail screen on the phone? | Arguments, results and logs can be long JSON; a full-screen detail (like the phone's file viewer) reads better on a narrow screen and keeps the list scannable; Back works as everywhere on the phone. **Detail screen** | Solution Designer | Decided |
| DEC-002 | What is the row's second line? | The shared summary the desktop conversation already uses (command / file / text, secrets redacted), derived from current arguments; nothing when there is nothing to summarize. **Shared summary** | Solution Designer | Decided |
| DEC-003 | Background tasks: detail screen or expand in place? | The desktop expands in place; a task's content is two text fields. **Expand in place on tap** | Solution Designer | Decided |
| DEC-004 | The node's `contextText` | Stored-run projections use it for dedupe; changing it touches the projection contract; the phone no longer needs it. **Leave it; FU-001** | Solution Designer | Decided |
| DEC-006 | Summaries for the platform's agent tools | `send_message_to`, `get_project_task`, `update_task` repeated their name (their keys `recipient_address`, `task_id` are not summary keys) — user's screenshot 2026-11-22 | Add `recipient_address` ("→ <address>") and `task_id` to the shared summary's keys; the conversation's tool cards improve the same way | User (approved the recommendation) | Decided |
| DEC-007 | Long commands that start with `cd <folder> &&` | Every row repeated the same folder (user's screenshot) | Leave the leading `cd …&&` out of a command's one-line summary; full command in the tooltip and details | User (approved the recommendation) | Decided |
| DEC-008 | Is a "Success" badge needed when green already says it? | Color alone fails colour-blind readers and sunlight/dimmed screens, and several states exist | Success: a check icon only; every other status: icon + word | User (approved the recommendation) | Decided |
| DEC-005 | Evidence for the phone (AC-003…005) | The production phone bundle in `test:e2e:mobile-shell` is the project's phone evidence; no physical phone is available; the untested scope is a physical device's WebView rendering of ordinary HTML/CSS from the same bundle — low risk. **Use the phone probe; accept the physical-device scope as untested** | Solution Designer | Decided |
