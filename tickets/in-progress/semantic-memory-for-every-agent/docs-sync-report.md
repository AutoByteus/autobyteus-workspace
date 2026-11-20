# Docs Sync Report: autobyteus-554 (semantic memory for every agent)

## Scope

- Ticket: `semantic-memory-for-every-agent` (Project Task `autobyteus-554`)
- Trigger: test review CRR-007 `Pass` (of the delivery Local Fixes LF-1…LF-4) after API/E2E `API-REV-003` `Pass` (final confidence 95.1%). `task_size` Large, `architectural_risk` High; route Reviewed (architecture review `Pass`, source reviews CRR-001…CRR-006, test reviews CRR-005 and CRR-007).
- Bootstrap base reference: `origin/personal` @ `8430d9ef12`
- Integrated base reference used for docs sync: `origin/personal` @ `fbf02a9315`, merged in three refreshes, none with a textual conflict: `74d046320a` (164 commits: the offline demo world and icon bundle, collaboration messages, mobile, the Server Docker and desktop packaging work, native tool search follow-ups) as `7ac6b392c1`, before any delivery edit; then `b072d93d8e` (18 commits: desktop signing trust and its pre-tag checks; `scripts/desktop-package/**`, `scripts/desktop-release.sh`, `RELEASE.md`) as `13049fe137`; then `fbf02a9315` (21 commits: autobyteus-572, the phone's media loading and `Content-Length` on the REST file routes; server REST files, the web media viewers and loaders, `GLOSSARY.md`, `autobyteus-web/docs/{file_explorer,remote_access}.md`, `docs/design-cases.md`) as `87d23b70a1`. `GLOSSARY.md`, `collaboration_model.md` and `agent_execution.md` were edited on both sides of the first refresh, and `GLOSSARY.md` and `workspaces.ts` on both sides of the third; each merged cleanly and the merged text was read (below). The third advance edits no doc this ticket owns.
- Post-integration verification reference: `evidence/DEL-01…DEL-30` on the first merge (`7ac6b392c1` + the icon bundle), the fixes LF-1…LF-4 (`27498a16ac`, `d0770bcb5b`) with their review and API/E2E round 3 (`API-17`), and `evidence/DEL-31…DEL-48` on the second merged state `13049fe137` and `DEL-49…DEL-59` on the final merged state `87d23b70a1`, listed in `release-deployment-report.md`.

## Why Docs Were Updated

- Summary: this ticket made semantic memory a fact of every agent (no switch anywhere), added the node's global semantic folder, reorganized the Memory page by owner (Global, Agents, Agent Teams, Agent Orgs) with a read-only folder view, moved an agent's "runs on the Memory page" to its episodic catalog (`listAgentEpisodes`), gave long definition IDs one shortened folder name (DEC-016) and contained a folder that cannot be prepared (DEC-015). The implementation wrote the docs for it (14 files). Delivery checked each against the final code and the final merged state, found them accurate, and made no docs edit of its own. The only stale statement found was a code comment, a class comment in `personal-settings-service.ts` that still named a "semantic memory switch"; it was corrected through the Local Fix route (`27498a16ac`, LF-4) because it is source.
- Why this should live in long-lived project docs: agents and the people who run them read where the folders are and what the prompt says (the glossary, `agent_memory.md`, `prompt_engineering.md`), a maintainer of the workspace, file explorer and run launch must know that the Memory page's folder view is a read-only workspace no run can take (`workspaces.md`, `file_explorer.md`, `agent_execution.md`), and the Memory page's address and query set changed (`memory.md`).

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | Project design rules | No change | The change follows rules 5, 7 (a folder that cannot be made is contained, DEC-015), 8 and 9 (a clean cut of the GraphQL surface, REQ-009; no compatibility) and 11, and the Data Migration Guideline's tolerant reader (a stored `semanticMemoryEnabled` is ignored on read and absent after the next write; nothing is migrated). No rule was added or changed. The design lessons of CR-002 (one owner for a name rule that three folders share) is a design case for the Solution Designer (`docs/design-cases.md`), not delivery's |
| `TESTING.md` | Project testing guideline | No change | Its row for a prompt change (added on the base, `7fffdadab7`, while this ticket was in review) is exactly the check that found the stale `collaboration-prompt-wording` test; delivery applied it (`evidence/DEL-30-prompt-reader-files.md`). Its rule that a cold Nuxt dev server reloads pages explained the probe's first failure. No command stopped working. The remaining notes are follow-ups, not guide changes: FU-006 (SM-12's `chmod` and root), FU-007, FU-008 |
| `RELEASE.md` | Project release guide | No change | The second base refresh added "Desktop signing readiness (before any stable or beta tag)". It governs tagging; no release is made here. This ticket changes no release step, check or workflow |
| `GLOSSARY.md` | Domain words | Checked; already updated | "Semantic memory" names the folder as `<memory>/semantic/<definition folder name>/` with the shortened form for a long ID; "Global semantic memory", "Episodes" and "Owner (on the Memory page)" are defined; "Personal setting" counts four settings, not five; "Episodic catalog" uses the same folder name. The file changed on both sides and every entry is present |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | Layout, the definition folder name (DEC-016), the owner `AgentSemanticMemory`, the contained preparation (DEC-015), the Memory page's queries | Checked; already updated | The numbers match the code (`agent-memory-layout.ts`: 200 bytes, a 120-byte prefix, `#`, 16 hex characters of SHA-256; a shortened name cannot be decoded). `listAgentEpisodes`, `agentSemanticMemoryFolder`, `globalSemanticMemoryFolder` and `listMemoryGroupMembers` are described; `listAgentOrgRunsWithMemory` and the team query are still real and still named |
| `autobyteus-server-ts/docs/modules/agent_episodic_catalog.md` | The catalog's folder name rule and CF-11 | Checked; already updated | Says the folder name is the same one rule as the semantic folder; says a shortened catalog folder whose runs are all gone keeps its last `catalog.md` (CF-11) |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | The prompt's sections | Checked; already updated | The Semantic Memory and Global Semantic Memory sections, their exact text, every runtime and run kind, and `null` when the folder could not be prepared |
| `autobyteus-server-ts/docs/modules/agent_execution.md`, `codex_integration.md`, `deepseek_harness_runtime.md` | Runtime launch: writable roots, the run workspace | Checked; already updated | Codex `writable_roots` and Claude's additional directories carry both folders; a run workspace ID resolves through `getOrCreateRunWorkspace`, which refuses the read-only semantic workspace; dsh has no writable-folder option, so its writes to either folder ask an escalation. The file changed on both sides and the merged text reads coherently |
| `autobyteus-server-ts/docs/modules/workspaces.md`, `file_explorer.md` | The semantic memory workspace (`semantic_memory` kind), `readOnly`, `followSymbolicLinks` | Checked; already updated | The workspace ID is `semantic_ws_<encodeURIComponent(agentDefinitionId)>` (and `semantic_global_ws`), as `semantic-memory-workspace.ts` states; it is never listed; the refusals carry `WORKSPACE_READ_ONLY` and `WORKSPACE_LINK_NOT_OPENED` |
| `autobyteus-server-ts/docs/modules/agent_definition.md`, `personal_settings.md` | The retired field and personal setting | Checked; already updated | A stored `semanticMemoryEnabled` is read without it and dropped at the next save; the tolerant personal-settings reader skips such a record with `PERSONAL_SETTINGS_ENTRY_SKIPPED` until it is next written |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | Where a run's memory is stored | Checked; already updated | The memory tree lists `semantic-global/` as "not a run". The file changed on both sides and merged cleanly |
| `autobyteus-web/docs/memory.md`, `agent_management.md` | The Memory page and the agent form and detail | Checked; already updated | The owner tabs, the `node` and `pane` route state, the removed `view=agent-detail|team-detail|org-detail` addresses; no form switch, and the detail page shows the folder path for every agent |
| Source comment `personal-settings-service.ts:88` | Named a "semantic memory switch" | Corrected by LF-4 | Source, so through the implementation engineer, reviewed in CRR-006 |

AC-002's grep over the live server and web code on the final merged tree (`evidence/DEL-37-ac002-grep.log`) finds only the retired-key drop in `agent-definition-config.ts` (the code that removes the stored key at the next save). The first merged-state grep (this delivery, before LF-1) also found the demo fixture line, which LF-1 removed.

## Docs Updated

None by delivery. Every doc edit this ticket needed is in the implementation's commits and was verified above. Delivery's own documents are the handoff summary, this report, the release/deployment report, the delivery revision record and `release-notes.md`.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Every agent has semantic memory, and a global folder | The folder, its path rule, that every run's instructions carry both sections, and that a native AutoByteus agent without a file tool cannot use them until a file tool is added (DEC-001) | `requirements-doc.md` REQ-001, REQ-010, REQ-011, DEC-001, DEC-012, DEC-013 | `agent_memory.md`, `prompt_engineering.md`, `GLOSSARY.md` |
| One folder-name rule | `encodeURIComponent(id)` up to 200 bytes, else a 120-byte prefix, `#` and 16 hex characters of the SHA-256; shared by `semantic/`, `episodic/` and the Memory page's lookup; an ID of 201 to 255 encoded bytes, which used to get its full name, now gets the shortened one | `requirements-doc.md` DEC-016, `design-spec.md` SR-009 | `agent_memory.md`, `agent_episodic_catalog.md`, `GLOSSARY.md` |
| A preparation failure never fails a run | A folder that cannot be made is `null`, logged `SEMANTIC_MEMORY_PREPARE_FAILED { definitionId, folder, reason }`, and the run starts without that section | `requirements-doc.md` DEC-015 | `agent_memory.md`, `prompt_engineering.md` |
| The Memory page's folder view is a read-only workspace the node enforces | `semantic_memory` workspaces are `readOnly`, never follow links, are never listed and can never be a run's workspace (`WORKSPACE_NOT_RUNNABLE`); the view never creates a folder | `requirements-doc.md` REQ-007, DEC-009, DEC-010 | `workspaces.md`, `file_explorer.md`, `agent_execution.md` |
| The Memory page is organized by owner | Global, Agents, Agent Teams, Agent Orgs; an agent's episodes come from its catalog; a shared agent has one page | `requirements-doc.md` REQ-006, DEC-011 | `memory.md`, `GLOSSARY.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| The `semanticMemoryEnabled` definition field, its GraphQL field and input fields, the `SEMANTIC_MEMORY` personal setting, the form checkbox `AgentSemanticMemoryField.vue` and every enabled-check | Nothing: every agent has semantic memory; a stored key is ignored and dropped at the next save | `agent_definition.md`, `personal_settings.md`, `agent_management.md`, `GLOSSARY.md` |
| `AgentDefinition.semanticMemoryPath` as a nullable string "null when off" | A non-null absolute path for every agent | `agent_memory.md`, `agent_management.md` |
| The GraphQL query `listAgentRunsWithMemory` and the Memory page's old agent, team and org runs pages (`view=agent-detail|team-detail|org-detail`), the separate "Semantic Memory" tab and `AgentMemoryDetail.vue` | `listAgentEpisodes` (an agent's runs from every place, from its episodic catalog), `listMemoryGroupMembers`, the owner pages and the folder view; the team and org run queries remain | `memory.md`, `agent_memory.md` |
| `encodeURIComponent(definition id)` as the one folder name with no length rule | The shared definition folder name (DEC-016) | `agent_memory.md`, `agent_episodic_catalog.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: delivery made no docs edit of its own; the ticket's docs were updated by the implementation and are accurate for the final state.
- Rationale: each long-lived doc that describes the changed behavior was changed with the code, and the review above, the AC-002 grep and the code comparison show no stale statement left. The base advance changed no doc this ticket owns apart from the three files named in Scope.

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, release notes, verification record, archive, finalization (`release-deployment-report.md`)
- Notes: follow-ups FU-001…FU-008 are in `follow-ups.md`; the Solution Designer sends them. FU-006…FU-008 are delivery's, found by the merged-state run (causes in the release/deployment report). FU-007 (`DCF-E2E-007` fails on a clean build of `origin/personal`) is urgent only for whoever owns agent package live refresh: it is a base regression, not this ticket's. Delivery found no other problem outside this ticket's scope.
