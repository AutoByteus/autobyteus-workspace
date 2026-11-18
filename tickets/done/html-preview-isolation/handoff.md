# Handoff — html-preview-isolation (autobyteus-417)

- Result: `Architecture Design Complete`
- Classification: task_size `Small`, architectural_risk `High` (security-boundary change: what preview content may do; new response header on a node route). Rationale in `design-spec.md` § Task Size And Architectural Risk.
- Current solution revision: `SR-003`
- Applied handoff rule: "Architecture Design Complete with … architectural_risk=High" → `/software_engineering_team/architecture_reviewer` (independent architecture review). Sent 2026-11-07.

## Original request

Project Task `autobyteus-417` (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager`: urgent follow-up FU-002 of autobyteus-403 — isolate the HTML preview; previewed pages run with the app window's own origin and can reach the app. Source row: `/Users/normy/autobyteus_org/autobyteus-delivery-records/websocket-origin-guard-403-20261107/follow-ups.md`.

Done when: a previewed page cannot reach the app window, the preload API or the node with the app's rights; previews still work for their purpose; tests; finalized on the base branch. Constraints: keep previews useful (application iframes and artifacts keep working); the user is told before behaviour changes; no private data in tests; follow DESIGN.md and TESTING.md; release only on the user's word.

## Approval basis

Requirements `Approved` by the user, 2026-11-07, in the Solution Designer conversation, after the behaviour change was explained: option A (`sandbox="allow-scripts"` for every preview). Previewed pages lose relative module scripts, `fetch` of workspace files, workspace web fonts, workers, and browser storage. The user previews HTML to view it and runs complex UIs in the in-app browser through an agent-started server. DEC-006: no storage stand-in (user informed). SR-003 clarified one phone detail (phone team references show HTML as code); intent unchanged.

## Evidence (measured, Electron 42.4.1 with the app window's webPreferences)

- Today: a blob preview runs as the app window (reads the window, calls the preload API, which reaches the main process as the app window, shares app storage, node requests accepted); a workspace preview runs at the node's origin (WS `/ws/terminal` and POST `/graphql` carry the node's Origin).
- With `allow-scripts` only: origin `null`; window, preload and storage throw `SecurityError`; node requests carry `Origin: null` (refused by 403's gate); inline and classic scripts, CSS and images still work.
- A `Content-Security-Policy: sandbox allow-scripts` header on the static route isolates the document even with `allow-same-origin` set, with no sandbox attribute, and top-level.
- Reproduction: `evidence/preview-probe/` (README has the commands).

## Design (summary)

1. `autobyteus-web/components/fileExplorer/viewers/HtmlPreviewer.vue`: `sandbox="allow-scripts"`; the blob holds the content only (remove the dead `<base>`).
2. `autobyteus-server-ts/src/api/rest/workspaces.ts`: the static route sends `Content-Security-Policy: sandbox allow-scripts` on served files.
3. Tests in the two existing spec files; docs `autobyteus-web/docs/file_explorer.md`, `content_rendering.md`.
4. Left alone: the node's Origin rule/CORS, the Electron shell, `ApplicationIframeHost.vue`, `/content`.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation`, branch `codex/html-preview-isolation`
- Base: `origin/personal` @ `ff68bfb5fa`; finalization target `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/html-preview-isolation/tickets/in-progress/html-preview-isolation/` (documents are in the worktree, not yet committed)

## Documents

- `requirements-doc.md`, `investigation-notes.md`, `design-spec.md`, `solution-revision-record.md`, `follow-ups.md`, `evidence/preview-probe/`

## Open risks and follow-ups

- RSK-001 (accepted): a previewed page can still send its own content to the internet.
- FU-001 (urgent): the node accepts every loopback origin (403 DEC-004), so pages served from localhost (e.g. an agent-started dev server in the in-app browser) reach the node with full rights.
- FU-002 (urgent): other node file routes (e.g. `/content`) serve HTML at the node's origin when opened top-level.
- Follow-ups go to `/project_task_manager` when the ticket leaves the team.

## Expected next action

Independent architecture review of the design. On Pass, the reviewer's route continues to implementation; on Fail/Blocked, findings return to the Solution Designer.

## Architecture review result (informational)

- 2026-11-07: Pass, ARCH-REV-001 on SR-003, no findings; Small / High confirmed. Report: `design-review-report.md`; record: `architecture-review-revision-record.md`. The reviewer delivered the package to `/software_engineering_team/implementation_engineer`. Residual risks R-1…R-4 for validation: no real relative image in the probe, the no-Origin GET clause of REQ-003, refresh on the workspace path, and the Electron version. No Solution Designer action; no duplicate forwarding.

## SR-004 — answer to implementation R-3 (2026-11-07)

Evidence correction, no change to intended behavior and no renewed approval needed. AC-004 has been reworded: an artifact (blob) preview updates when its content changes; a workspace preview shows the changed file after it is reopened, as before this ticket. The missing automatic reload is pre-existing and recorded as FU-003 (not urgent). Not fixed in this ticket. The user is informed. Answer sent to the implementation engineer.
