# Docs Sync Report — composer-context-file-removal

## Scope

- Ticket: `composer-context-file-removal` (Project Task `project_task_9261def1-bb86-494f-aa1a-bbd643e2f9a4`)
- Trigger: CRR-002 (post-API/E2E test-code review) Pass → delivery.
- Classification (preserved): `task_size=Medium`, `architectural_risk=High`. Route: reviewed.
- Bootstrap base reference: `origin/personal` @ `46e94fdea`
- Integrated base reference used for docs sync: `origin/personal` @ `46e94fdea`. Fetched 2026-10-09; the branch is already current.
- Post-integration verification reference: `release-deployment-report.md` § Initial Delivery Integration Refresh (`delivery-evidence/dr1-*.log`).

## Why Docs Were Updated

- Summary:
  - Draft context files are now read and deleted through one codec-driven `GET`/`DELETE /rest/drafts/*` route pair with one error mapping.
  - The web client deletes at the attachment's own locator.
  - The composer deletes only its own drafts, shows attach and remove failures, and gates uploads on an upload owner.
  - The long-lived docs still described per-kind draft routes, including a collaboration "route" that had no DELETE, and did not describe removal or error behavior.
- Why this should live in long-lived project docs:
  - The codec rule keeps future owner kinds from reintroducing the defect. It must be visible to anyone adding a run kind (QR-001).
  - The composer's own-draft rule (REQ-003) is a non-obvious product invariant.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result | Notes |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Canonical context-file URL/serving doc | `Updated` | § URL / Serving Strategy |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Lists the delegated-child draft "route" | `Updated` | § Context files |
| `autobyteus-web/docs/agent_execution_architecture.md` | Canonical web attachment orchestration | `Updated` | § Uploaded Context Attachment Orchestration, items 8–9 |
| `TESTING.md` | New probe section (API/E2E) | `Updated` | Delivery added the CF-004/CF-005 ordering note that the CRR-002 reviewer suggested |
| `autobyteus-server-ts/docs/features/remote_access.md`, `autobyteus-web/docs/remote_access.md` | Route policy for `/rest/drafts` | `No change` | The prefix policy is unchanged; it lists "drafts" generically |
| `autobyteus-web/docs/chat.md` | Composer and draft rows | `No change` | It covers chat drafts, not attachment removal; "draft uploads stay in place" is still true |
| `autobyteus-web/docs/agent_orgs.md`, `autobyteus-server-ts/docs/modules/agent_orgs.md` | Org draft owners | `No change` | No route literals or removal behavior described |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-server-ts/docs/FILE_RENDERING_AND_MEDIA_PIPELINE.md` | Contract | Adds the draft locator codec (build + `parseDraftContextFileLocator`), the single `GET`/`DELETE /rest/drafts/*` pair, the resolver's use of the codec, the error mapping (400/404/204/500), and that final routes remain per-kind | D1/D2, QR-001 |
| `autobyteus-server-ts/docs/modules/standalone_agent_run_root.md` | Correction | The collab draft path is described as a locator shape served by the universal routes | It previously read like a dedicated route (which lacked DELETE) |
| `autobyteus-web/docs/agent_execution_architecture.md` | Behavior | Item 8: delete at the attachment's own locator, the own-draft rule, cloning of drafts pasted from another composer, and the removed endpoint builder. Item 9: the `attachmentError` tray line, keep-on-failure and retry, `canUpload` gating, and that the store has no global error state | D3–D5, REQ-002..005 |
| `TESTING.md` | Test guide | Probe section (API/E2E), plus the ordering note for custom `--cases` | Reviewer's optional note |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Draft locator codec | Owner-kind path shapes live only in the codec; routes and the resolver derive from it | design-spec D1/D2 | `FILE_RENDERING_AND_MEDIA_PIPELINE.md` |
| Draft route error mapping | 400 descriptor, 404 owner/locator/missing on GET, 204 DELETE, 500 otherwise | design-spec § Interface Boundary Mapping | same |
| Client delete identity | Delete at the attachment's locator; never rebuild from the owner | design-spec D3 | `agent_execution_architecture.md` |
| Own-draft rule | Foreign or owner-less drafts are removed locally only (TTL reclaims them) | design-spec D4, REQ-003 | same |
| Visible errors and upload gating | `attachmentError`, `canUpload` | design-spec D5 | same |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Per-kind draft GET/DELETE routes in `context-files.ts` | `GET`/`DELETE /rest/drafts/*` via the codec | `FILE_RENDERING_AND_MEDIA_PIPELINE.md` |
| Per-kind draft regexes in `ContextFileLocalPathResolver` | `parseDraftContextFileLocator` | same |
| Web `buildDraftContextFileEndpoint` and the `owner` parameter of `deleteDraftAttachment` | Attachment's own locator (`utils/contextFiles/contextAttachmentUrl.ts`) | `agent_execution_architecture.md` |
| `contextFileUploadStore.error` | Composer-local `attachmentError` | same |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary → user verification hold.
- Notes: The docs edits are uncommitted in the worktree until finalization, together with the API/E2E test changes and the ticket artifacts.
