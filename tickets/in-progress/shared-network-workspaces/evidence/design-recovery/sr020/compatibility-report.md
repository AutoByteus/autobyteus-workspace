# SR020 — Linux reference compatibility recovery

Status: **completed Design Impact recovery / SR020 Architecture Design Complete, Large/High; independent re-review required.** Prototype succeeds at its stated scope; product qualification remains incomplete. Owner Solution Designer. Task shared-network-workspaces / project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63. Intended behavior remains Approved SR018. Incoming CRR005 CR003/API-F002 is Design Impact on selected dependency, not a requirement gap.

## Known production path and failure

`create` -> elevation/root binary -> plan/consent -> `setup.Apply` -> `backend.InstallUbuntuPackages` exact distro pins/default-unit mask -> original nonroot source marker/handle probe -> owned native Ganesha config/systemd -> actual hard TCP NFS4.1 mount -> `service.NonrootProbe` -> confined `config.ReadMarker` directory open -> EREMOTEIO. API002's two fresh native Ubuntu creates17.258s/16.252s and both reconnects fail. Source bytes/identity preserved; mounted ordinary reads succeed. No peer route/outage is needed. REQ001/003/004/006/014/017/018/019; AC012/018/019; SCN001/011/013; BEH001/004/005.

CRR005 independently replayed this directory pattern in Python on the same kernel/image/packages: originalY2fail/1pass, diagnosticN3pass, restoredY2fail/1pass, local ext4control3pass. It restored the guest-only parameter and disposed all resources. This rules out Go being necessary to trigger it, not every possible Go issue. Exact original OP_ILLEGAL packet attribution remains an inference: the reviewer's capture had no packet records. See reviewer-owned primary-contracts.md, diagnostic-summary.json and API002 raw receipts, unchanged.

## Primary-source investigation / alternatives

- [Accepted upstream correction98eb77c](https://github.com/nfs-ganesha/nfs-ganesha/commit/98eb77c4fd94effa6882b214698a77752ec79f6e),2026-04-10: GET_DIR_DELEGATION dispatch/free handler maps to existing NOTSUPP rather than ILLEGAL. Two field substitutions, no new filesystem or client policy. V4.3 already has NOTSUPP preserving request operation number: [existing handler](https://github.com/nfs-ganesha/nfs-ganesha/blob/V4.3/src/Protocols/NFS/nfs4_op_illegal.c).
- [Upstream issue1385](https://github.com/nfs-ganesha/nfs-ganesha/issues/1385) is a related newer-engine/Gluster report and fix confirmation, not our VFS test. [Release list](https://github.com/nfs-ganesha/nfs-ganesha/releases) shows9.13/9.14; no claim those major-version changes are qualified for this product.
- Bounded [official maintainer PPA inventory](https://api.launchpad.net/1.0/~nfs-ganesha/ppas) and7-family published-source query found Noble7.0-ubuntu1~noble2 published2025-08-08, before the accepted fix. It is not evidence that no corrected package exists anywhere. Raw normalized fetches/hashes in public-source-discovery.json. No external repo/key added to the host or guest.
- Exact [Ubuntu4.3-8ubuntu1 source](https://launchpad.net/ubuntu/+source/nfs-ganesha/4.3-8ubuntu1) obtained through the fresh guest's authenticated Ubuntu source index, matching `.dsc` SHA256 `ffa76c26b12d23b67dcda184d7ec7ae55a42d1d14bf84bb7c0cf0134156ba3ca`. Referenced original tar SHA256 `d4efd020edf4dfe65abfd0f0f66eb4390613360f99dce4354467ab297e0e1c0f`; Debian delta `ef35d130e1b37149b156d201b70e6c2804bebbfbee1713c5bd6d938dd433fe03`. The signed-control text and actual file sums are retained in raw attempt receipts. Distro patches/rules are retained, not replaced by a custom minimal build.

Selected candidate: retain this distro source/client/OS/protocol/config and apply only the accepted upstream correction, with distinct package revision4.3-8ubuntu1+autobyteus1. This has a much smaller runtime compatibility delta than moving to9.x; avoids a global kernel toggle or weakening confined reads. No assertion of perpetual support for deprecated4.x: product owns this explicit backport and must qualify any later replacement. This is an engineering dependency disposition, not changed intended support or a new security/public-service policy. Requirements remain byte-identical.

## Experiment plan, evidence and limits

Designer-owned isolated Ubuntu VM self-mount only, same public digest as API002, no host root/mount/network/security changes. Fresh private Tart HOME/cache, no shared folders/clipboard/USB, baseline environment, no credentials or provider inference. Rebuild packages in guest; compile unchanged current CLI in a disposable source copy with only release.json candidate pins changed. Install candidate packages **before** public CLI experiment. This preinstallation is a deliberate dependency-feasibility boundary: it does not prove the designed new embedded-package installer/clean-machine bootstrap. Source hash in candidate metadata describes unchanged CLI source, not a released all-component candidate.

Attempt1 retained under attempt-1/: source/patch preparation passed; build did not start because harness omitted `fakeroot` while disabling apt recommends. dch's missing distro-info warning also retained. No patched engine/public create, not a product failure. Exact VM/root cleaned. Attempt2 adds those build tools: patched public create passes1.207s, source/UUID/modes/jobs observed correct, then harness incorrectly counts UUID occurrences in combined marker+mount output and stops before operations/reconnect. Retained overall Incomplete, not a product failure. Attempt3 only fixes that assertion to parse the two JSON marker lines and completes. See attempts.md and complete raw scripts/receipts; no failed attempt overwritten.

## Completed experiment table — explicit nodes and paths

| Attempt / node role and ID | Source and mounted path | Executed boundary | Result / limit |
| --- | --- | --- | --- |
| 1 / owned native Ubuntu build VM `ab-nfs-sr020-0c98a83d` | Fresh ext4; no product mount reached | Exact distro source/patch then Debian build | Harness missing fakeroot; no engine/create result; disposed |
| 2 / owned native Ubuntu server + self-client `ab-nfs-sr020-025c6aff`,192.168.64.4 | Source `/home/admin/ab-sr020-source/project`; mount `/Volumes/autobyteus-shared/project` | Local patched packages, unchanged CLI with candidate pins; public create | **hostReady true1.207s**; Y/hard4.1/source identity/bytes/UUID/jobs/modes observed. Later UUID-count harness assertion fails; no reconnect/operations tested; disposed |
| 3 / separate owned native Ubuntu server + self-client `ab-nfs-sr020-34a15a0e`,192.168.64.4 | Same path convention, fresh source inode64769:793410/1000:109/755 | Public create then original+mounted identity verification | **Pass1.154s**, hostReady true; original SHA256`b8ba0871a3b5e33c549ffea3e6d19135d86b5052a3ee00946fe4a95380043161` matches; UUID`cb50f1bd-1e05-489f-9792-a17b5822ec00`; job+engine active; private root0700/attachment0600, public descriptor0644 |
| 3 / exact nonroot1000:109 with groups cleared on same mounted client | `/Volumes/autobyteus-shared/.autobyteus-nfs/storage.json`, project files above | 60 repeated directory open/stat/close/reopen/read iterations; write/fsync/rename/relative symlink/read | **Pass**, original source sees `SR020_READ_MODIFY`; no client parameter or confinement change |
| 3 / same public native client/service | Same source/storage ID/root | Public `reconnect --yes --json` twice | **Pass0.445s and0.619s**, same UUID/hostReady true; default directory_delegations remainsY |
| All three / host resource boundary | Separate private Tart HOME/cache and temporary roots | Stop exact guest, wait exact PID, delete clone/private root | All rc0/absence receipts. No host mount, network, credential, user Docker/node/source change |

All actual guests used Ubuntu24.04.5 aarch64, kernel7.0.0-38-generic, ext4 and the exact API002 public image digest. Only one physical Mac runs these sequential VMs: **not independent physical LAN or peer proof**. Native self-mounted NFS actually ran, not a mocked/Go-only filesystem. The Mac host was the test controller, not a new Mac NFS participant. Docker/amd64/native-agent/UI tests did not run here.

Internal experiment invocation (NOT a published user command):
```sh
umask 077
/home/admin/ab-sr020-binary create --source /home/admin/ab-sr020-source \
  --backend ganesha-native --endpoint 192.168.64.4 --allow 192.168.64.4 \
  --nodes none --yes --json
/home/admin/ab-sr020-binary reconnect --yes --json
```

Candidate CLI SHA256`6dd100bdc91f5566762f2b2d54f5a38624acfad48878032d4251d4e062839acd`; unchanged Go source/metadata-only copy, official verified Go1.27.2. Final observed engine `.deb` SHA256`f88a9f7da43b085765eb8d90dd33a8532e725ecc5d616d118899660081eca84d`, VFS`f36c73a48decf70ea0261c67bdbbee18b9752f689449618f7c7df4e729ddc147`. These are **experimental outputs, not release-lock values**. Attempt2 hashes differ because the experimental changelog/build timestamps differ; bit reproducibility is not proved. APT package dependency metadata is retained; VFS requires the exact custom main version and uses distro runtime libraries. Building with broad build dependencies is not a clean runtime-only package install test.

The auto-generated experimental quilt header still contains its template/old changelog attribution; it is not a production-ready patch or upstream attribution record. The two-field diff and authoritative upstream commit are separately explicit. Implementation must create correct provenance/notice/source artifacts and deterministic build inputs. No prototype `.deb`, compiler, patch script or author template is to be copied blindly into a user's setup. No full packet capture was performed; the observed successful candidate supports the compatibility selection without retroactively proving historical wire bytes.

## Productization boundary to review

Canonical technical authority is design-spec.md SR020, not this experiment script. Existing installer/bootstrap -> root-owned binary -> backend installation owner stays; corrected per-architecture `.deb` pair is built in the existing CI release, immutable/hash-verified and embedded in Linux binary, with complete corresponding modified source/notices. Same artifacts go into slim Docker storage image. No host source compilation/PPA/additional user command. Existing nfs-common/distro dependencies, consent/mask ownership, source UUID/squash/allowlists/confinement, default path and reconnect policy stay. No production implementation or package publishing by Solution Designer.

CR001 and CR002/nativeMac cold-create remain resolved at their recorded scopes; no broadened Mac/peer/reboot claim. ARCH-REV003 remains historical Pass on019; API002 remains Fail57.14%/broader Required; CRR005 remains its completed origin finding, not edited to Pass. D001/DEC015 outage isolation deferred; IMP-D001 private links/independent source deletion/AGY/local policy preserved. FUP001 PM custody unchanged. Peer-NAT environment limit and hardened private-LAN validation setup are still downstream matters; no unsafe bridge workaround is proposed.

After design review and implementation/source review, API-F002 public create/reconnect **without manual preinstallation** comes first, followed by both architectures, Linux native/Docker storage, native/managedDocker clients on both OSes, normal peer operations/restart/detach/preservation, actual native agent tools/linked assets/peer-stop/restore/Standalone-Team-Org, healthy mounted desktop previews, independent physicalMac/Linux/Docker, docs/finalization/user verification/authorized release. Prototype results cannot fill those gates. Main Task open; no user install command or100% claim.
