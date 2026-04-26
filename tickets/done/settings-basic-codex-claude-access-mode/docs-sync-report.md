# Docs Sync Report

## Scope

- Ticket: `settings-basic-codex-claude-access-mode`
- Trigger: Fresh toggle-flow API/E2E validation pass after requirements/design rework replaced the prior three-option Basic selector with one Codex full-access toggle.
- Bootstrap base reference: `origin/personal @ 81f6c823a16f54de77f426b1bc3a7be50e6c843d`.
- Integrated base reference used for docs sync: `origin/personal @ 376f431b7d7945feff385493d7a55bcbfcc5a469`.
- Post-integration verification reference: Delivery refresh on 2026-04-26 confirmed `HEAD @ 5dbcbcbbe65e9f4781668e8f6d296a93c64553f7` already contained latest `origin/personal` (`HEAD..origin/personal = 0`); no new base commits were integrated after the fresh API/E2E pass.

## Why Docs Were Updated

- Summary: The current authoritative implementation exposes a **single Codex full-access toggle** in Server Settings Basics. Toggle on saves `CODEX_APP_SERVER_SANDBOX=danger-full-access`; toggle off saves `workspace-write`. Advanced/API behavior remains three-valued for runtime-valid Codex sandbox values (`read-only`, `workspace-write`, `danger-full-access`) with invalid-alias rejection.
- Why this should live in long-lived project docs: The feature is user-facing and operator-facing. Future users and maintainers need to understand the Basic toggle semantics, the lower-level backing server setting, the Advanced/API value set, the full-access warning, and that changes apply only to new/future Codex sessions.

This report supersedes the stale prior selector-flow docs sync artifact from the same ticket folder.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `README.md` | Root operator guidance already documents runtime sandbox overrides. | Updated | Now documents the Basic UI path as `Settings -> Server Settings -> Basics -> Codex full access`, toggle on/off backing values, Advanced/API value set, default, future-session effect, and full-access warning. |
| `autobyteus-server-ts/README.md` | Server/operator README already documents coding runtime sandbox override env vars. | Updated | Mirrors the product UI path and scripted/headless env guidance while keeping Claude permission mode separate. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Canonical server-side Codex runtime architecture doc. | Updated | Documents `CODEX_APP_SERVER_SANDBOX`, canonical runtime values, Basic toggle semantics, Advanced Settings validation, future-session-only effect, `autoExecuteTools` separation, and the shared runtime-management owner. |
| `autobyteus-web/docs/settings.md` | Canonical Settings page docs. | Updated | Documents `CodexFullAccessCard` in Server Settings Basics, toggle on/off mappings, Advanced/API behavior, warning copy, and future-session effect. |
| `autobyteus-web/README.md` | Frontend README contains test/build guidance but no durable Server Settings behavior reference. | No change | `autobyteus-web/docs/settings.md` is the canonical frontend settings behavior doc. |
| `autobyteus-web/docs/agent_execution_architecture.md` | Reviewed for launch/runtime config overlap. | No change | It covers agent execution/launch configuration, not env-backed server sandbox settings. |
| `autobyteus-server-ts/docs/modules/agent_execution.md` | Reviewed for generic agent execution overlap. | No change | Codex-specific sandbox semantics belong in `codex_integration.md`. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `README.md` | Operator/runtime guidance | Added the Codex full-access Basic UI path, toggle on/off mappings, Advanced/API value set, default, new-session-only scope, and full-access safety warning. | Keeps root project guidance aligned with the current UI and backing env setting. |
| `autobyteus-server-ts/README.md` | Server/operator guidance | Added the Codex full-access UI path and current backing semantics while preserving Claude permission-mode guidance as separate. | Prevents operators from conflating Codex filesystem sandboxing with Claude permission mode. |
| `autobyteus-server-ts/docs/modules/codex_integration.md` | Runtime architecture docs | Added/updated `Sandbox Mode Configuration` and listed `src/runtime-management/codex/codex-sandbox-mode-setting.ts` as a thread/runtime bridge component. | Promotes the shared server-side sandbox owner and records runtime timing semantics. |
| `autobyteus-web/docs/settings.md` | User-facing Settings docs | Documents `CodexFullAccessCard`, one-toggle Basic behavior, Advanced/API accepted values, invalid-value rejection, warning, and future-session effect. | Matches the reworked Basic Settings user journey. |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Basic Codex full-access UX | Basics intentionally exposes one toggle, not a three-option selector. On saves `danger-full-access`; off saves `workspace-write`. | `requirements.md`, `upstream-rework-note.md`, `design-spec.md`, `implementation-handoff.md`, `validation-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Advanced/API still three-valued | `read-only`, `workspace-write`, and `danger-full-access` remain valid through Advanced/API; invalid aliases are rejected. | `requirements.md`, `design-spec.md`, `validation-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Future-session runtime effect | Saved changes are read by new/future Codex bootstrap/restore paths; active sessions are not mutated in place. | `requirements.md`, `design-spec.md`, `validation-report.md`, `review-report.md` | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Shared server-side semantics owner | `src/runtime-management/codex/codex-sandbox-mode-setting.ts` owns the key/default/value list/normalizer consumed by settings metadata and Codex runtime paths. | `design-spec.md`, `implementation-handoff.md` | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Approval setting separation | `autoExecuteTools` remains approval behavior, not filesystem sandbox mode; Claude remains unchanged. | `requirements.md`, `design-spec.md`, `upstream-rework-note.md`, `validation-report.md` | `autobyteus-server-ts/README.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Prior Basic three-mode selector flow / `CodexSandboxModeCard` workflow evidence | Current one-toggle `CodexFullAccessCard` flow | `autobyteus-web/docs/settings.md`, this docs sync report, `validation-report.md` Round 2 |
| Bootstrapper-local duplicate Codex sandbox default/value constants | Shared `src/runtime-management/codex/codex-sandbox-mode-setting.ts` owner | `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Advanced Settings treating `CODEX_APP_SERVER_SANDBOX` as opaque custom setting | Predefined editable/non-deletable setting metadata with allowed-value validation | `autobyteus-web/docs/settings.md`, `autobyteus-server-ts/docs/modules/codex_integration.md` |
| Env-only discovery for enabling Codex full filesystem access | Basic Settings `CodexFullAccessCard` plus env-backed server-setting support | `README.md`, `autobyteus-server-ts/README.md`, `autobyteus-web/docs/settings.md` |

## Delivery Continuation

- Result: `Pass`
- Next owner: `delivery_engineer`
- Notes: Docs sync is complete for the current toggle-flow implementation. Prior selector-flow delivery artifacts are superseded. Delivery can prepare the handoff and wait for explicit user verification before ticket archival, push, merge, release/deployment, or cleanup.
