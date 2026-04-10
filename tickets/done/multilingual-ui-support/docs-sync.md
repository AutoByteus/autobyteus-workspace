# Docs Sync

## Scope

- Ticket: `multilingual-ui-support`
- Trigger: `Review round 6 passed after the broader zh-CN completeness fixes and the approved CR-003 provider-settings structural rework preserved localization behavior under validation round 9.`

## Why Docs Were Updated

- Summary: `Long-lived docs now describe the delivered multilingual UI foundation, Settings -> Language UX, the required localization guard/audit workflow, the approved zh-CN shared-shell glossary, and the durable catalog-testing/manual-overlay approach used to keep generated zh-CN copy product-correct.`
- Why this should live in long-lived project docs: `Locale resolution, bootstrap gating, localization validation, product-critical zh-CN terminology, and the durable way to normalize generated locale copy are project behaviors rather than ticket-local implementation details.`

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/README.md` | checked whether the broader zh-CN sweep or provider-settings split needed an additional entrypoint update | No change | the current localization overview already remained accurate at README scope |
| `autobyteus-web/docs/settings.md` | checked whether the provider settings structural split changed user-facing Settings documentation | No change | the API Keys user-facing behavior remained the same even though the implementation owner layout changed |
| `autobyteus-web/docs/localization.md` | canonical localization doc needed the broader zh-CN consistency/testing/manual-overlay guidance from the final pass state | Updated | now covers manual override ownership for generated copy, normalized shared zh-CN wording, and durable catalog-test guidance |
| `autobyteus-web/docs/tools_and_mcp.md` | checked because Settings now cross-links its embedded Local Tools / MCP sections to this module doc | No change | existing module documentation already remained accurate |
| `autobyteus-web/ARCHITECTURE.md` | checked whether the localization foundation required an additional high-level architecture update | No change | README + new localization doc were sufficient for the durable scope delivered here |

## Docs Updated

| Doc Path | Type Of Update | What Was Added / Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/localization.md` | Canonical subsystem doc update | documented generated-copy normalization through manual locale owners, durable zh-CN shared wording beyond the shell glossary, and catalog-test guidance for product-critical wording | preserve durable implementation and contributor knowledge outside the ticket artifacts |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Localization bootstrap gate | product UI stays behind a neutral surface until localization finishes booting, but English fallback still releases the app on bootstrap failure | `proposed-design.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/localization.md`, `autobyteus-web/README.md` |
| Locale resolution contract | `system` mode resolves through browser locales in web mode and `app.getLocale()` in Electron, with unsupported locales falling back to English | `proposed-design.md`, `implementation-handoff.md`, `review-report.md` | `autobyteus-web/docs/localization.md`, `autobyteus-web/docs/settings.md` |
| Localization enforcement workflow | future UI work must stay on the localization boundary and run the guard/audit commands before shipping | `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/localization.md` |
| Shared-shell zh-CN glossary | the approved Chinese shell terminology for shared navigation labels is centralized in the shared shell catalog and protected with durable catalog coverage | `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/localization.md` |
| Generated-copy normalization | product-critical zh-CN copy may need manual catalog normalization on top of generated locale content, and those decisions should be protected by durable catalog tests | `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/localization.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| ad hoc inline product-owned English UI copy across reviewed surfaces | localization catalogs plus the shared runtime exposed through `$t(...)` / `useLocalization()` | `autobyteus-web/docs/localization.md` |
| Settings page without a language-management section | `Settings -> Language` with `System`, `English`, and `简体中文` | `autobyteus-web/docs/settings.md` |
| incorrect zh-CN shared-shell navigation wording (`代理`, `代理团队`) | corrected shared glossary (`智能体`, `智能体团队`) in the zh-CN shell catalog | `autobyteus-web/docs/localization.md` |
| inconsistent/generated zh-CN shared action and product wording (`Run`, `工作空间`, `队伍`, etc.) | normalized shipped product wording through manual locale catalog owners plus durable consistency tests | `autobyteus-web/docs/localization.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: `Docs sync is complete and refreshed for the broader zh-CN completeness pass and final CR-003 closure. Ticket handoff is ready again, but archival/commit/push/merge/release/deployment remain on hold until explicit user verification.`
