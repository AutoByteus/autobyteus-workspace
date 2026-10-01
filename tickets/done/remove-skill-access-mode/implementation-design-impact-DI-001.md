# Implementation Design Impact — DI-001

- Package: `remove-skill-access-mode`
- Raised by: `/implementation_engineer`, 2026-09-30
- Against: `design-spec.md` SR-004, reviewed `ARCH-REV-002` (Pass)
- Classification: `Design Impact` (design escalation trigger: a released migration's accept/reject behavior would change)
- Carried classification: `task_size=Large`, `architectural_risk=High` (unchanged)
- Implementation state: no source changes made. The worktree holds only the ticket documents (plus an ignored `pnpm install`).

## Finding

The released migration `20260814_team_run_execution_tree_v1` depends on the **current runtime class** `TeamRunConfig` as a value, not only on current types. The design's step 1 freezes types and the enum literal only, so step 2 would change this migration's behavior.

## Path

All paths under `autobyteus-server-ts/src/`.

1. `app-data-migrations/migrations/team-run-execution-tree-v1/team-run-execution-tree-v1-app-data-migration.ts:273` calls `planPredecessorTeamRunV1Package`.
2. `.../team-run-execution-tree-v1/predecessor-team-run-planner.ts:109` runs `new TeamRunConfig({ rootTeam: materializeMigrationTeam(metadata.rootTeam), … })`.
3. `agent-team-execution/domain/team-run-config.ts` — the constructor calls `cloneTeamRunNode`, which builds each node and each `defaultLaunchConfiguration` from an explicit list of keys (`cloneAgentLaunchConfiguration`). Keys it does not name are dropped.
4. `.../team-run-execution-tree-v1/team-run-execution-tree-v1-builder.ts:24` reads `node.skillAccessMode` from `config.rootTeam.children` and writes it into the V1 `launchConfiguration`.
5. The same builder then calls `validateTeamRunExecutionTreePayload` (`team-run-execution-tree-v1-schema.ts:76-91`), which requires the exact key and a supported value.

Once step 2 removes `skillAccessMode` from `cloneTeamRunNode` / `cloneAgentLaunchConfiguration`, step 4 reads `undefined` and step 5 throws `…skillAccessMode is unsupported.` for every predecessor team run. An install upgrading from a pre-`20260814` version would fail that migration for all team history.

## Evidence

- Code reading of the five locations above.
- Throwaway probe (not kept): constructing `TeamRunConfig` with an extra `unlistedKey` on the agent node and on the launch configuration. Result keys were exactly the thirteen node keys and six launch keys named in `cloneTeamRunNode` / `cloneAgentLaunchConfiguration`; `unlistedKey` was dropped. `pnpm exec vitest run` — 1 passed.
- `TeamRunConfig` is also where this migration gets its structural rejections (exactly one direct coordinator, direct-child addresses, canonical addresses, duplicate child names, required ids). Those are part of the migration's accept/reject behavior.

## Why the design does not cover it

- AF-003 lists `predecessor-team-run-planner.ts` as importing the current `AgentLaunchConfiguration` **type** and does not list `team-run-execution-tree-v1-builder.ts` at all. Neither entry mentions the `TeamRunConfig` class.
- The file mapping says `team-run-execution-tree-v1/*` only swaps the enum import, and the planner "builds launch config as released type".
- The design states "one new file only" (`legacy/released-skill-access-mode.ts`).

Typing the planner's launch configuration as `ReleasedAgentLaunchConfiguration` does not help: the value still passes through the current class and loses the field.

## Scope of the problem

Checked every other file under `app-data-migrations/` that references the field or current team-run config:

| File(s) | Depends on current code for the field? |
| --- | --- |
| `legacy/team-run-metadata-schema.ts` | No. Own validator and own `cloneTeamRunMetadataNode`; needs frozen types and literal only, as designed. |
| `migrations/team-run-member-tree-prerequisite-converter.ts`, `predecessor-team-metadata-converter.ts` | No. Literal swap only, as designed. |
| `migrations/team-run-execution-tree-v2-app-data-migration.ts` | No. Types only; validates with the frozen V2 schema and writes through the atomic file writer, as designed. |
| `migrations/remove-global-skill-discovery-mode-migration.ts` | No. Literal swap only. |
| `migrations/agent-org-flat-team-families-v1/*` | No reference to the field or to `team-run-config`. |
| `team-run-execution-tree-v1/{predecessor-team-run-planner,team-run-execution-tree-v1-builder}.ts` | **Yes** — this finding. These are the only two `TeamRunConfig` value users under `app-data-migrations/`. |

## Options for the designer

1. **Frozen copy of the aggregate** (my recommendation). Add a migration-owned released copy of the team-run node model and its clone/validation logic as released — `TeamRunAgentNode`, `TeamRunAgentTeamNode`, `cloneAgentLaunchConfiguration`, `cloneTeamRunNode` and the `TeamRunConfig` constructor checks, about 110 lines — under `legacy/`, including `skillAccessMode`. Planner and builder use it instead of the current class. It follows the design's own rule (released shapes are standalone copies in `legacy/`) and guideline §4, and keeps accept/reject behavior identical. Cost: a second new file, and frozen behavior rather than frozen types only. It would also let `legacy/team-run-metadata-types.ts` take its released node types from the same copy.
2. **Carry the field around the current class.** Keep `new TeamRunConfig` for the structural checks and have the builder read `skillAccessMode` from the legacy metadata by address. Smaller, but the released migration stays coupled to the current class, so any later change to `TeamRunConfig` validation would change its behavior again.

Either choice needs a decision on the builder's input type (`buildInitialTeamRunExecutionTree({ config: TeamRunConfig })`) and an update to AF-003, the file mapping, the "one new file" statement and the frozen-validator equivalence test list (add: V1 planner output still contains the field and passes the V1 schema; the structural rejections still reject).

## Not affected

Steps 3–6 and 8 of the change sequence (autobyteus-ts, contract packages, web, built-in agents, docs) do not depend on this decision. I have not started them, so the package stays in one consistent state while the design is revised.
