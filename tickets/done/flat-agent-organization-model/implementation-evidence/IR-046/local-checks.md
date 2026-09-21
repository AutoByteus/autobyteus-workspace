# IR-046 local implementation validation

## Scope and authority
RER-032 / AD-REV-023 / ARCH-REV-020; DS-035–037 and VAL-054–058. This completes the approved browser operation-boundary reconciliation together with IR-045's CRR-068/CR-FIND-035 shared-input correction. One cumulative source-review handoff follows; no composer-only handoff was sent.

Current code and canonical implementation-handoff.md are authoritative. The 30-path source inventory contains 16 retained production files, one removed zero-caller facade, and 13 test files. Changes since IR-044 additionally include the already committed IR-045 input test. No server/provider/API/schema/migration/runtime/FIFO/fence implementation changed.

## Final checks
- Final concrete 79-path affected frontend cohort: **79 files / 685 tests Pass**, see cohort-final.log. All paths checked to exist before invoking Vitest; no directory selector or unintended broad run.
- Final exact context/stream/composer boundary cohort: 3 files / 45 tests passed (final-boundaries.log).
- Exact owner-cleanup regression: 3 files / 33 tests passed (real composer/public inspection, cold history action, accepted-ACK history).
- Shared-surface scope narrowing: 3 files / 39 tests passed before final public-entry cleanup; overlapping, not additive.
- Final web and localization guards **Pass**, literal audit **0 unresolved**: guards-final.log.
- Final production Nuxt build/prerender **Pass, 16 routes**: build-final.log. Temporary diagnostic route removed before this build.
- Full vue-tsc check could not run: repository has no vue-tsc executable (typecheck-unavailable.log). Do not interpret the successful build as a complete typecheck.
- Required initially absent application SDK contracts/frontend/backend dist prerequisites were built for checks, then only those temporary outputs removed. Existing collaboration contracts/build prerequisites were preserved.

## Durable scenario coverage
- Actual textarea -> real active/Org stores -> strict inspection/hydration -> prepared stream command/ACK/echo for configured direct and mounted Agents, plus unchanged live task send control.
- Initial inactive inspection never restores or opens a socket; coherent active inspection attaches. Stale history/mode does not determine activity. Read-only inspection never calls workspace creation, including an active inspection result.
- Immediate one local submission before held restore; latest actual textarea edit retained through held stream readiness and exact AgentContext adoption; one prepared command and one canonical user echo, with submitted attachments separate from newer draft files.
- Exact same-address task is read-only, not continuable configured identity. Continuation/Stop conflict rejects before consuming another member's draft. Focus/root departure does not retarget Send or navigate back; view disposal waits for the explicit operation.
- Rejected restore/ACK preserves untouched restoration and deliberate typed-then-cleared discard. Restore-success/readiness-exhaustion stays unknown/read-only with no send, fake rollback or replay.
- Confirmed Stop retires current/recovery generations, retains selected conversation/identity Offline, refreshes strict final projections. Failed Stop stays active. Failed final inspection keeps last-known conversation/error. Background Stop and late completion preserve current route/selection.
- Root inactive event preserves retained task read-only and rejects retired-generation frames. One invalid projection publishes neither partial contexts nor staged activities. Confirmed history activity invalidates older in-flight rows; a later failed read cannot resurrect stale active state or change title.
- Existing cold narrow Org task navigation, settled standalone Team exact inspection, activity/tasks, strict recovery, localized hierarchy/configuration and Team submission cohorts retained.

## Development runs, corrections and limitations
Intermediate logs are preserved, not presented as current failures or downstream evidence. First contract-migration checks had four failures/30 passing due to old inspection/disposal expectations. Initial broad run was during development (76 files passed, three failed; five failed tests/673 passing), not a final artifact run. Focused history initially had an obsolete unknown-target navigation assertion. New-case fixtures initially omitted WebSocket OPEN/CONNECTING, used a malformed minimal history row, and supplied an incomplete target to a real surface: three failures/78 passing and two unhandled fixture errors. Fixed the doubles/strict fixture and mount setup, without weakening production parsing or changing default timeouts. Corrected three-file/73-test run and subsequent cohorts passed. After removal of the obsolete public connect facade, the first 79-path run exposed two remaining tests using the old connect API (77 files/683 tests passed; two failed). Reconciled these to public inspection/coalescence and cleared the selection spy after validated publication, preserving the task-event no-refocus assertion. Root pending access now disables conflicting Send controls as well as rejecting before draft consumption. An attempted detached cohort command produced an empty log/no execution; reissued and awaited explicitly. No test pass is inferred from that empty attempt.

## Rendered feedback
Actual shared Agent/Team surfaces, actual textarea, real Pinia operation owner/strict hydration/stream logic in an isolated normal Nuxt/native Chromium renderer. Strict synthetic external I/O only; diagnostic layout and controls are not a production workspace route or a deployed backend.

10 final states at 1440x900 and 390x844: inactive direct/mounted inspection; held continuation; held stream readiness with fresh typing; same-context successful continuation; narrow/desktop retained Stop; narrow/desktop stopped task read-only; rejected restore with restored untouched draft/error. Assertions inspected current and visible draft/attachments, pending/access, identity, conversations and command count. Final result: one prepared SEND, one successful Restore, one Stop, one intentionally rejected Restore, no unexpected page errors or horizontal overflow. Initial browse had no mutations or sockets. Task example is stopped/inactive (its saved task remains in progress); it is not presented as a settled-task browser sample.

Screenshots were directly inspected for layout, focus, visible typing, Offline status, disabled Send during readiness, empty read-only task state, and familiar error/composer presentation. Existing design/spacing/typography and Product surfaces preserved. Local editability during configured Org synchronization does not confer command access; commands stay disabled for unknown/read-only authority. Standalone Team read-only behavior is unchanged.

This is implementation-scoped rendering, not full API/E2E, real restart/provider, native Electron/package or user verification. API/E2E must validate no activation using actual requests/runtime effects, full direct/mounted continuation, selected/background Stop, current exact task/locale/narrow/restore/persistence matrix. Delivery must rebuild a current package and resume user verification; running DR-009 app untouched.

## Ownership/preservation
13905 starting other-owner hashes: 13902 unchanged; three Architecture-owned design files independently updated and committed for AD-023 (preservation.json). No other baseline path modified, reset, staged or claimed. Reviewer/API/Delivery reports, raw DB/env/key evidence and earlier DR-007/CRR-059/API-27 limits preserved. Only safe implementation logs, synthetic renderer sources/screenshots and inventories are included here.

Committed log copies normalize trailing whitespace only for repository diff checks; original command logs remain under /tmp/aorg-ir046*. No diagnostic content or failed result was removed.
