# Investigation Notes

- Ticket: `linux-appimage-memory-dir-startup`
- Last Updated: `2026-04-02`

## Sources Consulted

- User-provided Linux AppImage startup logs for `AutoByteus_personal_linux-1.2.52.AppImage`
- `autobyteus-server-ts/src/app.ts`
- `autobyteus-server-ts/src/config/app-config-provider.ts`
- `autobyteus-server-ts/src/config/app-config.ts`
- `autobyteus-server-ts/src/mcp-server-management/providers/file-provider.ts`
- `autobyteus-server-ts/docs/README.md`
- `autobyteus-server-ts/docs/URL_GENERATION_AND_ENV_STRATEGY.md`
- `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md`
- `autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
- `autobyteus-server-ts/tests/unit/run-history/team-member-run-view-projection-service.test.ts`
- `git blame -L 60,90 autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
- `git show 03b8f9a -- autobyteus-server-ts/src/run-history/services/team-member-run-view-projection-service.ts`
- `tickets/done/runtime-domain-subject-refactor/handoff-summary.md`

## Key Findings

1. Electron is already passing the correct runtime data directory to the embedded server.
- `autobyteus-web/electron/server/linuxServerManager.ts` launches the server with `--data-dir ${this.appDataDir}`.
- The user log shows `--data-dir /home/ryan-ai/.autobyteus/server-data`, so the CLI wiring is not the defect.

2. `autobyteus-server-ts/src/app.ts` applies `setCustomAppDataDir()` before `config.initialize()`.
- This startup contract is correct in principle.
- The failure therefore requires some code path to resolve the memory directory before `initializeConfig(options)` finishes.

3. The crash is caused by a top-level eager memory-layout construction during module import.
- `team-member-run-view-projection-service.ts` defines:
  - `const teamMemberMemoryLayout = new TeamMemberMemoryLayout(appConfigProvider.config.getMemoryDir());`
- Because that line runs during module evaluation, `AppConfig` still points at its default `dataDir = appRootDir`.
- In an AppImage build, that default root is the mounted packaged server path under `/tmp/.mount_*/resources/server`, which must not be used for runtime persistence.

4. Current code search shows this is the only top-level `getMemoryDir()` call in `autobyteus-server-ts/src`.
- Other `getMemoryDir()` usages are inside constructors, factory functions, default parameters, or request-time methods.
- This makes the regression scope small and targeted.

5. Git history identifies the regression introduction precisely.
- `git blame` shows the eager line was introduced in commit `03b8f9a5612bb5e534279427c3063e5da0ef0e5b` on `2026-03-30`.
- Commit subject: `Tighten run provisioning and projection contracts`.
- The commit added team-member metadata `memoryDir` derivation by introducing `TeamMemberMemoryLayout`, but it instantiated the layout eagerly at module scope instead of lazily at use time.

6. The current startup architecture doc already expects bootstrap-before-instantiation ordering.
- `docs/README.md` and `docs/design/startup_initialization_and_lazy_services.md` both say CLI args and `--data-dir` must be applied before config-dependent services are instantiated.
- Current implementation only partially satisfies that rule because `src/app.ts` statically imports the wider runtime graph before it parses CLI args.

7. `AppConfigProvider` still permits pre-bootstrap construction of `AppConfig`.
- `src/config/app-config-provider.ts` lazily constructs `new AppConfig()` on first access with no startup context.
- That means any module imported before bootstrap can materialize a config object with the default `dataDir = appRootDir`.

8. `AppConfig` constructor logging is truthful only for its default fallback, not for effective startup configuration.
- The constructor currently logs `Data directory: <appRootDir>` immediately.
- In normal desktop startup, that is later overridden by `setCustomAppDataDir()`, so the early log is misleading even when runtime behavior becomes correct afterward.

9. At least one additional module in touched startup-sensitive scope still derives a config path eagerly at module scope.
- `src/mcp-server-management/providers/file-provider.ts` defines:
  - `const filePath = path.join(appConfigProvider.config.getAppDataDir(), "mcps.json");`
- This is the same class of lifecycle smell even if current startup order happens not to trigger a production failure there.

10. Packaged executable validation proves the earlier bugfix works, but also highlights the misleading early logs.
- The locally built patched AppImage reached `running` and used `/home/ryan-ai/.autobyteus/server-data/**`.
- The logs still printed the constructor-time default `Data directory: /tmp/.mount_.../resources/server` before `Custom app data directory set to ...`, which is exactly the reasoning issue the follow-up refactor should remove.

## Root Cause

Original startup crash root cause:

- The March 30, 2026 runtime/projection refactor added import-time evaluation of `appConfigProvider.config.getMemoryDir()` in `team-member-run-view-projection-service.ts`.
- That violated the existing startup contract where the server first binds the custom `--data-dir` and only then resolves runtime persistence paths.

Broader startup design issue now in scope:

- The server entry module still imports the wider runtime graph before bootstrap resolves effective config.
- `AppConfigProvider` can therefore create a default config too early, and `AppConfig` logs a fallback directory before the effective app-data directory is known.

## Scope Triage

- Classification: `Medium`
- Rationale:
  - Fixing the original crash was small.
  - Refactoring startup so config bootstrap precedes runtime import, cleaning up provider/data-flow behavior, and re-validating packaged startup expands the change across multiple files and concerns.

## Implications For Requirements / Design

- The cleanest production data flow is bootstrap-first:
  - parse CLI args,
  - initialize effective config,
  - only then import/start the broader runtime graph.
- The provider/API design should support explicit bootstrap ownership instead of relying on accidental lazy default construction during module import.
- Verification must include packaged Linux build/startup, not only unit coverage.
