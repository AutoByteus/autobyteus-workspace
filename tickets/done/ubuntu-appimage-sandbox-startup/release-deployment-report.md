# Delivery — autobyteus-5 / DR-001
**Scope:** repository finalization on personal only. SR-012 excludes publication. No tag, bump, deployment, combined CI, key provisioning, data migration or release smoke. Notes retained for a future release, not published.

**Integration:** clean reviewed b5b0626f64; no checkpoint needed. Recorded bootstrap origin/personal; 246 newer base commits through 8430d9ef12 merged without conflicts (e4fce07680). No base change to Electron launcher, native installer, signing implementation or release-desktop workflow; base includes newer app version and unrelated web/server behavior. Rebuilt typecheck dependencies after frozen install. Both web and server typechecks pass with zero production errors and unchanged test baselines; native Go suite (including real writer/socket) and JS signed contract suite (15/15) pass. See evidence/DR-001-integrated-checks.txt. No old packaged binary was run as if built from this merge.

**Independent evidence audit:** API-REV-004, broader tests executed, 96.6% vs 95% target (weakest category 94%). Proven within the following limits; no user recheck necessary.

| AC | Evidence inspected, under evidence/ | Result |
|---|---|---|
|001/002|API-04g-positive, API-04h-jammy/resolute logs; direct/menu screenshots|UID 1000 desktop, healthy real server, renderer NoNewPrivs=1, Seccomp=2 and nested PIDs. 22.04 portable/no enrollment; 24.04 and 26.04 protected.|
|003/004|API-04g-repair-launch/uninstall and API-06f-space/readonly/cancel screenshots; API-07d-verification, API-06f-space and API-09d-cleanup logs|Missing protected copy points to admin repair; 32 MiB authorized refusal names install volume; other failures provide distinct recovery. The 404, invalid and offline messages differ. Refusal leaves no unintended install, removal preserves the work hash. Normal system authorization, no global relaxation.|
|005|API-03d-current-node.log, API-08d-receipt.json and -native.log|Real packaged Node preserves spaced argv/exit 23 and signals/exit 42. Native x64 and ARM64 builds verified signatures, metadata and packaged server. Linux-only CI run 44538103449, no ARM GUI claim.|
|006/008|API-05i-before/settings/after and -successor.png, API-05f-ordinary, API-05e-retry-after, API-06f-current-units|Verified .13 → .14 in Settings, genuine successor .14 window, new main/server on new mount under same supervisor, work intact. Earlier two-update/opt-out, staged-work, channels and recovery matrix apply to tested bytes and unchanged paths, not a fresh rerun on the integration merge. Signed inode and socket refusal/reconciliation tests remain green.|
|007|Base refresh, checks above, archived historical evidence, repository and cleanup receipt below|Delivery-owned; not an upstream runtime pass.|

**Limits:** x64 Ubuntu virtual X11 desktops, synthetic work, clock shift, test signer and loopback feed. No physical power-cut, public download transport, production signer, macOS/Windows or ARM GUI qualification. No unresolved acceptance defect. No application data transition or live host changes.

**Guide:** RELEASE.md at origin/personal 8430d9ef12, synchronized to the new Linux signing contract; used the recorded fix/ branch rather than renaming the reviewed candidate to codex/. No release-policy deviation. September old ticket compared byte-for-byte: only added file is source-candidate.patch, whose hash matches the old branch non-ticket diff with --abbrev=9. No historical fallback applied. See docs-sync-report.md, handoff-summary.md, delivery-revision-record.md and release-notes.md alongside this file.

**Repository receipt:** appended after the remote target accepts the merge.
