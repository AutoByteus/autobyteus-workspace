# Investigation Notes — manage-nodes-professional (autobyteus-363)

## Investigation Meta

- Package: `manage-nodes-professional`. Task: autobyteus-363 in Project `project_a1377344-25db-482a-97cc-ecfdb0fb495a` (read with `get_project_task`, 2026-11-01).
- Workspace: `/Users/normy/autobyteus_org/autobyteus-worktrees/manage-nodes-professional`, branch `codex/manage-nodes-professional`.
- Base: `origin/personal` @ `3b9dc912a1` (fetched 2026-11-01; the merge of the beta v1.5.11-beta.10 release records). Finalization target: `personal`.
- Bootstrap: worktree created; no blocker.
- Current SR: SR-001.
- Authorities read (requirements gate, 2026-11-01, after the skill update): `references/requirements-engineering.md`, `references/ticket-scope.md`, `references/finding-the-cause.md`, `SKILL.md`.
- Status: requirements-level investigation complete.

## Initial Request

- The user (2026-11-01, on beta v1.5.11-beta.10): "the manage nodes page UI should definitely be improved. It looks very unprofessional if you look at it. I remember earlier we worked on this a bit, but still not good enough."
- His screenshot: [user-screenshot-2026-11-01-beta10.png](user-screenshot-2026-11-01-beta10.png) (copied from the Task's context file).
- Task direction: use the Product Team's process to find what looks unprofessional and show him options, in the app's existing design language. Behavior and data must not change. The other Nodes tabs are untouched unless a small adjustment is needed. Release only on his word. The Project Task Manager: do not put "the user has verified" into Done-when.

## Source Log

| Date | Type | Source | Finding |
| --- | --- | --- | --- |
| 2026-11-01 | Data | The user's screenshot | The current page as he sees it (described below). |
| 2026-11-01 | Code | `autobyteus-web/components/settings/nodes/{ThisNodeCard,NodeList,AddNodePanel,NodeRow,NodeServerUpdate,NodeConnectionDetails,NodeChangeDialog,NodeAddressHint,RemoteCollaborationIcon}.vue`, `NodeManager.vue` (base `3b9dc912a1`) | The page's components (about 1,140 lines). |
| 2026-11-01 | Doc | `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` (268, approved 2026-10-23) | The last Product design of this page: states, copy, layout values, confirmations. |
| 2026-11-01 | Doc | `tickets/done/docker-node-in-place-server-update/` (autobyteus-305) `design-spec.md` § Row states, DEC-018 | 305 added the version line and the "Update to <version>" action as an engineering design, with no Product design pass (its requirements cite no UI/UX spec). |
| 2026-11-01 | Doc | design repo `tickets/done/integrations-page-r2` | The most recent Product-designed settings page, a reference for the current design language. |

## What The Screenshot Shows (observations, not the Product Team's diagnosis)

- **"This node" card:** a small "This node" heading; the name "Embedded Node"; a blue uppercase "EMBEDDED" pill; the address in a grey mono box. Then a divider, a 32 px tinted icon square, "Remote collaboration", "On" and a green switch at the far right, two lines of explanation, and "How remote collaboration works".
- **"Nodes" card:**
  - a header and description;
  - an add row: a mono-font Address placeholder, a Name field, an unlabeled collaboration icon plus a green switch, and a blue "Add node" button;
  - rows. Each row has a green dot, the name, and a mono `localhost:8001`. At the right are the collaboration icon, a green switch, and two 40 px bordered icon buttons (Open, Remove).
  - Under the name, "Server 1.5.11-beta.10" is in medium-weight body text. Then comes a chevron line, "49 Agents · 24 Agent Teams", followed by a long, truncated list of names.
- Possible sources of the impression, for the Product Team to judge:
  - three visual weights of label (pill, mono box, plain);
  - the same icon plus switch repeated on every row and in the add row with no visible label;
  - large bordered icon buttons;
  - the version line, which has no label and no visual relation to the row;
  - long truncated name lists;
  - row heights and indents that vary;
  - a monospace placeholder;
  - a lot of empty space in "This node".
  These are observations only. The Task gives the diagnosis to the Product Team's process.

## Current Behavior Inventory (preserved; from code and the 268 spec)

| ID | Function | Where (component) |
| --- | --- | --- |
| BEH-901 | This node: name, type, address; the remote-collaboration switch with On/Off/Saving, explanation, off note, "How remote collaboration works" rules | `ThisNodeCard.vue` |
| BEH-902 | Add node: Address, Name, the collaboration switch (on by default), Add node, "Checking address…", field errors, the duplicate message, row flash; the confirmation when collaborating | `AddNodePanel.vue`, `NodeChangeDialog.vue` |
| BEH-903 | Row: status dot (reachable / not / different node / checking), click-to-rename name (not for the embedded node), address, collaboration switch (disabled states), Open (when the window can open it), Remove (not the embedded node) | `NodeRow.vue` |
| BEH-904 | Row line with one fixing button: off there, not registered there, different node, not reachable (cause), step not finished, registered only by the other node, not collaborating; checking line | `NodeRow.vue`, `nodeRowStatus` |
| BEH-905 | Offers summary "N Agents · M Agent Teams names…", which opens the list (search above 6) and the connection details: both directions, addresses, Change address, steps, node ID, refresh; Docker hint with Use this / Docker Guide | `RemoteCollaborationOfferDisclosure.vue`, `NodeConnectionDetails.vue`, `NodeAddressHint.vue` |
| BEH-906 | Remote node server: version, "Update to <version>" with "Same version as this app", progress steps, restarting, not reachable (with the last step), newer-than-app note, result notice (ok or warn), "Copy command" | `NodeServerUpdate.vue` (305) |
| BEH-907 | One confirmation dialog: turn on, finish, turn off, remove; running; partial result; Try again | `NodeChangeDialog.vue` |
| BEH-908 | Contexts: desktop window on the embedded node, a window on a Docker node, browser (no Open), English and Chinese, narrow widths (stacked) | all |

## Persisted Data

Not affected: a visual change only.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Status |
| --- | --- | --- | --- |
| `user-screenshot-2026-11-01-beta10.png` | The user (via the Task) | The page as he sees it | Evidence |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/one-nodes-tab/ui-ux-spec.md` + VIS-001…031 | Product Team | The approved behavior and states of 268 that this redesign keeps | Approved 2026-10-23 (behavior stays normative; the look may change) |
| `/Users/normy/autobyteus_org/autobyteus-web-design/tickets/done/manage-nodes-professional/ui-ux-spec.md` + VIS-001…037, `design-change-log.md`, `design-review-notes.md`, `product-ticket.md` | Product Team (external) | Normative look | Approved by the user 2026-11-02 (SR-002) |
| `handoff-product-design.md` | Solution Designer | Product Design request | Done |
| `follow-ups.md` | Solution Designer | FU-001 | Not yet sent |

## Assumptions, Unknowns, Risks

| ID | Type | Description | Resolution |
| --- | --- | --- | --- |
| UNK-901 | Unknown | What exactly makes it look unprofessional to the user | The Product Team's diagnosis and options, reviewed with him |
| RSK-901 | Risk | A visual rework could drop a state that rarely appears (update notices, partial results, Docker hint) | The preserved inventory BEH-901…908 is passed to the Product Team, and every state is listed in AC-903 |

## Product Result Check (2026-11-02)

- The package was verified:
  - spec Status `Approved`, quoting the user's confirmation;
  - the spec, `product-ticket.md` and the handoff name the same repository (`personal` @ `88e0e322`, ticket `07fdfcfc`, base `8a71c842`) and the same source pin `3b9dc912a1`;
  - 37 screenshots are present; VIS-001 was inspected.
- **Finding 1 from the Product Team** (browser row disappears after turning collaboration off), established by reading:
  - `stores/nodeListStore.ts:73-97` builds rows from desktop entries, plus "peer-only" rows for peers with no desktop entry (DEC-706).
  - Turning off removes this node's peer (`removeHere`), so a peer-only row has no source left and disappears, in any context. It is visible in the browser, where there is no desktop list.
  - The dialog says "{{name}} stays in your list" (`nodesPage.ts` `dialog.offNote`).
  - Pre-existing since 268, so it is not caused by this ticket. → FU-001.
- Finding 2 (an emptier row while this node is off): existing behavior; the user did not ask for a change. No action.
- Finding 3 (A1): DEC-905.
