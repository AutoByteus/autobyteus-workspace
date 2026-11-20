# Code review — managed Ubuntu desktop icon

**CRR-001: Pass for independent API/E2E validation.** Canonical launch now owns publication of the branded menu entry. Older downloads can still redirect, the installed desktop ID is unchanged, and only a verified managed Electron instance sets that ID for its windows. **The preview establishes the artwork, not the identity of a running packaged window.** That distinction is the principal remaining acceptance gate.

## Review basis

Initial **Full Review**, 2026-11-20. **Medium / High confirmed**: few production files but an externally consumed desktop ID, persistent per-user files and interaction with already released launchers. Reviewed product `960fb46ad03aa4a7eba4b6380546f1c167b6c23b`, received HEAD `a819c4c71277900388fa2916db8e743269dc7eca`, base `b072d93d8e`, `fix/managed-desktop-icon` → final target `personal`. No prior findings, API-REV or DR.

Authorities: approved SR-001 requirements and investigation, solution revision history, DS-001.1 design and architecture handoff/review/history (ARCH-REV-001 Pass), IR-001 implementation handoff and history; no separate UI supplement. Applied project DESIGN/TESTING, root and web AGENTS, shared design principles and ticket scope. Reviewed all changed product files and tests, old generator template and order, current managed detector, application composition/window creation, packaged-asset evidence, documentation and IMP-01–05. No reviewer code/test change, duplicate suite run, release operation or host desktop access.

## Approved scenarios and actual paths

| Scenario and independent trigger | Actual production path and verdict |
| --- | --- |
| 001 — user enrolls, then finds and starts the app after quit | Authorized setup → recheck Managed → exec canonical image → EnsureMenu → supervised desktop. Source icon is relative to the running AppRun executable; stable PNG and escaped absolute Icon field live outside the mount. No new identity from the download name or APPDIR. Source confirmed; actual post-quit activation still required. |
| 002 — user opens the app via menu or terminal/redirect; additional windows must group with it | Packaged + verified Linux managed detector → ElectronApplication constructor sets `autobyteus-managed.desktop` → application.start/whenReady → primary and later windows. Detector retains UID, filesystem and kernel attachment checks. No global product name, profile, default BrowserWindow artwork or portable/Mac/Windows change. Source confirmed; Shell.WindowTracker attribution is not yet proved. |
| 003 — existing user upgrades, retains a favorite and reopens an older download | New launcher redirects before EnsureMenu. Old source still creates/expects the exact flat generic file before redirecting. Fixed canonical launcher accepts that exact old template, publishes the icon and nested entry, then retires the flat file. `applications/autobyteus/managed.desktop` still maps to `autobyteus-managed.desktop`. IMP-03/04 support the transition; full signed upgrade and old-download route still needed. |
| 004 — repeat, partial owned state, collision or documented uninstall | Inspect known user-local files before publication; exact regular, user-owned bytes distinguish known state. Unchanged matches return without inode churn. Refusal leaves foreign files in place. A menu error logs without turning a healthy launch into setup or refusing supervision. Only successful authorized removal invokes cleanup of individually recognized paths; it never uses Icon/Exec read out of a desktop file as a deletion target. |
| 005 — delivery | Guide updated for persistent artwork, new path and preserved ID. Integration, cleanup and checkout sync belong to Delivery; no new public release or user-install edits authorized. |

## Candidate and mechanism checks

- **Use: bounded migration, not permanent dual registration.** Existing favorite/old-download launch are explicitly approved and observed. Compared the old template in the base `managed_linux.go` with `desktopMenu`: Exec, literal %U, generic Icon, UID and remaining fields agree. Changing the old file in-place would make that released generator reject it. Publishing a nested same-ID entry before retiring the old representation preserves the usable shortcut; an interrupted transition can be reconciled on a later canonical launch. The current launcher never authors a new flat file. No new app state version or favorites rewrite.
- **Use: exact-resource checks and non-clobber publication.** SCN-004 supports customized/unrecognized paths. `menu_file_linux.go` traverses managed subdirectories with no-follow directory descriptors, checks the named file and opened inode, regular type, UID, size and bytes. Publication writes a temp inode and links it only into an absent destination; EEXIST is rechecked rather than overwritten. Removal checks the known content first, and pruning is limited to an empty matching private directory after removing its resource. Shared applications root and unrelated siblings are not pruned. This is ordinary desktop-file ownership handling, not a security claim against concurrent hostile same-UID filesystem mutation.
- **Use: failure preserves launch.** IMP-04 separately exercises an unusable packaged icon: canonical AppRun reports the error, original flat entry remains and supervision receives the original arguments. No fallback to a generic replacement or another authorization.
- **Reject: global icon-theme rebuild, forced shell restart, app sleep or favorite migration.** No approved scenario requires those mechanisms. IMP-03 before/after captures show the generic blue tile becoming the shipped blue/green artwork in both search and the existing favorite after ordinary refresh; a transient stale result was observed. Neither a desktop filename nor that visual change proves a running window is attached to the favorite.
- No additional material premise, conflicting requirement, held candidate or promoted source defect. Prior architecture premises about same-ID lookup and old-launcher behavior remain bounded to their evidence.

## Structural/design checks

| Checks | Result / evidence |
| --- | --- |
| Design health, supplemental alignment, spine clarity | Pass. Native routing/registration, Electron window identity and authorized removal are separate paths. No privilege/trust redesign. Existing art reused. |
| Ownership, off-spine concerns, reusable structures | Pass. Managed/verifiedImage still owns protected-path admission. Menu policy owns known paths/templates, file operations own comparison/publication. Electron uses the existing managed decision rather than inspecting desktop files. |
| Existing capability reuse and model tightness | Pass. Same packaged PNG, same canonical Exec, same %U and desktop ID. UID marker alone is not trusted. No registry of previously installed versions. |
| Coordination / empty layers | Pass. Single EnsureMenu call on canonical GUI startup; explicit RemoveMenu after authorization. No extra service, second launch owner or desktop-index manager. |
| Separation, placement and dependency visibility | Pass. User-local operations separated from verifier in existing Linux launch package. Only real executable directory and install paths enter the policy; renderer and privileged writer are not involved. |
| Authoritative boundaries and interfaces | Pass. Node bypass precedes GUI routing; noncanonical exec retains args. Art path is not selected by env/child args. Desktop ID set only after managed verification, before window creation. |
| Partitioning, naming and duplication | Pass. Two focused Go files; legacy bytes limited to ownership classification. Go's desktop ID contract and Electron's same literal are backed by boundary tests/evidence, not a reason to introduce a cross-language service. |
| Patch layering, dead code and compatibility | Pass. Old Menu implementation removed; retaining recognition of exact predecessor bytes is necessary for a supported installed resource, not a permanent alternate active identity. No user DB migration. |
| Test intent, fixtures and staleness | Pass. Temp-home tests cover partial/matching/edited files, symlinks, nonregular destinations, escaped paths, repeated and concurrent publication. Executable redirect control and managed/unmanaged Electron construction distinguish routing from window matching. No stale test requirement identified. |
| API/E2E readiness | Pass at source level. Current local package, predecessor information and explicit live Shell acceptance criteria are available; no source failure requires return to implementation. |

**Source size (nonempty, base → product):** electronApplication.ts 479→480, cmd/launcher/main.go 119→119, managed_linux.go 99→49, menu_linux.go 0→77, menu_file_linux.go 0→189. No >500 file or >220 delta; tests excluded. Cleanup/docs: `autobyteus-web/docs/linux-managed-desktop.md` documents new location/ID and ownership behavior. No unrelated cleanup or follow-up.

## Evidence and limits

IR-001's Go race-enabled module run passed, Electron checks 33/33, both typechecks at existing accepted baselines. Fresh frozen personal x64 build produced the signed disposable test fixture; IMP-05 checks the actual PNG and asar wiring. IMP-03 is isolated Ubuntu 26 GNOME Shell + Dock with a native resource owner and an inert executable; IMP-04 uses original/current launcher code and a stand-in child/target. These support file ordering, artwork, natural indexing, argument preservation and nonfatal presentation failure. They **do not establish packaged install/upgrade, secondary-window grouping, X11/Wayland window identity, or uninstall in the real shell**.

## Scorecard

| Priority | Category | /10 | Rationale |
| --- | --- | ---: | --- |
| 1 | Data-flow spine clarity | 9.5 | Verify/redirect before ensure; publish before retiring; authorize before cleanup. |
| 2 | Ownership / encapsulation | 9.4 | User-local registration distinct from protected installation and window production. |
| 3 | API / interface clarity | 9.3 | Fixed known paths, exact UID template and stable desktop ID. |
| 4 | Separation and placement | 9.4 | Native resource policy and file mechanics live with their actual caller. |
| 5 | Shared model and reuse | 9.4 | Existing canonical path, application ID and packaged artwork retained. |
| 6 | Naming / readability | 9.2 | Ensure, remove, match and publish have distinct effects. |
| 7 | API/E2E readiness | 9.3 | Disposable fixtures and explicit independent Shell checks; precursor visuals accurately bounded. |
| 8 | Runtime fidelity | 9.3 | Source paths and tested resource transition match design; live window association remains an execution criterion. |
| 9 | No legacy retention | 9.5 | Only necessary old-file recognition, no dual permanent launcher or theme override. |
| 10 | Cleanup completeness | 9.3 | Exact resource cleanup and owned fixture ledger; no host-state changes. |

**Overall 9.4/10; Pass.** Scenario and material-premise gates pass; no open findings or follow-ups. Next owner **/api_e2e_engineer**. Independently exercise baseline and new genuine test-signed packages in disposable Ubuntu GNOME + Ubuntu Dock: fresh install, signed upgrade/first corrected canonical startup, older-download redirect, existing favorite, menu and terminal launches, post-quit/unmount icon and restart, repeat and secondary windows, no duplicates or reenrollment, successful/canceled uninstall and preservation of foreign files/work. Record actual **Shell.WindowTracker desktop IDs** and dock artwork on native Wayland and X11 or XWayland. Do not substitute the existing preview, GIO lookup, Openbox or a mock for those checks. No production key, user session/favorites edits, public release or deployment.
