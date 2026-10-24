# Current reopen — 2026-10-24 (requirements investigation)
- Task/package unchanged: autobyteus-254 / nfs-guide-install-commands. PM carries explicit user direction to remove only “View release downloads” and “Review the pinned installer script”.
- New isolated authoring worktree: /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2; branch codex/nfs-guide-install-commands-r2; fresh origin/personal base 8b34e8ae108a281b0c93c679c60883df28a30773; finalization origin/personal, no release.
- New worktree checkout completed exit0; initially clean. Existing archived package moved to in-progress only in this new worktree for explicitly authorized reopen. Old detached receipt worktree at 6d90a825feae66f4c397924370562a271da722a0 remains read-only, untouched. Canonical dirty checkout and PM boards untouched.
- Read incoming completed terminal receipt ctx_6710a1aed153__nfs-guide-install-commands-terminal-receipt.md; viewed both current screenshots ctx_5360021223e7__ctx_f21fe1e3dc61_image.png and ctx_17c199767d2d__ctx_ed768f3add91_image.png before deeper investigation. All under the original PM task context directory recorded below.
- Reopened requirements Draft, affected design Needs Revision; original completed rounds remain historical. No current implementation, tests or browser/installer run. No dependencies/resources created beyond new Git worktree/branch.
- Updated skill/principles/examples/design template reread; unchanged phase gate files previously read in this conversation. Root DESIGN/AGENTS and web ARCHITECTURE/AGENTS unchanged from previously read base. TESTING/RELEASE changed; read current before validation design/finalization guidance.

## Current findings and evidence (R2, 2026-10-24)
All paths below relative to the new worktree at base `8b34e8ae108a281b0c93c679c60883df28a30773`. Method **Read** means static source, not executed UI proof.

| ID | Established finding and exact sources | Method / disposition |
|---|---|---|
| INV-06 | `NfsGuideCard.vue:31–32` renders exactly the two requested anchors. `:54` is a different advanced README link and must stay. Supplied full/cropped screenshots agree with the source. | Read + viewed user images; this ticket's local removal |
| INV-07 | The component's `downloadUrl` computed at `:78` has three template consumers: release-version notice at `:11`, anchor at `:31`, guard at `:32`. Removing anchors must not remove the surviving version-availability behavior. `computers` at `:72–76` obtains validated commands; `allAvailable` at `:77` separately controls unavailable prose at `:30`. | Read after R2 approval; design uses an explicit any-valid-install-command boolean, retains allAvailable |
| INV-08 | `nfsLauncherCommands.ts:28–35` still validates `release.downloadUrl` as well as installer URL, version and digest. It is NOT dead merely because a link is removed. The helper, command data, clipboard handler (`NfsGuideCard.vue:83–99`) and NodeManager wiring (`NodeManager.vue:60–74`) need no change. | Read; preserve contracts, no installer work |
| INV-09 | `rg` over current autobyteus-web finds the exact `NfsGuideCard.download` and `.installerReview` keys only in two template usages and two definitions per language (`settings.ts:405/418` in en/zh-CN). The review reminder at `:395` can point to the URL already in the command; no new control. | Read/search; delete these dead labels only, edit one reminder per locale |
| INV-10 | Current component tests require the installer-review link for partial data (`NfsGuideCard.spec.ts:33–38`); null/invalid case already expects only advanced link (`:19–30`). Exact-copy/lifecycle and Chinese cases exist (`:39–103`). Guide maintenance docs still promise disappearing installer/release links (`docs/nfs_guide.md:49–50`). | Read; update expectations and narrow docs, preserve other tests |

### Reproduction / causal confidence
This is an explicitly requested presentation change, not an uncertain runtime fault. The two literal template elements and screenshot show the cause completely; no dependency experiment, installer download, browser campaign or NFS reproduction is necessary for design. Runtime proof of the new UI belongs to Implementation/API. Historical API001 results are not current revision results.

### Production / derived-consumer inventory
- Normal entry: user opens Nodes → NFS Guide → `NodeManager.vue:60–63` passes `nfsPublishedRelease` → `NfsGuideCard.vue:70–78` derives validated install strings and availability → template cards/version/prose.
- Localization: `useLocalization.ts:4–6` calls existing runtime.translate; the two locale catalogs own the removed labels and review reminder. No localization-framework change.
- Copy: existing button handlers `:22/:42` → `copy` `:88–99` → browser `navigator.clipboard.writeText`; feedback/timer/unmount stays local. The removed anchors do not feed this path.
- Derived consumers: the surviving version label must retain any-valid-command availability, distinct from all-platform availability; invalid/partial tests cover this distinction. Documentation describing link visibility changes. Command helper validation and advanced README link are deliberately retained.
- No persisted data, external host or app runtime boundary changes. No Product UI/UX deliverable requested; screenshots are scope evidence, not a separate normative specification.

### Exact checks performed (read-only, not tests)
- `git diff --name-only 33171e13855b4bcbcb8a9d650f2403cacb03d965 HEAD -- AGENTS.md DESIGN.md TESTING.md RELEASE.md autobyteus-web/AGENTS.md autobyteus-web/ARCHITECTURE.md`: only root TESTING/RELEASE changed. Read both current files fully; unchanged project design/package instructions previously read in this conversation remain applicable. No deeper package AGENTS found under components/localization/docs.
- `git diff --quiet ca1f09e52a71e061fce36b04288e5495fc2356e7 HEAD -- <NfsGuideCard.vue> <nfsLauncherCommands.ts> <NfsGuideCard.spec.ts> <docs/nfs_guide.md>`: exit0. These sources match the previously delivered implementation. Both catalogs have other integrated changes; a diff filtered to NfsGuideCard entries is empty. Preserve those unrelated changes.
- Read numbered component/helper/test sources and selected parent/localization lines; `rg` exact label keys confirms six total occurrences in web source (two usages, four definitions). No dynamic key family references these names; existing dynamic keys address computer labels and usage command title/detail only.
- No application, unit test, browser, binary/installer, build or dependency install executed by Solution Designer for R2. No network release check needed: delta explicitly preserves published command data, not a refreshed availability claim.

## Current authority, supplements and historical paths
- Updated SKILL.md, design-principles.md, design-examples.md and design-spec-template.md reread. Current requirements-engineering, architecture-design and handoff reread as well; finding-the-cause, ticket-scope and other templates already read in this conversation. Root DESIGN/AGENTS/web ARCHITECTURE unchanged; current TESTING and RELEASE read. No shared skill edits: this is a user presentation preference, not a design-principle mistake.
- Current own canonical documents are this folder's requirements, investigation, design, solution revision record and solution-design-handoff. Historical other-owner reports/raw evidence moved byte-preserving in this fresh worktree; their old absolute paths remain historical, not rewritten logs. The old detached checkout is untouched.
- Supplemental current intake evidence (external, PM owned, read-only): `ctx_5360021223e7__ctx_f21fe1e3dc61_image.png` full screen and `ctx_17c199767d2d__ctx_ed768f3add91_image.png` crop in PM context directory below; purpose identify the two anchors, BEH-005/REQ-007/AC-006. User approval is carried in PM's exact Oct24 request, not inferred from image alone.
- Incoming prior completed app receipt `ctx_6710a1aed153__nfs-guide-install-commands-terminal-receipt.md`, same context directory: historical provenance/cleanup only. Original complete receipt also at `/Users/normy/autobyteus_org/delivery-reports/nfs-guide-install-commands-terminal-receipt.md`. Never reopen that retained checkout or promote its tests to R2.
- Previous factual supplements remain inventoried below; not re-fetched, re-executed or attached wholesale. No current blocker/follow-up or new behavior-defining supplement.
- Current TESTING requires impact analysis against validated source and current base, particularly changed shared dependencies/harness. Downstream decides affected reruns; do not blindly carry the old 53 tests/36 clipboard results or turn this UI change into backend/Electron/NFS testing.

---
## Historical investigation (2026-10-21; not current reproduction)

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
