# IR008 personal implementation checks — 2026-10-15

Scope: SR022 / ARCH006 / CR006(P1) / API-F004. Not API/E2E qualification.

- Go1.27.2 darwin-arm64 downloaded into owned scratch, exact prescribed SHA checked
  (toolchain.json). Clean environment, owned HOME/TMPDIR, GOTOOLCHAIN=local.
- Initial focused backend/setup tests passed (go-focused.log).
- Final go test -race -count=1 -v ./...: seven packages,56 top-level and140
  first-level subcases pass. Includes all prior selected-start/Stop/policy/volume/
  consumed-attempt regressions at fixture scope, not a repeated real reboot.
- go vet ./... passes. Four plain cross-builds (Darwin/Linux × arm64/amd64) and
  native version smoke pass. Plain builds are not target installation proof.
- Python four packaging/installer/launcher/workflow modules:18 tests,17 pass,
  one standalone Go-child skip; corresponding child runs through Go platform
  bootstrap regression. Shell syntax passes. Empty-qualification --check-publish
  refuses with expected exit1, not a release attempt or publication.
- Seven independently copied mutations each fail the intended test, not compilation:
  omitted expiry, CLIENT-only expiry, missing Status verification, missing-config
  readiness allowance, omitted Detach verification, rejected partial missing retry,
  accepted different config. Commands/results/logs in checks-result.json.
- Initial full race failure is preserved in attempt-1: newly created /tmp scratch
  inherited wheel GID0. Existing Probe correctly refuses that data identity.
  Corrected only owned scratch groups to primaryGID20; no product guard/test weakened.
  See attempts.md and scratch-group-correction.json.
- Tests cover both generated native/Docker modes; current/missing/old/different/
  malformed configs, directory and dangling-entry errors, existing exact removal
  retry/recovery preservation, saved/pending Detach guard ordering, and Apple/
  connect-only bypass. Successful setup preflight tests deliberately stop at
  mount observation. No real unit/container/mount operation or complete public
  Detach is claimed. WriteGanesha/VerifyGanesha/EnsureGanesha/exact-removal bodies
  remain byte-identical; actual privileged config writer execution is downstream.
- Actual local CLI/metadata rebuilt from committed source in an owned copy, embedding
  the exact retained IR005 arm64 engine pair. Only copy deltas: release.json and two
  .debs. Native version and embedded metadata byte checks passed for both binaries.
  No engine build. No Docker image assigned; API must bind its current owned image.
- source-audit.json: eight code/test/docs paths only; four production Go files
  remain below500 nonempty lines and each below220 delta.1083 other input paths,
  all15 retained IR005/007 artifacts and286 files in five old dist trees unchanged.
  All1041 incoming refs retained. No requirements/designer/reviewer/API edits.
- No frontend delta: rendered-result check Not Applicable. No new VM, real daemon,
  privileged mount, provider, physical-peer, public bootstrap or live-user check.
  No new five-second measurement. Designer A/B/A diagnostic evidence remains
  dependency feasibility only, not current product validation.
- CRR010 Fail/API004 Fail57.14% and broader Required stay authoritative. API004's
  separate CR005/API-F003 resolution is preserved, not reopened.
- build-result.json inventories four retained ignored ir008-local-candidate files,
  unqualified/unpublished. cleanup.json inventories removed owned scratch and
  retained candidates. Execution scripts are receipts; scratch is intentionally
  gone after handoff, not a claim of indefinitely runnable local paths.
