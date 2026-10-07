# Docs Sync Report — `task-card-compact-summary`

## Scope

- Ticket: `task-card-compact-summary` (SR-002, Approved). Classification: `task_size=Small`, `architectural_risk=Low`, direct route.
  - Architecture review, source code review and test-code review: `Not Applicable — direct low-risk route`.
- Trigger: API-REV-001 Pass (96%) from `/api_e2e_engineer`.
- Bootstrap base reference: `origin/personal@c1e4e3df1`.
- Integrated base reference used for docs sync: `origin/personal@c1e4e3df1`. It was re-fetched at the start of delivery and had not advanced.
- Post-integration verification reference: no new base commits. A delivery smoke run passed: `node --check` on the probe, and `pnpm -C autobyteus-web test:nuxt utils/projects components/projects --run` → 14 files / 100 tests. The repository artifact hygiene check passed.

## Why Docs Were Updated

- Summary:
  - The implementation (`7f08c33a8`) documented the compact-card rule and PMU-013 in `autobyteus-web/docs/projects.md` and `TESTING.md`.
  - API/E2E then added PMU-014, which neither doc mentioned.
  - The docs also said text is cut "at a word boundary". The code (`boundTaskText`) cuts at the last word boundary, but hard-cuts text without spaces (CJK, a single long token), which PMU-014 proves.
- Why this should live in long-lived project docs: `docs/projects.md` is the web feature's canonical description, and `TESTING.md` lists the probe's coverage.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Card presentation rule, probe cases | **Updated** | Precise cut rule; PMU-014 described |
| `TESTING.md` | Probe case list | **Updated** | Range PMU-001..PMU-014; PMU-014 bullet |
| `autobyteus-web/docs/localization.md` and others | Presentation-only change | No change | No copy keys or other surfaces changed |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/projects.md` | Behavior and validation | The cut falls at the last word boundary; text without spaces is cut at the limit, and an unbroken token wraps. Adds the PMU-014 paragraph. | Match the code and the API/E2E coverage |
| `TESTING.md` | Validation | PMU-001..PMU-014, plus the PMU-014 bullet | API/E2E extension |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Clamp pitfall | Never put a `display` utility (e.g. `block`) beside `line-clamp-*`. Tailwind 3.4 emits `.block` after `.line-clamp-*`, which disables the clamp. | investigation-notes, design-spec | `autobyteus-web/docs/projects.md` (implementation commit) |
| Card text bounds | 300 characters per card line before rendering; 120 for one-line labels | design-spec | `autobyteus-web/docs/projects.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `block line-clamp-2` card spans (clamp silently disabled) | `line-clamp-2` alone, plus `taskCardSummary` / `taskCardPreview` / `taskSummaryLabel` | `autobyteus-web/docs/projects.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: write the handoff summary and release notes, then hold for user verification.
- Notes: The Product design repository's copy of `ProjectTaskRow.vue` has the same class conflict (informational, from the design-spec). It is outside this repository and was not changed by delivery.
