# Future-State Runtime Call Stack - desktop-invalid-package-agent-definitions

## UC-001 Desktop Startup Without Bundled Platform Apps
1. Desktop packaged server starts with app root `/Applications/AutoByteus.app/Contents/Resources/server`.
2. `BuiltInApplicationPackageMaterializer.ensureMaterialized()` asks `resolveBundledApplicationResourceRoot(appRootDir)` for the bundled application source root.
3. The resolver walks ancestors and enumerates actual child entries for each candidate directory.
4. Because the packaged app does not contain an exact child directory named `applications`, the resolver does not treat `/applications` as a match for macOS `/Applications`.
5. The resolver returns the original packaged server app root.
6. Materializer checks `<appRoot>/applications`, finds nothing, and creates an empty managed platform directory under `~/.autobyteus/server-data/application-packages/platform/applications`.
7. `ApplicationPackageService` lists the built-in package with `applicationCount = 0`, so platform applications stay hidden/empty.
8. `agentDefinitions` and `agentTeamDefinitions` continue loading from their normal providers without failure.

## UC-002 Desktop Startup With Real Bundled Platform Apps
1. Future packaged builds that intentionally include `<bundled-root>/applications/<app-id>/application.json` still satisfy the resolver.
2. Materializer copies only that exact bundled application package tree into managed runtime storage.
3. Built-in platform apps appear normally without touching unrelated host files.
