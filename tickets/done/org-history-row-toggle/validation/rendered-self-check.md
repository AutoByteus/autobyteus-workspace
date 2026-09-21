# Rendered Self-Check — IR-001

## Surface And References

- Surface: AgentOrg run rows in the workspace-history collection.
- Approved references: `requirements-doc.md`, `design-spec.md`, and the two user-supplied AgentOrg/Team screenshots recorded there.
- Adjacent product pattern: the existing Agent Team primary-row disclosure interaction.
- Rendered implementation surface used: the real `WorkspaceAgentOrgHistoryCollection.vue` mounted by the real-tree-state `WorkspaceAgentOrgDisclosure.spec.ts` Vue test harness.

## States And Interactions Exercised

1. Collapsed primary row exposes `aria-expanded="false"` and no `aria-controls`.
2. First primary-row activation expands the exact Org hierarchy, exposes `aria-expanded="true"` plus the exact hierarchy ID, and invokes the exact open action once.
3. Repeated activation of the same primary row collapses the hierarchy, returns ARIA state to collapsed, and invokes the same exact open action again without clearing selection.
4. Stop remains isolated: it invokes termination only and does not toggle or open the row.
5. Chevron remains disclosure-only: it toggles the hierarchy without invoking the open action.
6. Existing mounted-Team selection and selection-ancestry reveal behavior remain exercised by the focused suite.
7. Both active and stopped AgentOrg rows exercise the bidirectional primary interaction.

## Result

- The interaction now matches the approved Team-like behavior without a visual redesign.
- No layout, spacing, typography, icon, color, responsive, or localization changes were introduced.
- Semantic button keyboard activation follows the same primary handler and the exposed disclosure state is accurate.

## Limitation

No independent real-browser/API-E2E session was started during implementation. The component-level rendered DOM and interaction path were exercised locally; downstream API/E2E still owns browser validation against a real AgentOrg history row.
