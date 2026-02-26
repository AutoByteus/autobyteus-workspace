# Implementation Plan

- status: Finalized (pre-implementation)
- ticket: desktop-release-linux-macos-arm64

## Scope
- Update release CI workflow to enforce personal flavor and explicit mac arm64 target.
- Update build target resolution logic to honor explicit architecture flags.
- Sync release documentation with actual workflow behavior.

## Task Breakdown
1. `TASK-REL-001` Modify `.github/workflows/release-desktop.yml`
- add `AUTOBYTEUS_BUILD_FLAVOR=personal` to mac and linux build jobs
- run mac build as `pnpm build:electron:mac -- --arm64`

2. `TASK-REL-002` Modify `autobyteus-web/build/scripts/build.ts`
- parse optional `--arm64` / `--x64` args
- produce deterministic target map for platform-specific builds
- preserve existing multi-platform (`ALL`) behavior

3. `TASK-REL-003` Modify `autobyteus-web/docs/github-actions-tag-build.md`
- align workflow file name and trigger description
- align publish behavior with current `action-gh-release`
- document personal flavor forcing and arm64-only mac release path

## Verification Plan
- `VER-REL-001` Build script compile validation:
  - command: `pnpm --dir autobyteus-web transpile-build`
  - expected: success
- `VER-REL-002` Workflow lint/sanity:
  - command: `actionlint` (if available) or `npx actionlint`
  - expected: no workflow syntax issues
- `VER-REL-003` Target resolution smoke check:
  - command: inspect script + workflow command path ensures `--arm64` passes into build target map
  - expected: mac path resolves arm64 target only

## Requirement Traceability
- `REQ-REL-001` <- `TASK-REL-001`
- `REQ-REL-002` <- `TASK-REL-001`, `TASK-REL-002`
- `REQ-REL-003` <- `TASK-REL-001`
- `REQ-REL-004` <- `TASK-REL-001`
- `REQ-REL-005` <- `TASK-REL-001`, `TASK-REL-002`
