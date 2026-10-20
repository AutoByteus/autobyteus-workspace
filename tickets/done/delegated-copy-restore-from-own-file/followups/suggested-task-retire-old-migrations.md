# Suggested Task: declare a minimum upgrade-from version and retire older migrations

- Raised by: Solution Designer, during autobyteus-197 (delegated-copy-restore-from-own-file), 2026-10-19
- The user's direction (2026-10-19): "We should also start to retire some migrations. It's important … some of those migration code … are hurting our code base, making a lot of work more and more difficult."
- Kind: maintenance and cleanup, a new Task. **Not a prerequisite** of autobyteus-197 or autobyteus-191; it is independent.

## Problem

- Every app-data migration ever shipped is still registered and kept in source, together with its migration-owned frozen copies of old data shapes:
  - about 19,900 lines under `autobyteus-server-ts/src/app-data-migrations/migrations` and `.../legacy`;
  - these shapes are read only by migrations.
- The Data Migration Guideline already allows retirement (`autobyteus-server-ts/docs/design/data_migration_guideline.md` §4, "Supported upgrade range"): "every released source shape stays supported until a release explicitly declares a minimum upgrade-from version. Only then may migrations for older shapes be retired." No release has ever declared one, so nothing has been retired.
- Cost evidence from autobyteus-197:
  - DI-001: four released migrations from 2026-07-31 to 2026-09-26 read pre-own-run trees through current indexes. A bridge was needed to keep them compiling.
  - DI-002: the retry logic of the released 10-17 migration conflicted with the new migration. It needed a same-ID repair.

  Every change to run storage has to work around the full history of migrations.

## How the industry handles it (context)

A migration is temporary code: shipped with the format change, kept for a support window (N releases or months), then removed once a minimum upgrade-from version ("upgrade stop") is declared. Users older than the minimum first install that stop version. Examples:
- GitLab required upgrade stops;
- Rails and Django projects deleting or squashing old migrations, with new installs starting from the current schema;
- mobile apps with minimum supported versions.

## Suggested Task text

> **Declare a minimum upgrade-from version and retire older app-data migrations.**
> 1. Choose the minimum upgrade-from version: a stable release that already contains every migration to be kept. Use evidence such as the auto-update channels and the release history; the user decides the version.
> 2. Record the policy in RELEASE.md (how the minimum is chosen and when it moves) and in the release notes of the release that declares it. Users older than the minimum install that version first.
> 3. At startup, data older than the minimum is not converted. Those runs are not shown (preserved untouched, logged), the app starts normally, and it tells the user which version to install first. This follows DESIGN.md rule 7 and the guideline §1.
> 4. Remove every migration older than the minimum, their frozen shapes in `app-data-migrations/legacy/`, their tests and fixtures, and their registry entries. Keep the ledger records. Also remove bridges such as autobyteus-197's D-8 `asSourceIndependentIndexInput` if the migrations that need it are retired.
> 5. Update the Data Migration Guideline with the retention rule (for example, keep migrations for N releases or N months).
>
> Done when: the minimum is declared and documented; every migration and frozen shape older than it is removed with evidence (grep, typecheck, tests); a startup test shows an install older than the minimum starts normally with its old runs not shown and a clear message; and the user approves the chosen version.

## Ordering note

Independent of autobyteus-197 and autobyteus-191. Doing it after autobyteus-197 merges avoids touching the same migration files at the same time. Order and dispatch are the user's and the Project Task Manager's.
