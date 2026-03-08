# Future-State Runtime Call Stack

## UC-001 Edit Imported Agent Definition

1. UI loads imported agent from `agentDefinitions`.
2. User edits fields and submits `updateAgentDefinition`.
3. GraphQL resolver forwards to `AgentDefinitionService.updateAgentDefinition`.
4. Provider resolves the agent’s actual source path using the same ordered roots as reads.
5. Provider verifies the resolved source directory is writable.
6. Provider writes `agent.md` and `agent-config.json` back into that resolved source directory.
7. Provider re-reads the updated definition and returns it.

## UC-002 Edit Imported Agent Team Definition

1. UI submits `updateAgentTeamDefinition`.
2. GraphQL resolver forwards to `AgentTeamDefinitionService.updateDefinition`.
3. Provider resolves the team’s actual source path across read roots.
4. Provider verifies writability and writes back to the resolved team directory.
5. Updated team definition is re-read and returned.

## UC-003 Discover Bundled Skills From Definition Sources

1. Skill service builds its effective source list.
2. Service scans:
   - default standalone skills dir
   - additional standalone skill dirs
   - default definition root for `agents/*/SKILL.md`
   - additional definition roots for `agents/*/SKILL.md`
3. Matching agent folders load as skills.
4. First-hit name precedence is preserved.

## UC-004 Resolve Explicit Skill For Imported Agent Run

1. Agent definition provider reads `agent-config.json`.
2. Provider exposes only the explicit `skillNames` from config.
3. Agent run manager resolves those `skillNames` through `SkillService.getSkill`.
4. A bundled skill path is attached only when its name was explicitly configured.
