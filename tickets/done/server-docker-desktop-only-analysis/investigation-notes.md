# Investigation Notes

## Investigation Status

- Bootstrap Status: Complete.
- Current Status: Investigation complete; user clarified retained profile; design spec produced.
- Investigation Goal: Analyze current server Docker desktop/standard and mobile-safe launcher variants, determine why mobile-safe was included, and define the clean removal plan after user chose normal Docker only.
- Scope Classification (`Small`/`Medium`/`Large`): Medium.
- Scope Classification Rationale: Docker profile cleanup touches public Bash and PowerShell launchers, packaged-app Docker Guide command generation, localization, docs, tests, and existing launcher state semantics.
- Scope Summary: `mobile-safe` is a launcher runtime profile, not a separate Docker image. It was introduced to reduce Android/Phone Access blast radius by avoiding privileged flags, broad port binds, and automatic host bind mounts. User clarified that mobile-safe is unused and should be removed in favor of normal Docker only.
- Primary Questions Resolved:
  - Which variant should remain? Current normal/standard Docker.
  - Why was mobile-safe introduced? Android/Phone Access isolation and blast-radius reduction.
  - What is the design posture? Clean-cut removal of profile choice; no compatibility aliases.

## Request Context

Initial user request asked to analyze redundancy in server Docker because a mobile-safe version existed. Follow-up clarification on 2026-05-30: user wants to remove the earlier-added mobile-safe Docker functionality because it is unused, keep the normal Docker path, simplify Docker management, and simplify frontend server node Phone Setup descriptions.

## Environment Discovery / Bootstrap Context

- Project Type (`Git`/`Non-Git`): Git.
- Task Workspace Root: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis`.
- Task Artifact Folder: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis/tickets/done/server-docker-desktop-only-analysis`.
- Current Branch: `codex/server-docker-desktop-only-analysis`.
- Current Worktree / Working Directory: `/Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis`.
- Bootstrap Base Branch: `origin/personal`.
- Remote Refresh Result: `git fetch origin --prune` completed; `origin/personal` advanced from `d9261dcf` to `21d05cf9`.
- Task Branch: `codex/server-docker-desktop-only-analysis`, created from `origin/personal` at `21d05cf9`.
- Expected Base Branch (if known): `origin/personal`.
- Expected Finalization Target (if known): `personal`.
- Bootstrap Blockers: None.
- Notes For Downstream Agents: User's original checkout `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` had untracked `blingda.txt`; dedicated worktree is clean and isolated.

## Source Log

| Date | Source Type (`Code`/`Doc`/`Spec`/`Web`/`Repo`/`Issue`/`Command`/`Trace`/`Log`/`Data`/`Setup`/`Other`) | Exact Source / Query / Command | Why Consulted | Relevant Findings | Follow-Up Needed |
| --- | --- | --- | --- | --- | --- |
| 2026-05-30 | Command | `pwd && git rev-parse --show-toplevel && git status --short --branch && git remote -v && git symbolic-ref refs/remotes/origin/HEAD && ls -la` in `/Users/normy/autobyteus_org/autobyteus-workspace-superrepo` | Bootstrap workspace and repository context | Current shared checkout on `personal`; default remote HEAD is `origin/personal`; untracked `blingda.txt` present. | No |
| 2026-05-30 | Command | `git worktree list --porcelain && git fetch origin --prune` | Check existing dedicated worktrees and refresh base branch | No matching task worktree found; fetch completed and `origin/personal` advanced to `21d05cf9`. | No |
| 2026-05-30 | Command | `git worktree add -b codex/server-docker-desktop-only-analysis /Users/normy/autobyteus_org/autobyteus-worktrees/server-docker-desktop-only-analysis origin/personal` | Create dedicated task branch/worktree | Created isolated task branch and worktree tracking `origin/personal`. | No |
| 2026-05-30 | Command | `find . ... -iname '*docker*' ...` | Inventory Docker-related paths | Found root `docker/*`, `autobyteus-server-ts/docker/*`, public launchers under `scripts/public/docker/*`, Docker guide frontend files, and release workflow. | No |
| 2026-05-30 | Command | `rg -n --hidden -S "mobile-safe|mobile_safe|MOBILE_SAFE|mobile safe" -g '!node_modules/**' -g '!.git/**' -g '!tickets/done/**' -g '!tickets/in-progress/**' .` | Inventory active mobile-safe references | Active references are in README/docs, web localization/command catalog/tests, public Bash/PowerShell launchers, and launcher tests. | No |
| 2026-05-30 | Code | `scripts/public/docker/autobyteus-docker.sh` | Understand launcher profile behavior | Defines `DEFAULT_PROFILE=standard`, `MOBILE_SAFE_PROFILE=mobile-safe`; `new-container` defaults to standard unless `--profile mobile-safe`; run args branch differs on privileged flags, host bind mounts, and port binding. | No |
| 2026-05-30 | Code | `scripts/public/docker/autobyteus-docker.ps1` | Confirm Windows launcher parity | PowerShell launcher mirrors Bash profile concepts and run branch. | No |
| 2026-05-30 | Code | `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Check packaged-app Docker Guide command source | Docker Guide direct command is `autobyteus-docker new-container --profile mobile-safe`, while install commands fetch launchers from `personal`. | No |
| 2026-05-30 | Code | `autobyteus-web/components/settings/PhoneAccessCard.vue`, `autobyteus-web/stores/phoneAccessStore.ts`, `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Check Phone Setup frontend areas for simplification | UI contains generic Phone Access flow plus remote-node-specific advertised URL verification. Several strings mention Docker/container or remote Docker in copy/tests. Verification can remain but copy should become generic. | No |
| 2026-05-30 | Code | `autobyteus-web/localization/messages/en/settings.ts`, `autobyteus-web/localization/messages/zh-CN/settings.ts`, `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Check user-facing UI guidance | UI title/description explicitly says "Start mobile-safe Docker node" and explains localhost-bound/no-privileged/no-bind-mount profile. | No |
| 2026-05-30 | Test | `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Check durable launcher contract coverage | Tests assert standard host bind mounts and separate mobile-safe absence of `SYS_ADMIN`, `seccomp=unconfined`, and automatic host bind mounts. | No |
| 2026-05-30 | Test | `autobyteus-web/components/settings/__tests__/PhoneAccessCard.spec.ts`, `autobyteus-web/stores/__tests__/phoneAccessStore.spec.ts` | Check Phone Setup tests | Tests include remote Docker naming and Android-facing URL constraints. Tests should be renamed/reworded to remote node/private HTTPS behavior, preserving same-node verification. | No |
| 2026-05-30 | Doc | `README.md`, `autobyteus-server-ts/docker/README.md`, `autobyteus-server-ts/README.md`, `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-web/docs/settings.md` | Understand documented product intent | Docs present mobile-safe as recommended Android/Phone Access isolation path and standard as existing/desktop/compatibility container path with host-visible workspace sharing. | No |
| 2026-05-30 | Command | `git log --date=iso --pretty=format:'%h %ad %an %s' -- scripts/public/docker/autobyteus-docker.sh ...` | Trace history of mobile-safe introduction | Relevant commits include `940f622a` on 2026-05-23 and `a7ec9a5f` on 2026-05-24. | No |
| 2026-05-30 | Command | `git log -S'MOBILE_SAFE_PROFILE' -- scripts/public/docker/autobyteus-docker.sh`; `git show --unified=4 940f622a -- ...` | Find initial mobile-safe launcher introduction | `940f622a` introduced profile branching, `--profile mobile-safe` UI command, node-admin claim flow, and Android docs for mobile-safe Docker. | No |
| 2026-05-30 | Command | `git show --unified=4 a7ec9a5f -- ...` | Check later finalization of mobile-safe behavior | `a7ec9a5f` removed node-admin claim/local-management complexity, kept mobile-safe runtime hardening, and added `/mobile` Docker asset packaging. | No |
| 2026-05-30 | Doc | `tickets/done/android-pairing-security-hardening/requirements.md`, `investigation-notes.md`, `validation-report.md` | Determine why mobile-safe was included | It was introduced to run Android-originated work inside a controlled Docker node instead of the embedded host desktop node and reduce blast radius. | No |
| 2026-05-30 | Doc | `tickets/done/mobile-safe-container-401/requirements.md`, `investigation-notes.md`, `handoff-summary.md` | Check follow-up rationale and final released behavior | User-requested rework removed claim and `lmn` owner credential complexity but explicitly kept `mobile-safe` runtime defaults and `/mobile` packaging; release v1.3.30 recorded this behavior. | No |
| 2026-05-30 | Command | `rg -n --hidden -S "AUTOBYTEUS_NODE_PROFILE|NODE_PROFILE|mobile-safe|node profile|com.autobyteus.profile" autobyteus-server-ts/src autobyteus-server-ts/tests` | Check whether server runtime branches on profile | No active server source branch on `AUTOBYTEUS_NODE_PROFILE`; profile appears launcher-side. | No |
| 2026-05-30 | Command | `bash -n scripts/public/docker/autobyteus-docker.sh && python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` | Baseline launcher validation | Bash syntax passed; Python launcher tests passed: 7 tests, 1 skipped (`pwsh` unavailable). | No |
| 2026-05-30 | Command | `pnpm -C autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Attempt frontend baseline for Docker Guide tests | Failed before running tests with `ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL Command "vitest" not found`; dependencies not installed/available in this worktree. | Yes, implementation/API-E2E can install deps or use the established project validation path. |
| 2026-05-30 | User Clarification | User follow-up message | Resolve retained-profile ambiguity | User wants to remove mobile-safe Docker functionality, keep normal Docker, simplify Docker management and frontend Phone Setup descriptions. | No |

## Current Behavior / Current Flow

- Current entrypoint or first observable boundary: Packaged-app users see `DockerNodeStartGuideCard.vue`, whose commands come from `autobyteus-web/utils/dockerNodeLauncherCommands.ts`; CLI/no-clone users run `scripts/public/docker/autobyteus-docker.sh` or `.ps1`.
- Current execution flow:
  - UI flow: Settings Docker Guide -> install public launcher -> direct command `autobyteus-docker new-container --profile mobile-safe` -> launcher creates Docker container using the mobile-safe run branch -> user adds Backend URL as remote node -> opens Docker node -> Phone Access QR/mobile flow if desired.
  - CLI default flow: user runs `autobyteus-docker new-container` -> launcher defaults to `standard` -> container gets privileged flags and automatic host bind mounts.
  - Phone setup flow: Settings -> Nodes -> Phone Setup -> `PhoneAccessCard` selects/enters HTTPS `/mobile` URL -> remote-node windows verify advertised URL reaches same server instance -> backend creates pairing session -> QR opens `/mobile` on phone.
- Ownership or boundary observations:
  - Public launchers own Docker lifecycle, profile selection, labels, state files, ports, volumes, bind mounts, and user-facing URLs.
  - Frontend Docker Guide owns tutorial/command presentation only; it does not manage Docker directly.
  - Server Docker image build owns packaging `/mobile` assets into `autobyteus-server-ts/mobile-web` and is independent from launcher profile selection.
  - PhoneAccessStore owns pairing-session UI state and same-node advertised URL verification orchestration. It should not own Docker profile policy.
- Current behavior summary: Two launcher profiles exist. `mobile-safe` is recommended in UI/docs for Android, but `standard` is the user's actual and desired normal Docker path.

## Design Health Assessment Evidence

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change.
- Candidate root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure plus Duplicated Policy Or Coordination.
- Refactor posture evidence summary: Collapsing to one Docker path requires launcher-policy refactor/removal, not just docs changes, because two run-arg branches and profile state handling are encoded in both public launchers and tests.

| Evidence Source | Observation | Design Health Implication | Follow-Up Needed |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | `new-container` defaults to `standard`; `mobile-safe` selected by `--profile`. | Duplicate launch policy is a real runtime branch. | Remove profile branch. |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | UI direct command always includes `--profile mobile-safe`. | Product guidance and user workflow diverge. | Update command catalog. |
| `docs/android_mobile_access.md` | Recommends mobile-safe Docker over embedded desktop for Phase One security. | Removing mobile-safe creates a documented security posture change. | Rewrite docs for normal Docker/trusted private network. |
| `tickets/done/android-pairing-security-hardening/requirements.md` | Prior work intentionally introduced mobile-safe for Android blast-radius reduction. | Variant was not arbitrary; removal should be explicit and accepted by user. | User accepted. |
| User clarification | User says mobile-safe is unused and normal Docker is the actual workflow. | Clean-cut removal is appropriate. | No further clarification needed. |

## Relevant Files / Components

| Path / Component | Current Responsibility | Finding / Observation | Design / Ownership Implication |
| --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public macOS/Linux Docker launcher | Owns profile parsing, state, run args, labels, ports, mounts, output. | Primary implementation owner for profile removal. |
| `scripts/public/docker/autobyteus-docker.ps1` | Public Windows Docker launcher | Mirrors Bash profile policy. | Must change in parity with Bash. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Launcher contract tests | Protects both standard and mobile-safe behaviors. | Rewrite to assert one normal run policy and absence of profiles. |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Docker Guide command catalog | Emits `autobyteus-docker new-container --profile mobile-safe`. | Change to `autobyteus-docker new-container`. |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Renders Docker Guide commands | Presentation depends on command catalog and localization. | Likely no direct logic change if catalog/localization updated. |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Docker Guide and Phone Setup copy | Calls the guide "mobile-safe Docker node" and includes Docker/container Phone Setup wording. | Replace with normal Docker and generic Phone Setup wording. |
| `autobyteus-web/stores/phoneAccessStore.ts` | Phone Access UI state and pairing orchestration | Remote-node verification is generic enough to keep but messages mention Android-facing remote node. | Preserve behavior; remove Docker-specific text in user-facing messages/tests. |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Advertised URL validation/fetch helper | Error mentions remote-node and container-local addresses. | Keep validation; simplify wording. |
| `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docker/README.md` | User setup docs | Describe both standard default and mobile-safe Android path. | Remove mobile-safe path; document one normal Docker path. |
| `docs/android_mobile_access.md`, `autobyteus-web/docs/remote_access.md`, `autobyteus-server-ts/docs/features/remote_access.md` | Android/Phone Access docs | Current recommended flow depends on mobile-safe Docker. | Rewrite to normal Docker/trusted-private-network flow. |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | Phase Two backlog | Assumes node kind may be `docker-mobile-safe`, `docker-standard`, or `embedded-host`. | Remove mobile-safe node-kind language. |
| `autobyteus-server-ts/docker/Dockerfile.monorepo`, `docker/Dockerfile.remote-server`, `docker/Dockerfile.allinone` | Docker image builds | Copy `autobyteus-web/dist-mobile/public` into `autobyteus-server-ts/mobile-web`. | Preserve. |
| `.github/workflows/release-server-docker.yml` | Publishes server Docker image | Publishes one image name with default/optional `zh` runtime variant; no mobile-safe image variant. | No change expected. |

## Runtime / Probe Findings

| Date | Method (`Repro`/`Trace`/`Probe`/`Script`/`Test`/`Setup`) | Exact Command / Method | Observation | Implication |
| --- | --- | --- | --- | --- |
| 2026-05-30 | Test | `bash -n scripts/public/docker/autobyteus-docker.sh && python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace` | Passed: `....s..`, 7 tests, 1 skipped. | Current launcher profile contract is syntactically/test clean before changes. |
| 2026-05-30 | Test Attempt | `pnpm -C autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Failed before running: `Command "vitest" not found`. | Frontend dependencies unavailable in this worktree; downstream validation needs dependency setup. |

## External / Public Source Findings

- Public API / spec / issue / upstream source: None needed.
- Version / tag / commit / freshness: N/A.
- Relevant contract, behavior, or constraint learned: N/A.
- Why it matters: Repository history and artifacts were sufficient to answer why `mobile-safe` was included.

## Reproduction / Environment Setup

- Required services, mocks, emulators, or fixtures: None for static/history analysis.
- Required config, feature flags, env vars, or accounts: None for analysis.
- External repos, samples, or artifacts cloned/downloaded for investigation: None.
- Setup commands that materially affected the investigation: Dedicated git worktree creation from refreshed `origin/personal`.
- Cleanup notes for temporary investigation-only setup: None.

## Findings From Code / Docs / Data / Logs

1. **`mobile-safe` is a launcher profile, not a separate published server Docker image.** Release workflow builds `autobyteus-server-ts/docker/Dockerfile.monorepo` as `autobyteus/autobyteus-server:<version>`/`latest` plus optional `zh` tags; profile selection happens when the public launcher runs `docker run`.
2. **Normal Docker is the current `standard` branch.** It adds privileged Chromium/container flags and automatic host-visible workspace/shared bind mounts.
3. **`mobile-safe` is security/isolation-oriented.** It removes privileged flags and automatic host bind mounts and binds published ports to localhost.
4. **Prior rationale is explicit.** `android-pairing-security-hardening` introduced mobile-safe so Android-originated work runs in Docker instead of on the embedded host desktop runtime. `mobile-safe-container-401` later simplified the auth/claim design while retaining the profile.
5. **User has now superseded that product choice.** The user reports never using mobile-safe and wants Docker management simplified around normal Docker.
6. **Phone Setup simplification is copy/terminology-led.** Same-node advertised URL verification remains useful for any remote node and should be kept, but the UI should no longer imply a special mobile-safe Docker setup.

## Constraints / Dependencies / Compatibility Facts

- The team design policy prefers clean-cut removal rather than maintaining aliases or dual-path compatibility wrappers.
- Existing launcher state may include `PROFILE=standard` or `PROFILE=mobile-safe`; a clean single-profile launcher should bump config hash and recreate containers with normal Docker run args when lifecycle actions run.
- Removing mobile-safe means the current docs' Android isolation recommendation is intentionally removed. Keep trusted-private-network and no-public-internet warnings.
- Do not remove `/mobile` static asset packaging from server Docker images.

## Open Unknowns / Risks

- Risk: Existing already-running mobile-safe containers will continue running until users recreate/upgrade/reset through the launcher. This is acceptable; the launcher should normalize future lifecycle-managed containers.
- Risk: Removing profile aliases may surprise users who copied old commands. This is intentional per no-compat policy; clear error/docs should direct them to `autobyteus-docker new-container`.
- Risk: Android blast-radius hardening is reduced compared with the old mobile-safe recommendation. User intent accepts this tradeoff.

## Notes For Architect Reviewer

The design should verify clean-cut removal of the Docker profile model, not a deprecation. It should preserve normal Docker behavior and `/mobile` packaging. Phone Setup logic should stay functionally intact but user-facing copy should become generic and simpler.
