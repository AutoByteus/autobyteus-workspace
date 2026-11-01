# API/E2E Execution Coverage Report — autobyteus-345 (packaging, dependencies and build)

## Round

- Coverage investigation: `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md` / `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: round 1, after source review CRR-001 (Pass, no findings)
- Prior round reviewed: `N/A`
- Deviations from the plan: none. Two additions to what was asked: an independent size measurement for the AC-002 judgement (API-02) and a registry check of the installed versions in the override rebuild (API-05).
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/packaging-dependencies-build/tickets/in-progress/packaging-dependencies-build/evidence/api-e2e/` (the commit is named in the handoff message)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed` (ARCH-REV-001, CRR-001)
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable — no durable test code was added, updated or removed in API/E2E`. The implementer's tests were part of the source review CRR-001.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `92ff204d33` (the pushed head; code identical to `4db26446cb` apart from two comment lines of `prepare-server.mjs`) | GitHub-hosted runners: `ubuntu-22.04`, `ubuntu-24.04-arm`, `macos-15` (arm64 and x64 jobs), `windows-2022` | the repository's own `release-desktop.yml` build jobs, `pnpm install --frozen-lockfile`, `pnpm build:electron:*` | `workflow_dispatch` on ref `codex/packaging-dependencies-build`, `publish_release=false`, `prerelease=true` (the arguments of `pnpm release:test`), run 41282003912 |
| ENV-2 | `92ff204d33` | macOS 26.5.2 arm64 (this machine), Node 22.23.1, pnpm 10.28.2 | worktree and clean clones under `/tmp/api-e2e-345-*` (removed afterwards) | `env -i`, throwaway HOME where suites ran |
| ENV-3 | `6777be781f` (an older commit) | same as ENV-2 | clean clone, frozen install, the real `prepare-server.mjs` | `AUTOBYTEUS_NPM_BEFORE=2026-10-30T12:00:00Z` |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| API-01 | AC-004, AC-006, AC-011; REQ-003, 004 | the build-only desktop release run, five targets | `gh workflow run release-desktop.yml --ref codex/packaging-dependencies-build -f publish_release=false -f prerelease=true`; `gh run view 41282003912`; the five job logs read | ENV-1 | **Pass** | `API-01-build-only-release-run.log` (run URL, per-job excerpts) | `RUN conclusion: success`; `JOB Publish GitHub Release : skipped`; every job: `Lockfile is up to date, resolution step is skipped`; Linux x64 and arm64: `✓ Prisma Linux x64 engine targets verified in …` / `✓ Prisma Linux arm64 engine targets verified in …`, `✓ Prisma client Linux … runtime engines verified`, `Packaged server startup validation passed for …/linux-unpacked/resources/server` / `…/linux-arm64-unpacked/…`; Windows: `npm install is bounded to packages published before 2026-11-01T07:42:53+01:00`, `added 321 packages in 39s`, `Publishing staged server bundle...`, `✔ Rebuild Complete`, `Server files prepared successfully!` | The bound equals the commit time of `92ff204d33` (`git log -1 --format=%cI` = `2026-11-01T07:42:53+01:00`). In `prepare-server.mjs` the Windows symlink rule (`assertNoSymlinks`, line 509) runs before `Publishing staged server bundle` (line 536), so the Windows runner got past the symlink check that stops the macOS rehearsal. All five jobs install with `--frozen-lockfile` (5 of 5 install steps; 0 `--no-frozen-lockfile` in the workflow). macOS jobs print the Prisma engine and client directories, the onnxruntime pruning and `Embedding runtime validation passed`. No macOS or Windows job runs a packaged-server startup check: the workflow has none there (pre-existing, FU-006). Times: Linux 6–7 min, Windows 16 min, macOS 22–24 min |
| API-02 | AC-002, AC-003 | size and content of the deployed package, independently measured | `API-02-size-measure.sh`: fresh clone; at `92ff204d33` `pnpm --filter autobyteus-server-ts deploy <dir> --legacy --prod`, at `efd28d5c4a` the same without `--prod`; `du` before and after `node_modules/.bin/prisma generate`; `verify-packaged-server-startup.mjs --server-root <real path>` | ENV-2 | **Pass** | `API-02-size-measurement.log`, `API-02-size-measure.sh` | `before prisma generate: base 827.3  new 674.1  saving 153.2 MB = 18.5%`; `after  prisma generate: base 986.6  new 833.3  saving 153.2 MB = 15.5%`; `virtual store packages: 348` (new) vs `450` (base); `Packaged server startup validation passed for /private/tmp/api-e2e-345-new` | **AC-002 judgement below.** New folder: `LICENSE README.md application-packages dist node_modules package.json prisma` (no `src/`, `tests/`); top-level `@types`/`vitest`/`typescript`: 0 (base: 1 of them); the base folder holds `src tests tickets docs docker scripts canuse-ok.txt …` |
| API-03 | AC-006; REQ-004; SCN-004 | refusals through the real `prepare-server.mjs` | `env -i PATH HOME TMPDIR AUTOBYTEUS_NPM_BEFORE=yesterday \| 1730000000 \| 2026-13-45 node autobyteus-web/scripts/prepare-server.mjs`; and `GIT_DIR=/nonexistent-git-dir` with no override | ENV-2 | **Pass** | `API-03-npm-before-refusals.log` | `Error: AUTOBYTEUS_NPM_BEFORE='yesterday' is not an ISO 8601 date or time (for example 2026-11-01T09:12:44+01:00).`; `Error: Cannot bound the staging npm install: the commit time of … could not be read (…). Set AUTOBYTEUS_NPM_BEFORE to an ISO 8601 time.`; each `EXIT=1 SECONDS=0` (the last `1`) | After the three banner lines nothing from `buildWorkspaceArtifacts` is printed (no pack, no install, no build); `git status` of the worktree unchanged |
| API-04 | AC-001, AC-003; REQ-001, 002 | mutations of `server-package-contents.test.ts` on a copy | rsync copy of `autobyteus-server-ts` (no `node_modules`/`dist`; `node_modules` and the sibling `test-support/` linked); `./node_modules/.bin/vitest run tests/architecture/server-package-contents.test.ts` | ENV-2 | **Pass** (every mutation fails the test) | `API-04-package-contents-mutations.log` | control `Tests  5 passed (5)`; M-A (remove `prisma` from `files`): `Tests  3 failed \| 2 passed (5)`, among them `expected [ 'dist', 'application-packages' ] to deeply equal [ 'dist', 'prisma', …(1) ]` and `…migration…: expected [ 'LICENSE', 'README.md', …(2) ] to include 'prisma/migrations/20260203074245_init…'`; M-B (prisma to devDependencies): `declares the Prisma CLI as a production dependency` fails; M-C (add `src`): `src/: expected [ …(1943) ] to deeply equal []`; M-D (`canuse-ok.txt` back): fails; control again `5 passed` | My first harness lacked the sibling `test-support/` folder the test setup imports, so every case failed to load, the control included; discarded and redone with the link (stated in the log) |
| API-04b | AC-010; REQ-008 | mutations of `scripts/check-declared-imports.mjs` on a copy | copy holding `package.json` and `src/` of the server and the script; `node check-declared-imports.mjs --root <copy> autobyteus-server-ts` | ENV-2 | **Pass** | `API-04b-declared-imports-mutations.log` | control `Imports are declared: autobyteus-server-ts` `EXIT=0`; M-E (`import { expect } from "vitest"` in `src/`): `vitest is a development dependency but runtime code imports it (the --prod release package would not contain it)` `EXIT=1`; M-F (an undeclared package): `left-pad-not-declared is imported but not declared in package.json` `EXIT=1`; M-G (`import type … from "vitest"`): `EXIT=0` (type-only is exempt by the rule) | |
| API-05 | AC-006; REQ-004; SCN-004 | rebuild of an older commit with the override | clean clone at `6777be781f` (commit time `2026-11-01T06:56:44+01:00`), `pnpm install --frozen-lockfile` (exit 0), `env -i … AUTOBYTEUS_NPM_BEFORE=2026-10-30T12:00:00Z node autobyteus-web/scripts/prepare-server.mjs`; then `API-05-published-before-check.py <stage> 2026-10-30T12:00:00+00:00` | ENV-3 | **Pass** | `API-05-rebuild-with-override.log`, `API-05-published-before-check.py` | `npm install is bounded to packages published before 2026-10-30T12:00:00Z`; `added 321 packages in 20s`; `direct registry dependencies checked: 26`; `installed at a version published after the bound: []`; `had stable versions published after the bound, kept out by it: [('@agentclientprotocol/sdk', '1.5.0', 1), ('@anthropic-ai/claude-agent-sdk', '0.3.280', 2), ('@fastify/websocket', '11.3.4', 2)]` | The override (a day earlier than the commit) reached `npm install`, and the registry shows it bites: three direct dependencies have newer stable versions that did not enter. The script then stopped at the POSIX `.bin` symlink check (`Found 8 symlink/junction entries`), as IMP-06 recorded; that check is the Windows rule and passed on the Windows runner in API-01. The check covers direct dependencies only (26 of 31; the 5 workspace packages are not on the registry); transitive packages are not checked |
| API-06 | AC-001, AC-003, AC-004, AC-006, AC-009, AC-010 | source-level checks at head | Python `unittest` of the two script test files; `npm-before.spec.ts`; `server-package-contents` and `web-generated-graphql-current` architecture tests; declared imports on the real packages; `pnpm -C autobyteus-web codegen:check` | ENV-2 | **Pass** | `API-06-packaging-checks-at-head.log` | `Ran 15 tests … OK`; `Tests  10 passed (10)`; `Tests  6 passed (6)`; `Imports are declared: autobyteus-server-ts, autobyteus-web, autobyteus-ts`; `autobyteus-web/generated/graphql.ts is current.` | rerun because the head differs from the implementer's tested code by two comment lines |
| IMP-01…IMP-09 (reused) | AC-001…AC-011 | implementer's evidence | see the handoff's Checks Run | — | Pass (reused) | `evidence/IMP-01…IMP-09-*.txt` | as in the handoff rows | `git diff --name-only 4db26446cb HEAD` outside `tickets/` lists only `autobyteus-web/scripts/prepare-server.mjs` (2 insertions, 4 deletions, comments), so the clean-clone suites (server 904 files / 7666 tests, web 679 files / 4927 tests), the Docker stage build (IMP-04), `prepare-server.sh` (IMP-03, script unchanged) and the lockfile diff (IMP-09) still hold |
| API-07 | AC-005, SCN-003 | the Docker release workflow on a runner | not run | — | Not Tested | — | — | The workflow has no build-only mode and always pushes the image and signs and uploads the server package (FU-007). The Dockerfile change is proven by the implementer's local `docker buildx` of the `server-package` stage and a Linux container start (IMP-04), and by my local deploy and startup of the same `--prod` package (API-02) |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | User-Only Part |
| --- | --- | --- | --- | --- |
| AC-001 packed content | Yes | API-04 (mutations), API-06, IMP-02 | Proven | — |
| AC-002 smaller, startup passes, no dev packages | Yes | API-02, IMP-02 | Proven (judgement below) | — |
| AC-003 prisma a production dependency | Yes | API-04 (M-B), API-06 | Proven | — |
| AC-004 frozen installs, closure check | Yes | API-01 (5 of 5 jobs), API-06, IMP-01 | Proven | — |
| AC-005 Docker builder stages | Yes | IMP-04 (reused) | Proven locally; not on a runner (API-07) | — |
| AC-006 Windows `--before`, override, refusal, Linux Prisma engine validation | Yes | API-01 (Windows and both Linux jobs), API-03, API-05, API-06 | Proven | — |
| AC-007 nothing left in `autobyteus-server-ts/` | Yes | IMP-03 (reused; `prepare-server.sh` unchanged) | Proven | — |
| AC-008 dead workflow gone | No | IMP-09 (reused) | Proven | — |
| AC-009 generated GraphQL current, drift check with mutation | Yes | API-06, IMP-05 | Proven | — |
| AC-010 declared imports, class-aware | Yes | API-04b, API-06, IMP-09 | Proven | — |
| AC-011 preserved behavior on the three desktop targets | Yes | API-01 | Proven for build, install, packaging and (Linux) packaged startup; macOS and Windows packaged startup is not part of the workflow (FU-006) | — |

### AC-002 judgement (asked by the code reviewer)

The written criterion: "the folder is 18% smaller or more than the base (827 MB measured) and holds no `src/`, `tests/`; no vitest, typescript, @types in its `node_modules`". My independent measurement (API-02, same machine, same pnpm, `du`):

| | base `efd28d5c4a` | new `92ff204d33` | saving |
| --- | --- | --- | --- |
| before `prisma generate` | 827.3 MB | 674.1 MB | **153.2 MB = 18.5%** |
| after `prisma generate` | 986.6 MB | 833.3 MB | 153.2 MB = 15.5% |

- **The written numbers reproduce.** M-1's 827 MB is the base before the generate step, M-3's 674 MB is the candidate before it, and both come out of my run (827.3 and 674.1 MB). The implementer's note that the `--prod` package before the generate "was not measured" and that 18% "does not reproduce" came from comparing a base measured before the generate with a candidate measured after it. The 18% is therefore right as written (against the 827 MB base, before the generate); like for like after the generate the same 153 MB is 15.5% of a larger base. The saving in bytes is identical.
- **Verdict: AC-002 is met.** The saving (153 MB) is more than 18% of 827 MB (149 MB); the package holds `LICENSE README.md application-packages dist node_modules package.json prisma` and no `src/` or `tests/`; there is no top-level `@types`, `vitest` or `typescript` (the base has one); the virtual store shrinks from 450 to 348 packages. Three `@types/*` entries remain in the virtual store because `p-retry`, `protobufjs` and `type-graphql` depend on them (IMP-02); the criterion's "@types in its `node_modules`" is read as the development `@types` packages, none of which remain. If the Solution Designer wants the sentence exact, it can say "18% of the base measured before `prisma generate`, 15.5% after it".
- The `prisma generate` step adds 159.2 MB to both packages (measured), which is why percentages differ with the moment of measurement.

## Validation Confidence Scorecard (Mandatory)

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 90% | 95% | every critical AC proven by at least two independent cases, most on real runners | AC-005 proven locally only | a build-only Docker run (FU-007) |
| Changed-boundary execution directness | 92% | 96% | the changed workflow, scripts, manifests and Dockerfile-free paths ran on all five real desktop targets; the changed script ran for real in API-03/05 | — | — |
| Cross-boundary integration realism and mock gap | 85% | 91% | real GitHub runners, the real npm registry (override check), real Prisma engine validation, real packaged startup (Linux) | Docker release path not run on a runner; no packaged startup on macOS/Windows runners; Windows run proves build and the symlink rule, not a started server | FU-006, FU-007 |
| Environment, configuration, identity, and fixture fidelity | 90% | 94% | clean clones, `env -i`, the repository's own release workflow unchanged apart from the five flags | a Windows run on another commit date would use another bound (not an issue); the override check covers direct dependencies only | transitive registry check |
| Failure, edge-case, lifecycle, and recovery evidence | 90% | 95% | three invalid overrides and the no-git case refuse before any build step; five mutation cases and three declared-import cases fail as required; the override really excludes newer packages | npm's own failure when no version fits before the bound was not provoked | a bound earlier than every version of a dependency |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | no UI or shell change (two template type fixes keep behavior; web specs reused) | — | — |
| Durable regression coverage quality and relevance | 90% | 94% | each durable check was mutation-checked on a copy and fails as intended | no durable test covers the refusal through the real script (the spec covers the function; API-03 covers the script as evidence) | a script-level test of the refusal |

- Overall post-repository confidence: 89.5%
- Overall final confidence: 94.2%
- Calculation method: simple average of the six applicable categories, post (90+92+85+90+90+90)/6, final (95+96+91+94+95+94)/6
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes`
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `No` (94.2%). The remaining gap is bounded and cannot be closed from here without publishing or a Windows machine: the Docker release workflow always pushes an image (no build-only mode), and the desktop workflow does not start the packaged server on macOS or Windows.
- Confidence-limiting residual risks: (1) the Docker release path was not run on a runner (AC-005 is local); (2) macOS and Windows packaged-server startup is not exercised by the release workflow, so a platform-specific startup failure of the smaller package would show at a user's machine, not in CI (my macOS local startup of the same package passes); (3) `--before` is a bound, not an identity (DEC-3); (4) the transitive packages of the override rebuild were not registry-checked.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (the repository's build-only release run on real runners, plus local clean-clone rebuilds and mutation runs)
- Confidence gap it addresses, and the expected gain: the Windows tail of the staging script, the frozen installs and the Linux Prisma validation had never run on a runner; the first score 89.5% rose to 94.2%.
- Browser validation needed, and why or why not: no; no UI behavior changed.
- Execution notes: see ENV-1…3. The run publishes nothing: the `publish-release` job's condition needs a tag and `publish_release=true`; the log shows it `skipped`.

## Desktop Application Validation

- Approach executed: none beyond the release build jobs (no shell or renderer behavior changed)
- Effect on any already-running desktop application: none (the jobs run on GitHub; local runs used temp clones and no user data)
- Behavior not directly proven and its confidence consequence: the packaged desktop app was not started on macOS or Windows (not in the release workflow either); recorded in the scorecard and FU-006

## Persisted-Data Transition Checks

`Not Affected` (build inputs and outputs only). The lockfile change was shown by IMP-09 to be exactly the removal of `@nuxtjs/apollo`, `@rollup/plugin-graphql` and `@vue/apollo-option`; the frozen install passes on all five runners.

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No`
- Durable coverage added or retained only for compatibility-only behavior: `No`
- Reroute classification / recipient: `N/A`

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`
- Added or updated paths attached for proportional test-code review: `Not Applicable`
- The evidence tools `API-02-size-measure.sh` and `API-05-published-before-check.py` are kept in the evidence folder only.

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| "No git history" for the refusal case | `GIT_DIR=/nonexistent-git-dir` | the real condition (a source tarball) needs a second checkout | the same code path (`git log` fails) |
| The mutations | copies of the server folder and of `src/` | the worktree must stay untouched | the copies link the worktree's `node_modules` |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Temp clones, mutation copies and deployed packages `/tmp/api-e2e-345-*`, `/private/tmp/api-e2e-345-*` | Yes | removed | removed (only log files remain in `/tmp`) |
| **The pushed branch `origin/codex/packaging-dependencies-build`** | Yes (I pushed it) | not removed: it is the ref of the run and the ticket branch; delivery can delete it when it merges | exists on `AutoByteus/autobyteus-workspace` |
| **Workflow run 41282003912** | Yes | not deleted (GitHub keeps its logs); no release, tag or artifact was published; its artifacts (unsigned build output of the five targets, uploaded by the jobs) expire with the repository's retention | exists |
| The local worktree's `dist/` after `codegen:check` | Yes | ignored build output | untracked, ignored |

## Preliminary Classification (On `Fail`)

Not applicable: the result is `Pass`.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): none unproven. AC-005 (Docker builder) is proven locally by the implementer's build (reused), not on a runner.
- Next recipient from `get_handoff_rules`: Code Reviewer (the carried classification is Medium + High, so the rules route a passed run to the code reviewer; there is no durable test change from API/E2E to review)
- Notes: (1) The written AC-002 percentage is correct against the base measured before `prisma generate` (18.5%); like for like after it the saving is 15.5% (the same 153 MB). (2) New follow-ups FU-006 (no packaged-server startup in the macOS and Windows release jobs) and FU-007 (no build-only mode for the Docker release workflow). (3) FU-003 was seen again: `autobyteus-web/.server-packaging-stage/` is left behind by `prepare-server.mjs`. (4) I pushed the ticket branch to `origin` for the run; the Docker workflow was deliberately not dispatched because it publishes.
