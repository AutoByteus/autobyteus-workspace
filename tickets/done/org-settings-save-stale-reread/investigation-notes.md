# Investigation Notes

## Investigation Meta

- Package identifier: `org-settings-save-stale-reread` (Project Task `autobyteus-265`)
- Request / ticket: autobyteus-265 (FU-005 of autobyteus-205)
- Workspace root: `/Users/normy/autobyteus_org/autobyteus-worktrees/org-settings-save-stale-reread`
- Repository mode: `Git`
- Task worktree / branch: the workspace root above, branch `fix/org-settings-save-stale-reread`
- Resolved base remote / branch / revision: `origin/personal` @ `1138e8fbefadeb3b30fdb88eb4a5a09beaf372ea` (fetched 2026-10-24)
- Finalization target remote / branch: `origin/personal`
- Bootstrap result: worktree created from the refreshed `origin/personal`; `pnpm install --frozen-lockfile`, `nuxi prepare` in `autobyteus-web`
- Bootstrap blocker: none
- Current solution revision ID: `SR-001`
- Authorities read (2026-10-24): `references/requirements-engineering.md`, `references/finding-the-cause.md`, `references/ticket-scope.md`, `references/handoff.md`; design gate: `references/architecture-design.md`, `references/design-principles.md`, `DESIGN.md`, `TESTING.md` (layers, rerun, environments), `autobyteus-web/AGENTS.md`
- Investigation status: complete

## Initial Request And Clarifications

- Original request: Task autobyteus-265 (see requirements doc). "Find why the stream reconnects after every Save (is the reconnect itself the defect, or only the stale-read handling?), and make the page show the saved model without a manual refresh."
- Clarifications received: the Project Task Manager bundled autobyteus-265, -238, -232 and -208. They are independent; reproduce each first; finalize each to personal; no release.
- User-supplied facts: FU-005 row and evidence of autobyteus-205 (archived under `tickets/done/remove-skill-improvement/evidence/`).

## Product And Domain Understanding

- Product area: Run Settings of a running Org: delegated copies' rows (model choice of stopped copies).
- Relevant terminology: *copy*, a delegated execution started by `delegate_task`; *canonical settings*, the server's stored run configuration, read through `AgentOrgRunConfig`; *checkpointed reload*, the Org stream's reconnect to obtain a new view snapshot.

## Source Log

| Date | Source Type | Exact Source / Command / Query | Why Consulted | Relevant Finding | Follow-Up |
| --- | --- | --- | --- | --- | --- |
| 2026-10-24 | Data | `tickets/done/remove-skill-improvement/evidence/API-18-fu005-base-vs-ticket.txt`, `API-15-r2-org-save-reread-cause.txt` (origin/personal) | Prior measurement | Base 3b2c86ca9e: 12 of 12 Saves followed by CONNECTED + ROOT_EXECUTION_VIEW_SNAPSHOT within 3 s; 4 of 12 re-reads stale. A `ROOT_EXECUTION_EVENT` arrives just before the Save response, then CONNECTED, snapshot, and the stale error ~20 ms later | E-01 |
| 2026-10-24 | Code | `autobyteus-server-ts/src/agent-org-execution/domain/agent-org-run.ts:148,200-205` | What the live Save publishes | Live Org Save runs `delegatedLaunches.update`, which publishes `delegated_launch_selections_changed` | E-02 |
| 2026-10-24 | Code | `autobyteus-web/services/agentOrgExecution/agentOrgExecutionContext.ts:268-273` | How the Org view applies the event | Returns `checkpoint_required` ("reload so the records and the member contexts show the choice") | E-03 |
| 2026-10-24 | Code | `autobyteus-web/services/agentOrgExecution/agentOrgStreamingService.ts:339, 134-170, 294-317` | What `checkpoint_required` does | `reopenOwned` fetches the checkpoint, closes the socket, opens a new one; CONNECTED, then the snapshot is staged and published as a new context | E-03 |
| 2026-10-24 | Code | `autobyteus-web/stores/agentOrgContextsStore.ts:53-70` | Publication | `publish` replaces `contexts.value[id]` with the new candidate (it adopts the old member contexts) | E-04 |
| 2026-10-24 | Code | `autobyteus-web/stores/agentOrgContextsStore.ts:358-372` (`readRunConfig`) | The failing guard | Captures `org` and `org.view` before the read; after it throws "Org configuration read is stale; refresh required." if `contexts.value[id] !== org`, `org.view !== view`, an operation is pending or the binding changed (line 365); again after metadata preparation (line 368) | E-04 |
| 2026-10-24 | Code | `autobyteus-web/stores/delegatedLaunchDraftStore.ts:123-136`, `components/workspace/config/ExistingRunConfigEditor.vue:323`, `stores/existingRunConfigEditActions.ts:86-98`, `stores/existingRunConfigStore.ts:238-254` | The Save → re-read path | After a successful Save the draft store calls `reloadCanonical(true)` → `loadAgentOrgCanonical` → `readRunConfig`; a failure sets `savedRefreshFailed` ("Settings were saved, but could not be refreshed…") | E-04 |
| 2026-10-24 | Code | `stores/existingRunConfigResultActions.ts:139-158` | Other caller | `reconcileAgentOrgFailure` (Refresh, failure reconciliation) also calls `readRunConfig` | E-06 |
| 2026-10-24 | Code | `stores/existingRunConfigStore.ts:193-236` | Agent and Team roots | `readAgentCanonical` / `loadTeamCanonical` have no view-identity guard | E-05 |
| 2026-10-24 | Doc | `autobyteus-web/docs/settings.md:1378-1399` | Designed behavior | "A live run also publishes the choice to its views… The Team view records it in place; Org and Agent views reload." and the "Save recovery" message | E-07 |
| 2026-10-24 | Command | `pnpm exec vitest run stores/__tests__/zz-probe-org-reread-race.spec.ts` (NUXT_TEST=true, in `autobyteus-web`) | Reproduce | Fails: "promise rejected 'Error: Org configuration read is stale; r…' instead of resolving" | SD-01 |

## Relevant Existing Behavior And Supported Product Paths

| Behavior ID | Kind | Supported Trigger Or Governing Contract | Current Supported Product Behavior Path / Lifecycle | Current Outcome / Invariants | Evidence | Confidence / Unknown |
| --- | --- | --- | --- | --- | --- | --- |
| BEH-001 | User | Run Settings Save of a stopped copy's model in a running Org | Save → server stores and publishes the event → web Settings re-reads canonical settings; in parallel the stream reloads the Org view → the re-read sees a new context/view and throws stale | ~1 in 3 Saves show "could not be refreshed" and the old model | E-01, E-04, SD-01 | High (Measured and Reproduced) |
| BEH-002 | System | `delegated_launch_selections_changed` on a live Org | Org context → `checkpoint_required` → stream reconnect → new snapshot → new context published | Member conversations show the new model | E-02, E-03, E-07 | High (Read; Measured by API-18) |

## Relevant Codebase And Technical Facts

| Path / Component / Contract | Current Responsibility Or Behavior | Requirement Implication | Architecture Question / Design Implication |
| --- | --- | --- | --- |
| `agentOrgContextsStore.readRunConfig` | Owner of the Org canonical-settings read and its publication into a stopped Org's context | The stale rule lives here; both callers go through it | Fix the rule once, in this owner |
| `agentOrgStreamingService` reload | Designed reload per selection change | Keep (BEH-002) | — |

## Structural And Payload Surface Inventory

- Payload surfaces: none.
- Structural surfaces: one web store function (`readRunConfig`); its unit tests.
- Potential structural impacts: API/persistence/security/deployment: absent. Concurrency/lifecycle: a client-side read retry within one store; no new state.

## Runtime, Probe, Or Reproduction Findings

| Method / Command | Scenario | Observation | Established | Requirement Implication | Artifact / Evidence Path |
| --- | --- | --- | --- | --- | --- |
| API-18 (autobyteus-205), browser probe DCP-003/DCR-003 ×6, base vs ticket | SCN-001 on a real stack | Reconnect + snapshot after 12/12 Saves; stale re-read 4/12 (base) | Measured | Reconnect is systematic; failure depends on timing | origin/personal `tickets/done/remove-skill-improvement/evidence/API-18-fu005-base-vs-ticket.txt` |
| SD-01: unit reproduction, context replaced while `readAgentOrgRunConfig` is pending | The race, deterministic | Rejects with the stale error | Reproduced | REQ-001 | `evidence/repro-org-reread-race.spec.ts`, `evidence/SD-01-repro-org-reread-race.log` |

- Temporary diagnostics: none in product code. The probe spec ran at `autobyteus-web/stores/__tests__/zz-probe-org-reread-race.spec.ts` and was moved to the ticket's evidence folder (not in the test tree).
- Reproduction for implementation to start from: `evidence/repro-org-reread-race.spec.ts`. Copy it into `autobyteus-web/stores/__tests__/` and run `NUXT_TEST=true pnpm -C autobyteus-web exec vitest run stores/__tests__/<file> --run` (after `pnpm install` and `pnpm -C autobyteus-web exec nuxi prepare`). It fails on base.

## Persisted Data And State Facts

- Not affected (client read path).

## Product Design Request Context

- Product Design request in the current input: `Not stated`.

## Supplemental Artifact Inventory

| Artifact Path | Owner | Purpose | Scope | Related Requirement / AC IDs | Status | Approval Applicability / State |
| --- | --- | --- | --- | --- | --- | --- |
| `evidence/repro-org-reread-race.spec.ts` | Solution Designer | Failing reproduction | REQ-001/003 | AC-002 | Current | Evidence only |
| `evidence/SD-01-repro-org-reread-race.log` | Solution Designer | Its failing output on base 1138e8fbef | REQ-001 | AC-002 | Current | Evidence only |

## Assumptions, Unknowns, And Risks

| ID | Type | Description | Why It Matters | Resolution / Owner | Status |
| --- | --- | --- | --- | --- | --- |
| R-01 | Risk | A context replaced for another reason (a reopen after a stream failure) also triggers a re-read rather than an error | Behavior for those paths | Correct as well: same Org, same node, no operation; the new read is consistent with the new view | Accepted |

## Architecture Investigation Findings

- Both callers of `readRunConfig` (`existingRunConfigStore.ts:243`, `existingRunConfigResultActions.ts:148`) want "the current canonical settings for this Org"; neither should own a retry policy (Principle 13): one owner, `readRunConfig`.
- The stale conditions mix two kinds: *target changed* (context released, binding changed, operation pending) and *view refreshed* (same Org's context/view replaced by its own stream). Only the first makes the read meaningless.
- No Team/Agent change needed (E-05).

## Requirement Implications

- The reconnect is designed (E-07); the defect is the stale handling (DEC-001).

## Notes For Architecture Design

- Keep the guard for target changes; re-read on view refresh, bounded.
