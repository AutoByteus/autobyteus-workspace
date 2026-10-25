## Changes
- **The agent tool `list_available_nodes` is now `list_peer_nodes`.** Agents that used it need the new name selected in their tool list; the old name no longer exists. `list_available_agents` is unchanged.

## Upgrade Notes
- **Stored names follow the new vocabulary.** On the first start, the app converts the names of a node's identity, its Remote Collaboration peers and its Memory Sync settings and records to the new names (for example "node ID" and "Memory Sync source ID"). The desktop app's saved node list and the iOS and Android apps' saved nodes are converted the same way. Every value stays the same, and each converted file keeps a backup. Nothing needs to be set up again.
