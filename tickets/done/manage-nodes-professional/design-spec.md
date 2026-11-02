# Design Spec — manage-nodes-professional (autobyteus-363)

## Solution And Approval Basis

- Current solution revision ID: `SR-002`
- Approved requirements: [requirements-doc.md](requirements-doc.md) at SR-002. Requirements were approved by the Solution Designer within the direction (user informed, 2026-11-01). The look was approved by the user: "i approve. looks good now." (2026-11-02).
- Behavior-defining supplements:
  - `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md` with VIS-001…037 (design repository `personal` @ `88e0e322b6b638f29d3a666e72d64a849301a08a`).
  - The 268 spec and the 305 design stay normative for behavior, states and copy meaning.
- User approval of the design, when the direction requires it: `Not required` for this technical design. The Task requires the user's approval of the page's look, which is `Obtained` (the reference above).
- Design status: `Ready`
- Investigation notes: [investigation-notes.md](investigation-notes.md)
- Authorities read (2026-11-02, after the skill update): `references/architecture-design.md`, `references/design-principles.md` (incl. Principles 1 and 15 as updated), `templates/design-spec-template.md`, `DESIGN.md` (repository root, rules 1–11, incl. rule 11 "tests follow the code"). `GLOSSARY.md` checked for the words used. `design-examples.md` not used.
- Conflicts or discrepancies: none.

## Current-State Read

- The page's presentation lives in the following components (base `3b9dc912a1`):
  - `autobyteus-web/components/settings/nodes/`: `ThisNodeCard`, `NodeList`, `AddNodePanel`, `NodeRow`, `NodeServerUpdate`, `NodeConnectionDetails`, `NodeAddressHint`, `NodeChangeDialog`, `RemoteCollaborationIcon`;
  - `components/settings/RemoteCollaborationOfferDisclosure.vue` (267) and `RemoteCollaborationOfferList.vue`;
  - `components/settings/NodeManager.vue`.
- Behavior lives in the stores: `nodeListStore`, `nodeRowStatus`, `nodeServerUpdateStore`, `nodeChangeDialogStore`, plus `utils/nodeConnectionErrorText.ts` and the localization `nodesPage.ts`. The components read the stores and render.
- **The Product reference starts from exactly this source.** Every component the reference changes was byte-identical to the source at the reference's base `8a71c842` (checked with `cmp`, evidence E-1). The stores, `nodeConnectionErrorText.ts`, `RemoteCollaborationOfferList.vue` and both `nodesPage.ts` files are identical in the approved reference and the source (E-2). So the approved look is the reference diff `8a71c842..88e0e322` on `components/`, and nothing else.
- Nothing about ownership is broken. This is a presentation change inside the existing component owners.

## Task Size And Architectural Risk (Mandatory)

- Task size: `Medium`.
- Size rationale:
  - About 12 web component files: 9 changed, 3 added, 1 removed.
  - The tests and probes that observe them change too: 4 component specs, 1 spec replaced, and 2 browser probes' text expectations.
  - One docs section.
  - All within the existing Nodes components; there is no other subsystem.
- Architectural risk: `Low`.
- Risk rationale:
  - No API, store, server, Electron, persistence or localization change (AC-905).
  - No new owner.
  - Container queries are plain CSS, supported by the desktop app's Chromium and by current browsers.
  - The behavior is guarded by unchanged stores and by the existing tests and probes.
- Escalation trigger: if implementing the look needs a change to a store, the copy, a test ID that probes rely on (other than those listed here), or the confirmation dialog, stop and return a `Design Impact` to the Solution Designer.

## Architecture Investigation Evidence

| ID | Source / command | Observation | Decision supported |
| --- | --- | --- | --- |
| E-1 | `git show 8a71c842:<file> \| cmp - <source file>`, for the 11 Nodes components (design repo vs worktree) | All identical: the reference started from our source | The approved diff applies to the source as is |
| E-2 | `cmp` of the stores, `nodeConnectionErrorText.ts`, `RemoteCollaborationOfferList.vue`, `nodesPage.ts` (en, zh-CN) between the reference at `88e0e322` and the source | Identical | Presentation only; no copy change (DEC-903) |
| E-3 | `git diff --stat 8a71c842 88e0e322` (design repo) | 9 components changed; added `NodeCollaborationSwitch.vue`, `NodeNoticeIcon.vue`, `RemoteCollaborationOfferToggle.vue`; removed `RemoteCollaborationOfferDisclosure.vue`; `NodeManager.vue` `space-y-5 → space-y-6`; no prototype import in components (grep) | File mapping |
| E-4 | Same diff, `NodeList.vue`, `NodeRow.vue` | `<style scoped>`: `.nodes-card { container-type: inline-size }` and `@container (min-width: 38rem/64rem)` | The layout technique (the spec allows any equivalent) |
| E-5 | `grep -rln RemoteCollaborationOfferDisclosure` (worktree) | Used only by `NodeRow.vue` and its own spec `components/settings/__tests__/RemoteCollaborationOfferDisclosure.spec.ts` | Clean removal |
| E-6 | `grep "ⓘ\|⚠\|✗\|✓"` | The marks are asserted in `tests/e2e/remote-nodes-page-probe.mjs` (lines 269–286, 384–389, 393, 428, 451, 478–479, 488, 523, 576, 635) and `nodes-docker-address-probe.mjs`, and in the specs `NodeRow.spec.ts` and `AddNodePanel.spec.ts`. The dialog's marks (`• ✓ ✗ ○`, lines 282–286 and 635) are unchanged, because `NodeChangeDialog.vue` is not in the diff | Test updates (DESIGN.md rule 11) |
| E-7 | Probe test IDs `node-offer-<key>-toggle`, `-summary`, `-list-entry` (probe lines 298, 371–373; docker probe 236) | Kept by `RemoteCollaborationOfferToggle` / `RemoteCollaborationOfferList`. Gone: the Disclosure's root `node-offer-<key>` and `-preview`, which only the Disclosure spec used | Toggle spec replaces the Disclosure spec |
| E-8 | `autobyteus-web/docs/settings.md:257-360` | Describes the page and names `RemoteCollaborationOfferDisclosure.vue` (line 360) | Docs update |

## Intended Change

Apply the user-approved Product design to the Manage Nodes tab: one aligned row anatomy, one collaboration capsule, one notice shape with tone icons, the server version as a quiet column, the offer summary as a toggle that opens a framed panel, and calmer cards. Behavior, copy and data stay as they are.

## Change Scope (Mandatory)

- In scope: UC-901…903. Web presentation of the Manage Nodes tab: the components listed in the file mapping, their tests, the two browser probes' text expectations, and `docs/settings.md`.
- Derived consumers: `N/A`. No stored or shared structure changes. The only shared presentational piece, `RemoteCollaborationOfferDisclosure`, has one consumer (E-5).
- Deliberately left alone:
  - all stores, utils and localization;
  - `NodeChangeDialog.vue` (the spec keeps its look);
  - `RemoteCollaborationOfferList.vue`;
  - the tab bar and the Memory Sync, Phone Setup, Docker Guide and NFS Guide tabs;
  - server, Electron.
- Follow-ups: FU-001 (a peer-only row disappears on turn-off while the dialog says it stays; pre-existing 268 behavior).

## Relevant Behavior And Production-Path Map (Mandatory)

| Behavior | Kind | REQ / AC | Trigger | Existing evidence | Change | Target path |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-900 | User | REQ-901, AC-901 | Open Manage Nodes | Screenshot; components | New look per VIS-001…037 | DS-001 |
| BEH-901…908 | User | REQ-902…904, AC-902…904 | Every action and state | Investigation inventory | Preserved; only their rendering changes | DS-001 (the store paths are unchanged) |

## Relevant Supplemental Task Artifacts

| Artifact | Purpose | Relationship | Status |
| --- | --- | --- | --- |
| Product `ui-ux-spec.md` + VIS-001…037 | Normative look | The components realize it; screenshots are the acceptance reference (AC-901) | Approved 2026-11-02 |
| Design repository diff `8a71c842..88e0e322 -- components/` | The approved reference implementation of the look | The starting point for implementation (see Guidance) | Approved with the package |
| 268 `ui-ux-spec.md`, 305 design | Behavior, states, copy | Unchanged and still normative | Approved earlier |

## Task Design Health Assessment (Mandatory)

- Change posture: `Larger Requirement` (a visual redesign, with no behavior change).
- Current design issue found: `No` structural issue. The components are thin renderers over the stores (Current-State Read).
- Structural triggers:
  - **Responsibility overload: checked, does not fire.** `NodeRow.vue` grows from 227 to about 275 lines (reference), still a single concern (one row), under 500. The capsule and notice icon become their own components, so the row doesn't grow more.
  - **Several kinds or forms: fires, answered.** `NodeServerUpdate` is rendered twice per remote row, with `part="cell"` and `part="notice"`. Only the cell asks the server: the `watch`/`unwatch` lifecycle stays in the cell instance only, so the node is asked once per row, as today. Both parts read the same `nodeServerUpdateStore` entry; neither recomputes the other's facts.
  - **Legacy cleanup: fires.** `RemoteCollaborationOfferDisclosure` is replaced; it is removed, not kept beside the toggle.
  - **Vocabulary drift: checked.** The new names (`NodeCollaborationSwitch`, `NodeNoticeIcon`, `RemoteCollaborationOfferToggle`) use the existing words "remote collaboration", "notice" and "offer". "Peer" stays out of the UI (268).
  - Ambiguous boundary, authoritative boundary, derived data, persisted data: do not fire (no interfaces or data change).
- Root cause classification: `No Design Issue Found`. The "unprofessional" impression is a visual-design problem, diagnosed by the Product Team (F1–F9 in its `design-review-notes.md`), not a code-structure one.
- Refactor needed now: `No`. The extraction of the capsule and notice icon is part of the approved design, not a refactor of existing debt.
- Intentional deferrals: FU-001.

## Terminology

- **Capsule**: the remote-collaboration icon plus its switch as one control (`NodeCollaborationSwitch`).
- **Notice**: a line under a row with a tone icon, text and at most one button. The tones are info, warn, error and ok.
- **Panel**: the framed area under a row that the offer toggle opens (offer list plus connection details).
- **Server cell** and **server notice**: the two parts of `NodeServerUpdate`.

No new domain word. `GLOSSARY.md` is unchanged.

## Legacy Removal Policy (Mandatory)

- Obsolete in scope: `RemoteCollaborationOfferDisclosure.vue` and its spec; the text marks ✓ ⚠ ✗ ⓘ in row notices, connection details, the Docker hint and the duplicate message (the dialog keeps its own); the Disclosure's `-preview` element.
- Compatibility kept: `None`.

## Persisted Data / State Transition Decision (Mandatory When Persisted Data May Be Affected)

`Not Affected`: a presentation change; no stored data, format or store changes (E-2).

## Data-Flow Spine Inventory

| Spine | Scope | Behavior | Start | End | Owner | Why |
| --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Primary | BEH-900…908 | Manage Nodes opens; a store state changes | The rendered tab | `NodeList` / `NodeRow` (rendering) over `nodeListStore` (state) | The only path the change touches |
| DS-002 | Bounded local | BEH-906 | A remote row renders | Server cell asks; server notice reads | `NodeServerUpdate` (cell part) | The two-part rendering must not double the asks |

## Primary Execution Spine(s)

- DS-001: `NodeManager (Manage panel) → ThisNodeCard / NodeList → AddNodePanel, NodeRow × n → NodeCollaborationSwitch, RemoteCollaborationOfferToggle, NodeServerUpdate(cell), NodeServerUpdate(notice), notices, panel (RemoteCollaborationOfferList + NodeConnectionDetails) → the user's action → the same store action as today (nodeListStore / nodeChangeDialogStore / nodeServerUpdateStore)`

## Spine Narratives (Mandatory)

| Spine | Narrative | Owner |
| --- | --- | --- |
| DS-001 | The tab renders the same store state as today in the new layout. The Nodes card is a size container, and each row places its cells (who, server, offer, capsule, actions) by the card's width: ≥64 rem one line, 38–64 rem two tiers, <38 rem stacked. Notices and the panel sit under the row. Every control calls the store or dialog action it calls today. | The components |
| DS-002 | `NodeServerUpdate` with `part="cell"` starts watching the node when the window reaches it, and stops on unmount: the existing lifecycle, unchanged. `part="notice"` only reads the entry. | `NodeServerUpdate` (cell) |

## Spine Actors / Main-Line Nodes

`NodeList`, `NodeRow`, `NodeServerUpdate`, `ThisNodeCard`, `AddNodePanel`; the stores are unchanged.

## Ownership Map

- **The components:** presentation only; they own no state beyond local UI state (rename draft, rules open, copied flag), as today.
- **`NodeCollaborationSwitch`:** renders `modelValue`, `disabled` and `dimmed`, and emits `toggle`. The row and the add panel decide what toggling means, as today.
- **`RemoteCollaborationOfferToggle`:** renders the summary (counts or label) and the names tooltip, and emits `update:open`. The row owns `expanded` through `nodeListStore.expanded`, as today.
- **`NodeServerUpdate`:** the cell owns the watch lifecycle; the notice reads.

## Thin Entry Facades / Public Wrappers (If Applicable)

N/A.

## Removal / Decommission Plan (Mandatory)

| Item | Why unnecessary | Replaced by | Notes |
| --- | --- | --- | --- |
| `components/settings/RemoteCollaborationOfferDisclosure.vue` | The approved design splits the summary (toggle) from the panel (in `NodeRow`) | `RemoteCollaborationOfferToggle.vue`; the panel in `NodeRow.vue` | Only consumer: `NodeRow` (E-5) |
| `components/settings/__tests__/RemoteCollaborationOfferDisclosure.spec.ts` | Dead: it tests the removed component | `RemoteCollaborationOfferToggle.spec.ts` (new) | — |
| Text marks in `NodeRow`, `NodeConnectionDetails`, `NodeAddressHint`, `AddNodePanel` | The approved design uses tone icons | `NodeNoticeIcon.vue` | Not in `NodeChangeDialog` |
| Inline icon + switch markup in `NodeRow` and `AddNodePanel` | Duplicated control | `NodeCollaborationSwitch.vue` | — |

## Return Or Event Spine(s) (If Applicable)

N/A: the store answers re-render the page as today.

## Bounded Local / Internal Spines (If Applicable)

DS-002, above.

## Off-Spine Concerns Around The Spine

| Concern | Serves | Responsibility |
| --- | --- | --- |
| Container layout (`.nodes-card` container; `@container` rules in `NodeRow`) | `NodeRow` | Three layouts by card width |
| `NodeNoticeIcon` | Notices, details, hint, duplicate message | One icon per tone; decorative (`aria-hidden`), because the words carry the meaning |

## Ownership Boundaries

The components call only the stores' public actions and getters, exactly as today. No component reaches into another store's internals.

## Boundary Encapsulation Map

| Boundary | Encapsulates | Callers | Forbidden bypass |
| --- | --- | --- | --- |
| `nodeListStore` and the other stores (unchanged) | Node state, asks | Components | A component calling GraphQL or the node APIs directly |

## Dependency Rules

- Allowed: `nodes/*` components → stores, `utils/nodeConnectionErrorText`, localization, and each other.
- Forbidden: any change to a store, util or localization file in this ticket (AC-905); components importing anything from the design repository's `prototype/`.

## Interface Boundary Mapping

| Interface | Subject | Responsibility | Notes |
| --- | --- | --- | --- |
| `NodeCollaborationSwitch` props `modelValue, label, hint, testId, iconTestId?, title?, disabled?, dimmed?, tall?`; emit `toggle` | One collaboration control | Render and emit | Keeps the test IDs `node-agents-switch-<key>`, `node-collab-icon-<key>`, `add-node-collaborate` |
| `RemoteCollaborationOfferToggle` props `entries, label?, testId, open`; emit `update:open` | One offer summary | Render and emit | Keeps `-toggle`, `-summary` |
| `NodeServerUpdate` props `row, part: 'cell' \| 'notice'` | One remote node's server state | `cell` asks and renders; `notice` renders | Test IDs kept (spec) |
| `NodeNoticeIcon` prop `tone: info \| warn \| error \| ok` | One tone mark | Render | — |

## Interface Boundary Check

| Interface | Singular | Identity explicit | Risk |
| --- | --- | --- | --- |
| All four above | Yes | Yes (row key, test IDs) | Low |

## Main Domain Subject Naming Check

| Subject | Name | Natural | Same meaning everywhere (Glossary) | Risk |
| --- | --- | --- | --- | --- |
| Collaboration control | `NodeCollaborationSwitch` | Yes | Yes ("remote collaboration" as in the page and the docs) | Low |
| Offer summary | `RemoteCollaborationOfferToggle` | Yes | Yes (the 267 "offer") | Low |
| Tone mark | `NodeNoticeIcon` | Yes | Yes | Low |

## Existing Capability / Subsystem Reuse Check

| Need | Existing | Decision | Why |
| --- | --- | --- | --- |
| Offer list | `RemoteCollaborationOfferList.vue` | Reuse | Unchanged |
| Collaboration icon | `RemoteCollaborationIcon.vue` | Reuse | Inside the capsule |
| Switch look | The existing switch markup | Extend into the capsule | One control instead of two copies |
| Layout by width | Tailwind breakpoints (window width) | Create (scoped container queries) | The approved design ties the layout to the card's width (TR-901) |

## Subsystem / Capability-Area Allocation

| Area | Owns | Decision |
| --- | --- | --- |
| `autobyteus-web/components/settings/nodes/` | All page parts | Extend |
| `autobyteus-web/components/settings/` | `RemoteCollaborationOfferToggle` (beside `RemoteCollaborationOfferList`, its 267 sibling) | Create / Remove (Disclosure) |

## Draft File Responsibility Mapping

As final.

## Reusable Owned Structures Check

| Repeated | File | Why |
| --- | --- | --- |
| Icon + switch control (row, add panel) | `nodes/NodeCollaborationSwitch.vue` | Two uses, one look |
| Tone marks (notices, details, hint, duplicate) | `nodes/NodeNoticeIcon.vue` | Four uses |

## Shared Structure / Data Model Tightness Check

N/A: no data structures change.

## Final File Responsibility Mapping

| File | Change | Concern |
| --- | --- | --- |
| `autobyteus-web/components/settings/NodeManager.vue` | Modify | Panel spacing `space-y-6` |
| `components/settings/nodes/ThisNodeCard.vue` | Modify | Identity block and collaboration block per spec |
| `components/settings/nodes/NodeList.vue` | Modify | Card frame, header, empty state; `.nodes-card` size container |
| `components/settings/nodes/AddNodePanel.vue` | Modify | Add band, the capsule (tall), plus icon and spinner, duplicate notice with icon |
| `components/settings/nodes/NodeRow.vue` | Modify | Row grid (container queries), cells, notices, panel; uses the capsule, toggle, notice icon, and both `NodeServerUpdate` parts |
| `components/settings/nodes/NodeServerUpdate.vue` | Modify | `part` prop: cell (version, chip, progress; owns watch) and notice (result, refusal, blocker, Copy command) |
| `components/settings/nodes/NodeConnectionDetails.vue` | Modify | Tone icons instead of marks; panel styling |
| `components/settings/nodes/NodeAddressHint.vue` | Modify | Error icon instead of ✗; indentation |
| `components/settings/nodes/NodeCollaborationSwitch.vue` | Add | The capsule |
| `components/settings/nodes/NodeNoticeIcon.vue` | Add | The tone icon |
| `components/settings/RemoteCollaborationOfferToggle.vue` | Add | The offer summary button |
| `components/settings/RemoteCollaborationOfferDisclosure.vue` | Remove | Replaced |
| `components/settings/__tests__/RemoteCollaborationOfferDisclosure.spec.ts` | Remove | Dead |
| `components/settings/__tests__/RemoteCollaborationOfferToggle.spec.ts` | Add | Summary (counts, label, empty offer), tooltip names sorted, `update:open` |
| `components/settings/nodes/__tests__/{NodeRow,AddNodePanel,NodeServerUpdate}.spec.ts`; new `NodeCollaborationSwitch.spec.ts` (optional, if not covered through the row) | Modify / Add | Follow the new markup (no marks; the toggle; the two server parts; one ask per row) |
| `autobyteus-web/tests/e2e/remote-nodes-page-probe.mjs`, `nodes-docker-address-probe.mjs` | Modify | Row and detail line expectations without the ✓ ⚠ ✗ ⓘ text marks; the tone is checked by the notice's tone (its class) where a case relied on the mark; the dialog's marks unchanged |
| `autobyteus-web/docs/settings.md` § Nodes: Manage Nodes | Modify | Describe the new presentation; replace the Disclosure reference |

## Applied Patterns (If Any)

None beyond small presentational components.

## Target Subsystem / Folder / File Mapping

As in the final mapping. No new folders.

## Folder Boundary Check

| Folder | Depth | Clear | Risk |
| --- | --- | --- | --- |
| `components/settings/nodes/` | Transport/UI | Yes | Low |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good | Avoided |
| --- | --- | --- |
| Server state in two places | `<NodeServerUpdate :row="row" part="cell" />` in the server column, and `<NodeServerUpdate :row="row" part="notice" />` under the row. Only the cell calls `updates.watch/unwatch`. | Both instances watching: the node would be asked twice per row |
| Probe line check | `expect(line(delta) === 'Remote collaboration is off on delta.' && tone(delta) === 'warn')` | Keeping the ✓/⚠ text in the markup only because a probe reads it (DESIGN.md rule 11) |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate | Why considered | Decision | Replacement |
| --- | --- | --- | --- |
| Keep `RemoteCollaborationOfferDisclosure` beside the toggle | Its spec and docs refer to it | Rejected | Removed; spec replaced; docs updated |
| Keep text marks hidden in the DOM for the probes | Probes match them | Rejected (DESIGN.md rule 11) | Probes updated |

## Derived Layering (If Useful)

N/A.

## Change / Refactor Sequence

1. Add `NodeNoticeIcon`, `NodeCollaborationSwitch` and `RemoteCollaborationOfferToggle`.
2. Change `NodeServerUpdate` (the `part` prop) and `NodeRow` (grid, capsule, toggle, panel, notices); then `AddNodePanel`, `ThisNodeCard`, `NodeList`, `NodeConnectionDetails`, `NodeAddressHint`, `NodeManager`.
3. Remove the Disclosure and its spec; add the Toggle spec; update the component specs.
4. Update the two probes' expectations; run them.
5. Compare with VIS-001…037 in the contexts the spec lists; update `docs/settings.md`.

## Key Tradeoffs

- **Start from the approved reference code.** Its base was byte-identical to our source (E-1) and it touches only presentation (E-2, E-3). That gives the closest match to the approved screenshots and the least chance of drift. The implementation still reviews every line for production quality, and checks that nothing imports from `prototype/`.
- **Container queries over window breakpoints.** The approved layout follows the card's width (TR-901), which differs from the window's because of the resizable sidebar.

## Risks

- **RSK-902:** a state missed in rendering. Mitigation: the existing component specs and both probes cover each line kind, the update states and the details; the screenshots cover the rest (AC-903/904).
- **RSK-903:** container queries in an older embedded Chromium. The desktop app's Electron Chromium supports them (Chromium ≥105). There is no fallback, by DESIGN.md rule 9 and because no older shell exists.

## Guidance For Implementation

- Reproduction to start from: `None` (a redesign).
- The approved reference implementation is the design repository diff, applicable to our source (E-1):
  `git -C /Users/normy/autobyteus_org/autobyteus-web-design diff 8a71c842 88e0e322 -- components/`
  Also read the spec's "Implementation Fidelity Boundary". The spec, not the reference code, is the authority where they differ.
- Keep every existing `data-testid` the spec names. The Disclosure's root and `-preview` test IDs go (E-7).
- Run the two browser probes (`test:e2e:remote-nodes-page`, `test:e2e:nodes-docker-address`) and the Nodes component specs; capture the page in the spec's contexts for the comparison with VIS-001…037.
- Do not touch `NodeChangeDialog.vue`, the stores, utils or localization. If the look seems to need it, return a `Design Impact`.
