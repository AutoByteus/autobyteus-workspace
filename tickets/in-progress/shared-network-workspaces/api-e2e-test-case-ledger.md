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
