# API/E2E Design-Impact Reroute: Artifacts Tab Ownership Conflict

## Ticket

`team-message-referenced-artifacts`

## Reroute Classification

`Design Impact` / `Requirement Gap`

## Why This Is Being Routed Back

During API/E2E validation, the implementation and tests were validated against the recorded requirements/design for this ticket. Those artifacts explicitly require the focused member's Artifacts tab to show three sections:

- **Agent Artifacts**
- **Sent Artifacts**
- **Received Artifacts**

However, the latest product clarification is that referenced/sent/received team-message artifacts should be owned by the **Team tab** instead. If the Team tab already shows those sent/received/reference artifacts, keeping **Sent Artifacts** and **Received Artifacts** in each member's Artifacts tab creates duplicate ownership and duplicate UI surfaces.

This is not an implementation bug under the current ticket requirements; it is a requirements/design mismatch. The recorded requirements and tests currently preserve the behavior the user now wants removed.

## Evidence Of The Conflicting Existing Requirement

The archived requirements for this ticket contain these requirements/acceptance criteria:

- `REQ-016`: The Artifacts tab must show **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts** as separate top-level sections for the active/focused member.
- `REQ-017`: **Sent Artifacts** and **Received Artifacts** must group rows by counterpart agent name/run identity, with file rows under that counterpart.
- `AC-008`: Given the sender's Artifacts tab is focused, the derived reference appears under **Sent Artifacts**.
- `AC-009`: Given the receiver's Artifacts tab is focused, the same derived reference appears under **Received Artifacts**.
- `AC-011`: Given both generated file changes and message references exist, generated artifacts remain under **Agent Artifacts** and message references remain under **Sent Artifacts** / **Received Artifacts**.

Those requirements conflict with the clarified desired direction: the Team tab should own team message/reference artifacts and the member Artifacts tab should avoid duplicating them.

## What API/E2E Validated

API/E2E validated the implementation as specified by the ticket, including:

- Browser/visual validation that the Artifacts tab still renders **Agent Artifacts**, **Sent Artifacts**, and **Received Artifacts**.
- Sent/Received group headings render `To <agent>` / `From <agent>` once per counterpart group.
- Grouped rows suppress repeated `Sent to ...` / `Received from ...` provenance and show filenames only.
- Keyboard order remained **Agent Artifacts** -> **Sent Artifacts** -> **Received Artifacts**.
- Content route and store boundaries remained unchanged:
  - Produced Agent Artifacts use `runFileChangesStore` and `/runs/:runId/file-change-content`.
  - Message references use `messageFileReferencesStore` and `/team-runs/:teamRunId/message-file-references/:referenceId/content`.

This validation now demonstrates the design conflict: the current requirements intentionally keep the Sent/Received sections in the member Artifacts tab.

## Requested Solution-Design Decision

Please decide and update the requirements/design for the intended ownership model:

### Option A — Keep Current Model

Keep **Sent Artifacts** and **Received Artifacts** inside each focused member's Artifacts tab, with the Team tab allowed to also expose team-level references. This accepts duplicate/cross-surface visibility.

### Option B — Move Team Message References To Team Tab Only

Make the Team tab the sole UI owner for team message/reference artifacts. Then update requirements/design so:

- The member Artifacts tab only shows produced **Agent Artifacts** for that focused member/run.
- **Sent Artifacts** and **Received Artifacts** sections are removed from the member Artifacts tab.
- Team-level message-reference store/hydration/content routes may still exist, but the member Artifacts tab no longer projects them.
- Frontend tests are updated to assert absence of Sent/Received sections from the member Artifacts tab.
- Team tab tests assert the replacement ownership/visibility behavior.
- Documentation is updated to clarify that team-message references are Team tab artifacts, not member Artifacts-tab entries.

## Likely Implementation Areas If Option B Is Chosen

- `autobyteus-web/components/workspace/agent/ArtifactsTab.vue`
  - Stop combining `messageFileReferencesStore` perspective items into the member Artifacts tab.
- `autobyteus-web/components/workspace/agent/ArtifactList.vue`
  - Remove or gate Sent/Received sections if no longer used by this tab.
- `autobyteus-web/components/workspace/agent/artifactViewerItem.ts`
  - Reassess whether message-reference viewer items are still needed in this component path.
- Team tab components/stores/tests
  - Ensure team-level reference visibility is complete and usable there.
- Tests
  - Replace current assertions that Sent/Received appear in member Artifacts tab with assertions that they do not appear there.
  - Add/update Team tab tests for the team-level ownership behavior.
- Docs
  - Update artifact ownership documentation so produced Agent Artifacts and team message references are clearly separated by UI owner.

## API/E2E Recommendation

Route back to solution design before further implementation or delivery. The current reviewed implementation is correct for the recorded ticket, but the recorded ticket appears to be wrong for the clarified product direction.
