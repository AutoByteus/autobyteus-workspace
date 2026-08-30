# Requirements Doc: Remote-node `open_tab` focus behavior

## Status (`Draft`/`Design-ready`/`Refined`)

Design-ready

## Goal / Problem Statement

Investigate and correct the desktop right-panel behavior where an agent running on a Docker/remote node calls `open_tab`: the URL opens in that node's own browser session, but the Electron client also selects its local **Browser** panel even though no Electron-bridged tab can be displayed there.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-001 | A remote/Docker-node `open_tab` call opens in the node browser and also switches the connected desktop window's right-panel selection to **Browser**, which cannot show that remote browser tab. | A remote/Docker-node `open_tab` call must not auto-select the desktop's local **Browser** panel; the current right-panel selection must remain unchanged. | The remote node must still execute `open_tab` in its own browser environment, and the success/tool activity must continue to render normally. | R-001, R-003, R-004 / AC-001, AC-003, AC-004 |
| BEH-002 | An `open_tab` call from the Electron embedded/local node opens a tab through the Electron browser bridge, focuses that local browser session, and selects **Browser**. | Preserve this embedded-node behavior so an Electron-visible opened tab is brought into view. | The Electron bridge, local browser-session focus, right-panel visibility state, and URL-opening behavior remain unchanged. | R-002, R-003, R-004 / AC-002, AC-003, AC-004 |

## Investigation Findings

- The source contains one automatic `open_tab`-to-Browser selection path: `services/agentStreaming/browser/browserToolExecutionSucceededHandler.ts`.
- Both standalone and team streams converge on `agentStreamMessageProjector.ts`, which invokes that handler for every successful `open_tab` result without passing or checking node context.
- A node-bound Electron window already has an authoritative identity in `windowNodeContextStore.isEmbeddedWindow`. Standalone and team stream connections are both created from that same window store's bound endpoints, so the window binding identifies the backend that produced the tool result.
- On every valid `open_tab` result, the handler calls the local Electron `BrowserShellStore.focusSession(...)` and then unconditionally selects **Browser**. For a Docker-owned tab id, Electron main cannot resolve the id in its own local `BrowserTabManager`; `browserShellStore.focusSession` records and swallows the IPC failure, so the handler still changes the selected right-side tab.
- The existing owner and file placement are otherwise appropriate: the browser-specific post-success handler already owns the presentation side effect, and the window-node store already owns the required embedded-versus-remote invariant. No server event-contract change is needed.

## Relevant Supplemental Task Artifacts

None. The binary embedded-versus-non-embedded interaction is fully specified in the behavior table and acceptance criteria.

## Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Bug Fix
- Initial design issue signal (`Yes`/`No`/`Unclear`): Yes
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Missing Invariant
- Refactor posture (`Likely Needed`/`Likely Not Needed`/`Deferred`/`Unclear`): Likely Not Needed
- Evidence basis: The browser post-success handler assumes every `open_tab` tab id belongs to the desktop's Electron `BrowserTabManager`. It ignores the already-authoritative window node binding, then changes the right-panel selection even when the local focus command did not attach the tab.
- Requirement or scope impact: The correction must gate automatic local Browser projection on both an Electron embedded-window binding and local Browser-shell availability. It must not infer eligibility from the tab id, URL, hostname, or IPC failure.

## Recommendations

- Keep the decision in the existing browser tool-success presentation owner.
- Before asking the local Browser shell to focus the returned tab id, require the current window to be the Electron embedded-node window and the local Browser shell to be available.
- For a remote/Docker window, return from the presentation handler without calling local Electron browser focus and without changing the right-side selection.
- Preserve the existing standalone/team convergence; do not add node fields to the tool result or duplicate the decision in both streaming services.

## Scope Classification (`Small`/`Medium`/`Large`)

Small. The change is localized to an existing browser-success presentation handler plus focused coverage; the authoritative context and shared standalone/team projection path already exist.

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: An agent executing on a configured remote/Docker node calls `open_tab` while its run is open in the Electron desktop.
- UC-002: An agent executing on the Electron embedded/local node calls `open_tab` while its run is open in the Electron desktop.

### Out of Scope

- Bridging remote/Docker browser tabs into Electron's local **Browser** panel.
- Replacing or redesigning the remote node's VNC browser experience.
- Changing the `open_tab` tool's URL-opening semantics inside the executing node.
- General right-panel auto-focus policy for tools other than `open_tab`.
- Node configuration, connectivity, or Docker browser startup changes.

### Preserved Behavior Boundary

Preserve BEH-002 and the node-local URL-opening/tool-activity outcome of BEH-001. Only the local Electron Browser focus call and right-panel auto-selection decision are authorized to be suppressed for a non-embedded window.

### Review Authority

- Every blocking `Design Impact` or implementation-correction finding must cite an approved requirement, acceptance criterion, or preserved-behavior ID that it protects.
- A finding that would introduce new product behavior, policy, threat model, migration obligation, or operational contract is a `Requirement Gap`; it must return for explicit user approval before becoming authoritative.
- An adjacent concern outside the approved boundary may be recorded as a non-blocking risk, recommendation, or separate-ticket candidate. It must not be treated as a required design correction.
- A downstream reviewer comment does not amend this requirements basis. The solution designer must update the canonical requirements and obtain renewed user approval before a scope-changing proposal can govern design or implementation.

## Functional Requirements

- **R-001:** When `open_tab` is executed by a run on a non-Electron remote/Docker node whose browser is not bridged into the Electron browser surface, the desktop must neither request focus of that tab id from its local Electron Browser shell nor auto-select **Browser** because of that tool call.
- **R-002:** When `open_tab` is executed by a run on the Electron embedded/local node and the local Browser shell is available, the desktop must continue to focus the returned local browser session and auto-select **Browser** so the result is visible when the panel is shown.
- **R-003:** Eligibility for automatic local Browser projection must use the authoritative current window-node binding together with local Browser-shell availability. It must not be inferred from a tab id, URL/hostname pattern, the existence of any other local browser tab, or failure of a local focus attempt, and it must not change whether or where the executing node opens the URL.
- **R-004:** The correction must behave consistently for supported individual-agent and agent-team run views wherever the same `open_tab` presentation policy is used.

## Acceptance Criteria

- **AC-001:** Given an active run in a configured remote/Docker node window and any current right-panel selection (including a hidden/collapsed panel), when that run reports a successful `open_tab`, the remote-node tool result/activity remains intact, no local Electron browser-session focus is requested, and the right-panel selection remains unchanged.
- **AC-002:** Given an active run in the Electron embedded/local node window, an available local Browser shell, and any non-Browser right-panel selection, when that run reports a successful `open_tab` with a local Electron tab id, that local browser session is focused and **Browser** becomes the selected right-side tab as before; the panel's shown/hidden state is not otherwise changed.
- **AC-003:** Focused policy coverage proves the outcome is determined from the authoritative window-node binding plus local Browser-shell availability and rejects tab-id, URL/hostname, existing-session, and focus-failure heuristics.
- **AC-004:** Existing supported individual-agent and agent-team streaming paths continue to surface successful tool activity and converge on the same browser-success policy; both receive the remote suppression and embedded preservation behavior without duplicated streaming-service branches.

## Constraints / Dependencies

- Must align with existing node identity/type and run-connection ownership rather than introducing a parallel heuristic.
- Must not require a browser bridge for remote/Docker nodes.
- Must not suppress explicit user selection of the **Browser** panel.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: None expected.
- Required outcome (`Not Affected`/`Directly Usable — No Migration`/`Discard or Rebuild`/`Migration Required`/`Undetermined`): Not Affected
- Existing data to preserve, discard/rebuild, transform, or quarantine: N/A
- Unacceptable data loss or corruption: Any persisted node or run configuration change is outside scope.
- Relevant availability, maintenance-window, or rollout constraints: None expected.
- Related requirement and acceptance-criteria IDs: R-001 through R-004; AC-001 through AC-004

## Assumptions

- Each desktop renderer window is bound to exactly one configured node, and its standalone/team WebSocket streams are created from that bound node's endpoints.
- `windowNodeContextStore.isEmbeddedWindow` remains the authoritative renderer-level embedded-node classification for this scope.

## Risks / Open Questions

- The Browser shell store currently absorbs Electron focus errors and sets `lastError`, so the browser-success handler's surrounding `try/catch` cannot use a rejected promise as an eligibility signal. This pre-existing error-propagation shape is not a substitute for the authoritative node gate; broader command-result redesign is outside scope.
- The Browser tab remains manually visible in remote Electron windows because it is a general desktop Browser surface. Hiding or repurposing it for remote nodes is outside scope.

## Requirement-To-Use-Case Coverage

| Requirement ID | UC-001 | UC-002 |
| --- | --- | --- |
| R-001 | Yes | N/A |
| R-002 | N/A | Yes |
| R-003 | Yes | Yes |
| R-004 | Yes | Yes |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criterion | Scenario Intent |
| --- | --- |
| AC-001 | Remote/Docker-node regression: preserve current panel and remote URL-open outcome. |
| AC-002 | Embedded-node regression: preserve Electron-visible Browser auto-focus. |
| AC-003 | Unit/component validation of the authoritative capability decision and rejection of heuristics. |
| AC-004 | Cross-surface coverage for individual and team run presentation paths, proportionate to actual reuse discovered. |

## Approval Status

Approved by the user on 2026-08-30 after confirming that backend `TOOL_EXECUTION_SUCCEEDED` must remain the truthful tool-lifecycle event and that only the frontend's Electron Browser focus/selection side effect should be gated. No intended-behavior supplement applies.
