# Docs Sync Report

## Scope

- Ticket: `disable-broken-messaging-providers`
- Trigger: API/E2E validation passed, then user verified the post-rebase local macOS Electron build on 2026-06-06.
- Bootstrap base reference: `origin/personal` at `74c0fd5905c8` (`v1.3.44`) from ticket bootstrap.
- Integrated base reference used for docs sync: `origin/personal` at `c2317fa830af` (`v1.3.47`) after the user-requested rebase.
- Post-integration verification reference: `40fd4c149c69` plus local build/test evidence under `tickets/done/disable-broken-messaging-providers/validation-logs/`.

## Why Docs Were Updated

- Summary: Default managed messaging setup changed so WhatsApp Business and WeCom App are excluded from the normal setup surface. Discord Bot and Telegram Bot remain the visible configurable provider choices, and gateway-level lifecycle controls remain shared runtime controls.
- Why this should live in long-lived project docs: The visible default provider list and managed gateway status semantics affect normal user setup, support, and release metadata expectations.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/README.md` | User-facing managed messaging setup guide names default setup providers. | `Updated` | Retitled managed setup from WhatsApp/WeCom/Discord/Telegram to Discord/Telegram and recorded WhatsApp/WeCom as unsupported/non-default. |
| `autobyteus-web/docs/messaging.md` | Canonical messaging setup documentation describes provider selection and runtime layers. | `Updated` | Provider selection now describes active providers and records WhatsApp/WeCom/WeChat as excluded in current distribution. |
| `autobyteus-message-gateway/scripts/release-manifest.mjs` | Generated release metadata should not advertise WhatsApp/WeCom as selectable defaults. | `Updated` | `excludedProviders` now includes `WHATSAPP`, `WECOM`, and `WECHAT`. |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` | Bundled default manifest must match generated release metadata. | `Updated` | Manifest exclusions now include `WHATSAPP`, `WECOM`, and `WECHAT`; rechecked against `v1.3.47`. |
| Root `README.md` | Release workflow/build documentation was checked for messaging-provider default claims. | `No change` | No provider-list text needed updates. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/README.md` | User-facing product docs | Default managed messaging setup now names Discord and Telegram only; WhatsApp and WeCom instructions were removed from the normal setup flow; unsupported/non-default section records WhatsApp Business and WeCom App exclusions. | Prevents future users/support readers from treating broken providers as normal default choices. |
| `autobyteus-web/docs/messaging.md` | Canonical feature docs | Provider selection now says the default setup surface offers Discord Bot and Telegram Bot; WhatsApp Business, WeCom App, and WeChat are documented as excluded. | Aligns durable docs with runtime/UI behavior. |
| `autobyteus-message-gateway/scripts/release-manifest.mjs` | Release metadata generator | Adds WhatsApp and WeCom to generated `excludedProviders`. | Prevents generated runtime metadata from drifting back to old defaults. |
| `autobyteus-server-ts/src/managed-capabilities/messaging-gateway/release-manifest.json` | Bundled manifest metadata | Adds WhatsApp and WeCom to bundled `excludedProviders`. | Keeps packaged desktop/server metadata aligned with generated release metadata. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Managed messaging active providers | Normal setup cards are derived from active providers (`supportedProviders - excludedProviders`), not every supported provider. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/messaging.md`, `autobyteus-web/README.md` |
| Current provider exclusions | WhatsApp Business, WeCom App, and WeChat are excluded in the current managed distribution. | `requirements.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/messaging.md`, release manifest files |
| Shared gateway lifecycle | Gateway-level Disable remains a whole-runtime lifecycle action and is not provider-level disablement. | `requirements.md`, `api-e2e-validation-report.md` | Existing runtime-card docs remain accurate; no separate long-lived doc change needed. |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Default visible provider set of WhatsApp Business, WeCom App, Discord Bot, and Telegram Bot | Default visible provider set of Discord Bot and Telegram Bot only | `autobyteus-web/README.md`, `autobyteus-web/docs/messaging.md`, release manifest metadata |
| Frontend supported-provider-only capability derivation | Active-provider derivation that respects exclusions | Source/tests plus `autobyteus-web/docs/messaging.md` |

## No-Impact Decision (Use Only If Truly No Docs Changes Are Needed)

- Docs impact: `N/A`
- Rationale: Docs and release metadata had real impact and were updated.

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync completed against the post-rebase integrated state at `origin/personal` `c2317fa830af` plus ticket commit `40fd4c149c69`. User verified the rebuilt local Electron artifact before finalization.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
