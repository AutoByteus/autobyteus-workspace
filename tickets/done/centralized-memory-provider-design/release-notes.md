# Release Notes: Memory Sync / Memory Hub

- Added embedded Memory Sync so an AutoByteus server can act as a Memory Hub, a source node, or both.
- Added Nodes -> Memory Sync setup for hub/source configuration, advertised hub URL candidates, source token creation/regeneration/revocation, Test Connection, Sync Now, background sync settings, and import summaries.
- Added hub ingestion endpoints under `/rest/memory-sync/v1/*` and GraphQL Memory Sync status/config/import APIs.
- Added read-only imported memory browsing in the Memory page with a Local Memory default and imported source selector.
- Preserved existing local runtime memory layout under `memory/agents` and `memory/agent_teams`; imported corpora are stored separately under `memory/imports/<sourceNodeId>`.
- Added durable backend multi-process E2E coverage that validates source-server-to-hub-server sync over real HTTP with isolated app-data directories.
- Documented token behavior, Docker/Kubernetes URL guidance, imported read-only semantics, validation boundaries, and current v1 limits.
- Added English and Simplified Chinese localization coverage for the new Memory Sync and imported-memory UI labels so standard desktop packaging passes localization audits.
