> Historical, superseded. No action requested here. Current basis: approved SR-012 requirements and SR-013 / DS-002 design review.

# SR-006 — Historical Decision Hold (updated status 2026-11-17)

**Superseded for readiness by SR-007:** user requires fully unattended routine upgrades after opt-in, with no recurring administrator prompt or Install click. Requirements are now Draft pending update-path feasibility/authorization and distribution choice. The A/B discussion below is historical; no architecture or package selection was approved. See current requirements-doc.md, investigation-notes.md and solution-revision-record.md.

## Identity And Status
- Package `ubuntu-appimage-sandbox-startup`; Project Task `project_task_1cc6e385-5adf-43b1-b800-d7793933018a`.
- Requested by `/project_task_manager` (`project_task_manager_cc9f793c7e8c4d0ab0f38c5097b48805`).
- **Ready for Approval, not implemented/delivered; no current security/distribution decision approved.**
- Worktree `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup`; branch `fix/ubuntu-appimage-sandbox-startup`; base refreshed origin/personal `1138e8fbefadeb3b30fdb88eb4a5a09beaf372ea`; finalization target origin/personal; no release authorized.

## Request And Goals
User wants ordinary Linux launch without discovering/repeating --no-sandbox, asks how established Electron apps handle this, and authorized team dispatch. Reassess unfinished old work for current release, seek better solution, protect host security and running app/data. Explicit new user decision required for reduced isolation or distribution/support changes.

## Established Evidence
Official v1.5.8-beta.4 (Electron42.4.1) and latest local v1.5.9-beta.3 (current source Electron42.11.16) both trap on clean no-flag AppImage launch on Ubuntu26.04 kernel7.0.0-38. PID-correlated kernel audit shows AppArmor denial inside user namespaces. Latest AppImage mount is nosuid and helper mode0755. Current generated desktop entry still requests no-sandbox unconditionally, a distinct insecure entry surface. Older Ubuntu differences are documented by Ubuntu, not yet reproduced on actual22/24 targets. No new no-sandbox launch or security-setting changes performed. Private probe roots removed; running user app/server untouched.

Old work reached code review Pass but final API/E2E Blocked; actual capable-host isolation, ARM64 and update/relaunch absent. Archived full old ticket and unapplied source patch; no cherry-picks. The old implementation/approval is not silently adopted.

## Comparison And Recommendation
Ubuntu recommends app-specific namespace permission instead of disabling app sandbox. Native installed paths are established practice: VS Code offers DEB/RPM/Snap, portable VS Code documents privileged helper setup; distro AppArmor supplies fixed-path VS Code/Obsidian userns profiles. Flatpak uses dedicated Electron/Zypak integration. New electron-builder v27 describes automatic no-sandbox fallback, but remains alpha and still sacrifices isolation. Current builder25.1.8 does not gain a secure path merely by updating Electron or setting an empty argument list.

**A — Recommended:** add native Ubuntu DEB alongside AppImage, one ordinary installation/admin approval with narrow app permission, then flagless sandboxed launches and supported update/relaunch. Keep portable AppImage on capable hosts; restricted hosts get actionable install guidance, not silent sandbox loss. This changes affected-user success from no-install portability to installed launch. It is NOT a promise that a raw AppImage can override host policy securely. Native install/profile/update/uninstall support is extra scope requiring approval.

**B — AppImage-only convenience:** no-install flagless launch, preserve sandbox when usable, but allow a narrowly gated automatic no-sandbox retry after actual sandbox startup failure. Clearly disclose/diagnose reduced isolation; unrelated errors never downgrade. Security risk includes built-in browsing. Needs explicit new user approval. Reuse old candidate only after current design/review/testing.

Neither option globally weakens AppArmor, runs GUI as root, changes user data, or publishes a release. User may request a different direction; revise requirements if so. No hosted APT service is implied by A; no silent migration of existing AppImage install to DEB is proposed.

## Canonical Artifacts
Ticket root `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup/tickets/in-progress/ubuntu-appimage-sandbox-startup/`:
- `requirements-doc.md`: SR-006 proposed common + A/B behavior and testable ACs; DEC-003 Needs user.
- `investigation-notes.md`: current facts, exact commands/sources, safe probe, alternatives, limits and supplement inventory.
- `solution-revision-record.md`: cumulative SR-001–006, historical approval preserved but not reused.
- `evidence/sr-006/`: reproducible diagnostic and observations.
- `history/2026-09-24/`: old full package and unapplied source candidate patch.
- Current `design-spec.md`: N/A, not authored before approval. Historical one is not current authority.

## Sources
https://discourse.ubuntu.com/t/ubuntu-24-04-lts-noble-numbat-release-notes/39890
https://documentation.ubuntu.com/security/security-features/security-features-overview/
https://www.electronjs.org/docs/latest/tutorial/sandbox
https://code.visualstudio.com/docs/setup/linux
https://code.visualstudio.com/docs/setup/portable
https://gitlab.com/apparmor/apparmor/-/raw/master/profiles/apparmor.d/code
https://docs.flatpak.org/en/latest/electron.html
https://www.electron.build/docs/appimage/
Exact dependency-version sources and all other references are in canonical investigation.

## Remaining Work And Expected Output
After explicit user choice: update approval basis; read architecture gates; investigate/design chosen path, classify actual size/risk and route by rules. Then specialists implement/review/validate and Delivery merges/verifies personal, documents and cleans owned branches/worktrees/processes/caches while preserving old evidence. Ubuntu22 versus default24/26, actual renderer sandbox, native ARM64, Node/args and real staged update/relaunch remain pending. KVM is accessible but VM tools absent; native CI/local feed are feasibility leads, not proof. No prerequisite Task or follow-up established yet. Downloaded beta4 cache `/tmp/autobyteus-sandbox-sr006-download/` retained for follow-on validation; Delivery cleanup obligation.

## Routing State
Routine approval hold stays in Solution Designer's conversation, per skill. **No implementation/review handoff and no completed/blocked Task claim.** Ask user directly for A/B; delegator cannot substitute its preference. `get_handoff_rules` is not invoked as a completion route while requirements work waits for its normal approval decision.
