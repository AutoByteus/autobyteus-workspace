# Investigation Notes

## Investigation Meta

- Package identifier: `settings-delegated-row-display-name` (Project Task `autobyteus-208`)
- Request / ticket: autobyteus-208 (follow-up 1 of the autobyteus-197 code reviews)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/settings-delegated-row-display-name`
- Repository mode: `Git`
- Task worktree / branch: the workspace root, branch `fix/settings-delegated-row-display-name`
- Resolved base: `origin/personal` @ `1138e8fbefadeb3b30fdb88eb4a5a09beaf372ea` (fetched 2026-10-24)
- Finalization target: `origin/personal`
- Bootstrap result: `pnpm install --frozen-lockfile`, `pnpm -C autobyteus-web exec nuxi prepare`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-24): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; design gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md`, `autobyteus-web/AGENTS.md`
- Investigation status: complete

## Initial Request And Clarifications

- Original request: Task autobyteus-208 (see requirements doc).
- Clarifications: bundled with autobyteus-265, -238, -232 (independent). "A user-visible change ships with the next release"; no release in this ticket.

## Source Log

| Date | Type | Source | Why | Finding | ID |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Code | `autobyteus-web/utils/runSettings/delegatedLaunchRows.ts:72,175,180` | Settings rows | `nameAt` = last address segment; used for agent and Team rows of every root | E-01 |
| 2026-10-24 | Code | `autobyteus-web/services/teamExecution/teamExecutionTreeSelectors.ts:27-30,97-99`; `teamExecutionContextFactory.ts:67-70` | Team sidebar and contexts | `readsAsDisplayName(tree, address)` ? `memberDisplayName` : `memberAddressBasename`, written out twice | E-02 |
| 2026-10-24 | Code | `services/agentOrgExecution/agentOrgContextHydration.ts:53,121`, `agentOrgMemberContextFactory.ts:28,43`, `utils/agentOrgHistoryRows.ts:259`, `components/workspace/history/WorkspaceAgentOrgHistoryCollection.vue:237`; `services/agentCollaboration/agentRunCollaborationContext.ts:50,299,320` | Org and Agent naming | `memberDisplayName` for every agent and copy | E-03 |
| 2026-10-24 | Code | `autobyteus-web/tests/e2e/delegated-copy-own-file-cases.mjs:7-12,243-249` | Stale header | Header claims '"+" from each copy prefills its own model'; the case checks each agent's Team context (model; all named "worker") | E-04 |
| 2026-10-24 | Doc | `/Users/normy/autobyteus_org/autobyteus-web-design` Markdown, searched for `scribe_`, "address basename", delegated-copy naming in Settings | Product records | No spec names the old form | E-05 |
| 2026-10-24 | Code | `components/workspace/config/ExistingRunConfigEditor.vue:252-270` | Callers | Team → `teamDelegatedLaunchNodes(executionTree, …)`; Org/Agent → `collaborationDelegatedLaunchNodes` | E-06 |
| 2026-10-24 | Doc | `autobyteus-web/docs/settings.md:1319-1343` ("Delegated copies"), `docs/agent_teams.md:317-319` | Docs | Settings docs do not state the row name; agent_teams.md states the Team rule | E-07 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Trigger | Path | Outcome | Evidence | Confidence |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Team run Settings | editor → `teamDelegatedLaunchNodes` → `nameAt` | `scribe_5083` vs sidebar `scribe 5083` | E-01, E-02, SD-01 | Reproduced |
| BEH-002 | User | Org/Agent run Settings | editor → `collaborationDelegatedLaunchNodes` → `nameAt` | basename vs `memberDisplayName` | E-01, E-03, SD-01 | Reproduced |
| BEH-003 | Operational | — | probe header | stale claim | E-04 | Read |

## Relevant Codebase And Technical Facts

| Path | Responsibility | Implication | Design Implication |
| --- | --- | --- | --- |
| `delegatedLaunchRows.ts` builders | Row construction for both casings | Needs the root's naming function | Pass a `nameOf(address)` into `builders` |
| `teamExecutionTreeSelectors.ts` | Team tree selectors, owns `readsAsDisplayName` | Natural owner of the full Team name rule | Export one function |

## Structural And Payload Surface Inventory

- Structural: three web files and their specs; one probe comment; one docs sentence. No API/persistence.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Implication | Evidence |
| --- | --- | --- | --- | --- | --- |
| SD-01: `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run utils/runSettings/__tests__/zz-probe-delegated-row-names.spec.ts` on base 1138e8fbef | SCN-001/002 | Team: `/scribe_5083` row `scribe_5083` (sidebar rule: `scribe 5083`); configured copy `code_reviewer` matches. Org/Agent: `scribe_5083` vs `scribe 5083` | Reproduced | BEH-001, BEH-002 | `evidence/SD-01-repro-base.log` |

- Temporary diagnostics: none (the probe spec was moved out of the test tree into evidence).
- Reproduction for implementation to start from: `evidence/repro-delegated-row-names.spec.ts`. Copy it into `autobyteus-web/utils/runSettings/__tests__/`, run as SD-01. It fails on base.

## Persisted Data And State Facts

- Not affected.

## Product Design Request Context

- `Not stated`. The Task says the design repository's Settings baseline is unchanged (a name fix only); E-05.

## Supplemental Artifact Inventory

| Artifact | Owner | Purpose | Scope | Related IDs | Status | Approval |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro-delegated-row-names.spec.ts` | Solution Designer | Reproduction | SCN-001/002 | AC-001/002 | Current | Evidence |
| `evidence/SD-01-repro-base.log` | Solution Designer | Output | — | — | Current | Evidence |

## Assumptions, Unknowns, And Risks

None material.

## Architecture Investigation Findings

- The Team name rule is written out in two places (E-02); a Settings fix that writes it a third time would add duplication. Extract one owner.

## Requirement Implications

- Root-specific rule; preserve basename for configured-member copies in Team runs.

## Notes For Architecture Design

- `builders(deps, control, rule, nameOf)`.
