# Docs Sync Report — Native Workspace Folder Picker

## Scope
- Ticket: restore-native-workspace-folder-picker; initial delivery DR-001, API-REV-001 trigger.
- Classification preserved: **Small / Low; direct validated route**. Independent architecture, source and test-code review reports/revision records **N/A — not applicable**.
- Bootstrap: `origin/personal@88fad73cbd20201642acdcfe75e69b1897ec135c`.
- Integrated base: freshly fetched `origin/personal@af50bdd4056b9341e53494ad393b6283136a00ed`.
- Integrated ticket HEAD: `44b03b9f3b3f73535c1f3ec8e27dc9201ab4c5de`; merge parents API candidate `bd495bdeb39ddff2357013f288215e8b1b6df540` and fetched base. No conflicts; no uncommitted tracked candidate to checkpoint.
- First delivery mutation was base-into-ticket merge. Docs edits began only after this merge and the relevant integrated repository tests passed: **84 renderer/caller/store/service/gate + 5 preload**. `delivery-evidence/dr-001/{integration.json,repository.log,preload.log,checks.log}`; subsequent packaged rerun is recorded in the release/deployment report.

## Why Docs Were Updated
The existing long-lived start-surface docs described typed paths but did not describe restored native browsing, its eligibility, failure handling or explicit-apply boundary. Future changes must preserve the distinction between input, selection and launch/save rather than reconstruct it from ticket history.

## Long-Lived Docs Reviewed
| Path | Result | Reason / disposition |
|---|---|---|
| `autobyteus-web/docs/settings.md` | Updated | User-visible Browse → input → Use folder, local-only eligibility, cancellation/error/focus and saved-run locks. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Updated | Durable owner/bridge contract, error-before-cancel, pending/lifetime guards and no implicit persistence. |
| `TESTING.md` | No further change | API stage already added exact native/manual probe modes, isolated ownership/auto-launch prevention, and scope limits. Merge retained this alongside newer base testing rules. |
| `autobyteus-web/docs/agent_orgs.md` | No change | Existing member ownership, stopped save and fixed-root semantics remain correct; shared behavior is documented centrally rather than duplicated. |
| `autobyteus-web/docs/agent_teams.md`, `docs/agent_management.md` | No change | Agent/Team ownership and launch policy unchanged; no subject-specific picker implementation. |
| `autobyteus-web/docs/file_explorer.md` | No change | No explorer/native preview/registration contract change. |
| `autobyteus-web/AGENTS.md`, `ARCHITECTURE.md` | No change | Existing docs catalog/architecture boundaries still apply. No release policy or new subsystem. |
| `DESIGN.md`, `docs/isolated-app-instances.md` | No change | No new architecture or isolation mechanism. Existing guidance governs this delivery. |

Paths in abbreviated table entries are relative to the web package where paired with a preceding web document; root TESTING/DESIGN and isolated-instance guide are repository-root paths.

## Docs Updated
| Path | Type | Change |
|---|---|---|
| `autobyteus-web/docs/settings.md` | User/runtime behavior | Native Browse and manual alternative, choose-without-apply, silent cancellation, inline retry, pending/focus and unchanged explicit Save/locks. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Durable contract | Native Folder Input Contract subsection; existing public bridge vs lossy helper, current-form reply guards, existing RunWorkspaceChoice and downstream owners. |

## Durable Knowledge Promoted
| Topic | Source authority | Long-lived destination |
|---|---|---|
| Browse supplies text; Use folder selects; Send/Run/Save own effects | R3/UREQ-001; design DS-001..006; implementation and API reports; unchanged integrated source | Both updated docs |
| Error member precedes canceled (including empty error), rejected invoke localized | Design DS-005, actual menu/bridge, native-folder/preload tests | Agent execution architecture |
| Actual embedded context and mobile gate, not viewport alone | Design DS-001; production eligibility; tests | Both updated docs |
| Local pending/lifetime guard without global dialog manager or persistence transition | Design DS-006; production menu and tests | Agent execution architecture |
| Isolated native assistance must never re-open a closed bundle | API incident and runbook | Already promoted by API into TESTING.md; disclosure also retained in delivery user verification |

## Removed / Replaced Concepts
The text-only shared form description is replaced with native-assisted **and** typed input. No production component was removed by delivery. Retired configuration forms stay retired; no compatibility layer, helper rewrite, new IPC or schema is introduced. Other helper consumers remain unchanged.

## Result / Continuation
**Docs sync Pass — Updated**, not a no-impact decision. No intended-behavior ambiguity or design reroute identified. Delivery completion is separately held for explicit user verification and repository finalization; these edits are not committed/pushed before that signal. `handoff-summary.md` and `release-deployment-report.md` are authoritative for current gates and evidence limitations, including the upstream possible default-profile-access incident.
