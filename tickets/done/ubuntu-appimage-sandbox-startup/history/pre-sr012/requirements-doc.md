# Ubuntu AppImage Sandbox Startup — Requirements Document

## Current product direction — SR-011
User explicitly agrees to the protected installed-copy experience presented after SR-010. On affected Ubuntu, ordinary first launch can authorize a fixed, administrator-protected AutoByteus installation using Ubuntu's prompt; subsequent launches use that copy with Chromium isolation, including via the menu or original download. No rule for Downloads, no global bypass, no root GUI. After opt-in, only authenticated AutoByteus upgrades may replace the protected copy without per-version interaction, at a safe lifecycle point. Initial refusal must not downgrade. Preserve the portable path without prompting where sandbox already works. This resolves DEC-003 and the user-facing authorization scope of DEC-007; no separate DEB, privileged generic updater or publication approved. A specific path under /opt is an illustration, not a product decision. User decision recorded; full implementation-ready baseline still awaits technical feasibility for trusted updates. No further user confirmation requested on location.

## Earlier direction — SR-008 (2026-11-18), Draft
User selected the **AppImage-first investigation**, not native distribution or automatic loss of isolation. Target UC-001/002/004: open the AppImage normally with real Chromium renderer protection on affected Ubuntu; after opt-in, update without recurring clicks or elevation. UC-005/SCN-005 is now a candidate one-time scoped AppImage setup rather than a required DEB installation. Refusal must not silently downgrade. AC-001–004 and AC-006/008 must cover this AppImage path if it is adopted. Only a temporary exact-path configuration experiment is authorized. Permanent exception, path trust and updater lifecycle remain unapproved/unproven. No architecture handoff. The earlier A/B branches below are historical alternatives, **not the current selection or an approval request**.

## Prior SR-007 baseline (archived rationale within this document)
- **Status: Draft — SR-007 captures required unattended updates; packaging/update feasibility and security direction remain unresolved. Not implementation-ready.**
- Package: `ubuntu-appimage-sandbox-startup`; current solution revision **SR-007**, 2026-11-17; SR-006 investigation baseline dated 2026-10-24.
- Requested by: `/project_task_manager`, run `project_task_manager_cc9f793c7e8c4d0ab0f38c5097b48805`; Project Task `project_task_1cc6e385-5adf-43b1-b800-d7793933018a`.
- Requirements owner: Solution Designer.
- Authorities read: solution-designer SKILL.md; requirements-engineering.md; finding-the-cause.md; ticket-scope.md; handoff.md and artifact templates; root AGENTS.md/TESTING.md, web AGENTS.md (2026-10-24).
- Approval/reference: **None for resumed solution.** Dispatch approval does not authorize a sandbox downgrade or native distribution change. Historical SR-002 applies only to the old SR-001 baseline, not this reassessment.
- Exact proposed baseline: this SR-007 document, common requirements plus either **Option A** or **Option B** below. Record the user's exact choice and any qualifications before making the chosen branch authoritative.
- Behavior-defining supplements: none. `approval-request-sr006.md` summarizes this decision, not an additional specification. No current Product UI/UX package.

## Problem And Desired Outcome
Ordinary users must not have to discover or repeatedly supply `--no-sandbox` to use AutoByteus on supported Linux hosts. The reported v1.5.8-beta.4 and latest locally available v1.5.9-beta.3 both fail before app startup on current Ubuntu 26.04. The old fix was never fully validated/delivered. Reassess against current code and established distribution practices, keep Chromium sandbox protection where feasible, obtain user approval for any security/distribution trade-off, then validate/merge on personal without publishing a release.

### The User Decision: Two Different Product Outcomes
**A — Recommended, sandbox-preserving installed Ubuntu experience:** add a native Ubuntu DEB package alongside AppImage. One ordinary installation/admin authorization configures the narrowly scoped app permission; daily launches need no special flags and retain Chromium sandboxing. Keep AppImage portable on capable hosts, remove its unconditional desktop sandbox bypass, and give clear install/recovery guidance on restricted hosts rather than silently weakening isolation. **This changes the success path for affected Ubuntu users to installation; it does not promise a no-install AppImage will start sandboxed under restrictive host policy.** Support fully unattended routine upgrades after the user opts into automatic upgrades: repeated administrator prompts or Install clicks do not meet the clarified requirement (REQ-007). The former per-update-authorization proposal is withdrawn. This requires a separately investigated and authorized update path; a signed APT repository with appropriately configured unattended updates or a narrow preauthorized updater are feasibility candidates, not selected architecture. No hosted repository or privileged service is approved by this clarification.

**B — Portable AppImage usability compromise:** preserve zero-install AppImage distribution. Start sandboxed whenever possible; only an actual diagnosed sandbox-initialization failure may cause a bounded automatic reduced-isolation launch. No manual flag needed. Clearly document/diagnose the loss of Chromium sandbox on affected hosts. Unrelated failures must not authorize a downgrade. This is the old idea reconsidered, not a newly approved policy; mechanism and current-version tests still require design/review.

Neither option permits global AppArmor changes, touching real user data, or disabling sandbox for every Linux user. Other user-selected direction will require a revised baseline.

## Relevant Current, Desired And Preserved Behavior
| ID | Kind / scenarios | Evidence-backed current behavior | Desired outcome (proposal) | Preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001 | Direct no-flag current AppImages abort on measured restricted Ubuntu 26.04 | Ordinary no-flag working app/server through A's installed path or B's bounded portable fallback | No global policy weakening; no data loss or impact on running app |
| BEH-002 | User/security; SCN-002 | Earlier Ubuntu startup is reported, not reproduced; actual latest embedded desktop entry unconditionally adds no-sandbox | Both direct and packaged desktop entry retain sandbox when usable; A never auto-downgrades, B only on proven necessity | contextIsolation/nodeIntegration preferences, external-browser isolation where usable |
| BEH-003 | Operational; SCN-003 | Real packaged Node/server uses process.execPath; explicit argv supported | No GUI-only decision corrupts Node execution, args, exit or signal handling | Embedded-server identity/lifecycle and intentional caller arguments |
| BEH-004 | System; SCN-004 | AppImage x64/ARM64 build, metadata and update/relaunch supported | Preserve AppImage lifecycle; A additionally has verified native-package update/install/relaunch | Channels/settings/data continuity, Mac/Windows unaffected |
| BEH-005 | User/operational; SCN-005 | No AutoByteus DEB installation path currently | A only: one deliberate installation, scoped permission, actionable failure/refusal, clean removal of owned installation configuration | No broad temporary-path allowance or unrelated package/policy changes |

Evidence: `investigation-notes.md`, current raw evidence `evidence/sr-006/`; historical paths explicitly separated there.

## Actors
- Ordinary Linux user: working GUI and server, no hidden terminal workaround.
- Security-conscious user/admin: explicit permissions/trade-offs; no false isolation claims.
- Existing user receiving update: retained data/settings, functional relaunch.
- Release/validation operators: reproducible architectures, host matrix and truthful coverage; no publication in this Task.

## Scope Guardrail
### In-Scope Use Cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Normal launch on sandbox-capable Linux, direct and packaged desktop entry | SCN-002 |
| UC-002 | Usable launch/recovery on affected newer Ubuntu under selected A/B behavior | SCN-001 |
| UC-003 | Supported Node/server/CLI modes and explicit arguments | SCN-003 |
| UC-004 | Packaging, updater/relaunch, relevant docs and repository finalization | SCN-004 |
| UC-005 | A only, if approved: native installation/permissions/refusal/uninstall | SCN-005 |

### Out Of Scope
- No beta/stable release, publishing, release tags, or production deployment.
- No global AppArmor/sysctl disablement, broad AppImage temporary-mount allowlist, app running as root, or automatic privileged host repair.
- No unrelated renderer/browser, agent runtime, data schema, Mac/Windows behavior or provider changes.
- No Snap/Flatpak/RPM/store support, general packaging-tool upgrade, new hosted package repository or new OS/architecture support promise by implication.
- No requirement to salvage the old implementation or retain its architecture. Old code is evidence/candidate only.
- Native-package support and any automatic sandbox loss are out of approved scope until DEC-003 is explicitly decided.

### Non-Goals
No claim that Chromium's renderer sandbox isolates all AutoByteus agent/main/server activity. No universal Linux compatibility guarantee. No claim of full security from sandbox flags/preferences alone. Do not require users to change security settings manually as the ordinary product journey.

### Preserved Boundary
BEH-002–004; REQ-002–005. Zero data loss/reset, preserve existing data-root identity and updater preferences. Existing user-created shortcuts with an explicit flag are not silently rewritten; newly generated package desktop entries are in scope. Diagnostic tests must not touch running user app/data.

### Prerequisites
None established in other functionality. Missing actual host/architecture evidence remains a required validation activity, not a presumed product prerequisite; tooling/VM/CI feasibility must be explored before calling it unavailable. If safe external provision later proves necessary, identify it truthfully rather than waiving ACs.

### Review Authority
Blocking design/implementation findings must trace to approved REQ/AC/BEH IDs. New behavior, threat model, host privilege policy, support promise, migration obligation or operational contract is a Requirement Gap requiring renewed approval. A reviewer cannot silently amend this scope. Out-of-scope findings become follow-ups unless they actually block safe delivery as an outside-functionality prerequisite.

## Requirements
| ID | Requirement | Behavior | Criticality / basis |
| --- | --- | --- | --- |
| REQ-001 | Users on the selected supported Ubuntu path launch ordinarily with no sandbox CLI knowledge: A after one native installation; B directly from portable AppImage | BEH-001/005 | Must; user outcome, DEC-003 pending |
| REQ-002 | Retain actual Chromium sandbox wherever usable, including both direct/desktop entry. A forbids automatic sandbox loss. B permits only confirmed sandbox-start failure, never a failed generic probe alone or unrelated crash | BEH-001/002 | Must; explicit security decision pending |
| REQ-003 | No global security weakening. Security behavior is accurate in user guidance and diagnostics. A's scoped install permission is transparent and reversible; B's downgrade is disclosed. Failures/refusal have useful recovery, not hidden retry loops | BEH-001/005 | Must; Task constraints, DEC-003 |
| REQ-004 | Preserve supported Node/CLI/explicit args, embedded server startup, signals and exit behavior; no GUI flag injected in Node mode | BEH-003 | Must; actual current process lifecycle |
| REQ-005 | Preserve x64/ARM64 AppImage artifact/metadata and update/relaunch behavior; A adds corresponding native install/update verification. Keep channels, settings and data intact; no production publication | BEH-004 | Must; existing contracts and Task Done when |
| REQ-007 | After opt-in to automatic upgrades, routine updates must download and install without per-update clicks or administrator prompts. Activate the new version safely without disrupting active work or losing data; retain opt-out. One-time setup authorization and its scope remain to be agreed. This outcome is required by the user; the DEB implementation is Unclear pending feasibility proof | BEH-004 | Must; user clarification 2026-11-17, DEC-007 |
| REQ-006 | Final evidence distinguishes source/mock/runtime and exact OS/arch/versions; verify integration on personal, preserve old useful work and clean owned resources via Delivery | All | Must; Task finalization and evidence constraints |

## Acceptance Criteria
| ID | REQ / behavior / scenario | Preconditions / trigger | Observable outcome | Alternate/error and verification |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001; BEH-001/005; SCN-001/005 | Default restricted Ubuntu 24.04 and current affected Ubuntu 26.04, selected package and ordinary launch | GUI and embedded server ready with no manual sandbox flag; A after approved installation, B from portable file | Real packaged execution in isolated targets; install refusal under A leaves clear guidance/no silent downgrade; unrelated failure remains an error |
| AC-002 | REQ-002; BEH-002; SCN-002 | Ubuntu 22.04 sandbox-capable host; both direct and desktop entry, plus A installed path on newer Ubuntu | Actual renderer/process isolation confirmed; no automatic flag bypass | Read real sandbox/process state, not stub output, no-flag absence or BrowserWindow prefs alone |
| AC-003 | REQ-002/003; BEH-001/002; SCN-001/002 | Restricted/unknown capability and unrelated startup error cases | A never retries unsandboxed; B retries only confirmed sandbox-initialization failure, bounded and diagnosable, preserving healthy/capable launch | Unknown/failed generic probe or unrelated fatal cannot itself authorize downgrade; current real-package evidence plus focused regression checks |
| AC-004 | REQ-003; BEH-001/005; SCN-001/005 | Install/run/quit/update/remove as applicable | Four relevant global settings unchanged; no broad policy bypass. A modifies only explicitly approved application-owned install/profile resources with normal user authorization and cleans them on removal | Before/after settings/resources; ordinary nonroot user can launch; refused/cancelled permission does not silently downgrade or disrupt unrelated apps |
| AC-005 | REQ-004; BEH-003; SCN-003 | Real packaged Node execution, arguments and shutdown | Correct Node result/server startup, preserved args/status/signals, no leaked owned process | Both supported architecture artifacts proportionately; negative/failure checks distinct from sandbox proof |
| AC-006 | REQ-005; BEH-004; SCN-004 | Native x64/ARM64 builds; old-to-new isolated update/install/relaunch | Correct architecture/artifact/metadata, same-format update reaches working newer app with synthetic data/settings preserved; no production release | Local staged feed permitted; initial-setup authorization/cancellation for A, not a per-update prompt in automatic mode; no claim from metadata alone; no silent AppImage-to-DEB migration |
| AC-008 | REQ-007; BEH-004; SCN-004 | User has enabled automatic upgrades and completed any separately approved setup; publish successive newer versions to an isolated test feed | Updates install and activate at a safe lifecycle point without update clicks/admin prompts; active work and data preserved; opting out stops future automatic upgrades | Actual standard-user/native-package test with no pre-cached administrator credentials; verify failures do not bypass security or falsely report success. No silent system-wide authorization |
| AC-007 | REQ-006; all | Delivery finalization | Implementation and relevant docs integrated and verified on personal; old valuable evidence retained; owned worktrees/branches/process/cache finalized with receipt; no unauthorized release | Any missing required host/architecture/runtime proof remains explicit and blocks an unconditional Done claim; only user can change support/success scope |

## Relevant Scenarios And Journeys
| ID | Kind / actor / goal | Trigger / start and product-level sequence | Expected and supported alternate | Validity / basis | Links |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User wants AutoByteus on restricted Ubuntu | Opens distributed app; current package aborts; target A guides native installation then launch, target B portable launch adapts only to sandbox failure | Working GUI/server without flag; no masked unrelated failure | Supported Normal Scenario; request + two current reproductions; selected target pending | UC-002; REQ-001–003; AC-001/003/004 |
| SCN-002 | User/security contract: safe ordinary launch | Opens AppImage or integrated shortcut on capable host; app opens with real sandbox | Both entry surfaces preserve protection; no implicit desktop downgrade | Supported Normal Scenario; user comparison, release contract, actual desktop evidence; runtime Ubuntu22 proof pending | UC-001; REQ-002; AC-002/003 |
| SCN-003 | System/tooling invokes Node/server or explicit argv | Caller starts packaged runtime in supported mode; receives result; normal close/termination | Embedded server, args/status/lifecycle unchanged; invalid caller args remain errors | Supported Explicit Edge Scenario; source current LinuxServerManager and release smoke contract | UC-003; REQ-004; AC-005 |
| SCN-004 | System/user: download update and restart | After user opt-in, app/system checks approved channel, downloads test newer artifact and installs without per-update interaction; activates at a safe point, retaining synthetic state | Working newer same-format package; refusal/failure not false success | Supported Normal Scenario; current updater/UI/workflow contract | UC-004; REQ-005/006; AC-006/007 |
| SCN-005 | Proposed user/admin: initial native installation, then launch/removal | A only: intentionally installs native package, authorizes scoped setup, launches without flags; later updates/removes | Scoped permission and sandboxed launch; denied install explains recovery, no global relaxation | Proposed Supported Normal Scenario; new product path needing DEC-003, not currently approved | UC-005; REQ-001/003/005; AC-001/004/006 |
| SCN-006 | Diagnostic-only premise | Rename arbitrary executable into wildcard /tmp AppImage path, flip global security, run app as root | Not a supported product journey | Technically Possible but Unsupported/Contrived; excluded by security constraints | Excluded |

## UI, Quality And Data
- Interaction applicable: plain actionable launch/setup error and truthful security diagnostics; not a renderer visual redesign. A's exact recovery surface remains design input after approval. B's diagnostic must be visible in retained logs and documentation; no recurring consent popup is proposed by B.
- Product UI/UX links/repository/screenshots/approval: N/A — user has not requested Product design work.
- QR-001 security: REQ-002/003, AC-002–004; real sandbox and scope of privilege, not inferred from launch success.
- QR-002 usability/reliability: REQ-001/004, AC-001/003/005; no user-discovered flag, no retry loops, no Node regressions.
- QR-003 compatibility/operability: REQ-005/006, AC-006/007; actual artifacts/lifecycle and honest matrix.
- Persisted app data/schema: no migration proposed or authorized. Preserve user-data root, settings/channels, browser/session state and server data; acceptable loss/reset **none**. New native installer-owned configuration is conditional A state, reversible without removing user data. Volume-dependent migration N/A. Only synthesized data in tests, never copy real user data.

## External Contracts And Supplements
Ubuntu namespace restrictions and app-specific permission; Electron global flag semantics; builder 25.1.8 AppImage desktop default; updater 6.8.9 package identity/update behavior; current release CI and TESTING.md. Exact versions, sources and uncertainties in `investigation-notes.md`.
Supplements: current diagnosis logs/probe (evidence only); historical ticket/source patch (not approval); `approval-request-sr006.md` decision summary. No behavior-defining UI supplement.

## Decisions
| ID | Question | Reasoning and recommendation | Owner | State |
| --- | --- | --- | --- | --- |
| DEC-001 | Historical conditional fallback approval | Preserve original SR-002 verbatim in history, do not reuse as current authorization | Historical user | Historical only, superseded for resumed decision |
| DEC-002 | Historical exclusion of installed package | Reopened because current Task explicitly asks for better solution and distribution comparison | User | Historical exclusion not binding on new proposal |
| DEC-003 | Secure installed Ubuntu path A or zero-install conditional fallback B? | Current portable artifact cannot override denied namespaces and has no usable setuid fallback. Mainstream native install + app-specific permission can retain Chromium protection; remote browser makes disabling it material. **Recommend A**, with one standard install and new packaging/update responsibility. Choose B only if no-install portability outweighs that protection | **User** | **Needs user** |
| DEC-004 | Adopt old patch / upgrade builder to alpha? | Old code is stale/unvalidated; v27 remains alpha and still falls back without isolation. Start from fresh personal, reuse evidence/tests selectively; no alpha upgrade assumed | Solution Designer, within direction | Decided |
| DEC-005 | Release/testing/data boundaries | No release requested. Use current-source isolated tests, native architectures and representative OS policy, staged local update feed; keep unproved cells explicit | Solution Designer, within direction | Decided |
| DEC-007 | Does automatic upgrade mean no recurring user/admin involvement? | User explicitly rejected assisted installation and clarified fully automatic upgrades after opt-in. Accept that intended outcome; do not reinterpret it as automatic checking. DEB privilege mechanism, one-time setup acceptance, hosting and safe activation still need investigation and any material user decisions | User (outcome); Solution Designer (feasibility) | Outcome confirmed; mechanism/scope unapproved |
| DEC-006 | Ubuntu/architecture evidence target | Preserve requested 22.04 versus affected 24.04/26.04 comparison and existing x64/ARM64 scope. Do not add Ubuntu20 or new architectures from old ticket language | Solution Designer, within direction | Decided |

## Assumptions, Traceability And Architecture Input
Assumptions: native-package approach is feasible from actual dependencies, not runtime-proven; old-to-new local feed now supported but journey untested; no host-matrix availability promise. Owners: Solution Designer for feasibility, API/E2E for definitive executable evidence. No silent fallback assumptions.

REQ-001 → UC-002/005, BEH-001/005, SCN-001/005, AC-001.
REQ-002 → UC-001/002, BEH-001/002, SCN-001/002, AC-002/003.
REQ-003 → UC-002/005, BEH-001/005, SCN-001/005, AC-003/004.
REQ-004 → UC-003, BEH-003, SCN-003, AC-005.
REQ-005 → UC-004/005, BEH-004/005, SCN-004/005, AC-006.
REQ-006 → all in-scope UCs/behaviors/scenarios, AC-007.
REQ-007 → UC-004, BEH-004, SCN-004, AC-008.

Architecture must start only after DEC-003 selection and approval recorded. Map approved launch/install/update paths through real dependencies; resolve package desktop default, actual capability/failure checks, Node executable identity, profile trust/lifecycle for A, update metadata and native test strategy. Mechanism/modules, dependency choice and refactor scope are deferred; no authoritative design exists in current root. Completed design size/risk not yet classified; historical Medium/High is not automatically reused.

## Readiness Gate
- Problem/current facts, desired/preserved outcomes, scope, testable linked requirements and scenarios: Yes, with explicit A/B selection pending.
- Current OS/version causation evidence: Yes on measured Ubuntu26; broader matrix is an explicit validation obligation, not claimed success.
- UI/Product normative supplements: N/A. Evidence integrated: Yes.
- Data/privilege/compatibility constraints and material decisions: explicit.
- **Content ready for approval: No — SR-007 unattended-update feasibility and authorization scope must be resolved; earlier A/B comparison is no longer a sufficient basis.**
- **Approval recorded / exact approved baseline / ready for architecture: No.**
- Remaining approval blockers: DEC-003 and unattended-update feasibility/authorization details under DEC-007. Routine approval hold in this conversation, not a team handoff or completed Task.

## SR-007 Clarification Authority
User 2026-11-17: “if it asks user to admin permission then user still have to get involved. i meant when user opt for automatic upgrade”. This establishes the required outcome, not approval to deploy an APT repository, install a privileged service, change host policy or select DEB. Updated skill SKILL.md and requirements-engineering.md re-read; saved Task autobyteus-5 read in full, still IN_PROGRESS with no new comments. October runtime/source evidence has not been refreshed against November product releases. No architecture or source implementation is authorized.

SR-009 feasibility update (evidence only, no change of intent): exact-path AppImage configuration worked in this one Ubuntu 26 x64 experiment, including sandboxed renderer evidence after same-path replacement. Not proof of safe permanent configuration or unattended upgrades. SR-008 Draft remains unapproved.

## SR-010 — First-run authorization confirmed; persistent trust boundary open
Current authority, superseding previous uncertainty about accepting one-time setup: first ordinary launch of the AppImage on affected Ubuntu, including from a terminal, may invoke Ubuntu's own authentication prompt for narrowly scoped setup. Thereafter direct/desktop launches and opted-in routine updates need neither flag nor repeated approval. On capable hosts do not request unnecessary privilege. If authorization is declined, explain recovery, leave the host unchanged and do not silently run unsandboxed. No application collection/storage of passwords. This is user direction for UC-001/002/004/005, REQ-001/002/003/005/007; not authority for a generic privileged updater. AC-001/004/008 include first-launch consent, cancellation and prompt-free subsequent launches and updates. Require a choice before trading publisher identity for user-writable pathname trust or extending release operations to a protected installation and authenticated updates. Status Draft pending that boundary and feasibility; no release.
