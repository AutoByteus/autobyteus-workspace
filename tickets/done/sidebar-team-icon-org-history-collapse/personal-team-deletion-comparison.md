# Original personal Team deletion comparison
Package SIDEBAR-ORG-20260916-001 · evidence-only SR-005 · 2026-09-16.

## Reference / method
Read-only git show of locally recorded origin/personal **5645b49d6f51faa60bd3545bc8e3f0e7e3f96793**, dated 2026-09-11 (v1.4.69 delivery docs). No fetch, checkout, historical runtime execution or deletion. This is the pinned original-personal baseline, not a claim about every earlier release/local personal commit.

## Actual old path
1. `autobyteus-web/components/agentTeams/AgentTeamDetail.vue:503–529`: detail Delete captures target, opens confirmation; confirmed call goes to store; success notification/list navigation, failure feedback, cancel closes.
2. `autobyteus-web/stores/agentTeamDefinitionStore.ts:243–275`: DeleteAgentTeamDefinition mutation, Apollo catalog cache removal/eviction, Pinia removal on reported success. Useful catalog-coherence precedent, but cache update callback itself is not conditioned on result.success: do not blindly reproduce that limitation for current Org false/error handling.
3. `autobyteus-server-ts/src/api/graphql/types/agent-team-definition.ts:371–385`: delegates to Studio service, reports success/message, catches failure.
4. `src/agent-team-definition/services/agent-team-definition-service.ts:213–227`: checks target exists, rejects non-shared ownership, delegates one exact ID to provider. No walk of referenced member graph, no invocation of runtime Stop/history deletion.
5. `src/agent-team-definition/providers/cached-agent-team-definition-provider.ts:84–91`: deletes through persistence then evicts exact deleted ID from populated cache. Not evidence of recursive child-cache cleanup.
6. `src/agent-team-definition/providers/file-agent-team-definition-provider.ts:422–436`: resolve source paths; reject application-owned; ensure source filesystem writable; `fs.rm(sourcePaths.teamDir, { recursive: true, force: true })`.
7. `providers/team-definition-source-paths.ts:87–99,130–145`: shared root `<team-root>/<team-id>`; locally owned nested Team `<parent-team-dir>/agent-teams/<local-team-id>`. `team-local-team-discovery.ts:48–78` reads nested directories. Therefore recursive package deletion removes physically contained local nested definitions. A separately stored shared Team referenced by a member is not traversed/deleted. This is physical package removal, not recursive deletion through refType/member references.

## Current Org mapping / limits
Current Org already follows the analogous package boundary: FileAgentOrgDefinitionProvider.delete verifies runtime-writable source then transaction.remove(source.packagePath), which recursively removes that directory under a path lock. Org-owned agents/agent-teams are inside it; shared definitions are elsewhere. Neither inspected definition delete call path deletes run history or stops live runs. This is source-level scope evidence, not proof that a future restore after deleting required definitions will work.
Old writable check is filesystem based; current Org has explicit source-class guard (server_data only). Preserve current guard rather than porting old code wholesale. Do not claim old cache handles every nested child or all failed operations perfectly. No additional cascade, runtime tree deletion, or shared-definition delete loop is necessary for the requested UI.

## Design input
Reuse existing Org delete API and ownership boundary; add confirmation with owned-package scope. Delete is not Stop. Keep shared references and history. Only on true success update catalog/cache and navigate; false/errors remain truthful. Test disposable Org with both locally owned and shared definitions and independently retained history; user data never used as delete fixture.
