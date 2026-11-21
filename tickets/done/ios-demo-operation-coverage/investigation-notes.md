# Investigation Notes

## Investigation Meta

- Package: `ios-demo-operation-coverage` (Project Task autobyteus-584)
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage`, `codex/ios-demo-operation-coverage`
- Base: `origin/personal` at `90c4958a35` (the `v1.5.14-beta.4` tag, fetched 2026-11-21); finalization target `origin/personal`
- Bootstrap: `pnpm install --frozen-lockfile` passed (Node v22.23.1)
- Current solution revision ID: `SR-001`
- Authorities read (this conversation): `references/requirements-engineering.md`, `finding-the-cause.md`, `ticket-scope.md`, `project-documents.md`; `TESTING.md`; `DESIGN.md`; `RELEASE.md` (build-only runs)
- Status: complete

## Request

Task autobyteus-584 (PM, from the `v1.5.14-beta.4` release, autobyteus-582): iOS release run `44877725696`, step "Build the bundled demo", failed the demo build's GraphQL operation coverage check (autobyteus-279), so no TestFlight build for beta.4. Cover autobyteus-554's four memory operations, drop the stale entry, make the check run locally when GraphQL documents change, prove it locally and with a build-only iOS workflow run. No release tag.

## Source Log

| Type | Source | Finding |
| --- | --- | --- |
| Code | `autobyteus-web/scripts/mobile-build-checks.mjs:34-67` | The coverage rule: every operation compiled into the demo build's scripts has a handler (`demo/graphql/operations.ts` `DemoOperations`) or an entry in `demo/graphql/unreachable-operations.json` with a defined reason; the list holds nothing else (`stale`), each entry's reason exists (`unexplained`) |
| Code | `autobyteus-web/scripts/build-mobile-web.mjs:73-83` | The rule runs only at the end of `build:mobile-web --demo`, on the built output |
| Code | `.github/workflows/release-ios.yml:162-164,461-463` → `autobyteus-ios/scripts/prepare-demo-web.sh --build` | CI builds the web app's workspace dependencies, then `build:mobile-web --demo` |
| Code | `autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts` | Tests the rule on synthetic fixtures only; nothing applies it to the real repository without a build |
| Code | `demo/graphql/unreachable-operations.json` reason `memory`: "Memory explorer, search, views, sync and work journals: the desktop page /memory only." | The four new operations' home |
| Code | `graphql/queries/semanticMemoryQueries.ts:5,15`; `graphql/queries/memoryExplorerQueries.ts:38,64`; used only by `stores/semanticMemoryFolderStore.ts`, `stores/memoryExplorerStore.ts`, `components/memory/*`, `pages/memory.vue`; no reference from `components/mobile`, `composables/mobile` | The four operations serve only the desktop `/memory` page: unreachable on the phone, reason `memory` |
| Code | `git log` of `unreachable-operations.json` | Last changed by autobyteus-568 (dead GraphQL); autobyteus-554 changed the documents without the list |

## Reproduction

| Method | Observation | Established | Evidence |
| --- | --- | --- | --- |
| `autobyteus-ios/scripts/prepare-demo-web.sh --build` on the base (the workflow's own step) | Fails with exactly the CI problems: unanswered `AgentSemanticMemoryFolder`, `GlobalSemanticMemoryFolder`, `ListAgentEpisodes`, `ListMemoryGroupMembers`; stale `ListAgentRunsWithMemory` | Reproduced | `evidence/reproduction/prepare-demo-web-build-base.log` |
| Operation names compiled into the demo build vs defined in the web source (`.ts`, `.vue`, `.js`, `.mjs`, excluding `demo/`, tests, `generated/`, build outputs) | 252 compiled = 252 defined; 250 in `graphql/**`, 2 elsewhere (`PhoneCredentialCheck` in `stores/mobileNodeSessionStore.ts`, `CollaborationParticipantMessages` in `services/collaborationMessages/participantMessagesQuery.ts`); none defined but not compiled | Measured | `evidence/reproduction/compiled-vs-source-operations.{mjs,txt}` |

**Root cause.** The coverage rule runs only after a full demo build, which no local check runs; autobyteus-554 changed GraphQL documents and nothing ran the rule before the release tag. The list itself is a one-line-per-operation update.

**Why a source-based check works.** The phone build compiles every operation defined in the web source (measured above), so applying the same rule to the source operations gives the build's answer without a build. If the build ever stops compiling a defined operation, the build check will call its list entry stale while the source check needs it; that divergence would show at the next demo build and needs both rules to be reconciled then (recorded as a design risk).

- Temporary diagnostics: None. Prepare note: a fresh worktree needs `pnpm --filter "{./autobyteus-web}^..." run build` (the script's `--build` does it) before `build:mobile-web`.
