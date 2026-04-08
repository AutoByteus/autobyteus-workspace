# Docs Sync

Use this as the canonical Stage 9 artifact.

## Scope

- Ticket: `skill-prompt-absolute-paths`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/skill-prompt-absolute-paths/workflow-state.md`

## Why Docs Were Updated

- Summary: Updated the durable skill-design documentation so it matches the implemented prompt-visible formatting behavior for skills, then refreshed the ticket after the local-fix cycle confirmed the model-facing guidance copy now matches that documented behavior too.
- Why this change matters to long-lived project understanding:
  - Future readers need to know that resolvable relative Markdown link targets are rewritten to absolute filesystem paths before the model sees skill content.
  - The durable docs also need to preserve the remaining role of `Skill Base Path` for plain-text or unresolved relative references.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/skills_design.md` | Canonical durable doc for skill prompt injection and `load_skill` behavior | `Updated` | It still described the model as always constructing absolute paths from relative skill links at use time |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-ts/docs/skills_design.md` | Behavior clarification | Documented prompt-time rewriting of resolvable relative Markdown links to absolute filesystem paths, updated `load_skill` behavior, and refreshed the execution-flow examples | The durable docs now match the implemented model-visible skill formatting behavior and the aligned model-facing guidance copy |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Prompt-visible skill formatting | Preloaded skill injection and `load_skill` now share one formatter that rewrites resolvable relative Markdown link targets to absolute paths before the model sees them | `requirements.md`, `implementation.md`, `api-e2e-testing.md` | `autobyteus-ts/docs/skills_design.md` |
| Remaining use of `Skill Base Path` | `Skill Base Path` is still important for plain-text or unresolved relative references even after Markdown-link rewriting | `requirements.md`, `implementation.md` | `autobyteus-ts/docs/skills_design.md` |
| Deep-dive file access behavior | The model should use already-rewritten absolute skill links directly when available, falling back to root-path arithmetic only for remaining relative references | `implementation.md`, `api-e2e-testing.md` | `autobyteus-ts/docs/skills_design.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| “Model always constructs absolute paths from relative Markdown skill links at use time” | Resolvable relative Markdown link targets are rewritten to absolute filesystem paths before prompt-visible rendering | `autobyteus-ts/docs/skills_design.md` |

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed: `None` (the local-fix cycle confirmed no additional durable doc edits were needed beyond the existing skills design update)
