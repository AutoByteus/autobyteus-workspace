# Implementation Handoff — autobyteus-305, build step 1 (signed server package)

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: independent architecture review selected (Large / High) and passed: ARCH-REV-002, `Pass`, round 2, for SR-005. Implementation started from build step 1 as the reviewer's handoff asked. Route after implementation: see Routing Classification.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/requirements-doc.md` (Approved, SR-003; editorial SR-005)
- Investigation notes: `.../investigation-notes.md`
- Solution revision record: `.../solution-revision-record.md` (SR-001..SR-005)
- Design spec: `.../design-spec.md` (SR-005, `Ready`)
- Supplemental task artifacts: `.../options-report.md` (approved at SR-003), `.../follow-ups.md` (FU-001..FU-005; FU-005 added here)
- Design review report: `.../design-review-report.md` (ARCH-REV-002, Pass)
- Architecture review revision record: `.../architecture-review-revision-record.md`
- Triggering rework report: `N/A` (initial implementation of step 1)

All paths are in the ticket folder
`/Users/normy/autobyteus_org/autobyteus-worktrees/docker-node-in-place-server-update/tickets/in-progress/docker-node-in-place-server-update/`.

## Current Implementation Summary

Build step 1 of the design spec's "Change / Refactor Sequence": **signed server package**. The image
runs its server from a built-in server package, and every default-variant release publishes that same
package per architecture, signed, on the GitHub release. There is no starter yet (step 2): supervisord
still runs `node dist/app.js`, now from `/opt/autobyteus/server-package`.

- Implementation cycle: `Initial`
- Implementation revision record: `.../implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-005`
- Related architecture-review revision IDs: `ARCH-REV-002`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`
- Branch and commits: `codex/docker-node-in-place-server-update`, base `origin/personal` @ `9d59ab82ec`:
  - `01c56f1b95` feat(docker): run the server from a signed server package
  - `5c33c1b7b0` docs(testing): run a worktree's server package in a test Docker node
  - the ticket-documents commit that carries this handoff and the evidence (`git log -1 -- tickets/in-progress/docker-node-in-place-server-update/implementation-handoff.md`)
- Not pushed. No release, tag or workflow run.

## Routing Classification (Mandatory)

- Task size: `Large`
- Architecture risk: `High`
- Design classification section / evidence reference: design-spec.md "Task Size And Architectural Risk (Mandatory)"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: step 1 alone touches the image (Dockerfile stages, base pinned by digest), CI (a new job with `contents: write` and a signing secret), the launcher (bash and PowerShell run arguments), and the docs that hold rules (DESIGN.md rule 9, RELEASE.md). It adds the supply-chain trust anchor: the public key, plus the secret now set in GitHub. None of the design's escalation triggers fired:
  - the package is byte-identical between the image and the archive (IMP-06, IMP-07);
  - the server does not write into its app root (IMP-08, read-only mount);
  - the bounded stop and data copy are not part of step 1.
- Selected route: `Code Review` (Large / High). The recipient comes from `get_handoff_rules`.
- Lightweight implementation self-review for the direct route: `Not Applicable`
- New design impact or escalation trigger: `None`. Two small design gaps were closed inside the design's intent; they are listed under Important Assumptions (A-1, A-2) for the reviewer to confirm.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-003 (REQ-009, AC-011; REQ-004 groundwork) | Each release publishes per architecture the server package, its description and signature; the image contains the same package as its built-in version | DS-004. `Dockerfile.monorepo`: the builder runs `pnpm --filter autobyteus-server-ts deploy /out/server-package --legacy`, then in the deployed folder `prisma generate`, the onnxruntime-web prune (the existing `autobyteus-web/scripts/onnxruntime-web-packaging.mjs`, with its embedding check), `mobile-web`, and `describe-server-package.mjs package-json`. Stage `server-package` (`FROM scratch`) holds only the package; runtime `COPY --from=server-package / /opt/autobyteus/server-package`. Workflow job `publish-server-package` (matrix `linux/amd64`, `linux/arm64`, default variant only): `docker create` + `docker cp` out of the pushed image → `tar … \| gzip -n` → `describe-server-package.mjs description` → `sign-server-package.mjs` (checks against the committed public key) → wait up to 30 min for the GitHub release → `gh release upload --clobber` (archive, description, signature) | Done. Dry run of the job's own step bodies on locally built images: both architectures byte-identical (IMP-06, IMP-07); archives 0.28 GB (QR-001 ≤ 0.35 GB). The real upload is proven only by the first release (not run: no release without the user) |
| BEH-005 groundwork (REQ-008) | A package declares the system level it needs | `system-level.json` `{ level, baseImages: { default, zh }, systemInputsSha256 }` (DS-004 shape); `check-system-level.mjs` hashes the base digests plus the runtime stage from `FROM … AS runtime` to the marker `# ---- end of the system part (system-level.json) ----`; the build job runs it before building, and each variant builds from its digest; `server-package.json` records `systemLevel` | Done (IMP-01, IMP-02). The node-side refusal comes with the starter (step 3) |
| BEH-001 (preserved) | `upgrade --all` keeps working; volumes kept | Image still started by supervisord (`supervisor-autobyteus-server.conf` now `cd /opt/autobyteus/server-package && exec node dist/app.js …`); launcher run arguments lose only the dead `AUTOBYTEUS_WORKSPACE_ROOT` and `AUTOBYTEUS_SKIP_SYNC`; volumes unchanged | Preserved (IMP-05; launcher tests in IMP-01) |
| Removal plan | `bootstrap.sh`, its entrypoint call and `app.js` check, its environment in launcher (bash, PowerShell), compose, `.env.example`, `docker-start.sh`, the e2e test; `AUTOBYTEUS_WORKSPACE_ROOT` (3 places); the workspace `node_modules` copy | All removed as listed. Also removed: the unused `BIND_HOST` in `entrypoint.sh` (dead in a touched file) | Done; `bootstrap.sh` added to the retired-asset guard in `test_docker_build_context_sources.py` |
| Derived consumers (step 1) | Old-layout consumers moved | `TESTING.md` Docker rule (its own commit), `server_docker_cli_smoke.py`, `nodes-docker-address-probe.mjs`, `prisma-engine-discovery.docker.mjs` (paths; the `supervisorctl pid` change is step 2), compose `autobyteus-server-server-packages` volume, `autobyteus-server-ts/docker/README.md`; `RELEASE.md` 17 → 23 assets, secret, level check; GLOSSARY terms; DESIGN.md rule 9 exception (C1–C4) | Done. The root `README.md` Docker section names only the launcher's volumes; it changes with the launcher volume in step 2 |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Key Files Or Areas

- Image: `autobyteus-server-ts/docker/Dockerfile.monorepo`, `system-level.json`, `server-package-signing-key.pem` (public key), `entrypoint.sh`, `supervisor-autobyteus-server.conf`, `build.sh`, `build-multi-arch.sh`, `docker-compose.yml`, `.env.example`, `docker-start.sh`; `bootstrap.sh` deleted.
- CI scripts (Node built-ins only): `scripts/server-package/describe-server-package.mjs` (the one writer of `server-package.json` and the description; refuses non-release versions, a wrong archive name, a version other than the tag, and links that leave the package), `sign-server-package.mjs`, `check-system-level.mjs`, `generate-signing-key.mjs`.
- Workflow: `.github/workflows/release-server-docker.yml` ("Check system level" step; `BASE_IMAGE_DIGEST` per variant; job `publish-server-package`, the only job with `contents: write`).
- Launcher: `scripts/public/docker/autobyteus-docker.d/bash/container-config.sh`, `powershell/DockerRuntime.ps1`.
- Tests: new `scripts/tests/test_server_package_release.py` (20 tests); updated `test_docker_build_context_sources.py`, `test_server_docker_browser_bridge.py`, `test_server_docker_cli_latest_defaults.py`, `server_docker_cli_smoke.py`; Docker e2e paths in `autobyteus-server-ts/tests/e2e/startup/prisma-engine-discovery.docker.mjs` and `autobyteus-web/tests/e2e/nodes-docker-address-probe.mjs`.
- Docs: `DESIGN.md` (rule 9 exception), `GLOSSARY.md` (server package, built-in server package, starter, in-place update, system level), `RELEASE.md`, `TESTING.md`, `autobyteus-server-ts/docker/README.md`.

## Important Assumptions

Implementation decisions inside the design, for the reviewer to confirm:

- **A-1, re-publishing a ref from before server packages:** the design's workflow-form table assumes every re-published ref has packages. A `release_ref` without `system-level.json` is refused in "Check system level", with the way out in the error: run that ref's own workflow, `gh workflow run release-server-docker.yml --ref <tag> …`. The alternative was to keep `BASE_IMAGE_TAG` beside `BASE_IMAGE_DIGEST` for old Dockerfiles, a legacy dual path. Without either, a zh re-publish of an old ref would silently build on the default base.
- **A-2, self-reference link:** `pnpm deploy --legacy` leaves `node_modules/.pnpm/node_modules/autobyteus-server-ts → ../../../../../app/autobyteus-server-ts`, a link out of the package. `docker cp` refuses it, so the CI extraction would fail; it also dangles in the image. The Dockerfile removes that one link: no code imports the server by its package name (`git grep` of `src` finds none). `describe-server-package.mjs package-json` refuses any link that leaves the package, so a new one fails the image build instead of the release.
- **C3 details fixed now (frozen from the first release):**
  - `dataMigrations` entries are prefixed by kind: `prisma/<folder>` and `app-data/<folder>`, sorted, read from the package's own `prisma/migrations` and `dist/app-data-migrations/migrations`;
  - `nodeModuleVersion` is the string `process.versions.modules` (`"127"`);
  - the signature file is the bare base64 text with no line break;
  - the archive holds the package's contents at its root (`./server-package.json`, `./dist/…`), made with `tar --sort=name --owner=0 --group=0 --numeric-owner … | gzip -n`;
  - the release version comes from `autobyteus-web/package.json` (the release version's one owner), and the package job refuses a package whose version is not the tag.
  - Real examples: `evidence/IMP-06-description-arm64.json`, `evidence/IMP-07-description-x64.json`.
- **Base pin:** the Dockerfile default `ARG BASE_IMAGE_DIGEST=` must equal `baseImages.default`. `check-system-level.mjs` refuses a mismatch, so the digest is recorded twice but cannot drift. The workflow passes the digest for each variant, default included.
- **Deferred to the step that reads them:** `/opt/autobyteus/system-level` and copying the public key into the image come with the starter (steps 2–3); nothing reads them in step 1.
- **Config hash:** `CONFIG_HASH_VERSION` stays `v6` in step 1. The removed environment arguments are not hash inputs (`container-config.sh:2-11`), and the first new image recreates every node anyway (image-ID check). The design's hash change comes with the volume in step 2.
- **QR-001 and trimming:** the package is 0.28 GB per architecture without further trimming, so step 1 does not trim. What a deployed package carries beyond what runs (`src/`, `tests/`, `tickets/`, …) is FU-005; it also concerns the desktop.

## Known Risks

- **The secret–public key pair** is checked only in CI (`sign-server-package.mjs` fails on a mismatch). Locally I verified only that the script writes a public key that matches the private key it hands to `gh` (IMP-01, fake `gh`). The first release with this change proves the real pair.
- **First release with this change:**
  - the package job pulls each architecture's image on a runner, after freeing disk the same way the build job does;
  - it waits up to 30 minutes for the desktop workflow's release (R-05; a timeout leaves a partial release in the RELEASE.md sense).
  - Neither ran here: no release without the user.
- **The base images are now pinned:** a new `chrome-vnc` push no longer reaches builds until `system-level.json` (digests, level, hash) and the Dockerfile default change together. This is intended by the design.
- **Any edit in the runtime system part,** including the agent-CLI install lines, now needs a level raise. Nodes then need a new image for packages built after it (by design; the CI message gives the new level and hash).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: `Larger Requirement` (feature)
- Reviewed root-cause classification: `No Design Issue Found`
- Reviewed refactor decision: `No Refactor Needed` (the dead `bootstrap.sh` removal is part of the change)
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`
- Evidence / notes: the server needed no change; the package is the existing deployed server (A-13 holds: read-only start, IMP-08).

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None` (old refs are refused with a way out, not built by a dual path: A-1)
- Legacy old-behavior retained in scope: `No`
- Dead code in the touched files and modules removed: `Yes`. Removed: `bootstrap.sh` with its environment, the entrypoint path check, `WORKSPACE_ROOT` and `BIND_HOST` in `entrypoint.sh`, the workspace copy in the runtime stage, and `bootstrap.sh` in the CLI test's file list.
- Dead code found elsewhere, added to `follow-ups.md`: FU-005 (package content beyond the running server; not dead code in the strict sense, recorded as packaging weight)
- Shared structures remain tight: `Yes`. `server-package.json` has five fields; the description adds only `archive`; one writer.
- Canonical shared design guidance reapplied: `Yes`
- Changed source implementation files within size guardrails: `Yes`. The largest new file is `describe-server-package.mjs` (142 lines); the workflow grew by 146 lines (YAML).
- Notes: N-1 stale wording followed as the reviewer said: the volume name is `<node>-server-packages` (compose: `autobyteus-server-server-packages`) and `system-level.json` uses the DS-004 shape.

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected` for the data volume's formats; the starter state is new (step 2+)
- Design-spec decision reference: "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`. Step 1 changes no stored data. The new compose volume is mounted, empty.
- Deviation: `None`

## Environment Or Dependency Notes

- New GitHub Actions secret `SERVER_PACKAGE_SIGNING_KEY` on `AutoByteus/autobyteus-workspace`, set 2026-10-30T15:54:14Z by `generate-signing-key.mjs`. The user was told in the conversation before it ran; no browser confirmation was needed. The private key was never printed or written to disk (IMP-10).
- Local test images kept for reuse: `autobyteus-server-305-test:step1` (arm64, `sha256:ae18d6c1a66e…`) and `autobyteus-server-305-test:step1-amd64` (`sha256:8588804dc903…`), both built from `01c56f1b95`'s Dockerfile and scripts. Delete them with `docker image rm` when no longer needed. All test containers were removed with `docker rm -f -v`. The user's nodes `autobyteus-server-0/1/2` and their volumes were not touched.
- The scripts need only Node 22 built-ins. The workflow step "Check system level" uses `jq` (present on `ubuntu-latest`).

## Checks Run

Evidence files are in `tickets/in-progress/docker-node-in-place-server-update/evidence/`.

| Check ID | Command Or Steps | Commit Tested | Environment | Code It Exercises | Behavior / Criteria IDs | Result | Evidence Files | Look For |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| IMP-01 | `python3 -m unittest discover -s scripts/tests -p 'test_*.py' -v` | `5c33c1b7b0` | macOS arm64, Python 3, Node 22; fake docker/gh | all of `scripts/tests` incl. new `test_server_package_release.py` (scripts, "Check system level" step, package job steps with fake docker/gh, key generator) and the updated Docker/launcher tests | AC-011, REQ-008, REQ-009, REQ-013 | Pass | `IMP-01-script-tests.log` | `Ran 174 tests` … `OK (skipped=2)` |
| IMP-02 | `actionlint` on the workflow; `shellcheck` build.sh, build-multi-arch.sh, entrypoint.sh; `node scripts/server-package/check-system-level.mjs`; `node --check` of changed `.mjs` | `5c33c1b7b0` | macOS arm64 | workflow, build scripts, level file | REQ-008 | Pass | `IMP-02-lint-and-level.log` | `actionlint: no findings`, `System level 1: the system part is unchanged` |
| IMP-03 | `docker buildx build --load --platform linux/arm64 -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-server-305-test:step1 .` | `01c56f1b95` (same Dockerfile/script blobs) | Docker 29.0.1, native arm64 | Dockerfile stages, deploy, describe `package-json` | REQ-009 | Pass | `IMP-03-image-build-arm64.log`, `.full.log` | `Wrote server-package.json: 1.5.11-beta.5 linux-arm64, Node modules 127, system level 1, 61 migrations` |
| IMP-04 | same, `--platform linux/amd64`, tag `step1-amd64` | `01c56f1b95` | amd64 under QEMU | same | REQ-009 | Pass | `IMP-04-image-build-amd64.log`, `.full.log` | `Wrote server-package.json: 1.5.11-beta.5 linux-x64, …` |
| IMP-05 | test container from IMP-03 image on `127.0.0.1:<free port>`, no user volumes; health, `/mobile/`, GraphQL, supervisor status, server cwd | `01c56f1b95` | arm64 | runtime stage, supervisord program, entrypoint | BEH-001 (preserved), REQ-009 | Pass | `IMP-05-container-runs-built-in-package.log` | `server cwd: /opt/autobyteus/server-package`, `{"status":"ok"…}`, `bootstrap present: no` |
| IMP-06 | CI dry run, arm64: the workflow's own "Extract…" and "Archive, describe and sign…" step bodies (real docker; GNU tar in `node:22-bookworm`; throwaway key); manifest of image folder vs unpacked archive; signature checks | `01c56f1b95` | arm64 | package job, describe `description`, sign | AC-011, QR-001, REQ-004 groundwork | Pass | `IMP-06-package-dry-run-arm64.log`, `IMP-06-description-arm64.json`, `IMP-06-manifest.sh` | `BYTE-IDENTICAL`, `45296` entries, `signature verifies … true`, `… beta.6 verifies: false`, 279750692 bytes |
| IMP-07 | same for amd64 (batched manifest) | `01c56f1b95` | amd64 image under QEMU | same | AC-011, QR-001 | Pass | `IMP-07-package-dry-run-amd64.log`, `IMP-07-description-x64.json`, `IMP-07-manifest-batched.sh` | `BYTE-IDENTICAL`, `83897` lines each, 282090794 bytes |
| IMP-08 | TESTING.md recipe: `--target server-package --output type=local,dest=…`, mounted read-only over `/opt/autobyteus/server-package` | `01c56f1b95` | arm64 | new TESTING rule; app root read-only | Escalation trigger "server writes into its app root" | Pass | `IMP-08-testing-recipe-read-only-package.log` | `{"status":"ok"…}`, `Read-only file system`, migrations completed |
| IMP-09 | `python3 scripts/tests/server_docker_cli_smoke.py --image autobyteus-server-305-test:step1 --platform linux/arm64` | `01c56f1b95` | arm64, `--network none`, test volumes | image CLI layer, new package path probe | BEH-001 (preserved) | Pass | `IMP-09-image-cli-smoke.log` | `PASS: clean/reused-home default and login shells; offline versions; preserved fixtures` |
| IMP-10 | `node scripts/server-package/generate-signing-key.mjs` (user told first) | `01c56f1b95` | gh signed in, repo scope | key generator | REQ-004, QR-003 | Pass | `IMP-10-signing-key-created.log` | `SERVER_PACKAGE_SIGNING_KEY 2026-10-30T15:54:14Z`; public key block |
| IMP-11 | `check_licensing.py`, `check_repository_artifact_hygiene.py`, `scripts/check_secrets.sh origin/personal..5c33c1b7b0` | `5c33c1b7b0` | macOS arm64 | whole branch | REQ-013 | Pass | `IMP-11-repository-gates.log` | `secret gate: PASS (no secrets found)` |

- Not run, and why:
  - the real release path (package job on GitHub, upload, waiting for the desktop release, the real secret/key pair): it needs a release, and there is none without the user's request;
  - `pnpm -C autobyteus-server-ts test:e2e:prisma-engine-discovery:docker` and `pnpm -C autobyteus-web test:e2e:nodes-docker-address`: only their image paths changed (`node --check` passes). They are heavy probe-owned stacks, left to API/E2E;
  - server/web unit tests and typechecks: no server or web source changed;
  - PowerShell launcher: no `pwsh` on this machine. The change only deletes two `-e` array items, mirrored in bash and covered there by IMP-01;
  - zh variant image build: only its build argument changed (digest from `system-level.json`, covered by IMP-01).

## Frontend Rendered-Result Check (When Applicable)

`Not Applicable`: step 1 changes no rendered frontend. The `/mobile` shell is only repackaged; IMP-05 shows it is still served (200). The desktop UI comes in step 4.

## Downstream Coverage Hints / Suggested Scenarios

- Run the two Docker e2e probes against `autobyteus-server-305-test:step1`; their mounts now target `/opt/autobyteus/server-package/dist`.
- Upgrade path from the published `:beta` image to a step-1 image with the launcher, using test-owned nodes only (not `autobyteus-server-0/1/2`): `autobyteus-docker upgrade` recreates the container. Expected: data and root-home volumes kept, server starts from the package.
- Compose path (`docker-start.sh up --build-local`) now mounts `autobyteus-server-server-packages`: check that it starts.
- A workflow-level check: `act` or a fork dry run of `release-server-docker.yml` if a non-publishing way is available. Otherwise the first release is the proof, watched as RELEASE.md describes (23 assets).

## API / E2E / Executable Coverage Investigation And Execution Still Required

- AC-011 on a real release (or a workflow dry run that does not publish): 6 package files on the release; the image's built-in package byte-identical to the published one. IMP-06/IMP-07 prove it locally on the workflow's own steps.
- The Docker e2e probes listed above, and the upgrade-path check, on test-owned nodes.
- Steps 2–5 are not implemented. AC-001..AC-010, AC-012 and AC-013 belong to later steps.
