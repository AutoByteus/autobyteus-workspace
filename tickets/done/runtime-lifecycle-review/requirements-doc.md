# Requirements Document — Agent Runtimes page

## Document Status

- Status: **Approved** (SR-010; SR-007 basis plus the user's SR-010 changes UD-007/UD-008)
- Current solution revision ID: SR-012
- Package identifier: `runtime-lifecycle-review` (continues predecessor `runtime-lifecycle-usability`)
- Request / ticket: Project Task "Runtime lifecycle usability … the Solution Designer of a NEW team reviews the existing design independently, then continues"
- Requested by: `/project_task_manager` (run `project_task_manager_7c8dce0c4a8b44f88e776a83809dee03`) on the user's behalf
- Requirements owner: Solution Designer (new software engineering team)
- Date: 2026-10-20
- Approved by and reference: **User**, 2026-10-20 (SR-007), and the user's SR-010 changes UD-007/UD-008 in the Solution Designer conversation. UD-005 (installation by users; the page shows how/where to install; sign-in from the app where possible) and UD-006 ("for anthropic … we don't offer sign in … we just give user hints that you're sign in by themselves … we have to abide their rules … if we use the strategies, I think it's really easy to implement"). D-2 Codex and D-3 were not answered separately; taken as the presented recommendations (Codex offered as a local open-source app within OpenAI's stated allowance, consistent with the user's "abide their rules"; remote status only), and the user was told so and can reverse them.
- Exact approved requirements baseline: this document at SR-010 with the approved UI/UX spec (revision a74ecd4) and the UI note (SR-010).
- Behavior-defining supplement: **Product UI/UX specification, Approved by the user** ("yes approved", 2026-10-20, in the Product UI/UX Designer conversation): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/runtime-lifecycle-review/ui-ux-spec.md`, final references VIS-001…VIS-023 in `…/visual-references/`, design revision `a74ecd4` (integrated `43d2d7d` on the design repo's `personal`). The UI approval does not settle D-1…D-4; the user sent those to the Solution Designer.

## User Direction

- **UD-001** (2026-10-20): users normally install the runtimes themselves; AutoByteus shows when a new version exists and lets them update; unsure AutoByteus should download runtimes.
- **UD-002** (2026-10-20): different check strategies per runtime are fine (→ DEC-002).
- **UD-003** (2026-10-20, via Product): wants the **full** sign-in feature — detect, and when not signed in, a Sign in button — because users forget to go to the terminal; a status-only first version is acceptable if sign-in is not feasible. Installing stays in the terminal. Name the section **"Agent Runtimes"**. Antigravity: "I first run agy, then Enter, then I can log in".
- **UD-004** (2026-10-20): approved the UI; questions 1–3 to be settled with the Solution Designer.
- **UD-005** (2026-10-20): installation is done by users; the page shows not installed and how/where to install; sign-in from the app where we can help; per-runtime strategies for sign-in and update checks.
- **UD-006** (2026-10-20): no Claude sign-in button because of Anthropic's policy; show a hint that users sign in themselves; abide vendor rules.
- **UD-007** (2026-10-20, answering ARCH-REV-001 AR-003): keep how AutoByteus finds runtimes as today — "After user installed it, then we just tell the user restart the application … in the message … After you install it, and then please restart the application … We don't have to do anything there." (option (b); REQ-009 not adopted).
- **UD-008** (2026-10-20): no in-app sign-in for Antigravity — the user signs in from the command line ("i meant for antigravity").

## Problem And Desired Outcome

- Problem: AutoByteus runs Codex, Claude, Antigravity and Grok from the copies the user installed, but shows nothing about them except an "Unavailable" reason in the chat model menu. Users don't see versions, don't learn about updates, and forget to sign in from a terminal.
- Desired outcome: Settings → Agent Runtimes shows each runtime's installed version, update state and sign-in state for the current node; the user can update a runtime and sign in to it from AutoByteus where the vendor allows; a missing runtime points to the vendor's install instructions.
- Observable success: on the desktop's own node, with one runtime behind and one signed out, the user reaches "Up to date" and "Signed in" from this page without typing a command (except the runtimes D-2 leaves on the command line).

## Relevant Current And Desired Behavior

| ID | Kind | Scenarios | Current (evidence) | Desired | Preserved |
| --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-005 | No page; model menu "Unavailable" + reason (E-R12) | Agent Runtimes page lists the four runtimes for the current node with installed state and version | Runtime detection and execution as today; selected-runtime readiness (b5715ea5ba) |
| BEH-002 | User | SCN-001 | No version information | Independent per-runtime update check on open and on Check again, from each vendor's own source | Checking changes nothing installed |
| BEH-003 | User | SCN-002 | Update only in a terminal or by vendor auto-update | Update runs the vendor's own update command; blocked while that runtime has running agents | Running agents not interrupted; the user's install untouched except by the vendor's updater |
| BEH-004 | User | SCN-001 | Missing runtime only "Unavailable" | "Not installed" + link to the vendor's official install page + hint "After installing, restart AutoByteus." | AutoByteus does not install runtimes (D-1); runtime lookup unchanged (UD-007) |
| BEH-005 | User / Contract | SCN-003 | Sign-in only in a terminal; detection exists for Codex, Claude, Antigravity; Grok "unsupported" (E-R21) | Signed in / Not signed in / Sign-in unknown for all four; Sign in from the page for Codex and Grok; Claude and Antigravity show the command-line hint | No credentials read, copied or stored by AutoByteus; no billing switch |
| BEH-006 | Operational | SCN-005 | Remote/Docker nodes carry their own runtimes | Remote node window shows status only (D-3) | Docker image contents |

## Scope Guardrail

### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | See each runtime's installed state, version, update state and sign-in state for the current node | SCN-001, SCN-005 |
| UC-002 | Update a runtime from the page | SCN-002 |
| UC-003 | Sign in to Codex or Grok from the page | SCN-003 |

### Out Of Scope
Installing runtimes (D-1); changing how AutoByteus finds runtime executables (UD-007); in-app sign-in for Claude and Antigravity (UD-006, UD-008); Update and Sign in on remote/Docker nodes (D-3); a Claude Sign in button until Anthropic approves (D-2); automatic updates by AutoByteus; notifications outside the page; changing the chat model menu's labels or runtime names ("Claude SDK", "Grok Build"); API-key sign-in; changes to how the four runtimes execute agents; Windows-specific behavior beyond what the vendors' own commands do; the predecessor's machinery (version catalogue, crash fences, private channel).

### Non-Goals
Guaranteeing an update or sign-in succeeds when the vendor's own command fails (the vendor's error is shown); detecting expired sessions before the runtime itself reports them.

### Preserved Behavior Boundary
BEH-001…006 "Preserved" column; the existing Workspace terminal; existing Settings sections; model menu behavior.

### Prerequisites
None.

### Review Authority
Findings that add behavior, policy or a new contract are Requirement Gaps for the user; the approved UI/UX spec governs visible detail.

## Requirements

| ID | Requirement | Behavior | Priority |
| --- | --- | --- | --- |
| REQ-001 | Settings → **Agent Runtimes** (menu item after API Keys, route `section=agent-runtimes`) lists Codex, Claude, Antigravity and Grok for the current node with installed state and installed version, as the approved UI shows | BEH-001, BEH-006 | Must |
| REQ-002 | On opening the page and on Check again, each installed runtime is checked for a newer version independently, from its vendor's source (DEC-002), showing Checking for updates… / Up to date / Update available (version X) / Check failed; a failed check keeps the installed version and does not affect use; checking changes nothing | BEH-002 | Must |
| REQ-003 | Update (desktop's own node) runs the runtime's own update command, shows progress with the command and step, then "Updated from X to Y." and re-checks; on failure shows the vendor's message and Try again; disabled with a visible reason while that runtime has running agents | BEH-003 | Must |
| REQ-004 | A runtime that is not installed shows "Not installed", "Install instructions" linking to the vendor's official page (DEC-004), and the hint "After installing, restart AutoByteus."; no install action | BEH-004 | Must |
| REQ-005 | Account shows Signed in / Not signed in from the runtime's own report (DEC-005), or Sign-in unknown when the report cannot be obtained | BEH-005 | Must |
| REQ-006 | Sign in (desktop's own node) for **Codex and Grok**: start the runtime's own login, "Finish signing in to <Runtime> in your browser.", Cancel, time-out → "Sign-in didn't finish. Try again.", success → Signed in. **Claude and Antigravity** show "Sign in from its command line." with no button | BEH-005 | Must |
| REQ-007 | A remote/Docker node window shows the same status with no Update and no Sign in, and the note "Status only. Update these runtimes on that node's computer." | BEH-006 | Must |
| ~~REQ-009~~ (not adopted, UD-007) | Option (a): AutoByteus finds a runtime in its vendor's default install folder (`~/.local/bin` for Claude, Codex, Antigravity; `~/.grok/bin` for Grok) when it is not on AutoByteus's PATH — for this page, agent runs and the chat model menu alike; PATH and the existing env settings keep priority. **Option (b):** detection and execution stay as today; the page shows what today's lookup finds, so a runtime installed while AutoByteus runs may need an AutoByteus restart to appear | BEH-001, BEH-004 | Must (one option) |
| REQ-008 | AutoByteus never reads, copies, stores or logs runtime credentials, sign-in URLs' secrets or codes; it only asks the runtime for its state and starts its own commands | BEH-005 | Must |

## Acceptance Criteria

| ID | REQ | Trigger | Expected | Alternate / failure | Verification |
| --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | Open Settings → Agent Runtimes on the desktop | Four rows, installed versions shown, layout and copy as VIS-001/VIS-002 | Node unreadable → "Couldn't read the agent runtimes on this node." + Retry (VIS-018) | Real desktop app, user's check |
| AC-002 | REQ-002 | Open the page with one runtime behind | Rows show Checking for updates… and resolve independently; the behind one shows Update available (version X); Check again repeats and shows "Checked just now" | One source unreachable → that row "Check failed" + "<Runtime> still works.", version kept, others unaffected (VIS-014/016) | API/E2E with controlled sources + real check on the user's Mac |
| AC-003 | REQ-003 | Click Update on a runtime with an update | Updating… with `<runtime> update · <step>`; then installed version changes, "Updated from X to Y.", re-check → Up to date | Vendor command fails → "Update failed. Version X is unchanged." + vendor message + Try again (VIS-006) | Controlled updater in tests; one real update with the user's consent |
| AC-004 | REQ-003 | A runtime has N running agents | Update disabled with "Update unavailable while N agents are running."; enabled when they finish | — | Tests with real agent-run counts |
| AC-005 | REQ-004 | A runtime is not installed | "Not installed", "Install instructions ↗" opens the vendor's page (DEC-004), the hint "After installing, restart AutoByteus.", Account "–", no button; after installing and restarting AutoByteus, the row shows it installed | — | Isolated test environment without the runtime |
| AC-006 | REQ-005 | Page opens | Each installed runtime's Account shows Signed in or Not signed in matching the runtime's own report (Codex account read, Claude `auth status --json`, Grok `grok models`, Antigravity `agy models`) | Report unobtainable → Sign-in unknown | Isolated signed-out homes in tests; the user's own Mac for signed-in (his check) |
| AC-007 | REQ-006 | Click Sign in on a browser-route runtime that is signed out | Button "Signing in…", line "Finish signing in to <Runtime> in your browser." + Cancel; the vendor's sign-in page opens in the browser; after the user finishes, row shows Signed in | Cancel → back to Sign in; no completion within the time-out → "Sign-in didn't finish. Try again." | Tests up to the browser hand-off with no account; completion by the user with his own account (his consent) |
| ~~AC-008~~ | — | Removed (UD-008): no in-app Antigravity sign-in | — | — | — |
| AC-009 | REQ-006 | Claude or Antigravity is signed out | "Not signed in" + "Sign in from its command line.", no button (VIS-013) | — | Tests |
| AC-010 | REQ-007 | Open the page in a remote/Docker node window | Same rows and statuses; no Update, no Sign in; status-only note (VIS-019) | — | Remote-node test |
| AC-011 | REQ-008 | Any check, update or sign-in | No credential, token, sign-in URL secret or code appears in AutoByteus logs, storage or API responses | — | Log and response inspection in tests |

## Relevant Scenarios And Journeys

| ID | Actor / trigger | Steps | Outcome | Validity / evidence |
| --- | --- | --- | --- | --- |
| SCN-001 | User opens Settings → Agent Runtimes | page loads, checks run per runtime | sees versions, update and sign-in states | Supported Normal; UXJ-001/002/006, VIS-001–003 |
| SCN-002 | User clicks Update | vendor updater runs | new version, re-checked | Supported Normal; UXJ-003/004/005 |
| SCN-003 | User clicks Sign in (browser route) | runtime's own login opens the browser; user signs in | Signed in | Supported Normal; UXJ-007/008; E-R21 |
| ~~SCN-004~~ | Removed (UD-008) | — | — | — |
| SCN-005 | User in a remote/Docker node window | opens the page | status only | Supported Normal; UXJ-010 |

## UI, Interaction, And Experience Requirements

- Applicable: Yes. Normative: the approved `ui-ux-spec.md` and VIS-001…VIS-023 (design repo `/Users/normy/autobyteus_org/autobyteus-web-design`, ticket `tickets/done/runtime-lifecycle-review/`, revision `a74ecd4`, source pin `2f211340ee36`). Runnable reference: design repo root, `corepack pnpm dev --port 4701`, `/settings?section=agent-runtimes`; runbook `ui-reference-runbook.md`.
- Illustrative (not normative): version numbers, node names, agent counts, vendor error text, terminal text, install URLs (replaced by DEC-004).
- User confirmation: "yes approved", 2026-10-20 (spec "Status And User Confirmation").

## Quality

| ID | REQ / AC | Area | Constraint |
| --- | --- | --- | --- |
| QR-001 | REQ-008 / AC-011 | Security/Privacy | No credentials or sign-in secrets handled or logged |
| QR-002 | REQ-002 / AC-002 | Reliability | One runtime's failing check or slow source never blocks the others or the runtime's use |
| QR-003 | REQ-003, REQ-006 | Reliability | Every started vendor process ends: on success, failure, Cancel/Close, time-out or leaving the app |

## Data Continuity And Acceptable Loss

- Persisted data affected: No new AutoByteus data. Runtime installs and credentials belong to the vendors and are changed only by their own update/login commands the user starts.

## External Contracts And Dependencies

| Dependency | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| Vendor latest-version sources | DEC-002 | E-R20 | Claude and Antigravity sources are undocumented (R-02) |
| Vendor update commands | `claude update`, `codex update`, `grok update`, `agy update` | E-R08 | Package-manager installs (Homebrew/WinGet) may not update this way; the vendor's message is shown |
| Vendor login | E-R21 | E-R21 | Login processes wait indefinitely → time-out required |
| Vendor terms | D-2 | E-R09, E-R21 | Anthropic approval; OpenAI open-source condition; Google position unclear (FU-001) |

## Decisions

| ID | Question | Reasoning | Recommendation | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| D-1 (Q-1) | Does AutoByteus install runtimes? | User said install stays in the terminal (UD-003, UD-005) | No install; "Not installed" + vendor link | User | Decided: no install (UD-005) |
| D-2 (Q-2) | Which runtimes get an in-app Sign in button? | Codex: allowed for "a local or open-source application", never commercial/hosted; AutoByteus is AGPL and also commercially licensed. Claude: Anthropic forbids offering claude.ai login without prior approval. Grok: no restriction found. Antigravity: no login command; terminal route needs new work; Google's position unclear (FU-001) | Codex (accepting OpenAI's condition), Grok, Antigravity (terminal); Claude command line until Anthropic approves | User | Decided: Codex and Grok buttons; Claude (UD-006) and Antigravity (UD-008) command-line hint only |
| D-3 (Q-3) | Update and Sign in on remote/Docker nodes? | Containers lose updates on rebuild; remote sign-in needs codes | Desktop's own node only; remote status only | User | Decided as recommended (user informed) |
| D-4 | Ship everything in one ticket, or status + update first and sign-in second? | User wants the full feature; it is feasible; one beta to check is simpler for him. The Antigravity terminal is the only new kind of work | One ticket, one beta | User | Decided: one ticket (UD-003 full feature; user informed) |
| DEC-001 | How updates run | UD-001 | The vendor's own update command | Solution Designer | Decided |
| DEC-002 | Latest-version source per runtime | UD-002, E-R20 | Claude `downloads.claude.ai/claude-code-releases/<channel>` (the user's Claude update channel, default latest); Codex GitHub `releases/latest`; Grok `grok update --check --json`; Antigravity the updater manifest for the OS/CPU; each fails alone | Solution Designer | Decided |
| DEC-003 | Update while agents run | Avoid interrupting work | Blocked with visible reason | Solution Designer | Decided |
| DEC-004 | Install-instruction links | Verified official pages 2026-10-20 | Claude `https://code.claude.com/docs/en/setup`; Codex `https://learn.chatgpt.com/docs/codex/cli`; Antigravity `https://antigravity.google/docs/getting-started?tab=cli`; Grok `https://docs.x.ai/build/overview` | Solution Designer | Decided |
| DEC-005 | Sign-in detection per runtime | E-R21 | Codex app-server `account/read`; Claude `auth status --json`; Grok `grok models` ("You are not authenticated."); Antigravity `agy models` ("Please sign in") | Solution Designer | Decided |
| DEC-006 | Runtime names on the page vs model menu ("Claude SDK", "Grok Build") | UI spec puts menu changes out of scope; plain names are what users know | Page keeps Codex / Claude / Antigravity / Grok; model menu unchanged in this ticket | Solution Designer | Decided |
| DEC-008 | Codex set up with a custom model provider that needs no OpenAI sign-in | Neither "Signed in" nor "Not signed in" is true; rare edge case | Account shows "–" and no Sign in button | Solution Designer (user informed) | Decided |
| DEC-007 | Sign-in time-out | Vendor logins wait indefinitely | 10 minutes, then "Sign-in didn't finish. Try again." | Solution Designer | Decided |

## Traceability

| REQ | UC | BEH | AC | SCN | UI |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001, BEH-006 | AC-001 | SCN-001 | VIS-001/002/017/018 |
| REQ-002 | UC-001 | BEH-002 | AC-002 | SCN-001 | VIS-003/014/015/016 |
| REQ-003 | UC-002 | BEH-003 | AC-003, AC-004 | SCN-002 | VIS-004–007 |
| REQ-004 | UC-001 | BEH-004 | AC-005 | SCN-001 | VIS-001/014 |
| REQ-005 | UC-001 | BEH-005 | AC-006 | SCN-001 | VIS-001/013/019 |
| REQ-006 | UC-003 | BEH-005 | AC-007, AC-009 | SCN-003 | VIS-008, VIS-009, VIS-013 |
| REQ-007 | UC-001 | BEH-006 | AC-010 | SCN-005 | VIS-019 |
| REQ-008 | UC-003 | BEH-005 | AC-011 | SCN-003 | — |

## Architecture Phase Input

- Verify: running-agent count per runtime; Claude update channel lookup; Grok signed-in output (observed with the user's consent or a test account).

## Readiness Check

- Content ready for approval: Yes.
- Approval recorded: Yes (SR-007 and SR-010, user).
- Approved requirements package ready for architecture design: Yes.

## UI note (SR-010)
The approved UI/UX spec (a74ecd4) stays normative with two user-directed differences recorded here: (1) the Not installed row adds the line "After installing, restart AutoByteus." under "Install instructions" (same grey note style as "Couldn't reach the update source…"; zh-CN: 安装后请重启 AutoByteus。); (2) Antigravity uses the command-line state (VIS-013 treatment) instead of the terminal journey UXJ-009 — VIS-010/011/012/021/023 no longer apply.

(3) Added SR-012 (Solution Designer decision, CR-003, user informed): the table/stacked switch follows the width of the runtime list itself (table when the list is at least ~58 rem wide, stacked otherwise), not the 640 px window width. Reason: the spec also requires no horizontal overflow, and beside the Settings menu the five-column table does not fit until the window is about 1250 px wide (API/E2E measurement ARP-02: the table starts at a 1252 px window, list 58.1 rem); at 739 px the literal rule overlapped the columns (code-review evidence IMP-10a), the switch shows the approved stacked layout instead (IMP-10b). The spec's reference sizes are unchanged: table at 1440 and 1280 px, stacked at 390 px. Windows roughly 640–1250 px wide now show the stacked layout.
