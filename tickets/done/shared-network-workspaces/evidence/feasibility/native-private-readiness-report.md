# Native Codex Private Roots And Bounded Readiness — Executed Feasibility

Owner: Solution Designer. Package shared-network-workspaces. Approved intended behavior remains SR-009. These are designer-owned capability prototypes, not product implementation, current-source validation, independent API/E2E, Mac/LAN or completed setup proof. Authorities: solution-designer skill/architecture/design gates and repository AGENTS.md/DESIGN.md/TESTING.md, read in this conversation. Exact runners/commands/configuration/results/failure receipts are in FR-015–018/020; prior rounds remain historical.

## Node And Result Table

All nodes below ran in one Mac's Docker Desktop Linux VM. Shared Docker root `/home/autobyteus/shared`, project `/home/autobyteus/shared/project`. Immutable application image `sha256:62ee64827c53610eac932413a5cbe11761d713cda46609d2fa53c6495758b35a`; Linux Ganesha4.3/VFS service, explicit Docker-network gateway allowlist, sec=sys/AllSquash10001:10001, mode0770. Test permission model, not a final supported security decision.

| Round | Service node | Client nodes / execution | Result | Not proved |
| --- | --- | --- | --- | --- |
| FR-015 | ab-sf-fr015-68c77fbb-storage-server | ab-sf-fr015-68c77fbb-app-a (API59852), ab-sf-fr015-68c77fbb-app-b (API59854); independent native Codex app-server0.162.1 processes, model gpt-6.1-sol | 9 named passes / exit1: three core native write/read-modify/reopen turns pass; next B turn fails with provider `serverOverloaded` before file operations | B peer-cleanup native turn and resume not completed; no production createAgentRun adaptation |
| FR-020 | ab-sf-fr020-313c4685-storage-server | ab-sf-fr020-313c4685-app-a / app-b, independent native Codex0.162.1 / advertised gpt-5.6-luna | 11 named passes / exit0, five actual native turns: full core round trip, peer cleanup survival, replacement-private-root same-thread resume | Still not production createAgentRun integration or process-root sharing isolation |
| FR-016 | ab-sf-fr016-91f1f5b4-storage-server | ab-sf-fr016-91f1f5b4-client, UID10001/capabilities0 Node worker | 1 pass / exit1; wrong inspector assumption rejected valid Docker NFS source | No subsequent health/outage cases in this round |
| FR-017 | ab-sf-fr017-0ae2435f-storage-server | ab-sf-fr017-0ae2435f-client, same unprivileged scope | 5 passes / exit1; externally chmod-ing a previously read inode to000 still allowed a cached matching read after2s | Exact cache/delegation origin and immediate revocation not established |
| FR-018 | ab-sf-fr018-6aec659d-storage-server | ab-sf-fr018-6aec659d-client, same unprivileged scope | 9 passes / exit0: identity/source/local-fallback/fresh-denial, paused service, check/use race, recovery and local heartbeat | Production admission/file/run paths, Mac implementation, physical LAN and final command remain unproved |

## Native Private Skill Evidence (FR-015)

Networkless native schema generation first established the installed0.162.1 contract: `skills/extraRoots/set` accepts process-wide `extraRoots`; `skills/list` supports `cwds`/`forceReload`, not the newer documented per-CWD parameter; input supports explicit typed skill name/path. Schema receipt at `codex-private-skill-schema.json`. Current [official app-server documentation](https://learn.chatgpt.com/docs/app-server) describes process-wide roots and typed skill inputs; do not override installed-schema/native evidence with newer documentation.

Each owned independent native process receives its node-private skill parent: A `/home/autobyteus/data/native-fixtures/a`, B `.../b`. Native discovery and typed binding find each private manifest while native thread cwd stays the same shared project. A actual commands read unknown private supporting bytes and publish them; B reads A bytes not copied into its prompt and appends B's different private supporting bytes; A freshly reads B's change. Independent mounted/backing exact-byte assertions pass. A process stops and A private bundle is deleted without changing project bytes; project `.claude`, `.codex`, `.agents` were not created by these prototypes.

Next B turn has a native failed-turn `serverOverloaded` receipt and no file command. This is provider-capacity failure, not evidence of filesystem/private-skill failure or pass. Resume was not attempted after that failure. Keep the failed round; a later successful bounded repeat must be separately recorded. Read-only node-0 Codex credential tar stream into deleted owned homes, no host credential file/value logging or source configuration change.

Production design implication: current `CodexAppServerClientManager` caches by cwd and shares one app-server process across threads. Process-wide private roots cannot safely be switched independently per run on that cached client. Investigate a real configuration/lifetime isolation boundary before selecting a remedy; do not silently mutate shared process roots or disable skills.

## Health Capability And Retained Failure Boundaries (FR-016–018)

FR-016 expected device `IP:/export`; actual Docker NFS device in mountinfo is `:/export`, with server IP in `addr=`. FR-017/018 check both export device and actual `addr`, not just a matching directory or export string.

Parent does only local mount-table inspection, then a bounded600ms raw TCP ONC-RPC NULL call. NFS RPC liveness is not storage identity, authorization or write-access proof. Protocol sources: [ONC RPC](https://www.rfc-editor.org/info/rfc5531/), [NFSv4](https://www.rfc-editor.org/info/rfc7530/). Only the isolated child executes network `statfs` plus protected-storage UUID read. Parent imposes1500ms response deadline, then signals that exact child; it retains the worker slot until actual `close`, not until merely sending a signal. No unbounded pool of blocked probes; parent event-loop/private local heartbeat remains responsive.

FR-017 changes already-warmed identity permissions externally and still reads cached UUID after2s. Exact cause unresolved. FR-018 separately tests a fresh never-warmed root-owned000 inode and gets EACCES/PERMISSION_DENIED. This does not retroactively pass FR-017 or establish instant permission revocation.

FR-018 paused service: three UNAVAILABLE responses ~0.602s, no new filesystem children, local heartbeat continues. Race: RPC first succeeds, then service pauses before the filesystem phase; parent returns INDETERMINATE/FILESYSTEM_PROBE_DEADLINE at1.503s with `exitConfirmed:false`, and max live children remains1. After restoring service, expected UUID is verified and no child remains. Local fallback directory's bytes stay unchanged. These controlled capabilities support bounded readiness design; they do not intercept all native syscall writes or eliminate check/use races.

Current production Claude `withGuardedProcessCwd` calls synchronous fs.statSync/chdir; guarding only the selected run creation while later doing synchronous network IO would not keep unrelated operations responsive. Existing SDK cwd option was exercised without process cwd change in previous native prototype, but removal for all production MCP/agent paths is not established by this report.

## Safety And Remaining Work

Every exact owned Docker container, volume, network and matching service-image tag from these rounds was removed. Fresh54 absence checks all pass; original application image retained, no global prune (`sr010-docker-resource-audit.json`). No host mount/admin dialog, user node/data/config mutation or local model loaded. All owned round execution sessions have exited.

FR-020 separately repeats the experiment after the retained provider failure, using advertised gpt-5.6-luna (not an undocumented model string or skipped turn). Five actual native turns pass. A private cleanup leaves active B able to read previously unread private bytes; B closes and resumes the same native thread with a replacement private root, after deletion of the old root, and reads its changed nonce. No shared runtime directories appear. This proves a native private-root capability, not the production manager isolation boundary. FR-015 remains failed.

Still required: preserve configured/project-owned skill names/collisions and private generations, actual Mac client, real independent Linux computer/private-network proof, full safe one-command setup/distribution/restart and selected managed Docker integration, definitive security/permission contract and architecture design. User now prefers an agent-operated isolated macOS VM; a guest VM may prove native macOS operations but not a separate physical computer or real user's privilege/setup journey. No finished user command exists. Separate FR-019 VM preparation is not included in this report's cleanup claim.


## Later Native Mac Evidence (Supersedes The Earlier Mac-Untested Sub-Gap)

FR-026 now proves the core public-workspace-selected Mac/Codex -> Linux/Codex -> Linux/Claude -> Mac reopen journey, four actual turns, in macos-vm-feasibility-report.md. FR-029 separately proves bounded native Mac readiness in a component Python owner,14 passes/exit0: source/storage/missing/permission/paused-service/race/recovery and exact-child lifetime. It does not integrate the production Node admission or make NFS reads universally time-bounded. Native Mac/client capability is no longer missing; physical separate-Linux/LAN, full guided setup/default Git and production runtime/admission paths remain gaps. Fresh full SR-010 Docker recheck in sr010-docker-resource-audit.json supersedes old54-check scope. Credential-bearing VM disks deleted; public base cache intentionally retained.
