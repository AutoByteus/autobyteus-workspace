# Docs Sync Report — autobyteus-331 (Work Journal: neutral vocabulary)

## Scope

- Ticket: `work-journal-neutral-vocabulary` (Project Task autobyteus-331); `task_size` Medium, `architectural_risk` Low, route Direct API/E2E (independent reviews `Not Applicable`)
- Trigger: API/E2E `API-REV-001` Pass (94.7%), then Solution Designer SR-003 (DEC-007 gate 2 accepted, DEC-008 FU-003 a follow-up)
- Bootstrap base reference: `origin/personal` @ `a0a038967c`
- Integrated base reference used for docs sync: `origin/personal` @ `1a4453e553` (merge `904ceb1a4a`)
- Post-integration verification reference: `evidence/DEL-01-post-integration-checks.md`

## Why Docs Were Updated

- Summary: the journal now describes every tool call in neutral words and regenerates on a renderer-revision change; the module doc still described the old "built-ins plus `Tool: <name>`" model and pointed at a contract file inside a done ticket.
- Why this belongs in long-lived docs: the vocabulary is what readers (people and agents on any runtime) see and what the code must keep; the regeneration rule is the procedure for any later wording change.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/agent_work_journal.md` | owner of the vocabulary and revision rule (REQ-014 / AC-014) | Updated | below |
| `autobyteus-server-ts/docs/modules/memory_search.md` | Journals step fingerprint and Quality Check rule are changed/affected | Updated | fingerprint includes the renderer revision; Rebuild passes `regenerate`; one sentence on judging journal-wording changes (allowed by SR-003) |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | one sentence described journal actions as built-ins plus `Tool: <name>` | Updated | now names the three-step lookup and points to the module doc |
| `GLOSSARY.md` (Memory, Work Journal) | terms used by the change | No change | definitions do not name tools or wording |
| `autobyteus-server-ts/docs/modules/agent_memory.md`, `autobyteus-web/docs/**` | consumers of journal text (Memory page) | No change | they describe the reader/view, not the wording; no UI change |
| `TESTING.md`, `DESIGN.md`, `RELEASE.md` | project rules read for the ticket | No change | no rule changed by this ticket |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `agent_work_journal.md` | Promotion + correction | replaced "format specified in the ticket's `work-journal-contract.md`" with the module's own description; new **Vocabulary** section (outcomes, built-in lines, runtime-only tools per runtime, platform tool families, history names, refusal and no-recipient behavior, skill load rule, generic `(via <server>)` line, guards); new **Changing The Wording** section (revision bump, first catch-up pass, Rebuild `regenerate`, Index now, measured cost); `ensureCurrent(…, { regenerate })` and `rendererRevision` in the public boundary; manifest example `renderer_revision: 2`; boundaries for platform converters | REQ-014 / AC-014; the contract file is not a durable home |
| `memory_search.md` | Update | Journals step and Quality Check sentences as above | pipeline behavior and decision DEC-007 |
| `ARCHITECTURE.md` | Update | Work Journal paragraph | stale description |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Neutral vocabulary and lookup order | runtime table, then platform converters, then generic; qualified names never match the platform table; skill rule once in `commandLine` | contract §2–§6, design-spec | `agent_work_journal.md` Vocabulary |
| Recorded-history names | converters key by literals; removed tool names stay | contract §3 | `agent_work_journal.md` Vocabulary |
| Regeneration rule | revision bump → first catch-up pass; Rebuild forces; raw traces untouched | design-spec persisted-data decision | `agent_work_journal.md` Changing The Wording, `memory_search.md` |
| Cost of a wording change | 82% of files changed, ~22 min embedding, +0.5% index; gate 2 judged with gate 1 | `evidence/IMP-04-shadow-render-report.md`, SR-003 | `agent_work_journal.md`, `memory_search.md` |

The per-line "before/after" tables, the synthetic traces (§11) and the ticket's usage counts stay in the ticket's contract file (archived) as history; the module doc carries the current vocabulary only.

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| "Every other tool as `Tool: <name>`" (decision D1 of the first contract) | per-runtime tables + platform converters; the generic line remains for other tools | `agent_work_journal.md` Vocabulary |
| Ticket-local `work-journal-contract.md` as the format authority | the module doc | `agent_work_journal.md` |
| Renderer revision 1 cache key | revision 2 plus the fingerprint and `regenerate` rule | `agent_work_journal.md` Changing The Wording |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: archive the ticket, finalize.
- Notes: follow-ups outside this ticket: FU-001…FU-003 (earlier roles) and FU-004 (delivery, a broken test-helper import on `origin/personal`) in `follow-ups.md`.
