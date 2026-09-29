# Handoff — Architecture Design Complete

- Package identifier: `agent-isolated-app-recording`
- Result classification: `Architecture Design Complete`
- Current solution revision: `SR-012` (AppImage branch + text alignment after ARCH-REV-004; previous SR-011/SR-010/SR-009/SR-007)
- task_size: `Large`; architectural_risk: `High` (evidence in design-spec §Task Size And Architectural Risk)

## Revision Summary (SR-012, after ARCH-REV-004)

- ARCH-DR-005: packed Linux AppImage → `APPIMAGE_EXTRACTION_REQUIRED` (exit 2) detected by type-2 magic or suffix without execution; extracted `squashfs-root` executable passes through the normal marker gate; tests + docs. ARCH-DR-006: ASM-001 and design Guidance prerequisites aligned with the isolated-launch contract.

## Revision Summary (SR-011, after implementation Design Impact IR-001)

- IMP-DI-001: pre-change installed apps are not isolated. Resolution (option B): packaged builds ship `isolated-launch.json` (`isolatedLaunchContract: 1`) via `extraResources`; lifecycle `start`/`restart` refuse apps without it (`APP_ISOLATION_UNSUPPORTED`, exit 3). REQ-002 scope note and AC-001 alternate added (no intent change). Implementation is complete otherwise (IR-001); implementation package: `implementation-handoff.md`, `implementation-revision-record.md`. Narrow re-review requested: design-spec §Implementation Design Impact Resolution.

## Revision Summary (SR-010, after ARCH-REV-002)

- ARCH-DR-004 repaired: AC-007 (REQ-008 recording) and AC-014 (REQ-015 keys) restored to approved wording; SCN-004/SCN-005 corrected; UC-006, approval line, Readiness Check and investigation status updated; AC-003 alternate drops stale recording-state clause. No intended-behavior change; no design change beyond Guidance for ARCH-REV-002 residuals. See solution-revision-record SR-010.

## Revision Summary (SR-009, after ARCH-REV-001)

- ARCH-DR-001: resolved by user-approved requirement change — presentation helper is a built-in browser-MCP capability auto-installed by `run_script` when a script uses `__abDemo` (no loading step; no lifecycle loading).
- User also moved **recording into the browser MCP**: exactly two new tools `start_recording`/`stop_recording` (CLI `start-recording`/`stop-recording`) backed by a detached recorder worker; existing tools keep connect–operate–disconnect behavior (user: "it should not break how it works"). Output paths use the existing `ArtifactPolicy` (resolves ARCH-DR-002 for recordings); lifecycle relative paths resolve via `INIT_CWD`.
- ARCH-DR-003: dead-process `stop` branch defined; AC-003 alternate re-approved.
- `import-package` dropped by the user (REQ-012 withdrawn; package import through the instance UI).
- Lifecycle CLI is now instance-lifecycle only: `start | list | stop | restart`.
- Because recording moved subsystem (workspace → mcps), a re-review broader than the three findings is appropriate: DS-005/DS-006/DS-007, mcps `presentation/` and `recording/`, and the simplified lifecycle.
- Prior review artifacts (reviewed basis SR-007): design-review-report.md, architecture-review-revision-record.md.

## Original Request And Goal

The user wants agents running inside AutoByteus to build or launch a separate, isolated AutoByteus desktop instance (own backend port, own data root), import agent packages into it, control it like a human with a visible cursor, take screenshots, and record MP4 tutorial videos — "very easy for agents" — plus a root-level guide ("extremely important"). The main app keeps running; the user's production data must never be touched.

## Approval Basis

- Requirements Approved at SR-009 (`requirements-doc.md`; see Document Status for the quoted user approvals of 2026-09-29). Earlier basis: SR-006: SR-003 baseline approved by user 2026-09-28 (DEC-001..DEC-005 as recommended; DEC-006 no new MCP tools — actions/cursor via `run_script` + helper, recording in lifecycle command; DEC-007 fixed control port configured by user in the recording agent's MCP). REQ-015/AC-014/DEC-002 per explicit user direction: agents run the unchanged `pnpm secrets:import` with a user-given key source.
- Behavior-defining supplements: none.

## Key Constraints

- Browser MCP (`autobyteus-mcps/browser-automation`) gains exactly two tools (`start_recording`, `stop_recording`); plus `BROWSER_AUTOMATION_ATTACH_ONLY`, async-arrow fix, and the built-in presentation helper in `run_script`; existing tools' connect–operate–disconnect behavior must not change.
- Production launch behavior unchanged; isolated server env = baseline allowlist + Electron-owned values.
- Importer unchanged; lifecycle never imports keys; production vault never read.
- macOS + Linux; Windows lifecycle out of scope.

## Artifacts (absolute paths)

- Requirements: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/requirements-doc.md
- Investigation notes: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/investigation-notes.md
- Design spec: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-spec.md
- Solution revision record: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/solution-revision-record.md
- Evidence (non-normative): /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/evidence/
- Prior review artifacts: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording/tickets/in-progress/agent-isolated-app-recording/design-review-report.md and architecture-review-revision-record.md (ARCH-REV-001 on SR-007)
- Product Design artifacts: N/A — not applicable

## Workspace Context

- Primary repo worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/agent-isolated-app-recording, branch `codex/agent-isolated-app-recording`, base `origin/personal` @ e6c16d80148ba3a9674c0bd847eb1df0e6ca5bbb; finalization target `origin/personal`.
- Secondary repo: /Users/normy/autobyteus_org/autobyteus_mcps (`origin` = AutoByteus/autobyteus-mcps, default `main`); no task worktree created yet — implementation should create one (e.g. branch `codex/agent-isolated-app-recording`) from refreshed `origin/main`; finalization target `origin/main`.
- Task artifacts are not yet committed.

## Evidence Summary

Live probe (installed AutoByteus 1.4.91-beta.4): isolated launch works without build once `ELECTRON_RUN_AS_NODE` is cleared (≈8 s ready); browser-automation attaches over CDP to Electron (list/attach/screenshot/dom-snapshot); injected cursor + click works; CDP screencast → ffmpeg MP4 works; clean stop. Found: env leak of production settings into isolated server (must fix), "Update failed" toast, `async (arg)=>` no-op.

## Open Risks / Escalation Triggers

See design-spec §Risks and §Task Size escalation triggers (loopback binding, Linux screencast, missing baseline env variable, any production file access).

## Expected Output

Independent architecture review of the design against the approved requirements (then implementation per team routing).

## Routing Record

- SR-007 (2026-09-28): rule "Architecture Design Complete with task_size=Large or architectural_risk=High" → `/architecture_reviewer` (ARCH-REV-001: Fail, Design Impact).
- SR-009 (2026-09-29): get_handoff_rules applied — revised package is Architecture Design Complete, Large/High, requirements explicitly user-approved at SR-009 → `/architecture_reviewer` (re-review). Non-matching: direct implementation (needs Small/Medium + Low); delivery receipt (N/A).
- SR-010 (2026-09-29): get_handoff_rules applied — Architecture Design Complete, Large/High, requirements explicitly user-approved (SR-009, repaired SR-010) → `/architecture_reviewer` (repair confirmation).
- SR-011 (2026-09-29): get_handoff_rules applied — revised architecture package, Large/High, requirements approved (SR-009; SR-011 clarification only) → `/architecture_reviewer` (narrow re-review of the capability gate).
- SR-012 (2026-09-29): get_handoff_rules applied — revised architecture package, Large/High, requirements approved → `/architecture_reviewer` (narrow re-review: AppImage branch + two text lines).
