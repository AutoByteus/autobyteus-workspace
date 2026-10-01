# Docs Sync Report — external-messaging-agent-participant-redesign

## Scope

- Ticket: `external-messaging-agent-participant-redesign` (remove external messaging from the main product)
- Trigger: `/code_reviewer` delivery package after CRR-005 (`Not Applicable`, no durable API/E2E test change), API-REV-002 `Pass` at 95.3%, and CRR-004 `Pass` on `40f769e0d`
- Classification (carried, unchanged): `task_size=Large`, `architectural_risk=High`. Route: reviewed (Architecture Review → Code Review → API/E2E → proportional test-code review).
- Bootstrap base reference: `origin/personal` @ `40b1783f4`
- Integrated base reference used for docs sync: `origin/personal` @ `fdbd07124` (v1.4.79), merged into the ticket branch as `b818a6860`
- Post-integration verification reference: `release-deployment-report.md` → "Initial Delivery Integration Refresh"; logs in `delivery-evidence/D-01` to `D-08`

## Why Docs Were Updated

- Summary:
  - The implementation already removed or reworded every messaging passage across 32 long-lived docs (root, server, web, Docker, `autobyteus-ts`, and the web UI prototypes). The base merge did not reintroduce any, and every doc edit survived the merge intact.
  - Delivery added two things that were still recorded only in ticket artifacts:
    1. The operator-facing contract of the new destructive startup migration and the Prisma table drop.
    2. The architectural boundary that chat platforms sit outside the server and integrate through MCP servers plus skills.
- Why this should live in long-lived project docs:
  - The cleanup migration permanently deletes user data, including bot tokens and several GB of runtimes, with no backup. Operators and future maintainers need its exact scope, failure behavior, and non-covered leftovers next to the other required startup migrations.
  - The boundary rule stops messaging code from quietly returning to the product. It also points future integrators at the supported path: MCP servers plus skills.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | "Production data migrations" lists required startup data transitions | `Updated` | Added the `20260924_remove_external_messaging_data` + Prisma `20260924120000_remove_external_channel_tables` paragraph |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | Server module boundaries; the implementation removed the External-Channel sections | `Updated` | Added the chat-platform boundary paragraph under "Module Boundaries" |
| `autobyteus-server-ts/docs/design/startup_initialization_and_lazy_services.md` | Startup ordering and the app-data migration runner | `No change` | Describes runner semantics and selected migration order. The cleanup is a registry-appended, prerequisite-free migration, so the generic runner text is accurate. |
| `autobyteus-server-ts/docs/modules/agent_team_execution.md`, `run_history.md` | Both auto-merged with base edits | `No change` | Ticket edits intact. The base's run-history changes introduced no messaging content (`git diff 40f769e0d` shows no channel/messaging/external lines). |
| `autobyteus-server-ts/docs/modules/mcp_server_management.md`, `skills.md` | The supported integration path for future messaging (REQ-116) | `No change` | MCP/skills behavior is unchanged (BEH-108, AC-118 proven in L-07). The new ARCHITECTURE paragraph links to them. |
| Root `README.md` (workspace packages, release workflows, version sync, release helper) | Release/packaging truth after REQ-117 | `No change` | The implementation already dropped the gateway package, workflow, and manifest text, and it matches the integrated `scripts/desktop-release.sh`. |
| `docker/README.md`, `autobyteus-server-ts/docker/*` | Docker all-in-one and server image | `No change` | The all-in-one README no longer lists the gateway or `gateway.log`. The server release image (`Dockerfile.monorepo`) has no messaging references. |
| `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md`, `github-actions-tag-build.md`, web `README.md`, `.env.local.example` | Settings sections, stream event table, release docs | `No change` | Already updated by the implementation. The streaming event table no longer lists the removed event. |
| `.github/release-notes/release-notes.md` | CR note: the published v1.4.78 text said "messaging bindings" | `No change` | After the merge the file is the published v1.4.79 note, with 0 "messaging" matches. The ticket's `release-notes.md` replaces it at the next release. |
| Remaining "messaging" matches in long-lived docs | REQ-120 residue check | `No change` | Only generic inter-agent messaging text (`agent_team_execution.md`, `agent_tools.md`, `codex_integration.md`, `prompt_engineering.md`, `skill_improvement.md`, root `README.md` L30). These are not the external feature. |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/README.md` | New paragraph in "Production data migrations" | Documents the migration: permanent no-backup deletion of the four roots (described without REQ-120 path identifiers), skip on missing, and FAILED-without-blocking with retry on next start. Also the scope limit, the source file and registry reference, the Prisma orphan-table drop, history preservation, and that the Docker all-in-one `gateway.log` and gateway-memory volume are not removed. | Operator knowledge for a destructive required migration (REQ-114, QR-104, QR-105, design R-3) |
| `autobyteus-server-ts/docs/ARCHITECTURE.md` | New paragraph in "Module Boundaries" | External chat platforms are outside the server. There is no chat ingress, binding model, managed gateway runtime, or outbound chat delivery, and runs start only through normal launch paths. Integrations are separate projects consumed as MCP servers plus skills. | Durable boundary from the approved product model (REQ-101 to REQ-103, DEC-108) |

Both edits avoid the REQ-120 identifiers and the supplementary residue patterns. The gate rerun after docs sync (`delivery-evidence/D-06-req120-gate-after-docs-sync.log`) matches the post-merge gate (`D-01`) exactly: the content gate hits only the 4 allowed registry lines, and the path gate is empty.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Messaging data cleanup on upgrade | Exact deleted scope, no backup, non-blocking failure and retry, orphan tables dropped by Prisma, and leftovers outside scope | `design-spec.md` (Persisted Data A/B, DS-007, R-3), `requirements.md` REQ-114 | `autobyteus-server-ts/README.md` → Production data migrations |
| Chat-platform boundary | The platform holds no provider or messaging code, and integrations arrive as MCP servers plus skills | `requirements.md` (desired outcome, REQ-101 to REQ-103, DEC-108), `product-model-analysis.md` | `autobyteus-server-ts/docs/ARCHITECTURE.md` → Module Boundaries |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Server external-channel subsystem, managed messaging gateway, channel REST/GraphQL APIs, the `EXTERNAL_SIGNATURE` route class | Nothing (removed). Future integrations use MCP servers plus skills. | `ARCHITECTURE.md` Module Boundaries (new); sections removed by the implementation from `ARCHITECTURE.md`, `PROJECT_OVERVIEW.md`, `URL_GENERATION_AND_ENV_STRATEGY.md`, `features/remote_access.md` |
| Web Settings → Messaging and `docs/messaging.md` | Nothing. The old deep link falls back to API Keys. | `autobyteus-web/docs/settings.md` (implementation) |
| The removed live stream event in the contracts, server, and web | Nothing | `autobyteus-web/docs/settings.md` event table, `design/agent_websocket_streaming_protocol.md` (implementation) |
| Gateway release workflow, gateway release assets, gateway version and manifest sync | Desktop/Android/iOS/server-Docker releases only; the web version is the single synced version | Root `README.md` release section (implementation) |
| Messaging data on disk plus the orphan DB tables | Startup cleanup migration plus Prisma drop | `autobyteus-server-ts/README.md` Production data migrations (new) |

## No-Impact Decision

Not applicable: docs were updated.

## Upstream Artifact Wording Notes (Not Long-Lived Docs; Owned By Solution Designer)

The code reviewer flagged two optional wording corrections in Solution Designer-owned ticket artifacts. Delivery does not rewrite upstream-owned design authority, so they are carried to Solution Designer in the terminal package:

1. `design-spec.md` Removal Plan row "Web streaming …" and `investigation-notes.md` AE-06 list the AgentOrg `onAcceptedExternalUserMessage` hook as messaging. It is not messaging: it serves the web user's own AgentOrg `SEND_MESSAGE` acceptance and was correctly kept (DV-1, accepted in CRR-001 to CRR-004).
2. The design's "REQ-120 Verification Gate" should state that it covers tracked file paths (`git ls-files`) as well as file contents. The content-only reading missed CR-002 (G-01).

## Delivery Continuation

- Result: `Pass`
- Next delivery action: hold for explicit user verification (see `handoff-summary.md`). After verification: archive the ticket, commit, push, merge into `personal`, run the release if the user requests one, clean up, and return the terminal package.
- Notes: the docs edits sit uncommitted on top of merge `b818a6860` and will be committed with the ticket archive after verification.
