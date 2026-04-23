# Docs Sync

## Scope

- Ticket: `whole-skill-symlink-materialization`
- Trigger Stage: `9`
- Workflow state source: `tickets/done/whole-skill-symlink-materialization/workflow-state.md`

## Why Docs Were Updated

- Summary:
  - the existing Codex integration doc still described runtime-owned copied skill bundles, hash-suffixed fallback names, and self-contained dereferenced shared-file behavior
  - after the validation-gap re-entry, the stronger live Codex runtime proof did not change the long-lived contract further; it reinforced the same already-updated Codex doc
- Why this change matters to long-lived project understanding:
  - future readers now need to understand that fallback Codex skills are whole-directory symlinks, not copied bundles, and that shared-relative paths remain authoritative through the source tree

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | It documents Codex workspace skill handling and was explicitly stale after this refactor | Updated | Rewrote the fallback-materialization notes from copy semantics to whole-directory symlink semantics |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Behavior / runtime contract update | Replaced copy-based fallback language with whole-directory symlink behavior, removed hash-suffix/yaml/marker assumptions, and clarified shared-relative-path behavior | The previous document was no longer truthful after the implementation |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Codex fallback workspace skills | Missing configured Codex skills now materialize as intuitive `.codex/skills/<sanitized-name>` symlinks to source roots, not copied bundles | `proposed-design.md`, `future-state-runtime-call-stack.md`, `implementation.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Shared relative skill paths | A whole-directory symlink preserves team-shared relative links without a `.codex/shared/...` mirror | `investigation-notes.md`, `api-e2e-testing.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Codex runtime-owned copied fallback skill bundles | whole-directory workspace symlinks to source skill roots | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Codex hash-suffixed fallback skill directory naming | intuitive `.codex/skills/<sanitized-skill-name>` paths | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Codex-generated fallback `agents/openai.yaml` / marker-file assumptions | no runtime-owned source-tree writes; ownership inferred from symlink identity | `autobyteus-server-ts/docs/modules/codex_integration.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: `N/A`
- Why existing long-lived docs already remain accurate: `N/A`

## Final Result

- Result: `Updated`
- If `Blocked` because earlier-stage work is required, classification: `N/A`
- Required return path or unblock condition: `N/A`
- Follow-up needed:
  - no additional long-lived Claude doc was updated because no existing repo doc currently describes Claude workspace skill materialization semantics
  - no further long-lived doc edit was needed for the Stage 7 re-entry because the new GraphQL/WebSocket Codex E2E strengthened validation evidence without changing the already-updated runtime contract
