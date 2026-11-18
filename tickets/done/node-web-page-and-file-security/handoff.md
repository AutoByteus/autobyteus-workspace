# Handoff — node-web-page-and-file-security (autobyteus-416)

- Result: `Architecture Design Complete`
- From: Solution Designer (run `solution_designer_2aac85158cde49c99112f985fe522460`), 2026-11-07
- Route: `/software_engineering_team/architecture_reviewer`. Handoff rule: Architecture Design Complete with `task_size=Large` / `architectural_risk=High`.
- Current solution revision: SR-003 (re-review after ARCH-REV-001)

## Request

Project Task autobyteus-416 (Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a`), requested by `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) for the user. One security Task for three findings: DNS rebinding (403 FU-001), loopback origins on any port (417 FU-001), user files served as documents at the node's origin (417 FU-002). Investigation added a fourth of the same class: `file://` pages in the in-app browser look exactly like the desktop app to a node (measured).

Goals: a rebinding page cannot reach a node; a page from an arbitrary localhost port cannot reach the embedded node with the app's rights; no user file runs as a document with the node's rights (every serving route listed); the app, phone shell, remote nodes and the local-server workflow keep working; tests; finalized on the base branch.

Constraints (Task): do not break the desktop app, phone shell, Docker nodes, remote collaboration and the agent-started local server workflow. Tests on isolated nodes; no secrets in logs; no private data in tests. Follow DESIGN.md and TESTING.md. Release only on the user's word.

## Approval basis

- Requirements SR-001 approved by the **user**, 2026-11-07, in the Solution Designer conversation. He answered the two decisions presented with recommendations: "i trust your judgement, you understand more than me actually". Recorded as DEC-001 = A (allowed host classes + `AUTOBYTEUS_ALLOWED_HOSTS`) and DEC-002 = A (no localhost origin by default; exact origins in `AUTOBYTEUS_ALLOWED_ORIGINS`; our launchers list theirs).
- DEC-003…009 decided by the Solution Designer within the direction, presented to the user in the same message.
- Design approval by the user: not required by the Task.

## Workspace

- Worktree: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security`
- Branch: `codex/node-web-page-and-file-security`, from `origin/personal` @ `6225a734a3a7e76e7d75f8d937fec78295b681f8` (fetched 2026-11-07)
- Finalization target: `origin/personal`
- Ticket folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/node-web-page-and-file-security/tickets/in-progress/node-web-page-and-file-security/`. The documents are in the worktree and not yet committed; no source code is changed.
- Build state: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-server-ts prebuild && build` done in the worktree (used by the reproduction probe).

## Documents

- `requirements-doc.md`: Approved (SR-001); REQ-001…010, AC-001…014, SCN-001…009, DEC-001…009
- `investigation-notes.md`: evidence, user-file route inventory F1–F16, reproduction and architecture findings
- `design-spec.md`: D1–D9, entry-form table, spines DS-001…005, file mapping, change sequence; classification Large / High
- `solution-revision-record.md`: SR-001, SR-002
- `follow-ups.md`: FU-001 (standalone application host, rebinding; urgent; not yet sent; the Solution Designer sends it when the ticket leaves the team)
- Supplements (evidence): `probes/reproduce-416.sh`, `probes/electron-file-origin-probe.js`, `probes/electron-origin-rewrite-and-pdf-probe.js`, `evidence/R-reproduce-416-base.txt`, `evidence/R4-electron-file-origin.json`, `evidence/A1-electron-origin-rewrite-and-pdf.json`, `evidence/A1-pdf-under-csp-sandbox.png`

## Evidence summary

- Reproduced on an isolated node (base build): rebinding POST and no-Origin GET accepted (R1a/R1b); `localhost:5173`/`127.0.0.1:8080` origins accepted on GraphQL and `/mcp/gateway` (R2); HTML/SVG/PDF user files with no CSP or nosniff (R3).
- Measured in Electron 42.11.16: a `file://` page sends no Origin on fetch and `file://` on WS (R4). A browser-session `onBeforeSendHeaders` rewrite yields `Origin: null` on POST, GET and WS. A PDF renders unchanged under `CSP: sandbox allow-scripts` (A1).

## Open risks for review

- RSK-001/RSK-002: setups that use a public DNS name the node cannot learn, or a localhost tool, need a setting. Mitigated by the logged hint, docs and release note.
- ASM-001: `.lan` and dotless names are treated as unforgeable through public DNS, consistent with the pairing classification.
- The browser probes (~38) each need their frontend origin (D7); a missed one fails loudly.

## Expected next action

Independent architecture review of `design-spec.md` against the approved requirements. On Pass, the reviewer's own route to implementation applies. Findings on requirements or design come back to the Solution Designer.

## Route record

- 2026-11-07: sent to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_8982c6eccaa0444a929176b2fd422e47`), delivered.

## Round 2 (SR-003): response to ARCH-REV-001

- AR-001 resolved. D6 decides on the requesting frame's origin (`details.frame.origin === 'file://'`), on an `Origin: file://` header, or on a non-GET/HEAD request without Origin. The last case covers requests whose frame is gone, such as `sendBeacon` and `keepalive` on `pagehide`.
- AR-002 resolved. GET/HEAD navigations (`mainFrame`/`subFrame`) are never changed. A form-POST navigation from a `file://` page gets `Origin: null`.
- Measured on Electron 42.11.16:
  - `evidence/SR-003-d6-file-origin-forms.json`: every request form from a `file://` document arrives as `Origin: null`; GET navigations are unchanged.
  - `evidence/SR-003-d6-http-page-control.json`: an http page's requests are untouched, and every POST carries its own Origin.
- Entry-Form Table, DS-003, examples, interface (`isFileDocumentRequest`, new file `browser-file-document-request.ts`), test plan (step 6) and guidance revised.
- Non-blocking recommendations adopted: R-3 (normalize stored hosts in `isPairedPhoneHost`), R-4 (exclusion note for `application-backends.ts`), R-5 (bounded, escaped log for an unparseable Host).
- Design case added: `docs/design-cases.md` Case 2 (autobyteus-416).
- Requirements are unchanged; the SR-001 user approval applies.
- 2026-11-07: re-review requested from `/software_engineering_team/architecture_reviewer`.
- 2026-11-07: SR-003 re-review sent to `/software_engineering_team/architecture_reviewer` (run `architecture_reviewer_8982c6eccaa0444a929176b2fd422e47`), delivered.
- 2026-11-07: ARCH-REV-002 (round 2) **Pass** on SR-001/SR-003 (Large / High); AR-001 and AR-002 resolved, the reviewer reproduced SR-003 evidence. Non-blocking residual risks R-7 (GET subresources from `file://` documents also get `Origin: null`) and R-8 (rule (c) premise; frame presence for beacon/keepalive varies between runs) are in `design-review-report.md`. The reviewer routed to `/software_engineering_team/implementation_engineer`. Informational; no Solution Designer action.
