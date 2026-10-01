#!/bin/bash
# REQ-120 / AC-120 identifier gate (content + path), per design-spec "REQ-120 Verification Gate".
set -u
cd "${1:-.}"
PAT='external-channel|externalChannel|ChannelBinding|channel-ingress|messaging-gateway|message-gateway|ExternalMessageEnvelope|EXTERNAL_USER_MESSAGE|externalSource'
EXCL=( ':!autobyteus-message-gateway' ':!tickets' ':!**/tickets/**' ':!test-results' ':!frontend-execution-evidence'
  ':!autobyteus-server-ts/prisma/migrations/20260208094000_add_external_channel_tables'
  ':!autobyteus-server-ts/prisma/migrations/20260209174500_add_channel_message_receipt_turn_id'
  ':!autobyteus-server-ts/prisma/migrations/20260309103000_add_channel_binding_launch_preset'
  ':!autobyteus-server-ts/prisma/migrations/20260310153000_add_channel_binding_team_definition_id'
  ':!autobyteus-server-ts/prisma/migrations/20260331102000_remove_channel_bindings_table'
  ':!autobyteus-server-ts/prisma/migrations/20260331130000_receipt_lifecycle_and_remove_channel_idempotency'
  ':!autobyteus-server-ts/src/app-data-migrations/migrations/remove-external-messaging-data-migration.ts'
  ':!autobyteus-server-ts/tests/unit/app-data-migrations/remove-external-messaging-data-migration.test.ts'
  ':!autobyteus-server-ts/prisma/migrations/20260924120000_remove_external_channel_tables' )
echo "== HEAD: $(git rev-parse --short HEAD)"
echo "== [1] Content gate (case-sensitive), hits outside allowed set 1-4 except the registry line:"
git grep -n -I -E "$PAT" -- . "${EXCL[@]}"
echo "== [2] Path gate (tracked file paths, case-insensitive), outside allowed set:"
git ls-files -- . "${EXCL[@]}" | grep -i -E "$PAT|messaging|telegram|discord"
echo "== [3] Supplementary residue (design): GatewaySignature|CHANNEL_CALLBACK|CHANNEL_GATEWAY|MESSAGE_GATEWAY|messageGateway|GATEWAY_[A-Z]|gateway-memory|allinone-start-gateway"
git grep -n -I -E 'GatewaySignature|CHANNEL_CALLBACK|CHANNEL_GATEWAY|MESSAGE_GATEWAY|messageGateway|GATEWAY_[A-Z]|gateway-memory|allinone-start-gateway' -- . "${EXCL[@]}" | grep -v -E 'MCP_GATEWAY_|mcp-gateway'
echo "== [4] Provider names (case-insensitive):"
git grep -n -I -i -E 'telegram|discord|whatsapp|wecom|wechat' -- . "${EXCL[@]}"
echo "== [5] Case-insensitive externalUserMessage:"
git grep -n -I -i -E 'externalUserMessage' -- . "${EXCL[@]}"
