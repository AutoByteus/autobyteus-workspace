# Follow-ups — autobyteus-627

| ID | Finding | Evidence | Why not in this ticket | Suggested owner |
| --- | --- | --- | --- | --- |
| FU-627-01 | Application Packages can't import private GitHub repositories. They have their own copy of the GitHub code (`application-packages/utils/github-repository-source.ts`, own `fetch` in `installers/github-application-package-installer.ts:104-109`, generic `downloadFileFromUrl` that logs URLs) | investigation-notes §1.2 | DEC-003: the founder chose Agent Packages + Skills now | New ticket: move Application Packages onto `GitHubRepositoryClient` (which gives them the access rule) |
| FU-627-02 | "Sign in with GitHub" (Device Flow) to obtain the node's GitHub token without creating it by hand | investigation-notes §3 (C, C′) | DEC-004: deferred | New ticket; only changes how the token is obtained |
