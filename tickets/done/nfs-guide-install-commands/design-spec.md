# Design — NFS guide installer commands

## Solution and approval basis
- Package nfs-guide-install-commands; Task autobyteus-254 / project_task_647690a1-0e1b-4564-9aed-a5b5bf0875e3.
- Status **Ready / Architecture Design Complete**, **SR-002**, requirements **R1 / SR-001 Approved** by Solution Designer within explicit task/user direction. No intended-behavior change from R1; no behavior-defining supplements.
- Authorities read: updated architecture-design.md, design-principles.md, finding-the-cause.md, ticket-scope.md, handoff.md, design-spec template; root DESIGN.md/TESTING.md/RELEASE.md/AGENTS.md, web AGENTS.md/ARCHITECTURE.md. Full phase reading gates completed in this conversation.
- Workspace / branch / base: /Users/normy/autobyteus_org/autobyteus-worktrees/nfs-guide-install-commands, codex/nfs-guide-install-commands, origin/personal at 33171e13855b4bcbcb8a9d650f2403cacb03d965. Finalization origin/personal; no release.

## Current-state read and architecture evidence
See investigation INV-01–05 and exact production path. Real helper import reproduces null; live anonymous asset bytes/hash establish published contract. No current runtime/host defect. Parent already passes a release descriptor; component has correct local clipboard ownership; localized content exists. NodeManager, server, Electron, NFS and Docker implementations need no redesign.

## Intended change / change scope
Modify only:
- `autobyteus-web/utils/nfsLauncherCommands.ts`: pinned public release data, display-only installation strings and public command-reference data.
- `autobyteus-web/components/settings/NfsGuideCard.vue`: numbered quick-start/reference presentation, extending existing clipboard state to all command IDs.
- `autobyteus-web/localization/messages/{en,zh-CN}/settings.ts`: NFS-specific strings only.
- Focused existing tests under `utils/__tests__/nfsLauncherCommands.spec.ts`, `components/settings/__tests__/NfsGuideCard.spec.ts`; narrow additional NFS wiring coverage in `components/settings/__tests__/NodeManager.spec.ts`. API may add a small owned browser probe under existing `tests/e2e/` conventions for this guide; no broad harness refactor.
- New short `autobyteus-web/docs/nfs_guide.md` explaining app guide contract and refresh procedure; root `RELEASE.md` **AutoByteus NFS assets subsection only** removes stale disabled/physical-prepublication assertions, links app guide, retains independent service release ownership and no app coupling. Delivery owns final doc synchronization.

Deliberately unchanged: Docker guide/utility/commands; NodeManager production ownership/route; all backend/Electron/NFS source, installer, shared/workspace skills, release workflows/versions and published artifacts. No follow-up IDs newly created. Generic tool versions or unrelated localization issues do not belong to this delta.

## Behavior / production-path map
| Behavior / requirements | Target path and owner | Boundary / failure |
|---|---|---|
| BEH-001; REQ-001/005 | Existing NodeManager → local NFS utility descriptor → NfsGuideCard install cards | Null/invalid/unsupported descriptor yields no install string; no external fetch |
| BEH-002/004; REQ-002/004 | NFS utility's small readonly command list + localized component quick-start and warnings | Text only, installed-tool prerequisite; public commands only |
| BEH-003; REQ-003/006 | One component copy handler → browser clipboard promise → local feedback | No IPC or host action; pending guard, failure and unmount lifetime retained |

## Decisions and concrete shape
### D1 — Publication data, not field-qualified support
Keep the existing helper/module boundary; no new store/service. Set `nfsPublishedRelease` to a typed readonly **v0.1.0** descriptor:
- installerUrl: `https://github.com/AutoByteus/autobyteus-nfs/releases/download/v0.1.0/autobyteus-nfs-install.sh`
- downloadUrl: `https://github.com/AutoByteus/autobyteus-nfs/releases/tag/v0.1.0`
- installerSha256: `65769690ada27db304d2e0e4bcd6716e6403f86650ca8f1905e26ebde86d25fa`
- rename local `qualifiedComputers` to **availableComputers**, value `['macos','linux']`; update both existing fixtures cleanly, no compatibility alias. This data is not persisted or an external contract.

Retain HTTPS/no-credentials/shell-safe URL validation; additionally require a nonempty valid version tag and 64-lowercase-hex digest before producing an executable command string. Keep optional-null input for genuine unavailable state and partial-computer fixtures. Guard download/review links consistently with valid descriptor; unsupported platform card stays disabled. Production values are fixed; do not build a release autodiscovery client or pretend null fixtures are the actual released state.

### D2 — Copyable install-only command, with integrity
`nfsLauncherCommand(computer, release)` remains pure. Generate the same fail-closed chain for each OS, differing only in checksum utility (`shasum -a 256 -c -` on macOS; `sha256sum -c -` on Ubuntu):

```sh
curl --fail --location --proto '=https' --tlsv1.2 \
  'https://github.com/AutoByteus/autobyteus-nfs/releases/download/v0.1.0/autobyteus-nfs-install.sh' \
  -o autobyteus-nfs-install.sh &&
printf '%s  %s\n' '65769690ada27db304d2e0e4bcd6716e6403f86650ca8f1905e26ebde86d25fa' 'autobyteus-nfs-install.sh' | shasum -a 256 -c - &&
bash autobyteus-nfs-install.sh version
```

This is displayed/copied text, never executed by frontend. Use the real asset/hash from INV-02, no placeholders in production. Retain `&&` across download/check/invocation; no curl-pipe-implicit-setup. Explain: use a host terminal/empty working directory (script saved there), review the installer from the release before running, command installs the tool and prints version without configuring storage. Release/download and installer-review link use safe exact URLs. Script itself verifies downloaded archive/manifest. Do not promise checksums replace publisher trust/signing or bypass OS checks. No compiler/Homebrew required; ordinary curl/checksum/shell tooling is still needed.

### D3 — Basic guide and public command reference
Use the Docker guide's established cards/grid/code style without editing it or extracting a generic component. Ordered sections:
1. **Install the CLI** — Mac/Linux cards, v0.1.0, exact OS/architecture descriptions and copy-only/review guidance.
2. **Choose what this computer does** — create once on storage host, connect others using printed connection JSON; explain interactive approval and ordinary path selection.
3. **Installed commands** — seven small copyable rows/cards, each title, short description, exact command; create/connect may appear in step2 instead of repeated in step3, but each command has one primary copy card.

Pure command data in the existing NFS utility: stable IDs and strings, localization keys/mapping scoped to NFS. Prefix every installed command with `~/.local/bin/autobyteus-nfs`; do not depend on a PATH export. Rows: interactive (no args), create, connect, status, reconnect, detach, version. README/CLI prove these. Internal `service`, `verify-release`, `internal-*` and invented stop/update/uninstall commands are excluded. Upstream v0.1.0 README link covers advanced flags; don't copy its obsolete prepublication prose.

Descriptions: no-args selects setup/saved-state options; create chooses existing/new source folder and trusted addresses; connect takes printed JSON; status reports actual host readiness and may wait; reconnect resumes saved storage/pending setup with consent, not data recovery; detach requires draining users and consent, preserves source/private data; version prints installed version without storage setup. Non-version commands may request administrator approval. No `--yes`, forced-detach or synthetic address examples.

Keep concise existing private-network/outage/no-offline-copy/unsupported/app-independence guidance. Say “available downloads/intended hosts” rather than “qualified platforms”. Add plainly visible **physical/shared-filesystem/independent-client and user testing remains deferred** statement. Installer availability doesn't prove host readiness. Both platform cards remain browsable regardless of app's own OS.

### D4 — One clipboard lifecycle
Extend local copied/pending ID type from NfsComputer to an NFS guide command ID union (install-macos/install-linux + seven usage IDs; existing install test hooks can remain). All Copy buttons use the same handler; no duplicate clipboard logic. Preserve promise-based success, error/manual-selection guidance, pending guard, two-second reset and unmount disposal. Keep feedback status in a single visible common location or close to the command sections, reachable for all buttons. No stale copied label after a failed/new copy. Code text matches copied bytes exactly. Unique aria labels identify the target command/platform; code has local overflow and selectable text; responsive grid never widens document. Localize all visible labels/descriptions in en/zh-CN using current t/runtime, not raw literals or a new locale mechanism.

## Task design health and structural decisions
- Change posture: bounded UI behavior/content correction and extension. Root cause: stale static publication value plus missing usage information, **not architecture drift**. Refactor needed now: **No**. Existing pure-data/component split absorbs change.
- Primary spine1: render entry → utility data/string projection → localized cards. Spine2: user Copy → component-owned clipboard request → same component feedback. Return/failure events are confined to existing promise lifetime. No off-spine background worker, subsystem or repository abstraction needed.
- Ownership: utility owns NFS guide command/version data; component owns presentation/clipboard lifetime; locale catalogs own strings; browser owns clipboard permission; standalone NFS owns all execution. Parent merely supplies data. External dependency is a public documented contract, not an application runtime dependency.
- Boundary/dependency rules: parent/component may import NFS guide utility; utility must not import application node/IPC/filesystem/store/provider APIs. No shared cross-domain DTO, inheritance, router registry or generalized command framework. Reusable structure is only the small NFS command row list; one template loop and one clipboard handler.
- Interface/data tightness: NfsPublishedRelease remains local read-only display data, typed with tag/URLs/digest/available computers. Usage rows contain a stable id + command (+ typed local label keys if useful), not execution callbacks. Do not add execute/privilege/ready metadata.
- Naming: “published/available” distinguishes distribution from qualification. Existing module/function path kept to avoid gratuitous rename; its comment must explain display-only, not app launcher attachment. No new subsystem/folder or catch-all utility.
- Legacy removal: replace production null and old pipe-to-bash generation; remove old qualifiedComputers spelling and tests expecting current production null. Keep explicit null/partial/invalid fallback tests. No dual spelling/legacy command fallback.
- Persisted state transition: **N/A — no persistence reader/writer, external protocol or migration**. No state/file reset. Build/test output and owned browser profiles follow testing cleanup rules.
- Backward compatibility rejection: no old null-production or qualification-alias branch; unsupported fallback remains intentional behavior, not compatibility code. No architecture examples needed beyond the concrete local command shape above.

## Implementation sequence / verification guidance
1. Update pure descriptor/command list/string builder and focused independent-expectation tests (valid current release, null/partial, invalid URL/digest/version, actual public commands).
2. Update NFS component and both catalogs together; preserve Docker and parent owner. Add focused copy/error/pending/unmount cases and parent tab wiring test.
3. Independently check exact rendered/copied commands, fail-closed shell chain with **stubbed tools only**, no real install. Compare guide contract to retained public script/checksum evidence, not merely helper-generated expectations.
4. Run focused Nuxt tests in one-shot mode, existing Docker guide/command tests and localization boundary checks. API/E2E owns affected rendered journey in real browser (desktop/narrow and both locales), including actual clipboard success and controlled rejection, exact tab/data wiring, download links and no execution. Use project's owned profiles/servers as necessary; browser-only result is not packaged-desktop qualification. Do not expand to NFS field validation or run installers.
5. Sync scoped guide docs/root NFS paragraph. Finalize per root RELEASE.md to current origin/personal after appropriate integration checks. No release requested. Preserve canonical dirty files/PM and all unowned resources.

## Task size and architectural risk — final classification
- **task_size: Small**. Structural delta is one existing 26line pure helper and one existing 77line guide component; two translation catalogs, focused tests and small docs are content/support. No new runtime owner, route, store, persistence or backend API.
- **architectural_risk: Low**. All operational actions remain text; clipboard behavior already exists. Explicit fixed integrity strings preserve the independent install contract, not a new app security/execution authority. Pure local type rename has no external consumers. Evidence establishes current null cause and exact public contract; no material unresolved architecture premise.
- Review route: fresh handoff rules selected **direct implementation to /software_engineering_team/implementation_engineer** for Small / Low. Independent review artifacts **N/A — not selected**; implementation self-checks and executable validation remain required. No historic NFS review promoted.
- Escalation: return Design Impact/reclassify if implementation needs IPC/runtime execution, app-host/UUID coupling, persisted/shared DTO changes, NFS/package/release changes or a broad cross-guide/harness refactor. New behavior beyond R1 is a Requirement Gap, not automatic scope.

## Tradeoffs, risks and remaining work
Manual pinned release metadata needs a deliberate future update, preferred to network discovery here. Long checksum commands need local horizontal scrolling; UI retains short titles and concise instructions. Future public availability can change; no live verification claim by the app. Clipboard can be denied; manual selection stays available. NFS field limits are explicitly disclosed; install/runtime tests are not requested or repeated. No design blocker; implementation/API/Delivery evidence still required before completion. This document is not an implementation or validation Pass.
