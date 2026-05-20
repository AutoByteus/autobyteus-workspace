# Release Notes

- Remove obsolete cross-node synchronization for agents, agent teams, and MCP configuration.
- Remove Sync actions from Agent and Agent Team catalog cards/lists; keep Reload as the catalog update action.
- Make Agent and Agent Team Reload refresh local backend definition catalogs from configured package/Git/folder sources before refetching.
- Simplify Settings → Nodes to node registration, capability display, phone access, Docker guidance, and remote browser sharing without bootstrap/full-sync controls.
- Remove legacy node-sync GraphQL APIs, backend services, frontend sync store/components/types, personal Docker remote-sync helper path, and stale sync documentation.
