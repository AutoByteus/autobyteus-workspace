# Docs Sync Report

## Scope

- Ticket: `daily-assistant-delegation-target` (Task `autobyteus-455`)
- Trigger: API/E2E Pass `API-REV-001` (direct route, `task_size: Small`, `architectural_risk: Low`)
- Bootstrap base reference: `origin/personal` @ `310fc27452`
- Integrated base reference used for docs sync: `origin/personal` @ `310fc27452` (unchanged; the ticket branch was already current)
- Post-integration verification reference: no rerun needed (no new base commits); API/E2E evidence on `fbc9b3c2e9` + test commits `c4f004d7fc`, `85be9f9c10` stands

## Why Docs Were Updated

- Summary: the Daily Assistant is now an ordinary collaborator (listed, delegated to and offered by `@`, except in its own run); only the Model Router stays out (`collaborationEligible` in the built-in registry). The implementation already updated three server module docs. The web chat doc still said New chat and live-run `@` offer no built-ins and no Daily Assistant.
- Why this should live in long-lived project docs: `autobyteus-web/docs/chat.md` is the canonical description of the `@` menus; readers would otherwise believe the Daily Assistant is never offered.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `DESIGN.md` | project design rules | No change | No rule about built-in collaborator eligibility; the change follows the existing single-policy ownership |
| `TESTING.md` | testing guideline | No change | The new suite uses the existing scripted-AGY gate (`RUN_AGY_FAILURE_E2E`, `ANTIGRAVITY_CLI_COMMAND`, TESTING.md L212); no command or rule changed; no reported discrepancy |
| `RELEASE.md` | release guide | No change | Followed as written; no gap found |
| `GLOSSARY.md` (Internal agent / built-in agent) | terms | No change | Still accurate: built-in ≠ internal; the Model Router is internal |
| `autobyteus-server-ts/docs/modules/agent_definition.md` | built-in registry | No change (already updated in `fbc9b3c2e9`) | L167/L169 state `collaborationEligible` true/false |
| `autobyteus-server-ts/docs/modules/agent_communication.md` | `@` candidates policy | No change (already updated) | L505 "minus the Model Router, a built-in marked `collaborationEligible: false`" |
| `autobyteus-server-ts/docs/modules/remote_collaboration.md` | peer offer | No change (already updated) | L61-62 "the Daily Assistant too … never the Model Router" |
| `autobyteus-server-ts/docs/design/collaboration_model.md` | CM-1…CM-12 | No change | Speaks of shared Agents generally; no built-in exclusion stated |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md`, `agent_tools.md` | `list_available_agents` / self-target | No change | No built-in exclusion stated |
| `autobyteus-web/docs/chat.md` | New chat and live-run `@` | Updated | Two stale passages (below) |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` (New Chat Draft, `@` bullet) | Correction | "shared, non-built-in Agents" → shared Agents including the Daily Assistant, never the Model Router (kept out by `collaborationIneligibleAgentDefinitionIds.ts`, mirroring the registry's `collaborationEligible: false`); a Daily Assistant draft does not offer itself | The web mirror was renamed and narrowed in `fbc9b3c2e9` |
| `autobyteus-web/docs/chat.md` (live-run `@` Options) | Correction | "(no Daily Assistant or built-ins)" → "(the Daily Assistant too, except in its own run; never the Model Router)" | Server candidates now include the Daily Assistant (DAC-06) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Built-in collaborator eligibility | Each built-in declares `collaborationEligible`; the single `CollaboratorCandidatePolicy` (and the web New-chat mirror) excludes only ineligible ones | `design-spec.md` | `agent_definition.md`, `agent_communication.md`, `remote_collaboration.md` (implementation), `autobyteus-web/docs/chat.md` (this sync) |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `autobyteus-web/utils/agents/builtInAgentDefinitionIds.ts` (`isBuiltInAgentDefinitionId`, all built-ins) | `autobyteus-web/utils/collaborators/collaborationIneligibleAgentDefinitionIds.ts` (Model Router only) | `autobyteus-web/docs/chat.md` New Chat Draft |
| "Built-ins are never collaborators" | per-built-in `collaborationEligible` flag | `autobyteus-server-ts/docs/modules/agent_definition.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, repository finalization per `RELEASE.md`
- Notes: Follow-up FU-001 (self-target refusal wording) stays in `follow-ups.md`; no new follow-up from docs sync.
