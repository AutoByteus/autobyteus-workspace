# Design Review Report — protected Ubuntu AppImage

## Review Round Meta
- Upstream Requirements Doc: `requirements-doc.md`, approved SR-012; unchanged in SR-013/014.
- Upstream Investigation Notes: `investigation-notes.md`, through SR-014.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-012/013/014; SR-010/011 approval context.
- Reviewed Design Spec: **DS-003**, `design-spec.md`.
- Supplemental Task Artifacts Reviewed: current `first-launch-record-handoff.md`; prior `architecture-rereview.md`, SR-013 `guest-observations.txt` and `inode-publication.txt`, previous SR-012 probe/result and SR-009 evidence descriptions, superseded historical handoff/approval/experiment status labels.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-003**.
- Current Review Round: **3**, 2026-11-18, triggered by SR-014 / DS-003 first-install detached-record acquisition clarification requested at implementation intake.
- Prior Review Round Reviewed: ARCH-REV-002, Pass. AR-001–003 remain resolved; affected custody/record boundaries rechecked and prior unaffected rulings retained. Current prior-finding table is in ARCH-REV-003.
- Latest Authoritative Round: this round.
- Current-State Evidence Basis: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup`, branch `fix/ubuntu-appimage-sandbox-startup`, HEAD **df2ed790ce**. Production source is unchanged since prior review; delta is design/evidence. No reviewer privileged operation, source implementation, runtime acceptance test or release.

## Routing Classification Review
- Task size: **Large**; architectural risk: **High**; independent architecture review required: **Yes**.
- Classification rationale confirmed: pre-main launch, root setup, nonroot update writer, signed distribution and application shutdown/relaunch cross multiple ownership/security boundaries. Not classification by artifact volume.
- No routing correction or pending design approval. Final target remains personal; no release authorized.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Confirmed**. Intended behavior and approved scope are unchanged; affected target paths are now concrete enough for implementation.
- Intent: once-authorized protected AppImage, real renderer sandbox, authenticated opted-in updates without recurring install/admin action, preserve Node mode, data and supported platform scope.
- Scope guardrail confirmed: UC-001–005 in scope; global weakening, arbitrary executable permissions, alternate package format, app-data migration, Mac/Windows/node-update changes and publication excluded. This is technical review, not business reapproval.
- Every prospective blocking Design Impact finding traceable to approved IDs: **Yes** for prior findings; none remain.
- Material ambiguity in approved intent: none. Automatic activation at an independently requested ordinary quit implements the previously accepted conservative deferral option, not an update-triggered termination of active work. It does not promise updates during an indefinitely open session.
- Prior-round source evidence retained: `electron/application/electronApplication.ts:73–91,367–375,438–461`; `applicationShutdown.ts:10–36`; `electron/updater/appUpdateInstallReadiness.ts:27–40`; `appUpdateAutomaticPolicy.ts:93–105,146–161`. These confirmed the original immediate-Linux-install and separate normal-quit paths that the retained DS-002 lifecycle replaces only for managed installations.
- Still-valid unchanged evidence: `build/scripts/build.ts:311–313,398–406`, `afterPack.ts:43–55`, `appUpdater.ts:104–159,296–354,378–380,442–455`, `appUpdateInstallAttempt.ts:13–49`, `linuxServerManager.ts:24–57`, `main.ts:16–44`, `appDataPaths.ts`, release workflow asset/metadata publication. Paths are beneath `autobyteus-web/` except `.github/workflows/release-desktop.yml`. Root DESIGN.md and prior shared-principle rulings remain applicable; no new contrary project rule.

| Behavior ID | Kind | Design Alignment | Approved Trigger / Current Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User launch | Pass | Pass: restricted-host open, SR-006/009 | Pass: L1/L2 selected crossing | Confirmed | Implement and validate package |
| BEH-002 | User launch | Pass | Pass: direct/menu capable launch, packaging source | Pass: sandbox-first, remove desktop bypass | Confirmed | Actual capable-host isolation tests |
| BEH-003 | Operational | Pass | Pass: packaged real Electron/Node entry | Pass: L3 excludes enrollment | Confirmed | Arguments/signals/exits tests |
| BEH-004 | System/user update | Pass | Pass: opt-in/manual/channel/current quit paths | Pass: explicit stage/quit/restart/identity | Confirmed | Two genuine signed upgrades and lifecycle tests |
| BEH-005 | Setup/refusal/removal | Pass | Pass: approved one-time authorization | Pass: credential/resource custody and reverse owned cleanup | Confirmed | Actual install/refusal/removal tests |

SR-014 delta verification: reopened `build/scripts/build.ts:114–133,206–212,350–360` and `.github/workflows/release-desktop.yml:96–107,668–700,741–752`. The existing build selects its publication repository from build inputs and derives Linux filenames from flavor and target architecture; the workflow validates tag/version and currently enumerates AppImage assets, not the planned sidecars. DS-003 correctly adds production-repository assertions, one typed identity and explicit sidecar publication rather than assuming those contracts already exist. Requirements diff is empty; this is first-install acquisition completion, not new offline onboarding or package-format support.

Affected spines redrawn in call order:
- **L2 acquisition:** restricted-host first launch with no managed copy -> user chooses Install -> unprivileged launcher derives exact tag/sidecar names from embedded build identity -> bounded anonymous HTTPS fetch -> signature/tuple/actual-open-file size and digest checks -> retain that regular-file handle -> continue authorization below. Refusal/cancellation exits before authentication or host changes; healthy/managed/redirection paths never fetch.
- **L2 authorization:** launcher checks bundled provisioner digest -> retains sealed executable descriptor -> registered OS authentication agent -> pkexec executes retained parent's descriptor path -> provisioner uses OS-set original UID and independently verifies streamed record/signature/AppImage against provisioner-pinned product/version/arch/key -> provisions protected assets/store/profile/socket in order -> returns -> original-user parent writes menu and launches canonical image. Root never writes into user HOME or executes the application payload.
- **U1 publish/stage:** build identity from canonical target/version/name -> package -> final-byte record/signature -> CI verifier -> exact `<AppImage>.release.json` and `.release.json.sig` assets alongside image before feed -> AppUpdater check/download -> managed session coordinator -> writer stage validation -> same-inode signed attributes/fsync -> verified receipt -> ready-for-next-quit UI.
- **U1 automatic:** independent ordinary quit -> coordinator's sole will-quit handler/latch -> existing shutdown stop -> confirmed server exit -> recheck stage/channel/opt-in -> writer activate -> quit re-entry pass. No automatic reopen; next ordinary launch observes installed version.
- **U1 manual:** explicit Install and Restart -> coordinator verified-ready/generation gate -> prepare/confirmed stop -> writer activation -> original-UID canonical outer-AppImage relaunch -> exit -> running-version reconciliation.
- **U2:** pre-dispatch opt-out/channel change -> generation invalidation/discard; late stage receipt -> discard. Refusal -> no native fallback. Lost activation reply -> writer status from actual committed inode before choosing outcome. Normal quit failure preserves old image; explicit-restart recovery never starts another server unless exit is confirmed.
- **Writer local:** peer/record/input checks -> private candidate -> attach signed record/signature -> fsync -> stage receipt; activation lock -> verify live identity/expected digest/admission -> rename candidate over live -> directory fsync -> receipt. New writer/interruption reconciliation hashes live bytes against signed attributes; orphan stages are disposable.

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose/Scope Clear | Core Links | Complete For Stated Purpose | Consistent | Status/Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| SR-013 guest observations | Pass | Pass | Pass: limited crossing witness | Pass | Pass | Preserve limitation: not production provisioner or graphical UX |
| SR-013 inode observations | Pass | Pass | Pass: local rename/xattr witness | Pass | Pass | Not power-loss or integrated-update proof |
| SR-012 inert fixture / SR-009 descriptions | Pass | Pass | Pass within recorded limits | Pass | Pass | Do not promote to acceptance evidence |
| Historical approval/experiment/handoff | Pass | Pass | Pass historically | Pass: superseded banner/current header | Pass | No repeated old user action |
| Current first-launch-record handoff / SR-014 investigation | Pass | Pass | Pass: design/source/transport observations only | Pass | Pass | No signed-sidecar runtime success asserted |

The historical inventory's old design-not-authored row is covered by the new current-state header and appended SR-013 inventory; it is not an active instruction. No behavior-defining supplement conflicts with the core package.

## Task Design Health Assessment Verdict
| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for current posture | Pass | Missing protected-install boundary, not renderer bug | None |
| Root cause evidence-backed | Pass | Pre-main failure, current packaging/updater source | None |
| Refactor decision explicit | Pass | Managed-only transaction/lifecycle owner | None |
| Decision reflected concretely | Pass | managedUpdateSession, sole quit owner, native boundary and record files | Implement DS-002 detail rather than duplicate old managed stop flow |

## Spine Inventory Verdict
| Spine ID | Scope | Readable | Narrative | Facade/Governing Owner | Naming | One Owner/Call Order | Off-Spine Concerns | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | Direct/menu start | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| L2 | Provision/refuse/remove | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| L3 | Node/tooling | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| U1 | Publish/stage/quit/restart | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| U2 | Cancel/refuse/reconcile | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The writer's bounded transaction and coordinator's deferred/explicit restart paths now complement, rather than replace, the full product spines.

## Boundary Encapsulation Verdict
| Boundary / Owner | Public Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Launcher/real ELF | Pass | Pass | Pass | Pass | Node operational route preserved |
| Launcher acquisition / provisioner | Pass | Pass | Pass | Pass | Unprivileged bounded exact-release fetch; root independently checks streamed signed bytes, never fetches |
| Nonroot writer | Pass | Pass | Pass | Pass | stage/activate/discard/status, fixed store, peer UID, no arbitrary execution |
| Managed session coordinator | Pass | Pass | Pass | Pass | AppUpdater delegates events; application supplies concrete lifecycle collaborators |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner | Allowed Dependencies | Forbidden Shortcuts | Direction | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provisioner/writer | Pass | Pass | Pass | Pass | No mutable helper extraction, user-supplied paths, root app or routine elevation |
| Managed session/application | Pass | Pass | Pass | Pass | One sequence owner; no concurrent ApplicationShutdown.quit auto-resume |
| Release pipeline | Pass | Pass | Pass | Pass | Same canonical build identity drives exact sidecar URLs and publication; final-byte signing before feed |

Composition-root check: **Pass**. ElectronApplication creates the managed coordinator with writer, shutdown, server-exit check, canonical path and preference/state reader. State queries/results are not delegation of sequence ownership. DS-002's detailed lifecycle section supersedes the earlier generic stop/ready wording: do not retain a second managed install-attempt coordinator.

## Interface Boundary Verdict
| Interface | Subject Clear | Singular Responsibility | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Launcher acquisition / provisioner crossing | Pass | Pass | Pass: build-pinned release, retained file/helper, OS UID, signed bytes | Low | Pass |
| Writer stage/activate/discard/status | Pass | Pass | Pass: stage ID, live digest, signed record, peer UID | Low | Pass |
| stageDownloaded/settingsChanged/requestRestart/willQuit | Pass | Pass | Pass: generation, intent, canonical install | Low | Pass |

Empty-indirection check: **Pass**. Native IPC translation and managed sequencing have distinct concrete responsibilities; no generic framework is required.

## Existing Capability / Subsystem Reuse Verdict
| Need | Existing Area Checked | Reuse Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scoped setup | Pass | Pass | Pass | Pass | No existing setup owner |
| Update checks/preferences/notifications | Pass | Pass | Pass | Pass | Retain existing owners, replace managed readiness/activation |
| Shutdown/recovery | Pass | Pass | Pass | Pass | Reuse stop semantics, coordinator alone decides continuation |
| Signing / first-install sidecars | Pass | Pass | Pass | Pass | Reuse record/key and existing naming owner; no second feed or adjacent-file discovery |

## Subsystem / Capability-Area Allocation Verdict
| Area | Ownership Clear | Reuse/Create Sound | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native Linux install | Pass | Pass | Pass | Pass | Launcher, provisioner, writer separated |
| Electron application/updater | Pass | Pass | Pass | Pass | Session lifecycle vs download/reporting |
| Build/release | Pass | Pass | Pass | Pass | Dedicated manifest/signing contract and validation |

## Reusable Owned Structures Verdict
| Repetition | Extraction Evaluated | Shared File Choice | Shared Owner | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Signed identity/admission | Pass | Pass | Pass | Pass | contract/desktop-release.md, internal/release/record.go, shared byte vectors |
| Build release identity | Pass | Pass | Pass | Pass | Existing target/version/Linux basename owner supplies embedded identity and publication checks |
| Preferences/notifications | Pass | Pass | Pass | Pass | Existing stores; no parallel preference owner |

## Shared Structure / Data Model Tightness Verdict
| Structure | One Meaning/Field | Redundancy Controlled | Overlap Controlled | Core/Variant Decision | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Release record and installed attributes | Pass | Pass | Pass | Pass | Pass | Signed artifact identity separate from selected channel and running version |
| Stage/session identity | Pass | Pass | Pass | Pass | Pass | Candidate, baseline digest and generation serve separate checks |
| User settings | Pass | Pass | Pass | N/A | Pass | No schema change |

Derived-consumer inventory: **Pass**; signer, Go launcher precheck/provisioner/writer, validator and untrusted update client have explicit decisions and common vectors. Vocabulary: **Pass**; planned glossary additions belong with implementation. App version observation is not installed-record authority.

## File Responsibility Mapping Verdict
| File / Area | Singular Responsibility | Matches Owner | Retightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| build.ts / afterPack.ts | Pass | Pass | N/A | Pass | Target-aware build identity and launcher packing; preserve Mac normalization |
| linux-install/cmd/{launcher,provision,writer}/main.go | Pass | Pass | Pass | Pass | Launcher owns pre-auth acquisition; provisioner/writer retain independent verification |
| linux-install/internal/release/record.go / contract | Pass | Pass | Pass | Pass | Verification/admission contract |
| application/managedUpdateSession.ts | Pass | Pass | Pass | Pass | Quit/restart/cancel lifecycle |
| appUpdater.ts / linuxManagedInstall.ts / controller/IPC | Pass | Pass | Pass | Pass | Download/reporting, IPC translation, verified-readiness exposure |
| release workflow / desktop-package / validator | Pass | Pass | Pass | Pass | Exact-byte signing/validation before feed |

## Subsystem / Folder / File Placement Verdict
| Path / Item | Placement Clear | Owning Folder | Mixed/Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| linux-install/ | Pass | Pass | Low | Pass | Native privilege/verification boundary |
| electron/application/ | Pass | Pass | Low | Pass | Managed session depends on application lifecycle |
| electron/updater/ | Pass | Pass | Low | Pass | Download policy/IPC adapter, not shutdown owner |
| scripts/desktop-package/ | Pass | Pass | Low | Pass | Desktop release tooling |

## Removal / Decommission Completeness Verdict
| Item | Removal Named | Replacement Clear | Scope Explicit | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Generated desktop no-sandbox | Pass | Pass | Pass | Pass | Inspect generated final Exec |
| Managed native replacement/quit auto-install | Pass | Pass | Pass | Pass | Coordinator and verified writer replace these paths |
| Managed immediate downloaded→install/readiness | Pass | Pass | Pass | Pass | Stage receipt and independent quit/explicit restart |
| Historical bypass | Pass | Pass | Pass | Pass | Never restored |
| Other dead symbols | N/A | N/A | N/A | Pass | None identified; do not delete still-supported portable/Mac paths |

## Legacy / Backward-Compatibility Verdict
| Area | Legacy Retention | Clean Cut | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Portable vs protected | No | Pass | Pass | Distinct supported deployment contexts |
| Historic sandbox fallback | No | Pass | Pass | Explicitly excluded |
| Current committed record | No | Pass | Pass | Unknown/incompatible format refuses; no historical app-data reader |

## Persisted-Data Transition Verdict
| Subject | Decision | Evidence | Proportionate | Migration Safety | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| App/server/settings/session data | Directly Usable — No Migration | Pass: same HOME/app identity and existing readers | Pass | N/A | Pass | Prove continuity with synthetic data |
| Pending stages | Discard or Rebuild | Pass: private disposable candidate, never live | Pass | N/A | Pass | Restart discards orphan pending files |
| Committed installation identity | New state, no historical migration | Pass: signed same-inode attrs and actual-byte reconciliation | Pass | N/A | Pass | Unsupported filesystem refuses during preflight; no second version file |

## Change / Refactor Safety Verdict
| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Bootstrap -> protected launch | Pass | Pass | Pass | Pass |
| Managed stage -> activation -> observation | Pass | Pass | Pass | Pass |
| Build-only tests/docs/delivery | Pass | Pass | Pass | Pass |

Selected bootstrap build order is acyclic: writer -> embed writer/templates/key in provisioner -> pin finished provisioner digest in launcher -> AppImage -> signed final-byte record. Refusal/rollback cleanup affects only attempt-owned resources, not prior installations or user data.

## Example Adequacy Verdict
| Topic | Needed | Present/Clear | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Immutable authorization | Yes | Pass | Pass | Pass | Parent descriptor, separate tty agent, exact resources/UID |
| First-install signed-record acquisition | Yes | Pass | Pass | Pass | Exact asset name/example, renamed download invariance, bounds and pre-auth refusal |
| Managed lifecycle | Yes | Pass | Pass | Pass | Four ordered paths with cancellation cutoff and sole quit handler |
| Signed identity/commit | Yes | Pass | Pass | Pass | Byte-format example, first install/two upgrades/refusals, same-inode authority |

## Material Premise Validation
**None additional.** The approved normal first-install/update paths, refusal, opt-out and active-work guarantees govern this round. Acquisition failure is governed by AC-003, not an invented offline-install product promise. Quit-only activation avoids inventing an idle detector. Same-inode identity completes the already selected authenticated transaction; no arbitrary corruption, hostile administrator, same-user malware containment or generalized disaster-recovery obligation has been introduced.

## Unresolved Approved-Behavior Or Current-State Gaps
**None blocking architecture implementation.** The VM logs and local inode witness support bounded feasibility, not acceptance of the finished product. Production helper, graphical authentication, host/architecture matrix, reboot/removal and actual signed updater integration remain explicit implementation/validation obligations.

## Review Decision
**Pass.** DS-003, including the L2 acquisition delta, is ready for implementation. AR-001–003 are resolved at the architecture boundary, without relaxing approved behavior or adding reviewer-imposed holds.

## Findings
**None open.** Prior findings remain resolved in ARCH-REV-003; no new finding is introduced. The initial Fail and subsequent Pass remain in the cumulative history.

## Classification
**Pass — Large / High**. No active Design Impact, Requirement Gap or Unclear finding. Requirements approval remains SR-012; latest design clarification SR-014.

## Recommended Recipient
Implementation Engineer through the primary pass handoff rule; then informational pass notification to Solution Designer. No duplicate forwarding requested from Solution Designer.

## Residual Risks
- DS-003 requires official sidecars for initial managed setup; neither their existence nor full packaged retrieval was demonstrated in this review. The reported anonymous HEAD supports only the transport shape. Build-only tests must prove exact target/version/naming and sidecar inclusion, renamed local image matching, bounded redirects/body/deadline, no fetch on excluded paths, and no authentication after failed acquisition. Do not silently substitute latest metadata, neighboring files or an unsigned source.
- Production-origin/key restrictions apply to compiled production identity; isolated test origin/key remain build-only. Retaining an open local descriptor does not freeze its bytes: the root-private streamed-copy digest check remains mandatory even after launcher preverification. No permanent network dependency is introduced for installed startup.
- AR-001 proof is stock Noble native id/printenv through two one-shot authorizations, not the production Go provisioner or graphical agent. Retain executable reproduction and full bounded logs during implementation; only the observation summaries survive here. Do not claim Ubuntu 26/ARM64 or graphical acceptance from this witness.
- The inode witness is not power-loss validation. Real store filesystem preflight, signed attributes, disk/size bounds, exact digest checking, service permissions, durable ACK and status reconciliation need implementation-level proof.
- Preserve the selected lifecycle: no automatic update-triggered quit; recheck opt-in before dispatch; no late-stage activation; no parallel native/managed quit handlers; no relaunch after intentional normal quit. Manual recovery must not create a second server.
- Interpret the detailed resource-custody section as authoritative: root owns installed service resources/templates; the generated per-user menu entry is written/removed by the original user. The earlier broad “desktop integration admin-owned” phrase is not permission for root to write HOME.
- Final validation still requires actual AppRun/desktop/Node paths, capable/restricted renderer isolation, native x64/ARM64, two real signed upgrades without cached authorization, opt-out/work deferral, uninstall/reboot, and synthetic data continuity. Missing evidence cannot become delivery success.
- Production signing identity provisioning is release administration. Use separate test trust for build-only checks; no production secrets or publication authorized. The scoped AppArmor label is not whole-app confinement.

## Latest Authoritative Result
- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**.
- Notes: **ARCH-REV-003 / SR-014 / DS-003**, requirements **SR-012**, **Large / High**. Implementation handoff authorized by this review; delivery acceptance and release authorization are separate.
