# Docs Sync Report

## Scope

- Ticket: `server-docker-build-speed` (Project Task `autobyteus-520`, FU-002 of the beta.9 release, autobyteus-519)
- Trigger: API/E2E Pass (`API-REV-001`, 95%) and the test-code review `Not Applicable` (`CRR-002`), reviewed route (`task_size` Medium, `architectural_risk` High, source review `Pass` CRR-001), handed over by `/code_reviewer`
- Bootstrap base reference: `origin/personal` @ `1fdca761aa`
- Integrated base reference used for docs sync: `origin/personal` @ `1fdca761aa` (fetched at the start of delivery; it had not advanced, so the branch was already current; no merge was needed)
- Post-integration verification reference: not needed, no new base commits came in. The 73 workflow-step tests were run once more on the final docs state only to prove the command the new TESTING.md row documents (`Ran 73 tests`, `OK`)

## Why Docs Were Updated

- Summary: the implementation commit `1b113a8313` already changed `RELEASE.md` and `autobyteus-server-ts/docker/README.md` to match the new workflow (per-architecture native builds, no layer cache, the multi-arch index check, the build-only run, rerunning one failed architecture, the 60-minute wait). CRR-001 checked them against the workflow line by line. Delivery found two more places that still described only the desktop build-only run, and one missing description of the tests that guard this workflow.
- Why this should live in long-lived project docs: a future change to the Server Docker workflow or `autobyteus-server-ts/docker/**` must find, in DESIGN.md rule 12 and TESTING.md, that it has its own build-only run, and must find the command of its step tests; otherwise a reader following those two documents would run `pnpm release:test`, which builds only the desktop targets and does not touch this workflow.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules; rule 12 names the build-only release run for a change to a build step or gate | Updated | Rule 12 named only `pnpm release:test --ref <branch>`. It now also names the Server Docker Release's own `build_only` run for the server image. No new rule: the rule is the same, its command list is complete |
| `TESTING.md` | Project testing guideline; Test layers table and Fresh-start build | Updated | (1) Fresh-start build's "A change to a build step or gate" bullet now says the desktop build's run is `pnpm release:test`, and that `release-server-docker.yml` or `autobyteus-server-ts/docker/**` need the Server Docker build-only run, with a link to RELEASE.md. (2) New Test layers row, "Server Docker Release workflow steps", with the command that IMP-01 ran. API/E2E's coverage investigation recorded the missing row as a discrepancy |
| `RELEASE.md` | Release guide; the ticket's REQ-008 | No change (already updated in `1b113a8313`) | Checked against the workflow and the evidence: the release table row (native per-architecture builds, no layer cache, nothing tagged until both have built), the 60-minute wait, the build-only run with `gh workflow run release-server-docker.yml --ref <branch> -f build_only=true` (the command API-02 ran as documented), the "One Server Docker architecture failed" Recovery entry (API-10 exercised `gh run rerun <run-id> --failed`), the combined-case text, and `:beta` after both architectures. No stale statement remains: the old 30-minute wait is gone from the file |
| `autobyteus-server-ts/docker/README.md` | Docker docs; "GitHub Release Automation" | No change (already updated in `1b113a8313`) | Same check: native per-architecture builds with no cache, the index checks, rerun of one architecture, package from the checked digest with the arch refusal, 60-minute wait, build-only run and its timings command |
| `AGENTS.md` (repository root) | Names the three project documents | No change | No new project document was created |
| Every other long-lived `*.md` outside `tickets/` | Search for descriptions of the Server Docker build: `grep -rIl -i "type=gha\|qemu\|build-and-push\|Build And Push Server Image\|release-server-docker"` | No change | Only `RELEASE.md`, `TESTING.md` and `autobyteus-server-ts/docker/README.md` mention the workflow. The one other hit, `autobyteus-server-ts/docs/modules/node_desktop.md` ("QEMU extended key"), is a keyboard code, unrelated |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `DESIGN.md` (rule 12) | Clarification of a command list | The build-only release run is `pnpm release:test --ref <branch>` for the desktop build, and the Server Docker Release's own `build_only` run for the server image | `pnpm release:test` runs only the Desktop Release; the server image's build-only run is new in this ticket |
| `TESTING.md` (Fresh-start build) | Clarification, with a link | The build-only run for a build-step or gate change is `pnpm release:test` for the desktop build, and the Server Docker Release's own build-only run for the workflow and `autobyteus-server-ts/docker/**` | As above |
| `TESTING.md` (Test layers) | New row | "Server Docker Release workflow steps": what the four step-test files prove, with fakes, and what only the build-only run proves; the `python3 -m unittest` command of the four files | The layer existed without a row; this ticket grew it from the package job to the whole job graph and the index check, and API/E2E recorded the gap |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Per-architecture native builds, no layer cache | Each architecture builds on its own native runner at the same time and is pushed untagged, by digest; nothing is tagged until both have built; a layer cache was dropped because no release ever reused it | `design-spec.md`, `requirements-doc.md` (DEC-001), `evidence/API-06-timing-table.md` | `RELEASE.md` (Watching The Rollout table, Workflow Reference), `autobyteus-server-ts/docker/README.md` (GitHub Release Automation) — already in `1b113a8313` |
| The package is the image's own | Each package is taken out of the per-architecture image whose digest the checked multi-arch index lists for that architecture, and the job refuses a package whose `arch` differs | `design-spec.md` (DEC-002), `evidence/API-01`, `API-03`, `API-09` | `autobyteus-server-ts/docker/README.md` — already in `1b113a8313` |
| Build-only run of the Server Docker Release | Proves a change to the workflow or the Dockerfile before the merge; publishes nothing; own concurrency group; leaves untagged manifests in Docker Hub by design | `requirements-doc.md` (DEC-003, DEC-004), `evidence/API-04-nothing-published.log` | `RELEASE.md` (Build-only release run), `docker/README.md`, now also `DESIGN.md` rule 12 and `TESTING.md` |
| Recovering one failed architecture | `gh run rerun <run-id> --failed` reruns only that architecture, then the publish; not "Re-run all jobs" | `evidence/API-10-rerun-failed-leg.log` | `RELEASE.md` (Recovery) — already in `1b113a8313` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `build-and-push` job: both architectures in one job, arm64 under QEMU emulation | A `build` matrix of two native legs (`ubuntu-latest`, `ubuntu-24.04-arm`), then `publish-image` | `RELEASE.md`, `docker/README.md` |
| GitHub Actions layer cache (`cache-from/to type=gha`) | No layer cache | `RELEASE.md` (release table row), `docker/README.md` |
| Package extraction from the pushed tag, per platform | Extraction from the per-architecture digest the checked index lists | `docker/README.md` |
| Package job's 30-minute wait for the GitHub release | 60 minutes | `RELEASE.md`, `docker/README.md` |
| "Per-tag build-only run only for the Desktop Release" reading of `pnpm release:test` | The Server Docker Release's own build-only run, beside it | `RELEASE.md`, `DESIGN.md` rule 12, `TESTING.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

Not used: docs changed (above).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket, commit, Secret Gate, push the ticket branch, finalize on `personal`, bring the user's checkout up to date, clean up.
- Notes: follow-ups found by other roles are recorded in `follow-ups.md` (FU-001, FU-002); neither changes a document. A rule for the next release to verify AC-003's publish-only part is a ticket matter, not a standing rule, so it is in the release/deployment report and the handoff summary, not in `RELEASE.md`.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

Not applicable.
