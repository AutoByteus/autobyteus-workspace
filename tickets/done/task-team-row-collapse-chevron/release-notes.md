# Release Notes — Collapsible delegated Team rows in the Agent Org tree

## Changed

- **Delegated Team rows can now be collapsed.** In the Workspaces Agent Org tree, a Team started by delegation (for example, **StudentStudyGroup — Started by Teacher**) now has the same chevron as a normal Team row. Clicking the row, or pressing Enter/Space, hides or shows its members and nested runs and opens its coordinator, the same as a normal Team row.
- **Each delegation is independent.** Collapsing one delegated Team does not affect a normal Team with the same name or another delegation of the same Team. A delegated Team stays collapsed when new activity updates the tree.
- Delegated Teams start expanded, as before.

## Known limitations

- Collapse state is not saved. It resets when the app reloads.
- Selecting a member of a collapsed delegated Team elsewhere does not expand that Team automatically.
