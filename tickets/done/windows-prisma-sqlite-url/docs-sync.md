# Docs Sync

Status: Pass

## Updates

- Added `docs/windows-prisma-sqlite-url-repair.md` with symptom, repair commands, parameters, backups, and policy.
- Added `scripts/repair-windows-prisma-sqlite-url.ps1` as the single project-level repair script for affected installed Windows artifacts.

## No-Impact Areas

- No macOS or Linux user repair instructions are needed because the bug is specific to Windows drive-letter SQLite URL generation.
- No product runtime compatibility documentation was added because product code intentionally does not keep a malformed URL fallback.
