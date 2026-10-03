# Release Notes — Runtime Error Message Reporting

Repository change notes; no version/tag/release publication or deployment requested.

- AGY failed turns now show the supplied ordinary error text, including unfamiliar causes and provider hints, instead of blanket generic wording.
- Claude SDK terminal errors preserve nonempty errors-list messages after existing scalar precedence.
- Existing credential redaction, plain-text card, private diagnostic/response boundary, failed-turn lifecycle, partial work and exact conversation identity remain.
- Missing/unusable error content still has a truthful fallback. No automatic retries, quota classification/countdown, conversation reset or migration.
- Durable public-transport and Agent/Team browser coverage protects the behavior and explicit next-turn continuation.

Known limits: external quota/reset/recovery remains provider-controlled; this does not fix provider capacity. Real-Claude opt-in skipped. Standard server typecheck has inherited rootDir/include TS6059 failures; strict production build passes independently. No installed-app, full launch, packaged shell, other-platform or deployment certification.
