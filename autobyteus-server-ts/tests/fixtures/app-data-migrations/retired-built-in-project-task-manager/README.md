# Retired built-in Project Task Manager: installed copy

`agent.md` and `agent-config.json` are the exact bytes of the retired template
`src/built-in-agents/templates/project-task-manager/` as shipped in
`v1.4.95-beta.2` and `v1.4.95-beta.3` (blobs `15faed8d…` and `c5a85222…`; same at
`1aa918298`). The beta bootstrapper installed them with `fs.copyFile` into
`<appData>/agents/autobyteus-project-task-manager/`, so an upgraded install holds
these bytes. `v1.4.95-beta.1` shipped the same two-file layout with an older text.

- `agent.md` sha256: `bfb34934ecf9522c7d88eee4385052c3e8aa82f400077932e7906782e7b7213a`
- `agent-config.json` sha256: `7606676c2a35bd58ab2ba1988034d95d3b2049b8eff356c615ea777f72ed2b96`
- Reproduce: `git show 1aa918298:autobyteus-server-ts/src/built-in-agents/templates/project-task-manager/<file>`

Used only as the source shape of the
`20261006_remove_built_in_project_task_manager` migration in
`tests/e2e/app-data-migrations/remove-built-in-project-task-manager-startup.e2e.test.ts`.
