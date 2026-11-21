# Design Spec

## Solution And Approval Basis

- Current solution revision ID: `SR-001`
- Approved requirements: `requirements-doc.md` at SR-001 (Solution Designer within the direction, user informed, 2026-11-21).
- Design status: `Ready`
- Authorities read (this conversation): `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `references/project-documents.md`.

## Current-State Read

The coverage rule (`scripts/mobile-build-checks.mjs:54-67`, `demoOperationCoverage(publicDir, webRoot)`) takes a build directory and reads compiled operations from it (`compiledOperations`, `:36-41`); `build-mobile-web.mjs:75-83` runs it after `--demo` builds. The only local test (`scripts/__tests__/mobileBuildChecks.spec.ts`) uses synthetic fixtures. The phone build compiles every operation defined in the web source (investigation: 252 = 252).

## Task Size And Architectural Risk

- Task size: `Small` — one JSON list, one checks module (a source reader and an operations-set input), one spec, one `TESTING.md` rule.
- Architectural risk: `Low` — build tooling and tests only; no product code, contract, security or persistence change.
- Escalation trigger: the source set and the compiled set diverge (see Risks).

## Design Decisions

- **D-1 The list.** `demo/graphql/unreachable-operations.json`: add the four operations with reason `memory`; remove `ListAgentRunsWithMemory`. Keep the file's ordering convention.
- **D-2 One rule, two inputs.** `demoOperationCoverage` takes the operation names as a set instead of a build directory: `demoOperationCoverage(operations: Set<string>, webRoot)`. `build-mobile-web.mjs` passes `compiledOperations(mobileOutputDir)` (unchanged behavior). New `sourceOperations(webRoot)` in the same module: every operation name defined in the web source (`.ts`, `.vue`, `.js`, `.mjs`), skipping `node_modules`, `demo/`, `generated/`, tests (`__tests__`, `tests/`), `.nuxt`, `.output`, `dist*`, `electron-dist`, using the module's existing `OPERATION` pattern (one owner of what counts as an operation).
- **D-3 The local check.** A case in `scripts/__tests__/mobileBuildChecks.spec.ts` (or a sibling spec in the same folder) runs `demoOperationCoverage(sourceOperations(webRoot), webRoot)` on the real repository and expects no unanswered, stale or unexplained names, with the names in the failure message. It runs in the web unit suite (`pnpm -C autobyteus-web test:nuxt`; the suite has no include restriction). The existing synthetic cases adapt to the set input.
- **D-4 The testing guideline.** `TESTING.md` "Choosing the path" gains a row (written by the API/E2E engineer, its owner): a change to GraphQL operations (`autobyteus-web/graphql/**` or an operation defined elsewhere in the web source) or to the demo node (`autobyteus-web/demo/**`) runs `scripts/__tests__/mobileBuildChecks.spec.ts` and `pnpm -C autobyteus-web build:mobile-web --demo` (after `pnpm --filter "{./autobyteus-web}^..." run build` on a fresh worktree).

## Change Scope

- In scope: `autobyteus-web/demo/graphql/unreachable-operations.json`, `autobyteus-web/scripts/mobile-build-checks.mjs`, `autobyteus-web/scripts/build-mobile-web.mjs` (the call), `autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts`, `TESTING.md`.
- Derived consumers of `demoOperationCoverage`: `build-mobile-web.mjs` and the spec (search for others; none expected).
- Left alone: the rule's outcomes, the `/mobile` build's demo-code check, the demo handlers.
- Follow-ups: None.

## Removal Plan

| Item | Why |
| --- | --- |
| `ListAgentRunsWithMemory` list entry | Its document was removed by autobyteus-554 |

## Risks

- R-1: if the phone build ever stops compiling an operation defined in the source, the build check calls its list entry stale while the source check requires it. That shows at the next demo build; reconcile both then (the build check stays the authority).

## Proof (REQ-004)

1. The new spec case fails on the base list (naming the five problems) and passes after D-1.
2. `autobyteus-ios/scripts/prepare-demo-web.sh --build` passes locally.
3. A build-only iOS release workflow run on the ticket branch passes: `gh workflow run release-ios.yml --ref codex/ios-demo-operation-coverage -f publish_app_store_connect=false -f release_ref=codex/ios-demo-operation-coverage` (check the input names in `release-ios.yml:7-30` first); no tag.

## Guidance For Implementation

- Reproduction: `autobyteus-ios/scripts/prepare-demo-web.sh --build` on the base fails with the CI message (`evidence/reproduction/prepare-demo-web-build-base.log`).
