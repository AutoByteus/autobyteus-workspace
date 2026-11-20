# Delivery verification — autobyteus-12 / DR-001
**Scope and decision:** finalize source on personal only. No public release, tag, workflow dispatch, user installation or deployment. No signer access, database migration, favorite edits or user check needed. For a code rollback, revert the merge through normal review; do not rewrite people's shortcuts or favorites. Future user-facing notes are in release-notes.md.

**Integration:** clean CRR-002 tip f26d0a113c. Fetched origin/personal: 21 newer base commits since b072d93d8e; merged fbf02a9315 without conflicts at ff2910981f. No checkpoint needed. Base changes to media/file loading do not change the managed native launcher, Electron main, packaging, or targeted GNOME paths. Rebuilt typecheck prerequisites, ran frozen install, race-enabled native Go suite, and both web/server typechecks (zero production errors, accepted baselines). Commands and results: evidence/DR-001-integrated-checks.txt. No rebuild claimed of the previously measured guest images. Re-fetched unchanged base after verification. Guide: RELEASE.md on fbf02a9315; assigned ticket uses fix/ rather than the guide's example codex/ prefix.

**Evidence audit:** API-REV-001 97.1% after broader real-shell execution (78.3% repository-only). Checked the observations themselves, including the rendered before/after screens; tracker IDs or a PNG in the package alone do not prove displayed artwork or single-tile grouping.

| AC | Evidence in evidence/ | Verdict |
|---|---|---|
|001|API-04-new-user-search/unmounted PNG, unmounted log and relaunch PNG|Fresh second login showed one branded search result after quit with no AppImage mount; menu reopened the installed app. Proven.|
|002|API-02-old-search versus API-03-wayland-secondary/xwayland-secondary PNG + JSON; API-04-probe-controls.log|Generic old pinned/running items replaced by one branded tile. Both real primary and secondary windows resolve to autobyteus-managed.desktop. Wrong-count and wrong-backend controls fail. Proven.|
|003|API-03-activate.log, -upgraded-search.png, -original-xwayland.log, -unmounted-search.png|Verified signed update; existing favorite ID unchanged. Original released download redirected to corrected protected image; no new auth or repeat file replacement. Natural indexing is asynchronous. Proven.|
|004|API-04-canceled, -custom-removal, -new-user-uninstall and -final-state logs|Canceled auth leaves resources intact; clean fresh-user uninstall removes only owned files; customized entry, icon, foreign files, favorites and work retained. Proven.|
|005|Integrated checks, operator guide update, archived ticket and final repository/cleanup receipt|Delivery owned; not inferred from the guest pass.|

**Limits:** Ubuntu 24.04.5 x64, GNOME Shell 46, Ubuntu Dock, Wayland compositor and XWayland clients; not standalone Xorg or every shell/theme. Signed upgrade of exact test bytes, disposable trust and build-time loopback feed for initial enrollment. Not a production feed, signing or rollout test. Earlier baseline server startup failure was on an unfinished synthetic database, not a passing screenshot; healthy old baseline separately recorded. No outstanding defects or follow-ups.
