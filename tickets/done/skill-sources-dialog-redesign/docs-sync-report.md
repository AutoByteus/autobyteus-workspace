# Docs Sync Report — skill-sources-dialog-redesign

## Scope

- Ticket: `skill-sources-dialog-redesign` (Project Task `project_task_957c30cd-001d-4766-9bbe-47ee71700ef1`)
- Trigger: API/E2E round 2 (API-REV-002) Pass at 95% → delivery.
- Classification (preserved): `task_size=Medium`, `architectural_risk=Low`. Route: direct. Architecture review, source review and test-code review: `Not Applicable`.
- Bootstrap base reference: `origin/personal` @ `d28c56d5d`
- Integrated base reference used for docs sync: `origin/personal` @ `d28c56d5d`. Fetched and checked with `git ls-remote` on 2026-10-10. The branch is already current, so no integration was needed.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh (`delivery-evidence/dr1-*.log`).

## Why Docs Were Updated

- Summary:
  - The implementation (IR-001) already rewrote `autobyteus-web/docs/skills.md` § Local and GitHub Sources and the module structure for the redesigned dialog.
  - Delivery checked that section against the final tree, IR-002 included. Two gaps remained:
    - the doc did not describe the keyboard behavior (REQ-008, IR-002);
    - the `TESTING.md` regression command did not run the new `utils/skills` helper spec.
- Why this should live in long-lived project docs:
  - The focus and Esc rules are user-visible behavior that a later change to the dialog or to `ConfirmationModal` could break.
  - `TESTING.md` is the canonical way to rerun the skill sources regression, so it must include every spec of the feature.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/skills.md` | The canonical doc for the Sources dialog | `Updated` | IR-001 rewrote § Local and GitHub Sources and the module tree. Delivery added the focus and Esc rules |
| `TESTING.md` § GitHub Skill Sources Regression | Probe selectors changed; new helper spec | `Updated` | Added `utils/skills` to the web test command. The probe description stays accurate |
| `autobyteus-server-ts/docs/modules/skills.md` | Server skill sources | `No change` | Server behavior is unchanged |
| `autobyteus-web/docs/agent_management.md` | Mentions **Check again** | `No change` | That text is about agent package rows, which this ticket does not change |
| `autobyteus-web/docs/skills.md` § duplicate names (`SkillSourcesModal` reference) | Conflict flow | `No change` | The modal still runs through `runWithSkillNameChecks` |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/skills.md` | Behavior (IR-001) | Compact rows, display name, counts, the single add input with URL detection, Browse…, text-only Update/Retry removal, **Try again** only after *Check failed*, the trash button, and the module tree with `utils/skills/skillSourceDisplay.ts` | REQ-001..007 |
| `autobyteus-web/docs/skills.md` | Behavior (delivery) | Focus moves in on open, Tab stays inside, focus returns after confirmations, operations and the duplicate-name dialog, and Esc is ignored while a confirmation is open | REQ-008, IR-002 |
| `TESTING.md` | Test guide (delivery) | `utils/skills` added to the `test:nuxt` command | The helper spec belongs to the regression |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Single add input | A value starting with `http://`, `https://`, `www.` or `github.com/` is imported as GitHub; anything else is added as a folder | requirements REQ-005, design-spec | `autobyteus-web/docs/skills.md` |
| Display name | `owner/repo`; the last folder segment, or `parent/skills` | REQ-002 | same |
| GitHub status actions | Update on Update available/failed; Try again only on Check failed; Retry removal on Removal incomplete; details in the tooltip and the Update confirmation | REQ-007 | same |
| Keyboard behavior | Focus in, Tab trap, focus restore, Esc rules | REQ-008, IR-002 | same |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Local/GitHub mode switch, Add Folder, Import repository | One **Add skill source** input with URL detection, plus Browse… | `autobyteus-web/docs/skills.md` |
| Always-visible **Check again** | Automatic check on open, plus **Try again** after *Check failed* | same |
| Full-width **Remove** button | Trash icon button with confirmation | same |
| Revision/branch/checked metadata on the row | Status tooltip and Update confirmation | same |
| 44 unused localization keys (en + zh-CN) | — (removed) | `implementation-handoff.md` § Legacy / Compatibility Removal Check |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, then the user's verification (AC-008).
- Notes: The test-only baseline fix `812a75c0a` (`github-skill-runtime-harness.ts`) needs no doc change. It aligns the harness with the current preparation guard API, and its assertions are unchanged.
