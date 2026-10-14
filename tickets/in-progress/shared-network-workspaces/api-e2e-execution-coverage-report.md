# API/E2E Execution Coverage Report — Shared Network Workspaces

## Latest authoritative result

**API-REV-002 / Round 2: Fail. Final validation confidence 57.14%. Broader validation Required.**

**Prior API-F001 resolved first:** two independent fresh nativeMac creates pass with current reviewed source, no reconnect/manual mount. **New API-F002:** two fresh Ubuntu24.04/ext4 native-Ganesha creates fail at the nonroot storage marker probe after successful package installation and NFSv4.1 mounting. Ordinary mounted reads succeed; public reconnect still fails. A diagnostic using the installed binary and exact nonroot identity passes against the source and fails against the mount with `EREMOTEIO` on a directory `openat`.

Preliminary origin **Unclear** at the native Linux NFS/Ganesha/kernel/Go confined-reader boundary. Request focused failure-origin review; no production fix or root-cause claim. The normal first-use failure is not deferred outage isolation. Separately, Mac peer validation encountered an unreachable isolated-VM network; this is an environment gap, not a proven healthy-network product defect. No complete-testing, API/test-code, delivery or release Pass is implied. All owned resources retired.

## Execution round meta / authority / routing

- Task `project_task_0793009f-41bc-4684-9cbe-9a29ad26ed63`; worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/shared-network-workspaces`; branch `codex/shared-network-workspaces`; finalization `origin/personal`.
- Current execution Round2 / API-REV-002, triggered by code_reviewer CRR004 source Pass / IR004. Prior completed API-REV-001 **Fail/57.14%**, reviewed and preserved in [revision record](api-e2e-revision-record.md), ledger and raw E1 evidence. Source-review100/100 is not validation confidence. IR004 handoff's CRR003/API001 Fail describes its trigger, not the latest source review or this completed validation.
- Input HEAD `82dd5d9d53e2e4f5e022ff3f6f0e196ebd3602d8`; source fix `174e480bd0cfaee29f22fd46b1922afbb274e56b`; review artifacts `24b6955897`. Production source hash **497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da** unchanged throughout. No source/test edit this round.
- [Requirements](requirements-doc.md), [approval SR018](approval-record-sr018.md), [investigation notes](investigation-notes.md), [design Ready SR019](design-spec.md), [solution history](solution-revision-record.md), [solution handoff](solution-design-handoff.md).
- [Design review ARCH-REV003](design-review-report.md), [architecture history](architecture-review-revision-record.md), [scope feedback](architecture-review-scope-feedback.md), [implementation IR004](implementation-handoff.md), [implementation history](implementation-revision-record.md), [source review CRR004](code-review-report.md), [source-review history](code-review-revision-record.md).
- Complete cumulative absolute authorities/supplements/source/test/evidence paths: [E2/package-index.json](evidence/api-e2e/api-rev-002/package-index.json). Includes IR001–004, CRR001–004, original feasibility/selection/runtime limitations and every failed candidate; none promoted to whole-product proof.
- Canonical [coverage investigation](api-e2e-coverage-investigation.md), [ledger](api-e2e-test-case-ledger.md), [API revision record](api-e2e-revision-record.md). Delivery report/revision **N/A — not yet performed**; Product supplement **N/A — not applicable**.
- **Large / High / Reviewed** retained. Successful output would require proportional Code Review for cumulative API-owned test changes. Current **Fail** instead requests focused failure-origin review; successful-test review not yet applicable. No delegation, merge, push, tag, release, main-Task completion or explicit final user verification.

Evidence abbreviations below: **E2** = `evidence/api-e2e/api-rev-002/`; **E1** = `evidence/api-e2e/api-rev-001/`, both under this ticket. All raw results survive scratch cleanup.

## Investigation and execution basis

Investigation/ledger initialized before execution; current upstream package and root `AGENTS.md`, `DESIGN.md`, `TESTING.md`, NFS README/packaging RELEASE, server/web AGENTS and isolated-app guidance read. No closer NFS testing guideline. Prior failure rechecked before unrelated validation: only checksum-verified official Go acquisition/build preceded V02-repro/V01. Narrow current Go/Python checks followed, then the recorded57.14% post-repository gate required broader testing.

Material deviations: peer route isolation prevented V02's healthy-network steps; no unsafe bridge/root/network change used. Continued safe Ubuntu setup, with normal build-only candidate metadata because tracked development metadata intentionally has no Linux pins. Two public Linux creates then exposed a new in-scope failure. Stopped unrelated matrix expansion and performed bounded diagnostics before rerouting. No durable validity decisions reversed or obsolete assertions removed this round. Original scripts/results are archival executed evidence, not assertions that their unexecuted downstream branches are green.

## Prior failure resolution — completed before evaluating the new failure

E2/prior-failure-resolution.json records **API-F001 / CR002 resolved at tested nativeMac cold-create scope**. Separate fresh V02-repro and V01 creates passed11.571s and22.772s under077, actual sudo/root installation, nonroot501:20, same original source inode/device/UID/GID/mode, source/mounted bytes and UUID, installed binary, private700/600 and live launchd asserted. No reconnect, manual mount or readiness workaround. Two clones retired. A subsequent V02 server create also passed, but its peer test did not.

Mac binary SHA256 `19e93a1a1b44913564dc81fdaea3a7d55e22702120d6c2494007c80e1319a9e0`; unchanged development-unqualified metadata. Different VCS build identity from implementation's binary, same audited production hash. The prior API001 failure/reconnect records and IR004's eight attempts remain historical, not erased. This is not a general statistical reliability, peer/reboot, physical or published-installer qualification claim.

## Test-case ledger reconciliation / changed boundary matrix

Ledger initialized before execution: **Yes**. Completed cases/checkpoints recorded immediately in result JSON and ledger; focused diagnostics reconciled after their commands. No running/interrupted case remains. Final event is completed round/cleanup. Reuse N01/V01/V02/V02-repro/V03/V04/V05; added V03-repro for fresh Linux reproduction.

| Case | Boundary / AC | Surface and evidence type | Final result | Evidence and limits |
| --- | --- | --- | --- | --- |
| V02-repro | Prior first-create regression;012,018,019 | Actual fresh Mac CLI/root/Apple/APFS; temporary/live | Pass | E2/V02-repro-result.json, create11.571s; independent source/mount/modes/job assertions |
| V01 | Second independent fresh nativeMac create;008,012,017–019 | Actual separate VM; temporary/live | Pass | E2/V01-result.json, create22.772s; no recovery invocation |
| N01 | Go platform/backend/setup/private modes/bootstrap/launcher;006–009,012–019 | Durable repository race/vet/Python | Pass with explicit skips | E2/narrow-checks-result.json and logs: all7 Go test packages; Python42enumerated/39pass/3skip |
| V02 | NativeMac peer connect/healthy operations/reconnect/reboot/detach;001–010,013–019 | Two actual VMs; temporary/live | Blocked for healthy-peer proof; raw connect Fail retained | E2/mac-matrix-result.json: server createPass, peer mount_nfs60 timeout. E2/mac-matrix-live-diagnostics.json: peer routeREJECT/pingHost is down. Not a demonstrated healthy-network defect; later operations not reached |
| V03 native | Ubuntu24/ext4 native-Ganesha create;008,012,017–019 | Actual root install/pinned apt/systemd/kernel NFS/nonroot; temporary/live | Fail, API-F002 | E2/linux-native-result.json: first create17.258s; E2/linux-native-focused.json: ordinary reads pass, public reconnect fails |
| V03-repro | Independent fresh Linux reproduction | Same source-reviewed build, separate fresh VM | Fail, API-F002 | E2/linux-native-repro-result.json: create16.252s command/16.253s case; E2/linux-native-trace-corrected.json narrows source-versus-mount contrast |
| V03 remaining | DockerLinux storage, Linux native/managedDocker peer clients, physical matrix | Planned actual systems | Not Tested | Paused for failure-origin review; no Docker resource created |
| V04 | Current mounted explorer/media/HTML/static/artifact and Guide desktop journey;010,020 | Planned isolated worktree app | Not Tested | No current desktop/browser run; user application untouched |
| V05 | Actual native tools/support assets/peer-close/restore/Standalone-Team-Org;002,006,010 | Planned isolated authorized native runtimes | Not Tested | No credentials imported/paid inference used; scripted transport is not actual native turns |
| N02/N03/N04 carried | Profiles/binding/source lifecycle/Git/REST/AGY/local/Guide | Unchanged E1 durable units/composed socket/scripted evidence | Prior results retained; not rerun | N02 133pass; N03 original35pass/5fixture-cleanup-fail then corrected workspace6pass plus scriptedAGY8pass; N04 Guide21 and terminal109pass. No NFS/whole-product promotion |

Python skips: standalone Go-child fixture skipped because parent Go executes the real child; pwsh unavailable; port8001 occupied, user's process untouched. Go race16.656s, vet5.610s, Python42.412s. Exact argv/cwd/environment in E2/run-narrow-checks.py and narrow-checks-result.json. Repository narrow checks passing did not prove Linux remote reader behavior.

### Carried non-green repository and source/test boundaries

Historical IR002 Nuxt4258pass/3fail/5skip and Electron188pass/3fail/1skip remain the same three unchanged updater-category failures; FUP001 already in PM custody. Current-source Electron reproduction, baseline-equal hashes and removed candidate disposition are retained. Removed candidate green logs are **not current source**. No suppression/patch/re-notification or NFS score penalty.

No additional repository suite after the post-repository gate. Subsequent commands were VM/resource setup, build-only Linux prerequisite, public CLI/diagnostic probes, source/artifact audits and cleanup. Current whole repository all-green is not claimed.

## API-F002 — Linux native first-use readiness fails despite mounted ordinary reads

**Expected:** approved native Ubuntu24/ext4 create from an existing nonempty nonroot-owned source completes one invocation, verifies real mounted identity/bytes and leaves its managed attachment service ready. AC012/018/019, SCN001/011/013; same-source/nonroot evidence relates AC008/017. **Observed:** both fresh creates exit1 at the nonroot marker probe after successful exact package installation, active native Ganesha and actual NFSv4.1 mount. No hostReady JSON, no attachment job; pending plan remains. No injected outage or peer routing dependency.

### Exact configuration and build provenance

- Ubuntu24.04.5 LTS, aarch64, kernel7.0.0-38-generic, `/dev/vda1` ext4; real guest admin1000:109 with passwordless guest sudo, clean environment, no credentials. Separate fresh clones from public digest `ghcr.io/cirruslabs/ubuntu@sha256:94dbb9c4b94db827a208fea301cf33eacdcbfb801155b5702b9e2faa52473a2e`. This is VM/current-kernel evidence, not independent physical or all-kernel proof.
- Native Ganesha4.3-8ubuntu1, VFS4.3-8ubuntu1, nfs-common1:2.6.4-3ubuntu5.1 installed by product; dpkg/apt policy receipts match reference pins. Configuration uses TCP2049/NFS4.1/sec=sys/All_Squash1000:109, exact self-client allowlist, chosen original path and private recovery state.
- The tracked embedded metadata is intentionally `development-unqualified` with empty packages. Rather than call that known refusal a defect, used documented `release.py --tag v1.5.3-beta.2 --output <owned-copy>/cmd/autobyteus-nfs/release.json` in a disposable source copy, then `GOOS=linux GOARCH=arm64 CGO_ENABLED=0 go build -trimpath ... ./cmd/autobyteus-nfs`. Version from existing web package; **no git tag, publishing, qualified targets, tracked metadata, release-lock or source change**. Only copied-tree delta was that normal build metadata file. Engine image empty because native mode does not use a Docker engine. E2/linux-candidate-build.json has full metadata, commands and delta.
- Production hash497efd6abb0c2cfa4c740a87f005c529cbf026a6fa218b3acd345826f4a923da; candidate and installed Linux binary SHA256 **9aae4944c680e3be1331f760f2c07794695a2dbea6327858ca87007b77111fd3**. Go1.27.2. Not a published/qualified installer claim.

First exact guest command through Tart's command agent, with env-i HOME=/home/admin, baseline PATH and LANG=C:

```sh
umask 077
exec /home/admin/ab-nfs-api002-linux-25fc064c-binary create \
  --source /home/admin/ab-nfs-api002-linux-25fc064c-source \
  --backend ganesha-native --endpoint 192.168.64.4 \
  --allow 192.168.64.4 --nodes none --yes --json
```

Second command identical except fresh clone suffix `5336c36d` and self endpoint/allow `192.168.64.5`. First original source identity `64769:577877:1000:109:755`; second `64769:577887:1000:109:755`. Fixture bytes `ORIGINAL_API002_LINUX`; SHA256 `ca408b84600659e3878b8bcdb27362694d8494fc85df5ecf41c8bde880c103e7` retained. Original sources preexist create and are not copies made after failure.

Both first invocations:

```text
AutoByteus NFS incomplete: nonroot storage check incomplete: exit status 1:
AutoByteus NFS incomplete: openat .autobyteus-nfs/storage.json: remote I/O error
```

The original source hash is unchanged in both postfailure receipts. Second clone's postfailure source inode/device/UID/GID/mode matches preflight. Its source and mounted preexisting file hashes and UUID `7f00baa9-8f2c-4163-aebf-59f03f3b7087` agree through ordinary sha256sum/cat. First UUID `a294c758-b1f7-40c9-84e5-6b9124671ae1`; its ordinary mounted marker/preexisting reads also succeed. Actual `findmnt` is nfs4,vers4.1,hard,tcp,sec=sys; engine active. Private0700/0600 remains correct. No assertion of all metadata preservation, reciprocal write semantics or mounted probe health follows from readable bytes.

Public `BIN reconnect --yes --json` on both failed clones still exits1, at `statat` or `openat` marker with remote I/O error, while explicitly resuming the same source/UUID. No manual mount, server restart or configuration workaround was inserted.

### Focused diagnostic contrast, not a substitute entrypoint

E2/linux-native-trace-corrected.json runs installed `/usr/libexec/autobyteus-nfs/autobyteus-nfs internal-probe ROOT UUID` under guest `sudo -n setpriv --reuid=1000 --regid=109 --clear-groups`, baseline PATH/HOME=/var/empty/LANG=C, with strace. Same binary/UUID/identity:

- Original ext4 source: rc0, complete probe (including sync/write/read/remove).
- Actual mounted root: rc1; first directory open succeeds, a subsequent `openat(fd, ".autobyteus-nfs", O_RDONLY|O_NOFOLLOW|O_CLOEXEC|O_DIRECTORY)` returns **EREMOTEIO**; product reports marker open failure.
- Subsequent public reconnect still fails. This is not merely a harness timeout, bad marker UUID, unreadable source or missing package. Exact responsible layer/mechanism remains **unproven**; do not infer it from Ganesha keytab/localdomain warnings or add a retry/fallback by assumption.

Initial diagnostic used the wrong guessed `/usr/local/bin/autobyteus-nfs` path; its two strace invocations did **not execute the probe**. E2/linux-native-trace.json preserves this diagnostic error (ordinary reads before it and public reconnect remain real). Corrected script/path is a separate artifact, not rewritten output. No production change.

Source pointers for focused origin review: `internal/config/source-marker.go` (`os.OpenRoot`, root.Lstat/root.Open), `internal/service/probe.go` (exact credential child), `internal/setup/apply.go`, `internal/backend/ganesha.go`, `ganesha_native.go`, `internal/platform/mounts.go`. Preliminary **Unclear**; recommended first focus Implementation Engineer's native Linux setup/probe/backend integration after independent failure-origin classification. Requirement/design recovery remains the designer's boundary if review finds intended-behavior uncertainty.

## Acceptance-criteria proof

Judge whole criteria, not one passing assertion. All critical; no `Only The User Can Check` waiver. AC016 is the historical feasibility gate only.

| AC | Critical | Cases and evidence | Result |
| --- | --- | --- | --- |
| 001 | Yes | V01/V02-repro actual Mac source; V02 peer blocked; V03 Linux mount but readinessFail; physical/Docker missing | Not Proven |
| 002 | Yes | E1 N02/N03/N04; actual native standalone/Team/Org/restore/support assets V05 missing | Not Proven |
| 003 | Yes | V02 route gap; healthy cross-client <=5s flush/close visibility not executed | Not Proven |
| 004 | Yes | E1 terminal109; actual peer filesystem/locks/coordinated Git/cwd matrix missing | Not Proven |
| 005 | Yes | Independent concurrent-file client matrix not reached | Not Proven |
| 006 | Yes | E1 refusal/no-substitute; Linux reports incomplete, not false ready; mounted product admission matrix missing | Not Proven |
| 007 | Yes | E1 Mac reconnect succeeds; current Linux reconnect fails; healthy restart/reboot peer bytes missing | Not Proven |
| 008 | Yes | E2 Mac real root501:20 and Linux1000:109/private modes; authorization/client-mode matrix incomplete | Not Proven |
| 009 | Yes | N01 mocks; actual selected Docker image/config/volumes/auth/ports/alias/rollback/detach not executed | Not Proven |
| 010 | Yes | E1 composed socket HTML/relativePNG/replace/delete plus artifact API; V04 mounted desktop/media/static/completed artifacts missing | Not Proven |
| 011 | Yes | Delivery, explicit user verification, finalization/release not performed | Not Proven |
| 012 | Yes | Mac first-create correction proven; Linux first createFail API-F002; guided/public-installer matrix incomplete | Not Proven |
| 013 | Yes | N01 launcher mocks only; actual managedDocker clients on both OSes missing | Not Proven |
| 014 | Yes | E1 pending Mac recovery; E2 Linux pending reconnectFail; consent/repeat/cancel/preservation incomplete | Not Proven |
| 015 | Yes | V02 peer connect actually attempted but route unavailable; no healthy second-computer product proof | Not Proven |
| 016 | Yes | SR017/018/019 feasibility and ARCH003; E2/package-index.json links complete selection/experiments/audits | Proven for prior feasibility gate only |
| 017 | Yes | E2 Mac original identity/bytes; Linux original preserved/readable through mount; reciprocal edits/restart matrix missing | Not Proven |
| 018 | Yes | Mac native subset passes; Linux nativeFail; DockerLinux storage and both-OS managedDocker clients absent | Not Proven |
| 019 | Yes | Mac managed job after first create; Linux no ready/attachment job; full start/restart/reboot matrix missing | Not Proven |
| 020 | Yes | E1 Guide21 plus historical rendered evidence; current mounted desktop not run. Intentional unqualified/unavailable release not changed | Not Proven |

## Validation confidence scorecard

| Mandatory category | Post-repository | Final | Evidence gain and remaining uncertainty |
| --- | ---: | ---: | --- |
| Requirement/acceptance proof | 50% | 50% | Mac failure resolved, new Linux critical first-use failure and remaining modes prevent raising anchor |
| Changed-boundary directness | 50% | 50% | Real Ubuntu apt/Ganesha/kernel/probe added; Docker/native-runtime/product matrix still critically missing |
| Cross-boundary realism/mock gap | 50% | 50% | Two real OS kernels + ordinary mounted reads; peer network and physical/current whole-product gaps remain |
| Environment/configuration/identity/fixture fidelity | 50% | 50% | Actual Ubuntuext4/root/nonroot joins MacAPFS; test build pins explicit. Physical, authenticated native and client modes absent |
| Failure/edge/lifecycle/recovery | 50% | 50% | Linux failure reproduced/reconnect/diagnostic contrast; healthy reboot/selectedDocker lifecycle incomplete |
| User-surface/browser/desktop-shell | 75% | 75% | Unchanged E1/IR002 renderer/HTTP evidence; no current mounted desktop run |
| Durable regression quality/relevance | 75% | 75% | New upstream Apple startup regression passes, cumulative REST fix valid; actual Linux integration regression still needed after origin established |

Simple average400/7 = **57.14%** post-repository and final, unchanged from prior final. More direct evidence changed which failure is open, not completeness of the critical matrix. Percentages are evidentiary confidence, not a pass rate or statistical reliability. All7 below90%,95% target not met; critical proof missing/failing independently prevents Pass. Broader **Required**, executed personally, now rerouted on demonstrated failure rather than called dependency-only Blocked.

## Broader environment / network / desktop / residual scope

Host Mac26.5.2/25F84 arm64 AppleM1Max; Tart2.40.1; official private Go1.27.2 archive checksum verified (E2/prepare-result.json), Python3.9.6. Mac guests26.6.2/25G83/APFS; Ubuntu guests24.04.5/ext4/kernel7.0.0-38. TwoCPU/4096MiB each, no host shares/audio/clipboard/USB/credentials. Exact Tart clone/set/run/guest command arrays in archived scripts/results. Real OS/root/kernel dependencies used, virtualization replaces hardware only, not independent physical qualification. UI/browser/viewport N/A this round.

V02's default NAT did not deliver VM-to-VM connectivity: routeREJECT and pingHost is down during public connect. Earlier E1 --net-host assigned separate subnets and likewise did not establish a healthy peer network. [Softnet publisher documentation](https://github.com/cirruslabs/softnet) describes default bridge isolation; its root/SUID/host-network changes were **not** performed. Asked user asynchronously for two hardened disposable VMs on private LAN; no answer/authorization used before completion. No bridge, host-root, router/firewall or user mount change. This missing network is not counted as a product outage defect; raw timeout retained. Linux self-mount failure is independent of that network gap.

DockerDesktop version read only; no user node/container/volume changed and no Docker test resource created. Only MacDocker STORAGE is deferred; Mac/Linux managedDocker CLIENTS and DockerLinux STORAGE remain required. Independent physicalMac/Linux/Docker, exact chosen node preservation, native runtime tools/support assets/peer close/restore/Standalone-Team-Org, source Update/Remove/AGY/local and scopedGit/cwd, healthy mounted desktop previews remain unproven. No inherited tokens, provider credentials or paid turns authorized. These are technical gaps, not silently transferred as user-only checks. Delivery later owns explicit user verification/docs/finalization/release.

## Compatibility / legacy / persisted data

Read IR004's Legacy/compatibility and Persisted data transition sections. No new shim, dual shape, source copy/pin/refcount/retirement queue or version fallback observed/introduced. Durable tests do not protect compatibility-only behavior. Approved existing known-field registry/run/launcher Directly Usable and private profiles Discard/Rebuild retain E1 contract evidence; current mounted full lifecycle remains incomplete. Migration N/A. Representative original nonempty source files used, not migrated/copied to create mount proof. Source Update/Remove independence and AGY capsule/missing-source/local policy unchanged. D001/DEC015 hard-mount outage isolation remains **deferred, not fixed**, not a new gate; no worker/probe-per-action/stream-lease/cwd-trampoline/fallback added or demanded.

## Durable coverage / temporary scaffolding

No durable repository test change in Round2. Cumulative API-owned path `autobyteus-server-ts/tests/e2e/file-explorer/workspace-content-rest.e2e.test.ts`, commit `af9f23df93a63ca6c8305f51439a855acc2133c7`, remains unchanged and attached. E1 corrects route-only teardown composition and adds socket HTML/relative media/replace/delete coverage; original five assertions retained, six pass. Successful proportional test-code review still awaits a passed package; current request is failure-origin only. No removed paths.

E2/run-mac-*.py, run-linux-native*.py, run-linux-trace*.py and preparation/cleanup scripts are **temporary executable archival probes**, not product APIs or production tests. They use public CLI for primary findings, internal probe only after failure for diagnosis, no production test bypass. Dependency fakes remain in N01/E1 units; scripted AGY remains a transport fixture, not provider inference. No screenshots fabricated; CLI/results/kernel/trace evidence appropriate to this round. Raw failures/skips and wrong-path diagnostic are preserved, not presented as passes. Source manifest/packaging/build receipts and artifact audit support reproducibility. No binary, VM image or credential committed.

## Cleanup performed

| Resource | Exact ownership/action | Result |
| --- | --- | --- |
| Mac cold V02-repro `ab-nfs-api002-37446d5f` and V01 `ab-nfs-api002-04979de5` | Stop/delete after assertions | Processes/clones absent; respective result receipts |
| Mac matrix `ab-nfs-api002-ebe8a71b-{server,client}` | Stop/delete after route/connect attempt | Both absent; no later client/Docker steps reached |
| Linux `ab-nfs-api002-linux-25fc064c` PID76087 and `ab-nfs-api002-linux-5336c36d` PID80009 | Exact owned stop/delete after evidence; verify process absent | Both absent, services/export/mount/data disposed with guests |
| Own scratch `ab-nfs-api002-5861wgnv` | Remove only after VMs exit; toolchain/archive/candidate/sourcecopy/private Ubuntu cache/HOME/TMPDIR | Absent, E2/cleanup.json |
| Prior public Mac Tart image/tool cache | Not ours to delete | Retained, own clone names absent |
| Five preexisting generated SDK/BriefStudio dist directories | No manual deletion/staging | Retained untracked |
| User application/nodes/credentials/host mounts/network | No mutation performed | Untouched; no global prune, root change or user process termination |

E2/cleanup.json is final receipt. All run-owned VMs/processes/scratch are absent. Evidence retained at canonical ticket paths. No live VM is left for reviewer; use a **new owned clone/output directory** to reproduce, not archived names or deleted scratch paths.

## Result summary / next action

- **Pass at narrow scope:** current V02-repro/V01, N01 and V02 server-create substep. API-F001 resolved independently before expansion.
- **Fail:** V03 and V03-repro plus public recovery, new **API-F002**, AC012/018/019. Preliminary **Unclear**, native Linux implementation integration recommended focus pending independent failure-origin review.
- **Blocked subset:** healthy Mac peer topology, environment reason; original connect failure retained. No authorization to bridge acted on.
- **Not Tested:** remaining V02/V03/V04/V05 technical/physical/client/product/native matrix, not waived.
- **Out Of Scope/deferred unchanged:** FUP001 PM custody; D001/DEC015 not fixed, no new outage gate.
- Next: persist artifacts/revision/index, call fresh handoff rules and send complete Fail package to their most-specific focused failure-origin recipient. Do not send to delivery, close Task or imply successful test-code review. A confirmed send receipt, not this statement of intent, establishes handoff.

Fresh `get_handoff_rules` selects exactly: **When API/E2E validation fails and the complete failure package requires focused failure-origin review by the code reviewer.** Recipient `/software_engineering_team/code_reviewer`; E2/routing.json. No other recipient notified for this outcome.

Artifact packaging: staged `git diff --check` reports only four trailing-whitespace lines in retained raw `go-race.log`; output is preserved unchanged, not normalized to hide diagnostic content. Source/authored artifact whitespace check passes separately. E2/packaging-check.json records this non-product warning. E2/artifact-audit.json verifies production hash, unchanged durable/source paths, reference existence, parseability and cleanup; evidence-manifest.json records artifact hashes.
