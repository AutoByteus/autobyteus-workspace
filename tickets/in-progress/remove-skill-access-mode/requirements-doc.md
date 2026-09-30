# Requirements Document

## Document Status

- Status: `Approved`
- Current solution revision ID: `SR-003`
- Package identifier: `remove-skill-access-mode`
- Request / ticket: Remove the vestigial run-level `skillAccessMode` (`PRELOADED_ONLY` | `NONE`) setting
- Requirements owner: Solution Designer
- Date: 2026-09-30
- Approval state and reference: SR-001 baseline (REQ-001..004, AC-001..005) approved by user 2026-09-30 ("yesss. the value is simply ignored ... future ones will not write that value anymore ... natural progressing"). REQ-005 requested by user 2026-09-30 ("update the daily assistant with read file in the agent config as well"); DEC-001 superseded by DEC-002 (overwrite on every startup), user 2026-09-30: "every app's startup is fine ... the internal one will override ... that's a simple rule".
- Exact approved requirements baseline / solution revision: SR-003 (REQ-001..006, AC-001..007)
- Behavior-defining supplements and their approved versions: None

## Problem And Desired Outcome

- Problem: A run-level `skillAccessMode` setting (`PRELOADED_ONLY` | `NONE`) is threaded through autobyteus-ts, the server, all runtime backends, GraphQL, the web app, stream/SDK contracts and persisted run history. It is a leftover of the removed three-value mode (`GLOBAL_DISCOVERY` removed in `a95fd695e`). Every product launch path hardcodes `PRELOADED_ONLY`; nothing in the product produces `NONE`. The name also misleadingly suggests that SKILL.md bodies are preloaded, which they are not.
- Affected actors or systems: every agent/team run on every runtime (AutoByteus, Codex, Claude, ACP, Antigravity); web launch/config/history; application SDK consumers; run-history persistence.
- Desired outcome: The agent definition (`skillScope` + `skillNames`) is the single source of truth for which skills a run has. Every effective configured skill is always exposed (AutoByteus: catalog entry in the system prompt; other runtimes: their existing skill materialization). The run-level setting no longer exists anywhere.
- Observable definition of success: no `skillAccessMode` / `SkillAccessMode` / `skill_access_mode` in production source, contracts, GraphQL schema or newly written persisted data; existing history still loads; skill exposure for all product launches is unchanged.

## Relevant Current And Desired Behavior

| Behavior ID | Kind | Related Scenario IDs | Evidence-Backed Current Behavior | Desired Behavior | Intentionally Preserved Behavior | Investigation Evidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | System | SCN-001 | AutoByteus runtime appends a catalog (name, description, SKILL.md path) of effective configured skills unless mode is `NONE`. | Catalog is appended whenever the agent has effective configured skills; no mode check. | Catalog-only format; agent reads SKILL.md on demand; no catalog when no effective skills. | `append-configured-skills-catalog.ts`; `docs/skills_design.md` |
| BEH-002 | System | SCN-001 | Codex / Claude / ACP / Antigravity skip skill materialization when mode is `NONE`. | Always materialize the effective configured skills. | Existing materialization, collision policy and `ALL_INSTALLED` resolution. | `workspace-skill-materializer.ts`, `codex-thread-bootstrapper.ts`, `claude-session-bootstrapper.ts`, `acp-agent-run-backend-factory.ts`, `agy-agent-run-backend-factory.ts` |
| BEH-003 | User | SCN-001, SCN-002 | Web launch, chat, team/agent-team config and history hydration carry `skillAccessMode`, always `PRELOADED_ONLY`; no UI control exists. | No such field in web types, stores, forms, GraphQL queries or launch payloads. | All launch/edit/restore flows otherwise unchanged. | web grep inventory in investigation notes |
| BEH-004 | Contract | SCN-003 | GraphQL run inputs/outputs, application SDK (`ApplicationSkillAccessMode`), collaboration/team stream DTOs expose the field. | Field and type removed from these contracts. | All other contract fields unchanged. | `api/graphql/types/*`, `application-sdk-contracts`, `application-backend-sdk/launch-profile.ts`, stream-contract DTOs |
| BEH-006 | System | SCN-001, SCN-005 | Daily Assistant template has `run_bash` but no `read_file`; it is seeded only when files are missing, so existing installs never receive template improvements (observed: user's copy still has a prompt paragraph removed in `74b68c748`). | Template includes `read_file`; Daily Assistant files (`agent.md`, `agent-config.json`, `skills/`) are replaced from the template on every server startup, like the other built-in agents. | Other template tools; `ALL_INSTALLED` skill scope; memory compactor / skill improver overwrite behavior; Chat last-used model preference. | `built-in-agents/templates/daily-assistant/agent-config.json`, `built-in-agent-registry.ts` |
| BEH-005 | System | SCN-002 | Persisted agent run metadata and team/agent-org execution-tree records store `skillAccessMode`; tree reader requires the key. | New records do not store it; existing records that contain it still load and restore. | All other persisted history content and restore behavior. | `agent-run-metadata-store.ts`, `run-execution-tree-shared-record-schemas.ts` |

## Scope Guardrail (Mandatory)

### In-Scope Use Cases

- UC-001: Launch/restore any agent or team run; skills come solely from the agent definition.
- UC-002: Load existing run history written with the old field.
- UC-003: Application SDK / GraphQL launch contracts without the field.
- UC-004: Built-in agent startup sync (Daily Assistant becomes overwrite).

### Out Of Scope

- Changing `skillScope` / `skillNames` semantics, the catalog wording, or the runtimes' materialization mechanics.
- Tool changes to any agent other than Daily Assistant.
- A read-only/"built-in" indication in the agent editor (separate UI ticket candidate).
- Rewriting historical ticket documents or already-applied migration logic beyond what is needed to compile.

### Non-Goals

- No replacement run-level "no skills" switch. "No skills" is expressed by the definition.

### Preserved Behavior Boundary

BEH-001..BEH-005 preserved columns; AC-003, AC-004.

### Review Authority

Standard: blocking findings must cite a REQ/AC/BEH ID; scope-expanding proposals are Requirement Gaps needing user approval.

## Requirements

| Requirement ID | Requirement | Related Behavior IDs | Priority | Rationale | Source |
| --- | --- | --- | --- | --- | --- |
| REQ-001 | The run-level skill access mode concept is removed from all production code, contracts and schemas (autobyteus-ts, server, runtimes, GraphQL, web, SDK/stream contracts, docs). | BEH-001..005 | Must | Vestigial; single source of truth is the agent definition. | User, 2026-09-30 |
| REQ-002 | Every run exposes exactly the effective configured skills of its agent definition on every runtime, with no run-level override. | BEH-001, BEH-002 | Must | "All configured skills obviously shown in the catalog." | User, 2026-09-30 |
| REQ-003 | Existing persisted run history containing the old field (either value) still lists, loads and restores; the old value is ignored. | BEH-005 | Must | Data continuity. | Data continuity |
| REQ-004 | Newly written persisted records do not contain the field. | BEH-005 | Should | Clean cut. | REQ-001 |
| REQ-006 | All built-in agents, including Daily Assistant, are platform-owned: their definition files are replaced from the shipped template on every server startup. Edits saved to a built-in agent do not persist across restart. No copy-if-missing policy remains. | BEH-006 | Must | One simple rule; every install receives template improvements. | User, 2026-09-30 (DEC-002) |
| REQ-005 | The built-in Daily Assistant definition includes the `read_file` tool so it can read cataloged SKILL.md files directly. Reaches every install through REQ-006. | BEH-006 | Must | Skills catalog instructs agents to read SKILL.md; Daily Assistant had only `run_bash`. | User, 2026-09-30 |

## Acceptance Criteria

| AC ID | REQ | BEH / SCN | Trigger | Expected Outcome | Alternate / Failure | Verification |
| --- | --- | --- | --- | --- | --- | --- |
| AC-001 | REQ-001 | BEH-001..005 | Source search | No `skillAccessMode` / `SkillAccessMode` / `skill_access_mode` in production source, GraphQL schema, SDK/stream contracts or current docs (historical migration code may reference legacy shapes only where needed to read old data). | — | grep + typecheck |
| AC-002 | REQ-002 | SCN-001 | Launch AutoByteus agent with configured skills; launch Daily Assistant (`ALL_INSTALLED`) | System prompt contains catalog of exactly the effective skills; agent with none gets no catalog. | — | unit/integration |
| AC-003 | REQ-002 | SCN-001 | Launch Codex / Claude / ACP / Antigravity agent with configured skills | Skills materialized exactly as today for `PRELOADED_ONLY`. | — | existing runtime tests updated |
| AC-004 | REQ-003 | SCN-002 | Open/restore an agent run, team run and agent-team run saved with `skillAccessMode` (`PRELOADED_ONLY` or `NONE`) | Loads and restores without error; skills come from the definition. | — | persisted-fixture tests |
| AC-006 | REQ-005 | BEH-006 | Fresh install (no Daily Assistant on disk) → startup seeds it | Seeded `agent-config.json` `toolNames` includes `read_file`; a Daily Assistant run can call `read_file` on a cataloged SKILL.md path. | Existing install: replaced from template (AC-007). | template/seed test |
| AC-007 | REQ-006 | BEH-006 / SCN-005 | App-data Daily Assistant files exist and differ from the template (edited or older version) → server startup | Files equal the shipped template afterwards (incl. `read_file`); definition resolves normally. | Missing files are created from the template. | bootstrapper unit test + smoke script |
| AC-005 | REQ-004 | SCN-001 | Create a new run | Persisted metadata/tree records contain no such field. | — | store tests |

## Relevant Scenarios And Journeys

| Scenario ID | Kind | Actor | Goal | Trigger | Start | Steps | Outcome | Alt/Error | Validity | Evidence | REQ/AC |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SCN-001 | User | User | Run an agent/team with its skills | Web launch / chat / team launch | Definition with skills | Launch → runtime bootstraps | Effective skills exposed | Definition with no skills → none | Supported Normal | Launch paths hardcode `PRELOADED_ONLY` | REQ-001/002, AC-002/003/005 |
| SCN-002 | User | User | Reopen past runs | History panel / restore | History saved with old field | Open → restore | Works as before | — | Supported Normal | run-history stores | REQ-003, AC-004 |
| SCN-003 | Contract | Application developer | Launch agent/team from an application | Application SDK launch | App backend | `buildEffective*RunLaunch` → server | Run launches with definition skills | — | Supported Normal | bundled apps don't set the field | REQ-001, AC-001 |
| SCN-005 | System | App startup | Keep built-in agents current | Server startup | Any app-data state of a built-in agent | Startup syncs template → app data | Built-in agent equals shipped template | — | Supported Normal | `built-in-agent-bootstrapper.ts` overwrite policy | REQ-005/006, AC-006/007 |
| SCN-004 | Contract | API caller | Request `NONE` | GraphQL/SDK input | — | — | Not supported after change | — | Technically Possible but Unsupported/Contrived (no product flow produces `NONE`) | investigation | — |

## UI, Interaction, And Experience Requirements

- Applicable: `No` (no UI control exists today). Prototype fields: N/A — not applicable.

## Data Continuity And Acceptable Loss

- Persisted data affected: `Yes` — agent run metadata, team/agent-org execution-tree records.
- Must preserve: all history remains listable/loadable/restorable.
- Acceptable loss: the stored `skillAccessMode` value itself (including any legacy `NONE`) is dropped/ignored.
- Mechanism: tolerant read, no data migration (user-approved SR-001; consistent with Data Migration Guideline §3).
- Daily Assistant app-data files: user edits are intentionally discarded at startup (DEC-002).

## External Contracts And Dependencies

| Contract | Constraint | Evidence | Risk |
| --- | --- | --- | --- |
| `@autobyteus/application-sdk-contracts` / `application-backend-sdk` 0.1.0 | Field and `ApplicationSkillAccessMode` removed | Not on npm; bundled apps use `workspace:*` and don't set it | Externally built app bundles setting it: field ignored or rejected (architecture to confirm transport behavior) |
| GraphQL schema | Field/enum removed | `api/graphql/types/*` | Web `generated/graphql.ts` regenerated |

## Assumptions

| ID | Assumption | Status |
| --- | --- | --- |
| ASM-001 | No supported product flow relies on `NONE`. | Verified by source inventory |

## Open Decisions And Questions

| ID | Question | Why It Matters | Options | Owner | Status |
| --- | --- | --- | --- | --- | --- |
| DEC-002 | Sync rule for Daily Assistant | Users who never edit it never receive improvements under copy-if-missing | A: overwrite on every startup (existing rule). B: overwrite only on new version. C: update-if-untouched. | User | Resolved 2026-09-30: A. Accepted consequence: edits made in the agent editor revert at next startup; no read-only editor flag in this ticket (separate UI ticket candidate). |
| DEC-001 | Should existing installs' Daily Assistant also get `read_file`? | Daily Assistant is `seedIfMissing` (user-editable); a template change reaches only fresh installs. | (a) New installs only — natural progression; users can add it in the agent editor. (b) One-time startup migration adding `read_file` to existing Daily Assistant configs when absent. | User | Superseded by DEC-002. Earlier: (a). User accepted the seed-if-missing flow ("So basically we actually copied to the app data. Good.") after (a) was recommended; existing app-data copies remain user-owned. |

## Traceability

| REQ | UC | BEH | AC | SCN |
| --- | --- | --- | --- | --- |
| REQ-001 | UC-001, UC-003 | BEH-001..005 | AC-001 | SCN-001, SCN-003 |
| REQ-002 | UC-001 | BEH-001, BEH-002 | AC-002, AC-003 | SCN-001 |
| REQ-003 | UC-002 | BEH-005 | AC-004 | SCN-002 |
| REQ-004 | UC-001 | BEH-005 | AC-005 | SCN-001 |
| REQ-005 | UC-001 | BEH-006 | AC-006 | SCN-001 |
| REQ-006 | UC-004 | BEH-006 | AC-007 | SCN-005 |

## Architecture Phase Input

- Verify repo migration conventions (precedents: `remove-global-skill-discovery-mode-migration.ts`, `remove-self-evolution-run-metadata-migration.ts`) and choose tolerant-read vs. migration.
- Execution-tree reader currently `requireKeys` the field — must stop requiring it.
- Decide handling of legacy migrations/schemas that reference `SkillAccessMode` once the enum is deleted.

## Readiness Check

- Content ready for user approval: `Yes`
- User approval received: `Yes` (SR-001; SR-002 REQ-005; SR-003 REQ-006 / DEC-002 — all user 2026-09-30)
