# Docs Sync Report — workspace-skill-collision-fix

## Scope

- Ticket: `workspace-skill-collision-fix` (Project Task `autobyteus-142`)
- Trigger: CRR-002 Pass (post-API/E2E test-code review) from `/software_engineering_team/code_reviewer`; reviewed route
- Bootstrap base reference: `origin/personal` @ `1c718202b2` (v1.5.6-beta.2 record). The base was later moved to `9de0828aaa` (v1.5.6-beta.3) by merge `c59da62e70`.
- Integrated base reference used for docs sync: `origin/personal` @ `9de0828aaa` (fetched 2026-10-18 at delivery start; already contained in branch HEAD `1c69409a85`)
- Post-integration verification reference: `delivery-evidence/dr-001-head-typecheck-unit-backends.log` (typecheck clean; backend unit 85 files / 1,070 tests pass)

## Why Docs Were Updated

- Summary: the module doc for filesystem workspaces still described the removed execution-private ("NFS-only") skill profiles as the skill path for Claude, Codex and Grok on every filesystem. That is now false. The restored behavior is the beta.1 workspace-link materializer.
- Why this should live in long-lived project docs: readers of the workspace/storage doc must not conclude that skills depend on storage, or that a private profile exists. Removing the stale text stops it from being taken as a design target again.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/shared_network_workspaces.md` | Described the removed private skill profiles | Updated | Section "Configured skills and process ownership" rewritten |
| `autobyteus-server-ts/docs/modules/skills.md` | Canonical workspace materializer and collision policy | No change | Its "Codex and Claude" and "Workspace collision policy" sections were unchanged since beta.1 and match the restored code (only the skill-update-notice paragraph changed since beta.1) |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | `skills/list` preflight, `.codex/skills` materialization | No change | Describes beta.1 behavior; never changed by the NFS extraction |
| `autobyteus-server-ts/docs/modules/grok_build_runtime.md` | `.grok/skills` materializer | No change | Already states the shared materializer applies the same rules |
| `autobyteus-server-ts/docs/modules/agent_packages.md` | Package-private skill links | No change | Describes `.codex/skills` / `.claude/skills` links, accurate |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Materializer references | No change | Accurate |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Memory folder placement (REQ-102) | No change | Never claimed preparation needs the memory folder |
| `autobyteus-web/docs/skills.md` | User-facing skills doc | No change | No private-profile statements |

Search used: `private skill profile|runtime-skill-profile|RuntimeSkillProfile|preparePrivateRuntimeSkills|private-profile|privateSkillProfile|skills/extraRoots|runtime-skill-profiles` over tracked `*.md` (outside tickets). The only tracked hit was `shared_network_workspaces.md`. Other hits were untracked build copies (`autobyteus-web/resources/server`, `electron-dist`), regenerated at build. `git diff v1.5.6-beta.1 HEAD -- autobyteus-server-ts/docs autobyteus-web/docs` confirmed that no other skill-behavior doc was changed by the extraction.

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/shared_network_workspaces.md` | Rewrite of one section, plus a new heading | "Configured skills and process ownership" → "Configured skills": skill exposure is independent of storage. The doc names the shared `WorkspaceSkillMaterializer` and its rules (reuse a same-skill link, repair broken links, release at run end, Codex `skills/list`, configured-skill refusal vs `ALL_INSTALLED` preference) and states that preparation does not need the memory folder. It links `skills.md`, says there is no NFS-specific or private profile, and says leftover `runtime-skill-profiles` folders are inert. The Git paragraph moved under a new "Git and ordinary operations" heading, with its text unchanged | REQ-101/102/103; the old text described removed code |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Skills are storage-agnostic | Claude/Codex/Grok skill exposure is the same on every workspace; no NFS skill path exists; a future NFS skill design needs its own approval | `requirements-doc.md` (REQ-103, DEC-102), `design-spec.md` | `shared_network_workspaces.md` |
| Leftover beta.2/beta.3 profile folders | `<memory>/runtime-skill-profiles/` is inert and deletable | `requirements-doc.md` (Data Continuity) | `shared_network_workspaces.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Execution-private skill profiles (`RuntimeSkillProfile`, `preparePrivateRuntimeSkills`, private skill discovery/adapters, Codex `skills/extraRoots` profile) | beta.1 `WorkspaceSkillMaterializer` per runtime profile | `skills.md` (Codex and Claude; Workspace collision policy); `shared_network_workspaces.md` (Configured skills) |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket, finalize per `RELEASE.md`, then release beta `v1.5.6-beta.4`.
- Notes: the docs change is in the delivery commit on `codex/workspace-skill-collision-fix`.
