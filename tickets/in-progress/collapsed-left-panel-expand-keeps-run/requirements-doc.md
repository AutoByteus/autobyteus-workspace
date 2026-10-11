# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003` (reinstated unchanged at SR-006)
- Package identifier: `collapsed-left-panel-expand-keeps-run`
- Request / ticket: Project Task `project_task_b2b0538a-4613-457a-81ed-6c9e9949da77` — "Collapsed left panel: let the user expand it again without leaving the run they're on"
- Requirements owner: Solution Designer (`/software_engineering_team/solution_designer`)
- Date: 2026-10-08
- Approval state and reference: `Approved` by the user, 2026-10-08, in the Solution Designer conversation. The user asked for my recommendations on DEC-003/004/005 and replied: "Like your suggestion. Let's do it." Cancelled by the user on 2026-10-09, then reopened and reaffirmed on 2026-10-10: "I still like the solution for the tree button. When I click the collapse, it should collapse. And then there is a tree button so I could click again to open the [workspaces] tree itself. The chat button is just for the chat page; if I want a new chat, I just click new chat." (SR-006)
- Exact approved requirements baseline / solution revision: this document at SR-003 (= SR-002 content + DEC-005 resolved as recommended; DEC-003/DEC-004 confirmed out of scope)
- Behavior-defining supplements and their approved versions: Product UI/UX spec `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md`. Status `Approved` by the user in Product review, 2026-10-08, and included in this requirements approval. Design repo revision `6478eec` (validated), integrated at `744152a`/`7a8e634`. It was removed from `personal` at `8740ada` during the 2026-10-09 cancellation and restored unchanged on 2026-10-10 at `6fdf576` (a revert of `8740ada`; spec, VIS-001..008 and UI-reference code are byte-identical to `7a8e634`) (SR-006).

## Problem And Desired Outcome

- Problem:
  - When the left panel is collapsed to its icon strip on a wide window, every strip icon both expands the panel **and** navigates to that icon's page.
  - The obvious way back is the Chat icon. It is highlighted while a run is open in the chat view, yet clicking it goes to New chat (Daily Assistant), so the run the user just opened from a Task card is replaced.
  - Root cause, agreed with the user in Product review:
    - The strip has no place for the Workspaces tree, where the open run lives.
    - Chat is lit on any `/chat` route, including an open run, but Chat means "New chat".
    - Team and Org runs (`/workspace`) light no strip icon.
- Affected actors or systems: Desktop (and desktop-capability browser) users who keep the left panel collapsed.
- Desired outcome:
  - The collapsed strip has a **Workspaces** icon that shows where the user is (lit while a run is open). It opens the panel on the open run without navigating.
  - Chat is lit only on New chat.
  - When the panel appears, the open run is selected, its ancestors are expanded, and it is scrolled into view.
- Observable definition of success: With the panel collapsed, the user opens a run from a Task card, clicks Workspaces, and sees the same run still open in the center. That run is highlighted and visible in the Workspaces tree, and nothing else is opened. The user verifies this in the desktop app.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | SCN-001, SCN-004 | Wide window, user-collapsed panel: any strip icon expands the panel and navigates; Chat goes to bare `/chat` (New chat). Nothing expands without navigating. | A strip Workspaces icon shows the panel with no navigation. Page icons keep their current behavior (DEC-002 a). | Each page icon still docks the panel and goes to its page. | investigation-notes BEH-001 |
| BEH-002 | User | SCN-005 | Narrow/short window: strip icons open the transient drawer, no navigation. | Workspaces also opens the drawer there, with the open run revealed (REQ-003). | Drawer mechanics (Escape/backdrop, focus trap). | BEH-002 |
| BEH-003 | User | — | Collapse control on the docked panel's first row collapses it. | Unchanged click behavior; after collapsing, focus moves to the strip's Workspaces icon. | Collapse button placement/behavior. | BEH-003 |
| BEH-004 | System | SCN-001..SCN-005 | On panel (re)mount the tree expands the selected subject's ancestry for agent / team / org. It never scrolls. A member inside a nested sub-team stays hidden (U-002, confirmed in the Product UI reference). | The open run's row is selected, all its ancestors are expanded (including nested sub-team rows), and the row is scrolled into view, for every run kind in REQ-003. | Which row counts as selected is unchanged. | BEH-004; Product UXJ-002 |
| BEH-005 | User | SCN-001..SCN-003 | Task card worker links open the worker in the center (agent host / team host / org host). | Unchanged; that worker is the row revealed after Workspaces. | Unchanged, including the right Projects tab staying selected. | BEH-005 |
| BEH-007 | User | — | Docked panel Chat row / pencil always opens a fresh New chat. | Click behavior unchanged. | Unchanged. | BEH-007 |
| BEH-008 | User | SCN-001, SCN-006 | The Chat strip icon and docked Chat row are highlighted on any `/chat` path, including `/chat?id=<run>`. On `/workspace` (Team/Org runs) no strip icon is lit. | Chat is lit only on New chat (`/chat` with no run id), in the strip and the docked Chat row. Workspaces is lit while a run is open. | Highlight of other page icons (Agents, Projects, …) on their pages. | `useShellPrimaryNavigation.ts` `isShellPrimaryRouteActive`; Product root-cause finding |

## Stakeholders, Actors, And Outcomes

| Actor / Stakeholder | Goal Or Responsibility | Required Outcome | Important Constraint |
| --- | --- | --- | --- |
| Desktop user with collapsed left panel | See where the open run sits (team/member, siblings, status) | Open the panel on the run without losing it; the run visible and highlighted | No navigation side effects |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

| Use-Case ID | Use Case | Related Scenario IDs |
| --- | --- | --- |
| UC-001 | Open the collapsed left panel on the open run without changing the open page/run | SCN-001, SCN-005 |
| UC-002 | On opening, see the open run selected, its ancestors expanded and scrolled into view | SCN-001, SCN-002, SCN-003, SCN-005 |
| UC-003 | See from the strip where you are: Workspaces when a run is open, Chat only on New chat | SCN-001, SCN-006 |

### Out Of Scope

- What clicking the docked panel's Chat row, its pencil, or a strip page icon does.
- The right-side strip/panel.
- The `/mobile` phone/PWA shell.
- Keeping the user's other manual tree expansions across collapse → expand (DEC-003).
- Auto-scrolling the tree when a run opens while the panel is already docked (DEC-004).
- Auto-opening the left panel when a run is opened from a Task card. The user considered this and chose the Workspaces icon instead.
- A keyboard shortcut for expand/collapse.
- A separate expand/collapse toggle in the strip (round-1 design, rejected by the user).

### Non-Goals

- No redesign of the strip's other icons, their order or their tooltips.

### Preserved Behavior Boundary

BEH-002 (drawer mechanics), BEH-003 (click), BEH-005, BEH-007; REQ-007; AC-006, AC-007. Cross-cutting invariant: activating Workspaces never changes the route, the selected run, the center pane, an open draft or the right panel/tab.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, compatibility promise, or operational contract is a `Requirement Gap`; it requires explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It is not a required design correction.
- A downstream reviewer comment does not amend this requirements basis.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority / Criticality | Rationale | Source / Decision Reference |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The collapsed left strip shows a **Workspaces** icon after the page icons, separated from them by a light divider. Visual details per the UI/UX spec (Phosphor `ph:tree-view` glyph, standard strip button, 24 × 1 px `gray-100` divider). The tooltip and accessible name are "Workspaces" (en) / "工作区" (zh-CN). It is keyboard focusable and activated by Enter/Space. It is present in both strip modes (wide-window collapsed, and narrow/short window). There is no separate expand toggle in the strip. | BEH-001, BEH-002 | Must | Gives the open run a place in the strip; opening the panel is separate from navigation | DEC-001 = D (user-confirmed, Product review 2026-10-08) |
| REQ-002 | Activating Workspaces shows the left panel: docked when the window has room (the user's collapsed case), otherwise the transient drawer. Nothing else changes: no route change, and no change to the selected run, the center pane, an open draft or the right panel/tab. | BEH-001, BEH-002 | Must | Expanding and navigating are different intents | Task text; UI/UX spec TR-001..TR-003 |
| REQ-003 | When the left panel appears (Workspaces docking, or drawer open) while a run is open in the center, the Workspaces tree selects that run's row. It expands every ancestor group: workspace, agent/team/org definition group, team run, nested sub-team rows, and the Agent-run task Team. If the row is not fully visible, the tree scrolls once, instantly, to centre it; a row already in view does not move. This covers: a standalone agent run; a task Agent or task Team coordinator under a standalone Agent run (Agent-host Task card); a Team run's member, including one inside a nested sub-team (Team-host Task card, Team tab); and an Org run's member (Org-host Task card). The reveal applies once the run's rows have loaded after the panel appears. A user wheel, press or key in the tree before then cancels it. | BEH-004 | Must | User wants to see which team/member, its siblings and its status | Task text; UI/UX spec Reveal rules |
| REQ-004 | Revealing the open run does not open, select or close anything else: other expanded groups stay expanded and no other run is opened. | BEH-004 | Must | "Nothing else opened instead" | Task text |
| REQ-005 | REQ-003 applies to whatever run is open when the panel appears, however it was opened while collapsed: Task card in the right-panel Projects tab, Task worker links on the Projects pages, a member click in the right-panel Team tab, a New chat's first send, or any other in-app open. | BEH-004, BEH-005 | Must | "Check the same flow for the other entry points" | Task text |
| REQ-006 | When no run is open (e.g. New chat, Agents page, Settings), Workspaces just shows the panel; nothing new is selected, and an open draft and its text are kept. | BEH-001 | Must | No invented selection | UI/UX spec TR-003, UXJ-006 |
| REQ-007 | Strip page icons keep their current click behavior: dock the panel and go to their page (DEC-002 a). The docked panel's collapse control, Chat row and pencil keep their click behavior. Highlight changes only as in REQ-008. | BEH-001, BEH-003, BEH-007 | Must | Documented contracts (`workspace_layout.md`, `chat.md`) | DEC-002 = a (user-confirmed design) |
| REQ-008 | Highlight rule. The strip's Workspaces icon is lit (`bg-gray-100 text-gray-900`, `aria-current="location"`) whenever a run is actually open in the center: a standalone Agent run view (`/chat?id=…`) or a Team/Org run view on `/workspace` that shows a run. It is not lit on a `/workspace` page that shows no run, such as the Org launch page (`mode=configuration`) or an empty workspace view (DEC-005). The strip's Chat icon and the docked Chat row are lit only on New chat (`/chat` with no run id). On other pages, their own icon is lit as today, and Workspaces is not. | BEH-008 | Must | "The lit icon is where you are"; removes the Chat trap | UI/UX spec Key UX decision 2 |
| REQ-009 | Focus movement: collapsing with the docked collapse control moves focus to the strip's Workspaces icon. Activating Workspaces so that the panel docks moves focus onto the revealed row (to the Workspaces section when no run is open). Closing the drawer (Escape/backdrop) returns focus to Workspaces. | BEH-002, BEH-003 | Should | Keyboard continuity | UI/UX spec Accessibility |
| REQ-010 | On windows 481–540 px tall (where the strip still shows), the divider is hidden and the strip's icon gap is 4 px, so Settings stays visible. | BEH-001 | Should | Strip fits short windows | UI/UX spec VIS-008 |

## Acceptance Criteria

| Acceptance-Criteria ID | Related Requirement IDs | Related Behavior / Scenario IDs | Preconditions / Trigger | Observable Expected Outcome | Important Alternate Or Failure Outcome | Verification Intent |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001..REQ-003, REQ-008 | SCN-001 | Wide window, panel collapsed. The user opens the worker of an Agent-hosted Task from a Task card in the right Projects tab, then clicks Workspaces. | Before the click: Workspaces is lit and Chat is not. After it: the panel docks and the route is unchanged. The center still shows the same worker and the Projects tab is still selected. The worker row (under the host run / task Team) is selected and fully visible, with its ancestors expanded. | — | Browser probe (DOM/route assertions) + user verification in the desktop app |
| AC-002 | REQ-003, REQ-005 | SCN-002 | As AC-001, but the Task is Team-hosted: the worker is a team member, including one inside a nested sub-team. Also: a member opened from the right Team tab. | The team run is expanded down to the member's row, including the sub-team rows. The member row is selected and visible. The center is unchanged. | — | Browser probe |
| AC-003 | REQ-003, REQ-005 | SCN-003 | As AC-001, but Org-hosted | The Org run is expanded to the member. The member is selected and visible. The center is unchanged. | — | Browser probe |
| AC-004 | REQ-003 | SCN-003 | The open run's row is outside the visible tree area | After Workspaces, the tree has scrolled so the row is fully visible and roughly centred | Row already visible → no scroll. A user scroll before the rows load → no later jump. | Browser probe (row within the scroll container's bounds) |
| AC-005 | REQ-001..REQ-003, REQ-009 | SCN-005 | Narrow/short window with a run open; activate Workspaces | The drawer opens with the run revealed and visible. Route and center unchanged. Escape/backdrop returns focus to Workspaces. | — | Browser probe at a narrow viewport |
| AC-006 | REQ-007 | SCN-004 | Wide window, panel collapsed; click the Agents (or another page) strip icon | The panel docks and the Agents page opens (unchanged) | — | Unit test + probe |
| AC-007 | REQ-007, REQ-008 | — | Docked panel | The collapse control collapses the panel. The Chat row and pencil open New chat (unchanged). The Chat row is lit only on New chat. | — | Unit tests |
| AC-008 | REQ-004 | SCN-001 | After Workspaces with a run open | No other run is opened. Route/selection unchanged. Groups that were expanded stay expanded. | — | Probe |
| AC-009 | REQ-006 | SCN-006 | On New chat with typed text, or on the Agents page; panel collapsed; click Workspaces | The panel shows. Route, draft text and selection are unchanged. No run is newly selected. | — | Unit test + probe |
| AC-010 | REQ-001, REQ-010 | — | Strip rendered | Workspaces follows the page icons after the divider. Tooltip/accessible name "Workspaces"/"工作区". In tab order after Nodes; Enter/Space activate it. At 481–540 px tall the divider is hidden and Settings is visible. | — | Unit test + probe |
| AC-011 | REQ-008 | SCN-001, SCN-006 | Routes: `/chat?id=<run>`, `/workspace` with a Team or Org run, `/chat`, `/agents`, the Org launch page, `/workspace` with no run | Workspaces is lit (with `aria-current="location"`) on the first two and not on the others. Chat (strip and docked row) is lit only on `/chat`. On `/agents`, Agents is lit. | — | Unit test |
| AC-012 | REQ-009 | SCN-001 | Keyboard: collapse with the docked collapse control, then Enter on Workspaces | Focus is on Workspaces after collapse, then on the revealed row after docking | — | Probe |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor / Initiator / Governing Contract | Coherent Goal Or Governing Event | Supported Trigger / Entry Surface | Starting Condition | Product-Level Steps Or Event Sequence | Expected Outcome | Supported Alternate / Error Behavior | Scenario Validity | Independent Evidence / Decision Reference | Related Requirement / AC IDs |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | Desktop user | See the worker of an Agent-hosted Task in the tree | Right-panel Projects tab Task card worker link, then the strip Workspaces icon | Wide window, panel collapsed | 1. Open the worker from the card (Workspaces lights up). 2. Click Workspaces. | Same worker open; tree row selected, ancestors expanded, visible | — | Supported Normal Scenario | User report + screenshot; UXJ-001 | REQ-001..005, REQ-008, AC-001, AC-008, AC-011 |
| SCN-002 | User | Desktop user | Same for a Team-hosted Task worker or a Team-tab member (incl. nested sub-team) | Task card or right Team tab, then Workspaces | Wide window, panel collapsed | As SCN-001 | Member row selected/visible | — | Supported Normal Scenario | Task text; UXJ-002 | REQ-003, REQ-005, AC-002 |
| SCN-003 | User | Desktop user | Same for an Org-hosted Task worker, possibly far down the tree, keyboard | Task card, then Workspaces | As above | As SCN-001 | Org member selected, scrolled into view, focused | — | Supported Normal Scenario | `useTaskRootNavigation` Org path; UXJ-003 | REQ-003, REQ-005, REQ-009, AC-003, AC-004, AC-012 |
| SCN-004 | User | Desktop user | Go to another page from the collapsed strip | Strip page icon | Panel collapsed | Click the icon | Docks and navigates (unchanged) | — | Supported Normal Scenario | `workspace_layout.md`; UXJ-005 | REQ-007, AC-006 |
| SCN-005 | User | User on a narrow/short window | See the open run in the drawer | Strip Workspaces | Narrow window, run open | Click/Enter Workspaces | Drawer shows the run revealed | Escape/backdrop closes; focus returns to Workspaces | Supported Normal Scenario | BEH-002; UXJ-004 | REQ-001..003, REQ-009, AC-005 |
| SCN-006 | User | Desktop user | Open the panel from New chat or a page with no run | Strip Workspaces | Panel collapsed, no run open | Click Workspaces | Panel shows; Chat lit on New chat; draft kept; nothing selected | — | Supported Normal Scenario | UXJ-006 | REQ-006, REQ-008, AC-009, AC-011 |

## UI, Interaction, And Experience Requirements

- Applicable: `Yes`
- Linked UI/UX or interaction supplement: Product-owned `ui-ux-spec.md` (externally owned; linked, not copied)
- Linked runnable UI reference, separate design repository/root, UI/UX specification, and applicable support artifacts:
  - Design repository/root: `/Users/normy/autobyteus_org/autobyteus-web-design`, default branch `personal`
  - Runnable UI reference: `corepack pnpm install --ignore-workspace --frozen-lockfile && corepack pnpm dev --port 3210`, then `/chat?id=run-research-001`
  - Spec: `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md`
  - Ticket record: `.../tickets/done/collapsed-left-panel-expand-keeps-run/product-ticket.md`
  - Review evidence: `.../review-evidence/`
  - Baseline report: `/Users/normy/autobyteus_org/autobyteus-web-design/ui-baseline-report.md` (WEB-BASELINE-REFRESH-008)
- Product ticket record and folder (externally owned): `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/`
- Design repository revision or commit: validated `6478eec`; ticket closed at `744152a`; integration record `7a8e634` on `personal`. Source pin `origin/personal@1cd1a3abc126df820e334c023621d0fb82de5b7b`.
- UI/UX user-confirmation reference (2026-10-08, Product review):
  - "Okay, I think this design is okay. I think this design is okay with a separate icon. Do it, because this will solve our navigation problem."
  - Icon: "i am fine with the tree icon you chosed earlier ... the tree icon is good. I confirm by the way."
- Approved visual-reference baseline: `.../visual-references/VIS-001`..`VIS-008` (1440×900, 1440×620, 760×900, 1440×500).
- Normative visual and interaction details: every visible detail in VIS-001..VIS-008 and the spec's Implementation Fidelity Boundary:
  - placement, glyph, colors, spacing and the short-window rule
  - Workspaces/Chat highlight rules
  - no navigation on Workspaces
  - reveal (select, open ancestors incl. nested sub-teams, scroll only when needed, centred)
  - focus movement
  - strings
- Explicitly illustrative fixture content or permitted implementation variation, per the spec:
  - run/task/worker/team/org names, counts and conversation text
  - the exact scroll offset
  - the reveal wait limit (a short wait that tolerates normal tree loading)
  - the UI reference's route-based `isRunOpen`, its MutationObserver reveal wait and the `data-nav-key` focus-return mechanism. These are simulations, not production architecture.
- Required screens, states, transitions: UIS-001..003, UXJ-001..007, TR-001..006 in the spec.
- Explicitly unresolved product decisions: DEC-005 (below).

## Quality And Non-Functional Requirements

| Quality ID | Related Requirement / AC IDs | Area | Measurable Requirement Or Constraint | Conditions / Scope | Verification Intent |
| --- | --- | --- | --- | --- | --- |
| QR-001 | REQ-001, REQ-009, AC-010, AC-012 | Accessibility | Named control; in tab order; Enter/Space; `aria-current="location"` while lit; divider `aria-hidden`; focus movement per REQ-009 | Strip, panel, drawer | Unit test + probe |
| QR-002 | REQ-003, AC-004 | Other (responsiveness) | The selected row is revealed as soon as its rows load after the panel appears; the reveal is abandoned on user interaction or after a short wait | Panel appear | Probe |

## Data Continuity And Acceptable Loss

- Persisted or external data affected: `No`

## External Contracts And Dependencies

| Contract / Dependency | Required Behavior Or Constraint | Evidence / Authority | Uncertainty Or Risk |
| --- | --- | --- | --- |
| `autobyteus-web/docs/workspace_layout.md` | Strip page icons keep their navigation meaning; docs must describe Workspaces and the highlight rule | doc | Docs sync |
| `autobyteus-web/docs/chat.md` | Chat row = New chat on click; highlight now only on New chat | doc | Docs sync |
| Product UI/UX spec | Normative visual/interaction details | Product-owned, user-confirmed | — |

## Supplemental Artifacts

| Artifact Path | Purpose | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- |
| `evidence/user-collapsed-strip-run-open.png` | User's starting state | AC-001 | Final | Evidence only |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/collapsed-left-panel-expand-keeps-run/ui-ux-spec.md` (+ VIS-001..008) | Normative UI/UX | REQ-001..REQ-010 | Approved by user (Product review) | Behavior-defining; part of this approval basis |
| `product-design-request.md` | Product request record | — | Final | Record only |

## Assumptions

| Assumption ID | Assumption | Why It Is Necessary | Validation Plan / Owner | Status |
| --- | --- | --- | --- | --- |
| ASM-001 | The user's "data assistant" is the New chat page's Daily Assistant, reached via bare `/chat` | Explains the symptom | Code evidence | Accepted |

## Open Decisions And Questions

| Decision / Question ID | Question | Why It Matters | Options / Evidence | Decision Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-001 | How the user opens the collapsed panel on the open run | Core interaction | **D: Workspaces strip icon** (A/B/C superseded) | User | Decided (Product review 2026-10-08) |
| DEC-002 | What strip page icons do | Strip contract | **a: unchanged** | User | Decided (part of the confirmed design) |
| DEC-003 | Keep other manual tree expansions across collapse → expand | Adjacent | Out of scope (follow-up candidate) | User | Decided 2026-10-08: out of scope |
| DEC-004 | Auto-scroll when a run opens while the panel is docked | Adjacent | Out of scope (follow-up candidate) | User | Decided 2026-10-08: out of scope |
| DEC-005 | Is Workspaces lit on `/workspace` pages that show no run yet: the Org launch page (`mode=configuration`), or `/workspace` with nothing selected? | The spec's rule says "`/workspace`", but its intent is "whenever a run is open"; the two differ only on these pages | **Recommended:** lit only when a run is actually shown; not on the Org launch page or an empty `/workspace`. (The spec allows engineering to "use the selection state if equivalent".) | User | Decided 2026-10-08: lit only when a run is shown (recommended option) |

## Traceability

| Requirement ID | Use-Case IDs | Behavior IDs | Acceptance-Criteria IDs | Scenario IDs | Supplemental / Product Design Evidence |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001, BEH-002 | AC-001, AC-005, AC-010 | SCN-001, SCN-005 | VIS-001, VIS-002 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-001, AC-005, AC-009 | SCN-001, SCN-005, SCN-006 | VIS-003, VIS-007 |
| REQ-003 | UC-002 | BEH-004 | AC-001..AC-005 | SCN-001..SCN-003, SCN-005 | VIS-003..VIS-005 |
| REQ-004 | UC-002 | BEH-004 | AC-008 | SCN-001 | — |
| REQ-005 | UC-002 | BEH-004, BEH-005 | AC-002, AC-003 | SCN-002, SCN-003 | — |
| REQ-006 | UC-001 | BEH-001 | AC-009 | SCN-006 | VIS-006 |
| REQ-007 | UC-001 | BEH-001, BEH-003, BEH-007 | AC-006, AC-007 | SCN-004 | — |
| REQ-008 | UC-003 | BEH-008 | AC-001, AC-007, AC-011 | SCN-001, SCN-006 | VIS-001, VIS-006 |
| REQ-009 | UC-001 | BEH-002, BEH-003 | AC-005, AC-012 | SCN-003, SCN-005 | VIS-005 |
| REQ-010 | UC-001 | BEH-001 | AC-010 | — | VIS-008 |

## Architecture Phase Input

- Approved scenario IDs and paths: SCN-001..SCN-006.
- Constraints:
  - no route, selection, center, draft or right-panel change on Workspaces
  - page icons and Chat/pencil clicks unchanged
  - visual fidelity per the UI/UX spec
- Deferred to design:
  - production "run open" signal (route vs. selection state; must satisfy DEC-005)
  - where reveal + scroll lives
  - how the reveal waits for rows after mount
  - nested team-member ancestry on non-tree opens
  - the focus-return mechanism
- Technical facts to verify: U-001 (each root kind after redock in production); Team- and Org-hosted Task-card entries (not in the UI reference fixtures).
- Risks:
  - R-001: mount/load timing
  - R-002: existing probe D11 reopens via the strip Chat icon; it should use Workspaces
  - the existing Chat-highlight tests/probes that assume Chat is lit on `/chat?id=`

## Readiness Check

### Content Ready For Approval

- Relevant current behavior is evidence-backed: `Yes`
- Desired and preserved behavior are explicit: `Yes`
- Scope and non-goals are clear: `Yes`
- Requirements and acceptance criteria are testable and traceable: `Yes`
- Applicable scenarios are covered with validity and evidence: `Yes`
- Product design and supplemental evidence is integrated consistently: `Yes`
- Applicable UI/UX approval and final visual-reference basis are recorded: `Yes`
- Material assumptions and open decisions are visible: `Yes`
- Content ready for user approval: `Yes`
- Remaining content blocker: None

### Approved Basis Ready For Design

- User approval received: `Yes` (2026-10-08)
- Exact requirements and supplement approval basis recorded: `Yes`
- Approved requirements package ready for architecture design: `Yes`
- Remaining blocker: None
