# Implementation Handoff

## Upstream Artifact Package

- Requirements doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/requirements.md`
- Investigation notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/investigation-notes.md`
- Design spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/design-spec.md`
- Design review report: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis/design-review-report.md`

## What Changed

- Removed the public Docker launcher profile model from both Bash and PowerShell launchers.
- Made the normal Docker run shape the only launcher behavior: `SYS_ADMIN`, `seccomp=unconfined`, unqualified host port publishing, named volumes, node workspace bind mount, and shared-folder bind mount.
- Removed profile label/env/state output from new launcher containers/state and bumped launcher config hash version from `v4` to `v5` so old profile-managed containers are stale on lifecycle actions.
- Simplified Docker Guide command catalog and tests to use `autobyteus-docker new-container` with no profile flag.
- Reworded Phone Access and remote-node verification strings from Docker/mobile-specific language to generic phone-facing private HTTPS URL language while preserving same-node `serverInstanceId` verification behavior.
- Removed active mobile-safe recommendations from README/docs/future-ticket docs and documented the normal Docker launcher path as the single public path.
- Preserved Docker `/mobile` image packaging; Dockerfile copy lines were verified unchanged.

## Key Files Or Areas

- Public launcher implementation:
  - `scripts/public/docker/autobyteus-docker.sh`
  - `scripts/public/docker/autobyteus-docker.ps1`
- Launcher tests:
  - `scripts/tests/test_public_docker_launcher_shared_workspace.py`
- Docker Guide command/catalog and tests:
  - `autobyteus-web/utils/dockerNodeLauncherCommands.ts`
  - `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts`
  - `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts`
- Phone Access text and verification messages:
  - `autobyteus-web/localization/messages/en/settings.ts`
  - `autobyteus-web/localization/messages/zh-CN/settings.ts`
  - `autobyteus-web/stores/phoneAccessStore.ts`
  - `autobyteus-web/utils/phoneAccessRemoteNode.ts`
  - `autobyteus-web/stores/__tests__/phoneAccessStore.spec.ts`
  - `autobyteus-web/components/mobile/MobileRemoteAccessShell.vue`
  - `autobyteus-web/utils/remoteAccess/__tests__/mobileSessionBootstrap.spec.ts`
- Active docs:
  - `README.md`
  - `autobyteus-server-ts/README.md`
  - `autobyteus-server-ts/docker/README.md`
  - `autobyteus-server-ts/docs/features/remote_access.md`
  - `autobyteus-web/docs/remote_access.md`
  - `autobyteus-web/docs/settings.md`
  - `docs/android_mobile_access.md`
  - `docs/future-tickets/mobile-backend-authorization-hardening.md`

## Important Assumptions

- Normal Docker means the prior `standard` launcher behavior and is now the only public launcher run policy.
- Old state files may still contain obsolete profile fields until the next lifecycle action, but the new launchers ignore profile policy and rewrite state without profile fields.
- Historical ticket artifacts remain out of scope for stale terminology cleanup.

## Known Risks

- Existing old-profile containers keep running until a user runs a lifecycle command such as reset, upgrade, workspace apply, or recreation.
- PowerShell parsing could not be executed locally because `pwsh` is not installed; the existing unit test skips the PowerShell parse check in that environment.
- The Bash and PowerShell public launcher files remain large standalone scripts above the team size guardrail. They were reduced substantially and remain single-file to preserve curl/install packaging; splitting them would require a separate launcher packaging design.

## Task Design Health Assessment Implementation Check

- Reviewed change posture: Cleanup / behavior change.
- Reviewed root-cause classification: Legacy Or Compatibility Pressure plus Duplicated Policy Or Coordination.
- Reviewed refactor decision (`Refactor Needed Now`/`No Refactor Needed`/`Deferred`): Refactor Needed Now.
- Implementation matched the reviewed assessment (`Yes`/`No`): Yes.
- If challenged, routed as `Design Impact` (`Yes`/`No`/`N/A`): N/A.
- Evidence / notes: Profile branches, normalizers, labels/env/state, Docker Guide profile command, and active mobile-safe docs/copy were removed rather than compatibility-mapped. Same-node URL verification and `/mobile` packaging were preserved.

## Legacy / Compatibility Removal Check

- Backward-compatibility mechanisms introduced: `None`
- Legacy old-behavior retained in scope: `No`
- Dead/obsolete code, obsolete files, unused helpers/tests/flags/adapters, and dormant replaced paths removed in scope: `Yes`
- Shared structures remain tight (no one-for-all base or overlapping parallel shapes introduced): `Yes`
- Canonical shared design guidance was reapplied during implementation, and file-level design weaknesses were routed upstream when needed: `Yes`
- Changed source implementation files stayed within proactive size-pressure guardrails (`>500` avoided; `>220` assessed/acted on): `No (assessed exception): pre-existing standalone public launcher scripts shrank but remain >500 non-empty lines to preserve single-file distribution.`
- Notes: No `--profile` compatibility alias was kept. Active non-ticket grep is clean for `mobile-safe`, `mobile_safe`, `MOBILE_SAFE`, `AUTOBYTEUS_NODE_PROFILE`, `com.autobyteus.profile`, and `PROFILE=`.

## Environment Or Dependency Notes

- Ran `pnpm -C autobyteus-web install --frozen-lockfile` because frontend dependencies were not initially available to `pnpm exec vitest`.
- Ran `pnpm -C autobyteus-web exec nuxt prepare` because the targeted frontend tests initially failed on missing `.nuxt/tsconfig.json`.
- `pwsh` is not installed in this environment, so the PowerShell parse unit test was skipped.

## Local Implementation Checks Run

- `bash -n scripts/public/docker/autobyteus-docker.sh` — Pass.
- `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` — Pass: 6 tests run, 1 skipped (`pwsh` missing).
- `pnpm -C autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts stores/__tests__/phoneAccessStore.spec.ts utils/remoteAccess/__tests__/mobileSessionBootstrap.spec.ts` — Pass: 5 files, 23 tests.
- `git diff --check` — Pass.
- Stale active-source scan excluding ticket history: `git grep -n -E 'mobile-safe|mobile_safe|MOBILE_SAFE|AUTOBYTEUS_NODE_PROFILE|com\.autobyteus\.profile|PROFILE=' -- ':!tickets/**' ':!**/tickets/**' ':!node_modules/**'` — Pass: no matches.
- Launcher profile CLI scan: `git grep -n -- '--profile' -- scripts/public/docker` — Pass: no matches.
- Dockerfile packaging check: verified the `/mobile` copy line remains in:
  - `autobyteus-server-ts/docker/Dockerfile.monorepo`
  - `docker/Dockerfile.remote-server`
  - `docker/Dockerfile.allinone`

## Downstream Validation Hints / Suggested Scenarios

- Exercise Bash and PowerShell launcher lifecycle paths with a real Docker daemon: `new-container`, `reset`, `upgrade --all`, `workspace apply --all`, `urls`, `status`, `storage`.
- Verify an old state/container created under the prior config hash is recreated with the new normal run shape and rewritten state without profile fields.
- Verify packaged-app Docker Guide renders `autobyteus-docker new-container` and no profile flag.
- Verify Phone Setup in an embedded window and a remote-node window still performs private HTTPS URL validation and same-node identity verification before QR creation.

## API / E2E / Executable Validation Still Required

API/E2E validation remains required downstream. This handoff reports only implementation-scoped local checks and targeted unit/component tests.
