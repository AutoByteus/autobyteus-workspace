# Docs Sync Report — resume-pdf-search-preview

## DR-004 Result
**Updated / Pass.** User-authorized repository finalization and public beta release are complete; live-user target rollout is not inferred. **Small / High / Reviewed**, Approved R1 / SR-001–004, current ARCH-REV-003 Pass, IR-001–002, source CRR-002 Pass (CR-F-001 resolved), test CRR-003–005 and API-REV-001–003.

## Integrated Documentation Basis
Latest base `24f0fd41782fe2163ba1dd8925a138d5f544e758` was merged into the ticket as `0f881a24d6aeead9aa9f8f56b49f56c0667c2234` without conflicts after explicit checkpoint. The +40 base commits did not change the approved Files/backend/reader/viewer spine. Fresh latest-base checks: production typecheck, 22 backend files / 108 tests, 9 web files / 58 tests and 51 Node lifecycle checks passed, with no skipped tests. The temporary outside-package Vitest .ts config failed before collecting tests because it was bundled as CommonJS; the identical .mts config corrected the loader. Both raw logs are retained; no source/test assertion was changed or waived. Actual native API-REV-002 / DR-002 byte/page/identity/security/restart proof remains historical at its exact tested build; the intentionally removed permanent Electron PDF probe is not a current runnable suite.

## Long-lived Docs / No Additional Impact
File Explorer relative path/search identity and ordinary re-query recovery documentation, generic shared testing/isolation setup, and environment-specific Linux/native build guidance remain accurate. Host-desktop instructions are not conflated with root/headless container setup. The rejected permanent PDF Electron package command/probe remains intentionally removed; existing coverage/product behavior is not removed. No further long-lived edit is needed for the docs-only publication receipt.

## Delivery-owned Artifact Updates
Current docs-sync, release/deployment, handoff, DR-004 history and package discovery now contain actual target merge/version/tag/workflow/assets/Docker pins and safe archival/cleanup disposition, rather than pending publication plans. User-verification records the literal new instruction without inventing a manual target test. Beta generated notes apply; optional release-notes remain functional, without internal IDs.

## Published / Durable Truth
[v1.5.3-beta.3](https://github.com/AutoByteus/autobyteus-workspace/releases/tag/v1.5.3-beta.3), release code `8d52dc4eb378609ae2dca6089eb62678eeafe803`: four successful workflows, 17 assets, updater versions/references and APK digest verified; Docker amd64/arm64 + matching forward beta digest `sha256:b1411fa6f5004dfe073d4841119a9c5da15c18ea93009fa20d6e312b25cd71d1`. iOS success is TestFlight upload, not public App Store review.

Current durable references: `/home/autobyteus/workspace/.codex/delivery-artifacts/resume-pdf-search-preview/ticket` and `/home/autobyteus/workspace/.codex/delivery-artifacts/resume-pdf-search-preview/ticket/evidence/delivery-dr004-package.json`; final receipt commit/push/ephemeral cleanup: `/home/autobyteus/workspace/.codex/delivery-artifacts/resume-pdf-search-preview/finalization-receipt.json`. Earlier DR-001–003 entries and raw evidence bytes are preserved, with old paths mapped as historical metadata. Source/guidance snapshots are release-pinned; no deleted probe appears as current source. Synthetic PDF xref and raw log whitespace are intentionally preserved.

Original target8001 runtime pins/rollback/interruption/user-render follow-up remain explicitly open; public beta alone is not deployed-user success or Project Task completion. The résumé hash remains unchanged. No production/shared-state edit.
