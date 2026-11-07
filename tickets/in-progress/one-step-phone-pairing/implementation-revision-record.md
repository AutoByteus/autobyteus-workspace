# Implementation Revision Record — one-step-phone-pairing (autobyteus-395)

## Revision Index

| Revision ID | Triggering Role / Report / Round | Finding IDs | Classification | Related Revision IDs | Result |
| --- | --- | --- | --- | --- | --- |
| IR-001 | Architecture reviewer, ARCH-REV-003 `Pass`, round 3 | N/A | `Initial Baseline` | SR-014, ARCH-REV-003 | Implementation complete; to code review |
| IR-002 | Code reviewer, CRR-002 failure-origin review of API-REV-001 (API-17) | CR-001 | `Local Fix` | SR-014, ARCH-REV-003, CRR-002, API-REV-001 | Fixed; to targeted source review |

## Revision Entries

### IR-001 — Initial implementation of SR-014

- Triggering role, report path, and round: architecture reviewer, [design-review-report.md](design-review-report.md), round 3 (`Pass`)
- Triggering finding IDs: N/A
- Classification: `Initial Baseline`
- Prior authoritative result: N/A
- Current authoritative result: implementation complete; implementation-scoped checks pass (implementation-handoff.md, Checks Run)
- Related solution revision IDs: SR-014
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review / API-E2E / delivery revision IDs: N/A
- Why recorded: the baseline for code review
- Approved behavior or requirement IDs affected: BEH-001…007; REQ-001…023
- Implementation delta: server network facts, allowed networks, pairing way/session ID/discard/consumed retention, status without `serverName`; desktop Phones panel, store, way composer, Serve command; `/mobile` bridge client, pairing page, session name, node sheet; Android flow, bridge, screens, reachability, resolver; old cards, route, screen and dead code removed; glossary and server docs. Review notes 1–3 applied (listener before `loadUrl` with the entry's origin, main frame only; update screen only without `WEB_MESSAGE_LISTENER`; consumed sessions kept until expiry and covered by disable and DELETE).
- Changed files or areas: commits `d92d94472f`, `b2c7239d5e`, `55fdae0a34`
- Local validation and result: IMP-01…IMP-10 pass
- Next recipient or routing: code reviewer (Large/High route)
- Remaining limitations or risks: implementation-handoff.md, Known Risks and Not run

### IR-002 — Phones-list dates in the app's language (CR-001)

- Triggering role, report path, and round: code reviewer, [code-review-report.md](code-review-report.md), CRR-002 (failure-origin review of API-17, API-REV-001, [api-e2e-execution-coverage-report.md](api-e2e-execution-coverage-report.md))
- Triggering finding IDs: CR-001
- Classification: `Local Fix`
- Prior authoritative result: IR-001, code review `Pass` (CRR-001); API/E2E round 1 `Fail` on API-17
- Current authoritative result: fixed; checks pass (IMP-11)
- Related solution revision IDs: SR-014
- Related architecture-review revision IDs: ARCH-REV-003
- Related code-review revision IDs: CRR-001, CRR-002
- Related API/E2E revision IDs: API-REV-001
- Related delivery revision IDs: N/A
- Why recorded: a German computer default turned "Last seen 2 minutes ago" / "Revoked Oct 28" into "Last seen jetzt" / "Revoked 7. Nov." inside the English app.
- Approved behavior or requirement IDs affected: REQ-014, AC-012 (UI/UX spec texts)
- Implementation delta: `Intl.RelativeTimeFormat` and `toLocaleDateString` take the app's `resolvedLocale` (`useLocalization()`) instead of the computer default; new `ConnectedPhones.spec.ts` (German computer default stubbed; English and zh-CN rows).
- Changed files or areas: `autobyteus-web/components/settings/phone/ConnectedPhones.vue`, `autobyteus-web/components/settings/phone/__tests__/ConnectedPhones.spec.ts` (commit `c113dae1a7`)
- Local validation and result: the new spec fails on the pre-fix file (`Last seen vor 2 Minuten`) and passes with the fix; Phones panel specs 9/9; web typecheck at baseline; literal audit passes (IMP-11).
- Next recipient or routing: code reviewer (targeted source review), then API/E2E reruns API-17
- Remaining limitations or risks: the same OS-locale formatting elsewhere is FU-006, outside this fix.

