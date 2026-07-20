# Requirements Doc

## Status

Design-ready — approved by the user after investigation and reproduction.

## Goal / Problem Statement

Prevent malformed Mermaid diagrams rendered inside application Markdown from creating document-level fallback error SVGs and an unexpected outer scrollbar. A Mermaid failure must remain an application-owned, bounded error state inside the diagram's existing render surface. Valid diagrams and the existing Electron/web navigation behavior must remain unchanged.

## Current And Desired Behavior (Mandatory)

| Behavior ID | Current Behavior | Desired Behavior | Preserved / Unchanged Behavior | Related Requirement / Acceptance-Criteria IDs |
| --- | --- | --- | --- | --- |
| BEH-MER-001 | An invalid Mermaid segment reaches mermaid.render; Mermaid 11.12.3 creates a fallback error SVG under document.body, then rejects. MermaidDiagram catches the rejection and shows its local error state, but the fallback remains outside the app shell. | A failed Mermaid render rejects without leaving fallback nodes in document.body; the existing local MermaidDiagram error state is the only user-visible error surface. | Error handling remains local to the diagram renderer; no error is silently treated as a valid diagram. | REQ-MER-001, REQ-MER-002; AC-MER-001, AC-MER-002 |
| BEH-MER-002 | The workspace shell and event-monitor feed are bounded with internal scrolling, but leaked body children extend the document below the app and create an outer bottom scroll area. | The application viewport remains bounded after Mermaid failures; only the owning conversation/feed surface may scroll according to its existing layout. | Existing workspace pane, Tasks, Settings, and strip/drawer layout behavior remains unchanged for valid content. | REQ-MER-003; AC-MER-003 |
| BEH-MER-003 | Valid Mermaid diagrams render as inline SVG and can be expanded in the existing viewer. | Valid Mermaid diagrams continue to render and expand exactly as before. | Existing SVG interaction, external-link forwarding, and viewer lifecycle remain unchanged. | REQ-MER-004; AC-MER-004 |
| BEH-MER-004 | Each repeated invalid diagram can leave another body-level fallback node, so the visible overflow grows with the number of failures. | Any number of invalid diagrams leaves no Mermaid fallback nodes after rejection or rerender. | Multiple Mermaid segments remain independently renderable and independently report errors. | REQ-MER-001, REQ-MER-003; AC-MER-001, AC-MER-003 |
| BEH-MER-005 | The failure is a DOM/layout side effect; no evidence shows router state or URL mutation. | Mermaid failures do not navigate, mutate the URL, or create a browser/native external-link action. | Existing explicit link handling remains unchanged. | REQ-MER-005; AC-MER-005 |
| BEH-MER-006 | The local error message has no explicit maximum-width/wrapping boundary of its own. | The application-owned Mermaid error state is width-constrained and wraps long parser messages without widening its parent. | Existing localized loading/error copy and accessible error semantics remain available. | REQ-MER-002; AC-MER-006 |

## Investigation Findings

- The reported red bomb / “Syntax error in text / mermaid version 11.12.3” is Mermaid's built-in fallback error SVG, not the local error card in MermaidDiagram.vue.
- Mermaid 11.12.3 defaults suppressErrorRendering to false. On a parse failure it appends an error diagram under document.body; the public promise rejects afterward.
- A direct JSDOM probe reproduced one leaked body subtree per invalid render and reproduced the exact Mermaid fallback text. With suppressErrorRendering: true, the body remained unchanged.
- The existing workspace shell already uses h-screen/h-[100dvh], overflow-hidden, min-h-0, and an internal conversation overflow-y-auto; the outer scroll is therefore not the intended feed scroll path.
- No backend, persisted-data, URL, or Electron native-file path is involved in this failure.

## Relevant Supplemental Task Artifacts

| Artifact Path | Type / Purpose | Related Requirement IDs | Related Acceptance-Criteria IDs | Status / Approval | Relationship To Requirements |
| --- | --- | --- | --- | --- | --- |
| /Users/normy/autobyteus_org/autobyteus-worktrees/event-monitor-mermaid-error-layout-overflow/tickets/in-progress/event-monitor-mermaid-error-layout-overflow/mermaid-body-leak-probe.md | Retained browser-DOM probe and Mermaid vendor-behavior evidence | REQ-MER-001–005 | AC-MER-001–005 | Evidence; approval N/A | Establishes a reproducible cause for the reported outer overflow and verifies the proposed Mermaid configuration boundary. |

## Design Health Assessment (Mandatory)

- Change posture: Bug Fix
- Initial design issue signal: Yes
- Root cause classification: Local Implementation Defect; Missing Invariant
- Refactor posture: Likely Not Needed
- Evidence basis: mermaidService.initialize does not set suppressErrorRendering; Mermaid 11.12.3's failure path appends an error SVG to document.body, while MermaidDiagram.vue assumes a rejected render has no external DOM side effect. The owning service/component boundary is otherwise coherent.
- Requirement or scope impact: Add the missing “renderer failure does not mutate host document layout” invariant and bound the existing local error state. No layout rewrite or backend change is indicated.

## Recommendations

1. Set Mermaid's suppressErrorRendering: true in the existing service initialization. This preserves rejection and lets MermaidDiagram display its existing local error state while preventing Mermaid's fallback body insertion.
2. Add explicit width/min-width/overflow wrapping to the component root and local error message as defense-in-depth.
3. Add a focused regression test at the service/browser boundary and a component test for the bounded local error state. API/E2E should decide the durable browser probe and execute it after implementation review.
4. Do not fix this by hiding body overflow or by removing the local error state; those would conceal the owner defect or make parser failures less diagnosable.

## Scope Classification

Small

## In-Scope Use Cases

- An agent/team Markdown message contains one malformed Mermaid fenced block.
- A message contains several malformed Mermaid blocks.
- A malformed block is rerendered after content changes or component unmount.
- A valid Mermaid block is rendered and expanded.
- The same renderer is used in Electron and normal browser/web mode.

## Out of Scope

- Correcting the source Mermaid diagrams or changing Mermaid syntax.
- Replacing Mermaid or changing its version.
- Redesigning the workspace scroll model.
- Changing Markdown parsing, backend transport, router behavior, Electron file access, or persisted conversation data.
- Suppressing all user-visible Mermaid errors.

## Functional Requirements

- REQ-MER-001 — Suppress library-owned fallback insertion: The Mermaid service must configure Mermaid so parse and render failures do not append fallback error diagrams to document.body or another host outside the caller-owned render surface.
- REQ-MER-002 — Preserve an app-owned failure surface: MermaidDiagram must continue to show its existing localized, bounded error state when the service rejects malformed or otherwise unrenderable content.
- REQ-MER-003 — Preserve viewport containment: After one or more Mermaid failures, the application document must not gain height from Mermaid error nodes or otherwise expose an outer scrollbar caused by those failures.
- REQ-MER-004 — Preserve valid rendering: Valid Mermaid content must continue to produce the existing inline SVG and viewer behavior.
- REQ-MER-005 — Preserve navigation/data boundaries: Mermaid failures must not mutate browser URL/router state, invoke external-link handlers, access the backend, or write persisted data.
- REQ-MER-006 — Bound error text: Long parser messages must wrap within the Mermaid component and must not widen its Markdown or workspace parent.

## Acceptance Criteria

- AC-MER-001: Given invalid Mermaid content, after the render promise rejects, no Mermaid-generated fallback element or error SVG remains appended to document.body.
- AC-MER-002: Given invalid Mermaid content, the owning MermaidDiagram displays its local error state and no expand/viewer action is offered.
- AC-MER-003: Given one or more invalid Mermaid segments in an Event Monitor message, the document's outer height does not increase from Mermaid error nodes and the existing bounded feed remains the only scroll surface.
- AC-MER-004: Given valid Mermaid content, the existing inline SVG, expand button, viewer, focus restoration, and link forwarding continue to pass their current coverage.
- AC-MER-005: Rendering a Mermaid failure produces no URL change, router navigation, external-link call, backend request, or persisted-data write.
- AC-MER-006: A long Mermaid parser error is contained within the component width and wraps without horizontal expansion of the parent renderer.
- AC-MER-007: Repeated invalid renders and content updates leave no accumulated Mermaid fallback nodes after each rejection/unmount.

## Constraints / Dependencies

- Mermaid is currently declared as ^11.12.2 and resolved to 11.12.3 by pnpm-lock.yaml.
- The current app-owned error state is in autobyteus-web/components/conversation/segments/renderer/MermaidDiagram.vue.
- The current Mermaid API boundary is autobyteus-web/services/mermaidService.ts.
- Electron and normal web mode share the Vue renderer; the fix must not depend on Electron-only APIs.
- Existing layout containment is a preserved constraint, not a substitute for cleaning up Mermaid-owned nodes.

## Persisted Data Outcome (When Applicable)

- Stored subject / location: None; this is an in-memory DOM/rendering defect.
- Required outcome: Not Affected.
- Existing data to preserve, discard/rebuild, transform, or quarantine: None.
- Unacceptable data loss or corruption: Conversation content and Mermaid source must not be changed or dropped.
- Relevant availability, maintenance-window, or rollout constraints: None beyond the normal frontend release.
- Related requirement and acceptance-criteria IDs: REQ-MER-005; AC-MER-005.

## Assumptions

- The screenshots' repeated error cards are generated by Mermaid 11.12.3's fallback error renderer.
- The built Electron app uses the same mermaidService.ts and MermaidDiagram.vue shown in this refreshed origin/personal worktree.
- The intended user experience is a localized diagram error inside the message, not a blank message and not a global app error.

## Risks / Open Questions

- The malformed Mermaid source(s) that triggered the production screenshots are not available in the ticket context; the direct invalid-text probe reproduces the renderer failure path rather than the exact source.
- Browser/Electron execution should verify that suppressErrorRendering covers both parse and renderer exceptions for the installed Mermaid version.
- The local error card's exact responsive styling should be confirmed by implementation-scoped rendering checks.

## Requirement-To-Use-Case Coverage

| Use Case | Requirements |
| --- | --- |
| Invalid single diagram | REQ-MER-001, REQ-MER-002, REQ-MER-003, REQ-MER-006 |
| Multiple invalid diagrams | REQ-MER-001, REQ-MER-003, REQ-MER-006 |
| Valid diagram and viewer | REQ-MER-004 |
| Cross-host navigation/data boundary | REQ-MER-005 |
| Rerender/unmount cleanup | REQ-MER-001, REQ-MER-003, REQ-MER-006 |

## Acceptance-Criteria-To-Scenario Intent

| Acceptance Criteria | Scenario Intent |
| --- | --- |
| AC-MER-001 | Real Mermaid invalid parse/render probe inspects document.body after rejection. |
| AC-MER-002 | Component test verifies local error state and no viewer control. |
| AC-MER-003 | Browser/E2E probe measures document/viewport height and scroll surfaces after repeated failures. |
| AC-MER-004 | Existing MermaidDiagram viewer suite remains green. |
| AC-MER-005 | Focused spy/trace verifies no route/external/backend side effect. |
| AC-MER-006 | Component/browser layout assertion verifies width containment and wrapping. |
| AC-MER-007 | Repeated content-update/unmount probe checks no leaked IDs or body children. |

## Approval Status

Approved by the user on 2026-07-20 after the Mermaid body-leak reproduction was reported. The proposed bug-fix scope and acceptance criteria are locked for architecture review.
