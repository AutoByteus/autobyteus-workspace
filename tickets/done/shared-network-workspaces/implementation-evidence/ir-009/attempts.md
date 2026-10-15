# IR009 attempts and evidence limits

- Personal work only. Initial compile (`go-initial.log`) exposed that Go syscall
  does not export Darwin MNT_LOCAL. Used the installed/retained sys/mount.h value
  0x00001000 in the existing APFS qualifier, explicitly commented; no cgo/dependency.
  `go-second.log`, focused source and binding logs then passed.
- `candidate-1/` retains the first complete 14-command local run. Afterward,
  declaration validation was tightened to the fixed diskutil XML prolog (or plain
  version1.0), and the Linux ephemeral test was made explicitly /tmp-based.
  Final source checks were rerun rather than borrowing that earlier result.
- `attempt-2/` retains a harness FileExistsError after 11 successful checks: the
  second run attempted to recreate its own cross-test output directory. The shell
  did not stop on that harness error and the separate current-CLI build succeeded;
  that build success does not convert the interrupted checks into a complete run.
  The final check runner uses distinct owned cross-test directories and was run
  with shell fail-fast. No product guard or test assertion was weakened.
- Ten copied-source mutations each failed the intended durable test, not build.
  Copies are under this worktree's ignored out/ir009-unit-mutations because source
  privacy checks intentionally reject /tmp/private sources. Setup fixture tests
  create owned canonical source directories under their package, cleaned per test;
  a checkout inside a forbidden source tree is not a suitable fixture location.
- Local binding tests begin at Apply's completed nonroot-create boundary via its
  actual bindSource method, then resume actual Apply and fail at the real missing
  trusted probe executable. They prove binding persistence before later effects,
  not privileged child creation/export/mounted read-write. Existing-source Plan
  tests stop after capture at backend selection, before global NFS config/ports.
- Actual installed diskutil was read for an owned local APFS directory through
  production Commands. No boot, disk/volume creation, mount, service, VM, Docker,
  native agent/provider, desktop or public product setup was performed.

- Strict artifact whitespace check reports16 trailing-whitespace diagnostic lines
  in four raw Go logs (4each). Kept raw logs unchanged; the diagnostic receipt is
  JSON-escaped losslessly to avoid creating recursive whitespace diagnostics.
  Source diff check passes. Artifact-only check disables blank-at-eol; no source
  or evidence bytes were normalized to hide results.
