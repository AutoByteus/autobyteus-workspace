# Handoff — Architecture Design Complete, round 5 (autobyteus-435, SR-005)

## Result

- Classification: `Architecture Design Complete` (revised after API-REV-001 Fail → failure-origin review CRR-003: CR-002, CR-003, both Design Impact)
- Package `small-follow-ups-batch-435` (Task `autobyteus-435`); solution revision `SR-005`; `task_size=Medium`, `architectural_risk=High` (unchanged)
- Next expected action: architecture review of the DS-002 and DS-005 deltas; then implementation IR-004 on top of IR-003 (`432d1c3af2`); code review of IR-003 and IR-004; API/E2E reruns API-13, API-18, API-07, API-06 (and covers items 13–14).

## What changed

- **CR-003 / F2 (item 2, DS-002, DEC-019):** the packaged Electron `file://` window reads the Host gate's 403 and its code (API-13: `type: basic`); my premise was measured in plain Chromium. The probe now maps a readable 403 `REMOTE_ACCESS_HOST_REFUSED` to `host_refused` with the existing `cause.hostRefused` words (exact cause, same as the server-checked flows). The opaque second request stays for windows that cannot read the answer (browser windows) → `window_refused`, page words only; its desktop words and the `isElectronEnvironment()` branch in `causeText` are removed as unreachable. REQ-003 and AC-003-1 revised accordingly; AC-003-2 unchanged.
- **CR-002 / F1 (item 5, DS-005, DEC-020):** on API < 35 the decor fits system windows, so `android:id/content` began at the cutout (API-18). Full screen now also turns decor fitting off (`WindowCompat.setDecorFitsSystemWindows(window, false)`) on API < 35 and back on when it ends; never on API 35. Option 2 (edge-to-edge on every API) was rejected: it would change every screen on API 26–34 for one screen's need; outside full screen API 26–34 keep today's layout (277 REQ-011). The root's IME-only padding in full screen also keeps the keyboard inset on API < 35 (item 7). AC-004-1 now names API 34 and API 35.
- Design case 21 added to `docs/design-cases.md` (premise checked on a stand-in runtime / one platform version). Uncommitted; commit with the ticket documents.

## Approval basis

Requirements SR-005 approved by the Solution Designer within the Task's direction ("say a refused name is refused" is now said exactly in the desktop window); user informed in the conversation, 2026-11-10. No `Needs user` decision.

## Workspace

Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/small-follow-ups-batch-435`, branch `codex/small-follow-ups-batch-435` (HEAD `a380fc419f`), base `origin/personal` @ `310fc27452`; target `origin/personal`.

## Artifacts (ticket folder)

requirements-doc.md, investigation-notes.md (Runtime findings: API-13, API-18 rows), design-spec.md, solution-revision-record.md (SR-005), follow-ups.md; evidence `evidence/api-e2e/API-13-electron-nodes-page.txt`, `API-18-android14-full-screen.txt`; reviewer-owned code-review-report.md (CRR-003), api-e2e-execution-coverage-report.md.

## Route

Handoff rules applied (2026-11-10): "Architecture Design Complete with … architectural_risk=High … ready for independent architecture review" → `/software_engineering_team/architecture_reviewer`.
