# Design Spec

## Current-State Read

The public server Docker launcher currently has two runtime profiles inside both `scripts/public/docker/autobyteus-docker.sh` and `scripts/public/docker/autobyteus-docker.ps1`:

- `standard` / normal Docker: current default for `autobyteus-docker new-container`; adds `SYS_ADMIN`, `seccomp=unconfined`, unqualified host port publishing, named volumes, and automatic host bind mounts for `/home/autobyteus/workspace` plus `/home/autobyteus/shared`.
- `mobile-safe`: selected by `--profile mobile-safe`; avoids `SYS_ADMIN`, avoids `seccomp=unconfined`, binds published ports to `127.0.0.1`, and skips automatic host bind mounts.

The Docker Guide contradicts the CLI default by recommending `autobyteus-docker new-container --profile mobile-safe`. Current docs also recommend mobile-safe for Android/Phone Access, while the user clarified that they never use it and always use normal Docker.

The server runtime itself does not appear to branch on `AUTOBYTEUS_NODE_PROFILE`; static search found profile env usage only in launchers/tests. Docker image `/mobile` asset packaging is independent from the profile and must remain.

Phone Setup currently contains generic Phone Access flow plus some mobile-safe/Docker-era wording around remote-node advertised URL verification. Same-node verification is still useful for any remote node where desktop management URL and phone-facing HTTPS URL differ, but the copy should be simplified and made generic.

## Intended Change

Remove the `mobile-safe` Docker profile and keep one normal Docker launcher behavior. The public launcher, Docker Guide, docs, localization, and tests should no longer offer or preserve profile selection. Phone Setup copy should describe pairing a phone to the current node through a trusted private HTTPS URL and should avoid mobile-safe/Docker-profile terminology.

## Task Design Health Assessment (Mandatory)

- Change posture (`Feature`/`Bug Fix`/`Behavior Change`/`Refactor`/`Cleanup`/`Performance`/`Larger Requirement`): Cleanup / behavior change.
- Current design issue found (`Yes`/`No`/`Unclear`): Yes.
- Root cause classification (`Local Implementation Defect`/`Missing Invariant`/`Boundary Or Ownership Issue`/`Duplicated Policy Or Coordination`/`File Placement Or Responsibility Drift`/`Shared Structure Looseness`/`Legacy Or Compatibility Pressure`/`No Design Issue Found`/`Unclear`): Legacy Or Compatibility Pressure plus Duplicated Policy Or Coordination.
- Refactor needed now (`Yes`/`No`/`Deferred`/`Unclear`): Yes.
- Evidence: Launch-policy branching is duplicated in Bash and PowerShell launchers, profile guidance is duplicated in frontend command catalog/localization/docs/tests, and UI defaults now recommend an unused profile.
- Design response: Collapse the launcher profile model to one normal Docker run shape, remove profile state/labels/env/copy/tests, and simplify Phone Setup copy without removing Phone Access behavior.
- Refactor rationale: Keeping `--profile` as an alias or preserving old branches would retain the exact redundancy the user wants removed and would violate the clean-cut profile-removal goal.
- Intentional deferrals and residual risk, if any: Broader mobile backend authorization hardening remains future work. Removing mobile-safe also removes a prior Android blast-radius recommendation; this is accepted by the user's clarified normal-Docker product direction.

## Terminology

- `Normal Docker`: the current `standard` public launcher run shape.
- `Phone Access`: QR/mobile credential pairing feature for a phone/PWA to reach an AutoByteus node.
- `Remote node`: any non-embedded node opened by the desktop app, including normal Docker nodes.

## Design Reading Order

1. Docker launcher lifecycle spine.
2. Phone Setup pairing spine.
3. Removal/decommission plan.
4. Concrete file mapping and validation.

## Legacy Removal Policy (Mandatory)

- Policy: `No backward compatibility; remove legacy code paths.`
- Required action: remove `mobile-safe` profile parsing, aliases, branch-specific run args, profile labels/env/state, and user-facing mobile-safe guidance.
- Decision rule: do not keep `--profile mobile-safe` as an alias to normal Docker. Old commands should fail with clear launcher option handling and docs should show `autobyteus-docker new-container`.

## Data-Flow Spine Inventory

| Spine ID | Scope (`Primary End-to-End`/`Return-Event`/`Bounded Local`) | Start | End | Governing Owner | Why It Matters |
| --- | --- | --- | --- | --- | --- |
| DS-001 | Primary End-to-End | Docker Guide or CLI command | Managed normal Docker server node ready to add/open | Public Docker Launcher | Main behavior being simplified; profile selection is removed here. |
| DS-002 | Primary End-to-End | Phone Setup form | Phone receives QR/mobile URL for current node | Phone Access UI/Store + Remote Access backend | Frontend copy simplification must preserve pairing behavior. |
| DS-003 | Primary End-to-End | Server Docker image build | Runtime image serves `/mobile` | Docker image build definitions | Must remain unchanged despite removing mobile-safe profile. |

## Primary Execution Spine(s)

- DS-001: `Docker Guide / CLI -> Public Launcher -> Normal Docker Run Config -> Managed Container -> Desktop Add/Open Remote Node`
- DS-002: `Phone Setup UI -> PhoneAccessStore -> Advertised URL Validation -> Remote Access Pairing API -> QR / Android Mobile Shell`
- DS-003: `Docker Build -> Web Mobile Bundle -> Server Image mobile-web Directory -> /mobile Static Route`

## Spine Narratives (Mandatory)

| Spine ID | Short Narrative | Main Domain Subject Nodes | Governing Owner | Key Off-Spine Concerns |
| --- | --- | --- | --- | --- |
| DS-001 | A user installs or runs the public launcher. The launcher chooses ports, state, volumes, bind mounts, and normal Docker run args without profile branching. The resulting Backend URL is added/opened as a remote node. | Docker command, launcher lifecycle, Docker run config, managed container | Public Docker Launcher | Bash/PowerShell parity, config hash migration, docs/copy/tests |
| DS-002 | A user enters/selects a private HTTPS `/mobile` URL. Remote-node windows verify the advertised URL reaches the same node before creating a pairing session. QR creation and mobile credentials remain unchanged. | PhoneAccessCard, PhoneAccessStore, Remote Access API, QR/mobile shell | Phone Access UI/Store with backend pairing service | Localization text, remote-node validation messages |
| DS-003 | Image builds continue building the mobile web bundle and copying it into `autobyteus-server-ts/mobile-web` so `/mobile` is available in normal Docker containers. | Docker build, mobile web build, server static route | Docker image build definitions | Build validation, docs references |

## Spine Actors / Main-Line Nodes

- Docker Guide command catalog (`autobyteus-web/utils/dockerNodeLauncherCommands.ts`)
- Public Docker launchers (`scripts/public/docker/autobyteus-docker.sh`, `.ps1`)
- Docker run configuration
- Managed server container
- PhoneAccessCard / PhoneAccessStore
- Remote Access pairing backend
- Docker image build files

## Ownership Map

- Docker Guide command catalog owns frontend-presented command strings only; it must not encode alternate run policy beyond the single launcher command.
- Public Docker launchers own Docker lifecycle, ports, volumes, bind mounts, labels, config hash, and CLI options.
- PhoneAccessStore owns frontend pairing state and same-node advertised URL verification orchestration.
- Remote Access backend owns pairing sessions, mobile credentials, paired devices, and server instance identity.
- Docker image build files own packaging `/mobile` assets into the server runtime image.

## Thin Entry Facades / Public Wrappers (If Applicable)

| Facade / Entry Wrapper | Governing Owner Behind It | Why It Exists | Must Not Secretly Own |
| --- | --- | --- | --- |
| `DockerNodeStartGuideCard.vue` | Docker command catalog + public launcher | Renders copyable commands in settings UI | Docker run policy, profile compatibility, lifecycle state |
| `PhoneAccessCard.vue` | PhoneAccessStore + Remote Access backend | Renders pairing controls | Docker profile policy |

## Removal / Decommission Plan (Mandatory)

| Item To Remove / Decommission | Why It Becomes Unnecessary | Replaced By Which Owner / File / Structure | Scope (`In This Change`/`Follow-up`) | Notes |
| --- | --- | --- | --- | --- |
| `mobile-safe` profile constants/normalizers in Bash launcher | Single normal Docker path | Normal run logic in same launcher | In This Change | Remove aliases `mobile_safe` and `mobile`. |
| `mobile-safe` profile constants/normalizers in PowerShell launcher | Bash parity and single normal path | Normal run logic in same launcher | In This Change | Must stay parity with Bash. |
| `--profile` CLI option | No profile choice remains | `autobyteus-docker new-container` | In This Change | Do not keep compatibility alias. |
| Profile labels/state/env (`com.autobyteus.profile`, `PROFILE=`, `AUTOBYTEUS_NODE_PROFILE`) | Profile no longer exists | Launcher config hash and normal run config | In This Change | Bump config hash version to normalize old state. |
| Mobile-safe run branch | Redundant unused path | Single normal run branch | In This Change | Normal branch keeps host bind mounts and privileged flags. |
| Docker Guide `--profile mobile-safe` command | UI should match normal Docker | `autobyteus-docker new-container` | In This Change | Update tests. |
| Mobile-safe docs/localization | Product no longer supports/recommends profile | Normal Docker docs/copy | In This Change | Historical tickets may retain old terms. |
| Mobile-safe-specific launcher tests | They protect removed behavior | Normal-only launcher tests | In This Change | Tests should assert profile absence. |
| Docker-specific Phone Setup copy | User requested simpler description | Generic private HTTPS current-node copy | In This Change | Keep same-node verification behavior. |

## Return Or Event Spine(s) (If Applicable)

- DS-002 return/event flow: `Remote Access Pairing API -> PhoneAccessStore.activePairing -> QR render -> User scans/opens on phone`.

## Bounded Local / Internal Spines (If Applicable)

- Public launcher lifecycle loop: `managed_node_names -> load state -> compute desired config hash -> recreate/start container -> write state`. The config hash version bump is the local mechanism that converts old profile-managed state to the single normal policy during lifecycle actions.

## Off-Spine Concerns Around The Spine

| Off-Spine Concern | Related Spine ID(s) | Serves Which Owner | Responsibility | Why It Exists | Risk If Misplaced On Main Line |
| --- | --- | --- | --- | --- | --- |
| Localization copy | DS-001, DS-002 | Docker Guide / PhoneAccessCard | User-facing command and setup descriptions | Keeps UI translatable | Could hide policy in text instead of launcher/catalog owners |
| Docs sync | DS-001, DS-002 | Users/operators | Align README/docs with single Docker path | Prevents stale mobile-safe setup | Stale docs would resurrect removed profile |
| Launcher tests | DS-001 | Public launcher | Prove run args and profile absence | Prevents regression | Tests could preserve removed branch if not rewritten |
| Frontend component/store tests | DS-001, DS-002 | UI/store owners | Prove command/copy/validation behavior | Prevents stale UI guidance | Tests could overfit old Docker wording |
| Config hash migration | DS-001 | Public launcher | Recreate old profile-managed containers on lifecycle | Cleanly removes stale state | Old profiles could persist invisibly |

## Existing Capability / Subsystem Reuse Check

| Need / Concern | Existing Capability Area / Subsystem | Decision (`Reuse`/`Extend`/`Create New`) | Why | If New, Why Existing Areas Are Not Right |
| --- | --- | --- | --- | --- |
| Docker lifecycle | Public Docker launcher | Extend | Existing owner already owns run args/state | N/A |
| Docker Guide commands | `dockerNodeLauncherCommands.ts` | Extend | Existing command catalog centralizes UI commands | N/A |
| Phone pairing | PhoneAccessStore + backend Remote Access | Extend | Existing owner already owns QR flow | N/A |
| Docs | Existing docs files | Extend | Update current documentation | N/A |

## Subsystem / Capability-Area Allocation

| Subsystem / Capability Area | Owns Which Concerns | Related Spine ID(s) | Governing Owner(s) Served | Decision (`Reuse`/`Extend`/`Create New`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker launcher | CLI options, lifecycle state, Docker run args, config hash | DS-001 | Public Docker Launcher | Extend | Remove profile branch. |
| Settings Docker Guide | Command presentation and copy | DS-001 | Docker Guide | Extend | One command set. |
| Phone Access UI | Pairing controls and validation messaging | DS-002 | PhoneAccessStore | Extend | Generic copy only; keep behavior. |
| Docker image build | `/mobile` packaging | DS-003 | Docker image definitions | Reuse | No profile change. |
| Documentation | User setup guidance | DS-001, DS-002 | Users/operators | Extend | Remove mobile-safe references. |

## Draft File Responsibility Mapping

| Candidate File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public Docker launcher | Bash launcher | Normal Docker lifecycle and run args | Existing macOS/Linux public entrypoint | No |
| `scripts/public/docker/autobyteus-docker.ps1` | Public Docker launcher | PowerShell launcher | Windows parity lifecycle and run args | Existing Windows public entrypoint | No |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Settings Docker Guide | Command catalog | Copyable launcher commands | Existing command catalog | No |
| `autobyteus-web/localization/messages/*/settings.ts` | Settings UI localization | UI copy | Docker Guide and Phone Setup copy | Existing localization owner | No |
| `autobyteus-web/stores/phoneAccessStore.ts` | Phone Access UI | Store | Error/info messages around remote-node verification | Existing store owner | No |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Phone Access UI utility | URL validation | Generic phone-facing URL validation messages | Existing utility owner | No |
| README/docs files | Documentation | Docs | Remove mobile-safe setup and document normal Docker | Existing docs | No |
| tests | Validation | Test owners | Assert normal-only policy | Existing tests | No |

## Reusable Owned Structures Check

| Repeated Structure / Logic | Candidate Shared File | Owning Subsystem | Why Shared | Redundant Attributes Removed? (`Yes`/`No`) | Overlapping Representations Removed? (`Yes`/`No`) | Must Not Become |
| --- | --- | --- | --- | --- | --- | --- |
| Profile parsing/normalization | None | Public launcher | Remove rather than share | Yes | Yes | Compatibility shim |
| Phone URL wording | Existing localization files | Settings UI | Translation system already shared | N/A | N/A | Hidden policy owner |

## Shared Structure / Data Model Tightness Check

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Yes`/`No`) | Redundant Attributes Removed? (`Yes`/`No`) | Parallel / Overlapping Representation Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Launcher state file | Yes after removing `PROFILE` | Yes | Low | Remove profile fields and bump hash version. |

## Final File Responsibility Mapping

| File | Owning Subsystem / Capability Area | Owner / Boundary | Concrete Concern | Why This Is One File | Reuses Shared Structure? |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Public Docker launcher | Bash launcher | Single normal Docker lifecycle | Existing public shell entrypoint | No |
| `scripts/public/docker/autobyteus-docker.ps1` | Public Docker launcher | PowerShell launcher | Single normal Docker lifecycle parity | Existing public Windows entrypoint | No |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Public Docker launcher validation | Launcher tests | Normal run args, profile absence, PowerShell text parity | Existing test suite | No |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Settings Docker Guide | Command catalog | Normal Docker command list | Existing catalog | No |
| `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts` | Settings Docker Guide validation | Command tests | Command list without profile | Existing test | No |
| `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Settings Docker Guide validation | Component test | Rendered command list/copy | Existing test | No |
| `autobyteus-web/localization/messages/en/settings.ts` | Localization | English settings copy | Normal Docker and generic Phone Setup copy | Existing localization file | No |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | Localization | Chinese settings copy | Normal Docker and generic Phone Setup copy | Existing localization file | No |
| `autobyteus-web/stores/phoneAccessStore.ts` | Phone Access UI | Store | Generic remote-node info/error strings | Existing store | No |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | Phone Access UI | URL validation | Generic phone-facing URL validation | Existing utility | No |
| README/docs listed below | Documentation | Docs | One normal Docker path | Existing docs | No |

## Ownership Boundaries

- Public launchers are authoritative for Docker run policy. Frontend and docs must not encode a second policy path.
- Docker Guide is a thin command-presentation surface. It should display the launcher command catalog, not define profile semantics.
- Phone Access UI is authoritative for pairing UX and URL validation messaging, not Docker profile/security posture.
- Docker image build remains authoritative for packaged `/mobile` assets and should not be changed by profile removal.

## Boundary Encapsulation Map

| Authoritative Boundary | Internal Owned Mechanism(s) It Encapsulates | Upstream Callers That Must Use The Boundary | Forbidden Bypass Shape | If Boundary API Is Too Thin, Fix By |
| --- | --- | --- | --- | --- |
| Public Docker launcher | Docker run args, ports, volumes, state, config hash | Docker Guide docs/users | UI/docs telling users to use removed profile flags | Update command catalog/docs |
| PhoneAccessStore | Pairing state, advertised URL verification calls | PhoneAccessCard | Component implementing verification logic itself | Add store method/message fields |
| Docker image build | Mobile web packaging | Release workflow/docs | Launcher profile trying to control image contents | Update Dockerfiles/build docs |

## Dependency Rules

- `DockerNodeStartGuideCard.vue` may depend on `dockerNodeLauncherCommands.ts`, not on duplicated command strings.
- Public launchers must not depend on frontend code; they remain standalone scripts.
- Docs may reference launcher commands but must not describe removed profiles or aliases.
- Phone Access copy may refer to trusted private HTTPS and current/remote nodes, not mobile-safe profiles.
- Server runtime must not gain new profile conditionals.

## Interface Boundary Mapping

| Interface / API / Query / Command / Method | Subject Owned | Responsibility | Accepted Identity Shape(s) | Notes |
| --- | --- | --- | --- | --- |
| `autobyteus-docker new-container` | Docker node lifecycle | Create next normal managed container | Optional image/tag only; no profile | Main public command. |
| `autobyteus-docker reset` | Docker node lifecycle | Recreate default normal container | Optional image/tag only; no profile | No profile path. |
| `autobyteus-docker workspace apply` | Docker workspace mounts | Apply normal host bind mounts | Node name or `--all` | No mobile-safe no-op branch. |
| `PhoneAccessStore.createPairingSession()` | Phone Access pairing | Create QR after validation | selected normalized private HTTPS URL | Keep remote same-node verification. |

## Interface Boundary Check

| Interface | Responsibility Is Singular? (`Yes`/`No`) | Identity Shape Is Explicit? (`Yes`/`No`) | Ambiguous Selector Risk (`Low`/`Medium`/`High`) | Corrective Action |
| --- | --- | --- | --- | --- |
| Public launcher `new-container` | Yes | Yes | Low | Remove profile selector. |
| PhoneAccessStore pairing | Yes | Yes | Low | Keep normalized base URL. |

## Main Domain Subject Naming Check

| Node / Subject | Current / Proposed Name | Name Is Natural And Self-Descriptive? (`Yes`/`No`) | Naming Drift Risk | Corrective Action |
| --- | --- | --- | --- | --- |
| Docker profile | `mobile-safe` | No longer applicable | High | Remove. |
| Retained Docker behavior | `normal Docker node` / `Docker node` | Yes | Low | Use in docs/copy. |
| Phone URL | `private HTTPS /mobile URL` | Yes | Low | Use instead of Docker/mobile-safe wording. |

## Applied Patterns (If Any)

- Clean-cut decommission: remove profile branch and aliases instead of compatibility mapping.
- Config hash migration: bump launcher config hash version to make old profile-managed containers stale for lifecycle recreation.

## Target Subsystem / Folder / File Mapping

| Path | Kind (`Folder`/`Module`/`File`) | Owner / Boundary | Responsibility | Why It Belongs Here | Must Not Contain |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | File | Bash public launcher | Single normal Docker run policy | Existing public launcher | `mobile-safe`, `--profile`, profile labels/state/env |
| `scripts/public/docker/autobyteus-docker.ps1` | File | PowerShell public launcher | Single normal Docker run policy | Existing Windows launcher | Profile branch or aliases |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | File | Launcher tests | Normal run args and profile absence | Existing launcher test suite | Mobile-safe contract tests |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | File | Docker Guide command catalog | Copyable normal Docker commands | Existing command owner | `--profile mobile-safe` |
| `autobyteus-web/localization/messages/en/settings.ts` | File | Settings localization | English Docker/Phone copy | Existing localization file | Mobile-safe recommendation |
| `autobyteus-web/localization/messages/zh-CN/settings.ts` | File | Settings localization | Chinese Docker/Phone copy | Existing localization file | Mobile-safe recommendation |
| `autobyteus-web/stores/phoneAccessStore.ts` | File | PhoneAccessStore | Generic remote-node pairing messages | Existing store | Mobile-safe/Docker-specific messages |
| `autobyteus-web/utils/phoneAccessRemoteNode.ts` | File | Phone Access utility | Generic advertised URL validation messages | Existing utility | Mobile-safe/Docker-specific messages |
| `README.md` | File | Root docs | Normal Docker/Phone setup overview | Top-level docs | Mobile-safe setup |
| `autobyteus-server-ts/README.md` | File | Server docs | Server Docker usage | Existing docs | Mobile-safe setup |
| `autobyteus-server-ts/docker/README.md` | File | Server Docker docs | Public launcher usage | Existing docs | Mobile-safe setup |
| `docs/android_mobile_access.md` | File | Android docs | Normal node Phone Access setup | Existing Android guide | Mobile-safe recommendation |
| `autobyteus-web/docs/remote_access.md` | File | Web remote access docs | Phone access flow | Existing web docs | Mobile-safe-specific flow |
| `autobyteus-web/docs/settings.md` | File | Web settings docs | Docker Guide and Phone Setup docs | Existing web docs | Mobile-safe-specific guide |
| `autobyteus-server-ts/docs/features/remote_access.md` | File | Backend remote access docs | Backend auth/Phone Access docs | Existing backend docs | Mobile-safe phase-one claim |
| `docs/future-tickets/mobile-backend-authorization-hardening.md` | File | Future backlog | Future auth hardening | Existing future ticket | `docker-mobile-safe` node kind |

## Folder Boundary Check

| Path / Folder | Intended Structural Depth (`Transport`/`Main-Line Domain-Control`/`Persistence-Provider`/`Off-Spine Concern`/`Mixed Justified`) | Ownership Boundary Is Clear? (`Yes`/`No`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Justification / Corrective Action |
| --- | --- | --- | --- | --- |
| `scripts/public/docker` | Main-Line Domain-Control | Yes | Low | Public launcher scripts own Docker lifecycle. |
| `autobyteus-web/utils` | Off-Spine Concern | Yes | Low | Command catalog and URL helpers are frontend support owners. |
| `autobyteus-web/localization/messages` | Off-Spine Concern | Yes | Low | User-facing text only. |
| docs paths | Off-Spine Concern | Yes | Low | Documentation alignment. |

## Concrete Examples / Shape Guidance (Mandatory When Needed)

| Topic | Good Example | Bad / Avoided Shape | Why The Example Matters |
| --- | --- | --- | --- |
| Docker command | `autobyteus-docker new-container` | `autobyteus-docker new-container --profile mobile-safe` | Shows the single public path. |
| Removed profile alias | `error: Unknown new-container option(s): --profile mobile-safe` | silently mapping `--profile mobile-safe` to normal Docker | Avoids compatibility branch. |
| Phone Setup wording | `Use a private HTTPS /mobile URL that your phone can reach.` | `Create a mobile-safe Docker node first.` | Simplifies frontend server node setup. |

## Backward-Compatibility Rejection Log (Mandatory)

| Candidate Compatibility Mechanism | Why It Was Considered | Rejection Decision (`Rejected`/`N/A`) | Clean-Cut Replacement / Removal Plan |
| --- | --- | --- | --- |
| Keep `--profile mobile-safe` as alias to normal Docker | Prevent old copied commands failing | Rejected | Remove profile parsing; docs show `new-container`. |
| Keep `mobile`/`mobile_safe` aliases | Old alias support | Rejected | Remove `normalize_profile`. |
| Preserve `PROFILE=` state semantics | Existing state files | Rejected | Bump config hash and write new state without profile. |
| Keep mobile-safe docs as historical note in active docs | Explain old rationale | Rejected | Historical tickets retain audit; active docs describe current product. |

## Derived Layering (If Useful)

- UI layer: command presentation and Phone Setup text.
- Launcher layer: Docker lifecycle and run configuration.
- Backend/image layer: Remote Access pairing and `/mobile` packaging. No new layer introduced.

## Migration / Refactor Sequence

1. Update Bash launcher:
   - Remove profile constants, parser, help text, state fields, labels, env vars, and branch-specific run logic.
   - Keep the current normal Docker run args as the only run args.
   - Bump `CONFIG_HASH_VERSION`.
   - Simplify URL/status/storage output by removing `Profile:`.
2. Update PowerShell launcher in parity with Bash.
3. Update launcher tests:
   - Assert normal run args remain.
   - Assert launcher text contains no mobile-safe/profile terms.
   - Assert no `AUTOBYTEUS_NODE_PROFILE` or profile labels are emitted.
4. Update frontend Docker Guide command catalog and tests from `new-container --profile mobile-safe` to `new-container`.
5. Update English/Chinese localization for Docker Guide and Phone Setup to normal/generic copy.
6. Update Phone Access store/util user-facing messages and tests to replace remote Docker/mobile-safe wording with generic remote-node/private-HTTPS wording.
7. Update README/docs/future-ticket files to remove active mobile-safe setup and describe normal Docker only.
8. Validate with launcher tests, frontend targeted tests, stale-reference grep, and Dockerfile packaging checks.

## Key Tradeoffs

- Simplicity over prior Android isolation: Removing mobile-safe reduces the previously documented Android blast-radius separation but matches the user's actual usage and management simplicity goal.
- Clean break over old command compatibility: Old `--profile mobile-safe` commands fail instead of silently doing something different.
- Preserve Phone Access safety checks: Same-node advertised URL verification remains because it is not inherently mobile-safe-specific.

## Risks

- Existing mobile-safe containers continue running until users recreate/upgrade/reset them.
- Users with copied mobile-safe commands must update to the simpler command.
- Docs must be carefully updated to avoid simultaneously saying mobile-safe is removed and recommended.

## Guidance For Implementation

- Treat profile removal as first-class; search active source/docs excluding `tickets/**` after changes.
- Do not touch Docker `/mobile` asset copy lines except to verify they remain.
- Prefer deleting profile functions/branches over leaving dead constants.
- Keep Bash/PowerShell outputs semantically aligned.
- Suggested validation:
  - `bash -n scripts/public/docker/autobyteus-docker.sh`
  - `python3 -m unittest scripts.tests.test_public_docker_launcher_shared_workspace`
  - Frontend targeted tests once dependencies are available: `pnpm -C autobyteus-web exec vitest run utils/__tests__/dockerNodeLauncherCommands.spec.ts components/settings/__tests__/DockerNodeStartGuideCard.spec.ts components/settings/__tests__/PhoneAccessCard.spec.ts stores/__tests__/phoneAccessStore.spec.ts`
  - Stale active-source scan excluding ticket history: `git grep -n -E 'mobile-safe|mobile_safe|MOBILE_SAFE|AUTOBYTEUS_NODE_PROFILE' -- ':!tickets/**' ':!**/tickets/**' ':!node_modules/**'`
  - Dockerfile packaging check: verify `COPY --from=builder /app/autobyteus-web/dist-mobile/public ./autobyteus-server-ts/mobile-web` remains in the server image paths.
