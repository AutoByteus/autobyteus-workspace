# Rendered Self-Check — IR-001

## Surface And References

- Surface: top-level AgentOrg run rows in the Workspaces history sidebar.
- Approved behavior: one Team-like primary control containing the chevron, status, and summary; Stop remains separate.
- References inspected: current AgentOrg and Agent Team component implementations, the archived predecessor's stopped-Org screenshot, and its Team-comparator screenshot.
- Rendered implementation surface: the real `WorkspaceAgentOrgHistoryCollection.vue` mounted with real workspace-history tree state by `WorkspaceAgentOrgDisclosure.spec.ts`; the real Pinia/sidebar family-publication boundary is exercised by `WorkspaceHistoryFamilyPublication.spec.ts`.

## Structure And Interaction Exercised

1. Each exact Org run has one `button[type="button"][role="treeitem"]` primary summary control.
2. The chevron is a presentational, `aria-hidden` child of that primary button, has no role/tab index/disclosure ARIA, and is not a nested or sibling button.
3. Clicking the summary span calls the exact-root toggle once and exact Org open action once.
4. Clicking the chevron pixels bubbles through the same primary handler and calls each owner exactly once; no double toggle occurs.
5. The primary button alone owns accurate `aria-expanded`, conditional exact `aria-controls`, `aria-selected`, and `aria-current`.
6. Native button semantics supply one focus target and normal Space/Enter activation without a custom keyboard handler.
7. Active-run Stop remains a separate sibling button; its click changes neither disclosure nor open-call counts.
8. Active/stopped rows, sibling isolation, mounted-Team selection, selection-ancestry reveal, draft/conversation identity, refresh, and selected-root collapse remain exercised.

## Visual Review

- The moved icon reuses the existing glyph, rotation transition, size, and gray color.
- Its new `mr-1`, `h-3.5`, `w-3.5`, and `flex-none` placement matches the established Agent Team primary-row pattern.
- Removing the former 20px button wrapper eliminates the extra independent hover/focus target without changing typography, lifecycle dot, summary, Stop, timestamp, or hierarchy layout.

## Result And Limitation

- No visual or interaction defect remained in the mounted component checks.
- No user server/profile or broad API/E2E environment was started. Independent downstream browser validation remains required for a real sidebar row, especially native Space/Enter behavior and pointer targeting at desktop sidebar dimensions.
