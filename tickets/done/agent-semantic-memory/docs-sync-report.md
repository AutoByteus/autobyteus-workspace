# Docs Sync Report

## Scope

- Ticket: `agent-semantic-memory` (Project Task `autobyteus-12`)
- Trigger: post-API/E2E test-code review pass CRR-002 (code reviewer), validated package ready for delivery
- Bootstrap base reference: `origin/personal` @ `f78b60ddd`
- Integrated base reference used for docs sync: `origin/personal` @ `c60ebbb9f` (64 commits), merged into `codex/agent-semantic-memory` as `82599d9ae` (no conflicts)
- Post-integration verification reference: `evidence/DEL-post-integration/` (server unit, deterministic E2E, E2E credential guard, web specs, server typecheck; all pass)

## Why Docs Were Updated

- Summary: the implementation commits (`785ff7c95`, `0fa12575c`) already documented the feature: the `semanticMemoryEnabled` setting, the `memory/semantic/<agent>/` folder and its owner, the Semantic Memory instruction section, Codex `writable_roots` / Claude additional directory, the personal setting for package agents, the glossary term and the web agent form. Delivery checked them against the integrated code and found one module doc whose summary of the prompt order was stale (it also predated this ticket in omitting the Project section). Delivery fixed it.
- Why this should live in long-lived project docs: every later change to runtime instructions, run memory or agent configuration needs to know that an agent may have a semantic memory folder, where it is, which runtimes need write access configured for it, and that the system never deletes it.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | project design rules | No change | Principles and the project-specific design documents list stay accurate; the feature follows the Collaboration Model, which the ticket updated |
| `TESTING.md` | project testing guideline | No change | Gated suites keep their gate and command in the test file header, as both new suites do (`agent-semantic-memory.e2e.test.ts`, `agent-semantic-memory-live.e2e.test.ts`). The API/E2E reports record no command that stopped working. The fresh-start build needs `GITHUB_REPOSITORY`, which TESTING.md already says |
| `RELEASE.md` | project release guide | No change | Followed as written (see the release/deployment report) |
| `GLOSSARY.md` | domain vocabulary; changed by both the ticket and the base | No change | After the merge it still has the ticket's **Semantic memory** entry and the five-setting **Personal setting** entry, alongside the base's additions |
| `autobyteus-server-ts/docs/modules/agent_memory.md` | the folder, owner, run wiring, lifecycle | No change | Matches `agent-semantic-memory.ts`, `agent-memory-layout.ts` and the evidence (SM-10: the Memory page, search and sync do not list it) |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | the config field, GraphQL fields | No change | Matches `agent-definition-config.ts`, GraphQL types, SM-01 |
| `autobyteus-server-ts/docs/modules/prompt_engineering.md` | section ownership, exact text, order | No change | Matches `semantic-memory-prompt-contract.md` and SM-04/SM-05 prompts |
| `autobyteus-server-ts/docs/modules/personal_settings.md` | the `SEMANTIC_MEMORY` personal setting | No change | Matches SM-02 |
| `autobyteus-server-ts/docs/modules/codex_integration.md`, `credential_proxy.md` | the merged `sandbox_workspace_write` object | No change | Matches API-14 (one object with `network_access` and `writable_roots`) |
| `autobyteus-server-ts/docs/modules/deepseek_harness_runtime.md` | DeepSeek harness write behavior | No change | States the sandbox escalation with auto-execute off (FU-007) |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | where each run's memory is stored | No change | Has the one-line pointer to semantic memory |
| `autobyteus-web/docs/agent_management.md` | the form switch and detail card | No change | Matches the IMP-08 screenshots |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | summary of Carpenter runtime instructions (changed by the base too) | Updated | Its order sentence omitted the Project and Semantic Memory sections |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `agent_communication.md` (changed by the base) | describe team member prompts | No change | They describe the collaboration sections only and link to prompt_engineering.md |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Correction | "Carpenter Runtime Instructions": the shared order is now Agent Identity, optional Team Instruction, the role's collaboration sections, the optional Project section and the optional Semantic Memory section (linking to Agent Memory). It also says that Codex adds the folder to `writable_roots` and Claude gets it as an additional directory | The summary disagreed with `prompt_engineering.md` and with the composer |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Agent semantic memory | One folder per agent definition, `memory/semantic/<encodeURIComponent(id)>/`; told to every run via the instructions; never deleted by the system; not listed by the Memory page, search or sync | design-spec.md, semantic-memory-prompt-contract.md | `agent_memory.md`, `GLOSSARY.md` (by the implementation) |
| Instruction section | Exact text, placement after Project, presence only when enabled | semantic-memory-prompt-contract.md | `prompt_engineering.md` (by the implementation), `agent_execution.md` (delivery) |
| Runtime write access | Codex `writable_roots`, Claude additional directory; native, Grok, Antigravity write outside the workspace already; DeepSeek harness asks an escalation with auto-execute off | design-spec.md, API-11..API-20 | `agent_memory.md`, `codex_integration.md`, `deepseek_harness_runtime.md` (implementation), `agent_execution.md` (delivery) |
| Setting | `semanticMemoryEnabled` in `agent-config.json`; personal setting for package/built-in agents | requirements-doc.md DEC-012 | `agent_definition.md`, `personal_settings.md`, `agent_management.md` (implementation) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Codex integration builder's own `sandbox_workspace_write` object | One merged `sandbox_workspace_write` (`network_access` + `writable_roots`) from `codex-sandbox-workspace-write-config.ts` | `codex_integration.md`, `credential_proxy.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: N/A (docs were updated)
- Rationale: N/A

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive, finalization on `personal` (no release)
- Notes: problems found outside this ticket: none new (follow-ups FU-001..FU-012 already recorded).
