# Design Review Report

## Review Round Meta

- Upstream Requirements Doc: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/requirements-doc.md` (Approved, SR-009 basis; artifact repaired SR-010)
- Upstream Investigation Notes: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/investigation-notes.md`
- Upstream Solution Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/solution-revision-record.md`
- Reviewed Design Spec: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-spec.md` (SR-009 design; SR-010 guidance additions)
- Supplemental Task Artifacts Reviewed: `evidence/probe-0{1,2,3}*.png`, `evidence/screencast_probe.py` (evidence only)
- Relevant Solution Revision IDs: SR-006, SR-007, SR-008, SR-009, SR-010
- Architecture Review Revision Record: `/Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/architecture-review-revision-record.md`
- Current Architecture Review Revision ID: `ARCH-REV-005`
- Current Review Round: 3
- Trigger (round 3): SR-010 repair of ARCH-DR-004 (requirements rows AC-003/007/014, SCN-004/005, UC-006, status lines) plus design Guidance carrying ARCH-REV-002 residuals; no structural design change. Round-2 trigger: Revised `Architecture Design Complete` from `/solution_designer` (SR-009), responding to ARCH-REV-001 and widening scope (helper and recording moved into browser-automation; `import-package` withdrawn; lifecycle reduced to `start | list | stop | restart`)
- Prior Review Round Reviewed: Round 2 / ARCH-REV-002 (Fail — ARCH-DR-004); Round 1 / ARCH-REV-001 (Fail — ARCH-DR-001..003)
- Latest Authoritative Round: 5
- Round-5 trigger: SR-012 — ARCH-DR-005 resolved with option (b) (packed AppImage detected by type-2 magic `AI\x02` at offset 8 or `.AppImage` suffix, without execution → `APPIMAGE_EXTRACTION_REQUIRED`, exit 2, exact extract + `--app <squashfs-root>/<executable>` recovery; the extracted layout goes through the normal marker gate; the marker sits in the AppImage `resources/` via the same `extraResources` entry; tests + guide/troubleshooting). ARCH-DR-006 resolved (`requirements-doc.md:181` ASM-001 and `design-spec.md:489` Guidance aligned; the only remaining `1.4.53` text, `design-spec.md:409`, is the removal instruction).
- Round-4 trigger: SR-011 — implementation Design Impact IMP-DI-001 (installed pre-change apps not isolated) resolved by an isolated-launch capability marker + lifecycle fail-closed gate (design-spec §Implementation Design Impact Resolution); REQ-002 scope note; AC-001 alternate. Round-4 evidence: `implementation-handoff.md` IMP-DI-001 (worktree build isolated from an unscrubbed agent shell; installed 1.4.91-beta.4 not), `autobyteus-web/build/scripts/build.ts` (Linux target is `AppImage` only, lines 299-300/386/394/465; `extraResources` line 239), `scripts/electron-launch/appExecutable.mjs` (accepts any explicit executable file; Linux has no installed default; worktree discovery matches `linux*-unpacked/`), `docs/isolated-app-instances.md:85` (Linux: pass `--app`).
- Current-State Evidence Basis: Round-1 workspace evidence still applies (unchanged code @ `e6c16d801`). New mcps evidence @ `f11098c`: `runtime/session.py` (`tab_id` = CDP `targetId`, stable across connections; `session()` = ensure endpoint → `connect_over_cdp` → `contexts[0]` → yield → stop Playwright client only), `application.py:322-360` (`run_script` = validate → normalize → session → `resolve_page` → `page.evaluate` → strict JSON), `policy.py` (`ArtifactPolicy`: workspace-relative only, `BROWSER_AUTOMATION_WORKSPACE` or cwd, temp sibling + atomic no-overwrite commit), `runtime/chrome_launcher.py:106-108` (per-user runtime dir), `mcp/tools/run_script.py`; `evidence/screencast_probe.py` (Python Playwright `connect_over_cdp` + `new_cdp_session` + `Page.startScreencast` with ack, which is the same mechanism the worker uses); renderer native dialogs (`window.confirm/alert` in `NodeManager.vue:328`, `PhoneAccessCard.vue:264/269`, `ServerLoading.vue:125`).

## Routing Classification Review

- Task size: `Large`
- Architectural risk: `High`
- Classification rationale reviewed: unchanged security boundary plus a new public MCP surface (+2 tools) and a new detached worker role in a separately released repo. Confirmed.
- Independent Architecture Review required by the classification: `Yes`
- Classification evidence or correction required: None

## Upstream Behavior And Production-Path Basis Confirmation

- Overall Basis Status: `Confirmed` (round 3: AC-007, AC-014, SCN-004, SCN-005 restored and consistent with REQ-008/REQ-015 and the design; AC-003 alternate no longer claims lifecycle-owned recording cleanup, consistent with the SR-009 boundary and REQ-008 self-finalization)
- Approved requirements / intended behavior understood: Yes. REQ-006/007: the helper is built into `run_script` and auto-installed on use. REQ-008: exactly two MCP tools (`start_recording`/`stop_recording`) plus CLI equivalents; recording runs in the background; the MP4 path comes from the existing artifact policy; recording finalizes itself on target loss; existing tools are unchanged. REQ-012 is withdrawn. AC-003 has a dead-process alternate.
- Relevant existing behavior and evidence confirmed: Yes (see evidence basis).
- Scope guardrail confirmed: Yes. UC-004 now includes "any browser page". Non-goals: no tools beyond the two recording tools; no change to connect–operate–disconnect for existing tools; no lifecycle import.
- Approved change, preserved behavior, and outside scope understood: Yes
- Every prospective blocking `Design Impact` finding is traceable: `Yes` (no blocking Design Impact finding this round)
- Remaining material ambiguity: None

| Behavior ID | Kind | Design Alignment With Approved Intent | Approved Trigger / Contract And Current-State Evidence | Target Outcome / Path / Spine Coherence | Status | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | Operational | Pass | Pass | Pass (DS-001/002; dead-process branch defined) | Confirmed | — |
| BEH-002 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-003 | Operational | Pass | Pass (AC-014 restored, SCN-005 updated) | Pass (DS-003; importer + `restart`) | Confirmed | — |
| BEH-004 | User | Pass | Pass | Pass (DS-004) | Confirmed | — |
| BEH-005 | Operational | Pass (REQ-006 re-approved; design matches) | Pass | Pass (DS-005) | Confirmed | — |
| BEH-006 | Operational | Pass | Pass (AC-007 restored: MP4 at resolved workspace path, other tools unaffected, `RECORDING_NOT_ACTIVE`/`RECORDING_ALREADY_ACTIVE`/target-loss/ffmpeg alternates; SCN-004 updated) | Pass (DS-006/DS-007) | Confirmed | — |
| BEH-007 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-008 | Operational | Pass | Pass | Pass | Confirmed | — |
| BEH-009 | Operational | Pass | Pass (UC-006 fixed) | Pass (per-tool skills) | Confirmed | — |

## Supplemental Artifact Coherence Verdict

| Artifact | Purpose And Scope Are Clear? | Linked To Relevant Core Artifacts? | Internally Complete? | Consistent With Related Core Artifacts? | Status And Approval Applicability Are Clear? | Required Action |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/probe-0{1,2,3}*.png` | Pass | Pass | Pass | Pass | Pass | None |
| `evidence/screencast_probe.py` | Pass | Pass | Pass | Pass (design states the worker uses the same Playwright CDP screencast path) | Pass | None |

## Task Design Health Assessment Verdict

| Assessment Area | Result | Evidence | Required Action |
| --- | --- | --- | --- |
| Assessment is present | Pass | design-spec §Task Design Health Assessment | — |
| Root-cause classification explicit and evidence-backed | Pass | Unchanged from round 1 (verified); adds responsibility-based placement (lifecycle vs page actions) | — |
| Refactor decision explicit | Pass | Refactor now | — |
| Refactor reflected in design sections | Pass | `buildServerProcessEnv`, `AppUpdateController`, `electron-launch/`; mcps `presentation/`, `recording/` | — |

## Spine Inventory Verdict

| Spine ID | Scope | Readable? | Narrative Clear? | Facade Vs Governing Owner Clear? | Subject Naming Clear? | Ownership Clear? | Off-Spine Concerns Off Main Line? | Verdict |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| DS-001 start | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-002 stop/restart/list | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-003 isolated server env | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-004 updates disabled | Primary | Pass | Pass | Pass | Pass | Pass | Pass | Pass |
| DS-005 `run_script` + helper | Primary | Pass | Pass | Pass (`BrowserApplication` stays the owner; `PresentationHelper` off-spine) | Pass | Pass | Pass | Pass |
| DS-006 recording | Primary | Pass | Pass | Pass (MCP/CLI facades → `BrowserApplication` → `RecordingService` → worker) | Pass | Pass | Pass | Pass |
| DS-007 worker frame loop | Bounded local | Pass | Pass | N/A | Pass | Pass | Pass | Pass |
| Recorder completion | Return/event | Pass | Pass | N/A | Pass | Pass | Pass | Pass |

## Boundary Encapsulation Verdict

| Boundary / Owner | Public Entry Clear? | Internals Stay Internal? | Bypass Risk Controlled? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `InstanceLifecycle` | Pass | Pass | Pass | Pass | Now instance-only; knows nothing about pages or recordings |
| `BrowserApplication` | Pass | Pass | Pass | Pass | Tools/CLI must not call `RecordingService` or the worker directly |
| `RecordingService` | Pass | Pass | Pass | Pass | Only owner that signals worker pids (identity guard) |
| `PresentationHelper` | Pass | Pass | Pass | Pass | Called only inside `run_script` |
| `buildServerProcessEnv` / `AppUpdateController` | Pass | Pass | Pass | Pass | Unchanged from round 1 |

## Dependency Direction / Forbidden Shortcut Verdict

| Owner / Boundary | Allowed Dependencies Clear? | Forbidden Shortcuts Explicit? | Direction Coherent? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace scripts | Pass | Pass | Pass | Pass | Lifecycle now has no CDP client (plain `fetch` readiness) |
| browser-automation | Pass | Pass | Pass | Pass | Existing tool paths do not depend on `RecordingService`; worker reached by spawn only |

## Interface Boundary Verdict

| Interface | Subject Clear? | Responsibility Singular? | Identity Explicit? | Generic Boundary Risk | Verdict |
| --- | --- | --- | --- | --- | --- |
| `isolated-app start/list/stop/restart` | Pass | Pass | Pass | Low | Pass |
| MCP `start_recording` / `stop_recording` + CLI | Pass | Pass | Pass (`tab_id` = CDP targetId on configured endpoint; state keyed by (port, tab_id)) | Low | Pass |
| `run_script` (signature unchanged; auto-install) | Pass | Pass | Pass | Low | Pass |
| `window.__abDemo` | Pass | Pass | Pass | Low | Pass |
| `BROWSER_AUTOMATION_ATTACH_ONLY` | Pass | Pass | N/A | Low | Pass |

## Existing Capability / Subsystem Reuse Verdict

| Need / Concern | Existing Area Checked? | Reuse / Extension Sound? | New Piece Justified? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Recording output paths | Pass | Pass (`ArtifactPolicy` temp sibling + commit) | N/A | Pass | Resolves ARCH-DR-002 by existing contract |
| Recording state location | Pass | Pass (per-user runtime dir) | N/A | Pass | — |
| Recording mechanism | Pass | Pass | Pass (must outlive short-lived calls without changing them) | Pass | — |
| Helper | Pass | Pass | Pass | Pass | — |
| Package import | Pass | Pass (instance UI) | N/A | Pass | REQ-012 withdrawn |

## Subsystem / Capability-Area Allocation Verdict

| Subsystem / Capability Area | Allocation Clear? | Decision Sound? | Supports Right Owners? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace Electron/renderer/scripts | Pass | Pass | Pass | Pass | — |
| `browser_automation/presentation` | Pass | Pass | Pass | Pass | — |
| `browser_automation/recording` | Pass | Pass | Pass | Pass | Service + worker + ffmpeg arguments |
| Skills/docs | Pass | Pass | Pass | Pass | Per-tool skills (REQ-011) |

## Reusable Owned Structures Verdict

| Repeated Structure / Logic | Extraction Evaluated? | Shared File Sound? | Ownership Clear? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Launch mechanics | Pass | Pass | Pass | Pass | — |
| PID identity guard (lifecycle JS and mcps Python) | Pass | N/A (separate runtimes/repos; the rule is documented) | Pass | Pass | Justified duplication |

## Shared Structure / Data Model Tightness Verdict

| Structure | One Meaning Per Field? | Redundant Removed? | Overlap Controlled? | Core Vs Variant Sound? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Instance record | Pass | Pass | Pass | N/A | Pass | — |
| Recording state / status | Pass | Pass | Pass | N/A | Pass | State and status are separate files with distinct writers (service and worker) |

## File Responsibility Mapping Verdict

| File | Singular? | Matches Owner? | Re-tightened? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Workspace file mapping | Pass | Pass | Pass | Pass | — |
| mcps `presentation/*`, `recording/{service,worker,ffmpeg}.py`, tool/CLI registration, `pyproject.toml` package data | Pass | Pass | Pass | Pass | Worker must be spawned with the MCP's own interpreter (`sys.executable`); implementation detail |

## Subsystem / Folder / File Placement Verdict

| Path / Item | Placement Clear? | Folder Matches Owner? | Mixed-Layer Or Over-Split Risk | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| `scripts/isolated-app/` (flat, 4 files) | Pass | Pass | Low | Pass | — |
| `browser_automation/presentation/`, `recording/` | Pass | Pass | Low | Pass | — |

## Removal / Decommission Completeness Verdict

| Item / Area | Named? | Replacement Clear? | Scope Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Round-1 items | Pass | Pass | Pass | Pass | Unchanged |
| SR-007 design-only elements (lifecycle `helper`/`record`/`import-package`, `isolated-app/cdp|recording|presentation`) | Pass | Pass | Pass | Pass | Never implemented |

## Legacy / Backward-Compatibility Verdict

| Area | Compatibility Wrapper / Dual-Path / Legacy Retention Exists? | Clean-Cut Removal Explicit? | Verdict | Notes |
| --- | --- | --- | --- | --- |
| Server env / harness / updater | No | Pass | Pass | — |
| browser-automation | No | Pass | Pass | Additive; schema v1 and exit categories preserved (QR-005/QR-007) |

## Persisted-Data Transition Verdict (When Applicable)

| Area / Stored Subject | Approved Decision | Evidence Sufficient? | Choice Proportionate? | Migration Safety If Required? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| Production / isolated data | Not Affected | Pass | Pass | N/A | Pass | — |
| Lifecycle records; recording state/status | New ephemeral | Pass | Pass | N/A | Pass | Stale handling defined in both tools |

## Change / Refactor Safety Verdict

| Area | Sequence Realistic? | Temporary Seams Explicit? | Cleanup Explicit? | Verdict |
| --- | --- | --- | --- | --- |
| Workspace steps 1–5; mcps steps 6–9; validation | Pass | Pass | Pass | Pass |

## Example Adequacy Verdict

| Topic / Area | Example Needed? | Present And Clear? | Bad Shape Explained? | Verdict | Notes |
| --- | --- | --- | --- | --- | --- |
| Agent end-to-end sequence | Yes | Pass | N/A | Pass | Resolves the round-1 gap |
| Helper install rule | Yes | Pass | Pass | Pass | — |
| Recording call/result | Yes | Pass | Pass | Pass | — |
| Keys + restart | Yes | Pass | Pass | Pass | — |

## Material Premise Validation (Only When Needed)

### `MP-001` — A lifecycle record can outlive its application process
- Round-1 record (Reachable: user quits the isolated app). Now addressed by the defined dead-process `stop` branch and the re-approved AC-003 alternate. No further action.

### `MP-002` — Relative recording output path resolves outside the agent's workspace
- Round-1 record (Reachable). Now addressed: recording moved to browser-automation, where `ArtifactPolicy` confines outputs to the agent workspace (`BROWSER_AUTOMATION_WORKSPACE` or MCP cwd) and rejects absolute paths. Lifecycle relative paths resolve against `INIT_CWD`. No further action.

### `MP-003` — Screencast frames stop while the isolated window is occluded
- Still `Unclear`. The design now passes `--disable-backgrounding-occluded-windows --disable-renderer-backgrounding`, makes validation cover occlusion, and adds escalation trigger (c). This is a proportionate response and adds no new machinery. For "any browser page" (the user's Chrome) the switches do not apply. That should be documented as a limitation.

### `MP-004` — Recording worker left running after its agent run ends
- Related requirement: REQ-008 (background recording across calls)
- Relevant behavior ID(s): BEH-006
- Initiating basis kind: `User`
- Independent trigger: the user stops or cancels the recording agent's run in AutoByteus (a supported run-control action) after `start_recording` and before `stop_recording`.
- Forward path: the worker was spawned with `start_new_session=True`, so it survives the MCP server's exit. It keeps recording until `stop_recording` or target loss.
- Consequence: ffmpeg and screencast keep running in the background, and the MP4 grows slowly, until someone calls `stop_recording(tab_id)`. That works from any later MCP/CLI process because the state is persisted in the runtime dir. Stopping the isolated instance also ends the target, which finalizes the recording. The situation is recoverable and bounded by the target's lifetime.
- Reachability: `Reachable`
- Review consequence: no finding. The approved contract (background recording plus a later stop, even from another process) already covers recovery. Recommendation: the guides should say that `stop_recording` works from a new session and that stopping the instance finalizes any recording on it.

### `MP-005` — The worker's long-lived Playwright connection auto-dismisses page JS dialogs during recording
- Related requirement: REQ-008 ("Existing tools keep their current behavior"); QR-007
- Relevant behavior ID(s): BEH-006
- Initiating basis kind: `User`/`Operational`
- Independent trigger: while a recording is active, the agent (via `run_script` helper click) or a human triggers a renderer flow that uses `window.confirm`/`alert`. Examples: Settings → Nodes → remove node (`NodeManager.vue:328`); Phone Access → revoke all (`PhoneAccessCard.vue:264`).
- Forward path: Playwright auto-dismisses dialogs on pages it manages when no `dialog` handler is registered. The worker holds a `connect_over_cdp` client for the whole recording.
- Consequence: a `confirm()` shown while recording resolves as dismissed. Today the same auto-dismissal already happens during any short-lived `run_script` that triggers it synchronously, so existing tool behavior is unchanged. The new exposure is limited to dialogs raised outside a tool call during recording. Native dialogs are also not captured in the video (R-002).
- Reachability: `Unclear` (the trigger exists; whether Playwright's auto-dismiss applies to `connect_over_cdp` pages in the worker needs confirmation during implementation)
- Review consequence: no finding. Residual risk: the implementation should keep the worker's Playwright usage minimal (CDP session for screencast only). Validation should confirm that a dialog raised during recording is not dismissed by the worker. If it is, the worker should use a raw CDP connection to the page target, or the limitation should be documented.

### `MP-006` — A Linux user passes a released AppImage as `--app`

- Related requirement: REQ-001, QR-004
- Relevant behavior ID(s): BEH-001
- Initiating basis kind: `User`/`Operational`
- Independent trigger: a Linux user or agent (a supported platform) with the released AutoByteus AppImage (the only Linux release artifact) follows the guide ("On Linux … pass `--app`") and runs `pnpm isolated-app start --app ~/Apps/AutoByteus.AppImage`.
- Forward path: `resolveAppExecutable` accepts the file → SR-011 gate → `readIsolatedLaunchContract(executablePath)` looks for `<dir>/resources/isolated-launch.json` next to the AppImage → absent → `APP_ISOLATION_UNSUPPORTED`.
- Consequence: all released Linux apps are refused, including future releases that carry the marker inside the image, and the remedy in the error message cannot work.
- Reachability: `Reachable`
- Review consequence: ARCH-DR-005.

## Unresolved Approved-Behavior Or Current-State Gaps

| Item | Why It Matters | Required Action | Status |
| --- | --- | --- | --- |
| AC-007 and AC-014 rows corrupted; SCN-004/SCN-005 stale | No readable acceptance authority for REQ-008 or REQ-015 | ARCH-DR-004 | Resolved (SR-010, ARCH-REV-003) |

## Review Decision

- **`Pass`** (round 5).
  - The SR-011 capability gate (accepted in round 4) now covers every supported release format. macOS bundles and Linux unpacked/extracted layouts go through the marker gate. Packed Linux AppImages are recognized without being executed and get an accurate, actionable recovery. `APP_ISOLATION_UNSUPPORTED` now fires only where updating the app can actually fix the lookup.
  - Rejecting option (a) is reasonable: it would execute the app's runtime just to probe, and it can't be validated on the macOS validation host.
  - ARCH-DR-001..006 are resolved; no open findings.

## Findings

None open. Resolution history: ARCH-DR-001..003 (ARCH-REV-002), ARCH-DR-004 (ARCH-REV-003), ARCH-DR-005/006 (ARCH-REV-005). See `architecture-review-revision-record.md`.

## Classification

N/A (Pass)

## Recommended Recipient

`/implementation_engineer` (cumulative package, implementation round IR-002); informational notice to `/solution_designer`

## Residual Risks

- Linux (round 5, validation-time): no Chromium sandbox handling exists in `autobyteus-web/electron` or the build scripts (`no-sandbox` not found). Directly launched unpacked Electron builds (worktree `linux-unpacked` and extracted AppImages) can fail to start on distributions that restrict unprivileged user namespaces, because the setuid `chrome-sandbox` loses its permissions. This affected `--from-worktree` on Linux before SR-012 as well. Validate wherever Linux is available (QR-004). If it reproduces, return `Design Impact` rather than adding a silent `--no-sandbox`, because that is a security posture decision.
- Manual launches of pre-change binaries stay outside product control (REQ-002 scope note). Document this in the guide.

- MP-003 occlusion (switches plus validation; the user's Chrome tabs are not covered by the switches, so document it).
- MP-004 orphaned worker after a cancelled run (recoverable with `stop_recording` or instance stop; document it).
- MP-005 dialog auto-dismissal by the worker's Playwright client (confirm during implementation; keep the worker minimal).
- Concurrent short-lived MCP connections while the worker holds a screencast were not probed (P-6 used a single client). Validate early; escalation trigger (e) is the right class.
- After `restart`, the tab id changes, so any recording on the old tab ends with `target_closed`. Document this in the skills.
- `restart` of an auto-created root must keep `ownsDataRoot: true` so a later `stop` still applies DEC-003 (carried from round 1; "same settings" implies it, so assert it in tests).
- Worker must be spawned with the MCP's own interpreter and must never launch a browser (connect only).
- Allowlist completeness (d) and loopback binding (b) remain validation-time checks.

## Latest Authoritative Result

- Review Decision: `Pass` (round 5)
- Material-Premise Gate: `Pass` (MP-006 resolved by the AppImage branch; earlier premises unchanged; MP-003/MP-005 remain validation items)
- Notes: The cumulative package is ready for implementation round IR-002 (capability marker + gate + AppImage branch + docs), followed by code review.
