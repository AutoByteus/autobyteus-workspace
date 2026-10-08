# Implementation Handoff — agpl-dual-licensing, Slice 2

> Not legal advice. `CLA.md` and the licence wording need lawyer review before they are relied on (REQ-011).

## Upstream Artifact Package

- Upstream review applicability and handoff-rule result: Direct route (Medium/Low). Independent architecture review was skipped; the design was not skipped. Solution Designer `get_handoff_rules` matched "Architecture Design Complete with task_size=Small or Medium and architectural_risk=Low" and routed to implementation_engineer.
- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/requirements-doc.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/investigation-notes.md`
- Solution revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/solution-revision-record.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/design-spec.md`
- Solution handoff: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/solution-handoff.md`
- Supplemental task artifacts: None
- Design review report: `N/A — not applicable`
- Architecture review revision record: `N/A — not applicable`
- Triggering rework report, revision record, or evidence: N/A (initial)

## Current Implementation Summary

Slice 2 is implemented per the design spec's Final File Responsibility Mapping in one commit, `411bac9c9`, on `codex/agpl-dual-licensing-slice-2`. The base is `origin/personal` @ `714c41324`, and the ticket artifacts are at `aa025d1bf`.

- Implementation cycle: `Initial`
- Implementation revision record: `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo-agpl-slice-2/tickets/in-progress/agpl-dual-licensing-slice-2/implementation-revision-record.md`
- Current implementation revision ID: `IR-001`
- Related solution revision IDs: `SR-007`
- Related architecture-review revision IDs: `N/A`
- Related code-review revision IDs: `N/A`
- Related API/E2E revision IDs: `N/A`
- Related delivery revision IDs: `N/A`
- Triggering finding IDs: `N/A`

## Routing Classification (Mandatory)

- Task size: `Medium`
- Architecture risk: `Low`
- Design classification section / evidence reference: design-spec.md § "Task Size And Architectural Risk"
- Classification confirmed or changed: `Confirmed`
- Evidence and rationale: 19 files, each extending an existing owner with an existing local pattern. There is no runtime, API, persistence, security or concurrency change. Each design escalation trigger was checked:
  - **Checker on the current tree:** it passes on `personal` (exit 0, 6388 tracked files at base, 6395 with this change) and only fails on real violations (demonstrated).
  - **Signing/notarization:** the `copyright` string and extra resources are standard electron-builder inputs packaged inside the bundle. The local build is unsigned (no identity in the worktree), so signing results could not be compared. See Known Risks.
  - **Dockerfile stages:** no restructuring. Two lines were added after `WORKDIR /app` in each runtime stage.
  - **Gateway `files`/publish contract:** unchanged. `LICENSE` is already in the gateway packlist.
- Selected route: `Direct API/E2E`
- Lightweight implementation self-review completed for the direct route: `Yes`. Every mapping row was checked against the design. CLA §1–10 follow the spec; I removed a patent-grant widening I had drafted, so §4 matches the spec's grant exactly. CONTRIBUTING and the PR template link to `CLA.md` and copy no terms. The checker constants match the spec verbatim. `build.ts` owns no licence policy. The component map exists only in the checker.
- New design impact or escalation trigger: `None blocking`. Two upstream discrepancies are recorded below (UD-001, UD-002) for Solution Designer awareness. Neither changes what was implemented or what ships.

## Reviewed Behavior Implementation Trace

| Behavior ID | Approved Change / Preserved Outcome | Implemented Production Path / Key Files | Result / Notes |
| --- | --- | --- | --- |
| BEH-004 (desktop) | LICENSE + LICENSING.md + NOTICE in the app, plus the About/copyright line | `productLicensePackaging.ts` (new) → `build.ts` (`copyright: PRODUCT_COPYRIGHT`, `...PRODUCT_LICENSE_EXTRA_RESOURCES` in `extraResources`, preflight `Missing required product license file for packaging: <path>`) | macOS arm64 worktree build: `Contents/Resources/{LICENSE,LICENSING.md,NOTICE}` are present and byte-identical to the sources (LICENSE sha256 `0d96a4ff…abcb0`). `Info.plist` `NSHumanReadableCopyright` is exactly `PRODUCT_COPYRIGHT`. Windows `LegalCopyright` comes from the same `copyright` key (electron-builder) but was not built on this host |
| BEH-004 (Docker) | Licence files in `/app` + OCI label in all 4 runtime images | `autobyteus-server-ts/docker/Dockerfile.monorepo`, `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server`, `autobyteus-message-gateway/docker/Dockerfile`: `COPY LICENSE LICENSING.md NOTICE /app/` + `LABEL org.opencontainers.image.licenses="AGPL-3.0-only"` after the runtime-stage `WORKDIR /app` | Released `Dockerfile.monorepo` was built and verified: `/app/{LICENSE,LICENSING.md,NOTICE}` present, LICENSE sha256 matches, label `AGPL-3.0-only`. All 4 pass `docker build --check`. The other 3 cannot be built on base (UD-001, UD-002) |
| BEH-004 (gateway pkg) | Licence files in the runtime tarball | `build-runtime-package.mjs`: `copyProductLicenseFilesToStage()` after `deployGatewayPackageToStage()`; `verifyLicenseFiles()` after `verifyRuntimeEntrypoint()`, before archiving | `node --check` OK. `LICENSE` is in the gateway packlist (`npm pack --dry-run`); copy sources exist. End-to-end build not possible on base (UD-001) |
| BEH-005 | CONTRIBUTING + CLA v1.0 + PR checkbox; owner merges only after acceptance | `CLA.md`, `CONTRIBUTING.md`, `.github/pull_request_template.md` (new); `LICENSING.md` "Contributions" section; README License-section line | Content per spec. `CLA.md` contains no "Apache" (claim scan passes) |
| BEH-001…003 (gate) | Automated checker as release gate | `scripts/check_licensing.py` + `scripts/tests/test_check_licensing.py`; `Check licensing consistency` step in `release-desktop.yml` (after hygiene), `release-server-docker.yml` (`build-and-push`, after checkout), `release-android.yml` (`prepare-release`, after checkout), `release-ios.yml` (`prepare-release`, after the release-ref checkout; see IMPL-NOTE-001); README hygiene-area bullet | Exit 0 on tree, exit 1 with grouped messages on deliberate violations; 12/12 unittests |

- Changes stayed within the requirements doc's Scope Guardrail: `Yes`

## Implementation Notes And Upstream Discrepancies

- **IMPL-NOTE-001 (iOS gate placement).** The design says "after the first checkout in `prepare-release`". In `release-ios.yml` the first checkout is "Checkout workflow helper scripts", which checks out the default ref, not the release ref. Gating there would check the wrong tree. The step therefore sits right after "Checkout release ref" in the same job, so it checks the tree being released. That matches the design's intent ("each workflow first proves the tree's licensing is consistent") and adds no new behavior.
- **UD-001 (gateway no longer a shipped or buildable artifact).** Commit `40f769e0d` (2026-09-24, "remove external messaging from the main product") removed `autobyteus-message-gateway` from `pnpm-workspace.yaml` and deleted `release-messaging-gateway.yml`. As a result, on the base commit:
  - `pnpm -C autobyteus-message-gateway build:runtime-package` fails at the gateway `build` step (`tsc: command not found`; root `pnpm install` does not install it);
  - its `pnpm --filter autobyteus-message-gateway deploy` step would also fail without workspace membership;
  - the gateway Dockerfile's `pnpm install --filter autobyteus-message-gateway...` matches no workspace project.

  REQ-007 and the design treat the gateway runtime package and gateway image as shipped artifacts; today they are not released. The design-mandated edits are implemented and harmless: if the gateway is revived, it ships the licence files. Verification was limited to review, `node --check`, `docker build --check` and a packlist check. Repairing or removing the gateway packaging is out of scope. **Solution Designer may want to reconcile REQ-007's artifact list.**
- **UD-002 (`remote-server` / `allinone` images unbuildable on base).** `docker build -f docker/Dockerfile.remote-server .` fails in the builder stage with `ERR_PNPM_WORKSPACE_PKG_NOT_FOUND`. The server depends on `@autobyteus/agent-presentation-contracts` (and `collaboration-stream-contracts`), but these Dockerfiles do not copy those packages; only `Dockerfile.monorepo` does. The `allinone` Dockerfile has the same gap. This predates the slice and is unrelated to the edits, which only touch the runtime stage. Those two runtime stages were verified by review and `docker build --check`. Out of scope; reported for follow-up.

## Key Files Or Areas

- Desktop: `autobyteus-web/build/scripts/productLicensePackaging.ts` (new), `autobyteus-web/build/scripts/build.ts`, `autobyteus-web/tests/integration/product-license-packaging.integration.test.ts` (new)
- Docker: `autobyteus-server-ts/docker/Dockerfile.monorepo`, `docker/Dockerfile.allinone`, `docker/Dockerfile.remote-server`, `autobyteus-message-gateway/docker/Dockerfile`
- Gateway: `autobyteus-message-gateway/scripts/build-runtime-package.mjs`
- Gate: `scripts/check_licensing.py` (new), `scripts/tests/test_check_licensing.py` (new), `.github/workflows/release-{desktop,server-docker,android,ios}.yml`
- Docs: `CLA.md` (new), `CONTRIBUTING.md` (new), `.github/pull_request_template.md` (new), `LICENSING.md`, `README.md`

## Important Assumptions

- `PRODUCT_COPYRIGHT`, the holder name, the CLA wording and the PR-template URL (`blob/personal/CLA.md`) are used exactly as specified.
- The checker reads only git-tracked files, so untracked scratch files are ignored by design (verified by test).

## Known Risks

- **Signing/notarization not exercised locally.** The worktree has no `.env.local`, so the build is unsigned (`identity explicitly is set to null`). The added resources sit inside `Contents/Resources` and are sealed with the bundle like the existing noVNC notice. The first signed release run is the real proof.
- **Windows `LegalCopyright`** was not built on this macOS host. It comes from the same `copyright` key.
- **Release-gate false positive** would block a release. Mitigation: the gate passes on the current tree, and its messages name the file and the fix.
- UD-001 and UD-002 (above).
- Lawyer review of the CLA and licence wording (REQ-011).

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Feature (operational and contract completion)
- Reviewed root-cause classification: No Design Issue Found
- Reviewed refactor decision: `No Refactor Needed`
- Implementation matched the reviewed assessment: `Yes`
- If challenged, routed as `Design Impact`: `N/A`. UD-001/UD-002 are pre-existing packaging breakages outside this slice, not challenges to its design.
- Evidence / notes: The component map lives only in `check_licensing.py`, and rule 4 ties it to `LICENSING.md`. Each packager uses its native mechanism.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`. The Slice 1 manual grep is superseded by the checker; it was documentation only, so there was nothing to delete.
- Shared structures remain tight: `Yes`
- Canonical shared design guidance was reapplied during implementation: `Yes`
- Changed source implementation files stayed within size guardrails: `Yes`. `scripts/check_licensing.py` is a new file of 282 lines (about 230 effective), so above the 220-line delta signal. I assessed it as one cohesive owner (constants, four rules, report) that mirrors `check_repository_artifact_hygiene.py`; splitting it would scatter one policy. `build.ts` +15 lines, gateway script +22.
- Notes: —

## Persisted Data Transition Check (When Applicable)

- Approved decision: `Not Affected`
- Design-spec decision reference: design-spec.md § "Persisted Data / State Transition Decision"
- Implementation follows the approved decision: `Yes`
- Deviation: `None`

## Environment Or Dependency Notes

- The fresh worktree needed `pnpm install --frozen-lockfile` (lockfile unchanged) and `npx nuxi prepare` in `autobyteus-web` (creates `.nuxt/tsconfig.json`) before `test:nuxt` would run. Without `nuxi prepare`, every web test fails at transform with "Cannot find base config file ./.nuxt/tsconfig.json". This is an environment step, not a change effect.
- Kept for downstream reuse: `autobyteus-web/electron-dist/` (gitignored macOS arm64 build of this change) and the local Docker image `autobyteus-agpl-slice2:monorepo`.
- Removed after the build: untracked SDK `dist/` outputs produced by `prepare-server`.

## Local Implementation Checks Run

All passed on 2026-10-08 unless stated.

1. `python3 -m unittest scripts/tests/test_check_licensing.py`: 12/12. Covered cases:
   - a passing tree;
   - a wrong AGPL hash;
   - a missing Apache LICENSE;
   - wrong and missing manifest licences;
   - the devkit template being ignored;
   - `tickets` paths being ignored;
   - stray claims flagged;
   - allowlisted files not flagged;
   - binary files skipped;
   - untracked files ignored;
   - an Apache component missing from LICENSING.md;
   - a real-tree consistency case.
2. `python3 scripts/check_licensing.py` on the worktree: exit 0. In a throwaway local clone I made three deliberate edits: a modified `autobyteus-web/LICENSE`, `"license": "MIT"` in `autobyteus-server-ts/package.json`, and "Apache License 2.0" appended to the tracked `autobyteus-server-ts/README.md`. Result: exit 1, with grouped, path-named messages per rule. After `git checkout`, exit 0 again.
3. `pnpm -C autobyteus-web test:nuxt tests/integration/product-license-packaging.integration.test.ts tests/integration/isolated-launch-marker.integration.test.ts tests/integration/novnc-package-contract.integration.test.ts --run`: before the desktop build, 10 passed and 2 skipped (packaged-output cases). After the desktop build, **12/12**, including the packaged-output assertions (resources byte-identical, `NSHumanReadableCopyright`).
4. `npx tsc -p autobyteus-web/build/tsconfig.json --noEmit`: OK.
5. Desktop: `pnpm -C autobyteus-web build:electron:mac` (unsigned, arm64): exit 0, producing a DMG and zip. Inspection is under BEH-004 (desktop) above.
6. Docker:
   - `docker build -f autobyteus-server-ts/docker/Dockerfile.monorepo -t autobyteus-agpl-slice2:monorepo .`: exit 0.
   - `docker run --rm --entrypoint sh <img> -c 'ls -l /app/LICENSE /app/LICENSING.md /app/NOTICE && sha256sum /app/LICENSE'`: all present, AGPL hash.
   - `docker inspect` shows the label `org.opencontainers.image.licenses=AGPL-3.0-only`.
   - `docker build --check` passes with no warnings for all 4 Dockerfiles.
   - `python3 -m unittest scripts/tests/test_docker_build_context_sources.py`: OK.
   - `docker build -f docker/Dockerfile.remote-server .` fails in the builder on base (UD-002).
7. Gateway:
   - `node --check build-runtime-package.mjs`: OK.
   - `npm pack --dry-run` in the gateway lists `LICENSE`.
   - `pnpm -C autobyteus-message-gateway build:runtime-package` fails at the pre-existing gateway `build` step (UD-001) before reaching any new code. Its stage dir was cleaned up and no tracked file was modified.
8. Workflows:
   - `yaml.safe_load` OK for all 4.
   - `actionlint` on all 4: exit 0, the same as for the base versions extracted from `HEAD`.
   - `python3 -m unittest scripts/tests/test_release_channel_workflow_steps.py`: OK.
   - `python3 autobyteus-ios/scripts/ios-release-contract-check.py`: passed.
9. `python3 scripts/check_repository_artifact_hygiene.py`: passed.

## Frontend Rendered-Result Check (When Applicable)

Not Applicable. No renderer UI changed. The only user-visible change is the macOS About panel string, which comes from `Info.plist` `NSHumanReadableCopyright`. It was verified in the packaged `Info.plist` and by the integration test; the About window itself was not opened (optional per design).

## Downstream Coverage Hints / Suggested Scenarios

- AC-005:
  - Re-inspect the packaged desktop app (`autobyteus-web/electron-dist/mac-arm64/AutoByteus.app`) and the image `autobyteus-agpl-slice2:monorepo`, or rebuild them.
  - Optionally open the About window of an isolated instance (`pnpm --silent isolated-app start --from-worktree`) for a screenshot.
  - Linux and Windows packaging use the same config; CI covers them on the next release.
- AC-007: manual CLA. Review CONTRIBUTING, the CLA, the PR template and the README/LICENSING pointers. There is no bot to exercise.
- AC-009: run the checker and its unittests. Optionally make a fresh deliberate-violation run.
- AC-010 / REQ-012:
  - the desktop build, the monorepo image build and the existing workflow/docker/iOS contract tests pass;
  - the gate passes on the tree.
- Decide how to classify UD-001/UD-002 in the validation report. Both predate this slice and lie outside this change's scope.

## API / E2E / Executable Coverage Investigation And Execution Still Required

- API/E2E engineer: independent validation of AC-005 (desktop + released image; the gateway is limited per UD-001), AC-007, AC-009, AC-010 and AC-011.
- Delivery: do not cut a release. Request the user's explicit verification. Carry forward the lawyer-review note (REQ-011) and UD-001/UD-002 for the Solution Designer and the user.
