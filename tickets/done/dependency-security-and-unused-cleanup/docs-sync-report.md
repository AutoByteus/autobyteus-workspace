# Docs Sync Report — dependency-security-and-unused-cleanup

## Scope

- Ticket: `dependency-security-and-unused-cleanup`, Project Task `autobyteus-229`
- Trigger: code reviewer handoff after API/E2E Pass `API-REV-001` and test-code review `CRR-002` (Not Applicable); reviewed route, `task_size=Medium`, `architectural_risk=High`
- Bootstrap base reference: `origin/personal` @ `3b2c86ca9e`
- Integrated base reference used for docs sync: `origin/personal` @ `3b9014215e`, merged into the ticket branch as `1c0a0e4355`
- Post-integration verification reference: `evidence/DEL-01…DEL-04`

## Why Docs Were Updated

- Summary: two long-lived docs described dependency facts this ticket changes:
  - the Electron runtime baseline (`42.4.1` → `42.11.16`);
  - nothing recorded why `dompurify` is now pinned exactly at `3.4.7` (DEC-008).

  Both were updated. The `concurrently` mention the design and code review pointed at no longer exists outside `tickets/`. Every remaining match of the word in tracked files is the English adverb.
- Why this should live in long-lived project docs:
  - The Electron baseline doc is the reviewed source of the runtime pin (`RELEASE.md` Workflow Reference points to the same rule).
  - An exact `dompurify` pin without a reason invites someone to "fix" it, which would break the web tests.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` "Electron Runtime Baseline" | Electron pin | `Updated` | `electron@42.11.16` (Chromium 148, Node.js 24.19) |
| `autobyteus-web/docs/electron_packaging.md` "Build Commands" | removed `ts-node` (from `autobyteus-ts`) | `Needs follow-up` (FU-014) | Already wrong on base: `autobyteus-web` never depended on `ts-node`, and the real build is the `build:electron*` scripts. Not caused by this ticket |
| `autobyteus-web/docs/content_rendering.md` "Markdown Rendering" | `markdown-it` update, removed `markdown-it-katex`/`markdown-it-prism`, `dompurify` pin | `Updated` | Added the DOMPurify pin and its reason; the doc never named the removed plugins |
| all tracked docs outside `tickets/` | names of the 17 removed dependencies (`chart.js`, `vue-chartjs`, `diff-match-patch`, `html2canvas`, `jsonrepair`, `markdown-it-katex`, `markdown-it-prism`, `nuxt-electron`, `@vitejs/plugin-vue`, `concurrently`, `xmldom`, `dotenv`/`ts-node` in `autobyteus-ts`, `@types/node` in 4 packages) | `No change` | No doc names them as dependencies |
| `autobyteus-ts/docs/llm_module_design.md` | `undici` | `No change` | Describes the shared `undici.Agent`; still accurate on 7.30.1 |
| `RELEASE.md` | Electron baseline rule, release steps | `No change` | The rule is version-free; followed as written |
| `TESTING.md` Rule 9 | CRR-001 noted a conflict with this ticket's Non-Goals | `No change` | Not delivery's to settle; the code reviewer left it to the Solution Designer |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/electron_packaging.md` | Version fact | `electron@42.4.1` → `electron@42.11.16 (Chromium 148, Node.js 24.19)` | REQ-002; API-20 shows `process.versions.electron=42.11.16 chrome=148.0.7778.280 node=24.19.0` |
| `autobyteus-web/docs/content_rendering.md` | Dependency constraint | New paragraph: DOMPurify sanitizes rendered Markdown through one `sanitize(html, opts)` call. `dompurify` is pinned at 3.4.7 because 3.4.8+ loses headings under happy-dom. Lift the pin only with a test DOM that returns `nodeName`, and rerun `test:nuxt` | DEC-008, FU-009 |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Electron runtime baseline | Current exact pin and its Chromium/Node versions | `requirements-doc.md` DEC-002, `evidence/API-20-packaged-app.txt` | `electron_packaging.md` |
| DOMPurify pin | Why it is exact, and what lifting it needs | `requirements-doc.md` DEC-008, `evidence/IMP-09`, FU-009 | `content_rendering.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| 17 unused dependencies (list above) | nothing (dead) | Not doc-worthy; the manifests are the truth, and the ticket keeps the evidence (`evidence/IMP-05`) |
| `markdown-it-katex`, `markdown-it-prism` | nothing. KaTeX and Prism already render through the app's own code (API-21 shows both) | `content_rendering.md` never named the plugins |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive, finalization to `personal`; recommend a beta (the user's decision)
- Notes: FU-014 added to `follow-ups.md`.
