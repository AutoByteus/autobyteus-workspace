# Architecture Design Handoff — Ubuntu AppImage Sandbox Startup

## Result Identity And Status

- **Result:** Architecture Design Complete; awaiting independent architecture review.
- **Stable package ID:** `ubuntu-appimage-sandbox-startup`.
- **Current solution revision:** SR-004; requirements baseline SR-001, user approval SR-002, evidence correction SR-003.
- **Task size / architectural risk:** **Medium / High**. Several packaging/launch files within existing desktop ownership; High because this changes Chromium process-sandbox selection and the shipped AppImage entrypoint on x64/ARM64.
- **Approval:** Approved conditional fallback only. The user explicitly confirmed on 2026-09-24: “i agree for systems user have to use --no sandbox, we provide the default no sandbox, for system like earlier ubuntu they dont even requrie, then user can start normally”. This approves the SR-001 requirements in `requirements-doc.md` without changing their intended behavior. No behavior-defining supplements require approval.
- **Implementation/review state:** No implementation, new AppImage build, independent architecture review, code review, E2E validation or delivery has occurred for this package. Prior architecture-review artifact: **N/A — not applicable**. Prior code-review artifact: **N/A — not applicable**. Product Design artifact: **N/A — not applicable** (no new UI/prototype requested).

## Original Request, Goal And Constraints

The user reported that `AutoByteus_personal_linux-x64-1.4.78.AppImage` needs a `--no-sandbox` switch on their current Ubuntu, unlike Ubuntu 20/22, and asked why and how to fix it. They rejected a solution requiring ordinary users to know or type a flag, were willing to sacrifice the sandbox where needed, then explicitly approved a conditional outcome: automatic no-sandbox launch on systems that require it while capable older systems launch normally.

The approved goal is a no-flag AppImage GUI launch on supported restricted and sandbox-capable hosts, with Chromium isolation retained when usable. Both direct and desktop-integrated entrypaths must converge. Affected-host fallback must be visible and limited to the GUI process; Node-mode/CLI arguments, embedded server, x64/ARM64 AppImage generation, updater metadata and user data remain preserved. Do not change host AppArmor/sysctl settings, unconditionally disable the sandbox for every Linux host, add an installer format, or require a manual flag. A proposal to change any of these intended behaviors needs renewed user approval.

## Workspace, Base And Canonical Artifacts

- **Isolated worktree:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation`.
- **Branch:** `codex/ubuntu-appimage-sandbox-investigation`.
- **Resolved base:** refreshed `origin/personal` at `40b1783f40c072b577ad9d0c5d8fe4f5418c6c38` (reconfirmed 2026-09-24); task HEAD is the same commit. Main/integration checkout was not edited.
- **Finalization target:** `personal` through downstream delivery, subject to review, implementation, executable validation and explicit user verification; no merge, release or tag is authorized merely by this handoff.
- **Approved requirements:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/requirements-doc.md`.
- **Canonical evidence/investigation:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/investigation-notes.md`.
- **Design authority:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/design-spec.md`.
- **Cumulative solution history:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/solution-revision-record.md`.
- **Raw probe supplement (evidence only):** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/evidence/`.
- **This handoff/result file:** `/home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-investigation/tickets/in-progress/ubuntu-appimage-sandbox-startup/architecture-design-handoff.md`.
- **Earlier diagnosis and approval-hold result files:** `analysis-result.md` and `requirements-review-result.md` in the same package directory; historical context only, superseded by the approved requirements and completed design.

## Evidence And Design Decision Summary

On this Ubuntu 26.04 machine, the v1.4.78 AppImage's direct no-flag launch aborts before AutoByteus bootstrap with Chromium sandbox FATAL/exit 133. The FUSE mount is `nosuid`, `chrome-sandbox` is mode 755, and kernel audit records AppArmor's unprivileged-user-namespace `sys_admin` denial. A correctly spelled `--no-sandbox` starts the application and embedded server; the user's `--no-sandobx` spelling was a typo and fails. The automation environment's `ELECTRON_RUN_AS_NODE=1` was explicitly cleared in conclusive GUI probes. Older Ubuntu behavior is user-reported, not locally reproduced.

Additional architecture investigation found that the released embedded `.desktop` file currently uses `Exec=AppRun --no-sandbox %U` unconditionally, while `AppRun` merely forwards arguments. Installed electron-builder 25.1.8 supplies this desktop default even when `executableArgs` is absent/empty, and disallows direct desktop `Exec` override. Thus a fix must correct both desktop and direct entrypaths. The repository already has an `afterPack` hook (currently Mac-only), AppImage-only Linux target, Node-mode embedded server via `process.execPath`, and release jobs for x64/ARM64 and updater metadata.

The design uses the existing `afterPack` seam for an AppImage-only transformation: retain the real Electron ELF under a sibling name and install a thin launcher at the existing executable path. A nonempty private desktop marker overrides builder's unconditional desktop flag, then the launcher strips that marker. The launcher bypasses GUI probing for `ELECTRON_RUN_AS_NODE=1` and honors explicit caller `--no-sandbox`; otherwise it performs a system user-namespace/map probe equivalent to `unshare -Ur true` without AppImage library-path interference. On success it execs the real ELF with unchanged args; on failure it logs a diagnostic and execs the real ELF with a single `--no-sandbox`. Electron main logs the actual disabled-sandbox state. The Mac hook logic is extracted unchanged behind a target-aware dispatcher. Existing AppImage/release/updater paths are extended with artifact and runtime validation; no data migration is needed.

Relevant external sources: [Ubuntu 24.04 unprivileged-namespace restriction](https://github.com/ubuntu/ubuntu-release-notes/blob/main/docs/24.04/index.md#unprivileged-user-namespace-restrictions), [Ubuntu security feature matrix](https://documentation.ubuntu.com/security/security-features/security-features-overview/), [Electron sandbox semantics](https://www.electronjs.org/docs/latest/tutorial/sandbox), [AppImage sandbox troubleshooting](https://docs.appimage.org/user-guide/troubleshooting/electron-sandboxing.html), [electron-builder AppImage documentation](https://www.electron.build/docs/appimage/). Exact repository paths, local commands, logs and builder-version observations are in `investigation-notes.md`.

## Open Risk, Review Focus And Expected Output

**No blocker to independent review**, but packaged behavior is unproven. The most important design risk is that `unshare -Ur true` is an approximation, not a proof of Chromium renderer isolation. A missing probe or unrelated probe failure could cause an unnecessary security downgrade on an exotic host, which may conflict with REQ-002's “only when necessary” boundary. A successful probe might also fail to predict Chromium's actual sandbox ability. The design explicitly prohibits shipping if supported-host validation cannot establish the approved conditional behavior; do not silently broaden to unconditional no-sandbox. The private marker, hook timing, renamed-ELF/`process.execPath` assumptions and updater continuity likewise need independent scrutiny and packaged validation.

The next expected output is an **independent Architecture Reviewer Pass or precise Fail/Blocked finding** against the approved requirements and design. Review whether the probe and missing-tool treatment can satisfy REQ-002/AC-002–003, whether direct and desktop launch truly converge under builder 25.1.8, and whether Node mode, release artifacts and updater contracts are preserved. Implementation Engineer must not start from a reviewer-bypassed assumption; executable validation must include restricted Ubuntu 24/26 and capable Ubuntu 20/22 (or equivalent real hosts), desktop/direct entrypaths, actual Chromium sandbox state, Node-mode server, both architectures and update/relaunch. Any change to intended behavior returns to Solution Designer for renewed user approval.

## Rule-Based Route

`get_handoff_rules` was checked on 2026-09-24. The specific matching rule is **Architecture Design Complete with architectural_risk=High**, explicit current user approval, and an aligned cumulative package. The exact recipient is `/architecture_reviewer`. The Medium/Low direct-implementation rule does not match; the Delivery Completed evidence-gap rule does not match. Notify only `/architecture_reviewer` with this file attached; no parallel implementation handoff is authorized.
