# Backend Correctness Follow-up — SR-016

## Result and limits

Designer-owned capability investigation, not production implementation, architecture approval, final API/E2E validation or a finished installer. Intended behavior remains Approved SR-015. User requires continuation through a proper handoff and working delivery; the power interruption did not cancel that task.

**Do not select unmodified UNFS3 0.11.0 for ordinary shared project work.** Simultaneous exclusive-create violated AC-004. A narrowly corrected prototype restores the measured exclusion on Linux, but nonroot file-close permissions and a later Mac-source Git stale-handle failure prevent treating that patch as a fully qualified cross-platform backend. FR-051 is a scoped Linux success, not all-mode success.

## Executed rounds, nodes and paths

All experiments use one physical Mac. Linux nodes are its Docker Desktop VM; native Mac client nodes below are credential-free macOS 26.6.2 arm64 guests. None is the required independent physical Linux computer. Common client mount: `/Volumes/autobyteus-shared`; project: `/Volumes/autobyteus-shared/project`. Native/source filesystem operations are real, not API file copies.

| Round | Storage node / source | Client nodes | What actually happened |
| --- | --- | --- | --- |
| FR-048 | `ab-sf-fr048-89d4026b-server`, isolated Linux volume `/export`, process UID10001 | `...-client-a` UID10001, `...-client-b` UID501; direct RPC peers `...-allowed`/`...-excluded` | 3 checks pass: allowed MOUNT3 status0/excluded13, owner presentation, client-root denied private root directory. Concurrent `wx` attempts both return WON: failure, runner exit1. |
| FR-049 | `ab-sf-fr049-f3e78b84-server`, fresh isolated Linux source | `...-client-a`/`...-client-b`, same UID split | 6 of12 paired exclusive attempts have two winners. Packet metadata captures distinct binary CREATE verifiers whose prefixes before NUL match in5 fully captured failures; one failing pair has incomplete capture. Separate Git harness interpolation error, not a Git backend verdict; runner exit1. |
| FR-050 | `ab-sf-fr050-7c155f0a-server`, same pinned engine plus binary-verifier patch, nonroot | `...-client-a` UID10001 / `...-client-b` UID501 | 12 of12 paired exclusive trials have one winner; network/owner/root-denial checks pass. Corrected Git harness exposes actual loose-object file-close permission failure even on clientA; runner exit1. |
| FR-051 | `ab-sf-fr051-51270571-server`, patched engine, root daemon **without `-s`**, data requests all-squashed UID10001:GID10001 | `...-client-a` UID10001 / `...-client-b` UID501 | 5 scoped checks pass/exit0: allow/deny, preserved source owner, client-root denied private directory and creates UID10001 files,12 of12 exclusive trials, coordinated Git commits with exact-project per-process trust. No global Git config change or client-root export. |
| FR-052 | `ab-sf-fr052-2ecf19a0-server`, chosen ordinary Mac scratch folder bind `/export` | planned native `ab-sf-fr052-macos` and Linux clients | Server/source check passes; old application image b141 absent when first client starts. Environment prerequisite failure, no new mounted/Git proof; runner exit1. Exact clone retired. |
| FR-053 | `ab-sf-fr053-d94621ec-server`, patched squashed-data daemon, original Mac ordinary source | native `ab-sf-fr053-macos`, `...-client-a`/`...-client-b` | 7 scoped checks pass: same storage identity, actual native mount, reciprocal source/native/Linux exact writes, rename/symlink/execute/sequential exclusive create/preservation. Native Git initialization fails with stale NFS file handle on `.git/config`; planned native concurrency check not reached. Runner exit1, root cause not established. |

FR-053 source path and exact timings/endpoints are in its `probe-result.json`; original/source content remains task-owned and is removed only after mounts/clients detach. Its clients use the public-source probe image rather than the missing old application image: no current-source or new instructed-agent claim.

## Reproduction and source basis

Internal investigator commands, **not the user setup command**:

`python3 tickets/in-progress/shared-network-workspaces/evidence/feasibility/fr-048/run-probe.py`

Analogous commands for FR-049,050,051,052,053. FR-050 first builds its local Dockerfile as `ab-sf-fr050-unfs:probe`. Exact native mounts, Docker volume options, RPC and Git argv, outputs/exit codes and cleanup are in each round receipt. These scripts are not a distribution or a substitute for the user's one-command service.

Pinned upstream commit `ec1660ba33c80d5c67131e163e68834c1a10e243`, source archive SHA256 `1fb13de8a15f535c3fea92cc6aaa731b42936a3a29839ec9db4d2833b216ecb5`. Public base probe image `sha256:951795d5b29890feada3af4e2773690404a85a37065bd89eb0729327a13f2b60`; corrected prototype image `sha256:feb18a8f02a7470eb5427abac1dc8794da707ff6fbcbc14cdb850c28fbcf977b`. No release/push or existing application image mutation.

Primary source correlation: [upstream CREATE implementation](https://raw.githubusercontent.com/unfs3/unfs3/ec1660ba33c80d5c67131e163e68834c1a10e243/nfs.c) hashes an eight-byte verifier using [a NUL-terminated string hash](https://raw.githubusercontent.com/unfs3/unfs3/ec1660ba33c80d5c67131e163e68834c1a10e243/Config/exports.y). Distinct verifiers with the same prefix before NUL are treated as the same retry. Captured pairs and `fr-049/exclusive-create-cause.json` support this cause for the fully captured failures. No claim that every packet or failure was captured. [Current upstream release list](https://github.com/unfs3/unfs3/releases) still identifies0.11.0; the inspected current source retains the same hash call, not a verified upstream remedy.

`fr-050/fix-verifier.py` changes only CREATE verifier hashing to consume all eight bytes; no export/password/path hash changes. This is a counterfactual prototype, not an approved vendor fork or shipping backend. It retains the upstream32-bit time-stored hash design and its limitations. A production choice would require explicit pinned patch maintenance/licensing/testing in the final design, not copying this image into a release.

[Upstream single-user behavior](https://raw.githubusercontent.com/unfs3/unfs3/ec1660ba33c80d5c67131e163e68834c1a10e243/unfsd.8) explains UID presentation; [write-by-owner code](https://raw.githubusercontent.com/unfs3/unfs3/ec1660ba33c80d5c67131e163e68834c1a10e243/user.c) attempts root elevation for writes to an owned readonly file. A truly nonroot daemon cannot perform that elevation. The FR-051 change uses normal NFS daemon privilege with all-squashed data and proves the tested client-root denial still holds. It is not `no_root_squash`, daemon-root single-user mode, a wildcard export or permission rewriting. Mac-bind stale-handle origin remains unknown: do not invent a further engine fix from this inference.

## Decisions and remaining gates

- Reject the unmodified UNFS3 candidate and the fully nonroot variant as the qualified whole-project solution. Keep their failures, do not dilute AC-004 or narrow projects to text artifacts.
- Root daemon with squashed data is distinct from granting client root. Standard NFS privilege cannot be waived merely to make a nonroot marketing claim; bounded privilege and actual data-denial checks are the contract.
- Exact-project private process Git trust is experimentally feasible (FR-051 and earlier FR-028), not a global wildcard or recursive source ownership repair. AutoByteus runtime/terminal integration and ordinary external-shell guidance remain design work.
- Mac-bind whole-Git mode remains unqualified despite seven useful FR-053 passes. Existing Apple nfsd/APFS proof and Linux Ganesha proof remain alternatives at their actual scope, not automatic parity across all approved hosting modes.
- No authentication/encryption waiver, physical-gate change or scope narrowing inferred from “working v1” or “continue.” Two focused direct-user questions remain pending: chosen trusted-LAN-only plaintext policy; physical proof before delivery instead of before implementation. They do not settle these owned backend/integration gaps themselves.
- Next owned work: settle a folder-compatible backend/mode design, qualify privilege/transport/native-source lifecycle, finish private runtime profile/CWD/action and package contracts, then classify and route the completed approved package. Do not send Draft to Implementation Engineer.

## Safety and interruption audit

FR-051 had completed before the interrupted PTY was polled; after resume its log/receipt and cleanup show completion, while the former PTY ID is unknown. It was not rerun or retroactively reported running. Subsequent rounds retain new results independently.

`sr016-resource-audit.json`:48 exact Docker resource absences rechecked; per-round cleanup rc0. FR-052/053 exact credential-free VM processes exited and clones were deleted; no host shares or provider credentials. No active experiment remains. Task-owned host scratch removed; original storage/mounts/nodes, CLI homes, databases and login state untouched. Public pinned task images/cache retained intentionally. No global prune, guessed host access, LAN scan or external vendor publication.
