# Docs Sync Report

## Scope

- Ticket: `delegated-launch-config-defaults`, `task_size=Large`, `architectural_risk=High`, reviewed route (ARCH-REV-002, CRR-002, API-REV-002, CRR-004 all Pass).
- Trigger: the delivery package from `code_reviewer` after CRR-004 Pass (2026-10-12).
- Bootstrap base reference: `origin/personal` @ `beb6b3b49`.
- Integrated base reference used for docs sync: `origin/personal` @ `3514fe48e`, merged into the ticket branch as `c421f5b86`. The reviewed state was checkpointed first as `a33d8ad66`.
- Post-integration verification reference: `release-deployment-report.md` → Integration Refresh. Logs are in `delivery-evidence/dr-001/`.
- DR-002 re-integration: `origin/personal` @ `449d639de` was merged as `7f750e1e5`. The merged base touched `TESTING.md` and the web `settings.md` (Token Meter) in other sections, so both docs edits stand unchanged. The base's own docs changes (token usage, Claude errors) do not touch launch configuration, so no further docs change was needed.

## Why Docs Were Updated

- Summary: agent and team `defaultLaunchConfig` now apply to agent-started copies and collaborators, resolved per agent, and to member rows of user-started Teams and Orgs. Fallbacks are recorded and shown, records gained optional per-agent launch fields, `delegate_task` gained `launch_notes`, and Settings gained a read-only "Collaborators and delegated copies" section. The module docs stated the old rules: a collaborator entry "snapshots the run's root launch settings", Org docs said referenced defaults never seed Org choices, and the admission steps named the removed runnability validator.
- Why this should live in long-lived project docs: the priority order, the "usable" rule, the record fields and the restore semantics are lasting contracts. Future work on delegation, run history, launch forms and DEC-006 (application baselines) depends on them.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | Owns collaborators, admission and catalog copies | Updated | New canonical section |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | `delegate_task` result shape | Updated | `launch_notes` |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Consumers of agent `defaultLaunchConfig` | Updated | |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Team default launch preferences and the Org relationship | Updated | |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org launch configuration statement | Updated | |
| `autobyteus-server-ts/docs/modules/run_history.md` | Persisted collaborator and copy-source shapes | Updated | |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md` | Stopped-run model mutator, collaborator Teams | No change | The mutator covers configured scopes only; collaborator hosting is unchanged |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Collaborator hosting in Agent roots | No change | It links to `agent_communication.md` for launch |
| `autobyteus-web/docs/agent_teams.md` | Team New chat and mobile launch | Updated | New "Member Launch Defaults" subsection |
| `autobyteus-web/docs/agent_orgs.md` | Org launch page initial settings | Updated | |
| `autobyteus-web/docs/settings.md` | Existing-run Settings view | Updated | New section bullet |
| `autobyteus-web/docs/agent_management.md` | Agent `defaultLaunchConfig` form | No change | The form is unchanged |
| `autobyteus-web/docs/chat.md` | Start-surface initial settings table, Team launch | No change | The root rule and `buildChatTeamLaunchConfig` are unchanged; seeded rows are ordinary overrides, linked from `agent_teams.md` |
| `autobyteus-web/docs/remote_access.md` | Mobile run setup | No change | Mobile seeding is documented in `agent_teams.md` |
| `TESTING.md` | "Build outputs" bullet was wrong about tracked contract `dist/` | Updated | Separate `docs(testing)` commit at finalization |
| `RELEASE.md` | "Never commit build output: `*/dist/`" has the same error | Needs follow-up | Proposed fix in `release-deployment-report.md`; the guide changes only with user agreement |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | New section + corrections | Added "Launch configuration of collaborators and catalog copies": layer order, the usable rule, fallback reasons, note text and where notes appear, recorded values, what is unchanged, UNK-001. Fixed the entry snapshot sentence, admission step 2 and the catalog-copy bullet. The removed runnability validator is replaced by the launch resolver in the module list | The old text described root-only launches |
| `autobyteus-server-ts/docs/modules/agent_tools.md` | Contract update | `launch_notes?` on both success shapes, when it appears, the narrowed `cannot be delegated to` condition | New tool result field |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | Consumers list | Added delegated copies, collaborators and web launch-form seeding; the usable rule; configured placements unchanged | |
| `autobyteus-server-ts/docs/modules/agent_team_definition.md` | Rule rewrite | Member default before Team default, for user starts and agent starts; server Org resolution unchanged; DEC-006 noted | The old text said Team defaults never reach Org runs |
| `autobyteus-server-ts/docs/modules/agent_orgs.md` | Statement rewrite | The server never reads referenced defaults; the web launch page seeds visible rows | |
| `autobyteus-server-ts/docs/modules/run_history.md` | Schema | `launchSource` / `defaultLaunchSource` shape, member `launchConfiguration`, the effective-member readers, no migration, downgrade behavior | Persisted shape changed |
| `autobyteus-web/docs/agent_teams.md` | New subsection | Seeding, the usable rule, the row note, pins and their release, "+"/switcher not seeded, mobile behavior | |
| `autobyteus-web/docs/agent_orgs.md` | Rule update | Org **Run** seeds placed teams and agents; order agent → placed team → Org | |
| `autobyteus-web/docs/settings.md` | New bullet | "Collaborators and delegated copies": badges, source labels, fallback line, closed copies hidden, refresh limit | |
| `TESTING.md` | Correction | The three contract packages track their `dist/`; rebuild and commit it with source changes | Recorded by implementation, code review and API/E2E |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Priority order (DEC-001) | Agent default → Team default → run root; one unit per layer (DEC-002); inherited from the root, not the delegator (DEC-003) | `requirements-doc.md`, `design-spec.md` | `agent_communication.md`, `agent_team_definition.md` |
| Usable rule (DEC-004) | Both fields named, runtime available, model and settings valid; incomplete is skipped | `requirements-doc.md` | `agent_communication.md`, `agent_definition.md`, web `agent_teams.md` |
| Snapshot at start (DEC-008) | Recorded values drive restore, extra copies and teammates; later edits affect only new starts | `design-spec.md` | `agent_communication.md`, `run_history.md` |
| Persisted transition | Optional fields, truthful absence, no migration; old records read as "not recorded" | `design-spec.md`, `implementation-handoff.md` | `run_history.md` |
| Launch-form pins (DEC-009) | Seeded rows survive root changes; released by model, row or all reset | `requirements-doc.md`, `implementation-handoff.md` | web `agent_teams.md` |
| Known limits | UNK-001; DEC-006 application baselines; Settings refresh for saved Team/Org runs; "As configured in this run" | `implementation-handoff.md`, `api-e2e-execution-coverage-report.md` | `agent_communication.md`, `agent_team_definition.md`, web `settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `collaborator-runnability-validator.ts` (`CollaboratorRunnabilityValidator`) | `collaborator-launch-resolver.ts` (`CollaboratorLaunchResolver`) | `agent_communication.md` |
| Entry builder `cloneLaunch(rootLaunchConfiguration)` (every agent on the root launch) | Per-agent plan resolved by the launch resolver | `agent_communication.md` |
| "Referenced definition defaults never seed Org choices" | Web Org launch page seeds visible rows | server `agent_orgs.md`, `agent_team_definition.md`; web `agent_orgs.md` |
| `RootTeamRun.getAgentExecution` (dead, CR-001) | None (no caller) | Not documented before; nothing to update |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary and the AC-015 user-verification hold.
- Notes: `RELEASE.md` needs the same correction as `TESTING.md`. It is a follow-up proposal for the user, not changed in this ticket.

## Round 2 (DR-003, reopened: SR-005 + SR-006, IR-003, API-REV-004)

- Trigger: the direct-route package from `api_e2e_engineer` (API-REV-004 Pass, 95%), `task_size=Medium`, `architectural_risk=Low`. Test-code review was not required on the direct low-risk route.
- Integrated base used for docs sync: `origin/personal` @ `32aca0818` (legacy Docker retirement), merged into `codex/delegated-launch-config-defaults-r2` as `071033f95`. The round-4 checkpoint before it is `50cd035c5`.
- Why docs changed: the round-1 docs said the heading switcher is never seeded (SR-005 corrects that defect). They also described the removed `RunDelegatedLaunchList.vue` flat list (SR-006 replaces it with collapsible member rows).

| Doc Path | Result | What Changed |
| --- | --- | --- |
| `autobyteus-web/docs/agent_teams.md` | Updated | "Member Launch Defaults": a start table (fresh Run, New chat switcher, Org page switcher, "+"), `seedTeamMembers` guards and error handling, "+" keeps recorded member settings |
| `autobyteus-web/docs/agent_orgs.md` | Updated | The heading switcher seeds placed teams and agents like Run; switching from the Org page to a Team seeds; a "+" copy is not seeded |
| `autobyteus-web/docs/settings.md` | Updated | "Collaborators and delegated copies" rewritten. It is a second read-only `RunMembersSection` using `RunMemberRow`: collapsed by default, badge, `model · runtime · approval` plus source, "Notes: N", Team card then Members, Coordinator chip, a team note once, `<address>@<run ID>` keys, locked rows |
| `autobyteus-web/docs/chat.md` | No change | Its switcher row describes root carry and member reset, which stay true. Seeding is owned by `agent_teams.md` |
| Server module docs | No change | No server, contract or persistence change this round |

- Removed or replaced and recorded:
  - `components/run-settings/RunDelegatedLaunchList.vue` and the `DelegatedLaunchRow*` types are replaced by `RunMemberNode` rows in `RunMembersSection` / `RunMemberRow`.
  - The new structure is documented in web `settings.md`.
  - The internal `RunMemberNode.launchNote` → `launchNotes` type change is recorded in `implementation-handoff.md` only, because no long-lived doc named the field.
- Result: `Pass`.
