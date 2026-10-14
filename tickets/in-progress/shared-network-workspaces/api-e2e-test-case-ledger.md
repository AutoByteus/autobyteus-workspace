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
