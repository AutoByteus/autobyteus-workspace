# File Search

## Scope

Search support inside workspace/file-explorer flows.

## TS Source

- `src/file-explorer/search-strategy`
- `src/file-explorer/operations`
- `src/file-explorer/search-snapshot`
- `src/api/graphql/graphql-request-context.ts`

## Notes

File search is implemented as part of the file explorer module rather than a standalone top-level module. Search is a snapshot request/response path: it does not acquire live watcher leases or depend on watcher state. GraphQL request aborts are propagated into `WorkspaceSearchSnapshotController`, which cancels stale waits and aborts an unshared full-tree snapshot/index refresh when the final caller goes away.
