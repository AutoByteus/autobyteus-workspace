# API-F-014 — Exact Execution-Key Is Rendered As A Sender Label

## Result

- API/E2E revision: `API-REV-021`
- Result: `Fail`
- Preliminary owner: `implementation_engineer`, subject to focused `code_reviewer` failure-origin review
- Affected requirements: `R-039`, `UC-021`, `AC-036`
- Triggering maintained scenario: `AgentTeamEventMonitor.vue > passes sender-id to member-name mapping to AgentEventMonitor`
- Current HEAD: `462db859d863670b37e78971ac8938e05b7b5a53`

## Current-contract validity

The stale test fixture was first rebuilt from the exact current frontend model:

- `rootTeam` and `memberNodesByAddress` own rooted topology;
- `agentExecutionsByKey` is keyed by `serializeTeamExecutionAddress(...)`;
- `focusedExecutionAddress` is the exact four-field current address;
- Professor and Student are distinct persistent Agent nodes with exact `/Professor` and `/sub-team/Student` addresses and exact AgentRun identities.

This shape agrees with `AgentTeamContext`, `agentTeamContextsStore`, task projection/hydration services, and the shared current test fixture. The expectation remains product-relevant: an inter-Agent event sender must be presented by its member display name rather than serialized execution identity syntax.

## Exact execution

Working directory:
`/Users/normy/autobyteus_org/autobyteus-worktrees/agent-team-hierarchical-handoffs/autobyteus-web`

Command:

```bash
pnpm test:nuxt --run \
  components/applications/setup/__tests__/ApplicationTeamLaunchProfileEditor.spec.ts \
  components/mobile/__tests__/MobileUxRefinement.spec.ts \
  components/workspace/config/__tests__/TeamRunConfigForm.spec.ts \
  components/workspace/running/__tests__/RunningTeamRow.spec.ts \
  components/workspace/team/__tests__/AgentTeamEventMonitor.spec.ts \
  components/workspace/team/__tests__/TeamCommunicationPanel.spec.ts
```

Result: `1 failed / 5 passed files`; `1 failed / 38 passed tests`.

The other five converted current-contract files pass. Only the sender-name projection fails.

## Expected versus observed

Expected:

```json
{
  "member_a111": "Professor",
  "member_b222": "Student"
}
```

Observed:

```json
{
  "member_a111": "Professor\",\"taskAgentRunId\":null}",
  "member_b222": "Student\",\"taskAgentRunId\":null}"
}
```

## Failure origin evidence

`useTeamMemberPresentation.getInterAgentSenderNameById` iterates `agentExecutionsByKey` but names its map key `memberAddress`. That key is actually serialized `TeamExecutionAddress` JSON. It then queries `memberNodesByAddress` with the serialized JSON, which cannot match canonical logical keys such as `/Professor`. The fallback sends the JSON key to `getRouteLeaf`, and splitting it on `/` produces the visible suffix `Professor\",\"taskAgentRunId\":null}`.

The production file has no API/E2E worktree diff. Correct behavior can be restored by parsing/retaining the exact execution address and using its canonical `memberAddress` to look up the rooted node/presentation. No route-key/path fallback or compatibility identity is required or acceptable.

## Stop decision

API-REV-021 stops before the remaining stale-fixture maintenance, production builds, disposable vault import, or real AutoByteus/Codex/Claude browser rows. A known current user-visible identity projection defect prevents an API/E2E Pass, and provider calls cannot resolve it. The incomplete `1 added / 30 updated / 0 removed` durable delta remains preserved and unreviewed for later resumption.

## Safety and cleanup

No server, frontend, database, vault, secret import, provider call, or browser context was created in API-REV-021. The user-held listeners on `60004` and `31004` remain running. The operational production database was not targeted or inspected. Both historical operational-database incident disclosures remain in force; no rollback or repair was attempted.

## Evidence

- `repository/web-broad-failures-batch1-after.log`
- `repository/api-f014-failure-origin-audit.log`
- `investigation/cumulative-durable-coverage-inventory.tsv`
- `investigation/cumulative-durable-diff.patch`
- `api-rev-021-evidence.sha256`
