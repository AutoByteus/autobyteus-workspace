# API/E2E Revision Record — Ubuntu AppImage Conditional Sandbox

The canonical `api-e2e-coverage-investigation.md` and `api-e2e-execution-coverage-report.md` are the current authority. This record indexes completed rounds only.

## Revision index
| Revision ID | Triggering role/report/round | Related upstream revisions | Prior result/confidence | Current result/confidence |
| --- | --- | --- | --- | --- |
| API-REV-001 | Code Reviewer, CRR-002 Pass / first API/E2E round | SR-005; ARCH-REV-002; IR-002; CRR-002 | N/A / N/A | **Blocked / 70.0%** |

## API-REV-001 — Real restricted-host x64 proof, external matrix pending
- **Trigger:** `/code_reviewer` CRR-002 implementation review Pass; approved AC-001–006 and Medium / High reviewed route.
- **Prior API/E2E result:** N/A. No prior API/E2E revision record existed; no prior Pass or confidence is inferred.
- **Coverage delta:** Existing launcher nine-case suite retained (9 pass, 0 skip). `autobyteus-web/scripts/verify-linux-appimage-layout.mjs` updated narrowly to avoid `ENOBUFS` on real AppImage extraction; its assertions unchanged, and new artifact verification passed. No durable tests added/removed.
- **Execution delta:** Native x64 release-flavor AppImage built using a pre-existing extracted local GCC/make toolchain and owned pnpm shim; x64 metadata/layout passed. On restricted Ubuntu 26.04, direct and desktop-marker launches produced packaged GUI windows and embedded server health, exact sandbox FATAL → one fallback, app WARN and unchanged host-policy values. Packaged Node mode used `autobyteus-real` and preserved argv. Electron regression 152 pass/1 skipped. Evidence and case results are in the canonical ledger/report and `evidence/api-rev-001/`.
- **Prior failure resolution:** None (initial baseline). During this round, initial nested-pnpm PATH setup failure was corrected; layout verifier `ENOBUFS` was a local test-harness issue corrected and rerun. Neither is represented as a production package failure.
- **Current authoritative result/confidence:** **Blocked / 70.0%**; post-repository score 67.1%. AE-005 capable-host renderer isolation, AE-006 native ARM64 artifact/smoke and AE-007 older-to-newer update/relaunch remain blocked; AC-002/006 are critical unproved gates. Ubuntu 24.04 restricted-host sample is also untested.
- **Classification:** No observed implementation/design defect. Environment/release-matrix dependency; no final Pass, no inter-member handoff while Blocked.
- **Recommended recipient:** user/caller for access to capable Ubuntu host, native ARM64 runner and authorized staged newer-version update feed; no release authorization inferred.
- **Next round:** Reuse AE-005–007 IDs, recheck blocked gates first, update canonical reports and append API-REV-002. On eventual Pass, Medium / High route requires Code Reviewer proportional review of the changed durable verifier path.
