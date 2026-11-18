# Handoff Summary: left-panel-follow-ups (autobyteus-388)

- Status: verified from the evidence (audited, not redone), archived and finalized on `personal`. **No release** (AC-004).
- Classification: `task_size=Small`, `architectural_risk=Low`, direct route; no test-code review. API/E2E API-REV-002 Pass, 94%.

## What Changed

- DEC-001: the web's unused `CreateAgentRun` document is removed (`ee1178617c`).
- DEC-002: `WorkspaceAgentRunsTreePanel` is renamed `RunSectionPanel` (`2903fba48a`).
- DEC-003 and SR-002: an open Projects view notices a run added or removed by anyone (another window or client, a Task Agent, the API) within one poll. It re-reads its Projects when the set of root runs changes, and its 5 s poll reads every run. With the view hidden, no Project reads happen (`00339421ed`, `1112f13de1`).

## Integration

- Already current with `origin/personal` @ `d6bcff577b`. No new base commits, so no rerun.

## Verification (audit of the evidence)

- AC-001:
  - `git grep` shows the web's document and operation types (`CreateAgentRunMutation`, `CreateAgentRunDocument`, the hook) gone; they were on the base.
  - The `CreateAgentRunResult` and `MutationCreateAgentRunArgs` still in `generated/graphql.ts` are schema types that codegen emits for every server mutation (125 `Mutation…Args` types). They stay while the server keeps `createAgentRun`, which AC-001 itself keeps. The criterion's wording ("only `CreateAgentRunInput`") is narrower than codegen's output; its intent is met.
  - IMP-04 shows codegen current. `API-02-server-createAgentRun.log` exits 0.
- AC-002: no `WorkspaceAgentRunsTreePanel` outside `tickets/`. Web suite 5,168 (IMP-09); typecheck and guards (IMP-10); PLN-10 (zh-CN).
- AC-003: `IMP-11-pln-sr002/evidence.json` shows PLN-01…11 Pass.
  - A run started elsewhere is listed in about 4 s, and its archive unlists in about 5 s.
  - An archive of a run older than the 6 newest re-reads (round 1's failure).
  - Hidden view: 0 reads.
  - PLN-11 fails on SR-001's host (IMP-12).
- New risk, API-06: the uncapped 5 s poll is p50 158 / p95 195 ms against the 250 ms budget (40 agent, 200 team and 10 org runs).
- AC-004: the fresh-start unsigned build (`API-05-fresh-start.log`): typecheck PASS at the 99 baseline, `.dmg` built. Signing happens only on the runners.
- No user check is needed.

## Note

- Workspaces → Projects reads each shown Project once more per switch. This is bounded and not a criterion.

## Release

- None (AC-004). It will ship in the next beta the user asks for.
