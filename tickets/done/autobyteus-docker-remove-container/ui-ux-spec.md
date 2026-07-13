# UI/UX Specification — Docker Guide targeted node removal

## Status

Requirements-ready; approved by the user's explicit request on 2026-07-13 to add the command to the frontend Docker Guide.

## UX Goal

Make the newly supported single-node lifecycle operation discoverable in the in-app **Nodes -> Docker Guide** surface without turning the guide into a destructive node selector or silently choosing a node. Users should see a copyable command template, understand that they must replace the placeholder with an exact managed node name, and understand that named volumes/workspaces are preserved and the freed indexed slot can be reused.

## Related Requirements And Acceptance Criteria

- Requirement: R-013 in `requirements.md`
- Acceptance criteria: AC-013 and AC-014 in `requirements.md`
- Existing command-contract requirements: R-001, R-002, R-004, R-005, R-009

## Users / Personas / Contexts

- **Docker node operator:** uses the in-app Docker Guide after installing the launcher and needs to remove one stale or unwanted server node.
- **New or cautious operator:** may copy commands without knowing the node name; the UI must make placeholder replacement explicit and must not imply that any target is automatically selected.
- **Localized user:** uses the English or Simplified Chinese guide; the new card needs parity in both locale catalogs.

## User-Journey Inventory

| Journey ID | User / Context | Starting State | User Goal | Completion State | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- | --- |
| UXJ-001 | Docker node operator in Nodes -> Docker Guide | Guide shows existing direct launcher commands | Discover and copy the single-node destroy template | Targeted destroy command is visible with replacement/safety guidance | R-013, AC-013 |
| UXJ-002 | Cautious operator | User has not identified a node name | Avoid deleting the wrong node | Guidance points the user to `autobyteus-docker status` and says to replace `<node-name>` with an exact managed node | R-013, AC-014 |
| UXJ-003 | English/Chinese user | Locale is English or zh-CN | Understand the same command and safety semantics | Both locale surfaces expose equivalent title, description, and copy behavior | R-009, AC-014 |

## Journey Details

### UXJ-001 — Discover and copy

1. User opens **Nodes -> Docker Guide**.
2. The existing direct-command grid includes a new **Destroy one Docker node** card.
3. The card displays exactly:

   ```text
   autobyteus-docker destroy --name <node-name>
   ```

4. The description says to replace `<node-name>` with an exact managed node identified through `autobyteus-docker status`, and says the operation removes the selected container/state while keeping named volumes/workspaces.
5. User presses the existing Copy button; the command template is copied and the existing copied feedback appears.

No command executes in the UI, and no node is selected or deleted by opening the guide.

### UXJ-002 — Identify the target safely

The card description or adjacent guide copy must direct users to run `autobyteus-docker status` first when they do not know the target node name. It must not present any concrete node as an implicit default or copy-ready destructive target.

### UXJ-003 — Localized parity

The English and Simplified Chinese catalogs provide equivalent meaning for the card title, target-placeholder instruction, volume/workspace preservation, and status-first guidance. The command itself remains unchanged across locales.

## Screen / Surface / Component Inventory

| Surface / Component | Purpose | Entry Conditions | Important States | Exit / Next Action |
| --- | --- | --- | --- | --- |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Render install and direct launcher command cards | User opens Docker Guide tab | Existing loaded/normal state; existing copy feedback/error states | User copies the template or runs it after replacing the placeholder. |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Canonical command list for the guide | Module is imported by the guide | Static command list | New direct command is rendered like existing lifecycle commands. |
| English/zh-CN settings locale entries | Localize title/description | Current locale loaded | Translation present; existing fallback behavior | User reads equivalent guidance. |

## Interaction And State-Transition Specification

| Scenario / State | User Action Or Trigger | Immediate Feedback | Resulting UI State | Data / Side Effect | Next Available Actions |
| --- | --- | --- | --- | --- | --- |
| Normal guide render | Open Docker Guide | New card appears in direct command grid | Static loaded guide | No Docker/API/state side effect | Read, copy, or run edited command in a terminal. |
| Copy targeted destroy template | Click new card's Copy button | Existing `Copied` feedback | Existing copied-command state for the new command ID | Clipboard receives the literal placeholder template | Replace `<node-name>`, then run in terminal. |
| Copy failure | Clipboard API rejects | Existing copy-error text | Existing error state | No Docker/API side effect | Retry copy or manually select the command. |
| User does not know node | Read card description | Status-first instruction is visible | No special UI state | User runs `autobyteus-docker status` outside the app | Return to terminal and replace placeholder with exact node. |
| User opens guide without Docker/launcher | Open Docker Guide | Guide still renders static command | No disabled state required | No Docker/API side effect | Install launcher or use the command later. |

## Markdown Wireframes / Visual Structure

Existing direct command grid, with one additional card:

```text
2. Use direct commands
After install, these commands run locally...

[ Create Docker node ] [ Upgrade all Docker nodes ] [ Destroy all Docker nodes ]
[ Destroy one Docker node ] [ Reset Docker nodes ]     [ Show workspace paths ] ...

Destroy one Docker node
Replace <node-name> with an exact node from `autobyteus-docker status`.
Keeps named volumes and host workspaces.

autobyteus-docker destroy --name <node-name>       [Copy]
```

The card uses the existing `CommandCard` rendering and does not add a custom destructive button or confirmation flow.

## Non-Happy-Path States

### Loading

No new loading state. The command catalog is static and follows the existing guide rendering lifecycle.

### Empty

No new empty state. If the direct command list is available, the targeted card is included; if the entire guide is unavailable, existing guide behavior applies.

### Error And Recovery

The card reuses the existing clipboard copy error and copied feedback. Docker command failures occur in the user's terminal and remain governed by the launcher CLI; the frontend does not attempt to render or recover those runtime errors.

### Disabled / Unavailable

The card is not disabled based on Docker reachability because the guide is an instructional static surface and does not probe Docker.

### Permission / Authentication

No additional frontend permission or authentication is required. The terminal command remains subject to the user's local Docker permissions.

## Responsive And Platform Behavior

Use the existing responsive direct-command grid. The command text remains horizontally scrollable through the existing `<pre>` styling. The same command template is shown for macOS/Linux and Windows because it is an installed CLI command; platform-specific install cards remain unchanged.

## Accessibility And Keyboard Behavior

Reuse the existing semantic button, copy `aria-label`, keyboard focus, and visible copied/error feedback. Add no new interactive control type or focus order.

## Content, Labels, And Validation Messages

- English title: `Destroy one Docker node`
- English description: instruct exact replacement, status-first discovery, and volume/workspace preservation.
- Simplified Chinese title: `销毁一个 Docker 节点`
- Simplified Chinese description: equivalent guidance.
- Command: `autobyteus-docker destroy --name <node-name>`
- The UI must not show a copy-ready hard-coded concrete-node destructive command.

## Data And API Dependencies

None. This is a static command-catalog/UI change. It does not call the backend, Docker, or a node-status API.

## Out Of Scope

- Executing destroy from the frontend.
- Adding a node picker or fetching live node names.
- Adding confirmation dialogs for a terminal command that the UI does not execute.
- Changing launcher runtime behavior, state safety, or Buildx ownership.

## Open Decisions / Risks

- The placeholder command is intentionally not directly executable until the user replaces `<node-name>`; this is safer than presenting a destructive hard-coded node.
- Existing copy behavior copies the template literally; the description must make replacement unambiguous.

## Approval Status

Approved by the user's explicit request to add targeted destroy guidance to the frontend Docker Guide. This supplement remains linked from the mandatory requirements and design artifacts and must travel with the cumulative package through architecture, implementation, source review, and frontend test review.
