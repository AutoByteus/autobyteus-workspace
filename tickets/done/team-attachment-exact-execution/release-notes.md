# AutoByteus v1.4.88 — Startup recovery

- Fix startup failures after upgrading when incomplete historical Team runs coexist with valid data.
- Preserve unavailable history without preventing independent valid runs and new work from opening.
- Resume interrupted attachment-reference migration safely, retaining original history backups and exact attachment ownership.
- Strengthen current-package validation and regression coverage for production-data upgrades.

The first startup can take several minutes on large histories while migration and validation finish. Startup-performance optimization is deferred; this release fixes availability, not startup speed. Do not delete historical roots or reset migration records to bypass startup.

Self-hosted installations should stop all writers and take a consistent backup before upgrading; deploy matching web/server versions together. Never restore old originals over newer writes.
