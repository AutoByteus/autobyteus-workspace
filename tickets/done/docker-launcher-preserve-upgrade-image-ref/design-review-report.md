# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/requirements.md`
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/investigation-notes.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer`.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Upstream package plus direct inspection of Bash and PowerShell launcher parsing, upgrade fan-out, state helpers, docs/help ownership, and existing fake-Docker launcher tests in the task worktree.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review | N/A | None | Pass | Yes | Design is scoped, evidence-backed, and actionable. |

## Reviewed Design Spec

Reviewed `/Users/normy/autobyteus_org/autobyteus-worktrees/docker-launcher-preserve-upgrade-image-ref/tickets/done/docker-launcher-preserve-upgrade-image-ref/design-spec.md`.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design classifies the work as Behavior Change / Bug Fix. | None. |
| Root-cause classification is explicit and evidence-backed | Pass | Root cause is `Missing Invariant`, supported by current code applying one computed image ref to all nodes and fake-Docker reproduction rewriting `latest-zh` to `latest`. | None. |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says refactor needed now to separate parser user intent from upgrade execution. | None. |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Concrete parser flag + fan-out resolver changes are mapped to Bash and PowerShell files; no state migration is explicitly deferred with fallback rationale. | None. |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Plain all-node upgrade preserves per-node image refs | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 | Explicit all-node image/tag retarget | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local upgrade fan-out loop | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Public Docker launcher - Bash | Pass | Pass | Pass | Pass | Parser and runtime responsibilities are separated correctly. |
| Public Docker launcher - PowerShell | Pass | Pass | Pass | Pass | Design mirrors Bash semantics without a cross-language abstraction. |
| Launcher tests | Pass | Pass | Pass | Pass | Extending existing fake-Docker tests is appropriate. |
| Public docs/help | Pass | Pass | Pass | Pass | User-facing contract updates are included. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Explicit override tracking in Bash/PowerShell parsers | Pass | N/A | Pass | Pass | Language-specific parser state is the right level. |
| Per-node upgrade target resolver | Pass | N/A | Pass | Pass | Runtime-local helper is acceptable because upgrade fan-out owns target selection. Implementation may move/reuse existing node-image fallback helpers only if dependency direction remains clear. |
| Existing state fields `IMAGE_REF` / `imageRef` | Pass | N/A | Pass | Pass | Reuse current persisted node image identity; no state migration needed. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Bash `IMAGE_REF` state field | Pass | Pass | Pass | N/A | Pass | Single authoritative saved image ref for Bash nodes. |
| PowerShell `imageRef` state field | Pass | Pass | Pass | N/A | Pass | Single authoritative saved image ref for PowerShell nodes. |
| Parser override flag | Pass | Pass | Pass | N/A | Pass | Boolean/marker carries only explicit user override intent. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Plain-upgrade global default-image retarget behavior | Pass | Pass | Pass | Pass | Replaced by per-node target resolution in upgrade fan-out. |
| Docs/help wording implying one global latest target | Pass | Pass | Pass | Pass | Replaced with preserve-current-image wording and explicit retarget examples. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash/commands.sh` | Pass | Pass | N/A | Pass | Parser/dispatch should track explicit image/tag override. |
| `scripts/public/docker/autobyteus-docker.d/bash/docker-runtime.sh` | Pass | Pass | N/A | Pass | Upgrade fan-out should resolve per-node target image. |
| `scripts/public/docker/autobyteus-docker.d/bash/core.sh` | Pass | Pass | N/A | Pass | Help text/state constants only. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Commands.ps1` | Pass | Pass | N/A | Pass | Mirrors Bash parser. |
| `scripts/public/docker/autobyteus-docker.d/powershell/DockerRuntime.ps1` | Pass | Pass | N/A | Pass | Mirrors Bash runtime upgrade ownership. |
| `scripts/public/docker/autobyteus-docker.d/powershell/Core.ps1` | Pass | Pass | N/A | Pass | Help text/state constants only. |
| `scripts/tests/test_public_docker_launcher_shared_workspace.py` | Pass | Pass | N/A | Pass | Existing fake-Docker public launcher test owner. |
| `README.md` | Pass | Pass | N/A | Pass | Root user-facing Docker launcher docs. |
| `autobyteus-server-ts/docker/README.md` | Pass | Pass | N/A | Pass | Server Docker guide docs. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Command parser | Pass | Pass | Pass | Pass | May normalize explicit image refs and pass override marker; must not do per-node loop/state policy. |
| Upgrade fan-out | Pass | Pass | Pass | Pass | May enumerate nodes, read state, choose target, and call lifecycle starter. |
| Docker lifecycle starter | Pass | Pass | Pass | Pass | Receives resolved image ref; must not infer CLI user intent. |
| Tests | Pass | Pass | Pass | Pass | Fake Docker only; avoid live Docker dependency. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Bash/PowerShell command parser | Pass | Pass | Pass | Pass | Owns user-intent extraction. |
| `upgrade_all_nodes` / `Upgrade-AllNodes` | Pass | Pass | Pass | Pass | Owns all-node sequencing and per-node target resolution. |
| `start_node` / `Start-Node` | Pass | Pass | Pass | Pass | Owns Docker pull/recreate/state-write mechanics only. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `upgrade_all_nodes([override_image_ref], [has_override])` | Pass | Pass | Pass | Low | Pass |
| `Upgrade-AllNodes([string]$ImageRef, [bool]$HasImageOverride)` | Pass | Pass | Pass | Low | Pass |
| `resolve_upgrade_image_ref_for_node(node, override?)` / equivalent | Pass | Pass | Pass | Low | Pass |
| `start_node` / `Start-Node` | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/public/docker/autobyteus-docker.d/bash` | Pass | Pass | Low | Pass | Existing parser/core/runtime split remains sufficient. |
| `scripts/public/docker/autobyteus-docker.d/powershell` | Pass | Pass | Low | Pass | Mirrors Bash split. |
| `scripts/tests` | Pass | Pass | Low | Pass | Existing launcher tests are the right durable coverage location. |
| Root/server Docker docs | Pass | Pass | Low | Pass | Existing public docs surfaces. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Per-node state image lookup | Pass | Pass | N/A | Pass | Use existing state helpers/fields. |
| Docker lifecycle refresh | Pass | Pass | N/A | Pass | Reuse `start_node` / `Start-Node`. |
| Durable behavior tests | Pass | Pass | N/A | Pass | Extend existing fake-Docker module. |
| User docs/help | Pass | Pass | N/A | Pass | Extend existing docs/help owners. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old plain `upgrade --all` retarget-to-default behavior | No | Pass | Pass | Replaced directly; explicit `--tag latest` remains the intentional retarget path. |
| New opt-in preserve flag / compatibility flag | No | Pass | Pass | Rejected in design. |
| Missing image ref in malformed/old state | Yes | Pass | Pass | Fallback to default is a safety fallback, not old behavior preservation. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Bash parser/runtime change | Pass | Pass | Pass | Pass |
| PowerShell parser/runtime change | Pass | Pass | Pass | Pass |
| Tests and docs | Pass | Pass | Pass | Pass |
| State migration | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Default mixed fleet upgrade | Yes | Pass | Pass | Pass | Shows `latest` and `latest-zh` preserving distinct image refs. |
| Explicit retarget | Yes | Pass | Pass | Pass | Shows `--tag latest-zh` retargeting all nodes. |
| Ownership split | Yes | Pass | Pass | Pass | Makes parser/fan-out/lifecycle boundaries clear. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| None | N/A | N/A | Closed. |

## Review Decision

- `Pass`: the design is ready for implementation.

## Findings

None.

## Classification

N/A - no findings.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- PowerShell behavior could drift if implementation updates Bash only; the design already mitigates this with mirrored source changes and parse/static parity checks where supported.
- Full launcher test module may remain affected by local Python/port environment issues; targeted fake-Docker tests should be run and unrelated baseline limitations recorded.
- Malformed/old state without an image ref necessarily falls back to the default image, which may retarget that malformed node; this is an accepted residual risk because the intended image variant is not recoverable from such state.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: Design is ready for implementation. It is concrete, current-code-backed, and preserves boundary ownership: parser extracts override intent, upgrade fan-out resolves per-node targets, and lifecycle start/recreate remains image-ref-policy-agnostic.
