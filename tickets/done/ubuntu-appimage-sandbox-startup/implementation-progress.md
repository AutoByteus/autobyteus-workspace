# Historical implementation checkpoints — current authority is implementation-handoff.md

2026-11-18. IR-001 hold cleared by ARCH-REV-003 / SR-014 / DS-003. At this checkpoint IR-002 was in progress. It is now complete for independent Code Review, Large/High; current handoff/record supersede these development notes. `manual-install-failure-clarification.md` is the designer's subsequent approved implementation clarification, not a new hold.

Implemented so far (not final validation): native release verification/canonical fixtures, bounded initial acquisition, sealed helper custody, one-shot polkit enrollment/removal, nonroot writer with same-inode metadata, native client, native build/sign scripts, AppRun packaging hook/readiness handshake, managed session/coordinator wiring, deferred automatic policy and distinct manual refusal record/row. No release workflow signing/metadata gates yet. Test-only key/origin compilation is excluded from production default build.

Native evidence IMP-05/06 is only a narrow implementation check: new Go helper + inert failure AppImage on disposable Noble, real tty auth, profile/socket/account creation and cleanup, root assets and service writer ownership, protected write refusal, separate prompt on uninstall. Two successive ONE-SHOT entries, not retained auth. It is NOT a production GUI/package/sandbox/update acceptance pass. Source changed after fixture build; pinned binary hashes identify the tested snapshot. Re-run affected paths before final handoff.

Local results so far: Go package tests passed including release vectors, payload bounds, redirect/size rules, sealed custody and two inert same-inode transactions/replay/tamper refusals. JS shared-vector tests 12 pass. New session tests 8 pass and notification-record tests 17 pass. Existing appUpdater suite failed setup because .nuxt/tsconfig.json missing; preparing it before retry. Electron and packaging scoped tsc passed before latest notification additions; both root-required typechecks still needed. Initial offline pnpm install lacked @fastify/cors tarball; normal frozen install completed. Nested scripts need temporary corepack shim in PATH.

## Resume commands / owned resources
- Worktree remains this ticket branch; never touch the user's checkout/app/data.
- Go `/tmp/autobyteus-5-toolchain/go/bin/go` (official 1.27.4 verified digest); prepend `/tmp/autobyteus-5-toolchain/bin` for pnpm child scripts. Node 22.23.2.
- Disposable native key/artifacts `/tmp/autobyteus-5-native`; never publish or copy private key into repo. Test key generated locally, unrelated to production/server keys.
- Disposable VM resources `/tmp/autobyteus-5-vm`; QEMU stopped after verified owned-installation uninstall; seed server stopped. Base cloud image/tooling retained for follow-on implementation checks. Guest key/password and overlay remain test-owned; remove at final cleanup. No host AppArmor/sysctl/package changes.
- Application restart at 13:26 UTC interrupted downloads/install; processes were checked absent before resuming. Cloud image digest verified after resume; pnpm frozen install completed; test-native build retried after guard fix for stdin-module imports.

## Work still required
- Complete release workflow build-only key provisioning, final-byte signing, shared-fixture validator and publication order. No production credentials or publication authorized.
- Strengthen unit/IPC/managed updater coverage and run both typechecks. Validate actual package hooks/Exec, executable-mode argv/signals and renderer isolation on affected disposable hosts.
- Verify manual persistence failure observability, canonical relaunch/test-profile preservation, refused/unknown commit recovery and frontend notification rendering. Complete native rollback/refusal checks and real packaged authentication UI.
- Update glossary/docs through owned boundaries; final implementation-handoff/revision record and commit/evidence ledger before routing Large/High to independent source review.
- All real Ubuntu 22/24/26, native ARM64, clean CI, two genuine signed updates with synthetic data and no cached authorization gates remain. Independent broad/API/E2E validation belongs downstream. Nothing is implementation-complete or ready to merge.

## Second development checkpoint (14:50 local terminal time (CET))
- Added release-job trust separation, build-only disposable signing, final-byte verification, packaged native/desktop layout gate and protected production signer job (not executed/published). Added installation/repair/removal documentation and vocabulary.
- Full web typecheck passed (0 production, 87 test baseline); server passed (0 production, 1012 baseline) on first checkpoint. Electron managed/session/record checks now 63 pass. Component/store checks 15 pass initially + manual-row selector correction rerun 1 pass. Explicit managed activation mode now drives quit-only localized copy; distinct manual refusal is rendered by existing row. Persistence failure emits stderr even after logger shutdown.
- Pipeline units: 15 pass with inert bytes/disposable keys. Go packages pass (wrong-root invocation first failed setup; corrected module cwd passed). No full production package or real rendered preview yet. Packaging build and final evidence are next; broad acceptance unchanged/unproved.

## Final validation checkpoint
Stage lifetime clarification implemented through existing owners: no wall-clock expiry; typed STAGE_GONE with verified old baseline clears matching provisional markers, not independent blocks. Tests cover restart/cache re-stage. Current native build needs only the final menu-preservation delta repacked; full x64 production pipeline already built with disposable trust (IMP-10/13). No host policy/user data changes.
Both typechecks now pass again on f1a88a2672 (IMP-15). Real component rendering/keyboard/actions at wide and narrow en/zh passed (IMP-14), preview route removed, browser and Nuxt server stopped. Package actual AppRun/Electron ELF/desktop Exec, signed final bytes, metadata, real Node args/exits/signals passed. New validator Python unittest guessed name does not exist; its real CLI is covered by Node pipeline units + actual package, not claimed as a passed legacy suite. Broad host/auth GUI/update/data/architecture/clean-CI acceptance remains downstream and unproved.

Final native repackage IMP-18 passed at 4c6950c757. Current handoff/IR-002 carry the route and mandatory remaining acceptance gates.
