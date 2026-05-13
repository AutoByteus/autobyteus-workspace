# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-end-user-start-flow/tickets/done/docker-end-user-start-flow/design-spec.md`
- Current Review Round: `5`
- Trigger: Additional user clarification that launcher `update` is script-only while `start` owns Docker image pull/check and conditional managed-container refresh.
- Prior Review Round Reviewed: `4`
- Latest Authoritative Round: `5`
- Current-State Evidence Basis: Re-read refined requirements, investigation notes, revised design spec, prior design review report, implementation handoff, code review report, API/E2E validation report, and install-once rework artifact. Specifically checked `REQ-015`, `AC-012`, interface mapping, boundary checks, rejection log, and implementation guidance for the update-vs-start ownership split.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review from solution designer | N/A | 0 blocking findings | Pass | No | Original public launcher design passed. |
| 2 | User clarification on `start` idempotency and `start another` primary UX | No prior unresolved findings | 0 blocking findings | Pass | No | Later superseded. |
| 3 | User clarification that additional-node command should be `start --new` | No prior unresolved findings | 0 blocking findings | Pass | No | Later design-impact rework showed repeated raw execution was the wrong primary UX. |
| 4 | Install-once CLI design-impact/requirement-gap rework | No prior unresolved design-review findings | 0 blocking findings | Pass | No | Superseded by update-vs-start ownership clarification. |
| 5 | User clarified launcher `update` vs server image refresh ownership | No prior unresolved findings; round-4 residuals rechecked | 0 blocking findings | Pass | Yes | Revised design is ready to return to implementation for patching. |

## Reviewed Design Spec

Round 5 confirms the authoritative ownership split:

- `autobyteus-docker install` / `autobyteus-docker update` are launcher installation/update concerns only. They refresh the installed CLI script/shim and must not call Docker, stop/remove containers, delete volumes, or mutate Docker runtime state.
- `autobyteus-docker start` owns server Docker image/container refresh for the target managed node. It checks/pulls the configured image, avoids unnecessary container recreation when unchanged, and recreates the managed container only when the image/config changed or the container is missing.
- Container refresh must preserve named volumes/user data, launcher runtime state, friendly node identity, and previous ports where possible.
- Existing decisions remain: install-once plus direct CLI is primary; repeated raw execution is advanced/temporary only; `start` is idempotent for the default node; additional nodes use `start --new`; public surfaces avoid `--project`/Compose project terminology.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design still classifies the work as a `Feature` and records the install-once design-impact rework. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Classification remains `Boundary Or Ownership Issue`; update-vs-start clarification strengthens the authoritative launcher boundary instead of spreading image refresh policy into UI/docs. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Refactor remains bounded to the public launcher boundary plus installer semantics. | None. |
| Refactor decision is supported by concrete design sections or residual-risk rationale | Pass | `REQ-015`, `AC-012`, interface mapping, boundary encapsulation, rejection log, and implementation guidance all put script update under install/update and server image refresh under start. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved findings existed. | Round 1 findings were `None`. | N/A |
| 2 | N/A | N/A | No unresolved findings existed. | Round 2 findings were `None`. | N/A |
| 3 | N/A | N/A | No unresolved findings existed. | Round 3 findings were `None`. | Round 3 was superseded by install-once rework. |
| 4 | N/A | N/A | No unresolved findings existed; update-vs-start clarification is a new semantic refinement. | Requirements now include `REQ-015`; acceptance now includes `AC-012`; design rejects overloading `update`. | Round 4 pass is superseded by this round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Settings-to-install user onboarding | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Installed launcher lifecycle to running/refreshing container | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Printed URL back into Add Remote Node | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 | Launcher lifecycle command internals | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Install/update bounded local flow | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public launcher scripts | Pass | Pass | Pass | Pass | Correctly owns both script install/update and Docker start/refresh, with separate command responsibilities. |
| Settings Nodes UI | Pass | Pass | Pass | Pass | Remains discovery/copy/next-step explanation only. |
| Frontend command catalog | Pass | Pass | Pass | Pass | Correctly owns command strings/grouping, not update or image-refresh mechanics. |
| Existing node registry | Pass | Pass | Pass | Pass | Unchanged and correctly used only after a backend URL is known. |
| Documentation | Pass | Pass | Pass | Pass | Mirrors installed-launcher-first flow and must distinguish script update from server refresh. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Command variants with phase/primary grouping | Pass | Pass | Pass | Pass | Existing command catalog shape remains appropriate. |
| Cross-platform launcher CLI contract | Pass | N/A | Pass | Pass | Bash and PowerShell should share semantics: `update` script-only; `start` server-refresh. |
| Image/container refresh policy | Pass | N/A | Pass | Pass | Belongs inside launcher `start`, not docs/UI or `update`. |
| Install destination defaults | Pass | N/A | Pass | Pass | Still belongs in launcher scripts/help. |
| Launcher state metadata | Pass | Pass | Pass | Pass | Must preserve identity, ports, image/config tracking, and state across refresh. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| `DockerLauncherCommand` | Pass | Pass | Pass | N/A | Pass | UI command model remains separate from launcher runtime state. |
| Launcher runtime state | Pass | Pass | Pass | N/A | Pass | Design requires preserving friendly identity/ports and should track enough image/config information to decide whether recreation is needed. |
| Install result reporting | Pass | Pass | Pass | N/A | Pass | Remains script output/help, not UI-owned data. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Direct `docker run` as primary no-clone docs path | Pass | Pass | Pass | Pass | Advanced fallback only. |
| Source `docker-start.sh` as public no-clone path | Pass | Pass | Pass | Pass | Source-checkout/developer helper only. |
| Repeated raw one-shot lifecycle commands as primary path | Pass | Pass | Pass | Pass | Replaced by install-once plus direct CLI. |
| Public `--project`/Compose terminology | Pass | Pass | Pass | Pass | Replaced by friendly names and `start --new`. |
| Overloaded `update` that also refreshes server containers | Pass | Pass | Pass | Pass | Explicitly rejected; `start` owns Docker image/container refresh. |
| Full uninstall/Docker cleanup automation | Pass | Pass | Pass | Pass | Out of scope except manual notes. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Pass | Pass | N/A | Pass | Owns Bash install/update and lifecycle; keep script-only update and start-owned image refresh separated internally. |
| `scripts/public/docker/autobyteus-docker.ps1` | Pass | Pass | N/A | Pass | PowerShell peer must mirror the same command semantics. |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Pass | Pass | Pass | Pass | Command construction only. |
| `autobyteus-web/utils/__tests__/dockerNodeLauncherCommands.spec.ts` | Pass | Pass | N/A | Pass | Should cover install/direct command text and update-vs-start guidance if visible. |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Pass | Pass | Pass | Pass | UI rendering/copy behavior only. |
| `autobyteus-web/components/settings/__tests__/DockerNodeStartGuideCard.spec.ts` | Pass | Pass | N/A | Pass | Should assert install-once and direct command rendering. |
| `autobyteus-web/components/settings/NodeManager.vue` | Pass | Pass | Pass | Pass | Composition owner only. |
| Localization catalogs | Pass | Pass | N/A | Pass | Existing catalog ownership remains sound. |
| `README.md` / `autobyteus-server-ts/docker/README.md` | Pass | Pass | N/A | Pass | Docs should distinguish `update` script-only from `start` server-refresh. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| NodeManager / Settings UI | Pass | Pass | Pass | Pass | No Docker/image-refresh logic. |
| Guide card | Pass | Pass | Pass | Pass | No PATH/image-refresh implementation. |
| Command catalog | Pass | Pass | Pass | Pass | Strings/grouping only. |
| Public launcher install/update | Pass | Pass | Pass | Pass | May write launcher files/shims; must not touch Docker runtime. |
| Public launcher start/lifecycle | Pass | Pass | Pass | Pass | May pull/check images and conditionally recreate managed containers while preserving volumes/state. |
| Node registry | Pass | Pass | Pass | Pass | No launcher or Docker calls. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-docker install/update` | Pass | Pass | Pass | Pass | Encapsulates script installation only. |
| `autobyteus-docker start` | Pass | Pass | Pass | Pass | Encapsulates image pull/check and conditional container refresh. |
| `dockerNodeLauncherCommands.ts` | Pass | Pass | Pass | Pass | Prevents Vue command drift. |
| `nodeStore.addRemoteNode` / Electron registry | Pass | Pass | Pass | Pass | Remains app-side registration boundary. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| raw macOS/Linux install command | Pass | Pass | Pass | Low | Pass |
| raw Windows install command | Pass | Pass | Pass | Medium | Pass |
| `autobyteus-docker install` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker update` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker start` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker start --new` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker urls` / `ports` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker status`, `logs`, `stop` | Pass | Pass | Pass | Low | Pass |
| `buildDockerNodeLauncherCommands()` | Pass | Pass | Pass | Low | Pass |
| `nodeStore.addRemoteNode(input)` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/` | Pass | Pass | Low | Pass | Correct public launcher namespace. |
| `autobyteus-web/utils/dockerNodeLauncherCommands.ts` | Pass | Pass | Low | Pass | Correct command catalog placement. |
| `autobyteus-web/components/settings/DockerNodeStartGuideCard.vue` | Pass | Pass | Low | Pass | Correct Settings UI placement. |
| Root and Docker docs | Pass | Pass | Low | Pass | Correct audience split. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Source Docker helper image refresh behavior | Pass | Pass | Pass | Pass | Existing digest/no-recreate idea can inform implementation, but public launcher remains separate because source helper depends on checkout files. |
| Settings placement | Pass | Pass | N/A | Pass | NodeManager remains right product surface. |
| Remote node registration | Pass | Pass | N/A | Pass | Existing nodeStore/probe flow remains authoritative. |
| Public install/update lifecycle | Pass | Pass | Pass | Pass | New source-free boundary remains justified. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Installed launcher as primary no-clone path | No | Pass | Pass | Clean replacement for repeated raw lifecycle commands. |
| One-shot raw execution | Yes | Pass | Pass | Secondary/advanced/temporary only. |
| Direct `docker run` | Yes | Pass | Pass | Advanced fallback only. |
| Source helper for repo users | Yes | Pass | Pass | Separate source-checkout path. |
| Overloaded `update` | No | Pass | Pass | Rejected. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Bash install/update patch | Pass | Pass | Pass | Pass |
| PowerShell install/update patch | Pass | Pass | Pass | Pass |
| Start-owned image refresh patch | Pass | Pass | Pass | Pass |
| Command catalog / UI / docs update | Pass | Pass | Pass | Pass |
| Validation plan | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Install once | Yes | Pass | Pass | Pass | Examples remain clear. |
| Direct repeated start | Yes | Pass | Pass | Pass | `autobyteus-docker start` is clear. |
| Additional node | Yes | Pass | Pass | Pass | `autobyteus-docker start --new` is clear. |
| Update vs server refresh | Yes | Pass | Pass | Pass | Rejection log and implementation guidance explicitly disambiguate. |
| URL rediscovery | Yes | Pass | Pass | Pass | Direct CLI command remains clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Image-change detection mechanism | Avoid unnecessary recreation but refresh when image actually changes. | Implementation should compare a stable pulled image identifier/digest or equivalent against the managed container/state before recreation. | Residual implementation risk. |
| Preserving ports during refresh | Users need stable URLs when possible. | Preserve state ports on image-only refresh; if a bind conflict prevents reuse, use existing retry behavior and print new URLs clearly. | Residual implementation risk. |
| Install/update must stay Docker-free | User clarified `update` is script-only. | Add checks proving install/update do not call Docker or mutate Docker state. | Residual implementation/validation risk. |
| Windows PowerShell / User PATH / shim behavior | First-class Windows path remains environment-sensitive. | Validate in PowerShell-capable environment when available; otherwise static checks plus residual note. | Residual validation risk. |
| Raw GitHub publication | Install commands depend on public raw URLs. | Delivery must recheck after integration to referenced branch. | Residual delivery risk. |

## Review Decision

`Pass`: the revised design is ready to return to implementation for patching.

## Findings

None.

## Classification

No blocking finding. The update-vs-start clarification is sufficiently reflected in requirements, acceptance criteria, boundaries, interface mapping, rejection log, and implementation guidance.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Patch implementation so `update`/rerun `install` refreshes only the installed launcher script/shim and never touches Docker runtime state.
- Patch/verify `start` pulls/checks the configured image, avoids recreation when unchanged, and recreates only when image/config changed or the container is missing.
- Preserve named volumes/user data, friendly identity, runtime state, and previous ports where possible during refresh.
- Carry forward prior install-once requirements, PowerShell validation, raw URL publication recheck, occupied-port retry, runtime flags/env/volumes, and no public `--project` terminology.

## Latest Authoritative Result

- Review Decision: `Pass`
- Notes: The design now has a clean boundary split: `install/update` owns launcher-script update, while `start` owns server image pull/check and conditional container refresh. It is implementation-ready.
