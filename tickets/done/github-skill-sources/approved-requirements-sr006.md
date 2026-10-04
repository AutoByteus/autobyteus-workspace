# Requirements Document

## Document Status
- Package: `github-skill-sources`; revision: `SR-002`; date: 2026-10-04.
- Status: **Ready for Approval**; owner: Solution Designer.
- Approval: full baseline approval pending. User follow-up explicitly confirms preservation of local folders and abort-with-error duplicate-name checks; this does not establish approval of all remaining proposed scope. The user explicitly confirmed retaining the existing runtime-default exception after the SR-003 explanation (SR-004 conversation reference).
- Behavior-defining supplements: none. User screenshot is current-state evidence, not a target visual specification.

## Problem And Desired Outcome
Users can import public GitHub agent packages and check/apply updates, but adding independent skills currently requires a local folder. Enable adding a public GitHub skill repository from Manage Skill Sources without manual cloning, and checking/applying later updates. Imported skills become normal catalog entries available for existing skill selection and future agent runs.

## Actors
The user adds/manages sources and decides whether to update or remove them. The application checks upstream status and manages downloaded copies. Repository authors publish skills; publishing alone must not replace installed content.

## Relevant Current And Desired Behavior
| ID | Kind / scenarios | Evidence-backed current behavior | Proposed desired behavior | Preserved behavior |
| --- | --- | --- | --- | --- |
| BEH-001 | User; SCN-001 | Skill Sources accepts existing local directories only. | Add public GitHub repositories as managed skill sources. | Local folders remain linked in place. |
| BEH-002 | System/User; SCN-002 | No GitHub skill-source checks; agent packages check on manager mount. | Check automatically when Sources opens and offer manual recheck; show per-source status. | Checking never changes installed skill files. |
| BEH-003 | User; SCN-003 | No managed skill-source update action. | Explicitly confirmed Update replaces source with latest default-branch revision. | No automatic install; failures keep previous usable version. |
| BEH-004 | User/Contract; SCN-001/003/004/005 | Shared catalog has one copy per name, conflict dialogs, runtime-default shadow notices, edit permissions, reload and local-source removal. | GitHub sources participate in these existing catalog and ownership rules. | Existing sources, enable/disable choices, agent selections, and local files are preserved except explicitly changed managed source content. |

Evidence references: investigation-notes.md E-001–E-009 and SR-005 user rationale.

Preserved-policy rationale (user-confirmed, SR-005): users may have forgotten skills previously installed in Codex or Claude. Their explicitly imported AutoByteus skills, including skills bundled in custom agent packages, take precedence over matching runtime-default copies. Those defaults must not block the explicit import or silently determine the chosen copy. This does not permit one ordinary custom source to overwrite a conflicting different custom source.

## Scope Guardrail
### In-scope use cases
| ID | Use case | Scenarios |
| --- | --- | --- |
| UC-001 | Add all discoverable skills from a public GitHub repository | SCN-001, SCN-005 |
| UC-002 | Inspect upstream availability and manually apply a source update | SCN-002, SCN-003, SCN-005 |
| UC-003 | Remove a managed GitHub skill source while preserving other source types | SCN-004 |
| UC-004 | Use imported skills through the existing catalog and future-run workflows | SCN-001, SCN-003, SCN-004 |

### Out of scope
Private-repository credentials, non-GitHub hosts, marketplace/search, arbitrary branch/tag/commit selection, GitHub tree/blob URL imports or subfolder selection, per-skill selection during repository import, dependency/install-script execution, Git merge/conflict tooling, local Git pull/status, changes to agent-package import, general SKILL.md parser redesign, live refresh of already-running agents, and a Product Team redesign.

### Non-goals
No continuously polling background scheduler, no unattended update installation, no promise to support arbitrary repository layouts or every third-party frontmatter dialect. No built-in backups/history UI for successful updates.

### Preserved behavior boundary
BEH-004 and REQ-004/007 protect existing local/default/package/runtime-default catalog behavior. A skill repository is not imported as agents, teams, organizations or applications.

### Review authority
Blocking technical findings must cite an approved REQ/AC/BEH. New behavior, policy, threat model or migration obligation is a Requirement Gap requiring user approval; adjacent improvements are non-blocking separate work. Reviewer comments do not amend this baseline.

## Requirements
All rows are proposed Must requirements, subject to explicit approval.
| ID | Behavior | Requirement and source |
| --- | --- | --- |
| REQ-001 | BEH-001 | Manage Skill Sources accepts a public HTTPS github.com repository-root URL and imports its default branch into app-managed storage without requiring a local clone or Git installation. Accept ordinary trailing slash/.git variants as the same repository. A duplicate import directs the user to the existing row without another install. User request; E-003/E-007 precedent. |
| REQ-002 | BEH-001/004 | Discover either one skill at repository-root SKILL.md, or collections at immediate child skill folders and under the conventional skills/ directory (existing nested skills/ convention retained). Root SKILL.md denotes a single-skill repository; do not also import its supporting subfolders as independent skills. Use current SKILL.md validity rules. Import all valid discovered skills plus their supporting files; show count. No valid skills means reject with actionable feedback. Invalid candidates in an otherwise usable collection are reported as skipped, not silently counted. Proposed bounded layout contract; E-005. |
| REQ-003 | BEH-002 | Opening Sources automatically checks each installed GitHub source against its current remote default-branch revision; also offer Check again. Distinguish not checked/checking, up to date, update available and failed/unknown states. Check failure preserves the installed catalog and does not claim up to date. Source identity, installed/latest revision when known and last checked information remain available. User request; E-003. |
| REQ-004 | BEH-001/003/004 | Import/update must enforce the existing one-skill-per-name policy, including duplicates within the incoming source. Any conflict with other non-runtime-default copies aborts the entire import/update without partial installation or overwriting existing skills, showing the conflicting names and existing/incoming paths in the existing error dialog; replacement excludes its own previous copy. Runtime-default duplicates retain the existing precedence and notice behavior. E-006. |
| REQ-005 | BEH-003 | User-initiated Update fetches the latest default-branch revision. Before applying, clearly confirm that the entire managed source is replaced, including local edits and upstream deletions. Cancel changes nothing. Network/download/validation/conflict failures keep the prior installed files and usable catalog, show failure and allow retry. Successful update refreshes source counts, revision/status, skill cards and future selections without restart. It must not imply live refresh of active runs. User request; proposed explicit data-loss decision. |
| REQ-006 | BEH-004 | Removing a GitHub source requires confirmation explaining removal of its downloaded copy and any local edits. Success removes it from Sources/catalog and deletes only that managed copy, never upstream or unrelated local files. Removing a local source continues merely unlinking it; default source cannot be removed. E-002/E-004 and proposed ownership contract. |
| REQ-007 | BEH-004 | Source registrations and installed revision survive restart. Existing local-source registrations/files, agent-package behavior, skill editability by filesystem permissions, name-based agent selections and enabled/disabled choices remain unchanged. New imports are normal catalog skills under existing default-enable policy; updates retain choices for surviving names. Removed/renamed upstream skills cease to be selectable without rewriting saved agent definitions or promising active-run changes. Existing Reload rescans installed files only, not remote updates. E-004/E-006/E-008. |
| REQ-008 | BEH-001/003 | Only supported public repository inputs are accepted; invalid/private/unavailable URLs fail clearly. Imports/checks/updates do not execute downloaded scripts, and downloaded/extracted content cannot write outside application-owned staging/install storage. Importing a skill is not an endorsement of its instructions; tell users to import only sources they trust. This is proposed safety behavior at the new remote-download boundary, not a malware scanner or runtime sandbox. |

## Acceptance Criteria
| ID | Requirements / behaviors / scenarios | Trigger | Observable outcome / error | Verification intent |
| --- | --- | --- | --- | --- |
| AC-001 | REQ-001/002/007; BEH-001/004; SCN-001 | Add root-skill and collection fixtures from GitHub | One managed row, correct skill count, files open normally, skills available for future selection; restart retains source/revision. No agent/team/application definitions imported. | API integration, catalog tests and real UI journey |
| AC-002 | REQ-001/002/008; BEH-001; SCN-001/005 | Repeat equivalent URL; empty/invalid collection; unsupported/private URL | Duplicate directs to existing row; empty/unsupported rejects with no registered partial source; mixed collection reports skipped invalid candidates and counts valid skills only. | Deterministic source and API error fixtures |
| AC-003 | REQ-003; BEH-002; SCN-002/005 | Open Sources, manual recheck, remote SHA unchanged/changed/unavailable | Automatic check and manual retry work; correct per-source status, no installed file changes, existing catalog usable offline. | Component/store and API integration |
| AC-004 | REQ-004; BEH-004; SCN-001/003/005 | Import/update duplicate names within source or against other source | Conflict dialog identifies existing/incoming paths; source not installed/updated. Runtime-default-only duplicate accepted with existing notice. Existing names of the updated source are not false conflicts. | Catalog and transaction integration |
| AC-005 | REQ-005/007; BEH-003/004; SCN-003 | Update after upstream additions/edits/deletions; cancel; retry failure | Confirmation states overwrite consequence; cancel preserves all data; success refreshes counts/cards/files without restart and preserves surviving enable choices; failure preserves prior usable install. | Failure-injected lifecycle integration plus UI journey |
| AC-006 | REQ-006/007; BEH-004; SCN-004 | Remove GitHub source vs local source vs default | Managed-copy confirmation/cancel; successful managed removal disappears after refresh/restart, unrelated sources survive; local remove leaves files; default cannot remove. | Filesystem/API integration and UI |
| AC-007 | REQ-007; BEH-004; SCN-001/003/004 | Existing local add/reload/edit/select workflows | Existing paths and precedence still work; no lost local files/settings/agent selections, no changes to agent package import; Reload does not fetch remote. | Focused regression suites |
| AC-008 | REQ-008; BEH-001/003; SCN-005 | Unsupported URL or archive attempting out-of-root writes; script-bearing valid skill | No out-of-root mutation or automatic script execution; reject unsafe input, retain previous install on update failure; trust guidance visible. | Boundary tests using disposable storage |

## Relevant Scenarios And Journeys
All new target scenarios below are proposed for approval, not claims of current support.
| ID | Kind / actor / goal | Trigger and starting condition | Product sequence / expected outcome | Alternate/error | Validity / independent evidence |
| --- | --- | --- | --- | --- | --- |
| SCN-001 | User adds reusable skills | Skills > Sources, user has public repository-root URL | Paste URL, Add GitHub source, see skill count and browse/select its skills | Duplicate, no valid skills, conflicts and unsupported URL reported without partial import | Supported Normal Scenario (proposed); user's direct request + local add/source UI precedent |
| SCN-002 | System checks published changes for user | User opens Sources with registered GitHub sources or clicks Check again | Show check activity and current/update status, keep installed version | Offline/rate-limit/unavailable source displays failure and retry | Supported Normal Scenario (proposed); user request and agent-package onMounted check |
| SCN-003 | User applies upstream version | Update available on managed source | Click Update, read overwrite confirmation, confirm; catalog gets latest skills | Cancel no-op; validation/network/conflict failure retains prior copy | Supported Normal Scenario (proposed); user request plus existing skill file editing makes overwrite consequence relevant |
| SCN-004 | User no longer wants source | Existing removable source in Sources | Confirm remove, catalog refreshes; managed source copy removed, local folder only unlinked | Cancel no-op; default protected | Supported Normal Scenario (proposed GitHub extension); existing Remove UI |
| SCN-005 | User receives/retries import or update error | Ordinary Add/Check/Update action encounters invalid content, duplicate names or unavailable remote | Actionable error and no loss of existing usable catalog; retry after remedy | Unsafe repository contents rejected; no downloaded scripts execute | Supported Explicit Edge Scenario (proposed); existing conflict contract and new remote-source input boundary |

## UI, Interaction And Experience
Applicable: Yes. Extend existing Manage Skill Sources, not a new settings page. Distinguish Default, Local and GitHub source ownership, maintain local folder entry, provide GitHub URL entry, per-source count/status/actions and progress/success/error feedback. Disable duplicate submissions while a source operation is active. Keep controls reachable in the existing scrollable modal. Use existing localized UI and confirmation/conflict patterns. No exact pixels prescribed.
Product Team request, repository, UI/UX spec, visualizer, approved visual baseline and approval reference: **N/A — not applicable**, none requested. Supplied screenshot is illustrative current-state evidence only.

## Quality And Non-Functional Requirements
- QR-001 Reliability: REQ-005 / AC-005: failed update cannot destroy prior usable copy; deterministic failure tests.
- QR-002 Compatibility: REQ-004/007 / AC-004/007: preserve catalog identity and source behaviors.
- QR-003 Security: REQ-008 / AC-008: bounded public-download inputs and no script execution/out-of-root writes; no wider security program in scope.
- No numeric throughput/latency SLA proposed.

## Data Continuity And Acceptable Loss
Persisted data affected: Yes (new managed registrations, downloaded skill content and revision/status). Existing local registrations/files, other source content and surviving skill enable choices must remain. Explicitly confirmed successful updates may discard local modifications and upstream-deleted files inside that managed copy; explicitly confirmed source removal deletes that copy. Cancelled/failed updates may not lose prior usable content. No history/merge/recovery promise after a successful confirmed destructive operation. Source contents remain editable according to current permissions. Users who maintain edits should use local Git folders instead. No migration mechanism selected before architecture investigation.

## External Contracts And Dependencies
Public github.com repository access, default-branch revisions and downloads (network failures/rate limits are recoverable errors); current SKILL.md loader contract. No externally sourced API claims are relied on yet: architecture must verify current API/archive behavior before choosing technical reuse.

## Supplements, Assumptions And Decisions
- Supplemental authority: none. Screenshot is E-001 supporting evidence only.
- ASM-001: First release targets entire public repositories, not subfolder URLs. Proposed explicit scope, awaiting approval.
- DEC-001: User approval of the full SR-002 baseline including bounded layouts, check-on-open cadence, managed-copy overwrite/remove semantics and non-goals is pending.
- No material intended-behavior ambiguity remains within this proposed baseline; user may revise scope before approval.

## Traceability
| Requirement | Use cases | Behaviors | ACs | Scenarios |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001 | BEH-001 | AC-001/002 | SCN-001/005 |
| REQ-002 | UC-001 | BEH-001/004 | AC-001/002 | SCN-001/005 |
| REQ-003 | UC-002 | BEH-002 | AC-003 | SCN-002/005 |
| REQ-004 | UC-001/002 | BEH-001/003/004 | AC-004 | SCN-001/003/005 |
| REQ-005 | UC-002/004 | BEH-003 | AC-005 | SCN-003/005 |
| REQ-006 | UC-003/004 | BEH-004 | AC-006 | SCN-004 |
| REQ-007 | UC-001/002/003/004 | BEH-004 | AC-001/005/006/007 | SCN-001/003/004 |
| REQ-008 | UC-001/002 | BEH-001/003 | AC-002/008 | SCN-001/003/005 |

## Architecture Phase Input
After approval, map SCN-001–005 to production paths. Investigate source registry/config continuity conventions, shared GitHub transport feasibility without coupling skills to agent-package validation, root-skill discovery, update/removal atomicity and simultaneous operations, archived content boundary and all catalog consumers. No target modules/schema or risk classification decided yet. Tests not run; this is source investigation only.

## Readiness Check
Current behavior evidence, explicit desired/preserved behavior, scope, testable traceability, scenario validity, visible assumptions/decisions: Yes. Product-owned approval and behavior supplements: N/A. Content ready for approval: Yes. User approval: No. Ready for architecture: No, waiting explicit full-baseline approval. Design/review/implementation artifacts: N/A — not applicable at this phase.
