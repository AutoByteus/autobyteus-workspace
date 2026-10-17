# CRR-002 — targeted CR-001 resolution review

Reviewed `ac9887e215` after fix `dfeac830f468994255fdafc31f66cdbeee1852cc`; previous review basis `caa318d795d73a85e8d3eb374d21ef532a8513f3`. No source/test fix or delegation by reviewer.

## Independent scope and source verification

`delta-audit.json` independently compares git/source bytes: only `platform/commands.go` plus two directly relevant test paths changed outside the ticket. All137 other IR002 audited paths remain identical. Approved requirements, approval017/018, Ready019 design, investigation, solution handoff/history, architecture authorities and pre-update CRR001 reports match the previous review basis. Updater source/spec hashes also remain unchanged. Targeted Delta Review is appropriate: public API, data shapes, owners and DS001–005 are unchanged.

| Changed production file | Before | After | Delta | >500 | >220 delta | Ownership / placement | Classification / action |
| --- | ---: | ---: | ---: | --- | --- | --- | --- |
| autobyteus-nfs/internal/platform/commands.go | 78 | 86 | +8 | Pass | Pass | Existing trusted OS-directory owner; private recursion supplies test seam without public bypass | CR001 resolved; none remaining |

The99-file CRR001 source-size audit remains applicable except this updated row. New `directory_modes_test.go` and changed Python installer fixture are tests, exempt from implementation size limits.

## Forward production-path resolution

The actor/trigger remains approved SCN001/011/013 first installation, not a new mechanism-derived scenario. Installer077 -> CLI elevation -> `InstallRoot` -> intended private0700 and binary-parent0755 -> `RootDirectory` -> same production `TrustedPath`. The helper first validates/creates the parent recursively; only successful new mkdir reaches `os.Chmod(p,mode)` (commands.go:75–91). All necessary new parents receive0755; private leaves0700. Existing entries bypass chmod; failed mkdir returns before chmod; final trust validation remains. The sole exported entry fixes the validator to `TrustedPath`; only same-package tests inject fixture ownership. No production caller can opt into a test environment bypass.

Unchanged consumers rechecked: cli/install.go private and binary directory creation; cli/run.go public directory; setup/apply.go public nodes; platform/jobs.go job parents; platform/mounts.go mount parent; backend/ganesha_native.go private state. This resolves the inherited-mask consequence without changing their requested modes or adding a data/source chmod. Nonroot probe/copy and public-file0644/private-file0600 paths remain unchanged. Installer mask and download privacy remain intact.

Existing restrictive-but-trusted directories are intentionally not adopted/repaired, consistent with CR001's new-directory correction and preservation instruction. This review does not invent an upgrade/migration policy for an unqualified, unpublished prior installer. No privileged installation was performed or claimed.

## Durable regression and evidence review

- Read both changed tests completely. Go parent executes current bootstrap through the shared Python archive/downloader fixture; a Go child checks inherited077 at verify/create. Native-host Mac/Linux directory layouts assert all needed ancestors, private0700/0600, binary/public/node0755 and descriptor0644. Same-UID nonroot fixture executes a binary and reads descriptors; **mode assertions**, not that same-owner read alone, catch root/nonroot traversal regression.
- Root trust is substituted only in a test-owned tree. Public `RootDirectory` refusal of untrusted test paths, existing0700/0750 unchanged, unsafe0777 parent refusal/no child, and file/symlink preservation are covered. No test-only public flag or production environment branch added.
- Reviewed IR003 `go-race-final.log` actual nested bootstrap output and `final-checks.json`:7 Go packages pass, command package no tests, vet pass. Child fixture skips top-level discovery but actually runs in the parent. Reviewer did not rerun Go or install a toolchain.
- Reviewed all three mutation logs and runner: old mkdir-only, omitted nodes chmod and omitted Library/usr parent chmod each fail on the intended0755 assertion in disposable copies. These are expected test-strength controls, **not failures of current source**. Foreign builds compile only; actual root/elevation/different-UID execution and independent OS/physical proof are not established.

## Personally executed check

```sh
python3 -m unittest scripts/tests/test_nfs_packaging_and_launcher.py scripts/tests/test_nfs_installer_fixture.py -v
```

`python-fixtures.log` / `checks-result.json`:7 enumerated, **6 pass/1 child-only skip**. No claim that this reviewer command executes the Go child; its positive proof is implementation's retained native Go log. Clean PATH/HOME/TMPDIR/LANG/PYTHONDONTWRITEBYTECODE environment, temporary root removed, no credentials, sudo, real OS configuration, network download, daemon/container/provider or user data. Pre-existing generated dist remains untouched. Only trailing empty log lines normalized.

## Carried evidence and limits

CRR001's full structural source review and unaffected source evidence remain applicable; not all re-executed. IR002 full Nuxt/Electron each retain the same3 pre-existing updater-category failures. Candidate-only updater green logs remain invalid as current-source passes. FUP001 remains with PM awaiting approval; no duplicate notification/task/dispatch. D001/DEC015 outage hardening deferred, not fixed; no source leases/refcounts/copies/workers added. Current-product/native tools/support assets/peer/restore, healthy mounted previews, selected real modes/Docker preservation, actual privileged installer and independent physical topology remain downstream gates. Source-review Pass is not API/E2E, release, merge or explicit user verification.
