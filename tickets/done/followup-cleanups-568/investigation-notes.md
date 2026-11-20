# Investigation Notes

## Investigation Meta

- Package identifier: `followup-cleanups-568`; Task autobyteus-568.
- Worktree / branch: `/Users/normy/autobyteus_org/autobyteus-worktrees/followup-cleanups-568`, `codex/followup-cleanups-568`.
- Base: `origin/personal` `01ebb4ddce`, fetched 2026-11-20. Finalization target: `origin/personal`.
- Bootstrap: OK.
- Current SR: `SR-001`.
- Authorities read (2026-11-20, this conversation):
  - requirements: `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`;
  - architecture: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md` (rules 11 and 12).
- Status: complete.

## Source Log

| ID | Type | Source / Command | Finding | How |
| --- | --- | --- | --- | --- |
| S-01 | Code | `git grep -w` for the three document names and constants (web, server, tests) | Web: defined only (`agentMutations.ts:34-52`, `collaboratorQueries.ts:30-43`) and listed "unused" in `demo/graphql/unreachable-operations.json:20,28,85,189`. No import anywhere. | Read |
| S-02 | Code | `git log -S GetAgentRunCollaborationMemberProjection -- autobyteus-web ':!graphql' …` | The web stopped sending it in `c17a11f2ef` (2026-11-15, autobyteus-461). `RestoreAgentRun`'s last web use went in `12ea5a05d6` (461). `ApproveToolInvocation`'s last use went in `c4da95428e` (324). | Read |
| S-03 | Code | `git grep` of the server fields | `approveToolInvocation` mutation (`agent-run.ts:158-170`, `:351+`): only `tests/unit/api/graphql/types/agent-run.test.ts:23,103`. `restoreAgentRun`: 28 server e2e files, plus `projects-left-navigation-probe.mjs` and `task-closure-tree-probe.mjs`. `agentRunCollaborationMemberProjection`: 13 server e2e tests, `test-support/native-input-history/…integration.test.ts`, `tests/e2e/mobile-shell-probe.mjs`, and documented in `standalone_agent_run_root.md:173`. Tool approval goes over the WebSocket (`AgentStreamingService.ts:246`, `TeamStreamingService.ts:161`, `agentOrgStreamingService.ts:224`). | Read |
| S-04 | Code | `scripts/mobile-build-checks.mjs:50-68` | The demo check fails on "stale" entries (listed but not compiled), so the three entries must go with the documents. It does not check reasons, so the then-empty "unused" reason is dead text and is removed. | Read |
| S-05 | Code | `autobyteus-web/codegen.ts`; `package.json:38-40` | `generated/graphql.ts` comes from the server schema plus `graphql/**/*.ts`. `codegen:local` regenerates from the local server and `codegen:check` compares. The server mutation's removal also removes its generated types. | Read |
| S-06 | Runtime log | `tickets/done/ios-demo-mode-279/evidence/implementation/IMP-01-web-unit-full.log:50819-50866` | The deadline case failed at 1018 ms with ENOENT on the receipt. The sibling Node-script cases in the same file took 318–823 ms each under the full Electron suite (normally ~30 ms). Alone ×3 and in a second full run, it passed. | Measured (recorded log) |
| S-07 | Code | `electron/server/__tests__/PortOwnerInspectorFaults.spec.ts:66-83`; `electron/server/portOwnerInspector.ts:23` (`timeout: 1000`) | The fixture is `#!node`; its first statement writes the receipt; `execFile`'s callback follows the child's exit. So ENOENT means the child never ran its first statement before the kill. | Read |
| S-08 | Command | `/tmp/sd568`: 15 runs each of a `#!node` and a `#!/bin/sh` receipt writer, idle and under 20 busy loops on 10 CPUs | Node median 31 ms (max 435), sh 6 ms (max 273). Under load: Node 62 ms (max 162), sh 17 ms (max 102). CPU load alone did not reproduce >1 s; the suite's Electron specs add more. sh is 3–5× faster to its first statement. | Measured |
| S-09 | Code / log | `autobyteus-ios/AutoByteusMobileCoreTests/SavedNodeEntryKeysMigrationTests.swift:85-90`; 279 `evidence/api-e2e/FS-iOS-run1-symlinked-path.log`, `FS-iOS-run2-private-tmp.log` | Clipped relative paths under `/tmp`; it passes from a plain path. `NativeNodeNameReadsTests.swift:7` uses `#filePath` too but only `lastPathComponent`, so it is unaffected. | Read; Reproduced by 279's API/E2E |
| S-10 | Code / log | `components/settings/__tests__/ServerSettingsBasicsPanel.spec.ts:15-57`; `ServerSettingsBasicsPanel.vue:3-15`; `localization/messages/en/updateNotifications.ts:75,77`; 279 `evidence/delivery/DEL-03b-basics-panel-on-personal-422a2955c5.log` | `ShowInternalAgentsCard` and `UpdateChecksCard` are not stubbed. The update card's copy contains "GitHub". It fails on a clean personal. The files are unchanged since `422a2955c5` (`git log 422a2955c5..HEAD`). | Read; Reproduced by 279's delivery |
| S-11 | Code / run log | `release-ios.yml` "Select available iOS simulator"; `ios-simulator-smoke.sh:5,32-34`; 571 `evidence/probe/P-01-xcode27-build-only.txt` | Two copies of an awk substring match; on `xcode-27` they chose iPhone 17e on iOS 27.0. `simctl list devices available` under Xcode 27.2 listed runtimes 27.0, 27.1 and 27.2 (not the 27.3 beta). | Read; Measured (571) |
| S-12 | Command | `xcrun --sdk iphonesimulator --show-sdk-version`; `xcrun simctl list devices available -j` (this Mac, Xcode 26.1.1) | The SDK is `26.1`. Runtime keys look like `com.apple.CoreSimulator.SimRuntime.iOS-26-1`, and devices carry `name` and `udid`. "iPhone 17 Pro" is listed **before** "iPhone 17", so the substring match would pick iPhone 17 Pro here. | Measured |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Status |
| --- | --- | --- | --- |
| R-001 | Risk | An extremely loaded machine could still delay even sh past 1000 ms | Accepted: the measured margin is about 10× |
| R-002 | Risk | Removing a GraphQL mutation changes the API | No caller (S-03). DESIGN.md rule 9: no cross-version compatibility. |

## Temporary diagnostics

`/tmp/sd568` (start-up timing scripts), removed.
