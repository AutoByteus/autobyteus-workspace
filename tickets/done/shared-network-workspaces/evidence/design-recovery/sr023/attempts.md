# SR023 attempts and limits

Personal execution only. All original failed attempts retained; no production fix or API pass.

- Preparation attempt1 cloned/started the one owned Mac VM and downloaded a checksum-verified
  compiler, then Python3.9 rejected tarfile.extractall(filter='data'). Original script/log/
  receipt retained in attempt-1. Did not start a second VM or redownload unknown bytes.
- Resume attempt2's strict archive guard rejected legitimate top-level `go` directory while
  allowing only `go/` children; original script retained in attempt-2. Corrected to accept
  exactly go/go descendants with no traversal, links or special members, then extracted the
  same verified archive. resume-prepare-console.log/resource/toolchain identify success.
- Probe compile first failed because syscall.MNT_LOCAL is not exported. Retained source and
  compiler receipt in build-attempt-1. Verified0x00001000 in pinned Apple XNU header, replaced
  constant reference, compiled both Darwin architectures CGO_ENABLED=0 successfully. No
  product or engine binary built. Only arm64 executed.
- During design discovery actual diskutil plist lacked `Mounted`; removed speculative field
  requirement BEFORE live experiment. Authoritative design names only validated actual keys.
- Three ordinary guest restarts involved bounded Tart-agent readiness polling/timeouts; they
  are harness transport observations, not product retries or a new reboot SLA. Raw commands
  retained in prototype-result.json. All actual identity/replacement controls completed Pass.
- Cleanup first assertion looked for an unescaped image name inside raw JSON containing
  escaped slashes, after clone was already stopped/deleted. Retained cleanup-attempt-1.
  complete-cleanup.py decoded exact Name, independently confirmed cache present/clone absent/
  PID absent, then removed only own scratch. Final cleanup.json Complete; no repeated delete
  against a foreign resource. Successful resource disposal is not public service detach.
- Some exploratory rg globs/guessed read paths or large console reads failed/truncated; later
  bounded reads/full JSON parsing supplied the cited evidence. Read-only exploratory Tart
  help showed no screenshot subcommand; no screenshot or UI coverage claimed. Failed Apple
  web manual/JSON fetches not treated as successful contracts; installed manuals retained.

Prototype limitations: no NFS/public CLI, automatic mount, installed product config, Docker,
physical peer, actual app/provider, engine build or full test suite in SR023. Candidate compare
rejects replacements; this does not certify production refusal until implementation/API.
Only fixture bytes/markers/images and own guest reboot/mount changes; no host root/mount or
shared user resources changed. No identity rewrite/cache flush/outage machinery used.
