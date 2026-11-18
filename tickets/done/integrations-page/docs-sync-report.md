# Docs Sync Report — integrations-page (autobyteus-337, Integrations page)

## Scope

- Ticket: `integrations-page` (Project Task `autobyteus-337`); `task_size=Large`, `architectural_risk=High`, reviewed route (architecture review Pass; CRR-001 Pass; CRR-002 test-code review Pass)
- Trigger: the code reviewer's delivery handoff after CRR-002; API/E2E Pass `API-REV-001` (95.4%)
- Bootstrap base: `origin/personal` @ `0295553657`; integrated base: `origin/personal` @ `ec3f721622` (65 commits), merged as `99ccc2ef5c`
- Post-integration verification: `evidence/DR-01` … `DR-04`
- Second repository (AC-009): `AutoByteus/autobyteus-integrations`, README

## Why Docs Were Updated

- The implementation updated the long-lived docs, checked by the code reviewer:
  - `autobyteus-server-ts/docs/modules/credential_proxy.md` (the skill access rule, the catalog, the refusal texts) and `skills.md`;
  - the new `autobyteus-web/docs/integrations.md`;
  - `autobyteus-web/docs/settings.md` (the GitHub section replaced by a pointer to the page);
  - `GLOSSARY.md`;
  - `TESTING.md`.
- AC-009: the README of the integrations repository describes installing through the page. The Solution Designer's branch `codex/integrations-page-readme` @ `696758f` was reviewed and finalized by delivery.

## Long-Lived Docs Reviewed

| Doc Path | Result | Notes |
| --- | --- | --- |
| `autobyteus-server-ts/docs/modules/credential_proxy.md`, `skills.md` | No change | The base touched neither (the only shared files were `build-studio-server.ts`, `generated/graphql.ts` and `autobyteus-web/package.json`) |
| `autobyteus-web/docs/integrations.md`, `settings.md` | No change | `settings.md` "Server Settings: GitHub (moved)" points to the page. A search for the old card (`GitHubIntegrationCard`, `setAgentAccess`, "GitHub card") finds only that pointer, the note in `credential_proxy.md` about a token from the earlier card, and the ignored build copy under `autobyteus-web/resources/` |
| `GLOSSARY.md`, `TESTING.md` | No change | Not touched by the base |
| `AutoByteus/autobyteus-integrations` `README.md` (AC-009) | Updated by delivery | See below |

## Docs Updated (by delivery)

| Doc Path | What Changed | Why |
| --- | --- | --- |
| `autobyteus-integrations` `README.md`, commit `f9351bb` on `codex/integrations-page-readme` | "Needs an AutoByteus with the Integrations page (the release after `v1.5.11-beta.4`)" becomes "Needs an AutoByteus version that has the **Integrations** page (main menu → Integrations; `v1.5.11-beta.9` and earlier don't have it)" | Betas `v1.5.11-beta.5` … `beta.9` were published since and don't have the page, so "the release after beta.4" was false. The new wording stays true whichever release first ships the page |

The rest of the README change (`696758f`) was checked against the merged product and matches it:
- Import (link or folder) → Connect on the card → add `github-integration` to an agent (all-installed agents already have it);
- Manage sources;
- removing the source also removes the connection;
- the old "Settings → Server Settings → Basics → GitHub" steps and the "will move to a coming Integrations page" sentence are gone.

## Follow-ups

- None new from delivery. FU-001…FU-004 are in `follow-ups.md`.

## Delivery Continuation

- Result: `Pass`
