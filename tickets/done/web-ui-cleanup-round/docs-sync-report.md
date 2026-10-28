# Docs Sync Report

## Scope

- Ticket: `web-ui-cleanup-round` (Project Task `autobyteus-320`), SR-001 / IR-003 / API-REV-003
- Trigger: API/E2E validation Pass, round 3 (API-REV-003), direct route (`task_size=Medium`, `architectural_risk=Low`)
- Bootstrap base reference: `origin/personal` @ `e72a4702e9`
- Integrated base reference used for docs sync: `origin/personal` @ `e72a4702e9` (the branch was already current)
- Post-integration verification reference: delivery's clean-clone run DEL-01… (`evidence/DEL-*.log`)

## Why Docs Were Updated

- Summary: the change updated `GLOSSARY.md` (the five runtime names, AC-006) and `autobyteus-web/docs/settings.md` (text-only Settings menu, full runtime names). Delivery found four places where long-lived docs still described the old behavior:
  - the renamed voice status component;
  - Memory search without its new voice button;
  - the Depends-on picker's Enter rule;
  - the skill-update notice example, which showed paths that are now inline code.
- Why this should live in long-lived project docs: each is user-visible behavior or a component name that a reader would otherwise look for in vain.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `GLOSSARY.md` | AC-006: the five runtime names | Updated (by implementation; verified) | Matches the contract's `agentRuntimeName` and its pinned test (`agent-runtime-names.test.mjs`) |
| `autobyteus-web/docs/settings.md` | Settings menu icons, runtime names, Embedding card | Updated (by implementation; verified) | The Embedding section never listed the separate "waiting for the model" text, so "Waiting…" needs no doc change |
| `autobyteus-web/docs/projects.md` ("Optional Local Voice Destination") | Named `ProjectVoiceStatus`, which `3e7be8bc10` renamed and moved to `components/voiceInput/VoiceTargetStatus.vue` | Updated (by delivery) | Now the one voice status line for Project/Task descriptions and Memory search |
| `autobyteus-web/docs/projects.md` ("Task keys and Depends on") | Picker Enter rule (item 5) | Updated (by delivery) | The highlight starts on the first choosable Task; Enter never adds a greyed one, and adds nothing when all are greyed |
| `autobyteus-web/docs/memory.md` ("Memory Search") | New voice input (item 6, AC-011) | Updated (by delivery) | Mic button as in the chat input; transcript fills the box; Search runs the search (DEC-003); disabled while not ready; absent without voice; shared status line |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` ("Delivery") | The example and rules showed plain paths; `f9c1a8d5e3` writes the folder and file paths as inline code | Updated (by delivery) | Example and a rule bullet (`inlineCode`, backtick-safe fence) |
| Server docs mentioning "Claude SDK" (`mcp_gateway.md`, `prompt_engineering.md`, `token_usage.md`) | DEC-002, full names | No change | These are developer prose about the Claude SDK itself (backend modules), not UI display names; DEC-002 covers the names shown to users |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `GLOSSARY.md`, `autobyteus-web/docs/settings.md` | Implementation | Runtime names; text-only Settings menu | REQ-001, REQ-003, REQ-004 |
| `autobyteus-web/docs/projects.md` | Delivery | `VoiceTargetStatus` naming and scope; picker Enter rule | REQ-008, REQ-009 |
| `autobyteus-web/docs/memory.md` | Delivery | Memory search voice input | REQ-009, AC-011 |
| `autobyteus-server-ts/docs/modules/skill_update_notices.md` | Delivery | Paths as inline code (example and rule) | REQ-007, AC-009 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| One runtime-name list | Every runtime display name comes from `agentRuntimeName` in `@autobyteus/agent-presentation-contracts` | `design-spec.md`, AC-005 | `GLOSSARY.md` |
| Voice in a search box fills, never submits | DEC-003 | `requirements-doc.md` | `memory.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `ProjectVoiceStatus` | `components/voiceInput/VoiceTargetStatus.vue` | `projects.md`, `memory.md` |
| Per-surface runtime label maps | `agentRuntimeName` (contract package) | `GLOSSARY.md` |
| Plain-text paths in skill-update notices | Inline code paths | `skill_update_notices.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: verification from the evidence and the clean-clone proof, then finalization
