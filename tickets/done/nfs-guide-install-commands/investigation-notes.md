# Investigation — NFS guide installer commands

## Identity, scope and bootstrap
- Package `nfs-guide-install-commands`; Task autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3; owner Solution Designer, 2026-10-21.
- Worktree **/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands**, branch **codex/nfs-guide-install-commands**.
- Fresh `git fetch origin personal` succeeded before creation; resolved base **33171e13855b4bcbcb8a9d650f2403cacb03d965**. Finalization target **origin/personal**, root RELEASE.md's fresh-base / no-ff policy, no release by default.
- Canonical /Users/normy/autobyteus_org/autobyteus-workspace-superrepo contains unrelated dirty/untracked work and PM boards; untouched. Draft requirements/investigation created in isolated task checkout before deeper work. Checkout creation completed exit0; interruption left no active setup process.
- Task plus user's additional basic-guidelines request; no NFS engineering or live installation. Requirements R1 / SR-001 approved within direction before architecture completion.

## Authorities read (full required gates)
Updated solution-designer SKILL.md; references/requirements-engineering.md, finding-the-cause.md, ticket-scope.md, handoff.md, architecture-design.md, design-principles.md; requirements, investigation, solution-revision-record and design-spec templates. Root AGENTS.md, DESIGN.md, TESTING.md, RELEASE.md; autobyteus-web/AGENTS.md and ARCHITECTURE.md. No closer web DESIGN/TESTING/AGENTS found. Design examples not needed for this narrow local change. Shared/workspace skills are read-only; never modify them. Requirements gate precedes investigation; architecture gate read fully before approved-phase architecture trace.

## Intake references read
PM context directory: /Users/normy/.autobyteus/server-data/projects/project_a1377344-25db-482a-97cc-ecfdb0fb495a/tasks/project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3/context/
- `ctx_467c07d1ba5d__terminal-receipt.md`: completed normal NFS v0.1.0 publication and bounded proof, not new field qualification. Read before acting.
- `ctx_bdc6472bcd24__ctx_2a49357faa2b_image.png` and `ctx_b1b73e661d53__ctx_d0617565f9bc_image.png`: viewed. Docker has install command cards/Copy; NFS has Mac/Linux disabled cards and unavailable notice. Existing-state/style references only.
- Latest direct user: “add some basic guidelines there just like docker guide, like all the avaialble commands”. No Product team request.

## Findings / method / scope disposition
| ID | Finding and established basis | Method | Disposition |
|---|---|---|---|
| INV-01 | `utils/nfsLauncherCommands.ts` exports null; real Node import returns null for both OSs. Current fixture command returns curl-pipe-to-bash. Component explicitly disables missing command and derives no download link. No release discovery/API error or mount detection causes this UI. | **Reproduced** pure production TS via Node22.23.1; **Read** component/parent | In ticket: availability/content wiring |
| INV-02 | Anonymous GitHub release API returns ID417014769, v0.1.0, draft=false, prerelease=false, four native archives plus actual installer/checksums. Downloaded installer 3946bytes SHA256 `65769690ada27db304d2e0e4bcd6716e6403f86650ca8f1905e26ebde86d25fa` matches SHA256SUMS-nfs and GitHub asset digest. | **Measured** read-only HTTP bytes/hash comparison, not installer execution | In ticket: concrete version/URL/hash source |
| INV-03 | Published installer forwards `"$@"`; `version` returns before CheckHost/elevation. Documented public actions are create/connect/status/reconnect/detach/version plus no-args menu. Config commands use /dev/tty, source/connection prompts and explicit consent. Non-version commands can elevate, status/reconnect can wait; detach requests drain/interruption consent. | **Read** actual downloaded installer and exact release source CLI | In ticket: truthful command reference; no NFS modification |
| INV-04 | Existing NfsGuideCard owns clipboard pending/success/failure/unmount lifetime. Docker uses local command cards and same clipboard vocabulary. English and zh-CN catalogs own visible strings. Parent passes descriptor without coupling to nodes/filesystems. | **Read** full component/helper/tests, relevant parent/locale paths | Reuse owner; no shared refactor |
| INV-05 | Root RELEASE.md NFS paragraph still says guide disabled and physical/user gates needed before public assets, inconsistent with completed authorized publish-first release. | **Read**, compare public release + terminal receipt | In ticket: narrow app reference-doc sync only, not editing independent policy |

## Exact current production paths (architecture phase)
1. `autobyteus-web/components/settings/NodeManager.vue` → activeTab nfsGuide → NfsGuideCard prop `nfsPublishedRelease` from utility. Existing role=tabpanel/aria-labelledby; NodeManager otherwise manages nodes but NFS guide never calls that behavior. No parent production change required.
2. `autobyteus-web/utils/nfsLauncherCommands.ts` (26lines) owns local release value, safe HTTPS URL predicate, pure platform command builder. Imported only by component/parent and focused tests. `qualifiedComputers` is local TypeScript data, not persisted or backend protocol.
3. `autobyteus-web/components/settings/NfsGuideCard.vue` (77lines) projects two cards plus prose; Copy calls only `navigator.clipboard.writeText`. State: pending id, copied id, error, 2second timer, disposed flag. Extend same owner to command-reference rows; no IPC, filesystem, provider or network call needed.
4. `autobyteus-web/composables/useLocalization.ts` delegates to existing localizationRuntime; settings catalogs en/zh-CN contain all current NFS keys. Catalog-based translations rather than literal text/global localization refactor.
5. Docker reference `DockerNodeStartGuideCard.vue` + `utils/dockerNodeLauncherCommands.ts`: install/direct sections, local command rows, copy labels/code/feedback. Preserve these files; no generic combined command framework needed.

## Published contracts and evidence uncertainty
- Public release: https://github.com/AutoByteus/autobyteus-nfs/releases/tag/v0.1.0
- API: https://api.github.com/repos/AutoByteus/autobyteus-nfs/releases/tags/v0.1.0
- Installer: https://github.com/AutoByteus/autobyteus-nfs/releases/download/v0.1.0/autobyteus-nfs-install.sh
- Checksums: same release-download root + `SHA256SUMS-nfs`.
- Published CLI source identity from completed receipt: `238bdc183e8affac99ffdee9be9cb333b0eb126f`. Read using `git -C /Users/normy/autobyteus_org/autobyteus-nfs show <commit>:internal/cli/{inputs.go,run.go,install.go,interactive-setup.go}` and README.md; canonical NFS checkout read-only, no fetch or modification.
- Also viewed raw tagged GitHub README/run.go. Tagged README's prepublication availability prose is historical; do not copy it as current status. CLI contract still authoritative. Local v0.1.0 tag lookup absent, then used known available commit. Guessed old launcher.go path returned404; correct sources found through git ls-tree. These were lookup misses, not application/test failures.
- Installer requires curl/tar, normal shell utilities and shasum or sha256sum; selects Darwin/Linux and arm64/amd64; rejects inside-container installation. It verifies archive and manifest checksums, bounded archive membership/extraction and embedded release metadata; installs under ~/.local and forwards args. Do not alter/bypass this contract or remove quarantine/security controls.
- Host policy: macOS26+ with APFS source; Ubuntu24.04 with ext4 source, native or Linux-Docker storage; public ARM64/x64 archives do not establish independent physical qualification. Windows and Mac Docker storage hosting excluded. No args starts interactive create/connect or saved-state options. Internal service/install/probe/verify operations are not the ordinary guide command list.
- No live install, version binary execution, mount, Docker/VM, privileged, provider, build, rendered UI or full test ran during this Solution Designer investigation. Node type-stripping warning is diagnostic only; do not change package module type to silence it.

## Evidence commands / results
- Actual-module probe: `node --experimental-strip-types --input-type=module` importing the existing helper; exit0, default null / Mac null / Linux null, valid fixture generates old command. Full stdin/stdout/stderr/source hash in evidence/current-command-probe.json. This confirms null cause, not final implementation correctness.
- Read-only Python urllib retrieval of release API + installer + checksums; date/digests/result in evidence/published-release-contract.json. `installerChecksumMatches=true`. No archive download or installer execution.
- `git status --short` before investigation: only task docs untracked. All current authoring confined to ticket docs/evidence. No dependency setup or owned runtime resource exists.

## Coverage investigation and next-owner verification
Existing tests: utils/__tests__/nfsLauncherCommands.spec.ts asserts null production descriptor and unsafe URL rejection; components/settings/__tests__/NfsGuideCard.spec.ts covers null, successful copy/timer and rejection using key-tail localization mock. Replace stale null-production premise; preserve negative fixture cases. Parent NodeManager tests currently cover other tabs, not current NFS data. Add narrow actual NFS route/tab wiring check without changing parent behavior. Docker command/guide tests remain regression references.
Root TESTING supports deterministic component cases and focused real renderer/browser verification. A browser-only guide proof must be labeled browser proof, not packaged desktop or NFS qualification. If isolated desktop proof is required by the downstream testing owner, follow project harness and owned data paths; no live app/user data. No paid provider, agent prompt or field campaign is useful for this copy-only behavior. Unit command integrity/control tests may stub curl/checksum/bash and must never run a real installation.

## Supplement inventory
All relative paths below are under this ticket unless marked external. Owner Solution Designer; status retained factual evidence, no separate user approval authority.
| Path | Purpose / scope | Related IDs |
|---|---|---|
| evidence/current-command-probe.json | Reproduced current helper null cause, source/command/output | REQ-001/005, AC-001/004 |
| evidence/published-release-contract.json | Retrieved public identity/assets/hash measurement | REQ-001/004, AC-001/005 |
| evidence/autobyteus-nfs-install.sh.txt | Actual public script text, never executed; preserve copyright/content | REQ-001/002 |
| evidence/SHA256SUMS-nfs.txt | Actual installer checksum authority | REQ-001 |
| External PM terminal receipt / two images named above | Prior delivery limits and existing UI/style context | REQ-001/004/006 |

## Design assessment / remaining gaps
No persistence, migration or backend owner involved; no unmet repository prerequisite. Existing owner is sound; issue is stale descriptive data and missing usage content. No broader refactor required. No new follow-up; field testing already has separate custody. Downstream implementation must establish actual rendered/copy correctness; these investigation results do not claim that outcome.
