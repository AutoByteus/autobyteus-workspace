# Docs Sync Report — node-vocabulary (autobyteus-290)

- Integrated base: `origin/personal` `034bfe51ab` (design-cases, the stored-names rule, test-and-tooling-hygiene, `1.5.9-beta.4`), merge `5ce5291fa2`.
- `DESIGN.md` conflicted: the base added nothing where this branch adds the "Domain vocabulary" pointer to `GLOSSARY.md`. Delivery kept the pointer, so the merged file is `personal`'s plus that pointer, and rule 10 appears once.
- `data_migration_guideline.md` merged identical to `personal`.

| Docs | Result | Notes |
| --- | --- | --- |
| `GLOSSARY.md` (new), `DESIGN.md` pointer | No change | The pointer resolves. |
| The 22 other docs the ticket changes (`collaboration_model.md`, `remote_collaboration.md`, `memory_sync.md`, `remote_access.md`, `agent_tools.md`, `agent_communication.md`, `agent_memory.md`, web `settings.md`, `memory.md`, `electron_packaging.md`, READMEs and others) | No change | Current names match the code: `list_peer_nodes`, `memorySyncSourceId`, `node-identity.json`, `memory-sync-source.json`, `NODE_IDENTITY_NOT_MIGRATED`. Remaining old names are only the intended migration notes (`memory_sync.md:82`, `remote_access.md:125`), the published `v1.5.8` notes and design-case 7's history. |

- Docs updated by delivery: none.
- Release-note text for the next release: `release-notes.md` in this folder (the tool rename and the stored-name conversion).
