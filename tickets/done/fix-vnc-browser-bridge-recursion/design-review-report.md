# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/home/autobyteus/workspace/autobyteus-workspace/.codex/tasks/fix-vnc-browser-bridge-recursion/requirements.md`
- Upstream Investigation Notes: `/home/autobyteus/workspace/autobyteus-workspace/.codex/tasks/fix-vnc-browser-bridge-recursion/investigation-notes.md`
- Reviewed Design Spec: `/home/autobyteus/workspace/autobyteus-workspace/.codex/tasks/fix-vnc-browser-bridge-recursion/design-spec.md`
- Current Review Round: 1
- Trigger: Initial architecture review requested by `solution_designer` after requirements approval and source-level reproduction.
- Prior Review Round Reviewed: N/A
- Latest Authoritative Round: 1
- Current-State Evidence Basis: Reviewed the three upstream artifacts and independently inspected `autobyteus-server-ts/docker/open-vnc-browser-url.sh`, `autobyteus-server-ts/docker/xdg-open-root-bridge.sh`, `autobyteus-server-ts/docker/exo-open-root-bridge.sh`, `autobyteus-server-ts/docker/Dockerfile.monorepo`, and `autobyteus-server-ts/docker/supervisor-autobyteus-server.conf` in the task worktree. Also checked source references for the bridge outside tickets/artifacts.

## Round History

| Round | Trigger | Prior Unresolved Findings Rechecked | New Findings Found | Review Decision | Latest Authoritative | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Initial review of durable server Docker browser bridge fix | N/A | No | Pass | Yes | Design is narrow, source-backed, and implementation-ready. |

## Reviewed Design Spec

Reviewed `/home/autobyteus/workspace/autobyteus-workspace/.codex/tasks/fix-vnc-browser-bridge-recursion/design-spec.md` against the shared design principles and mandatory review checklist.

## Task Design Health Assessment Verdict

| Assessment Area | Result (`Pass`/`Fail`) | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present for the current task posture | Pass | Design identifies the change posture as a bug fix and explicitly scopes the issue to the server Docker browser bridge. | None |
| Root-cause classification is explicit and evidence-backed | Pass | Design classifies the root cause as `Missing Invariant`, backed by current source's unconditional `runuser`, preserved `BROWSER`, unqualified `xdg-open`, direct `vncuser` failure probe, and generic opener recursion probe. | None |
| Refactor needed now / no refactor needed / deferred decision is explicit | Pass | Design says no refactor is needed now and explains that `open-vnc-browser-url.sh` is already the correct owner. | None |
| Refactor decision is supported by the concrete design sections or residual-risk rationale | Pass | Spine, ownership, file responsibility, boundary, dependency, and removal sections all route the invariant into the existing bridge owner while preserving wrappers as thin facades. | None |

## Prior Findings Resolution Check (Mandatory On Round >1)

| Prior Round | Finding ID | Previous Severity | Current Resolution | Evidence | Notes |
| --- | --- | --- | --- | --- | --- |
| N/A | N/A | N/A | N/A | N/A | First review round. |

## Spine Inventory Verdict

| Spine ID | Scope | Spine Is Readable? (`Pass`/`Fail`) | Narrative Is Clear? (`Pass`/`Fail`) | Facade Vs Governing Owner Is Clear? (`Pass`/`Fail`/`N/A`) | Main Domain Subject Naming Is Clear? (`Pass`/`Fail`) | Ownership Is Clear? (`Pass`/`Fail`) | Off-Spine Concerns Stay Off Main Line? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 | Root `$BROWSER` to VNC Chromium session | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| DS-002 | Root `/usr/local/bin/xdg-open`/`exo-open` wrapper to same bridge | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 | Bounded local uid/environment invariant in opener | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Ownership Allocation Is Clear? (`Pass`/`Fail`) | Reuse / Extend / Create-New Decision Is Sound? (`Pass`/`Fail`) | Supports The Right Spine Owners? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Server Docker browser bridge | Pass | Pass | Pass | Pass | Existing server Docker layer injects the bridge and sets `BROWSER`; extending its opener is the right locus. |
| Browser base runtime / browser-docker | Pass | Pass | Pass | Pass | Design reuses the base VNC/XFCE/DBus/Chromium session and does not move bridge logic into browser-docker. |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Need Was Evaluated? (`Pass`/`Fail`) | Shared File Choice Is Sound? (`Pass`/`Fail`/`N/A`) | Ownership Of Shared Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| VNC desktop environment assignment | Pass | N/A | N/A | Pass | Design correctly keeps the env in the single authoritative opener rather than extracting a generic helper. |

## Shared Structure / Data Model Tightness Verdict

| Shared Structure / Type / Schema | One Clear Meaning Per Field? (`Pass`/`Fail`) | Redundant Attributes Removed? (`Pass`/`Fail`) | Overlapping Representation Risk Is Controlled? (`Pass`/`Fail`) | Shared Core Vs Specialized Variant / Composition Decision Is Sound? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| N/A | Pass | Pass | Pass | N/A | Pass | No shared data structure, schema, or DTO is introduced. |

## Removal / Decommission Completeness Verdict

| Item / Area | Redundant / Obsolete Piece To Remove Is Named? (`Pass`/`Fail`) | Replacement Owner / Structure Is Clear? (`Pass`/`Fail`/`N/A`) | Removal / Decommission Scope Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Unconditional `runuser -u vncuser -- ... xdg-open` branch | Pass | Pass | Pass | Pass | Replaced by uid-aware branch in `open-vnc-browser-url.sh`. |
| Inherited `BROWSER` in post-switch opener env | Pass | Pass | Pass | Pass | Replaced by explicit `BROWSER=` in the canonical desktop opener command. |
| Unqualified `xdg-open` in the bridge | Pass | Pass | Pass | Pass | Replaced by `/usr/bin/xdg-open` so the post-switch path does not traverse the `/usr/local/bin` root wrapper. |

## File Responsibility Mapping Verdict

| File | Responsibility Is Singular And Clear? (`Pass`/`Fail`) | Responsibility Matches The Intended Owner/Boundary? (`Pass`/`Fail`) | Responsibilities Were Re-Tightened After Shared-Structure Extraction? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | Pass | Pass | N/A | Pass | Owns argument validation, uid transition policy, VNC env, recursion prevention, and unsupported-user diagnostic. |
| `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | Pass | Pass | N/A | Pass | Remains a root-entry facade with non-root pass-through. |
| `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | Pass | Pass | N/A | Pass | Remains a root-entry facade with `--launch WebBrowser` normalization and non-root pass-through. |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Are Clear? (`Pass`/`Fail`) | Forbidden Shortcuts Are Explicit? (`Pass`/`Fail`) | Direction Is Coherent With Ownership? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `open-vnc-browser-url.sh` | Pass | Pass | Pass | Pass | May use `runuser` only from root and `/usr/bin/xdg-open` only in sanitized `vncuser` env. Must not call the `/usr/local/bin` wrapper after switching. |
| Root wrappers | Pass | Pass | Pass | Pass | May delegate root calls to the bridge; must not duplicate VNC env or privilege policy. |

## Boundary Encapsulation Verdict

| Boundary / Owner | Authoritative Public Entry Point Is Clear? (`Pass`/`Fail`) | Internal Owned Mechanisms Stay Internal? (`Pass`/`Fail`) | Caller Bypass Risk Is Controlled? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Browser bridge `open-vnc-browser-url.sh` | Pass | Pass | Pass | Pass | The design makes the opener the sole owner of `runuser`, VNC env assembly, `BROWSER=` sanitization, and system opener dispatch. |
| Root `xdg-open`/`exo-open` facades | Pass | Pass | Pass | Pass | Wrappers are public convenience entries but are explicitly not governing owners. |

## Interface Boundary Verdict

| Interface / API / Query / Command / Method | Subject Is Clear? (`Pass`/`Fail`) | Responsibility Is Singular? (`Pass`/`Fail`) | Identity Shape Is Explicit? (`Pass`/`Fail`) | Generic Boundary Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- | --- |
| `open-vnc-browser-url.sh <url>` | Pass | Pass | Pass | Low | Pass |
| `/usr/local/bin/xdg-open` root wrapper | Pass | Pass | Pass | Low | Pass |
| `/usr/local/bin/exo-open` root wrapper | Pass | Pass | Pass | Low | Pass |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Target Placement Is Clear? (`Pass`/`Fail`) | Folder Matches Owning Boundary? (`Pass`/`Fail`) | Mixed-Layer Or Over-Split Risk (`Low`/`Medium`/`High`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| `autobyteus-server-ts/docker/` | Pass | Pass | Low | Pass | Existing Docker packaging folder is the correct home for runtime image scripts. |
| `autobyteus-server-ts/docker/open-vnc-browser-url.sh` | Pass | Pass | Low | Pass | Correct source owner and Docker copy source for `/usr/local/bin/open-vnc-browser-url.sh`. |
| `autobyteus-server-ts/docker/xdg-open-root-bridge.sh` | Pass | Pass | Low | Pass | Correct source owner and Docker copy source for `/usr/local/bin/xdg-open`. |
| `autobyteus-server-ts/docker/exo-open-root-bridge.sh` | Pass | Pass | Low | Pass | Correct source owner and Docker copy source for `/usr/local/bin/exo-open`. |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Capability Area Was Checked? (`Pass`/`Fail`) | Reuse / Extension Decision Is Sound? (`Pass`/`Fail`) | New Support Piece Is Justified? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Root-to-VNC browser opening | Pass | Pass | N/A | Pass | Existing bridge is extended locally; no new subsystem is proposed. |
| VNC desktop session | Pass | Pass | N/A | Pass | Existing browser-docker session contract is reused. |
| Generic root opener compatibility | Pass | Pass | N/A | Pass | Existing wrappers are reused as thin facades. |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? (`Yes`/`No`) | Clean-Cut Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- |
| Old unconditional bridge flow | No | Pass | Pass | Design rejects keeping the old flow and replaces it cleanly with the uid-aware invariant. |
| Old unqualified opener lookup | No | Pass | Pass | Design rejects PATH-dependent post-switch `xdg-open` and uses `/usr/bin/xdg-open`. |

## Migration / Refactor Safety Verdict

| Area | Sequence Is Realistic? (`Pass`/`Fail`) | Temporary Seams Are Explicit? (`Pass`/`Fail`) | Cleanup / Removal Is Explicit? (`Pass`/`Fail`) | Verdict (`Pass`/`Fail`) |
| --- | --- | --- | --- | --- |
| Single-script opener update plus wrapper review | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Was Needed? (`Yes`/`No`) | Example Is Present And Clear? (`Pass`/`Fail`/`N/A`) | Bad / Avoided Shape Is Explained When Helpful? (`Pass`/`Fail`/`N/A`) | Verdict (`Pass`/`Fail`) | Notes |
| --- | --- | --- | --- | --- | --- |
| Post-switch opener dispatch | Yes | Pass | Pass | Pass | Good example uses `BROWSER=` and `/usr/bin/xdg-open`; bad example names inherited `BROWSER` and unqualified `xdg-open`. |
| Uid branch | Yes | Pass | Pass | Pass | Good example distinguishes already-`vncuser`, root, and unsupported uid; bad example is unconditional `runuser`. |

## Missing Use Cases / Open Unknowns

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| Full interactive `gh auth login` smoke check may require account/browser interaction | It validates the human-facing auth flow, but is not necessary to prove the source recursion invariant. | API/E2E may run a non-secret smoke test if environment permits; otherwise shell/static probes are sufficient for the acceptance criteria. | Residual risk accepted |
| Desktop opener branch variability | `xdg-open` behavior differs by desktop detection and installed handlers. | Validate invariants rather than relying on one desktop branch. | Addressed by design |

## Review Decision

Pass: the design is ready for implementation.

## Findings

None.

## Classification

N/A. No blocking design finding, requirement gap, or unclear issue was found.

## Recommended Recipient

`implementation_engineer`

## Residual Risks

- Full interactive GitHub auth validation may not be feasible without user/account interaction; the design gives downstream coverage authority to validate with source inspection and controlled shell probes instead.
- Downstream images outside this repository will remain old until rebuilt from the updated source; this is outside the design scope and does not require a broader refactor.

## Latest Authoritative Result

- Review Decision: Pass
- Notes: The design correctly treats the defect as a missing invariant in the existing server Docker browser bridge. It is appropriately narrow, keeps `/usr/local/bin/xdg-open` and `/usr/local/bin/exo-open` as facades, requires `/usr/bin/xdg-open` after the user switch, clears `BROWSER`, and avoids interactive GitHub auth as a hard acceptance dependency.
