# Docs Sync Report

## Scope

- Ticket: `markdown-code-block-wrap` (Project Task `autobyteus-23`)
- Trigger: API/E2E validation `Pass` (API-REV-001), direct low-risk route (`task_size` `Small`, `architectural_risk` `Low`)
- Bootstrap base reference: `origin/personal` @ `188369c71452b27f4a793afecf9f72902e180629`
- Integrated base reference used for docs sync: `origin/personal` @ `188369c71` (fetched at delivery start; unchanged, so the ticket branch was already current)
- Post-integration verification reference: no new base commits; the API/E2E run on the ticket branch (product `417e06da9`, tests `27245624a`) is the state being delivered

## Why Docs Were Updated

- Summary: the ticket added a keyword, `REPLY_FILE:<absolute path>`, to the scripted AGY CLI fixture that `TESTING.md` describes under "Runtimes without a model". The rendering behavior itself was already documented by the implementation in `autobyteus-web/docs/content_rendering.md`; delivery checked that section against the final code.
- Why this should live in long-lived project docs: the fixture is the project's standard way to drive real runs without a model; a test that needs an agent answer in raw Markdown should find the keyword there instead of reading the fixture's source.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/content_rendering.md` | Owns the Markdown renderer's documented behavior | No change (updated by implementation in `417e06da9`) | New section "Code Blocks, Tables And Display Math" matches the final `MarkdownRenderer.vue` rules (`pre`/`pre > code` `pre-wrap` + `overflow-wrap: anywhere`; `.markdown-table-scroll`; `.katex-display` scroll, vertical clip, `0.5em` padding) and `utils/markdownItScrollableTables.ts` |
| `TESTING.md` | Describes the scripted AGY fixture and the phone-shell probe rule | Updated | `REPLY_FILE:` added to "Runtimes without a model". The rule "renderer behavior the phone also offers is proven on the phone bundle" was followed (MSP-52) and needs no change |
| `DESIGN.md` | Project design principles | No change | The change keeps the fix at the single shared renderer, as its principles ask; no new convention or component ownership |
| `RELEASE.md` | Finalization and release steps | No change | Followed as written. One local observation, not a guide error: on this Linux machine `gitleaks` is in `~/.local/bin`, which a non-login shell may not have on `PATH`; with it on `PATH` the gate ran |
| `autobyteus-web/tests/e2e/mobile-shell-probe.mjs` header | The probe's own case list | No change | API/E2E already listed MSP-50…52 and their run time |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `TESTING.md` | Component description | "Runtimes without a model": `REPLY_FILE:<absolute path>` makes the scripted agent answer with that file's text as it is | The ticket added the keyword (`27245624a`) |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| Wrapping and scroll boxes in rendered Markdown | All fenced code wraps (soft wrap, copy gives the source); tables and display math scroll in their own box; the rules live only in `MarkdownRenderer.vue` | `design-spec.md`, `implementation-handoff.md` | `autobyteus-web/docs/content_rendering.md` (by implementation) |
| Scripted Markdown answers | `REPLY_FILE:` in the AGY fixture | `api-e2e-execution-coverage-report.md` | `TESTING.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| Language-only wrap rule (`code[class*="language-"]` `white-space: pre-wrap; word-wrap: break-word`) | One rule for every fenced block (`pre`, `pre > code`) | `autobyteus-web/docs/content_rendering.md` |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: handoff summary, archive the ticket, repository finalization (no release).
- Notes: FU-002 (inline code in a narrow Files viewer) stays a follow-up; the long-lived docs make no claim about inline-code wrapping that this ticket would contradict.
