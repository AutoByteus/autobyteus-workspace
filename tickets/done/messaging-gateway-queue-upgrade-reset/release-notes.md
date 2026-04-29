## Improvements
- Improved managed messaging gateway upgrade recovery by automatically quarantining incompatible inbox/outbox reliability queue files and creating fresh queues so new messages can continue.
- Preserved gateway configuration, channel bindings, provider secrets, personal session state, and queue owner locks during queue-file recovery.

## Fixes
- Fixed an upgrade path where stale gateway queue data containing legacy inbound statuses such as `COMPLETED_ROUTED` could stop Telegram and other messaging deliveries until runtime queue files were manually deleted.
