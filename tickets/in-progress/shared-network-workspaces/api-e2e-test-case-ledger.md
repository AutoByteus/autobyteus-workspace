# API/E2E Test-Case Ledger

Round API-REV-001. Worktree /Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces. Investigation api-e2e-coverage-investigation.md; execution report api-e2e-execution-coverage-report.md. Evidence evidence/api-e2e/api-rev-001. Multiple meaningful cases and VM lifecycle require this durable checkpoint.

## Planned cases
| ID | Case | Acceptance criteria | Expected result | Status |
| --- | --- | --- | --- | --- |
| N01 | Current Go race/vet/build + Python bootstrap/launcher | 006–009,012–019 | Relevant suites pass; explicit child/PowerShell skips | Pass (3 Python skips explicit) |
| N02 | Binding/profile/source/close/Git/REST/AGY/local units | 002,006,008–010 | Valid regressions pass at mocked boundary | Pass |
| N03 | GraphQL/REST/integration + scripted native transport | 002,006,010 | Public contract preserved; not real inference/NFS | Pass after fixture correction; original Fail retained |
| N04 | Guide/core-terminal regression | 002,004,020 | Valid component/environment assertions pass | Pass |
| V01 | Actual fresh Mac VM root install/create under077 | 008,012,017–019 | Root install and source/nonroot mount ready; no source copy | Pass — narrow nativeMac create |
| V02 | Healthy mounted operations/clients/restart/detach | 001–010,013–019 | Same source/UUID/content and exact ownership/preservation | Fail — first create; later steps Not Tested |
| V02-repro | Fresh singleVM reproduce + public reconnect | 012,014,018,019 | One-command ready; retry same identity if failure occurs | Fail first create; reconnect substep Pass |
| V03 | Native Linux/Docker-Linux + independent physical topology | 001,003–005,008,012–019 | Real qualified reference matrix, not virtual-only | Not Tested |
| V04 | Current-built desktop guide and healthy previews | 010,020 | Actual surface/MIME/copy behavior, no fake availability | Not Tested |
| V05 | Actual native tool/support-file/peer/restore matrix | 002,006,010 | Native reads and exact close under current integration | Not Tested |

## Execution events
Initialized before execution. The following historical start/checkpoint/completion events were appended as execution progressed; the planned-case table is now reconciled to final status.

- 2026-10-13T19:19:09Z **N01 Started** — Packaging/Go checks in private HOME/TMPDIR; no live credentials.

- 2026-10-13T19:19:21Z **N01 Checkpoint** — Starting python-bootstrap-launcher; see python-bootstrap-launcher.log

- 2026-10-13T19:20:06Z **N01 Checkpoint** — Starting go-race; see go-race.log

- 2026-10-13T19:20:22Z **N01 Checkpoint** — Starting go-vet; see go-vet.log

- 2026-10-13T19:20:28Z **N01 Checkpoint** — Starting go-build-native; see go-build-native.log

- 2026-10-13T19:20:34Z **N01 Checkpoint** — Starting native-version; see native-version.log

- 2026-10-13T19:20:34Z **N01 Completed** — Pass (repository scope, skips enumerated in logs)

- 2026-10-13T19:20:34Z **N02 Started** — Shared binding/profile/source/process-close/API units, clean env.

- 2026-10-13T19:20:34Z **N02 Checkpoint** — Starting server-targeted; see server-targeted.log

- 2026-10-13T19:20:44Z **N02 Completed** — Pass; see server-targeted.log for exact tests and boundaries.

- 2026-10-13T19:20:44Z **N03 Started** — Prepare normal integration outputs then public-schema and REST suites.

- 2026-10-13T19:20:44Z **N03 Checkpoint** — Starting integration-prepare; see integration-prepare.log

- 2026-10-13T19:21:04Z **N03 Checkpoint** — Starting public-contracts; see public-contracts.log

- 2026-10-13T19:21:16Z **N03 Checkpoint** — Fail public contracts. Not socket/browser/native NFS proof.

- 2026-10-13T19:21:16Z **N03 Checkpoint** — Starting agy-scripted-linked-skills; see agy-scripted-linked-skills.log

- 2026-10-13T19:21:31Z **N03 Completed** — Fail; controlled source HTTP/runtime, not real inference.

- 2026-10-13T19:21:31Z **N04 Started** — Guide/terminal narrow checks.

- 2026-10-13T19:21:31Z **N04 Checkpoint** — Starting guide-unit; see guide-unit.log

- 2026-10-13T19:21:41Z **N04 Checkpoint** — Starting terminal-unit; see terminal-unit.log

- 2026-10-13T19:21:47Z **N04 Completed** — Pass; broader unchanged IR002 suites carried separately, FUP001 not erased.

- N03 Started rerun: fixture composition fix and new ordinary HTTP preview case. Original five cleanup failures retained.

- N03 Completed rerun: Pass; workspace-http-rerun.log.

- 2026-10-13T19:23:21Z **V01 Started** — Fresh native macOS VM; real unchanged worktree CLI/root install/create. No released bootstrap claimed. ab-nfs-api001-d7fbf3f4

- 2026-10-13T19:24:08Z **V01 Checkpoint** — fresh platform/source preflight: Pass

- 2026-10-13T19:24:28Z **V01 Checkpoint** — normal create under077 with real sudo/root/nonroot probe: Pass

- 2026-10-13T19:24:30Z **V01 Completed** — Pass fresh Mac create. Other mode, reboot/client, published installer and physical/inference claims remain unproven.

- 2026-10-13T19:24:30Z **V01 Checkpoint** — Cleanup recorded in mac-vm-result.json; no host OS resource or user-node action.

- 2026-10-13T19:26:23Z **V02 Started** — Two fresh owned Mac VMs, unchanged development CLI, no user resources; ab-nfs-api001-7a371989

- 2026-10-13T19:28:08Z **V02 Checkpoint** — storage create on original nonempty APFS source: Fail

- 2026-10-13T19:28:08Z **V02 Completed** — Fail/incomplete: RuntimeError('Detected private addresses: 192.168.128.2\nNo reachable local Docker daemon; no Docker nodes will be attached.\nAutoByteus NFS plan:\n - Apple nfsd: TCP2049 + RPC111 + mountd20048; exact export/settings to apply:\n# BEGIN AutoByteus NFS fc1c2eec-b2ef-4c40-8ef6-82b314bc3230\n"/Users/admin/ab-nfs-api001-7a371989-source" -mapall=501:20 192.168.128.2\n"/Users/admin/ab-nfs-api001-7a371989-source" -mapall=501:20 192.168.129.2\n"/Users/admin/ab-nfs-api001-7a371989-source" -mapall=501:20 192.168.128.1\n# END AutoByteus NFS fc1c2eec-b2ef-4c40-8ef6-82b314bc3230\n# BEGIN AutoByteus NFS fc1c2eec-b2ef-4c40-8ef6-82b314bc3230\nnfs.server.mount.port=20048\nnfs.server.bonjour=0\nnfs.server.udp=0\nnfs.server.mount.require_resv_port=0\n# END AutoByteus NFS fc1c2eec-b2ef-4c40-8ef6-82b314bc3230\n\n - Export chosen source in place: /Users/admin/ab-nfs-api001-7a371989-source\n - Map ALL clients to nonroot 501:20; no recursive ownership change\n - Trust private hosts/subnets: 192.168.128.2, 192.168.129.2, 192.168.128.1\n - Attach 192.168.128.2:/Users/admin/ab-nfs-api001-7a371989-source at /Volumes/autobyteus-shared\n - Install fixed root-owned launchd/systemd service; publish nonsecret binding descriptor\n - NFS is unencrypted host trust, NOT individual-user authentication; no router or firewall rules changed\n - Hard NFS may stall file operations, previews and unrelated work; no local fallback or outage deadline\nAutoByteus NFS incomplete: mount_nfs failed: exit status 74: mount_nfs: can\'t mount with remote locks when server (192.168.128.2) is not running rpc.statd: RPC prog. not avail\n\nAutoByteus NFS incomplete: exit status 1\n')

- 2026-10-13T19:28:10Z **V02 Checkpoint** — Exact resource cleanup receipt saved.

- 2026-10-13T19:29:16Z **V02-repro Started** — Fresh native macOS VM; real unchanged worktree CLI/root install/create. No released bootstrap claimed. ab-nfs-api001-repro-c179ed61

- 2026-10-13T19:30:06Z **V02-repro Checkpoint** — fresh platform/source preflight: Pass

- 2026-10-13T19:30:17Z **V02-repro Checkpoint** — normal create under077 with real sudo/root/nonroot probe: Fail

- 2026-10-13T19:30:17Z **V02-repro Completed** — Fail/incomplete V01: RuntimeError('Detected private addresses: 192.168.128.2\nNo reachable local Docker daemon; no Docker nodes will be attached.\nAutoByteus NFS plan:\n - Apple nfsd: TCP2049 + RPC111 + mountd20048; exact export/settings to apply:\n# BEGIN AutoByteus NFS e88b69ce-bd73-4d29-8e6a-a7e81cdcda24\n"/Users/admin/ab-nfs-api001-repro-c179ed61-source" -mapall=501:20 192.168.128.2\n"/Users/admin/ab-nfs-api001-repro-c179ed61-source" -mapall=501:20 192.168.128.1\n# END AutoByteus NFS e88b69ce-bd73-4d29-8e6a-a7e81cdcda24\n# BEGIN AutoByteus NFS e88b69ce-bd73-4d29-8e6a-a7e81cdcda24\nnfs.server.mount.port=20048\nnfs.server.bonjour=0\nnfs.server.udp=0\nnfs.server.mount.require_resv_port=0\n# END AutoByteus NFS e88b69ce-bd73-4d29-8e6a-a7e81cdcda24\n\n - Export chosen source in place: /Users/admin/ab-nfs-api001-repro-c179ed61-source\n - Map ALL clients to nonroot 501:20; no recursive ownership change\n - Trust private hosts/subnets: 192.168.128.2, 192.168.128.1\n - Attach 192.168.128.2:/Users/admin/ab-nfs-api001-repro-c179ed61-source at /Volumes/autobyteus-shared\n - Install fixed root-owned launchd/systemd service; publish nonsecret binding descriptor\n - NFS is unencrypted host trust, NOT individual-user authentication; no router or firewall rules changed\n - Hard NFS may stall file operations, previews and unrelated work; no local fallback or outage deadline\nAutoByteus NFS incomplete: mount_nfs failed: exit status 74: mount_nfs: can\'t mount with remote locks when server (192.168.128.2) is not running rpc.statd: RPC prog. not avail\n\nAutoByteus NFS incomplete: exit status 1\n'). Capture diagnostic before clone retirement; not an outage injection.

- 2026-10-13T19:30:28Z **V02-repro Checkpoint** — Cleanup recorded in mac-repro-result.json; no host OS resource or user-node action.

## Final reconciliation

- V02-repro public reconnect rc0 in9.615s: same storageUUID2f6bed56-1950-43d4-822d-d3727cf20940, hostReady=true. Evidence mac-repro-result.json/publicReconnectAfterFailure. The first-create result remains Fail/API-F001; no independent postretry-byte/reboot proof. Earlier raw event's phrase "Fail/incomplete V01" is inherited probe wording, not a separate V01 failure.
- V02 later native peer connect, operations/visibility/concurrency/Git, managedDocker preservation, reboot and detach: **Not Tested**, not reached after source-host create failure.
- V03/V04/V05: **Not Tested**, remaining broader work stops for failure-origin review; missing physical/native-account/product proof retained, no user-only waiver.
- All four exact owned VM clones/processes absent; owned scratch removed; public cache retained. cleanup.json is final receipt. No case remains running or interrupted.
- Round result **Fail**, confidence57.14%, broader Required; full reconciliation/acceptance index in api-e2e-execution-coverage-report.md. N03 fixture correction is test-owned, not a production fix. FUP001 retained unchanged; no repeated follow-up.

- 2026-10-13T19:37:42Z **Round Completed** — Reports, final scores and all ledger cases reconciled; API-F001 awaiting focused failure-origin review.

## Round 2 / API-REV-002 — initialized before execution
Previous round and raw events above retained. No prior-failure resolution yet.

| Case ID | Round2 expected | Initial status |
| --- | --- | --- |
| V02-repro | Fresh current Mac create succeeds alone under077; no reconnect, same source/UUID/modes/job | Not Tested |
| V01 | Second separate fresh nativeMac create confirms corrected path | Not Tested |
| N01 | Current Go race/vet/packaging preserve activation/fatal/error/private-mode contracts | Not Tested |
| V02 | Two nativeMac clients same backing source, healthy operations/retry/restart/detach; Docker where safe | Not Tested |
| V03 | Ubuntu24ext4 native/Docker storage and clients; independent physical topology remains distinct | Not Tested |
| V04 | Current isolated desktop guide and mounted previews | Not Tested |
| V05 | Authorized actual native runtime/assets/peer close/restore matrix | Not Tested |


- 2026-10-14T04:12:16Z **Round2 V02-repro Started** — Fresh native macOS VM; real worktree CLI/root install/create. No released bootstrap claimed. ab-nfs-api002-37446d5f

- 2026-10-14T04:13:04Z **Round2 V02-repro Checkpoint** — fresh platform/source preflight: Pass

- 2026-10-14T04:13:17Z **Round2 V02-repro Checkpoint** — normal create under077 with real sudo/root/nonroot probe: Pass

- 2026-10-14T04:13:18Z **Round2 V02-repro Completed** — Pass fresh Mac create. Other mode, reboot/client, published installer and physical/inference claims remain unproven.

- 2026-10-14T04:13:19Z **Round2 V02-repro Checkpoint** — Cleanup recorded in the named result file; no host OS resource or user-node action.

- 2026-10-14T04:13:26Z **Round2 V01 Started** — Fresh native macOS VM; real worktree CLI/root install/create. No released bootstrap claimed. ab-nfs-api002-04979de5

- 2026-10-14T04:14:05Z **Round2 V01 Checkpoint** — fresh platform/source preflight: Pass

- 2026-10-14T04:14:28Z **Round2 V01 Checkpoint** — normal create under077 with real sudo/root/nonroot probe: Pass

- 2026-10-14T04:14:30Z **Round2 V01 Completed** — Pass fresh Mac create. Other mode, reboot/client, published installer and physical/inference claims remain unproven.

- 2026-10-14T04:14:30Z **Round2 V01 Checkpoint** — Cleanup recorded in the named result file; no host OS resource or user-node action.

- 2026-10-14T04:15:13Z **Round2 N01** — Starting go-race

- 2026-10-14T04:15:30Z **Round2 N01** — go-race: Pass

- 2026-10-14T04:15:30Z **Round2 N01** — Starting go-vet

- 2026-10-14T04:15:35Z **Round2 N01** — go-vet: Pass

- 2026-10-14T04:15:35Z **Round2 N01** — Starting python-bootstrap-launcher

- 2026-10-14T04:16:18Z **Round2 N01** — python-bootstrap-launcher: Pass

- **Round2 Prior failure resolution** — API-F001 resolved in V02-repro/V01 fresh current-source creates, no reconnect; N01 narrow checks pass with original skips. Full round not yet complete. Expanding V02 now.

- 2026-10-14T04:17:04Z **Round2 V02 Started** — Two fresh owned Mac VMs, unchanged development CLI, no user resources; ab-nfs-api002-ebe8a71b

- 2026-10-14T04:18:42Z **Round2 V02 Checkpoint** — storage create on original nonempty APFS source: Pass

- 2026-10-14T04:20:55Z **Round2 V02 Checkpoint** — second native Mac connects through product command: Fail

- 2026-10-14T04:20:55Z **Round2 V02 Completed** — Fail/incomplete: RuntimeError("No reachable local Docker daemon; no Docker nodes will be attached.\nAutoByteus NFS plan:\n - Attach 192.168.64.2:/Users/admin/ab-nfs-api002-ebe8a71b-source at /Volumes/autobyteus-shared\n - Install fixed root-owned launchd/systemd service; publish nonsecret binding descriptor\n - NFS is unencrypted host trust, NOT individual-user authentication; no router or firewall rules changed\n - Hard NFS may stall file operations, previews and unrelated work; no local fallback or outage deadline\nAutoByteus NFS incomplete: mount_nfs failed: exit status 60: mount_nfs: can't mount /Users/admin/ab-nfs-api002-ebe8a71b-source from 192.168.64.2 onto /Volumes/autobyteus-shared: Operation timed out\n\nAutoByteus NFS incomplete: exit status 1\n")

- 2026-10-14T04:20:58Z **Round2 V02 Checkpoint** — Exact resource cleanup receipt saved.

- **Round2 V02 environment finding** — source create Pass; peer connect Fail with unreachable same-subnet VM route (REJECT, ping Host is down), not a proven healthy-network product defect. Original fail/cleanup retained; later operations not reached. Private-LAN guest permission asked asynchronously; safe Linux preparation continues.

- 2026-10-14T04:25:14Z **Round2 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-14T04:26:48Z **Round2 V03 native** — Started fresh Ubuntu24 ext4/nonroot/source preflight

- 2026-10-14T04:26:48Z **Round2 V03 native** — fresh Ubuntu24 ext4/nonroot/source preflight: Pass

- 2026-10-14T04:26:48Z **Round2 V03 native** — Started one public native Ganesha create from nonempty original source

- 2026-10-14T04:27:06Z **Round2 V03 native** — one public native Ganesha create from nonempty original source: Fail

- 2026-10-14T04:27:06Z **Round2 V03 native** — Fail/incomplete RuntimeError('Detected private addresses: 192.168.64.4\nNo reachable local Docker daemon; no Docker nodes will be attached.\nAutoByteus NFS plan:\n - Ganesha NFSv4.1 TCP2049 only; persistent private recovery state\n - Export chosen source in place: /home/admin/ab-nfs-api002-linux-25fc064c-source\n - Map ALL clients to nonroot 1000:109; no recursive ownership change\n - Trust private hosts/subnets: 192.168.64.4\n - Attach 192.168.64.4:/autobyteus/a294c758-b1f7-40c9-84e5-6b9124671ae1 at /Volumes/autobyteus-shared\n - Install fixed root-owned launchd/systemd service; publish nonsecret binding descriptor\n - NFS is unencrypted host trust, NOT individual-user authentication; no router or firewall rules changed\n - Hard NFS may stall file operations, previews and unrelated work; no local fallback or outage deadline\n - Install exact Ubuntu NFS package versions from this release, if needed\nAutoByteus NFS incomplete: nonroot storage check incomplete: exit status 1: AutoByteus NFS incomplete: openat .autobyteus-nfs/storage.json: remote I/O error\n\nAutoByteus NFS incomplete: exit status 1\n')

- 2026-10-14T04:28:51Z **Round2 V03-repro Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-14T04:29:00Z **Round2 V03-repro native** — Started fresh Ubuntu24 ext4/nonroot/source preflight

- 2026-10-14T04:29:01Z **Round2 V03-repro native** — fresh Ubuntu24 ext4/nonroot/source preflight: Pass

- 2026-10-14T04:29:01Z **Round2 V03-repro native** — Started one public native Ganesha create from nonempty original source

- 2026-10-14T04:29:17Z **Round2 V03-repro native** — one public native Ganesha create from nonempty original source: Fail

- 2026-10-14T04:29:17Z **Round2 V03-repro native** — Fail/incomplete RuntimeError('Detected private addresses: 192.168.64.5\nNo reachable local Docker daemon; no Docker nodes will be attached.\nAutoByteus NFS plan:\n - Ganesha NFSv4.1 TCP2049 only; persistent private recovery state\n - Export chosen source in place: /home/admin/ab-nfs-api002-linux-5336c36d-source\n - Map ALL clients to nonroot 1000:109; no recursive ownership change\n - Trust private hosts/subnets: 192.168.64.5\n - Attach 192.168.64.5:/autobyteus/7f00baa9-8f2c-4163-aebf-59f03f3b7087 at /Volumes/autobyteus-shared\n - Install fixed root-owned launchd/systemd service; publish nonsecret binding descriptor\n - NFS is unencrypted host trust, NOT individual-user authentication; no router or firewall rules changed\n - Hard NFS may stall file operations, previews and unrelated work; no local fallback or outage deadline\n - Install exact Ubuntu NFS package versions from this release, if needed\nAutoByteus NFS incomplete: nonroot storage check incomplete: exit status 1: AutoByteus NFS incomplete: openat .autobyteus-nfs/storage.json: remote I/O error\n\nAutoByteus NFS incomplete: exit status 1\n')

- 2026-10-14T04:31:58Z **Round2 V03-repro diagnostic complete** — original/mounted ordinary reads and selected-identity strace, then public reconnect; linux-native-trace.json retained. Internal probe is diagnostic, not a replacement for public failing create.

- 2026-10-14T04:32:34Z **Round2 V03-repro diagnostic complete** — original/mounted ordinary reads and selected-identity strace, then public reconnect; linux-native-trace-corrected.json retained. Internal probe is diagnostic, not a replacement for public failing create.

- 2026-10-14T04:33:18Z **Round2 cleanup completed** — all six owned VM clones/processes absent; own toolchain/candidate/Linux-cache/scratch deleted; public Mac cache retained. cleanup.json.

## Round 2 / API-REV-002 final reconciliation

Prior API-F001 **Resolved first** in V02-repro/V01, current cold nativeMac creates with no reconnect. API001 historical Fail remains in Round1 entries. Completed evidence precedes new failure classification.

| Case | Final result | Reconciliation |
| --- | --- | --- |
| V02-repro | Pass | Fresh Mac11.571s; identity/bytes/UUID/modes/job and cleanup asserted |
| V01 | Pass | Separate fresh Mac22.772s, same scope; no recovery invocation |
| N01 | Pass with skips |7Go test packages race/vet; Python42enumerated/39pass/3skip; logs/narrow-checks-result.json |
| V02 | Blocked for healthy peer proof | Server createPass; peer rawFail/timeout retained, routeREJECT/Host is down. Environment gap, not proven healthy-network product defect; no bridge authorization used |
| V03 native | Fail | Public create17.258s, remoteI/Oerror nonroot marker; actual mount/pinned engine succeed. Public reconnectFail; ordinary mounted readsPass |
| V03-repro | Fail | Separate fresh create16.252s command; sameerror. Actual installed-binary selected-identity source probePass/mountprobeFail; publicreconnectFail |
| V03 remaining | Not Tested | DockerLinux storage/managedDocker clients/physical matrix paused for newfailure |
| V04/V05 | Not Tested | Current mounted desktop and actualnative runtime matrix paused; no credentials/inference |
| N02/N03/N04 | Prior evidence retained, not rerun | E1 scope/fixture correction/limits unchanged |

Diagnostic limitation: linux-native-trace.json used wrong guessed /usr/local/bin path, so both trace commands did not execute. Separate linux-native-trace-corrected.json uses product's actual /usr/libexec/autobyteus-nfs/autobyteus-nfs path; ordinary reads/installedhash pass, sourceprobe0, mountedprobe1/EREMOTEIO. Neither internal diagnostic replaces the two prior public create failures. Unexecuted later harness branches are not tested/green.

All6ownedclones/processes absent; ownscratch/candidate/Go/Linuxcache removed; publicMaccache retained, no userresources changed. No running/interrupted case remains. Final **Fail/57.14%**, new **API-F002/Unclear**, priorAPI-F001 resolved. Full canonicalreport/AC matrix current. Focusedfailureorigin routing, not successful-testreview. FUP001/D001 dispositions preserved.

- 2026-10-14T04:37:39Z **Round2 Completed** — API-REV-002 Fail57.14%; reports and cases reconciled, resources retired, focused failure-origin review required.

## Round 3 / API-REV-003 — initialized before execution
Prior result002 Fail57.14% retained. PriorAPI-F002 unresolved; API-F001 scoped resolution remains.

| Case | Expected | Initial status |
| --- | --- | --- |
| V03-repro | Fresh public bundled nativeUbuntu create/reconnect defaultY; original identity/bytes/UUID/modes/job intact | Not Tested |
| V03 | Remaining nativeLinux/DockerLinux storage/clients/operations/restart/detach/preservation | Not Tested |
| N01 | Current bundle/package/workflow/Go/bootstrap regressions | Not Tested |
| V01/V02 | Mac regression as affected; healthy native+managedDocker peers and lifecycle | Not Tested |
| V04 | Mounted current desktop previews/Guide | Not Tested |
| V05 | Authorized actualnative tools/supportassets/peerclose/restore/Standalone-Team-Org | Not Tested |

- Round3 setup started: exact retained engine verification/current metadata build and fresh owned Ubuntu resource are prerequisites, not API-F002 resolution.

- 2026-10-14T06:58:08Z **Round3 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-14T06:58:24Z **Round3 V03-repro** — Started fresh reference preflight and nonempty original source

- 2026-10-14T06:58:25Z **Round3 V03-repro** — fresh reference preflight and nonempty original source: Pass

- 2026-10-14T06:58:25Z **Round3 V03-repro** — Started one public bundled create under077 exact nonroot identity

- 2026-10-14T06:58:41Z **Round3 V03-repro** — one public bundled create under077 exact nonroot identity: Pass

- 2026-10-14T06:58:41Z **Round3 V03-repro** — Started original source identity and mounted bytes UUID defaultY

- 2026-10-14T06:58:42Z **Round3 V03-repro** — original source identity and mounted bytes UUID defaultY: Fail

- 2026-10-14T06:58:42Z **Round3 V03-repro** — Fail/incomplete RuntimeError('Traceback (most recent call last):\n  File "<string>", line 5, in <module>\n  File "/usr/lib/python3.12/pathlib.py", line 1029, in read_text\n    with self.open(mode=\'r\', encoding=encoding, errors=errors) as f:\n         ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\n  File "/usr/lib/python3.12/pathlib.py", line 1015, in open\n    return io.open(self, mode, buffering, encoding, errors, newline)\n           ^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^^\nFileNotFoundError: [Errno 2] No such file or directory: \'/sys/module/nfs/parameters/directory_delegations\'\n')

- Round3 first V03-repro: public createPass; overall harnessFail because wrong nfs versus nfsv4 sysfs path, reconnect not reached. Retain linux-public-result.json. New V03-confirm fresh clone planned with corrected diagnostic path only.

- 2026-10-14T06:59:22Z **Round3 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-14T06:59:31Z **Round3 V03-confirm** — Started fresh reference preflight and nonempty original source

- 2026-10-14T06:59:32Z **Round3 V03-confirm** — fresh reference preflight and nonempty original source: Pass

- 2026-10-14T06:59:32Z **Round3 V03-confirm** — Started one public bundled create under077 exact nonroot identity

- 2026-10-14T06:59:48Z **Round3 V03-confirm** — one public bundled create under077 exact nonroot identity: Pass

- 2026-10-14T06:59:48Z **Round3 V03-confirm** — Started original source identity and mounted bytes UUID defaultY

- 2026-10-14T06:59:48Z **Round3 V03-confirm** — original source identity and mounted bytes UUID defaultY: Pass

- 2026-10-14T06:59:48Z **Round3 V03-confirm** — Started installed exact engine private modes mask staging cleanup managed jobs

- 2026-10-14T06:59:48Z **Round3 V03-confirm** — installed exact engine private modes mask staging cleanup managed jobs: Pass

- 2026-10-14T06:59:48Z **Round3 V03-confirm** — Started public reconnect 1

- 2026-10-14T06:59:49Z **Round3 V03-confirm** — public reconnect 1: Pass

- 2026-10-14T06:59:49Z **Round3 V03-confirm** — Fail/incomplete KeyError('status')

- Round3 V03-confirm: create/identity/defaultY/modes/jobs and first public reconnect Pass; overall harnessFail at wrong wrapped-response assertion. linux-public-confirm-result.json retained. V03-final new fresh case planned with direct Status assertion.

- 2026-10-14T07:00:25Z **Round3 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-14T07:00:35Z **Round3 V03-final** — Started fresh reference preflight and nonempty original source

- 2026-10-14T07:00:35Z **Round3 V03-final** — fresh reference preflight and nonempty original source: Pass

- 2026-10-14T07:00:35Z **Round3 V03-final** — Started one public bundled create under077 exact nonroot identity

- 2026-10-14T07:00:52Z **Round3 V03-final** — one public bundled create under077 exact nonroot identity: Pass

- 2026-10-14T07:00:52Z **Round3 V03-final** — Started original source identity and mounted bytes UUID defaultY

- 2026-10-14T07:00:53Z **Round3 V03-final** — original source identity and mounted bytes UUID defaultY: Pass

- 2026-10-14T07:00:53Z **Round3 V03-final** — Started installed exact engine private modes mask staging cleanup managed jobs

- 2026-10-14T07:00:53Z **Round3 V03-final** — installed exact engine private modes mask staging cleanup managed jobs: Pass

- 2026-10-14T07:00:53Z **Round3 V03-final** — Started public reconnect 1

- 2026-10-14T07:00:53Z **Round3 V03-final** — public reconnect 1: Pass

- 2026-10-14T07:00:53Z **Round3 V03-final** — Started public reconnect 2

- 2026-10-14T07:00:54Z **Round3 V03-final** — public reconnect 2: Pass

- 2026-10-14T07:00:54Z **Round3 V03-final** — Started post reconnect original source and mounted identity preserved

- 2026-10-14T07:00:54Z **Round3 V03-final** — post reconnect original source and mounted identity preserved: Pass

- 2026-10-14T07:00:54Z **Round3 V03-final** — API-F002 resolved at fresh public nativeUbuntu create/reconnect scope; broader matrix still required

- 2026-10-14T07:01:37Z **Round3 Prior failure resolved FIRST** — API-F002 public create/reconnect corrected nativeUbuntu scopePass, two harness errors retained; N01 begins next.

- 2026-10-14T07:01:37Z **Round3 N01** — Starting go-race

- 2026-10-14T07:01:54Z **Round3 N01** — go-race: Pass

- 2026-10-14T07:01:54Z **Round3 N01** — Starting go-vet

- 2026-10-14T07:01:59Z **Round3 N01** — go-vet: Pass

- 2026-10-14T07:01:59Z **Round3 N01** — Starting python-bootstrap-launcher

- 2026-10-14T07:02:40Z **Round3 N01** — python-bootstrap-launcher: Pass

- Round3 N01 complete; postrepository57.14% broaderRequired. Planned V03-life: ordinary mounted operations, normal reboot/autoremount and drained detach preserving source/marker/private recovery. Not Tested until execution.

- 2026-10-14T07:03:24Z **Round3 V03-life** — Started normal mounted file operations and directory traversal

- 2026-10-14T07:03:25Z **Round3 V03-life** — normal mounted file operations and directory traversal: Pass

- 2026-10-14T07:03:25Z **Round3 V03-life** — Started normal guest reboot automatically restores same managed attachment

- 2026-10-14T07:04:02Z **Round3 V03-life** — normal guest reboot automatically restores same managed attachment: Fail

- 2026-10-14T07:04:02Z **Round3 V03-life** — Fail/incomplete RuntimeError('AutoByteus NFS incomplete: administrator setup declined\n')

- 2026-10-14T07:05:05Z **Round3 V03-life** — Started post normal reboot same managed attachment without manual reconnect

- 2026-10-14T07:05:05Z **Round3 V03-life** — post normal reboot same managed attachment without manual reconnect: Pass

- 2026-10-14T07:05:05Z **Round3 V03-life** — Started public drained detach

- 2026-10-14T07:05:06Z **Round3 V03-life** — public drained detach: Pass

- 2026-10-14T07:05:06Z **Round3 V03-life** — Started detach preserves original source marker bytes and recovery

- 2026-10-14T07:05:06Z **Round3 V03-life** — detach preserves original source marker bytes and recovery: Pass

- 2026-10-14T07:05:06Z **Round3 V03-life** — Native Linux self-client lifecycle passed with original operations plus corrected status invocation; not peer/physical/Docker proof

- Round3 V03-life reconciled Pass using original fileops + lifecycle-resume postboot/status/detach evidence. V03-docker-storage planned, own detached LinuxVM/source/image/registry only; no published artifact.

- 2026-10-14T07:06:27Z **Round3 V03-Docker prepare** — Started test-owned Docker prerequisite in owned detached LinuxVM

- 2026-10-14T07:06:41Z **Round3 V03-Docker prepare** — test-owned Docker prerequisite in owned detached LinuxVM: Pass

- 2026-10-14T07:06:42Z **Round3 V03-Docker prepare** — Started build storage image from exact retained engine pair

- 2026-10-14T07:07:22Z **Round3 V03-Docker prepare** — build storage image from exact retained engine pair: Pass

- 2026-10-14T07:07:22Z **Round3 V03-Docker prepare** — Started clean image package and manifest verification

- 2026-10-14T07:07:23Z **Round3 V03-Docker prepare** — clean image package and manifest verification: Pass

- 2026-10-14T07:07:23Z **Round3 V03-Docker prepare** — Started VM-loopback private test registry

- 2026-10-14T07:07:27Z **Round3 V03-Docker prepare** — VM-loopback private test registry: Pass

- 2026-10-14T07:07:27Z **Round3 V03-Docker prepare** — Started retain image under actual local-registry immutable digest

- 2026-10-14T07:07:28Z **Round3 V03-Docker prepare** — retain image under actual local-registry immutable digest: Pass

- 2026-10-14T07:07:28Z **Round3 V03-Docker prepare** — Docker storage image ready, test-only loopback digest recorded; no public create yet

- 2026-10-14T07:08:54Z **Round3 V03-Docker storage** — Started distinct nonempty ext4 source after drained native detach

- 2026-10-14T07:08:55Z **Round3 V03-Docker storage** — distinct nonempty ext4 source after drained native detach: Pass

- 2026-10-14T07:08:55Z **Round3 V03-Docker storage** — Started public Docker storage create from same immutable engine artifact

- 2026-10-14T07:08:56Z **Round3 V03-Docker storage** — public Docker storage create from same immutable engine artifact: Pass

- 2026-10-14T07:08:56Z **Round3 V03-Docker storage** — Started Docker-backed mounted same source identity UUID bytes nonroot/defaultY

- 2026-10-14T07:08:57Z **Round3 V03-Docker storage** — Docker-backed mounted same source identity UUID bytes nonroot/defaultY: Pass

- 2026-10-14T07:08:57Z **Round3 V03-Docker storage** — Started public Docker storage reconnect

- 2026-10-14T07:08:58Z **Round3 V03-Docker storage** — public Docker storage reconnect: Pass

- 2026-10-14T07:08:58Z **Round3 V03-Docker storage** — Docker-on-Linux storage create/reconnect native self-client Pass; managedDocker client not yet executed

- 2026-10-14T07:15:10Z **Round3 V03-Docker-life** — Started normal mounted file operations and directory traversal

- 2026-10-14T07:15:10Z **Round3 V03-Docker-life** — normal mounted file operations and directory traversal: Pass

- 2026-10-14T07:15:11Z **Round3 V03-Docker-life** — Started normal guest reboot automatically restores same managed attachment

- 2026-10-14T07:15:48Z **Round3 V03-Docker-life** — normal guest reboot automatically restores same managed attachment: Fail

- 2026-10-14T07:15:48Z **Round3 V03-Docker-life** — Fail/incomplete RuntimeError('AutoByteus NFS incomplete: another administrative operation is checking/incomplete; restore storage and wait: resource temporarily unavailable\nAutoByteus NFS incomplete: exit status 1\n')

- 2026-10-14T07:16:28Z **Round3 V03-Docker-life** — Started post normal reboot same managed attachment without manual reconnect

- 2026-10-14T07:16:28Z **Round3 V03-Docker-life** — post normal reboot same managed attachment without manual reconnect: Pass

- 2026-10-14T07:16:28Z **Round3 V03-Docker-life** — Started public drained detach

- 2026-10-14T07:16:29Z **Round3 V03-Docker-life** — public drained detach: Pass

- 2026-10-14T07:16:29Z **Round3 V03-Docker-life** — Started detach preserves original source marker bytes and recovery

- 2026-10-14T07:16:29Z **Round3 V03-Docker-life** — detach preserves original source marker bytes and recovery: Pass

- 2026-10-14T07:16:29Z **Round3 V03-Docker-life** — Docker storage self-client lifecycle passed after prior startup reconciliation completed; no manual reconnect; not peer/physical/managedDocker-client proof

- Round3 V03-Docker-life reconciled Pass: raw first postboot status met the documented administrative lock during the service nonroot probe one second after startup; separate resume observed finished reconciliation and actual readiness with no manual reconnect, then drained detach/source preservation Pass. Original raw failure retained, not suppressed.

- 2026-10-14T07:21:04Z **Round3 V03-Docker storage** — Current full-source server image built/transferred unchanged to owned Linux guest; local registry digest, isolated launcher home, loopback port policy ready

- 2026-10-14T07:21:24Z **Round3 V03-Docker storage** — Started actual current launcher first ordinary node

- 2026-10-14T07:21:27Z **Round3 V03-Docker storage** — actual current launcher first ordinary node: Pass

- 2026-10-14T07:21:27Z **Round3 V03-Docker storage** — Started real server health before NFS selection

- 2026-10-14T07:21:43Z **Round3 V03-Docker storage** — real server health before NFS selection: Pass

- 2026-10-14T07:21:43Z **Round3 V03-Docker storage** — Started actual current launcher second unselected node

- 2026-10-14T07:21:46Z **Round3 V03-Docker storage** — actual current launcher second unselected node: Pass

- 2026-10-14T07:21:57Z **Round3 V03-Docker storage** — Started seed synthetic private auth/data/browser sentinel bytes

- 2026-10-14T07:21:58Z **Round3 V03-Docker storage** — seed synthetic private auth/data/browser sentinel bytes: Pass

- 2026-10-14T07:21:58Z **Round3 V03-Docker storage** — Started ordinary custom network alias setup

- 2026-10-14T07:21:58Z **Round3 V03-Docker storage** — ordinary custom network alias setup: Pass

- 2026-10-14T07:21:59Z **Round3 V03-Docker storage** — Node setup incomplete AssertionError([{'HostIp': '0.0.0.0', 'HostPort': '5908'}, {'HostIp': '::', 'HostPort': '5908'}])

- 2026-10-14T07:23:06Z **Round3 V03-Docker storage** — Managed node fixture corrected before NFS: explicit loopback published bindings verified, current image/launcher private volumes retained; unselected stopped

- 2026-10-14T07:23:10Z **Round3 V03-Docker storage** — Started public create with exact chosen managed Docker client

- 2026-10-14T07:23:21Z **Round3 V03-Docker storage** — public create with exact chosen managed Docker client: Pass

- 2026-10-14T07:23:21Z **Round3 V03-Docker storage** — Started exact chosen image config private state ports aliases and unselected preservation

- 2026-10-14T07:23:22Z **Round3 V03-Docker storage** — exact chosen image config private state ports aliases and unselected preservation: Fail

- 2026-10-14T07:23:22Z **Round3 V03-Docker storage** — ManagedDocker client Fail/incomplete AssertionError()

- 2026-10-14T07:23:59Z **Round3 V03-Docker storage** — Started exact chosen image config private state ports aliases and unselected preservation

- 2026-10-14T07:23:59Z **Round3 V03-Docker storage** — exact chosen image config private state ports aliases and unselected preservation: Pass

- 2026-10-14T07:23:59Z **Round3 V03-Docker storage** — Started same original nonempty source and native mount identity preserved

- 2026-10-14T07:23:59Z **Round3 V03-Docker storage** — same original nonempty source and native mount identity preserved: Pass

- 2026-10-14T07:23:59Z **Round3 V03-Docker storage** — Started public reconnect with real managed node readiness

- 2026-10-14T07:24:00Z **Round3 V03-Docker storage** — public reconnect with real managed node readiness: Pass

- 2026-10-14T07:24:00Z **Round3 V03-Docker storage** — Linux managedDocker client create/reconnect exact preservation Pass; mounted file/API journeys next, not Mac/physical/paid-native proof

- 2026-10-14T07:26:13Z **Round3 V03-Docker storage** — Started seed original source project files and Git as actual selected nonroot user

- 2026-10-14T07:26:13Z **Round3 V03-Docker storage** — seed original source project files and Git as actual selected nonroot user: Pass

- 2026-10-14T07:26:13Z **Round3 V03-Docker storage** — Started actual running product HTTP GraphQL image HTML and PTY Git

- 2026-10-14T07:26:28Z **Round3 V03-Docker storage** — actual running product HTTP GraphQL image HTML and PTY Git: Fail

- 2026-10-14T07:26:28Z **Round3 V03-Docker storage** — Mounted API case Fail/incomplete RuntimeError('file:///app/[eval1]:22\n let combined=\'\';const receipt=new Promise((resolve,reject)=>{const timer=setTimeout(()=>reject(Error(\'terminal receipt timeout: \'+combined.slice(-1200))),15000);socket.on(\'message\',raw=>{let p;try{p=JSON.parse(raw.toString());}catch{return;}if(p.type===\'error\'){clearTimeout(timer);reject(Error(JSON.stringify(p)));return;}if(p.type!==\'output\')return;combined+=Buffer.from(p.data,\'base64\').toString();const m=combined.match(/(?:^|\\r?\\n)API003_RECEIPT:(\\{[^\\r\\n]*\\})/);if(m){clearTimeout(timer);resolve(JSON.parse(m[1]));}});});\n                                                                                                ^\n\nError: terminal receipt timeout: \x1b[?2004h/Volumes/autobyteus-shared/api-scenario $ python3 -c \'import os,subprocess,json; p=subprocess.run([\'\\\'\'git\'\\\'\',\'\\\'\'status\'\\\'\',\'\\\'\'--porcelain\'\\\'\'],capture_output=True,text=True); g=subprocess.run([\'\\\'\'git\'\\\'\',\'\\\'\'rev-parse\'\\\'\',\'\\\'\'--show-toplevel\'\\\'\'],capture_output=True,text=True); print(\'\\\'\'API003_\'\\\'\'+\'\\\'\'RECEIPT:\'\\\'\'+json.dumps({\'\\\'\'cwd\'\\\'\':os.getcwd(),\'\\\'\'uid\'\\\'\':os.getuid(),\'\\\'\'gitRc\'\\\'\':p.returncode,\'\\\'\'gitErr\'\\\'\':p.stderr,\'\\\'\'gitTop\'\\\'\':g.stdout.strip(),\'\\\'\'count\'\\\'\':os.getenv(\'\\\'\'GIT_CONFIG_COUNT\'\\\'\'),\'\\\'\'key0\'\\\'\':os.getenv(\'\\\'\'GIT_CONFIG_KEY_0\'\\\'\'),\'\\\'\'value0\'\\\'\':os.getenv(\'\\\'\'GIT_CONFIG_VALUE_0\'\\\'\')}))\'\r\n\x1b[?2004l\rAPI003_RECEIPT:{"cwd": "/Volumes/autobyteus-shared/api-scenario", "uid": 0, "gitRc": 0, "gitErr": "", "gitTop": "/Volumes/autobyteus-shared/api-scenario", "count": "1", "key0": "safe.directory", "value0": "/Volumes/autobyteus-shared/api-scenario"}\r\n\x1b[?2004h/Volumes/autobyteus-shared/api-scenario $ \n    at Timeout._onTimeout (file:///app/[eval1]:22:97)\n    at listOnTimeout (node:internal/timers:585:17)\n    at process.processTimers (node:internal/timers:521:7)\n\nNode.js v22.23.3\n')

- 2026-10-14T07:26:52Z **Round3 V03-Docker storage** — Started actual running product HTTP GraphQL image HTML and PTY Git

- 2026-10-14T07:26:53Z **Round3 V03-Docker storage** — actual running product HTTP GraphQL image HTML and PTY Git: Pass

- 2026-10-14T07:26:53Z **Round3 V03-Docker storage** — Mounted HTTP/GraphQL/relative static bytes and actual WebSocket PTY exact scoped Git/cwd Pass; not desktop rendering/model tools/independent peer

- 2026-10-14T07:27:20Z **Round3 V03-Docker storage** — Owned loopback tunnel incomplete RuntimeError('ssh-ed25519 AAAAC3NzaC1lZDI1NTE5AAAAIMW0sY8Cm8J1z/uKEE1W8Y8KBT2LSAQPWJsLZmxaF0wO root@ubuntu\ninactive\n')

- 2026-10-14T07:28:20Z **Round3 V03-Docker storage** — Host-to-owned-guest SSH loopback HTTP forwarding verified using own ephemeral key and guest-read host key; no VM peer route/bridge workaround

- 2026-10-14T07:29:44Z **Round3 V03-Docker storage** — Started ordinary public API create/write/rename/read/delete reaches original source and all-squash owner

- 2026-10-14T07:29:44Z **Round3 V03-Docker storage** — ordinary public API create/write/rename/read/delete reaches original source and all-squash owner: Pass

- 2026-10-14T07:29:44Z **Round3 V03-Docker storage** — Started healthy mounted static route reopens externally replaced and deleted file

- 2026-10-14T07:29:44Z **Round3 V03-Docker storage** — healthy mounted static route reopens externally replaced and deleted file: Pass

- 2026-10-14T07:29:44Z **Round3 V03-Docker storage** — Mounted API CRUD/rename/delete and original-source external replacement/deletion freshness Pass; no independent peer claimed

- 2026-10-14T07:30:18Z **Round3 V03-Docker storage** — Started native host NFS lock excludes managedDocker NFS volume client

- 2026-10-14T07:30:18Z **Round3 V03-Docker storage** — native host NFS lock excludes managedDocker NFS volume client: Pass

- 2026-10-14T07:30:18Z **Round3 V03-Docker storage** — Started managedDocker client acquires same lock after ordinary host release

- 2026-10-14T07:30:18Z **Round3 V03-Docker storage** — managedDocker client acquires same lock after ordinary host release: Pass

- 2026-10-14T07:30:18Z **Round3 V03-Docker storage** — Real native-host and Docker-volume NFS mount clients serialize POSIX record locks; same kernel/VM, not independent physical peer certification

- 2026-10-14T07:38:26Z **Round3 V04 partial Pass** — new isolated current-worktree Mac desktop, current Linux Docker NFS client: actual Nodes Guide unavailable/copy-disabled/warnings, registered remote node, Files workspace selection, mounted HTML+relative image decoded (fixture postMessage exact origin/frame), native image preview1x1, source-side external text invisible before refresh but visible/current after Files reopen. No provider turn or completed-agent artifact. Own desktop stopped and SSH tunnel retired; VM/node remain for lifecycle. Evidence desktop-validation-result.json and desktop-* raw actions/screenshots.

- 2026-10-14T07:39:21Z **Round3 V03-Docker storage** — Started normal selected Docker node restart

- 2026-10-14T07:39:24Z **Round3 V03-Docker storage** — normal selected Docker node restart: Pass

- 2026-10-14T07:39:24Z **Round3 V03-Docker storage** — Started same node automatically healthy after Docker restart

- 2026-10-14T07:39:28Z **Round3 V03-Docker storage** — same node automatically healthy after Docker restart: Pass

- 2026-10-14T07:39:28Z **Round3 V03-Docker storage** — Started Docker restart preserves exact image node config private mounts ports aliases and unselected node

- 2026-10-14T07:39:30Z **Round3 V03-Docker storage** — Docker restart preserves exact image node config private mounts ports aliases and unselected node: Pass

- 2026-10-14T07:39:30Z **Round3 V03-Docker storage** — Started normal whole guest reboot restores host and selected managedDocker client without reconnect

- 2026-10-14T07:42:42Z **Round3 V03-Docker storage** — normal whole guest reboot restores host and selected managedDocker client without reconnect: Fail

- 2026-10-14T07:42:42Z **Round3 V03-Docker storage** — Managed lifecycle Fail/incomplete RuntimeError('No healthy automatic managed node and host readiness within observation window; no reconnect performed')


## Round3 final reconciliation — API-REV-003

- V03 prior API-F002 **resolved first** at fresh native public create/reconnect scope; all3 fresh create commands pass, final full assertion case Pass. Earlier wrong sysfs/status-shape harness failures retained.
- N01 **Pass with3 explicit skips**:7 Go packages/race/vet, Python52enumerated/49pass. Postrepository57.14%, broaderRequired.
- V03 native and DockerLinux storage/native self-client file operations, normal reboot/remount and drained detach **Pass** with corrected status invocation/timing; raw initial harness refusals retained.
- V03 Linux managedDocker create/reconnect/private/image/config/volumes/ports/alias/unselected preservation, actual mounted APIs/PTYGit/record locks **Pass at stated scope**. Mounts-order and PTY bareCR parser corrections preserve raw results. Same VM/kernel, not independent physical peers.
- V04 **Partial Pass**: actual current isolated Mac remote desktop Guide/HTML-relative image/image/text after visibility refresh. No completed-agent artifact, all media or unsaved-buffer proof; no automatic watcher guarantee. Desktop/tunnel retired.
- V03 selected node `docker restart` and exact preservation **Pass**; normal whole-host `systemctl reboot` **Fail API-F003**. Read-only diagnostics before manual repair; public reconnect leaves stopped. Diagnostic-only manual start restores exact node; second ordinary reboot **reproduces Fail**. AC007/014/018/019, SCN009/013. This is not deferred outage isolation or healthy-peer routing.
- V01/V02 remaining Mac clients/peer/physical scenarios and V05 actual native runtimes/assets/close/restore/Standalone-Team-Org **Not Tested this round**; carried peer environment blocker remains. No user-only waiver/paid inference/host-network authorization inferred.
- Other setup-only raw errors: tracked-public-env filename guard, redundant growpart after successful autoexpansion, guest Docker defaultbinding assumption corrected before NFS, socket-versus-service ssh readiness, one UI selector miss. No product findings from these; all retained.
- Final round **Fail57.14%, broaderRequired**; new API-F003 preliminaryUnclear, focused failure-origin review required. No successful test-code/Delivery qualification. Cleanup receipts reconciled separately; raw snapshot-only Running metadata is not a live unfinished case.

- **Round3 cleanup complete** — public detach rc0 and stopped-state/private/source preservation confirmed read-only. Initial cleanup assertion error preserved (Docker pre-boot Dns:null vs post-boot Dns:[], already present before detach; expected owned recreation label). All3 LinuxVM clones/processes, own desktop/tunnel, host image tag/audit container and scratch absent. Public cache/IR005candidate/five generated trees retained. Final API003 Fail57.14%; no running test case.

## Round4 planned — API003 remains latest completed result
| Case | Expected | Current |
|---|---|---|
| N01 | Current focused then full Go race/vet and Python launcher/packaging pass; explicit skips | Not Tested |
| V03-F003 | Fresh public selected create and TWO ordinary full-host reboots recover automatically with exact preservation | Not Tested |
| V03-controls | Normal Stop, policy=no, raw failed Stop/no-op guidance, unselected nodes preserved | Not Tested |
| V03-regressions | Node restart/launcher upgrade/drained detach/native no-node paths | Not Tested |
| V01/V02/V04/V05 remainder | Full approved supported matrix, authorized environments only | Not Tested |

- 2026-10-15T07:34:23Z **Round4 N01** — Starting go-race

- 2026-10-15T07:34:59Z **Round4 N01** — go-race: Pass

- 2026-10-15T07:34:59Z **Round4 N01** — Starting go-vet

- 2026-10-15T07:35:06Z **Round4 N01** — go-vet: Pass

- 2026-10-15T07:35:06Z **Round4 N01** — Starting python-bootstrap-launcher

- 2026-10-15T07:35:59Z **Round4 N01** — python-bootstrap-launcher: Pass

- 2026-10-15T07:38:25Z **Round4 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-15T07:38:34Z **Round4 V03-Docker prepare** — Started test-owned Docker prerequisite in owned detached LinuxVM

- 2026-10-15T07:38:56Z **Round4 V03-Docker prepare** — test-owned Docker prerequisite in owned detached LinuxVM: Pass

- 2026-10-15T07:38:57Z **Round4 V03-Docker prepare** — Started build storage image from exact retained engine pair

- 2026-10-15T07:39:36Z **Round4 V03-Docker prepare** — build storage image from exact retained engine pair: Pass

- 2026-10-15T07:39:36Z **Round4 V03-Docker prepare** — Started clean image package and manifest verification

- 2026-10-15T07:39:38Z **Round4 V03-Docker prepare** — clean image package and manifest verification: Pass

- 2026-10-15T07:39:38Z **Round4 V03-Docker prepare** — Started VM-loopback private test registry

- 2026-10-15T07:39:43Z **Round4 V03-Docker prepare** — VM-loopback private test registry: Pass

- 2026-10-15T07:39:43Z **Round4 V03-Docker prepare** — Started retain image under actual local-registry immutable digest

- 2026-10-15T07:39:44Z **Round4 V03-Docker prepare** — retain image under actual local-registry immutable digest: Pass

- 2026-10-15T07:39:44Z **Round4 V03-Docker prepare** — Docker storage image ready, test-only loopback digest recorded; no public create yet

- 2026-10-15T07:41:58Z **Round4 V03-Docker storage** — Current full-source server image built/transferred unchanged to owned Linux guest; local registry digest, isolated launcher home, loopback port policy ready

- 2026-10-15T07:41:58Z **Round4 V03-Docker storage** — Started actual current launcher first ordinary node

- 2026-10-15T07:42:01Z **Round4 V03-Docker storage** — actual current launcher first ordinary node: Pass

- 2026-10-15T07:42:01Z **Round4 V03-Docker storage** — Started real server health before NFS selection

- 2026-10-15T07:42:20Z **Round4 V03-Docker storage** — real server health before NFS selection: Pass

- 2026-10-15T07:42:20Z **Round4 V03-Docker storage** — Started actual current launcher second unselected node

- 2026-10-15T07:42:23Z **Round4 V03-Docker storage** — actual current launcher second unselected node: Pass

- 2026-10-15T07:42:34Z **Round4 V03-Docker storage** — Started seed synthetic private auth/data/browser sentinel bytes

- 2026-10-15T07:42:35Z **Round4 V03-Docker storage** — seed synthetic private auth/data/browser sentinel bytes: Pass

- 2026-10-15T07:42:35Z **Round4 V03-Docker storage** — Started ordinary custom network alias setup

- 2026-10-15T07:42:35Z **Round4 V03-Docker storage** — ordinary custom network alias setup: Pass

- 2026-10-15T07:42:36Z **Round4 V03-Docker storage** — Two exact current launcher nodes prepared; selected running/unselected stopped, loopback ports and synthetic private bytes recorded

- 2026-10-15T07:42:36Z **Round4 V03-Docker storage** — Started fresh nonempty ext4 source before first public setup

- 2026-10-15T07:42:36Z **Round4 V03-Docker storage** — fresh nonempty ext4 source before first public setup: Pass

- 2026-10-15T07:42:36Z **Round4 V03-Docker storage** — Started one fresh public selected Docker create

- 2026-10-15T07:42:57Z **Round4 V03-Docker storage** — one fresh public selected Docker create: Pass

- 2026-10-15T07:42:57Z **Round4 V03-Docker storage** — Started exact chosen image config private state ports aliases and unselected preservation

- 2026-10-15T07:42:58Z **Round4 V03-Docker storage** — exact chosen image config private state ports aliases and unselected preservation: Fail

- 2026-10-15T07:42:58Z **Round4 V03-Docker storage** — ManagedDocker client Fail/incomplete AssertionError()

- 2026-10-15T07:44:18Z **Round4 V03-Docker storage** — Started exact chosen image config private state ports aliases and unselected preservation

- 2026-10-15T07:44:19Z **Round4 V03-Docker storage** — exact chosen image config private state ports aliases and unselected preservation: Pass

- 2026-10-15T07:44:19Z **Round4 V03-Docker storage** — Started same original nonempty source and native mount identity preserved

- 2026-10-15T07:44:19Z **Round4 V03-Docker storage** — same original nonempty source and native mount identity preserved: Pass

- 2026-10-15T07:44:19Z **Round4 V03-Docker storage** — Started installed identity private modes and active managed job

- 2026-10-15T07:44:19Z **Round4 V03-Docker storage** — installed identity private modes and active managed job: Pass

- 2026-10-15T07:44:19Z **Round4 V03-Docker storage** — Fresh selected public create Pass; no reconnect performed; ordinary two whole-host reboots next

- 2026-10-15T07:44:20Z **Round4 V03-Docker storage** — Started ordinary whole-host reboot 1 automatic actual readiness

- 2026-10-15T07:45:20Z **Round4 V03-Docker storage** — ordinary whole-host reboot 1 automatic actual readiness: Pass

- 2026-10-15T07:45:20Z **Round4 V03-Docker storage** — Started reboot 1 same ID/image/config/private/source/mounted API preservation

- 2026-10-15T07:45:21Z **Round4 V03-Docker storage** — reboot 1 same ID/image/config/private/source/mounted API preservation: Pass

- 2026-10-15T07:45:21Z **Round4 V03-Docker storage** — Started ordinary whole-host reboot 2 automatic actual readiness

- 2026-10-15T07:46:21Z **Round4 V03-Docker storage** — ordinary whole-host reboot 2 automatic actual readiness: Pass

- 2026-10-15T07:46:21Z **Round4 V03-Docker storage** — Started reboot 2 same ID/image/config/private/source/mounted API preservation

- 2026-10-15T07:46:22Z **Round4 V03-Docker storage** — reboot 2 same ID/image/config/private/source/mounted API preservation: Pass

- 2026-10-15T07:46:22Z **Round4 V03-Docker storage** — Two fresh ordinary full-host reboots automatic readiness and exact preservation PASS; no manual Start/reconnect. Controls still required.

- 2026-10-15T07:46:42Z **Round4 V03-Docker storage** — Started ordinary actual healthy state before Stop

- 2026-10-15T07:46:43Z **Round4 V03-Docker storage** — ordinary actual healthy state before Stop: Pass

- 2026-10-15T07:46:43Z **Round4 V03-Docker storage** — Started current public launcher Stop on successfully running selected node

- 2026-10-15T07:46:46Z **Round4 V03-Docker storage** — current public launcher Stop on successfully running selected node: Pass

- 2026-10-15T07:46:46Z **Round4 V03-Docker storage** — Started ordinary Stop state and read-only status

- 2026-10-15T07:46:47Z **Round4 V03-Docker storage** — ordinary Stop state and read-only status: Pass

- 2026-10-15T07:46:47Z **Round4 V03-Docker storage** — Observe two existing30-second service ticks after normal Stop

- 2026-10-15T07:47:52Z **Round4 V03-Docker storage** — Started normal Stop preserved across service ticks

- 2026-10-15T07:47:52Z **Round4 V03-Docker storage** — normal Stop preserved across service ticks: Pass

- 2026-10-15T07:47:52Z **Round4 V03-Docker storage** — Started confirmed public reconnect does not override normal Stop

- 2026-10-15T07:47:53Z **Round4 V03-Docker storage** — confirmed public reconnect does not override normal Stop: Pass

- 2026-10-15T07:47:53Z **Round4 V03-Docker storage** — Started normal Stop preserved after confirmed reconnect

- 2026-10-15T07:47:53Z **Round4 V03-Docker storage** — normal Stop preserved after confirmed reconnect: Pass

- 2026-10-15T07:49:34Z **Round4 V03-Docker storage** — Started normal unless-stopped Stop remains stopped after whole-host reboot and ticks

- 2026-10-15T07:49:35Z **Round4 V03-Docker storage** — normal unless-stopped Stop remains stopped after whole-host reboot and ticks: Pass

- 2026-10-15T07:49:35Z **Round4 V03-Docker storage** — Normal-running Stop / ticks / confirmed reconnect / ordinary reboot veto PASS. No failed-stop policy control inferred.

- 2026-10-15T07:50:24Z **Round4 V03-Docker storage** — Started control only: hold owned attachment completion job for serial failed-start inspection

- 2026-10-15T07:50:25Z **Round4 V03-Docker storage** — control only: hold owned attachment completion job for serial failed-start inspection: Pass

- 2026-10-15T07:50:25Z **Round4 V03-Docker storage** — Started explicit user Start of normally stopped node to prepare distinct policy control

- 2026-10-15T07:50:26Z **Round4 V03-Docker storage** — explicit user Start of normally stopped node to prepare distinct policy control: Pass

- 2026-10-15T07:50:26Z **Round4 V03-Docker storage** — Started control starts from genuinely running healthy selected node

- 2026-10-15T07:50:32Z **Round4 V03-Docker storage** — control starts from genuinely running healthy selected node: Pass

- 2026-10-15T07:50:32Z **Round4 V03-Docker storage** — Started ordinary reboot with attachment job held for serial operator inspection

- 2026-10-15T07:51:10Z **Round4 V03-Docker storage** — ordinary reboot with attachment job held for serial operator inspection: Pass

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — Captured real ordinary Docker NFS pre-process connection-refused start; job held, no synthetic state

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — Started raw Stop on already-failed node is a Docker no-op

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — raw Stop on already-failed node is a Docker no-op: Pass

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — Started current launcher reports no-op/policy guidance, not cancellation promise

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — current launcher reports no-op/policy guidance, not cancellation promise: Pass

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — Started operator explicitly selects current restart=no durable veto

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — operator explicitly selects current restart=no durable veto: Pass

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — Started restore original owned attachment service with existing configuration

- 2026-10-15T07:51:41Z **Round4 V03-Docker storage** — restore original owned attachment service with existing configuration: Pass

- 2026-10-15T07:52:46Z **Round4 V03-Docker storage** — Started policy=no suppresses automatic completion while host becomes ready

- 2026-10-15T07:52:47Z **Round4 V03-Docker storage** — policy=no suppresses automatic completion while host becomes ready: Pass

- 2026-10-15T07:52:47Z **Round4 V03-Docker storage** — Started confirmed public reconnect cannot override current policy=no

- 2026-10-15T07:52:48Z **Round4 V03-Docker storage** — confirmed public reconnect cannot override current policy=no: Pass

- 2026-10-15T07:52:48Z **Round4 V03-Docker storage** — Started policy veto exact stopped-state preservation after explicit reconnect

- 2026-10-15T07:52:48Z **Round4 V03-Docker storage** — policy veto exact stopped-state preservation after explicit reconnect: Pass

- 2026-10-15T07:52:48Z **Round4 V03-Docker storage** — Started ordinary reboot after durable veto with original attachment job enabled

- 2026-10-15T07:53:25Z **Round4 V03-Docker storage** — ordinary reboot after durable veto with original attachment job enabled: Pass

- 2026-10-15T07:54:30Z **Round4 V03-Docker storage** — Started policy=no remains veto across reboot and service ticks

- 2026-10-15T07:54:31Z **Round4 V03-Docker storage** — policy=no remains veto across reboot and service ticks: Pass

- 2026-10-15T07:54:31Z **Round4 V03-Docker storage** — Captured failed-start raw Stop no-op/guidance and current restart=no automatic/explicit/reboot veto PASS

- 2026-10-15T07:54:42Z **Round4 V03-Docker storage** — Started explicit operator restores original unless-stopped policy and starts node for restart regression

- 2026-10-15T07:54:43Z **Round4 V03-Docker storage** — explicit operator restores original unless-stopped policy and starts node for restart regression: Pass

- 2026-10-15T07:54:43Z **Round4 V03-Docker storage** — Started restored explicit running state actual API ready

- 2026-10-15T07:54:49Z **Round4 V03-Docker storage** — restored explicit running state actual API ready: Pass

- 2026-10-15T07:54:49Z **Round4 V03-Docker storage** — Started ordinary Docker node restart

- 2026-10-15T07:54:52Z **Round4 V03-Docker storage** — ordinary Docker node restart: Pass

- 2026-10-15T07:54:52Z **Round4 V03-Docker storage** — Started ordinary node restart readiness

- 2026-10-15T07:54:56Z **Round4 V03-Docker storage** — ordinary node restart readiness: Pass

- 2026-10-15T07:54:56Z **Round4 V03-Docker storage** — Started ordinary node restart exact original selected state preservation

- 2026-10-15T07:54:58Z **Round4 V03-Docker storage** — ordinary node restart exact original selected state preservation: Pass

- 2026-10-15T07:54:58Z **Round4 V03-Docker storage** — Started test-only registry and isolated HOME current helper prerequisites

- 2026-10-15T07:54:58Z **Round4 V03-Docker storage** — test-only registry and isolated HOME current helper prerequisites: Pass

- 2026-10-15T07:54:58Z **Round4 V03-Docker storage** — Started actual public launcher upgrade --all against same immutable current worktree image

- 2026-10-15T07:55:05Z **Round4 V03-Docker storage** — actual public launcher upgrade --all against same immutable current worktree image: Pass

- 2026-10-15T07:55:05Z **Round4 V03-Docker storage** — Started explicitly stop unselected fixture again after requested upgrade --all

- 2026-10-15T07:55:10Z **Round4 V03-Docker storage** — explicitly stop unselected fixture again after requested upgrade --all: Pass

- 2026-10-15T07:55:11Z **Round4 V03-Docker storage** — Started current replacement admitted by existing selected node reference

- 2026-10-15T07:55:11Z **Round4 V03-Docker storage** — current replacement admitted by existing selected node reference: Pass

- 2026-10-15T07:55:11Z **Round4 V03-Docker storage** — Started new current container private bytes mounted APIs source and exact state baseline

- 2026-10-15T07:55:12Z **Round4 V03-Docker storage** — new current container private bytes mounted APIs source and exact state baseline: Pass

- 2026-10-15T07:55:12Z **Round4 V03-Docker storage** — Started ordinary reboot resolves current replacement rather than old recreation receipt ID

- 2026-10-15T07:56:13Z **Round4 V03-Docker storage** — ordinary reboot resolves current replacement rather than old recreation receipt ID: Pass

- 2026-10-15T07:56:13Z **Round4 V03-Docker storage** — Started replacement automatic boot same current ID private and mounted data preservation

- 2026-10-15T07:56:14Z **Round4 V03-Docker storage** — replacement automatic boot same current ID private and mounted data preservation: Pass

- 2026-10-15T07:56:14Z **Round4 V03-Docker storage** — Node restart and actual public launcher replacement/current-ref ordinary boot PASS. Upgrade-all has its documented own configuration policy, not unchanged opaque-config proof.

- 2026-10-15T07:57:18Z **Round4 V03-Docker storage** — Started explicitly drain own selected test node before safe detach

- 2026-10-15T07:57:22Z **Round4 V03-Docker storage** — explicitly drain own selected test node before safe detach: Pass

- 2026-10-15T07:57:23Z **Round4 V03-Docker storage** — Started public detach --yes --drained through installed owner

- 2026-10-15T07:57:24Z **Round4 V03-Docker storage** — public detach --yes --drained through installed owner: Pass

- 2026-10-15T07:57:24Z **Round4 V03-Docker storage** — Started drained detach current config private/source preservation and exact attempt removal

- 2026-10-15T07:57:24Z **Round4 V03-Docker storage** — drained detach current config private/source preservation and exact attempt removal: Fail

- 2026-10-15T07:57:24Z **Round4 V03-Docker storage** — Detach regression Fail/incomplete AssertionError()

- 2026-10-15T07:59:28Z **Round4 V03-Docker storage** — Started drained detach current config private/source preservation and exact attempt removal

- 2026-10-15T07:59:30Z **Round4 V03-Docker storage** — drained detach current config private/source preservation and exact attempt removal: Pass

- 2026-10-15T07:59:30Z **Round4 V03-Docker storage** — Selected drained detach preserves current opaque state/source/private bytes and removes exact bounded attempt PASS

- 2026-10-15T07:59:30Z **Round4 V03-Docker storage** — Started native regression starts detached, no host Ganesha engine preinstallation

- 2026-10-15T07:59:30Z **Round4 V03-Docker storage** — native regression starts detached, no host Ganesha engine preinstallation: Pass

- 2026-10-15T07:59:30Z **Round4 V03-Docker storage** — Started public native storage create no selected nodes and exact Mac peer allowlist

- 2026-10-15T07:59:40Z **Round4 V03-Docker storage** — public native storage create no selected nodes and exact Mac peer allowlist: Pass

- 2026-10-15T07:59:40Z **Round4 V03-Docker storage** — Started native original identity bytes UUID and real nonroot defaultY

- 2026-10-15T07:59:40Z **Round4 V03-Docker storage** — native original identity bytes UUID and real nonroot defaultY: Pass

- 2026-10-15T07:59:40Z **Round4 V03-Docker storage** — Started public native no-node reconnect through current owner

- 2026-10-15T07:59:41Z **Round4 V03-Docker storage** — public native no-node reconnect through current owner: Pass

- 2026-10-15T07:59:41Z **Round4 V03-Docker storage** — Started native package private mode managed job and installed binary identity

- 2026-10-15T07:59:41Z **Round4 V03-Docker storage** — native package private mode managed job and installed binary identity: Pass

- 2026-10-15T07:59:41Z **Round4 V03-Docker storage** — Native/peer regression Fail/incomplete AssertionError()

- 2026-10-15T08:00:31Z **Round4 V03-Docker storage** — Started native package private mode managed job and installed binary identity

- 2026-10-15T08:00:32Z **Round4 V03-Docker storage** — native package private mode managed job and installed binary identity: Pass

- 2026-10-15T08:00:32Z **Round4 V03-Docker storage** — Native current public no-node create/reconnect regression Pass; source identity/no preinstalled engine/defaultY retained

- 2026-10-15T08:00:39Z **Round4 V03-Docker storage** — Ordinary shared-NAT Mac-to-Linux TCP2049 unreachable; no host bridge/router/firewall/ARP workaround authorized. No mount attempted on known unhealthy path.

- 2026-10-15T08:02:04Z **Round4 V01 Mac-native** — Started fresh nonempty owned APFS source

- 2026-10-15T08:02:05Z **Round4 V01 Mac-native** — fresh nonempty owned APFS source: Pass

- 2026-10-15T08:02:05Z **Round4 V01 Mac-native** — Started one public nativeMac create under077 no selected nodes

- 2026-10-15T08:02:17Z **Round4 V01 Mac-native** — one public nativeMac create under077 no selected nodes: Pass

- 2026-10-15T08:02:17Z **Round4 V01 Mac-native** — Started Mac original/mounted identity bytes UUID private modes installed binary running job

- 2026-10-15T08:02:17Z **Round4 V01 Mac-native** — Mac original/mounted identity bytes UUID private modes installed binary running job: Pass

- 2026-10-15T08:02:53Z **Round4 V01 Mac-native** — Started nativeMac ordinary reboot automatically preserves exact source and job

- 2026-10-15T08:03:07Z **Round4 V01 Mac-native** — nativeMac ordinary reboot automatically preserves exact source and job: Pass

- 2026-10-15T08:03:07Z **Round4 V01 Mac-native** — Started explicit normal nativeMac reconnect

- 2026-10-15T08:03:16Z **Round4 V01 Mac-native** — explicit normal nativeMac reconnect: Pass

- 2026-10-15T08:03:16Z **Round4 V01 Mac-native** — Started reconnect preserves nativeMac source

- 2026-10-15T08:03:17Z **Round4 V01 Mac-native** — reconnect preserves nativeMac source: Pass

- 2026-10-15T08:03:17Z **Round4 V01 Mac-native** — Started nativeMac public drained detach

- 2026-10-15T08:03:18Z **Round4 V01 Mac-native** — nativeMac public drained detach: Pass

- 2026-10-15T08:03:18Z **Round4 V01 Mac-native** — Started nativeMac detach source preservation and no owned attachment/job

- 2026-10-15T08:03:19Z **Round4 V01 Mac-native** — nativeMac detach source preservation and no owned attachment/job: Pass

- 2026-10-15T08:03:19Z **Round4 V01 Mac-native** — Current nativeMac fresh create/ordinary reboot/reconnect/drained detach Pass; no independent peer/DockerDesktop/physical qualification

- 2026-10-15T08:04:35Z **Round4 V03-Docker storage** — Started explicit start owned current node before native storage selection

- 2026-10-15T08:04:36Z **Round4 V03-Docker storage** — explicit start owned current node before native storage selection: Pass

- 2026-10-15T08:04:37Z **Round4 V03-Docker storage** — Started public native create selects existing current managed Docker client

- 2026-10-15T08:04:37Z **Round4 V03-Docker storage** — public native create selects existing current managed Docker client: Fail

- 2026-10-15T08:04:37Z **Round4 V03-Docker storage** — Native managed client Fail/incomplete RuntimeError('Detected private addresses: 192.168.64.4, 172.18.0.1, 172.17.0.1\nLocal managed Docker nodes: autobyteus-server-0, autobyteus-server-1\nAutoByteus NFS incomplete: already configured; use status/reconnect/detach\nAutoByteus NFS incomplete: exit status 1\n')

- Round4 native-client setup correction: initial public create was correctly refused because the prior no-node attachment still existed (raw `native-client-result.json`). This is a harness journey error, not a supported idempotent-create defect. Use normal public detach then create with the same source and explicit selected node; retain UUID/source/private/config assertions (`native-client-harness-delta.json`).

- 2026-10-15T08:08:32Z **Round4 V03-Docker storage** — Started explicit start owned current node before native storage selection

- 2026-10-15T08:08:32Z **Round4 V03-Docker storage** — explicit start owned current node before native storage selection: Pass

- 2026-10-15T08:08:33Z **Round4 V03-Docker storage** — Started public detach existing no-node attachment before changing selected set

- 2026-10-15T08:08:33Z **Round4 V03-Docker storage** — public detach existing no-node attachment before changing selected set: Pass

- 2026-10-15T08:08:33Z **Round4 V03-Docker storage** — Started public native create selects existing current managed Docker client

- 2026-10-15T08:08:45Z **Round4 V03-Docker storage** — public native create selects existing current managed Docker client: Pass

- 2026-10-15T08:08:46Z **Round4 V03-Docker storage** — Linux native-storage managedDocker client actual public admission and current private/source/config preservation Pass; no peer/physical claim

- 2026-10-15T08:09:27Z **Round4 V03-Docker storage** — V04 deterministic healthy mounted fixtures bytes verified in actual managed node; no actual-agent completed artifact claim

- 2026-10-15T08:09:29Z **Round4 V03-Docker storage** — Host-to-owned-guest SSH loopback HTTP forwarding verified using own ephemeral key and guest-read host key; no VM peer route/bridge workaround

- Round4 API-F003 scoped resolution: independently fresh public selected setup and TWO ordinary full Linux guest reboots pass without manual Start/reconnect; exact identity/private/source/API proofs, normal Stop, captured rawStop/restart=no veto, current-ref launcher replacement and safe detach are recorded in `evidence/api-e2e/api-rev-004/prior-failure-resolution.json`. API-REV003 remains historical Fail; current overall round result is not yet finalized. This does not qualify unexecuted Mac Docker/physical/peer/native-runtime/release paths.

- 2026-10-15T08:18:05Z **Round4 V03-Docker storage** — V04 external-change check AssertionError('healthy binary update not visible within approved5s after source close/fsync')

- Round4 V04 / candidate API-F004: first source-actor synced/closed135-byte PNG modification remained old at20 fresh mounted HTTP opens through5.010s (`preview-external-change-result.json`). AC-003/REQ-004/QR-001 explicitly require exact<=1MiB committed bytes within5s; unlike the invalidRange assertion this is an approved contract. No outage, no kernel/network policy edit. Reproduce unique fixtures and inspect actual cache/mount/engine configuration before routing; no unsupported timing race. Unsaved editor buffer remains visible, but immediate tree reload lacked source-created entry, so full reload proof is not yet Pass.

- 2026-10-15T08:21:16Z **Round4 V03-Docker storage** — V04 unique-fixture healthy visibility reproduction Fail

- 2026-10-15T08:23:02Z **Round4 V03-Docker storage** — Started explicitly drain own selected test node before safe detach

- 2026-10-15T08:23:06Z **Round4 V03-Docker storage** — explicitly drain own selected test node before safe detach: Pass

- 2026-10-15T08:23:06Z **Round4 V03-Docker storage** — Started public detach --yes --drained through installed owner

- 2026-10-15T08:23:07Z **Round4 V03-Docker storage** — public detach --yes --drained through installed owner: Pass

- 2026-10-15T08:23:07Z **Round4 V03-Docker storage** — Started drained detach current config private/source preservation and exact attempt removal

- 2026-10-15T08:23:08Z **Round4 V03-Docker storage** — drained detach current config private/source preservation and exact attempt removal: Pass

- 2026-10-15T08:23:08Z **Round4 V03-Docker storage** — Selected drained detach preserves current opaque state/source/private bytes and removes exact bounded attempt PASS


## API-REV-004 final reconciliation

- N01 Pass with3skips; N02–N04 historicalnotrerun. V01 nativeMac freshcreate/reboot/reconnect/detach Pass scoped. V02 independentpeer Blocked ordinaryNAT. V03 selectedDockerstorage/client fresh2boots/Stop/veto/nodeRestart/upgrade/currentref/detach Pass:API-F003 resolvedatthisscope. V03nativeLinux no-node/selectedclient/safedetach Pass withno freshengineabsenceguardcredit.
- V04 currentdesktop mountedPNG/audio/video/PDF/Markdown/HTMLrelative/static/GraphQL Passscoped. Unsavedbufferpreservedthroughlaterexplicitreload andcurrentexternalnotes afterdeliberatediscard; originalearlytree/content stalechecks retained. Noactualcompletedagentartifact/nativeproviderturn. SyntheticbrowserEditContextinput nottrustedOSkeystrokes.
- **V03/V04 API-F004 Fail**: original135bytePNG oldthrough5.010s; two1024byteunique sourcefsync/close trials nativeNFS+realDockerHTTP firstexactnewbytes61.149s/60.975s. LaterfreshnessNOTPassfor5sAC003. Matchingsource60sdefault clue, originUnclear. Stopremainingmatrixexpansion forfocusedreview.
- V05/nativeactualtools/unreadassets/peerclose/restore/Standalone-Team-Org, MacmanagedDockerclient, independentphysical/healthyprivatepeer/release surfaces remainNotTested/dependency-limited; onlyMacDockerSTORAGEdeferred. No user-onlywaiver.
- Generic helper `V03-Docker storage` event label later includes explicitlyidentifiednative/UI probes; rawenvelopeidentity corrected in evidence-identity-corrections.json, actualargv/installedhash/sourceUUID govern. Allharnessfailuresretained, notproductfindings exceptAPI-F004.
- CleanupComplete: mac-cleanup.json, native-detach-result.json, desktop-validation-result.json, cleanup.json. No case leftRunning; allownedVM/app/tunnel/tag/scratch removed. Fullcurrentreport confidence57.14% Fail/broaderRequired; no TaskDone/release/userverification.

## Round5 plan — API-REV-005 (in progress, prior result remains authoritative)
|Case|Expected|State|
|---|---|---|
|N01|Current7package race/vet + relevant Python clean isolated checks|Not Tested|
|API-F004|Fresh public native storage+managedHTTP warmed1KiB/1MiB writes/reconnect exact<=5s, same source/private identity|Not Tested|
|V03-Docker|Current actualDocker storage+native/managedclient freshness and operations|Not Tested|
|V03-Lifecycle|Ordinary boots/Stop/policy/upgrade/detach preservation regression|Not Tested|
|V01/V02|Macnative and bothOS clients/independentpeer matrix|Not Tested|
|V04|Current mounted desktop healthy preview/explorer/completedartifact|Not Tested|
|V05|Native tools/unreadlinkedassets/peerclose/restore/Standalone-Team-Org|Not Tested|
|Cleanup|Only owned processes/data/clones/tags removed; retainedcandidate inventory unchanged|Not Tested|

- 2026-10-15T10:01:24Z **Round5 N01** — Starting go-race

- 2026-10-15T10:01:58Z **Round5 N01** — go-race: Pass

- 2026-10-15T10:01:58Z **Round5 N01** — Starting go-vet

- 2026-10-15T10:02:04Z **Round5 N01** — go-vet: Pass

- 2026-10-15T10:02:04Z **Round5 N01** — Starting python-bootstrap-launcher

- 2026-10-15T10:02:50Z **Round5 N01** — python-bootstrap-launcher: Pass

- 2026-10-15T10:05:47Z **Round5 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-15T10:05:57Z **Round5** — Started fresh owned guest has no NFS installation or attachment

- 2026-10-15T10:05:57Z **Round5** — fresh owned guest has no NFS installation or attachment: Pass

- 2026-10-15T10:05:57Z **Round5** — Started Docker only prerequisite in own fresh guest

- 2026-10-15T10:06:19Z **Round5** — Docker only prerequisite in own fresh guest: Pass

- 2026-10-15T10:06:19Z **Round5** — Started private guest loopback registry for current candidate image only

- 2026-10-15T10:06:24Z **Round5** — private guest loopback registry for current candidate image only: Pass

- 2026-10-15T10:08:08Z **Round5** — Current full-source server image built/transferred unchanged to owned Linux guest; local registry digest, isolated launcher home, loopback port policy ready

- 2026-10-15T10:08:08Z **Round5** — Started actual current launcher first ordinary node

- 2026-10-15T10:08:11Z **Round5** — actual current launcher first ordinary node: Pass

- 2026-10-15T10:08:12Z **Round5** — Started real server health before NFS selection

- 2026-10-15T10:08:28Z **Round5** — real server health before NFS selection: Pass

- 2026-10-15T10:08:28Z **Round5** — Started actual current launcher second unselected node

- 2026-10-15T10:08:31Z **Round5** — actual current launcher second unselected node: Pass

- 2026-10-15T10:08:42Z **Round5** — Started seed synthetic private auth/data/browser sentinel bytes

- 2026-10-15T10:08:43Z **Round5** — seed synthetic private auth/data/browser sentinel bytes: Pass

- 2026-10-15T10:08:43Z **Round5** — Started ordinary custom network alias setup

- 2026-10-15T10:08:43Z **Round5** — ordinary custom network alias setup: Pass

- 2026-10-15T10:08:44Z **Round5** — Two exact current launcher nodes prepared; selected running/unselected stopped, loopback ports and synthetic private bytes recorded

- 2026-10-15T10:08:44Z **Round5** — Started fresh nonempty ext4 source before first public setup

- 2026-10-15T10:08:44Z **Round5** — fresh nonempty ext4 source before first public setup: Pass

- 2026-10-15T10:08:44Z **Round5** — Started one fresh public selected native-storage create

- 2026-10-15T10:09:07Z **Round5** — one fresh public selected native-storage create: Pass

- 2026-10-15T10:09:07Z **Round5** — Started exact chosen image config private state ports aliases and unselected preservation

- 2026-10-15T10:09:08Z **Round5** — exact chosen image config private state ports aliases and unselected preservation: Pass

- 2026-10-15T10:09:08Z **Round5** — Started same original nonempty source and native mount identity preserved

- 2026-10-15T10:09:08Z **Round5** — same original nonempty source and native mount identity preserved: Pass

- 2026-10-15T10:09:08Z **Round5** — Started installed identity private modes and active managed job

- 2026-10-15T10:09:08Z **Round5** — installed identity private modes and active managed job: Pass

- 2026-10-15T10:09:08Z **Round5** — Fresh selected public create Pass; no reconnect performed; API-F004 healthy visibility next; no fresh-read success implied

- 2026-10-15T10:09:08Z **Round5** — Started actual fresh activated native config package process mount identities

- 2026-10-15T10:09:08Z **Round5** — actual fresh activated native config package process mount identities: Pass

- 2026-10-15T10:09:08Z **Round5** — Started API-F004 fresh-public-create warmed 1KiB/1MiB + atomic/new native and HTTP

- 2026-10-15T10:09:10Z **Round5** — API-F004 fresh-public-create warmed 1KiB/1MiB + atomic/new native and HTTP: Pass

- 2026-10-15T10:09:10Z **Round5** — Started public native reconnect without config or cache manipulation

- 2026-10-15T10:09:12Z **Round5** — public native reconnect without config or cache manipulation: Pass

- 2026-10-15T10:09:12Z **Round5** — Started API-F004 public-reconnect warmed 1KiB/1MiB + atomic/new native and HTTP

- 2026-10-15T10:09:14Z **Round5** — API-F004 public-reconnect warmed 1KiB/1MiB + atomic/new native and HTTP: Pass

- 2026-10-15T10:09:14Z **Round5** — API-F004 native-storage public create/reconnect scope Pass; current Docker-storage and broader matrix NOT implied

- 2026-10-15T10:09:38Z **Round5** — Started native mkdir create synced executable and relative symlink

- 2026-10-15T10:09:38Z **Round5** — native mkdir create synced executable and relative symlink: Pass

- 2026-10-15T10:09:38Z **Round5** — Started container fresh read relative symlink execute and exclusive-create refusal

- 2026-10-15T10:09:38Z **Round5** — container fresh read relative symlink execute and exclusive-create refusal: Pass

- 2026-10-15T10:09:38Z **Round5** — Started container modify fsync close then native read rename delete

- 2026-10-15T10:09:38Z **Round5** — container modify fsync close then native read rename delete: Pass

- 2026-10-15T10:09:38Z **Round5** — Started container observes rename and removes file

- 2026-10-15T10:09:38Z **Round5** — container observes rename and removes file: Pass

- 2026-10-15T10:09:38Z **Round5** — Started both Linux clients see independent committed outputs

- 2026-10-15T10:09:39Z **Round5** — both Linux clients see independent committed outputs: Pass

- 2026-10-15T10:09:39Z **Round5** — Linux same-kernel native/container ordinary operations and reciprocal/different-file writes Pass; no physical/mac/native-agent claim

- 2026-10-15T10:09:39Z **Round5** — Started seed original source project files and Git as actual selected nonroot user

- 2026-10-15T10:09:39Z **Round5** — seed original source project files and Git as actual selected nonroot user: Pass

- 2026-10-15T10:09:39Z **Round5** — Started actual running product HTTP GraphQL image HTML and PTY Git

- 2026-10-15T10:09:39Z **Round5** — actual running product HTTP GraphQL image HTML and PTY Git: Pass

- 2026-10-15T10:09:39Z **Round5** — Mounted HTTP/GraphQL/relative static bytes and actual WebSocket PTY exact scoped Git/cwd Pass; not desktop rendering/model tools/independent peer

- 2026-10-15T10:12:53Z **Round5** — V04 deterministic healthy mounted fixtures bytes verified in actual managed node; no actual-agent completed artifact claim

- 2026-10-15T10:12:54Z **Round5** — Host-to-owned-guest SSH loopback HTTP forwarding verified using own ephemeral key and guest-read host key; no VM peer route/bridge workaround

- 2026-10-15T10:13:16Z **Round5** — Started explicitly drain own selected test node before safe detach

- 2026-10-15T10:13:21Z **Round5** — explicitly drain own selected test node before safe detach: Pass

- 2026-10-15T10:13:21Z **Round5** — Started public detach --yes --drained through installed owner

- 2026-10-15T10:13:22Z **Round5** — public detach --yes --drained through installed owner: Pass

- 2026-10-15T10:13:22Z **Round5** — Started drained detach current config private/source preservation and exact attempt removal

- 2026-10-15T10:13:24Z **Round5** — drained detach current config private/source preservation and exact attempt removal: Pass

- 2026-10-15T10:13:24Z **Round5** — Selected drained detach preserves current opaque state/source/private bytes and removes exact bounded attempt PASS

- 2026-10-15T10:13:24Z **Round5** — Started test-owned Docker prerequisite in owned detached LinuxVM

- 2026-10-15T10:13:26Z **Round5** — test-owned Docker prerequisite in owned detached LinuxVM: Pass

- 2026-10-15T10:13:26Z **Round5** — Started build storage image from exact retained engine pair

- 2026-10-15T10:14:17Z **Round5** — build storage image from exact retained engine pair: Pass

- 2026-10-15T10:14:17Z **Round5** — Started clean image package and manifest verification

- 2026-10-15T10:14:18Z **Round5** — clean image package and manifest verification: Pass

- 2026-10-15T10:14:18Z **Round5** — Started existing own loopback registry ready

- 2026-10-15T10:14:19Z **Round5** — existing own loopback registry ready: Pass

- 2026-10-15T10:14:19Z **Round5** — Started retain image under actual local-registry immutable digest

- 2026-10-15T10:14:20Z **Round5** — retain image under actual local-registry immutable digest: Pass

- 2026-10-15T10:14:20Z **Round5** — Docker storage image ready, test-only loopback digest recorded; no public create yet

- 2026-10-15T10:14:36Z **Round5** — Started operator starts own safely detached node before Docker storage setup

- 2026-10-15T10:14:36Z **Round5** — operator starts own safely detached node before Docker storage setup: Pass

- 2026-10-15T10:14:40Z **Round5** — Started preserved original ext4 source and marker before Docker setup

- 2026-10-15T10:14:40Z **Round5** — preserved original ext4 source and marker before Docker setup: Pass

- 2026-10-15T10:14:41Z **Round5** — Started public selected Docker-storage create against same preserved source

- 2026-10-15T10:14:51Z **Round5** — public selected Docker-storage create against same preserved source: Pass

- 2026-10-15T10:14:51Z **Round5** — Started exact chosen image config private state ports aliases and unselected preservation

- 2026-10-15T10:14:51Z **Round5** — exact chosen image config private state ports aliases and unselected preservation: Fail

- 2026-10-15T10:14:51Z **Round5** — ManagedDocker client Fail/incomplete AssertionError({'configChangedKeys': ['Labels']})

- 2026-10-15T10:15:22Z **Round5** — Started exact preservation after already successful public Docker setup

- 2026-10-15T10:15:23Z **Round5** — exact preservation after already successful public Docker setup: Pass

- 2026-10-15T10:15:23Z **Round5** — Docker public setup and exact preservation confirmed; harness asymmetric label exclusion corrected, no repeat mutation

- 2026-10-15T10:15:23Z **Round5** — Started actual activated Docker storage config image process and package identity

- 2026-10-15T10:15:23Z **Round5** — actual activated Docker storage config image process and package identity: Pass

- 2026-10-15T10:15:23Z **Round5** — Started API-F004 docker-fresh-public-create warmed 1KiB/1MiB + atomic/new native and HTTP

- 2026-10-15T10:15:26Z **Round5** — API-F004 docker-fresh-public-create warmed 1KiB/1MiB + atomic/new native and HTTP: Pass

- 2026-10-15T10:15:26Z **Round5** — Started public Docker-storage reconnect without config or cache manipulation

- 2026-10-15T10:15:28Z **Round5** — public Docker-storage reconnect without config or cache manipulation: Pass

- 2026-10-15T10:15:28Z **Round5** — Started API-F004 docker-public-reconnect warmed 1KiB/1MiB + atomic/new native and HTTP

- 2026-10-15T10:15:30Z **Round5** — API-F004 docker-public-reconnect warmed 1KiB/1MiB + atomic/new native and HTTP: Pass

- 2026-10-15T10:15:31Z **Round5** — API-F004 Docker-storage public create/reconnect scope Pass; broader bothOS/physical matrix NOT implied

- 2026-10-15T10:16:11Z **Round5** — Started ordinary whole-host reboot 1 automatic actual readiness

- 2026-10-15T10:16:53Z **Round5 V01 Mac-native** — Started fresh nonempty owned APFS source

- 2026-10-15T10:16:54Z **Round5 V01 Mac-native** — fresh nonempty owned APFS source: Pass

- 2026-10-15T10:16:54Z **Round5 V01 Mac-native** — Started one public nativeMac create under077 no selected nodes

- 2026-10-15T10:16:55Z **Round5 V01 Mac-native** — one public nativeMac create under077 no selected nodes: Pass

- 2026-10-15T10:16:55Z **Round5 V01 Mac-native** — Started Mac original/mounted identity bytes UUID private modes installed binary running job

- 2026-10-15T10:16:56Z **Round5 V01 Mac-native** — Mac original/mounted identity bytes UUID private modes installed binary running job: Pass

- 2026-10-15T10:17:23Z **Round5** — ordinary whole-host reboot 1 automatic actual readiness: Pass

- 2026-10-15T10:17:23Z **Round5** — Started reboot 1 same ID/image/config/private/source/mounted API preservation

- 2026-10-15T10:17:24Z **Round5** — reboot 1 same ID/image/config/private/source/mounted API preservation: Pass

- 2026-10-15T10:17:24Z **Round5** — Started ordinary whole-host reboot 2 automatic actual readiness

- 2026-10-15T10:18:27Z **Round5** — ordinary whole-host reboot 2 automatic actual readiness: Pass

- 2026-10-15T10:18:27Z **Round5** — Started reboot 2 same ID/image/config/private/source/mounted API preservation

- 2026-10-15T10:18:28Z **Round5** — reboot 2 same ID/image/config/private/source/mounted API preservation: Pass

- 2026-10-15T10:18:28Z **Round5** — Two fresh ordinary full-host reboots automatic readiness and exact preservation PASS; no manual Start/reconnect. Controls still required.

- 2026-10-15T10:18:28Z **Round5** — Started ordinary actual healthy state before Stop

- 2026-10-15T10:18:28Z **Round5** — ordinary actual healthy state before Stop: Pass

- 2026-10-15T10:18:28Z **Round5** — Started current public launcher Stop on successfully running selected node

- 2026-10-15T10:18:31Z **Round5** — current public launcher Stop on successfully running selected node: Pass

- 2026-10-15T10:18:31Z **Round5** — Started ordinary Stop state and read-only status

- 2026-10-15T10:18:32Z **Round5** — ordinary Stop state and read-only status: Pass

- 2026-10-15T10:18:32Z **Round5** — Observe two existing30-second service ticks after normal Stop

- 2026-10-15T10:19:13Z **Round5 V01 Mac-native** — Started read source identity current boot mount actual engine source and persisted owner

- 2026-10-15T10:19:13Z **Round5 V01 Mac-native** — read source identity current boot mount actual engine source and persisted owner: Pass

- 2026-10-15T10:19:37Z **Round5** — Started normal Stop preserved across service ticks

- 2026-10-15T10:19:38Z **Round5** — normal Stop preserved across service ticks: Pass

- 2026-10-15T10:19:38Z **Round5** — Started confirmed public reconnect does not override normal Stop

- 2026-10-15T10:19:38Z **Round5** — confirmed public reconnect does not override normal Stop: Pass

- 2026-10-15T10:19:38Z **Round5** — Started normal Stop preserved after confirmed reconnect

- 2026-10-15T10:19:39Z **Round5** — normal Stop preserved after confirmed reconnect: Pass

- 2026-10-15T10:20:40Z **Round5 V01 Mac-native** — Mac native Fail/incomplete RuntimeError('No automatic Mac host readiness after ordinary reboot in observation window; no reconnect performed')

### Round5 V01-MAC-IDENTITY investigation checkpoint
Fresh Mac create Pass; first reboot currently unready with repeated explicit source-device mismatch (not timing alone). New focused second ordinary reboot/readonly APFS UUID and source/persisted identity proof planned, followed only by separately labelled diagnostic reconnect if needed. Failure origin preliminary Unclear, likely persisted source-identity/platform integration; reviewer to determine design impact. Remaining desktop preview/peer/native-agent expansion paused for focused evidence, no Pass inferred.

- 2026-10-15T10:21:19Z **Round5** — Started normal unless-stopped Stop remains stopped after whole-host reboot and ticks

- 2026-10-15T10:21:20Z **Round5** — normal unless-stopped Stop remains stopped after whole-host reboot and ticks: Pass

- 2026-10-15T10:21:20Z **Round5** — Normal-running Stop / ticks / confirmed reconnect / ordinary reboot veto PASS. No failed-stop policy control inferred.

- 2026-10-15T10:21:20Z **Round5** — Started control only: hold owned attachment completion job for serial failed-start inspection

- 2026-10-15T10:21:21Z **Round5** — control only: hold owned attachment completion job for serial failed-start inspection: Pass

- 2026-10-15T10:21:21Z **Round5** — Started explicit user Start of normally stopped node to prepare distinct policy control

- 2026-10-15T10:21:21Z **Round5** — explicit user Start of normally stopped node to prepare distinct policy control: Pass

- 2026-10-15T10:21:21Z **Round5** — Started control starts from genuinely running healthy selected node

- 2026-10-15T10:21:29Z **Round5** — control starts from genuinely running healthy selected node: Pass

- 2026-10-15T10:21:29Z **Round5** — Started ordinary reboot with attachment job held for serial operator inspection

- 2026-10-15T10:22:12Z **Round5** — ordinary reboot with attachment job held for serial operator inspection: Pass

- 2026-10-15T10:22:43Z **Round5** — Captured real ordinary Docker NFS pre-process connection-refused start; job held, no synthetic state

- 2026-10-15T10:22:43Z **Round5** — Started raw Stop on already-failed node is a Docker no-op

- 2026-10-15T10:22:43Z **Round5** — raw Stop on already-failed node is a Docker no-op: Pass

- 2026-10-15T10:22:43Z **Round5** — Started current launcher reports no-op/policy guidance, not cancellation promise

- 2026-10-15T10:22:43Z **Round5** — current launcher reports no-op/policy guidance, not cancellation promise: Pass

- 2026-10-15T10:22:43Z **Round5** — Started operator explicitly selects current restart=no durable veto

- 2026-10-15T10:22:43Z **Round5** — operator explicitly selects current restart=no durable veto: Pass

- 2026-10-15T10:22:43Z **Round5** — Started restore original owned attachment service with existing configuration

- 2026-10-15T10:22:43Z **Round5** — restore original owned attachment service with existing configuration: Pass

- 2026-10-15T10:23:22Z **Round5 V01 Mac-native** — Mac source-identity second ordinary boot observation complete; actual status/identity governs classification, no identity bypass

- 2026-10-15T10:23:48Z **Round5** — Started policy=no suppresses automatic completion while host becomes ready

- 2026-10-15T10:23:49Z **Round5** — policy=no suppresses automatic completion while host becomes ready: Pass

- 2026-10-15T10:23:49Z **Round5** — Started confirmed public reconnect cannot override current policy=no

- 2026-10-15T10:23:49Z **Round5** — confirmed public reconnect cannot override current policy=no: Pass

- 2026-10-15T10:23:49Z **Round5** — Started policy veto exact stopped-state preservation after explicit reconnect

- 2026-10-15T10:23:50Z **Round5** — policy veto exact stopped-state preservation after explicit reconnect: Pass

- 2026-10-15T10:23:50Z **Round5** — Started ordinary reboot after durable veto with original attachment job enabled

- 2026-10-15T10:24:26Z **Round5** — ordinary reboot after durable veto with original attachment job enabled: Pass

- 2026-10-15T10:25:22Z **Round5 V01 Mac-native** — Mac source-identity second ordinary boot observation complete; actual status/identity governs classification, no identity bypass

- 2026-10-15T10:25:31Z **Round5** — Started policy=no remains veto across reboot and service ticks

- 2026-10-15T10:25:32Z **Round5** — policy=no remains veto across reboot and service ticks: Pass

- 2026-10-15T10:25:32Z **Round5** — Captured failed-start raw Stop no-op/guidance and current restart=no automatic/explicit/reboot veto PASS

- 2026-10-15T10:25:32Z **Round5** — Started explicit operator restores original unless-stopped policy and starts node for restart regression

- 2026-10-15T10:25:33Z **Round5** — explicit operator restores original unless-stopped policy and starts node for restart regression: Pass

- 2026-10-15T10:25:33Z **Round5** — Started restored explicit running state actual API ready

- 2026-10-15T10:25:39Z **Round5** — restored explicit running state actual API ready: Pass

- 2026-10-15T10:25:39Z **Round5** — Started ordinary Docker node restart

- 2026-10-15T10:25:43Z **Round5** — ordinary Docker node restart: Pass

- 2026-10-15T10:25:43Z **Round5** — Started ordinary node restart readiness

- 2026-10-15T10:25:51Z **Round5** — ordinary node restart readiness: Pass

- 2026-10-15T10:25:51Z **Round5** — Started ordinary node restart exact original selected state preservation

- 2026-10-15T10:25:51Z **Round5** — ordinary node restart exact original selected state preservation: Pass

- 2026-10-15T10:25:51Z **Round5** — Started test-only registry and isolated HOME current helper prerequisites

- 2026-10-15T10:25:52Z **Round5** — test-only registry and isolated HOME current helper prerequisites: Pass

- 2026-10-15T10:25:52Z **Round5** — Started actual public launcher upgrade --all against same immutable current worktree image

- 2026-10-15T10:25:55Z **Round5 V01 Mac-native** — Started public safe Mac detach after retained identity failure evidence

- 2026-10-15T10:25:55Z **Round5 V01 Mac-native** — public safe Mac detach after retained identity failure evidence: Pass

- 2026-10-15T10:25:55Z **Round5 V01 Mac-native** — Started same current source identity original bytes and marker preserved, no owned mount/job

- 2026-10-15T10:25:55Z **Round5 V01 Mac-native** — same current source identity original bytes and marker preserved, no owned mount/job: Pass

- 2026-10-15T10:25:55Z **Round5 V01 Mac-native** — Mac public safe detach cleanup preserves source/marker; normal reboot failure remains OPEN

- 2026-10-15T10:25:58Z **Round5** — actual public launcher upgrade --all against same immutable current worktree image: Pass

- 2026-10-15T10:25:59Z **Round5** — Started explicitly stop unselected fixture again after requested upgrade --all

- 2026-10-15T10:26:01Z **Round5** — explicitly stop unselected fixture again after requested upgrade --all: Pass

- 2026-10-15T10:26:02Z **Round5** — Started current replacement admitted by existing selected node reference

- 2026-10-15T10:26:02Z **Round5** — current replacement admitted by existing selected node reference: Pass

- 2026-10-15T10:26:02Z **Round5** — Started new current container private bytes mounted APIs source and exact state baseline

- 2026-10-15T10:26:03Z **Round5** — new current container private bytes mounted APIs source and exact state baseline: Pass

- 2026-10-15T10:26:03Z **Round5** — Started ordinary reboot resolves current replacement rather than old recreation receipt ID

- 2026-10-15T10:27:04Z **Round5** — ordinary reboot resolves current replacement rather than old recreation receipt ID: Pass

- 2026-10-15T10:27:04Z **Round5** — Started replacement automatic boot same current ID private and mounted data preservation

- 2026-10-15T10:27:05Z **Round5** — replacement automatic boot same current ID private and mounted data preservation: Pass

- 2026-10-15T10:27:05Z **Round5** — Node restart and actual public launcher replacement/current-ref ordinary boot PASS. Upgrade-all has its documented own configuration policy, not unchanged opaque-config proof.

- 2026-10-15T10:27:07Z **Round5** — Started explicitly drain own selected test node before safe detach

- 2026-10-15T10:27:12Z **Round5** — explicitly drain own selected test node before safe detach: Pass

- 2026-10-15T10:27:12Z **Round5** — Started public detach --yes --drained through installed owner

- 2026-10-15T10:27:13Z **Round5** — public detach --yes --drained through installed owner: Pass

- 2026-10-15T10:27:13Z **Round5** — Started drained detach current config private/source preservation and exact attempt removal

- 2026-10-15T10:27:14Z **Round5** — drained detach current config private/source preservation and exact attempt removal: Pass

- 2026-10-15T10:27:14Z **Round5** — Selected drained detach preserves current opaque state/source/private bytes and removes exact bounded attempt PASS

### Round5 final reconciliation — API-REV-005 Fail57.14%, broaderRequired
N01 Passwith3Pythonskips+standaloneGochildskip; V03/API-F004 native+Dockerpublicfresh/reconnect80actualreaderchecks Pass≤5s/scopedresolved. V03files/API/Git+Linux2boots/Stop/policyVeto/nodeRestart/upgrade/currentref/safedetach Pass. V01freshMaccreate Pass; V01-MAC-IDENTITY **Fail/API-F005** across3ordinaryboots, samevalidAPFSUUID/sourceinode/bytes/marker but devnumberschange; automatic+explicitsourceidentityrefusal/no mount. SafeMacdetach cleanup Pass only, notrepair. V04currentlocalGuide/shell Passnarrow; remoteactualpreviewnotexecuted afterfinding, priorE3/E4scopedproofretained. V02independentpeer/V05nativeagents/fullphysical/bothOSclient matrixNotTested/dependency-limited; no manufacturedPass. Preparedmounted-lock scriptnotrun. ExistingLinuxcontrolsequence alreadyunderway completed; no newgeneralexpansion afterMacfinding. Fullnew-failure-summary/visibility-summary/currentreportACtable/cleanup/index govern. No production/durabletestchange/delegation/merge/push/release/TaskDone/userverification.

## Round6 planned cases — API-REV006

- N01: current pinned Go race/vet/packaging — Not Tested.
- V01/API-F005: fresh public Mac create, >=2 ordinary boots witnessing real device change, mounted nonroot RW automatically, explicit reconnect — Not Tested.
- V01 replacement/privacy/permission/new-source/safe-detach controls — Not Tested.
- V03 proportionate Linux source/config/lifecycle regressions — Not Tested.
- V02/V04/V05 full client/physical/runtime/preview matrix — Not Tested; existing authorization/network prerequisites retained.

- 2026-10-15T12:06:27Z **Round6 N01** — Starting go-race

- 2026-10-15T12:07:01Z **Round6 N01** — go-race: Pass

- 2026-10-15T12:07:01Z **Round6 N01** — Starting go-vet

- 2026-10-15T12:07:07Z **Round6 N01** — go-vet: Pass

- 2026-10-15T12:07:07Z **Round6 N01** — Starting python-bootstrap-launcher

- 2026-10-15T12:07:52Z **Round6 N01** — python-bootstrap-launcher: Pass

- 2026-10-15T12:08:00Z **Round6 V01** — Started fresh owned nonempty APFS source

- 2026-10-15T12:08:00Z **Round6 V01** — fresh owned nonempty APFS source: Pass

- 2026-10-15T12:08:00Z **Round6 V01** — Started public current nativeMac create under077

- 2026-10-15T12:08:01Z **Round6 V01** — public current nativeMac create under077: Pass

- 2026-10-15T12:08:02Z **Round6 V01** — Started initial real nonroot mounted RW private/job/exports

- 2026-10-15T12:08:02Z **Round6 V01** — initial real nonroot mounted RW private/job/exports: Pass

- 2026-10-15T12:08:02Z **Round6 V01** — Started ordinary automatic whole-host boot 1

- 2026-10-15T12:08:55Z **Round6 V01** — ordinary automatic whole-host boot 1: Pass

- 2026-10-15T12:08:55Z **Round6 V01** — Started ordinary automatic whole-host boot 2

- 2026-10-15T12:09:46Z **Round6 V01** — ordinary automatic whole-host boot 2: Pass

- 2026-10-15T12:09:46Z **Round6 V01** — Started separately labelled explicit public reconnect

- 2026-10-15T12:09:46Z **Round6 V01** — separately labelled explicit public reconnect: Pass

- 2026-10-15T12:09:46Z **Round6 V01** — Started explicit reconnect mounted RW

- 2026-10-15T12:09:47Z **Round6 V01** — explicit reconnect mounted RW: Pass

- 2026-10-15T12:09:47Z **Round6 V01** — API-F005 automatic first gate Pass with actual raw device change; replacement controls and broader matrix pending

- 2026-10-15T12:09:55Z **Round6 V01** — Started replace owned directory at same path with copied marker/content

- 2026-10-15T12:09:56Z **Round6 V01** — replace owned directory at same path with copied marker/content: Pass

- 2026-10-15T12:09:57Z **Round6 V01** — Started public reconnect rejects actual new directory despite copied marker

- 2026-10-15T12:09:57Z **Round6 V01** — public reconnect rejects actual new directory despite copied marker: Pass

- 2026-10-15T12:09:57Z **Round6 V01** — Started restore exact original directory

- 2026-10-15T12:09:57Z **Round6 V01** — restore exact original directory: Pass

- 2026-10-15T12:09:58Z **Round6 V01** — Started restored original public reconnect

- 2026-10-15T12:09:58Z **Round6 V01** — restored original public reconnect: Pass

- 2026-10-15T12:09:58Z **Round6 V01** — Started restored original mounted nonroot RW

- 2026-10-15T12:09:58Z **Round6 V01** — restored original mounted nonroot RW: Pass

- 2026-10-15T12:09:58Z **Round6 V01** — Started replace path with symlink to exact original

- 2026-10-15T12:09:58Z **Round6 V01** — replace path with symlink to exact original: Pass

- 2026-10-15T12:09:58Z **Round6 V01** — Started public reconnect rejects symlink source

- 2026-10-15T12:09:59Z **Round6 V01** — public reconnect rejects symlink source: Pass

- 2026-10-15T12:09:59Z **Round6 V01** — Started restore source after symlink control

- 2026-10-15T12:09:59Z **Round6 V01** — restore source after symlink control: Pass

- 2026-10-15T12:09:59Z **Round6 V01** — Started symlink restore reconnect

- 2026-10-15T12:09:59Z **Round6 V01** — symlink restore reconnect: Pass

- 2026-10-15T12:09:59Z **Round6 V01** — Started remove source access permission without ownership change

- 2026-10-15T12:09:59Z **Round6 V01** — remove source access permission without ownership change: Pass

- 2026-10-15T12:09:59Z **Round6 V01** — Started public reconnect rejects nonroot write denial

- 2026-10-15T12:09:59Z **Round6 V01** — public reconnect rejects nonroot write denial: Fail

- 2026-10-15T12:09:59Z **Round6 V01** — controls failure AssertionError({'argv': ['/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart', 'exec', 'ab-nfs-api006-mac-a0000f39', '/usr/bin/sudo', '-n', '-u', 'admin', '/usr/bin/env', '-i', 'HOME=/Users/admin', 'PATH=/usr/bin:/bin:/usr/sbin:/sbin', 'LANG=C', '/bin/sh', '-c', '/Users/admin/ab-nfs-api006-mac-a0000f39-binary reconnect --yes --json'], 'rc': 0, 'seconds': 0.301, 'stdout': '{\n  "storageId": "4ff085b0-3304-4023-a5c2-9834e38aec72",\n  "mountRoot": "/Volumes/autobyteus-shared",\n  "hostReady": true,\n  "nodes": {},\n  "limitation": "Hard NFS checks may stall; no outage deadline or local substitute"\n}\n', 'stderr': 'Checking saved source and reconnecting; hard NFS may wait for storage.\nChecking actual host and selected-node readiness; this may wait for storage.\n'})

- 2026-10-15T12:11:44Z **Round6 V01** — Started restored mode nonroot mounted RW

- 2026-10-15T12:11:44Z **Round6 V01** — restored mode nonroot mounted RW: Pass

- 2026-10-15T12:14:13Z **Round6 V03 Started setup** — own Ubuntu24.04 public-image clone, private Tart root; no host bridge/root/credentials.

- 2026-10-15T12:15:13Z **Round6 V01** — Started actual denied nonroot access yields not-ready public status

- 2026-10-15T12:15:13Z **Round6 V01** — actual denied nonroot access yields not-ready public status: Pass

- 2026-10-15T12:15:13Z **Round6 V01** — Started actual denied nonroot access yields reconnect refusal

- 2026-10-15T12:15:13Z **Round6 V01** — actual denied nonroot access yields reconnect refusal: Pass

- 2026-10-15T12:15:14Z **Round6 V01** — Started restored mode nonroot mounted RW

- 2026-10-15T12:15:14Z **Round6 V01** — restored mode nonroot mounted RW: Pass

- 2026-10-15T12:15:14Z **Round6 V01** — Started public drained original detach

- 2026-10-15T12:15:15Z **Round6 V01** — public drained original detach: Pass

- 2026-10-15T12:15:15Z **Round6 V01** — Started original detached source bytes marker modes preserved

- 2026-10-15T12:15:15Z **Round6 V01** — original detached source bytes marker modes preserved: Pass

- 2026-10-15T12:15:15Z **Round6 V01** — Started private-home source refused before setup

- 2026-10-15T12:15:15Z **Round6 V01** — private-home source refused before setup: Pass

- 2026-10-15T12:15:15Z **Round6 V01** — Started private auth-named tree refused before setup

- 2026-10-15T12:15:15Z **Round6 V01** — private auth-named tree refused before setup: Pass

- 2026-10-15T12:15:15Z **Round6 V01** — Started symlink ancestor refused before setup

- 2026-10-15T12:15:15Z **Round6 V01** — symlink ancestor refused before setup: Pass

- 2026-10-15T12:15:15Z **Round6 V01** — Started public absent-source create under077 actual privileged child and bound save

- 2026-10-15T12:15:16Z **Round6 V01** — public absent-source create under077 actual privileged child and bound save: Fail

- 2026-10-15T12:15:16Z **Round6 V01** — new source failure AssertionError({'argv': ['/private/tmp/ab-sf-macos-vm-fr019.WmqeQ5YK/tools/tart.app/Contents/MacOS/tart', 'exec', 'ab-nfs-api006-mac-a0000f39', '/usr/bin/sudo', '-n', '-u', 'admin', '/usr/bin/env', '-i', 'HOME=/Users/admin', 'PATH=/usr/bin:/bin:/usr/sbin:/sbin', 'LANG=C', '/bin/sh', '-c', 'umask 077; exec /Users/admin/ab-nfs-api006-mac-a0000f39-binary create --source /Users/admin/ab-nfs-api006-mac-a0000f39-source-new --backend apple --endpoint 192.168.64.2 --allow 192.168.64.2 --nodes none --yes --json'], 'rc': 1, 'seconds': 0.208, 'stdout': '', 'stderr': 'Detected private addresses: 192.168.64.2\nNo reachable local Docker daemon; no Docker nodes will be attached.\nAutoByteus NFS incomplete: required TCP 2049 is occupied; no existing service will be stopped\nAutoByteus NFS incomplete: exit status 1\n'})

- 2026-10-15T12:16:07Z **Round6 V01** — Started stop solely-owned guest OS nfsd after verified public detach and no exports

- 2026-10-15T12:16:08Z **Round6 V01** — stop solely-owned guest OS nfsd after verified public detach and no exports: Pass

- 2026-10-15T12:16:08Z **Round6 V01** — Started public absent-source create under077 actual privileged child and bound save

- 2026-10-15T12:16:09Z **Round6 V01** — public absent-source create under077 actual privileged child and bound save: Pass

- 2026-10-15T12:16:10Z **Round6 V01** — new source failure AssertionError()

- 2026-10-15T12:16:41Z **Round6 V01** — Started actual new source owner-private mode and nonroot mounted RW

- 2026-10-15T12:16:42Z **Round6 V01** — actual new source owner-private mode and nonroot mounted RW: Pass

- 2026-10-15T12:16:42Z **Round6 V01** — Started newsource public reconnect

- 2026-10-15T12:16:42Z **Round6 V01** — newsource public reconnect: Pass

- 2026-10-15T12:16:43Z **Round6 V01** — Started safe public detach does not require live source path

- 2026-10-15T12:16:43Z **Round6 V01** — safe public detach does not require live source path: Pass

- 2026-10-15T12:16:43Z **Round6 V01** — Started new source retained no attachment/job/mount

- 2026-10-15T12:16:43Z **Round6 V01** — new source retained no attachment/job/mount: Pass

- 2026-10-15T12:16:43Z **Round6 V01** — Started stop solely-owned guest OS nfsd after verified public detach and no exports

- 2026-10-15T12:16:44Z **Round6 V01** — stop solely-owned guest OS nfsd after verified public detach and no exports: Pass

- 2026-10-15T12:16:44Z **Round6 V01** — Started create actual original APFS volume

- 2026-10-15T12:16:45Z **Round6 V01** — create actual original APFS volume: Pass

- 2026-10-15T12:16:46Z **Round6 V01** — Started public APFS volume source create

- 2026-10-15T12:16:46Z **Round6 V01** — public APFS volume source create: Pass

- 2026-10-15T12:16:47Z **Round6 V01** — Started actual APFS volume mounted nonroot RW

- 2026-10-15T12:16:48Z **Round6 V01** — actual APFS volume mounted nonroot RW: Pass

- 2026-10-15T12:16:48Z **Round6 V01** — Started create different actual APFS volume

- 2026-10-15T12:16:49Z **Round6 V01** — create different actual APFS volume: Pass

- 2026-10-15T12:17:19Z **Round6** — Started fresh nonempty owned source and native prerequisites

- 2026-10-15T12:17:19Z **Round6** — fresh nonempty owned source and native prerequisites: Pass

- 2026-10-15T12:17:20Z **Round6** — Started public native create under077 nonroot clear-groups

- 2026-10-15T12:17:40Z **Round6 V01** — Started original image absent after reboot

- 2026-10-15T12:17:41Z **Round6 V01** — original image absent after reboot: Pass

- 2026-10-15T12:17:41Z **Round6** — public native create under077 nonroot clear-groups: Pass

- 2026-10-15T12:17:41Z **Round6** — Started native mounted bytes UUID source identity and nonroot RW

- 2026-10-15T12:17:41Z **Round6 V01** — Started different volume identical marker and bytes at same source path

- 2026-10-15T12:17:42Z **Round6** — native mounted bytes UUID source identity and nonroot RW: Pass

- 2026-10-15T12:17:42Z **Round6** — Started actual installed engine jobs private modes manifest and client policy

- 2026-10-15T12:17:42Z **Round6** — actual installed engine jobs private modes manifest and client policy: Pass

- 2026-10-15T12:17:43Z **Round6 V01** — different volume identical marker and bytes at same source path: Pass

- 2026-10-15T12:17:43Z **Round6 V01** — Started public reconnect refuses actual different APFS UUID

- 2026-10-15T12:17:43Z **Round6 V01** — public reconnect refuses actual different APFS UUID: Pass

- 2026-10-15T12:17:50Z **Round6 V01** — Started restore exact original APFS image public reconnect

- 2026-10-15T12:17:51Z **Round6 V01** — restore exact original APFS image public reconnect: Pass

- 2026-10-15T12:17:51Z **Round6 V01** — Started restored actual volume nonroot mounted RW

- 2026-10-15T12:17:51Z **Round6 V01** — restored actual volume nonroot mounted RW: Pass

- 2026-10-15T12:17:52Z **Round6 V01** — Started public drained detach original APFS volume

- 2026-10-15T12:17:52Z **Round6 V01** — public drained detach original APFS volume: Pass

- 2026-10-15T12:17:52Z **Round6 V01** — Started detached original preserved no mount job attachment

- 2026-10-15T12:17:53Z **Round6 V01** — detached original preserved no mount job attachment: Pass

- 2026-10-15T12:17:53Z **Round6 V01** — Started detach only owned disk image

- 2026-10-15T12:18:01Z **Round6 V01** — detach only owned disk image: Pass

- 2026-10-15T12:18:29Z **Round6** — Started ordinary boot automatic mounted nonroot RW before manual reconnect

- 2026-10-15T12:18:30Z **Round6** — ordinary boot automatic mounted nonroot RW before manual reconnect: Pass

- 2026-10-15T12:18:30Z **Round6** — Started separate explicit public reconnect

- 2026-10-15T12:18:30Z **Round6** — separate explicit public reconnect: Fail

- 2026-10-15T12:18:30Z **Round6** — native regression incomplete/fail RuntimeError('AutoByteus NFS incomplete: another administrative operation is checking/incomplete; restore storage and wait: resource temporarily unavailable\nAutoByteus NFS incomplete: exit status 1\n')

- 2026-10-15T12:19:23Z **Round6** — Started separate explicit public reconnect

- 2026-10-15T12:19:24Z **Round6** — separate explicit public reconnect: Pass

- 2026-10-15T12:19:24Z **Round6** — Started same saved binding after explicit reconnect

- 2026-10-15T12:19:24Z **Round6** — same saved binding after explicit reconnect: Pass

- 2026-10-15T12:19:24Z **Round6** — Started public replacement directory copiedmarker refusal

- 2026-10-15T12:19:24Z **Round6** — public replacement directory copiedmarker refusal: Pass

- 2026-10-15T12:19:24Z **Round6** — Started restore exact original public reconnect

- 2026-10-15T12:19:25Z **Round6** — restore exact original public reconnect: Pass

- 2026-10-15T12:19:25Z **Round6** — Started restored original mounted RW

- 2026-10-15T12:19:25Z **Round6** — restored original mounted RW: Pass

- 2026-10-15T12:19:25Z **Round6** — Started public drained detach

- 2026-10-15T12:19:26Z **Round6** — public drained detach: Pass

- 2026-10-15T12:19:26Z **Round6** — Started original source preserved mount job attachment absent

- 2026-10-15T12:19:26Z **Round6** — original source preserved mount job attachment absent: Pass

- 2026-10-15T12:19:51Z **Round6** — Started public absent source create under077 nonroot clear-groups

- 2026-10-15T12:19:53Z **Round6** — public absent source create under077 nonroot clear-groups: Pass

- 2026-10-15T12:19:54Z **Round6** — Linux new source incomplete/fail AssertionError()

- 2026-10-15T12:20:47Z **Round6** — Started new owned source actual mounted nonroot RW

- 2026-10-15T12:20:47Z **Round6** — new owned source actual mounted nonroot RW: Pass

- 2026-10-15T12:20:47Z **Round6** — Started newsource public reconnect

- 2026-10-15T12:20:48Z **Round6** — newsource public reconnect: Pass

- 2026-10-15T12:20:53Z **Round6** — Started public safe detach absent live source path

- 2026-10-15T12:20:54Z **Round6** — public safe detach absent live source path: Pass

- 2026-10-15T12:20:54Z **Round6** — Started new source original inode owner private mode content marker preserved

- 2026-10-15T12:20:54Z **Round6** — new source original inode owner private mode content marker preserved: Pass

## Round6 final reconciliation

- N01 Pass with retained skips:7Go packages70top/212directsubcases; Python50/53,3skips. NestedGochildtranscript notextra cases.
- V01 API-F005 scopedResolved: publiccreate→2automaticordinaryboots actualrawdevicechange→separatereconnect; realdirectory/symlink/private/permissioncontrols; actualAPFSvolume same-dev/inode differentUUID copiedmarker refusal; exactrestore; newsource/absentsourceDetach. Allcorrectedattempts named incanonicalreport; rawFail/Runningnoterased.
- V03 Passscoped nativeLinuxcurrentbinding/setup/ordinaryboot/nonrootIO/reconnect/replacementrestore/detach/newsource0750/absentsourceDetach. Immediateadministrativelockcorrectlyrefused; laterseparatecommand succeeds, noautomaticproofrepair.
- V02 Blocked independentphysical/privateLAN. CurrentTCP22timeout/2049no-route; actualLinuxselflistenerhealthy. Firstpeeroutertimeoutindeterminate, correctedprobeauthoritative.
- V05 Blocked authenticatedtestprofiles/providerbudget; currentnativeagentmatrixNotTested. V04/fullmanagedUI/amd64/hostedmatrixNotTestedthisround; notblanketdeclaredimpossible. PriorAPI005/003/004scope retained.
- Allownedresourcespubliclydetached then exactVM/PID/clones/scratchremoved; cleanupComplete. No running case remains; interrupted attempts resolved via namedconfirmations.
- FinalAPI-REV006 **Blocked67.86%, broaderBlocked**, not failure-originrework orPass. See currentreportACproof and E6/blockers.json. No release/TaskDone/userverification; await exactexternaldependencies.

## Round7 / API-REV-007 — SR024 initialized before execution

All prior round results preserved. Deferred IV-D01–D03 NOT Passed; not file-test prerequisites.

| Case | Scope / expected | Initial status |
| --- | --- | --- |
| F01-NET | Distinct owned Mac/Linux guest transport; no host bridge/firewall changes | Not Tested |
| F01-M | Native Mac storage -> native Linux + managed clients both OS; public setup, exact source | Not Tested |
| F01-L | Native Linux storage -> native Mac + managed clients both OS | Not Tested |
| F01-D | Docker Linux storage -> native Mac/Linux + managed clients both OS | Not Tested |
| F02 | Each relevant mode reciprocal exact bytes, create/overwrite/append/atomic/new/delete/rename/list and <=5s <=1MiB warmed fresh-open visibility | Not Tested |
| F03 | Independent-file concurrent peers, coordinated same-file/Git, exclusive-create, supported locks, symlink/execute/permission/privacy | Not Tested |
| F04 | Peer automatic ordinary restart, reconnect, selected node image/config/private preservation, source refusal, drained detach | Not Tested; scoped API005/006 evidence to map |
| F05 | Mounted filesystem-facing APIs/previews, Guide/local regression, no agent claim | Not Tested; scoped prior evidence to map |
| N01 | Current relevant repository regression / exact source/candidate relevance | Not Tested; API006 same-source results available |

## Active Round7 revised test ledger — one Linux VM, two Docker nodes

**User accepted topology narrowing; awaiting Solution Designer's canonical acceptance
alignment, not another technical review.** This section supersedes Round7 F01-NET/M/L/D
execution planning above. It does not erase previous results or mark excluded cases Pass.
All functional cases below are **Not Tested in API007**. Prior receipts may be carried only
with exact case/build/mode relevance; “full testing” means completion of this explicit case
set, not every OS, every runtime or release qualification.

### Fixture and result rules

- One owned Ubuntu24.04/ext4 VM; actual current public launcher creates application nodes
  A and B with isolated private named volumes and synthetic, noncredential sentinels.
- Modes: **LN** native Linux Ganesha storage; **LD** Docker-on-Linux Ganesha storage.
  Run sequentially with public drained detach between them. Source is a nonempty ordinary
  owned directory; retain its original contents, metadata and storage UUID across reuse.
- Main actor pairs: A→B, B→A; source/native VM→A/B and A/B→original source controls.
  Same guest/kernel/daemon limitation recorded, even if distinct container processes.
- For each applicable row record mode, VM/boot ID, node/container/image ID, CLI/engine/source
  hashes, source path/device/inode/UUID, real mount/options, actual UID/GID/groups, expected
  and observed assertions, raw receipt, carried-evidence rationale, status and cleanup.
- Failures are retained; harness corrections identify invalid assertions without changing
  intended behavior. No skips, setup successes or old source review scores count as Pass.
- Operations require actual supported public setup; no manual product mount/export edits,
  state rewriting, cached reader injection, blanket chmod, force/lazy unmount or fake APIs.

| ID | Mode | Case / required assertions | Planned evidence | API007 status |
| --- | --- | --- | --- | --- |
| L01 | Both | Environment and build identity: fresh guest OS/ext4, nonroot identity, exact candidate/engine/server image, no inherited credentials or old attachment | Guest preflight, hashes, version, mount/process inventory | Not Tested; VM/build setup receipts only |
| L02 | Both | Relevant Go/packaging/launcher/binding/REST/Guide/local regressions; inspect carried exact-source results; skips explicitly enumerated | Current focused tests or justified unchanged receipts, source hash audit | Not Tested; prior API006 repository results available |
| L03 | Both | Two nodes from current public launcher, real health endpoints; snapshot A/B image, Config/HostConfig, ports, aliases, volumes, running state and private sentinels | Launcher commands, actual Docker inspect and hashes | Not Tested |
| L04 | Both | Consent/unsafe-target controls: decline required drain, reject nonempty mount target/private or symlink source; leave nodes/data/config unchanged | Public CLI exit/output, before/after snapshot; narrow unit cases for unavailable interactive privilege condition | Not Tested |
| L05 | LN, LD | Public create selects A only, reports actual mapping and readiness; B remains unselected/local and unchanged; source bytes/UUID/nonroot mapping preserved | Public CLI/descriptor/mount, A RW, B inspect/private hashes | Not Tested |
| L06 | LN, LD | Public drained detach A-only setup then fresh public create selecting A+B against preserved source/marker; no extra in-container mount/setup commands | Displayed plan, public results, source UUID continuity, both node mounts | Not Tested |
| L07 | LN, LD | Real source proof: A/B see original nonempty project and same marker; reciprocal unique writes reach other node and original source; no local-folder substitute | Exact bytes/hashes, native and Docker NFS volume/mount records, actual UID/GID | Not Tested |
| L08 | LN, LD | Reciprocal create/read/write/overwrite/append for text, Unicode and binary files (including empty,1KiB,1MiB); verify exact bytes | Independent actor results and source hashes | Not Tested |
| L09 | LN, LD | mkdir/nested directories/listing, file+directory rename, atomic replacement, deletion and missing-path results visible to other actor | Peer directory listings/stat/open assertions | Not Tested |
| L10 | LN, LD | Metadata/relative symlinks/chmod/executable-file behavior; preserve ordinary owner/group/mode contract, no global permission relaxation | Actual stat/readlink/execute and nonroot identity evidence | Not Tested |
| L11 | LN, LD | Warm old bytes/negative lookups; in-place overwrite, atomic replacement and new publication,1KiB/1MiB, both A→B/B→A and source/native controls; fresh open exact bytes <=5s from successful flush/fsync/close | Per-fixture writer completion, reader observation/elapsed bound, expected/actual hash; no cacheflush/remount workaround | Not Tested |
| L12 | LN, LD | Concurrent independent-file writers A/B; every file intact and cross-readable, no overwrite/loss; actual two-process overlap | Barrier/start/end timestamps, complete expected manifest and hashes | Not Tested |
| L13 | LN, LD | Coordinated same-file edit handoff and Git status/edit/add/commit A then B; same repository state, scoped Git environment; no implicit merging/independent shared branches claim | Command/output and repository content/commit assertions | Not Tested |
| L14 | LN, LD | Exclusive-create contention: one winner, other receives supported exists error, final bytes exactly winner; no silent overwrite | Both actor exits, actual contents | Not Tested |
| L15 | LN, LD | Documented NFSv4 advisory lock contention/release with separate node processes; distinguish same-kernel lock proof from independent-kernel qualification | Holder/contender acquire/refusal/release receipts | Not Tested |
| L16 | LN, LD | Nonroot authorized access, root-squash/mapall ownership, permission-denied path/error; private database/auth/profile sentinels remain node-private, nonexported and unchanged | UID/GID/mode/access errors, private hashes and export inspection | Not Tested |
| L17 | LN, LD | Repeat status/reconnect with healthy configured source: same source/UUID/bytes/node configuration, no duplicate resources or local fallback | Public results and before/after mount/node/state inventories | Not Tested |
| L18 | LN, LD | Ordinary VM reboot: service and both selected nodes automatically usable before manual reconnect/start; then separate explicit reconnect and reciprocal roundtrip | Distinct boot IDs, timed observations (not boot SLA), same IDs/image/config/private/source comparisons | Not Tested |
| L19 | LN, LD | Normal Stop of one running unless-stopped node stays stopped through ticks/reconnect/reboot; peer remains healthy. Retain previously proven failed-start restart=no veto at its exact scope | Public Docker lifecycle, saved intent/config, valid API005 scope mapping or focused rerun | Not Tested |
| L20 | LN, LD | Public launcher restart/upgrade/recreation retains shared attachment and each node's private data/config; current replacement reference resolves after reboot | Current launcher calls, old/new IDs/image provenance, volume/private hashes and RW | Not Tested |
| L21 | LN, LD | Real source replacement with copied marker is refused without rebind/false ready; restore exact original, reconnect; unsupported configuration errors preserve evidence | Actual inode/source change, public refusal, saved binding/hash and restored original proof | Not Tested; API006 relevant refusal evidence available |
| L22 | LN, LD | Filesystem-facing application GraphQL/REST and WebSocket terminal use mounted project; node B changes/removes content A serves, then reverse; existing path authorization and error behavior preserved | Real server endpoints, exact bytes/MIME/errors and scoped terminal/Git output | Not Tested |
| L23 | LN, LD | Healthy text/Markdown/image/HTML+relative assets/PDF/audio/video previews, deliberate tree reload/reopen after other-node changes, preserve unsaved buffers; watcher behavior recorded, not required | Current worktree isolated app/API/DOM evidence; justified mode-invariant carried UI evidence where exact source unchanged | Not Tested |
| L24 | Both | NFS Guide current unavailable release state and ordinary local workspace/preview regressions; no invented working public installer | Current UI/component and applicable real-surface evidence | Not Tested; earlier Guide receipts available |
| L25 | LN, LD | Safe detach: busy/drain refusal leaves data intact; after actual drain public detach restores local node configuration, preserves private volumes/source/marker, removes only owned attachment/job/mount; repeat incomplete detach only if genuinely reached | Public output, no forced unmount, source/private/config/resource comparisons | Not Tested |
| L26 | Final | Stop/remove only test-owned nodes/VM/processes/build tags/scratch; retain evidence and prior public cache/candidates/dist; reconcile every row and seven-category score | Cleanup receipt, source/durable diff and cumulative evidence audit; final API report | Not Tested |

### Explicitly outside this revised increment's execution claim

Mac↔Linux/native-Mac/managed-Mac-client cross-node qualification; independent physical/LAN
and independent-kernel interoperability/host-allowlist denial; external-computer public
join. These are **deferred/not executed, not Passed**. Existing Mac API006 source/reboot
proof remains valid only at its recorded scope. Public join parser/validation regressions
remain relevant but cannot stand in for an external-computer join. Designer owns recording
this acceptance change from SR024. Mac Docker STORAGE remains deferred as before.
Authenticated native-agent/tool/peer-close/artifact journeys, personal verification,
advanced outage isolation and public release qualification retain their earlier deferrals.
A completed artifact REST regression can be carried without claiming a native agent ran.

### Scope-change checkpoint

API007 has only setup/tool/build receipts, not a functional result. Mac clone removed;
Linux preparation advanced during user interruption, then that exact VM was stopped.
E7/scope-change-cleanup-correction.json controls over the initial premature no-running-VM
purpose text. Linux clone/cache and current server build retained solely for single-VM
resume, with final removal owned by L26. No two-VM network test executed. No production or
durable coverage changes yet. Next action: canonical acceptance alignment, then run L01–L26.
