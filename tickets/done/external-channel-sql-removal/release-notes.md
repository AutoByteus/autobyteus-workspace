# Release Notes

## Improvements
- Improved external-channel reliability by keeping bindings, receipts, delivery events, and callback state under one consistent file-backed runtime store.
- Improved normal server logging by disabling Prisma SQL query output unless it is explicitly enabled for troubleshooting.

## Fixes
- Fixed external-channel ingress handling so bound agent and team routes persist the correct run artifacts without relying on removed SQL receipt tables.
- Fixed external-channel callback state handling so delivery-event persistence stays aligned with the file-backed runtime path across restarts.
