# Implementation - desktop-invalid-package-agent-definitions

## Scope
- `Small`

## Solution Sketch
- Tighten `resolveBundledApplicationResourceRoot(...)` so it recognizes only an exact child entry named `applications`, instead of relying on `existsSync` path resolution that is vulnerable to case-insensitive false matches on macOS.
- Keep the existing fallback behavior when no exact bundled `applications` directory exists:
  - return the packaged server app root,
  - let built-in materialization create an empty managed `platform/applications` directory,
  - do not copy host-machine application bundles into `server-data`.
- Add focused unit coverage for:
  - exact bundled `applications` discovery,
  - negative case where only `Applications` exists and must not match `applications`.

## Execution Plan
1. Update the bundled application resource root utility.
2. Add unit tests that reproduce the case-sensitive intent of the resolver.
3. Run focused server unit tests for the resolver and application-package root settings.

## Expected User Impact
- Existing broken installs stop re-populating `platform/applications` from the macOS `/Applications` folder after restart with the fix.
- Users without real built-in platform applications will simply have an empty built-in package instead of a poisoned one.
