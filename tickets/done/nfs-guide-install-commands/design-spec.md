# Design — NFS Guide concise footer (R3)

## Solution and approval basis
- Package **nfs-guide-install-commands**; autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3.
- **SR-006 Ready / Architecture Design Complete**, based on **R3/SR-005 Approved** by Solution Designer within the explicit Oct26 direction; user informed as requirements record states. No behavior-defining supplement or new approval question.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r3`, branch `codex/nfs-guide-install-commands-r3`; fresh base origin/personal **d74f75a51ab7dc47d42a13f33e0f943c3a230ad7**; target origin/personal, **NO RELEASE**.
- Canonical investigation is this folder's investigation-notes.md, current INV-11–17. Prior SR004/R2 design/delivery is historical; use this bounded delta, not a new implementation of original guide.
- Authorities read: current solution-designer SKILL; architecture-design/design-principles/finding-the-cause/ticket-scope/handoff; complete design template; fresh root AGENTS/DESIGN/TESTING/RELEASE/GLOSSARY and web AGENTS/ARCHITECTURE. No applicable closer DESIGN. Examples N/A for local deletion. No design-policy conflict; no skill/project-wide authority edits.

## Current-state read and intended change
Source/screenshot agreement establishes the problem: `NfsGuideCard.vue:52–60` renders an advanced README anchor and164 English words of footer prose. The component's cards, pure command projection and clipboard owner are independent of this markup (INV-11–13). Docker's existing card-led guide ends with a concise next step (INV-14).
Remove the advanced link; replace the blue exposition with one unboxed folder-use sentence; retain a compact amber note with the existing trust heading and two short safety sentences/paragraphs. Delete trailing platform/testing/checksum paragraphs. Preserve detailed facts in docs, not in hidden UI. No script, command, API or runtime logic change is needed.

## Task design health assessment
- Posture: user-requested presentation/content simplification; **No Design Issue Found**, refactor needed now **No**.
- Existing owner/path is healthy: one 98-line Vue component owns guide presentation and Copy lifetime, pure utility owns command validation, two457-line locale catalogs own text. Shrinking these avoids new ownership or file-size pressure (INV-13/16/17).
- Plausible triggers checked: several locale/descriptor forms already share the same rendering path; both are covered. Derived consumers are component expectations/docs, not schema or runtime owners. Removal leaves three dead localized keys which must be deleted. No repeated coordination, split sequence, boundary bypass, new structure or compatibility trigger. No generic guide abstraction justified.
- Persistence **Not Affected**: no stored model/reader/writer change. Migration, backup, transition or rollback machinery N/A. No additional field validation/qualification obligation created by copy removal.

## Relevant behavior and production-path map
| Spine / approved IDs | Supported trigger → complete target path | Governing owner / narrative |
|---|---|---|
| DS-001; BEH-001/002/004/005/006; REQ-001/002/004–008; AC-001/002/004–007 | User opens Nodes → NFS tab → NodeManager.vue:60–74 passes descriptor → NfsGuideCard.vue:70–80 derives cards via nfsLauncherCommand → Vue template renders catalog strings and concise footer | NfsGuideCard owns the guide. Commands and availability remain identical; only footer markup/copy changes. Both locales and valid/partial/null/invalid paths use this same owner. |
| DS-002; BEH-003; REQ-003/006; AC-003 | User activates Copy → NfsGuideCard.copy:86–97 enforces pending/exact text → navigator.clipboard.writeText → promise result changes local feedback → timer reset or unmount cleanup | NfsGuideCard owns clipboard sequencing/lifetime. Return/event path stays unchanged; footer removal cannot issue host operations. |

Narrative: choosing the guide renders existing installation and command cards, followed by a short folder tip and a visibly distinct safety note. Localization returns selected-language text; missing keys would appear literally (INV-16), so tests must prove real locale output. Copy acts only on card command data, never the footer or a shell.

## Ownership, dependency and interface boundaries
- NodeManager owns tab selection, not NFS management. It continues passing the current static descriptor; no parent edit.
- `nfsLauncherCommands.ts` owns fixed URLs/digest/commands and validation. Keep it byte-identical, including `downloadUrl`: validation still reads that field even though the page has no links (INV-13/17).
- Existing `useLocalization` → localizationRuntime/catalogRegistry serves presentation; retain that direction and all dynamic command-title/detail keys. No dictionary/schema/generator change.
- Component → browser clipboard is the only side-effect path, unchanged. No IPC/filesystem/network/host/installer import or execution callback.
- Interface changes, reusable structures, new subsystems, facades or layered adapters: **N/A**, no new boundary. Existing folders remain appropriate; draft/final responsibility mapping is identical to the concrete map below.
- Terminology: NFS Guide is informational; mount path is a filesystem path, not an application-node identity. Use current product vocabulary; no glossary addition. No new names suggesting mount validation or qualification.

## Target file responsibility / change inventory
All paths relative to worktree.
| Action / file | Concrete change / boundary |
|---|---|
| Modify `autobyteus-web/components/settings/NfsGuideCard.vue` | Delete advanced anchor at base52. Make workspaceHint paragraph at53 a plain short muted tip (no blue border/background/panel). Keep single compact amber note at54–58 with heading and two short bodies. Delete59–60 trailing paragraphs. Preserve1–50 and entire script65–98. Optional stable test IDs for the tip/note only; no behavior/state change or empty placeholder. |
| Modify `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Delete only NFS keys advanced/limitations/deferred once template references go. Shorten workspaceHint/trustDetail/outageDetail; keep trustTitle. Preserve all other keys, commands, host labels and top/role guidance. No broad unused-key sweep or unrelated localization cleanup. |
| Modify `autobyteus-web/components/settings/__tests__/NfsGuideCard.spec.ts` | Replace old positive README-anchor expectations in valid/partial/null/invalid states with no guide anchors. Add both-locale absence and compact safety/usage checks. Replace Chinese deferred-text assertion with actual short safety text. Keep exact command, availability/version, pending/denial/missing/timer/unmount assertions; remove vacuous link-attribute loop now no anchors exist. |
| Modify `autobyteus-web/docs/nfs_guide.md` | State page only displays/copies, no standalone documentation links; document compact on-page tip/safety. Keep documentation's own links and detailed support/testing/checksum/outage limits. Retain removed technical facts: allowed-computer trust rather than per-user authentication, writes mapped to selected nonroot source owner, connection JSON not an access token, no auto container management, generic binds separate. No publication/qualification verdict change. |

### Concrete content target
Use this copy or an equally short faithful refinement within REQ-008; English footer total ≤60 words, Chinese comparably concise:
| Existing key | English | Simplified Chinese |
|---|---|---|
| workspaceHint | Use the printed mount path as a normal folder. | 将输出的挂载路径用作普通文件夹。 |
| trustTitle | Use only on a trusted private network | 仅用于受信任的私有网络 |
| trustDetail | NFS is unencrypted—do not expose it to the internet. | NFS 流量不加密，请勿将服务暴露到公共互联网。 |
| outageDetail | If storage or the network goes offline, file operations and other work may stall. Restore connectivity before retrying. | 存储或网络离线时，文件操作及其他工作可能停滞。请恢复连接后重试。 |

Keep font size/readability and ordinary spacing; shorten content, not by making text tiny or hiding it. This retains practical outage consequences beyond file reads while removing release-engineering narrative. No extra links, tooltip/accordion/modal disclaimer or replacement platform panel. Supported-host hints already remain in install cards; removed limits are not converted into positive support claims.

## Removal / derived-consumer plan and compatibility rejection
- Remove obsolete advanced anchor and advanced key (one literal component consumer; definitions in two locales), plus limitations/deferred paragraphs/keys (same reference shape). INV-17 searched actual consumers; dynamic keys address computer/command names, not these. No generated key enum exists (`TranslationKey=string`), so locale checks are necessary, not a claimed compiler guarantee.
- Remove blue panel styling only, retain shortened live workspaceHint. Retain shortened live trust/outage keys and existing static note; no forked rendering path.
- Update assertions that require README/deferred text; all other current tests remain. Historical browser artifacts are not rewritten. Documentation links remain useful and are not UI removal targets.
- No compatibility wrappers/flags/dual paths retained. Clean cut replaces old UI, not CSS-hiding it. No stored or external contract changes; derived-data migration inventory N/A.

## Change Scope (final)
In scope UC-001–003 only as R3 requires: local footer/advanced-link presentation and its five files above, scoped evidence/docs. Deliberately unchanged: command helper/descriptor/pin, nine command cards and clipboard script; NodeManager/localization framework; Docker Guide/launcher; NFS repository/product/assets; app backend/Electron/security policy; skills and root rules; versions/workflows/PM boards. No follow-ups found; current field task remains outside this ticket. If stale compatibility tests conflict, update only approved presentation expectations, not preserved safety behavior.

## Verification / change sequence / risks
1. Implement bounded template/catalog removal with the content target. Update tests and guide doc in same change; no temporary legacy seam. Compare helper and all nine displayed/copied strings against base.
2. Current focused component/command tests plus applicable web/localization guards/typecheck. Explicitly assert empty anchor list in all existing descriptor cases, R2 links still absent, essential safety/host guidance present, concise footer and no untranslated keys. Component tests may use clipboard controls; no installer execution.
3. API/E2E current web renderer at Nodes → NFS Guide in en/zh-CN and1280/390px: inspect actual end-of-page, absence/gap/overflow, all cards/Copy still usable with actual clipboard on normal path, adjacent Docker unchanged. Exercise supported failure/lifecycle through focused tests, not a new host campaign. Screenshots support assertions; do not claim Electron/backend/NFS proof.
4. Current lockfile/web package changed since R2 (INV-17), so establish current scoped evidence rather than reuse historical54tests/36comparisons. Apply fresh TESTING.md impact reruns after subsequent merges, rebuild used outputs/typecheck; one run per case per round, diagnose causes, no repeated full-suite ritual.
5. Delivery finalizes scoped source/docs from isolated worktree to fresh origin/personal under secret/hygiene/license rules and safe owned cleanup. No release or installed-user check; preserve old detached evidence and canonical dirty checkout.
Risks: inadvertently deleting required cautions or altering command bytes; mitigated by exact command comparisons and both-locale safety assertions. Layout count is not layout proof; current rendered inspection required. No unknown external prerequisite; no source test executed during design (pure helper probe only, INV-13).

## Completed size/risk classification
- **task_size: Small** — one short component template region, three shortened/two-locale strings plus three removed keys, matching existing test/docs. Ticket relocation/history volume is not implementation size.
- **architectural_risk: Low** — no new or changed runtime/API/persistence/security/concurrency/deployment/ownership contract; existing surfaces consume shorter content unchanged. No material uncertainty.
- Escalate any necessary command/pin/runtime/security-policy/host/cross-guide change rather than expand direct route. Independent review determined only by fresh rules; implementation self-checks and executable validation still required.
