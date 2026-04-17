# Executable Validation - desktop-invalid-package-agent-definitions

## Scope
- This fix is a small authoritative-boundary utility patch, so focused unit validation plus a live-path manual resolver check is sufficient.

## Validation Evidence
1. Focused unit tests:
   - Command:
     - `pnpm --dir autobyteus-server-ts exec vitest run tests/unit/application-bundles/bundled-application-resource-root.test.ts tests/unit/application-packages/application-package-root-settings-store.test.ts`
   - Result:
     - `2` test files passed
     - `5` tests passed
   - Covered behaviors:
     - exact bundled `applications` directory still resolves correctly
     - differently cased `Applications` directory does not match
     - application package root settings behavior remains intact
2. Manual reproduced-path check on the affected macOS machine:
   - `/applications` exists
   - `/Applications` exists
   - Patched resolver output for packaged server root:
     - `/Applications/AutoByteus.app/Contents/Resources/server`
   - Interpretation:
     - the resolver no longer falls through to `/` and no longer treats the system macOS Applications folder as the built-in AutoByteus source

## Notes
- An earlier `pnpm --dir autobyteus-server-ts test -- --run ...` invocation expanded into a broader suite and was not used as ticket evidence.
- No packaged-app rebuild was performed inside this ticket worktree; the fix is ready for the next desktop build/release pipeline run.
