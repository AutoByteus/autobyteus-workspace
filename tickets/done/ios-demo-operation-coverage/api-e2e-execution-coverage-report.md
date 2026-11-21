# API/E2E Execution Coverage Report — autobyteus-584 (ios-demo-operation-coverage)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`; revision record `api-e2e-revision-record.md` (`API-REV-001`); progress `api-e2e-test-progress.md`.
- Round 1; trigger IR-001 (code `0d197a73b9`). Deviations from the plan: None.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/ios-demo-operation-coverage/tickets/in-progress/ios-demo-operation-coverage/evidence/api-e2e/`.

## Routing Classification

- Task size `Small`, risk `Low`, route `Direct Low-Risk` → `Delivery`; test-code review `Not Required — direct low-risk route`.

## Tested Builds And Environments

| Env | Commit | Platform | Build |
| --- | --- | --- | --- |
| ENV-1 | `929976f818` (code `0d197a73b9`) | macOS 26.5.2 arm64, Node v22.23.1 | worktree (API-01) and a fresh `git clone --no-local` with `pnpm install --frozen-lockfile` (API-03) |
| ENV-2 | `929976f818` | GitHub Actions macOS runner, Xcode 27 | `release-ios.yml` build-only (`workflow_dispatch`, no publish) |

## Cases

| Case | Criteria | Command Or Steps | Env | Result | Evidence | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-002 | `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run scripts/__tests__/mobileBuildChecks.spec.ts`; then with a temporary `autobyteus-web/graphql/queries/zz_probe584.ts` defining `query ProbeOnlyOperation584` (removed after) | ENV-1 | Pass | `API-01-spec-and-detection.log` | `Tests  8 passed (8)` in 2 s; with the probe file: `"unanswered": [ "ProbeOnlyOperation584"`, `1 failed \| 7 passed`; `git status` clean after | IMP-01 shows the base list failing on the five known names |
| API-02 | AC-001, AC-004 | `git push origin HEAD:refs/heads/codex/ios-demo-operation-coverage`; `gh workflow run release-ios.yml --ref codex/ios-demo-operation-coverage -f publish_app_store_connect=false -f release_ref=codex/ios-demo-operation-coverage` | ENV-2 | Pass | `API-02-ios-build-only-run.log` | run `44881140728` `conclusion: success`; `Build the bundled demo: success` with `The demo answers all 252 compiled operations (handled or listed as unreachable).`; `Generate, build, and run implementation checks: success` (`** BUILD SUCCEEDED **`, `** TEST SUCCEEDED **`, `Executed 56 tests, with 0 failures`); `Validate iOS Publish Secrets`, `Archive And Upload To App Store Connect`: skipped | No tag created. The branch was pushed with the explicit refspec |
| API-03 | Fresh-start build (TESTING.md) | fresh clone at `929976f818`; `pnpm install --frozen-lockfile`; in `autobyteus-web`: `NO_TIMESTAMP=1 AUTOBYTEUS_BUILD_FLAVOR=personal PRISMA_CLI_BINARY_TARGETS=darwin-arm64,debian-openssl-1.1.x,debian-openssl-3.0.x CSC_IDENTITY_AUTO_DISCOVERY=false GITHUB_REPOSITORY=AutoByteus/autobyteus-workspace pnpm build:electron:mac -- --arm64`; the job's "Verify bundled Prisma ARM64" and "Verify packaged terminal runtime ARM64" | ENV-1 | Pass | `API-03-desktop-fresh-start-build.log` | `install exit 0`; `[guard:web-boundary] Passed.`; `[typecheck] PASS` (`production errors: 0; test-file errors: 86 in 36 files (baseline 86 in 36 files)`); `build:mobile-web` (the changed script) ran; `Build completed`: `AutoByteus_personal_macos-arm64-1.5.14-beta.4.dmg`; `engines ok`, `client ok`, `[terminal-runtime] ok` ×4, `verify exit 0` | Signing, notarization, x64, Linux and Windows need the runner: Not Tested |
| API-04 | AC-003 | `TESTING.md` "Choosing the path": a row for GraphQL operations and the demo node (the spec, then `prepare-demo-web.sh --build`; remove `dist-mobile-demo/` before the web typecheck, FU-001) | — | Pass | commit `9b7e1af380` (`docs(testing): …`) | the new table row | Committed on its own, as TESTING.md asks |
| API-05 | AC-001, AC-002 | Reused IMP-02 (spec), IMP-03 (typecheck), IMP-04 (`prepare-demo-web.sh --build`: `The demo answers all 252 compiled operations`) | — | Pass | — | — | Code unchanged since |

## Acceptance-Criteria Proof

| AC | Critical | Proven By | Result |
| --- | --- | --- | --- |
| AC-001 | Yes | API-02 (on the runner), API-05 (IMP-04 locally) | Proven |
| AC-002 | Yes | API-01 (passes; names a new unlisted operation), IMP-01 (the base list fails on the five), API-05 | Proven |
| AC-003 | Yes | API-04 | Proven |
| AC-004 | Yes | API-02 | Proven |

## Validation Confidence Scorecard (Mandatory)

| Category | Final | Supports |
| --- | --- | --- |
| Requirement and AC proof | 98% | every AC directly |
| Changed-boundary directness | 98% | the release pipeline's own run; the spec on the real source |
| Integration realism | 97% | the GitHub runner; a fresh clone |
| Environment fidelity | 95% | runner + fresh clone; other desktop targets not built |
| Failure / edge cases | 95% | detection of a new unlisted operation; base failure (IMP-01) |
| User surface | N/A | no product UI change |
| Durable coverage | 96% | the spec in the web suite; the TESTING rule |

- Overall: 96.5%. Every critical AC proven: `Yes`. Below 90%: `No`. Target met: `Yes`.
- Residual risk: R-1 (the build's compiled set and the source set could diverge; the build check stays the authority). FU-001 (the web typecheck runs out of memory while `dist-mobile-demo/` exists; noted in TESTING.md).

## Broader Validation Decision (Mandatory)

- `Required` (executed): the build-only iOS release run (REQ-004) and the desktop fresh-start build (build inputs changed).

## Durable Coverage Changed In The Codebase

| Path | Change |
| --- | --- |
| `TESTING.md` | Updated (a row in "Choosing the path"), commit `9b7e1af380` |

## Temporary Methods And Cleanup

| Item | Cleanup | Result |
| --- | --- | --- |
| The temporary `zz_probe584.ts` | removed in the same command | `git status` clean |
| The fresh clone `/tmp/api584/fresh` | removed after its logs were saved | removed |
| `/tmp/api584/` (raw build logs) | to remove when the ticket closes | — |
| The remote branch `codex/ios-demo-operation-coverage` | left for delivery (it is the ticket branch) | at `929976f818`; this round's commits are local |

## Latest Authoritative Result

- Result: `Pass`. Criteria not proven: `None`. Next recipient: the Delivery Engineer.
