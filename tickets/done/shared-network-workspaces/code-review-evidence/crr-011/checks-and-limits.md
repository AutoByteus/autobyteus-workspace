# CRR011 personal source-review checks

All review/checks personal; no delegation/spawning. Exact commands, cwd, expected
exit and durations: checks-result.json. Pinned Go1.27.2 official archive downloaded
with IPv4 into owned scratch, SHA verified. Clean HOME/TMPDIR/environment; scratch
UID/GID recorded. No OS-global configuration, root, VM, real Docker/mount or provider.

- Seven Go packages race/count1 pass; cmd package has no tests.57 top-level events:
  56 pass + one child-only skip; bootstrap parent actually executes that child.
  140 passing subtest events:84 depth1,42 depth2,14 depth3. These are not140 direct
  children. This refines IR008's `first-level` label, not a test failure.
- Vet passes. Python18 enumerated:17 pass/one standalone Go-child skip, covered by
  parent above. No count inflates skips into pass.
- Three copied mutations (omit export expiry, permit missing config as readiness,
  omit Detach preflight) fail intended test assertions, not compilation.
  Implementation's separate seven-control evidence inspected; not relabeled ours.
- Source default and retained-engine aggregates independently match IR008;
  --check-publish expected exit1, unqualified targets. No publication attempted.
- Four current candidate SHA/size and embedded metadata checked. Fifteen prior
  candidates and286 pre-existing dist files unchanged. No reviewer CLI rebuild;
  implementation's four compile targets and two actual candidate builds remain
  upstream evidence. No Docker image/installation/runtime claim from binaries.
- Eight actual source/test/docs paths; four small production files. Strict
  Write/Verify/Ensure/Remove config bodies byte-identical.1083 protected input
  paths unchanged; all1088 incoming references exist. No source/durable-test fix.
- Recomputed127 designer A/B/A observation rows across six cases: default/restore
  miss5s, zero-policy cases meet5s on two same-kernel native mounts. Diagnostic
  manual config/restart/remount experiment supports dependency feasibility only,
  not corrected public setup, managedHTTP, Docker STORAGE or physical peers.
- Positive setup fixtures deliberately stop at mount observation. No full public
  detach/freshness/activation proof; independent API-F004 must run first.
- Source whitespace checked separately; raw mutation diagnostic blank retained.
  IR008's initial scratch-GID failure and ten raw diagnostic whitespace lines
  preserved upstream. No false claim of universal raw-log whitespace cleanliness.
- Reviewer input audit list-vs-map mistake corrected before verdict; see attempts.md.
  Own scratch/toolchain/copies removed. No live user resources touched.

API004 Fail57.14%/broaderRequired remains. CR005/API-F003 scoped resolution stays
closed at API004's actual Linux two-boot/Stop/policy/replacement/detach scope.
CR006 is source-corrected/ready for independent validation, NOT product closed.
