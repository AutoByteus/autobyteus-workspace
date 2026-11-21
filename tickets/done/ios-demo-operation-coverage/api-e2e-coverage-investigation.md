# API/E2E Coverage Investigation — autobyteus-584 (ios-demo-operation-coverage)

## Investigation Meta

- Requirements: `requirements-doc.md` (SR-001, Approved). Investigation notes: `investigation-notes.md`. Solution revision record: `solution-revision-record.md`. Design: `design-spec.md` (SR-001, Ready).
- Design review / code review: `N/A — not applicable` (direct route, Small / Low).
- Implementation handoff: `implementation-handoff.md` (IR-001; code `0d197a73b9`, docs `929976f818`). Implementation revision record: `implementation-revision-record.md`.
- API/E2E revision record: `api-e2e-revision-record.md`; current `API-REV-001`. Round 1; trigger: Implementation Engineer, IR-001.

## Requirement And Design Basis

The demo's GraphQL operation coverage list covers autobyteus-554's four memory operations (reason `memory`) and drops the stale `ListAgentRunsWithMemory` (REQ-001, D-1). The same coverage rule runs on the web source's operations in a unit spec, without a build (REQ-002, D-2, D-3). `TESTING.md` says when to run it (REQ-003, D-4; owner: API/E2E). Proof: the demo build passes locally and in a build-only iOS release run on GitHub Actions, with no tag (REQ-004).

## Scenarios

- A GraphQL or demo change in a ticket: the developer runs the spec (seconds) and the demo build; the iOS release's demo build is the authority.
- Added from the implemented behavior: a new operation added to the web source and not listed: the spec names it (detection, not only the five known names).

## Surfaces

| Surface | Affected | Evidence planned |
| --- | --- | --- |
| Build tooling (`autobyteus-web/scripts/mobile-build-checks.mjs`, `build-mobile-web.mjs`) | Yes | the spec; the demo build on a runner; the desktop build that runs `build:mobile-web` (`prepare-server.mjs:183`) |
| Release pipeline (iOS) | Yes (its demo step) | the build-only iOS workflow run |
| Product code, API, UI, persistence, security | No | — |

## Project Execution Discovery

- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage`; testing guideline `TESTING.md` (root; none closer); Node 22.23.1.
- Changed build-input paths: `autobyteus-web/scripts/mobile-build-checks.mjs`, `autobyteus-web/scripts/build-mobile-web.mjs` (TESTING.md Fresh-start build: `*/scripts/**`). Fresh-start proof: the iOS build-only run (the runner's own clone and frozen install) and a local fresh clone of the desktop build (macOS ARM64, the job's command and verify steps). Linux, Windows and Intel desktop builds, signing and notarization need the runner: not tested.
- Branch push: the ticket branch is pushed only with the explicit refspec (`git push origin HEAD:refs/heads/codex/ios-demo-operation-coverage`); its upstream is the target branch.

## Existing Durable Coverage

| Path | Decision |
| --- | --- |
| `autobyteus-web/scripts/__tests__/mobileBuildChecks.spec.ts` (synthetic cases + the new source case) | Still Valid (adapted by the implementation) |
| `build-mobile-web.mjs`'s build-time checks | Still Valid (the authority) |

## Planned Cases

| Case | Criteria | Kind | Command / Steps | Why |
| --- | --- | --- | --- | --- |
| API-01 | AC-002 | Existing Test + temporary detection check | the spec; then with a temporary unlisted operation in `autobyteus-web/graphql/queries/` (removed) | The spec must catch a new operation, not only the known five |
| API-02 | AC-001, AC-004 | Release pipeline | `gh workflow run release-ios.yml --ref codex/ios-demo-operation-coverage -f publish_app_store_connect=false -f release_ref=codex/ios-demo-operation-coverage` | REQ-004 |
| API-03 | Fresh-start build | Fresh clone | `git clone --no-local`, `pnpm install --frozen-lockfile`, `build:electron:mac -- --arm64` with the job's environment, its two verify steps | TESTING.md Fresh-start build (the desktop build runs the changed script) |
| API-04 | AC-003 | Guideline | `TESTING.md` "Choosing the path" row, committed on its own | REQ-003 (owner: API/E2E) |
| API-05 | AC-001, AC-002, IMP checks | Reused | IMP-02 (spec), IMP-03 (typecheck), IMP-04 (`prepare-demo-web.sh --build`) | Code unchanged since |

## Not Tested

| Behavior | Reason |
| --- | --- |
| Other desktop targets, signing, notarization, the publish half of the iOS release | Need the runner's secrets or other machines; the build-only runs and the fresh ARM64 build cover the changed scripts |

## Decision

- Proceed: `Yes`. Durable coverage changed by API/E2E: `No` (the spec is the implementation's); `TESTING.md` updated (API-04).
