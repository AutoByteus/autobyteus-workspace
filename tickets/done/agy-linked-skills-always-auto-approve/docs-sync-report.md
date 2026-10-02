# Docs Sync Report

## Scope

- Ticket: `agy-linked-skills-always-auto-approve` (task_size `Medium`, architectural_risk `High`, route: reviewed — ARCH-REV-001, CRR-001, API-REV-001, CRR-002 all Pass)
- Trigger: Delivery package from `code_reviewer` after CRR-002 (post-API/E2E test-code review Pass).
- Bootstrap base reference: `origin/personal` @ `84224a58d8975d0b016af340e6b48e51d715af78`
- Integrated base reference used for docs sync: `origin/personal` @ `314b5a976` (15 commits: context-compaction simplification + `v1.4.92-beta.7` release/delivery records), merged into ticket branch as `593baccad`.
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh" (server source tsc, 23 server unit files / 309 tests, 5 fake-CLI E2E files / 17 tests incl. E01–E08, 33 web spec files / 290 tests, web guards — all Pass).

## Why Docs Were Updated

- Summary: AGY no longer copies and per-file validates configured skills into its capsule. It links each resolved skill folder (one directory link per skill), using the same regular bindings as Codex, Claude and ACP. Unusable skills are skipped with a warning for `ALL_INSTALLED` agents and fail the run with a named reason for configured agents. Restore tolerates a vanished linked skill. AGY always runs with `--dangerously-skip-permissions`, and every web surface shows the auto-approve control on and locked for `antigravity_cli`.
- Why this should live in long-lived project docs: These are the runtime contracts for skill exposure, failure semantics, restore and approval. Operators and future engineers rely on the AGY runtime guide, the skills module doc and the web execution and remote-access docs for them. The previous text described the removed checked-snapshot materializer, the provenance/trust-root model and the editable AGY auto-approve. That text would now be false.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Primary AGY runtime contract | Updated (in change; verified on integrated state) | Capsule linker, strength-based failure handling, restore of missing-source links, always-on auto-approve |
| `autobyteus-server-ts/docs/modules/skills.md` | Binding/record shape and the AGY collision rule | Updated (in change; verified) | Removed origin/trust-root/detailed resolver text; AGY collision `fail` → `AgentCreationError` |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Cross-runtime skill-binding paragraph; also changed by base (compaction) | Updated (in change; merged clean with base edits; verified) | Provenance/snapshot paragraph replaced with link-into-capsule statement |
| `autobyteus-web/docs/agent_execution_architecture.md` | AGY auto-approve frontend behavior; also changed by base | Updated (in change; merged clean; verified) | Locked-on control via `isAutoApproveLockedForRuntime` |
| `autobyteus-web/docs/remote_access.md` | Mobile Auto approve tools behavior for AGY | Updated (in change; verified) | Locked-on for `antigravity_cli` |
| Other `autobyteus-server-ts/docs/**`, `autobyteus-web/docs/**` | Stale-term scan on the integrated state (`certified_absent`, `resolveInstalledRecordDetailed`, `…BindingsForAgentDetailed`, `AGY_SKILL_NAME_COLLISION`, skill materializer, trust root/provenance, AGY "explicit off" approval) | No change | No remaining stale references. "fingerprint" hits are unrelated (LLM management, memory sync, work traces) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/antigravity_cli_runtime.md` | Behavior rewrite | Checked snapshot copy → directory link per skill. `prefer_workspace` skip-with-warning vs `fail` `AgentCreationError`. Restore drops a dangling link with `skipped-missing-source`. Always skip-permissions | Final implemented behavior (REQ-001..006) |
| `autobyteus-server-ts/docs/modules/skills.md` | Model simplification | Record and binding no longer carry origin/roots; the detailed resolver is removed; AGY collision wording updated | Removed components |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Paragraph replacement | AGY links resolved folders into its private capsule | Removed provenance snapshot |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior update | AGY control locked on; submits `autoExecuteTools: true` | REQ-004 |
| `autobyteus-web/docs/remote_access.md` | Behavior update | Mobile option locked on for AGY | REQ-004 |

All five doc edits were authored in the implementation commit `e5edfafdf`. Delivery verified them against the integrated state and made no additional doc edits.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| AGY skill exposure | One directory link per skill in `<capsule>/.agents/skills/<name>`. Only the existence of the folder and its `SKILL.md` is checked. Folder content (`.venv`, large files, outside links) does not affect start | design-spec.md, investigation-notes.md | antigravity_cli_runtime.md |
| Request-strength failure semantics | `ALL_INSTALLED` skips with `skipped-unusable`/`skipped-workspace-owned`. Configured agents fail with a named `AgentCreationError` | requirements-doc.md (REQ-003, REQ-006) | antigravity_cli_runtime.md, skills.md |
| Restore | A vanished linked skill is dropped with a warning (`skipped-missing-source`). Legacy copied capsules still restore | requirements-doc.md (AC-008, AC-009) | antigravity_cli_runtime.md |
| Always auto-approve | Server always passes skip-permissions and requires `permission_mode: always-proceed`. The web locks the control on | requirements-doc.md (REQ-004, DEC) | antigravity_cli_runtime.md, web docs |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `capsule/agy-configured-skill-materializer.ts` (checked file snapshot copy) | `capsule/agy-configured-skill-linker.ts` (directory link) | antigravity_cli_runtime.md |
| `ConfiguredAgentSkillResolver.resolveInstalledRecordDetailed` / `resolveConfiguredSkillBindingsForAgentDetailed`, `certified_absent`, `name_mismatch` | Regular `resolveConfiguredSkillBindingsForAgent` bindings (`resolved`/`unresolved`) | skills.md |
| Record/binding provenance (`origin`, trusted/configured roots), `configured-skill-source-fingerprint.ts` | None (not needed for linking) | skills.md, agent_execution.md |
| `AGY_SKILL_NAME_COLLISION` for `fail` | `AgentCreationError` naming the skill and reason | skills.md, antigravity_cli_runtime.md |
| Editable AGY auto-approve with an explicit off choice | Locked-on control (`isAutoApproveLockedForRuntime`) | web agent_execution_architecture.md, remote_access.md |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: Write the handoff summary and release notes, then hold for explicit user verification.
- Notes: Out-of-scope items raised during API/E2E are not doc issues: mobile Chat stuck on "Opening conversation…", and `agy-mcp-team-live.test.ts:66` writing to an archived ticket path. They are listed as follow-up candidates in handoff-summary.md.
