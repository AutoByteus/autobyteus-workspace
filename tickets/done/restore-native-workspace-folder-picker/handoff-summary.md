# Handoff Summary — Native Workspace Folder Picker

> Current continuation: **DR-002 in progress — UV-001 received** (“its working. finalize, no need to release.”). Final target advanced; protection/reintegration/checks pending. The DR-001 hold below is retained temporarily as the prior baseline, not current user status. No release will be made.

## Current Authoritative Delivery Result
**DR-001 — integrated validation/docs complete; BLOCKED at the required user-verification hold. Not Delivery Completed.**
Package restore-native-workspace-folder-picker; task_size **Small**, architectural_risk **Low**, **direct validated route**. Architecture/source/test-code independent reviews and revision records **N/A — not applicable**. Requirements R3/UREQ-001, Product UCONF-001, SR-007, IR-001 and API-REV-001 remain current. Full authority/supplement/evidence inventory: `cumulative-package-manifest.md`.

## Delivered Behavior Awaiting Verification
Local embedded Electron workspace forms restore **Browse…** next to manual path entry for Agent/Team Chat, Org root and editable placed-Team rows. Native choice only fills input; **Use folder** selects it. Cancellation is silent/non-destructive, errors allow retry/manual entry, pending disables duplicate/implicit submission. Browser/remote/mobile remain manual-only. Existing workspace reuse, root locks, addressed-member draft ownership and explicit Send/Run/Save remain unchanged. No schema/migration/dependency or native bridge change.

## Integration And Validation
- Task branch `codex/restore-native-workspace-folder-picker`; target **origin/personal** from solution bootstrap (no release requested).
- `git fetch origin personal` then `git merge --no-edit origin/personal` integrated 36 newer base commits without conflicts. Base **af50bdd4056b9341e53494ad393b6283136a00ed**; candidate **bd495bdeb39ddff2357013f288215e8b1b6df540**; current integrated HEAD **44b03b9f3b3f73535c1f3ec8e27dc9201ab4c5de**. Clean tracked candidate already committed; additional checkpoint not needed. This base-into-ticket merge is the allowed safety refresh, not finalization into personal.
- Fresh integrated repository tests: **84 renderer/caller/store/service/gate + 5 preload**, all pass; guards/syntax/diff pass. Docs edited only after integrated tests passed.
- Fresh full packaged build and actual isolated caller/API probe: **7 Pass; native-only FP-P03 Not Tested** (manual mode). Real Agent/Team known reuse, Org/root/member binding, Run→Stop→draft→explicit Save/API readback, desktop/narrow and en/zh-CN; no model inference. No renderer page errors. Exact commands/limits: `release-deployment-report.md`.
- Integrated package **1.4.96** (inherited base version), macOS arm64, Chromium 148.0.7778.265; asar **e4a156a8767e60afc2055c0a6d1527b2fc2c1c549342d3734c28f9f2f56fa008**. Evidence `delivery-evidence/dr-001/integrated-caller-01/`. Probe instance iso-64091-c43d stopped, own data/fixtures removed, both ports released.
- Upstream API-REV-001: **89 repository tests + all8 native-assisted cases** on its earlier beta.2 bundle, reported confidence **95%**. Real native selection/Cancel/Escape proof remains attributed to that build, not misrepresented as a fresh native rerun. Changed feature/localization/host/gate source blobs are identical across integration (integration.json); downstream touched-base behavior was rechecked on rebuilt desktop. No new risk classification or product finding.

## Important Upstream Execution Incident
During API testing, an auto-launching app selector reopened the already-closed worktree app **without isolated arguments** (PID4683). It was immediately stopped, and no tests/UI actions ran in that process. Startup **may have accessed the default profile; we cannot certify user data was untouched**. No default data was inspected/reset/deleted and no existing user process was stopped/reused. Functional evidence used isolated instances. This uncertainty is explicitly disclosed to the user; passing checks do not erase it. Delivery did not reopen the app through an OS tool or inspect user data.

## Docs / Remaining Limits
Updated canonical `autobyteus-web/docs/settings.md` and `autobyteus-web/docs/agent_execution_architecture.md`; API testing runbook retained in TESTING.md. `docs-sync-report.md` explains promoted ownership, error/lifetime and preserved lock/save contracts. `release-notes.md` is unreleased scoped change notes, not publication.
Full Vue static check remains **not run: vue-tsc unavailable**; build is not an equivalent pass. Native evidence macOS-only. No physical-mobile, screen-reader, linguistic or all-OS certification; errors/empty/gating/lifetime are controlled tests, not OS-error/live-remote induction. No paid Agent/Team Send, migration/upgrade or broad-product certification.

## User Verification Surface / Required Next Signal
New isolated verification instance **iso-64199-6f3f**, PID919, control64199/backend64200; same integrated asar hash. Start receipt `delivery-evidence/dr-001/user-instance-start.json`. It is intentionally retained for the user, **not** a completed cleanup. Private data root and exact stop ownership are recorded there; do not use installed app/default data or auto-launch a closed bundle.
- Disposable public-API fixtures: Folder Verification Agent, Folder Verification Team, Folder Verification Org (/product and /other); `delivery-evidence/dr-001/user-fixtures.json`.
- Disposable folder root: `/private/tmp/autobyteus-folder-verify-d5xft_ay` (agent/team/org/member children).
- Reload the isolated window once to refresh catalog. New chat → choose Folder Verification Agent/Team → Workspace → Open another folder → Browse. Choosing a fixture directory must fill only the path; Use folder applies. Try native Cancel/Escape with typed text; neither should clear/apply it. Org fixture Run/setup permits root and /product workspace checking without sending a message. No model Send is needed.
- Await explicit user verification (or concrete findings) **after the incident disclosure**. UREQ-001/UCONF-001 and agent-run tests are not final user verification. `user-verification-record.md` is authoritative for the eventual signal.

## Finalization / Release / Cleanup Hold
No ticket archive, delivery-doc commit, ticket push, merge into personal, target push, tag, release or deployment by Delivery. The inherited latest base includes other tickets' releases, not this ticket's publication. After verification: refresh target again; protect docs; reintegrate/rerun and renew verification if materially changed; archive ticket before final commit; commit/push ticket → update target → merge/push target; stop owned verification instance/remove its fixtures and safely clean this task's worktree/branch only after finalization. Preserve untracked generated SDK dist from source staging. Release/deployment **Not required** unless separately requested.

No successful terminal return is eligible. Normal verification hold requires no code/design reroute; see `release-deployment-report.md` and DR-001. Final durable paths will be recorded after archive/finalization, before safe worktree removal.
