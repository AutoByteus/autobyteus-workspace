## AgentOrg History Actions

- Stopped top-level AgentOrg history rows now provide **Archive** and **Delete**
  actions consistent with stopped Agent Team history.
- Archive hides the history row while retaining its complete stored run package.
- Delete requires an AgentOrg-specific confirmation and permanently removes only
  the explicitly selected stopped run.
- Active AgentOrgs remain protected and keep their normal Stop action.
- Failed operations retain the row, selection, context, and route so users can
  retry deliberately.
- English and Simplified Chinese confirmation text now identifies AgentOrg
  history explicitly.

### Compatibility

- Existing AgentOrg definitions, referenced Agents and Teams, workspaces,
  sibling histories, and providers are not deleted by these actions.
- No data migration or archived-history browser is introduced.

