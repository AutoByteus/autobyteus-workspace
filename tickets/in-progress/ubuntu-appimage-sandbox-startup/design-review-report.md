# Design Review Report — protected Ubuntu AppImage

## Review Round Meta
- Upstream Requirements Doc: `requirements-doc.md`, approved SR-012, unchanged through SR-016.
- Upstream Investigation Notes: `investigation-notes.md`, through SR-016.
- Upstream Solution Revision Record: `solution-revision-record.md`, SR-012–016.
- Reviewed Design Spec: **DS-004**, `design-spec.md`; retained DS-003 and SR-015 except managed explicit-restart dispatch.
- Supplemental Task Artifacts Reviewed: `architecture-rereview-sr016.md`, `implementation-handoff.md` IR-004, `evidence/IMP-31-packaged-restart-origin.txt`, `evidence/IMP-32-design-impact.md`, API-REV-002 execution report, `api-08-native-linux-disposition.md`, manual-refusal and stage-lifetime clarifications; prior core/review records retained.
- Architecture Review Revision Record: `architecture-review-revision-record.md`.
- Current Architecture Review Revision ID: **ARCH-REV-004**.
- Current Review Round: **4**, 2026-11-19; trigger IR-004 / F-API-02 demonstrated the prior selected restart mechanism fails before AppRun.
- Prior Review Round Reviewed: ARCH-REV-003 Pass on DS-003. AR-001–003 rechecked where affected; no earlier pass is transferred to the new dispatch without review. F-API-01/02 remain downstream validation findings, not silently closed by this report.
- Latest Authoritative Round: this round.
- Current-State Evidence Basis: `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup`, `fix/ubuntu-appimage-sandbox-startup`, HEAD **2f2090e933**. IR-004 source includes **9017bd351d** F-API-01 correction; DS-004 restart not implemented. Reviewed source/evidence, no new reviewer runtime experiment, VM/policy change, release or acceptance-test execution.

## Routing Classification Review
- Task size: **Large**; architectural risk: **High**; independent architecture review required: **Yes**.
- Classification rationale confirmed: pre-main launch, root setup, nonroot update writer, signed distribution and application shutdown/relaunch cross multiple ownership/security boundaries. Not classification by artifact volume.
- No routing correction or pending design approval. Final target remains personal; no release authorized.

## Upstream Behavior And Production-Path Basis Confirmation
- Overall Basis Status: **Confirmed**. Requirements and scope unchanged: explicit Settings Install & Restart must reopen automatically as the original user with the preserved profile; opted-in ordinary quit must remain closed. This round replaces a failed technical dispatch, not either behavior.
- Scope guardrail: BEH-004 / REQ-005/007 / AC-006/008 drive the delta; BEH-001/002/003/005 preserved. No privilege, host-policy, format, platform-support or release-authority change. No new approval needed.
- Blocking Design Impact findings traceable to approved IDs: **Yes** for prior findings; none open in the revised design. No material intent ambiguity.
- Current source opened: `linux-install/cmd/launcher/main.go:22–75` routes Node, verified canonical and portable paths; `internal/launch/supervise_linux.go:41–95` owns direct child, FD3, signals, wait and early fatal classification; `internal/launch/managed_linux.go:15–45` checks protected ancestors, writer account and live regular file. `electron/main.ts` and `launch-profile/linuxLaunchReady.ts` establish FD3 is only pre-main readiness. `electron/application/electronApplication.ts:85–95` currently injects app.relaunch; `managedUpdateSession.ts:73–135` owns intent, confirmed stop, writer reconciliation and old relaunch call; `electron/updater/linuxManagedInstall.ts:46–60` detects canonical installed context with filesystem/kernel checks. These are current implementation facts, replacing the initial ticket's missing-boundary baseline.
- New runtime evidence: IMP-31 records correct signed 1.5.15 ACK, actual canonical exec, mount EPERM and failed successor, followed by healthy same-byte independent menu control. IMP-32 and investigation distinguish inherited NoNewPrivs from app UID, signing and readiness. API-REV-002 remains **Fail**. The independent menu control is evidence of startup-context difference, not a successful manual restart.
- Project rule checked: `docs/design-cases.md` case 21 now records this precise error: success of an API call/stand-in is not proof of the real successor. Existing DESIGN.md principles and SR-015 secret-isolated native CI method apply.

| Behavior ID | Kind | Design Alignment | Approved Trigger / Current Evidence | Target Path Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User launch | Pass | Pass: prior scoped restricted-host evidence | Pass: first-install acquisition/custody unchanged | Confirmed | Retain package regressions |
| BEH-002 | User launch | Pass | Pass: API-04c capable direct/menu evidence | Pass: no new restart channel on portable branch | Confirmed | Preserve sandbox and early-fatal classifier |
| BEH-003 | Operational | Pass | Pass: Node bypass/source/API-03 | Pass: no channel/protocol in Node mode | Confirmed | Repeat affected native smoke |
| BEH-004 | Manual/system update | Pass | Pass: real Settings failure and ordinary-quit control | Pass: revised two-part handback and fixed re-entry | Confirmed | Implement, source-review, then independently revalidate F-API-01/02 and open matrix |
| BEH-005 | Setup/refusal/removal | Pass | Pass: retained install contract and scoped API evidence | Pass: no enrollment/elevation on handback | Confirmed | Preserve refusal/removal behavior |

Affected spines redrawn in actual call order:
- **Managed session start:** outer canonical AppImage runtime -> ordinary-user AppRun -> verified canonical GUI branch -> fresh nonblocking socket pair/identification + existing FD3 -> direct Electron main -> managed-context channel claim -> ElectronApplication composition -> ManagedUpdateSession. Portable/Node branches do not acquire restart capability.
- **Manual success:** Settings click -> session confirms restart capability before stop -> shutdown/positive server-gone -> generation/channel recheck -> writer activation/known candidate -> one fixed main-process R indication -> intentional exit76 -> AppRun reaps direct main -> bounded message/credentials/exit/termination checks -> revalidate fixed protected target -> close old handles and sanitize runtime-only environment/cwd -> direct exec outer image -> fresh mounted AppRun/Electron -> GUI/server/running-version reconciliation.
- **Manual confirmed-old recovery:** refused/lost ACK -> authenticated status -> confirmed old baseline + matching refusal/retryable-loss notification -> same explicit-session handback/old-main exit -> canonical old image. If settings invalidated the stage during stop, obtain confirmed unchanged baseline before recovery handback. Unknown identity or unconfirmed stop never authorizes reopening.
- **Automatic ordinary quit:** independent quit -> coordinator stop/confirmed server exit -> eligible activation or refusal -> ordinary exit, no R/76 pair -> AppRun returns. No new capability requirement for staging, automatic updates or ordinary quit.
- **R1, bounded handback:** main checks/owns FD4 and writes once; parent receives only after reaping and accepts exactly one R with direct-child PID/login UID credentials and normal exit76, provided termination has not been requested. Packet alone, code alone, foreign/malformed/duplicate/truncated/extra input or termination rejects. Parent drives re-entry itself; it neither calls writer nor executes a child-selected command.
- **Retained L2/U1:** exact-release signed sidecars before first-install auth; sealed provisioner and protected installation; updater signs/stages/activates same-inode identity. No new producer, key, installation route or committed-data authority.

## Supplemental Artifact Coherence Verdict
| Artifact | Purpose/Scope Clear | Core Links | Complete For Stated Purpose | Consistent | Status/Approval Clear | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| IR-004 / IMP-31/32 | Pass | Pass | Pass: failure-origin evidence | Pass | Pass | Preserve raw cause and independent-control distinction |
| API-REV-002 execution report | Pass | Pass | Pass: scoped successes and failed/open cases | Pass | Pass | Remains Fail; no acceptance waiver |
| SR-015 API-08 disposition | Pass | Pass | Pass | Pass | Pass | Linux-only isolated native validation, not combined release dispatch |
| Manual-failure / stage-lifetime clarifications | Pass | Pass | Pass | Pass | Pass | Preserve retry/notification semantics through changed transport |
| SR-016 handoff / investigation | Pass | Pass | Pass for design | Pass | Pass | Local kernel/Node witness not packaged proof |
| Earlier evidence/superseded handoffs | Pass | Pass | Pass historically | Pass | Pass | Reuse only within recorded scope |

## Task Design Health Assessment Verdict
| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Present for current posture | Pass | DS-004 separates correct commit from failed native successor | None |
| Root cause evidence-backed | Pass | IMP-31/32 actual mount failure and same-byte independent menu control | None |
| Refactor decision explicit | Pass | Replace managed Electron dispatch, reuse existing ordinary-user supervisor | None |
| Decision reflected concretely | Pass | Main-owned handback, parent-owned wait/re-entry and unchanged writer authority | Remove managed app.relaunch path; no second coordinator |

## Spine Inventory Verdict
| Spine ID | Scope | Readable | Narrative | Facade/Governing Owner | Naming | One Owner/Call Order | Off-Spine Concerns | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| L1 | Direct/menu start | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| L2 | Provision/refuse/remove | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| L3 | Node/tooling | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| U1 | Publish/stage/quit/restart | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| U2 | Cancel/refuse/reconcile | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| R1 | Session handback / fixed successor exec | Pass | Pass | Pass | Pass | Pass | Pass | Pass |

The writer transaction, session lifecycle and R1 bounded handback are distinct owned portions of the full product path, not a second update controller.

## Boundary Encapsulation Verdict
| Boundary / Owner | Public Entry Clear | Internals Internal | Bypass Controlled | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Launcher/real ELF | Pass | Pass | Pass | Pass | Node operational route preserved |
| Launcher acquisition / provisioner | Pass | Pass | Pass | Pass | Unprivileged bounded exact-release fetch; root independently checks streamed signed bytes, never fetches |
| Nonroot writer | Pass | Pass | Pass | Pass | stage/activate/discard/status, fixed store, peer UID, no arbitrary execution |
| Managed session coordinator | Pass | Pass | Pass | Pass | Retains readiness/stop/outcome/intent authority; handback not arbitrary relaunch |
| AppRun restart receiver | Pass | Pass | Pass | Pass | Direct-child credential/exit gate, own fixed target, no writer or renderer access |

## Dependency Direction / Forbidden Shortcut Verdict
| Owner | Allowed Dependencies | Forbidden Shortcuts | Direction | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Provisioner/writer | Pass | Pass | Pass | Pass | No mutable helper extraction, user-supplied paths, root app or routine elevation |
| Managed session/application | Pass | Pass | Pass | Pass | Session orders stop/activation/handback; parent orders reap/dispatch, no reverse writer call |
| Release pipeline | Pass | Pass | Pass | Pass | Same canonical build identity drives exact sidecar URLs and publication; final-byte signing before feed |

Composition-root check: **Pass**. ElectronApplication creates the managed coordinator with writer, shutdown, server-exit check, canonical path and preference/state reader. State queries/results are not delegation of sequence ownership. DS-004 replaces only the managed relaunch dependency with a claimed main-owned session capability. The writer and ordinary shutdown never gain GUI-launch authority.

## Interface Boundary Verdict
| Interface | Subject Clear | Singular Responsibility | Identity Explicit | Generic Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| Launcher acquisition / provisioner crossing | Pass | Pass | Pass: build-pinned release, retained file/helper, OS UID, signed bytes | Low | Pass |
| Writer stage/activate/discard/status | Pass | Pass | Pass: stage ID, live digest, signed record, peer UID | Low | Pass |
| stageDownloaded/settingsChanged/requestRestart/willQuit | Pass | Pass | Pass: generation, intent, canonical install | Low | Pass |
| R1 indication + exit76 | Pass | Pass | Pass: kernel PID/UID, direct main, per-launch channel | Low: no selectable action/arguments | Pass |

Empty-indirection check: **Pass**. Native IPC translation and managed sequencing have distinct concrete responsibilities; no generic framework is required.

## Existing Capability / Subsystem Reuse Verdict
| Need | Existing Area Checked | Reuse Sound | New Piece Justified | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Scoped setup | Pass | Pass | Pass | Pass | No existing setup owner |
| Update checks/preferences/notifications | Pass | Pass | Pass | Pass | Retain existing owners, replace managed readiness/activation |
| Shutdown/recovery | Pass | Pass | Pass | Pass | Reuse stop/status; existing supervisor re-enters after explicit confirmed handback |
| Signing / first-install sidecars | Pass | Pass | Pass | Pass | Reuse record/key and existing naming owner; no second feed or adjacent-file discovery |

## Subsystem / Capability-Area Allocation Verdict
| Area | Ownership Clear | Reuse/Create Sound | Supports Spine | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Native Linux install | Pass | Pass | Pass | Pass | Launcher, provisioner, writer separated |
| Electron application/updater | Pass | Pass | Pass | Pass | Session lifecycle vs download/reporting; bootstrap owns FD4 claim |
| Build/release | Pass | Pass | Pass | Pass | Dedicated manifest/signing contract and validation |

## Reusable Owned Structures Verdict
| Repetition | Extraction Evaluated | Shared File Choice | Shared Owner | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Signed identity/admission | Pass | Pass | Pass | Pass | contract/desktop-release.md, internal/release/record.go, shared byte vectors |
| Build release identity | Pass | Pass | Pass | Pass | Existing target/version/Linux basename owner supplies embedded identity and publication checks |
| Handback byte/status constants | Pass | Pass | Pass | Pass | One small cross-language protocol with matched tests, not a general command schema |
| Preferences/notifications | Pass | Pass | Pass | Pass | Existing stores; no parallel preference owner |

## Shared Structure / Data Model Tightness Verdict
| Structure | One Meaning/Field | Redundancy Controlled | Overlap Controlled | Core/Variant Decision | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Release record and installed attributes | Pass | Pass | Pass | Pass | Pass | Signed artifact identity separate from selected channel and running version |
| Stage/session identity | Pass | Pass | Pass | Pass | Pass | Candidate, baseline digest and generation serve separate checks |
| Restart handback | Pass | Pass | Pass | N/A | Pass | R/76 + kernel credentials; no caller-supplied path/data or persisted token |
| User settings | Pass | Pass | Pass | N/A | Pass | No schema change |

Derived-consumer inventory: **Pass**; new protocol consumers are main bootstrap/session and native supervisor; renderer/server/helper are explicitly excluded; signer, Go launcher precheck/provisioner/writer, validator and untrusted update client have explicit decisions and common vectors. Vocabulary: **Pass**; planned glossary additions belong with implementation. App version observation is not installed-record authority.

## File Responsibility Mapping Verdict
| File / Area | Singular Responsibility | Matches Owner | Retightened | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| build.ts / afterPack.ts | Pass | Pass | N/A | Pass | Target-aware build identity and launcher packing; preserve Mac normalization |
| linux-install/cmd/{launcher,provision,writer}/main.go | Pass | Pass | Pass | Pass | Launcher owns pre-auth acquisition; provisioner/writer retain independent verification |
| linux-install/internal/release/record.go / contract | Pass | Pass | Pass | Pass | Verification/admission contract |
| application/managedUpdateSession.ts | Pass | Pass | Pass | Pass | Quit/restart/cancel lifecycle and confirmed-outcome handback |
| main bootstrap / electronApplication.ts | Pass | Pass | Pass | Pass | Claim session channel and compose capability; no generic renderer IPC |
| internal/launch/supervise_linux.go / cmd/launcher | Pass | Pass | Pass | Pass | Child transport/wait/re-entry at existing native lifecycle boundary |
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
| Managed app.relaunch dispatch and spy-only success assertions | Pass | Pass | Pass | Pass | Replace with R1/current-package successor proof; portable platform paths remain |
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
| Pending stages | Discard or Rebuild | Pass: private disposable candidate, never live | Pass | N/A | Pass | Writer restart reaps orphan stages; no wall-clock expiry added |
| Restart session | Not persisted | Pass: unnamed pair/exit state scoped to one parent-child invocation | Pass | N/A | Pass | Existing profile and refusal record readers unchanged |
| Committed installation identity | New state, no historical migration | Pass: signed same-inode attrs and actual-byte reconciliation | Pass | N/A | Pass | Unsupported filesystem refuses during preflight; no second version file |

## Change / Refactor Safety Verdict
| Area | Sequence Realistic | Temporary Seams Explicit | Cleanup Explicit | Verdict |
| --- | --- | --- | --- | --- |
| Bootstrap -> protected launch | Pass | Pass | Pass | Pass |
| Managed stage -> handback -> fixed re-entry -> observation | Pass | Pass | Pass | Pass |
| SR-015 Linux-only native tests/docs/delivery | Pass | Pass | Pass | Pass |

Selected bootstrap build order is acyclic: writer -> embed writer/templates/key in provisioner -> pin finished provisioner digest in launcher -> AppImage -> signed final-byte record. Refusal/rollback cleanup affects only attempt-owned resources, not prior installations or user data.

## Example Adequacy Verdict
| Topic | Needed | Present/Clear | Avoided Shape | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Immutable authorization | Yes | Pass | Pass | Pass | Parent descriptor, separate tty agent, exact resources/UID |
| First-install signed-record acquisition | Yes | Pass | Pass | Pass | Exact asset name/example, renamed download invariance, bounds and pre-auth refusal |
| Managed lifecycle / R1 | Yes | Pass | Pass | Pass | Explicit/new/old/unknown/ordinary-quit paths; packet-plus-exit, no generic bridge |
| Signed identity/commit | Yes | Pass | Pass | Pass | Byte-format example, first install/two upgrades/refusals, same-inode authority |

## Material Premise Validation
### MP-001 — A correct committed image can fail only in the selected restart context
- Authority / behavior: REQ-005/007, AC-006/008, BEH-004.
- Initiating basis: **User**, actual Settings Install & Restart after a verified update; not a synthetic helper invocation.
- Independent support: exposed product action and API-05b / IMP-31 real packaged UI journey.
- Forward path: Settings -> ManagedUpdateSession stop -> writer ACK for expected 1.5.15 -> canonical Electron relaunch -> old main exit -> actual successor runtime/mount -> EPERM before AppRun. Subsequent ordinary menu opens the identical installed hash with healthy GUI/server and preserved marker.
- Preconditions/consequence: supported Noble AppImage runtime; the selected successor inherits NoNewPrivs while the healthy desktop/AppRun control does not. Correct installation and returned relaunch call do not imply usable successor.
- Reachability: **Reachable**, observed twice per IMP-32; exact native trace in IMP-31. Not generalized to every host/session.
- Response: choose original supervisor's existing ordinary context for fixed re-entry after explicit known-outcome handback and old main exit; never clear NoNewPrivs or change FUSE/AppArmor policy. Proof of that full revised path is still required during implementation/validation.

No additional unsupported premise drives the design. Two-part intent prevents accidental exit from meaning restart; no public command capability or same-user-malware containment promise is inferred.

## Unresolved Approved-Behavior Or Current-State Gaps
**None blocking architecture implementation.** The exact revised transport/re-entry has only a kernel/system-Node primitive witness, not packaged Electron proof. The design selects a concrete mechanism and explicitly assigns real graphical package, cleanup and failure tests; it does not substitute a spy or the independent menu control. API-REV-002 remains failed until independently rerun.

## Review Decision
**Pass — DS-004 / SR-016 is ready for implementation.** The changed dispatch has clear custody, intent, sequencing and cleanup owners. Prior acceptance of the app.relaunch mechanism is superseded by concrete new runtime evidence, not stylistic preference. This is an architecture result, not a claim F-API-02 is fixed in source or acceptance.

## Findings
**None open.** Prior architecture findings remain resolved under the revised DS-004 contract; no new architecture finding is introduced. Downstream F-API-01/02 are not closed by this verdict. The initial Fail and subsequent Pass remain in the cumulative history.

## Classification
**Pass — Large / High**. No active Design Impact, Requirement Gap or Unclear finding. Requirements approval remains SR-012; latest design recovery SR-016; SR-015 validation-method authority retained.

## Recommended Recipient
Implementation Engineer through the primary pass handoff rule; then informational pass notification to Solution Designer. No duplicate forwarding requested from Solution Designer.

## Residual Risks
- **Real package first:** demonstrate FD4 survives actual Electron bootstrap, claim is bounded/nonblocking and no unrelated descriptor is consumed. The local Node22 write/exit witness does not prove Electron42 or packaged GUI behavior. Missing capability must refuse manual restart before stopping/committing, while ordinary quit remains available.
- SO_PASSCRED carries sender credentials per datagram, unlike treating connected-peer identity as the sender. Validate the exact expected ancillary record and truncation/extra-message rejection; close any received unwanted descriptor resources. This supports the design shape, not a test result. See [Linux unix(7)](https://man7.org/linux/man-pages/man7/unix.7.html).
- Current supervisor stops signal handling immediately after wait. DS-004 must retain cancellation through the dispatch decision, not simply append exec after today's signal.Stop. Check requested termination plus unmatched exit/packet, duplicate/foreign messages and packet-write failure; no retry or automatic reopen.
- Re-entry must preserve original-user session/data environment but remove mount/control bindings and use a safe non-mount cwd. The [upstream AppImage runtime](https://raw.githubusercontent.com/AppImage/type2-runtime/main/src/runtime/runtime.c) retains mount-related descriptors and sets runtime environment; it is not evidence of the exact packaged runtime. Do not hardcode its illustrative descriptor number. Verify no stacked supervisors/stale mounts across two upgrades and final ordinary quit in the actual package.
- Parent revalidates only the protected fixed target; writer remains the release-authentication authority. Neither R1 nor successful exec implies new GUI readiness. Main must resolve unknown writer identity and server exit before handback, persist confirmed-old refusal accurately, and never transmit a target/arguments/environment.
- Re-run the continued Settings opt-out/manual-download/manual-restart journey for F-API-01/02 on current full signed packages, direct and installed-menu origins, with spontaneous usable successor, server health, same synthetic work/settings and actual renderer sandbox; no operator reopen counts as success. Also validate old-version recovery, normal quit without reopen, signals and two successive upgrades.
- Repeat affected native x64/ARM64 build/package/smoke using **SR-015 isolated Linux-only route**, not combined desktop workflow or production credentials. Prior API-08b and 22/24/26 scoped evidence are not new-source or ARM graphical proof. API-REV-002's independent channel/repair/transport/fault gaps remain open.
- No new privilege, policy weakening, app-data migration, production-key access, release or publication authorized. The ordinary supervisor context is reused, not modified to bypass a host restriction; refusal remains the result if that context cannot run the canonical package.

## Latest Authoritative Result
- Review Decision: **Pass**.
- Material-Premise Gate: **Pass**.
- Notes: **ARCH-REV-004 / SR-016 / DS-004**, requirements **SR-012**, **Large / High**. Implementation handoff authorized by this review; API-REV-002 remains Fail and delivery/release are not authorized.
