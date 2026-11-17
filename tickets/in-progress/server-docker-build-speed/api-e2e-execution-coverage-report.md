# API/E2E Execution Coverage Report

The run record and the result: what ran, what it proves, how confident I am, and the outcome. The coverage investigation is the plan; `api-e2e-revision-record.md` is the history across rounds.

## Round

- Coverage investigation (the plan; it lists the upstream documents): `api-e2e-coverage-investigation.md`
- API/E2E revision record and current revision ID: `api-e2e-revision-record.md`, `API-REV-001`
- Test progress log: `api-e2e-test-progress.md`
- Round and trigger: Round 1, after code review Pass (CRR-001 on IR-001) from `/code_reviewer`, 2026-11-17
- Prior round reviewed: N/A
- Deviations from the investigation's plan, and why:
  - API-10 added during the round (AC-007). After the first runs, a forced failure on a throwaway branch was the one safe way to exercise the documented recovery (`gh run rerun --failed`) before a real leg fails. The investigation was updated before it ran.
  - The real runs were dispatched right after the "before" snapshots, before the investigation file was written. They take the longest and the snapshots had to come first. The plan was written while they ran; no plan decision depended on their result.
- Evidence folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-build-speed/tickets/in-progress/server-docker-build-speed/evidence/` (the handoff message gives the commit that holds it)

## Routing Classification

- Task size: `Medium`
- Architectural risk: `High`
- Input route: `Reviewed`
- Successful-output route: `Code Review`
- Proportional test-code review decision: `Not Applicable`. This round added, updated or removed no repository test code. The only code written was the temporary API-10 probe step on a deleted throwaway branch. So there is no changed durable test code to review; the pass still returns to the code reviewer as the route says.

## Tested Builds And Environments

| Env ID | Commit Tested | Platform / OS | Runtime, Browser, Or App Build | Other Settings That Matter |
| --- | --- | --- | --- | --- |
| ENV-1 | `31dfe3dad0` (branch `codex/server-docker-build-speed`, pushed to origin) | GitHub-hosted runners: `ubuntu-latest` = image `ubuntu-26.04` (20261111.196.1), arm64 leg `ubuntu-24.04-arm` (Ubuntu 24.04.5) | Workflow `.github/workflows/release-server-docker.yml` as committed in `1b113a8313` | Repository secrets `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `SERVER_PACKAGE_SIGNING_KEY`; Docker Hub `autobyteus/autobyteus-server`; dispatched by `ryan-zheng-teki`; the beta.9 release run 44123354990 (attempt 2, old workflow) running at the same time |
| ENV-2 | `384fe90756` = `31dfe3dad0` + one probe step (throwaway branch `codex/api520-rerun-probe`, deleted after the run) | as ENV-1 | as ENV-1 plus the step `API-10 probe - fail arm64 on the first attempt` (`if: matrix.arch == 'arm64' && github.run_attempt == 1`) | as ENV-1 |
| ENV-3 | `31dfe3dad0` (check script copied verbatim from the workflow) | macOS 26.5, Docker Desktop 29.0.1, buildx v0.29.1-desktop.1 | local `docker buildx imagetools` against Docker Hub, anonymous, `--dry-run` only | Published beta.8 per-architecture digests as sources; nothing pushed |

## Cases

| Case ID | Criteria | Boundary / Surface | Command Or Steps | Env | Result | Evidence Files | Look For | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | AC-002, AC-004, AC-005, AC-006, AC-008 | Workflow step scripts with fake `docker`/`gh`/`df` | Reused: IMP-01 | — | Pass | — | — | Ran on `1b113a8313`; `git diff --name-only 1b113a8313 31dfe3dad0` touches only `tickets/`, so it still holds |
| IMP-02 | AC-010 (structure) | actionlint + shellcheck | Reused: IMP-02 | — | Pass | — | — | Same reason |
| IMP-03 | AC-002, AC-005, AC-008 | Mutation check of the step tests | Reused: IMP-03 | — | Pass | — | — | Same reason |
| API-01 | AC-002, U-001 | Docker Hub via local Buildx | `docker buildx imagetools create --dry-run -t autobyteus/autobyteus-server:build-only IMAGE@<beta.8 amd64> IMAGE@<beta.8 arm64>`, then the workflow's `check_index` (copied verbatim); then the same with the digests swapped | ENV-3 | Pass | `evidence/API-01-dry-run-shape-probe.log` | stdout is the index JSON with `.manifests[].platform.{architecture,os}`; `The dry-run index lists linux/amd64 sha256:6137bd01… and linux/arm64 sha256:b501e3eb…`, `check_index exit: 0`; swapped: `::error::The dry-run index does not list exactly …`, `check_index exit: 1`; `build-only` tag lookup `HTTP 404` | Proved U-001's output shape before the real run, and that a wrong mapping fails closed with the real tool's output |
| API-02 | AC-001, REQ-001, REQ-005, U-001, ASM-001 | Real GitHub Actions build-only run, default variant | `git push -u origin codex/server-docker-build-speed`; `gh workflow run release-server-docker.yml --ref codex/server-docker-build-speed -f build_only=true` → run 44148955212; `gh run view 44148955212 --json jobs,createdAt` | ENV-1 | Pass | `evidence/API-02-run-44148955212-excerpt.log`, `evidence/API-02-run-44148955212-jobs.json` | `run wall time (createdAt -> last job end): 9m52s`; `Build Server Image (linux/arm64) … Image: ubuntu-24.04-arm`; legs `7m59s` / `7m48s` in parallel; `'exporting to GitHub Actions Cache' = 0, 'type=gha' = 0, 'qemu' = 0` (beta.8: 2, 3, 14) | Ran with the RELEASE.md command exactly as documented (AC-009) |
| API-03 | AC-002, REQ-002 | Same run: Publish Server Image and package jobs | `gh run view 44148955212 --log`, grep of the `Create and check the multi-arch image`, `Extract…` and `Archive, describe and sign…` steps | ENV-1 | Pass | `evidence/API-02-run-44148955212-excerpt.log` (sections "Publish Server Image" and "Package jobs") | `The dry-run index lists linux/amd64 sha256:037c1bc1… and linux/arm64 sha256:77fcdb83…`; package jobs `DIGEST: sha256:037c1bc1…` (amd64) / `DIGEST: sha256:77fcdb83…` (arm64) = the pushed digests; `PACKAGE_ARCH: x64` / `arm64` with no `::error`; `Wrote autobyteus-server-1.5.13-beta.9-linux-x64.json: … 150244983 bytes, sha256 21d69bc7…` and `…-linux-arm64.json: … 149433994 bytes, sha256 0a967b47…`; `Signed … the signature verifies` | The file names carry `x64`/`arm64` read from `server-package.json` `arch`, so the arch check passed on real images. The job summaries render only for signed-in viewers; the step `Summarize the build-only server package` succeeded in both jobs, and the SHA-256 and size it prints come from the same description file whose `Wrote …` line is quoted here |
| API-04 | AC-006, REQ-005 | Same runs + Docker Hub + GitHub release | Before snapshot (18:32:16Z) of all Docker Hub tags and the v1.5.13-beta.9 assets; after both runs, the same; diff; attribution of every difference; step conclusions; overlap with the beta.9 release run | ENV-1 | Pass | `evidence/API-04-nothing-published.log`, `evidence/API-04-dockerhub-tags-before.tsv`, `-after.tsv`, `evidence/API-04-beta9-assets-before.tsv`, `-after.tsv`, `evidence/API-02-run-44148955212-excerpt.log` (section "Step conclusions") | Only tag diff: `> 1.5.13-beta.9 sha256:60e6d6e7… 2026-11-17T18:44:08Z`, after our last job (18:42:21Z), with an index listing none of our four digests: the beta.9 release run's push; `beta` and `latest` unchanged; `build-only` tag `HTTP 404`; assets `identical: 13 assets`; `Move beta tag`, `Checkout tags for the beta decision`, `Wait for the GitHub release`, `Upload the server package to the release` all `skipped` | Concurrency: both build-only runs started their jobs within seconds while the beta.9 run (group `server-docker-release-v1.5.13-beta.9`) was in progress, and they overlapped each other: no queueing |
| API-05 | AC-010, REQ-009 | Full logs of both build-only runs | `gh run view <id> --log`; greps for secret inputs, key material and token patterns | ENV-1 | Pass | `evidence/API-05-secret-scan.log` | every `password:`, `username:`, `SERVER_PACKAGE_SIGNING_KEY:`, `token:` value is `***`; `Key material or token patterns …: 0`; `echo of a secret in a run block …: 0` | The 3 lines `Username: githubactions` are buildx's builder info, also in beta.8's log |
| API-06 | AC-001 | Timing table | `gh run view <id> --json jobs` for 44047761247 (beta.8), 44148955212, 44149091734; `gh api …/runs/44123354990/attempts/{1,2}/jobs` (beta.9) | ENV-1 | Pass | `evidence/API-06-timing-table.md` | Total `39m00s` (beta.8) → `9m52s` (new); build `27m20s` (both arches emulated + cache export) → `4m25s` amd64 ‖ `4m14s` arm64; package job `7m09s` → `1m23s`; beta.9 attempt 1 build step `1h54m36s`, cancelled | beta.9 attempt 2 (old workflow) was still in its build step at 19:10:37Z, 54m20s in. Its version tag was pushed at 18:44:08Z and the step was still running 26 min later. It was not finished when this report was written; the table records it as it stood (section "beta.9 status when the report was finalized") |
| API-07 | Disk guard (design risk; arm64 free disk unmeasured) | Both build legs and package jobs | grep `Free disk on /` | ENV-1 | Pass | `evidence/API-02-run-44148955212-excerpt.log`, `evidence/API-08-run-44149091734-excerpt.log` | `Free disk on /: 98 GB` (ubuntu-24.04-arm, both runs), `79 GB` / `83 GB` (amd64 legs), `88 GB` (package jobs); `Free runner disk space when low` 0m00s everywhere | Far above the 30 GB threshold; no cleanup ran |
| API-08 | SCN-002 (zh), REQ-003 | Real GitHub Actions build-only run, zh variant | `gh workflow run release-server-docker.yml --ref codex/server-docker-build-speed -f build_only=true -f publish_zh=true` → run 44149091734 | ENV-1 | Pass | `evidence/API-08-run-44149091734-excerpt.log`, `evidence/API-08-run-44149091734-jobs.json` | `VARIANT_LABEL: zh`; `build-args: BASE_IMAGE_DIGEST=sha256:19d4c016…` (= `baseImages.zh`) on both legs; `Image: ubuntu-24.04-arm`; `The dry-run index lists linux/amd64 sha256:1ea9e6f9… and linux/arm64 sha256:71fab211…`; `Publish Server Package (${{ matrix.platform }}) \| (job) \| skipped`; `run wall time …: 7m36s` | Proves that the merged single build step builds the zh base natively on arm64 and that zh publishes no packages. The zh publish branch (`IMAGE:<v>-zh` inspect, AR-001) runs only with publishing: IMP-01 (fakes) |
| API-09 | AC-002 (independent check) | Docker Hub registry | `docker buildx imagetools inspect --raw IMAGE@<digest>` and `--format '{{json .Image}}'` for the four pushed digests | ENV-3 | Pass | `evidence/API-09-registry-digest-check.log` | each digest: `"mediaType":"application/vnd.oci.image.manifest.v1+json","layers":40` and `"architecture":"amd64"` / `"arm64"` matching its leg; beta.8's amd64 manifest also has `"layers":40` | Single-platform manifests (no attestation index), so `provenance: false` makes the build output digest the image manifest, as the design assumed |
| API-10 | AC-007, REQ-006, SCN-004; AC-005 (real run) | Real GitHub Actions run + `gh run rerun --failed` | Throwaway branch `codex/api520-rerun-probe` (ENV-2); `gh workflow run release-server-docker.yml --ref codex/api520-rerun-probe -f build_only=true` → run 44152041214; after attempt 1, `gh run rerun 44152041214 --failed`; branch deleted afterwards | ENV-2 | Pass | `evidence/API-10-rerun-failed-leg.log`, `evidence/API-10-run-44152041214-attempt1-jobs.json`, `…-attempt2-jobs.json` | Attempt 1: `Build Server Image (linux/arm64) … failure`, amd64 `success`, `Publish Server Image … skipped`, packages `skipped`. Attempt 2: arm64 new start `18:57:43Z`, amd64 keeps `18:49:59Z -> 18:56:50Z` (not rerun); `- server-image-digest-amd64 (ID: 14358444647 …)` = the attempt-1 artifact; `The dry-run index lists linux/amd64 sha256:c61c0f8d… and linux/arm64 sha256:7600ca31…`; both package jobs `success` | The failure is forced at a probe step early in the leg rather than inside the build step; which step fails does not change how GitHub reruns failed jobs. Publishing-mode rerun (tags, upload): part of AC-003 |

## Acceptance-Criteria Proof

| Acceptance-Criteria ID | Critical | Proven By Case IDs | Result | For A User-Only Part: What You Tried And Why It Still Needs The User |
| --- | --- | --- | --- | --- |
| AC-001 (≤ 30 min; before/after table) | Yes | API-02, API-06 | Proven | — (9m52s against 30 min) |
| AC-002 (package from its arch's checked digest; arch x64/arm64; index of exactly the two digests) | Yes | API-01, API-03, API-09, IMP-01, IMP-03 | Proven | — |
| AC-003 (tag push: tags as before, version tag's index = the package digests, six files uploaded, `latest*.yml` newer) | Yes | Shared parts: API-02, API-03, API-09 (real builds, real dry-run index of the two digests, extraction from those digests, signed files with the release names); publish branch with fakes: IMP-01 | Only The User Can Check (at the next release) | What I tried: every step a release shares with build-only ran for real (API-02/03/08/09/10); the publish-only steps (`imagetools create` with tags, `inspect --raw "$VERSION_TAG"` check, `Move beta tag` with the new `tree:0` checkout, wait, upload) ran as their real run blocks against fakes (IMP-01). Why it still needs the user: these steps publish public Docker tags and GitHub release assets, and only a release (the founder's word) may do that. A faithful rehearsal would push tags to a scratch Docker Hub repository under the `autobyteus` namespace (`image_name` override) with a fake release tag. That creates a new public repository on the org's Docker Hub, a side effect only the user can approve. Delivery verifies AC-003 at the next release, as the requirements doc plans (R-002) |
| AC-004 (tag rules, `:beta` after both builds, zh) | Yes | IMP-01; API-08 (zh builds and publishes no package) | Proven | — |
| AC-005 (one arch fails: no tag, no `:beta`, no upload) | Yes | IMP-01, IMP-03 (structure, mutation); API-10 attempt 1 (real: arm64 failed → Publish Server Image and package jobs skipped) | Proven | — |
| AC-006 (build-only publishes nothing; own concurrency group) | Yes | API-04, API-02, IMP-01 | Proven | — |
| AC-007 (`gh run rerun --failed` reruns only that arch, then completes) | No (Should) | API-10 | Proven (build-only mode; failure forced at an early probe step) | — |
| AC-008 (60-min wait, error names the tag) | No (Should) | IMP-01, IMP-03 | Proven (fakes; the real wait is not reachable without a release missing for an hour) | — |
| AC-009 (docs) | No | Code review (CRR-001); API-02 used the RELEASE.md command as written and `gh run view <id> --json jobs` as documented for timings | Proven | — |
| AC-010 (no secret in logs) | Yes | API-05, IMP-02 | Proven | — |

## Validation Confidence Scorecard (Mandatory)

Post-repository = after the reused repository checks (IMP-01..03). Final = after the real runs and probes.

| Confidence Category | Post-Repository Score | Final Score | What Supports It (Case IDs) | Residual Uncertainty | What Could Improve It |
| --- | --- | --- | --- | --- | --- |
| Requirement and acceptance-criteria proof | 55% | 95% | All critical ACs proven except AC-003's publish-only part, which only a release (the user) can check: API-01..10, IMP-01..03 | AC-008's real 60-min wait; AC-007 proven with an early forced failure in build-only mode | Next release (AC-003) |
| Changed-boundary execution directness | 45% | 96% | Real runners, real registry, real artifacts and `needs` outputs, the documented dispatch and rerun commands: API-02, API-03, API-08, API-10 | — | — |
| Cross-boundary integration realism and mock gap | 40% | 95% | Real Docker Hub push by digest and dry-run index (API-02/03/09), real artifact hand-over across attempts (API-10); fakes only for the publish-only steps, which are the user-only part | Publish-mode `imagetools create`/`inspect` on a tag: exercised locally only in dry-run form | Next release |
| Environment, configuration, identity, and fixture fidelity | 40% | 95% | The same runner images as beta.8 (`ubuntu-26.04`) plus the native `ubuntu-24.04-arm`; real repository secrets; a release run in progress at the same time (API-04) | A build-only run checks out a branch name, a release checks out a tag (code review S-1) | — |
| Failure, edge-case, lifecycle, and recovery evidence | 70% | 95% | Real failed leg + rerun (API-10); real-tool index mismatch fails closed (API-01); arch refusal, 60-min timeout, swapped/missing digests (IMP-01, IMP-03) | Arch refusal and wait timeout proven with fakes only | — |
| User-surface, browser, and desktop-shell confidence | N/A | N/A | No UI: CI workflow only | — | — |
| Durable regression coverage quality and relevance | 90% | 95% | 73 step tests run the real `run:` blocks, and the mutations show they catch the key breaks (IMP-01, IMP-03); live behavior is proven by the documented build-only run (RELEASE.md), which cannot be a repository test | — | — |

- Overall post-repository confidence: 57%
- Overall final confidence: 95% (mean of the six applicable categories: 95.2%)
- Calculation method: simple average of the applicable categories
- Every critical acceptance criterion directly proven, apart from parts only the user can check: `Yes` (AC-003's publish-only part is user-only: a release)
- Any final applicable category below `90%`: `No`
- Default final confidence target of `95%` met: `Yes`
- Confidence-limiting residual risks: the publish path (tags, `Move beta tag` with its new `tree:0` checkout, upload) is first exercised at the next release (R-002, AC-003). R-001 (CLI skew after a late leg rerun) is accepted upstream.

## Broader Validation Decision (Mandatory)

- Decision: `Required` (executed)
- Execution mode: `Other` (real GitHub Actions runs on the ticket branch and a throwaway branch, plus local Buildx probes against Docker Hub)
- Confidence gap it addresses: timing, native arm64, the real dry-run output shape, digest and artifact hand-over, publish gating and rerun behavior all exist only on GitHub runners and the registry. Repository tests replace them with fakes. Gain: 57% → 95%.
- Browser validation needed: No (no UI).
- If `Not Required`: N/A
- If `Blocked`: N/A

## Compatibility / Legacy Scope Check

- Reviewed requirements/design introduce, tolerate, or ambiguously describe backward compatibility in scope: `No`
- Compatibility-only or legacy-retention behavior observed in implementation: `No` (the real log has no QEMU, no GHA cache, no `build-and-push` job: API-02)
- Durable coverage added or retained only for compatibility-only behavior: `No`
- If compatibility-related invalid scope was observed, reroute classification used: N/A
- Upstream recipient notified: N/A

## Durable Coverage Changed In The Codebase

- Repository-resident durable coverage added, updated, or removed this round: `No`

| Path / Test | Change | Case IDs | For A Removal |
| --- | --- | --- | --- |
| None | — | — | — |

- Added or updated paths attached for proportional test-code review: `Not Applicable`
- Diff or repository evidence supplied for removed paths: N/A

## Dependencies Mocked Or Emulated

| Dependency | Method | Why Real Dependency Was Not Used | Confidence Limitation |
| --- | --- | --- | --- |
| A failing build leg | API-10 probe step that fails arm64 on attempt 1 (throwaway branch) | A real leg failure cannot be produced on demand | The failure sits before the build step; rerun semantics are the same |
| Publish-mode registry and release writes | Fakes in IMP-01 | Publishing is a release, the user's decision | AC-003 at the next release |

## Temporary Methods And Cleanup

| Item | Owned By This Run | Cleanup Action | Result |
| --- | --- | --- | --- |
| Throwaway branch `codex/api520-rerun-probe` (remote and local) and worktree `/tmp/api520/probe-wt` | Yes | `git push origin --delete`, `git worktree remove --force`, `git branch -D` | Removed (`remote probe branches left: 0`, `probe worktrees left: 0`) |
| Local probe folder `/tmp/api520` (scripts, downloaded logs, run JSON) | Yes | Removed after the evidence was written | Removed |
| Untagged per-architecture manifests pushed by runs 44148955212, 44149091734, 44152041214 (8 digests) | Yes (created by the workflow) | Left in Docker Hub, as DEC-004 accepts: untagged, reachable only by digest | Kept by design |
| Run artifacts `server-image-digest-*` and `.dockerbuild` records | Yes (created by the workflow) | Expire with their retention (digests 7 days) | Kept by design |
| Ticket branch `codex/server-docker-build-speed` on origin | Pushed for this validation | Kept: delivery needs it | Kept |

## Observations (Non-Blocking)

- OBS-1, build checkout slower at depth 1. The build legs' `fetch-depth: 1` checkout is slower than beta.8's full-history checkout. `git fetch --depth=1` took 1m50s-2m15s in all four observed legs; beta.8's full fetch took 34 s (evidence: `API-06-timing-table.md`, section "Observation"). It adds about 1.5 min to each leg, on the critical path. No criterion is affected (9m52s against 30 min). The design chose depth 1 to lighten the checkout, and the measurement shows the opposite on GitHub. This change introduced it, so it belongs to this ticket's design, not to a follow-up. Whether to change it (for example back to the default fetch, or `filter: blob:none`) is the Solution Designer's call; nothing here requires it.
- OBS-2, platform notices only. Every job carries GitHub's notices "Node.js 20 is deprecated … forced to run on Node.js 24" and "ubuntu-latest label will migrate to Ubuntu 26". Both are platform notices, not from this change.

## Latest Authoritative Result

- Result: `Pass`
- Criteria not proven, or parts only the user can check (IDs): AC-003, its publish-only part (tag push, pushed-index check on the version tag, `Move beta tag` with the new checkout, upload, `latest*.yml` order). Only The User Can Check, at the next release.
- Preliminary classification and recommended owner (on `Fail`): N/A
- Next recipient from `get_handoff_rules`: see the handoff (code reviewer, per the reviewed route)
- Notes: build-only total 9m52s (beta.8: 39m00s; beta.9 attempt 1 cancelled after a 1h54m build step). Native arm64 build-and-push takes 4m14s. The dry-run index check works on the real tool's output. Nothing was published. Rerunning one failed leg works.
