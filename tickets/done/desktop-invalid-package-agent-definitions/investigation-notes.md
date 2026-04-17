# Investigation Notes - desktop-invalid-package-agent-definitions

## Context
- User installed the newest packaged AutoByteus desktop release from the website/GitHub release pipeline and immediately hit an Agents-page startup failure.
- Visible UI symptom:
  - `Error loading agent definitions: Unable to fetch agent definitions at this time.`

## Runtime Evidence
- Desktop app log:
  - `/Users/normy/.autobyteus/logs/app.log`
- Repeated backend failure on `2026-04-17`:
  - `Error fetching all agent definitions: Error: Invalid package /Users/normy/.autobyteus/server-data/application-packages/platform/applications/Visual Studio Code.app/Contents/Resources/app/node_modules.asar`
- The same invalid-package error also hits:
  - `applicationPackages`
  - `agentTeamDefinitions`
- Therefore the issue is broader than one page render; package enumeration/loading is poisoning multiple catalog reads.

## Local Data Evidence
- Runtime data root exists:
  - `/Users/normy/.autobyteus/server-data`
- Application package registry exists:
  - `/Users/normy/.autobyteus/server-data/application-packages/registry.json`
- Failing package path resolves under:
  - `/Users/normy/.autobyteus/server-data/application-packages/platform/applications/Visual Studio Code.app/Contents/Resources/app/node_modules.asar`

## Confirmed Root Cause
- Packaged desktop log confirms server app root on `2026-04-17`:
  - `/Applications/AutoByteus.app/Contents/Resources/server`
- `BuiltInApplicationPackageMaterializer` resolves the built-in source root by walking upward and checking whether each parent appears to contain `applications/`.
- On this macOS machine, both paths exist:
  - `/Applications`
  - `/applications`
- Because the filesystem is case-insensitive, the resolver's `existsSync('/applications')` check succeeds when it reaches `/`.
- That causes the built-in materializer to treat the host machine's system `/Applications` folder as the AutoByteus bundled built-in application source.
- Materialization then copies editor app bundles such as:
  - `Visual Studio Code.app`
  - `Z Code.app`
- The copied app bundles are not valid AutoByteus application packages, so later catalog reads fail on nested bundle internals like `node_modules.asar`.

## Working Hypotheses Closed
1. Application package discovery alone is not the primary bug; the pollution happens earlier during built-in package materialization.
2. The first required fix belongs in bundled application source-root resolution on macOS.
3. Optional follow-up hardening may still be warranted later so one bad package cannot poison all catalog reads, but that is not required to fix the reproduced regression.

## Next Checks
- Patch the bundled application resource root resolver to require an exact `applications` directory match.
- Add regression coverage for the `/applications` versus `/Applications` false-match scenario.
- Validate that the broken local data shape no longer repopulates from the macOS system Applications folder.

## Scope Triage
- Tentative scope: `Small`
- Reason:
  - Live evidence points to one bounded failure path in application-package discovery/loading.
  - The likely remediation is a targeted guard/filter and/or per-package fault isolation with focused regression coverage.
