# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-spec.md`
- Current Review Round: 2
- Trigger: Design re-entry review after code-review `CR-001` found changed public Bash/PowerShell launcher source files over the Stage 8 `>500` effective non-empty-line hard limit.
- Prior Review Round Reviewed: Round 1 (`Pass`)
- Latest Authoritative Round: 2
- Current-State Evidence Basis: Updated requirements, investigation notes, design spec, design re-entry report, code review report, prior design review report, and current launcher line-count evidence in `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis`.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of Chromium profile-volume design | N/A | None | Pass | No | Initial design was functionally sound for volume/hash/docs/compose work, but later implementation review exposed launcher source-size design pressure. |
| 2 | Design re-entry for code-review `CR-001` | Round 1 had no unresolved architecture findings; code-review `CR-001` was rechecked as the re-entry driver. | None | Pass | Yes | Revised design adds public launcher entry/module distribution, source-size guard, and no-clone preservation requirements. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/backend-docker-browser-base-analysis/tickets/done/backend-docker-browser-base-analysis/design-spec.md` after re-entry updates for `CR-001`.

The revised design keeps the original Chromium profile-volume behavior, then adds a bounded public launcher refactor:

- stable public entry files remain at `scripts/public/docker/autobyteus-docker.sh` and `scripts/public/docker/autobyteus-docker.ps1`;
- Bash modules move under `scripts/public/docker/autobyteus-docker.d/bash/`;
- PowerShell modules move under `scripts/public/docker/autobyteus-docker.d/powershell/`;
- every changed public launcher source implementation file must be `<=500` effective non-empty lines;
- curl-pipe / `irm | iex` and installed CLI no-clone behavior must continue to work;
- generated/compressed/encoded hidden monoliths are forbidden.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design now classifies the work as cleanup / dependency-contract alignment plus a public launcher structural refactor. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Design distinguishes `Missing Invariant` for Chromium profile persistence from `File Placement Or Responsibility Drift` for monolithic public launcher files. Current failed implementation line counts are 801 Bash / 797 PowerShell effective non-empty lines. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor is needed now, bounded to public launcher source distribution; compose/docs/test changes remain local extensions. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | DS-005, ownership map, decommission plan, target file mapping, migration/refactor sequence, and implementation guidance all concretely reflect the launcher split. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| 1 | N/A | N/A | No unresolved architecture-review findings existed. | Round 1 recorded `Findings: None`. | Re-entry is driven by downstream code-review `CR-001`, not an unresolved prior architecture finding. |
| Code Review 1 | CR-001 | Blocking / Design Impact | Addressed at design level; implementation rework still required. | Requirements add REQ-009/REQ-010 and AC-008/AC-009; design adds DS-005, entry/module ownership, decommission of monolithic source responsibility, target module paths, and source-size validation sequence. | Reworked implementation must return through `code_reviewer` before API/E2E starts. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Public launcher managed container path | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Source-helper compose path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-003 | Personal all-in-one compose path | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-004 | Public launcher config-hash reconciliation | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-005 | Public launcher entry/module distribution | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker launcher distribution | Pass | Pass | Pass | Pass | Entry files own stable URL/install/load mechanics and source-size compliance. |
| Public Docker launcher runtime | Pass | Pass | Pass | Pass | Platform modules own state, Docker lifecycle, config hash, run args, storage output, and command dispatch. |
| Server Docker source helper | Pass | Pass | Pass | Pass | Existing compose file remains correct owner for source-helper volumes. |
| Personal Docker stack | Pass | Pass | Pass | Pass | Existing all-in-one compose service remains correct owner for the Chrome/VNC-base profile mount. |
| Browser Docker base image | Pass | Pass | Pass | Pass | Chromium startup, permissions, and stale-lock cleanup remain external to backend. |
| Documentation | Pass | Pass | Pass | Pass | Root/server/personal Docker docs are appropriate durable docs for launcher/direct-run/source-helper persistence and public launcher use. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Launcher module list/load order | Pass | Pass | Pass | Pass | Design keeps the list near entry/distribution and avoids a separate manifest parser dependency. |
| Chromium profile volume naming | Pass | Pass | Pass | Pass | Pattern belongs with each platform Docker runtime module rather than a cross-language abstraction. |
| Public module source base | Pass | Pass | Pass | Pass | One source-base constant/env override per platform controls remote temporary load and install. |
| Launcher config hash text | Pass | N/A | Pass | Pass | Existing hash owner is extended with `chromium_profile_volume`, `chromium_profile_target`, and version `v6`. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Launcher config hash text | Pass | Pass | Pass | N/A | New Chromium profile fields have singular meaning and are derived from node identity/target path. |
| Launcher state file | Pass | Pass | Pass | N/A | Design avoids a new persisted volume field unless required. |
| Launcher module source base | Pass | Pass | Pass | N/A | Design prevents URL guessing scattered across modules. |
| Compose named volumes | Pass | Pass | Pass | N/A | Named volume entries have one clear target path and stay per compose project. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Monolithic Bash launcher source responsibility | Pass | Pass | Pass | Pass | Public path remains, but responsibility narrows to entry/load/install facade. |
| Monolithic PowerShell launcher source responsibility | Pass | Pass | Pass | Pass | Same split for PowerShell. |
| Removed `mobile-safe` / `AUTOBYTEUS_NODE_PROFILE` / profile-label paths | Pass | N/A | Pass | Pass | Design continues to forbid reintroduction. |
| Backend-owned Chromium wrapper / lock cleanup | Pass | Pass | Pass | Pass | Design continues to reject backend duplication and assigns image rebuild to delivery/release. |
| Old container-layer Chromium profile migration | Pass | Pass | Pass | Pass | Design explicitly rejects brittle automatic migration. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Pass | Pass | Pass | Pass | Thin Bash public entry/load/install facade, not Docker lifecycle owner. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Pass | Pass | Pass | Pass | Bash constants/help/logging/path/normalization/hash helper home. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Pass | Pass | Pass | Pass | Bash Docker lifecycle/config/hash/run-args owner, including Chromium profile volume. |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Pass | Pass | Pass | Pass | Bash CLI orchestration/output/command parser owner. |
| `scripts/public/docker/autobyteus-docker.ps1` | Pass | Pass | Pass | Pass | Thin PowerShell public entry/load/install facade. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Pass | Pass | Pass | Pass | PowerShell constants/help/logging/path/normalization/hash helper home. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | Pass | Pass | Pass | Pass | PowerShell Docker lifecycle/config/hash/run-args owner. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | Pass | Pass | Pass | Pass | PowerShell CLI orchestration/parser owner. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Pass | Pass | N/A | Pass | Existing launcher contract test expands to module loading, source-size guard, and parity scans. |
| `autobyteus-server-ts/docker/docker-compose.yml` | Pass | Pass | N/A | Pass | Existing source-helper compose service owns its volumes. |
| `docker/compose.personal-test.yml` | Pass | Pass | N/A | Pass | Existing all-in-one compose service owns its Chrome/VNC-base volumes. |
| `README.md` | Pass | Pass | N/A | Pass | Root launcher persistence/use docs. |
| `autobyteus-server-ts/docker/README.md` | Pass | Pass | N/A | Pass | Server Docker direct-run/source-helper persistence docs. |
| `docker/README.md` | Pass | Pass | N/A | Pass | Personal all-in-one persistence note. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public launcher entries -> platform modules | Pass | Pass | Pass | Pass | Entries may source/dot-source modules; modules must not source entries. |
| Platform modules load order | Pass | Pass | Pass | Pass | Design sets core -> Docker runtime -> commands. |
| Backend launch surfaces -> Browser Docker base image contract | Pass | Pass | Pass | Pass | Backend may mount `/home/vncuser/.config/chromium`; it must not alter Chromium startup internals. |
| Public Bash/PowerShell launcher parity | Pass | Pass | Pass | Pass | Design requires equivalent volume, hash, storage, and distribution behavior. |
| Docs -> public launcher contract | Pass | Pass | Pass | Pass | Docs should preserve one-entry no-clone usage and not require manual module downloads. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public launcher entry | Pass | Pass | Pass | Pass | Entry owns distribution mechanics and delegates policy to modules. |
| Public launcher modules | Pass | Pass | Pass | Pass | Runtime policy stays in modules; entry does not duplicate run-arg/hash policy. |
| Browser Docker base image | Pass | Pass | Pass | Pass | Chromium command, permissions, and stale-lock cleanup remain in browser Docker. |
| Compose files | Pass | Pass | Pass | Pass | Compose services declare only their own volume set. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-docker new-container` | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker upgrade --all` / `workspace apply --all` reconciliation | Pass | Pass | Pass | Low | Pass |
| `autobyteus-docker install` | Pass | Pass | Pass | Medium | Pass |
| Bash curl-pipe temporary execution | Pass | Pass | Pass | Medium | Pass |
| PowerShell `irm | iex` temporary execution | Pass | Pass | Pass | Medium | Pass |
| Source-helper `docker compose` service | Pass | Pass | Pass | Low | Pass |
| Personal all-in-one `docker compose` service | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.sh` | Pass | Pass | Low | Pass | Stable public Bash entry stays at its current URL path. |
| `scripts/public/docker/autobyteus-docker.ps1` | Pass | Pass | Low | Pass | Stable public PowerShell entry stays at its current URL path. |
| `scripts/public/docker/autobyteus-docker.d/bash/` | Pass | Pass | Low | Pass | Adjacent Bash-specific module grouping is readable and not over-split. |
| `scripts/public/docker/autobyteus-docker.d/powershell/` | Pass | Pass | Low | Pass | Mirrors Bash grouping for PowerShell. |
| `autobyteus-server-ts/docker/` | Pass | Pass | Low | Pass | Source-helper compose and Docker docs belong here. |
| `docker/` | Pass | Pass | Low | Pass | Personal all-in-one stack and docs belong here. |
| Root `README.md` | Pass | Pass | Low | Pass | Public launcher persistence summary belongs in root quick-start docs. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public managed-node volume wiring | Pass | Pass | N/A | Pass | Stays in public launcher runtime modules. |
| Public launcher source distribution | Pass | Pass | Pass | Pass | Module grouping extends existing public launcher subsystem; it is not a new product subsystem. |
| Hash-driven one-time recreation | Pass | Pass | N/A | Pass | Extends existing config-hash reconciliation. |
| Source-helper volume declaration | Pass | Pass | N/A | Pass | Extends existing compose file. |
| Personal all-in-one volume declaration | Pass | Pass | N/A | Pass | Extends existing compose file. |
| Chromium startup/lock cleanup | Pass | Pass | N/A | Pass | Reuses browser Docker `1.3.6`; server image rebuild remains downstream. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Public launcher monolithic source responsibility | No | Pass | Pass | Public entry path remains but monolithic implementation responsibility is decommissioned. |
| Public launcher hash version | No | Pass | Pass | Clean-cut `v6` bump avoids keeping old mount behavior. |
| Mobile-safe/profile compatibility | No | Pass | Pass | Design forbids reintroduction. |
| Old container-layer Chromium data migration | No | Pass | Pass | Design intentionally starts a named persistent volume without fragile migration. |
| Backend Chromium wrapper/lock cleanup | No | Pass | Pass | Browser Docker remains the sole owner. |
| Hidden encoded/generated monolith | No | Pass | Pass | Explicitly rejected as a source-size workaround. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Public launcher split before functional rework | Pass | Pass | Pass | Pass |
| Bash entry/module implementation | Pass | Pass | Pass | Pass |
| PowerShell entry/module implementation | Pass | Pass | Pass | Pass |
| Public no-clone distribution preservation | Pass | Pass | Pass | Pass |
| Existing managed-container recreation | Pass | Pass | Pass | Pass |
| Compose volume additions | Pass | Pass | Pass | Pass |
| Docs/test updates | Pass | Pass | Pass | Pass |
| Server image rebuild/release | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public launcher run arg | Yes | Pass | Pass | Pass | Shows named volume, not host bind. |
| Bash module load | Yes | Pass | Pass | Pass | Clear enough for implementation. |
| PowerShell module load | Yes | Pass | Pass | Pass | Clear enough for implementation. |
| Source-size validation | Yes | Pass | Pass | Pass | Directly addresses `CR-001`. |
| Browser Docker boundary | Yes | Pass | Pass | Pass | Clearly forbids backend-owned wrappers/cleanup. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Reworked implementation must resolve `CR-001` concretely | Design now addresses structure, but current worktree still contains the failed oversized launcher implementation. | Implementation must split source and return to `code_reviewer`; API/E2E must not begin before code review passes. | Implementation pending; not a design blocker. |
| Public launcher remote module URL/base mismatch | Multi-file no-clone distribution adds a new failure mode. | Implement one source-base constant/env override, install entry+modules from same base, and fail fast with actionable errors. | Accepted residual implementation risk. |
| Published server image still lacks browser Docker `1.3.6` lock cleanup | Code changes add persistence but do not update existing remote image layers. | Carry release/rebuild note to delivery/release workflow after implementation. | Residual release risk; not blocking implementation design. |
| Existing profile state only in old container writable layers | Users may lose browser sign-in state after first new volume attach. | Document/communicate as accepted non-migration behavior. | Accepted out-of-scope risk. |
| PowerShell runtime validation may be unavailable locally | Cross-platform public launcher parity matters. | Require static parity and parser check when `pwsh` exists; skip with evidence if unavailable. | Accepted validation constraint. |

## Review Decision

- `Pass`: the revised design is ready for implementation rework.

## Findings

None.

## Classification

N/A — no blocking design findings in the revised design.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Current implementation still has `CR-001`; implementation must rework launcher source into entry+modules and return through `code_reviewer` before API/E2E begins.
- Multi-file launcher distribution must be implemented carefully so curl-pipe / `irm | iex`, install, and local installed usage all work without a repository checkout.
- Delivery/release must rebuild and publish `autobyteus/autobyteus-server` against browser Docker `1.3.6` after code merge to inherit stale Chromium profile lock cleanup.
- First attachment of the new named Chromium profile volume intentionally starts from an empty profile; existing users may need to reauthenticate browser sessions.
- If `pwsh` is unavailable, PowerShell validation may be limited to static parity and syntax inspection.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The re-entry design is sufficiently actionable and resolves the design shape behind code-review `CR-001`. Proceed to implementation rework, then route back to `code_reviewer` before API/E2E validation begins.
