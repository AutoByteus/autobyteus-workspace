# Docs Sync Report

## Scope

- Ticket: `stream-parser-server-basics`
- Trigger: Code-review round 3 passed after API/E2E durable validation re-review for the Server Settings -> Basics Streaming parser card and predefined `AUTOBYTEUS_STREAM_PARSER` metadata.
- Bootstrap base reference: `origin/personal @ 7738faa4956cd9925825e24baae77bb1a47a81a4`.
- Integrated base reference used for docs sync: `origin/personal @ 7738faa4956cd9925825e24baae77bb1a47a81a4`.
- Post-integration verification reference: Delivery refresh on 2026-05-08 ran `git fetch origin --prune` and confirmed `HEAD`, merge-base, and latest `origin/personal` were all `7738faa4956cd9925825e24baae77bb1a47a81a4`; focused delivery checks then passed (`git diff --check`, server GraphQL E2E 9 tests, web Basics panel 3 tests). A second `git diff --check` after docs/release-note/report edits also passed.

## Why Docs Were Updated

- Summary: The final implementation adds a user-visible **Streaming parser** card to Server Settings -> Basics. The Basics card intentionally exposes a two-state XML override: on saves `AUTOBYTEUS_STREAM_PARSER=xml`; off saves the canonical provider-native/default value `api_tool_call`. Advanced/API remain the expert path for the full runtime value set (`xml`, `json`, `sentinel`, `api_tool_call`). The backend now treats `AUTOBYTEUS_STREAM_PARSER` as predefined, editable, non-deletable, normalized, and validated metadata rather than an opaque custom setting.
- Why this should live in long-lived project docs: Operators need to know where the new Basics control lives, what the toggle writes, how non-XML Advanced values behave, which values are still valid through Advanced/API, and that changes affect future streamed agent responses rather than already-active streams. Runtime docs/examples also need the complete canonical parser value set and default behavior.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | Canonical Settings page behavior documentation. | Updated | Added the Streaming parser card to the Server Settings Basics card list, documented toggle on/off mappings, non-XML Advanced behavior, future-stream effect, and predefined Advanced metadata/validation. |
| `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` | Canonical runtime parser/formatter behavior doc referenced by streaming docs. | Updated | Replaced stale `xml|json` and `xml default` wording with the full canonical value set and `api_tool_call` default/provider-native behavior. |
| `autobyteus-ts/examples/agent-team/README.md` | Example operator guidance for running team examples with parser overrides. | Updated | Added `sentinel` to the listed valid `AUTOBYTEUS_STREAM_PARSER` override values. |
| `autobyteus-ts/docs/streaming_parser_design.md` | Runtime streaming parser design doc. | No change | Already lists `xml`, `json`, `sentinel`, `api_tool_call` and documents `api_tool_call` as the unset default. |
| `autobyteus-ts/docs/api_tool_call_streaming_design.md` | Provider-native API tool-call streaming design doc. | No change | Already lists the full `AUTOBYTEUS_STREAM_PARSER` value set for API tool-call mode context. |
| `README.md` | Root operator/release guidance. | No change | Existing runtime override section is Codex-sandbox-specific; the canonical user-facing Server Settings behavior belongs in `autobyteus-web/docs/settings.md`, while parser runtime semantics remain in `autobyteus-ts/docs/*`. |
| `autobyteus-server-ts/README.md` | Server README/operator quick reference. | No change | Existing runtime override section is Codex-sandbox-specific; no general server-settings catalog exists here. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/settings.md` | User-facing Settings docs | Added `Streaming parser` to Basics, documented `StreamingParserCard.vue`, `xml` on-save, `api_tool_call` off-save, Advanced full value set, non-XML preservation unless explicitly saved, future-stream scope, and predefined/non-deletable validation metadata. | Keeps user/operator docs aligned with the new Basics card and backend metadata behavior. |
| `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` | Runtime parser/formatter docs | Updated override syntax to `xml|json|sentinel|api_tool_call`, removed stale `xml` default wording, and clarified that unset/invalid values default to `api_tool_call`. | Promotes the canonical value/default contract that server metadata now validates. |
| `autobyteus-ts/examples/agent-team/README.md` | Example runtime guidance | Added `sentinel` to the accepted parser override list. | Prevents example docs from preserving an incomplete value set. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Basics Streaming parser UX | Basics intentionally exposes a two-state XML override, not a full strategy selector. On saves `xml`; off saves `api_tool_call`. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/settings.md` |
| Advanced/API expert value set | `xml`, `json`, `sentinel`, and `api_tool_call` remain valid through Advanced/API; unsupported values are rejected instead of persisted. | `requirements.md`, `design-spec.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/settings.md`, `autobyteus-ts/docs/tool_call_formatting_and_parsing.md`, `autobyteus-ts/examples/agent-team/README.md` |
| Provider-native default | Unset/invalid parser configuration resolves to `api_tool_call`; disabling the Basics XML override saves that canonical value. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/settings.md`, `autobyteus-ts/docs/tool_call_formatting_and_parsing.md` |
| First-class predefined server setting | `AUTOBYTEUS_STREAM_PARSER` is predefined, editable, non-deletable, normalized/validated metadata in Advanced rather than an opaque custom key. | `requirements.md`, `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md`, `review-report.md` | `autobyteus-web/docs/settings.md` |
| Future-stream effect | Saved values apply to future streamed agent responses; active streams are not mutated in place. | `design-spec.md`, `implementation-handoff.md`, `api-e2e-validation-report.md` | `autobyteus-web/docs/settings.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Advanced-only discovery/editing of `AUTOBYTEUS_STREAM_PARSER` for the common XML override | Server Settings -> Basics `StreamingParserCard.vue` plus the retained Advanced/API expert path | `autobyteus-web/docs/settings.md` |
| Opaque custom-setting treatment of `AUTOBYTEUS_STREAM_PARSER` | Predefined editable/non-deletable metadata with normalization/validation | `autobyteus-web/docs/settings.md` |
| Incomplete runtime-doc override value set (`xml|json`) and stale `xml` default wording | Canonical `xml`, `json`, `sentinel`, `api_tool_call` value set with unset/invalid default `api_tool_call` | `autobyteus-ts/docs/tool_call_formatting_and_parsing.md`, `autobyteus-ts/examples/agent-team/README.md` |
| Manager-owned Basics composition documentation impact | No user-doc replacement needed; split is internal/source-level and remains covered by code review/validation artifacts | `design-spec.md`, `implementation-handoff.md`, `review-report.md`, `api-e2e-validation-report.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the current integrated/reviewed/validated candidate. Delivery can hand off for user verification. Repository finalization, ticket archival, push/merge, release, deployment, and cleanup remain on hold pending explicit user completion/verification.

## Blocked Or Escalated Follow-Up (Use Only If Docs Sync Cannot Complete)

- Classification: `N/A`
- Recommended recipient: `N/A`
- Why docs could not be finalized truthfully: `N/A`
