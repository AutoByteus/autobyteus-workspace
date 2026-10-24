# Design — NFS guide installer commands (reopened link removal)

## Basis and status
- Package `nfs-guide-install-commands`; Task autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3.
- **SR-004 Ready / Architecture Design Complete**; **R2 / SR-003 Approved** by Solution Designer within the explicit Oct24 direction, user informed. No additional product decision or supplement.
- Worktree `/Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands-r2`, branch `codex/nfs-guide-install-commands-r2`; freshly resolved origin/personal base `8b34e8ae108a281b0c93c679c60883df28a30773`; finalization origin/personal, **no release**.
- Authorities read: updated SKILL.md, architecture-design.md, design-principles.md, design-examples.md, design-spec-template.md; requirements-engineering, finding-the-cause, ticket-scope, handoff; root DESIGN.md/AGENTS.md/current TESTING.md/RELEASE.md and web AGENTS.md/ARCHITECTURE.md. No conflict; no closer DESIGN/AGENTS found.
- SR-002's original implementation was delivered. It is historical in Git/prior receipt, not the implementation instructions for this reopen. Only the delta below is authorized.

## Current-state evidence / design health
INV-06–10 in investigation-notes.md establish the actual owner and exact consumers. Two anchors are literal template markup. The guide still has nine command cards, a separate advanced link and a shared local clipboard lifecycle. No runtime defect or unknown mechanism needs reproduction.
- Change posture: user-requested local presentation change.
- Root cause: no design issue found; user now prefers less redundant navigation.
- Refactor needed now: **No**. Remove obsolete markup/labels and replace the now-misleading URL-valued presentation condition with an explicit boolean. No subsystem/helper extraction, framework or state machine.
- Persistence: **Not Affected**; no reader/writer/schema/protocol changes. Migration, backup/rollout gates and additional recovery mechanisms: N/A.

## Approved behavior → production path / ownership
| Spine / behavior | Supported trigger and current → target path | Owner and boundary |
|---|---|---|
| DS-001; BEH-001/002/004/005; SCN-001/002/004/005 | User opens NFS tab → NodeManager:60–63 → validated command projection in NfsGuideCard:72–78 → localized cards/prose. Target removes only :31–32; version line :11 and advanced link :54 survive. | NfsGuideCard owns presentation; utility owns unchanged command data/validation; catalogs own localized strings |
| DS-002; BEH-003; SCN-001–003 | User Copy → existing NfsGuideCard.copy → browser clipboard promise → local feedback/reset/unmount | Existing component exclusively owns lifecycle; no external execution |

Off-spine concerns: localization serves presentation through existing useLocalization; URL/digest validation serves command availability through existing pure helper. No new owner/boundary. Template and typed command IDs remain internal UI details; no API/interface change. Normal/partial/null paths are explicitly accounted for, not inferred from one happy path.

## Change Scope and concrete instructions
| File | Responsibility / intended delta |
|---|---|
| `autobyteus-web/components/settings/NfsGuideCard.vue` | Delete the two anchors at base lines31–32, not CSS-hide them. Preserve advanced README anchor line54 and all command markup/handlers. Replace local URL-valued `downloadUrl` computed line78 with clearly named `hasAvailableInstaller = computed(() => computers.value.some(computer => Boolean(computer.command)))`; use it for version paragraph line11. Keep `allAvailable` and unavailable prose unchanged. No extra spacer/empty container for removed links. |
| `autobyteus-web/localization/messages/en/settings.ts` and `zh-CN/settings.ts` | Delete only `NfsGuideCard.download` and `.installerReview` keys after confirming no other consumers. Amend `.computerHint` review clause to point to the URL in the displayed command before running. Keep all other caveats and unrelated integrated keys. Suggested English: “Review the installer at the URL shown in the command first, then paste into a host terminal …”; equivalent Chinese: “请先查看命令中网址对应的安装脚本，再在主机终端…”. |
| `autobyteus-web/components/settings/__tests__/NfsGuideCard.spec.ts` | Remove stale expectation that partial data exposes installer anchor; assert exact remaining README link in valid, partial and unavailable states, and neither removed label/href anchor in both locales. Preserve and run exact-copy/lifecycle/negative cases. Add explicit version-notice checks for valid/partial vs invalid/null to protect the retained consumer. |
| `autobyteus-web/docs/nfs_guide.md` | Correct maintenance paragraph that says invalid descriptors remove installer/release links: standalone links no longer exist in any state; invalid data suppresses version notice and disables affected install controls. Clarify review via URL in command if needed. Existing document hyperlinks are NOT removal targets. |

**Deliberately unchanged:** `utils/nfsLauncherCommands.ts` including `NfsPublishedRelease.downloadUrl` validation and pins; NodeManager production; Docker guide; all runtime/backend/Electron/NFS source; installer bytes/release assets; workspace/agent skills; versions/workflows; links elsewhere. Narrow extra tests only if needed to prove the stated delta. New follow-ups: none.

## Removal and derived-consumer check
- Local computed `downloadUrl` is **not entirely dead today**: version notice still reads it. Replace with explicit boolean as above, preserving version visibility for a valid partial descriptor, not `allAvailable`.
- Descriptor field `downloadUrl` stays: `nfsLauncherCommands.ts:31` reads it in actual validation. Removing it would silently change admission/fixtures outside this request. No source-hash/command generation change needed.
- The two deleted label keys have exactly one template usage each, plus en/zh-CN definitions; grep found no other web reader. Delete definitions once those usages go. No broad unused-key sweep.
- Advanced link, its localization key, all install/usage data and the copy lifecycle remain live.
- Derived consumers to update: partial descriptor link assertion and docs' link-state prose. Historical browser evidence asserting three links is historical; API may create its new delta probe, never rewrite old results.

## Dependency and compatibility decisions
Existing utility/component/localization boundary is retained. No import from NFS runtime, app nodes, IPC, filesystem or stores; no new execution callbacks. No structural abstraction, file movement, wrapper/dual path, feature flag or hidden deprecated anchor. Clean-cut UI removal with no compatibility branch. Naming describes availability, not a deleted action or qualification. Current folder placement remains appropriate for this one existing Vue component.

## Verification and implementation sequence
1. Edit only the component, two catalogs, focused test and guide doc above. Preserve helper bytes/metadata and every copied string; no installer/CLI execution or release lookup needed for unchanged pinned contract.
2. Reconfirm exact residual anchor, valid/partial/null availability and review wording in both locales. Verify the changed tests fail on the original two-link shape and pass on target as proportionate; don't alter unrelated source to satisfy a stale expectation.
3. Run focused existing guide/command tests and affected localization/type guards; preserve adjacent Docker/NodeManager wiring. Follow current TESTING.md impact planning against current base. Old test totals are historical, not a current pass or a reason for a new field campaign.
4. API/E2E proves current rendered web-equivalent Nodes → NFS Guide (desktop/narrow, en/zh-CN): links absent, no gap/overflow, advanced link present, cards/Copy exact and guidance coherent. Existing clipboard lifecycle tests cover controlled edge states. Browser/component evidence is not Electron/backend/NFS qualification. No mandatory user check.
5. Delivery syncs only affected guide documentation, integrates against fresh origin/personal, verifies scoped evidence/finalization/owned cleanup. No version/tag/release/deploy; preserve canonical dirty checkout and old retained detached receipt worktree.

## Completed classification
- **task_size: Small** — one existing component's two anchors and local presentation predicate, two localized entries/reminder, focused assertions and a documentation sentence. Ticket history/file moves are not production scope.
- **architectural_risk: Low** — no changed runtime/API/persistence/security/installer/clipboard contract. Main risk is inadvertently deleting the surviving version condition; exact three-consumer trace and partial/invalid tests address it. No material uncertainty.
- Fresh handoff rules selected **direct implementation to /software_engineering_team/implementation_engineer** for Small / Low. Independent architecture/source review N/A—not selected. Implementation self-checks and API validation still apply.
- Escalate a genuine necessary change to command strings, validation, cross-guide ownership, live execution or NFS/app coupling; don't silently expand this preference revision. No current blocker.
