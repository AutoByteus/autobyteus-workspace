# API/E2E Coverage Investigation

## Investigation meta / authority
Round 1, API-REV-001; CRR-002 source Pass intake. Source HEAD 0df0c901e4 (IR-003 eb470a0d31). Large / High, reviewed route; target personal. No prior API or delivery round.
Full active basis: requirements-doc.md (approved SR-012), investigation-notes.md and solution-revision-record.md (through SR-014), design-spec.md DS-003, design-review-report.md / architecture-review-revision-record.md ARCH-REV-003, implementation-handoff.md / implementation-revision-record.md IR-003, code-review-report.md / code-review-revision-record.md CRR-002, manual-install-failure-clarification.md and stage-lifetime-clarification.md. Historical inert authorization and IR-002 packages are not current acceptance.

## Supported scenarios and boundaries
SCN-001 restricted first launch, SCN-002 capable/direct/menu launch, SCN-003 packaged Node/server, SCN-004 signed successive updates with independent quit versus explicit restart, SCN-005 refusal/removal. Include reviewer-supported continued journeys after automatic failure/manual download and after unknown manual commit. SCN-006 global weakening/arbitrary exemptions excluded, not scored.

| Boundary / behavior | Change | Evidence available | Remaining direct proof |
| --- | --- | --- | --- |
| Pre-main launch, authentication, permissions BEH-001/002/005 | Added sealed helper, exact record acquisition, scoped install; removed desktop bypass | Native units, inert tty witness | Actual current graphical authorization, renderer sandbox, menu/redirect/reboot/removal on 22/24/26 |
| Node/server process BEH-003 | Preserved real ELF | Old packaged Node probe | Current full package Node signals and embedded server readiness |
| Local transport/store BEH-004 | Added peer-bound writer and signed inode replacement | Native contract/store tests | Socket identity, permissions, actual filesystem faults, lost ACK, restart and rollback |
| Electron lifecycle BEH-004 | Managed quit-only and explicit restart, independent retry block | IMP-23 owner tests with OS mocks | Two genuine full updates, no cached grant, opt-out/channel/active work, normal quit no reopen |
| Renderer/store notifications | Changed localized ready/manual refusal feedback | IMP-09/14 fixtures | Current shell feedback through actual IPC |
| Persisted data | Directly Usable — No Migration; stages Discard or Rebuild | Notification serialization/store restart tests | Synthetic settings/work survives actual updates |
| External release/build | Final-byte signing and separate protected signer | CLI/Go vectors, static YAML | Fresh clone and native x64/ARM64 build-only CI |
| General backend/API, worker queue | No policy change | Out of scope except embedded readiness/data | No unrelated broad server suite |

## Project execution discovery
Worktree: /home/ryan-ai/hdd_drive/autobyteus_org/autobyteus-worktrees/ubuntu-appimage-sandbox-startup.
Applicable guideline root TESTING.md (no closer one), root AGENTS.md, autobyteus-web/AGENTS.md; root/package README, package.json scripts, pnpm-workspace.yaml, Electron Vitest configuration, docs/isolated-app-instances.md, .github/workflows/release-desktop.yml, RELEASE.md build-only section. Native contract linux-install/contract/desktop-release.md defines release admission.
TESTING mandates one heavy command at a time, Node22, both typechecks, fresh clone after build-input changes, real isolated shell for shell changes, synthetic data only. Changed build inputs include workflow, scripts/desktop-package/*, build/scripts/{build,afterPack,linuxInstallPack}. Fresh proof must use frozen install then workflow build order, not dev prebuild. Use Go1.27.4 and existing assigned extracted compiler tooling; separate fresh disposable trust. Never production key, publication or real data.
Potential guide conflict: generic isolated-app Linux troubleshooting permits policy weakening/setuid; approved ticket explicitly excludes these. Do neither. Existing isolated-app starts extracted ELF and disables updates by default: it cannot prove AppRun enrollment or managed updates. Those require test-owned VM plus canonical AppImage and explicit test feed.

## Coverage validity / impact
`git diff --name-only eb470a0d31 HEAD` contains only ticket evidence/docs. IMP-23 current 126 tests/6 files and IMP-24 both typechecks remain valid and will be reused. IMP-26 specifies unaffected prior evidence; no redundant whole-suite runs. Clean workflow units run again only as part of fresh-start proof.

| Paths / tests | Validity | Decision |
| --- | --- | --- |
| electron/application/__tests__/managedUpdateSession.spec.ts; updater appUpdater and notification-record specs | Still Valid | Reuse IMP-23; mocks do not prove writer/shell |
| updater automatic/Mac/check, disabled/cache; application shutdown/wiring specs | Still Valid | Reuse IMP-23 and unaffected IMP-20 per IMP-26 |
| components notification and stores automatic specs | Still Valid | Reuse IMP-09/14; production shell remains required |
| linux-install/internal/{acquire,launch,release,sealed,store}/*test.go | Still Valid | Real local crypto/FD/inode tests, transport mocked and inert payloads; fresh workflow rerun |
| scripts/desktop-package/*.test.mjs | Still Valid | Shared vectors/signature/trust; fresh workflow rerun |
| packaged isolated-app harness | Still Valid | Current package prerequisite; not enrollment substitute |
| unrelated API/provider/worker suites | Out Of Scope | No broad rerun |

No stale test identified; no removal. First close package/environment boundary before adding durable coverage; any discovered gap will update this plan before edits. Use temporary probes for platform journeys until stable VM fixture exists; retain commands and observations. No unjustified compatibility wrapper found. No migration planned or user data permitted.

## Planned cases
| ID | AC | Kind | Steps / purpose |
| --- | --- | --- | --- |
| API-01 | 003/006/008 | Reused | Inspect IMP-23/24, IMP-26 and unchanged native/UI/preserved evidence; retain limitations |
| API-02 | 005/006/008 | Existing Test / fresh build | Clean clone 0df0c901e4; pnpm install --frozen-lockfile; disposable trust; Node units; Go units; pnpm -C autobyteus-web build:electron:linux:x64; sign/verify/layout/metadata and workflow packaged-server check if build succeeds |
| API-03 | 005 | Temporary Probe | Current packaged AppRun real Node argv/exit/signals; embedded readiness from build check |
| API-04 | 001/002/003/004 | Journey | Current isolated shell then disposable Ubuntu22/24/26 graphical authorization/direct/menu/redirect/reboot/cancel/removal; capture namespaces/seccomp and health |
| API-05 | 006/008 | Journey | Two full signed updates with synthetic settings/work, no cached grants; active session delay, ordinary quit/manual restart, opt-out/channel; canonical launch |
| API-06 | 003/004/008 | Journey / Temporary Probe | Negative identity/admission, socket peers/perms, xattr/disk/fsync/ACK/restart/rollback; no live-file loss |
| API-07 | 001/003/004 | Journey | Renamed current full package, exact-tag sidecars; offline/404/oversize/redirect/signature failures before auth; excluded launch paths no network |
| API-08 | 006/008 | Existing Test | Branch-only release:test native x64/ARM64 clean CI; no publish/signing credentials |

## Environment, fixtures and cleanup plan
API-02 fresh clone on HDD outside ticket checkout, fresh trust private directory, host Ubuntu26 x64 Node22 and assigned Go/compiler toolchain. No app started until current build exists. API-04 onwards need owned graphical Ubuntu guests (assigned stopped /tmp/autobyteus-5-vm is Ubuntu24 server, not GUI proof); install normal guest packages if necessary, own display and synthetic login. Do not change host AppArmor or user's desktop. Test data via isolated public APIs/UI; no production accounts/providers required. Collect build log/hash, actual process namespaces, auth journal/visible dialog, writer state and signed identities. Stop only owned guests/app/feed; retain evidence and necessary failed-state diagnostics.

## Investigation decision
Proceed to execution: Yes. Progress log required: Yes. Durable changes initially None. No pre-execution reroute. Any failure will be classified after focused diagnosis; unsupported environments are not successes or user-only exemptions. All mandatory remaining gates in implementation-handoff.md remain active.

### Coverage refinement before edits
API-06a (AC-004/008), Add Durable Coverage: cmd/writer/main_test.go. Existing store tests bypass the actual Unix-socket handler, SO_PEERCRED and protocol framing. Add nonroot real Unix socket + production handle/store, disposable signed inert files, half-close request, two sequential signed commits, wrong configured peer UID, replay, malformed framing, tampered stream, receipt invalidation and restart. Real filesystem crypto/xattrs and local transport only; no claim of systemd permissions, full AppImage, privileged enrollment or power-loss proof. Run after the heavy clean build, not concurrently. API-06 remains the wider platform fault matrix.

API-04 safe setup refinement: current isolated unpacked ELF on restricted host correctly aborts before readiness; do not set setuid helper/relax host policy. Start assigned Noble VM with snapshot-on overlay, own SSH21884, QMP socket and Xvfb/Ubuntu polkit agent. Build a separate full test-origin AppImage from the current fresh full renderer/server package, replacing only native binaries via existing buildNative({testOrigin:'http://127.0.0.1:18889'}) with same fresh disposable trust. This approved DS-003 test hook permits exact tagged assets locally without release publication. Preserve original production-origin build and distinguish hashes. Guest synthetic HOME only.

API-08 safety discovery: branch is not on origin (`git ls-remote --heads origin fix/ubuntu-appimage-sandbox-startup` empty). More importantly the required whole Desktop Release build-only dispatch unconditionally imports Apple production signing certificates in both Mac jobs (workflow lines144/274), even with publish_release=false. Current explicit no-production-key constraint prevents triggering that whole workflow. Do not silently change Mac policy or dispatch it. Native Linux runner access/separate secret-free Linux-only CI (or clarified authority for existing Mac signing) is required; local native x64 fresh proof remains separate. No branch push/CI dispatch performed.

### Round disposition / explicit continuation ledger
API-04/07 were split into bounded completed Noble journeys and remaining API-04-matrix / API-07-rest. API-09 is cleanup verification (AC-007). API-05/06 and remaining platform journeys remain Next Round, not impossible and not waived. API-08 is the actual external blocker, recorded before any dispatch; user clarification pending. No product or upstream validity failure found. Current execution report is authoritative for results and confidence; this investigation stays the plan.

## SR-015 / second-round plan update
Distinguish independent x64 coverage from native CI. Real full signed 13→14→15 on Noble normal graphical enrollment, then E2E fixture profile for actual Settings/loopback release source; record individual steps including opt-out, menu/operator control and explicit vs ordinary quit. Ubuntu22/26 guests from verified official images as available. The native proof method follows SR-015 (build+smoke, not an ARM GUI Cartesian matrix). Negative and lifecycle failures go to focused failure-origin review, not environment rerouting. No replacement of real checks with mocks.

## CRR-004 / current-byte validation plan
Rerun both API-05b discrepancies through independent real packaged Settings UI, directly launched and via installed desktop entry, observing pre/post app and server identity, running version, notification, workspace/opt-in, authorization and ordinary close. Verify known-old vs unknown paths with actual documented interfaces; controlled disk/service availability and normal repair/negative tests, not substitute source mocks for the requested host boundary. Use a fresh private overlay of assigned powered-off IR005 fixture and verify actual versioned fixture digests; retain proven prior evidence only where unchanged. Rebuild in isolated GitHub native Linux jobs for new compiled companion, exact reviewed product/build bytes and approved public test source only, no operational assets, ticket history, production secrets or release. Report noncovered cases explicitly.

API-06c refinement: preserve a durable lost-response scenario in the existing writer Unix-socket test. After a real signed restage, the normal caller closes its read half before activation, receives no acknowledgement, and obtains the authenticated committed candidate in a fresh status request. Explicitly not a simulated power cycle or proof of a full GUI network disconnect. API-06b uses a temporary probe for kernel fault injection to avoid a permanent tracer dependency in ordinary repository tests.

## CRR-007 / API-REV-004 impact plan
Rerun AC-003 against the current independently verified signed .13 package, on a fresh overlay and with a fresh work marker. Compare visible dialogs separately from helper diagnostics. API-04g / API-06f: missing live image (launch/uninstall), authorized 32 MiB target, valid ample-space control, cancellation and ordinary non-storage setup refusal; verify host rollback, no fallback, no user data loss. API-07d: unavailable record/signature, invalid metadata/signature/download, offline, corrected retry and genuine enrollment; confirm no pre-auth dispatch. API-08d: clean native x64/ARM64 isolated rerun per SR-015; no release. Native release/admission and error-classification suites reused as durable regression owners and rerun on current source. Prior desktop update, channel, writer-fault, reboot and capable launch evidence is carried only for unchanged paths and original bytes; current successful protected startup rechecks the changed normal entry. No new durable test gap identified at intake; the disconnected-reader socket test and graphical testing guideline remain in the cumulative review package.
Current-byte host spot check while native runners work: repeat capable portable/desktop launch on a separate Jammy overlay (API-04h), and current signed enrollment/menu on a cleanly de-enrolled Resolute overlay when available. This is additional coverage of the current entry code, not a repeat of unchanged successive upgrades.
API-05i targeted regression: positive explicit managed restart re-enters the refactored protected-image inspection. Validate from current signed .13 into a fresh synthetic .14 with IR-007 native code and unchanged authentic full application/server payload. Older two-update and fault cases retain their original bounded evidence.
