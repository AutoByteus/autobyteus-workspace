# Docs Sync Report — autobyteus-584 (ios-demo-operation-coverage)

## Scope

- Ticket: `ios-demo-operation-coverage` (Project Task `autobyteus-584`): the iOS demo build's GraphQL operation coverage passes again, and a change to GraphQL documents is caught by a fast local check before any release.
- Trigger: API-REV-001 `Pass` (96.5 %) on the direct low-risk route (`task_size` `Small`, `architectural_risk` `Low`). Architecture review, source review and test-code review are `Not Applicable` on this route.
- Bootstrap base reference: `origin/personal` `90c4958a35` (the `v1.5.14-beta.4` release commit).
- Integrated base reference used for docs sync: `origin/personal` `726c5beaf9` (one commit: the beta.4 release record, ticket files only), merged as `44deff6562`.
- Post-integration verification reference: `evidence/delivery/` `DEL-01`…`DEL-03` on `44deff6562` (the coverage spec, both typechecks, the iOS build-only run read directly); the release/deployment report lists them.

## Why Docs Were Updated

- Summary: the ticket added a way to apply the demo's coverage rule to the operations defined in the web source, without a build, and a `TESTING.md` rule for GraphQL or demo-node changes (the latter by API/E2E, in its own commit). The web doc that describes the demo build said only that "the build's checks fail", which no longer states the whole mechanism.
- Why this should live in long-lived project docs: a later change to a GraphQL document must know that the web suite fails fast and names the operation, and that the demo build's check remains the authority. Without it, the next change that adds a phone request finds out at the iOS release, which is how `v1.5.14-beta.4` lost its TestFlight build.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The ticket applies existing rules (a check belongs at the earliest stage that can reproduce the failure; rule 12). No new rule |
| `TESTING.md` | The ticket's testing rule | Updated in the ticket (kept, verified) | API/E2E added one row to "Choosing the path" (commit `9b7e1af380`). Delivery checked it against the code: the command exists and passes (8/8), `prepare-demo-web.sh --build` does build the workspace packages, then `build:mobile-web --demo` (`remote_access.md` and the script agree), and `nuxt.config.ts:261` still excludes only `../dist-mobile/**`, so the row's warning about `dist-mobile-demo/` is true on the merged tree (delivery met it). The warning becomes stale when FU-001 lands: FU-001's suggested Task now says to drop it |
| `RELEASE.md` | Finalization and release rules | No change | Read from the merged tree. No release step changes, and RELEASE.md's own rule says a failure an earlier stage can reproduce gets its check there (here `TESTING.md`), not in a release-stage step. The base's "Desktop signing readiness" section applies to a tag; this delivery makes none |
| `AGENTS.md` | Pointers | No change | |
| `docs/ios_mobile_access.md`, `autobyteus-ios/README.md` | The iOS app's setup and the release workflow's build steps | No change | They give the steps (`prepare-demo-web.sh --build`, then the Xcode build) and say both macOS jobs run the demo build; none states what the build checks |
| `autobyteus-web/docs/remote_access.md` ("The demo build (iOS)") | Says what the demo build checks | Updated by delivery | See "Docs Updated" |
| `docs/design-cases.md` | Design cases | No change | The ticket found no design mistake: the cause was a check that nothing ran before the tag, which the testing rule now covers |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/remote_access.md` | Behavior | In "The demo build (iOS)": the coverage rule also runs on the operations defined in the web source, without a build (`sourceOperations` in `scripts/mobile-build-checks.mjs`, applied by `scripts/__tests__/mobileBuildChecks.spec.ts` in the web suite; dependencies, build outputs, generated code, tests and `demo/` are not source), so a GraphQL change the demo does not cover fails in seconds and names the operation, before any release; the demo build's own check stays the authority because it reads what is compiled; an operation only a desktop page sends is listed with its reason (such as `memory`); the list holds nothing answered or no longer defined | The passage said only that the build's checks fail |
| `TESTING.md` | Testing rule (by API/E2E, commit `9b7e1af380`) | One row in "Choosing the path" for GraphQL operations or the demo node: run the spec, then `prepare-demo-web.sh --build`; remove `dist-mobile-demo/` before the web typecheck | The rule the ticket exists to add (AC-003) |

All statements were checked against the code at the merged state: `sourceOperations` and `NOT_SOURCE` in `scripts/mobile-build-checks.mjs`, the spec's two new tests, `build-mobile-web.mjs` calling `demoOperationCoverage(compiledOperations(...))`, the reason names in `demo/graphql/unreachable-operations.json`, and the `OPERATION` pattern shared by both readers.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| The demo's coverage is checked twice, at different costs | On the source in the web suite (seconds, no build, names the operation); on the compiled build in the iOS release's "Build the bundled demo" (the authority) | `design-spec.md`, requirements DEC-002 (measured: the phone build compiles every operation the source defines, 252 = 252) | `autobyteus-web/docs/remote_access.md`, `TESTING.md` |
| Which change runs which check | GraphQL documents, an inline operation or `demo/**` → the spec, then the demo build | requirements REQ-003 | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `demoOperationCoverage(publicDir, webRoot)` (read a build directory) | `demoOperationCoverage(compiled, webRoot)`, fed by `compiledOperations(publicDir)` (the build) or `sourceOperations(webRoot)` (the source) | `remote_access.md` (web) |
| The unreachable list's `ListAgentRunsWithMemory` entry (that operation no longer exists) and the four unlisted memory operations | four entries with reason `memory`; the stale entry removed | `demo/graphql/unreachable-operations.json` itself (the list is the record) |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive, finalization on `personal`.
- Notes: docs match the integrated code. No release notes are written: the change is internal (a build gate, a list and a testing rule) with no user-facing effect (`release-deployment-report.md`).
