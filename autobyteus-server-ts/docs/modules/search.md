# Search

## Scope

Where search lives in the server.

- **Workspace files:** file search is part of the file explorer and workspace APIs (`src/file-explorer/search-strategy`,
  [file_search.md](./file_search.md)).
- **Meaning search:** the [embedding layer](./embeddings.md) (`src/embeddings/`) finds the items of a collection most
  similar to a text with a local model. Its first user is [Project Task search](./projects.md#project-task-search)
  (`src/projects/search/`), behind the board search and the `search_project_tasks` agent tool.
