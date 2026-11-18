# Docs Sync Report — manage-nodes-professional (autobyteus-363)

## Scope

- Ticket: manage-nodes-professional. The Manage Nodes tab in the Product Team's approved look, presentation only. `task_size` `Medium`, `architectural_risk` `Low`, direct route.
- Trigger: API/E2E API-REV-002 Pass on the merged branch (after the DR-001 Local Fix).
- Bootstrap base reference: `origin/personal` `3b9dc912a1`.
- Integrated base reference used for docs sync: `origin/personal` `38ee8877e2`. It was merged at `7b62745afa`, on top of IR-002's merge of `84ea944ac5`.
- Post-integration verification reference: `7b62745afa`; DLV-01…DLV-03 in `evidence/delivery/`.

## Why Docs Were Updated

- Summary: the web settings doc's Nodes section described the old row layout: a summary line under the row, a separate server line, and a switch with an icon. This ticket changed the look: two cards; container-width row tiers; one collaboration capsule; one notice shape with tone icons; a server cell with the update chip; and an offer toggle that opens one framed panel. The implementation updated `autobyteus-web/docs/settings.md` § Nodes: Manage Nodes (one list). Delivery checked it against the delivered components and needed no further change.
- Why this should live in long-lived project docs: future Nodes work needs the layout rules, such as the row tiers by the card's width rather than the window's. It also needs the split component ownership: `NodeServerUpdate` with `part="cell"`/`"notice"` and only the cell asking the node, and `RemoteCollaborationOfferToggle` replacing the Disclosure.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` § Nodes: Manage Nodes (one list) | The section this change affects | Updated (by implementation; checked) | It matches `NodeRow.vue` (`@container`, 64/38 rem tiers), `NodeCollaborationSwitch.vue`, `NodeNoticeIcon.vue`, `NodeServerUpdate.vue` parts and `RemoteCollaborationOfferToggle.vue`. The merge with the base's run-settings edits is clean and touches other sections |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md`, `autobyteus-server-ts/docker/README.md` | Nodes behavior and update text | No change | Presentation only (AC-905); no server behavior changed |
| Docs referencing `RemoteCollaborationOfferDisclosure` | Removed component | No change | `grep` over web/server sources, specs and docs finds none |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Section update (implementation, `523bd0454b`) | Layout and notice rules; the row's cells; the server cell and notice split; the add band; the offer toggle and its panel | The delivered look (REQ-901) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Row layout tiers | A row lays out by the Nodes card's width (CSS container), not the window's | design-spec, ui-ux-spec | web `settings.md` |
| One notice shape | Every line under a row is one notice: a tone icon, its text and at most one button; no text marks outside the dialog | ui-ux-spec | web `settings.md` |
| Server cell ownership | `NodeServerUpdate` renders a cell and a notice; only the cell asks the node | design-spec | web `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `RemoteCollaborationOfferDisclosure.vue` (+ spec) | `RemoteCollaborationOfferToggle.vue` (+ spec) and the row's framed panel | web `settings.md` § The offer |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence, then finalization (no release: RELEASE.md default; the user did not ask).
- Notes: no new follow-ups. FU-001 is upstream (the Product Team and the Solution Designer).
