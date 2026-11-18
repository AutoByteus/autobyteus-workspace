# Docs Sync Report — fastify5-and-spreadsheet-parser

## Scope

- Ticket: `fastify5-and-spreadsheet-parser` (autobyteus-248 Fastify 5 / mercurius 16 / gateway lockfile and Docker; autobyteus-249 spreadsheet parser)
- Trigger: code review CRR-003 Pass after API/E2E API-REV-001 Pass (95%), handoff from `/software_engineering_team/code_reviewer`
- Classification (unchanged): `task_size` `Medium`, `architectural_risk` `High`, route `Reviewed` (architecture review, code review, API/E2E, test-code review)
- Bootstrap base reference: `origin/personal` at `ddd6fdcdf6`
- Integrated base reference used for docs sync: `origin/personal` at `72048f5b87`, merged into the ticket branch as `2b166a2f9f`
- Post-integration verification reference: `evidence/DLV-01` … `DLV-05` (all pass on `2b166a2f9f`)

## Why Docs Were Updated

- Summary: the implementation already updated the two long-lived docs whose content this change touches: the gateway's install model (own pnpm workspace and lockfile, `onlyBuiltDependencies` instead of `pnpm approve-builds`) and the web file viewer (SheetJS CE from the pinned CDN tarball, `.xlsm`, sanitised table output, hyperlinks shown as text). Delivery reviewed both against the integrated state and found them accurate; no further edit was needed.
- Why this should live in long-lived project docs: anyone installing the gateway or building its image needs the workspace/lockfile model; anyone touching the viewer needs to know the parser source and the sanitiser contract (REQ-011), which a later dependency bump could otherwise silently break.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-message-gateway/README.md` | Gateway install model and Docker build changed | Updated (in code commit `5c7ab7426c`) | Install section and the personal-session build-script note match `pnpm-workspace.yaml` and `package.json` `packageManager`. Docker compose commands unchanged and still valid (IMP-18, IMP-20) |
| `autobyteus-web/docs/content_rendering.md` | Viewer parser and output changed | Updated (in code commit `195db3c42e`) | Matches `ExcelViewer.vue` (DOMPurify allowlist proven in API-08's mobile bundle line and IMP-02) |
| `autobyteus-web/docs/file_explorer.md` | Lists `ExcelViewer.vue` | No change | Mentions the file path only |
| `autobyteus-server-ts/README.md` | Says "Fastify-based server" | No change | No version or GraphiQL mention |
| `autobyteus-server-ts/docker/README.md` L520 | Claims the gateway Dockerfile declares the same licence files and label as the server image | No change | Still true after IR-002: `COPY LICENSE LICENSING.md NOTICE /app/` and the `AGPL-3.0-only` label are kept |
| Repository-wide `*.md` outside `tickets/` | Search for `graphiql`, `fastify 4`, `mercurius 13`, `xlsx 0.18`, `disableRequestLogging` | No change | No long-lived doc ever documented GraphiQL, so DEC-001 (GraphiQL off) leaves nothing stale |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-message-gateway/README.md` | New section + corrected note (implementation) | `## Install`: own workspace, own lockfile, frozen install, `pnpm audit`, pinned pnpm, `onlyBuiltDependencies`; `pnpm approve-builds` step replaced | REQ-005..007 |
| `autobyteus-web/docs/content_rendering.md` | Table row + paragraph (implementation) | `.xlsm` added; parser source and sanitiser contract described | REQ-009..011 |

No delivery-authored doc edits.

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Gateway packaging | The gateway is a separate pnpm workspace with its own lockfile; the image installs only from it | `design-spec.md`, `implementation-handoff.md` | `autobyteus-message-gateway/README.md` |
| Viewer sanitiser | Sheet HTML is reduced to table structure; cells cannot inject markup or links | `design-spec.md`, `requirements-doc.md` REQ-011 | `autobyteus-web/docs/content_rendering.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| `xlsx` 0.18.5 from npm | SheetJS CE 0.20.3 tarball from `cdn.sheetjs.com`, integrity-pinned | `autobyteus-web/docs/content_rendering.md` |
| Gateway installed through the root workspace; `pnpm approve-builds` | Gateway's own `pnpm-workspace.yaml` + `pnpm-lock.yaml`; `onlyBuiltDependencies` | `autobyteus-message-gateway/README.md` |
| `/graphiql` on the studio server | Removed (404), DEC-001 | Not in any long-lived doc before or after; recorded in the ticket's requirements DEC-001 |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, verification record, archive the ticket, finalize into `origin/personal`
- Notes: FU-008 (`FSTDEP023` startup deprecation) is a log-only follow-up; no doc describes startup log output.
