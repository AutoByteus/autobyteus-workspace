# Docs Sync Report — chat-composer-menus-open-upward

## Scope

- Ticket: `chat-composer-menus-open-upward` (`task_size=Small`, `architectural_risk=Low`, route `Direct`)
- Trigger: API/E2E validation pass API-REV-001 (IR-001, SR-004) from `api_e2e_engineer`, 2026-09-30
- Bootstrap base reference: `origin/personal@57df63f07`
- Integrated base reference used for docs sync: `origin/personal@57df63f07` (fetched 2026-09-30; unchanged, the ticket branch was already current)
- Post-integration verification reference: checkpoint `f6a99b9f9`; focused vitest 35/35 (`delivery-evidence/delivery-focused-vitest.log`)

## Why Docs Were Updated

- Summary: `autobyteus-web/docs/chat.md` still described the New chat column as `pb-[6vh]` (API/E2E OBS-3) and said nothing about where the composer menus open. It now states the `pt-[14vh] pb-10` padding and the always-upward menu rule.
- Why this should live in long-lived project docs: the `above` placement policy of `useAnchoredPopover`, its height rule and the containing-block measurement are reusable behavior that a future menu author needs, and they were only in ticket artifacts.

## Long-Lived Docs Reviewed

| Doc Path | Why It Was Reviewed | Result (`Updated`/`No change`/`Needs follow-up`) | Notes |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Owns the New chat surface, composer menus and test list | `Updated` | Commit `ce3852910` |
| `autobyteus-web/docs/settings.md`, `agent_execution_architecture.md` | Searched for placement and popover wording | `No change` | Their "downward arrow" text is about the scroll-recovery overlay, not these menus |
| Other `autobyteus-web/docs/*.md`, root `README.md` | Searched for `useAnchoredPopover`, `6vh`, `14vh`, menu placement | `No change` | No references |

## Docs Updated

| Doc Path | Type Of Update | What Changed | Why |
| --- | --- | --- | --- |
| `autobyteus-web/docs/chat.md` | Correction | "New chat placement" now says `pt-[14vh] pb-10` (was `pb-[6vh]`) and gives the net move | REQ-002 / AC-003 |
| `autobyteus-web/docs/chat.md` | New section | "New chat menu placement": always-up rule at ≥640px, position per menu, height formula and preferred heights, scrolling, runtime flyout, bottom sheet below 640px, default `auto` policy | REQ-001, REQ-003, REQ-004 |
| `autobyteus-web/docs/chat.md` | Test list | Added the new unit specs and the `test:e2e:chat-composer-menus-open-upward` probe with its prerequisites | Durable validation added by API/E2E |

## Durable Design / Runtime Knowledge Promoted

| Topic | What Future Readers Need To Understand | Source Ticket Artifact(s) | Target Long-Lived Doc |
| --- | --- | --- | --- |
| `above` placement policy | Opt-in through `{ placement: 'above' }`; never flips; no minimum height; measured on open from the containing block | `design-spec.md`, `implementation-handoff.md` | `autobyteus-web/docs/chat.md` |
| Model menu runtime rows do not scroll | The menu root cannot clip the side flyout, so in windows shorter than about 330px the rows can exceed the limit (API/E2E OBS-1) | `design-spec.md` Risks, `api-e2e-execution-coverage-report.md` | `autobyteus-web/docs/chat.md` |
| Default `auto` policy | The running-conversation `/` menu keeps below-first placement with a 220px floor | `design-spec.md` | `autobyteus-web/docs/chat.md` |

## Removed / Replaced Components Recorded

| Old Component / Path / Concept | What Replaced It | Where The New Truth Is Documented |
| --- | --- | --- |
| New chat column padding `pt-10 pb-[6vh]` | `pt-[14vh] pb-10` | `autobyteus-web/docs/chat.md` "New chat placement" |
| Model flyout `top` offset that shifted up on overflow | Bottom-aligned flyout that grows upward with a list height limit | `autobyteus-web/docs/chat.md` "New chat menu placement" |

## Delivery Continuation

- Result: `Pass`
- Next delivery action: user verification hold, then finalization into `personal`.
- Notes: none.
