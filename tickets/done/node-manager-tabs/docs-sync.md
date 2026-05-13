# Docs Sync: Node Manager Tabs

- Ticket: node-manager-tabs
- Date: 2026-05-13
- Stage: 9
- Result: Updated

## Durable Documentation Updated

| File | Change |
| --- | --- |
| `autobyteus-web/docs/settings.md` | Updated Nodes section to describe the new Manage Nodes / Docker Guide tabs, `NodeManagerTabs.vue`, `CurrentWindowNodeCard.vue`, and the Docker guide's tutorial-only placement. |

## Rationale

The Node Manager page behavior changed visibly, and the durable settings docs previously said the Docker guide rendered before the Add Remote Node form. That is no longer true; the Docker guide now lives in its own Docker Guide tab and directs users back to Add Remote Node on the Manage Nodes tab.

## Docs Sync Decision

Docs are updated and aligned with the final implementation state.

## Header Layout Refinement Docs Update

- Updated `autobyteus-web/docs/settings.md` to state that `NodeManagerTabs.vue` is the visible page header and that no additional redundant `Node Manager` title is rendered.
